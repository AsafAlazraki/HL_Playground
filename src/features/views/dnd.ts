/* ============================================================
   VIEWS — drag and drop.

   Two payloads, deliberately distinct so a drag can never be
   mistaken for the other:

   1. VIEW_DND_MIME carries a TABLE ID. The left panel writes it on
      `onDragStart`; the view page answers `onDragOver` with
      `isTableDrag` and, on drop, relates that table. This is NOT
      `TABLE_DND_MIME` (tablekit), which carries a table KIND and
      means "make me a new table" — a different sentence entirely.

   2. VIEW_ROW_DND_MIME carries a related ROW inside one block, for
      reordering. Scoped by block id so a row can never be dropped
      into a block it does not belong to.
   ============================================================ */

import type { DragEvent as ReactDragEvent } from 'react'

/** A drag carrying an existing table's id, to relate it to a view. */
export const VIEW_DND_MIME = 'application/x-helmlogic-view-table'

/** A drag carrying `${blockId}|${rowId}`, for reordering inside a block. */
export const VIEW_ROW_DND_MIME = 'application/x-helmlogic-view-row'

/* ---------------------------------------------------------- */
/* Tables                                                     */
/* ---------------------------------------------------------- */

/** Anything that offers a table to a view calls this from `onDragStart`. */
export function setTableDragData(
  event: ReactDragEvent<Element>,
  tableId: string,
): void {
  event.dataTransfer.setData(VIEW_DND_MIME, tableId)
  /* text/plain fallback: some browsers only expose a payload during
     dragover when a standard type is present */
  event.dataTransfer.setData('text/plain', tableId)
  event.dataTransfer.effectAllowed = 'copy'
}

/** True when this drag is carrying a table — for `onDragOver`. */
export function isTableDrag(event: ReactDragEvent<Element>): boolean {
  return Array.from(event.dataTransfer.types).includes(VIEW_DND_MIME)
}

/** The table id a drop is carrying, or null when it carries something else. */
export function readTableDrag(event: ReactDragEvent<Element>): string | null {
  const raw =
    event.dataTransfer.getData(VIEW_DND_MIME) || event.dataTransfer.getData('text/plain')
  const id = raw.trim()
  return id === '' ? null : id
}

/* ---------------------------------------------------------- */
/* Rows (reorder)                                             */
/* ---------------------------------------------------------- */

export function setRowDragData(
  event: ReactDragEvent<Element>,
  blockId: string,
  rowId: string,
): void {
  event.dataTransfer.setData(VIEW_ROW_DND_MIME, `${blockId}|${rowId}`)
  event.dataTransfer.effectAllowed = 'move'
}

export function isRowDrag(event: ReactDragEvent<Element>): boolean {
  return Array.from(event.dataTransfer.types).includes(VIEW_ROW_DND_MIME)
}

/** The dragged row, but only when it came from `blockId`. */
export function readRowDrag(
  event: ReactDragEvent<Element>,
  blockId: string,
): string | null {
  const raw = event.dataTransfer.getData(VIEW_ROW_DND_MIME)
  if (!raw) return null
  const bar = raw.indexOf('|')
  if (bar < 0) return null
  if (raw.slice(0, bar) !== blockId) return null
  const rowId = raw.slice(bar + 1)
  return rowId === '' ? null : rowId
}
