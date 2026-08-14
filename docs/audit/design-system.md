# AUDIT — THE VISUAL SYSTEM

Lens: `docs/specs/ART_DIRECTION.md` as the binding document. Every number below
was either counted out of `src/**/*.css` / `src/**/*.tsx` by script, or read off
the running app at `localhost:5090` with `getComputedStyle` / `getBoundingClientRect`.
Nothing here is an impression.

**Conditions.** Chrome, dev server, real Northside seed (21 tables, 651 rows).
The window would not resize below the display — `resize_window` reported success
but `innerWidth` stayed **1920 × 935** on every attempt. **All in-browser
measurements below are at 1920 × 935, not 1280 × 800.** Anything that depends on
viewport width is marked *not verified at 1280*.

**Screenshots.** The browser harness in this session could capture but not write
image files to disk, so `docs/audit/screens/` holds one reproduction I generated
from source (`design-system-ticks.html`), not photographs. Every finding is
therefore carried by a file:line or a measured number instead. Where I describe
something I saw on screen and could not measure, I say so.

**Scale of the thing being audited.** 17 CSS files, **16,062 lines**, **2,078
rule blocks**. Shared foundation (`tokens.css` + `base.css`) is **340 lines —
2.1%** of it. That ratio is the finding behind most of the findings.

---

## What is in good shape — say it first, because it is unusual

These were tested and passed. They are the parts a design system would normally
have to fix, and here they do not need fixing.

- **Colour is nearly token-pure.** Raw hex outside `tokens.css`: **4 occurrences,
  2 distinct values** in 16,062 lines. Raw `rgba()` outside `tokens.css`: **3**.
  I expected dozens. Compare any codebase this size.
- **On one live screen (the view page) the whole app used 8 distinct ink
  colours** across 415 visible text elements, and 407 of those 415 were the three
  ink tiers — `#12283f` (156), `#8598ad` (139), `#4c617a` (112). The three-tier
  ink ramp is real and it holds.
- **Radius is token-driven**: 195 of ~250 `border-radius` declarations use
  `var(--radius)` / `var(--radius-sm)`.
- **`prefers-reduced-motion` is honoured app-wide.** `base.css:213` kills every
  CSS animation and transition with `!important`; `rule-nodes.css:407` adds an
  explicit `animation: none` for the one infinite animation; and both files that
  use the `motion` library gate it — `stillness.tsx:33` and `RulesPane.tsx:30`
  both call `useReducedMotion()`. There is no ungated `motion` component in the
  app. *(Code-read; I could not force the media query in this harness, so the
  rendered result is **not verified**.)*
- **The shared primitives are genuinely used**: `.mono-label` 144 times in TSX,
  `.btn` 96 times, `.block-heading` 20. The problem below is not that nobody uses
  them — it is what got built beside them.

---

## RANKED FINDINGS

Ranked by how early the reader meets them. Findings 1–3 are on the first screen
or the first two clicks; 4–9 are system damage that costs on every screen.

---

### D1 · The first screen the app draws is below its own legibility floor — including the display face, at 9.9px

**What I did.** Loaded the seeded project, landed on the sheet (the default
surface), read the transform off `.react-flow__viewport` and multiplied every
authored `font-size` by it.

**Measured, at the opening zoom of 0.33:**

