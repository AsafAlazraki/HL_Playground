/* ============================================================
   THE SEQUENCE — a quote read as a walk rather than as a form.

   WHAT THIS FILE IS. `QuoteEditor` draws every section of a draft at
   once, which is the right shape for reviewing one and the wrong
   shape for BUILDING one: a person configuring a boat is making a
   series of decisions — which motor, which trailer, which rigging,
   which parts — and a page that shows all of them at once shows none
   of them as a decision. This turns the quote's own frozen sections
   into that series. It adds no data and reads no store: a step IS a
   section, counted.

   WHY IT IS PURE, AND WHY THAT IS THE HEADLINE FEATURE.

   Production holds seven wizard steps in React state with no draft,
   no autosave and no `beforeunload` guard, so a refresh at step 6
   destroys the whole build (hl-journeys.md §3.4, "the single most
   damaging friction"). This app cannot have that fault, because the
   pick IS the write: `freeze.ts` mints a line the instant it is
   picked and `quotes.ts` persists it. A step's state is therefore
   not state at all — it is a reading of a document that is already
   on disk, which is why every function here takes a `QuoteDef` and
   nothing else.

   That is worth saying on screen and `savedNote` below is where the
   words live, so the sentence a person reads and the fact it asserts
   come out of the same file.
   ============================================================ */

import { heldBackSentence } from '@/features/views/sellable'
import { lineAmount, quoteTotals } from './totals'
import type { QuoteDef, QuoteLine, QuoteSection } from './types'

/** The first section of every quote is the subject itself — the hull
 *  the whole document is about. It is a step because a person walking
 *  the sequence has to be able to look at what they are configuring;
 *  it is never a step with candidates, because there is exactly one
 *  boat on a quote for one boat. */
export const SUBJECT_STEP = '__subject'

/** THE LAST STOP, AND IT IS NOT A SECTION — the question no table can
 *  carry: who is it for. It is declared here beside the first stop
 *  rather than inside the screen that draws it, because three places
 *  now name it: `QuoteBuild` walks to it, `place.ts` remembers it
 *  across a reload, and `start.ts` previews it as the end of the walk
 *  before a document exists. Three copies of a magic string is three
 *  chances for a remembered place to point at a stop nothing matches. */
export const HANDOVER_STEP = '__handover'

/** Where a step stands. Two states and not three: a step with a line
 *  on it has been decided, and every other step is still open. There
 *  is deliberately no 'blocked' — nothing in this sequence gates
 *  anything after it, which is the second thing production's flow got
 *  wrong (its stepper is a row of `<div>`s with no click handler, so
 *  changing the hull colour from the summary is six presses of Back). */
export type StepState = 'decided' | 'open'

/* ============================================================
   WHY A STOP IS OPEN — the flow adapting, read off the document.

   THE PROBLEM. `state` has two values and that is right for the tick
   on the rail: a stop either has something on it or it does not. It
   is wrong for the WORDS beside the tick, because "not chosen" is
   four different facts wearing one label:

     the view curated four motors and a person has to pick one
     the view curated nothing here at all
     everything it would have offered is no longer sold
     this quote predates the counts and cannot say

   Reading them as one is how a salesperson ends up staring at a
   heading, waiting for a shelf that is never going to arrive.

   WHY IT IS FROZEN AND NOT LIVE. `pickedCount` and `heldCount` were
   written onto the section by `mintQuoteFromView` at the moment the
   quote was minted, so this reading is still true about the document
   if the sheet is re-curated on Tuesday — which is the same promise
   every price on the page keeps. A live count would make the rail
   disagree with the lines under it.

   AND IT IS WHAT MAKES THE FLOW ADAPTIVE RATHER THAN MERELY SHORT.
   A quote's stops are its view's blocks (see `buildSteps`), so a
   motor already gets a motor's walk and a boat gets the whole rig —
   the flow adapts by construction, with no `motorOnly` flag and no
   hard-coded step list. What it could not do until now was SAY so:
   a stop that exists because the tables are related, and is empty
   because nothing was ever put in the relationship, now reads as
   that instead of as work somebody has not done.
   ============================================================ */
