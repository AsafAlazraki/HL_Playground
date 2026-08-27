/* ============================================================
   THE HIT TEST, WHICH IS THE ONE PART OF A DRAG THAT CAN BE
   WRONG IN A WAY NOBODY NOTICES.

   A drag that answers the wrong slot does not throw, does not
   fail a typecheck and does not look broken in a screenshot —
   it just puts the card somewhere else, occasionally, and the
   person blames themselves. So the arithmetic is separated from
   the DOM and checked here.

   The grid modelled below is the real one: three columns, two
   rows, a gutter between the cards, and a margin outside them.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { previewOrder, slotAt, type Rect } from './reorder'

/** three across, two down — 300 wide, 200 tall, 20 of gutter,
 *  starting 40 from the left of the viewport and 100 down */
const GRID: Rect[] = Array.from({ length: 6 }, (_, i) => {
  const col = i % 3
  const row = Math.floor(i / 3)
  const left = 40 + col * 320
  const top = 100 + row * 220
  return { left, top, right: left + 300, bottom: top + 200 }
})

describe('which slot the pointer is over', () => {
  it('answers the one it is inside', () => {
    expect(slotAt(GRID, 100, 150)).toBe(0)
    expect(slotAt(GRID, 700, 150)).toBe(2)
    expect(slotAt(GRID, 100, 350)).toBe(3)
    expect(slotAt(GRID, 690, 500)).toBe(5)
  })

  it('answers on the very edge of a card rather than falling through it', () => {
    expect(slotAt(GRID, 40, 100)).toBe(0)
    expect(slotAt(GRID, 340, 300)).toBe(0)
  })

  it('IN THE GUTTER IT ANSWERS THE NEAREST, because a grid is mostly gutter', () => {
    /* x=350 sits in the 20px gap between card 0 (ends 340) and
       card 1 (starts 360) — nearer to 1 by ten pixels */
    expect(slotAt(GRID, 355, 200)).toBe(1)
    expect(slotAt(GRID, 345, 200)).toBe(0)
  })

  it('outside the grid entirely it still answers, so a drag never goes dead', () => {
    expect(slotAt(GRID, 0, 0)).toBe(0)
    expect(slotAt(GRID, 5000, 5000)).toBe(5)
    expect(slotAt(GRID, 0, 5000)).toBe(3)
  })

  it('answers -1 only when there is genuinely nothing to answer', () => {
    expect(slotAt([], 100, 100)).toBe(-1)
  })
})

describe('what is drawn while a drag is in flight', () => {
  it('is the identity when nothing is held', () => {
    expect(previewOrder(4, -1, -1)).toEqual([0, 1, 2, 3])
    expect(previewOrder(4, 2, -1)).toEqual([0, 1, 2, 3])
  })

  it('puts the held card in the slot the pointer is over', () => {
    expect(previewOrder(4, 0, 2)).toEqual([1, 2, 0, 3])
    expect(previewOrder(4, 3, 0)).toEqual([3, 0, 1, 2])
  })

  it('is the identity while the pointer is still over the card it grabbed', () => {
    expect(previewOrder(4, 1, 1)).toEqual([0, 1, 2, 3])
  })

  it('never draws a card twice and never drops one', () => {
    for (let from = 0; from < 6; from += 1) {
      for (let to = 0; to < 6; to += 1) {
        const order = previewOrder(6, from, to)
        expect(new Set(order).size).toBe(6)
        expect(order[to]).toBe(from)
      }
    }
  })
})
