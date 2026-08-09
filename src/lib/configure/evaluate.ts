/* ============================================================
   Configure — three-valued evaluation, and negation.

   A clause is tested against DOMAINS, not against a row, so the honest
   answer has three values:

     'T'  every surviving value satisfies it — it definitely holds
     'F'  no surviving value satisfies it — it definitely cannot hold
     'M'  maybe: some do, some do not, or we cannot tell yet

   NOTHING EVER FIRES ON A MAYBE. That single discipline is what stops
   the solver from ruling out an option the user could still have had.

   `negate` is what makes constraints run both ways: the contrapositive
   of "when A then B" is "when not B then not A", and it is the reason
   picking a 300 hp motor narrows the hull list.
   ============================================================ */

import {
  UNARY_OPS,
  type CellValue,
  type Clause,
  type ClauseGroup,
  type CompareOp,
} from '@/types/model'
import type { FieldDomain } from './domain'
import { compare, isBlank, testUnary } from './values'

export type Truth = 'T' | 'F' | 'M'

export type Domains = Map<string, FieldDomain>

/** Field-against-field tests compare every surviving pair. The cap
 *  keeps a pathological pair of 500-option columns from stalling a
 *  keystroke; past it we answer 'M' and prune nothing. */
export const MAX_PAIRS = 4096

const isUnary = (op: CompareOp): boolean => UNARY_OPS.includes(op)

/** The field a clause tests, or undefined when it cannot be resolved
 *  here — a relationship hop (`viaFieldId`) needs rows, and there are
 *  no rows in a configuration. */
export function clauseFieldId(clause: Clause | undefined): string | undefined {
  if (!clause || !clause.left || !clause.left.fieldId) return undefined
  if (clause.left.viaFieldId) return undefined
  return clause.left.fieldId
}

/** The other field a clause reads, when its right-hand side is a
 *  column rather than a literal. */
export function clauseRightFieldId(clause: Clause | undefined): string | undefined {
  const right = clause?.right
  if (!right || right.kind !== 'field') return undefined
  if (!right.path || !right.path.fieldId || right.path.viaFieldId) return undefined
  return right.path.fieldId
}

/** Collapse a set of per-value answers into one truth value. */
function verdict(all: boolean, none: boolean, unknown: boolean): Truth {
  if (unknown) return 'M'
  if (all) return 'T'
  if (none) return 'F'
  return 'M'
}

export function evalClause(doms: Domains, clause: Clause | undefined): Truth {
  const leftId = clauseFieldId(clause)
  if (!clause || !leftId) return 'M'
  const left = doms.get(leftId)
  if (!left || left.values.length === 0) return 'M'

  if (isUnary(clause.op)) {
    let all = true
    let none = true
    for (const v of left.values) {
      if (testUnary(clause.op, v)) none = false
      else all = false
    }
    return verdict(all, none, false)
  }

  const right = clause.right
  if (!right) return 'M'

  if (right.kind === 'literal') {
    const rv = right.value === undefined ? null : right.value
    /* nothing written on the right yet — the same unfinished rule as a
       missing right-hand side. Answering 'F' here would fire the
       contrapositive and prune the OTHER column. */
    if (isBlank(rv)) return 'M'
    let all = true
    let none = true
    let unknown = false
    for (const v of left.values) {
      const r = compare(clause.op, v, rv)
      if (r === undefined) unknown = true
      else if (r) none = false
      else all = false
    }
    return verdict(all, none, unknown)
  }

  if (right.kind === 'field') {
    const rightId = clauseRightFieldId(clause)
    if (!rightId) return 'M'
    const rd = doms.get(rightId)
    if (!rd || rd.values.length === 0) return 'M'
    if (left.values.length * rd.values.length > MAX_PAIRS) return 'M'
    let all = true
    let none = true
    let unknown = false
    for (const a of left.values) {
      for (const b of rd.values) {
        const r = compare(clause.op, a, b)
        if (r === undefined) unknown = true
        else if (r) none = false
        else all = false
      }
    }
    return verdict(all, none, unknown)
  }

  /* a formula right-hand side needs a row to evaluate against */
  return 'M'
}

/** AND is false as soon as one clause is false; true only when every
 *  clause is. OR mirrors it. An EMPTY group is 'M', never 'T' — an
 *  unfinished rule must not silently constrain everything. */
export function evalGroup(doms: Domains, group: ClauseGroup | undefined): Truth {
  const clauses = group?.clauses ?? []
  if (clauses.length === 0) return 'M'

  if (group?.combinator === 'OR') {
    let maybe = false
    for (const c of clauses) {
      const t = evalClause(doms, c)
      if (t === 'T') return 'T'
      if (t === 'M') maybe = true
    }
    return maybe ? 'M' : 'F'
  }

  let maybe = false
  for (const c of clauses) {
    const t = evalClause(doms, c)
    if (t === 'F') return 'F'
    if (t === 'M') maybe = true
  }
  return maybe ? 'M' : 'T'
}

const NEG_OP: Partial<Record<CompareOp, CompareOp>> = {
  eq: 'neq',
  neq: 'eq',
  gt: 'lte',
  lte: 'gt',
  gte: 'lt',
  lt: 'gte',
  isEmpty: 'notEmpty',
  notEmpty: 'isEmpty',
  isTrue: 'isFalse',
  isFalse: 'isTrue',
}

/** The opposite clause, or undefined when our operator vocabulary
 *  cannot express it (there is no "does not contain"). */
export function negateClause(clause: Clause | undefined): Clause | undefined {
  if (!clause) return undefined
  const op = NEG_OP[clause.op]
  if (!op) return undefined
  return { ...clause, op }
}

/** De Morgan over a flat group. Returns undefined when any part of it
 *  cannot be negated — a half-inverted rule would be worse than none,
 *  so we decline rather than guess. */
export function negateGroup(group: ClauseGroup | undefined): ClauseGroup | undefined {
  const clauses = group?.clauses ?? []
  if (clauses.length === 0) return undefined
  const flipped: Clause[] = []
  for (const c of clauses) {
    const n = negateClause(c)
    if (!n) return undefined
    flipped.push(n)
  }
  return {
    combinator: group?.combinator === 'OR' ? 'AND' : 'OR',
    clauses: flipped,
  }
}

/** Values a literal-equality clause admits, used by the OR collapse. */
export function literalOf(clause: Clause | undefined): CellValue | undefined {
  const right = clause?.right
  if (!right || right.kind !== 'literal') return undefined
  return right.value === undefined ? null : right.value
}
