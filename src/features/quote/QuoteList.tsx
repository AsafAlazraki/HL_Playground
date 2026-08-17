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

  /* ============================================================
     THE FIRST MONDAY SCREEN, and it has to be right, because the
     dock now draws Quotes whether or not any exist. It used to
     appear only when `quoteCount > 0`, which meant nobody could
     find quoting until they had already done it — so this page was
     unreachable exactly when it was the only page that mattered.

     IT NAMES THE THREE REAL CONTROLS, in the order they are pressed.
     The sentence used to say "press What goes with each one?", and
     that button has been called **Fitment** since commit 4c4a3e2
     renamed the place — a route instruction naming a control that is
     not on the screen is worse than no instruction, because the
     person concludes they are in the wrong app.

     THE TERSE FORM ON PURPOSE, not the module dashboard's four-part
     card. The load-bearing third line of that card is a count read
     from the store, and this feature's one invariant is that
     `useProjectStore` appears in exactly ONE of its files
     (freeze.ts) so that no drawn quote can touch live data. A count
     is not worth spending that on: the honest thing this screen
     knows is the route, and the route is what a person on their
     first Monday is missing.
     ============================================================ */
  if (quotes.length === 0) {
    return (
      <div className="qt-root qt-root--doc">
        <p className="qt-void">
          No quotes yet. Open a table from <em>Tables</em> on the bar, press <em>Fitment</em>, pick
          the row you are selling and press <em>Quote this one</em>.
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
