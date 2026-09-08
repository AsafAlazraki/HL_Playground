/* ============================================================
   The 18 builtins, one at a time — what they ACTUALLY return.

   WHY THIS FILE EXISTS. formula.test.ts (29 cases) tests the parser
   and the row walker: precedence, cycles, sentinels. It is a shape
   test, and it was the only formula test. Counted against
   functions.ts:161-180, thirteen of the eighteen builtins had no
   behavioural assertion at all:

     covered before   IF, AND, OR, NOT, ROUND   (5)
     not covered      ABS MIN MAX SUM UPPER LOWER LEN CONCAT
                      TODAY YEAR MONTH DAY DATEDIFF          (13)

   — and of the five, AND / OR / NOT were only ever exercised through
   the INFIX spelling (`a AND b`, `NOT x`), which is a different code
   path in evaluate.ts (evalBinary / the 'unary' case) from the call
   spelling. Every date function was untested. Formula columns price a
   real quote, so a wrong builtin is a wrong number on a document a
   customer reads.

   WHAT THESE ASSERTIONS ARE. Observed behaviour, not intended
   behaviour. Where the two differ the observation is written down and
   labelled SURPRISE with the reason; nothing here was adjusted to
   make the engine look better than it is. Nine such cases:
     ROUND(1.005, 2) = 1        while ROUND(2.675, 2) = 2.68
     ROUND(-0.4)     = -0       negative zero, not 0
     MIN(-0, 0)      = -0       likewise
     MIN(x, empty)   = 0        an unfilled cell drags a MIN to zero
     CONCAT(image)   = "[object Object]"
     an image cell is called `text ""` in an error message
     'MIN expects at least 1 arguments'   parser.ts:130-132 plural
     NOT(x) never reaches FN_IMPLS.NOT    parser.ts:164 makes it unary
     DAY("…T23:00:00-05:00") = 15         the offset is dropped

   And one that is not a surprise but is worth stating plainly: TODAY()
   reads the machine clock AND its time zone, so no test of it is a
   guard against anything — the two tests here fake both.

   Fixtures are synthetic: 'Table A', [A], no catalogue values.
   ============================================================ */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CellValue, ImageRef } from '@/types/model'
import { compileFormula, evalExpr } from './index'
import { FN_IMPLS, FORMULA_FUNCTIONS, todayIso } from './functions'

/* -- helpers ------------------------------------------------- */

/** Evaluate through the public surface. `cells` backs `[A]`, `[B]`;
 *  an absent name resolves to null — the missing-cell case. */
const value = (src: string, cells: Record<string, CellValue> = {}): CellValue =>
  evalExpr(compileFormula(src).ast, {
    resolveField: (name) => cells[name] ?? null,
  })

const IMAGE_CELL: ImageRef[] = [{ id: 'img-1', src: 'blob:test', name: 'a.png' }]

/** process.env, typed by hand: tsconfig.app.json carries no node lib
 *  (no @types/node), and the repo already reaches host globals through
 *  a cast on globalThis — features/history/render.test.ts:45. Used only
 *  by the two time-zone tests below, which restore what they set. */
const nodeEnv = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
  .process.env

afterEach(() => {
  vi.useRealTimers()
})

/* ============================================================
   The catalogue itself
   ============================================================ */

