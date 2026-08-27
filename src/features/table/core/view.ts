/* ============================================================
   Table core — filter, search, sort.

   A view-only transform: the caller's row array is never mutated and
   stored order is never touched. Order of operations is fixed —
   filters, then search, then sort.
   ============================================================ */
import { imageCellText, isImageValue } from '@/types/model'
import type { CellValue, FieldDef, FieldType } from '@/types/model'
import { formatNumber } from './coerce'

export type SortDir = 'asc' | 'desc'

export interface SortState {
  fieldId: string
  dir: SortDir
}

export type ColumnFilter =
  | { kind: 'values'; fieldId: string; selected: string[] } // select/boolean/reference
  | { kind: 'contains'; fieldId: string; text: string } // text/number/date
  /* A NUMERIC BAND ON ONE COLUMN — "between $20,000 and $40,000",
     "4.5 m and up". Either bound may be absent, which makes it
     open-ended on that side; both absent is a filter that narrows
     nothing and is dropped rather than applied.

     WHY THIS EXISTS AND `contains` DOES NOT ALREADY DO IT. A price
     column's display text is `$20,900`, so a text match on it is a
     match on the digits of a formatted string — `2` matches 2,770
     and 20,900 and 12,000 and means nothing. A band has to be read
     off the VALUE.

     AND IT READS A LEADING NUMBER OUT OF TEXT, because the business
     writes `4 HP` and `40 ltr` into columns it also fills with bare
     numbers — Highfield's Min HP is text and Stacer's is a number,
     and they are the same fact about the same kind of thing. Reading
     the number the author wrote is reading; substituting one is not,
     and nothing here does the second. */
  | { kind: 'between'; fieldId: string; min?: number; max?: number }

export interface ViewRow {
  rowId: string
  /** ALL field values incl. computed formula results, keyed by fieldId. */
  values: Record<string, CellValue>
  /** display text per fieldId — what search, filters and text sorting see. */
  text: Record<string, string>
}

/* ---------- value access ---------- */

/** The value a column sorts/filters on. When `values` has no entry at all
 *  (caller supplied text only) the display text stands in; an explicit
 *  null stays null so it still lands in the blanks bucket. */
function valueOf(row: ViewRow, fieldId: string): CellValue {
  const raw = row.values[fieldId]
  if (raw === undefined) {
    const t = row.text[fieldId]
    return t !== undefined && t !== '' ? t : null
  }
  return raw
}

/** Display text for a column, falling back to a rendering of the value. */
function textOf(row: ViewRow, fieldId: string, value: CellValue): string {
  const t = row.text[fieldId]
  if (t !== undefined && t !== '') return t
  if (value == null) return ''
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  /* an image column sorts and searches by its count, never by URLs */
  if (isImageValue(value)) return imageCellText(value)
  return value
}

/* eslint-disable-next-line eqeqeq -- `== null` catches null AND a missing key */
const isBlank = (v: CellValue): boolean => v == null || v === ''

