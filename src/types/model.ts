/* ============================================================
   Domain model — the single source of truth for all features.
   Do not fork these shapes locally; import from '@/types/model'
   (path alias '@' -> src, see vite.config / tsconfig).
   ============================================================ */

/** Accent ink an entity or group is drawn with. */
export type AccentKey =
  | 'blue'
  | 'carmine'
  | 'viridian'
  | 'ochre'
  | 'violet'
  | 'teal'
  | 'graphite'

export const ACCENT_KEYS: AccentKey[] = [
  'blue',
  'carmine',
  'viridian',
  'ochre',
  'violet',
  'teal',
  'graphite',
]

/** CSS custom-property name for an accent. */
export const accentVar = (a: AccentKey): string => `var(--accent-${a})`

/* ---------------------------------------------------------- */
/* Fields                                                     */
/* ---------------------------------------------------------- */

export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select' /* list of predefined options */
  | 'reference' /* link to a row of another entity — draws ERD edges */
  | 'formula' /* calculated from other fields */
  | 'image' /* one or more images; the FIRST is the primary */

/** One image on a row. A cell of type 'image' holds an ordered list of
 *  these, and **order is meaning**: index 0 is the primary — the one a
 *  catalogue tile or a quote header shows. Reordering re-elects the
 *  primary; there is no separate "isPrimary" flag to fall out of sync.
 *
 *  `src` is an object/data URL while we are local-only. When a backend
 *  arrives it becomes a storage path and nothing above this type changes. */
export interface ImageRef {
  id: string
  src: string
  /** original filename, shown on hover and used in exports */
  name?: string
  /** natural pixel size when known — lets a grid reserve space */
  w?: number
  h?: number
  /** author-supplied alt text; falls back to the row's label */
  alt?: string
}

export interface FieldTypeMeta {
  label: string /* human name shown in pickers */
  tag: string /* 3-char mono tag, e.g. NUM */
  cssVar: string /* color token, e.g. var(--type-number) */
}

export const FIELD_TYPES: Record<FieldType, FieldTypeMeta> = {
  text: { label: 'Text', tag: 'TXT', cssVar: 'var(--type-text)' },
  number: { label: 'Number', tag: 'NUM', cssVar: 'var(--type-number)' },
  boolean: { label: 'Yes / No', tag: 'Y/N', cssVar: 'var(--type-boolean)' },
  date: { label: 'Date', tag: 'DAT', cssVar: 'var(--type-date)' },
  select: { label: 'List', tag: 'LST', cssVar: 'var(--type-select)' },
  reference: { label: 'Link', tag: 'REF', cssVar: 'var(--type-reference)' },
  formula: { label: 'Calculated', tag: 'FX', cssVar: 'var(--type-formula)' },
  image: { label: 'Images', tag: 'IMG', cssVar: 'var(--type-image)' },
}

/** A named band of columns — "Pricing", "Dimensions", "Rego".
 *  Columns carrying the same `sectionId` are drawn together under one
 *  spanning header, tinted with the section's ink, and can be collapsed
 *  as a group. Order comes from the field order; a section is simply the
 *  run of consecutive columns that share its id. */
export interface ColumnSection {
  id: string
  name: string
  accent?: AccentKey
  /** collapsed sections show a summary chip instead of their columns */
  collapsed?: boolean
}

export interface FieldDef {
  id: string
  name: string
  type: FieldType
  description?: string
  required?: boolean
  /** the band this column belongs to, if any */
  sectionId?: string
  /** select: the allowed options */
  options?: string[]
  /** reference: the entity this field links to */
  refEntityId?: string
  /** formula: expression source, e.g. "[Price] * [Qty] * (1 - [Discount])" */
  formula?: string
  /** default cell value for new rows (not used for formula fields) */
  defaultValue?: CellValue
}

/** What actually lives in a row cell.
 *  - date: ISO 'YYYY-MM-DD' string
 *  - reference: id of a row in the referenced entity
 *  - image: an ordered ImageRef[] — index 0 is the primary
 *  - formula fields are NOT stored; they are computed on read.
 *
 *  NOTE for consumers: this union is no longer all-primitive. Anything
 *  that formats, compares, sorts, searches or exports a cell must handle
 *  the array case — see `isImageValue` / `primaryImage` below. */
export type CellValue = string | number | boolean | null | ImageRef[]

export const isImageValue = (v: CellValue): v is ImageRef[] => Array.isArray(v)

/** The image a catalogue tile or quote header should show. */
export function primaryImage(v: CellValue): ImageRef | undefined {
  return isImageValue(v) ? v[0] : undefined
}

/** Cell text for search, sort, copy and export. Images contribute their
 *  count, never a blob of URLs. */
export function imageCellText(v: CellValue): string {
  if (!isImageValue(v)) return ''
  return v.length === 0 ? '' : `${v.length} image${v.length === 1 ? '' : 's'}`
}

/* ---------------------------------------------------------- */
/* Entities, groups, rows                                     */
/* ---------------------------------------------------------- */

export interface XY {
  x: number
  y: number
}

/* ---------------------------------------------------------- */
/* Industries and table kinds — the domain knowledge that lets */
/* a user pick what they sell instead of designing a schema.   */
/* ---------------------------------------------------------- */

export type IndustryKey = 'marine' | 'automotive' | 'motorcycle' | 'other'

export interface IndustryMeta {
  label: string
  blurb: string
  /** only 'marine' is built; the rest render as COMING SOON */
  available: boolean
}

export const INDUSTRIES: Record<IndustryKey, IndustryMeta> = {
  marine: {
    label: 'Marine',
    blurb: 'Boats, outboards, trailers and the rigs they make together.',
    available: true,
  },
  automotive: {
    label: 'Automotive',
    blurb: 'Cars, utes and the options that come with them.',
    available: false,
  },
  motorcycle: {
    label: 'Motorcycles & ATVs',
    blurb: 'Bikes, quads and side-by-sides.',
    available: false,
  },
  other: {
    label: 'Other',
    blurb: 'Start from a blank sheet and build your own tables.',
    available: false,
  },
}

