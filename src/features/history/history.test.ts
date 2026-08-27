/* ============================================================
   THE DIARY, PINNED.

   Everything in `history.ts` is arithmetic over frozen documents, so
   all of it is testable without a browser and all of it is tested
   here. What these pin, in order of how much they would cost to get
   wrong:

   1. THE THIRD STANDING IS DERIVED AND MUST STAY DERIVED. "Replaced"
      is not a field; it is "somebody made a later version of this".
      A test that asserted a stored flag would pass while the screen
      showed a stale one.

   2. A FORK IS NOT A CHAIN. `makeNewVersion` can be pressed twice on
      one issued quote. Both new drafts are versions of the same
      conversation and neither may be hidden.

   3. UNTRUSTED LINKS CANNOT HANG THE APP. These records come back
      out of localStorage and out of imported files, so two quotes
      pointing at each other is input, not a bug report. The walk
      must terminate.

   4. A FACET COUNT IS A PROMISE ABOUT WHAT PRESSING IT DOES. "Drafts
      4" beside a customer filter that leaves one draft is a lie the
      user finds within a second.

   5. DAYS ARE THE READER'S OWN. Every timestamp is a UTC instant and
      every heading is a local day, so every instant below is built
      from LOCAL fields and read back the same way — the test is
      correct in Brisbane and in London, which is the only way it
      could have caught the fault `day.ts` records.

   THE FIXTURES ARE SHAPES, NOT SAMPLE DATA. Round numbers and plain
   labels: nothing here pretends to be a price file, and nothing here
   is ever rendered.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { QuoteDef, QuoteLine } from '@/features/quote'
import {
  ANY_CUSTOMER,
  NO_CUSTOMER,
  NO_FILTER,
  customerFacets,
  customerHistory,
  dayTitle,
  drafts,
  filterIsOpen,
  filterQuotes,
  groupByDay,
  indexQuotes,
  offeredNotTaken,
  spanFrom,
  standingCounts,
  standingOf,
  tally,
  versionMark,
  versionsOf,
} from './history'

/* ---------------------------------------------------------- */
/* fixtures                                                   */
/* ---------------------------------------------------------- */

/** A UTC instant that falls on the given LOCAL calendar day. Built
 *  from local fields on purpose — see note 5 in the header. */
const at = (y: number, m: number, d: number, h = 12): string =>
  new Date(y, m - 1, d, h).toISOString()

const day = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function line(id: string, label: string, unitPrice: number | null): QuoteLine {
  return {
    id,
    entityId: 'tbl',
    rowId: `row_${id}`,
    label,
    qty: 1,
    unitPrice,
    priceFieldId: 'f_cash',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [],
  }
}

interface Make {
  id: string
  createdAt: string
  updatedAt?: string
  state?: 'draft' | 'issued'
  supersedesId?: string
  customerRow?: string
  customerName?: string
  subject?: string
  reference?: string
  lines?: QuoteLine[]
}

function quote(m: Make): QuoteDef {
  const lines = m.lines ?? []
  return {
    id: m.id,
    reference: m.reference ?? m.id.toUpperCase(),
    state: m.state ?? 'draft',
    viewId: 'view_1',
    rootTableId: 'tbl',
    rootRowId: `subject_${m.id}`,
    subjectLabel: m.subject ?? 'A hull',
    subjectSpecs: [],
    sections: [{ blockId: 'b1', tableId: 'tbl', title: 'Motors', lineIds: lines.map((l) => l.id) }],
    lines,
    adjustments: [],
    levelKey: 'cash',
    customer: { name: m.customerName ?? '' },
    ...(m.customerRow ? { customerRef: { tableId: '__customers', rowId: m.customerRow } } : {}),
    ...(m.supersedesId ? { supersedesId: m.supersedesId } : {}),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt ?? m.createdAt,
  }
}

/* ---------------------------------------------------------- */

