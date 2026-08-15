# THE MODULE SYSTEM — a plan to approve before anything is built

**Status.** Proposal. Nothing here is built. No file under `src/` was changed to
write it.

**Sources.** The five studies in this folder — `hl-navigation.md`,
`hl-modules.md`, `hl-journeys.md`, `hl-admin.md`, `our-substrate.md` — plus
`docs/specs/PLATFORM_VISION.md` and `docs/audit/UX_AUDIT.md`. Every load-bearing
claim about HelmLogic or about our own code is cited `file:line`.

**How to read it.** §1–§2 are the concept and what it costs. §3–§7 are the
product. §8–§10 are the commitments. §11 is six questions only you can answer,
and three of them change the build.

---

## 1 · WHAT A MODULE IS

> A module is a **place in your business** — Boats, Trailers, Quotes, Service.
> You make one by picking the table it is about and giving it a name. It comes
> with a page that lists everything in it and a page for one item, both drawn
> from the columns and pictures you already put in the table. Then you decide
> what people are allowed to do in there — just look, or also add, edit, or
> raise a quote. What you build is what everyone else in the business walks
> into.

Precisely, a module is four things and no more:

| Part | What it is | Where it comes from |
|---|---|---|
| **Master table** | The table the module is about. Optionally more tables of the same kind, one marked primary. | An `EntityDef.id` you already have (`src/types/model.ts:466-493`) |
| **Capabilities** | The verbs a person may use here: browse, search, open, add, edit, delete, relate, quote, export, import. | §5 |
| **Layout** | Two surfaces — an INDEX (the list) and a DETAIL (one item) — each an ordered list of blocks. | §4 |
| **A place on the dashboard** | A name, a one-line description, an accent, and an order. | §3 |

The master table is a **set with a primary**, not a scalar. HelmLogic wrote that
pointer three separate times — `mainVendorId`, `trailerBrandVendorIds`,
`regoVendorIds` — and its own create form has to null one and populate another
(`modules/add/page.tsx:88-100`, `hl-modules.md` §4). One field with the right
arity absorbs every case they special-cased.

### What a module is NOT

- **Not a table.** It points at one. Two modules may point at the same table —
  that is the whole reason a table can have both a catalogue and a configurator.
- **Not a folder.** Tables do not live inside modules. Delete a module and no
  data moves.
- **Not a page.** It has up to two, and they are named, not drawn.
- **Not a permission.** It says what *can* be done in this place, not *who* may
  do it. When roles arrive, a role grants a subset of the module's capabilities;
  the module does not grow a user list. (HelmLogic put both in one bag and
  produced `can_edit_boat_data` — a marine noun frozen into a permission id,
  gating a tab that in five of nine module types has nothing to do with boats:
  `manage-organisation-page.tsx:125-142`, `hl-modules.md` §6.1.)
- **Not an app, a plugin or a code drop.** No module ships code. If a module
  needs a developer, we have rebuilt the thing we are replacing
  (`PLATFORM_VISION.md:38-42`).
- **Not an organisation or a tenant.** One project, one organisation, for now
  (§8).
- **Not a flow or a wizard.** Steps in an order with conditions is layer 3
  (`PLATFORM_VISION.md:20-29`) and is out of scope (§8).

---

## 2 · HOW IT MAPS ONTO WHAT WE ALREADY HAVE

**The ruthless answer first: a module's DETAIL layout is a view page, and we are
not building a second one.**

`ViewDef` is already a named page, about one row of one table, made of an
ordered tree of blocks, each block naming a related table, a rule for what is
related, a filter for what is shown, and a chosen column list
(`src/types/model.ts:753-783`). `ViewPage` already puts design-time and run-time
on the same screen: the gear grows handles on the drawing already in front of
you and never opens a different page (`ViewPage.tsx:252-266`, and its header
comment at `:10-16`). That is *exactly* "design the module layout, then have
users go through it", already shipping.

So `ViewDef` is not a neighbour of the module layout. **It is the module
layout, one surface short and one presentation field short.** It gets renamed
into the module and the view stage becomes the module's detail surface.

### Fate of every existing concept

