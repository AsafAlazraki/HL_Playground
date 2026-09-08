/* ============================================================
   ROLLUP — what the rail shows when one rule fires a hundred
   times.

   THE MEASUREMENT THIS FILE EXISTS FOR. Against the real price
   file — 53 tables, 15,691 rows — the engine returns 142
   findings, and 108 of them are ONE rule: `text-low-cardinality`,
   firing on 50 of the 53 tables. The rail grouped strictly by
   table, so the panel drew 53 group heads and 142 cards — 195
   blocks carrying 142 sentences, of which 108 taught the same
   lesson with a different noun in it.

   `docs/research/explaining-a-refusal.md` names that failure and
   names who commits it: conda's classic solver, which "lists the
   two conflicting specs flatly and tells you to go run
   `conda search --info` yourself" — the entry its map marks
   **reject**, under the line "this is what our refusals look like
   today if we stop improving them". A hundred identical sentences
   is not a report.

   TWO BORROWINGS, BOTH FROM THAT STUDY AND ITS SIBLING.

   1 · THE LEDGER — Figma's mixed-value enumeration
      (`dense-tables-and-selection.md`, the one row in its map
      marked "adopt — highest leverage here"). Figma's Selection
      colors panel "groups colors by variable, style, and normal
      fills, and each fill only appears once", with a target that
      selects every layer using that value: **mixed state is a set
      you can enumerate and act on, not an error state.** So the
      142 marks are enumerated as the seven rules that made them —
      ranked, counted, each one a door into its own findings.

   2 · THE COLLAPSE — pubgrub's `collapse_no_versions()`, the map
      row "simplify derived terms before printing … adopt if we
      chain". When one rule fires on eight columns of one table the
      engine hands us eight sentences that differ only in their
      figures. `collapseWhy` prints their shared stem and elides
      the middle, so the lesson is stated once and the per-column
      facts stay on the column. **Nothing is written here that the
      engine did not write:** every character of the collapsed
      sentence is a character of the findings' own prose. That
      matters, because a rule-level sentence hand-written in this
      feature would be a second copy of `rules.ts`'s knowledge
      with nothing keeping the two in step.

   THE COLLAPSE NEVER CUTS A WORD IN HALF. DESIGN_PRINCIPLES §3 —
   "nothing truncates mid-word" — so both ends back off to the
   nearest space before the join, and a stem too short to be a
   sentence is refused outright: the card then shows each finding's
   own `why` on its own line, which is honest rather than clever.
   ============================================================ */

import type { AccentKey, EntityDef } from '@/types/model'
import type { FindingSeverity, LintFinding } from '@/lib/lint'
import { ruleTitle } from './describe'

/** The sentinel `openRule` takes when a person asks for the wall anyway. */
export const EVERY_MARK = '*'

/** One rule, and everything it did to this sheet. */
export interface RuleRow {
  ruleId: string
  /** the rule's name, cased — never the engine's shouted constant */
  title: string
  severity: FindingSeverity
  count: number
  /** how many tables it fired on — the figure that says "systemic" */
  tables: number
}

/** Every finding of one rule against one table, drawn as one card. */
export interface Roll {
  key: string
  ruleId: string
  title: string
  severity: FindingSeverity
  findings: LintFinding[]
  /**
   * The lesson the whole roll shares, with the per-finding figures
   * elided. EMPTY when no honest stem exists — the card then falls
   * back to one sentence per line.
   */
  why: string
}

/** One table's marks, for whichever rule is open. */
export interface RollGroup {
  entityId: string
  name: string
  accent: AccentKey
  entity: EntityDef | undefined
  rolls: Roll[]
  count: number
  blockers: number
}

const SEV_RANK: Record<FindingSeverity, number> = { blocker: 0, advisory: 1 }

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/* ---------------------------------------------------------- */
/* The ledger                                                 */
/* ---------------------------------------------------------- */

/**
 * The rules that fired, ranked: what stops work first, then what
 * fired most. Ties break on the rule's name, so the ledger is stable
 * from one edit to the next and a row never jumps under the pointer.
 */
export function buildLedger(findings: readonly LintFinding[]): RuleRow[] {
  const map = new Map<string, { row: RuleRow; tables: Set<string> }>()
  for (const f of findings) {
    let e = map.get(f.ruleId)
    if (!e) {
      e = {
        row: {
          ruleId: f.ruleId,
          title: ruleTitle(f.title),
          severity: f.severity,
          count: 0,
          tables: 0,
        },
        tables: new Set<string>(),
      }
      map.set(f.ruleId, e)
    }
    e.row.count += 1
    /* a rule is as grave as the gravest thing it found */
    if (f.severity === 'blocker') e.row.severity = 'blocker'
    e.tables.add(f.entityId)
  }
  const rows: RuleRow[] = []
  for (const e of map.values()) {
    e.row.tables = e.tables.size
    rows.push(e.row)
  }
  rows.sort(
    (a, b) =>
      SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
      b.count - a.count ||
      cmp(a.title.toLowerCase(), b.title.toLowerCase()) ||
      cmp(a.ruleId, b.ruleId),
  )
  return rows
}

