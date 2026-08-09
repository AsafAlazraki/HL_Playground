# TABLE VIEW — spec

The app has two top-level views, switched from the title block:

- **SHEET** — the blueprint whiteboard (schema, relationships, zones).
- **TABLE** — a full-window Excel-grade data workspace.

Same data, same store, two lenses. Nothing about the store or model changes.

## Why it exists

The 340px inspector grid is fine for a glance and a quick edit; it is hopeless
for real data work. People arrive expecting a spreadsheet. Give them one —
then let the red-pencil reviewer teach them why a spreadsheet alone was never
enough.

## Module `src/features/table/` — public contract

```ts
export function TableWorkspace(): JSX.Element   // fills its container
```

Owns its own entity switching (reads/writes store `selection`), toolbar, grid,
and all keyboard behavior. The shell renders it full-bleed when view === 'table'.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ toolbar: [entity tabs] │ search │ filter │ ROWS ▏12▕ │ +ROW  │
├──────┬───────────────────────────────────────────────────────┤
│ 01   │ cells …                                               │
│ 02   │                                                       │
└──────┴───────────────────────────────────────────────────────┘
```

- **Entity tabs** across the top of the workspace: accent ink dot + entity name
  + row count in mono. Active tab = white plate with a 2px `--ink` bottom stamp.
  Ordered by `createdAt` (deterministic — same rule as the index panel).
- **Row-number gutter** frozen left (mono, 2-digit padded), header row frozen
  top. Both stay put while scrolling; the corner cell is the select-all box.
- **Column headers**: field name (uppercase, 11px) + colored `.type-tag` +
  sort chevron + a resize grip on the right edge. FX columns carry the teal
  read-only cue.
- Grid fills all remaining height; horizontal + vertical scroll inside the grid
  body only — the page never scrolls.

## Excel behaviours (all four are required)

### 1. Keyboard navigation
Single active cell with a 2px `--blue` ring, plus an anchor+focus range.
- Arrows move; `Ctrl+Arrow` jumps to the edge of the data block.
- `Tab` / `Shift+Tab` move right/left, wrapping to the next/previous row.
- `Enter` commits and moves down; `Shift+Enter` up. `Escape` reverts the cell
  to its pre-edit value and exits edit mode.
- Typing any printable character on a selected (non-editing) cell **replaces**
  the value and enters edit mode; `F2` or double-click enters edit mode with
  the existing value and the caret at the end.
- `Delete` / `Backspace` on a selection clears those cells (formula cells are
  skipped, never cleared).
- `Home` / `End` → first/last column; `Ctrl+Home` / `Ctrl+End` → first/last cell.
- `PageUp` / `PageDown` move a viewport's worth of rows.
- The grid is a single `tabIndex=0` focus surface with `role="grid"`; cells are
  `role="gridcell"` and `aria-selected`. Editing happens in a real input
  rendered into the active cell only — never 200 live inputs.

### 2. Copy / paste blocks
- `Ctrl+C` copies the selected range as TSV (tab-separated, newline rows) to
  the clipboard. Formula cells copy their **computed** value.
- `Ctrl+V` pastes TSV **from Excel/Sheets** starting at the active cell:
  parses rows/columns, coerces each value to the target field's type
  (number parse, `true/false/yes/no/y/n/1/0` → boolean, ISO or `DD/MM/YYYY` →
  date, select matched case-insensitively against options, reference matched
  against target-entity row labels), skips formula columns silently, and
  **creates new rows** when the paste extends past the last row.
- Values that cannot be coerced are left unset and reported once in a summary
  toast ("14 cells pasted · 2 skipped — see marks"), with the offending cells
  carrying a red-pencil corner tick.
- `Ctrl+X` = copy + clear. All clipboard work goes through the async
  Clipboard API with a `document.execCommand` fallback path.

### 3. Sort, filter & search
- Click a header to sort asc → desc → none. Sort is a **view-only** transform —
  never reorders stored rows. Sorted state shown by a filled chevron + the
  header cell tinted `--blue-wash`.
- Per-column filter: header menu with distinct values (checkbox list) for
  select/boolean/reference, and a contains-box for text/number/date. Active
  filters show as removable chips in the toolbar.
- Quick search box filters rows across all columns (case-insensitive,
  matches computed formula values too). Matches highlight with a
  `--blue-wash-strong` underlay in the cell.
- The toolbar row count reads `SHOWING 8 / 42` whenever a filter or search is
  narrowing the set.

### 4. Fill & multi-select
- Click-drag selects a range; `Shift+Click` extends; `Ctrl/Cmd+Click` on a row
  number adds that whole row; clicking a column header cell selects the column.
- The active range shows a `--blue` 1.5px border with a `--blue-wash` fill and
  a small square **fill handle** at its bottom-right.
- Dragging the fill handle down/right copies the anchor cell's value across the
  swept range (`Ctrl+D` = fill down from the top row of the selection).
- Selected whole rows can be deleted together via a toolbar DELETE ROWS action
  that names the count and confirms once.

## Cell rendering by type

Same semantics as the inspector grid — reuse the logic, not the markup:
text/number inputs, drafting checkbox for boolean, date input, select dropdown,
reference dropdown of the target entity's rows via `rowLabel`, and formula
cells computed read-only via `evaluateRowValues` (teal mono; `#ERROR` /
`#CYCLE` in red-pencil with an explanatory `title`). Number display: up to 4
decimals, trailing zeros trimmed. Required-but-empty cells carry a subtle
red-pencil left tick.

## Performance

Row virtualization (windowing) kicks in above 150 rows — render only the
visible slice plus a 10-row overscan, absolute-positioned inside a spacer of
the full scroll height. Formula evaluation is memoized per row and only for
visible rows. Column widths live in component state, keyed by fieldId.

## Art direction

Chrome material — white nautical instrument panels, marine-navy ink, hairline
rules, mono micro-labels. The grid reads like a precision instrument: 1px
`--hairline` cell rules, `--paper-high` cells, `--paper-sunken` frozen gutter
and header, zebra striping at ~2% ink. No canvas-navy tokens here (this view
is not the blueprint). Tokens only — never a raw hex value. All classes are
`tb-` prefixed.

## Whiteboard card modes (owned by `src/features/whiteboard/`, not this module)

Each entity card gains a per-card mode control: **SCHEMA** (field list, today's
look) / **DATA** (compact live mini-table: first 5 rows × first 4 non-formula
columns + row-count footer, values read from the store, read-only) / **COMPACT**
(name + field and row counts). The existing global DETAIL/COMPACT toggle
becomes the default mode applied to cards that have no per-card override.
