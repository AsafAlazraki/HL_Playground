/* ============================================================
   A REASON, AND THE PARAGRAPH THAT FOLLOWS IT.

   THE MEASUREMENT THIS EXISTS FOR. Admin ▸ Business rules reads
   55.7% of its visible words in runs of twelve or more — measured
   on the real sheet at 1600x1000, 812 words of 1457. It is the
   worst surface left in the application by a wide margin, and
   sixteen `plainly` paragraphs are most of it: every pending rule
   card prints its whole reason, unconditionally, whether or not
   anybody is reading that card.

   WHAT IS NOT ALLOWED AS A FIX. Deleting a reason: rule 10 says
   anything that cannot be done says WHY, where it is, and a
   pending rule that showed only its state pill would be a refusal
   with the reason taken out. Paraphrasing one: these are the
   adjudicator's own words about this dealership's own price file,
   and an app that improves its own recorded reasons is an app
   whose reasons cannot be trusted.

   SO THE CUT IS THE AUTHOR'S OWN. Every one of these strings is
   built the same way — a first sentence that IS the reason, and a
   remainder that explains the app's limitation behind it:

     "It compares a column on the boat with a column on the
      motor." | "A sentence here can only talk about one kind of
      table at a time."

   The first sentence stays on the card. The rest joins `because`
   and the caveat behind the "Why" the card already has. Nothing
   is reworded and nothing is lost — it moves one press, which is
   the same treatment `because` was given for the same reason.

   WHY A REGEX AND NOT A STORED PAIR. Splitting at read time means
   a rule written tomorrow gets the behaviour without its author
   knowing this file exists. The cost is that the split must be
   safe on prose containing figures, and that is what the guards
   below are.
   ============================================================ */

/** The shortest first part worth cutting at. Below this the split
 *  is not buying anything and is more likely to have fired on an
 *  abbreviation than on a sentence. */
const FLOOR = 30

/** A sentence end: `.`, `!` or `?`, then whitespace, then a
 *  capital or an opening quote.
 *
 *  THE DIGIT IS WHAT MAKES IT SAFE. "97.7 %", "6.07.2026" and
 *  "F9 holds on 530 of 530" all carry periods, and every one of
 *  them is followed by a digit or a lower-case letter rather than
 *  a capital — so none of them matches. Tested against the real
 *  strings in `plainly.test.ts`, not asserted here. */
const END = /(?<=[.!?])\s+(?=["'“]?[A-Z])/

export interface Reason {
  /** what is drawn on the card. Never empty when the input is not. */
  first: string
  /** what moves behind "Why", or '' when there was only one
   *  sentence and nothing to move. */
  rest: string
}

/** Cut a recorded reason into the sentence that states it and the
 *  paragraph that elaborates it.
 *
 *  RETURNS THE WHOLE THING AS `first` WHEN IN DOUBT. A reason that
 *  cannot be split safely is a reason drawn in full — the failure
 *  mode is "too much prose", which is the thing this was written
 *  to reduce, and never "half a reason". */
export function splitReason(text: string | undefined): Reason {
  const said = (text ?? '').trim()
  if (said === '') return { first: '', rest: '' }

  const at = said.search(END)
  if (at < 0) return { first: said, rest: '' }

  /* `search` gives the index of the whitespace run; the sentence
     itself ends at the punctuation before it. */
  const first = said.slice(0, at).trim()
  const rest = said.slice(at).trim()

  if (first.length < FLOOR || rest === '') return { first: said, rest: '' }
  return { first, rest }
}
