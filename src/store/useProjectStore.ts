import { create } from 'zustand'
import {
  ACCENT_KEYS,
  defaultRuleNodeConfig,
  OUT_HANDLE,
  PAIR_FIELDS,
  TABLE_KINDS,
  type AccentKey,
  type FieldType,
  type IndustryKey,
  type TableKind,
  type CellValue,
  type ColumnSection,
  type EntityDef,
  type FieldDef,
  type GroupDef,
  type ProjectMeta,
  type RowData,
  type RuleDef,
  type RuleEdge,
  type RuleNode,
  type RuleNodeConfigMap,
  type RuleNodeKind,
  type ViewDef,
  type ModuleDef,
  canBeModuleMaster,
  DEFAULT_CAPABILITIES,
  type XY,
} from '@/types/model'
import { defaultMeta, repository, type ProjectSnapshot } from '@/db/repository'
import { newId, nowIso } from '@/lib/id'

export interface Selection {
  kind: 'entity' | 'group' | 'rule'
  id: string
}

export type InspectorTab = 'schema' | 'data'

interface ProjectStore {
  loaded: boolean
  meta: ProjectMeta
  entities: Record<string, EntityDef>
  groups: Record<string, GroupDef>
  rules: Record<string, RuleDef>
  /** rows keyed by entityId, insertion-ordered */
  rowsByEntity: Record<string, RowData[]>
  selection: Selection | null
  inspectorTab: InspectorTab

  /* lifecycle */
  init: () => Promise<void>
  setProjectName: (name: string) => void
  /** increments REV (called on export); returns the new rev number */
  bumpExportCount: () => number
  /** wipes the whole project from memory and disk */
  resetProject: () => Promise<void>
  /** wholesale replace (import). rowsByEntity may be omitted to keep schema only */
  replaceProject: (data: {
    name: string
    rev?: number
    entities: EntityDef[]
    groups: GroupDef[]
    rules: RuleDef[]
    rowsByEntity?: Record<string, RowData[]>
  }) => void
  /** current full snapshot (used by persistence + export) */
  snapshot: () => ProjectSnapshot

  /* selection */
  select: (sel: Selection | null) => void
  setInspectorTab: (tab: InspectorTab) => void

  /* onboarding */
  setOrganisation: (name: string, industry: IndustryKey) => void

  /** Create a table from a kind + structure preset: builds the hierarchy
   *  columns, then the kind's detail columns, resolving `linkTo` columns
   *  against tables that already exist (omitted when none does). */
  createTable: (args: {
    kind: TableKind
    structureId: string
    name?: string
    position?: XY
  }) => EntityDef

  /* entities */
  createEntity: (partial?: {
    name?: string
    position?: XY
    accent?: AccentKey
  }) => EntityDef
  updateEntity: (
    id: string,
    patch: Partial<Omit<EntityDef, 'id' | 'fields' | 'createdAt'>>,
  ) => void
  moveEntity: (id: string, position: XY) => void
  deleteEntity: (id: string) => void

  /* fields */
  /** `id` may be supplied for well-known system columns (the pair columns
   *  on a join); omit it for everything else and one is generated. */
  addField: (
    entityId: string,
    partial?: Partial<Omit<FieldDef, 'id'>> & { id?: string },
  ) => FieldDef | null

  /** Ensure a join table carries the three curated-pair columns
   *  (origin · recommended · order) with their well-known ids, so the
   *  pairing is editable in the grid like any other table. Idempotent. */
  ensureJoinPairColumns: (joinEntityId: string) => void
  updateField: (
    entityId: string,
    fieldId: string,
    patch: Partial<Omit<FieldDef, 'id'>>,
  ) => void
  removeField: (entityId: string, fieldId: string) => void
  /** move a field up (-1) or down (+1) in the schema */
  moveField: (entityId: string, fieldId: string, dir: -1 | 1) => void

