/* ============================================================
   THE MEASUREMENT, BANKED.

   `ReviewPanel.tsx` and `rollup.ts` both open on a figure — 142
   findings, 108 of them one rule, 195 blocks drawn to say it —
   and a figure written in a comment is a figure that goes stale
   the first time somebody edits a rule. So the numbers are
   asserted here against the real price file. If one of these
   fails, the panel's own header is now wrong: re-measure and
   rewrite it, do not relax the assertion.

   The invariants below matter more than the figures. A roll must
   never lose a finding, and the ledger must always account for
   every one of them — a panel that quietly drops a mark is worse
   than the wall it replaced.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef } from '@/types/model'
import type { LintFinding } from '@/lib/lint'
import { lintProject } from '@/lib/lint'
import { buildNorthsideProject } from '@/demos/northside'
import { EVERY_MARK, buildGroups, buildLedger, collapseWhy, resolveOpenRule } from './rollup'

/* ---------------------------------------------------------- */
/* collapseWhy — pubgrub's term collapse, in prose             */
/* ---------------------------------------------------------- */

describe('collapseWhy', () => {
  it('returns the sentence unchanged when there is only one', () => {
    expect(collapseWhy(['Free text invites typos.'])).toBe('Free text invites typos.')
  })

  it('returns the sentence unchanged when every one is identical', () => {
    const w = 'This table links to nothing else on the sheet.'
    expect(collapseWhy([w, w, w])).toBe(w)
  })

  it('elides only the part that differs', () => {
    const out = collapseWhy([
      'Free text invites typos, and this field repeats the same 1 value across 16 rows — a fixed choice list keeps every entry consistent.',
      'Free text invites typos, and this field repeats the same 3 values across 42 rows — a fixed choice list keeps every entry consistent.',
    ])
    expect(out).toBe(
      'Free text invites typos, and this field repeats the same … rows — a fixed choice list keeps every entry consistent.',
    )
  })

  /* DESIGN_PRINCIPLES §3 — nothing truncates mid-word. The naive
     longest-common-prefix of these two ends inside "value", and
     "…the same 1 valu …" is the exact failure that rule names. */
  it('never cuts a word in half', () => {
    const out = collapseWhy([
      'It repeats the same value twice over.',
      'It repeats the same values twice over.',
    ])
    expect(out).not.toMatch(/valu …/)
    for (const word of out.split(' ')) {
      if (word === '…') continue
      expect(['It', 'repeats', 'the', 'same', 'value', 'values', 'twice', 'over.']).toContain(word)
    }
  })

  it('refuses a stem too short to be a sentence', () => {
    expect(collapseWhy(['Alpha beta gamma delta.', 'Zeta eta theta iota.'])).toBe('')
  })
})

/* ---------------------------------------------------------- */
/* Fixtures                                                   */
/* ---------------------------------------------------------- */

const finding = (
  ruleId: string,
  entityId: string,
  fieldId: string,
  severity: 'blocker' | 'advisory',
  title: string,
  why = 'because.',
): LintFinding => ({
  id: `${ruleId}:${entityId}:${fieldId}`,
  ruleId,
  severity,
  entityId,
  fieldIds: [fieldId],
  title,
  why,
})

const entity = (id: string, name: string): EntityDef =>
  ({ id, name, fields: [], accent: 'graphite' }) as unknown as EntityDef

describe('buildLedger', () => {
  const set = [
    finding('text-low-cardinality', 'a', 'f1', 'advisory', 'FREE TEXT, FEW VALUES'),
    finding('text-low-cardinality', 'b', 'f2', 'advisory', 'FREE TEXT, FEW VALUES'),
    finding('text-low-cardinality', 'b', 'f3', 'advisory', 'FREE TEXT, FEW VALUES'),
    finding('field-dup-name', 'c', 'f4', 'blocker', 'DUPLICATE FIELD NAME'),
  ]

  it('ranks what stops work ahead of what merely fired most', () => {
    const rows = buildLedger(set)
    expect(rows.map((r) => r.ruleId)).toEqual(['field-dup-name', 'text-low-cardinality'])
  })

  it('counts the marks and the tables separately', () => {
    const rows = buildLedger(set)
    const tlc = rows.find((r) => r.ruleId === 'text-low-cardinality')
    expect(tlc?.count).toBe(3)
    expect(tlc?.tables).toBe(2)
  })

  it('cases the rule name rather than shouting the engine constant', () => {
    expect(buildLedger(set)[0].title).toBe('Duplicate field name')
  })
})

describe('resolveOpenRule', () => {
  const ledger = buildLedger([
    finding('field-dup-name', 'c', 'f4', 'blocker', 'DUPLICATE FIELD NAME'),
    finding('entity-plural', 'a', 'f1', 'advisory', 'PLURAL ENTITY NAME'),
  ])

  it('opens on the worst rule when nothing has been picked', () => {
    expect(resolveOpenRule(ledger, null)).toBe('field-dup-name')
  })

  it('keeps a pick that still fires', () => {
    expect(resolveOpenRule(ledger, 'entity-plural')).toBe('entity-plural')
  })

  /* THE CASE THIS FUNCTION EXISTS FOR: you fixed the last of the rule
     you were looking at, and the rail must not sit on an empty body. */
  it('falls through to the worst rule when the pick stops firing', () => {
    expect(resolveOpenRule(ledger, 'text-low-cardinality')).toBe('field-dup-name')
  })

  it('honours the escape hatch', () => {
    expect(resolveOpenRule(ledger, EVERY_MARK)).toBe(EVERY_MARK)
  })

  it('has nothing to open on a clean sheet', () => {
    expect(resolveOpenRule([], null)).toBeNull()
  })
})

