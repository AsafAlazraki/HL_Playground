/* ============================================================
   THE ONE SUMMATION.

   One function, one export, used by the foot bar, the document and
   the print. Production has FOUR bespoke summations of one deal plus
   a hand-copied fifth, and they already disagree about rounding and
   cost fallbacks; adding one chargeable thing means editing all four
   and remembering the fifth. Adding one here means editing this.

   NOTHING IN THIS FILE READS THE STORE. It takes a quote and returns
   numbers. That is the whole invariant made mechanical: if the total
   cannot see live data, the total cannot drift.

   AND NO LOOKUP CAN POISON IT. The workbook's own quote sheet has an
   `IFERROR`-less `VLOOKUP` at AJ17, so one empty dropdown makes the
   Package Price, the customer total, the ex-GST total, the contract
   sum, the stock board's SELL PRICE and the whole finance strip read
   #N/A. Here a line either carries a frozen number or carries null,
   and null is DISPLAYED, COUNTED and EXCLUDED — never propagated.
   ============================================================ */

import { money } from '@/lib/money'
import type { QuoteAdjustment, QuoteDef, QuoteLine } from './types'

/** What one line contributes, and why. `amount` is null when the
 *  line has no price at all — a real state, never a silent zero. */
export interface LineAmount {
  /** the figure actually charged: the override when there is one */
  unit: number | null
  amount: number | null
  /** true when a person overrode the frozen figure; the document
   *  prints BOTH numbers, never just the new one */
  overridden: boolean
}

export function lineAmount(line: QuoteLine): LineAmount {
  const overridden = typeof line.overridePrice === 'number'
  const unit = overridden ? (line.overridePrice as number) : line.unitPrice
  if (unit === null || unit === undefined) {
    return { unit: null, amount: null, overridden }
  }
  const qty = Number.isFinite(line.qty) && line.qty > 0 ? line.qty : 1
  return { unit, amount: unit * qty, overridden }
}

export interface QuoteTotals {
  /** the lines, summed once */
  packageTotal: number
  /** every adjustment, summed with its own sign */
  adjustmentsTotal: number
  /** package + adjustments. Tax-inclusive, because every input is:
   *  `Motor Library!BB` is literally named RRP + Freight *Inc GST*,
   *  and the hull rung was grossed by the *1.1 inside MV!D37 before
   *  it was written down. One convention, so nothing is ever
   *  converted and no discount can land on the wrong side of tax. */
  total: number
  /** how many lines carry no price. The document says so out loud —
   *  a silent $0 on a customer-facing summary is the class of fault
   *  stakeholders catch. */
  unpricedCount: number
  /** only when a person typed a rate. Never defaulted, never assumed. */
  taxRate: number | null
  totalExcludingTax: number | null
  taxAmount: number | null
}

export function quoteTotals(quote: QuoteDef): QuoteTotals {
  let packageTotal = 0
  let unpricedCount = 0
  for (const line of quote.lines) {
    const { amount } = lineAmount(line)
    if (amount === null) {
      unpricedCount += 1
      continue
    }
    packageTotal += amount
  }

  let adjustmentsTotal = 0
  for (const a of quote.adjustments) {
    if (Number.isFinite(a.amount)) adjustmentsTotal += a.amount
  }

  const total = packageTotal + adjustmentsTotal

  /* THE ONE PLACE TAX IS TOUCHED, and only when a person typed a
     rate. There is no tax-rate column anywhere in the seeded data,
     and the workbook shows a customer exactly one tax figure —
     AB174 = X170/1.1 — under a clause reading that amounts are
     inclusive unless otherwise stated. Blank stays blank. */
  const rate =
    typeof quote.taxRate === 'number' && Number.isFinite(quote.taxRate) && quote.taxRate > 0
      ? quote.taxRate
      : null
  const totalExcludingTax = rate === null ? null : total / (1 + rate / 100)
  const taxAmount = totalExcludingTax === null ? null : total - totalExcludingTax

  return {
    packageTotal,
    adjustmentsTotal,
    total,
    unpricedCount,
    taxRate: rate,
    totalExcludingTax,
    taxAmount,
  }
}

