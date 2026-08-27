/* ============================================================
   THE TWO SCREENS, ACTUALLY RENDERED.

   `history.test.ts` pins the arithmetic. This pins the SCREENS: it
   mounts the real components, through the real quote registry and
   the real project store, and reads the markup that comes out.

   WHY IT IS WORTH THE TROUBLE. Every fault this file has caught in
   other features of this repo is the same shape — the logic was
   right and the screen never said it. A list that renders nothing
   because a hook returned early, a sentence that is missing because
   its condition was inverted, a version mark drawn on every row
   because the "more than one" test was `>= 1`. None of those is
   visible to a unit test of the function underneath.

   HOW IT RUNS WITHOUT A BROWSER. `renderToStaticMarkup` needs no
   DOM, and this app's modules are careful about that already: the
   quote registry guards every `localStorage` and `window` touch, so
   in node it simply keeps its records in memory. The ONE global
   anything here needs is `window.location`, which
   `@/lib/imageSources` reads to tell a same-origin picture from a
   remote one — the same single stub its own test uses.

   `useEffect` does not run in a static render, which is exactly
   right for what is being asked: everything below is what the screen
   says on FIRST PAINT, before any probe, any subscription or any
   measurement. If a fact is only true after an effect, it was not
   true when the person looked.

   THE ORDER OF THE SUITES IS LOAD-BEARING. The quote registry is
   module state with no reset hook, so the empty-diary suite runs
   FIRST and everything after it is seeded. Said out loud because a
   reordering would silently break it.
   ============================================================ */

import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { EntityDef, RowData } from '@/types/model'
import type { QuoteDef, QuoteLine } from '@/features/quote'

/* The one global the picture machinery reads. Assigned before any
   import runs anything — the module only touches it inside
   functions, but the components are imported below. */
;(globalThis as unknown as { window: unknown }).window = {
  location: { href: 'http://localhost:5090/', origin: 'http://localhost:5090' },
}

/* THE PROJECT STORE IS DOUBLED, AND THE REASON IS SPECIFIC.

   zustand v5 hands `useSyncExternalStore` its INITIAL state as the
   server snapshot, so under `renderToStaticMarkup` every
   `useProjectStore(selector)` reads the state the store was created
   with and nothing a test writes afterwards can reach it. That is a
   property of the harness and not of the app — this app never renders
   on a server — but it makes the register unreachable from here, and
   the register is half of what the customer page draws.

   So the module is replaced with the smallest thing that has the same
   shape: one object, a selector call, `getState` and `setState`. It
   is deliberately not a zustand store; a second real store would just
   reproduce the same snapshot rule. Nothing under test is softened —
   the components still read the store exactly as they do in the app,
   through the same two selectors and the same `getState` that
   `whyNotAgain` uses. This also keeps Dexie out of the run, which a
   render test has no business waking. */
vi.mock('@/store/useProjectStore', () => {
  const state: { entities: unknown; rowsByEntity: unknown } = {
    entities: {},
    rowsByEntity: {},
  }
  const hook = (select: (s: unknown) => unknown): unknown => select(state)
  hook.getState = (): unknown => state
  hook.setState = (patch: Record<string, unknown>): void => {
    Object.assign(state, patch)
  }
  return { useProjectStore: hook }
})

const { useProjectStore } = (await import('@/store/useProjectStore')) as unknown as {
  useProjectStore: { setState: (patch: Record<string, unknown>) => void }
}
const { registerQuote } = await import('@/features/quote')
const {
  CUSTOMER_TABLE_ID,
  CUSTOMER_PHONE_FIELD,
  CUSTOMER_EMAIL_FIELD,
} = await import('@/features/crm')
const { QuoteHistory } = await import('./QuoteHistory')
const { CustomerHistory } = await import('./CustomerHistory')
const { HistoryStage } = await import('./HistoryStage')
const { whyNotAgain } = await import('./again')

/* ---------------------------------------------------------- */
/* fixtures — shapes, not sample data                         */
/* ---------------------------------------------------------- */

