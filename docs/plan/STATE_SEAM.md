# PHASE 1 — THE STATE SEAM, AS AN EXECUTABLE MAP

> Written 2026-09-12 on `rebuild`. This is the detailed plan behind
> `REBUILD.md` §"Phase 1 — the state seam". Every count in it was measured
> against the tree on the day it was written, and every claim carries a
> `file:line`. Where it disagrees with `REBUILD.md`, this file is the
> measurement and `REBUILD.md` is the estimate — the drift is recorded in §0
> rather than quietly corrected.
>
> **Nothing here has been executed.** It is a map, not a changelog.

---

## §0 — WHAT WAS ACTUALLY MEASURED

| claim in `REBUILD.md:83-105` | measured | verdict |
|---|---|---|
| "about **thirty** hand-rolled `useSyncExternalStore` modules across 35 files" | **35 files** match `useSyncExternalStore`; 4 are tests, 2 are `.tsx` consuming a *React-free* store. **29 store modules**, **8,178 LOC** | correct |
| "**14,065 LOC** that reads as logic is React-bound" | **65** non-test `.ts` files import `react`, **15,906 LOC** | stale-low by 1,841 |
| `features/quote/quotes.ts` **1,239 LOC** | 1,239 | correct |
| `lib/actions.ts` 271 · `lib/imageSources.ts` 670 · `lib/icons.tsx` 83 | 271 · 670 · 83 | correct |
| "23 `useMemo`s in `ModuleIndex.tsx`, 19 in `BlockCard.tsx`, 15 in `Grid.tsx`" | **22 · 18 · 14** = 54 | over by 1 each |
| `tools/check-stores.mjs` reports "29 keys · 21 forgotten · 8 kept" | verified by running it | correct |
| DB is at `db.version(4)` | `src/db/database.ts:73` | correct |

Two further corrections to `CLAUDE.md`, found while measuring and worth
fixing in the same pass:

- `npm test` runs **seven** guards, not five — `check:words` and
  `check:stores` were added (`package.json`, the `test` script).
- The lint ceiling is **355**, not 400 (`package.json`, the `lint` script).

**There are three Dexie databases, not one.** This matters for §3 and nothing
in `REBUILD.md` says it:

| db | file:line | version | stores |
|---|---|---|---|
| `helmlogic-dynamic-config` | `src/db/database.ts:15` | 4 | meta, entities, groups, rules, rows, views, modules, roles |
| `helmlogic-deal-files` | `src/features/pipeline/dealFiles.ts:142` | 1 | `files: 'id, [orgSlug+quoteId]'` |
| `helmlogic-tenancy` | `src/features/tenancy/archive.ts:125` | — | saved configurations |

---

## §1 — THE CENSUS: EVERY AD-HOC STORE

29 modules. `prod` counts non-test importing files; `tsx` counts non-test
`.tsx` importers. Sorted by LOC.

| # | file | LOC | what it holds | persists where | prod / tsx | nature |
|---|---|---|---|---|---|---|
| 1 | `src/features/quote/quotes.ts` | **1239** | the `QuoteDef` registry — the central CPQ entity | `localStorage` `helmlogic.quotes.v1:<orgKey>` (`:72`,`:74`) | 7 direct / 6 · **26 more via the barrel** | **DOMAIN, durable** |
| 2 | `src/features/dashboard/arrangement.ts` | 526 | card order, quick links, "has this person ever rearranged" | `helmlogic.dashboard.v1:<org>:<user>` (`:349`) | 8 / 4 | preference (per person) |
| 3 | `src/features/constraints/discoveredRules.ts` | 440 | kept/dismissed decisions on discovered patterns, `Record<orgKey, KeptPattern[]>` | `helmlogic.discovered.v1` (`:178`), one key, org one level in | 2 / 1 | **DOMAIN, durable** |
| 4 | `src/features/pipeline/owners.ts` | 406 | `OwnerBag` — the handover chain per deal | `hl.pipeline.owner.v1:<org>` (`:312`) | 4 / 2 | **DOMAIN, durable** |
| 5 | `src/features/auth/session.ts` | 379 | the signed-in `AppUser` | `hl.session.user` (`:198`) | 9 / 5 | session (KEPT on wipe) |
| 6 | `src/features/constraints/constraintDefs.ts` | 355 | the `ConstraintDef` registry, per orgKey | `helmlogic.constraints.v1` (`:94`) | 11 / 8 | **DOMAIN, durable** |
| 7 | `src/features/pipeline/stageStore.ts` | 341 | the dealership's own `StageDef[]` | `hl.pipeline.stages.v1:<org>` (`:198`) | 7 / 5 | **DOMAIN, durable** |
| 8 | `src/features/io/evidence.ts` | 334 | merge evidence log — what an import actually wrote | `hl.merges.v1:<orgKey>` (`:103`), capped at 10 | 2 / 2 | audit log (durable) |
| 9 | `src/features/table/tableCanvasState.ts` | 333 | node frame sizes, column widths, expanded frames, focused table | memory + `hl.tb.expanded-frames` (`:66`) | 5 / 2 | session |
| 10 | `src/features/activity/activity.ts` | 305 | `Entry[]` — what changed and who did it | `hl.activity.v1:<org>` (`:64`) | 8 / 6 | audit log (durable) |
| 11 | `src/features/pipeline/dealLinks.ts` | 296 | `LinkBag` — labelled URLs per deal | `hl.pipeline.links.v1:<org>` (`:216`) | 3 / 1 | **DOMAIN, durable** |
| 12 | `src/features/whiteboard/canvasState.ts` | 289 | sheet layer, selected rule node, new-table request, camera, arranged rules | memory + `hl.wb.arranged-rules` (`:205`) | 2 / 1 | session |
| 13 | `src/features/pipeline/dealNotes.ts` | 285 | `NoteBag` — the thread per deal | `hl.pipeline.notes.v1:<org>` (`:196`) | 4 / 2 | **DOMAIN, durable** |
| 14 | `src/features/pipeline/stages.ts` | 284 | `Record<quoteId, StageId>` + the arrival clock | `hl.pipeline.v1:<org>` (`:54`), `hl.pipeline.since.v1:<org>` (`:181`) | 4 / 2 | **DOMAIN, durable** |
| 15 | `src/features/pipeline/dealFiles.ts` | 278 | `DealFile` blobs on a deal | **already Dexie** — `helmlogic-deal-files` (`:142`) | 3 / 1 | **DOMAIN, durable — done** |
| 16 | `src/lib/actions.ts` | 271 | the action-bar register, `Map<owner, ActionGroup[]>` | memory only | 15 / 15 | session/UI |
| 17 | `src/features/views/viewDefs.ts` | 266 | the `ViewDef` registry | **memory only** — mirrored to the store by `src/app/viewPersistence.ts` | 7 / 5 | **DOMAIN — duplicated** |
| 18 | `src/features/pipeline/cardFields.ts` | 264 | which four facts a person wants on a deal card | `hl.pipeline.card.v1:<org>:<user>` (`:208`) | 3 / 2 | preference (per person) |
| 19 | `src/features/io/mapMemory.ts` | 260 | where a supplier's columns went last time, by header fingerprint | `hl.colmap.v1:<orgKey>` (`:79`), capped at 24 | 1 / 1 | cache (durable, rebuildable) |
| 20 | `src/app/moduleRecent.ts` | 161 | the four modules this person last opened | `helmlogic.rail.modules.v1` (`:56`) | 1 / 1 | preference (per person) |
| 21 | `src/features/table/tableReadState.ts` | 132 | row density + only-filled-columns, per table | memory (session) | 6 / 3 | session |
| 22 | `src/features/auth/role.ts` | 128 | derives the session role id; subscribes to `session.ts` | — (no storage of its own) | 1 / 0 | **derived — delete** |
| 23 | `src/features/dashboard/tileOrder.ts` | 109 | module tile order on one person's front door | `hl.dash.tiles.v1:<org>:<user>` (`:31`) | 1 / 1 | preference (per person) |
| 24 | `src/features/table/tableFitState.ts` | 94 | fitted column widths, per table | memory (session) | 5 / 2 | session |
| 25 | `src/features/table/catalogueLens.ts` | 94 | jobs / gallery / list, per table | memory (session) | 3 / 1 | session |
| 26 | `src/features/table/tableSectionState.ts` | 93 | which column bands are folded, per table | memory (session) | 4 / 0 | session |
| 27 | `src/features/table/rowRevealState.ts` | 80 | one pending "go to this row" request, per table | memory (one-shot) | 3 / 2 | session |
| 28 | `src/features/table/tableGroupState.ts` | 68 | which groups are folded, per table | memory (session) | 4 / 0 | session |
| 29 | `src/features/rules/runStore.ts` | 68 | the current rule-run result | memory (never persisted, by design) | 2 / 0 | session |

**The two `.tsx` that are already right.** `src/app/AdminStage.tsx:188-192` and
`src/features/tenancy/ConfigurationsPanel.tsx:80` call `useSyncExternalStore`
inline against `subscribeToArchive` / `archiveVersion`, which live in
`src/features/tenancy/configs.ts:342,349` — **a file that imports no React at
all.** That is the target shape for every entry in the table above: the store
is framework-free, the hook is at the call site. Cite it in review.

