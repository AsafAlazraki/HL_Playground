/* ============================================================
   Table core — geometry.

   View coordinates only: `row` is a post-sort/filter row index and
   `col` a visible column index. Nothing here knows about rowIds or
   fieldIds — the component owns that mapping.

   Pure, deterministic, no DOM.
   ============================================================ */

/** A single cell in view coordinates. */
export interface CellRef {
  row: number
  col: number
}

/** A selection. Both ends are inclusive; `anchor` is where the
 *  selection started (it never moves while extending) and `focus`
 *  is the moving end — always the active cell. */
export interface Range {
  anchor: CellRef
  focus: CellRef
}

/** Range with the ends sorted: r0 <= r1, c0 <= c1. */
export interface NormalRange {
  r0: number
  r1: number
  c0: number
  c1: number
}

/** Sorts a range's ends so callers can iterate without min/max noise. */
export function normalizeRange(r: Range): NormalRange {
  const { anchor, focus } = r
  return {
    r0: Math.min(anchor.row, focus.row),
    r1: Math.max(anchor.row, focus.row),
    c0: Math.min(anchor.col, focus.col),
    c1: Math.max(anchor.col, focus.col),
  }
}

/** True when `cell` falls inside the (inclusive) range. */
export function rangeContains(r: Range, cell: CellRef): boolean {
  const n = normalizeRange(r)
  return cell.row >= n.r0 && cell.row <= n.r1 && cell.col >= n.c0 && cell.col <= n.c1
}

/** Every cell in the range, row-major (left→right, top→bottom). */
export function rangeCells(r: Range): CellRef[] {
  const n = normalizeRange(r)
  const out: CellRef[] = []
  for (let row = n.r0; row <= n.r1; row++) {
    for (let col = n.c0; col <= n.c1; col++) out.push({ row, col })
  }
  return out
}

/** Pins a cell inside a rows × cols grid. Degenerate grids (0 rows or
 *  0 columns) clamp to {0,0} rather than producing negative indices. */
export function clampCell(c: CellRef, rows: number, cols: number): CellRef {
  return {
    row: Math.max(0, Math.min(rows - 1, Math.trunc(c.row) || 0)),
    col: Math.max(0, Math.min(cols - 1, Math.trunc(c.col) || 0)),
  }
}

/* ---------- small conveniences (not part of the seam, but free) ---------- */

/** A collapsed range covering exactly one cell. */
export function singleCell(c: CellRef): Range {
  return { anchor: c, focus: c }
}

/** Reference equality by value. */
export function sameCell(a: CellRef, b: CellRef): boolean {
  return a.row === b.row && a.col === b.col
}