| Concept | Where | Fate |
|---|---|---|
| `EntityDef` — tables | `model.ts:466-493` | **Sits beside.** A module points at tables. Tables do not move, do not gain a `moduleId`, and are not owned. |
| `ViewDef` | `model.ts:775-783` | **Absorbed.** Becomes `ModuleDef.layouts` where `surface: 'detail'`. The name retires. Existing ones migrate automatically (§9). |
| `ViewBlock` | `model.ts:753-767` | **Kept verbatim, one level down.** Becomes the payload of the `related` layout block. Its rule/filter split (`model.ts:747-752`) is the distinction a module layout would otherwise have to invent. |
| `ViewPage` / `BlockCard` / `suggest.ts` / `pairs.ts` | `src/features/views/` | **Absorbed as the detail renderer.** The drag, the offer, the refusal, the `__origin` discipline all stay where they are. |
| `viewDefs.ts` registry + `app/viewPersistence.ts` | `viewDefs.ts:24-48`, `viewPersistence.ts:47-74` | **Retired.** The store owns modules. `views/index.ts:24-33` already asked for this. |
| `QuoteDef` + `quotes.ts` registry | `quote/types.ts`, `quotes.ts:42-101` | **Absorbed.** A quote is what the `quote` capability produces; the quote list is a module whose master is the documents collection. The registry becomes a store slice, exactly as `quote/index.ts:55-72` specifies. |
| `QuotePage` / `QuoteList` / `QuoteDocument` / `freeze.ts` / `totals.ts` | `src/features/quote/` | **Sit beside, unrewritten.** The quote module mounts them. Nothing in the freeze line changes (`quote/index.ts:22-33`). |
| `ConstraintDef` — business rules | `model.ts:683-717` | **Sits beside.** Rules are about the whole organisation's data, not about one place a person stands. A module may *show* a violation; it does not own the rule. |
| `RuleDef` — the flow builder | `model.ts:903-914` | **Sits beside.** A flow decides which rows match. A module decides where a person stands. `RuleNodeKind` (`model.ts:609-618`) has no node meaning *ask a person something*, so it is not a wizard engine and must not be mistaken for one. |
| The five `LeftPanel` door props | `LeftPanel.tsx:87-111` | **Absorbed.** Doors become modules. |
| The `Stage` union | `Shell.tsx:98-103` | **Absorbed.** Five hardcoded kinds become one — a module — plus one built-in (the data model). A user-created module cannot be a TypeScript union member; this is the change that makes it possible. |
| `TableKind` | `model.ts:201-208` | **Sits beside, demoted.** It is what a table *holds*, never what a module *does*. Its only job in the module system is filtering the master picker. Keying module types off `TableKind` would inherit 183 lines of marine column names (`model.ts:254-436`) into the module layer — that is HelmLogic's nine-value `moduleType` enum with our own names on it. |
| `GroupDef` | `model.ts:495-501` | **Untouched.** A rectangle on a canvas. Not a container of meaning. |

### The three existing defects a module system multiplies, so they are fixed first

1. `replaceProject` does not clear `views` (`useProjectStore.ts:272-286`), so an
   import or demo swap leaves the previous project's pages and writes them back
   to Dexie (`viewPersistence.ts:62-73`). Already flagged from the quote side at
   `quote/index.ts:69-71`.
2. `deleteEntity` does not cascade into views (`useProjectStore.ts:433-455`).
   Delete a table and its module would point at nothing.
3. `EntityDef.priceLevels` does not exist, so `pricing.ts:175-180` resolves
   prices from an exact-name allow-list per `TableKind` — `Cash`/`Trade` on
   boats, `Sell Price` on motors — taken verbatim from the Northside workbook.
   The file says so itself. **This is the clearest live breach of "this needs to
   be dynamically driven"**, and every module that shows money would otherwise
   need its own allow-list.

All three are inside Phase 1. They are not features; they are the floor.

### Why the app already has modules and nobody noticed

There are 21 tables in the Northside seed (`src/demos/northside.ts`) and any
view page a user has made over one of them is a module minus a name, an index
and a switch. That is the argument for absorption rather than a parallel system,
and it is also the migration: **every existing `ViewDef` becomes a `ModuleDef`
on first load, with no admin work** (§9).

---

## 3 · THE ADMIN JOURNEY

The organisation and industry already exist by this point — onboarding is
unchanged. The admin has drawn tables and loaded data. What follows replaces the
current landing surface.

### Screen 1 — The dashboard, empty

The app's home. Not a stage over the canvas; the thing you see when nothing is
open. It holds the organisation name, and one card:

> **NOTHING HERE YET**
> A module is a place in your business — Boats, Trailers, Quotes.
> You have **21 tables** and no modules.
> **[ NEW MODULE ]**  ·  *or open the data model*

The count is read from the store. The second link opens the built-in data-model
module — the blueprint sheet, unchanged, still stage-over-canvas
(`Shell.tsx:198-222`). It is no longer the front door but it is one click away
and it never unmounts once opened.

**Click 1 — NEW MODULE.**

### Screen 2 — Pick the table

One panel. No type dropdown, no template gallery, no wizard. Your own tables,
grouped the way the left panel already groups them, each showing its kind mark,
its row count and whether it has pictures and prices:

```
BOATS      Stacer 26 · Stabicraft 30 · Surtees · Jeanneau · Haines Signature
           Highfield Inflatables 40 · Formosa 26
MOTORS     Yamaha Outboards 43 · ePropulsion Outboards 14
TRAILERS   REDCO / Tinka · NSM Custom · GFAB · Stacer · Dunbier · Mackay · BMT
PARTS      Parts & Accessories 26
DOCUMENTS  Quotes
```

