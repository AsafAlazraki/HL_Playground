/* ============================================================
   Table core — keyboard.

   `resolveKey` maps one keydown to one intent. It is TOTAL: anything
   not in TABLE_SPEC.md §1 returns { kind: 'none' } so the component
   can let the event bubble.

   Nothing here touches the DOM — the caller reads the flags off the
   KeyboardEvent and performs the effect.
   ============================================================ */
import type { CellRef, Range } from './geometry'
import { clampCell, singleCell } from './geometry'

export interface KeyContext {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
  editing: boolean
  rows: number
  cols: number
  active: CellRef
  range: Range
  /** rows per viewport, for PageUp / PageDown */
  pageSize: number
}

export type GridCommand =
  | { kind: 'move'; active: CellRef; range: Range }
  | { kind: 'edit-start'; cell: CellRef; seed?: string }
  | { kind: 'edit-commit'; move: 'down' | 'up' | 'right' | 'left' | 'none' }
  | { kind: 'edit-cancel' }
  | { kind: 'clear-range'; range: Range }
  | { kind: 'copy'; range: Range; cut: boolean }
  | { kind: 'paste' }
  | { kind: 'fill-down'; range: Range }
  | { kind: 'select-all' }
  | { kind: 'none' }

const NONE: GridCommand = { kind: 'none' }

/** True when a keydown should start replace-mode editing: exactly one
 *  printable character. Rejects every named key ('ArrowLeft', 'F5',
 *  'Process', 'Unidentified', 'Dead') because those are longer than one
 *  code point, and rejects C0/C1 control characters. Modifier state is
 *  NOT considered here — `resolveKey` owns that rule. */
export function isPrintableKey(key: string): boolean {
  // Array.from counts code points, so an astral char (emoji) is length 1
  // while 'Dead' / 'Tab' / 'F12' are 4 / 3 / 3.
  const points = Array.from(key)
  if (points.length !== 1) return false
  const code = key.codePointAt(0)
  if (code === undefined) return false
  if (code < 0x20) return false // C0 controls
  if (code >= 0x7f && code <= 0x9f) return false // DEL + C1 controls
  return true
}

/** Selection change. `extend` keeps the anchor pinned (shift+move) —
 *  only the focus, which is always the new active cell, travels. */
function moveTo(ctx: KeyContext, target: CellRef, extend: boolean): GridCommand {
  const next = clampCell(target, ctx.rows, ctx.cols)
  if (!extend) return { kind: 'move', active: next, range: singleCell(next) }
  const anchor = clampCell(ctx.range.anchor, ctx.rows, ctx.cols)
  return { kind: 'move', active: next, range: { anchor, focus: next } }
}

