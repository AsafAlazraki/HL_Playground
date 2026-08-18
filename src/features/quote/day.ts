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

   AND THE THIRD SURFACE, FOUND BY FINISHING THE SWEEP. The two above
   were what a reader SEES; the fault was also in what the reference
   COUNTS. `nthToday` in quotes.ts derived the `-01` suffix by
   comparing `.slice(0, 10)` of the stored instants against
   `.slice(0, 10)` of now — both UTC days — and then handed the count
   to `referenceFor`, whose stamp is built from LOCAL
   getFullYear/getMonth/getDate. So the two halves of one reference
   were reading different calendars for ten hours of every day at
   UTC+10.

   MEASURED, same zone, same morning. Three quotes raised on 17 Aug
   local between 10:00 and 23:59 all carry the UTC day 2026-08-17.
   The first quote of the NEXT local day, raised 18 Aug at 02:28,
   stamps `20260818` from the local fields — and counted 3 quotes on
   its UTC day, so it printed `20260818-04`. It was the first of the
   18th. Worse in the other direction: two quotes raised either side
   of 10:00 local on the same local day fall in different UTC days,
   so both can be the "first" and both print `-01` — one reference,
   two documents.

   `localDayOf` below is the fix's shape: ONE function that takes the
   instant and reads the same three fields the reference stamps from.
   `localDay` is now that function with a parse in front of it, so a
   stored string and a live `Date` can never disagree.
   ============================================================ */

/** The calendar day an INSTANT falls on, in the reader's own zone, as
 *  `YYYY-MM-DD`. This is the whole rule, in one place: the three
 *  fields `referenceFor` stamps a reference from, in the same order,
 *  so nothing that calls either can name two days for one moment. */
export function localDayOf(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/** The calendar day a stored instant falls on, in the reader's own
 *  zone, as `YYYY-MM-DD`. An unparseable value is returned as its own
 *  first ten characters rather than as "NaN-NaN-NaN" — a stored string
 *  the app cannot read is still better shown than replaced. */
export function localDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return localDayOf(d)
}
