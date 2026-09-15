/* ============================================================
   THE CONFIGURATOR, REBUILT ON THE TWO-REGISTER SYSTEM.

   This is the first screen of the rebuild. It stands beside
   `QuoteBuild.tsx` rather than replacing it — `QuotePage` picks
   between them — so `main` keeps running while this is worked on,
   which is what `docs/plan/REBUILD.md` asks of every phase.

   IT ADDS NO ENGINE. Every number and every list on this screen
   comes from the same pure functions the old screen uses:
   `buildSteps`, `sectionKinds`, `orderBands`, `quoteTotals`,
   `stepOffer`, `issueBlockers`. The rebuild is a presentation
   rebuild, and this file is the proof of that claim — if it needed
   a new solver, the claim was wrong.

   WHAT IS DIFFERENT, AND WHY:

   1 · A STEP RAIL. `PHASE_TWO` specified "no step rail and no
       progress at all"; `DESIGN_SYSTEM.md` §9.6 reverses that for
       this screen. The evidence against progress indicators is
       real and it is about linear web forms a stranger fills in
       once — this is a seven-stage build over a 15,691-row price
       file that a dealer leaves and returns to after lunch. It is
       also NAVIGABLE, which production's is not
       (`hl-journeys.md` Q1: six presses of Back to change a hull
       colour from the summary).

   2 · A PRODUCT STAGE. `DESIGN_SYSTEM.md` §2 makes it a
       requirement of the Showroom register. The old screen drew
       the hull at 264x176 in a white card on a screen whose whole
       subject is that hull.

   3 · ONE BAR THAT STAYS. The figure, what it excludes, what it
       cannot price, the level, and the one primary action — all of
       it on screen for the whole build rather than at the foot of
       a four-screen scroll.

   THE PICK IS STILL THE WRITE. `freeze.ts` mints a line the instant
   it is picked and `quotes.ts` persists it, so a step's state is a
   reading of a document already on disk rather than component
   state. That is the fault production never fixed — forty
   `useState` hooks and a refresh at step six destroys the build —
   and nothing here may reintroduce it.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { Button, Completion, Field } from '@/ui'
import { useImageDisplay } from '@/lib/imageSources'
import { useSceneKind } from './scene'
import type { ImageRef } from '@/types/model'
import { money } from '@/lib/money'
import { QUOTE_LEVEL_ORDER, LEVEL_TITLE } from '@/types/model'
import type { QuoteDef, QuoteLine } from '@/types/model'
import {
  customerBook,
  fileCustomer,
  freezeCustomer,
  hasCustomerRegister,
  sectionKinds,
  stepOffer,
} from './freeze'
import type { Candidate } from './freeze'
import { addLine, issueQuote, linkCustomer, patchQuote, refinish, removeLine, setLevel } from './quotes'
import { buildEntries } from '@/features/modules/read'
import { finishLevels, foldModels, leafValues } from '@/features/catalogue/fold'
import { Colourways } from '@/features/catalogue/Colourways'
import { useProjectStore } from '@/store/useProjectStore'
import { orderBands } from './bands'
import { CascadeSheet } from './CascadeSheet'
import { cascadeOfConflict } from './cascade'
import { levelConflict } from './conflict'
import type { Conflict } from './conflict'
import { marqueOf } from './marque'
import { FrozenPhoto } from './photo'
import { markOf } from '@/lib/mark'
import type { Band } from './bands'
import { buildSteps, HANDOVER_STEP } from './steps'
import type { BuildStep } from './steps'
import { issueBlockers, quoteTotals } from './totals'
import { useStillness } from '@/features/views/stillness'
import './build-screen.css'

export interface BuildScreenProps {
  quote: QuoteDef
  /** the stage's own "it is issued now" move */
  onIssued?: (quote: QuoteDef) => void
}

