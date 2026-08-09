/* ============================================================
   The module's vocabulary: how a rule is put into words.

   Every human sentence in this feature — the one-line summary on
   a node plate, the clause row in the inspector, the effect
   sentence in the results rail — is built here, so the canvas and
   the chrome always say the same thing the same way.

   Pure functions only: no React, no store reads.
   ============================================================ */

import {
  ELSE_HANDLE,
  FIELD_TYPES,
  UNARY_OPS,
  displayFieldOf,
} from '@/types/model'
import type {
  AccentKey,
  ActionOp,
  CellValue,
  Clause,
  ClauseGroup,
  CompareOp,
  EntityDef,
  FieldDef,
  FieldPath,
  FieldType,
  RowScope,
  RuleDef,
  RuleNode,
  RuleNodeKind,
  ValueExpr,
  ViewColumn,
} from '@/types/model'

export type EntityMap = Record<string, EntityDef>

/* ---------------------------------------------------------- */
/* Inks                                                       */
/* ---------------------------------------------------------- */

/** Accent key behind each kind's `cssVar` in RULE_NODE_KINDS — kept here so
 *  the canvas can reach for the BRIGHT variant of the very same ink. */
export const KIND_ACCENT: Record<RuleNodeKind, AccentKey> = {
  start: 'graphite',
  match: 'carmine',
  condition: 'ochre',
  filter: 'teal',
  find: 'blue',
  loop: 'violet',
  action: 'viridian',
  output: 'carmine',
}

/** Chrome ink (reads on white paper). */
export const kindInk = (k: RuleNodeKind): string =>
  `var(--accent-${KIND_ACCENT[k]})`

/** Canvas ink (reads on the navy blueprint). */
export const kindInkBright = (k: RuleNodeKind): string =>
  `var(--accent-${KIND_ACCENT[k]}-bright)`

/** An ENTITY's accent, inked for the navy blueprint — the stamp on a plate. */
export const accentInkBright = (a: AccentKey | undefined): string =>
  a ? `var(--accent-${a}-bright)` : 'var(--canvas-ink-faint)'

/* ---------------------------------------------------------- */
/* Operators                                                  */
/* ---------------------------------------------------------- */

/** Compact form used inside a sentence: `HP ≥ Min HP`. */
export const OP_LABEL: Record<CompareOp, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  notEmpty: 'is not empty',
  isTrue: 'is yes',
  isFalse: 'is no',
}

/** Dropdown form — symbol plus the plain-English reading. */
export const OP_MENU: Record<CompareOp, string> = {
  eq: '=   is',
  neq: '≠   is not',
  gt: '>   more than',
  gte: '≥   at least',
  lt: '<   less than',
  lte: '≤   at most',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  notEmpty: 'is not empty',
  isTrue: 'is yes',
  isFalse: 'is no',
}

export const isUnaryOp = (op: CompareOp): boolean => UNARY_OPS.includes(op)

const NUMERIC_OPS: CompareOp[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'notEmpty']
const TEXT_OPS: CompareOp[] = [
  'eq',
  'neq',
  'contains',
  'startsWith',
  'endsWith',
  'isEmpty',
  'notEmpty',
]
const BOOL_OPS: CompareOp[] = ['isTrue', 'isFalse', 'eq', 'neq']
const ENUM_OPS: CompareOp[] = ['eq', 'neq', 'isEmpty', 'notEmpty']

/** Operators worth offering for a field of this type — a short, honest menu
 *  beats the full list of thirteen. Unknown type ⇒ everything. */
export function opsForType(type: FieldType | undefined): CompareOp[] {
  switch (type) {
    case 'number':
    case 'date':
      return NUMERIC_OPS
    case 'text':
      return TEXT_OPS
    case 'boolean':
      return BOOL_OPS
    case 'select':
    case 'reference':
      return ENUM_OPS
    case 'formula':
      return [...NUMERIC_OPS, 'contains', 'startsWith', 'endsWith', 'isTrue', 'isFalse']
    default:
      return [...NUMERIC_OPS, ...TEXT_OPS.filter((o) => !NUMERIC_OPS.includes(o)), 'isTrue', 'isFalse']
  }
}

/* ---------------------------------------------------------- */
/* Field paths                                                */
/* ---------------------------------------------------------- */

/**
 * The rows a side of a clause may read, in the engine's own preference
 * order. Inside a MATCH the convention is strict — left is the candidate,
 * a field right-hand side is the source — so each scope holds one entity.
 * Everywhere else the engine resolves BY OWNERSHIP, preferring the matched
 * row on the left and the source row on the right, so both are offered and
 * the stamp on the picker tells you which row a field belongs to.
 */
