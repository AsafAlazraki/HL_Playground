/* ============================================================
   Entity-table node — a table's register, pinned to the blueprint.

   A card and its table are the SAME object seen two ways: this node
   carries the table's id, so it sits at the table's own position,
   drags through the whiteboard's existing `moveEntity` commit, and
   keeps every link edge attached (same handles as the card).

   Material: CHROME on CANVAS. White paper sheet with real lift
   (--shadow-card-canvas), a heading carrying the kind's symbol, and
   the project's one true grid inside it — the same `Grid` the
   full-window sheet uses, driven by the same `useSheetCommands`.
   Typed cells, calculated cells read-only in teal (#ERROR / #CYCLE
   in red), keyboard nav, TSV paste, fill handle, column narrowing
   and windowing above 150 rows are therefore not reimplemented
   here: they ARE the same code.

   When the table has a structure (Brand ▸ Range ▸ Model) the grid
   draws it NESTED — a pure view transform layered on by
   `useGroupedView`, with the rows underneath as flat as they ever
   were.

   Two isolation rules make all of that safe inside a canvas node:
   - the grid area carries `nodrag` + `nowheel`, so sweeping a cell
     selection never drags the sheet and a scroll never zooms it;
   - keyboard and clipboard events stop at this node's root, so the
     canvas's window-level Delete/Escape handlers never see a
     keystroke that belongs to a cell.

   ------------------------------------------------------------
   EXPAND — the whole table, WITHOUT LEAVING THE BLUEPRINT.

   The card is a window onto about five columns and seven rows, and
   the real Boats register is fifty-nine columns wide. EXPAND is the
   answer, and the important half of the answer is where it happens:
   the CARD grows. It stays a node — still dragged by its header,
   still resized by its own handles, still wired to Dealers and Motors
   by the same relationship lines, still on the navy sheet with the
   canvas around it. Nothing opens, nothing covers, nothing is left.

   When it grows it brings the whole-table instruments with it —
   COLLAPSE ALL, FIT COLUMNS, the SECTIONS strip and the ROWS /
   COLUMNS read-out, the very same components the full-window sheet
   draws (`WholeTableControls`, `BandStrip`) — because a card big
   enough to show a fifty-nine column table is no use without the one
   press that folds it to eleven chips.

   Expanded is a SIZE, not a mode: it is remembered next to every
   other node size in `tableCanvasState`, COLLAPSE puts back the frame
   the card had before (remembered, never recomputed), and the sheet
   is absolutely positioned so a grown card simply overlaps its
   neighbours — lifted above them, its edges still drawn beneath.

   The camera is framed on the card ONCE, on the press itself. Never
   afterwards: a position the reader chose is theirs.

   FOCUS stays, one step quieter, for the job it is genuinely better
   at — hours of data entry in the full window, with the search box.
   ============================================================ */
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { ComponentType, CSSProperties, JSX } from 'react'
import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  useStoreApi,
} from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { ArrowsInSimple, ArrowsOutSimple } from '@phosphor-icons/react'
import { accentVar, displayFieldOf, type TableKind } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import {
  distinctValues,
  type ColumnFilter,
  type SortState,
} from '@/features/table/core'
import { Grid } from './Grid'
import { SheetPlate } from './SheetPlate'
import { PLATE_ZOOM_OUT, useSheetPlate } from './tableLod'
import { Toasts, useToasts } from './Toasts'
import { TableFocusOverlay } from './TableFocusOverlay'
import { BandStrip } from './BandStrip'
import { DimensionReadout, WholeTableControls } from './WholeTableControls'
import { ICON_SIZE, TABLE_KIND_ICON, weightFor } from '@/lib/icons'
import { useTableData } from './useTableData'
import { useSheetCommands } from './useSheetCommands'
import { useGroupedView } from './useGroupedView'
import { useSectionedView } from './useSectionedView'
import { useWholeTable } from './useWholeTable'
import { useGroupCommands } from './useGroupCommands'
import { useColumnCommands } from './useColumnCommands'
import type { NewColumn } from './useColumnCommands'
import { countLabel } from './grouping'
import { ENTITY_TABLE_NODE_TYPE } from './useEntityTableNodes'
import type { EntityTableNodeData } from './useEntityTableNodes'
import {
  DEFAULT_TABLE_NODE_SIZE,
  MIN_TABLE_NODE_H,
  MIN_TABLE_NODE_W,
  collapseTableNode,
  expandTableNode,
  setFocusedTableEntity,
  setTableNodeColumnWidth,
  setTableNodeSizeByHand,
  useFocusedTableEntity,
  useTableNodeColumnWidths,
  useTableNodeExpanded,
} from './tableCanvasState'
import type { TableNodeSize } from './tableCanvasState'
import { clearFitWidths, releaseFitColumn, useFitWidths } from './tableFitState'
import { plural } from './helpers'
import { CAM_MS, cameraMs, useStillness } from '@/features/views/stillness'
import './table.css'
import './table-node.css'

