/* ============================================================
   THE REVIEW RAIL, RENDERED.

   WHY IT RENDERS RATHER THAN CALLING FUNCTIONS. `rollup.test.ts`
   proves the arithmetic — 142 marks become 12 blocks, 108 of one
   rule become 50 cards. None of that is worth anything if the
   ledger does not draw, or if "Apply to all 8" writes to a
   dealer's price file before the question is answered. Those are
   the two things this file is here for.

   Every query is by ROLE or by TEXT. A test that asserts on a
   class name fails when the class is renamed and passes when the
   screen is broken — CLAUDE.md says so, and this rail's classes
   were all renamed once already.

   THE FIXTURE IS SYNTHETIC AND TINY. The measurement suite pays
   for `src/demos/northside.ts`; nothing here needs 15,691 rows to
   prove that one card is drawn where three used to be.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, RowData } from '@/types/model'

/* The store reaches Dexie through the repository, mocked exactly as
   the other rendering suites mock it. The subject is what the rail
   DRAWS and what it refuses to write, not what it persists. */
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
const { ReviewPanel } = await import('./ReviewPanel')

/* ---------------------------------------------------------- */
/* The fixture                                                */
/* ---------------------------------------------------------- */

const ISO = '2026-01-01T00:00:00.000Z'

/* THREE FREE-TEXT COLUMNS THAT BEHAVE LIKE CHOICE LISTS, which is
   the exact shape `text-low-cardinality` fires on: a text column, at
   least six values, at most four distinct, short. It is also the
   shape 108 of the real file's 142 marks have — this is that rule at
   1/36th scale. The table is named in the plural on purpose, so a
   SECOND rule fires and the ledger has more than one row to rank. */
const COLOURS = ['Grey', 'White']
const FITMENTS = ['Factory fitted', 'Dealer fitted']
const GRADES = ['A', 'B']

function boats(): EntityDef {
  return {
    id: 'e-boats',
    name: 'Boats',
    accent: 'blue',
    fields: [
      { id: 'f-name', name: 'Name', type: 'text', required: true },
      { id: 'f-colour', name: 'Hull Colour', type: 'text' },
      { id: 'f-fitment', name: 'Fitment', type: 'text' },
      { id: 'f-grade', name: 'Grade', type: 'text' },
    ],
    displayFieldId: 'f-name',
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  } as unknown as EntityDef
}

function boatRows(): RowData[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `r${i}`,
    entityId: 'e-boats',
    values: {
      'f-name': `Hull ${i}`,
      'f-colour': COLOURS[i % 2],
      'f-fitment': FITMENTS[i % 2],
      'f-grade': GRADES[i % 2],
    },
    createdAt: ISO,
    updatedAt: ISO,
  }))
}

function seat(): void {
  const entity = boats()
  useProjectStore.setState({
    entities: { [entity.id]: entity },
    rowsByEntity: { [entity.id]: boatRows() },
  })
}

beforeEach(() => {
  seat()
})

const ledger = () => screen.getByRole('navigation', { name: 'Rules that fired' })

/* ---------------------------------------------------------- */

describe('the ledger', () => {
  it('names each rule once, with its count, however many columns it caught', () => {
    render(<ReviewPanel onClose={() => {}} />)
    const rows = within(ledger()).getAllByRole('button')
    /* one row per RULE — not per finding. Three free-text columns are
       one row that says 3, which is the whole point of the region. */
    const freeText = rows.find((b) => /Free text, few values/.test(b.textContent ?? ''))
    expect(freeText).toBeDefined()
    expect(freeText?.textContent).toContain('3')
  })

  it('opens on the rule that fired most, and says which is open', () => {
    render(<ReviewPanel onClose={() => {}} />)
    const open = within(ledger())
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
    expect(open).toHaveLength(1)
    expect(open[0].textContent).toContain('Free text, few values')
  })

  it('counts every mark in the summary, not just the open rule', () => {
    render(<ReviewPanel onClose={() => {}} />)
    expect(screen.getByText(/marks on the sheet/)).toBeInTheDocument()
  })

  it('offers the wall to anyone who asks for it, with its cost on the label', () => {
    render(<ReviewPanel onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /Show every mark \(\d+\)/ })).toBeInTheDocument()
  })
})

