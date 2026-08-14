# AUDIT — INFORMATION ARCHITECTURE

**Lens:** what the app asks a person to hold in their head, and whether the
structure earns it.

**Persona:** a boat dealer's sales manager. Never seen the app, reads nothing.

**Conditions.** Dev server on `localhost:5090` (it was **not** running when this
pass started — `ERR_CONNECTION_REFUSED`; started with `npm run dev`, port 5090
per `vite.config.ts`). Chromium at **1280×800**, re-checked at 1920×1080.
Persisted state from earlier sessions: Northside Marine, 21 tables, 651 rows,
3 quotes. Every number below is `getBoundingClientRect()` on the live page or a
`file:line` in the repo.

**Read first:** `CLUELESS_USER_TESTS.md` in full. Nothing below repeats a FIXED
finding as new. Where a finding sharpens an OPEN one (O4, O5, O11, O12) it says
so and gives a new measurement.

**What I did not test.** The cold onboarding path (`Onboarding` → industry →
empty sheet): reaching it requires CLEAR SHEET, which would destroy the user's
project. Read from code only, marked as such. Drag gestures: not tested (same
limit as O7). Quote editor persistence across a stage switch: **not tested**.

---

## THE RANKED FINDINGS

Ranked by how early they stop someone.

---

### IA-1 · At 1280×800, **0 of 21 tables** show both of their doors, and selecting a table does not scroll them into view. This is the app.

**What I did.** Landed cold at 1280×800, panel at rest (`scrollTop === 0`).
Clicked the first table in the list, FORMOSA. Then, separately, clicked the
**Highfield Inflatables card on the sheet** — the most natural gesture in the
product, since the card is 300px wide and right there.

**What I expected.** The thing I clicked to tell me what I can do with it.

**What happened.**

| gesture | selected row top | door 1 | door 2 | panel scrolled? |
|---|---|---|---|---|
| click FORMOSA in the panel | 704 | **741–770** ✓ | **778–823** ✗ cut | no (`scrollTop 0`) |
| click the Highfield card on the sheet | 774 | **812–841** ✗ | **849–894** ✗ | no (`scrollTop 0`) |

Viewport height is 800. Swept every row with the panel at rest: a row is 35px
and the door pair is 82px, so a row must sit at y ≤ 683 for both doors to land
on screen. The first row of the list is at **y = 704**.

> **anyFullyVisible: 0 — of 21.**

At 1920×1080 the same doors measure 812 / 849 and are fully visible. **The
failure is exact to the laptop size the acceptance log mandates as the default
test size** (`CLUELESS_USER_TESTS.md` rule 4).

Evidence: `information-architecture-2-first-table-doors.png` (FORMOSA — door 2
reads "What is each column allowed to" and stops at the fold),
`information-architecture-3-sheet-click-doors-offscreen.png` (Highfield selected
from the sheet — the highlighted row is the last thing on screen and there is
nothing below it).

**Why this outranks everything else.** The view page, the column setup, the
quote — every one of the four finished features behind those two doors — is
reached through this and nothing else. A person clicks a boat table, the camera
moves on the sheet, and **the panel does not visibly change at all**. They have
been answered "nothing happened". `LeftPanel.tsx` draws no caret, no chevron and
no mark on the row itself to say more is underneath.

**Relationship to O11.** O11 measured "16 of 17 tables, door at y=849". This
pass measures **21 of 21**, from two different entry gestures, and adds the one
O11 did not: the sheet-click route lands the doors 49px further down still. The
fix O11 names (one `scrollIntoView({ block: 'nearest' })` on select) is still
un-applied. **Nothing else in this report matters until this does.**

---

### IA-2 · The panel spends 82% of its resting height on things that are not your tables. That is the cause of IA-1.

**Measured**, `.shell-panel` children at 1280×800 (panel 56 → 800, 744px tall):

| block | height | what it is |
|---|---|---|
| `.tk-rail` (CREATE TABLE + 7 table types) | **371px** | used once per table you ever create |
| 3 × `.shell-panel-rules` doors | **193px** (49+64+64, incl. gaps) | Quotes · What fits what · Business rules |
| `.shell-panel-head` (TABLES · 21) | 47px | a count |
| **first table row** | at y=**704** | the thing you came for |

`scrollHeight` 1609 against `clientHeight` 744.

