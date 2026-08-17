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
   ============================================================ */

import type { ReactElement } from 'react'
import { ArrowUUpLeft, Printer } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { QuoteDocument } from './QuoteDocument'
import { QuoteEditor } from './QuoteEditor'
import { makeNewVersion, useQuote } from './quotes'
import './quote.css'

export interface QuotePageProps {
  quoteId: string
  /** the stage's navigation — used when a new version is made */
  onOpenQuote?: (quoteId: string) => void
}

export function QuotePage({ quoteId, onOpenQuote }: QuotePageProps): ReactElement {
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
    return (
      <div className="qt-root qt-root--edit">
        <QuoteEditor quote={quote} />
      </div>
    )
  }

  return (
    <div className="qt-root qt-root--doc">
      {/* the controls are OUTSIDE the document, and print hides
          everything that is not the document itself */}
      <div className="qt-issued-head">
        <div className="qt-issued-bar">
          <p className="qt-issued-say mono-label">
            Given to the customer{quote.issuedAt ? ` · ${quote.issuedAt.slice(0, 10)}` : ''}
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
          Nothing on this quote can be changed now — it is the record of what the customer was
          offered, and the date it was given to them is above. To change anything, press{' '}
          <em>Make a new version</em>: it opens as a draft you can work on, and says on it that it
          supersedes this one.
        </p>
      </div>

      <QuoteDocument quote={quote} />
    </div>
  )
}