/** What a table HOLDS. It is a TYPE, not an instance.
 *
 *  ONE TABLE PER BRAND. A `boat` table is a single brand's catalogue —
 *  "Highfield", "Stacer", "Stabicraft" are three separate tables that all
 *  share kind 'boat'. Same for trailers: REDCO, Dunbier and Mackay are
 *  three `trailer` tables.
 *
 *  This is not a preference, it is what the source data demands. The real
 *  Boat Module carries EIGHT brand-specific header rows re-labelling the
 *  same grid, because a column means different things per brand — col I is
 *  "Depth (Mtr)" for Stacer and "Tube Dia." for Highfield; P/Q is "Hull
 *  Weight / Max Motor Weight" for one and "Max Load / Max People" for
 *  another; Highfield has no col U at all. Merging them into one table
 *  would force exactly the untyped, meaning-drifting column soup this
 *  product exists to replace.
 *
 *  The KIND is what lets rules and fitment work across brands: a motor
 *  fitment rule is written once against `boat` and applies to every boat
 *  table, whatever its columns are called. */
export type TableKind =
  | 'boat'
  | 'motor'
  | 'trailer'
  | 'accessory'
  | 'package'
  | 'dealer'
  | 'custom'

/** One way a table can be structured. `levels` are the column names that
 *  form the nesting, outermost first. An empty `levels` is a flat list. */
export interface StructurePreset {
  id: string
  levels: string[]
  caption: string
}

/** A column a kind ships with beyond its hierarchy. `linkTo` asks for a
 *  link to another table of that kind, resolved at creation time and
 *  omitted when no such table exists yet. */
export interface KindColumn {
  name: string
  type: FieldType
  options?: string[]
  linkTo?: TableKind
  /** id of the ColumnSection this belongs to — see TableKindMeta.sections.
   *  A 40-column price sheet is unreadable as one run; the bands are how
   *  the business already draws it. */
  section?: string
  /** the business's own unit, appended to the column name when set.
   *  The MPF stores '52 cm', '105 ltr', '1,188 kg' as TEXT inside otherwise
   *  numeric columns — declaring the unit here is what lets us store a
   *  clean number and still show what it means. */
  unit?: string
}

export interface TableKindMeta {
  label: string
  blurb: string
  accent: AccentKey
  /** first entry is the default */
  structures: StructurePreset[]
  /** the bands a new table of this kind opens with, in order */
  sections?: Array<{ id: string; name: string; accent?: AccentKey }>
  detailColumns: KindColumn[]
}

const FLAT: StructurePreset = {
  id: 'flat',
  levels: [],
  caption: 'One straight list, no grouping.',
}

