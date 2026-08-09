/* ============================================================
   io/envelope — receiving a set from outside.

   Everything a file claims is untrusted. `validateEnvelope` returns
   either a REJECTION carrying a printable reason, or a value shaped
   exactly like a native `ProjectExport`: every id checked, every rule
   node narrowed to its own config shape, nothing left `as unknown as`.

   Two invariants the rest of the app leans on:

   1. SAFE IDS. Imported ids become object keys downstream — store
      records, rowsByEntity, row.values, Dexie primary keys, and a
      run's nodeHits / edgeHits / nodeWarnings. A key colliding with
      Object.prototype ("__proto__", "constructor", …) silently
      corrupts those records — "__proto__" assignment even reassigns a
      prototype — and can permanently break startup. Ids are therefore
      restricted to the nanoid charset minus prototype property names.
   2. NOTHING VALID IS LOST. The rule model is a discriminated union
      with a typed config per kind, so each kind is normalised field by
      field: a legitimate set survives export → import unchanged, and
      anything unrepresentable is nulled to the model's own
      "unconfigured" sentinel ('' for an id, `{fieldId:''}` for a path)
      — which `validateRule` reports as a designed blocker rather than
      letting the rule run quietly with a different meaning.
   ============================================================ */

import {
  ACCENT_KEYS,
  ELSE_HANDLE,
  EXPORT_KIND,
  EXPORT_VERSION,
  FIELD_TYPES,
  LOOP_BODY_HANDLE,
  LOOP_NEXT_HANDLE,
  OUT_HANDLE,
  RULE_NODE_KINDS,
  type AccentKey,
  type ActionOp,
  type CellValue,
  type Clause,
  type ClauseGroup,
  type CompareOp,
  type ConditionBranch,
  type EntityDef,
  type FieldDef,
  type FieldPath,
  type FieldType,
  type GroupDef,
  type LoopSource,
  type ProjectExport,
  type RowData,
  type RuleDef,
  type RuleEdge,
  type RuleNode,
  type RuleNodeKind,
  type ValueExpr,
  type ViewColumn,
  type XY,
} from '@/types/model'
import { newId, nowIso } from '@/lib/id'

export type Validated =
  | { ok: true; data: ProjectExport }
  | { ok: false; error: string }

/* ------------------------------------------------------------ */
/* primitives                                                    */
/* ------------------------------------------------------------ */

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

const isCellValue = (v: unknown): v is CellValue =>
  v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

const clampAccent = (v: unknown, fallback: AccentKey): AccentKey =>
  typeof v === 'string' && (ACCENT_KEYS as string[]).includes(v) ? (v as AccentKey) : fallback

const isFieldType = (v: unknown): v is FieldType =>
  typeof v === 'string' && Object.hasOwn(FIELD_TYPES, v)

/* Imported ids become object keys downstream (store keyed records,
   rowsByEntity, row.values, Dexie primary keys, run hit counters).
   A key colliding with Object.prototype ("__proto__", "constructor", …)
   silently corrupts those records — "__proto__" assignment even
   reassigns a prototype — and can permanently break startup, so ids are
   restricted to the nanoid charset minus prototype property names. */
export const isSafeId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v) && !(v in Object.prototype)

/** An id we can keep, or the model's "not configured yet" sentinel. */
const safeIdOr = (v: unknown, fallback: string): string => (isSafeId(v) ? v : fallback)

/* ------------------------------------------------------------ */
/* rule model — clause level                                     */
/* ------------------------------------------------------------ */

const COMPARE_OPS: CompareOp[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'startsWith',
  'endsWith',
  'isEmpty',
  'notEmpty',
  'isTrue',
  'isFalse',
]

const isCompareOp = (v: unknown): v is CompareOp =>
  typeof v === 'string' && (COMPARE_OPS as string[]).includes(v)

const isRuleNodeKind = (v: unknown): v is RuleNodeKind =>
  typeof v === 'string' && Object.hasOwn(RULE_NODE_KINDS, v)

/** Handles the graph reserves for itself — a branch id may never be one
 *  of these, or the branch would shadow `else` / `out` / a loop leg. */
