/* ============================================================
   THE TABLE STAGE — a table is a PLACE, not a big node.

   WHAT THIS REPLACES, AND WHY.

   "Show me the whole table" used to be answered by growing the
   card until it claimed the pane — `expanded is a node size, not
   a mode`. It is an elegant sentence and it does not survive
   contact with use:

     - a viewport-sized object on an infinite pannable canvas can
       be panned away from, and then it is simply lost;
     - every control it has is drawn ON it, so once it is off
       screen there is no way to collapse it;
     - it is still inside the canvas transform, so its edges clip
       against the pane and its band strip cuts mid-word;
     - its size is remembered in localStorage while the camera is
       not, so a refresh reliably produced a half-off-screen card;
     - and FOCUS already lifted the same table into the same
       full-window workspace, so the app had TWO verbs for one
       job, neither of them good.

   A table you have opened is somewhere you ARE. Every other
   "somewhere you are" in this app is a stage over the sheet —
   the view page, the column setup, the rules pane, a quote, a
   module — and this is the sixth. The sheet stays mounted and
   inert underneath, so closing is instant and the drawing has
   not moved.

   WHAT IT IS, AND ALL IT IS:
     1. a way back      — one control, top left, always there;
     2. a title block   — what this is, how much is in it;
     3. the doors       — what else you can do with this table;
     4. the workspace   — `TableWorkspace`, unchanged, with its
                          search, filters, sort, fill handle and
                          row commands intact.

   THE FULL WIDTH, unlike the design stage next door. That one is
   a form and a form wants a column; this is a register, and a
   register wants every pixel it can get.
   ============================================================ */

import type { CSSProperties } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { TableWorkspace } from '@/features/table'
import { countLabel, leafNoun } from '@/features/table/grouping'
import { ICON_SIZE } from '@/lib/icons'

export interface TableStageProps {
  entityId: string
  onClose: () => void
  /** open "what goes with each one" for this table */
  onOpenView?: (entityId: string) => void
  /** open the column setup for this table */
  onOpenDesign?: (entityId: string) => void
}

export function TableStage({
  entityId,
  onClose,
  onOpenView,
  onOpenDesign,
}: TableStageProps) {
  const entity = useProjectStore((s) => s.entities[entityId])
  const rows = useProjectStore((s) => s.rowsByEntity[entityId])
  const rowCount = rows ? rows.length : 0

  const back = (
    <button
      type="button"
      className="shell-view-back"
      onClick={onClose}
      aria-label="Back"
    >
      <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
      <span>Back</span>
    </button>
  )

  /* A STAGE MUST NEVER OUTLIVE ITS SUBJECT. */
  if (!entity) {
    return (
      <div className="shell-viewstage" role="region" aria-label="Table">
        <div className="shell-view-bar">{back}</div>
        <p className="shell-view-void">That table is no longer on the sheet.</p>
      </div>
    )
  }

  /* the DEALER'S noun, taken from the column that names the rows —
     a boat table counts "26 models", a trailer table "16 trailers",
     never "26 records" */
  const noun = leafNoun(entity)

  return (
    <div
      className="shell-viewstage shell-tablestage"
      role="region"
      aria-label={entity.name}
      style={{ '--view-accent': accentVar(entity.accent) } as CSSProperties}
      /* the sheet's own Delete/Escape handlers are still live under
         this stage and are aimed at this very table */
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
          <span className="shell-view-what-say">{countLabel(rowCount, noun)}</span>
        </p>

        {/* THE DOORS COME WITH THE TABLE. They used to be two lines
            that appeared under the row in the panel when it was
            selected, which pushed the list around and put them a long
            way from the thing they act on. Here they are beside the
            name of the table they belong to. */}
        <div className="shell-table-doors">
          {onOpenView ? (
            <button
              type="button"
              className="shell-table-door"
              onClick={() => onOpenView(entityId)}
            >
              What goes with each one
            </button>
          ) : null}
          {onOpenDesign ? (
            <button
              type="button"
              className="shell-table-door"
              onClick={() => onOpenDesign(entityId)}
            >
              Columns
            </button>
          ) : null}
        </div>
      </div>

      <div className="shell-table-body">
        <TableWorkspace entityId={entityId} />
      </div>
    </div>
  )
}
