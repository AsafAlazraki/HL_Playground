/* ============================================================
   Configure — the constraint solver.

   ARC-CONSISTENCY PROPAGATION OVER FINITE DOMAINS, RUN TO A FIXPOINT.
   Not a search, not backtracking, no guessing: it only ever REMOVES
   values that no enabled rule can permit, and repeats until a whole
   pass changes nothing.

   Four properties this file is written to keep, in order:

   1. CONSTRAINTS RUN BOTH WAYS. "When A then B" also prunes by its
      contrapositive — if B has become impossible, A is ruled out. That
      is why choosing a 300 hp motor narrows the HULL list, and it is
      the difference between a tool that checks answers and one that
      understands the product.

   2. THE REASON IS RECORDED AT THE MOMENT OF REMOVAL. Every pruned
      value gets `{ constraintId, because }` written by the code doing
      the pruning — `prune()` is the only path, and it always records.
      Nothing is ever reconstructed afterwards, which is what makes
      "ask why" honest.

   3. NEVER A SILENT FAILURE. A domain that empties is reported as a
      problem naming the constraint that emptied it, in plain English.

   4. TOTAL AND BOUNDED. Unknown field ids, constraints pointing at
      deleted columns, cyclic implications, empty inputs — all return a
      valid state. Propagation is capped and reports a warning rather
      than spinning.
   ============================================================ */

import {
  UNARY_OPS,
  type BlockedValue,
  type CellValue,
  type Clause,
  type ClauseGroup,
  type ConfigureState,
  type ConstraintDef,
  type FieldDef,
} from '@/types/model'
import { makeDomain, type FieldDomain } from './domain'
import {
  clauseFieldId,
  clauseRightFieldId,
  evalClause,
  evalGroup,
  literalOf,
  negateGroup,
  type Domains,
} from './evaluate'
import { compare, formatValue, isBlank, setKey, testUnary, valueKey } from './values'

/** One partial configuration: the columns in play, the rules in force,
 *  and what the person has chosen so far. */
export interface ConfigureInput {
  fields: FieldDef[]
  constraints: ConstraintDef[]
  /** fieldId -> the chosen value. `null` or absent means "not chosen". */
  chosen: Record<string, CellValue>
}

/** Safety cap on propagation passes. Every pass either removes at
 *  least one value or ends the loop, so a real model converges in two
 *  or three; the cap exists so no input can ever spin. */
export const MAX_ROUNDS = 1000

interface Ctx {
  doms: Domains
  chosen: Record<string, CellValue>
  blocked: Record<string, Record<string, BlockedValue>>
  fired: string[]
  firedSet: Set<string>
  problems: Array<{ constraintId: string; message: string }>
  problemKeys: Set<string>
}

/* ---------------------------------------------------------- */
/* Reporting                                                  */
/* ---------------------------------------------------------- */

const becauseOf = (c: ConstraintDef): string => (c && typeof c.because === 'string' ? c.because.trim() : '')

const becauseTail = (c: ConstraintDef): string => {
  const b = becauseOf(c)
  return b ? `, because ${b}` : ''
}

function addProblem(ctx: Ctx, constraintId: string, message: string): void {
  const key = `${constraintId}|${message}`
  if (ctx.problemKeys.has(key)) return
  ctx.problemKeys.add(key)
  ctx.problems.push({ constraintId, message })
}

function markFired(ctx: Ctx, id: string): void {
  if (ctx.firedSet.has(id)) return
  ctx.firedSet.add(id)
  ctx.fired.push(id)
}

const fieldName = (d: FieldDomain | undefined): string => {
  const n = d?.field?.name
  return typeof n === 'string' && n.trim() !== '' ? n.trim() : 'this field'
}

/* ---------------------------------------------------------- */
/* prune — the ONLY way a value ever leaves a domain           */
/* ---------------------------------------------------------- */

/**
 * Remove every value of `fieldId` that `keep` rejects, recording the
 * constraint's own `because` clause against each one as it goes.
 * Returns true when something actually changed.
 *
 * A predicate that throws keeps the value: rules fail open.
 */