const daysAgo = (n: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(11, 0, 0, 0)
  return d.toISOString()
}

function line(id: string, label: string, unitPrice: number | null): QuoteLine {
  return {
    id,
    entityId: 'tbl_boats',
    rowId: `row_${id}`,
    label,
    qty: 1,
    unitPrice,
    priceFieldId: 'f_cash',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [],
  }
}

interface Make {
  id: string
  reference: string
  createdAt: string
  updatedAt?: string
  state?: 'draft' | 'issued'
  supersedesId?: string
  customerRow?: string
  customerName?: string
  subject: string
  lines?: QuoteLine[]
}

function quote(m: Make): QuoteDef {
  const lines = m.lines ?? []
  return {
    id: m.id,
    reference: m.reference,
    state: m.state ?? 'draft',
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: `subject_${m.id}`,
    subjectLabel: m.subject,
    subjectSpecs: [],
    sections: [
      { blockId: 'b1', tableId: 'tbl_boats', title: 'Motors', lineIds: lines.map((l) => l.id) },
    ],
    lines,
    adjustments: [],
    levelKey: 'cash',
    customer: {
      name: m.customerName ?? '',
      ...(m.customerRow ? { contact: ['0400 111 222'] } : {}),
    },
    ...(m.customerRow
      ? { customerRef: { tableId: CUSTOMER_TABLE_ID, rowId: m.customerRow } }
      : {}),
    ...(m.supersedesId ? { supersedesId: m.supersedesId } : {}),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt ?? m.createdAt,
  }
}

const noop = (): void => {}

const draw = (el: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(el)

/* ---------------------------------------------------------- */

describe('an empty diary is honest about being empty', () => {
  it('names the place, counts what you already have, and gives one act that works', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('Nothing to quote from yet')
    expect(html).toContain('Every quote you write stays here')
    /* the store has no tables in this run, so the count is 0 and the
       route has to start one surface earlier — it must NOT tell
       somebody to open a table that is not there */
    expect(html).toContain('<strong>0 tables</strong>')
    expect(html).toContain('A quote is written from a row, so a table comes first.')
    expect(html).not.toContain('press <em>Fitment</em>')
  })

  it('draws no filter bar and no drafts shelf when there is nothing to filter', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).not.toContain('Pick up where you left off')
    expect(html).not.toContain('hy-filters')
  })
})

/* ---------------------------------------------------------- */

describe('the diary, with quotes in it', () => {
  beforeAll(() => {
    seed()
  })

  it('heads the page with counted facts and nothing projected', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('Every quote you have written.')
    /* 4 quotes: two versions of one, a draft, and a walk-in */
    expect(html).toContain('>4</span><span class="hy-fig-of">quotes')
    expect(html).toContain('>1</span><span class="hy-fig-of">still open')
    expect(html).toContain('>2</span><span class="hy-fig-of">given')
    expect(html).toContain('>1</span><span class="hy-fig-of">replaced')
  })

  it('puts unfinished work at the top, with one primary act on it', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('Pick up where you left off')
    expect(html).toContain('One draft, still being written.')
    expect(html).toContain('ds-btn ds-btn--primary ds-btn--sm')
    expect(html).toContain('Resume')
  })

  it('draws the three standings with their counts', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('Draft<span class="hy-chip-n">1</span>')
    expect(html).toContain('Given<span class="hy-chip-n">2</span>')
    expect(html).toContain('Replaced<span class="hy-chip-n">1</span>')
  })

  it('offers each customer with their own count, and the typed names as their own pile', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('Rob Kelleher (3)')
    expect(html).toContain('Typed names, not in the register (1)')
  })

  it('cuts the list into days and names today as Today', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('>Today</h2>')
  })

  it('marks a reissued quote with its version and leaves a one-off unmarked', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('v2/2')
    expect(html).toContain('v1/2')
    expect(html).not.toContain('v1/1')
  })

  it('offers a customer their own history only when there is somewhere to send it', () => {
    const without = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(without).not.toContain('Their history')
    const with_ = draw(
      createElement(QuoteHistory, { onOpenQuote: noop, onOpenCustomer: noop }),
    )
    expect(with_).toContain('Their history')
  })

  it('says a quote has no customer rather than leaving the space blank', () => {
    const html = draw(createElement(QuoteHistory, { onOpenQuote: noop }))
    expect(html).toContain('no customer yet')
  })
})

