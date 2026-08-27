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

   ── THE SHAPE, AND WHY IT CHANGED ────────────────────────────────

   IT WAS A SCROLLING PAGE. A rig plate, then a vertical list of
   stops, then the open step, then the next one — all in one
   scrollport, with the total bar underneath. Everything worked and
   nothing was a STAGE: the progress lived halfway down the scroll and
   left the screen the moment somebody started picking, so the one
   question a person configuring a $90,000 rig asks constantly —
   "where am I, and what have I chosen so far?" — was answered only by
   scrolling back up.

   It is a DECK now, and the three bands never move:

     THE RAIL      navy, the full width, at the top. The subject, the
                   step you are on, and every stop with WHAT WAS
                   CHOSEN ON IT written underneath — so the rail is a
                   readable summary of the whole rig and a way back
                   into any part of it. §THE RAIL below.
     THE SPLIT     the hull photographed large on the left, held
                   still; the decision on the right, which is the one
                   thing on this screen that changes and the one thing
                   that animates. §THE SPLIT.
     THE LEDGER    the running total, which OPENS INTO THE ARITHMETIC
                   — every step, every line, every figure — rather
                   than being a number a person has to take on trust.
                   §THE LEDGER.

   THE ACCENT APPEARS FOUR TIMES, which is the budget §1 of
   DESIGN_PRINCIPLES sets: the open stop's disc (drawn white on navy,
   where the accent measures 2.7:1 and is barred), the focus ring, the
   card that is on the quote, and the one onward action. Everything
   else on the deck is ink, hairline and photograph.

   ── THE FIVE THINGS IT HAS TO BEAT ───────────────────────────────
   Each a cited production failure (docs/plan/hl-journeys.md), and
   where each one is answered here:

   1 · IT CANNOT LOSE WORK. §3.4, "the single most damaging friction":
       seven wizard steps in React state, no draft, no autosave, no
       beforeunload, so a refresh at step 6 destroys the build. Here
       the pick IS the write — `addLine` persists before this screen
       redraws — so there is no build to lose. `savedNote` in steps.ts
       says so beside the hull, in a sentence about coming back rather
       than about a save succeeding, and it says the storage fault
       instead when there is one. AND THE PLACE COMES BACK TOO now:
       `place.ts` remembers which step was open, so a reload returns a
       person to the decision they were making rather than to the
       first undecided one. It is a cursor and never a fact about the
       quote — see that file's header.

   2 · EVERY NARROWING EXPLAINS ITSELF. §4, the one pattern in either
       production journey worth taking, stated as a rule: a filter
       that can explain itself, be searched past and be switched off,
       with the hidden count said out loud. It is not drawn here:
       `@/features/curation` owns all four so that a surface either
       mounts the mechanism and gets every one of them or narrows
       nothing at all. What this file supplies is the two halves only
       a quote can know — `stepReason` (what narrowed it, and the
       adjudicated rate behind it) and `stepOffer` (the search that
       ignores the narrowing, and the switch that turns it off).

       AND NOW THE THIRD HALF, WHICH IS THE POINT OF BUILDING THIS
       RATHER THAN COPYING IT: a row the narrowing left out says on
       ITSELF why, with the two figures the rule turned on — "its Max
       boat length (5.20 m) is less than this boat's Length (5.60 m)."
       Production draws no such row at all. `Candidate.outsideWhy` in
       freeze.ts computes it by re-running the clauses one at a time,
       and `OfferCard` prints it under the name. Rule 10, on the row.

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
       and the cell it came from. The total under the deck is
       `quoteTotals` — the ONE summation — the change it just made is
       shown beside it for a moment, and the ledger opens onto the
       lines that produced it.

   ── MOTION, AND ITS BUDGET ───────────────────────────────────────

   THE STEP CHANGE IS THE ONE MOMENT THAT EARNS REAL MOTION and it is
   the only place a spring is used: the outgoing decision leaves the
   way the incoming one arrives, on transform and opacity only, at
   SPRING_QUICK out (220ms) and SPRING in (300ms) from
   `views/stillness`. Nothing invents a spring.

   EVERYTHING ELSE IS FEEDBACK OR NOTHING. A card being picked is a
   90–160ms press from ds.css. The shelf staggers in when a step
   arrives and NEVER while somebody is typing — the `still` gate is
   read on every card, which is why searching a 434-row trailer table
   does not make the list flicker under the caret.

   THE TOTAL DOES NOT COUNT UP. A dealer reading a price needs it to
   be true on the frame it changes, not to be animated at them. The
   figure is replaced; only the delta chip beside it moves.

   ── KEYS ─────────────────────────────────────────────────────────

     ← →      the step before / after
     ↑ ↓      the highlighted option on this step's shelf
     Enter    take the highlighted one, or take it back off
     Home End the first / last step

   All four are refused while a caret is in a text field, so typing
   "yamaha" into the search never walks off the step. The hint is
   printed under the hull, because a shortcut nobody is told about is
   a shortcut nobody has.

   WHAT THIS FILE MAY NOT DO. It never reads the project store. The
   live reads it needs — the candidates, the narrowing — are events,
   they live in `freeze.ts`, and they are held in state between them.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  Rows,
  Star,
  Warning,
  X,
} from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { useActionBar, type ActionGroup } from '@/lib/actions'
import { HELD_AS_LINK, heldAsLinkNote, useImageDisplay } from '@/lib/imageSources'
import {
  heldBackSentence,
  retiredPairsSentence,
  retiredTableSentence,
} from '@/features/views/sellable'
/* THE MOTION POLICY IS THE APP'S, NOT THIS SCREEN'S. `still` is true
   while a caret is in a text field anywhere and whenever the reader
   has asked for reduced motion, and every animation below is gated on
   it. Deep, like `sellable` above: the barrel does not export it. */
