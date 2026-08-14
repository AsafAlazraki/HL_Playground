# JOURNEY ONE — THE FIRST FIVE MINUTES

Audit lens: `first-run`. 1280×800. Chromium via Playwright MCP.
Two clean runs from a wiped profile (IndexedDB `helmlogic-dynamic-config` deleted,
localStorage + sessionStorage cleared, full reload):

* **Run A** — onboarding → Marine → **Load a worked example** → find the Highfield Sport 560.
* **Run B** — onboarding → Marine → **Create your first table** → walk the wizard → column setup → I/O.

Persona: a boat dealer's sales manager. Never seen the app, reads nothing, clicks
what looks clickable. Screenshots in `docs/audit/screens/first-run-*.png`.

Nothing under `src/` was edited.

---

## CONSOLE — clean

| moment | errors |
|---|---|
| clean land (Run A + Run B) | **0** |
| onboarding → create own table → column setup → I/O flyout → Ctrl+K (Run B, whole path) | **0** |
| clicking "Load a worked example" | **2** |

The 2 are the documented cross-origin image probes
(`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`, `northsidemarine.com.au/...jpg`). Baseline
met exactly, nothing above it. `documentElement.scrollWidth` = `innerWidth` = 1280 on
every screen visited; no horizontal page overflow anywhere.

---

## THE NARRATION, step by step, with the first hesitation marked

**Land** — `first-run-01-land.png`. A white card on the blueprint: HELMLOGIC, *"What's
the name of your business?"*, one field (already focused), one button. Exactly one
obvious action, and the cursor is already in it. **No hesitation.**

**Business name** — I type "Bayside Boats" and press Enter. It advances. Enter works;
I never had to find the button. **No hesitation.**

**Industry** — `first-run-02-industry.png`. *"What does Bayside Boats sell?"* with my
own name in the question, and under it *"Marine is ready to use today. The rest are
still on the drawing board."* Three cards carry a COMING SOON stamp and are visibly
inert. Being blocked reads as **informed, not broken** — the subtitle does the work
before I touch anything. Measured: subtitle #D9E6F7 at 60% over #123252 = **4.76:1** at
14px, passes. **No hesitation.** (One product note, not a defect: the "Other — start
from a blank sheet" card is the one a non-marine dealer needs, and it is greyed. The
brief says "generic industry"; today the app is marine or nothing.)

**Empty sheet** — `first-run-03-after-marine.png`. A card in the middle of the canvas:
"Nothing on the sheet yet / Bayside Boats / **CREATE YOUR FIRST TABLE** / *Load a
worked example — another dealer's price file* / Or drag a table type from the left onto
the sheet." Two ranked choices, both plainly worded. **I knew what to do in under five
seconds.** This screen is the strongest thing in the first five minutes.
Hesitation: **F-7** below — the third option (drag) is written at 9.5px and the left
panel, which is where you would drag *from*, does not mention dragging while the sheet
is empty.

