/* ============================================================
   THE REVIEW STAGE — the door CLUELESS_USER_TESTS O8 asked for.

   O8 named three things, in order, and said a person was right to
   call the feature non-existent until all three were done: "confirm-
   gate every fix, teach the lint rules what a brand price table is,
   then cut a door."

   THE FIRST TWO WERE DONE AND THE THIRD WAS NOT. `FixConfirm.tsx`
   holds the gate and the argument for where it falls — a fix that can
   drop a value or make a table asks first and states its blast radius
   counted from the real rows; a fix that only renames keeps the toast
   with UNDO, because a dialog in front of "rename Boats to Boat" is
   the full stop rule 9 exists to remove. `lint/rules.ts` learned what
   a kinded table is: `entity-plural` was firing on 22 of 25 of them,
   telling a dealer to rename Highfield Inflatables to Highfield
   Inflatable — advice about a brand's own name, which is not ours to
   give. What was left was the door, and `ReviewPanel` had exactly one
   importer: nothing.

   IT LIVES ON DATA, NOT ON ADMIN, and the app already argued this
   with itself. `AdminStage.tsx` says in its own words that the shape
   band left it because "the data model and the tables are what the
   business SELLS FROM, which is a different job on a different day".
   A review of that shape belongs beside the shape.

   THE PANEL IS A RAIL AND IT STAYS ONE. `review.css` gives `.rv-rail`
   a `clamp(340px, 22vw, 440px)` measure, which is a reading width
   somebody chose on purpose; stretching it to 1,200px because a stage
   is wide would be the stage overruling the feature. So the page well
   holds it at its own width and lets the ground either side be
   ground.
   ============================================================ */

import type { ReactElement } from 'react'
import { ReviewScreen } from '@/features/review/ReviewScreen'
import { rebuiltPicker } from '@/features/quote/rebuilt'
import { ArrowLeft } from '@phosphor-icons/react'
import { ReviewPanel, useLintFindings } from '@/features/review'
import { ICON_SIZE } from '@/lib/icons'
import { Button } from '@/ui'
import { stageKeys, useStageEscape } from './stageKeys'
import { useStageEntry } from './stageEntry'

export interface ReviewStageProps {
  onClose: () => void
}

/** "3 blockers · 139 advisories", or the clean sentence. The bar says
 *  the same two figures the panel leads with — one reading, two
 *  places, never re-counted. */
export function reviewSay(blockers: number, advisories: number): string {
  const one = (n: number, w: string): string => `${n.toLocaleString()} ${n === 1 ? w : `${w}s`}`
  if (blockers === 0 && advisories === 0) return 'nothing to correct'
  if (blockers === 0) return one(advisories, 'advisory').replace('advisorys', 'advisories')
  if (advisories === 0) return one(blockers, 'blocker')
  return `${one(blockers, 'blocker')} · ${one(advisories, 'advisory').replace('advisorys', 'advisories')}`
}

export function ReviewStage({ onClose }: ReviewStageProps): ReactElement {
  useStageEscape(onClose)
  const stage = useStageEntry('Review')
  const findings = useLintFindings()
  const blockers = findings.reduce((n, f) => n + (f.severity === 'blocker' ? 1 : 0), 0)

  return (
    <div className="shell-viewstage" role="region" {...stage} onKeyDown={stageKeys}>
      <div className="shell-view-bar">
        <div className="shell-view-lead">
          <Button
            tone="ghost"
            size="sm"
            glyph={<ArrowLeft size={ICON_SIZE.small} />}
            onClick={onClose}
          >
            Back
          </Button>
        </div>
        {/* THE BAR KEEPS THE WAY BACK AND GIVES UP THE TITLE, because
            the rebuilt page draws its own — and two titles reading
            "Review" four inches apart is the fault `QuoteStage`
            argued itself out of once already. The shipped panel has
            no head of its own, so it still needs this one. */}
        <p className="shell-view-what" hidden={rebuiltPicker()}>
          <span className="ds-display-lg shell-view-what-name">Review</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          <span className="shell-view-what-say">
            {reviewSay(blockers, findings.length - blockers)}
          </span>
        </p>
      </div>

      <div className="shell-view-page">
        {/* THE WELL CENTRES IT AND HIDES ITS × — see shell.css. The
            panel was written as a rail that could be shut without
            leaving the screen; on a stage there is nowhere else to be,
            so its own close and the bar's Back would be one act drawn
            twice, four inches apart. `onClose` still reaches it,
            because Escape inside the panel means the same thing. */}
        {rebuiltPicker() ? (
          /* THE REBUILT REVIEW PAGE, behind the same switch as the
             rest. `ReviewPanel` keeps its job — it is the RAIL beside
             the sheet, and review.css argues its 340-440px clamp
             correctly for that. This is the PAGE, and the note below
             is what it answers: on a stage there is nowhere else to
             be, so the rail was drawn as the whole screen and 142
             marks went into a straw. */
          <ReviewScreen />
        ) : (
          <div className="shell-review-well">
            <ReviewPanel onClose={onClose} />
          </div>
        )}
      </div>
    </div>
  )
}
