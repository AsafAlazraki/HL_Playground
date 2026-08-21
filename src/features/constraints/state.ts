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
import { countLabel, kindNoun, leafNoun, type LeafNoun } from '@/features/table/grouping'
import type { ColumnConcept } from './columns'
import type { CellValue, Clause, ClauseGroup, ConstraintDef, EntityDef } from '@/types/model'
import type { RowData } from '@/types/model'
import { fieldOn, isUnsetField, isUnsetValue } from './columns'
import { isUnary, literalOf, type SentenceCtx, type Side } from './describe'

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
/* IS IT FINISHED, AND IF NOT, WHAT IS MISSING                 */
/* ---------------------------------------------------------- */

/* THE REFUSAL IS A SENTENCE WITH A REASON, IN THE PLACE WHERE THE THING
   IS REFUSED (DESIGN_PRINCIPLES rule 10). The rules pane used to answer
   this question with "NOTHING ELSE TO FILL IN" beside a live ADD RULE
   button, over a sentence the app had composed out of the first column
   of the first table. Both halves were wrong: nothing had been filled
   in, and there was plenty left to fill.

   One function, so the builder's footer, the card that is still short a
   value and anything written later all say the same words. It names the
   FIRST thing missing, in reading order, because a list of four things
   to do reads as a form and the sentence is not a form. */

const NEEDS_COLUMN: Record<Side, string> = {
  if: 'Pick the column this rule looks at.',
  then: 'Pick the column this rule sets.',
}

const COLUMN_GONE = 'One column this rule names has been deleted. Point it at a column that is still there.'

function gapIn(
  group: ClauseGroup | undefined,
  side: Side,
  ctx: SentenceCtx,
): string | null {
  if (!group || group.clauses.length === 0) return NEEDS_COLUMN[side]
  for (const clause of group.clauses) {
    const concept = ctx.index.get(clause.left.fieldId)
    if (!concept) {
      return isUnsetField(clause.left.fieldId) ? NEEDS_COLUMN[side] : COLUMN_GONE
    }
    if (isUnary(clause.op)) continue
    if (isUnsetValue(literalOf(clause.right))) {
      return `Choose a value for ${concept.name}.`
    }
  }
  return null
}

/** What is still to be answered before this rule means anything — or
 *  `null` when a person has made every choice it needs. */
export function missingChoice(c: ConstraintDef, ctx: SentenceCtx): string | null {
  /* a `table` constraint is an imported whitelist, not a sentence
     somebody is part-way through writing */
  if (c.kind === 'table') return null
  const condition = gapIn(c.if, 'if', ctx)
  if (condition) return condition
  /* `excludes` reads "Never A together with B": its second group is
     another condition, not an obligation, but either way it has to name
     a column and a value before the rule rules anything out */
  return gapIn(c.then, c.kind === 'excludes' ? 'if' : 'then', ctx)
}

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
 *  rather than silently claiming zero.
 *
 *  Exported because a rule about to be added should be able to say what
 *  it will bite on, and this is the cheap half of `evaluateConstraint` —
 *  a walk of the tables, with no row scan. */