const RESERVED_HANDLES = new Set<string>([
  OUT_HANDLE,
  ELSE_HANDLE,
  LOOP_BODY_HANDLE,
  LOOP_NEXT_HANDLE,
])

/** The path a value is read through. An unusable field id blanks the
 *  whole path rather than half of it: `{fieldId:''}` is what the clause
 *  editor shows as "no field chosen", and validateRule blocks on it. */
const BLANK_PATH: FieldPath = { fieldId: '' }

function normFieldPath(raw: unknown): FieldPath {
  if (!isRecord(raw) || !isSafeId(raw.fieldId)) return { ...BLANK_PATH }
  /* a hop we cannot resolve would silently turn "read [Boat → Price]"
     into "read [Price] here", so the whole path goes blank instead */
  if (raw.viaFieldId !== undefined && !isSafeId(raw.viaFieldId)) return { ...BLANK_PATH }
  return {
    ...(isSafeId(raw.viaFieldId) ? { viaFieldId: raw.viaFieldId } : {}),
    fieldId: raw.fieldId,
  }
}

function normValueExpr(raw: unknown): ValueExpr | undefined {
  if (!isRecord(raw)) return undefined
  switch (raw.kind) {
    case 'literal':
      return { kind: 'literal', value: isCellValue(raw.value) ? raw.value : null }
    case 'field':
      return { kind: 'field', path: normFieldPath(raw.path) }
    case 'formula':
      /* formula source names fields by NAME, never by id — nothing to remap */
      return { kind: 'formula', src: str(raw.src) ?? '' }
    default:
      return undefined
  }
}

function normClause(raw: unknown): Clause {
  const rec = isRecord(raw) ? raw : {}
  const id = safeIdOr(rec.id, '') || newId()
  /* an operator this version does not know cannot be honoured, and
     guessing one would change what the rule means — so the clause comes
     through blank, which validateRule reports as unfinished */
  if (!isCompareOp(rec.op)) return { id, left: { ...BLANK_PATH }, op: 'eq' }
  const right = normValueExpr(rec.right)
  return {
    id,
    left: normFieldPath(rec.left),
    op: rec.op,
    ...(right ? { right } : {}),
  }
}

function normClauseGroup(raw: unknown): ClauseGroup {
  const rec = isRecord(raw) ? raw : {}
  return {
    combinator: rec.combinator === 'OR' ? 'OR' : 'AND',
    clauses: arr(rec.clauses).map(normClause),
  }
}

/** field-id → value map (action `create` / `link` extras). Keys are
 *  written into row.values, so they must be safe ids. */
function normValueMap(raw: unknown): Record<string, ValueExpr> {
  const out: Record<string, ValueExpr> = {}
  if (!isRecord(raw)) return out
  for (const [fieldId, expr] of Object.entries(raw)) {
    if (!isSafeId(fieldId)) continue
    const value = normValueExpr(expr)
    if (value) out[fieldId] = value
  }
  return out
}

function normLoopSource(raw: unknown): LoopSource {
  if (isRecord(raw) && raw.kind === 'linked') {
    return { kind: 'linked', viaFieldId: safeIdOr(raw.viaFieldId, '') }
  }
  return { kind: 'entity', entityId: isRecord(raw) ? safeIdOr(raw.entityId, '') : '' }
}

/** An action we cannot represent becomes an unconfigured `set`, which
 *  validateRule blocks on ("has no field to set"). Anything quieter —
 *  a stray flag, a dropped node — would let the rule run as if the
 *  write had never been asked for. */
const UNCONFIGURED_ACTION: ActionOp = {
  op: 'set',
  fieldId: '',
  value: { kind: 'literal', value: null },
}

