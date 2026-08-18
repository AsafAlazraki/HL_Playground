/* ============================================================
   Rules engine — value resolution, comparison, clause evaluation.

   Everything here is row-level: given a row (or a pair of rows) it
   resolves a FieldPath / ValueExpr and decides whether a clause holds.
   Nothing here knows about the graph.

   SCOPE CONVENTION (the heart of the feature — see RULES_SPEC.md):
   inside a MATCH node a clause's `left` resolves against the CANDIDATE
   row (the motor) and a `{kind:'field'}` right-hand side resolves
   against the SOURCE row (the boat). Outside a match — filter,
   condition, action values — there is no candidate scan, so the sides
   resolve by FIELD OWNERSHIP: the row whose entity actually owns the
   field id wins, preferring the row named by the scope. Field ids are
   unique per entity, so that is unambiguous.

   Never throws. A missing entity, a deleted field, a dangling link or a
   broken formula all resolve to `null` (with a deduped warning when the
   cause is a schema mistake rather than ordinary missing data).
   ============================================================ */

import {
  RULE_NODE_KINDS,
  UNARY_OPS,
  rowLabel,
  type CellValue,
  type Clause,
  type ClauseGroup,
  type CompareOp,
  type EntityDef,
  type FieldDef,
  type FieldPath,
  type RowData,
  type RuleNode,
  type ValueExpr,
} from '@/types/model'
import {
  compileFormula,
  evalExpr,
  type EvalContext,
  type EvalEnv,
  type Expr,
  evaluateRowValues,
} from '@/lib/formula'
import type { RuleRunContext } from './types'

/* ---------------------------------------------------------- */
/* Small shared shapes                                        */
/* ---------------------------------------------------------- */

/** A row plus the entity it belongs to — the engine's unit of "a row". */
export interface RowRef {
  entityId: string
  row: RowData
}

/** Where a warning came from. `label` is the human node name. */
export interface NodeSite {
  nodeId?: string
  label: string
}

export interface ClauseScopes {
  /** row a clause's `left` path resolves against */
  left: RowRef | undefined
  /** row a `{kind:'field'}` right-hand side resolves against */
  right: RowRef | undefined
  /** false inside a match (strict spec convention); true elsewhere,
   *  where the row that owns the field id wins */
  byOwnership: boolean
}

/* ---------------------------------------------------------- */
/* Value helpers                                              */
/* ---------------------------------------------------------- */

/** 'YYYY-MM-DD', optionally with a time part — ISO strings sort
 *  correctly as plain text, which is what makes date ordering free. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/

export function isEmptyValue(v: CellValue | undefined): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function asNumber(v: CellValue): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '') return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/* ============================================================
   A MEASUREMENT IS A NUMBER WITH ITS UNIT STILL ATTACHED.

   THE FAILURE THIS FIXES, MEASURED. A spreadsheet writes "10 HP" in a
   column of numbers, because a person typed the unit. `asNumber` says
   `Number("10 HP")` is NaN, so the comparison fell through to the last
   branch of `compareValues` and ordered the two sides as TEXT. On the
   seeded rule "Motor fitment — Highfield", running the real price file
   at full scale, that made "8" > "10 HP" — lexicographically true, and
   wrong about outboards — and it REJECTED 243 of the 2,519 pairings
   the workbook itself writes, silently, with nothing on screen to say
   why. Alphabetical order over a column of horsepower is not an
   opinion about the data; it is a bug wearing a result's clothes.

   WHAT IS PARSED, and nothing else: an optional sign, digits with
   optional thousands separators and decimals, then an OPTIONAL short
   unit token of letters, degree, per-cent, inch or foot marks. It is
   deliberately the same shape the seed generator parses when it reads
   a workbook (tools/seed/gen_lib.py `parse_num`), because these values
   arrive from exactly there.

   WHAT IS REFUSED, on purpose. "2 x 300 HP" — a twin rig — has no
   single number, so it does not parse, and a clause over it reports a
   mismatch rather than guessing. That is FITMENT_RULES.md F1's own
   position: Max HP has to be decomposed into total, rig count and
   per-engine AT IMPORT before a twin rig can be ordered, and inventing
   an order for it here would be answering a question nobody settled.

   TWO DIFFERENT UNITS DO NOT ORDER EITHER. "500 mm" against "20 in" is
   a mismatch with a sentence, not a silent false. A bare number orders
   against a measurement, because a column of unitless numbers compared
   with a column that spells its unit out is the ordinary case and the
   one that started this.
   ============================================================ */

