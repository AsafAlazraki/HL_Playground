/* ============================================================
   useTableData — the store → view seam.

   Turns the store's entity + rows into the `ViewRow[]` core's
   sort/filter/search transform expects, and hands back a memoized
   per-row formula evaluator so the grid only ever computes the rows
   it is about to paint.

   Memo key = (row identity, entity identity, eval context identity).
   Every store mutation replaces those objects, so a computed value
   can never be served stale after an edit.
   ============================================================ */
import { useCallback, useMemo, useRef } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  rowLabel,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { evaluateRowValues, type EvalContext } from '@/lib/formula'
import {
  applyView,
  type ColumnFilter,
  type SortState,
  type ViewRow,
} from '@/features/table/core'
import { cellText, valueForField } from './helpers'

const NO_ROWS: RowData[] = []
const NO_FIELDS: FieldDef[] = []
const NO_TEXT: Record<string, string> = Object.freeze({})

export interface ViewOpts {
  sort: SortState | null
  filters: ColumnFilter[]
  search: string
}

export interface TableData {
  entity: EntityDef | undefined
  /** the columns as a user sees them — the table's own, and only its
   *  own. The row's identity is the NUMBER in the gutter; see the note
   *  on `fields` in the body of the hook for why the machine key is no
   *  longer one of these. */
  fields: FieldDef[]
  /** every stored row, in store order */
  rows: RowData[]
  rowById: Map<string, RowData>
  /** rows after filter → search → sort (a view-only transform) */
  viewRows: ViewRow[]
  hasFormula: boolean
  /** true while a sort, filter or search is narrowing / reordering */
  viewActive: boolean
  /** memoized full value map for one row (stored + computed) */
  computedFor: (row: RowData) => Record<string, CellValue>
  /** rowId → label, for a reference field's target entity */
  refLabelOf: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
  /** lowercased label → rowId, for pasting into a reference field */
  refMapOf: (f: FieldDef) => Map<string, string> | undefined
  targetEntityOf: (f: FieldDef) => EntityDef | undefined
  targetRowsOf: (f: FieldDef) => RowData[] | undefined
  /** ViewRows for an arbitrary slice — used by the filter menus */
  buildViewRows: (src: RowData[], withComputed: boolean) => ViewRow[]
}

interface MemoEntry {
  row: RowData
  entity: EntityDef
  ctx: EvalContext
  values: Record<string, CellValue>
}

interface RefIndex {
  entity: EntityDef
  rows: RowData[]
  labelOf: Map<string, string>
  byLabel: Map<string, string>
}

