/* ============================================================
   THE CONFIGURATOR — one page, scrolled, with the boat held still
   beside it.

   ── WHAT THIS REPLACED, AND WHY ──────────────────────────────

   It was a SIX-STOP DECK: a navy rail of numbered stops across the
   top, a progress meter under it, one decision on screen at a time,
   and a "Next step" button at the foot of each. Everything worked.
   The verdict on it was "a slight improvement", and all four of the
   reasons given were the same reason — it still read as a form over
   a schema rather than as a document about a boat.

   PHASE_TWO §2.3 replaces it with the shape the reference actually
   has, measured rather than remembered (CONFIGURATOR_PLAYBOOK):

     Porsche's configurator is ONE CONTINUOUS SCROLLING PAGE. ~300
     inputs, all present at once, in eleven accordions in a fixed
     order. The car is sticky on the left and fills the height;
     ~9,700px of option rail scrolls past it. There is NO PROGRESS
     INDICATOR AT ALL. The price never leaves the screen.

   So: no step rail, no meter, no next-step button, no "step 5 of
   8". A person reading a document does not need to be told how far
   through it they are — and GOV.UK removed a twelve-step indicator
   from Carer's Allowance and measured no change in completion rate
   or completion time.

   ── WHERE WE DIVERGE FROM THE REFERENCE, AND WHY WE MUST ─────

   Porsche can put every option on one page because a 911 has eleven
   groups. This rig has 2,519 pairings and a 434-row trailer
   shortlist. A flat list would be a 40,000px page.

   So we take the COMPOSITION and not the LIST. Every band is a
   SOLVER-COMPUTED SHORTLIST with its own search and its own
   switch — `stepOffer` narrows, `readCuration` explains, and the
   rows the narrowing left out stay on screen with the measurement
   that removed them written beside them. That shortlist is the
   product's whole value and it is the one thing the reference
   cannot copy back.

   ── THE THREE BANDS OF THE SCREEN ────────────────────────────

     THE PRODUCT   left, never scrolling — not its own scrollbar
                   either — full height. The reference, THE NAME,
                   the specs as hairlines, the photograph, then what
                   has been put on the quote. IT CHANGES WITH THE
                   BUILD: pick a motor and the render crossfades to
                   it, 260ms, opacity only. §THE PRODUCT.
     THE BANDS     right, and THE ONLY SCROLLPORT ON THE SCREEN.
                   FIVE DECISIONS in a fixed order — 01 THE HULL,
                   02 MOTOR, 03 TRAILER, 04 DEALER FIT,
                   05 ADMINISTRATION — each head carrying its
                   number, its name, WHERE THAT DECISION STANDS, its
                   band hue and a collapse for the person who wants
                   less. Where a decision is answerable from more
                   than one table, the table is a heading INSIDE the
                   band. `bands.ts` owns the order, the sorting and
                   the head's one clause.
     THE PRICE     under both, a sibling of the scrollport so no
                   line can ever pass behind it. Inclusive and
                   exclusive, the rung, and the handover. §THE PRICE.

   ── AND THE BANDS WERE NAMED FOR TABLES UNTIL 2026-09-09 ─────

   Measured at 1280×800 on a fresh Highfield CL260 (PVC) B-G-DG:
   SEVEN bands, six open, named *Highfield Inflatables*, *Yamaha
   Outboards*, *NSM Custom Trailers*, *GFAB Trailers*, *Dealer Fit
   Packages*, *Parts & Accessories*, *Rigging Kits* — every one of
   them a table on the dealer's price file. The screen written to
   cure "it feels like a database" was organised by the database,
   which is the fault QUOTE_GROUND_UP was written to name. The
   trailer question was two bands and the dealer-fit question was
   three. It is four bands now and `bands.ts` carries the reasoning.

   ── THE PROSE BUDGET, WHICH IS MOSTLY DELETION ───────────────

   PHASE_TWO §1a counted the words on seven surfaces and found five
   of them spending more than half on the app narrating itself. The
   budget it sets is: a stage gets its name and at most one line, a
   card gets a name and ONE fact, an empty state keeps its sentence
   AND its act, and a refusal always keeps its sentence.

   What went from this screen, and where it went:

     the "step 5 of 8" plate         · deleted with the deck
     the keyboard hint paragraph     · the keys are per-band now
     "every pick is written…"        · deleted. It is still SAID
                                       when the write actually
                                       fails, which is the only
                                       time it is news.
     the subject step's paragraph    · deleted. The line carries its
                                       own source cell.
     the handover's paragraph        · deleted. `issueBlockers`
                                       already says the same thing
                                       as a refusal, in place.
     the measured-rate plate         · deleted as a PLATE. The rate
                                       still travels, on the
                                       curation chip, where
                                       `StepMeasure.clause` was
                                       always meant to carry it.

   Nothing true was lost and no refusal was touched.

   ── AND THEN IT WAS COUNTED AGAIN, AND FOUR THINGS SAID ONE ──

   Measured at 1600×1000 on a fresh quote for a Highfield RU230KAM,
   with the NSM Custom Trailers band open — every visible text node
   under `.qb-body` and `.qb-price`, a run being a node of twelve
   words or more: 205 words, 91 of them (44.4%) in runs. The budget
   this repo works to is under 20%.

   THE FIGURES IN THIS PARAGRAPH WERE 242 / 126 / 52.1 % AND DID NOT
   REPRODUCE. Two passes re-took them the way this comment describes
   and got 216 / 97 / 44.9 % and 205 / 91 / 44.4 %; the pair above is
   the integrator's own reading, on this tree, on that boat. The
   error was against the writer — the screen was better than they
   claimed, before and after.

   Where the 126 were. FOUR surfaces were saying one fact — that
   nothing in that table is paired with this boat:

     the curation chip     "0 of 73 NSM Custom Trailers · Highfield
                           × NSM Custom — Trailer Fitment names
                           which ones go with this one · holds at
                           100% across the price file (F8)"
     the curation NOTE     "73 NSM Custom Trailers are not offered
                           here, because Highfield × NSM Custom —
                           Trailer Fitment names which ones go with
                           this one — it holds at 100% across the
                           price file (F8)."   ← the chip, in prose
     the empty state       "Nothing in NSM Custom Trailers is paired
                           with this one on the price file. The
                           catalogue is still there."
     the disclosure        "NOT OFFERED 73 ›"

   And TWO controls doing one act: `CurationNote`'s "Show everything"
   switch and the empty state's "Show all 73 NSM Custom Trailers",
   60px apart.

   THE CHIP IS THE ONE THAT IS RIGHT, and the reason is uniformity
   rather than taste: `CurationNote` is the mechanism every curated
   list in this application mounts, so a dealer learns to read one
   line in one place. It is also the only one of the four carrying
   the MEASURED RATE, which is the part a person cannot reconstruct.

   So the note keeps only its second half — the discontinued
   contract's sentence, which is a DIFFERENT fact and is in no chip —
   the empty state keeps its DOOR and loses its sentence, the
   disclosure is drawn only where there is a shortlist to contrast it
   with, and the generic switch stands down where the door with the
   count in its label is already on screen.

   COUNTED AGAIN AFTERWARDS, same boat, same window, same band open:
   125 words, 12 in runs of twelve or more — 9.6%. And that single
   run is the dealer's own data rather than anything this app wrote:
   the join clause "Highfield × NSM Custom — Trailer Fitment names
   which ones go with this one" on the curation chip, twelve words
   exactly. NO SENTENCE THE APP WRITES ABOUT ITSELF REACHES TWELVE
   on this screen. The four runs it replaced were the four surfaces
   named above: the note, the strip, the empty state and the chip.

   The other 84 words that went: the footer strip's paragraph (§THE
   PRICE), the render caption that repeated the heading, and the
   customer refusal printed a third time under the paperwork tally.

   ── MOTION, AND ITS BUDGET ───────────────────────────────────

     the render crossfade   260ms, opacity only, on a build change
     the accordion          a spring a person can interrupt
     the shelf entrance     a 26ms stagger, once, and never while
                            somebody is typing (`still`)
     the conflict sheet     scales from the control that caused it
     the money              DOES NOT MOVE. The figure is replaced on
                            the frame it changes; only the delta
                            chip beside it animates. A dealer reads
                            a price aloud.
     the proposal           DOES NOT ANIMATE AT ALL, and takes the
                            delta chip's own slot. It tracks a
                            pointer, and an entrance on every card a
                            mouse crosses is a strip that flickers.

   ── THE KEYBOARD, WHICH IS THE WHOLE OF §C ───────────────────

   A salesperson does this forty times a day. Inside an open band:

     Tab              reaches the shelf — ONE stop, not one per card
     ↓ ↑              move the highlight AND the focus, wrapping
     Home / End       the first and the last
     Enter / Space    the card's own activation. No handler.
     Escape           back to the band's head, then out of the page

   Arrowing or hovering a card weighs it on the price bar before it
   is taken. `steps.ts` `weighPick` does the arithmetic.

   ── WHAT THIS FILE MAY NOT DO ────────────────────────────────

   It never reads the project store. The live reads it needs are
   events and they live in `freeze.ts`.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement, RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown, Check, Star, Warning, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
/* THE PRIMITIVES. Adopting one is deleting the local rule for that
   thing (src/ui/index.ts, "adoption is deletion"): none of the five
   takes a className, so there is no way to keep `.qb-plate` pointing
   at a Row. build.css lost every rule that a primitive now draws.
   What is NOT adopted, and why, is said at each site — the shelf
   card and the band head are the two, and each names the gap. */
import { Button, Card, Field, Row, SectionHead } from '@/ui'
import { useActionBar } from '@/lib/actions'
import { HELD_AS_LINK, heldAsLinkNote, useImageDisplay } from '@/lib/imageSources'
import {
  heldBackSentence,
  retiredPairsSentence,
  retiredTableSentence,
} from '@/features/views/sellable'
import { SPRING, transitionFor, useStillness } from '@/features/views/stillness'
/* THE ONE SHAPE EVERY NARROWED LIST TAKES — hl-journeys.md §4, built
   once so a surface gets all four properties or narrows nothing. A
   band mounts the mechanism; it does not draw its own count chip. */
