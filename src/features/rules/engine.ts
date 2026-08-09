/* ============================================================
   The single seam between this UI module and the execution
   engine (`src/lib/rules`, pure TS — no React, no store).

   Everything in src/features/rules imports the engine THROUGH
   this file, so if the engine's module layout shifts there is
   exactly one line to change.

   Note on effects: the spec sketches `PendingEffect.apply(store)`,
   but the engine is pure, so an effect is DATA describing a write.
   `./effects.ts` is the only place that turns one into a store
   mutation, and only on APPLY.
   ============================================================ */

export { runRule, validateRule } from '@/lib/rules'
export type {
  PendingEffect,
  RuleIssue,
  RuleRunContext,
  RuleRunResult,
  RuleView,
  ViewResultRow,
} from '@/lib/rules'
