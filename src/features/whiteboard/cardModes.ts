/* ============================================================
   Card modes — the per-card lens applied to an entity card.

   SCHEMA  the field list (the sheet's original card)
   DATA    a compact live mini-table of the entity's rows
   COMPACT name + field count + row count only

   The global DETAIL/COMPACT toolbar toggle supplies the DEFAULT;
   a per-card override (held in Whiteboard component state, never
   in the persisted store) wins until it is released.
   ============================================================ */

import { UID_FIELD, UID_FIELD_ID, readCell, rowLabel } from '@/types/model'
import type { CellValue, EntityDef, RowData } from '@/types/model'

export type CardMode = 'schema' | 'data' | 'compact'

/** Segmented-control order — also the tab order inside a card header. */
export const CARD_MODES: readonly CardMode[] = ['schema', 'data', 'compact']

/** Single mono glyph shown on the tiny header buttons. */
export const CARD_MODE_GLYPH: Record<CardMode, string> = {
  schema: 'S',
  data: 'D',
  compact: 'C',
}

export const CARD_MODE_LABEL: Record<CardMode, string> = {
  schema: 'Schema',
  data: 'Data',
  compact: 'Compact',
}

/** One-line hint, in the reviewer's plain voice. */
export const CARD_MODE_HINT: Record<CardMode, string> = {
  schema: 'Schema — the field list',
  data: 'Data — a live sample of the rows',
  compact: 'Compact — name and counts only',
}

/** DETAIL -> SCHEMA, COMPACT -> COMPACT. */
export const defaultCardMode = (detail: boolean): CardMode =>
  detail ? 'schema' : 'compact'

/* ------------------------------------------------------------ */
/* DATA mode — mini-table preview                               */
/* ------------------------------------------------------------ */

/** Columns shown in DATA mode (first N non-formula fields). */
export const DATA_COLS = 4
/** Rows shown in DATA mode. */
export const DATA_ROWS = 5

export type PreviewAlign = 'l' | 'r' | 'c'

export interface PreviewColumn {
  id: string
  name: string
  align: PreviewAlign
}

/** A rendered mini-table cell: a value, a boolean mark, or nothing. */
export type PreviewCell =
  | { kind: 'value'; text: string; align: PreviewAlign }
  | { kind: 'bool'; on: boolean }
  | { kind: 'empty' }

export interface DataPreview {
  columns: PreviewColumn[]
  /** row-major, columns.length wide, at most DATA_ROWS tall */
  cells: PreviewCell[][]
  /** rows actually rendered */
  shown: number
  /** rows the entity holds in total */
  total: number
}

/** Numbers: up to 4 decimals, trailing zeros trimmed. */
export function formatPreviewNumber(n: number): string {
  if (!Number.isFinite(n) || Math.abs(n) >= 1e21) return String(n)
  const s = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return s === '-0' ? '0' : s
}

const isBlank = (v: CellValue | undefined): boolean =>
  v === null || v === undefined || v === ''

const alignFor = (type: string): PreviewAlign =>
  type === 'number' ? 'r' : type === 'boolean' ? 'c' : 'l'

/**
 * Builds the DATA-mode mini-table for one entity: the locked UID system
 * column, then the first DATA_COLS non-formula fields, x the first
 * DATA_ROWS rows. Formula fields are skipped on purpose — a card is a
 * glance at stored data, not a calculation surface. UID is column one on
 * every surface that lists columns (UX_REWORK §8b); its value is the row's
 * own id, read through `readCell` rather than out of `row.values`.
 */
export function buildPreview(
  entity: EntityDef,
  rows: RowData[],
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): DataPreview {
  const fields = entity.fields
    .filter((f) => f.type !== 'formula')
    .slice(0, DATA_COLS)

  const columns: PreviewColumn[] = [
    { id: UID_FIELD_ID, name: UID_FIELD.name, align: 'l' },
    ...fields.map((f) => ({
      id: f.id,
      name: f.name,
      align: alignFor(f.type),
    })),
  ]

  const shownRows = rows.slice(0, DATA_ROWS)
  const cells: PreviewCell[][] = shownRows.map((row) => [
    {
      kind: 'value',
      text: String(readCell(row, UID_FIELD_ID)),
      align: 'l',
    } as PreviewCell,
    ...fields.map((f): PreviewCell => {
      const v = row.values[f.id]

      if (f.type === 'boolean') {
        if (v === null || v === undefined) return { kind: 'empty' }
        return { kind: 'bool', on: Boolean(v) }
      }

      if (isBlank(v)) return { kind: 'empty' }

      switch (f.type) {
        case 'number': {
          const n = typeof v === 'number' ? v : Number(v)
          return Number.isNaN(n)
            ? { kind: 'value', text: String(v), align: 'r' }
            : { kind: 'value', text: formatPreviewNumber(n), align: 'r' }
        }
        case 'reference': {
          const target = f.refEntityId ? entities[f.refEntityId] : undefined
          if (!target) return { kind: 'empty' }
          const targetRow = (rowsByEntity[target.id] ?? []).find(
            (r) => r.id === v,
          )
          if (!targetRow) return { kind: 'empty' }
          return { kind: 'value', text: rowLabel(target, targetRow), align: 'l' }
        }
        default:
          return { kind: 'value', text: String(v), align: 'l' }
      }
    }),
  ])

  return { columns, cells, shown: shownRows.length, total: rows.length }
}

/** Footer copy for the mini-table's designed hairline row. */
export function previewFooterLabel(preview: DataPreview): string {
  if (preview.total === 0) return 'No rows yet'
  const hidden = preview.total - preview.shown
  if (hidden > 0) return `+${hidden} more row${hidden === 1 ? '' : 's'}`
  return `${preview.total} row${preview.total === 1 ? '' : 's'}`
}