export type StepReach =
  /** the hull the document is about. It offers nothing, by design. */
  | 'subject'
  /** something is on it */
  | 'chosen'
  /** the view curated candidates and none of them is on the quote */
  | 'waiting'
  /** nothing was offered, and rows were held back as no longer sold */
  | 'held'
  /** the view curated nothing here — the relationship is empty */
  | 'bare'
  /** minted before the counts existed: the honest "cannot tell" */
  | 'open'

export interface BuildStep {
  /** the section's own block id — stable, and the step's identity */
  id: string
  /** the table this step is about, as the dealer named it */
  title: string
  section: QuoteSection
  /** 1-based, for "step 3 of 7" */
  index: number
  lines: QuoteLine[]
  state: StepState
  /** the subject step, which offers nothing and removes nothing */
  subject: boolean
  /** what this step has put on the quote so far. `null` means the
   *  lines on it carry no price at all — never rendered as 0, the
   *  rule the whole feature keeps. */
  amount: number | null
  /** lines on this step with no price, counted so a step can say so */
  unpriced: number
  /** why this stop is where it is — see `StepReach` */
  reach: StepReach
  /** the sentence for a stop that has nothing to decide, in the app's
   *  own wording for held-back stock. '' whenever there is nothing
   *  true to say, which is every stop a person can act on. */
  why: string
}

/** How a stop stands, from the frozen section alone. */
export function reachOf(section: QuoteSection, lines: readonly QuoteLine[]): StepReach {
  if (section.blockId === SUBJECT_STEP) return 'subject'
  if (lines.length > 0) return 'chosen'
  const picked = section.pickedCount
  if (picked === undefined) return 'open'
  if (picked > 0) return 'waiting'
  return (section.heldCount ?? 0) > 0 ? 'held' : 'bare'
}

/** The sentence a stop with nothing to decide says about itself.
 *
 *  THE HELD-BACK WORDING IS NOT WRITTEN HERE. `heldBackSentence` is
 *  the one set of words this app uses for stock it is holding back,
 *  and `@/features/curation` prints the same clause three inches
 *  away — a second phrasing would leave a person reading "no longer
 *  sold" twice with no way to tell whether the two counts overlap. */
function whyOf(section: QuoteSection, reach: StepReach): string {
  if (reach === 'held') {
    return heldBackSentence(section.heldCount ?? 0, section.title)
  }
  if (reach === 'bare') {
    return `Nothing from ${section.title} was put in the list of what goes with this one, so this stop has nothing to offer yet. Everything in ${section.title} is still one press away here — say what goes with it on the subject's own page and it arrives curated.`
  }
  return ''
}

/** The steps of a quote, in the view's own order, subject first.
 *
 *  A LOOSE LINE IS NOT A STEP. A typed line belongs to no section and
 *  is drawn on the review at the end; giving it a stop of its own
 *  would put a heading in the sequence that nothing can ever be
 *  picked into. `looseLines` in totals.ts is the reader for those. */
export function buildSteps(quote: QuoteDef): BuildStep[] {
  const byId = new Map(quote.lines.map((l) => [l.id, l]))
  return quote.sections.map((section, i) => {
    const lines: QuoteLine[] = []
    for (const id of section.lineIds) {
      const line = byId.get(id)
      if (line) lines.push(line)
    }

    let amount: number | null = null
    let unpriced = 0
    for (const line of lines) {
      const { amount: a } = lineAmount(line)
      if (a === null) {
        unpriced += 1
        continue
      }
      amount = (amount ?? 0) + a
    }

    const reach = reachOf(section, lines)

    return {
      id: section.blockId,
      title: section.title,
      section,
      index: i + 1,
      lines,
      state: lines.length > 0 ? 'decided' : 'open',
      subject: section.blockId === SUBJECT_STEP,
      amount,
      unpriced,
      reach,
      why: whyOf(section, reach),
    }
  })
}

/** How many steps have something on them. The subject counts: it is
 *  a decision somebody already made on the view page, and a sequence
 *  that opened reading "0 of 7 decided" over a hull that is plainly
 *  on the document would be counting its own chrome. */
export const decidedCount = (steps: readonly BuildStep[]): number =>
  steps.filter((s) => s.state === 'decided').length

/** The step a person should be looking at when the sequence opens:
 *  the first one with nothing on it, or the last one when every step
 *  is decided. Never a step that no longer exists. */
export function firstOpenStep(steps: readonly BuildStep[]): string {
  if (steps.length === 0) return SUBJECT_STEP
  const open = steps.find((s) => s.state === 'open')
  return (open ?? steps[steps.length - 1]).id
}

