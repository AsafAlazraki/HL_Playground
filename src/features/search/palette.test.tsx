/* ============================================================
   THE PALETTE, RENDERED — and the two kinds nothing else can show.

   WHY THIS SUITE EXISTS AND WHY IT IS `.tsx`. Three of the five
   kinds UX_PASS §2 asks for end at a table, and `onReveal` — the
   door this feature has always had — carries them. MODULES and
   QUOTES do not: a module opens a module workspace and a quote opens
   a document, both of which are the shell's `Stage`, and this
   feature does not reach into it. So they arrive as two optional
   props, and until a host passes them there is no screen anywhere in
   the application on which those two kinds can be looked at.

   THE DOOR IS THE CAPABILITY, and that is the thing worth a test
   rather than a paragraph. §2's fourth rule is "a result a person
   cannot open does not appear for them"; the half of it that is
   enforceable in a build with no per-person role is that a host
   which cannot open a module does not get modules offered. Asserted
   both ways below: absent without the prop, present with it.

   ASSERTED BY ROLE AND BY TEXT, NEVER BY CLASS — the house rule for
   a rendering test here, and the reason the four suites that came
   before this one exist at all. A test that asserts on `.hs-opt`
   passes on a screen with no names on it.

   THE FIXTURE IS SYNTHETIC AND TINY. The real file is asserted
   against next door in `rowSearch.northside.test.ts`, which pays ~7s
   at import for the privilege. Proving that a quote line prints its
   own total does not need 23,000 lines of real catalogue.
   ============================================================ */

/* `autoFocus` here is `SearchFieldProps.autoFocus` — a documented
   component prop meaning "take the keyboard on mount", set by the
   one surface that exists only to hold this field. It is not the DOM
   attribute the rule is about, and the rule cannot tell the two
   apart. A palette that did not have the keyboard would be a palette
   nothing could be typed into, which is every test below. */
/* eslint-disable jsx-a11y/no-autofocus */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { SearchField } = await import('./SearchField')
const { useProjectStore } = await import('@/store/useProjectStore')
const { registerQuote } = await import('@/features/quote')
const { forgetQuotes } = await import('@/features/quote/quotes')
const { clearRecent } = await import('./recent')

const stamp = '2020-01-01T00:00:00.000Z'

const table = (id: string, name: string): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind: 'boat',
  fields: [
    { id: `${id}.name`, name: 'Name', type: 'text' },
    { id: `${id}.tare`, name: 'Zeta Weight', type: 'number' },
  ],
  displayFieldId: `${id}.name`,
  position: { x: 0, y: 0 },
  createdAt: stamp,
  updatedAt: stamp,
})

const place: ModuleDef = {
  id: 'm1',
  name: 'Zeta Places',
  description: 'the quiet ones',
  tableIds: ['ta'],
  capabilities: ['browse', 'search', 'open'],
  index: 'rows',
  accent: 'blue',
  order: 0,
  createdAt: stamp,
  updatedAt: stamp,
}

