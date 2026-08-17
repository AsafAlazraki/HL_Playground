/* ============================================================
   EDITING A SENTENCE — pure transforms, one per token.

   Every underlined word in the sentence maps to exactly one function
   here. They take a ConstraintDef and return a new one; nothing in
   this file touches React, the registry or the store, so the same
   transforms drive the live cards AND the unsaved draft in the
   builder. That is why the builder and the editor cannot drift.
   ============================================================ */

import { newId, nowIso } from '@/lib/id'
import type {
  CellValue,
  Clause,
  ClauseGroup,
  ConstraintDef,
  ConstraintKind,
} from '@/types/model'
import {
  UNSET_FIELD,
  UNSET_VALUE,
  isUnsetValue,
  representativeFieldId,
  type ColumnConcept,
} from './columns'
import {
  ONE_OF,
  asOneOf,
  domainOf,
  isUnary,
  opsFor,
  type SentenceCtx,
  type SentenceOp,
  type Side,
} from './describe'

const stamp = (c: ConstraintDef): ConstraintDef => ({
  ...c,
  edited: true,
  updatedAt: nowIso(),
})

const sideGroup = (c: ConstraintDef, side: Side): ClauseGroup | undefined =>
  side === 'if' ? c.if : c.then

function withSide(c: ConstraintDef, side: Side, group: ClauseGroup): ConstraintDef {
  return side === 'if' ? { ...c, if: group } : { ...c, then: group }
}

function mapClause(
  group: ClauseGroup,
  clauseId: string,
  fn: (clause: Clause) => Clause,
): ClauseGroup {
  return { ...group, clauses: group.clauses.map((cl) => (cl.id === clauseId ? fn(cl) : cl)) }
}

export function makeClause(concept: ColumnConcept, ctx: SentenceCtx, op?: SentenceOp): Clause {
  const domain = domainOf(ctx, concept)
  const chosen: SentenceOp = op && opsFor(domain).includes(op) ? op : 'eq'
  const real = chosen === ONE_OF ? 'eq' : chosen
  if (isUnary(real)) {
    return { id: newId(), left: { fieldId: representativeFieldId(concept) }, op: real }
  }
  /* the column is chosen, the VALUE is not — see UNSET_VALUE */
  return {
    id: newId(),
    left: { fieldId: representativeFieldId(concept) },
    op: real,
    right: { kind: 'literal', value: UNSET_VALUE },
  }
}

/** A clause with nothing answered: no column, no value. This is what a
 *  brand-new sentence is made of, so the words on screen are the ones a
 *  person is being asked for rather than a rule they never wrote. */
export function emptyClause(): Clause {
  return {
    id: newId(),
    left: { fieldId: UNSET_FIELD },
    op: 'eq',
    right: { kind: 'literal', value: UNSET_VALUE },
  }
}

/** Put a side back to "no column chosen". Used when retargeting the
 *  condition strands the obligation on a different kind of table: the
 *  old alternative was to silently point it at some other column of the
 *  new kind, which invents half a rule on the reader's behalf. */
export function unsetSide(c: ConstraintDef, side: Side): ConstraintDef {
  return stamp(withSide(c, side, singleGroup(emptyClause())))
}

export function singleGroup(clause: Clause): ClauseGroup {
  return { combinator: 'AND', clauses: [clause] }
}

/* ---------------------------------------------------------- */
/* The three token edits                                      */
/* ---------------------------------------------------------- */

/** Point a clause at a different column. The old value almost never
 *  belongs to the new column, so it is replaced rather than carried
 *  across as nonsense. */
export function setClauseConcept(
  c: ConstraintDef,
  side: Side,
  clauseId: string,
  concept: ColumnConcept,
  ctx: SentenceCtx,
): ConstraintDef {
  const group = sideGroup(c, side)
  if (!group) return c
  const oneOf = asOneOf(group, ctx)
  /* an `is one of` set is about ONE column; retargeting it retargets
     the whole set, and the old values go with the old column */
  if (oneOf) {
    return stamp(withSide(c, side, { combinator: 'OR', clauses: [makeClause(concept, ctx)] }))
  }
  const fresh = makeClause(concept, ctx)
  return stamp(
    withSide(
      c,
      side,
      mapClause(group, clauseId, (cl) => ({ ...fresh, id: cl.id })),
    ),
  )
}

/** Change the verb. `is one of` is the only one that changes shape:
 *  it turns the group into an OR and back. */
