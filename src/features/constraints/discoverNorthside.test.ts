/* ============================================================
   DOES IT REDISCOVER WHAT A CAREFUL HUMAN FOUND IN THE SAME FILE?

   This is the acceptance test, and it is a strong one on purpose.
   The sixteen rules in `workbookRules.ts` and the settlements in
   `docs/specs/FITMENT_RULES.md` were reached by hand, over weeks, by
   somebody with the workbooks open. If an engine pointed at the same
   data cannot find the same things, it is not ready — and the way to
   find that out is to write the human's own figures down here and
   check the machine against them.

   THE FIVE THINGS THIS SUITE EXISTS TO PROVE, each quoted from the
   adjudication it comes from:

     1 · IT FINDS THE SERIES BANNER. §1.2 — "581 / 581 = 100.00 %,
         0 counter-examples", leaving "0.92 % – 7.83 %" of the 434
         live trailers by brand. This is the one rule in the file that
         actually picks something, and the engine must rank it as
         such rather than bury it.
     2 · IT FINDS THE ATM BOUND AND CALLS IT A FLOOR. §1.2 —
         "530 / 530 = 100.00 %", leaving "mean 97.70 %". Same rate as
         the banner, opposite worth. A 100 % rule that is not a filter
         is the single most important thing this engine encodes.
     3 · IT FINDS THE DISPLAY NAME AS THE TRAILER'S KEY, AND NOT THE
         CODE. §1.3 — name 474 distinct over 476 rows, code 459 with
         thirteen duplicates named (`SRW5.7M-13TB` ×4, `AS5.7M-13TB`
         ×4, `TA800T-EH1` ×2).
     4 · IT DOES NOT PROPOSE A TRAILER LENGTH RULE. F10 and F11 —
         9.4 %, 50.0 % and 0.0 % over `Boat Size (Mtr)`,
         `Trailer Length` and `Between Guards`.
     5 · IT DOES NOT PROPOSE (boat, motor) UNIQUENESS. §1.4 — a
         unique constraint "deletes 641 live rows", and the engine
         must say how many, by name.

   WHERE THE ENGINE DISAGREES WITH THE ADJUDICATION, THE DISAGREEMENT
   IS ASSERTED AS A DISAGREEMENT rather than tuned away. Three of them
   are real and each has a cause written beside it below: the seed
   carries 444 trailer rows where the workbook has 476, factory
   packages are their own KIND here rather than rows of the Motor
   Library, and the engine's dependency measure is a modal-value one
   where §1.1's was a list-membership one. Numbers that differ for a
   stated reason are findings. Numbers tuned until they match are not.

   THIS SUITE IS SLOWER THAN VITEST'S DEFAULT ALLOWS, for the same
   reason `trailerFitment.test.ts` is: every figure is re-measured
   from `src/demos/northside.ts` on every run — 53 tables, 11,116
   rows, 14,911 live pairings — because a rule that rots silently is
   a green build and a wrong answer on a customer's quote.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'

vi.setConfig({ testTimeout: 60_000 })

import { buildNorthsideProject } from '@/demos/northside'
import { WARNING_RATE, THRESHOLDS, discover, type Candidate, type DiscoveryReport } from './discover'
import { TRAILER_FITMENT, marqueVocabulary, type FitmentProject } from './trailerFitment'

/* ---------------------------------------------------------- */
/* The seed, and one run over it                               */
/* ---------------------------------------------------------- */

const seed = buildNorthsideProject()
const project: FitmentProject = {
  entities: Object.fromEntries(seed.entities.map((e) => [e.id, e])),
  rowsByEntity: seed.rowsByEntity,
}

/** Everything the engine measured, capped only where the report caps
 *  it — the assertions below reach into `notProposed` as often as
 *  into `proposals`, because "measured and declined" is half of what
 *  this engine is for. */
const report: DiscoveryReport = discover(project, { maxPerShape: 5000 })
const all: Candidate[] = [...report.proposals, ...report.notProposed]

