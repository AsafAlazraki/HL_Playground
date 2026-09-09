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

import { useLayoutEffect, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { money } from './pricing'
import './build.css'
import './flow.css'

/** The three moments of raising a quote. */
export type FlowStop = 'choose' | 'configure' | 'address'

/* ============================================================
   WHAT PRESSED IT, because the answer decides whether anything
   moves.

   DESIGN_PRINCIPLES §4 and CONFIGURATOR_PLAYBOOK §6 both put a
   stop jump in the list of things that must not move, and the
   reason both give is the same one: it is keyboard-initiated and
   it happens a hundred times a day. Emil Kowalski's frequency
   table is the general form — 100+/day is "no animation, ever" —
   and the reason is that motion on a key press reads as latency
   rather than as feedback.

   A React `onClick` fires for a mouse press AND for Enter or Space
   on a focused button, and by the time it reaches the handler the
   two are the same event type. `MouseEvent.detail` is the click
   count and it is **0** for a keyboard-synthesised click and for a
   programmatic `.click()`, so a positive detail is the one signal
   that positively means a pointer.

   SO THE DEFAULT IS STILL. A caller that does not say gets
   `undefined` and nothing animates — `QuoteBuild`'s own
   `qb-give-fix` button calls `onGo('address')` with one argument
   and cannot know what pressed it, and a guess there would be a
   rule broken on a maybe. Only a press we KNOW came off a pointer
   is allowed to move the surface. */
export type FlowBy = 'pointer' | 'key'

function pressedBy(detail: number): FlowBy {
  return detail > 0 ? 'pointer' : 'key'
}

const ORDER: FlowStop[] = ['choose', 'configure', 'address']

const NAME: Record<FlowStop, string> = {
  choose: 'Choose',
  configure: 'Configure',
  address: 'Address',
}

/* ── THE FACT SITS BESIDE THE NAME, NOT UNDER IT ─────────────
   The markup below did not change for this and does not need to:
   both children are still spans in source order, and which axis
   they lay out on is flow.css's to decide. It is recorded here
   because the two are read together and the reason is a number.

   Stacked, every stop was two lines tall so that ONE of them —
   Choose, carrying the hull — could put its answer under its label,
   and the strip cost 55.64px of a 1280x800 window that had 524.13
   left for the work. Beside, the strip costs 33.84 and the three
   stops take 492.1 of the 1,016 the bar has. It bought height with
   width that was going spare, which is RESPONSIVE.md's rule 3 read
   on the axis that was actually short. flow.css carries the whole
   measurement, including what is still wrong and is not in either
   of these two files. */

export interface FlowLineProps {
  /** which of the three is on screen */
  at: FlowStop
  /** the one fact each stop carries. '' draws no fact at all, which
   *  is what Configure gets: the bands and the figure under this line
   *  are already saying it.
   *
   *  It is the stop's ANSWER, and on Address that is the customer's
   *  name or `nobody yet` — which is where the unaddressed fact
   *  belongs, beside its own label and its own door, rather than on
   *  a full-width strip below repeating both. See flow.css. */
  facts: Partial<Record<FlowStop, string>>
  /** the stops that can be moved to from here. A stop that is not in
   *  here is drawn as a stop, never as a control that does nothing.
   *
   *  The second argument is what pressed it. A caller that ignores it
   *  still typechecks — a one-parameter handler is assignable here —
   *  and gets the still default. */
  onGo?: (to: FlowStop, by: FlowBy) => void
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
                <button
                  type="button"
                  className="qf-go"
                  onClick={(e) => onGo?.(id, pressedBy(e.detail))}
                >
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

   AND THE STEP IT IS SET IN IS `.ds-figure-xl`, WORN HERE. The
   total was on a ramp this feature wrote by hand — 25.84px of IBM
   Plex Mono at 1280, measured — while ds.css carried
   `--t-figure-xl` (30 → 42px, Archivo, tabular) for exactly this
   figure and nothing else. The class is taken at the call site
   rather than re-declared in build.css for the reason ds.css gives
   about `.ds-marque`: a step defined in two places is a split this
   project has already paid for once. build.css's `.qb-price-now`
   keeps only what the step does not own.

   IT IS NOT MONO ANY MORE, AND THAT IS THE POINT OF THE STEP.
   IBM Plex Mono is fixed-pitch, so at this size the thousands comma
   takes a whole digit cell and the total reads "$8 , 557"; ds.css
   records the per-glyph measurement and that no OpenType feature
   closes it. Archivo with `tabular-nums` puts every digit on one
   advance, so the figure still cannot move as the price changes —
   which is the property "money never animates" actually rests on.

   EVERY OTHER FIGURE IN THIS BAR STAYS MONO. §2's rule is "if it
   is a number IN A COLUMN, it is mono"; a committed total is a
   headline that happens to be a number, and the proposal, the
   delta and every line-item price are not.
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
        <span className="qb-price-now ds-figure-xl">{money(amount)}</span>
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
 *  the measurement that rule came from.
 *
 *  `qf-fixed` is not a look. It is the name of the one object in
 *  this column that does not move when the stop changes, and
 *  flow.css spends a rule saying so out loud rather than relying on
 *  the bar happening to be the second child. See `FlowSurface`. */
export function FlowFoot({
  line,
  children,
}: {
  line: ReactNode
  children: ReactNode
}): ReactElement {
  return (
    <footer className="qb-price qf-fixed">
      {line}
      {children}
    </footer>
  )
}

/* ============================================================
   THE SEAM — ONE SURFACE, NOT THREE PAGES.

   Configure and Address are two readings of one document and the
   bar across the foot of both is one object in one place. What was
   missing was any evidence of that at the moment a person moves:
   the whole column was torn down and rebuilt in a single frame, so
   the only thing distinguishing "the surface changed under a bar
   that stayed" from "a different page loaded" was that the bar
   happened to be drawn identically. A hard cut says nothing.

   WHAT MOVES, AND WHAT MUST NOT.

   The arriving stop's own content settles — 4px of translateY and
   a fade up from 0.62, over `--d-med` (180ms) on `--ease`. Those
   are CONFIGURATOR_PLAYBOOK §6's own numbers for a surface
   arriving ("Compare bar / popover — translateY 4→0 + fade,
   180ms"), not new ones, and they are the only two properties this
   file animates here: transform and opacity, both compositor-only.

   THE BAR DOES NOT MOVE, does not fade, and is not in the
   selector. §4 of the playbook is the whole reason the bar exists
   as one object across the three stops; a bar that slid between
   them would undo it. flow.css states that as a rule on
   `.qf-fixed` rather than leaving it to source order.

   THE RAIL'S MARKER DOES NOT TRAVEL EITHER. Playbook §6 lists it
   under "what must not move" — the accent rule under the current
   name updates in place, it does not slide from one stop to the
   next. That is why nothing here animates the flow line.

   WHY A CSS TRANSITION AND NOT A SPRING.

   apple-design is emphatic that springs belong to anything a
   person can grab, because a spring starts from the presentation
   value and inherits velocity. A stop change has neither: it is a
   discrete commit off a button, there is no drag, no release and
   no velocity to hand over. A spring here would be the costume of
   physics with no physics under it.

   What the skill's principle DOES bite on is interruptibility, and
   a transition on a PERSISTENT wrapper is the way to keep it: this
   element is never re-keyed, so pressing the other stop mid-flight
   retargets the transition from wherever it actually is on screen
   instead of restarting a keyframe from zero (Emil Kowalski's
   transitions-over-keyframes rule, for exactly this reason), and
   input is never locked out for a millisecond of it.

   And the incoming stop is a large React tree mounting in the same
   frame. A rAF-driven animation would be sharing the main thread
   with that render; a compositor transition is not. That is the
   Vercel dashboard finding in the same skill, and it is why
   `motion` is the wrong tool for this particular seam even though
   it is the right one for the conflict sheet forty lines away in
   QuoteBuild.

   WHAT DOES NOT ANIMATE AT ALL: a keyboard press, a press whose
   modality the caller did not report, and the first paint of a
   draft — arriving at a quote is not moving between its stops.
   ============================================================ */

export interface FlowSurfaceProps {
  /** which of the three is on screen */
  at: FlowStop
  /** what pressed the control that got us here. Anything but
   *  `'pointer'` — including nothing at all — is still. */
  by?: FlowBy
  /** the column's own classes. This is the same element, not a
   *  wrapper around it: `.qt-root--edit` owns the flex column and a
   *  second box in the middle of it would break the measurement
   *  that took the total out of the scroll. */
  className?: string
  children: ReactNode
}

/** The attribute flow.css keys the settle off. Written to the node,
 *  never held in state: it is a paint fact about one element, and
 *  routing it through React would re-render the whole configurator
 *  twice — a tree of thirty-odd components and a fitment solve —
 *  to change four characters of markup. Emil Kowalski's rule for
 *  the same shape of mistake is to write the transform on the
 *  element rather than move a value that recalculates a subtree. */
const ARRIVE = 'data-arrive'

export function FlowSurface({ at, by, className = '', children }: FlowSurfaceProps): ReactElement {
  const host = useRef<HTMLDivElement>(null)
  const seen = useRef<FlowStop | null>(null)

  useLayoutEffect(() => {
    const before = seen.current
    seen.current = at
    /* the first paint is an arrival at the quote, not a move
       between its stops */
    if (before === null || before === at) return

    /* WHERE THE FOCUS GOES, which is not a motion question and is
       the other half of the seam. The control that was pressed has
       just been unmounted, so focus was falling to `<body>` and a
       keyboard user's next Tab restarted at the top of the window.
       The playbook's rule for a stop jump is that focus moves and
       nothing slides; this is the moving half.

       It runs in a LAYOUT effect, before paint and before the new
       stop's own passive effects, so Address's caret-in-the-name-
       field still wins on that screen — it is a documented
       behaviour of that file and this must not take it. */
    host.current?.focus({ preventScroll: true })

    if (by !== 'pointer') return

    /* TWO FRAMES, AND THEY ARE NOT DECORATION. The offset has to be
       painted once with transitions suppressed, or the surface
       would animate OUT to the offset and back rather than in from
       it. This effect runs after the new stop is in the DOM and
       before the browser paints, so the first painted frame
       carries the offset and the rAF clears it. (Measured, the
       offset holds two to three frames rather than one, because
       the incoming stop's own mount is in there too.)

       PRESSING THE OTHER STOP MID-SETTLE lands here again: the
       cleanup cancels the pending frame and the attribute is
       re-set under `transition: none`. Measured at 1600x1000,
       reversing five frames into a settle flipped the stop on the
       NEXT frame — the press is never queued behind a running
       animation, which a keyframe would have done — at a cost of
       one frame carrying 0.247 of opacity and 2.6px as the
       arriving state is re-applied. Small, real, and stated rather
       than dressed up: a discrete press has no velocity to hand
       over, so this is a fast reversal and not a spring. */
    const el = host.current
    if (!el) return
    el.setAttribute(ARRIVE, 'set')
    const frame = requestAnimationFrame(() => el.removeAttribute(ARRIVE))
    return () => cancelAnimationFrame(frame)
  }, [at, by])

  return (
    <div
      ref={host}
      className={`qf-swap ${className}`.trimEnd()}
      /* a focus target, never a tab stop */
      tabIndex={-1}
      /* `aria-label` on a bare div is not exposed, so the role is
         what makes the name reach a screen reader on that focus */
      role="group"
      aria-label={NAME[at]}
    >
      {children}
    </div>
  )
}
