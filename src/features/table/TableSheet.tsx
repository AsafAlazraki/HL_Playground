/* ============================================================
   TableSheet — one table's full-window workspace: toolbar, grid,
   and the row commands the toolbar owns.

   Every editing behaviour (selection, keys, clipboard, fill) is
   performed by `useSheetCommands`; the nesting, the in-group + ROW
   and the column commands come from the same hooks the on-canvas
   register uses. This file owns only what is specific to the
   full-window lens: the search/narrow chrome, the strike-rows
   confirmation, and the designed empty plates.
   ============================================================ */
import { useCallback, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { displayFieldOf } from '@/types/model'
import {
  distinctValues,
  type ColumnFilter,
  type SortState,
} from '@/features/table/core'
import { Grid } from './Grid'
import { TableToolbar } from './TableToolbar'
import { BandStrip } from './BandStrip'
import { NoFieldsPlate, NoMatchPlate, NoRowsPlate } from './EmptyPlates'
import { useTableData } from './useTableData'
import { useSheetCommands } from './useSheetCommands'
import { useGroupedView } from './useGroupedView'
import { useSectionedView } from './useSectionedView'
import { useWholeTable } from './useWholeTable'
import { releaseFitColumn, useFitWidths } from './tableFitState'
import { useGroupCommands } from './useGroupCommands'
import { useColumnCommands } from './useColumnCommands'
import type { NewColumn } from './useColumnCommands'
import type { ToastTone } from './Toasts'
import { plural } from './helpers'

export function TableSheet({
  entityId,
  colWidths,
  onResizeColumn,
  pushToast,
}: {
  entityId: string
  colWidths: Record<string, number>
  /** width <= 0 resets the column to its type default */
  onResizeColumn: (fieldId: string, w: number) => void
  pushToast: (text: string, tone?: ToastTone) => void
}): JSX.Element {
  const deleteRow = useProjectStore((s) => s.deleteRow)
  const addField = useProjectStore((s) => s.addField)

  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<ColumnFilter[]>([])
  const [search, setSearch] = useState('')
  const [confirmRows, setConfirmRows] = useState<string[] | null>(null)

  const data = useTableData(entityId, { sort, filters, search })
  const { entity, rows, hasFormula, viewActive, buildViewRows } = data

  /* The heavy-entry lens keeps the nesting AND keeps the filing
     columns on screen: retyping one boat's Brand is how a single row
     moves to another group, and this is the place to do it. */
  const { data: grouped, layout, levelIds, levelNames, noun } = useGroupedView(
    entityId,
    data,
    entity,
    { hideLevelColumns: false },
  )

  /* Bands last: a folded section takes its columns out of the
     addressable set, and everything below this line — the grid, the
     keys, the clipboard — must agree on that one set of columns. */
  const sectioned = useSectionedView(entityId, grouped, entity)
  const view = sectioned.data

  const cmd = useSheetCommands(entityId, view, pushToast, levelIds)
  const { rowCount, gridRef } = cmd

  /* -- seeing the whole table ------------------------------------
     A fit is an OVERLAY over the reader's own widths, never a
     replacement: one press back is a delete, so "restores the previous
     widths" is true by construction. */
  const fit = useFitWidths(entityId)
  const widths = useMemo(
    () => (fit ? { ...colWidths, ...fit } : colWidths),
    [fit, colWidths],
  )

  /* dragging a grip while fitted takes THAT column out of the fit, so
     the drag does what it looks like it does and the rest stay fitted */
  const onResize = useCallback(
    (fieldId: string, w: number) => {
      releaseFitColumn(entityId, fieldId)
      onResizeColumn(fieldId, w)
    },
    [entityId, onResizeColumn],
  )

  /* the grid's own scroller: the window to measure a fit against, and
     the thing a band chip scrolls */
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const whole = useWholeTable({
    entityId,
    sections: entity?.sections,
    /* counts and band membership come from the columns the table HAS,
       never from the ones it is currently drawing — a chip must read
       `PRICING · 5` whether the band is folded or open */
    allFields: grouped.fields,
    slots: sectioned.slots,
    widths,
    viewportRef,
    /* the same column the grid freezes — see the pin note in `Grid` */
    pinFieldId: entity ? displayFieldOf(entity)?.id : undefined,
  })

  const columns = useColumnCommands(entityId, pushToast)
  const groups = useGroupCommands(
    entityId,
    view,
    data.fields,
    cmd,
    levelIds,
    noun,
    pushToast,
  )

  /* -- ordering / narrowing ------------------------------------- */

  const onSort = useCallback((fieldId: string, dir: SortState['dir'] | null) => {
    setSort(dir === null ? null : { fieldId, dir })
  }, [])

  const onFilter = useCallback((fieldId: string, f: ColumnFilter | null) => {
    setFilters((prev) => {
      const without = prev.filter((x) => x.fieldId !== fieldId)
      return f ? [...without, f] : without
    })
  }, [])

  const distinctFor = useCallback(
    (fieldId: string) => distinctValues(buildViewRows(rows, hasFormula), fieldId),
    [buildViewRows, rows, hasFormula],
  )

  const clearView = useCallback(() => {
    setSort(null)
    setFilters([])
    setSearch('')
  }, [])

  const addColumn = columns.addColumn
  const onAddColumn = useCallback(
    (spec: NewColumn) => addColumn(spec) !== null,
    [addColumn],
  )

  /* -- rows ------------------------------------------------------ */

  const doDeleteRows = useCallback(() => {
    const ids = confirmRows ?? []
    setConfirmRows(null)
    if (ids.length === 0) return
    for (const id of ids) deleteRow(entityId, id)
    cmd.resetSelection()
    pushToast(`${plural(ids.length, 'row', 'rows')} struck`, 'warn')
    gridRef.current?.focus()
  }, [confirmRows, deleteRow, entityId, pushToast, cmd, gridRef])

  /* -- render ---------------------------------------------------- */

  if (!entity) {
    return <div className="tb-sheet-wrap" />
  }

  /* the sheet draws the table's own columns and nothing else, so an
     empty column list really is an empty sheet */
  const noFields = entity.fields.length === 0
  const noRows = rows.length === 0
  /* the four whole-table controls act on a SHEET: with a designed plate
     in its place there is nothing to fold, fit or scroll to, so they
     step aside rather than sitting there doing nothing. A sheet whose
     drawers are all folded is still a sheet. */
  const onSheet = !noFields && !noRows && !(rowCount === 0 && viewActive)

  return (
    <section
      className="tb-sheet-wrap"
      id={`tb-sheet-${entityId}`}
      role="tabpanel"
      aria-labelledby={`tb-tab-${entityId}`}
    >
      <TableToolbar
        fields={data.fields}
        search={search}
        onSearch={setSearch}
        filters={filters}
        onRemoveFilter={(id) => onFilter(id, null)}
        sort={sort}
        onClearSort={() => setSort(null)}
        onClearView={clearView}
        shown={rowCount}
        total={rows.length}
        columns={whole.totalColumns}
        shownColumns={whole.shownColumns}
        hasBands={onSheet && whole.bands.length > 0}
        allFolded={whole.allFolded}
        fitted={whole.fitted}
        canFit={onSheet}
        onToggleBands={whole.toggleAllBands}
        onToggleFit={whole.toggleFit}
        selectedRows={cmd.selectedRowIds.length}
        onAddRow={groups.addRow}
        onDeleteRows={() => setConfirmRows(cmd.selectedRowIds)}
        canEdit={!noFields}
      />

      {/* the map of the sheet, drawn only when the sheet is */}
      {onSheet && <BandStrip bands={whole.bands} onReveal={whole.revealBand} />}

      {noFields ? (
        <NoFieldsPlate
          entityName={entity.name}
          onAddColumn={() => {
            addField(entityId, { name: 'Name', type: 'text', required: true })
            pushToast('Column added')
          }}
        />
      ) : noRows ? (
        <NoRowsPlate entityName={entity.name} onAddRow={groups.addRow} />
      ) : rowCount === 0 && viewActive ? (
        /* Only NARROWING earns this plate. A table whose every drawer
           is folded also has no leaf rows, and putting a plate over it
           takes away the grouping lines — which are the only way to
           open them again. That is a dead end; the sheet stays. */
        <NoMatchPlate total={rows.length} onClear={clearView} />
      ) : (
        <Grid
          entity={entity}
          fields={view.fields}
          slots={sectioned.slots}
          viewRows={view.viewRows}
          rowById={view.rowById}
          hasFormula={view.hasFormula}
          computedFor={view.computedFor}
          refLabelOf={view.refLabelOf}
          targetEntityOf={view.targetEntityOf}
          targetRowsOf={view.targetRowsOf}
          distinctFor={distinctFor}
          layout={layout}
          levelNames={levelNames}
          noun={noun}
          search={viewActive ? search : ''}
          sort={sort}
          filters={filters}
          marks={cmd.marks}
          sel={cmd.sel}
          editing={cmd.editing}
          colWidths={widths}
          gridRef={gridRef}
          viewportRef={viewportRef}
          onSel={cmd.setSel}
          onKey={cmd.onKey}
          onPasteText={cmd.doPaste}
          onBeginEdit={cmd.beginEdit}
          onDraft={cmd.setDraft}
          onPick={cmd.pickValue}
          onCommitEdit={cmd.commitEdit}
          onToggleBool={(cell) => cmd.beginEdit(cell)}
          onFill={cmd.applyFill}
          onResize={onResize}
          onSort={onSort}
          onFilter={onFilter}
          onRenameColumn={columns.renameColumn}
          onRemoveColumn={columns.removeColumn}
          onEditOptions={columns.setOptions}
          onAddColumn={onAddColumn}
          linkTargets={columns.linkTargets}
          suggestColumnName={columns.suggestName}
          onToggleSection={sectioned.onToggleSection}
          onImages={cmd.setImages}
          onToggleGroup={groups.toggle}
          onAddRowInGroup={groups.addRowIn}
          onRenameGroup={groups.rename}
        />
      )}

      {confirmRows !== null && (
        <div className="tb-scrim" role="presentation" onMouseDown={() => setConfirmRows(null)}>
          <div
            className="tb-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm row deletion"
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Escape') {
                setConfirmRows(null)
                gridRef.current?.focus()
              }
            }}
          >
            <p className="tb-confirm-title">
              Strike {plural(confirmRows.length, 'row', 'rows')}?
            </p>
            <p className="tb-confirm-sub">
              {confirmRows.length === 1
                ? 'This entry leaves the table for good.'
                : `These ${confirmRows.length} entries leave the table for good.`}{' '}
              There is no undo.
            </p>
            <div className="tb-confirm-actions">
              <button
                type="button"
                className="btn"
                /* the keyboard lands on CANCEL, not on the delete —
                   the Enter that opened this dialog must not carry
                   through into striking the rows */
                autoFocus
                onClick={() => {
                  setConfirmRows(null)
                  gridRef.current?.focus()
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-danger tb-confirm-go" onClick={doDeleteRows}>
                Delete {plural(confirmRows.length, 'row', 'rows')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