const one = (part: string): Candidate | undefined => all.find((c) => c.statement.includes(part))
const every = (part: string): Candidate[] => all.filter((c) => c.statement.includes(part))

/* ---------------------------------------------------------- */
/* What it ran over                                            */
/* ---------------------------------------------------------- */

describe('what the engine was pointed at', () => {
  it('reads the whole seed', () => {
    expect(report.scanned.tables).toBe(53)
    expect(report.scanned.rows).toBe(15691)
    expect(report.scanned.relationships).toBeGreaterThanOrEqual(8)
  })

  it('finds the boat × trailer relationship the adjudication measured', () => {
    const rel = report.relationships.find((r) => r.key.startsWith('boat·boat × trailer·trailer'))
    expect(rel).toBeDefined()
    /* 636 live pairings across ten trailer joins */
    expect(rel?.pairings).toBe(636)
    expect(rel?.leftCatalogue).toBe(810)
    expect(rel?.rightCatalogue).toBe(434)
  })

  it('holds back the whole retired trailer join, and says how much', () => {
    const rel = report.relationships.find((r) => r.key.startsWith('boat·boat × trailer·trailer'))
    /* FITMENT_RULES.md §5.2: Surtees × OBSOLETE Trailers, 30 live
       pairings, eight of them in the standard-trailer slot. Hidden,
       and said out loud. */
    expect(rel?.heldBack).toBe(30)
  })

  it('runs in a time a person would wait for, and reports it', () => {
    expect(report.ms).toBeGreaterThan(0)
    /* MEASURED ON THE FULL SEED: about 0.9 s for the whole run, the
       longest single generator step about 165 ms (join keys over the
       boat kind). The ceiling below is room, not a target — it is
       here so a ten-fold regression fails loudly rather than turning
       into a spinner somebody learns to live with. */
    expect(report.ms).toBeLessThan(10_000)
  })
})

/* ---------------------------------------------------------- */
/* 1 · THE SERIES BANNER                                       */
/* ---------------------------------------------------------- */

describe('1 · it rediscovers the series banner, and rates it as the selector', () => {
  const banner = all.find(
    (c) =>
      c.shape === 'categorical-selector' &&
      c.statement === 'A trailer is only offered with a boat whose own identity its “Series” names.',
  )

  it('finds it at all', () => {
    expect(banner).toBeDefined()
    expect(banner?.evidence).toBe('observed')
  })

  it('measures it at 100 % with no counter-examples', () => {
    /* §1.2 quotes 581/581 on a narrower testable cut; on this seed
       the testable cut is 626 pairings and the rate is the same */
    expect(banner?.hits).toBe(626)
    expect(banner?.tested).toBe(626)
    expect(banner?.rate).toBe(1)
    expect(banner?.counterExampleTotal).toBe(0)
    expect(banner?.rejectsRecommendation).toBe(0)
  })

  it('sets aside the banners that name no brand rather than failing them', () => {
    /* the price file itself puts live offerings on a series whose
       banner names nobody; counting those as misses would report
       this rule at 83 % and bury it */
    expect(banner?.excluded.right.untestable).toBe(10)
    expect(banner?.excluded.right.untestableWhy).toMatch(/names none of the boat/)
  })

  it('reproduces the discrimination the adjudication measured — 0.92 % to 7.83 %', () => {
    expect(banner?.discrimination?.catalogue).toBe(434)
    expect(banner?.discrimination?.over).toBe(8)
    expect((banner?.discrimination?.leastLeft ?? 0) * 100).toBeCloseTo(0.92, 1)
    expect((banner?.discrimination?.mostLeft ?? 0) * 100).toBeCloseTo(7.83, 1)
    expect(banner?.discrimination?.floor).toBe(false)
    expect(banner?.discrimination?.vacuous).toBe(false)
  })

  it('admits it against the filter threshold, and still only warns', () => {
    expect(banner?.verdict).toBe('filter')
    expect(banner?.threshold).toBe(THRESHOLDS.filter)
    expect(banner?.admitted).toBe(true)
    /* OBSERVED, so it may warn and may never prune */
    expect(banner?.enforcement).toBe('warn')
    expect(report.proposals).toContain(banner)
  })

  it('derives the same eight identities the selector already running does', () => {
    /* `marqueVocabulary` is F8's own vocabulary, filtered to what a
       trailer BANNER names. This engine does not know which column is
       the banner, so it derives a wider vocabulary and lets the
       column decide — and the two must agree on the answer, or the
       generalisation has changed the finding. */
    const marques = marqueVocabulary(project, TRAILER_FITMENT)
    expect(marques.length).toBe(8)
    for (const m of marques) expect(banner?.source).toContain(m.name)
  })
})

