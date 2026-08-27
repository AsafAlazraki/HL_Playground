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
  type ViewBlock,
  type ModuleDef,
  type RoleDef,
  canBeModuleMaster,
  DEFAULT_CAPABILITIES,
  type XY,
} from '@/types/model'
import { defaultMeta, repository, type ProjectSnapshot } from '@/db/repository'
/* A LEAF, ON PURPOSE. `@/lib/writeGate` imports nothing at all, so
   the store can read it without the layering inversion a
   `@/features/session` import would be — the feature sets the flag,
   the store reads it, and neither knows the other exists. */
import { noteRefusedWrite, writesHeld } from '@/lib/writeGate'
/* DIRECT PATH, DELIBERATELY. `@/features/views` is the feature's barrel and
   pulls React surfaces and this very store back in; `relations.ts` imports
   neither, which is what makes it safe here. Same precedent and same reason
   as src/features/modules/read.ts. */
import { defaultBlocksFor } from '@/features/views/relations'
/* THE SAME PRECEDENT ONE MORE TIME. One module verb — `configure`,
   "set what must always be true here" — is held in a browser-local
   registry rather than on `ModuleDef.capabilities`, because
   `ModuleCapability` is a closed union in a file this session does not
   own (see src/features/modules/ruleCapability.ts, which writes down
   the exact line the contract wants). `ruleCapability.ts` imports
   `react` and nothing else: no barrel, no surface, not this store. So
   the wipe below can reach it, and a wiped project cannot come back
   with the last one's most consequential write switched on. */
import { forgetModuleRuleCapabilities } from '@/features/modules/ruleCapability'
/* AND ONE READER FOR THE FACE A NEW MODULE IS BORN WITH. By direct
   path for the same reason `defaultBlocksFor` is above: `read.ts`
   knows about no React surface and must not drag one back in through
   the feature's barrel. */
import { moduleFace } from '@/features/modules/read'
import { newId, nowIso } from '@/lib/id'

export interface Selection {
  kind: 'entity' | 'group' | 'rule'
  id: string
}

export type InspectorTab = 'schema' | 'data'

/* ============================================================
   UNDO — history over the DATA, and over nothing else.

   WHAT IT COVERS, and why exactly this line. A cell edit committed
   silently and permanently; Ctrl+Z did nothing; the store had no
   history key at all. The rule drawn here is:

     A STEP IS RECORDED WHEN THE ACT DESTROYS SOMETHING A PERSON
     CANNOT SEE ANY MORE.

   Cell edits, add/delete row, add/rename/retype/reorder/delete
   column, add/delete table, and paste — those are the acts where a
   dealership's real price file loses work. Every one of them is
   recorded.

   WHAT IT DELIBERATELY DOES NOT COVER, and why. Where a table sits
   on the blueprint (`moveEntity`), where a zone sits or how big it
   is (`updateGroup`), where a rule node sits (`moveRuleNode`),
   what is selected, which stage is open, which section is folded.
   None of those destroy anything: the drawing is on screen, and a
   drag is re-draggable in the second it took to make. Recording
   them is how an undo stack becomes useless — fifty entries deep in
   scroll positions, with the cell edit you actually wanted back
   pushed off the bottom. "Undo" has never meant "un-scroll".

   THE NEXT RING IS IN, AND IT IS EXACTLY THE DESTRUCTIVE HALF OF IT.
   The paragraph that stood here said rules and zones were "the
   obvious next ring — the machinery below takes them with one
   `record()` call each when somebody decides they belong", and what
   decided it was the last four `window.confirm` calls in the app.
   Every one of them guarded a delete, and a native modal in front of
   an act the store can already put back is the wrong instrument
   twice: it breaks the drawing office's visual language, and it asks
   a question whose answer is a keystroke away. So four acts joined
   the stack — delete a rule, delete a step, delete a wire, delete a
   zone — and the confirms became notes with UNDO on them (rule 9).

   The line held is the same line: only DESTRUCTION is recorded.
   Renaming a rule, switching one off, retyping a step's config, and
   dragging a plate or a zone around are all still out — nothing
   about them is invisible a second later, and a fifty-deep stack
   full of them is how undo stops being worth pressing. `rules`,
   `groups` and `entities` were already in the slice below, so each
   of the four is genuinely one `record()` call: nothing about the
   time-travel machinery had to change to admit them.

   Views and modules stay out. They are configuration surfaces whose
   own doors ask in the app's voice, and no `window.confirm` was
   hiding in either.

   ONE ACT IS ONE STEP. A paste is forty `updateCell` calls and a
   dozen `addRow`s; deleting eight selected rows is eight
   `deleteRow`s; applying a structure preset is a run of field
   moves. The call sites for those live in files this session does
   not own, so the grouping cannot be a `transact()` wrapper they
   opt into — it is done HERE, by noticing that every one of them is
   a single synchronous loop inside one event handler. All the
   recording that happens in one turn of the event loop collapses
   into one entry, closed on the following microtask. A second
   keypress is a second turn, so it is a second step.

   TYPED TEXT IS ALSO ONE STEP. A few surfaces write on every
   keystroke (a table's description box, a column's option list), so
   an op may carry a coalescing `key`: consecutive single-op steps
   with the same key, inside TYPING_MS, fold into the one that is
   already on the stack — which keeps its original `before`, so
   undoing gives back the whole word rather than its last letter.

   THE STACK IS BOUNDED AT 50. Say the number and defend it: fifty
   is past anything a person holds in their head, and it is what
   bounds the memory. The entries are cheap because the state is
   immutable and structurally shared — an entry keeps six object
   references, and the only thing it actually retains is whatever
   that step replaced. A cell edit retains one row array (651
   pointers, ~5 KB); the expensive step is a column retype, which
   rewrites every row object on the table (~130 KB on the largest
   seeded table). Fifty of the worst case is single-digit megabytes
   with a hard ceiling; unbounded history over 651 rows of image
   cells is a leak with a nice name.

   A PROJECT SWAP CLEARS BOTH STACKS. `replaceProject` (import, a
   demo set, the sample), `resetProject` and `init` are not steps —
   they are a different project. Undoing into a project that is no
   longer open would restore tables the views and modules on screen
   have never heard of, and each swap left on the stack would pin a
   whole previous workbook in memory. A new document has no past.
   ============================================================ */

