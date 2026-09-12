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

    /* IT DRAWS BOTH FIGURES AND DERIVES NEITHER. An earlier draft
       took a rate and divided, which is a second summation of one
       deal — QUOTE_SPEC §1's named fault. These are the numbers
       `quoteTotals()` returns together. */
    it('draws the figure it was handed, to the cent', () => {
      render(
        <PriceBar total={103_731} tax={{ label: 'GST', totalExcluding: 94_300.91 }} />,
      )
      expect(screen.getByText('$103,731')).toBeInTheDocument()
      expect(screen.getByText('$94,300.91')).toBeInTheDocument()
    })

    /* THE FLOATING-POINT TRAP, GONE BY CONSTRUCTION. `100000 * 1.1`
       is 110000.00000000001 in binary floating point, and `money()`
       correctly reads that as a non-integer and prints
       "$110,000.00" — cents that do not exist, where the business
       writes "$110,000". A bar that never multiplies cannot
       produce it. */
    it('cannot invent cents, because it never does the arithmetic', () => {
      render(
        <PriceBar total={110_000} tax={{ label: 'GST', totalExcluding: 100_000 }} />,
      )
      expect(screen.getByText('$110,000')).toBeInTheDocument()
      expect(screen.queryByText('$110,000.00')).toBeNull()
      expect(screen.getByText('$100,000')).toBeInTheDocument()
    })

    it('uses the business word for it, not ours', () => {
      render(<PriceBar total={120} tax={{ label: 'VAT', totalExcluding: 100 }} />)
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
