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

## 2026-09-15, evening — the document re-cut to Porsche's PDF

"Do the same Porsche treatment on the quote document and go find a
Porsche document itself." Found: the configurator's own "Download
configuration (PDF)" — behind a "Select PDF content" modal — fetched as
`out/ref/porsche-configuration.pdf` (15 pages, `%PDF-`, 2.5 MB) and
rendered through pdf.js because the machine has no poppler. Its shape:
a cover (the car large on a light panel, the name centred under it at
32/400 with a chip, one bold line, the code and the date as chips), then
"Summary" against the price with a footnote, then one centred title per
section and a four-column table — category, a 48px thumbnail with the
option, the code in grey, the price or "Standard Equipment" in grey —
with the code and the page number in every footer. Its on-screen summary
is the same in two columns, the price and the pills on the right.

Ours was a cream A4 sheet with crop marks, a brass masthead at 56px,
beige section bands and mono uppercase captions. `QuoteDocument.tsx` is
re-cut — cover / card / side — and `QuotePage` hands its acts in as a
prop so the side column holds Print where Porsche's holds "Select a
dealer"; nothing on it reads live data and every frozen fact that
printed still prints. The one print block is extended, not doubled: page
one lays the cover, then the price beside the customer and the plate;
the tables start on page two. Two bugs on the way, both mine: the paper
rules were inserted before the file's last `}` — which by then closed a
screen rule appended after the print block — and sat as invalid nested
text until brace-matched into place; and `body`'s cream `--sheet` showed
as a block wherever the document ended short of the page.

`document.test.tsx` caught the reference and the date printing three
times (cover chips, plate, foot) against the spec's twice; the plate no
longer says them. The dealer's name is its own element again.

| ruler | result |
|---|---|
| `check:types` · `lint` · `vitest` | clean · 343/343 · 2,974 passed (8 of them on the document) |
| `check-collide` | nothing overlaps |
| `check-contrast` | 1,286 text nodes across 11 screens, all clear |
| `qa-sweep` | clean; document 4.73× |
| `check:shots --update` | 14 of 14 re-taken |
| A4 through Chrome | 2 pages; page one is Porsche's page one |

Note for the next person: `check-contrast` and `check-shots` take `--url`,
not `HL_ORIGIN`; run against 5090 they measured a server that had since
died and said "No dev server" — with the default port in the sentence,
whichever port was asked for.

## 2026-09-15, night — the register in Porsche's language

"Now do the same Porsche treatment on the quotes register screen."
Porsche's saved-vehicles page is behind Porsche ID; the public list is
Finder (`finder.porsche.com`, driven live): a title pair at 33/400 and
26/400, the filters as chips in a white card, a results bar with the
sort, and every result a card led by the car's photograph — the name at
26/400, facts on one line separated by middots, the price large, one
black pill and one grey. No uppercase, no mono, nothing without a photo.

The register is COCKPIT — twenty rows, not twenty cards — so the rows
stay rows and the language changes: every row leads with the hull
(`QuotesScreen` rows carry the quote's frozen `subjectImage`;
`FrozenPhoto` draws it at 44px); the pipeline is chips in a card, not
two glass billboards in mono capitals; the table is a card; captions are
sentence case in the body face; the stage is a chip; the one act is the
blue pill. The title is at the display step, because the sweep put the
hero step at 4.33× and a Cockpit screen is asked for 2.5–4×; it is 2.83×
now.

| ruler | result |
|---|---|
| `check:types` · `lint` · `check:styles` | clean · 343/343 · 468/468 |
| `check-collide` | nothing overlaps |
| `check-contrast` | 1,286 text nodes, all clear |
| `qa-sweep` | clean; quotes 2.83× |
| `check:shots --update` | 14 of 14 re-taken |

## 2026-09-15, late — the customers register in the same language

"Now do the same Porsche treatment on the customers screen." Porsche has
no public register of people, so the reference is the one the quotes
register took an hour earlier (Finder): a title pair, the list a white
card on a 16px radius, every row led by a picture, sentence case, one
blue pill. A person on this sheet has no photograph, so every row leads
with their initials on a disc — `markOf`, the same function the
catalogue uses for a hull with no picture. The aurora sky behind the
page is off. The count of quotes is a chip only on a register where
somebody has been quoted; a dash in a blue chip is a chip about nothing.

The seed carries no customer register, so `tools/shot-customers.mjs`
now creates one, issues a quote to a named person, types two people in
through the screen's own form and photographs the list — the first
photograph of this screen with anybody on it. The first frame showed the
sixth thing on a quoted row wrapping under a five-track grid; six now.

| ruler | result |
|---|---|
| `check:types` · `lint` · register tests | clean · 343/343 · 66 passed |
| `check-collide` · `check-contrast` · `qa-sweep` | nothing overlaps · 1,286 clear · clean, customers 2.83× |
| `check:shots --update` | 14 of 14 re-taken |

## 2026-09-15, later — the Data register in the same language

"Now do the same Porsche treatment on the Data screen." The same
language the quotes and customers registers took: a title pair, the
doors as pills in a card, the list a white card on a 16px radius, every
row led by a mark, sentence case, no mono. A table has no photograph;
its kind has a glyph, so the kind's glyph on a disc in its own hue leads
the row where a 6px dot did. The row keeps `--row-h`: CLAUDE.md asks a
Cockpit screen for eighteen rows at 1280×800 and a 48px row gave twelve;
photographed at 1280, twenty-one are on the screen.

| ruler | result |
|---|---|
| `check:types` · `lint` · `check:styles` | clean · 343/343 · 468/468 |
| `check-collide` · `check-contrast` · `qa-sweep` | nothing overlaps · 1,286 clear · clean, data 2.83× |
| `check:shots --update` | 14 of 14 re-taken |

## 2026-09-15, last — the Rules screen in the same language

"Now do the same Porsche treatment on the Rules screen." CSS only, the
last block of `constraints.css`: a title pair across the top instead of
a column beside the content; the three views as chips in a card; every
group a card led by its kind's mark, every rule a row on a hairline
inside it — where each of sixteen rules had been its own shadowed card
with a 3px rail under a tinted band; sentence case, the rate in the body
face at one column width, the blueprint sky off. Two rules of the wide
window had to be undone by name: the `@container (min-width: 1200px)`
grid with `align-items: start` shrank every card to its content once
the sheet was a column (photographed: view chips 200px wide, the
evidence sentence one word per line), and the two-abreast group list
wrapped every sentence to four lines. The engine, the ledger and every
verdict are untouched.

| ruler | result |
|---|---|
| `check:styles` | 468/468, no orphans |
| `check-collide` · `check-contrast` · `qa-sweep` | nothing overlaps · 1,286 clear · clean, rules 3.09× |
| `check:shots --update` | 14 of 14 re-taken |
