# HelmLogic — navigation, dashboard and information architecture

Lens: what a person sees, where they can go, who decides. Read as ground
truth for the module/dashboard plan. Every claim carries `file:line`.
Nothing here was learned by signing in — no authentication was performed,
and no runtime observation is claimed. This is a source reading.

Root app read-only at `C:/Users/AsafA/HelmLogic`. Ours at
`C:/Users/AsafA/.claude/projects/HelmLogic Dynamic Config`.

---

## 1. The short answer to the crux question

**Nothing about navigation is configurable by an admin today. Not one
item.**

The entire top-level navigation is a hand-written TypeScript array of
eight objects in one file, `src/lib/nav-links.ts:17-51`. Icons are
imported Lucide components (`src/lib/nav-links.ts:2`), so a nav item
cannot even exist without a code import. There is no Firestore
collection for navigation, no `navConfig` document, no per-org menu. A
repo-wide search for a stored menu shape returns only that array and its
three consumers: the sidebar (`src/components/app-sidebar.tsx:27`), the
Admin landing grid (`src/app/(app)/admin/page.tsx:9`), and the
breadcrumb labeller (`src/components/breadcrumb-nav.tsx:14`).

What an admin *can* change is narrower than it looks, and it is worth
being exact because the plan hangs on it:

| Thing | Configurable? | Where |
|---|---|---|
| Which nav items exist, their order, their labels, their icons | **No** — code | `src/lib/nav-links.ts:17-51` |
| Whether a nav item is *visible* to a role | Partly — via 11 fixed boolean flags | `src/components/app-sidebar.tsx:136-154` |
| The names and hierarchy of roles | **Yes** — free-form per org | `src/components/manage-organisation-page.tsx:594` |
| The *vocabulary* of permissions those roles can hold | **No** — a fixed array of 11 | `src/components/manage-organisation-page.tsx:125-142` |
| Which modules appear on the dashboard | **Yes** — per-org subscription list | `src/components/manage-organisation-page.tsx:897-906` |
| What a module *does* — its tabs, its screens | **No** — a `moduleType` string switch in code | `src/app/(app)/modules/add/page.tsx:174-184`, `src/app/(app)/modules/[id]/page.tsx:617-887` |
| …except two tabs, for sub-dealers only | **Yes** — two stored booleans | `src/app/(app)/modules/[id]/page.tsx:998-1003` |
| The order of the module cards | **Yes**, per *user*, by drag | `src/app/(app)/[orgSlug]/dashboard/page.tsx:160-174` |

So the one genuinely dynamic thing in HelmLogic's IA is **the dashboard
module grid** — and it is dynamic only in *which* cards show and in what
order, never in what is behind them. That grid is the seed of what the
owner is asking for, and it is worth studying closely (§3).

---

## 2. The shell, in plain words

There is no top bar. `src/components/header.tsx` is an eight-line file
whose entire body is `return null`, with the comment *"Header component
has been deprecated in favor of Sidebar footer controls."*
(`src/components/header.tsx:3-8`). Nothing imports it.

Everything is a **single left sidebar**, collapsible to an icon rail
(`collapsible="icon"`, `src/components/app-sidebar.tsx:164`), and it
starts **collapsed** — `defaultOpen={false}` in the app layout
(`src/app/(app)/layout.tsx:46`). A first-time user therefore lands on a
narrow strip of unlabelled icons with tooltips.

Top to bottom the sidebar is:

1. **Header** — the HelmLogic logo and the collapse toggle
   (`src/components/app-sidebar.tsx:165-170`).
2. **Menu** — the filtered `navLinks` list. Items with `subLinks` render
   as a collapsible group with a chevron; the group's own label is also
   a link (`src/components/app-sidebar.tsx:183-217`).
3. **Footer** — a notification bell (hidden for sub-dealer orgs), a user
   avatar menu, and, for HelmLogic Admins only, a **"Session Context"
   role-switcher dropdown** offering "System Admin" / "Marine Employee"
   (`src/components/app-sidebar.tsx:232-253`).

The main region is `SidebarInset` with `p-8 overflow-y-auto`, except
for "immersive" pages — anything whose path contains `/modules/` or
`/blueprint/` and not `/proposals/` — which get `p-0` and manage their
own full-bleed layout (`src/app/(app)/layout.tsx:42-54`). A floating
`ChatBot` is mounted globally on every authenticated page
(`src/app/(app)/layout.tsx:57`).

Breadcrumbs are **not** part of the shell. `BreadcrumbNav` is imported
and placed by each page individually, under its own `<h1>` — e.g.
`src/app/(app)/admin/page.tsx:16`, `src/app/(app)/manage/page.tsx:113`.
Pages that forget it simply have none. It derives labels by walking the
URL segments and matching them against `navLinks`, falling back to
title-casing the segment, and it prints the literal string `"Details"`
for any segment 20 characters or longer — its guard against showing a
Firestore document id (`src/components/breadcrumb-nav.tsx:21-27`). So a
quote's breadcrumb reads `Dashboard › Modules › Details › Proposals ›
Details`.

Three notes on the "Session Context" switcher, because it matters for
the permission model:

- It is not an impersonation view. It **writes to the user's own profile
  document**, setting `appRole`, `organisationId` and `organisationRole`
  (`src/components/app-sidebar.tsx:96-114`).
- The "Marine Employee" branch is hard-coded to find the organisation
  literally named `'Northside Marine'` and its role literally named
  `'Managing Director'` (`src/components/app-sidebar.tsx:104-106`). On
  any other tenant it silently does nothing.
- It is the only tenant-switching affordance in the app.

### Our shell, for contrast

We have no router and no route table at all. The whole app is one
`Shell`, and everywhere you can "go" is a five-arm discriminated union
held in React state:

```ts
type Stage =
  | { kind: 'view'; entityId: string }
  | { kind: 'design'; entityId: string }
  | { kind: 'rules' }
  | { kind: 'flow' }
  | { kind: 'quote'; quoteId: string | null }
