/* ============================================================
   THE FOUR THINGS "FIND ANYTHING" GOT WRONG, AT FULL SCALE.

   `rowSearch.test.ts` next door proves the rules on synthetic
   fixtures. This file proves them on the real prepared file — 53
   tables, 28 of them pair lists, 11,116 rows, of which 8,679 are pair
   rows — because every one of the four defects was invisible at
   fixture size and obvious at this one:

     1. all the pair lists were doors, so `crossfire` answered with
        two boats and then twenty rows of pair records;
     2. the retired table was offered as an ordinary result, reading
        "10 rows" beside live stock;
     3. picking a row never carried the row;
     4. the count said 52 while Home's header and the dock badge
        both said 50. (51 of 53 today; the invariant is what is
        asserted, not the figure.)

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
       TRAILERS (4) — 2 answers under 20 rows of plumbing.

       THE DEFECT WAS PLUMBING IN THE ANSWERS, never the number of
       answers. This used to read `toEqual(['base'])`, which was true only
       because one register happened to hold the word; Dealer Fit Packages
       now carries its whole sheet and holds fourteen Crossfire pre-delivery
       packages, which is a dealer's own catalogue answering a dealer's own
       question. So the property is stated as the property: every group is a
       PLACE, and the total is those places and nothing else. */
    const result = search(index, 'crossfire')
    expect(result.groups.length).toBeGreaterThan(0)
    expect(result.groups.map((g) => g.table.role ?? 'base')).toEqual(
      result.groups.map(() => 'base'),
    )
    expect(result.rowTotal).toBe(result.groups.reduce((n, g) => n + g.total, 0))
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

/* ============================================================
   THE THREE KINDS THAT WERE MISSING, AT FULL SCALE.

   `fiveKinds.test.ts` proves the RULES on synthetic fixtures. These
   are the measurements that made the rules necessary, asserted
   against the file they were measured on — and stated as invariants
   wherever a number would do, because the seed is a living document.
   ============================================================ */

describe('find anything, on the real file — columns are answers now', () => {
  it('answers the queries UX_PASS §2 itself names, which used to come back empty', () => {
    /* §2's worked example is an admin looking for the column
       `Tare (kg)` who "does not know which of seven trailer tables
       declares it", and its mock answers `Min HP` with "on 7 boat
       tables". MEASURED BEFORE, on this exact file: both, and
       `price` — which names 26 columns across fifteen tables — came
       back "Nothing is called that". A search that is confidently
       empty about something the file plainly contains teaches a
       person the search does not work. */
    for (const q of ['tare', 'min hp', 'price']) {
      const result = search(index, q)
      expect(result.columns.length).toBeGreaterThan(0)
      for (const hit of result.columns) {
        expect(hit.name.toLowerCase()).toContain(q)
      }
      /* and none of the three is a ROW or a TABLE name, which is why
         the palette had nothing to say about them before */
      expect(result.rowTotal).toBe(0)
      expect(result.tables).toHaveLength(0)
    }
  })

  it('folds far more declarations than it draws names', () => {
    /* the whole design of the columns kind in one assertion: 826
       declarations under ~205 distinct names on this file, so the
       fold is what stops `price` being a wall of 26 identical lines */
    expect(index.columnTotal).toBeGreaterThan(index.columns.length * 2)
  })

  it('never lands a column press on a live pair list', () => {
    /* the file's central ruling, held for the third time — after a
       pair ROW and a pair NAME, a pair's COLUMN. It matters here:
       153 of the 228 columns declared on a pair list are declared
       nowhere else, so they cannot simply be dropped. */
    let readOnAPair = 0
    for (const entry of index.columns) {
      const facts = index.facts[entry.destId]
      expect(facts).toBeDefined()
      expect(facts.role === 'join' && !facts.retired).toBe(false)
      if (entry.via !== undefined) readOnAPair += 1
    }
    /* and the fitment lists really are contributing columns, or the
       assertion above would be passing vacuously */
    expect(readOnAPair).toBeGreaterThan(0)
  })

  it('opens a table that is really on the sheet', () => {
    for (const option of optionsOf(search(index, 'price'))) {
      if (option.kind !== 'column') continue
      expect(entities[option.entityId]).toBeDefined()
    }
  })
})

describe('find anything, on the real file — a place is not a table', () => {
  it('answers the module name that no table is called', () => {
    /* MEASURED BEFORE: `boats` is the name of a module holding seven
       brand tables and answered with ten rows out of two tables that
       merely carry the word, with no way to reach the place at all. */
    const withPlaces = buildSearchIndex(entities, rowsByEntity, {
      moduleDoor: true,
      modules: {
        m: {
          id: 'm',
          name: 'Boats',
          description: 'Seven brand price files.',
          tableIds: all.filter((e) => e.kind === 'boat').map((e) => e.id),
          capabilities: ['browse', 'search', 'open'],
          index: 'rows',
          accent: 'blue',
          order: 0,
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
        },
      },
    })
    const result = search(withPlaces, 'boats')
    expect(result.modules).toHaveLength(1)
    expect(result.modules[0].module.name).toBe('Boats')
    /* and it is not a table name — which is why the palette could
       not reach it before */
    expect(all.some((e) => e.name.toLowerCase() === 'boats')).toBe(false)
    /* the place comes first, because it contains the rest */
    expect(optionsOf(result)[0].kind).toBe('module')
  })
})
