/* ============================================================
   useSheetCommands — every command a grid can issue, performed
   against ONE entity.

   Extracted from TableSheet so the full-window sheet and the
   on-canvas entity-table node run the EXACT same editing behaviour:
   the same whitespace-seed guard (a spacebar never voids a
   list/date/link/yes-no cell), the same paste rule (targets are
   addressed by rowId, never by view index), the same fill-right rule
   (a calculated source column is read through the evaluator, so its
   computed value is filled, not a null).

   The grid resolves a keydown to a GridCommand via core's pure
   `resolveKey`; this hook performs it. Nothing here re-implements
   selection geometry, key bindings, TSV or coercion.

   AND FOUR OF ITS NOTES NOW OFFER THE WAY BACK. Rule 9 says an
   undoable act gets a toast with UNDO; the Fitment stage's toasts
   have offered it since the last four `window.confirm` calls came
   out, and the register's did not — measured, `Ctrl+D` said "2 cells
   filled" with a dismiss cross and nothing else. Every act that
   OVERWRITES OR REMOVES a value goes through `offerUndo` now (clear,
   paste, fill-right, fill-down); copy, cut's clipboard half and every
   refusal do not, because there is nothing there to take back. The
   pin lives in `@/store/notes` and is shared with the bus, so the
   button cannot revert the wrong act — see the note on it.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { isSystemFieldId } from '@/types/model'
import type { CellValue, FieldDef, ImageRef } from '@/types/model'
import {
  clampCell,
  coerceCellText,
  normalizeRange,
  parseTsv,
  rangeCells,
  resolveKey,
  serializeTsv,
  type CellRef,
  type NormalRange,
} from '@/features/table/core'
import type { TableData } from './useTableData'
import type { PushToast } from './Toasts'
import { offerUndo } from '@/store/notes'
import {
  ORIGIN,
  cellText,
  fillValueFor,
  fullySelectedRows,
  isEmptyCell,
  markKey,
  plural,
  primaryRange,
  singleSel,
  valueForField,
  type CellRange,
  type EditState,
  type GridSel,
  type MoveDir,
} from './helpers'

/* ---------------------------------------------------------- */
/* clipboard write: async API first, execCommand as the net    */
/* ---------------------------------------------------------- */

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* denied or insecure context — fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

const NO_LEVELS: string[] = []

const MOVE: Record<Exclude<MoveDir, 'none'>, [number, number]> = {
  down: [1, 0],
  up: [-1, 0],
  right: [0, 1],
  left: [0, -1],
}

export interface SheetCommands {
  /** live selection — one active cell plus one-or-more ranges */
  sel: GridSel
  setSel: (s: GridSel) => void
  /** the single live editor, or null */
  editing: EditState | null
  /** cells a paste could not read, keyed `rowId fieldId` */
  marks: Set<string>
  /** attach to the focusable role="grid" element */
  gridRef: RefObject<HTMLDivElement | null>
  rowCount: number
  colCount: number
  /** row ids whose every column is selected — the delete-rows set */
  selectedRowIds: string[]

  beginEdit: (cell: CellRef, seed?: string) => void
  /** write a picture column's ordered list — index 0 is the primary */
  setImages: (rowId: string, fieldId: string, next: ImageRef[]) => void
  commitEdit: (move: MoveDir) => void
  cancelEdit: () => void
  setDraft: (t: string) => void
  pickValue: (v: CellValue) => void
  clearSelection: () => void
  doCopy: (range: CellRange, cut: boolean) => void
  doPaste: (text: string) => void
  applyFill: (region: NormalRange) => void
  onKey: (e: ReactKeyboardEvent<HTMLDivElement>, pageSize: number) => void
  /** back to the origin cell — after a row strike, or an entity swap */
  resetSelection: () => void
}

