/* ============================================================
   THE FACET RAIL, MEASURED — against the whole price file, and
   against the one thing it must never be caught doing.

   WHAT THIS GUARDS, and each one is a way the catalogue could lie:

     1 · NOTHING IS INVENTED. Every facet names a column that is on
         that table, and every value it offers is a string some row
         of that table actually holds. A filter for something the
         file does not record is the failure this price file's owner
         is angriest about, and a facet rail is the easiest place in
         the app to commit it.
     2 · A KEY IS NOT A FACET. `Model Code`, `Source` and the
         display column hold one value per row; offering 588 chips
         is a register with rounded corners.
     3 · THE ENVELOPE IS TWO REAL COLUMNS. `Min HP`/`Max HP`, read
         where the business typed the unit in and where it did not,
         because Highfield writes `4 HP` and Stacer writes `4`.
     4 · THE PRICE IS THE ONE THE BUSINESS DECLARED — the table's
         own price level, never a numeric column that looks like
         money.
     5 · IT SURVIVES EVERY TABLE IN THE SEED, including the ones
         with no photographs, no hierarchy and no price at all.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import type { EntityDef } from '@/types/model'
import { applyView, leadingNumber, type ViewRow } from './core'
import { cellText, valueForField } from './helpers'
import { readFacets, bandWords, type Facet } from './facets'

const seed = buildNorthsideProject()
const entities = Object.fromEntries(seed.entities.map((e) => [e.id, e]))

/** The same text the register filters and sorts on — `buildViewRows`
 *  without React. Reference labels are not resolved here, which is why
 *  the assertions below never reach for a reference column. */
function viewRowsOf(entity: EntityDef): ViewRow[] {
  const rows = seed.rowsByEntity[entity.id] ?? []
  return rows.map((r) => {
    const text: Record<string, string> = {}
    for (const f of entity.fields) {
      text[f.id] = cellText(valueForField(r, f, r.values), f, undefined)
    }
    return { rowId: r.id, values: r.values, text }
  })
}

const named = (name: string): EntityDef => {
  const found = seed.entities.find((e) => e.name === name)
  if (!found) throw new Error(`the seed no longer carries ${name}`)
  return found
}

const facetsOf = (name: string): Facet[] => {
  const e = named(name)
  return readFacets(e, viewRowsOf(e))
}

const labels = (fs: Facet[]): string[] => fs.map((f) => f.label)

describe('1 · nothing is invented', () => {
  it('every facet names a column of the table it was read from', () => {
    for (const entity of seed.entities) {
      const rows = viewRowsOf(entity)
      const ids = new Set(entity.fields.map((f) => f.id))
      for (const facet of readFacets(entity, rows)) {
        if (facet.kind === 'envelope') {
          expect(ids.has(facet.minFieldId), `${entity.name} · ${facet.label}`).toBe(true)
          expect(ids.has(facet.maxFieldId), `${entity.name} · ${facet.label}`).toBe(true)
        } else {
          expect(ids.has(facet.fieldId), `${entity.name} · ${facet.label}`).toBe(true)
        }
      }
    }
  })

  it('every value offered is one some row of that table holds', () => {
    for (const entity of seed.entities) {
      const rows = viewRowsOf(entity)
      for (const facet of readFacets(entity, rows)) {
        if (facet.kind !== 'values') continue
        const held = new Set(rows.map((r) => r.text[facet.fieldId] ?? ''))
        for (const v of facet.values) {
          expect(held.has(v.value), `${entity.name} · ${facet.label} · ${v.value}`).toBe(true)
          expect(v.value).not.toBe('')
        }
      }
    }
  })

  it('a value count is how many rows hold it, never a guess', () => {
    for (const entity of seed.entities) {
      const rows = viewRowsOf(entity)
      for (const facet of readFacets(entity, rows)) {
        if (facet.kind !== 'values') continue
        for (const v of facet.values) {
          const counted = rows.filter((r) => r.text[facet.fieldId] === v.value).length
          expect(v.count, `${entity.name} · ${v.value}`).toBe(counted)
        }
      }
    }
  })

  it('a band never claims a bound no cell carries', () => {
    for (const entity of seed.entities) {
      const rows = viewRowsOf(entity)
      for (const facet of readFacets(entity, rows)) {
        if (facet.kind !== 'band') continue
        /* every row inside the full band, so the bounds cannot be
           wider than the column */
        const inside = applyView(rows, entity.fields, {
          filters: [
            { kind: 'between', fieldId: facet.fieldId, min: facet.lo, max: facet.hi },
          ],
        })
        const outside = applyView(rows, entity.fields, {
          filters: [{ kind: 'between', fieldId: facet.fieldId, min: facet.hi + 1 }],
        })
        expect(inside.length, `${entity.name} · ${facet.label}`).toBeGreaterThan(0)
        expect(outside.length, `${entity.name} · ${facet.label} above the top`).toBe(0)
      }
    }
  })
})

describe('2 · a key is not a facet', () => {
  it('never offers the columns that hold one value per row', () => {
    for (const entity of seed.entities) {
      const rows = viewRowsOf(entity)
      if (rows.length < 8) continue
      for (const facet of readFacets(entity, rows)) {
        if (facet.kind !== 'values') continue
        const field = entity.fields.find((f) => f.id === facet.fieldId)
        expect(facet.values.length, `${entity.name} · ${field?.name}`).toBeLessThanOrEqual(
          Math.max(2, Math.floor(rows.length / 2)),
        )
      }
    }
  })

  it('Highfield offers Series and refuses Model Code, Boat and Source', () => {
    const fs = facetsOf('Highfield Inflatables')
    expect(labels(fs)).toContain('Series')
    for (const key of ['Model Code', 'Boat', 'Source']) {
      expect(labels(fs)).not.toContain(key)
    }
  })
})

