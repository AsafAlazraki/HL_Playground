/* ============================================================
   THE DIARY — every quote, and the drafts on top of it.

   WHAT THIS SCREEN IS, BESIDE THE QUOTE LIST NEXT DOOR. `QuoteList`
   is the shelf you take a quote off: twelve cards, newest first, a
   picture of each boat. This is the LEDGER — the screen you open
   when the question is "what did we send them in March", "which
   drafts are still open", "what happened to that one we redid". So
   it is filterable, it is cut into days, and it puts unfinished work
   at the top where somebody can pick it back up.

   THE FOUR THINGS IT ANSWERS, in the order they are drawn:

     1  WHAT IS UNFINISHED. The drafts shelf, ordered by when each
        was last touched rather than when it was started — a draft
        opened Monday and worked on all week is the one you want,
        and diary order buries it.
     2  WHAT KIND. Draft / Given / Replaced, counted, and each count
        is what pressing it WOULD show with the rest of the filter
        still on.
     3  WHO, WHEN, AND WHAT FOR. A customer, a span of days, and a
        typed word that reads the lines as well as the heading —
        "which quote had the F70 on it" is the question a
        salesperson actually types.
     4  WHAT HAPPENED TO IT. A reissued quote carries its version
        mark and opens the others in place.

   NOTHING DRAWN HERE IS COMPUTED FROM LIVE DATA. Every figure on a
   row is the quote's own frozen number, summed by `quoteTotals` —
   the same function the document and the print use, because a list
   that sums a quote its own way is how two numbers for one deal
   start to exist. The store is read for exactly two things and
   neither of them is on a row: how many tables exist, for the empty
   state's counted sentence, and whether a customer register exists
   at all.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { liveTableCount } from '@/features/crm'
import {
  discardDraft,
  localDay,
  money,
  quoteTotals,
  useQuotes,
  type QuoteDef,
} from '@/features/quote'
import { LedgerRow } from './row'
import {
  ANY_CUSTOMER,
  NO_CUSTOMER,
  NO_FILTER,
  SPAN_TITLE,
  STANDING_SAY,
  STANDING_TITLE,
  customerFacets,
  dayTitle,
  drafts,
  filterIsOpen,
  filterQuotes,
  groupByDay,
  indexQuotes,
  standingCounts,
  tally,
  type HistoryFilter,
  type SpanKey,
  type Standing,
} from './history'
import './history.css'

export interface QuoteHistoryProps {
  /** open one quote on the stage */
  onOpenQuote: (quoteId: string) => void
  /** the quote the stage already has open, so its row can say so */
  openId?: string | null
  /**
   * Open one customer's own history. Left off, the customer's name
   * on a row is plain text rather than a link that goes nowhere — a
   * control that does nothing is worse than no control.
   */
  onOpenCustomer?: (rowId: string) => void
}

const SPANS: SpanKey[] = ['all', 'today', 'week', 'month', 'year']
const STANDINGS: Standing[] = ['draft', 'given', 'replaced']

