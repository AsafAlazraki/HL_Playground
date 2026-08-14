# JOURNEY THREE — the view page, and the two rule doors

**Lens:** view-and-rules · **Date:** 2026-08-14 · **Viewport:** 1280×800 (re-checked at 1920×1080)
**Build state:** dev server was **not running** when this pass started (nothing listening on 5090;
only port 5040 was up). Started `npm run dev` before driving. Data already loaded: 21 tables, 651 rows.

**Console errors: 2 for the entire pass — the two documented cross-origin image probes**
(`northsidemarine.com.au/.../MF-1095-S2-1024x683.jpg` and `.../Highfield-Ultralite-240-19.jpg`).
Baseline held through every screen below: view page, SET UP, quote, business rules, flow builder,
two RUNs, and a viewport change. **Zero new errors.**

Every finding below carries the clicks, the expectation, what happened, and a measured number or a
screenshot in `docs/audit/screens/`. Where I only read code rather than triggering it, I say so.

---

## What I actually did

Clicked HIGHFIELD INFLATABLES → *What goes with each one?* → read the page → SET UP → added a table
(Parts & Accessories) → declined the offered rule and used the rule builder → picked a row → starred
it → filtered it → dropped a Yamaha and put it back → DONE → QUOTE THIS ONE → Business rules → wrote
three sentence rules (one useful, two to probe the edges) → read the six workbook rules → What fits
what → opened Motor fitment, pressed RUN → built a new rule from scratch off the palette
(Start → Match → Output) and ran it → tried to write the three concrete jobs on each door.

---

## What is genuinely good, and should not be touched

Stating this because most of what follows is criticism and the balance matters.

- **The read-mode view page is beautiful and self-explaining.** `view-and-rules-04-viewpage-read.png`.
  Breadcrumb reads `HIGHFIELD INFLATABLES · WHAT GOES WITH EACH ONE`; the boat's spec strip, the
  photo, then blocks. I knew what the page was for without being told.
- **The add-a-table suggestion flow is exactly the spec.** `view-and-rules-08-after-add.png`:
  *"Show every Parts & Accessory. Nothing on Highfield Inflatables lines up with anything on Parts &
  Accessories, so nothing is narrowed."* with three honest exits. The fall-back rule builder
  (`-09-pick-different-rule.png`) is three dropdowns over a live English sentence and an explicit
  *ONLY THE PARTS & ACCESSORIES I PICK*. Nothing in the app reads better than this.
- **Remove-and-restore is right.** `1 PICKED · 1 REMOVED` → a `1 REMOVED` chip → the row struck
  through with **PUT IT BACK**. `-17-row-dropped.png`, `-18-removed-open.png`.
- **The filter states its arithmetic**: `1 PICKED · 0 SHOWN`, a dot on FILTER, and *"Nothing here
  matches what you are looking for. Clear."* `-16-filter-nomatch.png`.
