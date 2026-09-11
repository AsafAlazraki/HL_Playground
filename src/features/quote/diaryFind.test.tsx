/* ============================================================
   FINDING A QUOTE IN THE DIARY — MODULE_SYSTEM §6.2's index, the
   half of it that was not already built.

   WHAT IS ASSERTED IS THE THRESHOLD AND THE REFUSAL, not the
   substring match. `matches` is the board's own and has had a suite
   beside it since the board was written (`pipeline/pipeline.test.ts`)
   — re-testing it here would be testing the same function twice and
   would not notice if the LIST stopped calling it.

   The four decisions this file pins:

     1 · no field below the measured threshold, because a filter over
         a list you can see whole is clutter
     2 · a field at it, because the eighth row is the first one the
         scrollport hides
     3 · the list is what narrows, and it says which of two counts is
         on screen
     4 · a find that holds nothing says so, quoting the string back —
         rule 10, in the place it failed

   IT IS `.tsx` FOR THE STORAGE AS WELL AS THE MARKUP: `useQuotes`
   reads `localStorage`, which the node project does not have. Same
   reason `quoteScope.test.tsx` carries the extension.

   ROLE AND TEXT, NEVER A CLASS. A test that asserted on `.qt-find`
   would pass on a screen with no label on the box.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { QuoteDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { FIND_FIELD_AT } from './find'
import { forgetQuotes } from './quotes'
import { QuoteList } from './QuoteList'

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

const ISO = '2026-01-01T00:00:00.000Z'
const KEY = 'helmlogic.quotes.v1'

/** The names are deliberately unalike: a fixture whose customers all
 *  begin with the same three letters cannot tell narrowing from
 *  luck. */
const WHO = [
  'Hargreaves',
  'Okafor',
  'Bell',
  'Ngata',
  'Vasquez',
  'Dunn',
  'Ilyich',
  'Marchetti',
  'Prasad',
]

const quote = (i: number): QuoteDef =>
  ({
    id: `q${i}`,
    reference: `NSM-000${i}`,
    state: 'draft',
    rootTableId: 'e-boat',
    rootRowId: `r${i}`,
    subjectLabel: i % 2 === 0 ? 'Highfield SP460' : 'Stacer 449',
    customer: { name: WHO[i] ?? `Person ${i}` },
    lines: [],
    adjustments: [],
    sections: [],
    createdAt: ISO,
    updatedAt: ISO,
  }) as unknown as QuoteDef

function seed(n: number): void {
  const org = useProjectStore.getState().meta.org
  const key = `${KEY}:${org?.slug ?? '__unnamed'}`
  localStorage.setItem(key, JSON.stringify(Array.from({ length: n }, (_, i) => quote(i))))
  forgetQuotes()
}

beforeEach(() => {
  localStorage.clear()
  forgetQuotes()
  useProjectStore.setState({ meta: { ...useProjectStore.getState().meta, org: undefined } })
  useProjectStore.getState().setOrganisation('Northside', 'marine')
})

const field = (): HTMLElement | null => screen.queryByLabelText(/find a quote/i)

describe('when the diary gets a find field at all', () => {
  it('has none one short of the threshold — the list is still the answer', () => {
    seed(FIND_FIELD_AT - 1)
    render(<QuoteList onOpen={() => {}} tableCount={53} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(FIND_FIELD_AT - 1)
    expect(field()).toBeNull()
  })

  it('has one AT the threshold, which is the first count that hides a row', () => {
    seed(FIND_FIELD_AT)
    render(<QuoteList onOpen={() => {}} tableCount={53} />)
    expect(field()).not.toBeNull()
  })
})

describe('narrowing it', () => {
  it('KEEPS ONLY WHAT MATCHES, and says which of the two counts is on screen', async () => {
    seed(FIND_FIELD_AT + 1)
    render(<QuoteList onOpen={() => {}} tableCount={53} />)
    const box = field()
    if (!box) throw new Error('the field should be drawn at this count')

    await userEvent.type(box, 'okafor')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText(`1 of ${FIND_FIELD_AT + 1}`)).toBeTruthy()
  })

  it('narrows on the SUBJECT as well as the customer — §6.2 asks for both', async () => {
    seed(FIND_FIELD_AT + 1)
    render(<QuoteList onOpen={() => {}} tableCount={53} />)
    const box = field()
    if (!box) throw new Error('the field should be drawn at this count')

    await userEvent.type(box, 'stacer')
    const rows = screen.getAllByRole('listitem')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThan(FIND_FIELD_AT + 1)
  })

  it('gives the whole diary back when the box is cleared', async () => {
    seed(FIND_FIELD_AT)
    render(<QuoteList onOpen={() => {}} tableCount={53} />)
    const box = field()
    if (!box) throw new Error('the field should be drawn at this count')

    await userEvent.type(box, 'okafor')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    await userEvent.clear(box)
    expect(screen.getAllByRole('listitem')).toHaveLength(FIND_FIELD_AT)
  })
})

describe('a find that holds nothing', () => {
  it('SAYS SO WHERE THE LIST WAS, and quotes the string back', async () => {
    seed(FIND_FIELD_AT)
    render(<QuoteList onOpen={() => {}} tableCount={53} />)
    const box = field()
    if (!box) throw new Error('the field should be drawn at this count')

    await userEvent.type(box, 'Hargraves')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(/Hargraves/)).toBeTruthy()
  })

  /* AND IT DOES NOT LOOK LIKE AN EMPTY DIARY. "A quote freezes its
     prices the day you hand it over" is the sentence for a person who
     has never raised one; showing it to somebody with eight quotes
     and a typo would be the app claiming their work had gone. */
  it('never draws the never-quoted-before screen over a full diary', async () => {
    seed(FIND_FIELD_AT)
    render(<QuoteList onOpen={() => {}} tableCount={53} />)
    const box = field()
    if (!box) throw new Error('the field should be drawn at this count')

    await userEvent.type(box, 'Hargraves')
    expect(screen.queryByText(/freezes its prices/i)).toBeNull()
  })
})
