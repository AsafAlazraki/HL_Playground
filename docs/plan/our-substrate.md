# OUR SUBSTRATE — what the app already provides for a module system to stand on

**Lens.** Our codebase only. `C:/Users/AsafA/HelmLogic` was not read for this
pass — the HelmLogic lens is somebody else's. Every claim below is `file:line`
in this repo, read at the commit `4b1ece3`.

**Method.** `src/types/model.ts` in full; `src/store/useProjectStore.ts` in full;
`src/db/` in full; every `src/app/*Stage.tsx` and `Shell.tsx`/`LeftPanel.tsx` in
full; `src/features/views/` and `src/features/quote/` read for shape and
ownership; `src/features/io/` read for what travels. Nothing was run, nothing
was written under `src/`.

**Nothing here is a proposal to build.** Where I say "would need", that is the
cost of a decision the owner has not made yet.

---

## 0 · THE ANSWER IN ONE PAGE

The app has **six persisted concepts** and **one navigation idea**.

The six concepts are `ProjectMeta`, `EntityDef` (tables), `GroupDef` (zones),
`RowData`, `RuleDef` (flow rules), `ViewDef` (view pages) — `src/db/repository.ts:13-20`.
Two more concepts exist and are **not** in that list: `ConstraintDef` (business
rules, in a module registry + localStorage, `src/features/constraints/constraintDefs.ts:46,92`)
and `QuoteDef` (in a module registry + localStorage, `src/features/quote/quotes.ts:40-42`).

The one navigation idea is: a left panel of doors, each door opening exactly one
**stage** mounted *over* a canvas that is never unmounted — `src/app/Shell.tsx:98-103`
(the whole `Stage` union), `Shell.tsx:222` (the `inert` trick that keeps the sheet
alive underneath). There is no router and no URL: `Shell.tsx:4-6` says so in as
many words.

**The single most useful finding.** `ViewDef` is already three-quarters of a
module layout — a named page, about one row of one table, made of an ordered
tree of blocks, each block naming a related table, a rule for what is related, a
filter for what is shown, and a chosen column list (`src/types/model.ts:753-783`).
`ViewPage` already has a design-time/run-time toggle on the page itself
(`src/features/views/ViewPage.tsx:252-266` — the SET UP gear grows handles on the
same drawing, it does not open a different screen). That is exactly the
"design the module layout, then have users go through it" pattern the owner asked
for, already built, already shipping.

**What stops it being the substrate today** is not its shape. It is five
specific limits, each cheap to name and none of them cosmetic:

1. **One view per table, forever.** `createViewFor` is idempotent by
   `rootTableId` (`src/features/views/viewDefs.ts:108-109`) and so is the store's
   `createView` (`src/store/useProjectStore.ts:708-709`). A module that wants a
   *catalogue* layout and a *quote configurator* layout over the same Boats
   table cannot have both.
2. **A view is per-ROW only.** It takes a `rowId` (`ViewPage.tsx:47-50`) and its
   whole vocabulary is "for this thing, what else goes with it". There is no
   list/catalogue/index layout in the model at all.
3. **Blocks carry no presentation.** `ViewBlock` (`model.ts:753-767`) says which
   table, what rule, what filter, which columns, and children. It does not say
   *how* — table, tiles, gallery, single-pick, multi-pick — nor what a user may
   *do* there.
4. **The view page's mode is React state, not data.** `configuring` is a
   `useState` in `ViewPage.tsx:72`. Nobody can be *given* the run-time page
   without the SET UP gear, because there is no such thing as a person.
5. **Views do not travel and are not owned by the store.** They live in a module
   registry (`viewDefs.ts:24`) mirrored into the store by a shell file
   (`src/app/viewPersistence.ts:47-74`), and they are absent from
   `ProjectExport` (`model.ts:933-943`) — a designed page cannot be exported,
   imported, or moved between organisations.

And one fact that governs everything below: **there is no user, no role and no
permission concept anywhere in `src/`.** A grep for
`permission|userRole|isAdmin|currentUser|auth` returns one hit, in a comment
about a SharePoint URL (`src/lib/imageSources.ts:17`). "Admins design, users go
through it" has no seat in the model today. That is the largest genuinely new
thing a module system needs, and it is not a layout problem.

---

## 1 · INVENTORY — every concept, and who owns it

