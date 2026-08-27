/* ============================================================
   WHERE AM I IN 588 — the register's own status rail.

   THE FAULT. A 588-row register scrolled to row 300 said nothing
   about itself. The drawer heading that told you these were Highfield
   Sport 460s had scrolled off the top an hour ago; the scrollbar said
   "somewhere in the middle" and nothing said of what; and the two
   counts that mattered — how many rows a narrowing had put away, how
   many columns a fold had — were on a title one band up and in a
   panel two presses away.

   WHY IT IS A RAIL AND WHY IT IS AT THE FOOT. This file's own
   neighbour (`TableSheet`) killed three stacked bands at the TOP of
   this page, and it was right to: 131px before a row of data, on a
   page whose whole job is rows of data. This is 30px at the BOTTOM,
   below the last row rather than above the first, and it is the thing
   every spreadsheet a dealer has ever opened has at the bottom of it.
   It costs the sheet 30px once and answers three questions that
   previously cost a scroll, a press and a guess.

   WHAT IT SAYS, and every figure of it is COUNTED, never estimated:

     - THE DRAWER YOU ARE INSIDE, pinned as you pass through it. The
       grouping line itself scrolls away, as it should; the crumb it
       leaves behind does not.
     - WHERE THE WINDOW IS — the first and last row actually on screen,
       out of the rows on the sheet.
     - WHAT IS PUT AWAY, by cause: rows a narrowing is holding back,
       and rows a folded drawer is holding. Two different acts by two
       different controls, so they are two different sentences.

   AND WHAT IT HOLDS: the two reading lenses. Row height, and whether
   the columns that carry no value for the rows on screen are on
   screen. Both belong here rather than on the action bar because both
   are about how THIS sheet is being read at THIS moment, and the bar
   is where acts on the table live.
   ============================================================ */
import type { JSX } from 'react'
import type { LeafNoun } from './grouping'
import { countLabel } from './grouping'
import { DENSITY_LABEL, type RowDensity } from './tableReadState'

/** One level of the drawer the top of the window is inside. */
export interface RailCrumb {
  level: string
  value: string
}

export interface RegisterRailProps {
  noun: LeafNoun
  /** the drawer chain the top of the window is inside, outermost
   *  first. Empty on a flat table, and then nothing is drawn. */
  crumbs: RailCrumb[]
  /** 1-based, inclusive: the first and last row on screen */
  from: number
  to: number
  /** rows on the sheet — after a fold, which is what you can scroll */
  onSheet: number
  /** rows that came through the narrowing, before any fold */
  matching: number
  /** rows the table holds, narrowing or no narrowing */
  held: number
  /** columns the table has, and how many the sheet is drawing */
  columns: number
  shownColumns: number
  density: RowDensity
  onDensity: (d: RowDensity) => void
  onlyFilled: boolean
  /** columns carrying no value for any row on screen — what the lens
   *  would put away, counted before it is pressed */
  emptyColumns: number
  onOnlyFilled: (v: boolean) => void
}

const DENSITIES: RowDensity[] = ['compact', 'comfortable']

export function RegisterRail({
  noun,
  crumbs,
  from,
  to,
  onSheet,
  matching,
  held,
  columns,
  shownColumns,
  density,
  onDensity,
  onlyFilled,
  emptyColumns,
  onOnlyFilled,
}: RegisterRailProps): JSX.Element {
  const narrowed = matching < held
  const folded = onSheet < matching
  const foldedColumns = columns - shownColumns

  return (
    <div className="tb-rail" role="status" aria-live="off">
      {/* WHICH DRAWER, still on screen after its heading has gone. Not
          a control: it sits over nothing and takes no press, so it can
          never come between a pointer and a cell. */}
      {crumbs.length > 0 && (
        <p className="tb-rail-where">
          {crumbs.map((c, i) => (
            <span key={`${c.level}:${i}`} className="tb-rail-step">
              {i > 0 && (
                <span className="tb-rail-sep" aria-hidden="true">
                  ›
                </span>
              )}
              {c.level !== '' && <span className="tb-rail-lab">{c.level}</span>}
              <span className="tb-rail-val">{c.value}</span>
            </span>
          ))}
        </p>
      )}

      <p className="tb-rail-pos">
        {/* A WINDOW STANDING ENTIRELY ON GROUPING LINES has no row on
            it, and then there is no range to give. It says the count
            and stops, rather than printing a range it made up. */}
        {from > 0 && (
          <span className="tb-rail-range">
            {from}
            <span className="tb-rail-dash" aria-hidden="true">
              –
            </span>
            {to}
          </span>
        )}
        <span className="tb-rail-of">
          {from > 0 ? 'of ' : ''}
          {countLabel(onSheet, noun)}
        </span>
        {narrowed && (
          <span
            className="tb-rail-away"
            title={`${held} in the table. The search and the columns you narrowed are holding ${
              held - matching
            } back.`}
          >
            {held - matching} narrowed away
          </span>
        )}
        {folded && (
          <span
            className="tb-rail-away"
            title="Rows inside drawers you have folded shut. Open the drawer to bring them back."
          >
            {matching - onSheet} folded away
          </span>
        )}
      </p>

      <div className="tb-rail-lenses">
        {/* ROW HEIGHT. A segmented pair rather than a toggle, because a
            toggle that says "Compact" cannot say whether that is the
            state or the offer. */}
        <div className="tb-rail-seg" role="group" aria-label="Row height">
          {DENSITIES.map((d) => (
            <button
              key={d}
              type="button"
              className={'tb-rail-segbtn' + (density === d ? ' tb-rail-segbtn-on' : '')}
              aria-pressed={density === d}
              title={
                d === 'compact'
                  ? 'Shorter rows — more of the register on one screen'
                  : 'Taller rows — easier to hold your place while scanning'
              }
              onClick={() => onDensity(d)}
            >
              {DENSITY_LABEL[d]}
            </button>
          ))}
        </div>

        {/* THE COLUMNS THAT CARRY NOTHING. Counted before the press, so
            the control says what it will do — and says, in its own
            words, when there is nothing for it to do. */}
        <button
          type="button"
          className={'tb-rail-lens' + (onlyFilled ? ' tb-rail-lens-on' : '')}
          aria-pressed={onlyFilled}
          title={
            onlyFilled
              ? `${foldedColumns} of ${columns} columns are put away because no ${noun.one} on screen has a value in them. Press to bring them back.`
              : emptyColumns === 0
                ? `Every one of the ${columns} columns carries a value for some ${noun.one} on screen — there is nothing to put away.`
                : `Put away the ${emptyColumns} columns no ${noun.one} on screen has a value in. Nothing is deleted and nothing leaves an export.`
          }
          onClick={() => onOnlyFilled(!onlyFilled)}
        >
          <span className="tb-rail-lenstext">Only filled columns</span>
          <span className="tb-rail-lenscount">
            {onlyFilled ? `${shownColumns} of ${columns}` : emptyColumns}
          </span>
        </button>
      </div>
    </div>
  )
}
