# PARITY — what production has that we do not, and what we have that it does not

**Lens:** every surface in production HelmLogic (`C:/Users/AsafA/HelmLogic`, read
strictly read-only — nothing run, nothing written, no authentication, no script in
`scripts/` executed), set against this repo on `redesign`. Two questions from the
owner, answered in order:

> "all of the screens and functionality that HL has that we don't we need to audit."
> "can we migrate all images from HL to our system to the right parts"

§1–§6 answer the first. **§7 answers the second, and it is the section with the
measured surprise in it.**

Every claim carries a `file:line` or a reproducible count. Where I could only learn
something by signing in, it says **not determined**. Where I reasoned past the code,
it says **INFERRED**.

## 0 · WHAT IS NEW HERE, AND WHAT IS NOT

Four studies already exist and this one starts from them rather than repeating them:

| doc | covers | this doc does not re-litigate |
|---|---|---|
| `docs/plan/hl-journeys.md` (634 ln) | catalog + quote, screen by screen, 12 catalog + 23 quote frictions | the two journeys |
| `docs/plan/hl-admin.md` (599 ln) | every configuration surface, the dead editors, the rule engines | admin/config |
| `docs/plan/hl-modules.md` (634 ln) | what a "module" is — nine types, seven screens, five brand editors | the module enum |
| `docs/plan/hl-navigation.md` (848 ln) | shell, routes, roles, permissions, multi-tenancy | nav + permissions |

They studied **two journeys and one noun**. Production has **69 route files**. This
document walks the rest: sales/CRM, contracts, stock, reporting, telemetry, service,
registration, rebates, the seven MPF reference managers, the public customer route,
the three API routes, and the surfaces with no inbound link at all.

---

## 1 · THE SURFACE CENSUS

Every route file under `src/app`. `HAVE` = we have a working equivalent. `BETTER` /
`WORSE` are judgements with a reason. `NONE` = we do not have it.

### 1.1 Public / unauthenticated

| Surface | Source | What it is for | Us |
|---|---|---|---|
| Landing | `src/app/page.tsx` | entry | **NONE** — we have no router and no URL at all (`src/app/Shell.tsx:4-6`) |
| Login | `src/app/login/page.tsx` | email+password sign-in (Firebase Auth) | **NONE** — no user concept exists in `src/` |
| Signup | `src/app/signup/page.tsx` | self-serve account | **NONE** |
| **Accept a variation** | `src/app/accept-variation/[token]/page.tsx` | *the only customer-facing screen in the app.* Customer opens an emailed link, no login, sees the priced delta lines, **signs on a canvas**, accepts. 32-hex unguessable token, consumed on first accept, written via `signInAnonymously` | **NONE** |

### 1.2 Sales / CRM — the salesperson's Monday

| Surface | Source | What it is for | Us |
|---|---|---|---|
| Customers | `(app)/customers/page.tsx` → `customer-list.tsx` (382 ln) | the register. Search by name (`:188-192`), create (`:128`), edit (`:138`), delete (`:159`) | **WORSE.** We have `src/features/crm/CustomerList.tsx` + `customers.ts` — and ours is architecturally better (a customer is a **row in a table**, searchable by the finder, exported with the project — `crm/customers.ts:1-12`). But theirs is on a server where a colleague can see it and ours is in one browser. |
| Customer detail sheet | `customer-detail-sheet.tsx` (229 ln) | contact, lifecycle stage, source, primary/secondary buyer, trade-in, **the customer's linked quotes**, notes thread | **WORSE** — `src/features/crm/CustomerPage.tsx` exists; the quote cross-reference is the piece we lack. Note their totals column reads `q.financials?.totalInclGst ?? q.totalInclGst`, neither of which is ever written (`hl-journeys.md §5.1`) — **so their number is $0 for every real quote.** |
| Pipeline | `(app)/pipeline/page.tsx` → `sales-pipeline-board.tsx` (85 ln) | kanban of customers by lifecycle stage; stages come from `organisation.customerDefaults.pipelineStages` — genuinely dealer-configurable | **NONE.** Their own header says *"Read-only board for now — drag-to-move-stage is a later polish item"* (`:7-8`). |
| Contracts | `(app)/contracts/page.tsx` → `contracts-overview.tsx` (122 ln) | cross-module contract list, sort by date/value/state, filter by state | **NONE** — we have no contract concept |
| Reporting | `(app)/reporting/page.tsx` → `reporting-dashboard.tsx` (185 ln) | four metrics — quotes this month, conversion rate, pipeline value, deposits taken (`:69-80`, tiles `:104-107`) — plus a sortable/filterable flat quote list | **NONE** |
| Recent activity / Audit log | `recent-activity-feed.tsx` (93 ln); `(app)/audit-log/page.tsx` | org-wide feed over `collectionGroup('auditLog')`; the audit-log page is the same component with `limit={200}` | **NONE.** We have no audit trail on anything. |
| My Work | `(app)/my-work/page.tsx` (98 ln) | personal My Quotes / My Customers / My Contracts, filtered by `createdByUid`; archived (`deletedAt`) rows excluded | **NONE** — no "me" to filter by |
| Global search | `(app)/search/page.tsx` → `global-search.tsx` | searches customers, quotes, contracts | **BETTER.** Ours (`src/features/search/rowSearch.ts`, 688 ln) searches **every row of every table**, groups hits by the table they came from, and every result is reachable. Theirs searches no product at all and **its result rows are plain `<div>`s with no click handler** (`global-search.tsx:90-98`), on a page with no inbound link. |
| Quote comparison | `(app)/quote-comparison/page.tsx` → `quote-comparison.tsx` | compare quotes side by side | **NONE** — and theirs shows `$0` for every quote and labels each one by its **hull colour** (`quote-comparison.tsx:21-23, 80`). Do not copy it; build it correctly or not at all. |

### 1.3 Stock and inventory

