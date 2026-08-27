/* ============================================================
   HISTORY — customers, quotes, drafts, and what happened.

   MOUNTING IT (the whole job):

     import { HistoryStage } from '@/features/history'

     <HistoryStage
       onOpenQuote={openQuote}      // required — goes to the quote stage
       openId={openQuoteId}         // optional — highlights that row
       customerId={null}            // optional — land on one customer
     />

   It fills whatever box it is put in, scrolls itself and brings its
   own stylesheet. It reads the quote registry and the project store
   directly, so it takes no data props at all.

   THE TWO SCREENS ARE ALSO MOUNTABLE ON THEIR OWN, for a shell that
   already has its own routing:

     <QuoteHistory onOpenQuote={…} openId={…} onOpenCustomer={…} />
     <CustomerHistory rowId={…} onOpenQuote={…} onBack={…} />

   ---------------------------------------------------------------
   WHAT THIS FEATURE IS, AND WHAT IT IS NOT

   It is the LEDGER. `@/features/quote`'s `QuoteList` is the shelf
   you take a quote off — twelve cards, newest first. This is the
   screen you open when the question is "what did we send them in
   March", "which drafts are still open", "what happened to the one
   we redid". Filters, days, versions, and one customer's whole
   conversation.

   IT OWNS NO DATA. Every record it draws comes from the quote
   registry (`@/features/quote`) and the customer register
   (`@/features/crm`), and it writes through their exported
   functions and nothing else. There is no history store, no second
   id space and no third copy of a quote. Delete this directory and
   nothing else in the app loses a record.

   ---------------------------------------------------------------
   THE ONE INVARIANT, so a reviewer can check it in one grep

     NO FIGURE ON A ROW IS COMPUTED FROM LIVE DATA.

   Every total is `quoteTotals(quote)` — the same function the
   document and the print call — over the quote's own frozen lines.
   `useProjectStore` appears in exactly two files here
   (`QuoteHistory` for the empty state's table count, `CustomerHistory`
   for the contact details at the top of the page) and in neither of
   them does it reach a row of the ledger. If that holds, the price
   file can change on Tuesday and every figure in this history is
   untouched.

   ---------------------------------------------------------------
   THE THREE STANDINGS, AND WHY THE THIRD IS NOT A STATE

   `QuoteState` has two members and should keep them: a quote is
   either being written or it has been handed over. "Replaced" is not
   a third state of a document, it is a fact about the CONVERSATION —
   some later quote carries `supersedesId` pointing at it. So it is
   derived in `history.ts` and never stored, which means it cannot go
   stale and there is no migration the day somebody versions an old
   quote.

   ---------------------------------------------------------------
   WHAT IS DELIBERATELY NOT BUILT, so nobody reads an absence as an
   oversight:

     NO WON / LOST, NO PIPELINE STAGE, NO CONVERSION RATE. Nothing in
     this app records that a customer bought anything — there is no
     order, no deposit, no signature. Production shipped a pipeline
     board and a customer "journey" keyed on fields nothing ever
     wrote. Everything this feature says about a document is
     checkable against the document.

     NO ACTIVITY / AUDIT LOG. The reference app has one, and it is
     the right idea; it needs a record of edits that this app does
     not keep. `updatedAt` is one timestamp, not a trail, and a log
     built from it would be a list of one entry per quote claiming to
     be a history of changes.

     NO EXPIRY, NO FOLLOW-UP DATES, NO REMINDERS. Each needs a field
     nobody writes and a runtime that does not exist.

   ---------------------------------------------------------------
   WHAT THIS FEATURE WOULD LIKE FROM THE ORCHESTRATOR

   1. A DOOR ON THE RAIL, under SELLING, beside Quotes and Customers
      — "History". `SideNav` already draws a count on Quotes; this
      row needs none.

   2. `onOpenQuote` wired to whatever opens the quote stage, and the
      stage's current quote id passed back as `openId`.

   3. OPTIONAL, and worth it: `@/features/crm`'s `CustomerPage` has a
      "Quotes to them" section that answers a narrower version of the
      same question. A link from that section to
      `<HistoryStage customerId={rowId} />` would join the two, and
      neither file has to change for it — that is why `customerId` is
      a prop rather than internal state. Nothing here edits `crm`.
   ============================================================ */

/* -- the screens -------------------------------------------- */
export { HistoryStage } from './HistoryStage'
export type { HistoryStageProps } from './HistoryStage'
export { QuoteHistory } from './QuoteHistory'
export type { QuoteHistoryProps } from './QuoteHistory'
export { CustomerHistory } from './CustomerHistory'
export type { CustomerHistoryProps } from './CustomerHistory'

/* -- one row of the ledger, for a surface that wants only that -- */
export { LedgerRow, Shot, STATE_CLASS } from './row'
export type { LedgerRowProps } from './row'

/* -- writing them another one -------------------------------- */
export { quoteAgain, whyNotAgain } from './again'

/* -- the readings, all pure, all tested ----------------------- */
export {
  ANY_CUSTOMER,
  NO_CUSTOMER,
  NO_FILTER,
  SPAN_TITLE,
  STANDING_SAY,
  STANDING_TITLE,
  customerFacets,
  customerHistory,
  dayTitle,
  drafts,
  filterIsOpen,
  filterQuotes,
  groupByDay,
  indexQuotes,
  offeredNotTaken,
  spanFrom,
  standingCounts,
  standingOf,
  tally,
  versionMark,
  versionsOf,
} from './history'
export type {
  CustomerFacet,
  CustomerHistoryRead,
  DayGroup,
  HistoryFilter,
  HistoryIndex,
  HistoryTally,
  PassedOver,
  SpanKey,
  Standing,
  StandingCounts,
} from './history'