export function useSheetCommands(
  entityId: string,
  data: TableData,
  pushToast: PushToast,
  /** the columns this table is FILED under, outermost first. A row a
   *  paste creates past the last one inherits them from the row it
   *  follows, so a block pasted at the foot of a drawer stays in that
   *  drawer instead of falling into (unassigned). */
  levelIds: readonly string[] = NO_LEVELS,
): SheetCommands {
  const updateCell = useProjectStore((s) => s.updateCell)
  const addRow = useProjectStore((s) => s.addRow)

  const {
    fields,
    rowById,
    viewRows,
    hasFormula,
    computedFor,
    refLabelOf,
    refMapOf,
  } = data

  const [sel, setSel] = useState<GridSel>(() => singleSel(ORIGIN))
  const [editing, setEditing] = useState<EditState | null>(null)
  const [marks, setMarks] = useState<Set<string>>(() => new Set())
  /* a paste is confirmed by a rectangle drawn around the rows it
     touched — and where those rows END UP is only known once the store
     has re-filed and re-sorted them, so the rectangle is rebuilt from
     the rowIds one commit later. The tick is what guarantees the pass
     runs even when nothing in the view moved. */
  const [pasteTick, setPasteTick] = useState(0)
  const pastedRef = useRef<{ rowIds: string[]; c0: number; c1: number } | null>(null)

  const gridRef = useRef<HTMLDivElement | null>(null)
  /* mirrors `editing` synchronously so a blur can never commit twice */
  const editingRef = useRef<EditState | null>(null)

  const rowCount = viewRows.length
  const colCount = fields.length

  const rowIdAt = useCallback(
    (r: number): string | undefined => viewRows[r]?.rowId,
    [viewRows],
  )

  const clearMark = useCallback((rowId: string, fieldId: string) => {
    setMarks((prev) => {
      const k = markKey(rowId, fieldId)
      if (!prev.has(k)) return prev
      const next = new Set(prev)
      next.delete(k)
      return next
    })
  }, [])

  const resetSelection = useCallback(() => {
    setSel(singleSel(ORIGIN))
  }, [])

  /* -- selection hygiene: never point past the current view ----- */
  useEffect(() => {
    if (rowCount === 0 || colCount === 0) {
      if (editingRef.current) {
        editingRef.current = null
        setEditing(null)
      }
      setSel((prev) =>
        prev.active.row === 0 && prev.active.col === 0 && prev.ranges.length === 1
          ? prev
          : singleSel(ORIGIN),
      )
      return
    }
    setSel((prev) => {
      const active = clampCell(prev.active, rowCount, colCount)
      let changed = active.row !== prev.active.row || active.col !== prev.active.col
      const ranges = prev.ranges.map((r) => {
        const anchor = clampCell(r.anchor, rowCount, colCount)
        const focus = clampCell(r.focus, rowCount, colCount)
        if (
          anchor.row !== r.anchor.row ||
          anchor.col !== r.anchor.col ||
          focus.row !== r.focus.row ||
          focus.col !== r.focus.col
        ) {
          changed = true
          return { anchor, focus }
        }
        return r
      })
      return changed ? { active, ranges } : prev
    })
    /* the edited row may have been deleted, filtered out or re-sorted
       from under the editor — drop the edit rather than misfile it */
    const ed = editingRef.current
    if (ed && viewRows[ed.row]?.rowId !== ed.rowId) {
      editingRef.current = null
      setEditing(null)
    }
  }, [rowCount, colCount, viewRows])

  /* -- where a paste actually LANDED ----------------------------
     Declared after the hygiene pass so it has the last word. Pasted
     rows are found by id in the recomputed view: a created row files
     itself into its drawer and a pasted filing value moves an existing
     one, so the indices the block was written at are not where those
     rows are by the time the rectangle is drawn. */
  useEffect(() => {
    const done = pastedRef.current
    if (done === null) return
    pastedRef.current = null
    if (rowCount === 0 || colCount === 0) return
    const want = new Set(done.rowIds)
    let r0 = -1
    let r1 = -1
    for (let i = 0; i < viewRows.length; i += 1) {
      if (!want.has(viewRows[i].rowId)) continue
      if (r0 < 0) r0 = i
      r1 = i
    }
    if (r0 < 0) return
    const c0 = Math.max(0, Math.min(done.c0, colCount - 1))
    const c1 = Math.max(c0, Math.min(done.c1, colCount - 1))
    setSel({
      active: { row: r0, col: c0 },
      ranges: [{ anchor: { row: r0, col: c0 }, focus: { row: r1, col: c1 } }],
    })
  }, [pasteTick, viewRows, rowCount, colCount])

  /* -- editing -------------------------------------------------- */

  const openEditor = useCallback(
    (cell: CellRef, field: FieldDef, rowId: string, draft: string) => {
      const next: EditState = {
        row: cell.row,
        col: cell.col,
        rowId,
        fieldId: field.id,
        draft,
      }
      editingRef.current = next
      setEditing(next)
    },
    [],
  )

  const beginEdit = useCallback(
    (cell: CellRef, seed?: string) => {
      const field = fields[cell.col]
      const rowId = rowIdAt(cell.row)
      if (!field || !rowId) return
      /* the UID is the row's identity, not a value the sheet owns —
         no editor, no toggle, no coerced seed */
      if (isSystemFieldId(field.id)) {
        pushToast(`${field.name} is the row’s permanent identifier — read-only`, 'warn')
        return
      }
      if (field.type === 'formula') {
        pushToast(`${field.name} is calculated — read-only`, 'warn')
        return
      }
      /* a picture is not typed. The grid opens the chooser on Enter and
         on a double-click; anything else that lands here (a character
         key, say) is told where pictures actually come from. */
      if (field.type === 'image') {
        pushToast(
          `${field.name} holds pictures — drop image files on the cell, or press Enter`,
        )
        return
      }
      const row = rowById.get(rowId)
      if (!row) return
      const current = row.values[field.id] ?? null

      /* the spacebar is not a value. A whitespace-only seed coerces to
         null on every picker, date and yes/no column, which would void
         the cell outright — treat it as a bare "start editing" instead. */
      const typed = seed !== undefined && seed.trim() !== '' ? seed : undefined

      /* boolean: no editor — a keystroke or a second click marks it */
      if (field.type === 'boolean') {
        if (typed === undefined) {
          updateCell(entityId, rowId, field.id, !(current === true))
        } else {
          const res = coerceCellText(typed, field)
          if (res.ok) updateCell(entityId, rowId, field.id, res.value)
          else pushToast(`“${typed}” is not a yes/no value`, 'warn')
        }
        clearMark(rowId, field.id)
        return
      }

      /* a typed character on a picker or a date is coerced outright —
         only text and number columns open a free-text editor seeded */
      let seedText = typed
      if (seedText !== undefined && field.type !== 'text' && field.type !== 'number') {
        const res = coerceCellText(seedText, field, refMapOf(field))
        if (res.ok) {
          updateCell(entityId, rowId, field.id, res.value)
          clearMark(rowId, field.id)
          return
        }
        seedText = undefined
      }

      const existing =
        field.type === 'select' || field.type === 'reference'
          ? current == null
            ? ''
            : String(current)
          : cellText(current, field)
      openEditor(cell, field, rowId, seedText ?? existing)
    },
    [fields, rowIdAt, rowById, entityId, updateCell, pushToast, clearMark, refMapOf, openEditor],
  )

  const setImages = useCallback(
    (rowId: string, fieldId: string, next: ImageRef[]) => {
      /* an empty strip is an empty cell, not an empty array sitting in
         the file forever */
      updateCell(entityId, rowId, fieldId, next.length === 0 ? null : next)
      clearMark(rowId, fieldId)
    },
    [entityId, updateCell, clearMark],
  )

  const moveActive = useCallback(
    (dir: MoveDir) => {
      if (dir === 'none') return
      const [dr, dc] = MOVE[dir]
      setSel((prev) => {
        const next = clampCell(
          { row: prev.active.row + dr, col: prev.active.col + dc },
          Math.max(1, rowCount),
          Math.max(1, colCount),
        )
        return singleSel(next)
      })
    },
    [rowCount, colCount],
  )

  const commitEdit = useCallback(
    (move: MoveDir) => {
      const ed = editingRef.current
      if (ed) {
        editingRef.current = null
        setEditing(null)
        const field = fields.find((f) => f.id === ed.fieldId)
        if (
          field &&
          field.type !== 'formula' &&
          !isSystemFieldId(field.id) &&
          rowById.has(ed.rowId)
        ) {
          if (field.type === 'select' || field.type === 'reference') {
            /* the picker already holds a canonical option / row id */
            updateCell(entityId, ed.rowId, field.id, ed.draft === '' ? null : ed.draft)
            clearMark(ed.rowId, field.id)
          } else {
            const res = coerceCellText(ed.draft, field, refMapOf(field))
            if (res.ok) {
              updateCell(entityId, ed.rowId, field.id, res.value)
              clearMark(ed.rowId, field.id)
            } else {
              pushToast(`${field.name}: ${res.reason}`, 'warn')
            }
          }
        }
        gridRef.current?.focus()
      }
      moveActive(move)
    },
    [fields, rowById, entityId, updateCell, clearMark, refMapOf, pushToast, moveActive],
  )

  const cancelEdit = useCallback(() => {
    if (!editingRef.current) return
    editingRef.current = null
    setEditing(null)
    gridRef.current?.focus()
  }, [])

  const setDraft = useCallback((t: string) => {
    const ed = editingRef.current
    if (!ed) return
    const next = { ...ed, draft: t }
    editingRef.current = next
    setEditing(next)
  }, [])

  const pickValue = useCallback(
    (v: CellValue) => {
      const ed = editingRef.current
      if (!ed) return
      editingRef.current = null
      setEditing(null)
      updateCell(entityId, ed.rowId, ed.fieldId, v)
      clearMark(ed.rowId, ed.fieldId)
      gridRef.current?.focus()
    },
    [entityId, updateCell, clearMark],
  )

  /* -- clear / copy / paste / fill ------------------------------- */

  const clearSelection = useCallback(() => {
    let cleared = 0
    for (const rg of sel.ranges) {
      for (const cell of rangeCells(rg)) {
        const field = fields[cell.col]
        const rowId = rowIdAt(cell.row)
        if (!field || !rowId || field.type === 'formula' || isSystemFieldId(field.id)) continue
        const row = rowById.get(rowId)
        if (!row || isEmptyCell(row.values[field.id])) continue
        updateCell(entityId, rowId, field.id, null)
        clearMark(rowId, field.id)
        cleared += 1
      }
    }
    if (cleared > 0) offerUndo(pushToast, `${plural(cleared, 'cell', 'cells')} cleared`)
  }, [sel, fields, rowIdAt, rowById, entityId, updateCell, clearMark, pushToast])

  const blockText = useCallback(
    (n: NormalRange): string[][] => {
      const out: string[][] = []
      for (let r = n.r0; r <= Math.min(n.r1, rowCount - 1); r += 1) {
        const rowId = rowIdAt(r)
        const row = rowId ? rowById.get(rowId) : undefined
        if (!row) continue
        const values = hasFormula ? computedFor(row) : row.values
        const line: string[] = []
        for (let c = n.c0; c <= Math.min(n.c1, colCount - 1); c += 1) {
          const field = fields[c]
          if (!field) continue
          line.push(cellText(valueForField(row, field, values), field, refLabelOf(field)))
        }
        out.push(line)
      }
      return out
    },
    [rowCount, colCount, rowIdAt, rowById, hasFormula, computedFor, fields, refLabelOf],
  )

  const doCopy = useCallback(
    (range: CellRange, cut: boolean) => {
      const n = normalizeRange(range)
      const block = blockText(n)
      if (block.length === 0) return
      const count = block.reduce((a, line) => a + line.length, 0)
      void writeClipboard(serializeTsv(block)).then((ok) => {
        pushToast(
          ok
            ? `${plural(count, 'cell', 'cells')} ${cut ? 'cut' : 'copied'}`
            : 'The browser blocked clipboard access',
          ok ? 'info' : 'warn',
        )
        gridRef.current?.focus()
      })
      if (cut) clearSelection()
    },
    [blockText, pushToast, clearSelection],
  )

  const doPaste = useCallback(
    (text: string) => {
      if (colCount === 0) return
      const matrix = parseTsv(text)
      if (matrix.length === 0) return
      const anchor = sel.active
      const startRow = Math.min(anchor.row, Math.max(0, rowCount - 1))
      const startCol = anchor.col

      /* A row created past the end follows the LAST row in the view, so
         it belongs in that row's drawer: carry the filing columns down
         onto it, exactly as the in-group + ROW does. Without this the
         new rows file themselves under (unassigned) at the foot of the
         table — in columns the register does not even draw. */
      let seed: Record<string, CellValue> | undefined
      if (levelIds.length > 0) {
        const lastId = rowIdAt(rowCount - 1)
        const src = lastId ? rowById.get(lastId) : undefined
        if (src) {
          const filed: Record<string, CellValue> = {}
          let any = false
          for (const fieldId of levelIds) {
            const v = src.values[fieldId]
            if (v === undefined || v === null || v === '') continue
            filed[fieldId] = v
            any = true
          }
          if (any) seed = filed
        }
      }

      /* Address targets by rowId, never by view index: rows created
         past the end land wherever the current sort puts them. */
      const targets: string[] = []
      for (let r = 0; r < matrix.length; r += 1) {
        const existing = rowIdAt(startRow + r)
        if (existing) {
          targets.push(existing)
          continue
        }
        const created = addRow(entityId, seed)
        if (!created) break
        targets.push(created.id)
      }

      let pasted = 0
      let skipped = 0
      let readOnly = 0
      let locked = 0
      let pictures = 0
      const bad = new Set<string>()

      for (let r = 0; r < targets.length; r += 1) {
        const line = matrix[r] ?? []
        for (let c = 0; c < line.length; c += 1) {
          const field = fields[startCol + c]
          if (!field) break
          /* a system column is not a paste target: the block flows past
             it, it is never marked, and the summary says so */
          if (isSystemFieldId(field.id)) {
            locked += 1
            continue
          }
          if (field.type === 'formula') {
            readOnly += 1
            continue
          }
          /* a picture column is not a paste target either: a block of
             text flows past it untouched rather than dropping a URL
             into a place that holds photographs */
          if (field.type === 'image') {
            pictures += 1
            continue
          }
          const res = coerceCellText(line[c] ?? '', field, refMapOf(field))
          if (res.ok) {
            updateCell(entityId, targets[r], field.id, res.value)
            pasted += 1
          } else {
            skipped += 1
            bad.add(markKey(targets[r], field.id))
          }
        }
      }

      setMarks(bad)
      const width = Math.min(
        colCount - 1,
        startCol + Math.max(...matrix.map((l) => l.length)) - 1,
      )
      /* the rectangle is drawn one commit later, around wherever these
         rows have actually come to rest */
      pastedRef.current = {
        rowIds: targets,
        c0: startCol,
        c1: Math.max(startCol, width),
      }
      setPasteTick((n) => n + 1)

      const parts = [`${plural(pasted, 'cell', 'cells')} pasted`]
      if (skipped > 0) parts.push(`${skipped} skipped — see marks`)
      if (readOnly > 0) parts.push(`${readOnly} calculated`)
      if (locked > 0) parts.push(`${locked} system`)
      if (pictures > 0) parts.push(`${pictures} pictures`)
      offerUndo(pushToast, parts.join(' · '), skipped > 0 ? 'warn' : 'info')
    },
    [
      colCount,
      rowCount,
      sel,
      rowIdAt,
      rowById,
      levelIds,
      addRow,
      entityId,
      fields,
      refMapOf,
      updateCell,
      pushToast,
    ],
  )

  /** source row r0 copied down into (from…to) — the shared engine of
   *  both the fill handle and Ctrl+D */
  const fillDownFrom = useCallback(
    (n: NormalRange, from: number, to: number) => {
      const srcId = rowIdAt(n.r0)
      const src = srcId ? rowById.get(srcId) : undefined
      if (!src) return 0
      let written = 0
      for (let c = n.c0; c <= Math.min(n.c1, colCount - 1); c += 1) {
        const field = fields[c]
        if (!field || field.type === 'formula' || isSystemFieldId(field.id)) continue
        const v = src.values[field.id] ?? null
        for (let r = from; r <= Math.min(to, rowCount - 1); r += 1) {
          const id = rowIdAt(r)
          if (!id || id === srcId) continue
          /* pictures are copied, never shared: two rows holding one
             ImageRef list would re-order together, and the primary
             would change on a row nobody touched */
          const write = fillValueFor(v, field)
          if (write === undefined) continue
          updateCell(entityId, id, field.id, write)
          clearMark(id, field.id)
          written += 1
        }
      }
      return written
    },
    [rowIdAt, rowById, colCount, rowCount, fields, entityId, updateCell, clearMark],
  )

  const applyFill = useCallback(
    (region: NormalRange) => {
      const base = normalizeRange(primaryRange(sel))
      let written = 0
      if (region.r1 > base.r1) {
        written = fillDownFrom(base, base.r1 + 1, region.r1)
      } else if (region.c1 > base.c1) {
        for (let r = base.r0; r <= Math.min(base.r1, rowCount - 1); r += 1) {
          const id = rowIdAt(r)
          const row = id ? rowById.get(id) : undefined
          const srcField = fields[base.c0]
          if (!id || !row || !srcField) continue
          /* formula fields are never stored on the row — read the source
             through the same evaluator the copy path uses, so filling
             right from a calculated column carries its COMPUTED value
             instead of writing null over the destination */
          const values = hasFormula ? computedFor(row) : row.values
          const v = valueForField(row, srcField, values)
          for (let c = base.c1 + 1; c <= Math.min(region.c1, colCount - 1); c += 1) {
            const field = fields[c]
            if (!field || field.type === 'formula' || isSystemFieldId(field.id)) continue
            const write = fillValueFor(v, field)
            if (write === undefined) continue
            updateCell(entityId, id, field.id, write)
            clearMark(id, field.id)
            written += 1
          }
        }
      }
      if (written === 0) return
      setSel((prev) => ({
        active: prev.active,
        ranges: [
          ...prev.ranges.slice(0, -1),
          {
            anchor: { row: region.r0, col: region.c0 },
            focus: { row: region.r1, col: region.c1 },
          },
        ],
      }))
      offerUndo(pushToast, `${plural(written, 'cell', 'cells')} filled`)
    },
    [
      sel,
      fillDownFrom,
      rowCount,
      colCount,
      rowIdAt,
      rowById,
      hasFormula,
      computedFor,
      fields,
      entityId,
      updateCell,
      clearMark,
      pushToast,
    ],
  )

  /* -- keyboard ------------------------------------------------- */

  const onKey = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>, pageSize: number) => {
      if (rowCount === 0 || colCount === 0) return
      const cmd = resolveKey({
        key: e.key,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
        editing: editingRef.current !== null,
        rows: rowCount,
        cols: colCount,
        active: sel.active,
        range: primaryRange(sel),
        pageSize,
      })

      switch (cmd.kind) {
        case 'none':
          return
        case 'move':
          e.preventDefault()
          setSel({ active: cmd.active, ranges: [cmd.range] })
          return
        case 'edit-start':
          e.preventDefault()
          beginEdit(cmd.cell, cmd.seed)
          return
        case 'edit-commit':
          e.preventDefault()
          commitEdit(cmd.move)
          return
        case 'edit-cancel':
          e.preventDefault()
          cancelEdit()
          return
        case 'clear-range':
          e.preventDefault()
          clearSelection()
          return
        case 'copy':
          e.preventDefault()
          doCopy(cmd.range, cmd.cut)
          return
        case 'paste':
          /* deliberately NOT prevented: letting the keystroke through
             is what fires the native paste event we read from */
          return
        case 'fill-down': {
          e.preventDefault()
          const n = normalizeRange(cmd.range)
          const written = fillDownFrom(n, n.r0 + 1, n.r1)
          if (written > 0) offerUndo(pushToast, `${plural(written, 'cell', 'cells')} filled`)
          return
        }
        case 'select-all':
          e.preventDefault()
          setSel({
            active: { row: 0, col: 0 },
            ranges: [
              {
                anchor: { row: 0, col: 0 },
                focus: { row: rowCount - 1, col: colCount - 1 },
              },
            ],
          })
          return
      }
    },
    [
      rowCount,
      colCount,
      sel,
      beginEdit,
      commitEdit,
      cancelEdit,
      clearSelection,
      doCopy,
      fillDownFrom,
      pushToast,
    ],
  )

  /* -- rows ------------------------------------------------------ */

  const selectedRowIds = useMemo(() => {
    const idx = fullySelectedRows(sel, colCount)
    const out: string[] = []
    for (const r of idx) {
      const id = viewRows[r]?.rowId
      if (id) out.push(id)
    }
    return out
  }, [sel, colCount, viewRows])

  return {
    sel,
    setSel,
    editing,
    marks,
    gridRef,
    rowCount,
    colCount,
    selectedRowIds,
    beginEdit,
    setImages,
    commitEdit,
    cancelEdit,
    setDraft,
    pickValue,
    clearSelection,
    doCopy,
    doPaste,
    applyFill,
    onKey,
    resetSelection,
  }
}
