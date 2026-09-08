# HelmLogic — Dynamic Config

A local-first configurator for the **data model behind a dealership**, not for one
dealership's data. You draw your tables on a blueprint, say what each one holds,
write the rules that must always be true in plain English, and get pages that
show what goes with what.

Marine is the first industry built. Nothing in the frame is marine — the
vocabulary is a drawing office, so the same product arrives in another industry
without a rename.

It no longer ends where quoting begins — the quote flow is built, and so is the
sign-in, tenancy and pipeline around it. See **Status**.

---

## ⚠️ Read this before you fork

**This repository is public and the seed data is real.** `src/demos/northside.ts`
carries **15,691 rows across 53 tables** extracted from Northside Marine's Master
Price File, and the columns include `Base Cost`, `Freight`, `Landed Hull Cost`,
`Dealer List Price`, `Cash` and `Trade`. That is a live business's cost structure
and margins.

Treat it accordingly. Do not redistribute it, and do not assume it is
illustrative — every number in it came out of a real workbook.

---

## Running it

Requires **Node 22+** — declared in `package.json` `engines`, and enforced by CI
on 22 and 24. Node 20 reached end of life in April 2026. No backend and no
environment variables; everything lives in your browser's IndexedDB.

```bash
npm install
```

```bash
npm run dev
```

The dev server binds **port 5090**, not Vite's default — `.claude/launch.json`
is committed so agent tooling starts it on the right one.

### You will land on a sign-in screen, then an empty one

This app is **local-first**: everything lives in your browser's IndexedDB, so
nothing about a project travels in the repository. A fresh clone opens on
**sign-in** — which signs you in locally and sends nothing anywhere — and then on
an empty sheet. Getting to the same 53 tables the screenshots show:

1. press **Use the demo account**. It *fills* the form; it does not submit.
2. press **Sign in**
3. the first door — **Load your Master Price File**, which states its size:
   53 tables, 15,691 rows

   That door names the business whose file it is, because the file is
   Northside Marine's and they are the first real customer rather than a
   fixture. If you typed *Northside Marine* at step 1 it reads **Load your
   Master Price File** instead and is tagged YOUR DATA — same set, the reading
   that is true for whoever is looking at it. See `startingPointWords` in
   `src/app/demoLoad.ts`.

Two consequences worth knowing. Each *origin* has its own database, so running
the same code on a different port gives you a fresh empty one — useful for
testing onboarding, surprising the first time. And the sheet you build is not
in git: use **I/O** in the masthead to export a project file if you want to hand
one to somebody.

`npm test` runs five guards in order: **typecheck**, **lint** (oxlint, ratcheted
so the count can only fall), **vitest** (two projects — `logic` in node,
`ui` in happy-dom), **reachability**, and the **style contract**. CI runs all of
them plus the build, on Node 22 and 24.

A sixth is deliberately outside `npm test` because it needs a running server:

```bash
npm run dev            # one terminal
npm run check:contrast # another
```

It drives the system Chrome and measures every text node against the ground it is
actually drawn on. `tools/seed/gen_all.py` needs Python, which is not required to
run or develop the app — only to regenerate the seed.

```bash
npx tsc --noEmit -p tsconfig.app.json
```