export function resolveKey(ctx: KeyContext): GridCommand {
  const { key, ctrl, shift, alt, meta, editing, active } = ctx
  // Cmd on macOS stands in for Ctrl everywhere.
  const mod = ctrl || meta

  /* ---------- editing: the input owns the keyboard ----------
     While an editor is mounted only Enter / Shift+Enter / Escape / Tab
     mean anything to the grid. Arrows, Home/End, Delete and printable
     characters MUST fall through as 'none' so the caret behaves like a
     normal text input. */
  if (editing) {
    if (key === 'Escape') return { kind: 'edit-cancel' }
    if (alt || mod) return NONE
    if (key === 'Enter') return { kind: 'edit-commit', move: shift ? 'up' : 'down' }
    if (key === 'Tab') return { kind: 'edit-commit', move: shift ? 'left' : 'right' }
    return NONE
  }

  /* ---------- ctrl/cmd + letter ----------
     Plain Ctrl only: Ctrl+Shift+C / Ctrl+Alt+V belong to the browser. */
  if (mod && !alt && !shift) {
    switch (key.toLowerCase()) {
      case 'a':
        return { kind: 'select-all' }
      case 'c':
        return { kind: 'copy', range: ctx.range, cut: false }
      case 'x':
        return { kind: 'copy', range: ctx.range, cut: true }
      case 'v':
        return { kind: 'paste' }
      case 'd':
        return { kind: 'fill-down', range: ctx.range }
      default:
        break
    }
  }

  // TABLE_SPEC.md §1 defines no Alt bindings — leave Alt+Arrow (browser
  // history), Alt+Tab and friends alone.
  if (alt) return NONE

  const pageSize = Math.max(1, Math.trunc(ctx.pageSize) || 1)

  switch (key) {
    /* ---------- arrows ----------
       Ctrl+Arrow is "jump to the edge of the data block" in Excel.
       KeyContext carries no data-awareness (core never sees values), so
       we jump to the first/last row/column of the GRID instead. This is
       the documented simplification: for a fully-populated grid the two
       are identical; for a sparse one the jump overshoots the block. */
    case 'ArrowUp':
      return moveTo(ctx, { row: mod ? 0 : active.row - 1, col: active.col }, shift)
    case 'ArrowDown':
      return moveTo(ctx, { row: mod ? ctx.rows - 1 : active.row + 1, col: active.col }, shift)
    case 'ArrowLeft':
      return moveTo(ctx, { row: active.row, col: mod ? 0 : active.col - 1 }, shift)
    case 'ArrowRight':
      return moveTo(ctx, { row: active.row, col: mod ? ctx.cols - 1 : active.col + 1 }, shift)

    /* ---------- tab ----------
       TAB LEAVES. This used to walk cell-to-cell like Excel, and
       because the walk `preventDefault`s every press — including the
       one at the last cell, where `nextTabCell` returns the cell it
       was already on — the register was a KEYBOARD TRAP. Measured in
       Chromium on the Formosa table: Tab and Shift+Tab both consumed,
       indefinitely, in both directions. There was no keyboard way out
       of the app's main working screen at all.

       THE ROLE ALREADY SAID WHAT SHOULD HAPPEN. `.tb-grid` is
       `role="grid"` with one `tabIndex={0}`, which promises assistive
       technology exactly one thing: arrows move between cells, Tab
       moves out of the widget. Arrows, Home/End, PageUp/PageDown and
       Ctrl+Arrow all already do the moving here — nothing a person
       could do with Tab is lost, it is spelled with a different key.

       EXCEL'S TAB IS KEPT WHERE IT IS ACTUALLY USED. The `editing`
       branch above still reads Tab as commit-and-move-right, so
       type-Tab-type-Tab data entry across a row is untouched; it is
       only bare Tab on a selection that now hands the keystroke back
       to the browser. The two cell-wrapping helpers this case used to
       call went with it: `edit-commit` carries a direction and
       `moveActive` takes the step, so nothing else read them. */
    case 'Tab':
      return NONE

    /* ---------- enter ----------
       Not editing: Excel moves the cursor down (up with Shift) rather
       than opening the editor. Commit-and-move is the `editing` branch. */
    case 'Enter':
      if (mod) return NONE
      return moveTo(ctx, { row: active.row + (shift ? -1 : 1), col: active.col }, false)

    /* ---------- escape ----------
       Nothing to revert when not editing. Explicitly NOT a clear: it
       bubbles so the component can close a filter menu or drop a
       copy marquee. */
    case 'Escape':
      return NONE

    case 'F2':
      return mod ? NONE : { kind: 'edit-start', cell: active }

    case 'Delete':
    case 'Backspace':
      return mod ? NONE : { kind: 'clear-range', range: ctx.range }

    case 'Home':
      return moveTo(ctx, mod ? { row: 0, col: 0 } : { row: active.row, col: 0 }, shift)
    case 'End':
      return moveTo(
        ctx,
        mod
          ? { row: ctx.rows - 1, col: ctx.cols - 1 }
          : { row: active.row, col: ctx.cols - 1 },
        shift,
      )

    case 'PageUp':
      return moveTo(ctx, { row: active.row - pageSize, col: active.col }, shift)
    case 'PageDown':
      return moveTo(ctx, { row: active.row + pageSize, col: active.col }, shift)

    default:
      break
  }

  /* ---------- printable character: replace-mode edit ----------
     Guarded against Ctrl/Meta combos (Ctrl+C must never type 'c'),
     'Dead' keys and every multi-character key name. */
  if (!mod && !alt && isPrintableKey(key)) {
    return { kind: 'edit-start', cell: active, seed: key }
  }

  return NONE
}
