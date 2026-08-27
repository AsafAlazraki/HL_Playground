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
import { HELD_AS_LINK, useImageDisplay } from '@/lib/imageSources'
import { localDay } from './day'
import { money } from './pricing'
import { quoteTotals } from './totals'
import { discardDraft, useQuotes } from './quotes'
import { FrozenPhoto } from './photo'
import type { QuoteDef } from './types'
import './quote.css'

export interface QuoteListProps {
  onOpen: (quoteId: string) => void
  /** highlighted row, when the stage already has one open */
  openId?: string | null
  /**
   * How many tables are on the sheet — the ONE fact the empty state
   * needs and this feature is not allowed to look up.
   *
   * `useProjectStore` appears in exactly one file of this feature
   * (freeze.ts) so that no drawn quote can touch live data, and that
   * invariant is worth more than a count. So the stage reads it and
   * hands it down: `QuoteStage` is in `src/app`, it already knows the
   * sheet, and it is the only caller that has to change.
   *
   * Left undefined, the empty state falls back to the route sentence
   * without claiming a count it does not have.
   */
  tableCount?: number
}

export function QuoteList({ onOpen, openId, tableCount }: QuoteListProps): ReactElement {
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

     AND IT ASKED FOR A TABLE THAT MIGHT NOT EXIST. That four-step
     sentence was the WHOLE page on a cleared install: an otherwise
     blank screen telling somebody to open a table from a bar whose
     Tables panel reads "No tables yet." Step one was impossible, so
     none of the four could be followed, and the page's own honest
     answer — that a quote is written FROM a row and a row has to
     exist first — was the one thing it did not say.

     So there are two states, and which one is drawn depends on a fact
     this feature is not allowed to look up (see `tableCount`). Both
     take the module dashboard's four-part shape, which is the house
     empty state: eyebrow, what the thing IS, what you already have,
     one step that works from here.
     ============================================================ */
  if (quotes.length === 0) {
    /* nothing on the sheet to quote FROM — the route has to start
       one surface earlier, and it says so rather than sending a person
       to press a control that is not there yet */
    const nowhereToStart = tableCount === 0

    return (
      <div className="qt-root qt-root--doc qt-root--none">
        {/* the ground, carrying nothing — ds.css removes it under
            reduced transparency and higher contrast */}
        <div className="ds-aurora ds-grain qt-sky" aria-hidden="true" />

        <div className="qt-none">
          <span className="mono-label qt-none-eyebrow">
            {nowhereToStart ? 'Nothing to quote from yet' : 'No quotes yet'}
          </span>

          {/* WHAT THE PLACE IS, AS A TITLE. The four parts were all
              here and all set as paragraphs, so the card read as a
              notice rather than as a screen — and this is the page a
              salesperson lands on before they have made anything.
              The sentence under it is unchanged; only its first
              clause is promoted to the heading it always was. */}
          <h2 className="qt-none-title">A quote is one rig, one customer, one moment.</h2>

          <p className="qt-none-say">
            The row you are selling, frozen with its prices on the day you hand it
            over — so a quote given on Monday still says the same number on Friday.
          </p>

          {/* WHAT YOU ALREADY HAVE, counted, and only when the stage
              handed the count down. A blank screen reading "nothing
              here" at somebody who has just loaded fifty-two tables
              reads as though the app had lost them — the argument is
              `md-empty`'s and it holds here. */}
          {tableCount === undefined ? null : (
            <p className="qt-none-count">
              You have{' '}
              <strong>
                {tableCount} {tableCount === 1 ? 'table' : 'tables'}
              </strong>{' '}
              and no quotes.
            </p>
          )}

          <p className="qt-none-do">
            {nowhereToStart ? (
              <>
                A quote is written from a row, so a table comes first. Start one from{' '}
                <em>New table</em> on the bar, or load your price file from{' '}
                <em>Home</em> — then the row you pick becomes the quote.
              </>
            ) : (
              <>
                Open a table from <em>Tables</em> on the bar, press <em>Fitment</em>,
                pick the row you are selling and press <em>Quote this one</em>.
              </>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    /* nothing in a list of quotes is sticky, so it keeps the trailing
       air on the scrollport — see `.qt-root--doc` in quote.css */
    <div className="qt-root qt-root--doc">
      <ul className="qt-list">
        {quotes.map((q, i) => {
          const totals = quoteTotals(q)
          return (
            <li
              key={q.id}
              className={`qt-list-row ds-rise${openId === q.id ? ' is-open' : ''}`}
              style={{ ['--i' as string]: i }}
            >
              <button type="button" className="qt-list-open" onClick={() => onOpen(q.id)}>
                {/* THE RIG, WHERE WE HOLD A PICTURE OF IT. The photograph is
                    the quote's own frozen `subjectImage` — the same address
                    the document prints — so a row of the diary shows the boat
                    that was quoted and never a stand-in for it. */}
                <RowShot quote={q} />

                <span className="qt-list-say">
                  <span className="qt-list-who">
                    {q.customer.name.trim() === '' ? (
                      <span className="qt-doc-blank">no customer yet</span>
                    ) : (
                      q.customer.name
                    )}
                  </span>
                  <span className="qt-list-what">{q.subjectLabel}</span>
                </span>

                {/* THE DEALER'S OWN CALENDAR DAY, not UTC's. `.slice(0, 10)` on
                    the stored instant named the UTC day, so in any zone ahead of
                    UTC this column disagreed with the reference on the document
                    it opens — measured at UTC+10, a quote raised at 02:28 on the
                    18th listed as the 17th. See `localDay`. */}
                <span className="mono-label qt-list-when">{localDay(q.createdAt)}</span>
                <span
                  className={`mono-label qt-list-state${
                    q.state === 'issued' ? ' is-given' : ''
                  }`}
                >
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

/* ============================================================
   THE PICTURE ON A ROW — or the honest absence of one.

   The quote froze an `ImageRef` at the moment it was raised and it
   points at a third-party host; `imageSources` decides once per HOST
   whether an address may be painted at all, and shares that verdict
   with the table cell, the view page, the build and the document.
   When it says no, this draws the one wording the app settled on
   rather than a broken glyph or a hatched rectangle — so a diary of
   twelve quotes reads as a convention somebody chose instead of as
   twelve separate faults.

   `aria-hidden`, because the row's own button already announces the
   customer and the rig: a picture of the boat beside its name is not
   a second fact.
   ============================================================ */
function RowShot({ quote }: { quote: QuoteDef }): ReactElement {
  const { paint } = useImageDisplay(quote.subjectImage?.src ?? '')
  return (
    <span className="qt-list-shot" aria-hidden="true">
      {quote.subjectImage && paint ? (
        <FrozenPhoto
          img={quote.subjectImage}
          fallbackAlt={quote.subjectLabel}
          className="qt-list-img"
          w={128}
          h={96}
        />
      ) : (
        <span className="mono-label qt-list-held">{HELD_AS_LINK}</span>
      )}
    </span>
  )
}
