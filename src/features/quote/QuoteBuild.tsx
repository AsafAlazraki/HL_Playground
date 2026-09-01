/* ============================================================
   THE BUILD — configuring a rig as a SEQUENCE OF DECISIONS.

   WHAT IT IS FOR. `QuoteEditor` draws every section of a draft at
   once. That is the right shape for reading a quote and the wrong
   shape for making one: a person spec'ing a boat is walking a series
   of choices — which motor, which trailer, which rigging, which parts
   — and a page that shows them all at once shows none of them as a
   choice. This is the same document, walked. Nothing is duplicated:
   every line it puts on the quote is minted by `freeze.ts` and read
   back through `steps.ts`, and the full sheet is one press away.

   THE FIVE THINGS IT HAS TO BEAT, each a cited production failure
   (docs/plan/hl-journeys.md), and where each one is answered here:

   1 · IT CANNOT LOSE WORK. §3.4, "the single most damaging friction":
       seven wizard steps in React state, no draft, no autosave, no
       beforeunload, so a refresh at step 6 destroys the build. Here
       the pick IS the write — `addLine` persists before this screen
       redraws — so there is no build to lose. `savedNote` in steps.ts
       says so in the rig plate, in a sentence about coming back
       rather than about a save succeeding, and it says the storage
       fault instead when there is one.

   2 · EVERY NARROWING EXPLAINS ITSELF. §4, the one pattern in either
       production journey worth taking, stated as a rule: a filter
       that can explain itself, be searched past and be switched off,
       with the hidden count said out loud. It is not drawn here:
       `@/features/curation` owns all four so that a surface either
       mounts the mechanism and gets every one of them or narrows
       nothing at all. What this file supplies is the two halves only
       a quote can know — `stepReason` (what narrowed it, and the
       adjudicated rate behind it) and `stepOffer` (the search that
       ignores the narrowing, and the switch that turns it off). The
       measured rate gets a plate of its own below, because it is the
       half production has no way to draw.

   3 · NO EMPTY STEP WITHOUT AN EXPLANATION. §3.2 Q9: an empty
       `motorConfigurations` draws an empty grid and says nothing.
       `NothingOffered` below has the four parts every empty state in
       this app has — eyebrow, what it is, what you already have
       counted from the sheet, one action — and it never draws a blank
       shelf at a person who has data.

   4 · NOTHING IS UNREACHABLE. §3.2 Q7/Q8: only
       `motorConfigurations[0]` is ever read, so a twin rig cannot be
       chosen at all, and the trailer step has no catalogue browse, so
       a trailer the model never named costs the whole build. Every
       step here reaches its whole live table, from the same control,
       whether or not the curated list is empty.

   5 · THE PRICE MOVES AS THEY GO, HONESTLY. Every figure on this
       screen was frozen onto its line at pick time with the column
       and the cell it came from. The total under the page is
       `quoteTotals` — the ONE summation — and the change it just made
       is shown beside it for a moment, because a person who picks a
       $41,340 motor should see $41,340 arrive.

   WHAT THIS FILE MAY NOT DO. It never reads the project store. The
   live reads it needs — the candidates, the narrowing — are events,
   they live in `freeze.ts`, and they are held in state between them.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { CaretLeft, CaretRight, Check, Rows, Star, Warning, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { useActionBar, type ActionGroup } from '@/lib/actions'
import { HELD_AS_LINK, heldAsLinkNote, useImageDisplay } from '@/lib/imageSources'
import {
  heldBackSentence,
  retiredPairsSentence,
  retiredTableSentence,
} from '@/features/views/sellable'
/* THE ONE SHAPE EVERY NARROWED LIST TAKES — hl-journeys.md §4, built
   once so a surface gets all four properties or narrows nothing. This
   step imports the mechanism rather than drawing its own: a second
   curation panel with its own wording is exactly the drift the shared
   file exists to prevent. */
import { CurationNote, readCuration, type CurationInput } from '@/features/curation'
import {
  OFFER_CAP,
  stepOffer,
  stepReason,
  unsellableSubject,
  type Candidate,
  type StepOffer,
  type StepReason,
} from './freeze'
import { money } from './pricing'
import { issueBlockers, lineAmount, quoteTotals } from './totals'
import { addLine, issueQuote, persistNote, removeLine, setQty } from './quotes'
import { buildSteps, decidedCount, firstOpenStep, savedNote, stepAfter, stepBefore } from './steps'
import type { BuildStep } from './steps'
import { CustomerField } from './QuoteEditor'
import { FrozenPhoto } from './photo'
import type { QuoteDef, QuoteLine } from './types'
import './build.css'

