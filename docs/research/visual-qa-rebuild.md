# The rebuild, measured

`visual-qa-2026-09-09.md` is the scoreboard this answers. Same rulers,
driven in real Chrome against the real Northside seed — 53 tables, 15,691
rows, 25 modules — from an empty browser profile every run.

**Reproduce it:**

```bash
npm run dev                                   # in one terminal
node tools/qa-sweep.mjs                       # every screen, both themes
node tools/qa-sweep.mjs --at 1024x768 --light
node tools/shot-picker.mjs                    # the Showroom entry path
node tools/shot-build.mjs                     # the configurator
```

`tools/drive.mjs` holds the four rulers all of them share, so three
harnesses cannot report three different numbers: the ramp, the mid-word
check, the composited contrast sweep, and the sign-in-and-seed every run
starts from.

> **Restart `npm run dev` before measuring anything you have just
> restructured.** Vite serves partial transforms after a structural edit,
> and this cost three wrong readings in one session. `CLAUDE.md` carries
> it. Every driver prints `pageerror` on its own line, which is what
> caught all three.

---

## Every screen, 1280×800, both themes

Re-run 2026-09-14, after the screens were rebuilt a second time — the
quotation as a sheet of paper, Modules as shelves, Admin as a register,
the rules ledger as a list.

| screen | register | ratio | steps | thin | cut |
|---|---|---|---|---|---|
| home | showroom | 7.45× | 6 | 0 | 0 |
| modules | showroom | 7.45× | 6 | 0 | 0 |
| catalogue | showroom | 7.45× | 7 | 0 | 0 |
| picker | showroom | 7.45× | 6 | 0 | 0 |
| place | showroom | 7.45× | 6 | 0 | 0 |
| configurator | showroom | 6.19× | 7 | 0 | 0 |
| document | showroom | 6.55× | 9 | 0 | 0 |
| data | cockpit | 3.09× | 5 | 0 | 0 |
| quotes | cockpit | 3.09× | 5 | 0 | 0 |
| customers | cockpit | 3.09× | 5 | 0 | 0 |
| admin | cockpit | 3.09× | 6 | 0 | 0 |
| rules | cockpit | 3.09× | 6 | 0 | 0 |
| review | cockpit | 3.09× | 6 | 0 | 0 |
| fitment | cockpit | 3.09× | 8 | 0 | 0 |

**It was not clean when the run started.** Four findings, and every one
of them was work done in the preceding two days:

- **modules, 31 thin.** The filter counts took `--fg-quaternary` — a
  tier for a mark, not for a figure somebody reads — at 3.68:1. Then
  twenty-five `Settings` doors at the same ratio, for the same reason.
- **rules, 3 cut.** The collapsed ledger row truncated its sentence with
  `text-overflow: ellipsis`, which cuts wherever the box ends: "the boat
  ro…", "must be one of …", "the standard-…". A rule of the business, cut
  inside its own last word. It wraps now.
- **picker, 7 thin.** The refusal counts, same tier, same 3.68:1.
- **configurator, 12 thin — including `RU230KAM` at 1.14:1.** This one
  is the interesting one, and it is a finding about the RULER as much as
  the screen. `drive.mjs`'s `ground()` walks ANCESTORS reading
  `backgroundColor`. The lit plate is a `radial-gradient` (not a
  background-colour) on `.ui-stage-frame` (a SIBLING, not an ancestor),
  so the sweep walked past it, landed on the dark room, and reported dark
  ink on a dark ground — while the marque is plainly legible in every
  screenshot of it.

  **The answer was not to exempt the ruler.** A measurement that has to be
  argued away is one nobody trusts the next time, and this repo has three
  sweeps in its history that reported false catastrophes for exactly this
  class of reason. The lockup and the spec strip carry their own light
  now, so what composites is what is painted. The value is computed, not
  picked: the plate's radial resolves to about #f6f4ef at the lockup's own
  corner, four steps per channel off `--sweep-mid`, under a grain
  overlay, at an edge that is itself a gradient.

**And two Showroom screens were under the 6× floor** — configurator 5.09,
document 5.45 — because on both of them the largest type had become the
PRICE. On a screen whose entire subject is one hull, the hull's name being
the second-biggest thing is the ranking the wrong way round. Both now size
the marque off the column it is in: 6.19× and 6.55×.

