/* ============================================================
   TABLEKIT — everything the shell and the canvas need to let a
   person put a table on the sheet.

   The rail is the left panel's content; the dialog asks the two
   questions and calls `createTable`; the drag helpers carry a kind
   from the rail to the sheet. Nothing else in the app constructs a
   table, so the two questions are always the same two questions.
   ============================================================ */

export { TableKindSymbol, kindOf } from './symbols'
export type { TableKindSymbolProps } from './symbols'

export { NewTableDialog } from './NewTableDialog'
export type { NewTableDialogProps } from './NewTableDialog'

export { TableTypeRail } from './TableTypeRail'

export {
  TABLE_DND_MIME,
  setTableKindDragData,
  isTableKindDrag,
  readTableKindDrag,
  tablePositionAt,
  setTableCentreProvider,
  tableCentrePosition,
} from './dnd'
