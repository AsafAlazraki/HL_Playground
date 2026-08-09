/* ============================================================
   Formula engine — function catalogue, coercions, implementations.

   FORMULA_FUNCTIONS is the public, designer-facing metadata (the
   autocomplete / reference list). FN_IMPLS holds the eager runtime
   implementations; IF / AND / OR are special-formed (short-circuit)
   in evaluate.ts so untaken branches never run.
   ============================================================ */

import type { CellValue } from '@/types/model'
import { FormulaError } from './ast'

/* ---------------------------------------------------------- */
/* Coercions — THE single spot where missing-cell policy lives */
/* ---------------------------------------------------------- */
/*
 * Missing / empty cells coerce softly, everything else strictly:
 *
 *   null | undefined | ''  used as a NUMBER      → 0
 *   null | undefined       used as TEXT          → ''
 *   null | undefined       used as TRUE/FALSE    → FALSE
 *
 * Deliberately NOT coerced (throws → the cell shows '#ERROR'):
 *   text  → number   ("12" is still text; types stay honest)
 *   number/text → boolean, boolean → number, etc.
 */

/** How a value reads inside an error message. */
export function describeValue(v: CellValue | undefined): string {
  if (v === null || v === undefined || v === '') return 'an empty value'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  const s = v.length > 24 ? `${v.slice(0, 24)}…` : v
  return `text "${s}"`
}

export function asNumber(v: CellValue | undefined): number {
  if (v === null || v === undefined || v === '') return 0 // missing number = 0
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new FormulaError('Number is out of range')
    return v
  }
  throw new FormulaError(`Expected a number, got ${describeValue(v)}`)
}

export function asText(v: CellValue | undefined): string {
  if (v === null || v === undefined) return '' // missing text = ''
  if (typeof v === 'string') return v
  throw new FormulaError(`Expected text, got ${describeValue(v)}`)
}

export function asBoolean(v: CellValue | undefined): boolean {
  if (v === null || v === undefined) return false // missing boolean = FALSE
  if (typeof v === 'boolean') return v
  throw new FormulaError(`Expected TRUE/FALSE, got ${describeValue(v)}`)
}

/** Loose to-string used ONLY by '&' and CONCAT — their whole job is
 *  joining mixed values into text, so everything stringifies. */
export function stringify(v: CellValue | undefined): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

/** Guard arithmetic results against overflow / NaN. */
export function finite(n: number, op: string): number {
  if (!Number.isFinite(n)) {
    throw new FormulaError(`Result of '${op}' is not a valid number`)
  }
  return n
}

/* ---------------------------------------------------------- */
/* Dates — cell dates are ISO 'YYYY-MM-DD' strings            */
/* ---------------------------------------------------------- */

const DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/

interface Ymd {
  y: number
  m: number
  d: number
}

/** UTC midnight for a calendar date. Date.UTC applies the legacy
 *  two-digit-year mapping (0–99 → 1900–1999), which would misread
 *  real dates like 0099-05-05; setUTCFullYear does not, so the
 *  timestamp is built field-by-field on a zeroed Date. */
function utcTime(y: number, m: number, d: number): number {
  const t = new Date(0)
  t.setUTCFullYear(y, m - 1, d)
  return t.getTime()
}

