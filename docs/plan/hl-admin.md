# HL-ADMIN — what an admin can already change without a developer

Lens: **configuration surfaces in production HelmLogic**. Every claim below was
read in `C:/Users/AsafA/HelmLogic` (read-only) and is cited `file:line`. Nothing
was run, nothing was signed into, nothing was written. Where I could not
determine something it says **not determined**. Where I reason beyond the code
it says **INFERRED**.

The headline: **HelmLogic already has a `modules` collection an admin creates
from a form. It is not the thing the owner is asking for, and the gap is
larger than the word "modules" makes it look.**

---

## 0. The two admin tiers, and who they are

There are exactly two authorities, and they are not the same person.

| Tier | Test | Reaches |
|---|---|---|
| **Platform admin** | `users/{uid}.appRole === 'HelmLogic Admin'` — a hardcoded string compare (`src/components/admin-guard.tsx:46`, `:56`) | `/admin`, `/organisations`, `/modules`, `/data-warehouse`. Creates modules, creates orgs, creates the WYSIWYG templates. |
| **Org admin** | `organisations/{orgId}.permissions[roleId].can_access_settings` (`src/app/(app)/manage/page.tsx:59`) | `/manage` — 8–9 tabs of org config. Cannot create a module. |

`AdminGuard` has no permission granularity at all: one boolean, one string, no
role, no scope. Everything under `/modules` and `/organisations` is gated by it
(`src/app/(app)/modules/add/page.tsx:131`, `src/app/(app)/modules/page.tsx:83`).

**So: the person the owner calls "the admin" — a dealership operator — cannot
create a module today.** Only a HelmLogic staff member can.

---

## 1. The `modules` collection — the closest existing thing, measured

### What creating a module actually asks for

`src/app/(app)/modules/add/page.tsx:40-44` — the entire form schema:

```ts
name: z.string().min(1),
mainVendorId: z.string().default(''),
associatedVendorIds: z.array(z.string()).default([]),
```

Plus a `moduleType` held in local state (`:49`) chosen from a **fixed list of
nine** (`:175-183`):

`catalog` · `used-boats` · `website-listings` · `master-price-file` ·
`motor-brand` · `trailers` · `rego` · `fit-up` · `service`

Written to `modules/{id}` as `{name, slug, moduleType, mainVendorId,
associatedVendorIds, logoUrl}` (`:79-86`), plus two type-specific extras
hardcoded in the submit handler (`:88-100`).

So a module is: **a name, a type from a closed enum, and pointers to vendors.**
That is the whole authored surface.

### What the module type then decides

`moduleType` is read once (`src/app/(app)/modules/[id]/page.tsx:617`) and then
drives an if-chain of seven early returns, each of which is a *different
hardcoded page*:

| line | type | renders |
|---|---|---|
| `:620` | `master-price-file` | `MasterPriceFileWorkspace` |
| `:667` | `motor-brand` | `YamahaMotorWorkspace` |
| `:728` | `trailers` | `TrailersWorkspace` |
| `:774` | `rego` | `RegoWorkspace` |
| `:817` | `fit-up` | `FitUpCatalogManager` |
| `:854` | `service` | `ServiceQuoteDashboard` |
| `:887` | anything else non-catalog | a placeholder page with "Coming soon" cards (`:960-988`) |
| fall-through | `catalog` | the 5-tab boat workspace |

`used-boats` and `website-listings` are selectable in the create form and render
two literal *"Coming soon"* cards each (`:964-987`). An admin can create a module
type that does nothing.

**The name "module" in HelmLogic means "which of seven hardcoded screens do I
open".** It is a router key, not a definition.

### The tabs inside a module are also code

`src/app/(app)/modules/[id]/page.tsx:1299-1305`:

```ts
const navTabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'bmt',       label: 'Catalog' },
  { id: 'stock',     label: 'Stock Management', visible: (isAdmin || can_view_stock || can_manage_stock) },
  { id: 'pricing',   label: 'Pricing',          visible: (isAdmin || can_access_pricing_manager) },
  { id: 'settings',  label: 'Settings' },
].filter(t => t.visible !== false);
```

Five tabs, fixed labels, fixed order. The only configuration is *permission
visibility on two of them*. There is **no surface anywhere that lets an admin
add, remove, rename or reorder a module's tabs.** That is the owner's
"define what can be done within that module", and it does not exist.

### The Settings tab — the one genuinely shared, genuinely data-driven piece

`src/components/module-settings-panel.tsx` is the best-built thing in this area
and its own header comment (`:3-18`) states the card set:

