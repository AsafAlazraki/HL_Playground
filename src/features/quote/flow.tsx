/* ============================================================
   ONE FLOW, THREE MOMENTS — Choose, Configure, Address.

   CONFIGURATOR.md §E: "Choose → Configure → Address is a flow with
   three screens and a running total across all of them, and it
   should read as one place rather than three stages that happen to
   follow each other."

   Three stages that happen to follow each other is exactly what was
   measured. The picker, the configurator and the sheet each drew
   their own footer, in their own vocabulary, with the figure in a
   different place and a different size on each — and nothing on any
   of them said which of the three you were on, what was behind you
   or what was left.

     the picker    `.qs-foot`, `--surface-2`, the chosen row's price
                   at `--t-mono-lg-size` on the RIGHT of the strip
     the build     `.qb-price`, `--surface-1`, the total at
                   clamp(22px, 1.9vw, 30px) on the LEFT
     the sheet     `.qt-foot`, the total at `--t-mono-lg-size` on the
                   left, with the refusals BELOW the bar rather than
                   above it

   So the bar became one object rather than three that resemble each
   other. This file is that object, and it is deliberately thin: the
   `.qb-price*` rules were built and measured on the build screen —
   including the reserved proposal row and the four wrap breakpoints
   in build.css — and the other two now MOUNT them rather than
   growing a second set that can drift. The prefix is the one that
   was already there; a rename would have been 200 lines of measured
   CSS rewritten to say the same thing.

   ── WHY THERE ARE NO NUMBERED CIRCLES ────────────────────────

   The original application had a stepper and the verdict on it was
   "NOT A LOT OF IT I LIKE ACTUALLY VERY LITTLE BUT SOME THINGS ARE
   GOOD". QuoteBuild's own header records the second half of the
   argument: GOV.UK removed a twelve-step indicator from Carer's
   Allowance and measured no change in completion rate or completion
   time, and Porsche's configurator has no progress indicator at all.

   So this is not a meter and it does not count anything. It is
   three names in a row — the one you are on in ink over an accent
   rule, the others quiet — each carrying at most ONE fact, which is
   the prose budget a card gets. Configure's fact is deliberately
   empty: you are looking at the thing, the bands say what is in it
   and the figure 40px below says what it costs. A "3 of 7 decided"
   there would be the meter this screen deleted, wearing a smaller
   font.

   ── WHICH STOPS ARE CONTROLS, AND WHY NOT ALL THREE ──────────

   Configure and Address are two readings of ONE document, so moving
   between them is a press and nothing is lost either way.

   CHOOSE IS NOT, and that is a limit rather than a decision. The
   picker is a stage the SHELL mounts (`winKit.tsx`, `{ kind:
   'start' }`), and this feature may not reach it: `QuoteStart`
   reads a module's catalogue and `modules/read.ts` imports this
   feature's barrel, so a component here that imported the picker
   would close the cycle `quote/index → QuoteStart → start.ts →
   modules/read → quote/index`, which Vite resolves to `undefined`
   at run time rather than failing to build. `quote/index.ts` and
   `Shell.tsx` both carry that note already.

   A stop nothing can reach is drawn as a stop and not as a button —
   never a control that quietly does nothing (rule 10's other half).
   What it carries instead is the hull, which is the answer to "what
   did I choose" without leaving the page. THE WAY BACK IS REAL and
   it is the stage's own Back: `QuoteStart` no longer closes itself
   when it mints, so the picker is still under the quote in the
   shell's window stack and Back lands on it, standing in the same
   place, with the boat still highlighted. See that file's `start`.
   ============================================================ */

import type { ReactElement, ReactNode } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { money } from './pricing'
import './build.css'
import './flow.css'

/** The three moments of raising a quote. */
export type FlowStop = 'choose' | 'configure' | 'address'

const ORDER: FlowStop[] = ['choose', 'configure', 'address']

const NAME: Record<FlowStop, string> = {
  choose: 'Choose',
  configure: 'Configure',
  address: 'Address',
}

export interface FlowLineProps {
  /** which of the three is on screen */
  at: FlowStop
  /** the one fact each stop carries. '' draws no fact at all, which
   *  is what Configure gets: the bands and the figure under this line
   *  are already saying it. */
  facts: Partial<Record<FlowStop, string>>
  /** the stops that can be moved to from here. A stop that is not in
   *  here is drawn as a stop, never as a control that does nothing. */
  onGo?: (to: FlowStop) => void
  reach?: readonly FlowStop[]
}

