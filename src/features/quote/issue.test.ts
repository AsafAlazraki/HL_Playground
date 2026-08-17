/* ============================================================
   THE GATE ON "GIVE IT TO THE CUSTOMER".

   A quote could be issued carrying a price somebody had typed with no
   reason written beside it. Every other part of the override was right
   — it sits BESIDE the frozen figure, the document prints the original
   struck through, and the reason is asked for in a field that appears
   the moment a price is typed — and the one half that was missing is
   the half that cannot be repaired: issuing makes the document
   read-only, so a reason not written before the press can never be
   written at all. It is production's §3.5 (`window.__marginOverrideAudit`
   written and read by nothing) one step worse, because here it was
   never written.

   The decision, defended: BLOCK, rather than print "no reason given".
   A quote is the one document that leaves the building, and the freeze
   exists so that six weeks later somebody can answer "why is this
   $4,000 under list?" — an answer that has to be reconstructed is the
   thing this feature was written against. Blocking costs a
   salesperson one sentence at the moment they already know the answer;
   printing the absence costs the business the answer for good. Both,
   in fact: the DOCUMENT also prints "no reason given" now, because two
   documents can still reach that state — one issued before this gate
   existed, and one that arrived inside an imported file — and printing
   nothing there would present a typed price as though it came from the
   price file.

   FOUR PLACES HAVE TO AGREE, which is what these tests pin: the
   registry (`issueQuote` refuses), the foot bar (the button is
   disabled and the sentence names the line), the field (it says why it
   is being asked for) and the summation (`unexplainedOverrides`). The
   screens read the same function the registry does, so they cannot
   drift; a test that only checked the screen would not notice the
   registry letting it through.
   ============================================================ */
import { beforeEach, describe, expect, it } from 'vitest'

const { registerQuote, getQuote, issueQuote, setOverride, discardDraft } = await import('./quotes')
const { quoteTotals, unexplainedOverrides, needsOverrideReason } = await import('./totals')

import type { QuoteDef, QuoteLine } from './types'

/* ---------------------------------------------------------- */
/* the smallest honest quote — one hull, one motor             */
/* ---------------------------------------------------------- */

/* THE NAMES AND FIGURES ARE THE SEED'S OWN SHAPE, not invented
   marketing: a hull line and a motor line at plain round numbers,
   which is all this gate looks at. Nothing here reads the store, so
   nothing has to be seeded — the subject under test is arithmetic and
   a refusal. */
function line(id: string, label: string, unitPrice: number): QuoteLine {
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
    levels: [
      { key: 'cash', label: 'Cash', fieldId: 'fld_cash', value: unitPrice, scope: 'quote' },
    ],
  }
}

let n = 0
function draft(): QuoteDef {
  n += 1
  const hull = line(`l${n}a`, 'Highfield SP 560', 62000)
  const motor = line(`l${n}b`, 'Yamaha F150XC', 29000)
  const quote: QuoteDef = {
    id: `q${n}`,
    reference: `Q-${n}`,
    state: 'draft',
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_1',
    subjectLabel: 'Highfield SP 560',
    subjectSpecs: [],
    sections: [
      { blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: [hull.id] },
      { blockId: 'blk_motor', tableId: 'tbl_motors', title: 'Motors', lineIds: [motor.id] },
    ],
    lines: [hull, motor],
    adjustments: [],
    levelKey: 'cash',
    customer: { name: 'A customer' },
    createdAt: new Date(2026, 0, 1 + n).toISOString(),
    updatedAt: new Date(2026, 0, 1 + n).toISOString(),
  }
  registerQuote(quote)
  return quote
}

/* ---------------------------------------------------------- */

describe('a quote with an unexplained override may not be given out', () => {
  let id = ''
  let motorLineId = ''

  beforeEach(() => {
    const q = draft()
    id = q.id
    motorLineId = q.lines[1].id
  })

  it('issues cleanly when nothing was overridden', () => {
    expect(unexplainedOverrides(getQuote(id) as QuoteDef)).toEqual([])
    expect(issueQuote(id)).toBe(true)
    expect(getQuote(id)?.state).toBe('issued')
    expect(getQuote(id)?.issuedAt).toBeTruthy()
  })

  it('REFUSES the issue while a typed price has no reason, and stays a draft', () => {
    setOverride(id, motorLineId, 24000, undefined)
    const q = getQuote(id) as QuoteDef
    expect(q.lines[1].overridePrice).toBe(24000)
    expect(needsOverrideReason(q.lines[1])).toBe(true)

    expect(issueQuote(id)).toBe(false)
    /* THE WHOLE POINT: it is still editable, so the reason can still
       be written. A refusal that also froze the document would be the
       same trap one step further on. */
    expect(getQuote(id)?.state).toBe('draft')
    expect(getQuote(id)?.issuedAt).toBeUndefined()
  })

  it('names the line in the refusal, so the sentence says where to go', () => {
    setOverride(id, motorLineId, 24000, undefined)
    const blocked = unexplainedOverrides(getQuote(id) as QuoteDef)
    expect(blocked).toHaveLength(1)
    expect(blocked[0].label).toBe('Yamaha F150XC')
  })

  it('does not accept whitespace as a reason', () => {
    setOverride(id, motorLineId, 24000, '   ')
    /* `setOverride` drops a blank reason rather than storing one, so
       the two halves agree without either having to trim twice */
    expect(getQuote(id)?.lines[1].overrideReason).toBeUndefined()
    expect(issueQuote(id)).toBe(false)
  })

  it('lets it out the moment a reason is written', () => {
    setOverride(id, motorLineId, 24000, undefined)
    expect(issueQuote(id)).toBe(false)
    setOverride(id, motorLineId, 24000, 'matched a written quote from another dealer')
    expect(unexplainedOverrides(getQuote(id) as QuoteDef)).toEqual([])
    expect(issueQuote(id)).toBe(true)
    expect(getQuote(id)?.state).toBe('issued')
    /* and the reason travelled with it, which is what the document
       prints after "override" */
    expect(getQuote(id)?.lines[1].overrideReason).toBe(
      'matched a written quote from another dealer',
    )
  })

  it('lets it out when the override is taken off again', () => {
    setOverride(id, motorLineId, 24000, undefined)
    expect(issueQuote(id)).toBe(false)
    setOverride(id, motorLineId, undefined, undefined)
    expect(getQuote(id)?.lines[1].overridePrice).toBeUndefined()
    expect(issueQuote(id)).toBe(true)
  })

  it('counts the override in the total, so the gate is about real money', () => {
    setOverride(id, motorLineId, 24000, 'matched a written quote from another dealer')
    const q = getQuote(id) as QuoteDef
    /* 62,000 + 24,000, not 62,000 + 29,000: `lineAmount` charges the
       override and the document prints the original struck through */
    expect(quoteTotals(q).total).toBe(86000)
    expect(issueQuote(id)).toBe(true)
  })

  it('refuses a second issue, and refuses to issue a quote that is gone', () => {
    expect(issueQuote(id)).toBe(true)
    expect(issueQuote(id)).toBe(false)
    const other = draft()
    discardDraft(other.id)
    expect(issueQuote(other.id)).toBe(false)
  })
})
