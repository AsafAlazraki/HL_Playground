# TENANCY — how one organisation becomes many

**Status: a design document, not a plan of record.** One thing in it is built —
saving and opening an organisation's configuration (`src/features/tenancy/`).
Everything else is written down so the shape of the work is visible before
anybody commits to it. Where something does not exist, this says so.

The brief this answers, verbatim:

> "let's simplify for now. We know we need the functionality for new customers
> with new tenancies etc. and to be able to manage them in a seperate admin app.
> But load and save northside marine config please."

> "we need to start also considering the design of the system that manages the
> entire app for multiple customers. so we can create a new customer and manage
> them etc (we will focus on this a lot more later)"

So: the simple thing is done, and the seam is written down.

---

## 1 · WHERE THE APP IS TODAY, MEASURED

**There is one organisation and it is a string on a snapshot.** Not a record, not
a key, not an account. `OrgProfile` (`src/types/model.ts:438`) is three fields —
`name`, `industry`, `createdAt` — and it lives *inside* the single project
snapshot as `ProjectMeta.org`. It is set once, by onboarding, and the whole app
is gated on it: `Shell.tsx` shows the wizard when `!meta.org && tableCount === 0`.

**`AppUser.orgSlug` exists and almost nothing reads it.** `features/auth/session.ts`
seeds one operator carrying `orgSlug: 'northside-marine'` and `orgName:
'Northside Marine'`, and its header is honest about why: *"Multi-tenancy is
coming. A signed-in user belongs to an ORGANISATION, and the seam where that is
decided has to exist before the admin app can be built against it."* Until this
feature, the only reader of that field was the dashboard's greeting.

**And that is the first real problem: there are two tenant keys, and they
disagree.**

| key | what it is | who uses it |
|---|---|---|
| `AppUser.orgSlug` | `'northside-marine'` — a stable identifier | the session, and `features/tenancy` |
| `orgKeyOf(meta)` | `meta.org.name.trim().toLowerCase()` — `'northside marine'` | the whole constraints subsystem |

`orgKeyOf` is in `src/features/constraints/constraintDefs.ts:39`, and its own
comment says why it is a name: *"Name-based because that is the only identity
`OrgProfile` carries today; when the store owns constraints this becomes a plain
foreign key."* That is exactly right and it is exactly the problem. **Renaming
the business orphans every business rule it has ever written**, silently, because
the key moved. Two constraint stores and one seeding ledger are keyed this way
(`helmlogic.constraints.v1`, `helmlogic.discovered.v1`,
`helmlogic.constraints.seeded.v1`).

**Everything else is scoped by nothing at all.** Measured across `src/`:

| what | where it lives | scoped by |
|---|---|---|
| the live sheet — meta, tables, zones, flow rules, rows, pages, modules, roles | Dexie `helmlogic-dynamic-config`, one project at the well-known key `meta.id = 'default'` | **nothing** |
| saved configurations | Dexie `helmlogic-tenancy` | **`orgSlug`** — the only store in the app that is |
| quotes | `localStorage` `helmlogic.quotes.v1` | **nothing** |
| business rules, discovered rules, the seeding ledger | `localStorage` ×3 | `orgKeyOf` — the *name* |
| module rule capability | `localStorage` `helmlogic.moduleRules.v1` | **nothing** |
| where a build starts | `localStorage` `helmlogic.build.place.v1` | **nothing** |
| finder recents | `localStorage` `helmlogic.finder.recent.v1` | **nothing** (and it is per-*user*, not per-org) |
| which build of the example this browser was seeded with | `localStorage` `helmlogic.seed.v1` | per-browser, correctly |
| who is signed in | `localStorage` `hl.session.user` | per-browser, correctly |
| rail collapsed, expanded frames, arranged rules | `localStorage` `hl.*` ×3 | per-browser, correctly |

Read the middle column and the shape of the problem is obvious: **the app is not
single-tenant, it is zero-tenant.** It holds one project because there is one
place to put a project, the way a spreadsheet holds one workbook.

---

## 2 · WHAT IS PER-ORG, PER-USER, AND GLOBAL

This is the decision the admin app is built on top of, so it is worth being exact
about. Nothing below is invented: every row names something that exists in the
code today.

### PER-ORGANISATION — the business's own set-up

Everything in the export envelope, plus the things that should be in it:

- **the tables**, their columns, sections, hierarchy, kind and role
- **the rows** — 15,691 of them for Northside; the price file *is* the tenant's data
- **the zones** (`groups`) and the **flow rules**
- **the pages** (`views`) and the **modules**, including `ModuleDef.order`, which
  is the dashboard arrangement
