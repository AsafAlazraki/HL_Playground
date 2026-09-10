/* ============================================================
   A CACHED SPREADSHEET ERROR IS NOT A VALUE.

   CONFIG_FINDINGS §4 Adopt 9 — "Quarantine, don't coerce: any value
   starting with `#` is rejected; cached `#N/A`/`#VALUE!` cells are
   reported, never imported as prices."

   Half of it already held. `#N/A` is not a number, so a price column
   refused it and always had. The hole was the TEXT column, where it
   sailed through as the literal string — and then it is on a
   catalogue face in front of a customer, it sorts, it exports, and
   somebody eventually types a price beside it believing the row is
   real.

   WHAT IS ASSERTED IS THE DECISIONS, and there are three:

     · the error tokens are refused whatever the column's type,
       because a cached error is not a value of any type
     · a hash that is NOT one of them is data and stays. "#1 Best
       Seller" is a real product name and Adopt 9's literal wording —
       "any value starting with #" — would have eaten it
     · the READING AND THE ACT AGREE. `exceptionsFor` returned early
       on text because nothing could fail to be text; something can
       now, and a reading promising "0 cells will be empty" over a
       create that empties forty is the count disagreeing with the
       act
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { FieldDef } from '@/types/model'
import { coerceCellText } from './coerce'

const text: FieldDef = { id: 'f-name', name: 'Model', type: 'text' }
const number: FieldDef = { id: 'f-price', name: 'Sell price', type: 'number' }
const select: FieldDef = { id: 'f-kind', name: 'Kind', type: 'select', options: ['Sport'] }

const ERRORS = [
  '#N/A',
  '#VALUE!',
  '#REF!',
  '#DIV/0!',
  '#NAME?',
  '#NULL!',
  '#NUM!',
  '#SPILL!',
  '#CALC!',
  '#GETTING_DATA',
]

/* ---------------------------------------------------------- */

describe('the tokens a workbook writes when a formula cannot resolve', () => {
  it('ARE REFUSED ON A TEXT COLUMN — the hole this closes', () => {
    for (const token of ERRORS) {
      const got = coerceCellText(token, text)
      expect(got.ok, token).toBe(false)
    }
  })

  it('are refused on a price column, as they always were', () => {
    expect(coerceCellText('#N/A', number).ok).toBe(false)
  })

  it('are refused on a list column rather than becoming an option', () => {
    expect(coerceCellText('#REF!', select).ok).toBe(false)
  })

  it('say what the thing IS and where the fix is, not "invalid"', () => {
    const got = coerceCellText('#VALUE!', text)
    expect(got.ok).toBe(false)
    if (got.ok) return
    expect(got.reason).toContain('spreadsheet error')
    expect(got.reason).toContain('could not resolve')
    expect(got.reason).toContain('Fix it at the source')
  })

  it('are matched however the workbook cased them, and through padding', () => {
    expect(coerceCellText('  #n/a  ', text).ok).toBe(false)
    expect(coerceCellText('#Div/0!', text).ok).toBe(false)
  })
})

describe('a hash that is not one of them is somebody’s data', () => {
  it('KEEPS "#1 Best Seller" — Adopt 9 taken literally would have eaten it', () => {
    /* "Any value starting with #" is another codebase's wording. A
       dealer's own "#4 rigging kit" is not ambiguous the way
       `#DIV/0!` is, so the list is the tokens and not the character. */
    for (const real of ['#1 Best Seller', '#4 rigging kit', '#hashtag', '#']) {
      expect(coerceCellText(real, text)).toEqual({ ok: true, value: real })
    }
  })

  it('keeps a hash in a number column exactly as unparseable as it was', () => {
    const got = coerceCellText('#4', number)
    expect(got.ok).toBe(false)
    if (got.ok) return
    /* the ordinary refusal, not the quarantine one */
    expect(got.reason).toContain('is not a number')
  })
})

describe('an empty cell is still an empty cell', () => {
  it('clears rather than refusing, which is what every caller relies on', () => {
    expect(coerceCellText('   ', text)).toEqual({ ok: true, value: null })
  })
})
