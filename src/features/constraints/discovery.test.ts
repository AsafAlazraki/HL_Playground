/* ============================================================
   THE SCREEN'S SIDE OF THE DISCOVERY ENGINE — the words it puts on
   a candidate, and what happens when somebody keeps one.

   THREE SUITES COVER THIS FEATURE AND THEY ASK DIFFERENT QUESTIONS.
   `discoverNorthside.test.ts` asks "does the engine rediscover what
   a careful human found in the same price file". `discover.test.ts`
   asks whether the engine's own properties hold on fixtures small
   enough to check by hand. THIS file asks the two questions those
   cannot:

     1 · DOES THE SCREEN SAY THE TRUE THING? Every sentence a person
         reads about a candidate is built here, from integers the
         engine measured, and the assertions below are the arithmetic
         a reader would do to check one. The sharp case is the
         F8-versus-F9 pair: two candidates at exactly 100 %, one of
         which selects nothing, must read differently on screen or
         the screen is lying by omission.

     2 · CAN A PERSON ACQUIRE A FILTERING RULE BY ACCIDENT? No, and
         it is asserted at both ends: `KEPT_MAY_PRUNE` is false, a
         kept pattern is always `evidence: 'observed'` with an
         enforcement of 'warn' or 'report', and a stored decision
         that claims otherwise is dropped at load rather than
         honoured — because localStorage is editable by hand and
         that is the one property that may not be acquired by
         editing a JSON file.

   The fixtures are hand-built candidates, not runs of the engine, so
   a failure here names a sentence rather than a measurement.
   ============================================================ */
import { beforeEach, describe, expect, it } from 'vitest'
import { boundsSay } from './DiscoveryPanel'
import { MAY_PRUNE, type Candidate, type CandidateShape } from './discover'
import {
  KEPT_MAY_PRUNE,
  clearDecisions,
  decide,
  decisionFrom,
  forget,
  getDecisions,
} from './discoveredRules'
import {
  OBSERVED_SAY,
  SHAPE_SAY,
  counterSay,
  deleteSay,
  enforcementSay,
  excludedSay,
  figuresFor,
  recommendationSay,
  uniquenessSay,
  verdictSay,
} from './discoverSay'

/* ---------------------------------------------------------- */
/* A candidate, built by hand                                  */
/* ---------------------------------------------------------- */

const base: Candidate = {
  id: 'dx:test:1',
  shape: 'categorical-selector',
  relationship: 'Boat (boat) × Trailer (trailer)',
  relationshipKey: 'boat·boat × trailer·trailer',
  binds: {
    far: { kind: 'trailer', name: 'Series', conceptKey: 'trailer::series', tables: 8 },
    near: null,
  },
  statement: 'A trailer is only offered with a boat whose own identity its “Series” names.',
  because: '581 of 581 pairings the price file writes agree',
  source: 'Series on 8 trailer tables',
  evidence: 'observed',
  enforcement: 'warn',
  hits: 581,
  tested: 581,
  rate: 1,
  discrimination: {
    catalogue: 434,
    over: 8,
    leastLeft: 0.0092,
    mostLeft: 0.0783,
    meanLeft: 0.0412,
    floor: false,
    vacuous: false,
  },
  uniqueness: null,
  counterExamples: [],
  counterExampleTotal: 0,
  rejectsRecommendation: 0,
  wouldDelete: null,
  excluded: {
    left: { empty: 0, sentinel: 0, sentinelRules: [], untestable: 0, untestableWhy: null },
    right: { empty: 0, sentinel: 0, sentinelRules: [], untestable: 0, untestableWhy: null },
  },
  verdict: 'filter',
  threshold: 'a rule is admissible as a filter at ≥ 99 %…',
  admitted: true,
}

const candidate = (over: Partial<Candidate>): Candidate => ({ ...base, ...over })