| Concept | Type | Lives in store? | Lives in Dexie? | In export? | Notes |
|---|---|---|---|---|---|
| Project meta / org | `ProjectMeta`, `OrgProfile` | yes `useProjectStore.ts:39` | yes `database.ts:23` | name+rev only `model.ts:938` | org is **not** exported |
| Tables | `EntityDef` | yes `:40` | yes `:24` | yes | |
| Zones | `GroupDef` | yes `:41` | yes `:25` | yes | canvas frames only |
| Rows | `RowData` | yes `:44` | yes `:27` | optional `model.ts:942` | |
| Flow rules | `RuleDef` | yes `:42` | yes `:26` | yes | the node graph |
| View pages | `ViewDef` | yes `:140` | yes `database.ts:38` | **no** | store copy is a *mirror*, see §7 |
| Business rules | `ConstraintDef` | **no** | **no** | **no** | module registry + localStorage, keyed by org NAME (`constraintDefs.ts:39-40`) |
| Quotes | `QuoteDef` | **no** | **no** | **no** | module registry + localStorage (`quotes.ts:40`) |
| Canvas/UI state | — | **no** | **no** | — | `useSyncExternalStore` micro-stores, `whiteboard/canvasState.ts:1-14` |
| Users / roles | — | — | — | — | **does not exist** |

Two of the five finished features therefore persist through a mechanism the
repository interface knows nothing about. A module system that assigns
capabilities to a module ("this module can quote") is assigning them across that
seam.

---

## 2 · `src/types/model.ts`, TYPE BY TYPE — which are module-shaped?

**Module-shaped already** (a module system could point at these unchanged):

| Type | Where | Why it is ready |
|---|---|---|
| `EntityDef` | `:466-493` | id, name, description, accent, kind, role, hierarchy, sections, fields, displayFieldId. A module's "master table" is an `EntityDef.id` and nothing more. |
| `TableKind` | `:201-208` | Seven values. This is the closest thing the app has to a module *type* today, and `TABLE_KINDS` (`:254-436`) is already a registry of metadata: label, blurb, accent, structures, sections, detail columns. It is the pattern a `MODULE_KINDS` would copy. |
| `TableRole` | `:464` | `base` / `join` / `view`. Already answers "is this table a subject, a relationship, or an assembled thing" — the question a module needs to ask before offering itself. |
| `ColumnSection` | `:85-91` | Named, ordered, collapsible, ink-carrying bands. A detail layout renders section-by-section for free — `PLATFORM_VISION.md:58` already banked this. |
| `FieldDef` + `FIELD_TYPES` | `:93-109`, `:69-78` | Every column declares type, options, ref target, formula, default, section. A layout can be *generated* from this rather than authored. |
| `ClauseGroup` / `Clause` / `CompareOp` | `:530-559` | One condition vocabulary, already shared by three consumers: view blocks (`ViewBlock.rule`), constraints (`ConstraintDef.if/then`), and flow rules (`RuleNodeConfigMap.match.group`). Any module gating ("show this step only when…") reuses it with no new type. |
| `ColumnFilter` | `:771-773` | The cosmetic narrowing vocabulary. Already mirrors the table's own filter menu, so one control serves both. |
| `ViewBlock` / `ViewDef` | `:753-783` | See §7 — the closest thing to a layout the app owns. |
| `UID_FIELD` | `:959-967` | Every row has a stable, visible, exported primary key. Deep links and flow state need this; `PLATFORM_VISION.md:62` says so. Nothing consumes it for that yet. |
| `ImageRef` + `type: 'image'` | `:51-61`, `:42` | Ordered, index 0 is primary, no `isPrimary` flag to drift. A catalogue tile needs exactly this. |

**Partly module-shaped:**

| Type | Where | The gap |
|---|---|---|
| `OrgProfile` | `:438-442` | Three fields: `name`, `industry`, `createdAt`. No id. `constraintDefs.ts:39-40` is already forced to key its registry on the lower-cased **name**, and says so: *"Name-based because that is the only identity `OrgProfile` carries today"*. Rename the business and its constraints are orphaned. Every module a module system creates would hang off the same non-identity. |
| `ProjectMeta` | `:920-928` | `id: 'default'` — a literal type. **The store holds exactly one project.** Multi-org, multi-tenant, or even two saved configurations are not a schema change; they are a change to a type literal that `defaultMeta()` (`repository.ts:28-33`) and `db.meta.get('default')` (`repository.ts:37`) both depend on. |
| `ConstraintDef` | `:683-717` | Genuinely well-shaped (kind, if, then, because, enabled, edited, source, priority) and homeless. Its `because` discipline — the reason written at the moment of the decision — is the pattern a module system should copy for "why can't I do this here?". |
| `RuleDef` | `:903-914` | A named graph with a root entity. A "flow design" layer (PLATFORM_VISION layer 3) would want exactly this shape, but `RuleNodeKind` (`:609-618`) has no node kind that means *ask a person something*. Every node is machine-side: start, match, condition, filter, find, loop, action, output. A quote flow's steps are not in this vocabulary. |
| `ProjectExport` | `:933-943` | Carries entities, groups, rules, rows. **Not** views, constraints or quotes. `EXPORT_VERSION` is `1` (`:931`) and there is no version-2 read path. |