interface Measure {
  n: number
  /** lower-cased unit token, or '' when the value carries none */
  unit: string
}

const MEASURE = /^([+-]?[\d,]*\.?\d+)\s*([A-Za-z°%"']{1,6})?$/

function asMeasure(v: CellValue): Measure | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? { n: v, unit: '' } : undefined
  if (typeof v !== 'string') return undefined
  const m = MEASURE.exec(v.trim())
  if (!m) return undefined
  const n = Number(m[1].replace(/,/g, ''))
  if (!Number.isFinite(n)) return undefined
  return { n, unit: (m[2] ?? '').toLowerCase() }
}

/** Two measurements are comparable when they agree on the unit, or when
 *  one of them does not name one. */
const commensurable = (a: Measure, b: Measure): boolean =>
  a.unit === b.unit || a.unit === '' || b.unit === ''

function asStrictBoolean(v: CellValue): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase()
    if (t === 'true' || t === 'yes') return true
    if (t === 'false' || t === 'no') return false
  }
  return undefined
}

/** Forgiving truthiness, used only by the isTrue / isFalse operators. */
function asBoolean(v: CellValue): boolean {
  const b = asStrictBoolean(v)
  if (b !== undefined) return b
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.trim() !== '' && v.trim() !== '0'
  return false
}

