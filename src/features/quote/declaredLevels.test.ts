/* ============================================================
   A TABLE THAT DECLARES ITS OWN PRICE LADDER — MODULE_SYSTEM §2
   defect 3.

   Before `EntityDef.priceLevels` existed, `priceLevelsFor` could only
   fall back to `NAMED_LEVELS`: an exact-name allow-list per
   `TableKind`. A dealer whose selling column is called `Retail`
   rather than `Cash` had a table the quote could not price, and
   nothing on any screen said why — a column NAME was part of the
   contract.

   The resolver has always preferred a declaration; the field simply
   did not exist on the type, so nothing could write one. What is
   asserted here is the order, and the one thing a declaration does
   NOT get to do.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef } from '@/types/model'
import { priceLevelsFor } from './pricing'

const ISO = '2026-01-01T00:00:00.000Z'

function boat(over: Partial<EntityDef> = {}): EntityDef {
  return {
    id: 'e-boat',
    name: 'Zeta Hulls',
    accent: 'blue',
    kind: 'boat',
    fields: [
      { id: 'f-name', name: 'Model', type: 'text' },
      { id: 'f-cash', name: 'Cash', type: 'number' },
      { id: 'f-retail', name: 'Retail', type: 'number' },
      { id: 'f-cost', name: 'Landed Hull Cost', type: 'number' },
    ],
    displayFieldId: 'f-name',
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
    ...over,
  }
}

describe('what a quote may read a price from', () => {
  it('falls back to the names this KIND is known to carry, which is how the seeded file works', () => {
    const levels = priceLevelsFor(boat())
    expect(levels.map((l) => l.fieldId)).toContain('f-cash')
  })

  it('NEVER OFFERS A COST COLUMN, whatever it is called', () => {
    expect(priceLevelsFor(boat()).map((l) => l.fieldId)).not.toContain('f-cost')
  })

  it('PREFERS THE TABLE OWN DECLARATION, so a dealer whose column is called Retail can be priced', () => {
    const declared = boat({
      priceLevels: [{ key: 'retail', label: 'Retail', fieldId: 'f-retail', scope: 'quote' }],
    })
    expect(priceLevelsFor(declared).map((l) => l.fieldId)).toEqual(['f-retail'])
  })

  it('REFUSES A DECLARATION THAT POINTS AT A COST COLUMN — the exclusion is by construction', () => {
    const sneaky = boat({
      priceLevels: [
        { key: 'cost', label: 'Landed Hull Cost', fieldId: 'f-cost', scope: 'quote' },
        { key: 'retail', label: 'Retail', fieldId: 'f-retail', scope: 'quote' },
      ],
    })
    const out = priceLevelsFor(sneaky)
    expect(out.map((l) => l.fieldId)).toEqual(['f-retail'])
  })

  it('refuses a declaration pointing at a column that has gone', () => {
    const stale = boat({
      priceLevels: [{ key: 'gone', label: 'Gone', fieldId: 'f-nothere', scope: 'quote' }],
    })
    expect(priceLevelsFor(stale)).toEqual([])
  })

  it('treats an empty declaration as no declaration, and falls back', () => {
    expect(priceLevelsFor(boat({ priceLevels: [] })).map((l) => l.fieldId)).toContain('f-cash')
  })

  it('prices nothing at all for a table of a kind with no known columns and no declaration', () => {
    const odd = boat({ kind: 'custom', fields: [{ id: 'f-x', name: 'Whatever', type: 'number' }] })
    expect(priceLevelsFor(odd)).toEqual([])
  })
})

/* ============================================================
   AND IT TRAVELS.

   A dealer who declares "our selling column is Retail", exports and
   re-imports would otherwise find their table silently unpriced
   again, back on the name-matching fallback — the same failure the
   envelope already learned about quotes, where "Save a copy →
   Everything" carried tables, rows, modules, pages and rules and no
   quotes, under a title that says Everything.
   ============================================================ */

describe('a declared ladder through a round trip', () => {
  it('SURVIVES AN EXPORT AND AN IMPORT', async () => {
    const { validateEnvelope } = await import('@/features/io/envelope')
    const file = {
      kind: 'helmlogic-dynamic-config',
      version: 2,
      meta: { id: 'default', name: 'Northside', exportCount: 1, updatedAt: ISO },
      entities: [
        {
          ...boat({
            priceLevels: [
              { key: 'retail', label: 'Retail', fieldId: 'f-retail', scope: 'quote' },
            ],
          }),
        },
      ],
      groups: [],
      rules: [],
      rowsByEntity: {},
    }
    const out = validateEnvelope(file)
    if (!out.ok) throw new Error('fixture should validate')
    const back = out.data.entities[0]
    expect(back?.priceLevels).toEqual([
      { key: 'retail', label: 'Retail', fieldId: 'f-retail', scope: 'quote' },
    ])
  })

  it('DROPS A MALFORMED RUNG rather than carrying one nothing can resolve', async () => {
    const { validateEnvelope } = await import('@/features/io/envelope')
    const file = {
      kind: 'helmlogic-dynamic-config',
      version: 2,
      meta: { id: 'default', name: 'Northside', exportCount: 1, updatedAt: ISO },
      entities: [
        {
          ...boat({
            priceLevels: [
              /* a scope this app does not have */
              { key: 'odd', label: 'Odd', fieldId: 'f-retail', scope: 'somewhere' },
              /* no column at all */
              { key: 'empty', label: 'Empty', scope: 'quote' },
            ] as never,
          }),
        },
      ],
      groups: [],
      rules: [],
      rowsByEntity: {},
    }
    const out = validateEnvelope(file)
    if (!out.ok) throw new Error('fixture should validate')
    expect(out.data.entities[0]?.priceLevels).toBeUndefined()
  })
})