| Surface | Source | What it is for | Us |
|---|---|---|---|
| **Stock Management** (module tab) | `stock-management-workspace.tsx` (418 ln) | eight views: In Stock · **On Order** · **Pending** · **Delivered Deals** · **Hold Requests** · **Map** · **Assignments**, plus four counters (`:121-134`) | **NONE — entire capability** |
| Stock list + detail + inline edit | `stock-list.tsx` (679), `stock-item-detail.tsx` (772), `inline-edit-cell.tsx` | per-unit record, move-to-delivered | **NONE** |
| Stock import / export | `stock-import.tsx` (529), `stock-export.tsx` | spreadsheet round-trip of physical units | **NONE** |
| Hold requests | `hold-requests-dashboard.tsx` (416), `hold-request-dialog.tsx` (461) | a sub-dealer asks head office to hold a unit; approve/decline | **NONE** |
| Delivered deals | `delivered-deals.tsx` (554) + import/export (529) | post-delivery register: days in stock, consignment, sold-by | **NONE** |
| Stock locations | `stock-location-manager.tsx` (364), `stock-location-map.tsx` | yards; map view | **NONE** |
| Stock assignment | `stock-assignment-view.tsx` (303) | allocate a unit to a quote | **NONE** — our freeze mints a line from a *catalogue* row; there is no unit |

### 1.4 The quote's afterlife — the proposal action bar

`proposal-view.tsx` (2,211 ln) is the single densest screen in production. Twelve
actions, all cited to `proposal-view.tsx`:

| Action | Line | What it does | Us |
|---|---|---|---|
| Activity | `:926` | per-quote audit event sheet with a count badge | **NONE** |
| Audit | `:941` | the price waterfall — how this number was reached | **BETTER-in-kind.** Our whole quote is a frozen photograph (`quote/freeze.ts:1-25`); the derivation is on the document rather than behind a button. But we have no explicit waterfall panel. |
| Duplicate | `:960` | re-seeds the whole flow from `?duplicate=` | **HAVE** (quote copy) |
| **Create v{N+1}** | `:982` | fork a *locked* quote with `parentQuoteId` tracking | **NONE** — we have issue-locking but no versioned fork |
| **Personalise** | `:1007` | per-quote override of the org's content blocks | **NONE** |
| **Send Quote** | `:1040` | email the PDF | **NONE** (and theirs is disabled — see §3.2) |
| **Convert to Contract** | `:1062` | with a stated refusal for every blocked case (`:1031-1037`) | **NONE** |
| View Contract | `:1078` | contract sheet: snapshot, deposits, signing pack | **NONE** |
| **Variation** | `:1096` | priced change against a locked quote + public accept link | **NONE** |
| **Scenario** | `:1111`… | sibling quote under the same root | **NONE** |
| Preview | `:1120` | the exact PDF, inline in an iframe | **HAVE** (`quote/QuoteDocument.tsx`, print view) |
| Download PDF | `:1130` | `renderQuotePdf` | **WORSE** — see §3.1 |

### 1.5 Catalogue and pricing (beyond what `hl-journeys.md` covered)

| Surface | Source | What it is for | Us |
|---|---|---|---|
| Catalog Manager | `(app)/pricing-manager/page.tsx` (400 ln) | the only searchable tabular catalogue; mounts boats/motors/trailers tables + exchange rates + export/import + audit history | **BETTER.** Our sheet *is* the catalogue: `src/features/table/**` with grouping, sections, filters, column menu, LOD, and search — available to everyone, not gated on `can_access_pricing_manager` (`pricing-manager/page.tsx:88`). |
| Saved catalog filters | `saved-filters-bar.tsx` | named search chips on `users/{uid}.savedCatalogFilters` | **NONE** — and note theirs is per-user, search-string only |
| Catalog export/import | `catalog-export-import.tsx` (869 ln) | six-sheet xlsx snapshot, **upsert-by-natural-key** on import | **HAVE, differently.** `src/features/io/envelope.ts` (1,555 ln) validates a whole project envelope and rejects with a printable reason; `io/tableCsv.ts` does per-table CSV. Theirs covers org-scoped subcollections ours has no equivalent of. |
| Catalog audit history | `catalog-audit-history.tsx` | who changed which price when | **NONE** |
| **Full-screen motor editor** | `(app)/modules/[id]/motor/[motorId]/page.tsx` (180 ln) | live-subscribed motor row editor writing through shared field mirrors | **HAVE** — our sheet edits any row of any table in place |
| Vendor data browser | `(app)/vendor-data/[vendorId]/page.tsx` (206 ln) | raw dataset rows, three view modes | **HAVE** (the sheet) |
| Data Warehouse | `(app)/data-warehouse/**` (5 pages) | platform-admin vendor/range/model hierarchy | **HAVE, differently** — tables + relations rather than a fixed 4-level hierarchy |
| Data Connect | `(app)/data-connect/**` | — | **N/A.** Both files are `export default function Page() { return null; }`. Two dead routes. |

### 1.6 Module workspaces that are not the boat catalogue

Seven of production's nine module types render a *different hardcoded screen*
(`hl-admin.md §1`). Four of those screens are real capabilities we lack:

| Workspace | Source | What it is for | Us |
|---|---|---|---|
| **Registration** (`rego`) | `rego-workspace.tsx` (522 ln) | CRUD of `regoTypes` per authority: name, `sellExclGst`, `appliesTo: 'boat'\|'trailer'\|'both'` (`:11-16`); flows into the quote's rego pickers | **PARTIAL.** `src/features/constraints/registration.ts` reads registration as a *rule theme*; we have no priced registration line on a quote. |
| **Service** | `service-quote-flow.tsx` (975 ln), `service-catalog-manager.tsx` (1,080 ln) | a whole second quote product: labour operations + parts, 4-step wizard, own status set, stored at `organisations/{orgId}/serviceQuotes` | **PARTIAL.** `docs/specs/SERVICE_AND_THEMES.md` and `constraints/serviceThemes.test.ts` exist; there is no service quote. |
| **Fit-Up** | `fit-up-catalog-manager.tsx` (1,988 ln) + `fit-up-classification-rules-manager.tsx` | dealer's own labour catalogue, CSV upsert, bulk markup, **and the one working admin-authored rule engine in the app** | **BETTER on rules, NONE on catalogue.** Our rule story is stronger (§6.1); their fit-up *catalogue* — tiers, cost, sell, packages — has no equivalent here. |
| **Trailers** | `trailer-dashboard.tsx` (1,409), `trailer-pricing-workspace.tsx` (1,792) | flat pricing table with per-org `trailerOverrides`, waterfall, import with dedupe | **HAVE.** Trailers are a table; `src/features/constraints/trailerFitment.ts` + `TrailerFitmentPanel.tsx` answer fitment better than their dead `trailer-compat-editor.tsx` (`hl-admin.md §4`). |
| Master Price File | `master-price-file-workspace.tsx` (592) | MPF import staging | **HAVE, differently** — `tools/seed/` is our pipeline; `io/Freshness.tsx` is the staleness surface |
| Yamaha motor workspace | `yamaha-motor-workspace.tsx` (725) | motor-brand module home | **HAVE** (module + table) |

