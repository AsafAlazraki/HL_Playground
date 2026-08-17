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

   V2 — WHAT A PERSON MADE, not just what the seed produced.

   Until version 2 this validator read ten of EntityDef's fourteen
   keys and dropped `kind`, `role`, `hierarchy` and `sections` on the
   floor, plus `sectionId` on every column. A round trip therefore
   returned every table as an untyped, ungrouped, unbanded flat list:
   the file still LOOKED complete because the counts matched, and the
   thing that was lost — the shape of the table — is exactly the work
   this product exists to let someone do. Those five keys are read
   here now, and the tests beside this file are why they cannot go
   quiet again.

   The same silence covered the whole of the design layer. Modules,
   view pages, the organisation and the business rules were not in
   the file at all, so nothing anybody designed could leave the
   browser it was made in. `ProjectExport` carries all four as of
   version 2 and each one is validated here to the same standard as
   the rest: ids through `isSafeId`, every field narrowed, nothing
   left `unknown`.

   REFERENTIAL SANITY. A module or a page pointing at a table that is
   not in the file cannot draw. Rather than import a broken pointer
   and hope a stage notices, the pointer is resolved HERE against the
   tables that actually arrived, and what cannot resolve is dropped —
   see `normModule` and `normView` for exactly what goes and why.

   A V1 FILE STILL IMPORTS. Every key added above is optional, so an
   older file arrives with none of them and is read as "a project
   with no modules, no pages and no rules" rather than refused. That
   is true of the file a person saved yesterday, and refusing it
   would be the version bump destroying the thing it was made to
   protect.
   ============================================================ */

import {
  ACCENT_KEYS,
  DEFAULT_CAPABILITIES,
  DISCONTINUED_FIELD_ID,
  ELSE_HANDLE,
  EXPORT_KIND,
  EXPORT_VERSION,
  FIELD_TYPES,
  INDUSTRIES,
  isPairFieldId,
  isSystemFieldId,
  LOOP_BODY_HANDLE,
  LOOP_NEXT_HANDLE,
  MODULE_CAPABILITIES,
  OUT_HANDLE,
  RULE_NODE_KINDS,
  TABLE_KINDS,
  type AccentKey,
  type ActionOp,
  type CellValue,
  type Clause,
  type ClauseGroup,
  type ColumnFilter,
  type ColumnSection,
  type CompareOp,
  type ConditionBranch,
  type ConstraintDef,
  type ConstraintKind,
  type EntityDef,
  type FieldDef,
  type FieldPath,
  type FieldType,
  type GroupDef,
  type ImageRef,
  type IndustryKey,
  type LoopSource,
  type ModuleCapability,
  type ModuleDef,
  type ModuleIndexMode,
  type OrgProfile,
  type ProjectExport,
  type RowData,
  type RuleDef,
  type RuleEdge,
  type RuleNode,
  type RuleNodeKind,
  type TableKind,
  type TableRole,
  type ValueExpr,
  type ViewBlock,
  type ViewColumn,
  type ViewDef,
  type XY,
} from '@/types/model'
import { isStorableSource } from '@/lib/imageSources'
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

/* PICTURES SURVIVE A ROUND TRIP — they used to not.
   `CellValue` has been `string | number | boolean | null | ImageRef[]`
   since image columns existed, and this guard listed the first four.
   Every picture in every cell was therefore dropped on import, in
   silence, by the `isCellValue(v)` test on the row-values loop below:
   export a project with photographs, import it, and the photographs
   are gone with no error and no count. Found by the reachability and
   test sweep, not by a user — which is the only reason it is not
   already someone's lost afternoon.

   AN IMPORTED FILE IS UNTRUSTED INPUT, and `ImageRef.src` goes
   straight into an `<img src>`, so this is a security boundary as
   well as a shape check. The scheme allow-list is the same one the
   paste route enforces (`sourceKind` in `@/lib/imageSources`):
   http, https, data:image/ and blob: only. A `javascript:` or
   `data:text/html` source in a hand-edited project file is refused
   here, at the door, rather than sanitised later by whoever renders
   it. It asks `isStorableSource`, which is the SCHEME question alone
   and works without a `window` — `sourceKind` answers "can this paint
   on this origin?", which is a different question and returns
   `refused` for a good https address in any non-browser context. Refusing the PICTURE rather than the whole cell keeps an
   otherwise good import: one bad address costs one photograph. */