/* ---------------------------------------------------------- */

describe('one customer', () => {
  beforeAll(() => {
    seed()
    seedSheet()
  })

  it('heads the page with the register name and the details it holds NOW', () => {
    const html = draw(
      createElement(CustomerHistory, { rowId: 'cust_a', onOpenQuote: noop }),
    )
    expect(html).toContain('Robert Kelleher')
    expect(html).toContain('0400 000 000')
    expect(html).toContain('rob@example.invalid')
  })

  it('shows the freeze working rather than confessing it as a fault', () => {
    const html = draw(
      createElement(CustomerHistory, { rowId: 'cust_a', onOpenQuote: noop }),
    )
    expect(html).toContain('Their documents were addressed to')
    expect(html).toContain('<strong>Rob Kelleher</strong>')
    expect(html).toContain('<strong>R Kelleher</strong>')
  })

  it('splits their quotes into what is open, what was given and what was replaced', () => {
    const html = draw(
      createElement(CustomerHistory, { rowId: 'cust_a', onOpenQuote: noop }),
    )
    expect(html).toContain('Still being written')
    expect(html).toContain('Given to them')
    expect(html).toContain('Replaced by a later version')
  })

  it('names a line dropped between versions, and words it as a question rather than a decision', () => {
    const html = draw(
      createElement(CustomerHistory, { rowId: 'cust_a', onOpenQuote: noop }),
    )
    expect(html).toContain('Offered, and on nothing current')
    expect(html).toContain('Bimini top')
    expect(html).toContain('rather than a list of things they turned down')
    /* the motor is still on their current quote, so it is not on this
       list and must not appear anywhere on the page */
    expect(html).not.toContain('Yamaha F70')
  })

  it('offers a second quote that starts from what is already known', () => {
    const html = draw(
      createElement(CustomerHistory, { rowId: 'cust_a', onOpenQuote: noop }),
    )
    expect(html).toContain('Quote them again')
    expect(html).toContain('priced at today')
  })

  it('draws a back control only when the caller has somewhere to go back to', () => {
    const without = draw(
      createElement(CustomerHistory, { rowId: 'cust_a', onOpenQuote: noop }),
    )
    expect(without).not.toContain('hy-back')
    const with_ = draw(
      createElement(CustomerHistory, { rowId: 'cust_a', onOpenQuote: noop, onBack: noop }),
    )
    expect(with_).toContain('All quotes')
  })

  it('is honest about somebody who has been quoted nothing', () => {
    const html = draw(
      createElement(CustomerHistory, { rowId: 'cust_nobody', onOpenQuote: noop }),
    )
    expect(html).toContain('Nothing has been quoted to them yet.')
    expect(html).not.toContain('Quote them again')
  })
})

/* ---------------------------------------------------------- */

describe('the stage', () => {
  beforeAll(() => {
    seed()
    seedSheet()
  })

  it('opens on the diary', () => {
    const html = draw(createElement(HistoryStage, { onOpenQuote: noop }))
    expect(html).toContain('Every quote you have written.')
  })

  it('lands on one customer when it is handed one', () => {
    const html = draw(
      createElement(HistoryStage, { onOpenQuote: noop, customerId: 'cust_a' }),
    )
    expect(html).toContain('Customer history')
    expect(html).toContain('Robert Kelleher')
  })
})

/* ---------------------------------------------------------- */

describe('why writing another one would be wrong', () => {
  beforeAll(() => {
    seed()
  })

  it('says the row has gone, and that the document still opens', () => {
    /* nothing was ever put in the store under `tbl_boats`, which is
       the same state as a table deleted after a quote was written */
    const why = whyNotAgain(
      quote({ id: 'x', reference: 'X', createdAt: daysAgo(1), subject: 'Highfield SP520' }),
    )
    expect(why).toContain('is not on the sheet any more')
    expect(why).toContain('still opens and still prints')
  })
})

