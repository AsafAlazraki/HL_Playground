# JOURNEY FIVE — ACCESSIBILITY AND SIZE

Audit only. No file under `src/` was touched. Run at 1280×800 in Chromium via
Playwright, against the seeded Northside project already in the browser profile
(21 tables, 651 rows, 1 quote). The first-run journey was run in a **separate
clean browser context** so the existing project and its quote were never
cleared.

Baseline console errors: **2–3 per load**, every one of them the documented
cross-origin image probe (`ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` on
`northsidemarine.com.au` boat photos). **No new console error was produced by
anything in this audit** — not by the keyboard walk, not by the dialogs, not by
running a rule, and the whole first-run journey in a clean context produced
**0 errors** until the seeded data loaded, then 2.

---

## WHAT IS ALREADY RIGHT

Stated first because it is load-bearing for the findings below — the app knows
how to do this, it just does not do it everywhere.

| Thing | Evidence |
|---|---|
| **Every interactive element has an accessible name.** | Enumerated `button, a[href], input, select, textarea` on the sheet, the view page, the column setup, the rules pane, the flow builder, the flow stage, the quotes stage and the I/O panel. **Zero unnamed controls on any of them.** Even the 62 reorder arrows read "Move the column Max People up". |
| `aria-pressed` on the three panel doors, and it updates | Opening Business rules: `Quotes=false, Work out what fits what=false, Business rules=true` |
| `aria-current="true"` on the selected table | `.shell-tbl.is-selected` carries it; selection is not colour-only |
| The rules rail's ✓ says its state out loud | `<span class="rl-dotstamp is-ok" role="img" aria-label="Ready to run">`; the 8×8 colour square beside it is correctly `aria-hidden="true"` |
| Rule results are a **real table** | 174 rows, 8 `<th scope="col">` |
| Rule results are **announced** | `aria-live="polite"` region reads `173 ROWS · 1 VIEW` |
| `ConfirmSheet` is a correct modal | `role="dialog" aria-modal="true"`, labelled, focus lands on CANCEL, Tab wraps CANCEL → Keep the 29 → Clear the column → CANCEL in both directions, Escape closes |
| The I/O panel returns focus to its trigger | Escape → `aria-expanded="false"`, focus back on the I/O button. **The only surface in the app that does this.** |
| The focus ring colour is strong enough | `outline: 2px solid rgb(29,85,196)` = **6.67:1** on white (needs 3:1) — where it is drawn at all |
| No horizontal overflow, anywhere | `documentElement.scrollWidth − innerWidth = 0` at 1280×800, 1440×900, 1920×1080 **and 1024×768**, on the sheet, the view page, the column setup and the flow stage — 16 measurements, all zero |
| No text clipped without an ellipsis | Same 16 measurements: every element with `overflow:hidden` whose `scrollWidth > clientWidth` also has `text-overflow: ellipsis`. **Zero exceptions.** |

---

# FINDINGS — ranked by how early they stop someone

## A1 · The sheet you left behind is still in the tab order, 54 stops deep, and it is invisible

**BLOCKS THE SECOND MINUTE FOR ANYONE ON A KEYBOARD.**

**What I did.** Keyboard only, from a fresh load. Tab to HIGHFIELD INFLATABLES
→ Enter → Tab (lands on "What goes with each Highfield Inflatables row") →
Enter. The view page opens (`access-viewpage-after-enter.png`). Then I kept
pressing Tab and recorded `document.activeElement` after every press.

**What I expected.** Focus moves into the page I just opened, or the next Tab
takes me to it.

**What happened.** **74 Tab presses** to reach the view page's first control
("BACK TO THE SHEET"). Presses 21–73 land inside the **blueprint sheet, which
is no longer on screen** — it is still rendered at `260,56 1020×744`,
`visibility: visible`, with **no `hidden`, no `inert`, no `aria-hidden`** on any
ancestor. It is simply painted over.

```
 1: What is each column of Highfield Infla…
 2–19: JEANNEAU … STACER × YAMAHA (the rest of the table list)
20: Edge from 4rePDz1Rx5 to WIP0tgwwTm   [HIDDEN SHEET] [NO FOCUS RING]
…
69: Highfield Inflatables IDENTITY CAPACIT [HIDDEN SHEET]
70: Zoom In                                [HIDDEN SHEET]
73: React Flow attribution                 [HIDDEN SHEET]
74: BACK TO THE SHEET
```

