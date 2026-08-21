/* ============================================================
   WHAT DISAGREES WITH A ROW THAT IS STILL ON THE LIST.

   A rule carrying `severity: 'warn'` removes nothing. That is the
   whole point of it — `src/lib/observed/adopt.ts` explains why a
   pattern MEASURED off a price file may never be given the power to
   delete a pairing — but a warning that removes nothing and says
   nothing is worse than no warning at all. Rule 10: anything that
   cannot be done says why, WHERE IT IS. A warning is softer than a
   refusal and it still has to be read.

   So this module answers, for one pairing: which warn rules does
   this row disagree with, and in whose words? The answer is drawn
   on the row itself, in `BlockCard`, beside the value it is about.

   ── TWO ENGINES, ONE ANSWER ──────────────────────────────────

   `src/lib/configure` propagates ONE partial configuration and
   reports its warnings on `SolveState.warned`. This file is the
   other engine's half of the same idea: `@/lib/rules` walks rows and
   produces (source, candidate) pairs, and a view block IS such a
   list. Both channels carry `{ constraintId, because }` so a surface
   reads one shape whichever engine produced it.

   ── WHAT IS DELIBERATELY NOT WARNED ABOUT ────────────────────

   A BLANK IS NOT A DISAGREEMENT. An observed bound was measured only
   over pairings where both numbers exist; the discovery engine skips
   a row whose column does not read as a number, so its denominator
   never counted one. Warning on a blank would put a figure on screen
   that nothing measured — and `9,999 of 9,999 hold` would suddenly
   be flagging rows the finding never looked at. Every field the rule
   names is read first, on the side it belongs to, and a rule with a
   blank on either side stays quiet.

   A rule with no `then` is unfinished, not violated. A rule switched
   off says nothing. A rule whose severity is absent or 'block' is
   not this module's business at all: it PRUNES, and a pruned row is
   not on the list to be annotated.
   ============================================================ */

import { readCell, type ClauseGroup, type ConstraintDef } from '@/types/model'
import type { RowRef, RuleEngine } from '@/lib/rules/evaluate'
import { evalPairRule } from './pairs'

/** The same two fields `BlockedValue` and `ValueWarning` carry. What
 *  differs is not the record, it is that this row is still here. */
export interface PairWarning {
  constraintId: string
  /** the rule's own `because` clause, ready to print after "because" */
  because: string
}

const NONE: PairWarning[] = []

/** Only a rule that is on, says something, and is allowed to say it
 *  without taking anything away. */
export const isWarnRule = (c: ConstraintDef): boolean =>
  !!c && c.enabled !== false && c.severity === 'warn' && (c.then?.clauses?.length ?? 0) > 0

/** Every warn rule in a list, in authoring order. Exported so a
 *  caller filters once for a whole page rather than per row. */
export const warnRules = (list: readonly ConstraintDef[]): ConstraintDef[] =>
  (Array.isArray(list) ? list : []).filter(isWarnRule)

const blank = (v: unknown): boolean => v === null || v === undefined || v === ''

/**
 * BOTH SIDES HAVE TO BE THERE.
 *
 * `evalPairRule` reads the clause's left path against the CANDIDATE
 * and a field-shaped right path against the SOURCE, so this checks
 * the same two places. A `viaFieldId` hop is not followed — a rule
 * this module can vouch for reads a column directly, and one that
 * does not is left alone rather than half-checked.
 */
function bothSidesRead(group: ClauseGroup, candidate: RowRef, source: RowRef): boolean {
  for (const clause of group.clauses) {
    if (!clause?.left?.fieldId || clause.left.viaFieldId) return false
    if (blank(readCell(candidate.row, clause.left.fieldId))) return false
    const right = clause.right
    if (right && right.kind === 'field') {
      if (!right.path?.fieldId || right.path.viaFieldId) return false
      if (blank(readCell(source.row, right.path.fieldId))) return false
    }
  }
  return true
}

/**
 * Which warn rules this pairing disagrees with.
 *
 * Total: a rule that throws while being evaluated says nothing, in
 * the same spirit as the solver's "rules fail open". A warning that
 * appeared because a rule was broken would be a lie about the data.
 */
export function pairWarnings(args: {
  engine: RuleEngine
  rules: readonly ConstraintDef[]
  candidate: RowRef
  source: RowRef
}): PairWarning[] {
  const { engine, rules, candidate, source } = args
  if (!rules || rules.length === 0) return NONE
  const out: PairWarning[] = []
  for (const c of rules) {
    const then = c.then
    if (!then) continue
    try {
      if (!bothSidesRead(then, candidate, source)) continue
      if (evalPairRule(engine, then, candidate, source)) continue
    } catch {
      continue
    }
    const because = typeof c.because === 'string' ? c.because.trim() : ''
    out.push({ constraintId: c.id, because })
  }
  return out.length > 0 ? out : NONE
}
