/* ============================================================
   demos — the starting points offered in the empty state and the
   I/O menu. Each one loads atomically in a single replaceProject
   call and leaves the sheet at REV 00.

   CONFIGURATOR_SPEC.md §6b — "Starting data — REAL, or none at all":
   invented sample data is banned. The `fitment` set (made-up
   Highfield / Yamaha / Redco figures) has been DELETED, and the
   `dealership` set (invented boats, customers, deals and margins
   carried under the real dealership's name) is offered nowhere —
   it survives only as `loadSampleProject` in `@/features/io/sample`,
   which no surface calls.

   Exactly two starting points, and no third:
     1. "Northside Marine" — the real Master Price File, every value
        traceable to a source cell (`./northside`);
     2. an empty sheet.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { buildNorthsideProject, loadNorthsideProject } from './northside'
import { forgetSeedStamp } from './seedStamp'

export interface DemoSet {
  id: string
  name: string
  /** one plain sentence describing what lands on the sheet */
  blurb: string
  /**
   * WHOSE BUSINESS THE DATA IS, when it is anybody's — and this is not
   * decoration either.
   *
   * The doors that offer this set called it "another dealer's price
   * file". That was written when Northside Marine was a sample, and it
   * became false the day they became the first real customer: the first
   * sentence they read on the app described their own catalogue as a
   * stranger's. Naming the business here is what lets each door work
   * out which of its two true readings applies — see
   * `startingPointWords` in app/demoLoad.ts.
   *
   * Blank on a set that is nobody's data.
   */
  business?: string
  /** What the business calls the document itself. Blank when there is
   *  no document behind the set. */
  file?: string
  load(): void
  /**
   * HOW MUCH LANDS, COUNTED FROM THE SET RATHER THAN WRITTEN BY HAND.
   *
   * A door that says "load the price file" and nothing else asks a
   * person to press a button that replaces their whole sheet without
   * telling them what arrives. The number matters most on the first
   * screen anybody sees, which is exactly where a hand-typed "52
   * tables, 3,566 rows" would go stale the first time the seed changed
   * and nobody remembered — the same trap `northsideSeedFingerprint`
   * exists to avoid, and it is solved the same way: derive it.
   *
   * It BUILDS the set to count it, so it is not free — roughly one
   * `buildNorthsideProject()`. Call it once, behind a `useMemo`, on a
   * surface that is actually drawing the offer. Undefined on a set with
   * nothing in it: the blank sheet's own name says how much it holds.
   */
  holds?: () => { tables: number; rows: number }
}

/** A clean sheet — nothing on the canvas, nothing in the data. */
export function loadBlankProject(): void {
  useProjectStore.getState().replaceProject({
    name: 'Untitled Sheet',
    entities: [],
    groups: [],
    rules: [],
    rowsByEntity: {},
  })
  /* the stamp says where the sheet came from, so it must not outlive
     the sheet — see seedStamp.ts */
  forgetSeedStamp()
}

export const DEMOS: DemoSet[] = [
  {
    id: 'northside',
    name: 'Northside Marine',
    blurb: 'Real data extracted from Northside Marine’s Master Price File.',
    business: 'Northside Marine',
    file: 'Master Price File',
    load: loadNorthsideProject,
    holds: () => {
      const p = buildNorthsideProject()
      let rows = 0
      for (const list of Object.values(p.rowsByEntity)) rows += list.length
      return { tables: p.entities.length, rows }
    },
  },
  {
    id: 'blank',
    name: 'Blank sheet',
    blurb: 'An empty sheet with nothing on it, ready for your first table.',
    load: loadBlankProject,
  },
]

export {
  NORTHSIDE_NAME,
  buildNorthsideProject,
  isStaleNorthside,
  loadNorthsideProject,
  northsideDrift,
  northsideSeedFingerprint,
  seedNorthsideModules,
} from './northside'
export type { NorthsideProject, SeedDrift } from './northside'

/* WHICH BUILD OF THE SET THIS BROWSER WAS SEEDED FROM — the record
   that lets the freshness notice tell an older seed from an edit.
   See seedStamp.ts for why that distinction is the whole mechanism. */
export {
  forgetSeedStamp,
  isStaleSeedCopy,
  keepSeedVersion,
  readSeedStamp,
  writeSeedStamp,
} from './seedStamp'
export type { SeedStamp } from './seedStamp'
