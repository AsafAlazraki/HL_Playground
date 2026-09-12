/* ============================================================
   PRICE BAR — the figure, always on screen, and what it contains.

   It is the one control a person looks at for the whole of a
   build, and `PHASE_TWO` §3 puts a figure as the subject of the
   screen. Three things it has to get right, and each of them is a
   rule this repo already wrote down:

   1 · THE FIGURE DOES NOT COUNT UP. `PHASE_TWO` §4.3, restated in
       `DESIGN_SYSTEM.md` §6: a dealer reads it aloud to a customer
       standing beside them, and a number that is still animating
       when it is spoken is a number that was spoken wrong. The
       DELTA appears and fades; the total is simply correct on the
       next paint. This is the single most obvious component in the
       app to reach for a ticker on, and it is the one place a
       ticker is most damaging.

   2 · IT NEVER INVENTS A FIGURE THE PRICE FILE DOES NOT CARRY.
       `QUOTE_SPEC.md` §2 is unusually blunt about it — "no 29% BMT
       markup, no $159 labour rate, NO 10% GST DIVISOR, no 20%
       deposit". So `tax` is optional and is NEVER defaulted: with
       no rate, this bar draws ONE figure and says nothing about
       tax at all, because the alternative is printing a number
       nobody entered on the document a customer is handed.

   3 · NULL IS A REAL STATE. `QUOTE_SPEC.md` §2: an unpriced line
       has `unitPrice: null`, contributes nothing to the total, and
       the bar SAYS SO in carmine with a count. A total that
       silently treats "not priced" as zero is a quote that is
       wrong by exactly the amount nobody noticed.

   NO `className`, NO `style` — the same mechanism as every
   primitive here.
   ============================================================ */

import { useState, type ReactNode } from 'react'
import { money } from '@/lib/money'
import './pricebar.css'

export interface PriceLevelChoice {
  key: string
  label: string
}

export interface PriceBarTax {
  /** 0.1 for ten per cent. Comes from the project's own data — this
   *  component never supplies one. */
  rate: number
  /** The business's word for it: "GST", "VAT", "Sales tax". */
  label: string
  /** Does `total` already include it? Both conventions exist in the
   *  real workbooks, and guessing is how two summations of one deal
   *  start to disagree. */
  included: boolean
}

export interface PriceBarProps {
  /** The sum of the frozen lines. Never recomputed here. */
  total: number
  /** What the total is of — "Package pricing", "This quote". */
  caption?: string
  tax?: PriceBarTax
  /** How many lines carry no price. Counted, never summed as zero. */
  notPriced?: number
  levels?: readonly PriceLevelChoice[]
  levelKey?: string
  onLevel?: (key: string) => void
  /** The one primary action. A screen has exactly one. */
  action?: ReactNode
  /** Sits under the action — why it cannot be taken yet, as a
   *  sentence. Rule 10. */
  actionNote?: string
}

export function PriceBar({
  total,
  caption = 'Total',
  tax,
  notPriced = 0,
  levels,
  levelKey,
  onLevel,
  action,
  actionNote,
}: PriceBarProps) {
  /* THE DELTA, DERIVED FROM WHAT THE FIGURE WAS LAST TIME. No timer
     and no effect: the element is keyed on `tick`, so a new delta
     remounts it and the CSS animation runs once and finishes at
     `opacity: 0`. A timer to hide it would be a second source of
     truth about whether it is on screen.

     IT IS STATE, NOT A REF, AND THAT IS THE WHOLE POINT. The first
     draft did `const was = useRef(total)` and mutated it during
     render. Under StrictMode React renders twice: the first pass
     set the ref, the second compared `total` against the value it
     had just written, saw no change, and drew nothing. The delta
     never appeared once — and nothing LOOKED broken, which is the
     worst kind of bug to ship on a surface whose whole job is to
     report that something changed.

     Setting state during render is React's documented way to adjust
     state when a prop changes, and it is safe under a double render
     because the guard makes it idempotent. */
  const [seen, setSeen] = useState({ total, delta: 0, tick: 0 })
  if (seen.total !== total) {
    setSeen({ total, delta: total - seen.total, tick: seen.tick + 1 })
  }
  const delta = seen.delta
  const moved = seen.tick > 0 && delta !== 0

  /* Both figures, and neither is guessed. `included` says which way
     the arithmetic runs; without `tax` there is only one number to
     draw and nothing to say about it.

     QUANTISED TO CENTS, WHICH IS NOT THE ROUNDING `money.ts`
     FORBIDS. That file's rule is that a DISPLAY must not round a
     total — a rounded figure over an unrounded sum is how two
     summations of one deal start to disagree. This is the other
     thing: binary floating point cannot hold a tenth, so
     `100000 * 1.1` is 110000.00000000001, and `money()` correctly
     reads that as a non-integer and prints "$110,000.00" — cents
     that do not exist, on the largest figure on the screen.
     Quantising to the currency's own smallest unit removes the
     artefact without moving the value: 110000.00000000001 → 110000,
     and 103731/1.1 → 94300.91 either way. */
  const cents = (n: number) => Math.round(n * 100) / 100
  const exTax = tax ? cents(tax.included ? total / (1 + tax.rate) : total) : null
  const incTax = tax ? cents(tax.included ? total : total * (1 + tax.rate)) : null

  return (
    <div className="ui-pricebar" data-register="showroom">
      <div className="ui-pricebar-figure">
        <span className="t-label ui-pricebar-cap">
          {caption}
          {tax ? ` (incl. ${tax.label})` : ''}
        </span>

        <span className="ui-pricebar-row">
          {/* aria-live on the FIGURE, not on the delta: the total is
              the fact, and a screen reader that announced only the
              change would report a movement without a destination. */}
          <output className="t-figure-xl ui-pricebar-now" aria-live="polite">
            {money(incTax ?? total)}
          </output>

          {moved ? (
            <span
              className="t-mono ui-pricebar-delta"
              key={seen.tick}
              data-up={delta > 0 || undefined}
            >
              {delta > 0 ? '+' : '−'}
              {money(Math.abs(delta))}
            </span>
          ) : null}
        </span>

        {tax ? (
          <span className="t-caption ui-pricebar-ex">
            <span className="t-mono-sm">{money(exTax ?? 0)}</span> excl. {tax.label}
          </span>
        ) : null}

        {/* NOT A WARNING DECORATION — a count of lines the total does
            not include, because they have no price in the file. */}
        {notPriced > 0 ? (
          <span className="t-caption ui-pricebar-unpriced">
            {notPriced} {notPriced === 1 ? 'line is' : 'lines are'} not priced here, and
            {notPriced === 1 ? ' it adds' : ' they add'} nothing to this figure
          </span>
        ) : null}
      </div>

      {levels && levels.length > 1 ? (
        <div className="ui-pricebar-levels">
          <span className="t-label ui-pricebar-cap" id="ui-pricebar-level">
            Price level
          </span>
          <div className="ui-pricebar-seg" role="group" aria-labelledby="ui-pricebar-level">
            {levels.map((l) => (
              <button
                key={l.key}
                type="button"
                className="ui-pricebar-level t-small"
                aria-pressed={l.key === levelKey}
                onClick={() => onLevel?.(l.key)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {action ? (
        <div className="ui-pricebar-act">
          {action}
          {actionNote ? (
            <span className="t-caption ui-pricebar-note">{actionNote}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
