/* ============================================================
   THE LINK BETWEEN A QUOTE AND A CUSTOMER — and the promise it is
   not allowed to break.

   The whole feature rests on one sentence, and every test below is
   a way of asking it:

     A QUOTE PRINTS FROM FROZEN VALUES. The customer's row id is
     kept for ONE question — "what else have we quoted them?" — and
     for nothing that is drawn, totalled or printed.

   So the tests that matter are the destructive ones. Rename the
   customer, and the document handed over last week still says what
   it said. Delete them from the register, and every document still
   opens, still prints and still totals. Those two are the reason
   `customer` and `customerRef` are two fields instead of one, and
   if either ever fails, the quote has stopped being a photograph
   and Monday's price can move by Friday.

   THE STRUCTURAL PROMISE IS TESTED TOO: the register is a table
   like any other, made once, undoable in ONE step, and never made
   by anything except the button that names it.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuoteDef, QuoteLine } from '@/features/quote/types'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async () => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const {
  CUSTOMER_EMAIL_FIELD,
  CUSTOMER_NOTE_FIELD,
  CUSTOMER_PHONE_FIELD,
  CUSTOMER_TABLE_ID,
  addCustomer,
  customerRegister,
  ensureCustomerRegister,
  readCustomer,
  removeCustomer,
  setCustomerCell,
} = await import('./index')
const { customerBook, fileCustomer, freezeCustomer, hasCustomerRegister } = await import(
  '@/features/quote/freeze'
)
const {
  getQuote,
  issueQuote,
  linkCustomer,
  quotesForCustomer,
  registerQuote,
  unlinkCustomer,
} = await import('@/features/quote/quotes')
const { quoteTotals } = await import('@/features/quote/totals')
const { normQuotes } = await import('@/features/io/envelope')

const store = () => useProjectStore.getState()

/** one turn of the event loop — a history burst closes on the next
 *  microtask, which is what makes "one undo step" checkable */
const turn = (): Promise<void> => Promise.resolve()

const nameFieldId = (): string => {
  const table = customerRegister(store().entities)
  if (!table) throw new Error('no register')
  return table.fields[0].id
}

/* -- the smallest honest quote, all of it frozen -------------- */

let n = 0
function draft(over: Partial<QuoteDef> = {}): QuoteDef {
  n += 1
  const hull: QuoteLine = {
    id: `l${n}`,
    entityId: 'tbl_boats',
    rowId: 'row_1',
    label: 'A hull',
    qty: 1,
    unitPrice: 62000,
    priceFieldId: 'fld_cash',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [
      { key: 'cash', label: 'Cash', fieldId: 'fld_cash', value: 62000, scope: 'quote' },
    ],
  }
  const quote: QuoteDef = {
    id: `q${n}`,
    reference: `2026010${n}-01`,
    state: 'draft',
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_1',
    subjectLabel: 'A hull',
    subjectSpecs: [],
    sections: [
      { blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: [hull.id] },
    ],
    lines: [hull],
    adjustments: [],
    levelKey: 'cash',
    customer: { name: '' },
    createdAt: new Date(2026, 0, 1 + n).toISOString(),
    updatedAt: new Date(2026, 0, 1 + n).toISOString(),
    ...over,
  }
  registerQuote(quote)
  return quote
}

beforeEach(() => {
  /* a clean project every time: `replaceProject` also clears the
     history stacks, which is what makes the undo assertions honest */
  store().replaceProject({ name: 'Test Sheet', entities: [], groups: [], rules: [], rowsByEntity: {} })
})

/* ============================================================
   MAKING THE REGISTER
   ============================================================ */

describe('the register is a table like any other', () => {
  it('is not there until somebody asks for it', () => {
    expect(customerRegister(store().entities)).toBeUndefined()
    expect(hasCustomerRegister()).toBe(false)
    expect(customerBook()).toEqual([])
  })

  it('arrives with the well-known id, a name column and the four contact columns', () => {
    const table = ensureCustomerRegister()
    expect(table.id).toBe(CUSTOMER_TABLE_ID)
    expect(table.fields.map((f) => f.name)).toEqual([
      'Name',
      'Phone',
      'Email',
      'Address',
      'Notes',
    ])
    /* the LABEL column is the app's ordinary elected one, not a
       private constant of this feature */
    expect(table.fields[0].id).not.toBe(CUSTOMER_PHONE_FIELD)
    expect(table.description).toBeTruthy()
  })

  it('is made once — asking twice returns the same table and adds no columns', () => {
    const first = ensureCustomerRegister()
    const again = ensureCustomerRegister()
    expect(again.id).toBe(first.id)
    expect(store().entities[CUSTOMER_TABLE_ID].fields).toHaveLength(5)
    expect(Object.keys(store().entities)).toHaveLength(1)
  })

  it('is ONE undo step, not seven', async () => {
    ensureCustomerRegister()
    await turn()
    expect(store().past).toHaveLength(1)
    store().undo()
    expect(customerRegister(store().entities)).toBeUndefined()
  })

  it('survives being renamed and re-columned — it is still the register', () => {
    const table = ensureCustomerRegister()
    store().updateEntity(table.id, { name: 'Clients' })
    store().removeField(table.id, CUSTOMER_NOTE_FIELD)
    store().addField(table.id, { name: 'ABN', type: 'text' })
    const found = customerRegister(store().entities)
    expect(found?.name).toBe('Clients')
    expect(found?.fields.map((f) => f.name)).toEqual(['Name', 'Phone', 'Email', 'Address', 'ABN'])
  })
})

