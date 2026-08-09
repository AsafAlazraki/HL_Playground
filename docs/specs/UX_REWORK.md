# UX REWORK — binding spec

Direct user feedback, verbatim, that this rework must satisfy:

1. *"unusable UI"* / *"clearly unusable"* — the screen is overcrowded and the
   right inspector runs off the edge of the viewport.
2. *"overlap of data"* — rule plates are drawn on top of entity cards, hiding
   their fields.
3. *"I am not happy with how rules look. just by looking at the sheet you
   should be able to understand what is going on without having to click
   elsewhere."*
4. *"navigating the blueprint screen should be faster than it is it is slow"*
5. *"when I move something it should retain position"*
6. *"in table view I still want the tables visual in the sheet"*
7. Demo data must use **Highfield** boats, **Yamaha** outboard motors,
   **Redco** trailers.

Nothing here is optional. If a change trades one of these away, it is wrong.

---

## 1. Screen layout

### Left panel — ONE list at a time (240px)
Tabs at the top: **ENTITIES | RULES**. The active tab's list owns the full
panel height with a single scroll region. No stacked sections, no nested
scrollbars. Entity counts and rule validity stamps stay.

### Node palette — floating strip on the canvas, NOT a left column
A horizontal instrument strip floating at the **bottom-centre of the canvas**
(Miro-style), visible only on the RULES/BOTH layer. Each node kind is a compact
chip: mono tag (`FIT`, `IF`, `WHR`, `LNK`, `LOOP`, `DO`, `OUT`) + short label,
~76px wide, in the kind's ink. Hover reveals the blurb as a tooltip above the
strip. Drag a chip onto the sheet, or click it to drop at the viewport centre.
Height ≤ 56px total. It must never consume left-panel space again.

### Right rail — 340px, MUST NOT OVERFLOW
Hard requirement: at 1280px, 1536px and 1920px viewport widths, the rail's
right edge equals the viewport's right edge, and no descendant is clipped
horizontally. Verify by measuring `getBoundingClientRect().right` against
`window.innerWidth`, and `scrollWidth <= clientWidth` on `.shell-root`. Any
control inside that cannot fit wraps rather than overflows.

### Kill the standalone rule strip
The `RULE  MOTOR FITMENT  [BOAT]  CHECKS ✓` bar above the workspace wastes a
full row. Fold it into the canvas toolbar as a compact readout beside the layer
switcher.

---

## 2. Rules must be legible on the sheet itself

This is feedback #3 and it is the biggest design change.

**A rule plate must state its own logic in full.** No plate may summarise
itself into something you have to click to understand.

- **Match** — renders every clause as its own row, with entity stamps:
  ```
  FIT   MATCH · Motor
  ────────────────────────────────
  MOTOR HP        ≥   BOAT Min HP
  MOTOR HP        ≤   BOAT Max HP
  ────────────────────────────────
  no match → carry on          (or: → skip row)
  ```
  Entity stamps use that entity's **bright** accent on the plate.
- **Condition** — one row per branch: the branch label, its test, and the
  handle it leaves by. `else` is always shown as the last row.
- **Filter** — every clause row, same treatment as match.
- **Find** — `follow BOAT → Customer`.
- **Loop** — `for each MOTOR row`.
- **Action** — the actual write: `set Recommended = true`,
  `link BOAT ↔ MOTOR into Boat Motor`.
- **Output** — the result-set name plus its column list as stamped chips
  (`BOAT Name`, `MOTOR Model`, `MOTOR HP`), truncating with `+N more` past 6.

Plates widen to **280px** and grow vertically to fit their content. Clause rows
are mono 10.5px. A plate whose config is incomplete says exactly what is
missing (`pick an entity to match`), in red pencil — never a blank plate.

**Run results decorate the plate**: hit counts as mono chips on the plate and
on each edge (`6 rows`, `12 matched`), so a completed run is also readable at a
glance.

---

## 3. No overlap, ever

Rule flows and entity cards must never occupy the same space.

- **Lane separation**: rule flows live in their own horizontal band. When a
  rule is opened and its nodes would intersect any entity card's bounding box,
  relayout the flow into free space *above* the entity cluster (a band starting
  160px above the topmost entity card), left-to-right at 320px pitch, and
  persist the new positions via `moveRuleNode`. Do this once per rule, on first
  open, and never again after the user has moved a node (track a per-rule
  `laidOut` flag in component state).
- **RULES layer**: entity cards become a genuine *underlay* — not muddy ghosts.
  Drop them to a flat navy silhouette: card outline at `--canvas-hairline`,
  name only, no field rows, no shadow. They orient you without competing.
- **BOTH layer**: full cards AND full plates, with the lane separation above
  guaranteeing they never intersect.
- The demo's own rule node positions must be authored in the free band, not on
  top of the entities.

---

## 4. Performance — the canvas must feel instant

Root cause found: the store→local mirror in `Whiteboard.tsx` rebuilds **every**
node object whenever `derivedAll`, `selection`, or `selectedRuleNodeId` change,
so every node re-renders on every selection click and every store mutation.

Required fixes:
- **Preserve object identity.** In the mirror, return the *previous* node
  object unchanged when nothing about it changed (same data reference, same
  position, same selected flag). Only allocate a new object for nodes that
  actually differ. `React.memo` on the node components then actually bites.
- **Do not re-derive on unrelated store changes.** `useDerivedGraph` must
  depend on narrow slices, not on whole-store identity. A row edit must not
  rebuild the ERD nodes unless a card is in DATA mode showing that entity.
