/* ============================================================
   FINDING ONE QUOTE AMONG MANY, WITHOUT LEAVING THE LIST.

   `matches` was written for the pipeline board and lived in
   `features/pipeline/finding.ts`, which still re-exports it so
   nothing that imported it had to move. It is here because the LIST
   needs the same answer, and a second matcher would have been the
   fault this whole file is about: two surfaces on one stage, one
   search box each, quietly disagreeing about whether a query hits.

   It could not simply be imported the other way round.
   `pipeline/finding.ts` reads `quoteTotals` out of this feature, so
   the quote feature importing the pipeline would have closed a cycle
   — and the only alternative was the copy above.

   MODULE_SYSTEM §6.2 is what asked for it. It wants the quotes list
   to behave like a module index: "find by reference, by customer, by
   subject boat, by state". Three of those four arrive here. The
   fourth is answered twice already and is not answered a third time
   — the Board on this stage's own bar IS the states, drawn as
   columns, and the home dashboard card carries the same four lenses.

   WHY A NARROWING AND NOT THE PALETTE, given ⌘K already indexes
   every quote by the same three facts (`search/rowSearch.ts`,
   `QuoteEntry`). Because they are different acts. ⌘K is a JUMP: it
   takes a name and puts you somewhere else, and the list you were
   reading is gone. This is a NARROWING: the diary stays, the rows
   keep their totals and their Discard buttons, and what is on screen
   is still a list of quotes rather than a list of answers.
   ============================================================ */

import type { QuoteDef } from '@/types/model'

/** WORD BY WORD, over every word a person might remember: the
 *  reference, the customer, what is being sold, and who prepared
 *  it. Every word of the query must hit something — typing more
 *  narrows, which is the only behaviour a search box can have that
 *  never surprises anybody. */
export function matches(q: QuoteDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = [q.reference, q.customer.name, q.subjectLabel, q.preparedBy ?? '']
    .join(' ')
    .toLowerCase()
  return words.every((w) => hay.includes(w))
}

/**
 * WHAT A FIND THAT HOLDS NOTHING SAYS — rule 10, in the place it
 * failed.
 *
 * Not "no results". The person typed a string, and the useful fact
 * is WHICH string found nothing, quoted back so a typo is visible
 * without looking up at the field. It names what was searched too,
 * because the commonest cause of an empty find here is somebody
 * typing a MOTOR — a thing a quote contains and is not findable by,
 * for the reason rule 10 itself gives: a row that matched on a line
 * three screens inside it could not say why it was there.
 */
export const NOTHING_FOUND = (query: string): string =>
  `Nothing here matches “${query.trim()}”. Quotes are found by reference, customer, boat or who prepared them.`

/**
 * HOW MANY QUOTES BEFORE THE LIST GETS A FIND FIELD AT ALL.
 *
 * MEASURED, not guessed — driven in the running app at 1440×900
 * (`tools/teardown/diarysize.mjs`): a `.qt-list-row` is **90px**,
 * `.qt-list`'s row gap is **12px**, and the scrollport is **761px**,
 * so **7.46 rows** are on screen at once. Seven fit whole; the
 * eighth is where the list starts hiding things.
 *
 * A list that fits needs no tool for finding things in it, and a
 * filter bar over a short list is the clutter this pass exists to
 * remove — one was put over a five-item menu earlier in this same
 * pass and had to come straight back out. So: eight. Below that the
 * list IS the answer.
 */
export const FIND_FIELD_AT = 8
