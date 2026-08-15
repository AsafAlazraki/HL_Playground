# WHAT A "MODULE" ACTUALLY IS IN HELMLOGIC

Research only. Nothing under `src/` was touched in either repo.
`C:/Users/AsafA/HelmLogic` was read and never written.

All `file:line` citations verified against the files on disk at the time of
reading. Where I could not determine something, it says **not determined**.
Where I reasoned past the evidence, it says **INFERRED**.

This document answers one question, so a module system can be designed against
fact rather than against the word: **what is a module in HelmLogic, what does
every module have in common, and what is hand-written per module that a
configurable system would have to turn into data.**

---

## 0 · THE ONE-SENTENCE ANSWER

> A HelmLogic **module** is a Firestore document at `modules/{id}` carrying a
> name, a slug, a logo, **one `moduleType` string from a nine-value list**, and
> **one `mainVendorId` pointer at a master table** — and that `moduleType`
> string selects, by an `if`-chain in a single 2,077-line file, which of seven
> completely hand-written React workspaces the user gets.

Everything else the owner is asking for — "create a module, define what can be
done within it, assign a master table to it" — **already exists in HelmLogic as
a data shape**. It is the *rendering* that is hardcoded. That is a much better
starting position than it first appears, and it is the precise seam our plan
should cut along.

---

## 1 · THE WORD HAS THREE REFERENTS. SEPARATE THEM FIRST.

`HELMLOGIC_GROUND_TRUTH.md:85` already flags the overload. Going deeper, there
are three distinct things called "Module", and they do **not** line up
one-to-one:

| # | Referent | Where it lives | Count |
|---|---|---|---|
| **A** | **Workbook Module** — the business's own word. `Boat Module.xlsx`, `Motor Module.xlsx`, `Parts Module.xlsx` … | `tasks/mpf-audit/INVENTORY.md:5-22` | **14 of 17 workbooks** are named `* Module.xlsx` |
| **B** | **App Module** — a `modules/{id}` doc = an org's branded access to a vendor + a workspace | `src/app/(app)/modules/add/page.tsx:73-86` | **9 `moduleType` values**; live doc count **not determined** (requires auth) |
| **C** | **App section** — a top-level sidebar route (Sales, Catalog Manager, Settings, Admin) that is *not* a module at all | `src/lib/nav-links.ts:17-51` | **6 top-level entries, hardcoded** |

**The mapping between A and B is partial and lossy.** Built from
`INVENTORY.md:5-22` against `modules/add/page.tsx:175-183`:

| Workbook Module (A) | App `moduleType` (B) |
|---|---|
| Boat Module | `catalog` |
| Motor Module | `motor-brand` |
| Trailer Module | `trailers` |
| Registration Module | `rego` |
| Service Module | `service` |
| Rigging Module | `fit-up` *(partial — fit-up is rigging kits + labour)* |
| **Parts Module** | **none** — lands in `organisations/{org}/serviceParts` + `dealerFitSelections` |
| **Factory Options Module** | **none** — folded into `models/{id}.optionalFeatures[]` inside the boat editor |
| **Freight / Price Matrix / Administration / Supplier / Contacts / Customer / Hull Only** | **none** |
| — | `master-price-file` *(generic escape hatch, no single workbook)* |
| — | `used-boats`, `website-listings` *(placeholders, no workbook, no data)* |

**Take-away for our plan.** The business already thinks in modules, and it has
**more** modules than the app does. Seven workbook modules have no app module at
all. A configurable module system is not a new idea being imposed on this
business — it is the app finally catching up to how the business already
organises itself. That is a strong argument to put in front of the owner.

**And the third referent is the warning.** Sidebar sections (C) are a hardcoded
array of six. Modules (B) **never appear in the sidebar** — the only ways into a
module are the dashboard card grid and the admin `/modules` list. If our system
lets an admin create a module but the app's navigation cannot show it, we have
rebuilt the same wall.

---

## 2 · ENUMERATION — EVERY MODULE, ITS SCREENS, ITS DATA, WHAT A USER DOES

The dispatch is a linear `if`-chain, top to bottom, in one file. Read it as a
routing table (`src/app/(app)/modules/[id]/page.tsx:617-993`):