### 1.7 Money-shaped configuration we do not have at all

Seven managers, all reading org subcollections seeded from the MPF workbook:

| Surface | Source | Us |
|---|---|---|
| **Rebates** (v1.34, replaced Promotions on motor modules) | `yamaha-rebates.tsx` (898 ln) — named program, promo photo, selected SKUs each given a **temporary new price**, an `endsAt` timer that un-stamps them, and permanent sales history per rebate | **NONE** |
| Promotions | `module-promotions.tsx` (730 ln) — `fixed-amount \| per-hp \| percentage \| category-discount`, applied to motor/rigging/propeller/accessories/total, with start+end dates | **NONE** |
| Exchange rates | `exchange-rate-manager.tsx` (640 ln) | **NONE** |
| Pricing matrix | `pricing-matrix-manager.tsx` (435 ln) — markup/margin per franchise, trade tiers | **NONE** |
| Freight config | `freight-config-manager.tsx` (361 ln) — rate per linear metre + buffer % | **NONE** |
| Rigging kits | `rigging-kits-manager.tsx` (486 ln) | **PARTIAL** — `tools/seed/extracts/rig_kits.json` is in the seed; there is no manager |
| Engine service schedules | `engine-service-schedules-manager.tsx` (441 ln) — intervals, five-year plan, parts BOM | **NONE** |
| Suppliers | `suppliers-manager.tsx` (398 ln) | **NONE** |
| Price lists | `price-list-manager.tsx` (964 ln), `price-list-viewer.tsx` (489 ln) | **NONE** |

Every one of these is *"read-mostly by design… they round-trip via the MPF import"*
(`engine-service-schedules-manager.tsx:12-13`). They are windows onto imported
reference data, not authoring tools — which is exactly the shape a table gives us for
free. **This is the cheapest whole column in the table: nine screens that are one
table each.**

### 1.8 Platform / internal — not a dealership capability

| Surface | Source | Verdict |
|---|---|---|
| Usage & Activity | `(app)/usage/page.tsx` → `usage-reporting-workspace.tsx` (588 ln) + `src/lib/telemetry.ts` (339 ln) | Sessions, active-vs-idle time, per-user leaderboard (`:382`), event explorer over every click/field/page-view/error (`:544-548`), PDF export of the filtered view. **NONE** for us. Genuinely impressive; genuinely not what a salesperson needs on Monday. |
| Feature Tracking / Roadmap | `feature-tracking-board.tsx` (2,503 ln), `roadmap-view.tsx` (1,112 ln), `backlog-view.tsx` (484 ln) | Their own product-management system, shipped inside the customer app. **Do not build.** |
| Suggestion approval | `suggestion-approval-queue.tsx` (220 ln) | triage of user-submitted features. **Do not build.** |
| Agent Team | `admin/agent-team/page.tsx` → `agent-team-dashboard.tsx` (272 ln) | a dashboard of AI agents with `status: 'idle'\|'working'\|…`. **Do not build.** |
| Organisations / Sub-dealers | `(app)/organisations/**`, `(app)/sub-dealers/**` | multi-tenancy — see §2.1 |
| Real-Time Vessel Tracking | `real-time-tracking/page.tsx` (23 ln) | a map component. Unlinked. |
| Route Optimization | `route-optimization/page.tsx` (26 ln) | an AI flow. Unlinked. |
| Highfield | `highfield/page.tsx` (42 ln) | **literal lorem ipsum** (`:36`). Unlinked. |

### 1.9 API routes

| Route | Source | What it is for | Us |
|---|---|---|---|
| `/api/image-proxy` | `route.ts` (137 ln) | server-side fetch of cross-origin images so the PDF can embed them; **origin allow-list, 10 MB cap** (`:22-26`) | **NONE** — and we need the *idea*: §7 |
| `/api/pdf-img` | `route.ts` (50 ln) | same-origin proxy for Firebase Storage images, because *"Storage tokened URLs send no CORS headers (verified 2026-07-19)"* (`:6-8`) | **NONE** |
| `/api/sharepoint-sync` | `route.ts` (220 ln) | Microsoft Graph push of the rendered PDF into the dealer's SharePoint | **NONE**. Note its own header records the auth gap: *"the route currently trusts the calling client"* (`:17-18`). |

---

## 2 · THE GAPS THAT ARE CAPABILITIES, RANKED

Ranked by *what a dealership cannot operate without*, not by difficulty. For each:
what it reuses here, and what genuinely new contract it needs.

### TIER 1 — a dealership cannot run the business without these

**2.1 · Identity, organisation, and the fact that other people exist.**
Production has two authorities (`admin-guard.tsx:46`), roles as admin-created data
(`organisation.roles[]`), an 11-permission matrix, sub-dealer orgs, and per-org module
subscriptions. **We have none of it.** A grep of our `src/` for
`permission|userRole|isAdmin|currentUser|auth` returns **one hit, in a comment about a
SharePoint URL** (`src/lib/imageSources.ts:17`; recorded in `our-substrate.md:68-73`).

- *Reuses:* nothing. There is no seat for a person in the model.
- *New contract:* a `UserDef`/`RoleDef` pair, a permission vocabulary that is **data
  and not an enum** (production's is a fixed array of 11 — `manage-organisation-page.tsx:124-142`
  — and one of them, `can_edit_boat_data`, hardcodes the industry in its own name),
  and an owner on every persisted record. Touches `src/types/model.ts`, the store, and
  Dexie. **Orchestrator-owned; report, do not build.**
- *Blocked behind it:* My Work, per-user anything, "who changed this price", approval,
  and every sentence in §2.2.

**2.2 · Shared, server-side storage — the quote a colleague can open.**
Our quotes live in `localStorage` and the file says so plainly: *"this persists — badly
but really — until the store and Dexie can do it properly"* (`src/features/quote/quotes.ts:1-16`).
Constraints live in a module registry keyed by the **lower-cased org name**
(`constraints/constraintDefs.ts:39-40`). `ProjectMeta.id` is the literal `'default'`
(`our-substrate.md:121`) — **the store holds exactly one project.**

