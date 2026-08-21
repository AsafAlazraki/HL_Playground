/* ============================================================
   THE THIRD DOOR — name two things, and let the file offer the
   columns that could bind them.

   THE OWNER'S SHAPE, VERBATIM:

       WHAT ARE YOU RELATING?
         [ Boats ]  must fit  [ Trailers ]
       WHICH COLUMN DECIDES?
         Series          143 of 434 kept    <- selects
         ATM (KG)        424 of 434 kept    <- barely narrows
         Length (Mtr)     41 of 434 kept    <- holds only 9.4%
       [ Use Series ]

   WHY THIS IS THE HALF THAT WAS MISSING. Two doors already exist and
   both begin with a COLUMN — the catalogue of workbook rules, and a
   blank sentence with `ConsequenceMeter` counting under it. But the
   question a person arrives with is about two THINGS, and the thing
   they do not know is which column decides. That is how the fitment
   research was actually done, and it is the difference between a
   builder that feels like the research and a builder that feels like
   a form.

   NOTHING ON THIS SCREEN IS TYPED IN. Every pair comes off the price
   file's own join tables (`relate.relatablePairs`, which asks the
   discovery engine's own reading of them). Every column and every
   figure beside it comes off a `Candidate` the engine measured on the
   sheet that is loaded, through `relate.bindingOffers`. There is no
   suggested rule anywhere in this file, and no number that was not
   counted.

   THE LESSON IT IS BUILT TO TEACH. A trailer's ATM against a boat's
   weight holds on every pairing the price file writes and still
   leaves a mean 97.70 % of the trailer catalogue standing — it
   selects nothing. The series banner holds at the same perfect rate
   and leaves 0.92 %–7.83 %. Same rate, opposite worth
   (FITMENT_RULES.md §1.2). So the list is BANDED by what a column
   would DO, never sorted by how often it holds, and the floors sit
   under a caption that says they are floors.

   IT DOES NOT FREEZE THE APP. The measurement is bounded to the one
   relationship a person named and the two shapes that bind a
   catalogue — about 50 ms on the real seed against 0.9 s for a whole
   file — and it is still driven one step per idle callback by
   `useBinding`, with the surface saying it is working while it works.

   IT DOES NOT FORK THE BUILDER. Taking a column hands the same
   `ConstraintDef` back to `NewRuleSentence`, which draws the same
   `RuleSentence` under the same `ConsequenceMeter`. One flow, three
   doors.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { useProjectStore } from '@/store/useProjectStore'
import { buildConcepts } from './columns'
import { n } from './discoverSay'
import {
  bindingBands,
  bindingOffers,
  type BindingBand,
  type BindingOffer,
  type RelatablePair,
} from './relate'
import { useBinding } from './useBinding'
import './constraints.css'

const plural = (x: number, one: string, many: string): string => (x === 1 ? one : many)

export interface RelateTwoThingsProps {
  /** every pair this price file can relate, both ways round. It is
   *  passed in rather than read here because the control on the bar
   *  already counts them for its own label, and one walk over the
   *  join rows per sheet is enough. */
  pairs: RelatablePair[]
  /** how many tables the project holds — the empty state states what
   *  a person already has rather than saying "nothing here" at
   *  somebody with a loaded price file */
  tables: number
  /** taking a column composes the sentence — the pair travels with
   *  it so the builder can say what the measurement was */
  onPick: (offer: BindingOffer, pair: RelatablePair) => void
  /** the columns the sentence on this page may name. A module
   *  narrows them, and a column outside the set refuses in place
   *  rather than disappearing. */
  conceptKeys?: ReadonlySet<string>
}

export function RelateTwoThings({
  pairs,
  tables,
  onPick,
  conceptKeys,
}: RelateTwoThingsProps): ReactElement {
  const [pair, setPair] = useState<RelatablePair | null>(null)
  const live = pair && pairs.some((p) => p.id === pair.id) ? pair : null

  if (pairs.length === 0) return <NothingToRelate tables={tables} />

  return live ? (
    <Columns
      pair={live}
      conceptKeys={conceptKeys}
      onBack={() => setPair(null)}
      onPick={(offer) => onPick(offer, live)}
    />
  ) : (
    <Pairs pairs={pairs} onPick={setPair} />
  )
}

