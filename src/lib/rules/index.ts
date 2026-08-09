/* ============================================================
   Rules engine — public surface (RULES_SPEC.md § "Execution engine").

     import { runRule, validateRule } from '@/lib/rules'
     import type { RuleRunResult, RuleIssue } from '@/lib/rules'

   Pure TypeScript: no React, no store, no DOM, no Dexie. The only
   dependencies are '@/types/model' and '@/lib/formula'.

   The two entry points:
     validateRule(rule, ctx) -> RuleIssue[]   static check; blockers
                                              stop a run before it starts
     runRule(rule, ctx)      -> RuleRunResult reads rows, returns views,
                                              traces, hit counts and
                                              PENDING effects

   Nothing here ever writes. An action node yields a serializable
   `PendingEffect`; the UI applies it on APPLY. Neither function throws.
   ============================================================ */

export { runRule, MAX_PAIR_STEPS, MAX_LOOP_ITERATIONS } from './walk'
export { validateRule } from './validate'

export type {
  RuleRunContext,
  RunPair,
  RunTrace,
  ViewResultRow,
  RuleView,
  PendingEffect,
  PendingEffectBase,
  RuleRunResult,
  RuleIssue,
} from './types'

/* Row-level helpers the canvas and inspector legitimately need: the
   human name of a node, and the same type-aware comparison the engine
   uses (so a preview never disagrees with a run). */
export { nodeLabel, compareValues, isEmptyValue } from './evaluate'
export type { CompareOutcome, RowRef } from './evaluate'