/* ---------------------------------------------------------- */
/* how big "expanded" is                                      */
/* ---------------------------------------------------------- */

/** Clear sheet left around an expanded card, in flow units. The card
 *  claims the viewport MINUS this — it is still an object on a sheet,
 *  and the navy has to show on all four sides or it reads as a screen
 *  rather than as a card that grew. */
const EXPAND_INSET = 28

/** Framing an expanded card: enough padding that the navy still shows
 *  on all four sides — an object ON a sheet, never a screen — and a
 *  short move. Spent exactly once, on the press itself.
 *
 *  The duration is `CAM_MS`, shared with every other walk-to-an-object
 *  in the app. It used to be a local 320 that happened to agree with
 *  the other local 320 twelve lines down, and with nothing else. */
const EXPAND_FRAME_PAD = 0.06

/* ---------------------------------------------------------- */
/* opening a plate                                            */
/* ---------------------------------------------------------- */

/** Sheet left around a card the reader has just pressed open, in
 *  screen pixels — the neighbours have to stay in view or the press
 *  reads as leaving the blueprint rather than as walking up to one
 *  card on it. */
const OPEN_PLATE_PAD = 56
/** A press must never land back inside the plate band — a card that
 *  is still a plate afterwards has answered nothing. Clear of
 *  `PLATE_ZOOM_OUT`, never past the size the register is drawn at. */
const OPEN_PLATE_MIN_ZOOM = PLATE_ZOOM_OUT + 0.04
const OPEN_PLATE_MAX_ZOOM = 1

/* ---------------------------------------------------------- */
/* the kind's mark                                            */
/* ---------------------------------------------------------- */

/** What this table HOLDS, as a mark. Drawn by Phosphor through the
 *  app's one icon map — nothing in this module hand-draws a glyph
 *  that already exists, and nothing keeps a second copy of it. */
function KindMark({ kind }: { kind: TableKind | undefined }): JSX.Element {
  const Mark = TABLE_KIND_ICON[kind ?? 'custom'] ?? TABLE_KIND_ICON.custom
  return <Mark size={ICON_SIZE.small} weight={weightFor(ICON_SIZE.small)} />
}

/* ---------------------------------------------------------- */
/* compact designed states — never a blank frame              */
/* ---------------------------------------------------------- */