export type EntityScope = (EntityDef | undefined)[]

export interface ResolvedPath {
  /** the reference field hopped through, when the path takes one hop */
  via?: FieldDef
  /** the entity the terminal field lives on */
  entity?: EntityDef
  field?: FieldDef
  /** which row of the scope owns this path */
  owner?: EntityDef
}

export function resolvePath(
  base: EntityDef | undefined,
  path: FieldPath | undefined,
  entities: EntityMap,
): ResolvedPath {
  if (!base || !path) return {}
  if (path.viaFieldId) {
    const via = base.fields.find((f) => f.id === path.viaFieldId)
    if (!via || via.type !== 'reference' || !via.refEntityId) return {}
    const entity = entities[via.refEntityId]
    if (!entity) return { via }
    return { via, entity, field: entity.fields.find((f) => f.id === path.fieldId) }
  }
  return { entity: base, field: base.fields.find((f) => f.id === path.fieldId) }
}

/** Resolve a path against the first row of the scope that owns it. */
export function resolveIn(
  scope: EntityScope,
  path: FieldPath | undefined,
  entities: EntityMap,
): ResolvedPath {
  if (!path || !path.fieldId) return {}
  for (const e of scope) {
    if (!e) continue
    const r = resolvePath(e, path, entities)
    if (r.field) return { ...r, owner: e }
  }
  return {}
}

/** `HP` · `Boat → Price` · `(field removed)` when the schema moved on. */
export function pathLabel(
  scope: EntityScope,
  path: FieldPath | undefined,
  entities: EntityMap,
): string {
  if (!path || !path.fieldId) return 'pick a field'
  const { via, field } = resolveIn(scope, path, entities)
  if (!field) return '(field removed)'
  return via ? `${via.name} → ${field.name}` : field.name
}

export const pathType = (
  scope: EntityScope,
  path: FieldPath | undefined,
  entities: EntityMap,
): FieldType | undefined => resolveIn(scope, path, entities).field?.type

/** Which row a path reads — the stamp shown next to a picker. */
export const ownerIn = (
  scope: EntityScope,
  path: FieldPath | undefined,
  entities: EntityMap,
): EntityDef | undefined =>
  resolveIn(scope, path, entities).owner ?? scope.find((e): e is EntityDef => !!e)

/* -- picker options ----------------------------------------- */

export interface FieldOption {
  /** encoded FieldPath — `fieldId` or `viaFieldId>fieldId` */
  key: string
  label: string
  field: FieldDef
  via?: FieldDef
  /** the row this field belongs to — inked as a stamp in the picker */
  owner: EntityDef
}

export const encodePath = (p: FieldPath): string =>
  p.viaFieldId ? `${p.viaFieldId}>${p.fieldId}` : p.fieldId

export function decodePath(key: string): FieldPath {
  const i = key.indexOf('>')
  if (i < 0) return { fieldId: key }
  return { viaFieldId: key.slice(0, i), fieldId: key.slice(i + 1) }
}

export interface FieldOptionOpts {
  /** formula fields are computed on read — exclude them wherever a STORED
   *  value is required (an action writing a cell, a join's link fields) */
  includeFormula?: boolean
  /** offer one-hop `Boat → Price` options through reference fields */
  includeVia?: boolean
  /** restrict to these types (e.g. reference-only for a join wiring) */
  types?: FieldType[]
}

export function fieldOptions(
  entity: EntityDef | undefined,
  entities: EntityMap,
  opts: FieldOptionOpts = {},
): FieldOption[] {
  if (!entity) return []
  const { includeFormula = true, includeVia = true, types } = opts
  const allow = (f: FieldDef): boolean => {
    if (!includeFormula && f.type === 'formula') return false
    if (types && !types.includes(f.type)) return false
    return true
  }

  const out: FieldOption[] = []
  for (const f of entity.fields) {
    if (allow(f)) out.push({ key: f.id, label: f.name, field: f, owner: entity })
  }
  if (!includeVia) return out

  for (const ref of entity.fields) {
    if (ref.type !== 'reference' || !ref.refEntityId) continue
    const target = entities[ref.refEntityId]
    if (!target) continue
    for (const f of target.fields) {
      /* one hop only — never offer a second reference to hop through */
      if (f.type === 'reference' || !allow(f)) continue
      out.push({
        key: `${ref.id}>${f.id}`,
        label: `${ref.name} → ${f.name}`,
        field: f,
        via: ref,
        owner: entity,
      })
    }
  }
  return out
}