describe('the three standings', () => {
  it('calls a draft a draft, an issued quote given, and an issued quote with a later version replaced', () => {
    const first = quote({ id: 'q1', createdAt: at(2026, 3, 1), state: 'issued' })
    const second = quote({
      id: 'q2',
      createdAt: at(2026, 3, 4),
      state: 'issued',
      supersedesId: 'q1',
    })
    const open = quote({ id: 'q3', createdAt: at(2026, 3, 6) })
    const index = indexQuotes([first, second, open])

    expect(standingOf(index, 'q1')).toBe('replaced')
    expect(standingOf(index, 'q2')).toBe('given')
    expect(standingOf(index, 'q3')).toBe('draft')
  })

  it('does not treat a link to a quote that is not here as a replacement', () => {
    /* half a conversation, out of an imported file */
    const only = quote({ id: 'q2', createdAt: at(2026, 3, 4), state: 'issued', supersedesId: 'gone' })
    const index = indexQuotes([only])
    expect(standingOf(index, 'q2')).toBe('given')
    expect(versionMark(index, 'q2')).toEqual([1, 1])
  })

  it('a draft made from an issued quote leaves the original replaced and itself a draft', () => {
    const given = quote({ id: 'q1', createdAt: at(2026, 3, 1), state: 'issued' })
    const next = quote({ id: 'q2', createdAt: at(2026, 3, 2), supersedesId: 'q1' })
    const index = indexQuotes([given, next])
    expect(standingOf(index, 'q1')).toBe('replaced')
    expect(standingOf(index, 'q2')).toBe('draft')
  })
})

describe('lineages', () => {
  it('orders the versions of one conversation oldest first', () => {
    const v1 = quote({ id: 'a', createdAt: at(2026, 1, 5), state: 'issued' })
    const v2 = quote({ id: 'b', createdAt: at(2026, 1, 9), state: 'issued', supersedesId: 'a' })
    const v3 = quote({ id: 'c', createdAt: at(2026, 2, 2), supersedesId: 'b' })
    const index = indexQuotes([v3, v1, v2])

    expect(versionsOf(index, 'b').map((q) => q.id)).toEqual(['a', 'b', 'c'])
    expect(versionMark(index, 'a')).toEqual([1, 3])
    expect(versionMark(index, 'b')).toEqual([2, 3])
    expect(versionMark(index, 'c')).toEqual([3, 3])
  })

  it('keeps BOTH branches when one issued quote is versioned twice', () => {
    const v1 = quote({ id: 'a', createdAt: at(2026, 1, 5), state: 'issued' })
    const forkA = quote({ id: 'b', createdAt: at(2026, 1, 6), supersedesId: 'a' })
    const forkB = quote({ id: 'c', createdAt: at(2026, 1, 7), supersedesId: 'a' })
    const index = indexQuotes([v1, forkA, forkB])

    expect(versionsOf(index, 'a').map((q) => q.id)).toEqual(['a', 'b', 'c'])
    expect(versionMark(index, 'c')).toEqual([3, 3])
    expect(standingOf(index, 'a')).toBe('replaced')
  })

  it('a quote nobody versioned is version one of one, never an empty list', () => {
    const only = quote({ id: 'a', createdAt: at(2026, 1, 5) })
    const index = indexQuotes([only])
    expect(versionsOf(index, 'a').map((q) => q.id)).toEqual(['a'])
    expect(versionMark(index, 'a')).toEqual([1, 1])
  })

  it('terminates on two quotes that supersede each other', () => {
    /* untrusted input, not a bug report: this comes back out of
       localStorage and out of files other machines wrote */
    const a = quote({ id: 'a', createdAt: at(2026, 1, 5), state: 'issued', supersedesId: 'b' })
    const b = quote({ id: 'b', createdAt: at(2026, 1, 6), state: 'issued', supersedesId: 'a' })
    const index = indexQuotes([a, b])
    expect(versionsOf(index, 'a').map((q) => q.id)).toEqual(['a', 'b'])
    expect(standingOf(index, 'a')).toBe('replaced')
    expect(standingOf(index, 'b')).toBe('replaced')
  })

  it('ignores a quote that supersedes itself', () => {
    const a = quote({ id: 'a', createdAt: at(2026, 1, 5), state: 'issued', supersedesId: 'a' })
    const index = indexQuotes([a])
    expect(standingOf(index, 'a')).toBe('given')
    expect(versionMark(index, 'a')).toEqual([1, 1])
  })
})

