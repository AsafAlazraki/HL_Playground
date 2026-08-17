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

  if (quote.state === 'draft') {
    return (
      <div className="qt-root">
        <QuoteEditor quote={quote} />
      </div>
    )
  }

  return (
    <div className="qt-root qt-root--doc">
      {/* the controls are OUTSIDE the document, and print hides
          everything that is not the document itself */}
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
      <QuoteDocument quote={quote} />
    </div>
  )
}
