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

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { ReactElement } from 'react'
import { Field, PriceBar, ProductStage, Stepper } from '@/ui'
import type { Step } from '@/ui'
import { money } from '@/lib/money'
import { QUOTE_LEVEL_ORDER, LEVEL_TITLE } from '@/types/model'
import type { QuoteDef, QuoteLine } from '@/types/model'
import { customerBook, freezeCustomer, hasCustomerRegister, sectionKinds, stepOffer } from './freeze'
import type { Candidate } from './freeze'
import { addLine, linkCustomer, patchQuote, removeLine, setLevel } from './quotes'
import { orderBands } from './bands'
import { CascadeSheet } from './CascadeSheet'
import { cascadeOfConflict } from './cascade'
import { levelConflict } from './conflict'
import type { Conflict } from './conflict'
import { marqueOf } from './marque'
import { FrozenPhoto } from './photo'
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

export function BuildScreen({ quote }: BuildScreenProps): ReactElement {
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

  /* WHICH STOP IS OPEN IS THE ONE PIECE OF STATE THIS SCREEN OWNS,
     and it is a VIEW of the document rather than part of it: which
     decision you are looking at is not a fact about the quote. It
     defaults to the first band that still decides something, so a
     resumed draft opens where the work is. */
  const [openId, setOpenId] = useState<string>(
    () => bands.find((b) => b.decides && b.amount === null)?.id ?? bands[0]?.id ?? '',
  )

  const open = bands.find((b) => b.id === openId) ?? bands[0]

  /* THE PROPOSAL IS A QUESTION, NOT A WRITE. Nothing has changed on
     the quote while this is set: the committed total stays exactly
     where it was until Accept, which is the half of the Porsche
     sheet that makes it readable. */
  const [proposal, setProposal] = useState<{
    conflict: Conflict
    levelKey: string
    levelLabel: string
  } | null>(null)
  const { still } = useStillness()

  return (
    <div className="bs" data-register="showroom">
      <header className="bs-rail">
        {/* THE LAST STOP IS NOT A BAND. `steps.ts` declares
            `HANDOVER_STEP` beside the subject for exactly this
            reason: "who is it for" is the one question no table can
            carry, and `CONFIGURATOR.md` calls its absence from the
            build screen "the single biggest fault in the flow" —
            it sends a person to the document to do something the
            build should own. */}
        <Stepper
          steps={[...bands.map((b) => railStop(b, refusals)), handoverStop(quote)]}
          currentId={openId}
          doneIds={[
            ...bands.filter((b) => b.amount !== null).map((b) => b.id),
            ...(quote.customer?.name ? [HANDOVER_STEP] : []),
          ]}
          onGo={setOpenId}
          label="Build steps"
        />
      </header>

      <div className="bs-body">
        <section className="bs-product" aria-label="What is being quoted">
          {/* AN IDENTIFIER IS NOT A HEADLINE, and the first draft of
              this screen proved `CONFIGURATOR.md`'s point by setting
              `Highfield - ADV7 (HYP) B-G-B` at the marque step: three
              lines, filling the column the product is supposed to be
              in. `subjectLabel` is four facts welded together — a
              maker, a model, a hull material, a colourway — and only
              the model is a name. `marqueOf` takes them apart and
              NOTHING IS DROPPED: all three parts are drawn, inside
              one `h1`, in the order they were written. */}
          <h1 className="bs-lockup">
            {lockup.maker ? (
              <span className="t-label bs-eyebrow">{lockup.maker}</span>
            ) : (
              <span className="t-label bs-eyebrow">{quote.organisation ?? 'Quoting'}</span>
            )}
            <span className={lockup.long ? 't-hero bs-marque' : 't-marque bs-marque'}>
              {lockup.model}
            </span>
            {lockup.trim ? (
              <span className="t-small bs-trim">{lockup.trim}</span>
            ) : null}
          </h1>

          <ProductStage
            pictures={subjectPictures(quote)}
            emptyBecause={`No picture on ${quote.subjectLabel} yet. Add one on its row and it shows here.`}
          />

          {quote.subjectSpecs.length > 0 ? (
            <dl className="bs-specs">
              {quote.subjectSpecs.slice(0, 8).map((s) => (
                <div className="bs-spec" key={s.label}>
                  <dt className="t-caption bs-spec-lab">{s.label}</dt>
                  <dd className="t-mono bs-spec-val">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <section className="bs-step" aria-label={openId === HANDOVER_STEP ? 'Who it is for' : (open?.name ?? 'This step')}>
          {openId === HANDOVER_STEP ? (
            <Handover quote={quote} refusals={refusals} />
          ) : open ? (
            <BandPane quote={quote} band={open} />
          ) : null}
        </section>
      </div>

      <footer className="bs-bar">
        <PriceBar
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
          /* CHANGING THE RUNG IS THE ONE CHOICE THAT MOVES EVERY LINE
             ALREADY MADE, so it asks first. The rebuilt screen called
             `setLevel` straight through, which silently repriced the
             whole quote — "nobody announces a cascade" is the closed
             negative `configurator-teardowns-2026.md` found across
             eight shipping configurators, and I had shipped it.

             `levelConflict` returns null when nothing actually moves,
             and then the change simply happens: a sheet that opens to
             report no change is furniture. */
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
            <button type="button" className="bs-give" disabled={refusals.length > 0}>
              Give it to the customer
            </button>
          }
          /* RULE 10 — a thing that cannot be done says why, where it
             is refused. The blockers come from the engine, already
             worded; this screen never paraphrases one. */
          actionNote={refusals[0]}
        />
      </footer>

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
function railStop(b: Band, refusals: readonly string[]): Step {
  return {
    id: b.id,
    name: b.name,
    chose: b.fact || undefined,
    /* A stop is never refused by the rail itself — nothing in this
       sequence gates anything after it, which `steps.ts` records as
       the second thing production's flow got wrong. The paperwork
       is the one stop that can be blocked, and only by a blocker
       the engine already worded. */
    refusedBecause:
      b.id === 'admin' && refusals.length > 0 ? refusals[0] : undefined,
  }
}

/** The handover, as a rail stop. It is never refused: a quote can
 *  always be addressed, and the blockers that stop it being ISSUED
 *  are said on the bar, beside the action they block. */
function handoverStop(quote: QuoteDef): Step {
  return {
    id: HANDOVER_STEP,
    name: 'Who it is for',
    chose: quote.customer?.name || undefined,
  }
}

/** The subject's picture, as the stage wants it. One for now — a
 *  frozen quote holds a single `subjectImage`, and the colourway
 *  gallery is the picker's job rather than the document's. */
function subjectPictures(quote: QuoteDef) {
  const img = quote.subjectImage
  if (!img) return []
  return [
    {
      src: img.src,
      /* NEVER "image". A screen reader reading "image" has been told
         nothing; the row's own label is what the thing is. */
      alt: img.alt ?? quote.subjectLabel,
    },
  ]
}

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
  const book = useMemo(() => (hasCustomerRegister() ? customerBook() : []), [])

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
function BandPane({ quote, band }: { quote: QuoteDef; band: Band }): ReactElement {
  const many = band.tables.length > 1

  return (
    <div className="bs-pane" data-kind={band.kind}>
      <div className="bs-pane-head">
        <p className="t-label bs-pane-num">
          {band.num} {band.name}
        </p>
        <p className="t-small bs-pane-why">{band.fact}</p>
      </div>

      {band.tables.map(({ step }) => (
        <TablePart key={step.id} quote={quote} step={step} named={many} />
      ))}
    </div>
  )
}

function TablePart({
  quote,
  step,
  named,
}: {
  quote: QuoteDef
  step: BuildStep
  named: boolean
}): ReactElement {
  const offer = useMemo(
    () => (step.subject ? null : stepOffer(quote, step.section)),
    [quote, step],
  )

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
          <p className="bs-offer-cap">
            <span className="t-label bs-offer-count">
              {offer.candidates.length} offered
            </span>
            {offer.reason ? (
              <span className="t-caption bs-offer-why">{offer.reason}</span>
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
        <span className="bs-cand-well">
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