**At 1024×768:** Showroom 6.07×, Cockpit 2.69–2.73×, still clean. This is
the width where `visual-qa-2026-09-09` found the configurator's advantage
vanishing entirely (3.17×).

Cockpit going **down** is the screen passing. Its band is 2.5–3.2× because
a screen somebody reads for an hour must not have a 75px word on it; a
screen somebody is sold from must.

## What each was before

| screen | before | after |
|---|---|---|
| home | 3.09×, register NONE, ragged tiles, 3 of 4 photographed | 6.86×, one tile height, a kind plate under every one |
| picker | 3.68×, **six** card heights, **zero** photographs, lower half unreachable | 6.86×, one height, 14 of 18 photographed |
| a place | 3.09×, 50 rows capped from 588, "type a model to reach the other 538" | 6.86×, **67 model cards, no cap** |
| a catalogue | 2.45×, **five text links in an empty page**, 0 of 588 in view | 6.86×, 67 cards across 7 bands |
| configurator | 4.39×, the **price** the largest thing on a screen about a boat | 6.86×, the boat |
| document | 2.91×, headline was an SKU, **1.14:1 in dark** | 6.86×, the boat's name, readable in both |
| data | 3.09×, **six cards in 800px** | 2.82×, **53 tables, 18 rows in view** |
| quotes | 2.45× board / 2.18× list, "No customer yet" the headline on every row | 2.82×, the boat is the headline |
| review | 2.45×, 142 marks in a 440px straw | 2.82×, a 671px measure |
| rules | 2.45×, titled itself twice | 2.82×, once |
| admin | 3.09× from **nav labels at 34px** | 2.82×, the page's own name largest |
| modules | 3.09×, ragged photograph wells | 6.86×, one well height |
| customers | 3.68× from an empty-state hero | 2.82× |
| fitment | 3.09×, said its name twice | 3.09×, once |

## Contrast

Every text leaf composited against the ground it is actually drawn on:
`color(srgb …)` parsed as well as `rgb()`, the full ancestor chain
composited, translucent ink composited over that ground, `aria-hidden`
skipped. **Zero under 4.5:1 on fourteen screens in two themes.**

Seven defects were found by running it. Four were introduced by this
rebuild, three were shipped:

- `.qp-group-count`, `.qp-off-count`, `.pl-series-count` — 2.44:1 and
  2.58:1, all `--fg-quaternary`, which `system.css`'s own ink table
  labels "does NOT clear 4.5 … never a word that matters".
- `.ui-row-meta` on the **current** row — 4.37:1. The count beside the
  rail's selected item, on every screen, because something is always
  current. `row.css` measured `--fg-tertiary` at 4.80:1 over
  `--accent-wash` and that is true; it never measured the
  `--accent-wash-strong` the same row takes on hover.
- `.cn-door-n` on rules — 4.43:1. `--ink-faint` clears on the page
  ground; a door card is not the page ground.
- `.cn-src-verdict.is-asserted` — 4.14:1, thirteen on one screen, and
  **`system.css` had already named this exact class by selector** in its
  palette note. A known defect with nothing failing on it.
- **The document's own lockup — 1.14:1 in dark.** `.qt-doc` carries its
  own ink ramp, scoped to the sheet, precisely so the theme cannot reach
  inside it: the paper is `#fff` in both themes because a document that
  changed colour with the reader's preference would be two documents. The
  new lockup used `--fg`, which is the exact fault that block exists to
  fix. Nothing had ever measured the customer-facing page in dark.

## Truncation

Zero mid-word cuts on fourteen screens, two themes, two widths.

**The ruler had two holes in it**, and both were exactly the shape of the
defect it exists to find — so every "clean" reading before 2026-09-13 was
weaker than it looked:

1. it asked only for `text-overflow: ellipsis`, so a **hard clip** —
   `overflow: hidden` with `white-space: nowrap` and no ellipsis — was
   invisible to it. A hard clip is the worse of the two: an ellipsis at
   least says a string was cut.
2. it only looked at elements with **no children**, so a cell holding a
   kind dot *and* a name was never examined.

The rebuilt Data screen tripped both at once and was reported clean while
cutting **23 table names dead** ("Highfield × Yamaha — Moto"). With both
closed it went on to catch four more real cuts on the quotes register — a
money cell, a date column and a 38-character boat name — each of which
sized a column against its measured worst case.

