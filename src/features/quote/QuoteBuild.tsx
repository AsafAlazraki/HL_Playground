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

     THE PRODUCT   left, never scrolling, full height. The
                   photograph, the name at display scale, the specs
                   as hairlines. IT CHANGES WITH THE BUILD: pick a
                   motor and the render crossfades to it, 260ms,
                   opacity only. §THE PRODUCT.
     THE BANDS     right, scrolling. Accordions in a fixed order —
                   the hull, motors, trailers, what the dealer fits,
                   then the paperwork — several open at once, each
                   head carrying its kind's own hue. `bands.ts` owns
                   the order and the head's one fact.
     THE PRICE     under both, a sibling of the scrollport so no
                   line can ever pass behind it. Inclusive and
                   exclusive, the rung, and the handover. §THE PRICE.

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

   ── WHAT THIS FILE MAY NOT DO ────────────────────────────────

   It never reads the project store. The live reads it needs are
   events and they live in `freeze.ts`.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement, RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown, Check, Rows, Star, Warning, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { useActionBar } from '@/lib/actions'
import { HELD_AS_LINK, heldAsLinkNote, useImageDisplay } from '@/lib/imageSources'
import {
  heldBackSentence,
  retiredPairsSentence,
  retiredTableSentence,
} from '@/features/views/sellable'
import { SPRING, SPRING_QUICK, transitionFor, useStillness } from '@/features/views/stillness'
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
import { buildSteps, savedNote } from './steps'
import type { BuildStep } from './steps'
import { ADMIN_BAND, openByDefault, orderBands, type Band } from './bands'
import { deltaSay, levelConflict, type Conflict } from './conflict'
import { CustomerField } from './QuoteEditor'
import { FrozenPhoto } from './photo'
import type { QuoteDef, QuoteLine } from './types'
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

export interface QuoteBuildProps {
  quote: QuoteDef
  /** the stage's own "it is issued now" move */
  onIssued?: (quote: QuoteDef) => void
  /** open the customer this quote is addressed to. Absent = the link
   *  is still SAID on the paperwork band and not offered as a door. */
  onOpenCustomer?: (rowId: string) => void
  /** the door to the whole document at once — the adjustments, the
   *  contact lines, the tax rate, the re-read. */
  onOpenSheet: () => void
}

