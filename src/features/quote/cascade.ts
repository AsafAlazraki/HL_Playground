/* ============================================================
   THE CASCADE — one shape for "this choice changes other things",
   whatever channel noticed it.

   ── WHY THIS EXISTS, AND WHY IT IS NOT `conflict.ts` ─────────

   `conflict.ts` builds a `Conflict` for two specific events: moving
   the price level, and a ConstraintDef removing a value. Both are
   real and one of them (`levelConflict`) is wired. Neither is the
   channel that actually fires on a dealer's own price file.

   THE CHANNEL THAT FIRES IS FITMENT. `seedWorkbookConstraints()`
   emits nothing runnable — all sixteen workbook rules are `blocked`
   and `seededRules.test.ts:345` asserts it — so `solve()` returns an
   empty state and `optionConflict` correctly finds nothing. But the
   TWO seeded flow rules do run (`seededRules.test.ts:337`), and
   `selectPartners` returns a `FitmentResult` over the dealer's own
   tables on every hull in the file.

   So a sheet built only on ConstraintDefs would be a sheet nobody
   ever sees. This one reads whichever channel has something to say.

   ── WHAT WE TOOK FROM PORSCHE, AND WHERE WE BEAT IT ──────────

   Driven live 2026-09-10; the capture and the verbatim copy are in
   `docs/research/cascade-teardown-porsche-live.md`.

   TAKEN: the two-card shape (what this adds / what this removes),
   each card carrying its own price chip; the committed total frozen
   while the sheet is open; and a footer that prices THE DECISION —
   the option plus everything it drags in — rather than the thing
   that was clicked. Porsche's own arithmetic: $24,340 clicked,
   +$2,120 forced, footer reads +$26,460.

   TAKEN: `Standard Equipment` is not `$0.00`. Free-because-included
   and free-because-standard are different facts and a sheet that
   prints `$0.00` for both has thrown one away. `CascadeRow.standard`
   carries it.

   BEATEN: every removed row on Porsche's sheet reads the same
   sentence — "not compatible with your selection" — naming neither
   the selection nor what about it. It is the identical gap the
   teardown pinned on PCPartPicker's socket conflicts, and it is
   architectural: they reconstruct the removal server-side and no
   longer hold the reason. WE HOLD THE REASON. `PartnerVerdict`
   carries the banner and the marque it names; `FloorVerdict` carries
   `{kind:'under', capacity, load}` — both numbers, so the sentence
   cannot be missing. Every `because` below is read off measured
   data. NOTHING IN THIS FILE WRITES A REASON IT DOES NOT HOLD.

   ── PURITY ───────────────────────────────────────────────────

   No React, no store, no registry. The surface hands this module its
   answers, exactly as `subjectVerdict` and `optionConflict` are
   handed theirs. That is what makes it testable without a DOM and
   what keeps one refusal grammar over three unrelated channels.
   ============================================================ */

import type { FitmentResult, PartnerVerdict } from '@/features/constraints'
import { money } from './pricing'
import type { Conflict } from './conflict'

/* ---------------------------------------------------------- */
/* What a cascade is                                           */
/* ---------------------------------------------------------- */

/** One line the decision adds, removes or holds.
 *
 *  `amount` is `number | null` and `null` is a real state — "there is
 *  no figure here" — never rendered as zero. `standard` is the other
 *  kind of nothing: a figure of zero that is zero because the thing
 *  is standard equipment. A sheet that cannot tell those apart is
 *  lying about one of them. */
export interface CascadeRow {
  id: string
  label: string
  amount: number | null
  /** true when the row costs nothing BECAUSE it is standard, which
   *  reads as `Standard`, not as `$0.00` */
  standard: boolean
  /** why this row is where it is. A sentence, always, read off the
   *  channel that put it here — never composed from a template that
   *  has lost the numbers. '' only where the row needs no reason
   *  (a plain addition the person asked for). */
  because: string
}

/** Something the person could take instead, priced.
 *
 *  The cheapest is pre-selected, which is the half of Porsche's
 *  design the teardown found they do NOT ship on the removal shape —
 *  their sheet offers nothing at all. */
export interface Alternative {
  id: string
  label: string
  amount: number | null
  /** what makes this one different, in the dealer's own words */
  note: string
}

/** The reason the sheet is open, and the arithmetic of accepting it. */
export interface Cascade {
  id: string
  /** one line, present tense, naming what is happening */
  title: string
  /** one sentence under it, saying why. Never a paragraph. */
  subtitle: string
  /** what the person asked for */
  asked: { label: string; amount: number | null; image?: string }
  /** what accepting would add */
  added: CascadeRow[]
  /** what accepting would take off, each saying why */
  removed: CascadeRow[]
  /** what stays but could not be checked — PCPartPicker's disclaimer,
   *  per subject rather than per page. Empty is the common case. */
  unchecked: CascadeRow[]
  /** priced alternatives; `alternatives[0]` is the cheapest and is
   *  what the sheet pre-selects */
  alternatives: Alternative[]
  /** the committed total. Does not move while the sheet is open. */
  from: number
  /** what the total becomes on Accept */
  to: number
  /** shown, never hidden */
  delta: number
  /** named, never a bare OK */
  accept: string
}

