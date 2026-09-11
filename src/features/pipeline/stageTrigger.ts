/* ============================================================
   WHAT A STAGE CHANGE DOES — and what it deliberately does not.

   SALES_BOARD §4 is the board's largest unbuilt piece and says so
   about itself: *"Stage entry becomes a trigger — reassign the
   owner, lock the pricing, require a deposit field, notify
   somebody. This is the largest and least specified piece."*

   TWO OF THOSE FOUR STILL NAME A CONCEPT THIS APP DOES NOT HAVE,
   and they are listed here rather than in a plan document because
   the next person to open this file is the one who needs to know.
   A THIRD WAS UNBLOCKED and is built; it is recorded first so
   nobody rebuilds it:

     · REASSIGN THE OWNER — BUILT, in `owners.ts`. This entry used
       to read "a deal has no owner… needs a people directory and
       an `ownerId` beside the deal — a store shaped like
       `stages.ts`, plus a picker, plus the answer to what happens
       to a deal owned by somebody who has left." DECISIONS.md §2
       supplied the directory: roles are real, they are the
       dealership's own words for its jobs, and they are the only
       list of who does what here that this app did not invent. So
       an owner names a JOB rather than a person, the store holds
       the HANDOVERS and derives the current owner from the last of
       them, the picker is the app's own, and a deal whose role has
       been deleted reads as nobody's — `ownerInForce`. It is a
       toast with UNDO like every other act on a deal.

       IT IS NOT WIRED TO A STAGE, and that is this file's rule
       rather than an omission: see below. A column that silently
       moved a deal onto somebody else's desk would be the same
       "fires on some deals and not others" fault the lock argument
       is built on, with an owner instead of a document.

     · REQUIRE A DEPOSIT FIELD — deposits are on the list of what
       this build deliberately does not have, by name:
       "payment schedules and deposits" (quote/index.ts:107-113).
       A deposit is money RECEIVED, and nothing in this app records
       money received. Needs a payment model — an amount, a date, a
       method, and a rule about what a quote total means once part
       of it is paid.

     · NOTIFY SOMEBODY — there is no delivery channel and no second
       person to deliver to. `say()` is a toast bus read by whoever
       is already looking at the screen, and `activity.ts` is a log
       of what happened, not an outbox. Needs a recipient, a
       transport, and a record of what was sent.

   Each of those is a feature with its own store, and building one
   of them behind a checkbox on a board panel would be the worst
   place to decide its shape.

   THE FOURTH ONE THE APP ALREADY HAS A WORD FOR. Locking the
   pricing is ISSUING: "the moment it is given to a customer.
   Everything that makes a number becomes read-only, and 're-read
   today's prices' is gone" (quote/quotes.ts:788). So a stage can
   ask for it, and this file is that ask.

   ---------------------------------------------------------------
   WHY ENTERING THE STAGE DOES NOT ISSUE THE QUOTE ITSELF.

   It was the obvious build and it is wrong three times over.

   1. IT CANNOT BE UNDONE, AND THE MOVE CAN. A stage move is a
      toast with UNDO (rule 9) and that Undo puts the card back.
      An issued quote can never be un-issued: `discardDraft`
      refuses one (quotes.ts:864), nothing deletes one, and the
      only remaining act is `makeNewVersion`, which mints a
      DIFFERENT document. Undo would put the card back and leave
      the document frozen — and `notes.ts` names that exact shape:
      "a note offering to undo something the store cannot put back
      is a lie".

   2. IT WOULD FIRE ON SOME DEALS AND SILENTLY NOT ON OTHERS.
      `issueQuote` refuses whenever `issueBlockers` returns
      anything — no customer name, nothing on the document, a total
      of nought, a typed price with no reason (totals.ts:265-302).
      Its own note says the point of the boolean is "so the screen
      can say why not rather than appearing to do nothing". A drag
      cannot say why not.

   3. THE BOARD'S ONE PROMISE IS THAT MOVING A CARD DOES NOT EDIT
      THE DOCUMENT. `stages.ts` is built on it — the stage is
      stored beside the quote so a frozen quote can be dragged
      "without the frozen quote changing" — and SALES_BOARD's own
      "what this must not break" says "changing a stage must never
      alter what was quoted".

   SO THE TRIGGER RAISES A DEMAND RATHER THAN FIRING AN ACT. The
   stage says what it expects; the move says so at the moment it
   happens; the board marks the deals that do not meet it; the deal
   prints the sentence and, where the document itself is in the
   way, the document's own reasons verbatim. The irreversible half
   stays one deliberate press on the screen that owns it, which is
   the quote editor's "Give it to the customer".

   WHAT THAT LEAVES: a person can ignore the demand for ever and
   nothing stops them. That is deliberate — a board that refused a
   drop would be a board that argues with a sales manager about
   their own pipeline — and it is the honest limit of this build.

   EVERYTHING HERE IS PURE and takes its inputs as arguments, so
   the sentences are testable without a browser, a store or a
   clock.
   ============================================================ */