export const TABLE_KINDS: Record<TableKind, TableKindMeta> = {
  /* Corrected against the real Boat Module — see MPF_GROUND_TRUTH.md §2.1
     and §4.1. "Range" is gone as a default level name: Highfield, Stabicraft,
     Surtees and Haines all write SERIES; only Stacer writes plural range
     names, and level names stay renameable per table anyway. */
  boat: {
    label: 'Boats',
    blurb: 'The boats you sell.',
    accent: 'blue',
    /* The table IS the brand, so Brand is NOT a level — it would repeat on
       every row. Levels start below it. */
    structures: [
      {
        id: 'series-model-variant',
        levels: ['Series', 'Model', 'Variant'],
        caption:
          'Series, their models, and each model’s material and colourway SKUs.',
      },
      {
        id: 'series-model',
        levels: ['Series', 'Model'],
        caption: 'Models are sold as one item — no material or colour split.',
      },
      {
        id: 'model-variant',
        levels: ['Model', 'Variant'],
        caption: 'A short catalogue with no series grouping.',
      },
      FLAT,
    ],
    sections: [
      { id: 'identity', name: 'Identity' },
      { id: 'dimensions', name: 'Dimensions' },
      { id: 'capacity', name: 'Capacity' },
      { id: 'cost-build', name: 'Cost Build', accent: 'graphite' },
      { id: 'markups', name: 'Markups', accent: 'graphite' },
      { id: 'pricing', name: 'Hull Only Pricing', accent: 'viridian' },
      { id: 'motor-fitment', name: 'Motor Fitment', accent: 'carmine' },
    ],
    detailColumns: [
      { name: 'Model Code', type: 'text', section: 'identity' },
      { name: 'Matrix', type: 'text', section: 'identity' },
      { name: 'Material', type: 'select', options: ['PVC', 'HYP'], section: 'identity' },
      { name: 'Colourway', type: 'text', section: 'identity' },
      { name: 'Image', type: 'image', section: 'identity' },
      { name: 'OA Length', type: 'number', unit: 'm', section: 'dimensions' },
      { name: 'Beam', type: 'number', unit: 'm', section: 'dimensions' },
      { name: 'Tube Dia.', type: 'number', unit: 'cm', section: 'dimensions' },
      { name: 'Deadrise', type: 'number', unit: '°', section: 'dimensions' },
      { name: 'Fuel Capacity', type: 'number', unit: 'L', section: 'capacity' },
      { name: 'Max Load', type: 'number', unit: 'kg', section: 'capacity' },
      { name: 'Max People', type: 'number', section: 'capacity' },
      { name: 'Boat Weight', type: 'number', unit: 'kg', section: 'capacity' },
      {
        name: 'Currency',
        type: 'select',
        options: ['AUD', 'USD', 'Euro', 'NZ'],
        section: 'cost-build',
      },
      { name: 'EX Rate', type: 'number', section: 'cost-build' },
      { name: 'Base Cost', type: 'number', section: 'cost-build' },
      { name: 'Road Freight', type: 'number', section: 'cost-build' },
      { name: 'Landed Hull Cost', type: 'number', section: 'cost-build' },
      { name: 'HO - MU', type: 'number', unit: '%', section: 'markups' },
      { name: 'BMT - MU', type: 'number', unit: '%', section: 'markups' },
      { name: 'Cash', type: 'number', section: 'pricing' },
      { name: 'Trade', type: 'number', section: 'pricing' },
      { name: 'Sub Dealer', type: 'number', section: 'pricing' },
      { name: 'Sub (Exclusive)', type: 'number', section: 'pricing' },
      { name: 'AUS Sailing', type: 'number', section: 'pricing' },
      { name: 'Min HP', type: 'number', section: 'motor-fitment' },
      { name: 'Max HP', type: 'number', section: 'motor-fitment' },
      {
        name: 'Shaft Length',
        type: 'select',
        options: ['S', 'L', 'XL', 'XXL'],
        section: 'motor-fitment',
      },
    ],
  },
  motor: {
    label: 'Motors',
    blurb: 'Outboards and engines.',
    accent: 'carmine',
    /* one table per motor brand — the table IS Yamaha, or Suzuki */
    structures: [
      {
        id: 'series-model',
        levels: ['Series', 'Model'],
        caption: 'Model families, and the models within them.',
      },
      { id: 'model', levels: ['Model'], caption: 'A straight list of models.' },
      FLAT,
    ],
    detailColumns: [
      { name: 'HP', type: 'number' },
      { name: 'Weight kg', type: 'number' },
      { name: 'Shaft', type: 'select', options: ['Short', 'Long', 'Extra long'] },
      { name: 'Price', type: 'number' },
    ],
  },
  trailer: {
    label: 'Trailers',
    blurb: 'Road trailers rated by load and length.',
    accent: 'ochre',
    /* one table per trailer brand — REDCO, Dunbier, Mackay each get their
       own; the middle level is genuinely called SERIES in the source */
    structures: [
      {
        id: 'series-model',
        levels: ['Series', 'Model'],
        caption: 'Series, and the trailers within them.',
      },
      { id: 'model', levels: ['Model'], caption: 'A straight list of trailers.' },
      FLAT,
    ],
    detailColumns: [
      { name: 'Max Load kg', type: 'number' },
      { name: 'Max Length ft', type: 'number' },
      { name: 'Axles', type: 'number' },
      { name: 'Price', type: 'number' },
    ],
  },
  accessory: {
    label: 'Accessories',
    blurb: 'Parts, add-ons and extras.',
    accent: 'viridian',
    structures: [
      {
        id: 'category-product',
        levels: ['Category', 'Product'],
        caption: 'Products grouped under a category.',
      },
      {
        id: 'category-sub-product',
        levels: ['Category', 'Sub-category', 'Product'],
        caption: 'A deeper catalogue with sub-categories.',
      },
      FLAT,
    ],
    detailColumns: [
      { name: 'SKU', type: 'text' },
      { name: 'Price', type: 'number' },
      { name: 'In Stock', type: 'boolean' },
    ],
  },
  package: {
    label: 'Packages',
    blurb: 'A boat, motor and trailer sold together as a rig.',
    accent: 'violet',
    structures: [
      { ...FLAT, caption: 'One straight list of packages.' },
      { id: 'brand-package', levels: ['Brand', 'Package'], caption: 'Packages grouped by brand.' },
    ],
    detailColumns: [
      { name: 'Boat', type: 'reference', linkTo: 'boat' },
      { name: 'Motor', type: 'reference', linkTo: 'motor' },
      { name: 'Trailer', type: 'reference', linkTo: 'trailer' },
      { name: 'Price', type: 'number' },
    ],
  },
  dealer: {
    label: 'Dealers',
    blurb: 'Dealers and locations.',
    accent: 'teal',
    structures: [
      { id: 'region-dealer', levels: ['Region', 'Dealer'], caption: 'Dealers grouped by region.' },
      FLAT,
    ],
    detailColumns: [
      { name: 'Suburb', type: 'text' },
      { name: 'State', type: 'text' },
      { name: 'Phone', type: 'text' },
    ],
  },
  custom: {
    label: 'Custom table',
    blurb: 'Anything the presets do not cover.',
    accent: 'graphite',
    structures: [FLAT],
    detailColumns: [{ name: 'Name', type: 'text' }],
  },
}

export interface OrgProfile {
  name: string
  industry: IndustryKey
  createdAt: string
}

/** What a table IS, structurally. The three roles must not be confused —
 *  conflating them is precisely the mess we exist to replace.
 *
 *  - `base`  ONE subject, and only that subject. A Boats table holds boat
 *            columns: brand, range, model, variant, length, weight, HP
 *            envelope, its own prices. It has NO motor column and NO trailer
 *            column, because a motor is not a property of a boat.
 *
 *  - `join`  A declared relationship between two (or more) base tables, plus
 *            whatever belongs to the PAIRING rather than to either side.
 *            Boat × Motor carries the rigging kit, the prop, the engine hole
 *            and "recommended" — none of which is a fact about the boat alone
 *            or the motor alone.
 *
 *  - `view`  The sellable, quotable combination, assembled from base tables
 *            through joins. A stock rig — this hull, that motor, that trailer,
 *            one price — is a VIEW. The spreadsheet draws it as a row and it
 *            looks like a table; it is not one.
 *
 *  Absent = `base` (the common case, and the safe default). */
export type TableRole = 'base' | 'join' | 'view'

