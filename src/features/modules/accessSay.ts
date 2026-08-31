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

/** WHAT IS NOT TRUE YET, said wherever access is set. The second
 *  sentence is the one that matters — a setting made today is not
 *  discarded, it is waiting.
 *
 *  THE REASON WAS OUT OF DATE, AND VISIBLY SO. It read "Nobody signs
 *  in to this build", on a screen with the signed-in person's name
 *  and role in the rail eight inches to its left — and the role
 *  ladder is enforced: `atLeast` decides whether the Data and Admin
 *  doors are drawn at all. A refusal a person can see is false is
 *  worse than no refusal, because it is the app telling them its own
 *  account of itself cannot be trusted.
 *
 *  WHAT IS ACTUALLY TRUE is narrower and is still a refusal: signing
 *  in works and roles are real, but nothing reads `module.access` —
 *  no screen in this repository consults it — so a grant made here
 *  changes nothing today. That is the sentence, and rule 10 is kept:
 *  the thing that cannot be done says why, where it is. */
export const ACCESS_NOT_ENFORCED =
  'Nothing here is enforced yet: no screen checks these grants. What you set travels with the place and will be.'

/** WHAT A ROLE IS. It was two sentences on both screens; the half a
 *  person cannot work out from the grid is that a role is inert
 *  until a place grants it something. */
export const ROLE_IS = 'A role is a job at your dealership; it becomes real in a place.'
