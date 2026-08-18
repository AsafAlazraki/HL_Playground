/* ============================================================
   THE SELECTOR, MEASURED ON THE REAL SEED.

   F8 is the strongest finding in the fitment adjudication and the
   reason this file is longer than most: a rule that picks a trailer
   can rot silently. It can rot because someone renames a series
   banner, because a boat table is renamed, because a trailer table
   loses its hierarchy, or because somebody "fixes" the ATM floor by
   promoting it to a filter. Each of those is a green build and a
   wrong answer on a customer's quote.

   So every number below is re-measured from src/demos/northside.ts on
   every run, and the specification's own figure is quoted beside it.

   THE COUNTS AND THE SPECIFICATION'S NOW AGREE, WHICH THEY DID NOT.
   This file used to say "the seed is a curated sample of 145 live
   trailers out of 434, so counts differ and RATES do not". The seed is
   at full scale (SEED_AT_FULL_SCALE.md §2.2): all 434 live trailers,
   all 810 live hulls. So FITMENT_RULES.md's own figures are now
   reproduced rather than approximated — a Highfield hull is left
   12 of 434, which is the 2.76 % the adjudication measured, and the
   per-brand spread is 0.92 %–7.83 %, which is the range it quotes.
   Where a number below differs from the specification's, that is now
   a real disagreement and not a sampling artefact.

   THE THREE THINGS THIS SUITE EXISTS TO PROVE
   ─────────────────────────────────────────────────────────────
     1 · the series banner selects, and it is doing so — 626 of 626
         testable live pairings, and a Highfield hull is left 12 of 434
         trailers rather than the catalogue;
     2 · the ATM floor warns and never filters — the same selection
         comes back with the floor and without it, on all 810 hulls;
     3 · there is no trailer length rule anywhere — asserted against
         the selector's own source text, and against the refutations
         still standing in workbookRules.ts.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'

/* THIS SUITE IS SLOWER THAN THE DEFAULT ALLOWS, ON PURPOSE. Every
   assertion re-measures the selector against the WHOLE seed rather
   than a fixture — 810 live hulls against 434 live trailers — which
   is the only way a silent rot in the rule gets caught. At the
   curated sample that fitted inside vitest's 5s default; at full
   scale (SEED_AT_FULL_SCALE.md) four of the thirty-six do not, and a
   guard that times out is a guard that is switched off. The work is
   legitimately three times bigger, so the allowance grows with it.
   Measured: the slowest is ~10s, so 60s is room, not a mask. */
vi.setConfig({ testTimeout: 60_000 })
import selectorSource from '@/features/constraints/trailerFitment.ts?raw'
import { buildNorthsideProject } from '@/demos/northside'
import { readCell } from '@/types/model'
import type { EntityDef, RowData } from '@/types/model'
import {
  TRAILER_ATM_FLOOR,
  TRAILER_FITMENT,
  loadFieldFor,
  marqueOfSubject,
  marqueVocabulary,
  readCatalogue,
  readMarques,
  selectPartners,
  type FitmentProject,
  type Marque,
} from './trailerFitment'
import { WORKBOOK_RULES, WORKBOOK_RULES_REFUTED } from './workbookRules'

/* ---------------------------------------------------------- */
/* The seed, built once                                        */
/* ---------------------------------------------------------- */

const seed = buildNorthsideProject()
const project: FitmentProject = {
  entities: Object.fromEntries(seed.entities.map((e) => [e.id, e])),
  rowsByEntity: seed.rowsByEntity,
}
const marques: Marque[] = marqueVocabulary(project, TRAILER_FITMENT)
const boatTables = seed.entities.filter((e) => e.kind === 'boat')

const rowById = new Map<string, RowData>()
for (const rows of Object.values(seed.rowsByEntity)) for (const r of rows) rowById.set(r.id, r)

/** Every seeded boat × trailer join, with both sides resolved. */
interface TrailerJoin {
  name: string
  boatTable: EntityDef
  trailerTable: EntityDef
  pairs: Array<{ boatRowId: string; trailerRowId: string; recommended: boolean; order: number }>
}

