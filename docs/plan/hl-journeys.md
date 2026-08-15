# HELMLOGIC — THE TWO JOURNEYS, END TO END

**Lens:** catalog/browsing and quote, traced screen by screen through the production
code at `C:/Users/AsafA/HelmLogic` (read-only; nothing modified, nothing run, no
authentication attempted). Every claim carries a `file:line`. Where a fact could only
be learned by signing in or by reading the live Firestore, it is marked
**not determined**. Where I reasoned past the code, it is marked **INFERRED**.

This is research for the module plan the owner asked for. It is not a plan to copy
HelmLogic. Read alongside `docs/specs/HELMLOGIC_GROUND_TRUTH.md` (data model) and
`docs/specs/QUOTE_FINDINGS.md` (which §6 below corrects in four places).

---

## 0. THE HEADLINE, BEFORE THE DETAIL

Four things a plan should not have to discover twice:

1. **HelmLogic already has a "module" system, and it is the exact anti-pattern the
   owner is trying to escape.** An admin creates a module by typing a name and picking
   a type from a **hardcoded nine-item dropdown**
   (`src/app/(app)/modules/add/page.tsx:174-184`), then assigning a "Main Vendor"
   (`:189-216`). What the module *does* is then decided by a chain of seven
   `if (moduleType === …)` early-returns inside a single 2,077-line page component
   (`src/app/(app)/modules/[id]/page.tsx:620, 667, 728, 774, 817, 854, 887`). Two of
   the nine types (`used-boats`, `website-listings`) render literal
   *"Coming soon"* cards (`:960-988`). **The module type is code, not configuration.**
   Adding a tenth kind of module is a pull request.

2. **The catalog has no prices, no search, and no read-only product page.** The
   catalog browse is two card grids — ranges then models — showing an image, a name
   and a model code and nothing else (`:1950-2008`). Clicking a product opens a
   1,407-line **admin edit form** (`src/components/model-configuration-editor.tsx:309-316`
   → `src/components/highfield-model-editor.tsx:1383-1407`). There is no customer-facing
   or salesperson-facing product view anywhere in the app.

3. **The quote is thirteen screens with no draft.** `highfield-quote-flow.tsx` has
   zero `localStorage`, zero `sessionStorage`, zero autosave — verified by grep. The
   quote exists only in React state until "Finalize Project" writes it
   (`src/components/finalize-quote-dialog.tsx:661-662`). A refresh, a crash, or the
   "Exit Build" button (`highfield-quote-flow.tsx:2323`) destroys the whole build.

4. **A whole wizard step is write-only.** Step 6 of 7, "Administration", collects ten
   fields plus two toggles. All of them are written to the quote document
   (`finalize-quote-dialog.tsx:558-589`) and **read by nothing** — not the proposal
   view, not the PDF, not the print sheet, not the financials, not the contract.
   Details in §5.2.

---

## 1. THE MAP — WHERE A JOURNEY CAN START

Sidebar (`src/lib/nav-links.ts:17-51`), after role filtering
(`src/components/app-sidebar.tsx:135-161`):

| Label | Href | Gate |
|---|---|---|
| Dashboard | `/{orgSlug}/dashboard` | hidden for HelmLogic Admin |
| Sales ▸ Customers · Pipeline · Contracts · Reporting · My Work | `/customers` … | none |
| Catalog Manager | `/{orgSlug}/pricing-manager` | `can_access_pricing_manager` or Managing Director (`app-sidebar.tsx:140-145`) |
| Usage & Activity | `/usage` | `can_access_settings` |
| Feature Tracking | `/feature-tracking` | hidden for sub-dealers |
| Settings | `/{orgSlug}/manage` | `can_access_settings` |
| Admin ▸ Data Warehouse · Organisations · **Modules** · Agent Team | `/admin` … | `appRole === 'HelmLogic Admin'` |

Two structural facts fall straight out of that table:

- **`/modules` is admin-only.** A salesperson never reaches the module list from the
  nav. They reach a module by clicking its card on the org dashboard, which links to
  `/{orgSlug}/modules/{slug}` (`src/app/(app)/[orgSlug]/dashboard/page.tsx:77`). The
  dashboard is a drag-reorderable card grid persisted per user as
  `userProfile.moduleOrder`.
- **Nine routes have no inbound link anywhere in the repo.** Verified by grepping
  every `href`/`push` for each path: `/search`, `/quote-comparison`, `/audit-log`,
  `/suggestions`, `/real-time-tracking`, `/route-optimization`, `/data-connect`,
  `/vendor-data`, `/highfield`. They exist, they render, they are URL-only. **The
  app's only global search page is among them.**

---

## 2. JOURNEY A — CATALOG / BROWSING

### 2.1 The screens, in order

| # | Screen | Source | What it shows |
|---|---|---|---|
| 1 | Org dashboard | `app/(app)/[orgSlug]/dashboard/page.tsx` | Module cards: logo + name. Drag to reorder. |
| 2 | Module page → **Dashboard** tab | `app/(app)/modules/[id]/page.tsx:1364-1602` | 4 counters (in stock / on order / locations / proposals), 3 shortcut cards, "Recent Proposals" panel |
| 3 | Module page → **Catalog** tab, `view='ranges'` | `:1637-1645` → `RangesGrid` `:1794-1850` | 5-column grid of range cards: image + name |
| 4 | same tab, `view='models'` | `:1646-1654` → `ModelsGrid` `:1852-1899` | 5-column grid: image + model name + model code |
| 5 | same tab, `view='bmt'` | `:1655-1667` → `ModelConfigurationEditor` | The **edit form** (see 2.3) |

