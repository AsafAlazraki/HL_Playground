/* ============================================================
   THE RULES STAGE — the shell's box around `@/features/constraints`.

   Same lesson as ViewStage, learned the same way twice: the
   sentence-rules pane was finished, 13 files deep, and imported by
   nothing. `RulesPane` takes no props and reads the organisation from
   the store, so the whole job is a box and a way back.

   It sits OVER the sheet rather than replacing it, exactly as the
   view stage does, so the canvas keeps its zoom and node state and
   closing is instant. A rule is something you write ABOUT the sheet,
   not somewhere you go instead of it.
   ============================================================ */

import type { ReactElement } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { RulesPane } from '@/features/constraints'
import { ICON_SIZE } from '@/lib/icons'
import { Button } from '@/ui'
import { stageKeys, useStageEscape } from './stageKeys'
import { useStageEntry } from './stageEntry'

export interface RulesStageProps {
  onClose: () => void
}

export function RulesStage({ onClose }: RulesStageProps): ReactElement {
  /* Escape is the control in track 1 of the bar, on the keyboard */
  useStageEscape(onClose)
  /* AND THIS IS WHERE THE KEYBOARD ARRIVES. The name that was written
     on the root by hand comes out of this call now — the same string
     is the page's `aria-label` and the thing that is announced when it
     takes the focus. See stageEntry.ts. */
  const stage = useStageEntry('Business rules')

  return (
    <div
      className="shell-viewstage"
      role="region"
      {...stage}
      /* DELETE AND BACKSPACE STOP AT THIS ROOT, the same line the design
         and flow stages carry: the whiteboard underneath still deletes
         the SELECTED TABLE on either one, and it only skips
         INPUT/TEXTAREA/SELECT. Escape travels, so the shell can close
         this page with it; see stageKeys.ts for the whole order. */
      onKeyDown={stageKeys}
    >
      <div className="shell-view-bar">
        {/* `shell-view-back`, no `btn`, labelled "Back" — TableStage is
            the calibration. `.btn` stamped this "BACK TO THE SHEET" in
            11px uppercase mono; uppercase is a label style and this is
            a button. */}
        <div className="shell-view-lead">
          <Button tone="ghost" size="sm" glyph={<ArrowLeft size={ICON_SIZE.small} />} onClick={onClose}>
            Back
          </Button>
        </div>
        {/* ============================================================
            THE BAR KEEPS THE WAY BACK AND GIVES UP THE TITLE.

            It read "Business rules · limits every row must keep" 90
            pixels above a page head reading "BUSINESS RULES / What
            this price file asserts / Limits every row must keep." —
            the same two facts, twice, in one screenful. `QuoteStage`
            argued itself out of exactly this once: "two titles, and
            the centred one won the eye because it was first".

            `RulesPane` draws the head that survives, because it is
            the one with the eyebrow, the title and the distinction
            this stage is actually spending its one line on.
            AND IT IS REMOVED RATHER THAN `hidden`, which was the
            first attempt and did nothing: `.shell-view-what` is
            `display: flex` in shell.css, and an author declaration
            beats the user agent's `[hidden] { display: none }`. The
            screenshot after that change was identical to the one
            before it, which is the only reason it was caught.
            ============================================================ */}
      </div>

      <div className="shell-view-page">
        <RulesPane />
      </div>
    </div>
  )
}