| element | face | authored | **rendered** |
|---|---|---|---|
| `.tb-lod-name` (the plate's name) | **Instrument Serif** | 30px | **9.89px** |
| `.tb-lod-num` (the row count) | IBM Plex Mono | 22px | **7.25px** |
| `.tb-lod-band` (the band strip) | IBM Plex Mono | 11px | **3.63px** |
| `.tb-lod-unit`, `.tb-lod-more` | IBM Plex Mono | 11px | **3.63px** |

`.tb-lod-name` × 21 plates on screen at once.

**Why it is a breach and not a taste.** ART_DIRECTION, Typography: Instrument
Serif "**Never below 22px.**" The CSS obeys the rule — every one of the 12
`var(--font-display)` sites in the app is authored at 22px or above (I checked all
12; see D4 for the list). It is the canvas transform that breaks it, and nothing
in the system knows the transform exists.

Worse, the app has already written down the number it is violating.
`src/features/table/tableLod.ts:18`: *"Below 8.4px neither Archivo nor IBM Plex
Mono resolves — the cells are grey texture."* The plate exists **because** of
that floor. At the fit-all zoom for 21 tables, the plate's own band strip renders
at **3.63px — 43% of the floor the file was written to defend**, and the plate's
name at 9.89px is closer to the discarded cell type (8.4px) than to the 22px
display minimum.

`tableLod.ts:44` enters the plate at zoom ≤ 0.60. There is no second tier below
it. F1 in `CLUELESS_USER_TESTS.md` lowered the zoom floor to 0.04 to make FIT
work; that fixed the framing and left the plate's typography sized for the 0.5–0.6
band it was designed in.

**Evidence:** measured live (viewport transform `matrix(0.329762, …)`);
`src/features/table/table-node.css:469` (30px), `:493` / `:534` (11px);
`src/features/table/tableLod.ts:14–24, 44`.

---

### D2 · `var(--sp-7)` does not exist, so a section that should be pushed clear of the one above it has zero top margin

`src/features/constraints/constraints.css:691`

```css
.cn-wb {
  margin-top: var(--sp-7);
```

The spacing scale is `--sp-1 … --sp-6` (`tokens.css:109–114`). **`--sp-7` is
defined nowhere in the repo** — I scanned every `.css`, `.ts` and `.tsx` for both
`--name:` and quoted `'--name':` forms. An unresolved `var()` with no fallback is
invalid at computed-value time, so the declaration is dropped.

**Measured in the running app**, Business rules pane:

```
.cn-wb  margin-top: 0px      (--sp-5 resolves to 24px; --sp-7 resolves to "")
```

The block *"6 rules your workbook already states"* — the one part of that pane
that tells a person what their own price file already contains — is held off the
rule list above it by nothing but its own 24px `padding-top` and a hairline.
Reached in two clicks from cold: **Business rules → scroll**.

This is the only broken `var()` in the app. Two others resolve through a fallback:
`--tb-band-ink` (set from JSX, correct) and `--viridian` (see D6).

---

### D3 · Three different drawing systems in three stacked buttons, on the app's signature surface — and zero Phosphor in any of them

The zoom cluster at the bottom-left of the sheet, read out of the live DOM:

| button | mark | source |
|---|---|---|
| Zoom In | `<path d="M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z"/>` on `viewBox="0 0 32 32"` | **React Flow's own filled glyph** |
| Zoom Out | `<path d="M0 0h32v4.2H0z"/>` on `viewBox="0 0 32 5"` | **React Flow's own filled glyph** |
| Fit | `<path d="M1 4.2V1h3.2M7.8 1H11v3.2…"/>` on `viewBox="0 0 12 12"` | hand-drawn, `Whiteboard.tsx:138` |

Two solid filled shapes and one hairline bracket, 28px apart, in one control.
ART_DIRECTION, Illustration: "Consistent 1.25px hairline stroke matching the
chrome." `src/lib/icons.tsx:10–13`: "'light' (1.5px at 24px) matches the hairline
language of the chrome. **Never 'bold' or 'fill'** — this is a drawing office,
not a dashboard." Neither filled glyph obeys either rule, and neither is ours.

The button container is also un-restyled: `.react-flow__controls-button` computes
to **14px Archivo Variable**, while every other button in the app is 8.5–13px
mono uppercase (D7). It is a stock vendor control wearing the app's white.

Beside it, bottom-right, `.react-flow__attribution` renders **"React Flow" at 8px
mono in `rgba(217,230,247,0.34)`** — a **2.52 : 1** contrast against
`--canvas-bg`, below the 3:1 floor for any text at any size. It has been dressed
in the house micro-label style rather than removed, so someone chose to keep a
vendor's brand name permanently pinned to the drawing field, at a size at which
it cannot be read.

---

### D4 · The Archivo width axis — the mechanism ART_DIRECTION names for every stamp and title-block caption — is not loaded, so all 21 declarations are dead

ART_DIRECTION, Typography: UI face is Archivo, "**Use the width axis
(`'wdth' 118`) + uppercase for stamps and title-block captions.**"

`src/main.tsx:3` imports `@fontsource-variable/archivo`, which resolves to that
package's `index.css`. That file loads `archivo-latin-**wght**-normal.woff2` —
the **weight-axis-only** cut. The package ships `wdth.css` and
`archivo-latin-wdth-normal.woff2` alongside it; nothing imports them.

**Measured in the page** after `document.fonts.ready`, same string, 40px, weight
640, uppercase:

```
font-variation-settings: normal      → 697.16px
font-variation-settings: 'wdth' 112  → 697.16px
font-variation-settings: 'wdth' 118  → 697.16px
font-variation-settings: 'wdth' 62   → 697.16px
```

Identical to two decimal places at an axis extreme. The axis is inert.

**21 declarations across 12 files are no-ops**, including `.block-heading` in
`base.css:86` — the shared primitive itself — plus 16× `'wdth' 118` and 5×
`'wdth' 112` in `datagrid`, `io`, `quote`, `review`, `rules`, `table`,
`table-node`, `tablekit`. One line in `main.tsx` turns all 21 back on. Until it
does, the app has a two-value width language on paper and one width in the
rendering.

---

### D5 · The type scale is 29 sizes wide, and half-pixel steps are doing real work

Counted out of `src/**/*.css`: **35 authored `font-size` values** — 4 of them
`pt` inside `@media print` (`quote.css`, legitimate), leaving **29 fixed px sizes
plus 2 `clamp()` ramps** for the screen:

```
7 · 8 · 8.5 · 9 · 9.5 · 10 · 10.5 · 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · 15
15.5 · 16 · 17 · 19 · 20 · 21 · 22 · 24 · 28 · 30 · 32 · 34 · 36 · 38
+ clamp(26px, 2.8vw, 32px) · clamp(28px, 3.4vw, 38px)
```

**Fifteen of them appear on a single screen.** Live count on the view page, 415
visible text elements:

```
8px(1) 8.5px(48) 9px(2) 9.5px(5) 10px(59) 10.5px(1) 11px(144) 11.5px(2)
12px(70) 13px(16) 13.5px(2) 15px(1) 22px(42) 30px(21) 38px(1)
```

Note the singletons: 8px, 10.5px, 15px, 38px each used **once**, and 9px twice,
11.5px twice, 13.5px twice. Six sizes exist on that screen to serve nine
elements. The half-pixel tier (8.5 / 9.5 / 10.5 / 11.5 / 12.5 / 13.5 / 15.5) is
**7 of the 29** and carries 71 declarations — these are not rounding accidents,
they are deliberate one-offs, which is exactly how a scale stops being a scale.

**The display-face rule itself is kept.** All 12 `var(--font-display)` sites are
≥ 22px: `shell.css:894` (clamp 28–38), `constraints.css:78` (34), `:663` (24),
`:703` (22), `designer.css:1399` (22), `onboarding.css:131` (32), `:266` (36),
`quote.css:177` (24), `:575` (28), `table-node.css:469` (30), `views.css:123`
(38), `:1010` (24). Twelve sites, **seven different sizes** — 22, 24, 28, 30, 32,
34, 36, 38 (eight, with the clamp top). A display face with eight sizes is a
display face with no scale. (And see D1 for what happens to `table-node.css:469`
in the transform.)

**One measured inversion worth a decision, not a fix.** On the view page,
**309 of 415 text elements (74%) render in IBM Plex Mono**, 84 in Archivo, 22 in
Instrument Serif. ART_DIRECTION assigns Archivo "buttons, labels, table text" and
mono "every number, code, SKU, micro-label". Three quarters mono means the *chrome*
has migrated into the data face — the 106 mono stamps of D7 are where it went.
Whether that is drift or the actual house voice is a call for the author; it is
not what the document says.

---

### D6 · The accent palette carries four unrelated meanings at once, and two of them collide on screen

`tokens.css` assigns the same seven hues three times over, at **identical hex
values**:

| hue | as an entity accent | as a field type | as a status |
|---|---|---|---|
| `#c2402f` | `--accent-carmine` | `--type-reference` | **`--red`** — "the reviewer's pencil" |
| `#157a52` | `--accent-viridian` | `--type-boolean` | the OK stamp |
| `#1d55c4` | `--accent-blue` | `--type-number` | `--blue` — focus, selection, hover |
| `#a87a18` | `--accent-ochre` | `--type-date` | — |
| `#6a4bc4` | `--accent-violet` | `--type-select` | — |
| `#0e7d8a` | `--accent-teal` | `--type-formula` | — |

ART_DIRECTION, Palette: "**One deliberate accent: carmine (`--red`), used
sparingly** — the reviewer's pencil, a required mark, a live count. Everything
else is ink, hairline and paper."

`src/types/model.ts:17–28` makes carmine one of seven freely assignable table
accents, and the seed uses it. `src/demos/northside.ts:672, 748, 829, 900, 977,
1032, 1127` — every boat table's **"Motor Envelope"** band is `accent: "carmine"`.
Nothing is wrong with those columns.

**Measured on one screen** — What fits what → Motor fitment — Highfield → RUN:

- the `YAMAHA OUTBOARDS` column stamps render `rgb(240,131,111)` =
  `--accent-carmine-bright`, i.e. the bright cut of the reviewer's red, on a
  healthy source table;
- **on the same screen**, the rule's own health stamp renders `rgb(21,122,82)` =
  `--accent-viridian`, i.e. the "everything is fine" green, which is also an
  assignable table accent;
- and the node palette adds a fourth meaning: `Match` and `Output` are washed
  carmine as a *node kind*, so the two largest plates in the drawing are red.

So on one screen carmine means "this table", "this node type" and "look here,
something is wrong", and green means "OK" and "this table". Sparing is not the
word for it. **Nothing here is a rendering bug** — every value resolves correctly.
It is a semantics collision, and it costs the palette the one thing ART_DIRECTION
says makes the product feel expensive.

**Second green, literally.** `src/features/constraints/constraints.css:745` and
`:768` read `var(--viridian, #2f6f5e)`. **`--viridian` is defined nowhere** — the
token is `--accent-viridian`. So the fallback always wins. Forced the state in
the live DOM and restored it:

```
.cn-wb-item.is-here  border-left / status ink  →  rgb(47, 111, 94)   #2f6f5e
--accent-viridian                              →  rgb(21, 122, 82)   #157a52
```

Two greens, one job — the "this rule is checked here" state in the Business rules
pane is painted in a colour that exists in no token file. Not currently visible
on the seed (0 items in `is-here`, 2 `is-elsewhere`, 4 `is-pending`), so it is
latent, not live.

---

### D7 · The same visual object is built between 4 and 47 times, and every rebuild drifts

This is where the 2.1% shared / 97.9% local ratio shows up. Each row below is a
script count over parsed CSS blocks, not a guess.

**a) Buttons — 47 recipes.** One shared `.btn` (`base.css:100`) and **46 bespoke
button recipes** (own `padding` + `border` + `font-size` + `cursor:pointer`) in
14 files. Across the 47: **29 distinct paddings, 10 distinct font-sizes, 9
distinct letter-spacings.**