export function setClauseOp(
  c: ConstraintDef,
  side: Side,
  clauseId: string,
  op: SentenceOp,
  ctx: SentenceCtx,
): ConstraintDef {
  const group = sideGroup(c, side)
  if (!group) return c
  const oneOf = asOneOf(group, ctx)

  if (op === ONE_OF) {
    if (oneOf) return c
    const clause = group.clauses.find((cl) => cl.id === clauseId)
    if (!clause) return c
    const held =
      clause.right && clause.right.kind === 'literal' ? clause.right.value : UNSET_VALUE
    /* THE SET OPENS ON WHATEVER WAS ALREADY CHOSEN, AND ON NOTHING IF
       NOTHING WAS. It used to reach for `options[0]` so the sentence
       would not read "is one of …" — but a value the app picked reads
       exactly like a value the dealer picked, and this is a live rule.
       An empty member is the truth, and the `+` beside it is the ask. */
    const value: CellValue = isUnsetValue(held) ? UNSET_VALUE : held
    return stamp(
      withSide(c, side, {
        combinator: 'OR',
        clauses: [{ id: clause.id, left: clause.left, op: 'eq', right: { kind: 'literal', value } }],
      }),
    )
  }

  if (oneOf) {
    /* collapsing a set back to one value keeps the first choice */
    const first = group.clauses[0]
    const kept: Clause = isUnary(op)
      ? { id: first.id, left: first.left, op }
      : { id: first.id, left: first.left, op, right: first.right ?? { kind: 'literal', value: '' } }
    return stamp(withSide(c, side, singleGroup(kept)))
  }

  return stamp(
    withSide(
      c,
      side,
      mapClause(group, clauseId, (cl) => {
        if (isUnary(op)) {
          const next: Clause = { id: cl.id, left: cl.left, op }
          return next
        }
        return {
          ...cl,
          op,
          right: cl.right ?? { kind: 'literal', value: '' },
        }
      }),
    ),
  )
}

export function setClauseValue(
  c: ConstraintDef,
  side: Side,
  clauseId: string,
  value: CellValue,
): ConstraintDef {
  const group = sideGroup(c, side)
  if (!group) return c
  return stamp(
    withSide(
      c,
      side,
      mapClause(group, clauseId, (cl) => ({ ...cl, right: { kind: 'literal', value } })),
    ),
  )
}

/* -- the `is one of` chips ----------------------------------- */

export function addOneOfValue(
  c: ConstraintDef,
  side: Side,
  value: CellValue,
  ctx: SentenceCtx,
): ConstraintDef {
  const group = sideGroup(c, side)
  if (!group) return c
  const oneOf = asOneOf(group, ctx)
  if (!oneOf) return c
  if (oneOf.values.some((v) => String(v) === String(value))) return c
  return stamp(
    withSide(c, side, {
      combinator: 'OR',
      clauses: [
        ...group.clauses,
        {
          id: newId(),
          left: { fieldId: oneOf.head.left.fieldId },
          op: 'eq',
          right: { kind: 'literal', value },
        },
      ],
    }),
  )
}

/** Removing the last-but-one chip collapses the set back to a plain
 *  `is`, so the sentence never says "is one of" about one thing. */
export function removeOneOfValue(
  c: ConstraintDef,
  side: Side,
  value: CellValue,
  ctx: SentenceCtx,
): ConstraintDef {
  const group = sideGroup(c, side)
  if (!group) return c
  const oneOf = asOneOf(group, ctx)
  if (!oneOf || group.clauses.length <= 1) return c
  const clauses = group.clauses.filter(
    (cl) => !(cl.right?.kind === 'literal' && String(cl.right.value) === String(value)),
  )
  if (clauses.length === 0) return c
  return stamp(withSide(c, side, { combinator: 'OR', clauses }))
}

/* ---------------------------------------------------------- */
/* The rest of the card                                       */
/* ---------------------------------------------------------- */

export function setBecause(c: ConstraintDef, because: string): ConstraintDef {
  return stamp({ ...c, because })
}

/** `requires` is `implies` whose obligation is "must be chosen" —
 *  keeping the stored kind honest costs one line and means an export
 *  says what the sentence says. */
export function inferKind(c: ConstraintDef): ConstraintKind {
  if (c.kind === 'excludes' || c.kind === 'table') return c.kind
  const thenClauses = c.then?.clauses ?? []
  const allChosen = thenClauses.length > 0 && thenClauses.every((cl) => cl.op === 'notEmpty')
  return allChosen ? 'requires' : 'implies'
}