export function BuildScreen({ quote, onIssued }: BuildScreenProps): ReactElement {
  const steps = useMemo(() => buildSteps(quote), [quote])
  const kinds = useMemo(() => sectionKinds(quote), [quote])
  const totals = quoteTotals(quote)
  const refusals = issueBlockers(quote)
  const lockup = marqueOf(quote.subjectLabel)

  /* THE RAIL IS THE FIVE DECISIONS, NOT THE TABLES — and the first
     draft of this screen got that wrong in exactly the way
     `bands.ts` was rewritten to end.

     It put one stop per SECTION, which is one stop per table, and
     driven on the real seed the rail read: The hull · NSM Custom
     Trailers · GFAB Trailers · Yamaha Outboards · Parts &
     Accessories · Dealer Fit Packages · Rigging Kits. Seven stops,
     two of them both trailers. That is the database's shape, on the
     screen written to stop the app feeling like a database — the
     same fault, one layer up, in the rebuild meant to cure it.

     `orderBands` already solves it: a `TableKind` decides which of
     the five a section lands in, seven trailer tables are seven
     headings inside `03 Trailer`, and an absent kind is an absent
     band rather than an empty drawer. A dealer does not think "now
     I will open the GFAB Trailers table". */
  const bands = useMemo(() => orderBands(steps, kinds), [steps, kinds])

  /* ============================================================
     THE FINISHES — Porsche's swatch grid, only where there is one.

     The place screen already folds a table's rows into models and
     their finishes (`foldModels`), and already decides whether a
     table's last level IS a finish (`finishLevels`: half the rows
     must carry a readable colourway, so a motor's shaft codes never
     become swatches). This asks the same fold for the subject's
     own model, and draws the grid only when that model has more
     than one row — the SP560 has fifteen, an RU230 has four, a
     Yamaha F90 has one and gets nothing. "Only where appropriate"
     is a fact the fold already knows.
     ============================================================ */
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const root = useProjectStore((s) => s.entities[quote.rootTableId])
  const finishes = useMemo(() => {
    if (!root) return null
    const entries = buildEntries([root], rowsByEntity, { facts: false })
    const leaves = leafValues([root], rowsByEntity)
    const models = foldModels(entries, leaves, finishLevels([root], leaves))
    const mine = models.find((m) => m.offers.some((o) => o.entry.rowId === quote.rootRowId))
    return mine && mine.offers.length > 1 ? mine : null
  }, [root, rowsByEntity, quote.rootRowId])

  /* WHICH STOP IS OPEN IS THE ONE PIECE OF STATE THIS SCREEN OWNS,
     and it is a VIEW of the document rather than part of it: which
     decision you are looking at is not a fact about the quote. It
     defaults to the first band that still decides something, so a
     resumed draft opens where the work is. */
  const [openId, setOpenId] = useState<string>(
    () => bands.find((b) => b.decides && b.amount === null)?.id ?? bands[0]?.id ?? '',
  )


  /* THE PROPOSAL IS A QUESTION, NOT A WRITE. Nothing has changed on
     the quote while this is set: the committed total stays exactly
     where it was until Accept, which is the half of the Porsche
     sheet that makes it readable. */
  const [proposal, setProposal] = useState<{
    conflict: Conflict
    levelKey: string
    levelLabel: string
  } | null>(null)
  /* WHICH SECTION IS UNDER THE EYE. With every band on the rail at
     once, "current" is a fact about where the rail is scrolled to —
     the topmost section inside the upper 40% of the rail — and not
     about which stop was pressed. `rootMargin` cuts the bottom 60%
     off the observed area so a section becomes current as its head
     comes up the rail, not as its foot leaves it. */
  const railRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rail = railRef.current
    if (!rail || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        const id = top?.target.getAttribute('data-band')
        if (id) setOpenId(id)
      },
      { root: rail, rootMargin: '0px 0px -60% 0px', threshold: 0 },
    )
    /* observed BY BAND, not by class, so a band that arrives or
       leaves re-runs this and is watched from its first paint */
    for (const id of [...bands.map((b) => b.id), HANDOVER_STEP]) {
      const sect = rail.querySelector(`[data-band="${CSS.escape(id)}"]`)
      if (sect) io.observe(sect)
    }
    return () => io.disconnect()
  }, [bands])
  /* THE STOPS — one list for the ring in the finale and the dots in
     the foot. A band is decided when it holds a line, or when it
     decides nothing (the subject) or has nothing to offer; the
     handover when a name is typed. `bands.ts` carries the argument. */
  const stops = useMemo(
    () => [
      ...bands.map((b) => ({
        id: b.id,
        title: b.name,
        done: !b.decides || !b.offers || b.tables.some((t) => t.step.lines.length > 0),
      })),
      { id: HANDOVER_STEP, title: 'Who it is for', done: quote.customer.name.trim() !== '' },
    ],
    [bands, quote.customer.name],
  )
  const { still } = useStillness()

  return (
    <div className="bs bs--chapters" data-register="showroom" ref={railRef}>
      {/* ============================================================
          THE BUILD IS A STORY YOU SCROLL — chapters, after Saxdor.

          Driven live on 2026-09-15 (`out/ref/boats/saxdor-*`): the
          model's name at 80px, weight 300, over a full-bleed
          photograph; then one chapter per decision, each a full-bleed
          photograph with a single floating card of choices; a pill
          at the foot saying where you are; and a finale — "YOUR BUILD
          IS READY" — over the boat, with the price. The owner's
          verdict on the stage-and-rail this replaces: "still sucks";
          on the three directions drawn from the references: "do what
          you think is best". This is what I think is best.

          THE HONESTY RULE. A chapter fills the window with a picture
          only when the picture IS a photograph — `useSceneKind` asks
          the pixels. A boat the seed holds only as a render on white
          (every Highfield) gets the same chapter with the render
          large on a quiet ground. Same design, two registers of
          light; nothing stretched, nothing invented.

          NOTHING UNDER IT MOVED. `orderBands`, `stepOffer`, the
          refusals, the frozen lines, `Completion`'s ring and the
          `IntersectionObserver` that follows the scroll are exactly
          what they were; the chapters are placed by the same
          `data-band` the rail used.
          ============================================================ */}
      <Chapter
        img={quote.subjectImage}
        className="bs-ch bs-ch--hero"
        id={`bs-sect-${bands[0]?.id ?? 'hull'}`}
        band={bands[0]?.id ?? 'hull'}
        current={openId === bands[0]?.id}
        label={quote.subjectLabel}
      >
        <div className="bs-ch-top">
          <span className="t-label bs-ch-brand">{quote.organisation ?? 'Quoting'}</span>
          <span className="t-caption bs-ch-crumb">
            {lockup.maker ? `${lockup.maker} · ` : ''}
            {lockup.model}
          </span>
        </div>
        <div className="bs-ch-title">
          <p className="t-label bs-ch-eyebrow">
            {lockup.maker || (quote.organisation ?? 'Quoting')}
            {lockup.trim ? ` · ${lockup.trim}` : ''}
          </p>
          <h1 className="bs-ch-name">{lockup.model}</h1>
          {quote.subjectSpecs.length > 0 ? (
            <dl className="bs-ch-specs">
              {quote.subjectSpecs.slice(0, 5).map((s) => (
                <div className="bs-ch-spec" key={s.label}>
                  <dt className="t-caption">{s.label}</dt>
                  <dd className="t-small">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {finishes ? (
          <div className="bs-ch-card bs-ch-card--finishes">
            <p className="bs-ch-card-head">
              <span className="bs-ch-card-title">Finish</span>
              <span className="t-caption bs-ch-card-sub">
                {finishes.offers.length} the file holds
                {finishes.materials.length > 1 ? ` · ${finishes.materials.join(' / ')}` : ''}
              </span>
            </p>
            <div className="bs-finishes">
              <Colourways
                offers={finishes.offers}
                chosenRowId={quote.rootRowId}
                material={finishes.materials.length > 1}
                label={`Finishes of ${finishes.name}`}
                onChoose={(offer) => refinish(quote.id, offer.entry.rowId)}
              />
            </div>
          </div>
        ) : null}
        <p className="t-caption bs-ch-scroll" aria-hidden="true">
          Scroll to begin
          <span className="bs-ch-arrow">↓</span>
        </p>
      </Chapter>

      {bands
        .filter((b) => !b.tables.some((t) => t.step.subject))
        .map((b) => {
          /* the chapter wears the picture of what is ON it — the motor
             once a motor is picked — and the boat's until then */
          const picked = b.tables.flatMap((t) => t.step.lines).find((l) => l.image)
          return (
            <Chapter
              key={b.id}
              img={picked?.image ?? quote.subjectImage}
              className="bs-ch"
              id={`bs-sect-${b.id}`}
              band={b.id}
              current={openId === b.id}
              label={b.name}
            >
              <div className="bs-ch-card">
                <BandPane quote={quote} band={b} />
              </div>
            </Chapter>
          )
        })}

      <Chapter
        img={quote.subjectImage}
        className="bs-ch bs-ch--fin"
        id={`bs-sect-${HANDOVER_STEP}`}
        band={HANDOVER_STEP}
        current={openId === HANDOVER_STEP}
        label="Who it is for"
      >
        <div className="bs-ch-title bs-ch-title--fin">
          <p className="t-label bs-ch-eyebrow">
            {lockup.maker ? `${lockup.maker} ` : ''}
            {lockup.model}
          </p>
          <h2 className="bs-ch-name">
            Your build
            <br />
            is ready
          </h2>
        </div>
        <div className="bs-ch-card bs-ch-card--fin">
          <Completion
            steps={stops}
            total={totals.total}
            caption="Package pricing"
            tax={
              totals.taxRate !== null && totals.totalExcludingTax !== null
                ? { label: 'GST', totalExcluding: totals.totalExcludingTax }
                : undefined
            }
            notPriced={totals.unpricedCount}
            levels={QUOTE_LEVEL_ORDER.map((k) => ({
              key: k,
              label: LEVEL_TITLE[k] ?? k,
            }))}
            levelKey={quote.levelKey}
            onLevel={(k) => {
              const label = LEVEL_TITLE[k] ?? k
              const conflict = levelConflict(quote, k, label)
              if (conflict === null) {
                setLevel(quote.id, k)
                return
              }
              setProposal({ conflict, levelKey: k, levelLabel: label })
            }}
            action={
              <Button
                tone="primary"
                size="lg"
                refusedBecause={refusals[0]}
                onClick={() => {
                  if (issueQuote(quote.id)) onIssued?.(quote)
                }}
              >
                Give it to the customer
              </Button>
            }
          />
          <div className="bs-ch-hand">
            <Handover quote={quote} refusals={refusals} />
          </div>
        </div>
      </Chapter>

      {/* THE FOOT — where you are, and what it comes to. One pill,
          Saxdor's: a dash per chapter, the current one long, the
          figure, and Details, which goes to the finale. */}
      <div className="bs-ch-foot" role="navigation" aria-label="Where you are in the build">
        <span className="bs-ch-dots" aria-hidden="true">
          {stops.map((s) => (
            <i
              key={s.id}
              className={`bs-ch-dot${openId === s.id ? ' is-here' : ''}${s.done ? ' is-done' : ''}`}
            />
          ))}
        </span>
        <span className="t-caption bs-ch-where">
          {Math.max(1, stops.findIndex((s) => s.id === openId) + 1)} / {stops.length}
        </span>
        <span className="bs-ch-figure">{money(totals.total)}</span>
        <button
          type="button"
          className="bs-ch-details"
          onClick={() =>
            railRef.current
              ?.querySelector(`[data-band="${CSS.escape(HANDOVER_STEP)}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          Details
        </button>
      </div>


      {/* THE SHEET, OVER A STAGE THAT IS STILL THERE AND FROZEN. The
          Porsche teardown found the blur is load-bearing: it says
          the configurator has not been replaced, only suspended.
          `AnimatePresence` so it leaves as well as arrives — exit
          faster than enter, which the sheet's own transition holds. */}
      <AnimatePresence>
        {proposal ? (
          <CascadeSheet
            key={proposal.conflict.id}
            cascade={cascadeOfConflict(proposal.conflict, {
              label: proposal.levelLabel,
              amount: null,
            })}
            still={still}
            onAccept={() => {
              setLevel(quote.id, proposal.levelKey)
              setProposal(null)
            }}
            onCancel={() => setProposal(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/* ---------------------------------------------------------- */

/** One of the five decisions, read as a rail stop. `fact` is the
 *  engine's own clause for where the decision stands — "chosen:
 *  Yamaha - F9.9SMHB", "7 offered", "73 no longer sold" — and this
 *  screen never paraphrases it. */

/** The handover, as a rail stop. It is never refused: a quote can
 *  always be addressed, and the blockers that stop it being ISSUED
 *  are said on the bar, beside the action they block. */

/** The subject's picture, as the stage wants it. One for now — a
 *  frozen quote holds a single `subjectImage`, and the colourway
 *  gallery is the picker's job rather than the document's. */

/* ---- who it is for ----------------------------------------- */

/* ============================================================
   THE HANDOVER — the one question no table can carry.

   `CONFIGURATOR.md` §3: "If a quote cannot be addressed on the
   screen where it is built, that is the single biggest fault in
   the flow — it sends a person to the document to do something the
   build should own." The old screen's footer said "Type the
   customer name at the top" and there was no field at the top.

   A NAME IS ENOUGH. A walk-in who gave a name and no details is a
   real quote, and so is a quote to somebody since taken out of the
   register — `unlinkCustomer` says as much in its own words. So
   the register is an OFFER here, never a gate: type a name and the
   quote is addressed.

   THE NAME IS FROZEN ONTO THE DOCUMENT, and `customerRef` is a
   pointer that nothing prints. `QUOTE_SPEC.md`'s acceptance test
   is that deleting the customer from the register leaves the
   printed quote unchanged, and that only holds because the name
   travelled by value.
   ============================================================ */
function Handover({
  quote,
  refusals,
}: {
  quote: QuoteDef
  refusals: readonly string[]
}): ReactElement {
  /* The draft is local so a store write does not land per keystroke
     — `Field`'s own note makes the same argument: a value that
     writes on every character is a history entry per character, and
     undo then walks somebody backwards through their own typing one
     letter at a time. */
  const [typed, setTyped] = useState(quote.customer?.name ?? '')
  const hasRegister = hasCustomerRegister()
  const book = useMemo(() => (hasRegister ? customerBook() : []), [hasRegister])

  const commit = (name: string): void => {
    const clean = name.trim()
    patchQuote(quote.id, {
      customer: clean ? { name: clean } : undefined,
      /* Typing over a linked customer breaks the link: the name on
         the document is no longer the name in the register, and a
         pointer that disagrees with what is printed is worse than
         no pointer. */
      customerRef: undefined,
    })
  }

  return (
    <div className="bs-pane">
      <div className="bs-pane-head">
        <p className="t-label bs-pane-num">Who it is for</p>
        <p className="t-small bs-pane-why">
          A name is enough. Everything else on the document is already decided.
        </p>
      </div>

      <div className="bs-hand">
        <Field
          label="Customer"
          value={typed}
          onChange={setTyped}
          onBlur={() => commit(typed)}
          placeholder="Their name, as it should read on the quote"
          autoComplete="off"
        />

        {/* ============================================================
            AND THE WAY INTO THE BOOK, WHICH THIS SCREEN HAD CLOSED.

            `QuoteEditor` could file the person you had just typed —
            "Add Mark McWilliams to your customers" — and said what
            happened if you did not: "Their name and details print
            either way. Customers keeps them for the next quote."
            That screen has no door in the shipped build (see
            quote.css), and this one, which replaced it, offered only
            "somebody you have quoted before".

            That is a closed loop. Nothing on the shipped path files
            a customer, so the register stays empty, so the picker
            below stays empty, so nobody is ever quoted before.
            Measured: raise a quote to a named customer, open
            Customers, and the book still says "no customer register
            yet".

            Both halves are restored here — the act, and the sentence
            that says what happens without it. `fileCustomer` adds a
            ROW and never a table: it returns null when there is no
            register, and then the sentence is all there is to say,
            which is rule 10 and exactly what the old screen did.
            ============================================================ */}
        {typed.trim() !== '' && quote.customerRef === undefined ? (
          hasRegister ? (
            <button
              type="button"
              className="bs-file"
              onClick={() => {
                const frozen = fileCustomer(typed, quote.customer?.contact ?? [])
                if (frozen) linkCustomer(quote.id, frozen)
              }}
            >
              Add {typed.trim()} to your customers
            </button>
          ) : (
            <p className="t-caption bs-file-none">
              Their name and details print either way. <em>Customers</em> keeps them for
              the next quote.
            </p>
          )
        ) : null}

        {book.length > 0 ? (
          <div className="bs-book">
            <p className="t-label bs-book-cap">Or somebody you have quoted before</p>
            <ul className="bs-book-list">
              {book.slice(0, 8).map((c) => (
                <li key={c.rowId}>
                  <button
                    type="button"
                    className="bs-book-one"
                    data-on={quote.customerRef?.rowId === c.rowId || undefined}
                    onClick={() => {
                      const frozen = freezeCustomer(c.rowId)
                      if (!frozen) return
                      linkCustomer(quote.id, frozen)
                      setTyped(frozen.customer?.name ?? '')
                    }}
                  >
                    <span className="t-body bs-book-name">{c.name}</span>
                    {c.contact.length > 0 ? (
                      <span className="t-caption bs-book-meta">{c.contact[0]}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* WHAT IS STILL IN THE WAY, in the engine's own words. A
            refusal is a sentence with a reason, in the place the
            thing is refused — and the action it refuses is on the
            bar below, which is why this is a list and not a repeat
            of the bar's one-liner. */}
        {refusals.length > 0 ? (
          <div className="bs-stops">
            <p className="t-label bs-stops-cap">
              {refusals.length === 1
                ? 'One thing is in the way'
                : `${refusals.length} things are in the way`}
            </p>
            <ul className="bs-stops-list">
              {refusals.map((r) => (
                <li className="t-small bs-stop" key={r}>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="t-small bs-ready">
            Nothing is in the way. This quote can go to the customer.
          </p>
        )}
      </div>
    </div>
  )
}

/* ---- one stop ---------------------------------------------- */

/** ONE DECISION, AND THE TABLES THAT CAN ANSWER IT.
 *
 *  Seven trailer tables are seven HEADINGS in here, not seven stops
 *  on the rail — and the heading is drawn only where the decision
 *  really spans more than one table, which is the treatment
 *  `QuoteStart` already proved with `.qs-sec-head`. */

/* ============================================================
   ONE CHAPTER. Full-bleed when the picture is a photograph, the
   render on a quiet ground when it is not — `scene.ts` decides by
   reading the pixels. The children are laid over it; the text
   blocks carry their own scrim colour so what the contrast ruler
   composites is what is painted.
   ============================================================ */
function Chapter({
  img,
  className,
  id,
  band,
  current,
  label,
  children,
}: {
  img: ImageRef | undefined
  className: string
  id: string
  band: string
  current: boolean
  label: string
  children: ReactNode
}): ReactElement {
  const kind = useSceneKind(img?.src)
  const { at, paint } = useImageDisplay(img?.src ?? '')
  const scene = kind === 'scene' && paint
  return (
    <section
      className={className}
      id={id}
      data-band={band}
      data-current={current || undefined}
      data-scene={scene ? 'scene' : 'studio'}
      aria-label={label}
      style={scene ? ({ '--bs-ch-photo': `url("${at}")` } as CSSProperties) : undefined}
    >
      {!scene && img && paint ? (
        <FrozenPhoto img={img} fallbackAlt={label} className="bs-ch-render" w={1600} h={900} />
      ) : null}
      {children}
    </section>
  )
}

function BandPane({ quote, band }: { quote: QuoteDef; band: Band }): ReactElement {
  const many = band.tables.length > 1

  return (
    <div className="bs-pane" data-kind={band.kind}>
      <div className="bs-pane-head">
        <p className="t-label bs-pane-num">
          {band.num} {band.name}
        </p>
        {band.amount !== null ? (
          <p className="t-mono bs-pane-amt">{money(band.amount)}</p>
        ) : null}
        <p className="t-small bs-pane-why">{band.fact}</p>
      </div>

      {band.tables.map(({ step }) => (
        <TablePart key={step.id} quote={quote} step={step} named={many} />
      ))}
    </div>
  )
}

/* ============================================================
   THE CURATION TOOLBAR — the one pattern worth stealing.

   `hl-journeys.md` §4 calls Step 5's toolbar "the single
   interaction in either journey that is unambiguously right", and
   names the five things that make it so:

     · narrow the pool to what fits THIS build, by rules
     · put the rule's reason in the operator's own words
     · keep a SEARCH that ignores the narrowing
     · keep a SHOW-ALL that turns the narrowing off entirely
     · and STATE THE COUNT of what was hidden

   `stepOffer` already returns every one of those numbers —
   `narrowed`, `catalogue`, `pool`, `beyond`, `matched`, `capped`,
   `heldCount`, `reason` — and takes `query` and `all`. The engine
   has had the whole toolbar since before the rebuild; what was
   missing was the controls.

   WITHOUT THEM A BAND IS UNUSABLE AT SCALE. Dealer fit is 1,791
   rows in the seeded file and the cap draws forty. A list that
   shows forty of 1,791 with no way to search past them is a list
   that has hidden 1,751 things without saying so.
   ============================================================ */
function TablePart({
  quote,
  step,
  named,
}: {
  quote: QuoteDef
  step: BuildStep
  named: boolean
}): ReactElement {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)

  const offer = useMemo(
    () => (step.subject ? null : stepOffer(quote, step.section, { query, all })),
    [quote, step, query, all],
  )

  /* THE SEARCH IS DRAWN WHENEVER THERE IS MORE THAN A HANDFUL, not
     only when the cap bit. A person who can see every option does
     not need to search; a person looking at forty of 1,791 needs
     to know they can. */
  const worthSearching = Boolean(offer && (offer.capped || offer.catalogue > 8))

  /* A HEADING WITH NOTHING UNDER IT IS FURNITURE. Dealer fit spans
     three tables on the seeded file and one of them offers nothing
     for this hull, so the band drew "Dealer Fit Packages" as a bare
     heading above the next table's content — which reads as a
     section that failed to load rather than as a table with nothing
     to say. A table with no picks, no candidates and nothing to
     explain is simply not drawn; `bands.ts` makes the same call one
     level up, where an absent kind is an absent band. */
  const empty =
    step.lines.length === 0 &&
    (offer?.candidates.length ?? 0) === 0 &&
    !worthSearching &&
    !step.why
  if (empty) return <></>

  return (
    <div className="bs-part">
      {named ? <h3 className="t-heading bs-part-name">{step.title}</h3> : null}
      {step.why ? <p className="t-small bs-part-why">{step.why}</p> : null}

      {step.lines.length > 0 ? (
        <ul className="bs-picked">
          {step.lines.map((line) => (
            <PickedLine key={line.id} quote={quote} line={line} removable={!step.subject} />
          ))}
        </ul>
      ) : null}

      {offer && offer.candidates.length > 0 ? (
        <>
          {/* THE COUNT IS A LABEL; THE REASON IS A SENTENCE. Setting
              both at `t-label` uppercased the reason — "ONLY WHAT
              SOMEBODY PICKED FOR THIS ONE SHOWS HERE" — which is
              rule 3 broken on the screen written to keep it.
              Uppercase is a section caption, a group caption or a
              mono stamp, and nothing else. */}
          {worthSearching ? (
            <div className="bs-curate">
              <Field
                label={`Find in ${step.title}`}
                value={query}
                onChange={setQuery}
                placeholder="Any word on the row"
                type="search"
                autoComplete="off"
              />
              {/* SHOW-ALL IS A SWITCH, NOT A LINK, because it has a
                  state a person needs to see from across the row:
                  with it on, the list has stopped answering "what
                  fits this boat". */}
              <button
                type="button"
                className="bs-showall t-small"
                aria-pressed={all}
                onClick={() => setAll((v) => !v)}
              >
                {all ? 'Only what fits' : 'Show everything'}
              </button>
            </div>
          ) : null}
          <p className="bs-offer-cap">
            <span className="t-label bs-offer-count">
              {offer.candidates.length} offered
            </span>
            {/* THE REASON DESCRIBES THE NARROWING, so it may only be
                printed while the narrowing is on. With Show
                everything pressed the caption read "only what
                somebody picked for this one shows here" over a list
                of 2,238 parts, which is the app asserting something
                it had just stopped doing. */}
            {all ? (
              <span className="t-caption bs-offer-why">
                everything on this table, not only what fits this one
              </span>
            ) : offer.reason ? (
              <span className="t-caption bs-offer-why">{offer.reason}</span>
            ) : null}
            {/* WHAT IS NOT ON SCREEN, SAID OUT LOUD. A list that draws
                forty of 1,791 and says nothing has hidden 1,751 things
                silently, which is the failure the whole curation
                mechanism exists to end. */}
            {offer.capped ? (
              <span className="t-caption bs-offer-more">
                {offer.matched - offer.candidates.length} more match — narrow it with the
                search
              </span>
            ) : null}
            {offer.beyond > 0 ? (
              <span className="t-caption bs-offer-more">
                {offer.beyond} more match outside what fits this one
              </span>
            ) : null}
            {offer.heldCount > 0 ? (
              <span className="t-caption bs-offer-more">
                {offer.heldCount} held back as no longer sold
              </span>
            ) : null}
          </p>
          {/* The gap between the two is the flex gap on `.bs-offer-cap`,
              not a space in the markup: splitting the label from the
              sentence removed the space that used to join them, and
              "3 OFFEREDonly what somebody picked" is what that looks
              like. Layout owns spacing; strings do not. */}
          <ul className="bs-offer">
            {offer.candidates.map((c) => (
              <CandidateCard key={c.key} quote={quote} step={step} candidate={c} />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

function PickedLine({
  quote,
  line,
  removable,
}: {
  quote: QuoteDef
  line: QuoteLine
  removable: boolean
}): ReactElement {
  return (
    <li className="bs-line">
      <span className="t-body bs-line-name">{line.label}</span>
      <span className="t-mono bs-line-amt">
        {/* NULL IS A REAL STATE and never renders as 0. */}
        {line.unitPrice === null ? (
          <span className="bs-line-unpriced">not priced here</span>
        ) : (
          money(line.unitPrice * (line.qty ?? 1))
        )}
      </span>
      {removable ? (
        <button
          type="button"
          className="bs-line-off"
          onClick={() => removeLine(quote.id, line.id)}
        >
          Take it off
        </button>
      ) : null}
    </li>
  )
}

/* AN OPTION CARD CARRIES THE THING, NOT ITS NAME.
 *
 * `DESIGN_SYSTEM.md` §2 makes photography a Showroom requirement,
 * and this is the surface where it earns most: a dealer turning the
 * screen around to ask "this motor or that one" is asking about two
 * objects, and two lines of text is the version of that question
 * that makes a person read part numbers aloud.
 *
 * THE PAIR FACTS ARE OUR EDGE, and no shipping configurator in the
 * teardowns has them. `line.pairFacts` is the five-way association
 * the price file recorded — which rigging kit, which prop, which
 * engine hole — frozen onto the candidate before it is picked. The
 * original prints a motor's name; this prints what comes with it.
 */
function CandidateCard({
  quote,
  step,
  candidate,
}: {
  quote: QuoteDef
  step: BuildStep
  candidate: Candidate
}): ReactElement {
  const on = Boolean(candidate.alreadyLineId)
  const line = candidate.line
  const price = line.unitPrice
  /* AT MOST TWO, AND EACH CLAMPED TO TWO LINES. A card that lists
     every fact is a specification sheet, and the question this card
     asks is "this one?".

     Measured on the real seed: three facts on a Yamaha F250 ran to
     seven lines — "Rigging Kit Option Helm Master L2 - 6X9 Binnacle
     | Bolt on DES | Straight Helm | EKS | Single" is one of them —
     which pushed the price below the fold of its own card. The
     price is the second thing a person looks at and it was the last
     thing they could see.

     Two adjacent candidates differing by one word inside that
     string is the real discrimination problem here, and naming the
     DIFFERENCE rather than reprinting both specifications is a
     better answer than either. It is not this pass. */
  const facts = (line.pairFacts ?? []).slice(0, 2)

  return (
    <li>
      <button
        type="button"
        className="bs-cand"
        data-on={on || undefined}
        data-press="card"
        aria-pressed={on}
        onClick={() => {
          if (on && candidate.alreadyLineId) removeLine(quote.id, candidate.alreadyLineId)
          else addLine(quote.id, step.section.blockId, line)
        }}
      >
        <span className="bs-cand-well m-lit m-grain">
          {/* THE PLATE UNDER THE PICTURE, which is what shows when
              there is no picture — and there often is not. A fuse
              block, a bilge pump and a set of tube covers are real
              lines on a real quote and almost none of them is
              photographed.  correctly returns null for
              those, and until now the well below it was 300px of
              empty gradient in a 480px column: the biggest thing on
              the step, saying nothing. The catalogue card solved
              this already; this is the same answer one size down. */}
          <span className="bs-cand-plate" aria-hidden="true">
            <span className="t-display bs-cand-mono">{markOf(line.label)}</span>
          </span>
          {/* `FrozenPhoto` answers "can these pixels be painted, and
              from where" — the repository's own copy when it holds
              one, the maker's address when it does not — while the
              frozen `src` on the quote stays exactly what it was.
              It returns null when there is nothing to paint, and the
              well below it is what shows through. */}
          <FrozenPhoto
            img={line.image}
            fallbackAlt={line.label}
            className="bs-cand-img"
            w={320}
            h={200}
          />
          {line.recommended ? (
            <span className="t-label bs-cand-rec">Recommended</span>
          ) : null}
        </span>

        <span className="bs-cand-say">
          <span className="t-heading bs-cand-name">{line.label}</span>

          {facts.length > 0 ? (
            <span className="bs-cand-facts">
              {facts.map((f) => (
                <span className="t-caption bs-cand-fact" key={f.label}>
                  <span className="bs-cand-fact-lab">{f.label}</span> {f.value}
                </span>
              ))}
            </span>
          ) : null}

          <span className="t-mono bs-cand-amt">
            {/* NULL IS A REAL STATE. Never 0, and never blank — a
                price the file does not carry is a fact about the
                file. */}
            {price === null ? (
              <span className="bs-cand-unpriced">not priced here</span>
            ) : (
              money(price)
            )}
          </span>
        </span>

        {/* PICKED SAYS SO IN A WORD, not only in a tint. The original
            — which nobody thinks is beautiful — used a border, a
            wash AND a word, and was right to: a colour alone asks a
            person to remember which shade means chosen.

            SENTENCE CASE. It was `t-label`, which uppercases, and
            "ADD" is a verb on a control — rule 3's first named
            exclusion. Uppercase is a section caption, a group
            caption or a mono stamp, and this is none of them. */}
        <span className="t-caption bs-cand-state" aria-hidden="true">
          {on ? 'On the quote' : 'Add'}
        </span>
      </button>
    </li>
  )
}
