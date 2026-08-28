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
import { useEffect, useState } from 'react'
import { ArrowLeft, CaretLeft, ClockCounterClockwise, Kanban, ListBullets } from '@phosphor-icons/react'
import { QuoteList, QuotePage, useQuote, useQuotes } from '@/features/quote'
import { useProjectStore } from '@/store/useProjectStore'
import { isRetired } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import { currentUser } from '@/features/auth'
import { PageHead } from '@/features/page'
import { Board } from '@/features/pipeline'
import { stageKeys, useStageEscape } from './stageKeys'

/** WHICH VIEW OF THE QUOTES, remembered. A person who prefers the
 *  list should not be handed the board every morning. */
const VIEW_KEY = 'hl.quotes.view'

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
  /* ============================================================
     THE DIARY, WHICH LOST ITS DOOR WHEN THE RAIL WENT TO FOUR.

     History — every quote raised here and every customer given one
     — was a row in the rail's SELLING section. The rail is four
     doors now and History is not one of them, which left a
     finished stage reachable from nothing.

     It did not belong in Admin: it is a SELLING surface, and the
     list it is the long form of is right here. So it is a lateral
     link on this bar, drawn only on the list — on a document it
     would point past the thing you are reading. Absent = the link
     is not drawn, so this stage still works on its own.
     ============================================================ */
  onOpenHistory?: () => void
  onClose: () => void
}