**Always typecheck with `--noEmit`.** A bare `tsc` in this repo emits `.js` files
beside their `.ts` sources, Vite then resolves the stale `.js` first, and the app
boots to a blank page. This has happened. `npm run build` is safe (`tsc -b`
honours the project's `noEmit`).

---

## Finding your way around

| path | what lives there |
|---|---|
| `src/types/model.ts` | **The contract.** Field types, table kinds, roles, rules, constraints, views. Read this first; everything else agrees with it. |
| `src/store/useProjectStore.ts` | zustand store — the single writable surface. |
| `src/db/` | Dexie/IndexedDB behind a repository interface, so a real backend can replace it without touching features. |
| `src/app/` | The shell: masthead, the one panel, and the stages that mount over the sheet. |
| `src/features/whiteboard/` | The blueprint canvas (`@xyflow/react`), level-of-detail rendering, culling. |
| `src/features/table/` | The spreadsheet: grid, sections, grouping, image cells, column menus. The largest module. |
| `src/features/views/` | "What goes with each one" — the pages that relate a boat to its motors and trailers. |
| `src/features/constraints/` | The sentence rules — *When ⟨column⟩ ⟨is⟩ ⟨value⟩, ⟨column⟩ ⟨must be⟩ ⟨value⟩*. |
| `src/features/tablekit/` | Table kinds, structures, and the create-a-table dialog. |
| `src/features/io/` | Import, export, merge. |
| `src/features/review/` | The data-quality linter. |
| `src/lib/formula/` | Calculated columns — a Pratt parser and evaluator. |
| `src/lib/configure/` | The constraint solver: arc-consistency propagation, with the reason recorded at the moment an option is removed. |
| `src/lib/lint/` | The 15 data-management rules the product enforces. |
| `src/features/quote/` | Choose · Configure · Address, level pricing, overrides, issue-and-freeze, the A4 document. |
| `src/features/modules/` | Modules — what a person is given, with nine capability verbs. |
| `src/features/pipeline/` `crm/` | The sales board and the customer register. |
| `src/features/auth/` `tenancy/` `session/` | Sign-in, the org, and who is looking. |
| `src/demos/northside.ts` | **Generated.** 53 tables, 15,691 rows, from the real workbooks. |
| `docs/specs/` | Architecture, art direction, and the per-feature specs. |
| `docs/screens/` | Verification screenshots, in the order they were taken. |

### Two rules that are not obvious

**`src/demos/northside.ts` is generated — never text-process it with a shell
tool.** It is 276 KB of UTF-8 with `×` in product names. A PowerShell rewrite
once turned 171 of those into mojibake and the attempted repair corrupted the
file to binary. Change the generator, not the output.

**One table per brand.** Every boat brand is its own table, every trailer brand
is its own table. `TableKind` says what a table *holds* (`boat`, `motor`,
`trailer`, `accessory`); it is not the table's identity. This exists because the
source workbook re-labels one grid with eight different brand-specific header
rows — the schema genuinely drifts per brand, and pretending otherwise loses
data.

---

## The ideas worth knowing

**Roles, not just types.** A table is `base` (things you sell), `join` (what goes
with what) or `view` (a derived page). Joins are drawn differently and never
offered as products.

**Sections.** Columns live in named bands — *Identity*, *Cost Ladder*, *Retail
Pricing* — that collapse together. A 32-column table is readable because the
bands are.

**Hierarchy is a view, not a shape.** *Series ▸ Model ▸ Variant* is a transform
over flat rows, so a table can be regrouped without migrating anything.

**Primary image = first image.** There is no separate flag to fall out of sync.
Dragging a picture to the front *is* promoting it.

**Rules read as sentences.** Every underlined word is a dropdown built from the
columns actually on the sheet — 150 of them in the seeded model, each labelled
with its reach (`Hull Length (mtr) · 4 boat tables`). The operator list and the
value control follow the column's type: a number column offers *is at least*, a
text column offers *is one of*, a yes/no column offers yes and no.

**Nothing is invented.** No sample rows, no example rules, no plausible-sounding
placeholder that could be mistaken for real content. If the app shows you a
number, it came out of a workbook.

---

## Status

Working: the blueprint, the tables, sections and grouping, the view pages, the
sentence rules, the constraint solver, formulas, the linter, import/export, local
persistence — **and the quote flow**, which this file described as unbuilt for
longer than it was true. `src/features/quote/` is 20+ files: Choose · Configure ·
Address over a persistent price bar, level pricing, overrides with a reason
gate, issue-and-freeze, and an A4 document. There is also sign-in, tenancy,
roles, a sales pipeline and a CRM, none of which this file mentioned.

**Read `docs/BACKLOG.md` before planning anything.** 227 claims from the planning
docs were checked against the code on 2026-09-08: 102 were already built, 37 were
stale. The docs under `docs/plan` systematically under-report what exists.

Not built yet: the conflict sheet's option channel (`optionConflict` has no
callers), URL state — there is no router — and component coverage beyond the
first two suites. `docs/specs/CLUELESS_USER_TESTS.md` is the running acceptance
log; `docs/research/` holds the design research, indexed in `INDEX.md`.
