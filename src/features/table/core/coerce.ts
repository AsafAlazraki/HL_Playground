/* ============================================================
   Table core — text <-> typed cell value.

   Used by paste (text -> value) and copy (value -> text). Every failure
   carries a human-readable reason so the paste summary toast and the
   red-pencil cell ticks can quote it verbatim.

   Deterministic: no Date.now(), no locale parsing, no ambient timezone.
   ============================================================ */
import { imageCellText, isImageValue } from '@/types/model'
import type { CellValue, FieldDef } from '@/types/model'

export type CoerceResult = { ok: true; value: CellValue } | { ok: false; reason: string }

/* ---------- numbers ---------- */

/** Currency marks stripped before parsing. Symbols only — letters are
 *  never stripped, so "12abc" stays a hard error rather than becoming 12. */
const CURRENCY = /[$€£¥₹¢₽₩₪₺₫₴₦฿₡₲₵₸₼₾¤]/g
/** Thousands separators: comma, apostrophe, typographic apostrophe. */
const GROUPING = /[,'’]/g
/** What a number is allowed to look like once the noise is gone.
 *  Deliberately stricter than Number(): rejects '', '0x10', 'Infinity'. */
const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

/** Number display per spec: up to 4 decimals, trailing zeros trimmed. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n) || Math.abs(n) >= 1e21) return String(n)
  const s = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return s === '-0' ? '0' : s
}

function parseNumberText(raw: string): CoerceResult {
  let s = raw.trim()
  let negate = false

  // Accounting negatives: "(1,234.50)" === -1234.5
  if (s.length >= 2 && s.startsWith('(') && s.endsWith(')')) {
    negate = true
    s = s.slice(1, -1).trim()
  }

  // A trailing % is treated as a LITERAL number, not a ratio:
  // "85%" -> 85, never 0.85. Percent columns in this app store whole
  // numbers, and silently dividing by 100 on paste loses data the user
  // can see in the source spreadsheet.
  if (s.endsWith('%')) s = s.slice(0, -1).trim()

  s = s.replace(CURRENCY, '').replace(/\s/g, '').replace(GROUPING, '')

  if (s === '' || !NUMERIC.test(s)) {
    return { ok: false, reason: `"${raw.trim()}" is not a number` }
  }

  const n = Number(s) * (negate ? -1 : 1)
  if (!Number.isFinite(n)) {
    return { ok: false, reason: `"${raw.trim()}" is out of range for a number` }
  }
  return { ok: true, value: n === 0 ? 0 : n } // normalise -0
}

/* ---------- booleans ---------- */

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1'])
const FALSE_WORDS = new Set(['false', 'no', 'n', '0'])

/* ---------- dates ---------- */

/** date + optional trailing time, which is dropped (Excel often pastes
 *  "2026-01-15 00:00:00"). */
const TIME_TAIL = /[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:[ap]\.?m\.?|Z|[+-]\d{2}:?\d{2})?$/i
/** Three numeric parts joined by a consistent separator: / . or - */
const DATE_PARTS = /^(\d{1,4})([/.-])(\d{1,2})\2(\d{1,4})$/

const isLeap = (y: number): boolean => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)