Production's own version of this is broken in an instructive way — quotes are at
`users/{uid}/quotes/{id}`, so a shared quote-number URL renders "not found" for a
colleague (`proposals/[quoteNumber]/page.tsx:29-35`) — but *it is on a server*, and
that is the difference between one laptop and a dealership.

- *Reuses:* `io/envelope.ts` already knows how to validate an untrusted project payload
  — that is the wire format, already written and already tested.
- *New contract:* a repository implementation that is not Dexie. `src/db/repository.ts:13-20`
  is the seam; it names six concepts and two of our finished features (`ConstraintDef`,
  `QuoteDef`) are **not among them**. Those two must join the repository before anything
  can sync them.
- *Size:* **capability, and the largest one.**

**2.3 · The customer document, as a real document.**
See §3.1. This is the artefact the business is actually selling from.

**2.4 · Stock — "is one on the floor?"**
Eight views, hold requests, delivered deals, locations, assignments (§1.3). A
salesperson quoting a boat that is already sold, or failing to quote one sitting in the
yard, is the most expensive kind of wrong.

- *Reuses:* almost all of it. A stock unit is a **row in a table** with a status column,
  a location ref and a link to the quote it is allocated to — exactly the shape
  `crm/customers.ts` argued for the customer register. Grouping (`table/grouping.ts`),
  filters, the sheet, search and CSV round-trip all come free.
- *New contract:* one — a **quote↔row allocation** that survives the freeze. Our freeze
  deliberately mints a line by value (`quote/freeze.ts:11-16`); an allocation is by
  *reference*, and must not be frozen. That is a real design decision, not a field.
- *Size:* **screen-plus, not a capability.** Two tables and a view page.

### TIER 2 — the business operates, badly

**2.5 · Contract, deposit, conversion, variation.**
Production: convert-to-contract gated with a stated reason for every refusal
(`proposal-view.tsx:1031-1037`), deposits recorded on the contract, a signing pack, and
priced **variations** against a locked quote with a public accept-and-sign page
(§1.1). We stop at "issued".

- *Reuses:* the freeze is exactly right for this — a contract is a second frozen
  document citing the first. `quote/freeze.ts` + `quote/totals.ts` need no change.
- *New contract:* a `ContractDef` (or a `kind` on `QuoteDef`), a deposit ledger, and —
  only if the public accept page is wanted — an outside-the-app surface, which we have
  no story for at all.
- *Size:* **capability.**

**2.6 · Sending it, and the lifecycle that follows.**
`sendQuoteEmail` (`src/lib/email-send.ts:294-448`) renders, uploads, writes a `mail/{id}`
doc, freezes a `sentEmails` audit record, auto-locks on first send, transitions to
`sent`. **And the button is disabled** by `NEXT_PUBLIC_EMAIL_SEND_ENABLED`
(`:465-468`), with the tooltip *"awaiting infrastructure setup (sender domain +
provider)"*. Whether the deployment sets it is **not determined**.

So: they have the plumbing and no water; we have neither. The honest ranking is
**high value, low parity urgency** — nobody at the dealership is sending from HelmLogic
today either (**INFERRED** from the repo alone).

**2.7 · CRM depth — pipeline, activity, follow-up.**
§1.2. Our customer register is architecturally the better idea; what is missing is
everything *after* the record: stage, the quotes hanging off it, the note thread, the
board.

- *Reuses:* enormous amounts. A pipeline board is a **grouped view of the customer
  table by a stage column** — `table/grouping.ts` and `features/views/` already do this.
  Their stage list is dealer-configurable data (`customerDefaults.pipelineStages`); ours
  would be *a column's options*, which is the same idea with a better home.
- *New contract:* none for the board. A note thread needs a child table and a
  relation — both exist.
- *Size:* **screen.** This is the best value-per-line in the document.

**2.8 · The org's own settings.**
`/manage` has 8–9 tabs over ~28 org subcollections (`hl-admin.md §2.2`): company
details, brand colours, GST %, margin threshold, document defaults (deposit %,
payment milestones, quote validity days), email templates with merge tokens,
**content blocks**, PDF section order, SharePoint config. We have `OrgProfile` with
three fields — `name`, `industry`, `createdAt`, **and no id** (`our-substrate.md:120`).

- *Reuses:* content blocks and PDF section order should be read as one lesson, not two
  features — see §3.1.
- *New contract:* `OrgProfile` needs an identity before anything can hang off it. Today
  renaming the business orphans its constraints.

### TIER 3 — revenue-adjacent, cheap here

**2.9 · The nine reference managers (§1.7).** Nine screens in production, each one a
table with a search box and an edit dialog. Here they are nine **tables**, and the
sheet already draws them. The only real work is the *pricing chain that consumes them*
— freight per linear metre, franchise markup, exchange rate — and that is one question:
does a computed price column get to reference another table? (`FieldDef.formula`
exists — `model.ts:93-109`.)

**2.10 · Registration as a priced line, and Service as a second quote product.** §1.6.

**2.11 · Rebates and promotions.** `yamaha-rebates.tsx`'s design is worth reading
before we build ours: a rebate stamps a **temporary new price** onto the selected rows,
un-stamps them when it ends, and keeps the sales history forever. That is a
time-bounded override of a column — a shape our table has no word for yet.

### TIER 4 — do not build

Feature tracking, roadmap, backlog, suggestion queue, agent team, vessel tracking,
route optimisation, the `highfield` lorem-ipsum page, `data-connect` (two files that
`return null`), and quote comparison **as built**. Several are already unreachable:
`hl-journeys.md §1` verified that nine routes — including `/search` — have **no inbound
link anywhere in the repo**.

---

## 3 · WHERE WE ARE WORSE — the useful half

Stated without softening.

### 3.1 The customer document

`renderQuotePdf` (`src/lib/render-quote-pdf.ts:14-30`) is the one genuinely
consolidated pipeline in production: resolve the org's content blocks with per-brand
override fallback → resolve sub-headers → **preload every image as a base64 data URL**
(cross-origin via `/api/image-proxy`) → swap URLs → render `<ProposalPDFDocument>`.
One source feeds download, preview and send.

Behind it: seven content-block types with rich text, a sub-header, per-document-type
visibility, `startsOnNewPage`, an org lock flag, **eight presentation properties**, and
three override layers — org default → per-brand → per-quote — with versions and a
schema-versioned JSON import/export (`src/lib/content-blocks.ts:37-113`). Plus
fractional-index section ordering that **tells you which drags are honoured and which
are not, and why** (`src/lib/pdf-structure.ts:17-25`).

