/* ============================================================
   THE WHOLE-TABLE INSTRUMENTS — one source, two hosts.

   These two pieces used to be JSX inside `TableToolbar`, which was
   fine while the full-window sheet was the only place you could see a
   whole table. It is not any more: an EXPANDED card on the blueprint
   answers the same question without leaving the sheet, and it needs
   the same instruments — the same ink, the same latching, the same
   words. So they live here and both hosts render them.

     COLLAPSE ALL / EXPAND ALL   one press turns fifty-nine columns
                                 into eleven chips: the table's SHAPE
                                 on one screen. The primary control.
     FIT COLUMNS                 share the window out between the
                                 columns that are drawn.
     ROWS · COLUMNS              how much of it am I seeing, in both
                                 axes, always.

   Neither takes a `className`. A host restyles them from its own
   scope (`.tb-node-band .tb-whole { … }`) so the two can never drift
   into two different controls that happen to share a name.
   ============================================================ */
import type { JSX } from 'react'
import {
  ArrowsInLineHorizontal,
  ArrowsOutLineHorizontal,
  ArrowsOutSimple,
  FrameCorners,
} from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'

/* ---------------------------------------------------------- */
/* seeing all of it                                           */
/* ---------------------------------------------------------- */

export function WholeTableControls({
  hasBands,
  allFolded,
  fitted,
  canFit,
  onToggleBands,
  onToggleFit,
}: {
  /** the table has bands, so there is something to collapse */
  hasBands: boolean
  allFolded: boolean
  fitted: boolean
  /** there is a sheet to fit — not a designed empty plate */
  canFit: boolean
  onToggleBands: () => void
  onToggleFit: () => void
}): JSX.Element {
  const mark = ICON_SIZE.tiny
  const markWeight = weightFor(mark)

  return (
    <div className="tb-whole">
      {hasBands && (
        <button
          type="button"
          className="btn tb-whole-btn tb-whole-lead"
          aria-pressed={allFolded}
          title={
            allFolded
              ? 'Open every section — all columns back on the sheet'
              : 'Fold every section to its chip — the whole table’s shape on one screen'
          }
          onClick={onToggleBands}
        >
          {allFolded ? (
            <ArrowsOutLineHorizontal size={mark} weight={markWeight} />
          ) : (
            <ArrowsInLineHorizontal size={mark} weight={markWeight} />
          )}
          {allFolded ? 'Expand all' : 'Collapse all'}
        </button>
      )}
      <button
        type="button"
        className="btn tb-whole-btn"
        aria-pressed={fitted}
        disabled={!canFit}
        title={
          fitted
            ? 'Give every column its own width back'
            : 'Squeeze every column on the sheet into the window — dense on purpose: for seeing the whole table, not for reading it'
        }
        onClick={onToggleFit}
      >
        {fitted ? (
          <ArrowsOutSimple size={mark} weight={markWeight} />
        ) : (
          <FrameCorners size={mark} weight={markWeight} />
        )}
        {fitted ? 'Reset widths' : 'Fit columns'}
      </button>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* how much am I seeing                                       */
/* ---------------------------------------------------------- */

export function DimensionReadout({
  shown,
  total,
  columns,
  shownColumns,
  onClearView,
}: {
  shown: number
  total: number
  /** columns the table has, including any folded into a band */
  columns: number
  /** columns the sheet is drawing right now */
  shownColumns: number
  onClearView: () => void
}): JSX.Element {
  const narrowed = shown !== total
  const foldedCols = columns - shownColumns

  return (
    <div className="tb-count" role="status">
      <span className="tb-count-grp">
        {narrowed ? (
          <>
            <span className="tb-count-label">Showing</span>
            <span className="tb-count-num">{shown}</span>
            <span className="tb-count-sep">/</span>
            <span className="tb-count-tot">{total}</span>
            <button
              type="button"
              className="tb-count-clear"
              title="Clear search, filters and sort"
              onClick={onClearView}
            >
              Clear
            </button>
          </>
        ) : (
          <>
            <span className="tb-count-label">Rows</span>
            <span className="tb-count-num">{total}</span>
          </>
        )}
      </span>

      <span className="tb-count-rule" aria-hidden="true" />

      <span
        className="tb-count-grp"
        title={
          foldedCols > 0
            ? `${shownColumns} of ${columns} columns showing — ${foldedCols} folded into their sections`
            : `All ${columns} columns are on the sheet`
        }
      >
        <span className="tb-count-label">Columns</span>
        {foldedCols > 0 ? (
          <>
            <span className="tb-count-num">{shownColumns}</span>
            <span className="tb-count-sep">/</span>
            <span className="tb-count-tot">{columns}</span>
          </>
        ) : (
          <span className="tb-count-num">{columns}</span>
        )}
      </span>
    </div>
  )
}