Sample the same button in three modules:

```
src/styles/base.css:100                 .btn         pad 6px 12px    fs 11px    ls 0.1em    r var(--radius)
src/features/whiteboard/whiteboard.css:815 .wb-run-btn  pad 4px 12px  fs 9px     ls 0.14em   r var(--radius-sm)
src/features/constraints/constraints.css:349 .cn-add   pad 8px 16px   fs 10px    ls 0.14em   r var(--radius)
src/features/views/views.css:173        .vw-gear     pad 7px 12px    fs 10px    ls 0.14em   r var(--radius)
src/features/rules/rules.css:1332       .rl-tab      pad 5px 10px    fs 10px    ls 0.1em    r var(--radius) var(--radius) 0 0
src/features/table/table.css:1324       .tb-addbtn   pad 2px 10px 2px 7px  fs 9.5px  ls 0.12em  r var(--radius-sm)
```

`.tb-addbtn`'s `2px 10px 2px 7px` is asymmetric horizontal padding on a button —
a hand-nudge that no scale would produce.

**b) The mono stamp — 106 re-declarations.** `.mono-label` (`base.css:74`, 10px /
0.14em) is used 144 times in TSX, and **106 CSS blocks independently re-declare
the same recipe** (`font-mono` + `uppercase` + `letter-spacing`), spread across
**8 sizes** (8, 8.5, 9, 9.5, 10, 10.5, 11, 12) and **11 letter-spacings**
(0.08 · 0.1 · 0.12 · 0.13 · 0.14 · 0.16 · 0.18 · 0.2 · 0.26 · 0.28 · 0.3em).
Two of the 106 are byte-identical to `.mono-label` itself —
`table.css:361 .tb-count-label` and `datagrid.css:548 .dg-plate-title` (which is
also byte-identical to `table.css:2608 .tb-plate-title`).

