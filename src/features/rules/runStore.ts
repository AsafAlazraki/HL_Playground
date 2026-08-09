/* ============================================================
   Run state — one tiny external store for the whole module.

   A run is not project data (it is never persisted), but three
   surfaces need the same answer at the same time: the toolbar's
   stamp, the results rail, and the hit-count chips ON the canvas.
   A module-level store keeps them in step without the shell
   having to thread props between three separate mounts.
   ============================================================ */

import { useSyncExternalStore } from 'react'
import type { RuleRunResult } from './engine'

export interface RunState {
  /** which rule the result belongs to — results never leak across rules */
  ruleId: string | null
  result: RuleRunResult | null
  running: boolean
  /** the engine refused to finish — never a thrown exception on screen */
  error: string | null
  /** effects have been committed; APPLY must never fire twice */
  applied: boolean
  /** how many writes actually landed on APPLY */
  appliedCount: number
}

const EMPTY: RunState = {
  ruleId: null,
  result: null,
  running: false,
  error: null,
  applied: false,
  appliedCount: 0,
}

let state: RunState = EMPTY
const listeners = new Set<() => void>()

export const getRunState = (): RunState => state

export function setRunState(patch: Partial<RunState>): void {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

/** Drop everything — used when the rule changes or the rail is closed. */
export function resetRunState(): void {
  if (state === EMPTY) return
  state = EMPTY
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useRunState = (): RunState =>
  useSyncExternalStore(subscribe, getRunState, getRunState)

/** The result for THIS rule, or null — never another rule's. */
export function useRunResultFor(ruleId: string | null): RuleRunResult | null {
  const s = useRunState()
  if (!ruleId || s.ruleId !== ruleId) return null
  return s.result
}