const isImageRef = (v: unknown): v is ImageRef => {
  if (!isRecord(v)) return false
  if (typeof v.id !== 'string' || !isSafeId(v.id)) return false
  if (typeof v.src !== 'string' || !isStorableSource(v.src)) return false
  if (v.name !== undefined && typeof v.name !== 'string') return false
  if (v.alt !== undefined && typeof v.alt !== 'string') return false
  if (v.w !== undefined && !Number.isFinite(v.w)) return false
  if (v.h !== undefined && !Number.isFinite(v.h)) return false
  return true
}

/** The pictures in one cell, in their stored order — which IS the
 *  primary: index 0 is the one that shows, so the order is data and
 *  must not be re-sorted or de-duplicated on the way in. */
const imageCell = (v: unknown[]): ImageRef[] =>
  v.filter(isImageRef).map((img) => ({
    id: img.id,
    src: img.src,
    ...(img.name !== undefined ? { name: img.name } : {}),
    ...(img.alt !== undefined ? { alt: img.alt } : {}),
    ...(img.w !== undefined ? { w: img.w } : {}),
    ...(img.h !== undefined ? { h: img.h } : {}),
  }))

const isCellValue = (v: unknown): v is CellValue =>
  v === null ||
  typeof v === 'string' ||
  typeof v === 'number' ||
  typeof v === 'boolean' ||
  Array.isArray(v)

const clampAccent = (v: unknown, fallback: AccentKey): AccentKey =>
  typeof v === 'string' && (ACCENT_KEYS as string[]).includes(v) ? (v as AccentKey) : fallback

const isFieldType = (v: unknown): v is FieldType =>
  typeof v === 'string' && Object.hasOwn(FIELD_TYPES, v)

/* WHAT A TABLE HOLDS AND WHAT IT IS. Both were dropped by every
   import before version 2, and neither is cosmetic: `kind` is what
   lets a fitment rule written against `boat` bite on Highfield and
   Stacer alike, and `role` is what keeps a join out of the module
   master picker. A value this build does not know is left ABSENT
   rather than guessed — the model reads an absent role as 'base',
   which is the safe default, and an absent kind as "no presets",
   which is merely plain. Guessing either would silently re-file the
   table as something it is not. */
const isTableKind = (v: unknown): v is TableKind =>
  typeof v === 'string' && Object.hasOwn(TABLE_KINDS, v)

const isTableRole = (v: unknown): v is TableRole =>
  v === 'base' || v === 'join' || v === 'view'

const isIndustryKey = (v: unknown): v is IndustryKey =>
  typeof v === 'string' && Object.hasOwn(INDUSTRIES, v)

const isModuleCapability = (v: unknown): v is ModuleCapability =>
  typeof v === 'string' && Object.hasOwn(MODULE_CAPABILITIES, v)

const isConstraintKind = (v: unknown): v is ConstraintKind =>
  v === 'implies' || v === 'excludes' || v === 'requires' || v === 'table'

/* Imported ids become object keys downstream (store keyed records,
   rowsByEntity, row.values, Dexie primary keys, run hit counters).
   A key colliding with Object.prototype ("__proto__", "constructor", …)
   silently corrupts those records — "__proto__" assignment even
   reassigns a prototype — and can permanently break startup, so ids are
   restricted to the nanoid charset minus prototype property names. */
export const isSafeId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v) && !(v in Object.prototype)

/* ============================================================
   THE COLUMN IDS THAT ARE MEANT TO REPEAT.

   `__origin`, `__recommended`, `__order`, `__uid` and
   `__discontinued` are CONSTANTS, not minted ids: every curated join
   carries the same three so a pair row can be read without a name
   lookup (`PAIR_FIELDS` in the model), and the model says so out loud.

   The file-wide uniqueness rule below did not know that, so it read
   the second join's `__origin` as a collision and REFUSED THE WHOLE
   FILE — "DUPLICATE ID __origin". Any project with two curated joins
   therefore exported a file it could never open again, and the real
   seed has several. Found by exporting the seed and importing it
   back, which is the one test nobody had run end to end.

   RUNNING THAT TEST AGAIN THROUGH THE RE-HUNG DOOR FOUND THE NEXT
   ONE. `__discontinued` is the same kind of constant and was missed:
   `isDiscontinued(row)` reads `row.values['__discontinued']` by that
   literal string on ANY table, so every table carrying the flag
   carries the same id BY CONTRACT — the seed has it on three
   (OBSOLETE Trailers, Parts & Accessories, Rigging Kits). Exporting
   the real seed and importing it back was rejected outright with
   "DUPLICATE ID __discontinued", which meant the demo project could
   be saved to a file and never opened again. Measured, not guessed:
   of 738 distinct column ids across the 52 seeded tables, exactly
   four repeat, and these are all four.

   The rule for ORDINARY column ids is unchanged and still enforced —
   a minted id on two tables is a damaged file, and the test named
   "still refuses an ordinary column id used on two tables" pins it.

   They still may not repeat WITHIN one table: two columns sharing an
   id in one table would shadow each other in every cell lookup. */