Join tables (`role: 'join'`, `model.ts:464`) are not offered. A join is a
relationship, not a place; it appears inside a module as a related block, never
as a module of its own. `DOCUMENTS` is the one non-table master (§6.2).

**Click 2 — Highfield Inflatables.**

The name field fills in with the table's name and the description with the
table's own `description`. Below it, and only because the picked table has a
`kind`, the six other tables of that kind appear as unticked checkboxes under
one line of explanation:

> These are also boats. Tick any that belong in the same module and people will
> browse them together, brand first.

**Click 3 — CREATE.** (Ticking siblings is optional and costs one click each.)

### Screen 3 — The module, working

It opens straight into itself, in USE mode, already browsing. Nothing was
configured. What generated it:

| Part of the module | Derived from |
|---|---|
| Index rows | every row in the master table(s) |
| Row label | `EntityDef.displayFieldId` (`model.ts:487`) |
| Grouping | `EntityDef.hierarchy` — Highfield runs series ▸ model ▸ variant (`northside.ts:1026`) |
| Tile picture | the first `type: 'image'` column, index 0 (`model.ts:51-61`, `PLATFORM_VISION.md:66-69`) |
| Tile price | `EntityDef.priceLevels`, defaulted from the current allow-list on creation and thereafter editable |
| Detail sections | `EntityDef.sections`, minus any band that resolves as cost (`pricing.ts:80-114`) |
| Detail related blocks | the table's existing `ViewDef`, if it has one; otherwise none |
| Capabilities | browse · search · open. Nothing that writes. |

**A working module costs three clicks.** Everything after it is tuning, in
place, and optional.

### Screen 4 — Tuning, in place

One gear in the module's header, the same control `ViewPage` already has
(`ViewPage.tsx:252-266`). Pressing it does not navigate. It grows two things on
the page you are looking at:

- **a capability strip** — ten switches, described in §5;
- **handles on every block** — add, remove, reorder, and each block's own small
  settings.

Pressing it again subtracts them. Nothing moves position between the two modes,
which is the promise `BlockCard.tsx:1-14` already makes and keeps.

### Screen 5 — Back to the dashboard

The module is now a card: name, description, master table name, row count, and
the capability verbs as words. Cards are dragged into order. There is exactly
one place a module's description comes from — the field — because HelmLogic's
dashboard derives it by substring-matching the name the user typed
(`[orgSlug]/dashboard/page.tsx:95-98`) and therefore tells every trailer, rego
and service user they are configuring boat packages.

**Total: 3 clicks to a working module, 4 to a second one.**

---

## 4 · THE MODULE LAYOUT DESIGNER

### What went wrong in HelmLogic, exactly

`modules/[id]/templates/[templateId]/page.tsx` is a 1,232-line WYSIWYG document
designer: zoomable canvas, A4 pages, millimetre header and footer heights,
nested grid slots, a properties inspector. **Nothing reads its output.** A
repo-wide search finds three consumers — the designer, its create dialog, and a
list — and no renderer. Its git history is 35 commits, every one dated
2026-03-09, then untouched through five months and thirty versions; the commit
messages are verbatim user complaints ending in four consecutive runtime errors
(`hl-admin.md` §3).

The cause is not the bugs. **Its binding vocabulary is nine hardcoded strings in
a literal array inside the render function** (`:665-675`) while its canvas was
infinitely flexible. A dynamic design surface over a static data vocabulary
cannot express a document about a dealer-defined catalogue, so it could never
have shipped even debugged.

### The seven rules that follow

1. **The renderer ships before the designer.** Phase 1 draws modules from
   generated layouts with no designer at all. Phase 2 lets an admin edit
   something that already draws. A designer whose output nothing reads consumes
   admin effort and produces nothing.
2. **Never hand-write the binding list.** Every block binds to *the admin's own
   columns*, read from `FieldDef` (`model.ts:93-109`), with type. This is the
   mistake that killed theirs and the one we are best placed not to repeat.
3. **Surfaces, not a canvas.** There are two named screens and an ordered list
   of blocks on each. No x/y, no millimetres, no zoom, no fonts, no colours, no
   page geometry. HelmLogic spent print-shop complexity before a single block
   rendered.
4. **Every block has a typed payload.** Theirs was `content: any`, so no
   renderer could be written against it safely.
5. **Bound vs unmapped is visible on the page.** Their one genuinely good idea
   (`:171`, `:195`, `:244`): a bound block wears a badge, an unbound one renders
   `{UNMAPPED_VARIABLE}`. A block pointing at a deleted column must say so where
   it stands, not fail silently.
6. **A module works before it is designed.** Creation generates both layouts
   from the table. The designer is therefore mostly used to *subtract and
   reorder*, which is a far easier job than authoring from blank.
