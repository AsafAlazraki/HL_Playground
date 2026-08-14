# JOURNEY TWO — THE SHEET AND THE TABLES

Audit lens: `sheet-and-tables`. 1280×800, Chromium via Playwright MCP, project
already carrying the seeded Northside set (21 tables, 651 rows, verified at the
start and again at the end).

Persona: a boat dealer's sales manager. Clicks what looks clickable, reads
nothing.

`CLUELESS_USER_TESTS.md` read in full first. Nothing below repeats a FIXED
finding as new. Where a finding touches an item already logged as OPEN (O11,
O12, IA-4) it says so and adds only the new measurement.

**Nothing under `src/` was edited.** Screenshots in `docs/audit/screens/sheet-*.png`.

---

## HOW THIS WAS MEASURED, so the numbers can be argued with

* Frame times: one `requestAnimationFrame` loop dispatching one `mousemove` per
  frame at the pane, sampling `performance.now()` deltas, first 3 frames
  discarded. The **same harness** produced every number below, in one session,
  minutes apart — so the comparisons between zoom levels are apples to apples
  even if the absolute numbers would differ on other hardware.
* Sizes: `getBoundingClientRect`, `getComputedStyle`, `scrollWidth`/`clientWidth`.
* Two destructive paths were exercised with `window.confirm` replaced by a
  recorder that returns `false`, so the message was captured and nothing was
  destroyed. Both are named below and both are also confirmed against source.
* Everything I actually broke, I restored: one cell edited and put back
  (`PVC DG-G-DG`), one cell cleared and put back (`Trade` = 13357), one row
  added and deleted. Final state: **21 tables, 651 rows, Highfield 31 fields** —
  identical to the start.

## CONSOLE

23 errors across the whole session, **100% one class**: the documented
cross-origin image probe (`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`,
`northsidemarine.com.au/…jpg`). Zero errors of any other kind, zero warnings.

One correction to the brief's "baseline is 2": it is not a baseline, it is a
running total. A clean land is 2; walking the camera to Highfield made it 4;
browsing the sheet made it 23. Same defect, unbounded count. O3 says images are
"held as links … rather than fetched and failing" — they are still being fetched.

---

# THE RANKED FINDINGS

Ranked by how early they stop someone.

---

## S-1 · The sheet runs at 12–24 fps at every zoom where a table can be read. This is the second minute of the app.

**What I did.** Pressed FIT, then the `+` control five times to reach the first
zoom at which any card draws a grid, waited 1s for the sheet to settle, then
panned four times (two directions, alternating) with the harness above.

**What I expected.** The same "instant" that F2 was closed on: *p90 16.8ms, zero
frames over 33ms.*

**What happened.** F2's number is only true while everything on screen is a
plate. The moment a card is legible, it is gone.

| zoom | what is drawn | cards in window | p50 | p90 | max | frames > 33ms |
|---|---|---|---|---|---|---|
| **0.279** (the FIT zoom) | 21 plates | 21 | **16.7** | **16.8** | 43.5 | **1 of 57** |
| **0.693** (first grid zoom) | grids | 7 | **70.1** | 86.2 | 108.7 | **42 of 42** |
| 0.693, pass 2 | grids | 8 | **82.0** | 119.9 | **170.6** | 41 of 42 |
| 0.693, pass 3 | grids | 7 | **80.5** | 95.8 | 110.5 | 42 of 42 |
| 0.693, pass 4 | grids | 8 | **68.8** | 102.9 | 110.9 | 41 of 42 |
| **1.00** (where clicking a table lands you) | grids | 4 | 41.2 – **87.2** | 46.6 – 111.7 | 135.6 | **57 of 57** |

Four consecutive passes at 0.693, **every frame but one over 33ms**, p50 around
75ms. That is 13 fps, sustained, on the surface the persona spends most of their
time on. Wheel-zoom is better but not clean: p50 16.8, p90 45.3, 13 of 37 frames
over 33ms.

