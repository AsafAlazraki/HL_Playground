/* ============================================================
   HISTORY — reading the diary of quotes, and nothing else.

   WHAT THIS FILE IS. Every question a history screen asks of a pile
   of quotes, answered as arithmetic: which are still being worked
   on, which were given, which have been replaced by a later version,
   which belong to one customer, which fall in a range of days, and
   which of them the words somebody typed can be found in.

   NOTHING HERE READS THE STORE AND NOTHING HERE WRITES. It takes a
   `QuoteDef[]` and returns readings of it, so every function below
   is testable without a browser and no screen drawn from it can
   drift onto live data. That is the same invariant the quote feature
   keeps (`useProjectStore` in exactly one file) and it is worth more
   here than anywhere, because history's whole promise is that what
   it shows is what was frozen.

   THREE STANDINGS, AND THE THIRD ONE IS DERIVED.

     draft      still being written. `QuoteDef.state === 'draft'`.
     given      issued to a customer, and still the current word.
     replaced   issued, and some LATER quote carries `supersedesId`
                pointing at it.

   `QuoteState` has two members on purpose — a quote is either being
   written or it has been handed over — and "replaced" is not a third
   state of a document, it is a fact about the CONVERSATION around
   it. So it is computed from the links between quotes and never
   stored, which means it cannot go stale and there is no migration
   the day somebody versions an old quote.

   WHAT IS NOT HERE, AND WILL NOT BE INVENTED. Nothing in this app
   records that a customer BOUGHT anything: there is no won/lost, no
   deposit, no order. So `offeredNotTaken` below is worded as exactly
   what the data supports — a thing that was on a version since
   replaced and is on none of their current quotes — and no function
   in this file returns a "sale", a "conversion" or a "pipeline
   stage". Production shipped all three keyed on fields nothing
   wrote.

   VERSIONS ARE A COMPONENT, NOT A CHAIN. `makeNewVersion` writes one
   `supersedesId` link and can be pressed twice on the same issued
   quote, which makes a fork rather than a chain. Rather than pick a
   winner and hide a document, every quote reachable through those
   links — in either direction — is one LINEAGE, ordered oldest
   first by the day it was made. A fork therefore reads as "version 2
   and version 3 of the same conversation", which is what it is.
   ============================================================ */

import { lineAmount, localDay, quoteTotals, type QuoteDef } from '@/features/quote'

/* ---------------------------------------------------------- */
/* Standing                                                   */
/* ---------------------------------------------------------- */

/** Where a quote stands in the conversation it belongs to. */
export type Standing = 'draft' | 'given' | 'replaced'

/** The business's own word for each, in the case a person reads it.
 *  Uppercase is a label style and these are not labels — they are
 *  the answer to "what happened to this quote". */
export const STANDING_TITLE: Record<Standing, string> = {
  draft: 'Draft',
  given: 'Given',
  replaced: 'Replaced',
}

/** One sentence per standing, for a filter that has just emptied the
 *  list. A refusal says why, where it is refused. */
export const STANDING_SAY: Record<Standing, string> = {
  draft: 'A draft is a quote still being written. Nothing has been handed over.',
  given: 'A given quote was handed to the customer and cannot be edited.',
  replaced: 'A replaced quote was given, and a later version of it was made afterwards.',
}

/* ---------------------------------------------------------- */
/* The index                                                  */
/* ---------------------------------------------------------- */

export interface HistoryIndex {
  /** every quote, newest first — the diary's own order */
  order: QuoteDef[]
  byId: Map<string, QuoteDef>
  /** a quote id -> the ids of every quote that supersedes it */
  supersededBy: Map<string, string[]>
  standing: Map<string, Standing>
  /** a quote id -> the id of the oldest quote in its lineage */
  rootOf: Map<string, string>
  /** a lineage root id -> its versions, OLDEST FIRST */
  versions: Map<string, QuoteDef[]>
}

const newestFirst = (a: QuoteDef, b: QuoteDef): number => {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  /* a stable tie-break, so two quotes minted in the same millisecond
     do not swap places between two renders of one list */
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}

const oldestFirst = (a: QuoteDef, b: QuoteDef): number => -newestFirst(a, b)

/**
 * Read the whole diary once.
 *
 * THE LINEAGES ARE BUILT BY UNION-FIND, which is not cleverness for
 * its own sake — it is the only walk that cannot loop. These records
 * come back from localStorage and out of imported files, so
 * `supersedesId` is untrusted input: a hand-edited pair pointing at
 * each other would hang a recursive walk, and a chain-following loop
 * would drop the second branch of a fork. Union-find does neither.
 */