function prune(
  ctx: Ctx,
  fieldId: string,
  keep: (v: CellValue) => boolean,
  c: ConstraintDef,
): boolean {
  const d = ctx.doms.get(fieldId)
  /* nothing enumerable to narrow: an open column nobody has chosen,
     or a domain some earlier rule already emptied */
  if (!d || d.values.length === 0) return false

  const kept: CellValue[] = []
  const removed: CellValue[] = []
  for (const v of d.values) {
    let ok = true
    try {
      ok = keep(v)
    } catch {
      ok = true
    }
    if (ok) kept.push(v)
    else removed.push(v)
  }
  if (removed.length === 0) return false

  const because = becauseOf(c)
  let bucket = Object.prototype.hasOwnProperty.call(ctx.blocked, fieldId)
    ? ctx.blocked[fieldId]
    : undefined
  if (!bucket) {
    bucket = {}
    setKey(ctx.blocked, fieldId, bucket)
  }
  for (const v of removed) {
    const k = valueKey(v)
    if (!Object.prototype.hasOwnProperty.call(bucket, k)) {
      setKey(bucket, k, { constraintId: c.id, because })
    }
  }

  d.values = kept
  d.keys = new Set(kept.map(valueKey))
  markFired(ctx, c.id)

  if (kept.length === 0) {
    /* Freeze the field. Clauses on an empty domain read as unknown, so
       one true contradiction cannot cascade into invented ones. */
    d.broken = true
    const name = fieldName(d)
    const tail = becauseTail(c)
    const chosen = Object.prototype.hasOwnProperty.call(ctx.chosen, fieldId)
      ? ctx.chosen[fieldId]
      : undefined
    const message =
      d.fixed && chosen !== undefined && chosen !== null
        ? `Your choice of ${formatValue(chosen)} for ${name} no longer works${tail}.`
        : `Nothing is left for ${name}${tail}.`
    addProblem(ctx, c.id, message)
  }
  return true
}

/* ---------------------------------------------------------- */
/* enforce — make a group hold, by narrowing                   */
/* ---------------------------------------------------------- */

function enforceClause(ctx: Ctx, clause: Clause | undefined, c: ConstraintDef): boolean {
  const leftId = clauseFieldId(clause)
  if (!clause || !leftId) return false
  const left = ctx.doms.get(leftId)
  if (!left || left.values.length === 0) return false

  const op = clause.op

  /* unary: no right-hand side to resolve */
  if (UNARY_OPS.includes(op)) {
    return prune(ctx, leftId, (v) => testUnary(op, v), c)
  }

  /* a binary operator with nothing to compare against is an unfinished
     rule, not a rule that rejects everything */
  const right = clause.right
  if (!right) return false

  if (right.kind === 'literal') {
    const rv = right.value === undefined ? null : right.value
    /* and a value box cleared to blank is the same unfinished rule.
       Without this, `compare('eq', v, '')` is false for every value and
       the column empties — blaming a rule whose reason is still empty. */
    if (isBlank(rv)) return false
    /* an incomparable pair keeps the value — we do not know it is wrong */
    return prune(ctx, leftId, (v) => compare(op, v, rv) !== false, c)
  }

  if (right.kind === 'field') {
    const rightId = clauseRightFieldId(clause)
    if (!rightId || rightId === leftId) return false
    const rd = ctx.doms.get(rightId)
    if (!rd || rd.values.length === 0) return false

    /* Both columns are narrowed. A value survives on one side only if
       SOME value on the other side can go with it — arc consistency in
       both directions, which is the contrapositive at clause level. */
    const rightValues = rd.values.slice()
    let changed = prune(
      ctx,
      leftId,
      (v) => rightValues.some((w) => compare(op, v, w) !== false),
      c,
    )
    const leftValues = left.values.slice()
    if (leftValues.length > 0) {
      changed =
        prune(ctx, rightId, (w) => leftValues.some((v) => compare(op, v, w) !== false), c) ||
        changed
    }
    return changed
  }

  /* a formula right-hand side needs a row; nothing to enforce here */
  return false
}

/** Every disjunct is `<same column> is <literal>` — the "is one of"
 *  shape. Then the column may be narrowed to the union of those
 *  literals, which is exact rather than conservative. */
function sameFieldEqUnion(
  clauses: Clause[],
): { fieldId: string; keys: Set<string> } | undefined {
  let fieldId: string | undefined
  const keys = new Set<string>()
  for (const cl of clauses) {
    if (!cl || cl.op !== 'eq') return undefined
    const id = clauseFieldId(cl)
    if (!id) return undefined
    if (fieldId === undefined) fieldId = id
    else if (fieldId !== id) return undefined
    const lit = literalOf(cl)
    /* an unfinished disjunct makes the whole union unfinished — this
       path narrows without going through enforceClause, so it needs the
       blank guard of its own */
    if (lit === undefined || isBlank(lit)) return undefined
    keys.add(valueKey(lit))
  }
  return fieldId ? { fieldId, keys } : undefined
}

