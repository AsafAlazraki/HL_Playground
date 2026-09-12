/* ============================================================
   PRICE BAR.

   MOST OF THESE ASSERT RULES RATHER THAN BEHAVIOUR, because the
   rules are where this surface can do real damage — it is the
   figure a dealer reads aloud to somebody standing beside them.

   · IT NEVER INVENTS A TAX RATE. `QUOTE_SPEC.md` §2: "no 29% BMT
     markup, no $159 labour rate, NO 10% GST DIVISOR". With no
     rate there is one figure and no sentence about tax, because
     the alternative is printing a number nobody entered on the
     document a customer is handed.

   · NULL IS A REAL STATE, counted and said out loud. A total that
     treats "not priced" as zero is wrong by exactly the amount
     nobody noticed.

   · THE FIGURE IS CORRECT ON THE FIRST PAINT. It does not count
     up, so the text is the final value immediately — asserted
     because a ticker is the single most obvious component to
     reach for here and the one most damaging.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PriceBar } from './PriceBar'

describe('PriceBar', () => {
  it('draws the total, correct on the first paint', () => {
    render(<PriceBar total={103_731} />)
    expect(screen.getByText('$103,731')).toBeInTheDocument()
  })

  describe('tax', () => {
    /* THE ONE THAT MATTERS MOST. A bar that quietly divides by 1.1
       is a bar that puts a figure on a customer's quote that came
       from this file rather than from the dealer's price file. */
    it('says NOTHING about tax when no rate is given', () => {
      render(<PriceBar total={100_000} caption="Package pricing" />)
      expect(screen.getByText('$100,000')).toBeInTheDocument()
      expect(screen.queryByText(/GST/i)).toBeNull()
      expect(screen.queryByText(/excl/i)).toBeNull()
      expect(screen.queryByText(/incl/i)).toBeNull()
    })

    it('takes the total apart when the rate says it is included', () => {
      render(
        <PriceBar total={103_731} tax={{ rate: 0.1, label: 'GST', included: true }} />,
      )
      expect(screen.getByText('$103,731')).toBeInTheDocument()
      /* 103,731 / 1.1 = 94,300.909… — not rounded, because a
         rounded display over an unrounded total is how two
         summations of one deal start to disagree. */
      expect(screen.getByText('$94,300.91')).toBeInTheDocument()
    })

    /* THE FLOATING-POINT ONE, and it is why this bar quantises to
       cents. `100000 * 1.1` is 110000.00000000001 in binary
       floating point; `money()` reads that as a non-integer and
       prints "$110,000.00" — cents that do not exist, on the
       largest figure on the screen, where the business writes
       "$110,000". Caught by this test before it shipped. */
    it('adds it on without inventing cents that do not exist', () => {
      render(
        <PriceBar total={100_000} tax={{ rate: 0.1, label: 'GST', included: false }} />,
      )
      expect(screen.getByText('$110,000')).toBeInTheDocument()
      expect(screen.queryByText('$110,000.00')).toBeNull()
      expect(screen.getByText('$100,000')).toBeInTheDocument()
    })

    it('uses the business word for it, not ours', () => {
      render(<PriceBar total={100} tax={{ rate: 0.2, label: 'VAT', included: true }} />)
      /* Twice, and both are right: the caption says what the total
         includes, the line under it says what the other figure
         excludes. */
      expect(screen.getAllByText(/VAT/)).toHaveLength(2)
    })
  })

  describe('lines it cannot price', () => {
    it('says so, and counts them', () => {
      render(<PriceBar total={1000} notPriced={3} />)
      expect(screen.getByText(/3 lines are not priced here/)).toBeInTheDocument()
    })

    it('reads as one line when there is one', () => {
      render(<PriceBar total={1000} notPriced={1} />)
      expect(screen.getByText(/1 line is not priced here/)).toBeInTheDocument()
    })

    it('is silent when every line has a price', () => {
      render(<PriceBar total={1000} notPriced={0} />)
      expect(screen.queryByText(/not priced here/)).toBeNull()
    })
  })

  describe('the price level', () => {
    it('marks the one in force and moves on a press', async () => {
      const onLevel = vi.fn()
      render(
        <PriceBar
          total={1000}
          levels={[
            { key: 'cash', label: 'Cash' },
            { key: 'trade', label: 'Trade' },
          ]}
          levelKey="cash"
          onLevel={onLevel}
        />,
      )
      expect(screen.getByRole('button', { name: 'Cash' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await userEvent.click(screen.getByRole('button', { name: 'Trade' }))
      expect(onLevel).toHaveBeenCalledWith('trade')
    })

    /* One rung is not a choice, and a chooser with one option is
       furniture that implies there is a decision to make. */
    it('is not drawn when there is only one rung', () => {
      render(<PriceBar total={1000} levels={[{ key: 'cash', label: 'Cash' }]} />)
      expect(screen.queryByRole('button', { name: 'Cash' })).toBeNull()
    })
  })

  it('carries the refusal under the action, as a sentence', () => {
    render(
      <PriceBar
        total={1000}
        action={<button type="button">Give it to the customer</button>}
        actionNote="This quote is addressed to nobody."
      />,
    )
    expect(screen.getByText('This quote is addressed to nobody.')).toBeInTheDocument()
  })

  /* The total is announced, not the delta: a screen reader told
     only "+$2,720" has been given a movement with no destination. */
  it('announces the figure politely', () => {
    render(<PriceBar total={1000} />)
    expect(screen.getByText('$1,000')).toHaveAttribute('aria-live', 'polite')
  })
})
