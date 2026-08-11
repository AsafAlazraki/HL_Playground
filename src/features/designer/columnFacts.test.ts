/* ============================================================
   What the column setup is allowed to say about a column's data,
   and what a retype is allowed to carry across.

   Fixtures are obviously synthetic — "Table A", "Column 1". The one
   thing under test that is drawn from life is the SHAPE of the
   failure: a column of counts typed as text because one cell reads
   "3 + 1". That value stands in as the thing conversion must refuse,
   and refusing it is the whole point of `convertCell`.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { FieldDef, RowData } from '@/types/model'
import {
  cellText,
  columnFacts,
  convertCell,
  draftColumnName,
  isFilled,
  retypePlan,
} from './columnFacts'

const row = (id: string, values: RowData['values']): RowData => ({
  id,
  entityId: 'e1',
  values,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const textField: FieldDef = { id: 'f1', name: 'Column 1', type: 'text' }

/* ---------------------------------------------------------- */

describe('isFilled', () => {
  it('an empty string is not a value someone put there', () => {
    expect(isFilled('')).toBe(false)
    expect(isFilled(null)).toBe(false)
    expect(isFilled(undefined)).toBe(false)
  })

  /* zero and false ARE values; a count that skipped them would tell
     someone a column is emptier than it is, right before wiping it */
  it('counts zero and false, which are values', () => {
    expect(isFilled(0)).toBe(true)
    expect(isFilled(false)).toBe(true)
  })

  it('an empty picture list is not a picture', () => {
    expect(isFilled([])).toBe(false)
    expect(isFilled([{ id: 'i1', src: 'https://example.invalid/a.jpg' }])).toBe(true)
  })
})

describe('cellText', () => {
  it('says Yes and No, because that is what the sheet shows', () => {
    expect(cellText(true)).toBe('Yes')
    expect(cellText(false)).toBe('No')
  })

  /* never a URL and never a base64 blob — a picture cell's evidence
     is how many there are */
  it('counts pictures rather than printing an address', () => {
    expect(cellText([{ id: 'i1', src: 'https://example.invalid/a.jpg' }])).toBe('1 picture')
    expect(
      cellText([{ id: 'i1', src: 'https://example.invalid/a.jpg' }, { id: 'i2', src: 'https://example.invalid/b.jpg' }]),
    ).toBe('2 pictures')
  })
})

/* ---------------------------------------------------------- */

describe('columnFacts', () => {
  const rows = [
    row('r1', { f1: '2' }),
    row('r2', { f1: '3 + 1' }),
    row('r3', { f1: '2' }),
    row('r4', {}),
    row('r5', { f1: '4' }),
  ]

  it('separates rows that hold a value from rows that exist', () => {
    const f = columnFacts(rows, 'f1')
    expect(f.rows).toBe(5)
    expect(f.filled).toBe(4)
  })

  /* "33 of 40 rows" and "5 distinct" are different questions, and
     the dialog that said 40 when 33 held a value was answering
     neither */
  it('counts distinct values, not filled cells', () => {
    expect(columnFacts(rows, 'f1').distinct).toBe(3)
  })

  it('shows the values in the order the rows carry them, without repeats', () => {
    expect(columnFacts(rows, 'f1').samples).toEqual(['2', '3 + 1', '4'])
  })

  it('caps what it shows without capping what it counts', () => {
    const f = columnFacts(rows, 'f1', 2)
    expect(f.samples).toEqual(['2', '3 + 1'])
    expect(f.distinct).toBe(3)
  })

  it('a table with no rows is not a table with empty ones', () => {
    expect(columnFacts(undefined, 'f1')).toEqual({
      rows: 0,
      filled: 0,
      distinct: 0,
      samples: [],
    })
  })
})

/* ---------------------------------------------------------- */