export interface EntityDef {
  id: string
  name: string
  description?: string
  accent: AccentKey
  /** what this table holds — drives its symbol and its presets */
  kind?: TableKind
  /** base (default) | join | view — see TableRole. A base table stays pure:
   *  it never grows a column belonging to another subject. */
  role?: TableRole
  /** history rather than stock. The table and its rows survive so an
   *  old quote still resolves; nothing customer-facing offers it.
   *  See DISCONTINUED_FIELD above for the row-level equivalent. */
  retired?: boolean
  /** ordered field ids forming the grouping levels; empty/absent = flat.
   *  Rows stay flat; this is a view transform only.
   *  Level COUNT and level NAME are per-table — there is no universal
   *  "Range". Boats run Brand▸Range▸Model▸Variant, trailers run
   *  Brand▸Series▸Trailer, motors have no taxonomy level at all. */
  hierarchy?: string[]
  /** named bands of columns, e.g. Pricing / Dimensions */
  sections?: ColumnSection[]
  fields: FieldDef[]
  /** field used to label rows elsewhere (reference pickers, node badge);
   *  defaults to the first non-formula field when unset */
  displayFieldId?: string
  position: XY
  /** set when the entity sits inside a group frame on the whiteboard */
  groupId?: string
  createdAt: string
  updatedAt: string
}

export interface GroupDef {
  id: string
  name: string
  accent: AccentKey
  position: XY
  size: { w: number; h: number }
}

export interface RowData {
  id: string
  entityId: string
  /** keyed by FieldDef.id; formula fields never appear here */
  values: Record<string, CellValue>
  createdAt: string
  updatedAt: string
}

/* ---------------------------------------------------------- */
/* Business rules (milestone 2 — shapes are stable now so     */
/* exports stay forward-compatible)                           */
/* ---------------------------------------------------------- */

/** Where a value comes from. `viaFieldId` hops through a reference field
 *  first, so a Deal rule can read [Boat → Price] — one hop only, which keeps
 *  the picker honest and evaluation cheap. */
export interface FieldPath {
  viaFieldId?: string
  fieldId: string
}

export type ValueExpr =
  | { kind: 'literal'; value: CellValue }
  | { kind: 'field'; path: FieldPath }
  | { kind: 'formula'; src: string } /* evaluated by @/lib/formula */

export type CompareOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'notEmpty'
  | 'isTrue'
  | 'isFalse'

/** Ops that take no right-hand side. */
export const UNARY_OPS: CompareOp[] = ['isEmpty', 'notEmpty', 'isTrue', 'isFalse']

export interface Clause {
  id: string
  left: FieldPath
  op: CompareOp
  /** absent for unary ops */
  right?: ValueExpr
}

export interface ClauseGroup {
  combinator: 'AND' | 'OR'
  clauses: Clause[]
}

/** One route out of a condition node. `id` doubles as the React Flow source
 *  handle id; every condition also has an implicit 'else' handle. */
export interface ConditionBranch {
  id: string
  label: string
  group: ClauseGroup
}

export const ELSE_HANDLE = 'else' as const
export const OUT_HANDLE = 'out' as const
export const LOOP_BODY_HANDLE = 'body' as const
export const LOOP_NEXT_HANDLE = 'next' as const

export type LoopSource =
  | { kind: 'entity'; entityId: string } /* every row of an entity */
  | { kind: 'linked'; viaFieldId: string } /* rows pointing here via a link */

export type ActionOp =
  | { op: 'set'; fieldId: string; value: ValueExpr }
  | { op: 'create'; entityId: string; values: Record<string, ValueExpr> }
  | { op: 'flag'; label: string; tone: 'info' | 'warn' | 'danger' }
  /** Write the current (source, match) pair into a join entity — this is how
   *  a fitment rule persists "this motor fits this boat". */
  | {
      op: 'link'
      joinEntityId: string
      /** reference field on the join pointing back at the SOURCE row */
      sourceFieldId: string
      /** reference field on the join pointing at the MATCHED row */
      matchFieldId: string
      /** extra columns written on the join row (e.g. a fitment note) */
      values?: Record<string, ValueExpr>
    }

/** Which row a FieldPath resolves against inside a match/output context.
 *  'source' = the row the rule is currently working (e.g. the Boat).
 *  'match'  = the candidate row being tested or matched (e.g. the Motor). */
export type RowScope = 'source' | 'match'

/** A column in a combined view — names both the row it comes from and the
 *  field on it, so a view can show Boat.Name beside Motor.HP. */
export interface ViewColumn {
  scope: RowScope
  fieldId: string
  /** optional override for the column header */
  label?: string
}

export type RuleNodeKind =
  | 'start' /* entry — walks the rows of the rule's root entity */
  | 'match' /* find rows of another entity that FIT this one */
  | 'condition' /* if / else-if / else — one out-handle per branch + else */
  | 'filter' /* narrow the working set */
  | 'find' /* follow a link field to a single related row */
  | 'loop' /* for-each; 'body' runs per item, 'next' continues after */
  | 'action' /* set / create / flag / link */
  | 'output' /* emit into a named result set */

export interface RuleNodeConfigMap {
  start: Record<string, never>
  /** The compatibility primitive. For each SOURCE row, scan every row of
   *  `targetEntityId` and keep the ones satisfying `group`.
   *
   *  Scope convention inside a match: a clause's `left` FieldPath resolves
   *  against the CANDIDATE row (the motor), and a `{kind:'field'}` right-hand
   *  side resolves against the SOURCE row (the boat). So "motors that fit
   *  this boat" is two clauses:
   *      left [HP]  gte  right field [Min HP]
   *      left [HP]  lte  right field [Max HP]
   *  `emptyBehavior` decides what happens when nothing fits: 'skip' drops the
   *  source row, 'passThrough' carries it on with no match attached. */
  match: {
    targetEntityId: string
    group: ClauseGroup
    emptyBehavior: 'skip' | 'passThrough'
  }
  condition: { branches: ConditionBranch[] }
  filter: { group: ClauseGroup }
  find: { viaFieldId: string }
  loop: { source: LoopSource }
  action: { action: ActionOp }
  /** Columns may draw from either side of the pair, which is what makes this
   *  a COMBINED view (Boat.Name beside Motor.Model and Motor.HP). */
  output: { label: string; columns?: ViewColumn[] }
}