/* ============================================================
   FREEZING ONE ONTO A QUOTE
   ============================================================ */

describe('picking a customer freezes them onto the document', () => {
  let rowId = ''

  beforeEach(() => {
    ensureCustomerRegister()
    const row = addCustomer({
      [nameFieldId()]: 'R. Kelleher',
      [CUSTOMER_PHONE_FIELD]: '0400 000 000',
      [CUSTOMER_EMAIL_FIELD]: 'rk@example.test',
      [CUSTOMER_NOTE_FIELD]: 'chased twice about the 2023 invoice',
    })
    rowId = row?.id ?? ''
  })

  it('copies the name and the printable contact lines, and NOT the note', () => {
    const frozen = freezeCustomer(rowId)
    expect(frozen?.customer).toEqual({
      name: 'R. Kelleher',
      contact: ['0400 000 000', 'rk@example.test'],
    })
    expect(JSON.stringify(frozen)).not.toContain('2023 invoice')
  })

  it('keeps the row id beside the frozen details, never instead of them', () => {
    const frozen = freezeCustomer(rowId)
    expect(frozen?.customerRef).toEqual({ tableId: CUSTOMER_TABLE_ID, rowId })
  })

  it('returns null for a row that has gone, so nothing writes a link to nothing', () => {
    expect(freezeCustomer('not-a-row')).toBeNull()
  })

  it('writes both halves of the link in one act', () => {
    const q = draft()
    const frozen = freezeCustomer(rowId)
    if (frozen) linkCustomer(q.id, frozen)
    expect(getQuote(q.id)?.customer.name).toBe('R. Kelleher')
    expect(getQuote(q.id)?.customerRef?.rowId).toBe(rowId)
  })

  /* ---------------------------------------------------------- */
  /* THE TWO THAT MATTER                                        */
  /* ---------------------------------------------------------- */

  it('DOES NOT RE-ADDRESS ITSELF when the register is corrected afterwards', () => {
    const q = draft()
    const frozen = freezeCustomer(rowId)
    if (frozen) linkCustomer(q.id, frozen)

    setCustomerCell(rowId, nameFieldId(), 'Rob Kelleher')
    setCustomerCell(rowId, CUSTOMER_PHONE_FIELD, '0400 111 111')

    /* the register moved on, the document did not */
    expect(readCustomer(store().entities[CUSTOMER_TABLE_ID], store().rowsByEntity[CUSTOMER_TABLE_ID][0]).name).toBe('Rob Kelleher')
    expect(getQuote(q.id)?.customer).toEqual({
      name: 'R. Kelleher',
      contact: ['0400 000 000', 'rk@example.test'],
    })
    /* and it is still THEIR quote — the link is what followed them */
    expect(quotesForCustomer(rowId).map((x) => x.id)).toEqual([q.id])
  })

  it('STILL PRINTS AND STILL TOTALS after the customer is deleted', () => {
    const q = draft()
    const frozen = freezeCustomer(rowId)
    if (frozen) linkCustomer(q.id, frozen)
    issueQuote(q.id)

    removeCustomer(rowId)

    const after = getQuote(q.id) as QuoteDef
    expect(after.state).toBe('issued')
    expect(after.customer.name).toBe('R. Kelleher')
    expect(after.customer.contact).toEqual(['0400 000 000', 'rk@example.test'])
    expect(quoteTotals(after).total).toBe(62000)
    /* the pointer is all that is dangling, and only the history
       question reads it */
    expect(after.customerRef?.rowId).toBe(rowId)
    expect(customerBook()).toEqual([])
  })
})

/* ============================================================
   THE HISTORY WITH THEM
   ============================================================ */

