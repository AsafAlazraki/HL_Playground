/* ============================================================
   WHAT A STAGE CHANGE DOES.

   Every function under test is pure and takes its inputs as
   arguments, so none of this needs a browser, a store or a clock —
   the same shape `pipeline.test.ts` keeps.

   WHAT IS PINNED HERE IS THE PART A REGRESSION WOULD BE SILENT
   ABOUT: that a stage asking for nothing says nothing, that a
   demand is never raised against a document that already meets it,
   that the reasons come from `issueBlockers` rather than from a
   second opinion written here, and — the one that matters most —
   that NOTHING IN THIS PATH MUTATES THE QUOTE. `stageTrigger.ts`
   argues at length why entering a stage must not issue a document;
   an assertion is worth more than the argument.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { QuoteDef } from '@/types/model'
import { issueBlockers } from '@/features/quote/totals'
import { NOT_LOCKED, arrivalClause, lockDemand, locksButOpen } from './stageTrigger'
import { DEFAULT_STAGES, type StageDef } from './stageStore'

const STAMP = '2026-08-01T00:00:00.000Z'

/** the few fields the demand actually reads. Cast once, here, the
 *  way `pipeline.test.ts` does, rather than building a whole
 *  document per case. */
const quote = (q: Partial<QuoteDef> & { id: string }): QuoteDef =>
  ({
    reference: q.id,
    state: 'draft',
    viewId: 'v',
    rootTableId: 'boats',
    rootRowId: 'r',
    subjectLabel: 'A boat',
    subjectSpecs: [],
    customer: { name: 'Ellis' },
    lines: [],
    adjustments: [],
    sections: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...q,
  }) as unknown as QuoteDef

const stage = (s: Partial<StageDef> & { id: string }): StageDef => ({
  name: s.id,
  about: '',
  tone: 'neutral',
  wash: 'none',
  closed: false,
  locks: false,
  ...s,
})

const WON = stage({ id: 'won', name: 'Won', locks: true, closed: true })
const OPEN = stage({ id: 'negotiating', name: 'Negotiating' })

/* ---------------------------------------------------------- */

describe('which stages ask for anything', () => {
  /* THE SHIPPED BOARD ASKS ONCE. A build where every column
     demanded something would put a mark on most of the board on
     the first afternoon. */
  it('ships exactly one column that locks, and it is Won', () => {
    expect(DEFAULT_STAGES.filter((s) => s.locks).map((s) => s.id)).toEqual(['won'])
  })

  it('says nothing about a column that asks for nothing', () => {
    expect(locksButOpen(OPEN, quote({ id: 'a' }))).toBe(false)
    expect(lockDemand(OPEN, quote({ id: 'a' }))).toBeNull()
    expect(arrivalClause(OPEN, quote({ id: 'a' }))).toBe('')
  })

  /* A DEAL WHOSE STAGE IS NOT IN THE LIST — the case `stageOf`
     covers, where a stored id and a stored stage list disagree.
     Nothing is drawn rather than a demand against no column. */
  it('says nothing when there is no stage at all', () => {
    expect(locksButOpen(undefined, quote({ id: 'a' }))).toBe(false)
    expect(lockDemand(undefined, quote({ id: 'a' }))).toBeNull()
    expect(arrivalClause(undefined, quote({ id: 'a' }))).toBe('')
  })
})

describe('a demand is about the document, not about the column', () => {
  /* THE WHOLE POINT OF `stages.ts` HELD IN ONE ASSERTION: a card
     standing in Won says nothing about whether its prices are
     locked. The document does. */
  it('raises the demand on a draft standing in a locking column', () => {
    const d = lockDemand(WON, quote({ id: 'a' }))
    expect(d?.word).toBe(NOT_LOCKED)
    expect(d?.say).toBe('Won locks its prices and this quote is still a draft.')
  })

  it('raises nothing once the document is issued', () => {
    const issued = quote({ id: 'a', state: 'issued', issuedAt: STAMP })
    expect(locksButOpen(WON, issued)).toBe(false)
    expect(lockDemand(WON, issued)).toBeNull()
    expect(arrivalClause(WON, issued)).toBe('')
  })

  /* AND THE STAGE'S NAME IS THE DEALERSHIP'S, not this file's.
     A column renamed "Sold" must not be reported as "Won". */
  it('uses the name the dealership gave the column', () => {
    const sold = stage({ id: 'won', name: 'Sold', locks: true })
    expect(lockDemand(sold, quote({ id: 'a' }))?.say).toContain('Sold locks its prices')
  })
})

describe('the route it offers', () => {
  /* A QUOTE THAT COULD GO OUT TODAY IS TOLD WHERE THE DOOR IS —
     and the irreversibility is stated at the moment it is relevant
     rather than in a spec. */
  it('names the door and says the act is final, when nothing is in the way', () => {
    const d = lockDemand(
      WON,
      quote({
        id: 'a',
        lines: [{ id: 'l1', label: 'Hull', qty: 1, unitPrice: 74_990 }],
      } as never),
    )
    expect(d?.why).toEqual([])
    expect(d?.next).toContain('Open the quote')
    expect(d?.next).toContain('Nothing on it can change after that.')
  })

  /* A DEAD END IS NOT OFFERED. Sending somebody to a button that
     will refuse them is the "told half the truth" failure
     QuoteEditor.tsx:218 is written against. */
  it('withholds the route and prints the document reasons instead', () => {
    const q = quote({ id: 'a', customer: { name: '' } } as never)
    const d = lockDemand(WON, q)
    expect(d?.next).toBe('It cannot go to the customer yet:')
    expect(d?.why.length).toBeGreaterThan(0)
    /* VERBATIM FROM THE ONE FUNCTION. A second opinion written here
       is how the board and the editor start disagreeing about
       whether a quote may be issued. */
    expect(d?.why).toEqual(issueBlockers(q))
  })
})

describe('what the move says', () => {
  it('reports the demand at the moment the card lands', () => {
    expect(arrivalClause(WON, quote({ id: 'a' }))).toBe(
      'Prices are locked there and this one is still a draft.',
    )
  })

  /* IT NEVER NAMES THE COLUMN, because the sentence it is appended
     to has just named it. */
  it('does not repeat the column name', () => {
    expect(arrivalClause(WON, quote({ id: 'a' }))).not.toContain('Won')
  })
})

/* ---------------------------------------------------------- */

describe('the trigger does not touch the document', () => {
  /* THE ASSERTION THE WHOLE FILE HEADER IS ABOUT. Reading a demand
     — on the board, in the toast, in the pane — must leave the
     quote exactly as it was found. If a future change makes stage
     entry issue the quote, this is what fails. */
  it('leaves the quote byte-for-byte as it was found', () => {
    const q = quote({ id: 'a' })
    const before = JSON.stringify(q)
    locksButOpen(WON, q)
    lockDemand(WON, q)
    arrivalClause(WON, q)
    expect(JSON.stringify(q)).toBe(before)
    expect(q.state).toBe('draft')
  })
})
