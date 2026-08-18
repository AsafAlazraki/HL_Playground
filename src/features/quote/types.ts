/* ============================================================
   THE QUOTE'S SHAPES — and where they really belong.

   Every type below is QUOTE_SPEC §8.1 / §8.2, which asks the
   ORCHESTRATOR to put them in '@/types/model'. That file is not
   this workflow's to edit, so they live here until it is — the
   same arrangement `viewDefs.ts` made when the store had no place
   for a ViewDef. Moving them later costs one import path and
   nothing else: nothing in this feature widens them.

   WHY EVERY FIELD ON A LINE IS A VALUE AND NEVER AN ID.

   A quote given to a customer on Monday must say the same number
   on Friday, and the price file may be reimported twice in
   between. So a line carries the NUMBER, the COLUMN it came from,
   the LEVEL it was read at and the join row's own facts, all by
   value. The ids it keeps are for exactly two things — "open this
   row on the sheet" and "make another quote like this one" — and
   for nothing that is drawn or totalled.

   The failure this prevents is not hypothetical. Production made
   the quote a lens over live data and ended up summing one deal
   in five separate places that already disagree about rounding
   and cost fallbacks; nobody looking at the page can tell which
   numbers on it are yesterday's.

   THE CUSTOMER JOINED THAT LIST AND CHANGED NOTHING ABOUT IT.
   `customerRef` (below) is a row pointer of the FIRST kind — "open
   this row on the sheet" — and it sits beside the frozen
   `customer` block the document actually prints, never in place of
   it. The rule to check a change against is one sentence: EVERY
   WORD AND EVERY FIGURE ON THE PRINTED DOCUMENT COMES FROM A
   FROZEN FIELD. A quote whose customer block were resolved through
   that id would re-address itself when somebody fixed a typo in
   the register, and would print nothing at all in a project that
   register never reached.
   ============================================================ */

import type { ImageRef } from '@/types/model'

/* ---------------------------------------------------------- */
/* Price levels — QUOTE_SPEC §8.2                             */
/* ---------------------------------------------------------- */

/** One column a quote may read a price from.
 *
 *  `key` is shared across tables ('cash', 'trade') so ONE choice
 *  prices a whole quote; `label` is the column as the business
 *  wrote it, which differs per table for the same key — a boat's
 *  cash rung is called `Cash` and a motor's is called `Sell Price`.
 *
 *  `scope` is this workflow's addition to §8.2 and it is what stops
 *  the quote-wide chooser from offering nonsense. `warranty` exists
 *  only on boats and `fitted` only on parts: offering either as a
 *  whole-quote level would price a trailer at "fitted", which is not
 *  a rung any trailer has. Quote-wide keys drive the one control at
 *  the top; line keys are offered on the line they belong to. */
export interface PriceLevel {
  key: string
  label: string
  fieldId: string
  scope: 'quote' | 'line'
}

/** The whole-quote rungs, in the order the business offers them.
 *  Deliberately NOT a hardcoded list of six, two of which return the
 *  same number and one of which is unreachable — which is what
 *  production shipped. */
export const QUOTE_LEVEL_ORDER = ['cash', 'trade'] as const

/** The business's own word for each rung, used by the one control at
 *  the top of a quote. Each line still records the column name it was
 *  actually read from, so `Cash` on the chooser and `Sell Price` on a
 *  motor line never disagree — they are the same decision, named at
 *  two different altitudes. */
export const LEVEL_TITLE: Record<string, string> = {
  cash: 'Cash',
  trade: 'Trade',
  warranty: 'Warranty',
  fitted: 'Fitted',
}

/* ---------------------------------------------------------- */
/* A line — QUOTE_SPEC §8.1                                   */
/* ---------------------------------------------------------- */

/** One rung of this line, captured at the moment it was picked.
 *
 *  NOT in §8.1, and argued: §5 says changing the level "re-reads
 *  every line's frozen number FROM THE SAME FROZEN SOURCE CELL it
 *  recorded". The only way that sentence is literally true is if
 *  every rung was captured at pick time. Capture them all and a
 *  level change becomes pure arithmetic on frozen data — no store
 *  read, no chance that switching to Trade on Friday quietly picks
 *  up Tuesday's reimport. */