A permanent 371px palette of seven table *types* — for an app whose seeded
reality is 21 tables that already exist — sits above the list of those 21
tables, on every screen, forever. The one thing a sales manager navigates by is
the last thing on the panel and the first thing off the bottom of it.

This is not a styling complaint; it is the arithmetic behind IA-1. Fold the type
rail behind CREATE TABLE and the door problem disappears without touching
`scrollIntoView` at all.

---

### IA-3 · Renaming a column **on the sheet** still silently breaks every calculation that names it. F25 fixed one of the two places columns are renamed.

**Code-verified, not exercised** (the seeded set has no `type: 'formula'`
column, so the break is latent — grep of `src/demos/northside.ts` for
`type: 'formula'`: no matches).

The mechanism F25 documents is unchanged: `src/lib/formula/index.ts:117`
resolves references by name — `byName.get(norm(name))`, `norm` being
`name.trim().toLowerCase()` (l.66) — and an unresolved one becomes
`Unknown field [name]` (l.119).

There are two rename surfaces:

| where | gesture | what it calls | rewrites formulas? |
|---|---|---|---|
| column setup (design stage) | open the row, edit COLUMN NAME | `FieldRow.tsx:143` → `renameFieldRefs(...)` | **yes** — F25 |
| **the sheet, in the table** | **one click on the column header** | `useColumnCommands.ts:184` → `updateField(entityId, fieldId, { name: want })` | **no** |

`Grid.tsx:980-984` — the header is a `<button>` whose `onClick` calls
`startRename(f.id, f.name)`, and its own `title` advertises it:
*"…Click to rename."*

`grep -rn renameFieldRefs src` returns exactly one production call site:
`src/features/designer/FieldRow.tsx:143`.

**So the cheapest gesture in the app — one click, no dialog, advertised in a
tooltip — is the one that carries the defect F25 declared closed.** A person who
writes a calculated column and later tidies a column name from the sheet gets
the F25 outcome in full: no dialog, no mark, no note, broken across a reload.

---

### IA-4 · The same delete, in two places, with two different warnings — and the easier gesture carries the weaker one.

| where | how you get there | what it says before it destroys |
|---|---|---|
| the sheet | header ⌄ menu → **Remove column** | `ColumnMenu.tsx:103-105`: *"Every value in this column leaves with it. There is no undo."* Then `useColumnCommands.ts:193` calls `removeField` directly. **No dependency check of any kind.** |
| column setup | door → open the row → × | `FieldRow.tsx:501-515` → `DeleteSheet` with `readers`, `rules`, `groupLevel` — the F26 work: which calculations read it, which grouping drawer goes, which rules break |

F26's whole argument is *"the warning belongs before the act"*. It does — on one
of the two surfaces. The surface a person reaches in one click from the data
they are looking at is the unguarded one.

**The split between "columns are edited in the table" and "columns are edited in
column setup" is not principled.** `Shell.tsx:26-29` states the intent —
*"Columns are edited in the table, by the table module"* — but the design stage
exists precisely because the table cannot retype, reorder, re-point or default a
column. A person cannot predict which of the two holds the operation they want,
because the division is by *implementation module*, not by any distinction they
could name. Ask a sales manager where "delete this column" lives and both
answers are right.

**What a person would predict:** one place. If two must exist, the sheet should
own *reversible* acts (sort, narrow, widen, rename-with-repair) and the setup
door should own every *irreversible* one — with the sheet's menu offering
"Remove column…" as a link that opens the setup sheet, not a second dialog with
less in it.

---

### IA-5 · Two engines answer "which motors fit this boat", and neither can hand its answer to the other.

The headline question this product exists for is answered in two unconnected
places, and O4 understates it — this is not two authoring surfaces for one
result, it is **two results**.

**Engine A — "Work out what fits what".** The seeded rule is
`start → match → output` (`src/demos/northside.ts:2362-2371`). The terminal node
is `kind: 'output'`, which produces a *result set* drawn in
`RuleResultsRail`. It writes nothing. `applyEffects` in `RuleResultsRail.tsx:177`
commits `action`-node effects; the seeded rules have no action node, so there
are none to commit.

**Engine B — the view page.** `YAMAHA OUTBOARDS · 3 PICKED` on the Highfield
page is read from the join table through `features/views/pairs.ts`. It has its
own rule editor, `features/views/RuleOffer.tsx`, and its own vocabulary
(`RULE  Show only the Yamaha Outboards you pick` · `FILTER` · `REMOVE`) —
screenshot `information-architecture-6-view-setup-mode.png`.

