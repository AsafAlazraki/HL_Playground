/* ============================================================
   WHAT A TILE SAYS, CHECKED AGAINST THE REAL SHEET.

   `tileFacts.ts` claims it can pick the two or three figures that
   decide a sale WITHOUT knowing what a boat is. That is a claim
   that only means something against 15,691 real rows, so it is
   asserted here rather than against a fixture somebody built to
   agree with it.

   THE THREE THINGS THIS HAS TO PROVE:

     1. IT PICKS SOMETHING A PERSON WOULD PICK. Highfield nominates
        OA Length, Int Length and Boat Weight; NSM Custom Trailers
        nominates ATM and Tare. Nobody typed those and nothing in the
        engine knows they are marine measurements — they win because
        they are filled on nearly every row and they split the rows
        further than anything else that is allowed on a tile.

     2. IT NEVER PUTS A SECOND PRICE ON A CUSTOMER'S SCREEN. This is
        the one that matters. `Trade` scores HIGHER than every column
        that wins on Highfield — 0.98 spread, filled on all 588 rows —
        and it is the trade price. The tile already carries `Cash`.
        Two money figures on one face is the "which number do I quote"
        failure, and the wrong one of the two is the dealer's own
        margin read over a customer's shoulder.

     3. IT SAYS NOTHING RATHER THAN SOMETHING WEAK. Parts &
        Accessories nominates NOTHING: its only two candidates are a
        money column and the discontinued flag. A register with no
        comparable figure gets no fact line, not an invented one.

   AND WHAT IT COSTS, because the brief asked: the two biggest
   tables on the sheet are timed at the bottom of this file.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import { isDiscontinued, type EntityDef, type RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { loadNorthsideProject } = await import('@/demos/northside')
const { buildEntries, listedTables, priceReadOf } = await import('./read')
const { factColumns, FACTS_PER_TILE } = await import('./tileFacts')
const { isMoney, bandOf } = await import('@/features/views/columns')

function sheet() {
  loadNorthsideProject()
  return useProjectStore.getState()
}

const tableNamed = (entities: Record<string, EntityDef>, name: string): EntityDef => {
  const hit = Object.values(entities).find((e) => e.name === name)
  if (!hit) throw new Error(`no table called ${name}`)
  return hit
}

/** The columns one table's own rows nominate, live rows only — the
 *  same call `buildEntries` makes. */
function nominated(name: string): { entity: EntityDef; labels: string[]; live: RowData[] } {
  const { entities, rowsByEntity } = sheet()
  const entity = tableNamed(entities, name)
  const live = (rowsByEntity[entity.id] ?? []).filter((r) => !isDiscontinued(r))
  const price = priceReadOf(entity)
  const cols = factColumns(entity, live, new Set(price ? [price.field.id] : []))
  return { entity, labels: cols.map((c) => c.label), live }
}

