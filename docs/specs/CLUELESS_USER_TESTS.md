# THE CLUELESS USER — the acceptance test

> *"you will pretend to be a very clueless user and screenshot things and test
> it to make the necessary corrections"*

The persona: a boat dealer's sales manager. Competent at their job, has never
seen this app, has not read anything, will not read anything. They click the
thing that looks clickable and expect it to do the obvious thing. **If they get
stuck, the app is wrong — not them.**

Rules for running these:
1. **Never use the console.** If a thing can only be reached via
   `window.__hl`, it does not exist. Click only what is visible.
2. **Screenshot every screen** before acting, and again after anything
   surprising.
3. **Record the first moment of hesitation** on each run. That moment is the
   finding.
4. Run at **1280×800** (a laptop) as the default, and re-check at 1920×1080.
5. Anything that needs explaining is a defect, even if it works.

---

## Run 1 — I have never seen this
1. Land on a clean profile. What do I do first? Is there exactly one thing?
2. Type my business name. Does Enter work, or must I find the button?
3. Pick Marine. Do the three greyed cards make me feel blocked or informed?
4. I am now on an empty sheet. **What do I do next?** Can I tell without
   guessing?

## Run 2 — I want my products in
5. Load the real Northside data. Do I understand what I just got?
6. Can I find a specific boat — the Sport 560 — without being told how?
7. Can I read the table? Or is it a wall of columns?
8. **Can I see the whole table — every row and every column?** How many clicks?
9. Can I change a price and be confident it saved?

## Run 3 — I want to add something
10. Add a new boat model. Where do I even start?
11. Add a column called "Warranty months". Can I find that?
12. Add a row inside a group — does it fill in the brand and series for me?
13. Create a new table of my own. Are the two questions obvious?
14. Rename a level from "Series" to "Family". Do I discover I can?

## Run 4 — I want to see what fits
15. Open a boat and see which motors fit it. **Can I find this at all?**
16. Turn on the settings and add Trailers to the page.
17. Remove a motor I do not sell. Can I get it back?
18. Understand why a motor is or is not in the list.

## Run 5 — I am on a laptop
19. Everything above at 1280×800. Does anything fall off the right edge?
20. Is any text clipped without an ellipsis?
21. Can I hit every control with a mouse without missing?

## Run 6 — I am impatient
22. Pan and zoom the sheet. Does it feel instant?
23. Open a big table. Does it stutter?
24. Type quickly into a cell. Does it keep up?

---

## Findings log

Each finding: **what I was trying to do · where I hesitated · what I expected ·
what happened**. Ranked by how early in the journey it stops someone.

### FIXED

**F1 · FIT did nothing, and I was stranded.** Loaded the data, landed on
half-cut-off cards with the boats off-screen, pressed the one recovery control
and the view did not move — pixel-identical transform. Cause: the seed spread
23 tables over 5,680 × 5,660px, framing that needs zoom 0.131, and the canvas
floor was 0.2, so `fitBounds` clamped and returned silently. Fixed by lowering
the floor to 0.04 and wrapping the layout to ~2,920 × 2,520; all 23 tables now
frame at 0.279.

**F2 · The whole sheet was unreadable and slow.** 6,648 DOM elements on the
canvas, every cell of every table drawn at 0.5 zoom where a row is 6px tall.
Pan p90 66.6ms. Fixed with level-of-detail plates, column windowing and
culling: 210 elements, p90 16.8ms, zero frames over 33ms.

**F3 · Three finished features reached nobody.** The view page, the reviewer
and then the sentence rules were each built and imported by nothing. Views and
rules are now mounted with a door in the left panel.

**F4 · The browser tab was a ship's wheel** — a marine metaphor in the frame of
a multi-industry product. Replaced with the neutral dimension-bracket mark.

**F5 · Jeanneau was split into three brands.** Merry Fisher and Cap Camarat got
their own tables because the workbook gives them their own banner rows. They
are Jeanneau *ranges*. Now one table, they are series inside it.

**O1 · CLEARED — the value control does follow the column.** Driven through
**all 150 columns** in the "looks at" dropdown, recording the control the
sentence rendered for each:

| column type | count | operators offered | value control |
|---|---|---|---|
| number | 92 | is · is not · is at least · is at most · is more than · is less than · has been chosen | number input |
| text | 56 | is · is not · is one of · has been chosen | text input |
| boolean | 2 | is · is not | `yes` / `no` select |

