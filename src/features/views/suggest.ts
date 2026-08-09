/* ============================================================
   THE GUESS — look at two tables and offer a rule in English.

   VIEW_SPEC.md, in priority order:
     1. a link column already joins the two tables      -> use it
     2. a Min/Max envelope on one side against a single
        number on the other                             -> between
     3. columns with the same name on both sides        -> equality
     4. nothing found                                   -> show all,
                                                           plus a picker

   The suggestion is OFFERED. Nothing in this file writes anything,
   and nothing here is ever applied without a person pressing a
   button — that is the difference between a helpful guess and a
   rule that appeared out of nowhere.
   ============================================================ */

import {
  UID_FIELD_ID,
  type ClauseGroup,
  type CompareOp,
  type EntityDef,
  type FieldDef,
} from '@/types/model'
import { newId } from '@/lib/id'
import { normColumn, rangePairs } from './columns'
import { describeRule } from './describe'

export type SuggestionKind = 'link' | 'range' | 'match' | 'none'

export interface RuleSuggestion {
  kind: SuggestionKind
  /** the offer, in full: "Show motors where HP is between …" */
  sentence: string
  /** absent for 'none' — there is nothing to accept, only "show all" */
  group?: ClauseGroup
  /** one line under the offer saying WHY we guessed this */
  because: string
}

/* ---------------------------------------------------------- */
/* Clause builders                                            */
/* ---------------------------------------------------------- */

const compare = (leftFieldId: string, op: CompareOp, rightFieldId: string) => ({
  id: newId(),
  left: { fieldId: leftFieldId },
  op,
  right: { kind: 'field' as const, path: { fieldId: rightFieldId } },
})

/** Candidate rows whose link column points at the row the view is for. */
export function linkedByRule(targetLinkFieldId: string): ClauseGroup {
  return { combinator: 'AND', clauses: [compare(targetLinkFieldId, 'eq', UID_FIELD_ID)] }
}

/** The single candidate the view's own link column points at. */
export function linkedToRule(rootLinkFieldId: string): ClauseGroup {
  return { combinator: 'AND', clauses: [compare(UID_FIELD_ID, 'eq', rootLinkFieldId)] }
}

/** `HP >= Min HP AND HP <= Max HP` — the between-rule. */
export function betweenRule(
  targetFieldId: string,
  minFieldId: string,
  maxFieldId: string,
): ClauseGroup {
  return {
    combinator: 'AND',
    clauses: [
      compare(targetFieldId, 'gte', minFieldId),
      compare(targetFieldId, 'lte', maxFieldId),
    ],
  }
}

/** One column equal to another. */
export function equalityRule(targetFieldId: string, rootFieldId: string): ClauseGroup {
  return { combinator: 'AND', clauses: [compare(targetFieldId, 'eq', rootFieldId)] }
}

/** Whatever the two-column picker was set to. */
export function pickedRule(
  targetFieldId: string,
  op: CompareOp,
  rootFieldId: string,
): ClauseGroup {
  return { combinator: 'AND', clauses: [compare(targetFieldId, op, rootFieldId)] }
}

/* ---------------------------------------------------------- */
/* The guess                                                  */
/* ---------------------------------------------------------- */

const NUMERIC = new Set(['number', 'formula'])
const COMPARABLE = new Set(['text', 'select', 'number', 'date', 'formula'])

/** Columns a person can sensibly compare, in the order they were written. */
export function pickableColumns(entity: EntityDef): FieldDef[] {
  return entity.fields.filter((f) => COMPARABLE.has(f.type))
}

function linkSuggestion(root: EntityDef, target: EntityDef): RuleSuggestion | null {
  const inbound = target.fields.find(
    (f) => f.type === 'reference' && f.refEntityId === root.id,
  )
  if (inbound) {
    const group = linkedByRule(inbound.id)
    return {
      kind: 'link',
      group,
      sentence: describeRule(group, root, target),
      because: `${target.name} already has a “${inbound.name}” link column pointing at ${root.name}.`,
    }
  }
  const outbound = root.fields.find(
    (f) => f.type === 'reference' && f.refEntityId === target.id,
  )
  if (outbound) {
    const group = linkedToRule(outbound.id)
    return {
      kind: 'link',
      group,
      sentence: describeRule(group, root, target),
      because: `${root.name} already has a “${outbound.name}” link column pointing at ${target.name}.`,
    }
  }
  return null
}

/** A column NAME that is itself half an envelope — never the single
 *  number a between-rule compares against. */
const BOUND_WORD = /^(min|max|minimum|maximum|lowest|highest)\b|\b(min|max|minimum|maximum)$/i