  /* groups */
  createGroup: (partial?: {
    name?: string
    position?: XY
    size?: { w: number; h: number }
    accent?: AccentKey
  }) => GroupDef
  updateGroup: (id: string, patch: Partial<Omit<GroupDef, 'id'>>) => void
  deleteGroup: (id: string) => void
  assignEntityToGroup: (entityId: string, groupId: string | undefined) => void

  /* rows */
  addRow: (entityId: string, values?: Record<string, CellValue>) => RowData | null
  updateCell: (entityId: string, rowId: string, fieldId: string, value: CellValue) => void
  deleteRow: (entityId: string, rowId: string) => void

  /* rules */
  createRule: (rootEntityId: string, name?: string) => RuleDef
  updateRule: (id: string, patch: Partial<Omit<RuleDef, 'id' | 'createdAt'>>) => void
  deleteRule: (id: string) => void

  /* views — the configurable "what goes with this?" pages */
  views: Record<string, ViewDef>
  /** Idempotent: asking twice for the same root table returns the same
   *  view rather than a duplicate. */
  createView: (rootTableId: string, name?: string) => ViewDef
  updateView: (id: string, patch: Partial<Omit<ViewDef, 'id' | 'createdAt'>>) => void
  deleteView: (id: string) => void

  /* modules — the places in the business an admin makes for their org */
  modules: Record<string, ModuleDef>
  /** Three clicks: a table, a name, create. Everything else is derived
   *  from the table and tuned later, so a module works before it is
   *  configured. Also mints the detail view page, so opening an item
   *  works on the first click rather than after a second setup step. */
  createModule: (tableIds: string[], name?: string, description?: string) => ModuleDef | null
  updateModule: (id: string, patch: Partial<Omit<ModuleDef, 'id' | 'createdAt'>>) => void
  deleteModule: (id: string) => void

  /** which rule the canvas is currently drawing (UI state — not persisted) */
  activeRuleId: string | null
  setActiveRule: (id: string | null) => void

  /* rule graph editing */
  addRuleNode: <K extends RuleNodeKind>(
    ruleId: string,
    kind: K,
    position: XY,
  ) => RuleNode | null
  updateRuleNodeConfig: (
    ruleId: string,
    nodeId: string,
    config: RuleNodeConfigMap[RuleNodeKind],
  ) => void
  moveRuleNode: (ruleId: string, nodeId: string, position: XY) => void
  /** also removes every edge touching the node */
  deleteRuleNode: (ruleId: string, nodeId: string) => void
  /** rejects self-links and duplicates on the same handle; returns the edge */
  connectRuleNodes: (
    ruleId: string,
    conn: { source: string; target: string; sourceHandle?: string },
  ) => RuleEdge | null
  deleteRuleEdge: (ruleId: string, edgeId: string) => void

  /** Creates a join entity between two entities: a reference field to each,
   *  plus a text label field. Returns it along with the two field ids so a
   *  'link' action can be wired immediately. */
  createJoinEntity: (
    aEntityId: string,
    bEntityId: string,
    name?: string,
  ) => { entity: EntityDef; aFieldId: string; bFieldId: string } | null
}

/* -- persistence: debounced write-behind -------------------- */
let persistTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist(get: () => ProjectStore) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void repository.saveAll(get().snapshot())
  }, 400)
}

const touch = <T extends { updatedAt: string }>(obj: T): T => ({
  ...obj,
  updatedAt: nowIso(),
})

