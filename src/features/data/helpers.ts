/* ============================================================
   DataGrid helpers — formatting + tiny predicates.
   ============================================================ */
import type { CellValue } from '@/types/model'

/** Row-number gutter format: 01, 02, … */
export const pad2 = (n: number): string => String(n).padStart(2, '0')

/** A cell counts as empty when it holds nothing at all. */
export const isEmptyCell = (v: CellValue | undefined): boolean =>
  v === null || v === undefined || v === ''

/** Numbers: up to 4 decimal places, trailing zeros trimmed. Raw but tidy. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n) || Math.abs(n) >= 1e21) return String(n)
  const s = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return s === '-0' ? '0' : s
}

/** Display form of a computed (formula) value. */
export function formatComputed(v: CellValue): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return formatNumber(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

/** Tooltip copy for the formula engine's sentinel error values. */
export const FORMULA_ERROR_TITLES: Record<string, string> = {
  '#ERROR':
    'Formula could not be evaluated — review the expression in the SCHEMA tab',
  '#CYCLE': 'Circular reference — this formula depends on its own result',
}