Longest unbroken run with **no focus ring at all: 9 presses.** For fifty-odd
presses the ring is gone and the page does not move; there is no way to tell
whether the app is still alive.

**Measured on every stage, not just this one:**

| Stage open | focusable elements still inside `.wb-canvas` |
|---|---|
| View page | 54 |
| Flow builder rail | 54 |
| Flow stage (rule open) | 54 |
| Column setup | present (its React Flow attribution link is still in the tree) |

Total tab stops with the flow stage open: **111**, of which 54 belong to a sheet
the user cannot see.

**Where.** `access-viewpage-focus-lost-in-hidden-sheet.png` (focus is on an
edge; nothing on screen changes), `access-viewpage-after-enter.png`.

---

## A2 · Focus disappears on 29 of the 88 stops on the main screen — and on the very first control in the app

**What I did.** Reloaded, pressed Tab once to establish keyboard modality, then
focused each of the 88 tabbable elements in turn and compared
`outline / box-shadow / background-color / border` before and after.

**What happened.** **29 of 88 have no focus indicator whatsoever** — computed
`outline-style: none`, no shadow, no border change, no background change:

- **8 React Flow edges** (`g.react-flow__edge`, `tabindex=0`, named "Edge from
  4rePDz1Rx5 to WIP0tgwwTm" — an internal id read aloud to a screen reader)
- **21 node wrappers** (`div.react-flow__node`, `tabindex=0`, `role="group"`)

Each table is **two** stops: the wrapper (no ring) then its inner `button.tb-lod`
(ring). So on the canvas the ring blinks on and off every other press.

```
wrapper focus: {"el":"react-flow__node …","outline":"rgb(18,40,63) none 2.66667px"}
button focus:  {"el":"tb-lod",           "outline":"rgb(29,85,196) solid 2px"}
edge focus:    {"el":"react-flow__edge …","outline":"rgb(18,40,63) none 2.66667px"}
```

`access-focus-invisible-node-wrapper.png` (focus is on the Parts & Accessories
node wrapper — no ring anywhere in frame), `access-focus-visible-node-button.png`
(one Tab later, ring present), `access-focus-invisible-edge.png`.

**And the first control a new user ever meets has the same problem.** On the
landing screen, the business-name input:

```
blurred: {outline:"rgb(18,40,63) none", boxShadow:"rgb(29,85,196) 0px 1.5px 0px 0px",
          borderBottom:"1.33333px solid rgb(29,85,196)", bg:"rgba(0,0,0,0)"}
focused: {outline:"rgb(18,40,63) none", boxShadow:"rgb(29,85,196) 0px 1.5px 0px 0px",
          borderBottom:"1.33333px solid rgb(29,85,196)", bg:"rgba(0,0,0,0)"}
identical: true
```

Byte-identical. It is autofocused on load so a first-timer gets away with it;
anyone who Tabs away and back cannot see where they are.
`access-firstrun-input-focus.png`.

---

## A3 · Escape does nothing on four of the six surfaces

**What I did.** Pressed Escape with focus inside each surface and re-read the
state.

| Surface | Escape does |
|---|---|
| View page (focus on BACK TO THE SHEET) | **nothing** — `{view:true, doorsShown:true, selected:true}` before and after, twice |
| Business rules pane | **nothing** — `aria-pressed` still `true`, pane still open |
| Flow builder / flow stage | **nothing** (not separately re-tested after the view-page result; same shell control) |
| Column setup | **nothing** |
| `ConfirmSheet` (retype dialog) | closes ✓ |
| I/O panel | closes **and returns focus to the I/O button** ✓ |

`access-escape-on-view-page.png`. The app has taught the user, in the I/O panel,
that Escape means "close this". Everywhere else it is inert, so the lesson is
false and there is no keyboard way out of a stage except finding "BACK TO THE
SHEET" — which is 74 Tab presses away (A1).

---

## A4 · Focus is dumped to `document.body` after every stage change and every dialog

Measured `document.activeElement` immediately after each keyboard action:

| Action (keyboard) | Focus afterwards |
|---|---|
| Enter on CONTINUE (first run) | `BODY` |
| Enter on MARINE (first run) | `BODY` |
| Enter on "Load a worked example" | `BODY` |
| Enter on BACK TO THE SHEET | `BODY` |
| Escape on the retype `ConfirmSheet` | `BODY` — **not** the type select it came from |
| Enter on RUN (flow stage) | `BODY` |

The `ConfirmSheet` one is the expensive case. A keyboard user opens column 21 of
31 on Highfield, changes the type, reads the sheet, cancels — and is returned to
the top of the document. The column setup stage has **129 tab stops of its own**;
getting back to where they were costs roughly a hundred presses through the
20×17px arrow buttons.

RUN is the other one: press Enter, focus vanishes, and the answer (which *is*
announced politely, credit where due) is now nowhere near the caret.

---

## A5 · `--ink-faint` is 2.96:1, and it is used 218 times

**Measured, not eyeballed.** Computed colours composited against the real
painted background; ratios by the WCAG formula.

`--ink-faint: #8598ad` (`src/styles/tokens.css:22`, commented *"tertiary,
placeholders"*) on `--paper-high` white = **2.96:1**. Needed: 4.5:1.
On `--paper` `#f2f6fb` it drops to **2.73:1**; on the selected-row wash
`rgb(237,241,250)` it drops to **2.62:1**.

`grep -c 'var(--ink-faint)'` → **218 occurrences across 20 files.**

Every one of these was measured on screen at 1280×800:

| Text | Where | size | ratio |
|---|---|---|---|
| `21` / `07` / `26` / `40` (table & group counts) | left panel, every screen | 9.5–10px | 2.96 / 2.62 |
| `limits every row must keep`, `what each column may hold`, `walk the rows, collect the matches` | the stage breadcrumb, every screen | 10px | 2.96 |
| `When` … `,` … `because` (the connective words of a rule sentence) | Business rules | 13–15.5px | 2.96 |
| `These are limits — things every row must keep…` | Business rules lede | 13px | 2.96 |
| `No rules yet. Finish the sentence above and it becomes your first.` | Business rules empty state | 13.5px | 2.96 |
| `It reads as a sentence, and it takes effect the moment you add it.` | Business rules | 12.5px | 2.96 |
| `Nothing else to fill in.` | Business rules | 9.5px | 2.96 |
| `Identity` / `Capacity` / `Construction` band chips | column setup, all 31 rows | 8.5px | 2.96 |
| `Groups — the sheet opens a drawer…` (the legend added by F28) | column setup | 9px | 2.73 |
| `Table · column setup`, `About this table`, `description · accent ink · which column names a row` | column setup | 9–11.5px | 2.96 |
| `products` / `+1` on the sheet's table plates | the sheet | 11px | 2.96 |
| `no customer yet`, `Draft` | Quotes | 10–14px | 2.96 |
| `drag or click` (the palette's only instruction) | flow stage | 8.5px | 2.96 |

Two more, separately measured:

- **`React Flow` attribution link**: `rgba(217,230,247,0.34)` at 8px on
  `rgb(242,246,251)` = **1.05:1**. Effectively invisible, and it is a **tab
  stop** (see A1) 53×10px in size.
- `.rl-empty-meta` (`MOTOR FITMENT — HIGHFIELD · 3 NODES`) on the inspector
  wash = **2.51:1**.

This is one token, not fifty bugs. Lifting `--ink-faint` to ≥4.5:1 on white
(roughly `#5f7186` or darker) fixes all of the above at once. `--ink-soft`
`#4c617a` already measures **6.37:1** and is fine.

---

## A6 · The plate micro-labels on the navy canvas — measured against real pixels

The blueprint canvas paints with a `radial-gradient`, so a DOM-walk background
is wrong here. These were sampled from the **actual rendered pixels** of a
screenshot (canvas `getImageData`), 2px outside each text box, three sample
points each:

| Label | size | declared colour | measured bg | ratio |
|---|---|---|---|---|
| Start plate tag `RUN` | 8.5px | `rgb(159,176,200)` | `rgb(74,96,121)` | **2.94** |
| Start plate `Start · Highfield Inflatables` | 9px | `rgba(217,230,247,.6)` | `rgb(74,96,121)` | **2.94** |
| Match plate tag `FIT` | 8.5px | `rgb(240,131,111)` | `rgb(108,78,84)` | **2.87** |
| Output plate chip stamp | 8px | `rgb(111,157,240)` | `rgb(80,67,78)` | **3.44** |
| Start plate connective `walk every` | 10.5px | `rgba(217,230,247,.6)` | `rgb(36,60,85)` | **4.34** |
| Match plate entity stamp `Yamaha Outboards` | 9px | `rgb(240,131,111)` | `rgb(57,57,73)` | **4.41** |
| Match plate field name `HP Rating` | 10.5px | `rgb(217,230,247)` | `rgb(57,57,73)` | 8.95 ✓ |
| Match plate footer `no match → skip row` | 9.5px | `rgba(217,230,247,.6)` | `rgb(43,51,70)` | 4.68 ✓ |

The kind tags — `RUN`, `FIT`, the three-letter stamps that are the *only* thing
distinguishing one plate from another at a glance — are the worst two.
`access-flow-stage-open.png`.

---

## A7 · Not one heading on any working screen

`document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')`:

| Screen | headings |
|---|---|
| First-run landing | `H1: What's the name of your business?` ✓ |
| First-run industry | `H1: What does Keyboard Marine sell?` ✓ |
| The sheet | **0** |
| Column setup | **0** |
| Business rules pane | **0** — the words "What must always be true" are set at 30px but in a non-heading element |
| Flow builder rail | **0** |
| Flow stage (rule open) | **0** |
| Quotes | **0** |
| View page | `H1: Highfield - RU230KAM (HYP) WH`, `H2: NSM CUSTOM TRAILERS`, `H2: YAMAHA OUTBOARDS` ✓ |

The onboarding and the view page do it properly. Everything else gives a screen
reader no structure at all: no way to jump, no way to know what changed when a
stage opens. The view page also proves the pattern is already in the codebase.

Landmarks are thinner but present and mostly named: `HEADER` (unnamed),
`NAV "Tables"`, `MAIN "Sheet"`, plus `ASIDE "Highfield Inflatables rows"` /
`ASIDE "Rules"` per stage. Two problems with `MAIN`: it is **always named
"Sheet"** even when the sheet is not what is showing (it is named "Sheet" while
the view page, the column setup, the rules pane and the quotes list are open),
and the rules pane's three `SECTION` elements are unnamed except one
("Rules found in your price file").

---

## A8 · 66 controls below the 24px minimum target — including the two most destructive ones

Measured `getBoundingClientRect()` on every `button/select/input/a[href]`.
**Identical at 1280×800, 1440×900, 1920×1080 and 1024×768** — these are fixed
pixel sizes, not a squeeze.

| Control | size | count | where |
|---|---|---|---|
| `Move the column X up` / `down` | **20×17** and **20×18** | **62** | column setup, `.ds-arrow-btn`, two per column on all 31 columns |
| `Rename …` / `Delete …` a rule | **20×20** | 4 | rules rail |
| `DISCARD` a quote | **66×15** | 1 | quotes list |
| `CLEAR SHEET` | **88×21** | 1 | I/O panel |
| `is` (the operator select) | **21×27** | 1 | Business rules sentence — 21px *wide* |
| `React Flow attribution` | **53×10** | 1 | every screen |

`DISCARD` throws away a quote and `CLEAR SHEET` throws away the whole project.
Both are under 24px. (`DISCARD`'s contrast is fine — 6.37:1 measured.)
`access-column-setup.png`, `access-quotes.png`, `access-io-panel.png`.

The `ds-arrow-btn` pair also doubles the column setup's tab cost: **129 tab
stops** on that one stage, 62 of them 20px arrows.

---

## A9 · Text below 12px is the house style, not the exception

Distinct rules rendering text under 12px, in view, per screen:

| Screen | distinct <12px rules | smallest |
|---|---|---|
| The sheet | 13–14 | 8px (`React Flow`), 8.5px (`.react-flow__edge-text` — the BOAT/MOTOR/TRAILER edge labels) |
| View page | 25 | 8px |
| Column setup | 28 | 8.5px (`.ds-frow-band` band chips, `.ds-frow-level`) |
| Flow stage | — | 8px (`.rl-chip-stamp`), 8.5px (`.rl-node-tag`, `.rl-strip-hint`) |

Same at every viewport. This is the drawing-office voice and it is deliberate,
but it compounds A5 and A6 exactly: the smallest type in the app is also the
faintest.

---

## A10 · The view page's picked-rows grid is divs

`document.querySelectorAll('table, [role=grid], [role=table], [role=row], [role=columnheader], [role=gridcell]')` on the view page: **0**.

The Yamaha block reads `MOTOR | HP RATING | SHAFT LENGTH | DEALER LIST PRICE`
above a row `Yamaha - F4SMHA | 4 | 15 | $1,565` — visually a table, structurally
a stack of divs. A screen reader gets four labels and four numbers in a row with
no association between them.

The **rule results table is done properly** (174 rows, 8 `<th scope="col">`), so
again the pattern exists in the codebase. The row list itself is fine: buttons
carrying `aria-current="true"` on the selected row, and the search box has
`aria-label="Find a row of Highfield Inflatables"`.

---

## A11 · Nothing is announced when a stage opens, or when a view page changes

`[aria-live], [role=status], [role=alert]` count per screen:

| Screen | live regions |
|---|---|
| The sheet | 0 |
| View page | 0 |
| Business rules | 0 |
| Flow builder rail | 0 |
| Flow stage | 0 → **1** once RUN produces an answer (`polite`, `173 ROWS · 1 VIEW`) ✓ |
| Column setup | 1 ✓ |
| Quotes | 0 |

Combined with A4 (focus goes to `body`) and A7 (no headings), opening the view
page produces, for a screen reader, **no announcement, no focus move and no
heading to land on**. The only signal that anything happened is `aria-pressed`
flipping on a button the user has already left.

---

## A12 · At 1024×768 the flow canvas is 268px wide

Measured `.shell-flow-canvas`:

| viewport | canvas | inspector rail |
|---|---|---|
| 1280×800 | 524×698 | — |
| 1024×768 | **268×666** | 303 |

At 1024 the drawing is narrower than one plate: the Match plate is cut at the
right edge and the palette (which wraps to four rows) covers roughly the lower
third of what is left. `access-1024x768-flow-stage.png`. Nothing is *lost* — the
canvas pans — but the "drag or click" instruction is 8.5px at 2.96:1 in a 268px
window. This is the same arithmetic as the already-open **O6**, one size down.

The column setup at 1024×768 is fine: no overflow, no clipping, and the same 63
small targets. `access-1024x768-column-setup.png`.

---

## A13 · The I/O panel is `role="dialog"` but not modal, and Tab walks out of it

`<div class="io-pop" role="dialog" aria-label="Import / export">` — no
`aria-modal`, no scrim. Tab from `CLEAR SHEET` goes straight to `CREATE TABLE`
in the left panel behind it, with the panel still open and still covering the
screen. Escape closes it correctly and returns focus, so this is minor — but a
`role="dialog"` that a screen reader announces as a dialog, which then silently
leaks focus into the page behind, is a mismatch worth one line.

---

# THE TAB ORDER OF THE MAIN SCREEN

Recorded by pressing Tab 88 times from a fresh load and reading
`document.activeElement` after each press. 88 stops, then browser chrome, then
the cycle repeats.

| # | stop | matches visual order? |
|---|---|---|
| 0 | `BAYSIDE BOATS` (org name) | ✓ |
| 1 | `I/O` | ✓ |
| 2 | `CREATE TABLE` | ✓ |
| 3–9 | Boats · Motors · Trailers · Accessories · Packages · Dealers · Custom table | ✓ |
| 10–12 | Quotes we have made · Work out what fits what · Business rules | ✓ |
| 13–33 | the 21 table buttons, in panel order (boats, motors, trailers, accessories, relationships) | ✓ — and each one scrolls itself into view |
| 34–41 | **8 React Flow edges**, no focus ring, named by internal node id | ✗ — the wires come before the things they join |
| 42–83 | the 21 tables on the canvas, **two stops each** (wrapper with no ring, then button with ring) | ✗ — see below |
| 84–86 | Zoom In · Zoom Out · Fit every table to the view | ✓ |
| 87 | React Flow attribution | ✓ (last, 53×10px, 1.05:1) |

**The left panel matches visual order exactly.** The canvas does not. Node
order follows the store's array, not the drawing: measured `y` of the first five
canvas stops was **567 → 690 → 322 → 690 → 77** (Parts & Accessories → Stacer ×
Yamaha → Stacer Trailers → Highfield × NSM → Jeanneau). A sighted keyboard user
watching the ring appear-and-vanish will see it jump the length of the sheet and
back, twice per table.

**When a table is selected**, its two doors are inserted directly after it in
the tab order and both scroll into view when focused — measured y=448 (h=29) and
y=485 (h=45), both fully on screen. **The keyboard path to the column-setup door
is not affected by O11**; O11 is a mouse-and-eyes problem only.

---

# THE FIRST-RUN JOURNEY, KEYBOARD ONLY

Run in a clean context. Every step done with Tab / typing / Enter.

1. Land. Focus is already in the business-name input (named "Business name"),
   `H1` present, 0 console errors. **No focus ring** (A2). `CONTINUE` is
   `disabled` until a name is typed, so it is not in the tab order — the only
   keyboard path forward is Enter, which works.
2. Type, Enter → industry screen. `H1: What does Keyboard Marine sell?`. Two
   tab stops: `BACK` (74×32) and `MARINE` (262×194), both with rings. The three
   greyed industries are correctly not focusable. Focus after the transition:
   `BODY`.
3. Enter on MARINE → empty sheet. Focus: `BODY`.
4. **15 Tab presses** to reach "Load a worked example", and it is the *last*
   stop — after the seven table-type chips, the three zoom buttons and the
   React Flow attribution link:
   `KEYBOARD MARINE > I/O > Boats > Motors > Trailers > Accessories > Packages >
   Dealers > Custom table > Zoom In > Zoom Out > Fit every table to the view >
   React Flow attribution > CREATE YOUR FIRST TABLE > Load a worked example`
5. Enter → **21 tables load**. 2 console errors (the image probes). Focus: `BODY`.

**Verdict: a keyboard user can get from a fresh load to a loaded sheet.** They
can open a view page, a rule pane and a quote. What they cannot do is tell where
they are (A2), get out with Escape (A3), or cross a stage boundary without
walking 54 invisible stops (A1).

---

# WHAT WAS NOT TESTED

- **Screen reader output was not heard.** Everything above is the accessibility
  *tree* and computed styles, read programmatically. NVDA/JAWS/VoiceOver were
  not run.
- **Windows High Contrast mode / forced-colors** — not tested.
- **`prefers-reduced-motion`** — not tested. The app uses `motion` throughout.
- **Zoom to 200%** (WCAG 1.4.4) — not tested; only the four viewport widths in
  the brief.
- **Keyboard operation of the flow builder's drag interactions** — the palette
  *click* path was exercised; drag was not (this is the standing **O7**).
- **Escape on the flow stage and the column setup was inferred from the shell
  control they share with the view page**, not separately re-measured after the
  view-page result. Treat those two rows of the A3 table as *not verified*.
- **Colour-alone encoding**: the candidates I checked are all clean (selected
  table has `aria-current`, the ✓ has an `aria-label`, the 8×8 rule dot is
  `aria-hidden`, the edge labels carry text, the left-panel icons are
  `aria-hidden` under text group headings). I did **not** find a case of
  colour-alone — but I did not exhaust every state, and quote status (`Draft`)
  was only ever seen in one state, so I cannot say whether Draft/Sent differ by
  more than colour.
- The **Quotes** stage was audited with a single quote in the list.

---

# THE SHORT LIST

If only three things get fixed:

1. **Make the sheet inert when a stage covers it** (`inert` on `.wb-canvas`, or
   unmount it). One attribute removes 54 phantom tab stops, 29 ringless focus
   states and 53 of the 74 presses in A1.
2. **Change one token.** `--ink-faint: #8598ad` → anything ≥ 4.5:1 on white.
   218 uses, 20 files, every micro-label in the app.
3. **Give focus somewhere to land.** An `h1` per stage, focus moved to it when
   the stage opens, and Escape wired to "BACK TO THE SHEET" — the same three
   things the view page and the I/O panel already do correctly, applied
   everywhere else.