describe('3 · the envelope is two real columns', () => {
  it('reads Highfield, whose bounds are text with the unit typed in', () => {
    const fs = facetsOf('Highfield Inflatables')
    const env = fs.find((f) => f.kind === 'envelope')
    expect(env, 'Highfield states an hp envelope').toBeTruthy()
    if (!env || env.kind !== 'envelope') return
    const e = named('Highfield Inflatables')
    const min = e.fields.find((f) => f.id === env.minFieldId)
    const max = e.fields.find((f) => f.id === env.maxFieldId)
    expect(min?.name).toBe('Min HP')
    expect(max?.name).toBe('Max HP')
    /* `4 HP` is a four, and `450 HP` is the top of the file */
    expect(env.lo).toBe(2)
    expect(env.hi).toBe(450)
  })

  it('reads Stacer, whose identical bounds are numbers', () => {
    const fs = facetsOf('Stacer')
    const env = fs.find((f) => f.kind === 'envelope')
    expect(env?.label).toBe('HP')
  })

  it('offers a hull to somebody fitting a motor inside its envelope', () => {
    const e = named('Highfield Inflatables')
    const rows = viewRowsOf(e)
    const env = readFacets(e, rows).find((f) => f.kind === 'envelope')
    if (!env || env.kind !== 'envelope') throw new Error('no envelope')
    const fits = applyView(rows, e.fields, {
      filters: [
        { kind: 'between', fieldId: env.minFieldId, max: 60 },
        { kind: 'between', fieldId: env.maxFieldId, min: 60 },
      ],
    })
    expect(fits.length).toBeGreaterThan(0)
    expect(fits.length).toBeLessThan(rows.length)
    /* AND EVERY ONE OF THEM REALLY IS RATED FOR IT, read the way the
       filter reads it. `2 x 300 HP` is a twin rig and its leading
       number is 2 — stripping every non-digit instead would make it
       2,300, which is how the first draft of this case failed and is
       exactly the misreading `leadingNumber` exists to prevent. */
    for (const r of fits) {
      const lo = leadingNumber(r.values[env.minFieldId] ?? null)
      const hi = leadingNumber(r.values[env.maxFieldId] ?? null)
      expect(lo, 'a hull with no lower bound is not offered').not.toBeNull()
      expect(hi, 'a hull with no upper bound is not offered').not.toBeNull()
      expect(lo ?? 0).toBeLessThanOrEqual(60)
      expect(hi ?? 0).toBeGreaterThanOrEqual(60)
    }
    /* and the hulls left out really are out of range */
    const outIds = new Set(fits.map((f) => f.rowId))
    for (const r of rows) {
      if (outIds.has(r.rowId)) continue
      const lo = leadingNumber(r.values[env.minFieldId] ?? null)
      const hi = leadingNumber(r.values[env.maxFieldId] ?? null)
      expect(lo === null || hi === null || lo > 60 || hi < 60).toBe(true)
    }
  })
})

describe('4 · the price is the one the business declared', () => {
  it('takes Highfield at Cash and Yamaha at Sell Price', () => {
    const hf = facetsOf('Highfield Inflatables')
    expect(labels(hf)).toContain('Cash')
    const ya = facetsOf('Yamaha Outboards')
    expect(labels(ya)).toContain('Sell Price')
  })

  it('never offers a cost column as the price band', () => {
    for (const entity of seed.entities) {
      const rows = viewRowsOf(entity)
      for (const facet of readFacets(entity, rows)) {
        if (facet.kind !== 'band' || !facet.money) continue
        expect(facet.label, entity.name).not.toMatch(/\bCTD\b|Landed|Base Cost|Freight/i)
      }
    }
  })
})

describe('5 · it survives every table in the seed', () => {
  it('reads a rail for every table and never throws', () => {
    for (const entity of seed.entities) {
      expect(() => readFacets(entity, viewRowsOf(entity))).not.toThrow()
    }
  })

  it('gives the brands the rail PHASE_TWO asks for — series, length, hp, price', () => {
    const fs = facetsOf('Highfield Inflatables')
    expect(labels(fs)).toEqual(expect.arrayContaining(['Series', 'HP', 'OA Length', 'Cash']))
  })

  it('answers nothing for a table with no rows', () => {
    expect(readFacets(named('Highfield Inflatables'), [])).toEqual([])
    expect(readFacets(undefined, [])).toEqual([])
  })

  it('holds the rail to eight controls at most, on every table', () => {
    for (const entity of seed.entities) {
      const fs = readFacets(entity, viewRowsOf(entity))
      expect(fs.length, entity.name).toBeLessThanOrEqual(8)
    }
  })
})

describe('the words a band says', () => {
  const plain = (n: number): string => String(n)
  it('says both bounds, one bound, or neither — never "undefined"', () => {
    expect(bandWords(2, 6, plain)).toBe('2–6')
    expect(bandWords(6, 6, plain)).toBe('6')
    expect(bandWords(2, undefined, plain)).toBe('2 and up')
    expect(bandWords(undefined, 6, plain)).toBe('up to 6')
    expect(bandWords(undefined, undefined, plain)).toBe('any')
  })
})

/* the entity map is built above so a future case can reach a target
   table by id; naming it keeps that reachable rather than mysterious */
export const seedEntities = entities