function NodePlate({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}): JSX.Element {
  return (
    <div className="tb-node-plate">
      <span className="tb-node-plate-marks" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="tb-node-plate-title mono-label">{title}</span>
      <p className="tb-node-plate-sub">{body}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn tb-node-plate-btn" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* the node                                                   */
/* ---------------------------------------------------------- */

function EntityTableNodeImpl(props: NodeProps): JSX.Element {
  const { entityId } = props.data as unknown as EntityTableNodeData
  const selected = props.selected === true

  const moveEntity = useProjectStore((s) => s.moveEntity)
  const updateEntity = useProjectStore((s) => s.updateEntity)
  const addField = useProjectStore((s) => s.addField)

  /* view state of THIS table. Ordering and narrowing are per-node and
     transient; the frame size, the column widths and which groups are
     folded outlive the node, so a view switch cannot undo them. */
  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<ColumnFilter[]>([])
  const [renamingTable, setRenamingTable] = useState<string | null>(null)
  /* Enter blurs the input, and blur commits too — this synchronous
     mirror is what stops one rename being written twice. */
  const renameRef = useRef<string | null>(null)
  const ownWidths = useTableNodeColumnWidths(entityId)
  const focusedId = useFocusedTableEntity()
  const expanded = useTableNodeExpanded(entityId)
  /* THE ONE THING THAT MAKES THIS SHEET FAST. Below the zoom at which
     a cell can be read this card draws a plate and NO grid — see
     `tableLod.ts` for the measurement. The subscription answers a
     band, not a zoom, so panning and zooming inside a band re-render
     nothing at all. */
  const asPlate = useSheetPlate()
  const toasts = useToasts()
  const pushToast = toasts.push

  /* A fit is an OVERLAY over the reader's own widths, never a
     replacement — one press back is a delete, which is what makes
     "restores the previous widths" true by construction. Same module
     the full-window sheet uses, so a table looks the same in both. */
  const fit = useFitWidths(entityId)
  const colWidths = useMemo(
    () => (fit ? { ...ownWidths, ...fit } : ownWidths),
    [fit, ownWidths],
  )

  /* the grid's own scroller: the window a fit is measured against,
     and the thing a band chip scrolls */
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const data = useTableData(entityId, { sort, filters, search: '' })
  const { entity, rows, hasFormula, buildViewRows } = data

  const { data: groupedView, layout, levelIds, levelNames, grouped, noun } =
    useGroupedView(entityId, data, entity)

  /* Bands last: a folded section takes its columns out of the
     addressable set, and the grid, the keys and the clipboard must
     all agree on that one set of columns. */
  const sectioned = useSectionedView(entityId, groupedView, entity)
  const view = sectioned.data

  const cmd = useSheetCommands(entityId, view, pushToast, levelIds)
  const { rowCount, gridRef } = cmd

  /* -- seeing the whole table, on the card ----------------------
     The same hook the full-window sheet drives: fold every band, reach
     one band by name, share the window out between the drawn columns.
     Nothing about it is specific to a lens — it needs the columns, the
     widths in force, and a scroller. */
  const whole = useWholeTable({
    entityId,
    sections: entity?.sections,
    /* counts and band membership come from the columns the table HAS,
       never the ones it is drawing — a chip reads `PRICING · 5`
       whether the band is folded or open */
    allFields: groupedView.fields,
    slots: sectioned.slots,
    widths: colWidths,
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

  /* dragging a grip while fitted takes THAT column out of the fit, so
     the drag does what it looks like it does and the rest stay fitted */
  const onResizeColumn = useCallback(
    (fieldId: string, w: number) => {
      releaseFitColumn(entityId, fieldId)
      setTableNodeColumnWidth(entityId, fieldId, w)
    },
    [entityId],
  )

  const addColumn = columns.addColumn
  const onAddColumn = useCallback(
    (spec: NewColumn) => addColumn(spec) !== null,
    [addColumn],
  )

  const clearView = useCallback(() => {
    setSort(null)
    setFilters([])
  }, [])

  /* ============================================================
     THE EXPAND GESTURE

     One press: the card takes the sheet's window (minus a margin of
     navy on every side), and the camera is framed on it — once. The
     frame it had is remembered so COLLAPSE can put back that exact
     rectangle rather than a freshly computed guess.
     ============================================================ */

  const rf = useReactFlow()
  const flowStore = useStoreApi()

  /* THE TWO CAMERA WALKS BELOW ASK BEFORE THEY MOVE. Both translated
     the entire blueprint under the reader at full length no matter
     what their operating system had been told — the full-viewport
     vestibular case apple-design §14 names outright. At `duration: 0`
     React Flow jumps straight to the framing, which is the static
     transition §14 asks for: the reader still arrives, they are just
     not carried there. */
  const { still } = useStillness()

  const onExpand = useCallback(() => {
    const node = rf.getNode(entityId)
    const prev: TableNodeSize = {
      w: node?.width ?? DEFAULT_TABLE_NODE_SIZE.w,
      h: node?.height ?? DEFAULT_TABLE_NODE_SIZE.h,
    }
    /* the pane's own pixels, so an expanded card is the sheet's window
       at zoom 1 — the framing below then lands the camera at ~1 and
       the register is read at its designed size */
    const { width, height } = flowStore.getState()
    const next: TableNodeSize = {
      w: Math.max(MIN_TABLE_NODE_W, Math.round(width) - EXPAND_INSET * 2),
      h: Math.max(MIN_TABLE_NODE_H, Math.round(height) - EXPAND_INSET * 2),
    }
    expandTableNode(entityId, prev, next)

    /* THE ONE LICENCE TO MOVE THE CAMERA. An explicit gesture, framed
       on the object it acted on, and never again afterwards. */
    const x = node?.position.x ?? 0
    const y = node?.position.y ?? 0
    void rf.fitBounds(
      { x, y, width: next.w, height: next.h },
      { padding: EXPAND_FRAME_PAD, duration: cameraMs(still, CAM_MS) },
    )
  }, [entityId, rf, flowStore, still])

  /* ============================================================
     OPENING A PLATE — the press that gets a reader from a sheet of
     plates to a table they can read.

     Below the legible zoom a card draws no grid, and therefore no
     FOOTER: EXPAND, FOCUS and + ROW all live in the register. A sheet
     framed on twenty-one tables lands well under that zoom, so without
     this the object filling the whole screen answers nothing pressed
     on it — the plate is the only thing there, so the plate is the
     way in.

     It is the plainest answer available: the camera walks to this card
     at the size the register was drawn for, and the card takes its
     grid back the moment the move stops (see `tableLod.ts`). Nothing
     is resized, nothing is remembered, nothing opens over the top —
     zooming back out puts the sheet back exactly as it was.
     ============================================================ */
  const onOpenPlate = useCallback(() => {
    const node = rf.getNode(entityId)
    const w = Math.max(node?.width ?? DEFAULT_TABLE_NODE_SIZE.w, 1)
    const h = Math.max(node?.height ?? DEFAULT_TABLE_NODE_SIZE.h, 1)
    const { width, height } = flowStore.getState()
    const fit = Math.min(
      (width - OPEN_PLATE_PAD * 2) / w,
      (height - OPEN_PLATE_PAD * 2) / h,
    )
    const zoom = Math.min(
      OPEN_PLATE_MAX_ZOOM,
      Math.max(OPEN_PLATE_MIN_ZOOM, fit),
    )
    void rf.setCenter(
      (node?.position.x ?? 0) + w / 2,
      (node?.position.y ?? 0) + h / 2,
      { zoom, duration: cameraMs(still, CAM_MS) },
    )
  }, [entityId, rf, flowStore, still])

  const onCollapse = useCallback(() => {
    /* a fit was worked out for the expanded window; at a fifth of the
       width it would leave columns the reader never chose. Their own
       widths are underneath, untouched — hand them back. */
    clearFitWidths(entityId)
    collapseTableNode(entityId)
  }, [entityId])

  const style = {
    '--tbn-accent': entity ? accentVar(entity.accent) : 'var(--ink-faint)',
  } as CSSProperties

  const frameClass = [
    'tb-node',
    selected ? 'tb-node--selected' : '',
    focusedId === entityId ? 'tb-node--focused' : '',
    expanded ? 'tb-node--expanded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  /* a table can be struck from the board while its node is still on
     screen for one frame — say so rather than drawing a blank sheet */
  if (!entity) {
    return (
      <div className="tb-node-wrap" style={style}>
        <div className={frameClass}>
          <NodePlate
            title="Sheet withdrawn"
            body="This table is no longer on the board. Its rows leave with it."
          />
        </div>
      </div>
    )
  }

  /* ============================================================
     TOO FAR OUT TO READ — draw the plate, not the register.

     Six complete registers is the whole performance problem: every
     pan transformed a subtree of thousands of cells that were, at
     this zoom, six-pixel grey stripes. The plate is what a drawing
     office would actually pin there, and it is CHEAPER by two orders
     of magnitude. The resize marks, the edge anchors and the drag
     handle all stay — it is the same node, seen from further away.
     ============================================================ */
  if (asPlate) {
    return (
      <div className="tb-node-wrap" style={style}>
        <NodeResizer
          isVisible={selected}
          minWidth={MIN_TABLE_NODE_W}
          minHeight={MIN_TABLE_NODE_H}
          lineClassName="tb-rs-line"
          handleClassName="tb-rs-handle"
          onResizeEnd={(_event, p) => {
            setTableNodeSizeByHand(entityId, { w: p.width, h: p.height })
            if (p.x !== entity.position.x || p.y !== entity.position.y) {
              moveEntity(entityId, { x: p.x, y: p.y })
            }
          }}
        />
        <Handle
          className="tb-node-port"
          type="target"
          position={Position.Left}
          isConnectable={false}
        />
        <Handle
          className="tb-node-port"
          type="source"
          position={Position.Right}
          isConnectable={false}
        />
        <div className={`${frameClass} tb-node--plate`}>
          <SheetPlate
            name={entity.name}
            kind={entity.kind}
            rows={rows.length}
            noun={noun}
            columns={whole.totalColumns}
            bands={whole.bands}
            onOpen={onOpenPlate}
          />
        </div>
        {focusedId === entityId ? (
          <TableFocusOverlay entity={entity} rowCount={rows.length} />
        ) : null}
      </div>
    )
  }

  /* the sheet draws the table's own columns and nothing else, so an
     empty column list really is an empty sheet */
  const noFields = entity.fields.length === 0
  const noRows = rows.length === 0
  const filtered = filters.length > 0
  /* NO LEAVES ON SCREEN IS NOT ALWAYS "NOTHING MATCHES".
     A table whose rows all sit in ONE drawer shows none of them the
     moment that drawer is shut — and answering that with the
     narrowed-to-nothing plate takes the drawer's own line off the
     sheet, so the only control that could open it again is gone and
     the card is stuck blank for ever. (SHOW THEM ALL clears filters,
     and there were never any.) The plate belongs to a NARROWING; a
     fold is answered by the sheet, with the folded line on it. */
  const emptyView = rowCount === 0 && filtered
  /* the whole-table instruments act on a SHEET: with a designed plate
     in its place there is nothing to fold, fit or scroll to, so they
     step aside rather than sitting there doing nothing */
  const onSheet = !noFields && !noRows && !emptyView

  const startTableRename = (): void => {
    renameRef.current = entity.name
    setRenamingTable(entity.name)
  }
  const draftTableName = (t: string): void => {
    renameRef.current = t
    setRenamingTable(t)
  }
  const commitTableName = (): void => {
    const live = renameRef.current
    renameRef.current = null
    setRenamingTable(null)
    if (live === null) return
    const next = live.trim()
    if (next !== '' && next !== entity.name) updateEntity(entityId, { name: next })
  }
  const cancelTableRename = (): void => {
    renameRef.current = null
    setRenamingTable(null)
  }

  return (
    /* The wrapper is deliberately UNCLIPPED: the resize marks and the
       edge anchors sit on the frame's outline, and the paper frame
       inside it clips its own content. */
    <div
      className="tb-node-wrap"
      style={style}
      /* every keystroke and clipboard event inside a cell belongs to the
         grid — the canvas's window handlers must never see them */
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onPaste={(e) => e.stopPropagation()}
      onCopy={(e) => e.stopPropagation()}
      onCut={(e) => e.stopPropagation()}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_TABLE_NODE_W}
        minHeight={MIN_TABLE_NODE_H}
        lineClassName="tb-rs-line"
        handleClassName="tb-rs-handle"
        onResizeEnd={(_event, p) => {
          /* by hand: the frame is the reader's from here, so it is no
             longer "expanded" and there is no earlier one to go back to */
          setTableNodeSizeByHand(entityId, { w: p.width, h: p.height })
          /* dragging the top or left edge moves the sheet's origin —
             commit it, or the next derive snaps the table back */
          if (p.x !== entity.position.x || p.y !== entity.position.y) {
            moveEntity(entityId, { x: p.x, y: p.y })
          }
        }}
      />

      {/* same anchors as the schema card, so link edges land in the
          same places whichever way the table is being read */}
      <Handle
        className="tb-node-port"
        type="target"
        position={Position.Left}
        isConnectable={false}
      />
      <Handle
        className="tb-node-port"
        type="source"
        position={Position.Right}
        isConnectable={false}
      />

      <div className={frameClass}>
        <header className="tb-node-head" title="Drag to move the sheet">
          <span className="tb-node-mark" aria-hidden="true">
            <KindMark kind={entity.kind} />
          </span>

          {renamingTable !== null ? (
            <input
              className="tb-node-nameedit nodrag"
              value={renamingTable}
              autoFocus
              spellCheck={false}
              aria-label="Rename this table"
              onChange={(e) => draftTableName(e.target.value)}
              onBlur={commitTableName}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') commitTableName()
                if (e.key === 'Escape') cancelTableRename()
              }}
            />
          ) : (
            <button
              type="button"
              className="tb-node-name block-heading nodrag"
              title={`${entity.name} — click to rename`}
              onClick={startTableRename}
            >
              {entity.name}
            </button>
          )}

          {filtered ? (
            <button
              type="button"
              className="tb-node-filtered nodrag"
              title="Some rows are hidden — show them all again"
              onClick={() => setFilters([])}
            >
              Narrowed
            </button>
          ) : null}

          <span className="tb-node-rows" title="How many rows this table holds">
            {countLabel(rows.length, noun)}
          </span>
        </header>

        {/* -- THE INSTRUMENTS COME WITH THE EXPANSION ------------
            A card wide enough for a fifty-nine column register is no
            use without the one press that folds it to eleven chips.
            They appear only when there is a SHEET to act on and room
            to draw them in — on a 520px card they would be four
            controls fighting over 500 pixels. */}
        {expanded && onSheet ? (
          <>
            <div className="tb-node-band nodrag">
              <WholeTableControls
                hasBands={whole.bands.length > 0}
                allFolded={whole.allFolded}
                fitted={whole.fitted}
                canFit
                onToggleBands={whole.toggleAllBands}
                onToggleFit={whole.toggleFit}
              />
              <DimensionReadout
                shown={rowCount}
                total={rows.length}
                columns={whole.totalColumns}
                shownColumns={whole.shownColumns}
                onClearView={clearView}
              />
            </div>
            {/* the map of the sheet, drawn only when the sheet is */}
            <BandStrip bands={whole.bands} onReveal={whole.revealBand} />
          </>
        ) : null}

        {/* the cross-fade: this element only ever mounts when the
            register comes back into legible range (or when the card
            itself arrives on screen), so the fade runs exactly once
            per transition and never mid-edit */}
        <div
          className={
            'tb-node-body nodrag nowheel' +
            (cmd.editing === null ? ' tb-node-body--in' : '')
          }
        >
          {noFields ? (
            <NodePlate
              title="No columns yet"
              body={`${entity.name} has nothing to hold. Add the first column and start typing.`}
              actionLabel="Add first column"
              onAction={() => {
                addField(entityId, { name: 'Name', type: 'text', required: true })
                pushToast('Column added')
              }}
            />
          ) : noRows ? (
            <NodePlate
              title="Nothing logged yet"
              body={`The columns are ready. Add the first ${noun.one} — or paste a block straight from Excel.`}
              actionLabel={`Add first ${noun.one}`}
              onAction={groups.addRow}
            />
          ) : emptyView ? (
            <NodePlate
              title="Nothing matches"
              body={`All ${plural(rows.length, 'row is', 'rows are')} still here — the column you narrowed simply hides every one.`}
              actionLabel="Show them all"
              onAction={() => setFilters([])}
            />
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
              search=""
              sort={sort}
              filters={filters}
              marks={cmd.marks}
              sel={cmd.sel}
              editing={cmd.editing}
              colWidths={colWidths}
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
              onResize={onResizeColumn}
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
        </div>

        <footer className="tb-node-foot nodrag">
          <button
            type="button"
            className="tb-node-act tb-node-act--add"
            onClick={groups.addRow}
            disabled={noFields}
            title={
              noFields
                ? 'Add a column before logging a row'
                : grouped && levelNames[0]
                  ? `Add a ${noun.one} — name its ${levelNames[0].toLowerCase()} on the line above it`
                  : `Add another ${noun.one}`
            }
          >
            <span aria-hidden="true">+</span> {noun.one}
          </button>

          {/* the strip says something only when there IS something to
              say — a count of columns you can already see is noise */}
          <span className="tb-node-tally" aria-hidden="true">
            {rowCount !== rows.length
              ? `${rowCount} of ${rows.length} showing`
              : ''}
          </span>

          {/* THE ANSWER TO "SHOW ME THE WHOLE TABLE".
              This frame is a WINDOW onto about five of the table's
              columns and seven of its rows, so the control that shows
              all of it has to be the loud one — and it has to happen
              HERE, on the blueprint, to the card itself. */}
          <button
            type="button"
            className="tb-node-act tb-node-act--expand"
            aria-pressed={expanded}
            onClick={expanded ? onCollapse : onExpand}
            aria-label={
              expanded
                ? `Collapse ${entity.name} back to its previous size`
                : `Expand ${entity.name} on the sheet — all ${plural(
                    rows.length,
                    'row',
                    'rows',
                  )} and all ${plural(
                    entity.fields.length + 1,
                    'column',
                    'columns',
                  )}, without leaving the blueprint`
            }
            title={
              expanded
                ? 'Collapse this sheet back to the size it was'
                : `Grow this card to fill the blueprint — all ${plural(
                    rows.length,
                    'row',
                    'rows',
                  )} and all ${plural(
                    entity.fields.length + 1,
                    'column',
                    'columns',
                  )} of ${entity.name}, with the sections strip and FIT COLUMNS. Stays on the sheet.`
            }
          >
            {expanded ? (
              <ArrowsInSimple
                size={ICON_SIZE.tiny}
                weight={weightFor(ICON_SIZE.tiny)}
              />
            ) : (
              <ArrowsOutSimple
                size={ICON_SIZE.tiny}
                weight={weightFor(ICON_SIZE.tiny)}
              />
            )}
            {expanded ? 'Collapse' : 'Expand'}
          </button>

          {/* the second path, deliberately quieter: the full window is
              genuinely better for an hour of typing, and nothing else */}
          <button
            type="button"
            className="tb-node-act tb-node-act--focus"
            onClick={() => setFocusedTableEntity(entityId)}
            aria-label={`Open ${entity.name} in the full window for heavy data entry`}
            title={`Open ${entity.name} full-window — the lens for long stretches of data entry, with the search box. Leaves the blueprint.`}
          >
            Focus
            <span className="tb-node-act-mark" aria-hidden="true" />
          </button>
        </footer>

        <Toasts items={toasts.items} onDismiss={toasts.dismiss} />
      </div>

      {focusedId === entityId ? (
        <TableFocusOverlay entity={entity} rowCount={rows.length} />
      ) : null}
    </div>
  )
}

export const EntityTableNode = memo(EntityTableNodeImpl)

/** React Flow node types for TABLE view. Spread into the canvas's
 *  `nodeTypes` map exactly the way `ruleNodeTypes` already is. */
export const tableNodeTypes: Record<string, ComponentType<NodeProps>> = {
  [ENTITY_TABLE_NODE_TYPE]: EntityTableNode,
}