**The consequence.** A person opens "Work out what fits what", runs
`Motor fitment — Highfield`, and receives a table of matches. There is no
control anywhere in that stage that turns those matches into the picks on the
boat's page, into the join table, or onto a quote. The answer is a printout. To
get the same information onto a quote they must go to the other surface and do
the work again, by hand, per row.

Both stages now name the other in prose — `RulesStage`'s aside, `FlowStage.tsx`
l.189-192, the RulesPane's *"To work out what goes with something, use Work out
what fits what on the left"* (screenshot `-4-business-rules.png`). That is a
real improvement on F19 and it fixes the *choosing*. It does not fix the
*joining*: after choosing correctly, the two halves of the job still do not
meet.

**Not verified:** whether an `action` node can be configured to write into the
join table the view page reads. If it can, the finding narrows to "the seeded
rules do not do it and nothing suggests it"; if it cannot, the split is
structural. Worth one code read by whoever owns `features/rules/effects.ts`.

---

### IA-6 · The only sentence that explains how to make a quote lives on a screen you can reach only by deleting your last quote.

- `LeftPanel.tsx:191` — the Quotes door is drawn only when `quoteCount > 0`.
- `QuoteList.tsx:34-35` — the empty-state copy: *"No quotes yet. Open a table,
  press **What goes with each one?**, pick one and press **Quote this one**."*

That sentence is the app's one piece of instruction for its highest-value
workflow. It renders only when the list is empty; the list can only be opened
from a door that only exists when the list is **not** empty. The single path to
it is: make a quote, open the list, DISCARD the last one, and read the sentence
that tells you how to make the one you just deleted.

**Read from code, not exercised** — running it would destroy one of the user's
three quotes.

The reasoning in `LeftPanel.tsx:171-190` for hiding an empty door is sound and I
would not reverse it. The bug is that the instruction was put behind the same
gate as the list. It belongs on the view page's own bar, or nowhere.

---

### IA-7 · Scrolling to the price takes the boat's name off the screen.

**What I did.** Clicked the Highfield plate on the sheet (camera walks in),
pressed **EXPAND**, pressed the **HULL ONLY PRICING** chip in the SECTIONS
strip. Four clicks from the sheet — a good number.

**What happened.** The pricing columns arrive: `CASH · TRADE · WARRANTY`, real
numbers, editable. And the `VARIANT` column has scrolled away with everything
else. The only frozen column is the ordinal (`01 … 09`). Rows 04–09 of
`MODEL SP560` — 15 variants that differ only by hull material and colourway —
read as six identical rows of `48350 / 45932 / 32166` with nothing to tell them
apart. Screenshot `information-architecture-13-price-band.png`.

Measured on the same card: the grid scroller is `scrollWidth 4432` inside
`clientWidth 509` — **11.5% of the table visible at once**, 31 columns in
7 bands (`Identity 11 · Capacity 3 · Construction 2 · Cost Build 5 ·
Motor Envelope 4 · Hull Only Pricing 3 · Source 1`).

The band strip is a good instrument and it works. What is missing is the one
thing that makes horizontal scrolling survivable in every spreadsheet ever
made: the naming column pinned to the left. The app already knows which column
names a row — the column setup calls it *"which column names a row"* and the
view rail uses it for `rowLabel`.

**This is the most common job in the product** (a price file is a thing whose
prices change) and it is the one where the app puts a number in front of you
without telling you whose number it is.

---

### IA-8 · One label, two behaviours, 40px apart.

Both of these are uppercase mono chips reading `HULL ONLY PRICING 3`, in the
same ink, on the same card:

| element | `title` |
|---|---|
| `.tb-strip-chip` (SECTIONS strip, y≈165) | *"Hull Only Pricing — 3 columns. Click to **scroll to them**."* |
| `.tb-band-btn` (spanning header over the grid, y≈188) | *"Hull Only Pricing — 3 columns. Click to **fold them away**."* |

Identical wording, identical styling, adjacent, opposite outcomes — one brings
columns *in*, one takes them *out*. Verified by Playwright strict-mode conflict:
one selector matched three buttons with those two different `aria-label`s.

A person who learns the chip by pressing it once has learned the wrong thing
half the time.

---

### IA-9 · There is no place. Reload and you are back at the start of the app.

