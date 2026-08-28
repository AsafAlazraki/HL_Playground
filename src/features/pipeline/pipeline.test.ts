/* ============================================================
   THE BOARD'S ARITHMETIC.

   Every function under test is pure and takes its inputs as
   arguments, so none of this needs a browser, a store or a clock.
   What is checked is the handful of rules the board would be
   quietly wrong about: that a stage is derived rather than
   invented, that moving something back CLEARS rather than stores,
   that a search narrows, and that a nameless customer sorts last.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef } from '@/types/model'
import type { QuoteDef } from '@/features/quote'
import { arrivedAt, boardOf, derivedStage, stageOf } from './stages'
import { DEFAULT_STAGES, forgetStageStore, stagesOf } from './stageStore'
import { kindOfQuote, matches, sortDeals, typeChips } from './finding'

const STAMP = '2026-08-01T00:00:00.000Z'

/** the few fields the board actually reads. Cast once, here, rather
 *  than building a whole document in every test. */
const quote = (q: Partial<QuoteDef> & { id: string }): QuoteDef =>
  ({
    reference: q.id,
    state: 'draft',
    viewId: 'v',
    rootTableId: 'boats',
    rootRowId: 'r',
    subjectLabel: 'A boat',
    subjectSpecs: [],
    customer: { name: '' },
    lines: [],
    adjustments: [],
    sections: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...q,
  }) as unknown as QuoteDef

const table = (id: string, kind: EntityDef['kind']): EntityDef => ({
  id,
  name: id,
  accent: 'blue',
  kind,
  fields: [],
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
})

const ENTITIES: Record<string, EntityDef> = {
  boats: table('boats', 'boat'),
  motors: table('motors', 'motor'),
}

/* ---------------------------------------------------------- */

describe('where a deal is', () => {
  it('derives a stage from the document when nobody has moved it', () => {
    expect(derivedStage(quote({ id: 'a' }))).toBe('draft')
    expect(derivedStage(quote({ id: 'b', state: 'issued' }))).toBe('issued')
  })

  /* THE POINT OF DERIVING RATHER THAN MIGRATING: every quote that
     existed before the board did lands somewhere sensible, and the
     store stays empty until somebody makes a decision. */
  it('puts every quote in a column with an empty store', () => {
    const qs = [quote({ id: 'a' }), quote({ id: 'b', state: 'issued' })]
    const cols = boardOf(qs, {}, DEFAULT_STAGES)
    expect(cols['draft'].map((q) => q.id)).toEqual(['a'])
    expect(cols['issued'].map((q) => q.id)).toEqual(['b'])
    expect(cols['won']).toEqual([])
  })

  it('lets a stored decision beat the derived one', () => {
    const q = quote({ id: 'a', state: 'issued' })
    expect(stageOf(q, { a: 'won' })).toBe('won')
  })

  /* A DEAL WHOSE STAGE HAS BEEN DELETED lands in the first column
     rather than vanishing. The editor moves a removed stage's deals
     to its neighbour, so this should never fire — but the stage
     LIST and the per-deal overrides are two stores and either can be
     edited without the other. */
  it('lands a deal whose stage no longer exists in the first column', () => {
    const q = quote({ id: 'a' })
    expect(stageOf(q, { a: 'gone-stage' }, DEFAULT_STAGES)).toBe(DEFAULT_STAGES[0].id)
    /* and with no list to check against, it is taken at its word */
    expect(stageOf(q, { a: 'gone-stage' })).toBe('gone-stage')
  })

  it('draws every stage, including the empty ones', () => {
    const cols = boardOf([], {}, DEFAULT_STAGES)
    expect(Object.keys(cols).sort()).toEqual(DEFAULT_STAGES.map((s) => s.id).sort())
  })
})

/* ---------------------------------------------------------- */