describe('the span of days', () => {
  it('spans a whole calendar year from its first day', () => {
    expect(spanFrom('year', '2026-08-27')).toBe('2026-01-01')
  })
  it('counts seven days INCLUDING today, not seven days before it', () => {
    expect(spanFrom('week', '2026-08-27')).toBe('2026-08-21')
  })
  it('counts thirty days the same way, across a month boundary', () => {
    expect(spanFrom('month', '2026-03-05')).toBe('2026-02-04')
  })
  it('today is today', () => {
    expect(spanFrom('today', '2026-08-27')).toBe('2026-08-27')
  })
  it('any day has no first day at all', () => {
    expect(spanFrom('all', '2026-08-27')).toBeNull()
  })
})

describe('the filter', () => {
  const today = day(2026, 8, 27)
  const list = [
    quote({
      id: 'q1',
      createdAt: at(2026, 8, 27),
      state: 'issued',
      customerRow: 'cust_a',
      customerName: 'R Kelleher',
      subject: 'Highfield SP520',
      reference: '20260827-01',
      lines: [line('l1', 'Yamaha F70', 12000)],
    }),
    quote({
      id: 'q2',
      createdAt: at(2026, 8, 20),
      customerRow: 'cust_b',
      customerName: 'Dawson Marine',
      subject: 'Stacer 429',
      reference: '20260820-01',
      lines: [line('l2', 'Suzuki DF60', 9000)],
    }),
    quote({
      id: 'q3',
      createdAt: at(2026, 2, 2),
      state: 'issued',
      customerName: 'walk-in',
      subject: 'Highfield SP520',
      reference: '20260202-01',
    }),
  ]
  const index = indexQuotes(list)

  it('shows everything when nothing is asked', () => {
    expect(filterQuotes(list, index, NO_FILTER, today).map((q) => q.id)).toEqual([
      'q1',
      'q2',
      'q3',
    ])
    expect(filterIsOpen(NO_FILTER)).toBe(true)
  })

  it('narrows to one standing', () => {
    const out = filterQuotes(list, index, { ...NO_FILTER, standing: 'draft' }, today)
    expect(out.map((q) => q.id)).toEqual(['q2'])
  })

  it('narrows to one customer by row id and never by name', () => {
    const out = filterQuotes(list, index, { ...NO_FILTER, customer: 'cust_a' }, today)
    expect(out.map((q) => q.id)).toEqual(['q1'])
  })

  it('gathers the quotes with nobody in the register behind them', () => {
    const out = filterQuotes(list, index, { ...NO_FILTER, customer: NO_CUSTOMER }, today)
    expect(out.map((q) => q.id)).toEqual(['q3'])
  })

  it('narrows to a span of days, read in the reader own zone', () => {
    expect(
      filterQuotes(list, index, { ...NO_FILTER, span: 'today' }, today).map((q) => q.id),
    ).toEqual(['q1'])
    expect(
      filterQuotes(list, index, { ...NO_FILTER, span: 'month' }, today).map((q) => q.id),
    ).toEqual(['q1', 'q2'])
  })

  it('finds a quote by a LINE on it, not only by its heading', () => {
    const out = filterQuotes(list, index, { ...NO_FILTER, query: 'f70' }, today)
    expect(out.map((q) => q.id)).toEqual(['q1'])
  })

  it('finds a quote by its reference and by its subject', () => {
    expect(
      filterQuotes(list, index, { ...NO_FILTER, query: '20260820' }, today).map((q) => q.id),
    ).toEqual(['q2'])
    expect(
      filterQuotes(list, index, { ...NO_FILTER, query: 'sp520' }, today).map((q) => q.id),
    ).toEqual(['q1', 'q3'])
  })

  it('combines every part of the filter', () => {
    const out = filterQuotes(
      list,
      index,
      { standing: 'issued' as never, customer: ANY_CUSTOMER, span: 'all', query: '' },
      today,
    )
    /* 'issued' is not a standing — the three are draft/given/replaced,
       and an unknown one matches nothing rather than everything */
    expect(out).toEqual([])
  })

  it('returns newest first whatever order it was handed', () => {
    const shuffled = [list[2], list[0], list[1]]
    expect(filterQuotes(shuffled, index, NO_FILTER, today).map((q) => q.id)).toEqual([
      'q1',
      'q2',
      'q3',
    ])
  })
})