import { CurationNote, readCuration, type CurationInput } from '@/features/curation'
import {
  OFFER_CAP,
  sectionKinds,
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
import { recallOpen, rememberOpen } from './place'
import { buildSteps, savedNote, weighPick } from './steps'
import type { BuildStep, Weighing } from './steps'
import { orderBands, type Band, type BandTable } from './bands'
import { deltaSay, levelConflict, type Conflict } from './conflict'
import { cascadeOfConflict } from './cascade'
import { distinguishingFacts, type ShownFact } from './distinguish'
import { PAIR_SLOT_LABEL } from './freeze'
import { CascadeSheet } from './CascadeSheet'
import { FlowFoot, FlowLine, RunningTotal, type FlowStop } from './flow'
import { FrozenPhoto } from './photo'
import type { QuoteDef, QuoteLine } from '@/types/model'
import './build.css'

/** What a band that offers nothing reads as — the subject's band, and
 *  the moment before the first live read lands. Frozen so the memo
 *  hands back the same object rather than a fresh empty one. */
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

/** How many rows the narrowing left out are drawn at once. They are
 *  never hidden — the count is always said and the whole of it is one
 *  press away — but a 2,934-row refusal list drawn in full is a page
 *  nobody reads, and every one of those rows costs a re-run of the
 *  clauses to say why. `OFFER_CAP` is the ceiling `stepOffer` itself
 *  applies; this is what is drawn before asking. */
const REFUSED_SHOWN = 8

/** The proposal on the pointer, with the SHELF that owns it. The
 *  arithmetic is `weighPick` in `steps.ts` — pure, and there rather
 *  than here so `steps.test.ts` can assert it without this screen's
 *  React, motion and icon graph coming with it (the runner takes
 *  `.ts` only, and its config says so on purpose).
 *
 *  IT IS THE SHELF AND NOT THE BAND, and that is a consequence of
 *  bands being decisions rather than tables: `04 DEALER FIT` holds
 *  three shelves on the real seed, and keyed on the band they would
 *  clear each other's proposal the moment any of the three
 *  re-rendered. A shelf is one section, so `step.id` is the key. */
type Weigh = Weighing & { shelfId: string }

export interface QuoteBuildProps {
  quote: QuoteDef
  /** the stage's own "it is issued now" move */
  onIssued?: (quote: QuoteDef) => void
  /* ============================================================
     THE THIRD MOMENT, AND IT IS NOT A BAND ANY MORE.

     The paperwork was the last accordion on this page: the customer
     box, a tally of what was on the quote, and a second printing of
     every reason the quote could not go out. Measured on a Highfield
     CL360 at 1600x1000, with every band open, `.qb-scroll` ran to
     3,762px against an 805px viewport and that band's head sat at
     3,277px — 87% of the way down a page four screens tall, SHUT,
     because the default of the day opened the first band with
     something to decide and nothing else. Shut and unopened it still
     sat at 942px, below the fold on a 1,019px scroll.

     CONFIGURATOR.md §A: "Nobody does *address*, and it is a step,
     not a footnote." A shut accordion at 3,277px is a footnote. And
     as a BAND it was a peer of Yamaha Outboards — a shelf you pick
     from — which is not what it is.

     So Address is the flow's third moment and it is the sheet: who
     it is for, the adjustments, the tax rate, the note, the contact
     lines, the re-read, and the handover. That surface already
     existed (`QuoteEditor`) and was drawn as an alternative READING
     of a draft, reached by a button in the corner of this bar called
     "The whole quote". It is not an alternative reading. It is where
     a quote is finished, and it is named now.

     WHAT WENT WITH THE BAND, and nothing true went with it: the
     tally repeated the ledger under the total line for line, and the
     refusal list repeated `issueBlockers` a third time — the price
     bar says the first reason, the ledger says all of them, and
     `CustomerField` prints the freeze clause against the box. The
     ONE thing the band did that nothing else did was let a name be
     typed without leaving this page, and the refusal's own act now
     walks to the page where the box is, with the caret in it.
     ============================================================ */
  onGo: (to: FlowStop) => void
}

export function QuoteBuild({ quote, onIssued, onGo }: QuoteBuildProps): ReactElement {
  const steps = useMemo(() => buildSteps(quote), [quote])
  /* ONE STORE READ FOR THE WHOLE DOCUMENT, AND IT DECIDES THE WHOLE
     SHAPE OF THE PAGE. `EntityDef.kind` is what says a section is a
     trailer section, so it is what sorts every section into one of
     the five decisions — and it is also the hue, per
     DESIGN_PRINCIPLES §1's discipline that a hue only ever appears
     on something that HAS that kind. */
  const kinds = useMemo(() => sectionKinds(quote), [quote])
  const bands = useMemo(() => orderBands(steps, kinds), [steps, kinds])
  const totals = quoteTotals(quote)
  const refusals = issueBlockers(quote)
  const { still } = useStillness()

  /* ── EVERY BAND THAT DECIDES SOMETHING OPENS, AND THE ACCORDION IS
     A TOOL RATHER THAN A GATE ──────────────────────────────────────

     MEASURED at 1280×800 on a fresh Highfield CL260 (PVC) B-G-DG,
     twice. Before the bands were decisions: SEVEN bands — one per
     table — six of them open, 2,763px of rail in a 546px port. The
     trailer question was two of those bands and the dealer-fit
     question was three, so "how many decisions are on this quote"
     had no answer on the screen. After: FOUR bands, three open,
     because a business that sells no custom lines gets no
     `05 ADMINISTRATION`.

     CONFIGURATOR_PLAYBOOK §8 rejects "gates before the tool" and
     PHASE_TWO §2.3 asks for a SCROLLING OPTION RAIL — "bands are
     accordions in a fixed order; open several at once". A stack of
     collapsed drawers is neither.

     An accordion earns its keep the moment a person has read past a
     band — a 73-row trailer shortlist is worth folding away — so
     the HEAD keeps its collapse. What it may not do is decide, on a
     person's behalf and before they have looked, which questions
     they are not allowed to see.

     So the default is every band that decides something open, in
     the fixed order, and collapsing is a deliberate act by somebody
     who wants less. It is one scroll of sections, which is what
     §2.3 drew.

     AND SHUTTING ONE IS CHEAPER THAN IT WAS, which is the other
     half of the bands-by-kind change. A shut head now states its
     own decision (`bands.ts` `stateSay`), so folding `03 TRAILER`
     away leaves "7 offered" on screen rather than a closed door
     with a table's name on it. QUOTE_GROUND_UP §1: shut does not
     mean unknown.

     WHAT SURVIVES A RELOAD is unchanged in mechanism and changed in
     what it stores. `place.ts` hands back whatever it kept and this
     is where it is CHECKED: an id that no longer names a band of
     this document is discarded here rather than trusted — which is
     also the whole migration off the old per-table ids, since a
     stored `ve-tQ8awws` matches no band and the page simply opens
     with its default. Every line the page has produced is already
     on the document, so losing this loses a scroll position and
     never a decision. */
  const [open, setOpen] = useState<string[]>(() => {
    const back = recallOpen(quote.id).filter((id) => bands.some((b) => b.id === id))
    /* A BAND THAT DECIDES NOTHING IS NOT ONE OF THEM. On a quote
       raised from a hull, `01 THE HULL` holds only the subject — the
       thing the whole document is about — and opening it would put a
       read-only line where the first choice should be. Its head
       still says which hull, which is what it never did before. */
    return back.length > 0 ? back : bands.filter((b) => b.decides).map((b) => b.id)
  })
  useEffect(() => {
    rememberOpen(quote.id, open)
  }, [quote.id, open])

  const toggle = useCallback((id: string) => {
    setOpen((was) => (was.includes(id) ? was.filter((x) => x !== id) : [...was, id]))
  }, [])

  /* ── ADDRESSING THE QUOTE, FROM THE BAR THAT REFUSES IT ─────────
     The strip under the bands said "Type the customer name at the
     top". Measured on a fresh quote at 1600×1000: the top of this
     screen holds a reference stamp, a photograph and a headline, and
     the customer box was in the LAST band — shut, and 3,277px down
     with every band open. A person who read the sentence and looked
     up found nothing there.

     `totals.ts` owns those words and four surfaces read them, so the
     fix was never to reword the sentence: it is to give the refusal
     the act it describes. The act is now the flow's own third stop.
     The caret lands in the box without a second mechanism here —
     `QuoteEditor` focuses `nameRef` on mount, keyed on `quote.id`,
     and Address mounts it fresh. The `seekName` effect that used to
     do it from this end is deleted with the band it was reaching
     into. */

  /* THE RENDER — which photograph the left column is showing.
     `null` is the hull, which is where it starts and where it goes
     back to when the line it was showing comes off the quote. */
  const [showing, setShowing] = useState<string | null>(null)
  const seenLines = useRef<string[]>([])
  useEffect(() => {
    const ids = quote.lines.filter((l) => l.image).map((l) => l.id)
    const fresh = ids.find((id) => !seenLines.current.includes(id))
    seenLines.current = ids
    /* THE BUILD CHANGED, SO THE RENDER CHANGES. This is the whole of
       "it does not feel alive": a person who picks a motor watches
       the picture become that motor. It is the newest photographed
       line, never a guess at which one matters. */
    if (fresh !== undefined) setShowing(fresh)
    else setShowing((was) => (was !== null && !ids.includes(was) ? null : was))
  }, [quote.lines])

  const delta = useTotalDelta(totals.total)
  const saveProblem = persistNote()

  /* ── THE PROPOSAL ON THE POINTER, AND WHY IT CARRIES A SHELF ID ──
     Several bands are open at once and each shelf runs its own
     effect, so when the document changes EVERY open shelf
     republishes — the one with the highlight publishes its weighing
     and all the others publish null. Last writer wins, and the last
     writer is whichever shelf React commits last, not the one a
     person is pointing at.

     So a shelf may only clear what it itself put there. Two lines,
     and without them the price bar's proposal blinks out the moment
     any other shelf re-renders.

     IT IS KEYED ON THE SHELF AND NOT THE BAND, and that is new with
     bands-by-kind: `04 DEALER FIT` holds three shelves on the real
     seed, so a band key would have let three siblings inside one
     band do to each other exactly what the bands were doing to each
     other before. A shelf is one section. */
  const [weighing, setWeighing] = useState<Weigh | null>(null)
  const onWeigh = useCallback((shelfId: string, w: Weigh | null) => {
    setWeighing((was) => {
      if (w !== null) return w
      return was === null || was.shelfId !== shelfId ? was : null
    })
  }, [])
  const subjectNote = unsellableSubject(quote.rootTableId, quote.rootRowId)

  /* THE PROPOSAL ON THE TABLE, AND IT IS NOT COMMITTED. While this is
     set the price bar goes on showing the total the document actually
     carries — Porsche's rule, and the difference between a sheet a
     person decides and a notification they acknowledge. */
  const [proposal, setProposal] = useState<{
    conflict: Conflict
    levelKey: string
    /* the rung's own label, which is what the person pressed and so
       what the sheet has to call it back */
    levelLabel: string
    /* whether a KEY opened it — the same `event.detail` reading the
       band head takes, carried this far because the sheet is drawn
       here and the press happened on the price bar. §6: nothing
       keyboard-initiated animates. */
    quiet: boolean
  } | null>(null)

  const levels = useMemo(() => quoteLevelChoices(quote.lines), [quote.lines])

  /* CHANGING THE RUNG IS THE ONE CHOICE HERE THAT CHANGES EVERY LINE
     ALREADY MADE, so it asks first — and only when there is something
     to decide. `levelConflict` returns null when nothing moves, and
     then the change simply happens. */
  const askLevel = useCallback(
    (key: string, label: string, quiet: boolean) => {
      const conflict = levelConflict(quote, key, label)
      if (conflict === null) {
        setLevel(quote.id, key)
        return
      }
      setProposal({ conflict, levelKey: key, levelLabel: label, quiet })
    },
    [quote],
  )

  /* THIS SCREEN PUBLISHES NO ACTION BAR, AND THAT IS THE POINT.
     `.pagebar` is a fixed strip at the foot of the content column,
     and the price bar below is a fixed strip at the foot of the
     content column — two of them, one over the other, is how the
     old deck ended up with "Give it to the customer" sitting on top
     of the sentence explaining who the quote was addressed to.

     There is exactly one bar now and it is the price. Both doors the
     page used to publish are drawn on it: the whole sheet, and the
     handover with its refusal beside it. */
  useActionBar('quote-build', null)

  return (
    <>
      <div className="qb-body">
        <ProductPane
          quote={quote}
          steps={steps}
          showing={showing}
          onShow={setShowing}
          still={still}
          subjectNote={subjectNote}
          saveProblem={saveProblem}
        />

        <div className="qb-scroll">
          <div className="qb-bands">
            {bands.map((band) => (
              <BandBlock
                key={band.id}
                quote={quote}
                band={band}
                open={open.includes(band.id)}
                still={still}
                onToggle={() => toggle(band.id)}
                onWeigh={onWeigh}
              />
            ))}
          </div>
        </div>
      </div>

      <PriceBar
        quote={quote}
        steps={steps}
        totals={totals}
        delta={delta}
        weighing={weighing}
        refusals={refusals}
        levels={levels}
        onLevel={askLevel}
        onGo={onGo}
        onIssue={() => {
          if (issueQuote(quote.id)) onIssued?.(quote)
        }}
      />

      {/* ONE SHEET FOR EVERY CHANNEL. The level was drawing its own
          sheet in its own grammar while fitment — the channel that
          actually fires on a dealer's price file — drew none at all.
          `cascadeOfConflict` maps this one onto the shape the
          teardown settled, so a person learns the sheet once.
          `docs/research/cascade-teardown-porsche-live.md`. */}
      <AnimatePresence>
        {proposal ? (
          <CascadeSheet
            key={proposal.conflict.id}
            cascade={cascadeOfConflict(proposal.conflict, {
              label: proposal.levelLabel,
              amount: null,
            })}
            still={still || proposal.quiet}
            onAccept={() => {
              setLevel(quote.id, proposal.levelKey)
              setProposal(null)
            }}
            onCancel={() => setProposal(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

/* ============================================================
   §THE PRODUCT — the boat, held still, at the scale of the thing
   it actually is.

   IT WAS 220px WIDE BESIDE A 21px NAME, then 380px beside a 34px
   name, and it scrolled away the moment somebody started picking.
   PHASE_TWO §3 names the fix as a number: a product name at
   72–110px against 12px labels, and a photograph that is
   full-height rather than a card header. Nothing on the outgoing
   dashboard was larger than 34px across seven sizes, which is not
   a hierarchy — it is the absence of one.

   IT IS STICKY BY BEING OUTSIDE THE SCROLL, WHICH IS THE STRONGER
   FORM OF IT. `position: sticky` inside a scrollport is floored by
   that scrollport's content box and has to be told a height it
   cannot know — and if it is ever told wrong, its own tail becomes
   unreachable. This pane is a flex SIBLING of the scrolling column,
   so it is full height by construction at every size, it never
   moves, and at 1024 and below the two stack and the whole page
   scrolls instead.

   AND IT NO LONGER SCROLLS ITSELF. It carried `overflow-y: auto`,
   which put a second scrollport beside the first: measured at
   1280×800, this pane held 713px in 524 and the option rail held
   654px in the same 524, so the screen had two scrollbars and the
   answer to "which one moves" was the pointer's x. PHASE_TWO §2.3
   asks for one. It fits instead — see `.qb-product` in build.css
   for which block gives when it cannot.

   THE ORDER IS A DOCUMENT'S: the reference, the name, the specs,
   the photograph, then what has been put on the quote. It ran
   photograph → decided lines → reference → name, so the heading sat
   UNDER the list it heads, at y=541 in a pane that ended at 604.

   WHAT THE RAIL WAS, AND WHICH HALF OF IT SURVIVED. The responsive
   pass split this page into a `qb-rail` and a `qb-main` above
   1040px of stage, with the rig plate and the step list stacked in
   a STICKY aside, so a person four hundred pixels down a wall of
   motors still had the hull, the reference and the running package
   on screen. THE RULE IT WAS DRAWN FROM IS KEPT, and it is why this
   pane exists at all: the left column carries what is true of the
   WHOLE BUILD rather than of the step somebody happens to be on.
   The MECHANISM is not, for the paragraph above — and the step list
   the rail also held went with the deck, so there is no second
   plate left to stack. 1024 rather than 1040 because the split is
   measured against the widths this photograph needs, not against a
   column of stops.

   THE RENDER CROSSFADES. Two layers, opacity only, 260ms — the one
   moment on this screen that earns real motion, and the thing the
   app had none of. The plates under it are how a person goes back
   to the hull, so the picture is never a mystery.
   ============================================================ */

/* THE MARQUE MOVED TO `./marque.ts` in the rebuild — pure
   string work, and the rebuilt screen needs it too. Re-exported
   here so this file's own callers and `marque.test.ts` did not
   have to move in the same commit. */
export { marqueOf } from './marque'
import { marqueOf } from './marque'


function ProductPane({
  quote,
  steps,
  showing,
  onShow,
  still,
  subjectNote,
  saveProblem,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  showing: string | null
  onShow: (id: string | null) => void
  still: boolean
  subjectNote: string
  saveProblem: string | null
}): ReactElement {
  const shot = quote.lines.find((l) => l.id === showing)
  const img = shot ? shot.image : quote.subjectImage
  const name = shot ? shot.label : quote.subjectLabel
  const lockup = marqueOf(quote.subjectLabel)

  /* ── WHAT IS ALREADY DECIDED, WHERE IT CANNOT SCROLL AWAY ────────
     CONFIGURATOR.md §C: "A person deep in Dealer Fit needs to see
     the hull and the motor without scrolling." Measured at 1600×1000
     on a Highfield SP760ST with every band open: the scrollport runs
     to 6,211px against an 805px viewport, the Dealer Fit band starts
     at 2,605px and the motor band's head — the only place the chosen
     motor was written — sits at 169px. Two thousand four hundred and
     thirty-six pixels of scroll to answer "which motor did I pick".

     THE HULL WAS NEVER THE PROBLEM at this width: this pane is a
     flex SIBLING of the scrollport, so the photograph, the name and
     the specs are on screen the whole time. Below 1023 the two stack
     and the whole page scrolls, and that is unchanged.

     THIS IS THE PLATES ROW, GIVEN NAMES. It drew the same lines as
     56×42 thumbnails with the name in a `title` attribute — so the
     one surface that already knew what had been decided could only
     be read by hovering it. Same control, same act (press it and the
     render becomes that thing), one fact added.

     THAT PASS ALSO GAVE A ROW TO A LINE WITH NO PHOTOGRAPH, and
     that half is withdrawn below: a plate is a picture to switch
     to, and a plate with no picture is a control with no act. The
     naming is what was worth keeping and it is kept.

     AND IT DREW THE HULL TWICE. `quote.lines` holds the subject as a
     line of its own, so a plate was drawn for `quote.subjectImage`
     and a second, identical one for that line — two of the same
     photograph, first and second, on every quote. The subject step
     owns its line here, so it is one row.

     NO FIGURES ON IT. A column of prices beside a total a person
     could sum and find short — a typed line belongs to no band — is
     a second ledger that can disagree with the first. The money is
     on the price bar and its arithmetic is one press away there. */
  const subjectLineId = steps.find((s) => s.subject)?.lines[0]?.id
  /* ── A PLATE IS A PHOTOGRAPH TO SWITCH TO, SO A LINE WITHOUT ONE
     GETS NO PLATE ──────────────────────────────────────────────────

     This drew a row for every decided line, and a line the price
     file carries no photograph for drew a grey rectangle: a control
     whose whole act is "put this picture in the render above" and
     which, pressed, puts a placeholder there instead. Measured on a
     fresh CL260 the hull pick mints four lines and TWO of them —
     Fuel Tank, Tube Covers — are that. Two dead controls of four,
     104px of a 524px pane.

     It is also what made this list unbounded, and an unbounded list
     is what made the pane a second scrollport. A dealer-fit build
     of nine lines drew nine rows at 52px whatever the window had.
     Photographed lines are hull, motor, trailer and the odd package
     — two or three on a real rig — so the list is bounded by the
     data rather than by a cap this file invented.

     NOTHING TRUE IS LOST. Every decided line is on its own band
     head as that band's one fact, in the ledger behind the total,
     and on the quote document itself. What is gone is a button that
     did nothing when pressed. */
  const decided = steps
    .filter((s) => !s.subject)
    .flatMap((s) => s.lines)
    .filter((l) => l.image)

  return (
    <aside className="qb-product" aria-label="What this quote is about">
      {/* ── THE NAME READS FIRST, BECAUSE IT NAMES EVERYTHING UNDER IT
          ────────────────────────────────────────────────────────────

          MEASURED at 1280×800 on a Highfield CL260 (PVC) B-G-DG: the
          pane ran photograph (y=100) · four decided lines (y=296) ·
          the reference stamp (y=518) · the `h1` (y=541) — and the
          pane's own floor was y=604, so the heading of the page was
          BELOW the list it heads and half of it was under the fold.
          A person had to scroll a 401px column to find out which
          boat they were quoting.

          The order is a document's now: the stamp, the name, the
          facts about it, then the photograph of it, then what has
          been put on it. That is also the anatomy `PageHead` uses on
          every other screen in this app — eyebrow, name, facts —
          which is why the reference keeps the mono-label step it
          already had rather than gaining a treatment of its own.

          AND THE NAME IS A LOCKUP NOW, NOT A STRING. One `h1`, three
          steps: the maker, the model at the display step, and what
          qualifies it. See `marqueOf` above for what is split and why,
          and `.qb-name` in build.css for the two measurements that set
          the step. Every character of `subjectLabel` is still inside
          this heading, in the order it was written, so what a screen
          reader announces is unchanged. */}
      <div className="qb-ident">
        <p className="qb-ref mono-label">{quote.reference}</p>
        <h1 className={`qb-name${lockup.long ? ' is-long' : ''}`}>
          {lockup.maker === '' ? null : <span className="qb-name-maker">{lockup.maker}</span>}
          <span className="qb-name-model ds-marque">{lockup.model}</span>
          {lockup.trim === '' ? null : <span className="qb-name-trim">{lockup.trim}</span>}
        </h1>

        {quote.subjectSpecs.length > 0 ? (
          <ul className="qb-specs">
            {quote.subjectSpecs.map((s) => (
              <li key={s.label} className="qb-spec">
                <span className="qb-spec-lab">{s.label}</span>
                <span className="qb-spec-val">{s.value}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* A REFUSAL ALWAYS KEEPS ITS SENTENCE, wherever it is. */}
        {subjectNote !== '' ? (
          <p className="qb-alert" role="status">
            <Warning size={ICON_SIZE.small} weight="light" aria-hidden="true" />
            {subjectNote}
          </p>
        ) : null}

        {/* AND SO DOES A FAULT. The promise that every pick is written
            as it is made used to be printed here permanently — 22
            words, on a screen a dealer sees four hundred times, about
            our bookkeeping rather than their boat. It is deleted. The
            STORAGE FAULT is not: a screen that says nothing while the
            write is failing is the one version of this that costs
            somebody a build. */}
        {saveProblem !== null && saveProblem !== '' ? (
          <p className="qb-saved" role="status">
            {savedNote(saveProblem)}
          </p>
        ) : null}
      </div>

      {/* THE CAPTION IS DRAWN ONLY WHEN IT IS NEWS. Measured: the
          strip under the photograph read "Highfield - SP420 (HYP)
          I-B-C" and the heading above it read the same five words.
          The test is NOT "is a line showing" — the hull is minted as
          a line too, and it is the newest photographed one on a fresh
          quote, so that test caught nothing. It is whether the name
          differs from the one the heading printed. The caption exists
          for the moment a person presses a plate and the picture
          becomes a motor; on the hull the heading is the caption, and
          the photograph takes the 26px back. */}
      <Render
        img={img}
        name={name}
        say={name === quote.subjectLabel ? '' : name}
        still={still}
      />

      {/* THE NAME OF THE LIST SAYS WHAT IS IN IT. It read "What is
          decided so far" while it drew every line; it draws the
          photographed ones, so it says so. A list that names itself
          after a set it does not hold is the kind of small lie a
          screen reader has no way to check. */}
      {decided.length > 0 ? (
        <ul className="qb-plates" aria-label="What is on this quote, in pictures">
          <Plate
            img={quote.subjectImage}
            name={quote.subjectLabel}
            on={showing === null || showing === subjectLineId}
            onPick={() => onShow(null)}
          />
          {decided.map((line) => (
            <Plate
              key={line.id}
              img={line.image}
              name={line.label}
              on={showing === line.id}
              onPick={() => onShow(line.id)}
            />
          ))}
        </ul>
      ) : null}
    </aside>
  )
}

/** The photograph, crossfading. Opacity only, 260ms, and both layers
 *  are in the same box so nothing reflows as one replaces the other. */
function Render({
  img,
  name,
  say,
  still,
}: {
  img: QuoteLine['image']
  name: string
  /** what the strip under the picture reads — '' draws no strip, and
   *  the layer above takes the height back */
  say: string
  still: boolean
}): ReactElement {
  const { paint } = useImageDisplay(img?.src ?? '')
  const key = img && paint ? img.src : `held:${name}`

  /* THE CAPTION IS A GRID ROW, NOT AN OVERLAY. It was absolutely
     positioned in a 24px strip with `nowrap` and a mask fade, and the
     layers stopped 26px short to leave it room — so a name longer
     than the pane was cut mid-word, softly, which §3 forbids in as
     many words ("nothing truncates mid-word"; a fade "does not spare
     a word, it only makes the cut soft" — build.css on the band
     state). The render is a two-row grid now: both crossfading layers
     share the first cell, the caption is the second row, and it wraps.
     The picture gives up exactly the height the caption needs and not
     a fixed 26px. */
  return (
    <div className="qb-render">
      <AnimatePresence initial={false}>
        <motion.div
          key={key}
          className="qb-render-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: transitionFor(still, FADE) }}
          exit={{ opacity: 0, transition: transitionFor(still, FADE) }}
        >
          {img && paint ? (
            <FrozenPhoto img={img} fallbackAlt={name} className="qb-render-img" w={880} h={660} />
          ) : (
            /* A PICTURE WE CANNOT FETCH IS A WELL: Card's sunken tone is
               "an empty slot, a placeholder" — which is what this is. */
            <Card tone="sunken" pad="md">
              <span className="qb-render-held">
                <span className="qb-well-held-word">{HELD_AS_LINK}</span>
                {img ? <span className="qb-well-held-why">{heldAsLinkNote(img.src)}</span> : null}
              </span>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
      {say === '' ? null : <p className="qb-render-say">{say}</p>}
    </div>
  )
}

/** 260ms, transform and opacity only — PHASE_TWO §4.1's own number. */
const FADE = { duration: 0.26, ease: [0.2, 0.8, 0.2, 1] } as const

/** One decided thing: what it is, and the photograph of it. Pressing
 *  it puts that photograph in the render above.
 *
 *  IT IS A ROW, and the one that is showing is the CURRENT one of the
 *  set — Row draws that from `aria-current`, so the accent wash and
 *  the announcement cannot drift apart. It carried `aria-pressed`
 *  before, which is a toggle's word; a set of pictures with one on
 *  screen is a set with a current member, and that is the truer
 *  claim. The thumbnail is the row's lead, the name its name, and the
 *  hover, the darken-on-press and the ring all come from row.css —
 *  `.qb-plate` and its five state rules are deleted from build.css. */
function Plate({
  img,
  name,
  on,
  onPick,
}: {
  img: QuoteLine['image']
  name: string
  on: boolean
  onPick: () => void
}): ReactElement {
  const { paint } = useImageDisplay(img?.src ?? '')
  return (
    <li className="qb-plate-slot">
      <Row
        dense
        current={on}
        onActivate={onPick}
        label={`Show ${name}`}
        lead={
          <span className="qb-plate-shot">
            {img && paint ? (
              <FrozenPhoto img={img} fallbackAlt={name} className="qb-plate-img" w={112} h={84} />
            ) : (
              <span className="qb-plate-mark" aria-hidden="true" />
            )}
          </span>
        }
        name={name}
      />
    </li>
  )
}

/* ============================================================
   §ONE BAND — a decision, where it stands, and the tables that can
   answer it.

   THE HEAD IS A NUMBER, A NAME AND A STATE, IN THAT ORDER OF SIZE
   AND THE OPPOSITE ORDER OF WEIGHT. `01 THE HULL` is the 11px
   uppercase group label — the only uppercase DESIGN_CONTRACT §11
   allows, and it is a label this app writes rather than anything
   off the dealer's file, so nothing is lost by shouting it. Under
   it, at the 15px heading step, is the ANSWER: `chosen: Highfield -
   CL260 (PVC) B-G-DG`, or `7 offered`.

   That inverts what was here, and deliberately. The band used to
   set the TABLE'S NAME at 15px with a clause fading out beside it,
   which made the loudest thing on a shut band the name of a
   database table and the quietest thing the decision it held.

   THE HEAD CARRIES ITS BAND'S HUE (`.k-band`), which is
   DESIGN_PRINCIPLES §1 as amended for this phase: a kind hue may
   carry a SURFACE. `bands.ts` declares one hue per band so
   `04 DEALER FIT` is the same colour on every quote — and where a
   band really mixes two kinds, each table heading inside it takes
   its own, which is what keeps "a hue only ever appears on
   something that HAS that kind" true one level down. A figure is
   never a hue: the money on the head is ink.

   THE TABLE HEADING IS DRAWN ONLY WHERE THERE IS MORE THAN ONE.
   `QuoteStart` proved this and its reason applies unchanged: on
   the real seed most bands hold exactly one table, and a heading
   there prints the same string as the shelf's own curation chip
   forty pixels below it — the duplicated eyebrow `5d00103` was
   written to end.

   WHAT THE HEADING SAYS IS THE TABLE'S OWN STATE, not its pool.
   "NSM Custom Trailers · 73" over a chip reading "0 of 73 NSM
   Custom Trailers · Highfield × NSM Custom — Trailer Fitment names
   which ones go with this one" is one fact on two surfaces, which
   is the exact defect this file's header records counting and
   removing. The heading says where THAT table stands; the chip
   under it keeps the pool, the rule and the measured rate.

   THE BODY IS A LIVE READ AND ONLY WHEN IT IS OPEN. `stepOffer`
   runs each block's rule over its whole table; doing that for shut
   bands on every redraw would be work nobody asked for. A shut band
   costs one frozen count.
   ============================================================ */

function BandBlock({
  quote,
  band,
  open,
  still,
  onToggle,
  onWeigh,
}: {
  quote: QuoteDef
  band: Band
  open: boolean
  still: boolean
  onToggle: () => void
  onWeigh: (shelfId: string, w: Weigh | null) => void
}): ReactElement {
  /* WHERE ESCAPE PUTS A PERSON BACK. The head is the band's own way
     out on the keyboard, so every shelf in it has to be able to
     reach it — see `Shortlist`'s key handling. One head for several
     shelves is the right answer and not a compromise: Escape leaves
     the DECISION, which is what the band is. */
  const headRef = useRef<HTMLButtonElement>(null)
  /* SEE THE HEADER: a heading per table only where a band really
     holds more than one, which is `.qs-sec--named`'s own rule. */
  const named = band.tables.length > 1

  /* ── WHETHER A KEY OPENED THIS BAND, AND WHY THAT DECIDES THE
     MOTION ──────────────────────────────────────────────────────

     §6's budget ends "never on a keyboard-initiated or 100+/day
     action", and emil-design-eng's frequency table puts list
     navigation — tens of times a day — at "remove or drastically
     reduce". A salesperson does this forty times a day, and the
     keyboard is how they do it fast: Tab to the head, Enter, Tab
     into the shelf. A spring under that is 300ms of nothing to
     look at, every time.

     `event.detail` IS THE MODALITY, AND IT IS THE BROWSER'S OWN
     ANSWER rather than a guess: a click synthesised from Enter or
     Space carries `detail: 0`, a real pointer click carries the
     click count. So no key listener is added, nothing is tracked
     across renders, and a mouse still gets the spring.

     IT TRAVELS DOWN AS `still`, which is the flag `stillness.tsx`
     already publishes for "the page must not move" — it is what
     prefers-reduced-motion resolves to, and what a caret in a text
     field resolves to. One boolean, three reasons, one behaviour. */
  const [quiet, setQuiet] = useState(false)
  const hushed = still || quiet
  /* ── THE BAND IS A CARD, IN ITS KIND ─────────────────────────────
     `.qb-band` drew its own border, radius, ground and a 3px kind rail
     on the leading edge. Card draws the surface, and `kind` hands the
     band's hue to the mechanism ds.css already resolves — `data-kind`
     sets `--kind`, card.css mixes 6% of it into the ground and 14%
     into the border, the same construction the module tile measured
     at 4.5:1 for a name on it. So the whole band carries its kind as
     a tint and the head above carries it stronger (`.k-band`, 10%),
     which is §1 as amended: a hue may carry a SURFACE, on a thing
     that HAS that kind. The rail went with the rule that drew it.

     FLAT, NOT RAISED: a raised card is for a card on the page; a band
     is a section of the page and a stack of four shadows is noise.

     THE HEAD IS NOT A ROW, AND THAT IS A GAP TO REPORT, NOT ONE TO
     WORK AROUND. Row is lead + name + meta + trail, and an activating
     Row may not carry a trail (a button in a button). This head is
     an activating line that ends in a FIGURE — the band's total —
     and puts its label ABOVE its answer. Row has no trailing-figure
     slot on an action row and no eyebrow slot at all. Smuggling the
     grid inside `name` would be the override layer with extra steps,
     so the head keeps its own rule and the report names the two slots. */
  return (
    <Card tone="flat" pad="none" kind={band.kind}>
      <h2 className="qb-band-h">
        <button
          type="button"
          className="qb-band-head k-band"
          ref={headRef}
          aria-expanded={open}
          onClick={(e) => {
            setQuiet(e.detail === 0)
            onToggle()
          }}
        >
          <span className={`qb-band-mark${open ? ' is-open' : ''}`} aria-hidden="true">
            <CaretDown size={ICON_SIZE.tiny} weight="bold" />
          </span>
          {/* THE NUMBER IS A READING ORDER, NOT A PROGRESS COUNT.
              §2.3 and GOV.UK's own removal of a twelve-step
              indicator: a document being read is not a form being
              completed, so it never says "3 of 5" and there is no
              meter under it. It is `aria-hidden` because "01" spoken
              before "The hull" is noise to somebody who cannot see
              that it is a column of numerals down the left edge. */}
          <span className="qb-band-num" aria-hidden="true">
            {band.num}
          </span>
          <span className="qb-band-name">{band.name}</span>
          <span className="qb-band-state" title={band.fact}>
            {band.fact}
          </span>
          <span className="qb-band-fig">{band.amount === null ? '' : money(band.amount)}</span>
        </button>
      </h2>

      {open ? (
        <motion.div
          className="qb-band-body"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, transition: transitionFor(hushed, SPRING) }}
        >
          {band.tables.map((table) => (
            <BandTableBlock
              key={table.step.id}
              quote={quote}
              table={table}
              named={named}
              still={hushed}
              headRef={headRef}
              onWeigh={onWeigh}
            />
          ))}
        </motion.div>
      ) : null}
    </Card>
  )
}

/* ============================================================
   ONE TABLE INSIDE A BAND — the heading, and the shelf under it.

   Seven trailer tables are seven of these inside `03 TRAILER`, and
   that is the whole of what "bands are decisions" costs at the
   drawing end. The heading is an `<h3>` under the band's `<h2>`, so
   the document outline a screen reader walks is the decision and
   then the tables that can answer it — which is the same structure
   the eye is being given.
   ============================================================ */

function BandTableBlock({
  quote,
  table,
  named,
  still,
  headRef,
  onWeigh,
}: {
  quote: QuoteDef
  table: BandTable
  /** whether this band holds more than one table — see BandBlock */
  named: boolean
  still: boolean
  headRef: RefObject<HTMLButtonElement | null>
  onWeigh: (shelfId: string, w: Weigh | null) => void
}): ReactElement {
  const step = table.step
  return (
    <div className="qb-tab" data-kind={table.kind}>
      {named ? (
        /* THE NAME KEEPS ITS OWN CASE, AND IT IS THE WHOLE HEADING.
           It is the dealer's own string off the price file — "Parts
           & Accessories", "REDCO / Tinka Trailers" — and rule 3 is
           explicit that uppercase is a label style and never a name
           style. The uppercase on this screen is the band's own
           label above it, which this application wrote.

           NOTHING ELSE IS ON IT. `BandTable` in `bands.ts` carries
           the reasoning: the count belongs to the chip four lines
           below and the chosen line belongs to the band head above,
           and this heading saying either would be one fact on two
           surfaces sixty pixels apart. */
        <h3 className="qb-tab-head k-rail">{step.title}</h3>
      ) : null}
      {step.subject ? (
        /* THE SUBJECT DECIDES NOTHING. It is the thing being
           configured, so its line is read-only and there is no shelf
           under it — but it is ranked by its own kind like every
           other table, which is why a quote raised on a motor finds
           it inside `02 MOTOR` rather than pinned above the hull
           decision it has not made yet. */
        <ul className="qb-picked" aria-label={step.title}>
          {step.lines.map((line) => (
            <PickedLine key={line.id} quoteId={quote.id} line={line} removable={false} />
          ))}
        </ul>
      ) : (
        <Shortlist
          quote={quote}
          step={step}
          still={still}
          shelfId={step.id}
          headRef={headRef}
          onWeigh={onWeigh}
        />
      )}
    </div>
  )
}

/* ============================================================
   THE SHORTLIST — 2,519 pairings, honestly reduced.

   Four things happen here and only the first is a list:

     WHAT IS OFFERED   `stepOffer`'s candidates, in the price file's
                       own order, never re-sorted by price behind the
                       dealer's back.
     WHY IT IS SHORT   `readCuration` — the count, the rule that
                       narrowed it, the measured rate behind that
                       rule, a search that reaches PAST the
                       narrowing, and a switch that turns it off.
     WHAT IS NOT       the rows the narrowing left out, still on
                       screen, struck through, each carrying the
                       measurement that removed it. Sea Ray hides
                       these; McLaren swaps them silently.
     WHAT IS ON        the lines this band has already put on the
                       document, removable.
   ============================================================ */

function Shortlist({
  quote,
  step,
  still,
  shelfId,
  headRef,
  onWeigh,
}: {
  quote: QuoteDef
  step: BuildStep
  still: boolean
  /** this shelf's own section id — `Weigh` is keyed on it rather
   *  than on the band, because one band holds several shelves */
  shelfId: string
  /** the BAND's head — where Escape puts a person back. Several
   *  shelves in one band share it, which is right: Escape leaves the
   *  decision. */
  headRef: RefObject<HTMLButtonElement | null>
  onWeigh: (shelfId: string, w: Weigh | null) => void
}): ReactElement {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const [showRefused, setShowRefused] = useState(false)
  /** where the keyboard is in this shelf, and now also WHERE THE
   *  FOCUS IS — the two were separate and that was the bug. */
  const [hi, setHi] = useState(-1)
  /** where the pointer is, on POINTER MOVE rather than on pointer
   *  enter. Chromium dispatches boundary events when a scroll brings
   *  a new element under a stationary mouse, so `pointerenter` fired
   *  every time the keyboard scrolled the shelf — measured: End then
   *  Home left the price bar weighing the card the mouse happened to
   *  be resting over rather than the one the arrows had landed on.
   *  A move is a gesture; a scroll under a still hand is not. */
  const [over, setOver] = useState<number | null>(null)
  /** whether a card in THIS shelf actually holds the focus. `hi` is
   *  the roving tabindex's place and it has to survive a blur —
   *  otherwise Tab back into the shelf lands on card 0 rather than
   *  where the person left. So it cannot also be the answer to "is
   *  the keyboard here": measured before this, focusing a card and
   *  then tabbing out of the shelf, opening another band and
   *  scrolling 3,000px away all left the price bar proposing a motor
   *  that was neither focused nor on the screen. Focus-in and
   *  focus-out on the LIST, not on each card, so moving card to card
   *  is one focusout+focusin pair the list swallows rather than a
   *  frame with nothing focused. */
  const [kbdHere, setKbdHere] = useState(false)
  const shelfRef = useRef<HTMLUListElement>(null)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])

  /* ── THE DEPENDENCIES ARE WHAT `stepOffer` READS, NOT THE QUOTE ──
     `quote` is the whole document, so every open band re-solved its
     shortlist whenever anything on the quote changed — a quantity, a
     note, the tax rate. It reads five fields and a section: the hull
     (`rootTableId`, `rootRowId`), the page whose blocks the bands are
     (`viewId`), the rung every candidate is priced at (`levelKey`),
     and `lines`, for "already on the quote". Nothing else on a
     QuoteDef reaches it, which is what makes this list checkable
     rather than a guess at what matters. */
  const { rootTableId, rootRowId, viewId, levelKey, lines: onQuote } = quote
  const offer: StepOffer = useMemo(
    () => (step.subject ? NO_OFFER : stepOffer(quote, step.section, { all, query })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
    [rootTableId, rootRowId, viewId, levelKey, onQuote, step.section, step.subject, all, query],
  )
  const why: StepReason | null = useMemo(
    () => (step.subject ? null : stepReason(quote, step.section)),
    // `stepReason` reads the same hull and the same section, and no
    // line at all. THE DIRECTIVE IS THE LAST COMMENT LINE ON PURPOSE:
    // oxlint's `disable-next-line` reaches the line after it, so with
    // prose under it the suppression landed on a comment and the hook
    // went on warning. Same for `refused` below; `offer` above always
    // had it in the right place, which is why only two of three fired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rootTableId, rootRowId, viewId, step.section, step.subject],
  )

  /* THE ROWS THE NARROWING LEFT OUT, and their reasons — a SECOND
     read, run only when a person asks for it. Each row costs one
     re-run of the block's clauses to say what removed it, so this is
     not work to do behind a shut disclosure. */
  const refused: Candidate[] = useMemo(() => {
    if (!showRefused || step.subject) return []
    return stepOffer(quote, step.section, { all: true, query }).candidates.filter(
      (c) => c.outside === true,
    )
    // the same five fields of the quote `stepOffer` reads; see the
    // note on `offer`, and the placement note on `why`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRefused, rootTableId, rootRowId, viewId, levelKey, onQuote, step.section, step.subject, query])

  const searching = query.trim() !== ''

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
  /* ── THE NOTE'S FIRST SENTENCE WAS THE CHIP, WORD FOR WORD ───────
     Measured on Parts & Accessories, 1600×1000. The chip read
     "3 of 2,937 Parts & Accessories · Highfield × P/D Parts names
     which ones go with this one"; the boxed paragraph 30px under it
     read "2,934 Parts & Accessories are not offered here, because
     Highfield × P/D Parts names which ones go with this one." Same
     count, same rule, one in a control strip and one as prose. On the
     trailer band the same pair cost 15 and 36 words.

     Its SECOND sentence is not in any chip — the discontinued
     contract's "…are no longer sold, so they are not offered here.
     They are still on the sheet." — and that half is kept.
     `heldBackSentence` is the same clause from the same file
     (`sellable.ts`) that `curationNote` composes its half from, and
     `offer.heldCount` is the same number: `admitted` is
     `rows + heldCount` and `narrowed` is `rows`, so the `matched -
     offered` the reading subtracts IS `heldCount`. The only word that
     differs is "either", which was only ever correct because the
     sentence this pass deleted came before it. */
  const reading = curation
    ? { ...readCuration(curation), note: heldBackSentence(offer.heldCount, curation.name) }
    : null

  const candidates = offer.candidates

  /* WHICH FACTS EACH CARD PRINTS, decided across the whole band.
     Measured on the Northside seed: of the three facts a card
     showed for a Highfield ADV7's three Yamaha motors, TWO were the
     same string on every card — `Prop Part No. 6CE-45978-20` and
     `Prop Description PROPELLER - Saltwater T II SDS - 17"` —
     because the card took the join table's first three columns in
     whatever order the workbook carried them. Two thirds of every
     card said nothing that could help anyone choose, and the one
     fact that did differ was the longest and sat at the bottom.

     "Does this differ from the others" is not a question a card can
     answer about itself, so it is answered here, once per band, and
     each card is handed its own row. `distinguish.ts` carries the
     rule and the measurement. */
  const shownFacts = useMemo(
    () =>
      distinguishingFacts(
        candidates.map((c) =>
          /* THE SLOT IS LEFT OUT HERE AND NOWHERE ELSE. It varies
             across a shelf for the same reason a row number varies,
             so the rule below would keep it and it would take a
             third of every card to say "Slot 9". It is the pair's
             identity and the printed quote still needs it. */
          (c.line.pairFacts ?? []).filter((f) => f.label !== PAIR_SLOT_LABEL),
        ),
      ),
    [candidates],
  )

  useEffect(() => {
    setHi(-1)
  }, [query, all])

  /* THE HIGHLIGHT IS SCROLLED TO ON A PICK AS WELL AS ON A MOVE.
     Measured: taking a row mounts the `.qb-picked` list ABOVE the
     shelf and pushes every card down by the height of one line, so
     the card a person had just pressed slid out from under the
     pointer that pressed it. `step.lines.length` is the count that
     changes when that happens. */
  useEffect(() => {
    if (hi < 0) return
    const el = shelfRef.current?.children[hi]
    /* NO `behavior: 'smooth'` — keyboard-initiated, so it lands on the
       same frame as the keypress. The motion budget's one absolute. */
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' })
  }, [hi, step.lines.length])

  /* ── WHAT MOVING TO A CHOICE SAYS, BEFORE IT IS TAKEN ────────────
     The pointer outranks the keyboard: a hand on the mouse is the
     thing a person is looking at. Published upward rather than drawn
     here, because the number it changes is on the price bar and a
     preview drawn beside the card would be a second running total.

     THE KEYBOARD ONLY ANSWERS WHILE IT IS HERE. `kbdHere`, not `hi` —
     see the note where it is declared. */
  const weighed = over ?? (kbdHere && hi >= 0 ? hi : null)
  useEffect(() => {
    const c = weighed === null ? undefined : candidates[weighed]
    onWeigh(
      shelfId,
      c === undefined ? null : { shelfId, ...weighPick(quote, c.line, c.alreadyLineId) },
    )
    return () => onWeigh(shelfId, null)
  }, [weighed, candidates, quote, shelfId, onWeigh])

  const take = useCallback(
    (c: Candidate) => {
      if (c.alreadyLineId !== undefined) removeLine(quote.id, c.alreadyLineId)
      else addLine(quote.id, step.section.blockId, c.line)
    },
    [quote.id, step.section.blockId],
  )

  /** Move the keyboard's place AND the focus together. They were two
   *  things and it was the bug: `hi` drew a ring on one card while
   *  the browser's focus sat on another, so Enter took the lit one
   *  and Space took the focused one. Now there is one place.
   *
   *  `preventScroll`, then one explicit `scrollIntoView({ block:
   *  'nearest' })` in the effect above — otherwise focus scrolls the
   *  card to the middle and the effect scrolls it back. */
  const land = useCallback((n: number): void => {
    setHi(n)
    /* THE LAST GESTURE WINS. A hand resting on the mouse must not go
       on answering for a person who has moved to the keyboard. */
    setOver(null)
    cardRefs.current[n]?.focus({ preventScroll: true })
  }, [])

  /* THE KEYS BELONG TO THE BAND, not to the window. The deck had a
     window listener because one step was open at a time; seven open
     accordions cannot share one highlight, and a global arrow key
     that moved a list somebody was not looking at would be worse
     than no shortcut at all.

     THERE IS NO Enter BRANCH ANY MORE, and that is the fix rather
     than an omission. A card is a `<button>`: the browser fires its
     click on Enter-down and on Space-up, so a handler that also took
     a candidate was a second activation of a possibly different row.
     With focus following the highlight, both keys land on the card
     the person is looking at, through the card's own `onClick`.

     ESCAPE IS PREVENTED, WHICH IS HOW IT LEAVES THE BAND WITHOUT
     LEAVING THE PAGE. `stageKeys.ts` rung 3 stands down for a
     keystroke that arrives `defaultPrevented`; without that the
     stage's own Escape closes the whole quote, which is what it did
     — measured, one press from inside a shelf and the configurator
     was gone. A second press, now on the head, closes the page as it
     always has. */
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
    const target = e.target
    const inShelf =
      target instanceof Node && shelfRef.current !== null && shelfRef.current.contains(target)

    if (e.key === 'Escape') {
      /* A FIELD OWNS ITS ESCAPE WHILE IT HOLDS SOMETHING TO CLEAR —
         `stageKeys.ts` rung 2 says so in as many words, and a search
         typed past a narrowing is the thing a person most wants back
         one keystroke at a time. */
      if (!inShelf && query !== '') {
        e.preventDefault()
        setQuery('')
        return
      }
      e.preventDefault()
      setHi(-1)
      headRef.current?.focus()
      return
    }

    if (candidates.length === 0) return

    if (!inShelf) {
      /* The search box hands the shelf over on ArrowDown and keeps
         every other key: Home and End are the caret's in a text
         field, and taking them would be a shortcut that breaks
         typing. It lands where the keyboard last was, not at the
         top — a person who arrowed to the sixth motor, corrected a
         letter of the search and came back meant the sixth motor. */
      if (e.key !== 'ArrowDown') return
      e.preventDefault()
      land(hi < 0 ? 0 : Math.min(hi, candidates.length - 1))
      return
    }

    if (e.key === 'Home') {
      e.preventDefault()
      land(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      land(candidates.length - 1)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const next = hi + (e.key === 'ArrowDown' ? 1 : -1)
    land(next < 0 ? candidates.length - 1 : next >= candidates.length ? 0 : next)
  }

  const held =
    offer.historic === 'table'
      ? retiredTableSentence(why?.tableName ?? step.title)
      : offer.historic === 'pairs'
        ? retiredPairsSentence(why?.tableName ?? step.title, 'The list it was picked from')
        : undefined

  const notOffered = offer.pool - offer.admitted

  /* ── ONE DOOR PAST THE NARROWING, NOT TWO ────────────────────────
     When a band offers nothing, the empty state draws a door whose
     label carries the count — "Show all 73 NSM Custom Trailers". Two
     inches above it `CurationNote` was drawing its generic "Show
     everything", which is the SAME act with a vaguer label: one press
     of either sets `all`. Two controls doing one thing 60px apart is
     the owner's "uniformity" complaint written as markup.

     So exactly where the door is drawn, the switch stands down — and
     nowhere else. The moment `all` is on, `door` is false again and
     the switch is back, because turning the narrowing off has to be
     undoable from the same place it was turned off.

     AND THE DOOR CAN NEVER BE DRAWN WITHOUT THE CHIP ABOVE IT, which
     is the invariant that makes deleting the empty state's sentence
     safe. `stepReason` returns null — no chip — on exactly four
     conditions: the subject block, a missing root, a missing target
     table, a missing view. `stepOffer` returns `EMPTY_STEP_OFFER` on
     the same four, and that carries `catalogue: 0`, which is the one
     thing `door` requires to be non-zero. A band with no explanation
     therefore always takes the sentence branch instead. */
  const door = candidates.length === 0 && !searching && !all && offer.catalogue > 0

  /* ── THE KEYS ARE CAUGHT WHERE THEY BUBBLE TO ────────────────────
     This `<div>` takes no focus and carries no role because it is not
     a widget: `onKeyDown` only reads keystrokes on their way up from
     the three things that ARE focusable inside it — the search box
     (`CurationNote` owns it), the shelf's one tab stop, and whatever
     the band head handed over. Giving the wrapper a role to quiet the
     rule would be a claim about an element that draws nothing.

     THE DIRECTIVE MOVED ONE LINE DOWN, which is the whole of the fix.
     It sat above `return (`, so it suppressed the return statement's
     line and nothing else; oxlint anchors this diagnostic on the
     `<div>`, one line further on, and went on reporting it. */
  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div onKeyDown={onKeyDown}>
      {reading ? (
        <CurationNote
          reading={reading}
          tone="block"
          showingAll={all}
          onShowAll={door ? undefined : setAll}
          refusal={held}
          search={{
            value: query,
            onChange: setQuery,
            label: `Find a ${step.title} by name, past the narrowing`,
            placeholder: `Find a ${step.title}…`,
          }}
        />
      ) : null}

      {step.lines.length > 0 ? (
        <ul className="qb-picked" aria-label={`On the quote from ${step.title}`}>
          {step.lines.map((line) => (
            <PickedLine key={line.id} quoteId={quote.id} line={line} removable />
          ))}
        </ul>
      ) : null}

      {candidates.length > 0 ? (
        /* ONE TAB STOP, NOT THIRTY. The shelf is a composite: Tab
           reaches it, the arrows move inside it, Tab leaves it. Every
           card carried `tabindex=0` before, so walking past a motor
           band on the way to the customer box was nine presses and
           past a rigging band was ten.

           AND NOW IT SAYS SO TO SOMETHING OTHER THAN A SIGHTED MOUSE.
           The paragraph above was true of the keyboard and inaudible
           to everything else: a `<ul>` with no role and no tabindex is
           a plain list, so the arrow model was a house rule no
           assistive technology was told about, and `onFocus`/`onBlur`
           on it was oxlint's `no-noninteractive-element-interactions`.

           `listbox` IS THE PATTERN, and it is checkable rather than a
           pick between two that sound close. The APG's grid wants two
           axes and rows to move between; the cards are one flat
           sequence — ArrowDown, ArrowUp, Home, End and nothing else in
           `onKeyDown` — and the DOM has no rows to be a grid's rows:
           `.qb-shelf` is `grid-template-columns: auto-fill`, so the
           column count is the viewport's answer (build.css:742), not a
           structure anything could name.

           MULTI-SELECTABLE, because a band holds more than one line —
           `step.lines` is a list and `take` toggles — so selection does
           NOT follow focus: the arrows move the place, Enter and Space
           change the selection. That is the APG's multi-select
           listbox, and `land` already implemented its focus half as a
           roving tabindex, which the APG names as the alternative to
           `aria-activedescendant`. There is therefore no
           active-descendant to add; adding one beside real focus would
           be the two-places bug `land` exists to have ended.

           THE ONE SUPPRESSION IS A CONFIG GAP, NOT A CONCESSION.
           `no-noninteractive-element-to-interactive-role` fires on
           `<ul role="listbox">`, and `<ul role="listbox">` is what the
           APG's own listbox examples are made of — ARIA in HTML lists
           `listbox` among the roles a `<ul>` may take, and
           eslint-plugin-jsx-a11y's shared `recommended` config allows
           exactly `ul: ['listbox', 'menu', 'menubar', 'radiogroup',
           'tablist', 'tree', 'treegrid']`. Those allowances live in
           the shared config, not in the rule's own defaults, so a
           linter running the rule bare flags the blessed markup. The
           fix belongs in `.oxlintrc.json` beside the `ignoreNonDOM`
           note it already carries for `jsx-a11y/aria-role`; this file
           does not own that file, so the exemption is written here
           instead of the `<ul>` being turned into a `<div>` to dodge a
           rule that is wrong about it.

           NOT VERIFIED: how NVDA or VoiceOver actually announce this
           shelf. No screen reader was run here. What is verified is
           the markup — role, selection state, one tab stop, focus on
           the option that Enter will take. */
        <ul
          className="qb-shelf"
          ref={shelfRef}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- see above: jsx-a11y ships ul->listbox as allowed
          role="listbox"
          aria-multiselectable="true"
          aria-label={`Offered from ${step.title}`}
          onFocus={() => setKbdHere(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setKbdHere(false)
          }}
        >
          {/* ── THE KEY IS THE ROW, NOT THE MINTED LINE ─────────────
              `stepOffer` calls `mintLine` for every candidate on
              every run and `mintLine` calls `newId()`, so `line.id`
              is a different string each time the memo recomputes —
              which is on every pick, every keystroke of the search
              and every press of the switch. Keyed on it, React
              unmounted and rebuilt all nine cards on each of those:
              measured, the focus was on the floor after every Enter
              (so the next Enter did nothing and Escape left the whole
              page), and `ds-rise` replayed its entrance on the whole
              shelf because every card was newly mounted.

              THE OFFER NOW CARRIES THAT KEY ITSELF. This computed
              `pairRowId ?? rowId` off the minted line; `stepOffer`
              publishes the same string as `Candidate.key`, which is
              also what `onQuote` is keyed on, so the two surfaces that
              were still keyed on the minted id could be fixed without
              a third copy of the reasoning. */}
          {candidates.map((c, i) => (
            /* `role="none"` — A LISTBOX MAY OWN ONLY `option` AND
               `group`, and a `<ul>` may contain only `<li>`. The slot
               stays for the grid's sizing (build.css:749) and leaves
               the accessibility tree, which makes the buttons inside
               it the listbox's own options — and is what lets the
               browser count posinset/setsize instead of this file
               counting cards by hand. */
            <li key={c.key} className="qb-shelf-slot" role="none">
              <OfferCard
                candidate={c}
                index={i}
                facts={shownFacts[i] ?? []}
                still={still}
                lit={i === hi}
                tabbable={i === (hi < 0 ? 0 : hi)}
                cardRef={(el) => {
                  cardRefs.current[i] = el
                }}
                onOver={() => setOver((n) => (n === i ? n : i))}
                onLeave={() => setOver((n) => (n === i ? null : n))}
                onFocus={() => setHi(i)}
                onPick={() => {
                  setHi(i)
                  take(c)
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
          door={door}
          onSeeAll={() => {
            setQuery('')
            setAll(true)
          }}
        />
      )}

      {offer.capped ? (
        <p className="qb-note">
          The first {OFFER_CAP} of {offer.matched} are drawn. Type a word above to reach the rest.
        </p>
      ) : null}

      {/* ── NEVER HIDE, AND NEVER SAY IT TWICE ────────────────────
          `422 of 434` is not a number to be embarrassed by; it is the
          number a dealer quotes down the phone. The count is always
          said, the rule that produced it is named on the chip above,
          and every one of those rows is one press away with the
          measurement that removed it written on it.

          IT IS DRAWN ONLY WHERE THERE IS A SHORTLIST TO CONTRAST IT
          WITH. Measured on the trailer band: with nothing offered,
          "NOT OFFERED 73" sat under a door reading "Show all 73 NSM
          Custom Trailers" — the same 73 rows, reached two ways, one
          of them a fourth statement of a fact the chip had already
          made. Where the shortlist is empty the door IS this control,
          and it lands those rows as pickable cards each carrying the
          same `outsideWhy` this list would have shown. */}
      {!all && notOffered > 0 && candidates.length > 0 ? (
        <div className="qb-refused">
          {/* A GROUP CAPTION WITH ITS SHARE, AND THE ACT BESIDE IT.
              It was one button wearing a `mono-label` — the caption, the
              count and a caret drawn by hand, the fourth self-drawn
              uppercase treatment on this screen. SectionHead is the one
              uppercase style, and "Not offered" is exactly what it is
              for: a group caption this application wrote, never a name
              off the dealer's file.

              THE SHARE, NOT THE BARE COUNT. §3 heads a group with the
              name and its share and §5 says why the big half is not
              something to be shy about: "422 of 434 is not a failure to
              be embarrassed by. It is the number a dealer quotes down
              the phone." The denominator is `offer.pool`, the same
              figure the curation chip above divides by, so the two
              lines cannot disagree. It goes in the count slot, which is
              drawn as a value — tabular, not uppercased (rule 3).

              `level="none"`: this band's h2 and, where the band holds
              several tables, an h3 are the outline; a caption on a
              disclosure inside them is not a heading in it. */}
          <SectionHead
            level="none"
            count={`${notOffered.toLocaleString()} of ${offer.pool.toLocaleString()}`}
            rule
            action={
              <Button
                tone="ghost"
                size="sm"
                aria-expanded={showRefused}
                onClick={() => setShowRefused((v) => !v)}
              >
                {showRefused ? 'Hide them' : 'Show them'}
              </Button>
            }
          >
            Not offered
          </SectionHead>

          {showRefused ? (
            <ul className="qb-refused-list">
              {/* THE OFFER'S OWN KEY, for the reason the shelf above
                  already keeps: `c.line.id` is minted fresh on every
                  `stepOffer` run. Measured with eight rows open on the
                  Yamaha band — putting a motor on the quote left 8 rows
                  and 0 of the tagged originals. */}
              {refused.slice(0, REFUSED_SHOWN).map((c) => (
                <RefusedRow key={c.key} candidate={c} />
              ))}
              {refused.length === 0 ? (
                <li className="qb-refused-none">
                  Every row this narrowing left out is already on screen above.
                </li>
              ) : null}
              {notOffered > REFUSED_SHOWN ? (
                <li className="qb-refused-none">
                  {REFUSED_SHOWN} of {notOffered.toLocaleString()} are drawn. The search above
                  reaches every one of them.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ============================================================
   ONE ROW THE RULE LEFT OUT — struck through, priced, and saying
   what measured it out.

   `.s-refused` is the state ds.css ships for exactly this: a
   `--danger` rail, the reason at `--fg-secondary`, and the FIGURE
   struck rather than hidden. A dealer needs to see that the option
   exists and what it would have cost — Polestar's move, the best
   precondition copy in the corpus, and the opposite of Ford's four
   dedicated disabled tokens.

   `aria-disabled`, never `disabled` — the intent, and for four months
   it did nothing. This row is an `<li>`, whose implicit role is
   `listitem`, and **`listitem` does not support `aria-disabled`**. The
   attribute was ignored by every assistive technology that read it, and
   the claim above it about tab order was wrong twice over: an `<li>` is
   not focusable, so the row was never in the tab order to keep a place
   in. oxlint found it the first time it was ever run here
   (`jsx-a11y/role-supports-aria-props`).

   What that cost is the whole differentiator. A refused row reached a
   screen reader as a name and a price — indistinguishable from one you
   can buy — and `outsideWhy` is OPTIONAL (`freeze.ts:587`, and
   `:1149` omits the key when the reason is empty), so there was not
   even reliably a sentence to give it away.

   So the state goes where it cannot be ignored: into the row's own
   words. The flag is the first thing read, before the name, because
   "Not offered — Yamaha F70" is a different sentence from "Yamaha F70,
   not offered" when you are hearing it rather than seeing the strike.
   Sighted readers keep exactly what they had: `.s-refused` draws the
   rail and the strike-through, and nothing in any stylesheet keyed on
   the attribute that has gone.
   ============================================================ */

function RefusedRow({ candidate }: { candidate: Candidate }): ReactElement {
  const line = candidate.line
  return (
    /* THE ROW IS A ROW. `.qb-ref-row` drew its own grid, ground, padding
       and radius, and set the name and the figure at two hand-picked
       steps to match the card's; Row draws the line and sets the name
       at the step §2 calls "the thing you scan for". What stays on the
       <li> is `.s-refused` — the STATE ds.css ships for exactly this,
       a --danger rail with the figure struck rather than hidden — and
       it reaches the figure through the same `.s-figure` it always
       did, now inside the row's trail. */
    <li className="s-refused">
      <Row
        name={
          <>
            <span className="qb-ref-flag">Not offered — </span>
            {line.label}
          </>
        }
        /* THE SUB-LINE IS DRAWN WHETHER OR NOT THERE IS A SENTENCE.
           §3: "Every row reserves its 16px second line whether or not
           it has a reason. A short reason must not collapse the row and
           a long one must not shift the row below it." `outsideWhy` is
           optional (`freeze.ts:587`), so an absent meta would give this
           list two row heights and make a row GROW the moment its
           reason arrived — §6: "the state and its sentence land in the
           same frame". Row draws its meta only when given one, so the
           reservation is the one local rule kept: `.qb-ref-why`, a
           block with a one-line floor, wearing ds.css's `.s-say`. */
        meta={<span className="qb-ref-why s-say">{candidate.outsideWhy ?? ''}</span>}
        trail={
          <span className="qb-ref-fig s-figure">
            {line.unitPrice === null ? (
              <span className="qb-nil">not priced here</span>
            ) : (
              money(line.unitPrice)
            )}
          </span>
        }
      />
    </li>
  )
}

/* ============================================================
   §THE PRICE — always on screen, and it does not move.

   It is a SIBLING of the scrollport rather than a sticky child, for
   the reason quote.css records at length: a sticky box is floored by
   its scroll container's content box, so it ends up painted across
   the middle of its own document.

   AND IT IS FULL BLEED, WHICH ANSWERS A WIDTH PROBLEM RATHER THAN
   ESCAPING IT. The bar this screen used to borrow was the draft
   sheet's, and that sheet ends an 880px document — an 880px strip
   under a page running to `--measure` (2,074px on the window these
   counts were taken at) reads as a widget somebody left in the
   middle. The responsive pass answered that by giving the borrowed
   bar the page's own width, under a second class so neither
   stylesheet re-declared the other's rules. This bar is not
   borrowed and spans the stage, so the question does not arise and
   there is one class to carry it.

   WHAT STILL APPLIES IS THE FIGURE. The total takes the app's
   largest number step, which ramps 22px → 30px: a wide window gets
   a proportionally larger total rather than a total adrift in a
   wider bar, tracking negative because the size grew — rule 7.
   build.css carries the ramp and `RunningTotal` only draws it.

   THE FIGURE DOES NOT COUNT UP. Every configurator in the research
   agrees, including both that show a price: Porsche's total simply
   becomes the new number and Polestar's carries no transition at
   all. Motion on money reads as a slot machine. Only the delta chip
   beside it moves, and it clears itself.

   THE TAX LINE IS TWO WORDS WHERE THE FILE STATES NO RATE. There is
   no tax-rate column anywhere in the seeded data and the document's
   own clause is "inclusive of tax unless otherwise stated"; an
   ex-tax figure appears only where a person typed a rate, and then
   it names the rate it used. No 1.1 divisor, ever.
   ============================================================ */

/* ============================================================
   A REFUSAL'S FACT AND ITS CONSEQUENCE ARE TWO SENTENCES, and only
   the first belongs on a strip that is on screen for as long as
   somebody is building.

   WHAT WAS THERE, measured at 1600×1000 on a fresh quote: 30 words
   of the 205 on the whole screen, permanently —

     "This quote is addressed to nobody. Type the customer name at
      the top — giving it to them freezes the document, so a name
      left out now cannot be added afterwards."

   Three things in one strip: a fact, an instruction, and a rule
   about issuing. The fact belongs here, beside the button it
   refuses. The instruction is now a DOOR (`onAddress`) instead of
   a direction, which also settles that it was pointing at the
   wrong end of the screen. And the rule about issuing is printed
   by `CustomerField` against the box itself, and by the ledger
   under the total, which now lists every blocker in full.

   THE SENTENCE ITSELF HAS SINCE BEEN CUT AT THE SOURCE. `totals.ts`
   now pushes "This quote is addressed to nobody. It cannot be given
   to a customer until it has a name" — the wrong direction gone, and
   the freeze clause left to `NO_CUSTOMER_WHY`, which is drawn
   against the box. `refusalFact` still splits it in the same place
   and the strip still reads the same six words.

   THE SPLIT is the first full stop followed by a capital, and all
   four of `issueBlockers`' sentences have that shape — run against
   the real strings: "…addressed to nobody. It…", "…to offer.
   Add…", "…as no charge. Price…", "…beside it. Open…", including
   the four-clause plural form and the one that opens with a 21-word
   rigging-kit name. A head of three words or fewer is not a fact,
   so the whole sentence is kept rather than a fragment of one, and
   that is what catches a label like "2.5 Mtr. Blue".

   WHERE IT WOULD STILL BE WRONG: a line label carrying a full stop
   MID-label with a capital after it and more than three words
   before it. Nothing in the seed does, and the cost if one did is a
   short strip rather than a wrong one — the whole sentence is
   printed in the ledger under the total either way.
   ============================================================ */
function refusalFact(say: string): string {
  const at = say.search(/\.\s+[A-Z]/)
  if (at < 0) return say
  const head = say.slice(0, at + 1)
  return head.split(/\s+/).length <= 3 ? say : head
}

function PriceBar({
  quote,
  steps,
  totals,
  delta,
  weighing,
  refusals,
  levels,
  onLevel,
  onGo,
  onIssue,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  totals: ReturnType<typeof quoteTotals>
  delta: TotalDelta | null
  /** the choice under the pointer or the keyboard, and what it would
   *  do — never what the document carries */
  weighing: Weigh | null
  refusals: readonly string[]
  levels: ReturnType<typeof quoteLevelChoices>
  onLevel: (key: string, label: string, quiet: boolean) => void
  /** move to another moment of the flow — Address is the only one
   *  this screen can reach; see flow.tsx for why Choose is not. */
  onGo: (to: FlowStop) => void
  onIssue: () => void
}): ReactElement {
  const [ledger, setLedger] = useState(false)
  const named = quote.customer.name.trim()

  /* ── THE REFUSAL IS ON THE CONTROL, AND THE STRIP IS GONE ───────
     Two surfaces carried the reasons a quote could not go out: an
     amber strip above the bar for every refusal but the first, and a
     `title` tooltip on the handover for the first. The strip was 36px
     of its own rule, mark, fact and a hand-drawn "N more" button.

     Button's contract is rule 10 exactly: `refusedBecause` refuses
     the control — click blocked, `aria-disabled`, still in the tab
     order — and draws the reason BENEATH it, where the refusal is.
     There is no way to refuse a Button without saying why, so the
     first reason's fact now sits under the handover on every screen
     that cannot hand over, and the strip that said the same thing a
     bar's width away is deleted with its four rules.

     THE COST, STATED: on an unaddressed draft the fact under the
     button — "This quote is addressed to nobody." — and the flow
     line's `Address  nobody yet` sixteen pixels above it are one
     fact twice. The earlier pass deleted that duplicate; this one
     restores it, because a refused control that says nothing beside
     itself is the thing rule 10 names, and a primitive that enforces
     the rule is worth more than the 18px. The flow stop is still the
     DOOR; the sentence under the button is the refusal.

     `refusalFact` keeps the head of the sentence (see above) — the
     whole of it is on the `title` and in the ledger, and a second
     reason is a door onto the ledger rather than a number to hunt. */

  return (
    <FlowFoot
      line={
        <FlowLine
          at="configure"
          /* CONFIGURE CARRIES NO FACT, and that is the argument in
             flow.tsx made concrete: the bands above and the figure
             40px below are already saying what is on the rig, and a
             count of decided stops here would be the "step 5 of 8"
             plate this screen deleted with the deck it came on. */
          facts={{ choose: quote.subjectLabel, address: named === '' ? 'nobody yet' : named }}
          reach={['address']}
          onGo={onGo}
        />
      }
    >
      {ledger ? (
        <Ledger quote={quote} steps={steps} totals={totals} refusals={refusals} />
      ) : null}

      <div className="qb-price-bar">
        {/* THE SAME OBJECT THE PICKER AND THE SHEET DRAW. It is the
            one that was measured — this bar's own — so the other two
            mount it rather than resembling it. See flow.tsx. */}
        <RunningTotal
          label="Total"
          amount={totals.total}
          sub={
            totals.totalExcludingTax === null
              ? 'incl. tax'
              : `${money(totals.totalExcludingTax)} ex · ${totals.taxRate}%`
          }
          open={ledger}
          onToggle={() => setLedger((v) => !v)}
        />

        {/* ── ONE SLOT, AND THE REPORT GOES FIRST ───────────────────
            The committed figure to the left DOES NOT MOVE while
            either of these is up — the same rule the conflict sheet
            keeps, and the difference between a sheet a person decides
            and a notification they acknowledge.

            THE PROPOSAL TOOK THE DELTA'S PLACE AND THE PLACE NEVER
            CAME BACK. The proposal was tested first, and after a
            click the pointer is still on the card that was clicked —
            so `weighing` is never null on the frame the pick lands,
            the delta branch is unreachable in the whole ordinary
            mouse flow, and the report of what a pick DID could not
            draw. This file's own argument for adding no UNDO toast on
            "put on" rests on that report. So it goes first now, for
            the 2.6s it lives, and the proposal resumes under it:
            measured on the SP760ST, hovering the second Yamaha reads
            WOULD BE $173,041 +$29,460, clicking it and moving the
            mouse away reads +$29,460 against a committed $173,041,
            and 2.6s later the proposal comes back as the reverse.
            Two signed figures side by side with only one of them
            about the future is a person reading the wrong one aloud;
            two in sequence, one costumed as a pill saying WOULD BE,
            is not.

            NO `role="status"` ON THE PROPOSAL. It tracks a pointer
            and an arrow key, so a walk down a shelf queues one polite
            announcement per keystroke behind the card label the
            person is actually listening to — and that label already
            carries the name and the price. The report keeps its own — it is the one thing
            on this screen nothing else says. */}
        <span className="qb-weigh-slot">
          {delta !== null ? (
            /* KEYED ON THE STAMP — see `useTotalDelta`. Without it a
               second pick inside the chip's 2.6s life reuses this node
               and inherits the first report's fade-out. */
            <span
              key={delta.at}
              className={`qb-delta${delta.amount < 0 ? ' is-down' : ''}`}
              role="status"
            >
              {deltaSay(delta.amount)}
            </span>
          ) : weighing !== null ? (
            <span className="qb-weigh">
              <span className="qb-weigh-lab mono-label">Would be</span>
              <span className="qb-weigh-fig">{money(weighing.would)}</span>
              {weighing.delta === null ? (
                <span className="qb-nil">no price on it</span>
              ) : (
                <span className={`qb-weigh-delta${weighing.delta < 0 ? ' is-down' : ''}`}>
                  {deltaSay(weighing.delta)}
                </span>
              )}
            </span>
          ) : null}
        </span>

        {totals.unpricedCount > 0 ? (
          <span className="qb-price-unpriced">{totals.unpricedCount} not priced</span>
        ) : null}

        {/* THE RUNG IS A GROUP OF BUTTONS, and the one that is on is the
            one drawn with a ground: `neutral` for the rung the quote is
            priced at, `ghost` for the others. Button has no pressed
            state of its own — a toggle group is not one of its four
            tones — so the state is carried by the tone and announced
            by `aria-pressed`, which passes through. `.qb-level` and its
            four state rules are deleted; `.qb-levels` keeps the box. */}
        {levels.length > 1 ? (
          <div className="qb-levels" role="group" aria-label="Price level">
            {levels.map((l) => {
              const on = quote.levelKey === l.key
              return (
                <Button
                  key={l.key}
                  size="sm"
                  tone={on ? 'neutral' : 'ghost'}
                  aria-pressed={on}
                  onClick={(e) => onLevel(l.key, l.label, e.detail === 0)}
                >
                  {l.label}
                </Button>
              )
            })}
          </div>
        ) : null}

        {/* ── AND "THE WHOLE QUOTE" IS GONE FROM THIS ROW ──────────
            It was a bordered button in the corner reading "The whole
            quote", and it went to exactly where the flow line's
            Address stop goes — the same act, twice, 240px apart on
            one 113px strip. That is the pattern this file's own
            header has already deleted twice ("TWO controls doing one
            act", "ONE DOOR PAST THE NARROWING, NOT TWO"), and this
            was the third instance.

            THE STOP IS THE BETTER OF THE TWO because it is named for
            the place it goes rather than for the amount of document
            it shows, and because it is drawn beside the two stops it
            is a peer of. Nothing was lost: the sheet is one press
            away from the same bar, and it is now labelled with where
            it lands.

            THE HANDOVER STAYS, on both. It is this bar's own act
            (PHASE_TWO §2.3) and the bar is on all three screens. NOT
            `disabled`: a disabled control drops out of the tab order
            and takes its own explanation with it, so the first
            reason it cannot go is printed beside it and the rest are
            under the total.

            THE `title` STILL CARRIES THE WHOLE first sentence where
            `refusedBecause` draws `refusalFact`'s head of it — a
            tooltip has room and a bar does not. It is a supplement to
            the sentence under the button and the ledger, never the only
            statement: a hover is not a place a refusal may hide.

            THE PRIMARY TONE, ONCE. Rule 5 gives a screen about four
            accents; this is the one act the bar exists for, and `lg`
            because it is the last thing pressed on a quote. The ghost
            "N more" beside it is the door onto the rest of the reasons
            and takes no ground of its own. `.qb-give` stays declared in
            build.css because QuoteEditor still wears it; nothing here
            does. */}
        <span className="qb-price-acts">
          {refusals.length > 1 ? (
            <Button tone="ghost" size="sm" onClick={() => setLedger(true)}>
              {refusals.length - 1} more
            </Button>
          ) : null}
          <Button
            tone="primary"
            size="lg"
            refusedBecause={refusals.length > 0 ? refusalFact(refusals[0]) : undefined}
            title={refusals.length > 0 ? refusals[0] : undefined}
            onClick={onIssue}
          >
            Give it to the customer
          </Button>
        </span>
      </div>
    </FlowFoot>
  )
}

/* ============================================================
   THE LEDGER — a total that opens onto its own arithmetic.

   A running total is a CLAIM, and a bar that makes one and offers
   no way to check it is asking a salesperson to read $88,715 to a
   customer on trust. This opens onto every band, every line, what
   each cost and what it was priced at — the same frozen figures the
   printed document carries, summed by the same `quoteTotals`.

   Nothing is invented. A line with no price says so and is never
   rendered as 0. Tax appears ONLY when a person typed a rate.
   ============================================================ */

function Ledger({
  quote,
  steps,
  totals,
  refusals,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  totals: ReturnType<typeof quoteTotals>
  refusals: readonly string[]
}): ReactElement {
  const loose = looseLines(quote)

  return (
    <div className="qb-ledger">
      <ul className="qb-led">
        {steps.map((s) => (
          <li key={s.id} className="qb-led-group">
            <p className="qb-led-head">
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
            </p>
            {s.lines.length > 0 ? (
              <ul className="qb-led-lines">
                {s.lines.map((line, i) => (
                  <LedgerLine key={line.id} line={line} index={i} />
                ))}
              </ul>
            ) : null}
          </li>
        ))}

        {/* A TYPED LINE BELONGS TO NO BAND and would otherwise be
            summed into the total with nothing on screen for it. */}
        {loose.length > 0 ? (
          <li className="qb-led-group">
            <p className="qb-led-head">
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

      {/* THE SUMS ARE A CARD — flat, because the ledger they sit in is
          already one step below the bar and a second shadow there is
          noise. `.qb-sums` keeps only its column. */}
      <Card tone="flat" pad="md">
      <dl className="qb-sums">
        <div className="qb-sum">
          <dt className="qb-sum-lab">The package</dt>
          <dd className="qb-sum-fig">{money(totals.packageTotal)}</dd>
        </div>
        {quote.adjustments.length > 0 ? (
          <div className="qb-sum">
            <dt className="qb-sum-lab">Adjustments</dt>
            <dd className="qb-sum-fig">{money(totals.adjustmentsTotal)}</dd>
          </div>
        ) : null}
        {totals.taxRate === null ? (
          <div className="qb-sum">
            <dt className="qb-sum-lab">
              Tax
              <span className="qb-sum-note">no rate typed on this quote</span>
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
      </Card>

      {totals.unpricedCount > 0 ? (
        <p className="qb-ledger-say">
          {totals.unpricedCount === 1
            ? 'One line carries no price at all. It is on the document and it is not in the figure above — a blank is never summed as nothing.'
            : `${totals.unpricedCount} lines carry no price at all. They are on the document and they are not in the figure above — a blank is never summed as nothing.`}
        </p>
      ) : null}

      {/* EVERY reason it may not go out, IN FULL — and that is the
          change: this listed `slice(1)`, because the bar above was
          printing the first one whole. The bar now prints the first
          SENTENCE of the first one, so the rest of it has to be
          recoverable, and the natural place is the same disclosure
          that already carries the arithmetic. A person who fixes the
          reason on the bar and is refused for a second nobody
          mentioned has been told half the truth. */}
      {refusals.length > 0 ? (
        <div className="qb-ledger-whys" role="status">
          {refusals.map((w) => (
            <p key={w} className="qb-ledger-why">
              {w}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** One line in the breakdown. `ds-rise` fires on MOUNT and on nothing
 *  else, so the row that just arrived is the row that moves.
 *
 *  A DENSE ROW. It was a four-column grid of its own, and two of the
 *  four columns — the quantity and the price column's name — were
 *  `nowrap` under a mask fade, which is a mid-word cut with a soft
 *  edge and the thing §3 forbids. The quantity is now part of the
 *  name ("2 × Fuel Tank", which is how a ledger line reads aloud),
 *  the column name is the row's meta and wraps, and the amount is the
 *  trail. `.qb-led-row`, `.qb-led-name` and the masked pair are gone. */
function LedgerLine({ line, index }: { line: QuoteLine; index: number }): ReactElement {
  const { amount, overridden } = lineAmount(line)
  return (
    <li className="ds-rise" style={{ ['--i' as string]: index }}>
      <Row
        dense
        name={line.qty > 1 ? `${line.qty} × ${line.label}` : line.label}
        meta={line.priceColumnName ?? undefined}
        trail={
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
        }
      />
    </li>
  )
}

/* ============================================================
   THE PRICE MOVING — derived from the ONE summation.

   A person who picks a $41,340 motor should SEE $41,340 arrive.
   It comes out of `quoteTotals` and never off the pick: two
   subtractions of one summation cannot disagree with it. It clears
   itself, so it is never a stale claim, and `null` — not 0 — is
   "nothing has moved".
   ============================================================ */
/** How long a delta chip is on screen. build.css delays its fade-out
 *  to 120ms before this, so the chip is already gone when React takes
 *  it away rather than being cut off mid-sentence. The two numbers
 *  are one number; each says so. */
const DELTA_LIFE_MS = 2600

/** What moved, and WHICH move it was. The stamp is not decoration:
 *  the chip is drawn in a slot it shares with the proposal, so React
 *  reconciles a second delta onto the same `<span>` — same class,
 *  same animation-name, no restart. A second pick inside 2.6s would
 *  then arrive part-way through the FIRST one's fade-out and vanish
 *  early. Keyed on the stamp, each report is its own element and its
 *  own animation. */
interface TotalDelta {
  amount: number
  at: number
}

function useTotalDelta(total: number): TotalDelta | null {
  const seen = useRef<number | null>(null)
  const stamp = useRef(0)
  const [delta, setDelta] = useState<TotalDelta | null>(null)

  useEffect(() => {
    const was = seen.current
    seen.current = total
    if (was === null || was === total) return
    stamp.current += 1
    setDelta({ amount: total - was, at: stamp.current })
    const t = window.setTimeout(() => setDelta(null), DELTA_LIFE_MS)
    return () => window.clearTimeout(t)
  }, [total])

  return delta
}

/* ============================================================
   NOTHING OFFERED — and it is the ACT, because the chip above is
   already the explanation.

   Production draws an empty grid here and says nothing at all. This
   box was the opposite mistake: it restated what the curation chip
   two lines above it had just said, and then offered a second
   button for the switch sitting beside that chip.

   What it drew, measured on the trailer band at 1600×1000:

     "Nothing in NSM Custom Trailers is paired with this one on the
      price file. The catalogue is still there."      20 words
     "73 … are no longer sold, so they are …"         the held line
     [Show all 73 NSM Custom Trailers]                the door

   The first is the chip in prose. The second moved into the chip's
   own note slot, and is better off there — it is drawn now whether
   the band is empty or not, where before a band offering four
   motors with nine discontinued behind them never said so at all,
   because this box only exists when the shelf is bare. The DOOR is
   what is left, and it is what the band was for.

   A SENTENCE SURVIVES IN THE THREE STATES THE CHIP CANNOT DESCRIBE:
   a search that found nothing, a table with no live stock in it,
   and the narrowing already switched off. The chip prints a count
   and a rule, and none of those three is a rule.
   ============================================================ */

function NothingOffered({
  step,
  offer,
  why,
  query,
  all,
  door,
  onSeeAll,
}: {
  step: BuildStep
  offer: StepOffer
  why: StepReason | null
  query: string
  all: boolean
  /** whether the way past the narrowing is drawn HERE. Computed in
   *  `Shortlist`, because the curation switch reads the same flag to
   *  decide whether to stand down. */
  door: boolean
  onSeeAll: () => void
}): ReactElement {
  const name = why?.tableName ?? step.title
  const searching = query.trim() !== ''

  /* The retired-table and retired-pairs sentences are NOT drawn here
     any more and nothing was lost: `Shortlist` already hands both to
     `CurationNote` as its `refusal`, where they also make the switch
     inert — measured, they were being printed twice on a historic
     table, once in the note box and once under it. */
  const say = searching
    ? `Nothing in ${name} matches “${query.trim()}”.`
    : offer.catalogue === 0
      ? `${name} has nothing in it that is still sold.`
      : all
        ? `None of the ${offer.catalogue} still sold can be offered here.`
        : ''

  /* A SUNKEN CARD — card.css: "a well: an empty slot, a drop target,
     a placeholder. It reads as recessed because it is darker than its
     ground and carries no shadow." That is the whole of what
     `.qb-none`'s dashed border, ground, radius and padding were saying
     by hand; the inner div keeps only the centring, which is the one
     thing on this screen that IS centred and the reason it is.

     THE DOOR IS A NEUTRAL BUTTON. It was outlined in the accent, a
     tone Button does not have — and the reason it was outlined rather
     than filled (three empty bands would be three accents) is the same
     reason it is `neutral` now and not `primary`. One accent on this
     screen, and it is the handover. */
  return (
    <Card tone="sunken" pad="lg">
      <div className="qb-none">
        {say === '' ? null : <p className="qb-none-say">{say}</p>}
        {door ? (
          <Button tone="neutral" onClick={onSeeAll}>
            Show all {offer.catalogue} {name}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

/* ============================================================
   ONE OFFER — a photograph, a name, what it costs, and why it is
   not on the shortlist when it is not.

   THE CARD IS A TOGGLE. It used to be `disabled` once the row was
   on the quote, which is the one state where a person is most
   likely to press it — they have just realised they picked the
   wrong motor — and a disabled control drops out of the tab order
   and takes its own explanation with it.

   AND IT IS AN `option`, WHICH IS THE SHELF'S DOING: a `listbox` owns
   `option`s, so the role goes on the element the listbox owns. ARIA in
   HTML lists `option` among the roles `<button>` may take, and the
   role does not touch the element's own activation behaviour — the
   browser still fires `click` on Enter-down and Space-up, which is
   the whole of the keyboard note in `Shortlist`.

   `aria-selected`, NOT `aria-pressed`. `aria-pressed` is supported on
   role `button` only; left on an `option` it would be exactly the dead
   attribute `aria-disabled` was on the `<li>` below — written, ignored,
   and believed for months. Nothing is lost in the swap: "on the quote"
   IS the selection this listbox exists to collect, and `option`
   requires `aria-selected` anyway.

   ── WHY THIS IS NOT A <Card>, AND WHAT Card WOULD NEED ───────────
   Card is the surface this should wear, and it cannot yet, because a
   Card is a <div> or a plain <button> and this is a listbox OPTION:
   it needs `role="option"`, `aria-selected`, a roving `tabIndex` (one
   tab stop per shelf, not thirty), a `ref` for `land()` to focus, the
   pointer-move/leave and focus handlers the price bar's proposal
   reads, a stagger index for `ds-rise`, a dashed `outside` tone and a
   `lit` (keyboard place) state that is distinct from `current`. Card
   exposes none of those and takes no className, so adopting it means
   giving up the listbox — measured before this pass: one Tab per
   shelf, with the arrows moving focus AND highlight together. That is
   §C, and it is not for sale for a stylesheet. So this card keeps its
   own rule and the report names the six things Card is missing, to be
   added once. What DID change in the conversion is the thing the
   owner saw: nothing on this card is cut mid-word by the card — the
   probe found every clipped rect on the shelf was cut by the
   scrollport's fold, which §3 permits — and the two mask fades this
   stylesheet still owned (the render caption and the ledger's column
   name) are gone.
   ============================================================ */

function OfferCard({
  candidate,
  index,
  still,
  lit,
  tabbable,
  cardRef,
  onOver,
  onLeave,
  onFocus,
  onPick,
  facts,
}: {
  candidate: Candidate
  index: number
  /* CHOSEN OVER THE WHOLE BAND, NOT BY THIS CARD. "Does this fact
     differ from the other options" is not a question one card can
     answer about itself, so the shelf answers it once and hands
     each card its own row. See `distinguish.ts`. */
  facts: readonly ShownFact[]
  still: boolean
  lit: boolean
  /** the shelf's one tab stop — see the roving note where it is set */
  tabbable: boolean
  cardRef: (el: HTMLButtonElement | null) => void
  /** on pointer MOVE, not on pointer enter — see `Shortlist` */
  onOver: () => void
  onLeave: () => void
  onFocus: () => void
  onPick: () => void
}): ReactElement {
  const line = candidate.line
  const on = candidate.alreadyLineId !== undefined

  return (
    <button
      type="button"
      className={`qb-card ds-sheen${still ? '' : ' ds-rise'}${on ? ' is-on' : ''}${
        candidate.outside ? ' is-outside' : ''
      }${lit ? ' is-lit' : ''}`}
      style={{ ['--i' as string]: index } as CSSProperties}
      ref={cardRef}
      role="option"
      tabIndex={tabbable ? 0 : -1}
      aria-selected={on}
      aria-label={
        on
          ? `Take ${line.label} back off this quote`
          : `Put ${line.label} on this quote${
              line.unitPrice === null ? '' : `, ${money(line.unitPrice)}`
            }`
      }
      onPointerMove={onOver}
      onPointerLeave={onLeave}
      onFocus={onFocus}
      onClick={onPick}
    >
      <PictureWell img={line.image} name={line.label} />
      <span className="qb-card-body">
        <span className="qb-card-top">
          {line.recommended ? (
            <span className="qb-card-star" title="The standard fit on the price file">
              <Star size={11} weight="fill" aria-hidden="true" />
              <span className="qb-card-star-word">Standard fit</span>
            </span>
          ) : null}
          {candidate.outside ? <span className="qb-card-outside">Off the shortlist</span> : null}
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
              <span
                key={f.label}
                className={`qb-card-fact${f.reduced ? ' is-reduced' : ''}`}
                /* NOTHING IS HIDDEN. When the value was reduced to
                   the segments that differ, the whole string is
                   still here for a pointer and for copy. */
                title={f.reduced ? f.full : undefined}
              >
                <span className="qb-card-fact-lab">{f.label}</span>
                <span className="qb-card-fact-val">{f.value}</span>
              </span>
            ))}
          </span>
        ) : null}

        {candidate.outsideWhy ? <span className="qb-card-why">{candidate.outsideWhy}</span> : null}

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
   are not. A picture we cannot fetch is never a broken glyph: it is
   a plate that says what it is, in the one wording `imageSources`
   settled on.
   ============================================================ */

function PictureWell({ img, name }: { img: QuoteLine['image']; name: string }): ReactElement {
  const { paint } = useImageDisplay(img?.src ?? '')
  return (
    <span className="qb-well">
      {img && paint ? (
        <FrozenPhoto img={img} fallbackAlt={name} className="qb-well-img" w={264} h={176} />
      ) : (
        <span className="qb-well-held">
          <span className="qb-well-held-word">{HELD_AS_LINK}</span>
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
  const hasMeta = facts.length > 0 || Boolean(line.sourceNote)

  /* ── A ROW, WITH ITS CONTROLS IN THE TRAIL ───────────────────────
     `.qb-line` was a five-column grid with its own border, ground and
     radius, a name at a hand-picked 13px/570, a `<label>` wrapping a
     bare `field-input` for the quantity, and a 26px icon button with
     its own three states. Row draws the line: the mark is its lead,
     the label its name, the pair facts and the source its meta, and
     the trail holds the three controls a still row may carry.

     THE QUANTITY IS A FIELD. There is no `type="number"` in Field, on
     purpose — the wheel changes a focused number field silently and
     a half-typed value reads back as "" — so this is a text control
     with `mono` and a numeric keyboard, and `setQty` still floors
     nonsense at one, exactly as it did for the number input's own
     "" → 0. What Field cannot do is put the label BESIDE the control:
     it is a labelled column, so a picked line is a little taller than
     it was. Reported as a gap rather than worked around.

     THE REMOVE IS A GHOST BUTTON wearing the glyph as its word and the
     accessible name on `aria-label`; the non-removable subject line
     simply has no button, since a trail is a flex line and needs no
     spacer to keep the amount in place. `.qb-line-drop` and its
     placeholder are deleted. */
  return (
    <li>
      <Row
        lead={
          <span className="qb-line-mark" aria-hidden="true">
            {line.recommended ? <Star size={11} weight="fill" /> : <Check size={11} weight="bold" />}
          </span>
        }
        name={line.label}
        meta={
          hasMeta ? (
            <>
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
            </>
          ) : undefined
        }
        trail={
          <>
            <span className="qb-line-qty">
              <Field
                label="Qty"
                mono
                inputMode="numeric"
                value={String(line.qty)}
                onChange={(v) => setQty(quoteId, line.id, Number(v))}
              />
            </span>
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
              <Button
                tone="ghost"
                size="sm"
                aria-label={`Take ${line.label} off this quote`}
                title="Take it off"
                onClick={() => removeLine(quoteId, line.id)}
              >
                <X size={12} weight="bold" aria-hidden="true" />
              </Button>
            ) : null}
          </>
        }
      />
    </li>
  )
}
