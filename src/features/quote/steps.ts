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

import { lineAmount } from './totals'
import type { QuoteDef, QuoteLine, QuoteSection } from './types'

/** The first section of every quote is the subject itself — the hull
 *  the whole document is about. It is a step because a person walking
 *  the sequence has to be able to look at what they are configuring;
 *  it is never a step with candidates, because there is exactly one
 *  boat on a quote for one boat. */
export const SUBJECT_STEP = '__subject'

/** Where a step stands. Two states and not three: a step with a line
 *  on it has been decided, and every other step is still open. There
 *  is deliberately no 'blocked' — nothing in this sequence gates
 *  anything after it, which is the second thing production's flow got
 *  wrong (its stepper is a row of `<div>`s with no click handler, so
 *  changing the hull colour from the summary is six presses of Back). */
export type StepState = 'decided' | 'open'

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