7. **Design-time and run-time are the same screen.** Already true of `ViewPage`;
   the module inherits it rather than reinventing it.

### The block vocabulary

Six kinds, and the surface each may sit on. Small enough to fit on the gear
strip, and each earns its place by being something the seeded data already
demands.

| Block | Surface | What it draws | Why it earns its place |
|---|---|---|---|
| **Index** | index | The master table's rows, as rows or tiles, grouped by the table's own `hierarchy`, with chosen columns and filters | The one genuinely new renderer. A catalogue *is* an index, and we have none — `ViewPage` requires a `rowId` (`ViewPage.tsx:47-50`) and the closest thing is a 120-row capped rail in the shell (`ViewStage.tsx:48,97-98`). |
| **Detail** | detail | One row's own columns, band by band, from `ColumnSection` | Free: `sections` already exist, are named, ordered and collapsible (`model.ts:85-91`). Its one setting is *which* bands — which is how `Cost Build` and `Margin` stay off a salesperson's screen. |
| **Related** | detail | A related table — "the motors that fit this boat" | This is `ViewBlock` unchanged (`model.ts:753-767`). It carries the rule/filter split, the join, the curation and the `__origin` audit. Building it again would be the fifth-editor mistake, committed by us. |
| **Pictures** | both | An image column, index 0 primary | `ImageRef` was built for this and says so (`model.ts:51-61`, `PLATFORM_VISION.md:66-74`). A catalogue without pictures is a spreadsheet. |
| **Price** | both | The rungs from `EntityDef.priceLevels`, at the module's chosen level | The reason the app exists, and the block that forces `priceLevels` to become data instead of an allow-list in `pricing.ts`. |
| **Note** | both | One paragraph of text the admin writes. No styling. | Every real page needs a sentence of guidance, and without a place for it admins put it in a column name. Deliberately capped at one paragraph so it cannot become a page builder through the back door. |

Blocks are added from a list, removed with a handle, and reordered by drag —
the two gestures `ViewPage.tsx:203-213` and `:395-451` already implement.

**Not in the vocabulary, deliberately:** free text with formatting, images that
are not a column, charts, embeds, columns/grids/nesting of blocks, tabs, and
anything positioned. Each one is a door to the thing nobody can use.

---

## 5 · CAPABILITIES

"Define what can be done within that module" is ten switches on the module.

| Capability | What turning it on does | Default |
|---|---|---|
| `browse` | The index surface exists at all | **on** |
| `search` | A field over the index matching `displayFieldId`; every result opens | **on** |
| `open` | A row opens its detail surface | **on** |
| `add` | A NEW button on the index; a blank row in the master table | off |
| `edit` | Detail cells accept typing; writes to `RowData` | off |
| `delete` | A row can be removed, with the same confirm the sheet uses | off |
| `relate` | Pin and unpin rows inside related blocks; writes `__origin` to the join (`model.ts:790-795`) | off |
| `quote` | "Quote this one" on the detail surface; calls `createQuoteFromView` (`quote/index.ts:9`) | off |
| `export` | The index's rows leave as a file | off |
| `import` | Rows arrive from a file into the master table | off |

Three properties of that list matter more than its contents.

**They are verbs about rows, not nouns about boats.** `edit` — not
`can_edit_boat_data`. What the rows are called comes from the table, so the same
capability works in a marine catalogue, a pharmacy and a plant hire yard.

**Everything that writes is off by default.** A new module is a place to look.
Turning on `edit` is a deliberate act with a visible consequence, which is the
design-then-use grain the whole product is for.

**A capability that cannot be turned on says what is missing.** `quote` is
refused, in a sentence, when the master table has no resolvable `priceLevels`:
*"Nothing on this table is marked as a price. Set price columns on Highfield
Inflatables first."* That is `ConstraintDef.because` (`model.ts:683-717`) — the
reason written at the moment of the decision — applied to capabilities. It is
the difference between our system and eleven checkboxes of which four have zero
consumers (`hl-navigation.md`, on `can_access_price_book`,
`can_approve_suggestions`, `can_create_quotes`, `can_access_module`).

### How this interacts with roles

**There are no roles.** A grep of `src/` for `permission|userRole|isAdmin|currentUser|auth`
returns one hit, in a comment about a SharePoint URL (`lib/imageSources.ts:17`).
So in this plan:

- Capabilities are **module-wide**. Everyone using this browser sees the same
  module with the same verbs.
- "Admin" and "user" are **two modes of one person**: the gear is off (USE) or
  on (DESIGN). That is honest about what exists, and it is what
  `ViewPage.tsx:72` already is — a `useState`.
- The forward compatibility is deliberate: because a capability is a per-module
  verb, granting a role a subset later is `Record<roleId, ModuleCapability[]>`
  and touches nothing built here. That is the exact thing HelmLogic cannot do —
  its eleven flags are org-wide and role-keyed, never per-module, so *"Sam can
  edit Yamaha but only read Highfield"* is unsayable (`hl-modules.md` §6.1).

