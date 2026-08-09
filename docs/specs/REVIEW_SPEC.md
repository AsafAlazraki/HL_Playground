# The Red-Pencil Reviewer — spec

The app is opinionated: it reviews the user's schema like a senior data
architect checking a junior's drawing, in red pencil. Users of this tool
believe they understand data management; the reviewer teaches the parts they
don't — every mark carries a one-sentence WHY in plain language, and a
one-click fix wherever one can be derived. Tone: firm, calm, never smug.

Enforcement model: **guardrails + guidance**.
- HARD GUARDRAILS (enforced at the input, phase 2, designer/store level):
  duplicate field names within an entity, duplicate entity names, committing
  an invalid formula, using a select field with zero options.
- EVERYTHING ELSE: live advisories from the lint engine below, surfaced as
  red-pencil marks (whiteboard card badges, designer inline notes, review
  panel with sheet health).

## Module: `src/lib/lint/` (pure TS + one store-coupled applyFix file)

```ts
export type FindingSeverity = 'blocker' | 'advisory'

export interface LintFinding {
  id: string          // STABLE across re-lints: `${ruleId}:${entityId}:${fieldIds?.join(',') ?? ''}`
  ruleId: string
  severity: FindingSeverity
  entityId: string
  fieldIds?: string[]
  title: string       // short mark label, mono-uppercase-able, e.g. 'PLURAL ENTITY NAME'
  why: string         // one plain sentence teaching the principle
  fix?: LintFix
}

export type LintFix =
  | { kind: 'rename-entity'; entityId: string; name: string; label: string }
  | { kind: 'rename-field'; entityId: string; fieldId: string; name: string; label: string }
  | { kind: 'set-display-field'; entityId: string; fieldId: string; label: string }
  | { kind: 'make-required'; entityId: string; fieldId: string; label: string }
  | { kind: 'remove-field'; entityId: string; fieldId: string; label: string }
  | { kind: 'convert-to-reference'; entityId: string; fieldId: string; refEntityId: string; label: string }
  | { kind: 'convert-to-select'; entityId: string; fieldId: string; options: string[]; label: string }
  | { kind: 'convert-to-formula'; entityId: string; fieldId: string; formula: string; label: string }
  | { kind: 'extract-entity'; entityId: string; fieldIds: string[]; newEntityName: string; label: string }

export function lintProject(input: {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}): LintFinding[]  // deterministic order: by entity name, then rule severity, then ruleId

export function applyLintFix(fix: LintFix): void  // lives in applyFix.ts; may import useProjectStore
```

`applyLintFix` semantics (all via store actions, data-preserving):
- convert-to-reference: field becomes type 'reference' w/ refEntityId; existing
  text cell values are matched (case-insensitive trim) against the target
  entity's row labels (`rowLabel`) — matches become the row id, non-matches null.
- convert-to-select: type 'select' with the given options; cell values kept
  when they match an option (case-insensitive → canonical casing), else null.
- convert-to-formula: type 'formula' + formula source (cells wiped by the
  store's type-change handling — that is correct and desired).
- extract-entity: THE flagship fix. Create the new entity (accent auto,
  position near the source), move the named fields into it (same ids are fine
  as new FieldDefs on the new entity), add a required 'Name' text field if none
  of the moved fields is text, add a reference field on the source entity
  pointing at the new one (named after the new entity), then migrate data:
  distinct value-tuples of the moved fields across the source rows become rows
  of the new entity; each source row's new reference cell points at its tuple's
  row. Remove the moved fields from the source entity last.

## Rules (ruleId — severity — trigger → fix)

Identity & naming:
- `entity-plural` — advisory — entity name is a plural ('Customers'; naive
  s-heuristic w/ whitelist: 'Status','Analysis','Address','Class','Process',
  'Access','News', anything ending 'ss'/'us'/'is') → rename-entity singular.
- `entity-vague` — advisory — name in {Data, Info, Details, Misc, Stuff,
  Record, Records, Table, Object, Item, Items, Entity, Thing(s), New Entity}
  or matching /^Entity \d+$/ → no auto-fix; why explains naming by business
  meaning.
- `field-default-name` — advisory — field name matches /^Field \d+$/ → no fix.
- `entity-dup-name` — blocker — two entities share a trimmed case-insensitive
  name → no fix (user chooses which to rename).
- `field-dup-name` — blocker — two fields in one entity share a name → no fix.
- `no-identifier` — advisory — entity has no required non-formula field →
  make-required on the display field (or first text field).
- `no-fields` — advisory — entity has zero or only-formula fields → no fix.

Links, not copies:
- `text-should-link` — advisory — a text/select field's name equals (or equals
  + ' name'/' id'/' ref') another entity's name, case-insensitive → 
  convert-to-reference to that entity.
