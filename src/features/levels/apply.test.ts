/* ============================================================
   APPLYING A LEVEL, AGAINST THE REAL STORE.

   `levels.test.ts` proves the arithmetic. This proves the three
   claims `apply.ts` makes about the store, because each of them is
   a promise to somebody who is not in this file:

     · ONE ACT IS ONE UNDO STEP, and undoing it puts back EVERY row
       it touched. That is the promise rule 9 rests on — a toast
       with UNDO is a lie if UNDO gives back one cell out of six.
     · IT WRITES REAL CELLS, so anything that reads rows — a quote,
       a view page, a module tile, an export — is correct without
       being told. There is no propagation step to test, and that
       is the point.
     · A REFUSAL WRITES NOTHING AND SAYS NOTHING, because the
       reason is already on screen where the act was refused.

   Persistence is mocked for the same reason `undo.test.ts` mocks
   it: the subject is the store, not Dexie.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDef, FieldDef, RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async () => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { buildLevelModel, planReset, planSet } = await import('./levels')
const { applyLevelPlan } = await import('./apply')

/** one turn of the event loop — a history burst closes on the next
 *  microtask, and `offerUndo` reads the stack on the one after */
const turn = (): Promise<void> => Promise.resolve()

const ISO = '2026-01-01T00:00:00.000Z'

