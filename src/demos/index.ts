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

   AND THIS FILE NAMES NEITHER `./northside` NOR ANYTHING IN IT.
   The set is a megabyte of a real dealer's price file and it used
   to be imported here statically, which put it in the entry chunk
   and charged it to every first-time visitor including the one who
   opens a blank sheet. It is reached through `./seedChunk` now, in
   a dynamic import, and that file carries the whole reasoning.
   A value re-export from `./northside` — `export { … } from` —
   would put it straight back, so there are none: only types, which
   are erased.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { NORTHSIDE_HOLDS } from './northsideHolds'
import { registerNorthsidePictures } from './northsideImages'
import { loadNorthside, warmNorthside } from './seedChunk'
import { forgetSeedStamp } from './seedStamp'

/* WHERE THE CATALOGUE'S PHOTOGRAPHS ARE, SAID ONCE, AT START-UP.
   `northsideImages.ts` is 108 addresses paired with the copy of each
   one this repository holds, and it is the one part of the set that is
   deliberately NOT behind `seedChunk`. See the file itself for what it
   is; here is why it is charged to the entry chunk when the price file
   is not.
     · IT COSTS 19.6 KB, 4.55 KB GZIP — measured, by building the app
       with and without this one import: index-*.js went 1,403.13 →
       1,422.72 kB, 421.16 → 425.71 kB gzip. That is a THIRTIETH of
       the 139 KB gzip the seed split just took off the entry, and
       about what one of the photographs weighs.
     · IT IS NEEDED ON THE FIRST FRAME. A sheet restored from IndexedDB
       paints thumbnails before anything asks for the seed, and a
       thumbnail that does not know we hold a copy goes to the
       manufacturer for it — which is the exact request this whole
       piece of work exists to stop. Deferred, the app would make the
       hotlinked request once per session and then stop making it,
       which is the worst of both.
     · IT IS NOT ROWS. Nothing here is loaded onto the sheet; it
       answers a question the renderer asks about an address.
   Registered here rather than inside `load` for the same reason: a
   returning visitor never calls `load`. */
registerNorthsidePictures()

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
  /**
   * PUT THE SET ON THE SHEET — and it is a PROMISE, because the data
   * is no longer in the bundle that drew the button.
   *
   * A set whose data lives in its own chunk cannot land in the same
   * frame as the press: the chunk has to arrive first. Every caller
   * must therefore await this AND say something honest in the
   * meantime — `useDemoLoad` in app/ is the one place that does both,
   * and it is what the two doors use. The promise REJECTS when the
   * chunk cannot be fetched, which is a thing a person can be told
   * (they are offline on a first visit); it must not be swallowed.
   */
  load(): Promise<void>
  /**
   * FETCH WHAT `load` WILL NEED, HAVING BEEN GIVEN REASON TO THINK
   * SOMEBODY IS ABOUT TO PRESS IT — a pointer on the door, a focus
   * ring landing on it. Never on mount: that would charge the file
   * to the visitor who is going to open a blank sheet, which is the
   * whole thing the split exists to stop.
   *
   * It says nothing and cannot fail out loud. Nobody asked for
   * anything yet, so nothing may be reported yet; the press asks
   * again and reports honestly if it fails then. Absent on a set
   * with nothing to fetch.
   */
  warm?: () => void
  /**
   * HOW MUCH LANDS, so a door that replaces the whole sheet says what
   * arrives before it is pressed.
   *
   * IT USED TO BUILD THE SET TO COUNT IT, and that was the right
   * instinct answered the wrong way: the count is drawn on the screen
   * a person with an EMPTY sheet sees, so counting the price file
   * downloaded the price file for the one visitor who never asked for
   * it. The figures are pinned in `northsideHolds.ts` now and a test
   * fails the moment the seed disagrees with them — see that file for
   * why a guarded constant beats a silent staleness.
   *
   * Synchronous, and free. Undefined on a set with nothing in it: the
   * blank sheet's own name says how much it holds.
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
    load: loadNorthside,
    warm: warmNorthside,
    holds: () => NORTHSIDE_HOLDS,
  },
  {
    id: 'blank',
    name: 'Blank sheet',
    blurb: 'An empty sheet with nothing on it, ready for your first table.',
    /* nothing to fetch, and it still answers a promise: one shape for
       both doors is what lets `useDemoLoad` treat them the same */
    load: async () => {
      loadBlankProject()
    },
  },
]

/* THE SET ITSELF IS REACHED THROUGH `./seedChunk`, WHICH IS THE ONLY
   FILE ALLOWED TO NAME `./northside`. Everything below is either a
   type (erased) or a record about the set rather than the set. */
export {
  DRIFT_GATE,
  loadNorthside,
  northsideFreshness,
  warmNorthside,
} from './seedChunk'
export type { SeedFreshness } from './seedChunk'
export { NORTHSIDE_HOLDS } from './northsideHolds'
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