Note the tab is internally named `bmt` and labelled "Catalog" (`:1300`); the header
inside it reads "Catalog Explorer" (`:1612`). Three names for one surface.

### 2.2 Search, browse, filter — what actually exists

- **Ranges grid: no search, no filter, no sort control.** Order is a hand-maintained
  `order` integer written by drag-and-drop (`:1814-1828`), plus a hardcoded
  seven-entry fallback map of *Highfield's* range slugs baked into the page
  (`:189-192`, `RANGE_CATALOG_ORDER`). A different brand's ranges fall through to
  `order ?? 99`.
- **Models grid: no search, no filter, no price, no spec.** `ModelCard` renders
  exactly `coverImageUrl`, `name`, `modelCode` (`:1977-2009`).
- **No price appears anywhere in the catalog.** Not on a range card, not on a model
  card. The first price a salesperson sees is inside the quote flow.
- **The global search does not search products.** `GlobalSearch` queries three
  collections — `customers`, `quotes` (collectionGroup), `contracts` (collectionGroup)
  — and filters client-side (`src/components/global-search.tsx:26-53`). No boat, no
  motor, no trailer, no option is searchable. And the result rows are plain `<div>`s
  with no link and no click handler (`:90-98`) — **you can find a quote and then you
  cannot open it.**
- **The one searchable, filterable, tabular catalogue lives inside a pricing page.**
  `/pricing-manager` is titled "Catalog Manager" in its own `<h1>`
  (`src/app/(app)/pricing-manager/page.tsx:131`), mounts `BoatsTableView`,
  `MotorsTableView`, `TrailersTableView` (`:312-320`), and offers a cross-tab search
  that filters both the brand sidebar and the active table (`:218-228`). It is gated
  on `can_access_pricing_manager` (`:88, 108-125`). **A salesperson without pricing
  permission has no searchable catalogue at all.**
- `MotorModuleBrowser` (`src/components/motor-module-browser.tsx`, 201 lines) has
  **zero mount sites** in the repo. Dead surface.

### 2.3 The "product detail page" is an editor

`ModelConfigurationEditor` dispatches on a hardcoded vendor slug — five brands, one
`default: <p>Editor Not Available</p>` (`model-configuration-editor.tsx:309-316`),
with a matching switch for the Zod schema (`:77-85`). For Highfield it renders
`HighfieldModelEditor`, a two-column form of collapsible cards
(`highfield-model-editor.tsx:1383-1407`), in this order:

*Left:* Boat Variants & SKUs · Registration · Fit-Up Complexity · Standard Features ·
Specs · Motor Configurations · Trailer Assignments.
*Right:* Visual Assets (cover + gallery) · Factory Configurator · Documents · Rules.

Above it sit five tabs — Series Details · Motor Options · **Fit Up** · Trailer Options
· Dealer Fit Options (`model-configuration-editor.tsx:379-387`). The **Fit Up tab is
an empty placeholder** reading *"Assembly Console Ready"* / *"will be synchronized
here"* (`:478-487`). Trailer Options is a 22-line file that renders one imported
section (`src/components/trailer-options.tsx:16-22`).

Consequences worth naming:

- Everything a salesperson might want to *read* about a product — specs, standard
  features, variants, documents — is only reachable through a form built to *write*
  it, whose primary button says "Update Master" / "Update Config"
  (`model-configuration-editor.tsx:367-370`).
- Validation is deliberately non-blocking: `onValidationError` logs the errors and
  **saves anyway** (`:336-345`). The comment is honest about why — *"legacy data may
  have invalid fields we can't fix from here."*
- Non-admin edits do not patch the master. They `setDoc` (no merge) a **full document
  copy** into `organisations/{orgId}/modelOverrides/{modelId}` (`:268-275`). That
  copy is then re-merged at read time by `getEffectiveModel` — a function that exists
  **verbatim in three files**: `app/(app)/modules/[id]/page.tsx:158-186`,
  `app/(app)/modules/[id]/quote/[modelId]/page.tsx:19-51`, and
  `app/(app)/modules/[id]/ranges/[rangeId]/models/[modelId]/page.tsx:40-72`.

### 2.4 Images, variants, colourways, options

- **Images** are URLs on the doc: `range.imageUrl`, `model.coverImageUrl`,
  `model.galleryImageUrls[]`, per-option `imageUrl`, per-variant
  `variantOverrides[id].imageUrl` (`model-configuration-editor.tsx:72-74`). Uploads go
  to Firebase Storage. Cross-origin images are routed through `/api/image-proxy` at
  PDF-render time (`src/lib/render-quote-pdf.ts:20-24`). Dead image URLs are handled
  by hiding the `<img>` on `onError` and revealing a `Ship` icon sibling
  (`app/(app)/modules/[id]/page.tsx:1956, 1994`).
- **Variants and colourways are not browsable.** They are listed inside the editor
  (`VariantsSection`, `highfield-model-editor.tsx:410-433`) and *chosen* only inside
  the quote flow's step 1. The material axis is derived at runtime from the distinct
  `variant.material` values (`highfield-quote-flow.tsx:793-796`); when no variant
  carries a material, the picker is skipped and every variant becomes a directly
  selectable "colour" (`:798-809`).