export function QuoteBuild({
  quote,
  onIssued,
  onOpenCustomer,
  onOpenSheet,
}: QuoteBuildProps): ReactElement {
  const steps = useMemo(() => buildSteps(quote), [quote])
  /* ONE STORE READ FOR THE WHOLE DOCUMENT. The hue on a band head is
     the kind of thing the band holds, read off the table rather than
     chosen by this screen — DESIGN_PRINCIPLES §1's discipline: a hue
     only ever appears on something that HAS that kind. */
  const kinds = useMemo(() => sectionKinds(quote), [quote])
  const bands = useMemo(() => orderBands(steps, kinds), [steps, kinds])
  const totals = quoteTotals(quote)
  const refusals = issueBlockers(quote)
  const { still } = useStillness()

  /* WHICH BANDS ARE OPEN, AND WHY IT SURVIVES A RELOAD. Every line
     the page has produced is already on the document, so losing this
     loses a scroll position and never a decision. `place.ts` hands
     back whatever it stored and this is where it is CHECKED: a band
     id that no longer names a band of this document is discarded
     here rather than trusted. */
  const [open, setOpen] = useState<string[]>(() => {
    const back = recallOpen(quote.id).filter(
      (id) => id === ADMIN_BAND || bands.some((b) => b.id === id),
    )
    return back.length > 0 ? back : openByDefault(bands)
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
     the customer box is in the LAST band — shut, because
     `openByDefault` opens the first band with something to decide. A
     person who read the sentence and looked up found nothing there.

     `totals.ts` owns those words and four surfaces read them, so the
     fix is not to reword the sentence: it is to give the refusal the
     act it was describing. This opens the paperwork band, brings the
     box to the middle of the scrollport and puts the caret in it.

     THE FOCUS CANNOT BE TAKEN IN THE PRESS. The band's body mounts on
     the render that follows the press, so `nameRef.current` is still
     null inside the handler. It is asked for here and taken in the
     effect below, which re-runs when `open` changes — that is the
     render the box exists on. */
  const nameRef = useRef<HTMLInputElement>(null)
  const [seekName, setSeekName] = useState(false)
  const addressTo = useCallback(() => {
    setOpen((was) => (was.includes(ADMIN_BAND) ? was : [...was, ADMIN_BAND]))
    setSeekName(true)
  }, [])
  useEffect(() => {
    if (!seekName) return
    const box = nameRef.current
    if (box === null) return
    /* NO `behavior: 'smooth'`. The caret lands on the same frame as
       the press — the motion budget's one absolute for anything a
       keystroke immediately follows. */
    box.scrollIntoView({ block: 'center' })
    box.focus()
    setSeekName(false)
  }, [seekName, open])

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
  const subjectNote = unsellableSubject(quote.rootTableId, quote.rootRowId)

  /* THE PROPOSAL ON THE TABLE, AND IT IS NOT COMMITTED. While this is
     set the price bar goes on showing the total the document actually
     carries — Porsche's rule, and the difference between a sheet a
     person decides and a notification they acknowledge. */
  const [proposal, setProposal] = useState<{ conflict: Conflict; levelKey: string } | null>(null)

  const levels = useMemo(() => quoteLevelChoices(quote.lines), [quote.lines])

  /* CHANGING THE RUNG IS THE ONE CHOICE HERE THAT CHANGES EVERY LINE
     ALREADY MADE, so it asks first — and only when there is something
     to decide. `levelConflict` returns null when nothing moves, and
     then the change simply happens. */
  const askLevel = useCallback(
    (key: string, label: string) => {
      const conflict = levelConflict(quote, key, label)
      if (conflict === null) {
        setLevel(quote.id, key)
        return
      }
      setProposal({ conflict, levelKey: key })
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
              />
            ))}

            <AdminBand
              quote={quote}
              steps={steps}
              open={open.includes(ADMIN_BAND)}
              refusals={refusals}
              nameRef={nameRef}
              onToggle={() => toggle(ADMIN_BAND)}
              onOpenCustomer={onOpenCustomer}
            />
          </div>
        </div>
      </div>

      <PriceBar
        quote={quote}
        steps={steps}
        totals={totals}
        delta={delta}
        refusals={refusals}
        levels={levels}
        onLevel={askLevel}
        onAddress={addressTo}
        onOpenSheet={onOpenSheet}
        onIssue={() => {
          if (issueQuote(quote.id)) onIssued?.(quote)
        }}
      />

      <AnimatePresence>
        {proposal ? (
          <ConflictSheet
            key={proposal.conflict.id}
            conflict={proposal.conflict}
            still={still}
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

   IT IS NOT STICKY, IT IS OUTSIDE THE SCROLL. `position: sticky`
   inside a scrollport is floored by that scrollport's content box
   and has to be told a height it cannot know. This pane is a flex
   SIBLING of the scrolling column, so it is full height by
   construction at every size, and at 1024 and below the two stack
   and the whole page scrolls instead.

   THE RENDER CROSSFADES. Two layers, opacity only, 260ms — the one
   moment on this screen that earns real motion, and the thing the
   app had none of. The plates under it are how a person goes back
   to the hull, so the picture is never a mystery.
   ============================================================ */

function ProductPane({
  quote,
  showing,
  onShow,
  still,
  subjectNote,
  saveProblem,
}: {
  quote: QuoteDef
  showing: string | null
  onShow: (id: string | null) => void
  still: boolean
  subjectNote: string
  saveProblem: string | null
}): ReactElement {
  const shot = quote.lines.find((l) => l.id === showing)
  const img = shot ? shot.image : quote.subjectImage
  const name = shot ? shot.label : quote.subjectLabel
  const plates = quote.lines.filter((l) => l.image)

  return (
    <aside className="qb-product" aria-label="What this quote is about">
      {/* THE CAPTION IS DRAWN ONLY WHEN IT IS NEWS. Measured: the
          strip under the photograph read "Highfield - SP420 (HYP)
          I-B-C" and the heading below it read the same five words.
          The test is NOT "is a line showing" — the hull is minted as
          a line too, and it is the newest photographed one on a fresh
          quote, so that test caught nothing. It is whether the name
          differs from the one the heading is about to print. The
          caption exists for the moment a person presses a plate and
          the picture becomes a motor; on the hull the heading is the
          caption, and the photograph takes the 26px back. */}
      <Render
        img={img}
        name={name}
        say={name === quote.subjectLabel ? '' : name}
        still={still}
      />

      {plates.length > 0 ? (
        <div className="qb-plates" role="group" aria-label="The photographs of this build">
          <Plate
            img={quote.subjectImage}
            name={quote.subjectLabel}
            on={showing === null}
            onPick={() => onShow(null)}
          />
          {plates.map((line) => (
            <Plate
              key={line.id}
              img={line.image}
              name={line.label}
              on={showing === line.id}
              onPick={() => onShow(line.id)}
            />
          ))}
        </div>
      ) : null}

      <div className="qb-ident">
        <p className="qb-ref mono-label">{quote.reference}</p>
        <h1 className="qb-name">{quote.subjectLabel}</h1>

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

  return (
    <div className={`qb-render${say === '' ? ' is-bare' : ''}`}>
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
            <span className="qb-render-held">
              <span className="qb-well-held-word">{HELD_AS_LINK}</span>
              {img ? <span className="qb-well-held-why">{heldAsLinkNote(img.src)}</span> : null}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
      {say === '' ? null : <p className="qb-render-say">{say}</p>}
    </div>
  )
}

/** 260ms, transform and opacity only — PHASE_TWO §4.1's own number. */
const FADE = { duration: 0.26, ease: [0.2, 0.8, 0.2, 1] } as const

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
    <button
      type="button"
      className={`qb-plate${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={`Show ${name}`}
      title={name}
      onClick={onPick}
    >
      {img && paint ? (
        <FrozenPhoto img={img} fallbackAlt={name} className="qb-plate-img" w={112} h={84} />
      ) : (
        <span className="qb-plate-mark" aria-hidden="true" />
      )}
    </button>
  )
}

/* ============================================================
   §ONE BAND — a name, one fact, and a shortlist when it is open.

   THE HEAD CARRIES ITS KIND'S HUE (`.k-band`), which is
   DESIGN_PRINCIPLES §1 as amended for this phase: a kind hue may
   carry a SURFACE. It is not decoration and it is not a palette
   this screen chose — `bands.ts` reads it off the table's own
   `kind`, so a motor band is the same colour as a motor anywhere
   else in the application, always. A figure is never a hue: the
   money on the head is ink.

   THE BODY IS A LIVE READ AND ONLY WHEN IT IS OPEN. `stepOffer`
   runs the block's rule over the whole table; doing that for seven
   shut bands on every redraw would be work nobody asked for. A shut
   band costs one frozen count.
   ============================================================ */

function BandBlock({
  quote,
  band,
  open,
  still,
  onToggle,
}: {
  quote: QuoteDef
  band: Band
  open: boolean
  still: boolean
  onToggle: () => void
}): ReactElement {
  const step = band.step
  return (
    <section className="qb-band" data-kind={band.kind}>
      <h2 className="qb-band-h">
        <button
          type="button"
          className="qb-band-head k-band"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className={`qb-band-mark${open ? ' is-open' : ''}`} aria-hidden="true">
            <CaretDown size={ICON_SIZE.tiny} weight="bold" />
          </span>
          <span className="qb-band-name">{step.title}</span>
          {band.fact === '' ? null : (
            <span className="qb-band-fact" title={band.fact}>
              {band.fact}
            </span>
          )}
          <span className="qb-band-fig">{band.amount === null ? '' : money(band.amount)}</span>
        </button>
      </h2>

      {open ? (
        <motion.div
          className="qb-band-body"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, transition: transitionFor(still, SPRING) }}
        >
          {band.subject ? (
            <ul className="qb-picked" aria-label={step.title}>
              {step.lines.map((line) => (
                <PickedLine key={line.id} quoteId={quote.id} line={line} removable={false} />
              ))}
            </ul>
          ) : (
            <Shortlist quote={quote} step={step} still={still} />
          )}
        </motion.div>
      ) : null}
    </section>
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
}: {
  quote: QuoteDef
  step: BuildStep
  still: boolean
}): ReactElement {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const [showRefused, setShowRefused] = useState(false)
  const [hi, setHi] = useState(-1)
  const shelfRef = useRef<HTMLUListElement>(null)

  const offer: StepOffer = useMemo(
    () => (step.subject ? NO_OFFER : stepOffer(quote, step.section, { all, query })),
    [quote, step, all, query],
  )
  const why: StepReason | null = useMemo(
    () => (step.subject ? null : stepReason(quote, step.section)),
    [quote, step],
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
  }, [showRefused, quote, step, query])

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
  useEffect(() => {
    setHi(-1)
  }, [query, all])

  useEffect(() => {
    if (hi < 0) return
    const el = shelfRef.current?.children[hi]
    /* NO `behavior: 'smooth'` — keyboard-initiated, so it lands on the
       same frame as the keypress. The motion budget's one absolute. */
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' })
  }, [hi])

  const take = useCallback(
    (c: Candidate) => {
      if (c.alreadyLineId !== undefined) removeLine(quote.id, c.alreadyLineId)
      else addLine(quote.id, step.section.blockId, c.line)
    },
    [quote.id, step.section.blockId],
  )

  /* THE KEYS BELONG TO THE BAND, not to the window. The deck had a
     window listener because one step was open at a time; seven open
     accordions cannot share one highlight, and a global arrow key
     that moved a list somebody was not looking at would be worse
     than no shortcut at all. */
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (candidates.length === 0) return
      e.preventDefault()
      const s = e.key === 'ArrowDown' ? 1 : -1
      setHi((n) => {
        const next = n + s
        if (next < 0) return candidates.length - 1
        if (next >= candidates.length) return 0
        return next
      })
      return
    }
    if (e.key === 'Enter' && hi >= 0) {
      const c = candidates[hi]
      if (!c) return
      e.preventDefault()
      take(c)
    }
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

  /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
  return (
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
          <button
            type="button"
            className="qb-refused-head"
            aria-expanded={showRefused}
            onClick={() => setShowRefused((v) => !v)}
          >
            <span className="mono-label qb-refused-lab">Not offered</span>
            <span className="qb-refused-count">{notOffered.toLocaleString()}</span>
            <span className={`qb-band-mark${showRefused ? ' is-open' : ''}`} aria-hidden="true">
              <CaretDown size={ICON_SIZE.tiny} weight="bold" />
            </span>
          </button>

          {showRefused ? (
            <ul className="qb-refused-list">
              {refused.slice(0, REFUSED_SHOWN).map((c) => (
                <RefusedRow key={c.line.id} candidate={c} />
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

   `aria-disabled`, never `disabled`: the row keeps its place in tab
   order and keeps its explanation with it.
   ============================================================ */

function RefusedRow({ candidate }: { candidate: Candidate }): ReactElement {
  const line = candidate.line
  return (
    <li className="qb-ref-row s-refused" aria-disabled="true">
      <span className="qb-ref-name">{line.label}</span>
      <span className="qb-ref-fig s-figure">
        {line.unitPrice === null ? <span className="qb-nil">not priced here</span> : money(line.unitPrice)}
      </span>
      {candidate.outsideWhy ? (
        <span className="qb-ref-why s-say">{candidate.outsideWhy}</span>
      ) : null}
    </li>
  )
}

/* ============================================================
   §THE PRICE — always on screen, and it does not move.

   It is a SIBLING of the scrollport rather than a sticky child, for
   the reason quote.css records at length: a sticky box is floored by
   its scroll container's content box, so it ends up painted across
   the middle of its own document.

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
  refusals,
  levels,
  onLevel,
  onAddress,
  onOpenSheet,
  onIssue,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  totals: ReturnType<typeof quoteTotals>
  delta: number | null
  refusals: readonly string[]
  levels: ReturnType<typeof quoteLevelChoices>
  onLevel: (key: string, label: string) => void
  /** open the paperwork band and put the caret in the customer box */
  onAddress: () => void
  onOpenSheet: () => void
  onIssue: () => void
}): ReactElement {
  const [ledger, setLedger] = useState(false)
  const unaddressed = quote.customer.name.trim() === ''

  return (
    <footer className="qb-price">
      {ledger ? (
        <Ledger quote={quote} steps={steps} totals={totals} refusals={refusals} />
      ) : null}

      {/* RULE 10, AND IT GETS ITS OWN LINE. The reason a quote cannot
          go out is stated beside the control it refuses — a sentence
          squeezed into the strip beside a total, a rung control and
          two buttons wrapped to four lines at 1024 and took a fifth
          of the window. Across the width it is one line at every
          size, and the control row stays a row.

          IT IS THE FACT AND THE ACT, and no longer a paragraph: see
          `refusalFact` above. The rest of the sentence is beside the
          box it is about and inside the ledger, and where a second
          reason exists the count of them is a door onto that ledger
          rather than a number a person has to go looking for. */}
      {refusals.length > 0 ? (
        <div className="qb-give-why" role="status">
          <Warning
            className="qb-give-mark"
            size={ICON_SIZE.tiny}
            weight="fill"
            aria-hidden="true"
          />
          <span className="qb-give-fact">{refusalFact(refusals[0])}</span>
          {unaddressed ? (
            <button type="button" className="qb-give-fix" onClick={onAddress}>
              Name the customer
            </button>
          ) : null}
          {refusals.length > 1 ? (
            <button type="button" className="qb-give-more" onClick={() => setLedger(true)}>
              {refusals.length - 1} more
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="qb-price-bar">
        <button
          type="button"
          className="qb-price-fig"
          aria-expanded={ledger}
          onClick={() => setLedger((v) => !v)}
        >
          <span className="qb-price-lab mono-label">Total</span>
          <span className="qb-price-now">{money(totals.total)}</span>
          <span className="qb-price-tax">
            {totals.totalExcludingTax === null
              ? 'incl. tax'
              : `${money(totals.totalExcludingTax)} ex · ${totals.taxRate}%`}
          </span>
          <span className={`qb-band-mark${ledger ? ' is-open' : ''}`} aria-hidden="true">
            <CaretDown size={ICON_SIZE.tiny} weight="bold" />
          </span>
        </button>

        {delta !== null ? (
          <span className={`qb-delta${delta < 0 ? ' is-down' : ''}`} role="status">
            {deltaSay(delta)}
          </span>
        ) : null}

        {totals.unpricedCount > 0 ? (
          <span className="qb-price-unpriced">{totals.unpricedCount} not priced</span>
        ) : null}

        {levels.length > 1 ? (
          <div className="qb-levels" role="group" aria-label="Price level">
            {levels.map((l) => (
              <button
                key={l.key}
                type="button"
                className={`qb-level${quote.levelKey === l.key ? ' is-on' : ''}`}
                aria-pressed={quote.levelKey === l.key}
                onClick={() => onLevel(l.key, l.label)}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* THE HANDOVER LIVES ON THE PRICE BAR, which is where
            PHASE_TWO §2.3 puts it and where a person's eye already
            is. NOT `disabled`: a disabled control drops out of the
            tab order and takes its own explanation with it, so the
            first reason it cannot go is printed beside it and the
            rest are under the total. */}
        <button type="button" className="qb-door" onClick={onOpenSheet}>
          <Rows size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          The whole quote
        </button>

        <button
          type="button"
          className="qb-give"
          aria-disabled={refusals.length > 0 || undefined}
          onClick={() => {
            if (refusals.length > 0) return
            onIssue()
          }}
        >
          Give it to the customer
        </button>
      </div>
    </footer>
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
 *  else, so the row that just arrived is the row that moves. */
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
   §THE CONFLICT SHEET — Porsche's shape with our reasons in it.

   The committed total on the price bar DOES NOT MOVE while this is
   open. Proposed cost and committed cost are two different numbers
   in two different places, which is the difference between a sheet
   a person decides and a notification they acknowledge.

   The arithmetic is shown rather than hidden: every line that moves,
   the column it moves from and to, every line that cannot move and
   why, and the change to the total as one signed figure.

   It scales from the control that caused it — PHASE_TWO §4.6 — at
   200ms, transform and opacity only, and `still` turns it off.
   ============================================================ */

function ConflictSheet({
  conflict,
  still,
  onAccept,
  onCancel,
}: {
  conflict: Conflict
  still: boolean
  onAccept: () => void
  onCancel: () => void
}): ReactElement {
  const okRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    okRef.current?.focus()
  }, [])

  return (
    <div className="qb-sheet-scrim" role="presentation">
      <motion.div
        className="qb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={conflict.title}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: transitionFor(still, SPRING_QUICK) }}
        exit={{ opacity: 0, scale: 0.98, transition: transitionFor(still, SPRING_QUICK) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          }
        }}
      >
        <p className="qb-sheet-title">{conflict.title}</p>

        {conflict.changed.length > 0 ? (
          <div className="qb-sheet-group">
            <p className="mono-label qb-sheet-cap">What changes</p>
            <ul className="qb-sheet-rows">
              {conflict.changed.map((row) => (
                <li key={row.lineId} className="qb-sheet-row">
                  <span className="qb-sheet-name">{row.label}</span>
                  <span className="qb-sheet-move">
                    <span className="qb-sheet-from">
                      {row.from === null ? '—' : money(row.from)}
                    </span>
                    <span className="qb-sheet-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="qb-sheet-to">{row.to === null ? '—' : money(row.to)}</span>
                  </span>
                  <span className="qb-sheet-why">{row.toColumn}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {conflict.held.length > 0 ? (
          <div className="qb-sheet-group">
            <p className="mono-label qb-sheet-cap">What stays as it is</p>
            <ul className="qb-sheet-rows">
              {conflict.held.map((row) => (
                <li key={row.lineId} className="qb-sheet-row s-held">
                  <span className="qb-sheet-name">{row.label}</span>
                  <span className="qb-sheet-move">
                    <span className="qb-sheet-to">{row.to === null ? '—' : money(row.to)}</span>
                  </span>
                  <span className="qb-sheet-why s-say">{row.why}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="qb-sheet-foot">
          <p className="qb-sheet-delta">
            <span className="qb-sheet-delta-lab mono-label">Change to the total</span>
            <span className="qb-sheet-delta-fig">{deltaSay(conflict.delta)}</span>
          </p>
          <div className="qb-sheet-acts">
            <button type="button" className="qb-sheet-no" onClick={onCancel}>
              Leave it
            </button>
            <button type="button" className="qb-sheet-ok" ref={okRef} onClick={onAccept}>
              {conflict.accept}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ============================================================
   THE PAPERWORK — the one question no table can carry.

   It is the last band rather than a modal at the end. Production
   asks it in a "Finalize Project" dialog that types the customer as
   five free-text fields, from scratch, every time, with no lookup
   and no dedupe — while a `CustomerPicker` sits imported in the same
   file. Here it is the last thing on the page, it uses the register
   the app already has, and `issueBlockers` refuses in the same words
   on the price bar.
   ============================================================ */

function AdminBand({
  quote,
  steps,
  open,
  refusals,
  nameRef,
  onToggle,
  onOpenCustomer,
}: {
  quote: QuoteDef
  steps: readonly BuildStep[]
  open: boolean
  refusals: readonly string[]
  /** owned by the stage, so the price bar's refusal can put the caret
   *  in this box from the other end of the screen */
  nameRef: RefObject<HTMLInputElement | null>
  onToggle: () => void
  onOpenCustomer?: (rowId: string) => void
}): ReactElement {
  const named = quote.customer.name.trim()

  /* ── WHAT THE BOX ABOVE DOES NOT ALREADY SAY ─────────────────────
     Measured with this band open at 1600×1000: `CustomerField` prints
     "A quote is addressed to somebody. Until this is written it
     cannot be given to the customer — giving it to them freezes the
     document, so the name cannot be added later." against the box —
     and 180px below it this list printed `issueBlockers`' version of
     the same fact again. One screen, one missing name, three
     statements of it counting the price bar.

     Asking `issueBlockers` for the same quote WITH a name leaves
     exactly the reasons that are NOT about the name. No string
     matching, and nothing to drift if `totals.ts` ever reorders its
     sentences or adds a fifth.

     NOT MEMOISED. `issueBlockers` returns a fresh array on every
     call, so `refusals` is a new identity each render and a
     `useMemo` keyed on it would never hit — a hook that costs more
     than the four `if`s it is guarding. */
  const others: readonly string[] =
    named === ''
      ? issueBlockers({ ...quote, customer: { ...quote.customer, name: 'a name' } })
      : refusals

  return (
    <section className="qb-band" data-kind="custom">
      <h2 className="qb-band-h">
        <button
          type="button"
          className="qb-band-head k-band"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className={`qb-band-mark${open ? ' is-open' : ''}`} aria-hidden="true">
            <CaretDown size={ICON_SIZE.tiny} weight="bold" />
          </span>
          <span className="qb-band-name">Who it is for</span>
          <span className="qb-band-fact">{named === '' ? 'nobody yet' : named}</span>
          <span className="qb-band-fig" />
        </button>
      </h2>

      {open ? (
        <div className="qb-band-body">
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
          </ul>

          {others.length > 0 ? (
            <div className="qb-ledger-whys" role="status">
              {others.map((w) => (
                <p key={w} className="qb-ledger-why">
                  {w}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
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

  return (
    <div className="qb-none">
      {say === '' ? null : <p className="qb-none-say">{say}</p>}
      {door ? (
        <button type="button" className="qb-act" onClick={onSeeAll}>
          Show all {offer.catalogue} {name}
        </button>
      ) : null}
    </div>
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
   ============================================================ */

function OfferCard({
  candidate,
  index,
  still,
  lit,
  onPick,
}: {
  candidate: Candidate
  index: number
  still: boolean
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
      style={{ ['--i' as string]: index } as CSSProperties}
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
              <span key={f.label} className="qb-card-fact">
                <span className="qb-card-fact-lab">{f.label}</span> {f.value}
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