describe('the function catalogue', () => {
  it('declares eighteen builtins, and every one is callable', () => {
    /* Pinned because the arity gate in parser.ts:124-135 reads this
       table: a builtin added without metadata is unreachable, and one
       with metadata but no implementation throws 'Unknown function'
       at evaluate.ts:187 only when a user finally types it. */
    expect(Object.keys(FORMULA_FUNCTIONS)).toHaveLength(18)

    /* IF / AND / OR are lazy special forms handled in evaluate.ts
       :174-185 and deliberately have no FN_IMPLS entry. */
    const SPECIAL = ['IF', 'AND', 'OR']
    const missing = Object.keys(FORMULA_FUNCTIONS).filter(
      (name) => !SPECIAL.includes(name) && !(name in FN_IMPLS),
    )
    expect(missing).toEqual([])

    const orphanImpls = Object.keys(FN_IMPLS).filter((n) => !(n in FORMULA_FUNCTIONS))
    expect(orphanImpls).toEqual([])
  })

  it('derives the human arity hint from the enforced bounds', () => {
    expect(FORMULA_FUNCTIONS.ABS.arity).toBe('1')
    expect(FORMULA_FUNCTIONS.ROUND.arity).toBe('1–2')
    expect(FORMULA_FUNCTIONS.SUM.arity).toBe('1+')
    expect(FORMULA_FUNCTIONS.TODAY.arity).toBe('0')
    for (const f of Object.values(FORMULA_FUNCTIONS)) {
      if (f.maxArgs !== null) expect(f.maxArgs).toBeGreaterThanOrEqual(f.minArgs)
    }
  })
})

/* ============================================================
   Numbers
   ============================================================ */

describe('ABS', () => {
  it('takes the magnitude, and normalises -0 to 0', () => {
    expect(value('ABS(-3)')).toBe(3)
    expect(value('ABS(3)')).toBe(3)
    expect(value('ABS(0)')).toBe(0)
    // Math.abs(-0) is +0 — worth pinning because ROUND does NOT do
    // this (see the ROUND(-0.4) case below)
    expect(Object.is(value('ABS(-0)'), 0)).toBe(true)
  })

  it('reads an empty cell as 0 rather than failing', () => {
    expect(value('ABS([A])')).toBe(0) // [A] unset → null
    expect(value('ABS("")')).toBe(0)
  })

  it('refuses text and TRUE/FALSE, naming what it got', () => {
    expect(() => value('ABS("3")')).toThrow('Expected a number, got text "3"')
    expect(() => value('ABS(TRUE)')).toThrow('Expected a number, got TRUE')
  })

  it('truncates a long value in the message at 24 characters', () => {
    /* describeValue, functions.ts:33 — the message is shown verbatim
       in the formula editor, so an accidental 4 KB cell must not be
       pasted into it. 24 chars passes whole, 25 gets an ellipsis. */
    const at24 = 'x'.repeat(24)
    const at25 = 'x'.repeat(25)
    expect(() => value('ABS([A])', { A: at24 })).toThrow(`text "${at24}"`)
    expect(() => value('ABS([A])', { A: at25 })).toThrow(`text "${'x'.repeat(24)}…"`)
  })

  it('rejects a second argument at parse time', () => {
    expect(() => value('ABS(1, 2)')).toThrow('ABS expects 1 argument, got 2')
  })
})

describe('MIN / MAX', () => {
  it('picks the smallest and the largest', () => {
    expect(value('MIN(3, 1, 2)')).toBe(1)
    expect(value('MAX(3, 1, 2)')).toBe(3)
    expect(value('MIN(1)')).toBe(1)
    expect(value('MAX(-5)')).toBe(-5)
    expect(value('MIN(-3, -1)')).toBe(-3)
  })

  it('SURPRISE: an empty cell counts as 0, so it can win a MIN', () => {
    /* asNumber(null) = 0 (functions.ts:38) is right for SUM and wrong
       here: MIN([Price], [Cap]) with Cap unfilled returns 0, not the
       price — a $0 line on a quote with no error shown. Same in the
       other direction for MAX over negatives. Recorded, not fixed:
       the coercion is deliberate policy at functions.ts:16-26 and
       changing it is a decision about every builtin at once. */
    expect(value('MIN(1, [A])')).toBe(0)
    expect(value('MIN(1, "")')).toBe(0)
    expect(value('MAX(-5, [A])')).toBe(0)
  })

  it('SURPRISE: MIN(-0, 0) keeps the negative zero', () => {
    // Math.min(-0, 0) is -0. String(-0) is "0" so it usually hides;
    // Intl.NumberFormat renders it "-0". money() at money.ts:44-49
    // branches on `n < 0` (false for -0) and formats Math.abs, so the
    // money path is unaffected — read, not executed here.
    expect(Object.is(value('MIN(-0, 0)'), -0)).toBe(true)
    expect(Object.is(value('MAX(-0, 0)'), 0)).toBe(true)
  })

  it('refuses a non-number argument anywhere in the list', () => {
    expect(() => value('MIN(1, "a")')).toThrow('Expected a number, got text "a"')
    expect(() => value('MAX(1, TRUE)')).toThrow('Expected a number, got TRUE')
  })

  it('SURPRISE: the empty-call message says "at least 1 arguments"', () => {
    /* parser.ts:130-132 picks the plural from meta.maxArgs === 1, not
       from the count, so every open-ended builtin says 'arguments'
       after 'at least 1'. Cosmetic, user-facing, unfixed here — the
       text is asserted so a fix is a deliberate edit, not a silent
       one. */
    expect(() => value('MIN()')).toThrow('MIN expects at least 1 arguments, got 0')
    expect(() => value('MAX()')).toThrow('MAX expects at least 1 arguments, got 0')
  })
})

