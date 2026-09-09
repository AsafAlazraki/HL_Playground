/* ============================================================
   THE WORDS FOR ACCESS, IN ONE PLACE.

   TWO SCREENS SET THE SAME THING and they were saying it in two
   wordings. Access & roles opened with "…nothing here is enforced
   today. What you set is recorded on the place itself, travels with
   it, and is what will be enforced the day people sign in" — 35
   words. Module Settings' access panel said "…nothing here is
   enforced yet. It is recorded and travels with the module" — 20
   words, and "today" against "yet". Same for what a role IS:
   "in your own words" on one screen, "in the words you use for it"
   on the other.

   A REFUSAL BELONGS WHERE THE ACT IS, so both screens keep it —
   that is rule 10 and it is not the fault. The fault is two
   wordings of one fact, which is how a person starts wondering
   whether they are two facts. `discoverSay.ts` next door already
   sets the precedent: one set of words per fact, produced in one
   place, and the component's job is to place them.

   Pure strings. No React, no store.
   ============================================================ */

/** WHAT THESE GRANTS ACTUALLY DO, said wherever access is set.
 *
 *  IT HAS BEEN WRONG TWICE NOW, IN BOTH DIRECTIONS, and both times
 *  the fault was the same: the sentence stated a fact about the CODE
 *  and the code moved underneath it.
 *
 *  It read "Nobody signs in to this build", on a screen with the
 *  signed-in person's name in the rail eight inches to its left.
 *  Then it read "no screen checks these grants" — true when it was
 *  written, and false the day `writeCaps.ts` started asking `mayDo`.
 *  A refusal a person can see is false is worse than no refusal:
 *  it is the app telling them its own account of itself cannot be
 *  trusted.
 *
 *  SO IT IS NAMED FOR WHAT IT SAYS, NOT FOR ITS OLD ANSWER — the
 *  constant used to be `ACCESS_NOT_ENFORCED` and a name that carries
 *  a verdict is a name that goes stale with the verdict.
 *
 *  WHAT IS TRUE AT THIS COMMIT, and it is deliberately narrow because
 *  overclaiming here is the safety lie DECISIONS §2 was settled to
 *  end. The three WRITE verbs are enforced on a module's catalogue: a
 *  job not granted `add`, `edit` or `delete` is offered none of them
 *  there and is told which jobs may (`writeCaps.ts` → `mayDo`). The
 *  three READING verbs are still module-wide — the catalogue reads
 *  `browse`, `search` and `open` off the module's own capability list
 *  and does not ask who is standing there. Rule 10 is kept either
 *  way: what is not yet enforced says so, where it is set. */
export const ACCESS_ENFORCEMENT =
  'Writing is enforced: a job without add, edit or remove in a place is not offered them there, and is told which jobs are. Browse, search and open are not checked against a job yet.'

/** WHAT A ROLE IS. It was two sentences on both screens; the half a
 *  person cannot work out from the grid is that a role is inert
 *  until a place grants it something. */
export const ROLE_IS = 'A role is a job at your dealership; it becomes real in a place.'
