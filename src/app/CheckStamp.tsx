/* OFF THE DEFAULT PATH — not mounted by `TopBar.tsx`. The reviewer
   survives as quiet inline hints on the table, not as a score and a
   marks tally in the masthead (CONFIGURATOR_SPEC §5). Kept, with its
   styles (foot of `shell.css`), for a deliberate return. */

import { useMemo } from 'react'
import { useLintFindings } from '@/features/review'

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** CHECK compartment — the reviewer's live tally, and the switch that
 *  opens the review rail. Reads CLEAN in viridian at zero; otherwise the
 *  mark count in red pencil with the blocking share stamped ahead of it,
 *  because a blocker is the one thing that must be looked at first. */
export function CheckStamp({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const findings = useLintFindings()

  const { total, blockers } = useMemo(() => {
    let b = 0
    for (const f of findings) if (f.severity === 'blocker') b += 1
    return { total: findings.length, blockers: b }
  }, [findings])

  const advisories = total - blockers
  const reading =
    total === 0
      ? 'Clean sheet — the reviewer has nothing to mark'
      : `${total} mark${total === 1 ? '' : 's'} · ${blockers} blocking · ${advisories} advisory`
  const verb = open ? 'Close the review rail' : 'Open the review rail'

  return (
    <div className="shell-cell shell-cell-check">
      <span className="shell-cell-caption mono-label">Check</span>
      <button
        type="button"
        className={`shell-check${open ? ' is-open' : ''}${total > 0 ? ' has-marks' : ''}`}
        aria-pressed={open}
        aria-label={`${reading}. ${verb}.`}
        title={`${reading}\n${verb}`}
        onClick={onToggle}
      >
        {total === 0 ? (
          <span className="shell-check-clean">Clean</span>
        ) : (
          <>
            {blockers > 0 && (
              <span className="shell-check-blockers" aria-hidden="true">
                {blockers}
              </span>
            )}
            <span className="shell-check-count" aria-hidden="true">
              {pad2(total)}
            </span>
            <span className="shell-check-unit" aria-hidden="true">
              Marks
            </span>
          </>
        )}
      </button>
    </div>
  )
}
