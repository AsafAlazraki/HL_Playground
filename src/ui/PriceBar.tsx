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

   2 · IT DOES NO ARITHMETIC ON MONEY AT ALL. `QUOTE_SPEC.md` §2 is
       unusually blunt — "no 29% BMT markup, no $159 labour rate, NO
       10% GST DIVISOR, no 20% deposit" — and §1 records the worse
       version of the same fault in production, where FIVE
       summations of one deal already disagree about rounding. So
       this bar is handed both figures and divides nothing. `tax`
       stays optional and is never defaulted: with no tax, one
       figure and no sentence about tax, because the alternative is
       printing a number nobody entered on the document a customer
       is handed. `quoteTotals()` returns `total`, `taxRate` and
       `totalExcludingTax` together and they cannot drift.

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
  /** The business's word for it: "GST", "VAT", "Sales tax". Never
   *  ours — the row noun comes from the data. */
  label: string
  /** The total WITHOUT the tax, as whoever owns the arithmetic
   *  already computed it.
   *
   *  THIS BAR DOES NOT DIVIDE. An earlier draft took a `rate` and a
   *  `included` flag and worked the second figure out itself, which
   *  is a SECOND SUMMATION OF ONE DEAL — the exact fault
   *  `QUOTE_SPEC.md` §1 names in production, where five summations
   *  of one quote already disagree about rounding. `quoteTotals()`
   *  returns `total`, `taxRate` and `totalExcludingTax` together
   *  and they cannot drift; a bar that re-derived one of them could
   *  differ from the document it sits under.
   *
   *  It also removed the floating-point trap for free: there is no
   *  `total * 1.1` here to turn 100000 into 110000.00000000001. */
  totalExcluding: number
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

  /* BOTH FIGURES ARE GIVEN, NEITHER IS DERIVED. `total` is what the
     document sums to; `tax.totalExcluding` is what it sums to
     without the tax. This file does no arithmetic on money at all,
     which is the only way to be certain it cannot disagree with the
     quote it is reporting on. */
  const exTax = tax ? tax.totalExcluding : null

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
            {money(total)}
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
