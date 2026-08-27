/* ============================================================
   WHICH DENSITY A CATALOGUE IS BEING READ AT — per table, for
   this session.

   Same argument as `tableReadState` next door, one level out:
   whether a person is looking at the photographs or at the rows is
   a way of LOOKING at a table, never a fact about it. It must not
   reach the project store — everything written there persists to
   disk and travels in every export, and where somebody's eyes are
   is not part of a business's price file.

   AND IT MUST NOT LIVE IN THE COMPONENT EITHER. The catalogue
   unmounts whenever the table is closed and remounts when it is
   opened again; a dealer who works in the register all day would
   be handed the gallery every single time.

   THE DEFAULT IS THE GALLERY, and that is the phase's whole
   argument in one line: the register stops being the front door
   and becomes a view. A table with no photographs at all still
   opens in the gallery — it draws its rows as plates and says so —
   because the alternative is a front door that changes depending
   on whether somebody has uploaded a picture yet.
   ============================================================ */
import { useSyncExternalStore } from 'react'

export type CatalogueLens = 'gallery' | 'list'

export const LENS_LABEL: Record<CatalogueLens, string> = {
  gallery: 'Gallery',
  list: 'List',
}

const DEFAULT: CatalogueLens = 'gallery'

let state: Record<string, CatalogueLens> = {}

const listeners = new Set<() => void>()

function emit(next: Record<string, CatalogueLens>): void {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const lensOf = (entityId: string): CatalogueLens => state[entityId] ?? DEFAULT

export function setCatalogueLens(entityId: string, lens: CatalogueLens): void {
  if (lensOf(entityId) === lens) return
  emit({ ...state, [entityId]: lens })
}

export function useCatalogueLens(entityId: string): CatalogueLens {
  const read = (): CatalogueLens => lensOf(entityId)
  return useSyncExternalStore(subscribe, read, read)
}

/** Tables currently holding a density of their own, for the sweep in
 *  `useEntityTableNodes` — same shape as `readTableIds` next door. */
export function lensTableIds(): string[] {
  return Object.keys(state)
}

/** Drops the lens of a table that has left the board — the same sweep
 *  `forgetReadState` and `forgetFitState` are called from. */
export function forgetCatalogueLens(entityId: string): void {
  if (!(entityId in state)) return
  const next = { ...state }
  delete next[entityId]
  emit(next)
}
