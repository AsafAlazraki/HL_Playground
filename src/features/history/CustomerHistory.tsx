/* ============================================================
   ONE CUSTOMER, AND EVERYTHING WE HAVE PUT IN FRONT OF THEM.

   THE QUESTION THIS SCREEN ANSWERS is the one a salesperson asks
   before they pick up the phone: what have we quoted them, what did
   we quote them LAST, what changed between the two, and what did we
   put in front of them that is on nothing current.

   READ THE ONE WORDING RULE BEFORE CHANGING ANY SENTENCE HERE.

   Nothing in this app records that a customer BOUGHT anything. There
   is no won, no lost, no order, no deposit and no pipeline stage,
   because none of those is a fact the data carries — production
   shipped all three keyed on fields nothing ever wrote, and a screen
   that reports a sale nobody recorded is worse than a screen that
   does not mention sales.

   So this page says exactly three things about a document, and each
   is checkable against the document itself:

     GIVEN      it was handed over, and it is still the current word.
     REPLACED   it was handed over, and a later version was made.
     STILL OPEN it is a draft; nothing has been handed over.

   And one thing about a LINE: it was on a version that has since
   been replaced, and it is on none of their current quotes. That is
   not "they turned it down" and this screen must never say it is.
   It is still the most useful sentence on the page, because it is
   the list of things worth asking about.

   WHAT IS FROZEN AND WHAT IS LIVE, on one screen, deliberately.
   The contact details at the top are read from the register NOW —
   they are how you reach them today. Every name, number and figure
   below is the document's own frozen copy. When the two differ the
   page says so, because that difference is the guarantee working:
   a name corrected on Friday does not rewrite the quote handed over
   in March.
   ============================================================ */

import { useMemo } from 'react'
import type { ReactElement } from 'react'
import { ArrowLeft, Plus } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { useProjectStore } from '@/store/useProjectStore'
import { customerRegister, readCustomer } from '@/features/crm'
import { money, useQuotes, type QuoteDef } from '@/features/quote'
import {
  customerHistory,
  indexQuotes,
  offeredNotTaken,
  type CustomerHistoryRead,
  type HistoryIndex,
} from './history'
import { quoteAgain, whyNotAgain } from './again'
import { LedgerRow } from './row'
import './history.css'

export interface CustomerHistoryProps {
  /** the register row this history is about */
  rowId: string
  onOpenQuote: (quoteId: string) => void
  /** back to the diary. Left off, no back control is drawn. */
  onBack?: () => void
}

