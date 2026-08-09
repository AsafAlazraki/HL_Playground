/* ============================================================
   Plain English. Every sentence the page says about a rule, a
   level or a count is written here, once.

   Two words are banned everywhere in this feature: the ones a
   database uses. It is a TABLE, a COLUMN and a LINK — never an
   entity, a field, a schema or a reference.
   ============================================================ */

import {
  readCell,
  UID_FIELD_ID,
  type Clause,
  type ClauseGroup,
  type CompareOp,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'

/* ---------------------------------------------------------- */
/* Words                                                      */
/* ---------------------------------------------------------- */

/**
 * "Yamaha Outboards" -> "Yamaha Outboard", "Accessories" -> "Accessory".
 *
 * THE AUTHOR'S OWN CASING, NEVER OURS. One table is one brand, so the
 * name on a table is a proper noun — and a page that offers a customer
 * "no nsm custom trailers picked for this highfield inflatable" is a page
 * no dealer will ever show anyone. Only the ending changes here.
 */
export function singular(name: string): string {
  const n = name.trim()
  if (n === '') return 'row'
  if (/[^aeiou]ies$/i.test(n)) return `${n.slice(0, -3)}y`
  if (/(ches|shes|sses|xes|zes)$/i.test(n)) return n.slice(0, -2)
  if (/[^s]s$/i.test(n)) return n.slice(0, -1)
  return n
}

/** "Boats" -> "Boats", "Boat" -> "Boats". Casing preserved, as above. */
export function plural(name: string): string {
  const one = singular(name)
  if (/[^aeiou]y$/i.test(one)) return `${one.slice(0, -1)}ies`
  if (/(ch|sh|ss|x|z|s)$/i.test(one)) return `${one}es`
  return `${one}s`
}

/** Letters whose NAME opens on a vowel sound: N is said "en", F is "eff". */
const SPELLED_VOWEL = new Set(['A', 'E', 'F', 'H', 'I', 'L', 'M', 'N', 'O', 'R', 'S', 'X'])

/**
 * "a" or "an", chosen by how the words are SAID rather than spelled —
 * "an NSM Custom Trailer", "an Accessory", "a Yamaha Outboard". An
 * all-capitals opening word is read out letter by letter, so it is the
 * first LETTER's name that decides.
 */
export function article(phrase: string): string {
  const first = phrase.trim().split(/\s+/)[0] ?? ''
  const letters = first.replace(/[^A-Za-z]/g, '')
  if (letters === '') return 'a'
  if (letters === letters.toUpperCase()) {
    return SPELLED_VOWEL.has(letters[0]) ? 'an' : 'a'
  }
  return /^[aeiou]/i.test(letters) ? 'an' : 'a'
}

/** "a Yamaha Outboard" — the word with the right article in front of it. */
export const oneOf = (name: string): string => {
  const one = singular(name)
  return `${article(one)} ${one}`
}

/** "this boat" — how a view refers to the row it is drawn for. */
export const thisOne = (entity: EntityDef | undefined): string =>
  `this ${entity ? singular(entity.name) : 'row'}`

/* ---------------------------------------------------------- */
/* Rules                                                      */
/* ---------------------------------------------------------- */

const OP_WORDS: Record<CompareOp, string> = {
  eq: 'is the same as',
  neq: 'is not',
  gt: 'is more than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  notEmpty: 'is filled in',
  isTrue: 'is yes',
  isFalse: 'is no',
}

export const opWord = (op: CompareOp): string => OP_WORDS[op] ?? String(op)

/** Comparisons a person can pick from without being taught anything. */
export const PICKABLE_OPS: CompareOp[] = ['eq', 'gte', 'lte', 'gt', 'lt', 'contains']

const fieldName = (entity: EntityDef | undefined, fieldId: string): string => {
  if (fieldId === UID_FIELD_ID) return 'id'
  const f = entity?.fields.find((x) => x.id === fieldId)
  return f ? f.name : 'a column that is gone'
}

const isLinkClause = (c: Clause): boolean =>
  c.op === 'eq' &&
  (c.left.fieldId === UID_FIELD_ID ||
    (c.right?.kind === 'field' && c.right.path.fieldId === UID_FIELD_ID))

/** The `X is at least [Min X] and X is at most [Max X]` shape, spotted so
 *  it can be said the way a person would say it: "between". */
function betweenPhrase(
  group: ClauseGroup,
  root: EntityDef | undefined,
  target: EntityDef | undefined,
): string | null {
  if (group.combinator !== 'AND' || group.clauses.length !== 2) return null
  const [a, b] = group.clauses
  if (a.left.fieldId !== b.left.fieldId) return null
  const lower = a.op === 'gte' ? a : b.op === 'gte' ? b : null
  const upper = a.op === 'lte' ? a : b.op === 'lte' ? b : null
  if (!lower || !upper || lower === upper) return null
  if (lower.right?.kind !== 'field' || upper.right?.kind !== 'field') return null
  return `${fieldName(target, a.left.fieldId)} is between ${thisOne(root)}’s ${fieldName(
    root,
    lower.right.path.fieldId,
  )} and ${fieldName(root, upper.right.path.fieldId)}`
}

function clausePhrase(
  c: Clause,
  root: EntityDef | undefined,
  target: EntityDef | undefined,
): string {
  if (isLinkClause(c)) return `it is linked to ${thisOne(root)}`
  const left = fieldName(target, c.left.fieldId)
  if (!c.right) return `${left} ${opWord(c.op)}`
  if (c.right.kind === 'literal') {
    const v = c.right.value
    const shown = v === null || v === undefined ? '(nothing)' : String(v)
    return `${left} ${opWord(c.op)} ${shown}`
  }
  if (c.right.kind === 'field') {
    return `${left} ${opWord(c.op)} ${thisOne(root)}’s ${fieldName(root, c.right.path.fieldId)}`
  }
  return `${left} ${opWord(c.op)} a calculation`
}

/** True when the group says "nothing is related by a rule" — the curated
 *  menu, where only what a person pinned in shows. An OR of no clauses is
 *  false for every row, which is exactly that, and needs no new type. */
export const isCuratedOnly = (g: ClauseGroup | undefined): boolean =>
  !!g && g.combinator === 'OR' && g.clauses.length === 0

/** Fresh every call — two blocks must never share a clauses array. */
export const curatedOnly = (): ClauseGroup => ({ combinator: 'OR', clauses: [] })

/**
 * The one sentence the whole feature turns on:
 *   "Show motors where HP is between this boat's Min HP and Max HP."
 */
export function describeRule(
  group: ClauseGroup | undefined,
  root: EntityDef | undefined,
  target: EntityDef | undefined,
): string {
  const many = target ? plural(target.name) : 'rows'
  if (!group) return `Show every ${singular(target?.name ?? 'row')}.`
  if (isCuratedOnly(group)) return `Show only the ${many} you pick.`
  const between = betweenPhrase(group, root, target)
  if (between) return `Show ${many} where ${between}.`
  const join = group.combinator === 'OR' ? ' or ' : ' and '
  const parts = group.clauses.map((c) => clausePhrase(c, root, target))
  if (parts.length === 0) return `Show every ${singular(target?.name ?? 'row')}.`
  if (parts.length === 1 && parts[0].startsWith('it is linked')) {
    return `Show ${many} linked to ${thisOne(root)}.`
  }
  return `Show ${many} where ${parts.join(join)}.`
}

/** The short form for a header strip — no trailing stop, no "Show". */
export function summariseRule(
  group: ClauseGroup | undefined,
  root: EntityDef | undefined,
  target: EntityDef | undefined,
): string {
  const full = describeRule(group, root, target)
  return full.replace(/\.$/, '')
}

/* ---------------------------------------------------------- */
/* Levels — which rows an override reaches                    */
/* ---------------------------------------------------------- */

export interface LevelOption {
  /** how many of the table's grouping levels this override matches on */
  scope: number
  label: string
}

/** The value a row carries at each grouping level, outermost first. */
export function levelValues(entity: EntityDef, row: RowData): string[] {
  const levels = entity.hierarchy ?? []
  return levels.map((fieldId) => {
    const v = readCell(row, fieldId)
    return v === null || v === undefined ? '' : String(v).trim()
  })
}

/** The grouping columns' names, outermost first. */
export function levelNames(entity: EntityDef): string[] {
  const byId = new Map<string, FieldDef>(entity.fields.map((f) => [f.id, f]))
  return (entity.hierarchy ?? []).map((id) => byId.get(id)?.name ?? 'Level')
}

/**
 * "This variant only" · "All variants in SPORT 560" · "All models in Sport".
 * Deepest first, because the safe answer is the narrow one and it is the
 * default. Levels with no value on this row are left out — an override
 * that reaches "everything in (blank)" is a trap.
 */
export function levelOptions(entity: EntityDef, row: RowData): LevelOption[] {
  const names = levelNames(entity)
  const values = levelValues(entity, row)
  const depth = names.length
  if (depth === 0) return []
  const out: LevelOption[] = [{ scope: depth, label: `This ${names[depth - 1].toLowerCase()} only` }]
  for (let s = depth - 1; s >= 1; s -= 1) {
    const parentValue = values[s - 1]
    if (parentValue === '') continue
    /* a LEVEL is a column name, not a brand — "all variants in SP560",
       to read as one sentence with "This variant only" above it */
    out.push({ scope: s, label: `All ${plural(names[s]).toLowerCase()} in ${parentValue}` })
  }
  return out
}

/**
 * Which rows a decision made at this level lands on.
 *
 * The rows sharing this one's first `scope` grouping values — the same
 * grouping the table already draws itself with, so "all variants in
 * SP560" means precisely the rows a person can see grouped under SP560.
 * The narrowest scope, and a flat table, are always just this row.
 */
export function rowsInScope(
  entity: EntityDef,
  rows: RowData[],
  row: RowData,
  scope: number | undefined,
): string[] {
  const levels = entity.hierarchy ?? []
  if (scope === undefined || scope < 1 || scope >= levels.length) return [row.id]
  const key = (r: RowData): string =>
    levels
      .slice(0, scope)
      .map((fieldId) => {
        const v = readCell(r, fieldId)
        return v === null || v === undefined ? '' : String(v).trim().toLowerCase()
      })
      .join(' ')
  const mine = key(row)
  const ids = rows.filter((r) => key(r) === mine).map((r) => r.id)
  return ids.length > 0 ? ids : [row.id]
}

/** "Variant · HYP B-W-C" — what the header says you are editing. */
export function levelCaption(entity: EntityDef, row: RowData, scope: number): string {
  const opts = levelOptions(entity, row)
  const hit = opts.find((o) => o.scope === scope)
  return hit ? hit.label : 'This row only'
}

/* ---------------------------------------------------------- */
/* Counts                                                     */
/* ---------------------------------------------------------- */

/** `6 fit · 1 removed · 1 added` — the arithmetic, never a mystery.
 *  A curated block says "picked" instead of "fit", because nothing on it
 *  was decided by a rule. */
export function countChip(
  fit: number,
  removed: number,
  added: number,
  word: 'fit' | 'picked' = 'fit',
): string {
  const parts = [`${fit} ${word}`]
  if (removed > 0) parts.push(`${removed} removed`)
  if (added > 0) parts.push(`${added} added`)
  return parts.join(' · ')
}
