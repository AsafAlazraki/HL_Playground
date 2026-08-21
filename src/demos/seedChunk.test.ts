/* ============================================================
   THE GATE IN FRONT OF THE SEED'S CHUNK NEVER HIDES A REAL ANSWER.

   `northsideFreshness` will not fetch the price file to ask whether
   a sheet is an older copy of it unless the sheet has at least
   `DRIFT_GATE` tables on it. That is what keeps the split worth
   having for a RETURNING visitor as well as a new one: a blank
   sheet, a dealer's own six tables, a project restored from an
   import — none of them download a megabyte to be told they are not
   Northside Marine.

   A GATE LIKE THAT IS ONLY SAFE IF IT IS A NECESSARY CONDITION OF
   THE REAL ANSWER, and this is where that is checked. The seed's
   own `northsideDrift` returns null below `RECOGNISE_FLOOR` — eight
   RECOGNISED tables — and it can never recognise more tables than
   the sheet has. So every sheet the gate turns away would have been
   answered null anyway.

   `RECOGNISE_FLOOR` is private to northside.ts and this does not
   reach for it. It checks the behaviour instead: sheets built from
   the set's OWN table names, one table short of the gate, still get
   null out of the real function. If somebody lowers the floor, this
   goes red before anybody loses a notice.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
const { buildNorthsideProject, loadNorthsideProject, northsideDrift, isStaleNorthside } =
  await import('./northside')
const { DRIFT_GATE, northsideFreshness } = await import('./seedChunk')
const { forgetSeedStamp, writeSeedStamp } = await import('./seedStamp')

/** A sheet carrying the first `n` of the set's own tables, by name —
 *  the friendliest possible input to recognition, so what fails here
 *  fails for every sheet of that size.
 *
 *  BUILT ONCE. This used to call `buildNorthsideProject()` on every
 *  invocation, and the gate test calls it DRIFT_GATE times in a loop —
 *  so the suite built the whole price file once per iteration. That was
 *  invisible while the set was 11,116 rows and timed out at 15,691, and
 *  the reason it timed out is not the thing under test: recognition
 *  reads NAMES off the entities it is handed. One build, sliced, is the
 *  same input to `northsideDrift` and a fraction of the work. */
let built: ReturnType<typeof buildNorthsideProject> | null = null
const sheetOf = (n: number): Record<string, EntityDef> => {
  built ??= buildNorthsideProject()
  const out: Record<string, EntityDef> = {}
  for (const e of built.entities.slice(0, n)) out[e.id] = e
  return out
}

describe('the gate in front of the seed chunk', () => {
  beforeEach(() => {
    forgetSeedStamp()
  })

  it('turns away only sheets the set could never recognise', () => {
    for (let n = 0; n < DRIFT_GATE; n += 1) {
      expect(northsideDrift(sheetOf(n), {}, {}), `${n} tables`).toBeNull()
    }
  })

  it('is not looser than it needs to be — at the gate the set answers', () => {
    /* the first sheet the gate lets through is one the set really
       does have something to say about; a gate set higher than this
       WOULD hide an answer */
    expect(northsideDrift(sheetOf(DRIFT_GATE), {}, {})).not.toBeNull()
  })

  it('says nothing about a sheet below it without fetching anything', async () => {
    expect(await northsideFreshness({}, {}, {})).toBeNull()
    expect(await northsideFreshness(sheetOf(DRIFT_GATE - 1), {}, {})).toBeNull()
  })

  it('gives the same verdict as the set does, through the chunk', async () => {
    loadNorthsideProject()
    const s = useProjectStore.getState()
    const fresh = await northsideFreshness(s.entities, s.rowsByEntity, s.modules)
    expect(fresh).not.toBeNull()
    const direct = northsideDrift(s.entities, s.rowsByEntity, s.modules)
    expect(fresh?.drift).toEqual(direct)
    expect(fresh?.stale).toBe(isStaleNorthside(direct))
    /* freshly seeded, so: not an older copy */
    expect(fresh?.stale).toBe(false)
  })

  it('carries the version the notice has to record, so nobody asks twice', async () => {
    loadNorthsideProject()
    /* a browser seeded from a build that is not this one — the case
       the whole freshness mechanism exists for */
    writeSeedStamp('older')
    const s = useProjectStore.getState()
    const fresh = await northsideFreshness(s.entities, s.rowsByEntity, s.modules)
    expect(fresh?.stale).toBe(true)
    /* and "Keep this one" is recorded against the CURRENT build,
       which the caller reads off here rather than reaching back into
       the chunk for */
    expect(fresh?.fingerprint).toBe(
      (await import('./northside')).northsideSeedFingerprint(),
    )
  })
})
