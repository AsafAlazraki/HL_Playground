/* ============================================================
   NAME TWO THINGS, THEN LET THE FILE OFFER THE COLUMNS THAT COULD
   BIND THEM — the third way into the rule builder.

   THE OTHER TWO DOORS AND WHY THIS ONE IS DIFFERENT. A person can
   start from what the price file already asserts (`startingPoints`,
   sixteen adjudicated workbook rules), or from a blank sentence and
   watch `ConsequenceMeter` count what it would cost. Both of those
   begin with a COLUMN. This one begins with two THINGS — "Boats" and
   "Trailers" — because that is the question a person actually has,
   and it is how the fitment research was done: you know the two
   sides, and what you do not know is which column decides.

   ── WHAT IS MEASURED HERE: NOTHING ────────────────────────────

   Not one figure in this file is computed here. Every count comes
   off a `Candidate` that `discover.ts` measured, and every phrasing
   of one comes off `discoverSay.ts`. This file does three things and
   no others:

     1 · it asks `relatedPairs` which two kinds of table the price
         file's own join tables actually relate, and splits each
         relationship into its two DIRECTIONS, because "narrow my
         trailers from a boat" and "narrow my boats from a trailer"
         are different questions with different answers;
     2 · it takes a report the engine produced for ONE of those
         relationships and turns each candidate into an offer, keyed
         on the column being decided about;
     3 · it points the sentence at a chosen column, answering no verb
         and no value — exactly the line `startingPoints.draftFrom`
         holds, and for exactly the same reason.

   ── THE LESSON THE LIST EXISTS TO TEACH ───────────────────────

   FITMENT_RULES.md §1.2, and it is the whole reason this door is
   worth building: a trailer's ATM against a boat's weight holds on
   every pairing the price file writes and still leaves a mean 97.70 %
   of the trailer catalogue standing. It selects NOTHING. The series
   banner holds at the same perfect rate and leaves 0.92 %–7.83 %.
   SAME RATE, OPPOSITE WORTH.

   So the offers are BANDED by what they would DO — `Standing`, off
   `discoverSay.figuresFor` — and never sorted by how often they
   hold. A column that keeps nearly everything is a FLOOR and its
   band says so in the place a person is choosing.

   ── WHAT THIS DOOR CANNOT DO, AND SAYS ────────────────────────

   A `ConstraintDef` sentence talks about ONE KIND OF TABLE
   (`state.tablesFor` keeps only tables carrying every column the
   sentence names, so a two-kind sentence reaches none). The binding
   a person just chose is by construction across two kinds. So taking
   an offer does the one honest thing available: it points the
   sentence at the column on the side being NARROWED, leaves every
   verb and every value unanswered, and the surface prints what the
   measurement was and what the sentence cannot state. It never
   writes the cross-kind claim, because the sentence cannot hold it
   and a rule nobody wrote must never arrive by pressing a button.

   Pure functions. No React, no store.
   ============================================================ */

import { newId, nowIso } from '@/lib/id'
import { TABLE_KINDS } from '@/types/model'
import type { ConstraintDef, TableKind } from '@/types/model'
import type { ColumnConcept } from './columns'
import type { SentenceCtx } from './describe'
import { emptyClause, makeClause, singleGroup } from './edit'
import { relatedPairs } from './discover'
import type {
  Candidate,
  CandidateShape,
  DiscoveryProject,
  DiscoveryReport,
  RelationshipSide,
} from './discover'
import { figuresFor, narrowingOf, type Standing } from './discoverSay'

/* ---------------------------------------------------------- */
/* 1 · THE TWO SIDES                                           */
/* ---------------------------------------------------------- */

/** One side of a pair, ready to be read out loud. */
export interface PairSide {
  kind: TableKind
  /** the price file's own word for the side — the join's reference
   *  column name, "Boat", "Rigging Kit Option" */
  column: string
  /** the app's plural noun for the kind, "Boats" */
  label: string
  /** live rows of the kind */
  catalogue: number
}

/**
 * ONE DIRECTION OF ONE RELATIONSHIP: choose a `subject`, narrow the
 * `partner`.
 *
 * The direction is not decoration. `discover`'s discrimination
 * reading counts what is left of the FAR catalogue, so the columns
 * worth offering for "choose a boat, narrow my trailers" are trailer
 * columns, and the columns worth offering the other way round are
 * boat columns. One relationship, two questions, two answers.
 */
