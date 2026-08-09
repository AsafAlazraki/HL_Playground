/* ============================================================
   Table core — public API (TABLE_CORE_API.md).

   Pure TypeScript: no React, no DOM, no store, no formula engine.
   The only import in this module is `@/types/model` (types only).

   import { resolveKey, parseTsv, applyView } from '@/features/table/core'
   ============================================================ */

/* ---------- geometry ---------- */
export type { CellRef, Range, NormalRange } from './geometry'
export {
  normalizeRange,
  rangeContains,
  rangeCells,
  clampCell,
  /* extras, not in the contract but free: */
  singleCell,
  sameCell,
} from './geometry'

/* ---------- keyboard ---------- */
export type { KeyContext, GridCommand } from './keys'
export { resolveKey, isPrintableKey } from './keys'

/* ---------- clipboard ---------- */
export { serializeTsv, parseTsv } from './clipboard'

/* ---------- coercion ---------- */
export type { CoerceResult } from './coerce'
export { coerceCellText, cellToText, formatNumber } from './coerce'

/* ---------- sort / filter / search ---------- */
export type { SortDir, SortState, ColumnFilter, ViewRow } from './view'
export { applyView, distinctValues } from './view'
