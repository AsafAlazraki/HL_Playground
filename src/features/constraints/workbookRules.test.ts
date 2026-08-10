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
})