describe('convertCell', () => {
  it('carries a plain number across from text', () => {
    expect(convertCell('4', 'number')).toBe(4)
    expect(convertCell(' 4.5 ', 'number')).toBe(4.5)
    expect(convertCell('-2', 'number')).toBe(-2)
  })

  /* the case the whole feature exists for */
  it('refuses text that is not plainly a number', () => {
    expect(convertCell('3 + 1', 'number')).toBeUndefined()
  })

  /* GUESSING IS THE APP DECIDING WHAT A BUSINESS'S DATA MEANS. Is
     "12,500" twelve thousand five hundred, or twelve point five in a
     comma-decimal locale? We do not know, so we do not say. */
  it('never strips a currency mark or a separator to make a number', () => {
    expect(convertCell('$400', 'number')).toBeUndefined()
    expect(convertCell('12,500', 'number')).toBeUndefined()
    expect(convertCell('4 kg', 'number')).toBeUndefined()
  })

  /* Number('') and Number('  ') are both 0 — a blank that became a
     zero would read as a price somebody set */
  it('never turns a blank into a zero', () => {
    expect(convertCell('', 'number')).toBeUndefined()
    expect(convertCell('   ', 'number')).toBeUndefined()
  })

  it('refuses infinity, which is not a quantity anyone typed', () => {
    expect(convertCell('Infinity', 'number')).toBeUndefined()
  })

  it('writes anything as text, because everything can be read', () => {
    expect(convertCell(4, 'text')).toBe('4')
    expect(convertCell(true, 'text')).toBe('Yes')
    expect(convertCell(false, 'text')).toBe('No')
  })

  it('takes only a calendar day as a date', () => {
    expect(convertCell('2024-03-01', 'date')).toBe('2024-03-01')
    expect(convertCell('1 March 2024', 'date')).toBeUndefined()
    expect(convertCell('2024-3-1', 'date')).toBeUndefined()
  })

  /* these three hold a source, an address and a row id — none of
     which a value in another column can supply */
  it('carries nothing into a calculation, a picture or a link', () => {
    expect(convertCell('4', 'formula')).toBeUndefined()
    expect(convertCell('4', 'image')).toBeUndefined()
    expect(convertCell('4', 'reference')).toBeUndefined()
  })

  /* a fresh list has no choices on it, so every value would be one
     the list refuses */
  it('carries nothing into a choice list', () => {
    expect(convertCell('4', 'select')).toBeUndefined()
  })

  it('carries no picture anywhere', () => {
    expect(convertCell([{ id: 'i1', src: 'https://example.invalid/a.jpg' }], 'text')).toBeUndefined()
  })
})

/* ---------------------------------------------------------- */

describe('retypePlan', () => {
  const rows = [
    row('r1', { f1: '2' }),
    row('r2', { f1: '3 + 1' }),
    row('r3', { f1: '4' }),
    row('r4', {}),
  ]

  it('splits the column into what crosses and what cannot', () => {
    const p = retypePlan(rows, textField, 'number')
    expect(p.filled).toBe(3)
    expect(p.carried).toEqual([
      { rowId: 'r1', value: 2 },
      { rowId: 'r3', value: 4 },
    ])
    expect(p.lost).toBe(1)
    expect(p.lostSamples).toEqual(['3 + 1'])
  })

  it('an empty column loses nothing and carries nothing', () => {
    const p = retypePlan([row('r1', {})], textField, 'number')
    expect(p).toEqual({ filled: 0, carried: [], lostSamples: [], lost: 0 })
  })

  it('names each lost value once, however many rows hold it', () => {
    const p = retypePlan(
      [row('r1', { f1: 'x' }), row('r2', { f1: 'x' }), row('r3', { f1: 'y' })],
      textField,
      'number',
    )
    expect(p.lost).toBe(3)
    expect(p.lostSamples).toEqual(['x', 'y'])
  })

  it('into text, every value crosses', () => {
    const p = retypePlan(rows, textField, 'text')
    expect(p.lost).toBe(0)
    expect(p.carried).toHaveLength(3)
  })
})

/* ---------------------------------------------------------- */

describe('draftColumnName', () => {
  /* the store falls back to `Field N`, which is the one word this
     surface exists not to say */
  it('says column, never field', () => {
    expect(draftColumnName([])).toBe('Column 1')
    expect(draftColumnName(['A', 'B'])).toBe('Column 3')
  })

  /* the name guard refuses a duplicate, so an offer it would refuse
     is an offer that leaves the row unnameable until it is retyped */
  it('never offers a name a sibling already holds', () => {
    expect(draftColumnName(['A', 'Column 2'])).toBe('Column 3')
    expect(draftColumnName(['column 1'])).toBe('Column 2')
  })
})
