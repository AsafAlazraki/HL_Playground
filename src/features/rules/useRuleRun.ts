/* ============================================================
   useRuleRun — RUN, read the result, commit the writes.

   The engine is pure and synchronous, so the only discipline
   needed here is: never call it during render, never let one
   rule's result be shown against another, and never apply the
   same set of effects twice.
   ============================================================ */

import { useCallback, useEffect } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { runRule } from './engine'
import type { RuleIssue, RuleRunResult } from './engine'
import { applyPendingEffects } from './effects'
import { getRunState, resetRunState, setRunState, useRunState } from './runStore'
import { useRuleIssues } from './useRuleIssues'

export interface RuleRunApi {
  result: RuleRunResult | null
  issues: RuleIssue[]
  running: boolean
  /** the engine refused to finish — shown as a red-pencil note */
  error: string | null
  /** effects from this result have already been committed */
  applied: boolean
  appliedCount: number
  run: () => void
  clear: () => void
  applyEffects: () => void
}

export function useRuleRun(ruleId: string | null): RuleRunApi {
  const state = useRunState()
  const { issues } = useRuleIssues(ruleId)
  const mine = !!ruleId && state.ruleId === ruleId

  /* a result belongs to the rule it was run against — switching rules
     (or closing the last one) drops it rather than showing it against
     a flow it does not describe */
  useEffect(() => {
    const s = getRunState()
    if (s.ruleId && s.ruleId !== ruleId) resetRunState()
  }, [ruleId, state.ruleId])

  const run = useCallback(() => {
    if (!ruleId) return
    if (!useProjectStore.getState().rules[ruleId]) return
    setRunState({
      ruleId,
      running: true,
      result: null,
      error: null,
      applied: false,
      appliedCount: 0,
    })

    /* off the render path, and one tick late so the RUNNING stamp paints */
    window.setTimeout(() => {
      const s = useProjectStore.getState()
      const rule = s.rules[ruleId]
      if (!rule) {
        resetRunState()
        return
      }
      try {
        const result = runRule(rule, {
          entities: s.entities,
          rowsByEntity: s.rowsByEntity,
        })
        setRunState({ ruleId, result, running: false, error: null })
      } catch (e) {
        /* the engine promises never to throw; if it does, the editor
           reports it instead of dying with it */
        setRunState({
          ruleId,
          result: null,
          running: false,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }, 0)
  }, [ruleId])

  const clear = useCallback(() => {
    resetRunState()
  }, [])

  const applyEffects = useCallback(() => {
    const s = getRunState()
    if (!ruleId || s.ruleId !== ruleId) return
    if (!s.result || s.running || s.applied) return
    const appliedCount = applyPendingEffects(s.result.effects)
    setRunState({ applied: true, appliedCount })
  }, [ruleId])

  return {
    result: mine ? state.result : null,
    issues,
    running: mine ? state.running : false,
    error: mine ? state.error : null,
    applied: mine ? state.applied : false,
    appliedCount: mine ? state.appliedCount : 0,
    run,
    clear,
    applyEffects,
  }
}
