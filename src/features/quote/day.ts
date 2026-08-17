/* ============================================================
   WHICH CALENDAR DAY A STORED INSTANT FALLS ON.

   Every timestamp on a quote is `nowIso()` — a UTC instant, which is
   the right thing to store and the wrong thing to print. Two surfaces
   printed one by taking `.slice(0, 10)` off the ISO string, which is
   the UTC calendar date, while everything around them used the LOCAL
   one:

     `referenceFor` (freeze.ts)   `20260818-01`, from
                                  getFullYear/getMonth/getDate
     the document's DATE plate    `Aug 18, 2026`, from
                                  toLocaleDateString

   MEASURED. Australia/Brisbane is UTC+10 and Northside Marine are in
   it. A quote issued at 02:28 local on 18 Aug drew, on one screen:
   the banner "Given to the customer · 2026-08-17", the plate "Aug 18,
   2026", and the reference "20260818-01" — one act, two calendar days,
   with the paragraph underneath pointing at the banner as the
   authoritative one ("the date it was given to them is above"). The
   window where it was wrong is every quote raised between midnight
   and 10am, which is most of a working morning.

   A quotation is a document with a date on it, and a dealer cannot
   explain two. So the day is read in the reader's own zone, from the
   same fields the reference is minted from, in ONE place that both
   surfaces call.

   THE STORED VALUE IS NOT TOUCHED. `createdAt` and `issuedAt` stay
   UTC instants — that is what an audit trail should be, and it is
   what makes an export comparable between two machines. This is a
   formatter, and only a formatter.

   THE FORMAT IS UNCHANGED: `YYYY-MM-DD`, so it still sits in
   `mono-label`'s tabular figures at the same width it always did.
   Only which day it names has moved.
   ============================================================ */

/** The calendar day a stored instant falls on, in the reader's own
 *  zone, as `YYYY-MM-DD`. An unparseable value is returned as its own
 *  first ten characters rather than as "NaN-NaN-NaN" — a stored string
 *  the app cannot read is still better shown than replaced. */
export function localDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
