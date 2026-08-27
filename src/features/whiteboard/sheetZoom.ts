/* ============================================================
   HOW FAR AWAY THE READER IS STANDING.

   The sheet is one drawing read at three distances, and three
   things on it are only worth drawing at some of them. Rather
   than let each one invent its own threshold, they share these.

   THE MEASUREMENTS, not tastes. Everything inside the canvas
   transform is multiplied by the camera's zoom, so an authored
   size is not a seen size:

       zoom   a 16px link label draws at   32-unit dots sit
       0.14            2.2 px               4.5 px apart   <- FIT
       0.34            5.4 px              10.9 px apart
       0.40            6.4 px              12.8 px apart   <- opening
       0.70           11.2 px              22.4 px apart
       1.00           16.0 px              32.0 px apart

   NEAR is where a link label clears the 11px floor, and 16px is
   authored so that happens at 0.70 — just past the 0.66 at which
   `tableLod` gives a card its register back, so a table's columns
   and the names of the columns that link it arrive together.
   Below it a label is texture: ~64 chips of 6px mush lying across
   the drawing, which is the single largest piece of clutter this
   view had.

   SHAPE is where the reader has stopped reading anything and is
   looking at the shape of the whole sheet — which is what FIT is
   for, at 0.14 on the seeded drawing. There the title block stops
   explaining the screen and folds to its two figures, so the one
   control whose job is "show me all of it" is not showing you a
   card with a paragraph on it instead.

   THE SUBSCRIPTION IS THE POINT, exactly as in `tableLod`: the
   selector answers a three-valued BAND, never the zoom, so a pan
   — or a zoom that stays inside a band — returns the same string
   and React bails out of the update entirely.
   ============================================================ */
import { useStore } from '@xyflow/react'
import type { ReactFlowState } from '@xyflow/react'

/** At or above this, a 16px link label draws at 11.2px — the floor. */
export const READ_ZOOM = 0.7

/** Below this, nothing on the sheet is read; only its shape. */
export const SHAPE_ZOOM = 0.34

/** How large a link label is authored, inside the canvas transform.
 *  Kept here beside the zoom it is chosen against — the two numbers
 *  are one decision and drift apart if they live apart. */
export const LABEL_PX = 16

/** How far apart the ground's dots are, in drawing units. Twice the
 *  snap grid, so a table always lands on one or exactly between two. */
export const GROUND_GAP = 32

export type SheetDistance = 'shape' | 'far' | 'near'

const distanceOf = (s: ReactFlowState): SheetDistance => {
  const z = s.transform[2]
  if (z < SHAPE_ZOOM) return 'shape'
  if (z < READ_ZOOM) return 'far'
  return 'near'
}

/**
 * How far the reader is standing back from the sheet.
 *
 * NO HYSTERESIS, and that is a decision rather than an oversight.
 * `tableLod` needs a dead band because crossing its threshold builds
 * or destroys six complete registers; crossing one of these fades an
 * opacity. A wheel gesture moves the zoom monotonically, so each
 * threshold is crossed once per gesture and the CSS transition is the
 * whole animation.
 */
export const useSheetDistance = (): SheetDistance => useStore(distanceOf)