/* ---------------------------------------------------------- */
/* 2 · THE ATM BOUND IS A FLOOR                                */
/* ---------------------------------------------------------- */

describe('2 · it rediscovers the ATM bound and labels it a FLOOR', () => {
  const floors = every('A trailer’s “ATM (KG)” is never below the boat’s')

  it('finds the bound against the boat band’s own weight column', () => {
    expect(floors.length).toBeGreaterThan(0)
    /* every band names its weight column differently — Highfield
       `Boat Weight`, Stacer `BMT Weight (Dry)`, Surtees `App. Tow
       Weight` — so the engine finds one candidate per band rather
       than one rule, which is the truth about the file */
    expect(floors.some((c) => c.statement.includes('Boat Weight kg'))).toBe(true)
    expect(floors.some((c) => c.statement.includes('Hull Weight (Dry) kg'))).toBe(true)
  })

  it('holds at 100 % on every pairing the price file writes', () => {
    for (const c of floors) {
      expect(c.hits).toBe(c.tested)
      expect(c.counterExampleTotal).toBe(0)
    }
  })

  it('reproduces the 97.70 % the adjudication measured', () => {
    const hull = floors.find((c) => c.statement.includes('Hull Weight (Dry) kg'))
    expect((hull?.discrimination?.meanLeft ?? 0) * 100).toBeCloseTo(97.7, 0)
    expect(hull?.discrimination?.floor).toBe(true)
  })

  it('calls it a FLOOR and refuses it the filter band, at a perfect rate', () => {
    const boatWeight = floors.find((c) => c.statement.includes('Boat Weight kg'))
    expect(boatWeight?.rate).toBe(1)
    expect(boatWeight?.discrimination?.floor).toBe(true)
    expect(boatWeight?.verdict).toBe('warning')
    expect(boatWeight?.verdict).not.toBe('filter')
    expect(boatWeight?.threshold).toBe(THRESHOLDS.floor)
    expect(boatWeight?.enforcement).toBe('warn')
  })

  it('ranks the selector above the floor', () => {
    /* the F8-versus-F9 lesson expressed as an ordering: a rule that
       leaves 3 % of the catalogue outranks one at the same rate that
       leaves 98 % */
    const ids = report.proposals.map((c) => c.id)
    const banner = report.proposals.findIndex((c) => c.statement.includes('its “Series” names'))
    const floor = report.proposals.findIndex((c) =>
      c.statement.includes('“ATM (KG)” is never below the boat’s “Boat Weight kg”'),
    )
    expect(banner).toBeGreaterThanOrEqual(0)
    expect(floor).toBeGreaterThan(banner)
    expect(ids.length).toBe(new Set(ids).size)
  })
})

/* ---------------------------------------------------------- */
/* 3 · THE JOIN KEY IS THE NAME, NOT THE CODE                  */
/* ---------------------------------------------------------- */

