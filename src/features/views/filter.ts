/* ============================================================
   FILTERS — what is SHOWN right now.

   Never confused with a rule. A rule decides what is RELATED and
   is written on the block; a filter is a pair of spectacles and
   touches nothing. Clearing every filter always restores exactly
   what the rule and the curation say — no filter can ever remove
   a pair, and no filter is ever written to a join table.
   ============================================================ */

import { isImageValue, type CellValue, type ColumnFilter, type EntityDef } from '@/types/model'
import { bandOf, formatCell } from './columns'
import type { RelatedRow } from './pairs'

const text = (v: CellValue): string => {
  if (v === null || v === undefined) return ''
  if (isImageValue(v)) return ''
  return String(v)
}

/** Columns worth offering as a tick-list: short, closed vocabularies. */
export function filterableColumns(entity: EntityDef): string[] {
  return entity.fields.filter((f) => f.type === 'select' || f.type === 'boolean').map((f) => f.id)
}

/** The distinct values present, so the list never offers an empty choice. */
export function valuesInUse(
  rows: RelatedRow[],
  fieldId: string,
  read: (row: RelatedRow, fieldId: string) => CellValue,
): string[] {
  const seen = new Set<string>()
  for (const r of rows) {
    const v = text(read(r, fieldId)).trim()
    if (v !== '') seen.add(v)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

export interface FilterInput {
  rows: RelatedRow[]
  filters: ColumnFilter[]
  /** free-text box in the block header — searches every shown column */
  search: string
  /** the columns the block is drawing, so search matches what is visible */
  searchFieldIds: string[]
  entity: EntityDef
  read: (row: RelatedRow, fieldId: string) => CellValue
}

/** Cosmetic narrowing. Returns a subset — never a changed row. */
export function applyFilters({
  rows,
  filters,
  search,
  searchFieldIds,
  entity,
  read,
}: FilterInput): RelatedRow[] {
  const byId = new Map(entity.fields.map((f) => [f.id, f]))
  const needle = search.trim().toLowerCase()

  return rows.filter((r) => {
    for (const f of filters) {
      const raw = read(r, f.fieldId)
      if (f.kind === 'values') {
        if (f.selected.length === 0) continue
        if (!f.selected.includes(text(raw).trim())) return false
      } else if (f.text.trim() !== '') {
        if (!text(raw).toLowerCase().includes(f.text.trim().toLowerCase())) return false
      }
    }
    if (needle === '') return true
    for (const fieldId of searchFieldIds) {
      /* the same text the block DREW, band and all, so typing `$8,2`
         finds the row a reader can see it on */
      const shown = formatCell(
        byId.get(fieldId),
        read(r, fieldId),
        undefined,
        bandOf(entity, byId.get(fieldId)),
      ).toLowerCase()
      if (shown.includes(needle)) return true
      if (text(read(r, fieldId)).toLowerCase().includes(needle)) return true
    }
    return false
  })
}