```
617   const moduleType = moduleData?.moduleType || 'catalog'
620   if (moduleType === 'master-price-file' …)        → MasterPriceFileWorkspace
667   if (moduleType === 'motor-brand'
        || mainVendor?.vendorType === 'Motor Brand')   → YamahaMotorWorkspace
728   if (moduleType === 'trailers' …)                 → TrailersWorkspace
774   if (moduleType === 'rego' …)                     → RegoWorkspace
817   if (moduleType === 'fit-up' …)                   → FitUpCatalogManager
854   if (moduleType === 'service' …)                  → ServiceQuoteDashboard
887   if (moduleType !== 'catalog' …)                  → placeholder + "Coming soon" cards
1298  (fall-through)                                   → the 5-tab catalog module
```

Note line 667: the motor branch fires on `moduleType === 'motor-brand'` **or**
on the *vendor's* `vendorType`. One branch out of seven consults the master
table's type instead of the module's own type. That inconsistency is itself a
finding — see §5.

### 2.1 `catalog` — the Boat Brand module (the default, and the biggest)

| | |
|---|---|
| **Reached by** | fall-through — also the default when `moduleType` is absent (`:617`) |
| **Screens** | 5 tabs: Dashboard · Catalog · Stock Management · Pricing · Settings (`:1298-1304`). Plus 4 sub-routes: `/quote/[modelId]`, `/proposals`, `/proposals/[quoteId]`, `/ranges/[rangeId]`, `/templates/[templateId]` |
| **Master collection** | `data-warehouse/{mainVendorId}/ranges/{rangeId}/models/{modelId}/variants/{variantId}` |
| **Also reads** | `users/{uid}/quotes` (`:450`), org stock, `organisations/{org}/dealerFitSelections` |
| **User does** | browses ranges → models; opens a model in `ModelConfigurationEditor`; starts a quote (`:546`); manages stock and locations; sets pricing; configures the module |
| **Divergences** | the only module with a Dashboard tab, the only one with stock, the only one with a quote route, the only one whose Settings is hand-rolled rather than the shared panel (`:1721`) |

### 2.2 `motor-brand` — the Yamaha module

| | |
|---|---|
| **Screens** | 6 tabs: Catalog · Pricing Manager · **Rebates** · Dealer Fit · Fit-up · Settings (`yamaha-motor-workspace.tsx:473-483`) |
| **Master collection** | `data-warehouse/{vendorId}/dataSets/{dataSetId}/rows/{rowId}` (`:345,368`) — **a schemaless row bag, not the ranges/models tree** |
| **User does** | browses/edits motor rows; prices; manages rebates; starts a full motor quote (`modules/[id]/page.tsx:693`) |
| **Divergences** | tab state persisted to the URL as `?motorTab=` (`:314-330`); tab key `promotions` deliberately kept after the label was renamed to "Rebates" so old URLs survive (`:476-478`) — good practice, worth stealing |

### 2.3 `trailers`

| | |
|---|---|
| **Screens** | 3 tabs: Dashboard · Pricing Manager · Settings (`trailers-workspace.tsx:33-37`) |
| **Master collection** | `data-warehouse/{vendorId}/series/{seriesId}/trailers/{trailerId}` (`trailer-dashboard.tsx:168-172`) |
| **`mainVendorId`** | **explicitly nulled** at creation (`modules/add/page.tsx:94`) and replaced by an array `trailerBrandVendorIds` (`:89-91`) |
| **User does** | browses trailers by brand → series; edits specs and pricing; publishes |

### 2.4 `rego` — Registration Authority

| | |
|---|---|
| **Screens** | list of authorities → CRUD of rego bands, + Settings (`rego-workspace.tsx:468`) |
| **Master collection** | `data-warehouse/{regoVendorId}/regoTypes/{regoTypeId}` — documented in-file at `rego-workspace.tsx:10-17` |
| **`mainVendorId`** | **explicitly nulled** (`modules/add/page.tsx:99`), replaced by `regoVendorIds` |
| **User does** | maintains rego bands (`name`, `sellExclGst`, `appliesTo: boat\|trailer\|both\|sticker\|fee`) that feed the quote pickers |
| **Divergences** | the only module with **no search** at all; the only one that turns the shared Settings dealer-fit card off (`showDealerFit={false}`) |

### 2.5 `master-price-file`

| | |
|---|---|
| **Screens** | one workspace: dataset tabs + an editable grid + xlsx import/export (`master-price-file-workspace.tsx:467`) |
| **Master collection** | `data-warehouse/{vendorId}/dataSets/{id}/rows` — same shape as motors |
| **User does** | uploads a sheet, edits cells in place, exports |
| **Divergences** | **columns are auto-detected from whatever keys the row docs happen to have** (`:160-161`). No schema, no labels, no order, no types. This is the app's honest escape hatch — and, per `HELMLOGIC_GROUND_TRUTH.md:588-594`, the most commercially important catalogue in the app runs on it |

