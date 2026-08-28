/* ============================================================
   BRINGING A MEASURED PATTERN HOME — the one door between the
   discovery engine and the rule store, and the guarantee that
   nothing can get through it carrying the power to prune.

   ── THE PROBLEM THIS FILE CLOSES ─────────────────────────────

   `src/features/constraints/discover.ts` reads a price file and
   proposes the rules the file already follows. Every proposal is
   OBSERVED — read off values, never off a formula — and an observed
   pattern can be a coincidence. Pruning on a coincidence deletes
   real business, which is why `MAY_PRUNE` is `false` and why kept
   patterns were held OUT of the constraint store entirely, in a
   register of their own.

   The cost of that safety was that a kept pattern DID NOTHING. It
   could not be listed beside the rules, edited, switched off,
   exported or reasoned about, because it was not a rule — it was a
   row in a private table, and the screen that offered to keep it
   promised a warning nothing delivered.

   `ConstraintDef.severity` closes that. A rule may now say what it
   is allowed to do when it disagrees with a row, and 'warn' means
   ANNOTATE AND REMOVE NOTHING (`src/lib/configure/solve.ts`, rule 5
   in its header). So a kept pattern can be a real rule, in the real
   store, and still be structurally incapable of deleting a row.

   ── THE GUARANTEE, AND WHERE IT LIVES ────────────────────────

   NOTHING OBSERVED MAY EVER BE STORED AS 'block'. That is not a
   convention here, it is a function: `sanitiseObserved` coerces the
   severity of anything carrying observed provenance, and it is
   applied at every seam a ConstraintDef can enter the registry —
   the adoption below, `registerConstraints`, `putConstraint`, and
   the localStorage `load`, which matters most of all because
   storage is a text file a person can edit.

   Provenance is recognised two ways, deliberately redundant: the
   `source` marker and the `observed:` id prefix. An adopted rule
   carries both, so stripping one by hand does not launder it.

   ── WHAT MAY BE ADOPTED, AND WHAT MAY NOT ────────────────────

   ONLY A SHAPE THAT CAN BE SAID AS A SENTENCE. `workbookRules.ts`
   already established the discipline this follows: a seed becomes a
   constraint the moment it has a `build`, and until then it is
   LISTED WITH ITS BLOCKER rather than approximated. The same is
   true here, and for the same reason — a rule the app cannot state
   is a sentence on screen the business never wrote.

   Of the five candidate shapes exactly one is expressible today:

     numeric-bound          YES. Two columns compared. `binds.far` is
                            the upper side by construction (see the
                            candidate's own comment: the catalogue is
                            drawn from `upper`), so the invariant is
                            far >= near and the direction needs no
                            guessing.
     categorical-selector   no — the allowed value set is not carried
                            on the finding, only the rate it held at.
     join-key               no — it is a statement about identity,
                            not about a value a picker offers.
     functional-dependency  no — "this column settles that one" needs
                            a clause vocabulary for a mapping, which
                            the sentence surface does not have.
     uniqueness             no — a statement about a whole table.

   A pattern that cannot be adopted is NOT lost and NOT silently
   dropped: `blocked` comes back with the reason in words, and the
   register keeps holding it as a report. That is the same answer
   `RulesLedger` already draws for the sixteen workbook seeds.

   Pure TypeScript. No React, no store, no DOM: it takes a resolver
   for concept -> field id and returns a value.
   ============================================================ */

import type { Clause, ClauseGroup, ConstraintDef } from '@/types/model'

/** The `source` every adopted rule carries, and one half of how
 *  provenance is recognised afterwards. */
export const OBSERVED_SOURCE = 'Measured on your price file'

/** The other half. An id may not be edited to escape the coercion
 *  without also breaking the link back to the finding. */
export const OBSERVED_ID_PREFIX = 'observed:'

/** The only severity an observed rule may ever hold. */
export const OBSERVED_SEVERITY = 'warn' as const

/* ---------------------------------------------------------- */
/* What comes in                                              */
/* ---------------------------------------------------------- */

/** One column of a finding, as the discovery engine names columns.
 *  `conceptKey` is `columns.buildConcepts`'s key — kind plus the
 *  normalised name — which is what a field id is resolved from. */
export interface ObservedColumn {
  conceptKey: string
  name: string
}

/**
 * A FINDING, REDUCED TO WHAT ADOPTION NEEDS.
 *
 * Deliberately not `Candidate` and not `KeptPattern`: this module is
 * in `src/lib` and must not reach into a feature. The register maps
 * its own record onto this, which also means an old stored record
 * that predates `binds` maps to `binds: null` and is answered with a
 * blocker rather than a guess.
 */
export interface ObservedPattern {
  id: string
  shape: string
  /** the rule in one sentence, in the file's own column names */
  statement: string
  /** reads after "because" — always the measurement */
  because: string
  /** the tables and columns it was measured from */
  source: string
  binds: { far: ObservedColumn; near: ObservedColumn | null } | null
  hits: number
  tested: number
}