describe('what else have we quoted them', () => {
  let rowId = ''
  let otherId = ''

  beforeEach(() => {
    ensureCustomerRegister()
    rowId = addCustomer({ [nameFieldId()]: 'R. Kelleher' })?.id ?? ''
    otherId = addCustomer({ [nameFieldId()]: 'R. Kelleher' })?.id ?? ''
  })

  it('matches on the id, so two people with the same name are two people', () => {
    const a = draft()
    const b = draft()
    const one = freezeCustomer(rowId)
    const two = freezeCustomer(otherId)
    if (one) linkCustomer(a.id, one)
    if (two) linkCustomer(b.id, two)

    expect(quotesForCustomer(rowId).map((q) => q.id)).toEqual([a.id])
    expect(quotesForCustomer(otherId).map((q) => q.id)).toEqual([b.id])
  })

  it('has nothing to say about a quote addressed to a typed name', () => {
    const q = draft({ customer: { name: 'A walk-in' } })
    expect(q.customerRef).toBeUndefined()
    expect(quotesForCustomer('')).toEqual([])
    expect(quotesForCustomer(rowId)).toEqual([])
  })
})

/* ============================================================
   UNLINKING, FILING, AND THE ISSUED GATE
   ============================================================ */

describe('the link can be taken off without touching the document', () => {
  it('keeps every printed word and drops only the pointer', () => {
    ensureCustomerRegister()
    const rowId = addCustomer({ [nameFieldId()]: 'R. Kelleher' })?.id ?? ''
    const q = draft()
    const frozen = freezeCustomer(rowId)
    if (frozen) linkCustomer(q.id, frozen)

    unlinkCustomer(q.id)

    expect(getQuote(q.id)?.customer.name).toBe('R. Kelleher')
    expect(getQuote(q.id)?.customerRef).toBeUndefined()
    expect(quotesForCustomer(rowId)).toEqual([])
  })
})

describe('filing a typed name', () => {
  it('REFUSES when there is no register — typing a name is not asking for a table', () => {
    expect(fileCustomer('R. Kelleher', ['0400 000 000'])).toBeNull()
    expect(customerRegister(store().entities)).toBeUndefined()
    expect(Object.keys(store().entities)).toHaveLength(0)
  })

  it('adds a ROW when there is one, carrying the lines already typed on the quote', () => {
    ensureCustomerRegister()
    const frozen = fileCustomer('R. Kelleher', ['0400 000 000', 'rk@example.test'])
    expect(frozen?.customer).toEqual({
      name: 'R. Kelleher',
      contact: ['0400 000 000', 'rk@example.test'],
    })
    const book = customerBook()
    expect(book).toHaveLength(1)
    expect(book[0].name).toBe('R. Kelleher')
  })
})

describe('an issued quote is closed to this like everything else', () => {
  it('refuses to be re-addressed after it has been given to somebody', () => {
    ensureCustomerRegister()
    const rowId = addCustomer({ [nameFieldId()]: 'R. Kelleher' })?.id ?? ''
    const q = draft({ customer: { name: 'A walk-in' } })
    issueQuote(q.id)
    expect(getQuote(q.id)?.state).toBe('issued')

    const frozen = freezeCustomer(rowId)
    if (frozen) linkCustomer(q.id, frozen)
    unlinkCustomer(q.id)

    expect(getQuote(q.id)?.customer.name).toBe('A walk-in')
    expect(getQuote(q.id)?.customerRef).toBeUndefined()
  })
})

/* ============================================================
   ACROSS A FILE BOUNDARY
   ============================================================ */

describe('the link travels in an export and never re-prices anything', () => {
  const stamp = '2026-01-01T00:00:00.000Z'

  it('carries both halves through a round trip', () => {
    ensureCustomerRegister()
    const rowId = addCustomer({
      [nameFieldId()]: 'R. Kelleher',
      [CUSTOMER_PHONE_FIELD]: '0400 000 000',
    })?.id ?? ''
    const q = draft()
    const frozen = freezeCustomer(rowId)
    if (frozen) linkCustomer(q.id, frozen)

    const wire = JSON.parse(JSON.stringify([getQuote(q.id)])) as unknown
    const back = normQuotes(wire, stamp)

    expect(back).toHaveLength(1)
    expect(back[0].customer).toEqual({ name: 'R. Kelleher', contact: ['0400 000 000'] })
    expect(back[0].customerRef).toEqual({ tableId: CUSTOMER_TABLE_ID, rowId })
    expect(quoteTotals(back[0]).total).toBe(62000)
  })

  it('drops a malformed pointer and keeps the document whole', () => {
    const q = draft({ customer: { name: 'R. Kelleher' } })
    const wire = JSON.parse(JSON.stringify([getQuote(q.id)])) as Array<Record<string, unknown>>
    wire[0].customerRef = { tableId: 'a table', rowId: '../../etc' }

    const back = normQuotes(wire, stamp)
    expect(back[0].customerRef).toBeUndefined()
    expect(back[0].customer.name).toBe('R. Kelleher')
    expect(quoteTotals(back[0]).total).toBe(62000)
  })
})
