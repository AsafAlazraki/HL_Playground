/* ============================================================
   QUOTES WE HAVE MADE.

   Date, customer, subject, total, state — and clicking one opens
   it. That is the entire navigation model, and it is the specific
   thing production got wrong: their quotes list navigated to a URL
   whose `quoteId` parameter no page reads, so every click dropped
   the salesperson on a blank configurator.

   THE TOTAL HERE IS THE SAME FUNCTION THE DOCUMENT USES. A list
   that sums a quote its own way is how two numbers for one deal
   start to exist.
   ============================================================ */

import type { ReactElement } from 'react'
import { money } from './pricing'
import { quoteTotals } from './totals'
import { discardDraft, useQuotes } from './quotes'
import './quote.css'

export interface QuoteListProps {
  onOpen: (quoteId: string) => void
  /** highlighted row, when the stage already has one open */
  openId?: string | null
}

export function QuoteList({ onOpen, openId }: QuoteListProps): ReactElement {
  const quotes = useQuotes()

  if (quotes.length === 0) {
    return (
      <div className="qt-root qt-root--doc">
        <p className="qt-void">
          No quotes yet. Open a table, press <em>What goes with each one?</em>, pick one and press{' '}
          <em>Quote this one</em>.
        </p>
      </div>
    )
  }

  return (
    /* nothing in a list of quotes is sticky, so it keeps the trailing
       air on the scrollport — see `.qt-root--doc` in quote.css */
    <div className="qt-root qt-root--doc">
      <ul className="qt-list">
        {quotes.map((q) => {
          const totals = quoteTotals(q)
          return (
            <li key={q.id} className={`qt-list-row${openId === q.id ? ' is-open' : ''}`}>
              <button type="button" className="qt-list-open" onClick={() => onOpen(q.id)}>
                <span className="mono-label qt-list-when">{q.createdAt.slice(0, 10)}</span>
                <span className="qt-list-who">
                  {q.customer.name.trim() === '' ? (
                    <span className="qt-doc-blank">no customer yet</span>
                  ) : (
                    q.customer.name
                  )}
                </span>
                <span className="qt-list-what">{q.subjectLabel}</span>
                <span className="mono-label qt-list-state">
                  {q.state === 'issued' ? 'Given' : 'Draft'}
                  {q.supersedesId ? ' · new version' : ''}
                </span>
                <span className="qt-num qt-list-total">{money(totals.total)}</span>
              </button>
              {/* an ISSUED quote is never deleted: it was given to a
                  customer, and a document that can vanish cannot
                  answer "what did we quote them?" a month later */}
              {q.state === 'draft' ? (
                <button
                  type="button"
                  className="qt-linkbtn"
                  title="Throw this draft away"
                  onClick={() => discardDraft(q.id)}
                >
                  Discard
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
