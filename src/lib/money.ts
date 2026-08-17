/* ============================================================
   ONE MONEY FORMAT, FOR THE WHOLE APP.

   There were two, and a figure told you which surface you were on
   rather than what it cost. Measured on the Formosa item page:

     DEALER LIST PRICE  $8,228        ← 0 decimals, currency mark
     LANDED CTD          7,928.68     ← 2 decimals, no mark
                         9,359.4      ← ONE decimal, no mark

   Three formats, three columns, one row. The 1-decimal case is the
   giveaway: `maximumFractionDigits: 2` with no minimum prints
   `9359.4` as `9,359.4`, so a column of prices came out ragged
   against its own neighbours. Meanwhile the quote — the one document
   a customer actually reads — had already settled the question, and
   this is that answer, moved somewhere both features can reach it.

   THE FORMAT: grouped thousands, a leading `$`, a minus sign that is
   a real minus (U+2212), and CENTS ONLY WHERE THE FIGURE HAS CENTS.
   Never one decimal, never a bare number, never `$14,190.00` where
   the business writes `$14,190`.

   NOTHING IS EVER ROUNDED HERE. A rounded display over an unrounded
   total is how two summations of one deal start to disagree; the
   2-decimal case is the currency's own precision, not a rounding.

   It knows nothing about which COLUMN is money — that is
   `features/views/columns.ts`, which has the column name and the
   band it sits in. This file only sets a number.
   ============================================================ */

const grouped = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const groupedCents = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Money as the drawing office sets it. */
export function money(n: number): string {
  if (!Number.isFinite(n)) return ''
  const sign = n < 0 ? '−' : ''
  const abs = Math.abs(n)
  return `${sign}$${Number.isInteger(abs) ? grouped.format(abs) : groupedCents.format(abs)}`
}
