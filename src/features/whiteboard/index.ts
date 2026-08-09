/* ============================================================
   THE BLUEPRINT SHEET — the configurator's one drawing.

       <Whiteboard />                       // tables on navy
       <Whiteboard onDropTableKind={fn} />  // …wiring the drop yourself

   A table type dragged from the left rail lands on the sheet and asks
   how it is structured before it becomes anything. Unless the shell
   passes `onDropTableKind`, the sheet publishes that request and the
   host of the kit's `NewTableDialog` answers it:

       const req = useNewTableRequest()
       {req ? (
         <NewTableDialog
           kind={req.kind}
           position={req.position}
           onClose={clearNewTableRequest}
         />
       ) : null}
   ============================================================ */
export { Whiteboard } from './Whiteboard'
export type { WhiteboardProps } from './Whiteboard'

export {
  clearNewTableRequest,
  requestNewTable,
  useNewTableRequest,
} from './canvasState'
export type { NewTableRequest } from './canvasState'

/* ============================================================
   OFF THE DEFAULT PATH — kept working, simply not drawn.

   The ERD (schema cards + zone frames), the rule flow and the layer
   switcher that chose between them are all still here and still
   exported; the configurator sheet just does not render them. The
   restore instructions live in one place: the "OFF THE DEFAULT PATH"
   block at the top of `Whiteboard.tsx`.
   ============================================================ */
export { EntityNode, schemaCardHeight } from './EntityNode'
export { ZoneNode } from './ZoneNode'
export { useDerivedGraph, useRelationshipEdges } from './useDerivedGraph'
export type { EntityNodeData, ZoneNodeData } from './useDerivedGraph'
export { CARD_MODES, defaultCardMode } from './cardModes'
export type { CardMode } from './cardModes'

/* Canvas chrome state the shell used to share with the sheet: which
   LAYER was drawn (the rule palette only belonged on a rules layer)
   and which rule plate was selected (what `RuleInspector` opened on).
   See `canvasState.ts`. */
export {
  SHEET_LAYERS,
  getCanvasState,
  layerGhostsEntities,
  layerShowsRules,
  setSelectedRuleNodeId,
  setSheetLayer,
  useCanvasState,
  useSelectedRuleNodeId,
  useSheetLayer,
} from './canvasState'
export type { CanvasState, SheetLayer } from './canvasState'
