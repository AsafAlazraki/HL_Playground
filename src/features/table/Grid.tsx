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
import { FilterMenu } from './FilterMenu'
import { ColumnMenu } from './ColumnMenu'
import { AddColumnPopover } from './AddColumnPopover'
import { DisclosureGlyph, LockGlyph, MenuGlyph, PlusGlyph, SortChevron } from './glyphs'
import {
  ImageLightbox,
  ImageStrip,
  readImageFiles,
  type LightboxState,
} from './ImageCell'
import {
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
  HEAD_H,
  INDENT_W,
  OVERSCAN,
  ROW_H,
  TIGHT_COL_W,
  VIRTUALIZE_ABOVE,
  cellPrintText,
  cellText,
  clampWidth,
  fillTarget,
  fullySelectedCols,
  isEmptyCell,
  markKey,
  moveImage,
  pad2,
  plural,
  primaryRange,
  selContains,
  singleSel,
  valueForField,
  widthOf,
  type CellRange,
  type EditState,
  type GridSel,
  type MoveDir,
} from './helpers'

const NO_IMAGES: ImageRef[] = []

export type { MoveDir }

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
  /** what the rows are called, for the group counts */
  noun: LeafNoun

  search: string
  sort: SortState | null
  filters: ColumnFilter[]
  marks: Set<string>
  sel: GridSel
  editing: EditState | null
  colWidths: Record<string, number>
  gridRef: RefObject<HTMLDivElement | null>
  /** The grid's own scroller, handed back to the caller. The toolbar
   *  needs it for two things it cannot do without the real element:
   *  measure the window a FIT has to share out, and scroll a band into
   *  view. Optional — the on-canvas register has no toolbar. */
  viewportRef?: RefObject<HTMLDivElement | null>

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
    noun,
    search,
    sort,
    filters,
    marks,
    sel,
    editing,
    colWidths,
    gridRef,
    viewportRef,
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
  const headH = HEAD_H + bandH

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

  const pageSize = Math.max(1, Math.floor((viewport.h - headH) / ROW_H) - 1)

  /* -- windowing ------------------------------------------------
     Body coordinates start below the frozen header — bands included —
     so the visible slice is measured from (scrollTop - headH). */
  const lines = layout.lines
  const virtual = rows > VIRTUALIZE_ABOVE
  const viewTop = scrollTop - headH
  const first = virtual ? Math.max(0, firstLineAt(lines, viewTop) - OVERSCAN) : 0
  const last = virtual
    ? Math.min(lines.length, firstLineAt(lines, viewTop + viewport.h) + OVERSCAN + 1)
    : lines.length

  /* -- keep the active cell in view ----------------------------- */
  const activeKey = `${sel.active.row}:${sel.active.col}`
  const topOfLeaf = layout.topOfLeaf
  useEffect(() => {
    const el = scrollRef.current
    if (!el || rows === 0 || cols === 0) return
    const { row, col } = sel.active
    const rowTop = topOfLeaf(row)
    if (rowTop < el.scrollTop) el.scrollTop = rowTop
    else if (rowTop + ROW_H > el.scrollTop + el.clientHeight - headH) {
      el.scrollTop = rowTop + ROW_H - el.clientHeight + headH
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
    if (target.closest('.tb-editor, .tb-grp, .tb-addrow')) return
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
    if (target.closest('.tb-editor, .tb-grp, .tb-addrow, .tb-imgslot')) return
    const cell = cellFrom(e)
    if (!cell || cell.col < 0) return
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
      height: Math.max(ROW_H, topOfLeaf(r1) + ROW_H - top),
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
    /* Enter opens the editor everywhere else on this sheet; on a
       picture column there is no editor to open, so it opens the
       chooser instead and the promise Enter makes stays true. */
    if (!editing && activeField?.type === 'image' && (e.key === 'Enter' || e.key === 'F2')) {
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
      className={'tb-grid' + (layout.grouped ? ' tb-grid-grouped' : '')}
      ref={gridRef}
      role="grid"
      tabIndex={0}
      aria-rowcount={rows + 1 + (banded ? 1 : 0)}
      aria-colcount={cols + 1}
      aria-label={`${entity.name} table`}
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
        <div className="tb-sheet" style={{ width: sheetW }}>
          {/* -- frozen header: bands, then headings -------------- */}
          <div className="tb-headstack">
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
              style={{ height: HEAD_H }}
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
                        title={
                          system
                            ? `${f.name} — the row’s permanent identifier. Sort, narrow and copy it; it can never be renamed or edited.`
                            : `${f.name} — holds ${columnKindOf(f.type).label.toLowerCase()}. Click to rename. The ⌄ menu sorts, narrows and removes.`
                        }
                        onClick={() => {
                          selectColumn(i)
                          if (!system) startRename(f.id, f.name)
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
                          {dir && <SortChevron dir={dir} />}
                        </span>
                        {/* A heading says what the column is CALLED. What it
                            HOLDS is already obvious from the cells under it
                            and from the editor when you type — so the only
                            thing worth stamping here is the one state a
                            reader cannot see: a column they may not fill in
                            themselves. */}
                        {(system || f.type === 'formula') && (
                          <span className="tb-th-meta">
                            {system && (
                              <span
                                className="tb-th-sys-tag"
                                title="Assigned when the row is created, never editable"
                              >
                                system
                              </span>
                            )}
                            {f.type === 'formula' && (
                              <span className="tb-th-ro" title="Worked out — not editable">
                                calculated
                              </span>
                            )}
                          </span>
                        )}
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
                  className={'tb-row' + (r % 2 === 1 ? ' tb-row-alt' : '')}
                  role="row"
                  /* the band row takes index 1 when it is drawn, so the
                     headings take 2 and the data starts at 3 */
                  aria-rowindex={r + 2 + (banded ? 1 : 0)}
                  style={{ top: line.top, height: line.h, width: sheetW }}
                >
                  <div
                    className={'tb-gut' + (sel.active.row === r ? ' tb-gut-on' : '')}
                    data-r={r}
                    data-c={-1}
                    role="rowheader"
                    aria-colindex={1}
                    style={{ width: GUTTER_W }}
                    title="Click to select the row · Ctrl+click to add it"
                  >
                    {pad2(r + 1)}
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

      {menu && menuField && (
        <ColumnMenu
          field={menuField}
          anchor={menu.rect}
          sortDir={sort?.fieldId === menuField.id ? sort.dir : null}
          filtered={filterByField.has(menuField.id)}
          onSort={(dir) => {
            onSort(menuField.id, dir)
            selectColumn(fields.indexOf(menuField))
          }}
          onFilter={() => setFilterFor({ fieldId: menuField.id, rect: menu.rect })}
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