/**
 * Does this column hold the quantity the envelope is about? Exactly
 * ("HP"), or with the quantity as the head or the tail of a longer name
 * ("HP Rating", "Rated HP"). The business does not write the same word
 * twice: Boats carry `Min HP` / `Max HP` and Motors carry `HP Rating`,
 * and an exact-string test missed the one pairing the whole feature is
 * built on.
 */
function namesQuantity(name: string, key: string): boolean {
  const n = normColumn(name)
  if (n === key) return true
  if (BOUND_WORD.test(name.trim())) return false
  return n.startsWith(`${key} `) || n.endsWith(` ${key}`)
}

function rangeSuggestion(root: EntityDef, target: EntityDef): RuleSuggestion | null {
  const pairs = rangePairs(root)
  if (pairs.length === 0) return null
  for (const pair of pairs) {
    /* the plainest name wins — "HP" ahead of "HP Rating" */
    let hit: FieldDef | undefined
    for (const f of target.fields) {
      if (!NUMERIC.has(f.type)) continue
      if (!namesQuantity(f.name, pair.key)) continue
      if (!hit || normColumn(f.name).length < normColumn(hit.name).length) hit = f
    }
    if (!hit) continue
    const group = betweenRule(hit.id, pair.min.id, pair.max.id)
    return {
      kind: 'range',
      group,
      sentence: describeRule(group, root, target),
      because: `${root.name} carries ${pair.min.name} and ${pair.max.name}; ${target.name} carries ${hit.name}.`,
    }
  }
  return null
}

/**
 * Names that mean the same thing on EVERY table and therefore prove
 * nothing about a relationship. "Show parts where Status is the same as
 * this boat's Status" is a coincidence dressed up as a rule, and a bad
 * guess is worse than an honest "nothing lines up" — so a match on one of
 * these is not offered at all.
 */
const BOOKKEEPING = new Set([
  'status',
  'name',
  'notes',
  'note',
  'description',
  'comment',
  'comments',
  'source',
  'id',
  'code',
  'model',
  'series',
  'type',
  'active',
  'currency',
  'image',
  'images',
  'created',
  'updated',
])

/**
 * Bookkeeping by name, plus ANYTHING THAT ENDS IN "CODE" OR "ID".
 * A Model Code, a Product Code and a Part Id are the row's own reference
 * number: two tables both having one proves they both keep records, not
 * that they belong together. A boat's Model Code is HBS113 and a motor's
 * is F90XB, so equating them was a rule that could never match a row.
 */
const isBookkeeping = (key: string): boolean =>
  BOOKKEEPING.has(key) || /\b(code|id)$/.test(key)

function matchSuggestion(root: EntityDef, target: EntityDef): RuleSuggestion | null {
  const rootByName = new Map<string, FieldDef>()
  for (const f of root.fields) {
    if (!COMPARABLE.has(f.type)) continue
    const key = normColumn(f.name)
    if (key !== '' && !rootByName.has(key)) rootByName.set(key, f)
  }
  const rootLevels = new Set(root.hierarchy ?? [])
  const targetLevels = new Set(target.hierarchy ?? [])

  interface Match {
    t: FieldDef
    r: FieldDef
    rank: number
  }
  const matches: Match[] = []
  for (let i = 0; i < target.fields.length; i += 1) {
    const t = target.fields[i]
    if (!COMPARABLE.has(t.type)) continue
    const key = normColumn(t.name)
    if (isBookkeeping(key)) continue
    const r = rootByName.get(key)
    if (!r) continue
    /* a grouping column matching a grouping column ("Brand") is almost
       always a coincidence, so it is offered last rather than first */
    const grouped = rootLevels.has(r.id) || targetLevels.has(t.id)
    matches.push({ t, r, rank: (grouped ? 100 : 0) + i })
  }
  if (matches.length === 0) return null
  matches.sort((a, b) => a.rank - b.rank)
  const best = matches[0]
  const group = equalityRule(best.t.id, best.r.id)
  return {
    kind: 'match',
    group,
    sentence: describeRule(group, root, target),
    because: `Both tables have a “${best.t.name}” column.`,
  }
}

/**
 * The offer a drop makes. Never applied on its own — the page shows the
 * sentence and three buttons, and does nothing until one is pressed.
 */
export function suggestRule(root: EntityDef, target: EntityDef): RuleSuggestion {
  return (
    linkSuggestion(root, target) ??
    rangeSuggestion(root, target) ??
    matchSuggestion(root, target) ?? {
      kind: 'none',
      sentence: describeRule(undefined, root, target),
      because: `Nothing on ${root.name} lines up with anything on ${target.name}, so nothing is narrowed.`,
    }
  )
}
