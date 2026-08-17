/* ============================================================
   DISCONTINUED NEVER REACHES A SALESPERSON — proved at the one
   gate every customer-facing surface comes through.

   `relatedRows` is that gate. A view page's block, the candidates a
   quote picks from and the starred row a fresh quote is minted with
   are all the same call, so a hole here is a hole on three screens
   at once — and the failure it prevents is measured: 30 live
   pairings offer a discontinued trailer and EIGHT offer it as the
   boat's STANDARD fit. Somebody would have quoted it.

   The three things that must not happen are each a test below.

     1. AN EXISTING QUOTE MUST STILL RESOLVE. Nothing about the
        filter touches a frozen line. A quote written against a
        trailer discontinued since still opens and still totals —
        `quoteTotals` never reads a row, and that is asserted here
        rather than assumed.

     2. NOTHING VANISHES SILENTLY. Held rows come back as a COUNT
        and a list, so a block that would have drawn eight and draws
        six can say so.

     3. THE PERSON MAINTAINING THE DATA STILL SEES IT. Nothing is
        deleted: every held row is still in the store, and the
        sheet's own reading of it is untouched.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import {
  DISCONTINUED_FIELD_ID,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { quoteTotals } from '@/features/quote/totals'
import type { QuoteDef, QuoteLine } from '@/features/quote/types'
import { curatedOnly } from './describe'
import { makeEngine, relatedRows, type Ctx, type JoinRef } from './pairs'
import { defaultBlocksFor, existingRelations, withheldRelations } from './relations'
import {
  countDiscontinued,
  heldBackRowCount,
  heldBackSentence,
  retiredTableSentence,
  sellableRowCount,
  sellableRows,
  sellableTables,
  withheldNotes,
} from './sellable'

/* ---------------------------------------------------------- */
/* A small sheet: one boat, three trailers, one join           */
/* ---------------------------------------------------------- */

const STAMP = '2026-01-01T00:00:00.000Z'

const field = (id: string, name: string, type: FieldDef['type'], extra: Partial<FieldDef> = {}): FieldDef => ({
  id,
  name,
  type,
  ...extra,
})

const table = (id: string, name: string, fields: FieldDef[], extra: Partial<EntityDef> = {}): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields,
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...extra,
})

