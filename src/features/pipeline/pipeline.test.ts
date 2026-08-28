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
import { boardOf, derivedStage, stageOf, STAGES } from './stages'
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
    const cols = boardOf(qs, {})
    expect(cols['draft'].map((q) => q.id)).toEqual(['a'])
    expect(cols['issued'].map((q) => q.id)).toEqual(['b'])
    expect(cols['won']).toEqual([])
  })

  it('lets a stored decision beat the derived one', () => {
    const q = quote({ id: 'a', state: 'issued' })
    expect(stageOf(q, { a: 'won' })).toBe('won')
  })

  it('draws every stage, including the empty ones', () => {
    const cols = boardOf([], {})
    expect(Object.keys(cols).sort()).toEqual(STAGES.map((s) => s.id).sort())
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