**Four related persisted modules that are NOT external stores** but appear in
`BUSINESS_KEYS` and therefore matter to §4:

| file | LOC | key |
|---|---|---|
| `src/features/quote/place.ts` | 153 | `helmlogic.build.place.v1` (`:63`) |
| `src/features/search/recent.ts` | 171 | `helmlogic.finder.recent.v1` (`:76`) |
| `src/demos/seedStamp.ts` | 214 | `helmlogic.seed.v1` (`:69`) |
| `src/features/modules/adoptConfigure.ts` | 89 | `helmlogic.moduleRules.v1` (`:6`,`:36`) |
| `src/features/constraints/workbookRules.ts` | 1751 | `helmlogic.constraints.seeded.v1` (`:1651`) |

And **four keys read inline from a `.tsx`**, with no module behind them at all:
`hl.quotes.view` (`src/app/QuoteStage.tsx:67`), `hl.crm.letters.v1`
(`src/features/crm/CustomerList.tsx:102`), `hl.rail.collapsed`
(`src/app/SideNav.tsx:112`), `hl.theme` (`src/features/auth/WhoChip.tsx:35`).
These four are the reason §2(c) needs a shared helper.

---

## §2 — CLASSIFICATION: WHERE EACH ONE GOES

### (a) INTO `useProjectStore` — 2 modules

| file | why | what changes |
|---|---|---|
| `src/features/views/viewDefs.ts` (266) | **The store already owns this.** `db.views` exists since `database.ts:36`, `ProjectSnapshot.views` since `repository.ts:22`, and `src/app/viewPersistence.ts` is a 78-line shim that hydrates the registry from the store on mount and mirrors it back on every publish, using a `JSON.stringify` shape-diff (`viewPersistence.ts:44`) to avoid a write loop. Two sources of truth and a diff to keep them apart is the exact defect Phase 1 exists to remove. | Delete `viewDefs.ts`'s registry (`:23-60`) and `viewPersistence.ts` **entirely**. Re-point the write functions (`addBlock:175` … `removeBlock:252`) at `useProjectStore` actions. `useViewDefs`/`useViewDef` become `useProjectStore` selectors. 7 prod importers. |
| `src/features/constraints/constraintDefs.ts` (355) | The file's own header (`:4-22`) says it: *"TEMPORARY HOME, and deliberately shaped like the one the store will replace it with… `viewDefs.ts` did exactly this."* 11 prod importers, 8 of them `.tsx`. | A `constraints` slice + a `db.version(6)` table (see §8 Step 11). `adoptSlugKey` (`:260`) becomes a Dexie upgrade hook. |

### (b) INTO DEXIE AS DURABLE DOMAIN DATA — 8 modules

Everything in this group is a **business record** that currently lives in a
5–10 MB localStorage budget shared with the dashboard arrangement and the
activity log — a limit `dealFiles.ts:4-12` already argues at length.

| file | LOC | target table | key / index |
|---|---|---|---|
| `src/features/quote/quotes.ts` | 1239 | **`quotes`** — see §3 | `id, orgKey, [orgKey+state], [orgKey+customerRowId]` |
| `src/features/pipeline/stages.ts` | 284 | `dealStages` | `[orgSlug+quoteId]` |
| `src/features/pipeline/stageStore.ts` | 341 | `stageDefs` | `[orgSlug+id]` |
| `src/features/pipeline/dealNotes.ts` | 285 | `dealNotes` | `id, [orgSlug+quoteId]` |
| `src/features/pipeline/dealLinks.ts` | 296 | `dealLinks` | `id, [orgSlug+quoteId]` |
| `src/features/pipeline/owners.ts` | 406 | `dealOwners` | `id, [orgSlug+quoteId]` |
| `src/features/activity/activity.ts` | 305 | `activity` | `id, [orgSlug+at]` |
| `src/features/constraints/discoveredRules.ts` | 440 | `discoveries` | `id, orgKey` |

**Put the five pipeline tables in `helmlogic-deal-files`, renamed
`helmlogic-pipeline`, not in `helmlogic-dynamic-config`.** The reason is
`repository.ts:360-368`: `wipe()` clears every store on the config database in
one transaction, and none of these five may be destroyed by a sheet clear (see
the contradiction in §3.6). A separate database makes that structural rather
than a rule somebody has to remember.

`src/features/io/evidence.ts` (334) and `src/features/io/mapMemory.ts` (260)
are **borderline (b)**: both are capped logs (`KEEP = 10` at `evidence.ts:91`,
`KEEP = 24` at `mapMemory.ts:77`) and losing either costs a person a re-typed
column mapping, not a document. Move them **last, or not at all**.

### (c) STAYS SESSION-ONLY, MOVES TO A SHARED HELPER — 14 modules

These are correct as session state and wrong as fourteen copy-pasted
implementations of the same fifty lines. Measured: each of `tableFitState`,
`tableGroupState`, `tableSectionState`, `tableReadState`, `catalogueLens` and
`rowRevealState` is the same `Record<entityId, T>` + `listeners: Set` +
`useSyncExternalStore` shape.

**Build `src/lib/store/externalStore.ts` — framework-free, zero React
imports** — exporting:

```
makeStore<T>(initial: T)            → { get, set, subscribe }
makeKeyedStore<T>(fallback: T)      → { get(key), set(key, v), subscribe, forget(key), keys() }
makePersistedStore<T>(key, parse)   → the same, write-behind at 400ms, pagehide flush
```

and `src/lib/store/useStore.ts` — the **only** file in the helper that imports
React — exporting `useStore(store)` and `useKeyed(store, key)`.

Then each of these becomes a ~20-line declaration:

| file | LOC now | helper |
|---|---|---|
| `src/features/table/tableFitState.ts` | 94 | `makeKeyedStore` |
| `src/features/table/tableGroupState.ts` | 68 | `makeKeyedStore` |
| `src/features/table/tableSectionState.ts` | 93 | `makeKeyedStore` |
| `src/features/table/tableReadState.ts` | 132 | `makeKeyedStore` |
| `src/features/table/catalogueLens.ts` | 94 | `makeKeyedStore` |
| `src/features/table/rowRevealState.ts` | 80 | `makeKeyedStore` (one-shot) |
| `src/features/table/tableCanvasState.ts` | 333 | `makeKeyedStore` ×3 + `makePersistedStore` for `hl.tb.expanded-frames` |
| `src/features/whiteboard/canvasState.ts` | 289 | `makeStore` + `makePersistedStore` |
| `src/features/rules/runStore.ts` | 68 | `makeStore` |
| `src/features/dashboard/arrangement.ts` | 526 | `makePersistedStore` keyed by `org:user` |
| `src/features/dashboard/tileOrder.ts` | 109 | `makePersistedStore` |
| `src/features/pipeline/cardFields.ts` | 264 | `makePersistedStore` |
| `src/app/moduleRecent.ts` | 161 | `makePersistedStore` |
| `src/features/auth/session.ts` | 379 | `makePersistedStore` — **stays in localStorage.** `forgetBusiness.ts:105-108` keeps this key deliberately; a wipe must not sign anyone out. |

The four inline `.tsx` keys listed at the end of §1 (`hl.quotes.view`,
`hl.crm.letters.v1`, `hl.rail.collapsed`, `hl.theme`) become
`makePersistedStore` declarations in a new
`src/features/settings/viewerPreferences.ts`, which is also the right home for
the `KEPT_KEYS` half of §4.

**Estimated LOC removed by (c): ~1,400 of 2,690** across those fourteen files,
with `src/lib/store/` costing about 180 back.

### (d) DELETE / DERIVE — 2 modules

| file | LOC | why |
|---|---|---|
| `src/features/auth/role.ts` | 128 | It holds no state. `useSessionRoleId()` (`:125`) is `useSyncExternalStore(subscribeToSession, …)` narrowed to one field of the `AppUser` that `session.ts` already publishes. Once `session.ts` is a `makePersistedStore`, this becomes `useStore(sessionStore, sessionRoleId)` — three lines, and `sessionRoleId` (`:72`) / `roleInForce` (`:87`) / `roleOf` (`:105`) are already pure and stay. **1 prod importer.** |
| `src/app/viewPersistence.ts` | 78 | Deleted by (a). It exists only to reconcile two stores of one fact. |

### `src/lib/actions.ts` — neither; see §5.3

---

## §3 — THE QUOTE MIGRATION, EXACTLY

### 3.1 What `QUOTE_SPEC.md:823-833` asked for, and what must now be refused

`src/features/quote/index.ts:59-63` records the ask verbatim: a `quotes` slice
holding `Record<string, QuoteDef>`, `createQuote`/`updateQuote`/`deleteQuote`,
`QuoteDef[]` on `ProjectSnapshot`, a `db.version(3)` table, and the three
`Promise.all` lists in `DexieProjectRepository`. **Half of it must now be
refused**, and the reason is in the same file 20 lines down and in
`src/features/io/sheetNow.ts:57-80`:

> *"a REPLACE deliberately does NOT clear quotes, and a CLEAR SHEET does not
> either. A quote is a photograph of what was offered on a day and does not
> depend on the sheet, so it outlives one."*

