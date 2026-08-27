/* ============================================================
   FindingBadge — the count of marks against one table, drawn on
   that table's own card on the sheet.

   IT SAYS WHICH KIND, NOT JUST HOW MANY. A blocker badge and an
   advisory badge were the same red circle with a different fill,
   which meant the one thing a person scanning fifty cards needs
   to know — is anything here actually broken — took a hover and a
   tooltip. It now takes `--danger` or `--warning`, the same two
   hues the rail uses, so the sheet and the rail agree at a
   glance.

   THE HAND-DRAWN PENCIL CIRCLE IS GONE. It was two irregular
   border-radii and a second looser stroke, drawn to look like a
   reviewer's pen on a paper drawing — costume from a design that
   has been replaced. A count is a figure; it is set in mono, in a
   pill, and it stops.

   Non-interactive by design: the card underneath it is already
   the click target, so the badge reports rather than competes.
   The full list of marks rides along in `title`.
   ============================================================ */

import type { JSX } from 'react'
import { useEntityFindings } from './useLintFindings'
import { badgeTooltip, marksLabel, pluralize } from './describe'
import './review.css'

/** Compact red-pencil count badge. Renders null when the entity is clean. */
export function FindingBadge({ entityId }: { entityId: string }): JSX.Element | null {
  const findings = useEntityFindings(entityId)
  if (findings.length === 0) return null

  let blockers = 0
  for (const f of findings) if (f.severity === 'blocker') blockers += 1
  const total = findings.length
  const advisories = total - blockers
  const counts = { blockers, advisories, total }

  const label =
    blockers > 0
      ? `${marksLabel(total)}: ${pluralize(blockers, 'blocker', 'blockers')}, ${pluralize(advisories, 'advisory', 'advisories')}`
      : `${marksLabel(total)}: ${pluralize(advisories, 'advisory', 'advisories')}`

  return (
    <span
      className="rv-badge"
      data-severity={blockers > 0 ? 'blocker' : 'advisory'}
      title={badgeTooltip(findings, counts)}
      aria-label={label}
      role="img"
    >
      <span className="rv-badge-count">{total}</span>
    </span>
  )
}
