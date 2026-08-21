/* ============================================================
   STARTING POINTS — the price file's own rules, offered as the
   first move of a sentence.

   WHY THIS EXISTS. A blank rule builder asks a person to invent a
   business rule out of nothing, standing in front of 53 tables and
   2,026 columns. But this business has already written its rules
   down: sixteen of them were mined out of the Master Price File,
   adjudicated cell by cell, and are sitting in `workbookRules.ts`
   with their evidence. Offering those as the opening move turns
   "what rule would you like to write?" into "here is what your price
   file already asserts — which of these do you want to say out loud?"

   WHAT AN OFFER MAY AND MAY NOT DO — and this is the whole design.

   NOT ONE of the sixteen can be stated as a `ConstraintDef` today.
   That is not a gap in this file; it is the adjudicated finding, and
   `workbookRules.ts` says so in its own header: "sixteen admitted
   rules, and ALL SIXTEEN are blocked". So an offer must never claim
   to write the workbook's rule for you. It does the one honest thing
   it can: IT POINTS THE SENTENCE AT THE COLUMNS THAT RULE IS ABOUT,
   on this dealership's own tables, and prints the workbook's reason
   under it. The words, the verbs and the values stay the person's.

   And where it cannot even do that, it says WHICH PART stops it,
   computed against the loaded sheet rather than read off the seed:

     'points'      every column it names is on the sheet, and they are
                   all on one kind of table. The sentence can be
                   pointed at them.
     'cross-kind'  the columns are real but live on two kinds of table.
                   A sentence is single-kind by construction —
                   `state.tablesFor` keeps only tables carrying EVERY
                   column named, so a two-kind sentence reaches none.
     'missing'     a column it names is not on this sheet at all. Named,
                   in the seed's own words, so the gap is actionable.

   Nothing here is typed. Every statement, reason, source and citation
   comes off a `WorkbookRuleSeed`; every count, kind and column comes
   off the loaded sheet. The two never meet in a sentence somebody
   made up.
   ============================================================ */

import { newId, nowIso } from '@/lib/id'
import type { ConstraintDef, TableKind } from '@/types/model'
import { kindLabel, type ColumnConcept } from './columns'
import type { SentenceCtx } from './describe'
import { emptyClause, makeClause, singleGroup } from './edit'
import { WORKBOOK_RULES, type WorkbookRuleSeed } from './workbookRules'

/** What this surface can do with one workbook rule, measured against
 *  the sheet that is loaded right now. */
export type OfferState = 'points' | 'cross-kind' | 'missing'

/** A column a seed names that this sheet does not have. Held apart from
 *  the refusal sentence so the surface can set it as the identifier it
 *  is — it is the seed's key, not a name anybody typed into a cell. */
export interface MissingColumn {
  kind: TableKind
  /** the column as the seed's `needs` key writes it */
  name: string
}

export interface StartingPoint {
  seed: WorkbookRuleSeed
  state: OfferState
  /** the columns it names that ARE on the sheet, in the seed's order */
  columns: ColumnConcept[]
  /** the ones that are not */
  missing: MissingColumn[]
  /** distinct kinds of table it reaches across. More than one is why a
   *  sentence cannot hold it. */
  kinds: TableKind[]
  /** one sentence: what this surface cannot state about it. `null` when
   *  the offer points. */
  refusal: string | null
}

/** `kind::normalised name` — the shape `columns.buildConcepts` mints and
 *  `WorkbookRuleSeed.needs` is written in. */
function splitKey(key: string): { kind: TableKind; name: string } {
  const at = key.indexOf('::')
  return {
    kind: (at < 0 ? 'custom' : key.slice(0, at)) as TableKind,
    name: at < 0 ? key : key.slice(at + 2),
  }
}

/** "Boats" and "Motors" → "Boats and Motors"; three or more take the
 *  Oxford-free list the sentence surface already uses for values. */
