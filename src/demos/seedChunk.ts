/* ============================================================
   THE SEED'S OWN CHUNK — the one place in the app that names
   `./northside`, and the only reason it is a separate file.

   WHAT WAS MEASURED, and it is recorded in full in
   docs/plan/SEED_AT_FULL_SCALE.md §4:

     dist/assets/index-*.js was 2,291 kB / 551 kB gzip, of which the
     Northside literal is ~139 kB gzip — a quarter of everything a
     first-time visitor downloads, PAID EVEN BY SOMEBODY WHO OPENS A
     BLANK SHEET, because `demos/index.ts` imported `./northside`
     statically. At full scale (11,116 rows) that becomes ~246 kB
     gzip of a dealer's price file most sessions never touch.

   WHAT WAS NOT CHANGED, and the reasons are adjudicated in §4.2:
   the seed stays a generated TypeScript literal. It is type-checked
   against `SeedTable`, and `emit.py` writes ONE ROW PER LINE so a
   price change in the workbook is a one-line diff a person can read
   in a review. JSON fetched at runtime breaks local-first (there is
   no service worker) and loses the type check; `import x from
   './northside.json'` is inlined into the same chunk by Vite and so
   buys nothing at all.

   SO ONLY THE LOADING CHANGED. `import('./northside')` makes
   Rolldown emit the literal as its own chunk: still built at build
   time, still served from the same origin, still cached by the
   browser and therefore still offline-capable after a first visit,
   still typed, still one row per line in git. It arrives when
   somebody asks for Northside Marine, and not before.

   WHY EVERY DOOR COMES THROUGH HERE rather than writing its own
   `import('./northside')`. Two of them would still be one chunk, so
   this is not about bytes — it is that a static `import` added
   anywhere else silently undoes all of the above, and a single
   named boundary is the thing a reader can check. `demos/index.ts`
   re-exports no VALUE out of `./northside` for the same reason: a
   re-export is a static import wearing a different hat.
   ============================================================ */

import type { EntityDef, ModuleDef, RowData } from '@/types/model'
import type { SeedDrift } from './northside'

/** THE ONE IMPORT. Everything below is a door onto it.
 *
 *  The module registry caches it, so the second caller pays a
 *  resolved promise and no second request. */
const seed = () => import('./northside')

/** Fetch the chunk without doing anything with it — used when a
 *  person has shown intent (a pointer on the door that loads the
 *  set) but has not pressed yet, so the press finds it already
 *  here. Failure is deliberately swallowed: nothing was asked for
 *  out loud, so nothing may be said out loud. The press asks again
 *  and reports honestly if it fails then. */
export function warmNorthside(): void {
  void seed().catch(() => undefined)
}

/** Put the set on the sheet. Rejects if the chunk cannot be
 *  fetched — the caller is a button and has somewhere to say so. */
export async function loadNorthside(): Promise<void> {
  const m = await seed()
  m.loadNorthsideProject()
}

/* ------------------------------------------------------------ */
/* IS THIS COPY OF THE SET AN OLDER BUILD OF IT?                 */
/* ------------------------------------------------------------ */

/** A SHEET WITH FEWER TABLES THAN THIS CANNOT BE THE SET, so the
 *  chunk is not fetched to ask.
 *
 *  This is not a second opinion about recognition — it is the
 *  cheapest necessary condition of the seed's own. `northsideDrift`
 *  returns null below its `RECOGNISE_FLOOR` of eight recognised
 *  tables, and it cannot recognise more tables than the sheet has.
 *  So every sheet this gate turns away would have been answered
 *  `null` anyway, and the gate can only ever save a download.
 *
 *  It is the whole reason the split is worth having on a returning
 *  visitor as well as a new one: a blank sheet, a dealer's own six
 *  tables, or a sheet restored from an import never reaches the
 *  price file at all.
 *
 *  Pinned against the seed's real behaviour by seedChunk.test.ts —
 *  if somebody raises RECOGNISE_FLOOR this number may follow, and
 *  if somebody lowers it the test fails here first. */
export const DRIFT_GATE = 8

export interface SeedFreshness {
  /** what the set holds against what is on the sheet, in the
   *  dealer's own nouns — the notice's evidence */
  drift: SeedDrift
  /** THE VERDICT, and the only field anything may act on: this
   *  sheet came from an OLDER BUILD of the set. The seed decides
   *  it (`isStaleNorthside`); it is carried here so a caller never
   *  has to restate the predicate. */
  stale: boolean
  /** the version of the set as it stands in this build, so
   *  "Keep this one" can be recorded against it without the caller
   *  reaching into the chunk for a second time */
  fingerprint: string
}

/** What the current set holds compared with what is on the sheet, or
 *  null when the sheet did not come from this set — or when it is
 *  too small to have.
 *
 *  ASYNCHRONOUS, AND THAT IS THE ONLY BEHAVIOURAL CHANGE. The notice
 *  this feeds is drawn over a hydrated sheet, a moment after first
 *  paint rather than in the same frame as it. Nothing about the
 *  sheet moves; a notice about a months-old copy of a price file
 *  arrives when the price file does. */
export async function northsideFreshness(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
  modules: Record<string, ModuleDef>,
): Promise<SeedFreshness | null> {
  if (Object.keys(entities).length < DRIFT_GATE) return null
  const m = await seed()
  const drift = m.northsideDrift(entities, rowsByEntity, modules)
  if (drift === null) return null
  return {
    drift,
    stale: m.isStaleNorthside(drift),
    fingerprint: m.northsideSeedFingerprint(),
  }
}
