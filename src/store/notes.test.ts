/* ============================================================
   THE NOTE THAT OFFERS TO TAKE SOMETHING BACK.

   Four `window.confirm` calls became notes with UNDO on them, and
   this file exists because of the one way that trade can go wrong: a
   button labelled UNDO that undoes the WRONG THING. The note stands
   for nine seconds. A person can do something else inside nine
   seconds. A naive UNDO button calls the global `undo()` and reverts
   whatever happened last, which is a silent, data-losing surprise
   dressed as a safety net — strictly worse than the native dialog it
   replaced.

   So the note pins its step by reference and refuses when that step
   is no longer the next one back. Every assertion below is about that
   refusal, or about the pin being right in the first place.

   Pure store logic, no DOM: `notes.ts` takes its toast types with
   `import type`, so nothing React is loaded here.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'
import type { Note } from './notes'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: unknown) => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('./useProjectStore')
const { say, sayUndoable, offerUndo, onSaid } = await import('./notes')

/** the history burst closes on one microtask and `sayUndoable` reads it
 *  on the next, so two turns is what it takes for a note to arrive */
const settle = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const ISO = '2026-01-01T00:00:00.000Z'

const boats = (): EntityDef => ({
  id: 'e-boats',
  name: 'Boats',
  accent: 'blue',
  fields: [
    { id: 'f-model', name: 'Model', type: 'text' },
    { id: 'f-price', name: 'Price', type: 'number' },
  ],
  displayFieldId: 'f-model',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

const row = (id: string, model: string, price: number): RowData => ({
  id,
  entityId: 'e-boats',
  values: { 'f-model': model, 'f-price': price },
  createdAt: ISO,
  updatedAt: ISO,
})

const store = () => useProjectStore.getState()

/** everything said while the returned collector is subscribed */
function listen(): { notes: Note[]; stop: () => void } {
  const notes: Note[] = []
  const stop = onSaid((n) => notes.push(n))
  return { notes, stop }
}

beforeEach(() => {
  store().replaceProject({
    name: 'Test Sheet',
    entities: [boats()],
    groups: [],
    rules: [],
    rowsByEntity: { 'e-boats': [row('r1', 'Surtees 540', 52000)] },
  })
})

describe('say — the bus', () => {
  it('reaches every listener, and stops reaching one that has gone', () => {
    const a = listen()
    const b = listen()
    say({ text: 'Saved' })
    a.stop()
    say({ text: 'Saved again' })
    b.stop()

    expect(a.notes.map((n) => n.text)).toEqual(['Saved'])
    expect(b.notes.map((n) => n.text)).toEqual(['Saved', 'Saved again'])
  })

  it('drops a note with nobody listening rather than queueing it', () => {
    say({ text: 'Nobody heard this' })
    const late = listen()
    say({ text: 'This one' })
    late.stop()
    expect(late.notes.map((n) => n.text)).toEqual(['This one'])
  })
})

describe('sayUndoable', () => {
  it('waits for the burst to close, then offers the step that was just taken', async () => {
    const heard = listen()
    store().deleteRow('e-boats', 'r1')
    sayUndoable('Deleted one row')
    await settle()
    heard.stop()

    expect(heard.notes).toHaveLength(1)
    expect(heard.notes[0].text).toBe('Deleted one row')
    expect(heard.notes[0].act?.label).toBe('Undo')
  })

  it('takes the act back when the button is pressed, and says what it undid', async () => {
    const heard = listen()
    store().deleteRow('e-boats', 'r1')
    sayUndoable('Deleted one row')
    await settle()
    expect(store().rowsByEntity['e-boats']).toHaveLength(0)

    heard.notes[0].act?.onPick()
    heard.stop()

    expect(store().rowsByEntity['e-boats']).toHaveLength(1)
    expect(heard.notes.map((n) => n.text)).toContain('Undone — Row deleted · Boats')
  })

  it('REFUSES, AND SAYS WHY, when something else has happened since', async () => {
    const heard = listen()
    store().deleteRow('e-boats', 'r1')
    sayUndoable('Deleted one row')
    await settle()

    /* the nine seconds the note stands for is long enough to do this */
    store().addRow('e-boats', { 'f-model': 'Stacer 429' })
    await settle()
    expect(store().rowsByEntity['e-boats']).toHaveLength(1)

    heard.notes[0].act?.onPick()
    heard.stop()

    /* the new row is still there: the button did NOT revert the add
       that happened to be on top of the stack. And the deleted row is
       still deleted — a refusal changes nothing at all. */
    expect(store().rowsByEntity['e-boats']).toHaveLength(1)
    expect(store().rowsByEntity['e-boats'][0].id).not.toBe('r1')
    const last = heard.notes[heard.notes.length - 1]
    expect(last.tone).toBe('warn')
    expect(last.text).toContain('Ctrl+Z steps back one at a time')
  })

  it('says the sentence without a button when the act recorded no step', async () => {
    const heard = listen()
    /* moving a table is deliberately not a step — see the store header */
    store().moveEntity('e-boats', { x: 900, y: 400 })
    sayUndoable('Moved a table')
    await settle()
    heard.stop()

    expect(heard.notes).toHaveLength(1)
    expect(heard.notes[0].act).toBeUndefined()
  })
})

/* ============================================================
   THE SAME PIN, LENT TO A SURFACE THAT OWNS ITS OWN STRIP.

   A register does not speak through the bus: `TableSheet` and
   `EntityTableNode` each hold a `useToasts()` list positioned inside
   the sheet the note is about. That is why `Ctrl+D` said "2 cells
   filled" and offered nothing while a deleted rule offered UNDO —
   only the bus could build the pinned act. `offerUndo` takes the push
   as an argument so the register can obey rule 9 too, and everything
   the act goes on to say must come back through THAT push: a note
   answered in a strip on the other side of the window reads as two
   unrelated events.
   ============================================================ */
describe('offerUndo — a strip that is not the bus', () => {
  /** a stand-in for `useToasts().push` */
  const strip = (): { seen: Array<{ text: string; tone?: string; act?: { label: string; onPick: () => void } }>; push: Parameters<typeof offerUndo>[0] } => {
    const seen: Array<{ text: string; tone?: string; act?: { label: string; onPick: () => void } }> = []
    return { seen, push: (text, tone, act) => seen.push({ text, tone, act }) }
  }

  it('pushes the note through the strip it was handed, with UNDO on it', async () => {
    const s = strip()
    const bus = listen()
    store().deleteRow('e-boats', 'r1')
    offerUndo(s.push, '1 row deleted', 'warn')
    await settle()
    bus.stop()

    expect(s.seen).toHaveLength(1)
    expect(s.seen[0].text).toBe('1 row deleted')
    expect(s.seen[0].tone).toBe('warn')
    expect(s.seen[0].act?.label).toBe('Undo')
    /* and NOT through the bus — one note, in one place */
    expect(bus.notes).toHaveLength(0)
  })

  it('takes the act back and reports it in the same strip', async () => {
    const s = strip()
    store().deleteRow('e-boats', 'r1')
    offerUndo(s.push, '1 row deleted', 'warn')
    await settle()
    expect(store().rowsByEntity['e-boats']).toHaveLength(0)

    s.seen[0].act?.onPick()

    expect(store().rowsByEntity['e-boats']).toHaveLength(1)
    expect(s.seen.map((n) => n.text)).toEqual(['1 row deleted', 'Undone — Row deleted · Boats'])
  })

  it('REFUSES in the same strip when something else has happened since', async () => {
    const s = strip()
    store().deleteRow('e-boats', 'r1')
    offerUndo(s.push, '1 row deleted', 'warn')
    await settle()

    store().addRow('e-boats', { 'f-model': 'Stacer 429' })
    await settle()

    s.seen[0].act?.onPick()

    /* the add is still there and the delete is still done: a refusal
       changes nothing at all, and it says so where it was refused */
    expect(store().rowsByEntity['e-boats']).toHaveLength(1)
    expect(store().rowsByEntity['e-boats'][0].id).not.toBe('r1')
    const last = s.seen[s.seen.length - 1]
    expect(last.tone).toBe('warn')
    expect(last.text).toContain('Ctrl+Z steps back one at a time')
  })

  it('offers no button for an act that recorded no step', async () => {
    const s = strip()
    store().moveEntity('e-boats', { x: 900, y: 400 })
    offerUndo(s.push, 'Moved a table')
    await settle()

    expect(s.seen).toHaveLength(1)
    expect(s.seen[0].act).toBeUndefined()
  })
})