Both the operator list and the value control are re-derived on every change —
`Hull Length (mtr)` produces numeric comparisons, `Model` produces free text,
`Standard` produces yes/no. Nothing in it is hardcoded to the seeded data.
Not exercised by this data: no column in the Northside set is a **choice**
column, so the "offer the column's own options" path has no real subject yet.

**O2 · CLEARED — the "sets" side is scoped by kind, deliberately.** It is not
fixed at 9. It is the columns of the same kind as the column being looked at:

| looks at | sets offers |
|---|---|
| `Model` (boat) | 71 — 45 in this table, 26 shared across 2–7 boat tables |
| `Hull Length (mtr)` (boat) | 71 — same set |
| `Standard` (join) | 9 — the join tables' own columns |
| `Slot` (join) | 9 — same set |

That is right for a constraint: "when a **boat's** hull length is X, a
**motor's** label must be Y" is not a sentence anyone can act on without a join
to hang it from. **The consequence to be aware of:** the sentence pane cannot
express a cross-kind rule, so the headline fitment case — boat Min/Max HP
selecting motors — is *not* written here. It lives on the view page as that
page's own rule. Two rule surfaces, in two places, is a thing to watch: see F6.

**O3 · CLEARED — zero console errors, down from 73.** A full reload with the
rules pane and two tables open produced no errors and no failed requests;
every one of ~190 requests returned 200. Images are now held as links and
announced as such ("held as a link, not shown here") rather than fetched and
failing.

**F7 · A block could contradict itself, and hold the contradiction.** Opening
the Highfield page on SP560 (one trailer picked) and then clicking Coaster 540
(none) left the block reading **`NSM CUSTOM TRAILERS · 0 PICKED`**, the SP560's
trailer row still painted beneath it, and under that *"No NSM Custom Trailers
picked for this Highfield Inflatable yet."* Three statements, two of them
false. Not a flicker — still there 2.5s later, and it survived a clean click
with no typing involved.

Cause: `AnimatePresence` was given the departing rows as an exit when the
*subject* changed, and an exit to `height: 0` under a `layout` prop never
completed, so the node was retained forever. The rows had not left — the boat
had. Fixed by keying the row list on `sourceRow.id`, which makes switching
boats a remount rather than a departure. Verified in both directions: the empty
boat now holds zero rows, and going back restores the trailer.

**F6 · The Business rules door had no accessible name.** Its label is built
from two spans and the button exposed none of it as a name. Given an explicit
`aria-label` and `aria-pressed`, which is also the honest semantic — it is a
toggle, not a link.

**F8 · Every step you added landed on the exact same spot, so the builder could
not build.** Drafted a rule, pressed Match, then Output, then Filter: four
nodes, one visible plate, three buried 4px under it, no undo — and the
inspector pointing at a Start plate that could no longer be seen. Cause: the
flow stage handed the palette `dropPoint` = the centre of the pane, the palette
preferred it over `nextNodePosition`, and the camera does not move when a node
is added, so every click snapped to the same 16px cell. Fixed in `drop.ts`: a
clicked chip now goes through `addRuleNodeAfter`, which lands the plate one
pitch to the right of the plate the inspector is on, walks clear of anything
already there (right, right, right, then down a row), and draws the wire when
that wire can only mean one thing — never from a Route or a For each, whose
handles are choices, and never over an exit that is already used. The camera
follows the new plate by arithmetic, not `fitView`, which silently skips
anything React Flow has not measured yet. Verified: Match → Filter → Output on
a scratch rule now lands at 384,64 / 704,64 / 1024,64 with three edges drawn.

**F9 · You could not read what a condition compares against.** Both conditions
of the seeded motor rule rendered identically — the right-hand field picker was
**15px wide**, a naked chevron, hiding "Min HP" on one row and "Max HP" on the
other. Cause: the entity stamp beside it is `white-space: nowrap`, so
"HIGHFIELD INFLATABLES" took the whole 304px column and the select was given
what was left. Fixed by wrapping the value editor onto two lines (the FLD/VAL/ƒx
switch takes the line above), capping the stamp at 42% of the row with an
ellipsis, and giving the picker a floor it cannot be squeezed below. Both
pickers now measure 99px and read "Min HP" and "Max HP".

