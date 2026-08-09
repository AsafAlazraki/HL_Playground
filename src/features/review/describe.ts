/* ============================================================
   Shared copy helpers — how a mark names the thing it marks.
   Pure functions so every surface (panel, badge, field mark)
   phrases the same finding identically.
   ============================================================ */

import type { EntityDef } from '@/types/model'
import type { LintFinding } from '@/lib/lint'

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

/** 'MARK' / '7 MARKS' — the reviewer counts in the singular too. */
export function marksLabel(total: number): string {
  return total === 1 ? '1 MARK' : `${total} MARKS`
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
  const shown = findings.slice(0, 4).map((f) => `• ${f.title}`)
  const rest = findings.length - shown.length
  if (rest > 0) shown.push(`• +${rest} more`)
  return [head, ...shown].join('\n')
}
