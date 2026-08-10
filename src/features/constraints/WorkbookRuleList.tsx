/* ============================================================
   THE RULES READ OUT OF THE WORKBOOK — shown whether or not this
   app can run them yet.

   WHY THIS FILE EXISTS. Six rules were mined from the Master Price
   File, adjudicated against the cells that assert them, and written
   into `workbookRules.ts` with their provenance. Every one of the six
   is `blocked`: the sentence surface is single-kind and compares a
   column to a literal, and the workbook's real rules are cross-kind,
   lookups, or arithmetic. So `seedWorkbookConstraints()` correctly
   seeded nothing — and a person who opened BUSINESS RULES was told
   "No rules yet", which is FALSE. The rules exist. Two of them are
   running right now in the flow builder. The pane simply never
   mentioned any of it.

   That is the failure this file fixes, and it is worth naming
   precisely, because refusing to fake a rule was RIGHT and showing
   nothing was WRONG, and they are easy to confuse. Honesty is not
   silence. A rule the business demonstrably wrote, that this app
   cannot yet enforce, is a fact a person needs — it tells them what
   the system does NOT protect them from, which is exactly the thing
   they would otherwise assume.

   SO EVERY RULE IS DRAWN, and each says which of three states it is
   in, in words:
     - running here      a ConstraintDef exists and the engine checks it
     - running elsewhere  the flow builder enforces it; we say where
     - not yet            we say, in one plain line, what is missing

   The card never dresses a blocked rule up as a working one. The
   status is the first thing on it, not a footnote.
   ============================================================ */

import type { ReactElement } from 'react'
import { CheckCircle, ArrowSquareOut, Circle } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { WORKBOOK_RULES, type WorkbookRuleSeed } from './workbookRules'

export interface WorkbookRuleListProps {
  /** ids the engine is actually carrying, so a seed that has since
   *  become expressible is drawn as running rather than as pending.
   *  This list is the truth; the seed's own `blocked` is only a
   *  default for when the id is absent. */
  liveIds: ReadonlySet<string>
}

type Status =
  | { key: 'here'; label: string }
  | { key: 'elsewhere'; label: string; where: string }
  | { key: 'pending'; label: string; why: string }

function statusOf(seed: WorkbookRuleSeed, liveIds: ReadonlySet<string>): Status {
  if (liveIds.has(seed.id)) return { key: 'here', label: 'Checked on every row' }
  if (seed.enforcedIn) {
    return { key: 'elsewhere', label: 'Checked in', where: seed.enforcedIn }
  }
  return {
    key: 'pending',
    label: 'Not checked yet',
    /* `plainly` is required beside `blocked` for exactly this line. If
       one is ever missing, say so rather than printing an empty
       reason — an unexplained "not checked" is the thing that makes a
       person distrust the whole list. */
    why: seed.plainly ?? 'This app cannot express this rule yet.',
  }
}

function StatusMark({ status }: { status: Status }): ReactElement {
  const size = ICON_SIZE.tiny
  if (status.key === 'here') return <CheckCircle size={size} weight="fill" aria-hidden="true" />
  if (status.key === 'elsewhere') {
    return <ArrowSquareOut size={size} weight="bold" aria-hidden="true" />
  }
  return <Circle size={size} weight="regular" aria-hidden="true" />
}

/** The workbook's own rules, all of them, with an honest status. */
export function WorkbookRuleList({ liveIds }: WorkbookRuleListProps): ReactElement | null {
  if (WORKBOOK_RULES.length === 0) return null

  const running = WORKBOOK_RULES.filter(
    (s) => liveIds.has(s.id) || s.enforcedIn,
  ).length

  return (
    <section className="cn-wb" aria-label="Rules found in your price file">
      <header className="cn-wb-head">
        <p className="cn-wb-eyebrow mono-label">From your price file</p>
        <h3 className="cn-wb-title">
          {WORKBOOK_RULES.length} rules your workbook already states
        </h3>
        <p className="cn-wb-lede">
          Read out of <b>Boat Module (5).xlsx</b> — each one traced to the cell that says
          it. {running} of {WORKBOOK_RULES.length} are being checked. The rest are listed
          so you know what is <em>not</em> being checked, which is the part you would
          otherwise have to guess.
        </p>
      </header>

      <ul className="cn-wb-list">
        {WORKBOOK_RULES.map((seed) => {
          const status = statusOf(seed, liveIds)
          return (
            <li key={seed.id} className={`cn-wb-item is-${status.key}`}>
              <p className="cn-wb-status">
                <span className="cn-wb-status-mark" aria-hidden="true">
                  <StatusMark status={status} />
                </span>
                <span className="cn-wb-status-text">
                  {status.label}
                  {status.key === 'elsewhere' ? (
                    <>
                      {' '}
                      <b>{status.where}</b>
                    </>
                  ) : null}
                </span>
              </p>

              <p className="cn-wb-says">{seed.statement}</p>

              {status.key === 'pending' ? (
                <p className="cn-wb-why">{status.why}</p>
              ) : null}

              {/* THE PROVENANCE IS THE POINT. Anyone can write a rule
                  and claim the business asked for it; this line is how
                  you check. It is mono because it is a reference, not
                  prose, and it wraps rather than truncating — a
                  half-printed cell reference cannot be looked up. */}
              <p className="cn-wb-src">{seed.source}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