**Load a worked example** — `first-run-04-loaded.png`. 21 plates arrive, framed at
scale 0.2786 with all 21 fully inside the pane (F1's fix holds — measured, 21/21). And
then **the first real hesitation of the run**: nothing tells me what just happened.
See F-2 and F-3.

**Find the Highfield Sport 560** — 6 clicks and one long scroll, and only because I
already knew Sport 560 is a Highfield. See F-1, F-4, F-5.

**Make my own first table instead** — Run B. The two questions are obvious and the
wizard is good. What it hands back is not. See F-6.

---

# FINDINGS — ranked by how early they stop someone

## F-1 · There is no way to search for anything. Anywhere. (minute ~1)

**What I did.** Loaded the worked example. Asked the app for one boat: the Highfield
Sport 560. Looked for a search box in the masthead, the left panel, and the sheet.

**What I expected.** A field. 21 tables and 651 rows is a filing cabinet; the first
thing a sales manager does with a filing cabinet is ask it for one thing by name.

**What happened.** Measured on the loaded project:

```js
[...document.querySelectorAll('input,textarea')]  // → []   (zero, whole document)
```

There is no input element on the screen at all. `Ctrl+K` opens nothing (`dialogs: 0`,
`inputs: []` after the keypress). The only way to reach a product is to already know
which of the 7 boat brands sells it, click that brand, and scroll.

The route I actually took, in clicks:

1. Click **HIGHFIELD INFLATABL…** in the left panel → the plate gets selection brackets
   on the sheet, two doors appear in the panel, no rows (`first-run-05-select-highfield.png`).
2. Click the plate on the sheet → the canvas jumps from scale **0.2786 to 1.0** and the
   table opens at 520×320 showing 3 of its 31 columns (`first-run-06-click-card.png`).
3. Click **EXPAND** → 953×553 (`first-run-07-expand.png`).
4. Click **COLLAPSE ALL** → my data disappears (see F-4), click **EXPAND ALL** to undo.
5. Scroll the body **1,203px of 1,641px** to reach series *Sport* → **MODEL SP560, 15
   VARIANTS** (`first-run-10-sport-560.png`).

Two dead ends on the way (F-4, and the column-setup door I could not see, F-10).

**Where.** `first-run-04-loaded.png` … `first-run-10-sport-560.png`; the measurement above.

**Why it ranks first.** Everything else in this report is something you push through.
This is the moment the app fails to answer the question the person arrived with, and
it happens in the second minute. A person who does not already know the brand cannot
find the boat at all.

---

## F-2 · 21 tables of another dealer's data arrive under my business name, and nothing says so (minute ~1)

**What I did.** Clicked *"Load a worked example — another dealer's price file"*.

**What I expected.** To be told what landed and that it is not mine.

**What happened.** 21 plates appear. The masthead still reads **BAYSIDE BOATS · MARINE**
— my name over Northside Marine's price file. No toast, no banner, no badge. Measured
on the loaded project:

```js
/example|demo|sample/i.test(document.body.innerText)   // → false
```

The word "example" (or "demo", or "sample") does not occur anywhere in the running app
after the click. The only sentence that ever said it was on the button I just destroyed
by pressing it.

The way back out is **CLEAR SHEET**, in the footer of the I/O flyout
(`first-run-20-io.png`), measured at **88.3 × 21.0 px, font-size 9px**, sitting on the
same line as the non-interactive watermark "HELMLOGIC · DOC CTRL" and styled like it.
A 21px-tall target is under the 24px WCAG 2.2 minimum, and it is the only undo for the
most likely mistake of the first two minutes — behind a door labelled **I/O**, which is
two letters of engineer's shorthand.

**Where.** `first-run-04-loaded.png` (masthead + plates), `first-run-20-io.png`
(CLEAR SHEET), measurements above.

---

## F-3 · On the arrival screen, every word except the brand name is 3 pixels tall (minute ~1)

**What I did.** Read the screen the example data lands you on.

**What I expected.** To be able to read the plates.

**What happened.** Measured at the framing the app itself chooses (`scale 0.278571`):

| element on a plate | CSS size | **rendered size** |
|---|---|---|
| table name ("Stacer") | 30px | **8.36px** |
| band names (Identity, Capacity, Construction, Cost Build) | 11px | **3.06px** |
| "26 models · 26 columns" | 11px | **3.06px** |

So the first screen of the app's own data is 21 cards each carrying one legible word
and four grey smears. This is *not* a re-report of F2 (which was about DOM count and
pan latency, and is fixed — pan is smooth and the count is low). It is that the level-of-
detail plate has more type on it than 0.28 scale can carry, so the plate reads as
decoration rather than as a card with facts on it.

**Where.** `first-run-04-loaded.png` — the grey bar under each brand name; measurement above.

---

## F-4 · "COLLAPSE ALL" collapses the columns, not the rows, and every value on screen vanishes (minute ~2)

**What I did.** Opened Highfield expanded (`first-run-07-expand.png`). The rows are a
tree — *SERIES Roll-Up ▸ MODEL RU230KAM ▸ 01…04* — and the top-left button says
**COLLAPSE ALL**. I pressed it to fold the tree down to its series so I could find Sport.

**What I expected.** Seven series, one line each.

**What happened.** `first-run-08-collapse-all.png`. The row tree is untouched. Instead
every *column* folded into its section, the readout changed from `COLUMNS 30` to
**`COLUMNS 1 / 30`**, and the only column still holding values is the system UID. The
screen is now 40 rows of `D6ANPze8d0`, `u5f6VOM3uI`, `caa__OGjHm` and nothing else.

It is recoverable — the button becomes EXPAND ALL — but for the several seconds before
you find that, the app has apparently eaten the price file. Two things collide in one
label: the noun "all" is ambiguous between the two collapsible structures on the screen,
and the destination state is one where the *only* surviving column is the one column no
human wants.

**Where.** `first-run-07-expand.png` (before) vs `first-run-08-collapse-all.png` (after).

---

## F-5 · Reading a price means scrolling 3,295px sideways, and the boat's name does not come with you (minute ~2)

**What I did.** Reached MODEL SP560 and went looking for what it sells for.

**What I expected.** To read a row.

**What happened.** Measured on the expanded Highfield card at 1280×800:

* body scroller `.tb-scroll`: **clientWidth 953px, scrollWidth 4,248px** — 22% of the
  table is visible, and the horizontal range is **3,295px**.
* Nothing is frozen except the row-number gutter. At `scrollLeft = 3295`
  (`first-run-12-hscroll-max-uid-frozen.png`) the leftmost thing on screen is the ordinal
  `23`, `24`, `25`… The **Variant** column — `PVC W-W-WB`, `HYP LG-W-WB`, the thing that
  distinguishes one row from the next — has scrolled off. Rows 23–29 all read
  `41340 / 39273 / 27453`, so you cannot tell which of the 15 SP560 variants you are
  pricing. Only the group band *MODEL SP560* survives the scroll.
* Money is printed raw. The **Landed Hull Cost** column (header title: *"Landed Hull Cost
  — holds number"*) shows `9097.1429`, `29251.4286`, `1671.4286`, `3214.2857`,
  `2721.4286`. No currency, no thousands separator, four decimal places, in the column a
  dealer reads out loud.
* In the identity columns, cell text overflows its box: `.tb-val` measured
  **scrollWidth 185 vs clientWidth 159**, rendering as `Highfield - SP560 (PVC) W…`. Every
  row of the Boat column is ellipsised.

**Where.** `first-run-10-sport-560.png`, `first-run-11-hscroll-2600.png`,
`first-run-12-hscroll-max-uid-frozen.png`; measurements above.

**Related, minor, and honestly caveated:** with the body scrolled so that a series band
sits at the top, the band's own label renders *under* the sticky column-header row —
measured overlap, "Sport" at y 198.4–219.6 against the header band at y 204.7–248.0. I
produced that scroll offset programmatically, so I have not verified how long it is
visible during a natural wheel scroll. **Not verified** beyond the overlap arithmetic.

---

## F-6 · The "Boats" preset is Highfield's schema. A dealer's own first table arrives with 31 columns, one of them named "AUS Sailing" (minute ~3, Run B)

**What I did.** Ran the other path from the empty sheet: **Create your first table** →
**Boats** → kept the three-level shape → named it **Quintrex** → Create table → the table
lands selected with both panel doors visible → clicked **"What is each column allowed to
hold?"**.

**What I expected.** The wizard's two questions were genuinely good
(`first-run-14-create-table-1.png`, `first-run-15-create-table-2.png`): *"What kind of
table is this?"* then *"How is it structured?"*, with a live preview of how rows will
sit and the sentence *"Add a row inside a group and its Series and Model are filled in
for you."* Nothing to fault in the asking.

**What happened.** `first-run-18-column-setup.png` — **COLUMNS 31**, on a table with zero
rows, before I typed a single boat. The full list, read off the screen:

> Series\*, Model\*, Variant\*, Model Code, Matrix, **Material** (PVC/HYP), Colourway,
> Image, OA Length m, Beam m, **Tube Dia. cm**, Deadrise °, Fuel Capacity L, Max Load kg,
> Max People, Boat Weight kg, Currency, EX Rate, Base Cost, Road Freight, Landed Hull
> Cost, **HO - MU %**, **BMT - MU %**, Cash, Trade, Sub Dealer, Sub (Exclusive),
> **AUS Sailing**, Min HP, Max HP, Shaft Length

Source: `src/types/model.ts:293–332` (`detailColumns` of the boat preset);
`Tube Dia.` l.301, `HO - MU` l.317, `BMT - MU` l.318, `AUS Sailing` l.323.

Three problems, in order of how badly they read to a stranger:

* **`AUS Sailing`** is one specific customer out of Northside Marine's price file. Every
  new Boats table, in every business, in every industry this app ships to, is born with a
  pricing column named after a third party the user has never heard of.
* **`HO - MU %`** and **`BMT - MU %`** are Hull-Only Markup and Boat/Motor/Trailer Markup.
  Nothing on the screen expands them. This is exactly the "people who think they
  understand data management" problem the brief names — the app is teaching the habit it
  exists to break.
* **`Tube Dia. cm`** and **`Material: PVC / HYP`** are rigid-inflatable columns. My table
  is called Quintrex — aluminium. A dealer's own first table arrives pre-populated with a
  competitor's hull technology.

And the width follows: the new empty table's scroller measured **clientWidth 519px,
scrollWidth 4,016px** — 7.7 screens of horizontal scroll for a table with one blank row.

**Where.** `first-run-16-own-table-created.png`, `first-run-17-first-row.png`,
`first-run-18-column-setup.png`; `src/types/model.ts:293`.

---

## F-7 · The instruction on how to use the left panel appears only after you no longer need it

**What I did.** Stood on the empty sheet in Run B and read the left panel.

**What happened.** Measured, empty sheet:

```
nav.innerText = "TABLE TYPES\n\nBoats\nMotors\nTrailers\nAccessories\nPackages\nDealers\nCustom table\n\nYOUR TABLES APPEAR HERE."
/Drag one onto the sheet/i.test(nav.innerText)  // → false
```

Measured, same panel once tables exist (`first-run-04-loaded.png`, `first-run-16-*.png`):

```
"TABLE TYPES\nDrag one onto the sheet, or click to place it.\nBoats\n…"
```

The one sentence that teaches what those seven rows are for is **absent exactly while the
sheet is empty** and present once you have already worked it out. The empty-state card
does carry it — *"Or drag a table type from the left onto the sheet."* — at **9.5px**,
`rgb(133,152,173)` on white, the smallest and lowest-contrast text on the screen.

(The behaviour itself is fine: clicking a type opens the same wizard with step 1 skipped
— `first-run-19-click-motors-type.png`.)

**Where.** `first-run-13-empty-panel-no-hint.png` vs `first-run-04-loaded.png`.

---

## F-8 · The app's instructional micro-copy is systematically below the contrast floor

Every explanatory sentence in the first five minutes is set in `rgb(133,152,173)` on
white — a measured contrast of **2.93:1**, against a 4.5:1 minimum. Measured instances:

| sentence | size |
|---|---|
| "Table types" | 10px |
| "Your tables appear here." | 9.5px |
| "Nothing on the sheet yet" | 9px |
| "Or drag a table type from the left onto the sheet." | 9.5px |
| "These levels are yours — click one to rename it, × takes it out." | 11px |
| "CLEAR SHEET" (a button) | 9px |

The same ink is used for the disabled Continue label on the landing screen (11px on
`rgb(231,237,245)` = **2.49:1**; disabled controls are exempt, noted for completeness).

These are the sentences that carry every explanation the app offers to someone who will
not read documentation, and they are the hardest things on the screen to read.

---

## F-9 · Confirmed still open: the column-setup door is below the fold (this is O11, re-measured today)

Not a new finding — logged as **O11** in `CLUELESS_USER_TESTS.md`. Re-measured cold at
1280×800 after clicking HIGHFIELD INFLATABLES on the loaded example, left panel at rest
(`nav.scrollTop = 0`, and it does not scroll itself on selection):

| door | rect | visible |
|---|---|---|
| "What goes with each one?" | y 754.4 → 783.1 | fully |
| "What is each column allowed to hold?" | y 791.1 → **836.4** | **9px of 45** |

Viewport bottom is 800. Better than the y=849 the previous pass measured, still not a
door anyone can see. Run B proves the cause is purely list position: with one table in
the project, both doors are fully visible at y 683 and y 720 (`first-run-16-own-table-created.png`).

---

## Smaller things, observed, low severity

* **The new-table dialog opens with the wrong card looking chosen.** Keyboard focus is on
  **Boats** (a11y tree: `[active]`), but the card drawn with the emphasis fill and amber
  border is **Trailers** — because the pointer is left resting where the "Create your
  first table" button was, and that spot is inside the Trailers card. First impression is
  that Trailers is pre-selected. `first-run-14-create-table-1.png`.
* **The wizard preview uses real third-party brands as placeholder content.** Boats
  previews *HIGHFIELD ▸ Sport ▸ SP520 / SP600 ▸ Patrol ▸ PA460 / PA540 Open*; Motors
  previews *YAMAHA ▸ Four Stroke*. On the screen where I name **my** table, the example is
  a named manufacturer's real model list. `first-run-15-create-table-2.png`,
  `first-run-19-click-motors-type.png`.
* **The first data column of every table is a 10-character system UID** — `D6ANPze8d0`,
  `kzG1VaJF_1` — including on a brand-new table with one blank row, where it is the only
  thing in the row (`first-run-17-first-row.png`). It carries a lock icon and the word
  SYSTEM, so it is honest; it is still the first thing a sales manager's eye lands on.
* **Another company's brand sits in the corner of the sheet.** A "React Flow" link to
  `reactflow.dev/attribution` is pinned bottom-right of the canvas on every screen,
  including the empty first sheet. `first-run-03-after-marine.png`.
* **"HIGHFIELD INFLATABLES" is ellipsised in the left panel by one pixel** — measured
  `scrollWidth 159` against `clientWidth 158`, rendering "HIGHFIELD INFLATABL…". It is the
  longest table name in the seed and the one this journey targets.
  `first-run-04-loaded.png`.
* **"NOTHING LOGGED YET"** is the empty state of a table you just made. "Logged" is the
  drawing-office register metaphor reaching a sales manager who has just been asked, in
  plain English, what kind of table this is. `first-run-16-own-table-created.png`.

---

## What is right, and should not be touched

Worth stating, because this report is otherwise a list of faults:

* The onboarding is three screens, one question each, and Enter works on the first.
* The industry step tells you *why* three cards are dead before you click one.
* The empty sheet ranks its two paths correctly and both are one click.
* The new-table wizard asks the two questions in the right order, previews the answer
  live, and lets you rename the levels in place.
* Fitting 21 tables on arrival works — 21 of 21 fully inside the pane (F1 holds).
* The column setup opens on COLUMNS at y=246 with ABOUT THIS TABLE folded shut (F28 holds).
* Zero console errors across the entire own-table path.

---

## Not tested on this lens

View pages, business rules, the flow builder, quotes, import/merge, editing a cell,
adding a column, 1920×1080, touch, and every drag interaction (chips onto the sheet,
plates around the canvas). The browser was left on the loaded worked example.