### 2.6 `fit-up`

| | |
|---|---|
| **Screens** | one page: `FitUpCatalogManager` (1,988 lines) (`modules/[id]/page.tsx:845`) |
| **Master collection** | **`organisations/{orgId}/fitUpItems/{itemId}`** — org-scoped, not vendor-scoped (`fit-up-catalog-manager.tsx:10,200`) |
| **`mainVendorId`** | **never set** — the form hides the field entirely for this type (`modules/add/page.tsx:188`) |
| **User does** | maintains fit-up items and scopes each to Modules / Brands / Ranges / Models / Variants via five parallel allowlists (`:82-84`) |
| **Divergences** | no tabs, no Settings panel, no search; the master table is derived from the *user's org*, not from the module doc |

### 2.7 `service`

| | |
|---|---|
| **Screens** | one page: `ServiceQuoteDashboard` + a 4-step create wizard (`modules/[id]/page.tsx:880`) |
| **Master collection** | **`organisations/{orgId}/serviceQuotes`**, over `serviceOperations` + `serviceParts` (`service-quote-flow.tsx:150,394,400`) |
| **`mainVendorId`** | **never set** |
| **User does** | creates and tracks service quotes |
| **Divergences** | **the only module whose master collection is a transaction log rather than a catalogue.** Its quotes live at `organisations/{org}/serviceQuotes` while every other quote in the app lives at `users/{uid}/quotes` (`finalize-quote-dialog.tsx:661`). Two module types, two storage locations, same noun |

### 2.8 `used-boats` and `website-listings` — placeholders

| | |
|---|---|
| **Screens** | a cover-image card plus two "Coming soon." cards (`modules/[id]/page.tsx:960-988`) |
| **Master collection** | **none** |
| **User does** | upload a cover image. That is the entire feature |

These matter to the plan out of proportion to their size: they are what a
module type looks like when someone wants one and no developer has written it
yet. **In a configurable system these are not placeholders — they are the
normal case.**

---

## 3 · ANATOMY — WHAT EVERY MODULE HAS, AND WHERE THEY DIVERGE

Built from the evidence, not from a template. `✔` = present, `—` = absent.

| Capability | catalog | motor-brand | trailers | rego | MPF | fit-up | service | used-boats |
|---|---|---|---|---|---|---|---|---|
| Blue masthead + module name | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| "Back to Hub" | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ |
| Tab bar | ✔ 5 | ✔ 6 | ✔ 3 | ✔ 2 | dataset tabs | — | — | — |
| Tab state in URL | — | ✔ `?motorTab=` | ✔ `?trailerTab=` | — | — | — | — | — |
| Dashboard / stats tab | ✔ | — | ✔ | — | — | — | ✔ | — |
| List view of the master table | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Detail / editor | ✔ per-brand | ✔ sheet | ✔ sheet | ✔ inline | ✔ inline cell | ✔ inline | ✔ wizard | — |
| Search | ✔ | ✔ | ✔ | **—** | ✔ | **—** | ✔ | — |
| Pricing surface | ✔ | ✔ | ✔ | ✔ inline | — | ✔ inline | ✔ | — |
| Import | via `/manage` | — | — | — | ✔ xlsx in-module | via `/manage` | via `/manage` | — |
| Export | via `/manage` | — | — | — | ✔ xlsx in-module | via `/manage` | via `/manage` | — |
| Settings tab | ✔ **hand-rolled** | ✔ shared panel | ✔ shared panel | ✔ shared panel | — | — | — | — |
| Stock | ✔ | — | — | — | — | — | — | — |
| Quote entry | ✔ | ✔ | ✔ deep-link | — | — | ✔ deep-link | ✔ | — |
| Sub-dealer variant | ✔ | — | — | — | — | — | — | — |

### 3.1 The common shape, stated plainly

Every module that is not a placeholder has **exactly four things**:

1. **An identity** — name, slug, logo, masthead.
2. **A master collection** it is "about".
3. **A way to see the rows in it** — always a list, sometimes grouped by the
   hierarchy in the collection path.
4. **A way to change a row** — inline cell, side sheet, or a full editor.

Then **optionally**: tabs, pricing, search, import/export, settings, and an
action that starts a quote.

That is a small, honest shape. It is expressible as configuration.

### 3.2 The divergences that are *real*, and the ones that are *accidents*

**Real** — these reflect genuinely different jobs and a generic system must
allow them:

- **Depth of the master collection differs.** 4 levels (boats), 3 (trailers),
  2 (motors, MPF), 1 (rego bands, fit-up items). Already established in
  `HELMLOGIC_GROUND_TRUTH.md:54-74`; confirmed here at the collection paths in
  §2. A module's list view must adapt to the depth of its table.
- **Some modules are about a catalogue, one is about transactions.** `service`'s
  master collection is `serviceQuotes`. A module system that assumes "master
  table = product catalogue" cannot express it.
- **Ownership differs.** Five modules point at shared, cross-org
  `data-warehouse/…` data; two point at private `organisations/{org}/…` data.

**Accidental** — these are drift, and our system should simply not have them:

- **rego and fit-up have no search.** Nothing about a rego band makes it
  unsearchable. (This is the same finding as UX_AUDIT item 2 — "You cannot ask
  the app for a boat by name" — `docs/audit/UX_AUDIT.md:96`. Search absence is
  *per-surface* in both apps because it is written per-surface.)
- **Two of six workspaces keep tab state in the URL; four do not.**
- **Three workspaces use the shared `ModuleSettingsPanel`; the catalog module
  hand-rolls the same six cards inline** (`modules/[id]/page.tsx:1721-1768`).
  The panel's own header comment names the gap:
  *"Single source of truth so Trailer / Yamaha / Rego (and eventually Boat) all
  have the same card set"* (`module-settings-panel.tsx:4-6`). "Eventually"
  never arrived.
- **Import/export is not a module capability at all.** It is one global
  org-level page covering six org-scoped collections, and it explicitly
  excludes everything under `data-warehouse/` — i.e. the master tables of five
  of the seven real modules (`catalog-export-import.tsx:7-24`). Only the MPF
  module has import in the module.

**`ModuleSettingsPanel` is the single most important precedent in this
codebase.** It is the one place where someone generalised across modules and it
worked. Its card set — image · module-specific extras · associated vendors ·
associated modules · categories · sub-dealers · role assignment — with
per-module on/off props (`showDealerFit`, `showSubDealers`, `showModuleImage`)
is *exactly* the shape of "define what can be done within that module", written
by hand. Our version should be that panel with the props turned into data.

---

## 4 · THE MASTER TABLE QUESTION

The owner's phrase — *"assign a master table to that module"* — already exists
in HelmLogic. It is called **`mainVendorId`**, it is a required field for
`catalog` modules, and the create form validates it (`modules/add/page.tsx:66-69`).

But it only works for four of nine types. The full truth:

| moduleType | Master collection | How the module finds it |
|---|---|---|
| `catalog` | `data-warehouse/{v}/ranges/…/models/…/variants` | **`mainVendorId`** ✔ |
| `motor-brand` | `data-warehouse/{v}/dataSets/{ds}/rows` | **`mainVendorId`** ✔ |
| `master-price-file` | `data-warehouse/{v}/dataSets/{ds}/rows` | **`mainVendorId`** ✔ |
| `trailers` | `data-warehouse/{v}/series/{s}/trailers` | `mainVendorId` **nulled** (`:94`); array `trailerBrandVendorIds` instead |
| `rego` | `data-warehouse/{v}/regoTypes` | `mainVendorId` **nulled** (`:99`); array `regoVendorIds` instead |
| `fit-up` | `organisations/{org}/fitUpItems` | **implicit** — derived from the signed-in user's org at render (`modules/[id]/page.tsx:845`) |
| `service` | `organisations/{org}/serviceQuotes` | **implicit** — same |
| `used-boats` | none | — |
| `website-listings` | none | — |

### What this tells us to build

1. **The pointer is right; its arity is wrong.** Three types need *one* table,
   two need *many*. Our version must be **a set of table references, with one
   marked primary** — not a scalar. That one change absorbs `trailers` and
   `rego` without a special case.
2. **The three separate fields are the same field.** `mainVendorId`,
   `trailerBrandVendorIds`, `regoVendorIds` are one concept written three
   times, and the code proves it: the create form has to null one and populate
   another (`:88-100`), and the *type filter* on the picker is also hardcoded
   per type (`:222-223`, `v.vendorType === 'Trailer Brand'` /
   `'Rego Authority'`). In our model this is: *which tables may this module
   point at* — a filter over table **kind**, which we already have
   (`src/types/model.ts:201` `TableKind`).
3. **Ownership must be explicit, not implicit.** `fit-up` and `service` find
   their table by reaching for the current org. That is invisible to the admin
   configuring the module and unrepresentable in the module doc. In ours, the
   module names its tables — always — and there is one place to look.
4. **A module with no master table must be legal.** `used-boats` and
   `website-listings` are real module docs with real names and cover images and
   no table. A system that requires a table before you can make a module makes
   the "I'm still setting this up" state impossible.