describe('3 · it rediscovers the trailer join key', () => {
  const name = one('identifies a trailer by its “Trailer”')
  const code = one('identifies a trailer by its “Code”')

  it('admits the display name on both halves of the threshold', () => {
    expect(name?.hits).toBe(636)
    expect(name?.tested).toBe(636)
    /* §1.3 measured 474 distinct over 476 rows with 2 duplicated;
       this seed carries 444 trailer rows, 441 of them naming a
       trailer, and finds the SAME two duplicates */
    expect(name?.uniqueness?.rows).toBe(441)
    expect(name?.uniqueness?.distinct).toBe(439)
    expect(name?.uniqueness?.duplicated).toBe(2)
    expect(name?.admitted).toBe(true)
    expect(name?.threshold).toBe(THRESHOLDS.joinKey)
  })

  it('refuses the code, and names the duplicates the adjudication named', () => {
    expect(code).toBeDefined()
    expect(code?.admitted).toBe(false)
    expect(code?.uniqueness?.duplicated).toBeGreaterThan(0)
    const repeats = (code?.uniqueness?.examples ?? []).map((e) => e.value)
    /* §1.3's own list: SRW5.7M-13TB ×4, AS5.7M-13TB ×4, TA800T-EH1 ×2 */
    expect(repeats).toContain('srw5.7m-13tb')
    expect(repeats).toContain('as5.7m-13tb')
    expect(repeats).toContain('ta800t-eh1')
    const srw = code?.uniqueness?.examples.find((e) => e.value === 'srw5.7m-13tb')
    expect(srw?.rows).toBe(4)
  })

  it('needs BOTH halves — the code fails the match half outright', () => {
    /* nothing in any pairing's own text reads the code: the file
       joins on the name, which is what §1.3 settled */
    expect(code?.hits).toBe(0)
    expect(code?.tested).toBeGreaterThan(600)
  })

  it('refuses a column that is perfectly unique but that nothing names', () => {
    /* every trailer row carries a distinct Source cell address, so
       uniqueness alone would crown it */
    const src = one('identifies a trailer by its “Source”')
    expect(src?.uniqueness?.duplicated).toBe(0)
    expect(src?.hits).toBe(0)
    expect(src?.admitted).toBe(false)
  })
})

/* ---------------------------------------------------------- */
/* 4 · NO TRAILER LENGTH RULE                                  */
/* ---------------------------------------------------------- */

describe('4 · it proposes no trailer length rule', () => {
  const LENGTH_COLUMNS = ['Trailer Length (Mtr)', 'Between Guards (mm)']

  it('proposes no numeric bound over either length column', () => {
    for (const column of LENGTH_COLUMNS) {
      const proposed = report.proposals.filter(
        (c) => c.shape === 'numeric-bound' && c.statement.includes(column),
      )
      expect(proposed).toHaveLength(0)
    }
  })

  it('measures them rather than ignoring them, and says why each was declined', () => {
    /* a refutation with a number on it is a finding; the absence of
       one is an invitation to guess again */
    for (const column of LENGTH_COLUMNS) {
      const measured = every(column).filter((c) => c.shape === 'numeric-bound')
      expect(measured.length).toBeGreaterThan(0)
      for (const c of measured) {
        expect(c.admitted).toBe(false)
        /* each is declined for one of two stated reasons, and both
           are on the candidate: read one way nothing in the
           catalogue could ever violate it, and read the other way it
           would throw away pairings the price file recommends */
        expect([THRESHOLDS.vacuous, THRESHOLDS.recommendation]).toContain(c.threshold)
      }
      expect(measured.some((c) => c.threshold === THRESHOLDS.vacuous)).toBe(true)
      expect(
        measured.some(
          (c) => c.threshold === THRESHOLDS.recommendation && c.rejectsRecommendation > 0,
        ),
      ).toBe(true)
    }
  })

  it('DISAGREES about “Boat Size (Mtr)”, and the disagreement is the finding', () => {
    /* F10/F11 refuted `Boat Size (Mtr)` as a LENGTH rule at 9.4 %.
       The engine agrees there is no length rule there — the column
       is not even numeric — but it finds something else: on 229 of
       the 636 pairings the cell holds a MODEL DESIGNATOR that names
       the boat's own marque, which is FITMENT_RULES.md §7's own
       reading of that column ("277 point sizes, 142 model
       designators, 36 ranges"). It is reported as a categorical
       selector over two marques, with the 407 pairings it could not
       test counted beside it. Asserted here so that the day it
       changes, somebody reads this paragraph. */
    const size = all.find(
      (c) => c.shape === 'categorical-selector' && c.statement.includes('“Boat Size (Mtr)”'),
    )
    expect(size).toBeDefined()
    expect(size?.hits).toBe(229)
    expect(size?.tested).toBe(229)
    expect(size?.source).toContain('Highfield')
    expect(size?.source).toContain('Formosa')
    expect(
      (size?.excluded.left.untestable ?? 0) + (size?.excluded.right.untestable ?? 0),
    ).toBe(407)
    /* and it is NOT a length rule: no number is being compared */
    expect(size?.shape).not.toBe('numeric-bound')
  })
})