**c) The registration tick — 11 implementations.** This is the one that hurts,
because ART_DIRECTION lists "**Registration ticks** — corner crosses where a plate
is pinned" as a load-bearing element of the language.

| file:line | class | size | stroke | offset | ink | shape |
|---|---|---|---|---|---|---|
| `app/shell.css:61` | `.shell-tick` | **11px** | 1px | −6 | `--hairline-strong` | **full cross** (`::before`/`::after`) |
| `features/constraints/constraints.css:37` | `.cn-tick` | 9px | 1.25px | −1 | `--hairline-strong` | L-corner, 2 corners |
| `features/quote/quote.css:47` | `.qt-tick` | 9px | 1.25px | −1 | `--hairline-strong` | L-corner, 2 corners |
| `features/views/views.css:62` | `.vw-tick` | 9px | 1.25px | −1 | `--hairline-strong` | L-corner, 2 corners |
| `features/review/review.css:17` | `.rv-tick` | 9px | **1px** | **−4** | **`currentColor`** | L-corner, 2 corners (tl/br) |
| `features/data/datagrid.css:567` | `.dg-tick` | 10px | 1.5px | −6 | `--hairline-strong` | L-corner, 4 corners |
| `features/table/table.css:2628` | `.tb-tick` | 10px | 1.5px | −6 | `--hairline-strong` | L-corner, 4 corners |
| `features/onboarding/onboarding.css:56` | `.ob-tick` | **8px** | 1.5px | **−5** | `--canvas-ink-faint` | L-corner, 4 corners |
| `features/io/io.css:50` | `.io-tick` | **8px** | **1px** | **+4 (inside)** | **`--blue` @ 0.5** | L-corner, 4 corners |
| `features/whiteboard/whiteboard.css:93` | `.wb-tick` | **7px** | 1.5px | −4 | `--canvas-ink-soft` | L-corner, 4 corners |
| `features/table/table-node.css:413` | `.tb-lod-ticks i` | **12px** | 1.5px | **+8 (inside)** | `--hairline-strong` | L-corner, 4 corners |