## The build

`npm run build` passes in 2.92s. The entry chunk is **954 kB**, against
the 2,081.98 kB `CLAUDE.md` records; the seed is split out into its own
3.29 MB chunk. Nothing guards either figure yet.

## The two defects that were not about looking

Neither would have been caught by any ruler above.

**`.pk` already belonged to something else.** The picker took `.pk` for
its root, and `src/features/picker/picker.css:11` has owned that class
since the app replaced its two native `<select>`s. The screen silently
inherited `display: inline-flex`, `align-items: center`, `height:
var(--h-md)`, a border and a background — which is why its groups were
shrink-to-fit and its cards came out at nine different heights. Every
prefix since has been checked against `src` before use.

**Two screens were cut in half.** `.shell-stage` is `overflow: hidden`
and hands every stage a box of exactly the window's height; each screen
owns its own scrollport. The rebuilt picker did not, so of 3,936px of
content in an 800px box, four of five module groups and every refusal
were unreachable — no scrollbar, no wheel, nothing.

## What the numbers do not cover

- **Whether a screen makes sense is a person's job**, still.
- **The board, the levels editor, the whiteboard, onboarding and auth**
  are not in the sweep. The board is reachable from the quotes register
  and is unchanged on purpose.
- **Motion** is measured by nothing. `check:styles` holds the CSS↔JS
  duration tokens in step; whether a transition reads well is unmeasured.
- **The 121 Highfield rows whose colourway code is `I`, `O`, `R` or `WH`**
  print their code verbatim, because no production map carries those
  tokens. That is a question for the dealer, not a gap to guess at.

## 2026-09-14 — the card comes off

Re-measured after the unframing pass. The owner's finding, from one
photograph of the catalogue at 1440: **"why are there two Highfield
headers"** — `TableStage` set the entity name in the window bar at 30px
and `CatalogueScreen` set it again 60px below at 64px. The bar now hides
its title and takes the page's ground when the rebuilt catalogue is under
it (`data-lens="catalogue"`); `[hidden]` needed its own rule because the
bar's `display: flex` outranked the user-agent's `display: none`.

The second finding was mine and worse: every photograph had a grey band
under it. `--photo-drop` traced the opaque rectangle of a studio photo,
not a hull — measured by sampling the screenshot down the middle of a
card, rgb(232,232,233) at y=560 fading to rgb(245,246,246) at y=585.
The token is `none` until the art is cut out; `world.css` carries it.

What moved, on every Showroom product screen: the box, the sweep
gradient, the kind rail, the glass chip and the seam are gone; the page
name stepped down from marque to hero; the display face is the body face
(Instrument Sans, one voice); band strips are hairlines; search fields
are a line; the caption is one baseline.

| ruler | result |
|---|---|
| `npm test` | seven green, lint 343/343, 2,974 tests |
| `check-collide` 1440×900 | nothing overlaps, 11 screens |
| `check-contrast` | 1,375 text nodes across 11 screens, all clear |
| `qa-sweep` | clean in both themes; **Showroom scale ratio 4.73×** |
| `check:shots --update` | 14 of 14 re-taken |

**Flagged, not fixed:** `DESIGN_SYSTEM.md` asks Showroom for ≥6× scale
contrast and the hero step gives 4.73×. The 6× head is the one the owner
called "awful" in the same session. The number is recorded here so the
spec and the screen do not disagree in silence; which one moves is the
owner's call.

## 2026-09-15 — the configurator re-cut

"Configurator still sucks." Photographed on the hull step at 1440 and
read against Porsche's: **290 of 900 pixels were chrome before the
boat** — a grey Back strip, a glass money card with a ring, a caption, a
56px figure, a tax sentence, a level toggle, a refused button and its
paragraph, then a stepper with pills, circles, ticks and a "chosen: …"
caption under every stop. The name was on the rail three times. And the
hull sat in a grey smudge that `elementsFromPoint` could not find,
because it was `m-lit::before` — the dark room's spotlight, painted by
the shared stage on its own frame as a pseudo-element.

Nothing in the markup moved. The money card's grid area went from the
top of the page to the foot of the right column, where every reference
keeps its summary; the stepper is a line of words with the current one
underlined; the spotlight is off under `.bs-product`; under 1000 the
spec figures get their own row instead of lying across the transom.

