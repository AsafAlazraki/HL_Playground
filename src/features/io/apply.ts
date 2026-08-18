/* ============================================================
   io/apply — putting a received set into the project.

   REPLACE hands the envelope straight to the store: ids are already
   the file's own, so nothing has to move.

   MERGE reissues every imported id and rewrites every reference to it
   in one pass. A rule is the deep end of that: it names ids in eight
   more places than the schema does — the rule itself, its nodes, its
   edges (source, target AND the sourceHandle, because a condition
   branch id IS its handle), its root entity, and the entity/field ids
   buried in each node's config. All of them move together, or the rule
   would come out of a merge running against the wrong columns.

   A reference that resolves to nothing — not in the imported set, not
   in the current project — is nulled to the model's own "unconfigured"
   sentinel ('' for an id, `{fieldId:''}` for a path) so `validateRule`
   reports a designed blocker. Nothing is ever left dangling, and no
   rule is silently loosened into matching more rows than it did.

   THE DESIGN LAYER LANDS THROUGH THE STORE'S OWN DOORS. `replaceProject`
   takes tables, zones, rules and rows and deliberately CLEARS views and
   modules — "a module surviving a swap is worse than a view surviving
   one, because a module is the thing a person navigates by". So the
   pages and the modules a file carries are put back AFTERWARDS, through
   `createView` / `updateView` / `createModule` / `updateModule`, which
   is also what keeps every derived thing (a module's detail surface, a
   view's idempotency by root table) consistent instead of hand-built.
   Constraints go home through `registerConstraints`, the seam their own
   registry exports for exactly this.

   AND THEY KEEP THEIR OWN IDS ON THE WAY BACK. Those two doors MINT, so
   for as long as the design layer went home through them unchanged, a
   restored page came back under a NEW id — and a quote keeps `viewId`
   among the exactly two ids it is allowed to keep (see
   features/quote/types.ts), so a dealer who restored a backup found
   every quote's "make another like this one" pointing at a page that no
   longer existed. Both doors now take a `keepId` that a RESTORE passes
   and a MERGE does not; `restoreDesign`'s `fresh` flag is the whole of
   that distinction, and the note there says why both answers are right.
   ============================================================ */