/** Options across every row in scope, in the engine's preference order.
 *  Field ids are unique per entity, so the two lists never collide. */
export function fieldOptionsIn(
  scope: EntityScope,
  entities: EntityMap,
  opts: FieldOptionOpts = {},
): FieldOption[] {
  const seen = new Set<string>()
  const out: FieldOption[] = []
  for (const e of scope) {
    if (!e || seen.has(e.id)) continue
    seen.add(e.id)
    out.push(...fieldOptions(e, entities, opts))
  }
  return out
}

/* ---------------------------------------------------------- */
/* Values                                                     */
/* ---------------------------------------------------------- */

export function formatCell(v: CellValue | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v)
    return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }
  return String(v)
}

/** A literal as it reads inside a sentence — quoted when it is text. */
function literalPhrase(v: CellValue | undefined): string {
  if (v === null || v === undefined || v === '') return 'nothing'
  if (typeof v === 'string') return `“${v}”`
  return formatCell(v)
}

export function describeValue(
  expr: ValueExpr | undefined,
  scope: EntityScope,
  entities: EntityMap,
): string {
  if (!expr) return '—'
  if (expr.kind === 'literal') return literalPhrase(expr.value)
  if (expr.kind === 'formula') return expr.src.trim() || 'ƒx'
  return pathLabel(scope, expr.path, entities)
}

/* ---------------------------------------------------------- */
/* Clauses                                                    */
/* ---------------------------------------------------------- */

export interface ClauseContext {
  /** rows the LEFT side may read — the candidate row inside a match */
  left: EntityScope
  /** rows a `{kind:'field'}` RIGHT side may read — the source row first */
  right: EntityScope
  entities: EntityMap
}

export function describeClause(clause: Clause, ctx: ClauseContext): string {
  const left = pathLabel(ctx.left, clause.left, ctx.entities)
  const op = OP_LABEL[clause.op]
  if (isUnaryOp(clause.op)) return `${left} ${op}`
  return `${left} ${op} ${describeValue(clause.right, ctx.right, ctx.entities)}`
}

/** Two bounds on the same field collapse to the sentence a human would say:
 *  `HP between Min HP and Max HP`. */
function betweenPhrase(group: ClauseGroup, ctx: ClauseContext): string | null {
  if (group.combinator !== 'AND' || group.clauses.length !== 2) return null
  const [a, b] = group.clauses
  if (!a || !b) return null
  if (encodePath(a.left) !== encodePath(b.left)) return null
  const lower = ['gt', 'gte']
  const upper = ['lt', 'lte']
  const asc = lower.includes(a.op) && upper.includes(b.op)
  const desc = upper.includes(a.op) && lower.includes(b.op)
  if (!asc && !desc) return null
  const lo = asc ? a : b
  const hi = asc ? b : a
  const field = pathLabel(ctx.left, a.left, ctx.entities)
  const loLabel = describeValue(lo.right, ctx.right, ctx.entities)
  const hiLabel = describeValue(hi.right, ctx.right, ctx.entities)
  return `${field} between ${loLabel} and ${hiLabel}`
}

export function describeGroup(group: ClauseGroup | undefined, ctx: ClauseContext): string {
  if (!group || group.clauses.length === 0) return ''
  const between = betweenPhrase(group, ctx)
  if (between) return between
  const joiner = group.combinator === 'OR' ? ' or ' : ' and '
  return group.clauses.map((c) => describeClause(c, ctx)).join(joiner)
}

/* ---------------------------------------------------------- */
/* Rule shape helpers                                         */
/* ---------------------------------------------------------- */

/** The row the rule is working — the boat. */
export const sourceEntityOf = (
  rule: RuleDef | undefined,
  entities: EntityMap,
): EntityDef | undefined => (rule ? entities[rule.rootEntityId] : undefined)

/** The row a match attached — the motor. First configured match node wins. */
export function matchEntityOf(
  rule: RuleDef | undefined,
  entities: EntityMap,
): EntityDef | undefined {
  if (!rule) return undefined
  for (const n of rule.nodes) {
    if (n.kind !== 'match') continue
    const e = entities[n.config.targetEntityId]
    if (e) return e
  }
  return undefined
}

