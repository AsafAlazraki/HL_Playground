# HELMLOGIC DYNAMIC CONFIG — THE UX AUDIT

Nine passes, one browser, one week's build. Every claim below is carried by a
screenshot, a `file:line`, or a number somebody measured on the running app.
Where a pass could not verify something, it is in §7 and nowhere else.

The nine source reports, all in `docs/audit/`:

| lens | file | what it drove |
|---|---|---|
| the words | `language.md` | every label, empty state, refusal, tooltip, placeholder |
| the visual system | `design-system.md` | 17 CSS files, 16,062 lines, against `ART_DIRECTION.md` |
| information architecture | `information-architecture.md` | concepts, doors, depth, mode collisions |
| journey 1 · first run | `first-run.md` | two clean profiles, onboarding → find a boat |
| journey 2 · sheet & tables | `sheet-and-tables.md` | the blueprint, the grid, the destructive paths |
| journey 3 · view & rules | `view-and-rules.md` | view page, business rules, the flow builder |
| journey 4 · quoting | `quote.md` | cold profile → a document in the customer's hand |
| journey 5 · access & size | `access-and-responsive.md` | keyboard, contrast, 1024/1280/1440/1920 |
| the completeness critic | `critic.md` | second tabs, backups, recovery, paste, hostile states |

No file under `src/` was edited by any pass. State the audits left behind is
listed at the end of §7.

---

## 1 · THE VERDICT

**No, this is not yet an app a sales manager can use on their own — but it is a
long way from "unusable", and the reasons it stops them are few, specific and
mostly cheap.** The first ninety seconds are genuinely good: onboarding is three
screens with one question each, Enter works, the greyed industries explain
themselves before you click, and the empty sheet ranks its two paths so plainly
that the first-run pass knew what to do in under five seconds (`first-run.md`,
`first-run-03-after-marine.png`). Then it stops dead: at 1280×800 the two doors
that lead to four of the five finished features are below the fold for **21 of
21 tables** and nothing scrolls them into view (`information-architecture.md`
IA-1), there is no way to search the sheet for a product you can name
(`first-run.md` F-1), and the moment you zoom close enough to read a price the
canvas drops to **12–24 fps** (`sheet-and-tables.md` S-1). Underneath that the
safety story the app tells is not true: there is no undo of any kind, two
browser tabs of it silently erase each other's work (`critic.md` C1), and the
file the export card calls **"Everything"** carries neither your business rules
nor your quotes and loses every table's kind, bands and grouping on the way back
in (`critic.md` C2, C7). Fix the first six items in §2 and this becomes a
product a stranger can drive; leave them and every good thing underneath — and
there is a lot of it — stays undiscovered.

---

## 2 · THE TEN THINGS THAT MOST STOP A PERSON

Ranked by how early they bite, severity breaking ties.

---

### 1 · Selecting a table looks like nothing happened. Both of its doors are below the fold, on every table, at 1280×800.

**What happens.** You click a boat table — in the panel or on the sheet, both
were tested. The camera walks in on the canvas and **the panel does not visibly
change at all**. The two doors that were revealed — *What goes with each one?*
and *What is each column allowed to hold?* — are drawn below the bottom edge of
the window and nothing scrolls them into view.

**Who it stops.** Everyone, in the second minute. The view page, the column
setup, the quote and the whole fitment story are reached through this and
nothing else.

**Evidence.** `information-architecture.md` IA-1, measured twice from two
gestures with the panel at rest (`scrollTop === 0`):

| gesture | selected row top | door 1 | door 2 |
|---|---|---|---|
| click FORMOSA (first row) in the panel | 704 | 741–770 ✓ | **778–823 cut** |
| click the Highfield card **on the sheet** | 774 | **812–841** | **849–894** |

Viewport height is 800. A row is 35px and the door pair is 82px, so a row must
sit at y ≤ 683 for both doors to land on screen; the list starts at **y = 704**.
`anyFullyVisible: 0 — of 21`. Independently re-measured the same day at 802 /
839 by `view-and-rules.md` finding 1 and at 754 / 791 by `first-run.md` F-9.
Screenshots `information-architecture-2-first-table-doors.png`,
`information-architecture-3-sheet-click-doors-offscreen.png`,
`view-and-rules-02-doors-offscreen.png`. Fully visible at 1920×1080 — this is
exact to the laptop size the acceptance log mandates. This is O11, now total.

**The cause, measured** (`information-architecture.md` IA-2): of the panel's
744px, the table-type rail takes **371px**, the three panel doors 193px and the
`TABLES · 21` count 47px, before the first table row.

**The fix.** One line: `scrollIntoView({ block: 'nearest' })` on the revealed
door pair in `src/app/LeftPanel.tsx` — **minutes**. Then fold the 371px type
rail behind CREATE TABLE so the list starts near the top — **hours**, and it
removes the problem rather than papering it.

---

### 2 · You cannot ask the app for a boat by name.

**What happens.** With 21 tables and 651 rows loaded, there is no search field
on the sheet at all: `document.querySelectorAll('input,textarea')` on the loaded
project returns `[]`, and Ctrl+K opens nothing. Finding the Highfield Sport 560
took **6 clicks, one dead end and a 1,203px scroll**, and only worked because
the tester already knew Sport 560 is a Highfield.

