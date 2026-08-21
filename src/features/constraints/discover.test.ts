/* ============================================================
   THE ENGINE'S PROPERTIES, on fixtures small enough to check by
   hand.

   Two suites cover this engine and they answer different questions.
   `discoverNorthside.test.ts` asks "does it rediscover what a careful
   human found in the same price file" — the strong test, and the one
   that would catch a silent rot. THIS file asks the questions that
   cannot be asked of the real seed because the answer would be
   buried in eleven thousand rows: does an observed candidate ever
   claim it may prune, does the A2 guard fire, is a sentinel counted
   rather than skipped, is a floor labelled a floor.

   Every fixture below is a handful of rows, so an assertion that
   fails names an arithmetic a person can redo on paper.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { nowIso } from '@/lib/id'
import { PAIR_RECOMMENDED_FIELD } from '@/types/model'
import type { EntityDef, FieldDef, RowData, TableKind } from '@/types/model'
import {
  DISCRIMINATION_CEILING,
  FILTER_RATE,
  MAY_PRUNE,
  THRESHOLDS,
  WARNING_RATE,
  discover,
  discoverSteps,
  type Candidate,
  type DiscoveryProject,
} from './discover'
import {
  Exclusions,
  SENTINEL_RULES,
  exact,
  fold,
  names,
  readValue,
  sentinelRuleFor,
  unitOf,
} from './discoverValues'

/* ---------------------------------------------------------- */
/* A project, built by hand                                    */
/* ---------------------------------------------------------- */

const stamp = nowIso()

interface ColSpec {
  id: string
  name: string
  type: FieldDef['type']
  ref?: string
}

function table(
  id: string,
  name: string,
  kind: TableKind | undefined,
  role: 'base' | 'join',
  cols: ColSpec[],
  hierarchy: string[] = [],
): EntityDef {
  return {
    id,
    name,
    ...(kind ? { kind } : {}),
    role,
    accent: 'violet',
    hierarchy,
    fields: cols.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      ...(c.ref ? { refEntityId: c.ref } : {}),
    })),
    displayFieldId: cols[0].id,
    position: { x: 0, y: 0 },
    createdAt: stamp,
    updatedAt: stamp,
  }
}

const row = (id: string, entityId: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: stamp,
  updatedAt: stamp,
})

const project = (entities: EntityDef[], rows: Record<string, RowData[]>): DiscoveryProject => ({
  entities: Object.fromEntries(entities.map((e) => [e.id, e])),
  rowsByEntity: rows,
})

const find = (report: { proposals: Candidate[]; notProposed: Candidate[] }, part: string): Candidate | undefined =>
  [...report.proposals, ...report.notProposed].find((c) => c.statement.includes(part))

/* ---------------------------------------------------------- */
/* THE LINE THAT MUST NOT BE CROSSED                           */
/* ---------------------------------------------------------- */

describe('an observed pattern may never prune', () => {
  it('states it as a constant, so an edit has to argue with it', () => {
    expect(MAY_PRUNE).toBe(false)
  })

  it('never emits an enforcement that filters, whatever the verdict', () => {
    const report = discover(hullAndCradle(), { minTested: 1 })
    const all = [...report.proposals, ...report.notProposed]
    expect(all.length).toBeGreaterThan(0)
    for (const c of all) {
      expect(c.evidence).toBe('observed')
      expect(['warn', 'report']).toContain(c.enforcement)
    }
    /* a candidate may CLEAR the filter bar and still only warn */
    const filters = all.filter((c) => c.verdict === 'filter')
    for (const c of filters) expect(c.enforcement).toBe('warn')
  })

  it('carries integers, not a bare percentage', () => {
    const report = discover(hullAndCradle(), { minTested: 1 })
    for (const c of [...report.proposals, ...report.notProposed]) {
      expect(Number.isInteger(c.hits)).toBe(true)
      expect(Number.isInteger(c.tested)).toBe(true)
      expect(c.hits).toBeLessThanOrEqual(c.tested)
      expect(c.rate).toBeCloseTo(c.tested === 0 ? 0 : c.hits / c.tested, 12)
    }
  })
})