1. Module image (`ModuleImageEditor`)
2. caller-injected `preCards`
3. **Associated Vendors** — toggle which `data-warehouse` vendors this module can pull from (`:173-316`)
4. **Associated Modules** — toggle which *other modules* this one pulls from (`:322-473`)
5. Module Dealer Fit Categories
6. Sub Dealers — which sub-dealer orgs see this module (`:480-579`)
7. Module Role Assignment — Brand Captain + Module Manager

Card 4 is the interesting one. Its own description (`:379`):

> *"Other modules this one pulls from. Link the Trailer module to a boat module,
> and every trailer brand + dealer-fit category on the trailer module becomes
> available on the boat module's quote flow automatically."*

That is **an admin-authored, runtime, module-to-module relationship** — the
single closest existing analogue to our join tables. It is a flat
`associatedModuleIds: string[]` on the module doc (`:356-358`) with no type, no
direction, no cardinality and no per-relationship configuration. It says
"related", nothing more.

### Where modules appear to a user

Not in the nav. `src/lib/nav-links.ts` is a hardcoded `NavLink[]` array of 7
top-level entries; modules are not among them. Users reach modules from the
org dashboard, which renders one tile per module in
`organisation.enabledModuleSubscriptions`
(`src/app/(app)/[orgSlug]/dashboard/page.tsx:135`, `:141`).

Tile order is a **per-user** drag order persisted to
`users/{uid}.moduleOrder` (`:142-153`, `:160-174`). Not an admin setting —
each salesperson arranges their own tiles.

And the tile's own subtitle, `:95-98`:

```ts
{module.name.toLowerCase().includes('outboard') || module.name.toLowerCase().includes('motor')
  ? "Manage engine technical specs, factory rigging, and propellers."
  : "Configure boat packages, BMT options, and generate sales quotes."}
```

**The description of an admin-created module is derived by substring-matching
its name against two marine words.** Name a module "Yamaha Repower" and it
tells the user it configures boat packages. This is the single clearest example
in the codebase of what "not dynamically driven" costs.

---

## 2. Full inventory of configuration surfaces

Everything read from the database rather than compiled in. Grouped by grain.

### 2.1 Platform grain (HelmLogic Admin only)

| Surface | Collection | What changes | Affects |
|---|---|---|---|
| Add / rename / delete module | `modules/{id}` | name, type, main + associated vendors, logo | which of 7 screens exists, and its tile |
| Add vendor | `data-warehouse/{id}` | name, `vendorType` from a fixed 9-value enum (`src/app/(app)/data-warehouse/add/page.tsx:182-190`), logo, feed type | vendor pickers everywhere |
| Dealer-fit categories | `dealerFitCategories/{id}` | global category list, name only (`src/app/(app)/modules/dealer-fit-options/page.tsx:44-75`) | dealer-fit grouping, org allowlists |
| Organisation | `organisations/{id}` | see 2.2 | everything org-scoped |
| Module ↔ org access | `organisations/{id}.enabledModuleSubscriptions` | which modules an org sees (`src/components/manage-organisation-page.tsx:892+`) | dashboard tiles |
| Per-org vendor access inside a module | `organisations/{id}.moduleAssociatedVendorAccess: Record<moduleId, vendorId[]>` (`src/app/(app)/organisations/[id]/page.tsx:83`) | narrows a module's vendors per org | pickers in that module |
| **WYSIWYG document templates** | `organisations/{orgId}/templates/{id}` | see §3 | **nothing** |

### 2.2 Organisation grain (`/manage`, gated on `can_access_settings`)

Tabs, `src/components/manage-organisation-page.tsx:538-548`:
Company Details · Users & Permissions · Document Templates · Integrations ·
Margins · Modules · Fit-Up Catalog · Service Catalog · (Sub Dealers).

