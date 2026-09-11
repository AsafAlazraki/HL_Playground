/* ============================================================
   io/PlanEvidence — THE TWO BLOCKS EVERY MERGE PREFLIGHT SHOWS.

   `TableRoundTrip` drew both of these inline, and then a second door
   arrived that needs exactly the same two: `PasteBlock`, UX_PASS §3's
   PREVIEW step. Two copies of "here is what would change" is two
   places for the sentence a dealer checks against the email that sent
   them the file to drift out of agreement with itself.

   So they are one component each, and the reasons they are drawn the
   way they are travel with them:

   THE OLD VALUE IS DRAWN AT ALL because "12 rows overwritten" is a
   number a person has to trust, and `Cash 68,990 → 71,990 on Sport
   560` is a fact they can check. ACTION_BAR §4.3 asked for the count;
   the count on its own is not the thing.

   THE NOTES ARE A LIST AND NOT A WARNING BLOCK. Most of them are not
   warnings — "576 rows have no line in that file, nothing is deleted"
   is the app being careful, and drawing it in the red pencil would
   teach a person to fear the safest thing on the screen.

   Both keep the classes they had, so `io.css`'s measured notes about
   them (the five-column reading, the container query at 520px, the
   contrast figures on `--surface-1`) stay true of the elements they
   describe.
   ============================================================ */

import type { JSX } from 'react'
import type { CellChange, UploadRefusal } from './tableCsv'

/** how many changed cells a preflight lists before it starts counting */
export const CHANGES_SHOWN = 8

/**
 * EVERY CELL THAT WOULD CHANGE, with the value on the sheet beside
 * the value coming in. Nothing on the line truncates: a re-upload of
 * Highfield Inflatables after two prices changed drew its two rows as
 * `Highfield - RU230KA…` twice, over two different prices, and
 * everything that told them apart was in the part the ellipsis ate.
 */
/* IT TAKES THE CHANGES, NOT THE PLAN, because the merge LOG draws
   this same list off a record kept after the fact and there is no
   plan left by then. The alternative was a second component drawing
   before-and-after a second way — which is the exact drift this file
   was extracted to stop, one surface later. */
export function PlanChanges({
  changes,
}: {
  changes: readonly CellChange[]
}): JSX.Element | null {
  const shown = changes.slice(0, CHANGES_SHOWN)
  if (shown.length === 0) return null
  const more = changes.length - shown.length

  return (
    <ul className="io-diff">
      {shown.map((c) => (
        <li className="io-diff-line" key={`${c.rowId}:${c.fieldId}`}>
          <span className="io-diff-where">{c.rowLabel}</span>
          {/* A COLUMN NAME IS A NAME (DESIGN_PRINCIPLES §2), and this
              one carried `.mono-label`, whose identity IS uppercase —
              so a dealer's `Landed hull cost` was printed back at them
              as LANDED HULL COST on the one screen whose entire job is
              "check this against the email that sent you the file". */}
          <span className="io-diff-col">{c.columnName}</span>
          <span className="io-diff-from">{c.from === '' ? '—' : c.from}</span>
          <span className="io-diff-arrow" aria-hidden="true">
            →
          </span>
          <span className="io-diff-to">{c.to === '' ? '—' : c.to}</span>
        </li>
      ))}
      {more > 0 ? (
        /* a sentence, not a stamp: this read +12 MORE CELLS */
        <li className="io-diff-more">
          +{more} more {more === 1 ? 'cell' : 'cells'}
        </li>
      ) : null}
    </ul>
  )
}

/** Everything the merge will NOT do, one sentence each, in the order
 *  the plan put them. Rule 10, gathered in one place. */
export function PlanNotes({ notes }: { notes: UploadRefusal[] }): JSX.Element | null {
  if (notes.length === 0) return null
  return (
    <ul className="io-rt-notes">
      {notes.map((r) => (
        <li className="io-rt-note" key={r.id}>
          {r.say}
        </li>
      ))}
    </ul>
  )
}
