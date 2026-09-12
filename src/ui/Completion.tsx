/* ============================================================
   THE QUOTE'S FOOT, AS A CARD THAT FILLS UP.

   It was a solid bar across the bottom of the configurator: the
   figure, the price level, the action, and nothing about WHERE IN
   THE QUOTE ANYBODY WAS. The step rail at the top carried that
   and the foot carried money, so the one surface a person looks at
   while deciding told them only half of what they were deciding.

   THIS IS A CARD. It floats over the pane with its own shadow and
   its own edge, glass over whatever is scrolling behind it — §5's
   material, and §9.3's deletion of "glass is retired" spent on one
   of the two surfaces the re-mine says earns it.

   THE ARC IS THE QUOTE FILLING UP. One SVG ring, `stroke-dashoffset`
   driven, one segment per step so the ring is a MAP of the build
   rather than a percentage: a segment is lit when its step has been
   decided, and the gaps between them are the steps still open. A
   person can see at a glance that the trailer is the hole.

   AND WHEN THE LAST ONE LANDS, THE CARD SAYS SO — once. A single
   linear sweep passes across it, which is `motion-libraries-remine`
   §7.3's re-opened Border Beam: not a conic orbit (the 773x56
   measurement that the light crawls the long edges stands), and not
   forever (causality is spent after one pass). The ring closes, the
   edge takes the accent, and it stops.

   NOTHING HERE COUNTS UP. `NumberFlow` is overridden in this repo
   with a written reason — a dealer reads the figure aloud to a
   customer while it is on screen, and a total that animates is a
   total they have to wait for. The arc moves; the money does not.
   ============================================================ */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { money } from '@/lib/money'
import { useStillness } from '@/features/views/stillness'
import './completion.css'

export interface CompletionStep {
  /** stable, and the segment's identity */
  id: string
  /** the dealer's own name for the stop — "The hull", "Trailer" */
  title: string
  /** has this stop been decided? A stop that offers nothing and
   *  removes nothing counts as decided the moment it is reached. */
  done: boolean
}

export interface CompletionTax {
  label: string
  totalExcluding: number
}

export interface CompletionProps {
  /** the sum of the frozen lines. Never recomputed here. */
  total: number
  caption?: string
  tax?: CompletionTax
  /** lines carrying no price. Counted, never summed as zero. */
  notPriced?: number
  steps: readonly CompletionStep[]
  /** the price ladder, drawn as a segmented control */
  levels?: readonly { key: string; label: string }[]
  levelKey?: string
  onLevel?: (key: string) => void
  /** the one primary action */
  action?: ReactNode
  /** why it cannot be taken yet, as a sentence. Rule 10. */
  actionNote?: string
}

/* The ring's geometry. A radius of 22 on a 52 box leaves room for a
   3px stroke and the focus ring around it without the SVG clipping
   its own edge — the mistake that makes an arc look flat-sided. */
const R = 22
const BOX = 52
const TURN = 2 * Math.PI * R

export function Completion({
  total,
  caption = 'Package pricing',
  tax,
  notPriced = 0,
  steps,
  levels,
  levelKey,
  onLevel,
  action,
  actionNote,
}: CompletionProps) {
  const { still } = useStillness()
  const done = steps.filter((s) => s.done).length
  const all = steps.length
  const complete = all > 0 && done === all

  /* ============================================================
     THE SWEEP FIRES ON THE TRANSITION, NOT ON THE STATE.

     A card that is complete when you arrive should not perform —
     the sweep is the app saying "that was the last one", and
     saying it to somebody who did nothing is the app talking about
     itself. So the flag is set only when `complete` goes false →
     true, which is React's documented adjust-state-during-render
     shape rather than an effect, and it is guarded so StrictMode's
     second pass cannot double-fire it. `ProductStage` carries the
     measurement of getting this wrong with a ref.
     ============================================================ */
  const [seen, setSeen] = useState({ complete, just: false })
  if (seen.complete !== complete) {
    setSeen({ complete, just: complete })
  }
  const justLanded = seen.just && seen.complete === complete && !still

  return (
    <div
      className="ui-done"
      data-complete={complete || undefined}
      data-landed={justLanded || undefined}
      data-register="showroom"
    >
      {/* THE SWEEP — one pass, left to right, and then gone. It is a
          sibling rather than a pseudo-element so the animation can
          be keyed on the landing and torn down with it. */}
      {justLanded ? <span className="ui-done-sweep" aria-hidden="true" /> : null}

      <div className="ui-done-arc">
        <svg viewBox={`0 0 ${BOX} ${BOX}`} width={BOX} height={BOX} aria-hidden="true">
          <circle className="ui-done-track" cx={BOX / 2} cy={BOX / 2} r={R} />
          {/* ONE SEGMENT PER STEP, so the ring is a map and not a
              percentage: the gaps are the stops still open. Each is
              a dash of the circumference with a hairline between. */}
          {steps.map((step, i) => {
            const slice = TURN / all
            const gap = Math.min(6, slice * 0.18)
            return (
              <circle
                key={step.id}
                className={step.done ? 'ui-done-seg is-on' : 'ui-done-seg'}
                cx={BOX / 2}
                cy={BOX / 2}
                r={R}
                strokeDasharray={`${Math.max(0, slice - gap)} ${TURN}`}
                strokeDashoffset={-(i * slice) + TURN / 4}
              />
            )
          })}
        </svg>
        <span className="ui-done-count">
          <b>{done}</b>
          <span aria-hidden="true">/</span>
          <span>{all}</span>
        </span>
        <span className="ui-done-sr">
          {done} of {all} decided
        </span>
      </div>

      <div className="ui-done-figure">
        <p className="t-label ui-done-cap">{caption}</p>
        <p className="ui-done-now">{money(total)}</p>
        {tax ? (
          <p className="t-caption ui-done-ex">
            {money(tax.totalExcluding)} excluding {tax.label}
          </p>
        ) : null}
        {notPriced > 0 ? (
          <p className="t-caption ui-done-unpriced">
            {notPriced} {notPriced === 1 ? 'line is' : 'lines are'} not priced here, and{' '}
            {notPriced === 1 ? 'it adds' : 'they add'} nothing to this figure
          </p>
        ) : null}
      </div>

      {levels && levels.length > 1 ? (
        <div className="ui-done-levels" role="group" aria-label="Price level">
          {levels.map((l) => (
            <button
              key={l.key}
              type="button"
              className={l.key === levelKey ? 'ui-done-level is-on' : 'ui-done-level'}
              aria-pressed={l.key === levelKey}
              onClick={() => onLevel?.(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="ui-done-do">
        {action}
        {actionNote ? <p className="t-caption ui-done-why">{actionNote}</p> : null}
      </div>
    </div>
  )
}