import { SPRING, SPRING_QUICK, transitionFor, useStillness } from '@/features/views/stillness'
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
import { money, quoteLevelChoices } from './pricing'
import { issueBlockers, lineAmount, looseLines, quoteTotals } from './totals'
import { addLine, issueQuote, persistNote, removeLine, setLevel, setQty } from './quotes'
import { recallPlace, rememberPlace } from './place'
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
  const { still } = useStillness()

  /* WHICH STOP IS OPEN, AND WHY IT SURVIVES A RELOAD.

     Every line the sequence has produced is already on the document,
     so losing this loses a scroll position and never a decision —
     which is exactly why it is safe to remember it in a place a quote
     never travels through. `place.ts` hands back whatever it stored
     and this is where it is CHECKED: a step id that no longer names a
     step of this document (the sheet changed, the view's blocks moved)
     is discarded here rather than trusted, and the fallback is the
     same `firstOpenStep` this opened on before it remembered
     anything. */
  const [at, setAt] = useState(() => {
    const back = recallPlace(quote.id)
    if (back === HANDOVER || (back !== null && steps.some((s) => s.id === back))) return back
    return firstOpenStep(steps)
  })
  const onHandover = at === HANDOVER
  const step: BuildStep | undefined = onHandover
    ? undefined
    : (steps.find((s) => s.id === at) ?? steps[0])

  /* a step that goes away — the sheet changed under a draft — must not
     leave the sequence pointing at nothing */
  useEffect(() => {
    if (at !== HANDOVER && !steps.some((s) => s.id === at)) setAt(firstOpenStep(steps))
  }, [steps, at])

  useEffect(() => {
    rememberPlace(quote.id, at)
  }, [quote.id, at])

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

  const before = step ? stepBefore(steps, step.id) : null
  const after = step ? stepAfter(steps, step.id) : null
  const beforeStep = steps.find((s) => s.id === before)
  const afterStep = steps.find((s) => s.id === after)

  /* WHERE THE WALK GOES FROM HERE, in both directions, as ONE pair of
     functions — the arrow keys, the two chevrons under the hull and
     the onward bar all call these, so a key and a press can never
     disagree about what "next" means. The handover is the end of the
     walk and the start of nothing: there is always a step before it
     and never one after. */
  const goBack = useCallback(() => {
    if (onHandover) {
      setAt(steps[steps.length - 1]?.id ?? HANDOVER)
      return
    }
    if (before !== null) setAt(before)
  }, [onHandover, steps, before])

  const goOn = useCallback(() => {
    if (onHandover) return
    setAt(after ?? HANDOVER)
  }, [onHandover, after])

  /* ── THE HIGHLIGHT ────────────────────────────────────────────
     Which option the keyboard is pointing at. It is a NUMBER and not
     a focus ring: a roving tabindex would fight the shelf's own tab
     order and would move focus off the card the moment the list
     re-filtered under a search. −1 is "nothing is highlighted", which
     is what a step opens on, so Enter never takes something a person
     did not aim at. */
  const [hi, setHi] = useState(-1)
  useEffect(() => {
    setHi(-1)
  }, [at, query, all])

  const shelfRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (hi < 0) return
    const el = shelfRef.current?.children[hi]
    /* NO `behavior: 'smooth'`. This is keyboard-initiated and lands on
       the same frame as the keypress — the motion budget's one
       absolute: never animate a key. */
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' })
  }, [hi])

  const candidates = offer.candidates

  /* Enter takes the highlighted option — or takes it back OFF, which
     is the same key doing the same thing to the same row and is why
     the card itself is a toggle rather than a card with an × on it.
     Removal carries its own undo toast from `quotes.ts`. */
  const takeHighlighted = useCallback(() => {
    if (!step || step.subject || hi < 0) return
    const c = candidates[hi]
    if (!c) return
    if (c.alreadyLineId !== undefined) removeLine(quote.id, c.alreadyLineId)
    else addLine(quote.id, step.section.blockId, c.line)
  }, [step, hi, candidates, quote.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      /* A CARET OUTRANKS EVERY SHORTCUT ON THIS SCREEN. The step's own
         search is a text field three inches from the shelf, and an
         arrow key that walked off the step mid-word would make the one
         control §4 asks for unusable. */
      const t = e.target
      if (t instanceof HTMLElement) {
        if (t.isContentEditable) return
        const tag = t.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      }
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goBack()
          return
        case 'ArrowRight':
          e.preventDefault()
          goOn()
          return
        case 'Home':
          if (steps.length > 0) {
            e.preventDefault()
            setAt(steps[0].id)
          }
          return
        case 'End':
          e.preventDefault()
          setAt(HANDOVER)
          return
        case 'ArrowDown':
          if (candidates.length === 0) return
          e.preventDefault()
          setHi((n) => (n + 1 >= candidates.length ? 0 : n + 1))
          return
        case 'ArrowUp':
          if (candidates.length === 0) return
          e.preventDefault()
          setHi((n) => (n <= 0 ? candidates.length - 1 : n - 1))
          return
        case 'Enter':
          if (hi < 0) return
          e.preventDefault()
          takeHighlighted()
          return
        default:
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack, goOn, steps, candidates.length, hi, takeHighlighted])

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

  /* WHICH WAY THE DECK IS TRAVELLING, so the outgoing decision leaves
     the way the incoming one arrives. Held in a ref rather than in
     state: it is read during the render that follows a step change and
     changing it must never itself cause one. */
  const wasAt = useRef(at)
  const order = useCallback(
    (id: string): number => (id === HANDOVER ? steps.length : steps.findIndex((s) => s.id === id)),
    [steps],
  )
  const dir = order(at) < order(wasAt.current) ? -1 : 1
  useEffect(() => {
    wasAt.current = at
  }, [at])

  const stepIndex = onHandover ? stopCount : (step?.index ?? 1)
  const stepTitle = onHandover ? 'Who it is for' : (step?.title ?? '')

  return (
    <>
      {/* ============================================================
          §THE RAIL — the whole build, at a glance, never scrolling.

          IT CARRIES WHAT WAS CHOSEN, not merely that something was.
          The stops used to be a tick and a figure, which answers "is
          this step done" and leaves "done with WHAT" to be found by
          walking back into it. A rail that says "Yamaha F90XB" under
          MOTOR is a summary of the rig a person can read across a desk
          and press to correct — the single most useful thing this band
          could be, and the reason it is worth the height.

          IT IS NAVY BECAUSE THE APP'S FRAME IS. The side rail and the
          masthead are `--chrome`; a build that opened on a third
          coloured band would be a third idea. THE ACCENT IS BARRED ON
          THIS GROUND — #0a5fc2 measures 2.7:1 there — so the open stop
          is lit in white, exactly as the dock's active item is, and
          the three ink tiers are `--chrome-fg` (14.9:1),
          `--chrome-fg-soft` (7.6:1) and `--chrome-fg-faint` (4.6:1,
          the floor and the last tier allowed a word that matters).
          ============================================================ */}
      <header className="qb-rail">
        <div className="qb-rail-head">
          <div className="qb-rail-who">
            <p className="qb-rail-ref mono-label">{quote.reference}</p>
            <p className="qb-rail-subject">{quote.subjectLabel}</p>
          </div>

          <p className="qb-rail-where">
            <span className="qb-rail-where-n mono-label">
              Step {stepIndex} of {stopCount}
            </span>
            <span className="qb-rail-where-name">{stepTitle}</span>
          </p>

          <div className="qb-rail-tail">
            <p className="qb-rail-done mono-label">
              {doneCount} of {stopCount} decided
            </p>
            <button
              type="button"
              className="qb-rail-out"
              onClick={onOpenSheet}
              title="Adjustments, contact lines, tax — the whole document on one sheet"
            >
              <Rows size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              <span>The whole quote</span>
            </button>
          </div>
        </div>

        <nav className="qb-rail-track" aria-label="The steps of this build">
          <ol className="qb-rail-stops">
            {steps.map((s) => (
              <li key={s.id} className="qb-rail-slot">
                <Stop
                  index={s.index}
                  title={s.title}
                  chose={choseSay(s)}
                  done={s.state === 'decided'}
                  on={s.id === at}
                  onPick={() => setAt(s.id)}
                />
              </li>
            ))}
            <li className="qb-rail-slot">
              <Stop
                index={stopCount}
                title="Who it is for"
                chose={named ? quote.customer.name.trim() : ''}
                done={named}
                on={onHandover}
                onPick={() => setAt(HANDOVER)}
              />
            </li>
          </ol>
        </nav>

        {/* HOW FAR ALONG, AS A LENGTH. The same two numbers the
            sentence above states in words — no third fact, nothing
            counted twice — which is why it is aria-hidden. */}
        <span className="qb-rail-meter" aria-hidden="true">
          <span
            className="qb-rail-meter-fill"
            style={{ ['--done' as string]: `${Math.round((doneCount / stopCount) * 100)}%` }}
          />
        </span>
      </header>

      {/* ============================================================
          §THE SPLIT — the hull held still, the decision moving.

          The atmosphere is painted on the SCROLLPORT'S OWN BACKGROUND
          rather than mounted inside it. `.ds-aurora` is an absolutely
          positioned element, and an absolutely positioned child of a
          scroll container belongs to that container's scrollable
          overflow — so it would sit over the first screen and slide
          off the top the moment somebody scrolled, leaving the rest of
          the page on flat paint. Two radial washes in `.qb-body`'s own
          background do not scroll, carry nothing, and build.css takes
          them away under prefers-reduced-transparency and
          prefers-contrast: more.
          ============================================================ */}
      <div className="qb-body">
        <div className="qb-split">
          <HullPane
            quote={quote}
            saved={savedNote(saveProblem)}
            saveFailed={saveProblem !== null}
            subjectNote={subjectNote}
            backTitle={onHandover ? (steps[steps.length - 1]?.title ?? '') : (beforeStep?.title ?? '')}
            canBack={onHandover || before !== null}
            onTitle={onHandover ? '' : (afterStep?.title ?? 'Who it is for')}
            canOn={!onHandover}
            onBack={goBack}
            onOn={goOn}
          />

          <div className="qb-work">
            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={at}
                className="qb-panel"
                aria-label={stepTitle}
                initial={{ opacity: 0, x: dir * 26 }}
                animate={{ opacity: 1, x: 0, transition: transitionFor(still, SPRING) }}
                exit={{ opacity: 0, x: dir * -18, transition: transitionFor(still, SPRING_QUICK) }}
              >
                <header className="qb-panel-head">
                  <p className="qb-panel-n mono-label">
                    Step {stepIndex} of {stopCount}
                  </p>
                  <h2 className="qb-panel-name">{stepTitle}</h2>
                </header>

                {onHandover ? (
                  <Handover
                    quote={quote}
                    steps={steps}
                    total={totals.total}
                    refusals={refusals}
                    onOpenCustomer={onOpenCustomer}
                  />
                ) : step && step.subject ? (
                  <SubjectStep quote={quote} step={step} />
                ) : step ? (
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
                      <section className="qb-chosen" aria-label={`On the quote from ${step.title}`}>
                        <p className="qb-chosen-head mono-label">On the quote from this step</p>
                        <ul className="qb-picked">
                          {step.lines.map((line) => (
                            <PickedLine key={line.id} quoteId={quote.id} line={line} removable />
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {candidates.length > 0 ? (
                      <ul className="qb-shelf" ref={shelfRef}>
                        {candidates.map((c, i) => (
                          <li key={c.line.id} className="qb-shelf-slot">
                            <OfferCard
                              candidate={c}
                              index={i}
                              still={still}
                              lit={i === hi}
                              onPick={() => {
                                setHi(i)
                                if (c.alreadyLineId !== undefined) {
                                  removeLine(quote.id, c.alreadyLineId)
                                } else {
                                  addLine(quote.id, step.section.blockId, c.line)
                                }
                              }}
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
                        The first {OFFER_CAP} of {offer.matched} are drawn. Type a word above to
                        reach the rest — the search runs over the whole table.
                      </p>
                    ) : null}
                  </>
                ) : null}

                {/* THE WALK ENDS ON THE HANDOVER, never on a dead
                    control. The last section's "onward" is the
                    customer, which is the one question left — and the
                    handover itself has nowhere further to go, so it
                    draws no bar at all rather than a disabled one. */}
                {onHandover ? null : (
                  <footer className="qb-onward">
                    <button type="button" className="qb-onward-btn" onClick={goOn}>
                      <span className="qb-onward-lab mono-label">Next step</span>
                      <span className="qb-onward-name">
                        {afterStep ? afterStep.title : 'Who it is for'}
                      </span>
                      <ArrowRight size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
                    </button>
                  </footer>
                )}
              </motion.section>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============================================================
          §THE LEDGER — the total, and the arithmetic under it.

          IT IS NOT IN THE SCROLL, and that is measured rather than
          stylistic: a sticky footer is floored by its scroll
          container's content box, so it ends up painted across the
          middle of its own document. This is a SIBLING of the
          scrollport. DESIGN_CONTRACT §8.7.
          ============================================================ */}
      <Ledger
        quote={quote}
        steps={steps}
        totals={totals}
        delta={delta}
        refusals={refusals}
        onGoTo={setAt}
      />
    </>
  )
}

/* ============================================================
   ONE STOP ON THE RAIL

   Three states and they are drawn as three different marks rather
   than as three shades of one: a tick for decided, a lit disc for
   the one you are on, the numeral for the rest. Shade alone would
   be the only signal on a navy ground where the accent is barred,
   and a person glancing at eight of these needs the shape to carry
   it.
   ============================================================ */

function Stop({
  index,
  title,
  chose,
  done,
  on,
  onPick,
}: {
  index: number
  title: string
  /** what was chosen on it — '' when nothing has been */
  chose: string
  done: boolean
  on: boolean
  onPick: () => void
}): ReactElement {
  return (
    <button
      type="button"
      className={`qb-stop${on ? ' is-on' : ''}${done ? ' is-done' : ''}`}
      aria-current={on ? 'step' : undefined}
      aria-label={`Step ${index}, ${title}, ${done ? `chosen: ${chose}` : 'not chosen yet'}`}
      onClick={onPick}
    >
      <span className="qb-stop-mark" aria-hidden="true">
        {done ? <Check size={ICON_SIZE.tiny} weight="bold" /> : index}
      </span>
      <span className="qb-stop-say">
        <span className="qb-stop-name">{title}</span>
        {/* THE FULL TEXT STAYS IN THE DOM. The chip clamps to one line
            at a word boundary — never mid-word (§3) — and `title`
            carries the whole of it for a pointer. */}
        <span className="qb-stop-chose" title={chose === '' ? undefined : chose}>
          {chose === '' ? 'not chosen' : chose}
        </span>
      </span>
    </button>
  )
}

/** What a step put on the quote, short enough for a rail and counted
 *  rather than truncated: one line is named, more than one is named
 *  and counted. Nothing is invented — a step with lines that carry no
 *  price still says what was chosen, because the choice is the fact
 *  the rail is about and the money is the ledger's business. */
function choseSay(s: BuildStep): string {
  if (s.lines.length === 0) return ''
  if (s.lines.length === 1) return s.lines[0].label
  return `${s.lines[0].label}  +${s.lines.length - 1} more`
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
   THE HULL — what is being configured, held still beside the
   decision that is not.

   IT IS THE BIGGEST THING ON THE SCREEN and it stays. The picture
   was 220px wide beside a 21px name — a thumbnail of the one object
   the whole document is about — and it scrolled away the moment
   somebody started picking. It is sticky now, so a person four
   steps into a rig is still looking at the boat they are building.

   THE PACKAGE FIGURE IS NOT HERE, and that is deliberate. It was
   drawn twice on one screen — once beside the hull and once in the
   bar under the scrollport — with its own copy of the delta and its
   own copy of the unpriced count. Two readings of one number is how
   two numbers for one deal start to exist. The ledger is the honest
   home for it: it is a SIBLING of the scrollport, so it is on screen
   at every scroll position.
   ============================================================ */

function HullPane({
  quote,
  saved,
  saveFailed,
  subjectNote,
  backTitle,
  canBack,
  onTitle,
  canOn,
  onBack,
  onOn,
}: {
  quote: QuoteDef
  saved: string
  saveFailed: boolean
  subjectNote: string
  backTitle: string
  canBack: boolean
  onTitle: string
  canOn: boolean
  onBack: () => void
  onOn: () => void
}): ReactElement {
  return (
    <aside className="qb-hull" aria-label="What this quote is about">
      <div className="qb-hull-stick">
        <PictureWell img={quote.subjectImage} name={quote.subjectLabel} big />

        <p className="qb-hull-ref mono-label">{quote.reference}</p>
        <h1 className="qb-hull-name ds-display-lg">{quote.subjectLabel}</h1>

        {quote.subjectSpecs.length > 0 ? (
          <ul className="qb-hull-specs">
            {quote.subjectSpecs.map((s) => (
              <li key={s.label} className="qb-hull-spec">
                <span className="qb-hull-spec-lab">{s.label}</span>
                <span className="qb-hull-spec-val">{s.value}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {subjectNote !== '' ? (
          <p className="qb-alert" role="status">
            <Warning size={ICON_SIZE.small} weight="light" aria-hidden="true" />
            {subjectNote}
          </p>
        ) : null}

        {/* THE TWO CHEVRONS, and they name where they go. A bare pair
            of arrows makes a person press one to find out; the name
            of the next decision is the whole affordance. */}
        <div className="qb-walk">
          <button
            type="button"
            className="qb-walk-btn"
            disabled={!canBack}
            aria-label={canBack ? `Back to ${backTitle}` : 'This is the first step'}
            onClick={onBack}
          >
            <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            <span className="qb-walk-name">{canBack ? backTitle : 'The start'}</span>
          </button>
          <button
            type="button"
            className="qb-walk-btn qb-walk-btn--on"
            disabled={!canOn}
            aria-label={canOn ? `On to ${onTitle}` : 'This is the last step'}
            onClick={onOn}
          >
            <span className="qb-walk-name">{canOn ? onTitle : 'The end'}</span>
            <CaretRight size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {/* A SHORTCUT NOBODY IS TOLD ABOUT IS A SHORTCUT NOBODY HAS.
            Four keys, in the place a person's eye rests between
            decisions, and each mark is a real key rather than a word
            for one. */}
        <p className="qb-keys">
          <kbd className="qb-key">←</kbd>
          <kbd className="qb-key">→</kbd>
          <span className="qb-keys-say">walk the steps</span>
          <kbd className="qb-key">↑</kbd>
          <kbd className="qb-key">↓</kbd>
          <span className="qb-keys-say">pick through the list</span>
          <kbd className="qb-key">Enter</kbd>
          <span className="qb-keys-say">take it, or take it off</span>
        </p>

        <p className={`qb-hull-saved${saveFailed ? ' is-bad' : ''}`}>{saved}</p>
      </div>
    </aside>
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
        raised — the name, the specs beside it and the price below all say what the sheet said
        that day, and none of them moves if the price file is imported again.
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
   §THE LEDGER — a total that opens onto its own arithmetic.

   A RUNNING TOTAL IS A CLAIM, and a bar that makes one and offers
   no way to check it is asking a salesperson to read $88,715 to a
   customer on trust. Production's is a number and nothing else.
   This one opens: every step, every line on it, what each line
   cost and what it was priced at — the same frozen figures the
   printed document will carry, summed by the same `quoteTotals`.

   NOTHING IS INVENTED HERE AND THAT IS MOSTLY WHAT THIS CODE IS
   DOING. A line with no price says "not priced here" and is never
   rendered as 0. A step whose lines are all unpriced says so
   rather than showing a total of nothing. There is no tax rate
   column anywhere in the seeded data, so tax appears ONLY when a
   person typed a rate on the sheet, and when they have not the
   ledger says where one goes rather than quietly showing an
   inc-GST figure the business never stated.

   THE FIGURES DO NOT ANIMATE. Every one is mono and tabular and
   the column is right-aligned, so a change lands on the frame it
   happens. What DOES move is a new line arriving — one `ds-rise`
   on mount, which fires for exactly the row that was just added
   and for nothing else — and the delta chip beside the total.
   ============================================================ */

function Ledger({
  quote,
  steps,
  totals,
  delta,
  refusals,
  onGoTo,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  totals: ReturnType<typeof quoteTotals>
  delta: number | null
  refusals: readonly string[]
  onGoTo: (stepId: string) => void
}): ReactElement {
  const [open, setOpen] = useState(false)
  const loose = looseLines(quote)
  const levels = useMemo(() => quoteLevelChoices(quote.lines), [quote.lines])

  return (
    <footer className="qb-ledger">
      <div className="qb-ledger-bar">
        <button
          type="button"
          className="qb-ledger-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="qb-ledger-lab mono-label">Total</span>
          <span className="qb-ledger-total">{money(totals.total)}</span>
          <span className={`qb-ledger-caret${open ? ' is-open' : ''}`} aria-hidden="true">
            <CaretDown size={ICON_SIZE.tiny} weight="bold" />
          </span>
          <span className="qb-ledger-toggle-say">
            {open ? 'Hide what it is made of' : 'See what it is made of'}
          </span>
        </button>

        {delta !== null ? (
          <span className={`qb-delta${delta < 0 ? ' is-down' : ''}`} role="status">
            {delta > 0 ? `+${money(delta)}` : money(delta)}
          </span>
        ) : null}

        {totals.unpricedCount > 0 ? (
          <span className="qb-ledger-unpriced">{totals.unpricedCount} not priced</span>
        ) : null}

        {/* THE RUNG THE WHOLE QUOTE IS READ AT, on the screen where the
            picking happens rather than only on the sheet. It is pure
            arithmetic on frozen data — every rung was captured at pick
            time — so switching here re-reads nothing live and cannot
            pick up a reimport. Drawn only when the lines actually carry
            more than one rung: a control offering one choice is
            furniture. */}
        {levels.length > 1 ? (
          <div className="qb-levels" role="group" aria-label="Price level">
            <span className="qb-levels-lab mono-label">Priced at</span>
            {levels.map((l) => (
              <button
                key={l.key}
                type="button"
                className={`qb-level${quote.levelKey === l.key ? ' is-on' : ''}`}
                aria-pressed={quote.levelKey === l.key}
                onClick={() => setLevel(quote.id, l.key)}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* THE ACT IS ON THE ACTION BAR AND NOWHERE ELSE. It is
            published above at rank 90 with its refusal attached, and
            the bar is where a page's actions live (DESIGN_CONTRACT
            §4). Drawing it here as well would be two ways out of one
            place, and two primaries on one screen — the exact thing §1
            says leaves nothing primary. */}
        <p className="qb-ledger-where">
          {refusals.length > 0
            ? 'Not ready to go out yet:'
            : 'Ready. “Give it to the customer” is on the bar below.'}
        </p>
      </div>

      {open ? (
        <div className="qb-ledger-open">
          <ul className="qb-led">
            {steps.map((s) => (
              <li key={s.id} className="qb-led-group">
                <button
                  type="button"
                  className="qb-led-head"
                  onClick={() => onGoTo(s.id)}
                  aria-label={`Go back to ${s.title}`}
                >
                  <span className="qb-led-head-name">{s.title}</span>
                  <span className="qb-led-head-sum">
                    {s.lines.length === 0 ? (
                      <span className="qb-nil">nothing chosen</span>
                    ) : s.amount === null ? (
                      <span className="qb-nil">not priced</span>
                    ) : (
                      money(s.amount)
                    )}
                  </span>
                </button>
                {s.lines.length > 0 ? (
                  <ul className="qb-led-lines">
                    {s.lines.map((line, i) => (
                      <LedgerLine key={line.id} line={line} index={i} />
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}

            {/* A TYPED LINE BELONGS TO NO SECTION and would otherwise
                be summed into the total with nothing on screen to
                account for it. `looseLines` is the reader for those. */}
            {loose.length > 0 ? (
              <li className="qb-led-group">
                <p className="qb-led-head qb-led-head--flat">
                  <span className="qb-led-head-name">Typed onto the quote</span>
                  <span className="qb-led-head-sum" />
                </p>
                <ul className="qb-led-lines">
                  {loose.map((line, i) => (
                    <LedgerLine key={line.id} line={line} index={i} />
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>

          <dl className="qb-sums">
            <div className="qb-sum">
              <dt className="qb-sum-lab">The package</dt>
              <dd className="qb-sum-fig">{money(totals.packageTotal)}</dd>
            </div>
            {quote.adjustments.length > 0 ? (
              <div className="qb-sum">
                <dt className="qb-sum-lab">
                  Adjustments
                  <span className="qb-sum-note">
                    {quote.adjustments.length === 1
                      ? '1 on the sheet'
                      : `${quote.adjustments.length} on the sheet`}
                  </span>
                </dt>
                <dd className="qb-sum-fig">{money(totals.adjustmentsTotal)}</dd>
              </div>
            ) : null}
            {totals.taxRate === null ? (
              <div className="qb-sum">
                <dt className="qb-sum-lab">
                  Tax
                  <span className="qb-sum-note">
                    No rate is typed on this quote, so nothing is split out. The rate goes on the
                    whole-quote sheet.
                  </span>
                </dt>
                <dd className="qb-sum-fig">
                  <span className="qb-nil">not stated</span>
                </dd>
              </div>
            ) : (
              <>
                <div className="qb-sum">
                  <dt className="qb-sum-lab">Before tax</dt>
                  <dd className="qb-sum-fig">
                    {totals.totalExcludingTax === null ? (
                      <span className="qb-nil">not stated</span>
                    ) : (
                      money(totals.totalExcludingTax)
                    )}
                  </dd>
                </div>
                <div className="qb-sum">
                  <dt className="qb-sum-lab">
                    Tax<span className="qb-sum-note">{totals.taxRate}% typed on the sheet</span>
                  </dt>
                  <dd className="qb-sum-fig">
                    {totals.taxAmount === null ? (
                      <span className="qb-nil">not stated</span>
                    ) : (
                      money(totals.taxAmount)
                    )}
                  </dd>
                </div>
              </>
            )}
            <div className="qb-sum qb-sum--total">
              <dt className="qb-sum-lab">Total</dt>
              <dd className="qb-sum-fig">{money(totals.total)}</dd>
            </div>
          </dl>

          {totals.unpricedCount > 0 ? (
            <p className="qb-ledger-say">
              {totals.unpricedCount === 1
                ? 'One line on this quote carries no price at all. It is on the document and it is not in the figure above — a blank is never summed as nothing.'
                : `${totals.unpricedCount} lines on this quote carry no price at all. They are on the document and they are not in the figure above — a blank is never summed as nothing.`}
            </p>
          ) : null}
        </div>
      ) : null}

      {refusals.length > 0 ? (
        <div className="qb-ledger-whys" role="status">
          {refusals.map((w) => (
            <p key={w} className="qb-ledger-why">
              {w}
            </p>
          ))}
        </div>
      ) : null}
    </footer>
  )
}

/** One line in the breakdown. `ds-rise` fires on MOUNT and on nothing
 *  else, so the row that just arrived is the row that moves — no list
 *  of ten re-animating because an eleventh was added. */
function LedgerLine({ line, index }: { line: QuoteLine; index: number }): ReactElement {
  const { amount, overridden } = lineAmount(line)
  return (
    <li className="qb-led-row ds-rise" style={{ ['--i' as string]: index }}>
      <span className="qb-led-name">{line.label}</span>
      <span className="qb-led-qty">{line.qty > 1 ? `${line.qty} ×` : ''}</span>
      <span className="qb-led-col">{line.priceColumnName ?? ''}</span>
      <span className="qb-led-amount">
        {amount === null ? (
          <span className="qb-nil">not priced here</span>
        ) : (
          <>
            {money(amount)}
            {overridden ? <span className="qb-led-typed mono-label">typed</span> : null}
          </>
        )}
      </span>
    </li>
  )
}

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
  total,
  refusals,
  onOpenCustomer,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  total: number
  refusals: readonly string[]
  onOpenCustomer?: (rowId: string) => void
}): ReactElement {
  const nameRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <p className="qb-say">
        Giving it to them freezes the document, so the name has to be on it before it goes — it
        cannot be added afterwards. Everything above is already written down.
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
              {s.amount === null ? <span className="qb-nil">not priced</span> : money(s.amount)}
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
        <div className="qb-whys" role="status">
          {refusals.map((w) => (
            <p key={w} className="qb-none-held">
              {w}
            </p>
          ))}
        </div>
      ) : null}
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
   ONE OFFER — a photograph, a name, what it costs, and WHY IT DOES
   NOT FIT WHEN IT DOES NOT.

   THE CARD IS A TOGGLE. It used to be `disabled` once the row was on
   the quote, which is the one state where a person is most likely to
   press it — they have just realised they picked the wrong motor —
   and a disabled control drops out of the tab order and takes its own
   explanation with it. Pressing it again takes it off, and `quotes.ts`
   raises the undo toast rule 9 asks for. The row on the quote keeps
   its own × as well, so neither reading of the step loses the act.

   AND IT SAYS WHY IT IS NOT ON THE SHORTLIST. `outsideWhy` is the
   sentence `freeze.ts` computed by re-running the narrowing's clauses
   one at a time against this row — "its Max boat length (5.20 m) is
   less than this boat's Length (5.60 m)". Production omits the row
   entirely; a nicer-looking omission would be the same failure. When
   no single clause can honestly be blamed the field is absent and the
   chip alone stands, which is the difference between saying nothing
   and saying something wrong.
   ============================================================ */

function OfferCard({
  candidate,
  index,
  still,
  lit,
  onPick,
}: {
  candidate: Candidate
  /** where it sits in the shelf — the entrance stagger, capped in
   *  ds.css at 14 steps so a long shelf never waits a second */
  index: number
  /** the app's motion gate: true while somebody is typing, and the
   *  reason a search does not make this shelf flicker */
  still: boolean
  /** the keyboard is pointing at this one */
  lit: boolean
  onPick: () => void
}): ReactElement {
  const line = candidate.line
  const on = candidate.alreadyLineId !== undefined
  const facts = (line.pairFacts ?? []).slice(0, 3)

  return (
    <button
      type="button"
      className={`qb-card ds-sheen${still ? '' : ' ds-rise'}${on ? ' is-on' : ''}${
        candidate.outside ? ' is-outside' : ''
      }${lit ? ' is-lit' : ''}`}
      style={{ ['--i' as string]: index }}
      aria-pressed={on}
      aria-label={
        on
          ? `Take ${line.label} back off this quote`
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
            <span className="qb-card-outside">Not on the shortlist</span>
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

        {/* RULE 10, ON THE ROW. See the block above. */}
        {candidate.outsideWhy ? (
          <span className="qb-card-why">{candidate.outsideWhy}</span>
        ) : null}

        <span className="qb-card-foot">
          {line.unitPrice === null ? (
            <span className="qb-nil">not priced here</span>
          ) : (
            <span className="qb-card-price">{money(line.unitPrice)}</span>
          )}
          {line.priceColumnName ? (
            <span className="qb-card-col mono-label">{line.priceColumnName}</span>
          ) : null}
          <span className="qb-card-act">
            {on ? (
              <>
                <X size={11} weight="bold" aria-hidden="true" />
                Take it off
              </>
            ) : (
              'Put it on'
            )}
          </span>
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
  /* The box is reserved at this size before the bytes land, so a
     picture arriving late never moves the plate under it. */
  const size = big ? 420 : 132
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
          <span className="qb-nil">not priced here</span>
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