**6 sizes (7·8·9·10·11·12px), 3 stroke weights (1·1.25·1.5px), 5 offsets
(−6·−5·−4·−1·+4·+8), 3 inks, and one of the eleven is a different shape
entirely.** `docs/audit/screens/design-system-ticks.html` reproduces all eleven
side by side from their own CSS.

**d) Empty states — 48 selectors, 11 independent implementations, 2 obey the type rule.**
`^\.[a-z-]*(empty|void|nothing|none|blank|noflow|nofields)` matches **48
selectors in 11 files**, sharing no markup. ART_DIRECTION names "empty-state
title" as one of exactly three jobs for Instrument Serif. Two of them do it:
`constraints.css:661 .cn-void-title` (24px) and `views.css:1009 .vw-nothing-line`
(24px). The rest set their titles in mono 8–10px (`shell.css:309`, `io.css:174`,
`rules.css:85`, `table.css:2072`) or Archivo 11–13px (`shell.css:675`, `:829`,
`rules.css:311`, `views.css:661`, `:768`, `quote.css:282`, `table.css:2375`). I
saw this live on **What fits what** with nothing selected: the empty state is two
paragraphs of 13px body text and no title at all.

**e) Exact byte-for-byte duplicates across files — 21 blocks.** Found by hashing
sorted property sets (≥4 props). Notable pairs, each a place where two modules
independently drew the same object:

```
data/datagrid.css:418  .dg-check          ≡  table/table.css:2119  .tb-check
data/datagrid.css:439  .dg-check-mark     ≡  table/table.css:2146  .tb-tickglyph
data/datagrid.css:473  .dg-fx-err         ≡  table/table.css:2089  .tb-fx-err
data/datagrid.css:135  .dg-th-ro          ≡  table/table.css:858   .tb-th-ro
data/datagrid.css:567–597 .dg-tick*(5)    ≡  table/table.css:2628–2658 .tb-tick*(5)
table/table-node.css:141 .tb-node-port    ≡  whiteboard/whiteboard.css:603 .wb-port
table/table-node.css:742 .tb-rs-handle    ≡  whiteboard/whiteboard.css:670 .wb-rs-handle
rules/rules.css:14     .rl-panel-head     ≡  table/table.css:2275  .tb-menu-head
quote/quote.css:516    .qt-doc-org        ≡  styles/base.css:84    .block-heading
```