**Not module-shaped at all:**

- `GroupDef` (`:495-501`) — a rectangle on a canvas. Position and size, nothing
  else. It is *not* a container of meaning and must not be mistaken for one.
- `Selection` (`useProjectStore.ts:30-33`) — `'entity' | 'group' | 'rule'`. A
  module would be a fourth kind, and every consumer of `selection.kind`
  currently assumes three.
- `INDUSTRIES` (`:159-180`) — a frozen record of four, three marked
  `available: false`. See §9.

### What a `ModuleDef` would need that is not there

Nothing in the model expresses any of the following. Each is a genuinely new
field or type, not a rename of an existing one:

1. **Identity and ownership** — `id`, `orgId`. There is no org id (§2).
2. **A master table** — trivially `entityId: string`, but with a cascade
   question the store cannot answer today: `deleteEntity`
   (`useProjectStore.ts:433-455`) cascades into reference fields, rows and rules.
   It does **not** cascade into `views` — a table deleted today leaves its
   `ViewDef` behind in both registries. A module would inherit that bug.
3. **What can be done in it** — a capability list. There is no vocabulary for a
   capability anywhere: no verb type, no action registry, no permission. The
   nearest thing is `ActionOp` (`:578-593`), which is what a *rule* does to
   data, not what a *person* may do in a screen.
4. **Layouts, plural, and typed** — see §7. `ViewDef` is one layout, per table,
   of one shape (per-row detail).
5. **Order and grouping in navigation** — a module needs a position in a
   dashboard. `EntityDef` has `position: XY` (`:488`) but that is canvas
   geometry, and `LeftPanel` ignores it entirely: the panel groups by
   `TableKind` in a hardcoded order (`LeftPanel.tsx:67-75,178-207`).
6. **State that is not the designer's** — a module used by a salesperson has
   session state (which step, which row, what is picked). Today the equivalent
   state is React `useState` inside a stage (`ViewStage.tsx:64-65`,
   `ViewPage.tsx:72-78`) and is lost on close.
7. **Publication** — a "designed but not live yet" state. `ConstraintDef.enabled`
   (`:708`) is the only precedent in the model for a switched-off-but-preserved
   object, and its comment argues the case well.

---

## 3 · `src/store/useProjectStore.ts` — the shape, and the cost of a new concept

**Shape.** One zustand store, one flat object, five record maps plus meta and two
UI fields (`:37-46`). Every record map is `Record<id, T>`; rows are
`Record<entityId, RowData[]>` and insertion-ordered (`:43-44`). Persistence is a
single debounced write-behind of the *whole* snapshot at 400 ms
(`:183-190`), through `repository.saveAll` which **clears every table and
re-puts everything** (`repository.ts:49-72`). That is fine at 21 tables / 651
rows and is a known future cost, not a module-system cost.

**Every mutation goes through one `mutate` wrapper** (`:199-207`) that stamps
`meta.updatedAt` and schedules the persist. A new concept that skips it does not
persist. This is the single most important convention in the file.

### The exact recipe for adding a top-level concept

`views` is the most recently added one and it is the honest measure. Adding it
touched **four files and about ten sites**:

| File | Sites |
|---|---|
| `src/types/model.ts` | the types themselves — `ViewBlock`, `ColumnFilter`, `ViewDef` (`:753-783`) |
| `src/db/database.ts` | the table on the Dexie handle (`:19`) **and** a new `db.version(2).stores({...})` repeating every existing store (`:32-39`) |
| `src/db/repository.ts` | `ProjectSnapshot.views` (`:19`), the `load` Promise.all (`:44`), `saveAll` clear (`:60`) and put (`:68`), `wipe` (`:85`), plus both transaction table lists (`:52`, `:77`) |
| `src/store/useProjectStore.ts` | interface field + three actions (`:140-146`), initial value (`:216`), `init` hydrate with a backward-compat `?? []` (`:238-240`), `snapshot()` (`:296`), `resetProject` (`:266`) |

**What it did NOT touch, and should have:**

- `replaceProject` (`:272-286`) does not clear `views`. A demo swap or an import
  therefore leaves the previous project's view pages in the store, and
  `viewPersistence.ts:62-73` writes them straight back to Dexie. This is already
  flagged from the other side, in `src/features/quote/index.ts:69-71`. **A
  module system inherits this bug for every module.**
- `ProjectExport` (`model.ts:933-943`) and both io files. `grep` for
  `views|quotes|constraints` across `src/features/io/` returns **nothing**. A
  designed page has never travelled.