function enforceGroup(ctx: Ctx, group: ClauseGroup | undefined, c: ConstraintDef): boolean {
  const clauses = (group?.clauses ?? []).filter(Boolean)
  if (clauses.length === 0) return false

  if (group?.combinator !== 'OR') {
    let changed = false
    for (const cl of clauses) changed = enforceClause(ctx, cl, c) || changed
    return changed
  }

  /* OR — only narrow when the answer is unambiguous */
  const truths = clauses.map((cl) => evalClause(ctx.doms, cl))
  if (truths.some((t) => t === 'T')) return false /* already satisfied */

  const union = sameFieldEqUnion(clauses)
  if (union) {
    const { fieldId, keys } = union
    return prune(ctx, fieldId, (v) => keys.has(valueKey(v)), c)
  }

  const live = clauses.filter((_, i) => truths[i] !== 'F')
  if (live.length === 1) return enforceClause(ctx, live[0], c)
  if (live.length === 0) {
    addProblem(ctx, c.id, `This rule can no longer be satisfied${becauseTail(c)}.`)
  }
  return false
}

/* ---------------------------------------------------------- */
/* table — the curated whitelist                               */
/* ---------------------------------------------------------- */

function applyTable(ctx: Ctx, c: ConstraintDef): boolean {
  const combos = (Array.isArray(c.combinations) ? c.combinations : []).filter(
    (r) => r && typeof r === 'object',
  )
  if (combos.length === 0) return false

  /* `if` acts as an optional guard ("whenever…"). Empty = unguarded. */
  const guard = c.if
  if ((guard?.clauses?.length ?? 0) > 0 && evalGroup(ctx.doms, guard) !== 'T') return false

  const live = combos.filter((combo) =>
    Object.keys(combo).every((fid) => {
      const d = ctx.doms.get(fid)
      /* a column this build does not have, or one with nothing known
         yet, cannot rule a combination out */
      if (!d || d.values.length === 0) return true
      return d.keys.has(valueKey(combo[fid]))
    }),
  )

  if (live.length === 0) {
    addProblem(
      ctx,
      c.id,
      `None of the ${combos.length} approved combination${combos.length === 1 ? '' : 's'} fit${becauseTail(c)}.`,
    )
    return false
  }

  const involved = new Set<string>()
  for (const combo of combos) for (const fid of Object.keys(combo)) involved.add(fid)

  let changed = false
  for (const fid of involved) {
    /* a combination that leaves the column out permits any value of it */
    if (live.some((combo) => !Object.prototype.hasOwnProperty.call(combo, fid))) continue
    const allowed = new Set(live.map((combo) => valueKey(combo[fid])))
    changed = prune(ctx, fid, (v) => allowed.has(valueKey(v)), c) || changed
  }
  return changed
}

/* ---------------------------------------------------------- */
/* one constraint, both directions                             */
/* ---------------------------------------------------------- */

function applyConstraint(ctx: Ctx, c: ConstraintDef): boolean {
  switch (c.kind) {
    /* When A, then B must hold. `requires` narrows identically — the
       difference is that it also OBLIGES an answer, which is a matter
       for the step flow, not for the domains. */
    case 'implies':
    case 'requires': {
      let changed = false
      if (evalGroup(ctx.doms, c.if) === 'T') changed = enforceGroup(ctx, c.then, c) || changed
      /* the contrapositive: B is impossible, so A must not happen */
      if (evalGroup(ctx.doms, c.then) === 'F') {
        const notA = negateGroup(c.if)
        if (notA) changed = enforceGroup(ctx, notA, c) || changed
      }
      return changed
    }

    /* Never A together with B — symmetric, so both ways always. */
    case 'excludes': {
      let changed = false
      if (evalGroup(ctx.doms, c.if) === 'T') {
        const notB = negateGroup(c.then)
        if (notB) changed = enforceGroup(ctx, notB, c) || changed
      }
      if (evalGroup(ctx.doms, c.then) === 'T') {
        const notA = negateGroup(c.if)
        if (notA) changed = enforceGroup(ctx, notA, c) || changed
      }
      return changed
    }

    case 'table':
      return applyTable(ctx, c)

    default:
      /* a kind from a newer file than this one: ignore it, never throw */
      return false
  }
}