import { OUT_HANDLE } from '@/types/model'
import type { QuoteDef } from '@/features/quote'
import type {
  ActionOp,
  CellValue,
  Clause,
  ClauseGroup,
  ConstraintDef,
  EntityDef,
  FieldPath,
  GroupDef,
  OrgProfile,
  ProjectExport,
  RowData,
  RuleDef,
  RuleEdge,
  RuleNode,
  ValueExpr,
  ViewBlock,
  ViewDef,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { registerViewDef } from '@/features/views'
import { registerConstraints } from '@/features/constraints'
import { getQuote, registerQuote } from '@/features/quote'
import { forgetSeedStamp } from '@/demos/seedStamp'
import { newId, nowIso } from '@/lib/id'
import { branchKey, isWellKnownFieldId, type ProjectFile } from './envelope'

/* ------------------------------------------------------------ */
/* organisation guard                                            */
/* ------------------------------------------------------------ */

/** `replaceProject` rebuilds `meta` from scratch, so the organisation the
 *  whole app is gated on would be dropped by every import and every
 *  prepared set — the sheet would look destroyed and the user would be
 *  thrown back to "what's the name of your business?". Capture the
 *  organisation first, put it straight back after, and the swap is
 *  invisible: same business, same industry, new contents.
 *
 *  `incoming` is the organisation the FILE carries, and it is only ever
 *  a fallback: the business already on this machine wins, because a set
 *  sent over by a colleague must not rename the person opening it.
 *  It matters when there is none — an import into a shell that has not
 *  been through onboarding would otherwise land and immediately bounce
 *  the user back to "what's the name of your business?" while holding a
 *  file that already answers it.
 *
 *  Exported so any other loader that calls `replaceProject` can wrap
 *  itself the same way. */
export function keepingOrganisation(swap: () => void, incoming?: OrgProfile): void {
  const org = useProjectStore.getState().meta.org
  swap()
  const keep = org ?? incoming
  if (keep) useProjectStore.getState().setOrganisation(keep.name, keep.industry)
}

/* ------------------------------------------------------------ */
/* replace                                                       */
/* ------------------------------------------------------------ */

/* ============================================================
   THE QUOTES A FILE CARRIES — put back BY ID, on both paths.

   BY ID, and never reissued, which is what makes the trip a person
   actually takes work: export → clear the sheet → import returns
   exactly the documents that left, and doing it twice returns the same
   ones rather than two copies of each. Everything else in a merge is
   reissued because two tables with one id would fight over a store
   record; two quotes with one id are the SAME DOCUMENT, and a diary
   that doubles every time somebody re-imports their own backup is a
   diary nobody can count.

   A QUOTE ALREADY HERE IS LEFT ALONE. `registerQuote` would overwrite
   it, and the copy in this browser may be the newer one — a draft
   somebody has since typed a customer into, or an issued quote whose
   file predates the issue. Nothing in the envelope can tell which of
   two versions of one id is the later one (`updatedAt` is written by
   whichever machine touched it last, and clocks differ), so the rule
   is the same one `keepingOrganisation` keeps: what is on this machine
   wins, and a file only ever ADDS.

   NOTHING IS CLEARED FIRST, on a replace or a merge. A quote does not
   depend on the sheet — every figure on it is a value — so it survives
   both, and both confirm sheets say so in a sentence
   (`quotesSurviveSentence`).
   ============================================================ */

/** Register the file's quotes that are not already here. Returns how
 *  many arrived, which is what a toast could count. */
function restoreQuotes(quotes: QuoteDef[] | undefined): number {
  let added = 0
  for (const q of quotes ?? []) {
    if (getQuote(q.id)) continue
    registerQuote(q)
    added += 1
  }
  return added
}

export function applyReplace(data: ProjectFile): void {
  /* THE SHEET NOW CAME FROM A FILE, NOT FROM THE SEED. The stamp
     records which build of the prepared set THIS BROWSER was seeded
     with; a replace throws that sheet away, so the record goes with
     it, or the freshness notice would be answering a question about a
     project that is no longer open. See @/demos/seedStamp. */
  forgetSeedStamp()

  keepingOrganisation(() => {
    useProjectStore.getState().replaceProject({
      name: data.project.name,
      rev: data.project.rev,
      entities: data.entities,
      groups: data.groups,
      rules: data.rules,
      rowsByEntity: data.rows ?? {},
    })
  }, data.org)

  /* ids arrive unchanged on a replace, so a pointer is kept exactly
     when the thing it names actually came in the file. The envelope
     has already resolved these once; doing it again here costs
     nothing and means `applyReplace` cannot be broken by a caller
     handing it something the validator never saw. */
  const tables = new Set(data.entities.map((e) => e.id))
  const fields = new Set<string>()
  for (const e of data.entities) for (const f of e.fields) fields.add(f.id)
  restoreDesign(data, {
    entity: (old) => (old && tables.has(old) ? old : undefined),
    field: (old) => (old && fields.has(old) ? old : undefined),
  })
  restoreQuotes(data.quotes)
}

/* ------------------------------------------------------------ */
/* merge — reference resolution                                  */
/* ------------------------------------------------------------ */

/** The two lookups everything that names a table or a column needs.
 *  On a REPLACE they are identity-on-presence; on a MERGE they follow
 *  the reissued ids. Either way `undefined` means "this points at
 *  nothing that exists after the apply". */
interface DesignRefs {
  entity: (old: string | undefined) => string | undefined
  field: (old: string | undefined) => string | undefined
}

/** Every way an imported id can be looked up. Each returns `undefined`
 *  when the id belongs to nothing that exists after the merge. */
interface RefMaps extends DesignRefs {
  group: (old: string | undefined) => string | undefined
  row: (old: CellValue) => CellValue
}

const BLANK_PATH: FieldPath = { fieldId: '' }

function remapPath(path: FieldPath | undefined, m: DesignRefs): FieldPath {
  const fieldId = m.field(path?.fieldId)
  if (!fieldId) return { ...BLANK_PATH }
  if (path?.viaFieldId === undefined) return { fieldId }
  const viaFieldId = m.field(path.viaFieldId)
  /* the hop is what makes this "[Boat → Price]" rather than "[Price]" —
     if it cannot be followed the path is blanked, never flattened */
  if (!viaFieldId) return { ...BLANK_PATH }
  return { viaFieldId, fieldId }
}

/** literal + formula carry no ids: a literal is a plain cell value, and
 *  formula source names fields by NAME, which the merge does not change. */
function remapValue(expr: ValueExpr | undefined, m: DesignRefs): ValueExpr | undefined {
  if (!expr) return undefined
  if (expr.kind === 'field') return { kind: 'field', path: remapPath(expr.path, m) }
  return expr
}

function remapGroup(group: ClauseGroup | undefined, m: DesignRefs): ClauseGroup {
  const clauses: Clause[] = (group?.clauses ?? []).map((c) => {
    const right = remapValue(c?.right, m)
    return {
      id: newId(),
      left: remapPath(c?.left, m),
      op: c?.op ?? 'eq',
      ...(right ? { right } : {}),
    }
  })
  return { combinator: group?.combinator === 'OR' ? 'OR' : 'AND', clauses }
}

/** `values` on a create / link action is keyed by field id. A key that
 *  resolves nowhere is dropped — a map cannot hold two blank keys, so
 *  nulling them would silently collapse two columns into one. */
function remapValuesMap(
  values: Record<string, ValueExpr> | undefined,
  m: DesignRefs,
): Record<string, ValueExpr> {
  const out: Record<string, ValueExpr> = {}
  for (const [fieldId, expr] of Object.entries(values ?? {})) {
    const mapped = m.field(fieldId)
    if (!mapped) continue
    const value = remapValue(expr, m)
    if (value) out[mapped] = value
  }
  return out
}

function remapAction(action: ActionOp, m: RefMaps): ActionOp {
  switch (action.op) {
    case 'set':
      return {
        op: 'set',
        fieldId: m.field(action.fieldId) ?? '',
        value: remapValue(action.value, m) ?? { kind: 'literal', value: null },
      }
    case 'create':
      return {
        op: 'create',
        entityId: m.entity(action.entityId) ?? '',
        values: remapValuesMap(action.values, m),
      }
    case 'link':
      return {
        op: 'link',
        joinEntityId: m.entity(action.joinEntityId) ?? '',
        sourceFieldId: m.field(action.sourceFieldId) ?? '',
        matchFieldId: m.field(action.matchFieldId) ?? '',
        ...(action.values !== undefined
          ? { values: remapValuesMap(action.values, m) }
          : {}),
      }
    case 'flag':
      return { op: 'flag', label: action.label, tone: action.tone }
    default:
      return action
  }
}

function remapNode(
  node: RuleNode,
  nodeIds: Map<string, string>,
  branchIds: Map<string, string>,
  m: RefMaps,
): RuleNode {
  const id = nodeIds.get(node.id) ?? newId()
  const position = { x: node.position?.x ?? 0, y: node.position?.y ?? 0 }

  switch (node.kind) {
    case 'start':
      return { id, kind: 'start', position, config: {} }

    case 'match':
      return {
        id,
        kind: 'match',
        position,
        config: {
          targetEntityId: m.entity(node.config.targetEntityId) ?? '',
          group: remapGroup(node.config.group, m),
          emptyBehavior: node.config.emptyBehavior === 'passThrough' ? 'passThrough' : 'skip',
        },
      }

    case 'condition':
      return {
        id,
        kind: 'condition',
        position,
        config: {
          branches: (node.config.branches ?? []).map((b) => ({
            id: branchIds.get(branchKey(node.id, b.id)) ?? newId(),
            label: b.label,
            group: remapGroup(b.group, m),
          })),
        },
      }

    case 'filter':
      return { id, kind: 'filter', position, config: { group: remapGroup(node.config.group, m) } }

    case 'find':
      return {
        id,
        kind: 'find',
        position,
        config: { viaFieldId: m.field(node.config.viaFieldId) ?? '' },
      }

    case 'loop':
      return {
        id,
        kind: 'loop',
        position,
        config: {
          source:
            node.config.source?.kind === 'linked'
              ? { kind: 'linked', viaFieldId: m.field(node.config.source.viaFieldId) ?? '' }
              : {
                  kind: 'entity',
                  entityId: m.entity(
                    node.config.source?.kind === 'entity' ? node.config.source.entityId : undefined,
                  ) ?? '',
                },
        },
      }

    case 'action':
      return { id, kind: 'action', position, config: { action: remapAction(node.config.action, m) } }

    case 'output':
      return {
        id,
        kind: 'output',
        position,
        config: {
          label: node.config.label,
          ...(node.config.columns !== undefined
            ? {
                columns: node.config.columns.map((c) => ({
                  scope: c.scope,
                  fieldId: m.field(c.fieldId) ?? '',
                  ...(c.label !== undefined ? { label: c.label } : {}),
                })),
              }
            : {}),
        },
      }

    default:
      return node
  }
}

function remapRule(rule: RuleDef, m: RefMaps, stamp: string): RuleDef {
  const nodesIn: RuleNode[] = rule.nodes ?? []

  /* node ids and branch ids are allocated together, before anything is
     rewritten, because the edges need both maps at once */
  const nodeIds = new Map<string, string>()
  for (const n of nodesIn) nodeIds.set(n.id, newId())
  const branchIds = new Map<string, string>()
  for (const n of nodesIn) {
    if (n.kind !== 'condition') continue
    for (const b of n.config.branches ?? []) branchIds.set(branchKey(n.id, b.id), newId())
  }

  const edges: RuleEdge[] = []
  for (const e of rule.edges ?? []) {
    const source = nodeIds.get(e.source)
    const target = nodeIds.get(e.target)
    if (!source || !target) continue
    /* a handle that names a branch moves with that branch; 'out', 'else',
       'body' and 'next' belong to the graph and never move */
    const handle = e.sourceHandle ?? OUT_HANDLE
    edges.push({
      id: newId(),
      source,
      target,
      sourceHandle: branchIds.get(branchKey(e.source, handle)) ?? handle,
    })
  }

  return {
    ...rule,
    id: newId(),
    rootEntityId: m.entity(rule.rootEntityId) ?? '',
    nodes: nodesIn.map((n) => remapNode(n, nodeIds, branchIds, m)),
    edges,
    createdAt: rule.createdAt ?? stamp,
    updatedAt: stamp,
  }
}

/* ------------------------------------------------------------ */
/* the design layer — pages, modules, constraints                */
/* ------------------------------------------------------------ */

/** One related table on a page. A block whose table is gone is dropped
 *  — the block IS the table, and a heading over nothing reads as a bug
 *  rather than as an absence. A block whose JOIN is gone keeps the
 *  block and loses the curation: it then shows everything in that
 *  table, which is visibly wider rather than silently empty. */
function remapBlocks(blocks: ViewBlock[] | undefined, m: DesignRefs, fresh: boolean): ViewBlock[] {
  const out: ViewBlock[] = []
  for (const b of blocks ?? []) {
    const tableId = m.entity(b.tableId)
    if (!tableId) continue
    const joinTableId = b.joinTableId ? m.entity(b.joinTableId) : undefined
    const filters = b.filters
      ?.map((f) => {
        const fieldId = m.field(f.fieldId)
        return fieldId ? { ...f, fieldId } : undefined
      })
      .filter((f): f is NonNullable<typeof f> => f !== undefined)
    const columns = b.columns
      ?.map((c) => m.field(c))
      .filter((c): c is string => c !== undefined)
    const children = remapBlocks(b.children, m, fresh)
    out.push({
      id: fresh ? newId() : b.id,
      tableId,
      ...(joinTableId ? { joinTableId } : {}),
      ...(b.rule ? { rule: remapGroup(b.rule, m) } : {}),
      ...(filters ? { filters } : {}),
      ...(columns ? { columns } : {}),
      ...(children.length ? { children } : {}),
    })
  }
  return out
}

/** A constraint's clauses name columns, so a merge has to move them
 *  with everything else. A path that resolves nowhere is BLANKED, not
 *  guessed — `evaluateConstraint` then reports the rule as unscoped,
 *  which is the visible outcome, instead of a rule quietly asserting
 *  something about a different column. */
function remapConstraint(c: ConstraintDef, m: DesignRefs, stamp: string): ConstraintDef {
  const combinations = c.combinations?.map((combo) => {
    const out: Record<string, CellValue> = {}
    for (const [fieldId, v] of Object.entries(combo)) {
      const mapped = m.field(fieldId)
      if (mapped) out[mapped] = v
    }
    return out
  })
  return {
    ...c,
    id: newId(),
    if: remapGroup(c.if, m),
    ...(c.then ? { then: remapGroup(c.then, m) } : {}),
    ...(combinations ? { combinations } : {}),
    updatedAt: stamp,
  }
}

/**
 * Put the pages, the modules and the business rules a file carries
 * back into the app, after the tables they point at are in place.
 *
 * ORDER IS LOAD-BEARING, three times over.
 *
 *   PAGES FIRST, because `createModule` mints a detail surface for its
 *   primary table and `createView` is idempotent by root table — so a
 *   module made after its page finds that page instead of a second one.
 *
 *   MODULES SECOND, and then the pages are re-asserted, because
 *   `createModule` also fills an EMPTY page with one block per join.
 *   That is right for a module somebody is making now (the joins are
 *   written-down relationships, not a guess) and wrong for one arriving
 *   from a file: a page a person deliberately emptied has to come back
 *   empty.
 *
 *   CONSTRAINTS LAST, because the registry keys them by the CURRENT
 *   organisation and `keepingOrganisation` has only just decided what
 *   that is.
 *
 * Existing constraints are NOT cleared. They are scoped to the
 * organisation rather than to the sheet, the organisation survives a
 * replace by design, and a rule whose columns are not on the new sheet
 * reports itself unscoped rather than firing — so keeping them costs a
 * grey card, while clearing them would silently destroy authored rules
 * every time somebody opened an older file that carries none.
 */
function restoreDesign(
  design: Pick<ProjectExport, 'views' | 'modules' | 'constraints'>,
  m: DesignRefs,
  fresh = false,
): void {
  const store = () => useProjectStore.getState()
  const stamp = nowIso()

  /* -- pages ------------------------------------------------- */
  /** imported view id → the id the store actually gave it */
  const viewIdMap = new Map<string, string>()
  const restored: Array<{ id: string; name: string; blocks: ViewBlock[]; from: ViewDef }> = []

  for (const v of design.views ?? []) {
    const rootTableId = m.entity(v.rootTableId)
    /* a page is "for" one table's rows; with that table gone there is
       no row to open it on and nothing for its blocks to hang off */
    if (!rootTableId) continue
    const blocks = remapBlocks(v.blocks, m, fresh)
    /* A RESTORED PAGE KEEPS ITS OWN ID; A MERGED ONE MUST NOT.
       `fresh` is the whole distinction: on a replace this file IS the
       sheet, so every id in it is free and a page that came back under
       a new one would orphan every quote that names it (a quote keeps
       `viewId` — features/quote/types.ts). On a merge the same file is
       being added BESIDE work that is already here, and reissuing is
       the only thing that keeps two copies of one backup from
       colliding. So the id is offered on one path and withheld on the
       other, and `createView` refuses it anyway if it is taken. */
    const record = store().createView(rootTableId, v.name, fresh ? undefined : v.id)
    store().updateView(record.id, { name: v.name, blocks })
    viewIdMap.set(v.id, record.id)
    restored.push({ id: record.id, name: v.name, blocks, from: v })
  }

  /* -- modules ----------------------------------------------- */
  for (const mod of design.modules ?? []) {
    const tableIds = mod.tableIds
      .map((id) => m.entity(id))
      .filter((id): id is string => id !== undefined)
    /* every pointer dead means there is no list to draw, no primary to
       take a name from and nowhere for the card to lead — the module
       is not imported at all rather than imported broken */
    if (tableIds.length === 0) continue
    const made = store().createModule(
      tableIds,
      mod.name,
      mod.description,
      /* same rule as the page above — see the note there */
      fresh ? undefined : mod.id,
    )
    /* the store refuses a master that cannot be one (a join records
       pairs and is not a place to stand) — its rule, kept, not copied */
    if (!made) continue
    /* the page it named, on whatever id the store gave that page. With
       no page of its own it keeps the one `createModule` just minted —
       the store's own contract that a module can be opened, not a
       pointer invented here */
    const viewId = mod.viewId ? viewIdMap.get(mod.viewId) : undefined
    store().updateModule(made.id, {
      description: mod.description,
      capabilities: mod.capabilities,
      index: mod.index,
      accent: mod.accent,
      order: mod.order,
      ...(viewId ? { viewId } : {}),
    })
  }

  /* -- pages, re-asserted, and told to the page feature ------- */
  for (const r of restored) {
    store().updateView(r.id, { name: r.name, blocks: r.blocks })
    /* THE PAGE FEATURE KEEPS ITS OWN REGISTRY and the shell mirrors it
       into the store (`app/viewPersistence.ts`), hydrating ONCE at
       mount. A page that arrives long after that has to be handed to
       both, or the store holds a layout the stage never draws. It is
       registered under the STORE's id so the two agree on one. */
    registerViewDef({
      ...r.from,
      id: r.id,
      name: r.name,
      rootTableId: store().views[r.id]?.rootTableId ?? r.from.rootTableId,
      blocks: r.blocks,
      updatedAt: stamp,
    })
  }

  /* -- business rules ---------------------------------------- */
  const constraints = design.constraints ?? []
  if (constraints.length > 0) {
    registerConstraints(fresh ? constraints.map((c) => remapConstraint(c, m, stamp)) : constraints)
  }
}

/* ------------------------------------------------------------ */
/* merge                                                         */
/* ------------------------------------------------------------ */

/* ============================================================
   WHERE A MERGED SET LANDS.

   It used to land at +80/+80. That is smaller than a table node, so
   every imported table came down ON TOP of one already on the sheet,
   overlapping it by all but a corner — and because a merge is the one
   operation where the same set is routinely added to itself, the two
   copies sharing a name were also the two copies stacked on each
   other. The result reads as corruption rather than as an addition.

   So the imported block is placed CLEAR of everything already there,
   keeping its own internal layout intact: one rectangle of new work
   beside the old, which is what "add to sheet" means.
   ============================================================ */

/** Roughly what a table node occupies. It is the store's own spacing
 *  for a new table (`createTable` steps 560 across), not a measured
 *  box: the point is a gap that is obviously a gap. */
const TABLE_FOOTPRINT_W = 560
const MERGE_GUTTER = 160

function mergeOffsetX(
  current: { entities: Record<string, EntityDef>; groups: Record<string, GroupDef> },
  data: ProjectExport,
): number {
  let right = Number.NEGATIVE_INFINITY
  for (const e of Object.values(current.entities)) {
    right = Math.max(right, (e.position?.x ?? 0) + TABLE_FOOTPRINT_W)
  }
  for (const g of Object.values(current.groups)) {
    right = Math.max(right, (g.position?.x ?? 0) + (g.size?.w ?? 0))
  }
  /* an empty sheet is not a collision — the file keeps its own layout */
  if (right === Number.NEGATIVE_INFINITY) return 0

  let left = Number.POSITIVE_INFINITY
  for (const e of data.entities) left = Math.min(left, e.position?.x ?? 0)
  for (const g of data.groups) left = Math.min(left, g.position?.x ?? 0)
  if (left === Number.POSITIVE_INFINITY) return 0

  return Math.max(0, Math.round(right + MERGE_GUTTER - left))
}

/** Merge: fresh ids for every imported entity / field / group / rule /
 *  rule node / condition branch / edge / row / page / module /
 *  constraint, remapped in one pass; the imported block is placed clear
 *  of the sheet's right-hand edge. References that point outside the
 *  imported set survive only if the target exists in the current
 *  project; otherwise they are nulled. */
export function applyMerge(data: ProjectFile): void {
  const store = useProjectStore.getState()
  const cur = {
    meta: store.meta,
    entities: store.entities,
    groups: store.groups,
    rules: store.rules,
    rowsByEntity: store.rowsByEntity,
  }

  /* pass 0 — allocate fresh ids */
  const idMap = new Map<string, string>() // entities + fields + groups
  const rowIdMap = new Map<string, string>()
  /* which kind each imported id is, so an entity reference can never
     resolve onto a field that happened to be reissued */
  const importedEntityIds = new Set<string>()
  const importedFieldIds = new Set<string>()
  const importedGroupIds = new Set<string>()

  for (const g of data.groups) {
    idMap.set(g.id, newId())
    importedGroupIds.add(g.id)
  }
  for (const e of data.entities) {
    idMap.set(e.id, newId())
    importedEntityIds.add(e.id)
    for (const f of e.fields) {
      /* `__origin` / `__recommended` / `__order` are CONSTANTS, and
         `readPairs` finds them by their literal id. Reissuing one
         turns a curated join's pair columns into three anonymous
         columns — the pairing still shows in the grid and stops
         being readable by anything that asks for it. They keep their
         ids; nothing else in the merge does. */
      if (isWellKnownFieldId(f.id)) continue
      idMap.set(f.id, newId())
      importedFieldIds.add(f.id)
    }
  }
  const rowsIn = data.rows ?? {}
  for (const list of Object.values(rowsIn)) for (const r of list) rowIdMap.set(r.id, newId())

  const currentFieldIds = new Set<string>()
  for (const e of Object.values(cur.entities)) for (const f of e.fields) currentFieldIds.add(f.id)
  const currentRowIds = new Set<string>()
  for (const list of Object.values(cur.rowsByEntity))
    for (const r of list) currentRowIds.add(r.id)

  const m: RefMaps = {
    /* hasOwn, not truthiness — a prototype-named key ("constructor")
       must read as absent, not as an inherited hit */
    entity: (old) => {
      if (!old) return undefined
      if (importedEntityIds.has(old)) return idMap.get(old)
      return Object.hasOwn(cur.entities, old) ? old : undefined
    },
    field: (old) => {
      if (!old) return undefined
      /* a constant id resolves to itself on both sides of the merge */
      if (isWellKnownFieldId(old)) return old
      if (importedFieldIds.has(old)) return idMap.get(old)
      return currentFieldIds.has(old) ? old : undefined
    },
    group: (old) => {
      if (!old) return undefined
      if (importedGroupIds.has(old)) return idMap.get(old)
      return Object.hasOwn(cur.groups, old) ? old : undefined
    },
    row: (old) => {
      if (typeof old !== 'string' || old === '') return old
      const mapped = rowIdMap.get(old)
      if (mapped) return mapped
      return currentRowIds.has(old) ? old : null
    },
  }

  const stamp = nowIso()
  const dx = mergeOffsetX(cur, data)

  /* pass 1 — remap entities + fields */
  const mergedEntities: EntityDef[] = data.entities.map((e) => ({
    ...e,
    id: idMap.get(e.id) as string,
    position: { x: (e.position?.x ?? 120) + dx, y: e.position?.y ?? 120 },
    groupId: m.group(e.groupId),
    displayFieldId: m.field(e.displayFieldId),
    /* THE GROUPING LEVELS ARE FIELD IDS. `...e` carried `hierarchy`
       through unchanged, so after a merge every level named a column
       that no longer existed and the grouped view collapsed to flat —
       the same loss the envelope used to cause on the way in, arriving
       by a different door. A level that cannot be followed is dropped
       rather than left dangling. */
    ...(e.hierarchy
      ? {
          hierarchy: e.hierarchy
            .map((fid) => m.field(fid))
            .filter((fid): fid is string => fid !== undefined),
        }
      : {}),
    createdAt: e.createdAt ?? stamp,
    updatedAt: stamp,
    fields: e.fields.map((f) => ({
      ...f,
      id: isWellKnownFieldId(f.id) ? f.id : (idMap.get(f.id) as string),
      ...(f.refEntityId !== undefined ? { refEntityId: m.entity(f.refEntityId) } : {}),
      ...(f.type === 'reference' && f.defaultValue !== undefined
        ? { defaultValue: m.row(f.defaultValue) }
        : {}),
    })),
  }))

  /* pass 2 — remap groups */
  const mergedGroups: GroupDef[] = data.groups.map((g) => ({
    ...g,
    id: idMap.get(g.id) as string,
    position: { x: (g.position?.x ?? 80) + dx, y: g.position?.y ?? 80 },
    size: g.size ?? { w: 520, h: 380 },
  }))

  /* pass 3 — remap rows (field-id keys + reference cell values) */
  const mergedRowsByEntity: Record<string, RowData[]> = {}
  for (const [oldEntityId, list] of Object.entries(rowsIn)) {
    const newEntityId = idMap.get(oldEntityId)
    if (!newEntityId || !importedEntityIds.has(oldEntityId)) continue // rows for an entity not in the set
    const entity = mergedEntities.find((e) => e.id === newEntityId)
    if (!entity) continue
    const refFieldIds = new Set(
      entity.fields.filter((f) => f.type === 'reference').map((f) => f.id),
    )
    mergedRowsByEntity[newEntityId] = list.map((r) => {
      const values: Record<string, CellValue> = {}
      for (const [oldFieldId, v] of Object.entries(r.values)) {
        /* the same rule as the schema pass, or a curated pair row
           would arrive with its origin and order in dead columns */
        const nf = isWellKnownFieldId(oldFieldId)
          ? oldFieldId
          : importedFieldIds.has(oldFieldId)
            ? idMap.get(oldFieldId)
            : undefined
        if (!nf) continue // cell for a field not in the imported schema
        values[nf] = refFieldIds.has(nf) ? m.row(v) : v
      }
      return {
        id: rowIdMap.get(r.id) as string,
        entityId: newEntityId,
        values,
        createdAt: r.createdAt || stamp,
        updatedAt: stamp,
      }
    })
  }

  /* pass 4 — remap rules, all the way down into every node config */
  const mergedRules: RuleDef[] = data.rules.map((r) => remapRule(r, m, stamp))

  /* the sheet's own pages and modules, which `replaceProject` is about
     to clear — a merge adds, so they have to be put back beside the
     imported ones rather than swept up with the swap */
  const keptViews = Object.values(store.views)
  const keptModules = Object.values(store.modules)

  /* union with current work */
  const rowsUnion: Record<string, RowData[]> = { ...cur.rowsByEntity, ...mergedRowsByEntity }
  keepingOrganisation(() => {
    store.replaceProject({
      name: cur.meta.name,
      rev: cur.meta.exportCount,
      entities: [...Object.values(cur.entities), ...mergedEntities],
      groups: [...Object.values(cur.groups), ...mergedGroups],
      rules: [...Object.values(cur.rules), ...mergedRules],
      rowsByEntity: rowsUnion,
    })
  })

  /* the sheet's own design first, unchanged — its ids still resolve,
     because a merge keeps every table that was already here */
  const keepAsIs: DesignRefs = { entity: (id) => id, field: (id) => id }
  restoreDesign({ views: keptViews, modules: keptModules }, keepAsIs)
  /* then the imported design, on the reissued ids */
  restoreDesign(data, m, true)

  /* THE QUOTES KEEP THEIR OWN IDS THROUGH A MERGE, unlike everything
     above. Their row and view pointers therefore point at the ids the
     file used, which after a merge belong to nothing — and that is the
     honest outcome: a quote is a photograph, so it still prints every
     figure, and the two acts that need the pointers ("open this row",
     "make another quote like this one") already answer with a sentence
     rather than a wrong row when the id resolves to nothing. Reissuing
     them instead would mean a second import of the same backup filed a
     second copy of every document. */
  restoreQuotes(data.quotes)
}
