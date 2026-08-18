/* ============================================================
   ONE REFERENCE, ONE CALENDAR.

   A quote's reference is two halves glued together — `20260818-01` —
   and for a while each half read a different clock:

     the stamp   `referenceFor` (freeze.ts), built from
                 getFullYear/getMonth/getDate — the LOCAL day
     the suffix  `nthToday` (quotes.ts), which counted the quotes
                 whose `createdAt.slice(0, 10)` matched
                 `nowIso().slice(0, 10)` — the UTC day

   In UTC the two are the same string and nothing is visible, which is
   why it survived two earlier passes over this exact path. So this
   file PINS THE ZONE: Australia/Brisbane, UTC+10, which is where
   Northside Marine are. Every assertion below is false in UTC-only
   terms and true of the app the dealer runs.

   TZ IS SET BEFORE THE MODULES ARE IMPORTED and put back afterwards.
   Node reads `process.env.TZ` on each `Date` operation from v16, so
   the change takes effect immediately; restoring it keeps the rest of
   the suite in whatever zone the machine actually has.
   ============================================================ */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

/* reached through `globalThis` rather than the bare `process`, because
   tsconfig.app.json carries no node types and this file is compiled by
   it along with everything else it sits beside */
const ENV = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
const ORIGINAL_TZ = ENV?.TZ
if (ENV) ENV.TZ = 'Australia/Brisbane'
afterAll(() => {
  if (ENV) ENV.TZ = ORIGINAL_TZ
})

const { registerQuote, makeNewVersion, discardDraft, allQuotes } = await import('./quotes')
const { localDay, localDayOf } = await import('./day')
const { referenceFor } = await import('./freeze')

import type { QuoteDef } from './types'

/* ---------------------------------------------------------- */

/** A quote that exists only to occupy a day. Nothing here is priced —
 *  the subject under test is which bucket `createdAt` falls in. */
let n = 0
function quoteMadeAt(createdAt: string): QuoteDef {
  n += 1
  const quote: QuoteDef = {
    id: `qd${n}`,
    reference: `seed-${n}`,
    state: 'issued',
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_1',
    subjectLabel: 'Highfield SP 560',
    subjectSpecs: [],
    sections: [],
    lines: [],
    adjustments: [],
    levelKey: 'cash',
    customer: { name: 'A customer' },
    createdAt,
    updatedAt: createdAt,
  }
  registerQuote(quote)
  return quote
}

/** Empty the registry between cases — `nthToday` counts everything in
 *  it, so a leftover quote is a leftover answer. */
function clearRegistry(): void {
  for (const q of allQuotes()) {
    if (q.state !== 'draft') registerQuote({ ...q, state: 'draft' })
    discardDraft(q.id)
  }
  n = 0
}

beforeEach(clearRegistry)

/* ---------------------------------------------------------- */

describe('the zone this file pins is the one that shows the fault', () => {
  it('is UTC+10, where a morning instant belongs to the next UTC day back', () => {
    const at0228 = new Date('2026-08-17T16:28:00.000Z')
    expect(at0228.getTimezoneOffset()).toBe(-600)
    // 02:28 on the 18th, locally
    expect(at0228.getHours()).toBe(2)
    expect(localDay(at0228.toISOString())).toBe('2026-08-18')
    // and 16:28 on the 17th in UTC — the string `.slice(0, 10)` read
    expect(at0228.toISOString().slice(0, 10)).toBe('2026-08-17')
  })
})

describe('both halves of a reference name the same day', () => {
  it('the stamp is exactly localDayOf, with the hyphens taken out', () => {
    /* every hour of a local day, so the ten hours where UTC disagrees
       are all covered rather than sampled */
    for (let hour = 0; hour < 24; hour += 1) {
      const at = new Date(2026, 7, 18, hour, 30, 0)
      const stamp = referenceFor(at, 1).slice(0, 8)
      expect(stamp, `hour ${hour}`).toBe(localDayOf(at).replace(/-/g, ''))
    }
  })

  it('localDayOf and localDay agree about one instant', () => {
    const at = new Date('2026-08-17T16:28:00.000Z')
    expect(localDayOf(at)).toBe(localDay(at.toISOString()))
  })
})

describe('the suffix counts the LOCAL day, which is what the stamp says', () => {
  /* THE TWO SEEDS ARE BUILT FROM TODAY'S OWN LOCAL FIELDS, so the
     assertion holds at every hour of every day rather than on the one
     morning the fault was measured on.

       earlyToday   01:00 local today. SAME local day as now; in
                    UTC+10 its UTC day is YESTERDAY.
       yesterday    13:00 local yesterday. DIFFERENT local day; its
                    UTC day is yesterday too.

     So the two seeds share a UTC day and do not share a local day,
     which is exactly the pair a UTC count cannot tell apart. Counting
     locally there is one quote from today, and the next reference is
     `-02`. Counting in UTC there are either two (when now is before
     10:00 local, so now's UTC day is yesterday as well) or none —
     `-03` or `-01`, never `-02`, at any hour. */
  const now = new Date()
  const earlyToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0)
  const yesterday = new Date(earlyToday.getTime() - 12 * 60 * 60 * 1000)

  it('the two seeds really are one UTC day and two local days', () => {
    expect(earlyToday.toISOString().slice(0, 10)).toBe(yesterday.toISOString().slice(0, 10))
    expect(localDayOf(earlyToday)).not.toBe(localDayOf(yesterday))
    expect(localDayOf(earlyToday)).toBe(localDayOf(now))
  })

  it("the next reference is today's second, whatever the wall clock says", () => {
    quoteMadeAt(earlyToday.toISOString())
    const source = quoteMadeAt(yesterday.toISOString())

    const made = makeNewVersion(source.id)
    expect(made).not.toBeNull()

    const stamp = localDayOf(new Date()).replace(/-/g, '')
    expect(made?.reference).toBe(`${stamp}-02`)
  })

  it('two quotes either side of 10:00 local are one day, and get different suffixes', () => {
    /* THE OTHER DIRECTION, and the worse one. 09:00 and 11:00 on the
       same local morning fall in DIFFERENT UTC days, so a UTC count
       made both of them the first of their day and printed one
       reference on two documents. */
    const before = new Date('2026-08-17T23:00:00.000Z') // 09:00 on the 18th
    const after = new Date('2026-08-18T01:00:00.000Z') // 11:00 on the 18th
    expect(before.toISOString().slice(0, 10)).not.toBe(after.toISOString().slice(0, 10))
    expect(localDay(before.toISOString())).toBe(localDay(after.toISOString()))

    const first = referenceFor(before, 1)
    const second = referenceFor(after, 2)
    expect(first).toBe('20260818-01')
    expect(second).toBe('20260818-02')
    expect(first.slice(0, 8)).toBe(second.slice(0, 8))
  })
})