/* ---------------------------------------------------------- */
/* THE FIXTURE — four hulls, six cradles, one price file       */
/* ---------------------------------------------------------- */

/**
 * Small enough to check on paper, and shaped like the real finding:
 *
 *   · two hull tables, ANDERS and BLYTH, so a table name is an
 *     identity the way a boat brand is;
 *   · four cradles whose SERIES banner names one hull maker each,
 *     plus two whose banner names neither — the "unnamed" third
 *     state the real file has ten of, and NOT a rejection;
 *   · a CAPACITY in kilograms against a hull WEIGHT in kilograms, set
 *     so the bound holds on every pairing and still leaves most of
 *     the catalogue standing: the F9 shape;
 *   · a PART CODE that is unique but that no pairing's text names,
 *     and a NAME that is named but not quite unique: the two halves
 *     of the join-key threshold, pulling in opposite directions.
 */
function hullAndCradle(): DiscoveryProject {
  const anders = table('t-anders', 'Anders Boats', 'boat', 'base', [
    { id: 'a-name', name: 'Hull', type: 'text' },
    { id: 'a-weight', name: 'Hull Weight kg', type: 'number' },
  ])
  const blyth = table('t-blyth', 'Blyth Craft', 'boat', 'base', [
    { id: 'b-name', name: 'Hull', type: 'text' },
    { id: 'b-weight', name: 'Hull Weight kg', type: 'number' },
  ])
  const cradles = table('t-cradle', 'Cradles', 'trailer', 'base', [
    { id: 'c-name', name: 'Cradle', type: 'text' },
    { id: 'c-series', name: 'Series', type: 'text' },
    { id: 'c-code', name: 'Code', type: 'text' },
    { id: 'c-atm', name: 'ATM (kg)', type: 'number' },
    { id: 'c-price', name: 'Sell', type: 'number' },
  ])
  const join = table('t-fit', 'Hull × Cradle', undefined, 'join', [
    { id: 'j-label', name: 'Label', type: 'text' },
    { id: 'j-hull', name: 'Hull', type: 'reference', ref: 't-anders' },
    { id: 'j-cradle', name: 'Cradle', type: 'reference', ref: 't-cradle' },
    { id: PAIR_RECOMMENDED_FIELD, name: 'Recommended', type: 'boolean' },
  ])
  const join2 = table('t-fit2', 'Blyth × Cradle', undefined, 'join', [
    { id: 'k-label', name: 'Label', type: 'text' },
    { id: 'k-hull', name: 'Hull', type: 'reference', ref: 't-blyth' },
    { id: 'k-cradle', name: 'Cradle', type: 'reference', ref: 't-cradle' },
    { id: PAIR_RECOMMENDED_FIELD, name: 'Recommended', type: 'boolean' },
  ])

  const andersRows = [
    row('a1', 't-anders', { 'a-name': 'Anders 500', 'a-weight': 400 }),
    row('a2', 't-anders', { 'a-name': 'Anders 600', 'a-weight': 700 }),
  ]
  const blythRows = [
    row('b1', 't-blyth', { 'b-name': 'Blyth 500', 'b-weight': 450 }),
    row('b2', 't-blyth', { 'b-name': 'Blyth 700', 'b-weight': 900 }),
  ]
  const cradleRows = [
    row('c1', 't-cradle', {
      'c-name': 'Anders Cradle 5',
      'c-series': 'REDCO - Anders',
      'c-code': 'AC5',
      'c-atm': 1200,
      'c-price': 2000,
    }),
    row('c2', 't-cradle', {
      'c-name': 'Anders Cradle 6',
      'c-series': 'REDCO - Anders',
      'c-code': 'AC6',
      'c-atm': 1400,
      'c-price': 2200,
    }),
    row('c3', 't-cradle', {
      'c-name': 'Blyth Cradle 5',
      'c-series': 'Blyth Series',
      'c-code': 'BC5',
      'c-atm': 1500,
      'c-price': 2400,
    }),
    row('c4', 't-cradle', {
      'c-name': 'Blyth Cradle 7',
      'c-series': 'Blyth Series',
      'c-code': 'BC7',
      'c-atm': 1800,
      'c-price': 2600,
    }),
    /* the third state: a banner naming neither maker */
    row('c5', 't-cradle', {
      'c-name': 'Universal Cradle',
      'c-series': 'General Purpose Series',
      'c-code': 'BC7',
      'c-atm': 2000,
      'c-price': 2800,
    }),
    row('c6', 't-cradle', {
      'c-name': 'Universal Cradle Wide',
      'c-series': 'General Purpose Series',
      'c-code': 'UC2',
      'c-atm': 2200,
      'c-price': 3000,
    }),
  ]

  const pair = (
    id: string,
    entityId: string,
    hullField: string,
    cradleField: string,
    labelField: string,
    hull: string,
    cradle: string,
    hullLabel: string,
    cradleLabel: string,
    recommended: boolean,
  ): RowData =>
    row(id, entityId, {
      [labelField]: `${hullLabel} · ${cradleLabel}`,
      [hullField]: hull,
      [cradleField]: cradle,
      [PAIR_RECOMMENDED_FIELD]: recommended,
    })

  const fits = [
    pair('p1', 't-fit', 'j-hull', 'j-cradle', 'j-label', 'a1', 'c1', 'Anders 500', 'Anders Cradle 5', true),
    pair('p2', 't-fit', 'j-hull', 'j-cradle', 'j-label', 'a1', 'c2', 'Anders 500', 'Anders Cradle 6', false),
    pair('p3', 't-fit', 'j-hull', 'j-cradle', 'j-label', 'a2', 'c2', 'Anders 600', 'Anders Cradle 6', true),
    pair('p4', 't-fit', 'j-hull', 'j-cradle', 'j-label', 'a2', 'c5', 'Anders 600', 'Universal Cradle', false),
  ]
  const fits2 = [
    pair('q1', 't-fit2', 'k-hull', 'k-cradle', 'k-label', 'b1', 'c3', 'Blyth 500', 'Blyth Cradle 5', true),
    pair('q2', 't-fit2', 'k-hull', 'k-cradle', 'k-label', 'b2', 'c4', 'Blyth 700', 'Blyth Cradle 7', true),
    pair('q3', 't-fit2', 'k-hull', 'k-cradle', 'k-label', 'b2', 'c3', 'Blyth 700', 'Blyth Cradle 5', false),
  ]

  return project([anders, blyth, cradles, join, join2], {
    't-anders': andersRows,
    't-blyth': blythRows,
    't-cradle': cradleRows,
    't-fit': fits,
    't-fit2': fits2,
  })
}