export function scopeEntity(
  scope: RowScope,
  rule: RuleDef | undefined,
  entities: EntityMap,
): EntityDef | undefined {
  return scope === 'source' ? sourceEntityOf(rule, entities) : matchEntityOf(rule, entities)
}

export interface RuleScopes {
  source: EntityDef | undefined
  match: EntityDef | undefined
  /** left of a filter / condition clause: the engine prefers the match */
  left: EntityScope
  /** a field right-hand side: the engine prefers the source */
  right: EntityScope
}

/** The rows in play once a rule is running, in the engine's own
 *  preference order (see `ClauseScopes.byOwnership` in the engine). */
export function ruleScopes(rule: RuleDef | undefined, entities: EntityMap): RuleScopes {
  const source = sourceEntityOf(rule, entities)
  const match = matchEntityOf(rule, entities)
  return { source, match, left: [match, source], right: [source, match] }
}

/** The row in scope that owns `fieldId`, and the field itself. */
export function findFieldIn(
  scope: EntityScope,
  fieldId: string | undefined,
): { owner: EntityDef; field: FieldDef } | undefined {
  if (!fieldId) return undefined
  for (const e of scope) {
    if (!e) continue
    const field = e.fields.find((f) => f.id === fieldId)
    if (field) return { owner: e, field }
  }
  return undefined
}

/** Header for a combined-view column: `MOTOR · HP`. */
export function columnHeader(
  col: ViewColumn,
  rule: RuleDef | undefined,
  entities: EntityMap,
): { stamp: string; label: string } {
  const entity = scopeEntity(col.scope, rule, entities)
  const field = entity?.fields.find((f) => f.id === col.fieldId)
  return {
    stamp: (entity?.name ?? col.scope).toUpperCase(),
    label: col.label ?? field?.name ?? '(field removed)',
  }
}

/** Engine cell key for a view column — `${scope}:${fieldId}`. */
export const cellKey = (col: ViewColumn): string => `${col.scope}:${col.fieldId}`

/* ---------------------------------------------------------- */
/* Actions                                                    */
/* ---------------------------------------------------------- */

export const ACTION_OPS = ['set', 'create', 'flag', 'link'] as const
export type ActionOpKind = (typeof ACTION_OPS)[number]

export const ACTION_OP_LABEL: Record<ActionOpKind, string> = {
  set: 'Set a value',
  create: 'Create a row',
  flag: 'Flag it',
  link: 'Link into a join',
}

export const actionOpOf = (a: ActionOp | undefined): ActionOpKind =>
  (a?.op ?? 'flag') as ActionOpKind

export function describeAction(
  action: ActionOp | undefined,
  rule: RuleDef | undefined,
  entities: EntityMap,
): { title: string; summary: string; configured: boolean } {
  const { source, match, left } = ruleScopes(rule, entities)
  if (!action) return { title: 'Action', summary: 'Nothing to do yet', configured: false }

  switch (action.op) {
    case 'set': {
      /* the row written is the one that owns the field, match first */
      const found = findFieldIn(left, action.fieldId)
      if (!found) return { title: 'Set', summary: 'Pick a field to write', configured: false }
      const stamp = found.owner === match && source ? `${found.owner.name} · ` : ''
      return {
        title: 'Set',
        summary: `${stamp}${found.field.name} ← ${describeValue(
          action.value,
          [found.owner, source, match],
          entities,
        )}`,
        configured: true,
      }
    }
    case 'create': {
      const target = entities[action.entityId]
      if (!target) return { title: 'Create', summary: 'Pick an entity', configured: false }
      const n = Object.keys(action.values ?? {}).length
      return {
        title: 'Create',
        summary: `A row in ${target.name}${n ? ` · ${n} value${n === 1 ? '' : 's'}` : ''}`,
        configured: true,
      }
    }
    case 'flag':
      return {
        title: 'Flag',
        summary: action.label.trim() ? `“${action.label}”` : 'Give the flag a label',
        configured: !!action.label.trim(),
      }
    case 'link': {
      const join = entities[action.joinEntityId]
      if (!join) return { title: 'Link', summary: 'Pick or create a join entity', configured: false }
      const ok = !!action.sourceFieldId && !!action.matchFieldId
      return {
        title: 'Link',
        summary: ok
          ? `This pair into ${join.name}`
          : `${join.name} — wire up both sides`,
        configured: ok,
      }
    }
    default:
      return { title: 'Action', summary: 'Nothing to do yet', configured: false }
  }
}

/* ---------------------------------------------------------- */
/* Node summaries — the line that makes a flow readable        */
/* ---------------------------------------------------------- */

