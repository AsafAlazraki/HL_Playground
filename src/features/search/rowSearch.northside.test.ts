/* ============================================================
   THE FOUR THINGS "FIND ANYTHING" GOT WRONG, AT FULL SCALE.

   `rowSearch.test.ts` next door proves the rules on synthetic
   fixtures. This file proves them on the real prepared file — 52
   tables, 27 of them pair lists, 3,566 rows — because every one of
   the four defects was invisible at fixture size and obvious at
   this one:

     1. all 27 pair lists were doors, so `crossfire` answered with
        two boats and then twenty rows of pair records;
     2. the retired table was offered as an ordinary result, reading
        "10 rows" beside live stock;
     3. picking a row never carried the row;
     4. the count said 52 while Home's header and the dock badge
        both said 50.

   The assertions are INVARIANTS wherever a number would do, because
   the seed is a living document: "no answer is ever a live pair
   list" stays true when a brand is added and `=== 50` does not.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import { isRetired, type EntityDef, type RowData } from '@/types/model'
import { buildSearchIndex, optionsOf, search } from './rowSearch'

function northside(): {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
} {
  const project = buildNorthsideProject()
  const entities: Record<string, EntityDef> = {}
  for (const e of project.entities) entities[e.id] = e
  return { entities, rowsByEntity: project.rowsByEntity }
}

const { entities, rowsByEntity } = northside()
const index = buildSearchIndex(entities, rowsByEntity)
const all = Object.values(entities)

describe('find anything, on the real file — a pair is never a place', () => {
  it('answers the query that measured the defect with the things, not the pairs', () => {
    /* MEASURED BEFORE: two real Stacer boats, then STACER × P/D PARTS
       (8), STACER × YAMAHA — MOTOR FITMENT (8) and STACER × STACER
       TRAILERS (4) — 2 answers under 20 rows of plumbing. */
    const result = search(index, 'crossfire')
    expect(result.groups.map((g) => g.table.role ?? 'base')).toEqual(['base'])
    expect(result.rowTotal).toBe(result.groups[0].total)
  })

  it('never lands a row answer on a pair list, for any query', () => {
    for (const q of ['crossfire', 'yamaha', 'highfield', 'trailer', 'f90', '560']) {
      const result = search(index, q)
      for (const g of result.groups) {
        expect(g.table.role === 'join' && !g.table.retired).toBe(false)
      }
    }
  })

  it('never opens a live pair list from the tables group either', () => {
    for (const q of ['fitment', 'parts', 'dealer fit', 'yamaha', 'stacer']) {
      for (const hit of search(index, q).tables) {
        expect(hit.table.role === 'join' && !hit.table.retired).toBe(false)
      }
    }
  })

  it('answers a pair list’s own name with the table its pairs are about', () => {
    const result = search(index, 'motor fitment')
    expect(result.tables.length).toBeGreaterThan(0)
    for (const hit of result.tables) {
      expect(hit.via).toBeDefined()
      expect(hit.at).toBe(-1)
      expect(hit.table.role ?? 'base').toBe('base')
    }
    /* one line per place, however many of its lists matched */
    const opened = result.tables.map((t) => t.table.id)
    expect(opened).toEqual([...new Set(opened)])
  })

  it('has every pair row accounted for by the rows it pairs', () => {
    /* the fact the whole rule rests on: a pair row's name is composed
       from the names it links, so none of them is indexed and nothing
       is left needing wording of its own */
    const pairRows = all
      .filter((e) => e.role === 'join')
      .reduce((n, e) => n + (rowsByEntity[e.id]?.length ?? 0), 0)
    expect(index.pairRows).toBe(pairRows)
    expect(index.viaRows).toBe(0)
    expect(index.rows.some((r) => entities[r.entityId]?.role === 'join')).toBe(false)
  })
})

describe('find anything, on the real file — history is offered and said', () => {
  it('offers the retired table, marked as history, after everything live', () => {
    const result = search(index, 'obsolete')
    const retired = result.tables.filter((t) => t.table.retired)
    expect(retired.length).toBeGreaterThan(0)
    /* nothing live is ranked below it */
    const standings = result.tables.map((t) => (t.table.retired ? 1 : 0))
    expect([...standings].sort((a, b) => a - b)).toEqual(standings)
  })

  it('keeps its rows findable, because the sheet is where they are fixed', () => {
    const obsolete = all.find((e) => isRetired(e) && e.role !== 'join')
    expect(obsolete).toBeDefined()
    const rows = rowsByEntity[obsolete!.id] ?? []
    expect(rows.length).toBeGreaterThan(0)
    const indexed = index.rows.filter((r) => r.entityId === obsolete!.id)
    expect(indexed.length).toBe(index.facts[obsolete!.id].rowCount)
  })
})

describe('find anything, on the real file — one number, everywhere', () => {
  it('counts the tables the way Home’s header and the dock badge do', () => {
    /* both of those filter with `isRetired` — this said 52 while they
       said 50, and the two tables in the difference are the retired
       trailer table and the retired pair list that goes with it */
    const live = all.filter((e) => !isRetired(e)).length
    expect(index.tableTotal).toBe(live)
    expect(index.tableTotal).toBeLessThan(all.length)
    expect(index.retiredTables).toBe(all.length - live)
  })

  it('quotes a row count it can actually land on', () => {
    expect(index.rowTotal).toBe(index.rows.length)
    for (const entry of index.rows) {
      expect(entities[entry.entityId]).toBeDefined()
      expect(index.facts[entry.entityId].role === 'join').toBe(false)
    }
  })
})

describe('find anything, on the real file — the row travels', () => {
  it('hands back the row id of every row answer', () => {
    const result = search(index, 'crossfire')
    const options = optionsOf(result)
    const rows = options.filter((o) => o.kind === 'row')
    expect(rows.length).toBeGreaterThan(0)
    for (const option of rows) {
      if (option.kind !== 'row') continue
      const live = rowsByEntity[option.entityId] ?? []
      /* the id names a row that really is in the table being opened,
         which is what the sheet needs to go to it */
      expect(live.some((r) => r.id === option.rowId)).toBe(true)
    }
  })
})