/* ---------------------------------------------------------- */
/* SHAPE 1 · the selector, and the third state                 */
/* ---------------------------------------------------------- */

describe('the categorical selector', () => {
  const report = discover(hullAndCradle(), { minTested: 1 })
  const selector = find(report, 'its “Series” names')

  it('finds the banner that names the other side', () => {
    expect(selector).toBeDefined()
    expect(selector?.shape).toBe('categorical-selector')
    /* six of the seven pairings are testable; the seventh sits on a
       banner that names neither maker, and that is NOT a failure */
    expect(selector?.hits).toBe(6)
    expect(selector?.tested).toBe(6)
    expect(selector?.counterExampleTotal).toBe(0)
  })

  it('counts the banner that names nobody as untestable, not as a miss', () => {
    expect(selector?.excluded.right.untestable).toBe(1)
    expect(selector?.excluded.right.untestableWhy).toMatch(/names none of the boat/)
  })

  it('reports how much of the catalogue it leaves standing', () => {
    /* Anders is left 2 of 6 cradles, Blyth 2 of 6 */
    expect(selector?.discrimination?.catalogue).toBe(6)
    expect(selector?.discrimination?.leastLeft).toBeCloseTo(1 / 3, 6)
    expect(selector?.discrimination?.mostLeft).toBeCloseTo(1 / 3, 6)
    expect(selector?.discrimination?.floor).toBe(false)
    expect(selector?.admitted).toBe(true)
  })

  it('is proposed, and says which threshold admitted it', () => {
    expect(report.proposals).toContain(selector)
    expect(selector?.threshold).toBe(THRESHOLDS.filter)
  })
})

