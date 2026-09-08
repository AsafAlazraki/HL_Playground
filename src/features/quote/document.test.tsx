/* ============================================================
   THE DOCUMENT, RENDERED — the one artefact that leaves the
   building, and until now the only one with nothing under it.

   WHY A RENDERING SUITE AND NOT MORE ARITHMETIC. `issue.test.ts`
   already pins the override GATE — four places agreeing that a typed
   price with no reason cannot be issued. What nothing pinned is what
   the page then SAYS. The override prints as two figures in one cell
   with a strike-through across the first, and a strike-through is a
   drawing: it is not in the text, so it is not in what a screen
   reader speaks, what a copy-paste into an email carries, or what a
   plain-text export would hold. Commit ce85394 fixed exactly this
   failure one screen over and recorded that the component test which
   would have caught it did not exist. This is that test, for the
   surface where it matters most.

   ASSERTED BY ROLE AND BY TEXT, NEVER BY CLASS — CLAUDE.md's own
   rule, and the reason the picker's duplicated eyebrow was found by a
   test and not by three people reading the screen. A test that
   asserted on `.qt-was` would pass on a document that says "$310
   $240" and fail on one that is renamed.

   NO STORE IS SET UP, AND THAT IS THE COMPONENT'S WHOLE POINT.
   `QuoteDocument` takes a `QuoteDef` and reads nothing else —
   QUOTE_SPEC §3's invariant, stated there as "a quote renders from
   its own `lines` and `adjustments` and nothing else". If this suite
   ever needs a mock, that invariant has been broken and the mock is
   the evidence.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

const { QuoteDocument } = await import('./QuoteDocument')

import type { QuoteDef, QuoteLine } from './types'

/* ---------------------------------------------------------- */
/* the smallest honest quote — the shape issue.test.ts uses,   */
/* because two fixtures for one document is how two documents  */
/* start to disagree                                            */
/* ---------------------------------------------------------- */

function line(id: string, label: string, unitPrice: number | null): QuoteLine {
  return {
    id,
    entityId: 'tbl_boats',
    rowId: `row_${id}`,
    label,
    qty: 1,
    unitPrice,
    priceFieldId: 'fld_cash',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [{ key: 'cash', label: 'Cash', fieldId: 'fld_cash', value: unitPrice, scope: 'quote' }],
  }
}

function quoteOf(lines: QuoteLine[], over: Partial<QuoteDef> = {}): QuoteDef {
  return {
    id: 'q1',
    reference: '20260817-01',
    state: 'issued',
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_1',
    subjectLabel: 'Highfield SP 560',
    subjectSpecs: [],
    sections: [
      { blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: lines.map((l) => l.id) },
    ],
    lines,
    adjustments: [],
    levelKey: 'cash',
    customer: { name: 'Margaret Whitlock' },
    organisation: 'Northside Marine',
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
    issuedAt: '2026-08-17T00:00:00.000Z',
    ...over,
  }
}

/** the row a line is drawn in, found by the line's own name */
function rowFor(name: string): HTMLElement {
  const cell = screen.getByText(name).closest('tr')
  expect(cell).not.toBeNull()
  return cell as HTMLElement
}

/* ---------------------------------------------------------- */

describe('an overridden line says which figure is being charged', () => {
  const overridden = (): QuoteLine => ({
    ...line('l1', 'Stainless bollard', 310),
    overridePrice: 240,
    overrideReason: 'matched a competitor quote',
  })

  it('reads as a sentence, not as two bare figures', () => {
    render(<QuoteDocument quote={quoteOf([overridden()])} />)
    /* THE ASSERTION IS THE WHOLE FIX. Before, this row's text was
       "$310$240" — the only thing separating them was a line drawn
       across the first, which no reading but a sighted one receives. */
    expect(rowFor('Stainless bollard')).toHaveTextContent('Price file $310, charged $240')
  })

  it('still prints the reason the person typed, beside the line', () => {
    render(<QuoteDocument quote={quoteOf([overridden()])} />)
    expect(rowFor('Stainless bollard')).toHaveTextContent('matched a competitor quote')
  })

  it('prints the absence as an absence when no reason was ever written', () => {
    /* two documents can still reach this state — one issued before the
       gate existed, one that arrived inside an imported file — and
       printing nothing would present a typed price as though the price
       file had said it */
    const l = { ...overridden() }
    delete l.overrideReason
    render(<QuoteDocument quote={quoteOf([l])} />)
    expect(rowFor('Stainless bollard')).toHaveTextContent('no reason given')
  })

  it('says nothing extra on a line nobody overrode', () => {
    render(<QuoteDocument quote={quoteOf([line('l1', 'Stainless bollard', 310)])} />)
    const row = rowFor('Stainless bollard')
    expect(row).toHaveTextContent('$310')
    expect(row.textContent).not.toContain('Price file')
    expect(row.textContent).not.toContain('charged')
  })
})

describe('the figures a customer reads', () => {
  it('never renders an unpriced line as zero', () => {
    /* QUOTE_SPEC §2.7 and the playbook's own unpriced rule: the Brazil
       SLX 260 prints `$0*` as the total of a $200,000 boat. Suppress
       the number, never invent one. */
    render(<QuoteDocument quote={quoteOf([line('l1', 'Bow roller assembly', null)])} />)
    const row = rowFor('Bow roller assembly')
    expect(row).toHaveTextContent('not priced here')
    expect(row.textContent).not.toContain('$0')
  })

  it('counts the unpriced lines out loud and keeps them out of the total', () => {
    render(
      <QuoteDocument
        quote={quoteOf([line('l1', 'Highfield SP 560', 62000), line('l2', 'Bow roller assembly', null)])}
      />,
    )
    expect(
      screen.getByText(
        '1 line on this quote has no price in the price file and is not in the total.',
      ),
    ).toBeTruthy()
  })

  it('names the business and the reference in the title block', () => {
    render(<QuoteDocument quote={quoteOf([line('l1', 'Highfield SP 560', 62000)])} />)
    expect(screen.getByText('Northside Marine')).toBeTruthy()
    /* twice, and deliberately: the plate at the head, and the footer
       at the foot. QUOTE_SPEC §6.7 asks the footer to carry the date
       and the reference so a page that gets separated can still be
       identified. */
    expect(screen.getAllByText('20260817-01')).toHaveLength(2)
    expect(screen.getAllByText('17 Aug 2026')).toHaveLength(2)
    /* the dealer's own name is not uppercased on their own paper —
       DESIGN_PRINCIPLES rule 3, and it was `NORTHSIDE MARINE` once */
    expect(screen.getByText('Northside Marine').textContent).toBe('Northside Marine')
  })

  it('says on it that it replaces another quotation', () => {
    render(
      <QuoteDocument
        quote={quoteOf([line('l1', 'Highfield SP 560', 62000)], { supersedesId: 'q0' })}
      />,
    )
    expect(screen.getByText('Revised quotation')).toBeTruthy()
  })
})