const boats = (): EntityDef => ({
  id: 'e-boats',
  name: 'Highfield Inflatables',
  accent: 'blue',
  kind: 'boat',
  hierarchy: ['f-series', 'f-model', 'f-variant'],
  fields: [
    { id: 'f-series', name: 'Series', type: 'text' },
    { id: 'f-model', name: 'Model', type: 'text' },
    { id: 'f-variant', name: 'Variant', type: 'text' },
    { id: 'f-shaft', name: 'Shaft Lgth', type: 'text' },
  ],
  displayFieldId: 'f-variant',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

const row = (id: string, series: string, model: string, shaft: string | null): RowData => ({
  id,
  entityId: 'e-boats',
  values: { 'f-series': series, 'f-model': model, 'f-variant': id, 'f-shaft': shaft },
  createdAt: ISO,
  updatedAt: ISO,
})

/* Ocean Master holds six boats: three blank, two already XL, one L. */
const seed = (): RowData[] => [
  row('a', 'Ocean Master', 'OM 540', null),
  row('b', 'Ocean Master', 'OM 540', null),
  row('c', 'Ocean Master', 'OM 660', null),
  row('d', 'Ocean Master', 'OM 660', 'XL'),
  row('e', 'Ocean Master', 'OM 760', 'XL'),
  row('f', 'Ocean Master', 'OM 760', 'L'),
  row('g', 'Sport', 'SP 460', 'S'),
]

const store = () => useProjectStore.getState()
const rows = (): RowData[] => store().rowsByEntity['e-boats'] ?? []
const shaftOf = (id: string): unknown => rows().find((r) => r.id === id)?.values['f-shaft']
const shaftField = (): FieldDef => boats().fields[3]

const modelNow = () => buildLevelModel(boats(), rows())
const oceanMaster = (): string => {
  const node = modelNow().root.children.find((c) => c.value === 'Ocean Master')
  if (!node) throw new Error('no Ocean Master level')
  return node.key
}

beforeEach(() => {
  useProjectStore.getState().replaceProject({
    name: 'Test',
    entities: [boats()],
    groups: [],
    rules: [],
    rowsByEntity: { 'e-boats': seed() },
  })
})

describe('setting a level writes real cells, and only the ones it counted', () => {
  it('fills the blanks and leaves the exception alone', () => {
    const plan = planSet({
      model: modelNow(),
      levelKey: oceanMaster(),
      field: shaftField(),
      value: 'XL',
    })
    expect(plan.writes).toEqual(['a', 'b', 'c'])
    expect(plan.differing).toEqual(['f'])

    const done = applyLevelPlan(plan, modelNow().noun)
    expect(done.written).toBe(3)
    expect(done.refusal).toBeNull()

    expect(shaftOf('a')).toBe('XL')
    expect(shaftOf('b')).toBe('XL')
    expect(shaftOf('c')).toBe('XL')
    /* the exception is untouched — the whole point of the default */
    expect(shaftOf('f')).toBe('L')
    /* and the boat in another Series never entered the act */
    expect(shaftOf('g')).toBe('S')
  })

  it('overwrites the exception only when Replace is on', () => {
    const plan = planSet({
      model: modelNow(),
      levelKey: oceanMaster(),
      field: shaftField(),
      value: 'XL',
      replace: true,
    })
    applyLevelPlan(plan, modelNow().noun)
    expect(shaftOf('f')).toBe('XL')
    expect(shaftOf('g')).toBe('S')
  })

  it('says the act in the dealer’s own words, past tense', () => {
    const plan = planSet({
      model: modelNow(),
      levelKey: oceanMaster(),
      field: shaftField(),
      value: 'XL',
    })
    const done = applyLevelPlan(plan, modelNow().noun)
    expect(done.said).toBe('Shaft Lgth set to “XL” on 3 variants in Ocean Master')
  })
})

describe('it is ONE undo step, and the step gives back every row', () => {
  it('records one entry for six writes, not six', async () => {
    const before = store().past.length
    const plan = planSet({
      model: modelNow(),
      levelKey: '',
      field: shaftField(),
      value: 'XL',
      replace: true,
    })
    expect(plan.writes).toHaveLength(5) /* a b c f g — d and e already hold XL */
    applyLevelPlan(plan, modelNow().noun)
    await turn()
    expect(store().past.length).toBe(before + 1)
    expect(store().past[store().past.length - 1].label).toBe(
      '5 cell edits · Highfield Inflatables',
    )
  })

  it('undo puts back all five, exactly as they were', async () => {
    const plan = planSet({
      model: modelNow(),
      levelKey: '',
      field: shaftField(),
      value: 'XL',
      replace: true,
    })
    applyLevelPlan(plan, modelNow().noun)
    await turn()
    expect(rows().map((r) => r.values['f-shaft'])).toEqual([
      'XL',
      'XL',
      'XL',
      'XL',
      'XL',
      'XL',
      'XL',
    ])

    store().undo()
    expect(rows().map((r) => r.values['f-shaft'])).toEqual([
      null,
      null,
      null,
      'XL',
      'XL',
      'L',
      'S',
    ])
  })

  it('two separate acts are two separate steps', async () => {
    const before = store().past.length
    applyLevelPlan(
      planSet({ model: modelNow(), levelKey: oceanMaster(), field: shaftField(), value: 'XL' }),
      modelNow().noun,
    )
    await turn()
    applyLevelPlan(
      planSet({
        model: modelNow(),
        levelKey: oceanMaster(),
        field: shaftField(),
        value: 'L',
        replace: true,
      }),
      modelNow().noun,
    )
    await turn()
    expect(store().past.length).toBe(before + 2)
  })
})

describe('the note carries UNDO, and UNDO undoes the whole act', () => {
  it('offers one act on the note, and pressing it restores every row', async () => {
    const said: Array<{ text: string; act?: { label: string; onPick: () => void } }> = []
    const push = (
      text: string,
      _tone?: unknown,
      act?: { label: string; onPick: () => void },
    ): void => {
      said.push({ text, act })
    }

    const plan = planSet({
      model: modelNow(),
      levelKey: oceanMaster(),
      field: shaftField(),
      value: 'XL',
    })
    applyLevelPlan(plan, modelNow().noun, push)

    /* one microtask closes the history burst, the next lets
       `offerUndo` read the step it is about */
    await turn()
    await turn()

    expect(said).toHaveLength(1)
    expect(said[0].text).toBe('Shaft Lgth set to “XL” on 3 variants in Ocean Master')
    expect(said[0].act?.label).toBe('Undo')

    said[0].act?.onPick()
    expect(shaftOf('a')).toBeNull()
    expect(shaftOf('b')).toBeNull()
    expect(shaftOf('c')).toBeNull()
    /* and it says what it undid, through the same strip */
    expect(said[said.length - 1].text).toContain('Undone')
  })

  it('refuses to undo the wrong act when something else has happened since', async () => {
    const said: Array<{ text: string; act?: { label: string; onPick: () => void } }> = []
    const push = (
      text: string,
      _tone?: unknown,
      act?: { label: string; onPick: () => void },
    ): void => {
      said.push({ text, act })
    }

    applyLevelPlan(
      planSet({ model: modelNow(), levelKey: oceanMaster(), field: shaftField(), value: 'XL' }),
      modelNow().noun,
      push,
    )
    await turn()
    await turn()

    /* somebody types a cell after reading the note */
    store().updateCell('e-boats', 'g', 'f-shaft', 'M')
    await turn()

    said[0].act?.onPick()
    expect(said[said.length - 1].text).toContain('Something else has happened since')
    /* and the level's own rows are still set — nothing was reverted */
    expect(shaftOf('a')).toBe('XL')
  })
})

describe('a refusal writes nothing and says nothing', () => {
  it('does not touch a row when the plan carries a refusal', () => {
    const plan = planSet({
      model: modelNow(),
      levelKey: oceanMaster(),
      field: shaftField(),
      value: '   ',
    })
    expect(plan.refusal).not.toBeNull()
    const said: string[] = []
    const done = applyLevelPlan(plan, modelNow().noun, (t) => said.push(t))
    expect(done.written).toBe(0)
    expect(done.refusal).toBe(plan.refusal)
    expect(said).toHaveLength(0)
    expect(shaftOf('a')).toBeNull()
  })
})

describe('reset to inherit, end to end', () => {
  it('puts the exception back onto the level and fills the blanks', () => {
    /* Ocean Master: 2 hold XL, 1 holds L, 3 blank. XL is the answer. */
    const plan = planReset(modelNow(), oceanMaster(), shaftField())
    expect(plan.text).toBe('XL')
    applyLevelPlan(plan, modelNow().noun)
    expect(rows().filter((r) => r.values['f-series'] === 'Ocean Master').map((r) => r.values['f-shaft'])).toEqual([
      'XL',
      'XL',
      'XL',
      'XL',
      'XL',
      'XL',
    ])
  })

  it('resets one boat on its own without touching its neighbours', () => {
    const plan = planReset(modelNow(), oceanMaster(), shaftField(), ['f'])
    applyLevelPlan(plan, modelNow().noun)
    expect(shaftOf('f')).toBe('XL')
    expect(shaftOf('a')).toBeNull()
  })
})

describe('the value is on the rows, which is how it reaches a quote', () => {
  it('any reader of the rows sees it, with no propagation step', () => {
    applyLevelPlan(
      planSet({
        model: modelNow(),
        levelKey: oceanMaster(),
        field: shaftField(),
        value: 'XL',
        replace: true,
      }),
      modelNow().noun,
    )
    /* this is what a quote line, a view page and a CSV export all
       do: read the row out of the store by id */
    const sold = store().rowsByEntity['e-boats']?.find((r) => r.id === 'f')
    expect(sold?.values['f-shaft']).toBe('XL')
    /* and the level now agrees with itself — nothing overrides */
    const after = buildLevelModel(boats(), rows())
    const node = after.root.children.find((c) => c.value === 'Ocean Master')
    expect(node).toBeDefined()
  })
})