/* ---------------------------------------------------------- */
/* SHAPE 2 · the bound, the floor, and the vacuous bound       */
/* ---------------------------------------------------------- */

describe('the numeric bound', () => {
  const report = discover(hullAndCradle(), { minTested: 1 })
  const atm = find(report, '“ATM (kg)” is never below')

  it('finds the bound and holds it on every pairing', () => {
    expect(atm).toBeDefined()
    expect(atm?.hits).toBe(atm?.tested)
    expect(atm?.tested).toBe(7)
  })

  it('labels a bound nothing could break as VACUOUS, and does not propose it', () => {
    /* every cradle clears every hull, so no hull is told anything */
    expect(atm?.discrimination?.vacuous).toBe(true)
    expect(atm?.admitted).toBe(false)
    expect(atm?.threshold).toBe(THRESHOLDS.vacuous)
    expect(report.proposals).not.toContain(atm)
  })

  it('labels a bound that bites on somebody but leaves most of the catalogue a FLOOR', () => {
    /* ONE heavy hull among twenty light ones. The bound holds on
       every pairing the file writes, and the mean share of the
       catalogue left standing is 96 % — the F9 shape at 21 rows. */
    const p = hullAndCradle()
    for (let i = 0; i < 18; i += 1) {
      p.rowsByEntity['t-anders'].push(
        row(`a-light-${i}`, 't-anders', { 'a-name': `Anders L${i}`, 'a-weight': 300 }),
      )
    }
    p.rowsByEntity['t-anders'].push(
      row('a-heavy', 't-anders', { 'a-name': 'Anders Heavy', 'a-weight': 1900 }),
    )
    const r = discover(p, { minTested: 1 })
    const floor = find(r, '“ATM (kg)” is never below')
    expect(floor?.hits).toBe(floor?.tested)
    expect(floor?.discrimination?.vacuous).toBe(false)
    expect(floor?.discrimination?.meanLeft).toBeGreaterThanOrEqual(DISCRIMINATION_CEILING)
    expect(floor?.discrimination?.floor).toBe(true)
    /* 100 % and still not a filter — the F9 lesson, encoded */
    expect(floor?.rate).toBe(1)
    expect(floor?.verdict).toBe('warning')
    expect(floor?.threshold).toBe(THRESHOLDS.floor)
    expect(floor?.enforcement).toBe('warn')
  })

  it('never compares two numbers the file does not call the same kind', () => {
    const r = discover(hullAndCradle(), { minTested: 1 })
    /* kilograms against dollars is arithmetic, not a rule */
    expect(find(r, '“Sell” is never below')).toBeUndefined()
    expect(find(r, 'is never below the boat’s “Hull Weight kg”')).toBeDefined()
    expect(r.bounds.incomparable).toBeGreaterThan(0)
  })
})

/* ---------------------------------------------------------- */
/* THE A2 GUARD                                                */
/* ---------------------------------------------------------- */

describe('a rule that rejects the business’s own recommendation', () => {
  it('is rejected outright, whatever its rate', () => {
    const p = hullAndCradle()
    /* make ONE recommended pairing break the bound: six of seven
       still hold, which would otherwise clear the warning bar */
    p.rowsByEntity['t-anders'][0].values['a-weight'] = 99999
    const r = discover(p, { minTested: 1 })
    const atm = find(r, '“ATM (kg)” is never below')
    expect(atm).toBeDefined()
    expect(atm?.rejectsRecommendation).toBeGreaterThan(0)
    expect(atm?.verdict).toBe('rejected')
    expect(atm?.threshold).toBe(THRESHOLDS.recommendation)
    expect(atm?.admitted).toBe(false)
    expect(r.proposals).not.toContain(atm)
  })

  it('names the pairing it would have thrown away', () => {
    const p = hullAndCradle()
    p.rowsByEntity['t-anders'][0].values['a-weight'] = 99999
    const r = discover(p, { minTested: 1 })
    const atm = find(r, '“ATM (kg)” is never below')
    expect(atm?.counterExamples.length).toBeGreaterThan(0)
    expect(atm?.counterExamples[0].subject).toBe('Anders 500')
    expect(atm?.counterExamples.some((c) => c.recommended)).toBe(true)
    expect(atm?.counterExamples[0].detail).toMatch(/is below/)
  })

  it('nothing admitted anywhere rejects a recommendation', () => {
    const r = discover(hullAndCradle(), { minTested: 1 })
    for (const c of r.proposals) expect(c.rejectsRecommendation).toBe(0)
  })
})

