/* ============================================================
   useSectionedView — the seam between a wide register and a banded
   one.

   It takes the (already grouped) TableData and hands back the SAME
   shape, narrowed to the columns a banded table currently shows: the
   columns of a folded band removed, everything else untouched.

   Because the result is still a TableData, `useSheetCommands` needs
   no idea sections exist — every cell it addresses is a real cell in
   a visible column, so typed cells, keyboard nav, Excel paste (by
   rowId), fill and the clipboard all keep working exactly as they did
   on an unbanded sheet.

   A table with no bands short-circuits to the untouched data — plain
   stays plain, array identity and all.
   ============================================================ */
import { useCallback, useMemo } from 'react'
import type { EntityDef } from '@/types/model'
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

  const model = useMemo(
    () => buildSections(view.fields, sections, collapsed),
    [view.fields, sections, collapsed],
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
