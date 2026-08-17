/* ============================================================
   WHICH ROW A SEARCH SENT US TO — one pending request per table.

   THE DEFECT THIS CLOSES. "Find anything" found a row, opened the
   table it lives in, and then dropped the row: the register opened
   at the top of an 83-row page with nothing saying which of the 83
   had been picked. The row id was in hand at the moment of the press
   and was thrown away.

   WHY A REQUEST AND NOT A PROP. Landing on a row is a one-shot ACT,
   not a property of the place: a table page that remembered "you
   came here for row 41" would jump back to row 41 every time the
   window was re-focused or re-mounted, which is the camera arguing
   with the person. So this is a request — published by whoever knows
   the row, consumed exactly once by the sheet that can act on it,
   and then gone. It is the same shape as `useNewTableRequest`, which
   the shell already uses for "a type was dropped on the sheet".

   AND IT IS SESSION STATE, NOT PROJECT STATE. Nothing here may reach
   the store: everything written there persists to disk and exports,
   and where somebody's cursor was is not a fact about their
   business. Module-level, read through `useSyncExternalStore`,
   exactly like `tableGroupState` and `tableFitState` next door.
   ============================================================ */
import { useSyncExternalStore } from 'react'

export interface RowReveal {
  rowId: string
  /** distinguishes two requests for the SAME row — picking the same
   *  search result twice must land twice, not silently once */
  token: number
}

type RevealMap = Record<string, RowReveal>

let state: RevealMap = {}
let ticket = 0

const listeners = new Set<() => void>()

function emit(next: RevealMap): void {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Ask the sheet for this table to go to this row and mark it. Safe
 *  to call before the table is on screen: the request waits, and the
 *  sheet reads it on mount. */
export function requestRowReveal(entityId: string, rowId: string): void {
  ticket += 1
  emit({ ...state, [entityId]: { rowId, token: ticket } })
}

/** What is pending for this table, if anything. The hook below reads
 *  through this, so a test reads exactly what a mounted sheet does. */
export const rowRevealOf = (entityId: string): RowReveal | undefined => state[entityId]

/** Consumed. Called by the sheet once it has acted, so nothing jumps
 *  a second time. */
export function clearRowReveal(entityId: string): void {
  if (!(entityId in state)) return
  const next = { ...state }
  delete next[entityId]
  emit(next)
}

/** Drops a pending request for a table that has left the board. */
export const forgetRowReveal = clearRowReveal

export function useRowReveal(entityId: string): RowReveal | undefined {
  const read = (): RowReveal | undefined => rowRevealOf(entityId)
  return useSyncExternalStore(subscribe, read, read)
}