export function QuoteHistory({
  onOpenQuote,
  openId,
  onOpenCustomer,
}: QuoteHistoryProps): ReactElement {
  const quotes = useQuotes()
  const entities = useProjectStore((s) => s.entities)

  const [filter, setFilter] = useState<HistoryFilter>(NO_FILTER)
  /* which rows have their other versions showing. A Set, because the
     answer is per row and more than one may be open at once. */
  const [showing, setShowing] = useState<ReadonlySet<string>>(() => new Set<string>())

  /* the reader's own calendar day, read the way `day.ts` reads every
     other day in this app — not `.slice(0, 10)` off an ISO string,
     which is the UTC day and disagrees with the reference printed on
     the document it opens */
  const today = localDay(new Date().toISOString())

  const index = useMemo(() => indexQuotes(quotes), [quotes])
  const shown = useMemo(
    () => filterQuotes(quotes, index, filter, today),
    [quotes, index, filter, today],
  )
  const counts = useMemo(
    () => standingCounts(quotes, index, filter, today),
    [quotes, index, filter, today],
  )
  const people = useMemo(() => customerFacets(quotes), [quotes])
  const unfinished = useMemo(() => drafts(quotes), [quotes])
  const figures = useMemo(() => tally(quotes, index), [quotes, index])
  const groups = useMemo(() => groupByDay(shown), [shown])

  /* ============================================================
     A FRESH INSTALL HAS NO QUOTES, AND THE SCREEN SAYS SO HONESTLY.

     Four parts, which is this app's empty state everywhere: an
     eyebrow, what the place IS, what you already HAVE counted, and
     one act that works from where you are standing.

     The last part branches, because on a cleared install step one is
     impossible: a quote is written FROM a row, so telling somebody to
     open a table when the Tables panel reads "No tables yet" sends
     them to press a control that is not there. The count is the only
     thing this screen reads the store for.
     ============================================================ */
  if (quotes.length === 0) {
    const tables = liveTableCount(entities)
    return (
      <div className="hy-root">
        <div className="ds-aurora ds-grain hy-sky" aria-hidden="true" />
        <div className="hy-scroll">
          <div className="hy-page">
            <div className="hy-none">
              <span className="mono-label hy-eyebrow">
                {tables === 0 ? 'Nothing to quote from yet' : 'No history yet'}
              </span>
              <h2 className="hy-none-title">
                Every quote you write stays here, exactly as it was written.
              </h2>
              <p className="hy-none-say">
                The day, the customer, the rig and the numbers, frozen the moment you
                handed it over — so a quote given on Monday still says the same number in
                March, whatever the price file has done since.
              </p>
              <p className="hy-none-count">
                You have{' '}
                <strong>
                  {tables} {tables === 1 ? 'table' : 'tables'}
                </strong>{' '}
                and no quotes.
              </p>
              <p className="hy-none-do">
                {tables === 0 ? (
                  <>
                    A quote is written from a row, so a table comes first. Start one from{' '}
                    <em>New table</em> on the rail, or load your price file from{' '}
                    <em>Home</em> — the row you pick becomes the quote.
                  </>
                ) : (
                  <>
                    Open a table from <em>Tables</em> on the rail, press <em>Fitment</em>,
                    pick the row you are selling and press <em>Quote this one</em>.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const toggleVersions = (id: string): void =>
    setShowing((held) => {
      const next = new Set(held)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="hy-root">
      <div className="ds-aurora ds-grain hy-sky" aria-hidden="true" />
      <div className="hy-scroll">
        <div className="hy-page">
          <header className="hy-head">
            <span className="mono-label hy-eyebrow">History</span>
            <h1 className="hy-title">Every quote you have written.</h1>
            <p className="hy-say">
              What was offered, to whom, on what day, and what happened to it afterwards.
              Each one is a photograph: the numbers on it are the numbers it was given,
              not today&rsquo;s.
            </p>

            {/* THE COUNTED FACTS. Every one of them is a length —
                nothing here is a projection, a forecast or a
                conversion rate, because this app records what was
                offered and never claims to know what was bought. */}
            <div className="hy-tally">
              <Figure n={figures.quotes} of={figures.quotes === 1 ? 'quote' : 'quotes'} />
              <Figure n={figures.drafts} of="still open" />
              <Figure n={figures.given} of="given" />
              <Figure n={figures.replaced} of="replaced" />
              <Figure
                n={figures.customers}
                of={figures.customers === 1 ? 'customer' : 'customers'}
              />
            </div>
          </header>

          {/* ── UNFINISHED WORK, FIRST ─────────────────────────── */}
          {unfinished.length > 0 ? (
            <section className="hy-shelf" aria-label="Drafts">
              <div className="hy-shelf-head">
                <h2 className="hy-shelf-title">Pick up where you left off</h2>
                <p className="hy-shelf-say">
                  {unfinished.length === 1
                    ? 'One draft, still being written.'
                    : `${unfinished.length} drafts, most recently worked on first.`}
                </p>
              </div>
              <div className="hy-shelf-rail">
                {unfinished.map((q, i) => (
                  <DraftCard
                    key={q.id}
                    quote={q}
                    /* THE ONE PRIMARY ACT ON THE PAGE, on the one
                       draft somebody was last in. Every card opens
                       on a press; only this one says so in accent. */
                    primary={i === 0}
                    onOpen={onOpenQuote}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* ── THE FILTER ──────────────────────────────────────── */}
          <section className="hy-filters" aria-label="Narrow the list">
            <div className="hy-chips" role="group" aria-label="What happened to it">
              <button
                type="button"
                className="hy-chip"
                aria-pressed={filter.standing === 'all'}
                onClick={() => setFilter((f) => ({ ...f, standing: 'all' }))}
              >
                Everything
                <span className="hy-chip-n">{counts.all}</span>
              </button>
              {STANDINGS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="hy-chip"
                  aria-pressed={filter.standing === s}
                  title={STANDING_SAY[s]}
                  onClick={() => setFilter((f) => ({ ...f, standing: s }))}
                >
                  {STANDING_TITLE[s]}
                  <span className="hy-chip-n">{counts[s]}</span>
                </button>
              ))}
            </div>

            <div className="hy-find">
              <label className="mono-label hy-picker-label" htmlFor="hy-find">
                Find
              </label>
              <input
                id="hy-find"
                className="hy-find-input"
                type="search"
                value={filter.query}
                placeholder="A reference, a customer, a boat, a line on it"
                onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
              />
            </div>

            <div className="hy-pickers">
              <div className="hy-picker">
                <label className="mono-label hy-picker-label" htmlFor="hy-who">
                  Customer
                </label>
                <select
                  id="hy-who"
                  className="hy-select"
                  value={filter.customer}
                  onChange={(e) => setFilter((f) => ({ ...f, customer: e.target.value }))}
                >
                  <option value={ANY_CUSTOMER}>Anyone</option>
                  {people.map((p) => (
                    <option key={p.rowId} value={p.rowId}>
                      {p.name === '' ? 'A customer with no name yet' : p.name} ({p.count})
                    </option>
                  ))}
                  {figures.unfiled > 0 ? (
                    <option value={NO_CUSTOMER}>
                      Typed names, not in the register ({figures.unfiled})
                    </option>
                  ) : null}
                </select>
              </div>

              <div className="hy-picker">
                <label className="mono-label hy-picker-label" htmlFor="hy-when">
                  Written
                </label>
                <select
                  id="hy-when"
                  className="hy-select"
                  value={filter.span}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, span: e.target.value as SpanKey }))
                  }
                >
                  {SPANS.map((s) => (
                    <option key={s} value={s}>
                      {SPAN_TITLE[s]}
                    </option>
                  ))}
                </select>
              </div>

              {filterIsOpen(filter) ? null : (
                <button
                  type="button"
                  className="hy-linkbtn"
                  onClick={() => setFilter(NO_FILTER)}
                >
                  Show everything
                </button>
              )}
            </div>
          </section>

          {/* ── THE LEDGER ──────────────────────────────────────── */}
          {shown.length === 0 ? (
            /* THE DIARY IS NOT EMPTY — THE FILTER IS, and the
               difference matters: a person who has just typed three
               words needs to be told which of them did it. */
            <div className="hy-nomatch">
              <p className="hy-nomatch-say">
                {figures.quotes === 1
                  ? 'The one quote you have does not match this.'
                  : `None of your ${figures.quotes} quotes match this.`}{' '}
                {filter.query.trim() !== ''
                  ? `Nothing carries “${filter.query.trim()}” in its reference, its customer, its subject or any line on it.`
                  : filter.standing !== 'all'
                    ? STANDING_SAY[filter.standing]
                    : 'Try a wider span of days, or anyone.'}
              </p>
              <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setFilter(NO_FILTER)}>
                Show everything
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <section className="hy-group" key={group.day} aria-label={group.day}>
                <div className="hy-group-head">
                  <h2 className="hy-group-title">{dayTitle(group.day, today)}</h2>
                  <span className="mono-label hy-group-stamp">{group.day}</span>
                  <span className="hy-group-n">
                    {group.quotes.length} {group.quotes.length === 1 ? 'quote' : 'quotes'}
                  </span>
                </div>
                <ul className="hy-list">
                  {group.quotes.map((q, i) => (
                    <LedgerRow
                      key={q.id}
                      quote={q}
                      index={index}
                      i={i}
                      isOpen={openId === q.id}
                      versions
                      showingVersions={showing.has(q.id)}
                      onToggleVersions={() => toggleVersions(q.id)}
                      onOpenQuote={onOpenQuote}
                      onOpenCustomer={onOpenCustomer}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   A COUNTED FACT
   ============================================================ */

function Figure({ n, of }: { n: number; of: string }): ReactElement {
  return (
    <span className="hy-fig">
      <span className="hy-fig-n">{n}</span>
      <span className="hy-fig-of">{of}</span>
    </span>
  )
}

/* ============================================================
   ONE UNFINISHED QUOTE
   ============================================================ */

function DraftCard({
  quote,
  primary,
  onOpen,
}: {
  quote: QuoteDef
  primary: boolean
  onOpen: (id: string) => void
}): ReactElement {
  const totals = quoteTotals(quote)
  const who = quote.customer.name.trim()
  /* the day it was LAST TOUCHED, which is the fact that matters
     about unfinished work; the day it was started is on its row in
     the ledger below */
  const touched = localDay(quote.updatedAt || quote.createdAt)

  return (
    <div className="hy-card ds-rise">
      <button
        type="button"
        className="hy-card-open"
        onClick={() => onOpen(quote.id)}
        aria-label={`Resume draft ${quote.reference} — ${quote.subjectLabel}`}
      >
        {/* NOT `mono-label`. That is the 11px UPPERCASE label style, and
            "Last worked on 2026-08-27" is a sentence with a VALUE in it —
            uppercasing it makes a date read as a stamp and breaks rule 3
            the same way `crm.css` records having broken it. The words are
            sentence case; only the figure is mono. */}
        <span className="hy-card-when">
          Last worked on <span className="hy-stamp">{touched}</span>
        </span>
        <span className="hy-card-what">{quote.subjectLabel}</span>
        <span className="hy-card-who">
          {who === '' ? <span className="hy-blank">no customer yet</span> : who}
        </span>
      </button>
      <div className="hy-card-foot">
        <span className="hy-card-total">{money(totals.total)}</span>
        <span className="hy-card-acts">
          {/* an unfinished quote is the one thing on this page you can
              throw away, and it is undoable nowhere — so it is said
              plainly rather than hidden behind a confirm sheet the
              way a destructive act would be */}
          <button
            type="button"
            className="hy-linkbtn"
            title="Throw this draft away"
            onClick={() => discardDraft(quote.id)}
          >
            Discard
          </button>
          <button
            type="button"
            className={primary ? 'ds-btn ds-btn--primary ds-btn--sm' : 'ds-btn ds-btn--secondary ds-btn--sm'}
            onClick={() => onOpen(quote.id)}
          >
            Resume
          </button>
        </span>
      </div>
    </div>
  )
}
