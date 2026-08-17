/* ============================================================
   Table helpers — grid geometry, selection shapes, cell text.

   Everything here is pure. The behavioural primitives (selection
   geometry, key resolution, TSV, coercion, view transforms) live in
   `@/features/table/core` and are never reimplemented here.
   ============================================================ */
import { isImageValue, isSystemFieldId, readCell } from '@/types/model'
import type {
  CellValue,
  FieldDef,
  FieldType,
  ImageRef,
  RowData,
} from '@/types/model'
import { newId } from '@/lib/id'
import { formatCell } from '@/features/views/columns'
import {
  cellToText,
  formatNumber,
  normalizeRange,
  rangeContains,
  type CellRef,
  type NormalRange,
  type Range as CellRange,
} from '@/features/table/core'

export type { CellRef, CellRange, NormalRange }

/* ---------------------------------------------------------- */
/* geometry                                                   */
/* ---------------------------------------------------------- */

/** Uniform row height. Spec asks for a consistent 32–36px. */
export const ROW_H = 34
/** A grouping line — structure, so a touch taller than a data row and
 *  drawn much quieter. */
export const GROUP_H = 36
/** The quiet + ROW at the foot of a group. Shorter than a data row so
 *  it reads as an invitation, not as an empty entry. */
export const ADD_H = 28
/** One step of nesting, per hierarchy level. */
export const INDENT_W = 18
/** Frozen header row height. */
export const HEAD_H = 44
/** The spanning band row that sits ABOVE the column headings, naming
 *  the sections. Drawn only when the table actually has bands, so a
 *  section-less register is exactly as tall as it always was. */
export const BAND_H = 26
/** Width a folded section keeps for its chip. Wide enough to read
 *  "PRICING · 4" and still a fifth of the columns it replaces. */
export const FOLD_W = 132
/** Frozen row-number gutter width. */
export const GUTTER_W = 48
/** Width of the + COLUMN plate at the right edge of the header row. */
export const ADD_COL_W = 40
export const MIN_COL_W = 76
export const MAX_COL_W = 560
/** THE COLUMN FLOOR, AND THERE IS ONLY ONE.
 *
 *  DESIGN_CONTRACT §2 records it as **116px**, with the row-number
 *  gutter and a system column exempt, and `table.css` enforces it in
 *  paint: `.tb-cell, .tb-th { min-width: 116px }`.
 *
 *  FIT used to work to a private floor of 28px, on the argument that
 *  "fit every column on screen" and "never go below the reading floor"
 *  are not both satisfiable. They are not — but the answer to that is
 *  not to break the floor, because the floor was measured and the
 *  promise was not. Two things were wrong with the private floor:
 *
 *  1. IT MADE THE CONTROL UNREADABLE. Measured on the live register at
 *     1280, one press of FIT drove every column to 39px and took the
 *     count of clipped values on Stacer from 26 to 119, clipping the
 *     band strip to "Id…", "Registr…", "Hull Only Pri…". A control
 *     called FIT that makes things unreadable is misnamed.
 *  2. IT MADE THE SHEET LIE ABOUT ITSELF. Only the layout MATHS went
 *     to 39px; `.tb-cell`'s CSS floor held the paint at 116px, so the
 *     spanning band header — which takes its widths from the maths and
 *     carries no min-width — drew 39px bands over 116px columns. The
 *     header row and the data rows were out of alignment for as long as
 *     a fit was on.
 *
 *  So FIT shares the window out and STOPS at the floor. When the floor
 *  binds, the sheet stays wider than the window and scrolls sideways —
 *  which the contract explicitly allows, and `TableSheet` says out loud
 *  in a note at the moment of the press rather than leaving the reader
 *  to discover it. Fitting as many columns as can be READ beats fitting
 *  all of them at a width where none of them can. */
export const FIT_MIN_COL_W = 116
/** Below this a column has no room for the heading's stamps or for the
 *  cell's --sp-3 inset — both drop to a hairline inset instead. A
 *  property of a NARROW COLUMN, not of fit mode, so a column dragged
 *  down to 80px reads the same way. */
export const TIGHT_COL_W = 112
/** Rows rendered either side of the viewport while windowing. */
export const OVERSCAN = 10
/** Below this many rows every row is rendered; above it we window. */
export const VIRTUALIZE_ABOVE = 150
/** Columns drawn either side of the window, per row.
 *
 *  Rows were windowed and columns never were, which is how a 520px
 *  card came to draw all fifty-nine columns of a register — 6 of them
 *  visible and 53 of them off the right-hand edge, on EVERY row. Two
 *  either side is enough that a sideways scroll never shows a gap
 *  before React has caught up, and cheap enough that the saving is
 *  still an order of magnitude. */
