/* ============================================================
   Configure — values: keys, comparison, English formatting.

   The solver works over CELL VALUES, not rows, so it needs its own
   small value layer. It deliberately mirrors the semantics of
   '@/lib/rules/evaluate' (numbers before dates before text, blanks
   never order, case-insensitive text) so a preview and a run can
   never disagree — but it does NOT import it: `src/lib/configure/`
   answers a different question and depends on '@/types/model' alone.

   ONE DIFFERENCE, and it is the important one: `compare` returns
   `undefined` when the two sides are genuinely different types.
   A three-valued answer is what lets the solver keep a value it
   cannot judge (rules fail open — CONFIG_FINDINGS.md §4.4) instead
   of pruning it away and blaming an innocent rule.

   Nothing here throws, for any input.
   ============================================================ */

import {
  isImageValue,
  imageCellText,
  type CellValue,
  type CompareOp,
} from '@/types/model'

/** 'YYYY-MM-DD', optionally with a time part — ISO strings sort
 *  correctly as plain text, which is what makes date order free. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/

/** The key a value is indexed by inside `domains` and `blocked`.
 *  `String(v)` exactly as ConfigureState documents, so `true`, `4` and
 *  `'Salt'` all index. Image lists never enter an enumerable domain,
 *  so the array case never reaches here in practice. */
export const valueKey = (v: CellValue): string => String(v)

/** Read a key off a plain object without tripping over inherited
 *  members ('constructor', 'toString', …). */
export function ownKey<T>(bag: Record<string, T> | undefined, key: string): T | undefined {
  if (!bag) return undefined
  return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : undefined
}

/** Write a key onto a plain object safely — `defineProperty` stores
 *  '__proto__' as an ordinary key instead of re-pointing the prototype. */
export function setKey<T>(bag: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(bag, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  })
}

/** Blank — nothing written. A rule whose right-hand side is blank is
 *  UNFINISHED, never "must equal nothing": the sentence editor persists
 *  `{ kind: 'literal', value: '' }` the moment a value box is cleared,
 *  and "must be blank" is written with the isEmpty operator instead. */
export function isBlank(v: CellValue | undefined): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (isImageValue(v)) return v.length === 0
  return false
}

function asNumber(v: CellValue): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '') return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function asStrictBoolean(v: CellValue): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase()
    if (t === 'true' || t === 'yes') return true
    if (t === 'false' || t === 'no') return false
  }
  return undefined
}

/** Forgiving truthiness — used only by the isTrue / isFalse operators,
 *  and total, so `isFalse` really is the negation of `isTrue`. */
export function asBoolean(v: CellValue): boolean {
  const b = asStrictBoolean(v)
  if (b !== undefined) return b
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.trim() !== '' && v.trim() !== '0'
  if (isImageValue(v)) return v.length > 0
  return false
}

function asText(v: CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (isImageValue(v)) return imageCellText(v)
  return String(v)
}

const normText = (v: CellValue): string => asText(v).trim().toLowerCase()

function orderNumbers(op: CompareOp, a: number, b: number): boolean | undefined {
  switch (op) {
    case 'eq':
      return a === b
    case 'neq':
      return a !== b
    case 'gt':
      return a > b
    case 'gte':
      return a >= b
    case 'lt':
      return a < b
    case 'lte':
      return a <= b
    default:
      return undefined
  }
}

function orderStrings(op: CompareOp, a: string, b: string): boolean | undefined {
  switch (op) {
    case 'eq':
      return a === b
    case 'neq':
      return a !== b
    case 'gt':
      return a > b
    case 'gte':
      return a >= b
    case 'lt':
      return a < b
    case 'lte':
      return a <= b
    default:
      return undefined
  }
}

/**
 * Compare two cell values.
 *   true       the test holds
 *   false      the test definitely does not hold
 *   undefined  the two sides cannot be compared at all — the caller
 *              must treat this as "unknown", never as "no"
 */
export function compare(op: CompareOp, left: CellValue, right: CellValue): boolean | undefined {
  /* text operators coerce both sides; they can never be unknown */
  if (op === 'contains') return normText(left).includes(normText(right))
  if (op === 'startsWith') return normText(left).startsWith(normText(right))
  if (op === 'endsWith') return normText(left).endsWith(normText(right))

  const leftBlank = isBlank(left)
  const rightBlank = isBlank(right)
  if (leftBlank || rightBlank) {
    /* missing data is a data condition, not a type error */
    if (op === 'eq') return leftBlank && rightBlank
    if (op === 'neq') return !(leftBlank && rightBlank)
    return false
  }

  /* a non-empty image list is not orderable against anything */
  if (isImageValue(left) || isImageValue(right)) return undefined

  /* a real number on either side forces a numeric comparison */
  if (typeof left === 'number' || typeof right === 'number') {
    const a = asNumber(left)
    const b = asNumber(right)
    if (a === undefined || b === undefined) return undefined
    return orderNumbers(op, a, b)
  }

  /* a real yes/no on either side forces an equality comparison */
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    const a = asStrictBoolean(left)
    const b = asStrictBoolean(right)
    if (a === undefined || b === undefined) return undefined
    if (op === 'eq') return a === b
    if (op === 'neq') return a !== b
    return undefined /* yes/no values cannot be put in order */
  }

  const ls = asText(left).trim()
  const rs = asText(right).trim()
  if (ISO_DATE.test(ls) && ISO_DATE.test(rs)) return orderStrings(op, ls, rs)

  const ln = asNumber(ls)
  const rn = asNumber(rs)
  if (ln !== undefined && rn !== undefined) return orderNumbers(op, ln, rn)

  return orderStrings(op, ls.toLowerCase(), rs.toLowerCase())
}

/** The operators that take no right-hand side, answered against one
 *  candidate value. Total — never unknown. */
export function testUnary(op: CompareOp, v: CellValue): boolean {
  switch (op) {
    case 'isEmpty':
      return isBlank(v)
    case 'notEmpty':
      return !isBlank(v)
    case 'isTrue':
      return asBoolean(v)
    case 'isFalse':
      return !asBoolean(v)
    default:
      return false
  }
}

/** Thousands separators without a locale, so the same input always
 *  produces the same sentence on every machine. */
function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  const s = String(Math.abs(n))
  if (s.includes('e') || s.includes('E')) return String(n)
  const dot = s.indexOf('.')
  const whole = dot === -1 ? s : s.slice(0, dot)
  const frac = dot === -1 ? '' : s.slice(dot)
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${n < 0 ? '-' : ''}${grouped}${frac}`
}

/** A value as a person would read it mid-sentence. */
export function formatValue(v: CellValue): string {
  if (v === null || v === undefined) return 'nothing'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return formatNumber(v)
  if (isImageValue(v)) return v.length === 0 ? 'no images' : imageCellText(v)
  return String(v)
}
