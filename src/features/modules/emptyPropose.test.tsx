/* ============================================================
   THE MODULES SCREEN, WITH NOTHING ON IT — UX_PASS §8.

   THE MOMENT. A dealer loads their price file, presses Modules,
   and meets the one screen in the app whose whole job is to hold
   the places in their business. What it used to say was a
   definition of the word "module", a count of their tables, and a
   button that opened a blank panel. Every word of that is true and
   none of it is an answer, and the store knew the answer already:
   `EntityDef.kind` says what each table holds.

   WHY A RENDERING TEST. `proposals.test.ts` proves the READING —
   which tables group, what the module would be called, what is
   refused. None of that was the gap. The gap was that this SCREEN
   never asked the question, while the front door had been asking
   it for weeks; a derivation with one caller looks identical to a
   derivation with two until somebody renders the second one.

   SO EVERY ASSERTION IS ROLE AND TEXT. "Is there something on this
   screen that offers me Boats" is what a person is really asking;
   `.dsh-propose` is not, and a test that asserted on the class
   would pass on a screen with no names on it.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EntityDef, ModuleDef, RowData, TableKind } from '@/types/model'

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
const { Dashboard } = await import('./Dashboard')

const ISO = '2026-01-01T00:00:00.000Z'

function table(id: string, name: string, kind?: TableKind): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    ...(kind ? { kind } : {}),
    fields: [{ id: `${id}-name`, name: 'Name', type: 'text' }],
    displayFieldId: `${id}-name`,
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

const row = (entityId: string, i: number): RowData => ({
  id: `${entityId}-r${i}`,
  entityId,
  values: { [`${entityId}-name`]: `Model ${i}` },
  createdAt: ISO,
  updatedAt: ISO,
})

/** Tables, and `n` rows under each. */
function seed(tables: EntityDef[], n = 3, modules: ModuleDef[] = []): void {
  const rowsByEntity: Record<string, RowData[]> = {}
  for (const t of tables) rowsByEntity[t.id] = Array.from({ length: n }, (_, i) => row(t.id, i))
  useProjectStore.setState({
    entities: Object.fromEntries(tables.map((t) => [t.id, t])),
    rowsByEntity,
    modules: Object.fromEntries(modules.map((m) => [m.id, m])),
  })
}

const screenIt = (): void => {
  render(<Dashboard onOpen={() => {}} onNew={() => {}} />)
}

beforeEach(() => {
  useProjectStore.setState({ entities: {}, rowsByEntity: {}, modules: {} })
})

/* ---------------------------------------------------------- */

describe('a sheet whose tables suggest something', () => {
  beforeEach(() => {
    seed([
      table('t1', 'Highfield Inflatables', 'boat'),
      table('t2', 'Stabicraft', 'boat'),
      table('t3', 'Dunbier', 'trailer'),
    ])
  })

  it('OFFERS THE PLACES INSTEAD OF ONLY DEFINING THE WORD', () => {
    /* Two proposals, named the way `proposals.ts` names them: the
       kind's label over many tables, and the table's own name over
       one. Boats is two tables, Dunbier is the only trailer. */
    screenIt()
    expect(screen.getByRole('button', { name: /Make Boats from 2 tables/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Make Dunbier from 1 table/ })).toBeInTheDocument()
  })

  it('names the tables it would hold, so the offer can be checked before it is pressed', () => {
    screenIt()
    const boats = screen.getByRole('button', { name: /Make Boats/ })
    expect(boats).toHaveAccessibleName(/Highfield Inflatables/)
    expect(boats).toHaveAccessibleName(/Stabicraft/)
    expect(boats).toHaveAccessibleName(/6 rows/)
  })

  it('TURNS THE COUNT ROUND rather than saying the figure twice', () => {
    /* One line carries the count, and which line it is depends on
       whether there is anything to offer: "You have 3 tables and no
       modules" ends on what is missing; "From your 3 tables, these
       look like places in your business" introduces what is there. */
    screenIt()
    expect(screen.getByText(/these look like places in your business/)).toBeInTheDocument()
    expect(screen.queryByText(/and no modules/)).not.toBeInTheDocument()
  })

  it('does not shout a sentence with a figure in it — rule 3', () => {
    /* `SectionHead` uppercases, which is a LABEL style. The list
       takes no label here because the sentence above it is one. */
    screenIt()
    const line = screen.getByText(/these look like places in your business/)
    expect(line.tagName).toBe('P')
    /* and it is not a heading wearing a sentence, which is the way
       this would come back: `SectionHead` renders one. */
    expect(
      screen.queryByRole('heading', { name: /these look like places/ }),
    ).not.toBeInTheDocument()
  })

  it('keeps the escape hatch, and it says what it is for', () => {
    /* §8: "the escape hatch stays one click away, so nothing is
       taken from the person who wants to choose". It stops being
       called New module because the proposals above it are the new
       module — a second button with the same word on it is the same
       door twice. */
    screenIt()
    expect(screen.getByRole('button', { name: 'Pick a table myself' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New module' })).not.toBeInTheDocument()
  })

  it('still says what a module IS — the one screen where a person meets the word', () => {
    screenIt()
    expect(screen.getByText(/A module is a place in your business/)).toBeInTheDocument()
  })
})

describe('a sheet with nothing to suggest', () => {
  it('falls back to the count and the plain primary act', () => {
    /* Three tables that declare no kind agree with nothing, so no
       proposal can name them — and the screen must not go quiet
       about them. */
    seed([table('t1', 'Rates'), table('t2', 'Charges'), table('t3', 'Oils')])
    screenIt()
    expect(screen.queryByRole('button', { name: /^Make /})).not.toBeInTheDocument()
    expect(screen.getByText(/and no modules/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New module' })).toBeInTheDocument()
  })

  it('SAYS WHY IT CANNOT PROPOSE, rather than leaving them out of the reading', () => {
    /* Rule 10, in place: two tables are inside the count above and
       outside every proposal below it, and a person who cannot see
       why has been handed a number that does not add up. */
    seed([
      table('t1', 'Highfield Inflatables', 'boat'),
      table('t2', 'Stabicraft', 'boat'),
      table('t3', 'Rates'),
      table('t4', 'Charges'),
    ])
    screenIt()
    expect(screen.getByText(/2 tables declare no kind/)).toBeInTheDocument()
  })

  it('refuses with a reason on a sheet that has no tables at all', () => {
    /* The pre-existing refusal, asserted here because the branch it
       lives in was rewritten around it. */
    screenIt()
    expect(screen.getByText(/A module is about a table, and there are none yet/)).toBeInTheDocument()
  })

  it('goes silent once every table has a home', () => {
    /* The reading is over tables no module holds, so a sheet where
       everything is placed proposes nothing — and this screen is
       not empty then anyway. */
    seed(
      [table('t1', 'Highfield Inflatables', 'boat')],
      3,
      [
        {
          id: 'm1',
          name: 'Boats',
          description: '',
          tableIds: ['t1'],
          capabilities: ['browse'],
          index: 'rows',
          accent: 'blue',
          order: 0,
          createdAt: ISO,
          updatedAt: ISO,
        },
      ],
    )
    screenIt()
    /* the empty state is not on screen at all — this is the grid */
    expect(screen.queryByText(/A module is a place in your business/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Make /})).not.toBeInTheDocument()
  })
})
