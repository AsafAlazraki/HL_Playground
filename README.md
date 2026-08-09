# HelmLogic — Dynamic Config

A local-first configurator for the **data model behind a dealership**, not for one
dealership's data. You draw your tables on a blueprint, say what each one holds,
write the rules that must always be true in plain English, and get pages that
show what goes with what.

Marine is the first industry built. Nothing in the frame is marine — the
vocabulary is a drawing office, so the same product arrives in another industry
without a rename.

This is **part one** of a larger application. It ends where quoting begins.

---

## ⚠️ Read this before you fork

**This repository is public and the seed data is real.** `src/demos/northside.ts`
carries 651 rows extracted from Northside Marine's Master Price File, and the
columns include `Base Cost`, `Freight`, `Landed Hull Cost`, `Dealer List Price`,
`Cash` and `Trade`. That is a live business's cost structure and margins.

Treat it accordingly. Do not redistribute it, and do not assume it is
illustrative — every number in it came out of a real workbook.

---

## Running it

Requires **Node 20+** (built on 22.22). No backend, no accounts, no environment
variables — everything lives in your browser's IndexedDB.

```bash
npm install
```

```bash
npm run dev
```

The dev server binds **port 5090**, not Vite's default — `.claude/launch.json`
is committed so agent tooling starts it on the right one.

### You will land on an empty screen, and that is correct

This app is **local-first**: everything lives in your browser's IndexedDB, so
nothing about a project travels in the repository. A fresh clone opens on
onboarding with nothing drawn. Three clicks gets you to the same 21 tables the
screenshots show:

1. type a business name → **Continue**
2. pick **Marine**
3. **Load a worked example — another dealer's price file**

Two consequences worth knowing. Each *origin* has its own database, so running
the same code on a different port gives you a fresh empty one — useful for
testing onboarding, surprising the first time. And the sheet you build is not
in git: use **I/O** in the masthead to export a project file if you want to hand
one to somebody.

Verified end to end: clone → `npm install` → `npx tsc --noEmit -p tsconfig.app.json`
→ `npm run build` → `python tools/seed/gen_all.py`, all green, working tree
still clean, and the seed byte-identical to the committed one.

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
| `src/demos/northside.ts` | **Generated.** 21 tables, 651 rows, from the real workbooks. |
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
sentence rules, the constraint solver, formulas, the linter, import/export, and
local persistence.

Not built yet: the quote flow, and automated tests. `docs/specs/CLUELESS_USER_TESTS.md`
is the running acceptance log — findings are listed there with what was tried,
what was expected and what happened.
