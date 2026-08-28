/* ============================================================
   THE LOG'S ARITHMETIC.

   `byDay` is the only thing in this feature with edge cases worth
   pinning, and they are all about the boundary: a log written at
   11pm and read at 1am is two days, and a run that crosses
   midnight must break rather than carry the first day's name down
   the page.

   Every test hands its own `now`, so none of this is at the mercy
   of when it runs — the fault that makes a date test pass all
   afternoon and fail at midnight.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { byDay, clockSay, whenSay, type Entry } from './activity'

const at = (iso: string): number => new Date(iso).getTime()

/** the few fields `byDay` reads. Built local-time on purpose: the
 *  whole point of the function is the READER's day. */
const row = (id: string, when: string): Entry => ({
  id,
  at: at(when),
  text: `entry ${id}`,
})

const NOW = at('2026-08-28T14:00:00')

describe('cutting a log into days', () => {
  it('says Today and Yesterday rather than a date', () => {
    const days = byDay(
      [row('a', '2026-08-28T13:00:00'), row('b', '2026-08-27T09:00:00')],
      NOW,
    )
    expect(days.map((d) => d.name)).toEqual(['Today', 'Yesterday'])
  })

  /* THE BOUNDARY IS THE POINT. 11pm and 1am are four hours apart
     and two different days, and a log that grouped by elapsed
     hours would put them together under one heading. */
  it('breaks the run at midnight, not after twenty-four hours', () => {
    const days = byDay(
      [row('a', '2026-08-28T01:00:00'), row('b', '2026-08-27T23:00:00')],
      NOW,
    )
    expect(days.length).toBe(2)
    expect(days[0].rows.map((r) => r.id)).toEqual(['a'])
    expect(days[1].rows.map((r) => r.id)).toEqual(['b'])
  })

  it('keeps consecutive entries of one day in one group, in the order given', () => {
    const days = byDay(
      [
        row('a', '2026-08-28T13:00:00'),
        row('b', '2026-08-28T09:00:00'),
        row('c', '2026-08-28T08:00:00'),
      ],
      NOW,
    )
    expect(days.length).toBe(1)
    expect(days[0].rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  /* A WEEKDAY IS ONLY USEFUL INSIDE A WEEK. Past that it is
     ambiguous — "Tuesday" could be three weeks ago — so it becomes
     a date, which is the same ladder `whenSay` climbs. */
  it('uses a weekday inside the week and a date beyond it', () => {
    const inWeek = byDay([row('a', '2026-08-25T10:00:00')], NOW)
    expect(inWeek[0].name).toBe(
      new Date(at('2026-08-25T10:00:00')).toLocaleDateString(undefined, { weekday: 'long' }),
    )
    const older = byDay([row('b', '2026-06-02T10:00:00')], NOW)
    expect(older[0].name).toMatch(/Jun/)
  })

  it('returns nothing for nothing', () => {
    expect(byDay([], NOW)).toEqual([])
  })

  /* THE KEY IS THE DAY, so React keeps a group across a re-render
     and two entries on one day can never produce two groups. */
  it('gives one day one key', () => {
    const days = byDay(
      [row('a', '2026-08-28T13:00:00'), row('b', '2026-08-28T02:00:00')],
      NOW,
    )
    expect(days.length).toBe(1)
    expect(days[0].key).toBe(String(new Date(at('2026-08-28T00:00:00')).getTime()))
  })
})

describe('saying when', () => {
  it('prints a clock time, not a relative one', () => {
    /* the format is the reader's locale, so the assertion is that
       it contains the minutes rather than what the separator is */
    expect(clockSay(at('2026-08-28T13:49:00'))).toMatch(/49/)
  })

  /* `whenSay` is still used where there is no day heading above a
     row — a single figure on a card. Both exist on purpose and
     this pins which is which. */
  it('still climbs the relative ladder where it is used', () => {
    expect(whenSay(NOW - 10_000, NOW)).toBe('just now')
    expect(whenSay(NOW - 5 * 60_000, NOW)).toBe('5 minutes ago')
    expect(whenSay(NOW - 3 * 3_600_000, NOW)).toBe('3 hours ago')
  })
})
