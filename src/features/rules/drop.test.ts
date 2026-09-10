/* ============================================================
   NOTHING DRAGGED WAS EVER VERIFIED — CLUELESS_USER_TESTS O7.

   "Drag a chip from the palette onto the paper, drag a plate to
   move it, and drag from one plate's handle to another's" — all
   code-read, never run. `drop.ts` is the whole drag contract and
   carried no test at all.

   WHAT IS ASSERTED IS THE DECISIONS, not the wiring. A
   DataTransfer is four lines to fake; the interesting parts are
   geometric and every one of them is written down as an argument
   in `drop.ts`:

     · the plate lands CENTRED under the cursor, snapped to 16px
     · a plate never lands on top of another — the walk goes
       right, right, right, then down and back to the left
     · that walk is BOUNDED, because "a crowded rule gets a plate
       on top of another rather than a hang"
     · a foreign drag is refused WITHOUT calling preventDefault,
       so the browser still handles a file dropped by accident

   The last is the one a rendering test would miss and a person
   would feel.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DragEvent as ReactDragEvent } from 'react'
import type { EntityDef, RowData, RuleNodeKind } from '@/types/model'

const mockSaveAll = vi.fn(async (_snapshot: { rows: RowData[] }) => {})

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: { load: async () => null, saveAll: mockSaveAll, wipe: async () => {} },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const {
  RULE_DND_MIME,
  addRuleNodeAt,
  isPaletteDrag,
  nextNodePosition,
  onPaletteDrop,
  readPaletteKind,
  setPaletteDragData,
} = await import('./drop')

const ISO = '2026-01-01T00:00:00.000Z'
const store = () => useProjectStore.getState()

const boats = (): EntityDef => ({
  id: 'e-boats',
  name: 'Boats',
  accent: 'blue',
  fields: [{ id: 'f-model', name: 'Model', type: 'text' }],
  displayFieldId: 'f-model',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

/** A DataTransfer that behaves like the browser's for the four calls
 *  `drop.ts` makes of it, and nothing more. */
function fakeDrag(): { event: ReactDragEvent<Element>; prevented: () => number } {
  const data = new Map<string, string>()
  let prevented = 0
  const event = {
    dataTransfer: {
      setData: (type: string, value: string) => void data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
      get types() {
        return [...data.keys()]
      },
      effectAllowed: 'none',
    },
    preventDefault: () => {
      prevented += 1
    },
  } as unknown as ReactDragEvent<Element>
  return { event, prevented: () => prevented }
}

let ruleId = ''

beforeEach(() => {
  store().replaceProject({
    name: 'Test Sheet',
    entities: [boats()],
    groups: [],
    rules: [],
    rowsByEntity: { 'e-boats': [] },
  })
  ruleId = store().createRule('e-boats', 'Motor fitment').id
})

/* ---------------------------------------------------------- */

describe('what a drag carries', () => {
  it('round-trips the kind a chip was dragged from', () => {
    const { event } = fakeDrag()
    setPaletteDragData(event, 'match')
    expect(readPaletteKind(event)).toBe('match')
  })

  it('sets a text/plain fallback, because some browsers hide the payload on dragover', () => {
    const { event } = fakeDrag()
    setPaletteDragData(event, 'filter')
    expect(event.dataTransfer.getData('text/plain')).toBe('filter')
    expect(event.dataTransfer.effectAllowed).toBe('copy')
  })

  it('knows its own drag from a foreign one', () => {
    const ours = fakeDrag()
    setPaletteDragData(ours.event, 'start')
    expect(isPaletteDrag(ours.event)).toBe(true)

    const theirs = fakeDrag()
    theirs.event.dataTransfer.setData('text/plain', 'a spreadsheet')
    expect(isPaletteDrag(theirs.event)).toBe(false)
  })

  it('refuses a payload that is not a node kind rather than trusting the string', () => {
    const { event } = fakeDrag()
    event.dataTransfer.setData(RULE_DND_MIME, 'destroy-everything')
    expect(readPaletteKind(event)).toBeNull()
  })
})