/* ---------------------------------------------------------- */
/* 5 · (boat, motor) IS NOT UNIQUE                             */
/* ---------------------------------------------------------- */

describe('5 · it proposes no (boat, motor) uniqueness', () => {
  const pair = all.find(
    (c) =>
      c.shape === 'uniqueness' &&
      c.statement === '(Boat (the boat), Motor (the motor)) identifies one pairing.',
  )

  it('finds the candidate and rejects it outright', () => {
    expect(pair).toBeDefined()
    expect(pair?.admitted).toBe(false)
    expect(pair?.verdict).toBe('rejected')
    expect(pair?.threshold).toBe(THRESHOLDS.deletes)
    expect(report.proposals).not.toContain(pair)
  })

  it('says exactly how many rows it would delete, by name', () => {
    /* §1.4 measured 641 of 4,018 live motor edges. This seed splits
       factory boat+engine packages into their own KIND, so the
       boat × motor relationship carries 3,684 edges rather than
       4,018 and the deletion count is smaller — the same finding on
       a narrower cut, not a different one. */
    expect(pair?.tested).toBe(3684)
    expect(pair?.wouldDelete?.rows).toBeGreaterThan(0)
    expect(pair?.wouldDelete?.named.length).toBeGreaterThan(0)
    expect(pair?.wouldDelete?.named[0]).toMatch(/×\d+$/)
    expect(pair?.uniqueness?.duplicated).toBe(pair?.wouldDelete?.rows)
  })

  it('adding the rigging kit does not rescue it', () => {
    /* §1.4: "Adding rigging recovers only 249 of the 641." */
    const withKit = all.find(
      (c) =>
        c.shape === 'uniqueness' &&
        c.statement ===
          '(Boat (the boat), Motor (the motor), Rigging Kit Option (the accessory)) identifies one pairing.',
    )
    expect(withKit?.admitted).toBe(false)
    expect(withKit?.wouldDelete?.rows).toBeGreaterThan(0)
    expect(withKit?.wouldDelete?.rows).toBeLessThan(pair?.wouldDelete?.rows ?? 0)
  })
})

/* ---------------------------------------------------------- */
/* 6 · THE RIGGING KIT STILL FAILS                             */
/* ---------------------------------------------------------- */