/* ---------------------------------------------------------- */
/* FITMENT — the channel that runs on a real price file        */
/* ---------------------------------------------------------- */

/** The banner sentence for one rejected partner.
 *
 *  Both halves are read: the marque the partner's own banner names,
 *  and the marque the subject actually is. Porsche cannot write this
 *  sentence; we can only because `PartnerVerdict` kept both. */
function whyRejected(v: PartnerVerdict, subjectMarque: string): string {
  if (v.series === 'built-for-another' && v.bannerMarque) {
    return `Not offered — ${v.banner} is built for ${v.bannerMarque}. This is a ${subjectMarque}.`
  }
  if (v.series === 'built-for-another') {
    return `Not offered — ${v.banner} is built for another marque. This is a ${subjectMarque}.`
  }
  return `Not offered — ${v.banner} does not carry ${subjectMarque}.`
}

/** The floor sentence, with both numbers in it.
 *
 *  This is the one the teardown singled out: PCPartPicker gives both
 *  numbers on dimensional conflicts and neither on socket conflicts,
 *  and a first-time buyer learns nothing from the second. Ours cannot
 *  be missing a number, because `FloorVerdict` will not construct
 *  without them. */
function whyUnderFloor(v: PartnerVerdict, subjectLabel: string): string {
  if (v.floor.kind !== 'under') return ''
  return (
    `Rated to ${v.floor.capacity.toLocaleString()} kg — ` +
    `${subjectLabel} tows ${v.floor.load.toLocaleString()} kg.`
  )
}

/** What a partner row costs, where the surface knows. Fitment reads
 *  the catalogue, not the price file, so the amount is handed in. */
export type PriceOf = (partnerTableId: string, rowId: string) => number | null

/**
 * A CASCADE OUT OF A FITMENT READING.
 *
 * Returns `null` when there is nothing to decide. A sheet that opens
 * to say "nothing happens" is a full stop in the middle of somebody's
 * work — rule 9's reasoning, applied to a dialog rather than a
 * confirm.
 *
 * `asked` is the subject the person just put on the quote — a hull,
 * typically — and the cascade is what that choice does to the
 * partners already on it.
 *
 * ── AND THAT EVENT DOES NOT EXIST IN THIS APP YET ────────────
 *
 * Written down 2026-09-11 rather than left for the next reader to
 * rediscover from an uncalled export. A quote's subject is frozen at
 * creation: `rootRowId` is written in exactly one place
 * (`freeze.ts:501`) and nothing changes it afterwards. So "what this
 * subject does to the partners already on the quote" cannot fire — at
 * the only moment a subject is chosen there are no partner lines for
 * it to cascade over.
 *
 * THE FUNCTION IS KEPT, NOT DELETED, and it is not dead by accident.
 * It encodes a flow this app does not have yet — changing the boat on
 * a standing quote — and deleting it is the one-way door the canvas
 * argument warns about: the reading it needs (`selectPartners`) runs
 * over the dealer's real file today, and every sentence it would say
 * is already tested. What is missing is the act, not the answer.
 *
 * IF A SUBJECT-CHANGE FLOW IS EVER BUILT, this is its sheet and it
 * needs no new grammar. If one is decided against, this goes with
 * that decision — but it goes for the stated reason, and not because
 * somebody found an export nothing calls.
 */
