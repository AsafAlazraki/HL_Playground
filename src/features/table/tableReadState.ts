/* ============================================================
   HOW A REGISTER IS BEING READ — per table, for this session.

   Same reasoning as `tableFitState` and `tableSectionState` next
   door: how tall a row is drawn and whether an empty column is on
   screen are ways of LOOKING at a table, not facts about it. They
   must never reach the project store (every write there persists to
   disk and to every export), and they must not live inside a
   component either — the canvas unmounts every node when the view
   changes and the register unmounts entirely when it is closed, so
   component state would forget the reader's choice on the way to
   another table and back.

   TWO THINGS ARE KEPT, AND BOTH ARE ANSWERS TO THE SAME COMPLAINT
   ("the tables — still too complicated and hard to use visually"):

   1. DENSITY. A 588-row register is read by scanning, and scanning
      wants either more rows on screen or more air between them
      depending on whose eyes are doing it.

      COMFORTABLE IS 40px AND IT IS THE DEFAULT, because it is what
      the register was already trying to draw: `table.css` carried
      `.tb-row { min-height: 40px }` — DESIGN_PRINCIPLES §3's "rows
      are 40px" — over a layout that placed every row 34px below the
      last, so every row in the app overlapped its neighbour by 6px
      and covered that neighbour's bottom rule. Making 40 the
      geometry rather than a paint-time floor is what fixes it. See
      the note where that rule used to be.

      COMPACT IS 34px, the figure the layout has always used, and it
      is one press away for anyone who would rather have six more
      rows on screen than the air.

   2. ONLY THE COLUMNS THAT CARRY A VALUE. Northside's real file has
      tables where a third of the columns are empty for every row
      currently on screen — a boat series that takes no outboard, a
      trailer range with no rego columns filled in. Those columns are
      not deletable (another series needs them) and folding their
      whole band takes the columns that ARE filled with them. So this
      is a LENS: the columns are still there, still exportable, still
      one press from coming back, and the rail says how many are put
      away rather than letting them vanish quietly.

   NOTHING HERE IS DESTRUCTIVE, which is why neither needs a toast.
   ============================================================ */
import { useSyncExternalStore } from 'react'

export type RowDensity = 'compact' | 'comfortable'

/** The three drawn heights, taken together — a taller data row beside
 *  an unchanged grouping line reads as a broken rhythm, so the whole
 *  set moves at once. `compact` IS the register's historical geometry
 *  (`ROW_H` / `GROUP_H` / `ADD_H` in helpers.ts); nothing about the
 *  default draw changed when this arrived. */
export interface RowMetrics {
  rowH: number
  groupH: number
  addH: number
}

export const ROW_METRICS: Record<RowDensity, RowMetrics> = {
  compact: { rowH: 34, groupH: 36, addH: 28 },
  comfortable: { rowH: 40, groupH: 42, addH: 32 },
}

export const DENSITY_LABEL: Record<RowDensity, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
}

interface ReadState {
  density: RowDensity
  onlyFilled: boolean
}

/* Comfortable, for the reason set out at the top of this file: it is
   the height the stylesheet was already painting. */
const DEFAULT: ReadState = { density: 'comfortable', onlyFilled: false }

let state: Record<string, ReadState> = {}

const listeners = new Set<() => void>()

function emit(next: Record<string, ReadState>): void {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The default object is returned BY IDENTITY for every table that has
 *  not been touched, so `useSyncExternalStore` sees a stable snapshot
 *  and does not re-render forever. */
const readOf = (entityId: string): ReadState => state[entityId] ?? DEFAULT

export function setRowDensity(entityId: string, density: RowDensity): void {
  const cur = readOf(entityId)
  if (cur.density === density) return
  emit({ ...state, [entityId]: { ...cur, density } })
}

export function setOnlyFilled(entityId: string, onlyFilled: boolean): void {
  const cur = readOf(entityId)
  if (cur.onlyFilled === onlyFilled) return
  emit({ ...state, [entityId]: { ...cur, onlyFilled } })
}

/** Both lenses of one table, for a component that draws the controls. */
export function useReadState(entityId: string): ReadState {
  const read = (): ReadState => readOf(entityId)
  return useSyncExternalStore(subscribe, read, read)
}

/** Tables currently holding a lens of their own — the sweep in
 *  `useEntityTableNodes` walks this so a struck table takes its lens
 *  with it, exactly as it takes its folds and its fit. */
export function readTableIds(): string[] {
  return Object.keys(state)
}

/** Drops the lens of a table that has left the board. */
export function forgetReadState(entityId: string): void {
  if (!(entityId in state)) return
  const next = { ...state }
  delete next[entityId]
  emit(next)
}