When roles arrive, the DESIGN gear becomes a capability like any other.

---

## 6 · THE TWO WORKED MODULES

Specified against the real seed: 21 tables, 651 rows, from
`src/demos/northside.ts`.

### 6.1 The CATALOG module — "Boats"

| | |
|---|---|
| **Name** | Boats |
| **Master** | `boat_highfield` (primary) + `boat_stacer`, `boat_stabicraft`, `boat_surtees`, `boat_jeanneau`, `boat_haines`, `boat_formosa` |
| **Capabilities** | browse · search · open · relate · quote. **Not** add/edit/delete — the sheet is where data changes. |
| **Index blocks** | Index (tiles) · Note |
| **Detail blocks** | Pictures · Price · Detail · Related ×3 · Note |

**Why one module over seven tables and not seven modules.** The tables are
per-brand because the workbook is per-brand — the same physical column means a
different thing under each yellow banner (`northside.ts:665`) — and that
decision is right at the table layer. Repeating it at the module layer produces
seven near-identical modules, which is precisely HelmLogic's five near-identical
per-brand editors moved one floor up: 2,026 lines whose entire meaningful
difference is a display name and a starting list (`hl-modules.md` §5.1). The
index groups by table first, so a salesperson sees `HIGHFIELD ▸ Sport ▸ SP460 ▸
variants` and `STACER ▸ Open Boats ▸ …` in one place, and each brand keeps its
own columns.

**The index.** Tiles. Group by source table, then by that table's own
`hierarchy` — three levels for Highfield (`series/model/variant`), two for
Stacer (`series/c`), none for Formosa (`levels: []`, `northside.ts:1121`). The
depth adapting per table is not a nicety: HelmLogic's own modules run 4, 3, 2
and 1 level deep and each got a hand-written screen (`hl-modules.md` §3.2).
Tile face: primary image, `displayFieldId`, and the `cash` rung. Search matches
the display column. Nothing invented — a tile with no image shows the row label
and says nothing about a picture.

**The detail.** Pictures, then Price, then Detail showing `Identity`,
`Capacity`, `Construction`, `Motor Envelope`, `Hull Only Pricing`, `Source` —
and **not** `Cost Build`, which is the dealer's buy price and has no business on
a screen a customer can see over a shoulder. Then three Related blocks, each an
existing `ViewBlock`:

| Related block | Table | Join | What the join carries |
|---|---|---|---|
| Motors that fit | `mot_yamaha` | `join_hf_yam` | rigging kit, prop part number, prop description, engine hole — facts about *that motor on that hull* and on no base table (`northside.ts:1839`) |
| Trailers that fit | `trl_nsmcustom` | `join_hf_trl` | the ten trailer slots off the Highfield rows |
| Parts & accessories | `parts` | none — rule | 26 parts under the six category banners the seeded hulls name |

**The end-user journey.** Dashboard → **Boats** → tiles, grouped by brand →
type "SP460" or open `HIGHFIELD ▸ Sport` → tile → detail page with pictures,
price, spec bands, and three lists of what goes with it → **Quote this one**.

**One honest defect this module inherits, already recorded.** The seeded joins
declare their own `Recommended` and `Slot` columns with fresh ids rather than
`__recommended` / `__order`, so `readPairs` returns `recommended: false` for
every row of the real seed (`quote/index.ts:73-87`). The Related blocks
therefore open with nothing pre-ticked and the workbook's own recommended motor
never stars. The fix is in the seed, not the contract, and it belongs in Phase 1
because a catalogue that silently drops the recommendation is worse than a quote
that does.

### 6.2 The QUOTE module — "Quotes"

| | |
|---|---|
| **Name** | Quotes |
| **Master** | `{ kind: 'documents' }` — the quotes collection, not a table |
| **Capabilities** | browse · search · open · edit (drafts only) · delete (drafts only) · export. **Not** `add` — see below. |
| **Index blocks** | Index (rows) |
| **Detail blocks** | fixed in Phase 1 — `QuotePage` as it stands |

**Why the master is not a table, and why that is not a special case.** A
`QuoteDef` carries frozen lines, each with a number, the column it came from,
the level it was read at and the join row's own facts, all by value
(`quote/types.ts` header). A flat `RowData` cannot hold that without lying about
it. Rather than bend one to fit the other, the module's master is allowed to be
a **documents collection** — which is exactly the arity HelmLogic needed and did
not have: its `service` module's master is `serviceQuotes`, a transaction
collection, and a system that assumes "master table = product catalogue" cannot
express it (`hl-modules.md` §3.2).