- **Selection must not rebuild the graph.** Handle selected state via a
  dedicated cheap pass that touches only the previously-selected and
  newly-selected nodes.
- Memoize node components with `React.memo` and stable `data` objects.
- Target: dragging a card and panning stay smooth with the fitment demo loaded;
  no visible lag on selection clicks.

## 5. Moving something must retain its position

Feedback #5 is a functional bug. Required behaviour, verified by test:
1. Drag an entity card → release → the card stays exactly where dropped.
2. Switch layer (ENTITIES → RULES → BOTH) → switch back → still there.
3. Switch view (SHEET → TABLE → SHEET) → still there.
4. Reload the page → still there (it is persisted).
5. Same for rule plates and zone frames.

The auto-fit/auto-frame effects must never fight a user-placed position:
once the user has interacted, no effect may call `fitView`/`fitBounds` unless
the user explicitly presses FIT. Camera framing on layer switch is allowed
**only** the first time that layer is opened in a session.

---

## 6. TABLE view — tables ON the blueprint sheet

Replace the full-screen chrome grid with **data sheets pinned to the canvas**.

- TABLE view keeps the navy blueprint canvas, pan/zoom, and the same node
  positions as SHEET view (one shared layout — a card and its table are the
  same object seen two ways).
- Each entity renders as an **entity-table node**: white paper sheet, accent
  header with the entity name + row count, a real column header row with type
  tags, and its rows as editable cells. Default size ~520×320, resizable via
  `NodeResizer`, scrolling internally when the data exceeds the frame.
- Editing inside a table node reuses the existing table cell logic and
  behaviours (typed cells, formula cells read-only in teal, keyboard nav within
  that table, paste into that table). Wrap the grid area in `nodrag` so
  selecting cells never drags the node.
- Relationship edges stay visible between table nodes, so you can see a link
  field and the table it points at simultaneously.
- Add-row control in each table's footer.
- The existing `TableWorkspace` full-screen grid is retained but demoted: keep
  it reachable as a **FOCUS** action on a table node (expands that one entity
  full-window for heavy data entry). Do not delete working code.

---

## 7. Demo data — real marine brands

Rebuild `src/demos/fitment.ts` with these, as clearly-labelled sample data:

- **Boat** entity — *Highfield* aluminium-hulled RIBs. Use real model names
  (e.g. Ocean Master 540, Patrol 660, Sport 460, Classic 380, Ocean Master 590)
  with plausible length/weight and a Min HP / Max HP rating band per model.
- **Motor** entity — *Yamaha* outboards. Real designations (F40, F70, F115,
  F150, F200, F250, F300) with HP, weight and price.
- **Trailer** entity — *Redco* trailers, with max load kg, max length ft, price.
- **Boat Motor** join entity as before (Label, Boat, Motor, Fitment Note,
  Recommended).

Keep the verified match distribution shape: several boats fitting multiple
motors, **exactly one boat fitting a single motor**, and **one boat fitting
none** (carried through by `passThrough`), so the empty path stays visible.
Recompute and state the actual distribution after authoring — do not copy the
old numbers.

These are real manufacturers; the rows are invented sample data for a
prototype and must never be presented as official specifications. Put that note
in the demo's `blurb` or description field.

---

## 8. Late additions (user, mid-rework) — also mandatory

### 8a. Remove the decorative sheet frame
*"remove the weird black lines on top and left"* — the inset hairline rectangle
(`.shell-frame`) read as stray black lines down the top and left of the window.
It is now `display: none` in `src/app/shell.css`. **Do not reinstate it**, and
do not reintroduce an equivalent full-window border anywhere else.

### 8b. Every table has a UID column by default
*"obviously every table should have a uid by default"* — correct, and it is a
best practice the app should model rather than leave to the user.

`src/types/model.ts` now provides this (already implemented — consume it, do
not reinvent it):

```ts
export const UID_FIELD_ID = '__uid'
export const UID_FIELD: Readonly<FieldDef>          // name 'UID', type text, required
export const isSystemFieldId: (fieldId: string) => boolean
export function visibleFields(entity: EntityDef): FieldDef[]   // UID first, then entity.fields
export function readCell(row: RowData, fieldId: string): CellValue  // resolves UID -> row.id
```

The UID is the row's existing unique id surfaced as a **locked system column**.
It deliberately lives OUTSIDE `EntityDef.fields`, so it costs no storage, cannot
collide with a user field name, and never trips the linter.

Every surface that lists columns must show it **first**, and must render it as
system-owned — mono, `--ink-soft`, a small lock/key affordance — and make it:
- **not editable** (no cell editor, no paste target, cleared by nothing),
- **not deletable, renameable, retypeable or reorderable** (no controls in the
  designer field list),
- **not a formula dependency picker option** unless read-only use is safe,
- **copyable** (Ctrl+C on the cell yields the id — useful for debugging),
- **sortable, filterable and searchable** like any other column.

Surfaces that must be updated:
- `features/table/` — UID as the first column in the entity-table node and in
  the full-window TableWorkspace; `readCell` supplies the value.
- `features/data/` — the inspector DataGrid, same treatment.
- `features/whiteboard/` — entity cards list it first in SCHEMA mode with a
  `TXT` tag and a system marker; DATA-mode mini-tables show it as column one.
- `features/designer/` — shown at the top of the field list, visibly locked,
  with a one-line note explaining it is the row's permanent identifier. The
  add-field flow must refuse the name "UID" (case-insensitive) with the usual
  red-pencil guardrail sentence.
- `features/io/` — export already carries `row.id`; no format change. State in
  the export that UID maps to `row.id`.
