/* ============================================================
   THE SECOND QUOTE TO SOMEBODY, STARTING FROM WHAT IS KNOWN.

   A dealer quotes the same customer three times in a fortnight —
   the same hull with a bigger motor, the same rig after a price
   rise, the same trailer for a different boat. The second quote
   should not be typed from nothing.

   WHAT IS REUSED, AND WHAT IS DELIBERATELY NOT.

     REUSED   the ROW being sold and the PAGE it was configured on,
              which is what `quoteLikeThisOne` already does, and the
              CUSTOMER, re-read from the register at this moment.

     NOT      a single number. `quoteLikeThisOne` mints from TODAY's
              data, which is exactly why it is a new quote and not a
              copy: a hull that went up $900 last week quotes at the
              new price, and the old document goes on saying what it
              always said. A "duplicate" that carried last month's
              figures forward is how a business quotes a price it
              cannot honour.

   AND THE CUSTOMER IS RE-FROZEN, NOT COPIED. `freezeCustomer` reads
   the register now, so a phone number corrected on Tuesday reaches
   the new document — while the old one keeps the number it was given.
   That is the whole point of the freeze working in both directions.
   If the row has since been removed, the name and contact lines are
   carried across from the old document as ordinary typed text and NO
   `customerRef` is written: a pointer to a row that is not there is
   worse than no pointer, and the person is still the person.

   NOTHING HERE IS A NEW STORAGE MECHANISM. Every write goes through
   the quote registry's own exported functions.
   ============================================================ */

import {
  freezeCustomer,
  linkCustomer,
  patchQuote,
  quoteLikeThisOne,
  subjectStillOnSheet,
  unsellableSubject,
  type QuoteDef,
} from '@/features/quote'

/**
 * Why quoting this row again would be wrong, in one sentence, or ''
 * when it would not be.
 *
 * A screen offering the act draws this INSTEAD of the button, or
 * beside it — never a disabled control with no explanation
 * (DESIGN_PRINCIPLES rule 10). It reads live data, so it is computed
 * at render time from a component that is already subscribed to the
 * sheet; it never touches the quote it is asked about.
 */
export function whyNotAgain(quote: QuoteDef): string {
  if (!subjectStillOnSheet(quote)) {
    return `${quote.subjectLabel} is not on the sheet any more, so there is nothing to price. This quote still opens and still prints — it kept its own copy of every number on it.`
  }
  /* discontinued, or a whole table retired — the sentence is the
     quote feature's own, so this refusal and the view stage's are
     the same words rather than two attempts at one idea */
  const unsellable = unsellableSubject(quote.rootTableId, quote.rootRowId)
  if (unsellable !== '') return unsellable
  return ''
}

/**
 * Write them another one, at today's prices, addressed to the same
 * person. Returns the new draft, or null when there was nothing left
 * to price — in which case `whyNotAgain` says why, in words.
 */
export function quoteAgain(quote: QuoteDef): QuoteDef | null {
  const made = quoteLikeThisOne(quote)
  if (!made) return null

  const rowId = quote.customerRef?.rowId
  if (rowId) {
    const frozen = freezeCustomer(rowId)
    if (frozen) {
      linkCustomer(made.id, frozen)
      return made
    }
  }

  /* no row behind them — a walk-in, or somebody since taken out of
     the register. The name they were addressed by is still a fact
     about this conversation, so it travels; the pointer does not. */
  if (quote.customer.name.trim() !== '' || (quote.customer.contact?.length ?? 0) > 0) {
    patchQuote(made.id, { customer: quote.customer })
  }
  return made
}
