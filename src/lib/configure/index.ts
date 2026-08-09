/* ============================================================
   The configurator's constraint solver — public surface.

     import { solve, explain, describeChange } from '@/lib/configure'
     import type { ConfigureInput } from '@/lib/configure'

   THE QUESTION THIS MODULE ANSWERS: given ONE partial configuration,
   what can each field still be, and why is everything else gone?

   That is NOT the question '@/lib/rules' answers. That engine walks
   every row of every table producing (source, match) pairs — "which
   motors fit EVERY boat?". This one takes a single set of choices and
   propagates. The two live side by side on purpose; neither imports
   the other.

   Pure TypeScript: no React, no DOM, no store, no Dexie. The only
   import is '@/types/model'. Nothing here throws, for any input —
   unknown field ids, constraints pointing at deleted columns, cyclic
   implications and empty inputs all return a valid ConfigureState.

     solve(input)                       -> ConfigureState
     explain(state, fieldId, value)     -> BlockedValue | undefined
     describeChange(before, after, …)   -> the note after a choice

   ConfigureState is defined in '@/types/model' and is returned exactly
   as declared there: { domains, blocked, settled, fired, problems }.

   READING `domains`: every field given to solve() has an entry.
   A Choice or Yes/No column lists the values still available. A
   number, text, date, link or calculated column has NO enumerable
   domain, so its entry is [] until a choice fixes it to one value —
   emptiness there means "unbounded", not "impossible". `problems` is
   the authoritative signal for a contradiction; ask `isEnumerable`
   before reading an empty list as a conflict.

   `fired` lists the constraints that actually removed a value during
   this solve — that is what an "ACTIVE NOW" tag should read.
   ============================================================ */

export { solve, explain, MAX_ROUNDS } from './solve'
export type { ConfigureInput } from './solve'

export { describeChange } from './describe'

/* The option list a column ships with, and whether it has one at all —
   the UI needs the FULL list to draw a blocked value in place, struck
   through, beside the ones still available ("2 of 4 left"). */
export { optionsOf, isEnumerable } from './domain'
export type { FieldDomain } from './domain'

/* Shared value semantics, exported so a preview can never disagree
   with a solve. */
export { compare, formatValue, valueKey, isBlank } from './values'

export { evalGroup, evalClause, negateGroup, MAX_PAIRS } from './evaluate'
export type { Truth } from './evaluate'