| Surface | Stored | What changes | Affects |
|---|---|---|---|
| Company details | `organisations/{id}` | name, shortCode, address, phone, ABN, **primary/accent/secondary hex colours**, two logos, trading currency, GST % (`src/app/(app)/organisations/[id]/page.tsx:60-86`) | PDF branding, headers |
| **Roles** | `organisation.roles[]` `{id, name, parent}` (`:55-58`) | admin-created, named, hierarchical | role picker, permission matrix rows, org chart |
| **Permissions** | `organisation.permissions[roleId][permId]` | checkbox matrix | see below |
| Users | `users/{uid}` | create user, assign role | access |
| Content blocks | `organisations/{id}/contentBlocks/*` | see §5 | customer PDF |
| PDF section order | `organisations/{id}/pdfStructure/{docType}` | see §5 | customer PDF order |
| Email templates | `organisations/{id}/emailTemplates/*` | subject + body with `{{merge}}` tokens, per templateType, one default (`src/components/email-template-manager.tsx`) | Send Quote email |
| Document defaults | `organisation.documentDefaults` | default deposit %/$, payment schedule milestones, quote validity days (`src/components/document-defaults-card.tsx:3-17`) | new quotes + contracts |
| Margin threshold | `organisation.marginThresholdPct` | one number, default 15 (`src/components/margin-threshold-card.tsx:1-9`) | finalize-quote gate |
| **Customer defaults** | `organisation.customerDefaults` | **the "how did you hear about us" source list AND the pipeline kanban column names** (`src/components/customer-defaults-card.tsx:1-18`) | customer dialog, pipeline board |
| SharePoint | `organisations/{id}/sharePointConfig/default` | four public identifiers + enabled toggle; secret stays in env (`src/components/sharepoint-config-editor.tsx:3-16`) | sync |
| Fit-up catalog | `organisations/{id}/fitUpItems`, `fitUpPackages` | name/tier/cost/sell, CSV upsert, bulk markup (`src/components/fit-up-catalog-manager.tsx:3-30`) | fit-up quote step |
| **Fit-up classification rules** | `organisations/{id}/fitUpClassificationRules` | see §6 — the one real rule editor | suggested fit-up tier |
| Service catalog | `serviceOperations`, `serviceParts` | labour codes + parts, CSV upsert | service quotes |
| Rigging kits / Suppliers / Pricing matrix / Freight config / Engine service schedules / Exchange rates / Price lists | 7 more org subcollections | MPF-imported reference data, mostly read-mostly with a few editable fields | pricing chain |
| **Model overrides** | `organisations/{id}/modelOverrides/{modelId}` | an org's private edit of a master model — same editor, different write target (`src/components/model-configuration-editor.tsx:255-277`) | that org's catalogue + quotes |

28 subcollections hang off `organisations/{orgId}` in `firestore.rules`
(lines 265–485). That is the true size of the org config surface.

### 2.3 The permission list is code, not data

`src/components/manage-organisation-page.tsx:124-142` — eleven ids, fixed:

```
can_access_module · can_access_pricing_manager · can_create_quotes ·
can_edit_boat_data · can_view_subdealers · can_access_price_book ·
can_access_settings · can_manage_stock · can_view_stock ·
can_override_margin · can_approve_suggestions
```

**Roles are data. Permissions are code.** An admin can invent the role "Yard
Manager" but cannot invent a thing that role is or isn't allowed to do. And
`can_edit_boat_data` is a permission whose *name* hardcodes the industry.

A twelfth key, `can_view_margin`, is read by
`src/lib/catalog/v126-features.ts:41` and appears in **no** admin UI — the
permission exists in code and can never be turned on from the app. (The
function that reads it, `canSeeMargin`, is imported by nothing outside its own
unit test — `v126-features.ts`, `v127-v128-features.ts` and `v2-platform.ts` are
three whole "feature" libraries imported only by `tests/`.)

### 2.4 What is NOT configurable anywhere

- **Navigation.** `src/lib/nav-links.ts` — a `const navLinks: NavLink[]`. `/admin`'s own tiles are literally `navLinks.find(l => l.label === 'Admin')?.subLinks` (`src/app/(app)/admin/page.tsx:9`).
- **The quote flow.** `src/components/highfield-quote-flow.tsx:186-196`:
  ```ts
  const STEPS: Step[] = [
    {id:1,'Boat Base'}, {id:2,'Factory Options'}, {id:3,'Motor'}, {id:4,'Trailer'},
    {id:5,'Dealer Fit'}, {id:6,'Administration'}, {id:7,'Summary'},
  ];
  ```
  Seven steps, marine nouns, with skip logic written as arithmetic on the step
  number (`:1722` — `currentStep === 3 && !hasTrailer ? 5 : currentStep + 1`).
  A second array `MOTOR_ONLY_STEPS` (`:202`) exists because a variant flow was
  needed and there was no other way to express it. **Zero admin control over
  the flow the owner most wants designed.**