`datagrid.css` ↔ `table.css` alone share **10 identical blocks** — two grids, one
of them a copy.

**f) Two chip geometries.** 88 single-class chip recipes: 78 use the token radius
(2–3px, the drawing-office corner), **3 are 999px pills** —
`designer.css:860 .ds-fx-chip`, `rules.css:391 .rl-joiner`,
`views.css:854 .vw-fchip` — and 7 are something else. A fully-rounded pill in a
field of 2px corners reads as a different product.

**g) Hairline width — the one number ART_DIRECTION states, kept 13% of the time.**
"Consistent **1.25px** hairline stroke." Across the hand-authored SVGs:
`strokeWidth` takes **10 distinct values** — 1 (×16), 1.2 (×10), **1.25 (×6)**,
0.9 (×3), 1.9 (×2), 1.6 (×2), 1.3 (×2), 1.1 (×2), 1.5 (×1), 1.4 (×1). The
specified value is used in **6 of 45** cases. CSS borders are equally split: 1px
(×364), 1.5px (×56), **1.25px (×12)**.

---

### D8 · The icon register exists, is imported, and its central rule is broken more often than it is kept

`src/lib/icons.tsx:10–13` is unambiguous: light for chrome, thin at display
sizes, "**Never 'bold' or 'fill'**".

Counted across `src/**/*.tsx`:

```
weight="light"    31
weight="thin"      1
weight="regular"   1
weight="bold"     32     ← banned
weight="fill"      5     ← banned
```

**37 banned weights against 32 compliant ones.** Locations: every stage's back
arrow (`DesignStage.tsx:54`, `FlowStage.tsx:153`, `QuoteStage.tsx:83`,
`RulesStage.tsx:38`, `ViewStage.tsx:102`), all of `QuoteEditor.tsx` (8 sites),
`BlockCard.tsx` (4), `ViewPage.tsx` (4), `AddPanel.tsx` (2), `RuleOffer.tsx` (2),
`LeftPanel.tsx` (2), `WorkbookRuleList.tsx:70` (`weight="fill"`), and the four
`Star weight="fill"` in quote/views.

The sharpest one: **`ViewPage.tsx:265`**

```tsx
{configuring ? <Check size={16} weight="bold" /> : <Gear size={16} weight="light" />}
```

The same 16px button changes stroke weight when you toggle it.

**The register is also bypassed for size.** `ICON_SIZE` is `{13, 16, 22, 40, 56}`
and is imported by 26 files (91 uses) — good adoption. But **37 icons carry a raw
`size={n}`**, of which **22 are off the ladder entirely**: `size={12}` ×8,
`size={11}` ×7, `size={14}` ×3, `size={17}` ×2, `size={30}`, `size={10}`.

**And it is bypassed wholesale for the mark itself.** `@phosphor-icons/react` is
imported **directly in 24 files**, never through `@/lib/icons` — which is
defensible, since the register only exports table-kind and industry marks. The
consequence is that the same idea is drawn by different hands:

| idea | hand-drawn SVG | Phosphor | count |
|---|---|---|---|
| **close** | `app/Inspector.tsx:13` and `rules/RuleResultsRail.tsx:29` — *byte-identical path* `M1.5 1.5 8.5 8.5 M8.5 1.5 1.5 8.5`, strokeWidth 1.2 | `X` in `Tokens.tsx`, `FieldRow.tsx`, `AddPanel.tsx`, `ViewPage.tsx`, `QuoteEditor.tsx` | **2 marks** |
| **plus** | `tablekit/TableTypeRail.tsx:38`, `tablekit/NewTableDialog.tsx:94` — strokeWidth 1.25 | `Plus` in 6 files, mostly `weight="bold"` | **2 marks** |
| **back** | `onboarding/Onboarding.tsx:31` — strokeWidth 1.25 | `ArrowLeft` ×5 stages (all `weight="bold"`), `ArrowUUpLeft` ×2 | **3 marks** |
| **checked** | `data/Cell.tsx:194` strokeWidth **1.9**; `table.css:2146 .tb-tickglyph` | `Check` ×4 (`weight="bold"`), `CheckCircle` (`weight="fill"`) | **4 marks**, plus a literal `✓` character rendered in `.rl-dotstamp` |