**Why `add` is off.** A quote is minted from a row of a catalogue — that is what
`createQuoteFromView(viewId, rowId)` does and it is the only path that produces
a document with a subject (`quote/index.ts:9`, `freeze.ts:305`). A blank quote
with no subject is a form, and HelmLogic's is five free-text customer fields in
a flow with zero draft persistence (`hl-journeys.md` §3.4). If a salesperson must
be able to start from nothing and pick a boat later, that is Open Question 4 and
it changes the build.

**Why the detail is not designable in Phase 1.** The quote document is a frozen
record with one summation (`totals.ts`) and a hard exclusion keeping buy prices
off it (`pricing.ts:80-114`). Making it designable means an admin can design a
document that omits a total or exposes cost. That is a real feature and it is
Phase 4 at the earliest. Stated so its absence reads as a decision.

**What the index does add.** Today the quote list is a door in the left panel
drawn only when the count is above zero (`LeftPanel.tsx:106-110`). As a module
index it gets the same search, grouping and column choice as any other index:
find by reference, by customer, by subject boat, by state. That is worth having
on its own.

**The end-user journey.** Dashboard → **Quotes** → a searchable list of every
document, draft and issued → open one → the document as it is today. Or arrive
here from the Boats module, having just made one.

---

## 7 · THE END-USER JOURNEY

A salesperson, on a machine where an admin has built the two modules above. No
gear is visible to them because it is off.

1. **Land on the dashboard.** Two cards: *Boats — 7 brands* and *Quotes*, each
   with its live row and document count. Plus the data-model card if the admin
   left it visible.
2. **Open Boats.** Tiles, grouped by brand, pictures and cash prices on the
   faces. Nothing is below the fold that matters, and there is a search field —
   which the app does not have anywhere today, and the audit's second-worst
   finding is exactly that: *"You cannot ask the app for a boat by name"* with
   21 tables and 651 rows loaded (`docs/audit/UX_AUDIT.md:96`).
3. **Find the boat.** Type `SP460`, or walk `HIGHFIELD ▸ Sport`. One click on a
   tile.
4. **Read the boat.** Pictures, price, spec bands. No cost band. The columns are
   whatever the admin put in the table, in the bands the admin named.
5. **Build the rig.** Three lists underneath: motors that fit, trailers that
   fit, parts. Each row shows the join's own facts — slot, rigging kit, prop —
   so the choice is made on stated evidence. Ticking is `relate`; if the admin
   left `relate` off, the lists are read-only and the picking happens in the
   quote instead.
6. **Quote this one.** A draft exists from that click. Not autosaved as a
   nicety: HelmLogic's quote flow has no draft persistence at all — no
   `localStorage`, no autosave, seven wizard steps that die with the tab
   (`hl-journeys.md` §3.4) — and it is the worst thing in its journey.
7. **Adjust.** The existing editor: level, quantities, overrides, adjustments,
   free lines. Every number carries the column and rung it was read from.
8. **Issue.** The document freezes. `quotes.ts:175-179` refuses every edit to an
   issued record — one place, enforced.
9. **Find it again.** Dashboard → Quotes → search the customer's name.

Steps 1, 2, 3 and 9 do not exist today in any form. Steps 4–8 exist and are
good; the module system is what puts a front door on them.

---

## 8 · WHAT WE ARE NOT BUILDING

Named so their absence reads as a decision and not an oversight.

| Not building | Why |
|---|---|
| **Roles and permissions** | There is no user in `src/` at all. Capabilities are the forward-compatible seat (§5); inventing a user, a session and a role table to switch ten booleans would be the largest new subsystem in the plan and would be built against nobody. |
| **Multi-tenancy** | `ProjectMeta.id` is the literal `'default'` (`model.ts:921`) and `repository.ts:37` reads `db.meta.get('default')`. One project, one organisation. Modules hang off it. |
| **A real backend** | `ProjectRepository` (`repository.ts:22-26`) stays the seam. Nothing in the module system reaches past it. |
| **The flow designer** | `PLATFORM_VISION.md:20-29` layer 3 — steps, order, conditions, drag-and-drop. `RuleNodeKind` has no node meaning "ask a person something" (`model.ts:609-618`), so this is a new engine, not an extension. The quote's existing editor is the flow for now. |
| **A designable quote document** | §6.2. A designed document can omit a total or expose cost. |
| **A page builder** | No positioning, no typography, no colour, no page geometry, no nesting. §4, rule 3. |
| **Deep links / URLs** | There is no router (`Shell.tsx:4-6`). A module a person is *sent* into needs an address, and `UID_FIELD` was built to be one (`model.ts:955-967`). Named as a real cost, deferred because a dashboard of cards is navigable without it. |
| **Email, PDF, sharing** | Already excluded by `QUOTE_SPEC §7` (`quote/index.ts:89-96`). Unchanged. |
| **Module templates / a starter gallery** | A module is three clicks. A gallery of pre-built ones would be marine-shaped by the second entry. |
| **Cross-module search** | Search belongs to the module that owns the data. HelmLogic's one global search is unlinked, covers no products, and its result rows are non-clickable `<div>`s (`hl-journeys.md` §2.2). |