- **Which columns a catalogue shows, in what order.** No surface found.
- **Per-brand editors.** `src/components/model-configuration-editor.tsx:309-316`:
  ```ts
  switch (vendor.slug) {
    case 'highfield': …  case 'jeanneau': …  case 'stacer': …
    case 'stabicraft': … case 'surtees': …
    default: return <p>Editor Not Available</p>;
  }
  ```
  Five cases. `src/lib/step5-curation.ts:91` shows the curation layer already
  knows seven brands — `/(HIGHFIELD|STACER|STABICRAFT|SURTEES|JEANNEAU|FORMOSA|HAINES)/`.
  **The data has brands the editor cannot open.** Adding one is a code change,
  a build and a deploy.
- **Catalogue presentation rules.** `src/lib/step5-curation.ts` is 14 named
  relevance rules (`RELEVANCE_RULES`, `:190`) plus a section-name prettifier
  (`prettifySectionName`, `:515`) that decide what the operator sees out of
  1,791 imported dealer-fit rows. Excellent rules — **all in TypeScript**, none
  editable, and its own header explains they exist because *"data-consistent but
  product-senseless presentation"* reached customers (`:5-6`).

---

## 3. The WYSIWYG template designer — properly studied

`src/app/(app)/modules/[id]/templates/[templateId]/page.tsx` — 1,232 lines,
80 KB, one file.

### What it tried to let people design

A **paged print document**, WYSIWYG, on a zoomable dark canvas
(`:643` zoom 0.3–1.5). The left rail is a "Component Factory"; the right rail is
a properties inspector; the middle is A4 pages you can add and delete.

Data model, `:70-102`:

```ts
interface TemplateBlock {
  id: string;
  type: 'text' | 'image' | 'table' | 'variable' | 'grid' | 'quoteItems';
  content: any;                    // ← untyped
  style?: { bold, italic, underline, textAlign, fontFamily, fontSize, color };
  order: number;
  dataSource?: string;             // ← the binding
  zone?: 'header' | 'body' | 'footer';
  layoutConfig?: {
    variant?: 'h1'|'h2'|'h3'|'p';
    columns?: number;              // 2 | 3 | 4  (:1140-1142)
    spacing?, displayStyle?: 'list'|'grid'|'table',
    showImages?, showSku?, showDescription?, showPrice?   // (:1148-1168)
  };
}

interface TemplatePage {
  id: string; blocks: TemplateBlock[];
  headerHeight: number;  // mm
  footerHeight: number;  // mm
  marginLeft: number; marginRight: number;  // mm
  order: number;
}
```

Persisted as `pages: TemplatePage[]` on
`organisations/{orgId}/templates/{templateId}` (`:450`, `:475-478`), created
from a dialog that asks name + type (`'Quote' | 'Invoice' | 'Contract'`) +
which module it belongs to, then redirects straight into the designer
(`src/app/(app)/organisations/[id]/page.tsx:96-120`).

The binding vocabulary — the whole of it — is a literal array **inside the
render function**, `:665-675`:

```
quote.coverImage · quote.totalPrice · quote.modelName · quote.specs
org.logo · org.secondaryLogo · org.name · org.abn
module.brandLogo
```