**What I did.** Selected Highfield, opened "What goes with each one?", confirmed
the stage was open (`.shell-view-what` read *"Highfield Inflatables · what goes
with each one"*), then reloaded.

**What happened.** `stage: "NO STAGE — on the sheet"`, `selected: "nothing
selected"`, `url: "http://localhost:5090/"` — unchanged, as it was before the
reload and as it will be for every screen in the app.

`grep -rn "pushState|history\.|useSearchParams|location.hash" src` → **zero
hits.** `Shell.tsx:1-6` states this deliberately: *"There is no router, no URL
and no third state."*

The consequences a person will meet without being warned:

- **Refresh loses your place.** Any crash, any reload, any accidental F5, and
  the person who was three levels into a quote is on the blueprint with nothing
  selected. Their *data* survives (IndexedDB). Their *position* never does.
- **The browser Back button leaves the app.** It is the single most-pressed
  control on the internet and here it is an exit, not a step back. From the
  quote stage a person who wants "back to the list" and presses Back is gone.
- **Nothing can be sent to anybody.** "Have a look at the Highfield page" is not
  a link; it is a set of instructions.

The single-`stage` state machine (`Shell.tsx:98-103`) is genuinely well-made —
one nullable value, subject-checked, impossible to draw two stages at once. It
just is not addressable, and it is not remembered.

---

### IA-10 · What is missing entirely.

| a person looks for | is it there | evidence |
|---|---|---|
| **Undo** | **No.** `grep -rn "undo" src` finds only prose telling you there is none — `ConfirmSheet.tsx:4`, `ColumnMenu.tsx:105`, `FlowStage.tsx:347`, `demoLoad.ts:61`. Four destructive acts are gated and each closes by admitting it. | confirms O12 |
| **Search across everything** | **No.** Three search boxes exist, all scoped: `ViewStage.tsx:190` "Find one" (rows of one table), `TableToolbar.tsx:95` "Search rows…" (inside FOCUS only), `FilterMenu.tsx:184` (one column). There is no way to type "SP560" and be shown where it lives. With 21 tables and 651 rows, finding a boat means already knowing which of the 21 tables holds it. | measured: those 4 are every `placeholder=` in `src/app`, `whiteboard`, `table` |
| **Help / what is this** | **No.** No help door, no first-run tour, no "?" anywhere on the masthead. The teaching is done entirely by the copy in place — which is good copy, and is the right instinct, but it means anything below the fold (IA-1) teaches nobody. | `TopBar.tsx` carries the mark, the org name, the industry stamp, and I/O. That is all. |
| **A way back to a known-good state** | **Only by having thought of it first.** SAVE A COPY lives behind a masthead control labelled **`I/O`**, whose popover is headed *"DOCUMENT CONTROL"*. Screenshot `information-architecture-10-io-menu.png`. A sales manager does not press `I/O`. Nothing anywhere prompts an export, and O12 already names the gap: the four confirm sheets say *"This app has no undo"* at the exact moment an export would help, and do not offer one. | measured |
| **Keyboard shortcuts, discoverable** | **Effectively no.** `Shell.tsx:30-35` binds nothing globally, deliberately and correctly. Escape closes the FOCUS lens (`TableFocusOverlay.tsx:61`, and its Close button's `title` says "(Esc)" — the only shortcut advertised anywhere). Enter/Escape in cells and inline edits behave, unadvertised. | read |
| **A door to the reviewer** | **No** — `src/features/review`, unchanged. | O8, still open |
| **A door to `src/app`'s own dead shell** | `CheckStamp.tsx` (62), `Rails.tsx` (343), `Inspector.tsx` (206), `ViewSwitch.tsx` (96) — **707 lines imported by nothing.** `ViewSwitch.tsx:1` says so in its header. | `grep` for each import: no hits outside themselves |

---

## THE CONCEPTS — everything a person must learn to be useful

25 of them. **Taught** = the app names it and says what it is, on screen, where
you meet it. **Shown** = the app demonstrates it without naming it (often the
best outcome). **Assumed** = you are expected to arrive knowing.

| # | concept | status | where, and the honest note |
|---|---|---|---|
| 1 | organisation / business name | **taught** | `Onboarding.tsx:74` — "What's the name of your business?" |
| 2 | industry | **taught** | `Onboarding.tsx:151` — four cards, three stamped COMING SOON |
| 3 | **the sheet** | **assumed** | Never introduced. Its only name is in five identical *"Back to the sheet"* buttons — so you learn what it is called only after leaving it |
| 4 | table | **taught** | CREATE TABLE · TABLE TYPES · TABLES 21 |
| 5 | table *kind* (7 of them) | **taught** | The type rail names all seven; the new-table dialog's question 1 |
| 6 | kind vs table (a `boat` table is one *brand*) | **assumed** | The load-bearing idea of the whole model (`CONFIGURATOR_SPEC` §3-zero) and nothing on screen says it. The panel groups 7 tables under `BOATS 07` and leaves the reader to infer why Stacer and Formosa are separate tables |
| 7 | join / link table | **taught, well** | Grouped last as `Relationships`, different glyph, *"What goes with what — not things you sell."*, and F18's sentence on select |
| 8 | structure / hierarchy | **shown** | Question 2 of the dialog, with a live preview. Good |
| 9 | *level* as an editable, per-table, renameable thing | **taught at creation, hidden after** | `NewTableDialog.tsx:14-21` — plates are text fields, × removes, + LEVEL adds. Afterwards it is in the column setup under a `GROUPS` stamp, behind the door of IA-1 |
| 10 | level *value* as a drawer (`SERIES ADVENTURE · 3 VARIANTS`) | **shown** | The grid draws it plainly |
| 11 | row, and its per-table noun ("40 VARIANTS", "+ MODEL") | **shown, very well** | The app never says "record" |
| 12 | column | **taught** | |
| 13 | column *type* (7 kinds) | **taught** | Add-column popover, plain-language list |
| 14 | **UID / system column** | **taught but costly** | Locked, mono, tooltipped. It is also **column one of every table**, so the first thing a dealer sees in their own price file is 40 rows of `-Fw1HmnrmX`. Mandated by `UX_REWORK.md` §8b, so this is a spec decision, not a defect — but the cost is column one of the most valuable screen in the app |
| 15 | section / band | **shown** | SECTIONS strip + spanning headers. F16 and F28 fixed the legibility and the legend |
| 16 | calculated column / formula | **assumed** | A `TXT`-style tag and an expression box. Nothing says what a formula is or that `[Square brackets]` name a column |
| 17 | required / default value | **assumed** | Two controls in the column setup with no explanation |
| 18 | link column, and re-pointing one | **assumed** | |
| 19 | the **view page** | **shown, as a question** | "What goes with each one?" — the best-named thing in the app. It has no noun, which is right, and it means the QuoteList instruction (IA-6) has to quote the button verbatim |
| 20 | **block** (a table's box on the view page) | **shown** | The word never reaches the user. Correct |
| 21 | **pick** vs **fit** | **not distinguished** | The same page shows `NSM CUSTOM TRAILERS 0 PICKED`, `YAMAHA OUTBOARDS 3 PICKED` and `PARTS & ACCESSORIES 26 FIT` (screenshot `-5-view-page.png`). Two different truths — a hand-made choice and a derived answer — separated by one word in 8.5px mono, with no legend. A person cannot tell which lists they are responsible for |
| 22 | **star / recommended** | **assumed** | `BlockCard.tsx:574` — a filled star with `title="Recommended"`. A tooltip is not an answer to someone who does not know there is a question (F28's own words) |
| 23 | **scope — "CHANGES APPLY TO: This variant only"** | **taught** | `-6-view-setup-mode.png`. One good sentence under it. But it is the single most consequential control on the page and it appears only in SET UP mode |
| 24 | **rule — three different things with one word** | **partly** | see below |
| 25 | quote | **taught** | |
| 26 | **price level / rung** (Cash · Trade · Warranty) | **assumed** | `QuoteEditor.tsx:119` a quote-wide `role="group" aria-label="Price level"` **and** l.597 a per-line override *"Which price on this line"*. Two nested controls for the same idea, no explanation of what a rung is |
| 27 | flow vocabulary — node, step, plate, `RUN FIT IF WHR LNK LOOP DO OUT`, result set, effects, "apply writes" | **assumed** | The palette's own heading is **NODES** (`-8-flow-rule-open.png`). Eight three-letter codes nobody is taught |

**The word "rule" means three unrelated things**, in three surfaces, all
reachable in one click of each other:

1. **Business rules** — a constraint sentence every row must keep.
2. **Work out what fits what** — a graph that derives a list of matches.
3. **RULE, on a view block** — *"Show only the Yamaha Outboards you pick"*, sitting beside a control called **FILTER**.

The first two now name each other in prose and that is a real fix (F19, and
`FlowStage.tsx:189`). **The third is not named by either of them and does not
name them.** A person who has been told twice that rules live in the panel then
meets a button called RULE inside a page, doing a third thing.

The word **"filter"** likewise means three things: a view-block FILTER, a
column's *"Show only some…"*, and the flow palette's `WHR / Filter`.

---

## THE DOORS — every entry point, and whether its label predicts what is behind it

| # | door | where | opens | does the label predict it? |
|---|---|---|---|---|
| 1 | **CREATE TABLE** | panel, top | new-table dialog | yes |
| 2 | 7 **table type** chips | panel rail | drag → sheet, or click → place | yes, and the hint line says both |
| 3 | **Quotes we have made** · *N made so far* | panel | quote list | yes. Only drawn when N > 0 — see IA-6 |
| 4 | **Work out what fits what** · *walk every row, collect the matches* | panel | flow builder | yes for the job; the stage behind it then says NODES · FIT · WHR · LNK |
| 5 | **Business rules** · *limits every row must keep* | panel | sentence rules | yes, since F19's rewrite |
| 6 | **a table row** | panel | aims the sheet + **reveals doors 7 & 8** | **no.** Nothing on the row says anything is underneath, and at 1280×800 nothing visibly appears — IA-1 |
| 7 | **What goes with each one?** | under a selected table | view page | yes — the best label in the app |
| 8 | **What is each column allowed to hold?** | under a selected table | column setup | yes |
| 9 | **the LOD plate** (a whole table card at low zoom) | sheet | walks the camera in | `title="…click to open this table"` — but the plate has no visible verb on it |
| 10 | **EXPAND** | table card footer | resizes the card to the window | partly — "expand" could mean four things |
| 11 | **FOCUS** | table card footer | full-window workspace, **portalled to `<body>`**, the only place with row search | **no.** "Focus" names nothing a dealer wants; and this is where the search box lives |
| 12 | **SET UP** ⚙ | view page, top right | grows handles on the page in place | yes, and the mechanism (never leave the page) is excellent |
| 13 | **QUOTE THIS ONE** | view page bar | mints a quote and opens it | yes |
| 14 | **All quotes** | quote document bar | back to the list | yes |
| 15 | **I/O** | masthead | *Document control*: save a copy · open a copy · CLEAR SHEET | **no — this is the door a person would never press.** Two characters of engineering abbreviation, in the corner, hiding the app's only backup, its only import, and its only total reset. In an app with no undo (O12) this is the emergency exit, labelled in a language the persona does not read |
| 16 | **the organisation name** | masthead | inline rename | `title="Click to rename"` only |
| 17 | **a column header** | in any table | inline rename | `title` says so — and see IA-3 |
| 18 | **the ⌄ on a column** | in any table | sort · narrow · **remove column** | partly; the destructive item is in a menu whose first two items are harmless |
| 19 | **a band chip** | SECTIONS strip | scrolls to those columns | see IA-8 |
| 20 | **a band header** | over the grid | folds those columns away | see IA-8 |

**The door a person would never press: `I/O`** (#15). Everything else has at
least a plain-English sentence on it. This one has neither a word nor a picture
a sales manager can act on, and behind it sits the only recovery the product
has.

**Runners-up:** **FOCUS** (#11) — the row-search box, the fill handle and the
row commands live behind a word that means nothing in this domain; and the
**table row** (#6), which is a door that does not look like one.

---

## DEPTH — minimum clicks from a fresh load, read from the code and walked

"Fresh load" = the returning dealer's state: Northside loaded, sheet fitted at
zoom 0.279, panel at rest, 1280×800. Scroll gestures are counted separately
because they are the ones nothing prompts.

| # | outcome | shortest path | clicks | scrolls | verdict |
|---|---|---|---|---|---|
| 1 | **Find a boat** (SP560, a named variant) | plate on the sheet → **FOCUS** → search box → type | **3** | 0 | *Acceptable* — but you must already know that (a) the right one of 21 plates is Highfield's and (b) FOCUS is where search is. There is no global search (IA-10). The panel route is strictly longer and does not open the table at all |
| 2 | **See what fits it** | scroll panel → table row → **scroll again** → *What goes with each one?* → row in the rail | **3** | **2** | **Too many, and the second scroll is invisible** — IA-1. Honest shortest: 2 clicks, if selecting a table scrolled its doors into view. There is no route from the sheet |
| 3 | **Change a price** | plate → EXPAND → HULL ONLY PRICING chip → cell → type | **4** | 0 | *Acceptable count, wrong outcome* — the row's name is gone by step 3 (IA-7). The panel offers **no route to the data at all**: neither of a table's two doors is "edit the rows" |
| 4 | **Write a rule** (a constraint) | *Business rules* → change the "looks at" select → pick a column → operator → value → ADD RULE | **2** to add the pre-filled example; **~6** for a real one | 0 | *Good.* The sentence pattern is the strongest interaction in the product. The pre-fill is `When Standard is yes, Recommended must be yes` — two columns of a **join** table, which is a strange first sentence to show a boat dealer |
| 5 | **Quote a customer** | scroll → table row → scroll → *What goes with each one?* → row → **Quote this one** | **4** | **2** | *Right shape, gated by IA-1.* Once past the doors, minting is one press from the configured page, which is exactly correct |

**Which are too many, and the shortest honest path:**

- **#2 and #5 are gated by the same two invisible scrolls.** Both become
  2 and 3 clicks the moment a selected table's doors are scrolled into view.
  This is the single highest-leverage change in the report.
- **#3 has no door.** The panel is the app's only navigation and it cannot get
  you to a price. The shortest honest path would put a third line under a
  selected table — *"Open the rows"* — next to the two that already exist.
- **#1 needs a search box that is not inside a table.** One field on the
  masthead, matching row labels across all 21 tables, removes the requirement to
  know which table a boat lives in — the one piece of knowledge the app most
  assumes and least teaches (concept #6).

---

## MODE COLLISIONS

**The five stages are sound, and this deserves saying plainly.** `Shell.tsx`
holds one nullable `stage` (l.98-122), so opening anything closes everything
else *because there is nowhere for the old value to live*. Every stage checks
its own subject and the two that name a table are re-checked in the shell
(l.128-139), so a deleted table closes its page and un-lights its door in the
same frame. Every stage carries **Back to the sheet**, top-left, always. Every
stage stops `keydown` at its root (F22). I found **no state in which a person is
stuck, and no state from which they cannot get back.**

Three real observations remain:

**MC-1 · There is a sixth full-window surface, and it is not in the state
machine.** `TableFocusOverlay.tsx:46` renders through `createPortal(…,
document.body)` with `role="dialog" aria-modal="true"`, driven by
`focusedTableEntity` in `features/table/tableCanvasState.ts` — a module-level
store the shell does not read. The shell's stated invariant ("there is exactly
ONE STAGE") is true of five of the six things that can cover the screen. It
cannot *collide* by clicking, because the lens covers the panel that would open
a stage — but it means the panel, the masthead and I/O are all unreachable from
inside it, and closing it is `Close` / `Escape` rather than the *Back to the
sheet* every other surface uses. **Not tested:** whether a stage and the focus
lens can be open simultaneously via a store swap or an import.

**MC-2 · Two vocabularies for leaving, four verbs for size.**
Leaving: *Back to the sheet* (5 stages) · *Close* (focus lens).
Size, all on one table: **click the plate** (walk the camera in) · **EXPAND**
(resize the card) · **FOCUS** (full window) · **FIT** (frame everything). Four
controls, four different words, one underlying question — "let me see more of
this". None of them says what it will do to the other three.

**MC-3 · Work that is dropped on a stage switch, by design.** `ViewStage` and
`DesignStage` are keyed on `entityId` (`Shell.tsx:212, 225`), so switching
tables remounts them: SET UP mode, the rail's search word and the open accordion
row all reset. The reasoning in the comment is good and I agree with it. Worth
knowing that a person mid-configuration who clicks another table in the panel
loses their SET UP handles with no warning — the picks themselves are in the
store and survive. **Quote-editor state across a stage switch: not tested.**

---

## WHERE THE SAME JOB IS IN TWO PLACES

| job | places | principled? | what a person would predict |
|---|---|---|---|
| **rules** | 3: sentence constraints · flow builder · a view block's own RULE | **partly.** 1 and 2 are genuinely different jobs (a limit vs a derivation) and now name each other. **3 names neither and is named by neither** | One place. Failing that, the two that share a word should share a home; the block-level one should be called something else entirely |
| **which motors fit this boat** | 2 engines, no bridge — **IA-5** | **no, accidental** | That running the rule changes what the page shows. It does not |
| **columns** | 2: the table (add, rename, remove, sort, narrow, choices) · column setup (retype, reorder, require, default, re-point, calculate, rename **with repair**, delete **with impact**) | **no, accidental** — split by module, not by any distinction a user could name. And it is **dangerous**: the easy surface holds the unguarded rename (IA-3) and the unguarded delete (IA-4) | One place. If two, the sheet should own reversible acts and hand every irreversible one to the setup sheet |
| **pictures** | **1 editor, 3 read-only surfaces** — `ImageCell` edits; `views/pictures.tsx:5-8` and `quote/photo.tsx` are read-only and say so | **yes — principled, and the best-argued split in the codebase.** The brief's premise that pictures are edited in two places no longer holds | Exactly what happens |
| **filter** | 3 controls called Filter / *Show only some…* / `WHR` | accidental naming collision | — |
| **delete a row** | table row commands · view page `×` (removes a *pick*, not a row) | fine, different objects — but both are `×` | — |

---

## TESTING NOTES — not app faults

1. **The dev server was not running** when this pass began (`5090`
   `ERR_CONNECTION_REFUSED`); a stray listener was on `5040`. Started with
   `npm run dev`.
2. **Writing screenshots into `docs/audit/screens/` is inside Vite's watch
   root** and appears to trigger full page reloads — the console shows the React
   mount banner more than once. Suspected, not proven.
3. **The browser is shared.** Twice, app state changed with no input from me:
   an open rule closed itself, and later a **design stage I never opened** was on
   screen with a column row expanded (`information-architecture-15-unexpected-
   design-stage.png`). Almost certainly a parallel audit driving the same
   Playwright instance. Every measurement in this report was taken in the same
   tool call as the action that caused it, or read from source. **Whoever runs
   these passes in parallel should give each one its own browser context** — and
   O10's warning should be widened to say so.

---

## STILL OPEN FROM THE LOG, RE-VERIFIED THIS PASS

- **O4** — improved but not closed. Both rule stages now name the other in
  prose. The *third* rule surface (view blocks) still names neither, and the two
  fitment engines still cannot exchange an answer (**IA-5**).
- **O5** — unchanged. `src/types/model.ts:856` *"walks each row of the chosen
  **entity**"* and l.862 *"the rows of another **entity**"* are on every palette
  tooltip; `src/lib/rules/validate.ts:97` *"The **entity** this rule runs against
  no longer exists"*.
- **O8** — unchanged. `src/features/review` still has no door. Add to it 707
  lines of `src/app` mounted by nothing: `Rails.tsx`, `Inspector.tsx`,
  `CheckStamp.tsx`, `ViewSwitch.tsx`.
- **O11** — **worse and now total: 21 of 21, from two entry gestures.** See
  **IA-1**.
- **O12** — unchanged, and now with a second half: the export that is the only
  recovery is behind a door labelled `I/O` (**IA-10**).

---

## SCREENSHOTS

| file | what it shows |
|---|---|
| `information-architecture-1-landing.png` | 1280×800 at rest: 21 plates, the panel with its 371px type rail |
| `information-architecture-2-first-table-doors.png` | the **first** table selected — door 2 cut at the fold |
| `information-architecture-3-sheet-click-doors-offscreen.png` | Highfield selected **from the sheet** — both doors off screen, selected row at the bottom edge |
| `information-architecture-4-business-rules.png` | the constraints pane, and its cross-reference to the other rule surface |
| `information-architecture-5-view-page.png` | the view page — `0 PICKED` · `3 PICKED` · `26 FIT` |
| `information-architecture-6-view-setup-mode.png` | SET UP: CHANGES APPLY TO, RULE, FILTER, REMOVE |
| `information-architecture-7-flow-stage.png` | the flow stage opening on a void, with its cross-reference |
| `information-architecture-8-flow-rule-open.png` | the drawing, the NODES palette, the eight three-letter codes |
| `information-architecture-10-io-menu.png` | the `I/O` door: Document control, save a copy, CLEAR SHEET |
| `information-architecture-11-plate-opened.png` | one press on a plate: 3 columns of 31, UID first |
| `information-architecture-12-expanded.png` | EXPAND: the SECTIONS strip, 7 bands |
| `information-architecture-13-price-band.png` | the price columns with the boat's name scrolled away |
| `information-architecture-15-unexpected-design-stage.png` | a stage nobody in this session opened — see testing note 3 |