`ProjectSnapshot` is exactly the set of things `repository.wipe()` destroys
(`repository.ts:344-372`). **Putting quotes on `ProjectSnapshot` would wire
them into the one code path that must never touch them.** So:

> **DECISION: quotes get their own Dexie table and their own repository
> interface. They are NOT added to `ProjectSnapshot`, NOT added to `saveAll`,
> and NOT added to `wipe`.**
>
> The spec asked for a slice because the alternative it could see was
> localStorage. The third option — a table beside the project rather than
> inside it — is what `dealFiles.ts:142` has already proved works.

### 3.2 `db.version(5)` — the exact shape

In `src/db/database.ts`, after line 82:

```ts
/* v5 adds the quotes table. A quote is stored BY VALUE — every field on
   every line is already a number or a string (QuoteDef, model.ts:1696) —
   which is what made localStorage sufficient and what makes a Dexie row
   safe: writing one out and reading it back cannot change a figure.

   `orgKey` is a SEPARATE COLUMN and not part of the document. QuoteDef has
   no org field (model.ts:1696-1755) and must not grow one: a quote travels
   inside a saved copy (io/envelope.ts) and a quote carrying the slug of the
   business it left would re-file itself on arrival. So the scope lives on
   the ROW and is stripped at the door — see quoteRepo.ts.

   THE INDEXES, and why each one:
     orgKey                    every read is scoped; TENANCY §4.3
     [orgKey+state]            "the drafts" / "the issued ones", QuoteList
     [orgKey+customerRowId]    quotesForCustomer(rowId), quotes.ts:542
     [orgKey+createdAt]        the diary order, newest first, quotes.ts:88
     [orgKey+rootTableId+rootRowId]  unaddressedDraftFor, quotes.ts:438  */
db.version(5).stores({
  meta: 'id',
  entities: 'id',
  groups: 'id',
  rules: 'id',
  rows: 'id, entityId',
  views: 'id',
  modules: 'id',
  roles: 'id',
  quotes:
    'id, orgKey, [orgKey+state], [orgKey+customerRowId], ' +
    '[orgKey+createdAt], [orgKey+rootTableId+rootRowId]',
})
```

and the typed handle at `database.ts:15-23` gains
`quotes: EntityTable<QuoteRow, 'id'>` with:

```ts
/** A quote on disk: the document, plus the two scopes that are facts
 *  about WHERE it is filed rather than about what it offers. */
export interface QuoteRow extends QuoteDef {
  orgKey: string
  /** flattened from `customerRef.rowId` so Dexie can index it. Dexie
   *  cannot index through an optional nested object, and the alternative
   *  — a full table scan per customer page — is the read
   *  `CustomerPage.tsx:158` does on every paint. */
  customerRowId: string | null
}
```

**`customerRowId` is derived, never authored.** It is written by
`toRow(quote, orgKey)` and dropped by `fromRow(row)`; nothing above the
repository ever sees it. If it ever disagrees with `customerRef.rowId`, the
`customerRef` wins — that is the field the model declares (`model.ts:1745`).

### 3.3 The new module: `src/features/quote/quoteRepo.ts`

**This is the file that must be framework-free**, and it is the whole of the
seam. Shape it exactly like `src/features/tenancy/archive.ts` — an interface, a
Dexie implementation, a memory implementation, and a setter — because that is
how 46 test files already avoid IndexedDB in the node project
(`vi.mock('@/db/repository')`; `memoryArchive()` at `archive.ts:183`):

```ts
export interface QuoteStore {
  all(orgKey: string): Promise<QuoteDef[]>
  put(orgKey: string, quote: QuoteDef): Promise<void>
  remove(id: string): Promise<void>
  clear(orgKey: string): Promise<void>
}
export function memoryQuoteStore(): QuoteStore
export function setQuoteStore(s: QuoteStore): void
export const quoteStore = (): QuoteStore => active
```

### 3.4 What happens to `quotes.ts` — and the synchronous problem

**The registry does not go away, and that is the point.** Many call sites read
a quote synchronously and cannot be made async without touching every screen —
`getQuote` (`quotes.ts:287`) is called 40+ times in tests alone, `allQuotes()`
is called from `exportPayload.ts:143` and `sheetNow.ts:46` inside *synchronous*
functions, and `createQuoteFromView` (`quotes.ts:369`) *returns the quote* so
the stage can open it in the same tick.

So the migration is **a change of sink, not a change of shape**:

| today | after |
|---|---|
| `registry: Map<string, QuoteDef>` (`:78`) | unchanged |
| `republish()` (`:87`) | unchanged |
| `subscribe`/`getList` (`:99`,`:106`) | **move to `quotes.store.ts`, React-free** |
| `writeNow()` → `localStorage.setItem` (`:120`) | → `quoteStore().put(...)`, still write-behind |
| `persistSoon()` 400 ms debounce (`:139`) | unchanged |
| `flushQuotes()` on `pagehide` (`:167-198`) | unchanged — **the promise `steps.ts` prints on the build screen depends on it** |
| `loadQuotes()` sync, one-shot (`:202`) | becomes `hydrateQuotes(): Promise<void>`, awaited once by the shell |
| `adoptLegacyQuotes()` (`:234`) | **replaced by the v5 upgrade — see 3.5** |
| `useQuotes`/`useQuote`/`useCustomerQuotes` (`:276`,`:281`,`:550`) | move to `src/features/quote/useQuotes.ts` |
| `forgetQuotes()` (`:1232`) | also clears the memory store |