Nine bindings. Hand-written. Marine-flavoured labels ("Quote: Main Cover
Render"). No relationship whatsoever to the vendor's actual model schema, to
`otherSpecs`, to options, to the motor, to the trailer, to anything an admin
authored.

### What is genuinely good in it

- **Zones.** `zone: 'header' | 'body' | 'footer'` with per-page header/footer heights in millimetres. It understood that a document has repeating furniture and flowing content.
- **Bound vs unbound is visible on the canvas.** `:171` computes `isBound`, and a bound block wears a badge reading `Bound: QUOTE • TOTALPRICE` (`:195`) while an unbound variable renders as `{UNMAPPED_VARIABLE}` (`:244`). *You can see at a glance which parts of the design are real.* That is the right instinct and we should keep it.
- **Nested slots.** `grid` blocks hold `content.slots` of child blocks, recursed for colour extraction (`:645-651`) — it had a containment model, not just a flat list.
- **A palette of colours already used in the document** (`allUsedColors`, `:640-655`) — a self-building theme from the designer's own choices.

### Why it did not get wired up — what the code shows

1. **Nothing reads it.** A repo-wide search for `templates` finds exactly three consumers: the designer itself, the create dialog, and the list on `/organisations/[id]` (`:219-223`). No PDF renderer, no preview, no quote path. `pages` is written and never read.
2. **It was built in one day and abandoned.** `git log` on that file: **35 commits, every one dated 2026-03-09**, and never touched again. The repo's last commit is 2026-08-07. Five months, versions v1.4 → v1.34, zero further edits.
3. **The commit messages are the post-mortem.** They are verbatim user complaints, in order: *"clicking save here does nothing"*, *"got this error when I clicked the plus button within the header"*, *"see how the trash and things is cut off. Annoying."*, *"hard to read what it says within it and I want to be able to drag and drop"*, *"not ideal is it"*, then four consecutive `Runtime FirebaseError` / `Build Error` commits. It was abandoned mid-debug, on the same day it was born.
4. **The binding list is a dead end by construction.** Nine hardcoded strings cannot express a document about a *dealer-defined* catalogue. The moment a second brand or a non-marine industry appears, the list is wrong and only a developer can extend it. **INFERRED, but strongly:** this is why it could never have shipped even had the bugs been fixed — the design surface was dynamic while the data vocabulary was static, and the mismatch is fatal.
5. **`content: any`.** No block validates its own contents, so no renderer could be written against it safely.

### Six lessons for our module/layout designer

1. **Never hand-write the binding list.** Bindings must be *the admin's own declared columns*, read from the model, with type. This is the mistake that killed it and the one we are best positioned not to repeat — our `FieldDef` already carries `{id, name, type, sectionId}` (`src/types/model.ts:93-109`).
2. **Keep "bound vs unmapped" visible on the canvas.** Steal `:195` and `:244` outright.
3. **Keep zones.** Header / body / footer, or their screen equivalent, is real structure.
4. **Ship the renderer before the designer, or in the same breath.** A designer whose output nothing reads is worse than no designer: it consumes admin effort and produces nothing. HelmLogic ran this experiment for us.
5. **Do not start with millimetres.** A5/A4 page geometry, `headerHeight` in mm and a zoom control, is print-shop complexity spent before a single block rendered. The owner's constraint is *"i can't stress enough how easy this system has to be to use"*.
6. **`content: any` is the schema debt.** Every block type needs a typed payload or nothing downstream can be trusted.

---

## 4. The compatibility matrix nothing reads — same treatment

`src/components/trailer-compat-editor.tsx`, 153 lines, v1.17 / Story 3.9.4.

**What it lets you do.** For one boat model, tick trailers from a flat checklist
built by walking every `Trailer Brand` vendor's `trailers` subcollection
(`:55-71`). Saves `applicableTrailerCodes: string[]` onto the boat model doc
(`:93-97`). It even tells you the semantics, `:147-150`:

> *"Empty list = no filter. Step 4 of the quote will show every trailer.
> Selecting one or more attaches the filter so only matching codes appear."*

**Why it is dead.** Two independent reasons, both verifiable:

1. **The component is never imported.** `TrailerCompatEditor` appears in exactly one file — its own. Its header comment claims *"Surface: drilldown panel on the model editor / BoatsTable expanded row"* (`:15`); it is on neither.
2. **The field is never read.** `applicableTrailerCodes` appears only inside that file plus one test that greps the source text for the string (`tests/v1.17-everything.spec.ts:122`). The Step-4 trailer picker does not filter on it.

**And its sibling works.** `applicableDealerFitCategories` — the same idea one
story earlier — *is* live: authored as a comma-separated text field in
`src/components/boats-table-view.tsx:862-873` and read by the quote flow at
`src/components/highfield-quote-flow.tsx:1057-1058`. Same concept, same week,
one shipped and one did not, and nothing in the app tells an operator which is
which.

Git confirms the shape: trailer-compat's first and last commit are both
2026-06-16. One sitting, never revisited.

**Lessons.**

- **The copy is excellent and should be stolen.** *"Empty list = no filter"* stated on the surface itself; the count badge (`{selected.size} attached`); the dirty-gated Save. Our reviewer already leans this way — keep going.
- **A matrix authored as `string[]` of *codes* on the parent row is a join table wearing a disguise.** It cannot carry a reason, a date, a price delta, or a direction, and it cannot be queried from the trailer side. Ours must be rows in a real join table.
- **The failure mode to design against: authoring effort with no runtime consequence.** An operator can spend an afternoon ticking 60 trailers across 40 models and change nothing. Any association surface we ship must be able to answer *"is anything reading this?"* on the screen where it is authored — a live count of what the rule currently affects, or it does not ship.
- **Twice now** — this and the Guardrails editor in §6 — HelmLogic shipped an editor with no evaluator. It is their most repeated mistake.

---

## 5. Layout, ordering and label configuration — everything, however small

This is the honest full list. It is short.

### 5.1 PDF section order — the only real layout configuration in the app

`src/lib/pdf-structure.ts`. Stored at
`organisations/{orgId}/pdfStructure/{documentType}` for
`quote | contract | motor-quote`.

`DEFAULT_SECTIONS` (`:98-110`) is eleven entries: four **system** sections
(cover-page, vessel-config, pricing-section, signatures) interleaved with the
seven **content** blocks. Each carries a fractional `order`; a drag writes one
section's new order via the midpoint of its neighbours (`fractionalOrder`,
`:156-161`) rather than renumbering the list.

