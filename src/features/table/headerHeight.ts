/* ============================================================
   THE HEADING ROW IS AS TALL AS ITS NAMES NEED.

   THE FAULT, MEASURED at 1280 across all fifty registers: 18 of 782
   column headings lost their last line with no ellipsis and no mark
   of any kind. `.tb-th-name` was `max-height: 2.5em` at line-height
   1.25 — exactly two lines — over `overflow: hidden`, so a name
   wanting three lines simply stopped:

     "App. Dry Hull Weight kg"   read  "App. Dry Hull"      (Surtees)
     "Parts & Accessories 1 CTD" read  "Parts & Accessories" (Rigging Kits)
     "RRP + Freight Inc GST"     read  "RRP + Freight"      (Yamaha)

   Every one of them sat in a column at the 116px floor, which is
   where a register with thirty columns puts most of them. A heading
   is the one thing in a register that says what the thousand values
   under it MEAN, and "Parts & Accessories" against "Parts &
   Accessories 1 CTD" is not a shortening — it is a different column.

   THE ANSWER IS THE HONEST ONE: THE ROW GROWS, ONCE, AT THE TOP.
   A third line costs 15px of a register that already scrolls
   sideways and downwards, and it is paid only by the registers that
   need it — 12 of 50. Past three lines the name ellipsises, so the
   promise is exact: a heading shows all of its text, or it shows
   that there is more.

   WHY IT IS MEASURED AND NOT ASSUMED. The height has to be a number
   in JavaScript, because `.tb-head` carries it inline and the row
   virtualiser subtracts it from `scrollTop` to decide which rows are
   on screen (`headH` in Grid.tsx). A CSS-only answer would let the
   row auto-size and leave the arithmetic wrong. So the real heading
   markup is laid out once, hidden, at the real column widths, and
   its height is read off the browser — no font metrics, no wrap
   simulation, no per-face constants that can drift from `table.css`.
   The probe carries the SAME `-webkit-line-clamp: 3` the real
   heading does, so what it reports is already capped at three lines.

   IT ONLY EVER GROWS. `HEAD_H` (44px) is the floor, so no register
   loses room it has today, and the height is taken from EVERY column
   rather than the windowed ones — a heading row that grew as you
   scrolled sideways would move the whole sheet under the pointer.

   Pure at the bottom (`headRowHeight`), a hook on top, exactly as
   `nameColumnWidth.ts` next door.
   ============================================================ */
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { HEAD_H } from './helpers'

/** How many lines a heading may wrap to before it ellipsises. Written
 *  here for the record and enforced in `table.css` by
 *  `.tb-th-name { -webkit-line-clamp: 3 }` — the probe inherits that
 *  rule, so this constant is documentation and the stylesheet is the
 *  authority. Three is the deepest name in Northside's fifty
 *  registers; a fourth line would cost every register 15px to serve
 *  none of them. */
export const HEADER_MAX_LINES = 3

/** The height the heading row should be drawn at, given what a hidden
 *  copy of it measured. Never below `HEAD_H`, so a register whose
 *  names all fit on one line is exactly as tall as it has always
 *  been. `0` — nothing painted yet — is not a measurement. */
export function headRowHeight(probed: number): number {
  if (!Number.isFinite(probed) || probed <= 0) return HEAD_H
  return Math.max(HEAD_H, Math.ceil(probed))
}

/** The heading row's height, read off a hidden copy of the heading
 *  markup that `probeRef` points at.
 *
 *  `key` is what the caller has changed — the column names and their
 *  widths, as one string. The measurement is re-taken when it moves
 *  and at no other time.
 *
 *  BEFORE PAINT, deliberately: a layout effect runs on the same frame
 *  as the render that created the probe, and the state it sets
 *  re-renders synchronously, so the corrected height is what the
 *  browser actually paints. There is no frame in which the row is the
 *  wrong height. */
export function useHeaderRowHeight(
  probeRef: RefObject<HTMLElement | null>,
  key: string,
): number {
  const [h, setH] = useState(HEAD_H)

  /* A webfont that arrives after the first measurement invalidates it:
     Inter is wider than the fallback it was measured in, and a name
     that fitted two lines in the fallback can want three in Inter.
     One re-measure when the faces are in, and never again. */
  const [facesIn, setFacesIn] = useState(false)
  useEffect(() => {
    if (facesIn) return
    let live = true
    void document.fonts?.ready.then(() => {
      if (live) setFacesIn(true)
    })
    return () => {
      live = false
    }
  }, [facesIn])

  useLayoutEffect(() => {
    const el = probeRef.current
    if (!el) return
    const next = headRowHeight(el.getBoundingClientRect().height)
    setH((prev) => (prev === next ? prev : next))
    /* `key` and `facesIn` are re-measure triggers and are read for no
       other reason */
  }, [probeRef, key, facesIn])

  return h
}
