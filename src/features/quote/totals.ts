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

/** The default label for an adjustment row's amount column, so the
 *  document and the editor never describe the same row differently. */
export function adjustmentSign(a: QuoteAdjustment): 'credit' | 'charge' {
  return a.amount < 0 ? 'credit' : 'charge'
}
