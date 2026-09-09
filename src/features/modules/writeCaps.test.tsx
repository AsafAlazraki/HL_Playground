/* ============================================================
   THE CATALOGUE'S WRITE AFFORDANCES, AS A PERSON MEETS THEM.

   WHY THIS IS A RENDERING TEST AND NOT A LOGIC ONE. `writeCaps.
   test.ts` next door proves the READING — which verb is on, which is
   blocked, and what the sentence says. None of that was the bug. The
   bug was that the reading did not exist and the SCREEN never asked:
   `add`, `edit` and `delete` were three switches in the designer,
   three columns in the access grid, and a grep of every `.tsx` in
   this feature for any of them returned nothing. A switch that
   changes nothing is a safety claim the app does not honour, and the
   only guard that can catch it coming back is one that looks at the
   screen.

   SO EVERY ASSERTION IS ROLE AND TEXT, never a class. "Is there a
   control called Take out on this catalogue" is the question an
   administrator is really asking when they move the switch; `.md-
   face-act` is not, and a test that asserted on it would pass on a
   screen with no names on it.

   THE FIXTURE IS SYNTHETIC AND TINY, for the reason `picker.test.tsx`
   gives: proving that a switch draws a button does not need 23,000
   lines of real catalogue.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, ModuleCapability, ModuleDef, RowData } from '@/types/model'

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
const { ModuleStock } = await import('./ModuleIndex')

const ISO = '2026-01-01T00:00:00.000Z'

function table(id: string, name: string, retired = false): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    kind: 'boat',
    /* "Name" is in NOT_A_KIND (table/grouping.ts), so `leafNoun` falls
       through to the KIND's own word and the button reads "Add a
       boat" — an exact string rather than a pattern. */
    fields: [
      { id: `${id}-name`, name: 'Name', type: 'text' },
      { id: `${id}-price`, name: 'Price', type: 'number' },
    ],
    displayFieldId: `${id}-name`,
    ...(retired ? { retired: true } : {}),
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

const row = (entityId: string, id: string, name: string, price: number): RowData => ({
  id,
  entityId,
  values: { [`${entityId}-name`]: name, [`${entityId}-price`]: price },
  createdAt: ISO,
  updatedAt: ISO,
})