describe('SUM', () => {
  it('adds, left to right, without rounding', () => {
    expect(value('SUM(1, 2, 3)')).toBe(6)
    expect(value('SUM(1)')).toBe(1)
    expect(value('SUM(-1, 1)')).toBe(0)
    // binary doubles, unrounded on purpose: money.ts:24-26 says a
    // rounded intermediate is how two summations start to disagree
    expect(value('SUM(0.1, 0.2)')).toBe(0.30000000000000004)
  })

  it('skips over empty cells as zeros', () => {
    expect(value('SUM(1, [A], 2)')).toBe(3)
    expect(value('SUM([A])')).toBe(0)
  })

  it('refuses to overflow to Infinity mid-total', () => {
    // finite() at functions.ts:67 — the tokenizer has no exponent
    // literal (1e308 is a syntax error), so 10 ^ 308 is the route in
    expect(() => value('SUM(10 ^ 308, 10 ^ 308)')).toThrow(
      "Result of 'SUM' is not a valid number",
    )
  })

  it('refuses text', () => {
    expect(() => value('SUM(1, "a")')).toThrow('Expected a number, got text "a"')
    expect(() => value('SUM()')).toThrow('SUM expects at least 1 arguments, got 0')
  })
})

describe('ROUND — the places argument', () => {
  /* Half-away-from-zero and negative places are already covered in
     formula.test.ts:147-152. These are the edges it does not reach. */

  it('truncates a fractional places argument rather than rounding it', () => {
    expect(value('ROUND(2.5, 0.9)')).toBe(3) // 0.9 → 0 places, not 1
    expect(value('ROUND(1.24, 1.9)')).toBe(1.2)
  })

  it('clamps places to ±12 so 10^places stays exact', () => {
    expect(value('ROUND(1.5, 13)')).toBe(1.5) // clamped to 12, unchanged
    expect(value('ROUND(123, -13)')).toBe(0) // clamped to -12 → 0
    expect(value('ROUND(123, -3)')).toBe(0) // and -3 legitimately gives 0
  })

  it('SURPRISE: half-away-from-zero is applied to the binary double', () => {
    /* The comment at functions.ts:195 says "round half AWAY from zero
       (Excel-style)". That holds only when x * 10^places is exactly
       representable. Measured: 2.675 * 100 === 267.5 (rounds up, so
       2.68) but 1.005 * 100 === 100.49999999999999 (rounds down, so
       1). Two textbook halves, two different directions.

       How often: of the 399 values 1.005, 2.005 … 399.005, exactly
       ONE — 1.005 — rounds down. So this is a rare edge, not a
       systemic half-down bias, and the size of it is one cent.
       Recorded, not fixed; asserted so the direction cannot change
       under a rewrite without someone noticing. */
    expect(value('ROUND(2.675, 2)')).toBe(2.68)
    expect(value('ROUND(1.005, 2)')).toBe(1)
    expect(value('ROUND(8.045, 2)')).toBe(8.05)
  })

  it('SURPRISE: a small negative rounds to -0, not 0', () => {
    // sign is -1 for any x < 0, so (-1 * 0) / factor is -0
    expect(Object.is(value('ROUND(-0.4)'), -0)).toBe(true)
    expect(Object.is(value('ROUND(-0.004, 2)'), -0)).toBe(true)
    expect(Object.is(value('ROUND(0.4)'), 0)).toBe(true)
  })

  it('refuses to produce Infinity', () => {
    // 10^308 * 100 overflows inside ROUND before the divide
    expect(() => value('ROUND(10 ^ 308, 2)')).toThrow(
      "Result of 'ROUND' is not a valid number",
    )
  })

  it('reads an empty cell as 0', () => {
    expect(value('ROUND([A], 2)')).toBe(0)
  })
})