export function tablesFor(c: ConstraintDef, ctx: SentenceCtx): EntityDef[] {
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

/* ============================================================
   THE CONSEQUENCE, BEFORE THE COMMIT

   `evaluateConstraint` above answers "what is this rule doing?" about
   a rule that already exists. This answers the same question about one
   nobody has added yet, and it is a different question in three ways:

     1. IT MUST WORK HALF-ANSWERED. A draft names one column before it
        names two. `tablesFor` returns nothing until every clause
        resolves, which is right for a live rule and useless to someone
        part-way through writing one — so the scope here is computed
        from the columns that HAVE been chosen.
     2. IT SEPARATES THE TWO SIDES. A condition with no obligation
        still selects rows, and how many is the single most useful
        thing a person can know at that moment.
     3. IT COUNTS WHAT THE RULE WOULD LEAVE ALONE, not only what it
        would catch. FITMENT_RULES.md F9 is the whole argument: the ATM
        floor holds on 530 of 530 pairs and still leaves 97.70 % of the
        catalogue standing, and the adjudication's verdict on it is
        "a gate that leaves 97.7 % of the catalogue has not chosen a
        trailer." A rule that engages no row, or every row, has not
        chosen anything either — and the only moment that fact is worth
        anything is BEFORE the rule is added.

   None of the numbers below is stored, seeded or written down. They
   are read off the loaded sheet on every keystroke, which is why they
   cannot go stale and why the figure a person reads here is the figure
   the rule card will show a second later.
   ============================================================ */

export interface RulePreview {
  /** columns the sentence has actually been pointed at so far */
  concepts: ColumnConcept[]
  /** tables carrying every one of them */
  tables: EntityDef[]
  /** how many of those tables are kept for history rather than sale */
  retiredTables: number
  /** the dealer's own word for one of those rows */
  noun: LeafNoun
  /** rows on those tables */
  rows: number
  /** the "when" side is fully answered */
  conditionReady: boolean
  /** rows the "when" side is true of. Meaningful once `conditionReady` */
  looked: number
  /** every choice the sentence asks for has been made */
  ready: boolean
  /** of `looked`, the rows that keep the obligation */
  kept: number
  /** of `looked`, the rows that break it as the sheet stands today */
  broken: number
}

const NO_PREVIEW: RulePreview = {
  concepts: [],
  tables: [],
  retiredTables: 0,
  noun: { one: 'row', many: 'rows' },
  rows: 0,
  conditionReady: false,
  looked: 0,
  ready: false,
  kept: 0,
  broken: 0,
}

/** Every column the sentence names and the sheet still has, in reading
 *  order, without repeats. An unanswered slot contributes nothing. */
function namedConcepts(c: ConstraintDef, ctx: SentenceCtx): ColumnConcept[] {
  const out: ColumnConcept[] = []
  for (const clause of [...c.if.clauses, ...(c.then?.clauses ?? [])]) {
    const concept = ctx.index.get(clause.left.fieldId)
    if (concept && !out.some((x) => x.key === concept.key)) out.push(concept)
  }
  return out
}

/** ONE WORD FOR A ROW, AND NEVER ONE TABLE'S WORD FOR ANOTHER'S ROWS.
 *
 *  Where every table in scope calls a row the same thing, that is the
 *  word. Where they disagree — Highfield counts variants and Stacer
 *  counts models, and a rule about `boat` reaches both — the KIND's
 *  word is the one true word for the sum, which is still the dealer's
 *  vocabulary rather than a schema term. Only a scope that is neither
 *  agreed nor of one nameable kind falls back to "rows". */
function sharedNoun(tables: EntityDef[]): LeafNoun {
  if (tables.length === 0) return { one: 'row', many: 'rows' }
  const first = leafNoun(tables[0])
  if (tables.every((t) => leafNoun(t).many === first.many)) return first
  const kinds = new Set(tables.map((t) => t.kind ?? 'custom'))
  if (kinds.size === 1) {
    const word = kindNoun([...kinds][0])
    if (word) return word
  }
  return { one: 'row', many: 'rows' }
}

/** What this draft would do to the sheet as it stands. */
export function previewConstraint(c: ConstraintDef, ctx: SentenceCtx): RulePreview {
  const concepts = namedConcepts(c, ctx)
  if (concepts.length === 0) return NO_PREVIEW

  const tables = Object.values(ctx.entities).filter((t) =>
    concepts.every((concept) => fieldOn(concept, t)),
  )
  if (tables.length === 0) return { ...NO_PREVIEW, concepts }

  const conditionReady = gapIn(c.if, 'if', ctx) === null
  const ready = missingChoice(c, ctx) === null

  let rows = 0
  let looked = 0
  let kept = 0
  let broken = 0

  for (const table of tables) {
    const list = ctx.rowsByEntity[table.id] ?? []
    rows += list.length
    if (!conditionReady) continue
    for (const row of list) {
      if (groupHolds(c.if, table, row, ctx) !== true) continue
      looked += 1
      if (!ready || c.kind === 'table') continue
      const mustHolds = groupHolds(c.then, table, row, ctx)
      if (mustHolds === undefined) continue
      /* `excludes` is broken by both sides being true TOGETHER */
      if (c.kind === 'excludes' ? mustHolds : !mustHolds) broken += 1
      else kept += 1
    }
  }

  return {
    concepts,
    tables,
    retiredTables: tables.filter((t) => t.retired === true).length,
    noun: sharedNoun(tables),
    rows,
    conditionReady,
    looked,
    ready,
    kept,
    broken,
  }
}

/** The count as the dealer says it — "434 trailers", "810 models". */
export const previewCount = (n: number, p: RulePreview): string => countLabel(n, p.noun)

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
