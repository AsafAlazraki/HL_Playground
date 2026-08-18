/* ============================================================
   THE QUOTE STAGE — the shell's box around `@/features/quote`.

   Fourth time the same lesson: a finished feature reachable from
   nothing. `@/features/quote` knows how to freeze a rig into a
   document, how to sum it once, how to print it and how to list
   what has been made. What it cannot know is which ROW a person is
   pointing at, where the way back lives, and that only one thing
   may cover the sheet at a time. Only the shell knows those. So
   this file is a box and a way back, and it writes no quote logic
   at all — no total, no price, no line. The moment a stage starts
   adding numbers up "just for the bar" there are two answers for
   one deal, which is precisely the fault this feature exists to
   end (QUOTE_FINDINGS §3.4: production sums one quote in five
   places and they already disagree).

   WHAT THIS FILE IS, AND ALL IT IS:
     1. a way back   — one control, top left, always there;
     2. a crumb      — what is on screen, in the bar's own voice;
     3. a box        — `<QuoteList>` or `<QuotePage>` fills it and
                       scrolls itself;
     4. one link     — "All quotes", from a document back to the
                       diary, because the panel's door is behind the
                       stage a person is standing on.

   IT SITS OVER THE SHEET, like the view, rules and flow stages, so
   the blueprint keeps its zoom and node state underneath and
   closing is instant. A quote is something you write ABOUT the
   sheet, not somewhere you go instead of it.

   TWO PANELS STILL. Everything below is INSIDE the stage, the way
   `ViewStage` puts its row rail inside its own box. Nothing here
   re-opens the right rail the shell deleted.

   THE LIST AND THE DOCUMENT ARE ONE STAGE, not two. A person moving
   between quotes is in one place; splitting them into two stage
   kinds would unmount the box on every hop and drop the scroll of
   the list somebody is comparing two documents from.

   A STAGE MUST NEVER OUTLIVE ITS SUBJECT. A draft can be thrown
   away from inside this very stage, so a `quoteId` that no longer
   resolves falls back to the LIST rather than to the sheet — the
   person was in the middle of looking at their quotes, and the
   feature's own page already says "That quote is no longer here."
   ============================================================ */

import type { ReactElement } from 'react'
import { ArrowLeft, CaretLeft } from '@phosphor-icons/react'
import { QuoteList, QuotePage, useQuote } from '@/features/quote'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'

export interface QuoteStageProps {
  /** the quote being looked at, or null for the list of them */
  quoteId: string | null
  /** The shell holds which one is open, so the door in the panel and
   *  the stage can never disagree about what is on screen. Passing
   *  null goes back to the list without closing the stage. */
  onOpen: (quoteId: string | null) => void
  /** WHO THIS QUOTE IS FILED UNDER. Only the shell knows a customer
   *  opens in a window of its own, so the route comes from here —
   *  the same arrangement the module stage's `onQuote` uses. Absent
   *  = the link is still SAID on the document's own screen and not
   *  offered as a door, so this stage still works on its own. */
  onOpenCustomer?: (customerId: string) => void
  onClose: () => void
}

export function QuoteStage({
  quoteId,
  onOpen,
  onOpenCustomer,
  onClose,
}: QuoteStageProps): ReactElement {
  const quote = useQuote(quoteId)
  /* the id counts as open only when the document is really there */
  const openId = quote ? quote.id : null

  /* ONE FACT THE FEATURE MAY NOT LOOK UP ITSELF, read here instead.
     `@/features/quote` keeps `useProjectStore` to a single file
     (freeze.ts) so a drawn document can never touch live data, and the
     invariant is worth more than a count. But the diary's empty state
     cannot be honest without it: with nothing on the sheet, "open a
     table and press Fitment" is a four-step instruction whose first
     step is impossible, which is what that page used to be on a cleared
     install. So the stage reads the sheet — it is in `src/app`, it
     already knows — and hands the number down. */
  const tableCount = useProjectStore((s) => Object.keys(s.entities).length)

  /* Escape is the control in track 1 of the bar, on the keyboard. Not
     "back to all quotes", which is a lateral move inside this window
     and sits in track 3 — Escape is the way OUT, everywhere. */
  useStageEscape(onClose)

  return (
    <div
      className="shell-viewstage"
      role="region"
      aria-label={quote ? `Quote ${quote.reference}` : 'Quotes we have made'}
      /* DELETE AND BACKSPACE STOP AT THIS ROOT, the same line every
         other stage carries: the sheet's window-level handler offers to
         delete the whole SELECTED TABLE on either one, and it only skips
         INPUT/TEXTAREA/SELECT. A quote is made almost entirely of
         typing, and a Backspace in an empty customer field must never
         offer to strike a price file off the sheet.

         Escape travels, so the shell can close this page with it. That
         it only closes the page when the focus is NOT in a field matters
         more here than anywhere: this surface is fields, and a document
         a salesperson is halfway through writing must not vanish because
         they reached for Escape to undo a word. See stageKeys.ts. */
      onKeyDown={stageKeys}
    >
      <div className="shell-view-bar">
        {/* `shell-view-back`, no `btn`, labelled "Back" — TableStage is
            the calibration. `.btn` stamped this "BACK TO THE SHEET" in
            11px uppercase mono; uppercase is a label style and this is
            a button. */}
        <button type="button" className="shell-view-back" onClick={onClose} aria-label="Back">
          <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
          <span>Back</span>
        </button>

        <p className="shell-view-what">
          <span className="shell-view-what-name">
            {quote ? quote.reference : 'Quotes we have made'}
          </span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          {/* The aside says what is IN FRONT OF YOU, and for the list
              it says what a quote is — the two doors above it in the
              panel are both about rules, and a third sentence has to
              be told apart from them without looking. */}
          <span className="shell-view-what-say">
            {quote ? quote.subjectLabel : 'a rig, a customer and a moment'}
          </span>
        </p>

        {/* THE WAY BACK TO THE DIARY. The panel's own door is behind
            this stage, so without this the only route from a document
            to the list is out to the sheet and in again. Drawn only
            when a document is open, because on the list it would point
            at itself. */}
        {quote ? (
          <div className="shell-quote-acts">
            <button
              type="button"
              className="btn shell-quote-act"
              aria-label="Back to the quotes we have made"
              onClick={() => onOpen(null)}
            >
              <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              All quotes
            </button>
          </div>
        ) : null}
      </div>

      <div className="shell-quote-well">
        {quote ? (
          <QuotePage
            quoteId={quote.id}
            onOpenQuote={(id) => onOpen(id)}
            onOpenCustomer={onOpenCustomer}
          />
        ) : (
          <QuoteList onOpen={(id) => onOpen(id)} openId={openId} tableCount={tableCount} />
        )}
      </div>
    </div>
  )
}