/* ---------------------------------------------------------- */
/* Nothing to relate — and why, counted                        */
/* ---------------------------------------------------------- */

/** A REFUSAL IS A SENTENCE WITH A REASON, IN THE PLACE IT IS
 *  REFUSED, and it states what the person already has rather than
 *  saying "nothing here" at somebody with a loaded price file. */
function NothingToRelate({ tables }: { tables: number }): ReactElement {
  return (
    <div className="cn-rel-void">
      <p className="cn-rel-void-say">
        Two things can only be related here where your price file already writes the pairings —
        a table whose rows point at two others, the way a trailer list points at a boat and a
        trailer.
      </p>
      <p className="cn-rel-void-count">
        You have <b>{n(tables)}</b> {plural(tables, 'table', 'tables')} and none of them does
        that yet.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* 1 · WHAT ARE YOU RELATING?                                  */
/* ---------------------------------------------------------- */

function PairSides({ pair }: { pair: RelatablePair }): ReactElement {
  return (
    <span className="cn-rel-sides">
      <span className="cn-rel-side">{pair.subject.column}</span>
      <ArrowRight size={ICON_SIZE.tiny} aria-hidden="true" />
      <span className="cn-rel-side">{pair.partner.column}</span>
    </span>
  )
}

function Pairs({
  pairs,
  onPick,
}: {
  pairs: RelatablePair[]
  onPick: (p: RelatablePair) => void
}): ReactElement {
  return (
    <>
      <p className="cn-rel-cap">THE TWO SIDES</p>
      <ul className="cn-rel-pairs">
        {pairs.map((p) => (
          <li key={p.id} className="cn-rel-pair">
            <button
              type="button"
              className="cn-rel-pair-hit"
              /* THIS PRESS ASKS THE SECOND QUESTION, it does not answer
                 the first. See `ActionBar`'s delegate: without this the
                 panel's `closeOnAct` would read picking a pair as the
                 act and shut before the columns were ever drawn. */
              data-ab-keep-open=""
              /* the row's spans would be announced run together as a
                 name; this says what pressing it does */
              aria-label={`Narrow your ${p.partner.label} from a ${p.subject.column} — ${n(
                p.pairings,
              )} ${plural(p.pairings, 'pairing', 'pairings')} your price file writes, and ${n(
                p.partner.catalogue,
              )} to choose from.`}
              onClick={() => onPick(p)}
            >
              <PairSides pair={p} />
              <span className="cn-rel-pair-at">
                {n(p.pairings)} {plural(p.pairings, 'pairing', 'pairings')} ·{' '}
                {n(p.partner.catalogue)} {p.partner.label.toLowerCase()} to narrow
                {p.heldBack > 0 ? ` · ${n(p.heldBack)} held back` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ---------------------------------------------------------- */
/* 2 · WHICH COLUMN DECIDES?                                   */
/* ---------------------------------------------------------- */

function Columns({
  pair,
  conceptKeys,
  onBack,
  onPick,
}: {
  pair: RelatablePair
  conceptKeys?: ReadonlySet<string>
  onBack: () => void
  onPick: (o: BindingOffer) => void
}): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const { phase, progress, report, share } = useBinding(pair)

  /* the SENTENCE's own column list — what a rule is allowed to talk
     about. A column the engine measured and this list does not carry
     is still shown, and refuses in place. */
  const concepts = useMemo(() => buildConcepts(entities), [entities])

  const bands = useMemo<BindingBand[]>(() => {
    if (!report) return []
    return bindingBands(bindingOffers(report, pair, concepts, conceptKeys))
  }, [report, pair, concepts, conceptKeys])

  const found = bands.reduce((sum, b) => sum + b.offers.length, 0)

  return (
    <>
      <div className="cn-rel-here">
        <PairSides pair={pair} />
        <button
          type="button"
          className="cn-rel-back"
          data-ab-keep-open=""
          onClick={onBack}
        >
          Pick another pair
        </button>
      </div>

      <p className="cn-rel-cap">THE COLUMN THAT DECIDES</p>

      {phase !== 'done' && (
        <div className="cn-rel-work">
          <p className="cn-rel-work-say" role="status">
            Reading your {pair.partner.label.toLowerCase()} against your{' '}
            {pair.subject.label.toLowerCase()}.
          </p>
          <div className="cn-rel-bar" aria-hidden="true">
            <span className="cn-rel-bar-fill" style={{ transform: `scaleX(${share})` }} />
          </div>
          <p className="cn-rel-work-step" aria-hidden="true">
            {progress ? `${n(progress.done)} of ${n(progress.total)}` : 'starting'}
          </p>
        </div>
      )}

      {phase === 'done' && found === 0 && report && (
        <div className="cn-rel-void">
          <p className="cn-rel-void-say">
            Nothing on your {pair.partner.label} could be measured against your{' '}
            {pair.subject.label}. Two numbers are only compared where both headers declare the
            same unit, and one side&rsquo;s words only group the other where they name it.
          </p>
          <p className="cn-rel-void-count">
            <b>{n(report.scanned.comparisons)}</b> comparisons made ·{' '}
            <b>{n(report.bounds.incomparable)}</b> column pairs declined for want of a shared
            unit.
          </p>
        </div>
      )}

      {bands.map((band) => (
        <section className="cn-rel-band" key={band.band} aria-label={band.name}>
          <p className="cn-rel-band-name">
            {band.name}
            <span className="cn-rel-band-count">{n(band.offers.length)}</span>
          </p>
          <p className="cn-rel-band-say">{band.say}</p>
          <ul className="cn-rel-cols">
            {band.offers.map((o) => (
              <Offer key={o.id} offer={o} onPick={onPick} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

/* ---------------------------------------------------------- */
/* One column, with what it would keep and reject              */
/* ---------------------------------------------------------- */

function Offer({
  offer,
  onPick,
}: {
  offer: BindingOffer
  onPick: (o: BindingOffer) => void
}): ReactElement {
  const [why, setWhy] = useState(false)
  const can = offer.refusal === null

  return (
    <li className="cn-rel-col">
      <button
        type="button"
        className={can ? 'cn-rel-col-hit is-live' : 'cn-rel-col-hit'}
        /* `aria-disabled` and a live guard, not the `disabled`
           attribute — a disabled control drops out of the tab order
           and takes its own explanation with it. `StartingPointList`
           set this precedent next door. */
        aria-disabled={can ? undefined : true}
        aria-expanded={can ? undefined : why}
        /* opening a refusal is not the act either — and a refused
           press already leaves the panel standing, so this is belt
           and braces for the day the guard above changes */
        {...(can ? {} : { 'data-ab-keep-open': '' })}
        onClick={() => (can ? onPick(offer) : setWhy(!why))}
      >
        <span className="cn-rel-col-name">{offer.name}</span>
        <span className="cn-rel-col-fig">
          {offer.kept !== null && offer.catalogue !== null
            ? `${n(offer.kept)} of ${n(offer.catalogue)} kept`
            : offer.holds}
        </span>
        <span className="cn-rel-col-against">{offer.against}.</span>
        <span className="cn-rel-col-holds">
          {offer.holds} pairings hold it
          {offer.rejected !== null ? ` · ${n(offer.rejected)} rejected` : ''}
          {offer.over !== null ? ` · a mean over ${n(offer.over)}` : ''}
        </span>
        {offer.desc !== undefined && <span className="cn-wb-src">{offer.desc}</span>}
      </button>

      {!can && why && offer.refusal !== null && (
        <p className="cn-rel-col-why">{offer.refusal}</p>
      )}
    </li>
  )
}
