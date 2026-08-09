/* ============================================================
   LIVE STATE — a rule you can see working is a rule you trust.

   MOCKUP_FINDINGS §1.2 records the failure this cures twice over:
   "a compatibility matrix nothing reads", "a rule engine with no
   editor". A rule shown as inert config is a rule nobody believes.

   The mockup reads its badges out of a solve trace. We have no
   configurator session mounted yet, so we read them out of the thing
   we DO have and the user does care about: their own rows.

     ACTIVE NOW   rows in this organisation currently satisfy the
                  "when" side — the rule is doing work right now
     CONFLICT     rows satisfy the "when" side and BREAK the "must"
                  side — the data and the rule disagree, and the rule
                  names how many rows
     OFF          switched off
     EDITED       someone has changed it since it was written

   One table per brand (CONFIGURATOR_SPEC §3-zero) means a rule about
   `boat` is evaluated against EVERY boat table that carries the
   columns it names. That is the whole reason TableKind exists.

   Pure functions: no React, no store reads.
   ============================================================ */

import { readCell } from '@/types/model'
import { compareValues, isEmptyValue } from '@/lib/rules'
import type { CellValue, Clause, ClauseGroup, ConstraintDef, EntityDef } from '@/types/model'
import type { RowData } from '@/types/model'
import { fieldOn } from './columns'
import { literalOf, type SentenceCtx } from './describe'

export interface ConstraintStatus {
  id: string
  /** at least one table carries every column the sentence names */
  scoped: boolean
  /** tables the rule reaches */
  tables: number
  /** rows where the "when" side holds */
  matched: number
  /** rows where the "when" side holds and the "must" side does not */
  conflicts: number
}

export type BadgeKind = 'conflict' | 'active' | 'off' | 'edited'

const EMPTY_STATUS = (id: string): ConstraintStatus => ({
  id,
  scoped: false,
  tables: 0,
  matched: 0,
  conflicts: 0,
})

/* ---------------------------------------------------------- */
/* Evaluating one clause against one row of one table          */
/* ---------------------------------------------------------- */

function clauseHolds(
  clause: Clause,
  table: EntityDef,
  row: RowData,
  ctx: SentenceCtx,
): boolean | undefined {
  const concept = ctx.index.get(clause.left.fieldId)
  if (!concept) return undefined
  const field = fieldOn(concept, table)
  if (!field) return undefined
  const left: CellValue = readCell(row, field.id)

  switch (clause.op) {
    case 'isEmpty':
      return isEmptyValue(left)
    case 'notEmpty':
      return !isEmptyValue(left)
    case 'isTrue':
      return left === true
    case 'isFalse':
      return left === false
    default:
      break
  }

  const right = literalOf(clause.right)
  /* a boolean column stored as a select string still has to compare */
  const coerced: CellValue =
    typeof left === 'boolean' && typeof right === 'string'
      ? right === 'yes' || right === 'true'
      : right
  return compareValues(clause.op, left, coerced).result
}

function groupHolds(
  group: ClauseGroup | undefined,
  table: EntityDef,
  row: RowData,
  ctx: SentenceCtx,
): boolean | undefined {
  if (!group || group.clauses.length === 0) return undefined
  const results: boolean[] = []
  for (const clause of group.clauses) {
    const r = clauseHolds(clause, table, row, ctx)
    if (r === undefined) return undefined
    results.push(r)
  }
  return group.combinator === 'OR' ? results.some(Boolean) : results.every(Boolean)
}

/** Tables that carry a column for every concept the sentence names.
 *  A rule spanning two kinds has none, and reports itself unscoped
 *  rather than silently claiming zero. */
function tablesFor(c: ConstraintDef, ctx: SentenceCtx): EntityDef[] {
  const clauses = [...c.if.clauses, ...(c.then?.clauses ?? [])]
  if (clauses.length === 0) return []
  const concepts = clauses.map((cl) => ctx.index.get(cl.left.fieldId))
  if (concepts.some((x) => !x)) return []
  const out: EntityDef[] = []
  for (const table of Object.values(ctx.entities)) {
    if (concepts.every((concept) => concept && fieldOn(concept, table))) out.push(table)
  }
  return out
}

/* ---------------------------------------------------------- */
/* The pass                                                   */
/* ---------------------------------------------------------- */

export function evaluateConstraint(c: ConstraintDef, ctx: SentenceCtx): ConstraintStatus {
  const tables = tablesFor(c, ctx)
  if (tables.length === 0) return EMPTY_STATUS(c.id)

  let matched = 0
  let conflicts = 0

  for (const table of tables) {
    for (const row of ctx.rowsByEntity[table.id] ?? []) {
      const whenHolds = groupHolds(c.if, table, row, ctx)
      if (whenHolds !== true) continue
      matched += 1
      if (c.kind === 'table') continue
      const mustHolds = groupHolds(c.then, table, row, ctx)
      if (mustHolds === undefined) continue
      /* `excludes` is broken by the two sides being true TOGETHER;
         everything else is broken by the obligation failing */
      const broken = c.kind === 'excludes' ? mustHolds : !mustHolds
      if (broken) conflicts += 1
    }
  }

  return { id: c.id, scoped: true, tables: tables.length, matched, conflicts }
}

export function evaluateConstraints(
  constraints: ConstraintDef[],
  ctx: SentenceCtx,
): Record<string, ConstraintStatus> {
  const out: Record<string, ConstraintStatus> = {}
  for (const c of constraints) {
    out[c.id] = c.enabled ? evaluateConstraint(c, ctx) : EMPTY_STATUS(c.id)
  }
  return out
}

/* ---------------------------------------------------------- */
/* Badges                                                     */
/* ---------------------------------------------------------- */

export function badgesFor(c: ConstraintDef, status: ConstraintStatus | undefined): BadgeKind[] {
  const out: BadgeKind[] = []
  if (!c.enabled) out.push('off')
  else if (status?.conflicts) out.push('conflict')
  else if (status?.matched) out.push('active')
  if (c.edited) out.push('edited')
  return out
}

export const BADGE_LABEL: Record<BadgeKind, string> = {
  conflict: 'CONFLICT',
  active: 'ACTIVE NOW',
  off: 'OFF',
  edited: 'EDITED',
}

/** Conflicts surface first — they are the only state that asks
 *  something of the reader. Then what is working, then the quiet
 *  ones, and the switched-off sink to the bottom. */
export function sortConstraints(
  constraints: ConstraintDef[],
  statuses: Record<string, ConstraintStatus>,
): ConstraintDef[] {
  const rank = (c: ConstraintDef): number => {
    if (!c.enabled) return 3
    const s = statuses[c.id]
    if (s?.conflicts) return 0
    if (s?.matched) return 1
    return 2
  }
  return [...constraints].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    const ca = statuses[a.id]?.conflicts ?? 0
    const cb = statuses[b.id]?.conflicts ?? 0
    if (ca !== cb) return cb - ca
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/** The mono line under a sentence: what the rule is actually touching.
 *  Empty string when there is nothing worth saying. */
export function statusNote(status: ConstraintStatus | undefined): string {
  if (!status || !status.scoped) return ''
  const tables = `${status.tables} table${status.tables === 1 ? '' : 's'}`
  if (status.conflicts > 0) {
    return `${status.conflicts} row${status.conflicts === 1 ? '' : 's'} break this · ${tables}`
  }
  if (status.matched > 0) {
    return `${status.matched} row${status.matched === 1 ? '' : 's'} match · ${tables}`
  }
  return `no rows match yet · ${tables}`
}
