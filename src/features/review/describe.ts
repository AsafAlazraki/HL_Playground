/* ============================================================
   Shared copy helpers — how a mark names the thing it marks.
   Pure functions so every surface (panel, badge, field mark)
   phrases the same finding identically.
   ============================================================ */

import type { EntityDef } from '@/types/model'
import type { FindingSeverity, LintFinding } from '@/lib/lint'

/** Field names a finding points at, in schema order, skipping deleted ids. */
export function fieldNamesOf(finding: LintFinding, entity: EntityDef | undefined): string[] {
  if (!entity || !finding.fieldIds?.length) return []
  const wanted = new Set(finding.fieldIds)
  return entity.fields.filter((f) => wanted.has(f.id)).map((f) => f.name)
}

/** 'Customer · Customer Email, Customer Phone' — the mark's address on the sheet. */
export function targetLine(finding: LintFinding, entity: EntityDef | undefined): string {
  const name = entity?.name ?? 'Deleted entity'
  const fields = fieldNamesOf(finding, entity)
  if (fields.length === 0) return name
  if (fields.length <= 3) return `${name} · ${fields.join(', ')}`
  return `${name} · ${fields.slice(0, 2).join(', ')} +${fields.length - 2} more`
}

/* ============================================================
   THE RULE'S NAME, SET AS A NAME.

   `src/lib/lint/rules.ts` writes every title in capitals —
   'PLURAL ENTITY NAME', 'FREE TEXT, FEW VALUES' — because the
   outgoing design stamped them in 11px uppercase mono and the
   data was shaped to fit the drawing. Uppercase is a LABEL style
   and never a name style, and these are names: 'REPEATING
   COLUMNS' and 'COPY INSTEAD OF LINK' are the two-word titles of
   fifteen rules, and shouting all fifteen at somebody is what a
   rail of ten findings used to do.

   Casing them here rather than in the rule table is deliberate:
   the titles are machine-authored constants, not anything a
   dealer typed, so nothing about their data is lost by lowering
   them — the very thing that makes uppercasing CONTENT lossy is
   what makes this safe. And the fix stays inside the feature that
   draws them, which is the file this pass is allowed to write.
   ============================================================ */

/** 'PLURAL ENTITY NAME' → 'Plural entity name'. Any title that is
 *  not entirely capitals is already cased and is left alone. */
export function ruleTitle(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed !== trimmed.toUpperCase()) return trimmed
  const lower = trimmed.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** What this mark is, as one word a reader can scan a rail for. */
export function severityWord(severity: FindingSeverity): string {
  return severity === 'blocker' ? 'Blocker' : 'Advisory'
}

/** '1 mark' / '7 marks' — the reviewer counts in the singular too.
 *  Sentence case, because it is read inside sentences. */
export function marksLabel(total: number): string {
  return total === 1 ? '1 mark' : `${total} marks`
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Multi-line `title=` tooltip for the compact badge. */
export function badgeTooltip(
  findings: LintFinding[],
  counts: { blockers: number; advisories: number; total: number },
): string {
  const head =
    counts.blockers > 0
      ? `${marksLabel(counts.total)} — ${pluralize(counts.blockers, 'blocker', 'blockers')}, ${pluralize(counts.advisories, 'advisory', 'advisories')}`
      : `${marksLabel(counts.total)} — ${pluralize(counts.advisories, 'advisory', 'advisories')}`
  const shown = findings.slice(0, 4).map((f) => `• ${ruleTitle(f.title)}`)
  const rest = findings.length - shown.length
  if (rest > 0) shown.push(`• +${rest} more`)
  return [head, ...shown].join('\n')
}