describe('finding a deal', () => {
  const set = [
    quote({ id: 'q1', reference: 'Q-100', customer: { name: 'Ellis' }, subjectLabel: 'Highfield SP560' }),
    quote({ id: 'q2', reference: 'Q-101', customer: { name: 'Nguyen' }, subjectLabel: 'Stabicraft 1850', rootTableId: 'motors' }),
    quote({ id: 'q3', reference: 'Q-102', customer: { name: '' }, subjectLabel: 'Yamaha F115' }),
  ]

  it('matches everything on an empty query', () => {
    expect(set.filter((q) => matches(q, '   ')).length).toBe(3)
  })

  /* EVERY WORD MUST HIT SOMETHING, so typing more always narrows.
     A search where the second word could widen the result is a
     search nobody can predict. */
  it('narrows word by word, across reference, customer and subject', () => {
    expect(set.filter((q) => matches(q, 'ellis')).map((q) => q.id)).toEqual(['q1'])
    expect(set.filter((q) => matches(q, 'highfield ellis')).map((q) => q.id)).toEqual(['q1'])
    expect(set.filter((q) => matches(q, 'highfield nguyen')).length).toBe(0)
    expect(set.filter((q) => matches(q, 'q-10')).length).toBe(3)
  })

  it('reads a quote’s type off the table its subject came from', () => {
    expect(kindOfQuote(set[0], ENTITIES)).toBe('boat')
    expect(kindOfQuote(set[1], ENTITIES)).toBe('motor')
    /* a table that has been deleted since is 'custom' rather than a
       throw — the document is frozen and the sheet moved on */
    expect(kindOfQuote(quote({ id: 'x', rootTableId: 'gone' }), ENTITIES)).toBe('custom')
  })

  it('offers a chip only for a kind something is actually quoted from', () => {
    const chips = typeChips(set, ENTITIES)
    expect(chips[0]).toMatchObject({ key: 'all', count: 3 })
    expect(chips.map((c) => c.key)).toEqual(['all', 'boat', 'motor'])
    expect(chips.find((c) => c.key === 'boat')?.count).toBe(2)
  })
})

/* ---------------------------------------------------------- */

describe('ordering a column', () => {
  const a = quote({ id: 'a', customer: { name: 'Zhang' }, updatedAt: '2026-08-01T00:00:00.000Z' })
  const b = quote({ id: 'b', customer: { name: 'Adams' }, updatedAt: '2026-08-03T00:00:00.000Z' })
  const c = quote({ id: 'c', customer: { name: '' }, updatedAt: '2026-08-02T00:00:00.000Z' })
  const set = [a, b, c]

  it('never sorts the caller’s array in place', () => {
    const before = set.map((q) => q.id)
    sortDeals(set, 'oldest')
    expect(set.map((q) => q.id)).toEqual(before)
  })

  it('puts the newest first by default and the oldest first on request', () => {
    expect(sortDeals(set, 'recent').map((q) => q.id)).toEqual(['b', 'c', 'a'])
    expect(sortDeals(set, 'oldest').map((q) => q.id)).toEqual(['a', 'c', 'b'])
  })

  /* A QUOTE WITH NO CUSTOMER SORTS LAST, not first under an empty
     string: "not said yet" is not a name beginning with nothing,
     and a column opening with blanks looks broken. */
  it('sorts a nameless customer last, not first', () => {
    expect(sortDeals(set, 'customer').map((q) => q.id)).toEqual(['b', 'a', 'c'])
  })
})

/* ---------------------------------------------------------- */

/* ============================================================
   HOW LONG A DEAL HAS STOOD WHERE IT IS.

   Three cases, and the third is the one worth a test: a deal
   moved by a build that recorded no instant has NO honest answer,
   and `arrivedAt` returns null rather than a guess. A number with
   the file authority behind it that nobody measured is exactly
   what this repository keeps catching.
   ============================================================ */
describe('when a deal arrived where it stands', () => {
  const made = '2026-08-01T00:00:00.000Z'
  const given = '2026-08-10T00:00:00.000Z'

  it('is the recorded instant when this build moved it', () => {
    const q = quote({ id: 'a', createdAt: made })
    expect(arrivedAt(q, { a: 'won' }, { a: 999 })).toBe(999)
  })

  /* THE HONEST NULL. An override written before the instant was
     recorded says WHERE but not WHEN, and "since it was created"
     would be wrong for a card moved to Won last week. */
  it('is null when it was moved by a build that recorded no instant', () => {
    const q = quote({ id: 'a', createdAt: made })
    expect(arrivedAt(q, { a: 'won' }, {})).toBeNull()
  })

  /* A DEAL NOBODY HAS MOVED DERIVES ITS ARRIVAL exactly as it
     derives its column: an issued quote has stood in Issued since
     it was issued, a draft since it was written. */
  it('derives a draft from when it was written', () => {
    const q = quote({ id: 'a', createdAt: made })
    expect(arrivedAt(q, {}, {})).toBe(Date.parse(made))
  })

  it('derives an issued quote from when it was issued', () => {
    const q = quote({ id: 'a', state: 'issued', createdAt: made, issuedAt: given })
    expect(arrivedAt(q, {}, {})).toBe(Date.parse(given))
  })

  it('falls back to when it was written if the issue stamp is missing', () => {
    const q = quote({ id: 'a', state: 'issued', createdAt: made })
    expect(arrivedAt(q, {}, {})).toBe(Date.parse(made))
  })

  /* A DOCUMENT WRITTEN BY AN OLDER BUILD can carry a stamp this
     one cannot parse. Nothing is drawn rather than NaN. */
  it('is null rather than NaN when the stamp cannot be parsed', () => {
    const q = quote({ id: 'a', createdAt: 'the fourth of never' })
    expect(arrivedAt(q, {}, {})).toBeNull()
  })
})