/** The lines of one section, in the order the section holds them.
 *  Sections carry line IDS rather than lines so a line can be moved
 *  between sections without two arrays disagreeing about which one
 *  owns it. */
export function linesOf(quote: QuoteDef, lineIds: string[]): QuoteLine[] {
  const byId = new Map(quote.lines.map((l) => [l.id, l]))
  const out: QuoteLine[] = []
  for (const id of lineIds) {
    const line = byId.get(id)
    if (line) out.push(line)
  }
  return out
}

/** Lines belonging to no section — a free line typed on the quote
 *  itself. Drawn last, never dropped: a line that is in `lines` and
 *  in no section still charges the customer, so it must be visible. */
export function looseLines(quote: QuoteDef): QuoteLine[] {
  const claimed = new Set(quote.sections.flatMap((s) => s.lineIds))
  return quote.lines.filter((l) => !claimed.has(l.id))
}

/* ============================================================
   THE OVERRIDE WITH NOTHING WRITTEN BESIDE IT.

   `setOverride` puts a typed price BESIDE the frozen one and takes a
   reason with it, which is the right shape. What was missing is the
   only half that matters six weeks later: nothing asked for the
   reason before the document went out, so a quote could be given to
   a customer carrying a number a person typed and no record of why.

   That is production's §3.5 exactly — the margin-override reason is
   written to `window.__marginOverrideAudit` and read by nothing —
   one step worse, because here it was never written at all. And it
   is unrecoverable by construction: after issue the document is
   read-only, so the reason cannot be added afterwards. It is written
   at the moment of the decision or it does not exist.

   PURE, and here rather than in `quotes.ts`, because three surfaces
   ask the same question — the foot bar (may this go out?), the line
   (why is my Why field being asked for?) and `issueQuote` itself
   (the line that makes the refusal true).
   ============================================================ */

/** Lines carrying a price somebody typed with no reason beside it.
 *  Empty when the quote may be given out. */
export function unexplainedOverrides(quote: QuoteDef): QuoteLine[] {
  return quote.lines.filter((l) => needsOverrideReason(l))
}

/** True of one line: a typed price, and nothing written about it.
 *  Whitespace is not a reason — `' '` prints as a blank on the
 *  document and reads as a reason that was given. */
export const needsOverrideReason = (line: QuoteLine): boolean =>
  line.overridePrice !== undefined && (line.overrideReason ?? '').trim() === ''

/** A one-line answer to "is this quote worth showing to anyone yet?"
 *  — used by the foot bar, never as a gate. Nothing here blocks a
 *  sale: production's margin gate runs on a guessed cost and blocks
 *  real ones. */
export const isEmptyQuote = (quote: QuoteDef): boolean =>
  quote.lines.length === 0 && quote.adjustments.length === 0

/* ============================================================
   EVERY REASON A QUOTE MAY NOT BE GIVEN TO A CUSTOMER, IN ONE PLACE.

   ISSUING IS THE ONE IRREVERSIBLE ACT IN THIS APP. It freezes the
   document — `mutate` refuses every edit afterwards — and the only
   thing left is "Make a new version". So anything that cannot be
   repaired after the press has to be refused before it, and refused
   with a sentence in the place it is refused (DESIGN_PRINCIPLES rule
   10): never a disabled button on its own.

   The four holes, and the ruling on each. All four were reachable;
   only the last one was closed.

   1 · NO CUSTOMER NAME — REFUSED. Measured: open a boat, press "Quote
       this one", press "Give it to the customer" without touching the
       customer field. It issued, and the frozen document printed the
       placeholder sentence "the customer's name is not filled in yet"
       where a name belongs. A quotation is addressed to somebody by
       definition; one addressed to nobody is worthless, and it was now
       permanent. The name is typed now or never.

   2 · NOTHING ON IT — REFUSED. Not reachable from the app's own path,
       because the subject is minted as a line and the subject's line
       has no remove control — but reachable from a FILE. `normQuote`
       will read a quotes block whose lines all failed narrowing, and
       what arrives is an editable draft with nothing on it. A frozen
       document that offers the customer nothing is the same failure as
       (1) with the other half missing.

   3 · A TOTAL OF NOUGHT THAT NOBODY DECIDED ON — REFUSED. Two live
       paths reach it. A subject row whose table has no price column
       freezes `unitPrice: null`, and the seed's own Haines Signature
       boats carry a literal 0 in their price column — "Signature Fisher
       - 525F, $0" on the Boats module today. Either way the document
       goes out reading Total $0, which is the `showZeros="0"` fault the
       whole feature was written against, restated at the level of a
       whole document: nought reads as free.

       AND THE RULING ON A NOUGHT TOTAL THAT IS REAL: allowed, and the
       test for it is whether a person STATED anything. A $62,000
       package against a $62,000 trade-in is an even swap — a real
       document, in two visible rows, with the dealer's own words in the
       trade-in's label — and it totals nought. So the gate asks for a
       signed adjustment, not for a positive total: refusing every
       nought would invent a pricing policy the dealer's data does not
       contain, and inventing business rules is the thing this app is
       most careful about. What is refused is a nought that means "we do
       not know", never one that means "no charge".

   4 · AN OVERRIDE WITH NO REASON — REFUSED, and already was. See the
       block above: the reason is written at the moment of the decision
       or it does not exist.

   PURE, and here beside `unexplainedOverrides`, because FOUR surfaces
   ask the same question and none of them may disagree: the button (may
   this be pressed?), the foot bar (why not?), the customer field (which
   keystroke fixes it?) and `issueQuote` itself, which is the line that
   makes the refusal true.
   ============================================================ */