export interface FrozenLevel {
  key: string
  /** the column as the business writes it, e.g. 'Sell inc Rego' */
  label: string
  fieldId: string
  /** null is a REAL state: this table has that rung and it is empty */
  value: number | null
  scope: 'quote' | 'line'
}

/** Where a quote line's number came from, frozen at the moment it
 *  was picked. A quote renders from these and never reads a base
 *  table. */
export interface QuoteLine {
  id: string
  /** references — for "open this row", never for pricing */
  entityId: string
  rowId: string
  /** the join row that recorded the pick, when there was one */
  pairRowId?: string

  /* -- FROZEN ---------------------------------------------- */

  label: string
  qty: number
  /** null is a REAL state: "not priced here". Never rendered as 0.
   *  `showZeros="0"` on the workbook's own quote sheet makes an
   *  unmatched lookup render as BLANK, indistinguishable from a free
   *  inclusion. We render the opposite of blank. */
  unitPrice: number | null
  priceFieldId: string | null
  priceColumnName: string | null
  /** the level asked for, and the one actually used when this table
   *  had no column for it — so "why is this at cash?" is answerable.
   *  Production loses the level entirely on save and every trade
   *  quote's PDF prices the hull at cash. */
  levelKey: string
  levelResolved: string
  /** every rung this row carries, so a level change is frozen data */
  levels: FrozenLevel[]
  /** a rung a person chose FOR THIS LINE — a part switched to fitted,
   *  a hull switched to warranty. A quote-wide level change leaves a
   *  pinned line alone, because "fitted" is not an answer any trailer
   *  or motor has and a whole-quote switch must not silently unpick
   *  the one decision a person made by hand. */
  pinnedLevel?: boolean
  /** the seed's own Source cell, e.g. 'Boat Module!R282 KZ..LD' */
  sourceNote?: string
  /** the join's own columns — rigging kit, prop, engine hole, slot.
   *  THIS is the five-way association; production loses it to a
   *  fuzzy name match that fails open. */
  pairFacts?: Array<{ label: string; value: string }>
  recommended?: boolean
  image?: ImageRef

  /** An override sits BESIDE the frozen figure, never over it — the
   *  same discipline as PairOrigin on a view and BlockedValue on a
   *  constraint: the reason is written at the moment of the decision,
   *  never reconstructed afterwards. */
  overridePrice?: number
  overrideReason?: string
}

/* ---------------------------------------------------------- */
/* Adjustments                                                */
/* ---------------------------------------------------------- */

/** What kind of row this is. NOT in §8.1, and argued: the four
 *  controls the spec names ("Add a discount", "Add a rebate", "Add a
 *  trade-in", "Add a line") differ in the SIGN of what a person
 *  types and in one printed qualifier. Without this the app either
 *  asks a salesperson to type a minus sign — and is silently wrong
 *  when they forget — or hardcodes the sign per button and forgets
 *  it on the document. */
export type AdjustmentKind = 'discount' | 'rebate' | 'tradeIn' | 'line'

/** A discount, a rebate, a trade-in, a free line. Always its own
 *  visible row, always signed, NEVER folded into a subtotal — the
 *  workbook's own `Dealer Discount Given` (AB169) is a visible line
 *  on the customer's page, and the moment it stops being one nobody
 *  can answer "why is this $3,000 cheaper than the list?". */
export interface QuoteAdjustment {
  id: string
  kind: AdjustmentKind
  /** typed by a person. Never pre-filled and never suggested. */
  label: string
  /** signed: negative for a discount, a rebate and a trade-in */
  amount: number
  note?: string
}

/* ---------------------------------------------------------- */
/* The quote                                                  */
/* ---------------------------------------------------------- */

/** `draft` — everything editable.
 *  `issued` — the moment it was given to a customer: read-only, and
 *  the only remaining action is "Make a new version", which copies
 *  it into a fresh draft carrying `supersedesId` so the conversation
 *  has a history and neither document was edited behind anyone's
 *  back. There is no third state and no expiry engine: production
 *  shipped a complete, correct expiry module whose `expiryAt` is
 *  written nowhere, so both gates that depend on it never fire. */
