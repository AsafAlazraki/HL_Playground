/* ============================================================
   TableSheet — one table's full-window workspace: the grid, and the
   row commands that used to sit in a toolbar above it.

   Every editing behaviour (selection, keys, clipboard, fill) is
   performed by `useSheetCommands`; the nesting, the in-group + ROW
   and the column commands come from the same hooks the on-canvas
   register uses. This file owns only what is specific to the
   full-window lens: the narrowing state, the row commands, and the
   designed empty plates.

   THE THREE BARS ARE GONE, AND NOTHING WITH THEM.

   Measured on Highfield Inflatables at 1440: the page spent 131px and
   three stacked bands before a row of data — back/title/doors, then
   search plus seven controls, then the sections strip. That is the
   same fault the 260px rail had, and this design killed the rail for
   exactly that reason: "the first table row drawn 608px down a 744px
   column". The register then grew three bands back on top.

   Every control that was in them is still here. It is PUBLISHED
   rather than drawn: `useActionBar` puts it on the floating bar above
   the dock (see `@/lib/actions` and `src/app/ActionBar.tsx`), which
   costs the page 50px while it exists and nothing at all on a page
   that has no actions. What is left at the top of the stage is the
   way back and the subject's name, which is what every other stage
   in the app already does.

   THREE THINGS DECIDED HERE RATHER THAN INHERITED:

   1. THE COUNTS DO NOT COME WITH THEM. `Rows 588` was a fact, and the
      title block one band above it already said "588 variants". It is
      reported UP to the stage now (`onCount`), so the title says it
      once and says the narrowed figure too — "12 of 588 variants".
      `Columns 33` is the other half of the same fact and had no home
      in the title at all; it is said in the sections panel, which is
      the one place in the app that is about columns.

   2. THE SECTIONS STRIP IS FOLDED BEHIND ONE CONTROL, NOT DELETED.
      It is a MAP — its own header says so — and a map is consulted,
      not watched. A 33-column register cannot lose it, so it keeps
      every chip, every count, the folded state and the "in view"
      answer; what it loses is a permanent 32px band across the page
      for a thing used a few times an hour. The one answer a map has
      to give at a glance — which band am I in — is not behind the
      press: it is the second word ON the closed control.

   3. NOTHING BECAME A TOOLTIP. The two refusals ("no columns yet",
      "no rows picked") travel with their buttons as `refusal`, and
      the bar prints them in its own type, for a Tab as readily as for
      a pointer.

   THE ROW CONFIRM IS GONE, AND THIS IS THE ARGUMENT FOR IT. It was a
   scrim, a dialog and two buttons that said "This entry leaves the
   table for good. There is no undo." Both sentences were false.
   Measured in the running app on Surtees: delete row 03, press
   Ctrl+Z, and the row comes back AT INDEX 03, inside its own Series
   drawer, with every one of its thirty values — the register's text
   byte-identical to what it was before. `deleteRow` records one step
   per act, so a strike of eight rows is one step too.

   Rule 9 is not a preference here, it is the whole reason the dialog
   existed: "if an act is undoable it gets a toast with UNDO, not a
   dialog." A confirm sheet is a full stop in the middle of somebody's
   work, and this one was charging a person that full stop to protect
   them from something a keystroke already fixes — while telling them
   the opposite, which is the part that does real damage. A person who
   reads "there is no undo" and believes it stops doing things they
   could safely do.

   What replaces it is not nothing. The toolbar's own button already
   names the act and counts it — "Delete 3 rows" — so the deliberate
   press is where it always was; the note that follows says what
   happened and carries UNDO for nine seconds, and Ctrl+Z stands fifty
   steps deep behind that. The COLUMN menu keeps its confirm, because
   removing a column is not the same act: see the note in
   `ColumnMenu.tsx`.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { AnimatePresence } from 'motion/react'
import { useProjectStore } from '@/store/useProjectStore'
import { displayFieldOf, isSystemFieldId } from '@/types/model'
import type { CellValue, FieldDef, RowData } from '@/types/model'
import {
  distinctValues,
  type ColumnFilter,
  type SortState,
} from '@/features/table/core'
import {
  ArrowsInLineHorizontal,
  ArrowsOutLineHorizontal,
  ArrowsOutSimple,
  Broom,
  Columns,
  FrameCorners,
  Plus,
  TrashSimple,
} from '@phosphor-icons/react'
import { useTableRoundTrip } from '@/features/io/TableRoundTrip'
import { useActionBar } from '@/lib/actions'
import type { ActionGroup, ActionItem } from '@/lib/actions'
import { Grid } from './Grid'
import type { GridRail } from './Grid'
import { RowDetail, type FiledUnder } from './RowDetail'
import { BandStrip } from './BandStrip'
import { NoFieldsPlate, NoMatchPlate, NoRowsPlate } from './EmptyPlates'
import { useTableData, type TableData } from './useTableData'
import { useSheetCommands } from './useSheetCommands'
import { useGroupedView } from './useGroupedView'
import { useSectionedView } from './useSectionedView'
import { useWholeTable } from './useWholeTable'
import type { FitReport } from './sections'
import { releaseFitColumn, useFitWidths } from './tableFitState'
import { useBoxWidth, useNameColumnWidth } from './nameColumnWidth'
import { useGroupCommands } from './useGroupCommands'
import { useColumnCommands } from './useColumnCommands'
import type { NewColumn } from './useColumnCommands'
import type { PushToast } from './Toasts'
import { offerUndo } from '@/store/notes'
import { cellText, isEmptyCell, plural, singleSel, valueForField } from './helpers'
import { UNASSIGNED_LABEL } from './grouping'
import {
  ROW_METRICS,
  setOnlyFilled,
  setRowDensity,
  useReadState,
} from './tableReadState'
import { clearRowReveal, useRowReveal } from './rowRevealState'

/* THE ACCESSIBLE NAME OF THE ROW SEARCH, and it is a constant because
   two things need to agree on it: the action the bar publishes, and
   the '/' key, which has to find that box on a bar this component does
   not own and must not reach into by class name. An aria-label this
   file WROTE is a handle this file is allowed to hold. */