describe('6 · the motor still does not settle the rigging kit', () => {
  const fd = all.find(
    (c) =>
      c.shape === 'functional-dependency' &&
      c.statement === 'Choosing the Motor (the motor) settles the Rigging Kit Option (the accessory).',
  )

  it('measures it, well below the warning threshold, and does not propose it', () => {
    expect(fd).toBeDefined()
    /* §1.1 settled the membership version of this test at 53.3 %
       once sentinels were stripped from both sides. The engine's
       measure is a different one — the share of pairings taking the
       most common kit for their motor — so the figure is its own,
       and what matters is that it lands nowhere near a rule. */
    expect(fd?.rate).toBeLessThan(WARNING_RATE)
    expect(fd?.admitted).toBe(false)
    expect(report.proposals).not.toContain(fd)
  })

  it('rejects it outright, because it would throw away the file’s own recommendations', () => {
    expect(fd?.rejectsRecommendation).toBeGreaterThan(0)
    expect(fd?.verdict).toBe('rejected')
    expect(fd?.threshold).toBe(THRESHOLDS.recommendation)
  })

  it('counts what it set aside as empty rather than scoring it', () => {
    /* the pairings with no kit at all are excluded from the
       denominator and counted — the 79.4 % artefact, prevented */
    expect(fd?.excluded.right.empty).toBeGreaterThan(0)
    expect((fd?.tested ?? 0) + (fd?.excluded.right.empty ?? 0)).toBeGreaterThan(3600)
  })
})

/* ---------------------------------------------------------- */
/* THE INVARIANTS, over every candidate the seed produces      */
/* ---------------------------------------------------------- */

describe('the invariants hold over all 400-odd candidates', () => {
  it('everything is OBSERVED and nothing claims it may prune', () => {
    expect(all.length).toBeGreaterThan(300)
    for (const c of all) {
      expect(c.evidence).toBe('observed')
      expect(['warn', 'report']).toContain(c.enforcement)
    }
  })

  it('nothing admitted rejects a recommendation the business made', () => {
    for (const c of report.proposals) {
      expect(c.rejectsRecommendation).toBe(0)
      expect(c.verdict).not.toBe('rejected')
    }
  })

  it('every candidate carries a numerator, a denominator and a threshold', () => {
    for (const c of all) {
      expect(Number.isInteger(c.hits)).toBe(true)
      expect(Number.isInteger(c.tested)).toBe(true)
      expect(c.hits).toBeLessThanOrEqual(c.tested)
      expect(c.tested).toBeGreaterThan(0)
      expect(c.threshold.length).toBeGreaterThan(10)
      expect(c.because).toMatch(/\d/)
      expect(c.source.length).toBeGreaterThan(0)
    }
  })

  it('every candidate that gets something wrong names the rows, capped, with the true total', () => {
    for (const c of all) {
      expect(c.counterExamples.length).toBeLessThanOrEqual(report.bounds.maxCounterExamples)
      expect(c.counterExamples.length).toBeLessThanOrEqual(c.counterExampleTotal)
      if (c.counterExampleTotal > 0 && c.shape !== 'uniqueness') {
        expect(c.counterExamples.length).toBeGreaterThan(0)
        for (const ce of c.counterExamples) expect(ce.detail.length).toBeGreaterThan(0)
      }
    }
  })

  it('reports every bound it applied and what each withheld', () => {
    expect(report.bounds.incomparable).toBeGreaterThan(0)
    expect(report.bounds.duplicates).toBeGreaterThan(0)
    expect(report.bounds.restated).toBeGreaterThan(0)
    expect(report.bounds.thin).toBeGreaterThanOrEqual(0)
    expect(report.proposalsTotal).toBe(report.proposals.length)
  })

  it('is deterministic — a second run over the same file agrees exactly', () => {
    const again = discover(project, { maxPerShape: 5000 })
    const strip = (c: Candidate): string => `${c.id}|${c.hits}/${c.tested}|${c.verdict}|${c.admitted}`
    expect(again.proposals.map(strip)).toEqual(report.proposals.map(strip))
    expect(again.notProposed.map(strip)).toEqual(report.notProposed.map(strip))
  })

  it('keeps a readable report at its default caps', () => {
    const capped = discover(project)
    expect(capped.proposals.length).toBeLessThanOrEqual(5 * capped.bounds.maxPerShape)
    expect(capped.bounds.withheld).toBeGreaterThan(0)
    /* the strongest finding survives the cap */
    expect(capped.proposals[0].shape).toBe('categorical-selector')
    expect(capped.proposals.some((c) => c.statement.includes('its “Series” names'))).toBe(true)
  })
})