/* ---------------------------------------------------------- */
/* the seeds                                                  */
/* ---------------------------------------------------------- */

function seed(): void {
  registerQuote(
    quote({
      id: 'q_v1',
      reference: '20260817-01',
      createdAt: daysAgo(10),
      state: 'issued',
      customerRow: 'cust_a',
      customerName: 'R Kelleher',
      subject: 'Highfield SP520',
      lines: [line('l1', 'Yamaha F70', 12000), line('l2', 'Bimini top', 900)],
    }),
  )
  registerQuote(
    quote({
      id: 'q_v2',
      reference: '20260824-01',
      createdAt: daysAgo(3),
      state: 'issued',
      supersedesId: 'q_v1',
      customerRow: 'cust_a',
      customerName: 'Rob Kelleher',
      subject: 'Highfield SP520',
      lines: [line('l3', 'Yamaha F70', 12500)],
    }),
  )
  registerQuote(
    quote({
      id: 'q_draft',
      reference: '20260827-01',
      createdAt: daysAgo(0),
      customerRow: 'cust_a',
      customerName: 'Rob Kelleher',
      subject: 'Stacer 429 Proline',
      lines: [line('l4', 'Dunbier trailer', 4000)],
    }),
  )
  registerQuote(
    quote({
      id: 'q_walkin',
      reference: '20260718-01',
      createdAt: daysAgo(40),
      state: 'issued',
      subject: 'Highfield SP520',
      lines: [line('l5', 'Suzuki DF60', 9000)],
    }),
  )
}

function seedSheet(): void {
  const now = new Date().toISOString()
  const table: EntityDef = {
    id: CUSTOMER_TABLE_ID,
    name: 'Customers',
    accent: 'teal',
    kind: 'custom',
    fields: [
      { id: 'f_name', name: 'Name', type: 'text' },
      { id: CUSTOMER_PHONE_FIELD, name: 'Phone', type: 'text' },
      { id: CUSTOMER_EMAIL_FIELD, name: 'Email', type: 'text' },
    ],
    displayFieldId: 'f_name',
    position: { x: 0, y: 0 },
    createdAt: now,
    updatedAt: now,
  }
  const row: RowData = {
    id: 'cust_a',
    entityId: CUSTOMER_TABLE_ID,
    values: {
      f_name: 'Robert Kelleher',
      [CUSTOMER_PHONE_FIELD]: '0400 000 000',
      [CUSTOMER_EMAIL_FIELD]: 'rob@example.invalid',
    },
    createdAt: now,
    updatedAt: now,
  }
  /* AND THE SHEET THE QUOTES WERE WRITTEN FROM. "Quote them again"
     prices the same ROW at today's figures, so it is offerable only
     while that row is still there — which is the refusal pinned at
     the bottom of this file, and this is the other half of it. */
  const boats: EntityDef = {
    id: 'tbl_boats',
    name: 'Highfield Inflatables',
    accent: 'blue',
    kind: 'boat',
    fields: [{ id: 'f_model', name: 'Model', type: 'text' }],
    displayFieldId: 'f_model',
    position: { x: 0, y: 0 },
    createdAt: now,
    updatedAt: now,
  }
  const hull = (id: string, name: string): RowData => ({
    id,
    entityId: 'tbl_boats',
    values: { f_model: name },
    createdAt: now,
    updatedAt: now,
  })

  useProjectStore.setState({
    entities: { [CUSTOMER_TABLE_ID]: table, tbl_boats: boats },
    rowsByEntity: {
      [CUSTOMER_TABLE_ID]: [row],
      tbl_boats: [
        hull('subject_q_v1', 'Highfield SP520'),
        hull('subject_q_v2', 'Highfield SP520'),
        hull('subject_q_draft', 'Stacer 429 Proline'),
        hull('subject_q_walkin', 'Highfield SP520'),
      ],
    },
  })
}
