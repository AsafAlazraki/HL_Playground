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