What the admin can actually move: **the seven content blocks, and only into one
of three zones.** All four system sections are anchored (`ANCHORED_IDS`,
`:120-125`) and `partitionContentBlocks` (`:212-235`) reduces the user's ordering
to zone A (before vessel-config) / zone B (between vessel-config and pricing) /
zone C (after pricing), which the renderer drops into fixed insertion points
(`src/components/proposal-pdf.tsx:342`).

**And it says so.** `:17-25`:

> *"'cover-page' is anchored as page 1 in proposal-pdf because its full-bleed
> image background + gradient overlay don't flow in a wrapping page model.
> Drag-drop in the list still updates the doc, but the renderer keeps cover at
> the top."*

This is the single most useful page in the HelmLogic codebase for us. It is a
working, shipped, honest partial: **it names exactly which drag gestures are
real and which are recorded-but-ignored, and why.** Compare to the WYSIWYG
designer, which recorded everything and honoured none of it, silently.

### 5.2 Content blocks — the system that beat the WYSIWYG designer

`src/lib/content-blocks.ts`. Seven block types, a closed enum (`:37-45`):
`salesperson-message · why-us · brand-story · after-sales · finance-info ·
value-summary · terms-and-conditions`. Each *"maps to a known PDF position"*
(`:36`).

Per block, an admin authors: TipTap rich-text `html`, a `subHeader` sub-line,
`documentTypes[]` (which of quote/contract/motor-quote it appears on, `:74`),
`startsOnNewPage`, `isLockedForQuotes` (whether salespeople may override it
per-quote, `:82-89`), and a **presentation `style`** — accent colour, background,
text colour, title align, title size, body size, body align, title italic
(`:95-113`). Plus **per-brand overrides** at
`contentBlocks/{id}/brandOverrides/{vendorId}`, **versions** at
`contentBlocks/{id}/versions/{v}`, and a JSON import/export with a schema
version (`src/components/content-block-import-export.tsx:106`).

It is layered exactly right: **org default → per-brand override → per-quote
override, with a lock flag that lets the org win.**

It is also completely closed: seven types, no eighth. An admin cannot add a
section. The trade the codebase made is explicit — **fixed slots, deep
customisation inside each slot, and a renderer that actually exists**, versus
the WYSIWYG designer's infinite slots and no renderer. The fixed-slot one is
the one still being maintained (first commit 2026-05-04, last 2026-07-19,
i.e. *after* the designer was abandoned).

### 5.3 Everything else, exhaustively

| Surface | What an admin can order/label | Ceiling |
|---|---|---|
| **Optional-feature categories** | Type a name into `CREATE CATEGORY` and features group under it (`src/components/highfield-model-editor.tsx:1341-1353`) | **Their order is hardcoded**: `if (a === 'Consoles') return -1 … if (a === 'General Options') return 1` then alphabetical (`:1327-1330`). You may name the headings; you may not sequence them. |
| **`otherSpecs`** — `{id, label, value}[]` | The one true add-a-field mechanism. Free label + free value, rendered on the quote spec sheet (`highfield-quote-flow.tsx:4146`) and the PDF | Present in 3 of 5 brand editors. Untyped, unitless, and see below |
| **PDF headline specs** | — | `src/components/proposal-pdf.tsx:983-993`: the cover picks six specs by **regex-matching the admin's free-text label** — `findSpec(/overall length\|length overall\|\blength\b/i)`, `/beam/i`, `/persons\|capacity\|people/i`, `/max\s*hp/i`, `/dry weight\|hull weight\|\bweight\b/i`, `/fuel/i`. Name your spec "LOA" and it silently never reaches the cover. **This is the exact cost of untyped fields plus code-side layout, and it is invisible to the person authoring.** |
| Email templates | Subject + body, per type, with a default | Merge vocabulary is 6 hardcoded tokens (`src/lib/email-send.ts:144-151`), one of them labelled *"Boat model"* |
| Pipeline stages | Rename/reorder the kanban columns (`customer-defaults-card.tsx`) | Genuinely dynamic. Rare. |
| Customer sources | Free list | Genuinely dynamic |
| Saved catalog filters | Named search queries pinned as chips, on `users/{uid}.savedCatalogFilters` (`src/components/saved-filters-bar.tsx:3-14`) | Per-user, search-string only |
| Dashboard module tiles | Drag order | **Per-user**, not admin (`[orgSlug]/dashboard/page.tsx:160-174`) |
| Module image / cover | Upload | — |
| Org colours | 3 hex pickers | Feed PDF branding |
| Module roles | Brand Captain, Module Manager | Two fixed slots (`module-role-assignment.tsx`) |