- **the business rules** (`constraints`), including the workbook-derived ones a
  person has since edited or switched off
- **the roles** (`RoleDef`) and the grants on each module that name them
- **the quotes**, and therefore the customers, because the customer register is a
  base table with a well-known id and its rows travel like any other table's
  (`features/crm`: *"there is no customer object, no customer store"*)
- **the organisation profile itself** — name, industry
- **the saved configurations** (`features/tenancy`)

### PER-USER — and this is thinner than it looks

- **who is signed in** (`hl.session.user`)
- **finder recents** — a list of where somebody has been. Today it is filed with
  the org's data and it is not the org's; two salespeople on one machine share it.
- **UI state**: rail collapsed, which table frames are expanded, which rules have
  been arranged on the whiteboard
- **draft quotes**, arguably. Today every quote is visible to whoever opens the
  browser; `QuoteDef` carries no author. A real deployment wants "my quotes"
  (the dashboard already promises *"my quotes, my customers, my day"* —
  `session.ts` — and today "my" is a fiction).

### GLOBAL — the same for every customer

- **the industry presets** (`INDUSTRIES`, `TABLE_KINDS`, the structure presets)
- **the module capabilities** (`MODULE_CAPABILITIES`) and the rule node kinds
- **`EXPORT_VERSION` and the envelope validator**
- **the design system** and every stylesheet
- **the Northside example set** (`src/demos/`) — which is a *demo*, not a tenant,
  and the distinction matters: it is the thing a brand-new org is offered, not
  the thing an existing org owns

### THE ONE THAT IS AMBIGUOUS, AND SHOULD BE DECIDED BEFORE IT IS BUILT

**The manufacturers' data.** Northside's price file contains Yamaha's outboard
range and Stabicraft's hull range. Two dealers who both sell Yamaha will both
hold a copy of it, diverging. Is a manufacturer catalogue per-org (a copy each,
edited freely) or global (one, published, subscribed to)? Today it is per-org by
construction, and nothing in the code has an opinion. **This is a product
question, not an engineering one**, and building the admin app without answering
it means answering it by accident.

---

## 3 · WHAT THE ADMIN APP WOULD HAVE TO DO

A separate app, against the same data, for whoever runs HelmLogic — not for a
dealer. Five jobs:

1. **Create a customer.** A slug, a display name, an industry — and then a
   decision about what they start with: an empty sheet, the industry's presets,
   or a copy of a template configuration. The third is the interesting one and
   the machinery for it already exists: a template is a saved configuration, and
   `openConfiguration` already puts one on a sheet.
2. **Invite and manage the people in it.** Which is where this stops being
   pretend: `session.ts` says out loud that it is *"NOT AUTHENTICATION"* and the
   credential is in the bundle. Nothing about per-user anything is real until
   that is replaced.
3. **See what a customer has.** Tables, rows, modules, quotes raised, last
   activity. Every one of those figures is already counted by
   `summariseEnvelope`, which is what the saved-configurations list prints.
4. **Support.** Open a customer's configuration read-only to answer "why is this
   rig pricing wrong?" — which is a *view* of their data and must be recorded as
   an access, not a silent read.
5. **Lifecycle.** Suspend, restore, export, delete. Deletion is the one that
   needs a written policy before a line of it is built, because a dealer's quotes
   are commercial records.

**What it must NOT do:** invent a second data model. If the admin app grows its
own idea of what a customer is, there are two, and the app is the one that is
wrong within a month.

---

## 4 · WHAT WOULD ACTUALLY HAVE TO CHANGE IN THIS CODEBASE

Concrete, in the order they block each other.

### 4.1 · One tenant key, and it is the slug

`OrgProfile` gains `slug: string`, and `orgKeyOf` returns it rather than the
lowercased name. Until then, **renaming the business orphans its business rules**
(§1). This is the smallest change on the list and the only one that fixes a bug
that exists today, so it should not wait for the rest.

Cost: `OrgProfile` in `model.ts`, `orgKeyOf` in `constraintDefs.ts`, a migration
that reads the old name-key once and rewrites it under the slug, and `setOrganisation`
in the store learning to take a slug. Everything else already goes through
`orgKeyOf`.

### 4.2 · The live project stops being `'default'`

`db/repository.ts` reads and writes one project at `meta.id = 'default'`, and
`ProjectMeta.id` is typed `'default'` — a literal type, so this is a change the
compiler will find every site of, which is the good version of this problem.

