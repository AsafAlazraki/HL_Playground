# HelmLogic Dynamic Config — architecture

A local-first visual designer for **dynamic entities** (schemas + data),
**business rules** that execute, and **combined views** built from them — all on
a Miro-style blueprint canvas.

## Art direction — THE CHART ROOM

Two materials, sharply separated. This separation is a product requirement, not
a preference.

- **CHROME** — white nautical instrument panels (`--paper-high`), marine-navy
  ink (`--ink`), hairline rules, mono micro-labels, engineering title-block
  compartments. Top bar, side panels, inspectors, the TABLE view.
- **CANVAS** — a true blueprint: deep Prussian navy sheet (`--canvas-bg`), fine
  light gridlines, white entity cards *pinned* to it with real lift
  (`--shadow-card-canvas`). Anything drawn on the navy uses `--canvas-*` or
  `--accent-*-bright` tokens.

Fonts: `Archivo Variable` (UI; `.block-heading` for uppercase semi-expanded
stamps), `IBM Plex Mono` (data, labels, tags — `.mono-label`, `.type-tag`).
Spacing comes from the `--sp-1..--sp-6` scale. **Tokens only — never a raw hex,
never a new font.** Every interactive element needs hover *and* focus-visible
states. Empty and error states must look deliberately designed.

Visual grammar on the canvas: **solid** hairline edges = data structure
(relationships); **dashed** edges = logic flow (rules). Entity cards are white
paper; rule nodes are tinted plates with a notched left edge.

## Stack

React 19 + TS (strict, `verbatimModuleSyntax`) + Vite 8. Path alias `@` → `src`.
State: zustand. Persistence: Dexie/IndexedDB behind `@/db/repository`
(debounced auto-save; features never touch Dexie). Canvas: `@xyflow/react` v12.
No other runtime dependencies.

## Core contracts (read these first — every module depends on them)

- **`src/types/model.ts`** — the domain model. Entities, `FieldDef` (7 types:
  text, number, boolean, date, select, reference, formula), rows, groups, and
  the full rule model (`RuleNode` discriminated on `kind`, `ClauseGroup`,
  `ValueExpr`, `FieldPath`, `ActionOp`, `ViewColumn`, handle constants,
  `RULE_NODE_KINDS`, `defaultRuleNodeConfig`), plus the import/export envelope.
- **`src/store/useProjectStore.ts`** — every mutation. Entity/field/group/row
  CRUD, rule graph editing (`addRuleNode`, `connectRuleNodes`, …),
  `createJoinEntity`, `replaceProject`, `snapshot`, selection, `activeRuleId`.
  All actions auto-persist.
- **`src/styles/tokens.css`** + **`base.css`** — tokens and shared primitives
  (`.btn`, `.field-input`, `.mono-label`, `.block-heading`, `.type-tag`).

**Protected**: nothing but the orchestrator edits `types/model.ts`,
`store/useProjectStore.ts`, `db/*`, `styles/*`, `main.tsx`, `App.tsx`,
`index.html`.

## Module map

Each module owns its directory exclusively and talks to others only through the
listed exports. Feature CSS lives beside its components with a feature class
prefix.

| Module | Prefix | Owns | Public surface |
|---|---|---|---|
| `lib/formula/` | — | Calculated-field engine | `validateFormula`, `evaluateRowValues`, `FORMULA_FUNCTIONS` |
| `lib/lint/` | — | The red-pencil reviewer (15 rules) | `lintProject`, `applyLintFix`, `LintFinding` |
| `lib/rules/` | — | Rule execution | `runRule`, `validateRule`, `RuleRunResult`, `PendingEffect` |
| `features/whiteboard/` | `wb-` | Blueprint canvas, entity cards, zones, edges, layers | `Whiteboard` |
| `features/designer/` | `ds-` | Schema editor + hard guardrails | `EntityDesigner({entityId})` |
| `features/data/` | `dg-` | Inspector data grid | `DataGrid({entityId})` |
| `features/table/` | `tb-` | Full Excel-grade TABLE view | `TableWorkspace`; pure core in `table/core/` |
| `features/review/` | `rv-` | Review panel, badges, field marks | `ReviewPanel`, `FindingBadge`, `FieldMark`, `useLintFindings` |
| `features/rules/` | `rl-` | Rule palette, nodes, clause editor, results | `ruleNodeTypes`, `useRuleGraph`, `RulePalette`, `RuleInspector`, `RuleResultsRail`, `useRuleRun` |
| `features/io/` | `io-` | Import / export | `ImportExportMenu`, `loadSampleProject` |
| `demos/` | — | Starting points | `DEMOS`, `loadBlankProject` |
| `app/` | `shell-` | Shell: title block, index, inspector, view switching | `Shell` |

## The three views

- **SHEET** — the blueprint canvas. Layer switcher: ENTITIES · RULES · BOTH.
- **TABLE** — full-window spreadsheet: keyboard nav, TSV copy/paste,
  sort/filter/search, fill handle, virtualized above 150 rows.
- Rules run against real rows and emit **combined views** (columns drawn from
  both sides of a match) into the results rail.

## Opinionated by design

Users of this tool believe they understand data management. The app reviews
their schema like a senior architect in red pencil: a few things are physically
impossible (duplicate names, invalid formulas, option-less lists), everything
else is a live advisory with a one-sentence *why* and a one-click fix —
including extracting a linked entity and migrating the data into it. See
`REVIEW_SPEC.md`.

## Specs

`REVIEW_SPEC.md` (lint rules + guardrails), `TABLE_SPEC.md` +
`TABLE_CORE_API.md` (table view), `RULES_SPEC.md` (rule model, engine,
run UX, demos).

## Definition of done

`npm run build` exits 0; no placeholder visuals or copy; no `--canvas-*` token
on a chrome surface (or vice versa); no raw hex in feature CSS; no console
errors; every empty state designed.
