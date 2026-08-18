# TABLE CORE API — the seam

`src/features/table/core/` is **pure TypeScript**: no React, no DOM, no store.
It is built by one agent; the visual grid in `src/features/table/` is built by
another against exactly this contract. Neither edits the other's files.

Read `TABLE_SPEC.md` first — it defines the behaviour these primitives serve.

```ts
/* ---------- geometry ---------- */
export interface CellRef { row: number; col: number }      // view coordinates
export interface Range { anchor: CellRef; focus: CellRef }  // inclusive both ends

export interface NormalRange { r0: number; r1: number; c0: number; c1: number }
export function normalizeRange(r: Range): NormalRange
export function rangeContains(r: Range, cell: CellRef): boolean
export function rangeCells(r: Range): CellRef[]
export function clampCell(c: CellRef, rows: number, cols: number): CellRef

/* ---------- keyboard ---------- */
export interface KeyContext {
  key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean
  editing: boolean
  rows: number; cols: number
  active: CellRef; range: Range
  pageSize: number          // rows per viewport, for PageUp/PageDown
}

export type GridCommand =
  | { kind: 'move'; active: CellRef; range: Range }        // selection change
  | { kind: 'edit-start'; cell: CellRef; seed?: string }   // seed = typed char (replace mode)
  | { kind: 'edit-commit'; move: 'down' | 'up' | 'right' | 'left' | 'none' }
  | { kind: 'edit-cancel' }
  | { kind: 'clear-range'; range: Range }
  | { kind: 'copy'; range: Range; cut: boolean }
  | { kind: 'paste' }
  | { kind: 'fill-down'; range: Range }
  | { kind: 'select-all' }
  | { kind: 'none' }                                        // not handled — let it bubble

/** Maps a keydown to an intent. Pure; the component performs the effect.
 *  Implements every binding in TABLE_SPEC.md §1 (arrows, ctrl+arrow jump-to-edge,
 *  tab wrap, enter/shift-enter, escape, printable-char replace, F2, delete,
 *  home/end, ctrl+home/end, page up/down, ctrl+a/c/x/v/d). */
export function resolveKey(ctx: KeyContext): GridCommand

/** True when a keydown should start replace-mode editing (single printable
 *  char, no ctrl/meta). Exposed so the component can ignore dead keys. */
export function isPrintableKey(key: string): boolean

/* ---------- clipboard, and the file dialect of the same codec ---------- */
export function serializeTsv(cells: string[][]): string
export function parseTsv(text: string): string[][]

/** The same codec for any single-character delimiter. The clipboard is
 *  tab-separated; a `.csv` file handed to Excel is comma-separated, and
 *  nothing else about the two dialects differs — same quoting rule, same
 *  doubled inner quote, same accepted line endings, same "a trailing
 *  terminator is not a row". `@/features/io/csv` is the file caller. */
export function serializeDelimited(cells: string[][], delimiter: string): string
export function parseDelimited(text: string, delimiter: string): string[][]

export type CoerceResult =
  | { ok: true; value: CellValue }
  | { ok: false; reason: string }

/** Text -> typed cell value for one field. Handles: number parsing (strips
 *  currency symbols, thousands separators, %), boolean words
 *  (true/false/yes/no/y/n/1/0), dates (ISO and DD/MM/YYYY -> ISO),
 *  select matched case-insensitively to an option (returns canonical casing),
 *  reference matched case-insensitively against `refRowLabels` (label -> rowId),
 *  text passthrough. Empty string -> { ok: true, value: null }. */
export function coerceCellText(
  text: string,
  field: FieldDef,
  refRowLabels?: Map<string, string>,   // lowercased label -> row id
): CoerceResult

/** Value -> display/clipboard text (inverse of the above, for copy). */
export function cellToText(
  value: CellValue,
  field: FieldDef,
  refRowLabel?: (rowId: string) => string | undefined,
): string

/** Number display per spec: <=4 decimals, trailing zeros trimmed. */
export function formatNumber(n: number): string

/* ---------- sort / filter / search ---------- */
export type SortDir = 'asc' | 'desc'
export interface SortState { fieldId: string; dir: SortDir }

export type ColumnFilter =
  | { kind: 'values'; fieldId: string; selected: string[] }   // select/boolean/reference
  | { kind: 'contains'; fieldId: string; text: string }       // text/number/date

export interface ViewRow {
  rowId: string
  /** ALL field values incl. computed formula results, keyed by fieldId —
   *  the caller supplies these (it owns the formula engine + store). */
  values: Record<string, CellValue>
  /** display text per fieldId, used for search/filter/sort of refs & formulas */
  text: Record<string, string>
}

/** Applies filters, then search, then sort. Pure and stable:
 *  equal sort keys preserve input order. Sorting compares by field type
 *  (numeric, date, boolean, then text via localeCompare); nulls always last
 *  regardless of direction. */
export function applyView(
  rows: ViewRow[],
  fields: FieldDef[],
  opts: { sort?: SortState | null; filters?: ColumnFilter[]; search?: string },
): ViewRow[]

/** Distinct display values for a column's filter menu, in first-seen order. */
export function distinctValues(rows: ViewRow[], fieldId: string): string[]
```

Notes binding both agents:

- View coordinates are **post-sort/filter row indices** and **visible column
  indices**. The component maps them to `rowId` / `fieldId`; core never sees ids
  except inside `ViewRow`/`FieldDef`.
- `resolveKey` must be total: any unhandled key returns `{kind:'none'}`.
- Nothing in core imports React, the store, Dexie, or the formula engine —
  only `@/types/model` types.
- Every exported function is deterministic and side-effect free.