function asText(v: CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

const normText = (v: CellValue): string => asText(v).trim().toLowerCase()

/** Type name used in mismatch warnings — deliberately value-free so the
 *  same mistake on 10 000 rows collapses to ONE warning. */
function typeName(v: CellValue): string {
  if (isEmptyValue(v)) return 'an empty cell'
  if (typeof v === 'number') return 'a number'
  if (typeof v === 'boolean') return 'a yes/no value'
  if (typeof v === 'string' && ISO_DATE.test(v.trim())) return 'a date'
  /* "a measurement" rather than "text", or the sentence a person reads
     when a plate reading "50 HP" meets a twin rig reading "2 x 300 HP"
     is "text cannot be compared with text", which explains nothing and
     is the kind of message that makes somebody distrust the whole
     screen. Named after the date test so an ISO string stays a date. */
  if (typeof v === 'string' && asMeasure(v) !== undefined) return 'a measurement'
  return 'text'
}

/* ---------------------------------------------------------- */
/* Comparison — type aware, never throws                      */
/* ---------------------------------------------------------- */

export interface CompareOutcome {
  result: boolean
  /** set when the two sides are genuinely different types; the caller
   *  turns it into a warning and treats the clause as not matching */
  mismatch?: string
}

function orderNumbers(op: CompareOp, a: number, b: number): boolean {
  switch (op) {
    case 'eq':
      return a === b
    case 'neq':
      return a !== b
    case 'gt':
      return a > b
    case 'gte':
      return a >= b
    case 'lt':
      return a < b
    case 'lte':
      return a <= b
    default:
      return false
  }
}

function orderStrings(op: CompareOp, a: string, b: string): boolean {
  switch (op) {
    case 'eq':
      return a === b
    case 'neq':
      return a !== b
    case 'gt':
      return a > b
    case 'gte':
      return a >= b
    case 'lt':
      return a < b
    case 'lte':
      return a <= b
    default:
      return false
  }
}

/**
 * Compare two cell values with a binary operator.
 * - number vs number (or numeric text, "10 HP" included) -> numeric
 * - date vs date -> ISO text order, which is chronological
 * - text vs text -> trimmed + case-insensitive
 * - yes/no vs yes/no -> equality only
 * - a blank on either side never orders, and only equals another blank
 * - genuinely mismatched types (a number vs non-numeric text) return
 *   false with a `mismatch` explanation — never an exception
 */
export function compareValues(
  op: CompareOp,
  left: CellValue,
  right: CellValue,
): CompareOutcome {
  /* text operators coerce both sides; they can never mismatch */
  if (op === 'contains' || op === 'startsWith' || op === 'endsWith') {
    const a = normText(left)
    const b = normText(right)
    if (op === 'contains') return { result: a.includes(b) }
    if (op === 'startsWith') return { result: a.startsWith(b) }
    return { result: a.endsWith(b) }
  }

  const leftEmpty = isEmptyValue(left)
  const rightEmpty = isEmptyValue(right)
  if (leftEmpty || rightEmpty) {
    /* missing data is a data condition, not a type error — no warning */
    if (op === 'eq') return { result: leftEmpty && rightEmpty }
    if (op === 'neq') return { result: !(leftEmpty && rightEmpty) }
    return { result: false }
  }

  const mismatch = (): CompareOutcome => ({
    result: false,
    mismatch: `${typeName(left)} cannot be compared with ${typeName(right)}`,
  })

  /* a real number on either side forces a numeric comparison */
  if (typeof left === 'number' || typeof right === 'number') {
    const a = asMeasure(left)
    const b = asMeasure(right)
    if (a === undefined || b === undefined) return mismatch()
    if (!commensurable(a, b)) {
      return {
        result: false,
        mismatch: `“${a.unit}” and “${b.unit}” are different units, so these cannot be put in order`,
      }
    }
    return { result: orderNumbers(op, a.n, b.n) }
  }

  /* a real boolean on either side forces an equality comparison */
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    const a = asStrictBoolean(left)
    const b = asStrictBoolean(right)
    if (a === undefined || b === undefined) return mismatch()
    if (op === 'eq') return { result: a === b }
    if (op === 'neq') return { result: a !== b }
    return {
      result: false,
      mismatch: 'yes/no values cannot be put in order',
    }
  }

  /* both sides are strings from here */
  const ls = asText(left).trim()
  const rs = asText(right).trim()
  if (ISO_DATE.test(ls) && ISO_DATE.test(rs)) return { result: orderStrings(op, ls, rs) }

  const lm = asMeasure(ls)
  const rm = asMeasure(rs)
  if (lm !== undefined && rm !== undefined) {
    if (commensurable(lm, rm)) return { result: orderNumbers(op, lm.n, rm.n) }
    return {
      result: false,
      mismatch: `“${lm.unit}” and “${rm.unit}” are different units, so these cannot be put in order`,
    }
  }
  /* ONE SIDE IS A MEASUREMENT AND THE OTHER IS PROSE. Ordering those
     alphabetically is what put "8" above "10 HP"; it is refused with a
     sentence instead, and equality still answers, because "same text"
     is a question that has an answer whatever the two sides are. */
  if (lm !== undefined || rm !== undefined) {
    if (op === 'eq') return { result: ls.toLowerCase() === rs.toLowerCase() }
    if (op === 'neq') return { result: ls.toLowerCase() !== rs.toLowerCase() }
    return mismatch()
  }

  return { result: orderStrings(op, ls.toLowerCase(), rs.toLowerCase()) }
}

/* ---------------------------------------------------------- */
/* Node labels — every warning names its node                 */
/* ---------------------------------------------------------- */

export function nodeLabel(node: RuleNode, entities: Record<string, EntityDef>): string {
  switch (node.kind) {
    case 'match': {
      const target = entities[node.config.targetEntityId]
      return target ? `Match "${target.name}"` : 'Match'
    }
    case 'output': {
      const label = (node.config.label ?? '').trim()
      return label ? `Output "${label}"` : 'Output'
    }
    case 'loop': {
      const src = node.config.source
      if (src && src.kind === 'entity') {
        const e = entities[src.entityId]
        if (e) return `For each "${e.name}"`
      }
      return 'For each'
    }
    case 'action':
      return `Action (${node.config.action?.op ?? 'unconfigured'})`
    default:
      return RULE_NODE_KINDS[node.kind]?.label ?? node.kind
  }
}