export function FlowLine({ at, facts, onGo, reach = [] }: FlowLineProps): ReactElement {
  const here = ORDER.indexOf(at)
  return (
    <nav className="qf-line" aria-label="Raising a quote">
      <ol className="qf-stops">
        {ORDER.map((id, i) => {
          const fact = facts[id] ?? ''
          const on = id === at
          const can = !on && reach.includes(id) && onGo !== undefined
          const body = (
            <>
              <span className="qf-stop-name">{NAME[id]}</span>
              {fact === '' ? null : <span className="qf-stop-fact">{fact}</span>}
            </>
          )
          return (
            <li
              key={id}
              className={`qf-stop${on ? ' is-here' : ''}${i < here ? ' is-done' : ''}`}
            >
              {can ? (
                <button type="button" className="qf-go" onClick={() => onGo?.(id)}>
                  {body}
                </button>
              ) : (
                <span className="qf-go qf-go--flat" aria-current={on ? 'step' : undefined}>
                  {body}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ============================================================
   THE FIGURE, IN ONE PLACE, AT ONE SIZE, ON ALL THREE.

   §2 of the brief: "the running total follows … it should be the
   same object across all three, so the figure a person is watching
   does not vanish when they move."

   IT IS NOT A RUNNING TOTAL ON THE PICKER AND IT DOES NOT PRETEND
   TO BE. There is no document yet, so what it carries there is the
   hull's own price and it says so — "Starts at". The continuity
   that matters is that the figure a person read while choosing is
   in the same slot, in the same face, at the same size, the moment
   the quote exists; the LABEL is what changes, and it is the
   honest half.

   THE FIGURE DOES NOT ANIMATE, anywhere. build.css records why: a
   dealer reads this aloud, and motion on money is a slot machine.
   ============================================================ */

export interface RunningTotalProps {
  /** what the figure IS — "Total", "Starts at". Never a sentence. */
  label: string
  /** the figure, or null when the thing carries no price at all. A
   *  blank is never rendered as 0 anywhere in this feature. */
  amount: number | null
  /** the clause under the figure — the tax reading, or what the
   *  figure is of. '' draws nothing. */
  sub?: string
  /** when it opens onto its own arithmetic, the state and the act.
   *  Absent, it is a plate rather than a control. */
  open?: boolean
  onToggle?: () => void
  /** What stands in for the figure when there is none. Defaults to
   *  the row-has-no-price sentence; a caller whose null means
   *  something else says so. */
  nil?: string
}

export function RunningTotal({
  label,
  amount,
  sub = '',
  /* WHAT TO SAY WHEN THERE IS NO FIGURE, because `amount === null`
     means two different things and this bar was saying one of them
     for both.

     A ROW THAT CARRIES NO PRICE is the case this was written for:
     "no price on this one" is exactly right, the row exists and the
     sheet prices nothing for it.

     NOTHING CHOSEN YET is the other, and there the sentence reads
     "STARTS AT no price on this one — nothing highlighted", which
     tells a person that a thing they have not picked has no price.
     Measured on the subject chooser, which is the FIRST screen of
     the quote flow and is on screen before anybody has touched a
     row, so it is the state most people see first. */
  nil = 'no price on this one',
  open,
  onToggle,
}: RunningTotalProps): ReactElement {
  const body = (
    <>
      <span className="qb-price-lab mono-label">{label}</span>
      {amount === null ? (
        <span className="qb-price-nil">{nil}</span>
      ) : (
        <span className="qb-price-now">{money(amount)}</span>
      )}
      {sub === '' ? null : <span className="qb-price-tax">{sub}</span>}
      {onToggle ? (
        <span className={`qb-band-mark${open ? ' is-open' : ''}`} aria-hidden="true">
          <CaretDown size={ICON_SIZE.tiny} weight="bold" />
        </span>
      ) : null}
    </>
  )
  return onToggle ? (
    <button type="button" className="qb-price-fig" aria-expanded={open} onClick={onToggle}>
      {body}
    </button>
  ) : (
    <span className="qb-price-fig is-flat">{body}</span>
  )
}

/** The bar itself: the flow line, then whatever the screen puts on
 *  its own strip. A sibling of the scrollport on every one of the
 *  three, never a sticky child — build.css and quote.css each carry
 *  the measurement that rule came from. */
export function FlowFoot({
  line,
  children,
}: {
  line: ReactNode
  children: ReactNode
}): ReactElement {
  return (
    <footer className="qb-price">
      {line}
      {children}
    </footer>
  )
}
