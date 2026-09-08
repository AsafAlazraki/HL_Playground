/* PROBE — temporary, replaced by the real suite */
import { describe, it } from 'vitest'
import type { CellValue } from '@/types/model'
import { compileFormula, evalExpr } from './index'

const raw = (src: string, fields: Record<string, CellValue> = {}): unknown => {
  try {
    return evalExpr(compileFormula(src).ast, {
      resolveField: (name) => fields[name] ?? null,
    })
  } catch (e) {
    return `THROWS: ${e instanceof Error ? e.message : String(e)}`
  }
}

const probes: string[] = [
  'ABS(-3)', 'ABS(0)', 'ABS(-0)', 'ABS("")', 'ABS("3")', 'ABS(TRUE)',
  'MIN(3, 1, 2)', 'MIN(1)', 'MIN(-0, 0)', 'MIN(1, "")', 'MIN(1, "a")', 'MIN(1, TRUE)',
  'MAX(3, 1, 2)', 'MAX(1)', 'MAX(1, "")',
  'SUM(1, 2, 3)', 'SUM(1)', 'SUM(0.1, 0.2)', 'SUM(1, "")', 'SUM(1, "a")',
  'SUM(1e308, 1e308)', 'MAX(1e308) * 10',
  'ROUND(2.675, 2)', 'ROUND(1.005, 2)', 'ROUND(1.5, 13)', 'ROUND(123, -13)',
  'ROUND(1e308, 2)', 'ROUND(2.5, 0.9)', 'ROUND(-1250, -2)', 'ROUND("")',
  'UPPER("abc")', 'UPPER("")', 'UPPER("straße")', 'UPPER(1)', 'UPPER(TRUE)',
  'LOWER("ABC")', 'LOWER("İ")',
  'LEN("abc")', 'LEN("")', 'LEN("😀")', 'LEN("é")', 'LEN(123)',
  'CONCAT("a", 1, TRUE)', 'CONCAT("a")', 'CONCAT(0.1 + 0.2)', 'CONCAT(1e21)',
  'CONCAT(1/3)', 'CONCAT(-0)',
  'NOT(TRUE)', 'NOT(FALSE)', 'NOT(1)', 'NOT("")',
  'AND(TRUE, TRUE)', 'AND(TRUE, FALSE)', 'AND(TRUE)', 'AND(FALSE, 1/0)',
  'AND(1, TRUE)', 'OR(FALSE, TRUE)', 'OR(TRUE, 1/0)', 'OR(FALSE, FALSE)',
  'IF(TRUE, 1, 2)', 'IF(FALSE, 1, "x")', 'IF(1, 2, 3)', 'IF("", 1, 2)',
  'YEAR("2024-03-15")', 'MONTH("2024-03-15")', 'DAY("2024-03-15")',
  'YEAR("2024-3-5")', 'MONTH("2024-3-5")', 'DAY("2024-3-5")',
  'YEAR("  2024-03-15  ")', 'YEAR("2024-03-15T10:30:00Z")',
  'DAY("2024-03-15T23:00:00-05:00")', 'YEAR("0099-05-05")', 'YEAR("0001-01-01")',
  'DAY("2024-02-29")', 'DAY("2023-02-29")', 'DAY("2024-02-30")', 'MONTH("2024-13-01")',
  'YEAR("")', 'YEAR("nope")', 'YEAR(20240315)', 'YEAR("2024/03/15")',
  'YEAR("10000-01-01")', 'YEAR("24-03-15")', 'DAY("2024-03-15 10:00")',
  'DATEDIFF("2024-01-01", "2024-01-31")', 'DATEDIFF("2024-01-31", "2024-01-01")',
  'DATEDIFF("2024-02-28", "2024-03-01")', 'DATEDIFF("2023-02-28", "2023-03-01")',
  'DATEDIFF("2024-03-01", "2024-04-01")', 'DATEDIFF("2024-01-01", "2024-01-01")',
  'DATEDIFF("0099-12-31", "0100-01-01")', 'DATEDIFF("2024-01-01", "")',
  'TODAY()', 'LEN(TODAY())', 'YEAR(TODAY())',
  'MIN()', 'ABS(1, 2)', 'DATEDIFF("2024-01-01")', 'TODAY(1)',
  'CONCAT()', 'SUM()', 'LEN()', 'NOT()', 'AND()', 'IF(TRUE, 1)',
]

describe('probe', () => {
  it('prints', () => {
    for (const p of probes) {
      console.log(`${p}  =>  ${JSON.stringify(raw(p))}`)
    }
    console.log('--- field-backed ---')
    console.log('LEN([A]) null  =>', JSON.stringify(raw('LEN([A])')))
    console.log('CONCAT([A]) null  =>', JSON.stringify(raw('CONCAT([A])')))
    console.log('SUM([A]) null  =>', JSON.stringify(raw('SUM([A])')))
    console.log('ABS([A]) images =>', JSON.stringify(raw('ABS([A])', { A: [] as unknown as CellValue })))
    console.log('CONCAT([A]) images =>', JSON.stringify(raw('CONCAT([A])', { A: [{ id: 'x', src: 'y' }] as unknown as CellValue })))
    console.log('LEN([A]) images =>', JSON.stringify(raw('LEN([A])', { A: [{ id: 'x', src: 'y' }] as unknown as CellValue })))
    console.log('YEAR([A]) null =>', JSON.stringify(raw('YEAR([A])')))
    console.log('tz =>', Intl.DateTimeFormat().resolvedOptions().timeZone, new Date().getTimezoneOffset())
  })
})