/** Discriminated on `kind` — `config` is always the matching shape. */
export type RuleNode = {
  [K in RuleNodeKind]: {
    id: string
    kind: K
    position: XY
    config: RuleNodeConfigMap[K]
  }
}[RuleNodeKind]

/* ---------------------------------------------------------- */
/* Constraints — business rules as editable ENGLISH SENTENCES  */
/*                                                            */
/* A rule reads:                                              */
/*   "When Water is Salt, Prop material must be Stainless."   */
/* and every underlined word is a control. There is no second */
/* representation — the sentence IS the editor. This replaces  */
/* the flow-chart builder on the default path; RuleDef stays   */
/* for the procedural flows that genuinely need a graph.       */
/* See MOCKUP_FINDINGS.md.                                    */
/* ---------------------------------------------------------- */

export type ConstraintKind =
  /** When <if>, then <then> must hold. Runs both ways — the
   *  contrapositive is free, which is what makes picking a motor first
   *  narrow the boat list. */
  | 'implies'
  /** These can never be chosen together. */
  | 'excludes'
  /** Choosing <if> makes <then> mandatory rather than merely allowed. */
  | 'requires'
  /** Only these combinations are approved — the curated whitelist. This
   *  is our join table wearing a rule's clothes, and it is why a curated
   *  menu can outrank a computed range. */
  | 'table'

export interface ConstraintDef {
  id: string
  kind: ConstraintKind
  /** the left-hand side of the sentence */
  if: ClauseGroup
  /** the right-hand side; absent for 'table', which uses `combinations` */
  then?: ClauseGroup
  /** approved combinations for kind 'table': fieldId -> allowed value */
  combinations?: Array<Record<string, CellValue>>

  /** A short lower-case clause written to read after "because…" —
   *  e.g. "the hull is not rated for that much power".
   *  NOT the rule name and NOT the expression — this is what a person
   *  sees when an option is unavailable, so it has to be human.
   *
   *  It must state a REASON THAT IS TRUE. The example that used to sit
   *  in this comment was invented, and invented reasons propagate: it
   *  reached the UI as placeholder text and read, on screen, as a rule
   *  the business had written. Nothing here is decorative. */
  because: string
  /** optional longer explanation for the why panel */
  why?: string

  /** WHAT THIS RULE IS ALLOWED TO DO WHEN IT DISAGREES WITH A ROW.
   *
   *  'block' — the value leaves the picker. This is what every rule did
   *            before this field existed, and it stays the default so
   *            nothing already written changes meaning.
   *  'warn'  — the value STAYS and is annotated with `because`. Nothing
   *            is pruned.
   *
   *  IT EXISTS BECAUSE A MEASURED PATTERN IS NOT A STATED RULE. The
   *  discovery engine reads a price file and proposes the rules it
   *  already follows; every one of those is OBSERVED — read off values,
   *  not off a formula — and an observed pattern can be a coincidence.
   *  Pruning on a coincidence deletes real business, so `workbookRules`
   *  has always refused to build an observed seed with a kind that
   *  prunes. That refusal was enforced by keeping discovered patterns
   *  out of this store altogether, in a register of their own.
   *
   *  One field lets them come home. A discovered rule is a rule — it can
   *  be listed, edited, turned off and reasoned about like any other —
   *  and it carries, in the type, the one thing that must never be true
   *  of it: that it may quietly remove something a dealer sells.
   *
   *  ANYTHING THAT PRUNES MUST READ THIS. Absent means 'block', for the
   *  rules written before it. */
  severity?: 'block' | 'warn'

  /** Turning a rule OFF beats deleting it: the experiment is reversible
   *  and the authoring survives. */
  enabled: boolean
  /** true once a person has changed it — surfaced as an "edited" tag */
  edited?: boolean
  /** where it came from: 'authored' by a user, or an import/preset */
  source?: string
  /** higher wins when two constraints disagree */
  priority?: number
  createdAt: string
  updatedAt: string
}

/** Why a value is unavailable. Written at the MOMENT of removal rather
 *  than reconstructed afterwards, so a blocked value always knows its
 *  reason — the same discipline as PairOrigin on a view. */
export interface BlockedValue {
  constraintId: string
  /** the constraint's `because` clause, ready to print after "because" */
  because: string
}

/** What the configurator knows after propagation: for every field, which
 *  values are still possible, which are blocked and why. */
export interface ConfigureState {
  /** fieldId -> the values still available */
  domains: Record<string, CellValue[]>
  /** fieldId -> value -> why it went */
  blocked: Record<string, Record<string, BlockedValue>>
  /** fieldId -> the single remaining value, when settled */
  settled: Record<string, CellValue>
  /** constraints that fired during this solve */
  fired: string[]
  /** constraints that contradict the current choices */
  problems: Array<{ constraintId: string; message: string }>
}

/* ---------------------------------------------------------- */
/* Views — the configurable page (see VIEW_SPEC.md)           */
/* ---------------------------------------------------------- */

/** One related table shown on a view — "the motors that fit this boat".
 *
 *  RULE vs FILTER is the distinction that keeps this understandable, and
 *  they must never be conflated:
 *    rule   = what is RELATED       (structural; lives on the join)
 *    filter = what is SHOWN now     (cosmetic; lives on the view) */