---

## 9 · CONTRACT ADDITIONS

All in `src/types/model.ts`. Named, minimal, and additive.

```ts
/* --- capabilities --------------------------------------------- */
export type ModuleCapability =
  | 'browse' | 'search' | 'open' | 'add' | 'edit'
  | 'delete' | 'relate' | 'quote' | 'export' | 'import'

/* --- what a module is about ----------------------------------- */
export type ModuleMaster =
  | { kind: 'table'; entityId: string; alsoEntityIds?: string[] }
  | { kind: 'documents' }

/* --- layout --------------------------------------------------- */
export type LayoutSurface = 'index' | 'detail'

export type LayoutBlock =
  | { id: string; kind: 'index'; shape: 'rows' | 'tiles'
      groupBy?: string[]; columns?: string[]; filters?: ColumnFilter[] }
  | { id: string; kind: 'detail'; sectionIds?: string[] }
  | { id: string; kind: 'related'; block: ViewBlock }   // unchanged type
  | { id: string; kind: 'pictures'; fieldId?: string }
  | { id: string; kind: 'price'; levelKeys?: string[] }
  | { id: string; kind: 'note'; text: string }

export interface ModuleLayout {
  surface: LayoutSurface
  blocks: LayoutBlock[]
}

/* --- the module ----------------------------------------------- */
export interface ModuleDef {
  id: string
  name: string
  description?: string
  accent: AccentKey
  master: ModuleMaster
  capabilities: ModuleCapability[]
  layouts: ModuleLayout[]
  /** position on the dashboard */
  order: number
  createdAt: string
  updatedAt: string
}
```

Plus three additive fields on existing types, every one optional with a
documented default — which is the only migration this app has
(`our-substrate.md` §4):

| Addition | Type | Absent means |
|---|---|---|
| `EntityDef.priceLevels?` | `PriceLevel[]` | fall back to `pricing.ts`'s allow-list, exactly as today (`pricing.ts:175-180`). Already requested at `quote/index.ts:44-53`. |
| `OrgProfile.id?` | `string` | keep keying on the lower-cased name, as `constraintDefs.ts:39-40` is forced to today |
| `ProjectExport.modules?` / `.views?` / `.quotes?` / `.constraints?` | arrays | version 1 file: "valid, none of those" |

And two types move, unchanged, from `src/features/quote/types.ts` into
`model.ts`: `PriceLevel` and `QuoteDef` and their satellites. The file was
written to be moved verbatim and says so (`quote/types.ts:1-12`,
`quote/index.ts:38-42`). Cost: one import path.

### Migration

**Dexie.** `db.version(3)` adds three stores — `modules`, `quotes`,
`constraints` — and carries the existing six forward untouched, which is what
`database.ts:32-39` already documents about v2. The `views` store stays declared
and stops being written.

**Existing project in a browser.** On `init`, the store reads `views` as it does
today, then converts each `ViewDef` to a `ModuleDef`: master = its
`rootTableId`, name = the table's name, capabilities = browse/search/open/quote,
detail layout = its blocks wrapped as `related`, index layout = generated. The
next debounced save writes the modules and never writes `views` again. The
accommodation is a `?? []` in `init` with a comment naming it, exactly as
`useProjectStore.ts:238-240` already does for views themselves. **No admin sees
a migration screen and no page they designed is lost.**

**Existing project file on disk.** `EXPORT_VERSION` goes to `2`
(`model.ts:931`). A version-1 file never carried views, constraints or quotes at
all (`model.ts:933-943`), so it imports as "valid, no modules" and the user gets
the same generated defaults a new module gets. A version-2 file carries all four
collections. This is the exact accommodation `quote/index.ts:60-64` specifies.

**Cost of the whole contract change**, measured against what adding `views`
actually touched: four files, about ten sites, one Dexie version bump
(`our-substrate.md` §3) — times three collections, plus the two forgotten sites
(`replaceProject`, `ProjectExport`) which this plan fixes rather than repeats.

---

## 10 · PHASING

Four phases. Each ends somewhere you can open and use.

### Phase 1 — The dashboard, and modules you can browse
**~2 weeks.**

The floor first: `replaceProject` clears every collection, `deleteEntity`
cascades, `EntityDef.priceLevels` lands with an editor on the table, the seed
emits `__recommended` / `__order`. Then: the `modules` slice, Dexie v3, the
`ModuleDef` contract, the three-click create flow, the **Index renderer** (rows
and tiles, grouped by `hierarchy`, with pictures, price and search), the detail
surface as today's `ViewPage` with a Detail block added, and the dashboard as
the app's home with the blueprint sheet as a built-in module.