Ours is `src/features/quote/QuoteDocument.tsx` — a browser print view, no PDF, no
branding, no blocks, no ordering, no terms (deliberately: *"Writing plausible ones
would be fabricating a contract"* — `QuoteDocument.tsx:20-21`, and that refusal is
correct).

**The gap is a capability, and it is Tier 1.** The lesson to import with it is
`hl-admin.md §3`: their *WYSIWYG designer* died because its canvas was dynamic and its
binding vocabulary was **nine hand-typed strings**; the *fixed-slot content blocks*
shipped and are still maintained. We already own what the designer lacked — declared,
typed, admin-named columns.

### 3.2 Everything else we are worse at

| # | Where | Evidence |
|---|---|---|
| W1 | **One project, one browser, one tab.** `ProjectMeta.id: 'default'` | `our-substrate.md:121`; `src/db/repository.ts:28-37` |
| W2 | **Quotes and constraints are outside the repository.** localStorage, not Dexie, not in `ProjectExport` | `quote/quotes.ts:1-16`; `constraints/constraintDefs.ts:46,92`; `our-substrate.md:87-88` |
| W3 | **Views cannot travel.** `ViewDef` is absent from `ProjectExport` — a designed page cannot be exported or moved between organisations | `model.ts:933-943`; `our-substrate.md:65-66` |
| W4 | **One view per table, forever.** `createViewFor` is idempotent by `rootTableId` | `views/viewDefs.ts:108-109`; `useProjectStore.ts:708-709` |
| W5 | **No audit trail anywhere.** They log per-quote events and feed them org-wide | `quote-audit-log.ts`; `recent-activity-feed.tsx` |
| W6 | **Images: closing, not closed.** 220 of the seed's 453 addresses now draw from our own origin (§7.1) — but 227 have never been asked about and 79 more sit unused in our own extracts. Production also ships **two server proxies** so its images render inside a PDF at all, which we will need the moment we have a PDF | §7; `api/image-proxy`, `api/pdf-img` |
| W7 | **No org identity.** Constraints are keyed by the lower-cased org *name* | `constraintDefs.ts:39-40` |
| W8 | **No dealer-authored document text.** Their content blocks have three override layers and versions | `content-blocks.ts:82-113` |
| W9 | **No per-user saved anything** — filters, dashboard order, defaults | `saved-filters-bar.tsx`; `[orgSlug]/dashboard/page.tsx:160-174` |
| W10 | **79 image addresses our own extracts hold and our generator drops** — 61 of them on 881 dealer-fit rows | §7.6-A |

---

## 4 · WHAT WE HAVE THAT THEY DO NOT

Same detail. This is not a courtesy section: four of these are answers to defects that
cost production real money, and one of them is the reason to keep going.

**4.1 · Rules that are measured out of the price file, not typed into a form.**
`src/features/constraints/discover.ts` (2,184 ln) points at a loaded project and
answers which shapes it already holds, at what rate, over what denominator, with the
exceptions named. Its governing line is the one production never wrote: *"A DISCOVERED
PATTERN IS NOT A RULE THE BUSINESS STATED, AND IS NEVER PRESENTED AS ONE"* (`:11-16`).
Every candidate is born `evidence: 'observed'` with enforcement `warn` or `report`,
never `filter`, and `MAY_PRUNE` is a constant so a future edit has to argue with it.