---

## 6. The rule editors — one with no evaluator, one with no editor, one that works

Worth its own section because it is the pattern the owner's module system will
walk straight into.

**Editor, no evaluator.** `RulesSection` — "Guardrails" —
`src/components/highfield-model-editor.tsx:1226-1300`. A per-model list of
`{sourceOptionId, type: 'include'|'exclude', targetOptionIds[]}`, with a
**Sync Series** button that batch-writes the whole rule array onto every model
sharing a model code (`:1234-1250`). Real authoring, real bulk tooling, and no
consumer: nothing in the quote flow evaluates `model.rules`.

**Evaluator, no editor.** `src/lib/compatibility-rules.ts` — `forbids` /
`requires` rules at `modules/{moduleId}/compatibilityRules/{ruleId}`,
consumed live by the quote flow (`highfield-quote-flow.tsx:932-943`). Its own
header, `:33-34`:

> *"Author flow (per v1.9 build plan): engineering writes rules direct to
> Firestore (Firebase Console). Admin UI deferred to v1.10+."*

Still deferred at v1.34. **An admin cannot author the only option-to-option
rules the app actually enforces.** It also chose to *warn, not block* (`:36-42`)
— "we show the violations in an alert banner… we do NOT disable the offending
checkboxes" — which is the right default and worth keeping.

**The one that works, with one flaw.**
`src/components/fit-up-classification-rules-manager.tsx` +
`src/lib/fit-up-classification.ts`. An org admin authors named, prioritised
rules — AND-combined conditions over five fields, an output tier, `isActive`
instead of delete. It is mounted (`fit-up-catalog-manager.tsx:441`) and it is
called (`fit-up-quote-selector.tsx:356`).

The flaw is precise and instructive. The editor offers five fields
(`fit-up-classification.ts:47`):
`motorHp · boatLengthM · boatRange · modelCode · vendorId`.
The runtime context assembled at the one call site,
`fit-up-quote-selector.tsx:355`, is:

```ts
const ctx: ClassificationContext = { motorHp, vendorId, modelCode: modelId };
```

**`boatLengthM` and `boatRange` are never populated** — two of the five fields
the UI invites an admin to build rules on can never match. And `modelCode` is
fed `modelId`, a document id, so a rule reading `modelCode == 'CL380'` cannot
fire either. Three of five offered fields are inert, and the admin is told
nothing.

**The lesson, and it is the central one for our module system:** the rule
editor's vocabulary and the runtime's context were assembled by hand, in two
places, and drifted. In our system the vocabulary must *be* the declared
columns and the context must be *derived from the row* — one source, no
hand-assembly, no drift.

---

## 7. The honest gap

**Question: to give an admin the power to define a module and its layout, how
much of that machinery exists today in HelmLogic?**

**Answer: the noun exists. Almost none of the machinery does.**

Score each capability the owner named:

| The owner asked for | HelmLogic today | Verdict |
|---|---|---|
| "admins … dynamically create a dashboard for their organisation" | Dashboard = tiles of `enabledModuleSubscriptions`, tile order stored **per user**, tile subtitle derived by substring-matching the module name (`[orgSlug]/dashboard/page.tsx:95-98`) | **~5%.** A list, not a designed dashboard |
| "create a module" | A form: name + type-from-9 + vendor pointers (`modules/add/page.tsx:40-44`) — and **only HelmLogic staff can use it** | **~15%.** The record exists; the authorship is in the wrong hands |
| "define what can be done within that module" | `moduleType` selects one of seven hardcoded screens (`modules/[id]/page.tsx:620-887`); the 5 tabs inside are a code array with 2 permission flags (`:1299-1305`) | **0%.** No capability model of any kind |
| "assign a master table to that module" | `mainVendorId` + `associatedVendorIds` + `associatedModuleIds`, all untyped id arrays | **~25%.** Pointers exist; they have no semantics |
| "design the module layout" | PDF sections only: 7 blocks reorderable into 3 zones between 4 anchors (`lib/pdf-structure.ts:98-125`). Screen layout: none | **~10%,** and only for the print document |
| "catalog … module" | Five hardcoded per-brand catalogue components, `default: <p>Editor Not Available</p>` (`model-configuration-editor.tsx:315`) | **0%** as configuration |
| "quote module" | `STEPS` = 7 hardcoded marine steps + a second hardcoded array for the motor-only variant (`highfield-quote-flow.tsx:186-206`) | **0%** |
| "have users go through it" | Works, beautifully, for exactly the flow that was coded | n/a |

