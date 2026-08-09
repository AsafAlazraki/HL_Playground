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
   ============================================================ */

import { OUT_HANDLE } from '@/types/model'
import type {
  ActionOp,
  CellValue,
  Clause,
  ClauseGroup,
  EntityDef,
  FieldPath,
  GroupDef,
  ProjectExport,
  RowData,
  RuleDef,
  RuleEdge,
  RuleNode,
  ValueExpr,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { newId, nowIso } from '@/lib/id'
import { branchKey } from './envelope'

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
 *  Exported so any other loader that calls `replaceProject` can wrap
 *  itself the same way. */
export function keepingOrganisation(swap: () => void): void {
  const org = useProjectStore.getState().meta.org
  swap()
  if (org) useProjectStore.getState().setOrganisation(org.name, org.industry)
}

/* ------------------------------------------------------------ */
/* replace                                                       */
/* ------------------------------------------------------------ */

export function applyReplace(data: ProjectExport): void {
  keepingOrganisation(() => {
    useProjectStore.getState().replaceProject({
      name: data.project.name,
      rev: data.project.rev,
      entities: data.entities,
      groups: data.groups,
      rules: data.rules,
      rowsByEntity: data.rows ?? {},
    })
  })
}

/* ------------------------------------------------------------ */
/* merge — reference resolution                                  */
/* ------------------------------------------------------------ */

/** Every way an imported id can be looked up. Each returns `undefined`
 *  when the id belongs to nothing that exists after the merge. */
interface RefMaps {
  entity: (old: string | undefined) => string | undefined
  field: (old: string | undefined) => string | undefined
  group: (old: string | undefined) => string | undefined
  row: (old: CellValue) => CellValue
}

const BLANK_PATH: FieldPath = { fieldId: '' }

function remapPath(path: FieldPath | undefined, m: RefMaps): FieldPath {
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
function remapValue(expr: ValueExpr | undefined, m: RefMaps): ValueExpr | undefined {
  if (!expr) return undefined
  if (expr.kind === 'field') return { kind: 'field', path: remapPath(expr.path, m) }
  return expr
}

function remapGroup(group: ClauseGroup | undefined, m: RefMaps): ClauseGroup {
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
  m: RefMaps,
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
/* merge                                                         */
/* ------------------------------------------------------------ */

/** Merge: fresh ids for every imported entity / field / group / rule /
 *  rule node / condition branch / edge / row, remapped in one pass;
 *  entity and zone positions offset +80/+80. References that point
 *  outside the imported set survive only if the target exists in the
 *  current project; otherwise they are nulled. */
export function applyMerge(data: ProjectExport): void {
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

  /* pass 1 — remap entities + fields */
  const mergedEntities: EntityDef[] = data.entities.map((e) => ({
    ...e,
    id: idMap.get(e.id) as string,
    position: { x: (e.position?.x ?? 120) + 80, y: (e.position?.y ?? 120) + 80 },
    groupId: m.group(e.groupId),
    displayFieldId: m.field(e.displayFieldId),
    createdAt: e.createdAt ?? stamp,
    updatedAt: stamp,
    fields: e.fields.map((f) => ({
      ...f,
      id: idMap.get(f.id) as string,
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
    position: { x: (g.position?.x ?? 80) + 80, y: (g.position?.y ?? 80) + 80 },
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
        const nf = idMap.get(oldFieldId)
        if (!nf || !importedFieldIds.has(oldFieldId)) continue // cell for a field not in the imported schema
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
}