The cost tracks the number of grid cards in the window, and each Highfield-sized
card mounts a great deal: with 4 cards up, `.react-flow__viewport *` measured
**5,736 elements**. When the camera moves so no card is in the window, the same
harness returns to p50 16.7 / p90 16.8 / 0 frames over 33ms — the sheet itself is
not the problem, the mounted grids are.

**Why this is first.** "Does it feel instant?" is the question, and at plate zoom
the answer is yes. But a plate is not a price file. The first time this person
zooms in far enough to read a row — which is the whole point of the product —
the sheet starts dragging behind the mouse. `sheet-03-highfield-zoom1.png`.

**Not tested:** whether this reproduces outside a Playwright-driven Chromium, and
whether a real trackpad's event rate changes it. The plate-vs-grid *ratio* (5×
on p50, 40× on frames-over-budget) was measured in one session with one harness
and is the part I would trust.

---

## S-2 · One keystroke offers to delete a whole price table, through an OS dialog whose default answer is destroy, and it names none of what goes with it.

**What I did.** Clicked the Highfield card's title bar on the sheet — the most
ordinary gesture there is, it is how you select a table — and pressed
**Backspace**. Then **Delete**. Then repeated the whole thing at FIT zoom by
clicking a plate (`Stacer × Stacer Trailers — Trailer Fitment`). `window.confirm`
was replaced by a recorder returning `false`, so nothing was deleted.

**What I expected.** Either nothing, or the sheet F27 describes — the one that
names the 40 rows, the 31 columns, the *two link columns on two other tables*
that go too, and the *two rules that stop existing*.

**What happened.** A native `window.confirm`, three times, verbatim:

```
Delete the table “Highfield Inflatables” and its 40 rows?
Delete the table “Stacer × Stacer Trailers — Trailer Fitment” and its 34 rows?
```

That is the whole warning. It does not mention the link columns, it does not
mention the rules, and it is the OS dialog in Segoe UI that F24 said had left the
surface. It is `src/features/whiteboard/Whiteboard.tsx:463–476`, a
window-level `keydown` that skips INPUT/TEXTAREA/SELECT/contenteditable and
nothing else. In Chrome, `confirm`'s **OK is the focused default**, so Enter or
Space after that keystroke destroys the table.

`activeElement` at the moment it fired was `react-flow__node` in one run and
`body` in the other — i.e. this is live whenever a table is selected and the
pointer is not in a text field, which is the resting state of the sheet.

**The guarded path exists and is good** — F27's sheet is real. This is a second
door onto the same act, it is one keystroke away, and it carries the weaker
warning. That is the same shape as IA-4, one level up: the *easiest* gesture
carries the *weakest* warning, and here the gesture is a single key.

**Correctly guarded, for the record:** with the pointer inside a table's grid,
Delete and Backspace clear the *cell* and call `preventDefault`, so the
whiteboard handler stands down. I checked before claiming otherwise.

---

## S-3 · At the zoom the app opens on and returns to, the plate is below the legibility floor the plate was designed around.

**What I did.** Pressed FIT (which is also the arrival state: zoom 0.278571 both
times), then measured the computed type size of every text node inside a plate
and multiplied by the camera zoom.

**What happened.**

| plate part | CSS size | × zoom 0.2786 = on screen |
|---|---|---|
| table name (`.tb-lod-name`) | 30px | **8.36px** |
| row / column figures (`.tb-lod-num`) | 22px | **6.13px** |
| band chips and the words "rows"/"columns" (`.tb-lod-band`, `.tb-lod-unit`) | 11px | **3.06px** |

`src/features/table/tableLod.ts:18` sets the standard itself: *"Below 8.4px
neither Archivo nor IBM Plex Mono resolves."* The name lands at 8.36 — under its
own floor by a hair — and everything else on the plate lands at a third of it.

**This is not a fault in the plate.** At zoom 0.578 the same plate is excellent:
kind mark, name, the band chips readable as words, `14 TRAILERS · 24 COLUMNS`
(`sheet-18-lod-plate.png`). The fault is that FIT frames 21 tables across
2,920 × 2,520 units into 1,020 × 740 px of stage and lands at 0.279, which is
about half the distance the plate is drawn for.

