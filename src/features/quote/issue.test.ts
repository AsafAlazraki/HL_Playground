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

const { registerQuote, getQuote, issueQuote, setOverride, discardDraft, patchQuote } =
  await import('./quotes')
const { quoteTotals, unexplainedOverrides, needsOverrideReason, issueBlockers } =
  await import('./totals')

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
function draft(over: Partial<QuoteDef> = {}): QuoteDef {
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
    ...over,
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

/* ============================================================
   THE SAME CLASS OF HOLE, THE OTHER THREE CASES.

   The override gate above was the only one closed. Measured on the live
   app: opening Stabicraft - 1450 Explorer, pressing "Quote this one"
   and pressing "Give it to the customer" without touching the customer
   field ISSUED the quote, and the frozen document printed the
   placeholder sentence where a name belongs. Issuing is the one
   irreversible act in this app — `mutate` refuses every edit afterwards
   and the only remaining action is "Make a new version" — so a document
   addressed to nobody was now permanent.

   Each ruling is argued in `issueBlockers` (totals.ts). These pin the
   registry, which is the line that makes the refusal true: a test that
   only read the screen would not notice `issueQuote` letting it
   through, which is exactly how this shipped.
   ============================================================ */

describe('a quote with no customer on it may not be given to a customer', () => {
  it('REFUSES the issue, and stays a draft so the name can still be typed', () => {
    const q = draft({ customer: { name: '' } })
    expect(issueQuote(q.id)).toBe(false)
    expect(getQuote(q.id)?.state).toBe('draft')
    expect(getQuote(q.id)?.issuedAt).toBeUndefined()
  })

  it('does not accept whitespace as a name — it prints as a blank', () => {
    const q = draft({ customer: { name: '   ' } })
    expect(issueQuote(q.id)).toBe(false)
  })

  it('lets it out the moment a name is typed, and the name travels with it', () => {
    const q = draft({ customer: { name: '' } })
    expect(issueQuote(q.id)).toBe(false)
    patchQuote(q.id, { customer: { name: 'R. Kelleher' } })
    expect(issueBlockers(getQuote(q.id) as QuoteDef)).toEqual([])
    expect(issueQuote(q.id)).toBe(true)
    expect(getQuote(q.id)?.customer.name).toBe('R. Kelleher')
  })

  it('says why, and says it where the name is typed', () => {
    const q = draft({ customer: { name: '' } })
    const why = issueBlockers(getQuote(q.id) as QuoteDef)
    expect(why).toHaveLength(1)
    /* the sentence names the field, and says why it cannot wait */
    expect(why[0]).toContain('customer name at the top')
    expect(why[0]).toContain('freezes the document')
  })
})

describe('a quote with nothing on it may not be given to a customer', () => {
  /* NOT REACHABLE FROM THE APP'S OWN PATH — the subject is minted as a
     line and the subject's line has no remove control. It is reachable
     from a FILE: `normQuote` reads a quotes block whose lines all fail
     narrowing and hands back an editable draft with none. */
  it('REFUSES an empty document, however it got here', () => {
    const q = draft({ lines: [], adjustments: [], sections: [] })
    expect(issueQuote(q.id)).toBe(false)
    expect(issueBlockers(getQuote(q.id) as QuoteDef)[0]).toContain('nothing on this quote to offer')
  })
})

/** A line on a table with no price column: `unitPrice: null`, which is
 *  "not priced here" and never a nought. */
const unpriced = (id: string, label: string): QuoteLine => ({
  ...line(id, label, 0),
  unitPrice: null,
  priceFieldId: null,
  priceColumnName: null,
  levels: [],
})

const oneLine = (l: QuoteLine): Partial<QuoteDef> => ({
  lines: [l],
  sections: [{ blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: [l.id] }],
})

describe('a quote that comes to nothing may not be given to a customer', () => {
  it('REFUSES a document whose every line is "not priced here"', () => {
    const q = draft(oneLine(unpriced('lz', 'Stabicraft 1450 Explorer')))
    expect(quoteTotals(getQuote(q.id) as QuoteDef).total).toBe(0)
    expect(issueQuote(q.id)).toBe(false)
    expect(issueBlockers(getQuote(q.id) as QuoteDef)[0]).toContain('comes to $0')
  })

  it('REFUSES a boat the price file holds at a literal nought', () => {
    /* The seed's own Haines Signature boats: "Signature Fisher - 525F,
       $0" on the Boats module today. `unitPrice: 0` is a real number and
       not a null, so the null check alone would have let this out at
       Total $0 — which is why the gate is on the TOTAL. */
    const q = draft(oneLine(line('lq', 'Signature Fisher - 525F', 0)))
    expect(quoteTotals(getQuote(q.id) as QuoteDef).unpricedCount).toBe(0)
    expect(quoteTotals(getQuote(q.id) as QuoteDef).total).toBe(0)
    expect(issueQuote(q.id)).toBe(false)
  })

  it('ALLOWS an even swap, because a person stated it', () => {
    /* 62,000 against a 62,000 trade-in. Two visible rows, the dealer's
       own words in the trade-in's label, and a document that says so.
       Refusing every nought would invent a pricing policy the dealer's
       data does not contain. */
    const hull = line('lp', 'Highfield SP 560', 62000)
    const q = draft({
      ...oneLine(hull),
      adjustments: [
        { id: 'adj_swap', kind: 'tradeIn', label: 'Stacer 429 Outlaw', amount: -62000 },
      ],
    })
    expect(quoteTotals(getQuote(q.id) as QuoteDef).total).toBe(0)
    expect(issueBlockers(getQuote(q.id) as QuoteDef)).toEqual([])
    expect(issueQuote(q.id)).toBe(true)
  })

  it('does not treat a fresh adjustment row, still at nought, as a decision', () => {
    /* `addAdjustment` starts a row at 0 with an empty label. A quote
       that comes to nothing does not become issuable because somebody
       pressed "Add a discount" and typed nothing into it. */
    const q = draft({
      ...oneLine(unpriced('lr', 'Stabicraft 1450 Explorer')),
      adjustments: [{ id: 'adj_blank', kind: 'discount', label: '', amount: 0 }],
    })
    expect(issueQuote(q.id)).toBe(false)
  })

  it('allows one unpriced line among priced ones — the document says so itself', () => {
    /* Pinned so the new gate cannot creep into the existing behaviour:
       `.qt-unpriced` prints "1 line ... is not in the total", which is
       the honest answer when the rest of the quote carries figures. */
    const hull = line('lm', 'Highfield SP 560', 62000)
    const nil = unpriced('ln', 'Bow rail')
    const q = draft({
      lines: [hull, nil],
      sections: [
        { blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: [hull.id, nil.id] },
      ],
    })
    const now = getQuote(q.id) as QuoteDef
    expect(quoteTotals(now).unpricedCount).toBe(1)
    expect(quoteTotals(now).total).toBe(62000)
    expect(issueBlockers(now)).toEqual([])
    expect(issueQuote(q.id)).toBe(true)
  })
})

describe('every reason is reported, not just the first one', () => {
  it('names both the missing customer and the nought total', () => {
    const q = draft({
      customer: { name: '' },
      ...oneLine(unpriced('lb', 'Stabicraft 1450 Explorer')),
    })
    /* A person who fixes one refusal and is then refused for a second
       nobody mentioned has been told half the truth. */
    expect(issueBlockers(getQuote(q.id) as QuoteDef)).toHaveLength(2)
    expect(issueQuote(q.id)).toBe(false)
  })
})