describe('buildGroups', () => {
  const entities: Record<string, EntityDef> = {
    a: entity('a', 'Alpha'),
    b: entity('b', 'Bravo'),
  }
  const set = [
    finding('text-low-cardinality', 'a', 'f1', 'advisory', 'FREE TEXT, FEW VALUES'),
    finding('text-low-cardinality', 'a', 'f2', 'advisory', 'FREE TEXT, FEW VALUES'),
    finding('text-low-cardinality', 'a', 'f3', 'advisory', 'FREE TEXT, FEW VALUES'),
    finding('field-dup-name', 'b', 'f4', 'blocker', 'DUPLICATE FIELD NAME'),
  ]

  it('draws one card for one rule however many columns it caught', () => {
    const groups = buildGroups(set, entities, 'text-low-cardinality')
    expect(groups).toHaveLength(1)
    expect(groups[0].rolls).toHaveLength(1)
    expect(groups[0].rolls[0].findings).toHaveLength(3)
    expect(groups[0].count).toBe(3)
  })

  it('narrows to the open rule and nothing else', () => {
    expect(buildGroups(set, entities, 'field-dup-name')[0].name).toBe('Bravo')
  })

  it('puts the table carrying a blocker first', () => {
    const groups = buildGroups(set, entities, EVERY_MARK)
    expect(groups.map((g) => g.name)).toEqual(['Bravo', 'Alpha'])
  })

  it('never loses a finding', () => {
    const groups = buildGroups(set, entities, EVERY_MARK)
    const seen = groups.flatMap((g) => g.rolls.flatMap((r) => r.findings.map((f) => f.id)))
    expect(new Set(seen).size).toBe(set.length)
  })
})

/* ---------------------------------------------------------- */
/* The real price file                                        */
/* ---------------------------------------------------------- */

describe('the rail against Northside Marine', () => {
  const project = buildNorthsideProject()
  const entities: Record<string, EntityDef> = {}
  for (const e of project.entities) entities[e.id] = e
  const findings = lintProject({ entities, rowsByEntity: project.rowsByEntity })
  const ledger = buildLedger(findings)

  /* the figures the panel's header quotes */
  it('is the sheet the header describes', () => {
    expect(project.entities).toHaveLength(53)
    expect(findings).toHaveLength(142)
  })

  it('is drowned by one rule, and the ledger says so in one row', () => {
    const worst = [...ledger].sort((a, b) => b.count - a.count)[0]
    expect(worst.ruleId).toBe('text-low-cardinality')
    expect(worst.count).toBe(108)
    expect(worst.tables).toBe(50)
    expect(ledger).toHaveLength(7)
  })

  it('accounts for every mark exactly once', () => {
    expect(ledger.reduce((n, r) => n + r.count, 0)).toBe(findings.length)
  })

  /* BEFORE: one card per finding inside one group per table.
     AFTER: the ledger, then the open rule's groups and rolls. */
  it('draws twelve blocks where it drew a hundred and ninety-five', () => {
    const tables = new Set(findings.map((f) => f.entityId)).size
    const before = tables + findings.length
    expect(before).toBe(195)

    const open = resolveOpenRule(ledger, null)
    const groups = buildGroups(findings, entities, open)
    const rolls = groups.reduce((n, g) => n + g.rolls.length, 0)
    /* the seven rule rows plus the escape hatch, then the open
       rule's group heads and its cards */
    const after = ledger.length + 1 + groups.length + rolls
    expect(after).toBe(12)
  })

  it('holds the worst case under the wall it replaced', () => {
    const groups = buildGroups(findings, entities, 'text-low-cardinality')
    const rolls = groups.reduce((n, g) => n + g.rolls.length, 0)
    expect(groups).toHaveLength(50)
    expect(rolls).toBe(50)
    expect(ledger.length + 1 + groups.length + rolls).toBe(108)
  })

  /* THE SENTENCE COUNT IS THE POINT. 142 `why`s, 108 of them the
     same lesson, become 81 — one per card, plus the two that one
     roll keeps because its findings share no honest stem and the
     collapse refused rather than invent one. That refusal is the
     design, so the number is 81 and not 80. */
  it('states each lesson once per table instead of once per column', () => {
    const groups = buildGroups(findings, entities, EVERY_MARK)
    const rolls = groups.flatMap((g) => g.rolls)
    expect(rolls).toHaveLength(80)
    const sentences = rolls.reduce(
      (n, r) => n + (r.why === '' ? r.findings.length : 1),
      0,
    )
    expect(sentences).toBe(81)
    expect(rolls.filter((r) => r.why === '' && r.findings.length > 1)).toHaveLength(1)
  })

  it('collapses the drowning rule into a stem rather than dropping it', () => {
    const groups = buildGroups(findings, entities, 'text-low-cardinality')
    const rolled = groups.find((g) => g.rolls[0].findings.length > 1)
    expect(rolled).toBeDefined()
    const why = rolled?.rolls[0].why ?? ''
    expect(why).not.toBe('')
    expect(why).toContain('Free text')
    expect(why).toContain('choice list')
  })
})