/** What a step that offers nothing reads as — the subject's step, and
 *  the moment before the first live read lands. Frozen so the memo
 *  below hands back the same object rather than a fresh empty one on
 *  every render. */
const NO_OFFER: StepOffer = {
  candidates: [],
  narrowed: 0,
  catalogue: 0,
  pool: 0,
  admitted: 0,
  beyond: 0,
  matched: 0,
  capped: false,
  heldCount: 0,
}

/* THE LAST STOP, AND IT IS NOT A SECTION.
 *
 * Every other stop is a `QuoteSection` — a table, and a decision about
 * which of its rows goes on the document. The last one is the question
 * the sequence has to end on and no section can carry: WHO IS IT FOR.
 *
 * It matters that this is a step rather than a dialog at the end.
 * Production asks it in a "Finalize Project" modal that types the
 * customer as five free-text fields, from scratch, every time, with no
 * lookup and no dedupe — while a `CustomerPicker` sits imported in the
 * same file, wired only into the stock branch (hl-journeys.md §3.2,
 * Q3/Q4). Here it is the visible end of the walk, it uses the register
 * the app already has, and `issueBlockers` refuses in the same words
 * whichever reading a person is in.
 */
const HANDOVER = '__handover'

export interface QuoteBuildProps {
  quote: QuoteDef
  /** the stage's own "it is issued now" move */
  onIssued?: (quote: QuoteDef) => void
  /** open the customer this quote is addressed to. Absent = the link
   *  is still SAID on the handover and not offered as a door, so this
   *  screen still works wherever it is mounted. */
  onOpenCustomer?: (rowId: string) => void
  /** the door to the whole document at once — the adjustments, the
   *  customer's contact lines, the tax rate, the re-read. The
   *  sequence is for building; the sheet is for finishing. */
  onOpenSheet: () => void
}