| ruler | result |
|---|---|
| `npm test` | seven green, 2,974 tests |
| `check-collide` | nothing overlaps, 11 screens |
| `check-contrast` | 1,369 text nodes, all clear |
| `qa-sweep` | clean; configurator scale ratio **3.09×** |
| `check:shots --update` | configurator and document re-taken |

The configurator's scale ratio fell to 3.09× because the marque lockup
over the hull was already hidden and the price figure now sits at the
display step. Same standing question as the 4.73× above: the spec says
6×, the owner said the big head was awful.

## 2026-09-15, later — the rail re-cut to Porsche's, with Porsche on screen

"More like Porsche the right side, not less. STUDY IT." Driven live at
`configurator.porsche.com/en-AU/mode/model/9921B2`, 1440×900, and
measured: no stepper anywhere; the sections stacked down one rail the
page scrolls through; each a white card (radius 16) whose head carries
the group's name at 16/600 and its price beside it in grey; option rows
of an 88×88 thumbnail on a 12px radius, a bold name, one grey line, the
price, hairlines between; the chosen swatch ringed; 98×58 thumbnails in
a strip under the stage; the price and one black pill in a slim bar that
sticks. `out/ref/porsche-top.png` and `porsche-scrolled.png` are the
frames.

What changed to match, and it is the first change to the configurator's
MARKUP in this rebuild: the stepper is gone; every band is rendered on
the rail at once, in order, with the handover last, and `openId` — still
the one "current" — follows the scroll through an IntersectionObserver
on the rail rather than a press. `ProductStage` grew a thumbnail strip;
`subjectPictures` feeds it the hull and every picked line with a
photograph, so a quote with a motor and a trailer on it shows three. The
option deck is thumbnail rows. The money card is a slim top bar. The
refusal for an unpaired table is one sentence (`steps.ts:152`), not
three. The sidebar collapses by default and reads as a sidebar. `--action`
is a sea blue (#0f4c81; 8.6:1 on white, 7.1:1 under white) on every
primary action, chosen ring and "On the quote" chip.

The harness now takes `HL_MODEL` on the configurator route, because the
first card on the shelf is an RU230 with nothing paired to it and a
configurator photographed with nothing in it proves nothing. The SP560
has a Yamaha F90 and a Redco trailer paired.

| ruler | result |
|---|---|
| `check:types` · `lint` · `vitest` | clean · 343/343 · 2,974 passed |
| `check-collide` | one collision found and fixed ("Recommended" spilt 3px past an 88px thumb), then nothing overlaps |
| `check-contrast` | 1,277 text nodes across 11 screens, all clear |
| `qa-sweep` | clean; configurator 3.09× |
| `check:shots --update` | 14 of 14 re-taken |

## 2026-09-15, later still — the finishes grid, only where there is one

"Add the finishes swatch grid to the rail but only where appropriate."
Porsche's rail opens on its swatches; ours now opens the hull section on
a grid of every finish the model has — the SP560's fifteen — and the
"where appropriate" is a fact `foldModels` and `finishLevels` already
decide for the place screen: half a table's rows must carry a readable
colourway for its last level to be a finish, and the model must have
more than one row. A Yamaha F90 gets nothing.

Pressing a swatch is a real act: `refinishSubject` (freeze.ts) re-roots
the draft on the sibling row — subject line re-minted at the quote's
rung, label, figures and picture re-frozen — and leaves every other
line where it was; `refinish` (quotes.ts) is the undoable action. Driven
at 1440: fifteen tiles; the fourth pressed took the subject from
`W-W-WB` to `B-W-C`, the stage to the `B-W-C` render, the chip to
`(PVC) B-W-C`, with the price, the total and the three lines unchanged;
the toast said so with Undo; Undo brought all of it back.

| ruler | result |
|---|---|
| `check:types` · `lint` · `vitest` | clean · 343/343 · 2,974 passed |
| `check-collide` | nothing overlaps |
| `check-contrast` | four swatch captions at 4.31:1 in quaternary on the tile's grey — lifted to tertiary; then 1,287 nodes clear |
| `qa-sweep` | clean |
| `check:shots --update` | 14 of 14 re-taken |
