/* ============================================================
   useGroupCommands — what a grouping line can do.

   Three things, and they are the reason the hierarchy exists at all:

   1. FOLD a drawer shut, or open it again.
   2. ADD A ROW INSIDE a drawer — with that drawer's values already
      filled in, and the first cell you actually have to type already
      open. Adding a model under Highfield ▸ Ocean Master must not ask
      you to type "Highfield" and "Ocean Master" again.
   3. RENAME a drawer, which refiles every row inside it.

   Rows never learn about any of this: (1) is session state, (2) is an
   ordinary `addRow` with values, (3) is ordinary `updateCell` calls.
   ============================================================ */
import { useCallback, useEffect, useRef } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  isSystemFieldId,
  type CellValue,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { coerceCellText } from '@/features/table/core'
import type { TableData } from './useTableData'
import type { SheetCommands } from './useSheetCommands'
import type { ToastTone } from './Toasts'
import { cellText, singleSel, valueForField } from './helpers'
import {
  collectLeaves,
  countLabel,
  groupKey,
  type GroupNode,
  type LeafNoun,
} from './grouping'
import { collapsedGroupsOf, toggleGroup } from './tableGroupState'

export interface GroupCommands {
  toggle: (key: string) => void
  /** file a new row under `path`, then put the cursor in the first
   *  cell the user still has to fill */
  addRowIn: (path: string[]) => void
  /** append a row with nothing pre-filled — the table's own + ROW */
  addRow: () => void
  rename: (node: GroupNode, next: string) => void
}

/** The first column a person still has to type into: never the system
 *  identifier, never a calculated column, and never one the group
 *  already filled in for them. */
function firstEditableCol(fields: FieldDef[], filled: ReadonlySet<string>): number {
  const i = fields.findIndex(
    (f) => !isSystemFieldId(f.id) && f.type !== 'formula' && !filled.has(f.id),
  )
  if (i >= 0) return i
  const any = fields.findIndex((f) => !isSystemFieldId(f.id) && f.type !== 'formula')
  return any < 0 ? 0 : any
}

export function useGroupCommands(
  entityId: string,
  /** the GROUPED view — the same rows and columns the grid indexes */
  view: TableData,
  /** every column including the drawer ones, which the grid hides */
  allFields: FieldDef[],
  cmd: SheetCommands,
  levelIds: string[],
  /** what the rows are called, so the sheet speaks the domain */
  noun: LeafNoun,
  pushToast: (text: string, tone?: ToastTone) => void,
): GroupCommands {
  const addRowToStore = useProjectStore((s) => s.addRow)
  const updateCell = useProjectStore((s) => s.updateCell)

  const {
    fields,
    rows,
    viewRows,
    rowById,
    viewActive,
    hasFormula,
    computedFor,
    refLabelOf,
    refMapOf,
  } = view

  /* a row created a moment ago is not on screen until the store has
     re-rendered — remember it, and open the first cell the user still
     has to fill the instant it appears in the view */
  const pendingRef = useRef<{ id: string; filled: Set<string> } | null>(null)

  const { setSel, beginEdit, gridRef } = cmd

  useEffect(() => {
    const pending = pendingRef.current
    if (pending === null) return
    /* still waiting on the store */
    if (!rowById.has(pending.id)) return
    pendingRef.current = null
    const row = viewRows.findIndex((v) => v.rowId === pending.id)
    if (row < 0) return /* something is hiding it — say nothing, do nothing */
    const col = firstEditableCol(fields, pending.filled)
    gridRef.current?.focus()
    setSel(singleSel({ row, col }))
    beginEdit({ row, col })
  }, [viewRows, rowById, fields, setSel, beginEdit, gridRef])

  const toggle = useCallback(
    (key: string) => toggleGroup(entityId, key),
    [entityId],
  )

  const valuesForPath = useCallback(
    (path: string[]): Record<string, CellValue> => {
      const out: Record<string, CellValue> = {}
      levelIds.forEach((fieldId, i) => {
        const text = path[i] ?? ''
        if (text === '') return
        /* drawer columns are hidden from the leaf row, so they live in
           the FULL column list, not in the grid's */
        const field = allFields.find((f) => f.id === fieldId)
        if (!field) {
          out[fieldId] = text
          return
        }
        const res = coerceCellText(text, field, refMapOf(field))
        out[fieldId] = res.ok ? res.value : text
      })
      return out
    },
    [levelIds, allFields, refMapOf],
  )

  const addRowIn = useCallback(
    (path: string[]) => {
      /* a drawer you are adding to must be open to receive the row */
      const key = groupKey(path)
      if (collapsedGroupsOf(entityId).has(key)) toggleGroup(entityId, key)
      const values = valuesForPath(path)
      const created = addRowToStore(entityId, values)
      if (!created) return
      pendingRef.current = { id: created.id, filled: new Set(Object.keys(values)) }
    },
    [entityId, addRowToStore, valuesForPath],
  )

  const addRow = useCallback(() => {
    const created = addRowToStore(entityId)
    if (!created) return
    pendingRef.current = { id: created.id, filled: new Set<string>() }
  }, [entityId, addRowToStore])

  /* EVERY row filed in this drawer — not just the ones on screen.
     The drawer tree is built over the rows the view currently shows, so
     while a search or a narrowed column is live it holds only some of
     them. Renaming from that set rewrites what you can see and leaves
     the rest behind, and one drawer silently becomes two the moment the
     view is cleared. So when the view is narrowed the drawer is
     resolved again over the WHOLE table, by the same display text the
     grouping was built from. */
  const filedIn = useCallback(
    (node: GroupNode): string[] => {
      if (!viewActive) return collectLeaves(node).map((leaf) => leaf.rowId)
      const byId = new Map(allFields.map((f) => [f.id, f]))
      const textAt = (row: RowData, fieldId: string): string => {
        const field = byId.get(fieldId)
        if (!field) return ''
        const values = hasFormula ? computedFor(row) : row.values
        return cellText(valueForField(row, field, values), field, refLabelOf(field)).trim()
      }
      const out: string[] = []
      for (const row of rows) {
        let here = true
        for (let level = 0; level <= node.level; level += 1) {
          const fieldId = levelIds[level]
          if (fieldId === undefined || textAt(row, fieldId) !== (node.path[level] ?? '')) {
            here = false
            break
          }
        }
        if (here) out.push(row.id)
      }
      return out
    },
    [viewActive, allFields, hasFormula, computedFor, refLabelOf, rows, levelIds],
  )

  const rename = useCallback(
    (node: GroupNode, next: string) => {
      const fieldId = levelIds[node.level]
      if (!fieldId) return
      const filed = filedIn(node)
      if (filed.length === 0) return

      let value: CellValue = next === '' ? null : next
      if (next !== '') {
        /* the drawer column is not among the leaf columns; it is still
           a real column, so resolve the text against it */
        const field = allFields.find((f) => f.id === fieldId)
        if (field) {
          const res = coerceCellText(next, field, refMapOf(field))
          if (!res.ok) {
            pushToast(res.reason, 'warn')
            return
          }
          value = res.value
        }
      }

      for (const rowId of filed) updateCell(entityId, rowId, fieldId, value)
      pushToast(
        next === ''
          ? `${countLabel(filed.length, noun)} unfiled`
          : `${countLabel(filed.length, noun)} filed under “${next}”`,
      )
    },
    [levelIds, filedIn, allFields, refMapOf, entityId, updateCell, noun, pushToast],
  )

  return { toggle, addRowIn, addRow, rename }
}