export function QuoteStage({
  quoteId,
  onOpen,
  onOpenCustomer,
  onOpenHistory,
  onClose,
}: QuoteStageProps): ReactElement {
  const quote = useQuote(quoteId)
  /* HOW MANY THERE ARE, for the page's header. The board counts
     what survived its own filters, which is a different fact and
     is drawn beside the controls that caused it. */
  const quoteCount = useQuotes().length
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
  /* WHAT A DEALER MEANS BY "TABLES YOU HAVE", and it is not
     `Object.keys(entities).length`. That counted 53 on this sheet —
     joins and retired tables included — while the Admin door two
     screens away counted the same noun at 24, live and non-join, and
     the whiteboard legend framed 54. One noun, three numbers, and a
     person who notices starts checking the app's arithmetic instead
     of reading it. This one now counts what the Admin door counts,
     which is also what `nowhereToStart` actually needs: you cannot
     write a quote from a join table or from a table that is history. */
  const tableCount = useProjectStore(
    (s) =>
      Object.values(s.entities).filter((e) => !isRetired(e) && e.role !== 'join').length,
  )

  /* THE BOARD NEEDS TO KNOW WHOSE BUSINESS THIS IS, because a
     pipeline is stored per organisation — the same key the
     dashboard's arrangement and the activity log use.

     IT COMES FROM THE SESSION, NOT FROM THE SHEET. `OrgProfile`
     carries a display name and no slug; the signed-in person
     carries `orgSlug`, which is what every other per-organisation
     store in this app is already keyed by. Two different keys for
     one business would mean a board that emptied when somebody
     renamed the dealership. */
  const orgSlug = currentUser()?.orgSlug ?? 'northside-marine'

  /** whether the BOARD is showing a deal's whole record rather than
   *  its columns. The record draws its own head and its own way back,
   *  so this page's header — the one that says "Quotes · 14 quotes"
   *  and carries the Board | List | History row — would be a second
   *  header naming a screen that is not on. Published by `Board`;
   *  see `BoardProps.onRecord` for why the state stays down there. */
  const [recordOpen, setRecordOpen] = useState(false)

  const [view, setView] = useState<'board' | 'list'>(() => {
    try {
      return globalThis.localStorage?.getItem(VIEW_KEY) === 'list' ? 'list' : 'board'
    } catch {
      return 'board'
    }
  })
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(VIEW_KEY, view)
    } catch {
      /* a browser refusing storage still gets a working screen */
    }
  }, [view])

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
        {/* BACK ONLY FROM A DOCUMENT, never from the list.
            Quotes is one of the rail's four doors — you do not
            arrive at it FROM anywhere, so "Back" pointed at
            whatever happened to be open before and read as a
            control that had lost its place. On a document it is
            real: the document was opened from the list.

            `shell-view-back`, no `btn` — TableStage is the
            calibration. `.btn` stamped this "BACK TO THE SHEET" in
            11px uppercase mono; uppercase is a label style and this
            is a button. */}
        {quote ? (
          <button type="button" className="shell-view-back" onClick={onClose} aria-label="Back">
            <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
            <span>Back</span>
          </button>
        ) : null}

        {/* THE BAR STOPPED SAYING THE PAGE'S NAME.

            It used to be the only heading these pages had, and it was
            marked up as one. `PageHead` now draws the title, the
            eyebrow, the counted fact and the acts — so the bar was
            printing a second, worse copy of the same thing directly
            above it: "Quotes we have made · a rig, a customer and a
            moment" over "SELLING / Pipeline". Two titles, and the
            centred one won the eye because it was first.

            It is kept where the surface below has NO PageHead — a
            quote document, one customer, the access grid — because
            there it is still the only thing naming what is on screen.
            Reported as "header of page is crap", and it was. */}
        {quote || view === 'list' ? (
          <p className="shell-view-what" role="heading" aria-level={1}>
            <span className="shell-view-what-name">
              {quote ? quote.reference : 'Quotes we have made'}
            </span>
            <span className="shell-view-what-sep" aria-hidden="true">
              ·
            </span>
            <span className="shell-view-what-say">
              {quote ? quote.subjectLabel : 'a rig, a customer and a moment'}
            </span>
          </p>
        ) : null}

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

      {/* ONE HEADER FOR THE PAGE, DRAWN BY THE PAGE.

          The board drew its own and the list drew none, so the two
          views of one screen had two different anatomies — and the
          view switcher sat in the bar ABOVE the title, which is the
          reverse of every other screen in the app.

          The stage owns it because the stage is what "the Quotes
          page" IS; Board and List are two ways of looking at it,
          and neither should be deciding what the page is called.
          The switcher is in `tools` for the same reason the modules
          grid's type filters are: it says which part of the page
          you are looking at, which is what that row is for. */}
      {quote || recordOpen ? null : (
        <PageHead
          eyebrow="Selling"
          name="Quotes"
          count={`${quoteCount} ${quoteCount === 1 ? 'quote' : 'quotes'}`}
          tools={
            <div className="shell-quote-views" role="group" aria-label="How to show the quotes">
              <button
                type="button"
                className={`btn shell-quote-act${view === 'board' ? ' is-on' : ''}`}
                aria-pressed={view === 'board'}
                onClick={() => setView('board')}
              >
                <Kanban size={ICON_SIZE.tiny} aria-hidden="true" />
                Board
              </button>
              <button
                type="button"
                className={`btn shell-quote-act${view === 'list' ? ' is-on' : ''}`}
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                <ListBullets size={ICON_SIZE.tiny} aria-hidden="true" />
                List
              </button>
              {/* THE DIARY IS A THIRD VIEW OF THE SAME QUOTES, so it
                  sits with the other two rather than alone on the bar
                  above the title. It is separated from them because
                  it LEAVES this page — the first two swap what is
                  under the header, this one opens another screen. */}
              {onOpenHistory ? (
                <button
                  type="button"
                  className="btn shell-quote-act shell-quote-away"
                  onClick={onOpenHistory}
                >
                  <ClockCounterClockwise size={ICON_SIZE.tiny} aria-hidden="true" />
                  History
                </button>
              ) : null}
            </div>
          }
        />
      )}

      <div className="shell-quote-well">
        {quote ? (
          <QuotePage
            quoteId={quote.id}
            onOpenQuote={(id) => onOpen(id)}
            onOpenCustomer={onOpenCustomer}
          />
        ) : view === 'board' ? (
          <Board orgSlug={orgSlug} onOpen={(id) => onOpen(id)} onRecord={setRecordOpen} />
        ) : (
          <QuoteList onOpen={(id) => onOpen(id)} openId={openId} tableCount={tableCount} />
        )}
      </div>
    </div>
  )
}
