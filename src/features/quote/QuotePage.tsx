/* ============================================================
   ONE QUOTE, IN WHICHEVER STATE IT IS IN.

   A draft is a screen you work on. An issued quote is a document
   you print. They are the same quote and there is no third thing —
   which is why this file is a switch and not a mode flag threaded
   through two hundred lines.

   PRINTING IS THE BROWSER'S OWN. One click and a system dialog; the
   @page rules in quote.css do the rest. No PDF library, because a
   second renderer is a second layout that can disagree with the
   screen, and production's does.

   AFTER ISSUE the only action left is "Make a new version": a copy
   in a fresh draft that carries `supersedesId`, so the conversation
   has a history and neither document was edited behind anyone's
   back.

   THE SENTENCE BELOW USED TO PROMISE MORE THAN THE APP DID. It read
   "and says on it that it supersedes this one", and nothing on the
   copy said anything: `supersedesId` reached the diary as " · new
   version" and reached the printed document nowhere. `QuoteDocument`
   now captions a superseding copy REVISED QUOTATION, which is the
   most that can be said from frozen data — `makeNewVersion` freezes
   the superseded quote's ID and not its REFERENCE, so the document
   cannot name it without reading the live registry, and it never
   does that. The sentence says what the app does now.
   ============================================================ */

import { useState } from 'react'
import type { ReactElement } from 'react'
import { ArrowUUpLeft, Printer, UserCircle } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { localDay } from './day'
import { QuoteBuild } from './QuoteBuild'
import { QuoteDocument } from './QuoteDocument'
import { QuoteEditor } from './QuoteEditor'
import type { FlowStop } from './flow'
import { makeNewVersion, useQuote } from './quotes'
import type { QuoteDef } from './types'
import './quote.css'

export interface QuotePageProps {
  quoteId: string
  /** the stage's navigation — used when a new version is made */
  onOpenQuote?: (quoteId: string) => void
  /** open the customer this quote was addressed to. Absent = the
   *  door is not drawn, and both branches below still work. */
  onOpenCustomer?: (rowId: string) => void
}

/* THE DAY IS READ IN THE DEALER'S OWN CALENDAR, not UTC. This banner
   used to take `.slice(0, 10)` off `issuedAt` and so disagreed with
   the document's own DATE plate and with the reference by a day, every
   morning, in any zone ahead of UTC. `localDay` carries the whole
   measurement — and the quotes list had the same fault, which is why
   it is one shared function and not two. */

export function QuotePage({
  quoteId,
  onOpenQuote,
  onOpenCustomer,
}: QuotePageProps): ReactElement {
  const quote = useQuote(quoteId)

  /* `qt-root--doc` IS "NOTHING IN HERE IS STICKY", and it is on the two
     branches that end on ordinary content rather than on the draft's
     total bar. Only those may take trailing padding on the scrollport:
     a `position: sticky` footer is floored by its scroll container's
     content box, so 96px of padding once lifted the total 96px off the
     bottom edge and let the quote go on painting underneath it. See
     `.qt-root` in quote.css. */
  if (!quote) {
    return (
      <div className="qt-root qt-root--doc">
        <p className="qt-void">That quote is no longer here.</p>
      </div>
    )
  }

  /* `qt-root--edit` IS "THE TOTAL IS NOT IN THE SCROLL". The draft is a
     column: the document scrolls in `.qt-edit` and the total sits under
     that scrollport as its sibling, so no line of the quote can ever
     pass behind it. The alternative — padding the scrollport so sticky
     content clears the bar — is the trap the note on `.qt-root` was
     written from. See QuoteEditor's own return. */
  if (quote.state === 'draft') {
    return <QuoteDraft quote={quote} onOpenCustomer={onOpenCustomer} />
  }

  return (
    <div className="qt-root qt-root--doc">
      {/* the controls are OUTSIDE the document, and print hides
          everything that is not the document itself */}
      <div className="qt-issued-head">
        <div className="qt-issued-bar">
          <p className="qt-issued-say mono-label">
            Given to the customer{quote.issuedAt ? ` · ${localDay(quote.issuedAt)}` : ''}
          </p>
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            Print
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const next = makeNewVersion(quote.id)
              if (next) onOpenQuote?.(next.id)
            }}
          >
            <ArrowUUpLeft size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            Make a new version
          </button>
          {/* THE WAY TO THE REST OF THE CONVERSATION. An issued quote
              is frozen and this changes nothing on it — the id it
              follows is the "open this row" pointer, and every word
              printed below came from the document's own frozen copy.
              Drawn outside `.qt-doc`, so it is on the screen and
              never on the customer's paper. */}
          {quote.customerRef && onOpenCustomer ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const ref = quote.customerRef
                if (ref) onOpenCustomer(ref.rowId)
              }}
            >
              <UserCircle size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              Their other quotes
            </button>
          ) : null}
        </div>

        {/* ============================================================
            WHY THERE IS NOTHING TO TYPE ON.

            This page has no inputs, no add-a-line control and no
            adjustment doors, and it used to say nothing at all about
            that: a salesperson looking for the field they had been
            typing in five minutes earlier found a document and no
            explanation. `mutate` refuses every edit to an issued quote —
            correctly — and DESIGN_PRINCIPLES rule 10 is that a refusal
            is a sentence with a reason IN THE PLACE where the thing is
            refused, never a control that is quietly absent.

            So it is a sentence, it says why, and it names what the
            person CAN do — the control it names is the one immediately
            above it. It sits outside `.qt-doc`, so it is on the screen
            and never on the customer's paper.
            ============================================================ */}
        <p className="qt-issued-why">
          Nothing here can be changed — it is the record of what the customer was offered.{' '}
          <em>Make a new version</em> opens a draft that prints as a revised quotation.
        </p>
      </div>

      <QuoteDocument quote={quote} />
    </div>
  )
}