/* ---------------------------------------------------------- */
/* SHAPE 3 · the join key needs BOTH halves                    */
/* ---------------------------------------------------------- */

describe('the join key', () => {
  const report = discover(hullAndCradle(), { minTested: 1 })

  it('admits the column the pairing’s own text names, and that is unique', () => {
    const key = find(report, 'identifies a trailer by its “Cradle”')
    expect(key?.hits).toBe(7)
    expect(key?.tested).toBe(7)
    expect(key?.uniqueness?.distinct).toBe(6)
    expect(key?.uniqueness?.rows).toBe(6)
    expect(key?.admitted).toBe(true)
    expect(key?.threshold).toBe(THRESHOLDS.joinKey)
  })

  it('refuses a column that is named but not unique', () => {
    /* `Code` repeats BC7 on two rows: 5 distinct over 6 = 83 % */
    const code = find(report, 'identifies a trailer by its “Code”')
    expect(code?.uniqueness?.duplicated).toBe(1)
    expect(code?.uniqueness?.examples[0].value).toBe('bc7')
    expect(code?.admitted).toBe(false)
  })

  it('refuses a column that is unique but that no pairing names', () => {
    /* every hull name is unique across the kind, but the Blyth join
       writes its own label, so `Hull` on the ANDERS table is named
       and the code-like column is not. Here: prove the match half by
       stripping the labels — nothing is named any more. */
    const p = hullAndCradle()
    for (const r of p.rowsByEntity['t-fit']) delete r.values['j-label']
    for (const r of p.rowsByEntity['t-fit2']) delete r.values['k-label']
    const r = discover(p, { minTested: 1 })
    const key = find(r, 'identifies a trailer by its “Cradle”')
    expect(key?.hits).toBe(0)
    expect(key?.uniqueness?.duplicated).toBe(0)
    expect(key?.admitted).toBe(false)
  })

  it('is never given the rejected band — a column that is not the key is just not the key', () => {
    for (const c of [...report.proposals, ...report.notProposed]) {
      if (c.shape === 'join-key') expect(c.verdict).toBe('observation')
    }
  })
})

/* ---------------------------------------------------------- */
/* SHAPE 5 · uniqueness says what it would delete, by name     */
/* ---------------------------------------------------------- */

describe('uniqueness', () => {
  it('admits a pair that is unique', () => {
    const r = discover(hullAndCradle(), { minTested: 1 })
    const u = find(r, ') identifies one pairing')
    expect(u?.wouldDelete).toBeNull()
    expect(u?.admitted).toBe(true)
  })

  it('rejects a pair that is not, and names the rows by hand', () => {
    const p = hullAndCradle()
    /* the price file writes the same hull and cradle twice, in two
       slots — which is exactly what it does 641 times for real */
    p.rowsByEntity['t-fit'][1].values['j-cradle'] = 'c1'
    const r = discover(p, { minTested: 1 })
    const u = [...r.proposals, ...r.notProposed].find((c) => c.shape === 'uniqueness')
    expect(u?.admitted).toBe(false)
    expect(u?.verdict).toBe('rejected')
    expect(u?.threshold).toBe(THRESHOLDS.deletes)
    expect(u?.wouldDelete?.rows).toBe(1)
    expect(u?.wouldDelete?.named[0]).toContain('Anders 500')
    expect(u?.wouldDelete?.named[0]).toContain('×2')
  })
})

/* ---------------------------------------------------------- */
/* THE SENTINEL ACCOUNTING — the 79.4 % trap                   */
/* ---------------------------------------------------------- */