Production shipped, in the same area: an editor with no evaluator (`RulesSection` /
"Guardrails", `highfield-model-editor.tsx:1226-1300`), a second editor with no
evaluator (`trailer-compat-editor.tsx` — never imported, field never read), an
evaluator with no editor (`compatibility-rules.ts:33-34`, *"Admin UI deferred to
v1.10+"*, still deferred at v1.34), and one working rule engine **three of whose five
offered fields can never match** because the editor's vocabulary and the runtime's
context were assembled by hand in two places (`fit-up-classification.ts:47` vs
`fit-up-quote-selector.tsx:355`). `hl-admin.md §6` has the full account.

**4.2 · Curation as one mechanism, not one screen.**
`hl-journeys.md §4` found exactly **one** interaction in production it called
unambiguously right — step 5's toolbar — because it explains itself, can be searched
past, can be switched off, and states how much it hid. `src/features/curation/curation.ts`
(362 ln) makes that a shared mechanism: *"a surface gets all four or it gets none, and
none is visible"* (`:20-22`). In production, everywhere else — the HP window, the
console/seat hiding, the trailer-assignment gate — narrows silently.

**4.3 · One money model, frozen at pick time.**
`quote/freeze.ts` mints a line the instant it is picked; `totals.ts` sums frozen values
and never reads the store; the screens render frozen values and never read the store
(`freeze.ts:8-13`). Production answers "what is this quote worth" with **five different
field chains, three of which resolve to $0** on live screens, and sums the number
independently in at least four more places (`hl-journeys.md §5.1`).

**4.4 · A draft that cannot be lost — structurally, not by autosave.**
`grep localStorage|sessionStorage` over production's entire `src/`: **zero hits.** No
`beforeunload`, no `BroadcastChannel`. A refresh on step 6 of their seven-step wizard
destroys the build (`hl-journeys.md §3.4`, *"the single most damaging friction"*). Here
**the pick is the write**, so a step has no state to lose: `quote/steps.ts` takes a
`QuoteDef` and nothing else (`:14-24`).

**4.5 · The two-tab guard.**
`src/features/session/writeLock.ts` (368 ln) is a referee with no React, no Dexie, no
`window` — the whole protocol is drivable in a test with two objects in one process.
`TabGuard.tsx` puts the sentence on screen for as long as the condition lasts and
counts what has been declined, *"not a dialog, and that is a decision rather than a
preference"* (`:11-14`). Production has no such concept.

**4.6 · Undo instead of confirmation.**
`src/store/notes.ts` is a module-level toast bus built specifically so Rule 9 — *"if an
act is undoable it gets a toast with UNDO, not a dialog"* — could be obeyed outside a
table (`:1-18`). Production's only `undo` in `src/` is TipTap's, inside the rich-text
editor (`feature-rich-text-editor.tsx:390`); 16 components reach for `AlertDialog`
instead.

**4.7 · Refusals that say why, where they are.** DESIGN_PRINCIPLES rule 10, enforced
across surfaces. Production does this brilliantly in exactly two places — the
convert-to-contract blocked reasons (`proposal-view.tsx:1031-1037`) and
`pdf-structure.ts:17-25` — and nowhere else.

**4.8 · Everything is a table, including the customer.**
`crm/customers.ts:1-12`: *"a CRM that did any of those would be a second app wearing
this one's chrome."* Production's answer to "what kinds of things are there" is a
**nine-value enum in a form** driving seven early returns in a 2,077-line page, plus a
five-case brand switch whose `default` renders `<p>Editor Not Available</p>`
(`model-configuration-editor.tsx:309-316`) — while `step5-curation.ts:91` already knows
seven brands. **Their data has brands their editor cannot open.**

**4.9 · Design-time and run-time on the same drawing.** `ViewPage.tsx:252-266` — the
SET UP gear grows handles on the page you are already looking at; it does not open a
different screen. That is the "design the layout, then have users go through it"
pattern the owner asked for, already shipping (`our-substrate.md:34-42`).

**4.10 · Honest pictures.** A photograph that cannot be fetched is listed with its
measured reason and **nothing else** — no stand-in, no other boat's picture
(`src/demos/northsideImages.ts:24-36`). The row says "Held as a link", which is true
(`features/modules/ModuleIndex.tsx:32`). Production hides the `<img>` on `onError` and
reveals a generic `Ship` icon (`modules/[id]/page.tsx:1956, 1994`).

**4.11 · Guards in CI.** `npm test` runs vitest + a reachability check (16/16) +
`check-styles`, which fails if a class is written in TSX that no stylesheet declares.
Production has vitest, playwright and three visual/evidence configs; it has no
equivalent structural guard, and its `ts-errors.txt`, `lint-out*.txt` and
`build-out*.txt` are committed at the repo root.

**4.12 · Search that finds a row in any table and says which table it lives in.**
`search/rowSearch.ts:11-18` — grouping the hits under their table *"makes every search
a lesson in the shape of the sheet."* Compare `global-search.tsx:90-98`.

---

## 5 · THE DECISION SHAPE, IN ONE TABLE

| Rank | Gap | Screen or capability | Reuses | Genuinely new |
|---|---|---|---|---|
| 1 | Users, roles, permissions | **capability** | nothing | a person in the model; permissions as data |
| 2 | Shared server storage | **capability** | `io/envelope.ts` as the wire format | a non-Dexie repository; `ConstraintDef`+`QuoteDef` join it |
| 3 | The PDF document | **capability** | frozen quote lines | a renderer, org branding, content blocks |
| 4 | Stock | screen-plus | tables, grouping, views, CSV | quote↔row allocation that is *not* frozen |
| 5 | Contract / deposit / variation | **capability** | the freeze | `ContractDef`, deposit ledger |
| 6 | Pipeline + customer depth | **screen** | grouping, views, relations | none |
| 7 | Nine reference managers | **screens** | tables + the sheet | cross-table formula reads |
| 8 | Registration as a priced line | screen | `constraints/registration.ts` | a priced line from a rule |
| 9 | Service quoting | capability | the whole quote machine | a second document kind |
| 10 | Rebates / promotions | capability | tables | time-bounded column override |
| 11 | Send by email | capability | — | infrastructure production also lacks |
| 12 | Reporting, audit, telemetry | screens | — | needs #1 and #2 first |

Note the shape: **items 1 and 2 gate half the list.** Nothing under "who did this",
"whose quote is this", "show me the team's pipeline" can be built before a person
exists in the model.

---

## 6 · A SECURITY OBSERVATION, FLAGGED NOT ACTED ON

`C:/Users/AsafA/HelmLogic/storage.rules` is, in full:

```
match /{allPaths=**} { allow read, write; }
```

**Every object in the production Storage bucket is world-readable *and* world-writable
by anyone who knows the bucket name** — which is in `src/firebase/config.ts` and
therefore in the shipped client bundle. This is the owner's own app; it is recorded
here because §7 depends on the read half of that rule, and the write half is a
liability that should be closed on its own account. Nothing was written. It joins the
two items already flagged in `hl-admin.md §7` (client-side `createUserWithEmailAndPassword`,
and the credentials in `scripts/`).

---

## 7 · THE IMAGES — the second ask, measured

> "can we migrate all images from HL to our system to the right parts"

**Yes. And while this audit was being written, a concurrent wave executed the largest
part of it — 112 photographs, by exact URL identity, off the dealership's own mirror.
This section states the recipe (so it can be checked), the arithmetic (so it can be
trusted), what remains, and one defect the migration introduced.**

Read §7.3 and §7.7 even if the rest is skimmed: they are the reason nothing here is
fabrication.

### 7.1 Where we stand — measured 2026-08-27, after the migration ran

Counting distinct image addresses in `src/demos/northside.ts`: **453.**

| | count | source |
|---|---|---|
| Drawn from our own origin | **220** | `public/seed-images` — 220 files, 9,141,262 bytes |
| — of those, fetched from the manufacturer's host | 108 | `via: "origin"` in `tools/seed/extracts/images.json` |
| — **of those, taken off HelmLogic's mirror of the same address** | **112** | `via: "mpf-mirror"`, each carrying `mirror` and `mirrorKey` |
| Measured and unavailable — "Held as a link" | **6** | 4 SharePoint, 1 Northside, 1 dead Stacer |
| Never measured — no answer of any kind yet | **227** | `NORTHSIDE_PICTURES.unmeasured`, `src/demos/northsideImages.ts:342` |

Before this wave: 108 held, 76 refused. **The refused set went from 76 to 6.**

### 7.2 What production holds — the census, from their own audit

`tasks/test-evidence/image-audit.json` (`meta`, 2026-07-03, `readOnly: true`):
**579 unique URLs · 3,056 references · 2,040 documents · 9 collections.**

| collection | docs with an image | refs | probe result |
|---|---|---|---|
| dealerFitSelections | 902 / 1,791 | 1,804 | 1,792 blocked · 6 ok · 6 SharePoint |
| boatVariants | 237 / 862 | 237 | **all 237 ok** — the colourway photographs |
| boatModels | 271 / 333 | 285 | 140 ok · 129 blocked · 12 data-URI · 4 dead |
| trailers | 467 / 496 | 467 | 161 ok · **306 SharePoint** |
| motorRows | 153 / 235 | 153 | 153 blocked |
| modelOverrides | 10 / 10 | 110 | 108 ok · 2 SharePoint |
| vendors · fitUpItems · fitUpPackages | 0 | 0 | — |

The 254 image files *inside* their repo are Playwright evidence screenshots. They are
not product photography and are not part of this.

### 7.3 The recipe — read from source, then verified

- **Key:** `hashlib.sha1(original_source_url.encode()).hexdigest()[:16]` —
  `scripts/mpf/mirror-motor-images.py:103`, `scripts/mpf/remediate-images.py:170`.
- **Path:** `mpf-mirror/{folder}/{sha16}.{ext}` — `mirror-motor-images.py:104`,
  `remediate-images.py:180`.
- **Folders — two, and they are by *failure class*, not by product kind:** `motors`
  (Yamaha CDN, `remediate-images.py:307`) and `dfo` (northsidemarine.com.au WAF-403,
  `:375`). **Boats have no folder of their own** — boat-model images that happened to
  sit on the Northside host went through the same call into `dfo`. The folder does not
  tell you what the picture is of. *(The brief warned not to assume motors' recipe
  covers hulls; the truth is the opposite of the worry — one recipe, two buckets, and
  the bucket means nothing.)*
- **Extensions observed:** `jpg` (167), `png` (42). The weserv path always yields `jpg`
  because it converts (`&output=jpg`, `mirror-motor-images.py:52`).
- **Bucket:** `studio-2290360004-3b963.firebasestorage.app` (`remediate-images.py:65`,
  annotated *"src/firebase/config.ts storageBucket"*).
- **URL:** `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{urlencoded path}?alt=media[&token=…]`.

**Verified, not assumed:** across all 209 recorded (source → mirror) pairs,
`sha1(url)[:16]` reproduces the object name **209 times out of 209**.

### 7.4 Why no credential was needed

The map is in **their repo**, not their database:

- `tasks/test-evidence/image-remediation.json` — `classes.yamaha.mirrors` (7) +
  `classes.nsm403.mirrors` (164) = **171 pairs**, each with a live download URL;
- `tasks/mpf-audit/apply-log-images.jsonl` + `apply-log-motor-images.jsonl` — **38
  further pairs**.

**Union: 209 distinct source URLs.** Their own retest line reads *"171/171 Storage URLs
verified 200 image/\*"*. And because `storage.rules` allows public read (§6), a mirror
object is reachable by its computed path. No Firestore, no credentials, no sign-in.

### 7.5 The arithmetic — what was available, and what was taken

Matching our seed's addresses against the 209:

| | count |
|---|---|
| Of the 76 refused — exact URL matches | **70** |
| Of the unmeasured — exact URL matches | **42** (33 Northside + 9 Yamaha) |
| **Newly obtainable, exact-URL, zero guesswork** | **112** |
| Overlap with images already held from origin | 36 (no action) |

**All 112 were taken.** `images.json` now carries 112 entries with `via: "mpf-mirror"`,
each recording `mirror` (the object) and `mirrorKey` (the sha1 prefix) beside the
original `url` — so a year from now nobody has to guess where a picture came from.

The residue is 6, and every one is a refusal production also could not solve:

| | count | why | production's own verdict |
|---|---|---|---|
| SharePoint | 4 | needs a sign-in | *"0/7 fetchable — 314 refs need NSM export"* |
| Stacer | 1 | 404 at origin | *"dead at origin… needs refreshed source assets"* |
| Northside | 1 | production never saw this URL | — |

### 7.6 WHAT REMAINS — and the sharpest finding in this audit

**A · 79 addresses we already own and throw away. This does not involve production
at all.**

`tools/seed/extracts/pd_dealerfit.json` is our own extract of the dealer-fit sheet. Its
header row declares column **AB = "Image Link"** (row `11`, key `AB`). The extract
holds **61 distinct image addresses**, on **881 of its 1,875 rows**.

**Not one of them reaches `src/demos/northside.ts`.** The generator drops the column.
Re-checked against the current seed after the migration ran: still 0 of 61.

Production reads the same workbook column and puts it on 902 of 1,791
`dealerFitSelections` docs — and **56 of our 61 are already in the mirror**, so the
bytes are a computed hash away. (The other five: 3 SharePoint, 1
`momentumelectricmarine.com`, 1 `static.wixstatic.com` — the last two ordinary
fetchable hosts.)

Two smaller cases of the same fault: `b2_data.json` carries **17** addresses that never
reach the seed (16 Stacer, 1 Northside); `t1_data.json` carries **1** (gfab).

So the largest remaining piece of "migrate all images to the right parts" is not a
migration: **fix the generator, and 881 dealer-fit rows gain the photograph the
dealer's own workbook already put on them.** That is `tools/seed/` — in scope, and
`CLAUDE.md`'s rule applies: change the generator, never the generated file.

One caveat to carry into that work: 899 production docs share 61 photographs — roughly
fifteen rows per picture. **These are category photographs the business itself reuses**,
not per-part photography. Reproducing that is honest; captioning one as a photograph
*of that part* would not be.

**B · 227 addresses nobody has asked about yet.** Hosts: highfieldboats 183 · stacer
26 · adventure.highfield 9 · mayfair 6 · gfab 4 · formosa 3 · stabicraft 1 (Northside
and Yamaha are now resolved). These are a re-run of `tools/seed/fetch_images.py` at the
new scale, against hosts that answer. Production is not involved.

**C · A defect the migration introduced, found while re-measuring.**

`NORTHSIDE_PICTURES.unmeasured` is emitted as **227** (`src/demos/northsideImages.ts:342`)
and `src/demos/northsideImages.test.ts:244` asserts **234**. `npm test` fails on it.
(Both files are open in the concurrent wave's working set; this is a live
disagreement, not a settled bug.)

**The test is right and the generator is wrong.** `images.json` holds 226 entries, but
**7 of them name Stacer addresses the seed no longer uses** — orphaned when the
catalogue went to full scale (`docs/plan/SEED_AT_FULL_SCALE.md §2.2`). The constant is
computed as `total − entries` (453 − 226 = 227) when the honest figure is
`total − entries-still-in-the-seed` (453 − 219 = 234). Verified both ways.

It is a small number and a real one: `unmeasured` is the count of addresses *nobody has
asked about*, and 7 of them are being silently reported as answered. The fix belongs in
`tools/seed/emit_images.py` — which the concurrent wave has open — not here. **Flagged,
not touched.** The same 7 orphans mean `public/seed-images` holds files nothing draws.

### 7.7 Why none of this is fabrication — and where the line is

The rule is that putting one boat's photograph on another boat's row is fabricating
business content. **Every one of the 112 is an exact URL match**, and that matters more
than it sounds:

> The row already names that address. Nobody chose a picture for a row — the
> *rendering* of an address the row already carries was replaced with a copy of the
> bytes that address served. `src/demos/northsideImages.ts:24-36` states the contract:
> the data still holds the manufacturer's address, `ImageRef.src` is unchanged, the
> export carries the address, and a frozen quote cites the same place. Only the display
> resolves locally.

The manifest's own `_meta.note` now says it in one line: *"Nothing is matched by
resemblance and nothing is substituted."*

**Where the line is, and it must not be crossed.** Production's audit exposes 220
unique broken URLs *with the document paths they sit on* — e.g.
`organisations/…/dealerFitSelections/gme-gx750bpk | imageLink`, where the document id
is a slugified part code. It is tempting to join production's images to our rows **by
part code** wherever our extract has no address. **Do not.** That is a different
operation with a different failure mode — a resemblance join, not an identity join —
and it needs a per-row proof and a human sign-off before a single picture moves. A 96%
hit rate that can be defended beats 100% that cannot.

Note that §7.6-A makes that temptation mostly moot: the addresses we are missing are
sitting in our own extract, keyed by our own row. The right join was never production's
to give us.

### 7.8 What is left, sized

| | What | Where | Yields |
|---|---|---|---|
| **A** | Carry the dropped image columns through the generator, then resolve the 56 mirrored ones by the §7.3 recipe | `tools/seed/gen_*.py`, `emit*.py`, `fetch_images.py` | **+79 addresses**; **881 dealer-fit rows** gain a picture |
| **B** | Re-run the fetch at full scale against hosts that answer | `tools/seed/fetch_images.py` | up to **+227** |
| **C** | Fix the `unmeasured` count to exclude orphaned entries; drop the 7 unused files | `tools/seed/emit_images.py` | `npm test` green; an honest counter |

Three disciplines the completed work already established and the rest must keep:

1. **Probe before trusting.** The mirror map was recorded 2026-07/2026-08. Objects can
   be deleted and tokens can rotate; every URL is verified `200 image/*` before a byte
   is written, and a failure stays "Held as a link".
2. **Record provenance on every file.** `via`, `mirror`, `mirrorKey` beside the
   original `url`.
3. **Never substitute.** A miss produces a reason, not a picture.

**Nothing in §7 was executed by this audit.** No fetch was made, no credential used, no
script in their repo run. Every number is from files on disk. The 112 mirror copies
were taken by a concurrent wave, and are reported here as measurement, not as work.

---

## 8 · NOT DETERMINED

- Whether the deployed HelmLogic sets `NEXT_PUBLIC_EMAIL_SEND_ENABLED=true`.
  `apphosting.yaml` has no `env` block; no `.env` is committed. Requires the Firebase
  console.
- Whether the **97 mirror objects nothing has yet asked for** are still present and
  publicly readable. 112 of the 209 were probed and taken on 2026-08-27 and are now on
  disk here; the rest are only as good as their recorded retest (171/171 · 200 ·
  `image/*`), which is theirs, at their date. Re-probe before relying on any of them.
- Whether any org has ever authored a WYSIWYG template, or whether `used-boats` /
  `website-listings` modules exist in production data. Both are live-data questions.
- The runtime contents of `modules/{id}/compatibilityRules` — Firestore-authored, not
  in the repo.
- How much of the `stock`, `serviceQuotes` and `contracts` machinery is actually used
  by the dealership, as opposed to merely shipped. Every screen in §1.3 and §1.6 is
  code that exists; usage is not in the repo.

---

## 9 · METHOD

**Read in `C:/Users/AsafA/HelmLogic` (read-only, nothing run, nothing written, no
authentication):** all 69 files under `src/app/**` (`page.tsx`, `route.ts`,
`layout.tsx`); `src/lib/nav-links.ts`, `telemetry.ts`, `email-send.ts`,
`render-quote-pdf.ts`, `content-blocks.ts`, `pdf-structure.ts`, `catalog/*.ts`;
`src/components/` headers and structure for the 60 largest components;
`proposal-view.tsx:700-1135` in full; `app-sidebar.tsx:130-170`; `storage.rules`;
`cors.json`; `scripts/mpf/mirror-motor-images.py` (whole), `remediate-images.py`
(header + `mirror_url`/upload/dispatch), `browser-harvest-motor-images.mjs`;
`tasks/test-evidence/image-audit.json`, `image-remediation.json`;
`tasks/mpf-audit/apply-log-images.jsonl`, `apply-log-motor-images.jsonl`.

**Read here:** `docs/plan/hl-journeys.md`, `hl-admin.md`, `hl-modules.md`,
`hl-navigation.md`, `our-substrate.md`; `src/features/*/` headers;
`src/demos/northside.ts`, `northsideImages.ts`; `src/lib/imageSources.ts`;
`tools/seed/extracts/*.json`.

**Counts** in §7.1, §7.5 and §7.6 are reproducible from `src/demos/northside.ts`,
`tools/seed/extracts/images.json`, `tools/seed/extracts/pd_dealerfit.json` and the two
production evidence files named above. The sha1 verification is 209/209 over the
recorded pairs.

**Nothing was modified in either repository by this audit.** `docs/audit/PARITY.md` is
the only file written. Not one line of source, of `tools/`, of `public/` or of
production was touched.

**Guards, honestly.** `npx tsc --noEmit -p tsconfig.app.json` → **0**.
`npm run build` → **clean**. `npm test` → **2 failures, neither of them this
audit's**: `src/demos/northsideImages.test.ts:244` and `:245` fail on the
`unmeasured` counter described in §7.6-C, which a concurrent wave introduced while
this document was being written. Both files — the test and the generated constant —
are in that wave's working set right now, mid-flight and disagreeing with each other.
On the arithmetic the test's 234 is right and the emitted 227 is wrong, and the fix is
one expression in `tools/seed/emit_images.py`. It is recorded here rather than repaired
here because none of those three files is this work's to edit.

**A note on the ground moving.** This audit began against a seed holding 108 pictures
with 76 refused. Between §1 and §7 a concurrent wave executed the mirror migration
described in §7.3–§7.5, taking the refused set from 76 to 6. §7 was re-measured after
that landed and states the present, not the past. Every other section is unaffected —
the production side of this document is a read of a repository that does not change.