function normAction(raw: unknown): ActionOp {
  if (!isRecord(raw)) return { ...UNCONFIGURED_ACTION }
  switch (raw.op) {
    case 'set':
      return {
        op: 'set',
        fieldId: safeIdOr(raw.fieldId, ''),
        value: normValueExpr(raw.value) ?? { kind: 'literal', value: null },
      }
    case 'create':
      return {
        op: 'create',
        entityId: safeIdOr(raw.entityId, ''),
        values: normValueMap(raw.values),
      }
    case 'link': {
      const values = normValueMap(raw.values)
      return {
        op: 'link',
        joinEntityId: safeIdOr(raw.joinEntityId, ''),
        sourceFieldId: safeIdOr(raw.sourceFieldId, ''),
        matchFieldId: safeIdOr(raw.matchFieldId, ''),
        ...(raw.values !== undefined ? { values } : {}),
      }
    }
    case 'flag':
      return {
        op: 'flag',
        label: str(raw.label) ?? 'Flagged',
        tone: raw.tone === 'warn' || raw.tone === 'danger' ? raw.tone : 'info',
      }
    default:
      return { ...UNCONFIGURED_ACTION }
  }
}

/** A column that is not even an object carries nothing to keep, so it is
 *  dropped; one that names a field we cannot use comes through blank,
 *  which validateRule reports as "a column with no field chosen". */
function normViewColumns(raw: unknown): ViewColumn[] {
  const out: ViewColumn[] = []
  for (const c of arr(raw)) {
    if (!isRecord(c)) continue
    const label = str(c.label)
    out.push({
      scope: c.scope === 'match' ? 'match' : 'source',
      fieldId: safeIdOr(c.fieldId, ''),
      ...(label !== undefined ? { label } : {}),
    })
  }
  return out
}

/* ------------------------------------------------------------ */
/* rule model — node level                                       */
/* ------------------------------------------------------------ */

/** Ids that had to be reissued while reading one rule, so the edge pass
 *  can follow them. Branch keys are `${nodeId}::${oldBranchId}` because a
 *  handle only means anything alongside the node it leaves. */
interface RuleRemaps {
  nodes: Map<string, string>
  branches: Map<string, string>
}

export const branchKey = (nodeId: string, branchId: string): string =>
  `${nodeId}::${branchId}`

function normPosition(raw: unknown, index: number): XY {
  const pos = isRecord(raw) ? raw : {}
  return { x: num(pos.x, 60 + index * 260), y: num(pos.y, 60) }
}

function normBranches(
  raw: unknown,
  nodeId: string,
  remaps: RuleRemaps,
): ConditionBranch[] {
  const out: ConditionBranch[] = []
  const seen = new Set<string>()
  arr(raw).forEach((b, i) => {
    if (!isRecord(b)) return
    const claimed = typeof b.id === 'string' ? b.id : ''
    let id = claimed
    /* a branch id IS its React Flow source handle: it may not be blank,
       may not shadow a reserved handle, and may not repeat on one node */
    if (id === '' || RESERVED_HANDLES.has(id) || seen.has(id)) {
      const fresh = newId()
      const key = branchKey(nodeId, claimed)
      if (claimed !== '' && !seen.has(claimed) && !remaps.branches.has(key)) {
        remaps.branches.set(key, fresh)
      }
      id = fresh
    }
    seen.add(id)
    out.push({
      id,
      label: str(b.label) ?? `Branch ${i + 1}`,
      group: normClauseGroup(b.group),
    })
  })
  return out
}