/* ---------------------------------------------------------- */
/* Engine — indexes, caches, resolution                       */
/* ---------------------------------------------------------- */

export interface RuleEngine {
  readonly warnings: string[]
  readonly nodeWarnings: Record<string, string[]>
  /** deduped by (node, message) so a per-row mistake warns once */
  warn(site: NodeSite, message: string): void
  entity(entityId: string | undefined): EntityDef | undefined
  rows(entityId: string | undefined): RowData[]
  row(entityId: string | undefined, rowId: string): RowData | undefined
  /** the entity that declares this field id (ids are unique per entity) */
  ownerOf(fieldId: string | undefined): EntityDef | undefined
  fieldOf(entityId: string | undefined, fieldId: string | undefined): FieldDef | undefined
  /** all values of a row, formula fields COMPUTED (memoized) */
  valuesOf(ref: RowRef | undefined): Record<string, CellValue>
  readField(ref: RowRef | undefined, fieldId: string, site: NodeSite): CellValue
  resolveFieldPath(ref: RowRef | undefined, path: FieldPath, site: NodeSite): CellValue
  resolveValue(
    expr: ValueExpr | undefined,
    ref: RowRef | undefined,
    site: NodeSite,
  ): CellValue
  evalGroup(
    group: ClauseGroup | undefined,
    scopes: ClauseScopes,
    site: NodeSite,
  ): boolean
  /** row whose entity owns `fieldId`, preferring `preferred` */
  pickOwner(
    fieldId: string | undefined,
    preferred: RowRef | undefined,
    other: RowRef | undefined,
  ): RowRef | undefined
  label(ref: RowRef | undefined): string
}

const firstHop = (path: FieldPath | undefined): string | undefined =>
  path ? (path.viaFieldId ?? path.fieldId) : undefined