- **The six workbook rules section is the most honest thing in the app.** *"2 of 6 are being checked.
  The rest are listed so you know what is not being checked, which is the part you would otherwise
  have to guess."* Each unchecked one carries a reason a non-technical person can act on
  (*"It looks a value up in another table. A sentence can compare two things; it cannot go and fetch
  one."*) and a cell reference. `-24-rule-card.png`. **Answer to the journey's question: reassuring,
  not alarming** — it converts four unknowns into four named, bounded gaps.
- **The Match inspector teaches.** "PICK A TABLE FIRST", "WHEN NOTHING FITS · DROP THE ROW / CARRY IT
  ON — *A Stacer with nothing fitting stops here.*", and a one-click **+ HP RATING BETWEEN TWO STACER
  FIELDS** that builds both clauses correctly. `-36-match-config.png`, `-37-fitting-rule.png`.
- **Both doors now name each other in words.** Business rules: *"To work out what goes with
  something, use **Work out what fits what** on the left."* What fits what: *"For a limit every row
  must keep — a maximum, a required value — use **Business rules** on the left."* This is real
  progress on O4/F19.

---

# FINDINGS — ranked by how early they stop someone

## 1 · BLOCKER — both doors to this whole journey are off the bottom of the screen

**Did:** landed cold at 1280×800, clicked **HIGHFIELD INFLATABLES** in the left panel.
**Expected:** the panel reveals what I can do with that table.
**Happened:** the table row highlights at the very bottom edge and *nothing else visibly changes*.

Measured immediately after the click, with the panel at rest:

| door | y | viewport height | on screen? |
|---|---|---|---|
| What goes with each one? | **802** | 800 | no |
| What is each column allowed to hold? | **839** | 800 | no |

`view-and-rules-02-doors-offscreen.png` — the highlighted row is the last thing visible at y=782;
both doors are below the fold. `-03-doors-scrolled.png` shows them after I scrolled by script.

This is **O11 confirmed and worse**. O11 recorded the column-setup door at y=849 with the view-page
door still reachable; both are now off. The view page, the quote, and everything Journey Three is
about sit behind a door a person cannot see, on the app's stated target machine, at step one.
Nothing in the panel scrolls the revealed pair into view. O11 already names the one-line fix and the
file (`src/app/LeftPanel.tsx`); it has not landed.

---

## 2 · BLOCKER — picking one row on the view page silently hijacks the left panel and creates a table

**Did:** SET UP → *+ ADD A PARTS & ACCESSORY* → clicked **Sand Anchor Kit - 8lb**. One click.
**Expected:** a row appears in the block. Nothing else.
**Happened:** the row appeared — and:

- The left panel's selection **moved off Highfield Inflatables** onto a table I had never heard of,
  `Highfield Inflatables × Parts & Accessories`, filed under RELATIONSHIPS.
- **Both doors vanished from the panel** (measured: `doorsPresent: []`).
- In their place the panel now reads *"A link table records pairs, so it has no setup of its own —
  open one of the tables it links."* — a sentence about a table the user never chose, while they are
  looking at the boat's page.
- `TABLES` went **21 → 22**, `RELATIONSHIPS` 04 → 05, and a new card appeared on the sheet.

`view-and-rules-13-selection-hijacked.png` — the panel and the view page in one frame, disagreeing.

The route back to the view page (the boat's door) is now gone until the user re-finds and re-clicks
the boat table — which is finding 1 all over again. The join table is the right storage model
(VIEW_SPEC is explicit about it); surfacing it by moving the user's selection is not.

**And it is not cleaned up.** I then pressed REMOVE on the whole Parts & Accessories block. The block
went; `TABLES` stayed at **22** and the join table is still listed under RELATIONSHIPS. Adding a block
creates a table; removing the block leaves it behind. For a product whose brief is *"we need to
enforce specific best practices"* on people who *"think they understand proper data management"*,
silently accumulating orphan tables is the wrong lesson.

---

## 3 · BLOCKER — at 1280 the rule drawing is unreadable and cut off before you touch it

**Did:** *Work out what fits what* → **Motor fitment — Highfield**.
**Expected:** to read what the rule does.
**Happened:** `view-and-rules-31-flow-clipped.png` (element shot of the canvas alone).

Measured on the seeded three-plate rule, opening frame, no interaction:

| thing | measurement |
|---|---|
| flow canvas | x 452 → **976** = **524px** wide (rail 192 + inspector 300 eat the 1020px stage) |
| opening scale | **0.68** — the F13 floor, hit exactly |
| Output plate | x 909 → 1099. **123 of its 190px are off-canvas**; 67px visible |
| type on the plates | `RUN`/`FIT`/`OUT` tags **5.8px** · body **7.1px** · `AND` **5.4px** |
| empty canvas above the drawing | 294px |

F13 set a 0.68 floor to keep the drawing readable. 0.68 × 9px = 6px. **The floor is not high
enough** — nothing on the drawing is legible, and the plate that holds the answer is the one sliced
by the edge.

It gets worse as soon as you build. Drafting a new rule and clicking **Match** (scale snaps to 1.0):

| plate | left | right | canvas is 452 → 976 |
|---|---|---|---|
| Start | **412** | 692 | 40px clipped off the left |
| Match | 736 | **1016** | 40px clipped off the right |

**A two-plate rule does not fit the canvas at 1280.** Adding the third (Output) pushed Start off
screen entirely — `view-and-rules-38-output-added.png` shows only a headless Match and a clipped
Output. You can never see the whole of even the simplest rule.

**At 1920×1080 this is entirely fine**: canvas 1164px, scale **1.0**, all three plates inside
(574→1494), fully legible. So this is a 1280 problem specifically, on the machine the brief names.

---

## 4 · MAJOR — the guided path in "What fits what" produces a meaningless answer

**Did:** built a rule the way a first-timer would, using only the app's own suggestions:
*+ NEW RULE* → walks every row of **Stacer** → *DRAFT RULE* → clicked **Match** → picked *Yamaha
Outboards* → clicked the offered **+ HP RATING BETWEEN TWO STACER FIELDS** → clicked **Output** →
clicked the offered **USE THE OBVIOUS TWO** → **RUN**. Every click was a control the app put in
front of me. `Checks ✓`.

**Expected:** a table of Stacer boats beside the Yamahas that fit them.
**Happened:** `view-and-rules-39-newrule-run.png` — 193 rows, **two columns both headed `Series`**:

```
   STACER              YAMAHA OUTBOARDS
   Series              Series
01 TERRITORY STRIKERS  Four Stroke Models
02 TERRITORY STRIKERS  Four Stroke Models
…  (193 rows, no boat name, no motor name anywhere)
```

**USE THE OBVIOUS TWO** picked the first column of each table. On this real data the first column of
both tables is called `Series`, so the "combined view" names neither side. The aside underneath even
says *"Pick from both sides — that is what makes this a combined view rather than a list."* — it did
pick from both sides, and the result is still useless. The obvious two are `Model` and `Motor`.

Contrast the seeded rule, which shows `Boat / Min HP / Max HP / Motor / HP Rating` and reads
perfectly (`-32-run-result.png`). The seeded rule was hand-configured; the guided one is not.

---

## 5 · MAJOR — one of the three concrete jobs cannot be done on the door its own words point at

The three jobs, tested:

| job | which door do the words send you to? | can you do it there? |
|---|---|---|
| **(a)** motors must never exceed the boat's max HP | **Business rules** — *"limits every row must keep"* is the literal restatement of this job | **No.** |
| **(b)** show me trailers that suit this hull | ambiguous — the view page, *What fits what*, and arguably *Business rules* all read plausible | yes, on two of them, differently |
| **(c)** every boat must have a price | **Business rules** | **Yes.** |

**(a), tested by hand:** in Business rules I set *the column the rule looks at* to
`HP Rating · 2 motor tables`. The *sets* side then offers **27 options, all motor columns, one
optgroup labelled "Motors"**, and `Max HP` is **not among them** (`hasMaxHP: false`). The sentence
auto-completed itself to *"When HP Rating is …, **Series** must be …"* — the first motor column —
and there is **no message anywhere saying why the column you want is missing**.
`view-and-rules-40-jobA-impossible.png`.

This is O2's documented scoping, working as designed. The defect is the silence: the door promises
"limits every row must keep", the user types the most famous limit in the business, and the app
neither offers it nor explains the refusal. The pane *does* say elsewhere that this rule lives in
*Work out what fits what* — but only in the workbook section further down the page, and see finding 9.

**(c) works, and reads as English at every step** — I wrote *"When Model has been chosen, Base Cost
must be chosen · because we never quote a boat without a price"* and it committed as
`ACTIVE NOW · 174 rows match · 7 tables`. `-25-my-rule.png`.

---

## 6 · MAJOR — PICKED vs STARRED is never stated, and the star silently decides the quote

**Asked myself before reading anything:** two rows, one with a filled star. I guessed "favourite".

**What it actually does,** measured end to end:

- View page, Highfield PA420: `YAMAHA OUTBOARDS · 2 PICKED`, F60LC starred, T60LC not.
  Parts & Accessories: 1 picked, starred.
- Pressed **QUOTE THIS ONE**. The quote contains **F60LC ($8,866)** and **Sand Anchor Kit ($99)** —
  the two starred rows — and **not T60LC**, which is offered behind *+ ADD FROM YAMAHA OUTBOARDS*.
  Total $23,025 = 14,060 + 8,866 + 99. `-19-quote.png`, `-20-quote-bottom.png`.

So: **starred = goes on the quote, priced, in the total. Picked = offered when you add.** That is a
good model. Nothing on the view page says it.

- In read mode the star has **no label at all** — only `title="Recommended"` on the span.
- In SET UP the toggle's only text is `title="Recommend this one"` / `title="Not the recommended
  one"`. Neither mentions quoting. Neither is an `aria-label`, so the control is nameless to a
  screen reader. The off-state title *"Not the recommended one"* reads as a statement about the row,
  not the action it performs.
- The count chip says `2 PICKED`. It never says `1 recommended`, so the arithmetic that decides the
  quote is invisible on the page the quote is minted from.
- F28's own standard applies here: *"a tooltip is not an answer to someone who does not know there
  is a question."*

Row controls also measure **24 × 24 px** (star and drop, both rows, measured) — under any comfortable
minimum, on the control that decides money.

Minor, same area: in SET UP a starred row draws **two star glyphs** — the read-mode indicator at
x≈557 and the toggle at x≈1147 — identical shape, identical state, on the same row.

---

## 7 · MAJOR — a business rule is one click away and can never be deleted

The Business rules pane opens with the draft **already complete**: *"When Standard is yes,
Recommended must be yes"*, and **ADD RULE is already enabled** with the hint *"NOTHING ELSE TO FILL
IN."* (`-21-business-rules.png`). One click on the dark primary button, on a form nobody filled in,
creates a live rule.

There is **no delete on a rule card** — I enumerated every button in `.cn-root`: `Add rule`, the
on/off switch, `Done`, and the card-open button. Nothing else. Source confirms this is deliberate:

- `src/features/constraints/constraintDefs.ts:232` — *"Used by a project reset; there is no per-rule
  delete by design."*
- `src/features/constraints/RuleCard.tsx:4` — *"The switch, not a delete button. A shipped rule that
  can only be deleted is a rule nobody dares touch."*

The reasoning is sound for a rule someone meant to write. It is not sound for a rule created by a
misclick on a pre-filled form. My two probe rules are now permanent residents of this project (I
switched them off — see *State I left behind*). At three rules the list is already 60% junk.

Related, same pane:
- The numeric value box **pre-fills `0`**, and `0` counts as "chosen", so *"Hull Length (mtr) must be
  0"* is a committable one-click rule. Mine landed as `CONFLICT · 106 rows break this · 4 tables`.
- When the reason is left blank the app writes one: `autoBecause` (`NewRuleSentence.tsx:105-113,147`)
  restates the condition. My rules read *"…because model has been chosen"* and *"When Hull Length
  (mtr) is 5.5, Base Cost must be 12,345 **because hull length (mtr) is 5.5**"*. It is true, as the
  code comment says, but it is circular, lower-cased, and indistinguishable from something the user
  wrote. `-26-conflict.png`, `-27-three-rules.png`.

**Credit where due:** the status vocabulary is excellent — `ACTIVE NOW · 174 rows match`,
`CONFLICT · 106 rows break this`. The difference between "match" and "break" is doing real work.

---

## 8 · MAJOR — "106 rows break this" is a dead end

The conflict footer is a plain `<footer class="cn-card-foot">` — **not a button, not a link**
(`closest('button,a')` → false). The app tells you 106 of your rows violate a limit you just wrote
and gives you no way to see which ones. The most useful click on the screen isn't there.

---

## 9 · MAJOR — the one cross-door hand-off wears a link icon and is not a link

In the workbook list, the two checked rules are captioned
**`⧉ CHECKED IN WORK OUT WHAT FITS WHAT · MOTOR FITMENT`** with an arrow-out-of-box glyph — this
app's mark for "this takes you somewhere". `-24-rule-card.png`, `-25-my-rule.png`.

It is a `<p class="cn-wb-status">` inside a `<li>`. **No `<a>`, no `<button>`, nothing clickable**
(verified across all matching elements). It is the exact hand-off O4 flagged — the person who needs
the motor rule and is standing in the wrong pane — and it is painted to look like the way out.

---

## 10 · O5 CONFIRMED, STILL OPEN — "entity", and a marine example, on the palette and in the inspector

`view-and-rules-35-match-added.png` shows both at once, on screen, in a product briefed
*"not too marine - generic industry"* and *"table or column, never entity"*:

- Inspector heading blurb: *"Find the rows of another **entity** that fit this one — **a boat's
  min/max HP against every motor's HP**."*
- Blocker note directly beneath: *"Match has no **entity** to search — choose what it should match
  against."*

Source, verbatim: `src/types/model.ts:863` —
`'Find the rows of another entity that fit this one — a boat’s min/max HP against every motor’s HP.'`
It is also the `aria-label` of the Match palette chip, so it is read aloud too. `validate.ts` is the
source of the second sentence (O5 names l.235). **Two problems in one string**: the word `entity`,
and a hard-coded marine example in the one control that teaches the vocabulary.

Same palette, smaller: the visible chip labels are **Route** and **Linked** while their accessible
names are **"Condition"** and **"Find linked"** — the accessible name does not contain the visible
label.

---

## 11 · MAJOR — `window.confirm` is still live in the rules module

**Did:** hovered *Rule 3* in the rail and clicked its × (`aria-label="Delete Rule 3"`).
**Happened:** the OS dialog: **`Delete rule "Rule 3"? The flow you drew is removed with it.`**
Observed live; Playwright reported it as a modal.

F24 replaced `window.confirm` with `ConfirmSheet` and F27 called the designer's the last one on the
surface. It is not the last one in the app. Grep of `src/`:

| file:line | act |
|---|---|
| `src/features/rules/RulesList.tsx:66` | delete a rule — **observed live this pass** |
| `src/features/rules/RuleInspector.tsx:1170` | *"Delete this match node?"* — **code-read only, not triggered** |
| `src/app/Inspector.tsx:33`, `src/app/FlowStage.tsx:346`, `src/features/whiteboard/Whiteboard.tsx:476`, `src/features/io/ImportExportMenu.tsx:248,268,273`, `src/app/demoLoad.ts:58` | outside this journey, not tested |

Deleting a rule is exactly the class of act F24 argued needs the house sheet: it names one thing (the
flow) and not the other (whether anything depends on the rule), and it stops the drawing-office
typography mid-sentence.

---

## 12 · MODERATE — REMOVE on a view block asks nothing at all

**Did:** SET UP → REMOVE on the Parts & Accessories block header.
**Happened:** the block and its picked, starred row disappeared **instantly. No dialog, no toast, no
undo.** `-42-remove-block.png`.

The inconsistency is the finding: deleting a *rule* fires an OS confirm (11); deleting a *column*
opens a ConfirmSheet naming every dependent (F26); deleting a whole related block on the page a
salesperson quotes from asks nothing. And it leaves the join table behind (2).

---

## 13 · MODERATE — the ePropulsion block's REMOVE is cut in half

**Did:** scrolled to the ePropulsion Outboards block in SET UP.
**Happened:** the header reads `⋯ FILTER  🗑 REMO` — the label is clipped. `-06-setup-bottom.png`.

Measured on `.vw-strip` (block 3):

| | |
|---|---|
| strip `scrollWidth` / `clientWidth` | **701 / 663** — 38px lost |
| `overflow` | **hidden** (no scrollbar, nothing recoverable) |
| Remove button right edge | **1239** against a container edge of **1213** — 26px of the control gone |

Cause is content, not layout: this block's rule sentence is long
(*"Show ePropulsion Outboards where HP Rating is at least this Highfield Inflatable's Min HP"*), and
the strip neither wraps nor scrolls. The other two blocks (short "you pick" sentences) fit at 1201.
Any real fitment rule will be at least this long.

---

## 14 · MODERATE — the "add a row" picker has no column headers

`-11-add-row-picker.png`. Each row is `+ Sand Anchor Kit - 8lb   59.42   71.3   0.26`. Three
unlabelled numbers; no `<thead>` anywhere in the picker (verified — the container's first child is
the first `button.vw-add-row`). One of them is what the customer pays.

The block behind it *does* head its columns (`PRODUCT · P&A · CTD · MU`), so the picker is the only
place in the flow that drops them — at the exact moment the user is choosing.

Related and separate: `P&A / CTD / MU` are the workbook's own abbreviations. Faithful, but a sales
manager reading `MU 0.26` beside `$8,228` on a quote-bound page cannot tell cost from price.

---

## 15 · MODERATE — "what else goes with a Highfield Inflatable?" offers six other boat brands

**Did:** SET UP → *+ ADD A TABLE*.
**Happened:** the picker lists 13 tables. Six are boats: **Formosa, Haines Signature, Jeanneau,
Stabicraft, Stacer, Surtees**. `-07-add-table.png`.

It correctly excludes join tables and tables already on the page, so the filtering exists — it just
doesn't use the table *kind* the app already knows. A boat does not go with a boat, and the heading
asks the question in those words.

---

## 16 · MODERATE — two identical-looking chips, two different meanings, no legend

On one page, three blocks:

| block | chip | why |
|---|---|---|
| YAMAHA OUTBOARDS | `2 PICKED` | rule is *"Show only the Yamaha Outboards you pick"* |
| NSM CUSTOM TRAILERS | `0 PICKED` | same kind of rule |
| EPROPULSION OUTBOARDS | `0 FIT` | rule is *"…where HP Rating is at least this boat's Min HP"* |

The noun tracks the rule mode, which is defensible design. But the chips are the same size, weight
and position, and nothing on the page says the words mean different things. `0 PICKED` means *"you
haven't chosen any"*; `0 FIT` means *"the maths found none"*. Those need different responses from the
user and get the same glance.

`"No ePropulsion Outboards fit this Highfield Inflatable **yet**"` compounds it — "yet" implies you
can fix it by picking, which for a computed rule you cannot.

---

## 17 · MINOR — a rule that matches nothing gets no badge at all

Three cards, three states: `CONFLICT`, `ACTIVE NOW`, and — on the rule matching nothing —
**no badge in the slot where the other two have one**, just `NO ROWS MATCH YET · 4 TABLES` in the
footer. `-27-three-rules.png`. An absence where a word belongs reads as an unfinished card.

Also: a switched-off card renders **`OFF OFF`** — the badge and the switch label both say it.

---

## 18 · MINOR — smaller things, each observed

- **The default table for a new flow rule is alphabetical, not contextual.** *+ NEW RULE* opens with
  *WALKS EVERY ROW OF* → **Dunbier / Haines BMT Trailers**, regardless of what you were looking at,
  in a 155px select that truncates the name. `-33-new-rule.png`.
- **New flow rules are named `Rule 3`** in a rail whose other entries are *Motor fitment — Highfield*
  and *Trailer fitment — Highfield*.
- **Entity stamps in the clause editor ellipsise at 9px**: `rl-stamp` clientWidth 101 vs content 114,
  so "Yamaha Outboards" renders as `YAMAHA OUTBOARD…` — at 9px the ellipsis reads as part of a
  plausible wrong name. `-37-fitting-rule.png`.
- **`FLD | VAL | ƒx` and `NUM`** sit on the clause row untranslated, in a module that fixed "entity"
  everywhere else (F20). `-37-fitting-rule.png`.
- **`+ ADD A PARTS & ACCESSORY`** — the button pluralises the table name into an article that doesn't
  work. Generated from the table label; will misfire on any plural table name.
- **RUN produces an answer with nowhere to go.** No APPLY, no effects panel, no "write this to the
  join", no "use this on the view page" (enumerated every button in the stage). RULES_SPEC promises an
  EFFECTS section with APPLY/DISCARD. Meanwhile the seeded join holds 134 rows and RUN computes 173,
  and nothing on either screen mentions the other.
- **`MOTOR FITMENT — HIGHFIE…`** — the rule name in the instrument bar still truncates once results
  are open at 1280.

---

## O6 — answered with a measurement, and the answer is "no"

O6 asked whether the results table fits at 1920. **It does not.**

| viewport | results rail (client) | table (scroll) | canvas left for the drawing |
|---|---|---|---|
| 1280×800 | 561px | **764px** | 257px |
| 1920×1080 | 649px | **764px** | 808px |

The rail is a percentage of the stage, so 640px of extra screen bought the table **88px** and it
still needs a horizontal scroll — `Shaft Length` and `Sell Price` are off the edge at both sizes
(`-43-1920-run.png`). The last two columns will never fit until the split stops being proportional.

---

## Not tested / not verified — stated so nobody assumes coverage

- **Drag** — nothing was dragged. Adding a table, adding a node, moving a plate and drawing a wire
  were all done by clicking. O7 still stands: the drag path is unproven.
- **`RuleInspector.tsx:1170`** (`window.confirm` on node delete) is **code-read only**; I did not
  delete a node on a seeded rule.
- **Nesting** (VIEW_SPEC's drag-onto-a-block, depth 3) — not exercised.
- **Reordering rows** by the grip handle — not exercised.
- **`CHANGES APPLY TO`** — I read the control and its aside (*"What you keep, drop or star lands on
  this variant only"*) but did not switch it to a higher level or verify cascade.
- **Trailer fitment — Highfield** — never opened or run.
- **Keyboard-only** traversal of either surface — not attempted.
- **Touch** — not attempted; O9's hover-only rail buttons were reached by an explicit hover.

---

## State I left behind (no undo exists, so this is on the record)

The app has no undo and business rules have no delete, so this pass changed the project. What I could
reverse, I reversed. What remains:

| left behind | why it could not be removed |
|---|---|
| 3 business rules, **all switched OFF** (`Model→Base Cost must be chosen`; `Model→Hull Length must be 0`; `Hull Length 5.5→Base Cost 12,345`) | no per-rule delete exists (finding 7) |
| 1 orphan link table `Highfield Inflatables × Parts & Accessories` (TABLES 22, RELATIONSHIPS 05) | removing the block that created it does not remove it (finding 2) |
| 1 extra quote (`Quotes we have made` 2 → 3) | not attempted |

Removed cleanly: the Parts & Accessories block, the picked/starred accessory row, and the drafted
flow rule "Rule 3". The dropped Yamaha T60LC was put back and verified (`2 picked`). Left on the
sheet at 1280×800 with 2 console errors.

---

## The one-line answer to the journey's big question

> *With two rule doors a centimetre apart, can you predict which one to open?*

**Half the time.** The doors' own subtitles are well written and each names the other — but the most
famous rule in the business ("motors must never exceed max HP") reads as a *limit*, so it sends you
to **Business rules**, where it cannot be written, no message says why, and the pointer to where it
does live is nine screens down and painted like a link it isn't. Fixing finding 5 and finding 9 —
a refusal sentence on the sets-side picker, and making that caption an actual button — would close
most of the gap without moving a single feature.