**What genuinely exists and is worth carrying over:**

1. **A layered override model that works** — org default → per-brand → per-quote, with an org lock (`content-blocks.ts:82-113`). Proven at scale, on the highest-stakes artefact in the app.
2. **Fractional-index reordering with honest anchors** (`pdf-structure.ts:112-125`) — and the discipline of *telling the user which drags are real*.
3. **A prioritised, `isActive`, named-rule engine with an admin UI** (`fit-up-classification.ts`) — the right shape, wired to the wrong context.
4. **Module↔module association as authored data** (`module-settings-panel.tsx:322-473`) — the germ of a join.
5. **"Empty means unrestricted", said on the surface** (`trailer-compat-editor.tsx:148`).
6. **Role creation as data.**
7. **Import/export with a schema version and upsert-by-natural-key**, everywhere.

**What is missing entirely, and is the actual build:**

- Any notion of a module **capability** (what can be done here) as data.
- Any notion of a module **surface** (a page, a tab, a section) as data.
- Any **binding vocabulary derived from the schema** rather than typed by hand.
- Any **flow definition** as data.
- **Permissions as data** — so a capability an admin invents can be governed.
- A **runtime renderer** that reads all of the above. HelmLogic proved that the
  designer is the easy half and the renderer is the half that decides whether
  any of it was real.

### The three sentences to hold onto

1. **HelmLogic's "module" is a router key.** Nine strings choose between seven
   hardcoded screens. Our module must be a *definition* — a table, a set of
   capabilities, a set of surfaces — or we have built the same enum with a
   nicer form on top.
2. **Two editors shipped with no evaluator and one evaluator shipped with no
   editor.** Every configuration surface we build must be able to show, on the
   authoring screen, what it currently affects. If it cannot, it should not
   ship.
3. **The WYSIWYG designer died because its canvas was dynamic and its data
   vocabulary was nine hand-typed strings.** We already have the thing it
   lacked — declared, typed, admin-named columns. The whole opportunity is to
   point a layout designer at those, and nothing else.

### Two things flagged, not acted on

- `src/components/manage-organisation-page.tsx:16-17` creates a **second Firebase
  app instance client-side and calls `createUserWithEmailAndPassword`** to add
  org users. Noted as an architecture observation for whoever owns that repo;
  not touched.
- The credential exposure in `scripts/` already recorded in
  `docs/specs/CONFIG_FINDINGS.md` §6 remains unaddressed. Nothing was read from
  those files for this study beyond confirming they were not needed.

---

### Method / coverage

Read: `src/app/(app)/modules/**`, `src/app/(app)/organisations/[id]/page.tsx`,
`src/app/(app)/manage/page.tsx`, `src/app/(app)/admin/page.tsx`,
`src/app/(app)/[orgSlug]/dashboard/page.tsx`,
`src/app/(app)/data-warehouse/add/page.tsx`, `src/components/module-*.tsx`,
`manage-organisation-page.tsx`, `content-block-manager.tsx`,
`trailer-compat-editor.tsx`, `fit-up-classification-rules-manager.tsx`,
`model-configuration-editor.tsx`, `highfield-model-editor.tsx`,
`boats-table-view.tsx`, `app-sidebar.tsx`, `admin-guard.tsx`,
`proposal-pdf.tsx` (specs section), `src/lib/{content-blocks, pdf-structure,
compatibility-rules, fit-up-classification, step5-curation, nav-links,
email-send}.ts`, `src/lib/catalog/v1*-features.ts`, `firestore.rules`, and
`git log` on the three files whose lifecycle mattered.

Not determined: whether any HelmLogic org has ever created a WYSIWYG template
in production (requires signing in — not done); whether `used-boats` /
`website-listings` modules exist in production data; the runtime contents of
`modules/{id}/compatibilityRules` (Firestore-authored, not in the repo).
