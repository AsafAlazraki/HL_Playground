# The rebuild, measured

`visual-qa-2026-09-09.md` is the scoreboard this answers. Same rulers,
driven in real Chrome against the real Northside seed — 53 tables, 15,691
rows, 25 modules — from an empty browser profile every run.

**Reproduce it:**

```bash
npm run dev                                   # in one terminal
node tools/shot-picker.mjs --at 1280x800      # picker -> place -> mint
node tools/shot-build.mjs  --at 1280x800      # the configurator
```

`tools/drive.mjs` holds the four rulers all of them share: the ramp
(largest ÷ smallest visible type, and how many steps are in use), the
mid-word check, the composited contrast sweep, and the sign-in-and-seed
that every run starts from.

---

## The scoreboard, 1280×800

| screen | register | ratio before | ratio after | unit before | unit after |
|---|---|---|---|---|---|
| Home | none → **showroom** | 3.09× | **6.86×** | 4 tiles, ragged, 3 photos | 4 tiles, one height, plate under each |
| Picker | none → **showroom** | 3.68× | **6.86×** | 6 card heights, 0 photos | one height, 14 of 18 photographed |
| A place | none → **showroom** | 3.09× | **6.86×** | 50 rows, capped, 56px | 67 model cards, one height |
| A catalogue | none → **showroom** | 2.45× | **6.86×** | 5 text links, 0 stock in view | 67 model cards, 7 bands |
| Data | none → **cockpit** | 3.09× | **2.82×** | 6 cards in 800px | 53 tables, **18 in view** |

Cockpit's band is 2.5–3.2×, so Data going **down** is the screen passing,
not failing. A screen somebody reads for an hour must not have a 75px
word on it; a screen somebody is sold from must.

At 1024×768 the Showroom screens measure 6.07× and at 1440×900 7.36× —
the width where `visual-qa-2026-09-09` found the configurator's advantage
vanishing entirely (3.17×) now holds.

## Contrast

Every text leaf composited against the ground it is actually drawn on:
`color(srgb …)` parsed as well as `rgb()`, the full ancestor chain
composited, translucent ink composited over that ground, `aria-hidden`
skipped.

| screen | leaves checked | under 4.5:1 |
|---|---|---|
| Home | 16 | 0 |
| Picker | 70 | 0 |
| A place | 221 | 0 |
| A catalogue | 219 | 0 |
| Data | 194 | 0 |

**Four defects found by running it, three of them introduced by this
rebuild and one shipped:**

- `.qp-group-count`, `.qp-off-count`, `.pl-series-count` — 2.44:1 and
  2.58:1, all `--fg-quaternary`, which `system.css`'s own ink table
  labels "3.21:1 ← does NOT clear 4.5 … never a word that matters". A
  count of places is a word that matters.
- `.ui-row-meta` on the **current** row — 4.37:1. That is the count
  beside the rail's selected item, on every screen, because something is
  always current. `row.css` measured `--fg-tertiary` at 4.80:1 over
  `--accent-wash` and that is true; it never measured the
  `--accent-wash-strong` the same row takes on hover. A pair that clears
  only while the pointer is elsewhere does not clear.

## Truncation

Zero mid-word cuts on all five screens, at all three widths.

**The ruler had a hole in it exactly the shape of the defect it exists to
find**, and it is worth recording because it means every "clean" reading
before 2026-09-13 was weaker than it looked:

1. it asked only for `text-overflow: ellipsis`, so a **hard clip** —
   `overflow: hidden` with `white-space: nowrap` and no ellipsis — was
   invisible to it. A hard clip is the worse of the two: an ellipsis at
   least says a string was cut.
2. it only looked at elements with **no children**, so a cell holding a
   kind dot *and* a name was never examined.

The rebuilt Data screen tripped both at once and was reported clean while
cutting **23 table names dead** ("Highfield × Yamaha — Moto"). Both holes
are closed; re-run against the screens already shipped, still zero.

## What the numbers do not cover

- **The configurator** (`BuildScreen`) is rebuilt and driven by
  `shot-build.mjs`, but is not in the table above — it was measured
  before this doc existed and wants a re-run.
- **The quote document** is not rebuilt. Measured by eye it is the most
  finished screen in the app; it still prints an undecoded colourway
  ("Highfield - ADV7 (HYP) B-G-B") on the page a customer is handed.
- **Rules, fitment, review, customers, admin and onboarding** are not
  rebuilt and not measured here.
- **Whether a screen makes sense is a person's job**, still.

## The two defects that were not about looking

Both were found by driving the app rather than by reading it, and neither
would have been caught by any ruler above.

**`.pk` already belonged to something else.** The picker took `.pk` for
its root, and `src/features/picker/picker.css:11` has owned that class
since the app replaced its two native `<select>`s. The screen silently
inherited `display: inline-flex`, `align-items: center`, `height:
var(--h-md)`, a border and a background — which is why its groups were
shrink-to-fit and its cards came out at nine different heights. Renamed
`qp-`. Every prefix since has been checked against `src` before use.

**Two screens were cut in half.** `.shell-stage` is `overflow: hidden`
and hands every stage a box of exactly the window's height; each screen
owns its own scrollport. The rebuilt picker did not, so of 3,936px of
content in an 800px box, four of five module groups and every refusal
were unreachable — no scrollbar, no wheel, nothing.
