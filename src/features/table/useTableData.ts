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
  visibleFields,
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
  /** the columns as a user sees them: the row's permanent identifier
   *  FIRST, locked, then the table's own columns. The identifier lives
   *  outside `EntityDef.fields`, so it is resolved through the model's
   *  `readCell` rather than out of `row.values`. */
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
  /* THE LOCKED IDENTIFIER FIRST, then the table's own columns.
     Every table carries a permanent row identifier, and the register is
     the surface it has to be visible on — the same first column the
     entity card already shows in DATA mode. It is read-only everywhere
     (no editor, no paste target, no fill, never cleared) and orderable,
     narrowable and copyable like any other.
     Memoized on the entity, so the array identity stays exactly as
     stable as `entity.fields` was and every downstream memo
     (hasFormula, buildViewRows, viewRows) keeps biting. */
  const fields = useMemo(
    () => (entity ? visibleFields(entity) : NO_FIELDS),
    [entity],
  )
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
