# BUSINESS RULES — spec

Rules are drawn on the **same blueprint canvas** as entities, with a layer
switcher. They are not diagrams: they **execute** against real rows and produce
**combined views**.

## The canonical scenario (build everything to serve this)

> A **Boat** has `Min HP` and `Max HP`. A **Motor** has `HP`.
> The rule "Motor fitment" walks every boat, finds the motors whose `HP` falls
> inside that boat's range, and outputs a combined view: boat name beside each
> motor that fits.
>
> A second rule matches **Trailers** to boats on `Weight` and `Length`
> capacity, and writes each result into a **join entity** so the pairing itself
> can carry data (fitment notes, recommended flag).

If a design decision makes that scenario awkward, the decision is wrong.

## Layers, not a separate view

The SHEET view gains a layer switcher: **ENTITIES · RULES · BOTH**.

- **ENTITIES** — today's ERD canvas, unchanged.
- **RULES** — the active rule's flow nodes; entity cards drop to faint navy
  "ghost" outlines so you keep your bearings without visual competition.
- **BOTH** — flow nodes drawn over full entity cards; the flow's `match` /
  `loop` / `find` nodes draw a dashed tether to the entity card they read.

A rule is chosen in the left panel's new RULES section. Only one rule's flow is
on the canvas at a time (`activeRuleId` in the store).

Visual grammar — this must be unmistakable at a glance:
- **Entity cards**: white paper, solid hairline relationship edges. *Structure.*
- **Rule nodes**: tinted plates (each kind has its ink from `RULE_NODE_KINDS`),
  a notched left edge, and **dashed** flow edges with directional arrows. *Logic.*

## Node palette (`src/features/rules/`)

Drag from a left palette onto the canvas, Miro-style. Every node shows its mono
tag, its title, and a one-line human summary of its own config
("HP between Min HP and Max HP") so a flow is readable without opening anything.

| Node | Tag | Out-handles | Purpose |
|---|---|---|---|
| Start | `RUN` | `out` | Walks each row of the rule's root entity |
| **Match** | `FIT` | `out` | **Rows of another entity that fit this one** |
| Condition | `IF` | one per branch + `else` | Route rows down different paths |
| Filter | `WHR` | `out` | Keep only rows matching the clauses |
| Find linked | `LNK` | `out` | Follow a link field to the related row |
| For each | `LOOP` | `body`, `next` | Repeat per row of a collection |
| Action | `DO` | `out` | set / create / flag / **link into a join** |
| Output | `OUT` | — | Collect into a named result set |

### Match is the centrepiece

Config: `{ targetEntityId, group: ClauseGroup, emptyBehavior }`.

**Scope convention** (already encoded in `model.ts`): a clause's `left`
resolves against the **candidate** row; a `{kind:'field'}` right-hand side
resolves against the **source** row. The Boat/Motor rule is exactly:

```
left [HP]  gte  right field [Min HP]
left [HP]  lte  right field [Max HP]
```

The clause editor must make this legible without the user learning the word
"scope": render it as `MOTOR · HP  ≥  BOAT · Min HP`, with the entity name
stamped before each side in that side's accent ink. Pickers are two dropdowns
(candidate field / source field) plus an operator — never free text.

`emptyBehavior`: `skip` drops boats with no fitting motor; `passThrough`
carries the boat on with no match attached (so you can route it to a
"nothing fits" branch).

## Execution engine — `src/lib/rules/` (pure TS, no React/store/DOM)

