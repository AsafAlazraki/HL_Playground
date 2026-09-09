/* ============================================================
   THE CONTROL THAT TAKES THE EXAMPLE OFF — as it is DRAWN.

   `exampleData.test.ts` beside this file proves the rule and the
   act against the real 15,691-row seed. What it cannot see is
   whether the drawer puts the control on screen, what it says
   when it does, and whether it stays away when there is nothing
   to remove — and that is the half that fails silently. tsc is
   green, the feature is reachable, the screen is wrong.

   THE FIXTURE IS SYNTHETIC AND TINY, for the reason
   dashboard/tiles.test.tsx gives: the logic suites pay about 7s
   at import to assert against the whole price file, and nothing
   below needs 23,000 lines to prove a sentence is drawn. Ten
   tables sharing one creation instant plus a seed stamp is
   exactly the state `loadNorthsideProject` leaves, which is the
   state this control reads.

   QUERIED BY ROLE AND BY TEXT, never by class. A test that
   asserts on `.io-example-go` passes while the button says the
   wrong number and fails the day somebody renames a class.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, RowData } from '@/types/model'

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

const { useProjectStore } = await import('@/store/useProjectStore')
const { forgetSeedStamp, writeSeedStamp } = await import('@/demos/seedStamp')
const { ImportExportMenu } = await import('./ImportExportMenu')

const AT = '2026-01-01T00:00:00.000Z'

const table = (id: string, createdAt: string): EntityDef => ({
  id,
  name: `Table ${id}`,
  accent: 'blue',
  fields: [{ id: `${id}-f`, name: 'Name', type: 'text' }],
  position: { x: 0, y: 0 },
  createdAt,
  updatedAt: createdAt,
})

const row = (entityId: string, i: number): RowData => ({
  id: `${entityId}-r${String(i)}`,
  entityId,
  values: {},
  createdAt: AT,
  updatedAt: AT,
})

/** the sheet as `loadNorthsideProject` leaves it: every table minted
 *  in one instant, and a stamp recording that this browser was seeded */
function seededSheet(tables: number, rowsEach: number): void {
  const entities = Array.from({ length: tables }, (_, i) => table(`t${String(i)}`, AT))
  const rowsByEntity: Record<string, RowData[]> = {}
  for (const e of entities) {
    rowsByEntity[e.id] = Array.from({ length: rowsEach }, (_, i) => row(e.id, i))
  }
  useProjectStore.getState().replaceProject({
    name: 'Worked example',
    entities,
    groups: [],
    rules: [],
    rowsByEntity,
  })
  writeSeedStamp('fingerprint-1')
}

const openDrawer = async (): Promise<void> => {
  render(<ImportExportMenu />)
  await userEvent.click(screen.getByRole('button', { name: /import \/ export/i }))
}

describe('the document drawer’s way off the example', () => {
  beforeEach(() => {
    forgetSeedStamp()
    useProjectStore.getState().replaceProject({
      name: 'Untitled Sheet',
      entities: [],
      groups: [],
      rules: [],
      rowsByEntity: {},
    })
  })

  it('states the count on its face and the rest underneath', async () => {
    seededSheet(10, 3)
    await openDrawer()

    expect(screen.getByRole('button', { name: 'Remove the 10 example tables' })).toBeTruthy()
    expect(screen.getByText(/And the 30 rows in them/)).toBeTruthy()
    /* the promise that separates it from CLEAR SHEET below it */
    expect(screen.getByText(/Tables you have made yourself stay/)).toBeTruthy()
  })

  /* A sheet nobody seeded has no example on it, and a control offering
     to remove one would be the app inventing a fact about the data. */
  it('is not drawn at all on a sheet this browser was never seeded from', async () => {
    useProjectStore.getState().createEntity({ name: 'Boats' })
    await openDrawer()

    expect(screen.queryByRole('button', { name: /example tables/i })).toBeNull()
    /* and the door it stands above is still there */
    expect(screen.getByRole('button', { name: 'Clear sheet' })).toBeTruthy()
  })

  /* RULE 9: it is undoable, so it does not ask. CLEAR SHEET beside it
     raises a confirm because clearing cannot be got back; a confirm
     here would be a full stop in the middle of somebody's work. */
  it('removes on the press, asks nothing, and leaves the business alone', async () => {
    seededSheet(10, 3)
    useProjectStore.getState().setOrganisation('Harbour Boats', 'marine')
    await openDrawer()

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove the 10 example tables' }),
    )

    expect(screen.queryByRole('dialog')).toBeNull()
    const after = useProjectStore.getState()
    expect(Object.keys(after.entities)).toEqual([])
    expect(after.meta.org?.name).toBe('Harbour Boats')
  })
})