function normRuleNode(
  raw: unknown,
  index: number,
  seen: Set<string>,
  remaps: RuleRemaps,
): RuleNode | undefined {
  if (!isRecord(raw)) return undefined
  /* a kind this version cannot draw has no plate on the canvas and no
     meaning in the engine — there is nothing honest to keep */
  if (!isRuleNodeKind(raw.kind)) return undefined

  const claimed = typeof raw.id === 'string' ? raw.id : ''
  let id = claimed
  if (!isSafeId(id)) {
    const fresh = newId()
    if (claimed !== '' && !remaps.nodes.has(claimed)) remaps.nodes.set(claimed, fresh)
    id = fresh
  } else if (seen.has(id)) {
    /* a repeated id: the first node keeps it (and keeps its edges), the
       later one is reissued and arrives unwired */
    id = newId()
  }
  seen.add(id)

  const position = normPosition(raw.position, index)
  const cfg = isRecord(raw.config) ? raw.config : {}

  switch (raw.kind) {
    case 'start':
      return { id, kind: 'start', position, config: {} }

    case 'match':
      return {
        id,
        kind: 'match',
        position,
        config: {
          targetEntityId: safeIdOr(cfg.targetEntityId, ''),
          group: normClauseGroup(cfg.group),
          emptyBehavior: cfg.emptyBehavior === 'passThrough' ? 'passThrough' : 'skip',
        },
      }

    case 'condition':
      return {
        id,
        kind: 'condition',
        position,
        config: { branches: normBranches(cfg.branches, id, remaps) },
      }

    case 'filter':
      return { id, kind: 'filter', position, config: { group: normClauseGroup(cfg.group) } }

    case 'find':
      return { id, kind: 'find', position, config: { viaFieldId: safeIdOr(cfg.viaFieldId, '') } }

    case 'loop':
      return { id, kind: 'loop', position, config: { source: normLoopSource(cfg.source) } }

    case 'action':
      return { id, kind: 'action', position, config: { action: normAction(cfg.action) } }

    case 'output':
      return {
        id,
        kind: 'output',
        position,
        config: {
          label: str(cfg.label) ?? 'Result',
          ...(cfg.columns !== undefined ? { columns: normViewColumns(cfg.columns) } : {}),
        },
      }

    default:
      return undefined
  }
}

/** Every source handle a node actually draws — the same list the canvas
 *  renders from. An edge leaving a handle that is not here can never be
 *  traversed and makes React Flow complain about a missing handle, so it
 *  is dropped rather than kept as decoration. */
export function handlesOf(node: RuleNode): Set<string> {
  switch (node.kind) {
    case 'output':
      return new Set()
    case 'condition':
      return new Set([...node.config.branches.map((b) => b.id), ELSE_HANDLE])
    case 'loop':
      return new Set([LOOP_BODY_HANDLE, LOOP_NEXT_HANDLE])
    default:
      return new Set([OUT_HANDLE])
  }
}

function normRuleEdges(raw: unknown, nodes: RuleNode[], remaps: RuleRemaps): RuleEdge[] {
  const out: RuleEdge[] = []
  const seen = new Set<string>()
  const handles = new Map<string, Set<string>>()
  for (const n of nodes) handles.set(n.id, handlesOf(n))

  for (const e of arr(raw)) {
    if (!isRecord(e)) continue
    if (typeof e.source !== 'string' || typeof e.target !== 'string') continue
    const source = remaps.nodes.get(e.source) ?? e.source
    const target = remaps.nodes.get(e.target) ?? e.target
    /* an edge to a node that is not here is ignored by the engine and
       only ever draws a warning — drop it at the door instead */
    const sourceHandles = handles.get(source)
    if (!sourceHandles || !handles.has(target)) continue

    const claimed = typeof e.sourceHandle === 'string' ? e.sourceHandle : OUT_HANDLE
    const sourceHandle = remaps.branches.get(branchKey(source, claimed)) ?? claimed
    if (!sourceHandles.has(sourceHandle)) continue

    let id = safeIdOr(e.id, '')
    if (id === '' || seen.has(id)) id = newId()
    seen.add(id)
    out.push({ id, source, target, sourceHandle })
  }
  return out
}

/* ------------------------------------------------------------ */
/* validateEnvelope                                              */
/* ------------------------------------------------------------ */

/** Defensive envelope check + normalisation. Never throws; anything that
 *  passes comes out shaped exactly like a native ProjectExport. */
