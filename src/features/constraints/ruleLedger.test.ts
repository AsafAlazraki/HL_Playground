/* ============================================================
   THE LEDGER'S GUARD — no figure reaches the screen that is not
   already written on the rule it belongs to.

   This is the test the project actually needed. The Business rules
   page now leads with a MEASURED RATE on every card, which is the
   right thing to lead with and also the easiest thing in the app to
   fake: "581 of 581" and "573 of 584" look identical to a reader and
   only one of them is a fact. The one time a rule was typed in to fill
   a card on this project, the reaction was "where the hell are you
   inventing these rules from".

   So the figures on screen are checked against the adjudication's own
   sentence — `WorkbookRuleSeed.source`, which quotes the workbook, the
   sheet, the cell and the rate. If a number is not in that sentence,
   in the digits the adjudication wrote it in, this test fails.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { RULE_GROUPS, RULE_LEDGER, holdRate, ledgerFor } from './ruleLedger'
import { WORKBOOK_RULES } from './workbookRules'

/** The adjudication writes thousands with a comma — "1,424", "3,905".
 *  A figure has to appear the way it was written to count as cited. */
const grouped = (n: number): string => n.toLocaleString('en-US')

/** Both spellings, because the sheet's smaller counts are written bare:
 *  "581 of 581", "530 of 530". */
const spellings = (n: number): string[] =>
  Array.from(new Set([String(n), grouped(n)]))

const seedOf = (ref: string) => WORKBOOK_RULES.find((s) => s.ref === ref)

describe('the rule ledger', () => {
  it('covers every workbook rule exactly once', () => {
    const refs = RULE_LEDGER.map((e) => e.ref)
    expect(new Set(refs).size).toBe(refs.length)
    expect([...refs].sort()).toEqual([...WORKBOOK_RULES.map((s) => s.ref)].sort())
  })

  it('puts every rule in a group that exists', () => {
    const ids = new Set(RULE_GROUPS.map((g) => g.id))
    for (const entry of RULE_LEDGER) expect(ids.has(entry.group)).toBe(true)
  })

  it('leaves no group empty — a heading with nothing under it is a lie about the file', () => {
    for (const group of RULE_GROUPS) {
      expect(RULE_LEDGER.some((e) => e.group === group.id)).toBe(true)
    }
  })

  /* ---------------------------------------------------------- */

  it('cites every denominator in the rule’s own source line', () => {
    for (const entry of RULE_LEDGER) {
      if (!entry.measure) continue
      const seed = seedOf(entry.ref)
      expect(seed, `no seed for ${entry.ref}`).toBeDefined()
      const source = seed!.source
      const found = spellings(entry.measure.tested).some((s) => source.includes(s))
      expect(
        found,
        `${entry.ref}: denominator ${entry.measure.tested} is not in the seed's source line`,
      ).toBe(true)
    }
  })

  it('cites every numerator — or the shortfall the adjudication counted instead', () => {
    for (const entry of RULE_LEDGER) {
      if (!entry.measure) continue
      const { held, tested } = entry.measure
      const source = seedOf(entry.ref)!.source
      const short = tested - held
      const found =
        spellings(held).some((s) => source.includes(s)) ||
        spellings(short).some((s) => source.includes(s))
      expect(
        found,
        `${entry.ref}: neither ${held} nor the shortfall ${short} is in the seed's source line`,
      ).toBe(true)
    }
  })

  it('agrees with every rate the adjudication states in words', () => {
    /* Where the source line quotes a percentage, the percentage this
       app DERIVES from held ÷ tested has to be the same one. This is
       the check that would have caught a numerator lifted from the
       wrong sentence: the digits would still be present in the source
       and the arithmetic would not survive. */
    for (const entry of RULE_LEDGER) {
      if (!entry.measure || entry.measure.tested === 0) continue
      const source = seedOf(entry.ref)!.source
      const derived = ((entry.measure.held / entry.measure.tested) * 100).toFixed(2)
      /* Only assert where the source states THIS rate; several lines
         quote a different one — a discrimination share, an override
         rate — and those are not this figure. */
      if (source.includes(`${derived} %`) || source.includes(`${derived}%`)) {
        const trimmed = derived.endsWith('.00') ? derived.slice(0, -3) : derived
        expect(holdRate(entry.measure)).toBe(`${trimmed}%`)
      }
    }
  })

  it('never claims a rule holds on more rows than it was tested on', () => {
    for (const entry of RULE_LEDGER) {
      if (!entry.measure) continue
      expect(entry.measure.held).toBeLessThanOrEqual(entry.measure.tested)
      expect(entry.measure.held).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives a rule without a rate something the workbook asserts instead', () => {
    /* A4 is a formula, A6 a divider label, S1 and S2 are measured live
       or reported rather than rated. None of them may be silent — a
       card with neither a figure nor an assertion is a card that says
       nothing. */
    for (const entry of RULE_LEDGER) {
      if (entry.measure) continue
      const hasSomething = Boolean(entry.asserts) || Boolean(entry.caveat)
      expect(hasSomething, `${entry.ref} has neither a measure nor an assertion`).toBe(true)
    }
  })

  it('puts a qualification on every rule, because a bare rate is a half-truth', () => {
    for (const entry of RULE_LEDGER) {
      expect(entry.caveat.length, `${entry.ref} has no caveat`).toBeGreaterThan(20)
    }
  })

  /* ---------------------------------------------------------- */

  it('formats a whole rate without decimal noise, and a partial one to two places', () => {
    expect(holdRate({ held: 581, tested: 581, of: '' })).toBe('100%')
    expect(holdRate({ held: 3902, tested: 3905, of: '' })).toBe('99.92%')
    expect(holdRate({ held: 555, tested: 571, of: '' })).toBe('97.20%')
    expect(holdRate({ held: 0, tested: 0, of: '' })).toBe('—')
  })

  it('answers for a rule it knows and says so for one it does not', () => {
    expect(ledgerFor('F8')?.group).toBe('trailers')
    expect(ledgerFor('S2')?.group).toBe('registration')
  })
})
