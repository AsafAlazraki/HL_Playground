/* ============================================================
   HOW A FIGURE IS SET, pinned against the real seed.

   Three formats were reaching one row of an item block, measured on
   the Formosa page:

     DEALER LIST PRICE  $8,228        0 decimals, currency mark
     LANDED CTD          7,928.68     2 decimals, no mark
                         9,359.4      ONE decimal, no mark

   and in the Parts block, `MU 0.28` — a markup RATIO — sitting
   between two prices with nothing to say it was not a third one.

   Every case below is a column that exists in `src/demos/northside.ts`
   with the band the workbook filed it under, and the reading of it is
   the adjudicated one:

     CTD  = Cost To Dealer                HELMLOGIC_GROUND_TRUTH.md:91
     GP   = Gross Profit, in DOLLARS      MPF_GROUND_TRUTH.md:92
     MU   = Markup, a RATIO (GP / CTD)    MPF_GROUND_TRUTH.md §6.6-6.7
     P&A  = "P&A cost (ex GST)"           MPF_GROUND_TRUTH.md §6.7

   None of it is inferred from the shape of a number, and the ratio
   cases are the ones worth breaking a build over: `$0.28` is a lie
   about the business's own arithmetic.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { money } from '@/lib/money'
import { formatNumber, isMoney } from './columns'

describe('money', () => {
  it('has ONE format: grouped, marked, and cents only where there are cents', () => {
    expect(money(8228)).toBe('$8,228')
    expect(money(7928.68)).toBe('$7,928.68')
    /* the reported raggedness: 9,359.4 must not print with one decimal */
    expect(money(9359.4)).toBe('$9,359.40')
  })

  it('never rounds a figure away', () => {
    /* Motor Library!R for the F2.5, verbatim from the workbook */
    expect(money(1155.0002541000001)).toBe('$1,155.00')
    expect(money(8227.5)).toBe('$8,227.50')
  })

  it('sets a negative with a real minus sign', () => {
    expect(money(-1760)).toBe('−$1,760')
  })

  it('prints nothing for a figure that is not one', () => {
    expect(money(Number.NaN)).toBe('')
    expect(money(Number.POSITIVE_INFINITY)).toBe('')
  })
})

describe('isMoney — by the column name', () => {
  it('reads the business’s own words for a cost', () => {
    expect(isMoney('Landed CTD', 'Cost Ladder')).toBe(true)
    expect(isMoney('Nett CTD', 'Cost Ladder')).toBe(true)
    expect(isMoney('Total Nett CTD', 'Margin')).toBe(true)
    expect(isMoney('Parts & Accessories 1 CTD', 'Contents')).toBe(true)
    expect(isMoney('Dealer List Price', 'Cost Ladder')).toBe(true)
    expect(isMoney('RRP + Freight Inc GST', 'Retail Pricing')).toBe(true)
    /* GP is Gross Profit in dollars, not a percentage */
    expect(isMoney('GP', 'Fitted Pricing')).toBe(true)
    expect(isMoney('GP ($)', 'Kit Pricing')).toBe(true)
  })

  it('takes a $ in the name at its word', () => {
    expect(isMoney('Rego ($)', 'Registration')).toBe(true)
    expect(isMoney('NSM Lab ($)', 'Install')).toBe(true)
    expect(isMoney('Labour ($)', 'Fitted Pricing')).toBe(true)
  })
})

describe('isMoney — by the band, where no name could say', () => {
  it('finds the brand-specific freight and compliance columns', () => {
    /* the seed’s own header note, Boat Module cols IQ and IX: one
       physical column, five different brand labels, every one of them
       money. No regex over these words will ever find a price. */
    for (const name of ['ABP Compl.', 'Aus Spec', 'Dazmac', 'IYT Logistics', 'Handling']) {
      expect(isMoney(name, 'Cost Build')).toBe(true)
    }
    expect(isMoney('Stamp Duty', 'Cost Build')).toBe(true)
  })

  it('finds P&A and Base List under Supply Pricing', () => {
    expect(isMoney('P&A', 'Supply Pricing')).toBe(true)
    expect(isMoney('Base List', 'Supply Pricing')).toBe(true)
  })

  it('finds the bare ladder rungs under a pricing band', () => {
    expect(isMoney('Dealer', 'Kit Pricing')).toBe(true)
    expect(isMoney('Factory', 'Kit Pricing')).toBe(true)
    expect(isMoney('Settlement', 'Pricing')).toBe(true)
    expect(isMoney('Discount', 'Pricing')).toBe(true)
    expect(isMoney('Sundry 1', 'Labour & Sundries')).toBe(true)
    expect(isMoney('Total Lab', 'Labour & Sundries')).toBe(true)
    expect(isMoney('Total PD Allowance', 'PRE DELIVERY CHARGES')).toBe(true)
    expect(isMoney('Actual', 'Rate')).toBe(true)
  })

  it('leaves a measurement band alone', () => {
    expect(isMoney('Air Chambers', 'Construction')).toBe(false)
    expect(isMoney('Cabins', 'Construction')).toBe(false)
    expect(isMoney('Draft', 'Identity')).toBe(false)
    expect(isMoney('Beam', 'Identity')).toBe(false)
    expect(isMoney('HP Rating', 'Identity & Spec')).toBe(false)
    expect(isMoney('Min HP', 'Motor Envelope')).toBe(false)
    expect(isMoney('Order', 'Pairing')).toBe(false)
  })
})