**Who it stops.** Anyone who arrives with a customer's question rather than a
map of the data model. The one thing the app most assumes — that you know which
of the 21 tables a product lives in — is the one thing it never teaches
(`information-architecture.md`, concept #6).

**Evidence.** `first-run.md` F-1 (the measurement above);
`information-architecture.md` IA-10, which enumerates the three search boxes
that do exist and shows all three are scoped: `ViewStage.tsx:190` "Find one"
(rows of one table), `TableToolbar.tsx:95` "Search rows…" (**inside FOCUS
only**), `FilterMenu.tsx:184` (one column). **Correction on the record:**
`critic.md` withdraws F-1's "no search anywhere" — every view page has a *Find
one* box (`criticB-03`, `criticB-04`). The true statement is: per-view row
search behind a door, nothing on the sheet, nothing global.

**The fix.** One field in the masthead matching row labels (`displayFieldId`
already exists per table) across every table, results grouped by table, click to
walk the camera in — **a day**. Interim, at a fraction of the cost: put the
FOCUS lens's existing search box on the card itself.

---

### 3 · Another dealer's price file lands under your business name and nothing says it is an example.

**What happens.** You press *Load a worked example*. 21 tables and 651 rows of
Northside Marine's real catalogue arrive, the masthead still reads **BAYSIDE
BOATS · MARINE**, and the words example/demo/sample never appear again:
`/example|demo|sample/i.test(document.body.innerText)` → **false** on the loaded
project. The only way back out is **CLEAR SHEET**, measured at **88.3 × 21.0 px,
font-size 9px**, in the footer of a flyout behind a masthead door labelled
**`I/O`**.

**Who it stops.** Everyone who takes the app's own recommended first action —
and it is worse for the person who then starts typing their own products into
somebody else's tables.

**Evidence.** `first-run.md` F-2, `first-run-04-loaded.png`,
`first-run-20-io.png`. **Correction on the record:** `critic.md` shows the empty
sheet *does* say it plainly before you click — EXAMPLE DATA / "REAL DATA
EXTRACTED FROM NORTHSIDE MARINE'S MASTER PRICE FILE" (`criticB-26`). It is said
once, clearly, and then never again once the data is in. That is the defect, and
it is a smaller one than "nowhere".

**The fix.** A masthead chip — `EXAMPLE DATA · NORTHSIDE MARINE` with *Remove
it* — that persists while the seed is loaded. **Hours.** Rename `I/O` while you
are there (§4 and `language.md` L2).

---

### 4 · The screen the app opens on is below its own legibility floor.

**What happens.** At the framing the app itself chooses when the data lands
(scale 0.2786, and 0.33 in the other pass's window), the plates read like this:

| plate part | authored | on screen |
|---|---|---|
| table name (`.tb-lod-name`, Instrument Serif) | 30px | **8.36px** (9.89px at 0.33) |
| row/column figures | 22px | **6.13px** |
| band chips, the words "rows"/"columns" | 11px | **3.06px** (3.63px at 0.33) |

`src/features/table/tableLod.ts:18` writes the standard the plate exists to
defend: *"Below 8.4px neither Archivo nor IBM Plex Mono resolves."* The name
lands under it by a hair; the band strip lands at **43% of it**.
`ART_DIRECTION.md` says Instrument Serif is "never below 22px" — every one of
the 12 display sites in the CSS obeys that; the canvas transform breaks it and
nothing in the system knows the transform exists.

**Who it stops.** Everyone, on the arrival screen and again every time they
press FIT. The plate design itself is good — at zoom 0.578 it is excellent
(`sheet-18-lod-plate.png`).

**Evidence.** `first-run.md` F-3, `sheet-and-tables.md` S-3, `design-system.md`
D1; `first-run-04-loaded.png`, `sheet-01-land.png`.

**The fix.** A second LOD tier below ~0.45 that drops to name + kind mark only,
so what survives is above the 8.4px floor — **hours to a day**, and it needs a
decision about what a plate is allowed to say when 21 of them are on screen.

---

### 5 · The sheet runs at 12–24 fps at every zoom where a table can be read.

**What happens.** Same harness, same session, minutes apart:

| zoom | what is drawn | p50 | p90 | max | frames > 33ms |
|---|---|---|---|---|---|
| 0.279 (the FIT zoom) | 21 plates | **16.7** | 16.8 | 43.5 | **1 of 57** |
| 0.693 (first zoom that draws a grid) | grids, ×4 passes | **68.8–82.0** | up to 119.9 | **170.6** | **41–42 of 42, every pass** |
| 1.00 (where clicking a table lands you) | grids | 41.2–87.2 | up to 111.7 | 135.6 | **57 of 57** |

With four grid cards in the window, `.react-flow__viewport *` measures **5,736
elements**. Move the camera so no card is in the window and the same harness
returns to p50 16.7 with zero frames over budget — the canvas is not the
problem, the mounted grids are. F2's closing number ("p90 16.8, zero frames over
33ms") is true only while everything on screen is a plate.

**Who it stops.** Everyone, in the second minute, on the surface the persona
spends most of their time on. A plate is not a price file.

**Evidence.** `sheet-and-tables.md` S-1, `sheet-03-highfield-zoom1.png`. Related
and separately measured: with a stage open, **two React Flow instances are
mounted at once** — 24 nodes, two live viewport transforms
(`design-system.md`, observations).

**The fix.** Needs a decision, then about **a day**: draw a real grid only for
the selected/expanded card and keep the rest as plates at every zoom, or window
rows as well as columns. Do not reach for it before deciding what "readable"
means at zoom 1 — see change 3 in §4.

---

### 6 · Reading or changing a price takes the product's name off the screen.

**What happens.** The most common job in the product. On the expanded Highfield
card the body scroller measures **clientWidth 953px against scrollWidth
4,248px** — a horizontal range of 3,295px, of which nothing is frozen but the
row ordinal. At the price band, rows 04–09 of MODEL SP560 — 15 variants that
differ only by hull material and colourway — read as six identical rows of
`48350 / 45932 / 32166` with nothing to tell them apart. Money prints raw:
`29251.4286`, `9097.1429`.

**Who it stops.** Everyone doing the thing a price file exists for, in minute 2.
The app already knows which column names a row (the column setup calls it
*"which column names a row"*; the view rail uses it for `rowLabel`).

**Evidence.** `first-run.md` F-5 (`first-run-12-hscroll-max-uid-frozen.png`),
`information-architecture.md` IA-7 (`information-architecture-13-price-band.png`,
grid `scrollWidth 4432` in `clientWidth 509` — 11.5% visible).

**The fix.** Pin the display column (and only it) to the left of every grid, in
the card, in FOCUS and in the design stage — **hours to a day**. Format money in
the number formatter while you are in there — **hours**.

---

### 7 · The everyday acts cannot be undone, and the fastest gestures carry the weakest warnings.

**What happens**, four measured facts on one surface:

- **A cell edit commits silently and permanently.** No toast, no mark; Ctrl+Z
  and Cmd+Z do nothing; the store has no `undo`/`redo`/`history` key; no control
  anywhere in the app contains the word "undo" except prose saying there is
  none. The edit survived a reload.
- **Delete on a cell clears a price instantly** — no confirm, no toast, no way
  back — while deleting a *row* is gated **and** announces `1 ROW STRUCK`.
- **One keystroke offers to delete a whole table.** Select a card (or a plate)
  and press Backspace or Delete: a bare `window.confirm` —
  *Delete the table "Highfield Inflatables" and its 40 rows?* — captured
  verbatim three times with `confirm` stubbed to return false
  (`src/features/whiteboard/Whiteboard.tsx:463–476`). It names none of what
  F27's guarded path names — not the 2 link columns, not the 2 rules that stop
  existing — and Chrome focuses OK by default.
- **Every destructive confirm inside a table focuses the destructive button.**
  `activeElement = "REMOVE" | btn btn-danger tb-confirm-go` at 80/580/1000ms on
  three separate sheets; `src/features/table/ColumnMenu.tsx:114-115` has
  `autoFocus` on the danger button. F24's fix lives in a different component
  (`designer/ConfirmSheet.tsx:79` focuses cancel, correctly).

**Who it stops.** Everyone, at the first typo — and it is the reason nobody will
explore. Undo is what makes an app safe to press.

**Evidence.** `sheet-and-tables.md` S-6, S-2, S-5, S-11
(`sheet-09-remove-maxload.png`); `information-architecture.md` IA-4;
`critic.md`'s recovery table.

**The fix.** Needs a decision, then **days**: a command log in the store with
Ctrl+Z and an UNDO affordance on the toast that already exists. Immediately and
cheaply: move `autoFocus` to the cancel button (**minutes**), route the
Backspace path through the same `ConfirmSheet` and `entityDependents` the button
path already uses (**hours**), and give the sheet's Remove-column the impact
sheet the column setup already builds (**hours**).

---

### 8 · The day after, an existing quote says the boat has nothing that goes with it.

**What happens.** Fresh profile → load the example → view page → *Quote this
one* → **reload** → open the quote → ADD FROM YAMAHA OUTBOARDS:

> **Nothing from Yamaha Outboards goes with this one yet. Set that up on the
> page that says what goes with each one.**

Forty pixels above it, the same screen says *"4 Yamaha Outboards were picked for
this one"*. The instruction cannot be followed because it has already been done.
The quote can still be printed, re-priced and re-issued; nothing can be added to
it except a free-typed `Add a line` with a hand-typed price — exactly the class
of thing the data model exists to abolish.

**Who it stops.** Every user, on their second session, on the app's
highest-value output. Reproduced deterministically from a wiped profile.

**Evidence.** `quote.md` Q1, `quote-25-day2-picker-dead.png`,
`quote-24-picker-contradiction.png`; measured `quote.viewId "NkgPtO1vdj"` against
`store.views ["QaUXlc0w_X"]` in one session. **Cause, corrected by `critic.md`:**
view pages *do* persist (`src/app/viewPersistence.ts` — a removed block stayed
removed across a reload, `criticB-08`/`criticB-09`); the mirror mints a **new
id** at `viewPersistence.ts:70`, so a view's id changes exactly once, at the
first reload after it was created, orphaning any quote frozen before it.
`freeze.ts:465-469` then bails to `[]` and `QuoteEditor.tsx:448-452` renders that
as "nothing goes with this one".

**The fix.** One line at the seam — have the mirror keep the registry's id (or
write the store's id back into the registry on rehydrate) — **hours**, plus a
migration for quotes already holding a dead id. Separately, `candidatesFor`
returning `[]` should not be renderable as "this boat has no relations"; it
cannot currently tell that from "I cannot find the page".

---

### 9 · Two tabs of the app silently erase each other's work.

**What happens**, in one browser, both tabs on `localhost:5090`:

| step | tab | action | result |
|---|---|---|---|
| 1 | B | create a table | tab B: TABLES 23 |
| 2 | A | (open from before, showing 22, knows nothing) | — |
| 3 | A | create a table "TAB A TEST" | tab A: TABLES 23 |
| 4 | — | read IndexedDB directly | **23 entities, and the only `TAB *` table is `TAB A TEST`** |
| 5 | B | untouched window still lists its table | a table that no longer exists |
| 6 | B | reload | **tab B's work is gone.** No message, no conflict, nothing |

`src/db/repository.ts:48-70` — `saveAll` **clears every table** and rewrites the
whole snapshot from that tab's memory; `src/store/useProjectStore.ts:183-189`
schedules it 400ms after every mutation. `grep` for `BroadcastChannel`,
`addEventListener('storage'`, `visibilitychange` across `src/`: **zero hits**.

**Who it stops.** Anyone who opens a second tab to compare two tables — the most
ordinary thing a person does with a browser — and it is total, silent data loss
in an app with no undo.

**Evidence.** `critic.md` C1, `criticB-15-tabB-ghost.png`.

**The fix.** A `BroadcastChannel` heartbeat: the second tab opens read-only with
a plain sentence, or the losing tab is told to reload before it writes — **a
day**. A one-hour stopgap is a write-time revision check that refuses to
overwrite a snapshot newer than the one this tab loaded.

---

### 10 · The recovery path is the least-tested thing in the product, and all three parts of it are broken.

Three separate defects that only matter together, which is why nobody found them
until somebody went looking (`critic.md` C2, C3, C7):

- **The export called "Everything" is not.** The file has exactly eight keys
  (`kind, version, exportedAt, project, entities, groups, rows, rules`, 801 KB).
  At the moment of the export the project also had **3 business rules** and
  **1 quote**; neither is in the file. View pages are not either. The card says
  *Everything — Tables and rows*; "Tables and rows" is honest, "Everything" is
  the word set in 16px.
- **The backup does not round-trip.** Exported through the real UI and imported
  the same file: every imported table came back with `kind`, `role`, `hierarchy`
  and `sections` **undefined**, every field with no `sectionId` — and the file
  carries all of them. `src/features/io/envelope.ts:578-593` simply never copies
  them; the field builder at `:563-576` never copies `sectionId`. On screen: all
  23 imported tables, **including the four relationship tables**, filed under
  `CUSTOM TABLE`, with no grouping drawers and no bands
  (`criticB-21-imported-tables-all-custom.png`). The header of the file that
  breaks it reads *"NOTHING VALID IS LOST"* (`envelope.ts:18-24`).
- **The primary button on the restore screen doubles the project.** The preview
  offers DISCARD · REPLACE (ghost) · **ADD TO SHEET** (filled, primary). One
  click, no dialog: tables 22 → **45**, rows 651 → **1302**, rules 2 → 4, 22
  duplicate names — and because merge offsets copies by only +80/+80 they land
  behind their originals, so the sheet looks unchanged
  (`criticB-19`, `criticB-20`).

**Who it stops.** The person whose day has already gone wrong. Four confirm
sheets in this app say *"This app has no undo. It can only come back from a file
you exported earlier."* That sentence is a promise the file cannot keep.

**The fix.** Copy the six missing keys in `envelope.ts` and add a round-trip
test — **an hour, plus the test**. Put `constraints`, `quotes` and `views` in
`ProjectExport` — **hours**, and it needs a version bump decision. Put a
confirm sheet on ADD TO SHEET stating what will be added and that names will
collide — **hours**.

---

### Just below the ten — serious, evidenced, and cheaper than most of the above

| # | finding | evidence | rough fix |
|---|---|---|---|
| 11 | **The third lie.** A brand-new business with two hand-made tables and zero rules is told *"FROM YOUR PRICE FILE — 6 rules your workbook already states — Read out of Boat Module (5).xlsx … 2 of 6 are being checked"*, with 13 mentions of another company's file on one page. `WorkbookRuleList.tsx:78-84` renders unconditionally; `running` counts a static seed property | `critic.md` C4, `criticB-35` | gate on real import provenance — hours |
| 12 | **CLEAR SHEET does not clear the business rules.** Rule → clear (both confirms) → re-onboard the same name → `1 RULE`, switched **ON**, reading *"When a column that is gone is PVC, a column that is gone must be AUD"* — and no delete control exists anywhere. `src/features/constraints/index.ts:63-66` asked for `clearConstraints()` on reset; it has no callers | `critic.md` C5, `criticB-36` | one call site — minutes |
| 13 | **Quotes live outside the project and outlive it.** On the user's machine now: `rootTableId y54HBdfjKe` is not among the 22 entities, yet the panel says "1 MADE SO FAR" and it opens as a complete $52,053 quotation marked GIVEN TO THE CUSTOMER. `quotes.ts:40` is one global array, not keyed by project | `critic.md` C6, `criticB-10/11` | key the store by project — hours |
| 14 | **Picking one row on a view page hijacks the panel and creates a table.** One click on an accessory moved the selection onto a brand-new join table, made both doors vanish, and took TABLES 21→22. Removing the block afterwards leaves the join table orphaned | `view-and-rules.md` #2, `view-and-rules-13-selection-hijacked.png` | do not move selection; hours |
| 15 | **A business rule is one click away and can never be deleted.** The pane opens with the draft already complete and ADD RULE already enabled (*"NOTHING ELSE TO FILL IN"*); `constraintDefs.ts:232` — "no per-rule delete by design" | `view-and-rules.md` #7 | do not pre-fill a committable sentence; hours |
| 16 | **"106 rows break this" is not a link**, and the one cross-door hand-off (`⧉ CHECKED IN WORK OUT WHAT FITS WHAT`) wears a link glyph and is a `<p>` | `view-and-rules.md` #8, #9 | make both real buttons; hours |
| 17 | **At 1280 the flow drawing is unreadable and clipped before you touch it** — canvas 524px, opening scale 0.68, plate type 5.4–7.1px, Output plate 123 of 190px off-canvas; a **two-plate** rule does not fit. Fine at 1920 | `view-and-rules.md` #3, `view-and-rules-31-flow-clipped.png` | give the canvas the stage; hours |
| 18 | **The guided path in "What fits what" produces a useless answer** — *USE THE OBVIOUS TWO* picks the first column of each table, which on this data is `Series` on both sides: 193 rows naming neither the boat nor the motor | `view-and-rules.md` #4, `-39-newrule-run.png` | prefer the display column; hours |
| 19 | **The only control that changes an issued quote is invisible** — MAKE A NEW VERSION renders `rgb(18,40,63)` on `rgb(18,50,82)` = **1.14:1**, enabled, and works perfectly when pressed | `quote.md` Q3, `quote-17-invisible-new-version.png` | one class; minutes |
| 20 | **The "Boats" preset is Highfield's schema.** A self-made *Quintrex* table is born with **31 columns** including `AUS Sailing`, `HO - MU %`, `BMT - MU %`, `Tube Dia. cm`, `Material: PVC/HYP` — and the structure preview teaches with HIGHFIELD SP520/SP600 and Yamaha F70LB | `first-run.md` F-6 (`src/types/model.ts:293–332`), `critic.md` (reproduced clean), `language.md` L25 | neutral presets; a day |
| 21 | **Renaming a column on the sheet still breaks every formula that names it.** `renameFieldRefs` has one production call site (`FieldRow.tsx:143`); the sheet's one-click header rename goes `Grid.tsx:980` → `useColumnCommands.ts:184` → `updateField(…, {name})` with no rewrite, while `lib/formula/index.ts:117` resolves by lower-cased name. F25 fixed one of the two rename surfaces | `information-architecture.md` IA-3 (code-verified, latent in this seed) | route both through one command; hours |
| 22 | **FIT COLUMNS makes the table unreadable** — 30 columns into 1,016px = 28px each with a **3px** value box; every header cut to one letter | `sheet-and-tables.md` S-4, `sheet-05-fit-columns.png` | rename or remove; minutes |
| 23 | **Add-column shows 1.3 of 8 column kinds** — `.tb-kinds` `scrollHeight 399` inside `clientHeight 62`, in a popover with 200px of unused height | `sheet-and-tables.md` S-8 | CSS; minutes |
| 24 | **"COLLAPSE ALL" collapses columns, not rows** — `COLUMNS 30` → `COLUMNS 1 / 30`, leaving 40 rows of nothing but system UIDs | `first-run.md` F-4, `first-run-07` vs `-08` | rename; minutes |
| 25 | **Paste from Excel is advertised where it cannot work.** The empty-table card says *"or paste a block straight from Excel"* and mounts no grid (0 rows added). After Escape it works well and reports honestly, but it is positional with no header row — a pasted header line became a boat named "Variant" — and Series/Model, the two columns the preset groups by, are not grid columns at all | `critic.md` C8, `criticB-30`, `criticB-31` | header-row mapping; a day |
| 26 | **The quantity box on a quote line is painted over by its own amount** — input x910–956, amount x928–974, 19px of 46 clickable; and an A4 print of a three-line quote is **2 pages** (`/Count 2`) because `.qt-root` keeps `position:relative` in print | `quote.md` Q4, Q6, `quote-08-qty-overlap.png`, `quote-18-print-a4.pdf` | both CSS; hours |
| 27 | **A table can have zero columns and the sheet says it has one.** Plate vs store across 23 tables: 16 agree, 6 are +1, 1 is −1. Duplicate table names are accepted silently | `critic.md` C9, C10 | hours |

---

## 3 · WHAT IS ALREADY GOOD

Named so the fixes above do not break it. All of this was tested, not admired.

**The first ninety seconds.** Three onboarding screens, one question each, Enter
works on the first, and the industry step explains why three cards are dead
before you click one (measured 4.76:1 at 14px). The empty sheet ranks two paths
and both are one click. (`first-run.md`)

**The quote document, and the freeze behind it.** Every stored line carries
`unitPrice`, `priceFieldId`, `priceColumnName`, **every** price level with its
value, `sourceNote` (`"Boat Module!R829"`), the join's `pairFacts` and the image
— copied by value, and it all survives a reload perfectly. Every total checked
by hand in five states was right. The per-line price panel — *"read from Cash ·
Boat Module!R829"* then three named levels then *"leave blank to use the price
file"* — explains a number better than anything else in the app. It is a
document you would hand to a customer. (`quote.md` §What is right)

**Narrowing a table.** A NARROWED chip beside the name, `SHOWING 22 / 40` with a
CLEAR beside it, `22 OF 40 SHOWING` in the footer, and the menu item renames
itself to *"Change what shows…"*. Four independent statements of one truth, none
of them wrong. (`sheet-and-tables.md`)

**Add a row inside a group.** `+ VARIANT` under PA420 returns a row with Series
and Model already set and the editor open on the first empty cell — exactly what
the tooltip promised.

**Click a table, the camera walks in.** Plate → zoom 1, framed and selected in
about 1.2s. The best gesture on the sheet.

**The view page in read mode, and the add-a-table flow.** *"Show every Parts &
Accessory. Nothing on Highfield Inflatables lines up with anything on Parts &
Accessories, so nothing is narrowed."* with three honest exits, and a fallback
rule builder that is three dropdowns over a live English sentence. Remove and
restore is right (`1 PICKED · 1 REMOVED` → PUT IT BACK). Nothing in the app
reads better. (`view-and-rules.md`)

**The workbook-rules section's honesty** — *"2 of 6 are being checked. The rest
are listed so you know what is not being checked, which is the part you would
otherwise have to guess."*, each unchecked one with a reason a non-technical
person can act on. The framing is the best writing in the product; only its
unconditional rendering is wrong (item 11 above).

**The paste engine's type safety.** `Alloy` into a select whose options exclude
it, a URL into an image column and `call for price` into a number column were
all refused; `2.4` landed as a number; the toast is exact — *"5 cells pasted · 2
skipped — see marks · 1 pictures"*. Any earlier suspicion of silent loss is
withdrawn. (`critic.md` C8c)

**The stage machine.** One nullable `stage` in `Shell.tsx`, subject-checked, so
two stages cannot draw at once and a deleted table closes its own page in the
same frame. The IA pass found **no stuck state and no state you cannot get back
from**. Every stage carries *Back to the sheet*, top-left, always.

**Colour discipline.** Raw hex outside `tokens.css`: **4 occurrences, 2 distinct
values in 16,062 lines**; raw `rgba` outside tokens: **3**. On one live screen,
407 of 415 text elements used the three ink tiers. `prefers-reduced-motion` is
genuinely handled app-wide with no ungated `motion` consumer. (`design-system.md`)

**Accessibility things already done right** (all measured): zero unnamed
interactive elements on any of eight surfaces; zero horizontal overflow and zero
clip-without-ellipsis across 16 measurements at four widths; `ConfirmSheet` is a
correct trapped modal that focuses cancel; the I/O panel returns focus to its
trigger; the rule results are a real `<table>` with 8 `<th scope=col>` and a
polite live region; the focus ring, where drawn, is 6.67:1.

**Console.** Two errors on a clean land, both the documented cross-origin image
probe. Zero JavaScript errors were produced by any journey in any pass —
onboarding, wizard, column setup, view page, SET UP, quoting, issuing, printing,
two rule RUNs, import, export, clear sheet. (Note the count is a running total,
not a ceiling: browsing the sheet took it to 23 as image cells scrolled in.)

**The confirm sheets themselves** — small, anchored to the thing they are about,
and each admits *"There is no undo."* The two-click view-block removal arms,
explains and offers *Take it off* / *Keep it*.

---

## 4 · THE FIVE CHANGES THAT WOULD MAKE IT MEASURABLY EASIER

Design moves, not defect fixes. Ranked by ease gained per hour spent.

### 1 · Make selecting a table answer the question "and now what?"

**Problem it solves.** Item 1 and item 2 of §2 together, plus outcomes 2, 3 and 5
of the depth table (`information-architecture.md`): quoting a customer is 4
clicks and **2 invisible scrolls**; it becomes 3 clicks and none.

**What it looks like.** The type rail folds behind CREATE TABLE, so `TABLES · 21`
sits near the top of the panel. Selecting a table scrolls its doors into view and
draws a caret on the row so the row itself looks like a door. A **third** door
joins the two: *Open the rows* — because the panel is the app's only navigation
and today it cannot get you to a price at all.

**Cost.** Hours for the fold and the scroll; half a day for the third door if it
reuses the FOCUS lens.

**Risk.** The type rail is how you make your second table; folding it hides the
drag affordance (which the empty sheet already teaches better — `first-run.md`
F-7). Keep the seven types one click deep and label the fold with a noun.

### 2 · One search field, in the masthead, over everything

**Problem it solves.** Item 2. Also `quote.md` Q16 (the view page always reopens
on row 1 of 40) and half of Q14.

**What it looks like.** A single field top-left of the sheet: type `SP560`, get
rows grouped by their table with the table named, press Enter and the camera
walks in with that row selected. It answers the one question the app assumes you
can already answer — *which of my 21 tables holds this boat?*

**Cost.** A day. `displayFieldId` and `rowLabel` already exist; 651 rows needs no
index.

**Risk.** It puts chrome on a deliberately bare masthead, and a search that
returns UIDs or raw column values instead of row labels would be worse than none.
Search labels only, at first.

### 3 · Freeze the name, and make the grid legible at one zoom instead of four

**Problem it solves.** Item 6, item 4, item 5 and item 22, which are all the same
problem seen from different distances: the app has four controls for "let me see
more of this" (click the plate · EXPAND · FOCUS · FIT COLUMNS) and none of them
produces a readable price row.

**What it looks like.** The display column pinned left in every grid, always.
FIT COLUMNS retired in favour of COLLAPSE ALL, which already does its job
properly. One canonical reading surface — the FOCUS lens, renamed — that the
card links to, instead of three partial ones.

**Cost.** Hours for the pinned column; a day to consolidate the four verbs into
two.

**Risk.** Pinning inside a virtualised grid with band-spanning headers is where
sticky layouts usually break; test it against the 7-band Highfield table
specifically. Consolidating the verbs touches the surface everyone has already
learned.

### 4 · One legibility floor, applied everywhere, as an art-direction decision

**Problem it solves.** Item 4, plus the whole of §5: 218 uses of a 2.96:1 ink,
28 distinct sub-12px rules on one screen, plate tags at 2.87–2.94 on the navy.

**What it looks like.** `--ink-faint` raised to ≥4.5:1 on white (≈`#5f7186`);
**12px** as the hard floor for any sentence that instructs; the mono micro-label
kept small only where it is a stamp, never where it is a sentence; a second LOD
tier so nothing on the canvas renders under 8.4px. `main.tsx` imports the
Archivo `wdth` axis, which turns 21 dead declarations back on and gives the
stamps the width language `ART_DIRECTION.md` is built around.

**Cost.** The token and the font import are minutes. The 12px floor is a
half-day pass over ~30 sentences.

**Risk.** This is the app's voice. Making the drawing-office micro-type bigger
will feel, to the author, like turning the volume down. It should be a deliberate
decision, not a lint rule: keep 8.5px stamps for *numbers and codes*, and give
*sentences* the floor.

### 5 · Make "no undo" untrue

**Problem it solves.** Item 7, item 9, item 10 and half the anxiety in every
confirm sheet. It is the single largest ease gain available, and the most
expensive.

**What it looks like.** A command log in the store: every mutation is an
invertible entry, Ctrl+Z walks it back, and the toast that already appears for
row deletion grows an UNDO. A `BroadcastChannel` lock so a second tab cannot
invalidate the log. Then the four confirm sheets can stop apologising and the
export can stop being the only safety net.

**Cost.** Needs a decision, then days. A narrower version — undo for cell edits
and column removals only, session-scoped — is about a day and covers the two acts
that actually lose a person's work.

**Risk.** A partial undo that silently does not cover some acts is worse than
none, because people will trust it. Whatever is not undoable must say so at the
moment it happens, not in a spec.

---

## 5 · ACCESSIBILITY — WHERE THIS APP ACTUALLY STANDS

**Plainly: a keyboard-only user can complete the first run and reach every
stage, but cannot tell where they are; a screen-reader user cannot do the app's
core job today.** Nothing here is graded on a curve, and nothing here is
inferred — every number was measured programmatically on the running app
(`access-and-responsive.md`). No screen reader was actually heard; see §7.

**Contrast failures, measured:**

| what | measured | where |
|---|---|---|
| `--ink-faint: #8598ad` on white | **2.96:1** (2.73 on `--paper`, 2.62 on the selected-row wash) | `src/styles/tokens.css:22` — **218 uses across 20 files**: every count, every breadcrumb, the connective words of every rule sentence, every empty state, every 8.5px band chip |
| all instructional micro-copy in the first five minutes | **2.93:1** at 9–11px, including a button (CLEAR SHEET, 9px) | `first-run.md` F-8 |
| Start plate tag `RUN` / `Start · …` on the navy (sampled from real pixels) | **2.94** | `access-and-responsive.md` A6 |
| Match plate tag `FIT` | **2.87** | same |
| output chip stamp | **3.44** | same |
| `MAKE A NEW VERSION` (enabled, 11px) | **1.14:1** | `quote.md` Q3 |
| `React Flow` attribution — and it is a tab stop | **1.05:1** on paper, **2.52:1** on the canvas | A5, `design-system.md` D3 |
| `.rl-empty-meta` (`MOTOR FITMENT — HIGHFIELD · 3 NODES`) | **2.51:1** | A5 |

One token fixes the first row and most of the second.

**Keyboard gaps, measured:**

- **The hidden sheet stays in the tab order.** With a stage open the blueprint is
  still rendered at `260,56 1020×744`, `visibility:visible`, with no `hidden`,
  `inert` or `aria-hidden` on any ancestor — **54 focusables**, identical with
  the view page, the flow rail and the flow stage open. Opening a view page by
  keyboard and Tabbing to its first control costs **74 presses**, 53 of them
  inside a sheet nobody can see, with a longest unbroken run of **9 presses with
  no focus ring at all**. (A1)
- **29 of 88 tab stops on the main screen have no focus indicator** — 8 React
  Flow edges and 21 node wrappers, measured by focusing all 88 and diffing
  outline/shadow/border/background. Each table is two stops, so the ring blinks
  off every other press. The business-name input on the very first screen is
  byte-identical focused and blurred. (A2)
- **Escape is inert** on the view page, the rules pane and the column setup; it
  works on `ConfirmSheet` and the I/O panel — so the app teaches the lesson and
  then breaks it. (A3)
- **Focus is dumped to `document.body`** after every stage change, after
  cancelling the retype dialog (on a stage with 129 tab stops), and after
  pressing RUN. (A4)
- **Zero headings** on the sheet, column setup, rules pane, flow builder, flow
  stage and quotes; `<main>` is labelled "Sheet" even while four other stages are
  showing. Onboarding and the view page do it properly, which proves the pattern
  is in the codebase. (A7)
- **66 controls under 24px**, identical at all four viewports: 62 column-reorder
  arrows at 20×17, `DISCARD` a quote at 66×15, `CLEAR SHEET` at 88×21, the `is`
  operator select 21px wide. (A8) Add the 22×22 per-line price chevron and the
  24×24 star that decides what goes on a quote (`quote.md` Q15,
  `view-and-rules.md` #6).
- **The view page's picked-rows grid is divs** — zero `table`/`role=grid`/`row`/
  `columnheader` on that surface, so the four column labels and the four values
  under them have no association. (A10)
- **No live regions** anywhere except the rule results and the column setup, so
  opening a stage produces no announcement, no focus move and no heading to land
  on. (A11)
- **The I/O panel is `role="dialog"` but not modal** and Tab walks straight out
  of it into the panel behind. (A13)

**Responsive.** This is the good news: zero horizontal overflow and zero
clip-without-ellipsis across 16 measurements (4 stages × 1024/1280/1440/1920).
The size failures are not overflow, they are *fold* failures — the doors (item
1) and the flow canvas, which at 1024×768 is **268px wide**, narrower than one
plate.

---

## 6 · CONSISTENCY DEBT

Everything below is a count over parsed CSS blocks or extracted strings, not an
impression. The headline ratio: **17 CSS files, 16,062 lines, 2,078 rule blocks —
and the shared foundation (`tokens.css` + `base.css`) is 340 lines, 2.1%.**
Almost every finding here is downstream of that number.

**Built twice or more** (`design-system.md` D5, D7, D8):

| object | shared primitive | rebuilt | drift |
|---|---|---|---|
| button | `.btn` (used 96×) | **46 bespoke recipes** in 14 files | 29 paddings, 10 sizes, 9 letter-spacings; one has asymmetric horizontal padding |
| mono stamp | `.mono-label` (used 144×) | **106 re-declarations** | 8 sizes, 11 letter-spacings; 2 are byte-identical to the primitive |
| registration tick | none | **11 implementations** | 6 sizes, 3 stroke weights, 5 offsets, 3 inks, one a different shape — reproduced side by side in `screens/design-system-ticks.html` |
| empty state | none | **48 selectors in 11 files** | 2 of them obey the art direction's own type rule |
| grid | — | `datagrid.css` and `table.css` share **10 byte-identical blocks** | two grids, one of them a copy |
| close / plus / back / check | `lib/icons.tsx` | 2–4 marks each | 37 banned `bold`/`fill` weights against 32 compliant; `ViewPage.tsx:265` changes stroke weight when one button toggles |
| type scale | — | **29 screen font-sizes**, 15 on one screen, 6 of them singletons | the display face has 8 sizes across 12 sites |
| spacing | `--sp-1…6` | 66% token use overall; `rule-nodes.css` 3%, `whiteboard.css` 11% | 362 raw values off the scale entirely |
| hairline | "1.25px" (stated) | 10 distinct SVG stroke widths | the specified value used in **6 of 45** |

**Named twice or more** (`language.md` §6). The same object, the same session:

- a table's kind is **TABLE TYPES** in the rail and **TABLE KINDS** in the dialog
  those cards open;
- one table object is **table** / **card** / **sheet** in its own three tooltips,
  and "sheet" separately means the canvas, one table and the whole project
  (`CLEAR SHEET`);
- a group of columns is **SECTIONS** / **band** / **Goes in**;
- the same 8 column types have two label sets one click apart (*Choice*/*Pictures*
  vs *LST · List*/*IMG · Images*);
- creating is **Create** / **Add** / **New** / **Draft** / **Write**; destroying
  is **Delete** / **Remove** / **Strike** / **Take off**, and one column dialog
  uses two of them about itself;
- **"rule"** means four different objects and **"filter"** three;
- **"field"** reaches the reader **~55 times** (23 in `features/rules`, 32 in
  `lib/rules`) against the app's own written contract — *"IT SAYS TABLE AND
  COLUMN, NEVER ENTITY, SCHEMA OR FIELD"*, `EntityDesigner.tsx:5-10`. F20
  converted *entity*; it never touched *field*.

**Built in two places with two different safety levels** — the dangerous kind of
duplication (`information-architecture.md` IA-3, IA-4; `sheet-and-tables.md`
S-11): a column can be renamed on the sheet (no formula repair) or in the column
setup (repair); removed on the sheet (a one-line warning) or in the column setup
(F26's full impact sheet naming every dependent). Both times the *cheaper*
gesture carries the *weaker* guarantee. That split is by implementation module,
not by any distinction a user could name.

**What a small design system would cost.** Not a rewrite — three primitives and
a glossary:

| work | size |
|---|---|
| `--sp-7` defined (or `constraints.css:691` corrected), `--viridian` → `--accent-viridian`, `main.tsx` imports the `wdth` axis | **3 lines, minutes** — and the last of these turns on 21 dead declarations |
| a `.tick` primitive, a stamp scale (3 sizes, 2 tracking values) and one button recipe in `base.css`, with the existing 47/106/11 sites migrated | **2–3 days**, mechanical, visually diffable |
| collapse `datagrid.css` into `table.css` (10 identical blocks, one grid) | **a day**, and it deletes a file |
| one glossary — kind, band, column, row, pick, star, rule — applied as a find-and-replace over ~40 strings, `field` → `column` in the 55 sites | **half a day** |
| pin the type scale at ~8 sizes and lint new ones | **hours**, plus the argument |

That is roughly a week for the whole of it, and it is the week that stops every
subsequent fix from having to be made in 164 places.

---

## 7 · WHAT WE STILL DO NOT KNOW

Gathered honestly from all nine passes. If it is not tested, it is not a
finding — and it is not a clean bill of health either.

**Interaction never exercised**

- **Every drag path in the app** — a table type from the panel onto the sheet, a
  card around the canvas, a palette chip onto the flow canvas, a column grip to
  resize, a block nested onto another block, a row reordered by its grip. This is
  the standing O7 and five passes hit it independently.
- **Touch, on anything.** The hover-only rails (O9) were reached by an explicit
  programmatic hover.
- **Copy/paste between cells** (Ctrl+C/Ctrl+V). The Excel-block paste evidence is
  a **synthetic `ClipboardEvent`** — verified to carry its text and reach the
  handler, with a working positive control, but not the OS clipboard.
- **Multi-row selection and multi-row delete**, `+ ROW` (append) in FOCUS.
- **Keyboard-only traversal of the view page, the rules pane and the flow
  builder** (the first-run journey was completed keyboard-only; the rest was not).

**Measured in one place only**

- **1920×1080** for the sheet, the tables, quoting and the critic pass. Only the
  IA, view-and-rules and access passes re-checked at a second width.
- **1280×800 for the visual-system pass — not done.** That window would not
  resize; every in-browser number in `design-system.md` is at **1920×935**, and
  anything width-dependent there is marked *not verified at 1280*. That pass also
  could not write screenshots, so its evidence is file:line and measured numbers
  plus one reproduction-from-source.
- **Whether the 12–24 fps of item 5 reproduces outside a Playwright-driven
  Chromium**, or on a real trackpad. The plate-vs-grid *ratio* (5× on p50, 40× on
  frames-over-budget) is the part to trust.

**Behaviour read from source but never triggered**

- `RuleResultsRail`'s **Apply / "12 writes committed to the sheet"** — it would
  have written rows into the real project.
- `RuleInspector.tsx:1170`'s `window.confirm` on node delete (the one at
  `RulesList.tsx:66` *was* observed live).
- The threshold placeholder `"0"`; L26's `singular()` bug (`ViewStage.tsx:237`) —
  though `critic.md` reached the screen itself on a 0-row table.
- Whether a flow rule's `action` node **can** be configured to write into the
  join table the view page reads. If it can, IA-5 narrows to "the seeded rules do
  not do it"; if it cannot, the two fitment engines are structurally separate.
- Renaming the business, and what it does to constraints keyed on the lower-cased
  business name (`orgKeyOf`).
- Whether imported-and-degraded tables (item 10) can be repaired from inside the
  app at all — no UI for `kind`/`role`/`hierarchy`/`sections` was looked for.
- `ADD A REBATE` / `ADD A TRADE-IN`; the `N not priced` amber-pill state; a quote
  long enough to need two pages on purpose; any paper size but A4; a real printer.
- Whether an import of a *different* project dangles the quotes already in
  `localStorage` (they key off entity and row ids, so it looks possible).

**Accessibility, specifically**

- **No screen reader was heard.** Everything in §5 is the accessibility tree and
  computed styles, read programmatically. NVDA/JAWS/VoiceOver were not run.
- Forced-colors / Windows High Contrast: not tested.
- `prefers-reduced-motion`: code-verified as honoured app-wide, **rendered result
  not verified** — the harness could not force the media query.
- 200% zoom (WCAG 1.4.4): not tested.
- Escape on the flow stage and the column setup were **inferred** from the shell
  control they share with the view page, not separately measured.
- Colour-alone encoding: no case found, but the states were not exhausted — quote
  status was only ever seen as `Draft`.

**Explicitly unverified claims, flagged by their own authors**

- The series band sliding under the sticky header (`first-run.md` F-5) was
  produced with a programmatic scroll offset; how long it is visible in a natural
  wheel scroll is unknown.
- Contrast ratios **on the flow canvas** in `design-system.md`: the automated
  sweep returned false numbers because the navy comes from a `background`
  shorthand the compositing walk did not resolve. Only the pixel-sampled figures
  in `access-and-responsive.md` A6 should be quoted.
- The rule drawing rendering blank for a beat (`design-system.md`): **one
  occurrence, not reproduced**.
- Why the curated motor menu appeared in three different orders across three
  sessions (`quote.md` Q12): **cause not established**.
- Whether writing screenshots into `docs/audit/screens/` triggers Vite reloads
  (inside the watch root): **suspected, not proven**.

**Conditions the reader should know about**

- **The browser was shared between passes.** Twice, app state changed with no
  input from the pass observing it — an open rule closed itself, and a design
  stage nobody opened appeared on screen
  (`information-architecture-15-unexpected-design-stage.png`). Every number in
  these reports was taken in the same tool call as the action that produced it,
  or read from source. Future passes should each get their own browser context;
  O10 should be widened to say so.
- The dev server was **not running** at the start of two passes (5090 refused);
  they started it themselves.
- The critic pass used `http://sandbox.localhost:5090/` — the same server on a
  different browser origin, with its own IndexedDB — so every wipe, first-run and
  hostile-input test ran against a throwaway business, not the audited project.

**State the audits left behind** (this app has no undo, so it is on the record):
3 business rules, all switched **off**, none deletable; 1 orphan link table
`Highfield Inflatables × Parts & Accessories` (TABLES 22, RELATIONSHIPS 05); 2–3
draft quotes, two of them the same Coaster 540; one quote whose `rootTableId` is
not in the project; `meta.exportCount` 1 → 3. Two stray files that are **not**
from any completed pass: `critic-highfield-after.json` in the repo root and ~30
screenshots under the plain `critic-NN-*` prefix, left by an aborted run that
produced no report; the completed critic pass is prefixed `criticB-`.

---

## THE ORDER I WOULD DO THIS IN

Not a plan, a priority. The first line buys more usability per hour than the rest
of the list combined.

1. **Half a day**: scroll the doors into view + fold the type rail (item 1);
   `--ink-faint` (§5); `autoFocus` on cancel (item 7); `--sp-7`, `--viridian`,
   the `wdth` import (§6); `inert` on the hidden canvas (§5).
2. **Two days**: the `envelope.ts` round-trip keys and a test (item 10); the
   view-id seam (item 8); the workbook-rules gate and `clearConstraints()`
   (items 11, 12); the pinned name column (item 6).
3. **A week**: masthead search (change 2); the grid draw policy behind item 5;
   the tab lock (item 9); the design-system primitives (§6).
4. **Needs a decision, then days**: undo (change 5), and what a plate says at
   0.28 (change 4).