**You can see:** an empty dashboard, three clicks, and a browsable, searchable,
priced, pictured catalogue of every seeded boat across all seven brands. No
designer yet — every layout is generated.

### Phase 2 — The designer and the switches
**~2 weeks.**

The gear on a module: the capability strip with its ten switches and its refusal
sentences; block add / remove / reorder on both surfaces; per-block settings
(which columns, which sections, which image column, which rungs, filters); the
bound/unmapped badge; the Note block. `add`/`edit`/`delete` become real against
the master table.

**You can see:** an admin taking `Cost Build` off the salesperson's screen,
turning the index from rows to tiles, adding "Parts that fit" to the detail, and
switching `edit` on for the parts module and off for boats — all without a
developer.

### Phase 3 — The quote module, end to end
**~1.5 weeks.**

The `quotes` slice replacing the localStorage registry; the `constraints` slice
with it, since it is the same recipe and `resetProject` is currently broken by
its absence (`constraints/index.ts:62-66`); `OrgProfile.id`; the documents
master; the quote index with search; `quote` as a capability wired to
`createQuoteFromView`.

**You can see:** the full journey of §7 — dashboard, catalogue, boat, rig,
quote, document, and find it again by the customer's name tomorrow.

### Phase 4 — Travel and repair
**~1 week.**

`EXPORT_VERSION 2` carrying modules, views, quotes and constraints; import
round-trip; `export`/`import` as real module capabilities; the deferred audit
fixes a module system rubs against (the panel scroll, the example-data chip).

**You can see:** a module designed on one machine opened on another. Today no
piece of design work anybody does can leave the browser it was made in
(`grep views src/features/io/` → nothing).

### The riskiest phase

**Phase 1**, and not for the reason it looks like.

The renderer is ordinary work. The risk is that Phase 1 moves the front door.
The stage-over-a-never-unmounted-canvas pattern is defended by comments in five
files (`Shell.tsx:44-56,198-222`) and buys instant close, React Flow zoom
retention and scroll continuity. Making the dashboard the home puts the sheet
inside a module, and every stage's back button currently says *"Back to the
sheet"* (`ViewStage.tsx:103`, `DesignStage.tsx:55`, `RulesStage.tsx:36`,
`QuoteStage.tsx:83`). It is the one decision in this plan that is expensive to
reverse, and it is the subject of Open Question 1.

Phase 2 is the phase most likely to be *abandoned* rather than to break — it is
the phase HelmLogic died in. The mitigation is structural and already in the
plan: Phase 1 ships the renderer, so Phase 2's designer edits a page that
already draws, and a module that is never designed still works.

---

## 11 · OPEN QUESTIONS

1. **Is the dashboard the home, or another door?** This plan assumes the
   dashboard replaces the blueprint sheet as the landing surface and the sheet
   becomes a built-in module. The alternative is a sixth door in the left panel,
   which is nearly free to build and gives the app two competing navigations —
   and the panel already spends 371 of 744 vertical pixels on a table-type
   palette, with **0 of 21 tables showing both their doors at 1280×800**
   (`docs/audit/information-architecture.md` IA-1, IA-2). *Changes Phase 1
   entirely.*

2. **One "Boats" module over seven brand tables, or seven brand modules?** This
   plan says one, grouped by brand, because seven is HelmLogic's per-brand
   editor mistake one floor up. If your dealers think of Highfield and Stacer as
   genuinely separate places with separate people, seven is the right answer and
   the master becomes a scalar again. *Changes the index renderer and the master
   field's arity.*

3. **Can end users change data inside a module, or is the sheet the only place
   data changes?** This plan ships `add`/`edit`/`delete` as switches but defaults
   them off and turns none of them on in the worked examples. If a salesperson
   must be able to correct a price from the catalogue page, that surface needs
   the same undo story the sheet does not have yet (`UX_AUDIT.md` item 7).
   *Changes Phase 2's size.*

4. **Must a quote be able to start from nothing?** This plan says a quote is
   always minted from a row of a catalogue, so it always has a subject. If a
   salesperson takes a phone call and starts a quote before knowing the boat,
   the quote module needs `add`, a blank-subject state, and a picker screen.
   *Changes Phase 3.*

5. **Roles now, or later?** This plan says later, and makes capabilities
   module-wide so roles are additive when they come. Saying "now" means building
   users, sessions and a role table before the first module renders — a
   subsystem larger than everything in Phase 1. *Changes the order of everything.*

6. **Must a module design travel between organisations in the first release?**
   This plan puts export/import in Phase 4. If the point is that one dealer's
   Boats module is sold to the next dealer, that moves to Phase 1 and the
   contract needs to be right on the first write rather than the fourth.

---

*Written for review. No code was changed; nothing under `src/` was touched; and
nothing under `C:/Users/AsafA/HelmLogic` was written, moved or run.*