/** The id of the step that follows this one, or null at the end. */
export function stepAfter(steps: readonly BuildStep[], id: string): string | null {
  const i = steps.findIndex((s) => s.id === id)
  if (i < 0 || i + 1 >= steps.length) return null
  return steps[i + 1].id
}

/** The id of the step before this one, or null at the start. */
export function stepBefore(steps: readonly BuildStep[], id: string): string | null {
  const i = steps.findIndex((s) => s.id === id)
  if (i <= 0) return null
  return steps[i - 1].id
}

/* ============================================================
   WHAT A CHOICE WOULD DO, BEFORE IT IS MADE

   CONFIGURATOR.md §C asks for "the consequence before the
   commitment": moving to a choice shows what it does to the running
   total, and taking it commits. A person deciding between a $1,900
   and a $3,400 motor is choosing a TOTAL, and adding a line to a
   figure with a tax rate and adjustments already in it is not
   arithmetic anybody does in their head with a customer talking.

   IT IS THE ONE SUMMATION, RUN OVER A DOCUMENT THAT DOES NOT EXIST.
   `quoteTotals` is pure and takes a whole quote, so the honest
   preview is that same function over this quote with the line added
   — or, for a row already on it, with the line taken away. A second
   copy of the arithmetic would be a preview that can disagree with
   the bar it is previewing, which is the fault `conflict.ts` was
   written to avoid: one function, called by both.

   IT READS NOTHING. `line` arrives already frozen — `stepOffer`
   mints every candidate before it is drawn — so weighing a choice
   touches no table, no pairing and no price file. It is a loop over
   the handful of lines already on the document, and it is why this
   can run on every arrow key without anything re-filtering 15,691
   rows behind it.

   `delta` IS NULL, NEVER 0, FOR A ROW WITH NO PRICE. A blank is
   never summed as nothing anywhere else in this feature and it is
   not summed as nothing here: what a person is shown is the total
   UNCHANGED, said as such.
   ============================================================ */

export interface Weighing {
  /** what the document would total. Never what it carries. */
  would: number
  /** the signed change, or null when the row carries no price at
   *  all. The sign is also what says which way the press goes: a row
   *  already on the quote comes OFF when it is pressed, and that is
   *  exactly why its figure is negative. */
  delta: number | null
}

export function weighPick(
  quote: QuoteDef,
  line: QuoteLine,
  /** the line this candidate is already on the quote as, if it is */
  alreadyLineId?: string,
): Weighing {
  const next: QuoteDef =
    alreadyLineId === undefined
      ? { ...quote, lines: [...quote.lines, line] }
      : { ...quote, lines: quote.lines.filter((l) => l.id !== alreadyLineId) }
  const would = quoteTotals(next).total
  return {
    would,
    delta: lineAmount(line).amount === null ? null : would - quoteTotals(quote).total,
  }
}

/* ---------------------------------------------------------- */
/* The sentence that answers production's worst friction      */
/* ---------------------------------------------------------- */

/**
 * WHAT A PERSON IS TOLD ABOUT THEIR WORK BEING SAFE, and why it is a
 * sentence rather than an icon.
 *
 * The failure it answers is not hypothetical and it is not ours:
 * seven steps of a build held in React state, no draft, no resume,
 * no `beforeunload`, so a refresh at step 6 destroys everything
 * (hl-journeys.md §3.4). A salesperson who has been bitten by that
 * once builds defensively for the rest of their working life.
 *
 * Ours cannot lose the build, because the pick is the write. That is
 * only worth anything if the person knows it, and they will not learn
 * it from an absence of disasters. So the sequence says it, once, in
 * the place where the work is being done — and it says WHAT it means
 * ("close this and come back to it"), not that a save succeeded,
 * because a save is our business and coming back is theirs.
 *
 * WHEN SAVING IS BROKEN IT SAYS THAT INSTEAD. `persistNote()` returns
 * the storage fault when there is one; a screen that promises a quote
 * is safe while the write is failing is worse than one that promises
 * nothing. The caller passes it straight through.
 */
export function savedNote(problem: string | null): string {
  if (problem !== null && problem !== '') return problem
  return 'Every pick is written as you make it. Close this and come back to it — nothing here is held on the screen.'
}