/* ============================================================
   Text
   ============================================================ */

describe('UPPER / LOWER', () => {
  it('changes case', () => {
    expect(value('UPPER("abc")')).toBe('ABC')
    expect(value('LOWER("ABC")')).toBe('abc')
    expect(value('UPPER("")')).toBe('')
    expect(value('LOWER("")')).toBe('')
    expect(value('UPPER([A])')).toBe('') // missing text = ''
  })

  it('uses the locale-independent mapping, which can change length', () => {
    // toUpperCase, not toLocaleUpperCase: ß → SS, so 6 chars become 7
    expect(value('UPPER("straße")')).toBe('STRASSE')
    expect(value('LEN(UPPER("straße"))')).toBe(7)
  })

  it('refuses a number or a boolean instead of stringifying it', () => {
    /* Excel's UPPER(1) is "1". Here it throws — the whole point of
       asText (functions.ts:46) is that "12" and 12 stay different
       things. CONCAT is the one function that stringifies. */
    expect(() => value('UPPER(1)')).toThrow('Expected text, got 1')
    expect(() => value('LOWER(TRUE)')).toThrow('Expected text, got TRUE')
  })

  it('takes exactly one argument', () => {
    expect(() => value('UPPER("a", "b")')).toThrow('UPPER expects 1 argument, got 2')
    expect(() => value('LOWER()')).toThrow('LOWER expects 1 argument, got 0')
  })
})

describe('LEN', () => {
  it('counts UTF-16 code units, not characters', () => {
    expect(value('LEN("abc")')).toBe(3)
    expect(value('LEN("")')).toBe(0)
    expect(value('LEN([A])')).toBe(0) // missing text = ''
    expect(value('LEN(" a ")')).toBe(3) // no trimming

    /* Two spellings of e-acute that look identical in a cell: composed is
       1, decomposed is 2. Names arriving from a CSV can be either, so
       LEN is not a safe basis for a width or a code-length rule. */
    expect(value('LEN([A])', { A: 'é' })).toBe(1) // composed
    expect(value('LEN([A])', { A: 'é' })).toBe(2) // e + combining acute
    // and anything outside the BMP counts twice
    expect(value('LEN([A])', { A: '\u{1F600}' })).toBe(2)
  })

  it('refuses a number', () => {
    expect(() => value('LEN(123)')).toThrow('Expected text, got 123')
  })
})