export interface ViewBlock {
  id: string
  /** the related table */
  tableId: string
  /** the join table carrying the pairs, when the relationship is curated */
  joinTableId?: string
  /** what is related. Absent = show everything in `tableId`. */
  rule?: ClauseGroup
  /** what is shown right now — never changes what is related */
  filters?: ColumnFilter[]
  /** which columns to show, in order; absent = a sensible few */
  columns?: string[]
  /** nesting: accessories under motors. Max depth 3 including the root. */
  children?: ViewBlock[]
}

/** A cosmetic narrowing of what a block displays. Mirrors the table view's
 *  own filter vocabulary so the same control serves both. */
export type ColumnFilter =
  | { kind: 'values'; fieldId: string; selected: string[] }
  | { kind: 'contains'; fieldId: string; text: string }

export interface ViewDef {
  id: string
  name: string
  /** the table whose rows this view is "for" — usually Boats */
  rootTableId: string
  blocks: ViewBlock[]
  createdAt: string
  updatedAt: string
}

/* ============================================================
   MODULES — a place in the business, made by the person who runs it.

   A module is four things and no more: the TABLES it is about, the
   VERBS a person may use in it, how its list is DRAWN, and where it
   sits on the dashboard. Everything else about it is derived from the
   tables themselves — the row label, the grouping, the picture, the
   price — so a module works the moment it is named and is tuned
   afterwards rather than configured first. See docs/plan/MODULE_SYSTEM.md.

   WHAT IT IS NOT. Not a table: it POINTS at tables, they never move
   and never gain an owner. Not a folder. Not a permission — it says
   what CAN be done here, never who may do it, so roles stay additive
   when they arrive. Not a plugin: no module ships code.

   THE MASTER IS A SET WITH A PRIMARY, not a single id. HelmLogic wrote
   that pointer three separate times — mainVendorId, trailerBrandVendorIds,
   regoVendorIds — and its own create form has to null one and populate
   another. One field with the right arity absorbs every case they
   special-cased. `tableIds[0]` is the primary.
   ============================================================ */

/** The verbs a module offers. Deliberately a closed list: a capability
 *  nobody can name is a capability nobody can switch off. */
export type ModuleCapability =
  | 'browse'
  | 'search'
  | 'open'
  | 'add'
  | 'edit'
  | 'delete'
  | 'relate'
  | 'quote'
  | 'export'

export const MODULE_CAPABILITIES: Record<
  ModuleCapability,
  { label: string; says: string }
> = {
  browse: { label: 'Browse', says: 'see everything in it' },
  search: { label: 'Search', says: 'find one by name' },
  open: { label: 'Open one', says: 'look at a single item' },
  add: { label: 'Add', says: 'create a new item' },
  edit: { label: 'Edit', says: 'change what is there' },
  delete: { label: 'Remove', says: 'take an item out' },
  relate: { label: 'Relate', says: 'say what goes with what' },
  quote: { label: 'Quote', says: 'raise a price for a customer' },
  export: { label: 'Export', says: 'take a copy out' },
}

/** What a new module can do before anyone configures it: look, do not
 *  touch. Nothing that writes is on by default — an admin turns writing
 *  on deliberately, on the modules where it belongs. */
export const DEFAULT_CAPABILITIES: ModuleCapability[] = ['browse', 'search', 'open']

/** How the index draws each row. Rows for dense data a person scans;
 *  tiles for a catalogue a person shops. */
export type ModuleIndexMode = 'rows' | 'tiles'

export interface ModuleDef {
  id: string
  name: string
  /** one line under the name on the dashboard card. The admin's words:
   *  HelmLogic derives its equivalent by substring-matching the name and
   *  therefore tells every trailer and service user they are configuring
   *  boat packages. */
  description: string
  /** the tables this module is about; [0] is the primary. Never a join —
   *  a join is a relationship, not a place to stand. */
  tableIds: string[]
  capabilities: ModuleCapability[]
  index: ModuleIndexMode
  /** the view page used as this module's detail surface, when it has
   *  one. Absent means the module lists but does not open — which is a
   *  legitimate module, not a broken one. */
  viewId?: string
  accent: AccentKey
  /** position on the dashboard, ascending */
  order: number

  /** THE DEALER'S OWN MARK FOR THIS PLACE. A module is a place in a
   *  business and a business has a mark for it — the brand it sells,
   *  the workshop's badge. Optional, and the kind symbol plus the
   *  accent stay the fallback, because a module nobody has given a
   *  logo must still read as itself. */
  logo?: ImageRef

  /** WHO MAY DO WHAT HERE. Absent = unrestricted, which is how every
   *  module written before this behaved and still behaves. See
   *  `ModuleAccess` for why it shares the capability vocabulary. */
  access?: ModuleAccess[]

  createdAt: string
  updatedAt: string
}

/** Can this table be the master of a module? A join records pairs and
 *  has no independent existence, so it appears INSIDE a module as a
 *  related block and never as a module of its own. */
/* ---------------------------------------------------------- */
/* WHO MAY DO WHAT, IN A MODULE                                */
/* ---------------------------------------------------------- */

/** A named job at the dealership — "Salesperson", "Service manager",
 *  "Owner". Roles are DATA, not code: this app's argument is that a
 *  dealer configures their own business without a developer, and a
 *  permission list compiled into the app is the exact thing production
 *  got wrong — docs/plan/hl-admin.md §2.3, "the permission list is
 *  code, not data".
 *
 *  A role says nothing on its own. It becomes real only where a module
 *  grants it capabilities: see `ModuleDef.access`. */
export interface RoleDef {
  id: string
  /** the dealership's own word for the job */
  name: string
  /** one line: who this is, in the owner's words. Never generated. */
  description?: string
  createdAt: string
  updatedAt: string
}

