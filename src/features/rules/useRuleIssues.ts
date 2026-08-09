/* ============================================================
   Static validation, memoised.

   `validateRule` is a STATIC check (unreachable nodes, unconfigured
   pickers, an empty branch, a cycle without a loop, no output), so it
   is keyed on the rule and the schema only. Rows are read without
   subscribing — otherwise typing a single cell in the data grid would
   re-validate every rule and re-derive the canvas.
   ============================================================ */

import { useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { validateRule } from './engine'
import type { RuleIssue, RuleRunContext } from './engine'

export interface IssueSummary {
  issues: RuleIssue[]
  blockers: RuleIssue[]
  advisories: RuleIssue[]
  /** node ids carrying at least one blocker — the canvas red-pencils these */
  blockedNodeIds: ReadonlySet<string>
  ok: boolean
}

const EMPTY: IssueSummary = {
  issues: [],
  blockers: [],
  advisories: [],
  blockedNodeIds: new Set(),
  ok: false,
}

function summarise(issues: RuleIssue[]): IssueSummary {
  const blockers = issues.filter((i) => i.severity === 'blocker')
  const advisories = issues.filter((i) => i.severity !== 'blocker')
  const blockedNodeIds = new Set<string>()
  for (const b of blockers) if (b.nodeId) blockedNodeIds.add(b.nodeId)
  return { issues, blockers, advisories, blockedNodeIds, ok: blockers.length === 0 }
}

export function useRuleIssues(ruleId: string | null): IssueSummary {
  const rule = useProjectStore((s) => (ruleId ? s.rules[ruleId] : undefined))
  const entities = useProjectStore((s) => s.entities)

  return useMemo(() => {
    if (!rule) return EMPTY
    /* deliberate untracked read — see the note at the top of the file */
    const ctx: RuleRunContext = {
      entities,
      rowsByEntity: useProjectStore.getState().rowsByEntity,
    }
    try {
      return summarise(validateRule(rule, ctx))
    } catch {
      /* the engine promises never to throw; if it ever does, a broken
         validator must not take the editor down with it */
      return EMPTY
    }
  }, [rule, entities])
}

/** Validity stamps for every rule at once — the rules index needs them all. */
export function useAllRuleIssues(): Record<string, IssueSummary> {
  const rules = useProjectStore((s) => s.rules)
  const entities = useProjectStore((s) => s.entities)

  return useMemo(() => {
    const ctx: RuleRunContext = {
      entities,
      rowsByEntity: useProjectStore.getState().rowsByEntity,
    }
    const out: Record<string, IssueSummary> = {}
    for (const [id, rule] of Object.entries(rules)) {
      try {
        out[id] = summarise(validateRule(rule, ctx))
      } catch {
        out[id] = EMPTY
      }
    }
    return out
  }, [rules, entities])
}
