/* ============================================================
   WIPING A PROJECT WIPES THE PROJECT.

   THE DEFECT, WRITTEN DOWN BEFORE IT WAS BUILT AND THEN LEFT.
   `features/constraints/index.ts:63` says it in as many words:
   "`resetProject()` should also call `clearConstraints()` … or a
   wiped project comes back with the old organisation's rules still
   in it — and `forgetWorkbookSeeds()` with it". It never did. What
   `resetProject` actually did was `repository.wipe()`, which empties
   every DEXIE store and nothing else.

   AND IT IS LARGER THAN THAT NOTE KNEW, because the note was written
   when three registries lived outside Dexie and there are now
   sixteen. Swept for key literals across `src/`: the quotes, the
   business rules, the workbook seeds, the discovered-rule decisions,
   the module verbs, the seed stamp, the merge apply-log, the column
   mapping memory, the activity log, six pipeline stores, where a
   quote was started, the palette's recents, the dashboard
   arrangement and the tile order. Press "start again" and every one
   of them survived — so a fresh project opened carrying the previous
   business's rules, its quotes, its sales board and its history, and
   the seed stamp told it the demo data had already been loaded.

   WHY BY KEY PREFIX AND NOT BY CALLING SIXTEEN FUNCTIONS. Most of
   those modules expose a `forget…()` that drops an in-memory cache
   for tests and leaves the stored copy where it is — which is
   exactly the half of the job that does not fix this. Removing the
   KEY is the half that does, and it has a second virtue: it takes
   EVERY organisation’s rows and not only the open one, which is
   what "wipe" means to the person pressing it.

   THE SCOPING IS NOT ALL IN THE KEY, AND THE PREFIX SWEEP IS RIGHT
   EITHER WAY. Most of these carry the org slug appended to the key
   (TENANCY §4.1), so one key exists per business. Three do not:
   `helmlogic.discovered.v1`, `helmlogic.constraints.seeded.v1` and
   `helmlogic.moduleRules.v1` each hold ONE key whose payload is a
   `Record<orgKey, …>`, with the tenancy one level in — read through
   `getDecisions(orgKey)` and `readLedger()[orgKey]`. That is a
   legitimate shape and it is still per-tenant; it only means the
   sweep takes the whole map at once, which is the intent.

   THE IN-MEMORY COPIES ARE DROPPED TOO, through `import()` rather
   than a static import. Half of these modules read the project store
   for the org key, so importing them from here — which the store
   imports — would close a cycle on the app's most central module. A
   destructive act a person performs once can afford one dynamic
   import.

   WHAT IS DELIBERATELY KEPT IS THE OTHER HALF OF THE DECISION, and
   it is why this file lists both. Wiping the sheet must not sign
   somebody out, must not flip their theme, and must not drop the
   multi-tab writer lock — dropping THAT one would let a second tab
   believe it owns a database that is being emptied underneath it.
   ============================================================ */

/** Every stored thing that belongs to the BUSINESS and dies with it.
 *  A prefix, because each is org-scoped with the slug appended. */
export const BUSINESS_KEYS: readonly string[] = [
  /* where a build was started from. The DOCUMENTS themselves are in
     KEPT_KEYS — see the note there. */
  'helmlogic.build.place.v1',
  /* the rules: written, seeded from the workbook, and the decisions
     taken about the ones discovery proposed */
  'helmlogic.constraints.v1',
  'helmlogic.constraints.seeded.v1',
  'helmlogic.discovered.v1',
  /* the tenth verb, while it still lives outside `ModuleDef` */
  'helmlogic.moduleRules.v1',
  /* "this browser has already been given the demo data" — kept out of
     Dexie on purpose, and the one that makes a wiped project refuse
     to offer the seed again */
  'helmlogic.seed.v1',
  /* what an import did, and where a supplier's columns went last time */
  'hl.merges.v1',
  'hl.colmap.v1',
  /* what has happened here */
  'hl.activity.v1',
  /* the sales board: its stages, and everything filed against a deal */
  'hl.pipeline.v1',
  'hl.pipeline.stages.v1',
  'hl.pipeline.since.v1',
  'hl.pipeline.notes.v1',
  'hl.pipeline.owner.v1',
  'hl.pipeline.links.v1',
  'hl.pipeline.card.v1',
  /* where somebody has been — ids into tables that are about to stop
     existing, so keeping it would leave a palette full of dead doors */
  'helmlogic.finder.recent.v1',
  'helmlogic.rail.modules.v1',
  /* how this business arranged its own dashboard, in module ids that
     the wipe is about to invalidate */
  'helmlogic.dashboard.v1',
  'hl.dash.tiles.v1',
]

/** Stored things that survive a wipe, each for a stated reason. A key
 *  that is neither here nor above is unclassified, and
 *  `forgetBusiness.test.ts` fails until somebody decides which it is. */
