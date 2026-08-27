/* ============================================================
   A NUMERIC BAND ON A COLUMN — the third filter kind, and the
   reading it does.

   WHY THIS IS NOT COVERED BY `contains`. A price column's display
   text is `$20,900`, so a text match on it matches the DIGITS of a
   formatted string: `2` finds 2,770 and 20,900 and 12,000 and means
   nothing at all. A band has to be read off the value.

   AND WHY THE READING IS LENIENT. The business writes `4 HP` into a
   column it also fills with bare numbers — Highfield's Min HP is
   text and Stacer's is a number, and they are the same fact about
   the same kind of thing. Reading the number somebody wrote is
   reading. Substituting one they did not write is inventing, and
   the cases below fix the line between the two.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { FieldDef } from '@/types/model'
import { applyView, leadingNumber, type ViewRow } from './core'

const field = (id: string, type: FieldDef['type'] = 'number'): FieldDef => ({
  id,
  name: id,
  type,
})

const fields = [field('price'), field('hp', 'text')]

const rows: ViewRow[] = [
  { rowId: 'a', values: { price: 2770, hp: '4 HP' }, text: { price: '$2,770', hp: '4 HP' } },
  { rowId: 'b', values: { price: 20900, hp: '60 HP' }, text: { price: '$20,900', hp: '60 HP' } },
  { rowId: 'c', values: { price: 198610, hp: '450 HP' }, text: { price: '$198,610', hp: '450 HP' } },
  { rowId: 'd', values: { price: null, hp: '' }, text: { price: '', hp: '' } },
  { rowId: 'e', values: { price: 5000, hp: 'Electric' }, text: { price: '$5,000', hp: 'Electric' } },
]

const ids = (out: ViewRow[]): string[] => out.map((r) => r.rowId)

describe('leadingNumber', () => {
  it('reads a number, a numeric string and a number with the unit typed in', () => {
    expect(leadingNumber(2770)).toBe(2770)
    expect(leadingNumber('2770')).toBe(2770)
    expect(leadingNumber('4 HP')).toBe(4)
    expect(leadingNumber('105 ltr')).toBe(105)
    expect(leadingNumber('$20,900')).toBe(20900)
    expect(leadingNumber('5.66')).toBe(5.66)
  })

  it('refuses a sentence, because reading 4.5 out of one would be inventing', () => {
    expect(leadingNumber('Up to and inc 4.5m')).toBeNull()
    expect(leadingNumber('Electric')).toBeNull()
    expect(leadingNumber('External Tank')).toBeNull()
    expect(leadingNumber(null)).toBeNull()
    expect(leadingNumber('')).toBeNull()
  })

  it('reads a thousands comma as a separator and never as a decimal point', () => {
    /* `2,770` must not come back as 2.77 — the mistake that would put
       every boat in the file under $3 */
    expect(leadingNumber('2,770')).toBe(2770)
    expect(leadingNumber('1,456,990')).toBe(1456990)
  })

  it('reads a twin rig by its leading figure', () => {
    /* `2 x 300 HP` is two three-hundreds and its leading number is 2.
       Stripping every non-digit instead gives 2,300, which is not a
       horsepower anybody sells. */
    expect(leadingNumber('2 x 300 HP')).toBe(2)
  })
})

describe('the between filter', () => {
  it('keeps what is inside both bounds', () => {
    const out = applyView(rows, fields, {
      filters: [{ kind: 'between', fieldId: 'price', min: 3000, max: 30000 }],
    })
    expect(ids(out)).toEqual(['b', 'e'])
  })

  it('is open-ended when one bound is left out', () => {
    expect(
      ids(applyView(rows, fields, { filters: [{ kind: 'between', fieldId: 'price', min: 20000 }] })),
    ).toEqual(['b', 'c'])
    expect(
      ids(applyView(rows, fields, { filters: [{ kind: 'between', fieldId: 'price', max: 5000 }] })),
    ).toEqual(['a', 'e'])
  })

  it('narrows nothing when neither bound is set', () => {
    const out = applyView(rows, fields, { filters: [{ kind: 'between', fieldId: 'price' }] })
    expect(ids(out)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('drops a row with no number in that column, rather than guessing one', () => {
    const out = applyView(rows, fields, {
      filters: [{ kind: 'between', fieldId: 'price', min: 0 }],
    })
    expect(ids(out)).not.toContain('d')
  })

  it('reads a bound out of a column the business typed the unit into', () => {
    const out = applyView(rows, fields, {
      filters: [{ kind: 'between', fieldId: 'hp', min: 50, max: 100 }],
    })
    expect(ids(out)).toEqual(['b'])
  })

  it('leaves a row whose cell is a word out of a numeric band', () => {
    const out = applyView(rows, fields, {
      filters: [{ kind: 'between', fieldId: 'hp', min: 0 }],
    })
    expect(ids(out)).not.toContain('e')
  })

  it('is ignored on a column this table does not have', () => {
    const out = applyView(rows, fields, {
      filters: [{ kind: 'between', fieldId: 'nope', min: 1, max: 2 }],
    })
    expect(ids(out)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('composes with a values filter and with search', () => {
    const out = applyView(rows, fields, {
      filters: [
        { kind: 'between', fieldId: 'price', min: 1000 },
        { kind: 'values', fieldId: 'hp', selected: ['4 HP', '60 HP'] },
      ],
      search: 'HP',
    })
    expect(ids(out)).toEqual(['a', 'b'])
  })
})

describe('an envelope, as two bands on two real columns', () => {
  const envFields = [field('min', 'text'), field('max', 'text')]
  const hulls: ViewRow[] = [
    { rowId: 'sp560', values: { min: '90 HP', max: '150 HP' }, text: { min: '90 HP', max: '150 HP' } },
    { rowId: 'ru230', values: { min: '4 HP', max: '6 HP' }, text: { min: '4 HP', max: '6 HP' } },
    { rowId: 'pa600', values: { min: '60 HP', max: '115 HP' }, text: { min: '60 HP', max: '115 HP' } },
  ]

  it('offers only the hulls rated for the motor being fitted', () => {
    const out = applyView(hulls, envFields, {
      filters: [
        { kind: 'between', fieldId: 'min', max: 115 },
        { kind: 'between', fieldId: 'max', min: 115 },
      ],
    })
    expect(ids(out)).toEqual(['sp560', 'pa600'])
  })

  it('offers a hull at both ends of its own envelope', () => {
    for (const hp of [90, 150]) {
      const out = applyView(hulls, envFields, {
        filters: [
          { kind: 'between', fieldId: 'min', max: hp },
          { kind: 'between', fieldId: 'max', min: hp },
        ],
      })
      expect(ids(out), `${hp} hp`).toContain('sp560')
    }
  })
})