/* ---------------------------------------------------------- */

/* ============================================================
   WHAT A STORED STAGE LIST HAS TO SURVIVE — including a rename.

   `empty` became `about` when the sentence started being drawn
   under a FULL column as well as an empty one. A board already
   stored on somebody machine holds the old key, and dropping those
   sentences would have deleted words a dealer typed in order to
   make room for a field with a better name.
   ============================================================ */
describe('a stored stage list', () => {
  /* THE SUITE RUNS UNDER `environment: 'node'` ON PURPOSE — see
     vitest.config.ts — so there is no `localStorage` to write to.
     A four-line Map is the whole of what `stageStore.read` uses,
     and it keeps this test measuring the PARSER rather than a
     browser: swapping in jsdom for one describe would slow every
     suite in the repository to test a getItem. */
  const shim = new Map<string, string>()
  const store = (v: unknown): void => {
    forgetStageStore()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => shim.get(k) ?? null,
      setItem: (k: string, s: string) => shim.set(k, s),
      removeItem: (k: string) => shim.delete(k),
    }
    shim.set('hl.pipeline.stages.v1:t', JSON.stringify(v))
  }

  it('reads the old `empty` key as `about`', () => {
    store([
      { id: 'draft', name: 'Draft', empty: 'Being built.', tone: 'neutral' },
      { id: 'issued', name: 'Issued', empty: 'Waiting.', tone: 'blue' },
    ])
    expect(stagesOf('t').map((s) => s.about)).toEqual(['Being built.', 'Waiting.'])
  })

  it('prefers `about` when a board carries both', () => {
    store([
      { id: 'draft', name: 'Draft', about: 'New words', empty: 'Old words', tone: 'neutral' },
      { id: 'issued', name: 'Issued', about: '', tone: 'blue' },
    ])
    expect(stagesOf('t')[0].about).toBe('New words')
  })

  /* EVERY EXISTING BOARD IS AN UNWASHED ONE. A stage stored before
     the field existed was drawn plain, so plain is what it meant. */
  it('gives a stage with no wash the plain one', () => {
    store([
      { id: 'draft', name: 'Draft', tone: 'neutral' },
      { id: 'issued', name: 'Issued', tone: 'blue' },
    ])
    expect(stagesOf('t').map((s) => s.wash)).toEqual(['none', 'none'])
  })

  it('reads a stored wash back', () => {
    store([
      { id: 'draft', name: 'Draft', tone: 'neutral', wash: 'full' },
      { id: 'issued', name: 'Issued', tone: 'blue', wash: 'soft' },
    ])
    expect(stagesOf('t').map((s) => s.wash)).toEqual(['full', 'soft'])
  })

  it('refuses a wash this build does not have, rather than storing it', () => {
    store([
      { id: 'draft', name: 'Draft', tone: 'neutral', wash: 'neon' },
      { id: 'issued', name: 'Issued', tone: 'blue' },
    ])
    expect(stagesOf('t')[0].wash).toBe('none')
  })

  /* THE ANCHORS MUST BE THERE, or a quote nobody has moved has
     nowhere to be drawn — so a list missing one falls back to the
     defaults WHOLE rather than half. */
  it('falls back to the shipped five when an anchor is missing', () => {
    store([{ id: 'draft', name: 'Draft', tone: 'neutral' }])
    expect(stagesOf('t')).toEqual(DEFAULT_STAGES.map((s) => ({ ...s })))
  })
})
