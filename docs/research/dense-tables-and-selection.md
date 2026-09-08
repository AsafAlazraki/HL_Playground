# DENSE TABLES, SELECTION AND DISCLOSURE — THE PUBLISHED NUMBERS

> Studied 2026-09-08. Ten data-dense professional tools, read for the three things
> `src/features/table` has to answer at 51 tables and 15,691 rows: how do you keep
> 30+ columns readable, what does selecting many rows do, and how do you inspect
> one row without losing your place. Only published, citable numbers are recorded —
> where a product ships a control but publishes no value, that is said.

## What we already believed

Density is already a first-class setting (`tableReadState.ts`, `density:
'comfortable'`), level-of-detail is measured rather than tasteful (`tableLod.ts`:
8.4px legibility floor, two thresholds with a dead band at 0.60/0.66 for
hysteresis), and the performance work is recorded with numbers (6,648 canvas
elements → 210; pan p90 66.6ms → 16.8ms). Search is bounded rather than infinite
(`perTable: 8, total: 40, tables: 6`). What we have never done is check our
constants against anyone else's.

## What the best in the world do

### Row height — the only place with hard published numbers

| product | control | values |
|---|---|---|
| **Retool** | row height presets | **20 / 32 / 48 / 60 / Dynamic** |
| **Observable `Inputs.table`** | implied unit | **22px** (`maxHeight` defaults to `(rows + 1) * 22 - 1`) |
| **MUI X DataGrid** | `rowHeight` | default **52px** |
| **React Aria `Virtualizer`** | `TableLayout` | `rowHeight` **48**, `headingHeight` **48** |
| **Airtable** | Short / Medium / Tall / Extra Tall | no px published |
| **Grafana** | Small / Medium / Large + max row height | no px published |
| **GitHub Primer** | `cellPadding` condensed/normal/spacious | no px published |
| **Notion** | — | **no row-height control at all** |
| **Linear** | — | **no density, row-height, or column model at all** |

The usable band is **20–24px spreadsheet-dense → 32px default dense → 48–52px
comfortable**. Retool's ladder and Observable's 22 are the two hardest points.
Observable's `rows` default of **11.5** is deliberate: the half row is a scroll
affordance.

### The twelve-column threshold — a real published number

Observable, verbatim: fixed layout by default *"if there are twelve or fewer
columns; this improves performance and avoids reflow when scrolling"*, and `auto`
*"can cause the columns to jump around as the user scrolls"*. At 30+ columns we
are permanently in fixed-layout territory: fixed widths, sticky header, horizontal
scroll, left-pinned identity columns. Grafana's **150px default minimum column
width** is a reasonable starting constant.

### Column pinning — three mechanics, and one instructive absence

- **Grafana**: "Frozen columns", left edge only.
- **Airtable**: freezing is **drag-only** — the docs explicitly say there is no
  right-click "freeze up to this field". Undiscoverable.
- **TanStack Table** documents both strategies: sticky-CSS pinning (one DOM order)
  versus split tables (`getLeftHeaderGroups` / `getCenterHeaderGroups` / …). State
  is `columnPinning: { left: [], right: [] }`.
- **Linear has no column model whatsoever** — its Display options are group-by and
  order-by plus a list↔board toggle. Worth knowing before treating Linear as the
  reference for everything.

### Selection — Linear's keyboard model, Figma's mixed-value model

**Linear** publishes the most complete keyboard selection vocabulary in the set:
`X` select (or Shift+click; a checkbox is *revealed* on hover, costing no column
width), `J`/`K` or arrows to move, `Shift+↑/↓` to extend, `Cmd+A` all, `Esc`
clear, `Alt+Shift+↑/↓` to move to top/bottom, then `Cmd+K` scoped to the
selection with a bulk-action toolbar at the bottom of the screen. **What happens
when selected rows disagree on a field is not documented anywhere.**

**Figma answers that question, and the answer is the single highest-leverage
borrowing in this study.** Three separate mechanisms:

1. **`Mixed` is an editable token, not a placeholder.** Typing a bare number
   overwrites every layer; typing **`Mixed+100`** applies a *delta* to each
   layer's own value. The docs warn that replacing rather than editing the field
   flattens them.
2. **Mixed fills get a whole panel.** A "Selection colors" section appears only
   for a mixed selection; it *"groups colors by variable, style, and normal fills,
   and each fill only appears once"*, with a target icon to select every layer
   using that value. **Mixed state is a set you can enumerate and act on, not an
   error state.**
