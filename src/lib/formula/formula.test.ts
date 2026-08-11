/* ============================================================
   The formula engine, tested where it can be wrong silently.

   A parser has no visible surface: a precedence mistake does not
   crash, it prints a different number. So the assertions here are
   about SHAPE (what binds to what, which way it associates) and
   about the errors a person actually types — not about coverage.

   Every fixture is synthetic on purpose: 'Table A', 'Column 1'.
   A test must never be mistakable for real catalogue data.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, FieldType, RowData } from '@/types/model'
import {
  compileFormula,
  evalExpr,
  evaluateRowValues,
  validateFormula,
  CYCLE_VALUE,
  ERROR_VALUE,
  type EvalContext,
} from './index'

/* -- synthetic fixtures ------------------------------------- */

const field = (id: string, name: string, type: FieldType, formula?: string): FieldDef => ({
  id,
  name,
  type,
  ...(formula !== undefined ? { formula } : {}),
})

const table = (fields: FieldDef[]): EntityDef => ({
  id: 'table-a',
  name: 'Table A',
  accent: 'blue',
  fields,
  position: { x: 0, y: 0 },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const row = (values: RowData['values']): RowData => ({
  id: 'row-1',
  entityId: 'table-a',
  values,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

/** No cross-entity lookups: nothing here references another table. */
const NO_LOOKUPS: EvalContext = {
  lookupRow: () => undefined,
  lookupEntity: () => undefined,
}

/** Evaluate a field-free expression through the public surface. */
const value = (src: string): unknown =>
  evalExpr(compileFormula(src).ast, {
    resolveField: (name) => {
      throw new Error(`this test has no field [${name}]`)
    },
  })

/* ============================================================ */

describe('parser — precedence and associativity', () => {
  it('multiplies before it adds', () => {
    expect(value('1 + 2 * 3')).toBe(7)
    expect(value('(1 + 2) * 3')).toBe(9)
  })

  it('subtracts left to right, so 10 - 3 - 2 is 5 and not 9', () => {
    expect(value('10 - 3 - 2')).toBe(5)
  })

  it('raises to a power right to left, so 2 ^ 3 ^ 2 is 512 and not 64', () => {
    expect(value('2 ^ 3 ^ 2')).toBe(512)
  })

  it('reads -2 ^ 2 as -(2 ^ 2), the maths convention, not (-2) ^ 2', () => {
    expect(value('-2 ^ 2')).toBe(-4)
  })

  it('binds unary minus tighter than multiplication: -2 * 3 is (-2) * 3', () => {
    expect(value('-2 * 3')).toBe(-6)
    expect(value('- -3')).toBe(3)
  })

  it('joins text looser than it adds, so 1 + 2 & 3 concatenates the sum', () => {
    expect(value('1 + 2 & 3')).toBe('33')
  })

  it('applies NOT to the whole comparison, so NOT 1 = 2 is TRUE', () => {
    expect(value('NOT 1 = 2')).toBe(true)
  })

  it('binds AND tighter than OR', () => {
    expect(value('TRUE AND FALSE OR TRUE')).toBe(true)
    expect(value('TRUE AND (FALSE OR TRUE)')).toBe(true)
    expect(value('FALSE AND FALSE OR FALSE')).toBe(false)
  })

  it('refuses chained comparisons rather than quietly picking a meaning', () => {
    expect(() => value('1 < 2 < 3')).toThrow(/cannot be chained/)
  })
})

describe('parser — the mistakes a person actually types', () => {
  it('names the missing bracket, not just "syntax error"', () => {
    expect(() => value('(1 + 2')).toThrow(/Missing '\)'/)
    expect(() => value('[Column 1')).toThrow(/Missing '\]'/)
    expect(() => value('"unclosed')).toThrow(/Unterminated text/)
    expect(() => value('[]')).toThrow(/Empty field reference/)
  })

  it('tells a bare word to become a field reference', () => {
    expect(() => value('Widget')).toThrow(/write \[Widget\]/)
  })

  it('tells a function typed without brackets what its call looks like', () => {
    expect(() => value('SUM')).toThrow(/SUM needs parentheses/)
  })

  it('rejects an unknown function and a wrong argument count', () => {
    expect(() => value('NOPE(1)')).toThrow(/Unknown function NOPE/)
    expect(() => value('ROUND(1, 2, 3)')).toThrow(/ROUND expects 1–2 arguments, got 3/)
    expect(() => value('ABS()')).toThrow(/ABS expects 1 argument, got 0/)
  })

  it('reports positions 1-based, so "position 1" is the first character typed', () => {
    expect(() => value('@')).toThrow(/position 1/)
  })
})

describe('evaluator — the arithmetic that has a right answer', () => {
  it('refuses division by zero instead of returning Infinity', () => {
    expect(() => value('1 / 0')).toThrow(/Division by zero/)
    expect(() => value('5 % 0')).toThrow(/Division by zero/)
  })

  it("refuses '+' on text so a silent string-concat can never look like a sum", () => {
    expect(() => value('"1" + 1')).toThrow(/use & to join text/)
    expect(value('"1" & 1')).toBe('11')
  })

  it('rounds half away from zero, so -2.5 goes to -3 and not to -2', () => {
    expect(value('ROUND(2.5)')).toBe(3)
    expect(value('ROUND(-2.5)')).toBe(-3) // JS Math.round alone gives -2
    expect(value('ROUND(1234.5678, 2)')).toBe(1234.57)
    expect(value('ROUND(1250, -2)')).toBe(1300) // negative places round to hundreds
  })

  it('short-circuits AND/OR so the untaken side never runs', () => {
    // the right-hand side would throw if it were evaluated
    expect(value('FALSE AND (1 / 0) = 1')).toBe(false)
    expect(value('TRUE OR (1 / 0) = 1')).toBe(true)
    expect(value('IF(TRUE, 1, 1 / 0)')).toBe(1)
  })

  it('compares text as text and numbers as numbers, and refuses to mix', () => {
    expect(value('"a" < "b"')).toBe(true)
    expect(value('2 < 10')).toBe(true)
    expect(() => value('TRUE < FALSE')).toThrow(/TRUE\/FALSE/)
  })
})

describe('validateFormula — against a real table', () => {
  const entity = table([
    field('f1', 'Column 1', 'number'),
    field('f2', 'Column 2', 'formula', '[Column 1] * 2'),
    field('f3', 'Column 3', 'formula', '[Column 2] + 1'),
  ])

  it('reports the field that does not exist, by name', () => {
    const r = validateFormula('[Column 9] + 1', entity)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Unknown field \[Column 9\]/)
  })

  it('accepts a valid formula and lists what it depends on, once, in order', () => {
    const r = validateFormula('[Column 1] + [column 1] + [Column 2]', entity)
    expect(r.ok).toBe(true)
    expect(r.dependsOn).toEqual(['Column 1', 'Column 2'])
  })

  it('stops a formula referencing its own column', () => {
    const r = validateFormula('[Column 2] + 1', entity, 'f2')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/cannot reference its own field/)
  })

  it('stops a cycle that only closes two hops away', () => {
    // f2 would read f3, and f3 already reads f2
    const r = validateFormula('[Column 3]', entity, 'f2')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Circular reference/)
  })
})

describe('evaluateRowValues — one row, end to end', () => {
  it('passes stored cells through and computes formulas in dependency order', () => {
    const entity = table([
      field('f1', 'Column 1', 'number'),
      field('f2', 'Column 2', 'formula', '[Column 3] + 1'),
      field('f3', 'Column 3', 'formula', '[Column 1] * 2'),
    ])
    const out = evaluateRowValues(entity, row({ f1: 4 }), NO_LOOKUPS)
    expect(out).toEqual({ f1: 4, f3: 8, f2: 9 })
  })

  it('treats an empty cell as zero rather than failing the whole row', () => {
    const entity = table([
      field('f1', 'Column 1', 'number'),
      field('f2', 'Column 2', 'formula', '[Column 1] + 1'),
    ])
    expect(evaluateRowValues(entity, row({}), NO_LOOKUPS).f2).toBe(1)
  })

  it('marks a broken cell #ERROR and never throws out of the row', () => {
    const entity = table([
      field('f1', 'Column 1', 'number'),
      field('f2', 'Column 2', 'formula', '[Column 1] / 0'),
      field('f3', 'Column 3', 'formula', '[Column 2] + 1'),
    ])
    const out = evaluateRowValues(entity, row({ f1: 1 }), NO_LOOKUPS)
    expect(out.f2).toBe(ERROR_VALUE)
    // a cell that merely LEANS on a broken cell is also an error
    expect(out.f3).toBe(ERROR_VALUE)
  })

  it('marks a column that merely reads a cycle #ERROR, not #CYCLE', () => {
    const entity = table([
      field('f1', 'Column 1', 'formula', '[Column 2]'),
      field('f2', 'Column 2', 'formula', '[Column 1]'),
      field('f3', 'Column 3', 'formula', '[Column 2]'), // reads it, is not in it
    ])
    const out = evaluateRowValues(entity, row({}), NO_LOOKUPS)
    expect(out.f1).toBe(CYCLE_VALUE)
    expect(out.f2).toBe(CYCLE_VALUE)
    expect(out.f3).toBe(ERROR_VALUE)
  })

  it('marks a cycle member #CYCLE even when the walk aborted before reaching it', () => {
    /* The walk enters Column 1, takes its FIRST operand into Column 2,
       hits the back-edge there and unwinds — Column 3 is a sibling
       operand it never traverses, yet Column 3 → Column 1 → Column 3
       is a cycle. Which sentinel it got used to depend on operand
       order; the static SCC pass in evaluate.ts is what fixes that,
       and this is the case that proves the pass is still running. */
    const entity = table([
      field('f1', 'Column 1', 'formula', '[Column 2] + [Column 3]'),
      field('f2', 'Column 2', 'formula', '[Column 1]'),
      field('f3', 'Column 3', 'formula', '[Column 1]'),
    ])
    const out = evaluateRowValues(entity, row({}), NO_LOOKUPS)
    expect(out).toEqual({ f1: CYCLE_VALUE, f2: CYCLE_VALUE, f3: CYCLE_VALUE })
  })

  it('returns a value for every column, even one whose formula will not parse', () => {
    const entity = table([
      field('f1', 'Column 1', 'formula', '1 +'),
      field('f2', 'Column 2', 'text'),
    ])
    const out = evaluateRowValues(entity, row({ f2: 'kept' }), NO_LOOKUPS)
    expect(out.f1).toBe(ERROR_VALUE)
    expect(out.f2).toBe('kept')
  })
})