const SEARCH_LABEL = 'Search every column of this table, including calculated ones'

/** Put the caret in the row search, wherever the bar has drawn it. */
function focusRowSearch(): void {
  const box = document.querySelector<HTMLInputElement>(
    `input[aria-label="${SEARCH_LABEL}"]`,
  )
  if (!box) return
  box.focus()
  box.select()
}

/* ============================================================
   THE COLUMNS NOBODY HAS FILLED IN.

   Four kinds of column are NEVER put away, and each has a reason:

     a CALCULATED column is not something a person fills in, so
       "nobody filled it in" is not a fact about it;
     a REQUIRED column that is empty is a FAULT, and the register
       stripes it in red pencil to say so — hiding it would hide the
       thing the stripe exists to report;
     the column that NAMES the row, because a register with no names
       in it is not a register;
     the columns the sheet is FILED under, because retyping one is how
       a row moves to another drawer.

   Everything else is judged on the rows currently on the sheet.
   ============================================================ */
function columnsWithValues(
  fields: readonly FieldDef[],
  rowIds: readonly string[],
  rowById: Map<string, RowData>,
  keep: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>()
  for (const f of fields) {
    if (
      keep.has(f.id) ||
      f.type === 'formula' ||
      f.required === true ||
      isSystemFieldId(f.id)
    ) {
      out.add(f.id)
      continue
    }
    for (const id of rowIds) {
      const row = rowById.get(id)
      if (row && !isEmptyCell(row.values[f.id])) {
        out.add(f.id)
        break
      }
    }
  }
  return out
}

/** A narrowing, in the dealer's own words — moved here unchanged from
 *  `TableToolbar`, which no longer exists because every one of its
 *  controls is now on the action bar. */
function chipLabel(f: ColumnFilter, field: FieldDef | undefined): string {
  const name = field?.name ?? 'Column'
  if (f.kind === 'contains') return `${name} ∋ ${f.text}`
  if (f.selected.length === 0) return `${name}: none`
  if (f.selected.length <= 2) return `${name}: ${f.selected.join(', ')}`
  return `${name}: ${f.selected.length} values`
}