function toNumber(v: CellValue): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string') {
    const s = v.trim()
    if (s === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** The number a cell carries, however its author wrote it: `2770`,
 *  `'2770'`, or `'4 HP'`. A LEADING number only — `'Up to 4.5m'` is a
 *  sentence, not a measurement, and reading `4.5` out of it would be
 *  the invention this app refuses. */
export function leadingNumber(v: CellValue): number | null {
  const direct = toNumber(v)
  if (direct !== null) return direct
  if (typeof v !== 'string') return null
  /* a comma between a digit and three more is a thousands separator —
     the only comma the app's own `formatNumber` ever writes */
  const s = v.trim().replace(/,(?=\d{3}(?:\D|$))/g, '')
  const m = /^[\s$]*(-?\d+(?:\.\d+)?)/.exec(s)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

/** A row's number for one column — the stored value first, its display
 *  text second, so a computed column filters on what it shows. */
function numberIn(row: ViewRow, fieldId: string): number | null {
  const raw = row.values[fieldId]
  if (raw !== undefined) {
    const n = leadingNumber(raw)
    if (n !== null) return n
  }
  const t = row.text[fieldId]
  return t === undefined ? null : leadingNumber(t)
}

function toBoolRank(v: CellValue): number {
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'number') return v ? 1 : 0
  const s = String(v).trim().toLowerCase()
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' ? 1 : 0
}

/** Text ordering: localeCompare with natural numeric runs ("Item 2" before
 *  "Item 10") and case-insensitive equality — ties then fall through to the
 *  stable input-order tiebreak. */
function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/** Plain code-unit comparison — locale-independent, and correct for the
 *  ISO 'YYYY-MM-DD' dates this app stores (lexical === chronological). */
function compareRaw(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Type-aware comparison of two non-blank cells, ascending. */
function compareTyped(
  type: FieldType,
  av: CellValue,
  bv: CellValue,
  at: string,
  bt: string,
): number {
  switch (type) {
    case 'number': {
      const na = toNumber(av)
      const nb = toNumber(bv)
      if (na !== null && nb !== null) return na === nb ? 0 : na < nb ? -1 : 1
      return compareText(at, bt)
    }
    case 'date': {
      const da = typeof av === 'string' ? av : at
      const db = typeof bv === 'string' ? bv : bt
      return compareRaw(da, db)
    }
    case 'boolean':
      return toBoolRank(av) - toBoolRank(bv)
    case 'formula': {
      // Formula results are typed at runtime, not by the schema.
      if (typeof av === 'number' && typeof bv === 'number') {
        return av === bv ? 0 : av < bv ? -1 : 1
      }
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return toBoolRank(av) - toBoolRank(bv)
      }
      return compareText(at, bt)
    }
    case 'text':
    case 'select':
    case 'reference':
    default:
      // reference/select sort by their LABEL, which is what `text` holds.
      return compareText(at, bt)
  }
}

/* ---------- the seam ---------- */

/** Applies filters, then search, then sort.
 *
 *  Stability: rows are decorated with their input index and every
 *  comparator path ends in `a.i - b.i`, so equal keys keep input order
 *  regardless of the host engine's sort implementation.
 *
 *  Blanks (null / undefined / '') always sort last — in BOTH directions.
 *  The blank test short-circuits before the direction sign is applied. */
export function applyView(
  rows: ViewRow[],
  fields: FieldDef[],
  opts: { sort?: SortState | null; filters?: ColumnFilter[]; search?: string },
): ViewRow[] {
  const byId = new Map<string, FieldDef>()
  for (const f of fields) byId.set(f.id, f)

  let out = rows

  /* ---------- filters ---------- */
  const filters = opts.filters ?? []
  for (const filter of filters) {
    // A filter on a column that isn't in `fields` is ignored rather than
    // silently emptying the grid.
    if (!byId.has(filter.fieldId)) continue

    if (filter.kind === 'between') {
      const { min, max } = filter
      if (min === undefined && max === undefined) continue
      out = out.filter((r) => {
        const n = numberIn(r, filter.fieldId)
        if (n === null) return false
        if (min !== undefined && n < min) return false
        if (max !== undefined && n > max) return false
        return true
      })
    } else if (filter.kind === 'values') {
      // Empty `selected` means "no value is allowed through" (Excel's
      // uncheck-everything). To CLEAR a filter, drop the object entirely.
      const allowed = new Set(filter.selected)
      out = out.filter((r) => allowed.has(r.text[filter.fieldId] ?? ''))
    } else {
      const needle = filter.text.trim().toLowerCase()
      if (needle === '') continue
      out = out.filter((r) => (r.text[filter.fieldId] ?? '').toLowerCase().includes(needle))
    }
  }

  /* ---------- search: every column's display text, incl. formulas ---------- */
  const search = (opts.search ?? '').trim().toLowerCase()
  if (search !== '') {
    out = out.filter((r) => Object.values(r.text).some((t) => t.toLowerCase().includes(search)))
  }

  /* ---------- sort ---------- */
  const sort = opts.sort
  if (!sort) return out === rows ? rows.slice() : out

  const field = byId.get(sort.fieldId)
  if (!field) return out === rows ? rows.slice() : out

  const fieldId = sort.fieldId
  const sign = sort.dir === 'desc' ? -1 : 1

  const decorated = out.map((row, i) => {
    const value = valueOf(row, fieldId)
    return { row, i, value, text: textOf(row, fieldId, value), blank: isBlank(value) }
  })

  decorated.sort((a, b) => {
    if (a.blank || b.blank) {
      if (a.blank && b.blank) return a.i - b.i
      return a.blank ? 1 : -1 // blanks last, asc AND desc
    }
    const c = compareTyped(field.type, a.value, b.value, a.text, b.text)
    if (c !== 0) return c * sign
    return a.i - b.i // stable
  })

  return decorated.map((d) => d.row)
}

/** Distinct display values for a column's filter menu, in first-seen order.
 *  Includes '' when the column has empty cells — render it as "(Blanks)". */
export function distinctValues(rows: ViewRow[], fieldId: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of rows) {
    const t = r.text[fieldId] ?? ''
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}
