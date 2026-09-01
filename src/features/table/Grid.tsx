/* ============================================================
   Grid — the instrument surface.

   ONE focusable role="grid" element, ONE keydown handler, ONE live
   editor. Every drawn line — a grouping line, a data row, a group's
   + ROW — is absolutely positioned at a top the layout worked out,
   so windowing above 150 rows is still just a slice change and
   nesting costs the scroller nothing.

   Selection is painted with overlay rectangles rather than per-cell
   borders: crisp 1.5px rules, a real fill handle, and no re-render
   storm when a drag sweeps 400 cells. Cells are addressed by
   (visible leaf index, leaf column index) — a folded drawer simply
   takes its rows out of that set, so nothing downstream needs to
   know grouping exists.

   Above the headings sits the SPANNING BAND ROW — a section's name
   across the run of columns that share it. Folding a band takes its
   columns out of the addressable set upstream (`useSectionedView`),
   exactly as folding a drawer takes rows out of it, so nothing in
   here has to know sections exist beyond drawing them.

   To the left of all of it, frozen: the row ordinal, and THE DISPLAY
   COLUMN. A price register is 4,248px of sheet in a 508px card — 12%
   of it on screen — so scrolling to the price band used to leave
   fifteen variants of one model reading as six identical rows of
   numbers with nothing on screen saying which boat was which. The
   column `displayFieldOf` names is drawn `position: sticky` in every
   row, in the heading row and in the section band above it, so the
   name is still there at the far right of the sheet. Only that one
   column, and only ever in place — it is the SAME cell, so it is
   still selected, edited, filled and copied exactly as before.

   Stacking, deliberately: cells 0 · overlays 2 · the active ring 3 ·
   pinned column and the frozen gutter 4 · pinned header 5 · frozen
   header 6 · corner 7. The active-cell ring can never draw over the
   frozen chrome, and the frozen chrome always wins over the pin.
   ============================================================ */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { JSX, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import {
  accentVar,
  displayFieldOf,
  isImageValue,
  isSystemFieldId,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type ImageRef,
  type RowData,
} from '@/types/model'
import {
  normalizeRange,
  type CellRef,
  type ColumnFilter,
  type SortDir,
  type SortState,
  type ViewRow,
} from '@/features/table/core'
import { CellEditor, CellFace } from './GridCell'
import { RegisterRail, type RailCrumb } from './RegisterRail'
import type { RowDensity, RowMetrics } from './tableReadState'
import { FilterMenu } from './FilterMenu'
import { ColumnMenu } from './ColumnMenu'
import { AddColumnPopover } from './AddColumnPopover'
import {
  DisclosureGlyph,
  LockGlyph,
  MenuGlyph,
  OpenRowGlyph,
  PlusGlyph,
  SortChevron,
} from './glyphs'
import {
  ImageLightbox,
  ImageStrip,
  readImageFiles,
  type LightboxState,
} from './ImageCell'
import {
  UNASSIGNED_LABEL,
  countLabel,
  firstLineAt,
  type GridLayout,
  type GroupNode,
  type LeafNoun,
} from './grouping'
import {
  bandsOf,
  foldChipText,
  foldWidthFor,
  layoutColumns,
  pinWidthOf,
  windowColumns,
  type ColumnSlot,
  type DrawItem,
} from './sections'
import type { LinkTarget, NewColumn } from './useColumnCommands'
import { columnKindOf } from './columnKinds'
import {
  ADD_COL_W,
  BAND_H,
  COL_OVERSCAN,
  GUTTER_W,
  INDENT_W,
  ROW_H,
  TIGHT_COL_W,
  cellInsetW,
  cellPrintText,
  cellText,
  clampWidth,
  fillTarget,
  fullySelectedCols,
  isEmptyCell,
  markKey,
  mayBeClipped,
  moveImage,
  pad2,
  plural,
  primaryRange,
  rowOverscan,
  selContains,
  shouldWindowRows,
  singleSel,
  valueFaceOf,
  valueForField,
  widthOf,
  type CellRange,
  type EditState,
  type GridSel,
  type MoveDir,
} from './helpers'
import { useHeaderRowHeight } from './headerHeight'
import { usePaintedWidth } from './nameColumnWidth'

const NO_IMAGES: ImageRef[] = []

export type { MoveDir }

/* ============================================================
   WHAT THE RAIL CANNOT COUNT FOR ITSELF.

   Everything about WHERE THE WINDOW IS — the drawer you are inside,
   the first and last row on screen — is a fact about this scroller
   and is worked out here, from numbers this component already tracks
   for windowing. Everything about what the TABLE holds is the
   sheet's, and arrives on this. Absent = no rail, which is the
   on-canvas card: a 249px card has no room for a status line and no
   question it would answer. See `RegisterRail`.
   ============================================================ */
export interface GridRail {
  /** rows that came through the narrowing, before any drawer folded */
  matching: number
  /** rows the table holds */
  held: number
  columns: number
  shownColumns: number
  density: RowDensity
  onDensity: (d: RowDensity) => void
  onlyFilled: boolean
  emptyColumns: number
  onOnlyFilled: (v: boolean) => void
}

export interface GridProps {
  entity: EntityDef
  /** the columns a leaf row shows — drawer columns are already gone,
   *  and so are the columns of any folded band */
  fields: FieldDef[]
  /** what the header and the rows DRAW, in order: those same columns,
   *  plus the chip each folded band leaves in its place. Built with
   *  `fields` in one pass, so the two can never disagree. */
  slots: ColumnSlot[]
  /** the leaves on screen, in drawn order */
  viewRows: ViewRow[]
  rowById: Map<string, RowData>
  hasFormula: boolean
  computedFor: (row: RowData) => Record<string, CellValue>
  refLabelOf: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
  targetEntityOf: (f: FieldDef) => EntityDef | undefined
  targetRowsOf: (f: FieldDef) => RowData[] | undefined
  distinctFor: (fieldId: string) => string[]

  /** where every line sits, grouped or flat */
  layout: GridLayout
  /** what each grouping level is CALLED, outermost first — "Brand",
   *  "Range". A grouping line prints its level's name beside its
   *  value, so two levels can never read as the same line. */
  levelNames: string[]
  /** THE COLUMNS THE TABLE IS FILED UNDER, outermost first.
   *
   *  The full-window lens deliberately keeps them on screen — retyping
   *  one boat's Series is how that boat moves to another drawer — so
   *  every cell in them repeats the drawer heading three rows above it.
   *  That is the one genuinely redundant thing on this sheet, and the
   *  answer is not to delete the column (that would take the re-filing
   *  with it) but to draw it as FILING rather than as data: same value,
   *  same case, a quieter ground, so the eye reads past it to the
   *  figures it came for. Absent on the card, which hides them outright. */
  levelIds?: string[]
  /** what the rows are called, for the group counts */
  noun: LeafNoun

  search: string
  sort: SortState | null
  filters: ColumnFilter[]
  marks: Set<string>
  /** the row a search sent us to, marked for as long as an arrival
   *  needs marking. Selection says where the cursor is; this says
   *  which row was ASKED for, which on an 83-row register is not the
   *  same question. */
  found?: string | null
  sel: GridSel
  editing: EditState | null
  colWidths: Record<string, number>
  gridRef: RefObject<HTMLDivElement | null>
  /** The grid's own scroller, handed back to the caller. The toolbar
   *  needs it for two things it cannot do without the real element:
   *  measure the window a FIT has to share out, and scroll a band into
   *  view. Optional — the on-canvas register has no toolbar. */
  viewportRef?: RefObject<HTMLDivElement | null>

  /** how tall this lens draws its lines. Absent = the register's own
   *  geometry, which is what the card and every test still get. The
   *  SAME metrics must have built `layout`, or the rows and the
   *  scroller would disagree about where row 300 is. */
  metrics?: RowMetrics
  /** the row whose every field is open beside the sheet, by id */
  openRowId?: string | null
  /** press a row's open mark, or Enter — absent on a lens that has no
   *  detail panel, and then Enter keeps its spreadsheet meaning */
  onOpenRow?: (r: number) => void
  /** Escape, while a row is open */
  onCloseRow?: () => void
  /** '/' — put the caret in the register's own row search */
  onFocusSearch?: () => void
  /** the status rail under the sheet. Absent on the card. */
  rail?: GridRail

  onSel: (s: GridSel) => void
  onKey: (e: React.KeyboardEvent<HTMLDivElement>, pageSize: number) => void
  onPasteText: (text: string) => void
  onBeginEdit: (cell: CellRef, seed?: string) => void
  onDraft: (t: string) => void
  onPick: (v: CellValue) => void
  onCommitEdit: (move: MoveDir) => void
  onToggleBool: (cell: CellRef) => void
  onFill: (region: { r0: number; r1: number; c0: number; c1: number }) => void
  onResize: (fieldId: string, w: number) => void
  onSort: (fieldId: string, dir: SortDir | null) => void
  onFilter: (fieldId: string, f: ColumnFilter | null) => void

  /* -- columns -------------------------------------------------- */
  onRenameColumn: (fieldId: string, name: string) => void
  onRemoveColumn: (fieldId: string) => void
  onEditOptions: (fieldId: string, options: string[]) => void
  onAddColumn: (spec: NewColumn) => boolean
  linkTargets: LinkTarget[]
  suggestColumnName: () => string

  /* -- bands (no-ops on a table with no sections) --------------- */
  onToggleSection: (sectionId: string) => void

  /* -- pictures -------------------------------------------------- */
  onImages: (rowId: string, fieldId: string, next: ImageRef[]) => void

  /* -- groups (no-ops on a flat table) -------------------------- */
  onToggleGroup: (key: string) => void
  onAddRowInGroup: (path: string[]) => void
  onRenameGroup: (node: GroupNode, next: string) => void
}

type Drag =
  | { kind: 'cell' }
  | { kind: 'row'; anchor: number }
  | { kind: 'fill' }
  | null

function ColumnGap({ w }: { w: number }): JSX.Element {
  return <span className="tb-colgap" style={{ width: w }} aria-hidden="true" />
}

/* ============================================================
   PRESSING A HEADING ORDERS THE COLUMN.

   It used to RENAME it. Measured against how the register is
   actually used, that had the two acts exactly the wrong way round:
   a dealer orders a price column by cost, by RRP, by length, dozens
   of times a day, and it cost two presses down a menu they had to
   know was there — while renaming a column, which happens a handful
   of times in the life of a table, was the one thing a stray click
   on a heading did. Every spreadsheet this person has ever opened
   sorts on the heading.

   So the heading is the sort control, the wedge beside the name says
   which way (and is drawn at rest, dim, so the affordance exists
   before the pointer arrives), and RENAME moves into the ⌄ menu
   beside "Show only some…" where the rest of a column's rarer acts
   already live. Nothing is lost and nothing new is drawn: the
   heading gains a state mark, not a second button.

   Three presses is the whole cycle, and the third is the one most
   grids get wrong by omitting: first to last, last to first, and
   BACK TO THE TABLE'S OWN ORDER — which on a nested register is the
   filing the dealer built, and is not recoverable any other way. */
function nextSort(cur: SortDir | null): SortDir | null {
  if (cur === 'asc') return 'desc'
  if (cur === 'desc') return null
  return 'asc'
}

interface AnchoredMenu {
  fieldId: string
  rect: DOMRect
}

export function Grid(props: GridProps): JSX.Element {
  const {
    entity,
    fields,
    slots,
    viewRows,
    rowById,
    hasFormula,
    computedFor,
    refLabelOf,
    targetEntityOf,
    targetRowsOf,
    distinctFor,
    layout,
    levelNames,
    levelIds,
    noun,
    search,
    sort,
    filters,
    marks,
    found,
    sel,
    editing,
    colWidths,
    gridRef,
    viewportRef,
    metrics,
    openRowId,
    onOpenRow,
    onCloseRow,
    onFocusSearch,
    rail,
    onSel,
    onKey,
    onPasteText,
    onBeginEdit,
    onDraft,
    onPick,
    onCommitEdit,
    onToggleBool,
    onFill,
    onResize,
    onSort,
    onFilter,
    onRenameColumn,
    onRemoveColumn,
    onEditOptions,
    onAddColumn,
    linkTargets,
    suggestColumnName,
    onToggleSection,
    onImages,
    onToggleGroup,
    onAddRowInGroup,
    onRenameGroup,
  } = props

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<Drag>(null)
  const fillToRef = useRef<CellRef | null>(null)
  const resizeRef = useRef<{ fieldId: string; startX: number; startW: number } | null>(null)
  /* An inline rename commits on Enter AND on blur, and Enter causes a
     blur — so both fire for one edit. These refs mirror the rename
     state synchronously (React state has not caught up by the time the
     blur arrives), and clearing one is what makes the second call a
     no-op. Escape clears them too, so an abandoned rename can never be
     committed by the blur it causes. */
  const renameRef = useRef<{ fieldId: string; draft: string } | null>(null)
  const groupRenameRef = useRef<{ key: string; draft: string } | null>(null)

  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewport, setViewport] = useState({ w: 800, h: 600 })
  const [fillTo, setFillTo] = useState<CellRef | null>(null)
  const [menu, setMenu] = useState<AnchoredMenu | null>(null)
  const [filterFor, setFilterFor] = useState<AnchoredMenu | null>(null)
  const [addCol, setAddCol] = useState<DOMRect | null>(null)
  const [renaming, setRenaming] = useState<{ fieldId: string; draft: string } | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<{ key: string; draft: string } | null>(null)

  const rows = viewRows.length
  const cols = fields.length

  /* THE DRAWN ROW HEIGHT, AND IT IS A NUMBER RATHER THAN A CLASS.
     `layout` was built with these same metrics upstream, so every
     line's `top` already agrees with them; what is left here is the
     four places the grid does its own arithmetic in row units —
     keeping the cursor in view, a page of PageDown, the windowing
     decision and the selection rectangle. Absent (the card, the
     tests) it is exactly the constant it has always been. */
  const rowH = metrics?.rowH ?? ROW_H

  /* the filing columns, and only while the sheet is actually nested —
     see `levelIds` on the props */
  const filed = useMemo(
    () => new Set(layout.grouped ? (levelIds ?? []) : []),
    [layout.grouped, levelIds],
  )

  /* Geometry runs on SLOTS, addressing runs on FIELDS. A folded band's
     chip holds real width here, which is what keeps the band row, the
     heading row and every data row in the same columns.

     The chips share the window when eleven of them at their natural
     width would not fit — COLLAPSE ALL exists to put the table's
     SHAPE on one screen, and a shape you have to scroll is not one.
     `viewport.w` is the scroller's own measured width, so this
     re-settles by itself when the card is resized or expanded. */
  const foldW = useMemo(
    () => foldWidthFor(slots, colWidths, viewport.w),
    [slots, colWidths, viewport.w],
  )
  const colLayout = useMemo(
    () => layoutColumns(slots, colWidths, foldW),
    [slots, colWidths, foldW],
  )
  const { left: colX, right: colRight, total: bodyW } = colLayout
  const sheetW = GUTTER_W + bodyW + ADD_COL_W

  /* -- the frozen name column -----------------------------------
     ONE column is pinned and it is the one `displayFieldOf` names:
     the thing a reader would say out loud to identify the row. It is
     resolved from the ENTITY, so the card, the FOCUS lens and every
     other place a grid is drawn freeze the same column.
     `undefined` when the table has no display column at all, or when
     its band is folded away — a chip cannot be pinned open. */
  const pinFieldId = useMemo(() => {
    const display = displayFieldOf(entity)
    if (!display) return undefined
    return fields.some((f) => f.id === display.id) ? display.id : undefined
  }, [entity, fields])

  /* what the pin costs the reader on the left edge. Everything that
     scrolls a column to the left edge has to clear this. */
  const pinW = useMemo(() => pinWidthOf(colLayout, pinFieldId), [colLayout, pinFieldId])

  /* -- the column window ---------------------------------------
     The mirror of the row windowing below: only the slots the
     scroller actually crosses are drawn, and every skipped run is
     drawn as one spacer. The locked identifier, the pinned display
     column and the column holding the live editor are never dropped —
     see `windowColumns`. */
  const drawList = useMemo<DrawItem[]>(
    () =>
      windowColumns(
        colLayout,
        scrollLeft,
        viewport.w,
        COL_OVERSCAN,
        editing !== null ? editing.col : undefined,
        pinFieldId,
      ),
    [colLayout, scrollLeft, viewport.w, editing, pinFieldId],
  )

  const bands = useMemo(() => bandsOf(colLayout, pinFieldId), [colLayout, pinFieldId])
  /* a run in no band draws nothing, so a table whose columns are all
     unbanded gets no band row at all — and is exactly as tall as it
     has always been */
  const banded = useMemo(() => bands.some((b) => b.section !== undefined), [bands])
  const bandH = banded ? BAND_H : 0

  /* -- the heading row's own height -----------------------------
     A HEADING SHOWS ALL OF ITS TEXT OR SHOWS THAT THERE IS MORE, and
     18 of Northside's 782 headings used to show neither — see the
     note at the bottom of table.css. The height cannot be left to
     CSS because it is a number here: `.tb-head` carries it inline and
     `headH` below is what the row virtualiser subtracts from
     `scrollTop`. So the real heading markup is laid out once, hidden,
     at the real column widths, and its height is read off the
     browser (`headerHeight.ts`).

     `headFields` is EVERY column, not the windowed ones: a heading
     row that grew as you scrolled sideways would move the sheet
     under the pointer. */
  const headProbeRef = useRef<HTMLDivElement | null>(null)
  const headFields = useMemo(
    () =>
      colLayout.placed.flatMap((p) =>
        p.slot.kind === 'field' ? [{ field: p.slot.field, w: p.w }] : [],
      ),
    [colLayout],
  )
  /* what a re-measure has to wait for: a name, a width or a type
     changing. Anything else the probe would answer identically. */
  const headKey = useMemo(
    () => headFields.map((h) => `${h.field.name}\u0000${h.w}\u0000${h.field.type}`).join('\u0001'),
    [headFields],
  )
  const headRowH = useHeaderRowHeight(headProbeRef, headKey)
  const headH = headRowH + bandH

  /* THE PAINTED WIDTH OF A VALUE, so a cut one can be told from one
     that fits. Cached per string — see `usePaintedWidth`. `undefined`
     on the first frame, before a cell exists to read the face off,
     which is what `mayBeClipped`'s character estimate is still for. */
  const paintedWidth = usePaintedWidth()

  const refLabels = useMemo(
    () => fields.map((f) => refLabelOf(f)),
    [fields, refLabelOf],
  )
  const filterByField = useMemo(() => {
    const m = new Map<string, ColumnFilter>()
    for (const f of filters) m.set(f.fieldId, f)
    return m
  }, [filters])
  const selectedCols = useMemo(() => fullySelectedCols(sel, rows), [sel, rows])

  /* grouping lines pin themselves to the left edge of what you can
     actually see, so a drawer's name and its count stay legible however
     far right the data columns are scrolled */
  const stickyW = Math.min(viewport.w, sheetW)

  /* -- viewport measurement ------------------------------------ */
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = (): void =>
      setViewport((prev) => {
        const w = el.clientWidth
        const h = el.clientHeight
        /* A card whose body is skipped by `content-visibility: auto`
           measures 0×0. That is "not being painted", not "no room" —
           adopting it would share the fold chips out over nothing and
           window the columns down to one. Keep the last real
           measurement until the card is on screen again. */
        if (w <= 0 || h <= 0) return prev
        return prev.w === w && prev.h === h ? prev : { w, h }
      })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pageSize = Math.max(1, Math.floor((viewport.h - headH) / rowH) - 1)

  /* -- windowing ------------------------------------------------
     Body coordinates start below the frozen header — bands included —
     so the visible slice is measured from (scrollTop - headH).

     THE FOLD DECIDES, NOT THE ROW COUNT. `shouldWindowRows` and
     `rowOverscan` carry the measurement and the reason: on a 249px
     card every table in the file is under `VIRTUALIZE_ABOVE`, so
     every card drew every row, and each row costs two composited
     layers. Nothing about this is visible — the scroller keeps its
     full height from `layout.bodyH` either way. */
  const lines = layout.lines
  const bodyRoom = Math.max(0, viewport.h - headH)
  const virtual = shouldWindowRows(rows, layout.bodyH, bodyRoom, rowH)
  const over = rowOverscan(bodyRoom, rowH)
  const viewTop = scrollTop - headH
  const first = virtual ? Math.max(0, firstLineAt(lines, viewTop) - over) : 0
  const last = virtual
    ? Math.min(lines.length, firstLineAt(lines, viewTop + viewport.h) + over + 1)
    : lines.length

  /* -- WHERE THE WINDOW IS, for the rail ------------------------
     Two walks over the lines the scroller is actually crossing, both
     of them from numbers already computed above, so the rail costs no
     listener and no measurement:

       BACKWARDS from the top of the window for the drawer chain it
       sits inside — the grouping line has scrolled off, the answer it
       gave has not.

       FORWARDS across the window for the first and last row on it.

     A window standing entirely on grouping lines has no row on it,
     and then `railFrom` stays 0 and the rail says the count without
     inventing a range for it. */
  let railFrom = 0
  let railTo = 0
  const railCrumbs: RailCrumb[] = []
  if (rail && rows > 0 && lines.length > 0) {
    const top = Math.max(0, viewTop)
    const bottom = viewTop + bodyRoom
    const at = Math.min(firstLineAt(lines, top), lines.length - 1)

    const chain: Array<RailCrumb | undefined> = []
    for (let k = at; k >= 0; k -= 1) {
      const ln = lines[k]
      if (ln.kind !== 'group') continue
      const level = ln.node.level
      if (chain[level] === undefined) {
        chain[level] = {
          level: levelNames[level] ?? '',
          value: ln.node.value === '' ? UNASSIGNED_LABEL : ln.node.value,
        }
      }
      if (level === 0) break
    }
    for (const c of chain) if (c) railCrumbs.push(c)

    for (let k = at; k < lines.length; k += 1) {
      const ln = lines[k]
      if (ln.top >= bottom) break
      if (ln.kind !== 'leaf') continue
      if (railFrom === 0) railFrom = ln.r + 1
      railTo = ln.r + 1
    }
  }

  /* -- keep the active cell in view ----------------------------- */
  const activeKey = `${sel.active.row}:${sel.active.col}`
  const topOfLeaf = layout.topOfLeaf
  useEffect(() => {
    const el = scrollRef.current
    if (!el || rows === 0 || cols === 0) return
    const { row, col } = sel.active
    const rowTop = topOfLeaf(row)
    /* A ROW ARROWED TO NEVER LANDS ON THE LAST LINE OF THE WINDOW.
       It used to: the else-branch put the row's bottom edge exactly
       on the scroller's bottom edge, which is the one strip of this
       page the app's own floating furniture stands over — measured
       at 1280x720, the action bar's top edge is 13px inside the
       register's scroller, so the row you had just arrowed to was
       the row with a bar across it.

       The row-reveal path already had to work around the same edge
       ("row 54 of the 83-row register arrived with 6px of it under
       the bottom rail" — see `TableSheet`, which nudges an arrival
       into the upper third). This closes it for the keyboard too,
       and for the same reason.

       One row of clearance, capped at a fifth of the window so a
       short register does not spend a quarter of itself on margin.
       It is NOT a fix for the geometry itself — the reservation for
       the bar is owned in one place, `src/app/actionbar.css`, and
       says so; this is only the register declining to put the cursor
       where it cannot be read. */
    const keep = Math.min(rowH, Math.round(el.clientHeight / 5))
    if (rowTop < el.scrollTop) el.scrollTop = rowTop
    else if (rowTop + rowH > el.scrollTop + el.clientHeight - headH - keep) {
      el.scrollTop = rowTop + rowH - el.clientHeight + headH + keep
    }
    /* the pinned column is frozen on screen — scrolling to reveal it
       would only throw the sheet back to its left edge */
    if (fields[col]?.id === pinFieldId) return
    const left = colX[col] ?? 0
    const right = colRight[col] ?? left
    /* a column revealed at the left edge has to clear the pin as well
       as the gutter, or the pin covers the cell we just went to */
    if (left < el.scrollLeft + pinW) el.scrollLeft = Math.max(0, left - pinW)
    else if (right > el.scrollLeft + el.clientWidth - GUTTER_W) {
      el.scrollLeft = right - el.clientWidth + GUTTER_W
    }
    /* colX/fields are stable within a render; the active cell is the
       only trigger we want here */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, rows, cols, pinW, pinFieldId])

  /* the window-level release handler must read the CURRENT selection,
     never the one captured when the listener was installed */
  const selRef = useRef(sel)
  selRef.current = sel

  /* -- drag release, wherever the pointer ends up --------------- */
  useEffect(() => {
    const stop = (): void => {
      const d = dragRef.current
      const resizing = resizeRef.current
      if (d) {
        dragRef.current = null
        if (d.kind === 'fill' && fillToRef.current) {
          const base = normalizeRange(primaryRange(selRef.current))
          onFill(fillTarget(base, fillToRef.current))
        }
        fillToRef.current = null
        setFillTo(null)
      }
      if (resizing) resizeRef.current = null
      if (d || resizing) {
        document.body.classList.remove('tb-dragging', 'tb-resizing')
      }
    }
    const move = (e: MouseEvent): void => {
      const r = resizeRef.current
      if (!r) return
      onResize(r.fieldId, clampWidth(r.startW + (e.clientX - r.startX)))
    }
    window.addEventListener('mouseup', stop)
    window.addEventListener('blur', stop)
    window.addEventListener('mousemove', move)
    return () => {
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('blur', stop)
      window.removeEventListener('mousemove', move)
      document.body.classList.remove('tb-dragging', 'tb-resizing')
    }
  }, [onFill, onResize])

  /* -- pointer routing (delegated: no per-cell closures) -------- */
  const cellFrom = (e: ReactMouseEvent): CellRef | null => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-r]')
    if (!el) return null
    const r = Number(el.dataset.r)
    const c = Number(el.dataset.c)
    if (!Number.isFinite(r) || !Number.isFinite(c)) return null
    return { row: r, col: c }
  }

  const onBodyMouseDown = (e: ReactMouseEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    /* clicks inside the live editor, or on a grouping line's own
       controls, belong to those — not to the selection */
    const target = e.target as HTMLElement
    if (target.closest('.tb-editor, .tb-grp, .tb-addrow, .tb-open')) return
    const cell = cellFrom(e)
    if (!cell) return
    /* Re-ordering pictures needs the browser's OWN drag to start, and
       `preventDefault` here would kill it. So a mousedown on a
       thumbnail selects its cell and then gets out of the way — no
       sweep, no preventDefault. */
    if (target.closest('.tb-imgslot')) {
      gridRef.current?.focus()
      onSel(singleSel(cell))
      return
    }
    e.preventDefault()
    gridRef.current?.focus()
    document.body.classList.add('tb-dragging')

    if (cell.col < 0) {
      /* row-number gutter — whole row */
      const full: CellRange = {
        anchor: { row: cell.row, col: 0 },
        focus: { row: cell.row, col: Math.max(0, cols - 1) },
      }
      const active = { row: cell.row, col: 0 }
      if (e.ctrlKey || e.metaKey) onSel({ active, ranges: [...sel.ranges, full] })
      else if (e.shiftKey) {
        onSel({
          active,
          ranges: [
            {
              anchor: { row: sel.active.row, col: 0 },
              focus: { row: cell.row, col: Math.max(0, cols - 1) },
            },
          ],
        })
      } else onSel({ active, ranges: [full] })
      dragRef.current = { kind: 'row', anchor: cell.row }
      return
    }

    if (e.shiftKey) {
      onSel({
        active: sel.active,
        ranges: [...sel.ranges.slice(0, -1), { anchor: sel.active, focus: cell }],
      })
      dragRef.current = { kind: 'cell' }
      return
    }
    if (e.ctrlKey || e.metaKey) {
      onSel({ active: cell, ranges: [...sel.ranges, { anchor: cell, focus: cell }] })
      dragRef.current = { kind: 'cell' }
      return
    }
    onSel(singleSel(cell))
    dragRef.current = { kind: 'cell' }
  }

  const onBodyMouseOver = (e: ReactMouseEvent<HTMLDivElement>): void => {
    const d = dragRef.current
    if (!d) return
    const cell = cellFrom(e)
    if (!cell) return
    if (d.kind === 'fill') {
      fillToRef.current = cell
      setFillTo(cell)
      return
    }
    if (d.kind === 'row') {
      onSel({
        active: sel.active,
        ranges: [
          ...sel.ranges.slice(0, -1),
          {
            anchor: { row: d.anchor, col: 0 },
            focus: { row: cell.row, col: Math.max(0, cols - 1) },
          },
        ],
      })
      return
    }
    const prev = primaryRange(sel)
    if (prev.focus.row === cell.row && prev.focus.col === cell.col) return
    onSel({
      active: sel.active,
      ranges: [...sel.ranges.slice(0, -1), { anchor: prev.anchor, focus: cell }],
    })
  }

  const onBodyDoubleClick = (e: ReactMouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement
    if (target.closest('.tb-editor, .tb-grp, .tb-addrow, .tb-imgslot, .tb-open')) return
    const cell = cellFrom(e)
    if (!cell) return
    /* THE GUTTER IS THE ROW, so a double-press on it opens the row —
       the same act the open mark performs, in the place a person aims
       at when they mean "this whole line" rather than "this cell". */
    if (cell.col < 0) {
      if (onOpenRow) onOpenRow(cell.row)
      return
    }
    const field = fields[cell.col]
    if (field?.type === 'image') {
      const rowId = viewRows[cell.row]?.rowId
      if (rowId) chooseImages(rowId, field.id, imagesAt(rowId, field.id))
      return
    }
    onBeginEdit(cell)
  }

  const startResize = (e: ReactMouseEvent, f: FieldDef): void => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      fieldId: f.id,
      startX: e.clientX,
      startW: widthOf(f, colWidths),
    }
    document.body.classList.add('tb-dragging', 'tb-resizing')
  }

  const selectAll = useCallback((): void => {
    if (rows === 0 || cols === 0) return
    onSel({
      active: { row: 0, col: 0 },
      ranges: [{ anchor: { row: 0, col: 0 }, focus: { row: rows - 1, col: cols - 1 } }],
    })
    gridRef.current?.focus()
  }, [rows, cols, onSel, gridRef])

  const selectColumn = useCallback(
    (col: number): void => {
      if (rows === 0) return
      onSel({
        active: { row: 0, col },
        ranges: [{ anchor: { row: 0, col }, focus: { row: rows - 1, col } }],
      })
    },
    [rows, onSel],
  )

  /* -- overlays -------------------------------------------------- */
  const rectOf = (n: { r0: number; r1: number; c0: number; c1: number }): {
    left: number
    top: number
    width: number
    height: number
  } => {
    /* clamp here too: a range can outlive its rows for exactly one
       render, between a delete/filter/fold and the selection-hygiene
       effect */
    const c0 = Math.max(0, Math.min(n.c0, cols - 1))
    const c1 = Math.max(0, Math.min(n.c1, cols - 1))
    const r0 = Math.max(0, Math.min(n.r0, rows - 1))
    const r1 = Math.max(r0, Math.min(n.r1, rows - 1))
    const left = GUTTER_W + (colX[c0] ?? 0)
    /* a folded band between two selected columns is NOT selected, but
       the rectangle still spans it — one continuous box, exactly as a
       range spanning a grouping line draws one continuous box */
    const right = GUTTER_W + (colRight[c1] ?? bodyW)
    const top = topOfLeaf(r0)
    return {
      left,
      top,
      width: Math.max(0, right - left),
      /* a range that spans a drawer boundary covers the grouping line
         between them — one continuous rectangle, never a broken one */
      height: Math.max(rowH, topOfLeaf(r1) + rowH - top),
    }
  }

  const primary = primaryRange(sel)
  const primaryNorm = normalizeRange(primary)
  const fillPreview =
    fillTo && dragRef.current?.kind === 'fill'
      ? fillTarget(primaryNorm, fillTo)
      : null

  const menuField = menu ? fields.find((f) => f.id === menu.fieldId) : undefined
  const filterField = filterFor
    ? fields.find((f) => f.id === filterFor.fieldId)
    : undefined
  /* built once per open menu — distinct values walk every stored row */
  const menuValues = useMemo(
    () => (filterFor ? distinctFor(filterFor.fieldId) : []),
    [filterFor, distinctFor],
  )

  /* -- inline renaming ------------------------------------------- */

  const startRename = (fieldId: string, draft: string): void => {
    const next = { fieldId, draft }
    renameRef.current = next
    setRenaming(next)
  }
  const draftRename = (draft: string): void => {
    const live = renameRef.current
    if (!live) return
    const next = { ...live, draft }
    renameRef.current = next
    setRenaming(next)
  }
  const commitRename = (): void => {
    const live = renameRef.current
    renameRef.current = null
    setRenaming(null)
    if (!live) return
    onRenameColumn(live.fieldId, live.draft)
    gridRef.current?.focus()
  }
  const cancelRename = (): void => {
    renameRef.current = null
    setRenaming(null)
    gridRef.current?.focus()
  }

  const startGroupRename = (key: string, draft: string): void => {
    const next = { key, draft }
    groupRenameRef.current = next
    setRenamingGroup(next)
  }
  const draftGroupRename = (draft: string): void => {
    const live = groupRenameRef.current
    if (!live) return
    const next = { ...live, draft }
    groupRenameRef.current = next
    setRenamingGroup(next)
  }
  const commitGroupRename = (node: GroupNode): void => {
    const live = groupRenameRef.current
    groupRenameRef.current = null
    setRenamingGroup(null)
    if (!live) return
    const next = live.draft.trim()
    if (next !== node.value) onRenameGroup(node, next)
    gridRef.current?.focus()
  }
  const cancelGroupRename = (): void => {
    groupRenameRef.current = null
    setRenamingGroup(null)
    gridRef.current?.focus()
  }

  /* -- pictures --------------------------------------------------
     ONE hidden chooser and ONE enlarged plate for the whole grid: a
     picture column forty rows deep must not mount forty file inputs
     and forty overlays. */
  const fileRef = useRef<HTMLInputElement | null>(null)
  const addToRef = useRef<{
    rowId: string
    fieldId: string
    existing: ImageRef[]
  } | null>(null)
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const imagesAt = useCallback(
    (rowId: string, fieldId: string): ImageRef[] => {
      const v = rowById.get(rowId)?.values[fieldId] ?? null
      return isImageValue(v) ? v : NO_IMAGES
    },
    [rowById],
  )

  const chooseImages = useCallback(
    (rowId: string, fieldId: string, existing: ImageRef[]) => {
      addToRef.current = { rowId, fieldId, existing }
      fileRef.current?.click()
    },
    [],
  )

  const appendImages = useCallback(
    (rowId: string, fieldId: string, existing: ImageRef[], files: FileList) => {
      void readImageFiles(files).then((added) => {
        if (added.length > 0) onImages(rowId, fieldId, [...existing, ...added])
      })
    },
    [onImages],
  )

  const activeField = fields[sel.active.col]

  const onGridKey = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    /* This one handler sits above every control the sheet draws, and it
       claims Enter, Space and Tab. A key typed while one of those
       controls has focus BELONGS to that control: Enter and Space must
       activate a band, a drawer or a + ROW, and Tab must be able to
       leave the grid. So the grid only takes keys typed at the grid
       itself.
       Two deliberate exceptions stay with the grid: the live cell
       editor, which lets Enter/Tab/Escape bubble here on purpose, and
       the in-cell plates (thumbnails, the yes/no tick), which carry
       tabIndex -1 precisely because they are not keyboard stops. */
    const control = (e.target as HTMLElement).closest<HTMLElement>(
      'button, input, select, textarea, a[href]',
    )
    if (
      control !== null &&
      control.tabIndex !== -1 &&
      !control.classList.contains('tb-editor')
    ) {
      return
    }
    const bare = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey

    /* ---- WHY J AND K ARE NOT HERE ----
       They step rows on the ROW DETAIL, and only there. On this sheet
       a printable character opens the editor and types itself into the
       cell — that is how every value in this file gets entered — so a
       register where J moved the cursor would be a register where the
       first letter of "Jeanneau" jumped the cursor down a row instead
       of starting the word. The reading surface has no such contract:
       nothing is typed at the panel itself, only into its boxes, and
       each box stops its own keys. So J / K / ↑ / ↓ step rows there
       and the arrows keep doing it here, unchanged. */

    /* ---- '/' PUTS THE CARET IN THE ROW SEARCH ----
       It is a printable character, so on this sheet it would otherwise
       begin typing a value — and that is the trade, stated: a price
       file holds no value that STARTS with a slash, while "find the
       row" is a thing a dealer does dozens of times an hour. If one
       ever does, F2 opens the editor and takes it. Nothing is
       animated: the caret is in the box on the same frame. */
    if (!editing && bare && onFocusSearch && e.key === '/') {
      e.preventDefault()
      onFocusSearch()
      return
    }

    /* ---- ESCAPE CLOSES THE OPEN ROW ----
       Only when one is open and nothing nearer is claiming the key: a
       menu, a filter or the add-column sheet each close on their own
       Escape, and the stage above uses a spare one to leave the page.
       This sits between the two. */
    if (
      !editing &&
      e.key === 'Escape' &&
      onCloseRow &&
      openRowId != null &&
      menu === null &&
      filterFor === null &&
      addCol === null
    ) {
      e.preventDefault()
      onCloseRow()
      return
    }

    /* ---- ENTER OPENS THE ROW ----
       WHAT IT USED TO DO, and why losing it costs nothing: not
       editing, Enter moved the cursor down one row — which is
       ArrowDown, on the same sheet, unchanged. Enter INSIDE the editor
       still commits and moves down, which is the one that carries
       data entry, and F2 or any printable character still opens the
       editor. What Enter buys instead is the answer to "what IS this
       boat" without a sideways scroll.
       On a lens with no detail panel (the on-canvas card) `onOpenRow`
       is absent and Enter keeps its spreadsheet meaning exactly. */
    if (!editing && bare && onOpenRow && e.key === 'Enter' && rows > 0) {
      e.preventDefault()
      onOpenRow(sel.active.row)
      return
    }

    /* A picture column has no editor to open, so F2 — and Enter, on a
       lens with no detail panel — opens the chooser instead, and the
       promise those keys make stays true. */
    if (
      !editing &&
      activeField?.type === 'image' &&
      (e.key === 'F2' || (e.key === 'Enter' && !onOpenRow))
    ) {
      const rowId = viewRows[sel.active.row]?.rowId
      if (rowId) {
        e.preventDefault()
        chooseImages(rowId, activeField.id, imagesAt(rowId, activeField.id))
        return
      }
    }
    onKey(e, pageSize)
  }

  return (
    <div
      className={
        'tb-grid' +
        (layout.grouped ? ' tb-grid-grouped' : '') +
        /* THE HEIGHTS ARE NOT SET HERE and cannot be: `layout` has
           already placed every line from the same metrics. This class
           carries only what a taller row makes ROOM for — a thumbnail
           that can be looked at, a gutter figure at the reading step. */
        (metrics && metrics.rowH > ROW_H ? ' tb-grid-roomy' : '') +
        /* the status rail is a FLOOR, not an overlay: the scroller
           gives up 30px to it rather than having a strip drawn over
           its last row. So the grid becomes a column when it has one. */
        (rail ? ' tb-grid-railed' : '')
      }
      ref={gridRef}
      role="grid"
      tabIndex={0}
      aria-rowcount={rows + 1 + (banded ? 1 : 0)}
      aria-colcount={cols + 1}
      aria-label={`${entity.name} table`}
      /* A FOCUS RING BELONGS ON THE THING THAT HAS FOCUS.
         `.tb-grid` is the keyboard stop for the whole register, so it
         carries `tabIndex={0}` and a `:focus-visible` ring — and that
         ring was being painted around the ENTIRE 1440x694 register
         every time somebody clicked a cell, and held there for as long
         as they typed. The cause is two lines working together, both of
         them correct on their own: `onBodyMouseDown` calls
         `preventDefault()` so a drag-select does not start a text
         selection, and then calls `focus()` itself because the
         prevented default no longer moves focus. Chrome cannot tell a
         scripted `focus()` on a `tabindex` div from a keyboard arrival,
         so it matches `:focus-visible` and draws the ring.
         The fix is to say which it was. A pointer press marks the grid,
         the ring stands down for that press, and the CELL's own 2px
         ring (`.tb-cell-on`) is the indicator — which is what a person
         typing in a cell needs to see. Nothing about keyboard focus
         changes: Tab still lands here, there is no mousedown on a Tab,
         so the mark is absent and the whole-grid ring still draws. The
         mark is cleared on blur, so tabbing back in after clicking
         shows the ring again. */
      onMouseDownCapture={() => {
        gridRef.current?.setAttribute('data-pointer-focus', '')
      }}
      onBlur={(e) => {
        /* ONLY WHEN FOCUS REALLY LEAVES. React's `onBlur` is
           `focusout`, which bubbles, so an unguarded handler cleared
           the mark every time the cell editor opened — and the editor
           hands focus straight back to the grid on commit, from a
           keystroke, which is the exact arrival Chrome reads as
           keyboard. That is the "ring stays up the whole time anyone
           types" half of the fault. The mark therefore survives every
           move INSIDE the register and only goes when the next thing
           to hold focus is outside it. */
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        gridRef.current?.removeAttribute('data-pointer-focus')
      }}
      onKeyDown={onGridKey}
      onPaste={(e) => {
        /* a paste INTO a live input that happens to sit inside the grid —
           the cell editor, a heading being renamed, or a menu's own box —
           belongs to that input. The block paste only ever runs against a
           selection, never mid-edit and never into a menu. */
        if (
          editing ||
          (e.target as HTMLElement).closest('.tb-editor, .tb-menu, .tb-inline')
        ) {
          return
        }
        const text = e.clipboardData?.getData('text/plain') ?? ''
        if (text === '') return
        e.preventDefault()
        onPasteText(text)
      }}
    >
      {/* -- how tall the heading row has to be ------------------
          A hidden copy of one heading cell per column, at that
          column's real width, carrying the same classes the live
          heading does — so what it measures is what the live row
          will do, with no font metrics and no wrap simulation. It is
          0x0 and clipped, so it costs the sheet no scroll width, and
          `visibility: hidden` keeps it out of the paint and out of
          the accessibility tree. See headerHeight.ts. */}
      <div className="tb-headprobe" aria-hidden="true">
        <div className="tb-headprobe-row" ref={headProbeRef}>
          {headFields.map(({ field, w }) => (
            <div
              key={field.id}
              className={'tb-th' + (w < TIGHT_COL_W ? ' tb-th-tight' : '')}
              style={{ width: w }}
            >
              <span className="tb-th-main">
                <span className="tb-th-top">
                  <span className="tb-th-name">
                    {field.name}
                    {field.required === true && <span className="tb-th-req">*</span>}
                  </span>
                  {/* THE WEDGE IS IN THE PROBE BECAUSE IT IS IN THE
                      HEADING. It is `flex: none` beside a name that
                      wraps, so a probe without it measures a name with
                      ten more pixels to wrap into and reports a row one
                      line too short. */}
                  <SortChevron dir={null} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="tb-scroll"
        ref={(el) => {
          scrollRef.current = el
          if (viewportRef) viewportRef.current = el
        }}
        onScroll={(e) => {
          const t = e.currentTarget.scrollTop
          const l = e.currentTarget.scrollLeft
          setScrollTop((prev) => (Math.abs(prev - t) < 1 ? prev : t))
          setScrollLeft((prev) => (Math.abs(prev - l) < 1 ? prev : l))
        }}
      >
        {/* WHETHER THE SHEET HAS MOVED, SAID ON THE SHEET — THE DEPTH
            LADDER, AND WHY IT IS ATTRIBUTES AND NOT MORE STICKY
            ELEMENTS.

            A frozen header only reads as frozen once something has
            gone under it. At rest it is a row at the top of a page and
            a shadow under it is ornament — there is nothing beneath it
            to lift off; the moment the first row slides under, there
            are 588, and the shadow is the only thing telling a reader
            that the names above are pinned rather than scrolled off.
            The same argument, sideways, for the row-number gutter and
            the frozen name column — forty columns of figures pass
            under them and nothing said they were passing UNDER.

            So the lift is a fact about the SCROLL. Both flags are read
            off the scroll offsets this component already tracks for
            windowing, so neither costs a listener, a measurement or a
            render: one class recalculation on the frame the sheet
            leaves the top or the left edge, and nothing on any frame
            after it.

            They are set HERE, on the two elements that already exist
            and are already sticky — the head stack (one per sheet)
            and the sheet itself (one per sheet) — because a register
            carries two `position: sticky` per RENDERED ROW already
            (the row-number gutter and the frozen name column) and
            that count, times the rows on screen, is what took a
            canvas from 54 fps to 12. A third is not affordable and is
            not needed: one flag on one ancestor styles every pin.

            Two names for the sideways state, and both are spent: the
            sheet's `data-shifted` carries the edge as a shadow
            (`--tb-edge`, which each pinned cell restates alongside its
            own), and `data-xscroll` steps the rule's own ink on the
            same pins — a border colour rather than a second shadow per
            rendered row. One fact, read twice, off one attribute
            each. */}
        <div
          className="tb-sheet"
          style={{ width: sheetW }}
          data-lifted={scrollTop > 0 ? '' : undefined}
          data-shifted={scrollLeft > 0 ? '' : undefined}
          {...(scrollLeft > 0 ? { 'data-xscroll': '' } : {})}
        >
          {/* -- frozen header: bands, then headings -------------- */}
          <div className="tb-headstack" {...(scrollTop > 0 ? { 'data-lift': '' } : {})}>
            {banded && (
              <div
                className="tb-bands"
                role="row"
                aria-rowindex={1}
                style={{ height: BAND_H }}
              >
                <span
                  className="tb-bandcorner"
                  style={{ width: GUTTER_W }}
                  aria-hidden="true"
                />
                {bands.map((b) => {
                  /* a run in no band is drawn as nothing at all — an
                     empty header over four unbanded columns reads as a
                     bug, not as a section */
                  if (!b.section) {
                    return (
                      <span
                        key={b.key}
                        className={
                          'tb-band tb-band-plain' + (b.pinned ? ' tb-band-pin' : '')
                        }
                        style={{ width: b.w, ...(b.pinned ? { left: GUTTER_W } : {}) }}
                        aria-hidden="true"
                      />
                    )
                  }
                  const section = b.section
                  const ink = accentVar(section.accent ?? 'graphite')
                  /* what the PRESS does, which is fold the whole run —
                     never the width of the piece it landed on */
                  const cols = plural(b.runCount ?? b.count, 'column', 'columns')
                  return (
                    <div
                      key={b.key}
                      className={
                        'tb-band' +
                        (b.collapsed ? ' tb-band-shut' : '') +
                        (b.pinned ? ' tb-band-pin' : '')
                      }
                      role="columnheader"
                      {...(b.collapsed
                        ? {}
                        : { 'aria-colindex': b.from + 2, 'aria-colspan': b.count })}
                      style={{
                        width: b.w,
                        ['--tb-band-ink' as string]: ink,
                        ...(b.pinned ? { left: GUTTER_W } : {}),
                      }}
                    >
                      <button
                        type="button"
                        className="tb-band-btn"
                        aria-expanded={!b.collapsed}
                        aria-label={
                          b.collapsed
                            ? `${section.name} — ${cols} folded away. Open them.`
                            : `${section.name} — ${cols}. Fold them away.`
                        }
                        title={
                          b.collapsed
                            ? `${section.name} — ${cols} folded away. Click to bring them back.`
                            : `${section.name} — ${cols}. Click to fold them away.`
                        }
                        onClick={() => onToggleSection(section.id)}
                      >
                        {/* the other half of a run the pin cut: the ink
                            and the fold control stay, the name does not
                            repeat — see `muted` in `bandsOf` */}
                        {!b.muted && (
                          <span className="tb-band-name">
                            {b.collapsed ? foldChipText(section, b.count) : section.name}
                          </span>
                        )}
                      </button>
                      {!b.collapsed && (
                        <span className="tb-band-rule" aria-hidden="true" />
                      )}
                    </div>
                  )
                })}
                <span
                  className="tb-bandend"
                  style={{ width: ADD_COL_W }}
                  aria-hidden="true"
                />
              </div>
            )}

            <div
              className="tb-head"
              role="row"
              aria-rowindex={banded ? 2 : 1}
              style={{ height: headRowH }}
            >
              <button
                type="button"
                className="tb-corner"
                style={{ width: GUTTER_W }}
                title="Select every cell"
                aria-label="Select all cells"
                onClick={selectAll}
              >
                <span className="tb-corner-mark" aria-hidden="true" />
              </button>
              {drawList.map((item) => {
                if (item.kind === 'gap') return <ColumnGap key={item.key} w={item.w} />
                const { slot, x, w } = item.placed
                if (slot.kind === 'fold') {
                  return (
                    <div
                      key={`fold:${slot.section.id}:${x}`}
                      className="tb-th tb-th-fold"
                      style={{ width: w }}
                      aria-hidden="true"
                    >
                      <span className="tb-th-foldmark" />
                    </div>
                  )
                }
                const f = slot.field
                const i = slot.col
                const dir = sort?.fieldId === f.id ? sort.dir : null
                const filtered = filterByField.has(f.id)
                const system = isSystemFieldId(f.id)
                /* the heading freezes WITH its column — same sticky
                   offset in the same scroller, so the two cannot drift
                   apart by so much as a pixel */
                const pinned = f.id === pinFieldId
                return (
                  <div
                    key={f.id}
                    role="columnheader"
                    aria-colindex={i + 2}
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
                    className={
                      'tb-th' +
                      (dir ? ' tb-th-sorted' : '') +
                      (selectedCols.has(i) ? ' tb-th-selected' : '') +
                      (f.type === 'formula' ? ' tb-th-fx' : '') +
                      /* A NAME SITS OVER ITS OWN FIGURES. Every number
                         in this register paints hard against the right
                         rule of its column; a heading left-aligned over
                         it left the two ends of the column disagreeing
                         about where the column was. Only a declared
                         `number` column turns round to face its own
                         figures — see the note in table.css §3. */
                      (f.type === 'number' ? ' tb-th-num' : '') +
                      (filed.has(f.id) ? ' tb-th-filed' : '') +
                      (system ? ' tb-th-sys' : '') +
                      (slot.section ? ' tb-th-banded' : '') +
                      (pinned ? ' tb-th-pin' : '') +
                      /* fitted down to a stripe (or dragged there): the
                         heading gives up its inset and its stamps, and
                         the band above it carries the naming */
                      (w < TIGHT_COL_W ? ' tb-th-tight' : '')
                    }
                    style={{
                      width: w,
                      ...(pinned ? { left: GUTTER_W } : {}),
                      ...(slot.section
                        ? {
                            ['--tb-band-ink' as string]: accentVar(
                              slot.section.accent ?? 'graphite',
                            ),
                          }
                        : {}),
                    }}
                  >
                    {renaming !== null && renaming.fieldId === f.id ? (
                      <input
                        className="tb-th-edit tb-inline"
                        value={renaming.draft}
                        autoFocus
                        spellCheck={false}
                        aria-label={`Rename ${f.name}`}
                        onChange={(e) => draftRename(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') cancelRename()
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="tb-th-main"
                        /* WHAT THE PRESS WILL DO, IN THE ORDER IT WILL
                           DO IT — and the third state named, because
                           "put it back" is the one a person cannot
                           guess and the one that returns a nested
                           register to the filing they built. */
                        title={
                          `${f.name} — ` +
                          (system
                            ? 'the row’s permanent identifier, never renamed or edited. '
                            : f.type === 'formula'
                              ? 'worked out from other columns, not typed into. '
                              : filed.has(f.id)
                                ? 'the sheet is filed under this column, so every row repeats its drawer’s name. Retype one to move that row to another drawer. '
                                : `holds ${columnKindOf(f.type).label.toLowerCase()}. `) +
                          (dir === 'asc'
                            ? 'Ordered first to last — click for last to first.'
                            : dir === 'desc'
                              ? 'Ordered last to first — click to put the table back in its own order.'
                              : 'Click to order it first to last. The ⌄ menu narrows, renames and removes.')
                        }
                        onClick={() => {
                          selectColumn(i)
                          onSort(f.id, nextSort(dir))
                        }}
                      >
                        <span className="tb-th-top">
                          {system && (
                            <span className="tb-th-lock" aria-hidden="true">
                              <LockGlyph />
                            </span>
                          )}
                          <span className="tb-th-name">
                            {f.name}
                            {f.required && !system && (
                              <span className="tb-th-req" title="Required">
                                *
                              </span>
                            )}
                          </span>
                          {/* DRAWN AT REST, NOT ONLY WHEN SORTED. An
                              affordance that appears after you have
                              already used it is not an affordance; the
                              wedge sits dim in every heading so the
                              column reads as orderable before the
                              pointer arrives, and lights when it is. */}
                          <SortChevron dir={dir} />
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={
                        'tb-th-menu' + (filtered || dir ? ' tb-th-menu-on' : '')
                      }
                      aria-label={`${f.name} column menu`}
                      aria-haspopup="dialog"
                      title={
                        filtered
                          ? `Only some ${f.name} values are showing`
                          : `Sort, narrow or change ${f.name}`
                      }
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setFilterFor(null)
                        setMenu((m) => (m?.fieldId === f.id ? null : { fieldId: f.id, rect }))
                      }}
                    >
                      <MenuGlyph />
                    </button>
                    <span
                      className="tb-grip"
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${f.name}`}
                      title="Drag to resize · double-click to reset"
                      onMouseDown={(e) => startResize(e, f)}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        onResize(f.id, 0)
                      }}
                    />
                  </div>
                )
              })}

              {/* the one way to widen a table — at the end of its columns,
                  where the next one would go */}
              <button
                type="button"
                className="tb-th-add"
                style={{ width: ADD_COL_W }}
                aria-label="Add a column"
                aria-haspopup="dialog"
                title="Add a column"
                onClick={(e) => setAddCol(e.currentTarget.getBoundingClientRect())}
              >
                <PlusGlyph />
              </button>
            </div>
          </div>

          {/* -- body ---------------------------------------------- */}
          <div
            className="tb-body"
            style={{ height: Math.max(layout.bodyH, 1) }}
            onMouseDown={onBodyMouseDown}
            onMouseOver={onBodyMouseOver}
            onDoubleClick={onBodyDoubleClick}
          >
            {lines.slice(first, last).map((line) => {
              /* ---- a drawer's own line ---- */
              if (line.kind === 'group') {
                const node = line.node
                const named = node.value !== ''
                /* the word the user chose for this level — "Brand" —
                   printed on the line itself. Without it two nested
                   levels waiting to be filled in are the same grey line
                   twice, and nothing on the sheet ever says where the
                   brand goes. */
                const levelName = levelNames[node.level] ?? ''
                const levelWord = levelName === '' ? 'group' : levelName.toLowerCase()
                const fillPrompt = `Name this ${levelWord}`
                const groupSays = named
                  ? `${levelName === '' ? '' : `${levelName}: `}${node.value}`
                  : `${levelName === '' ? 'Group' : levelName} — not named yet`
                return (
                  <div
                    key={`g:${node.key}`}
                    className={'tb-grpline' + (line.collapsed ? ' tb-grpline-shut' : '')}
                    /* WHICH LEVEL THIS IS, so the outermost drawer can
                       be drawn as a BAND and the ones nested inside it
                       as the quieter lines they are. Two identically
                       weighted grey lines, one inside the other, is
                       how a nested register loses its structure. */
                    data-level={node.level}
                    style={{ top: line.top, height: line.h, width: sheetW }}
                    role="row"
                  >
                    <div
                      className="tb-grp"
                      style={{
                        width: stickyW,
                        paddingLeft: GUTTER_W + node.level * INDENT_W,
                      }}
                    >
                      <button
                        type="button"
                        className="tb-grp-tw"
                        aria-expanded={!line.collapsed}
                        aria-label={`${line.collapsed ? 'Open' : 'Close'} ${groupSays}`}
                        title={line.collapsed ? 'Open' : 'Close'}
                        onClick={() => onToggleGroup(node.key)}
                      >
                        <DisclosureGlyph open={!line.collapsed} />
                      </button>

                      {levelName !== '' && (
                        <span className="tb-grp-lab" aria-hidden="true">
                          {levelName}
                        </span>
                      )}

                      {renamingGroup !== null && renamingGroup.key === node.key ? (
                        <input
                          className="tb-grp-edit tb-inline"
                          value={renamingGroup.draft}
                          autoFocus
                          spellCheck={false}
                          placeholder={levelName}
                          aria-label={
                            levelName === ''
                              ? 'Name this group'
                              : `${levelName} for ${countLabel(node.leafCount, noun)}`
                          }
                          onChange={(e) => draftGroupRename(e.target.value)}
                          onBlur={() => commitGroupRename(node)}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') commitGroupRename(node)
                            if (e.key === 'Escape') cancelGroupRename()
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className={
                            'tb-grp-name' +
                            (node.level === 0 ? ' tb-grp-name-top' : '') +
                            (named ? '' : ' tb-grp-name-none')
                          }
                          title={
                            named
                              ? `${node.value} — click to rename every ${noun.one} filed here`
                              : `Type the ${levelWord} for ${countLabel(
                                  node.leafCount,
                                  noun,
                                )} filed here`
                          }
                          onClick={() => startGroupRename(node.key, node.value)}
                        >
                          {named ? node.value : fillPrompt}
                        </button>
                      )}

                      <span className="tb-grp-rule" aria-hidden="true" />
                      <span className="tb-grp-count">
                        {countLabel(node.leafCount, noun)}
                      </span>
                    </div>
                  </div>
                )
              }

              /* ---- the quiet + ROW at a drawer's foot ---- */
              if (line.kind === 'add') {
                return (
                  <div
                    key={`a:${line.key}`}
                    className="tb-addline"
                    style={{ top: line.top, height: line.h, width: sheetW }}
                    role="row"
                  >
                    <div
                      className="tb-addrow"
                      style={{
                        width: stickyW,
                        paddingLeft: GUTTER_W + line.level * INDENT_W,
                      }}
                    >
                      <button
                        type="button"
                        className="tb-addbtn"
                        title={
                          line.named
                            ? `Add a ${noun.one} to ${line.label} — this group’s values are filled in for you`
                            : `Add another ${noun.one} here`
                        }
                        onClick={() => onAddRowInGroup(line.path)}
                      >
                        <PlusGlyph />
                        <span className="tb-addbtn-text">{noun.one}</span>
                      </button>
                    </div>
                  </div>
                )
              }

              /* ---- a data row ---- */
              const r = line.r
              const row = rowById.get(line.rowId)
              if (!row) return null
              const values = hasFormula ? computedFor(row) : row.values
              return (
                <div
                  key={line.rowId}
                  className={
                    'tb-row' +
                    (r % 2 === 1 ? ' tb-row-alt' : '') +
                    (found === line.rowId ? ' tb-row-found' : '') +
                    /* THE ROW WHOSE EVERY FIELD IS OPEN BESIDE THE
                       SHEET. Not the selection — the cursor moves about
                       inside a row while it is open — so it is a mark
                       of its own, and it is a rail and a ground rather
                       than a scale: a list row darkens, it never grows. */
                    (openRowId === line.rowId ? ' tb-row-open' : '')
                  }
                  role="row"
                  /* the band row takes index 1 when it is drawn, so the
                     headings take 2 and the data starts at 3 */
                  aria-rowindex={r + 2 + (banded ? 1 : 0)}
                  style={{ top: line.top, height: line.h, width: sheetW }}
                >
                  {/* THE ROW NUMBER IS WHAT IDENTIFIES A ROW, and this
                      gutter has always drawn it — `helpers.ts` calls
                      GUTTER_W the "frozen row-number gutter". What used
                      to sit immediately to its right was a UID SYSTEM
                      column printing a ten-character machine key, on
                      every register in the app. That column is gone
                      (see the note on `fields` in useTableData.ts), and
                      the id it printed lands here instead: named in the
                      tooltip, beside the number, available to anyone
                      who needs it and shouted at nobody who does not. */}
                  <div
                    className={
                      'tb-gut' +
                      (sel.active.row === r ? ' tb-gut-on' : '') +
                      (openRowId === line.rowId ? ' tb-gut-open' : '')
                    }
                    data-r={r}
                    data-c={-1}
                    role="rowheader"
                    aria-colindex={1}
                    style={{ width: GUTTER_W }}
                    title={
                      onOpenRow
                        ? `Row ${r + 1} · click to select it, Ctrl+click to add it, double-click to open every column of it\nIdentifier ${line.rowId}`
                        : `Row ${r + 1} · click to select it, Ctrl+click to add it\nIdentifier ${line.rowId}`
                    }
                  >
                    <span className="tb-gut-n">{pad2(r + 1)}</span>
                    {/* THE WAY IN TO ONE ROW. At rest it is not drawn at
                        all — the gutter is a column of ordinals and has
                        to stay one — and it arrives with the pointer on
                        the row, which is the moment the offer is worth
                        making. `tabIndex={-1}` on purpose: twenty of
                        these in the tab order would make Tab useless,
                        and the keyboard has Enter, which is better than
                        tabbing to a mark. */}
                    {onOpenRow && (
                      <button
                        type="button"
                        className="tb-open"
                        tabIndex={-1}
                        aria-expanded={openRowId === line.rowId}
                        aria-label={`Open every column of row ${r + 1}`}
                        title={
                          openRowId === line.rowId
                            ? 'Every column of this row is open — Escape closes it'
                            : 'Open every column of this row — Enter'
                        }
                        onMouseDown={(e) => {
                          /* the sweep-select this gutter starts belongs
                             to the gutter, not to the mark on it */
                          e.stopPropagation()
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenRow(r)
                        }}
                      >
                        <OpenRowGlyph />
                      </button>
                    )}
                  </div>
                  {drawList.map((item) => {
                    if (item.kind === 'gap') return <ColumnGap key={item.key} w={item.w} />
                    const { slot, x, w } = item.placed
                    /* a folded band leaves a quiet stripe the width of
                       its chip — no data-r/data-c, so it is not a cell,
                       cannot be selected and cannot be typed into */
                    if (slot.kind === 'fold') {
                      return (
                        <div
                          key={`fold:${slot.section.id}:${x}`}
                          className="tb-foldcell"
                          style={{ width: w }}
                          aria-hidden="true"
                        />
                      )
                    }
                    const f = slot.field
                    const c = slot.col
                    const system = isSystemFieldId(f.id)
                    const stored = valueForField(row, f, values)
                    const isEditing =
                      !system &&
                      editing !== null &&
                      editing.rowId === line.rowId &&
                      editing.fieldId === f.id
                    const isActive = sel.active.row === r && sel.active.col === c
                    const selected = selContains(sel, { row: r, col: c })
                    /* a system column is never blank and never the user's
                       to fill — the red-pencil required tick must not
                       stripe every row of it */
                    const reqEmpty =
                      f.required === true &&
                      f.type !== 'formula' &&
                      !system &&
                      isEmptyCell(row.values[f.id])
                    const marked = marks.has(markKey(line.rowId, f.id))
                    const copyText = viewRows[r]?.text[f.id] ?? cellText(stored, f, refLabels[c])
                    /* what the cell PAINTS — the app's one money format.
                       `copyText` is still what it copies and what the
                       editor seeds with, so typing 41340 stores 41340. */
                    const text = cellPrintText(f, stored, copyText)
                    const brokenRef =
                      f.type === 'reference' && targetEntityOf(f) === undefined
                    /* the pinned column paints its own selection: the
                       overlay rectangles are drawn at the column's
                       SCROLLED position and slide out from under it */
                    const pinned = f.id === pinFieldId
                    return (
                      <div
                        key={f.id}
                        role="gridcell"
                        aria-colindex={c + 2}
                        aria-selected={selected}
                        aria-readonly={f.type === 'formula' || system || undefined}
                        data-r={r}
                        data-c={c}
                        className={
                          'tb-cell' +
                          (c === 0 ? ' tb-cell-lead' : '') +
                          (f.type === 'formula' ? ' tb-cell-fx' : '') +
                          (filed.has(f.id) ? ' tb-cell-filed' : '') +
                          (system ? ' tb-cell-sys' : '') +
                          (reqEmpty ? ' tb-cell-req' : '') +
                          (marked ? ' tb-cell-mark' : '') +
                          (f.type === 'image' ? ' tb-cell-img' : '') +
                          (isEditing ? ' tb-cell-editing' : '') +
                          (pinned ? ' tb-cell-pin' : '') +
                          (pinned && isActive ? ' tb-cell-pin-on' : '') +
                          (w < TIGHT_COL_W ? ' tb-cell-tight' : '')
                        }
                        style={{ width: w, ...(pinned ? { left: GUTTER_W } : {}) }}
                        title={
                          marked
                            ? 'Pasted value could not be read as this column’s type — the cell was left unset'
                            : reqEmpty
                              ? `${f.name} is required`
                              : system
                                ? 'Row identifier — read-only. Ctrl+C copies it.'
                                : /* A CUT VALUE STILL SAYS ALL OF ITSELF.
                                     The name column is measured to its
                                     content now, but a ceiling is a ceiling
                                     and a 66-character trailer name on a
                                     1280px window is legitimately clamped —
                                     as is any long value in a column at the
                                     116px floor. Where the ellipsis is the
                                     honest answer, the whole string is the
                                     cell's title, so nothing on this sheet
                                     is unreachable. Gated by
                                     `mayBeClipped` so a value that fits
                                     carries no tooltip: a register that
                                     spoke on every hover would be worse
                                     than one that clipped.

                                     AND THE GATE IS MEASURED NOW. It
                                     estimated 5.4px a character, which
                                     is a lower bound for lower case and
                                     far under the truth for the upper
                                     case a price file is full of: 216
                                     of Rigging Kits' 468 cut values
                                     were scored as fitting and carried
                                     no title at all. It also charged
                                     every column the same 25px of
                                     inset, when the first column of a
                                     GROUPED register is stepped in by
                                     another 18. Both are read off the
                                     real geometry here. */
                                  mayBeClipped(
                                      text,
                                      w,
                                      cellInsetW({
                                        w,
                                        groupedLead: c === 0 && layout.grouped,
                                        pick: f.type === 'select' || f.type === 'reference',
                                        image: f.type === 'image',
                                      }),
                                      paintedWidth === undefined
                                        ? undefined
                                        : (s) => paintedWidth(s, valueFaceOf(f)),
                                    )
                                  ? text
                                  : undefined
                        }
                      >
                        {f.type === 'image' ? (
                          (() => {
                            const imgs = isImageValue(stored) ? stored : NO_IMAGES
                            return (
                              <ImageStrip
                                field={f}
                                kind={entity.kind}
                                cellKey={`${line.rowId}:${f.id}`}
                                images={imgs}
                                isActive={isActive}
                                onOpen={(index) =>
                                  setLightbox({
                                    images: imgs,
                                    index,
                                    fieldName: f.name,
                                    kind: entity.kind,
                                    rowId: line.rowId,
                                    fieldId: f.id,
                                  })
                                }
                                onAdd={() => chooseImages(line.rowId, f.id, imgs)}
                                /* pictures that already exist as values —
                                   addresses read off the clipboard, files the
                                   cell has already read into `data:` URLs */
                                onAddImages={(added) =>
                                  onImages(line.rowId, f.id, [...imgs, ...added])
                                }
                                onRemove={(index) =>
                                  onImages(
                                    line.rowId,
                                    f.id,
                                    imgs.filter((_, k) => k !== index),
                                  )
                                }
                                onReorder={(from, to) =>
                                  onImages(line.rowId, f.id, moveImage(imgs, from, to))
                                }
                                onDropFiles={(files) =>
                                  appendImages(line.rowId, f.id, imgs, files)
                                }
                              />
                            )
                          })()
                        ) : isEditing && editing ? (
                          <CellEditor
                            field={f}
                            draft={editing.draft}
                            targetEntity={targetEntityOf(f)}
                            targetRows={targetRowsOf(f)}
                            onDraft={onDraft}
                            onPick={onPick}
                            onBlurCommit={() => onCommitEdit('none')}
                          />
                        ) : (
                          <CellFace
                            field={f}
                            value={stored}
                            text={text}
                            search={search}
                            isActive={isActive}
                            brokenRef={brokenRef}
                            onToggleBool={() => onToggleBool({ row: r, col: c })}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* -- selection overlays ----------------------------- */}
            {rows > 0 && cols > 0 && (
              <>
                {sel.ranges.map((rg, i) => {
                  const n = normalizeRange(rg)
                  const box = rectOf(n)
                  const isPrimary = i === sel.ranges.length - 1
                  return (
                    <div
                      key={i}
                      className={'tb-rangebox' + (isPrimary ? ' tb-rangebox-main' : '')}
                      style={box}
                      aria-hidden="true"
                    />
                  )
                })}
                {fillPreview && (
                  <div className="tb-fillbox" style={rectOf(fillPreview)} aria-hidden="true" />
                )}
                <div
                  className={'tb-ring' + (editing ? ' tb-ring-edit' : '')}
                  style={rectOf({
                    r0: sel.active.row,
                    r1: sel.active.row,
                    c0: sel.active.col,
                    c1: sel.active.col,
                  })}
                  aria-hidden="true"
                />
                {!editing && (
                  <div
                    className="tb-fillhandle"
                    title="Drag to fill · Ctrl+D fills down"
                    style={{
                      left: rectOf(primaryNorm).left + rectOf(primaryNorm).width - 4,
                      top: rectOf(primaryNorm).top + rectOf(primaryNorm).height - 4,
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return
                      e.preventDefault()
                      e.stopPropagation()
                      dragRef.current = { kind: 'fill' }
                      document.body.classList.add('tb-dragging')
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* -- the status rail --------------------------------------
          Below the sheet, outside the scroller, so nothing it says is
          ever drawn over a row. See `RegisterRail` for why it is at
          the foot and why it is worth 30px. */}
      {rail && (
        <RegisterRail
          noun={noun}
          crumbs={railCrumbs}
          from={railFrom}
          to={railTo}
          onSheet={rows}
          matching={rail.matching}
          held={rail.held}
          columns={rail.columns}
          shownColumns={rail.shownColumns}
          density={rail.density}
          onDensity={rail.onDensity}
          onlyFilled={rail.onlyFilled}
          emptyColumns={rail.emptyColumns}
          onOnlyFilled={rail.onOnlyFilled}
        />
      )}

      {menu && menuField && (
        <ColumnMenu
          field={menuField}
          entityId={entity.id}
          anchor={menu.rect}
          sortDir={sort?.fieldId === menuField.id ? sort.dir : null}
          filtered={filterByField.has(menuField.id)}
          onSort={(dir) => {
            onSort(menuField.id, dir)
            selectColumn(fields.indexOf(menuField))
          }}
          onFilter={() => setFilterFor({ fieldId: menuField.id, rect: menu.rect })}
          /* RENAME MOVED HERE when the heading became the sort control.
             It is still done in place, in the heading's own well — the
             menu only opens the box. */
          onRename={() => startRename(menuField.id, menuField.name)}
          onEditOptions={(options) => onEditOptions(menuField.id, options)}
          onRemove={() => onRemoveColumn(menuField.id)}
          onClose={() => setMenu(null)}
        />
      )}

      {filterFor && filterField && (
        <FilterMenu
          field={filterField}
          anchor={filterFor.rect}
          values={menuValues}
          current={filterByField.get(filterField.id)}
          onApply={(f) => onFilter(filterField.id, f)}
          onClose={() => setFilterFor(null)}
        />
      )}

      {addCol && (
        <AddColumnPopover
          anchor={addCol}
          suggestedName={suggestColumnName()}
          linkTargets={linkTargets}
          sections={entity.sections}
          /* a new column is appended at the far right, so the band it
             lands in is the band of the column it lands beside */
          landsIn={entity.fields[entity.fields.length - 1]?.sectionId}
          onCreate={onAddColumn}
          onClose={() => setAddCol(null)}
        />
      )}

      {/* one chooser for the whole sheet — see the picture notes above */}
      <input
        ref={fileRef}
        className="tb-filein"
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const target = addToRef.current
          addToRef.current = null
          const files = e.target.files
          if (target && files && files.length > 0) {
            appendImages(target.rowId, target.fieldId, target.existing, files)
          }
          /* clear it, or choosing the same file twice fires nothing */
          e.target.value = ''
          gridRef.current?.focus()
        }}
      />

      {lightbox && (
        <ImageLightbox
          state={lightbox}
          onIndex={(index) => setLightbox((s) => (s ? { ...s, index } : s))}
          /* the plate's promote button is a move-to-index-0 and nothing
             else — the same array move the drag performs, so order stays
             the only thing that elects the primary */
          onPromote={(index) => {
            const next = moveImage(lightbox.images, index, 0)
            onImages(lightbox.rowId, lightbox.fieldId, next)
            setLightbox({ ...lightbox, images: next, index: 0 })
          }}
          onClose={() => {
            setLightbox(null)
            gridRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}