/**
 * Which rule the rail opens on, given what the person last picked.
 *
 * A pick that no longer fires — because they just fixed the last of
 * it — must not leave the rail staring at an empty body, so it falls
 * through to whatever is now worst. That is the whole reason this is
 * a function and not a `useState` initialiser.
 */
export function resolveOpenRule(
  ledger: readonly RuleRow[],
  picked: string | null,
): string | null {
  if (picked === EVERY_MARK) return EVERY_MARK
  if (picked !== null && ledger.some((r) => r.ruleId === picked)) return picked
  return ledger[0]?.ruleId ?? null
}

/* ---------------------------------------------------------- */
/* The collapse                                               */
/* ---------------------------------------------------------- */

/** Back off to the last space at or before `i`; 0 when there is none. */
function wordEnd(s: string, i: number): number {
  const cut = s.lastIndexOf(' ', i - 1)
  return cut <= 0 ? 0 : cut
}

/** Advance to the first space at or after `i`; the length when there is none. */
function wordStart(s: string, i: number): number {
  const cut = s.indexOf(' ', i)
  return cut < 0 ? s.length : cut
}

/** A stem shorter than this is not a sentence; refuse, and show them all. */
const STEM_FLOOR = 24

/**
 * The shared sentence of a set of `why`s, with the parts that differ
 * elided — pubgrub's term collapse, in prose.
 *
 * Returns '' when the set has no usable stem, which the caller reads
 * as "show every sentence".
 */
export function collapseWhy(whys: readonly string[]): string {
  if (whys.length === 0) return ''
  const first = whys[0]
  if (whys.length === 1) return first
  if (whys.every((w) => w === first)) return first

  /* the longest common head, snapped back to a word boundary */
  let head = 0
  const headMax = Math.min(...whys.map((w) => w.length))
  while (head < headMax && whys.every((w) => w[head] === first[head])) head += 1
  head = wordEnd(first, head)

  /* the longest common tail OF WHAT IS LEFT. Taking it from the
     remainders is what stops the two halves overlapping on a pair of
     sentences that are nearly identical. */
  const rest = whys.map((w) => w.slice(head))
  const restFirst = rest[0]
  let tail = 0
  const tailMax = Math.min(...rest.map((w) => w.length))
  while (
    tail < tailMax &&
    rest.every((w) => w[w.length - 1 - tail] === restFirst[restFirst.length - 1 - tail])
  )
    tail += 1
  const tailFrom = wordStart(restFirst, restFirst.length - tail)

  const prefix = first.slice(0, head).trim()
  const suffix = restFirst.slice(tailFrom).trim()
  if (prefix === '') return ''
  if (prefix.length + suffix.length < STEM_FLOOR) return ''
  if (suffix === '') return prefix
  return `${prefix} … ${suffix}`
}

/* ---------------------------------------------------------- */
/* The groups                                                 */
/* ---------------------------------------------------------- */

/**
 * The open rule's findings, grouped by table and rolled by rule.
 *
 * `EVERY_MARK` (or null) keeps every rule, which is the escape hatch
 * at the foot of the ledger — npm's `--force`, except this one states
 * its cost before you press it.
 *
 * Order is the one this rail already argued for and keeps: tables
 * carrying a blocker first, the name as the tie-break so nothing
 * jumps under the pointer.
 */
export function buildGroups(
  findings: readonly LintFinding[],
  entities: Record<string, EntityDef>,
  ruleId: string | null,
): RollGroup[] {
  const wanted =
    ruleId === null || ruleId === EVERY_MARK
      ? findings
      : findings.filter((f) => f.ruleId === ruleId)

  const map = new Map<string, RollGroup>()
  const rolls = new Map<string, Roll>()

  for (const f of wanted) {
    let g = map.get(f.entityId)
    if (!g) {
      const entity = entities[f.entityId]
      g = {
        entityId: f.entityId,
        name: entity?.name ?? 'Deleted table',
        accent: entity?.accent ?? 'graphite',
        entity,
        rolls: [],
        count: 0,
        blockers: 0,
      }
      map.set(f.entityId, g)
    }
    g.count += 1
    if (f.severity === 'blocker') g.blockers += 1

    const key = `${f.entityId}|${f.ruleId}`
    let roll = rolls.get(key)
    if (!roll) {
      roll = {
        key,
        ruleId: f.ruleId,
        title: ruleTitle(f.title),
        severity: f.severity,
        findings: [],
        why: '',
      }
      rolls.set(key, roll)
      g.rolls.push(roll)
    }
    roll.findings.push(f)
    if (f.severity === 'blocker') roll.severity = 'blocker'
  }

  for (const roll of rolls.values()) {
    roll.why = collapseWhy(roll.findings.map((f) => f.why))
  }

  for (const g of map.values()) {
    g.rolls.sort(
      (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || cmp(a.ruleId, b.ruleId),
    )
  }

  return [...map.values()].sort(
    (a, b) =>
      (b.blockers > 0 ? 1 : 0) - (a.blockers > 0 ? 1 : 0) ||
      cmp(a.name.trim().toLowerCase(), b.name.trim().toLowerCase()) ||
      cmp(a.entityId, b.entityId),
  )
}
