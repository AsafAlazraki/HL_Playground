/* ============================================================
   THE NAME COLUMN'S WIDTH, AND THE FLOOR FIT WORKS TO.

   Both of these were live defects on the register — the surface a
   salesperson lives in — and both were fixed by changing a number that
   nothing was pinning. So they are pinned here.

     1. THE PINNED NAME COLUMN WAS A FIXED 184px. 26 of Stacer's 26
        names were clipped, and the list at 1920 was byte-identical to
        the list at 1280 because a type default cannot see the window.
        `nameColumnWidth` is what replaced it: measured from the data,
        capped at a share of the window, floored at what it had.
     2. FIT COLUMNS WORKED TO A PRIVATE 28px FLOOR — below
        DESIGN_CONTRACT's 116px, and below `.tb-cell`'s own CSS floor,
        so the maths and the paint disagreed and the band header drew
        39px bands over 116px columns. One press took the count of
        clipped values from 26 to 119.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { nameColumnWidth, widestOf, CELL_TEXT_INSET, NAME_MAX_SHARE } from './nameColumnWidth'
import { fitColumns } from './sections'
import { DEFAULT_COL_W, FIT_MIN_COL_W, MAX_COL_W, GUTTER_W, ADD_COL_W } from './helpers'
import type { FieldDef } from '@/types/model'
import type { ColumnSlot } from './sections'

/* a stand-in for the canvas: 7px a character, so a length is a width */
const flat = (s: string): number => s.length * 7

describe('widestOf', () => {
  it('is 0 for nothing to measure', () => {
    expect(widestOf([], flat)).toBe(0)
    expect(widestOf(['', '', ''], flat)).toBe(0)
  })

  it('finds the widest string', () => {
    expect(widestOf(['ab', 'abcd', 'abc'], flat)).toBe(28)
  })

  /* the probe is the whole reason this is cheap: 11,116 rows must not
     cost 11,116 canvas measurements */
  it('only measures the longest few, and still finds the widest', () => {
    const values = [...Array(500).keys()].map((i) => 'x'.repeat((i % 20) + 1))
    values.push('y'.repeat(60))
    let calls = 0
    const counted = (s: string): number => {
      calls += 1
      return flat(s)
    }
    expect(widestOf(values, counted, 24)).toBe(60 * 7)
    expect(calls).toBeLessThanOrEqual(24)
  })
})

describe('nameColumnWidth', () => {
  it('never goes below the type default, so no register loses room', () => {
    expect(nameColumnWidth(20, 1280)).toBe(DEFAULT_COL_W.text)
    expect(nameColumnWidth(0, 1280)).toBe(DEFAULT_COL_W.text)
  })

  /* Stacer's worst, measured live: "Stacer - 499 Sea Ranger SDF (Centre
     Console)" wants 277px of 12.5px Inter and had 159px of box */
  it('gives a real name the room it needs', () => {
    expect(nameColumnWidth(277, 1280)).toBe(277 + CELL_TEXT_INSET)
  })

  /* THE FAULT, IN ONE ASSERTION: the old fixed width made these equal */
  it('grows with the window', () => {
    const long = 900
    expect(nameColumnWidth(long, 1920)).toBeGreaterThan(nameColumnWidth(long, 1280))
  })

  it('never freezes more than its share of the window', () => {
    expect(nameColumnWidth(900, 1280)).toBe(Math.round(1280 * NAME_MAX_SHARE))
    /* and never more than a column may ever be */
    expect(nameColumnWidth(4000, 4000)).toBe(MAX_COL_W)
  })

  it('is at the default on a card too small to share', () => {
    expect(nameColumnWidth(900, 400)).toBe(DEFAULT_COL_W.text)
  })
})

/* ---------------------------------------------------------- */

const field = (id: string): FieldDef => ({ id, name: id, type: 'text' })
const slotsOf = (...ids: string[]): ColumnSlot[] =>
  ids.map((id, col) => ({ kind: 'field', field: field(id), col }))

describe('fitColumns', () => {
  it('shares the window out when the columns fit above the floor', () => {
    const slots = slotsOf('a', 'b')
    const room = 1000
    const r = fitColumns(slots, {}, room + GUTTER_W + ADD_COL_W)
    expect(r.fitsWindow).toBe(true)
    expect(r.widths['a']! + r.widths['b']!).toBe(room)
    expect(r.onScreen).toBe(2)
  })

  /* THE REGRESSION THIS EXISTS TO CATCH. Twenty-six columns in 1280px
     is 44px each; the old floor was 28 and let it happen. */
  it('never goes below the contract floor', () => {
    const ids = [...Array(26).keys()].map((i) => `c${i}`)
    const r = fitColumns(slotsOf(...ids), {}, 1280)
    for (const id of ids) expect(r.widths[id]).toBe(FIT_MIN_COL_W)
    expect(FIT_MIN_COL_W).toBe(116)
  })

  it('says so when the floor bound rather than the window', () => {
    const ids = [...Array(26).keys()].map((i) => `c${i}`)
    const r = fitColumns(slotsOf(...ids), {}, 1280)
    expect(r.fitsWindow).toBe(false)
    expect(r.shared).toBe(26)
    /* as many as can be read, which is the honest promise */
    expect(r.onScreen).toBeGreaterThan(0)
    expect(r.onScreen).toBeLessThan(26)
    expect(r.onScreen).toBe(Math.floor((1280 - GUTTER_W - ADD_COL_W) / FIT_MIN_COL_W))
  })

  /* the note above `fitColumns` promised this in words for a year while
     the code exempted only a system column, of which the register draws
     none */
  it('leaves the frozen name column alone', () => {
    const slots = slotsOf('name', 'a', 'b')
    const r = fitColumns(slots, { name: 305 }, 1280, 'name')
    expect(r.widths['name']).toBeUndefined()
    expect(r.shared).toBe(2)
    /* and it counts the pin as fixed, so the share is what is left */
    expect(r.widths['a']! + r.widths['b']!).toBe(1280 - GUTTER_W - ADD_COL_W - 305)
  })
})