---

## 5 · THE FIVE PER-BRAND EDITORS — THE DIFF, DONE PROPERLY

`HELMLOGIC_GROUND_TRUTH.md:711-728` says there are five near-identical editors
and cites line 56. That is right. Here is what a full diff adds.

### 5.1 The structure components — five files, 2,026 lines, one meaningful line

```
highfield-data-structure.tsx   409 lines
stacer-data-structure.tsx      410
jeanneau-data-structure.tsx    403
stabicraft-data-structure.tsx  402
surtees-data-structure.tsx     402
```

`diff highfield-data-structure.tsx jeanneau-data-structure.tsx` — **30 changed
lines total**, and they sort into exactly four buckets:

| Bucket | Count | Example |
|---|---|---|
| **The seed list** | 1 | `:56 const initialRanges = [...]` |
| **The component's own name** | 1 | `HighfieldDataStructure` → `JeanneauDataStructure` |
| **The brand name inside 4 display strings** | 4 | `:126` toast, `:247` CardTitle, `:248` CardDescription, `:350` empty state |
| **Pure drift — no behaviour** | ~24 | one indent, one trailing comma, one JSX block collapsed onto a single line, and **one hover class that differs**: `hover:bg-accent hover:text-accent-foreground` (highfield `:242`) vs `hover:bg-primary/10 hover:text-primary` (jeanneau `:243`) |

Diff sizes against highfield: stacer **19**, stabicraft **27**, surtees **29**,
jeanneau **30** changed lines — and the bucket split holds in every case.

**The five seed lists, verbatim** (`:56`, stacer `:57`):

```
highfield   ['Sport','Classic','Roll-Up','Adventure','Patrol']
jeanneau    ['Merry Fisher','Cap Camarat','DB','TH']
stacer      ['Open Boats','Prolines','Assualt Pros','Crossfire','Outlaws',
             'Sea Masters','Wild Riders','Sea Runners','Plate']
stabicraft  ['Explorer','Fisher','Frontier','Supercab','Treker',
             'Ultra Centrecab','Ultracab']
surtees     ['Workmate','Workmate Hardtop','Game Fisher','Pro Fisher']
```

`'Assualt Pros'` is a typo — in production source, in a customer's own product
taxonomy, requiring a developer, a build and a deploy to correct. That single
misspelling is the strongest one-line argument for this whole project.

> **The finding, stated for the plan:** to replace all five structure
> components, a generic module needs to express exactly **two** things — a
> display name, and a starting list of level-2 values. Nothing else in 2,026
> lines is per-brand.

### 5.2 The model editors — where the divergence is real, and small

```
highfield-model-editor.tsx   1,407 lines
jeanneau-model-editor.tsx      249
stacer-model-editor.tsx        234
surtees-model-editor.tsx       234
stabicraft-model-editor.tsx    228
```

**`diff stacer-model-editor.tsx surtees-model-editor.tsx` = 6 changed lines,
all three of them identifier renames** (`stacerModelSchema` → `surteesModelSchema`,
`StacerModelEditor` → `SurteesModelEditor`, and the `z.infer` that follows).
Two 234-line production components that differ **only in their own names**.

Where the four small editors *do* diverge, it is entirely the **field list**:

| Field | highfield | jeanneau | stacer | surtees | stabicraft |
|---|---|---|---|---|---|
| `modelCode` (required) | ✔ | ✔ | ✔ | ✔ | ✔ |
| `coverImageUrl`, `galleryImageUrls` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `registration{…}` | ✔ **+`tenderToStickerPrice`** | ✔ | ✔ | ✔ | ✔ |
| `cost`, `sellPriceExclGst` | ✔ | ✔ | ✔ | ✔ | **—** |
| `specifications.motorConfigurations` | ✔ typed | ✔ **typed enum** | `z.any()` | `z.any()` | **—** |
| `specifications.otherSpecs` | ✔ | ✔ | ✔ | ✔ | **—** |
| `standardFeatures` | ✔ | ✔ | ✔ | ✔ | **—** |
| `optionalFeatures` | ✔ typed | ✔ | ✔ | ✔ | ✔ |
| `documents` | ✔ | ✔ | — | — | — |
| `packages` / `colors` | — | ✔ | — | — | — |
| `packageLevels` | — | — | — | — | ✔ |
| `uDekOptions`, `paintAndGraphicOptions` | — | — | — | — | ✔ |
| `rules`, `fitUpComplexity`, `fitOutPricing`, `trailerConfig`, `trailerAssignments` | ✔ | — | — | — | — |

