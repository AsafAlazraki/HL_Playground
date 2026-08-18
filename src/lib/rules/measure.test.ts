/* ============================================================
   A MEASUREMENT IS ORDERED AS A NUMBER, NOT AS A WORD.

   THE DEFECT THIS PINS, MEASURED ON THE REAL PRICE FILE. A workbook
   writes "10 HP" in a column of horsepower, because a person typed the
   unit. `Number("10 HP")` is NaN, so `compareValues` fell through to
   its last branch and put the two sides in ALPHABETICAL order. On the
   seeded rule "Motor fitment — Highfield", that made "8" > "10 HP" and
   "115" < "20 HP" — both lexicographically true and both wrong about
   outboards. It rejected 243 of the 2,519 pairings the workbook itself
   writes, and admitted a far larger number of motors ABOVE the hull's
   plate: the rule's output went from 63,232 rows to exactly 32,000
   when this was fixed, and the 31,232 that left were motors the hull's
   own spec plate does not allow.

   Nothing here guesses. A value that is not ONE number — "2 x 300 HP",
   a twin rig — does not parse, and a clause over it reports a mismatch
   with a sentence rather than inventing a total. That is
   FITMENT_RULES.md F1's own position: Max HP must be decomposed into
   total, rig count and per-engine AT IMPORT.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { compareValues } from './evaluate'

const ok = (op: Parameters<typeof compareValues>[0], a: unknown, b: unknown): boolean =>
  compareValues(op, a as never, b as never).result

const why = (op: Parameters<typeof compareValues>[0], a: unknown, b: unknown): string | undefined =>
  compareValues(op, a as never, b as never).mismatch

describe('a number with its unit still attached', () => {
  it('orders as horsepower and not as an alphabet', () => {
    /* the two that were wrong on the real file */
    expect(ok('lte', '8', '10 HP')).toBe(true)
    expect(ok('lte', '115', '20 HP')).toBe(false)
    /* and the ordinary cases keep working */
    expect(ok('lte', '9.9', '10 HP')).toBe(true)
    expect(ok('gt', '300 HP', '250')).toBe(true)
    expect(ok('lte', 60, '50 HP')).toBe(false)
    expect(ok('gte', '1,188 kg', 1000)).toBe(true)
  })

  it('will not order two different units, and says which', () => {
    const m = why('lt', '500 mm', '20 in')
    expect(m).toContain('different units')
    expect(ok('lt', '500 mm', '20 in')).toBe(false)
    /* the same unit is fine, and so is a bare number against one */
    expect(ok('lt', '500 mm', '600 mm')).toBe(true)
    expect(ok('lt', '500', '600 mm')).toBe(true)
  })

  it('refuses a twin rig rather than guessing what it totals', () => {
    expect(ok('lte', '300', '2 x 300 HP')).toBe(false)
    expect(why('lte', '300', '2 x 300 HP')).toContain('measurement')
    /* equality still answers, because "is this the same text" always
       has an answer whatever the two sides are */
    expect(ok('eq', '2 x 300 HP', '2 x 300 hp')).toBe(true)
    expect(ok('neq', '2 x 300 HP', '2 x 200 HP')).toBe(true)
  })

  it('leaves ordinary text alone', () => {
    expect(ok('lt', 'apple', 'banana')).toBe(true)
    expect(ok('gt', 'Zebra', 'apple')).toBe(true)
    expect(why('lt', 'apple', 'banana')).toBeUndefined()
  })

  it('leaves dates alone, which sort as text on purpose', () => {
    expect(ok('lt', '2026-01-02', '2026-08-18')).toBe(true)
    expect(ok('gt', '2026-08-18T09:00', '2026-08-18')).toBe(true)
  })

  it('names a measurement when it cannot compare one', () => {
    /* the sentence a person reads, and it used to read
       "text cannot be compared with text" */
    expect(why('lte', '50 HP', 'ask the factory')).toBe(
      'a measurement cannot be compared with text',
    )
  })

  it('still treats a blank as a data condition and not a type error', () => {
    expect(ok('lte', '', '10 HP')).toBe(false)
    expect(why('lte', '', '10 HP')).toBeUndefined()
    expect(ok('eq', '', null)).toBe(true)
  })
})