3. **Multi-edit as an explicit mode**, entered with `Enter`.

Also: `Select All other layers that have the same: Properties / Fill / Stroke /
Effect / Text Properties / Font / Instance`.

**Observable** has an unusual and defensible default: `required` is `true`, so
*"the table's value is all data if no selection"* — empty selection means
everything.

The **ARIA grid baseline**, if we roll our own: `Ctrl+A` selects all cells,
`Shift+Arrow` extends by one.

### Progressive disclosure — peek, and the tap-versus-hold distinction

NN/g's governing constraint: *"designs that go beyond 2 disclosure levels
typically have low usability"*, and it breaks down *"when features are
interdependent rather than hierarchical"*.

**Linear's Peek** is modelled on macOS Quick Look and the ergonomics are the
sharpest single detail found: **tap `Space`** to toggle a sticky peek, **hold
`Space`** for a temporary peek that closes on release, `↑`/`↓` moves between
adjacent rows **while the peek stays open**, `Esc` closes. That separates *glance*
from *inspect* without introducing a mode.

**Airtable** names the two shapes outright — **Sidesheet** (list stays visible,
prev/next, resizable) versus **Full-screen** ("recommended for deep single-record
focus") — as an explicit per-view setting, plus a dedicated **Record Review**
layout for going through rows one at a time.

**Stripe** takes the opposite position: every row click is a named full route
(`customerDetails`, `paymentDetails`, …), no drawer option. Right for a
transactional dashboard where each record is a destination; wrong where the point
is comparing a row against its neighbours.

NN/g on modals is decisive for us: *"Avoid modal dialogs for complex decision
making that requires additional sources of information unavailable in the modal."*

### Latency budgets, and what they imply about animation

| source | number |
|---|---|
| RAIL / web.dev | *"Complete a transition initiated by user input within 100 ms"*, processing within **50 ms**, frames in **10 ms** |
| Superhuman | *"the 100 ms rule. Then, the 50 ms rule… 1-2 Chrome frames! (<32 ms)"* |
| Superhuman, on motion | **"Superhuman Mail uses minimal animations, so no time is wasted on loading them."** |
| Ink & Switch, local-first | Ideal #1 is literally *"No spinners: your work at your fingertips"* |
| Linear (StyleX migration) | **20–35% less main-thread CPU** on view-heavy pages by moving off runtime CSS-in-JS |

**Important correction to a widely repeated claim:** Linear's famous "no spinners,
never animate high-frequency actions" doctrine is **not verifiable in Linear's own
writing**. `linear.app/method` and `/quality` contain no latency, spinner or
animation language. Do not attribute it to them as a published principle.

### Virtualisation versus accessibility — and the 2026 way out

**AG Grid's own docs** are the clearest vendor admission that these are in
tension. `ensureDomOrder` exists because *"by default, rows and columns can appear
out of order in the DOM"*; `suppressColumnVirtualisation` means *"if you have 100
columns, but only 10 visible… all 100 will always be rendered"*; the server-side
row model **cannot announce row count at all**. **TanStack Virtual** hands the
whole ARIA contract to you — it *"does not ship with or render any markup or
styles for you"* and its intro carries no accessibility guidance. **Grafana**
states the tradeoff as a product rule: turning on Dynamic height **disables
virtualisation**.

The escape, Baseline since September 2024 — MDN on `content-visibility: auto`:

> *"Off-screen content within a `content-visibility: auto` property remains in the
> document object model and the accessibility tree. This allows improving page
> performance … without negatively impacting accessibility."*

Rows stay findable by `Ctrl+F`, focusable, selectable; `aria-rowindex` becomes
unnecessary; and layout/paint are still skipped off-screen. Pair with
`contain-intrinsic-size` to stop scrollbar jump.

## The map — practice against this repo

| practice | who | do we? | verdict |
|---|---|---|---|
| Named row-height presets on a 20/32/48 ladder | Retool, Grafana | one density setting | **adapt** |
| Fixed column layout above ~12 columns | Observable | not stated as a rule | **adopt** |
| Left-pinned identity column | Grafana, Stripe, TanStack | **no** | **adopt** |
| Reveal the selection checkbox on hover | Linear | n/a | **adopt** |
| `Shift+J/K` extends, same axis as movement | Superhuman | n/a | **adopt** |
| Enumerate mixed values as a clickable set | **Figma alone** | **no** | **adopt — highest leverage here** |
| Relative edit against a mixed value (`Mixed+100`) | Figma | **no** | **adapt** |
| Tap-vs-hold Space peek, arrows live inside | Linear | **no** | **adopt** |
| Sidesheet vs full-screen as a named setting | Airtable | **no** | **adapt** |
| One command key meaning "act on what's under the cursor" | Raycast, Superhuman, Linear | planned (`⌘K`, UX_PASS §2) | **adopt** |
| Render the shortcut inline in the palette to teach it | Superhuman | **no** | **adopt — cheap** |
| Remap/disable single-key shortcuts (WCAG 2.1.4 **Level A**) | **nobody** | **no** | **adopt — free differentiator and a real liability** |
| JS row virtualisation as the default | AG Grid, TanStack | LOD instead | **reject — try `content-visibility` first** |
| Modal record editor | — | no | **reject** |
| Route-only detail as the primary path | Stripe | no | **reject** |

## What we adopt, and in what order

1. **Mixed-value enumeration (Figma).** Bulk editing a column across selected rows
   is unavoidable on a price file, and every other product in the set either
   blanks the field or is silent. Show the distinct values with counts, each
   selecting its own sub-set, plus one control to set them all.
2. **Tap-vs-hold Space peek with arrows live inside.** The cheapest way to inspect
   a 30-column row without losing your place, and it stays inside NN/g's
   two-level limit.
3. **Say the twelve-column rule out loud** and pin the identity column. At 30+
   columns fixed layout is not a preference.
4. **WCAG 2.1.4 compliance on single-key shortcuts.** Linear and Superhuman both
   ship large single-key vocabularies and neither documents remapping or
   disabling. It is a Level A requirement and nobody in the cohort meets it.

## What we reject, and why

- **JS row virtualisation as the default.** At our scale a single view is hundreds
  to low thousands of rows. Virtualisation buys frame time and costs the entire
  accessibility contract; `content-visibility: auto` keeps rows in the a11y tree
  and in find-in-page. **Measure before virtualising.**
- **The Bloomberg aesthetic as a shortcut to Bloomberg's density.** Amber-on-black
  was so terminals were identifiable across a trading floor. What produces the
  density is the monospace fixed character grid, the command line and zero
  navigational chrome — and the learnability (an 86-page manual, a user base for
  whom *"the more painful the UI is, the more satisfied these users are"*) is a
  moat, not a design goal.
- **Copying Linear's table model.** It does not have one.

## Sources

Retool <https://docs.retool.com/apps/guides/data/table/customization> ·
Observable <https://observablehq.com/framework/inputs/table> ·
MUI X <https://mui.com/x/react-data-grid/row-height/> ·
React Aria <https://react-aria.adobe.com/Virtualizer> ·
Grafana <https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/table/> ·
Airtable <https://support.airtable.com/docs/airtable-grid-view> and `/docs/airtable-interface-layout-record-detail` ·
Primer <https://primer.style/components/data-table> ·
TanStack <https://tanstack.com/table/v8/docs/guide/column-pinning> and <https://tanstack.com/virtual/latest/docs/introduction> ·
AG Grid <https://www.ag-grid.com/javascript-data-grid/accessibility/> ·
Linear <https://linear.app/docs/select-issues>, `/docs/peek`, `/docs/display-options`, <https://linear.app/now/rebuilding-delta-sync-read-path> ·
Figma <https://help.figma.com/hc/en-us/articles/360042553434-View-and-adjust-colors-in-a-mixed-selection> and `/360039956914` ·
Stripe <https://docs.stripe.com/stripe-apps/components/datatable.md> ·
Raycast <https://manual.raycast.com/keyboard-shortcuts> ·
Superhuman <https://blog.superhuman.com/superhuman-is-built-for-speed/> and `/how-to-build-a-remarkable-command-palette/` ·
RAIL <https://web.dev/articles/rail> ·
Ink & Switch <https://www.inkandswitch.com/essay/local-first/> ·
MDN <https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility> ·
W3C <https://www.w3.org/WAI/ARIA/apg/patterns/grid/> and <https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html> ·
NN/g <https://www.nngroup.com/articles/progressive-disclosure/> and `/modal-nonmodal-dialog/`

**Not verified:** no directly-measured pixel values were obtainable — the browser
in use was a live session, not a clean automation profile, and agents kept
colliding over tabs. Every px figure above is one the vendor publishes. Bloomberg
403s all automated access, so claims about their own design writing are
second-hand. **Height is dead** — `height.app` returns `ERR_CONNECTION_RESET`; it
shut down 24 Sep 2025 after an AI pivot. Drop it from the reference set.
