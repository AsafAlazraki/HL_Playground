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

export interface RulesStageProps {
  onClose: () => void
}

export function RulesStage({ onClose }: RulesStageProps): ReactElement {
  return (
    <div className="shell-viewstage" role="region" aria-label="Business rules">
      <div className="shell-view-bar">
        <button type="button" className="btn shell-view-back" onClick={onClose}>
          <ArrowLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          Back to the sheet
        </button>
        <p className="shell-view-what">
          <span className="shell-view-what-name">Business rules</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          <span className="shell-view-what-say">what has to be true</span>
        </p>
      </div>

      <div className="shell-view-page">
        <RulesPane />
      </div>
    </div>
  )
}