- **Option → option pairing is enforced by hiding.** On step 2 the Seats category is
  hidden entirely unless a Console is selected; when a console has a paired seat, only
  that seat renders and it is locked (`highfield-quote-flow.tsx:2596-2627`). Good
  behaviour, but it lives in the quote, not the catalog — the catalog never shows a
  customer what pairs with what.
- **The compatibility rule engine warns, never blocks**
  (`highfield-quote-flow.tsx:2562-2590`, banner text "Compatibility warnings"). Its
  rules have no authoring UI — the comment at `:2564-2566` defers hard-blocking to
  "v1.10 candidate once admin authoring lands", which
  `HELMLOGIC_GROUND_TRUTH.md:802-804` records as never shipped.

### 2.5 Compare, save, share

- **Compare products: does not exist.** The only comparison in the app compares
  *quotes* (`src/components/quote-comparison.tsx`), and it is on an unlinked route.
- **Save / favourite / shortlist a product: does not exist.**
- **Share a product: does not exist.** There is no public product URL. The public
  surface that does exist is a pricing-locked embed of the *quote* flow
  (`publicPricing` prop, `highfield-quote-flow.tsx:266-270`, "Build-A-Boat on the NSM
  website").

### 2.6 Catalog friction — named and cited

| # | Friction | Evidence |
|---|---|---|
| C1 | No product search anywhere a salesperson can reach without pricing permission | `global-search.tsx:26-53`; `pricing-manager/page.tsx:88` |
| C2 | Search results are not clickable | `global-search.tsx:90-98` |
| C3 | The search page itself has no inbound link | grep of `/search` across `src/` returns only its own page file |
| C4 | No price on any catalog card | `modules/[id]/page.tsx:1950-2008` |
| C5 | Product detail = admin form; no read view | `model-configuration-editor.tsx:377-501` |
| C6 | Catalog ordering is manual drag + a hardcoded Highfield map | `modules/[id]/page.tsx:189-192, 1814-1828` |
| C7 | Five brand editors + a slug switch; unlisted brands get a bare schema | `model-configuration-editor.tsx:77-85, 309-316` |
| C8 | Fit-Up tab is a placeholder that looks like a feature | `model-configuration-editor.tsx:478-487` |
| C9 | `getEffectiveModel` triplicated — three merge implementations to keep in sync | three files, cited in §2.3 |
| C10 | Org edits write a full document copy, not a delta | `model-configuration-editor.tsx:268-275` |
| C11 | Validation errors are logged and the save proceeds | `model-configuration-editor.tsx:336-345` |
| C12 | Dead browse component still in the tree | `motor-module-browser.tsx` (0 mounts) |

---

## 3. JOURNEY B — QUOTE: EVERY SCREEN, IN ORDER

### 3.1 The count

**Thirteen screens** from "a customer wants a price" to a saved proposal, plus one
more action to produce the document. Seven of the thirteen are wizard steps.

| # | Screen | Route / component |
|---|---|---|
| 1 | Org dashboard (module cards) | `/{orgSlug}/dashboard` |
| 2 | Module page, Dashboard tab → **New Quote** | `modules/[id]/page.tsx:1464-1473` |
| 3 | Dialog pane 1 — *"1. Select Product Range"* | `QuoteInitializationDialog`, `:256-284` |
| 4 | Dialog pane 2 — *"2. Choose Boat Series"* (+ model search) | `:285-326` |
| 5 | **Step 1 — Boat Base** | `/modules/{id}/quote/{modelId}?range=&vendor=` (`:handleQuoteInitialization`) |
| 6 | Step 2 — Factory Options | `highfield-quote-flow.tsx:2560` |
| 7 | Step 3 — Motor | `:2715` |
| 8 | Step 4 — Trailer *(skipped when the model has no trailer)* | `:3038`, skip at `:1722` |
| 9 | Step 5 — Dealer Fit (+ Fit-Up) | `:3313` |
| 10 | Step 6 — Administration | `:3503` |
| 11 | Step 7 — Summary | `:3753` |
| 12 | **Finalize Project** dialog | `finalize-quote-dialog.tsx:854-1046` |
| 13 | Proposal view | `/modules/{id}/proposals/{quoteId}` (`finalize-quote-dialog.tsx:733`) |
| +1 | Preview sheet / **Download PDF** | `proposal-view.tsx:1111-1131` |

Step ids are declared at `highfield-quote-flow.tsx:186-196` — this confirms
`QUOTE_FINDINGS.md`'s list exactly. A second, reduced list `MOTOR_ONLY_STEPS`
(`:202-207`) reuses the same component and the same step ids for motor-only quotes
entered at `/modules/{id}/motor-quote`.

**The stepper is not navigable.** Each step marker is a plain `<div>` with no click
handler (`:2304-2317`). Movement is Next/Back only (`:4121-4122`). To change the hull
colour from the Summary you press Back six times.

### 3.2 Step by step — chosen / typed / computed

**Step 1 — Boat Base** (`:2473-2559`)
- *Chosen:* Tube Material (card buttons, derived from distinct `variant.material`);
  Hull & Tube Colour (card buttons = the variants for that material); boat registration
  from the Rego module picker (`RegoPicker`, auto-match on hull length, `:2515-2521`);
  legacy rego / sticker / "Tender To" toggles when no rego snapshot exists
  (`:2522-2550`); factory promotions band (`:2557`).
- *Computed:* the active variant, and with it the whole price basis.
- **This is the only hard gate in the flow.** `nextStep` refuses to advance without a
  variant and explains why: *"the price is built from that exact configuration"*
  (`:1712-1719`). Everything else warns.

**Step 2 — Factory Options** (`:2560-2714`)
- *Chosen:* options as toggle cards grouped by category (`:2596-2662`), with the
  console/seat pairing rule described in §2.4.
- *Typed:* free-text custom options — label, sell price, description — appended to the
  build (`:2669-2711`).
- *Warned, not blocked:* compatibility violations banner (`:2566-2590`).

**Step 3 — Motor** (`:2715-3037`)
- *Chosen:* a motor from the curated NSM menu (`NsmMotorMenuSection`, `:2774-2781`)
  or from the grid; then motor accessories; then a "Prop Comes Standard" toggle
  (`:2950-2960`).
- *Computed, and this is where it gets fragile* (`:1822-1985`):
  - the motor brand is `allVendors.find(v => … v.vendorType === 'Motor Brand')` —
    **the first match wins; one motor brand per module, silently** (`:1829`);
  - the dataset is the first sheet whose name *contains* "outboard" or "motor", else
    `datasets[0]` (`:1834`);
  - prices are read by Excel header string — `row['NSM Retail']`, `row['Store Price']`,
    `row['Trade Price']`, `row['Commercial Price']` (`:1862-1879`);
  - **only `motorConfigurations[0]` is ever used** (`:1947`). A model offering both
    Single and Twin shows only the first. The twin option is unreachable.
  - **if `motorConfigurations` is empty the step shows an empty grid** with no
    explanation (`:1945`);
  - `hasConsole` is computed at `:1956` and **never used** — dead code on the hot path.
- *Curated-menu resolution is string matching.* Each slot's `motorName` is resolved
  against the loaded motors by exact → lowercase → contains-after-`" - "`
  (`:2112-2131`). **This exact citation in `QUOTE_FINDINGS.md` §1 is correct.** What
  that document missed: the same pattern repeats four more times in the same file —
  trailer menu (`:2162-2178`), dealer-fit lines (`:2189-2201`), rigging kit
  (`:2233-2245`), and the motor display label itself (`:2085-2095`).
- *Motor search exists only in motor-only mode* (`:2875-2885`, `gridMotors` at
  `:1225-1236`). In a boat quote the grid is unsearchable and unsorted.

**Step 4 — Trailer** (`:3038-3312`) — skipped entirely when `hasTrailer` is false
(`:1677, 1722, 1738`).
- *Chosen:* one of `model.trailerAssignments[]` as cards; the NSM curated trailer menu
  above them (`:3072-3083`); trailer hardware options; trailer registration.
- *Typed:* custom trailer options.
- **There is no catalog browse on this step.** The comment says so outright:
  *"No catalog browse button — operators assign trailers in the boat model editor"*
  (`:3085-3088`). If the needed trailer is not pre-assigned, the salesperson must
  abandon the build (losing it — §3.4), edit the model, and start again.

**Step 5 — Dealer Fit** (`:3313-3502`)
- *Chosen:* dealer-fit selections and packages as cards, with an expander showing
  package components inline (`:3432-3457`); fit-up items via `FitUpQuoteSelector`
  (`:3481-3500`).
- *Filtered:* a search box, category chips, and a **"Show all items"** escape hatch
  with an honest count of what relevance rules hid (`:3330-3382`). This is the best
  interaction in the whole flow, and it is the pattern to keep: narrow by default,
  never hide irreversibly, always say how much is hidden.

**Step 6 — Administration** (`:3503-3752`)
- *Typed:* boat rego number, trailer rego number (`:3537-3546`); trade-in description
  and agreed value (`:3641-3667`); insurance requested + notes (`:3671-3692`);
  finance requested + notes (`:3696-3717`); estimated delivery date + timing notes
  (`:3721-3747`).
- *Chosen:* NSM 6 Year Extended Warranty; Direct Debit Service Plan (`:3551-3581`).
- *Uploaded:* customer driver's licence, image or PDF (`:3583-3627`).
- *Recap only:* the rego chips repeat step 1 and step 4 with the note *"Pricing for
  these selections is set on the Boat Base and Trailer steps"* (`:3535`).
- **Every field on this step is write-only. See §5.2.**

**Step 7 — Summary** (`:3753-4117`)
- Read-only card stack: Base Vessel, options, motor, trailer, dealer fit, fit-up,
  applied promotions, deposit schedule.
- *Per-section PDF attachment* is possible here (`:3759`), stored under
  `quotes/{id}/section-pdfs/{section}.pdf` at finalize
  (`finalize-quote-dialog.tsx:713-727`).
- *Deposit schedule* renders only when the model carries `depositSchedule` or
  `leadTimesDays` (`:4106-4112`).
- **The "never render a missing price as a number" rule is real and good**: an
  unresolvable hull price prints *"Not priced at this level"* in an amber pill instead
  of `$0` (`:3771-3779`).

**Screen 12 — Finalize Project dialog** (`finalize-quote-dialog.tsx`)
- *Chosen:* mode — Customer Proposal or Save as Stock (`:886-928`).
- *Typed:* **customer name, email, phone, company, address — five free-text inputs**
  (`:936-972`). Name is required; email *or* phone is required; email shape is regex-
  checked (`:636-652`).
- **The customer is not picked from the customer list.** `CustomerPicker` is imported
  into this very file and used — but only in the *stock* branch, to allocate a stock
  unit (`:1018-1022`). The proposal branch types the customer from scratch, every
  time, with no lookup and no dedupe. Nothing writes the typed customer back to the
  `customers` collection (grep of the finalize writes: `:661-828`).
- *Computed:* quote number = `${orgCode}-Q${base36(now)}${random3}` (`:186-190`) —
  **not sequential, not guaranteed unique by construction, not human-orderable**.
- *Gate:* the margin threshold. Below `organisation.marginThresholdPct` without
  `can_override_margin` → blocked with a toast; with the permission → an override
  dialog demanding a reason (`:603-634`). **That reason is written to
  `window.__marginOverrideAudit` and to nothing else** (`:1087`) — `QUOTE_FINDINGS.md`
  §3.5 is correct.
- *Write:* `users/{uid}/quotes/{autoId}` (`:661-662`), plus two audit-log events
  (`:669-680`), plus a rebate sales record when applicable (`:686-710`), plus a
  best-effort SharePoint sync (`:735-745`).

### 3.3 Where the quote lives, and who can see it

**Quotes are stored per user, not per organisation:** `users/{uid}/quotes/{quoteId}`
(`finalize-quote-dialog.tsx:661`). Everything downstream pays for that:

- The module dashboard's "Recent Proposals" panel queries
  `users/{uid}/quotes` ordered by `createdAt`, limit 20
  (`modules/[id]/page.tsx:448-455`) — **with no `moduleId` filter**. A Highfield module
  shows your Yamaha motor quotes. And it shows only *yours*: a colleague's quote on
  the same module is invisible.
- The proposals list page tries an org-wide `collectionGroup('quotes')` overlay but
  runs it `{ silent: true }` and falls back to the user-scoped list
  (`modules/[id]/proposals/page.tsx:50-66`). If the composite index is not deployed the
  page silently shows one person's quotes and says nothing.
- `/proposals/{quoteNumber}` resolves the number **only within the current user's
  subcollection** (`app/(app)/proposals/[quoteNumber]/page.tsx:29-35`). A quote-number
  URL shared with a colleague renders "Proposal … not found".

### 3.4 No drafts — the single most damaging friction

Grep of `highfield-quote-flow.tsx` for `localStorage`, `sessionStorage`, `draftQuote`,
`autosave`: **zero hits.** There is no "save draft", no resume, no recovery.

The build lives in ~40 `useState` hooks (`:337-500`) and dies with the tab. The
"Exit Build" pill routes away with no confirmation (`:2323`). A salesperson who
discovers on step 4 that the right trailer was never assigned to the model has exactly
two options: finish a wrong quote, or throw away everything and start over.

### 3.5 Revisions, versions, expiry, approval, conversion

**Lifecycle** (`src/lib/quote-lifecycle.ts:56-71`): `draft · sent · viewed · accepted ·
rejected · lost · expired`. Deliberately an **open graph** — any state to any state,
operator-picked, audited rather than enforced (`:39-43`). Kept orthogonal to
`status: 'proposal' | 'stock'` (`:32-36`), which is the right instinct.

**Locking**: first send auto-locks the quote (`src/lib/email-send.ts:399-412`).
A locked quote can still change lifecycle state; the lock gates content edits only
(`quote-lifecycle.ts:3-7`). Post-lock modification is by **Variation**
(`proposal-view.tsx:1077-1089`).

**Scenarios**: a sibling quote under the same root, spawned from the proposal view
(`proposal-view.tsx:1095-1105`). **Duplicate/fork**: `?duplicate=` on the quote route
re-seeds the whole flow from a `DuplicateInitialState`
(`highfield-quote-flow.tsx:224-248`) and opens directly on step 7 (`:337`).

**Expiry — the sharpest single correction to `QUOTE_FINDINGS.md`.** A complete,
well-documented expiry module exists (`src/lib/catalog/quote-expiry.ts`): 30-day
default, org override `defaultQuoteValidityDays`, four bands, timezone-aware
formatting, and a documented contract that expired quotes cannot be sent or converted
(`:13-18`).

- `nextExpiryDate()` has **zero callers**. `expiryAt` is **never written**. Verified by
  grepping all of `src/`: the only hits are the three read sites in `proposal-view.tsx`
  (`:1028, 1141, 1147`).
- Therefore `evaluateExpiry` always returns band `'no-expiry'` (`quote-expiry.ts:47-49`),
  the banner never renders (`proposal-view.tsx:1142`), and the Send and Convert gates
  that check it never fire (`:1031-1037`).
- **But the customer-facing document prints an expiry anyway.** Both the PDF and the
  print sheet compute `validUntil = createdAt + 30 days` at render time from a bare
  literal (`proposal-pdf.tsx:510`, `proposal-print.tsx:54`) and print
  *"Valid until 23 Jun 2026"* (`proposal-pdf.tsx:1416`). **The document promises a
  deadline the system does not hold, cannot enforce, and cannot change.**

**Approval**: one gate only — the margin threshold at finalize (§3.2). There is no
manager review, no approval queue, no second signature on a quote.

**Conversion to contract**: available from the proposal view once the quote is
`sent | viewed | accepted`, not expired, not already converted
(`proposal-view.tsx:1027-1056`). Contracts get deposits
(`contract-detail-sheet.tsx:73`) and a signing pack. Because the lifecycle graph is
open, "sent" can be set by hand — which is the only way to reach Convert while email
is off (below).

### 3.6 Output: print, PDF, email

- **PDF — yes, and it is the one genuinely consolidated pipeline in the app.**
  `renderQuotePdf` (`src/lib/render-quote-pdf.ts`) is a single source used by download,
  preview and send: resolve org content blocks with brand-override fallback → resolve
  sub-headers → preload every image as a base64 data URL (cross-origin via
  `/api/image-proxy`) → swap URLs → render `<ProposalPDFDocument>` via
  `@react-pdf/renderer` (`:14-30`). It is client-side and re-renders on every call
  (`:31-33`).
- **Print — yes.** `proposal-print.tsx`, a separate HTML print layout that builds
  **its own line-item list** (`:57-60`).
- **Email — plumbed end to end, and off.** `sendQuoteEmail` renders the PDF, uploads
  it, writes a `mail/{id}` doc for the Firebase Trigger Email extension, writes a
  frozen `sentEmails` audit record, denormalises `lastSentAt`/`sentCount`, logs the
  audit event, auto-locks on first send, and transitions lifecycle to `sent`
  (`src/lib/email-send.ts:294-448`). The Send button is disabled by
  `isEmailSendEnabled()`, which reads `NEXT_PUBLIC_EMAIL_SEND_ENABLED`
  (`:465-468`), with the tooltip *"Email sending is awaiting infrastructure setup
  (sender domain + provider)"* (`proposal-view.tsx:1001-1002`). The file's own header
  says why: four unresolved stakeholder questions — sender domain, provider, cost
  ownership, reply-to (`:10-21`). `apphosting.yaml` in the repo has **no `env` block at
  all** — every line is commented out. Whether the running deployment sets the flag in
  the Firebase console is **not determined** (that would require signing in).
  **INFERRED, from the repo alone:** the button renders disabled, so first-send
  auto-lock and the automatic lifecycle transition to `sent` never fire, and every
  quote must be marked sent by hand.

### 3.7 Quote friction — named and cited

| # | Friction | Evidence |
|---|---|---|
| Q1 | No draft, no autosave, no resume — the build dies with the tab | grep: zero storage APIs in `highfield-quote-flow.tsx` |
| Q2 | Step 6 is entirely write-only (10 fields + 2 toggles) | §5.2 |
| Q3 | The customer is typed free-text although a picker sits in the same file | `finalize-quote-dialog.tsx:936-972` vs `:1018-1022` |
| Q4 | Customer typed on the quote is never written to `customers` | `finalize-quote-dialog.tsx:661-828` |
| Q5 | The stepper is display-only; navigation is Next/Back through all seven | `:2304-2317`, `:4121-4122` |
| Q6 | Registration is asked twice — step 1 prices it, step 6 recaps it | `:2508-2552` vs `:3512-3548` |
| Q7 | Trailer step cannot browse the trailer catalogue | `:3085-3088` |
| Q8 | Only `motorConfigurations[0]` is used — twin rigs unreachable | `:1947` |
| Q9 | Empty motor grid with no explanation when the model has no config | `:1945` |
| Q10 | Motor grid has no search in boat mode | `:1225-1226, 2875` |
| Q11 | PD tier is `pdTiers[0]` — never chosen, always priced in | `:1206-1209, 1259` |
| Q12 | Curated menus join by display-name string in five places | `:2085, 2112, 2162, 2189, 2233` |
| Q13 | Quotes stored per user; module dashboard shows *your* last 8, unfiltered by module | `finalize-quote-dialog.tsx:661`; `modules/[id]/page.tsx:448-455` |
| Q14 | Org-wide quote list falls back silently to user-scoped | `modules/[id]/proposals/page.tsx:50-66` |
| Q15 | A shared quote-number URL only resolves for its creator | `proposals/[quoteNumber]/page.tsx:29-35` |
| Q16 | Quote number is random base36, not sequential | `finalize-quote-dialog.tsx:186-190` |
| Q17 | Margin-override reason goes to a window global | `finalize-quote-dialog.tsx:1087` |
| Q18 | Expiry module exists, is never written, and the PDF prints one anyway | §3.5 |
| Q19 | Email off; send-dependent lock + lifecycle never fire | §3.6 |
| Q20 | Price levels are hardcoded `<option>` tags in JSX | `:2414-2432` |
| Q21 | "What is this quote worth" has five field chains, three resolving to $0 | §5.1 |
| Q22 | A field named `sellPriceExclGst` holds inc-GST money under `display-sheet-v2` | `src/lib/quote-financials.ts:8-16, 42-66` |
| Q23 | Which pricing convention applies is decided by whether the importer wrote three fields | `:1198-1205` |

---

## 4. THE ONE PATTERN WORTH STEALING

Step 5's curation toolbar (`highfield-quote-flow.tsx:3326-3382`) is the single
interaction in either journey that is unambiguously right, and it is right for a
reason we should encode as a rule:

- narrow the 1,791-row pool to what fits *this* build, by rules;
- put the rules' **name and reason in a tooltip**, in the operator's words
  (*"wrong HP band, wrong length, wrong tube material, workshop-only operations"*);
- keep a **search** that ignores the narrowing;
- keep a **"Show all items"** toggle that turns the narrowing off entirely;
- and **state the count of what was hidden** (`:3373-3380`).

A filter that can explain itself, be searched past, and be switched off is the shape
every "curated by rule" surface in our modules should take. The rest of the app's
curation — the HP window, the console/seat hiding, the trailer-assignment gate — hides
silently and offers no way back.

---

## 5. TWO FINDINGS THAT DESERVE THEIR OWN SECTION

### 5.1 "What is this quote worth" is answered five different ways, three of them $0

The finalize payload writes `totalPriceExclGst` / `totalPriceIncGst`
(`finalize-quote-dialog.tsx:531-535`) and `finalPriceExclGst` / `finalPriceIncGst`
(`:594-599`). The inc-GST pair is **`null` unless `pricingConvention ===
'display-sheet-v2'`**. It never writes `totalInclGst`, and it never writes a
`financials` object — verified by grep; `financials` exists only as a render-time
prop.

Yet three surfaces read exactly `q.financials?.totalInclGst ?? q.totalInclGst`:

- `quote-comparison.tsx:21-23` — **every compared quote shows $0**;
- `app/(app)/my-work/page.tsx:69` — same;
- `customer-detail-sheet.tsx:183` — same.

Only `reporting-dashboard.tsx:34-44` walks the full chain down to
`finalPriceIncGst → totalPriceIncGst → finalPriceExclGst → totalPriceExclGst × 1.1`,
and its own comment says why: *"so the table doesn't render $0 for every real quote."*

Meanwhile the number is **summed independently** in at least four places: the running
total in the flow (`highfield-quote-flow.tsx:1254-1298`), `buildDisplaySheetFinancials`
and `buildLegacyFinancials` (`quote-financials.ts:18-23` dispatching to two bodies),
and the print sheet's own `lineItems` (`proposal-print.tsx:57-60`). Adding one new
chargeable thing means editing all of them.

`quote-comparison.tsx:80` compounds it: the "Boat" row reads
`q.variant?.name ?? q.model?.name`, but the payload writes `modelName` at the top level
and `variant.name` is the *colourway* (`finalize-quote-dialog.tsx:262, 271`). The
comparison labels each quote by its colour.

### 5.2 The Administration step is write-only — all of it

Step 6 collects twelve things. `finalize-quote-dialog.tsx:558-589` writes them onto the
quote as `dealerServices { extendedWarranty, servicePlan }` and
`adminDetails { regoNumbers{boat,trailer}, driversLicenceUrl, tradeIn{description,value},
insurance{requested,notes}, finance{requested,notes}, timing{estimatedDeliveryDate,notes} }`.

A repo-wide grep for each key finds:

- `adminDetails` — three files: the writer (`finalize-quote-dialog.tsx`), the payload
  source (`highfield-quote-flow.tsx:4305-4313`), and a test fixture
  (`lib/sample-quote-fixture.ts:105, 377`, both `{}`).
- `dealerServices` — the same two production files.
- `driversLicenceUrl`, `regoNumbers`, `wantsInsurance`, `insuranceNotes`, `wantsFinance`,
  `financeNotes`, `timingNotes`, `boatRegoNumber` — **no consumer at all**.
- `tradeIn` — the only other hits are an unrelated `tradeInRule` setting on
  `customer-defaults-card.tsx:30` and a `customer.tradeIn` field on
  `customer-detail-sheet.tsx:157`. **Nothing on the quote reads it.**

So: a salesperson types an agreed trade-in value, ticks "I would like a Finance
Quote", writes finance notes, sets a delivery date, uploads the customer's driver's
licence — and none of it appears on the proposal, on the PDF, on the print sheet, in
the totals, or on the contract. `QUOTE_FINDINGS.md` §3.6 called out the trade-in.
The truth is larger: **the whole step produces no output.** It is a form that files
into a drawer nobody opens.

---

## 6. CORRECTIONS TO `docs/specs/QUOTE_FINDINGS.md`

| Claim | Verdict |
|---|---|
| §1 — 13-slot menu, each leg a display-name string resolved exact → lowercase → contains-after-`" - "`, cited `highfield-quote-flow.tsx:2112-2131` | **Confirmed, exact.** Deepen it: the same pattern recurs at `:2085` (motor label), `:2162` (trailer menu), `:2189` (dealer-fit lines), `:2233` (rigging kit). Five string joins, not one. |
| §2.7 — "Hard-gate only the step that sets the price" | **Confirmed.** `:1712-1719`, one gate, with the reason shown. |
| §2.6 — "Never render a missing price as a number" | **Confirmed.** `:3771-3779`, amber "Not priced at this level" pill. |
| §3.4 — "No line-item model … four independent summations" | **Confirmed and raised to five representations.** See §5.1: three read sites resolve to $0 because `financials` and `totalInclGst` are never persisted. |
| §3.5 — margin-override reason → `window.__marginOverrideAudit` | **Confirmed**, `finalize-quote-dialog.tsx:1087`. |
| §3.6 — "Expiry never set (every quote is 'no-expiry')" | **Correct but incomplete, and the omission matters.** `nextExpiryDate` has zero callers and `expiryAt` is never written — so yes, always `'no-expiry'`. But the PDF and print sheet compute and print `createdAt + 30 days` from a bare literal (`proposal-pdf.tsx:510`, `proposal-print.tsx:54`, rendered at `:1416`). **The customer is given an expiry date the system does not know about.** |
| §3.6 — "trade-in captured on boat quotes and never subtracted" | **Correct but far too narrow.** It is not one field, it is the entire Administration step — twelve values, zero consumers. See §5.2. |
| §3.6 — "`quote-versioning.ts` has zero callers" | **Confirmed.** Only referenced by `tests/v1.25-everything.spec.ts:33-35`, which asserts the file *exists* and reads its text. |
| §3.7 — "`GST_MULTIPLIER = 1.1` re-hardcoded as a bare literal in seven files" | **Partly confirmed, count is different.** `GST_MULTIPLIER` is declared once (`src/lib/catalog/derive-pricing.ts:24`). A bare `* 1.1` appears in **six** files: `highfield-quote-flow.tsx`, `proposal-view.tsx`, `reporting-dashboard.tsx`, `stock-item-detail.tsx`, `lib/quote-financials.ts`, `lib/sample-quote-fixture.ts`. |
| §3.7 — "Price levels hardcoded in six places" | **Confirmed and extended.** Add a seventh: the level list is inline `<option>` markup in the quote flow itself, `highfield-quote-flow.tsx:2414-2432` — six for boats, four for motors. |
| §3.1 — "a designer nothing renders" | **Confirmed.** `organisations/{orgId}/templates` is written by `organisations/[id]/page.tsx:104-120` and read only by its own editor page `modules/[id]/templates/[templateId]/page.tsx:450`. `renderQuotePdf` resolves **content blocks** (`render-quote-pdf.ts:70-77`), never templates. |
| §2.9 — deposit stages "in the business's words" | **Confirmed present but conditional.** The card renders only when the *model* carries `depositSchedule` or `leadTimesDays` (`highfield-quote-flow.tsx:4106-4112`). |
| Steps `Boat Base → Factory Options → Motor → Trailer → Dealer Fit → Administration → Summary` | **Confirmed**, `highfield-quote-flow.tsx:186-196`. |

---

## 7. WHAT THIS MEANS FOR OUR MODULE PLAN

Stated as constraints the plan must satisfy, each traceable to something above. Not a
design — the design is the next document.

1. **A module type must be data, not a `switch`.** HelmLogic's nine types are an enum
   in a form (`modules/add/page.tsx:174-184`) and seven early-returns in a page
   (`modules/[id]/page.tsx:620-887`). Ours must express "what can be done in this
   module" as configuration a dealer edits, or we have rebuilt the same wall.
2. **Browse and edit are two different products.** Every catalog screen in HelmLogic
   is an admin form wearing a catalog's clothes. A module needs a *read* surface with
   price, spec and image before it needs an *edit* surface.
3. **Search is a module capability, not a page.** The one product search in HelmLogic
   is inside a permission-gated pricing page; the one global search is unlinked and
   its results are not clickable. Search belongs to the module that owns the data, and
   every result must be a link.
4. **The quote must have a draft from the first click.** Not autosave as a nicety —
   the absence of it is the worst thing in HelmLogic's quote journey and it is
   invisible until it costs someone an hour.
5. **Every field on a quote must have a named consumer before it ships.** Step 6 is
   the cautionary tale: twelve inputs, zero outputs, shipped. A field with no reader is
   a lie told to the person filling it in.
6. **One money model, derived once, snapshotted at commit.** Five field chains, three
   of which resolve to $0, is what happens without it.
7. **Curation must explain itself, be searchable past, and be switchable off**, with
   the hidden count shown — the step-5 pattern (`:3326-3382`), applied everywhere.
8. **The document's promises must be the system's promises.** If a quote prints
   "Valid until", the system must hold that date, enforce it, and let a dealer change it.
9. **Relations are links, never display-name strings.** Five string joins in one file
   is the cost of the alternative.
10. **Scope quotes to the organisation, not the person.** `users/{uid}/quotes` is why
    a colleague cannot open a quote and why a shared URL 404s.

---

## APPENDIX — WHAT I COULD NOT DETERMINE

- Whether the deployed environment sets `NEXT_PUBLIC_EMAIL_SEND_ENABLED=true`. The
  repo's `apphosting.yaml` has no `env` block; no `.env` file is committed. Would
  require signing in to the Firebase console. **Not determined.**
- Whether the org-wide `collectionGroup('quotes')` composite index is deployed in
  production. `firestore.indexes.json` is present in the repo but the deployed state
  is **not determined**; the code is written to fail silently either way
  (`modules/[id]/proposals/page.tsx:62`).
- Real usage data — how many quotes reach `accepted`, how often Variation or Scenario
  is used, whether anyone reaches `/search` by URL. All live-data questions. **Not
  determined.**
- Whether `modelOverrides` written from the `direct-access` model page
  (`ranges/[rangeId]/models/[modelId]/page.tsx:164`, which passes a fabricated
  `module = { id: 'direct-access' }`) behave correctly in the Dealer Fit tab, which
  keys off a real module id. Reading the code, they cannot — but that is **INFERRED**,
  not observed.