describe('CONCAT', () => {
  it('joins mixed values, spelling booleans TRUE / FALSE', () => {
    expect(value('CONCAT("a", 1, TRUE)')).toBe('a1TRUE')
    expect(value('CONCAT(FALSE)')).toBe('FALSE')
    expect(value('CONCAT("a")')).toBe('a')
    expect(value('CONCAT("a", [A], "b")')).toBe('ab') // missing = ''
  })

  it('writes a number exactly as JavaScript prints it', () => {
    /* stringify (functions.ts:60) is String(n) — no formatting, no
       rounding. A CONCAT of a computed price shows the full binary
       expansion, so money.ts is the only honest way to print one. */
    expect(value('CONCAT(0.1 + 0.2)')).toBe('0.30000000000000004')
    expect(value('CONCAT(1 / 3)')).toBe('0.3333333333333333')
    expect(value('CONCAT(-0)')).toBe('0') // String(-0) is "0"
  })

  it('SURPRISE: an image cell stringifies to "[object Object]"', () => {
    /* CellValue includes ImageRef[] (model.ts:120). stringify has no
       array branch, so String(array) runs and a photo column joined
       into text produces [object Object] with no error anywhere.
       Recorded, not fixed — the fix is a decision about what an image
       IS in text (filename? count? refusal?). */
    expect(value('CONCAT([A])', { A: IMAGE_CELL })).toBe('[object Object]')
  })

  it('SURPRISE: an image cell is described as text in error messages', () => {
    /* describeValue (functions.ts:29-35) has no array branch either,
       and `v.length` on an array is its ELEMENT count — so the 24-char
       truncation reads the wrong length and the message calls an
       image "text". */
    expect(() => value('ABS([A])', { A: IMAGE_CELL })).toThrow(
      'Expected a number, got text "[object Object]"',
    )
  })

  it('needs at least one argument', () => {
    expect(() => value('CONCAT()')).toThrow('CONCAT expects at least 1 arguments, got 0')
  })
})

/* ============================================================
   Logic — the CALL spelling, which formula.test.ts never used
   ============================================================ */

describe('NOT', () => {
  it('SURPRISE: NOT(x) parses as the prefix operator, never as a call', () => {
    /* parser.ts:164-167 handles the NOT identifier before it ever
       looks for '(', so `NOT(TRUE)` is unary-NOT applied to a
       parenthesised TRUE. Two consequences, both asserted below:
       FN_IMPLS.NOT (functions.ts:188) is unreachable from any source
       a user can type, and NOT's declared arity 1–1 is never
       enforced — the empty call reports a bare syntax error. */
    expect(compileFormula('NOT(TRUE)').ast.kind).toBe('unary')
    expect(compileFormula('ABS(1)').ast.kind).toBe('call')
    expect(() => value('NOT()')).toThrow("Unexpected token ')' at position 5")
  })

  it('inverts, whichever spelling is used', () => {
    expect(value('NOT(TRUE)')).toBe(false)
    expect(value('NOT(FALSE)')).toBe(true)
    expect(value('NOT TRUE')).toBe(false)
    expect(value('NOT [A]')).toBe(true) // missing boolean = FALSE
  })

  it('has a working implementation even though nothing can call it', () => {
    // guards the dead branch: if NOT ever becomes a real call the
    // behaviour is already pinned
    expect(FN_IMPLS.NOT([true])).toBe(false)
    expect(FN_IMPLS.NOT([false])).toBe(true)
    expect(FN_IMPLS.NOT([null])).toBe(true)
  })

  it('refuses a number', () => {
    expect(() => value('NOT(1)')).toThrow('Expected TRUE/FALSE, got 1')
    // '' is NOT the same as a missing cell here: null → FALSE, '' throws
    expect(() => value('NOT("")')).toThrow('Expected TRUE/FALSE, got an empty value')
  })
})

