/* ============================================================
   EVERY QUOTE (qz-) — COCKPIT.

   MEASURED AT 1280x800 ON THE REAL SEED, with four quotes raised
   through the rebuilt flow so it was judged with something on it:

                     board lens    list lens
     register        NONE          NONE
     scale contrast  2.45x         2.18x    Cockpit's floor is 2.5x
     row height      ragged        90px
     rows in view    3 of 4        7         against the >=18 §2 asks
     the headline    "No customer  "no customer yet", italic, with
                     yet"          the boat under it in tertiary ink

   THE BOARD IS FOUR FIFTHS EMPTY AND SAYS SO FIVE TIMES. Five
   columns, four of them holding nothing, each drawing a full-height
   well with a sentence in it — an empty state at the size of a full
   one, which is the same fault the front door had. And the column
   headings are the hue: Draft grey, Issued blue, Negotiating amber,
   Won green, Lost red, the whole word washed by its own category.
   §3 puts a hue on a thing that HAS that kind; a column heading is
   a category label, not a deal.

   THE HEADLINE IS THE ABSENCE OF A CUSTOMER. The biggest words on
   every card and every row are "no customer yet" — the one thing
   that has not happened — while the boat, which is what the quote
   IS, sits under it in tertiary ink. A person scanning for the
   Stabicraft reads four identical headlines first.

   SO: A REGISTER. The reference, the customer, the boat, the day,
   where it is up to and what it comes to, at the Cockpit row
   height, sortable by any column and searchable — the same shape
   `DataScreen` takes, because they are the same kind of screen.
   The board stays exactly where it was, one press away, for the
   morning it is genuinely the right way to look.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { Field } from '@/ui'
import { money } from '@/lib/money'
import type { QuoteDef } from '@/types/model'
import { stagesOf, useStages, stageOf } from '@/features/pipeline'
import { useQuotes } from './quotes'
import { quoteTotals } from './totals'
import { localDay } from './day'
import './quotes-screen.css'

export interface QuotesScreenProps {
  onOpenQuote: (quoteId: string) => void
  /** the board, which is still the right way to look some mornings */
  onOpenBoard: () => void
  /** the diary — the long form of this list. Absent = the door is
   *  not drawn, and the screen still works. */
  onOpenHistory?: () => void
  onNewQuote: () => void
}

type SortBy = 'day' | 'total' | 'customer' | 'subject' | 'stage'

interface Row {
  id: string
  reference: string
  customer: string
  subject: string
  stage: string
  day: string
  /** sorted on, never printed — `total` is what a face prints */
  amount: number
  total: string
  unpriced: number
  by: string
  hay: string
}

