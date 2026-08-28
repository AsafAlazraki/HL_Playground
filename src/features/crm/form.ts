/* ============================================================
   THE SHAPE OF THE CUSTOMER FORM — one caption for a run of
   columns that all say the same sentence.

   THE FAULT THIS FIXES, COUNTED. The register ships with three
   columns whose descriptions are the same 69-character sentence,
   word for word: Phone, Email and Address each carry "Printed on a
   quote addressed to this customer, as it is written here."
   Drawn per field, that sentence appeared THREE TIMES, under three
   boxes standing side by side — 207 characters of caption under
   three inputs a person reads in one glance. Repetition that close
   together does not read as one fact said three times; it reads as
   three facts you then have to compare word by word to discover
   are identical. The measured form carried 294 characters of
   caption for two facts, and now carries 156 — pinned in
   customers.test.ts, so it cannot drift back.

   IT COLLAPSES A RUN, NOT A SET. Only ADJACENT columns join,
   because the caption is drawn UNDER the group and a group has to
   be contiguous for there to be an "under". Two identically
   described columns at opposite ends of the table stay two
   captions, which is right: nothing on the screen would connect
   them, so one caption would be claiming a grouping the layout
   does not show.

   IT IS DERIVED, LIKE THE FORM ITSELF. Nothing here knows the
   register's own columns. A dealer who adds four columns all
   described "For the workshop only" gets one caption for the four;
   a dealer who describes every column differently gets exactly
   what they wrote, once each. That is the same argument
   `customerFormFields` is built on — the five columns this app
   ships are not privileged.

   REJECTED: dropping the captions outright. They were the obvious
   cut, and they are the two facts on the screen a dealer cannot
   work out for themselves — which of their columns is printed on a
   document the customer is handed, and which is theirs alone. The
   repetition was the fault, not the sentence.
   ============================================================ */

import type { FieldDef } from '@/types/model'

/** A run of consecutive columns sharing one description. */
export interface FieldGroup {
  /** The sentence every column in this run carries. `''` when they
   *  carry none — the run is still a group, it simply draws no
   *  caption, so a form with no descriptions at all is one group
   *  and no prose. */
  say: string
  fields: FieldDef[]
}

/**
 * The form's columns, in the table's own order, with consecutive
 * runs of one description gathered under it.
 *
 * Order is preserved exactly and every column comes back exactly
 * once — this only decides where the captions go, never which
 * fields a person may edit.
 */
export function groupByDescription(fields: readonly FieldDef[]): FieldGroup[] {
  const out: FieldGroup[] = []
  for (const field of fields) {
    /* trimmed, because a description that differs only by trailing
       whitespace is the same sentence to a reader and the reader is
       who the grouping is for */
    const say = (field.description ?? '').trim()
    const open = out[out.length - 1]
    if (open && open.say === say) open.fields.push(field)
    else out.push({ say, fields: [field] })
  }
  return out
}

/* ============================================================
   AND THE OTHER REPETITION ON THIS PAGE, which is a row rather
   than a caption.

   A quote's reference is minted as `YYYYMMDD-NN` (`referenceFor`
   in the quote feature) and its day is formatted as `YYYY-MM-DD`
   (`localDay`) — deliberately the same three fields, read in the
   same order, so that one moment can never be printed as two
   calendar days. The consequence on a history row is that the two
   sit side by side saying the same eight digits:

     20260828-05  ·  2026-08-28

   THE DAY IS NOT ALWAYS REDUNDANT, which is why this is a
   question and not a deletion. A quote that arrived in an imported
   file carries whatever reference it was given — the quote suite's
   own fixtures use `Q-1`, `seed-3` — and for one of those the day
   is the only thing on the row saying when it was written.

   So the row prints the day when the reference is not already
   carrying it, and nothing when it is.
   ============================================================ */

/**
 * The day to print beside a quote's reference — `''` when the
 * reference already opens with it.
 *
 * `day` is `localDay`'s `YYYY-MM-DD`; a reference carries it when
 * it starts with the same digits, which is exactly what
 * `referenceFor` stamps.
 */
export function dayWorthSaying(reference: string, day: string): string {
  const stamp = day.replace(/-/g, '')
  /* a day that is not eight digits is not a day this can reason
     about — say it, rather than hide it on a guess */
  if (stamp.length !== 8 || !/^\d{8}$/.test(stamp)) return day
  return reference.trim().startsWith(stamp) ? '' : day
}