describe('AND / OR as calls', () => {
  it('answers the ordinary cases', () => {
    expect(value('AND(TRUE, TRUE)')).toBe(true)
    expect(value('AND(TRUE, FALSE)')).toBe(false)
    expect(value('AND(TRUE, TRUE, FALSE)')).toBe(false)
    expect(value('OR(FALSE, TRUE)')).toBe(true)
    expect(value('OR(FALSE, FALSE)')).toBe(false)
  })

  it('accepts a single argument and returns it', () => {
    expect(value('AND(TRUE)')).toBe(true)
    expect(value('AND(FALSE)')).toBe(false)
    expect(value('OR(TRUE)')).toBe(true)
    expect(value('OR(FALSE)')).toBe(false)
  })

  it('short-circuits, so a broken argument after the answer never runs', () => {
    // evaluate.ts:178-185 — the loop stops at the deciding value
    expect(value('AND(FALSE, 1 / 0)')).toBe(false)
    expect(value('OR(TRUE, 1 / 0)')).toBe(true)
    // and does NOT short-circuit past a broken argument before it
    expect(() => value('AND(1 / 0, FALSE)')).toThrow('Division by zero')
  })

  it('reads a missing cell as FALSE and refuses a number', () => {
    expect(value('AND([A], TRUE)')).toBe(false)
    expect(value('OR([A])')).toBe(false)
    expect(() => value('AND(1, TRUE)')).toThrow('Expected TRUE/FALSE, got 1')
  })
})

describe('IF', () => {
  it('returns the taken branch, whatever its type', () => {
    expect(value('IF(TRUE, 1, 2)')).toBe(1)
    expect(value('IF(FALSE, 1, "x")')).toBe('x')
    expect(value('IF(1 > 2, "a", "b")')).toBe('b')
  })

  it('treats a missing cell as FALSE but refuses empty TEXT', () => {
    /* The distinction is deliberate (functions.ts:19-25) and it is the
       one place the missing-cell policy is asymmetric: null is FALSE,
       '' is an error. Two cells that both look blank in the grid. */
    expect(value('IF([A], 1, 2)')).toBe(2)
    expect(() => value('IF("", 1, 2)')).toThrow('Expected TRUE/FALSE, got an empty value')
    expect(() => value('IF(1, 2, 3)')).toThrow('Expected TRUE/FALSE, got 1')
  })

  it('takes exactly three arguments', () => {
    expect(() => value('IF(TRUE, 1)')).toThrow('IF expects 3 arguments, got 2')
    expect(() => value('IF(TRUE, 1, 2, 3)')).toThrow('IF expects 3 arguments, got 4')
  })
})

/* ============================================================
   Dates
   ============================================================ */

describe('TODAY — the one builtin that reads the clock', () => {
  /* FINDING, stated so nobody mistakes the tests below for a guard:
     TODAY() returns whatever the machine's clock and time zone say
     (functions.ts:118-121 uses new Date() with the LOCAL getters).
     Every assertion about it therefore has to fake both, and no test
     of TODAY() can ever catch a regression in real time. Any formula
     column built on TODAY() recomputes to a different number on a
     different day, which is correct for an age column and wrong for a
     stored price. */

  it('formats the LOCAL calendar date, zero-padded', () => {
    // local noon, so the answer is the same date in every zone
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 15, 12, 0, 0))
    expect(value('TODAY()')).toBe('2024-03-15')

    vi.setSystemTime(new Date(2024, 0, 5, 12, 0, 0))
    expect(value('TODAY()')).toBe('2024-01-05') // single digits padded

    vi.setSystemTime(new Date(2024, 11, 31, 23, 59, 59))
    expect(value('TODAY()')).toBe('2024-12-31')

    vi.setSystemTime(new Date(2024, 1, 29, 12, 0, 0))
    expect(value('TODAY()')).toBe('2024-02-29') // leap day exists
  })

  it('changes when the clock changes — which is why it cannot be a guard', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2020, 5, 1, 12, 0, 0))
    const then = value('TODAY()')
    vi.setSystemTime(new Date(2030, 5, 1, 12, 0, 0))
    expect(value('TODAY()')).not.toBe(then)
    expect([then, value('TODAY()')]).toEqual(['2020-06-01', '2030-06-01'])
  })

  it('changes with the TIME ZONE at one instant, not just with the day', () => {
    /* 02:00 UTC on 15 March is still the 14th in New York and already
       the 15th in Kolkata. Two machines, one instant, two answers —
       so a TODAY()-derived column is not reproducible across a team.
       The zone is restored at the end and the restore is ASSERTED,
       because the TZ env var leaks to whatever else runs in this
       worker process. Measured on node v24.20.0: `delete
       process.env.TZ` does NOT put the old zone back (the offset
       stayed at New York's -300) and assigning `undefined` sets the
       string "undefined", which reads as UTC. Only assigning the
       resolved IANA name restores it — hence the two lines here. */
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const baselineOffset = new Date(2024, 0, 15).getTimezoneOffset()
    try {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-03-15T02:00:00Z'))

      nodeEnv.TZ = 'America/New_York'
      expect(value('TODAY()')).toBe('2024-03-14')

      nodeEnv.TZ = 'Asia/Kolkata'
      expect(value('TODAY()')).toBe('2024-03-15')
    } finally {
      nodeEnv.TZ = zone
    }
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(baselineOffset)
  })

  it('takes no arguments', () => {
    expect(() => value('TODAY(1)')).toThrow('TODAY expects 0 arguments, got 1')
  })

  it('agrees with todayIso(), the exported helper', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 6, 4, 12, 0, 0))
    expect(value('TODAY()')).toBe(todayIso())
  })
})

