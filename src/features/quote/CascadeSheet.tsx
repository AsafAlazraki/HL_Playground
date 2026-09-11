/* ============================================================
   THE CASCADE SHEET — what this choice does to the rest of the
   quote, said before it happens.

   Porsche's shape, captured live 2026-09-10 and written up in
   `docs/research/cascade-teardown-porsche-live.md`, with the two
   things their architecture cannot do added back.

   WHAT IS TAKEN, AND WHY EACH PIECE IS THERE

   · A SHEET FROM THE RIGHT, over the stage, blurred. The blur is
     load-bearing: it says the configurator is still there and
     frozen, not replaced. A centred modal says the opposite.
   · THE THING YOU CHOSE, at the top, with its picture and its
     price. The sheet is about a decision, so the decision is on it.
   · TWO CARDS, each with its own price chip. You can read what this
     adds and what it costs you separately, then read the footer for
     the net.
   · A FOOTER THAT PRICES THE DECISION, not the click. Porsche's own
     arithmetic on the 911: $24,340 clicked, +$2,120 forced,
     footer +$26,460. A person who reads only the sticker is wrong
     by the cascade; a person who reads the footer never is.
   · THE COMMITTED TOTAL DOES NOT MOVE while this is open.

   WHAT IS ADDED

   · EVERY REMOVED ROW SAYS WHY, in a sentence carrying the numbers.
     Porsche prints one sentence — "not compatible with your
     selection" — on every removed row, naming neither the selection
     nor what about it. Ours comes off `PartnerVerdict` and
     `FloorVerdict`, which kept the banner, the marque and both
     weights. See `cascade.ts`.
   · ALTERNATIVES, PRICED, CHEAPEST PRE-SELECTED. The playbook line
     that made Porsche "the one to beat" describes this, and the
     live capture shows the removal sheet offering nothing at all.
   · `Standard` IS NOT `$0.00`. Three outcomes on a figure and they
     are three facts: an amount, standard equipment, and no figure
     at all. `rowFigure` keeps them apart.

   MOTION. `transitionFor(still, …)` on every value, so
   `prefers-reduced-motion` removes the movement and keeps the
   opacity — DESIGN_PRINCIPLES §4. Enter is a spring from the right;
   exit is faster than enter, which is the asymmetry a sheet needs to
   feel like it is answering rather than lingering.
   ============================================================ */

import { useEffect, useRef, useState, type ReactElement } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/ui'
import { SPRING, SPRING_QUICK, transitionFor } from '@/features/views/stillness'
import { money } from './pricing'
import { deltaSay } from './conflict'
import {
  groupDelta,
  rowFigure,
  type Alternative,
  type Cascade,
  type CascadeRow,
} from './cascade'
import './cascade.css'

/** THE ROW THAT IS NOT AN ALTERNATIVE — "leave it off" — drawn in the
 *  same radio group because it is the same kind of decision. Its id is
 *  a word no `selectPartners` row can mint: those are
 *  `tableId:rowId`, and this has no colon. */
const NOTHING: Alternative = {
  id: 'nothing',
  label: 'Leave it off',
  amount: 0,
  note: 'Nothing goes on in its place',
}

/* ---------------------------------------------------------- */
/* One row                                                     */
/* ---------------------------------------------------------- */

/** A row on a card: what it is, why it is here, what it costs.
 *
 *  The reason sits UNDER the name rather than beside it, because a
 *  reason is a sentence and a sentence wraps. Beside the name it
 *  would either truncate — and rule §3 forbids truncating mid-word —
 *  or push the figure off its column. */
function Row({ row, tone }: { row: CascadeRow; tone: 'off' | 'on' | 'flat' }): ReactElement {
  return (
    <li className={`cs-row cs-row-${tone}`}>
      <div className="cs-row-main">
        <span className="cs-row-name">{row.label}</span>
        {row.because ? <span className="cs-row-why">{row.because}</span> : null}
      </div>
      <span className={`cs-row-fig${row.standard ? ' cs-row-fig-std' : ''}`}>{rowFigure(row)}</span>
    </li>
  )
}