export const isWellKnownFieldId = (id: string): boolean =>
  isSystemFieldId(id) || isPairFieldId(id) || id === DISCONTINUED_FIELD_ID

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
/* table shape — the bands and the nesting                       */
/* ------------------------------------------------------------ */

/** The named bands of columns. A band with no NAME is dropped rather
 *  than given one: `buildSections` already draws a column whose
 *  `sectionId` nobody declared as a plain column, so the table still
 *  reads, and naming a band ourselves would put a word on screen that
 *  nobody in the business wrote. Ids are checked because a band id is
 *  a Map key in the section model and a Set key in the collapse
 *  state. */
function normSections(raw: unknown): ColumnSection[] {
  const out: ColumnSection[] = []
  const seen = new Set<string>()
  for (const s of arr(raw)) {
    if (!isRecord(s) || !isSafeId(s.id) || seen.has(s.id)) continue
    const name = str(s.name)?.trim()
    if (!name) continue
    seen.add(s.id)
    out.push({
      id: s.id,
      name,
      ...(typeof s.accent === 'string' && (ACCENT_KEYS as string[]).includes(s.accent)
        ? { accent: s.accent as AccentKey }
        : {}),
      ...(typeof s.collapsed === 'boolean' ? { collapsed: s.collapsed } : {}),
    })
  }
  return out
}

/** The grouping levels, outermost first — ordered ids of columns ON
 *  THIS TABLE. A level naming a column the file does not carry cannot
 *  group anything and would draw an empty tier in the grouped view, so
 *  it is dropped here rather than becoming a hole later. Order is
 *  meaning (Series ▸ Model ▸ Variant), so nothing is re-sorted. */