/** Adopted, or held back with the reason said in words. */
export type Adoption =
  | { adopted: ConstraintDef; blocked?: undefined }
  | { adopted?: undefined; blocked: string }

/** conceptKey -> a field id a clause may point at, or undefined when
 *  this project has no table carrying that column. */
export type ResolveField = (conceptKey: string) => string | undefined

/* ---------------------------------------------------------- */
/* The guarantee                                              */
/* ---------------------------------------------------------- */

/** Does this constraint carry observed provenance? Either marker is
 *  enough — that is the point of having two. */
export function isObservedConstraint(c: ConstraintDef | undefined): boolean {
  if (!c) return false
  if (typeof c.id === 'string' && c.id.startsWith(OBSERVED_ID_PREFIX)) return true
  return c.source === OBSERVED_SOURCE
}

/**
 * THE COERCION. An observed rule leaves this function as 'warn' or
 * it does not leave it.
 *
 * Note what is NOT done: nothing else is touched, and a rule with no
 * observed provenance is returned exactly as it came in, including
 * its absent severity — because absent means 'block' and every rule
 * written before `severity` existed must keep its meaning.
 */
export function sanitiseObserved(c: ConstraintDef): ConstraintDef {
  if (!isObservedConstraint(c)) return c
  if (c.severity === OBSERVED_SEVERITY) return c
  return { ...c, severity: OBSERVED_SEVERITY }
}

/** The same, for a list — what a seam applies. */
export const sanitiseAllObserved = (list: ConstraintDef[]): ConstraintDef[] =>
  list.map(sanitiseObserved)

/* ---------------------------------------------------------- */
/* Adoption                                                   */
/* ---------------------------------------------------------- */

/** Why each shape other than the bound is held back, in the words a
 *  card prints. Written out rather than generated, because a blocker
 *  a person cannot argue with is a shrug. */
export const NOT_EXPRESSIBLE: Record<string, string> = {
  'categorical-selector':
    'the finding carries the rate the pattern held at, not the list of values it allows, and a rule that named the wrong list would be worse than no rule',
  'join-key':
    'it says which column identifies a row, which is a fact about the join and not about a value anybody picks',
  'functional-dependency':
    'it says one column settles another, and a sentence here compares a column with a value — there is no way to write a mapping',
  uniqueness: 'it is a statement about a whole table rather than about any one pairing',
}

const group = (clauses: Clause[]): ClauseGroup => ({ combinator: 'AND', clauses })

/**
 * Turn one measured pattern into a real rule — or say why not.
 *
 * The rule it builds for a numeric bound reads, in the app's own
 * sentence surface:
 *
 *   when  <near column> is not empty
 *   then  <far column> is at least <near column>
 *
 * The guard is not decoration. The bound was measured only over
 * pairings where BOTH numbers exist — the engine skips a row whose
 * column does not read as a number — so a rule that fired on a blank
 * would be claiming something that was never measured.
 */
export function adoptObserved(
  pattern: ObservedPattern,
  resolve: ResolveField,
  now: string,
): Adoption {
  if (!pattern || typeof pattern.id !== 'string' || pattern.id === '') {
    return { blocked: 'the finding has no id, so a decision about it could not be stored' }
  }

  if (pattern.shape !== 'numeric-bound') {
    const said = NOT_EXPRESSIBLE[pattern.shape]
    return {
      blocked: said ?? `this app has no sentence for a ${pattern.shape || 'pattern of that shape'}`,
    }
  }

  const far = pattern.binds?.far
  const near = pattern.binds?.near
  if (!far || !near) {
    return {
      blocked:
        'the stored decision predates the columns being recorded on it, so there is nothing to point a rule at — re-run discovery and keep it again',
    }
  }

  const farField = resolve(far.conceptKey)
  const nearField = resolve(near.conceptKey)
  if (!farField || !nearField) {
    const missing = !farField ? far.name : near.name
    return { blocked: `no table in this project carries a “${missing}” column any more` }
  }
  if (farField === nearField) {
    return {
      blocked: 'both sides resolve to the same column, so the rule would compare a value with itself',
    }
  }

  const id = `${OBSERVED_ID_PREFIX}${pattern.id}`
  const constraint: ConstraintDef = {
    id,
    kind: 'implies',
    if: group([{ id: `${id}#if`, left: { fieldId: nearField }, op: 'notEmpty' }]),
    then: group([
      {
        id: `${id}#then`,
        left: { fieldId: farField },
        op: 'gte',
        right: { kind: 'field', path: { fieldId: nearField } },
      },
    ]),
    because: pattern.because,
    why: `${pattern.statement} Measured on this project’s own price file: ${pattern.hits} of ${pattern.tested}. Nobody wrote this rule down — it was read off the values, so it warns and never removes.`,
    severity: OBSERVED_SEVERITY,
    enabled: true,
    source: OBSERVED_SOURCE,
    createdAt: now,
    updatedAt: now,
  }

  /* through the coercion on the way out, so there is exactly one
     place in this file that decides an observed severity */
  return { adopted: sanitiseObserved(constraint) }
}
