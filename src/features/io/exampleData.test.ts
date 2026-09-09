/* ============================================================
   REMOVE THE EXAMPLE DATA — the two things that must be true.

   IT MUST TAKE ALL OF THE SET, and it must take NONE of the
   person's own work. Those are opposite failures and only one of
   them is visible: leaving a table behind is untidy, deleting a
   dealer's own table is the trust failure this whole section of
   UX_PASS exists to answer.

   So this walks the REAL seed through the REAL store rather than
   a fixture. The identification rests on two facts about that
   seed — one creation instant across every table it mints, and a
   stamp written at the moment of seeding — and a fixture that
   restated them would only prove the fixture. If `emit.py` ever
   changes how the seed stamps its tables, this is what turns red.

   The suite is `node` with no DOM by deliberate choice (see
   vitest.config.ts), which is exactly the environment
   `seedStamp` falls back to memory in — the same fallback a
   private window gets, so the path under test here is a real one.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RowData } from '@/types/model'

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
const { loadNorthsideProject } = await import('@/demos/northside')
const { forgetSeedStamp, readSeedStamp } = await import('@/demos/seedStamp')
const { NORTHSIDE_HOLDS } = await import('@/demos/northsideHolds')
const { DRIFT_GATE } = await import('@/demos/seedChunk')
const {
  exampleNote,
  exampleOnSheet,
  exampleTableIds,
  removeExampleData,
  removeLabel,
  removedSentence,
} = await import('./exampleData')

const tableCount = (): number => Object.keys(useProjectStore.getState().entities).length
const rowCount = (): number =>
  Object.values(useProjectStore.getState().rowsByEntity).reduce((n, l) => n + l.length, 0)

/** a table the person made themselves, after the set landed */
const ownTable = (name: string): string =>
  useProjectStore.getState().createEntity({ name }).id

describe('what counts as example data', () => {
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

  it('is nothing at all on a sheet this browser was never seeded from', () => {
    ownTable('Boats')
    ownTable('Motors')
    expect(readSeedStamp()).toBeNull()
    expect(exampleOnSheet()).toBeNull()
  })

  it('is every table the prepared set put here, counted off the sheet', () => {
    loadNorthsideProject()
    const found = exampleOnSheet()
    expect(found).not.toBeNull()
    expect(found?.tables).toBe(NORTHSIDE_HOLDS.tables)
    expect(found?.rows).toBe(NORTHSIDE_HOLDS.rows)
    /* the set brings places to the dashboard, and they are counted */
    expect(found?.modules ?? 0).toBeGreaterThan(0)
  })

  it('never names a table the person made themselves', () => {
    loadNorthsideProject()
    const mine = ownTable('My own boats')
    const found = exampleOnSheet()
    expect(found?.tableIds).not.toContain(mine)
    expect(found?.tables).toBe(NORTHSIDE_HOLDS.tables)
  })

  /* THE ONE PATH THAT COULD HAVE TAKEN SOMEBODY'S OWN WORK: a person
     who deletes every example table by hand keeps the stamp, so the
     earliest instant on the sheet becomes one of their own. Tables
     made one at a time never share an instant, so no cohort forms and
     the control is not drawn. */
  it('is nothing once the example is gone, however the stamp reads', () => {
    loadNorthsideProject()
    const store = useProjectStore.getState()
    for (const id of Object.keys(store.entities)) store.deleteEntity(id)
    ownTable('Mine one')
    ownTable('Mine two')
    expect(readSeedStamp()?.seed).toBeDefined()
    expect(exampleOnSheet()).toBeNull()
  })

  it('refuses a cohort smaller than the demos module’s own floor', () => {
    const at = new Date().toISOString()
    const bulk: Record<string, { id: string; createdAt: string }> = {}
    for (let i = 0; i < DRIFT_GATE - 1; i += 1) {
      bulk[`t${String(i)}`] = { id: `t${String(i)}`, createdAt: at }
    }
    expect(
      exampleTableIds(bulk as unknown as Parameters<typeof exampleTableIds>[0], true),
    ).toEqual([])
  })
})

describe('removing it', () => {
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

  it('takes the set and leaves the person’s own table and their business', () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Harbour Boats', 'marine')
    const mine = ownTable('My own boats')

    const was = removeExampleData()
    expect(was?.tables).toBe(NORTHSIDE_HOLDS.tables)

    const after = useProjectStore.getState()
    expect(Object.keys(after.entities)).toEqual([mine])
    expect(rowCount()).toBe(0)
    /* the dashboard is not left pointing at tables that are gone */
    expect(Object.keys(after.modules)).toEqual([])
    expect(Object.keys(after.views)).toEqual([])
    /* and the thing CLEAR SHEET takes and this must not */
    expect(after.meta.org?.name).toBe('Harbour Boats')
  })

  it('is one step back — undo puts the tables, rows and places back', () => {
    loadNorthsideProject()
    const modules = Object.keys(useProjectStore.getState().modules).length
    const tables = tableCount()
    const rows = rowCount()

    removeExampleData()
    expect(tableCount()).toBe(0)

    const label = useProjectStore.getState().undo()
    expect(label).not.toBeNull()
    expect(tableCount()).toBe(tables)
    expect(rowCount()).toBe(rows)
    expect(Object.keys(useProjectStore.getState().modules).length).toBe(modules)
  })

  it('says nothing and does nothing when there is no example here', () => {
    ownTable('Boats')
    expect(removeExampleData()).toBeNull()
    expect(tableCount()).toBe(1)
  })

  it('counts in the sentence it says, and never writes a figure', () => {
    expect(
      removedSentence({ tableIds: [], tables: 53, rows: 15691, pages: 25, modules: 5 }),
    ).toBe('Removed 53 example tables and 15,691 rows.')
    expect(
      removedSentence({ tableIds: [], tables: 1, rows: 1, pages: 0, modules: 0 }),
    ).toBe('Removed 1 example table and 1 row.')
  })

  /* THE DASHBOARD CLAUSE IS THE ONE A PERSON CANNOT SEE COMING. Taking
     53 tables off also takes the places built on them, and a note that
     said only "and the rows" would be true and incomplete. It is left
     out entirely where there are none — "0 places" is noise in a
     sentence about what is at stake. */
  it('names the dashboard places in the note, and only when there are some', () => {
    expect(
      exampleNote({ tableIds: [], tables: 53, rows: 15691, pages: 25, modules: 5 }),
    ).toBe(
      'And the 15,691 rows in them, and the 5 places they hold up on the dashboard. Tables you have made yourself stay.',
    )
    expect(exampleNote({ tableIds: [], tables: 9, rows: 40, pages: 0, modules: 0 })).toBe(
      'And the 40 rows in them. Tables you have made yourself stay.',
    )
  })

  /* §4.2's own sentence, on the control's face. */
  it('puts the table count on the control', () => {
    expect(
      removeLabel({ tableIds: [], tables: 53, rows: 15691, pages: 25, modules: 5 }),
    ).toBe('Remove the 53 example tables')
  })
})