export interface RelatablePair {
  /** stable: the relationship plus which side is being narrowed */
  id: string
  relationshipKey: string
  subject: PairSide
  partner: PairSide
  /** pairings the price file writes on this relationship */
  pairings: number
  /** of those, the ones it marks as its own recommendation */
  recommended: number
  /** pairings held back because a side is retired or discontinued */
  heldBack: number
  /** the join tables it was read out of, by name */
  joins: string[]
}

const sideOf = (s: RelationshipSide): PairSide => ({
  kind: s.kind,
  column: s.column,
  label: TABLE_KINDS[s.kind].label,
  catalogue: s.catalogue,
})

/**
 * EVERY PAIR THIS PROJECT CAN ACTUALLY RELATE, both ways round.
 *
 * WHERE THE PAIRS COME FROM, AND WHY NOT A NEW WALK. The join
 * tables already record which pairs are real, and two things in this
 * project already read them: `fitment/reading.ts`, which counts the
 * fan-out per SUBJECT TABLE, and `discover.relationshipsOf`, which
 * groups them per KIND — which is the grouping the measurement is
 * run over. This door offers pairs that a measurement will then be
 * run against, so it asks the engine's own reading: a pair offered
 * here is a pair the engine can measure, by construction. A second
 * walk would eventually offer one it cannot, and that is a door to
 * nowhere.
 *
 * A relationship with no live pairings is still returned when
 * something was HELD BACK, because "every pairing here is against
 * stock nobody may sell" is a finding — `relationshipsOf` keeps it
 * for that reason and this must not throw it away.
 */
export function relatablePairs(project: DiscoveryProject): RelatablePair[] {
  const out: RelatablePair[] = []
  for (const r of relatedPairs(project)) {
    const left = sideOf(r.left)
    const right = sideOf(r.right)
    const common = {
      relationshipKey: r.key,
      pairings: r.pairings,
      recommended: r.recommended,
      heldBack: r.heldBack,
      joins: r.joins,
    }
    out.push({ id: `${r.key}→right`, subject: left, partner: right, ...common })
    out.push({ id: `${r.key}→left`, subject: right, partner: left, ...common })
  }
  /* the busiest relationship first — the one a person has written the
     most pairings on is the one they are most likely asking about —
     and inside it, the direction with more to narrow */
  return out.sort(
    (a, b) => b.pairings - a.pairings || b.partner.catalogue - a.partner.catalogue,
  )
}

/** The two shapes that bind a catalogue, and therefore the only two
 *  worth running for this question. A join key, a functional
 *  dependency and a uniqueness reading all carry
 *  `discrimination: null` — none of them can say how much of the far
 *  catalogue it leaves standing, which is the only thing this list
 *  ranks by. Naming them here bounds the run to about a twentieth of
 *  a whole-file measurement. */
export const BINDING_SHAPES: CandidateShape[] = ['categorical-selector', 'numeric-bound']

/* ---------------------------------------------------------- */
/* 2 · THE COLUMNS THAT COULD BIND THEM                        */
/* ---------------------------------------------------------- */

/** Which band an offer falls in — what the column would DO. The
 *  first four are `discoverSay.Standing`; 'refused' is the engine's
 *  own outright rejection (it rejects a pairing the price file marks
 *  as its own recommendation, or it simply does not hold). */
export type Band = Standing | 'refused'

export interface BindingOffer {
  /** the candidate's own id — stable across runs */
  id: string
  candidate: Candidate
  /** the column being decided about, on the side being narrowed */
  name: string
  kind: TableKind
  /** the column as a SENTENCE may name it. `null` when the engine
   *  could measure it and a sentence cannot talk about it — a
   *  calculated column is an outcome, not a choice — and then the
   *  row refuses, with `refusal` saying so. */
  concept: ColumnConcept | null
  /** WHAT THE COLUMN IS, in the workbook's own words. Several are
   *  cryptic — "Boat Size (Mtr) Fisher" — and this is the only thing
   *  on the screen that can say which cell it was read out of. */
  desc?: string
  /** what it was measured against, in one phrase */
  against: string
  band: Band
  /** rows of the far catalogue kept and rejected, or `null` where
   *  the engine measured no catalogue */
  kept: number | null
  rejected: number | null
  catalogue: number | null
  /** how many subjects the kept figure was averaged over */
  over: number | null
  /** "626 of 626" — two integers, never a bare percentage */
  holds: string
  /** the share left standing, "4.1%" */
  leaves: string
  /** why the sentence cannot be pointed at this column, or `null` */
  refusal: string | null
}

