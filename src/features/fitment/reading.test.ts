/* ============================================================
   THE FAN-OUT, MEASURED AGAINST THE WHOLE SEED.

   WHAT THIS GUARDS, and each one is a way the screen could lie:

     1 · IT RECONCILES. Every row of every relationship table is
         counted exactly once, as a pairing, as a fact carried on a
         pairing, or as held back. A total that does not add up to
         the sheet is a total nobody can check.
     2 · NOTHING IS COUNTED TWICE. The rigging kit is a reference
         carried ON a motor pairing, not a pairing of its own;
         folding it into the headline would have inflated 8,649 to
         11,935 and the number would have looked authoritative.
     3 · A COUNT SAYS WHAT IT LEFT OUT. `reached + missing` is the
         subject table, exactly, for every relationship.
     4 · HELD BACK IS HELD BACK. The one retired relationship table
         in the seed contributes to no live figure anywhere.
     5 · NOTHING IS INVENTED. Every relationship name a person reads
         is a reference column's own name out of their own data.

   The landmark figures quoted below are the seed's, re-measured
   here rather than copied from a specification: `__origin` is
   'rule' on 305 of the 8,679 relationship rows and 'removed' on 30,
   which is FITMENT_RULES.md §4.4's finding — a dealer's fan-out is
   overwhelmingly typed rather than derived — arriving at whatever
   size the loaded file happens to be.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import { isDiscontinued, isRetired } from '@/types/model'
import { readFanOut, readRoles, subjectKindOf, type FanProject } from './reading'

const seed = buildNorthsideProject()
const project: FanProject = {
  entities: Object.fromEntries(seed.entities.map((e) => [e.id, e])),
  rowsByEntity: seed.rowsByEntity,
}
const reading = readFanOut(project)

describe('what the relationships are hung off', () => {
  it('derives the subject kind rather than being told it', () => {
    expect(subjectKindOf(project)).toBe('boat')
    expect(reading.subjectKind).toBe('boat')
  })

  it('draws one fan per live subject table, largest first', () => {
    const tables = seed.entities.filter(
      (e) => e.role !== 'join' && e.kind === 'boat' && !isRetired(e),
    )
    expect(reading.fans.length).toBe(tables.length)
    const counts = reading.fans.map((f) => f.subjects)
    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
    expect(reading.subjects).toBe(810)
  })
})

describe('the arithmetic reconciles with the sheet', () => {
  it('counts every relationship row exactly once', () => {
    /* Pairings + facts carried on them + held back = every row of
       every relationship table the fans touch. */
    const touched = new Set<string>()
    for (const fan of reading.fans) {
      for (const group of fan.groups) {
        for (const strand of group.strands) touched.add(strand.joinTableId)
      }
    }
    let rows = 0
    for (const id of touched) rows += (seed.rowsByEntity[id] ?? []).length

    expect(reading.pairs + reading.heldBackPairs).toBe(rows)

    /* and every strand reconciles with the table it was read off: a
       'column' strand counts only the filled cells, so the blanks are
       what makes the two sides meet */
    for (const fan of reading.fans) {
      for (const group of fan.groups) {
        for (const strand of group.strands) {
          const held = (seed.rowsByEntity[strand.joinTableId] ?? []).length
          expect(strand.pairs + strand.blank).toBe(held)
        }
      }
    }
  })

  it('never folds a carried fact into the pairing count', () => {
    /* 8,649 live pairings and 3,286 references carried on them. Added
       together they would read 11,935, which is more rows than the
       sheet holds. */
    expect(reading.pairs).toBe(8649)
    expect(reading.carried).toBe(3286)
    for (const fan of reading.fans) {
      const table = fan.groups
        .filter((g) => g.via === 'table')
        .reduce((n, g) => n + g.pairs, 0)
      const column = fan.groups
        .filter((g) => g.via === 'column')
        .reduce((n, g) => n + g.pairs, 0)
      expect(fan.pairs).toBe(table)
      expect(fan.carried).toBe(column)
    }
  })

  it('accounts for every pairing as derived, typed or withdrawn', () => {
    const { derived, typed, withdrawn } = reading.provenance
    expect(derived + typed + withdrawn).toBe(reading.pairs)
    /* the finding: a dealer's fan-out is a stack of decisions, not a
       stack of lookups. 305 of 8,649 came from a formula. */
    expect(derived).toBe(305)
    expect(typed).toBe(8344)
    /* every withdrawn pairing in this seed sits on the retired table,
       so none of them is in a live figure */
    expect(withdrawn).toBe(0)
  })
})

