# Mounting the rules layer — integration instructions

`src/features/rules/` and `src/lib/rules/` are COMPLETE and type-clean. Nothing
renders them yet. This file is the exact wiring the whiteboard + shell need.
Source: the rule-UI builder's own handover notes. Follow it literally.

## Whiteboard (`src/features/whiteboard/`)

**Node types** — spread `ruleNodeTypes` into the canvas `nodeTypes`. Keys are
`rule-start`, `rule-match`, `rule-condition`, `rule-filter`, `rule-find`,
`rule-loop`, `rule-action`, `rule-output`. No collision with `entity` / `zone`.

**Graph** — `const { nodes, edges } = useRuleGraph(activeRuleId)`. Mirror into
local state exactly the way `useDerivedGraph` is mirrored today; node objects
are referentially stable while nothing about them changes, so `React.memo`
actually bites. Edges arrive fully styled (dashed, arrowheaded, tinted by the
source node's kind, branch labels + hit counts) — do **not** add
`defaultEdgeOptions`. Edge z-index 20, plates 30.

**Dragging** — positions come from the store, so a drag MUST commit in
`onNodeDragStop` with `moveRuleNode(activeRuleId, node.id, {x, y})` or the node
snaps back.

**Connecting** — the ERD layer currently passes `nodesConnectable={false}`; the
rules layer must enable it and wire:

```tsx
onConnect={(c) => connectRuleNodes(activeRuleId, {
  source: c.source, target: c.target,
  sourceHandle: c.sourceHandle ?? undefined,   // React Flow gives string|null
})}
```

Passing `sourceHandle` through is **required** — condition handles are branch
ids plus `else`, loop handles are `body` / `next`, everything else is `out`.
Edge removal → `deleteRuleEdge(ruleId, edge.id)`.

**Palette drop**

```tsx
onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
onDrop={(e) => onPaletteDrop(e, activeRuleId,
  rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }))}
```

Pass the raw cursor point — the helper centres the 224px plate on it, snaps to
the 16px grid, calls `addRuleNode`, and returns the node (or `null` if the drag
was something else). Gate `onDragOver` on `isPaletteDrag(e)` if you like.

**Layers** — the switcher (ENTITIES · RULES · BOTH) lives on the canvas
toolbar. `rule-nodes.css` ships an opt-in ghosting rule:
`.rl-ghosts .wb-entity { opacity: .28 }` — put `rl-ghosts` on the canvas
wrapper for the RULES layer, or implement ghosting natively and ignore it.
Selected rule-node id is canvas state; pass it to `RuleInspector`.

## Shell (`src/app/`)

| Component | Where | Props |
|---|---|---|
| `<RulesList />` | left panel, new RULES section | none |
| `<RulePalette />` | left rail, RULES/BOTH layer only | none (reads `activeRuleId` itself) |
| `<RuleToolbar ruleId={activeRuleId} />` | React Flow `<Panel position="top-right">` or the shell toolbar row | self-contained white chrome strip: RUN, validity stamp, run readout, CLEAR |
| `<RuleInspector ruleId nodeId />` | right rail | `nodeId` may be null or stale — it renders designed states for both |
| `<RuleResultsRail ruleId onClose />` | right rail | mount when `useRuleRun(activeRuleId).result !== null` |

Run state is module-global keyed by ruleId, so toolbar, rail and plates always
agree; it self-clears when the active rule changes. `onClose` should hide the
rail; also call `clear()` from `useRuleRun` if you want the canvas hit chips
dropped too.

**Rail precedence** is now three-way: entity inspector, review rail, results
rail. The shell already replaces (not stacks) — keep that, and keep the
340px `.shell-rail` track so swapping shifts the stage by zero pixels.

Every rules component imports its own stylesheet; nothing to add globally. All
classes are `rl-` prefixed and use only `tokens.css` / `base.css`.

## Demos (`src/demos/`)

`DEMOS` (fitment · dealership · blank) and `loadBlankProject()` are built and
unwired. Surface them in two places:
1. **Empty state** — replace the single LOAD SAMPLE SET button with the three
   choice cards (name + blurb), keeping DRAFT FIRST ENTITY and IMPORT.
2. **I/O menu** — a "START FROM" section listing the same three.

`loadSampleProject` in `features/io` still exists; `DEMOS` supersedes it as the
entry point. Loading a demo replaces the project (confirm first if the current
sheet has entities).

## Acceptance

Load the **fitment** demo, open the RULES layer, select "Motor fitment", press
RUN. Expected, and independently verified against the engine:
12 matched pairs — Tacklebox 380 → 2, Coastrunner 470 → 3, Seabreeze 520 → 3,
Reefline 610 → 3, **Harbour Pilot 640 → exactly 1**, **Bluewater 760 → 0**
(carried through, `passThrough`). Zero warnings, zero validation issues. The
results rail shows a combined view: boat columns beside motor columns.