/* ---------------------------------------------------------- */
/* 1 · THE TWO FIGURES, AND THE LESSON THEY CARRY              */
/* ---------------------------------------------------------- */

describe('the two figures are drawn as a pair', () => {
  it('states the rate as two integers, never as a bare percentage', () => {
    const f = figuresFor(base)
    expect(f.holds).toBe('581 of 581')
    expect(f.holds).not.toMatch(/%/)
  })

  it('names the exceptions when there are any, with the rate beside them', () => {
    const f = figuresFor(candidate({ hits: 3676, tested: 3684, rate: 3676 / 3684 }))
    expect(f.holds).toBe('3,676 of 3,684')
    expect(f.holdsSay).toContain('8 disagree')
    expect(f.holdsSay).toContain('99.8%')
  })

  it('never says "usually"', () => {
    for (const c of [base, candidate({ hits: 9, tested: 10, rate: 0.9 })]) {
      const f = figuresFor(c)
      expect(`${f.holdsSay} ${f.leavesSay}`).not.toMatch(/usually/i)
    }
  })

  /* THE F8 / F9 LESSON, AS AN ASSERTION. Two candidates at exactly
     100 %, one of which selects nothing. If these two ever read the
     same on screen, the screen has taught the wrong thing. */
  it('separates a selector from a floor at the same perfect rate', () => {
    const selector = figuresFor(base)
    const floor = figuresFor(
      candidate({
        shape: 'numeric-bound',
        statement: 'A trailer’s “ATM (KG)” is never below the boat’s “Hull Weight (Dry) kg”.',
        hits: 530,
        tested: 530,
        discrimination: {
          catalogue: 434,
          over: 99,
          leastLeft: 0.92,
          mostLeft: 1,
          meanLeft: 0.977,
          floor: true,
          vacuous: false,
        },
      }),
    )
    /* both are perfect, and the screen says so identically */
    expect(selector.holdsSay).toBe(floor.holdsSay)
    expect(selector.standing).toBe('selects')
    expect(floor.standing).toBe('floor')
    expect(selector.leaves).toBe('4.1%')
    expect(floor.leaves).toBe('97.7%')
    expect(floor.leavesSay).toContain('floor and not a selector')
    expect(selector.leavesSay).not.toContain('floor')
  })

  it('calls a bound nothing could break arithmetic rather than a rule', () => {
    const f = figuresFor(
      candidate({
        shape: 'numeric-bound',
        discrimination: {
          catalogue: 89,
          over: 89,
          leastLeft: 1,
          mostLeft: 1,
          meanLeft: 1,
          floor: true,
          vacuous: true,
        },
      }),
    )
    expect(f.standing).toBe('arithmetic')
    expect(f.leaves).toBe('100.0%')
    expect(f.leavesSay).toContain('arithmetic about two ranges')
  })

  /* A SHAPE THAT NARROWS NOTHING SAYS SO, rather than being handed a
     figure it never had. A key is not a gate. */
  it('says there is nothing to leave standing where the shape narrows no list', () => {
    const f = figuresFor(candidate({ shape: 'join-key', discrimination: null }))
    expect(f.leaves).toBe('—')
    expect(f.standing).toBe('not-measured')
    expect(f.leavesSay).toContain('does not narrow a list')
  })
})

/* ---------------------------------------------------------- */
/* 2 · THE LINE, IN WORDS                                      */
/* ---------------------------------------------------------- */