describe('a count says what it left out', () => {
  it('splits every subject table into reached and missing', () => {
    for (const fan of reading.fans) {
      for (const group of fan.groups) {
        if (group.heldBack) continue
        expect(group.reached + group.missing).toBe(fan.subjects)
        expect(group.reached).toBeLessThanOrEqual(fan.subjects)
      }
    }
  })

  it('reports the union across two tables carrying one relationship', () => {
    /* Highfield's trailers hang off two tables, 146 pairings and 51.
       Neither figure answers "how many hulls have a trailer", and the
       answer — 146 of 588 — is the interesting one. */
    const fan = reading.fans.find((f) => f.subjectTableName === 'Highfield Inflatables')
    expect(fan).toBeDefined()
    const trailers = fan?.groups.find((g) => g.role === 'Trailer')
    expect(trailers?.strands.length).toBe(2)
    expect(trailers?.pairs).toBe(197)
    expect(trailers?.reached).toBe(146)
    expect(trailers?.missing).toBe(442)
  })

  it('counts the pairings that name no partner at all', () => {
    /* Haines Signature's nine hulls carry 117 motor pairings and not
       one of them names a rigging kit. A relationship with nothing in
       it must read as an absence, not as a missing row. */
    const fan = reading.fans.find((f) => f.subjectTableName === 'Haines Signature')
    const rigging = fan?.groups.find((g) => g.via === 'column')
    expect(rigging?.pairs).toBe(0)
    expect(rigging?.strands[0]?.blank).toBe(117)
  })
})

describe('history is held back and said out loud', () => {
  it('keeps a retired relationship table out of every live figure', () => {
    const retired = seed.entities.filter((e) => e.role === 'join' && isRetired(e))
    expect(retired.length).toBe(1)
    expect(reading.heldBackPairs).toBe(30)
    expect(reading.heldBackTables).toEqual([retired[0].name])

    const fan = reading.fans.find((f) => f.subjectTableName === 'Surtees')
    const trailers = fan?.groups.find((g) => g.role === 'Trailer')
    expect(trailers?.heldBackPairs).toBe(30)
    /* the live strands only */
    expect(trailers?.pairs).toBe(40)
    expect(trailers?.heldBack).toBe(false)
    expect(trailers?.strands.some((s) => s.heldBack)).toBe(true)
  })

  it('measures a partner catalogue without its discontinued rows', () => {
    for (const fan of reading.fans) {
      for (const group of fan.groups) {
        for (const strand of group.strands) {
          if (strand.heldBack) continue
          const rows = seed.rowsByEntity[strand.partnerTableId] ?? []
          expect(strand.partnerCatalogue).toBe(rows.filter((r) => !isDiscontinued(r)).length)
          expect(strand.partnersUsed).toBeLessThanOrEqual(strand.partnerCatalogue)
        }
      }
    }
  })
})

describe('nothing is invented', () => {
  it('names every relationship with a reference column out of the data', () => {
    const columns = new Set<string>()
    for (const entity of seed.entities) {
      for (const field of entity.fields) {
        if (field.type === 'reference') columns.add(field.name)
      }
    }
    expect(reading.roles.length).toBeGreaterThan(0)
    for (const role of reading.roles) expect(columns.has(role)).toBe(true)
  })

  it('names every partner and every relationship table out of the data', () => {
    const tables = new Set(seed.entities.map((e) => e.name))
    for (const fan of reading.fans) {
      expect(tables.has(fan.subjectTableName)).toBe(true)
      for (const group of fan.groups) {
        for (const strand of group.strands) {
          expect(tables.has(strand.partnerTableName)).toBe(true)
          expect(tables.has(strand.joinTableName)).toBe(true)
        }
      }
    }
  })
})

describe('the asymmetry between subjects is real and countable', () => {
  it('finds relationships some subject tables do not have', () => {
    const roles = readRoles(reading)
    expect(roles.length).toBe(reading.roles.length)
    const withGaps = roles.filter((r) => r.absent.length > 0)
    expect(withGaps.length).toBeGreaterThan(0)

    /* four of the seven boat tables carry no dealer-fit block at all,
       and two take a factory package where the others take a loose
       outboard. That difference is business fact, it is invisible in
       any per-table view, and it falls out of counting. */
    const dealerFit = roles.find((r) => r.role === 'Dealer Fit Package')
    expect(dealerFit?.present.length).toBe(3)
    expect(dealerFit?.absent.length).toBe(4)

    const motor = roles.find((r) => r.role === 'Motor')
    expect(motor?.absent.length).toBe(0)
    const partners = new Set(
      reading.fans.flatMap((f) =>
        (f.groups.find((g) => g.role === 'Motor')?.strands ?? []).map((s) => s.partnerTableName),
      ),
    )
    expect(partners.size).toBe(3)
  })

  it('orders relationships by weight so the biggest reads first', () => {
    const roles = readRoles(reading)
    const pairs = roles.map((r) => r.pairs)
    expect([...pairs].sort((a, b) => b - a)).toEqual(pairs)
  })
})