describe('sentinels are excluded from both sides, and counted', () => {
  it('reads FITMENT_RULES §6.1’s list', () => {
    expect(sentinelRuleFor('NR - ENGINE NOT REQUIRED')).toBeTruthy()
    expect(sentinelRuleFor('NR-RIGGING KIT NOT REQUIRED')).toBeTruthy()
    expect(sentinelRuleFor('TRAILER NOT REQUIRED')).toBeTruthy()
    expect(sentinelRuleFor('.')).toBeTruthy()
    expect(sentinelRuleFor('0')).toBeTruthy()
    expect(sentinelRuleFor('Tiller Handle Standard w Motor')).toBeTruthy()
    expect(sentinelRuleFor('HAINES - Factory Fit Rigging Kit')).toBeTruthy()
    expect(sentinelRuleFor('Jeanneau Factory Fitted Motor / Rigging Combination')).toBeTruthy()
    expect(sentinelRuleFor('Yamaha - F70LA')).toBeNull()
    expect(SENTINEL_RULES.length).toBeGreaterThan(0)
  })

  it('treats a column’s own name in a data cell as leaked header text', () => {
    expect(sentinelRuleFor('Rigging Kit Option', 'Rigging Kit Option')).toMatch(/own name/)
    expect(sentinelRuleFor('Motor Option 4', 'Motor Option 4')).toMatch(/own name/)
    expect(sentinelRuleFor('Yamaha - F70LA', 'Rigging Kit Option')).toBeNull()
  })

  it('reads a numeric zero as a sentinel and says so', () => {
    const r = readValue(0, 'ATM')
    expect(r.num).toBeNull()
    expect(r.skip).toBe('sentinel')
    expect(r.rule).toBe('a bare zero')
    expect(readValue(740, 'ATM').num).toBe(740)
  })

  it('never lets one sentinel agree with another', () => {
    /* the shape of the 79.4 %-versus-53.3 % artefact, at four rows:
       two real agreements and two sentinel-on-sentinel ones. A test
       that counted the sentinels would read 4/4; the engine reads
       2/2 and reports the two it set aside. */
    const excl = new Exclusions()
    let hits = 0
    let tested = 0
    const cells: Array<[string, string]> = [
      ['Mech Kit A', 'Mech Kit A'],
      ['Mech Kit B', 'Mech Kit B'],
      ['NR - ENGINE NOT REQUIRED', 'NR - RIGGING KIT NOT REQUIRED'],
      ['NR - ENGINE NOT REQUIRED', 'NR - RIGGING KIT NOT REQUIRED'],
    ]
    for (const [left, right] of cells) {
      const l = readValue(left, 'Motor')
      const rr = readValue(right, 'Rigging Kit Option')
      if (!excl.keep(l) || !excl.keep(rr)) continue
      tested += 1
      if (l.text === rr.text) hits += 1
    }
    expect(tested).toBe(2)
    expect(hits).toBe(2)
    const reading = excl.read()
    expect(reading.sentinel).toBe(2)
    expect(reading.sentinelRules[0].label).toMatch(/NOT REQUIRED|NR/)
  })
})

/* ---------------------------------------------------------- */
/* UNITS                                                       */
/* ---------------------------------------------------------- */

describe('the unit a header declares', () => {
  it('reads the price file’s own wording', () => {
    expect(unitOf('ATM (KG)')).toBe('kg')
    expect(unitOf('Tare (Kg)')).toBe('kg')
    expect(unitOf('Boat Weight kg')).toBe('kg')
    expect(unitOf('Between Guards (mm)')).toBe('mm')
    expect(unitOf('Int Length cm')).toBe('cm')
    expect(unitOf('Trailer Length (Mtr)')).toBe('m')
    expect(unitOf('Water Ballast L')).toBe('l')
    expect(unitOf('Max HP')).toBe('hp')
    expect(unitOf('HP Rating')).toBe('hp')
    expect(unitOf('MU %')).toBe('%')
    expect(unitOf('Rego ($)')).toBe('$')
    expect(unitOf('Deadrise °')).toBe('deg')
    expect(unitOf('Wheel Size in')).toBe('in')
  })

  it('says nothing where the header says nothing', () => {
    expect(unitOf('Sell')).toBeNull()
    expect(unitOf('Base Cost')).toBeNull()
    expect(unitOf('Dealer 1/7/22')).toBeNull()
    expect(unitOf('Hull Length')).toBeNull()
    expect(unitOf('Cabins')).toBeNull()
    expect(unitOf('Sell inc Rego')).toBeNull()
  })
})

