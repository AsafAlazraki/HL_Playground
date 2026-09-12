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
import type { ReactElement } from 'react'
import { PriceBar, ProductStage, Stepper } from '@/ui'
import type { Step } from '@/ui'
import { money } from '@/lib/money'
import { QUOTE_LEVEL_ORDER, LEVEL_TITLE } from '@/types/model'
import type { QuoteDef, QuoteLine } from '@/types/model'
import { sectionKinds, stepOffer } from './freeze'
import type { Candidate } from './freeze'
import { addLine, removeLine, setLevel } from './quotes'
import { orderBands } from './bands'
import { marqueOf } from './marque'
import type { Band } from './bands'
import { buildSteps } from './steps'
import type { BuildStep } from './steps'
import { issueBlockers, quoteTotals } from './totals'
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

  return (
    <div className="bs" data-register="showroom">
      <header className="bs-rail">
        <Stepper
          steps={bands.map((b) => railStop(b, refusals))}
          currentId={open?.id ?? ''}
          doneIds={bands.filter((b) => b.amount !== null).map((b) => b.id)}
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

        <section className="bs-step" aria-label={open?.name ?? 'This step'}>
          {open ? <BandPane quote={quote} band={open} /> : null}
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
          onLevel={(k) => setLevel(quote.id, k)}
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
  const price = candidate.line.unitPrice

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
          else addLine(quote.id, step.section.blockId, candidate.line)
        }}
      >
        <span className="t-heading bs-cand-name">{candidate.line.label}</span>
        <span className="t-mono bs-cand-amt">
          {price === null ? 'not priced' : money(price)}
        </span>
      </button>
    </li>
  )
}