The honest sequencing is: **`meta.id` becomes the org's project id, and every
Dexie store gains an `orgId` index.** `saveAll`'s differential ledger already
works per-store and does not care; the `wholesale` reconciliation path
(`repository.ts`, "an unknown disk is reconciled against itself") reads the
store's primary keys and would need to read *this org's* primary keys instead,
or it will delete the other tenant's records. **That is the single most dangerous
line in the multi-tenant conversion** and it is worth writing the test first.

### 4.3 · The five unscoped localStorage stores

Quotes, module rule capability, build place, finder recents, and — for a
different reason — the seed stamp. Each is a `const KEY = '…'` and a JSON blob.
The mechanical fix is `${KEY}.${orgSlug}`; the better fix is the one
`quotes.ts` already names in its own header: quotes belong in the store and in
Dexie, and `index.ts` there *"names the exact slice, table and export changes that
replace this file's bottom half"*. Do that rather than the mechanical fix, and the
scoping comes free with 4.2.

### 4.4 · Real authentication

Everything per-user is decorative until `signIn` talks to a server. `session.ts`
is written so this replaces two functions and nothing else, which is the whole
reason it exists as a module. Nothing in this document should be read as
suggesting the current sign-in keeps anybody out of anything.

### 4.5 · The archive moves to the server

`ConfigArchive` (`src/features/tenancy/archive.ts`) is four methods —
`list(orgSlug)`, `read`, `write`, `remove`. The Dexie implementation and the
in-memory one already both satisfy it, which is the proof that an HTTP one can.
`setConfigArchive` is the swap. **Nothing above that file changes**, including
the panel.

### 4.6 · What the envelope still drops

Found by walking the real 15,691-row set through save → clear → load
(`src/features/tenancy/roundTrip.test.ts`). All three are in `src/features/io/`:

- **`roles` are never written.** `ProjectExport.roles` is declared in the
  contract (`model.ts:1160`) with a paragraph explaining why grants are
  unreadable without it — and `io/exportPayload.ts` does not put the key in the
  file, and `io/apply.ts` does not restore it. So the named jobs at the
  dealership and every module access grant that points at one **do not survive a
  save, an export, or a restore.** One line in `buildExportPayload`, one loop in
  `restoreDesign`.
- **`OrgProfile.createdAt` cannot survive a replace.** `keepingOrganisation`
  puts the business back by calling `setOrganisation(name, industry)`, and the
  store stamps `createdAt: nowIso()` on the profile it builds
  (`useProjectStore.ts:821`). Measured on the round trip: `13:20:29.171Z` in,
  `13:20:30.103Z` out. "Customer since" is a figure an admin app would want and
  it is being overwritten on every import.
- **The written order of pages and modules is not stable.** `exportPayload` sorts
  both by `createdAt` so that *"diffs between two revisions stay readable"*, and a
  restore re-mints `createdAt` through `createView`/`createModule` — so every
  restored page shares a millisecond and falls back to the name tiebreak.
  Measured: `views[1]` was "Stabicraft view" before and "ePropulsion Outboards
  view" after — the same set, reordered. Nothing on screen reads that order
  (the dashboard reads `ModuleDef.order`, which round-trips exactly), but the
  sort no longer does the job it is there for.

None of the three was fixed here: `io/` belongs to another workflow.

---

## 5 · WHAT IS BUILT, AND WHAT IT DELIBERATELY IS NOT

**Built** (`src/features/tenancy/`, 5 files):

- `archive.ts` — `ConfigArchive`, the persistence seam, scoped by `orgSlug`. Dexie
  and in-memory implementations.
- `configs.ts` — save, list, open, remove, and `restoreForSignIn`. The file format
  is the app's own export envelope; there is no second format.
- `ConfigurationsPanel.tsx` + `tenancy.css` — the screen.
- `roundTrip.test.ts` — the real Northside set saved, the sheet cleared, the
  configuration opened, and the whole envelope compared field by field.

**Not built, on purpose:**

- **The admin app.** The brief says later, and building it against a data model
  with two tenant keys and one hard-coded project id would produce something that
  has to be thrown away.
- **Switching organisations inside the app.** There is one, and a switcher over a
  store that cannot hold two projects is a menu that lies.
- **Any change to `src/db/`, `src/features/io/` or the store.** Every gap found
  is written down above rather than patched from the side.

---

## 6 · THE ONE RULE THIS DOCUMENT IS ARGUING FOR

**Scope by the tenant now, even with one tenant.** `features/tenancy` files every
record under `orgSlug` and scopes every read by it, today, when there is exactly
one value and it makes no observable difference. That costs one column and one
`where` clause. Adding it later costs a rewrite of every query in the app,
performed on the day the second customer signs up, which is the worst possible
day to be doing it.
