/* ============================================================
   Store → entity-table nodes.

   TABLE view keeps the blueprint canvas and the SAME layout as SHEET
   view: every table node carries its entity's OWN id and its entity's
   OWN position, so a card you moved is a table in the same place, the
   whiteboard's existing `moveEntity` drag-commit persists it, and the
   relationship edges (source = entity id, target = ref entity id)
   attach without a single change.

   Derivation depends on `entities` and the session-lived frame sizes
   only — never on `rowsByEntity`. Typing into a cell must not rebuild
   the node array; each node reads its own rows from the store.
   ============================================================ */
import { useEffect, useMemo, useRef } from 'react'
import type { Node } from '@xyflow/react'
import { useProjectStore } from '@/store/useProjectStore'
import type { EntityDef } from '@/types/model'
import {
  DEFAULT_TABLE_NODE_SIZE,
  MIN_TABLE_NODE_H,
  MIN_TABLE_NODE_W,
  forgetTableEntity,
  getTableCanvasState,
  setFocusedTableEntity,
  useExpandedTableNodes,
  useTableNodeSizes,
  type TableNodeSize,
} from './tableCanvasState'
import { foldedTableIds, forgetGroupState } from './tableGroupState'
import { foldedSectionTableIds, forgetSectionState } from './tableSectionState'
import { fittedTableIds, forgetFitState } from './tableFitState'
import { forgetReadState, readTableIds } from './tableReadState'
import { forgetCatalogueLens, lensTableIds } from './catalogueLens'

/** React Flow node type key. One key, one component. */
export const ENTITY_TABLE_NODE_TYPE = 'entity-table'

/** Deliberately just the id: a stable object per entity means
 *  `React.memo` on the node actually bites, and a row edit never
 *  invalidates a single node's props. */
export type EntityTableNodeData = { entityId: string }

export type EntityTableFlowNode = Node<
  EntityTableNodeData,
  typeof ENTITY_TABLE_NODE_TYPE
>

/** Same rung as an entity card on the whiteboard's z-ladder
 *  (zone 1 · ERD edge 5 · card / table 10). */
export const Z_ENTITY_TABLE = 10

/** An EXPANDED register claims most of the sheet, so it necessarily
 *  overlaps its neighbours — the sheet is absolutely positioned and
 *  nothing is ever shoved aside. One rung up is the whole answer: it
 *  covers the cards it overlaps, and stays well under the relationship
 *  lines' own selected state and the FOCUS lens (60). Edges sit at 5,
 *  so they still draw beneath it, attached exactly as before. */
export const Z_ENTITY_TABLE_EXPANDED = 20

/** Clear air between two registers, on the canvas grid. */
const TABLE_GUTTER = 16

/* ============================================================
   THE DEFAULT FRAME FITS THE LAYOUT IT LANDS IN.

   Tables share the cards' positions — that is the whole point of the
   lens — but a register is 520px wide where a card is 240px, so a
   sheet laid out at a comfortable card pitch puts two 520px frames on
   top of each other and hides the right-hand quarter of every one of
   them. That is the "overlap of data" complaint, in a second place.

   So `DEFAULT_TABLE_NODE_SIZE` is a CEILING, not a constant: each
   register opens as large as it can be without reaching its
   neighbour, and never below the minimum that still fits a header
   and a row (below that the frame scrolls, which is the honest
   answer when the cards themselves are that close together).

   A frame the reader has resized always wins — this only decides
   where an untouched one starts.

   AND IT DECIDES THAT ONCE. Read on every derive, this same clamp
   makes dragging one register silently shrink a DIFFERENT one and
   cut its right-hand columns off — an object the reader never
   touched changing shape because of where they put another. So the
   answer is remembered per table for as long as that table is on the
   board (`autoRef` below): a first frame that fits the layout it
   landed in, and never a surprise afterwards.
   ============================================================ */
