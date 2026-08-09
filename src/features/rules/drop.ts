/* ============================================================
   Palette → canvas drag and drop (HTML5 DnD).

   The palette writes a kind onto the drag; the canvas hands the
   drop event and a flow-space point back here, and the node is
   added through the store. The canvas never constructs a node.
   ============================================================ */

import type { DragEvent as ReactDragEvent } from 'react'
import { RULE_NODE_KINDS } from '@/types/model'
import type { RuleNode, RuleNodeKind, XY } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'

export const RULE_DND_MIME = 'application/x-helmlogic-rule-node'

/** Canvas snap grid — matches the whiteboard's 16px. */
const GRID = 16

/** Plate geometry, so a dropped node lands centred under the cursor.
 *  Plates are 280px wide (see rule-nodes.css) and grow downward. */
const PLATE_W = 280
const PLATE_GRAB_Y = 22

/** Left-to-right pitch between plates — one plate plus a clear gutter. */
const PLATE_PITCH = 320

const isRuleNodeKind = (v: string): v is RuleNodeKind =>
  Object.prototype.hasOwnProperty.call(RULE_NODE_KINDS, v)

export function setPaletteDragData(
  event: ReactDragEvent<Element>,
  kind: RuleNodeKind,
): void {
  event.dataTransfer.setData(RULE_DND_MIME, kind)
  /* text/plain fallback: some browsers only expose a payload during
     dragover if a standard type is present */
  event.dataTransfer.setData('text/plain', kind)
  event.dataTransfer.effectAllowed = 'copy'
}

/** True when this drag is carrying a rule node — for `onDragOver`. */
export function isPaletteDrag(event: ReactDragEvent<Element>): boolean {
  return Array.from(event.dataTransfer.types).includes(RULE_DND_MIME)
}

export function readPaletteKind(
  event: ReactDragEvent<Element>,
): RuleNodeKind | null {
  const raw =
    event.dataTransfer.getData(RULE_DND_MIME) ||
    event.dataTransfer.getData('text/plain')
  return raw && isRuleNodeKind(raw) ? raw : null
}

const snap = (n: number): number => Math.round(n / GRID) * GRID

/**
 * Handle a palette drop on the canvas.
 * `position` is the point under the cursor in FLOW space
 * (`screenToFlowPosition`); the plate is centred on it and snapped
 * to the 16px grid. Returns the created node, or null when the drag
 * carried something else.
 */
export function onPaletteDrop(
  event: ReactDragEvent<Element>,
  ruleId: string,
  position: XY,
): RuleNode | null {
  const kind = readPaletteKind(event)
  if (!kind) return null
  event.preventDefault()
  return addRuleNodeAt(ruleId, kind, position)
}

/**
 * Add a node centred on a point in FLOW space — the click-to-drop path,
 * and the shared arithmetic behind `onPaletteDrop`.
 *
 * The palette strip's chips are clickable as well as draggable: the host
 * hands the flow-space centre of its viewport
 * (`rf.screenToFlowPosition({ x: rect.width / 2, y: rect.height / 2 })`)
 * and the plate lands centred there, snapped to the 16px grid.
 */
export function addRuleNodeAt(
  ruleId: string,
  kind: RuleNodeKind,
  position: XY,
): RuleNode | null {
  return useProjectStore.getState().addRuleNode(ruleId, kind, {
    x: snap(position.x - PLATE_W / 2),
    y: snap(position.y - PLATE_GRAB_Y),
  })
}

/** Where a click-to-add node goes when the host offers no viewport centre:
 *  to the right of the last one drafted, one plate pitch along. */
export function nextNodePosition(ruleId: string): XY {
  const rule = useProjectStore.getState().rules[ruleId]
  const last = rule?.nodes[rule.nodes.length - 1]
  if (!last) return { x: 64, y: 64 }
  return { x: snap(last.position.x + PLATE_PITCH), y: snap(last.position.y) }
}