export const KEPT_KEYS: readonly string[] = [
  /* THE QUOTES, and this was a live data-loss bug until 2026-09-12.

     `sheetNow.ts:71-89` decides it, out loud and at length: "THEY
     SURVIVE ... a dealer who clears the sheet to restore a backup
     would destroy every document they have given a customer". The
     clear-sheet confirm PRINTS that promise, computed and counted —
     "Your 3 quotes stay. A quote is a photograph of what was offered
     on the day ... you can still open and print every one."

     And then it took them. `ImportExportMenu.tsx:366` calls
     `resetProject()`, which calls `forgetBusiness()`, whose first
     BUSINESS_KEY was `helmlogic.quotes.v1` — and
     `forgetBusiness.test.ts` asserted that destruction was correct,
     so the guard was green on the way out.

     The tell that it was a slip and not a decision: `hl.quotes.view`,
     the PREFERENCE for which view of the quotes a person likes, was
     already three lines below in this same list. The preference was
     classified as the person's; the documents were classified as the
     business's and destroyed.

     There is exactly one production caller of `resetProject()` — the
     clear-sheet button — and no org-switch path through here, so
     nothing legitimate wanted them gone. If a tenancy wipe ever does,
     it gets its own list and its own sentence. */
  'helmlogic.quotes.v1',
  /* WHO IS SIGNED IN. Emptying the sheet is not signing out, and a
     person thrown back to a login screen by pressing "start again"
     would reasonably think they had destroyed their account. */
  'hl.session.user',
  /* THE WRITER LOCK, and this is the one that would actually break
     something. A second tab reads it to know it must not write; a
     wipe that cleared it would tell that tab it owns a database
     being emptied underneath it. */
  'helmlogic.sheet.writer.v1',
  /* THE VIEWER'S OWN SETTINGS, which are about the person and not
     the business: the theme, whether the rail is collapsed, which
     table frames are open, which view of the quotes they prefer, and
     how they arranged the rules whiteboard. */
  'hl.theme',
  'hl.rail.collapsed',
  'hl.tb.expanded-frames',
  'hl.quotes.view',
  'hl.wb.arranged-rules',
  /* WHETHER THE CUSTOMER LIST DRAWS ITS A–Z STRIP. Filed under the
     business at first and that was wrong: the value is the string
     'on' or 'off', it names no customer and no organisation, and a
     person who turned the strip off did not mean "until somebody
     wipes the sheet". It is a view preference and it sits with the
     other view preferences. */
  'hl.crm.letters.v1',
]

/** Is this key one the business owns? Prefix, so the org slug that
 *  TENANCY §4.1 appends does not have to be known here. */
export const isBusinessKey = (key: string): boolean =>
  BUSINESS_KEYS.some((p) => key === p || key.startsWith(`${p}:`))

/** Is this key one the PERSON owns, and a wipe must leave standing?
 *  Exported so a test can assert the positive. Asserting only that a
 *  key is not a business key passes for a key nobody has classified
 *  at all, which is how the quotes were lost: the negative was never
 *  the question. */
export const isKeptKey = (key: string): boolean =>
  KEPT_KEYS.some((p) => key === p || key.startsWith(`${p}:`))

/** For the guard: a key this app writes that nobody has classified. */
export const isUnclassified = (key: string): boolean =>
  !isBusinessKey(key) && !isKeptKey(key)

/**
 * Take the business's own data out of this browser.
 *
 * Storage first, so the removal has happened even if a module below
 * fails to load; then the in-memory copies, so a screen that is open
 * redraws empty rather than showing rows whose store has gone.
 */
export async function forgetBusiness(): Promise<void> {
  try {
    const store = globalThis.localStorage
    if (store) {
      const doomed: string[] = []
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i)
        if (key !== null && isBusinessKey(key)) doomed.push(key)
      }
      for (const key of doomed) store.removeItem(key)
    }
  } catch {
    /* a browser refusing storage has nothing stored to forget */
  }

  /* Each of these drops a module-level cache that would otherwise
     outlive the keys above. Failures are swallowed one at a time: a
     module that cannot load must not stop the other fifteen, and the
     stored copy is already gone either way. */
  const drop = async (load: () => Promise<{ [k: string]: unknown }>, fn: string): Promise<void> => {
    try {
      const mod = await load()
      const f = mod[fn]
      if (typeof f === 'function') (f as () => void)()
    } catch {
      /* see above */
    }
  }

  await Promise.all([
    drop(() => import('@/features/quote/quotes'), 'forgetQuotes'),
    drop(() => import('@/features/constraints/constraintDefs'), 'clearConstraints'),
    drop(() => import('@/features/constraints/discoveredRules'), 'clearDecisions'),
    drop(() => import('@/features/constraints/workbookRules'), 'forgetWorkbookSeeds'),
    drop(() => import('@/demos/seedStamp'), 'forgetSeedStamp'),
    drop(() => import('@/features/io/evidence'), 'forgetMerges'),
    drop(() => import('@/features/io/mapMemory'), 'forgetAllMappings'),
    drop(() => import('@/features/dashboard/arrangement'), 'forgetArrangements'),
    drop(() => import('@/features/dashboard/tileOrder'), 'forgetTileOrder'),
    drop(() => import('@/features/pipeline/stages'), 'forgetPipeline'),
    drop(() => import('@/features/pipeline/stageStore'), 'forgetStageStore'),
    drop(() => import('@/features/pipeline/dealNotes'), 'forgetDealNotes'),
    drop(() => import('@/features/pipeline/owners'), 'forgetDealOwners'),
    drop(() => import('@/features/pipeline/dealLinks'), 'forgetDealLinks'),
    drop(() => import('@/features/pipeline/cardFields'), 'forgetCardFields'),
    drop(() => import('@/features/modules/openPlace'), 'forgetPlaces'),
    drop(() => import('@/app/moduleRecent'), 'forgetModuleRecent'),
  ])
}
