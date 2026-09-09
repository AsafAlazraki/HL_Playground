/* ============================================================
   useSectionedView — the seam between a wide register and a banded
   one.

   It takes the (already grouped) TableData and hands back the SAME
   shape, narrowed to the columns a banded table currently shows: the
   columns of a folded band removed, everything else untouched — with
   ONE exception, and it is the whole reason `pinFieldId` is threaded
   through here. The pinned display column survives its own band's
   fold, because a folded sheet with no name on it is the failure the
   pin exists to prevent. The argument, with the measurements, is on
   `buildSections`.

   Because the result is still a TableData, `useSheetCommands` needs
   no idea sections exist — every cell it addresses is a real cell in
   a visible column, so typed cells, keyboard nav, Excel paste (by
   rowId), fill and the clipboard all keep working exactly as they did
   on an unbanded sheet.

   A table with no bands short-circuits to the untouched data — plain
   stays plain, array identity and all.
   ============================================================ */
import { useCallback, useMemo } from 'react'
import { displayFieldOf, type EntityDef } from '@/types/model'
import { buildSections, type ColumnSlot } from './sections'
import { toggleSection, useCollapsedSections } from './tableSectionState'
import type { TableData } from './useTableData'

export interface SectionedView {
  /** hand this to Grid AND to useSheetCommands — they must agree */
  data: TableData
  /** what the header and the rows draw, in order. A table with no
   *  bands gets one slot per column and the grid draws no band row. */
  slots: ColumnSlot[]
  /** fold one band shut, or open it again */
  onToggleSection: (sectionId: string) => void
}

export function useSectionedView(
  entityId: string,
  view: TableData,
  entity: EntityDef | undefined,
): SectionedView {
  const collapsed = useCollapsedSections(entityId)
  const sections = entity?.sections

  /* THE ONE COLUMN A FOLD MAY NOT TAKE WITH IT. Resolved from the
     ENTITY, exactly as `Grid` and `useWholeTable` resolve it, so all
     three agree about which column is the identity and no fold can
     make them disagree. The argument is on `buildSections`. */
  const pinFieldId = entity ? displayFieldOf(entity)?.id : undefined

  const model = useMemo(
    () => buildSections(view.fields, sections, collapsed, pinFieldId),
    [view.fields, sections, collapsed, pinFieldId],
  )

  const data = useMemo<TableData>(
    () => (model.fields === view.fields ? view : { ...view, fields: model.fields }),
    [model.fields, view],
  )

  const onToggleSection = useCallback(
    (sectionId: string) => toggleSection(entityId, sectionId),
    [entityId],
  )

  return { data, slots: model.slots, onToggleSection }
}