export function useTableData(entityId: string, opts: ViewOpts): TableData {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const entity = entities[entityId] as EntityDef | undefined
  /* THE TABLE'S OWN COLUMNS, AND NOTHING IN FRONT OF THEM.
     ------------------------------------------------------------------
     This was `visibleFields(entity)`, which is the model's UID column
     followed by the table's own — so the first thing in every register
     in this app was a heading reading UID SYSTEM over a ten-character
     machine key (`-KS7x1XXCj`). Two separate rulings say it cannot
     stay. DESIGN_PRINCIPLES §6 names "UID" among the system jargon this
     app refuses in chrome; and the redesign's own audit of this screen
     concluded, in one sentence, "A dealer's first column should not be a
     machine key" (design/SheetSurfaces.tsx, design/sheet.css).

     WHAT A PERSON SHOULD SEE INSTEAD WAS ALREADY ON SCREEN, one column
     to the left. `Grid` freezes a 48px gutter down the left edge whose
     entire job is the row NUMBER — `helpers.ts` calls it "Frozen
     row-number gutter width", it is the only way to select whole rows,
     and it is drawn on every register and every sheet card because both
     use the same `Grid`. So the answer to "what identifies this row to a
     dealer" needed no new column; it needed the redundant one removed.

     THE ID IS NOT GONE, IT IS NO LONGER SHOUTED. It is still the row's
     identity everywhere it was: the value every reference column holds
     and every join pairs on, what `readCell` resolves for the system
     field id, and what every export writes and every import reads back
     (`envelope.ts` refuses a row without one — a copy that dropped it
     could not be merged back). In the register it moves to the gutter it
     belongs to, printed in the gutter's own tooltip beside the row
     number, so a person who needs it can read it off the row and
     nobody else has to look at it.

     WHAT DOES NARROW, said plainly rather than glossed: in the register
     the id can no longer be sorted on, filtered on, or lifted with
     Ctrl+C, because those were affordances OF the column. Sorting a
     register by a random ten-character key is not a thing a dealer
     does; being handed one as the first fact about a boat is not
     either, and only one of the two was worth keeping.

     Memoized on the entity, so the array identity stays exactly as
     stable as it was and every downstream memo (hasFormula,
     buildViewRows, viewRows) keeps biting. */
  const fields = useMemo(() => (entity ? entity.fields : NO_FIELDS), [entity])
  const rows = rowsByEntity[entityId] ?? NO_ROWS

  const hasFormula = useMemo(
    () => fields.some((f) => f.type === 'formula'),
    [fields],
  )

  const rowById = useMemo(() => {
    const m = new Map<string, RowData>()
    for (const r of rows) m.set(r.id, r)
    return m
  }, [rows])

  /* -- eval context: store-derived, indexed lazily -------------- */
  const ctx = useMemo<EvalContext>(() => {
    const index = new Map<string, Map<string, RowData>>()
    const indexOf = (eid: string): Map<string, RowData> => {
      let m = index.get(eid)
      if (!m) {
        m = new Map((rowsByEntity[eid] ?? NO_ROWS).map((r) => [r.id, r]))
        index.set(eid, m)
      }
      return m
    }
    return {
      lookupRow: (eid, rid) => indexOf(eid).get(rid),
      lookupEntity: (eid) => entities[eid],
    }
  }, [entities, rowsByEntity])

  /* -- reference indexes (labels both ways) --------------------- */
  const refIndexOf = useMemo(() => {
    const cache = new Map<string, RefIndex | undefined>()
    return (refEntityId: string | undefined): RefIndex | undefined => {
      if (!refEntityId) return undefined
      if (cache.has(refEntityId)) return cache.get(refEntityId)
      const target = entities[refEntityId]
      let built: RefIndex | undefined
      if (target) {
        const list = rowsByEntity[refEntityId] ?? NO_ROWS
        const labelOf = new Map<string, string>()
        const byLabel = new Map<string, string>()
        for (const r of list) {
          const label = rowLabel(target, r)
          labelOf.set(r.id, label)
          const key = label.trim().toLowerCase()
          if (!byLabel.has(key)) byLabel.set(key, r.id)
        }
        built = { entity: target, rows: list, labelOf, byLabel }
      }
      cache.set(refEntityId, built)
      return built
    }
  }, [entities, rowsByEntity])

  const refLabelOf = useCallback(
    (f: FieldDef) => {
      if (f.type !== 'reference') return undefined
      const idx = refIndexOf(f.refEntityId)
      if (!idx) return undefined
      return (rowId: string): string | undefined => idx.labelOf.get(rowId)
    },
    [refIndexOf],
  )

  const refMapOf = useCallback(
    (f: FieldDef) =>
      f.type === 'reference' ? refIndexOf(f.refEntityId)?.byLabel : undefined,
    [refIndexOf],
  )

  const targetEntityOf = useCallback(
    (f: FieldDef) =>
      f.type === 'reference' ? refIndexOf(f.refEntityId)?.entity : undefined,
    [refIndexOf],
  )

  const targetRowsOf = useCallback(
    (f: FieldDef) =>
      f.type === 'reference' ? refIndexOf(f.refEntityId)?.rows : undefined,
    [refIndexOf],
  )

  /* -- per-row formula memo ------------------------------------- */
  const memoRef = useRef<Map<string, MemoEntry>>(new Map())
  const lastEntityRef = useRef<string>(entityId)
  if (lastEntityRef.current !== entityId) {
    lastEntityRef.current = entityId
    memoRef.current.clear()
  }

  const computedFor = useCallback(
    (row: RowData): Record<string, CellValue> => {
      if (!entity || !hasFormula) return row.values
      const cache = memoRef.current
      const hit = cache.get(row.id)
      if (hit && hit.row === row && hit.entity === entity && hit.ctx === ctx) {
        return hit.values
      }
      let values: Record<string, CellValue>
      try {
        values = evaluateRowValues(entity, row, ctx)
      } catch {
        values = { ...row.values }
        for (const f of entity.fields) {
          if (f.type === 'formula') values[f.id] = '#ERROR'
        }
      }
      if (cache.size > 4000) cache.clear()
      cache.set(row.id, { row, entity, ctx, values })
      return values
    },
    [entity, hasFormula, ctx],
  )

  const buildViewRows = useCallback(
    (src: RowData[], withComputed: boolean): ViewRow[] =>
      src.map((row) => {
        const values = withComputed ? computedFor(row) : row.values
        const text: Record<string, string> = {}
        for (const f of fields) {
          text[f.id] = cellText(valueForField(row, f, values), f, refLabelOf(f))
        }
        return { rowId: row.id, values, text }
      }),
    [fields, computedFor, refLabelOf],
  )

  /* -- the view ------------------------------------------------- */
  const { sort, filters, search } = opts
  const viewActive =
    sort !== null || filters.length > 0 || search.trim() !== ''

  const viewRows = useMemo<ViewRow[]>(() => {
    /* Nothing is narrowing or reordering: the view IS the store order,
       and no row needs its text (or its formulas) resolved up front —
       the grid computes those for the visible slice only. */
    if (!viewActive) {
      return rows.map((r) => ({ rowId: r.id, values: r.values, text: NO_TEXT }))
    }
    /* Sorting, filtering and search all read display text — and search
       must match computed formula values — so the whole set resolves. */
    return applyView(buildViewRows(rows, hasFormula), fields, {
      sort,
      filters,
      search,
    })
  }, [viewActive, rows, buildViewRows, hasFormula, fields, sort, filters, search])

  return {
    entity,
    fields,
    rows,
    rowById,
    viewRows,
    hasFormula,
    viewActive,
    computedFor,
    refLabelOf,
    refMapOf,
    targetEntityOf,
    targetRowsOf,
    buildViewRows,
  }
}