export interface NodeCaption {
  /** the subject of the node: an entity, a label, an action verb */
  title: string
  /** one human line describing this node's own config */
  summary: string
  /** false ⇒ the node earns a red-pencil mark */
  configured: boolean
}

export function describeNode(
  node: RuleNode,
  rule: RuleDef | undefined,
  entities: EntityMap,
): NodeCaption {
  const source = sourceEntityOf(rule, entities)

  switch (node.kind) {
    case 'start':
      return source
        ? { title: source.name, summary: 'Walks every row', configured: true }
        : { title: 'No entity', summary: 'This rule has no root entity', configured: false }

    case 'match': {
      const target = entities[node.config.targetEntityId]
      if (!target) {
        return { title: 'Pick an entity', summary: 'Which rows should fit?', configured: false }
      }
      /* strict convention inside a match: left is the candidate row,
         a field right-hand side is the source row */
      const summary = describeGroup(node.config.group, {
        left: [target],
        right: [source],
        entities,
      })
      return {
        title: target.name,
        summary: summary || 'No rules yet — every row fits',
        configured: node.config.group.clauses.length > 0,
      }
    }

    case 'condition': {
      const branches = node.config.branches
      if (branches.length === 0) {
        return { title: 'Route', summary: 'No branches yet', configured: false }
      }
      const empties = branches.filter((b) => b.group.clauses.length === 0).length
      return {
        title: 'Route',
        summary: [...branches.map((b) => b.label || 'Untitled'), 'else'].join(' · '),
        configured: empties === 0,
      }
    }

    case 'filter': {
      const scopes = ruleScopes(rule, entities)
      const summary = describeGroup(node.config.group, {
        left: scopes.left,
        right: scopes.right,
        entities,
      })
      return {
        title: 'Keep rows where',
        summary: summary || 'No rules yet — nothing is filtered',
        configured: node.config.group.clauses.length > 0,
      }
    }

    case 'find': {
      const via = source?.fields.find((f) => f.id === node.config.viaFieldId)
      const target = via?.refEntityId ? entities[via.refEntityId] : undefined
      if (!via || !target) {
        return { title: 'Pick a link', summary: 'Which link should it follow?', configured: false }
      }
      return { title: target.name, summary: `Follows ${via.name}`, configured: true }
    }

    case 'loop': {
      const src = node.config.source
      if (src.kind === 'entity') {
        const e = entities[src.entityId]
        return e
          ? { title: e.name, summary: `Once for every ${e.name}`, configured: true }
          : { title: 'Pick a collection', summary: 'Which rows should repeat?', configured: false }
      }
      const owner = Object.values(entities).find((e) =>
        e.fields.some((f) => f.id === src.viaFieldId),
      )
      const via = owner?.fields.find((f) => f.id === src.viaFieldId)
      return owner && via
        ? {
            title: owner.name,
            summary: `Once for every ${owner.name} linked by ${via.name}`,
            configured: true,
          }
        : { title: 'Pick a collection', summary: 'Which rows should repeat?', configured: false }
    }

    case 'action':
      return describeAction(node.config.action, rule, entities)

    case 'output': {
      const cols = node.config.columns ?? []
      const label = node.config.label.trim()
      const sides = new Set(cols.map((c) => c.scope))
      const sideNames = [...sides]
        .map((s) => scopeEntity(s, rule, entities)?.name)
        .filter((n): n is string => !!n)
      return {
        title: label || 'Untitled result',
        summary: cols.length
          ? `${cols.length} column${cols.length === 1 ? '' : 's'}${
              sideNames.length ? ` · ${sideNames.join(' + ')}` : ''
            }`
          : 'No columns picked yet',
        configured: !!label && cols.length > 0,
      }
    }

    default:
      return { title: 'Node', summary: '', configured: false }
  }
}

/* ---------------------------------------------------------- */
/* PLATE SPEC — the node's own logic, in full, on the sheet    */
/* ---------------------------------------------------------- */

/* A one-line summary is a promise that you will click somewhere else to
   find out what it meant. These structures are the other answer: every
   clause, every branch, every column, rendered ON the plate. The plate
   is for READING; the inspector stays the place for EDITING. */

export type PlateChunkKind = 'stamp' | 'field' | 'op' | 'value' | 'word'

/** One inked token on a clause row. */
export interface PlateChunk {
  t: PlateChunkKind
  text: string
  /** stamps only — inked with this entity's BRIGHT accent (plates sit on navy) */
  accent?: AccentKey
  title?: string
}

