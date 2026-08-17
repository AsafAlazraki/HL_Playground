/* ============================================================
   QUOTES — a rig, a customer, and a moment.

   MOUNTING IT (the whole job):

     import { QuotePage, QuoteList, createQuoteFromView } from '@/features/quote'

     // the door on the view stage: "Quote this one"
     const quote = createQuoteFromView(viewId, rowId)  // may be null
     if (quote) open(quote.id)

     // the stage's body — draft or document, it decides
     <QuotePage quoteId={id} onOpenQuote={open} />

     // the door in the left panel: "Quotes we have made"
     <QuoteList onOpen={open} openId={id} />

   Both fill whatever box they are put in, scroll themselves and
   bring their own stylesheet. Neither takes any other prop.

   ---------------------------------------------------------------
   THE ONE INVARIANT, so a reviewer can check it in one grep

     A quote renders from its own `lines` and `adjustments`.
     `useProjectStore` appears in exactly ONE file of this feature —
     freeze.ts — and every function in it is called from an EVENT
     (minting a quote, opening a picker, asking for today's prices),
     never from a render of a quote.

   If that holds, the price file can change on Tuesday and every
   quote already made is untouched. If it is broken anywhere it is
   broken everywhere, because nobody can tell by looking which
   numbers on a page are yesterday's.

   ---------------------------------------------------------------
   WHAT THIS FEATURE NEEDS FROM THE ORCHESTRATOR

   1. THE SHAPES, in '@/types/model'. `types.ts` here is written to
      be moved verbatim: QuoteLine, QuoteAdjustment, QuoteSection,
      QuoteState, QuoteDef, PriceLevel, FrozenLevel, AdjustmentKind,
      QUOTE_LEVEL_ORDER, LEVEL_TITLE. Moving them costs one import
      path; nothing in this feature widens them.

   2. `EntityDef.priceLevels?: PriceLevel[]` — WHICH COLUMN IS A
      PRICE, AND AT WHICH RUNG. This is the single blocking gap.
      Today `pricing.ts` resolves it from an exact-name allow-list
      per table kind (Cash/Trade/Warranty · Sell Price/Trade Price ·
      Sell inc Rego · Sell / Sell inc Install), which is honest but
      is knowledge about the Northside data living in code. With the
      field, a table declares its own rungs once and the allow-list
      becomes the DEFAULT offered to a new table. Nothing else here
      changes: `priceLevelsFor` already reads the field when it is
      present.

   3. A `quotes` slice on the store + Dexie v3. `quotes.ts` persists
      to localStorage today, which is enough to survive a refresh and
      not enough to survive a machine. Wanted:
         quotes: Record<string, QuoteDef>
         createQuote / updateQuote / deleteQuote
      plus QuoteDef[] in ProjectSnapshot, a `db.version(3)` table and
      the three Promise.all lists in DexieProjectRepository.

      A QUOTE NOW TRAVELS IN A SAVED COPY, and that half is done —
      not the way this note asked for, because `ProjectExport` is
      orchestrator-owned. `src/features/io/envelope.ts` declares
      `ProjectFile extends ProjectExport` with `quotes?: QuoteDef[]`,
      normalises every field of every quote at the door and hands
      them to `registerQuote`; `allQuotes()` here is the reader it
      exports from. If `quotes?: QuoteDef[]` is ever added to
      `ProjectExport` itself, `ProjectFile` becomes an alias and
      nothing else moves. It is an OPTIONAL key inside version 2
      rather than a version 3, because EXPORT_VERSION is in the same
      owned file — and an absent key already means "a file with no
      quotes", which is the tolerance v1 was given for the same
      reason.
      NOTE: a REPLACE deliberately does NOT clear quotes, and a CLEAR
      SHEET does not either. A quote is a photograph of what was
      offered on a day and does not depend on the sheet, so it
      outlives one; both confirm sheets say so in a sentence. What a
      replace does do is put the file's own quotes in BY ID, so
      export → clear → import returns exactly the documents that
      left and cannot double them.

   4. TWO READ-THROUGHS ON THE BOAT × MOTOR JOIN — what fitting
      the rigging kit costs. FIXED SINCE THIS WAS WRITTEN, and
      recorded because the fix is the interesting half: the seeded
      joins used to declare their own `Recommended` and `Slot`
      columns with minted ids, so `readPairs` returned
      `recommended: false` for every row and a quote opened with its
      motor and trailer sections EMPTY. `tools/seed/gen_all.py` now
      emits `__origin` / `__recommended` / `__order` literally, the
      standard-fit motor pre-ticks, and the five-way association —
      rigging kit, prop part no., prop description, engine hole,
      slot — arrives on the line by value (freeze.ts `pairFactsOf`).
      WHAT IS STILL MISSING is money, not identity:
      FOUR_MODULES.md §3.7 asks for `Rigging Kit Labour (Hrs)` ←
      `rig_kits.O` and `Rigging Sell` ← `rig_kits.AC` on each of the
      eight joins, and neither is seeded. So a quote names the kit
      and cannot price fitting it — median $3,370, maximum $44,310.
      The labour is arithmetic rather than a guess: `Boat Module!UH`
      computes it and is overridden on 0 of 2,436 cells
      (FITMENT_RULES.md R9, seeded as a blocked rule in
      `features/constraints/workbookRules.ts`). Two columns × eight
      joins, in a section that already exists, and no contract
      change.

   ---------------------------------------------------------------
   WHAT IS DELIBERATELY NOT BUILT (QUOTE_SPEC §7), so nobody reads
   an absence as an oversight: e-signature · payment schedules and
   deposits · order/contract conversion · the visual quote-flow
   designer · sending by email · an expiry engine · a margin gate ·
   a finance calculator · multi-currency · a Customers table.
   Each one either needs a number the data does not carry or a
   runtime that does not exist yet.

   AND ONE LIMIT OF THIS BUILD: only TOP-LEVEL view blocks become
   sections. A nested block (accessories under each motor) is
   related to the row of its parent block, so a nested section would
   be a heading with nothing under it until a parent line is picked.
   Stated rather than silently dropped.
   ============================================================ */