/* ============================================================
   A DRAFT IS TWO OF THE FLOW'S THREE MOMENTS.

   CONFIGURE is for BUILDING: one decision at a time, with what
   fits, why it fits and what it does to the price. ADDRESS is for
   FINISHING: who it is for, the adjustments, the tax rate, the
   contact lines, the re-read and the handover. They are not two
   modes of a quote — a quote has exactly two states and they are
   `draft` and `issued`. They are two moments of raising one, and
   every line either one produces was minted and persisted by the
   same `freeze.ts`, so moving between them loses nothing and
   duplicates nothing.

   ADDRESS WAS ALREADY BUILT AND WAS NOT NAMED. This surface is
   `QuoteEditor`, and until now it was reached by a bordered button
   in the corner of the price bar reading "The whole quote" — framed
   as an alternative READING of a draft rather than as the third
   moment of raising one, while the actual "address" act was a shut
   accordion 3,277px down the configurator (see QuoteBuild's own
   note, with the measurement). CONFIGURATOR.md §A asks for Choose ·
   Configure · Address and says address "is a step, not a footnote".
   Nothing new was built to answer that: the step existed, the
   footnote was deleted, and the flow line names what is left.

   WHY CONFIGURE OPENS FIRST. A freshly minted quote is a hull, a
   customer nobody has typed yet, and a row of decisions waiting — a
   person arriving at it is BUILDING.

   IT IS SESSION STATE AND NOTHING ELSE. Which moment is up says
   nothing about anybody's business, so it does not reach the project
   store, does not persist and does not export.

   AND THE ACTION BAR IS GONE FROM HERE. This published a "Step by
   step" button into `.pagebar` whenever the sheet was up — a second
   fixed strip under the price bar, saying in a dock what the flow
   line now says in the bar itself, in the place a person is already
   reading the total. QuoteBuild's own note records why one bar at
   the foot of this column is the limit.
   ============================================================ */

function QuoteDraft({
  quote,
  onOpenCustomer,
}: {
  quote: QuoteDef
  onOpenCustomer?: (rowId: string) => void
}): ReactElement {
  const [at, setAt] = useState<FlowStop>('configure')

  /* CHOOSE IS NOT REACHABLE FROM HERE and `FlowLine` will not draw a
     control for it — the picker is a stage the shell mounts and this
     feature may not import it without closing the cycle `quote/index
     → QuoteStart → start.ts → modules/read → quote/index`. The way
     back to it is the stage's own Back, which lands there because
     `QuoteStart` no longer closes itself when it mints. See flow.tsx. */
  const go = (to: FlowStop): void => {
    if (to === 'configure' || to === 'address') setAt(to)
  }

  if (at === 'address') {
    return (
      <div className="qt-root qt-root--edit">
        <QuoteEditor quote={quote} onOpenCustomer={onOpenCustomer} onGo={go} />
      </div>
    )
  }

  return (
    <div className="qt-root qt-root--edit">
      <QuoteBuild quote={quote} onGo={go} />
    </div>
  )
}
