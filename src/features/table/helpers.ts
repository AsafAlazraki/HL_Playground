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
/** The floor FIT COLUMNS works to.
 *
 *  `MIN_COL_W` is the floor for a column you are READING, and it is
 *  the only floor a drag ever obeys. It cannot also be the floor for
 *  FIT: fifty-eight columns at 76px is 4,408px of sheet, which fits no
 *  window ever made, so "fit every column on screen" and "never go
 *  below 76px" are not both satisfiable. FIT therefore works to its
 *  own dense floor — narrow enough to get the whole register on one
 *  screen, wide enough that a figure still shows its first characters
 *  and a heading still shows its first letters. Seeing the table's
 *  shape is the job; reading it is what one press back is for. */
export const FIT_MIN_COL_W = 28
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
