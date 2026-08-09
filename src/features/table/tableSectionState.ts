/* ============================================================
   Which column bands are folded shut — per table, for this session.

   Same reasoning as the folded drawers next door in
   `tableGroupState`, for the same two reasons:

   1. Folding PRICING away is a way of LOOKING at a register, not a
      fact about it. It must never reach the project store, because
      everything written there persists to disk and exports.
   2. It must not live inside the node component either: React Flow
      unmounts every node when the view changes, so a band the reader
      folded would spring open the moment they glanced at the rules.

   One module-level store keyed by entityId, read through
   `useSyncExternalStore`. Writes are a Set swap and a notify —
   folding four money columns away is one render, which is what makes
   it feel instant on a forty-column sheet.

   Default is OPEN: a table shows what it holds, never a wall of chips.
   ============================================================ */
import { useSyncExternalStore } from 'react'

/** folded section ids per entityId */
type FoldedMap = Record<string, ReadonlySet<string>>

const EMPTY: ReadonlySet<string> = new Set<string>()

let state: FoldedMap = {}

const listeners = new Set<() => void>()

function emit(next: FoldedMap): void {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function collapsedSectionsOf(entityId: string): ReadonlySet<string> {
  return state[entityId] ?? EMPTY
}

/** Fold one band shut, or open it again. */
export function toggleSection(entityId: string, sectionId: string): void {
  const current = state[entityId] ?? EMPTY
  const next = new Set(current)
  if (next.has(sectionId)) next.delete(sectionId)
  else next.add(sectionId)
  emit({ ...state, [entityId]: next })
}

/** Fold a whole set of bands shut, or open a whole set — one notify,
 *  so COLLAPSE ALL on eleven bands is one render rather than eleven.
 *
 *  The ids are passed IN on purpose: this module stays a set of ids per
 *  table and never learns what a table's sections are. */
export function setSectionsFolded(
  entityId: string,
  sectionIds: readonly string[],
  folded: boolean,
): void {
  const current = state[entityId] ?? EMPTY
  const next = new Set(current)
  for (const id of sectionIds) {
    if (folded) next.add(id)
    else next.delete(id)
  }
  if (next.size === current.size) return
  emit({ ...state, [entityId]: next })
}

/** Tables that currently have at least one folded band. */
export function foldedSectionTableIds(): string[] {
  return Object.keys(state)
}

/** Drops every fold for a table that has left the board. */
export function forgetSectionState(entityId: string): void {
  if (!(entityId in state)) return
  const next = { ...state }
  delete next[entityId]
  emit(next)
}

export function useCollapsedSections(entityId: string): ReadonlySet<string> {
  const read = (): ReadonlySet<string> => state[entityId] ?? EMPTY
  return useSyncExternalStore(subscribe, read, read)
}