import type { QuoteDef } from '@/types/model'
import { issueBlockers } from '@/features/quote/totals'
import type { StageDef } from './stageStore'

/** THE WORD, AND IT IS NOT SHARED WITH ANY OTHER REFUSAL. The
 *  configurator playbook's §5 rule — five kinds, five words, and
 *  "they never share a word, a colour or a pill" — applies to the
 *  board as much as to the choice surface. "Not offered", "Over
 *  the rating", "Unchecked", "Discontinued", "Retired" and "No
 *  price" are taken. This is the sixth. */
export const NOT_LOCKED = 'Not locked'

export interface StageDemand {
  /** the one word, for the surface that draws it emphasised */
  word: string
  /** what the stage asks, and how this deal falls short of it */
  say: string
  /** what to do about it — a route in words, never a second copy
   *  of a control the screen already carries */
  next: string
  /** THE DOCUMENT'S OWN REASONS IT CANNOT GO OUT YET, verbatim
   *  from `issueBlockers`, which is the same list the quote
   *  editor prints beside its own button. Reading them from the
   *  one function is what stops the board and the editor
   *  disagreeing about whether a quote may be issued — the
   *  argument QuoteEditor.tsx:215 already makes for itself.
   *  Empty when nothing stands in the way. */
  why: readonly string[]
}

/** IS THIS DEAL STANDING SOMEWHERE THAT ASKS FOR A LOCKED PRICE
 *  WITHOUT HAVING ONE? The cheap half, because the board asks it
 *  once per card and `issueBlockers` walks every line of a quote
 *  to answer a question a card does not draw. */
export function locksButOpen(
  stage: StageDef | undefined,
  quote: QuoteDef,
): boolean {
  if (!stage?.locks) return false
  /* THE DOCUMENT'S STATE, NOT THE DERIVED STAGE. A quote whose
     prices are locked is an ISSUED one, wherever its card is
     standing — `stages.ts` exists to keep those two apart. */
  return quote.state !== 'issued'
}

/** The whole demand, for a surface with room to print it. Null
 *  when the stage asks nothing, or when the deal already meets it
 *  — a met condition is not a fact worth a line. */
export function lockDemand(
  stage: StageDef | undefined,
  quote: QuoteDef,
): StageDemand | null {
  if (!stage || !locksButOpen(stage, quote)) return null
  const why = issueBlockers(quote)
  return {
    word: NOT_LOCKED,
    say: `${stage.name} locks its prices and this quote is still a draft.`,
    next:
      why.length === 0
        ? /* THE ROUTE, NOT A SECOND BUTTON. Both surfaces that draw
             this already carry "Open the quote" in their own foot,
             and a second control doing one act is the fault
             CONFIGURATOR fault 1 was raised about. So the sentence
             names the door that is already on screen. */
          'Open the quote and give it to the customer. Nothing on it can change after that.'
        : /* AND WHEN THE DOCUMENT ITSELF IS IN THE WAY, the route
             would be a dead end — so it is not offered, and the
             reasons follow. */
          'It cannot go to the customer yet:',
    why,
  }
}

/** WHAT THE MOVE TOAST SAYS ABOUT WHERE THE CARD LANDED, or '' when
 *  there is nothing to report.
 *
 *  IT SAYS "THERE" RATHER THAN NAMING THE STAGE AGAIN. The sentence
 *  it is appended to has just named it, and "moved to Won. Won
 *  locks its prices" reads like a machine.
 *
 *  AND IT IS SILENT WHEN THE DEMAND IS MET. A toast saying the
 *  prices were already locked reports nothing that happened, and
 *  the activity log listens to this same bus — see `activity.ts`.
 *  A log of things that did not happen is a log nobody reads. */
export function arrivalClause(
  stage: StageDef | undefined,
  quote: QuoteDef,
): string {
  if (!locksButOpen(stage, quote)) return ''
  return 'Prices are locked there and this one is still a draft.'
}