describe('a foreign drop is left to the browser', () => {
  it('adds nothing and does NOT preventDefault', () => {
    /* Somebody who drags a file onto the canvas by accident should
       get the browser's own behaviour, not silence. */
    const { event, prevented } = fakeDrag()
    event.dataTransfer.setData('text/plain', 'not a node')
    const before = store().rules[ruleId].nodes.length

    expect(onPaletteDrop(event, ruleId, { x: 400, y: 300 })).toBeNull()
    expect(prevented()).toBe(0)
    expect(store().rules[ruleId].nodes).toHaveLength(before)
  })

  it('takes our own drop, and claims it', () => {
    const { event, prevented } = fakeDrag()
    setPaletteDragData(event, 'match')
    expect(onPaletteDrop(event, ruleId, { x: 400, y: 300 })).not.toBeNull()
    expect(prevented()).toBe(1)
  })
})

describe('where the plate lands', () => {
  it('is centred under the cursor and snapped to the 16px grid', () => {
    /* 280 wide, grabbed 22 down: x - 140, y - 22, both snapped. */
    const node = addRuleNodeAt(ruleId, 'match', { x: 400, y: 300 })
    expect(node).not.toBeNull()
    expect(node?.position).toEqual({ x: 256, y: 272 })
  })

  it('snaps a cursor that is nowhere near a grid line', () => {
    const node = addRuleNodeAt(ruleId, 'match', { x: 407, y: 305 })
    expect((node?.position.x ?? 1) % 16).toBe(0)
    expect((node?.position.y ?? 1) % 16).toBe(0)
  })

  it('never lands on top of the plate already there', () => {
    const first = addRuleNodeAt(ruleId, 'match', { x: 400, y: 300 })
    const second = addRuleNodeAt(ruleId, 'filter', { x: 400, y: 300 })
    expect(second?.position).not.toEqual(first?.position)
    /* right by one pitch, same row */
    expect(second?.position.x ?? 0).toBeGreaterThan(first?.position.x ?? 0)
    expect(second?.position.y).toBe(first?.position.y)
  })

  it('drops to the next row once a row has filled up', () => {
    const at = { x: 400, y: 300 }
    const kinds: RuleNodeKind[] = ['match', 'filter', 'find', 'action', 'output']
    const placed = kinds.map((k) => addRuleNodeAt(ruleId, k, at)?.position)
    const rows = new Set(placed.map((p) => p?.y))
    expect(rows.size).toBeGreaterThan(1)
  })

  it('gives up rather than hanging on a crowded rule', () => {
    /* The walk is bounded on purpose: "a crowded rule gets a plate
       on top of another rather than a hang." Twenty-five drops on one
       point must all return. */
    const at = { x: 400, y: 300 }
    for (let i = 0; i < 25; i += 1) {
      expect(addRuleNodeAt(ruleId, 'match', at)).not.toBeNull()
    }
    expect(store().rules[ruleId].nodes.length).toBeGreaterThanOrEqual(25)
  })
})

describe('where a clicked chip goes when there is no cursor', () => {
  it('falls back to 64,64 only when the rule truly has no plates', () => {
    /* A RULE FROM `createRule` IS NEVER EMPTY — it is seeded with a
       start plate at 60,60, which is why the fallback below is
       unreachable through the normal door and has to be reached by
       emptying the rule by hand. Asserted rather than assumed: the
       first draft of this test expected 64,64 straight after
       `createRule` and got 384 — one pitch right of the start plate,
       which is the code being right. */
    useProjectStore.setState((s) => ({
      rules: { ...s.rules, [ruleId]: { ...s.rules[ruleId], nodes: [] } },
    }))
    expect(nextNodePosition(ruleId)).toEqual({ x: 64, y: 64 })
  })

  it('goes one pitch right of the seeded start plate, and snaps BOTH axes', () => {
    /* The seeded start sits at 60,60, which is off the 16px grid.
       `nextNodePosition` snaps x AND y, so the answer is 384,64 and
       not 380,60 — it corrects the seed rather than inheriting its
       offset and carrying it along the whole row. */
    const start = store().rules[ruleId].nodes[0]
    expect(start.kind).toBe('start')
    expect(start.position).toEqual({ x: 60, y: 60 })
    expect(nextNodePosition(ruleId)).toEqual({ x: 384, y: 64 })
  })

  it('goes one pitch right of the last plate drafted', () => {
    const first = addRuleNodeAt(ruleId, 'match', { x: 400, y: 300 })
    const next = nextNodePosition(ruleId)
    expect(next.y).toBe(first?.position.y)
    expect(next.x).toBe((first?.position.x ?? 0) + 320)
  })
})