export function TableSheet({
  entityId,
  colWidths,
  onResizeColumn,
  pushToast,
  doors,
  onCount,
}: {
  entityId: string
  colWidths: Record<string, number>
  /** width <= 0 resets the column to its type default */
  onResizeColumn: (fieldId: string, w: number) => void
  pushToast: PushToast
  /** THE STAGE'S OWN DOORS, published on the SHEET'S bar rather than
   *  drawn in the stage's top bar. They belong to whoever hosts this
   *  register — the blueprint's expanded card has no doors and passes
   *  none — and they are handed down rather than published separately
   *  so one page cannot end up with two half-bars. */
  doors?: ActionItem[]
  /** HOW MANY ROWS ARE ON SCREEN, and how many the table holds. The
   *  narrowing lives in this component and the title block that says
   *  it lives two levels up, so the fact travels up rather than being
   *  said twice in two places that can disagree. */
  onCount?: (shown: number, total: number) => void
}): JSX.Element {
  const deleteRow = useProjectStore((s) => s.deleteRow)
  const addField = useProjectStore((s) => s.addField)

  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<ColumnFilter[]>([])
  const [search, setSearch] = useState('')

  const data = useTableData(entityId, { sort, filters, search })
  const { entity, rows, hasFormula, viewActive, buildViewRows } = data

  /* HOW THIS READER IS READING THIS TABLE — row height, and whether
     the columns nobody has filled in are on screen. Session-lived and
     per table; see `tableReadState`. */
  const read = useReadState(entityId)
  const metrics = ROW_METRICS[read.density]

  /* The heavy-entry lens keeps the nesting AND keeps the filing
     columns on screen: retyping one boat's Brand is how a single row
     moves to another group, and this is the place to do it. */
  const { data: grouped, layout, levelIds, levelNames, noun } = useGroupedView(
    entityId,
    data,
    entity,
    { hideLevelColumns: false, metrics },
  )

  /* -- the columns that carry a value ---------------------------
     Counted whether or not the lens is on, because the rail says how
     many the press WOULD put away before anybody presses it. */
  const alwaysKeep = useMemo(() => {
    const keep = new Set<string>(levelIds)
    const display = entity ? displayFieldOf(entity)?.id : undefined
    if (display) keep.add(display)
    return keep
  }, [levelIds, entity])

  const filledColumns = useMemo(
    () =>
      columnsWithValues(
        grouped.fields,
        grouped.viewRows.map((vr) => vr.rowId),
        grouped.rowById,
        alwaysKeep,
      ),
    [grouped.fields, grouped.viewRows, grouped.rowById, alwaysKeep],
  )

  const lensed = useMemo<TableData>(() => {
    if (!read.onlyFilled) return grouped
    const kept = grouped.fields.filter((f) => filledColumns.has(f.id))
    return kept.length === grouped.fields.length ? grouped : { ...grouped, fields: kept }
  }, [read.onlyFilled, grouped, filledColumns])

  /* Bands last: a folded section takes its columns out of the
     addressable set, and everything below this line — the grid, the
     keys, the clipboard — must agree on that one set of columns. */
  const sectioned = useSectionedView(entityId, lensed, entity)
  const view = sectioned.data

  const cmd = useSheetCommands(entityId, view, pushToast, levelIds)
  const { rowCount, gridRef } = cmd

  /* -- the widths in force, in three layers ----------------------
     THE NAME COLUMN'S MEASURED WIDTH IS THE BOTTOM ONE, so it is a
     DEFAULT and nothing more: a drag still wins over it, and resetting
     a column returns to it rather than to the 184px type default that
     clipped 26 of Stacer's 26 names at every window width.
     A fit is the TOP one — an overlay, never a replacement, so one
     press back is a `delete` and "restores the previous widths" is true
     by construction. */
  const [sheetBox, sheetW] = useBoxWidth()
  const nameW = useNameColumnWidth(entity, rows, sheetW, data.refLabelOf)
  const fit = useFitWidths(entityId)
  const widths = useMemo(
    () => ({ ...nameW, ...colWidths, ...(fit ?? {}) }),
    [nameW, fit, colWidths],
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

  /* THE NOTE FIT RAISES, hoisted so its identity is stable across
     renders — an inline arrow would make `toggleFit` a new function on
     every keystroke in a cell. `where` is the only word that differs
     between this lens and the card's. */
  const sayWhatFitDid = useCallback(
    (report: FitReport) => {
      pushToast(
        'Columns are as narrow as they can be and still be read. ' +
          `${report.onScreen} of ${report.shared} fit the window — the rest scroll sideways.`,
      )
    },
    [pushToast],
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
    /* WHAT THE PRESS ACTUALLY DID, when it is not what the word "fit"
       promises. Only ever raised when the 116px floor bound, and every
       figure in it is counted, not written. */
    onFit: sayWhatFitDid,
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

  /* -- the row a search sent us to -------------------------------
     GOING TO A ROW IS THE SELECTION MOVING, not a second scrolling
     mechanism. The grid already keeps its active cell in view and
     already lights the row's gutter, so a reveal sets the selection
     to that row's NAME cell — which is also the frozen column, so the
     grid's own rule ("scrolling to reveal the pin would only throw
     the sheet back to its left edge") means the sheet moves
     vertically and not sideways. `found` adds the one thing selection
     alone cannot say: that THIS is the row you asked for. */
  const reveal = useRowReveal(entityId)
  const [found, setFound] = useState<string | null>(null)
  const nameFieldId = entity ? displayFieldOf(entity)?.id : undefined
  /* THE TIMER IS A REF, NOT A CLEANUP, and that is the whole bug this
     shape avoids: consuming the request re-runs the effect with
     nothing pending, so a timer cancelled by the effect's own cleanup
     was cancelled one tick after it was set — measured, the mark
     never went away. */
  const markTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (markTimer.current !== null) window.clearTimeout(markTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!reveal) return
    clearRowReveal(entityId)
    const r = view.viewRows.findIndex((vr) => vr.rowId === reveal.rowId)
    if (r < 0) {
      /* IT SAYS WHY, WHERE IT IS. The row is in the table and not in
         the addressable set, which can only be a live narrowing or a
         folded drawer — both of them things the person did, and
         neither of them ours to undo behind their back. */
      pushToast('That row is out of view — a filter or a folded drawer is hiding it', 'warn')
      return
    }
    const col = nameFieldId ? view.fields.findIndex((f) => f.id === nameFieldId) : -1
    cmd.setSel(singleSel({ row: r, col: col < 0 ? 0 : col }))
    setFound(reveal.rowId)
    /* the mark is an ARRIVAL, not a state: it leaves once it has been
       seen, and the selection it put on the row is what stays */
    if (markTimer.current !== null) window.clearTimeout(markTimer.current)
    markTimer.current = window.setTimeout(() => setFound(null), 2600)
    /* AND IT LANDS IN THE PAGE, NOT ON ITS EDGE. The grid's own rule
       scrolls the active cell to the nearest edge, which is right when
       the arrows walk one row past the fold and wrong on arrival:
       measured, row 54 of the 83-row register arrived with 6px of it
       under the bottom rail. So once the grid has done its work — one
       frame later, on the scroller the toolbar already holds a ref to
       — the row is nudged into the upper third, where a person reads
       it as the answer rather than as the last line on screen. */
    requestAnimationFrame(() => {
      const port = viewportRef.current
      const line = port?.querySelector('.tb-row-found')
      if (!port || !(line instanceof HTMLElement)) return
      const box = line.getBoundingClientRect()
      const frame = port.getBoundingClientRect()
      const want = frame.top + Math.max(0, (frame.height - box.height) / 3)
      port.scrollTop += box.top - want
    })
    /* ON A REQUEST ONLY. `view` changes identity on every keystroke in
       the sheet's own find box; re-running then would drag the cursor
       back to a row the person had moved on from. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  /* -- THE ROW THAT IS OPEN --------------------------------------
     BY ID, NEVER BY INDEX, and that is not a detail. Retyping a Series
     inside the panel re-files the row into another drawer, a sort
     moves it, a narrowing can take it off the sheet entirely — an
     index would follow none of those and would quietly start showing
     somebody a different boat. The index is derived from the id on
     every render instead, which is the only direction that cannot
     lie. */
  const [openRowId, setOpenRowId] = useState<string | null>(null)
  const openIndex = openRowId
    ? view.viewRows.findIndex((vr) => vr.rowId === openRowId)
    : -1
  const openRow = openRowId ? view.rowById.get(openRowId) : undefined

  /* A ROW THAT IS NO LONGER IN THE TABLE CANNOT BE OPEN. Deleted,
     undone, or struck by a merge — the panel closes rather than
     standing there holding the last values it saw. A row merely
     narrowed OUT of view keeps the panel open: it is still a row of
     this table, the stepper simply has nowhere to step. */
  useEffect(() => {
    if (openRowId !== null && !view.rowById.has(openRowId)) setOpenRowId(null)
  }, [openRowId, view.rowById])

  const openRowAt = useCallback(
    (r: number) => {
      const id = view.viewRows[r]?.rowId
      if (id === undefined) return
      setOpenRowId(id)
      /* the cursor goes with it, in the column it was already in, so
         the sheet lights the row the panel is showing and the arrows
         carry on from there */
      const col = Math.max(0, Math.min(cmd.sel.active.col, view.fields.length - 1))
      cmd.setSel(singleSel({ row: r, col }))
    },
    [view.viewRows, view.fields.length, cmd],
  )

  const stepOpenRow = useCallback(
    (delta: number) => {
      if (openIndex < 0) return
      const next = openIndex + delta
      if (next < 0 || next >= view.viewRows.length) return
      openRowAt(next)
    },
    [openIndex, view.viewRows.length, openRowAt],
  )

  const closeOpenRow = useCallback(() => {
    setOpenRowId(null)
    gridRef.current?.focus()
  }, [gridRef])

  /* WHICH DRAWERS THIS ROW IS IN, in the dealer's own level names —
     "Series: Sport, Model: 460". Read off the row rather than off the
     grouping tree, so it is right even when the row has been narrowed
     out of the sheet the tree was built from. */
  const openValues = useMemo<Record<string, CellValue>>(() => {
    if (!openRow) return {}
    return view.hasFormula ? view.computedFor(openRow) : openRow.values
  }, [openRow, view])

  const filedUnder = useMemo<FiledUnder[]>(() => {
    if (!openRow || levelIds.length === 0) return []
    return levelIds.map((id, i) => {
      const field = data.fields.find((f) => f.id === id)
      const text = field
        ? cellText(
            valueForField(openRow, field, openValues),
            field,
            data.refLabelOf(field),
          )
        : ''
      return {
        level: levelNames[i] ?? '',
        value: text === '' ? UNASSIGNED_LABEL : text,
      }
    })
  }, [openRow, levelIds, levelNames, data, openValues])

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

  /* ONE ACT, ONE STEP, ONE NOTE. The loop is synchronous inside one
     handler, which is exactly what the store's history collapses into
     a single entry — so eight rows come back together on one press,
     not eight. "struck" is gone with the dialog: the toolbar's button
     says Delete, the store's own label says "8 rows deleted", and the
     audit had this app using four different verbs for one act. */
  const doDeleteRows = useCallback(() => {
    const ids = cmd.selectedRowIds
    if (ids.length === 0) return
    for (const id of ids) deleteRow(entityId, id)
    cmd.resetSelection()
    offerUndo(pushToast, `${plural(ids.length, 'row', 'rows')} deleted`, 'warn')
    gridRef.current?.focus()
  }, [cmd, deleteRow, entityId, pushToast, gridRef])

  /* -- what the page can do, published to the bar ----------------
     Everything below this line used to be JSX in `TableToolbar` and
     `BandStrip`, drawn in two bands across the top of the register.
     The controls are the same controls; only where they stand moved.
     See the header of this file, and `@/lib/actions` for what `rank`
     means. */

  /* the sheet draws the table's own columns and nothing else, so an
     empty column list really is an empty sheet */
  const noFields = entity === undefined || entity.fields.length === 0
  const noRows = rows.length === 0
  /* the whole-table controls act on a SHEET: with a designed plate in
     its place there is nothing to fold, fit or scroll to, so they step
     aside rather than sitting there doing nothing. A sheet whose
     drawers are all folded is still a sheet. */
  const onSheet = !noFields && !noRows && !(rowCount === 0 && viewActive)

  /* the title block says it, so the title block is told */
  useEffect(() => {
    onCount?.(rowCount, rows.length)
  }, [onCount, rowCount, rows.length])

  /* -- out to Excel, and back ------------------------------------
     THE ROUND TRIP STARTS HERE, at the table, which is what
     ACTION_BAR §4.1 asked for: "A person edits a register, exports
     it, works in Excel, and brings it back." The io feature owns the
     file format, the preflight and the merge; this register owns only
     the two facts nothing else can supply — which rows are SHOWING,
     and how a link column's names resolve — and the place on the bar
     the controls stand in. */
  const shownRows = useMemo<RowData[]>(() => {
    const out: RowData[] = []
    for (const vr of data.viewRows) {
      const r = data.rowById.get(vr.rowId)
      if (r) out.push(r)
    }
    return out
  }, [data.viewRows, data.rowById])

  const roundTrip = useTableRoundTrip({
    entityId,
    allRows: rows,
    shownRows,
    computedFor: data.computedFor,
    refLabelOf: data.refLabelOf,
    refMapOf: data.refMapOf,
    viewActive,
    pushToast,
  })

  const selectedCount = cmd.selectedRowIds.length
  const sortField = sort ? data.fields.find((f) => f.id === sort.fieldId) : undefined
  /* TAKEN APART BEFORE THE MEMO, not read through `whole` inside it.
     `useWholeTable` memoises every field it returns and then returns a
     fresh OBJECT LITERAL, so a dependency on `whole` is a dependency on
     nothing — the bar would be rebuilt and republished on every
     keystroke typed into a cell. Named fields make the memo mean what
     it says. */
  const {
    bands,
    atBandName,
    allFolded,
    totalColumns,
    shownColumns,
    fitted,
    toggleAllBands,
    revealBand,
    toggleFit,
  } = whole
  const hasBands = onSheet && bands.length > 0
  const bandCount = bands.length
  const foldedColumns = totalColumns - shownColumns

  /* -- what the rail is handed ----------------------------------
     Only the facts a scroller cannot work out for itself. Where the
     window is, and which drawer it is inside, are computed inside
     `Grid` from the offsets it already tracks. */
  const rail = useMemo<GridRail>(
    () => ({
      matching: data.viewRows.length,
      held: rows.length,
      columns: grouped.fields.length,
      shownColumns: lensed.fields.length,
      density: read.density,
      onDensity: (d) => setRowDensity(entityId, d),
      onlyFilled: read.onlyFilled,
      emptyColumns: grouped.fields.length - filledColumns.size,
      onOnlyFilled: (v) => setOnlyFilled(entityId, v),
    }),
    [
      data.viewRows.length,
      rows.length,
      grouped.fields.length,
      lensed.fields.length,
      read.density,
      read.onlyFilled,
      filledColumns.size,
      entityId,
    ],
  )

  const bar = useMemo<ActionGroup[]>(() => {
    const out: ActionGroup[] = []

    /* 10 · NARROW IT. Absent on a table with no columns, where there
       is nothing to search through — the same condition that puts a
       designed plate in the grid's place. */
    if (!noFields) {
      out.push({
        id: 'tb-find',
        rank: 10,
        items: [
          {
            kind: 'search',
            id: 'tb-search',
            value: search,
            placeholder: 'Search rows…',
            /* the same string the '/' key looks the box up by — see
               SEARCH_LABEL at the top of this file */
            label: SEARCH_LABEL,
            onChange: setSearch,
          },
        ],
      })
    }

    /* 20 · WHAT IS NARROWING IT, and one press to stop. The chips are
       the sort and the filters exactly as the toolbar drew them; the
       broom is the toolbar's `Clear`, which had been living inside the
       count read-out where nobody would look for it. */
    const narrowing: ActionItem[] = []
    if (sort && sortField) {
      narrowing.push({
        kind: 'chip',
        id: 'tb-chip-sort',
        key: 'Sort',
        value: `${sortField.name} ${sort.dir === 'asc' ? '↑' : '↓'}`,
        hint: `Sorted by ${sortField.name}, ${
          sort.dir === 'asc' ? 'ascending' : 'descending'
        }. Clear it and rows return to entry order.`,
        onRemove: () => setSort(null),
      })
    }
    for (const f of filters) {
      const field = data.fields.find((x) => x.id === f.fieldId)
      narrowing.push({
        kind: 'chip',
        id: `tb-chip-${f.fieldId}`,
        key: 'Filter',
        value: chipLabel(f, field),
        hint: `Remove the ${field?.name ?? 'column'} filter.`,
        onRemove: () => onFilter(f.fieldId, null),
      })
    }
    if (viewActive) {
      narrowing.push({
        kind: 'button',
        id: 'tb-clear',
        label: 'Clear',
        icon: Broom,
        onPick: clearView,
      })
    }
    if (narrowing.length > 0) {
      out.push({ id: 'tb-narrow', rank: 20, items: narrowing })
    }

    /* 30 · SEE ALL OF IT. The map, then the two whole-table controls,
       in the order the toolbar had them. */
    const shape: ActionItem[] = []
    if (hasBands) {
      shape.push({
        kind: 'panel',
        id: 'tb-sections',
        label: 'Sections',
        /* the one answer a map owes at a glance, ON the closed
           control — see decision 2 in this file's header */
        at: atBandName,
        icon: Columns,
        panelLabel: 'Sections',
        panelSay:
          foldedColumns > 0
            ? `${shownColumns} of ${plural(totalColumns, 'column', 'columns')} on the sheet, in ${plural(bandCount, 'section', 'sections')}. ${foldedColumns} folded away.`
            : `${plural(totalColumns, 'column', 'columns')} in ${plural(bandCount, 'section', 'sections')}.`,
        closeOnAct: true,
        content: (
          <BandStrip
            bands={bands}
            atBandName={atBandName}
            onReveal={revealBand}
          />
        ),
      })
      shape.push({
        kind: 'button',
        id: 'tb-fold',
        label: allFolded ? 'Expand all' : 'Collapse all',
        icon: allFolded ? ArrowsOutLineHorizontal : ArrowsInLineHorizontal,
        pressed: allFolded,
        onPick: toggleAllBands,
      })
    }
    if (onSheet) {
      shape.push({
        kind: 'button',
        id: 'tb-fit',
        label: fitted ? 'Reset widths' : 'Fit columns',
        icon: fitted ? ArrowsOutSimple : FrameCorners,
        pressed: fitted,
        onPick: toggleFit,
      })
    }
    if (shape.length > 0) out.push({ id: 'tb-shape', rank: 30, items: shape })

    /* 40 · TAKE IT AWAY AND BRING IT BACK. Between "see all of it"
       and the doors, because that is the reading: this acts on the
       whole register, like the two controls above it, and it is not
       somewhere to go. ACTION_BAR §4.1 — the round trip starts at the
       table. */
    out.push({ id: 'tb-trip', rank: 40, items: roundTrip.items })

    /* 50 · THE DOORS, if this register is standing on a stage that has
       any. They are the host's, not ours. */
    if (doors && doors.length > 0) {
      out.push({ id: 'tb-doors', rank: 50, items: doors })
    }

    /* 90 · CHANGE IT. Both refusals are the toolbar's own sentences,
       word for word, and both controls stay reachable while they
       stand — see `refusal` in @/lib/actions for why this is not the
       `disabled` attribute. */
    out.push({
      id: 'tb-rows',
      rank: 90,
      items: [
        {
          kind: 'button',
          id: 'tb-del',
          label:
            selectedCount === 0
              ? 'Delete rows'
              : `Delete ${plural(selectedCount, 'row', 'rows')}`,
          icon: TrashSimple,
          tone: 'danger',
          refusal:
            selectedCount === 0
              ? 'Pick rows in the number gutter to delete them.'
              : undefined,
          onPick: doDeleteRows,
        },
        {
          kind: 'button',
          id: 'tb-add',
          label: 'Row',
          icon: Plus,
          tone: 'primary',
          refusal: noFields ? 'Draft a column before adding rows.' : undefined,
          onPick: groups.addRow,
        },
      ],
    })

    return out
  }, [
    noFields,
    onSheet,
    hasBands,
    bandCount,
    foldedColumns,
    search,
    sort,
    sortField,
    filters,
    data.fields,
    viewActive,
    clearView,
    onFilter,
    bands,
    atBandName,
    allFolded,
    totalColumns,
    shownColumns,
    fitted,
    toggleAllBands,
    revealBand,
    toggleFit,
    doors,
    roundTrip.items,
    selectedCount,
    doDeleteRows,
    groups.addRow,
  ])

  /* ONE OWNER PER REGISTER. Two sheets are never mounted at once on a
     stage, and the key is the table's own id so a swap between two
     tables replaces the bar rather than stacking two. */
  useActionBar(`table-sheet:${entityId}`, bar)

  /* -- render ---------------------------------------------------- */

  if (!entity) {
    return <div className="tb-sheet-wrap" />
  }

  return (
    <section
      className="tb-sheet-wrap"
      /* the box the name column's ceiling is a share of */
      ref={sheetBox}
      id={`tb-sheet-${entityId}`}
      role="tabpanel"
      aria-labelledby={`tb-tab-${entityId}`}
    >
      {/* THE ROUND TRIP'S OWN FURNITURE — the file picker, which is
          hidden, and the preflight, which is a portalled confirm. It
          costs the page no height at all; the two controls that open
          it are on the bar with everything else. */}
      {roundTrip.surface}

      {/* THE PAGE STARTS AT THE DATA. The toolbar and the sections
          strip that stood here are on the action bar above the dock —
          see this file's header, and `useActionBar` above. */}
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
        /* THE LENS IS TWO COLUMNS WHEN A ROW IS OPEN, and one when it
           is not. The sheet keeps its own width in the DOM — nothing
           animates a layout property here — and the panel arrives on
           transform and opacity, which is the whole motion budget this
           surface spends. */
        <div className={'tb-lens' + (openRow ? ' tb-lens-open' : '')}>
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
          /* THIS LENS KEEPS THE FILING COLUMNS ON SCREEN (see
             `hideLevelColumns: false` above), so it is the one lens
             where every row repeats its own drawer's name. Naming them
             lets the grid draw them as filing rather than as data. */
          levelIds={levelIds}
          noun={noun}
          search={viewActive ? search : ''}
          sort={sort}
          filters={filters}
          marks={cmd.marks}
          found={found}
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
          metrics={metrics}
          openRowId={openRowId}
          onOpenRow={openRowAt}
          onCloseRow={closeOpenRow}
          onFocusSearch={focusRowSearch}
          rail={rail}
        />

        {/* THE ROW, READ AS A ROW. Mounted beside the sheet, never
            over it — see the header of `RowDetail`. `AnimatePresence`
            is what lets it leave along the path it arrived on; without
            it a close is a disappearance. */}
        <AnimatePresence initial={false}>
          {openRow && openRowId !== null && (
            <RowDetail
              key={openRowId}
              entity={entity}
              row={openRow}
              values={openValues}
              index={openIndex}
              shown={view.viewRows.length}
              held={rows.length}
              noun={noun}
              filedUnder={filedUnder}
              targetEntityOf={view.targetEntityOf}
              targetRowsOf={view.targetRowsOf}
              onSetText={(field, text) => cmd.setFieldText(openRowId, field, text)}
              onSetValue={(field, v) => cmd.setFieldValue(openRowId, field, v)}
              onImages={(fieldId, next) => cmd.setImages(openRowId, fieldId, next)}
              onStep={stepOpenRow}
              onClose={closeOpenRow}
            />
          )}
        </AnimatePresence>
        </div>
      )}

    </section>
  )
}
