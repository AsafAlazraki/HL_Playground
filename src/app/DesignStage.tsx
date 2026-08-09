/* ============================================================
   THE DESIGN STAGE — the shell's box around `@/features/designer`.

   Same lesson a third time. `EntityDesigner` takes one prop, an
   entity id, and it was reached only through the right rail the
   shell deleted — so the one place in the app that can change a
   column's TYPE after it exists, mark it required, give it a
   default, reorder columns, re-point a link, edit a calculation
   after it was written, or say which column labels a row elsewhere,
   went dark with the rail. The table can add and remove columns; it
   cannot do any of that.

   WHAT THIS FILE IS, AND ALL IT IS:
     1. a way back  — one control, top left, always there;
     2. a box       — a single reading column that scrolls itself.

   A COLUMN, NOT THE WHOLE WIDTH. The designer is a form: a stack of
   labelled controls at 1300px of bleed is a scan across a desk, and
   `.ds-root` has no width of its own to stop it.

   THE STAGE MUST NEVER OUTLIVE ITS SUBJECT — the same rule ViewStage
   states, and the same reason: `EntityDesigner` returns null the
   moment its entity is struck from the sheet, and a stage that stays
   open around nothing is a white rectangle with a back button in it.
   So the subject is checked here and the stage says plainly that the
   table is gone.

   KEYSTROKES STOP AT THIS ROOT. The whiteboard is still mounted
   underneath and still deletes the SELECTED TABLE on Delete or
   Backspace; it skips INPUT/TEXTAREA/SELECT, and this stage is
   mostly buttons. The door that opens this stage is drawn under the
   selected table — so without this line, Backspace with the pointer
   on a "Move up" arrow offers to delete the table being edited.
   ============================================================ */

import type { CSSProperties, ReactElement } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { EntityDesigner } from '@/features/designer/EntityDesigner'
import { ICON_SIZE } from '@/lib/icons'

export interface DesignStageProps {
  entityId: string
  onClose: () => void
}

export function DesignStage({ entityId, onClose }: DesignStageProps): ReactElement {
  const entity = useProjectStore((s) => s.entities[entityId])

  const back = (
    <button type="button" className="btn shell-view-back" onClick={onClose}>
      <ArrowLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
      Back to the sheet
    </button>
  )

  if (!entity) {
    return (
      <div className="shell-viewstage" role="region" aria-label="Columns">
        <div className="shell-view-bar">{back}</div>
        <p className="shell-view-void">That table is no longer on the sheet.</p>
      </div>
    )
  }

  return (
    <div
      className="shell-viewstage shell-designstage"
      role="region"
      aria-label={`Columns of ${entity.name}`}
      style={{ '--view-accent': accentVar(entity.accent) } as CSSProperties}
      /* see the header note — the sheet's Delete handler is still live
         under this stage and is aimed at this very table */
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="shell-view-bar">
        {back}
        <p className="shell-view-what">
          <span className="shell-view-what-mark">
            <TableKindSymbol kind={kindOf(entity.kind)} size={ICON_SIZE.small} />
          </span>
          <span className="shell-view-what-name">{entity.name}</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          <span className="shell-view-what-say">what each column may hold</span>
        </p>
      </div>

      <div className="shell-design-scroll">
        <div className="shell-design-col">
          <EntityDesigner entityId={entityId} />
        </div>
      </div>
    </div>
  )
}