describe('nothing the screen says offers to prune', () => {
  it('says what a candidate CLEARED, never what the app will do with it', () => {
    /* A verdict of 'filter' means "it clears the bar a filter would
       have to clear". If this sentence ever reads as an instruction,
       the whole distinction has gone. */
    expect(verdictSay('filter')).toBe('Clears the bar a filter would have to clear')
    for (const v of ['filter', 'warning', 'observation', 'rejected'] as const) {
      expect(verdictSay(v)).not.toMatch(/\bwill (filter|remove|hide)\b/i)
    }
  })

  it('says what keeping one would DO, and neither answer prunes', () => {
    expect(enforcementSay(base)).toContain('never removes one')
    expect(enforcementSay(candidate({ enforcement: 'report' }))).toContain('changes no list')
  })

  it('says at the point of acceptance that it was observed, not stated', () => {
    expect(OBSERVED_SAY).toContain('measured in your values')
    expect(OBSERVED_SAY).toContain('never remove a row')
  })

  it('has a name and a description for every shape the engine can emit', () => {
    const shapes: CandidateShape[] = [
      'categorical-selector',
      'numeric-bound',
      'join-key',
      'functional-dependency',
      'uniqueness',
    ]
    for (const s of shapes) {
      expect(SHAPE_SAY[s].name.length).toBeGreaterThan(0)
      expect(SHAPE_SAY[s].say.length).toBeGreaterThan(0)
      /* a shape name is a noun phrase, never uppercase — uppercase is
         a label style and this is a name */
      expect(SHAPE_SAY[s].name).not.toBe(SHAPE_SAY[s].name.toUpperCase())
    }
  })
})

/* ---------------------------------------------------------- */
/* 3 · CHECKING A PROPOSAL                                     */
/* ---------------------------------------------------------- */

describe('a proposal can be checked rather than trusted', () => {
  it('says outright when nothing disagrees', () => {
    expect(counterSay(base)).toContain('Nothing in your price file disagrees')
  })

  it('counts the exceptions and says where the list was cut', () => {
    const c = candidate({
      counterExampleTotal: 43,
      counterExamples: Array.from({ length: 8 }, (_, i) => ({
        subject: `Boat ${i}`,
        partner: 'Trailer',
        detail: 'names another brand',
        recommended: false,
      })),
    })
    expect(counterSay(c)).toContain('43 pairings disagree')
    expect(counterSay(c)).toContain('The first 8 are named here')
  })

  /* THE DENOMINATOR ARTEFACT. The rigging-membership figure read
     79.4 % until somebody noticed 16,267 of 20,640 "matches" were one
     sentinel agreeing with another. The screen prints what was
     excluded, per side, with the rule that fired. */
  it('prints what each side threw away, and which sentinel rule fired', () => {
    const lines = excludedSay(
      candidate({
        excluded: {
          left: {
            empty: 12,
            sentinel: 16267,
            sentinelRules: [{ label: 'NOT REQUIRED', count: 16267 }],
            untestable: 0,
            untestableWhy: null,
          },
          right: {
            empty: 0,
            sentinel: 0,
            sentinelRules: [],
            untestable: 10,
            untestableWhy: 'its “Series” names none of the boat groups',
          },
        },
      }),
    )
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('12 empty')
    expect(lines[0]).toContain('16,267 a stand-in for no value (NOT REQUIRED ×16,267)')
    expect(lines[0]).toContain('left out of the count')
    expect(lines[1]).toContain('10 present but untestable')
    expect(lines[1]).toContain('Untestable because its “Series” names none of the boat groups.')
  })

  it('says nothing about exclusions when nothing was excluded', () => {
    expect(excludedSay(base)).toEqual([])
  })

  it('reports a key’s second reading — how unique it is', () => {
    expect(
      uniquenessSay(
        candidate({
          uniqueness: { rows: 476, distinct: 459, duplicated: 13, examples: [], exampleTotal: 0 },
        }),
      ),
    ).toContain('459 different values over 476 rows')
    expect(uniquenessSay(base)).toBeNull()
  })

  /* THE TWO OUTRIGHT REFUSALS, both of which must arrive with a
     count and with names. */
  it('says how many rows admitting it would delete, by name', () => {
    const line = deleteSay(
      candidate({
        wouldDelete: { rows: 641, named: ['Highfield SP560', 'Stacer 429'], total: 641 },
      }),
    )
    expect(line).toContain('641 rows')
    expect(line).toContain('Highfield SP560')
    expect(line).toContain('639 more')
  })

  it('says when it would reject the business’s own recommendation', () => {
    const line = recommendationSay(candidate({ rejectsRecommendation: 4 }))
    expect(line).toContain('4 pairings')
    expect(line).toContain('refused whatever its rate')
    expect(recommendationSay(base)).toBeNull()
  })
})