/* ---------------------------------------------------------- */
/* solve                                                       */
/* ---------------------------------------------------------- */

const clauseCount = (g: ClauseGroup | undefined): number => g?.clauses?.length ?? 0

/** Higher priority first, then the more specific rule, then authoring
 *  order. Removal is order-independent — the fixpoint is the same
 *  whatever the order — but WHICH rule gets named first is not, and
 *  that is what the user reads. */
function orderConstraints(list: ConstraintDef[]): ConstraintDef[] {
  return list
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const pa = typeof a.c.priority === 'number' ? a.c.priority : 0
      const pb = typeof b.c.priority === 'number' ? b.c.priority : 0
      if (pa !== pb) return pb - pa
      const sa = clauseCount(a.c.if) + clauseCount(a.c.then)
      const sb = clauseCount(b.c.if) + clauseCount(b.c.then)
      if (sa !== sb) return sb - sa
      return a.i - b.i
    })
    .map((x) => x.c)
}

/**
 * Given ONE partial configuration, work out what every field can still
 * be — and why everything else went.
 *
 * Pure, deterministic, and total: it never throws, for any input.
 */
export function solve(input: ConfigureInput): ConfigureState {
  const ctx: Ctx = {
    doms: new Map(),
    chosen: {},
    blocked: {},
    fired: [],
    firedSet: new Set(),
    problems: [],
    problemKeys: new Set(),
  }

  try {
    const rawChosen = input && typeof input.chosen === 'object' && input.chosen ? input.chosen : {}
    ctx.chosen = rawChosen

    /* seed one domain per field, first definition wins on a duplicate id */
    const fields = Array.isArray(input?.fields) ? input.fields : []
    for (const f of fields) {
      if (!f || typeof f.id !== 'string' || f.id === '') continue
      if (ctx.doms.has(f.id)) continue
      const chosen = Object.prototype.hasOwnProperty.call(rawChosen, f.id)
        ? rawChosen[f.id]
        : undefined
      ctx.doms.set(f.id, makeDomain(f, chosen))
    }

    const all = Array.isArray(input?.constraints) ? input.constraints : []
    const active = orderConstraints(
      all.filter((c) => c && typeof c.id === 'string' && c.id !== '' && c.enabled !== false),
    )

    /* propagate to a fixpoint */
    let rounds = 0
    let lastMover: ConstraintDef | undefined
    if (active.length > 0) {
      for (; rounds < MAX_ROUNDS; rounds++) {
        let changed = false
        for (const c of active) {
          let did = false
          try {
            did = applyConstraint(ctx, c)
          } catch {
            /* one broken rule must never take the solve down */
            did = false
          }
          if (did) {
            changed = true
            lastMover = c
          }
        }
        if (!changed) break
      }
      if (rounds >= MAX_ROUNDS) {
        const tail = lastMover ? ` — the last one to act was: ${becauseOf(lastMover) || lastMover.id}` : ''
        addProblem(
          ctx,
          lastMover?.id ?? '',
          `Stopped after ${MAX_ROUNDS} passes because the rules were still changing the answer${tail}.`,
        )
      }
    }
  } catch {
    /* fall through and return whatever was worked out — never throw */
  }

  const domains: Record<string, CellValue[]> = {}
  const settled: Record<string, CellValue> = {}
  for (const [id, d] of ctx.doms) {
    setKey(domains, id, d.values.slice())
    if (d.values.length === 1) setKey(settled, id, d.values[0])
  }

  return {
    domains,
    blocked: ctx.blocked,
    settled,
    fired: ctx.fired,
    problems: ctx.problems,
  }
}

/**
 * Why is this value unavailable? Returns the reason recorded at the
 * moment it was removed, or undefined when the value was never blocked
 * (it may simply not be chosen).
 */
export function explain(
  state: ConfigureState,
  fieldId: string,
  value: CellValue,
): BlockedValue | undefined {
  if (!state || !fieldId) return undefined
  const bucket = state.blocked
    ? Object.prototype.hasOwnProperty.call(state.blocked, fieldId)
      ? state.blocked[fieldId]
      : undefined
    : undefined
  if (!bucket) return undefined
  const k = valueKey(value)
  return Object.prototype.hasOwnProperty.call(bucket, k) ? bucket[k] : undefined
}