**Consequence, which is the actual journey question.** *"Find one specific table
among 21 without using the panel."* At FIT you are reading 8px names across 21
cards; I could pick out `Highfield Inflatables` and `Formosa`, but the four
join tables along the bottom (`Highfield × Yamaha — Motor Fitment`,
`Stacer × Yamaha — Motor Fitment`, …) are three-line 8px wraps and I could not
tell them apart without zooming. With the panel it is one click and the camera
walks in — that path is good and fast. Without it, you zoom, pan, and hunt, at
13 fps (S-1). `sheet-01-land.png`, `sheet-20-fit-with-expanded.png`.

**The LOD transition itself is not confusing** and deserves saying so: plates
swap to grids between 0.578 and 0.693, in one step, cleanly, with no flicker
across four crossings. You can tell what a plate is — once you are close enough
to read it.

---

## S-4 · FIT COLUMNS makes the table unreadable, and it is the control sitting next to EXPAND on the biggest table in the project.

**What I did.** Opened Highfield Inflatables, pressed EXPAND, pressed
**FIT COLUMNS**.

**What I expected.** The columns made to fit, so I can see them all.

**What happened.** All 30 columns squeezed into 1,016px. Measured:

* every non-system column: **28px wide**
* the value box inside each cell (`.tb-val`): **`clientWidth` 3px** against
  `scrollWidth` up to 250px
* the column header `VARIANT` rendered into **27.3px**

The result is in `sheet-05-fit-columns.png`: thirty headers reduced to one letter
and an ellipsis (`V… B… M… M… I… O…`), and every cell a single clipped glyph
fragment. Not one value in a 40 × 30 price table is legible, and you cannot tell
which column is which. The only readable things left are the image thumbnails.

The tooltip is honest — *"dense on purpose: for seeing the whole table, not for
reading it"* — but this persona does not hover, and the button is called
**FIT COLUMNS**, which reads as a promise. The job it is for (the table's shape
on one screen) is already done better by **COLLAPSE ALL** eight pixels to its
left, which folds 30 columns into 7 named chips.

The way back is good: the button becomes **RESET WIDTHS**, one click, and the
reader's own widths are untouched underneath (`tableFitState.ts`).

---

## S-5 · Every destructive confirmation in the table puts the focus on the destructive button.

**What I did.** Opened the column menu → **Remove column** on `Shaft Lgth`, and
again on `Max Load kg`, and separately selected a row and pressed **DELETE 1 ROW**.
Read `document.activeElement` at 80ms, 580ms and 1000ms after each sheet opened,
touching nothing in between.

**What happened.** All three times, at every sample:

```
activeElement = "REMOVE"       | btn btn-danger tb-confirm-go
activeElement = "DELETE 1 ROW" | btn btn-danger tb-confirm-go
```

It is deliberate: `src/features/table/ColumnMenu.tsx:114–115` puts `autoFocus`
on `className="btn btn-danger tb-confirm-go"`. So Enter or Space, pressed once
after opening the sheet, removes the column.

F24 states the opposite as a fix — *"Cancel takes the focus, not the confirming
button"* — and it is true of the component it was written for
(`src/features/designer/ConfirmSheet.tsx:79` focuses `cancelRef`). The table's
own confirms are a different component and did not get the rule.
`sheet-09-remove-maxload.png`.

Escape cancels correctly, the scrim cancels correctly, and cancelling left the
column count at 31 every time. The sheets themselves are well drawn — small,
anchored to the column they are about, and they say *"There is no undo."*

---

## S-6 · The commonest act in the app saves silently and cannot be taken back — and the commonest keystroke in a spreadsheet destroys a value with no dialog at all.

**What I did.** Double-clicked the `Variant` cell of Highfield row 01, typed
`AUDIT TEST 1`, pressed Enter. Then Ctrl+Z. Then Cmd+Z. Then reloaded the page.
Separately: clicked the `Trade` cell of the same row (value `13357`) and pressed
**Delete**, then **Backspace**.

**What happened.**