**F10 · You ran the rule and could not see the answer.** 173 real rows came
back into a 293px column holding a 1,057px table: five of eight columns off
screen, the **Motor** column — the answer — among them, and the table's own
horizontal scrollbar 3,900px below the fold because nothing capped its height.
Two causes, both fixed. `.rl-table-wrap` had no height, so it grew to 4,578px:
it is now the flex child that takes the height of the rail, and scrolls inside
it. And the column headers repeated the same entity stamp on every column,
which set a 146px floor under each: the stamp is now drawn once, where the
columns start reading a different row, with a hairline to mark the change. The
results column also takes 56% of the stage while an answer is up and hands the
width back the moment you click a plate. Table 1,081px → 764px, Motor's right
edge now at 535px inside a 561px window.

**F11 · Running the rule cut RUN in half and deleted the rule's name.** The
instrument bar overflowed a canvas that is `overflow: hidden`, so the control
that had just been pressed could not be pressed again. Two causes: the bar
could not wrap, and — the real one — `position: absolute; left: 50%` with no
`right` means a box may be no wider than what is left of that offset, i.e. half
the canvas. That is also why the palette strip, asking for 780px on a 524px
canvas, was given 262px. Both are now pinned to both edges and centred by an
auto margin; the bar wraps; the name keeps a 104px floor (it had `overflow:
hidden`, whose automatic minimum size is zero, so it collapsed to "R.."). After
a run at 1280: bar 225 × 139, RUN's right edge 642 against a canvas edge of 709.

**F12 · The app said the rule was fine and broken at the same time.** `CHECKS
✓`, titled "every node is configured — this rule can run", sat beside `6 NOTES`
whose notes read "Output is not connected to the Start node, so it never runs" —
and RUN then answered "no result sets". The validator is right to call an
unwired plate an advisory; the stamp was wrong to read "no blockers" as "ready".
`ruleReach` now walks the graph from Start, and the stamp reads **Not joined
up** when nothing on the path produces an answer. The rules rail says the same
in the same words. And the notes are readable: the chip that looked like a
button is a button, and opens them as a list of sentences.

**F13 · The drawing opened unreadable.** `fitView` framed the three plates at
scale 0.49, which draws a 10px micro-label at five pixels. The opening frame now
has a floor at 0.68, and below it pins to the TOP-LEFT of the drawing rather
than centring — a flow is read from its Start, and centring a drawing that does
not fit cuts the first plate in half to show equal amounts of the last.

**F14 · Every palette label was cut to three characters** — `Ma… Ro… Lin… Fo…`,
eight unreadable stubs on the one instrument that teaches the vocabulary. Same
`left: 50%` cause as F11, plus chips that shrank instead of wrapping. The strip
wraps onto a second row now: 8 chips, 72px each, zero labels cut.

**F15 · Rule names were unreadable in both places they appear.** In the 192px
rail both seeded rules read as their first eleven characters ("Motor fitme…",
"Trailer fitme…") because the rename and delete buttons held 47px of the row
permanently, even at `opacity: 0`. They are lifted out of the flow onto the row
now, and the name wraps to two lines before it ellipsises. Both seeded names
are fully readable; the full name is also in the row's title.

**F16 · Every band chip on every column row was cut off** — `IDENTI…`,
`CAPACI…`, `CONSTR…` on all 26 rows of Stacer, which defeats the whole stated
reason the stamps exist. `max-width: 11ch` at 8.5px uppercase measured 55px
against 60px of text. The stamps hold their size now and the column name gives
way first. 0 of 26 cut.

**F17 · Clicking a column opened its editor below the fold.** The row expands in
place with no scroll, so on a column two thirds down a 26-column table you click,
the caret turns, and nothing you can see changes. The row now scrolls itself
into view by the least that makes it whole. Verified on a row sitting exactly on
the fold: the panel opened fully visible.

**F18 · Selecting a link table made every door disappear, with no reason
given.** One click earlier a product table had offered two sentences; a join
offered nothing and said nothing. Neither door fits a join — the pairs page is
not about a join, and the designer would happily delete the system columns the
join is addressed by — so the row now says so where the doors would be: "A link
table records pairs, so it has no setup of its own — open one of the tables it
links."