So: **the cost of a collection is four files, ten sites, and one Dexie version
bump — plus two things everybody has so far forgotten.** That is cheap enough
that a module system should not invent a parallel persistence layer, and it is
exactly what `features/views/index.ts:24-33` and `features/quote/index.ts:55-72`
have both already written down as requests.

**Dead action, worth knowing:** `deleteView` (`:731-737`) is exported and called
by nothing.

---

## 4 · `src/db/` — the schema and the migration story

`src/db/database.ts` is 39 lines. Two versions:

- `v1` (`:22-28`) — meta, entities, groups, rules, rows.
- `v2` (`:32-39`) — the same five plus `views`, with the comment *"Dexie carries
  every existing store forward untouched, so an upgrade costs the user nothing."*

That is the whole migration story and it is true **for additive changes only**.
Dexie's `.stores()` declares indexes, not shape; because every record is written
whole by `saveAll`, and read whole by `load`, **there is no field-level
migration mechanism at all**. The one accommodation for an older record in the
codebase is a `?? []` in the store's `init` (`useProjectStore.ts:238-240`) with
a comment naming it: *"a project saved before it existed loads with none, which
is the correct empty state"*.

**Consequence for a module system.** Adding `ModuleDef` is cheap and safe. Adding
a *required* field to `EntityDef` later — say `moduleId` — is not: there is no
upgrade hook, so the accommodation has to be an optional field plus a read-time
default, exactly as `EntityDef.kind` and `EntityDef.role` already are
(`model.ts:473,477` — both `?`, both with documented absent-means-X defaults,
`kindOf(e.kind)` at `LeftPanel.tsx:356`). **Every new field on an existing type
must be optional with a documented default.** That is not a style preference
here; it is the only migration the app has.

The repository interface (`repository.ts:22-26`) is three methods —
`load`, `saveAll`, `wipe` — and is the seam a backend replaces. It is snapshot
-shaped, not record-shaped, so it does not support partial loads. A module
system that expects to lazy-load one module's data would be the first consumer
to need a fourth method.

---

## 5 · `src/app/Shell.tsx` and the stages — one navigation idea, and three honest options

### What exists

- **The gate** (`Shell.tsx:170`): no org **and** no tables → `Onboarding`;
  otherwise → the configurator. `Shell.tsx:4-6`: *"There is no router, no URL and
  no third state."*
- **One stage at a time**, as one nullable value, deliberately not four booleans
  (`Shell.tsx:98-103`, `:122`, and the reasoning at `:50-56`).
- **Five stage kinds**: view, design, rules, flow, quote (`:98-103`).
- **The sheet is never unmounted.** A stage covers it; `inert` takes the canvas
  out of tab order, the a11y tree and hit-testing in one attribute
  (`:198-222`). Closing is instant and React Flow keeps its zoom.
- **A stage never outlives its subject** (`:124-139`) — the id is resolved
  against the store every render, so a deleted table closes its stage and
  un-lights its door in the same frame.
- **The panel is the only way in**: `LeftPanel` takes five `onOpen*` callbacks
  and five `*Open` flags (`LeftPanel.tsx:87-111`). Doors about the whole sheet
  hang above the list; doors about one table appear *under the selected row*
  (`:382-437`).

Four shell files are **already off the default path and still compiled**:
`Rails.tsx`, `Inspector.tsx`, `ViewSwitch.tsx`, `CheckStamp.tsx` — the shell says
so at `Shell.tsx:25-31` and `app/view.ts:1-2`. They are the right-rail
inspector and a SHEET/TABLE lens switcher. Anything a dashboard needs from a
right rail exists in unmounted form.

### Where a dashboard could go — three options, honestly costed

**Option A — the dashboard REPLACES the sheet as the landing surface.**
The blueprint becomes one module ("Design the data model") among several.

*What it costs.* The gate at `:170` becomes three-way. But the real cost is
structural: the stage pattern's whole value is that the sheet stays mounted
underneath (`:44-49`, `:198-222`). If the sheet is *inside* a module, it either
(a) stays permanently mounted under a dashboard it is no longer conceptually
under — which is the current `inert` layer wearing a lie, or (b) unmounts, and
the app loses instant close, React Flow zoom retention, and the scroll/selection
continuity that five files' worth of comments defend. Every stage's back button
also says the wrong thing: `"Back to the sheet"` appears at `ViewStage.tsx:103`,
`DesignStage.tsx:55`, `RulesStage.tsx:36`, `QuoteStage.tsx:83`.

*What it buys.* It is the only option that matches what the owner described —
"create a dashboard for their organisation and on the dashboard they have
ability to create a module". A dashboard you reach by opening a door over a
drawing is not a dashboard.

**Option B — the dashboard SITS ABOVE, as a sixth stage.**
One more entry in the `Stage` union, one more door in the panel.