const trailerJoins: TrailerJoin[] = seed.entities.flatMap((e) => {
  if (e.role !== 'join') return []
  const boatRef = e.fields.find((f) => f.type === 'reference' && f.name === 'Boat')
  const trailerRef = e.fields.find((f) => f.type === 'reference' && f.name === 'Trailer')
  if (!boatRef || !trailerRef) return []
  const boatTable = project.entities[boatRef.refEntityId ?? '']
  const trailerTable = project.entities[trailerRef.refEntityId ?? '']
  if (!boatTable || !trailerTable) return []
  const pairs = (seed.rowsByEntity[e.id] ?? []).flatMap((row) => {
    const boatRowId = String(readCell(row, boatRef.id) ?? '')
    const trailerRowId = String(readCell(row, trailerRef.id) ?? '')
    if (!rowById.has(boatRowId) || !rowById.has(trailerRowId)) return []
    return [
      {
        boatRowId,
        trailerRowId,
        recommended: readCell(row, '__recommended') === true,
        order: Number(readCell(row, '__order') ?? 0),
      },
    ]
  })
  return [{ name: e.name, boatTable, trailerTable, pairs }]
})

/* memoised: the assertions below walk the same hulls several times
   over, and a selection is a pure function of (project, hull, floor) */
const cache = new Map<string, ReturnType<typeof selectPartners>>()
const select = (boatTable: EntityDef, boatRowId: string, floor = false) => {
  const key = `${boatRowId}|${floor}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const result = selectPartners(project, TRAILER_FITMENT, boatTable.id, boatRowId, {
    marques,
    ...(floor ? { floor: TRAILER_ATM_FLOOR } : {}),
  })
  cache.set(key, result)
  return result
}

/* ============================================================
   1 · THE VOCABULARY IS READ, NOT TOLD
   ============================================================ */

describe('the marques come out of the project, not out of a list', () => {
  it('finds exactly the eight brands the adjudication names, and no others', () => {
    /* FITMENT_RULES.md §1.2 lists the per-brand discrimination for
       Highfield, Stacer, Stabicraft, Formosa, Haines, Surtees,
       Cap Camarat and Merry Fisher — eight, and those eight are what
       falls out of the seed's own table names and level values. If a
       ninth ever appears, something has started matching loosely. */
    expect(new Set(marques.map((m) => m.name))).toEqual(
      new Set([
        'Highfield',
        'Stacer',
        'Stabicraft',
        'Surtees',
        'Formosa',
        'Haines',
        'Merry Fisher',
        'Cap Camarat',
      ]),
    )
  })

  it('keeps a marque in the case the business wrote it', () => {
    /* DESIGN_PRINCIPLES.md rule 3: uppercase is a label style, never
       a name style — and lower-case is not a name style either. */
    for (const m of marques) expect(m.name).toMatch(/^[A-Z]/)
  })

  it('reads Merry Fisher and Cap Camarat off the level, not the table', () => {
    /* The seed holds them as RANGES inside one Jeanneau table
       (northside.ts header; FITMENT_RULES.md §5.2 counts them
       separately, Merry Fisher 6 + Cap Camarat 10). A vocabulary that
       only read table names would lose both. */
    const level = marques.filter((m) => m.from === 'level').map((m) => m.name)
    expect(new Set(level)).toEqual(new Set(['Merry Fisher', 'Cap Camarat']))
  })

  it('never lets a word two brands share become a marque', () => {
    const byName = new Map<string, number>()
    for (const m of marques) byName.set(m.name, (byName.get(m.name) ?? 0) + 1)
    for (const [, n] of byName) expect(n).toBe(1)
  })

  it('leaves a hull whose brand no banner names with no marque at all', () => {
    /* Four Jeanneau-badged hulls (DB 37 OB, DB 43 OB, TH33, TH38) sit
       in a table no trailer banner names. "No series in this catalogue
       is built for it" is the workbook's answer, and it is not the
       same as "we do not know" (FITMENT_RULES.md §5.6). */
    const jeanneau = boatTables.find((e) => e.name === 'Jeanneau')
    expect(jeanneau).toBeDefined()
    const none = (seed.rowsByEntity[jeanneau!.id] ?? []).filter(
      (r) => marqueOfSubject(jeanneau!, r, marques) === null,
    )
    expect(none).toHaveLength(4)
    for (const row of none) {
      const result = select(jeanneau!, row.id)
      expect(result?.selected).toHaveLength(0)
    }
  })

  it('quotes the banner verbatim so the derivation can be checked by eye', () => {
    const highfield = marques.find((m) => m.name === 'Highfield')
    /* TWO banners, and the second arrived with the data rather than
       with a code change: "GFAB - Highfield Series" is a real GFAB
       Trailers heading that no seeded Highfield hull could reach while
       Highfield carried 40 of its 588 SKUs. Sorted, so the assertion
       does not depend on table order. */
    expect([...(highfield?.banners ?? [])].sort()).toEqual([
      'GFAB - Highfield Series',
      'REDCO - Highfield',
    ])
    const haines = marques.find((m) => m.name === 'Haines')
    /* Trailer Module!A626 in the workbook; the seed carries its three
       sub-series banners */
    expect(haines?.banners.every((b) => b.includes('HAINES'))).toBe(true)
  })
})

/* ============================================================
   2 · THE SERIES BANNER SELECTS — F8
   ============================================================ */

describe('the series banner is the selector', () => {
  it('holds on every testable live pairing in the seed', () => {
    /* FITMENT_RULES.md F8: 581 of 581 testable live pairings, 0
       counter-examples; independently 615/615 on a wider cut. The seed
       carries the whole live catalogue now, and re-measured here every
       run it is 626 of 626 — the same finding over a slightly wider
       set of pairings than either adjudicated cut, and still not one
       counter-example. */
    let hit = 0
    let testable = 0
    for (const join of trailerJoins) {
      if (join.trailerTable.retired) continue
      for (const pair of join.pairs) {
        const result = select(join.boatTable, pair.boatRowId)
        if (!result) continue
        if (result.unnamed.some((v) => v.rowId === pair.trailerRowId)) continue
        testable += 1
        if (result.selected.some((v) => v.rowId === pair.trailerRowId)) hit += 1
      }
    }
    expect(testable).toBe(626)
    expect(hit).toBe(testable)
  })

  it('holds per brand, at the rate the adjudication measured', () => {
    /* Per-brand 100 % in FITMENT_RULES.md §1.2 — Highfield 197/197,
       Stacer 142/142, Stabicraft 121/121, Surtees 29/29, Formosa
       92/92. At full scale three of those five come back exactly —
       Stacer 142, Surtees 29, Formosa 92 — and Highfield's 197 arrives
       as 146 + 51, because the seed splits that brand's pairings
       across the two trailer tables its hulls actually name. The RATE
       is what has to survive, and it is 100 % on every one. */
    const expected: Record<string, number> = {
      'Highfield × NSM Custom — Trailer Fitment': 146,
      'Stacer × Stacer Trailers — Trailer Fitment': 142,
      'Formosa × NSM Custom — Trailer Fitment': 92,
      'Stabicraft × NSM Custom — Trailer Fitment': 84,
      'Surtees × NSM Custom — Trailer Fitment': 29,
      'Jeanneau × NSM Custom — Trailer Fitment': 16,
      'Highfield × GFAB — Trailer Fitment': 51,
      'Stabicraft × GFAB — Trailer Fitment': 37,
      'Surtees × GFAB — Trailer Fitment': 11,
      'Haines Signature × Dunbier/Haines BMT — Trailer Fitment': 18,
    }
    const measured: Record<string, number> = {}
    for (const join of trailerJoins) {
      if (join.trailerTable.retired) continue
      let hit = 0
      let testable = 0
      for (const pair of join.pairs) {
        const result = select(join.boatTable, pair.boatRowId)
        if (!result || result.unnamed.some((v) => v.rowId === pair.trailerRowId)) continue
        testable += 1
        if (result.selected.some((v) => v.rowId === pair.trailerRowId)) hit += 1
      }
      expect(hit, `${join.name} misses a pairing the workbook makes`).toBe(testable)
      measured[join.name] = hit
    }
    expect(measured).toEqual(expected)
  })

  it('leaves a Highfield hull Highfield trailers, not the catalogue', () => {
    /* THE POINT OF THE WHOLE FILE. F8 leaves 0.92–7.83 % of the 434
       live trailers standing — Highfield 12 of 434 = 2.76 %. The seed
       now carries all 434 and reproduces that figure exactly: 12. */
    const highfield = boatTables.find((e) => e.name.startsWith('Highfield'))
    expect(highfield).toBeDefined()
    const row = (seed.rowsByEntity[highfield!.id] ?? [])[0]
    const result = select(highfield!, row.id)
    expect(result).not.toBeNull()
    expect(result!.catalogue).toBe(434)
    expect(result!.selected).toHaveLength(12)
    expect(result!.rejected).toHaveLength(131)
    expect(result!.unnamed).toHaveLength(291)
    /* both of Highfield's banners, and nothing outside them */
    expect(new Set(result!.selected.map((v) => v.banner))).toEqual(
      new Set(['REDCO - Highfield', 'GFAB - Highfield Series']),
    )
  })

  it('counts the catalogue the panel prints its shares against', () => {
    /* Every figure on TrailerFitmentPanel comes from here, so the
       headline sentence — "N of M trailers name a boat brand in their
       heading" — is under test rather than typed in. */
    const catalogue = readCatalogue(project, TRAILER_FITMENT, marques)
    expect(catalogue.tables).toBe(7)
    /* 434 is the workbook's whole live trailer band; the seed is no
       longer a fraction of it (SEED_AT_FULL_SCALE.md §2.1). */
    expect(catalogue.live).toBe(434)
    expect(catalogue.named).toBe(143)
    expect(catalogue.unnamed).toBe(291)
    expect(catalogue.named + catalogue.unnamed).toBe(catalogue.live)
    expect(catalogue.retiredRows).toBe(10)
    expect(catalogue.retiredTables).toEqual(['OBSOLETE Trailers — No Longer Available'])
    expect(catalogue.discontinued).toBe(0)
  })

  it('leaves every brand a small enough slice to have chosen something', () => {
    /* The tiebreak the adjudication settled §1.2 on: "a gate that
       leaves 97.7 % of the catalogue has not chosen a trailer. A gate
       that leaves 3 % has." Measured on the whole live catalogue: no
       marque's banner leaves more than 7.83 % of the 434 live
       trailers, which is the top of the specification's own
       0.92–7.83 % range — reproduced now rather than approximated.
       The bound is 0.08 rather than the old 0.14 because the seed is
       no longer a sample and there is nothing left to allow for. */
    const readings = readMarques(project, TRAILER_FITMENT, { marques })
    expect(readings).toHaveLength(8)
    for (const r of readings) {
      expect(r.catalogue).toBe(434)
      expect(r.share, `${r.marque.name} leaves too much of the catalogue`).toBeLessThanOrEqual(0.08)
      expect(r.selected, `${r.marque.name} selects nothing`).toBeGreaterThan(0)
    }
  })

  it('rejects on the banner and never on a substring', () => {
    /* Dunbier's SPORT CENTRELINE WIDE SERIES contains the letters of
       Highfield's `Sport` series; Fishing Series contains most of
       Fisher Series. A substring test turns both into brand trailers.
       Nothing outside the eight named series is ever selected. */
    const banners = new Set(marques.flatMap((m) => m.banners))
    for (const boatTable of boatTables) {
      for (const row of seed.rowsByEntity[boatTable.id] ?? []) {
        const result = select(boatTable, row.id)
        for (const v of result?.selected ?? []) expect(banners.has(v.banner)).toBe(true)
      }
    }
  })
})

/* ============================================================
   3 · THE THIRD STATE — a banner that names nobody
   ============================================================ */

describe('a banner that names no brand is not a rejection', () => {
  it('sets aside the ten live pairings the business makes on an unnamed series', () => {
    /* THE NAMED, COUNTABLE EXCEPTION SET. Ten live Stabicraft
       offerings land on `GFAB - Offroad Trailer Series`, whose banner
       names no brand. Rejecting them would reject the business's own
       offer — the A2 failure FITMENT_RULES.md records once and
       refuses to repeat. Not one of them is a standard trailer, which
       is §5.2's finding that no GFAB pair is ever slot 1. */
    let unnamed = 0
    let recommended = 0
    const joins = new Set<string>()
    for (const join of trailerJoins) {
      if (join.trailerTable.retired) continue
      for (const pair of join.pairs) {
        const result = select(join.boatTable, pair.boatRowId)
        if (!result?.unnamed.some((v) => v.rowId === pair.trailerRowId)) continue
        unnamed += 1
        joins.add(join.name)
        if (pair.recommended) recommended += 1
      }
    }
    expect(unnamed).toBe(10)
    expect(recommended).toBe(0)
    expect([...joins]).toEqual(['Stabicraft × GFAB — Trailer Fitment'])
  })

  /* THE BUDGET IS EXPLICIT BECAUSE THE WORK IS REAL, AND NAMED HERE
     RATHER THAN RAISED GLOBALLY. This walks every one of the 810 live
     hulls against all 434 live trailers and asserts on every verdict:
     351,540 verdicts, and the selection is memoised so the cost is
     paid once for the file. It runs in about 3 s alone and over 5 s
     when 45 test files are sharing the machine, which is how it began
     failing on a green assertion. A global testTimeout would hide the
     next slow thing; this says which test is expensive and why. */
  it(
    'never files an unnamed banner as rejected',
    () => {
      for (const boatTable of boatTables) {
        for (const row of seed.rowsByEntity[boatTable.id] ?? []) {
          const result = select(boatTable, row.id)
          for (const v of result?.rejected ?? []) expect(v.bannerMarque).not.toBeNull()
          for (const v of result?.unnamed ?? []) expect(v.bannerMarque).toBeNull()
        }
      }
    },
    20_000,
  )
})

/* ============================================================
   4 · THE DISCONTINUED CONTRACT
   ============================================================ */

describe('retired stock is held back, and said out loud', () => {
  it('never offers a row from the OBSOLETE trailer table', () => {
    const obsolete = seed.entities.find((e) => e.kind === 'trailer' && e.retired)
    expect(obsolete).toBeDefined()
    const obsoleteRows = new Set((seed.rowsByEntity[obsolete!.id] ?? []).map((r) => r.id))
    expect(obsoleteRows.size).toBe(10)

    for (const boatTable of boatTables) {
      for (const row of seed.rowsByEntity[boatTable.id] ?? []) {
        const result = select(boatTable, row.id)
        if (!result) continue
        for (const v of [...result.selected, ...result.unnamed, ...result.rejected]) {
          expect(obsoleteRows.has(v.rowId)).toBe(false)
        }
      }
    }
  })

  it('counts what it held back and names the table', () => {
    /* "A block that would have drawn eight and draws six must not
       simply read six" — features/views/sellable.ts. */
    const surtees = boatTables.find((e) => e.name === 'Surtees')
    const row = (seed.rowsByEntity[surtees!.id] ?? [])[0]
    const result = select(surtees!, row.id)
    expect(result!.heldBack.retiredRows).toBe(10)
    expect(result!.heldBack.retiredTables).toEqual(['OBSOLETE Trailers — No Longer Available'])
  })

  it('leaves the 30 obsolete pairings out of the hit rate rather than failing on them', () => {
    /* FITMENT_RULES.md §5.2: every live pairing pointing below
       Trailer Module!A656 is Surtees — 30 of them, 8 in the standard
       slot. They are imported, marked, and never offered. */
    const join = trailerJoins.find((j) => j.trailerTable.retired)
    expect(join?.pairs).toHaveLength(30)
    expect(join?.pairs.filter((p) => p.recommended)).toHaveLength(8)
  })
})

/* ============================================================
   5 · THE ATM FLOOR WARNS — F9, and never filters
   ============================================================ */

describe('the ATM floor is a floor', () => {
  it('changes nothing about what is selected', () => {
    /* THE A2 FAILURE, GUARDED. F9 is admitted on the condition that
       it never filters. This runs the whole selection twice — with
       the floor and without it — on all 174 hulls and requires the
       same list both times. */
    let hulls = 0
    for (const boatTable of boatTables) {
      for (const row of seed.rowsByEntity[boatTable.id] ?? []) {
        hulls += 1
        const withFloor = select(boatTable, row.id, true)
        const without = select(boatTable, row.id, false)
        expect(withFloor!.selected.map((v) => v.rowId)).toEqual(
          without!.selected.map((v) => v.rowId),
        )
        expect(withFloor!.rejected).toHaveLength(without!.rejected.length)
        expect(withFloor!.unnamed).toHaveLength(without!.unnamed.length)
      }
    }
    expect(hulls).toBe(810)
  })

  it('is never broken by a pairing the business actually makes', () => {
    /* FITMENT_RULES.md F9: 530 of 530 live pairings hold = 100.00 %.
       Measured on the full-scale seed: 351 of 351 evaluable pairings,
       still 100 %. It is under 530 because a pairing is evaluable only
       where the boat band has a weight-headed column, and Jeanneau,
       Merry Fisher, Cap Camarat and Haines Signature have none. */
    let clears = 0
    let evaluable = 0
    for (const join of trailerJoins) {
      if (join.trailerTable.retired) continue
      for (const pair of join.pairs) {
        const result = select(join.boatTable, pair.boatRowId, true)
        const verdict = [
          ...(result?.selected ?? []),
          ...(result?.unnamed ?? []),
          ...(result?.rejected ?? []),
        ].find((v) => v.rowId === pair.trailerRowId)
        if (!verdict || verdict.floor.kind === 'not-evaluable') continue
        evaluable += 1
        if (verdict.floor.kind === 'clears') clears += 1
      }
    }
    expect(evaluable).toBe(351)
    expect(clears).toBe(evaluable)
  })

  it('selects nothing, which is why it is not the trailer rule', () => {
    /* The tiebreak, both halves in one place. The floor leaves a mean
       94.23 % of the catalogue standing; the banner leaves at most
       7.83 %. FITMENT_RULES.md measures the same two numbers on the
       workbook at 97.70 % and 0.92–7.83 % — the second is now exact
       and the first is close, over the same 434 trailers. A gate that
       leaves nineteen trailers in twenty has not chosen one. */
    let evaluable = 0
    let total = 0
    let maxBanner = 0
    for (const boatTable of boatTables) {
      for (const row of seed.rowsByEntity[boatTable.id] ?? []) {
        const result = select(boatTable, row.id, true)!
        if (result.catalogue > 0) {
          maxBanner = Math.max(maxBanner, result.selected.length / result.catalogue)
        }
        if (result.floorNotEvaluable) continue
        const all = [...result.selected, ...result.unnamed, ...result.rejected]
        evaluable += 1
        total += all.filter((v) => v.floor.kind === 'clears').length / all.length
      }
    }
    expect(evaluable).toBe(643)
    expect(total / evaluable).toBeGreaterThan(0.8)
    expect(maxBanner).toBeLessThanOrEqual(0.08)
  })

  it('says "not evaluable here" for the bands with no weight column', () => {
    /* FITMENT_RULES.md F9: Jeanneau, Merry Fisher, Cap Camarat and
       Haines Signature have no weight-headed column in the band at
       all. Silently passing them would be the worse failure. */
    for (const name of ['Jeanneau', 'Haines Signature']) {
      const table = boatTables.find((e) => e.name === name)!
      expect(loadFieldFor(table, TRAILER_ATM_FLOOR)).toBeNull()
      const row = (seed.rowsByEntity[table.id] ?? [])[0]
      const result = select(table, row.id, true)!
      expect(result.floorNotEvaluable).toContain(name)
      expect(result.floorWarnings).toHaveLength(0)
    }
  })

  it('reads each band its own weight column and never Max Load', () => {
    /* THE TRAP, GUARDED. Comparing a FIXED COLUMN LETTER also scores
       100 % — because Highfield's P is Max Load and Merry Fisher's P
       is Water Capacity. And Max Load is an afloat payload: the rule
       built on it rejects the dealer's own standard cradle on 51 rows
       (WORKBOOK_RULES_REFUTED, 73/139 = 52.5 %). */
    const expected: Record<string, string | null> = {
      Stacer: 'BMT Weight (Dry) kg',
      Stabicraft: 'Tow Weight @ (Dry) kg',
      Surtees: 'App. Tow Weight kg',
      'Highfield Inflatables': 'Boat Weight kg',
      Formosa: 'Hull Weight (Dry) kg',
      Jeanneau: null,
      'Haines Signature': null,
    }
    for (const table of boatTables) {
      expect(loadFieldFor(table, TRAILER_ATM_FLOOR)?.name ?? null, table.name).toBe(
        expected[table.name],
      )
    }
    expect(TRAILER_ATM_FLOOR.mass).not.toContain('Max Load kg')
  })

  it('runs on nothing at all when no load column has been named', () => {
    const table = boatTables[0]
    const row = (seed.rowsByEntity[table.id] ?? [])[0]
    const result = select(table, row.id, false)!
    expect(result.floorNotEvaluable).toBeTruthy()
    expect(result.floorWarnings).toHaveLength(0)
  })
})

/* ============================================================
   6 · THE THREE REGIMES — R11, not flattened
   ============================================================ */

describe('the three regimes are read separately', () => {
  const readings = readMarques(project, TRAILER_FITMENT, { marques, floor: TRAILER_ATM_FLOOR })
  const of = (name: string) => readings.find((r) => r.marque.name === name)!

  it('corroborates model-locked wherever the designator can be read', () => {
    /* R11 ASSERTS model-locked for Highfield, Formosa, Stabicraft,
       Haines, Merry Fisher and Cap Camarat. Five of the six are
       reproduced from the data. */
    expect(of('Stabicraft').hullsNamingModel).toBe(37)
    expect(of('Formosa').hullsNamingModel).toBe(39)
    expect(of('Haines').hullsNamingModel).toBe(9)
    expect(of('Surtees').hullsNamingModel).toBe(19)
    /* Stabicraft, Formosa, Haines and Surtees are now EVERY hull in
       the brand — 37 of 37, 39 of 39, 9 of 9, 19 of 19 — which is what
       model-locked ought to look like once a sample stops hiding it.
       Highfield reads 81 of 588 and that one is worth stating plainly:
       the designator is read where a hull's model token appears in a
       trailer name, and most of Highfield's SKUs are colourway and
       material variants whose token does not. It is recorded at what
       it measures, because raising it would mean loosening the token
       test until it agreed. */
    expect(of('Highfield').hullsNamingModel).toBe(81)
    expect(of('Merry Fisher').hullsNamingModel).toBe(5)
  })

  it('reproduces size-selected for Stacer, and only for Stacer', () => {
    /* R11 OBSERVES it: 0 of 148 Stacer trailer names mention Stacer;
       the stock is picked against ATM and a size band. Stacer is the
       one brand whose hulls are offered a full series and never find
       their own model in it. */
    expect(of('Stacer').hulls).toBe(91)
    expect(of('Stacer').hullsNamingModel).toBe(0)
    const zero = readings.filter((r) => r.hulls > 0 && r.hullsNamingModel === 0)
    expect(zero.map((r) => r.marque.name).sort()).toEqual(['Cap Camarat', 'Stacer'])
  })

  it('records Cap Camarat as unread rather than calling it size-selected', () => {
    /* R11 asserts Cap Camarat is model-locked and the reading here is
       0 of 11, because its models are `5.5` / `6.5` / `7.5` and its
       trailers are `CC5.5` / `CC6.5` — a two-character designator
       inside another token. Lowering the token floor until it passes
       would be fitting the rule to the answer. The number is asserted
       so that a change to it is visible rather than silent, and the
       engine returns a MEASUREMENT rather than a regime label, so
       nothing on screen claims Cap Camarat is size-selected. */
    expect(of('Cap Camarat').hulls).toBe(11)
    expect(of('Cap Camarat').hullsNamingModel).toBe(0)
  })

  it('finds package-only exactly where R11 asserts it', () => {
    /* R11 ASSERTED: Trailer Module!D Supplier reads
       "Haines / Dunbier BMT Packages Only" on 18 of 18. Read here as
       a column constant across the whole trailer table whose value
       names the marque — and exactly one of the eight trailer tables
       qualifies. */
    expect(of('Haines').channel).toEqual({
      column: 'Supplier',
      value: 'Haines / Dunbier BMT Packages Only',
    })
    expect(readings.filter((r) => r.channel !== null).map((r) => r.marque.name)).toEqual(['Haines'])
  })
})

/* ============================================================
   7 · THERE IS NO LENGTH RULE
   ============================================================ */

describe('no trailer length rule exists', () => {
  /* comments stripped, so a column named only to record that it is
     REFUTED does not read as a column the selector uses */
  const code = selectorSource.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')

  it('never names a dimension column anywhere in the selector', () => {
    /* FITMENT_RULES.md F10: "THERE IS NO TRAILER LENGTH RULE. DO NOT
       WRITE ONE." Boat Size ≥ hull length measures 9.4 %; Boat Size
       band contains hull length 50.0 % on a quarter of the data;
       Between Guards ≥ beam 0.0 %. F11: Between Guards is populated
       on 74 of 476 rows and Trailer Length on 75.

       This reads the selector's own source. The three column names
       may appear in a comment saying they are refuted — they may not
       appear in code. */
    for (const column of ['Boat Size', 'Trailer Length', 'Between Guards']) {
      expect(code, `the selector reads ${column}`).not.toContain(column)
    }
  })

  it('never compares a length or a beam', () => {
    for (const word of ['hull length', 'beam', 'Mtr', 'metre']) {
      expect(code.toLowerCase(), `the selector mentions ${word}`).not.toContain(word.toLowerCase())
    }
  })

  it('keeps the four refutations, with their numbers, where the next reader will find them', () => {
    /* A refutation with a number on it is a finding; the absence of
       one is an invitation to guess again. */
    const trailerRefutations = WORKBOOK_RULES_REFUTED.filter((r) =>
      /trailer|Between Guards|Boat Size/i.test(`${r.candidate} ${r.source}`),
    )
    expect(trailerRefutations.length).toBeGreaterThanOrEqual(4)
    for (const r of trailerRefutations) expect(r.measured).toMatch(/\d/)
    const ids = new Set(WORKBOOK_RULES.map((s) => s.id))
    for (const r of WORKBOOK_RULES_REFUTED) expect(ids.has(r.candidate)).toBe(false)
  })

  it('leaves the length candidates out of the floor spec', () => {
    expect(TRAILER_ATM_FLOOR.capacity).toBe('ATM (KG)')
    for (const name of TRAILER_ATM_FLOOR.mass) {
      expect(name).not.toMatch(/length|guards|size/i)
    }
  })

  it('gives the same answer with every dimension column emptied', () => {
    /* THE BEHAVIOURAL HALF. The source scan proves nobody wrote the
       words; this proves the answer does not move. Every trailer's
       Boat Size, Trailer Length and Between Guards is blanked and the
       whole selection re-run: the three buckets must come back
       identical for all 174 hulls.

       `namesModel` is deliberately NOT compared — the regime reading
       scans every text cell of a trailer row and the Dunbier / Haines
       BMT band keeps its boat model in `Boat Size`, so emptying it
       legitimately changes that reading. What may not change is what
       is OFFERED. */
    const blanked: FitmentProject = {
      entities: project.entities,
      rowsByEntity: Object.fromEntries(
        Object.entries(project.rowsByEntity).map(([entityId, rows]) => {
          const table = project.entities[entityId]
          if (!table || table.kind !== 'trailer') return [entityId, rows]
          const dimensions = table.fields
            .filter((f) => /boat size|trailer length|between guards/i.test(f.name))
            .map((f) => f.id)
          expect(dimensions.length, `${table.name} carries no dimension column`).toBeGreaterThan(0)
          return [
            entityId,
            rows.map((row) => ({
              ...row,
              values: Object.fromEntries(
                Object.entries(row.values).filter(([fieldId]) => !dimensions.includes(fieldId)),
              ),
            })),
          ]
        }),
      ),
    }

    for (const boatTable of boatTables) {
      for (const row of seed.rowsByEntity[boatTable.id] ?? []) {
        const before = select(boatTable, row.id, true)!
        const after = selectPartners(blanked, TRAILER_FITMENT, boatTable.id, row.id, {
          marques,
          floor: TRAILER_ATM_FLOOR,
        })!
        expect(after.selected.map((v) => v.rowId)).toEqual(before.selected.map((v) => v.rowId))
        expect(after.rejected.map((v) => v.rowId)).toEqual(before.rejected.map((v) => v.rowId))
        expect(after.unnamed.map((v) => v.rowId)).toEqual(before.unnamed.map((v) => v.rowId))
        expect(after.floorWarnings.map((v) => v.rowId)).toEqual(
          before.floorWarnings.map((v) => v.rowId),
        )
      }
    }
  })
})

/* ============================================================
   8 · SOMEBODY ELSE'S SHEET
   ============================================================ */

describe('a project this rule has nothing to say about', () => {
  /* THE PANEL DRAWS NOTHING WHEN THERE IS NOTHING TO SAY, and it
     decides that from these three functions. A throw here is a white
     screen over the whole Business rules pane on a blank sheet or a
     non-marine dealer's import, which neither tsc nor the build can
     see. */
  const empty: FitmentProject = { entities: {}, rowsByEntity: {} }

  it('finds no marque on an empty sheet and does not throw', () => {
    expect(marqueVocabulary(empty, TRAILER_FITMENT)).toEqual([])
    expect(readMarques(empty, TRAILER_FITMENT)).toEqual([])
    expect(readCatalogue(empty, TRAILER_FITMENT)).toEqual({
      tables: 0,
      live: 0,
      named: 0,
      unnamed: 0,
      retiredRows: 0,
      retiredTables: [],
      discontinued: 0,
    })
  })

  it('returns null rather than guessing when the row or table is not there', () => {
    expect(selectPartners(empty, TRAILER_FITMENT, 'nope', 'nope')).toBeNull()
    const table = boatTables[0]
    expect(selectPartners(project, TRAILER_FITMENT, table.id, 'not-a-row')).toBeNull()
    /* a table of the wrong kind is not a subject, however many rows it has */
    const trailer = seed.entities.find((e) => e.kind === 'trailer')!
    const row = (seed.rowsByEntity[trailer.id] ?? [])[0]
    expect(selectPartners(project, TRAILER_FITMENT, trailer.id, row.id)).toBeNull()
  })

  it('finds no marque when the partner tables have no banner level', () => {
    /* A trailer table with no hierarchy has no series heading, and a
       rule about series headings has nothing to read. */
    const flat: FitmentProject = {
      entities: Object.fromEntries(
        Object.entries(project.entities).map(([id, e]) => [
          id,
          e.kind === 'trailer' ? { ...e, hierarchy: [] } : e,
        ]),
      ),
      rowsByEntity: project.rowsByEntity,
    }
    expect(marqueVocabulary(flat, TRAILER_FITMENT)).toEqual([])
    const table = boatTables[0]
    const row = (seed.rowsByEntity[table.id] ?? [])[0]
    const result = selectPartners(flat, TRAILER_FITMENT, table.id, row.id)!
    expect(result.selected).toHaveLength(0)
    expect(result.rejected).toHaveLength(0)
    expect(result.unnamed).toHaveLength(434)
  })
})

/* ============================================================
   9 · THE RULES THIS ANSWERS ARE STILL THE RULES IT CITES
   ============================================================ */

describe('the seeds this selector runs stay honest about it', () => {
  it('points F8 and F9 at the surface that runs them', () => {
    for (const ref of ['F8', 'F9']) {
      const seedRule = WORKBOOK_RULES.find((s) => s.ref === ref)
      expect(seedRule, `${ref} has gone from WORKBOOK_RULES`).toBeDefined()
      expect(seedRule!.enforcedIn, `${ref} runs but says nothing about where`).toBeTruthy()
      /* still blocked as a SENTENCE — the columns §6.4 asks for do not
         exist, and nothing here pretends they do */
      expect(seedRule!.blocked).toBeTruthy()
      expect(seedRule!.plainly).toBeTruthy()
    }
  })
})