export function createEngine(ctx: RuleRunContext): RuleEngine {
  const entities = ctx?.entities ?? {}
  const rowsByEntity = ctx?.rowsByEntity ?? {}

  const warnings: string[] = []
  const nodeWarnings: Record<string, string[]> = {}
  const seenWarnings = new Set<string>()

  const rowIndexes = new Map<string, Map<string, RowData>>()
  const valuesCache = new Map<string, Record<string, CellValue>>()
  const nameIndexes = new Map<string, Map<string, FieldDef>>()
  const astCache = new Map<string, Expr | null>()
  let fieldOwners: Map<string, EntityDef> | undefined

  const entity = (entityId: string | undefined): EntityDef | undefined =>
    entityId ? entities[entityId] : undefined

  const rows = (entityId: string | undefined): RowData[] => {
    if (!entityId) return []
    const list = rowsByEntity[entityId]
    return Array.isArray(list) ? list : []
  }

  const rowIndexOf = (entityId: string): Map<string, RowData> => {
    let idx = rowIndexes.get(entityId)
    if (!idx) {
      idx = new Map()
      for (const r of rows(entityId)) if (r && r.id) idx.set(r.id, r)
      rowIndexes.set(entityId, idx)
    }
    return idx
  }

  const row = (entityId: string | undefined, rowId: string): RowData | undefined => {
    if (!entityId || !rowId) return undefined
    return rowIndexOf(entityId).get(rowId)
  }

  const ownerOf = (fieldId: string | undefined): EntityDef | undefined => {
    if (!fieldId) return undefined
    if (!fieldOwners) {
      fieldOwners = new Map()
      for (const e of Object.values(entities)) {
        for (const f of e?.fields ?? []) {
          if (!fieldOwners.has(f.id)) fieldOwners.set(f.id, e)
        }
      }
    }
    return fieldOwners.get(fieldId)
  }

  const fieldOf = (
    entityId: string | undefined,
    fieldId: string | undefined,
  ): FieldDef | undefined => {
    if (!fieldId) return undefined
    const e = entity(entityId)
    return e?.fields?.find((f) => f.id === fieldId)
  }

  const warn = (site: NodeSite, message: string): void => {
    const key = `${site.nodeId ?? ''}|${message}`
    if (seenWarnings.has(key)) return
    seenWarnings.add(key)
    warnings.push(message)
    if (site.nodeId) {
      const bucket = nodeWarnings[site.nodeId] ?? (nodeWarnings[site.nodeId] = [])
      bucket.push(message)
    }
  }

  const evalCtx: EvalContext = {
    lookupRow: (entityId, rowId) => row(entityId, rowId),
    lookupEntity: (entityId) => entity(entityId),
  }

  const valuesOf = (ref: RowRef | undefined): Record<string, CellValue> => {
    if (!ref || !ref.row) return {}
    const key = `${ref.entityId} ${ref.row.id}`
    let values = valuesCache.get(key)
    if (!values) {
      const e = entity(ref.entityId)
      try {
        values = e ? evaluateRowValues(e, ref.row, evalCtx) : { ...(ref.row.values ?? {}) }
      } catch {
        values = { ...(ref.row.values ?? {}) }
      }
      valuesCache.set(key, values)
    }
    return values
  }

  const label = (ref: RowRef | undefined): string => {
    if (!ref || !ref.row) return '(none)'
    const e = entity(ref.entityId)
    if (!e) return ref.row.id
    try {
      return rowLabel(e, ref.row)
    } catch {
      return ref.row.id
    }
  }

  const readField = (
    ref: RowRef | undefined,
    fieldId: string,
    site: NodeSite,
  ): CellValue => {
    if (!ref) return null
    const e = entity(ref.entityId)
    if (!e) return null
    const f = fieldOf(ref.entityId, fieldId)
    if (!f) {
      warn(site, `${site.label}: reads a field that is not on "${e.name}" — read as empty.`)
      return null
    }
    const v = valuesOf(ref)[fieldId]
    return v === undefined ? null : v
  }

  /** One-hop link traversal, then a plain field read. A missing hop
   *  field is a schema mistake (warn); a blank or dangling link is
   *  ordinary data (silent null). */
  const resolveFieldPath = (
    ref: RowRef | undefined,
    path: FieldPath | undefined,
    site: NodeSite,
  ): CellValue => {
    if (!ref || !path || !path.fieldId) return null
    const e = entity(ref.entityId)
    if (!e) return null

    if (path.viaFieldId) {
      const via = fieldOf(ref.entityId, path.viaFieldId)
      if (!via) {
        warn(site, `${site.label}: follows a link field that no longer exists on "${e.name}".`)
        return null
      }
      if (via.type !== 'reference' || !via.refEntityId) {
        warn(site, `${site.label}: "${via.name}" is not a link field, so it cannot be followed.`)
        return null
      }
      const raw = valuesOf(ref)[via.id]
      if (raw === null || raw === undefined || raw === '') return null
      const linked = row(via.refEntityId, String(raw))
      if (!linked) return null /* dangling link — ordinary data */
      return readField({ entityId: via.refEntityId, row: linked }, path.fieldId, site)
    }

    return readField(ref, path.fieldId, site)
  }

  const nameIndexOf = (e: EntityDef): Map<string, FieldDef> => {
    let idx = nameIndexes.get(e.id)
    if (!idx) {
      idx = new Map()
      for (const f of e.fields ?? []) {
        const key = f.name.trim().toLowerCase()
        if (!idx.has(key)) idx.set(key, f)
      }
      nameIndexes.set(e.id, idx)
    }
    return idx
  }

  const astOf = (src: string): Expr | null => {
    if (astCache.has(src)) return astCache.get(src) ?? null
    let ast: Expr | null = null
    try {
      ast = compileFormula(src).ast
    } catch {
      ast = null
    }
    astCache.set(src, ast)
    return ast
  }

  /** Evaluate an inline formula against the row in whose scope it
   *  appears. A parse or runtime failure is null + one warning. */
  const evalFormulaSrc = (
    src: string | undefined,
    ref: RowRef | undefined,
    site: NodeSite,
  ): CellValue => {
    if (!src || !src.trim()) {
      warn(site, `${site.label}: has an empty calculation — read as empty.`)
      return null
    }
    if (!ref) return null
    const e = entity(ref.entityId)
    if (!e) return null
    const ast = astOf(src)
    if (!ast) {
      warn(site, `${site.label}: the calculation "${src.trim()}" could not be read — treated as empty.`)
      return null
    }
    const values = valuesOf(ref)
    const byName = nameIndexOf(e)
    const env: EvalEnv = {
      resolveField: (name: string): CellValue => {
        const f = byName.get(name.trim().toLowerCase())
        if (!f) throw new Error(`Unknown field [${name}]`)
        const v = values[f.id] ?? null
        if (f.type === 'reference') {
          if (v === null || v === '') return null
          const linked = row(f.refEntityId, String(v))
          const target = entity(f.refEntityId)
          return target && linked ? rowLabel(target, linked) : String(v)
        }
        return v
      },
    }
    try {
      return evalExpr(ast, env)
    } catch {
      warn(site, `${site.label}: the calculation "${src.trim()}" could not be worked out on "${e.name}" — treated as empty.`)
      return null
    }
  }

  const resolveValue = (
    expr: ValueExpr | undefined,
    ref: RowRef | undefined,
    site: NodeSite,
  ): CellValue => {
    if (!expr) return null
    switch (expr.kind) {
      case 'literal':
        return expr.value === undefined ? null : expr.value
      case 'field':
        return resolveFieldPath(ref, expr.path, site)
      case 'formula':
        return evalFormulaSrc(expr.src, ref, site)
      default:
        return null
    }
  }

  const owns = (ref: RowRef | undefined, fieldId: string | undefined): boolean => {
    if (!ref || !fieldId) return false
    return Boolean(fieldOf(ref.entityId, fieldId))
  }

  const pickOwner = (
    fieldId: string | undefined,
    preferred: RowRef | undefined,
    other: RowRef | undefined,
  ): RowRef | undefined => {
    if (owns(preferred, fieldId)) return preferred
    if (owns(other, fieldId)) return other
    return preferred ?? other
  }

  const evalClause = (
    clause: Clause | undefined,
    scopes: ClauseScopes,
    site: NodeSite,
  ): boolean => {
    if (!clause || !clause.left || !clause.left.fieldId) {
      warn(site, `${site.label}: has an unfinished condition — treated as not matching.`)
      return false
    }

    const leftRef = scopes.byOwnership
      ? pickOwner(firstHop(clause.left), scopes.left, scopes.right)
      : scopes.left
    const left = resolveFieldPath(leftRef, clause.left, site)

    if (UNARY_OPS.includes(clause.op)) {
      switch (clause.op) {
        case 'isEmpty':
          return isEmptyValue(left)
        case 'notEmpty':
          return !isEmptyValue(left)
        case 'isTrue':
          return asBoolean(left)
        case 'isFalse':
          return !asBoolean(left)
        default:
          return false
      }
    }

    if (!clause.right) {
      warn(site, `${site.label}: a condition has nothing to compare against — treated as not matching.`)
      return false
    }

    const rightRef =
      scopes.byOwnership && clause.right.kind === 'field'
        ? pickOwner(firstHop(clause.right.path), scopes.right, scopes.left)
        : scopes.right
    const right = resolveValue(clause.right, rightRef, site)

    const outcome = compareValues(clause.op, left, right)
    if (outcome.mismatch) warn(site, `${site.label}: ${outcome.mismatch} — treated as not matching.`)
    return outcome.result
  }

  /** AND is vacuously true when empty (validateRule blocks empty groups
   *  so nothing silently matches everything); OR is false when empty. */
  const evalGroup = (
    group: ClauseGroup | undefined,
    scopes: ClauseScopes,
    site: NodeSite,
  ): boolean => {
    const clauses = group?.clauses ?? []
    if (group?.combinator === 'OR') {
      for (const c of clauses) if (evalClause(c, scopes, site)) return true
      return false
    }
    for (const c of clauses) if (!evalClause(c, scopes, site)) return false
    return true
  }

  return {
    warnings,
    nodeWarnings,
    warn,
    entity,
    rows,
    row,
    ownerOf,
    fieldOf,
    valuesOf,
    readField,
    resolveFieldPath,
    resolveValue,
    evalGroup,
    pickOwner,
    label,
  }
}