Hand-authored SVG is *permitted* by ART_DIRECTION — but as "small technical
plates… traced from a manufacturer's spec sheet", which `onboarding/symbols.tsx`,
`table/glyphs.tsx` and `rules/RuleNodes.tsx:32` (the red-pencil ellipse) genuinely
are. A 10×10 `×` is not a plate; it is an icon the register already owns.

---

### D9 · One animation runs forever, next to the answer the user is reading

`src/features/rules/rule-nodes.css:399`

```css
.rl-edge--live .react-flow__edge-path { animation: rl-flow 900ms linear infinite; }
```

**Measured after pressing RUN** on the seeded motor rule (173 rows returned):

```
live edges: 2
animation: rl-flow · playState "running" · duration 900ms · iterations Infinity
document.getAnimations() running: exactly these 2
```

ART_DIRECTION, Motion rule 2: "**Nothing moves while the user is working.** Once a
table has focus, motion stops." Rule 3: ambient motion is "for empty fields…
**never behind content**." A run puts a 173-row table on the right of the stage
and two crawling dashed wires immediately to its left, and they do not stop —
there is no timeout, no `is-reading` state, no stillness gate. It is the only
infinite animation in the app, so this is a one-line policy hole, not a pattern.

**The stillness policy itself is scoped to one feature.** `StillnessProvider` is
mounted in exactly one place — `src/features/views/ViewPage.tsx:59` — and
`useStillness` / `transitionFor` are used only by the four files in
`src/features/views`. `src/features/constraints/RulesPane.tsx` is the only other
`motion` consumer; it honours `useReducedMotion` but knows nothing about the
typing gate. So "nothing moves while the user is working" is, today, a rule of
`src/features/views`, not of the app. Nothing outside views is *currently*
violating it beyond D9 — but the mechanism that would stop it is not there.