export type QuoteState = 'draft' | 'issued'

export interface QuoteSection {
  blockId: string
  tableId: string
  title: string
  lineIds: string[]
  /** How many rows the view page had picked for this block when the
   *  quote was minted. Frozen with everything else, so it still reads
   *  true if the page is re-curated afterwards.
   *
   *  It exists so an EMPTY section can explain itself. A block is a
   *  menu — four picked motors are four a hull may be sold with, and a
   *  rig has one — so when several are picked and none is starred, the
   *  choice is genuinely a person's. Without this number the section
   *  said "Nothing from Yamaha Outboards on this quote yet", which
   *  reads as "you configured nothing" when in fact four choices were
   *  waiting. Absent on quotes minted before this existed. */
  pickedCount?: number
  /** How many rows the view page would have offered for this block
   *  that were HELD BACK because they are no longer sold — a
   *  discontinued row, or every row of a retired table.
   *
   *  It exists for the same reason `pickedCount` does. A section that
   *  quietly offered five of eight is a section a salesperson stops
   *  trusting; the picker says the number in words instead. Frozen
   *  with everything else, so the sentence still reads true if the
   *  sheet changes afterwards.
   *
   *  NOTHING ABOUT IT REACHES AN EXISTING LINE. A line on the quote
   *  is a frozen copy and prints what it froze — this number only
   *  describes what the PICKER declined to offer. */
  heldCount?: number
}

export interface QuoteDef {
  id: string
  reference: string
  state: QuoteState
  /** the page it was configured on, and the row it is for */
  viewId: string
  rootTableId: string
  rootRowId: string
  /** frozen: the subject's name and the specs printed under it */
  subjectLabel: string
  subjectSpecs: Array<{ label: string; value: string }>
  subjectImage?: ImageRef
  /** lines grouped the way the view page grouped them */
  sections: QuoteSection[]
  lines: QuoteLine[]
  adjustments: QuoteAdjustment[]
  levelKey: string
  /** typed by a person, as a percentage. Absent = the document
   *  prints the inclusive sentence and no ex-tax line. NEVER
   *  defaulted: `1.1` hardcoded in seven production files while
   *  `organisation.gstPercentage` sat unread is the exact trap. */
  taxRate?: number
  /** WHAT THE DOCUMENT PRINTS, and the only thing it prints. Frozen
   *  the moment a customer is picked, exactly like a line's price:
   *  a name corrected in the register on Friday does not rewrite the
   *  quote handed over on Monday, and a customer deleted from the
   *  register does not blank the document they were given. */
  customer: { name: string; contact?: string[] }
  /** WHO IT WAS ADDRESSED TO, AS A ROW — kept for exactly ONE thing:
   *  "show me this customer's other quotes".
   *
   *  It is not an exception to the rule at the top of this file, it
   *  is the FIRST of the two ids that rule already allows — the
   *  "open this row on the sheet" id — and it is the same shape, and
   *  the same promise, as `rootTableId` / `rootRowId` one field up:
   *  a pointer nothing drawn or totalled ever reads.
   *
   *  THE TEST THIS MUST KEEP PASSING: delete the customer from the
   *  register, or open the quote in a project where that register
   *  never existed, and the printed document is UNCHANGED — because
   *  every word on it came from `customer` above. If this field ever
   *  becomes something a renderer resolves, the quote has stopped
   *  being a photograph and Monday's number can move by Friday.
   *
   *  `tableId` travels with `rowId` because the register is an
   *  ordinary table with an ordinary id, and a project may be
   *  imported alongside another. Absent on every quote addressed to
   *  a name somebody typed, which stays a legitimate way to write a
   *  quote — a walk-in is not a filing error. */
  customerRef?: { tableId: string; rowId: string }
  preparedBy?: string
  organisation?: string
  /** the validity sentence, typed. The workbook's own is a typed
   *  sentence on the sheet, not a computation. */
  note?: string
  supersedesId?: string
  issuedAt?: string
  createdAt: string
  updatedAt: string
}