function normHierarchy(raw: unknown, fieldIds: ReadonlySet<string>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of arr(raw)) {
    if (!isSafeId(v) || seen.has(v) || !fieldIds.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

/* ------------------------------------------------------------ */
/* v2 — the organisation                                         */
/* ------------------------------------------------------------ */

/** Whose set this is. An organisation with no name is no
 *  organisation: the name is the only identity `OrgProfile` carries,
 *  it is the key the constraint registry is scoped by, and inventing
 *  one would put a business name on screen that nobody typed. */
function normOrg(raw: unknown, stamp: string): OrgProfile | undefined {
  if (!isRecord(raw)) return undefined
  const name = str(raw.name)?.trim()
  if (!name || !isIndustryKey(raw.industry)) return undefined
  return { name, industry: raw.industry, createdAt: str(raw.createdAt) ?? stamp }
}

/* ------------------------------------------------------------ */
/* v2 — view pages                                               */
/* ------------------------------------------------------------ */

/** Root, related, related-to-the-related. The authority is `MAX_DEPTH`
 *  in `@/features/views`; it is restated rather than imported so this
 *  validator keeps depending on the model and nothing else. A block
 *  deeper than this could be built by hand but never by the page, and
 *  `walkBlocks` would draw it below the level the layout allows for. */
const BLOCK_MAX_DEPTH = 3

/** What a block SHOWS right now — never what it relates. A filter
 *  naming a column that is not in the file narrows nothing and would
 *  read as "no rows match" with no way to see why, so it goes. */
function normColumnFilters(raw: unknown, fieldIds: ReadonlySet<string>): ColumnFilter[] {
  const out: ColumnFilter[] = []
  for (const f of arr(raw)) {
    if (!isRecord(f) || !isSafeId(f.fieldId) || !fieldIds.has(f.fieldId)) continue
    if (f.kind === 'values') {
      out.push({
        kind: 'values',
        fieldId: f.fieldId,
        selected: arr(f.selected).filter((s): s is string => typeof s === 'string'),
      })
      continue
    }
    if (f.kind === 'contains') {
      const text = str(f.text)
      if (text === undefined) continue
      out.push({ kind: 'contains', fieldId: f.fieldId, text })
    }
  }
  return out
}

/** One related table on a page.
 *
 *  A block whose TABLE is not in the file is dropped: the block IS the
 *  table, so there is nothing left to draw and a heading over nothing
 *  reads as a bug. A block whose JOIN table is missing keeps the
 *  block and loses the join — the relationship becomes "everything in
 *  that table" rather than the curated pairs, which is visibly wider
 *  rather than silently empty, and the page says so.
 *
 *  Block ids are made unique per page because they are React keys and
 *  `findBlock` returns the first match; they are deliberately NOT in
 *  the file-wide id namespace, since they never key a shared store
 *  record. */
function normBlocks(
  raw: unknown,
  depth: number,
  tableIds: ReadonlySet<string>,
  fieldIds: ReadonlySet<string>,
  seen: Set<string>,
): ViewBlock[] {
  if (depth > BLOCK_MAX_DEPTH) return []
  const out: ViewBlock[] = []
  for (const b of arr(raw)) {
    if (!isRecord(b)) continue
    if (!isSafeId(b.tableId) || !tableIds.has(b.tableId)) continue
    let id = safeIdOr(b.id, '')
    if (id === '' || seen.has(id)) id = newId()
    seen.add(id)

    const filters = b.filters !== undefined ? normColumnFilters(b.filters, fieldIds) : undefined
    const columns =
      b.columns !== undefined
        ? arr(b.columns).filter((c): c is string => isSafeId(c) && fieldIds.has(c))
        : undefined
    const children = normBlocks(b.children, depth + 1, tableIds, fieldIds, seen)

    out.push({
      id,
      tableId: b.tableId,
      ...(isSafeId(b.joinTableId) && tableIds.has(b.joinTableId)
        ? { joinTableId: b.joinTableId }
        : {}),
      ...(isRecord(b.rule) ? { rule: normClauseGroup(b.rule) } : {}),
      ...(filters ? { filters } : {}),
      ...(columns ? { columns } : {}),
      ...(children.length ? { children } : {}),
    })
  }
  return out
}

/** A page is "for" one table's rows. With that table gone there is no
 *  row to open it on and nothing for the blocks to hang off, so the
 *  page is dropped whole rather than imported as an empty shell. */
function normView(
  raw: unknown,
  stamp: string,
  tableIds: ReadonlySet<string>,
  fieldIds: ReadonlySet<string>,
): ViewDef | undefined {
  if (!isRecord(raw) || !isSafeId(raw.id)) return undefined
  if (!isSafeId(raw.rootTableId) || !tableIds.has(raw.rootTableId)) return undefined
  const root = raw.rootTableId
  return {
    id: raw.id,
    name: str(raw.name)?.trim() || 'View',
    rootTableId: root,
    blocks: normBlocks(raw.blocks, 2, tableIds, fieldIds, new Set()),
    createdAt: str(raw.createdAt) ?? stamp,
    updatedAt: str(raw.updatedAt) ?? stamp,
  }
}

/* ------------------------------------------------------------ */
/* v2 — modules                                                  */
/* ------------------------------------------------------------ */

/** A place in the business.
 *
 *  THE DECISION ON A DANGLING TABLE, stated once: a module's dead
 *  pointers are dropped and the module survives on whatever is left;
 *  a module with NOTHING left is dropped entirely. That is not a new
 *  rule, it is the one the rest of the app already keeps — `createModule`
 *  filters its `tableIds` the same way and `moduleTables` skips a table
 *  that has since been struck "rather than drawn as a hole". Importing
 *  the dead pointer instead would put a card on the dashboard that opens
 *  onto nothing, and a module is the thing a person navigates BY: an
 *  empty page reached through it reads as the product being broken.
 *
 *  A consequence worth naming: `tableIds[0]` is the primary, so a module
 *  whose primary alone is missing is imported with its SECOND table
 *  promoted. That is the smallest honest outcome — the alternative is
 *  discarding a module over one absent pointer.
 *
 *  `viewId` is different again. A module with no detail surface is a
 *  legitimate module — it lists but does not open — so a viewId naming
 *  a page that did not arrive is simply not carried. */
function normModule(
  raw: unknown,
  index: number,
  stamp: string,
  entities: ReadonlyMap<string, EntityDef>,
  viewIds: ReadonlySet<string>,
): ModuleDef | undefined {
  if (!isRecord(raw) || !isSafeId(raw.id)) return undefined

  const tableIds: string[] = []
  const seen = new Set<string>()
  for (const t of arr(raw.tableIds)) {
    if (!isSafeId(t) || seen.has(t) || !entities.has(t)) continue
    seen.add(t)
    tableIds.push(t)
  }
  if (tableIds.length === 0) return undefined
  const primary = entities.get(tableIds[0]) as EntityDef

  /* the key ABSENT means an older or damaged file said nothing, and
     the model's own answer to that is "look, do not touch". An empty
     ARRAY is a person having switched everything off, which is theirs
     to have done. */
  const capabilities = Array.isArray(raw.capabilities)
    ? (raw.capabilities as unknown[]).filter(isModuleCapability)
    : [...DEFAULT_CAPABILITIES]

  const index_: ModuleIndexMode = raw.index === 'tiles' ? 'tiles' : 'rows'

  return {
    id: raw.id,
    /* the module's own words first, then the primary table's name —
       both are the file's, and neither is invented here */
    name: str(raw.name)?.trim() || primary.name,
    description: str(raw.description)?.trim() ?? '',
    tableIds,
    capabilities: [...new Set(capabilities)],
    index: index_,
    ...(isSafeId(raw.viewId) && viewIds.has(raw.viewId) ? { viewId: raw.viewId } : {}),
    accent: clampAccent(raw.accent, primary.accent),
    order: num(raw.order, index),
    createdAt: str(raw.createdAt) ?? stamp,
    updatedAt: str(raw.updatedAt) ?? stamp,
  }
}

/* ------------------------------------------------------------ */
/* v2 — constraints                                              */
/* ------------------------------------------------------------ */

/** The approved combinations of a `table` constraint: field id → the
 *  allowed value. Keys are written into value maps downstream, so they
 *  are checked like any other id. */
function normCombinations(raw: unknown): Array<Record<string, CellValue>> {
  const out: Array<Record<string, CellValue>> = []
  for (const combo of arr(raw)) {
    if (!isRecord(combo)) continue
    const row: Record<string, CellValue> = {}
    for (const [fieldId, v] of Object.entries(combo)) {
      if (!isSafeId(fieldId)) continue
      if (Array.isArray(v)) continue /* a picture is not an approved value */
      if (isCellValue(v)) row[fieldId] = v
    }
    out.push(row)
  }
  return out
}

/** A business rule as a sentence.
 *
 *  A KIND THIS BUILD DOES NOT KNOW DROPS THE RULE. Everywhere else in
 *  this file an unreadable value is blanked so the thing still arrives
 *  and reports itself unfinished; here that would be dangerous, because
 *  `implies` and `excludes` are near-opposites — defaulting an unknown
 *  kind would import a rule that says the reverse of what was written
 *  and switch it on.
 *
 *  Field ids inside the clauses are NOT resolved against the file. A
 *  constraint names a COLUMN CONCEPT (kind + name) through one
 *  representative id, and `evaluateConstraint` already reports a rule
 *  whose columns are absent as unscoped rather than as satisfied. */
function normConstraint(raw: unknown, stamp: string): ConstraintDef | undefined {
  if (!isRecord(raw) || !isSafeId(raw.id)) return undefined
  if (!isConstraintKind(raw.kind)) return undefined
  const why = str(raw.why)
  const source = str(raw.source)
  return {
    id: raw.id,
    kind: raw.kind,
    if: normClauseGroup(raw.if),
    ...(isRecord(raw.then) ? { then: normClauseGroup(raw.then) } : {}),
    ...(raw.kind === 'table' && raw.combinations !== undefined
      ? { combinations: normCombinations(raw.combinations) }
      : {}),
    /* the reason printed after "because…". Blank when the file has
       none — the rule card shows its own prompt for that, and any
       sentence written here would read on screen as the business's */
    because: str(raw.because) ?? '',
    ...(why !== undefined ? { why } : {}),
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    ...(typeof raw.edited === 'boolean' ? { edited: raw.edited } : {}),
    ...(source !== undefined ? { source } : {}),
    ...(typeof raw.priority === 'number' && Number.isFinite(raw.priority)
      ? { priority: raw.priority }
      : {}),
    createdAt: str(raw.createdAt) ?? stamp,
    updatedAt: str(raw.updatedAt) ?? stamp,
  }
}

/* ------------------------------------------------------------ */
/* validateEnvelope                                              */
/* ------------------------------------------------------------ */

/** Versions this build can READ. A v1 file carries none of the v2 keys
 *  and every one of them is optional, so it opens as a project with no
 *  modules, no pages and no rules — which is exactly what it is. A file
 *  from a FUTURE version is still refused, because the failure that
 *  matters is opening a set and silently keeping half of it. */
const READABLE_VERSIONS: readonly number[] = [1, EXPORT_VERSION]

/** Defensive envelope check + normalisation. Never throws; anything that
 *  passes comes out shaped exactly like a native ProjectExport. */
export function validateEnvelope(raw: unknown): Validated {
  /* every message here is read by the user in the popover, so it stays in
     configurator words — tables, columns, rows — never the shape names the
     file format happens to use internally */
  if (!isRecord(raw)) return { ok: false, error: 'NOT A HELMLOGIC SHEET FILE' }
  if (raw.kind !== EXPORT_KIND)
    return { ok: false, error: 'NOT A HELMLOGIC SHEET FILE' }
  if (typeof raw.version !== 'number' || !READABLE_VERSIONS.includes(raw.version))
    return { ok: false, error: `SAVED BY A DIFFERENT VERSION — EXPECTED V${EXPORT_VERSION} OR OLDER` }
  if (!Array.isArray(raw.entities))
    return { ok: false, error: 'THIS FILE HAS NO TABLES IN IT' }
  if (raw.groups !== undefined && !Array.isArray(raw.groups))
    return { ok: false, error: 'FILE IS DAMAGED — BAD LAYOUT BLOCK' }
  if (raw.rules !== undefined && !Array.isArray(raw.rules))
    return { ok: false, error: 'FILE IS DAMAGED — BAD RULES BLOCK' }
  if (raw.rows !== undefined && !isRecord(raw.rows))
    return { ok: false, error: 'FILE IS DAMAGED — ROWS ARE NOT GROUPED BY TABLE' }
  /* the v2 blocks: a wrong SHAPE is a damaged file and is said so;
     an ABSENT one is a v1 file and is silence, not an error */
  if (raw.views !== undefined && !Array.isArray(raw.views))
    return { ok: false, error: 'FILE IS DAMAGED — BAD PAGES BLOCK' }
  if (raw.modules !== undefined && !Array.isArray(raw.modules))
    return { ok: false, error: 'FILE IS DAMAGED — BAD MODULES BLOCK' }
  if (raw.constraints !== undefined && !Array.isArray(raw.constraints))
    return { ok: false, error: 'FILE IS DAMAGED — BAD RULES BLOCK' }

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
    const seenInTable = new Set<string>()
    for (const f of e.fields as unknown[]) {
      if (!isRecord(f) || typeof f.id !== 'string' || typeof f.name !== 'string') {
        return { ok: false, error: `DAMAGED COLUMN IN TABLE "${e.name}"` }
      }
      if (!isSafeId(f.id)) return { ok: false, error: `UNSAFE COLUMN ID IN TABLE "${e.name}"` }
      /* a well-known column id is the SAME id on every table that has
         one, by design — so it is checked against this table only */
      if (isWellKnownFieldId(f.id)) {
        if (seenInTable.has(f.id))
          return { ok: false, error: `TABLE "${e.name}" HAS TWO "${f.name}" COLUMNS` }
      } else if (isDuplicate(f.id)) {
        return { ok: false, error: `DUPLICATE ID "${f.id}"` }
      }
      seenInTable.add(f.id)
      fields.push({
        id: f.id,
        name: f.name,
        type: isFieldType(f.type) ? f.type : 'text',
        ...(str(f.description) !== undefined ? { description: str(f.description) } : {}),
        ...(typeof f.required === 'boolean' ? { required: f.required } : {}),
        /* WHICH BAND THIS COLUMN IS IN. Dropped by every import before
           version 2, which is what turned a banded 59-column price
           sheet back into 59 undifferentiated columns on the way in.
           A band that was not declared draws the column plainly, so a
           surviving id that names nothing costs nothing. */
        ...(isSafeId(f.sectionId) ? { sectionId: f.sectionId } : {}),
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
    /* the four keys a round trip used to lose. `hierarchy` names
       columns ON THIS TABLE, so it is resolved against the fields
       just read rather than trusted. */
    const hierarchy = normHierarchy(
      e.hierarchy,
      new Set(fields.map((f) => f.id)),
    )
    const sections = normSections(e.sections)
    entities.push({
      id: e.id,
      name: e.name,
      ...(str(e.description) !== undefined ? { description: str(e.description) } : {}),
      accent: clampAccent(e.accent, ACCENT_KEYS[i % ACCENT_KEYS.length]),
      ...(isTableKind(e.kind) ? { kind: e.kind } : {}),
      ...(isTableRole(e.role) ? { role: e.role } : {}),
      /* A TABLE THAT IS HISTORY MUST STAY HISTORY. `retired` was the
         fifth key going quiet: dropped here, so exporting the seed and
         importing it back resurrected "OBSOLETE Trailers — No Longer
         Available" as live stock. Home counts 50 of the 52 tables for
         exactly this reason, and after a round trip it counted 52 —
         which is the app offering discontinued trailers to a customer
         because a file went out and came back. Only `true` is carried;
         anything else is a table that was never retired. */
      ...(e.retired === true ? { retired: true } : {}),
      ...(hierarchy.length ? { hierarchy } : {}),
      ...(sections.length ? { sections } : {}),
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
            /* An array cell is a picture cell, and every ImageRef in it
               is validated and rebuilt rather than trusted whole — an
               imported file may carry any shape and any scheme. A cell
               whose pictures are ALL refused becomes an empty array,
               not a dropped key: the column still holds a picture value,
               it just holds none, which is the truthful outcome. */
            if (!isSafeId(k)) continue
            if (Array.isArray(v)) values[k] = imageCell(v)
            else if (isCellValue(v)) values[k] = v
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

  /* -- v2: the design layer --------------------------------- */

  /* every pointer below is resolved against THESE, never against
     whatever the file claims — that is the whole of "referential
     sanity" and it is why a module cannot arrive aimed at nothing */
  const entityById = new Map(entities.map((e) => [e.id, e]))
  const tableIds: ReadonlySet<string> = new Set(entityById.keys())
  const fieldIds = new Set<string>()
  for (const e of entities) for (const f of e.fields) fieldIds.add(f.id)

  const org = normOrg(raw.org, stamp)

  const views: ViewDef[] = []
  for (const v of (raw.views ?? []) as unknown[]) {
    const view = normView(v, stamp, tableIds, fieldIds)
    if (!view) continue
    if (isDuplicate(view.id)) return { ok: false, error: `DUPLICATE ID "${view.id}"` }
    views.push(view)
  }
  const viewIds: ReadonlySet<string> = new Set(views.map((v) => v.id))

  const modules: ModuleDef[] = []
  ;((raw.modules ?? []) as unknown[]).forEach((m, i) => {
    const mod = normModule(m, i, stamp, entityById, viewIds)
    if (mod) modules.push(mod)
  })
  /* a duplicate module id would make two dashboard cards share one
     store record, so the second edit would silently move the first */
  for (const m of modules) {
    if (isDuplicate(m.id)) return { ok: false, error: `DUPLICATE ID "${m.id}"` }
  }

  const constraints: ConstraintDef[] = []
  for (const c of (raw.constraints ?? []) as unknown[]) {
    const constraint = normConstraint(c, stamp)
    if (!constraint) continue
    if (isDuplicate(constraint.id))
      return { ok: false, error: `DUPLICATE ID "${constraint.id}"` }
    constraints.push(constraint)
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
    /* omitted rather than empty: an absent key and an empty array mean
       the same thing to every reader, and the smaller file is the one
       a person can diff */
    ...(org ? { org } : {}),
    ...(views.length ? { views } : {}),
    ...(modules.length ? { modules } : {}),
    ...(constraints.length ? { constraints } : {}),
  }
  return { ok: true, data }
}