const BAND_ORDER: Record<Band, number> = {
  selects: 0,
  floor: 1,
  arithmetic: 2,
  'not-measured': 3,
  refused: 4,
}

/** The caption over each band, and the sentence under it. Every one
 *  of these is the adjudication's own position, quoted:
 *  `THRESHOLDS.floor` and `THRESHOLDS.vacuous` in `discover.ts` quote
 *  docs/specs/FITMENT_RULES.md §0 verbatim, and the selector line is
 *  `SHAPE_SAY['categorical-selector']`. */
export const BAND_SAY: Record<Band, { name: string; say: string }> = {
  selects: {
    name: 'Narrows the list',
    say: 'Each of these leaves a different, smaller set standing. This is the half of the file that actually picks something.',
  },
  floor: {
    name: 'A floor, not a selector',
    say: 'A rule that keeps 95 % of the catalogue has not selected anything — it is a floor, not a selector. These hold, and they choose nothing.',
  },
  arithmetic: {
    name: 'Nothing could break it',
    say: 'A bound no row in the catalogue could ever violate is arithmetic, not a rule. Worth knowing, never worth enforcing.',
  },
  'not-measured': {
    name: 'No catalogue behind it',
    say: 'Measured, but this shape narrows no list, so there is nothing left standing to count.',
  },
  refused: {
    name: 'Your own file disagrees',
    say: 'The price file writes pairings these would reject. A rule the business already breaks is a finding about the rule.',
  },
}

const REFUSED_BY_SENTENCE =
  'A rule sentence can only talk about a column it can read. This one is an outcome rather than a choice — calculated, a picture, or a link to another row — so no sentence here can be pointed at it.'

const REFUSED_BY_PAGE =
  'The sentence on this page names only the columns of the table it is about, and this column is on another. It can be written on Business rules, where a sentence may name any table.'

function againstWords(c: Candidate, subject: PairSide): string {
  const near = c.binds?.near
  if (near) {
    const many = near.tables !== 1
    return `against “${near.name}” on ${near.tables} of your ${subject.label} ${many ? 'tables' : 'table'}`
  }
  return `against the identity your ${subject.label} tables carry in their own names`
}

function bandOf(c: Candidate, standing: Standing): Band {
  if (c.rejectsRecommendation > 0 || c.verdict === 'rejected') return 'refused'
  return standing
}

/**
 * ONE ROW PER BINDING, ranked by what it would do.
 *
 * A ROW IS A BINDING AND NOT A COLUMN, and that is deliberate. Seven
 * different boat numbers can be measured against a trailer's ATM and
 * they do not agree: one of them leaves 72 % of the catalogue and
 * another leaves 98.1 %. Collapsing them to one row per column means
 * picking which of the seven to print, and every rule for picking is
 * a rule for hiding six measurements — including, on this seed, the
 * one that teaches the whole lesson. So every binding the engine
 * measured is a row, each carrying the pair of columns it binds.
 *
 * `concepts` is the sentence's own column list. A measured column
 * that is not in it is still shown — with the count it earned — and
 * refuses, in place, rather than vanishing.
 */