export const useProjectStore = create<ProjectStore>()((set, get) => {
  /** wrap a mutation so it also stamps meta.updatedAt and persists */
  const mutate = (fn: (s: ProjectStore) => Partial<ProjectStore>) => {
    set((s) => {
      const patch = fn(s)
      // stamp updatedAt on whichever meta survives — the patch's if the
      // mutation replaced it, the current one otherwise
      return { ...patch, meta: touch(patch.meta ?? s.meta) }
    })
    schedulePersist(get)
  }

  return {
    loaded: false,
    meta: defaultMeta(),
    entities: {},
    groups: {},
    rules: {},
    rowsByEntity: {},
    views: {},
    modules: {},
    selection: null,
    inspectorTab: 'schema',

    /* -- lifecycle ---------------------------------------- */
    init: async () => {
      const snap = await repository.load()
      if (snap) {
        const rowsByEntity: Record<string, RowData[]> = {}
        for (const row of snap.rows) {
          ;(rowsByEntity[row.entityId] ??= []).push(row)
        }
        for (const list of Object.values(rowsByEntity)) {
          list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        }
        set({
          loaded: true,
          meta: snap.meta,
          entities: Object.fromEntries(snap.entities.map((e) => [e.id, e])),
          groups: Object.fromEntries(snap.groups.map((g) => [g.id, g])),
          rules: Object.fromEntries(snap.rules.map((r) => [r.id, r])),
          rowsByEntity,
          /* `views` is a v2 store — a project saved before it existed
             loads with none, which is the correct empty state */
          views: Object.fromEntries((snap.views ?? []).map((v) => [v.id, v])),
          modules: Object.fromEntries((snap.modules ?? []).map((m) => [m.id, m])),
        })
      } else {
        set({ loaded: true, meta: defaultMeta() })
      }
    },

    setProjectName: (name) => {
      mutate((s) => ({ meta: { ...s.meta, name: name.trim() || s.meta.name } }))
    },

    bumpExportCount: () => {
      const rev = get().meta.exportCount + 1
      mutate((s) => ({ meta: { ...s.meta, exportCount: rev } }))
      return rev
    },

    resetProject: async () => {
      if (persistTimer) clearTimeout(persistTimer)
      persistTimer = null
      await repository.wipe()
      set({
        meta: defaultMeta(),
        entities: {},
        groups: {},
        rules: {},
        rowsByEntity: {},
        views: {},
        modules: {},
        selection: null,
      })
    },

    replaceProject: (data) => {
      mutate(() => ({
        meta: {
          id: 'default',
          name: data.name,
          exportCount: data.rev ?? 0,
          updatedAt: nowIso(),
        },
        entities: Object.fromEntries(data.entities.map((e) => [e.id, e])),
        groups: Object.fromEntries(data.groups.map((g) => [g.id, g])),
        rules: Object.fromEntries(data.rules.map((r) => [r.id, r])),
        rowsByEntity: data.rowsByEntity ?? {},
        /* A SWAP REPLACES THE WHOLE PROJECT, so anything pointing INTO
           the old one goes with it. Views and modules both hold table
           ids; an import or a demo load used to leave the previous
           project's pages behind, bound to tables that no longer exist,
           and the persistence layer then wrote them back out as if they
           belonged to the incoming set. A module surviving a swap is
           worse than a view surviving one, because a module is the
           thing a person navigates by — they would arrive somewhere
           that cannot draw. */
        views: {},
        modules: {},
        selection: null,
      }))
    },

    snapshot: () => {
      const s = get()
      return {
        meta: s.meta,
        entities: Object.values(s.entities),
        groups: Object.values(s.groups),
        rules: Object.values(s.rules),
        rows: Object.values(s.rowsByEntity).flat(),
        views: Object.values(s.views),
        modules: Object.values(s.modules),
      }
    },

    /* -- selection ---------------------------------------- */
    select: (sel) => set({ selection: sel }),
    setInspectorTab: (tab) => set({ inspectorTab: tab }),

    /* -- onboarding --------------------------------------- */
    setOrganisation: (name, industry) => {
      mutate((s) => ({
        meta: {
          ...s.meta,
          name: name.trim() || s.meta.name,
          org: { name: name.trim(), industry, createdAt: nowIso() },
        },
      }))
    },

    createTable: ({ kind, structureId, name, position }) => {
      const s0 = get()
      const meta = TABLE_KINDS[kind]
      const preset =
        meta.structures.find((p) => p.id === structureId) ?? meta.structures[0]

      /* hierarchy columns first, in nesting order — they are what the
         grouped view collapses on, so their order IS the structure */
      const hierarchyFields: FieldDef[] = preset.levels.map((level) => ({
        id: newId(),
        name: level,
        type: 'text' as FieldType,
        required: true,
      }))

      const detailFields: FieldDef[] = []
      for (const col of meta.detailColumns) {
        if (col.linkTo) {
          /* a link column is only meaningful once its target exists;
             otherwise it would be a dangling reference on a brand-new table */
          const target = Object.values(s0.entities).find((e) => e.kind === col.linkTo)
          if (!target) continue
          detailFields.push({
            id: newId(),
            name: col.name,
            type: 'reference',
            refEntityId: target.id,
          })
          continue
        }
        detailFields.push({
          id: newId(),
          /* the business writes units INTO the value ('52 cm', '105 ltr');
             carrying the unit in the column name instead lets the cell hold
             a clean number and still say what it means */
          name: col.unit ? `${col.name} ${col.unit}` : col.name,
          type: col.type,
          ...(col.options ? { options: col.options } : {}),
          ...(col.section ? { sectionId: col.section } : {}),
        })
      }

      const fields = [...hierarchyFields, ...detailFields]
      /* the deepest hierarchy level names a row ("540"); with no hierarchy
         the first column does */
      const displayFieldId =
        hierarchyFields.length > 0
          ? hierarchyFields[hierarchyFields.length - 1].id
          : fields[0]?.id

      const count = Object.keys(s0.entities).length
      /* only ship the bands that actually have a column in them — an empty
         "Markups" header over nothing reads as a bug */
      const usedSections = new Set(detailFields.map((f) => f.sectionId).filter(Boolean))
      const sections: ColumnSection[] = (meta.sections ?? [])
        .filter((s) => usedSections.has(s.id))
        .map((s) => ({ id: s.id, name: s.name, ...(s.accent ? { accent: s.accent } : {}) }))

      const entity: EntityDef = {
        id: newId(),
        name: name?.trim() || meta.label,
        kind,
        role: 'base',
        hierarchy: hierarchyFields.map((f) => f.id),
        ...(sections.length ? { sections } : {}),
        accent: meta.accent,
        fields,
        displayFieldId,
        position: position ?? { x: 120 + (count % 3) * 560, y: 120 + Math.floor(count / 3) * 420 },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }

      mutate((s) => ({
        entities: { ...s.entities, [entity.id]: entity },
        selection: { kind: 'entity', id: entity.id },
      }))
      return entity
    },

    /* -- entities ----------------------------------------- */
    createEntity: (partial) => {
      const count = Object.keys(get().entities).length
      const entity: EntityDef = {
        id: newId(),
        name: partial?.name?.trim() || `Entity ${count + 1}`,
        accent: partial?.accent ?? ACCENT_KEYS[count % ACCENT_KEYS.length],
        fields: [
          { id: newId(), name: 'Name', type: 'text', required: true },
        ],
        position: partial?.position ?? { x: 120 + (count % 5) * 60, y: 120 + (count % 5) * 48 },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      mutate((s) => ({
        entities: { ...s.entities, [entity.id]: entity },
        selection: { kind: 'entity', id: entity.id },
        inspectorTab: 'schema',
      }))
      return entity
    },

    updateEntity: (id, patch) => {
      mutate((s) => {
        const e = s.entities[id]
        if (!e) return {}
        return { entities: { ...s.entities, [id]: touch({ ...e, ...patch }) } }
      })
    },

    moveEntity: (id, position) => {
      mutate((s) => {
        const e = s.entities[id]
        if (!e) return {}
        return { entities: { ...s.entities, [id]: { ...e, position } } }
      })
    },

    deleteEntity: (id) => {
      mutate((s) => {
        const entities: Record<string, EntityDef> = {}
        for (const [eid, e] of Object.entries(s.entities)) {
          if (eid === id) continue
          // cascade: drop reference fields that point at the deleted entity
          const kept = e.fields.filter((f) => !(f.type === 'reference' && f.refEntityId === id))
          entities[eid] = kept.length === e.fields.length ? e : touch({ ...e, fields: kept })
        }
        const rowsByEntity = { ...s.rowsByEntity }
        delete rowsByEntity[id]
        const rules: Record<string, RuleDef> = {}
        for (const [rid, r] of Object.entries(s.rules)) {
          if (r.rootEntityId !== id) rules[rid] = r
        }
        return {
          entities,
          rowsByEntity,
          rules,
          selection: s.selection?.kind === 'entity' && s.selection.id === id ? null : s.selection,
        }
      })
    },

    /* -- fields ------------------------------------------- */
    addField: (entityId, partial) => {
      const e = get().entities[entityId]
      if (!e) return null
      /* an explicit id is only for well-known system columns; a clash
         would silently shadow an existing column, so refuse it */
      if (partial?.id && e.fields.some((f) => f.id === partial.id)) return null
      const field: FieldDef = {
        ...partial,
        id: partial?.id ?? newId(),
        name: partial?.name?.trim() || `Field ${e.fields.length + 1}`,
        type: partial?.type ?? 'text',
      }
      mutate((s) => ({
        entities: {
          ...s.entities,
          [entityId]: touch({ ...s.entities[entityId], fields: [...s.entities[entityId].fields, field] }),
        },
      }))
      return field
    },

    ensureJoinPairColumns: (joinEntityId) => {
      const e = get().entities[joinEntityId]
      if (!e) return
      const missing = PAIR_FIELDS.filter((p) => !e.fields.some((f) => f.id === p.id))
      if (missing.length === 0) return
      mutate((s) => {
        const cur = s.entities[joinEntityId]
        if (!cur) return {}
        const added: FieldDef[] = missing.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          sectionId: 'pairing',
        }))
        const sections = cur.sections?.some((sec) => sec.id === 'pairing')
          ? cur.sections
          : [...(cur.sections ?? []), { id: 'pairing', name: 'Pairing', accent: 'graphite' as AccentKey }]
        return {
          entities: {
            ...s.entities,
            [joinEntityId]: touch({ ...cur, fields: [...cur.fields, ...added], sections }),
          },
        }
      })
    },

    updateField: (entityId, fieldId, patch) => {
      mutate((s) => {
        const e = s.entities[entityId]
        if (!e) return {}
        const prev = e.fields.find((f) => f.id === fieldId)
        if (!prev) return {}
        const typeChanged = patch.type !== undefined && patch.type !== prev.type
        const fields = e.fields.map((f) => {
          if (f.id !== fieldId) return f
          const next: FieldDef = { ...f, ...patch }
          if (typeChanged) {
            // stale config from the old type must not linger
            if (next.type !== 'select') delete next.options
            if (next.type !== 'reference') delete next.refEntityId
            if (next.type !== 'formula') delete next.formula
            delete next.defaultValue
          }
          return next
        })
        // a type change invalidates stored cell values for that field
        let rowsByEntity = s.rowsByEntity
        if (typeChanged && s.rowsByEntity[entityId]?.length) {
          rowsByEntity = {
            ...s.rowsByEntity,
            [entityId]: s.rowsByEntity[entityId].map((r) => {
              if (!(fieldId in r.values)) return r
              const values = { ...r.values }
              delete values[fieldId]
              return touch({ ...r, values })
            }),
          }
        }
        return { entities: { ...s.entities, [entityId]: touch({ ...e, fields }) }, rowsByEntity }
      })
    },

    removeField: (entityId, fieldId) => {
      mutate((s) => {
        const e = s.entities[entityId]
        if (!e) return {}
        const fields = e.fields.filter((f) => f.id !== fieldId)
        const rowsByEntity = s.rowsByEntity[entityId]?.length
          ? {
              ...s.rowsByEntity,
              [entityId]: s.rowsByEntity[entityId].map((r) => {
                if (!(fieldId in r.values)) return r
                const values = { ...r.values }
                delete values[fieldId]
                return { ...r, values }
              }),
            }
          : s.rowsByEntity
        const displayFieldId = e.displayFieldId === fieldId ? undefined : e.displayFieldId
        return {
          entities: { ...s.entities, [entityId]: touch({ ...e, fields, displayFieldId }) },
          rowsByEntity,
        }
      })
    },

    moveField: (entityId, fieldId, dir) => {
      mutate((s) => {
        const e = s.entities[entityId]
        if (!e) return {}
        const i = e.fields.findIndex((f) => f.id === fieldId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= e.fields.length) return {}
        const fields = [...e.fields]
        ;[fields[i], fields[j]] = [fields[j], fields[i]]
        return { entities: { ...s.entities, [entityId]: touch({ ...e, fields }) } }
      })
    },

    /* -- groups ------------------------------------------- */
    createGroup: (partial) => {
      const count = Object.keys(get().groups).length
      const group: GroupDef = {
        id: newId(),
        name: partial?.name?.trim() || `Zone ${count + 1}`,
        accent: partial?.accent ?? ACCENT_KEYS[(count + 3) % ACCENT_KEYS.length],
        position: partial?.position ?? { x: 80 + count * 50, y: 80 + count * 50 },
        size: partial?.size ?? { w: 520, h: 380 },
      }
      mutate((s) => ({ groups: { ...s.groups, [group.id]: group } }))
      return group
    },

    updateGroup: (id, patch) => {
      mutate((s) => {
        const g = s.groups[id]
        if (!g) return {}
        return { groups: { ...s.groups, [id]: { ...g, ...patch } } }
      })
    },

    deleteGroup: (id) => {
      mutate((s) => {
        const groups = { ...s.groups }
        delete groups[id]
        const entities: Record<string, EntityDef> = {}
        for (const [eid, e] of Object.entries(s.entities)) {
          entities[eid] = e.groupId === id ? { ...e, groupId: undefined } : e
        }
        return {
          groups,
          entities,
          selection: s.selection?.kind === 'group' && s.selection.id === id ? null : s.selection,
        }
      })
    },

    assignEntityToGroup: (entityId, groupId) => {
      mutate((s) => {
        const e = s.entities[entityId]
        if (!e || e.groupId === groupId) return {}
        return { entities: { ...s.entities, [entityId]: { ...e, groupId } } }
      })
    },

    /* -- rows --------------------------------------------- */
    addRow: (entityId, values) => {
      const e = get().entities[entityId]
      if (!e) return null
      const defaults: Record<string, CellValue> = {}
      for (const f of e.fields) {
        if (f.type === 'formula') continue
        if (values && f.id in values) {
          defaults[f.id] = values[f.id]
        } else if (f.defaultValue !== undefined) {
          defaults[f.id] = f.defaultValue
        }
      }
      const row: RowData = {
        id: newId(),
        entityId,
        values: defaults,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      mutate((s) => ({
        rowsByEntity: {
          ...s.rowsByEntity,
          [entityId]: [...(s.rowsByEntity[entityId] ?? []), row],
        },
      }))
      return row
    },

    updateCell: (entityId, rowId, fieldId, value) => {
      mutate((s) => {
        const list = s.rowsByEntity[entityId]
        if (!list) return {}
        return {
          rowsByEntity: {
            ...s.rowsByEntity,
            [entityId]: list.map((r) =>
              r.id === rowId ? touch({ ...r, values: { ...r.values, [fieldId]: value } }) : r,
            ),
          },
        }
      })
    },

    deleteRow: (entityId, rowId) => {
      mutate((s) => {
        const list = s.rowsByEntity[entityId]
        if (!list) return {}
        return {
          rowsByEntity: {
            ...s.rowsByEntity,
            [entityId]: list.filter((r) => r.id !== rowId),
          },
        }
      })
    },

    /* -- rules -------------------------------------------- */
    createRule: (rootEntityId, name) => {
      const count = Object.keys(get().rules).length
      const rule: RuleDef = {
        id: newId(),
        name: name?.trim() || `Rule ${count + 1}`,
        rootEntityId,
        enabled: true,
        nodes: [{ id: newId(), kind: 'start', position: { x: 60, y: 60 }, config: {} }],
        edges: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      mutate((s) => ({ rules: { ...s.rules, [rule.id]: rule } }))
      return rule
    },

    updateRule: (id, patch) => {
      mutate((s) => {
        const r = s.rules[id]
        if (!r) return {}
        return { rules: { ...s.rules, [id]: touch({ ...r, ...patch }) } }
      })
    },

    /* -- views -------------------------------------------- */
    createView: (rootTableId, name) => {
      const existing = Object.values(get().views).find((v) => v.rootTableId === rootTableId)
      if (existing) return existing
      const root = get().entities[rootTableId]
      const view: ViewDef = {
        id: newId(),
        name: name?.trim() || `${root?.name ?? 'Table'} view`,
        rootTableId,
        blocks: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      mutate((s) => ({ views: { ...s.views, [view.id]: view } }))
      return view
    },

    updateView: (id, patch) => {
      mutate((s) => {
        const v = s.views[id]
        if (!v) return {}
        return { views: { ...s.views, [id]: touch({ ...v, ...patch }) } }
      })
    },

    deleteView: (id) => {
      mutate((s) => {
        const views = { ...s.views }
        delete views[id]
        return { views }
      })
    },

    /* -- modules ------------------------------------------------ */


    createModule: (tableIds, name, description) => {
      const clean = tableIds.filter((id) => {
        const e = get().entities[id]
        return e !== undefined && canBeModuleMaster(e)
      })
      if (clean.length === 0) return null
      const primary = get().entities[clean[0]]

      /* THE DETAIL SURFACE IS MINTED WITH THE MODULE, not on first open.
         A module whose items cannot be opened until somebody visits a
         second screen is a module that looks broken for one click, and
         createView is idempotent by contract — a table that already has
         a view keeps it rather than gaining a second. */
      const view = get().createView(clean[0])

      const order = Object.values(get().modules).length
      const mod: ModuleDef = {
        id: newId(),
        name: name?.trim() || primary.name,
        description: description?.trim() || primary.description?.trim() || '',
        tableIds: clean,
        capabilities: [...DEFAULT_CAPABILITIES],
        /* a table carrying pictures is a catalogue and wants tiles;
           everything else is a list somebody scans */
        index: primary.fields.some((f) => f.type === 'image') ? 'tiles' : 'rows',
        viewId: view.id,
        accent: primary.accent,
        order,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      mutate((s) => ({ modules: { ...s.modules, [mod.id]: mod } }))
      return mod
    },

    updateModule: (id, patch) => {
      mutate((s) => {
        const m = s.modules[id]
        if (!m) return {}
        return { modules: { ...s.modules, [id]: touch({ ...m, ...patch }) } }
      })
    },

    deleteModule: (id) => {
      mutate((s) => {
        const modules = { ...s.modules }
        delete modules[id]
        return { modules }
      })
    },

    activeRuleId: null,
    setActiveRule: (id) => set({ activeRuleId: id }),

    addRuleNode: (ruleId, kind, position) => {
      const rule = get().rules[ruleId]
      if (!rule) return null
      const node = {
        id: newId(),
        kind,
        position,
        config: defaultRuleNodeConfig(kind),
      } as RuleNode
      mutate((s) => ({
        rules: {
          ...s.rules,
          [ruleId]: touch({ ...s.rules[ruleId], nodes: [...s.rules[ruleId].nodes, node] }),
        },
      }))
      return node
    },

    updateRuleNodeConfig: (ruleId, nodeId, config) => {
      mutate((s) => {
        const r = s.rules[ruleId]
        if (!r) return {}
        const nodes = r.nodes.map((n) =>
          n.id === nodeId ? ({ ...n, config } as RuleNode) : n,
        )
        return { rules: { ...s.rules, [ruleId]: touch({ ...r, nodes }) } }
      })
    },

    moveRuleNode: (ruleId, nodeId, position) => {
      mutate((s) => {
        const r = s.rules[ruleId]
        if (!r) return {}
        const nodes = r.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n))
        return { rules: { ...s.rules, [ruleId]: { ...r, nodes } } }
      })
    },

    deleteRuleNode: (ruleId, nodeId) => {
      mutate((s) => {
        const r = s.rules[ruleId]
        if (!r) return {}
        return {
          rules: {
            ...s.rules,
            [ruleId]: touch({
              ...r,
              nodes: r.nodes.filter((n) => n.id !== nodeId),
              edges: r.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            }),
          },
        }
      })
    },

    connectRuleNodes: (ruleId, conn) => {
      const r = get().rules[ruleId]
      if (!r) return null
      if (conn.source === conn.target) return null // no self-loops
      const handle = conn.sourceHandle ?? OUT_HANDLE
      // one edge per source handle: reconnecting a handle replaces the old edge
      const duplicate = r.edges.find(
        (e) =>
          e.source === conn.source &&
          e.target === conn.target &&
          (e.sourceHandle ?? OUT_HANDLE) === handle,
      )
      if (duplicate) return duplicate
      const edge: RuleEdge = {
        id: newId(),
        source: conn.source,
        target: conn.target,
        sourceHandle: handle,
      }
      mutate((s) => ({
        rules: {
          ...s.rules,
          [ruleId]: touch({
            ...s.rules[ruleId],
            edges: [
              ...s.rules[ruleId].edges.filter(
                (e) => !(e.source === conn.source && (e.sourceHandle ?? OUT_HANDLE) === handle),
              ),
              edge,
            ],
          }),
        },
      }))
      return edge
    },

    deleteRuleEdge: (ruleId, edgeId) => {
      mutate((s) => {
        const r = s.rules[ruleId]
        if (!r) return {}
        return {
          rules: {
            ...s.rules,
            [ruleId]: touch({ ...r, edges: r.edges.filter((e) => e.id !== edgeId) }),
          },
        }
      })
    },

    createJoinEntity: (aEntityId, bEntityId, name) => {
      const s0 = get()
      const a = s0.entities[aEntityId]
      const b = s0.entities[bEntityId]
      if (!a || !b) return null
      const aFieldId = newId()
      const bFieldId = newId()
      const labelFieldId = newId()
      const count = Object.keys(s0.entities).length
      const entity: EntityDef = {
        id: newId(),
        /* a join is self-identifying — nothing downstream should have to
           guess what this table is by counting its reference columns */
        role: 'join',
        name: name?.trim() || `${a.name} ${b.name}`,
        description: `Joins ${a.name} to ${b.name}. Values recorded here belong to the pairing, not to either side on its own.`,
        accent: ACCENT_KEYS[count % ACCENT_KEYS.length],
        fields: [
          { id: labelFieldId, name: 'Label', type: 'text' },
          { id: aFieldId, name: a.name, type: 'reference', refEntityId: a.id, required: true },
          { id: bFieldId, name: b.name, type: 'reference', refEntityId: b.id, required: true },
        ],
        displayFieldId: labelFieldId,
        // offset so it lands between its two parents rather than on top of one
        position: {
          x: Math.round((a.position.x + b.position.x) / 2),
          y: Math.round((a.position.y + b.position.y) / 2) + 220,
        },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      mutate((s) => ({
        entities: { ...s.entities, [entity.id]: entity },
        selection: { kind: 'entity', id: entity.id },
      }))
      return { entity, aFieldId, bFieldId }
    },

    deleteRule: (id) => {
      mutate((s) => {
        const rules = { ...s.rules }
        delete rules[id]
        return {
          rules,
          selection: s.selection?.kind === 'rule' && s.selection.id === id ? null : s.selection,
        }
      })
    },
  }
})
