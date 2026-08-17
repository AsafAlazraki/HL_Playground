/* ============================================================
   REGISTRATION — the theme, checked against the real seed.

   THE POINT OF THESE TESTS is that the registration surface prints
   COUNTS, and a count on screen is a claim. Each of these walks the
   actual Northside tables — not a fixture — so the number the pane
   draws is the number this file asserted.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import type { EntityDef, RowData } from '@/types/model'
import {
  BOAT_KEY_COLUMN,
  REGISTRATION_POLICY,
  TRAILER_KEY_COLUMN,
  TRAILER_MASS_BANDS,
  atmBandDisagreements,
  feeForBand,
  findFeeRegister,
  massBandFor,
  registrationKeys,
} from './registration'

function project(): {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
} {
  const p = buildNorthsideProject()
  const entities: Record<string, EntityDef> = {}
  for (const e of p.entities) entities[e.id] = e
  return { entities, rowsByEntity: p.rowsByEntity }
}

describe('the fee register', () => {
  it('is one table, found by its Band column', () => {
    const { entities, rowsByEntity } = project()
    const register = findFeeRegister(entities, rowsByEntity)
    expect(register).toBeDefined()
    expect(register?.table.name).toBe('Registration Costs')
    /* 19 fees, and the whole of them — SERVICE_AND_THEMES.md §4. */
    expect(register?.rows.length).toBe(19)
    expect(register?.ctd).toBeDefined()
    expect(register?.sell).toBeDefined()
  })

  it('reads a fee at the rung the caller names, and defaults to neither', () => {
    const { entities, rowsByEntity } = project()
    const register = findFeeRegister(entities, rowsByEntity)
    expect(register).toBeDefined()
    if (!register) return

    /* The worked boat: Managers View!K34 reads ordinal 8 = J CTD =
       414.00 for band '6.01m to 10.00m' (SERVICE_AND_THEMES.md §2.4). */
    const ctd = feeForBand(register, '6.01m to 10.00m', 'ctd')
    expect(ctd?.amount).toBe(414)
    expect(ctd?.label).toBe('3rd Party Recovery')
    expect(ctd?.sourceNote).toContain('Registration Costs!')

    /* The 81-cent divergence, made visible rather than resolved:
       Trailer Module!BZ reads ordinal 9 = K SELL = 283.00 while
       Managers View!G23 reads J CTD = 282.19 for the same trailer on
       the same deal (§6.2 Q1). Both are readable here; neither is a
       default. */
    const trailerSell = feeForBand(register, 'Large Trailers - Over 1.021t', 'sell')
    const trailerCtd = feeForBand(register, 'Large Trailers - Over 1.021t', 'ctd')
    expect(trailerSell?.amount).toBe(283)
    expect(trailerCtd?.amount).toBe(282.19)
    expect((trailerSell?.amount ?? 0) - (trailerCtd?.amount ?? 0)).toBeCloseTo(0.81, 2)
  })

  it('returns nothing for a band the table does not carry, never zero', () => {
    const { entities, rowsByEntity } = project()
    const register = findFeeRegister(entities, rowsByEntity)
    expect(register).toBeDefined()
    if (!register) return
    expect(feeForBand(register, 'A band nobody wrote', 'ctd')).toBeUndefined()

    /* But a CATALOGUED DECLINE is a real row and really costs nothing —
       theme 7's "not required is a value, not a row". */
    expect(feeForBand(register, 'Boat Registration Not Required', 'ctd')?.amount).toBe(0)
  })
})

describe('one concept, two subjects', () => {
  it('keys the boat half and the trailer half the same way', () => {
    const { entities } = project()
    const keys = registrationKeys(entities)
    const boats = keys.filter((k) => k.subject === 'boat')
    const trailers = keys.filter((k) => k.subject === 'trailer')

    /* Seven boat tables and seven live trailer tables carry the key,
       plus the retired obsolete-trailer table, which keeps its columns
       so an old quote still resolves. */
    expect(boats.length).toBe(7)
    expect(trailers.length).toBeGreaterThanOrEqual(7)
    expect(boats.every((k) => k.field.name === BOAT_KEY_COLUMN)).toBe(true)
    expect(trailers.every((k) => k.field.name === TRAILER_KEY_COLUMN)).toBe(true)
  })

  it('puts both halves in the same section, spelled the same way', () => {
    const { entities } = project()
    for (const key of registrationKeys(entities)) {
      expect(key.field.sectionId).toBe('registration')
    }
  })
})

describe('the mass bands are READ, not derived', () => {
  it('carries only the bound each label states', () => {
    const small = massBandFor('Small Trailers - Up to 1.02t')
    expect(small?.atMostKg).toBe(1020)
    expect(small?.atLeastKg).toBeUndefined()

    const large = massBandFor('Large Trailers - Over 1.021t')
    expect(large?.atLeastKg).toBe(1021)
    /* NO CEILING. Nothing in the workbook gives Large one, and adding
       one would be deriving the band — the step §3.1 forbids. */
    expect(large?.atMostKg).toBeUndefined()
  })

  it('leaves the catalogued decline with nothing to test', () => {
    const none = massBandFor('Registration - NOT REQUIRED')
    expect(none).toBeDefined()
    expect(none?.atLeastKg).toBeUndefined()
    expect(none?.atMostKg).toBeUndefined()
  })

  it('states where every number was read from', () => {
    for (const band of TRAILER_MASS_BANDS) {
      expect(band.readFrom.length).toBeGreaterThan(10)
    }
  })
})

describe('the ATM check shows and never resolves', () => {
  it('finds the adjudicated rows that are in this seed', () => {
    const { entities, rowsByEntity } = project()
    const check = atmBandDisagreements(entities, rowsByEntity)

    /* MPF_GROUND_TRUTH §14 names nine live rows: 60, 61, 224–227, 398,
       401, 403. This seed carries a subset of the 476-row sheet, so the
       check finds the ones that were seeded — and every one it finds
       must be one of the nine. That is the reconciliation: a tenth row
       would mean this file is testing something the adjudication did
       not. */
    const adjudicated = new Set([60, 61, 224, 225, 226, 227, 398, 401, 403])
    expect(check.disagreements.length).toBeGreaterThan(0)
    for (const d of check.disagreements) {
      const row = Number(/!R(\d+)$/.exec(d.source)?.[1] ?? NaN)
      expect(adjudicated.has(row)).toBe(true)
    }
  })

  it('tests every trailer that has a bounded band and an ATM', () => {
    const { entities, rowsByEntity } = project()
    const check = atmBandDisagreements(entities, rowsByEntity)
    expect(check.tested).toBeGreaterThan(100)
    /* Nothing may be silently passed: a band whose bound nobody has
       read is reported by name, not skipped. */
    expect(check.unrecognisedBands).toEqual([])
  })

  it('says what a disagreement says, in the label’s own words', () => {
    const { entities, rowsByEntity } = project()
    const check = atmBandDisagreements(entities, rowsByEntity)
    for (const d of check.disagreements) {
      expect(d.says).toMatch(/^at (least|most) [\d,]+ kg$/)
      expect(d.readFrom).toContain('Registration Costs!C')
      expect(d.rowLabel.length).toBeGreaterThan(0)
    }
  })
})

describe('the policy', () => {
  it('states four requirements, each with a reason and a receipt', () => {
    expect(REGISTRATION_POLICY.length).toBe(4)
    for (const r of REGISTRATION_POLICY) {
      expect(r.rule.endsWith('.')).toBe(true)
      expect(r.because.length).toBeGreaterThan(20)
      expect(r.source).toMatch(/SERVICE_AND_THEMES\.md/)
    }
  })
})