/** What one role may do in one module.
 *
 *  DELIBERATELY THE SAME VOCABULARY AS THE MODULE ITSELF. A module
 *  already declares what CAN be done in it (`ModuleDef.capabilities`);
 *  this says which of those a role actually gets. Access can therefore
 *  never exceed the module — granting `quote` to a role in a module
 *  that cannot quote is not a smaller permission, it is a
 *  contradiction, and sharing one vocabulary is what makes that
 *  checkable rather than a convention.
 *
 *  ABSENT MEANS UNRESTRICTED. A module with no `access` behaves
 *  exactly as it did before this existed. Access is something a dealer
 *  turns on when more than one kind of person uses the system — not a
 *  wall every new module starts behind. */
export interface ModuleAccess {
  roleId: string
  /** a subset of the module's own capabilities */
  capabilities: ModuleCapability[]
}

export const canBeModuleMaster = (e: EntityDef): boolean => e.role !== 'join'

/** How a single related row was decided, so the page can always answer
 *  "why is this here?" / "why is this missing?".
 *  - 'rule'    the rule matched it
 *  - 'added'   a person pinned it in despite the rule
 *  - 'removed' a person took it out; kept as a row so it can be restored */
export type PairOrigin = 'rule' | 'added' | 'removed'

export const PAIR_ORIGIN_FIELD = '__origin'
export const PAIR_RECOMMENDED_FIELD = '__recommended'
/** Display order within a block — the order the salesperson sees. */
export const PAIR_ORDER_FIELD = '__order'

/** The three columns every curated join carries. They are created with
 *  these exact ids so a pair row can be read without a name lookup, and
 *  they are locked in the grid like the UID column. */
export const PAIR_FIELDS: ReadonlyArray<{ id: string; name: string; type: FieldType }> = [
  { id: PAIR_ORIGIN_FIELD, name: 'Origin', type: 'text' },
  { id: PAIR_RECOMMENDED_FIELD, name: 'Recommended', type: 'boolean' },
  { id: PAIR_ORDER_FIELD, name: 'Order', type: 'number' },
]

export const isPairFieldId = (fieldId: string): boolean =>
  fieldId === PAIR_ORIGIN_FIELD ||
  fieldId === PAIR_RECOMMENDED_FIELD ||
  fieldId === PAIR_ORDER_FIELD

export interface RuleEdge {
  id: string
  source: string
  target: string
  /** condition → a branch id or ELSE_HANDLE; loop → 'body' | 'next';
   *  everything else → 'out' */
  sourceHandle?: string
}

/** Default config for a freshly dropped node of each kind.
 *  Built fresh on every call — two nodes must never share a clauses array. */
export function defaultRuleNodeConfig<K extends RuleNodeKind>(
  kind: K,
): RuleNodeConfigMap[K] {
  const defaults: { [P in RuleNodeKind]: RuleNodeConfigMap[P] } = {
    start: {},
    match: {
      targetEntityId: '',
      group: { combinator: 'AND', clauses: [] },
      emptyBehavior: 'skip',
    },
    condition: { branches: [] },
    filter: { group: { combinator: 'AND', clauses: [] } },
    find: { viaFieldId: '' },
    loop: { source: { kind: 'entity', entityId: '' } },
    action: { action: { op: 'flag', label: 'Flagged', tone: 'info' } },
    output: { label: 'Result' },
  }
  return defaults[kind]
}

export interface RuleNodeKindMeta {
  label: string
  tag: string
  cssVar: string
  blurb: string
}

/** Palette metadata — label, mono tag, ink, and the one-line explanation
 *  shown in the palette and the node inspector. */
export const RULE_NODE_KINDS: Record<RuleNodeKind, RuleNodeKindMeta> = {
  start: {
    label: 'Start',
    tag: 'RUN',
    cssVar: 'var(--accent-graphite)',
    blurb: 'Where the rule begins — walks each row of the chosen entity.',
  },
  match: {
    label: 'Match',
    tag: 'FIT',
    cssVar: 'var(--accent-carmine)',
    blurb:
      'Find the rows of another entity that fit this one — a boat’s min/max HP against every motor’s HP.',
  },
  condition: {
    label: 'Condition',
    tag: 'IF',
    cssVar: 'var(--accent-ochre)',
    blurb: 'Route rows down different paths depending on what they contain.',
  },
  filter: {
    label: 'Filter',
    tag: 'WHR',
    cssVar: 'var(--accent-teal)',
    blurb: 'Keep only the rows that match — the rest stop here.',
  },
  find: {
    label: 'Find linked',
    tag: 'LNK',
    cssVar: 'var(--accent-blue)',
    blurb: 'Follow a link to the related row and carry it forward.',
  },
  loop: {
    label: 'For each',
    tag: 'LOOP',
    cssVar: 'var(--accent-violet)',
    blurb: 'Repeat the body once per row in a collection.',
  },
  action: {
    label: 'Action',
    tag: 'DO',
    cssVar: 'var(--accent-viridian)',
    blurb: 'Set a value, create a row, or flag what you found.',
  },
  output: {
    label: 'Output',
    tag: 'OUT',
    cssVar: 'var(--accent-carmine)',
    blurb: 'Collect the row into a named result set you can view as a table.',
  },
}

export interface RuleDef {
  id: string
  name: string
  description?: string
  /** the entity this rule runs against */
  rootEntityId: string
  enabled: boolean
  nodes: RuleNode[]
  edges: RuleEdge[]
  createdAt: string
  updatedAt: string
}

/* ---------------------------------------------------------- */
/* Project meta + export format                               */
/* ---------------------------------------------------------- */

export interface ProjectMeta {
  id: 'default'
  name: string
  /** set once during onboarding; absent means onboarding has not run */
  org?: OrgProfile
  /** bumps every export — shown as REV in the title block */
  exportCount: number
  updatedAt: string
}

