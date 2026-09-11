/* ============================================================
   ONE MATCHER, AND THE SENTENCE FOR WHEN IT FINDS NOTHING.

   `matches` itself is exercised beside the board that wrote it
   (`pipeline/pipeline.test.ts`) and is not tested twice here. What
   is pinned is the thing a second pair of eyes would undo: that the
   board and the list are calling the SAME function. Two search boxes
   on one stage quietly disagreeing about whether a query hits is the
   fault the move was made to prevent, and it would be invisible —
   both boxes would look like they worked.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { matches as fromBoard } from '@/features/pipeline/finding'
import { FIND_FIELD_AT, NOTHING_FOUND, matches } from './find'

describe('the board and the list find the same things', () => {
  it('IS ONE FUNCTION, not two that agree today', () => {
    expect(fromBoard).toBe(matches)
  })
})

describe('what a find that holds nothing says', () => {
  it('quotes the string back, trimmed, so a typo is visible without looking up', () => {
    const say = NOTHING_FOUND('  Hargraves ')
    expect(say).toContain('“Hargraves”')
  })

  /* THE COMMONEST CAUSE OF AN EMPTY FIND HERE is somebody typing a
     MOTOR — a thing a quote contains and is not findable by — so the
     sentence names what WAS searched rather than only reporting the
     miss. */
  it('names every fact that was searched', () => {
    const say = NOTHING_FOUND('yamaha')
    for (const fact of ['reference', 'customer', 'boat', 'prepared']) {
      expect(say).toContain(fact)
    }
  })

  it('says nothing about what it did not search', () => {
    expect(matches(
      {
        reference: 'NSM-0001',
        customer: { name: 'Bell' },
        subjectLabel: 'Stacer 449',
        lines: [{ label: 'Yamaha F70' }],
      } as never,
      'yamaha',
    )).toBe(false)
  })
})

describe('the threshold the field is drawn at', () => {
  /* Driven at 1440x900 (`tools/teardown/diarysize.mjs`): a row is
     90px, the gap 12px and the scrollport 761px, so 7.46 rows are on
     screen and seven fit whole. The number may move when the row
     does; what must not move is that it is measured rather than
     round. */
  it('is the first count at which the scrollport hides a row', () => {
    expect(Math.floor(761 / (90 + 12))).toBe(FIND_FIELD_AT - 1)
  })
})