export const COL_OVERSCAN = 2

export const DEFAULT_COL_W: Record<FieldType, number> = {
  text: 184,
  number: 116,
  boolean: 88,
  date: 140,
  select: 152,
  reference: 184,
  formula: 136,
  /* a thumbnail strip: ~3 thumbs before it scrolls inside the cell */
  image: 184,
}

/** System columns (UID) carry a short mono id, not prose — they get
 *  less room than a text column so the first user column stays on
 *  screen. Still resizable like any other. */
export const SYSTEM_COL_W = 116

export const widthOf = (f: FieldDef, widths: Record<string, number>): number =>
  widths[f.id] ?? (isSystemFieldId(f.id) ? SYSTEM_COL_W : DEFAULT_COL_W[f.type])

export const clampWidth = (w: number): number =>
  Math.max(MIN_COL_W, Math.min(MAX_COL_W, Math.round(w)))

/** Left edge of every column (plus a final total), gutter excluded. */
export function colOffsets(
  fields: FieldDef[],
  widths: Record<string, number>,
): { x: number[]; total: number } {
  const x: number[] = []
  let acc = 0
  for (const f of fields) {
    x.push(acc)
    acc += widthOf(f, widths)
  }
  x.push(acc)
  return { x, total: acc }
}

/* ---------------------------------------------------------- */
/* selection shape                                            */
/* ---------------------------------------------------------- */

/** Where the active cell goes after an edit commits. */
export type MoveDir = 'down' | 'up' | 'right' | 'left' | 'none'

/** One active cell plus one-or-more ranges; the LAST range is the
 *  primary (the one keyboard extension and the fill handle act on). */
export interface GridSel {
  active: CellRef
  ranges: CellRange[]
}

/** The single live inline editor. `rowId`/`fieldId` are carried so a
 *  commit can never land on the wrong cell after a re-sort. */
export interface EditState {
  row: number
  col: number
  rowId: string
  fieldId: string
  draft: string
}

export const ORIGIN: CellRef = { row: 0, col: 0 }

export const singleSel = (cell: CellRef): GridSel => ({
  active: cell,
  ranges: [{ anchor: cell, focus: cell }],
})

export const primaryRange = (sel: GridSel): CellRange =>
  sel.ranges[sel.ranges.length - 1] ?? { anchor: sel.active, focus: sel.active }

export function selContains(sel: GridSel, cell: CellRef): boolean {
  for (const r of sel.ranges) if (rangeContains(r, cell)) return true
  return false
}

export const sameCell = (a: CellRef, b: CellRef): boolean =>
  a.row === b.row && a.col === b.col

/** Row indices whose every column is selected — the delete-rows set. */
export function fullySelectedRows(sel: GridSel, cols: number): number[] {
  if (cols === 0) return []
  const out = new Set<number>()
  for (const r of sel.ranges) {
    const n = normalizeRange(r)
    if (n.c0 !== 0 || n.c1 !== cols - 1) continue
    for (let i = n.r0; i <= n.r1; i += 1) out.add(i)
  }
  return [...out].sort((a, b) => a - b)
}

/** Column indices whose every row is selected — used to tint headers. */
export function fullySelectedCols(sel: GridSel, rows: number): Set<number> {
  const out = new Set<number>()
  if (rows === 0) return out
  for (const r of sel.ranges) {
    const n = normalizeRange(r)
    if (n.r0 !== 0 || n.r1 !== rows - 1) continue
    for (let i = n.c0; i <= n.c1; i += 1) out.add(i)
  }
  return out
}

/** Region a fill-handle sweep covers: the source block grown along
 *  whichever axis was dragged furthest (down or right only). */
export function fillTarget(base: NormalRange, to: CellRef): NormalRange {
  const downBy = Math.max(0, to.row - base.r1)
  const rightBy = Math.max(0, to.col - base.c1)
  if (downBy === 0 && rightBy === 0) return base
  if (downBy >= rightBy) return { ...base, r1: base.r1 + downBy }
  return { ...base, c1: base.c1 + rightBy }
}

/* ---------------------------------------------------------- */
/* cell text                                                  */
/* ---------------------------------------------------------- */

export const pad2 = (n: number): string => String(n).padStart(2, '0')

export const isEmptyCell = (v: CellValue | undefined): boolean =>
  v === null ||
  v === undefined ||
  v === '' ||
  /* a picture column with no pictures in it is empty, and a required
     one must earn the same red-pencil tick every other column gets */
  (isImageValue(v) && v.length === 0)

/* ---------------------------------------------------------- */
/* pictures                                                   */
/* ---------------------------------------------------------- */

