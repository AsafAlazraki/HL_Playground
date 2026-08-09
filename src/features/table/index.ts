/* ============================================================
   TABLE — the register, in two lenses.

   1. ON THE BLUEPRINT (TABLE view, UX_REWORK §6)
      Each entity is a data sheet pinned to the canvas at the SAME
      position as its schema card.

        import { tableNodeTypes, useEntityTableNodes } from '@/features/table'

        const nodeTypes = { entity: EntityNode, zone: ZoneNode,
                            ...ruleNodeTypes, ...tableNodeTypes }

        const tableNodes = useEntityTableNodes()   // Node[], ids = entity ids

      Node ids ARE entity ids, so the canvas's existing drag-commit
      (`moveEntity`) and the existing relationship edges work unchanged.
      Render EITHER the entity cards OR the table nodes — never both at
      once, or two nodes claim the same id.

   2. FULL WINDOW (the FOCUS lens)
        <TableWorkspace />               // sheet-switching workspace
        <TableWorkspace entityId={id} /> // pinned to one entity

      The node's FOCUS control opens the second form itself; nothing
      else needs mounting for it.
   ============================================================ */
export { TableWorkspace } from './TableWorkspace'

export { EntityTableNode, tableNodeTypes } from './EntityTableNode'
export {
  ENTITY_TABLE_NODE_TYPE,
  Z_ENTITY_TABLE,
  Z_ENTITY_TABLE_EXPANDED,
  useEntityTableNodes,
} from './useEntityTableNodes'
export type {
  EntityTableFlowNode,
  EntityTableNodeData,
} from './useEntityTableNodes'

/* EXPANDED is a node SIZE, not a mode — see `tableCanvasState`. The
   card's own control drives it; nothing outside this feature needs to,
   and the read-only questions are here for a shell that wants to say
   something about it. */
export {
  DEFAULT_TABLE_NODE_SIZE,
  MIN_TABLE_NODE_H,
  MIN_TABLE_NODE_W,
  forgetTableEntity,
  isTableNodeExpanded,
  setFocusedTableEntity,
  useFocusedTableEntity,
  useTableNodeExpanded,
} from './tableCanvasState'
export type { TableNodeSize } from './tableCanvasState'

/* Folding is per table and per session — both kinds of it: the drawers
   of a hierarchy, and the bands of a wide sheet. A table struck from
   the board takes both with it.

   The kind's symbol is NOT re-exported here. `@/lib/icons` holds the
   one icon map for the whole app (`TABLE_KIND_ICON`), and one mark
   must have exactly one source — nothing in this module hand-draws
   a glyph or keeps a second copy of one. */
export { forgetGroupState } from './tableGroupState'
export { forgetSectionState } from './tableSectionState'
export { forgetFitState } from './tableFitState'