/** The dealer's own line names, read out as a person would say them.
 *  Never truncated to a count: "2 lines" tells somebody there is a
 *  problem and not where it is, and the whole point of the sentence is
 *  that they can go and fix it. */
function nameList(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

/** True when the document would go out at a total of nought that
 *  nobody decided on — the lines are unpriced or priced at nought and
 *  no adjustment states anything.
 *
 *  A nought total a person BUILT carries a signed adjustment and is
 *  allowed through: that is the even swap, and it is a real document.
 *  An adjustment sitting at 0 states nothing — that is the amount
 *  `addAdjustment` starts a fresh row at. */
export function totalIsNothingByDefault(quote: QuoteDef): boolean {
  if (quoteTotals(quote).total !== 0) return false
  for (const a of quote.adjustments) if (Number.isFinite(a.amount) && a.amount !== 0) return false
  return true
}

/**
 * WHY THIS QUOTE MAY NOT GO OUT YET — one sentence per reason, in the
 * order a person reading the screen top to bottom would fix them.
 * Empty when it may go out.
 *
 * Each sentence says what is wrong, what to do about it, and why it
 * cannot wait. They live here rather than in the editor so that
 * `issueQuote` and the button it disables cannot describe the same
 * quote differently.
 */
export function issueBlockers(quote: QuoteDef): string[] {
  const why: string[] = []

  if (quote.customer.name.trim() === '') {
    why.push(
      'This quote is addressed to nobody. Type the customer name at the top — giving it to them freezes the document, so a name left out now cannot be added afterwards.',
    )
  }

  if (isEmptyQuote(quote)) {
    why.push(
      'There is nothing on this quote to offer. Add a line, or pick one from a section above, before it goes to the customer.',
    )
  } else if (totalIsNothingByDefault(quote)) {
    why.push(
      `This quote comes to ${money(0)}, which a customer reads as no charge. Price the lines it is made of — or if the deal really is an even swap, put the trade-in on it so the document says so.`,
    )
  }

  const blocked = unexplainedOverrides(quote)
  if (blocked.length > 0) {
    const names = nameList(blocked.map((l) => l.label))
    why.push(
      blocked.length === 1
        ? `${names} has a price you typed and no reason beside it. Open the line and write why it is different — once this goes to the customer nothing on it can be changed.`
        : `${blocked.length} lines have a price you typed and no reason beside them — ${names}. Open each and write why it is different; once this goes to the customer nothing on it can be changed.`,
    )
  }

  return why
}

/** The default label for an adjustment row's amount column, so the
 *  document and the editor never describe the same row differently. */
export function adjustmentSign(a: QuoteAdjustment): 'credit' | 'charge' {
  return a.amount < 0 ? 'credit' : 'charge'
}
