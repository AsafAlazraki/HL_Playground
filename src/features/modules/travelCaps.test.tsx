/* ============================================================
   THE TWO TRAVEL SWITCHES, AS A PERSON MEETS THEM.

   WHY THIS IS A RENDERING TEST AND NOT A LOGIC ONE — the argument
   `writeCaps.test.tsx` makes next door, about the same class of
   fault. `travelCaps.test.ts` proves the READING: which verb is on,
   which is withheld, what the refusal says. None of that was the
   bug. The bug was that the SWITCH CHANGED NOTHING — `export` had
   been in the contract since the module system landed, it was a
   switch in the designer and a column in the access grid, and the
   catalogue never read it, so an administrator could switch it off,
   watch the switch move, and take nothing away.

   The only guard that catches that coming back is one that looks at
   what the page publishes.

   THE ASSERTION IS ON THE BAR THE CONTROLS GO TO. `usePageActions`
   is the register the whole application draws its contextual
   controls from, so "is there an Export on this page" is asked the
   way the bar itself asks it — never by class name.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { pageActions, publishActions } from '@/lib/actions'
import type { EntityDef, ModuleAccess, ModuleCapability, ModuleDef, RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: { load: async () => null, saveAll: async () => {}, wipe: async () => {} },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { ModuleStock } = await import('./ModuleIndex')

const ISO = '2026-01-01T00:00:00.000Z'

const table = (id: string, name: string): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind: 'boat',
  fields: [
    { id: `${id}-name`, name: 'Name', type: 'text' },
    { id: `${id}-price`, name: 'Price', type: 'number' },
  ],
  displayFieldId: `${id}-name`,
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

const row = (entityId: string, id: string, name: string): RowData => ({
  id,
  entityId,
  values: { [`${entityId}-name`]: name, [`${entityId}-price`]: 42000 },
  createdAt: ISO,
  updatedAt: ISO,
})

const moduleOf = (
  capabilities: ModuleCapability[],
  tableIds = ['t1'],
  access?: ModuleAccess[],
): ModuleDef => ({
  id: 'm1',
  name: 'Boats',
  description: 'What we sell',
  tableIds,
  capabilities,
  index: 'rows',
  accent: 'blue',
  order: 0,
  createdAt: ISO,
  updatedAt: ISO,
  ...(access ? { access } : {}),
})

const READS: ModuleCapability[] = ['browse', 'search', 'open']

/** Every control on the page's bar, by its label. */
const onBar = (): string[] =>
  pageActions().flatMap((g) => g.items.map((i) => ('label' in i ? i.label : i.id)))

beforeEach(() => {
  publishActions('module-catalogue-travel', null)
  useProjectStore.setState({
    entities: { t1: table('t1', 'Highfield Inflatables'), t2: table('t2', 'Stabicraft') },
    rowsByEntity: {
      t1: [row('t1', 'r1', 'Sport 460'), row('t1', 'r2', 'Ultralite 340')],
      t2: [row('t2', 'r3', 'Frontier 1850')],
    },
  })
})

afterEach(() => {
  publishActions('module-catalogue-travel', null)
})

/* ---------------------------------------------------------- */

describe('a switch that is off takes the control away', () => {
  it('puts NOTHING on the bar for a browse/search/open module', () => {
    render(<ModuleStock module={moduleOf(READS)} onOpen={() => {}} />)
    expect(onBar()).not.toContain('Export')
    expect(onBar()).not.toContain('Re-upload')
    expect(onBar()).not.toContain('Paste rows')
  })
})

describe('a switch that is on puts the register’s own control there', () => {
  it('EXPORT ARRIVES, and it is the round trip’s, not a second one', () => {
    render(<ModuleStock module={moduleOf([...READS, 'export'])} onOpen={() => {}} />)
    expect(onBar()).toContain('Export')
  })

  it('takes nothing IN with it — export is not a licence to overwrite', () => {
    render(<ModuleStock module={moduleOf([...READS, 'export'])} onOpen={() => {}} />)
    expect(onBar()).not.toContain('Re-upload')
    expect(onBar()).not.toContain('Paste rows')
  })

  it('import brings BOTH doors rows arrive through', () => {
    /* A file and the clipboard are one act — rows arriving at this
       register from a spreadsheet — and an administrator who withheld
       the file door did not agree to the other one. */
    render(<ModuleStock module={moduleOf([...READS, 'import'])} onOpen={() => {}} />)
    expect(onBar()).toContain('Re-upload')
    expect(onBar()).toContain('Paste rows')
    expect(onBar()).not.toContain('Export')
  })
})

describe('the job standing here', () => {
  it('loses the control when the module keeps the verb to another job', () => {
    render(
      <ModuleStock
        module={moduleOf(
          [...READS, 'export'],
          ['t1'],
          [{ roleId: 'r-fitter', capabilities: ['browse', 'search', 'open', 'export'] }],
        )}
        onOpen={() => {}}
        roleId="r-sales"
      />,
    )
    expect(onBar()).not.toContain('Export')
  })

  it('and keeps it when the grant is theirs', () => {
    render(
      <ModuleStock
        module={moduleOf(
          [...READS, 'export'],
          ['t1'],
          [{ roleId: 'r-sales', capabilities: ['browse', 'search', 'open', 'export'] }],
        )}
        onOpen={() => {}}
        roleId="r-sales"
      />,
    )
    expect(onBar()).toContain('Export')
  })
})
