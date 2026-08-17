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

   3. A `quotes` slice on the store + Dexie v3 + `ProjectExport`.
      `quotes.ts` persists to localStorage today, which is enough to
      survive a refresh and not enough to survive a machine. Wanted:
         quotes: Record<string, QuoteDef>
         createQuote / updateQuote / deleteQuote
      plus QuoteDef[] in ProjectSnapshot, a `db.version(3)` table,
      the three Promise.all lists in DexieProjectRepository, and
      `quotes?: QuoteDef[]` in ProjectExport at EXPORT_VERSION 2
      (with version 1 read as "valid, no quotes" rather than
      rejected). Because every field on a line is a VALUE, this
      costs the envelope validator a shape check and nothing else —
      and it is the reason a quote can travel at all: a quote that
      travelled as IDS and landed in a project with different price
      data would silently re-price a signed deal.
      NOTE: `replaceProject` must CLEAR quotes. It does not clear
      `views` today, so a demo swap leaves stale ViewDefs that are
      written straight back to Dexie. A quote must not copy that.

   4. THE SEEDED JOINS DO NOT USE THE WELL-KNOWN PAIR IDS.
      `join_hf_yam` and its siblings declare their own `Recommended`
      (boolean) and `Slot` (number) columns with freshly minted ids
      rather than `__recommended` / `__order`, so `readPairs`
      returns `recommended: false` for every row of the real seed.
      CONSEQUENCE HERE, EXACTLY: the workbook's own recommended
      motor never pre-ticks, so a quote made from the Northside data
      opens with its motor and trailer sections EMPTY and costs one
      extra pick per section. The quote does not paper over it — a
      name-matched star would be a guess about which motor a
      business recommends — but the picker does print the join's own
      facts, so `Slot 1` and `Recommended Yes` are visible on the
      candidate a person is choosing between. Emitting
      `__recommended` / `__order` from the seed is the cheaper fix
      and needs no contract change.

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
export { quoteTotals, lineAmount, linesOf, looseLines, isEmptyQuote } from './totals'
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