/* ---------------------------------------------------------- */
/* One card                                                    */
/* ---------------------------------------------------------- */

function Card({
  cap,
  say,
  rows,
  tone,
  chip,
}: {
  cap: string
  say: string
  rows: readonly CascadeRow[]
  tone: 'off' | 'on' | 'flat'
  /* WHETHER THIS GROUP MOVES THE TOTAL AT ALL.
     The chip is a delta, and a delta on a group that changes nothing
     is a sentence that contradicts the one above it: the first draft
     of this sheet printed `+$22,178` beside "These stay on the
     quote", which is the arithmetic of the lines and the opposite of
     what is happening to them. A group that holds gets no chip. */
  chip: boolean
}): ReactElement | null {
  if (rows.length === 0) return null
  return (
    <section className="cs-card">
      <header className="cs-card-head">
        <div className="cs-card-words">
          <h3 className="cs-card-cap">{cap}</h3>
          <p className="cs-card-say">{say}</p>
        </div>
        {/* The chip is the group's own arithmetic. Porsche puts one on
            each card and it is why you can read the sheet in two
            glances instead of adding it up yourself. */}
        {chip ? <span className="cs-card-chip">{groupDelta(rows)}</span> : null}
      </header>
      <ul className="cs-rows">
        {rows.map((row) => (
          <Row key={row.id} row={row} tone={tone} />
        ))}
      </ul>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* The sheet                                                   */
/* ---------------------------------------------------------- */

export function CascadeSheet({
  cascade,
  still,
  onAccept,
  onCancel,
}: {
  cascade: Cascade
  still: boolean
  /** takes the id of the alternative chosen, or null when none was
   *  offered — the surface decides what that means */
  onAccept: (alternativeId: string | null) => void
  onCancel: () => void
}): ReactElement {
  /* The cheapest alternative is pre-selected. That is the half of
     the design the live capture showed Porsche NOT shipping, and it
     is the difference between a sheet that reports a problem and one
     that hands you the answer. */
  const [chosen, setChosen] = useState<string | null>(cascade.alternatives[0]?.id ?? null)

  const actsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    actsRef.current?.querySelector<HTMLButtonElement>('[data-ok]')?.focus()
  }, [])

  /* What the total becomes given the alternative actually chosen.
     `cascade.to` was computed for the cheapest; choosing a dearer one
     has to move the footer or the footer is decoration. */
  const swap = cascade.alternatives.find((a) => a.id === chosen)
  const base = cascade.alternatives[0]?.amount ?? 0
  /* LEAVING IT OFF COSTS THE CHEAPEST FIX BACK. `cascade.to` was
     computed WITH the cheapest alternative in it, so choosing to add
     nothing subtracts that amount rather than adding zero — the
     footer has to price the decision actually in front of the
     person. */
  const shift = chosen === NOTHING.id ? -base : (swap?.amount ?? base) - base
  const to = cascade.to + shift
  const delta = to - cascade.from

  return (
    <div className="cs-scrim" role="presentation">
      <motion.aside
        className="cs-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={cascade.title}
        initial={{ opacity: 0, x: '4%' }}
        animate={{ opacity: 1, x: '0%', transition: transitionFor(still, SPRING) }}
        exit={{ opacity: 0, x: '3%', transition: transitionFor(still, SPRING_QUICK) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          }
        }}
      >
        <div className="cs-scroll">
          <header className="cs-head">
            <h2 className="cs-title">{cascade.title}</h2>
            <p className="cs-sub">{cascade.subtitle}</p>
          </header>

          {/* WHAT YOU CHOSE. The picture is optional and its absence is
              not a hole: without one the row is just a name and a
              figure, which is what a line on a quote already is. */}
          <section className="cs-asked">
            <p className="mono-label cs-asked-cap">What you chose</p>
            <div className="cs-asked-row">
              {cascade.asked.image ? (
                <img className="cs-asked-img" src={cascade.asked.image} alt="" />
              ) : null}
              <span className="cs-asked-name">{cascade.asked.label}</span>
              {/* NO FIGURE IS NOT A DASH HERE. On the level channel the
                  thing chosen is a rung, which has no price of its own —
                  printing `—` beside it invites the reading that its
                  price is missing rather than inapplicable. */}
              {cascade.asked.amount === null ? null : (
                <span className="cs-asked-fig">{money(cascade.asked.amount)}</span>
              )}
            </div>
          </section>

          <Card
            cap="Coming off"
            say="These are built for another marque and cannot stay on this quote."
            rows={cascade.removed}
            tone="off"
            chip
          />

          <Card cap="Coming on" say="Accepting adds these." rows={cascade.added} tone="on" chip />

          {/* THE ALTERNATIVES. A radio group, because it is one choice
              among several and that is what a radio group is for —
              and because a person can arrow through it. */}
          {cascade.alternatives.length > 0 ? (
            <section className="cs-card">
              <header className="cs-card-head">
                <div className="cs-card-words">
                  <h3 className="cs-card-cap">Instead</h3>
                  <p className="cs-card-say">
                    {cascade.alternatives.length === 1
                      ? 'One of these fits.'
                      : `${cascade.alternatives.length} of these fit. The cheapest is chosen.`}
                  </p>
                </div>
              </header>
              {/* ============================================================
                  AND THE THIRD ANSWER, WHICH IS A REAL ONE.

                  §2.4's shape is three rows, not two: the cheapest fix,
                  every dearer one, and *Leave the motor off*. Without
                  it the sheet offers a person who has decided they do
                  not want the thing at all no way to say so — they can
                  only take the cheapest swap and then go and delete the
                  line, which is two acts for one decision and leaves
                  the undo pointing at the wrong one.

                  IT IS A RADIO AND NOT A SECOND BUTTON. Choosing to add
                  nothing is a choice among the alternatives, priced
                  like the rest at nothing; putting it in the footer
                  would make it read as a cancel, and cancel already
                  means "leave the quote as it stands", which is the
                  opposite act — that one keeps the lines this sheet is
                  removing.
                  ============================================================ */}
              <ul className="cs-alts" role="radiogroup" aria-label="What to put on instead">
                {[...cascade.alternatives, NOTHING].map((alt) => {
                  const on = alt.id === chosen
                  return (
                    <li key={alt.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`cs-alt${on ? ' cs-alt-on' : ''}`}
                        onPointerDown={() => setChosen(alt.id)}
                      >
                        <span className="cs-alt-mark" aria-hidden="true" />
                        <span className="cs-alt-main">
                          <span className="cs-alt-name">{alt.label}</span>
                          <span className="cs-alt-note">{alt.note}</span>
                        </span>
                        <span className="cs-alt-fig">
                          {alt.amount === null ? '—' : money(alt.amount)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {/* WHAT WE DID NOT CHECK. PCPartPicker ships this disclaimer
              on every list and takes the cost; ours names the subject
              it could not check, which is strictly more useful. */}
          <Card
            cap="Worth knowing"
            say="These stay on the quote, and here is why they do not move."
            rows={cascade.unchecked}
            tone="flat"
            chip={false}
          />
        </div>

        {/* THE FOOT DOES NOT SCROLL. The arithmetic is the decision and
            it must be on screen at the moment the button is pressed. */}
        <footer className="cs-foot">
          <p className="cs-delta">
            <span className="mono-label cs-delta-cap">Change to the total</span>
            <span className="cs-delta-fig">{deltaSay(delta)}</span>
          </p>
          <div className="cs-acts" ref={actsRef}>
            <Button tone="neutral" onClick={onCancel}>
              Leave it as it is
            </Button>
            <Button
              tone="primary"
              data-ok="true"
              onClick={() => onAccept(chosen === NOTHING.id ? null : chosen)}
            >
              {cascade.accept}
            </Button>
          </div>
        </footer>
      </motion.aside>
    </div>
  )
}
