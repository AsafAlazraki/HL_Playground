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
import { stageKeys, useStageEscape } from './stageKeys'

export interface RulesStageProps {
  onClose: () => void
}

export function RulesStage({ onClose }: RulesStageProps): ReactElement {
  /* Escape is the control in track 1 of the bar, on the keyboard */
  useStageEscape(onClose)

  return (
    <div
      className="shell-viewstage"
      role="region"
      aria-label="Business rules"
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
        <button type="button" className="shell-view-back" onClick={onClose} aria-label="Back">
          <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
          <span>Back</span>
        </button>
        <p className="shell-view-what">
          <span className="shell-view-what-name">Business rules</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          {/* the same aside the door in the panel carries — see
              LeftPanel: "what has to be true" was indistinguishable
              from the door beside it, which opens the flow builder */}
          <span className="shell-view-what-say">limits every row must keep</span>
        </p>
      </div>

      <div className="shell-view-page">
        <RulesPane />
      </div>
    </div>
  )
}