const row = (id: string, entityId: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const BOATS = table('boats', 'Highfield Inflatables', [field('bname', 'Model', 'text')])

const TRAILERS = (extra: Partial<EntityDef> = {}): EntityDef =>
  table(
    'trailers',
    'NSM Custom Trailers',
    [field('tname', 'Model', 'text')],
    extra,
  )

const JOIN = (extra: Partial<EntityDef> = {}): EntityDef =>
  table(
    'join',
    'Highfield x NSM Custom Trailers',
    [
      field('jboat', 'Boat', 'reference', { refEntityId: 'boats' }),
      field('jtrailer', 'Trailer', 'reference', { refEntityId: 'trailers' }),
    ],
    { role: 'join', ...extra },
  )

const JOIN_REF: JoinRef = {
  entityId: 'join',
  sourceFieldId: 'jboat',
  targetFieldId: 'jtrailer',
}

const BOAT_ROW = row('boat-1', 'boats', { bname: 'SP460' })

/** Three trailers, the middle one no longer sold. */
const trailerRows = (): RowData[] => [
  row('t-live-1', 'trailers', { tname: 'NSM 4.6' }),
  row('t-gone', 'trailers', { tname: 'NSM 4.2 (old)', [DISCONTINUED_FIELD_ID]: true }),
  row('t-live-2', 'trailers', { tname: 'NSM 5.0' }),
]

/** One pair row per trailer — a curated menu of all three. */
const pairRows = (): RowData[] =>
  trailerRows().map((t, i) =>
    row(`p-${i}`, 'join', { jboat: 'boat-1', jtrailer: t.id }),
  )

function sheet(opts: { trailers?: Partial<EntityDef>; join?: Partial<EntityDef> } = {}): Ctx {
  const trailers = TRAILERS(opts.trailers)
  const join = JOIN(opts.join)
  return {
    entities: { boats: BOATS, trailers, join },
    rowsByEntity: {
      boats: [BOAT_ROW],
      trailers: trailerRows(),
      join: pairRows(),
    },
  }
}

const block = (ctx: Ctx, curated: boolean) =>
  relatedRows({
    ctx,
    engine: makeEngine(ctx),
    sourceEntity: BOATS,
    sourceRow: BOAT_ROW,
    targetEntityId: 'trailers',
    rule: curated ? curatedOnly() : undefined,
    join: JOIN_REF,
  })

/* ---------------------------------------------------------- */

describe('the filters themselves', () => {
  it('keeps a row until its Discontinued box is ticked', () => {
    const rows = trailerRows()
    expect(sellableRows(rows).map((r) => r.id)).toEqual(['t-live-1', 't-live-2'])
    expect(countDiscontinued(rows)).toBe(1)
  })

  it('never lists a retired table, and counts every row of one as held', () => {
    const live = TRAILERS()
    const gone = TRAILERS({ retired: true })
    const rowsByEntity = { trailers: trailerRows() }

    expect(sellableTables([BOATS, live]).map((e) => e.id)).toEqual(['boats', 'trailers'])
    expect(sellableTables([BOATS, gone]).map((e) => e.id)).toEqual(['boats'])

    /* live table: the two still sold. retired table: none of the
       three, and all three counted as held rather than lost. */
    expect(sellableRowCount([live], rowsByEntity)).toBe(2)
    expect(heldBackRowCount([live], rowsByEntity)).toBe(1)
    expect(sellableRowCount([gone], rowsByEntity)).toBe(0)
    expect(heldBackRowCount([gone], rowsByEntity)).toBe(3)
  })
})

describe('a block on a view page', () => {
  it('offers what is still sold and holds the rest back, with a count', () => {
    const result = block(sheet(), true)
    expect(result.rows.map((r) => r.row.id)).toEqual(['t-live-1', 't-live-2'])
    expect(result.heldCount).toBe(1)
    expect(result.held.map((r) => r.row.id)).toEqual(['t-gone'])
    expect(result.historic).toBeUndefined()
  })

  it('holds back the whole of a RETIRED table and says which kind of reason', () => {
    const result = block(sheet({ trailers: { retired: true } }), true)
    expect(result.rows).toEqual([])
    expect(result.heldCount).toBe(3)
    expect(result.historic).toBe('table')
  })

  it('holds back a menu whose JOIN is history — "Surtees x OBSOLETE Trailers"', () => {
    const result = block(sheet({ join: { retired: true } }), true)
    expect(result.rows).toEqual([])
    expect(result.historic).toBe('pairs')
  })

  it('does the same when the block shows the whole table rather than a menu', () => {
    const result = block(sheet(), false)
    expect(result.rows.map((r) => r.row.id)).toEqual(['t-live-1', 't-live-2'])
    expect(result.heldCount).toBe(1)
  })

  it('will not let a PIN carry a discontinued row through', () => {
    /* a person once pressed ADD on the row that is now discontinued.
       That says the rule was wrong about it — never that the
       business has resumed selling it. */
    const ctx = sheet()
    ctx.rowsByEntity.join = [
      row('p-pinned', 'join', { jboat: 'boat-1', jtrailer: 't-gone', __origin: 'added' }),
    ]
    const result = relatedRows({
      ctx,
      engine: makeEngine(ctx),
      sourceEntity: BOATS,
      sourceRow: BOAT_ROW,
      targetEntityId: 'trailers',
      /* a rule nothing matches, so only the pin could bring it in */
      rule: curatedOnly(),
      join: JOIN_REF,
    })
    expect(result.rows).toEqual([])
    expect(result.held.map((r) => r.row.id)).toEqual(['t-gone'])
  })

  it('clears the STAR on a held row, so a fresh quote cannot mint it', () => {
    /* `mintQuoteFromView` brings the starred row across on its own.
       A star left on a discontinued trailer would put it on a
       customer's document without anybody choosing it. */
    const ctx = sheet()
    ctx.rowsByEntity.join = [
      row('p-star', 'join', { jboat: 'boat-1', jtrailer: 't-gone', __recommended: true }),
    ]
    const result = block(ctx, true)
    expect(result.rows).toEqual([])
    expect(result.held).toHaveLength(1)
    expect(result.held[0].recommended).toBe(false)
  })

  it('leaves the sheet alone — nothing is deleted, only held', () => {
    const ctx = sheet()
    block(ctx, true)
    expect(ctx.rowsByEntity.trailers).toHaveLength(3)
    expect(ctx.rowsByEntity.join).toHaveLength(3)
  })
})

describe('AN EXISTING QUOTE STILL RESOLVES', () => {
  /** One line, frozen against the trailer that has since been
   *  discontinued. Nothing on it is an id the total depends on. */
  const frozenLine: QuoteLine = {
    id: 'line-1',
    entityId: 'trailers',
    rowId: 't-gone',
    label: 'NSM 4.2 (old)',
    qty: 1,
    unitPrice: 4250,
    priceFieldId: 'tprice',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [],
  }

  const oldQuote: QuoteDef = {
    id: 'q-1',
    reference: '20250114-01',
    state: 'issued',
    viewId: 'view-1',
    rootTableId: 'boats',
    rootRowId: 'boat-1',
    subjectLabel: 'SP460',
    subjectSpecs: [],
    sections: [
      { blockId: 'b-1', tableId: 'trailers', title: 'NSM Custom Trailers', lineIds: ['line-1'] },
    ],
    lines: [frozenLine],
    adjustments: [],
    levelKey: 'cash',
    customer: { name: 'A real customer' },
    createdAt: STAMP,
    updatedAt: STAMP,
  }

  it('still totals, although the picker would no longer offer the row', () => {
    /* the same row, in the same store, refused by the gate */
    expect(block(sheet(), true).rows.map((r) => r.row.id)).not.toContain('t-gone')

    /* and the document is untouched: filtering the PICKER is not
       filtering the DOCUMENT */
    const totals = quoteTotals(oldQuote)
    expect(totals.total).toBe(4250)
    expect(totals.unpricedCount).toBe(0)
    expect(oldQuote.lines[0].label).toBe('NSM 4.2 (old)')
    expect(oldQuote.lines[0].priceColumnName).toBe('Cash')
  })
})

describe('the sentences — a count is never left on its own', () => {
  it('says one, and says many, without saying "1 trailers"', () => {
    expect(heldBackSentence(1, 'NSM Custom Trailers')).toContain(
      '1 NSM Custom Trailer is no longer sold',
    )
    expect(heldBackSentence(3, 'NSM Custom Trailers')).toContain(
      '3 NSM Custom Trailers are no longer sold',
    )
  })

  it('always ends on the reason the data was kept', () => {
    for (const s of [
      heldBackSentence(2, 'NSM Custom Trailers'),
      retiredTableSentence('OBSOLETE Trailers'),
    ]) {
      expect(s).toContain('still opens, still totals and still prints')
    }
  })

  it('says nothing at all when nothing was held', () => {
    expect(heldBackSentence(0, 'NSM Custom Trailers')).toBe('')
  })
})

/* ---------------------------------------------------------- */
/* 4. AND A WITHHOLDING NOBODY WAS TOLD ABOUT.                 */
/*                                                             */
/* The three above all prove a BLOCK holding rows back. This   */
/* one is the case the block cannot cover: `existingRelations` */
/* refuses a retired table, and a retired join, BEFORE a block */
/* is seeded — so `BlockCard`'s heldNote had nothing to run in */
/* and the page drew four of five joins in silence. Measured   */
/* on the seed: the Surtees page has a "Surtees × OBSOLETE     */
/* Trailers" join in the store, drew five blocks, and never    */
/* said a sixth relationship existed.                          */
/* ---------------------------------------------------------- */

describe('the joins a page never drew', () => {
  const drewNothing = new Set<string>()

  it('draws the relation, and withholds nothing, while both are live', () => {
    const { entities } = sheet()
    expect(existingRelations(entities, 'boats')).toEqual([
      { otherId: 'trailers', joinId: 'join' },
    ])
    expect(withheldRelations(entities, 'boats')).toEqual([])
    expect(withheldNotes(entities, 'boats', drewNothing)).toEqual([])
  })

  it('still refuses a retired TABLE — and now names it', () => {
    const { entities } = sheet({ trailers: { retired: true } })

    /* the guard is untouched: no relation, and so no seeded block */
    expect(existingRelations(entities, 'boats')).toEqual([])
    expect(defaultBlocksFor(entities, 'boats')).toEqual([])

    /* and the refusal is no longer silent */
    expect(withheldRelations(entities, 'boats')).toEqual([
      { otherId: 'trailers', joinId: 'join', reason: 'table' },
    ])
    const notes = withheldNotes(entities, 'boats', drewNothing)
    expect(notes).toHaveLength(1)
    expect(notes[0].sentence).toBe(retiredTableSentence('NSM Custom Trailers'))
    expect(notes[0].sentence).toContain('history rather than stock')
    expect(notes[0].sentence).toContain('still opens, still totals and still prints')
  })

  it('still refuses a retired JOIN — and names the join, not the table', () => {
    const { entities } = sheet({ join: { retired: true } })

    expect(existingRelations(entities, 'boats')).toEqual([])
    expect(defaultBlocksFor(entities, 'boats')).toEqual([])
    expect(withheldRelations(entities, 'boats')).toEqual([
      { otherId: 'trailers', joinId: 'join', reason: 'pairs' },
    ])

    /* the sentence has to name the LIST, because the table itself is
       still stock and telling somebody NSM Custom Trailers is history
       would be false */
    const [note] = withheldNotes(entities, 'boats', drewNothing)
    expect(note.sentence).toContain('Highfield x NSM Custom Trailers')
    expect(note.sentence).toContain('the list that recorded which')
    expect(note.sentence).not.toContain('NSM Custom Trailers is history')
  })

  it('reads the same from the other end of a retired join', () => {
    /* the OBSOLETE trailer's own page: the table it is joined to is
       live, the list is not */
    const { entities } = sheet({ join: { retired: true } })
    expect(withheldRelations(entities, 'trailers')).toEqual([
      { otherId: 'boats', joinId: 'join', reason: 'pairs' },
    ])
  })

  it('says the TABLE is history when both it and its join are', () => {
    /* Northside's real case — trl_obsolete and join_surtees_obs are
       both retired. One sentence, and it is the one that explains the
       most: the shelf is gone, not just the list pointing at it. */
    const { entities } = sheet({ trailers: { retired: true }, join: { retired: true } })
    expect(withheldRelations(entities, 'boats')).toEqual([
      { otherId: 'trailers', joinId: 'join', reason: 'table' },
    ])
    expect(withheldNotes(entities, 'boats', drewNothing)).toHaveLength(1)
  })

  it('does not say it twice when a block is already drawing that table', () => {
    /* somebody added the block by hand before the table was retired.
       The block holds its rows back and says so in its own header. */
    const { entities } = sheet({ trailers: { retired: true } })
    expect(withheldNotes(entities, 'boats', new Set(['trailers']))).toEqual([])
  })

  it('never mistakes "no relationship" for "a relationship held back"', () => {
    /* a table joined to nothing must still say "nothing goes with
       this yet" — the sentence is for a join that EXISTS */
    const { entities } = sheet()
    const alone = { ...entities, loose: table('loose', 'Rates & Charges', []) }
    expect(withheldRelations(alone, 'loose')).toEqual([])
    expect(withheldNotes(alone, 'loose', drewNothing)).toEqual([])
  })
})
