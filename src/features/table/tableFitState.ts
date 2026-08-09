/* ============================================================
   FIT COLUMNS — the widths that put the whole register on one
   screen, per table, for this session.

   Same reasoning as the folded bands next door in
   `tableSectionState`: fitting a table is a way of LOOKING at it, not
   a fact about it, so it must never reach the project store (every
   write there persists to disk and exports), and it must not live
   inside a component either — the canvas unmounts every node when the
   view changes, and the FOCUS lens unmounts entirely when it closes.

   The shape is deliberately an OVERLAY, not a replacement. The
   reader's own widths are never touched; a fit is a second map merged
   over them, and one press back is a `delete` — which is what makes
   "restores the previous widths" true by construction rather than by
   remembering to save them.

   `release` exists for one gesture: dragging a column's grip while a
   fit is on. That column leaves the fit so the drag does exactly what
   it looks like it does, and every other column stays fitted.
   ============================================================ */
import { useSyncExternalStore } from 'react'

/** fitted widths per entityId, then per fieldId */
type FitMap = Record<string, Record<string, number>>

let state: FitMap = {}

const listeners = new Set<() => void>()

function emit(next: FitMap): void {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The fit overlay for one table, or undefined when it is not fitted. */
export function fitWidthsOf(
  entityId: string,
): Record<string, number> | undefined {
  return state[entityId]
}

export function setFitWidths(
  entityId: string,
  widths: Record<string, number>,
): void {
  emit({ ...state, [entityId]: widths })
}

/** Drop the fit — the reader's own widths are underneath, untouched. */
export function clearFitWidths(entityId: string): void {
  if (!(entityId in state)) return
  const next = { ...state }
  delete next[entityId]
  emit(next)
}

/** Take ONE column out of the fit, because it is being dragged. When
 *  the last one leaves, the table is no longer fitted. */
export function releaseFitColumn(entityId: string, fieldId: string): void {
  const current = state[entityId]
  if (!current || !(fieldId in current)) return
  const kept = { ...current }
  delete kept[fieldId]
  if (Object.keys(kept).length === 0) {
    clearFitWidths(entityId)
    return
  }
  emit({ ...state, [entityId]: kept })
}

/** Tables currently holding a fit. */
export function fittedTableIds(): string[] {
  return Object.keys(state)
}

/** Drops the fit of a table that has left the board. */
export function forgetFitState(entityId: string): void {
  clearFitWidths(entityId)
}

export function useFitWidths(
  entityId: string,
): Record<string, number> | undefined {
  const read = (): Record<string, number> | undefined => state[entityId]
  return useSyncExternalStore(subscribe, read, read)
}
