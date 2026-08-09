/* ============================================================
   THE ONE SEAM ONTO `features/tablekit`.

   The left rail's table-type chips are draggable; the sheet has to
   accept them. Everything the canvas knows about that protocol goes
   through this file and nowhere else — `Whiteboard.tsx` never imports
   the tablekit directly — so if the drag contract shifts, it shifts in
   three lines here rather than inside the canvas.

   The kit owns the MIME type and the encoding (`TABLE_DND_MIME`,
   `isTableKindDrag`, `readTableKindDrag`). All this file adds is:

   - a React-event-shaped signature, because that is what the canvas
     actually holds in `onDragOver` / `onDrop`;
   - a narrowing back to `TableKind`, so a payload that grew a shape
     (a bare kind today, `{ kind, … }` tomorrow) still lands on a value
     the store's `createTable` will accept, and anything unrecognised
     is simply not a table drop.
   ============================================================ */

import { TABLE_KINDS } from '@/types/model'
import type { TableKind } from '@/types/model'
import {
  isTableKindDrag as kitIsTableKindDrag,
  readTableKindDrag as kitReadTableKindDrag,
} from '@/features/tablekit'

/** All the kit reads, and all either kind of drag event needs to carry —
 *  so the canvas can hand over the NATIVE event it listens for and a
 *  React synthetic one alike. */
export interface DragLike {
  dataTransfer: DataTransfer | null
}

/* Whatever the kit declares its parameter as — a React synthetic drag
   event or the native one. */
type KitDragEvent = Parameters<typeof kitIsTableKindDrag>[0]

const asKitEvent = (event: DragLike): KitDragEvent =>
  event as unknown as KitDragEvent

const isTableKind = (value: unknown): value is TableKind =>
  typeof value === 'string' && Object.hasOwn(TABLE_KINDS, value)

/** True when this drag is carrying a table type from the left rail. */
export function isTableKindDrag(event: DragLike): boolean {
  return kitIsTableKindDrag(asKitEvent(event))
}

/** The table type being dropped, or null when the drag is not one. */
export function readTableKindDrag(event: DragLike): TableKind | null {
  const payload: unknown = kitReadTableKindDrag(asKitEvent(event))
  if (isTableKind(payload)) return payload
  if (payload && typeof payload === 'object' && 'kind' in payload) {
    const { kind } = payload as { kind: unknown }
    if (isTableKind(kind)) return kind
  }
  return null
}
