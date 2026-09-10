/* ============================================================
   "USE THE OBVIOUS TWO", AND WHETHER THEY ARE OBVIOUS

   UX_PASS §5, Finding 18: "Prefer `displayFieldId`; where the guess
   is weak, say it is a guess."

   WHAT IT DID. The control offering to pick the two columns a result
   set shows was called "Use the obvious two", and it took
   `fields[0]` from each table. Column order is an accident of how a
   spreadsheet was written — on the Northside set the first column of
   a boat table is as likely to be a code as a name — so the button
   was confidently naming an arbitrary column "obvious".

   DESIGN_PRINCIPLES §7 has the rule this breaks, and it is the last
   line of the section: "A suggestion that is confidently wrong is
   worse than no suggestion. If a guess is weak, say it is a guess."

   WHAT IT DOES NOW. `displayFieldId` is the column a table has
   NOMINATED as the one that labels its rows — it is what the
   reference picker, the node badge and the register already use. A
   table that declares one has answered the question, and that answer
   is obvious in the plain sense of the word. A table that does not
   has not, and the first column is then a guess: still the best
   guess available, still worth offering, and no longer offered under
   a word that claims certainty it does not have.

   IT IS A SEPARATE FILE BECAUSE THE SENTENCE IS THE POINT. Whether
   the pick is declared or guessed decides what the surface says, and
   that has to be assertable without a DOM.
   ============================================================ */

import type { EntityDef, FieldDef } from '@/types/model'

/** One table's answer, and how firm it is. */
export interface ObviousColumn {
  field: FieldDef
  /** true when the table nominated no display column and this is the
   *  first one instead — a guess, and said to be one */
  guessed: boolean
}

/**
 * The column a table would label its rows with.
 *
 * `null` when the table has no columns at all, which is a real state
 * on a table somebody has just made and not a failure to report.
 */
export function obviousColumn(entity: EntityDef | undefined): ObviousColumn | null {
  if (!entity) return null

  /* DECLARED BEATS FIRST, and the lookup is by id rather than by
     position: `displayFieldId` can name a column that has since been
     deleted, and a stale id must fall through to the guess rather
     than crash or resolve to whatever now sits at that index. */
  if (entity.displayFieldId !== undefined) {
    const declared = entity.fields.find((f) => f.id === entity.displayFieldId)
    if (declared) return { field: declared, guessed: false }
  }

  const first = entity.fields[0]
  return first ? { field: first, guessed: true } : null
}

/**
 * What the control says about what it is about to do.
 *
 * The two halves are named separately because they can differ: one
 * table may have nominated a column and the other may not, and a
 * sentence that averaged them would be wrong about both.
 */
export function obviousSay(
  source: ObviousColumn | null,
  match: ObviousColumn | null,
): string {
  const picks = [source, match].filter((p): p is ObviousColumn => p !== null)
  if (picks.length === 0) return ''

  const guesses = picks.filter((p) => p.guessed)
  if (guesses.length === 0) {
    /* Both tables answered the question themselves, so the control
       is reporting rather than proposing. */
    return `${picks.map((p) => p.field.name).join(' and ')} — the columns these tables label their rows with.`
  }

  const named = guesses.map((g) => g.field.name).join(' and ')
  const firm = picks.filter((p) => !p.guessed)
  const head =
    firm.length > 0
      ? `${firm.map((p) => p.field.name).join(' and ')}, and `
      : ''

  return guesses.length === picks.length
    ? `${named} — a guess. ${guesses.length === 1 ? 'That table has' : 'These tables have'} not said which column names a row, so this is the first one.`
    : `${head}${named} as a guess — that table has not said which column names a row, so this is the first one.`
}

/** The control's own words. It stops claiming certainty the moment
 *  either half is a guess, because a button is read before its hint
 *  and "obvious" is the part that would be wrong. */
export function obviousLabel(
  source: ObviousColumn | null,
  match: ObviousColumn | null,
): string {
  const picks = [source, match].filter((p): p is ObviousColumn => p !== null)
  if (picks.length === 0) return 'Use the obvious two'
  const anyGuess = picks.some((p) => p.guessed)
  if (picks.length === 1) return anyGuess ? 'Use the likely one' : 'Use the obvious one'
  return anyGuess ? 'Use the likely two' : 'Use the obvious two'
}
