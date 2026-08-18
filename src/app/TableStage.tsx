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

   WHAT IT IS, AND ALL IT IS — and this list is one line shorter
   than it was:
     1. a way back      — one control, top left, always there;
     2. a title block   — what this is, how much is in it;
     3. the workspace   — `TableWorkspace`, with its search,
                          filters, sort, fill handle and row
                          commands intact.

   THE DOORS HAVE GONE DOWNSTAIRS. They were track 3 of this bar —
   Fitment and Columns, beside the name of the table they act on —
   and they are now on the action bar above the dock with the rest
   of the register's controls. The instruction was explicit
   (docs/specs/ACTION_BAR.md §2.2: "bands 1 and 2 empty into the
   action bar... What remains at the top is the minimum that says
   where you are and how to leave"), and the rule behind it is the
   one this bar has followed everywhere else: the dock is where you
   go, the action bar is what you do, and a control that could
   plausibly sit in either belongs in the action bar. They are
   handed to the register rather than published separately, so a
   page can never end up with two half-bars racing each other.

   AND THE TITLE BLOCK IS NOW THE ONLY PLACE A COUNT IS SAID.
   `Rows 588` sat in the toolbar one band below "588 variants",
   which is the same fact twice; the third copy, `Columns 33`, had
   no home in the title at all and is now said in the sections
   panel, which is the one surface in the app that is about
   columns. When a search or a filter narrows the register the
   title says so — "12 of 588 variants" — because a changed count
   is still a count and belongs where counts are said. The sheet
   reports it up (`onCount`); nothing else is duplicated.

   THE FULL WIDTH, unlike the design stage next door. That one is
   a form and a form wants a column; this is a register, and a
   register wants every pixel it can get.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowsLeftRight, SlidersHorizontal } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { TableWorkspace } from '@/features/table'
import { countLabel, leafNoun } from '@/features/table/grouping'
import type { ActionItem } from '@/lib/actions'
import { ICON_SIZE } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'

export interface TableStageProps {
  entityId: string
  onClose: () => void
  /** open the fitment page for this table */
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

  /* HOW MANY ARE ON SCREEN, reported up by the register because that
     is where the narrowing lives. `null` until the sheet has said —
     and it says on mount, so the title is never wrong for a frame. */
  const [shown, setShown] = useState<number | null>(null)

  /* Escape is this same control on the keyboard. Bound before the
     subject check, so the page that says the table is gone can be shut
     the same way as the page that shows it. */
  useStageEscape(onClose)

  /* THE DOORS, AS ACTIONS. Rank 50 puts them between the register's
     "see all of it" group and its row commands — you look at the
     table, then you go somewhere about it, then you change it. */
  const doors = useMemo<ActionItem[]>(() => {
    const out: ActionItem[] = []
    if (onOpenView) {
      out.push({
        kind: 'button',
        id: 'tbs-fitment',
        /* NOT "What goes with each one". A place is named with a noun
           that says what is on the screen — never a question — which
           is the rule commit 4c4a3e2 set when it renamed "What fits
           what" to Fitment on the bar. This button opens that same
           thing and was left behind, so the bar and the button
           disagreed. The owner's report was the plainest possible
           evidence: "I don't get the what goes with each one that is
           just confusing". */
        label: 'Fitment',
        /* the dock's own Fitment mark, so the two agree at a glance
           as well as in words */
        icon: ArrowsLeftRight,
        onPick: () => onOpenView(entityId),
      })
    }
    if (onOpenDesign) {
      out.push({
        kind: 'button',
        id: 'tbs-columns',
        label: 'Columns',
        icon: SlidersHorizontal,
        onPick: () => onOpenDesign(entityId),
      })
    }
    return out
  }, [entityId, onOpenView, onOpenDesign])

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
  /* "12 of 588 variants" while something is narrowing it, "588
     variants" otherwise. One sentence, one place. */
  const say =
    shown !== null && shown !== rowCount
      ? `${shown} of ${countLabel(rowCount, noun)}`
      : countLabel(rowCount, noun)

  return (
    <div
      className="shell-viewstage shell-tablestage"
      role="region"
      aria-label={entity.name}
      style={{ '--view-accent': accentVar(entity.accent) } as CSSProperties}
      /* Delete and Backspace stop here — the sheet's own handler aims
         them at this very table. Escape travels, so the shell can close
         this page with it; see stageKeys.ts for the whole order. */
      onKeyDown={stageKeys}
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
          <span className="shell-view-what-say">{say}</span>
        </p>
        {/* TRACK 3 IS EMPTY AND STAYS DECLARED — the same arrangement
            Home uses. Both outer tracks are `minmax(0, 1fr)`, so they
            hold equal width whether or not anything stands in them and
            the title keeps the middle of the window. The doors that
            used to be here are on the action bar. */}
      </div>

      <div className="shell-table-body">
        <TableWorkspace entityId={entityId} doors={doors} onCount={setShown} />
      </div>
    </div>
  )
}