**The one behaviour change, stated out loud:** `loadQuotes()` is called lazily
from inside three readers (`:277`, `:282`, `:310`), which works because
localStorage is synchronous. Dexie is not. So hydration moves to **one `await`
in the shell**, beside the existing project load, and every hook reads a
registry that is already full. A surface that renders before hydration must
draw the empty state, not a spinner — the same contract
`AdminStage.tsx:186-187` already keeps for the archive count (*"`null` until it
answers and if it never answers: the door carries no fact rather than a zero it
has not earned"*).

### 3.5 The migration from the existing localStorage payload

It runs **inside the Dexie upgrade**, not in app code, so it happens once per
browser and cannot be skipped by a code path. Three steps in order:

1. **Read.** Walk `localStorage` for every key matching
   `^helmlogic\.quotes\.v1(:.*)?$` — the scoped keys `quotes.ts:74` writes,
   **plus** the unscoped legacy `helmlogic.quotes.v1` that `adoptLegacyQuotes`
   (`quotes.ts:234`) exists to rescue and which still sits on any browser that
   never signed in again after TENANCY §4.3. Parse each as `QuoteDef[]`,
   skipping any record that fails `isQuoteish` (`quotes.ts:257`) — *one bad row
   must not cost a person every other document*, which is the rule that file
   already keeps at `:213`.

   **The legacy key is adopted as `__unnamed`** — the same fallback `orgKeyOf`
   uses (`src/lib/orgKey.ts:19`) — rather than guessed at. The old code guessed
   *"whoever is signed in the first time this runs"*; an upgrade has no session
   to ask, and a wrong guess files one dealer's documents under another
   dealer's slug. `__unnamed` is visible, recoverable, and wrong in no
   direction.

2. **Write.** `tx.table('quotes').bulkPut(rows.map(q => toRow(q, orgKey)))`.
   `bulkPut`, not `bulkAdd`: an id already present is the same document, and
   `apply.ts:116-124` already settled that *"what is on this machine wins"*.

3. **Then, outside the transaction**, once `db.open()` resolves: for each key
   whose quotes are all present in the table, `localStorage.removeItem(key)`.
   **Not inside** — Dexie rolls the whole upgrade back on a throw, and a
   localStorage removal survives that rollback and loses the documents. Write a
   marker `helmlogic.quotes.moved.v1` so an interrupted removal does not
   re-import on the next open. **That marker is a new stored key and must be
   added to `KEPT_KEYS`** — see §4.2.

**Verification the upgrade must carry:** `src/features/quote/quoteScope.test.tsx`
exists today and tests `adoptLegacyQuotes` against the legacy localStorage
shapes. **Re-point it at the upgrade rather than deleting it** — it is the only
test in the tree that knows what the legacy payload looks like.

### 3.6 ⚠️ A CONTRADICTION THAT MUST BE DECIDED BEFORE `db.version(5)` IS WRITTEN

Two parts of the tree disagree about whether clearing the sheet destroys the
quotes, and the migration cannot be written without picking one.

- **`src/features/io/ImportExportMenu.tsx:119`** renders
  `quotesSurviveSentence(sheetNow())`, which prints *"Your 3 quotes stay. A
  quote is a photograph of what was offered on the day…"* —
  and `sheetNow.ts:57-80` argues the decision at length. The same sentence is
  printed by `src/features/tenancy/ConfigurationsPanel.tsx:290-291`.
- **`src/features/io/ImportExportMenu.tsx:366`** — the press behind that
  sentence — calls `resetProject()`, which calls `forgetBusiness()`
  (`useProjectStore.ts:777`), whose **first** `BUSINESS_KEY` is
  `'helmlogic.quotes.v1'` (`forgetBusiness.ts:75`) and which also calls
  `forgetQuotes` (`forgetBusiness.ts:164`).
- **`src/store/forgetBusiness.test.ts:39-46`** asserts that the quotes *are*
  taken — so the destruction is pinned green.

So the confirm promises they survive and the act destroys them. **Resolve this
in its own commit, before Step 6 below.** Whichever way it goes it changes
exactly one thing in this plan: whether `forgetBusiness()` calls
`quoteStore().clear(orgKey)`.

My reading is that `sheetNow.ts` is right and `forgetBusiness` is the defect —
an issued quote is the one record `discardDraft` (`quotes.ts:1200`) already
refuses to delete at all, and *"start again" on the sheet* is not *"destroy the
documents I gave customers"*. But it is the owner's call, not the migration's.

### 3.7 The call sites that change

**7 files import `./quotes` or `@/features/quote/quotes` directly** (2 of them
tests); **26 more reach it through the barrel `@/features/quote`.** The barrel
re-exports 30 symbols from `quotes.ts` at `index.ts:143-179`.

**Zero change (the barrel absorbs it) — 21 files.** Anything that only calls
`useQuotes()`, `useQuote(id)`, `useCustomerQuotes(rowId)` or a writer keeps its
import line and its call verbatim, because the barrel path does not move:

| file:line | call |
|---|---|
| `src/app/QuoteStage.tsx:107,111` | `useQuote`, `useQuotes` |
| `src/app/Shell.tsx:263` | `useQuotes().length` |
| `src/features/crm/CustomerList.tsx:136` | `useQuotes` |
| `src/features/crm/CustomerPage.tsx:158` | `useCustomerQuotes` |
| `src/features/dashboard/CardBody.tsx:358,646` | `useQuotes` ×2 |
| `src/features/history/CustomerHistory.tsx:72` | `useQuotes` |
| `src/features/history/QuoteHistory.tsx:88` | `useQuotes` |
| `src/features/io/ImportExportMenu.tsx:218` | `useQuotes().length` |
| `src/features/modules/ModulePanels.tsx:117,462` | `useQuotes` ×2 |
| `src/features/modules/ModuleSettings.tsx:645` | `useQuotes` |
| `src/features/pipeline/Board.tsx:109` | `useQuotes` |
| `src/features/pipeline/BoardSetup.tsx:81` | `useQuotes` |
| `src/features/search/SearchField.tsx:428` | `useQuotes` |
| `src/features/quote/QuoteList.tsx:48` | `useQuotes` |
| `src/features/quote/QuotePage.tsx:65` | `useQuote` |
| `src/features/quote/QuoteEditor.tsx:720` | `useCustomerQuotes` |
| `src/features/quote/QuoteBuild.tsx:239` | six writers |
| `src/features/quote/QuoteStart.tsx:304` | `unaddressedDraftFor` |
| `src/features/modules/ModuleWorkspace.tsx:192` | `unaddressedDraftFor` |
| `src/features/table/Catalogue.tsx:106` | `createQuoteFromView` |
| `src/features/history/again.ts:67` | `quoteLikeThisOne` |

**Change — 4 files.**

| file:line | today | after |
|---|---|---|
| `src/features/io/exportPayload.ts:143` | `allQuotes()` inside a synchronous builder | reads the hydrated registry — **no change IF hydration is awaited at boot; otherwise the export path becomes async.** This is the single strongest argument for boot-time hydration. |
| `src/features/io/sheetNow.ts:46` | `allQuotes().length` inside synchronous `sheetNow()` | same |
| `src/features/io/apply.ts:136-137` | `getQuote(q.id)` / `registerQuote(q)` | the guard stays synchronous against the registry; `registerQuote` becomes fire-and-forget against the write-behind |
| `src/app/Shell.tsx` (new line) | — | `await hydrateQuotes(orgKey)` beside the project load |

**Tests — 13 files touch the registry** and each needs
`setQuoteStore(memoryQuoteStore())` in a `beforeEach`:
`src/app/finderDoors.test.tsx`, `src/features/crm/link.test.ts`,
`src/features/dashboard/tiles.test.tsx`, `src/features/history/history.test.ts`,
`src/features/history/render.test.ts`, `src/features/io/quotes.envelope.test.ts`,
`src/features/quote/conflict.test.ts`, `diaryFind.test.tsx`, `issue.test.ts`,
`referenceDay.test.ts`, `survivesClose.test.ts`, `undoOnPick.test.ts`,
`src/features/search/palette.test.tsx`.

`src/features/quote/survivesClose.test.ts:164-176` is the one that needs real
thought: it proves the `pagehide` promise by re-importing the module fresh and
calling `loadQuotes()`. With a memory store, a fresh import loses the store
too — it must become `setQuoteStore(shared); … await fresh.hydrateQuotes()`.

### 3.8 The invariant, preserved

`src/features/quote/index.ts:20-31` declares:

> *"`useProjectStore` appears in exactly ONE file of this feature — freeze.ts —
> and every function in it is called from an EVENT… never from a render of a
> quote."*

Verified today: `grep -rn "useProjectStore" src/features/quote/` returns
`freeze.ts` only. **The migration must not break it, and there are two
temptations that would:**

1. **Do not read the org key from inside `quoteRepo.ts`.** `quotes.ts:32`
   imports `currentOrgKey` from `@/lib/orgKey`, and `orgKey.ts:20` imports
   `useProjectStore` — so the invariant is already held by a technicality, the
   one `orgKey.ts:60-63` states outright (*"IT IS NOT A HOOK AND MUST NOT
   BECOME ONE"*). Keep that property strictly: **`quoteRepo.ts` takes `orgKey`
   as an argument and imports nothing from `@/store`.** The cleanest place to
   resolve it is the shell, which already knows.
2. **Do not put `quotes` on `ProjectSnapshot`.** That makes `useProjectStore`
   the owner of a quote, and every quote screen would then *legitimately* read
   the store — which is the invariant gone, not bent.

Add the grep to the guard set so it stops being a comment — a one-line check in
`tools/check-stores.mjs` or its own `tools/check-quote-seam.mjs`:

```
fails if `useProjectStore` appears in any src/features/quote/* file
other than freeze.ts
```

---

## §4 — `tools/check-stores.mjs` AND `forgetBusiness.ts`

### 4.1 What the guard does today

`tools/check-stores.mjs:57-80` parses `BUSINESS_KEYS` and `KEPT_KEYS` out of
`src/store/forgetBusiness.ts` with a regex over the text between `= [` and the
first `]`, then sweeps every non-test `.ts`/`.tsx` under `src/` for a quoted
`hl.` or `helmlogic.` literal and fails on any key in neither list. It runs in
`npm test` and reports:

```
435 source files · 29 keys · 21 forgotten on a wipe, 8 kept
```

It has two self-checks that will bite during this migration:

- **`check-stores.mjs:104-108`** — `if (files.length < 300 || found.size < 20)`
  → `FAIL — the walk is broken`. **The key count drops below 20 as soon as
  roughly ten keys move to Dexie.** This is the single line that will turn
  `npm test` red for a reason that is not a defect.
- **`check-stores.mjs:82-88`** — if either array cannot be parsed it exits 1
  rather than sweeping nothing. So `BUSINESS_KEYS` may not be restructured into
  anything the regex cannot read: no `as const satisfies`, no spread of another
  array, no computed entries, and the array must stay a literal `= [ … ]`.

### 4.2 The final key ledger

**Leaving `localStorage` for Dexie (10 keys), so leaving `BUSINESS_KEYS`:**

| key | goes to | leaves `BUSINESS_KEYS` at |
|---|---|---|
| `helmlogic.quotes.v1` | `db.quotes` (v5) | `forgetBusiness.ts:75` |
| `hl.pipeline.v1` | `dealStages` | `:99` |
| `hl.pipeline.stages.v1` | `stageDefs` | `:100` |
| `hl.pipeline.since.v1` | `dealStages` (same row) | `:101` |
| `hl.pipeline.notes.v1` | `dealNotes` | `:102` |
| `hl.pipeline.owner.v1` | `dealOwners` | `:103` |
| `hl.pipeline.links.v1` | `dealLinks` | `:104` |
| `hl.activity.v1` | `activity` | `:94` |
| `helmlogic.discovered.v1` | `discoveries` | `:82` |
| `helmlogic.constraints.v1` | `db.constraints` (v6) | `:80` |

**Staying in `localStorage` (11 of the current `BUSINESS_KEYS`):**
`helmlogic.build.place.v1`, `helmlogic.constraints.seeded.v1`,
`helmlogic.moduleRules.v1`, `helmlogic.seed.v1`, `hl.merges.v1`,
`hl.colmap.v1`, `hl.pipeline.card.v1`, `helmlogic.finder.recent.v1`,
`helmlogic.rail.modules.v1`, `helmlogic.dashboard.v1`, `hl.dash.tiles.v1`.

**New key added by this migration (1):** `helmlogic.quotes.moved.v1` →
**`KEPT_KEYS`**, with the reason written beside it: *it records that this
browser's quotes have already been carried into Dexie, so a wipe that took it
would make a later open re-import an empty localStorage over the real table.*

**Net: 29 keys → 19 keys · 11 forgotten · 9 kept** (`KEPT_KEYS` goes 8 → 9).

### 4.3 The three changes `forgetBusiness.ts` needs

**1. A third list, and this is the substantive change.** Today the file answers
one question — *is this key forgotten or kept* — and the wipe is "remove by
prefix, then drop the caches" (`:146-190`). Once ten records live in IndexedDB,
**removing a key no longer removes the data**, and a `drop()` call that clears
an in-memory cache leaves the Dexie rows exactly where they are — which is the
precise failure this file was written to fix, arriving again from the other end
(*"Most of those modules expose a `forget…()` that drops an in-memory cache for
tests and leaves the stored copy where it is — which is exactly the half of the
job that does not fix this"*, `:28-33`). So:

```ts
/** Every DEXIE TABLE that belongs to the business and dies with it.
 *
 *  WHY A THIRD LIST AND NOT MORE PREFIXES. A localStorage key is
 *  removed by name; a Dexie table is emptied by a call. The sweep at
 *  the top of `forgetBusiness` cannot reach one, and the `drop()` list
 *  at the bottom only drops a CACHE — which is the half of the job
 *  that does not fix this, and is the exact mistake the header of this
 *  file already records once. */
export const BUSINESS_TABLES: readonly string[] = [
  'quotes',      // helmlogic-dynamic-config, v5  ⚠ see STATE_SEAM §3.6
  'dealStages', 'stageDefs', 'dealNotes', 'dealOwners', 'dealLinks',
  'files',       // helmlogic-pipeline
  'activity', 'discoveries', 'constraints',
]
```

with `forgetBusiness()` gaining, between the storage sweep and the `drop()`
list, one `await` that empties each — scoped to **every** org key and not only
the open one, because *"it takes EVERY organisation's rows and not only the
open one, which is what 'wipe' means to the person pressing it"* (`:23-26`)
applies here too.

**2. Delete the `drop()` entries for modules whose state is no longer a cache**
— `forgetQuotes`, `clearConstraints`, `clearDecisions`, `forgetPipeline`,
`forgetStageStore`, `forgetDealNotes`, `forgetDealOwners`, `forgetDealLinks`
(`forgetBusiness.ts:164-177`): eight of seventeen. Keep the in-memory registry
reset for each — a screen that is open must redraw empty — but it moves *after*
the table clear and stops being the whole mechanism.

**3. The header comment says "sixteen"** (`:18`, `:44`, and
`useProjectStore.ts:770`). It is 29 modules today, and will be 19 keys plus 10
tables. Update the prose in the same commit: a comment that miscounts the thing
it guards is how this file's own defect got in.

### 4.4 The three changes `tools/check-stores.mjs` needs

**1. Lower the `found.size` floor, in the same commit as each move.**
`check-stores.mjs:104` reads `if (files.length < 300 || found.size < 20)`.
Make it a named constant with the same ratchet discipline `LITERAL_PX_CEILING`
already has, but inverted — a FLOOR that may only go DOWN, and only when a key
demonstrably moved:

```js
/* A FLOOR, NOT A TARGET. It exists so a broken walk reports clean
   once and never again. It comes DOWN as keys move into Dexie —
   STATE_SEAM.md §4.2 is the ledger — and it may never go UP: a new
   localStorage key is a decision, not a baseline. */
const KEY_FLOOR = 20   // → 18 → 12 → 10 → 9 as §4.2 lands
```

**2. Sweep the third list too.** The guard's whole argument is *"the failure
mode is not 'these sixteen regress'; it is the SEVENTEENTH, written next month
by somebody who has not read `forgetBusiness.ts`"* (`check-stores.mjs:20-25`).
That argument transfers exactly to a Dexie store, so add a second sweep beside
the key sweep:

> *EVERY DEXIE STORE THIS APP DECLARES IS CLASSIFIED TOO. A table added to a
> `db.version(n).stores({…})` that nobody listed is the same silent failure as
> an unclassified key: it behaves correctly right up until somebody wipes their
> project and finds the old business's rows.*

Parse the store names out of every `.stores({ … })` call in the three
`new Dexie(` sites — `src/db/database.ts:15`,
`src/features/pipeline/dealFiles.ts:142`, `src/features/tenancy/archive.ts:125`
— and fail on any name that is in neither `BUSINESS_TABLES` nor a new
`KEPT_TABLES`. `KEPT_TABLES` starts with the eight project stores (`meta`,
`entities`, `groups`, `rules`, `rows`, `views`, `modules`, `roles`), because
`repository.wipe()` already owns those and `forgetBusiness` must not
double-clear them.

**3. Update the OK line.** `check-stores.mjs:98-101` prints
`N keys · B forgotten, K kept`; it becomes
`N keys · B forgotten, K kept · T tables · TB forgotten, TK kept`.

**And `src/store/forgetBusiness.test.ts` needs the mirror assertions:** the
`it('do not overlap — a key is forgotten or kept, never both')` case at
`:87-89` must be repeated for the table lists, and
`it('takes the documents, the rules and the decisions about them')` at `:39-46`
must be rewritten or deleted depending on §3.6.

---

## §5 — THE THREE FILES TO LIFT OUT OF `src/lib/`

Confirmed by measurement:
`grep -rl "from 'react'|from '@phosphor-icons/react'" src/lib/` returns
**exactly these three files and nothing else** (33 non-test files in `src/lib`).
Move them and `lib/` is provably framework-free — the claim `REBUILD.md:44`
already makes.

### 5.1 `src/lib/icons.tsx` (83 LOC) — **80 import sites**

The biggest blast radius in Phase 1 and the least interesting change.

- **It is not a lib file at all.** It declares no logic: a mapping from
  `TableKind` / `IndustryKey` to a Phosphor component (`:38`, `:49`), four
  named re-exports (`:59-64`), a size scale (`:67`) and `weightFor(size)`
  (`:81`). Its React dependency is `@phosphor-icons/react`.
- **Target: `src/ui/icons.tsx`**, re-exported from `src/ui/index.ts`. It
  belongs beside `Button`/`Card`/`Field`/`Row`/`SectionHead`, which are the
  five primitives `REBUILD.md:122` says to extend rather than replace.
- **80 import sites**, almost all of the form
  `import { ICON_SIZE } from '@/lib/icons'`. This is a one-command rewrite and
  should be **its own commit, touching nothing else**, so an 80-file diff never
  has to be read for meaning.
- **One hazard:** `weightFor` (`:81`) is the art-direction rule *"'light' at
  chrome sizes, 'thin' only at display sizes"*. It is pure, and it is the only
  part of this file that could arguably stay in `lib/`. Move it anyway — a rule
  split across two files to satisfy a directory name is worse than the name.

### 5.2 `src/lib/imageSources.ts` (670 LOC) — **16 import sites**, split 5 / 11

**This file is 91% framework-free and 9% a hook.** The React import is at
`:78` (`useEffect`, `useReducer`) and the only consumer is `useImageDisplay`
(`:615-670`, 56 lines).

**Split it in two:**

| new file | content | LOC |
|---|---|---|
| `src/lib/imageSources.ts` *(stays)* | `:1-614` — `isStorableSource`, `sourceKind`, `registerSeededPictures`, `seededCopy`, `imageHostOf`, `nameFromUrl`, `HELD_AS_LINK`, `heldAsLinkNote`, `measuredClosedHost`, `imageLabel`, `HostVerdict`, `hostIsClosed`, `noteImageLoaded`, `noteImageFailed`, `ImageDisplay` | ~614 |
| `src/ui/useImageDisplay.ts` *(new)* | `:615-670` only | ~60 |

**5 files change nothing** — they already import only the pure half:
`src/demos/northsideImages.ts:71`, `src/features/dashboard/doors.ts:91`,
`src/features/io/envelope.ts:115`, `src/features/modules/logo.ts:58`,
`src/features/table/coverPhoto.ts:40`.

**9 files change one import into two:**
`src/features/dashboard/CardBody.tsx:101`, `src/features/history/row.tsx:21`,
`src/features/modules/ModuleSettings.tsx:82`,
`src/features/modules/PlaceMark.tsx:32`,
`src/features/pipeline/dealParts.tsx:35`,
`src/features/quote/QuoteBuild.tsx:216`, `src/features/quote/QuoteList.tsx:17`,
`src/features/quote/photo.tsx:23`, `src/features/views/pictures.tsx:40`.

**2 files change a multi-symbol block:**
`src/features/modules/ModuleIndex.tsx:154-162` (7 symbols, one of them the
hook) and `src/features/table/ImageCell.tsx:88-97` (10 symbols, one of them the
hook).

**Note:** `vitest.config.ts:10-13` names this file by name as the reason the
logic project runs in `node` — *"src/lib/imageSources.ts reads
`window.location`, and its test stubs exactly that and nothing else"*. The split
does not change that; the `window.location` read stays in the pure half. Leave
the comment alone.

### 5.3 `src/lib/actions.ts` (271 LOC) — **15 import sites**

- **It cannot be made framework-free and should not be.** `ActionPanel.content`
  is a `ReactNode` (`:129`) and `ActionButton.icon` / `ActionPanel.icon` are a
  Phosphor `Icon` (`:81`, `:118`). It is a **UI contract**, not a library. Its
  own header says so at `:76-84` (*"WHY A REGISTER AND NOT A PROP. The bar is
  drawn inside `.dk-wrap`, beside the dock — it is furniture"*).
- **Target: `src/ui/actionRegistry.ts` + `src/ui/useActionBar.ts`**, beside
  `src/app/ActionBar.tsx`, which with `src/app/Shell.tsx` is the only renderer
  of `usePageActions` (`actions.ts:223`).
  - `actionRegistry.ts` ← `:64-221` (the types, `byOwner`, `rebuild`,
    `subscribe`, `read`, `publishActions`, `pageActions`). Framework-free apart
    from two type-only imports.
  - `useActionBar.ts` ← `:223-271` (`usePageActions`, `useHasPageActions`,
    `useActionBar`).
- **15 prod import sites**, all `.tsx`: `src/app/ActionBar.tsx`,
  `src/app/Shell.tsx`, `src/app/FlowStage.tsx`, `src/app/ViewStage.tsx`,
  `src/features/views/ViewPage.tsx`,
  `src/features/constraints/DiscoveryPanel.tsx`, `NewRuleSentence.tsx`,
  `RulesPane.tsx`, `src/features/modules/CatalogTravel.tsx`,
  `src/features/quote/QuoteBuild.tsx`, `src/features/table/Catalogue.tsx`,
  `src/features/table/TableSheet.tsx` — plus 2 tests
  (`src/lib/actions.test.ts`, `src/features/modules/travelCaps.test.tsx`).
- **`src/lib/actions.test.ts` is a `.test.ts` in the node project** and it
  imports a file that imports React. That works today only because it never
  calls the hooks. Split as above and the test follows the registry as
  `src/ui/actionRegistry.test.ts`, testing it honestly.
- **One grep that will look suspicious in the diff and is fine:**
  `src/features/curation/applied.test.ts:155` asserts on the **string**
  `'publishActions'` appearing in another file's source. It does not break.

---

## §6 — THE DERIVATIONS TRAPPED IN COMPONENTS

**Total: 54 `useMemo` across the three files — 22 / 18 / 14.**

> **Counting note for whoever executes this.** `grep -c "useMemo("` UNDERCOUNTS
> by one in two of the three files: `BlockCard.tsx:289` is `useMemo<RowRef>(`
> and `Grid.tsx:505` is `useMemo<DrawItem[]>(`. Use `grep -cE "useMemo[<(]"`.

| file | LOC | memos | DOMAIN | borderline | render-local | delete |
|---|---|---|---|---|---|---|
| `src/features/modules/ModuleIndex.tsx` | 1795 | 22 | 15 | 4 | 3 | 3 |
| `src/features/views/BlockCard.tsx` | 1532 | 18 | 9 | 5 | 4 | 4 |
| `src/features/table/Grid.tsx` | 2279 | 14 | 2 | 3 | 9 | 3 |

### 6.1 `ModuleIndex.tsx` — the heaviest target (15 domain memos)

All inside `ModuleStock` (from `:261`).

**DOMAIN — extract.** `:273` `module` (`moduleAt`) · `:308` `tables`
(`moduleTables`) · `:313` `listed` (`listedTables`) · `:318` `entries`
(`buildEntries`) · `:327` `heldSold` (`heldBackRowCount`) · `:328`
`retiredTables` · `:334` `retiredRows` · `:342` `census` (`moduleCensus`) ·
`:364` `linkedPictures` · `:404` `writes` (`readWrites`) · `:415` `travel`
(`readTravel`) · `:435` `refusals` · `:553` `drawers` (`categoryDrawers`) ·
`:558` `memberCounts` · `:603` `admittedIds` · `:644` `sections`
(`groupEntries`) · `:708` `drawerRuns`.

**BORDERLINE — pure computation, page-local input.** `:595` `admitted` (a pure
predicate over page-local `openKey`/`showAll`) · `:624` `reach` (`searchReach`
is already pure in `@/features/curation`; keystroke-driven) · `:642` `shown`
(`capEntries`; `INDEX_CAP` is documented at `:673-676` as *"a drawing budget,
not a rule about the data"*) · `:677` `curation` (assembles UI copy).

**RENDER-LOCAL — leave.** `:536` `acts` (the callback prop-bag).

**Targets:**
- `src/features/modules/read.ts` *(exists — append)*:
  `retiredRowCount(tables, rowsByEntity)` (folds `:328`+`:334` into one),
  `memberCounts(entries)` (`:558`), `drawerRuns(drawers)` (`:708`).
- `src/features/modules/indexScope.ts` *(new)*: one
  `indexScope({entries, drawerKey, showAll, term, cap})` →
  `{admitted, reach, scope, shown, hidden}`, replacing `:595`, `:603`, `:624`,
  `:636`, `:642`, `:643`.
- `src/features/modules/linkedPictures.ts` *(new)*:
  `countLinkedPictures(entries)` (`:364`).
- `src/features/modules/accessSay.ts` *(exists — append)*: `refusalLines(...)`
  (`:435`). **The memo's own comment at `:437-441` already names this file as
  the owner of the wording rule.**
- `src/features/modules/indexCuration.ts` *(new)*: `readIndexCuration(...)`
  (`:677`).

### 6.2 `BlockCard.tsx` — 9 domain memos, no selector module yet

**DOMAIN — extract.** `:218` `join` (`joinRefFor`) · `:267` `columns` ·
`:275` `priceField` · `:288` `warning` (`warnRules`) · `:293` `warnings`
(`pairWarnings` per row) · `:312` `picField` · `:322` `searchFieldIds` ·
`:356` `poolRows` · `:361` `reachPool` · `:370` `hay`.

**BORDERLINE.** `:231` `result` (`relatedRows` is pure in `./relations.ts`;
mixed only because `showAll` is spliced into the rule argument at `:255`, and
the `if (!target)` guard at `:232-242` returns a render-shaped empty literal) ·
`:289` `sourceRef` (a domain value memo'd purely for referential identity) ·
`:327` `shown` (`applyFilters`, keystroke-driven) · `:386` `reach` · `:398`
`reading`.

**RENDER-LOCAL — leave or delete.** `:224` `read` and `:315` `readRelated` are
`useMemo` returning a function — a `useCallback` spelled the long way, in a
two-link chain feeding `:327` and `:370`. `:314` `filters` and `:356`
`poolRows` memo a `?? []` for identity alone.

**Targets:**
- `src/features/views/blockRead.ts` *(new)*: `blockColumns`, `blockPriceField`,
  `blockPictureField`, `blockSearchFieldIds`, `blockPool`, `blockReachPool`,
  `blockJoin` — covering `:218`, `:267`, `:275`, `:312`, `:322`, `:356`,
  `:361`.
- `src/features/views/blockSearch.ts` *(new)*: `buildBlockHay` (`:370`),
  `blockReach` (`:386`).
- `src/features/views/warnings.ts` *(exists — append)*:
  `rowWarnings({engine, rules, targetId, rows, source})` (`:293`), which also
  absorbs `:289` and deletes it.
- `src/features/views/blockCuration.ts` *(new)*: `readBlockCuration(...)`
  (`:398`).

### 6.3 `Grid.tsx` — **already done; do not spend effort here**

Only **2** of 14 memos are domain, and every layout memo already delegates to a
pure helper in `src/features/table/sections.ts` (`foldWidthFor`,
`layoutColumns`, `pinWidthOf`, `windowColumns`, `bandsOf`) or
`src/features/table/helpers.ts` (`fullySelectedCols`). What is left in the
component is pixel, scroll and selection plumbing, which is correct.

**The only work here:**
- `:489` `pinFieldId` → `pinnedFieldId(entity, fields)` in `sections.ts`.
  **Note `src/features/table/pinnedColumn.test.ts` exists with no
  `pinnedColumn.ts` beside it** — that suite is looking for this function.
- `:565` `filterByField` → `filtersByField(filters)` in
  `src/features/table/core/view.ts`.
- `:1024` `imagesAt` (a `useCallback` wrapping a pure read over `rowById`) →
  `src/features/table/helpers.ts`.
- Delete `:522` `banded`, `:497` `pinW`, `:454` `filed` — see 6.4.

`REBUILD.md:99` implies Grid is a third of this job. **It is a twentieth.**
Correct that line when this lands.

### 6.4 The ten deletions, listed

`Grid.tsx:522` `banded` (memoizes a **boolean** off an already-memo'd value) ·
`Grid.tsx:497` `pinW` (a single number from two memo'd inputs) ·
`Grid.tsx:454` `filed` (a `new Set` over 1–3 ids, and nothing depends on its
identity) · `BlockCard.tsx:314` `filters` → a module-level
`NO_FILTERS` const, the pattern `Grid.tsx:1027` already uses with `NO_IMAGES` ·
`BlockCard.tsx:356` `poolRows` → `NO_ROWS` · `BlockCard.tsx:289` `sourceRef`
(absorbed by `rowWarnings`) · `ModuleIndex.tsx:328`+`:334` (two memos to
produce one number; `retiredTables` has exactly one consumer) ·
`ModuleIndex.tsx:603` `admittedIds` (its only consumer is `:624`; absorbed by
`indexScope`) · `BlockCard.tsx:224`+`:315` `read`/`readRelated` (pass `engine`
into the extracted selectors instead).

### 6.5 Three `useCallback`s hiding a pure decision

- `ModuleIndex.tsx:479` `startOne` — `:481` is the pure guard
  `writes.into !== undefined && writes.add.on === true && writes.add.blocked === undefined`
  → `mayAdd(writes)`.
- `ModuleIndex.tsx:494` `takeOut` — `:497` → `mayDelete(writes)`.
- `ModuleIndex.tsx:511` `rename` — `:514-527` mixes a pure `renameFieldOf`
  lookup plus empty-name / no-change checks with `updateCell` and a toast →
  `renameOutcome(writes, tableId, from, to)`. **Highest value of the three**:
  it is the only place a free string is written into a typed column, and the
  file's own comment at `:506-510` flags it.

Target for all three: `src/features/modules/writeCaps.ts`.

Correctly render-local, no domain to extract: `ModuleIndex.tsx:1407`
`focusOnce` (ref callback), `Grid.tsx:890` `selectAll`, `Grid.tsx:899`
`selectColumn`, `Grid.tsx:1032` `chooseImages`, `Grid.tsx:1040` `appendImages`.
`BlockCard.tsx` has **zero** `useCallback`.

---

## §7 — THE VERDICT→CLASS FUSION

**6 true fusions** (a domain verdict *computed* and *classed* in the same
`.tsx`) and **22 pure presentational maps** (a domain value already computed in
a `.ts`, looked up for a class — correct as they stand). Swept across 204
`.tsx` files.

### 7.1 The template

`src/features/fitment/FanOut.tsx:155-178`. `type PickVerdict` is **declared**
at `:155`, **computed** by `verdictOf` at `:157-160`, and **classed** by
`listRowClass` at `:174-178` → `fo-list-item s-refused` /
`fo-list-item s-unchecked` / `fo-list-item`. Both halves in 23 lines.
*(`REBUILD.md:101` gives the range as `157-181`; the declaration is at `:155`
and the class map ends at `:178`.)*

### 7.2 The other five fusions, worst first

**1. `src/features/constraints/Provenance.tsx:112-165` + `:255-258` — the worst.**
`Read.verdict` is declared **in the `.tsx`** at `:112`; `readSource()`
(`:119-165`) is a full source-string parser that lifts the verdict out of the
citation (`verdict ??= stamp[1] ?? null`, `:139`); `:256` maps it to
`'cn-src-verdict is-asserted'` vs `'cn-src-verdict'`. The domain values are the
adjudicator's `ASSERTED` / `OBSERVED` stamps. **And `readSource` is exported
from a `.tsx` and consumed as domain logic elsewhere** —
`RulesLedger.tsx:74` imports it, and
`src/features/constraints/provenance.test.ts:17` imports it into a
**node-project** test. A `.test.ts` reaching into a `.tsx` for its parser is
the fusion made visible.
→ Move `readSource` / `Read` / `Part` to
`src/features/constraints/provenance.ts` (the test already treats it as one);
keep the `is-asserted` ternary in the `.tsx`.

**2. `src/features/constraints/TrailerFitmentPanel.tsx:236-247` — FanOut with
the type deleted.** No named union exists. `:243`:
`const state = !r.loadColumn ? 's-unchecked' : r.floorWarned > 0 ? 's-warned' : 'k-rail'`,
applied at `:247` as `` `cn-tf-item ${state}` ``. The domain judgement — *"a
band with no weight column is a check that has not run"* — exists nowhere but
this ternary, and **the domain value and the class name are literally the same
string.** Inputs are `MarqueReading`
(`src/features/constraints/trailerFitment.ts:782`, fields `loadColumn:799`,
`floorWarned:803`).
→ Add `export type BandStanding = 'unchecked' | 'warned' | 'ok'` and
`bandStanding(r: MarqueReading)` to `trailerFitment.ts` — **an append and
nothing else**, since `REBUILD.md:48-51` calls that file the crown jewel and
forbids touching it otherwise.

**3. `src/features/data/Cell.tsx:247-260` and `:298-305` — three-way fused.**
Two referential-integrity verdicts computed inline: `:249`
`const stale = v !== '' && !options.includes(v)` and `:300`
`const missing = v !== '' && !rows.some((r) => r.id === v)`. Each drives a class
(`dg-selectwrap-warn` / `dg-select-warn` at `:251`, `:253`, `:302`, `:304`), a
title sentence, **and** a `(stale)` option label — three consumers of one
unnamed judgement.
→ `cellIntegrity(field, value, rows)` → `'ok' | 'stale-option' | 'dangling-ref'`
in a new `src/features/data/cellReading.ts`.

**4. `src/features/fitment/Rig.tsx:102-120` — a partial fusion, and a subtle one.**
`OptionState` (`src/features/fitment/rigReading.ts:123`) and
`RigCandidate['verdict']` (`rigReading.ts:187`) are both properly declared in
`.ts`. `VerdictMark` (`:105-120`) does not compute either — but it accepts
`OptionState | RigCandidate['verdict']` and branches the merged union three
ways to `rg-mark-refused` / `rg-mark-flagged` / `rg-mark-chosen`. **The claim
"these two vocabularies are the same thing" is domain knowledge with no home in
a `.ts`.**
→ Declare the merged vocabulary and the narrowing in `rigReading.ts`; keep the
glyph-and-class switch in the `.tsx`.

**5. `src/features/constraints/ConsequenceMeter.tsx:128-136` — the smallest.**
`:132-134` `broken > 0 ? 'cn-conseq-cell is-breaks ds-rise' : 'cn-conseq-cell ds-rise'`,
with a domain argument (`:128-131`, *"Nought rows breaking a rule is good
news"*) sitting inside a className expression. Arguably a threshold rather than
a verdict.
→ Low priority. Fine to leave.

**6. `src/features/constraints/RegistrationTheme.tsx:190-197` — borderline.**
`heldBack` is precomputed (`src/features/constraints/registration.ts:366`, set
at `:463` from `isRetired(key.table) || isDiscontinued(row)`), so `:196`
(`` `cn-rg-row ${d.heldBack ? 's-held' : 's-warned'}` ``) is strictly a map —
but the *binary reading* ("withheld outranks contradicted") is asserted only
here.
→ Leave the ternary. If a third state appears, it belongs in `registration.ts`.

### 7.3 The 22 pure maps — correct, listed so they are not "fixed"

`Rig.tsx:143-147` (`RigCandidate['verdict']`, `rigReading.ts:187`) ·
`LeftOutList.tsx:108-111` (`LeftOutVerdict`, `leftOut.ts:40`) ·
`DiscoveryPanel.tsx:593` + `:120` (`Standing`, `discoverSay.ts:135`) ·
`RulesLedger.tsx:268` (`RuleState`, `ruleLedger.ts:85`) ·
`EntityMarks.tsx:66` and `CardBody.tsx:1100` (`FindingSeverity`,
`src/lib/lint/types.ts:9`) · `CardBody.tsx:411` (quote `state`) ·
`CardBody.tsx:726` (`isRetired`) · `RuleInspector.tsx:1217` and
`RuleToolbar.tsx:106` (`severity`, `src/lib/rules/types.ts:146`) ·
`RuleNodes.tsx:70,86-92,118-124` · `Toasts.tsx:153` · `ImageCell.tsx:370` ·
`ActivityCard.tsx:37` · `BandStrip.tsx:87-93` ·
`CascadeSheet.tsx:83-85,103-109` · `FieldRow.tsx:402` ·
`FieldTypeEditors.tsx:624` · `ConfirmSheet.tsx:174,281` ·
`PasteRows.tsx:297,563` · `src/ui/Button.tsx:36-41` and `src/ui/Card.tsx:46`
(presentational unions — correct by construction) · `Tokens.tsx:34`.

**Deliberately excluded** as pure UI state with no domain content:
`Whiteboard.tsx:1266-1272`, `EntityTableNode.tsx:409-416`, `RowDetail.tsx`,
`Grid.tsx`, `LevelEditor.tsx`, `SetPanel.tsx`, `AccessGrid.tsx:283`,
`ModuleDesigner.tsx`. Also excluded: `src/design/*`
(`SheetSurfaces.tsx:172`, `UxSurfaces.tsx:307,330`,
`DesignPreview.tsx:138,1161`) — the gallery's hand-drawn miniatures, no real
domain behind them.

### 7.4 The repo already has the better answer, twice

`src/features/review/ReviewPanel.tsx:387,592,598` and
`src/features/review/FieldMark.tsx:131,148` carry severity as a
**`data-severity` / `data-kind` attribute** and let CSS select on it, so the
domain word never becomes a class name at all.
`src/features/pipeline/dealParts.tsx:159` and `BoardSetup.tsx:219` do the same
with `data-tone`.

**This is the recommended landing for all six fusions**, and it has a second
virtue this repo cares about: `check-styles.mjs` *"trusts a string literal
inside a className and nothing else"* (`FanOut.tsx:172-173`), which is why
`listRowClass` writes its three classes out longhand. A `data-` attribute
sidesteps that constraint entirely rather than working around it.

---

## §8 — THE ORDER

Every step below ends with `npm test` green (all seven guards) and the app
running. Steps are independent unless a dependency is named. **Two steps cannot
be done incrementally and are flagged.**

### Step 0 — the guard's own floor *(prep, no behaviour change)*
Turn `check-stores.mjs:104`'s `found.size < 20` into a named `KEY_FLOOR`
constant with the ratchet comment from §4.4. Add `BUSINESS_TABLES` (empty) and
`KEPT_TABLES` (the eight project stores) to `forgetBusiness.ts`, and the
Dexie-store sweep to `check-stores.mjs`. **Nothing moves yet** — this is the
guard learning to measure the thing that is about to change.
*Green because: no source moves. `KEY_FLOOR` is still 20 and `found.size` is
still 29.*

### Step 1 — `src/lib/icons.tsx` → `src/ui/icons.tsx` *(80 files, mechanical)*
Its own commit, touching nothing else.
*Green because: a pure path rewrite. `check:types` proves it.*

### Step 2 — split `src/lib/imageSources.ts`
`useImageDisplay` (`:615-670`) → `src/ui/useImageDisplay.ts`. 11 import sites
change; 5 do not. Leave `vitest.config.ts:10-13`'s comment alone.
*Green because: no logic moves; `src/lib/imageSources.test.ts` keeps testing
the pure half unchanged.*

### Step 3 — `src/lib/actions.ts` → `src/ui/actionRegistry.ts` + `src/ui/useActionBar.ts`
15 import sites. `src/lib/actions.test.ts` follows the registry as
`src/ui/actionRegistry.test.ts`. **`src/lib/` is now provably framework-free —
land the assertion in the same commit** (a one-line check in
`tools/check-reachability.mjs`, or its own guard), or the property rots.
*Green because: mechanical. Watch `src/features/curation/applied.test.ts:155`,
which asserts on the literal string `'publishActions'` in another file's
source; it does not break but it will look like it should.*

### Step 4 — `src/lib/store/` + the six table stores
Build `externalStore.ts` and `useStore.ts`. Convert only the six
`Record<entityId, T>` clones: `tableFitState`, `tableGroupState`,
`tableSectionState`, `tableReadState`, `catalogueLens`, `rowRevealState`
(561 LOC → ~140). These are session-only, memory-only, and hold **zero** stored
keys — so `check-stores` cannot move.
*Green because: nothing persists, nothing exports, and
`src/features/table/rowRevealState.test.ts` pins the one with a test.*

### Step 5 — **DECIDE §3.6** *(a decision, then a small commit)*
Whether a sheet clear destroys the quotes. `ImportExportMenu.tsx:119` and
`forgetBusiness.ts:75` currently disagree, and
`src/store/forgetBusiness.test.ts:39-46` pins the disagreement green.
**Nothing in §3 can be written until this is settled** — it decides one line
(`quoteStore().clear(orgKey)`) and one test. Ship the fix against today's
localStorage store, before the Dexie move: it is a 2-line change now and a
3-file change after.

### Step 6 — `quoteRepo.ts` behind the existing localStorage store
Write `src/features/quote/quoteRepo.ts` with the `QuoteStore` interface,
`memoryQuoteStore()` and a **`localStorageQuoteStore()`** that reads and writes
exactly the bytes `quotes.ts:120-131` writes today. Point
`writeNow`/`loadQuotes` at it. **No Dexie, no schema change, no async.** Add
`setQuoteStore(memoryQuoteStore())` to the 13 test files listed in §3.7.
*Green because: the bytes on disk are identical and every existing test passes
against the memory store. This step exists precisely so Step 7 is a swap rather
than a rewrite.*

### Step 7 — ⚠️ `db.version(5)`, the upgrade, and boot-time hydration — **NOT INCREMENTAL**
This is the one step that cannot be split, and the reason is the sync→async
line. `loadQuotes()` is called lazily from three readers
(`quotes.ts:277,282,310`) and `allQuotes()` is called from two **synchronous**
functions (`exportPayload.ts:143`, `sheetNow.ts:46`). The moment the sink is
Dexie, all five must be satisfied by a registry that is **already hydrated** —
which means the `await hydrateQuotes()` in the shell and the swap to
`dexieQuoteStore()` land in one commit. A half-migrated state is an app where
`sheetNow()` reports zero quotes on a browser holding forty, and prints that
number inside a destructive confirm.

Contents of the single commit: `database.ts` v5 + `QuoteRow`; the `.upgrade()`
migration (§3.5); `dexieQuoteStore()`; `hydrateQuotes()` awaited in the shell;
`adoptLegacyQuotes` (`quotes.ts:234`) deleted and `quoteScope.test.tsx`
re-pointed at the upgrade; `helmlogic.quotes.v1` removed from `BUSINESS_KEYS`
and `helmlogic.quotes.moved.v1` added to `KEPT_KEYS`; `'quotes'` added to
`BUSINESS_TABLES`; `KEY_FLOOR` 20 → 18; the `src/features/quote` /
`useProjectStore` grep guard from §3.8.
*Green because: every test already runs against `memoryQuoteStore()` from Step
6, so the suite never touches IndexedDB. The real Dexie path is exercised by
the app and by `check:shots`, not by `vitest`.*

### Step 8 — the five pipeline stores into `helmlogic-pipeline`
Rename the `helmlogic-deal-files` database and add `dealStages`, `stageDefs`,
`dealNotes`, `dealOwners`, `dealLinks`. Same interface-plus-memory pattern as
Step 6, **one store per commit**. 7 keys leave `BUSINESS_KEYS`; `KEY_FLOOR`
18 → 12.
*Green because: each store already has a `forget…()` the tests call, and each
is read through a `useX(orgSlug)` hook that can hydrate at mount — these five
have no synchronous off-render readers, which is exactly what makes them
incremental where quotes were not.*

### Step 9 — `activity` and `discoveries` into Dexie
Same shape. 2 keys leave; `KEY_FLOOR` 12 → 10.
*Green because: `activity.ts` is a listener on the notes bus
(`:132 startRecording`), so a late hydration costs nothing — an entry written
before the table opens lands when it does.*

### Step 10 — `viewDefs.ts` into `useProjectStore`, delete `viewPersistence.ts`
7 prod importers. The store slice and the Dexie table already exist
(`database.ts:36`, `repository.ts:22`). Delete the JSON shape-diff at
`viewPersistence.ts:44` — it has no successor, because there is no second copy
left to diff against.
*Green because: the store is the surviving copy and it is the one already
persisted. The risk is ordering, not data: `createViewFor` is called during
render (`viewDefs.ts:81-83` says so explicitly) and must stay idempotent
against the store.*

### Step 11 — `constraintDefs.ts` into the store + `db.version(6)`
11 prod importers, 8 of them `.tsx`. `adoptSlugKey` (`:260`) becomes an upgrade
hook. 1 key leaves; `KEY_FLOOR` 10 → 9.
*Do this last of the state moves: it is the most-imported store after
`lib/actions.ts`, and `workbookRules.ts` (1,751 LOC) writes into it.*

### Step 12 — delete `src/features/auth/role.ts`'s store half
`session.ts` is a `makePersistedStore` by now, so `useSessionRoleId` (`:125`)
becomes three lines. 1 importer. `sessionRoleId`, `roleInForce` and `roleOf`
are already pure and stay.

### Step 13 — the selector extractions (§6), one module per commit
Order by leverage: `ModuleIndex` (15 memos; `read.ts` is already the right home
for a third of them) → `BlockCard` (9) → `Grid` (2, plus the three deletions).
**Each extracted module gets a `.test.ts` in the node project in the same
commit** — that is the whole reason for extracting, and a selector with no test
is a `useMemo` in a different file.

### Step 14 — the verdict/class fusions (§7), one per commit
Order: `Provenance.tsx` (it has a `.test.ts` reaching into a `.tsx`, so fixing
the fusion fixes the test's import too) → `TrailerFitmentPanel.tsx` →
`Cell.tsx` → `FanOut.tsx` → `Rig.tsx`. Land each as a `data-` attribute per
§7.4. Each will move `check-styles`'s dead-rule count, which it prints and does
not fail on.

### Step 15 — the remaining preference stores onto the helper
`arrangement.ts` (526), `cardFields.ts` (264), `tileOrder.ts` (109),
`moduleRecent.ts` (161), `tableCanvasState.ts` (333), `canvasState.ts` (289),
`runStore.ts` (68), plus the four inline `.tsx` keys into
`src/features/settings/viewerPreferences.ts`. No key moves; only the
implementation.

### What is deliberately NOT in this plan

- **`EntityDef.priceLevels`** (`REBUILD.md:104-105`). It is listed under Phase
  1 but it is a *contract* change, not a state-seam change:
  `src/features/quote/index.ts:47-57` specifies it fully and `priceLevelsFor`
  already reads the field when it is present. It is independent of everything
  above and can land at any point.
- **`src/features/io/evidence.ts` and `mapMemory.ts`** — capped, rebuildable,
  and the two cheapest entries on the list. Move them only if the localStorage
  budget argument (`dealFiles.ts:4-12`) still bites after Steps 7–9.

### The two steps that cannot be done incrementally

1. **Step 7** — the sync→async line for quotes, argued above. Five readers must
   change in one commit or the app lies about how many documents it holds.
2. **Step 3's guard** — "`src/lib/` is framework-free" is either true or it is
   not; a guard that allows two of the three files is a guard that allows a
   fourth. Land the assertion with the last move, not before.
