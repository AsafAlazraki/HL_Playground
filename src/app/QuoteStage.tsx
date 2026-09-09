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
     1. a way back   — ONE control, top left, drawn on a document and
                       pointing at the list it was opened from;
     2. a box        — `<QuoteList>` or `<QuotePage>` fills it and
                       scrolls itself;
     3. a page head  — `PageHead` on the list, and nothing above it.

   THERE WAS A SECOND WAY BACK AND A CRUMB. Both are gone, and the
   argument is at the bar below: the bar drew "Back", the quote's
   reference and "All quotes" on three stacked rows totalling
   80.38px, of which the reference and the rig name were already on
   the page under it at four times the size.

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
import { ArrowLeft, ClockCounterClockwise, Kanban, ListBullets } from '@phosphor-icons/react'
import { QuoteList, QuotePage, useQuote, useQuotes } from '@/features/quote'
import { useProjectStore } from '@/store/useProjectStore'
import { isRetired } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import { currentUser } from '@/features/auth'
import { PageHead } from '@/features/page'
import { Board } from '@/features/pipeline'
import { Button } from '@/ui'
import { stageKeys, useStageEscape } from './stageKeys'
import { useStageEntry } from './stageEntry'

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

  /* ESCAPE IS THE WAY OUT, EVERYWHERE, and it is the ONLY thing wired
     to `onClose` on this stage. That is what leaves the bar's one
     control free to do the move the keyboard does not offer — up one
     level, to the list. Two controls for `onClose` and none for
     "back to the list" was the arrangement this replaced; see the
     bar below. */
  useStageEscape(onClose)
  /* AND THIS IS WHERE THE KEYBOARD ARRIVES — see stageEntry.ts. The
     name is the reference, so opening a document out of the list says
     WHICH document; the list and the document share one root, so
     nothing else would have said it.

     The guard in that hook earns its keep here more than anywhere:
     this surface is fields, and it must never take the focus out of
     one — including when a quote is opened while the focus is still
     in the list's search box. */
  const stage = useStageEntry(quote ? `Quote ${quote.reference}` : 'Quotes we have made')

  return (
    <div
      className="shell-viewstage"
      role="region"
      {...stage}
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
      {/* ============================================================
          ONE BACK CONTROL, AND IT GOES TO THE LIST.

          MEASURED at 1280x800 on a Highfield ADV7 draft, before this:
          the bar was 80.38px of three stacked rows —

            .shell-view-back    x=256  y=0      28.00   "Back"
            .shell-view-what    x=604  y=28     20.25   20260909-01 · Highfield - ADV7 …
            .shell-quote-acts   x=256  y=48.25  32.13   "All quotes"

          Two back controls at the same x, one under the other, and a
          heading between them. Identical at 1440x900 — the bar does
          not respond to width because it was not laid out at all: it
          carried no `display`, so a grid of three tracks written for
          it in shell.css (`grid-column: 1` on the back, `grid-column:
          2; justify-self: center` on the crumb) resolved against a
          BLOCK and every child took its own line. The grid is put
          back in shell.css with this change; the rows that are gone
          are gone from here.

          AFTER, measured the same way: one row, 40px. The work area
          (`.qb-scroll`) goes 545.92 → 586.30 at 1280x800 and
          674.73 → 715.11 at 1440x900, so the chrome above and below
          it goes 254.08 → 213.70 and 225.27 → 184.89.

          WHICH CONTROL SURVIVES is settled by DESIGN_CONTRACT §11:
          Back is `className="shell-view-back"`, no `btn`, labelled
          "Back". `btn shell-quote-act` is a page-toolbar control, not
          a back affordance, so it is the one that goes.

          WHICH ACT IT KEEPS is the interesting half, and it is `onOpen
          (null)` — the list — not `onClose`.

            · Escape is ALREADY `onClose` (`useStageEscape` below), so
              a Back wired to `onClose` would be the second control for
              an act that has one, which is the fault this change is
              here to end.
            · §4's own words are "it returns to wherever you came
              from", and a document is opened from the list. This is
              the only stage in the app with two levels inside it —
              its own header says so — and Back is drawn only on the
              second one. On the list, the stage's top level, there is
              still no Back at all, which is exactly what every
              single-level stage does.
            · Nothing is stranded. The rail's Quotes door sets
              `quoteId: null` (Shell.tsx:634), so the list is one
              press from anywhere, and Escape still leaves the stage.

          AND MODULESTAGE MADE THE OPPOSITE CALL, which is worth
          saying out loud rather than leaving two files to disagree.
          It deleted the generic "Back" and kept `btn shell-quote-act`
          "All modules" — "the vague one is the one to lose". The
          reasoning is good and the outcome is out of contract:
          DESIGN_CONTRACT §11 names ONE back affordance for the whole
          app, `shell-view-back`, no `btn`, labelled "Back", and a
          page-toolbar pill is not it. §11 is a hard constraint, so it
          wins here. Where "All modules" goes is ModuleStage's
          question and not this file's; what this file will not do is
          copy a shape the contract has already ruled on.

          THE CRUMB IS GONE BECAUSE THE PAGE UNDER IT SAYS THE SAME TWO
          FACTS, BIGGER. It read `20260909-01 · Highfield - ADV7 (HYP)
          B-G-B`; 79px below it `QuoteBuild` draws `.qb-ref`
          (20260909-01) over `<h1 class="qb-name">` (Highfield - ADV7
          (HYP) B-G-B), and `QuoteEditor` (`qt-edit-name`) and
          `QuoteDocument` (`qt-doc-name`) each draw their own pair on
          the other two stops. The bar's copy carried `role="heading"
          aria-level={1}`, so every quote document shipped TWO level-1
          headings naming one rig.

          AND ON THE LIST IT WAS THE SAME MISTAKE THE NOTE THIS
          REPLACED ALREADY DESCRIBED: "Quotes we have made · a rig, a
          customer and a moment", centred, directly over `PageHead`'s
          "SELLING / Quotes / 1 quote" — two titles, and the centred
          one won the eye because it was first. That note stopped
          drawing the crumb on the BOARD and left it on the list;
          both are `PageHead`'s pages and neither needs a second
          title. Measured: the list's bar was 20.25px and is 0, and
          the page under it starts that much higher — 158.39 → 138.14
          at 1280x800, 161.94 → 141.69 at 1440x900.

          The stage is still named for a screen reader either way:
          `useStageEntry` puts "Quote 20260909-01" / "Quotes we have
          made" on the region itself.
          ============================================================ */}
      <div className="shell-view-bar">
        {quote ? (
          <div className="shell-view-lead">
            <Button
              tone="ghost"
              size="sm"
              glyph={<ArrowLeft size={ICON_SIZE.small} />}
              onClick={() => onOpen(null)}
            >
              Back
            </Button>
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
              {/* BOARD OR LIST. Two primitives, and `aria-pressed` is the
                  truth: the one that is on takes the neutral ground so
                  the latch reads, the other is a ghost. `Button` has no
                  pressed tone of its own — reported, not forked. */}
              <Button
                tone={view === 'board' ? 'neutral' : 'ghost'}
                size="sm"
                aria-pressed={view === 'board'}
                glyph={<Kanban size={ICON_SIZE.tiny} />}
                onClick={() => setView('board')}
              >
                Board
              </Button>
              <Button
                tone={view === 'list' ? 'neutral' : 'ghost'}
                size="sm"
                aria-pressed={view === 'list'}
                glyph={<ListBullets size={ICON_SIZE.tiny} />}
                onClick={() => setView('list')}
              >
                List
              </Button>
              {/* THE DIARY IS A THIRD VIEW OF THE SAME QUOTES, so it
                  sits with the other two rather than alone on the bar
                  above the title. It is separated from them because
                  it LEAVES this page — the first two swap what is
                  under the header, this one opens another screen. */}
              {onOpenHistory ? (
                <span className="shell-quote-away">
                  <Button
                    tone="ghost"
                    size="sm"
                    glyph={<ClockCounterClockwise size={ICON_SIZE.tiny} />}
                    onClick={onOpenHistory}
                  >
                    History
                  </Button>
                </span>
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