/* -- the screens -------------------------------------------- */
export { QuotePage } from './QuotePage'
export type { QuotePageProps } from './QuotePage'
export { QuoteList } from './QuoteList'
export type { QuoteListProps } from './QuoteList'
export { QuoteDocument } from './QuoteDocument'
export type { QuoteDocumentProps } from './QuoteDocument'
export { QuoteEditor } from './QuoteEditor'
export type { QuoteEditorProps } from './QuoteEditor'

/* -- making, reading and changing one ------------------------ */
export {
  createQuoteFromView,
  quoteLikeThisOne,
  useQuote,
  useQuotes,
  getQuote,
  /* the non-hook list reader — what lets a quote leave the browser
     inside a saved copy of the sheet. See §3 above. */
  allQuotes,
  loadQuotes,
  persistNote,
  patchQuote,
  setLevel,
  setLineLevel,
  addLine,
  addFreeLine,
  removeLine,
  setQty,
  setOverride,
  addAdjustment,
  updateAdjustment,
  setAdjustmentMagnitude,
  removeAdjustment,
  applyPriceChanges,
  issueQuote,
  makeNewVersion,
  discardDraft,
  registerQuote,
} from './quotes'

/* -- the freeze line: everything here reads LIVE data -------- */
export {
  mintQuoteFromView,
  mintLine,
  mintFreeLine,
  candidatesFor,
  candidateOffer,
  priceChanges,
  referenceFor,
  subjectStillOnSheet,
  /* WHY A NEW QUOTE FOR THIS ROW WOULD BE WRONG, in one sentence, or
     '' when it would not. Any surface offering "Quote this one" — the
     view stage's button is the one that exists today — should draw
     this instead of the button, or beside it. It NEVER touches a
     quote that already exists. */
  unsellableSubject,
  freezeSpecs,
  OFFER_CAP,
  SUBJECT_BLOCK,
} from './freeze'
export type { Candidate, Offer, MintLineArgs, MintQuoteArgs, PriceChange } from './freeze'

/* -- the price ladder ---------------------------------------- */
export {
  priceLevelsFor,
  isPriced,
  isCostColumn,
  freezeLevels,
  priceAtLevel,
  quoteLevelChoices,
  defaultLevelKey,
  money,
  signedMoney,
  parseAmount,
} from './pricing'
export type { PricedAt, QuoteLevelChoice } from './pricing'

/* -- THE ONE SUMMATION --------------------------------------- */
export {
  quoteTotals,
  lineAmount,
  linesOf,
  looseLines,
  isEmptyQuote,
  /* the gate on issuing: a typed price with no reason beside it */
  unexplainedOverrides,
  needsOverrideReason,
} from './totals'
export type { QuoteTotals, LineAmount } from './totals'

/* -- the shapes (move these to model.ts) --------------------- */
export { QUOTE_LEVEL_ORDER, LEVEL_TITLE } from './types'
export type {
  AdjustmentKind,
  FrozenLevel,
  PriceLevel,
  QuoteAdjustment,
  QuoteDef,
  QuoteLine,
  QuoteSection,
  QuoteState,
} from './types'
