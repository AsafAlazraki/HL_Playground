/* ============================================================
   THE WORKBOOK SEEDS — the properties that make re-seeding safe.

   `seedWorkbookConstraints()` is called on every load and on every
   change to the tables. It is safe only because a seed's id is
   DETERMINISTIC: the ledger recognises a rule it has already offered
   and leaves the user's edit, their switch position, or their
   deletion alone. An id built with `newId()` — or two seeds sharing
   one — turns that into a duplicate on every reload.

   Those ids cannot be round-tripped through the seeder today: all
   six admitted rules are `blocked` on the constraint contract, so
   `buildWorkbookConstraints()` correctly returns nothing and there
   is no seeded rule to read back. What CAN be asserted now is the
   invariant the round-trip would rest on, and the seeder's refusal
   to invent a rule it cannot state.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import {
  buildWorkbookConstraints,
  clauseId,
  WORKBOOK_RULES,
  WORKBOOK_RULES_BLOCKED,
  WORKBOOK_RULES_REFUTED,
} from './workbookRules'

describe('workbook rule seeds', () => {
  it('gives every seed an id that is unique and stable, never a fresh one', () => {
    const ids = WORKBOOK_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id.startsWith('wb:')).toBe(true)
  })

  it('derives clause ids from the seed, so a re-seed is byte-identical', () => {
    expect(clauseId('wb:x', 'if', 0)).toBe('wb:x#if0')
    expect(clauseId('wb:x', 'if', 0)).toBe(clauseId('wb:x', 'if', 0))
    expect(clauseId('wb:x', 'then', 0)).not.toBe(clauseId('wb:x', 'if', 0))
  })

  it('lets no seed be both unbuildable and unexplained', () => {
    for (const seed of WORKBOOK_RULES) {
      const stated = typeof seed.build === 'function'
      const explained = !!seed.blocked?.trim()
      expect(stated || explained).toBe(true)
    }
  })

  it('builds nothing at all while every admitted rule is still blocked', () => {
    /* This will fail the day a seed gains a `build` — deliberately.
       That is the day someone must write the real round-trip test:
       seed twice, and prove the second call reports alreadySeeded
       and creates nothing. */
    expect(WORKBOOK_RULES_BLOCKED).toHaveLength(WORKBOOK_RULES.length)
    expect(buildWorkbookConstraints({})).toEqual([])
  })

  /* ----------------------------------------------------------
     THE PROVENANCE INVARIANTS.

     These are not style checks. Every one of them is a way the
     file could start lying while still compiling, and the whole
     value of the Business rules pane is that what it prints can
     be trusted without opening the workbook.
     ---------------------------------------------------------- */

  it('never leaves a blocked rule unexplained to a person', () => {
    /* `blocked` is written for whoever will implement the missing
       contract; `plainly` is the one line a sales manager can act
       on. WorkbookRuleList prints the second, so a seed with only
       the first reaches the screen as an unexplained "Not checked
       yet" — which is what makes a person distrust the list. */
    for (const seed of WORKBOOK_RULES) {
      if (!seed.blocked) continue
      expect(seed.plainly?.trim(), `${seed.ref} has no plain-English reason`).toBeTruthy()
    }
  })

  it('makes every seed cite where it came from and what kind of evidence it is', () => {
    for (const seed of WORKBOOK_RULES) {
      expect(seed.source.trim(), `${seed.ref} cites no source`).toBeTruthy()
      expect(['asserted', 'observed']).toContain(seed.evidence)
      /* the label has to be on the string the CARD prints, not only
         in the type — the reader of the pane never sees the type */
      const label = seed.evidence === 'observed' ? 'OBSERVED' : 'ASSERTED'
      expect(seed.source, `${seed.ref} does not say ${label} where a person can see it`).toContain(
        label,
      )
    }
  })

  it('puts a measured rate on every OBSERVED rule, and never the word "usually"', () => {
    /* An observation strong enough to act on is one you can put a
       number on. F7 is 0 of 7,830; F12 is 1,196 of 1,196. */
    for (const seed of WORKBOOK_RULES) {
      if (seed.evidence !== 'observed') continue
      expect(seed.source, `${seed.ref} is OBSERVED with no numbers`).toMatch(/\d/)
    }
    for (const seed of WORKBOOK_RULES) {
      expect(seed.source.toLowerCase()).not.toContain('usually')
      expect(seed.statement.toLowerCase()).not.toContain('usually')
    }
  })

  it('keeps the refuted candidates out of the seeds, and keeps their numbers', () => {
    /* A refutation with a number on it is a finding; the absence of
       one is an invitation to guess again. These must stay
       measurable and must never be seeded — a refuted rule shown on
       the pane as "not checked yet" would read as a promise. */
    expect(WORKBOOK_RULES_REFUTED.length).toBeGreaterThan(0)
    const seedIds = new Set(WORKBOOK_RULES.map((r) => r.id))
    for (const refuted of WORKBOOK_RULES_REFUTED) {
      expect(refuted.measured, `${refuted.candidate} is refuted without a measurement`).toMatch(
        /\d/,
      )
      expect(refuted.verdict.trim()).toBeTruthy()
      expect(refuted.source.trim()).toBeTruthy()
      expect(seedIds.has(refuted.candidate)).toBe(false)
    }
  })
})