describe('YEAR / MONTH / DAY', () => {
  it('reads the three fields of an ISO date', () => {
    expect(value('YEAR("2024-03-15")')).toBe(2024)
    expect(value('MONTH("2024-03-15")')).toBe(3)
    expect(value('DAY("2024-03-15")')).toBe(15)
    expect(value('MONTH("2024-01-31")')).toBe(1)
    expect(value('DAY("2024-12-01")')).toBe(1)
  })

  it('accepts one-digit month and day, and surrounding whitespace', () => {
    expect(value('MONTH("2024-3-5")')).toBe(3)
    expect(value('DAY("2024-3-5")')).toBe(5)
    expect(value('YEAR("  2024-03-15  ")')).toBe(2024)
  })

  it('reads years 1–99 as themselves, not as 1901–1999', () => {
    /* The reason utcTime (functions.ts:90-94) exists instead of
       Date.UTC: Date.UTC(99, …) means 1999. This is the assertion
       that keeps that helper from being "simplified" away. */
    expect(value('YEAR("0099-05-05")')).toBe(99)
    expect(value('YEAR("0001-01-01")')).toBe(1)
    expect(value('DATEDIFF("0099-12-31", "0100-01-01")')).toBe(1)
  })

  it('rejects a day the calendar does not have', () => {
    expect(value('DAY("2024-02-29")')).toBe(29) // 2024 is a leap year
    expect(() => value('DAY("2023-02-29")')).toThrow(
      'DAY: "2023-02-29" is not a date (expected YYYY-MM-DD)',
    )
    expect(() => value('DAY("2024-02-30")')).toThrow('is not a date')
    expect(() => value('MONTH("2024-13-01")')).toThrow('is not a date')
    expect(() => value('DAY("2024-04-31")')).toThrow('is not a date')
  })

  it('names the function in the message, and empty separately from wrong', () => {
    expect(() => value('YEAR("")')).toThrow('YEAR needs a date, got an empty value')
    expect(() => value('MONTH([A])')).toThrow('MONTH needs a date, got an empty value')
    expect(() => value('YEAR("nope")')).toThrow(
      'YEAR: "nope" is not a date (expected YYYY-MM-DD)',
    )
    expect(() => value('YEAR("2024/03/15")')).toThrow('is not a date')
    expect(() => value('YEAR("24-03-15")')).toThrow('is not a date') // 2-digit year
    expect(() => value('YEAR("10000-01-01")')).toThrow('is not a date') // 5-digit year
    expect(() => value('YEAR(20240315)')).toThrow('Expected text, got 20240315')
  })

  it('SURPRISE: a trailing time is dropped, and its offset is not applied', () => {
    /* DATE_RE (functions.ts:78) matches YYYY-M-D then `(?:[T\s].*)?`
       — everything after the date is discarded, INCLUDING a UTC
       offset. 23:00 on the 15th at -05:00 is 04:00 on the 16th in
       UTC, but DAY says 15. Fine for the 'Z' timestamps this app
       stores (model createdAt); wrong for an offset timestamp pasted
       from elsewhere. Recorded, not fixed. */
    expect(value('YEAR("2024-03-15T10:30:00Z")')).toBe(2024)
    expect(value('DAY("2024-03-15 10:00")')).toBe(15)
    expect(value('DAY("2024-03-15T23:00:00-05:00")')).toBe(15)
  })

  it('does not read the clock or the time zone', () => {
    /* The complement of the TODAY finding: these four are pure
       functions of their argument, so THIS file's date assertions
       still hold in a year. Proven rather than asserted — the same
       expression under two system times ten years apart and two zones
       fourteen hours apart. */
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const baselineOffset = new Date(2024, 0, 15).getTimezoneOffset()
    const read = (): unknown => [
      value('YEAR("2024-03-15")'),
      value('MONTH("2024-03-15")'),
      value('DAY("2024-03-15")'),
      value('DATEDIFF("2024-03-01", "2024-04-01")'),
    ]
    const expected = [2024, 3, 15, 31]
    try {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(1999, 0, 1))
      nodeEnv.TZ = 'America/New_York'
      expect(read()).toEqual(expected)

      vi.setSystemTime(new Date(2050, 11, 31))
      nodeEnv.TZ = 'Pacific/Kiritimati' // UTC+14
      expect(read()).toEqual(expected)
    } finally {
      nodeEnv.TZ = zone
    }
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(baselineOffset)
  })
})

