/* ============================================================
   HOW FAR UP A FLOATING NOTE HAS TO START.

   Extracted from `app/UndoKeys.tsx`, which argued it first and
   whose reasoning still governs:

     "Raising the constant again would fix Fitment and wait for the
      next surface. There is no rectangle that is empty on every
      stage... Choosing a corner is choosing which surface breaks
      next. SO THE FLOOR IS MEASURED, NOT CHOSEN."

   It is here rather than there because a SECOND note appeared — the
   two-tab guard's — and it chose 96px, which is exactly the mistake
   the paragraph above predicts: it cleared the dock, and then the
   action bar arrived between them and the note covered its search
   field. A constant cannot know about a surface that did not exist
   when it was written; a measurement can.

   Anything that floats over a page and must never be covered marks
   itself `[data-note-clear]`. Three carry it today — the dock wrap,
   the Fitment palette, and the action bar inside the dock wrap.
   ============================================================ */

/** Every floating instrument that has declared it must not be covered. */
const FURNITURE = '[data-note-clear]'

/** The dock's old constant. Used only before the first measurement, so
 *  a note is never WORSE off than it was when the number was fixed. */
export const FALLBACK_FLOOR = 84

/** How far up from the bottom of the window a note must start to clear
 *  everything that has declared itself. Returns 0 when nothing has. */
export function floorAbove(): number {
  let floor = 0
  for (const el of document.querySelectorAll<HTMLElement>(FURNITURE)) {
    const box = el.getBoundingClientRect()
    if (box.height === 0) continue
    const fromBottom = window.innerHeight - box.top
    if (fromBottom > floor) floor = fromBottom
  }
  return floor
}
