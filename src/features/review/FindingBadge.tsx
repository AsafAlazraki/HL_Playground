/* ============================================================
   FindingBadge — the mark a reviewer leaves in the margin of a
   drawing. Sits on a WHITE entity card that is itself pinned to
   the navy canvas, so it stays in chrome inks (--red / --red-wash)
   and never touches --canvas-* tokens.

   Non-interactive by design: the card underneath it is already
   the click target on the whiteboard, so the badge reports rather
   than competes. The full list of marks rides along in `title`.
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
      <span className="rv-badge-tick" aria-hidden="true" />
      <span className="rv-badge-count">{total}</span>
    </span>
  )
}