describe('DATEDIFF', () => {
  it('counts whole days from a to b, b − a', () => {
    expect(value('DATEDIFF("2024-01-01", "2024-01-31")')).toBe(30)
    expect(value('DATEDIFF("2024-01-01", "2024-01-01")')).toBe(0)
    expect(value('DATEDIFF("2024-01-01", "2024-01-02")')).toBe(1)
  })

  it('goes negative when b is earlier', () => {
    expect(value('DATEDIFF("2024-01-31", "2024-01-01")')).toBe(-30)
  })

  it('counts the leap day', () => {
    expect(value('DATEDIFF("2024-02-28", "2024-03-01")')).toBe(2) // 29 Feb exists
    expect(value('DATEDIFF("2023-02-28", "2023-03-01")')).toBe(1)
    expect(value('DATEDIFF("2024-01-01", "2025-01-01")')).toBe(366)
    expect(value('DATEDIFF("2023-01-01", "2024-01-01")')).toBe(365)
  })

  it('crosses a daylight-saving change without losing the hour', () => {
    /* Both endpoints are built at UTC midnight (utcTime), so the span
       is a whole number of 86,400,000 ms whatever the machine's zone
       does in March. NOTE, so this test is not over-read: Math.round
       at functions.ts:222 would also absorb a ±11h error, so this
       asserts the ANSWER, not the mechanism — the mechanism is what
       the years-1-99 test above pins. */
    expect(value('DATEDIFF("2024-03-01", "2024-04-01")')).toBe(31)
    expect(value('DATEDIFF("2024-10-01", "2024-11-01")')).toBe(31)
  })

  it('reports which end was not a date, and needs both', () => {
    expect(() => value('DATEDIFF("2024-01-01", "")')).toThrow(
      'DATEDIFF needs a date, got an empty value',
    )
    expect(() => value('DATEDIFF([A], "2024-01-01")')).toThrow(
      'DATEDIFF needs a date, got an empty value',
    )
    expect(() => value('DATEDIFF("2024-01-01", "nope")')).toThrow(
      'DATEDIFF: "nope" is not a date (expected YYYY-MM-DD)',
    )
    expect(() => value('DATEDIFF("2024-01-01")')).toThrow(
      'DATEDIFF expects 2 arguments, got 1',
    )
    expect(() => value('DATEDIFF("a", "b", "c")')).toThrow(
      'DATEDIFF expects 2 arguments, got 3',
    )
  })
})