export const EXPORT_KIND = 'helmlogic-dynamic-config' as const
/* VERSION 2 CARRIES THE DESIGN WORK, and that is the whole reason it
   moved. Version 1 held tables, zones, rules and rows — everything the
   SEED produces and nothing a PERSON makes. So the file the export card
   calls "Everything" carried none of the modules an admin built, none of
   the view pages they curated, none of their quotes and none of their
   business rules, and a round trip silently dropped all four.

   Nothing anybody designs could leave the browser it was made in. That
   is a strange thing to be true of a configurator whose entire purpose
   is letting a dealer design their own system.

   A v1 file still imports: every added key is optional and an older
   file simply arrives with none of them. A v2 file opened by an older
   build is refused by the version check rather than silently losing
   half of itself, which is the correct failure. */
export const EXPORT_VERSION = 2 as const

export interface ProjectExport {
  kind: typeof EXPORT_KIND
  version: typeof EXPORT_VERSION
  exportedAt: string
  project: { name: string; rev: number }
  entities: EntityDef[]
  groups: GroupDef[]
  rules: RuleDef[]
  /** present when "include data" was chosen; keyed by entityId */
  rows?: Record<string, RowData[]>

  /* -- v2: the things a person makes, rather than the seed ---- */

  /** the organisation, so an imported set knows whose it is rather than
   *  arriving unnamed and sending the shell back to onboarding */
  org?: OrgProfile
  /** the pages that say what goes with what */
  views?: ViewDef[]
  /** the places in the business, in dashboard order */
  modules?: ModuleDef[]
  /** limits every row must keep, including the workbook-derived ones a
   *  person has since edited or switched off */
  constraints?: ConstraintDef[]
}

/* ---------------------------------------------------------- */
/* Helpers                                                    */
/* ---------------------------------------------------------- */

/* ---------------------------------------------------------- */
/* System columns                                             */
/* ---------------------------------------------------------- */

/** Every row already carries a unique id. Surfacing it as a locked
 *  system column gives every entity a real primary key by default —
 *  visible, referenceable and exported, but never renamed, retyped,
 *  reordered or deleted, and never typed into. Keeping it OUT of
 *  `EntityDef.fields` means it costs no storage, cannot collide with
 *  a user field name, and never trips the schema linter. */
export const UID_FIELD_ID = '__uid'

export const UID_FIELD: Readonly<FieldDef> = Object.freeze({
  id: UID_FIELD_ID,
  name: 'UID',
  type: 'text' as FieldType,
  required: true,
  description: 'System identifier — unique per row, assigned when the row is created.',
})

/* ============================================================
   DISCONTINUED NEVER REACHES A SALESPERSON.

   The workbook records what a dealer USED to sell as well as what
   they sell now — the Boat Module keeps everything below its own
   `OBSOLETE MODELS` divider at row 1005, and the Trailer Module
   still carries stock that is no longer available. That history is
   worth keeping: it is what an old quote was written against, and
   deleting it would make yesterday's documents unreadable.

   But 30 live pairings offer a discontinued trailer and EIGHT of
   them offer it as the boat's STANDARD fit. Somebody would have
   quoted it.

   So the rule is: the data stays, and no surface a customer can see
   ever offers it. One boolean, on the row, because a product is
   discontinued individually — and one on the table, because
   sometimes an entire relationship is (Surtees x OBSOLETE
   Trailers is a whole join of nothing but retired stock).

   It is a NORMAL BOOLEAN COLUMN, not a hidden flag: a person can
   see it in the grid, sort by it, and change it. A dealer who
   brings a model back does so by typing in a cell, not by asking
   for a developer.
   ============================================================ */
export const DISCONTINUED_FIELD_ID = '__discontinued'

export const DISCONTINUED_FIELD: Readonly<FieldDef> = Object.freeze({
  id: DISCONTINUED_FIELD_ID,
  name: 'Discontinued',
  type: 'boolean' as FieldType,
  description:
    'No longer sold. The row is kept — old quotes were written against it — but it is never offered on a page a customer sees.',
})

/** Is this row still sellable? Everything customer-facing asks this:
 *  the module index, a view page's blocks, the pickers a quote adds
 *  from. The sheet itself does NOT ask — the sheet is where a person
 *  maintains their data, and hiding rows from the person who has to
 *  fix them is how data rots unseen. */
export const isDiscontinued = (row: RowData): boolean =>
  row.values[DISCONTINUED_FIELD_ID] === true

/** A whole table that is history rather than stock. Same reasoning as
 *  the row flag, one level up: the join survives so an old document
 *  still resolves, and nothing offers it. */
export const isRetired = (entity: EntityDef): boolean => entity.retired === true

export const isSystemFieldId = (fieldId: string): boolean => fieldId === UID_FIELD_ID

/** The entity's columns as a user sees them: UID first, then their own. */
export function visibleFields(entity: EntityDef): FieldDef[] {
  return [UID_FIELD as FieldDef, ...entity.fields]
}

/** Read a cell by field id, resolving system columns.
 *  Formula fields are not stored, so they are absent here by design —
 *  compute those through '@/lib/formula'. */
export function readCell(row: RowData, fieldId: string): CellValue {
  if (isSystemFieldId(fieldId)) return row.id
  return row.values[fieldId] ?? null
}

export function displayFieldOf(entity: EntityDef): FieldDef | undefined {
  if (entity.displayFieldId) {
    const f = entity.fields.find((f) => f.id === entity.displayFieldId)
    if (f) return f
  }
  return entity.fields.find((f) => f.type !== 'formula') ?? entity.fields[0]
}

/** Label for a row using the entity's display field. */
export function rowLabel(entity: EntityDef, row: RowData): string {
  const f = displayFieldOf(entity)
  const v = f ? row.values[f.id] : null
  if (v === null || v === undefined || v === '') return `(untitled ${entity.name.toLowerCase()})`
  return String(v)
}