*What it costs.* Almost nothing to build — and that is the warning. The panel
already spends **82% of its resting height at 1280×800 on things that are not
your tables**, and **0 of 21 tables show both their doors** (`docs/audit/information-architecture.md`,
IA-1 and IA-2, measured). A sixth door makes the measured first-run failure
worse, and the app would then have two competing navigations: a panel of doors
and a dashboard of modules, each able to reach things the other cannot.

*What it buys.* A demo. It does not buy the owner's ask.

**Option C — the panel BECOMES the module list.**
Modules are what the left panel enumerates; tables become the contents of a
data module rather than the top-level list; the dashboard is the panel's own
home state rather than a separate screen.

*What it costs.* A `LeftPanel` rewrite: the kind-grouping (`:178-207`), the
hardcoded `KIND_ORDER` (`:67-75`), the per-row doors (`:382-437`) and the
three whole-sheet doors (`:233-311`) all move behind a module. The `Stage` union
grows a discriminant per module kind. Selection (`useProjectStore.ts:30-33`)
grows a fourth kind.

*What it buys.* It is the only one of the three that **reduces** the number of
navigation ideas rather than adding one, and it is the only one that puts IA-1
and IA-2 on the path to being fixed rather than compounded. It keeps the
stage-over-canvas mechanism intact for the modules that want a canvas, and lets
a module that wants a full page simply not have one underneath.

**What I cannot determine from the code:** whether the owner's "dashboard" means
a landing page of tiles or a persistent navigation surface. The three options
differ mostly on that, and it is a question for them, not an inference for us.

**One thing all three need and none has:** deep links. There is no router
(`Shell.tsx:4-6`). A module a user is sent into, an item they are meant to open,
a quote emailed as a URL — every one of those needs an address the app cannot
currently produce, even though `UID_FIELD` was built to be that address
(`model.ts:955-967`, `PLATFORM_VISION.md:62`).

---

## 6 · `src/features/views/` — could view pages BE the module layout substrate?

**This is the most important question in this lens, so here is the shape in
full before the answer.**

### What a view page already is

```
ViewDef  { id, name, rootTableId, blocks[], createdAt, updatedAt }   model.ts:775-783
  └ ViewBlock { id, tableId, joinTableId?, rule?, filters?, columns?, children[] }
                                                                     model.ts:753-767
```

- **A named page about one row of one table.** `ViewPage` takes `viewId` and
  `rowId` (`ViewPage.tsx:47-50`).
- **An ordered tree of blocks, max depth 3** (`viewDefs.ts:21`, enforced at
  `:161-164`).
- **Rule vs filter is already separated at the type level** and the comment on
  `ViewBlock` (`model.ts:747-752`) states the distinction: rule = what is
  RELATED (structural, lives on the join), filter = what is SHOWN (cosmetic,
  lives on the view). A module layout needs exactly that separation and would
  otherwise have to invent it.