export function QuoteBuild({
  quote,
  onIssued,
  onOpenCustomer,
  onOpenSheet,
}: QuoteBuildProps): ReactElement {
  const steps = useMemo(() => buildSteps(quote), [quote])
  const totals = quoteTotals(quote)
  const refusals = issueBlockers(quote)

  /* WHICH STOP IS OPEN. Session state and nothing else — every line
     the sequence has produced is already on the document, so losing
     this loses a scroll position and never a decision. It opens on
     the first step with nothing on it, which on a freshly minted
     quote is the first real choice a person has to make. */
  const [at, setAt] = useState(() => firstOpenStep(steps))
  const onHandover = at === HANDOVER
  const step: BuildStep | undefined = onHandover
    ? undefined
    : (steps.find((s) => s.id === at) ?? steps[0])

  /* a step that goes away — the sheet changed under a draft — must not
     leave the sequence pointing at nothing */
  useEffect(() => {
    if (at !== HANDOVER && !steps.some((s) => s.id === at)) setAt(firstOpenStep(steps))
  }, [steps, at])

  /* THE LAST STOP IS DECIDED WHEN THERE IS A NAME ON THE DOCUMENT.
     Read off the frozen `customer` block and nothing else — the same
     field `issueBlockers` refuses on, so the tick beside the stop and
     the sentence under the total can never disagree. */
  const named = quote.customer.name.trim() !== ''
  const stopCount = steps.length + 1
  const doneCount = decidedCount(steps) + (named ? 1 : 0)

  /* the search and the switch are per-step: walking to the trailers
     with "yamaha" still typed would be a narrowing nobody asked for */
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  useEffect(() => {
    setQuery('')
    setAll(false)
  }, [at])

  /* THE LIVE READS, AND THEY ARE EVENTS. Both run when the step, the
     search or the switch changes — never on a redraw of the document
     — which is the invariant `index.ts` states in one grep: the store
     is touched in freeze.ts and nowhere else in this feature. */
  const offer: StepOffer = useMemo(
    () => (step && !step.subject ? stepOffer(quote, step.section, { all, query }) : NO_OFFER),
    [quote, step, all, query],
  )
  const why: StepReason | null = useMemo(
    () => (step && !step.subject ? stepReason(quote, step.section) : null),
    [quote, step],
  )

  /* THE FOUR PROPERTIES, RESOLVED ONCE. The chip in the header and the
     paragraph under it come out of the same three numbers, which is
     the whole reason the mechanism is shared: a surface that drew its
     own count beside this one would be back where production is. */
  const curation: CurationInput | null = why
    ? {
        name: why.tableName,
        counts: { pool: offer.pool, matched: offer.admitted, offered: offer.narrowed },
        narrowings:
          why.what === ''
            ? []
            : [
                {
                  id: 'step',
                  what: why.what,
                  ...(why.measured ? { measured: why.measured.clause } : {}),
                },
              ],
        showingAll: all,
        search: { term: query, beyond: offer.beyond },
      }
    : null
  const reading = curation ? readCuration(curation) : null

  const delta = useTotalDelta(totals.total)
  const saveProblem = persistNote()

  /* the last checkpoint before a customer sees this — a live read on
     the draft only, exactly as the sheet makes it */
  const subjectNote = unsellableSubject(quote.rootTableId, quote.rootRowId)

  /* THE BAR CARRIES THE PAGE'S ACTIONS AND NOT THE LIST'S.
     The search and the show-everything switch belong to the list they
     act on and are drawn on the curation note beside it — one
     mechanism, one place, so a person looking at twelve trailers and
     wondering where the other four hundred went finds the answer and
     the way to them in the same three inches. What is left up here is
     what the PAGE can do: leave for the whole sheet, and hand it over. */
  const bar = useMemo<ActionGroup[] | null>(() => {
    const groups: ActionGroup[] = [
      {
        id: 'qb-doors',
        rank: 50,
        items: [
          {
            kind: 'button',
            id: 'qb-sheet',
            label: 'The whole quote',
            say: 'Open the whole quote on one sheet — adjustments, contact lines, tax',
            icon: Rows,
            onPick: onOpenSheet,
          },
        ],
      },
      {
        id: 'qb-issue',
        rank: 90,
        items: [
          {
            kind: 'button',
            id: 'qb-give',
            label: 'Give it to the customer',
            tone: 'primary',
            /* NOT `disabled`. A disabled control drops out of the tab
               order and takes its own explanation with it; the bar's
               `refusal` keeps both. The first reason is the one a
               person can act on now — the rest are under the total. */
            ...(refusals.length > 0 ? { refusal: refusals[0] } : {}),
            onPick: () => {
              if (issueQuote(quote.id)) onIssued?.(quote)
            },
          },
        ],
      },
    ]
    return groups
  }, [onOpenSheet, refusals, quote, onIssued])
  useActionBar('quote-build', bar)

  const before = step ? stepBefore(steps, step.id) : null
  const after = step ? stepAfter(steps, step.id) : null
  const beforeStep = steps.find((s) => s.id === before)
  const afterStep = steps.find((s) => s.id === after)

  return (
    <>
      <div className="qb-scroll">
        <div className="qb-page">
          {/* THE RAIL — the boat, and how far the build has got.

              WHY THESE TWO THINGS ARE ONE COLUMN. Above 1040px of
              stage the page splits (build.css), and what goes on the
              left is everything that is TRUE OF THE WHOLE BUILD
              rather than of the step you happen to be on: what is
              being configured, and which decisions are made. It is
              sticky, so a person four hundred pixels down a wall of
              motors still has the hull, the reference and the
              running package on screen. Below 1040px the same two
              plates stack and the page is exactly what it was. */}
          <aside className="qb-rail">
            <RigPlate
              quote={quote}
              totals={totals.total}
              unpriced={totals.unpricedCount}
              delta={delta}
              saved={savedNote(saveProblem)}
              saveFailed={saveProblem !== null}
            />

            <nav className="qb-stops" aria-label="The steps of this build">
              <div className="qb-stops-head">
                <p className="qb-stops-count mono-label">
                  {doneCount} of {stopCount} decided
                </p>
                {/* PROGRESS AS A LENGTH, and it is decoration in the
                    strict sense: the sentence above it already says
                    the same thing in words and is what a screen
                    reader gets. `scaleX` and not `width`, so the
                    arrival of a decision never reflows the list under
                    it — build.css carries the reasoning. */}
                <div className="qb-stops-bar" aria-hidden="true">
                  <span
                    className="qb-stops-bar-fill"
                    style={{ transform: `scaleX(${stopCount > 0 ? doneCount / stopCount : 0})` }}
                  />
                </div>
              </div>
              <ul className="qb-stops-list">
              {steps.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`qb-stop${s.id === at ? ' is-on' : ''}${
                      s.state === 'decided' ? ' is-done' : ''
                    }`}
                    aria-current={s.id === at ? 'step' : undefined}
                    aria-label={`Step ${s.index}, ${s.title}, ${
                      s.state === 'decided' ? 'decided' : 'not chosen yet'
                    }`}
                    onClick={() => setAt(s.id)}
                  >
                    <span className="qb-stop-mark" aria-hidden="true">
                      {s.state === 'decided' ? (
                        <Check size={ICON_SIZE.tiny} weight="bold" />
                      ) : (
                        s.index
                      )}
                    </span>
                    <span className="qb-stop-name">{s.title}</span>
                    <span className="qb-stop-at">
                      {s.state === 'decided'
                        ? s.amount === null
                          ? 'not priced'
                          : money(s.amount)
                        : 'not chosen'}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className={`qb-stop${onHandover ? ' is-on' : ''}${named ? ' is-done' : ''}`}
                  aria-current={onHandover ? 'step' : undefined}
                  aria-label={`Step ${stopCount}, who it is for, ${
                    named ? 'decided' : 'not typed yet'
                  }`}
                  onClick={() => setAt(HANDOVER)}
                >
                  <span className="qb-stop-mark" aria-hidden="true">
                    {named ? <Check size={ICON_SIZE.tiny} weight="bold" /> : stopCount}
                  </span>
                  <span className="qb-stop-name">Who it is for</span>
                  <span className="qb-stop-at">
                    {named ? quote.customer.name.trim() : 'not typed'}
                  </span>
                </button>
              </li>
              </ul>
            </nav>
          </aside>

          {/* THE MAIN COLUMN — the step you are on, and nothing else.
              The subject's warning travels with it rather than with
              the rail: it is a sentence about work to do, and it
              belongs beside the work. */}
          <div className="qb-main">
            {subjectNote !== '' ? (
              <p className="qb-alert" role="status">
                <Warning size={ICON_SIZE.small} weight="light" aria-hidden="true" />
                {subjectNote}
              </p>
            ) : null}

            {onHandover ? (
              <Handover
                quote={quote}
                steps={steps}
                stopCount={stopCount}
                total={totals.total}
                refusals={refusals}
                onOpenCustomer={onOpenCustomer}
                onBack={() => setAt(steps[steps.length - 1]?.id ?? HANDOVER)}
                backTitle={steps[steps.length - 1]?.title ?? 'The start'}
              />
            ) : step ? (
              <section className="qb-step" aria-label={step.title}>
                <header className="qb-step-head">
                  <p className="qb-step-n mono-label">
                    Step {step.index} of {stopCount}
                  </p>
                  <h2 className="qb-step-name">{step.title}</h2>
                </header>

                {step.subject ? (
                  <SubjectStep quote={quote} step={step} />
                ) : (
                  <>
                    {reading ? (
                      <CurationNote
                        reading={reading}
                        tone="page"
                        showingAll={all}
                        onShowAll={setAll}
                        /* RULE 10 — a control that cannot act says why,
                           where it is. There is nothing past the
                           narrowing on a table that is history, and a
                           switch that simply greyed out would take its
                           own explanation with it. */
                        refusal={
                          offer.historic === 'table'
                            ? retiredTableSentence(step.title)
                            : offer.historic === 'pairs'
                              ? retiredPairsSentence(step.title, 'The list it was picked from')
                              : undefined
                        }
                        search={{
                          value: query,
                          onChange: setQuery,
                          label: `Find a ${step.title} by name, past the narrowing`,
                          placeholder: `Find a ${step.title} by name…`,
                        }}
                      />
                    ) : null}

                    <MeasuredPlate why={why} />

                    {step.lines.length > 0 ? (
                      <ul className="qb-picked" aria-label={`On the quote from ${step.title}`}>
                        {step.lines.map((line) => (
                          <PickedLine key={line.id} quoteId={quote.id} line={line} removable />
                        ))}
                      </ul>
                    ) : null}

                    {offer.candidates.length > 0 ? (
                      <ul className="qb-cards">
                        {offer.candidates.map((c) => (
                          <li key={c.line.id}>
                            <OfferCard
                              candidate={c}
                              onPick={() => addLine(quote.id, step.section.blockId, c.line)}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <NothingOffered
                        step={step}
                        offer={offer}
                        why={why}
                        query={query}
                        all={all}
                        onSeeAll={() => {
                          setQuery('')
                          setAll(true)
                        }}
                      />
                    )}

                    {offer.capped ? (
                      <p className="qb-note">
                        The first {OFFER_CAP} of {offer.matched} are drawn. Type a word above to reach
                        the rest — the search runs over the whole table.
                      </p>
                    ) : null}
                  </>
                )}

                <footer className="qb-move">
                  <button
                    type="button"
                    className="qb-move-btn"
                    disabled={before === null}
                    onClick={() => before && setAt(before)}
                  >
                    <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                    <span>{beforeStep ? beforeStep.title : 'The start'}</span>
                  </button>
                  {/* THE WALK ENDS ON THE HANDOVER, never on a dead
                      control. The last section's "next" is the customer,
                      which is the one question left. */}
                  <button
                    type="button"
                    className="qb-move-btn qb-move-btn--next"
                    onClick={() => setAt(after ?? HANDOVER)}
                  >
                    <span>{afterStep ? afterStep.title : 'Who it is for'}</span>
                    <CaretRight size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  </button>
                </footer>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {/* THE TOTAL IS NOT IN THE SCROLL — the same arrangement the draft
          sheet makes, and for the same measured reason: a sticky footer
          is floored by its scroll container's content box, so it ends up
          painted across the middle of its own document. This is a
          SIBLING of the scrollport. DESIGN_CONTRACT §8.7. */}
      {/* `qb-foot` is the ONE thing this screen changes about the
          shared bar: the draft sheet ends an 880px document and this
          page runs to `--measure`, so the bar takes the page's width
          and the total takes the app's largest number step. Two
          classes in build.css, so neither stylesheet re-declares the
          other's rules. */}
      <div className="qt-foot qb-foot">
        <div className="qt-foot-line">
          <div className="qt-foot-sum">
            <span className="mono-label">Total</span>
            <span className="qt-foot-total">{money(totals.total)}</span>
            {delta !== null ? (
              <span className={`qb-delta${delta < 0 ? ' is-down' : ''}`} role="status">
                {delta > 0 ? `+${money(delta)}` : money(delta)}
              </span>
            ) : null}
            {totals.unpricedCount > 0 ? (
              <span className="qt-foot-unpriced">{totals.unpricedCount} not priced</span>
            ) : null}
          </div>
          {/* THE ACT IS ON THE ACTION BAR AND NOWHERE ELSE. It is
              published above at rank 90 with its refusal attached, and
              the bar is where a page's actions live (DESIGN_CONTRACT
              §4). Drawing it here as well would be two ways out of one
              place, and two primaries on one screen — the exact thing
              §1 says leaves nothing primary. What stays here is the
              arithmetic and, below, every reason it may not go yet. */}
          <p className="qb-foot-where">
            {refusals.length > 0
              ? 'Not ready to go out yet:'
              : 'Ready. “Give it to the customer” is on the bar below.'}
          </p>
        </div>
        {refusals.length > 0 ? (
          <div className="qt-foot-whys" role="status">
            {refusals.map((w) => (
              <p key={w} className="qt-foot-why">
                {w}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

/* ============================================================
   THE PRICE MOVING — the fifth thing this screen has to do

   A person who picks a $41,340 motor should SEE $41,340 arrive.
   Production's running total simply becomes a different number and
   the change is left to be inferred by whoever was watching closely.

   It is derived from the ONE summation and never from the pick: two
   subtractions of `quoteTotals` cannot disagree with `quoteTotals`.
   It clears itself, so it is never a stale claim about something that
   happened five minutes ago, and `null` — not 0 — is "nothing has
   moved", so a pick worth nothing does not flash a zero.
   ============================================================ */
function useTotalDelta(total: number): number | null {
  const seen = useRef<number | null>(null)
  const [delta, setDelta] = useState<number | null>(null)

  useEffect(() => {
    const was = seen.current
    seen.current = total
    if (was === null || was === total) return
    setDelta(total - was)
    const t = window.setTimeout(() => setDelta(null), 2600)
    return () => window.clearTimeout(t)
  }, [total])

  return delta
}

/* ============================================================
   THE RIG — what is being configured, at the top of every step
   ============================================================ */

function RigPlate({
  quote,
  totals,
  unpriced,
  delta,
  saved,
  saveFailed,
}: {
  quote: QuoteDef
  totals: number
  unpriced: number
  delta: number | null
  saved: string
  saveFailed: boolean
}): ReactElement {
  return (
    <header className="qb-rig">
      <PictureWell img={quote.subjectImage} name={quote.subjectLabel} big />
      <div className="qb-rig-say">
        <p className="qb-rig-ref mono-label">{quote.reference}</p>
        <h1 className="qb-rig-name">{quote.subjectLabel}</h1>
        {quote.subjectSpecs.length > 0 ? (
          <ul className="qb-rig-specs">
            {quote.subjectSpecs.map((s) => (
              <li key={s.label} className="qb-rig-spec">
                <span className="qb-rig-spec-lab">{s.label}</span>
                <span className="qb-rig-spec-val">{s.value}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={`qb-rig-saved${saveFailed ? ' is-bad' : ''}`}>{saved}</p>
      </div>
      <div className="qb-rig-money">
        <span className="mono-label">Package</span>
        <span className="qb-rig-total">{money(totals)}</span>
        {delta !== null ? (
          <span className={`qb-delta${delta < 0 ? ' is-down' : ''}`}>
            {delta > 0 ? `+${money(delta)}` : money(delta)}
          </span>
        ) : null}
        {unpriced > 0 ? <span className="qb-rig-unpriced">{unpriced} not priced</span> : null}
      </div>
    </header>
  )
}

/* ============================================================
   THE SUBJECT STEP — one boat, and no candidates
   ============================================================ */

function SubjectStep({ quote, step }: { quote: QuoteDef; step: BuildStep }): ReactElement {
  return (
    <>
      <p className="qb-say">
        This is what the quote is about. It was frozen onto the document when the quote was
        raised — the name, the specs above and the price below all say what the sheet said that
        day, and none of them moves if the price file is imported again.
      </p>
      <ul className="qb-picked" aria-label={step.title}>
        {step.lines.map((line) => (
          <PickedLine key={line.id} quoteId={quote.id} line={line} removable={false} />
        ))}
      </ul>
    </>
  )
}

/* ============================================================
   WHY THIS LIST — the one pattern worth taking, done better

   hl-journeys.md §4: "A filter that can explain itself, be searched
   past, and be switched off is the shape every curated-by-rule
   surface in our modules should take." Four parts, and the fourth is
   the one production has no way to draw: OUR RULES CARRY RATES.
   Theirs names its reasons in a tooltip — "wrong HP band, wrong
   length, wrong tube material" — and can say nothing about how often
   any of that is true, because nobody measured it. Every figure here
   comes out of `RULE_LEDGER`, each one asserted verbatim against the
   adjudication's own source line by `ruleLedger.test.ts`.
   ============================================================ */

/* ============================================================
   THE HANDOVER — the end of the walk, and the one question no
   section can carry.

   THREE THINGS, in the order a person does them:

     WHO IT IS FOR   the same `CustomerField` the sheet uses, matched
                     against the register, frozen onto the document
                     the moment somebody is chosen. Not a modal at
                     the end, and not five free-text boxes retyped
                     for a repeat buyer.
     WHAT THEY GET   every stop and what it added, so the last thing
                     read before a document goes out is the document.
     WHY NOT YET     every reason it may not go, in full — the bar
                     above carries the first one, and a person who
                     fixes that and is refused for a second nobody
                     mentioned has been told half the truth.
   ============================================================ */

function Handover({
  quote,
  steps,
  stopCount,
  total,
  refusals,
  onOpenCustomer,
  onBack,
  backTitle,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  stopCount: number
  total: number
  refusals: readonly string[]
  onOpenCustomer?: (rowId: string) => void
  onBack: () => void
  backTitle: string
}): ReactElement {
  const nameRef = useRef<HTMLInputElement>(null)

  return (
    <section className="qb-step" aria-label="Who it is for">
      <header className="qb-step-head">
        <p className="qb-step-n mono-label">
          Step {stopCount} of {stopCount}
        </p>
        <h2 className="qb-step-name">Who it is for</h2>
      </header>

      <p className="qb-say">
        Giving it to them freezes the document, so the name has to be on it before it goes —
        it cannot be added afterwards. Everything above is already written down.
      </p>

      <CustomerField quote={quote} nameRef={nameRef} onOpenCustomer={onOpenCustomer} />

      <ul className="qb-tally" aria-label="What is on this quote">
        {steps.map((s) => (
          <li key={s.id} className="qb-tally-row">
            <span className="qb-tally-name">{s.title}</span>
            <span className="qb-tally-say">
              {s.lines.length === 0
                ? 'nothing chosen'
                : s.lines.map((l) => l.label).join('  ·  ')}
            </span>
            <span className="qb-tally-amount">
              {s.amount === null ? <span className="qb-card-nil">not priced</span> : money(s.amount)}
            </span>
          </li>
        ))}
        <li className="qb-tally-row qb-tally-row--sum">
          <span className="qb-tally-name">Package</span>
          <span className="qb-tally-say" />
          <span className="qb-tally-amount">{money(total)}</span>
        </li>
      </ul>

      {refusals.length > 0 ? (
        <div className="qb-stops-why" role="status">
          {refusals.map((w) => (
            <p key={w} className="qb-none-held">
              {w}
            </p>
          ))}
        </div>
      ) : null}

      <footer className="qb-move">
        <button type="button" className="qb-move-btn" onClick={onBack}>
          <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          <span>{backTitle}</span>
        </button>
      </footer>
    </section>
  )
}

function MeasuredPlate({ why }: { why: StepReason | null }): ReactElement | null {
  if (!why?.measured) return null
  const m = why.measured
  return (
    <section className="qb-measured" aria-label="What the price file measures about these">
      {/* THE SUBJECT OF THE FIGURE, SAID OUT LOUD. Without it a rate
          sitting under a curation note reads as a rate ABOUT that
          note; it is a rate about the pairings the price file writes,
          which is a different and larger claim. */}
      <p className="qb-measured-head mono-label">Measured on the price file</p>
      <p className="qb-measured-lede">
        <span className="qb-measured-ref mono-label">{m.ref}</span>
        <span className="qb-measured-rate">{m.rate}</span>
        <span className="qb-measured-of">
          <b>{m.holds}</b> {m.of}
        </span>
      </p>
      {/* THE QUALIFICATION TRAVELS WITH THE FIGURE and may never be
          separated from it — the ledger's own rule. A rate with its
          caveat cut off is the kind of number that gets quoted back at
          somebody six months later in a room they cannot correct it in. */}
      <p className="qb-measured-caveat">{m.caveat}</p>
    </section>
  )
}

/* ============================================================
   NOTHING OFFERED — and why, and what to do about it

   Production draws an empty grid here (`highfield-quote-flow.tsx:1945`)
   and says nothing at all. This is the app's own empty state, in the
   shape every other one has: an eyebrow, what the place IS, what the
   person already has counted from the sheet, and ONE action.
   ============================================================ */

function NothingOffered({
  step,
  offer,
  why,
  query,
  all,
  onSeeAll,
}: {
  step: BuildStep
  offer: StepOffer
  why: StepReason | null
  query: string
  all: boolean
  onSeeAll: () => void
}): ReactElement {
  const name = why?.tableName ?? step.title
  const searching = query.trim() !== ''

  const held =
    offer.historic === 'table'
      ? retiredTableSentence(name)
      : offer.historic === 'pairs'
        ? retiredPairsSentence(name, 'The list it was picked from')
        : heldBackSentence(offer.heldCount, name)

  /* THE MIDDLE LINE IS THE LOAD-BEARING ONE and it is why this state
     is worth writing: a person who has a 434-row trailer catalogue
     loaded must never be shown a blank shelf. Each branch says what is
     true, counted, and none of them is a shrug. */
  const say = searching
    ? `Nothing in ${name} matches “${query.trim()}”. The search already covers the whole table, so this is the whole table's answer.`
    : offer.catalogue === 0
      ? `${name} has nothing in it that is still sold.`
      : all
        ? `${name} holds ${offer.catalogue} still sold, and none of them can be offered here.`
        : `Nothing in ${name} is paired with this one on the price file, so there is no shortlist to show. The catalogue is still there, and the control below reaches all of it.`

  const showAll = !searching && !all && offer.catalogue > 0

  return (
    <div className="qb-none">
      <p className="qb-none-eyebrow mono-label">Nothing to pick here</p>
      <p className="qb-none-say">{say}</p>
      {offer.catalogue > 0 ? (
        <p className="qb-none-have">
          <strong>{offer.catalogue}</strong> {name} on the sheet are still sold.
        </p>
      ) : null}
      {held !== '' ? <p className="qb-none-held">{held}</p> : null}
      {showAll ? (
        <button type="button" className="qb-act" onClick={onSeeAll}>
          Show all {offer.catalogue} {name}
        </button>
      ) : null}
      {!showAll && step.section.pickedCount && step.section.pickedCount > 1 ? (
        <p className="qb-none-held">
          {step.section.pickedCount} were picked for this one when the quote was raised, so none
          was chosen for you. Starring one on the page makes it come across on its own next time.
        </p>
      ) : null}
    </div>
  )
}

/* ============================================================
   ONE OFFER — a photograph, a name, what it costs, and why it fits
   ============================================================ */

function OfferCard({
  candidate,
  onPick,
}: {
  candidate: Candidate
  onPick: () => void
}): ReactElement {
  const line = candidate.line
  const on = candidate.alreadyLineId !== undefined
  const facts = (line.pairFacts ?? []).slice(0, 3)

  return (
    <button
      type="button"
      className={`qb-card${on ? ' is-on' : ''}${candidate.outside ? ' is-outside' : ''}`}
      disabled={on}
      aria-label={
        on
          ? `${line.label} is already on this quote`
          : `Put ${line.label} on this quote${
              line.unitPrice === null ? '' : `, ${money(line.unitPrice)}`
            }`
      }
      onClick={onPick}
    >
      <PictureWell img={line.image} name={line.label} big={false} />
      <span className="qb-card-body">
        <span className="qb-card-top">
          {line.recommended ? (
            <span className="qb-card-star" title="The standard fit on the price file">
              <Star size={11} weight="fill" aria-hidden="true" />
              <span className="qb-card-star-word">Standard fit</span>
            </span>
          ) : null}
          {candidate.outside ? (
            <span className="qb-card-outside">Not on this one’s list</span>
          ) : null}
          {on ? (
            <span className="qb-card-on">
              <Check size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              On the quote
            </span>
          ) : null}
        </span>
        <span className="qb-card-name">{line.label}</span>
        {facts.length > 0 ? (
          <span className="qb-card-facts">
            {facts.map((f) => (
              <span key={f.label} className="qb-card-fact">
                <span className="qb-card-fact-lab">{f.label}</span> {f.value}
              </span>
            ))}
          </span>
        ) : null}
        <span className="qb-card-foot">
          {line.unitPrice === null ? (
            <span className="qb-card-nil">not priced here</span>
          ) : (
            <span className="qb-card-price">{money(line.unitPrice)}</span>
          )}
          {line.priceColumnName ? (
            <span className="qb-card-col mono-label">{line.priceColumnName}</span>
          ) : null}
        </span>
      </span>
    </button>
  )
}

/* ============================================================
   A PICTURE, OR THE HONEST ABSENCE OF ONE

   108 of the seeded photographs are held in this repository and 76
   are not. A picture we cannot fetch is never a broken glyph and
   never a hatched box pretending to be one: it is a plate that says
   what it is, in the one wording `imageSources` settled on, so a
   catalogue of them reads as a convention somebody chose rather than
   as ninety-three separate faults.
   ============================================================ */

function PictureWell({
  img,
  name,
  big,
}: {
  img: QuoteLine['image']
  name: string
  big: boolean
}): ReactElement {
  const { paint } = useImageDisplay(img?.src ?? '')
  const size = big ? 220 : 132
  return (
    <span className={`qb-well${big ? ' qb-well--big' : ''}`}>
      {img && paint ? (
        <FrozenPhoto img={img} fallbackAlt={name} className="qb-well-img" w={size} h={size} />
      ) : (
        <span className="qb-well-held">
          <span className="qb-well-held-word mono-label">{HELD_AS_LINK}</span>
          {big && img ? <span className="qb-well-held-why">{heldAsLinkNote(img.src)}</span> : null}
        </span>
      )}
    </span>
  )
}

/* ============================================================
   A LINE ALREADY ON THE QUOTE — frozen, and it says where from
   ============================================================ */

function PickedLine({
  quoteId,
  line,
  removable,
}: {
  quoteId: string
  line: QuoteLine
  removable: boolean
}): ReactElement {
  const { amount, overridden } = lineAmount(line)
  const facts = line.pairFacts ?? []

  return (
    <li className="qb-line">
      <span className="qb-line-mark" aria-hidden="true">
        {line.recommended ? <Star size={11} weight="fill" /> : <Check size={11} weight="bold" />}
      </span>
      <span className="qb-line-say">
        <span className="qb-line-name">{line.label}</span>
        {facts.length > 0 ? (
          <span className="qb-line-facts">
            {facts.map((f) => (
              <span key={f.label} className="qb-card-fact">
                <span className="qb-card-fact-lab">{f.label}</span> {f.value}
              </span>
            ))}
          </span>
        ) : null}
        {line.sourceNote ? <span className="qb-line-src">{line.sourceNote}</span> : null}
      </span>
      <label className="qb-line-qty">
        <span className="mono-label">Qty</span>
        <input
          className="field-input qb-line-qty-in"
          type="number"
          min={1}
          value={line.qty}
          onChange={(e) => setQty(quoteId, line.id, Number(e.currentTarget.value))}
        />
      </label>
      <span className="qb-line-amount">
        {amount === null ? (
          <span className="qb-card-nil">not priced here</span>
        ) : (
          <>
            {money(amount)}
            {overridden ? <span className="qb-line-over mono-label">typed</span> : null}
          </>
        )}
      </span>
      {removable ? (
        <button
          type="button"
          className="qb-line-drop"
          aria-label={`Take ${line.label} off this quote`}
          title="Take it off"
          onClick={() => removeLine(quoteId, line.id)}
        >
          <X size={12} weight="bold" aria-hidden="true" />
        </button>
      ) : (
        <span className="qb-line-drop-none" aria-hidden="true" />
      )}
    </li>
  )
}