Sources: `highfield-model-editor.tsx` schema block; `jeanneau-model-editor.tsx:19-51`;
`stacer-model-editor.tsx:19-36`; `surtees-model-editor.tsx:19-36`;
`stabicraft-model-editor.tsx:19-32`.

Two things worth naming:

- **Jeanneau is the only brand whose motor configuration is typed** —
  `z.enum(["Single","Twin","Triple","Quad","SingleWithAux"])` with per-engine
  min/max/recommended HP (`jeanneau-model-editor.tsx:19-27`). The other three
  store `z.array(z.any())` for the same concept. Same field, four brands, one
  of them validated. That is precisely the "one editable list per enum" wound
  from `HELMLOGIC_GROUND_TRUTH.md:744-755`, seen from the module side.
- **Highfield's 1,407 lines are not 1,407 lines of Highfield.** They are the
  generic capabilities — rules, fit-up complexity, fit-out pricing, trailer
  assignments, motor setup, guardrails — that only ever got written once, into
  whichever file was in front of the developer. Every other brand is missing
  them not by decision but by cost.

### 5.3 The dispatch, and what happens to brands that aren't in it

Two switches, in two files, both keyed on `vendor.slug`:

```ts
// model-configuration-editor.tsx:77-85   — which SCHEMA validates
switch (slug) {
  case 'highfield': …  case 'jeanneau': …  case 'stacer': …
  case 'stabicraft': … case 'surtees': …
  default: return base;              // ← silently drops every brand field
}

// model-configuration-editor.tsx:309-315 — which EDITOR renders
switch (vendor.slug) {
  …
  default: return <p>Editor Not Available</p>;
}
```

And a third, written as sibling JSX rather than a switch, at
`data-warehouse/[id]/page.tsx:1504-1514` — this one **does** have an explicit
fallback card: *"A specific data structure has not been configured for this
boat brand."*

> **Precision note / correction to prior research.** `HELMLOGIC_GROUND_TRUTH.md:723-724`
> says brands absent from the switch "silently fall through to a bare schema".
> Both halves are true but at different sites: the **schema** switch
> (`:83 default: return base`) is silent and does drop fields; the **editor**
> switch (`:315`) and the ranges surface (`:1509-1514`) both show an explicit
> dead-end message. Worth stating exactly, because "silent" and "an honest
> dead-end" call for different fixes.

Either way the operational fact holds: **Formosa and Haines Signature have real
data in production (1/39/39 and 1/9/9 per `HELMLOGIC_GROUND_TRUTH.md:112-113`)
and no editor.** Adding a boat brand is a 400-line component + a schema + three
switch cases + a build + a deploy.

---

## 6 · WHAT IS HARDCODED PER MODULE — THE CONFIGURATION SURFACE

This is the list our module system has to turn into data. Every row is
something a HelmLogic developer types into a `.tsx` file today.

| # | Hardcoded thing | Evidence | Must become |
|---|---|---|---|
| 1 | **The module type list itself** — 9 `<SelectItem>` values | `modules/add/page.tsx:175-183` | Not an enum. A module is defined by its table + capabilities, not by a type name |
| 2 | **Which workspace a type renders** — a 7-branch `if`-chain | `modules/[id]/page.tsx:620-887` | One generic module renderer driven by the module's config |
| 3 | **The tab set, per module** — 5 / 6 / 3 / 2 / 0, each a literal array | `:1298-1304`, `yamaha:473-483`, `trailers:33-37` | An ordered list of capability blocks, chosen by the admin |
| 4 | **The field list, per brand** — five Zod schemas | `stacer:19-36` etc., §5.2 | Column definitions on the table (we already have `FieldDef`, `src/types/model.ts:93`) |
| 5 | **Field labels** — `"12 Months Boat Rego"`, `"Rego Stickers (Supply & Fit)"`, `"Master Model Code"`, `"Series Display Name"` | `stacer-model-editor.tsx:82,97,112`; `model-configuration-editor.tsx:402,433` | Column labels, editable |
| 6 | **Section order and headings inside an editor** — Range Identity, Motor Setup, Guardrails | `model-configuration-editor.tsx:401`; `highfield-model-editor.tsx:847,1263` | Our named collapsible **sections** — already built (`ColumnSection`, `model.ts:85`) |
| 7 | **The seed value list per brand** | `*-data-structure.tsx:56` | Rows. Typed by the user, or imported |
| 8 | **Enum domains** — motor config types typed for one brand out of four | `jeanneau-model-editor.tsx:20` | A `select` column with editable options |
| 9 | **The permission list** — 11 flags, one array | `manage-organisation-page.tsx:125-142` | Per-module capability toggles (see §6.1) |
| 10 | **Which vendor types may be picked for which module type** | `modules/add/page.tsx:222-223` | A filter over table kind |
| 11 | **The module card's description on the dashboard** — see §6.2 | `[orgSlug]/dashboard/page.tsx:95-97` | A description field on the module |
| 12 | **The sidebar** — 6 entries, hand-written | `nav-links.ts:17-51` | Navigation composed from the org's modules |
| 13 | **Which Settings cards a module shows** | `module-settings-panel.tsx:80-91` props | Data, not props |
| 14 | **Whole per-brand routes** — `/highfield/page.tsx` is a 42-line placeholder page named after a customer's supplier | `src/app/(app)/highfield/page.tsx:1-42` | Nothing. This should never be possible |

