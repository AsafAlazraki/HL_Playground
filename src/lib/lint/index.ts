/* ============================================================
   Lint engine — public barrel, exactly the REVIEW_SPEC.md API.
   ============================================================ */

export type { FindingSeverity, LintFinding, LintFix } from './types'
export { lintProject } from './lint'
export { applyLintFix } from './applyFix'