```ts
export interface RuleRunContext {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}

export interface RunPair { sourceRowId: string; matchRowId?: string }

export interface RunTrace {
  /** node ids visited, in order, for this pair */
  path: string[]
  /** which handle each condition/loop took */
  branchTaken: Record<string, string>
}

export interface ViewResultRow {
  sourceRowId: string
  matchRowId?: string
  /** display cells, keyed `${scope}:${fieldId}` */
  cells: Record<string, CellValue>
}

export interface PendingEffect {
  id: string
  kind: 'set' | 'create' | 'link' | 'flag'
  description: string          // human sentence for the effects panel
  apply: (store: ProjectStoreApi) => void   // committed only on APPLY
}

export interface RuleRunResult {
  ok: boolean
  error?: string
  /** named result sets emitted by output nodes: label -> rows + columns */
  views: Record<string, { columns: ViewColumn[]; rows: ViewResultRow[] }>
  traces: Array<{ pair: RunPair; trace: RunTrace }>
  nodeHits: Record<string, number>
  edgeHits: Record<string, number>
  effects: PendingEffect[]
  warnings: string[]
}

export function runRule(rule: RuleDef, ctx: RuleRunContext): RuleRunResult

/** Static check before running — unreachable nodes, unconfigured pickers,
 *  a condition branch with no clauses, a cycle without a loop, no output. */
export interface RuleIssue { nodeId?: string; severity: 'blocker' | 'advisory'; message: string }
export function validateRule(rule: RuleDef, ctx: RuleRunContext): RuleIssue[]
```

Hard requirements:
- **Never throws.** Any failure becomes `ok:false` + `error`, or a warning.
- **Bounded**: max 100k pair-steps and max 10k iterations per loop; exceeding
  either stops with a clear warning naming the node. Graph cycles outside a
  loop node are a `validateRule` blocker.
- Formula-typed values resolve through `@/lib/formula`.
- Comparisons are type-aware (numeric vs numeric, date vs date, text
  case-insensitive); a mismatched pair is a warning, not a crash.
- **Effects are never applied during a run.** `runRule` returns them; the UI
  shows them and the user commits with APPLY.

## Run UX

`RUN` in the rules toolbar. On completion:
- The canvas animates the flow: each edge's dash offset advances, edges and
  nodes carry hit counts (`142 rows`, `18 matched`) as mono chips.
- A **RESULTS** rail opens showing each output view as a real table (columns
  drawn from both sides of the pair), plus tabs when a rule has several outputs.
- An **EFFECTS** section lists pending writes in plain sentences
  ("Create 18 rows in Boat Motor"), with APPLY (commits all) or DISCARD.
- Warnings appear as red-pencil marks on the offending node.

## Join entities

`createJoinEntity(a, b, name?)` already exists in the store: it creates an
entity with a label field plus a required reference to each side, positioned
between its parents. Surface it in two places:
1. The rules inspector on a `link` action — "Create a join entity" when none is
   selected, pre-wiring `sourceFieldId` / `matchFieldId`.
2. The entity designer — a "Join to…" action creating the join from the schema
   side.

The join's own fields are ordinary fields, so users can add "Fitment note" or
"Recommended" and the `link` action can write them via `values`.

## Demo modes — `src/demos/`

```ts
export interface DemoSet { id: string; name: string; blurb: string; load(): void }
export const DEMOS: DemoSet[]
export function loadBlankProject(): void
```

Three starting points, offered in the empty state and the I/O menu:

1. **`fitment`** — "Boat fitment" — the canonical scenario above: Boat
   (Name, Model, Length ft, Weight kg, Min HP, Max HP), Motor (Model, Brand,
   HP, Weight kg, Price), Trailer (Model, Max Load kg, Max Length ft, Price),
   a `Boat Motor` join entity, ~6 boats, ~10 motors, ~5 trailers chosen so the
   matches are *interesting* (some boats fit several motors, one fits none),
   plus two working rules: "Motor fitment" (start → match → output) and
   "Trailer fitment" (start → match → condition on price → output + link
   action writing the join). Both must run green with zero configuration.
2. **`dealership`** — the existing Northside Marine sales/service set
   (Boat, Customer, Deal, Service Job with formulas and a zone).
3. **`blank`** — a clean sheet, for people who want to build from nothing.

Every demo must load in one click, land composed on the canvas (no overlapping
cards), and leave `REV 00`. Demo data is invented sample data — never presented
as real customer records.
