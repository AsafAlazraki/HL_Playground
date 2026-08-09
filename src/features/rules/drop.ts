/* ============================================================
   Palette → canvas drag and drop (HTML5 DnD).

   The palette writes a kind onto the drag; the canvas hands the
   drop event and a flow-space point back here, and the node is
   added through the store. The canvas never constructs a node.

   NOTHING LANDS ON TOP OF SOMETHING ELSE. A clicked chip used to be
   given the CENTRE OF THE VIEWPORT, every time — so the second step a
   person added covered the first, the third covered the second, and
   after four clicks a rule of four plates was one plate with three
   underneath it and no way to reach them. The camera does not move on
   an add, so the point never changed. Two rules fix it for good:
   a clicked chip lands AFTER the step you are looking at (see
   `addRuleNodeAfter`), and any position — clicked or dropped — is
   walked clear of a plate that is already there.
   ============================================================ */

import type { DragEvent as ReactDragEvent } from 'react'
import { RULE_NODE_KINDS } from '@/types/model'
import type { RuleDef, RuleNode, RuleNodeKind, XY } from '@/types/model'
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
/** Top-to-bottom pitch, for when a row of plates has filled up. */
const PLATE_ROW = 240
/** Two plates this close are on top of each other, near enough. */
const CLEAR_X = 240
const CLEAR_Y = 120
/** How many plates go in a row before the walk drops to the next one. */
const ROW_LEN = 4

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
  const rule = useProjectStore.getState().rules[ruleId]
  const want = {
    x: snap(position.x - PLATE_W / 2),
    y: snap(position.y - PLATE_GRAB_Y),
  }
  return useProjectStore.getState().addRuleNode(ruleId, kind, clearOf(rule, want))
}

/** Where a click-to-add node goes when the host offers no viewport centre:
 *  to the right of the last one drafted, one plate pitch along. */
export function nextNodePosition(ruleId: string): XY {
  const rule = useProjectStore.getState().rules[ruleId]
  const last = rule?.nodes[rule.nodes.length - 1]
  if (!last) return { x: 64, y: 64 }
  return { x: snap(last.position.x + PLATE_PITCH), y: snap(last.position.y) }
}

/* ------------------------------------------------------------ */
/* Clicking a chip: the next step, after the one you are on      */
/* ------------------------------------------------------------ */

/** Plates whose single out-handle can only mean one thing, so a wire
 *  drawn from it needs no decision. A Route has named branches, a For
 *  each has a body and a next, and an Output ends the path — those are
 *  wired by hand, on purpose. */
const CHAINS_ON: readonly RuleNodeKind[] = ['start', 'match', 'filter', 'find', 'action']

/** Is anything already sitting here? */
function occupied(rule: RuleDef | undefined, at: XY): boolean {
  return (rule?.nodes ?? []).some(
    (n) => Math.abs(n.position.x - at.x) < CLEAR_X && Math.abs(n.position.y - at.y) < CLEAR_Y,
  )
}

/** The wanted spot, or the nearest one along the row that is empty:
 *  right, right, right, then down and back to the left. Bounded — a
 *  crowded rule gets a plate on top of another rather than a hang. */
function clearOf(rule: RuleDef | undefined, want: XY): XY {
  let at = want
  for (let i = 0; i < 5 * ROW_LEN && occupied(rule, at); i += 1) {
    at =
      i % ROW_LEN === ROW_LEN - 1
        ? { x: want.x, y: snap(at.y + PLATE_ROW) }
        : { x: snap(at.x + PLATE_PITCH), y: at.y }
  }
  return at
}

/**
 * Add a step the way a person adds one: AFTER the step they are looking
 * at. The plate lands one pitch to the right of `anchorId` (or of the
 * last plate drafted, or at `centre` when the rule is empty), always on
 * clear paper, and it is wired to the anchor when that wire can only
 * mean one thing — a step you add from the palette is the next step,
 * and an unwired plate is the one thing the validator will not run.
 *
 * `centre` is a point in FLOW space, the way `addRuleNodeAt` takes one.
 */
export function addRuleNodeAfter(
  ruleId: string,
  kind: RuleNodeKind,
  anchorId: string | null,
  centre?: XY,
): RuleNode | null {
  const store = useProjectStore.getState()
  const rule = store.rules[ruleId]
  if (!rule) return null

  const anchor =
    rule.nodes.find((n) => n.id === anchorId) ?? rule.nodes[rule.nodes.length - 1] ?? null

  const want: XY = anchor
    ? { x: snap(anchor.position.x + PLATE_PITCH), y: snap(anchor.position.y) }
    : centre
      ? { x: snap(centre.x - PLATE_W / 2), y: snap(centre.y - PLATE_GRAB_Y) }
      : { x: 64, y: 64 }

  const node = store.addRuleNode(ruleId, kind, clearOf(rule, want))
  if (!node) return null

  /* the wire, only where it is unambiguous: from a plate with one exit,
     that exit still free, to a plate that can take an entry */
  const canWire =
    !!anchor &&
    kind !== 'start' &&
    CHAINS_ON.includes(anchor.kind) &&
    !rule.edges.some((e) => e.source === anchor.id)
  if (canWire && anchor) {
    store.connectRuleNodes(ruleId, { source: anchor.id, target: node.id })
  }
  return node
}