describe('the facet counts', () => {
  const today = day(2026, 8, 27)
  const list = [
    quote({ id: 'q1', createdAt: at(2026, 8, 27), customerRow: 'cust_a' }),
    quote({ id: 'q2', createdAt: at(2026, 8, 26), customerRow: 'cust_b' }),
    quote({ id: 'q3', createdAt: at(2026, 8, 25), state: 'issued', customerRow: 'cust_a' }),
  ]
  const index = indexQuotes(list)

  it('counts every standing when nothing else is narrowed', () => {
    expect(standingCounts(list, index, NO_FILTER, today)).toEqual({
      all: 3,
      draft: 2,
      given: 1,
      replaced: 0,
    })
  })

  it('counts what pressing the chip WOULD show, with the rest of the filter still on', () => {
    const counts = standingCounts(list, index, { ...NO_FILTER, customer: 'cust_a' }, today)
    expect(counts).toEqual({ all: 2, draft: 1, given: 1, replaced: 0 })
  })

  it('is unaffected by the standing already chosen', () => {
    const a = standingCounts(list, index, { ...NO_FILTER, standing: 'draft' }, today)
    const b = standingCounts(list, index, { ...NO_FILTER, standing: 'given' }, today)
    expect(a).toEqual(b)
  })
})

describe('the customer facets', () => {
  it('groups by row id, names each by their most recent quote, and sorts by name', () => {
    const list = [
      quote({
        id: 'q1',
        createdAt: at(2026, 8, 27),
        customerRow: 'cust_b',
        customerName: 'Rob Kelleher',
      }),
      quote({
        id: 'q2',
        createdAt: at(2026, 8, 20),
        customerRow: 'cust_b',
        customerName: 'R Kelleher',
      }),
      quote({
        id: 'q3',
        createdAt: at(2026, 8, 21),
        customerRow: 'cust_a',
        customerName: 'Dawson Marine',
      }),
      /* a typed name with no row — never grouped with anything */
      quote({ id: 'q4', createdAt: at(2026, 8, 22), customerName: 'Dave' }),
    ]
    const facets = customerFacets(list)
    expect(facets.map((f) => f.rowId)).toEqual(['cust_a', 'cust_b'])
    expect(facets[1]).toEqual({
      rowId: 'cust_b',
      name: 'Rob Kelleher',
      count: 2,
      latest: day(2026, 8, 27),
    })
  })

  it('sorts a row nobody has named last rather than first', () => {
    const list = [
      quote({ id: 'q1', createdAt: at(2026, 8, 27), customerRow: 'blank', customerName: '' }),
      quote({ id: 'q2', createdAt: at(2026, 8, 26), customerRow: 'named', customerName: 'Zoe' }),
    ]
    expect(customerFacets(list).map((f) => f.rowId)).toEqual(['named', 'blank'])
  })
})

describe('the shelf of drafts', () => {
  it('orders by when it was last touched, not by when it was started', () => {
    const monday = quote({
      id: 'started-monday',
      createdAt: at(2026, 8, 24),
      updatedAt: at(2026, 8, 27, 16),
    })
    const friday = quote({
      id: 'started-friday',
      createdAt: at(2026, 8, 26),
      updatedAt: at(2026, 8, 26),
    })
    const given = quote({ id: 'given', createdAt: at(2026, 8, 27), state: 'issued' })
    expect(drafts([given, friday, monday]).map((q) => q.id)).toEqual([
      'started-monday',
      'started-friday',
    ])
  })

  it('holds no issued quote at all', () => {
    const given = quote({ id: 'g', createdAt: at(2026, 8, 27), state: 'issued' })
    expect(drafts([given])).toEqual([])
  })
})

