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
const { clearRecent, rememberPick } = await import('./recent')
/* THE REAL IDENTITY, not a stand-in for it. `DECISIONS.md` §2 wired
   sign-in to a `roleId`; the block at the foot of this file drives
   that wiring rather than the index's argument, so the last inch —
   palette asks `useSessionRoleId`, session answers, `mayDo` enforces
   — is covered by something rather than by a paragraph. */
const { demoAccount, signIn, signOut, setSessionRole } = await import('@/features/auth')

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
  /* NO SESSION unless a test asks for one. `useSessionRoleId` reads
     storage, and a signed-in role left behind by one case would gate
     the next one from three describes away. */
  signOut()
  seed()
})

describe('the palette draws all five kinds', () => {
  it('offers no module and no quote when the host gave it no door', () => {
    /* §2 rule 4's DOOR half: a host that cannot open a module is a
       place where a module result cannot be opened, so it is not
       drawn. The per-person half is two describes down. */
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

describe('a result a person cannot open does not appear for them', () => {
  /** The same place, closed to everybody but one job. `beforeEach`
   *  signs nobody in, so `useSessionRoleId()` answers null — which
   *  `access.ts:126-129` reads as "nobody in particular", and a
   *  restricted place is shut to them. The block at the foot of this
   *  file does the same thing with a real session and a real
   *  assignment. */
  const shut = (): void => {
    useProjectStore.setState({
      modules: {
        m1: { ...place, access: [{ roleId: 'r-manager', capabilities: ['browse'] }] },
      },
    })
  }

  it('takes the table, its row and its column off the screen together', async () => {
    /* §2 rule 4, ON THE SCREEN. `capabilities.test.ts` proves the
       rule over the index; this proves the index is what the palette
       actually draws — three kinds gone in one gesture, and the
       refusal rather than a half-empty list. */
    shut()
    await ask('zeta')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.queryByText(/Zeta Table/)).toBeNull()
    expect(screen.queryByText(/Zeta Boat/)).toBeNull()
  })

  it('still answers the document that was written against it', async () => {
    /* THE RULING, DRAWN. A quote is a photograph addressed to a
       customer; closing the price file it was configured from does
       not unwrite somebody's own document. See `SearchFieldProps`. */
    shut()
    await ask('quill', { onOpenQuote: () => {} })
    const group = screen.getByRole('group', { name: 'Quotes' })
    expect(within(group).getAllByRole('option')).toHaveLength(1)
  })

  it('does not recall a row it would refuse to find', async () => {
    /* THE RECALL LIST IS RESOLVED AGAINST THE INDEX, so it inherits
       this for free — and it has to. "Take me back to the boat I was
       costing four minutes ago" must not be the one door left open
       into a place that was closed since. */
    rememberPick('ta', 'r1')
    shut()
    render(<SearchField autoFocus />)
    expect(screen.queryByText('Recently opened')).toBeNull()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})

describe('the whole chain, from the person signed in to the row on screen', () => {
  /* THE LAST INCH, AND THE ONE NOTHING COULD TEST UNTIL TODAY.
     Everything above drives the INDEX's argument. This drives the
     APP's: a real sign-in, a real assignment through `setSessionRole`,
     and the palette resolving it through `useSessionRoleId` on its own
     — no prop, no fixture, no stand-in. `access.ts:126-129`'s "nobody
     in particular, which is every session today" is no longer true,
     and this is what makes that a measurement rather than a claim. */
  const asManager = (): void => {
    const { email, password } = demoAccount()
    const out = signIn(email, password)
    expect(out.ok).toBe(true)
    setSessionRole('r-manager')
  }

  const closedToAllBut = (roleId: string): void => {
    useProjectStore.setState({
      modules: { m1: { ...place, access: [{ roleId, capabilities: ['browse'] }] } },
    })
  }

  it('shows the place to the job that was granted it', async () => {
    asManager()
    closedToAllBut('r-manager')
    await ask('zeta', { onOpenModule: () => {} })
    expect(optionNames()).toEqual([
      'Zeta Places — a place, 1 row in 1 table',
      'Zeta Table — 2 cols · 1 row',
      'Zeta Boat — in Zeta Table',
      'Zeta Weight — a column in Zeta Table',
    ])
  })

  it('takes it away from the same person the moment the grant names another job', async () => {
    /* THE GUARD SEEN TO FIRE, through the real API: same account,
       same sign-in, same query — one different role id on the
       module's access row, and four results become none. */
    asManager()
    closedToAllBut('r-yard')
    await ask('zeta', { onOpenModule: () => {} })
    expect(optionNames()).toEqual([])
  })

  it('leaves the seeded operator everything, because nothing is restricted', async () => {
    /* THE SINGLE-PERSON BUSINESS, which is the shipped state: one
       account, `roleId: null`, no `RoleDef` written down, so every
       place is unrestricted and `mayDo` answers on the module's own
       capability list alone. A role system that cost this dealer a
       row would be a regression, not a feature. */
    const { email, password } = demoAccount()
    signIn(email, password)
    await ask('zeta', { onOpenModule: () => {} })
    expect(optionNames()).toHaveLength(4)
  })
})

describe('WCAG 2.1.4 — no bare character is a command here', () => {
  /* LEVEL A, AND NOBODY IN THE COHORT MEETS IT. The criterion asks
     that a single-CHARACTER shortcut can be turned off, remapped, or
     be live only while its component has focus. Linear and Superhuman
     both ship large single-key vocabularies and neither documents a
     way out of them (`docs/research/dense-tables-and-selection.md`).

     THIS SURFACE MEETS IT BY THE THIRD ROUTE AND BY BINDING NOTHING,
     and that was a claim in a comment until this block. It is worth
     testing rather than asserting because the failure it guards is a
     future edit: the one control here is a text field where every
     character a person presses is CONTENT, so a letter shortcut would
     not merely be a compliance failure — it would eat the query. */

  it('does not open on a bare letter, and does open on the modified one', async () => {
    render(<SearchField />)
    await userEvent.keyboard('k')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
  })

  it('treats a letter as content even while the cursor is on a result', async () => {
    /* `j` and `k` are Linear's and Superhuman's move-the-cursor keys.
       Here they are letters, and they stay letters with the cursor
       parked on a row — the query grows and nothing is taken. */
    const revealed: string[] = []
    await ask('zeta', { onReveal: (id) => revealed.push(id) })
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('jk')
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'zetajk')
    expect(revealed).toEqual([])
  })

  it('answers its list keys only while the field has the keyboard', async () => {
    /* The criterion's own third exception, demonstrated: every key
       this list answers to — the arrows, Home/End, Page Up/Down,
       Enter, Escape — is bound ON THE INPUT, so with the keyboard
       anywhere else they are the page's keys and not ours. */
    const revealed: string[] = []
    render(<SearchField onReveal={(id) => revealed.push(id)} />)
    await userEvent.keyboard('{ArrowDown}{End}{PageDown}{Enter}')
    expect(revealed).toEqual([])
    expect(screen.queryAllByRole('option')).toHaveLength(0)
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