function seed(): void {
  useProjectStore.setState({
    entities: { ta: table('ta', 'Zeta Table') },
    rowsByEntity: {
      ta: [
        {
          id: 'r1',
          entityId: 'ta',
          values: { 'ta.name': 'Zeta Boat' },
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
    },
    modules: { m1: place },
  })
  registerQuote({
    id: 'q1',
    reference: 'ZQ-1',
    state: 'draft',
    viewId: 'v1',
    rootTableId: 'ta',
    rootRowId: 'r1',
    subjectLabel: 'Zeta Boat',
    subjectSpecs: [],
    sections: [],
    lines: [
      {
        id: 'l1',
        entityId: 'ta',
        rowId: 'r1',
        label: 'One thing',
        qty: 1,
        unitPrice: 1234,
        priceFieldId: null,
        priceColumnName: null,
        levelKey: 'sell',
        levelResolved: 'sell',
        levels: [],
      },
    ],
    adjustments: [],
    levelKey: 'sell',
    customer: { name: 'Casey Quill' },
    createdAt: stamp,
    updatedAt: stamp,
  })
}

/** Open the palette and ask it a question. */
async function ask(
  query: string,
  props: Parameters<typeof SearchField>[0] = {},
): Promise<void> {
  render(<SearchField autoFocus {...props} />)
  await userEvent.type(screen.getByRole('combobox'), query)
}

const optionNames = (): string[] =>
  screen.queryAllByRole('option').map((o) => o.getAttribute('aria-label') ?? o.textContent ?? '')

beforeEach(() => {
  clearRecent()
  forgetQuotes()
  seed()
})

describe('the palette draws all five kinds', () => {
  it('offers no module and no quote when the host gave it no door', () => {
    /* §2 rule 4, enforced on the one capability that is real today:
       a host that cannot open a module is a place where a module
       result cannot be opened, so it is not drawn. */
    return ask('zeta').then(() => {
      expect(screen.queryByRole('group', { name: 'Modules' })).toBeNull()
      expect(screen.queryByRole('group', { name: 'Quotes' })).toBeNull()
      /* the three kinds that end at a table are unaffected */
      expect(screen.getByRole('group', { name: 'Columns' })).toBeTruthy()
    })
  })

  it('offers the place once the host can open one, and says what is in it', async () => {
    await ask('zeta', { onOpenModule: () => {} })
    const group = screen.getByRole('group', { name: 'Modules' })
    const [option] = within(group).getAllByRole('option')
    expect(option.getAttribute('aria-label')).toBe(
      'Zeta Places — a place, 1 row in 1 table',
    )
  })

  it('offers the document, and prints its own total', async () => {
    await ask('quill', { onOpenQuote: () => {} })
    const group = screen.getByRole('group', { name: 'Quotes' })
    const [option] = within(group).getAllByRole('option')
    expect(option.getAttribute('aria-label')).toContain('draft quote ZQ-1')
    expect(option.getAttribute('aria-label')).toContain('for Casey Quill')
    /* the figure is the document's own, printed and not animated */
    expect(option.textContent).toContain('$1,234')
  })

  it('answers a column name with the table that declares it', async () => {
    await ask('zeta weight')
    const group = screen.getByRole('group', { name: 'Columns' })
    const [option] = within(group).getAllByRole('option')
    expect(option.getAttribute('aria-label')).toBe(
      'Zeta Weight — a column in Zeta Table',
    )
  })

  it('paints the five kinds in one fixed order', async () => {
    await ask('zeta', { onOpenModule: () => {}, onOpenQuote: () => {} })
    /* the flat cursor walks this list, so the painted order IS the
       keyboard order — places, tables, rows, quotes, columns */
    expect(optionNames()).toEqual([
      'Zeta Places — a place, 1 row in 1 table',
      'Zeta Table — 2 cols · 1 row',
      'Zeta Boat — in Zeta Table',
      expect.stringContaining('draft quote ZQ-1'),
      'Zeta Weight — a column in Zeta Table',
    ])
  })
})

describe('one key, acting on what is under the cursor', () => {
  it('hands the place to the module door and nothing else', async () => {
    const opened: string[] = []
    const revealed: string[] = []
    await ask('zeta', {
      onOpenModule: (id) => opened.push(id),
      onReveal: (id) => revealed.push(id),
    })
    await userEvent.keyboard('{Enter}')
    expect(opened).toEqual(['m1'])
    expect(revealed).toEqual([])
  })

  it('hands a column to the table door, because a column is a fact about a table', async () => {
    const revealed: Array<[string, string | undefined]> = []
    await ask('zeta weight', { onReveal: (id, rowId) => revealed.push([id, rowId]) })
    await userEvent.keyboard('{Enter}')
    expect(revealed).toEqual([['ta', undefined]])
  })

  it('draws the key that acts on the row, on the row it acts on', async () => {
    /* Superhuman's teaching move. It is drawn on every row and inked
       on one, so the cursor moving cannot shift a label — which is
       why this asserts it is PRESENT on every option rather than
       present on one. */
    await ask('zeta')
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(1)
    for (const option of options) {
      expect(option.textContent).toContain('↵')
    }
  })
})

describe('what the palette says about itself', () => {
  it('counts the columns it can now answer', async () => {
    render(<SearchField autoFocus />)
    /* nothing typed: the resting foot is the accounting, and it names
       columns because they are the kind nobody would guess is
       searchable */
    expect(screen.getByText('1 named rows · 1 tables · 2 columns')).toBeTruthy()
  })

  it('no longer claims columns are out of scope when nothing matched', async () => {
    /* the refusal used to read "not their other columns", which is
       now the opposite of what happens. What is still NOT searched is
       the value inside a cell, and that is what it says. */
    await ask('nothingatall')
    expect(
      screen.getByText(/never the values inside cells/, { exact: false }),
    ).toBeTruthy()
  })
})
