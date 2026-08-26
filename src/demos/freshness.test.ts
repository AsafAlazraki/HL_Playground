/* ============================================================
   THE FRESHNESS NOTICE, AGAINST THE REAL SEED.

   seedStamp.test.ts pins the verdict as arithmetic. This walks the
   real set through the real store and asks the question the user
   asks: I typed something — am I about to be told my data reverted
   and offered a button that deletes it?

   MEASURED BEFORE THE FIX: seed the browser, add ONE row to ONE
   table, and the panel appeared reading "This browser is showing a
   copy of Northside Marine — Master Price File that was loaded
   before the current one. Nothing has been lost", over an offer to
   load the current one — which would have replaced the sheet and
   taken the row with it.

   AND THE HONEST CASE IS PINNED IN THE SAME FILE, because it is the
   reason the mechanism exists at all: the owner really did open a
   21-table copy months after seeding it and believe the data had
   reverted. That copy carries no stamp — it predates the stamp — so
   the cohort of absent tables is what has to speak for it.
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
const {
  isStaleNorthside,
  loadNorthsideProject,
  northsideDrift,
  northsideSeedFingerprint,
} = await import('./northside')
const { forgetSeedStamp, readSeedStamp, writeSeedStamp } = await import('./seedStamp')

const verdict = (): boolean => {
  const s = useProjectStore.getState()
  return isStaleNorthside(northsideDrift(s.entities, s.rowsByEntity, s.modules))
}

describe('an edit is never mistaken for an older copy', () => {
  beforeEach(() => {
    forgetSeedStamp()
    loadNorthsideProject()
  })

  it('stamps the browser with the build it was seeded from', () => {
    expect(readSeedStamp()?.seed).toBe(northsideSeedFingerprint())
    expect(verdict()).toBe(false)
  })

  it('says nothing when one row is added — the bug, in one line', () => {
    const store = useProjectStore.getState()
    const table = Object.values(store.entities).find(
      (e) => (store.rowsByEntity[e.id]?.length ?? 0) > 0 && e.role !== 'join',
    )
    expect(table).toBeDefined()
    const before = useProjectStore.getState().rowsByEntity[table!.id].length

    useProjectStore.getState().addRow(table!.id)

    expect(useProjectStore.getState().rowsByEntity[table!.id].length).toBe(before + 1)
    expect(verdict()).toBe(false)
  })

  it('says nothing when rows are deleted, tables are added, or a table is struck off', () => {
    const store = useProjectStore.getState()
    const table = Object.values(store.entities).find(
      (e) => (store.rowsByEntity[e.id]?.length ?? 0) > 3 && e.role !== 'join',
    )!
    const rows = store.rowsByEntity[table.id]
    useProjectStore.getState().deleteRow(table.id, rows[0].id)
    useProjectStore.getState().deleteRow(table.id, rows[1].id)
    expect(verdict()).toBe(false)

    useProjectStore.getState().createEntity({ name: 'My own table' })
    expect(verdict()).toBe(false)

    useProjectStore.getState().deleteEntity(table.id)
    expect(verdict()).toBe(false)
  })
})

describe('an older copy of the example still says so', () => {
  beforeEach(() => {
    forgetSeedStamp()
    loadNorthsideProject()
  })

  it('speaks on the stamp when the browser was seeded from an older build', () => {
    /* the sheet is untouched; the only thing that is old is the build
       it came from, which is the whole point */
    writeSeedStamp('an-older-build')
    expect(verdict()).toBe(true)
  })

  it('speaks for an unstamped 21-table copy, and says what differs', () => {
    /* THE COPY THE OWNER MET. Seeded long before any stamp existed,
       so provenance is unknown and the absent tables have to carry
       it — and they do, because a person does not quietly lose
       thirty-one tables. */
    forgetSeedStamp()
    const s = useProjectStore.getState()
    const names = Object.values(s.entities)
    const keep = names.slice(0, 21)
    const entities = Object.fromEntries(keep.map((e) => [e.id, e]))
    const rows = Object.fromEntries(keep.map((e) => [e.id, s.rowsByEntity[e.id] ?? []]))

    const drift = northsideDrift(entities, rows, {})
    expect(drift).not.toBeNull()
    expect(isStaleNorthside(drift)).toBe(true)
    expect(drift!.missing.length).toBeGreaterThan(20)
    expect(drift!.noModules).toBe(true)
    /* nine places now: the set was five names and two of them were
       bags — see northsideModules.test.ts and features/modules/split.ts */
    expect(drift!.moduleCount).toBe(9)
  })

  it('still says nothing about a sheet that is somebody else’s work', () => {
    forgetSeedStamp()
    expect(northsideDrift({}, {}, {})).toBeNull()
  })
})
