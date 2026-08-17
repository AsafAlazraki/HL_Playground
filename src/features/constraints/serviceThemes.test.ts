/* ============================================================
   THE SERVICE AND REGISTRATION THEMES — the invariants that keep
   these two surfaces honest.

   Separate from `workbookRules.test.ts` on purpose: that file owns
   the properties EVERY seed must have, and this one owns the two
   things `docs/specs/SERVICE_AND_THEMES.md` §5.4 asked for
   specifically — that both new seeds exist, and that neither ever
   quietly starts running.

   And the left-out register, whose one invariant is the whole reason
   it exists: a decision with no measurement on it is indistinguishable
   from a shrug.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import {
  CAME_IN,
  LEFT_OUT,
  RATE_COMMITMENT,
  leftOutArtefacts,
  leftOutSubstantive,
} from './leftOut'
import { WORKBOOK_RULES } from './workbookRules'

const seed = (ref: string) => WORKBOOK_RULES.find((r) => r.ref === ref)

describe('the two seeds SERVICE_AND_THEMES §5.4 specifies', () => {
  it('carries both, and both are ASSERTED', () => {
    for (const ref of ['S1', 'S2']) {
      const s = seed(ref)
      expect(s, `${ref} is missing`).toBeDefined()
      expect(s?.evidence).toBe('asserted')
      expect(s?.source).toContain('ASSERTED')
    }
  })

  it('states the trailer band rule against the columns it actually names', () => {
    const s = seed('S1')
    expect(s?.statement).toBe("A trailer's registration band must match its ATM.")
    /* Single-kind and both columns exist — which is exactly why the
       blocker has to say WHY it is blocked, rather than falling back
       on the cross-kind wall the other seeds hit. */
    expect(s?.needs).toEqual(['trailer::rego type', 'trailer::atm (kg)'])
    expect(s?.source).toContain('Trailer Module!BY')
    expect(s?.source).toContain('ATM (KG)')
    /* The nine, and the $117 — the measurement that makes it a
       decision to WAIT rather than a rule nobody got round to. */
    expect(s?.source).toContain('$117')
    expect(s?.source).toMatch(/60, 61, 224–227, 398, 401, 403/)
  })

  it('states the one-fee-one-column divergence with both ordinals', () => {
    const s = seed('S2')
    expect(s?.statement).toBe('One registration fee must be read at one column.')
    expect(s?.source).toContain('283.00')
    expect(s?.source).toContain('282.19')
    expect(s?.source).toContain('ordinal 9')
    expect(s?.source).toContain('ordinal 8')
  })

  it('keeps both BLOCKED, and blocked ON PURPOSE rather than for want of a contract', () => {
    for (const ref of ['S1', 'S2']) {
      const s = seed(ref)
      /* THE DAY THIS FAILS, somebody has made one of them run. That is
         allowed — but not by accident, and not without reading §5.4
         first: S1 pruning would delete nine trailers the dealer is
         selling, and S2 has no row to fail. */
      expect(s?.blocked, `${ref} lost its blocker`).toBeTruthy()
      expect(s?.build, `${ref} gained a builder`).toBeUndefined()
      expect(s?.plainly, `${ref} has no plain reason`).toBeTruthy()
    }
  })

  it('points both at the surface that DOES run them, so neither reads as unprotected', () => {
    /* §3.1: "Offer it as a check that shows the nine and changes
       none." A blocked seed with nowhere to point reads on the pane as
       "Not checked yet", which would be false here — the check runs,
       it just reports instead of enforcing. */
    for (const ref of ['S1', 'S2']) {
      expect(seed(ref)?.enforcedIn).toContain('Registration')
    }
  })
})

describe('the register of what was left out', () => {
  it('puts a measurement on every decision', () => {
    expect(LEFT_OUT.length).toBeGreaterThan(0)
    for (const r of LEFT_OUT) {
      /* A judgement with no number on it is a preference, and a
         preference on this screen is the thing the owner objects to. */
      expect(r.measured, `${r.what} was left out without a measurement`).toMatch(/\d/)
      expect(r.why.trim(), `${r.what} has no reason`).toBeTruthy()
      expect(r.source.trim(), `${r.what} cites nothing`).toBeTruthy()
      expect(['out', 'later']).toContain(r.verdict)
    }
  })

  it('makes every "not yet" say what it is waiting for', () => {
    /* `later` without a trigger is a promise, and a promise on a
       decision register is how a decision turns back into a gap. */
    for (const r of LEFT_OUT) {
      if (r.verdict !== 'later') continue
      expect(r.reopensWhen?.trim(), `${r.what} waits for nothing nameable`).toBeTruthy()
    }
  })

  it('records the service schedule as a decision, with the fault that decided it', () => {
    const schedule = LEFT_OUT.find((r) => r.what.startsWith('The service schedule'))
    expect(schedule, 'the 157-row service schedule is not recorded anywhere').toBeDefined()
    expect(schedule?.verdict).toBe('out')
    /* The two things that make it a judgement: it is a rule written
       out 1,727 times, and its 1,000-hour cost is wrong by ~20 % on
       every one of the 157 models. */
    expect(schedule?.why).toContain('1,727')
    expect(schedule?.measured).toContain('19.5 %')
    expect(schedule?.measured).toContain('20.6 %')
    expect(schedule?.reopensWhen?.trim()).toBeTruthy()
  })

  it('splits what a person would look for from what Excel left behind', () => {
    expect(leftOutSubstantive().length + leftOutArtefacts().length).toBe(LEFT_OUT.length)
    expect(leftOutSubstantive().length).toBeGreaterThan(leftOutArtefacts().length)
    for (const r of leftOutArtefacts()) expect(r.artefact).toBe(true)
  })

  it('says what DID come in, and names a real table so the count is read', () => {
    /* 30 MB in, 45 rows out. That ratio is the finding — and the
       counts beside it are looked up in the live project, never typed
       here, so a nineteenth labour rate cannot leave a wrong number on
       screen with nothing to correct it. */
    expect(CAME_IN.length).toBe(3)
    const seeded = new Set(
      buildNorthsideProject().entities.map((e) => e.name.trim().toLowerCase()),
    )
    for (const r of CAME_IN) {
      expect(r.rowNoun.trim()).toBeTruthy()
      expect(seeded.has(r.tableName.toLowerCase()), `${r.tableName} is not a table`).toBe(true)
    }
  })

  it('carries the commitment that made those three tables, with its receipt', () => {
    /* SERVICE_AND_THEMES §2.6: "A rate is a row in a table, never a
       constant in code." The receipt is what stops it reading as
       fastidiousness — 1,434 live links against 571 pasted copies, in
       one column of the business's own file. */
    expect(RATE_COMMITMENT.says).toContain('row in a table')
    expect(RATE_COMMITMENT.measured).toContain('1,434')
    expect(RATE_COMMITMENT.measured).toContain('571')
    expect(RATE_COMMITMENT.source).toContain('§2.6')
  })
})
