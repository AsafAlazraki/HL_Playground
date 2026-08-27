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

/* ============================================================
   3. THE CATALOGUE — the front door of a table, and the seam a
      MODULE mounts as its Stock tab.

   `TableWorkspace` mounts this; the register is its `List`
   density. A module wants it directly, without the workspace's
   tab strip:

       import { Catalogue } from '@/features/table'

       <Catalogue
         entityId={table.id}
         colWidths={widths}            // yours, so they outlive a tab
         onResizeColumn={setWidth}
         pushToast={toast}
         heading={false}               // your header already names it
         doors={[...]}                 // published on the action bar
         onOpenRow={(rowId) => …}      // default: go to it in the register
       />

   IT FILLS THE BOX IT IS PUT IN and scrolls inside it; give it a
   parent with a height and nothing else. `colWidths` /
   `onResizeColumn` / `pushToast` are the register's own three
   housekeeping props and are passed straight through — hold them
   above the Catalogue so a person moving between two tables and
   back finds their columns the width they left them.

   WHAT IT WILL NOT DO WITHOUT BEING ASKED: it does not route, it
   does not open a quote, and it does not know what a module is.
   `onOpenRow` is the whole of its outward wiring.
   ============================================================ */
export { Catalogue } from './Catalogue'
export type { CatalogueProps } from './Catalogue'
export {
  LENS_LABEL,
  forgetCatalogueLens,
  lensOf,
  setCatalogueLens,
  useCatalogueLens,
} from './catalogueLens'
export type { CatalogueLens } from './catalogueLens'

/* THE RAIL A TABLE CAN HONESTLY OFFER, read off its own columns —
   pure, and measured against the whole seed in `facets.test.ts`.
   Exported because a module's Stock tab may want to say how a
   table can be browsed before it draws it. */
export { readFacets, bandWords, CHIPS_SHOWN } from './facets'
export type { Facet, ValuesFacet, BandFacet, EnvelopeFacet, FacetValue } from './facets'

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
  useExpandedTableNodes,
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

/* WHERE A SEARCH SENT US. "Find anything" knows the row; only the
   sheet can go to it. One pending request per table, consumed once —
   see `rowRevealState` for why this is not a prop and not a stage. */
export { forgetRowReveal, requestRowReveal } from './rowRevealState'

export { coverPhoto, type CoverPhoto } from './coverPhoto'