describe('the figures a tile carries', () => {
  it('nominates the columns that actually separate a brand’s hulls', () => {
    /* 588 variants, 33 columns, and these three win on the measurement
       alone: filled on 95–100% of rows and splitting them further than
       anything else the refusals allow through. */
    expect(nominated('Highfield Inflatables').labels).toEqual([
      'OA Length',
      'Int Length cm',
      'Boat Weight kg',
    ])
    /* a different brand, a different column vocabulary, and the rule
       is asked again rather than a shape being assumed — Stacer heads
       the same measurements with its own words */
    expect(nominated('Stacer').labels).toEqual([
      'Hull Length (Mtr)',
      'Hull Weight (Dry) kg',
      'Min HP',
    ])
  })

  it('nominates fewer than three when only two columns earn a slot', () => {
    /* NSM Custom Trailers fills `Between Guards (mm)` and
       `Trailer Length (Mtr)` on a third of its rows, which is two
       blank slots for every one they fill, so the fill floor stops
       them and the tile carries two facts rather than a padded three. */
    const nsm = nominated('NSM Custom Trailers')
    expect(nsm.labels).toEqual(['ATM (KG)', 'Tare (Kg)'])

    /* and one, where one is all the table honestly offers */
    expect(nominated('Yamaha Outboards').labels).toEqual(['WEIGHT kg'])
  })

  it('nominates NOTHING on a register whose only figures are money', () => {
    /* 2,238 live parts. Its two candidates are `Sell inc Install`,
       which is money, and the discontinued flag, which reads No on
       every row a catalogue draws. Nothing survives, and nothing is
       what it says. */
    expect(nominated('Parts & Accessories').labels).toEqual([])
  })

  /* -- the refusal that matters ------------------------------- */

  it('refuses every money column, including the one that would have won', () => {
    const { entity, labels, live } = nominated('Highfield Inflatables')
    /* THE COLUMN THIS TEST EXISTS FOR. `Trade` is filled on all 588
       rows and splits them 121 ways — it outscores every winner above
       — and it is the trade price, under a band the cost tests do not
       catch because the band is called `Hull Only Pricing`. */
    const trade = entity.fields.find((f) => f.name === 'Trade')
    expect(trade).toBeDefined()
    expect(trade && isMoney(trade.name, bandOf(entity, trade))).toBe(true)
    expect(labels).not.toContain('Trade')
    expect(labels).not.toContain('Warranty')

    /* stated generally: not one nominated column anywhere on the sheet
       is money, on any table a catalogue draws */
    const { entities, rowsByEntity } = useProjectStore.getState()
    const modules = Object.values(useProjectStore.getState().modules)
    for (const m of modules) {
      for (const t of listedTables(m, entities)) {
        const rows = (rowsByEntity[t.id] ?? []).filter((r) => !isDiscontinued(r))
        const price = priceReadOf(t)
        for (const c of factColumns(t, rows, new Set(price ? [price.field.id] : []))) {
          expect(isMoney(c.label, c.band), `${t.name} · ${c.label}`).toBe(false)
          /* and never the price the tile is already printing */
          expect(c.field.id, `${t.name} · ${c.label}`).not.toBe(price?.field.id)
        }
      }
    }
    expect(live.length).toBeGreaterThan(0)
  })

  it('never offers more than a face can hold', () => {
    const { entities, rowsByEntity } = sheet()
    for (const t of Object.values(entities)) {
      const rows = rowsByEntity[t.id] ?? []
      expect(factColumns(t, rows).length, t.name).toBeLessThanOrEqual(FACTS_PER_TILE)
    }
  })

  it('carries the figures onto the entries the index draws, and the provenance with them', () => {
    const { entities, rowsByEntity } = sheet()
    const highfield = tableNamed(entities, 'Highfield Inflatables')
    const entries = buildEntries([highfield], rowsByEntity)
    const first = entries[0]
    expect(first.facts?.map((f) => f.label)).toEqual([
      'OA Length',
      'Int Length cm',
      'Boat Weight kg',
    ])
    /* the workbook cell each figure was read out of, so a number on a
       customer-facing tile can always be traced back to its column */
    expect(first.facts?.[0].say).toContain('Boat Module!')
    /* and the caller that only wants a head-count pays for none of it */
    expect(buildEntries([highfield], rowsByEntity, { facts: false })[0].facts).toBeUndefined()
  })

  /* -- what it costs ------------------------------------------ */

  it('stays cheap on the two biggest tables on the sheet', () => {
    const { entities, rowsByEntity } = sheet()
    const parts = tableNamed(entities, 'Parts & Accessories')
    const highfield = tableNamed(entities, 'Highfield Inflatables')

    /* 2,937 rows and 588 rows, both built WITH the facts. The budget
       is deliberately loose — this asserts an order of magnitude, not
       a stopwatch reading on somebody's CI box. Measured locally:
       Parts 2.9 ms, Highfield 3.5 ms. */
    for (const t of [parts, highfield]) {
      const at = performance.now()
      const built = buildEntries([t], rowsByEntity)
      const took = performance.now() - at
      expect(built.length, t.name).toBeGreaterThan(0)
      expect(took, `${t.name} took ${took.toFixed(1)}ms`).toBeLessThan(250)
    }
  })
})
