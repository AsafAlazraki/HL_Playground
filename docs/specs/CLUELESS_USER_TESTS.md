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

### OPEN — to confirm once the app settles

**O4 · Two rule surfaces.** Constraints are written as sentences in the rules
pane; fitment is written on the view page. Both are correct in isolation. A
person who has been told "business rules live here" and then needs the motor
rule has to be led to the other one. Decide whether the rules pane should name
and link the view-page rules rather than pretend they do not exist.
