/* ============================================================
   useGroupedView — the seam between a flat register and a nested
   one.

   It takes the TableData the sheet already built and hands back the
   SAME shape, narrowed to what a grouped table shows: the drawer
   columns removed, the rows re-ordered into their drawers, and the
   rows inside folded drawers dropped from the addressable set.

   Because the result is still a TableData, `useSheetCommands` needs
   no idea grouping exists: every cell it addresses is a leaf cell in
   a leaf column, so typed cells, keyboard nav, Excel paste (by
   rowId), fill and the clipboard all keep working exactly as they
   did on a flat sheet.

   A table with no hierarchy short-circuits to the untouched data —
   flat stays flat, byte for byte.
   ============================================================ */
import { useMemo } from 'react'
import type { EntityDef } from '@/types/model'
import { cellText, valueForField } from './helpers'
import type { TableData } from './useTableData'
import {
  buildGroups,
  groupLevelIds,
  layoutGroups,
  leafFieldsOf,
  leafNoun,
  type GridLayout,
  type LeafNoun,
} from './grouping'
import { useCollapsedGroups } from './tableGroupState'
import type { RowMetrics } from './tableReadState'

export interface GroupedView {
  /** hand this to Grid AND to useSheetCommands — they must agree */
  data: TableData
  layout: GridLayout
  /** the column ids the table is filed under, outermost first */
  levelIds: string[]
  /** what those levels are CALLED — "Brand", "Range" — outermost
   *  first. The user chose these words at the two-question dialog and
   *  must meet them again on the sheet, or a grouping line is an
   *  unlabelled value floating above rows it does not explain. */
  levelNames: string[]
  grouped: boolean
  noun: LeafNoun
}

export function useGroupedView(
  entityId: string,
  data: TableData,
  entity: EntityDef | undefined,
  opts: {
    /** Hide the columns the table is filed under, because the grouping
     *  lines already say what they hold. TRUE on the sheet, where calm
     *  is everything; FALSE in the full-window lens, where re-filing a
     *  single row by retyping its Brand has to be possible. */
    hideLevelColumns?: boolean
    /** how tall this lens draws its rows. Absent everywhere but the
     *  full-window register — see `tableReadState`. */
    metrics?: RowMetrics
  } = {},
): GroupedView {
  const hideLevelColumns = opts.hideLevelColumns !== false
  const collapsed = useCollapsedGroups(entityId)

  const levelIds = useMemo(() => groupLevelIds(entity), [entity])
  const levelNames = useMemo(
    () =>
      levelIds.map(
        (id) => entity?.fields.find((f) => f.id === id)?.name.trim() ?? '',
      ),
    [levelIds, entity],
  )
  const noun = useMemo(() => leafNoun(entity), [entity])

  const { fields, viewRows, rowById, hasFormula, computedFor, refLabelOf } = data

  const leafFields = useMemo(
    () => (hideLevelColumns ? leafFieldsOf(fields, levelIds) : fields),
    [hideLevelColumns, fields, levelIds],
  )

  /* A drawer's label is the column's DISPLAY text, so a list column
     groups by its option and a link column groups by the row it points
     at — never by a raw id. `viewRows.text` is only populated while a
     sort/filter/search is live, so fall back to resolving the value. */
  const groups = useMemo(() => {
    if (levelIds.length === 0) return []
    const byId = new Map(fields.map((f) => [f.id, f]))
    return buildGroups(viewRows, levelIds, (vr, fieldId) => {
      const ready = vr.text[fieldId]
      if (ready !== undefined) return ready
      const field = byId.get(fieldId)
      const row = rowById.get(vr.rowId)
      if (!field || !row) return ''
      const values = hasFormula ? computedFor(row) : row.values
      return cellText(valueForField(row, field, values), field, refLabelOf(field))
    })
  }, [levelIds, fields, viewRows, rowById, hasFormula, computedFor, refLabelOf])

  const metrics = opts.metrics
  const layout = useMemo(
    () => layoutGroups(viewRows, groups, collapsed, metrics),
    [viewRows, groups, collapsed, metrics],
  )

  const grouped = layout.grouped

  const viewData = useMemo<TableData>(
    () =>
      grouped
        ? { ...data, fields: leafFields, viewRows: layout.leafRows }
        : data,
    [grouped, data, leafFields, layout.leafRows],
  )

  return { data: viewData, layout, levelIds, levelNames, grouped, noun }
}