/** A copy carrying fresh identities. Two rows must never share one
 *  ImageRef object — reordering one cell would silently reorder the
 *  other, and the primary would change on a row nobody touched. */
export const cloneImages = (v: readonly ImageRef[]): ImageRef[] =>
  v.map((img) => ({ ...img, id: newId() }))

/** Move one picture within the strip. Order IS the priority, so this
 *  is also how the primary is re-elected. */
export function moveImage(v: readonly ImageRef[], from: number, to: number): ImageRef[] {
  if (from === to || from < 0 || from >= v.length) return [...v]
  const next = [...v]
  const [held] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, held)
  return next
}

/** What a fill should actually write into `target`, or `undefined`
 *  when the pair makes no sense: pictures only ever land in a picture
 *  column (and land as copies), and nothing else ever lands in one. */
export function fillValueFor(v: CellValue, target: FieldDef): CellValue | undefined {
  if (isImageValue(v)) return target.type === 'image' ? cloneImages(v) : undefined
  return target.type === 'image' ? undefined : v
}

/** Tooltip copy for the formula engine's sentinel values. */
export const FORMULA_ERROR_TITLES: Record<string, string> = {
  '#ERROR':
    'Formula could not be evaluated — review the expression in the sheet view',
  '#CYCLE': 'Circular reference — this formula depends on its own result',
}

export const isFormulaError = (v: CellValue): v is string =>
  typeof v === 'string' && v in FORMULA_ERROR_TITLES

/** Display text of a computed (formula) value. */
export function formulaText(v: CellValue): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') return formatNumber(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

/** Display / clipboard text for any cell. Non-formula fields go
 *  through core's `cellToText` (the exact inverse of `coerceCellText`);
 *  formula results are already computed values, not stored ones. */
export function cellText(
  value: CellValue,
  field: FieldDef,
  refLabel?: (rowId: string) => string | undefined,
): string {
  if (field.type === 'formula') return formulaText(value)
  return cellToText(value, field, refLabel)
}

/* ============================================================
   WHAT A CELL PRINTS IS NOT WHAT A CELL COPIES.

   `cellText` above is the CLIPBOARD text and the exact inverse of
   `coerceCellText`, which is why it must keep printing 9097.1429:
   a copy → paste round-trip has to be lossless, the editor has to
   seed with the stored figure, and a person who types 41340 has to
   store 41340.

   What a DEALER reads is a different string. The register was
   printing `9097.1429` in a column called Landed Hull Cost — four
   decimal places, no currency mark, no thousands separator, in a
   figure that gets read aloud to a customer.

   There is exactly ONE money format in this app and it already lives
   in `@/features/views/columns`: the same formatter the view pages,
   the quote documents and the modules print with. This routes the
   grid through it. It does not write a second one.
   ============================================================ */

/** The text a cell PAINTS, given the text it would COPY.
 *
 *  Only the two numeric column kinds are re-printed — a text column
 *  that happens to hold digits is the author's own string and is
 *  never regrouped behind their back. A non-finite formula result
 *  keeps its raw text: a division by zero has to say so rather than
 *  print an empty cell. */
export function cellPrintText(
  field: FieldDef,
  value: CellValue,
  text: string,
): string {
  if (field.type !== 'number' && field.type !== 'formula') return text
  if (typeof value !== 'number' || !Number.isFinite(value)) return text
  return formatCell(field, value)
}

/** The value one column shows for one row.
 *
 *  System columns (the UID) deliberately live OUTSIDE `EntityDef.fields`
 *  and outside `row.values`, so they resolve through the model's own
 *  `readCell`. Every other column reads the map the caller already
 *  resolved — stored values, or computed ones for a formula field. */
export function valueForField(
  row: RowData,
  field: FieldDef,
  values: Record<string, CellValue>,
): CellValue {
  if (isSystemFieldId(field.id)) return readCell(row, field.id)
  return values[field.id] ?? null
}

/** Widest a character of a painted value can be assumed NOT to be.
 *
 *  A lower bound, deliberately: 12.5px Inter averages about 6.2px per
 *  character and the narrowest realistic average — an all-lowercase
 *  string of `i`, `l`, `t` — still clears 5. Used only as a GATE, so
 *  erring low means a title is offered on a cell that turned out to
 *  fit, never withheld from one that is cut. */
const NARROWEST_CHAR = 5.4