export interface PlateLine {
  id: string
  /** `AND` / `OR`, printed in the gutter of a continuation clause */
  lead?: string
  chunks: PlateChunk[]
  /** reads quieter — a via-link, an overflow count */
  muted?: boolean
  /** red pencil: this row names exactly what the node still needs */
  missing?: boolean
}

/** A branch of a condition, drawn level with the handle it leaves by. */
export interface PlateRoute {
  /** the source handle id this row belongs to */
  id: string
  label: string
  muted?: boolean
  missing?: boolean
  /** the branch's own test */
  chunks?: PlateChunk[]
}

/** An output column, stamped with the row it is drawn from. */
export interface PlateChip {
  id: string
  stamp: string
  accent?: AccentKey
  label: string
}

export interface PlateSpec {
  /** what this node is about: an entity name, a result label, an action verb */
  subject?: string
  /** statement rows, top to bottom */
  lines: PlateLine[]
  /** condition branches — rendered beside their own out-handles */
  routes?: PlateRoute[]
  /** output columns, at most six */
  chips?: PlateChip[]
  /** columns past the six shown */
  more?: number
  /** the closing sentence — a match's emptyBehavior, in words */
  footer?: string
}

const word = (text: string): PlateChunk => ({ t: 'word', text })
const opChunk = (text: string): PlateChunk => ({ t: 'op', text })
const valueChunk = (text: string): PlateChunk => ({ t: 'value', text })
const fieldChunk = (text: string): PlateChunk => ({ t: 'field', text })

const stampChunk = (e: EntityDef | undefined, fallback = 'value'): PlateChunk =>
  e
    ? { t: 'stamp', text: e.name, accent: e.accent, title: `Reads the ${e.name} row` }
    : { t: 'stamp', text: fallback }

/** A row of red pencil naming the one thing that is missing. */
const miss = (id: string, text: string): PlateLine => ({
  id,
  chunks: [word(text)],
  missing: true,
})

const firstIn = (scope: EntityScope): EntityDef | undefined =>
  scope.find((e): e is EntityDef => !!e)

/** The right-hand side of a clause, as tokens. */
function valueChunks(
  expr: ValueExpr | undefined,
  scope: EntityScope,
  entities: EntityMap,
): PlateChunk[] {
  if (!expr) return [valueChunk('—')]
  if (expr.kind === 'literal') return [valueChunk(literalPhrase(expr.value))]
  if (expr.kind === 'formula') return [valueChunk(expr.src.trim() || 'ƒx')]
  const owner = resolveIn(scope, expr.path, entities).owner ?? firstIn(scope)
  return [stampChunk(owner), fieldChunk(pathLabel(scope, expr.path, entities))]
}

/** `MOTOR HP  ≥  BOAT Min HP` — one clause, one row, both rows stamped. */
function clauseChunks(clause: Clause, ctx: ClauseContext): PlateChunk[] {
  const owner = resolveIn(ctx.left, clause.left, ctx.entities).owner ?? firstIn(ctx.left)
  const chunks: PlateChunk[] = [
    stampChunk(owner),
    fieldChunk(pathLabel(ctx.left, clause.left, ctx.entities)),
    opChunk(OP_LABEL[clause.op]),
  ]
  if (!isUnaryOp(clause.op)) {
    chunks.push(...valueChunks(clause.right, ctx.right, ctx.entities))
  }
  return chunks
}

function clauseLines(group: ClauseGroup, ctx: ClauseContext): PlateLine[] {
  return group.clauses.map((c, i) => ({
    id: c.id,
    lead: i > 0 ? group.combinator : undefined,
    chunks: clauseChunks(c, ctx),
  }))
}

/** A whole group flattened onto one row — used inside a branch, where the
 *  route label already owns the row above it. */
function groupChunks(group: ClauseGroup, ctx: ClauseContext): PlateChunk[] {
  const out: PlateChunk[] = []
  group.clauses.forEach((c, i) => {
    if (i > 0) out.push(word(group.combinator.toLowerCase()))
    out.push(...clauseChunks(c, ctx))
  })
  return out
}

const MAX_CHIPS = 6
const MAX_WRITES = 4