Separately, `rule-nodes.css:33` gives **every** rule plate
`animation: sheet-in var(--t-med) both`, so all three plates of a rule animate
together on mount. I judged that compliant with rule 1 ("one orchestrated moment
per screen") rather than a violation, but note it.

---

## Spacing rhythm — the scale holds two thirds of the time

Counted per file: `var(--sp-N)` uses vs raw px in `padding` / `margin` / `gap`.

| file | tokens | raw px | |
|---|---:|---:|---|
| `features/rules/rule-nodes.css` | **1** | **36** | 3% |
| `features/whiteboard/whiteboard.css` | **8** | **65** | 11% |
| `features/table/table-node.css` | 26 | 27 | 49% |
| `app/shell.css` | 89 | 75 | 54% |
| `features/rules/rules.css` | 95 | 60 | 61% |
| `features/review/review.css` | 38 | 18 | 68% |
| `features/tablekit/tablekit.css` | 43 | 17 | 72% |
| `features/designer/designer.css` | 107 | 37 | 74% |
| `features/table/table.css` | 114 | 38 | 75% |
| `features/views/views.css` | 93 | 26 | 78% |
| `features/constraints/constraints.css` | 52 | 23 | 69% |
| `features/quote/quote.css` | 89 | 13 | 87% |
| `features/data/datagrid.css` | 25 | 2 | 93% |
| `features/io/io.css` | 35 | 3 | 92% |
| `features/onboarding/onboarding.css` | 36 | 1 | 97% |
| `styles/base.css` | 0 | 7 | — |
| **total** | **851** | **448** | **66%** |

The 448 raw values break down as: **362 off the scale entirely** —
1px(45) 2px(68) 3px(39) 3.5px(1) 5px(61) 6px(62) 7px(23) 9px(16) 10px(19)
11px(11) 13px(2) 18px(2) 20px(1) 21px(1) 22px(1) 26px(2) 28px(1) 34px(2) 36px(1)
40px(2) 48px(1) — and **86 that hit a token value but were typed as a number**
(4px ×52, 8px ×26, 12px ×6, 16px ×2).

**Two files are the real story.** The canvas modules — `rule-nodes.css` (3% token
use) and `whiteboard.css` (11%) — are essentially outside the spacing system. That
is arguably defensible: geometry on a transformed canvas is measured in drawing
units, not chrome spacing. It is not stated anywhere, and the two files sit beside
`table-node.css` at 49%, which is on the same canvas and half-in. There is either a
rule here that nobody wrote down, or there is none.

**Two small leaks worth naming.** `base.css:57` and `:64` set the app's scrollbar
to `rgba(28, 37, 49, 0.28)` — a grey-blue that is **not** `--ink` (`#12283f` =
`rgb(18,40,63)`) and appears in no token. Every scrollbar in the app is drawn in
an ink the palette does not contain. And `base.css:65` sets the thumb radius to a
raw `4px` where the tokens are 2 and 3.

---

## Dark / light — what sits on the navy

Checked deliberately, because it was the brief. Two things to report, one of them
a non-finding I want on record so nobody "fixes" it.

**Not a defect — the polarity inversion is intentional and documented.** The sheet
pins **white** cards to the navy; the rules canvas paints **dark tinted** plates on
the same navy. I was ready to call this the biggest coherence break in the app
until I read `src/features/rules/rule-nodes.css:1–8`:

> "Everything in this file is drawn on the navy canvas, so it uses `--canvas-*`
> inks and the BRIGHT accent variants only. **White paper belongs to entities;
> logic is a tinted plate** with a notched left edge."

Two materials, deliberately distinguished. I could not fault the execution: on the
flow canvas every text child overrides the inherited ink to a `--canvas-*` value,
and I found no element rendering `--ink` on a dark plate. *(Checked by walking
`.rl-node *`; my automated contrast sweep gave false numbers because the navy is
painted by a `background` shorthand my compositing walk did not resolve, so the
**contrast ratios on the flow canvas are not verified** — only the ink-family
assignment is.)*

**The one measured failure on the canvas** is D3's attribution: **2.52 : 1**.

**Not tested:** the onboarding screens (they sit on the canvas per
`onboarding.css:266, 271` using `--canvas-ink`, but reaching them needs a wiped
profile and I did not wipe the user's data); the minimap; the canvas at 1280×800.

---

## Two observations outside the lens, recorded because I saw them

Neither is a design-system finding. Passing them to whoever owns them.

1. **Two React Flow instances are mounted at once.** On the rules stage,
   `document.querySelectorAll('.react-flow')` returns **2** and
   `.react-flow__node` returns **24** — the sheet's 21 table nodes are still
   mounted and composited behind the rule canvas's 3 plates. Two live viewport
   transforms measured simultaneously: `matrix(0.329762, …)` and
   `matrix(0.839188, …)`.

2. **The rule drawing renders empty for a beat.** Clicking "Motor fitment —
   Highfield", my first screenshot showed a completely empty navy canvas with the
   inspector already reading "MOTOR FITMENT — HIGHFIELD · 3 NODES". The next
   screenshot, seconds later, showed all three plates correctly framed. So the
   opening frame is transiently blank, not wrong. Related to F13 but not the same
   thing. **Not reproduced a second time** — one occurrence only.

3. **One plate on the sheet is 1.85× its 20 peers.** All `.tb-lod` plates measure
   171 × 104 except *Dunbier / Haines BMT Trailers* at **317 × 197**, which
   overlaps the plate below it. Comes from the seed's stored node size, not from
   CSS.

---

## If only three things get done

1. **`main.tsx` — import the `wdth` axis** (D4). One line. It turns on 21 dead
   declarations and the width language ART_DIRECTION is built on, everywhere at
   once.
2. **Add a second LOD tier below ~0.45** so the plate's name and band strip stay
   above the 8.4px floor `tableLod.ts` already defines (D1). This is the first
   screen and it is currently unreadable at the zoom the app itself chooses.
3. **Promote the tick, the stamp and the button into `base.css`** (D7 a/b/c).
   Eleven ticks, 106 stamps and 47 buttons is 164 places one change has to be made
   in. The primitives are already there and already popular (144 / 96 uses) —
   what is missing is a tick primitive and the discipline to stop re-deriving the
   other two.

`--sp-7` (D2) and `--viridian` (D6) are two-character fixes and should ride along.