describe('the roll', () => {
  it('draws one card for three columns of one rule', () => {
    render(<ReviewPanel onClose={() => {}} />)
    /* the card's own head counts the columns — and does NOT repeat the
       table's name, which the group head two lines above already said */
    expect(screen.getByText('3 columns')).toBeInTheDocument()
    expect(screen.getAllByText(/^Boats$/)).toHaveLength(1)
    /* and every column is still addressable inside it */
    expect(screen.getByText('Hull Colour')).toBeInTheDocument()
    expect(screen.getByText('Fitment')).toBeInTheDocument()
    expect(screen.getByText('Grade')).toBeInTheDocument()
  })

  it('teaches the lesson once instead of three times', () => {
    render(<ReviewPanel onClose={() => {}} />)
    expect(screen.getAllByText(/Free text invites typos/)).toHaveLength(1)
  })

  it('offers one press for all three', () => {
    render(<ReviewPanel onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /Apply to all 3/ })).toBeInTheDocument()
  })
})

describe('the confirm gate', () => {
  it('does not retype a column until the question is answered', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /Apply to all 3/ }))

    /* the house sheet, not a second one invented here */
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByText(/choice lists\?/)).toBeInTheDocument()

    /* NOTHING HAS BEEN WRITTEN YET. This is the assertion O8 asked
       for: the press opens the question, it does not do the act. */
    const before = useProjectStore.getState().entities['e-boats']
    expect(before.fields.every((f) => f.type === 'text')).toBe(true)
  })

  it('states what the change costs, counted from the real rows', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Apply to all 3/ }))
    const sheet = screen.getByRole('dialog')
    /* three columns, 24 values across them, 6 distinct becoming the
       choices — every figure read off the fixture's own rows. The
       clause is the anchor and the figure is asserted beside it,
       because a bare '24' could be any number on the sheet. */
    const line = (clause: RegExp) => within(sheet).getByText(clause).closest('li')?.textContent
    expect(line(/columns change at once/)).toContain('3')
    expect(line(/values are in them/)).toContain('24')
    expect(line(/become the choices/)).toContain('6')
    expect(within(sheet).getByText(/Ctrl\+Z takes the whole change back/)).toBeInTheDocument()
  })

  it('leaves the sheet untouched when the question is declined', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Apply to all 3/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const after = useProjectStore.getState().entities['e-boats']
    expect(after.fields.every((f) => f.type === 'text')).toBe(true)
  })

  it('does the act once the question is answered', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Apply to all 3/ }))
    await user.click(screen.getByRole('button', { name: /Convert all 3/ }))
    const after = useProjectStore.getState().entities['e-boats']
    const converted = after.fields.filter((f) => f.type === 'select')
    expect(converted).toHaveLength(3)
    /* the choices are the dealer's own values, not invented ones */
    expect(converted.find((f) => f.name === 'Hull Colour')?.options).toEqual(COLOURS)
  })

  /* RULE 9, AND WHY THE GATE IS NOT DRAWN AROUND EVERYTHING.
     A rename moves no data. DESIGN_PRINCIPLES rule 9 and
     CONFIGURATOR_PLAYBOOK §8 both refuse a dialog for a reversible
     act, so this one applies straight through to the toast that
     already carries UNDO. */
  it('asks nothing before a rename, which moves nothing', async () => {
    const user = userEvent.setup()
    render(<ReviewPanel onClose={() => {}} />)

    const plural = within(ledger())
      .getAllByRole('button')
      .find((b) => /Plural table name|Plural entity name/.test(b.textContent ?? ''))
    expect(plural).toBeDefined()
    await user.click(plural as HTMLElement)

    await user.click(screen.getByRole('button', { name: 'Apply fix' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useProjectStore.getState().entities['e-boats'].name).toBe('Boat')
  })
})