export function fitmentCascade(
  fit: FitmentResult,
  asked: { label: string; amount: number | null; image?: string },
  onQuote: readonly { lineId: string; partnerTableId: string; rowId: string; label: string; amount: number | null }[],
  committedTotal: number,
  priceOf: PriceOf,
): Cascade | null {
  const marque = fit.marque?.name ?? fit.subjectLabel

  /* Index the verdicts once. A quote has tens of lines and a fitment
     reading has hundreds of verdicts; walking the second per line is
     the shape that made BUSINESS RULES take 8.8 s to paint. */
  const verdictOf = new Map<string, PartnerVerdict>()
  for (const v of [...fit.rejected, ...fit.selected, ...fit.unnamed]) {
    verdictOf.set(`${v.partnerTableId}:${v.rowId}`, v)
  }
  const underFloor = new Set(fit.floorWarnings.map((v) => `${v.partnerTableId}:${v.rowId}`))

  const removed: CascadeRow[] = []
  const unchecked: CascadeRow[] = []

  for (const line of onQuote) {
    const key = `${line.partnerTableId}:${line.rowId}`
    const v = verdictOf.get(key)

    /* A LINE THE READING NEVER SAW. Not a rejection: the partner
       table may simply be outside this rule's reach, and saying
       "removed" about it would be inventing a verdict. */
    if (!v) continue

    if (v.series === 'built-for-another') {
      removed.push({
        id: line.lineId,
        label: line.label,
        amount: line.amount,
        standard: false,
        because: whyRejected(v, marque),
      })
      continue
    }

    /* UNDER THE FLOOR IS A WARNING, NOT A REMOVAL. `FitmentResult`
       is explicit that nothing in `floorWarnings` has been taken out
       of `selected`, and promoting it here would be this module
       overruling the reading it was handed. */
    if (underFloor.has(key)) {
      unchecked.push({
        id: line.lineId,
        label: line.label,
        amount: line.amount,
        standard: false,
        because: whyUnderFloor(v, fit.subjectLabel),
      })
    }
  }

  /* THE BRAND THE FLOOR CANNOT RUN ON AT ALL. PCPartPicker ships its
     "some physical constraints are not checked" disclaimer on every
     list and accepts the cost; ours is per subject and therefore
     says which subject. */
  if (fit.floorNotEvaluable) {
    unchecked.push({
      id: `floor:${fit.subjectRowId}`,
      label: 'Towing weight',
      amount: null,
      standard: false,
      because: fit.floorNotEvaluable,
    })
  }

  if (removed.length === 0 && unchecked.length === 0) return null

  /* WHAT COULD GO ON INSTEAD. Only partners this reading admitted,
     priced where the price file has a figure, cheapest first — which
     is what lets the sheet pre-select one. */
  const alternatives: Alternative[] = []
  for (const v of fit.selected) {
    if (underFloor.has(`${v.partnerTableId}:${v.rowId}`)) continue
    alternatives.push({
      id: `${v.partnerTableId}:${v.rowId}`,
      label: v.label,
      amount: priceOf(v.partnerTableId, v.rowId),
      note: v.banner,
    })
  }
  alternatives.sort((a, b) => {
    if (a.amount === null) return 1
    if (b.amount === null) return -1
    return a.amount - b.amount
  })

  let lost = 0
  for (const r of removed) lost += r.amount ?? 0
  const swap = alternatives[0]?.amount ?? 0
  const to = committedTotal - lost + swap

  return {
    id: `fitment:${fit.subjectTableId}:${fit.subjectRowId}`,
    title: 'This changes what fits.',
    subtitle:
      removed.length === 1
        ? 'One line on this quote is built for another marque.'
        : `${removed.length} lines on this quote are built for another marque.`,
    asked,
    added: [],
    removed,
    unchecked,
    alternatives: alternatives.slice(0, 6),
    from: committedTotal,
    to,
    delta: to - committedTotal,
    accept: swap > 0 && alternatives[0] ? `Swap in ${alternatives[0].label}` : 'Take them off',
  }
}

/* ---------------------------------------------------------- */
/* Bridging the channel that already exists                    */
/* ---------------------------------------------------------- */

/**
 * A `Conflict` in the cascade's shape.
 *
 * `levelConflict` is wired and correct and there is no reason to
 * rewrite it — but it draws its own sheet, and two sheets that answer
 * the same question in two grammars is the thing
 * `DESIGN_PRINCIPLES.md` §6 calls a screen that talks to a database.
 * So the level channel is mapped onto the one shape rather than
 * duplicated.
 *
 * A line that moves becomes a row whose `because` is the column it
 * moves to, which is the fact a person needs and the only fact
 * `ConflictLine` holds about the move.
 */
export function cascadeOfConflict(
  c: Conflict,
  asked: { label: string; amount: number | null; image?: string },
): Cascade {
  return {
    id: c.id,
    title: c.title,
    subtitle: 'The committed total does not move until you accept.',
    asked,
    added: c.changed.map((row) => ({
      id: row.lineId,
      label: row.label,
      amount: row.to,
      standard: false,
      because: row.toColumn === row.fromColumn ? '' : `now priced at ${row.toColumn}`,
    })),
    removed: [],
    unchecked: c.held.map((row) => ({
      id: row.lineId,
      label: row.label,
      amount: row.to,
      standard: row.to === null && row.why === 'no price column on this table',
      because: row.why,
    })),
    alternatives: [],
    from: c.from,
    to: c.to,
    delta: c.delta,
    accept: c.accept,
  }
}

/* ---------------------------------------------------------- */
/* Saying it                                                   */
/* ---------------------------------------------------------- */

/** What a row's figure reads as.
 *
 *  Three outcomes and they are three different facts: a figure, the
 *  word `Standard` for a zero that is zero because it is included,
 *  and an em dash for "there is no figure here at all". Porsche keeps
 *  the first two apart and collapses nothing; we keep all three. */
export const rowFigure = (row: CascadeRow): string => {
  if (row.standard) return 'Standard'
  if (row.amount === null) return '—'
  return money(row.amount)
}

/** The chip on a card head: what this whole group does to the total. */
export const groupDelta = (rows: readonly CascadeRow[]): string => {
  let sum = 0
  let any = false
  for (const r of rows) {
    if (r.amount === null) continue
    sum += r.amount
    any = true
  }
  if (!any) return '—'
  if (sum === 0) return money(0)
  return sum > 0 ? `+${money(sum)}` : money(sum)
}
