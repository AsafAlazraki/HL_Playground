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
import type { RuleDef } from '@/types/model'
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

/* ------------------------------------------------------------ */
/* What the Start node can actually get to                      */
/* ------------------------------------------------------------ */

export interface RuleReach {
  /** every node the Start node can reach, Start included */
  reached: ReadonlySet<string>
  /** an Output node is on a path from Start — the run makes a table */
  reachesOutput: boolean
  /** an Action node is on a path from Start — the run writes something */
  reachesAction: boolean
  /** plates on the paper that nothing on the path can get to */
  stranded: number
}

const NO_REACH: RuleReach = {
  reached: new Set(),
  reachesOutput: false,
  reachesAction: false,
  stranded: 0,
}

/**
 * A WALK, NOT A VERDICT. `validateRule` reports an unwired plate as an
 * advisory, on purpose — a half-drawn scratch node must not stop a
 * working flow. But "no blockers" was being STAMPED as "this rule can
 * run", beside a note saying the only Output is not connected to
 * anything: the app told a person their rule was fine and broken in the
 * same 40 pixels. This says which of the two the stamp should read.
 */
export function ruleReach(rule: RuleDef | undefined): RuleReach {
  if (!rule || rule.nodes.length === 0) return NO_REACH
  const byId = new Map(rule.nodes.map((n) => [n.id, n]))
  const out = new Map<string, string[]>()
  for (const e of rule.edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue
    const list = out.get(e.source)
    if (list) list.push(e.target)
    else out.set(e.source, [e.target])
  }
  const reached = new Set<string>()
  const queue = rule.nodes.filter((n) => n.kind === 'start').map((n) => n.id)
  for (const id of queue) reached.add(id)
  while (queue.length > 0) {
    const id = queue.shift() as string
    for (const next of out.get(id) ?? []) {
      if (reached.has(next)) continue
      reached.add(next)
      queue.push(next)
    }
  }
  let reachesOutput = false
  let reachesAction = false
  for (const id of reached) {
    const kind = byId.get(id)?.kind
    if (kind === 'output') reachesOutput = true
    if (kind === 'action') reachesAction = true
  }
  return {
    reached,
    reachesOutput,
    reachesAction,
    stranded: rule.nodes.length - reached.size,
  }
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