export function bindingOffers(
  report: DiscoveryReport,
  pair: RelatablePair,
  concepts: ColumnConcept[],
  /** the columns THIS PAGE's sentence may name, where the page
   *  narrows them. A column outside the set is still offered, with
   *  the figures it earned, and refuses in place — a row that
   *  vanished would read as though the engine had found nothing. */
  allowed?: ReadonlySet<string>,
): BindingOffer[] {
  const byKey = new Map(concepts.map((c) => [c.key, c]))
  const offers: BindingOffer[] = []

  for (const c of [...report.proposals, ...report.notProposed]) {
    if (c.relationshipKey !== pair.relationshipKey) continue
    const far = c.binds?.far
    /* THE DIRECTION IS THE FILTER. `discrimination` counts what is
       left of the far catalogue, so a candidate only answers this
       person's question when the column it is about sits on the side
       they asked to narrow. */
    if (!far || far.kind !== pair.partner.kind) continue

    const figures = figuresFor(c)
    const narrowing = narrowingOf(c)
    const found = byKey.get(far.conceptKey) ?? null
    const onThisPage = found !== null && (!allowed || allowed.has(found.key))
    const concept = onThisPage ? found : null
    const refusal = onThisPage ? null : found === null ? REFUSED_BY_SENTENCE : REFUSED_BY_PAGE
    offers.push({
      id: c.id,
      candidate: c,
      name: far.name,
      kind: far.kind,
      concept,
      /* the workbook source comes off the column whether or not this
         page may name it: "Boat Size (Mtr) Fisher" is cryptic in
         both cases, and the citation is what makes it legible */
      ...(found?.desc !== undefined ? { desc: found.desc } : {}),
      against: againstWords(c, pair.subject),
      band: bandOf(c, figures.standing),
      kept: narrowing?.kept ?? null,
      rejected: narrowing?.rejected ?? null,
      catalogue: narrowing?.catalogue ?? null,
      over: narrowing?.over ?? null,
      holds: figures.holds,
      leaves: figures.leaves,
      refusal,
    })
  }

  return offers.sort((a, b) => {
    if (BAND_ORDER[a.band] !== BAND_ORDER[b.band]) return BAND_ORDER[a.band] - BAND_ORDER[b.band]
    /* inside a band: what leaves least standing first — the F8
       ordering, expressed as a sort */
    const left = (o: BindingOffer): number =>
      o.catalogue && o.catalogue > 0 && o.kept !== null ? o.kept / o.catalogue : 1
    if (left(a) !== left(b)) return left(a) - left(b)
    if (a.candidate.rate !== b.candidate.rate) return b.candidate.rate - a.candidate.rate
    return b.candidate.tested - a.candidate.tested
  })
}

export interface BindingBand {
  band: Band
  name: string
  say: string
  offers: BindingOffer[]
}

/** The offers, grouped into the bands the surface draws. Empty bands
 *  are dropped: a caption over nothing is a caption about nothing. */
export function bindingBands(offers: BindingOffer[]): BindingBand[] {
  const out: BindingBand[] = []
  for (const band of Object.keys(BAND_ORDER) as Band[]) {
    const mine = offers.filter((o) => o.band === band)
    if (mine.length === 0) continue
    out.push({ band, ...BAND_SAY[band], offers: mine })
  }
  return out
}

/* ---------------------------------------------------------- */
/* 3 · TAKING ONE COMPOSES THE SENTENCE                        */
/* ---------------------------------------------------------- */

/**
 * The draft an offer opens on: the sentence pointed at the column
 * that was chosen, and NOTHING ELSE ANSWERED.
 *
 * The verb is the blank draft's own `is`, the value is unset and the
 * reason is empty, so `missingChoice` refuses the Add button exactly
 * as hard as it does on a blank sentence. This is the same line
 * `startingPoints.draftFrom` holds and it is held for a harder
 * reason here: what the person just read was a MEASUREMENT, and a
 * measurement is not a rule the business stated. Writing the
 * measured claim into the sentence would hand somebody a rule they
 * never wrote, wearing a number they did not check.
 *
 * The reason is deliberately NOT carried across. The candidate's own
 * `because` is the measurement of the CROSS-KIND claim — "626 of 626
 * pairings agree" — and the sentence being drafted is not that
 * claim. A justification that belongs to a different sentence is the
 * most convincing kind of wrong.
 */
export function draftFromBinding(
  offer: BindingOffer,
  ctx: SentenceCtx,
): ConstraintDef | null {
  if (!offer.concept) return null
  const now = nowIso()
  return {
    id: newId(),
    kind: 'implies',
    if: singleGroup(makeClause(offer.concept, ctx)),
    then: singleGroup(emptyClause()),
    because: '',
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
}

/** Whether the draft on screen is still the one this offer opened.
 *  The moment somebody re-points the column, a block still citing
 *  the measurement is describing a sentence that is not there —
 *  the same guard `startingPoints.stillFrom` keeps. */
export function stillFromBinding(
  offer: BindingOffer,
  draft: ConstraintDef,
  ctx: SentenceCtx,
): boolean {
  if (!offer.concept) return false
  const key = offer.concept.key
  return [...draft.if.clauses, ...(draft.then?.clauses ?? [])].some(
    (c) => ctx.index.get(c.left.fieldId)?.key === key,
  )
}