### 6.1 Permissions — the closest thing to "define what can be done"

Eleven flags, one hand-written array (`manage-organisation-page.tsx:125-142`):

```
can_access_module · can_access_pricing_manager · can_create_quotes
can_edit_boat_data · can_view_subdealers · can_access_price_book
can_access_settings · can_manage_stock · can_view_stock
can_override_margin · can_approve_suggestions
```

Three observations that matter to the design:

- **They are org-wide and role-keyed, never per-module.** They live at
  `organisations/{org}.permissions[roleId][flag]` and are read identically on
  every module (`modules/[id]/page.tsx:1301-1302`). There is no way to say
  "Sam can edit the Yamaha module but only read Highfield". The owner's ask —
  *"define what can be done within that module"* — **does not exist today.**
- **`can_edit_boat_data`.** A marine noun, frozen into a permission
  identifier, gating a `Catalog` tab that in five of nine module types has
  nothing to do with boats. This is the exact failure mode the standing
  constraint warns about: *"not too marine — generic industry"*. In our system
  the capability is `edit rows`, and what the rows are called comes from the
  table.
- **There is a per-module role concept, but it is titles, not powers.**
  `ModuleRoleAssignment` sets a **Brand Captain** and a **Module Manager** per
  module (`module-settings-panel.tsx:145`, module doc fields
  `brandCaptainUserId` / `moduleManagerUserId`). Whether either grants any
  actual permission — **not determined**; I found the assignment surface and
  the stored fields, and no gate that reads them.

### 6.2 The one line to show the owner

`src/app/(app)/[orgSlug]/dashboard/page.tsx:95-97` — the description under every
module card on the organisation dashboard:

```tsx
{module.name.toLowerCase().includes('outboard') || module.name.toLowerCase().includes('motor')
    ? "Manage engine technical specs, factory rigging, and propellers."
    : "Configure boat packages, BMT options, and generate sales quotes."}
```

The dashboard decides what a module *is* by **substring-matching the name the
user typed**. Every module that isn't a motor — trailers, rego, service,
fit-up, used boats — is described to its user as *"Configure boat packages, BMT
options, and generate sales quotes."*

One `description` field on the module doc fixes it. The field is not merely
absent from the create form — `modules/[id]/page.tsx:935` already **reads**
`moduleData.description` for the placeholder types, so the field exists in the
data model and nothing writes it.

---

## 7 · WHAT HELMLOGIC ALREADY GETS RIGHT ABOUT MODULES

These are working precedents. Adopting them is cheaper than inventing, and it
means the owner recognises the result.

1. **The module doc as the unit of configuration.** Name, slug, logo,
   `mainVendorId`, `associatedVendorIds[]`, `associatedModuleIds[]`, plus
   per-module settings. It is the right document. It is under-used, not wrong.
   (`modules/add/page.tsx:79-100`; field inventory in §6.)
2. **Org subscribes, user orders.** The org enables modules
   (`organisations/{org}.enabledModuleSubscriptions`) and **each user drags
   their own dashboard into their own order**, persisted to
   `users/{uid}.moduleOrder` (`[orgSlug]/dashboard/page.tsx:135-171`).
   That is *already* a dynamically-created, per-organisation,
   per-person dashboard. The owner's first sentence is half-built. Our job is
   to widen what a card can be, not to invent the mechanism.