function autoTableSize(
  entity: EntityDef,
  all: readonly EntityDef[],
): TableNodeSize {
  let w = DEFAULT_TABLE_NODE_SIZE.w
  let h = DEFAULT_TABLE_NODE_SIZE.h
  const { x, y } = entity.position

  for (const other of all) {
    if (other.id === entity.id) continue
    const dx = other.position.x - x
    const dy = other.position.y - y
    /* "same row" / "same column" are judged against the ceiling frame:
       anything nearer than that on the other axis is a neighbour this
       register could run into. */
    if (dx > 0 && Math.abs(dy) < DEFAULT_TABLE_NODE_SIZE.h) {
      w = Math.min(w, dx - TABLE_GUTTER)
    }
    if (dy > 0 && Math.abs(dx) < DEFAULT_TABLE_NODE_SIZE.w) {
      h = Math.min(h, dy - TABLE_GUTTER)
    }
  }

  return {
    w: Math.max(MIN_TABLE_NODE_W, Math.round(w)),
    h: Math.max(MIN_TABLE_NODE_H, Math.round(h)),
  }
}

export function useEntityTableNodes(): EntityTableFlowNode[] {
  const entities = useProjectStore((s) => s.entities)
  const sizes = useTableNodeSizes()
  const expanded = useExpandedTableNodes()

  /* one data object per entity, for the lifetime of that entity */
  const dataRef = useRef<Map<string, EntityTableNodeData>>(new Map())
  /* the opening frame each untouched table was given, worked out once
     — so moving a neighbour can never re-size a table the reader is
     not even touching */
  const autoRef = useRef<Map<string, TableNodeSize>>(new Map())

  /* a table that has left the board takes its lens AND its folds with
     it — otherwise a later table reusing nothing but a stale key would
     open with drawers someone shut, or bands someone folded, in a
     previous life */
  useEffect(() => {
    const canvas = getTableCanvasState()
    const focused = canvas.focusEntityId
    if (focused && !entities[focused]) setFocusedTableEntity(null)
    /* An EXPANDED frame outlives a reload, so a table struck from the
       board has to be forgotten or its frame would sit in localStorage
       for ever. Only once the drawing is actually loaded, though: an
       empty `entities` on the first frame is a drawing on its way in,
       not one whose tables have all left. */
    if (Object.keys(entities).length > 0) {
      for (const id of Object.keys(canvas.expanded)) {
        if (!entities[id]) forgetTableEntity(id)
      }
    }
    for (const id of foldedTableIds()) {
      if (!entities[id]) forgetGroupState(id)
    }
    for (const id of foldedSectionTableIds()) {
      if (!entities[id]) forgetSectionState(id)
    }
    for (const id of fittedTableIds()) {
      if (!entities[id]) forgetFitState(id)
    }
    /* and the reader's own lens — row height, and whether the empty
       columns are put away. Same rule as the three above: a later
       table must never inherit a stale key's way of being read. */
    for (const id of readTableIds()) {
      if (!entities[id]) forgetReadState(id)
    }
    /* and which DENSITY it was being read at — the catalogue or the
       register. Fifth of a kind, same rule: a struck table takes
       every way of looking at it with it. */
    for (const id of lensTableIds()) {
      if (!entities[id]) forgetCatalogueLens(id)
    }
  }, [entities])

  return useMemo<EntityTableFlowNode[]>(() => {
    const cache = dataRef.current
    const autos = autoRef.current
    const live = new Set<string>()
    const all = Object.values(entities)
    const nodes = all.map((e) => {
      live.add(e.id)
      let data = cache.get(e.id)
      if (!data) {
        data = { entityId: e.id }
        cache.set(e.id, data)
      }
      let auto = autos.get(e.id)
      if (!auto) {
        auto = autoTableSize(e, all)
        autos.set(e.id, auto)
      }
      const size = sizes[e.id] ?? auto
      return {
        id: e.id,
        type: ENTITY_TABLE_NODE_TYPE,
        position: { x: e.position.x, y: e.position.y },
        width: size.w,
        height: size.h,
        zIndex: e.id in expanded ? Z_ENTITY_TABLE_EXPANDED : Z_ENTITY_TABLE,
        data,
      } satisfies EntityTableFlowNode
    })
    for (const id of cache.keys()) if (!live.has(id)) cache.delete(id)
    for (const id of autos.keys()) if (!live.has(id)) autos.delete(id)
    return nodes
  }, [entities, sizes, expanded])
}