```
(`src/app/Shell.tsx:98-103`)

Doors into those stages are props on the left panel — `onOpenView`,
`onOpenDesign`, `onOpenRules`, `onOpenFlow`, `onOpenQuotes`
(`src/app/Shell.tsx:184-188`). Our top bar carries the brand mark, the
organisation name and its industry, and nothing navigational
(`src/app/TopBar.tsx:62-110`).

The honest read: **both apps hard-code their destinations.** HelmLogic
hard-codes them as an array of 66 route files; we hard-code them as a
union of five stage kinds. Neither has a mechanism the owner's request
can be built on top of. This is a build, not a retrofit.

---

## 3. What a user sees on login

The journey, exactly:

1. `/login` — email + password card, Firebase
   `signInWithEmailAndPassword`, then `router.push('/dashboard')`
   (`src/app/login/page.tsx:52-53`). No SSO, no magic link, no reset
   link on the page.
2. `/` redirects to `/dashboard` (`src/app/page.tsx:3`).
3. `/dashboard` **renders nothing of its own** — it is a 44-line
   redirector (`src/app/(app)/dashboard/page.tsx`). It reads
   `users/{uid}`, then:
   - if `appRole === 'HelmLogic Admin'` → `/admin`
     (`src/app/(app)/dashboard/page.tsx:33-35`)
   - else → `/{org.slug}/dashboard`
     (`src/app/(app)/dashboard/page.tsx:37-40`)
   - if the user has no organisation, **the effect falls through and
     nothing happens** — the page sits on "Redirecting…" forever
     (`src/app/(app)/dashboard/page.tsx:37-43`). A user enrolled but
     not yet assigned an org has no landing page.

So there are **two different first screens** depending on who you are.

### 3a. The platform admin's first screen — `/admin`

A page title, a breadcrumb, one line of prose, and a grid of four cards
generated by reading the `subLinks` of the `Admin` entry in `navLinks`
(`src/app/(app)/admin/page.tsx:9,19-36`). The cards are Data Warehouse,
Organisations, Modules, Agent Team. Each card's body is the literal
string `"Go to {label}"`. No counts, no recent activity, no state. It is
the sidebar's Admin submenu, rendered twice.

### 3b. The org user's first screen — `/{orgSlug}/dashboard`

This is the screen the owner's request is really about. Top to bottom
(`src/app/(app)/[orgSlug]/dashboard/page.tsx:178-259`):

- **A hero banner.** Kicker "HelmLogic Workspace" with a ship icon,
  `Welcome, {firstName}`, the subtitle *"Your unified hub for maritime
  operations and intelligence."* — hard-coded English, marine-specific
  (`:187-195`). On the right, the org's uploaded logo, the org name, and
  a "Verified Network" badge with a shield icon that is decorative: no
  verification state is read (`:198-217`).
- **A section header** — "My Modules" with a grid icon, a rule, and a
  "Settings" link that appears only if `can_access_settings`
  (`:221-236`).
- **The module grid** — responsive 1/2/3/4 columns of cards
  (`:241`). Each card is the module's logo or cover image, its name,
  a one-line description, and an "Enter Module →" footer (`:80-106`).
  Cards are **drag-reorderable** via dnd-kit; the order persists to
  `users/{uid}.moduleOrder` (`:160-174`).
- **An empty state** when there are no cards, whose copy branches on
  `can_access_module` — "hasn't subscribed to any modules yet" vs
  "Your role does not have permission" (`:249-257`).

Which cards appear: `allModules.filter(m => org.enabledModuleSubscriptions.includes(m.id))`
(`:135,141`). The `modules` collection is queried **whole**, at the
Firestore root (`:126`) — modules are global platform objects, not
tenant objects (see §7).

**The card description is hard-coded marine, and hard-coded from the
module's *name string*:**

```
{module.name.toLowerCase().includes('outboard') || module.name.toLowerCase().includes('motor')
    ? "Manage engine technical specs, factory rigging, and propellers."
    : "Configure boat packages, BMT options, and generate sales quotes."}