function writeLines(
  values: Record<string, ValueExpr> | undefined,
  target: EntityDef | undefined,
  scope: EntityScope,
  entities: EntityMap,
): PlateLine[] {
  const entries = Object.entries(values ?? {})
  const lines: PlateLine[] = entries.slice(0, MAX_WRITES).map(([fieldId, expr]) => ({
    id: `w-${fieldId}`,
    chunks: [
      fieldChunk(target?.fields.find((f) => f.id === fieldId)?.name ?? '(field removed)'),
      opChunk('='),
      ...valueChunks(expr, scope, entities),
    ],
  }))
  const rest = entries.length - lines.length
  if (rest > 0) {
    lines.push({
      id: 'w-more',
      muted: true,
      chunks: [word(`+${rest} more value${rest === 1 ? '' : 's'}`)],
    })
  }
  return lines
}

function actionPlate(
  action: ActionOp | undefined,
  rule: RuleDef | undefined,
  entities: EntityMap,
): PlateSpec {
  const { source, match, left } = ruleScopes(rule, entities)
  if (!action) return { lines: [miss('act', 'choose what this action does')] }

  switch (action.op) {
    case 'set': {
      const found = findFieldIn(left, action.fieldId)
      if (!found) return { subject: 'Set', lines: [miss('set', 'pick a field to write')] }
      return {
        subject: 'Set',
        lines: [
          {
            id: 'set',
            chunks: [
              word('set'),
              stampChunk(found.owner),
              fieldChunk(found.field.name),
              opChunk('='),
              ...valueChunks(action.value, [found.owner, source, match], entities),
            ],
          },
        ],
      }
    }

    case 'create': {
      const target = entities[action.entityId]
      if (!target) return { subject: 'Create', lines: [miss('cr', 'pick an entity to create')] }
      return {
        subject: 'Create',
        lines: [
          { id: 'cr', chunks: [word('create a'), stampChunk(target), word('row')] },
          ...writeLines(action.values, target, [source, match], entities),
        ],
      }
    }

    case 'flag': {
      const label = action.label.trim()
      if (!label) return { subject: 'Flag', lines: [miss('flag', 'give the flag a label')] }
      return {
        subject: 'Flag',
        lines: [
          { id: 'flag', chunks: [word('flag'), valueChunk(`“${label}”`)] },
          { id: 'tone', muted: true, chunks: [word(`marked ${action.tone}`)] },
        ],
      }
    }

    case 'link': {
      const join = entities[action.joinEntityId]
      const pair: PlateLine = {
        id: 'link',
        chunks: [word('link'), stampChunk(source), word('↔'), stampChunk(match, 'match')],
      }
      if (!join) {
        return { subject: 'Link', lines: [pair, miss('join', 'pick or create a join entity')] }
      }
      if (!action.sourceFieldId || !action.matchFieldId) {
        return {
          subject: 'Link',
          lines: [pair, miss('wire', `wire both sides into ${join.name}`)],
        }
      }
      return {
        subject: 'Link',
        lines: [
          pair,
          { id: 'into', chunks: [word('into'), stampChunk(join)] },
          ...writeLines(action.values, join, [source, match], entities),
        ],
      }
    }

    default:
      return { lines: [miss('act', 'choose what this action does')] }
  }
}

/**
 * Everything a plate must say about itself — no clicking required.
 * Pure: give it a node, its rule and the schema, and it hands back the
 * rows to draw.
 */