**F19 · Two doors about rules, and the empty one was on top.** "Business rules /
what has to be true" opens a pane reading "No rules yet"; "Work out what fits
what" opens the two seeded rules that answer the question a person came with. A
sales manager asking which motors fit a hull clicked the first, found nothing,
and had no reason to try the second. The one that answers something now comes
first, and the constraint door's aside says what a constraint IS ("limits every
row must keep") rather than a sentence indistinguishable from the door above it.
Neither door was removed: both features work, and the flow builder is the one
that had never been reachable.

**F20 · The rules module said "entity" to a boat dealer** — in the default empty
states, not in corners: the picker placeholder, "Pick an entity first", "A match
scans every row of another entity", "give this rule a root entity". Every one of
those inside `src/features/rules` now says table or column. See O5 for the ones
that live outside it.

**F21 · Three things that read as something they are not.** The `✓` in the rules
rail was a square outline with a tick in it, beside a name, with no accessible
name — a checkbox to tick. It is a round stamp now and says its state out loud.
The older "What goes with each one?" door had neither `aria-label` nor
`aria-pressed` while the door a line below it had both. And a column row in the
designer announced as "TXT Series GROUPS IDENTITY" — three stamps read out with
no verb; it says "Set up the column Series".

**F22 · Two stages let a Backspace delete a whole table.** `ViewStage` and
`RulesStage` did not stop keydown at their roots, so the whiteboard's
window-level handler — which skips INPUT/TEXTAREA/SELECT but not buttons — was
still live under them, aimed at the very table whose page was open. One line
each, the same line the design and flow stages already carried.

### OPEN — to confirm once the app settles

**O4 · Two rule surfaces.** Constraints are written as sentences in the rules
pane; fitment is written on the view page. Both are correct in isolation. A
person who has been told "business rules live here" and then needs the motor
rule has to be led to the other one. Decide whether the rules pane should name
and link the view-page rules rather than pretend they do not exist.

**O5 · "entity" still reaches the reader from two files nobody on this pass
owns.** `src/types/model.ts:863` — the Match kind's blurb, "Find the rows of
another entity that fit this one" — is on every palette tooltip and every
inspector heading. `src/lib/rules/validate.ts` writes five sentences a person
reads in the toolbar's notes list, including "Match has no entity to search"
(l.235) and "The entity this rule runs against no longer exists" (l.97). Both
are word swaps; both are outside `src/app`, `src/features/rules|designer|review`.
Verify after: open a rule with an unconfigured Match and read the notes.

**O6 · The last two result columns still need a scroll, and the drawing gets
thin while an answer is up.** At 1280 the results column takes 571px, which
shows six of the eight columns of the seeded motor rule including Motor; Shaft
Length and Sell Price need a short horizontal scroll, whose bar is now on
screen. The canvas is 257px wide meanwhile. Both are the honest consequence of
1,020px of stage minus a 192px index. Worth re-checking at 1920, where it
should all fit.

**O7 · Nothing dragged is verified.** Drag a chip from the palette onto the
paper, drag a plate to move it, and drag from one plate's handle to another's
were all exercised only through synthetic pointer events, which fall through to
the click handler — the same limit the previous pass hit. The click path is
proven; the drag path is code-read only. `onPaletteDrop` walks clear of an
occupied spot the same way clicks do. **Needs one pass with a real mouse.**

**O8 · The reviewer still has no door.** `src/features/review` — 8 files over
the 15 lint rules — remains reachable from nothing, deliberately: its one-click
"Apply fix" has no confirmation in an app with no undo, and on the real sheet
its commonest suggestion would lock 26 columns to a single value. What it would
take, in order: confirm-gate every fix, teach the lint rules what a brand price
table is (they predate table kinds and read one as a mis-named entity), then cut
a door. Until then a person is right to say the feature does not exist.

**O9 · The rules rail's rename and delete buttons are hover-only hit targets.**
Lifted out of the row to give the name its width (F15), they are
`pointer-events: none` until the row is hovered or focused. Correct for a mouse
and for the keyboard; a touch on that part of the row does nothing, which is
better than the alternative — an invisible delete button that a thumb can hit.
Note for whoever automates this screen: a synthetic click will not reach them,
because the hit test runs before the pointer arrives.

**O10 · Not an app fault, but it will waste your afternoon.** While other
workflows are editing `src/features/views` or `src/features/table`, their saves
hot-update the tree and reset the shell's `stage`, so an open stage closes by
itself mid-test. Seen four times during this pass, with zero console errors each
time. Re-open and carry on; do not go looking for the bug in the stage.