export function CustomerHistory({
  rowId,
  onOpenQuote,
  onBack,
}: CustomerHistoryProps): ReactElement {
  const quotes = useQuotes()
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const index = useMemo(() => indexQuotes(quotes), [quotes])
  const read = useMemo(() => customerHistory(rowId, quotes, index), [rowId, quotes, index])
  const passed = useMemo(() => offeredNotTaken(read), [read])

  /* THE REGISTER, READ NOW — this is the half of the screen that is
     allowed to be live, and it is the only half. */
  const table = customerRegister(entities)
  const row = table ? (rowsByEntity[table.id] ?? []).find((r) => r.id === rowId) : undefined
  const filed = table && row ? readCustomer(table, row) : undefined

  /* the name to head the page with: the register's when the row is
     still there, otherwise the one their most recent document was
     addressed with — never a placeholder that could be mistaken for
     a name somebody typed */
  const heading = filed?.name.trim() !== undefined && filed?.name.trim() !== ''
    ? (filed?.name.trim() as string)
    : (read.addressedAs[0] ?? '')

  /* the newest quote to them is what a second quote starts from */
  const source: QuoteDef | undefined = read.all[0]
  const why = source ? whyNotAgain(source) : ''

  return (
    <div className="hy-root">
      <div className="ds-aurora ds-grain hy-sky" aria-hidden="true" />
      <div className="hy-scroll">
        <div className="hy-page">
          {onBack ? (
            <button type="button" className="hy-back" onClick={onBack}>
              <ArrowLeft size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              All quotes
            </button>
          ) : null}

          <header className="hy-cust-head">
            <div className="hy-cust-id">
              <span className="mono-label hy-eyebrow">Customer history</span>
              <h1 className="hy-title">
                {heading === '' ? <span className="hy-blank">no name yet</span> : heading}
              </h1>

              {filed && filed.contact.length > 0 ? (
                <p className="hy-cust-contact">{filed.contact.join('  ·  ')}</p>
              ) : null}

              {/* WHEN THE ROW HAS GONE, SAY WHAT SURVIVES. Removing a
                  customer takes the row, not the documents — every
                  quote below still opens and still prints, because
                  each kept its own copy of the name and details it
                  was given. */}
              {filed === undefined ? (
                <p className="hy-cust-also">
                  This customer is no longer in the register, so there are no current
                  contact details to show. Every quote below still opens and still prints
                  — each one kept its own copy of the name and details it was given.
                </p>
              ) : null}

              {/* THE FREEZE, SHOWN RATHER THAN CONFESSED. More than
                  one name here is not a fault: it means a document
                  addressed in March still says what it said in March.
                  Drawn only when there IS a difference. */}
              {read.addressedAs.length > 1 ||
              (filed !== undefined &&
                read.addressedAs.length === 1 &&
                read.addressedAs[0] !== filed.name.trim()) ? (
                <p className="hy-cust-also">
                  Their documents were addressed to{' '}
                  {read.addressedAs.map((n, i) => (
                    <span key={n}>
                      {i > 0 ? ' and ' : ''}
                      <strong>{n}</strong>
                    </span>
                  ))}
                  . A quote keeps the name it was given, so correcting the register does
                  not rewrite a document already handed over.
                </p>
              ) : null}
            </div>

            <div className="hy-cust-acts">
              {source ? (
                why === '' ? (
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary"
                    onClick={() => {
                      const made = quoteAgain(source)
                      if (made) onOpenQuote(made.id)
                    }}
                  >
                    <Plus size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
                    Quote them again
                  </button>
                ) : (
                  /* A THING THAT CANNOT BE DONE SAYS WHY, WHERE IT IS
                     — never a disabled control with no explanation. */
                  <p className="hy-cust-why">{why}</p>
                )
              ) : null}
              {source && why === '' ? (
                <p className="hy-cust-why">
                  Starts from <strong>{source.subjectLabel}</strong> — the same row, priced
                  at today&rsquo;s figures, addressed to them from the register. The quote
                  it copies is not touched.
                </p>
              ) : null}
            </div>
          </header>

          {read.all.length === 0 ? (
            <div className="hy-none">
              <h2 className="hy-none-title">Nothing has been quoted to them yet.</h2>
              <p className="hy-none-say">
                A quote is written from the row you are selling. Press{' '}
                <em>New quote</em> at the foot of the rail, pick what you are selling,
                and name this customer at the top of the quote.
              </p>
            </div>
          ) : (
            <>
              <div className="hy-tally">
                <Fig
                  n={String(read.all.length)}
                  of={read.all.length === 1 ? 'quote' : 'quotes'}
                />
                <Fig n={String(read.given.length)} of="given" />
                <Fig n={String(read.open.length)} of="still open" />
                <Fig n={String(read.replaced.length)} of="replaced" />
                <Fig n={money(read.givenTotal)} of="on quotes given" />
                {read.firstDay ? (
                  <Fig n={read.firstDay} of="first quoted" />
                ) : null}
              </div>

              <Band
                title="Still being written"
                say="Drafts. Nothing here has been handed over, and every one of them can still be changed."
                quotes={read.open}
                index={index}
                onOpenQuote={onOpenQuote}
              />

              <Band
                title="Given to them"
                say="Handed over, and still the current word. A given quote is read-only — the only act left on one is making a new version."
                quotes={read.given}
                index={index}
                onOpenQuote={onOpenQuote}
              />

              <Band
                title="Replaced by a later version"
                say="Handed over, and then reissued. Both documents still exist and neither was edited to make the other."
                quotes={read.replaced}
                index={index}
                onOpenQuote={onOpenQuote}
              />

              {passed.length > 0 ? (
                <section className="hy-band" aria-label="Offered and on nothing current">
                  <div className="hy-band-head">
                    <h2 className="hy-band-title">Offered, and on nothing current</h2>
                    <p className="hy-band-say">
                      {passed.length === 1 ? 'One line was' : `${passed.length} lines were`}{' '}
                      on a version that has since been replaced, and{' '}
                      {passed.length === 1 ? 'is' : 'are'} on none of their given or open
                      quotes today. That is what the documents say — nothing here records
                      a decision by the customer, so this is a list of things worth asking
                      about rather than a list of things they turned down.
                    </p>
                  </div>
                  <ul className="hy-passed">
                    {passed.map((p) => (
                      <li className="hy-passed-row" key={`${p.quoteId}:${p.label}`}>
                        <span className="hy-passed-label">{p.label}</span>
                        <span className="hy-passed-from">
                          {p.reference} · {p.day}
                        </span>
                        <span className="hy-passed-amt">
                          {p.amount === null ? (
                            <span className="hy-blank">not priced</span>
                          ) : (
                            money(p.amount)
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   A COUNTED FACT. Mono, tabular, the size of a heading; the word
   under it is the label. Money comes through as an already-formatted
   string so the one formatter still owns every figure.
   ============================================================ */

function Fig({ n, of }: { n: string; of: string }): ReactElement {
  return (
    <span className="hy-fig">
      <span className="hy-fig-n">{n}</span>
      <span className="hy-fig-of">{of}</span>
    </span>
  )
}

/* ============================================================
   ONE HEADING AND THE QUOTES UNDER IT.

   AN EMPTY BAND IS STILL DRAWN, and that is the decision worth
   defending: "Given to them — nothing yet" is a fact a salesperson
   needs before a call, and a band that vanishes when it is empty
   makes them count the three headings to work out which one is
   missing. It costs one sentence and it answers the question.
   ============================================================ */

function Band({
  title,
  say,
  quotes,
  index,
  onOpenQuote,
}: {
  title: string
  say: string
  quotes: readonly QuoteDef[]
  index: HistoryIndex
  onOpenQuote: (id: string) => void
}): ReactElement {
  return (
    <section className="hy-band" aria-label={title}>
      <div className="hy-band-head">
        <h2 className="hy-band-title">{title}</h2>
        <p className="hy-band-say">{say}</p>
      </div>
      {quotes.length === 0 ? (
        <p className="hy-band-none">Nothing yet.</p>
      ) : (
        <ul className="hy-list">
          {quotes.map((q, i) => (
            <LedgerRow
              key={q.id}
              quote={q}
              index={index}
              i={i}
              onOpenQuote={onOpenQuote}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export type { CustomerHistoryRead }