/* ---------------------------------------------------------- */
/* 4 · EVERY BOUND SAYS WHAT IT WITHHELD                       */
/* ---------------------------------------------------------- */

describe('a bound that hides its own effect is indistinguishable from a bug', () => {
  it('counts every limit that withheld something', () => {
    const line = boundsSay({
      minTested: 20,
      thin: 3,
      maxCounterExamples: 8,
      maxPerShape: 12,
      incomparable: 8731,
      duplicates: 103,
      restated: 19,
      withheld: 271,
    })
    expect(line).toContain('8,731 pairs of numbers were never compared')
    expect(line).toContain('19 were declined')
    expect(line).toContain('103 findings reached twice')
    expect(line).toContain('fewer than 20 rows')
    expect(line).toContain('271 cleared their threshold')
  })

  it('says so plainly when nothing was held back', () => {
    expect(
      boundsSay({
        minTested: 20,
        thin: 0,
        maxCounterExamples: 8,
        maxPerShape: 12,
        incomparable: 0,
        duplicates: 0,
        restated: 0,
        withheld: 0,
      }),
    ).toBe('Nothing was held back from this run.')
  })
})

/* ---------------------------------------------------------- */
/* 5 · KEEPING ONE                                             */
/* ---------------------------------------------------------- */

describe('a kept pattern is an observation and can never be a filter', () => {
  beforeEach(() => {
    clearDecisions()
  })

  it('re-asserts the engine’s constant at the register end too', () => {
    expect(KEPT_MAY_PRUNE).toBe(false)
    expect(KEPT_MAY_PRUNE).toBe(MAY_PRUNE)
  })

  it('stores it as observed, with an enforcement that does not prune', () => {
    const stored = decisionFrom(base, 'kept')
    expect(stored.evidence).toBe('observed')
    expect(['warn', 'report']).toContain(stored.enforcement)
  })

  /* THE FIGURES ARE COPIED IN, not referenced. A person kept this
     sentence when it read 581 of 581; a later run over an edited
     price file may read differently, and the screen has to be able
     to say so rather than restate a new number as the agreed one. */
  it('keeps the measurement that earned the decision', () => {
    const stored = decisionFrom(base, 'kept')
    expect(stored.hits).toBe(581)
    expect(stored.tested).toBe(581)
    expect(stored.meanLeft).toBeCloseTo(0.0412, 4)
    expect(stored.catalogue).toBe(434)
  })

  it('carries no discrimination where the shape had none', () => {
    const stored = decisionFrom(candidate({ discrimination: null }), 'kept')
    expect(stored.meanLeft).toBeNull()
    expect(stored.catalogue).toBeNull()
  })

  it('records a decision against the candidate’s stable id, per organisation', () => {
    decide('northside', base, 'kept')
    expect(getDecisions('northside')).toHaveLength(1)
    expect(getDecisions('someone else')).toHaveLength(0)
  })

  it('keeps a dismissal dismissed, and takes it back on undo', () => {
    decide('northside', base, 'dismissed')
    expect(getDecisions('northside')[0].decision).toBe('dismissed')
    forget('northside', base.id)
    expect(getDecisions('northside')).toHaveLength(0)
  })

  it('re-deciding replaces rather than duplicates', () => {
    decide('northside', base, 'dismissed')
    decide('northside', base, 'kept')
    const list = getDecisions('northside')
    expect(list).toHaveLength(1)
    expect(list[0].decision).toBe('kept')
  })
})
