# THE REDESIGN ROLLOUT — the execution kit

**Status.** Ready. Nothing is switched on. This document plus
`src/styles/bridge.css` plus `tools/check-styles.mjs` are the whole kit; on
"go", step 1 takes minutes and the app is already wearing the new system.

**Read with.** `docs/plan/UX_PASS.md` (§1–§12, the process work),
`docs/plan/MODULE_SYSTEM.md` (what the app now is), `docs/audit/UX_AUDIT.md`
(the evidence). The visual system is `src/styles/ds.css`; every surface is drawn
at `/design.html`.

---

## 0 · WHERE THE PROJECT ACTUALLY IS

Synced this session, from the tree and not from memory.

| | |
|---|---|
| Branch | `redesign`, 8 commits ahead of `main` (`main` is untouched at `19c95ab`) |
| Module system | **built** — `src/features/modules/` (Dashboard, ModuleIndex, ModuleDesigner, NewModuleDialog, designer.ts, read.ts) + `src/app/ModuleStage.tsx` |
| `ModuleDef` contract | live in `model.ts:848` — tableIds, 9 capabilities, index mode, viewId, accent, order |
| Search | **built** — `src/features/search/` with `rowSearch.ts` + tests. Audit finding 2 is closed |
| Shell stages | **six** — the five originals plus `module`. Modules are additive; nothing was retired |
| Stylesheets | 26 files, 23,081 lines (19,043 of it the app's, the rest mine) |
| Tests | 11 files, **214 passing**, plus the reachability guard |

**What this means for the redesign.** The five old stages still exist beside
modules, so the rollout has to dress *both* — or the retirement of the old
stages has to be its own decision, taken separately. That is question 1 in §6.

---

## 1 · THE MECHANISM — why this can be fast

Measured across every stylesheet in `src/` that is not mine:

```
  4,787   var(--token) uses
     63   hardcoded hex
     57   hardcoded rgb()/rgba()
```

**The app is 97.6% tokenised.** Somebody was disciplined, and the whole rollout
strategy falls out of it: redefining ~50 names re-skins ~19,000 lines of CSS
without touching one selector, one component, one layout rule or one line of
TSX.

Better still, of those 120 hardcoded values, **111 are inside `tokens.css` and
`base.css`** — the two files the bridge supersedes. Only **nine** leak into
feature stylesheets:

| file | hardcoded values |
|---|---|
| `src/features/quote/quote.css` | 3 |
| `src/app/shell.css` | 3 |
| `src/features/constraints/constraints.css` | 2 |
| `src/features/tablekit/tablekit.css` | 1 |
| `src/features/io/io.css` | 1 |

Nine values are the entire non-tokenised surface of this codebase.

`src/styles/bridge.css` is written and waiting. It re-points colour, elevation,
radius, motion and family — and **deliberately does not touch `--sp-*` or any
`*-size` / `*-lead` / `*-track`**, because spacing and type sizing are layout,
layout is reflow, and reflow is how a "safe" re-skin breaks a screen nobody
opened. Type sizing is the hand-tune pass, one screen at a time, so a regression
has one obvious cause.

Five token names collide between `ds.css` and `base.css` — `--e1 --e2 --e3
--canvas-edge --font-mono`. They mean the same things. The bridge `@import`s
`ds.css` at the top so ds.css wins, which is the intent; it is recorded here so
it is a decision and not a surprise.

---

## 2 · THE SAFETY NET — how "all functionality retained" is checked

The honest problem: **a visual redesign cannot be caught by the tests this repo
has.** All 214 are logic-level — formula, lint, columns, dependents, envelope,
rowSearch. A CSS rewrite cannot fail one of them and can still break every
screen.

So `npm test` now runs three guards, not one:

```bash
npm test
```

| guard | catches |
|---|---|
| `vitest` — 214 tests | logic regressions |
| `check-reachability` | a feature that becomes unreachable |
| **`check-styles`** *(new)* | **a class written in TSX that no CSS declares** |

The third is the one written for this pass. The characteristic failure of a
stylesheet migration is an element that still renders and is silently unstyled:
`tsc` is green, the build is green, the feature is reachable, and the screen is
wrong. It found **35 pre-existing orphans** on its first run — verified by hand,
e.g. `qt-list-who` is written at `QuoteList.tsx:50` with zero rules in
`quote.css`.

Those 35 are frozen in `tools/style-baseline.json`. The rule during the rollout
is therefore exactly the right one: **you may not add an unstyled element.**
Clearing the existing 35 is separate work, and the baseline shrinks as they go
(`node tools/check-styles.mjs --update-baseline`).

Proven both ways this session: a canary class was added, the guard failed with
its name and file; removed, the guard went green.

### What the guards still cannot see

Stated so nobody assumes coverage:

- **Contrast.** Measured by hand in-browser this session; not automated.
- **Layout at a given width.** No visual regression tooling exists here.
- **Whether a screen still makes sense.** §4 is the human list.

---

## 3 · THE ORDER

Each step ends somewhere runnable, and each is independently revertible.

### Step 1 — Switch the bridge on · minutes · reverts by deleting one line

Add to `src/main.tsx`, **after** `tokens.css` and `base.css`:

```ts
import './styles/bridge.css'
```

The whole app is now Quiet Precision: light ground, one accent, the real
elevation scale, 10px radii, the serif retired, glass resolved to paint, and
`--ink-faint` moved from 2.96:1 to 4.7:1 — which alone closes audit finding 4
across **218 use sites** without editing one of them.

Then: `npm test`, `npm run build`, and walk §4.

### Step 2 — The nine hardcoded values · under an hour

The five files in §1. Each becomes a token reference.

### Step 3 — Retire the old font imports · minutes

`main.tsx` currently loads Archivo and Instrument Serif. Swap to
`@fontsource-variable/inter/opsz.css` — **the `opsz` cut, not the default**,
which is the wght-only build and makes `font-optical-sizing` silently inert.
That exact defect is already in this repo's history: 21 `'wdth' 118`
declarations across 10 files were no-ops because `wdth.css` was never imported.

### Step 4 — Type sizing, screen by screen · the bulk of the work

The bridge deliberately left every `*-size` / `*-lead` / `*-track` alone. Now
map the outgoing type tokens onto the six steps, one stylesheet at a time,
biggest first: `table.css` (2,893) → `shell.css` (1,970) → `designer.css`
(1,539) → `rules.css` (1,523) → `modules.css` (1,388) → `whiteboard.css`
(1,266) → `views.css` (1,043) → `quote.css` (890) → the rest.

Run `npm test` between each. One stylesheet per commit, so a regression has one
obvious cause and one obvious revert.

### Step 5 — The new surfaces · the design work, not the migration

Everything drawn at `/design.html`, in this order — cheapest first, and each one
already has its CSS and markup written:

| surface | source | replaces |
|---|---|---|
| Dashboard module cards | `modules.css`, `DesignPreview` | the current dashboard |
| Table card on the sheet | `preview.css` `.tcard` | `table-node.css` plate |
| Navigation | `preview.css` `.nav` | `LeftPanel` |
| Index tiles | `modules.css` `.tile` | `ModuleIndex` |
| Grid header + bands | `preview.css` `.grid-*` | `table.css` band strip |
| Quote document | `preview.css` `.quote` | `quote.css` |
| **Jobs panel** (UX_PASS §12) | `sheet.css`, `SheetSurfaces` | *new* |
| **Fit sentence** (UX_PASS §11) | `flow.css`, `FlowSurfaces` | the 5,236-line canvas |

### Step 6 — The process work · UX_PASS §1–§12, ordered in its own §9

Undo is last by cost and first by value. Search is **already built** — check
`src/features/search/` against UX_PASS §2 before building anything.

---

## 4 · THE RETENTION CHECKLIST

What "all functionality absolutely retained" means, concretely. Walk this after
step 1 and again after step 4. Every item is a thing the app can do today.

**Onboarding & first run**
- [ ] Name the business, pick an industry, land on an empty sheet
- [ ] Load the worked example; 21 tables and 651 rows arrive
- [ ] Clear sheet returns to onboarding

**The sheet / data model**
- [ ] Drag a table kind onto the sheet; the new-table dialog opens on that kind
- [ ] Table cards show name, counts, bands; selection and drag-position persist
- [ ] Reload keeps node positions

**The grid**
- [ ] Type into a cell; commit with Enter, revert with Escape
- [ ] Copy/paste a block; fill-down
- [ ] Add a column of each of the 8 kinds; add a row
- [ ] Group by hierarchy — 3 levels on Highfield; collapse and expand
- [ ] Section bands filter columns
- [ ] Formula column computes; a bad formula shows its error
- [ ] Image cell accepts a file and a URL

**Modules** *(new — check against `MODULE_SYSTEM.md`)*
- [ ] Dashboard lists modules with counts
- [ ] Three-click create; the module opens browsable
- [ ] Index in both `rows` and `tiles`
- [ ] Search inside a module
- [ ] Capability switches; a refused capability states its reason
- [ ] Module designer adds/removes/reorders blocks

**View page / what goes with what**
- [ ] Open a row's page; related blocks list the fitting rows
- [ ] Pin and unpin; the star decides the quote
- [ ] Drag a table onto the page to add a block

**Rules**
- [ ] Sentence rules: build, enable, disable; violations counted
- [ ] Flow builder: the seeded rule runs and returns 134 pairs
- [ ] Workbook rules list renders

**Quotes**
- [ ] "Quote this one" from a view page mints a draft
- [ ] Level, quantity, override, adjustment, free line
- [ ] Issue freezes it; an issued quote refuses edits
- [ ] Print to A4

**Import / export**
- [ ] Export "Everything" and "Structure only"
- [ ] Re-import round-trips; images survive
- [ ] Merge into a populated sheet

**Chrome**
- [ ] Every stage opens and closes; the sheet keeps its zoom underneath
- [ ] Keyboard: tab order sane, focus visible, Escape closes
- [ ] 1280 and 1920 both clean, no horizontal scroll

---

## 5 · REVERT

| step | revert |
|---|---|
| 1 (bridge) | delete the import line |
| 2–4 | `git revert` the stylesheet's commit — one per commit, by design |
| 5 | each surface is a separate commit |
| everything | `git checkout main` — untouched throughout |

---

## 6 · THE THREE QUESTIONS TO ANSWER ON "GO"

1. **Do the five old stages get retired, or dressed?** They still exist beside
   modules. Dressing all six is more work; retiring four of them is a product
   decision, not a design one, and the module plan says doors become modules.
2. **Light only, or does the theme toggle ship?** Both palettes are built and
   measured. A toggle needs a home in the chrome and a persisted preference.
3. **rem or px?** The system is px, so a reader who raises their browser font
   size gets no larger type. Moving to rem is mechanical but re-bases every
   value and every measured figure quoted against it. It is cheapest to do at
   step 4, and near-impossible to retrofit later.

---

## 7 · WORKING IN PARALLEL WITH THE FEATURE BUILD

**Yes, and most of it needs no coordination at all.** Three facts, measured
this session rather than assumed.

### 1 · Step 1 has zero file overlap. Provably.

The other session is touching **56** `.ts/.tsx/.css` files across its working
tree and recent commits. Switching the bridge on touches **two**:

```
src/styles/bridge.css     new file, nobody else has it
src/main.tsx              not in their 56
```

The intersection is empty. Step 1 can be taken mid-flight, today, without a
merge conflict being possible.

### 2 · Everything they build from now on is redesigned for free.

This is the real prize of the 97.6% tokenisation, and it is worth stating
plainly to whoever is building:

> They keep writing `var(--ink)`, `var(--paper-high)`, `var(--blue)`,
> `var(--hairline)` exactly as they do now. Those names keep working. They
> simply resolve to Quiet Precision instead of the Chart Room.

No new conventions to learn, no rework, no rebasing onto a design system. A
module screen written tomorrow against the old token names arrives already
wearing the new one. **The longer the bridge is on, the less retrofitting there
is at the end** — which inverts the usual "freeze the feature work while design
lands" trade.

The one thing to tell them: *if a screen suddenly looks different, that is the
bridge and it is intended — do not fix it back.*

### 3 · Ownership is by FILE, not by feature.

| owner | files |
|---|---|
| Design | `src/styles/*`, `tools/check-styles.mjs`, this doc, `UX_PASS.md` |
| Feature build | `src/features/*`, `src/app/*`, `src/db/*`, `src/store/*` |
| **Contested — agree before editing** | `src/design/*` |

That last row is live: the feature session has edited `DesignPreview.tsx`,
`FlowSurfaces.tsx`, `flow.css` and `design/main.tsx`. The preview is only a
proposal surface, so the simplest resolution is that whoever is holding it says
so; it has no runtime consequence either way.

### 4 · For steps 2–5, which DO touch their files: layer, do not edit.

Steps 2–5 want to change `table.css`, `shell.css`, `quote.css` and the
components beside them — which is exactly where the conflicts are. While the
feature build is live, do not edit those files. Add instead:

```ts
// src/main.tsx — LAST import, after everything it overrides
import './styles/late.css'
```

Later import order wins at equal specificity, so an override layer needs no
`!important` and no specificity inflation. Their file is never opened, so a
conflict is impossible.

**With a hard rule attached:** `late.css` is a staging area, not a destination.
Every rule in it is a debt with a home — the file it will be folded into — and
it gets collapsed the moment the feature build pauses. A permanent override
layer is two stylesheets fighting over one screen, which is worse than the
problem it solved.

### 5 · The guard makes the parallelism safe both ways

`npm test` runs `check-styles` for both sessions. If either one writes a class
with no rule — including a class whose rule the *other* session just moved —
the run fails, names the class and names the file. Neither of us can silently
unstyle the other's work.

### What to do about the retention checklist

§4 is written against what the app does **today**. The feature build is adding
to that — `src/app/UndoKeys.tsx` and `src/store/undo.test.ts` exist, so UX_PASS
§1 is being executed as we speak. Re-derive §4 from the tree at "go" rather
than trusting it; it is a checklist, not a contract, and the app is moving.

---

## 8 · WHAT IS ALREADY DONE, SO IT IS NOT RE-DONE

- `src/styles/ds.css` — the system, both themes, contrast measured in-browser
- `src/styles/bridge.css` — the re-skin, written, not switched on
- `tools/check-styles.mjs` + baseline — the guard, wired into `npm test`
- `/design.html` — 16 sections, every surface drawn, both themes
- `docs/plan/UX_PASS.md` — §1–§12, the process work with evidence
- This document
