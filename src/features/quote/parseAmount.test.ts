/* ============================================================
   THE ONLY PATH FROM A KEYSTROKE INTO A QUOTE'S MONEY.

   `parseAmount` reads every typed figure on a quote — the adjustment
   magnitude (QuoteEditor.tsx:408), the override (`:489`) and the free
   line (`:1392`). Across 112 test files it had none of its own, and it
   was wrong in a way that never showed: it stripped every comma before
   reading the number, so `25,5` became 255 and `12,34` became 1234.

   A tenfold error on a customer's quote, from one keystroke, with
   nothing on screen to say it happened. That is the failure this file
   exists to keep out.

   THE CASES ARE THE ARGUMENT. What a person can type divides three
   ways, and the middle one is the whole point:

     - unambiguous, and read as written        (1,234 · 1,234.56 · .5)
     - unambiguous, and REFUSED                (1e3 · 1.2.3 · 1,2,3)
     - genuinely ambiguous, and refused        (25,5 · 12,34 · 1234,56)

   25.5 and 255 are both defensible readings of `25,5` and one of them
   is wrong by a factor of ten. There is no way to choose from inside
   this function, so it returns null and the person types it again.
   Refusing is the feature, not a gap in it.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { parseAmount } from './pricing'

describe('parseAmount — figures read as written', () => {
  it('reads a plain number, with or without cents', () => {
    expect(parseAmount('1234')).toBe(1234)
    expect(parseAmount('1234.56')).toBe(1234.56)
    expect(parseAmount('0')).toBe(0)
    expect(parseAmount('.5')).toBe(0.5)
  })

  it('reads correctly grouped thousands, which is how the price file writes them', () => {
    expect(parseAmount('1,234')).toBe(1234)
    expect(parseAmount('14,190')).toBe(14190)
    expect(parseAmount('1,234,567')).toBe(1234567)
    expect(parseAmount('1,234.56')).toBe(1234.56)
    expect(parseAmount('1,234,567.89')).toBe(1234567.89)
  })

  it('ignores what arrives by paste and does not change the number', () => {
    expect(parseAmount('$14,190')).toBe(14190)
    expect(parseAmount(' 1,234.56 ')).toBe(1234.56)
    expect(parseAmount('$ 1,234')).toBe(1234)
  })

  it('keeps the sign, including a pasted unicode minus', () => {
    expect(parseAmount('-5')).toBe(-5)
    expect(parseAmount('-1,234.56')).toBe(-1234.56)
    expect(parseAmount('−5')).toBe(-5) /* U+2212 MINUS SIGN */
    expect(parseAmount('–5')).toBe(-5) /* U+2013 EN DASH, from Word */
    expect(parseAmount('+5')).toBe(5)
  })
})

describe('parseAmount — blank is not zero', () => {
  it('returns null for a field nobody filled in', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
  })

  it('returns null for a sign with no number after it', () => {
    expect(parseAmount('-')).toBeNull()
    expect(parseAmount('+')).toBeNull()
    expect(parseAmount('$')).toBeNull()
  })
})

describe('parseAmount — the tenfold errors it used to make silently', () => {
  /* Each of these produced a wrong NUMBER before, not an error. The
     assertion is null: the field stays empty and is typed again. */
  it('refuses a comma decimal rather than reading it as thousands', () => {
    expect(parseAmount('25,5')).toBeNull() /* was 255 */
    expect(parseAmount('12,34')).toBeNull() /* was 1234 */
    expect(parseAmount('1234,56')).toBeNull() /* was 123456 */
  })

  it('refuses commas that group nothing', () => {
    expect(parseAmount('1,2,3')).toBeNull() /* was 123 */
    expect(parseAmount('1,23456')).toBeNull() /* was 123456 */
    expect(parseAmount('1,23')).toBeNull()
    expect(parseAmount(',5')).toBeNull()
  })

  it('refuses scientific notation, which is not how money is written', () => {
    expect(parseAmount('1e3')).toBeNull() /* was 1000 */
    expect(parseAmount('1E3')).toBeNull()
    expect(parseAmount('1e-3')).toBeNull()
  })

  it('refuses two decimal points', () => {
    expect(parseAmount('1.2.3')).toBeNull()
  })

  it('refuses text, and text with a number in it', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('12abc')).toBeNull()
    expect(parseAmount('NaN')).toBeNull()
    expect(parseAmount('Infinity')).toBeNull()
  })
})

describe('parseAmount — the properties that must hold', () => {
  it('never returns a non-finite number', () => {
    for (const s of ['Infinity', '-Infinity', 'NaN', '1e999', '']) {
      const n = parseAmount(s)
      expect(n === null || Number.isFinite(n)).toBe(true)
    }
  })

  it('round-trips a correctly grouped figure through its own output', () => {
    for (const n of [0, 5, 25.5, 1234, 14190, 1234567.89]) {
      expect(parseAmount(String(n))).toBe(n)
    }
  })

  it('is total — every string returns a number or null, and nothing throws', () => {
    for (const s of ['', '-', '.', ',', '$', '--5', '1,', ',1', '1..2', ' 1 234']) {
      expect(() => parseAmount(s)).not.toThrow()
      const n = parseAmount(s)
      expect(n === null || typeof n === 'number').toBe(true)
    }
  })
})