- `dangling-link` — blocker — reference field whose refEntityId no longer
  exists (import damage) → remove-field.
- `island-entity` — advisory — ≥3 entities on the sheet and this one has no
  reference in either direction → no fix; why explains relationships are the
  point of a model.

Normalization:
- `repeating-columns` — advisory — ≥2 fields matching /^(.+?)[ _-]?\d+$/ with
  the same base ('Item 1','Item 2') → extract-entity(base, those fields).
- `prefix-cluster` — advisory — ≥3 non-reference fields sharing the same
  leading word (≥4 chars, not the entity's own name, not a FIELD_TYPES word)
  e.g. 'Customer Name'+'Customer Email'+'Customer Phone' → extract-entity
  (prefix, those fields); if an entity named like the prefix already exists,
  emit `text-should-link`-style convert advice instead (one finding, not both).

Derived data as formulas:
- `derived-column` — advisory — a NUMBER (non-formula) field named like a
  computation ({Total, Subtotal, Sum, Net, Gross, Margin, Profit, Balance,
  Amount, Amount Due, Grand Total, Line Total, Average, Avg, Tax}, exact or
  as last word) while the entity has ≥2 other number fields →
  convert-to-formula when a confident guess exists (Price×Qty patterns:
  fields named like {price, rate, cost, amount} × {qty, quantity, hours,
  units, count}; else sum of the other number fields when there are exactly
  2-3); otherwise advisory without fix. The why teaches: stored totals drift;
  calculated ones can't.
- `stale-select` — advisory — select field where ≥1 row holds a value not in
  options → convert-to-select with the union (existing options + observed
  values) as a normalizing fix.
- `text-low-cardinality` — advisory — text field, ≥6 non-empty values, ≤4
  distinct (case-insensitive), avg length < 24 → convert-to-select with the
  observed distinct values.

Determinism + perf: pure functions of the input; no randomness; single pass
per rule; fine at prototype scale (hundreds of fields, thousands of rows).
Suppression: not in v1 (panel copy may say marks clear when resolved).

## UI surfaces — module `src/features/review/` (public contract)

```ts
/** All findings for the current project, memoized over the store. */
export function useLintFindings(): LintFinding[]

/** Finding counts per entity id: { blockers, advisories, total }.
 *  Entities with zero findings are absent from the map. */
export interface FindingCount { blockers: number; advisories: number; total: number }
export function useFindingCounts(): Record<string, FindingCount>

/** Findings for one entity, optionally narrowed to one field. */
export function useEntityFindings(entityId: string, fieldId?: string): LintFinding[]

/** Right-rail panel. Self-contained: header w/ sheet-health stamp, findings
 *  grouped by entity, APPLY FIX buttons. `onClose` closes the rail. */
export function ReviewPanel({ onClose }: { onClose: () => void }): JSX.Element

/** Compact red-pencil count badge — used on whiteboard entity cards.
 *  Renders null when the entity has no findings. */
export function FindingBadge({ entityId }: { entityId: string }): JSX.Element | null

/** Inline mark for one field inside the designer. Renders null when clean. */
export function FieldMark({ entityId, fieldId }: { entityId: string; fieldId: string }): JSX.Element | null
```

`ReviewPanel` details: header stamps `CLEAN SHEET` (viridian) when zero
findings, else `N MARKS` (red pencil) split into blockers/advisories. Each
finding renders as a review card: rule title (mono uppercase), the `why`
sentence in plain prose, the entity/field it targets (click → `select()` that
entity and focus it), and an `APPLY FIX` button when `finding.fix` exists
(calls `applyLintFix`, then the list re-lints automatically since it is derived
from the store). Grouped by entity, blockers first. Empty state is a designed
"clean sheet" plate, not a blank panel.

Consumers (owned by other modules, listed so they build against this):
- Whiteboard entity cards render `<FindingBadge entityId={id} />`.
- Designer field rows render `<FieldMark entityId fieldId />`.
- TopBar has a CHECK compartment showing the live total; clicking toggles the
  review rail open in the shell.

## Hard guardrails (owned by `src/features/designer/`)

Enforced at the input, so they cannot be violated at all:
1. **Duplicate field name** within an entity — the name input rejects the
   commit, shows a red-pencil inline note ("A field named 'Total' already
   exists on this entity"), and reverts on blur/Escape.
2. **Duplicate entity name** — same treatment on the entity name input.
3. **Invalid formula** — the expression cannot be committed while
   `validateFormula` fails; the field keeps its last valid source and the error
   note explains. (Typing freely is fine; only the commit is blocked.)
4. **Select field with zero options** — the type may be chosen, but the field
   shows a persistent blocker note until at least one option exists, and the
   data grid renders its cells disabled with an explanatory title.

Every guardrail message states the *why* in one sentence, matching the
reviewer's voice.
