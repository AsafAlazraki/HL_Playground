/* ============================================================
   Rail → sheet drag and drop, and where a new table lands.

   The rail writes a TableKind onto the drag. The canvas answers
   `onDragOver` with `isTableKindDrag`, and on drop reads the kind
   back and opens the two-question dialog with that kind already
   chosen and the drop point carried through — so a dragged table
   lands exactly where it was dropped, and a clicked one lands in
   the middle of what the user can see.
   ============================================================ */
import type { DragEvent as ReactDragEvent } from 'react'
import { TABLE_KINDS, type TableKind, type XY } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import {
  DEFAULT_TABLE_NODE_SIZE,
  getTableCanvasState,
} from '@/features/table/tableCanvasState'

export const TABLE_DND_MIME = 'application/x-helmlogic-table-kind'

/** Canvas snap grid — matches the whiteboard's 16px. */
const GRID = 16
/** Where the cursor is assumed to be holding the card: by its title bar. */
const GRAB_Y = 24

const isTableKind = (v: string): v is TableKind =>
  Object.prototype.hasOwnProperty.call(TABLE_KINDS, v)

/** Rail chips call this from `onDragStart`. */
export function setTableKindDragData(
  event: ReactDragEvent<Element>,
  kind: TableKind,
): void {
  event.dataTransfer.setData(TABLE_DND_MIME, kind)
  /* text/plain fallback: some browsers only expose a payload during
     dragover when a standard type is present */
  event.dataTransfer.setData('text/plain', kind)
  event.dataTransfer.effectAllowed = 'copy'
}

/** True when this drag is carrying a table kind — for `onDragOver`. */
export function isTableKindDrag(event: ReactDragEvent<Element>): boolean {
  return Array.from(event.dataTransfer.types).includes(TABLE_DND_MIME)
}

/** The kind a drop is carrying, or null when it is carrying something else. */
export function readTableKindDrag(
  event: ReactDragEvent<Element>,
): TableKind | null {
  const raw =
    event.dataTransfer.getData(TABLE_DND_MIME) ||
    event.dataTransfer.getData('text/plain')
  return raw && isTableKind(raw) ? raw : null
}

const snap = (n: number): number => Math.round(n / GRID) * GRID

/**
 * Turn a point in FLOW space (`rf.screenToFlowPosition({x: clientX, y: clientY})`)
 * into the table's top-left: centred horizontally under the cursor, held by
 * its title bar, snapped to the 16px grid. The canvas never does this
 * arithmetic itself.
 */
export function tablePositionAt(point: XY): XY {
  return {
    x: snap(point.x - DEFAULT_TABLE_NODE_SIZE.w / 2),
    y: snap(point.y - GRAB_Y),
  }
}

/* ---------------------------------------------------------- */
/* Where a CLICKED kind lands                                 */
/* ---------------------------------------------------------- */

/** Supplied by the canvas: the middle of the visible sheet, in flow space. */
type CentreProvider = () => XY

let centreProvider: CentreProvider | null = null

/**
 * A canvas may register this on mount to say where the middle of the
 * visible sheet is. Nothing has to: with no provider the sheet is read
 * off the page instead (below), and if there is no sheet on the page at
 * all the store falls back to its own cascade.
 */
export function setTableCentreProvider(fn: CentreProvider | null): void {
  centreProvider = fn
}

/**
 * The middle of the visible sheet, in flow space, read straight off the
 * rendered canvas: its box on screen, less the pan, over the zoom. The
 * arithmetic is the inverse of the transform the canvas is already
 * wearing, so this answers with whatever the user is actually looking at.
 */
function paintedSheetCentre(): XY | undefined {
  if (typeof document === 'undefined') return undefined
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
  const pane = viewport?.closest<HTMLElement>('.react-flow')
  if (!viewport || !pane) return undefined
  const box = pane.getBoundingClientRect()
  if (box.width < 1 || box.height < 1) return undefined

  let zoom = 1
  let panX = 0
  let panY = 0
  const transform = getComputedStyle(viewport).transform
  if (transform && transform !== 'none') {
    const m = new DOMMatrixReadOnly(transform)
    if (m.a) zoom = m.a
    panX = m.e
    panY = m.f
  }
  return { x: (box.width / 2 - panX) / zoom, y: (box.height / 2 - panY) / zoom }
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const hits = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/** One grid-aligned nudge, repeated until the new frame is not sitting
 *  on a table that is already there. */
const CLEAR_STEP = 48
const CLEAR_TRIES = 24

/**
 * The first spot at or past `from` where a new table would not land on
 * top of an existing one. Two 520px cards stacked on the navy read as
 * "nothing happened", which is worse than an off-centre table.
 */
function firstClearSpot(from: XY): XY {
  let taken: Rect[]
  try {
    const { entities } = useProjectStore.getState()
    const { sizes } = getTableCanvasState()
    taken = Object.values(entities).map((e) => ({
      x: e.position.x,
      y: e.position.y,
      ...(sizes[e.id] ?? DEFAULT_TABLE_NODE_SIZE),
    }))
  } catch {
    return from
  }
  let at = from
  for (let i = 0; i < CLEAR_TRIES; i += 1) {
    const frame: Rect = { x: at.x, y: at.y, ...DEFAULT_TABLE_NODE_SIZE }
    if (!taken.some((t) => hits(frame, t))) return at
    at = { x: at.x + CLEAR_STEP, y: at.y + CLEAR_STEP }
  }
  return at
}

/** The centre of the visible sheet, already turned into a table position
 *  and moved clear of the tables that are already on it. */
export function tableCentrePosition(): XY | undefined {
  try {
    const point = (centreProvider ? centreProvider() : undefined) ?? paintedSheetCentre()
    if (!point) return undefined
    return firstClearSpot(tablePositionAt(point))
  } catch {
    return undefined
  }
}