```
(`src/app/(app)/[orgSlug]/dashboard/page.tsx:95-98`)

A module has no description field. Every module the platform will ever
have is described as either an outboard motor or a boat, decided by
substring match. This single expression is the clearest statement in the
codebase of the problem we are being asked to solve.

Two gaps worth naming, because they will be assumed to exist:

- `can_access_module` gates **nothing**. It changes the wording of the
  empty state (`:253`) and is otherwise never read — the grep across
  `src/` finds it only in that file and as a default in
  `src/components/model-configuration-editor.tsx:206`. It does not
  filter cards and it does not guard the module route.
- `enabledModuleSubscriptions` gates **only the card list**.
  `src/app/(app)/modules/[id]/page.tsx` never reads it — the string
  appears in that file exactly three times, all inside a *sub-dealer
  subscription editor* (`:605-609`), never as an entry check. Any
  signed-in user who types `/modules/{anyId}` gets the module.

---

## 4. The full route table

66 route files under `src/app`. Reachability is from a repo-wide search
for inbound `Link`/`router.push`/`redirect` to each path.

### Public / unauthenticated

| Path | What it is | Reachable from |
|---|---|---|
| `/` | Server redirect to `/dashboard` | entry |
| `/login` | Email + password sign-in (`src/app/login/page.tsx`) | entry, and every failed auth check |
| `/signup` | Self-serve account creation (`src/app/signup/page.tsx`) | link on `/login:123` |
| `/accept-variation/[token]` | Public customer page: view a contract variation, sign on canvas, accept. Anonymous Firebase auth, the token is the access control (`src/app/accept-variation/[token]/page.tsx:3-9`) | emailed link only |

### Authenticated shell — in the sidebar

Order as rendered. "Gate" is what actually hides the item.

| # | Label | Path | Gate (`src/components/app-sidebar.tsx`) |
|---|---|---|---|
| 1 | Dashboard | `/dashboard` → `/{orgSlug}/dashboard` | hidden for HelmLogic Admins (`:138`) |
| 2 | **Sales** (group) | `/customers` | none — everyone |
| 2a | · Customers | `/customers` | none |
| 2b | · Pipeline | `/pipeline` | none |
| 2c | · Contracts | `/contracts` | none |
| 2d | · Reporting | `/reporting` | none |
| 2e | · My Work | `/my-work` | none |
| 3 | Catalog Manager | `/pricing-manager` | `can_access_pricing_manager` **or role literally named "Managing Director"**; hidden from admins and non-members (`:139-143`) |
| 4 | Usage & Activity | `/usage` | `can_access_settings` (`:147`) |
| 5 | Feature Tracking | `/feature-tracking` | hidden if the org has a `parentOrganisationId` (`:152`) |
| 6 | Settings | `/manage` | `can_access_settings` (`:144`) |
| 7 | **Admin** (group) | `/admin` | `appRole === 'HelmLogic Admin'` (`:137`) |
| 7a | · Data Warehouse | `/data-warehouse` | inherits |
| 7b | · Organisations | `/organisations` | inherits |
| 7c | · Modules | `/modules` | inherits |
| 7d | · Agent Team | `/admin/agent-team` | inherits |

Items 1, 3 and 6 are rewritten to `/{orgSlug}{href}` for org members by
a hard-coded label set: `ORG_PREFIXED_LABELS = new Set(['Dashboard',
'Settings', 'Catalog Manager'])` (`src/components/app-sidebar.tsx:127`).
Matching by *display label* means renaming a nav item breaks its URL
rewriting.

### Authenticated — reachable, not in the sidebar

| Path | What it is | Reached from |
|---|---|---|
| `/modules/[id]` | The module workspace. 2,077 lines, dispatching on `moduleType` (§6) | dashboard cards |
| `/modules/[id]/ranges/[rangeId]` | Range detail inside a catalog module | module catalog |
| `/modules/[id]/ranges/[rangeId]/models/[modelId]` | Model detail | range detail |
| `/modules/[id]/quote/[modelId]` | The quote flow for a model | module |
| `/modules/[id]/motor/[motorId]` | Full-screen motor editor (v1.34) | motor module |
| `/modules/[id]/motor-quote` | Motor-only quote flow (v1.34) | motor module |
| `/modules/[id]/proposals` | Quote list for the module | module |
| `/modules/[id]/proposals/[quoteId]` | One proposal | proposals list |
| `/modules/[id]/templates/[templateId]` | The WYSIWYG template designer | module settings |
| `/modules/add` | Create a module. `AdminGuard` | `/modules` |
| `/modules/dealer-fit-options` | Global dealer-fit category list. `AdminGuard` | `/modules:92` |
| `/organisations`, `/organisations/add`, `/organisations/[id]` | Tenant CRUD. `AdminGuard` | Admin submenu |
| `/organisations/[id]/add-sub-dealer` | Create a child org | org detail |
| `/sub-dealers`, `/sub-dealers/[id]` | Sub-dealer views for a parent org | `manage-organisation-page.tsx:986` |
| `/data-warehouse` + `/add` + `/[id]` + `/[id]/ranges/[rangeId]` + `/[id]/models/[modelId]` + `/[id]/ranges/[rangeId]/models/[modelId]` | Global master catalog | Admin submenu |
| `/vendor-data/[vendorId]` | Vendor data view | `data-warehouse/[id]/page.tsx:835` |
| `/proposals/[quoteNumber]` | Proposal by quote number | quote flows |
| `/manage` | Org settings, two sections: Organisation and MPF Data | sidebar |
| `/pricing-manager` | Catalog Manager | sidebar |
| `/admin/dealer-fit-options` | **Redirect only** — `redirect('/modules/dealer-fit-options')` (`src/app/(app)/admin/dealer-fit-options/page.tsx:6`) | nothing |

### Authenticated — no inbound link anywhere in `src/`. URL-only.

Eight destinations exist, render real UI, and cannot be reached by
clicking. Verified by searching `src/` for each path string outside its
own directory.

| Path | What it is | Note |
|---|---|---|
| `/search` | Global search across customers, quotes, contracts (`src/components/global-search.tsx:7`) | the app has a global search and no way to open it |
| `/audit-log` | *"Full org activity log"* (`src/app/(app)/audit-log/page.tsx:1`) | |
| `/suggestions` | Suggestion approval queue; its own comment says *"perm-gated to HelmLogic Admins"* (`src/components/suggestion-approval-queue.tsx:15`) — the page has no such gate | pairs with the orphan `can_approve_suggestions` flag (§5) |
| `/quote-comparison` | Side-by-side quote comparison (v1.25, Story 1.1.4) | |
| `/real-time-tracking` | "Real-Time Vessel Tracking" | |
| `/route-optimization` | Genkit AI route optimisation, a server action | |
| `/highfield` | A single brand page with a placeholder image | |
| `/data-connect`, `/data-connect/add`, `/data-connect/[id]` | **Three files whose entire body is `return null`** (`src/app/(app)/data-connect/page.tsx`) | routes that render nothing |

### API routes

`/api/image-proxy`, `/api/pdf-img`, `/api/sharepoint-sync`.

### The `[orgSlug]` mirror — every page is dual-addressable

`src/app/(app)/[orgSlug]/` contains six files. Five are two-line
re-export shims:

```ts
'use client';
export { default } from '../../manage/page';
```
(`src/app/(app)/[orgSlug]/manage/page.tsx`)

The same for `pricing-manager`, `modules/[id]`, `modules/[id]/proposals`,
`modules/[id]/proposals/[quoteId]`, `modules/[id]/quote/[modelId]`.
Only `[orgSlug]/dashboard/page.tsx` is a real page.

So `/manage` and `/northside-marine/manage` are the same component. The
sidebar emits the prefixed form for three labels
(`src/components/app-sidebar.tsx:127,156-159`); everything else emits
the unprefixed form; `BreadcrumbNav` knows about neither and title-cases
the slug into a breadcrumb segment. **The org slug in the URL is
cosmetic** — the layout at `src/app/(app)/[orgSlug]/layout.tsx:31-37`
does not *validate* the slug, it silently *rewrites* the URL to whatever
org the signed-in user actually belongs to, and never blocks render
(`:39-40`). You cannot use the URL to be in a different tenant, and you
cannot use it to be in the right one either. It is decoration.

**INFERRED:** the `[orgSlug]` tree looks like an abandoned migration
toward tenant-scoped URLs — the shims exist, the dashboard was moved,
the rest was not, and the layout's job was reduced to correcting typos.
Not determined: whether it is still intended to be finished.

---

## 5. Roles and permissions

### The two-layer model

**Layer 1 — `appRole`, a single string on the user document.** The only
value ever compared is the literal `'HelmLogic Admin'`. Set in three
places: the signup form (`src/app/signup/page.tsx:81-83`), the sidebar
role-switcher (`src/components/app-sidebar.tsx:98`), and directly by an
admin. There is no enum, no other value; everyone else is implicitly
"not an admin". `'General User'` is written by the role-switcher
(`src/components/app-sidebar.tsx:108`) but is never read anywhere.

**Layer 2 — `organisationRole`, an id into a per-org role list.** Each
organisation document carries `roles: Array<{id, name, parent}>`, built
by an admin in a `RoleHierarchyChart`
(`src/components/manage-organisation-page.tsx:594`). Role names are free
text. A new sub-dealer is seeded with one role,
`{ id: 'initial-admin-role', name: 'Admin' }`
(`src/app/(app)/organisations/[id]/add-sub-dealer/page.tsx:101`).

Permissions hang off that: `organisation.permissions[roleId][flagId] =
boolean`, edited as a checkbox matrix of roles × flags
(`src/components/manage-organisation-page.tsx:743-769`).

### The permission vocabulary is a fixed array of 11

`src/components/manage-organisation-page.tsx:125-142`:

`can_access_module`, `can_access_pricing_manager`, `can_create_quotes`,
`can_edit_boat_data`, `can_view_subdealers`, `can_access_price_book`,
`can_access_settings`, `can_manage_stock`, `can_view_stock`,
`can_override_margin`, `can_approve_suggestions`.

Note `can_edit_boat_data` — the permission vocabulary itself is
marine-specific. An org selling tractors gets a checkbox column headed
"Edit Boat Data".

Grepping every consumer of each flag across `src/` gives the real
enforcement picture:

| Flag | Enforced at | Verdict |
|---|---|---|
| `can_access_settings` | sidebar `:144,147`; `/manage:59`; dashboard link `:230`; `proposal-view.tsx:411` | live, 4 sites |
| `can_access_pricing_manager` | sidebar `:142`; `/pricing-manager:88`; module Pricing tab `modules/[id]/page.tsx:1302,1424,1688` | live |
| `can_edit_boat_data` | `modules/[id]/page.tsx:528`; `model-configuration-editor.tsx:244,319` | live |
| `can_view_stock` / `can_manage_stock` | `modules/[id]/page.tsx:1301,1682` | live |
| `can_view_subdealers` | `/sub-dealers:42`; `/sub-dealers/[id]:53` | live |
| `can_override_margin` | `finalize-quote-dialog.tsx:616`; `lib/catalog/margin-gate.ts:11` | live |
| `can_access_module` | dashboard `:253` — **empty-state wording only** | **dead as a gate** |
| `can_create_quotes` | only as a default in `model-configuration-editor.tsx:206` | **dead** |
| `can_access_price_book` | **zero consumers** | **dead** |
| `can_approve_suggestions` | **zero consumers** | **dead** (and its page, `/suggestions`, is an orphan) |

Four of eleven checkboxes do nothing. An admin who unticks "Access
Modules" or "Access Price Book" has changed the wording of one empty
state and nothing else. **This is the failure mode we must not repeat:
a permission UI that promises control it does not have.**

The mirror-image bug also exists. `canSeeMargin` reads a flag called
`can_view_margin`:

```ts
return !!(perm?.can_view_margin || perm?.can_override_margin);
```
(`src/lib/catalog/v126-features.ts:41`)

`can_view_margin` is **not in `permissionsConfig`**. No admin UI can ever
set it. The stated feature — "2.2.2 Role-Based Margin Visibility"
(`src/lib/catalog/v126-features.ts:7`) — collapses to "whoever can
override margin can see it", because the other half of the condition is
unreachable.

### The role-name backdoor

Two places bypass the permission system by comparing a role's **display
name** to a string:

```ts
const isMD = organisation?.roles?.find((r: any) => r.id === roleId)?.name === 'Managing Director';
return !!userPermissions.can_access_pricing_manager || isMD;
```
(`src/components/app-sidebar.tsx:141-142`, and again at
`src/app/(app)/pricing-manager/page.tsx:85-88`)

An org that renames "Managing Director" to "General Manager" silently
loses that access. An org that *creates* a role called "Managing
Director" silently gains it. Role names are free text typed by an admin
(§5, layer 2). This is a permission that depends on spelling.

Also note the inversion at `src/app/(app)/pricing-manager/page.tsx:84`:
`if (userProfile?.appRole === 'HelmLogic Admin') return false;` — the
platform admin is **denied** the Catalog Manager. Deliberate, and the
denial card explains it (`:110`), but it means "admin" is not a superset
of "org user" in the UI, only in the database (§6).

### Where enforcement lives: UI only

**Route guards.** There is one: `AdminGuard`
(`src/components/admin-guard.tsx`). It checks Firebase auth, then reads
`users/{uid}.appRole` and redirects to `/dashboard` if it is not
`'HelmLogic Admin'` (`:46-47`). It wraps **11 pages**: `/admin`,
`/admin/agent-team`, `/organisations` ×3, `/data-warehouse` ×3,
`/modules`, `/modules/add`, `/modules/dealer-fit-options`.

It does **not** wrap the nested data-warehouse routes
(`/data-warehouse/[id]/ranges/[rangeId]`, `.../models/[modelId]`) — those
do an inline `appRole` check instead — and it does not wrap
`/modules/[id]`.

Every other page is guarded, if at all, by an inline `useMemo` returning
an "Access Denied" card (`/manage:54-87`, `/pricing-manager:80-124`,
`/sub-dealers:42`). The remainder — `/customers`, `/pipeline`,
`/contracts`, `/reporting`, `/my-work`, `/usage`, `/audit-log`,
`/feature-tracking`, `/search`, `/quote-comparison` — have **no
permission check at all**. `/usage` is instructive: the nav-links comment
says it is *"management-only, same gate as Settings… so salespeople don't
monitor each other"* (`src/lib/nav-links.ts:35-36`), and the gate is one
line in the sidebar (`:147`). The page itself
(`src/app/(app)/usage/page.tsx`) checks nothing. Typing `/usage` shows a
salesperson every colleague's session trace.

The same pattern, documented and wrong, appears for Feature Tracking.
The sidebar comment claims *"Defense in depth: page also gates and
Firestore rules deny"* (`src/components/app-sidebar.tsx:150-151`). The
page is 7 lines and gates nothing
(`src/app/(app)/feature-tracking/page.tsx`) — the gate is one level down
in `src/components/feature-tracking-view.tsx:54-56`, so one of the two
claims holds. The Firestore claim does not, and the rules file says so
itself:

> ```
> // Feature Tracking (v1.5 + v1.6).
> // Open to any signed-in user. Sub-dealer hiding is enforced
> // client-side (sidebar hides the link, page-level gate shows
> // "Not available for sub-dealer accounts"). The rule-layer
> // sub-dealer check was removed in v1.6.1 because it falsely
> // denied parent-dealer admins…
> match /features/{featureId} {
>   allow read, write: if isSignedIn();
> ```
> (`firestore.rules:489-497`)

**Firestore rules.** This is the decisive finding for anyone planning to
lean on the server. `firestore.rules` is 564 lines. Its own header calls
it *"HelmLogic Security Rules - Prototyping Phase"* (`firestore.rules:6`).

It has exactly three predicates (`firestore.rules:16-34`):

```
function isSignedIn() { return request.auth != null; }
function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
function isAdmin() {
  return isSignedIn() && (
    exists(/databases/$(database)/documents/roles_admin/$(request.auth.uid)) ||
    (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.appRole == 'HelmLogic Admin')
  );
}
```

Then, first rule in the file:

```
// HelmLogic Admins get full access to the entire database
match /{document=**} {
  allow read, write: if isAdmin();
}
```
(`firestore.rules:98-100`)

And below it, essentially everything else is `allow read, write: if
isSignedIn()`. Counting the collections: `modules` (`:249-251`),
`organisations` (`:265-267`) and all ~30 of its subcollections,
`customers` (`:545-546`), `inventory` (`:529`), `vessels` (`:533`),
`delivered-deals` (`:537`), `holdRequests` (`:541`), `features` (`:496`),
`epics` (`:511`), `data-warehouse/{allPaths=**}` (`:485-486`).

**`organisation.permissions` is never read by a single rule.** The word
`permissions` does not appear as a rules predicate anywhere in the file.
Every one of the 11 flags is a client-side hint.

The consequences, stated plainly:

- Any signed-in salesperson can write to `organisations/{anyOrgId}` —
  including that org's `roles` and `permissions` maps
  (`firestore.rules:265-267`). The permission system can be rewritten by
  anyone it governs.
- Any signed-in user can read and delete any other user's quotes:
  `allow read: if isSignedIn(); allow create, delete: if isSignedIn();`
  (`firestore.rules:126-127`). The comment calls this the *"v1.0
  cross-user collaboration model"* (`:118-119`). Only *updates* to
  **locked** quotes are constrained, by field whitelist
  (`:134-140`).
- Any signed-in user can create or delete a `modules/{id}` document
  (`firestore.rules:249-251`), even though the UI for it is behind
  `AdminGuard`.

**And the admin role is self-assignable from the public signup page.**
`/signup` renders a checkbox labelled *"Assign HelmLogic Admin role"*
(`src/app/signup/page.tsx:148-166`). Ticking it writes `appRole:
'HelmLogic Admin'` to the new user's own document
(`src/app/signup/page.tsx:81-83`). `firestore.rules:104` permits that
write (`allow write: if isOwner(userId)`), and `isAdmin()` at
`firestore.rules:32` reads that exact field. So any visitor can create an
account that satisfies the `match /{document=**}` full-database grant. I
did not test this — no authentication was performed — but the three
files are unambiguous and I am recording it because it bears directly on
the plan: **we cannot copy this permission architecture, and we should
tell the owner it exists.**

### What an admin can do that a salesperson cannot — the honest list

In the **UI**, a HelmLogic Admin sees the Admin nav group and its four
pages; an org user does not. An org user with `can_access_settings` sees
Settings and Usage; without it, neither. That is the whole of it.

In the **database**, an admin has a total grant and a salesperson has
near-total. The gap between the two is much smaller than the UI implies.

**Not determined:** whether Firebase Auth custom claims or App Check are
configured in the deployed project — that would be console
configuration, not repository state, and I did not authenticate.

---

## 6. What a "module" is today

This is the closest existing analogue to what the owner is asking for,
so it deserves exactness.

**Creating one** (`/modules/add`, `AdminGuard`, 291 lines). The admin
supplies: a **name**, a **module type** from a dropdown, a **main
vendor**, and a set of **associated vendors**
(`src/app/(app)/modules/add/page.tsx:40-44,79-100`). That is the entire
authoring surface. The written document is
`{name, slug, moduleType, mainVendorId, associatedVendorIds, logoUrl}`
(`:79-86`).

The nine module types are a hard-coded `<Select>`
(`src/app/(app)/modules/add/page.tsx:174-184`): `catalog` ("Catalog
Module (Boat Brand)"), `used-boats`, `website-listings`,
`master-price-file`, `motor-brand`, `trailers`, `rego` ("Registration
Authority"), `fit-up`, `service`. Eight of nine are marine terms.

**What the type does.** `src/app/(app)/modules/[id]/page.tsx` is 2,077
lines and its top-level control flow is a ladder of early returns on
that string:

```
:617  const moduleType = moduleData?.moduleType || 'catalog';
:620  if (moduleType === 'master-price-file' …) return <MasterPriceFileWorkspace/>
:667  if (moduleType === 'motor-brand' || mainVendor?.vendorType === 'Motor Brand') …
:728  if (moduleType === 'trailers' …)
:774  if (moduleType === 'rego' …)
:817  if (moduleType === 'fit-up' …)
:854  if (moduleType === 'service' …)
:887  if (moduleType !== 'catalog' …)   // used-boats + website-listings
      // …fall through: the catalog module
```

Each branch is a different component, a different set of tabs, a
different data shape. There is a tenth branch above all of them:
`isSubDealer` short-circuits at
`src/app/(app)/modules/[id]/page.tsx:996` into a separate four-tab
workspace (§7).

The catalog branch's tabs are themselves a hard-coded array:

```ts
const navTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bmt',       label: 'Catalog' },
    { id: 'stock',     label: 'Stock Management', visible: (isAdmin || …can_view_stock || …can_manage_stock) },
    { id: 'pricing',   label: 'Pricing',          visible: (isAdmin || …can_access_pricing_manager) },
    { id: 'settings',  label: 'Settings' }
].filter(t => t.visible !== false);
```
(`src/app/(app)/modules/[id]/page.tsx:1298-1304`)

Chrome inside a module: a fixed 176px header band, the kicker "COMMAND
CENTER", the module name, and a "Back to Hub" button that pushes the
bare `/dashboard` — dropping the `orgSlug` prefix and bouncing the user
through the redirector at `src/app/(app)/dashboard/page.tsx`
(`src/app/(app)/modules/[id]/page.tsx:1336`). The sub-dealer branch's
otherwise identical button *does* preserve it:
`router.push(orgSlug ? \`/${orgSlug}/dashboard\` : '/dashboard')`
(`:1030`). The sidebar is still
mounted but the page is "immersive", so it is a collapsed icon rail
beside a full-bleed workspace.

**Module roles.** There is a per-module role concept, but it is two
named seats, not a model: **Brand Captain** ("Receives hold requests
from sub-dealers") and **Module Manager** ("Secondary management role").
Each is a single user id + denormalised name written onto the module
document (`src/components/module-role-assignment.tsx:62-65,102-105`).
Neither confers any permission — grepping `brandCaptainUserId` shows it
is read by the hold-request notification path only. "Module Manager" has
no consumer beyond its own editor.

**Module composition.** Modules can reference each other:
`associatedModuleIds`, so a boat module can surface the trailer module's
brands without duplicating (`src/components/module-settings-panel.tsx:13-16`,
editor at `:417-470`). This is the one genuinely compositional idea in
the module system and the closest thing to what we would need. It is
also purely a data link — nothing about layout or capability travels
with it.

### The gap, named

The owner asked for: *"create a module and define what can be done
within that module and assign a master table to that module."*

HelmLogic today gives the admin **the name and one of nine type
strings**. "What can be done within it" is 2,077 lines of code the admin
never sees. "Assign a master table" exists in spirit — `mainVendorId`
points at a `data-warehouse/{vendorId}` document — but a vendor is not a
table, its shape is fixed (`ranges` → `models`), and only one may be
assigned.

The one working precedent for the request is the sub-dealer tab pair —
two stored booleans that add or remove a tab (§7). Everything the plan
needs is that idea generalised: capabilities as data, on a module a
tenant owns, over tables the tenant drew.

---

## 7. Multi-tenancy

**The organisation is real.** `organisations/{orgId}` carries name, slug,
shortCode, address, ABN, three brand colours, two logos, trading
currency, GST percentage, `roles[]`, `permissions{}`, brand and module
margins, `dataWarehouseSubscriptions[]`, `enabledModuleSubscriptions[]`,
`dealerFitCategories[]`, `subDealersEnabled`
(`src/components/manage-organisation-page.tsx:88-112`). Around 30
subcollections hang off it (`firestore.rules:269-483`): templates,
modelOverrides, exchangeRates, pricingStrategies, fitUpItems,
contentBlocks, emailTemplates, salesTeam, activitySessions, and more.
The org is unambiguously the tenant boundary in the *data model*.

**Two levels: dealer and sub-dealer.** A sub-dealer is an organisation
with `parentOrganisationId` set
(`src/app/(app)/organisations/[id]/add-sub-dealer/page.tsx:148`). It is
detected throughout as `!!organisation?.parentOrganisationId`
(`src/components/app-sidebar.tsx:81`) and drives real behaviour: the
sidebar hides Feature Tracking and the notification bell and renders a
minimal user menu (`:152,235-236`); the module page takes an entirely
different sub-dealer branch with its own tab set including a read-only
Price List (`src/app/(app)/modules/[id]/page.tsx:996-1003`). There is
no third level.

The sub-dealer branch also contains **the one place in HelmLogic where a
stored flag genuinely turns a screen on or off**:

```ts
const subDealerTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'stock',     label: 'Stock Management', visible: showStock },
    { id: 'quotes',    label: 'Quotes',   visible: moduleData?.subDealerQuotingEnabled === true },
    { id: 'pricing',   label: 'Price List' },
].filter(t => t.visible !== false);
```
(`src/app/(app)/modules/[id]/page.tsx:998-1003`)

`stockVisibleToSubDealers` and `subDealerQuotingEnabled` are booleans on
the **module** document, toggled by the parent dealer in the Stock
Location Manager (`src/components/stock-location-manager.tsx:128,150`).
This is a real precedent for "define what can be done within a module" —
data deciding which tabs exist. It is two flags, on one hard-coded tab
list, for one audience, and it writes to a globally shared module
document (below), but the shape of the idea is right and worth naming.

**But scoping is a client-side query convention, not an enforced
boundary.** Tenant isolation is achieved by `where('organisationId', '==',
orgId)` in each query — `src/components/customer-list.tsx:70-72`,
`src/components/customer-picker.tsx:38-40`,
`src/components/global-search.tsx:27`,
`src/app/(app)/my-work/page.tsx:48`,
`src/components/hold-request-dialog.tsx:76-77`. The corresponding rule is
`match /customers/{customerId} { allow read, write: if isSignedIn(); }`
(`firestore.rules:545-546`). Same for `inventory`, `vessels`,
`delivered-deals`, `holdRequests`. Remove the `where` clause and you have
every tenant's data.

The membership itself is a single field, `users/{uid}.organisationId`
(`src/components/app-sidebar.tsx:56`). **A user belongs to exactly one
organisation.** There is no memberships collection, no multi-org user, no
org switcher — the "Session Context" dropdown is admin-only and
hard-coded to Northside Marine (§2). And it is `users/{uid}` — not
`organisations/{orgId}/users/{uid}` — so membership is a property of the
person, globally readable: `allow read: if isSignedIn()`
(`firestore.rules:103`).

**Quotes are scoped to the user, not the org.** They live at
`users/{uid}/quotes/{quoteId}` (`firestore.rules:116`;
`src/app/(app)/modules/[id]/page.tsx:448`). The module dashboard's
"Recent Proposals" reads only the signed-in user's own subtree
(`:447-452`). Org-wide views exist only via `collectionGroup('quotes')`
with an `organisationId` filter, which needed its own recursive rule
added later (`firestore.rules:197-207`). **INFERRED:** a salesperson
leaving the business takes their quote subtree with them; recovering it
means an admin reading another user's document tree. Not determined:
whether any offboarding process exists.

**Modules are platform-global, not tenant-owned.** `modules/{moduleId}`
sits at the Firestore root (`firestore.rules:249`), is created only by
HelmLogic Admins (`src/app/(app)/modules/add/page.tsx:131`), and every
org's dashboard queries the whole collection then filters by its own
subscription list
(`src/app/(app)/[orgSlug]/dashboard/page.tsx:126,141`). Two consequences
that shape the plan directly:

1. A tenant **cannot create a module for itself**. Only the vendor can,
   which is the exact opposite of the owner's request.
2. Per-module state that ought to be per-tenant is written to the shared
   document. `brandCaptainUserId` and `moduleManagerUserId` are fields on
   `modules/{id}` (`src/components/module-role-assignment.tsx:62-65`),
   set from a member list scoped to one organisation
   (`:40-46`). Two tenants subscribed to the same module overwrite each
   other's Brand Captain, and each can see the other's assignment. The
   rules permit it (`firestore.rules:250-251`). **INFERRED** from the
   data shape — not observed at runtime — but the write is
   unconditional.

---

## 8. What this means for the plan

Findings, ordered by how much they should change the design. No
proposals here — this is the lens's evidence, handed forward.

1. **There is nothing to extend.** Navigation is a code array
   (`nav-links.ts:17-51`), module behaviour is a code switch
   (`modules/[id]/page.tsx:617-887`), permissions are a code array
   (`manage-organisation-page.tsx:125-142`). The dynamic module system
   is a new thing, and the only existing pattern worth carrying forward
   is the dashboard grid's shape: *a per-tenant subscription list, a
   per-user order, cards that open workspaces.*

2. **The dashboard grid is the right starting metaphor and the wrong
   implementation.** It already gets three things right — tenant
   subscription, user-controlled order, a card that opens a workspace.
   It gets one thing catastrophically wrong: the card's description is
   `name.includes('motor') ? … : …`
   (`[orgSlug]/dashboard/page.tsx:95-98`). A module in our system needs
   its own name, description, icon and purpose as *data*.

3. **A permission model must be enforced somewhere real, or not
   promised.** Four of HelmLogic's eleven checkboxes do nothing;
   `can_view_margin` is enforced but unsettable; `/usage` is protected
   only by a hidden link. If our module system lets an admin define what
   a role can do, every switch must have exactly one enforcement point
   and a way to show the admin it is live. The UX audit already flags
   that we over-promise in places; a permissions matrix is the easiest
   place in the world to over-promise.

4. **Never gate on a display name.** `role.name === 'Managing Director'`
   (`app-sidebar.tsx:141`, `pricing-manager/page.tsx:85`) and
   `ORG_PREFIXED_LABELS = new Set(['Dashboard', …])`
   (`app-sidebar.tsx:127`) both make behaviour depend on a string a user
   can type. In a system where the *admin names everything*, this is a
   whole class of bug waiting for us. Ids for logic, names for humans.

5. **The permission vocabulary must be industry-neutral.**
   `can_edit_boat_data` is a column heading an admin sees. Our
   equivalents must be phrased against the *structures we already have*
   — table, view page, rule, quote — not against what the tables happen
   to contain.

6. **Decide where a module lives before anything else.** HelmLogic put
   modules at the root, admin-created, and then wrote per-tenant fields
   onto the shared document (§7). The owner's request — "admins create a
   dashboard for *their* organisation" — points the other way:
   modules are tenant-owned. That single choice determines the whole
   repository shape, and it is the first thing the plan must settle.

7. **Reachability is not navigation.** Eight working destinations in
   HelmLogic have no link (§4), including its global search, and three
   more render `null`. Everything the module builder can create needs a
   guaranteed way in and a guaranteed way back — HelmLogic's own "Back
   to Hub" drops the tenant prefix in the catalog branch
   (`modules/[id]/page.tsx:1336`) and keeps it in the sub-dealer branch
   (`:1030`), because the two buttons were written twice.

8. **Report separately to the owner:** the public signup page can mint a
   full-database administrator (`src/app/signup/page.tsx:148-166` +
   `firestore.rules:98-100,104,32`), and `organisation.permissions` is
   read by zero Firestore rules. Both are production facts about the app
   we are learning from, not about ours, and neither should be carried
   across.

---

## Appendix — what was not determined

- Whether Firebase custom claims, App Check, or console-side security
  configuration exist in the deployed project. Repository state only;
  no authentication was performed.
- Whether the `[orgSlug]` route tree is an in-progress migration or
  abandoned. The shims are real; the intent is not in the code.
- Runtime behaviour of any screen. Nothing here was observed in a
  browser — every claim is a source reading with a citation.
- `src/app/(app)/data-connect/*` — three files returning `null`. Whether
  they were emptied or never written is not recoverable from the current
  tree.