/** Is this value likely to be cut by a column this wide?
 *
 *  DESIGN_CONTRACT §3 allows an ellipsis where a value genuinely cannot
 *  fit — a register scrolls sideways and a column has a floor, so a
 *  44-character value in a 116px column is the honest outcome, not a
 *  defect. What is NOT allowed is the value being GONE: rule 10's
 *  "anything that cannot be done says why, where it is" has the same
 *  shape here, so a cut value carries the whole of itself as its
 *  cell's title.
 *
 *  `measure` is the painted width of the string, injected — pure, so
 *  this is testable without a canvas, and so the estimate below is only
 *  ever the fallback. THE ESTIMATE WAS NOT GOOD ENOUGH ON ITS OWN:
 *  measured on Rigging Kits at 1280, 216 of 468 cut values were passed
 *  as fitting, because `NARROWEST_CHAR` is calibrated on lower case and
 *  the register is full of upper case — "TILLER CONVERSION KITS" wants
 *  158px of its 141px box and the estimate scored it 119. Where the
 *  painted face is known it is measured instead; the character count
 *  survives only for the first frame, before a cell has been painted
 *  to read the face off.
 *
 *  `inset` is what the cell's own padding and rule cost — see
 *  `cellInsetW`, because it is not one number for every column. */
export function mayBeClipped(
  text: string,
  columnWidth: number,
  inset: number = CELL_INSET_W,
  measure?: (s: string) => number,
): boolean {
  if (text === '') return false
  const available = columnWidth - inset
  if (measure) return measure(text) > available - CLIP_SLACK
  return text.length * NARROWEST_CHAR > available
}

/** The last pixels the measurement cannot account for, spent on the side
 *  that offers a title rather than the side that withholds one.
 *
 *  Small, because the two real causes are named and charged where they
 *  belong instead: a picker's extra padding is in `cellInsetW`, and a
 *  figure's mono face is in `usePaintedWidth`. What is left is canvas
 *  metrics running about half a percent off the layout engine's, since
 *  `font-optical-sizing: auto` does not reach a canvas — 1.4px on a
 *  264px string, measured. Two of those, rounded up. */
const CLIP_SLACK = 3

/** What a cell's two `--sp-3` insets and its right-hand rule cost. */
export const CELL_INSET_W = 25

/** …and at `TIGHT_COL_W` the insets drop to `--sp-1` either side
 *  (`.tb-cell-tight`), which is 16px less. */
export const TIGHT_CELL_INSET_W = 9

/** …and a GROUPED register steps its first column in by 18px so the
 *  run of leaves reads as belonging to its drawer
 *  (`.tb-grid-grouped .tb-cell-lead`). Missing this is half of why
 *  `mayBeClipped` under-fired: the lead column of a grouped table has
 *  43px of inset, not 25, so a value with 18px to spare was scored as
 *  fitting when it was already cut. */
export const GROUP_LEAD_INSET_W = 18

/** …and a select or reference value keeps `--sp-2` clear on its right
 *  (`.tb-pick`), inside the inset every other cell has. This is where
 *  the other half of the misses were: the join tables are almost all
 *  reference columns, so "Yamaha - F115XB2 (White)" had 151px and its
 *  column said 159. */
export const PICK_INSET_W = 8

/** What one cell's own box costs the value inside it. Pure, and keyed
 *  on exactly the four things `table.css` keys its padding on. */
export function cellInsetW(opts: {
  /** the column's drawn width */
  w: number
  /** is this the register's first column, in a grouped register */
  groupedLead: boolean
  /** a select or a reference — `.tb-pick` */
  pick: boolean
  /** a picture strip sets its own padding and takes the full width */
  image: boolean
}): number {
  if (opts.image) return 0
  const base = opts.w < TIGHT_COL_W ? TIGHT_CELL_INSET_W : CELL_INSET_W
  return (
    base +
    (opts.groupedLead ? GROUP_LEAD_INSET_W : 0) +
    (opts.pick ? PICK_INSET_W : 0)
  )
}

/** Which of the three painted faces a column's values are drawn in —
 *  `GridCell`'s own `.tb-num` / `.tb-date` test, in one place so the
 *  measurement and the paint cannot disagree. */
export function valueFaceOf(field: FieldDef): 'text' | 'num' | 'date' {
  if (field.type === 'date') return 'date'
  if (field.type === 'number') return 'num'
  /* a worked-out value is `.tb-fx`, which is the same mono at the same
     12px as `.tb-num` whatever it worked out to */
  if (field.type === 'formula') return 'num'
  return 'text'
}

/** Marks (red-pencil corner ticks) are keyed per cell, not per index. */
export const markKey = (rowId: string, fieldId: string): string =>
  `${rowId} ${fieldId}`

/* ---------------------------------------------------------- */
/* misc                                                       */
/* ---------------------------------------------------------- */

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

/** Entities are always ordered by createdAt — deterministic, never
 *  Object.values order. Ties break on id so the order is total. */
export const byCreatedAt = <T extends { id: string; createdAt: string }>(
  a: T,
  b: T,
): number => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