/** the six maps history restores — everything that is project DATA.
 *  `meta`, `selection` and `inspectorTab` are deliberately not in it. */
type DataSlice = Pick<
  ProjectStore,
  'entities' | 'groups' | 'rules' | 'rowsByEntity' | 'views' | 'modules' | 'roles'
>

export interface HistoryEntry {
  /** what a person would call it — "40 cell edits · Boats" */
  label: string
  /** the data as it stood BEFORE this step */
  before: DataSlice
  /** coalescing identity, or '' for a step that never merges */
  sig: string
  /** when it was recorded, for the typing window */
  at: number
}

/** One recorded act, in the words the toast will use. */
interface Op {
  /** singular form: "Cell edit", "Row deleted" */
  one: string
  /** plural form when a burst held several of exactly this op */
  many?: (n: number) => string
  /** the table it happened in, resolved BEFORE the mutation ran */
  where?: string
  /** set only for per-keystroke writes — see TYPING_MS above */
  key?: string
}

/** See the defence above. Fifty steps, hard ceiling. */
export const HISTORY_DEPTH = 50
/** consecutive same-key steps closer together than this are one step */
const TYPING_MS = 900

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

  /* undo — oldest first, so the last element is the next step back */
  past: HistoryEntry[]
  future: HistoryEntry[]
  /** Reverts the last recorded change and returns its label, so the
   *  caller can SAY what was undone. null when there was nothing. */
  undo: () => string | null
  /** Puts back the last undone change; null when there was nothing.
   *  The redo stack is cleared by any new recorded change. */
  redo: () => string | null

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

  /** ONE TABLE, COLUMNS AND ROWS TOGETHER, IN ONE STEP.
   *
   *  `createTable` builds a table from a KIND — the preset knows the
   *  columns before the data does. This is the other direction: the
   *  FILE knows the columns, and the columns and the rows arrive at
   *  the same instant because they were read from the same read.
   *
   *  Written as one action rather than a createTable + n addField +
   *  m addRow for two reasons, and both are behaviour, not tidiness.
   *  A half-made table cannot exist — 2,913 rows landing one at a
   *  time is 2,913 renders and 2,913 chances to be interrupted with
   *  a table on the sheet that has columns and no data. And ONE
   *  Ctrl+Z takes the whole import back, which is what rule 9 asks
   *  of an act this large: it is undoable, so it gets a toast, not a
   *  dialog.
   *
   *  `rows` is aligned to `columns`, positionally. `null` is an empty
   *  cell and is not stored. */
  importTable: (spec: {
    name: string
    kind: TableKind
    columns: Array<{ name: string; type: FieldType; options?: string[] }>
    /** one entry per row, each aligned to `columns` */
    rows: CellValue[][]
    /** index into `columns` of the column that names a row */
    nameColumn?: number
    position?: XY
  }) => EntityDef | null

  /* entities */
  /** `keepId` IS FOR WELL-KNOWN TABLES, AND FOR NOTHING ELSE — the
   *  same arrangement, and the same words, `createView` and
   *  `createModule` below already carry. One table in a project can
   *  be the CUSTOMER REGISTER, and the thing that says which is its
   *  id, because an id is the only part of a table a person cannot
   *  change by accident: rename it, re-order it, add six columns and
   *  delete four, and it is still the register. It is IGNORED when a
   *  table already holds that id, so asking twice never replaces the
   *  one that is there. Everything a person creates gets a fresh
   *  `newId()` and must keep doing so. */
  createEntity: (partial?: {
    keepId?: string
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
  /**
   * Idempotent: asking twice for the same root table returns the same
   * view rather than a duplicate.
   *
   * `keepId` IS FOR RESTORING, AND FOR NOTHING ELSE. A page that comes
   * back out of a file is the same page it was when it went in — a
   * quote keeps `viewId` among the two ids it is allowed to keep
   * (features/quote/types.ts), so a page minted a new id on the way
   * home would leave every quote's "make another like this one"
   * pointing at nothing. Ignored when it is already taken, so a caller
   * can never fuse two pages into one by asking for an id twice.
   */
  createView: (rootTableId: string, name?: string, keepId?: string) => ViewDef
  updateView: (id: string, patch: Partial<Omit<ViewDef, 'id' | 'createdAt'>>) => void
  deleteView: (id: string) => void

  /* modules — the places in the business an admin makes for their org */
  modules: Record<string, ModuleDef>
  /** Three clicks: a table, a name, create. Everything else is derived
   *  from the table and tuned later, so a module works before it is
   *  configured. Also mints the detail view page, so opening an item
   *  works on the first click rather than after a second setup step. */
  createModule: (
    tableIds: string[],
    name?: string,
    description?: string,
    /** the id to keep when this module is being RESTORED from a file —
     *  see `createView`'s note. Ignored when it is already taken. */
    keepId?: string,
  ) => ModuleDef | null
  updateModule: (id: string, patch: Partial<Omit<ModuleDef, 'id' | 'createdAt'>>) => void
  deleteModule: (id: string) => void

  /* ============================================================
     ROLES — the named jobs at the dealership.

     THEY ARE DATA, AND NOTHING SEEDS THEM. There are no roles until
     somebody writes one down, because the app cannot know whether a
     yard runs on one person or on nine, and a plausible-sounding
     "Salesperson" nobody asked for is a fact about their business
     this app invented. A module with no `access` is unrestricted;
     that is the state every project is in until an admin decides
     otherwise.

     A ROLE SAYS NOTHING ON ITS OWN. It becomes real only where a
     module grants it capabilities — see `ModuleDef.access` and
     `@/features/modules/access`.
     ============================================================ */
  roles: Record<string, RoleDef>
  /** `keepId` is for restoring one, and follows `createView`'s rule:
   *  ignored when the id is already taken. Returns null for an empty
   *  name — a role nobody can point at is not a role. */
  createRole: (name: string, description?: string, keepId?: string) => RoleDef | null
  updateRole: (id: string, patch: Partial<Omit<RoleDef, 'id' | 'createdAt'>>) => void
  /** Takes the role off every module's access list in the same step,
   *  so one Ctrl+Z puts the job AND its grants back together. A
   *  dangling roleId would otherwise read on screen as a grant to
   *  nobody. */
  deleteRole: (id: string) => void

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

/* ============================================================
   PERSISTENCE — debounced write-behind, WITH A CEILING.

   THE DEBOUNCE. A quarter of a second of quiet and the sheet is on
   disk. Unchanged, and it is the right instrument: nobody wants a
   write per keystroke.

   THE CEILING IS NEW, AND IT IS A CORRECTNESS FIX. A pure debounce
   starves under continuous input — reset on every mutation, it never
   fires while somebody is actually typing, so a long spell of work
   sits entirely in memory until they stop. The failure that hides
   behind that is the one this app can least afford: a tab closed, a
   crash, a reload, and everything since the last pause is gone.

   So a burst may defer the write, but not for ever: `PERSIST_MAX_MS`
   after the FIRST unwritten change the sheet is written whatever is
   still happening. Two seconds is chosen against the debounce it
   guards — five debounce windows, so ordinary typing never reaches it
   and a sustained one reaches it repeatedly.

   IT IS AFFORDABLE NOW AND WAS NOT BEFORE. A mid-burst flush used to
   mean re-writing the whole project (measured: 10,539ms at 10,698
   rows) and would have made typing worse, not safer. With the
   differential write in `repository.ts` a flush costs the records
   that actually changed — one row for one cell — so the ceiling
   is a few milliseconds of work that a person cannot feel.
   ============================================================ */
const PERSIST_DEBOUNCE_MS = 400
const PERSIST_MAX_MS = 2000

let persistTimer: ReturnType<typeof setTimeout> | null = null
/** when the oldest change still unwritten was made; 0 when none */
let unwrittenSince = 0

function schedulePersist(get: () => ProjectStore) {
  const now = Date.now()
  if (unwrittenSince === 0) unwrittenSince = now
  if (persistTimer) clearTimeout(persistTimer)
  /* whichever comes first: a quarter-second of quiet, or the ceiling
     measured from the first change in this burst */
  const wait = Math.max(
    0,
    Math.min(PERSIST_DEBOUNCE_MS, unwrittenSince + PERSIST_MAX_MS - now),
  )
  persistTimer = setTimeout(() => {
    persistTimer = null
    unwrittenSince = 0
    void repository.saveAll(get().snapshot())
  }, wait)
}

const touch = <T extends { updatedAt: string }>(obj: T): T => ({
  ...obj,
  updatedAt: nowIso(),
})

const sliceOf = (s: ProjectStore): DataSlice => ({
  entities: s.entities,
  groups: s.groups,
  rules: s.rules,
  rowsByEntity: s.rowsByEntity,
  views: s.views,
  modules: s.modules,
  roles: s.roles,
})

/** "Row deleted · Trailers" · "40 cell edits · Boats" · "12 changes" */
function labelFor(ops: Op[]): string {
  const first = ops[0]
  const where = ops.every((o) => o.where === first.where) ? first.where : undefined
  const body =
    ops.length === 1
      ? first.one
      : ops.every((o) => o.one === first.one) && first.many
        ? first.many(ops.length)
        : `${ops.length} changes`
  return where ? `${body} · ${where}` : body
}

/** two cell values that are the same value. Two distinct arrays are
 *  never assumed equal — a picture list is re-ordered in place by
 *  building a new one, and calling that "unchanged" would lose it. */
const cellUnchanged = (a: CellValue | undefined, b: CellValue): boolean =>
  a === b || (a == null && b == null)

export const useProjectStore = create<ProjectStore>()((set, get) => {
  /** wrap a mutation so it also stamps meta.updatedAt and persists */
  const mutate = (fn: (s: ProjectStore) => Partial<ProjectStore>) => {
    /* THE TWO-TAB GUARD, AT THE ONE SEAM EVERY CHANGE PASSES THROUGH.
       Two tabs on one IndexedDB both hold the whole project and both
       write it back; the last flush wins and the other tab's work is
       gone with no error anywhere. So exactly one tab may change the
       sheet, the tabs agree which one over a BroadcastChannel
       (`@/features/session`), and the other one declines here rather
       than accepting an edit it is never going to keep.

       DECLINED, NOT UNSAVED. Blocking only the flush would let a
       person type for an hour into a tab that keeps none of it —
       the same loss, later, with more of it. And the refusal is
       COUNTED, because a control that silently does nothing is the
       failure DESIGN_PRINCIPLES rule 10 exists to prevent: the
       count is what the notice on screen turns into a sentence. */
    if (writesHeld()) {
      noteRefusedWrite()
      return
    }
    set((s) => {
      const patch = fn(s)
      // stamp updatedAt on whichever meta survives — the patch's if the
      // mutation replaced it, the current one otherwise
      return { ...patch, meta: touch(patch.meta ?? s.meta) }
    })
    schedulePersist(get)
  }

  /* -- history: one turn of the event loop is one step ---------- */

  /** ops recorded so far in the open burst */
  let burstOps: Op[] = []
  /** the data as it stood before the FIRST of them */
  let burstBefore: DataSlice | null = null
  /** bumped whenever a burst closes, so a microtask queued for a burst
   *  that has already been flushed by hand finds itself stale */
  let burstSeq = 0

  const closeBurst = () => {
    burstSeq += 1
    const before = burstBefore
    const ops = burstOps
    burstBefore = null
    burstOps = []
    if (!before || ops.length === 0) return

    const at = Date.now()
    /* only a lone per-keystroke op can continue the step above it */
    const sig = ops.length === 1 ? (ops[0].key ?? '') : ''
    set((s) => {
      const top = s.past[s.past.length - 1]
      const merge = sig !== '' && top?.sig === sig && at - top.at < TYPING_MS
      const past = merge
        ? [...s.past.slice(0, -1), { ...top, at }]
        : [...s.past, { label: labelFor(ops), before, sig, at }].slice(-HISTORY_DEPTH)
      /* ANY new change clears redo. Everyone expects it; nobody says it. */
      return { past, future: [] }
    })
  }

  /** Note what is about to happen. MUST be called before the mutation
   *  runs — the pre-state and the table's name are read from `get()`. */
  const record = (op: Op) => {
    if (burstBefore === null) {
      burstBefore = sliceOf(get())
      const seq = burstSeq
      queueMicrotask(() => {
        if (seq === burstSeq) closeBurst()
      })
    }
    burstOps.push(op)
  }

  /** the name to print beside a step, read before the act */
  const nameOf = (entityId: string): string | undefined => get().entities[entityId]?.name

  /** a swap is not a step — see the header */
  const forgetHistory = () => {
    burstSeq += 1
    burstOps = []
    burstBefore = null
  }

  /** shared by undo and redo: swap the live data for `entry.before`,
   *  hand the current data to the opposite stack, persist. */
  const travel = (dir: 'undo' | 'redo'): string | null => {
    /* Undo writes to the disk too (see the note beside its
       `schedulePersist` below), so it is gated with everything else.
       Returning null is the same answer this already gives when
       there is nothing on the stack, and the caller draws no toast. */
    if (writesHeld()) {
      noteRefusedWrite()
      return null
    }
    closeBurst() // anything still open belongs on the stack first
    const s = get()
    const from = dir === 'undo' ? s.past : s.future
    const entry = from[from.length - 1]
    if (!entry) return null
    const mirror: HistoryEntry = { ...entry, before: sliceOf(s) }
    const rest = from.slice(0, -1)
    const onto = [...(dir === 'undo' ? s.future : s.past), mirror].slice(-HISTORY_DEPTH)

    /* A SELECTION MUST NOT OUTLIVE ITS SUBJECT. Undoing "table added"
       strikes the table the inspector is pointing at; leaving the id
       behind is how a panel draws a rectangle with nothing in it. */
    const sel = s.selection
    const alive =
      sel === null ||
      (sel.kind === 'entity'
        ? entry.before.entities[sel.id] !== undefined
        : sel.kind === 'group'
          ? entry.before.groups[sel.id] !== undefined
          : entry.before.rules[sel.id] !== undefined)

    set({
      ...entry.before,
      meta: touch(s.meta),
      selection: alive ? sel : null,
      past: dir === 'undo' ? rest : onto,
      future: dir === 'undo' ? onto : rest,
    })
    /* AND IT HAS TO SURVIVE A RELOAD. The store writes through to
       Dexie 400ms after a mutation; an undo that skipped this would
       be re-clobbered by the very edit it just reverted. */
    schedulePersist(get)
    return entry.label
  }

  return {
    past: [],
    future: [],
    undo: () => travel('undo'),
    redo: () => travel('redo'),

    loaded: false,
    meta: defaultMeta(),
    entities: {},
    groups: {},
    rules: {},
    rowsByEntity: {},
    views: {},
    modules: {},
    roles: {},
    selection: null,
    inspectorTab: 'schema',

    /* -- lifecycle ---------------------------------------- */
    init: async () => {
      const snap = await repository.load()
      /* what was on disk is the starting point, not a step back from
         whatever this tab had in it a moment ago */
      forgetHistory()
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
          /* `roles` is a v4 store — a project saved before it existed
             loads with none, which is the unrestricted state */
          roles: Object.fromEntries((snap.roles ?? []).map((r) => [r.id, r])),
          past: [],
          future: [],
        })
      } else {
        set({ loaded: true, meta: defaultMeta(), past: [], future: [] })
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
      /* THE ONE THAT WOULD HURT MOST. `wipe()` clears every store on
         the shared database, so a tab that is not the writer must
         never reach it — it would empty the sheet out from under the
         tab that IS writing. */
      if (writesHeld()) {
        noteRefusedWrite()
        return
      }
      if (persistTimer) clearTimeout(persistTimer)
      persistTimer = null
      /* the burst this cancels is not owed a write any more */
      unwrittenSince = 0
      forgetHistory()
      /* THE VERBS GO WITH THE MODULES. `modules` is emptied below, so
         every module id this registry holds is now a pointer to
         nothing — and the ids `createModule` mints are not guaranteed
         to differ from the ones just thrown away. Left behind, the
         first module made after a wipe could arrive with rule
         configuration already on, which is precisely the default
         `DEFAULT_CAPABILITIES` exists to hold. */
      forgetModuleRuleCapabilities()
      await repository.wipe()
      set({
        past: [],
        future: [],
        meta: defaultMeta(),
        entities: {},
        groups: {},
        rules: {},
        rowsByEntity: {},
        views: {},
        modules: {},
        roles: {},
        selection: null,
      })
    },

    replaceProject: (data) => {
      /* A SWAP IS NOT A STEP. Undoing into a project that is no longer
         open would restore tables the views on screen have never heard
         of, and every swap left on the stack pins a whole previous
         workbook in memory. A new document has no past. */
      forgetHistory()
      mutate(() => ({
        past: [],
        future: [],
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
        /* AND THE JOBS GO WITH THEM. A role is a job at THIS
           dealership and every grant it holds names a module in this
           project; carrying either into an incoming file would leave
           somebody else's org chart sitting over somebody else's
           modules. */
        roles: {},
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
        roles: Object.values(s.roles),
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

      record({ one: 'Table added', where: entity.name })
      mutate((s) => ({
        entities: { ...s.entities, [entity.id]: entity },
        selection: { kind: 'entity', id: entity.id },
      }))
      return entity
    },

    importTable: ({ name, kind, columns, rows, nameColumn, position }) => {
      /* A table with no columns is not a table, and nothing above
         this should ever ask for one — refused rather than created
         empty, so a caller's mistake cannot become a sheet full of
         blank tables. */
      if (columns.length === 0) return null

      const s0 = get()
      const meta = TABLE_KINDS[kind]
      const fields: FieldDef[] = columns.map((c) => ({
        id: newId(),
        name: c.name.trim() || 'Column',
        type: c.type,
        ...(c.options && c.options.length > 0 ? { options: [...c.options] } : {}),
      }))

      const at = nameColumn !== undefined ? fields[nameColumn] : undefined
      const stamp = nowIso()
      const count = Object.keys(s0.entities).length

      const entity: EntityDef = {
        id: newId(),
        name: name.trim() || meta.label,
        kind,
        role: 'base',
        accent: meta.accent,
        fields,
        displayFieldId: (at ?? fields[0]).id,
        position:
          position ?? { x: 120 + (count % 3) * 560, y: 120 + Math.floor(count / 3) * 420 },
        createdAt: stamp,
        updatedAt: stamp,
      }

      const made: RowData[] = rows.map((line) => {
        const values: Record<string, CellValue> = {}
        for (let i = 0; i < fields.length; i += 1) {
          const v = line[i]
          /* an empty cell is stored as an absence, the same as every
             other row this app makes — writing nulls would double the
             size of a 2,913-row import for no reading anywhere */
          if (v === null || v === undefined || v === '') continue
          values[fields[i].id] = v
        }
        return {
          id: newId(),
          entityId: entity.id,
          values,
          createdAt: stamp,
          updatedAt: stamp,
        }
      })

      record({ one: 'Table imported', where: entity.name })
      mutate((s) => ({
        entities: { ...s.entities, [entity.id]: entity },
        rowsByEntity: { ...s.rowsByEntity, [entity.id]: made },
        selection: { kind: 'entity', id: entity.id },
      }))
      return entity
    },

    /* -- entities ----------------------------------------- */
    createEntity: (partial) => {
      const count = Object.keys(get().entities).length
      const keep = partial?.keepId
      const entity: EntityDef = {
        id: keep && !get().entities[keep] ? keep : newId(),
        name: partial?.name?.trim() || `Entity ${count + 1}`,
        accent: partial?.accent ?? ACCENT_KEYS[count % ACCENT_KEYS.length],
        fields: [
          { id: newId(), name: 'Name', type: 'text', required: true },
        ],
        position: partial?.position ?? { x: 120 + (count % 5) * 60, y: 120 + (count % 5) * 48 },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      record({ one: 'Table added', where: entity.name })
      mutate((s) => ({
        entities: { ...s.entities, [entity.id]: entity },
        selection: { kind: 'entity', id: entity.id },
        inspectorTab: 'schema',
      }))
      return entity
    },

    updateEntity: (id, patch) => {
      const keys = Object.keys(patch)
      if (get().entities[id] && keys.length > 0) {
        record({
          one:
            keys.length === 1 && keys[0] === 'name'
              ? 'Table renamed'
              : keys.length === 1 && keys[0] === 'description'
                ? 'Description edited'
                : 'Table changed',
          many: (n) => `${n} table changes`,
          where: nameOf(id),
          /* the description box writes on every keystroke — fold a
             typed sentence into the one step it looks like */
          key: `entity:${id}:${keys.join(',')}`,
        })
      }
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
      if (get().entities[id]) record({ one: 'Table deleted', where: nameOf(id) })
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
      record({ one: 'Column added', many: (n) => `${n} columns added`, where: e.name })
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
      const e0 = get().entities[entityId]
      const f0 = e0?.fields.find((f) => f.id === fieldId)
      const keys = Object.keys(patch)
      if (f0 && keys.length > 0) {
        /* A RETYPE IS THE DESTRUCTIVE ONE — it drops every stored value
           in the column — so it is named separately from a rename. */
        const retype = patch.type !== undefined && patch.type !== f0.type
        record({
          one: retype
            ? 'Column retyped'
            : keys.length === 1 && keys[0] === 'name'
              ? 'Column renamed'
              : 'Column changed',
          many: (n) => `${n} column changes`,
          where: e0?.name,
          key: `field:${entityId}:${fieldId}:${keys.join(',')}`,
        })
      }
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
      const e0 = get().entities[entityId]
      if (e0?.fields.some((f) => f.id === fieldId)) {
        record({ one: 'Column deleted', many: (n) => `${n} columns deleted`, where: e0.name })
      }
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
      const e0 = get().entities[entityId]
      const i0 = e0 ? e0.fields.findIndex((f) => f.id === fieldId) : -1
      /* only when the move is legal — an entry that reverts to itself
         is a Ctrl+Z that visibly does nothing */
      if (e0 && i0 >= 0 && i0 + dir >= 0 && i0 + dir < e0.fields.length) {
        record({ one: 'Column moved', many: (n) => `${n} columns moved`, where: e0.name })
      }
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
      /* THE FRAME GOES AND THE TABLES STAY, but each of them loses its
         `groupId` — which is a change to `entities`, invisible on the
         sheet the moment the frame is gone. Both maps are in the slice,
         so undo puts the zone back with its members still in it. Moving
         or resizing a zone is still not a step; deleting one is. */
      if (get().groups[id]) record({ one: 'Zone deleted', where: get().groups[id].name })
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
      record({ one: 'Row added', many: (n) => `${n} rows added`, where: e.name })
      mutate((s) => ({
        rowsByEntity: {
          ...s.rowsByEntity,
          [entityId]: [...(s.rowsByEntity[entityId] ?? []), row],
        },
      }))
      return row
    },

    updateCell: (entityId, rowId, fieldId, value) => {
      /* A COMMIT THAT CHANGED NOTHING IS NOT A STEP. Opening a cell and
         pressing Enter writes the value straight back; recording it
         would spend an undo on a keystroke that did nothing, and after
         three of them Ctrl+Z appears broken. The write itself still
         goes through — this only decides whether history hears about
         it — so no existing behaviour moves. */
      const s0 = get()
      const prev = s0.rowsByEntity[entityId]?.find((r) => r.id === rowId)
      if (prev && !cellUnchanged(prev.values[fieldId], value)) {
        record({ one: 'Cell edit', many: (n) => `${n} cell edits`, where: nameOf(entityId) })
      }
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
      if (get().rowsByEntity[entityId]?.some((r) => r.id === rowId)) {
        record({ one: 'Row deleted', many: (n) => `${n} rows deleted`, where: nameOf(entityId) })
      }
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
    createView: (rootTableId, name, keepId) => {
      const existing = Object.values(get().views).find((v) => v.rootTableId === rootTableId)
      if (existing) return existing
      const root = get().entities[rootTableId]
      const view: ViewDef = {
        /* A RESTORED PAGE KEEPS ITS OWN ID — unless something already
           holds it, in which case minting is the only safe answer: two
           pages under one key is one page, and a merge that fused two
           of somebody's screens together would be far worse than a
           merged page arriving under a new name. */
        id: keepId && !get().views[keepId] ? keepId : newId(),
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


    createModule: (tableIds, name, description, keepId) => {
      const clean = tableIds.filter((id) => {
        const e = get().entities[id]
        return e !== undefined && canBeModuleMaster(e)
      })
      if (clean.length === 0) return null
      const primary = get().entities[clean[0]]

      /* EVERY TABLE IN THE MODULE GETS ITS OWN PAGE, SEEDED FROM ITS
         OWN JOINS. A module made over a boat used to open onto the boat
         alone — no motors, no trailer — because a fresh view has no
         blocks and somebody has to drag tables onto it first. That is
         the whole point of the product missing from its own front page.

         The blocks are NOT guessed. A JOIN TABLE is explicit data: it
         exists because someone said these two tables relate, and it
         carries the curated pairs. `suggest.ts` deliberately only
         OFFERS a rule and never applies one, which is right for a guess
         from column shapes — this is not a guess, it is a relationship
         already written down.

         THE BLOCKS ARE PER TABLE AND NOT PER MODULE, and that is the
         fix docs/audit/MODULE_BLOCK_TRACE.md was written to force. The
         old seed asked "does ANY join name ANY of my tables?" and wrote
         every answer onto the FIRST table's page. A module over seven
         brand tables therefore seeded eleven blocks onto one brand,
         each bound to a different brand's join — measured per brand:
         5, 2, 1, 1, 1, 1 and, for Formosa, 0 of 11. Asking the question
         per table instead is the same structural test — "which join
         carries a reference column to THIS table" — and every block it
         produces belongs to the table whose page it is on.

         `defaultBlocksFor` is `createViewFor`'s own derivation, moved
         to a store-free file so both callers read one answer. Imported
         by direct path rather than through `@/features/views`, which
         would drag the React surfaces and the store back in a circle;
         the same precedent, with the same reason, is in
         src/features/modules/read.ts.

         Only when a view is empty: a view somebody has already curated
         is theirs, and a module opening over it must not rearrange
         their page. */
      for (const tableId of clean) {
        const v = get().createView(tableId)
        if (v.blocks.length > 0) continue
        const blocks = defaultBlocksFor(get().entities, tableId)
        if (blocks.length > 0) get().updateView(v.id, { blocks })
      }

      /* THE DETAIL SURFACE IS MINTED WITH THE MODULE, not on first open.
         A module whose items cannot be opened until somebody visits a
         second screen is a module that looks broken for one click, and
         createView is idempotent by contract — so this is the same
         record the loop above already made for the primary table, not
         a second one. `viewId` names the PRIMARY table's page; a module
         spanning seven tables has seven, and a row is opened on its own
         table's view rather than through this id (see ModuleStage). */
      const view = get().createView(clean[0])

      const order = Object.values(get().modules).length
      const mod: ModuleDef = {
        /* the same rule as `createView` above: a restored module is the
           module it was, and an id already in use is never taken */
        id: keepId && !get().modules[keepId] ? keepId : newId(),
        name: name?.trim() || primary.name,
        description: description?.trim() || primary.description?.trim() || '',
        tableIds: clean,
        capabilities: [...DEFAULT_CAPABILITIES],
        /* THE FACE IS COUNTED OFF THE ROWS, NOT GUESSED OFF ONE
           TABLE'S COLUMN LIST. This used to ask whether `tableIds[0]`
           declared a picture column — the right question asked of the
           wrong thing, because a module spans its tables and a column
           existing is not the same fact as the rows carrying anything
           in it. Motors runs Yamaha (203 pictured of 209) beside
           ePropulsion (no picture column at all); Boats runs Highfield
           beside Formosa, which pictures 18 of its 39. `moduleFace`
           counts the whole module and says so in a sentence the
           designer shows. It is a DEFAULT: `index` is still stored and
           the designer still writes it. */
        index: moduleFace(
          clean.map((id) => get().entities[id]).filter((e): e is EntityDef => e !== undefined),
          get().rowsByEntity,
        ).mode,
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

    /* -- roles -------------------------------------------------- */

    createRole: (name, description, keepId) => {
      const clean = name.trim()
      if (clean === '') return null
      const role: RoleDef = {
        id: keepId && !get().roles[keepId] ? keepId : newId(),
        name: clean,
        ...(description && description.trim() !== ''
          ? { description: description.trim() }
          : {}),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      record({ one: 'Role added', where: role.name })
      mutate((s) => ({ roles: { ...s.roles, [role.id]: role } }))
      return role
    },

    updateRole: (id, patch) => {
      const before = get().roles[id]
      if (!before) return
      record({
        one: 'Role renamed',
        where: before.name,
        /* per-keystroke, so retyping a name is one step back and not
           eleven — the same window `updateCell` uses */
        key: `role:${id}`,
      })
      mutate((s) => {
        const r = s.roles[id]
        if (!r) return {}
        return { roles: { ...s.roles, [id]: touch({ ...r, ...patch }) } }
      })
    },

    deleteRole: (id) => {
      const gone = get().roles[id]
      if (!gone) return
      record({ one: 'Role deleted', where: gone.name })
      mutate((s) => {
        const roles = { ...s.roles }
        delete roles[id]
        /* EVERY GRANT THIS ROLE HELD GOES WITH IT, in the same step.
           A module left naming a deleted role would draw a row for
           nobody, and — worse — a module whose only role was this one
           would still be RESTRICTED, with nothing able to act in it. */
        const modules = { ...s.modules }
        for (const m of Object.values(s.modules)) {
          if (!m.access?.some((a) => a.roleId === id)) continue
          const rest = m.access.filter((a) => a.roleId !== id)
          modules[m.id] = touch({
            ...m,
            /* back to unrestricted rather than to an empty list: an
               empty `access` is a wall nobody is on the right side of */
            access: rest.length > 0 ? rest : undefined,
          })
        }
        return { roles, modules }
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
      /* A STEP TAKES ITS WIRES WITH IT — which is why this was the one
         rule act that had a confirm on it saying "everything set up on
         it goes too, and there is no undo". There is now. React Flow
         deletes a node and its edges in one handler, so the edge ops
         that follow fold into this step by the burst rule above. */
      if (get().rules[ruleId]?.nodes.some((n) => n.id === nodeId)) {
        record({
          one: 'Step deleted',
          many: (n) => `${n} steps deleted`,
          where: get().rules[ruleId]?.name,
        })
      }
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
      /* A WIRE IS CHEAP TO REDRAW and this is still worth a step: the
         line from one plate to the next IS the rule, and a wire cut by
         a stray Backspace is off the screen with nothing to show where
         it went. Cheap to record, too — the entry retains one edge
         array. Deleting a step deletes its wires in the same turn of
         the event loop, so those collapse into the step's own entry
         rather than piling up beside it. */
      if (get().rules[ruleId]?.edges.some((e) => e.id === edgeId)) {
        record({
          one: 'Line deleted',
          many: (n) => `${n} lines deleted`,
          where: get().rules[ruleId]?.name,
        })
      }
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
      record({ one: 'Table added', where: entity.name })
      mutate((s) => ({
        entities: { ...s.entities, [entity.id]: entity },
        selection: { kind: 'entity', id: entity.id },
      }))
      return { entity, aFieldId, bFieldId }
    },

    deleteRule: (id) => {
      /* THE WHOLE RULE IS ONE OBJECT IN `rules`, so the slice already
         holds every step, every wire and every clause on it — this is
         one `record()` and undo gives the drawing back entire. Read
         the name BEFORE the mutation, like every other site here. */
      if (get().rules[id]) record({ one: 'Rule deleted', where: get().rules[id].name })
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