export function plateSpec(
  node: RuleNode,
  rule: RuleDef | undefined,
  entities: EntityMap,
): PlateSpec {
  const source = sourceEntityOf(rule, entities)

  switch (node.kind) {
    case 'start':
      return source
        ? {
            subject: source.name,
            lines: [
              { id: 'walk', chunks: [word('walk every'), stampChunk(source), word('row')] },
            ],
          }
        : { lines: [miss('root', 'give this rule a root entity')] }

    case 'match': {
      const target = entities[node.config.targetEntityId]
      const footer =
        node.config.emptyBehavior === 'passThrough'
          ? 'no match → carry on'
          : 'no match → skip row'
      if (!target) return { lines: [miss('tgt', 'pick an entity to match')], footer }
      const group = node.config.group
      const ctx: ClauseContext = { left: [target], right: [source], entities }
      return {
        subject: target.name,
        lines: group.clauses.length
          ? clauseLines(group, ctx)
          : [miss('cl', `add a test — every ${target.name} row fits`)],
        footer,
      }
    }

    case 'condition': {
      const scopes = ruleScopes(rule, entities)
      const ctx: ClauseContext = { left: scopes.left, right: scopes.right, entities }
      const branches = node.config.branches
      const routes: PlateRoute[] = branches.map((b, i) => ({
        id: b.id,
        label: b.label || `Branch ${i + 1}`,
        missing: b.group.clauses.length === 0,
        chunks: b.group.clauses.length
          ? groupChunks(b.group, ctx)
          : [word('no test yet — this branch never fires')],
      }))
      routes.push({
        id: ELSE_HANDLE,
        label: 'else',
        muted: true,
        chunks: [word('everything that got this far')],
      })
      return {
        lines: branches.length ? [] : [miss('br', 'add a branch — every row falls to else')],
        routes,
      }
    }

    case 'filter': {
      const scopes = ruleScopes(rule, entities)
      const group = node.config.group
      const ctx: ClauseContext = { left: scopes.left, right: scopes.right, entities }
      return {
        lines: group.clauses.length
          ? clauseLines(group, ctx)
          : [miss('cl', 'add a test — nothing is filtered out')],
        footer: group.clauses.length ? 'no match → stop here' : undefined,
      }
    }

    case 'find': {
      const via = source?.fields.find((f) => f.id === node.config.viaFieldId)
      const target = via?.refEntityId ? entities[via.refEntityId] : undefined
      if (!source || !via || !target) {
        return { lines: [miss('lnk', 'pick a link to follow')] }
      }
      return {
        subject: target.name,
        lines: [
          {
            id: 'follow',
            chunks: [word('follow'), stampChunk(source), word('→'), stampChunk(target)],
          },
          { id: 'via', muted: true, chunks: [word('via'), fieldChunk(via.name)] },
        ],
      }
    }

    case 'loop': {
      const src = node.config.source
      if (src.kind === 'entity') {
        const e = entities[src.entityId]
        if (!e) return { lines: [miss('coll', 'pick a collection to repeat')] }
        return {
          subject: e.name,
          lines: [{ id: 'each', chunks: [word('for each'), stampChunk(e), word('row')] }],
        }
      }
      const owner = Object.values(entities).find((e) =>
        e.fields.some((f) => f.id === src.viaFieldId),
      )
      const via = owner?.fields.find((f) => f.id === src.viaFieldId)
      if (!owner || !via) return { lines: [miss('coll', 'pick a collection to repeat')] }
      return {
        subject: owner.name,
        lines: [
          { id: 'each', chunks: [word('for each'), stampChunk(owner), word('row')] },
          { id: 'via', muted: true, chunks: [word('linked by'), fieldChunk(via.name)] },
        ],
      }
    }

    case 'action':
      return actionPlate(node.config.action, rule, entities)

    case 'output': {
      const label = node.config.label.trim()
      const cols = node.config.columns ?? []
      const lines: PlateLine[] = []
      if (!label) lines.push(miss('lbl', 'name the result set'))
      if (!cols.length) lines.push(miss('cols', 'pick the columns to show'))
      const chips: PlateChip[] = cols.slice(0, MAX_CHIPS).map((c, i) => {
        const entity = scopeEntity(c.scope, rule, entities)
        const field = entity?.fields.find((f) => f.id === c.fieldId)
        return {
          id: `${c.scope}:${c.fieldId}:${i}`,
          stamp: entity?.name ?? c.scope,
          accent: entity?.accent,
          label: c.label ?? field?.name ?? '(field removed)',
        }
      })
      return {
        subject: label || undefined,
        lines,
        chips,
        more: Math.max(0, cols.length - chips.length),
      }
    }

    default:
      return { lines: [] }
  }
}

/* ---------------------------------------------------------- */
/* Out-handles                                                */
/* ---------------------------------------------------------- */

export interface OutHandle {
  id: string
  label: string
  /** the else route / the loop's continue route read quieter */
  muted?: boolean
}

/** Chip shown on a node after a run. */
export function hitLabel(kind: RuleNodeKind, n: number): string {
  const num = n.toLocaleString()
  switch (kind) {
    case 'match':
      return `${num} fit`
    case 'action':
      return `${num} done`
    case 'output':
      return `${num} out`
    default:
      return `${num} rows`
  }
}

/** Display field name — used when a view falls back to row labels. */
export const displayFieldName = (e: EntityDef | undefined): string =>
  e ? (displayFieldOf(e)?.name ?? 'Row') : 'Row'

/** Tag of a field type, for the little inline stamps in pickers. */
export const typeTag = (f: FieldDef | undefined): string =>
  f ? FIELD_TYPES[f.type].tag : ''

export const typeInk = (f: FieldDef | undefined): string =>
  f ? FIELD_TYPES[f.type].cssVar : 'var(--ink-faint)'