- **Design-time and run-time are the same screen.** `configuring` toggles handles
  onto the drawing already in front of you (`ViewPage.tsx:252-266`, and the
  header comment at `:10-16`: *"THE USER NEVER LEAVES THE PAGE THEY ARE
  CONFIGURING"*). `BlockCard`'s header comment (`BlockCard.tsx:1-14`) says the
  same at block level: *"Nothing moves position between the two modes, so leaving
  configure mode is a subtraction and never a surprise."* This is precisely
  PLATFORM_VISION's non-negotiable 3 (`PLATFORM_VISION.md:46-48`), already built.
- **Adding to a page is two gestures, both already built**: drag a table from
  the panel (`LeftPanel.tsx:346-347` writes the payload, `ViewPage.tsx:203-213`
  reads it) or press ADD and pick from a list (`ViewPage.tsx:395-451`).
- **A dropped table is met with a guessed rule in one English sentence**
  (`features/views/suggest.ts:1-17` — link column, then min/max envelope, then
  same-named columns, then "show everything"), offered and never applied
  (`ViewPage.tsx:158-171`: *"Accepting the offer is the ONLY thing that creates a
  block"*).
- **Curation is persisted as rows in a join table, never a hidden flag**
  (`features/views/pairs.ts:1-37`), with `__origin` recording rule/added/removed
  so the page can answer "why is this here?" and "why is this missing?".
- **A block already knows how to render a row list with chosen columns**
  (`columns.ts:131-138` ranks and picks defaults; `BlockCard` renders).

That is a lot of module-layout machinery that already exists and works.

### What it is not

| Gap | Evidence | Severity for a module system |
|---|---|---|
| **One view per table** | idempotent by `rootTableId` in both registries — `viewDefs.ts:108-109`, `useProjectStore.ts:708-709` | **Blocking.** A catalogue module and a quote module over the same table need two layouts. |
| **Detail only — no list/index layout** | `ViewPage.tsx:47-50` requires a `rowId`; the row picker is in the *shell*, not the feature (`ViewStage.tsx:177-230`) | **Blocking.** A catalogue module *is* an index. The rail in `ViewStage` is the closest thing and it is 120 rows, capped, search-only (`ViewStage.tsx:48,97-98`). |
| **No presentation on a block** | `ViewBlock` (`model.ts:753-767`) has no `display`, no `mode`, no `actions` | **Blocking.** "Define what can be done within that module" has nowhere to be written. |
| **No block title / copy override** | same | Minor. Titles come from the table name (`freeze.ts` uses `target.name` for a section title). |
| **Mode is React state** | `ViewPage.tsx:72` | **Blocking** for "have users go through it" — there is no way to hand somebody the run-time page. |
| **Not owned by the store** | registry at `viewDefs.ts:24`, mirrored by `app/viewPersistence.ts:47-74`, and the feature asks for the real slice at `views/index.ts:24-33` | Medium. Two sources of truth, one of them a shell file. |
| **Does not travel** | absent from `ProjectExport` (`model.ts:933-943`); `grep views src/features/io/` → nothing | **Blocking** for anything cross-organisation. |
| **Orphaned on table delete** | `deleteEntity` (`useProjectStore.ts:433-455`) does not touch `views`; `replaceProject` (`:272-286`) does not clear them | Real bug, inherited. |

### The honest answer

**Yes — with one structural change and one honest split.**

*The structural change:* `ViewDef` must stop being "the page for a table" and
become "a named layout, of a stated shape, over a table". Concretely that is
three things and no more:

- drop the idempotent-by-root-table constraint (both call sites above);
- add a discriminant for the shape (`detail` today; `index`/`catalogue` next);
- add presentation and capability to `ViewBlock`, both optional so every
  existing block keeps meaning exactly what it means now.

*The honest split:* a **module** and a **layout** are not the same object.
A module is the thing in the dashboard: it has a name, a master table, and a set
of things a person may do. A layout is one of the screens inside it. Collapsing
them would give you the current situation again at a higher altitude — one
layout per module, forever.

*What it would NOT require:* a second builder. The gear, the drag, the offer,
the block card, the pairs discipline and the rule/filter split are all reusable
as-is. Building a "module layout designer" beside `ViewPage` would be the
fifth-editor mistake `HELMLOGIC_GROUND_TRUTH.md` records the production app
making (five near-identical per-brand editors), committed by us this time.

**The one thing to be careful about.** `ViewPage` is 534 lines and `BlockCard` is
867 (`wc -l`). Both already carry drag, drop, refusal, offer, scope-cascade,
filter, star, order and picture concerns. Adding layout shapes and capabilities
*inside* those two components is how they become the thing nobody can change.
The shape belongs in the model and in small per-shape renderers; the shared
machinery (offer, drop, pairs, rule/filter) belongs where it already is.

---

## 7 · `src/features/quote/` — what is general, what is quote-specific

The quote is a module in all but name: it has its own registry, its own
persistence, its own list screen, its own document, its own editor, its own
shell stage, and one door in the panel. Splitting it:

### General — a module system should hoist this, not copy it

| Thing | Where | Why it is general |
|---|---|---|
| **The freeze line** | `freeze.ts:1-25`, and the invariant stated for grep at `quote/index.ts:22-33`: *"`useProjectStore` appears in exactly ONE file of this feature — freeze.ts — and every function in it is called from an EVENT, never from a render"* | Any module that produces a **document** — an order, a contract, a spec sheet, a work order — needs exactly this: read live data once, at the moment of the decision, by value. |
| **`live()`** | `freeze.ts:63-67` | A one-shot snapshot of the project for an event handler. Nothing quote-shaped about it. |
| **Draft / issued, enforced in one place** | `quotes.ts:175-179` — `mutate` refuses every edit to an issued record | The general pattern for "a designed thing becomes a published thing". A module's own publish state wants this exact discipline. |
| **The registry + `useSyncExternalStore` + write-behind shape** | `quotes.ts:42-101` | Identical in structure to `viewDefs.ts:24-48` and `constraintDefs.ts:46-106`. **Three copies of the same pattern already exist.** A module system will make it four unless the store grows the slices all three ask for. |
| **`persistNote()`** | `quotes.ts:46-51,142` | "The browser would not save this" surfaced to the person rather than swallowed. Any module holding user work needs it. |
| **Sections built from view blocks** | `freeze.ts:335-390` | The mapping "a layout's blocks become a document's sections" is the general shape of *layout → output*. |
| **`SUBJECT_BLOCK`** | `freeze.ts:305` | "The thing this page is about is also a line" — general to any output about a row. |
| **`makeNewVersion` / `supersedesId`** | `quotes.ts:483-511` | One link, deliberately not a chain. General versioning discipline. |

### Quote-specific — leave it where it is

| Thing | Where |
|---|---|
| The price ladder and every rung | `pricing.ts` in full; `QUOTE_LEVEL_ORDER` (`types.ts:58`), `LEVEL_TITLE` (`:65-70`) |
| `COST_COLUMNS` — the hard exclusion that keeps the dealer's buy price off a customer document | `pricing.ts:80-114` |
| Adjustments and their signs | `types.ts:159-174`, `quotes.ts:389-394` |
| Tax, customer, prepared-by, reference minting | `types.ts:228-236`, `quotes.ts:184-188` |
| The one summation | `totals.ts` |

### The blocking gap the feature itself names

`quote/index.ts:44-53`: **`EntityDef.priceLevels?: PriceLevel[]`** — which column
is a price and at which rung. Today `pricing.ts:175-180` resolves it from an
exact-name allow-list per `TableKind` (`Cash`/`Trade`/`Warranty` on boats,
`Sell Price`/`Trade Price` on motors, …) taken verbatim from the Northside data.
The file is explicit that this *"is knowledge about the Northside data living in
code"* and is a fallback, not the contract.

**This is the single clearest instance of the owner's "must be dynamically
driven" constraint being violated today**, and it is exactly the kind of thing a
module system multiplies: every module that shows money will otherwise need its
own allow-list.

---

## 8 · WHAT IS HARDCODED THAT A MODULE SYSTEM WOULD HAVE TO MAKE DATA

Ranked by how badly it breaks the "generic industry" constraint.

1. **`TABLE_KINDS`** — `model.ts:254-436`, 183 lines. Seven kinds, and the boat
   kind alone ships 28 named detail columns with marine units (`Tube Dia.` in
   cm, `Deadrise` in °, `Shaft Length` S/L/XL/XXL) and seven named sections
   including `Motor Fitment`. This is genuine, defended domain knowledge —
   the comment at `:182-200` argues the one-table-per-brand case from the real
   workbook — but it is **code**, and a second industry cannot be added without
   a developer. A module system that keys module types off `TableKind` inherits
   this exactly.
2. **`INDUSTRIES`** — `model.ts:159-180`. Four entries, three
   `available: false`. Onboarding renders from it (`onboarding/Onboarding.tsx:11-14`),
   the masthead renders from it (`TopBar.tsx:25,99-107`), and `lib/icons.tsx`
   carries an `INDUSTRY_ICON` map. Adding an industry is a code change in at
   least three places.
3. **`pricing.ts` `NAMED_LEVELS`** — `pricing.ts:175-180`. See §7. The feature has
   already written the fix.
4. **`pricing.ts` `COST_COLUMNS`** — `:80-114`, 27 literal column names from
   the Northside workbook. Safety-critical (it is what keeps buy prices off a
   customer document) and completely non-portable. The band-first check
   (`:128-133`) is the dynamic half and is the right direction.
5. **`KIND_ORDER`, twice** — `LeftPanel.tsx:67-75` and
   `features/constraints/columns.ts:31-38`. Two independent hardcoded orderings
   of the same seven kinds. A module dashboard needs a *user-defined* order and
   would make it three.
6. **Column-name heuristics.** `views/columns.ts:27` (`UNITS`, 12 literal
   units), `:56-57` (`BOUNDS` — `Min X`/`Max X` envelope detection), `:144`
   (`MONEY` regex), `pricing.ts:139-140` (`MONETARY` regex),
   `freeze.ts:85` (a column literally named `source`). Every one of these reads
   meaning out of an English column name. They are honest and well-argued
   locally, but they are the mechanism by which a Spanish-language or
   non-marine table silently stops working. The declared-intent alternative
   already has a precedent in the model: `KindColumn.unit` (`model.ts:234`)
   declares the unit rather than parsing it out of the name — and then
   `createTable` (`useProjectStore.ts:350`) writes it back *into* the name,
   where `splitUnit` has to parse it out again.
7. **`kind` and `role` are set once and never editable.** `updateEntity` is
   called from six sites and none passes `kind` or `role` (grep: `EntityDesigner.tsx:95,309,328,346`,
   `EntityTableNode.tsx:532`, `structure.ts:69`, `pairs.ts:163`,
   `lib/lint/applyFix.ts:43,55,249`). A module assigning a master table will
   want to change what a table *is*; there is no UI and no action for it.
8. **The stage list is a closed union.** `Shell.tsx:98-103`. Five kinds, each
   with bespoke JSX at `:237-273`. A module system whose modules can be
   *created by a user* cannot express itself as a TypeScript union.
9. **The panel's doors are five props.** `LeftPanel.tsx:87-111`. Same problem,
   one level down.
10. **`ProjectMeta.id: 'default'`** — `model.ts:921`. One project, by type.

---

## 9 · DEFECTS A MODULE SYSTEM WOULD INHERIT (found while reading, all citable)

1. **`replaceProject` does not clear `views`** — `useProjectStore.ts:272-286`.
   Already flagged from the quote side at `quote/index.ts:69-71`. Import or
   swap a demo and the previous project's pages persist and are written back to
   Dexie by `viewPersistence.ts:62-73`.
2. **`deleteEntity` does not delete that table's view** —
   `useProjectStore.ts:433-455` cascades into fields, rows and rules only.
3. **Views, constraints and quotes do not export** — `model.ts:933-943`;
   `grep -n "views|quotes|constraints" src/features/io/*` returns nothing. Every
   piece of *design* work a person does is trapped in one browser.
4. **Constraints are keyed on the lower-cased organisation NAME** —
   `constraintDefs.ts:39-40`. Renaming the business in the masthead
   (`TopBar.tsx:50-59` calls `setOrganisation`) orphans every rule written for
   it. The file names the cause: `OrgProfile` has no id.
5. **Three hand-rolled copies of the same registry pattern** —
   `viewDefs.ts:24-48`, `constraintDefs.ts:46-106`, `quotes.ts:42-101`. All
   three files' headers say they are temporary and name the store slice that
   would replace them (`constraints/index.ts:44-82`, `quote/index.ts:55-72`,
   `views/index.ts:24-33`).
6. **`resetProject()` does not clear constraints.** `useProjectStore.ts:257-270`
   wipes meta, entities, groups, rules, rows and views. `clearConstraints` and
   `forgetWorkbookSeeds` are exported (`constraints/index.ts`) and called from
   **nowhere** outside the feature — verified by grep. So CLEAR SHEET returns a
   fresh project carrying the previous organisation's rules, and the workbook
   seeds will not be re-offered. `constraints/index.ts:62-66` predicted this
   exactly.
7. **`deleteView` is dead** — `useProjectStore.ts:731-737`, no callers.
8. **The measured first-run failure** — `docs/audit/information-architecture.md`
   IA-1: at 1280×800, **0 of 21 tables** show both of their doors, and selecting
   a table does not scroll them into view; IA-2: the panel spends 371px of 744
   on a table-type palette. Every module door added to that panel lands below
   the fold.

---

## 10 · WHAT I WOULD CHECK BEFORE ANY OF THIS IS DESIGNED

Stated as open questions, not answers:

- **Is a module a container of tables, or a container of screens?** The owner's
  words — "create a module and define what can be done within that module and
  assign a master table to that module" — read as *screens + capabilities +
  one table*. `ViewDef` supports that reading. `TableKind` supports the other.
  They are different systems.
- **Who is the "user" who goes through it?** There is no user in the codebase
  (§0). Until there is, "admins design and users go through it" is one person
  pressing a toggle, which is what `ViewPage.tsx:72` already is.
- **Does a module own its data, or point at it?** `EntityDef.groupId`
  (`model.ts:490`) is the only existing containment relation and it is
  canvas-only. If modules own tables, the panel's kind grouping
  (`LeftPanel.tsx:178-207`) is replaced; if they point at tables, it is not.
- **Not determined:** whether the dashboard is a landing page or a persistent
  nav. §5 turns on it.

---

## 11 · THE SHORT LIST — what must be true before a module can be built on this

In dependency order. Nothing here is a feature; each is a precondition.

1. `OrgProfile` gets an `id`. Everything a module system creates hangs off the
   organisation, and today that is a lower-cased display name
   (`constraintDefs.ts:39-40`).
2. The store owns `constraints` and `quotes`, retiring two of the three
   registries. Both features have already written the exact diff
   (`constraints/index.ts:44-82`, `quote/index.ts:55-72`). Cost is §3's recipe,
   twice.
3. `replaceProject` clears every non-entity collection; `deleteEntity` cascades
   into views. Two small fixes that a module system would otherwise multiply.
4. `ProjectExport` reaches `EXPORT_VERSION 2` carrying views (and then
   constraints, quotes, modules), with version 1 read as "valid, none of those"
   rather than rejected — the exact accommodation `quote/index.ts:60-64`
   specifies.
5. `EntityDef.priceLevels` — the one declared-intent field the codebase has
   already asked for, and the clearest current breach of "dynamically driven".
6. `ViewDef` loses its one-per-table constraint and gains a shape discriminant;
   `ViewBlock` gains optional presentation and capability. Only then is there
   somewhere to write "what can be done within that module".
7. A decision on §5 (A / B / C), because the panel cannot take a sixth door
   without making the measured IA-1 failure worse.

---

*Written for review. No code was changed and nothing under `src/` was touched.*