export function validateEnvelope(raw: unknown): Validated {
  /* every message here is read by the user in the popover, so it stays in
     configurator words — tables, columns, rows — never the shape names the
     file format happens to use internally */
  if (!isRecord(raw)) return { ok: false, error: 'NOT A HELMLOGIC SHEET FILE' }
  if (raw.kind !== EXPORT_KIND)
    return { ok: false, error: 'NOT A HELMLOGIC SHEET FILE' }
  if (raw.version !== EXPORT_VERSION)
    return { ok: false, error: `SAVED BY A DIFFERENT VERSION — EXPECTED V${EXPORT_VERSION}` }
  if (!Array.isArray(raw.entities))
    return { ok: false, error: 'THIS FILE HAS NO TABLES IN IT' }
  if (raw.groups !== undefined && !Array.isArray(raw.groups))
    return { ok: false, error: 'FILE IS DAMAGED — BAD LAYOUT BLOCK' }
  if (raw.rules !== undefined && !Array.isArray(raw.rules))
    return { ok: false, error: 'FILE IS DAMAGED — BAD RULES BLOCK' }
  if (raw.rows !== undefined && !isRecord(raw.rows))
    return { ok: false, error: 'FILE IS DAMAGED — ROWS ARE NOT GROUPED BY TABLE' }

  const stamp = nowIso()

  /* One id namespace for the whole file: entities, fields, groups, rules
     and rows all feed shared id-keyed maps downstream, and duplicated ids
     make edits hit multiple records live, then silently drop rows when
     Dexie's id-keyed bulkPut last-wins on save. Rule node / edge / branch
     / clause ids are NOT in this namespace — they live inside one rule,
     never in a shared map — and are made unique per rule instead. */
  const seenIds = new Set<string>()
  const isDuplicate = (id: string): boolean => {
    if (seenIds.has(id)) return true
    seenIds.add(id)
    return false
  }

  /* -- entities (strict on id/name/fields, tolerant elsewhere) */
  const entities: EntityDef[] = []
  for (let i = 0; i < raw.entities.length; i++) {
    const e: unknown = raw.entities[i]
    if (
      !isRecord(e) ||
      typeof e.id !== 'string' ||
      typeof e.name !== 'string' ||
      !Array.isArray(e.fields)
    ) {
      return { ok: false, error: `TABLE ${i + 1} IS DAMAGED — NEEDS AN ID, A NAME AND COLUMNS` }
    }
    if (!isSafeId(e.id)) return { ok: false, error: `TABLE ${i + 1} HAS AN UNSAFE ID` }
    if (isDuplicate(e.id)) return { ok: false, error: `DUPLICATE ID "${e.id}"` }
    const fields: FieldDef[] = []
    for (const f of e.fields as unknown[]) {
      if (!isRecord(f) || typeof f.id !== 'string' || typeof f.name !== 'string') {
        return { ok: false, error: `DAMAGED COLUMN IN TABLE "${e.name}"` }
      }
      if (!isSafeId(f.id)) return { ok: false, error: `UNSAFE COLUMN ID IN TABLE "${e.name}"` }
      if (isDuplicate(f.id)) return { ok: false, error: `DUPLICATE ID "${f.id}"` }
      fields.push({
        id: f.id,
        name: f.name,
        type: isFieldType(f.type) ? f.type : 'text',
        ...(str(f.description) !== undefined ? { description: str(f.description) } : {}),
        ...(typeof f.required === 'boolean' ? { required: f.required } : {}),
        ...(Array.isArray(f.options)
          ? { options: (f.options as unknown[]).filter((o): o is string => typeof o === 'string') }
          : {}),
        /* unsafe id refs can never resolve (no accepted id is unsafe),
           so drop them rather than let record[ref] hit Object.prototype */
        ...(isSafeId(f.refEntityId) ? { refEntityId: f.refEntityId } : {}),
        ...(str(f.formula) !== undefined ? { formula: str(f.formula) } : {}),
        ...(isCellValue(f.defaultValue) ? { defaultValue: f.defaultValue } : {}),
      })
    }
    const pos = isRecord(e.position) ? e.position : {}
    entities.push({
      id: e.id,
      name: e.name,
      ...(str(e.description) !== undefined ? { description: str(e.description) } : {}),
      accent: clampAccent(e.accent, ACCENT_KEYS[i % ACCENT_KEYS.length]),
      fields,
      ...(isSafeId(e.displayFieldId) ? { displayFieldId: e.displayFieldId } : {}),
      position: {
        x: num(pos.x, 120 + (i % 4) * 340),
        y: num(pos.y, 120 + Math.floor(i / 4) * 300),
      },
      ...(isSafeId(e.groupId) ? { groupId: e.groupId } : {}),
      createdAt: str(e.createdAt) ?? stamp,
      updatedAt: str(e.updatedAt) ?? stamp,
    })
  }

  /* -- groups (drop malformed entries) */
  const groups: GroupDef[] = []
  for (const g of (raw.groups ?? []) as unknown[]) {
    if (!isRecord(g) || !isSafeId(g.id)) continue
    if (isDuplicate(g.id)) return { ok: false, error: `DUPLICATE ID "${g.id}"` }
    const pos = isRecord(g.position) ? g.position : {}
    const size = isRecord(g.size) ? g.size : {}
    groups.push({
      id: g.id,
      name: str(g.name) ?? 'Zone',
      accent: clampAccent(g.accent, 'violet'),
      position: { x: num(pos.x, 80), y: num(pos.y, 80) },
      size: { w: num(size.w, 520), h: num(size.h, 380) },
    })
  }

  /* -- rules: every node narrowed to its own config shape ---- */
  const rules: RuleDef[] = []
  for (const r of (raw.rules ?? []) as unknown[]) {
    if (!isRecord(r) || !isSafeId(r.id)) continue
    if (isDuplicate(r.id)) return { ok: false, error: `DUPLICATE ID "${r.id}"` }

    const remaps: RuleRemaps = { nodes: new Map(), branches: new Map() }
    const seenNodeIds = new Set<string>()
    const nodes: RuleNode[] = []
    arr(r.nodes).forEach((n, i) => {
      const node = normRuleNode(n, i, seenNodeIds, remaps)
      if (node) nodes.push(node)
    })
    const edges = normRuleEdges(r.edges, nodes, remaps)

    rules.push({
      id: r.id,
      name: str(r.name)?.trim() || 'Rule',
      ...(str(r.description) !== undefined ? { description: str(r.description) } : {}),
      /* a root that cannot be an id is nulled, never guessed: the rule
         still arrives, and validateRule asks for a new entity */
      rootEntityId: safeIdOr(r.rootEntityId, ''),
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
      nodes,
      edges,
      createdAt: str(r.createdAt) ?? stamp,
      updatedAt: str(r.updatedAt) ?? stamp,
    })
  }

  /* -- rows */
  let rows: Record<string, RowData[]> | undefined
  if (isRecord(raw.rows)) {
    rows = {}
    for (const [entityId, list] of Object.entries(raw.rows)) {
      if (!isSafeId(entityId)) return { ok: false, error: 'UNSAFE TABLE ID IN THE ROW DATA' }
      if (!Array.isArray(list))
        return { ok: false, error: `THE ROWS FOR TABLE "${entityId}" ARE DAMAGED` }
      const clean: RowData[] = []
      for (const r of list as unknown[]) {
        if (!isRecord(r) || typeof r.id !== 'string')
          return { ok: false, error: 'DAMAGED ROW — MISSING ID' }
        if (!isSafeId(r.id)) return { ok: false, error: 'UNSAFE ROW ID' }
        if (isDuplicate(r.id)) return { ok: false, error: `DUPLICATE ID "${r.id}"` }
        const values: Record<string, CellValue> = {}
        if (isRecord(r.values)) {
          for (const [k, v] of Object.entries(r.values)) {
            if (isSafeId(k) && isCellValue(v)) values[k] = v
          }
        }
        clean.push({
          id: r.id,
          entityId,
          values,
          createdAt: str(r.createdAt) ?? stamp,
          updatedAt: str(r.updatedAt) ?? stamp,
        })
      }
      rows[entityId] = clean
    }
  }

  const projectRaw = isRecord(raw.project) ? raw.project : {}
  const data: ProjectExport = {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: str(raw.exportedAt) ?? '',
    project: {
      name:
        typeof projectRaw.name === 'string' && projectRaw.name.trim()
          ? projectRaw.name
          : 'Imported Set',
      rev: num(projectRaw.rev, 0),
    },
    entities,
    groups,
    rules,
    ...(rows ? { rows } : {}),
  }
  return { ok: true, data }
}
