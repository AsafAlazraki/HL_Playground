/* ============================================================
   Which groups are folded shut — per table, for this session.

   Folding is a way of LOOKING at a register, not a fact about it:
   it must never enter the project store (everything written there
   persists to disk and exports), and it must not live inside the
   node component either, because React Flow unmounts every node
   when the view changes — a table you folded would spring open the
   moment you glanced at another screen.

   So: one tiny module-level store keyed by entityId, read through
   `useSyncExternalStore`, exactly like the frame sizes next door in
   `tableCanvasState`. Default is OPEN — a fresh table shows its
   contents, never a wall of shut drawers.
   ============================================================ */
import { useSyncExternalStore } from 'react'

/** collapsed group keys per entityId */
type CollapsedMap = Record<string, ReadonlySet<string>>

const EMPTY: ReadonlySet<string> = new Set<string>()

let state: CollapsedMap = {}

const listeners = new Set<() => void>()

function emit(next: CollapsedMap): void {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function collapsedGroupsOf(entityId: string): ReadonlySet<string> {
  return state[entityId] ?? EMPTY
}

/** Fold or unfold one group. `key` is a `groupKey(path)` value. */
export function toggleGroup(entityId: string, key: string): void {
  const current = state[entityId] ?? EMPTY
  const next = new Set(current)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  emit({ ...state, [entityId]: next })
}

/** Tables that currently have at least one folded drawer. */
export function foldedTableIds(): string[] {
  return Object.keys(state)
}

/** Drops every fold for a table that has left the board. */
export function forgetGroupState(entityId: string): void {
  if (!(entityId in state)) return
  const next = { ...state }
  delete next[entityId]
  emit(next)
}

export function useCollapsedGroups(entityId: string): ReadonlySet<string> {
  const read = (): ReadonlySet<string> => state[entityId] ?? EMPTY
  return useSyncExternalStore(subscribe, read, read)
}