export function indexQuotes(quotes: readonly QuoteDef[]): HistoryIndex {
  const order = [...quotes].sort(newestFirst)
  const byId = new Map<string, QuoteDef>()
  for (const q of order) byId.set(q.id, q)

  /* -- who replaced whom ------------------------------------ */
  const supersededBy = new Map<string, string[]>()
  for (const q of order) {
    const target = q.supersedesId
    /* a link to a quote that is not here — an export that carried
       only half a conversation — is not a fault and is not a
       replacement either. It is simply nothing. */
    if (!target || !byId.has(target) || target === q.id) continue
    const held = supersededBy.get(target)
    if (held) held.push(q.id)
    else supersededBy.set(target, [q.id])
  }

  /* -- the standing ----------------------------------------- */
  const standing = new Map<string, Standing>()
  for (const q of order) {
    if (q.state === 'draft') standing.set(q.id, 'draft')
    else standing.set(q.id, supersededBy.has(q.id) ? 'replaced' : 'given')
  }

  /* -- the lineages ----------------------------------------- */
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    let root = id
    while (parent.get(root) !== undefined && parent.get(root) !== root) {
      root = parent.get(root) as string
    }
    /* path compression, so a long conversation is not walked twice */
    let walk = id
    while (parent.get(walk) !== undefined && parent.get(walk) !== walk) {
      const next = parent.get(walk) as string
      parent.set(walk, root)
      walk = next
    }
    return root
  }
  for (const q of order) parent.set(q.id, q.id)
  for (const q of order) {
    const target = q.supersedesId
    if (!target || !byId.has(target) || target === q.id) continue
    const a = find(q.id)
    const b = find(target)
    if (a !== b) parent.set(a, b)
  }

  const groups = new Map<string, QuoteDef[]>()
  for (const q of order) {
    const root = find(q.id)
    const held = groups.get(root)
    if (held) held.push(q)
    else groups.set(root, [q])
  }

  const rootOf = new Map<string, string>()
  const versions = new Map<string, QuoteDef[]>()
  for (const [, members] of groups) {
    const ordered = [...members].sort(oldestFirst)
    /* the lineage is NAMED by its oldest member, not by whichever id
       union-find happened to land on — so the name is a fact about
       the conversation and survives a re-read in a different order */
    const rootId = ordered[0].id
    versions.set(rootId, ordered)
    for (const m of ordered) rootOf.set(m.id, rootId)
  }

  return { order, byId, supersededBy, standing, rootOf, versions }
}

/** Every version of the conversation this quote belongs to, oldest
 *  first. A quote nobody has versioned comes back as a list of one —
 *  never as an empty list, because a quote is always version one of
 *  itself. */
export function versionsOf(index: HistoryIndex, quoteId: string): QuoteDef[] {
  const root = index.rootOf.get(quoteId)
  const held = root ? index.versions.get(root) : undefined
  if (held && held.length > 0) return held
  const q = index.byId.get(quoteId)
  return q ? [q] : []
}

/** Which version this one is, and how many there are: `[2, 3]`.
 *  `[1, 1]` for a quote that has never been reissued. */
export function versionMark(index: HistoryIndex, quoteId: string): [number, number] {
  const line = versionsOf(index, quoteId)
  const at = line.findIndex((q) => q.id === quoteId)
  return [at < 0 ? 1 : at + 1, Math.max(1, line.length)]
}

export const standingOf = (index: HistoryIndex, quoteId: string): Standing =>
  index.standing.get(quoteId) ?? 'draft'

/* ---------------------------------------------------------- */
/* The filter                                                 */
/* ---------------------------------------------------------- */

/** Every named span of days a person can ask for. `all` is first
 *  because it is the state the screen opens in — a diary hides
 *  nothing until it is asked to. */
export type SpanKey = 'all' | 'today' | 'week' | 'month' | 'year'

export const SPAN_TITLE: Record<SpanKey, string> = {
  all: 'Any day',
  today: 'Today',
  week: 'Last 7 days',
  month: 'Last 30 days',
  year: 'This year',
}

/** The customer selection. A row id picks one person; the two words
 *  below are the states a row id cannot express.
 *
 *  `__none` is not "no filter" — it is the deliberate question "which
 *  quotes went to a name somebody typed, with nobody in the register
 *  behind it?", which is the pile a yard wants to work through and
 *  file. */
export const ANY_CUSTOMER = ''
export const NO_CUSTOMER = '__none'

export interface HistoryFilter {
  standing: Standing | 'all'
  /** a customer row id, ANY_CUSTOMER or NO_CUSTOMER */
  customer: string
  span: SpanKey
  /** free text: reference, subject, customer, section and line labels */
  query: string
}