describe('a ratio is never money', () => {
  it('leaves MU a ratio in every band it appears in', () => {
    /* MU = GP / CTD. Four tables carry it, all four inside a pricing
       band, and `$0.28` would be a lie about the arithmetic. */
    expect(isMoney('MU', 'Supply Pricing')).toBe(false)
    expect(isMoney('MU', 'Kit Pricing')).toBe(false)
    expect(isMoney('MU', 'Fitted Pricing')).toBe(false)
    expect(isMoney('MU', 'Pricing')).toBe(false)
    expect(isMoney('MU %', 'Margin')).toBe(false)
    expect(isMoney('HO - MU', 'Markups')).toBe(false)
  })

  it('leaves hours alone — the input to a charge is not the charge', () => {
    expect(isMoney('TTF (Hours)', 'Fitted Pricing')).toBe(false)
    expect(isMoney('NSM Lab (Hrs)', 'Install')).toBe(false)
    expect(isMoney('Lab Hrs', 'Primary Accessory')).toBe(false)
  })

  it('leaves a column carrying its own unit alone', () => {
    expect(isMoney('Boat Weight kg', 'Cost Build')).toBe(false)
    expect(isMoney('GP %', 'Margin')).toBe(false)
  })
})

describe('formatNumber', () => {
  it('sets the three reported figures one way', () => {
    expect(formatNumber(8227.5, 'Dealer List Price', 'Cost Ladder')).toBe('$8,227.50')
    expect(formatNumber(7928.68, 'Landed CTD', 'Cost Ladder')).toBe('$7,928.68')
    expect(formatNumber(9359.4, 'Nett CTD', 'Cost Ladder')).toBe('$9,359.40')
  })

  it('sets the Parts block so the ratio cannot be read as a price', () => {
    expect(formatNumber(118, 'P&A', 'Supply Pricing')).toBe('$118')
    expect(formatNumber(141.6, 'CTD', 'Supply Pricing')).toBe('$141.60')
    expect(formatNumber(0.28, 'MU', 'Supply Pricing')).toBe('0.28')
  })

  it('sets a ratio to the same two decimals down the whole column', () => {
    /* the same raggedness, one column over: 0.27 · 0.7 · 0.47 */
    expect(formatNumber(0.27, 'MU', 'Supply Pricing')).toBe('0.27')
    expect(formatNumber(0.7, 'MU', 'Supply Pricing')).toBe('0.70')
    expect(formatNumber(0.47, 'MU', 'Supply Pricing')).toBe('0.47')
    expect(formatNumber(0.2513, 'MU %', 'Margin')).toBe('0.25')
    /* and a measurement keeps its own precision — 600 kg is not 600.00 */
    expect(formatNumber(600, 'Tare (Kg)', 'Identity & Spec')).toBe('600')
    expect(formatNumber(6.75, 'Hull Length (mtr)', 'Identity')).toBe('6.75')
    expect(formatNumber(2.5, 'TTF (Hours)', 'Fitted Pricing')).toBe('2.5')
  })

  it('gives a plain number a minimum of no decimals and a maximum of two', () => {
    expect(formatNumber(5.66, 'Hull Length (mtr)', 'Identity')).toBe('5.66')
    expect(formatNumber(1188, 'Hull Weight (Dry) kg', 'Capacity')).toBe('1,188')
  })

  it('still decides on the name alone when a table has no bands', () => {
    expect(formatNumber(1234, 'Sell Price')).toBe('$1,234')
    expect(formatNumber(1234, 'Column 1')).toBe('1,234')
  })
})
