/* ============================================================
   WHAT THE PALETTE REMEMBERS.

   `withPick` is the whole ordering rule, extracted so it can be
   reasoned about without a browser — every other function in
   `recent.ts` is that rule plus a `localStorage` call it is
   contractually obliged to swallow.

   THE ONE THING THESE TESTS EXIST TO PIN is that a TABLE and a ROW
   IN THAT TABLE ARE TWO DESTINATIONS. Folding them together is the
   obvious optimisation and it silently loses whichever one you did
   first — you open the Highfield register, then one Highfield boat,
   and the register is gone from the list you would have used to
   get back to it.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { RECENT_LIMIT, withPick } from './recent'

describe('withPick', () => {
  it('puts the newest pick at the front', () => {
    const list = withPick(withPick([], { entityId: 'a' }), { entityId: 'b' })
    expect(list).toEqual([{ entityId: 'b' }, { entityId: 'a' }])
  })

  it('moves a repeated pick rather than doubling it', () => {
    const start = [{ entityId: 'a' }, { entityId: 'b' }, { entityId: 'c' }]
    expect(withPick(start, { entityId: 'c' })).toEqual([
      { entityId: 'c' },
      { entityId: 'a' },
      { entityId: 'b' },
    ])
  })

  it('keeps a table and a row of that table apart', () => {
    const list = withPick(withPick([], { entityId: 'a' }), {
      entityId: 'a',
      rowId: 'r1',
    })
    expect(list).toEqual([{ entityId: 'a', rowId: 'r1' }, { entityId: 'a' }])
  })

  it('keeps two rows of one table apart', () => {
    const list = withPick(
      withPick([], { entityId: 'a', rowId: 'r1' }),
      { entityId: 'a', rowId: 'r2' },
    )
    expect(list).toHaveLength(2)
  })

  it('never grows past the limit, and drops the oldest', () => {
    let list: { entityId: string; rowId?: string }[] = []
    for (let i = 0; i < RECENT_LIMIT + 4; i += 1) {
      list = withPick(list, { entityId: `e${i}` })
    }
    expect(list).toHaveLength(RECENT_LIMIT)
    expect(list[0]).toEqual({ entityId: `e${RECENT_LIMIT + 3}` })
    expect(list.some((p) => p.entityId === 'e0')).toBe(false)
  })
})