export const NO_FILTER: HistoryFilter = {
  standing: 'all',
  customer: ANY_CUSTOMER,
  span: 'all',
  query: '',
}

export const filterIsOpen = (f: HistoryFilter): boolean =>
  f.standing === 'all' &&
  f.customer === ANY_CUSTOMER &&
  f.span === 'all' &&
  f.query.trim() === ''

/**
 * The first day a span includes, as `YYYY-MM-DD`, or null for "any
 * day". `today` is the reader's own calendar day — the caller passes
 * `localDayOf(new Date())` — so the span and the row it is compared
 * against are read from one calendar. Two surfaces reading one
 * timestamp two ways is the fault `day.ts` was written for; this
 * takes the day rather than a clock so it cannot repeat it.
 */
export function spanFrom(span: SpanKey, today: string): string | null {
  if (span === 'all') return null
  if (span === 'today') return today
  if (span === 'year') return `${today.slice(0, 4)}-01-01`
  const back = span === 'week' ? 6 : 29
  const [y, m, d] = today.split('-').map((n) => Number(n))
  const at = new Date(y, (m || 1) - 1, d || 1)
  at.setDate(at.getDate() - back)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`
}

/** Everything a typed word may be found in. The line labels are in
 *  because "which quote had the F70 on it?" is the question a
 *  salesperson actually types, and a search that only reads the
 *  heading cannot answer it. */
function haystack(q: QuoteDef): string {
  const parts = [q.reference, q.subjectLabel, q.customer.name]
  for (const s of q.sections) parts.push(s.title)
  for (const l of q.lines) parts.push(l.label)
  for (const a of q.adjustments) parts.push(a.label)
  return parts.join('\n').toLowerCase()
}

/**
 * The diary, narrowed. Newest first, always — the order of the
 * source list is not trusted, because a filter that silently
 * re-orders is a list that disagrees with the one beside it.
 *
 * THE DAY COMPARED IS THE READER'S OWN. `localDay` reads the stored
 * UTC instant in the reader's zone, and `YYYY-MM-DD` compares
 * correctly as text, so no Date is constructed per row.
 */
export function filterQuotes(
  quotes: readonly QuoteDef[],
  index: HistoryIndex,
  filter: HistoryFilter,
  today: string,
): QuoteDef[] {
  const from = spanFrom(filter.span, today)
  const q = filter.query.trim().toLowerCase()
  return [...quotes]
    .filter((quote) => {
      if (filter.standing !== 'all' && standingOf(index, quote.id) !== filter.standing) {
        return false
      }
      if (filter.customer === NO_CUSTOMER) {
        if (quote.customerRef !== undefined) return false
      } else if (filter.customer !== ANY_CUSTOMER) {
        if (quote.customerRef?.rowId !== filter.customer) return false
      }
      if (from !== null && localDay(quote.createdAt) < from) return false
      if (q !== '' && !haystack(quote).includes(q)) return false
      return true
    })
    .sort(newestFirst)
}

/* ---------------------------------------------------------- */
/* What the facets say                                        */
/* ---------------------------------------------------------- */

export interface StandingCounts {
  all: number
  draft: number
  given: number
  replaced: number
}

/**
 * How many quotes each standing would show, WITH THE REST OF THE
 * FILTER STILL APPLIED.
 *
 * That is the only honest count for a facet: a chip reading "Drafts
 * 4" beside a customer filter that leaves one draft is a chip that
 * lies about what pressing it does. Cheap, too — one pass over an
 * already-narrowed list.
 */
export function standingCounts(
  quotes: readonly QuoteDef[],
  index: HistoryIndex,
  filter: HistoryFilter,
  today: string,
): StandingCounts {
  const rest = filterQuotes(quotes, index, { ...filter, standing: 'all' }, today)
  const counts: StandingCounts = { all: rest.length, draft: 0, given: 0, replaced: 0 }
  for (const q of rest) counts[standingOf(index, q.id)] += 1
  return counts
}

export interface CustomerFacet {
  rowId: string
  /** the name the MOST RECENT quote to them was addressed with. The
   *  register may say something else today, and where that matters
   *  the customer's own page says both. */
  name: string
  count: number
  /** the day of their most recent quote */
  latest: string
}

/**
 * Everyone in the register who has been quoted, best-known first.
 *
 * ONLY QUOTES WITH A ROW BEHIND THEM. A quote addressed to a typed
 * name has no id, so it cannot be grouped with anything — two
 * walk-ins who both said "Dave" are not one customer and this will
 * never claim they are. They are reachable as a pile through
 * NO_CUSTOMER, which says what they are in words.
 */
export function customerFacets(quotes: readonly QuoteDef[]): CustomerFacet[] {
  const seen = new Map<string, CustomerFacet>()
  for (const q of [...quotes].sort(newestFirst)) {
    const rowId = q.customerRef?.rowId
    if (!rowId) continue
    const held = seen.get(rowId)
    if (held) {
      held.count += 1
      continue
    }
    seen.set(rowId, {
      rowId,
      name: q.customer.name.trim(),
      count: 1,
      latest: localDay(q.createdAt),
    })
  }
  return [...seen.values()].sort((a, b) => {
    /* by name, because this is a picker and a picker is read
       alphabetically; an unnamed row sorts last rather than first so
       it never heads the list */
    if (a.name === '' && b.name !== '') return 1
    if (b.name === '' && a.name !== '') return -1
    return a.name.localeCompare(b.name)
  })
}

/* ---------------------------------------------------------- */
/* The shelf of unfinished work                               */
/* ---------------------------------------------------------- */

/**
 * The drafts, MOST RECENTLY TOUCHED FIRST — which is a different
 * order from the rest of the diary, deliberately.
 *
 * Everything else here is ordered by the day it was made, because
 * that is what a diary is. A draft is not a diary entry; it is
 * unfinished work, and the one anybody wants is the one they had
 * open. `updatedAt` moves on every edit and `createdAt` never does,
 * so a draft started on Monday and worked on all week sits at the
 * bottom of a list sorted the diary's way.
 */
export function drafts(quotes: readonly QuoteDef[]): QuoteDef[] {
  return quotes
    .filter((q) => q.state === 'draft')
    .sort((a, b) => {
      const at = a.updatedAt || a.createdAt
      const bt = b.updatedAt || b.createdAt
      if (at !== bt) return at < bt ? 1 : -1
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
    })
}

/* ---------------------------------------------------------- */
/* Grouping the list                                          */
/* ---------------------------------------------------------- */

export interface DayGroup {
  /** `YYYY-MM-DD` in the reader's own zone */
  day: string
  quotes: QuoteDef[]
}

/** The list, cut into the days it was written on, newest day first.
 *  A day heading is what turns twelve rows into "three on Tuesday,
 *  nine last month" without anybody counting. */
export function groupByDay(quotes: readonly QuoteDef[]): DayGroup[] {
  const groups: DayGroup[] = []
  let current: DayGroup | undefined
  for (const q of [...quotes].sort(newestFirst)) {
    const day = localDay(q.createdAt)
    if (!current || current.day !== day) {
      current = { day, quotes: [] }
      groups.push(current)
    }
    current.quotes.push(q)
  }
  return groups
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * A day heading a person reads: `Today`, `Yesterday`, or
 * `Fri 21 Aug 2026`.
 *
 * Written out rather than handed to `toLocaleDateString` because a
 * heading that changes shape with the browser's locale cannot be
 * pinned by a test, and this one is pinned. The stamp beside it
 * stays `YYYY-MM-DD` — that is the machine-readable half and it has
 * not moved.
 */
export function dayTitle(day: string, today: string): string {
  if (day === today) return 'Today'
  const [y, m, d] = day.split('-').map((n) => Number(n))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return day
  const at = new Date(y, m - 1, d)
  if (Number.isNaN(at.getTime())) return day

  const [ty, tm, td] = today.split('-').map((n) => Number(n))
  if (Number.isFinite(ty) && Number.isFinite(tm) && Number.isFinite(td)) {
    const yesterday = new Date(ty, tm - 1, td)
    yesterday.setDate(yesterday.getDate() - 1)
    if (
      yesterday.getFullYear() === y &&
      yesterday.getMonth() === m - 1 &&
      yesterday.getDate() === d
    ) {
      return 'Yesterday'
    }
  }
  return `${WEEKDAYS[at.getDay()]} ${d} ${MONTHS[m - 1]} ${y}`
}

/* ---------------------------------------------------------- */
/* The tally                                                  */
/* ---------------------------------------------------------- */

export interface HistoryTally {
  quotes: number
  drafts: number
  given: number
  replaced: number
  /** people in the register who have been quoted at least once */
  customers: number
  /** quotes addressed to a typed name with no row behind it */
  unfiled: number
}

/** The counted facts a header may print. Every one of them is a
 *  length; nothing here is estimated, projected or forecast. */
export function tally(quotes: readonly QuoteDef[], index: HistoryIndex): HistoryTally {
  const t: HistoryTally = {
    quotes: quotes.length,
    drafts: 0,
    given: 0,
    replaced: 0,
    customers: 0,
    unfiled: 0,
  }
  const people = new Set<string>()
  for (const q of quotes) {
    const s = standingOf(index, q.id)
    if (s === 'draft') t.drafts += 1
    else if (s === 'given') t.given += 1
    else t.replaced += 1
    const rowId = q.customerRef?.rowId
    if (rowId) people.add(rowId)
    else t.unfiled += 1
  }
  t.customers = people.size
  return t
}

/* ---------------------------------------------------------- */
/* One customer                                               */
/* ---------------------------------------------------------- */

export interface CustomerHistoryRead {
  rowId: string
  /** every quote to them, newest first */
  all: QuoteDef[]
  /** issued and still the current word */
  given: QuoteDef[]
  /** issued, and a later version was made afterwards */
  replaced: QuoteDef[]
  /** still being written */
  open: QuoteDef[]
  /** the frozen totals of everything given, summed. A real sum of
   *  frozen numbers and never a forecast: it is what was handed
   *  over, not what was earned. */
  givenTotal: number
  /** the day of the first and the most recent quote, or null */
  firstDay: string | null
  lastDay: string | null
  /** every distinct name their documents were addressed with, most
   *  recent first. More than one is not a fault — it is the freeze
   *  working, and the page says so. */
  addressedAs: string[]
}

export function customerHistory(
  rowId: string,
  quotes: readonly QuoteDef[],
  index: HistoryIndex,
): CustomerHistoryRead {
  const all = [...quotes].filter((q) => q.customerRef?.rowId === rowId).sort(newestFirst)
  const read: CustomerHistoryRead = {
    rowId,
    all,
    given: [],
    replaced: [],
    open: [],
    givenTotal: 0,
    firstDay: null,
    lastDay: null,
    addressedAs: [],
  }
  const names: string[] = []
  for (const q of all) {
    const s = standingOf(index, q.id)
    if (s === 'draft') read.open.push(q)
    else if (s === 'replaced') read.replaced.push(q)
    else {
      read.given.push(q)
      read.givenTotal += quoteTotals(q).total
    }
    const name = q.customer.name.trim()
    if (name !== '' && !names.includes(name)) names.push(name)
  }
  read.addressedAs = names
  if (all.length > 0) {
    read.lastDay = localDay(all[0].createdAt)
    read.firstDay = localDay(all[all.length - 1].createdAt)
  }
  return read
}

/* ---------------------------------------------------------- */
/* What was offered and is on nothing current                 */
/* ---------------------------------------------------------- */

export interface PassedOver {
  /** the line as it was written on the quote it appeared on */
  label: string
  /** the reference and day of the most recent replaced quote it was
   *  on, so the claim can be checked against a document */
  quoteId: string
  reference: string
  day: string
  /** what it was priced at there. null is a real state. */
  amount: number | null
}

/**
 * WHAT THEY WERE OFFERED AND IS ON NOTHING CURRENT.
 *
 * READ THE WORDING BEFORE CHANGING IT. This is NOT "what they turned
 * down", and the screen must never say that it is. Nothing in this
 * app records a decision by a customer — there is no won, no lost,
 * no order, and inventing one is the single failure this project is
 * most careful about. What the data supports is exactly this:
 *
 *   a line that was on a version of a quote which has since been
 *   REPLACED, and is on none of their given or open quotes today.
 *
 * A salesperson reads that and knows what to ask about. It is
 * information, and it is true, and it costs nothing to be honest
 * about which of the two it is.
 *
 * MATCHED ON THE LABEL, case-insensitively, because the label is the
 * only thing two quotes to one person reliably share: the same motor
 * picked twice is two different line ids, and after a reimport it can
 * be a different row id as well. The label is what was printed and
 * what the customer read.
 */
export function offeredNotTaken(read: CustomerHistoryRead): PassedOver[] {
  const current = new Set<string>()
  for (const q of [...read.given, ...read.open]) {
    for (const l of q.lines) current.add(l.label.trim().toLowerCase())
  }
  const out: PassedOver[] = []
  const seen = new Set<string>()
  /* `replaced` is already newest first, so the first sighting of a
     label is the most recent one — which is the document worth
     naming beside it */
  for (const q of read.replaced) {
    const day = localDay(q.createdAt)
    for (const l of q.lines) {
      const key = l.label.trim().toLowerCase()
      if (key === '' || current.has(key) || seen.has(key)) continue
      seen.add(key)
      out.push({
        label: l.label,
        quoteId: q.id,
        reference: q.reference,
        day,
        amount: lineAmount(l).amount,
      })
    }
  }
  return out
}