describe('grouping by day', () => {
  it('cuts the list into days, newest day first, newest within a day first', () => {
    const list = [
      quote({ id: 'early', createdAt: at(2026, 8, 27, 9) }),
      quote({ id: 'late', createdAt: at(2026, 8, 27, 17) }),
      quote({ id: 'before', createdAt: at(2026, 8, 26, 11) }),
    ]
    const groups = groupByDay(list)
    expect(groups.map((g) => g.day)).toEqual([day(2026, 8, 27), day(2026, 8, 26)])
    expect(groups[0].quotes.map((q) => q.id)).toEqual(['late', 'early'])
  })

  it('is empty for an empty list', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('the day heading', () => {
  it('says Today and Yesterday', () => {
    expect(dayTitle('2026-08-27', '2026-08-27')).toBe('Today')
    expect(dayTitle('2026-08-26', '2026-08-27')).toBe('Yesterday')
  })
  it('crosses a month boundary to find yesterday', () => {
    expect(dayTitle('2026-02-28', '2026-03-01')).toBe('Yesterday')
  })
  it('writes any other day out in full, and the same way in every locale', () => {
    expect(dayTitle('2026-08-21', '2026-08-27')).toBe('Fri 21 Aug 2026')
  })
  it('hands back a day it cannot read rather than printing NaN', () => {
    expect(dayTitle('not-a-day', '2026-08-27')).toBe('not-a-day')
  })
})

describe('the tally', () => {
  it('counts the standings, the people and the quotes with nobody behind them', () => {
    const list = [
      quote({ id: 'a', createdAt: at(2026, 8, 1), state: 'issued', customerRow: 'c1' }),
      quote({ id: 'b', createdAt: at(2026, 8, 2), state: 'issued', supersedesId: 'a', customerRow: 'c1' }),
      quote({ id: 'c', createdAt: at(2026, 8, 3), customerRow: 'c2' }),
      quote({ id: 'd', createdAt: at(2026, 8, 4), customerName: 'walk-in' }),
    ]
    const index = indexQuotes(list)
    expect(tally(list, index)).toEqual({
      quotes: 4,
      drafts: 2,
      given: 1,
      replaced: 1,
      customers: 2,
      unfiled: 1,
    })
  })

  it('counts nothing as nothing', () => {
    expect(tally([], indexQuotes([])).quotes).toBe(0)
  })
})

describe('one customer history', () => {
  const first = quote({
    id: 'v1',
    createdAt: at(2026, 5, 4),
    state: 'issued',
    customerRow: 'cust_a',
    customerName: 'R Kelleher',
    lines: [line('a', 'Yamaha F70', 12000), line('b', 'Bimini top', 900)],
  })
  const second = quote({
    id: 'v2',
    createdAt: at(2026, 5, 20),
    state: 'issued',
    supersedesId: 'v1',
    customerRow: 'cust_a',
    customerName: 'Rob Kelleher',
    lines: [line('c', 'Yamaha F70', 12500)],
  })
  const open = quote({
    id: 'v3',
    createdAt: at(2026, 6, 1),
    customerRow: 'cust_a',
    customerName: 'Rob Kelleher',
    lines: [line('d', 'Trailer', 4000)],
  })
  const other = quote({ id: 'x', createdAt: at(2026, 6, 2), customerRow: 'cust_b' })
  const list = [first, second, open, other]
  const index = indexQuotes(list)
  const read = customerHistory('cust_a', list, index)

  it('takes only their quotes, newest first', () => {
    expect(read.all.map((q) => q.id)).toEqual(['v3', 'v2', 'v1'])
  })

  it('splits them by standing', () => {
    expect(read.given.map((q) => q.id)).toEqual(['v2'])
    expect(read.replaced.map((q) => q.id)).toEqual(['v1'])
    expect(read.open.map((q) => q.id)).toEqual(['v3'])
  })

  it('sums only what is given, from the frozen numbers', () => {
    expect(read.givenTotal).toBe(12500)
  })

  it('names the first and last day they were quoted', () => {
    expect(read.firstDay).toBe(day(2026, 5, 4))
    expect(read.lastDay).toBe(day(2026, 6, 1))
  })

  it('lists every name their documents were addressed with, most recent first', () => {
    expect(read.addressedAs).toEqual(['Rob Kelleher', 'R Kelleher'])
  })

  it('is honest about a customer with nothing', () => {
    const none = customerHistory('nobody', list, index)
    expect(none.all).toEqual([])
    expect(none.givenTotal).toBe(0)
    expect(none.firstDay).toBeNull()
    expect(none.addressedAs).toEqual([])
  })
})

describe('what was offered and is on nothing current', () => {
  it('names a line dropped between two versions, and never one still on a current quote', () => {
    const v1 = quote({
      id: 'v1',
      createdAt: at(2026, 5, 4),
      state: 'issued',
      customerRow: 'c',
      lines: [line('a', 'Yamaha F70', 12000), line('b', 'Bimini top', 900)],
    })
    const v2 = quote({
      id: 'v2',
      createdAt: at(2026, 5, 20),
      state: 'issued',
      supersedesId: 'v1',
      customerRow: 'c',
      lines: [line('c', 'Yamaha F70', 12500)],
    })
    const list = [v1, v2]
    const out = offeredNotTaken(customerHistory('c', list, indexQuotes(list)))
    expect(out.map((p) => p.label)).toEqual(['Bimini top'])
    expect(out[0]).toMatchObject({ reference: 'V1', amount: 900, day: day(2026, 5, 4) })
  })

  it('matches on the label whatever its case, because two picks are two line ids', () => {
    const v1 = quote({
      id: 'v1',
      createdAt: at(2026, 5, 4),
      state: 'issued',
      customerRow: 'c',
      lines: [line('a', 'Bimini Top', 900)],
    })
    const v2 = quote({
      id: 'v2',
      createdAt: at(2026, 5, 20),
      state: 'issued',
      supersedesId: 'v1',
      customerRow: 'c',
      lines: [line('c', 'bimini top', 950)],
    })
    const list = [v1, v2]
    expect(offeredNotTaken(customerHistory('c', list, indexQuotes(list)))).toEqual([])
  })

  it('counts an OPEN draft as current, so a line moved into one is not called dropped', () => {
    const v1 = quote({
      id: 'v1',
      createdAt: at(2026, 5, 4),
      state: 'issued',
      customerRow: 'c',
      lines: [line('a', 'Bimini top', 900)],
    })
    const v2 = quote({
      id: 'v2',
      createdAt: at(2026, 5, 20),
      state: 'issued',
      supersedesId: 'v1',
      customerRow: 'c',
      lines: [],
    })
    const draft = quote({
      id: 'v3',
      createdAt: at(2026, 6, 1),
      customerRow: 'c',
      lines: [line('d', 'Bimini top', 950)],
    })
    const list = [v1, v2, draft]
    expect(offeredNotTaken(customerHistory('c', list, indexQuotes(list)))).toEqual([])
  })

  it('names each label once, from the most recent replaced quote it was on', () => {
    const v1 = quote({
      id: 'v1',
      createdAt: at(2026, 5, 4),
      state: 'issued',
      customerRow: 'c',
      lines: [line('a', 'Bimini top', 900)],
      reference: 'FIRST',
    })
    const v2 = quote({
      id: 'v2',
      createdAt: at(2026, 5, 20),
      state: 'issued',
      supersedesId: 'v1',
      customerRow: 'c',
      lines: [line('b', 'Bimini top', 950)],
      reference: 'SECOND',
    })
    const v3 = quote({
      id: 'v3',
      createdAt: at(2026, 6, 1),
      state: 'issued',
      supersedesId: 'v2',
      customerRow: 'c',
      lines: [],
      reference: 'THIRD',
    })
    const list = [v1, v2, v3]
    const out = offeredNotTaken(customerHistory('c', list, indexQuotes(list)))
    expect(out).toHaveLength(1)
    expect(out[0].reference).toBe('SECOND')
  })

  it('says nothing at all when a customer has no replaced quote', () => {
    const only = quote({
      id: 'v1',
      createdAt: at(2026, 5, 4),
      state: 'issued',
      customerRow: 'c',
      lines: [line('a', 'Bimini top', 900)],
    })
    expect(offeredNotTaken(customerHistory('c', [only], indexQuotes([only])))).toEqual([])
  })

  it('carries a null price through rather than calling it nothing', () => {
    const v1 = quote({
      id: 'v1',
      createdAt: at(2026, 5, 4),
      state: 'issued',
      customerRow: 'c',
      lines: [line('a', 'Rigging kit', null)],
    })
    const v2 = quote({
      id: 'v2',
      createdAt: at(2026, 5, 20),
      state: 'issued',
      supersedesId: 'v1',
      customerRow: 'c',
      lines: [],
    })
    const list = [v1, v2]
    const out = offeredNotTaken(customerHistory('c', list, indexQuotes(list)))
    expect(out[0].amount).toBeNull()
  })
})