* The edit committed. **No toast, no mark, no "saved"** — the only `aria-live`
  region on the page reads `ROWS 40 COLUMNS 30`. You know it saved because the
  text changed.
* **Ctrl+Z: nothing. Cmd+Z: nothing.** The store has no `undo`, `redo` or
  `history` key of any kind, and no control anywhere on the surface contains the
  word "undo" (searched every text node and every `title`).
* It survived a full reload — `AUDIT TEST 1` was still in the store after F5.
* **Delete cleared the `Trade` cell — a price — instantly, with no confirmation
  and no toast.** Backspace does the same. There is no way back. I had to retype
  13357 from my own notes; a person would have to remember it or find it in an
  export they may never have made.

The contrast is what makes it a finding: deleting a *row* is gated by a
confirmation sheet **and** announces `1 ROW STRUCK` as a toast. Deleting the
contents of a cell — reachable by one key with no selection ceremony — is gated
by nothing and announces nothing.

This extends O12 rather than repeating it. O12 covers the four *gated* acts and
says each admits there is no undo. The unguarded everyday ones — edit a cell,
clear a cell — are not on that list and are where a day's work actually goes.

**Keyboard, otherwise, is good** and deserves saying: Arrow keys move the cursor
in all four directions, Tab moves right, Home jumps to the first cell of the row,
End to the last, typing a printable character starts an edit with that character,
Escape cancels the edit and restores the value, Enter commits and moves down
(Excel's convention). Cells carry `role="gridcell"`, `aria-colindex` and
`aria-selected`. **What is missing is F2** — there is no key that opens the
editor with the existing value in it, so a keyboard-only user cannot correct one
digit of a price; typing always replaces the whole cell.

---

## S-7 · Sort, narrow and remove-column live behind a button that is invisible until you happen to sweep the mouse over the header.

**What I did.** Measured the computed style of the column-menu buttons at rest,
then looked at the header row.

**What happened.** `getComputedStyle(.tb-th-menu).opacity` = **`0`** on every
column, `visibility: visible`, hit area 22 × 22px. `sheet-07-column-menu.png`
shows it plainly: `SHAFT LGTH` (hovered) has a ⌄; `ENG CONFIGURATION`, `CASH`,
`TRADE`, `WARRANTY` and `SOURCE` beside it have nothing at all.

The header's own tooltip says *"The ⌄ menu sorts, narrows and removes"* — a
tooltip pointing at a mark that is not drawn. Clicking the header itself renames
the column, so the visible affordance and the useful one are different targets
in the same 183px box.

**What is behind it is good**, once found: `Sort first to last · Sort last to
first · Show only some… · Remove column`, in plain words. Sorting works, marks
the sorted column with a ▲ and a tint (`sheet-10-sorted.png`), renumbers the
gutter, and re-sorts the group headings with it. Clicking the active sort item
again clears it and the file's own order comes back — **but nothing says so**:
all four menu items report `aria-pressed: null`, so neither a sighted user nor a
screen reader can tell from the menu which sort is on, and there is no
"Don't sort" item. Narrowing is excellent and needs no defence — see below.

---

## S-8 · Adding a column shows you 1.3 of the 8 kinds a column can be.

**What I did.** Pressed the `+` at the end of the header row (`title="Add a column"`).

**What happened.** A clean popover — NAME, a type list, GOES IN (the section
chips), CANCEL / ADD COLUMN. But the type list `.tb-kinds` measures
**`scrollHeight` 399px inside `clientHeight` 62px**, holding 8 options at 48px
each. It shows **Text, and 14px of Number** — 15.5% of the list — inside a 272 ×
380px popover with 200px of unused height below it.

So the person who wants a Date, a Choice, a Link, a Calculated column or a
Pictures column is not told those exist. This is the one surface where the app
teaches "what is a column allowed to hold", and it is showing one line of it.
`sheet-16-add-column.png`, `sheet-17-type-list.png`.

---

## S-9 · Expanding one table hides three others, and you cannot tell it happened.

**What I did.** EXPAND on Highfield Inflatables, then FIT.

**What happened.** The card goes from 145 × 89 to 269 × 192 drawing units and
nothing else moves. Measured overlap at FIT zoom:

| covered table | how much of it is under the expanded card |
|---|---|
| REDCO / Tinka Trailers | **77.5%** |
| Formosa | **70.3%** |
| NSM Custom Trailers | **54.5%** |

Three of your 21 tables are gone from the drawing and nothing says so.
`sheet-20-fit-with-expanded.png` — the big pale slab is Highfield; the sliver
poking out at its right edge is all that is left of Formosa.

**Also, EXPAND survives a page reload** while the open stage and the selection do
not. So a person who expanded a table, closed the laptop and came back finds
their sheet with a hole in it and no memory of making one.

---

## S-10 · The same table reports two different column counts, 40 pixels apart in the journey.

**What I did.** Read the read-out on the expanded Highfield card, then pressed
FOCUS and read the read-out on the full-window sheet. Same table, same second.

| | ROWS | COLUMNS | SECTIONS strip |
|---|---|---|---|
| expanded card on the blueprint | 40 | **30** | IDENTITY **11** |
| FOCUS lens | 40 | **32** | IDENTITY **13** |
| the store | 40 | 31 fields (+ UID) | — |

The cause is defensible — `Series` and `Model` are consumed as the two grouping
levels on the blueprint and drawn as ordinary columns in FOCUS — but nothing on
either screen says that, and a person auditing their own price file against a
spreadsheet now has two numbers and no tiebreaker.
`sheet-04-highfield-expand.png` vs `sheet-14-focus.png`.

---

## S-11 · Removing a column from the sheet still carries the weaker of the two warnings — measured on the exact column F26 used as its own worked example.

This confirms **IA-4** is still open and adds the specific case.

**What I did.** Column menu → **Remove column** on `Max Load kg`, and cancelled.

**What happened.** The whole warning:

```
MAX LOAD KG · NUMBER
REMOVE “MAX LOAD KG”?
Every value in this column leaves with it. There is no undo.
KEEP IT    REMOVE
```

F26 records what the *column setup's* sheet says about deleting this same
column: *"Trailer fitment — Highfield breaks: Match "NSM Custom Trailers": reads
a field that is no longer on "Highfield Inflatables". Output "Trailers that carry
it": a column reads a field that no longer exists."* None of that appears here.
The `entityDependents` / double-validate machinery F26 built exists and is
correct; the sheet's column menu does not call it. `sheet-09-remove-maxload.png`.

---

## S-12 · You cannot delete a row from a table on the blueprint at all.

**What I did.** Added a row inside the PA420 group (which worked well — see
below), then tried to remove it from the card: right-clicked the row, right-
clicked the row-number gutter, hovered every part of the row looking for a
control, and read every `title` inside the card.

**What happened.** Right-click produces **no menu at all** (not a browser menu,
not an app menu — nothing). There is no row control on the card, and no `title`
anywhere inside it mentions a row deletion.

The control exists, in `TableToolbar` — *"Select whole rows from the number
gutter to delete them"* — and `TableToolbar` is only mounted by the full-window
sheet. The card on the blueprint deliberately brings only `WholeTableControls`
and `BandStrip` (`EntityTableNode.tsx:42–46`). So the route is: **FOCUS → click
the gutter number → DELETE 1 ROW → confirm** — four steps, and step one is a
button whose label ("FOCUS") does not suggest it.

Once there it is good: the button is disabled with an explanatory tooltip until
whole rows are selected, the confirmation says *"This entry leaves the table for
good. There is no undo."*, and it toasts `1 ROW STRUCK`. The gap is only that
the blueprint — where the person is — offers no way in and no sign that one
exists.

---

# WHAT WORKS, and should not be broken while fixing the above

* **Clicking a table walks the camera in.** Plate → zoom 1, framed, selected,
  ~1.2s. It is the best gesture on the sheet and it makes finding a table via
  the panel genuinely quick.
* **Narrowing is exemplary.** `Show only some… → CONTAINS → APPLY` puts a
  **NARROWED** chip beside the table name, `SHOWING 22 / 40` with a **CLEAR**
  next to it in the toolbar, `22 OF 40 SHOWING` in the footer, and renames the
  menu item to *"Change what shows…"*. Four independent statements of the same
  truth, none of them wrong. `sheet-12-narrowed.png`.
* **Add a row inside a group does exactly what it says.** `+ VARIANT` under
  PA420, tooltip *"this group's values are filled in for you"* — the new row came
  back with `Series: Patrol, Model: PA420` already set and the editor open on the
  first empty cell.
* **The FOCUS lens is the best table screen in the app**: full width, a search
  box, the sections strip, and *"The sheet stays on the blueprint behind this —
  close to return to it."* `sheet-14-focus.png`.
* **COLLAPSE ALL** folds 30 columns into 7 named, legible band chips — the thing
  FIT COLUMNS is trying and failing to be.
* **Column-section banding is legible** at zoom 1 and in FOCUS: the band name
  spans its columns above the header row with a rule under it, and F16's chips
  are no longer cut.
* **Keyboard cell navigation** — see S-6 for the detail; everything but F2 is
  there and correct.
* **EXPAND / COLLAPSE is one click each way** and the card stays on the sheet, as
  designed.

---

# THE ANSWERS TO THE JOURNEY'S QUESTIONS, plainly

* **Does navigation feel instant?** At plate zoom, yes (p50 16.7). At any zoom
  where you can read a table, no — 12–24 fps, p50 68–87ms. **S-1.**
* **At what zoom do tables become plates, is it confusing?** Plate at ≤0.60,
  grid at ≥0.66, with a dead band between; one clean step in practice. Not
  confusing. But the plate is illegible at the FIT zoom the app puts you at.
  **S-3.**
* **Find one table among 21 without the panel / with it.** With the panel: one
  click, camera walks in, seconds. Without: you are reading 8px names and
  panning at 13fps. **S-3, S-1.**
* **Can you READ Highfield (40 × 31)?** On the card at zoom 1 you are looking at
  **509 × 245 px of a 4,248 × 2,194 px table — 1.34% of it**. EXPAND takes that
  to about 940 × 590 (12%). FOCUS is the only place it is genuinely readable, and
  even there 8 of 32 columns are on screen at once. FIT COLUMNS, the control that
  promises to solve this, makes it worse. **S-4.**
* **Edit a cell — does it save, how do you know, can you undo?** It saves and
  persists. You know because the text changed; nothing else says so. You cannot
  undo it, at all. **S-6.**
* **Sort, narrow, column menu — discoverable?** The menu is `opacity: 0`. What
  is inside it is good. **S-7.**
* **Add a row in a group / add a column.** Row: excellent. Column: the form is
  good, the type list shows one option of eight. **S-8.**
* **Expand to see everything — how many clicks, can you get back?** EXPAND is 1
  click, COLLAPSE is 1 click back. You still cannot see everything, and you have
  covered three other tables. **S-9.**
* **The destructive paths.** Column: gated, but the warning is thinner than the
  same act elsewhere and the destructive button holds the focus (**S-5, S-11**).
  Row: gated well, but unreachable from the blueprint (**S-12**). Table: gated
  well *by the button*, and by a bare OS dialog *by the keyboard* (**S-2**).
  Cell: not gated at all, and irreversible (**S-6**).

---

# NOT TESTED / NOT VERIFIED

* Anything with a **drag**: dragging a column's grip to resize, dragging a card
  to move it, dragging a table type from the left panel onto the paper. Same
  limit O7 records for the rules builder.
* **1920×1080.** Everything above is 1280×800 only.
* Whether S-1 reproduces outside Playwright-driven Chromium, and on a real
  trackpad.
* The `+ ROW` (append) button in FOCUS, multi-row selection and multi-row delete
  — only the single-row path was walked.
* Renaming a column **from the sheet header** — IA-3 already covers it and it is
  the one act I was not willing to run against real seeded formulas.
* Copy / paste between cells (`Ctrl+C` / `Ctrl+V`) — not exercised.
* The column-setup door and the view page: Journey Three's ground.