function daysInMonth(y: number, m: number): number {
  const table = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return table[m - 1] ?? 0
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0')

function parseDateText(raw: string): CoerceResult {
  const trimmed = raw.trim()
  const s = trimmed.replace(TIME_TAIL, '').trim()
  const m = DATE_PARTS.exec(s)
  if (!m) {
    return {
      ok: false,
      reason: `"${trimmed}" is not a date — use DD/MM/YYYY or YYYY-MM-DD`,
    }
  }

  const [, aRaw, , bRaw, cRaw] = m
  let year: number
  let month: number
  let day: number

  if (aRaw.length === 4) {
    // ISO order: YYYY-MM-DD (also YYYY/MM/DD)
    year = Number(aRaw)
    month = Number(bRaw)
    day = Number(cRaw)
  } else {
    // Day-first, matching the Australian users. 03/04/2026 is 3 April.
    // A US-ordered date (01/13/2026) fails the month check below and is
    // reported rather than silently reinterpreted.
    day = Number(aRaw)
    month = Number(bRaw)
    year = Number(cRaw)
    if (cRaw.length <= 2) year = year <= 69 ? 2000 + year : 1900 + year
  }

  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { ok: false, reason: `"${trimmed}" is not a real date` }
  }
  return { ok: true, value: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` }
}

/* ---------- the seam ---------- */

function optionPreview(options: string[]): string {
  const head = options.slice(0, 6).join(', ')
  return options.length > 6 ? `${head}, …` : head
}

/** Text -> typed cell value for one field.
 *  Empty (or whitespace-only) text always means "clear the cell" -> null. */
export function coerceCellText(
  text: string,
  field: FieldDef,
  refRowLabels?: Map<string, string>, // lowercased label -> row id
): CoerceResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }

  switch (field.type) {
    case 'number':
      return parseNumberText(text)

    case 'boolean': {
      const w = trimmed.toLowerCase()
      if (TRUE_WORDS.has(w)) return { ok: true, value: true }
      if (FALSE_WORDS.has(w)) return { ok: true, value: false }
      return {
        ok: false,
        reason: `"${trimmed}" is not yes/no — use true/false, yes/no, y/n or 1/0`,
      }
    }

    case 'date':
      return parseDateText(text)

    case 'select': {
      const options = field.options ?? []
      if (options.length === 0) {
        return { ok: false, reason: `"${field.name}" has no list options yet` }
      }
      const want = trimmed.toLowerCase()
      // Case-insensitive match, canonical casing returned.
      const hit = options.find((o) => o.trim().toLowerCase() === want)
      if (hit !== undefined) return { ok: true, value: hit }
      return { ok: false, reason: `"${trimmed}" is not one of: ${optionPreview(options)}` }
    }

    case 'reference': {
      if (!refRowLabels || refRowLabels.size === 0) {
        return { ok: false, reason: `No rows to link to for "${field.name}"` }
      }
      const id = refRowLabels.get(trimmed.toLowerCase())
      if (id !== undefined) return { ok: true, value: id }
      return { ok: false, reason: `No linked row labelled "${trimmed}"` }
    }

    case 'formula':
      // Callers skip formula columns before ever getting here (paste is
      // silent about them); the reason exists for anything that doesn't.
      return { ok: false, reason: `"${field.name}" is calculated and cannot be edited` }

    case 'image':
      // Pictures are files, not text. A URL pasted into a picture column
      // would sit there looking like data and render as nothing, so the
      // paste path skips these columns and this is the backstop.
      return {
        ok: false,
        reason: `"${field.name}" holds pictures — drop image files on the cell`,
      }

    case 'text':
    default:
      // Passthrough, including any interior padding the source had.
      return { ok: true, value: text }
  }
}

/** Primitive -> text, independent of any declared field type. Used for
 *  formula results, whose runtime type is whatever the engine returned. */
function primitiveText(value: CellValue): string {
  if (value == null) return ''
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  /* images are a list, not a primitive: they contribute a count so that
     search, sort, copy and export never carry a blob of URLs */
  if (isImageValue(value)) return imageCellText(value)
  return value
}

/** Value -> display/clipboard text. Inverse of `coerceCellText`, so a
 *  copy → paste round-trip is lossless for every type. */
export function cellToText(
  value: CellValue,
  field: FieldDef,
  refRowLabel?: (rowId: string) => string | undefined,
): string {
  if (value == null) return ''

  switch (field.type) {
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value)

    case 'boolean':
      return typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : primitiveText(value)

    case 'reference': {
      const id = String(value)
      if (id === '') return ''
      // Falls back to the raw id when the target row is gone, so the copy
      // still carries something identifiable.
      return refRowLabel?.(id) ?? id
    }

    case 'date':
    case 'select':
    case 'text':
    case 'formula':
    default:
      return primitiveText(value)
  }
}