export function QuotesScreen({
  onOpenQuote,
  onOpenBoard,
  onOpenHistory,
  onNewQuote,
}: QuotesScreenProps): ReactElement {
  const quotes = useQuotes()
  const slug = useProjectStore((s) => s.meta?.org?.slug ?? '')
  const at = useStages(slug)
  const [query, setQuery] = useState('')
  const [by, setBy] = useState<SortBy>('day')
  /* THE STAGE A PERSON IS LOOKING AT, or every stage. Not a
     multi-select: a dealer asks "what is sitting in Issued", one
     stage at a time, and a set of checkboxes over four stages is
     four controls answering a question nobody asked. */
  const [onlyStage, setOnlyStage] = useState('')

  const rows = useMemo<Row[]>(() => {
    const stages = stagesOf(slug)
    const name = new Map(stages.map((s) => [s.id, s.name]))
    return quotes.map((q: QuoteDef) => {
      const totals = quoteTotals(q)
      const customer = q.customer.name.trim()
      const stage = name.get(stageOf(q, at, stages)) ?? ''
      return {
        id: q.id,
        reference: q.reference,
        /* THE ABSENCE IS SAID QUIETLY AND IN ITS OWN COLUMN. It is
           still said — a quote nobody can be given is a fact a
           dealer needs — but it is not the headline. */
        customer: customer === '' ? 'nobody yet' : customer,
        subject: q.subjectLabel,
        stage,
        day: localDay(q.issuedAt ?? q.createdAt),
        amount: totals.total,
        total: money(totals.total),
        unpriced: totals.unpricedCount,
        by: q.preparedBy ?? '',
        hay: `${q.reference} ${customer} ${q.subjectLabel} ${stage} ${q.preparedBy ?? ''}`.toLowerCase(),
      }
    })
  }, [quotes, at, slug])

  const typed = query.trim().toLowerCase()
  const shown = useMemo(() => {
    const narrowed = onlyStage === '' ? rows : rows.filter((r) => r.stage === onlyStage)
    const list =
      typed === '' ? narrowed.slice() : narrowed.filter((r) => r.hay.includes(typed))
    /* THE SECOND KEY IS ALWAYS THE REFERENCE, so a sort is stable
       and the screen does not reshuffle its ties between paints. */
    const ref = (a: Row, b: Row): number => b.reference.localeCompare(a.reference, 'en-AU')
    list.sort((a, b) => {
      if (by === 'total') return b.amount - a.amount || ref(a, b)
      if (by === 'customer') return a.customer.localeCompare(b.customer, 'en-AU') || ref(a, b)
      if (by === 'subject') return a.subject.localeCompare(b.subject, 'en-AU') || ref(a, b)
      if (by === 'stage') return a.stage.localeCompare(b.stage, 'en-AU') || ref(a, b)
      return ref(a, b)
    })
    return list
  }, [rows, typed, by, onlyStage])

  /* ============================================================
     THE PIPELINE, COUNTED — and it is a control, not a chart.

     A board holding a handful of quotes was a table stretched to
     the height of the window with six hundred pixels of white
     under one row. Every ruler passed it: nothing overflowed,
     nothing was cut, every ratio cleared. It was still the worst
     screen in the app, because the Cockpit register's whole claim
     is DENSITY and a screen with nothing to be dense about has to
     answer a different question.

     The question a dealer actually asks a quotes board is not
     "list them" — it is "how much is sitting where". So the space
     above the rows carries one segment per stage with its count
     and its value, and pressing one narrows the list to it.
     Derived entirely from the rows already on screen: no figure
     here is computed from anything the quotes do not carry.

     ORDERED BY THE STAGE MODEL, NOT BY SIZE. The stages are a
     pipeline and their order is the order they happen in; sorting
     them by value would put a dealer's own process in an order
     their business does not have.
     ============================================================ */
  const pipeline = useMemo(() => {
    const seen = new Map<string, { stage: string; n: number; worth: number }>()
    for (const r of rows) {
      const key = r.stage === '' ? 'No stage' : r.stage
      const got = seen.get(key) ?? { stage: key, n: 0, worth: 0 }
      got.n += 1
      got.worth += r.amount
      seen.set(key, got)
    }
    return [...seen.values()]
  }, [rows])

  /* the widest segment is the ruler the others are drawn against,
     so an empty board draws no bars rather than dividing by zero */
  const biggest = pipeline.reduce((n, p) => Math.max(n, p.worth), 0)

  /* WHAT THE YARD HAS OUT, counted over what is SHOWN — a total
     under a filtered list that counted everything would be a figure
     about a list nobody is looking at. */
  const worth = shown.reduce((n, r) => n + r.amount, 0)

  return (
    <div className="qz" data-register="cockpit">
      <header className="qz-head">
        <div className="qz-head-say">
          <h1 className="t-display qz-name">Quotes</h1>
          {/* BOTH HALVES COUNT THE SAME LIST, and they did not. The
              figure was summed over what is SHOWN — correct, and for
              the stated reason: a total under a filtered list that
              counted everything is a figure about a list nobody is
              looking at. The COUNT beside it was `rows.length`, all
              of them. With the pipeline strip narrowing to one stage
              that read "2 quotes · $4,706 out", which is a sentence
              about nothing: neither the two nor the figure is wrong
              on its own and together they are false. The tools line
              below says "1 of 2", so nothing is hidden by agreeing. */}
          <p className="t-small qz-census">
            {shown.length} {shown.length === 1 ? 'quote' : 'quotes'} · {money(worth)} out
          </p>
        </div>
        {/* THE SAME THREE WAYS OF LOOKING the host's header carried,
            because this screen replaces that header rather than
            sitting under it — a page with two titles is the fault
            `QuoteStage` already argued itself out of once. */}
        <nav className="qz-ways" aria-label="Other ways to look">
          <button type="button" className="qz-way" onClick={onOpenBoard}>
            Board
          </button>
          {onOpenHistory ? (
            <button type="button" className="qz-way" onClick={onOpenHistory}>
              History
            </button>
          ) : null}
          <button type="button" className="qz-way qz-way--go" onClick={onNewQuote}>
            New quote
          </button>
        </nav>
      </header>

      {/* ============================================================
          ONE SEGMENT PER STAGE, AND PRESSING ONE NARROWS THE LIST.

          `aria-pressed` rather than a link or a tab: it is a filter
          that is on or off, and the same press turns it off again.
          The bar under each figure is the stage's share of the
          largest stage's value — a ruler inside the card rather
          than a chart beside it, so it costs no legend.
          ============================================================ */}
      {pipeline.length > 1 ? (
        <div className="qz-pipe" role="group" aria-label="Narrow by stage">
          {pipeline.map((p) => (
            <button
              key={p.stage}
              type="button"
              className="qz-stage"
              aria-pressed={onlyStage === p.stage}
              onClick={() => setOnlyStage(onlyStage === p.stage ? '' : p.stage)}
            >
              <span className="t-label qz-stage-name">{p.stage}</span>
              <span className="t-figure-lg qz-stage-worth">{money(p.worth)}</span>
              <span className="t-caption qz-stage-n">
                {p.n} {p.n === 1 ? 'quote' : 'quotes'}
              </span>
              <span
                className="qz-stage-bar"
                aria-hidden="true"
                style={
                  {
                    '--share': biggest === 0 ? 0 : p.worth / biggest,
                  } as Record<string, number>
                }
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="qz-tools">
        <Field
          label="Find a quote"
          value={query}
          onChange={setQuery}
          placeholder="A reference, a customer, a boat…"
          type="search"
          autoComplete="off"
        />
        {/* AND IT SAYS WHAT IS NOT BEING SHOWN. The curation contract
            `hl-journeys` calls the one interaction in the old app
            that is unambiguously right: narrow by a rule, name the
            rule, and STATE THE COUNT HIDDEN. A list that is quietly
            shorter than the board says it is, is a list a dealer
            will trust once and then not again. */}
        <p className="t-caption qz-count" aria-live="polite">
          {typed === ''
            ? onlyStage === ''
              ? `${shown.length} ${shown.length === 1 ? 'quote' : 'quotes'}`
              : `${shown.length} of ${rows.length} · ${onlyStage} only`
            : onlyStage === ''
              ? `${shown.length} of ${rows.length} match “${query}”`
              : `${shown.length} of ${rows.length} match “${query}” in ${onlyStage}`}
        </p>
      </div>

      <div className="qz-port">
        <table className="qz-table">
          {/* `table-layout: fixed` takes every column's width from the
              FIRST ROW, so widths set on body cells are read by
              nothing. A colgroup is the one place a fixed table's
              geometry can be stated once — DataScreen's own note
              carries what that cost when it was got wrong. */}
          <colgroup>
            <col className="qz-col--ref" />
            <col className="qz-col--who" />
            <col className="qz-col--what" />
            <col className="qz-col--day" />
            <col className="qz-col--stage" />
            <col className="qz-col--n" />
            <col className="qz-col--held" />
          </colgroup>
          <thead>
            <tr>
              <th className="qz-h qz-h--plain" scope="col">
                <span className="t-label">Reference</span>
              </th>
              <Head name="Customer" on={by === 'customer'} onPick={() => setBy('customer')} />
              <Head name="What it is for" on={by === 'subject'} onPick={() => setBy('subject')} />
              <Head name="Day" on={by === 'day'} onPick={() => setBy('day')} />
              {/* "WHERE IT IS", not "Where it is up to" — the longer
                  one wrapped its header to two lines against
                  one-line rows, which reads as a rendering fault
                  rather than as a heading. */}
              <Head name="Where it is" on={by === 'stage'} onPick={() => setBy('stage')} />
              <Head name="Comes to" figure on={by === 'total'} onPick={() => setBy('total')} />
              {/* UNPRICED LINES GET THEIR OWN COLUMN, and the ruler is
                  why. Said inside the money cell, "$31,000 + 1
                  unpriced" did not fit 150px and was HARD-CLIPPED —
                  no ellipsis, the warning simply gone, on four of six
                  rows. A column that cannot hold its own sentence is
                  not a column. */}
              <th className="qz-h qz-h--plain" scope="col">
                <span className="t-label">Not priced</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="qz-row">
                <td className="qz-c qz-c--ref">
                  <button type="button" className="qz-open" onClick={() => onOpenQuote(row.id)}>
                    {row.reference}
                  </button>
                </td>
                <td className={row.customer === 'nobody yet' ? 'qz-c qz-c--none' : 'qz-c'}>
                  {row.customer}
                </td>
                <td className="qz-c qz-c--what">{row.subject}</td>
                <td className="qz-c qz-c--day">{row.day}</td>
                <td className="qz-c qz-c--stage">{row.stage}</td>
                <td className="qz-c qz-c--n">{row.total}</td>
                {/* A SILENT $0 ON A SUMMARY IS THE CLASS OF FAULT
                    STAKEHOLDERS CATCH — `totals.ts` says so itself, so
                    a quote with an unpriced line says so rather than
                    quietly under-reporting. */}
                <td className={row.unpriced > 0 ? 'qz-c qz-c--held' : 'qz-c'}>
                  {row.unpriced > 0 ? `${row.unpriced} ${row.unpriced === 1 ? 'line' : 'lines'}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 ? (
          <p className="t-small qz-none">
            {rows.length === 0
              ? 'A quote is what a customer is handed — the boat, what goes with it, and the price. Press New quote to raise the first one.'
              : `Nothing here matches “${query}”. Clear the search to see all ${rows.length}.`}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Head({
  name,
  figure,
  on,
  onPick,
}: {
  name: string
  figure?: boolean
  on: boolean
  onPick: () => void
}): ReactElement {
  return (
    <th
      className={figure ? 'qz-h qz-h--n' : 'qz-h'}
      scope="col"
      aria-sort={on ? 'descending' : 'none'}
    >
      <button type="button" className="t-label qz-sort" onClick={onPick}>
        {name}
      </button>
    </th>
  )
}