/* ---------------------------------------------------------- */
/* TEXT                                                        */
/* ---------------------------------------------------------- */

describe('naming is whole-word', () => {
  it('does not let one series claim another’s name', () => {
    expect(names('Fishing Series', 'Fisher Series')).toBe(false)
    expect(names('REDCO - Highfield', 'Highfield')).toBe(true)
    expect(names('REDCO - Highfield', 'field')).toBe(false)
    expect(names('anything', '')).toBe(false)
  })

  it('folds and exacts stably however often it is asked', () => {
    expect(fold('REDCO - Highfield')).toBe(fold('REDCO - Highfield'))
    expect(fold('REDCO - Highfield')).toBe(' redco highfield ')
    expect(exact('  Anders   500 ')).toBe('anders 500')
    /* punctuation survives `exact`: two codes a hyphen apart are two */
    expect(exact('AC-5')).not.toBe(exact('AC5'))
  })
})

/* ---------------------------------------------------------- */
/* THE RUN                                                     */
/* ---------------------------------------------------------- */

describe('the run', () => {
  it('is deterministic — the same project gives the same ids and figures', () => {
    const a = discover(hullAndCradle(), { minTested: 1 })
    const b = discover(hullAndCradle(), { minTested: 1 })
    const strip = (c: Candidate): string => `${c.id}|${c.hits}/${c.tested}|${c.verdict}`
    expect(a.proposals.map(strip)).toEqual(b.proposals.map(strip))
    expect(a.notProposed.map(strip)).toEqual(b.notProposed.map(strip))
  })

  it('yields as a generator, and returns the same report as draining it', () => {
    const run = discoverSteps(hullAndCradle(), { minTested: 1 })
    const steps: string[] = []
    let step = run.next()
    while (!step.done) {
      steps.push(step.value.step)
      expect(step.value.done).toBeLessThanOrEqual(step.value.total)
      step = run.next()
    }
    expect(steps.length).toBeGreaterThan(1)
    expect(steps[steps.length - 1]).toBe('join keys')
    expect(step.value.proposals.length).toBe(discover(hullAndCradle(), { minTested: 1 }).proposals.length)
  })

  it('reports every bound it applied and what each withheld', () => {
    const r = discover(hullAndCradle(), { minTested: 1, maxPerShape: 1 })
    expect(r.bounds.minTested).toBe(1)
    expect(r.bounds.maxPerShape).toBe(1)
    expect(r.bounds.withheld).toBeGreaterThan(0)
    expect(r.proposalsTotal).toBeGreaterThanOrEqual(r.proposals.length)
    expect(r.notProposedTotal).toBeGreaterThanOrEqual(r.notProposed.length)
    expect(r.ms).toBeGreaterThanOrEqual(0)
  })

  it('withholds a denominator too thin to report, and counts it', () => {
    const r = discover(hullAndCradle(), { minTested: 500 })
    expect(r.proposals).toHaveLength(0)
    expect(r.bounds.thin).toBeGreaterThan(0)
  })

  it('never lets a retired table or a discontinued row into a pairing', () => {
    const p = hullAndCradle()
    p.entities['t-cradle'] = { ...p.entities['t-cradle'], retired: true }
    const r = discover(p, { minTested: 1 })
    const trailerRel = r.relationships.find((rel) => rel.key.includes('trailer'))
    expect(trailerRel).toBeDefined()
    expect(trailerRel?.pairings).toBe(0)
    /* held back, and SAID — an empty list is not a finding */
    expect(trailerRel?.heldBack).toBe(7)
    expect(r.proposals.some((c) => c.relationship === trailerRel?.label)).toBe(false)
  })

  it('holds the thresholds FITMENT_RULES.md §0 wrote', () => {
    expect(FILTER_RATE).toBe(0.99)
    expect(WARNING_RATE).toBe(0.95)
    expect(DISCRIMINATION_CEILING).toBe(0.95)
  })
})