function moduleOf(capabilities: ModuleCapability[], tableIds = ['t1']): ModuleDef {
  return {
    id: 'm1',
    name: 'Boats',
    description: 'What we sell',
    tableIds,
    capabilities,
    /* the dense line, deliberately: it draws the same faces as the
       gallery without the picture machinery, so nothing here is
       measuring an image loader */
    index: 'rows',
    accent: 'blue',
    order: 0,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

const READS: ModuleCapability[] = ['browse', 'search', 'open']

function seed(tables: EntityDef[], rows: RowData[]): void {
  const rowsByEntity: Record<string, RowData[]> = {}
  for (const t of tables) rowsByEntity[t.id] = rows.filter((r) => r.entityId === t.id)
  useProjectStore.setState({
    entities: Object.fromEntries(tables.map((t) => [t.id, t])),
    rowsByEntity,
  })
}

const rowsOf = (id: string): RowData[] => useProjectStore.getState().rowsByEntity[id] ?? []

beforeEach(() => {
  seed(
    [table('t1', 'Highfield Inflatables')],
    [row('t1', 'r1', 'Sport 460', 42000), row('t1', 'r2', 'Ultralite 340', 21000)],
  )
})

describe('a switch that is off takes the affordance away', () => {
  it('offers no write control at all on a browse/search/open module', () => {
    render(<ModuleStock module={moduleOf(READS)} onOpen={() => {}} />)
    /* the catalogue itself is drawn — this is not an empty screen */
    expect(screen.getByRole('button', { name: /Sport 460/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Add a/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Rename/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Take/ })).not.toBeInTheDocument()
  })

  it('says nothing about the verbs it is not offering', () => {
    render(<ModuleStock module={moduleOf(READS)} onOpen={() => {}} />)
    /* THE OTHER HALF OF THE RULE. browse/search/open is the
       contract's own default, so a page that apologised for every
       switched-off write would apologise on every module ever made. */
    expect(screen.queryByText(/switched off/i)).not.toBeInTheDocument()
  })

  it('takes only the verb that moved — edit off leaves delete alone', () => {
    render(<ModuleStock module={moduleOf([...READS, 'delete'])} onOpen={() => {}} />)
    expect(screen.getAllByRole('button', { name: /^Take .* out of the catalogue/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /^Rename/ })).not.toBeInTheDocument()
  })
})

describe('add — a new button on the index, a blank row in the master table', () => {
  it('draws the button in the dealer’s own noun and names where it lands', async () => {
    render(<ModuleStock module={moduleOf([...READS, 'add'])} onOpen={() => {}} />)
    const button = screen.getByRole('button', { name: 'Add a boat' })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('title', 'Add an empty boat to Highfield Inflatables')
  })

  it('writes a blank row and goes to it', async () => {
    const opened: string[] = []
    render(
      <ModuleStock
        module={moduleOf([...READS, 'add'])}
        onOpen={(tableId, rowId) => opened.push(`${tableId}:${rowId}`)}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add a boat' }))
    const rows = rowsOf('t1')
    expect(rows).toHaveLength(3)
    expect(opened).toEqual([`t1:${rows[2].id}`])
  })

  it('is disabled, with the reason on the page, when every table is history', async () => {
    seed([table('t1', 'OBSOLETE Boats', true)], [row('t1', 'r1', 'Sport 460', 42000)])
    render(<ModuleStock module={moduleOf([...READS, 'add'])} onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: 'Add one' })).toBeDisabled()
    /* rule 10: the reason is a sentence, in the place the act was
       refused — not a tooltip and not a spec */
    expect(screen.getByText(/nothing new is written to it/)).toBeInTheDocument()
  })
})

describe('edit — the one fact a catalogue face owns is its name', () => {
  it('types a new name and writes it', async () => {
    render(<ModuleStock module={moduleOf([...READS, 'edit'])} onOpen={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Rename Sport 460' }))
    const box = screen.getByRole('textbox', { name: 'Rename Sport 460' })
    await userEvent.clear(box)
    await userEvent.type(box, 'Sport 460 X{Enter}')
    expect(rowsOf('t1')[0].values['t1-name']).toBe('Sport 460 X')
    expect(screen.getByRole('button', { name: 'Sport 460 X' })).toBeInTheDocument()
  })

  it('Escape leaves the name alone', async () => {
    render(<ModuleStock module={moduleOf([...READS, 'edit'])} onOpen={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Rename Sport 460' }))
    const box = screen.getByRole('textbox', { name: 'Rename Sport 460' })
    await userEvent.clear(box)
    await userEvent.type(box, 'Nonsense{Escape}')
    expect(rowsOf('t1')[0].values['t1-name']).toBe('Sport 460')
  })

  it('refuses when no table here names its rows in a column that can be typed', () => {
    const numbered: EntityDef = {
      ...table('t1', 'Rate Card'),
      fields: [{ id: 't1-name', name: 'Amount', type: 'number' }],
      displayFieldId: 't1-name',
    }
    seed([numbered], [{ ...row('t1', 'r1', 'x', 1), values: { 't1-name': 1 } }])
    render(<ModuleStock module={moduleOf([...READS, 'edit'])} onOpen={() => {}} />)
    expect(screen.queryByRole('button', { name: /^Rename/ })).not.toBeInTheDocument()
    expect(screen.getByText(/does not name its rows/)).toBeInTheDocument()
  })
})

describe('delete — taken out, then said, never asked first', () => {
  it('takes the row out of the store', async () => {
    render(<ModuleStock module={moduleOf([...READS, 'delete'])} onOpen={() => {}} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Take Sport 460 out of the catalogue' }),
    )
    expect(rowsOf('t1').map((r) => r.values['t1-name'])).toEqual(['Ultralite 340'])
    /* rule 9 in the negative: nothing asked, nothing stood in the way */
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