function parseIsoDate(raw: string, fn: string): Ymd {
  const match = DATE_RE.exec(raw.trim())
  if (match) {
    const y = Number(match[1])
    const m = Number(match[2])
    const d = Number(match[3])
    // round-trip through UTC to reject impossible dates like Feb 30
    const t = new Date(utcTime(y, m, d))
    if (t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d) {
      return { y, m, d }
    }
  }
  throw new FormulaError(
    raw.trim() === ''
      ? `${fn} needs a date, got an empty value`
      : `${fn}: "${raw}" is not a date (expected YYYY-MM-DD)`,
  )
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Local calendar date as ISO 'YYYY-MM-DD'. */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const MS_PER_DAY = 86_400_000

/* ---------------------------------------------------------- */
/* Public metadata — the designer's function reference         */
/* ---------------------------------------------------------- */

export interface FormulaFn {
  name: string
  /** human arity hint: '1', '1–2', '2+', … */
  arity: string
  /** call template shown in autocomplete, e.g. 'ROUND(n, places?)' */
  signature: string
  description: string
  /** enforced bounds — maxArgs null = unlimited */
  minArgs: number
  maxArgs: number | null
}

const fn = (
  name: string,
  signature: string,
  description: string,
  minArgs: number,
  maxArgs: number | null,
): FormulaFn => ({
  name,
  signature,
  description,
  minArgs,
  maxArgs,
  arity:
    maxArgs === null
      ? `${minArgs}+`
      : minArgs === maxArgs
        ? `${minArgs}`
        : `${minArgs}–${maxArgs}`,
})

export const FORMULA_FUNCTIONS: Record<string, FormulaFn> = {
  IF: fn('IF', 'IF(condition, then, else)', 'Returns then when condition is TRUE, otherwise else.', 3, 3),
  AND: fn('AND', 'AND(a, b, …)', 'TRUE when every argument is TRUE.', 1, null),
  OR: fn('OR', 'OR(a, b, …)', 'TRUE when any argument is TRUE.', 1, null),
  NOT: fn('NOT', 'NOT(x)', 'Inverts TRUE to FALSE and back.', 1, 1),
  ROUND: fn('ROUND', 'ROUND(n, places?)', 'Rounds n to places decimals (default 0; negative rounds to tens, hundreds…).', 1, 2),
  ABS: fn('ABS', 'ABS(n)', 'Absolute value of n.', 1, 1),
  MIN: fn('MIN', 'MIN(a, b, …)', 'Smallest of the numbers given.', 1, null),
  MAX: fn('MAX', 'MAX(a, b, …)', 'Largest of the numbers given.', 1, null),
  SUM: fn('SUM', 'SUM(a, b, …)', 'Adds all the numbers given.', 1, null),
  UPPER: fn('UPPER', 'UPPER(text)', 'Text in UPPERCASE.', 1, 1),
  LOWER: fn('LOWER', 'LOWER(text)', 'Text in lowercase.', 1, 1),
  LEN: fn('LEN', 'LEN(text)', 'Number of characters in text.', 1, 1),
  CONCAT: fn('CONCAT', 'CONCAT(a, b, …)', 'Joins values into one piece of text.', 1, null),
  TODAY: fn('TODAY', 'TODAY()', "Today's date as YYYY-MM-DD.", 0, 0),
  YEAR: fn('YEAR', 'YEAR(date)', 'The year of a YYYY-MM-DD date.', 1, 1),
  MONTH: fn('MONTH', 'MONTH(date)', 'The month (1–12) of a YYYY-MM-DD date.', 1, 1),
  DAY: fn('DAY', 'DAY(date)', 'The day of month (1–31) of a YYYY-MM-DD date.', 1, 1),
  DATEDIFF: fn('DATEDIFF', 'DATEDIFF(a, b)', 'Whole days from date a to date b (b − a).', 2, 2),
}

/* ---------------------------------------------------------- */
/* Implementations (eager — args already evaluated)           */
/* IF / AND / OR live in evaluate.ts as lazy special forms.   */
/* ---------------------------------------------------------- */

export const FN_IMPLS: Record<string, (args: (CellValue | undefined)[]) => CellValue> = {
  NOT: ([x]) => !asBoolean(x),

  ROUND: ([n, p]) => {
    const x = asNumber(n)
    // clamp places to a sane band so 10^places stays exact
    const places = Math.max(-12, Math.min(12, Math.trunc(p === undefined ? 0 : asNumber(p))))
    const factor = 10 ** places
    // round half AWAY from zero (Excel-style), not JS half-up
    const sign = x < 0 ? -1 : 1
    return finite((sign * Math.round(Math.abs(x) * factor)) / factor, 'ROUND')
  },

  ABS: ([n]) => Math.abs(asNumber(n)),

  MIN: (xs) => Math.min(...xs.map((v) => asNumber(v))),
  MAX: (xs) => Math.max(...xs.map((v) => asNumber(v))),
  SUM: (xs) => xs.reduce<number>((acc, v) => finite(acc + asNumber(v), 'SUM'), 0),

  UPPER: ([s]) => asText(s).toUpperCase(),
  LOWER: ([s]) => asText(s).toLowerCase(),
  LEN: ([s]) => asText(s).length,

  CONCAT: (xs) => xs.map((v) => stringify(v)).join(''),

  TODAY: () => todayIso(),

  YEAR: ([s]) => parseIsoDate(asText(s), 'YEAR').y,
  MONTH: ([s]) => parseIsoDate(asText(s), 'MONTH').m,
  DAY: ([s]) => parseIsoDate(asText(s), 'DAY').d,

  DATEDIFF: ([a, b]) => {
    const da = parseIsoDate(asText(a), 'DATEDIFF')
    const db = parseIsoDate(asText(b), 'DATEDIFF')
    // utcTime (not Date.UTC) so years 0–99 aren't shifted to 1900+
    return Math.round((utcTime(db.y, db.m, db.d) - utcTime(da.y, da.m, da.d)) / MS_PER_DAY)
  },
}