3. **`ModuleSettingsPanel` with capability props.** §3.2. The shape of the
   answer, written by hand — and it already has both halves a configurable
   system needs. **Toggles**: rego turns the dealer-fit card off outright
   (`rego-workspace.tsx:473 showDealerFit={false}`). **Overrides**: trailers
   keeps the card but renames its field, title and description
   (`trailers-workspace.tsx:134-136`). **An escape hatch**: `preCards` /
   `midCards` inject module-specific cards above and below the standard set
   (`module-settings-panel.tsx:76-79`; used by rego `:474` and trailers `:137`).
   Toggle · override · escape hatch is exactly the right vocabulary for
   "define what can be done within that module".
4. **`associatedModuleIds` — modules referencing modules.** Added in v1.4 so a
   boat module can pull the trailer module's brands *"without duplicating"*
   (`module-settings-panel.tsx:12-14`). A module system needs this on day one.
5. **Tab keys are stable when labels change.** `promotions` kept as the key
   after the label became "Rebates", so bookmarked URLs survive
   (`yamaha-motor-workspace.tsx:476-478`).
6. **Per-module document templates were the design intent.** The template doc
   carries a `moduleId` (`organisations/[id]/page.tsx:107`) — someone
   understood that a module should own its output format.
   **But nothing renders them:** the collection
   `organisations/{orgId}/templates` is written by the 1,232-line designer
   (`modules/[id]/templates/[templateId]/page.tsx:450`) and by the create
   dialog, and read by **no renderer anywhere** — a repo-wide grep finds five
   references total, all authoring. Corroborates `QUOTE_FINDINGS.md:75-80`.
   → **The rule this hands us: in our plan, the module layout designer and the
   module runtime ship in the same increment, or the designer does not ship.**

---

## 8 · THE FIVE STRUCTURAL CLAIMS THIS LENS ESTABLISHES

For the plan to build on. Each is evidenced above.

1. **A module = identity + a set of table references (one primary) + an ordered
   list of capability blocks + a permission set.** Nothing in HelmLogic's nine
   module types needs anything outside those four, and seven of nine are fully
   expressible in them today.
2. **"Master table" already exists as `mainVendorId`; it needs to become a set
   with one primary,** which absorbs `trailers` and `rego` (arrays) and
   `fit-up`/`service` (implicit) without special cases. §4.
3. **The capability blocks, drawn from the evidence, are:** list · detail/edit ·
   search · pricing · import/export · settings · dashboard/stats · start-a-quote
   · stock. Nine, from the matrix in §3. Every existing HelmLogic module is a
   subset of these. **This is the answer to "define what can be done within that
   module."**
4. **Five hand-written brand editors reduce to two configurable things** — a
   display name and a starting row list — plus a per-table column list. §5.
   That is the demo: replace 2,026 lines with a name and a list.
5. **The three surfaces that must be generated from the module set, or the
   system fails on contact:** the sidebar (`nav-links.ts` — hardcoded),
   the dashboard card (`dashboard/page.tsx:95` — name-sniffed), and the module
   page itself (`modules/[id]/page.tsx:620-887` — an if-chain). All three are
   hardcoded today, and all three are what a user actually sees.

---

## 9 · NOT DETERMINED

Stated plainly rather than guessed, per the standing rules.

- **How many `modules/{id}` docs exist in production**, and which types are
  actually in use. Requires reading Firestore, i.e. authenticating. Not done.
  All nine types are *offered* by the create form; only seven have a rendering
  branch.
- **Whether `brandCaptainUserId` / `moduleManagerUserId` grant any permission.**
  I found the assignment UI and the stored fields; I found no gate that reads
  them. Absence of evidence in a 99,845-line source tree, not proof of absence.
- **Whether `used-boats` / `website-listings` modules exist in production data**,
  or whether the type values were added ahead of any use.
- **The runtime behaviour of any module.** No dev server was started, per the
  read-only constraint. Every claim here is from source, not observation.
- **Whether the 9 module types were designed as a set** or accreted one release
  at a time. The version comments (`v1.11`, `v1.4`, `v1.34`) at
  `modules/[id]/page.tsx:813-816, 851-853, 657-661` suggest accretion —
  **INFERRED**, not established.

---

## APPENDIX — THE TWO LINES TO PUT IN FRONT OF THE OWNER

```tsx
// src/app/(app)/[orgSlug]/dashboard/page.tsx:95
{module.name.toLowerCase().includes('outboard') || module.name.toLowerCase().includes('motor')
```

*The app decides what a module is by looking for the word "motor" in the name
the user typed.*

```tsx
// src/components/stacer-data-structure.tsx:57
const initialRanges = ['Open Boats', 'Prolines', 'Assualt Pros', …]
```

*A customer's product taxonomy — including its typo — is a constant in a
TypeScript file, and correcting the spelling requires a developer, a build and
a deploy.*