function kindWords(kinds: TableKind[]): string {
  const words = kinds.map(kindLabel)
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

function refusalFor(
  state: OfferState,
  columns: ColumnConcept[],
  missing: MissingColumn[],
  kinds: TableKind[],
): string | null {
  if (state === 'points') return null

  if (state === 'missing') {
    const one = missing.length === 1
    return `Your sheet has no column for ${one ? 'one part' : `${missing.length} parts`} of this rule, so no sentence here can name ${one ? 'it' : 'them'}.`
  }

  /* CROSS-KIND, AND IT NAMES BOTH SIDES. "It compares two kinds of
     table" is true of nine of the sixteen and tells a person nothing;
     which column sits on which kind of table is the fact they can act
     on, and it is the fact the sheet can supply. */
  const byKind = kinds.map((kind) => {
    const names = columns.filter((c) => c.kind === kind).map((c) => c.name)
    return `${names.join(' and ')} on your ${kindLabel(kind)} tables`
  })
  return `It compares ${byKind.join(' with ')}. One sentence talks about one kind of table at a time, so this one cannot be written here.`
}

/** Read one seed against the loaded sheet. */
function offerFor(seed: WorkbookRuleSeed, byKey: Map<string, ColumnConcept>): StartingPoint {
  const columns: ColumnConcept[] = []
  const missing: MissingColumn[] = []
  for (const key of seed.needs) {
    const concept = byKey.get(key)
    if (concept) columns.push(concept)
    else missing.push(splitKey(key))
  }

  const kinds = [...new Set(seed.needs.map((k) => splitKey(k).kind))]
  /* A MISSING COLUMN IS REPORTED BEFORE A SECOND KIND, in the same
     reading order `missingChoice` uses next door: the more fundamental
     obstacle first, and one thing to fix at a time. */
  const state: OfferState =
    missing.length > 0 ? 'missing' : kinds.length > 1 ? 'cross-kind' : 'points'

  return { seed, state, columns, missing, kinds, refusal: refusalFor(state, columns, missing, kinds) }
}

/** How loud an offer is: what can be done first, then what is real and
 *  cannot be said here, then what this sheet has no column for. Inside a
 *  band the adjudication's own order is kept. */
const BAND: Record<OfferState, number> = { points: 0, 'cross-kind': 1, missing: 2 }

/** Every workbook rule, read against the sheet that is loaded. */
export function startingPoints(ctx: SentenceCtx): StartingPoint[] {
  const byKey = new Map(ctx.concepts.map((c) => [c.key, c]))
  return WORKBOOK_RULES.map((seed) => offerFor(seed, byKey)).sort(
    (a, b) => BAND[a.state] - BAND[b.state],
  )
}

/**
 * The draft an offer opens on: the sentence pointed at the columns that
 * rule is about, and NOTHING ELSE ANSWERED.
 *
 * The verbs are the blank draft's own `is` / `must be` and every value
 * is unset, so `missingChoice` still refuses the Add button and the
 * person still makes every claim the rule makes. This is the line the
 * whole feature stands on: the workbook chose the columns, and a
 * business fact this dealership never stated cannot arrive by pressing
 * a button.
 *
 * The reason IS carried across, verbatim, because it is the
 * adjudicator's own sentence about why those two columns are related —
 * and it stays editable.
 */
export function draftFrom(offer: StartingPoint, ctx: SentenceCtx): ConstraintDef | null {
  if (offer.state !== 'points' || offer.columns.length === 0) return null
  const now = nowIso()
  const [first, second] = offer.columns
  return {
    id: newId(),
    /* a `table` seed is a whitelist of approved combinations, which is
       not a sentence — pointed at its columns it becomes an ordinary
       draft, and says so by taking the ordinary kind */
    kind: offer.seed.kind === 'excludes' ? 'excludes' : 'implies',
    if: singleGroup(makeClause(first, ctx)),
    then: singleGroup(second ? makeClause(second, ctx) : emptyClause()),
    because: offer.seed.because,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
}

/** Whether a draft is still the one this offer opened — the moment a
 *  person re-points a column, the offer's citation is describing a
 *  sentence that no longer exists and must come off the screen. */
export function stillFrom(offer: StartingPoint, draft: ConstraintDef, ctx: SentenceCtx): boolean {
  const named = new Set(
    [...draft.if.clauses, ...(draft.then?.clauses ?? [])]
      .map((c) => ctx.index.get(c.left.fieldId)?.key)
      .filter((k): k is string => k !== undefined),
  )
  return offer.columns.every((c) => named.has(c.key))
}

/** What the catalogue is, counted — never a stored figure. */
export interface OfferTally {
  total: number
  points: number
  crossKind: number
  missing: number
  /** the kinds of table the pointable offers are about */
  kinds: TableKind[]
}

export function tally(offers: StartingPoint[]): OfferTally {
  const points = offers.filter((o) => o.state === 'points')
  return {
    total: offers.length,
    points: points.length,
    crossKind: offers.filter((o) => o.state === 'cross-kind').length,
    missing: offers.filter((o) => o.state === 'missing').length,
    kinds: [...new Set(points.flatMap((o) => o.kinds))],
  }
}

/** "Trailers and Accessories" — for the one line over the catalogue. */
export const offerKindWords = (kinds: TableKind[]): string => kindWords(kinds)
