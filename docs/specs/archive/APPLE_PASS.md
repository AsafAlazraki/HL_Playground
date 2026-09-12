> **SUPERSEDED.** This describes "The Chart Room" - the navy blueprint field,
> the Instrument Serif display face, and the glass pass - which was replaced by
> **Quiet Precision** in the redesign. It is kept for history and for the
> reasoning in it, which is still worth reading.
>
> **The current rules are `docs/specs/DESIGN_PRINCIPLES.md`.** Where this file
> and that one disagree, that one wins.

# THE APPLE PASS — MATERIALS, TYPE, RESPONSE, MOTION

> One plan, six steps, five slots. It decides four systems and refuses a
> fifth. Every number in it was re-derived in this session against the tokens
> and stylesheets at `4b1ece3`; where a survey and the brief disagreed, the
> arithmetic is shown rather than asserted.

`docs/specs/ART_DIRECTION.md` still governs identity and is not amended by this
document. White chrome over the navy blueprint, the 10px uppercase letterspaced
mono micro-label, Instrument Serif for display at 22px and up, IBM Plex Mono for
data, Phosphor icons only through `src/lib/icons.tsx`, and industry-neutral in
the frame. What follows changes **how surfaces are made**, not what the product
is. Hairlines give way to material edges on exactly four surfaces, named below,
and nowhere else.

The owner asked for the glass by name. Section 12 of `apple-design` is therefore
a directive here and not an option. It is also the easiest thing in this pass to
do badly, so the roster is short on purpose: **four surfaces take a material,
and everything else stays paint.** An app where everything is glass has no
hierarchy left, and the reason is arithmetic, not taste — see §1.5.

**Operational note before anything else.** The dev server is on
`http://localhost:5091`, not 5090. Two of the four surveys hit `ECONNREFUSED` on
5090 and lost time to it; 5091 is the only Vite listener.

---

## 0 · WHAT WAS MEASURED, AND WHERE THE BRIEF'S NUMBERS MOVED

Re-counted directly over `src/` in this session. The brief's direction is right
everywhere; three of its magnitudes were low, and the corrected figures change
what the work is.

| the brief said | measured | what the correction means |
|---|---|---|
| `:active` rules — 1 | **16** | but only **one** (`base.css:125` `.btn:active`) serves the shared foundation. The other fifteen are one-off leaf rules, **three of which cancel feedback** (`transform: none`) and one of which presses *upward*. The honest statement is: one press rule serves the design system, and 99.5% of pressable surfaces were decided as "nothing." |
| `backdrop-filter` — 0 | **0** | confirmed |
| `prefers-reduced-transparency` — 0 | **0** | confirmed |
| `prefers-contrast` — 0 | **0** | confirmed |
| `prefers-reduced-motion` — 7 | **7** | confirmed, and it is done well. Extended, not touched. |
| spring configs — 3 | **2 real + 1 inline copy** (`RulesPane.tsx:117` re-types `SPRING`) | the copy is drift, not a third opinion |
| CSS transitions — 15 | **151 declarations / 297 property entries** | and the vocabulary is one easing curve and effectively two durations. That restraint is an asset. Zero `transition: all`. Zero transitions on layout properties. **This part of the app is already right and this pass barely touches it.** |
| distinct font-size values — 13 | **35 authored** (31 screen px, 2 `clamp()`, 4 print `pt`) | the display face alone carries **8 sizes across 12 sites** |
| distinct letter-spacing — 17, all positive | **25 distinct** (24 non-zero, `0`, `inherit`) — **all positive** | direction exactly right; magnitude low |
| negative tracking on display — 0 rules | **0** | the finding, and unarguable |
| distinct line-height — (not counted) | **24**, with **eight coexisting at 13px** | hierarchy is a set, and this set has no order |

Two further facts that were verified and that decide work below:

- **Only the 400 cut of Instrument Serif is loaded** (`main.tsx:4-5`). One display
  site — `.cn-wb-title`, `constraints.css:701` — is an `<h3>` that never resets
  `font-weight`, so the UA `bold` applies and Chrome **synthesises** it by
  smearing the 400 outline. It is the single type defect in the app, as opposed
  to a calibration.
- **Archivo's `wdth` axis is inert.** `main.tsx:3` imports
  `@fontsource-variable/archivo`, whose `index.css` declares `font-weight: 100
  900` and no `font-stretch`. The package ships `wdth.css` — which carries both
  axes (`font-weight: 100 900; font-stretch: 62% 125%`) — and it is never
  imported. **21 `'wdth' 118` declarations across 10 files are no-ops**,
  including `.block-heading` in `base.css:86`, which is the primitive
  `ART_DIRECTION.md` builds its stamp language on.

---

## 1 · THE GLASS SYSTEM

### 1.1 · The finding that sets the roster

**The masthead and the left panel, as they stand today, cannot be glass, because
there is nothing behind them.**

`.shell-masthead` (`shell.css:108`, `flex: 0 0 56px`) and `.shell-panel`
(`shell.css:247`, `flex: 0 0 260px`) are flex *siblings* of the stage:
`.shell-root` is `flex-direction: column` holding `<TopBar />` then
`.shell-body`, and `.shell-body` is a row holding the panel and `.shell-stage`
(`Shell.tsx:173-197`). Nothing scrolls under either. Blur their backdrop and
Chromium resolves `.shell-root { background: var(--paper) }` — a flat `#f2f6fb`
— at the full price of the blur. Uniform input, uniform output, no information.

That is the exact failure the brief warns about, and the two most tempting
surfaces in the app are the two that fail it. The fix is therefore **not a
declaration, it is a layout change**, and this pass makes exactly one of them:

> **DECISION.** The left panel stops being a flex track and floats over the
> blueprint. The masthead does not move.

The panel earns it three ways. It is on screen whenever the sheet is, which is
most of a working session. Behind it is the one thing that makes white glass
legible — a ground twelve stops darker, which separates at **11.5:1** where the
same material over `--paper` separates at **1.07:1**. And a translucent sidebar
over a document is the canonical macOS material moment, which is what the owner
asked for in their own words.

The masthead stays solid and that is a decision with a reason, not an omission.
It is the app's fixed datum — the title block of a drawing — and a title block
that floats is not a title block. It is also the only surface guaranteed present
on every stage, including the five `--paper` stages where glass would measure
1.07:1 and stop being a surface at all. One floating chrome layer and one fixed
frame is a hierarchy; two floating layers is a mood.

### 1.2 · The legibility problem, solved with numbers

Composite ground is sRGB `src-over`: `α·#ffffff + (1−α)·backdrop`. The worst
backdrop in the app is `--canvas-bg-deep #0d2740` (the vignette at the edge of
the sheet); the best is a white table card panned underneath. WCAG relative
luminance throughout. Re-derived this session; the token file's stated baseline —
`--ink` / `--ink-soft` / `--ink-faint` at **14.99 / 8.52 / 5.36** on white —
reproduces exactly to two decimals.

| α | ground over `#0d2740` | `--ink` | `--ink-soft` | `--ink-faint` | soft's swing, navy → white card |
|---|---|---|---|---|---|
| 0.70 | `#b6bec6` | 7.99 | 4.54 | 2.86 | 3.98 |
| 0.74 | `#c0c7cd` | 8.77 | 4.98 | 3.14 | 3.54 |
| 0.78 | `#cacfd5` | 9.59 | 5.45 | 3.43 | 3.07 |
| **0.82** | `#d3d8dd` | **10.46** | **5.95** | 3.74 | **2.57** |
| **0.86** | `#dde1e4` | **11.38** | **6.47** | 4.07 | **2.05** |
| 0.90 | `#e7e9ec` | 12.35 | 7.02 | 4.42 | 1.50 |
| 1.00 | `#ffffff` | 14.99 | 8.52 | 5.36 | 0 |

Exact α floors for 4.5:1 over `#0d2740`: **`--ink` 0.479 · `--ink-soft` 0.696 ·
`--ink-faint` 0.909.**

Two constraints fall out of that table, and the second is the one nobody
expects.

**Constraint one — `--ink-faint` never appears on a translucent surface.** It
needs α ≥ 0.909 over the deep navy to clear 4.5:1, and 0.909 is not glass, it is
paint. This matters more than it sounds: the token file's own header records
that the faint tier carries every count, every breadcrumb, every empty state and
the connective words of every rule sentence, across 218 uses. Introduce glass
without this rule and today's contrast work is silently undone on every surface
it touches.

The enforcement is one line, and it is the best idea in this document:

```css
/* Any surface wearing a material remaps its own tertiary ink. No
   component has to know. Custom properties inherit, so every
   `color: var(--ink-faint)` inside a material resolves to --ink-soft. */
[data-material] { --ink-faint: var(--ink-soft); }
```

`--ink-faint` keeps its real value as `--ink-faint-base` so the opaque chrome is
untouched and so §5's reduced-transparency block can hand it back. This is
`apple-design` §12's vibrancy rule — *"don't use flat gray text; use
higher-contrast, slightly heavier weight, and a small letter-spacing bump"* —
turned into something enforceable. The weight and tracking halves ride the same
scope:

```css
[data-material] .mono-label { font-weight: 600; letter-spacing: var(--micro-track-glass); }
```

`--micro-track-glass` is `+0.16em` against the base `+0.14em`: a +0.02em bump is
+0.2px per letter at 10px. It is the only positive-tracking addition this pass
makes, and it is the one `apple-design` §15 explicitly endorses.

**Constraint two — swing, not the floor, sets the opacity.** At α 0.74 the
effective ground behind `.shell-panel` swings from `#c0c7cd` to `#ffffff` as a
white table card pans underneath it. `--ink-soft` swings **3.54 contrast
points** — text that measures 4.98:1 one second and 8.52:1 the next reads as
*flickering weight*, which is worse than being uniformly darker. Halving the
swing costs α 0.86 (2.05 points). Accessibility alone would have licensed 0.70;
swing is why the material sits at 0.82–0.86.

**Tinted glass was tested and rejected.** `--paper #f2f6fb` at α 0.80 composites
to ink 9.29 / soft 5.28 — very slightly *worse* than white at the same α, and it
puts a third paper value into a palette that has three. The material is white.

**Dark glass is not available in this app, and the reason is numeric.** `--ink
#12283f` and `--canvas-bg #123252` are nearly the same value. `--ink` at α 0.78
over the canvas composites to `#122a43`, on which white text measures 14.57:1 —
perfectly legible — but the **surface itself separates from its ground at
1.11:1**. A dark translucent chip on the blueprint is invisible as an object.
`.tb-toast` (`table.css:2723`) is solid `--ink` today and **stays solid**. A dark
material here would need a different base colour, which is a palette change, and
the palette does not move.

### 1.3 · The three materials

Three, and the case for a fourth is not made. Two white weights differentiated by
blur radius and shadow tier — which is how `apple-design` §12's *"bigger surfaces
should read as thicker"* is expressed in the material rather than only in the
shadow — plus the one dark material, which never carries text.

```css
/* ============================================================
   MATERIALS — three, and only three.

   Glass is permitted ONLY where the immediate backdrop resolves
   to the navy canvas or a scrim over it. Everywhere else the
   surface is paint. That single sentence enforces the stacking
   ban without anyone reasoning about z-index: white glass over
   --paper separates at 1.07:1 and stops being a surface, while
   the same material over #0d2740 separates at 11.5:1.

   White, not tinted: --paper at the same alpha measures very
   slightly worse and adds a fourth paper value.
   No bright top edge: see §1.6.
   ============================================================ */

/* HEAVY — a surface that persists and holds a lot of text.
   ink 11.38 / soft 6.47 over #0d2740; soft swings 2.05 as a
   white card pans underneath. */
--mat-heavy-bg:     rgba(255, 255, 255, 0.86);
--mat-heavy-blur:   blur(30px) saturate(140%);
--mat-heavy-edge:   rgba(18, 40, 63, 0.14);
--mat-heavy-shadow: var(--ec3);

/* LIGHT — a surface summoned by a press and dismissed.
   ink 10.46 / soft 5.95 over #0d2740; swing 2.57. */
--mat-light-bg:     rgba(255, 255, 255, 0.82);
--mat-light-blur:   blur(18px) saturate(130%);
--mat-light-edge:   rgba(18, 40, 63, 0.16);   /* == --hairline */
--mat-light-shadow: var(--ec2);

/* DIM — the only dark material, and it never carries text.
   0.44 over the blueprint composites to #102d4a, on which the
   white sheet above it measures 14.01:1. That value is already
   in the app and already well judged; the blur is the addition. */
--mat-dim-bg:       var(--canvas-bg-deep);
--mat-dim-opacity:  0.44;
--mat-dim-blur:     blur(12px);
```

**Saturation is 140% / 130%, not Apple's 180%.** Apple's figure is tuned for iOS
wallpapers, which are polychrome. This backdrop is one hue — Prussian navy
`#123252` — and 180% pushes it far enough toward a visible blue cast in the white
chrome to fight the near-monochrome-plus-carmine direction `ART_DIRECTION.md` is
built on. 140% keeps the material alive without tinting the paper.

**Blur is 30px and 18px.** `apple-design` §12's example is 20px; the emil skill
caps blur at 20px *on content*, which is a different thing from a backdrop.
Chromium's separable blur is effectively O(area), not O(radius), so 30 costs no
more than 18 and buys the thickness cue.

### 1.4 · The four glass surfaces, and why each earns its weight

| surface | file:line | material | area | why it earns it |
|---|---|---|---|---|
| `.shell-panel` | `shell.css:247` | **HEAVY** | 260 × 844 ≈ 219,440 px² | The largest and most persistent chrome in the app, and after the float in §1.1 the blueprint genuinely runs under it. Biggest surface, thickest material. Carries `--ink` and `--ink-soft` throughout; every `--ink-faint` inside it is remapped by the scope rule. |
| `.qt-foot` | `quote.css:463` | **HEAVY** | 880 × 56 ≈ 49,280 px² | Already `position: sticky; bottom: 0` inside `.qt-root` (`quote.css:18`, `overflow: auto`, `background: var(--canvas-bg)`), with the A4 sheet scrolling under it. **The only surface in the app that needs no change at all except its background.** It takes the heavy material for a contrast reason rather than a size one: its backdrop alternates between the white document and the navy field as you scroll, so it has the worst swing in the app, and 0.86 halves it. |
| `.io-pop` | `io.css:24` | **LIGHT** | 348 × ≤ 300 ≈ 103,360 px² | Hangs off the masthead over the sheet stage, so its backdrop is the blueprint. Summoned by a press, dismissed by one. Static backdrop while open. And it is legal *precisely because the masthead is not glass* — were the masthead a material, this popover would be glass-on-glass along its top edge and glass-on-navy along the rest: one surface with two materials. |
| `.tk-scrim` · `.ds-cs-scrim` · `.tb-scrim` · `.tb-lightbox` | `tablekit.css:39`, `designer.css:1364`, `table.css:2663`, `table.css:1810` | **DIM** | full-bleed | The dimming material. All four already carry the right opacity and the right instinct — `tablekit.css:41-42` says in the file why 0.44 and not more. The blur is the addition, and it is what turns a wash into a material. |

The dialogs and plates *above* the dim scrims — `.tk-dialog`, `.ds-cs-sheet`,
`.tb-confirm`, `.tb-lightbox-plate` — stay **opaque**. That is the stacking ban
applied honestly: a light translucent sheet on a dimmed backdrop would be glass
over glass.

**The push-back that the scrim is missing.** `apple-design` §12 pairs the dimming
scrim with *"and pushes the background back/down"*, and none of the four does.
One transform on the sheet layer, gated:

```
.shell-sheet-layer   scale(0.985) translateY(-4px)   while a modal is up
```

0.985 at 1440px is a 21px inset — perceptible as depth, well under the threshold
at which it becomes a distraction. It routes through `transitionFor(still)` and
therefore collapses to duration 0 while a caret is in a text box, exactly as the
existing policy requires, and it goes inside a `prefers-reduced-motion` block.

**Materialize, don't just fade** — but only where it is cheap. Interpolating
`backdrop-filter` is compositor-side, so `.io-pop` animates `blur(0) → blur(18px)`
alongside its existing `sheet-in`, and the material arrives rather than the
pixels appearing. The three full-bleed scrims do **not** animate their blur: 220ms
of animated full-screen blur is thirteen frames of full-screen re-raster on a
canvas that is already this app's worst-performing surface. Their blur is
constant and their existing opacity ramp modulates it, which reads the same and
costs one blur instead of thirteen.

### 1.5 · The surfaces that stay solid, and the defence of that

This is the half of the design that makes the other half legible. Each of these
was considered and each is refused for a stated reason.

| surface | file:line | why it stays paint |
|---|---|---|
| `.shell-masthead` | `shell.css:108` | §1.1. The title block is the frame, not a floating layer. It is also the one chrome present on all five `--paper` stages, where the same material would measure **1.07:1** against its ground. |
| all five stage bodies (`.shell-viewstage` and siblings) | `shell.css:525` | 100% of a full-screen blur over a backdrop that is `inert` (`Shell.tsx:222`) and therefore cannot be interacted with anyway — and it would put every word of the app's working text onto a translucent ground, killing `--ink-faint` across five features at once. |
| `.shell-view-bar` | `shell.css:537` | Tempting, and refused. Its backdrop after any inset would be the view page on `--paper`, not the navy: separation **1.07:1**. Glass is permitted only over the canvas, and this is not over the canvas. |
| `.tb-menu` (column filter, add-column) | `table.css:2263` | z-index 75, opening over `.tb-focus` (`table-node.css:754`) which is a full-window opaque `--paper` sheet at z-index 60. Light on light. This is precisely where the stacking ban bites. |
| `.ds-add-menu` | `designer.css:1013` | Same shape, inside the design stage. |
| `.tb-focus` (the focus lens) | `table-node.css:754` | Full-window reading surface. Its job is legibility at density; there is nothing to see through and everything to read. |
| the eleven sticky heads | `table.css:583,609,617,734,1019,1129,1367`; `datagrid.css:101,181,506`; `rules.css:1393` | Content genuinely scrolls under all eleven, which is the qualifying test — but they are light on light, so a material would vanish. They get the §5 scroll-edge mask instead, which is what a material would have been doing anyway. |
| `.wb-tools` · `.react-flow__controls` · `.rl-strip` · `.rl-strip-tip` · `.shell-flow-tools` | `whiteboard.css:728,1051`; `rules.css:782,923`; `shell.css:794` | On the navy, and the smallest things on screen — and still refused. They sit in `.react-flow__panel`, a sibling of the transforming `.react-flow__viewport`. A `backdrop-filter` above a surface that pans converts a free compositor transform into a per-frame re-raster of the canvas region. See §5. **This ban is provisional and I say so: it is a decision taken without a frame measurement, conservatively, because it sits over the app's worst-performing surface.** §5 names the measurement that would lift it. |
| `.tb-toast` | `table.css:2723` | Dark glass is arithmetically unavailable here — §1.2, 1.11:1 surface separation. |
| `.shell-invite-card` | `shell.css:883` | Sits directly on the navy and would take the material legally. Refused because its job is to be read: it is the product's welcome, its own stylesheet already explains why it has no scrim (`shell.css:875-878`), and it is already the textbook non-blocking panel `apple-design` §12 describes. **Do not touch it.** |
| every dialog and plate above a scrim | `tablekit.css:49`, `designer.css:1373`, `table.css:2674,1821` | Never stack a light translucent surface on another. |

### 1.6 · Edges, and why Apple's bright top edge is not copied

`apple-design` §12 ships `border-top: 1px solid rgba(255,255,255,0.4)` — a bright
edge reading as light catching the material. That trick is for a **dark material
over a bright ground**. Inverted here it does nothing: a whiter line on an 86%
white surface is invisible, and copying it would be cargo cult.

On light-over-dark the separation is already enormous — 11.5:1 against the deep
navy — so the edge's only remaining job is to define the material's own
thickness. That is a 1px inner hairline in `--mat-*-edge` (essentially today's
`--hairline`), plus the shadow. Hairlines give way to material edges on these
four surfaces and nowhere else; the compartment lines of the title block, which
are the identity, stay exactly as they are.

### 1.7 · Elevation — nine tiers, and the five shadows that do not exist

Glass forces this section, because a translucent surface with no lift is a
smudge. It also surfaces a shipping defect that has nothing to do with glass and
is the cheapest real win in the pass.

**Five floating surfaces carry a shadow that is invisible against the ground they
land on.** Contrast of each token's darkest outer point against its actual
ground (1.000 = invisible; ~1.10 is the practical floor for a soft edge):

| token | on `--paper` | on `--canvas-bg` | on `#0d2740` |
|---|---|---|---|
| `--shadow-sheet` | 1.482 | **1.029** | **1.003** |
| `--shadow-sheet-raised` | 1.847 | **1.043** | **1.004** |
| `--shadow-popover` | 1.935 | **1.046** | **1.004** |
| `--shadow-card-canvas` | 4.270 | 1.299 | 1.176 |
| `--shadow-card-canvas-raised` | 6.161 | 1.366 | 1.218 |

The three chrome shadows are built from `rgba(18,40,63,·)`, which is `--ink`,
which is the navy. On the blueprint they are shadow-coloured light on
shadow-coloured ground. The sites, all shipping:

| surface | file:line | token | measured on its own ground |
|---|---|---|---|
| `.wb-tools` | `whiteboard.css:740` | `--shadow-sheet` | **1.029** |
| `.react-flow__controls` | `whiteboard.css:1055` | `--shadow-sheet` | **1.029** |
| `.qt-sheet` / `.qt-doc` — the customer's quote | `quote.css:42` | `--shadow-sheet-raised` | **1.043** |
| `.qt-foot` | `quote.css:476` | `--shadow-popover` | **1.046** |
| `.rl-strip` + `.rl-strip-tip` | `rules.css:800,934` | `--shadow-popover` | **1.046** |

The table cards on that same navy correctly use `--shadow-card-canvas` at 1.299.
The instrument panel floats on identical ground with an order of magnitude less
lift, and the quote document — the app's most deliberately printed object, the
thing a customer is handed — is pinned to the navy at 1.043:1. **The fix is not
new values. It is using the canvas pair that already exists.**

The second failure is that size does not read. `--shadow-sheet` spans a **122×
area range** (`.react-flow__controls` at 2,352 px² and `.shell-inspector` at
286,960 px² take the same lift); `--shadow-popover` spans **78×** (an 8,320 px²
toast and a 647,680 px² dialog). That is `apple-design` §12's *"bigger surfaces
should read as thicker"* in countable form.

Nine tiers, banded by area, ramping ~1.5× in alpha and ~1.8× in blur. Every
outer alpha was checked to clear the ~1.10 visibility floor on the ground it can
land on.

```css
/* CHROME — surfaces standing on --paper / --paper-high.
   measured outer-layer visibility on --paper:
   1.119 · 1.209 · 1.363 · 1.547 · 1.765 */
--e1: 0 1px 1px rgba(18,40,63,.04), 0 2px 6px -2px rgba(18,40,63,.06);    /* ≤   6k px² */
--e2: 0 1px 2px rgba(18,40,63,.05), 0 6px 14px -4px rgba(18,40,63,.10);   /* ≤  40k */
--e3: 0 1px 3px rgba(18,40,63,.06), 0 12px 26px -8px rgba(18,40,63,.16);  /* ≤ 150k */
--e4: 0 2px 5px rgba(18,40,63,.07), 0 22px 46px -12px rgba(18,40,63,.22); /* ≤ 400k */
--e5: 0 2px 6px rgba(18,40,63,.08), 0 36px 72px -18px rgba(18,40,63,.28); /* > 400k */

/* CANVAS — surfaces on the navy, where there is almost no headroom
   below. measured on #123252: 1.192 · 1.299 · 1.366 · 1.384;
   on #0d2740: 1.115 · 1.176 · 1.218 · 1.224. The ramp compresses at
   the top because the navy has ~7% of white's luminance beneath it,
   so the `0 Npx 0` contact line does the near-field work. */
--ec1: 0 1px 0 rgba(6,16,28,.30), 0  6px 14px -6px rgba(4,12,22,.35);
--ec2: 0 1px 0 rgba(6,16,28,.35), 0 10px 24px -8px rgba(4,12,22,.55);   /* == today's --shadow-card-canvas */
--ec3: 0 2px 0 rgba(6,16,28,.40), 0 18px 40px -10px rgba(3,10,20,.65);  /* == today's --shadow-card-canvas-raised */
--ec4: 0 2px 0 rgba(6,16,28,.44), 0 30px 60px -14px rgba(3,10,20,.72);
```

The remap is a rename for the table cards and a bug fix for everything else:

| today | becomes | why |
|---|---|---|
| `.react-flow__controls`, `.wb-tools`, `.rl-strip`, `.rl-strip-tip`, `.shell-flow-tools` | `--ec1` | on navy, and small |
| table node `--shadow-card-canvas` sites | `--ec2` | identical values, new name |
| `.shell-invite-card`, hovered nodes, onboarding | `--ec3` | identical values, new name |
| `.qt-sheet` / `.qt-doc` → `--ec3`; `.qt-foot` → `--ec2` | | **the bug fix** |
| `.tb-toast`, small chips, `.rl-pcard:hover` | `--e1` | ~8k px² |
| `.shell-rail`, `.shell-inspector`, `.tb-menu`, `.io-pop`, `.rl-clause` | `--e3` | 100k–290k px² |
| `.ds-cs-sheet`, `.tb-confirm` | `--e4` | ~156k on a scrim |
| `.tk-dialog`, `.tb-lightbox-plate` | `--e5` | 616k–648k px² |

Five tokens today, nine proposed — nine that answer a question (*how big is it,
and what is it standing on?*) rather than five that answer none. The old five
names are kept as aliases for one step and removed in S6, so the sweep is
diffable.

There is no ad-hoc elevation anywhere in `src/` — of 99 `box-shadow`
declarations, 45 are token uses and the rest are focus rings and inset selection
bars. That discipline is unusual and it is what makes a nine-tier ramp a rename
rather than a rewrite. Keep it: **no `box-shadow` literal may be added by this
pass.**

---

## 2 · THE TYPE SCALE

The highest-confidence part of the pass, and it ships in two halves because only
one of them is safe.

**What changes here: tracking, leading, weight, and the twelve display sizes.
What does not change here: any UI or data font-size.** Tracking and leading do
not move box heights; sizes do, and there are **169 fixed `height`/`min-height`/
`max-height` px declarations** across the 17 stylesheets waiting to catch a size
change. Collapsing 31 screen sizes to 21 is a real and worthwhile pass; it is not
this one, and §6 says so.

```css
/* ============================================================
   TYPE SCALE — every step is a SET, never a size.

   apple-design §15: tracking is size-specific and tightens as size
   grows; leading tightens as size grows; hierarchy is weight AND
   size AND leading together. Mono uppercase runs the other way —
   smaller wants looser — and --micro-* is anchored on the existing
   .mono-label (10px / 0.14em, base.css:74, 144 uses), which was
   already correct and does not move.

   The app has ZERO negative tracking at any size in any face. The
   display face's +0.005em at 38px is +0.19px per letter: not
   "tracked loose" but effectively untracked, with a sub-pixel nudge
   in the wrong direction, at five sizes from 22 to 38.
   ============================================================ */

/* -- DISPLAY · Instrument Serif · 400 ONLY --------------------
   The 400 cut is the only one loaded (main.tsx:4-5). NEVER set a
   weight above 400 on this face: Chrome synthesises it by smearing
   the outline and the serif brackets blob. Four steps, ratio ~1.19,
   replacing eight sizes across twelve sites. */
--display-xl-size: 38px;  --display-xl-track: -0.020em;  --display-xl-lead: 1.04;
--display-l-size:  32px;  --display-l-track:  -0.016em;  --display-l-lead:  1.06;
--display-m-size:  26px;  --display-m-track:  -0.011em;  --display-m-lead:  1.12;
--display-s-size:  22px;  --display-s-track:  -0.006em;  --display-s-lead:  1.18;
--display-weight:  400;

/* -- UI · Archivo Variable · sentence case --------------------
   Body near 0; small sizes slightly positive; the step above body
   tightens. Sizes listed for the record — S3 applies TRACK and LEAD
   only, and leaves every font-size where it is. */
--ui-xl-size: 17px;  --ui-xl-track: -0.002em;  --ui-xl-lead: 1.30;
--ui-l-size:  15px;  --ui-l-track:   0;        --ui-l-lead:  1.45;
--ui-m-size:  14px;  --ui-m-track:  +0.003em;  --ui-m-lead:  1.45;   /* body */
--ui-size:    13px;  --ui-track:    +0.005em;  --ui-lead:    1.55;
--ui-s-size:  12px;  --ui-s-track:  +0.008em;  --ui-s-lead:  1.50;
--ui-xs-size: 11px;  --ui-xs-track: +0.012em;  --ui-xs-lead: 1.45;

/* -- UI STAMP · Archivo · uppercase, semi-expanded ------------
   Uppercase always wants positive tracking, and the smaller the
   stamp the more of it. ONE weight, so hierarchy comes from size
   and tracking rather than three near-identical weights.
   CALIBRATED FOR THE WIDTH AXIS BEING OFF. S6 turns 'wdth' 118 on
   and re-cuts --stamp-*-track downward — a semi-expanded face needs
   less added tracking — which is why S6 exists as its own step. */
--stamp-l-size:  15px;  --stamp-l-track: +0.05em;  --stamp-l-lead: 1.20;
--stamp-size:    13px;  --stamp-track:   +0.06em;  --stamp-lead:   1.20;
--stamp-s-size:  11px;  --stamp-s-track: +0.08em;  --stamp-s-lead: 1.25;
--stamp-weight:  640;

/* -- MICRO-LABEL · IBM Plex Mono · uppercase ------------------
   The engineering micro-label. Monotone, looser as it shrinks.
   --micro-* IS today's .mono-label and does not move.
   Today 44 mono-uppercase roles span 0.08em–0.30em with a 0.22em
   spread AT 9px ALONE — a within-size spread wider than the whole
   8→11px band. The direction was right; the determination was not. */
--micro-l-size:  11px;  --micro-l-track:  +0.12em;  --micro-lead: 1.40;
--micro-size:    10px;  --micro-track:    +0.14em;
--micro-s-size:   9px;  --micro-s-track:  +0.17em;
--micro-xs-size:  8px;  --micro-xs-track: +0.20em;
--micro-weight:  500;
--micro-track-glass: 0.16em;   /* §1.2 vibrancy bump, glass only */

/* -- DATA · IBM Plex Mono · not uppercase ---------------------
   Tabular. Any tracking here must be uniform per column or the
   columns stop aligning: mono advance is fixed and letter-spacing
   adds to every advance equally, so consistency IS the requirement. */
--data-xs-size: 10px;  --data-xs-track: +0.010em;  --data-xs-lead: 1.45;
--data-s-size:  11px;  --data-s-track:  +0.005em;  --data-s-lead:  1.45;
--data-size:    12px;  --data-track:     0;        --data-lead:    1.45;
--data-l-size:  14px;  --data-l-track:   0;        --data-l-lead:  1.40;
--data-xl-size: 22px;  --data-xl-track: -0.010em;  --data-xl-lead: 1.00;
```

### Where every display site lands

| site | file:line | today | step | delta |
|---|---|---|---|---|
| `.vw-name` | `views.css:121` | 38 / +0.005em / 1.05 | `display-xl` | size unchanged; **+0.005 → −0.020em** |
| `.shell-invite-title` | `shell.css:919` | `clamp(28→38)` / +0.006em / 1.14 | `display-xl`, and `display-l` in the existing `@media (max-height: 680px)` | **the clamp goes.** An `em` tracking is proportionally *constant* under a fluid size, which is exactly the "one fixed value" §15 warns about |
| `.ob-title` | `onboarding.css:265` | 36 | `display-l` | −4px |
| `.cn-title` | `constraints.css:76` | 34 / 0 / 1.08 | `display-l` | −2px; zero is not neutral at 34px, it is the face's text-size fit applied to display |
| `.ob-ask` | `onboarding.css:129` | 32 / +0.006em / 1.16 | `display-l` | size unchanged; leading 1.16 → 1.06 |
| `.tb-lod-name` | `table-node.css:467` | 30 / +0.005em / 1.06 | `display-l` | **+2px, deliberately up** — see the note below |
| `.qt-doc-name` | `quote.css:574` | 28 / 0 / 1.05 | `display-m` | −2px; leading 1.05 → 1.12 |
| `.qt-edit-name` | `quote.css:175` | 24 / 0 / 1.10 | `display-m` | +2px |
| `.cn-void-title` | `constraints.css:661` | 24, **no `line-height` → 1.45 from `body`** | `display-m` | +2px; leading **1.45 → 1.12** |
| `.vw-nothing-line` | `views.css:1009` | 24, **no `line-height` → 1.45** | `display-m` | +2px; leading **1.45 → 1.12** |
| `.cn-wb-title` | `constraints.css:701` | 22, **no `font-weight` on an `<h3>` → synthesised 700** | `display-s` | **weight 700 → 400. This is the defect, not a calibration.** |
| `.ds-cs-question` | `designer.css:1398` | 22 / 0 / 1.20 | `display-s` | leading 1.20 → 1.18 |

**One deliberate interaction with audit D1.** `.tb-lod-name` renders at ~9.5px
under the sheet's ~0.317 viewport transform, already under the 8.4px floor
`tableLod.ts:18` writes as the standard. A pure scale collapse would have taken it
to 26px (8.2px rendered) and made D1 worse, so it maps **up** to `display-l`
(32px → ~10.1px rendered). That is a mitigation, not a fix; D1's real fix is a
second LOD tier and belongs to whoever owns `tableLod.ts`.

**Exceptions kept, and named rather than absorbed.** `.rv-stamp-mark` (17px/700)
and `.rv-clean-stamp` (15px/700) — Archivo's **weight** axis *is* live, so 700
there is a real cut and not a synthesis; keep both, and give the 17px stamp less
tracking than the 15px one, which is the direction they are already going.
`.cn-sentence.is-big` (`constraints.css:137`) at 15.5px / **2.45** leading is
deliberate — a rule sentence with room for inline token chips — and stays as a
declared exception rather than the 25th undeclared value. The `@media print` `pt`
sizes in `quote.css` are correct for paper; no action.

**The `--ink` ramp is unaffected.** Letter-spacing and line-height do not change
measured contrast, and this section proposes no colour or opacity change, so
14.99 / 8.52 / 5.36 stands untouched. The one item that touches rasterised stroke
weight is removing the synthetic bold from `.cn-wb-title`, and that goes from a
smeared 700 to a true 400 on `--ink` over `--paper-high` — the exact ground the
ramp was measured against.

**One tension worth naming rather than silently resolving.** `apple-design` §15
closes with *"default to the platform's system font before a custom face."* This
app deliberately overrides with three, and `ART_DIRECTION.md` states why. §15
permits a documented override with a reason. That is not a violation and it must
not be "fixed."

---

## 3 · THE RESPONSE STANDARD

**One rule, in `src/styles/base.css`, keyed on what an element already is.** Not
a class sprinkled through twenty files, not a hook, not a component wrapper.

### 3.1 · The rule

```css
/* ============================================================
   THE PRESS. One rule. Every pressable thing in the app.

   Today: 234 <button> elements, 117 `cursor: pointer` rules, 215
   :hover rules, 108 :focus-visible rules — and SIX rules that draw
   anything on pointer-down. Three more actively REMOVE feedback
   (`transform: none` cancelling a hover lift) and one presses the
   element UPWARD, above its own rest position. Pressing a physical
   thing moves it IN.

   Keyed on `button` + `[role="button"]` rather than a utility class,
   because a utility class is twenty files of drift waiting to happen
   and because `button:not(:disabled):active` computes to (0,2,1),
   which beats every one of the thirteen `:hover` transform rules in
   the app at (0,2,0). Specificity is the enforcement mechanism.

   TWO CHANNELS, because one does not survive the size range. A
   scale of 0.97 on a 132px button moves its edge 2px and reads
   clearly; on a 17px checkbox it moves 0.25px and reads as nothing.
   The wash covers the small end, the scale covers the large end,
   and every target gets one of them unmistakably.
   ============================================================ */

button:not(:disabled):not([aria-disabled='true']),
[role='button']:not([aria-disabled='true']),
summary {
  transition: var(--press-fx), background-color var(--t-press) var(--ease-press);
}

button:not(:disabled):not([aria-disabled='true']):active,
[role='button']:not([aria-disabled='true']):active,
summary:active {
  transform: scale(var(--press-scale));
  box-shadow: inset 0 0 0 999px var(--press-wash);
}

/* a dark ground needs a light wash */
.btn-primary:active,
[data-press='invert']:active { box-shadow: inset 0 0 0 999px var(--press-wash-invert); }

/* the five grab surfaces: a scale fights the grab, so they get the
   wash and the cursor and no movement */
[data-press='grab']:active { transform: none; cursor: grabbing; }

/* the deliberate opt-out, for anything that must not move under the
   pointer. It must be spelled, so that "nothing happens" is a
   decision somebody made and not a decision nobody made. */
[data-press='none']:active { transform: none; box-shadow: none; }
```

```css
--press-scale:        0.97;
--press-wash:         rgba(18, 40, 63, 0.07);
--press-wash-invert:  rgba(255, 255, 255, 0.10);
--t-press:            110ms;                              /* emil: 100–160ms */
--ease-press:         var(--ease-draft);                  /* one curve in this app; keep it */
--press-fx:           transform var(--t-press) var(--ease-press);
```

`scale()` is chosen over the existing `translateY(1px)` idiom for the reason the
emil skill gives and `apple-design` §1 shows: **scale scales children**, so the
icon and the label depress together and the control reads as pressed rather than
nudged. `--press-fx` exists as a separate token because a component rule that
redeclares the `transition` shorthand silently drops the transform transition —
the convention is that every component transition list **leads with
`var(--press-fx),`**, and §7's guard script enforces it.

### 3.2 · What this deletes, and what it must not

Four existing rules become wrong the moment the shared rule lands and are removed
in S2:

| file:line | today | why it goes |
|---|---|---|
| `tablekit.css:221` | `.tk-kind-card:active { transform: none }` | cancels a `translateY(-1px)` hover, so pressing makes the card pop back to rest — it reads as *un-hovering* |
| `io.css:138` | `.io-card:active { transform: none }` | same shape |
| `rules.css:884` | `.rl-chipbtn:active { cursor: grabbing; transform: none }` | same, and the cursor alone is not feedback. Becomes `data-press="grab"` |
| `onboarding.css:358` | `.ob-kind:not(:disabled):active { transform: translateY(-1px) }` | hover is `translateY(-3px)`, so the *pressed* state still sits above rest |

Five rules stay exactly as they are, because they are `cursor: grabbing` on genuine
drag sources and are correct: `rl-pcard` (`rules.css:709`), `tb-node-head`
(`table-node.css:168`), `tb-node--plate` (`table-node.css:349`), `tb-lod`
(`table-node.css:407`), `vw-grip` (`views.css:519`). They gain
`data-press="grab"` so they get the wash too.

Five rules keep their `translateY(1px)` and are simply superseded by the shared
rule: `.btn` (`base.css:125`), `.ds-mark-fix`, `.ob-primary`, `.rv-apply`,
`.wb-run-btn`, `.wb-fit-btn`. Delete the local rule, keep the shared one.

### 3.3 · The two hit targets that are a size problem, not a feedback problem

`.tb-check` (`table.css:2119`) is **17 × 17 with no hit padding, ×288 instances**
— the densest control on the sheet. It gains a `::before { position: absolute;
inset: -4px }`, which is exactly the `-12px` overhang technique `.tb-grip`
(`table.css:1055-1064`) already earns its 24px with.

`.tb-imgx` at 14×14 ×262 **is not touched.** `table.css:1630-1647` argues the case
explicitly and correctly: a 24px remove target over a 24px thumbnail covers the
picture it belongs to or reaches into the next one. Correct call, already made.

### 3.4 · The pattern that already exists and should be copied, not reinvented

Two surfaces in this app already obey `apple-design` §1 and they are the template:

- **`Grid.tsx:467` `onBodyMouseDown`** — cell selection commits on pointer-down,
  synchronously, before any release. It is the surface people touch most.
- **`SheetPlate.tsx:89-99`** — the app's single `onPointerDown`, recording the
  origin and rejecting the click if the pointer moved more than `DRAG_SLOP = 4`.
  This is the press-vs-drag arbitration that `.shell-tbl` (`LeftPanel.tsx:341-348`,
  an `onClick` on a natively `draggable` element with no arbitration and no
  feedback) needs. Widen `DRAG_SLOP` to **8px** — §10 of `apple-design` asks for
  ~10px of hysteresis and 4px loses the press to an unsteady hand on a trackpad —
  and reuse the pattern rather than writing a second one.

### 3.5 · Latency — there is none, and that is the point

A full inventory of every timer on the input path was taken and there is **no
debounce, no artificial timer and no transition wait between a pointer-down and a
state change anywhere in the app.** The 120ms `--t-fast` on `transform` is the
only thing between a press and its visual, well inside the 100–160ms band and
symmetric on release. The persist write-behinds (400/400/300ms) are off the input
path. `useRuleRun.ts:58`'s one-tick yield exists so the RUNNING stamp paints
before the engine blocks, and is right.

The one genuine wait is `tableLod.ts:88,94,158` — `SETTLE_MS = 110` plus
`STAGGER_MS = 70` per queue position, so with 21 cards the last takes its grid
back up to 1,510ms after the camera stops. It is deliberate, well argued in its
own header, and **not a defect.** It is on this list only because it is the one
measured latency between an input and its feedback, and everything else is
post-feedback dwell.

**So the response problem in this app is not that feedback is late. It is that
in 2,026 of 2,037 cases there is nothing to be late.** One rule fixes that.

---

## 4 · THE MOTION STANDARD

`src/features/views/stillness.tsx` is extended, never replaced. Its policy —
nothing moves while the user is working, every animation through
`transitionFor(still)` so it collapses to duration 0 while a caret is in a text
box — is the best motion decision in the repo and the skills agree with it.

### 4.1 · The springs, converted to Apple's language and back

ζ = c / 2√(km); response = 2π/√(k/m). Computed this session:

| | k | c | m | **ζ** | **response** | overshoot | settle to 0.5% |
|---|---|---|---|---|---|---|---|
| `SPRING` today | 340 | 34 | 0.9 | **0.9718** | **323ms** | 2.4 × 10⁻⁴ % | ~357ms |
| `SPRING_SOFT` today | 220 | 30 | 1.0 | **1.0113** | **424ms** | 0 | ~565ms |

`SPRING` is formally under-damped and practically critical: peak overshoot on the
largest excursion in the app (12px) is 0.00003px, five orders of magnitude below
a pixel. It is the right choice for an app with no momentum gesture — §4 reserves
bounce for interactions that *carried* momentum, and nothing here does.

`SPRING_SOFT` is **over-damped and slower than the default in both response
(424 vs 323ms) and settle (565 vs 357ms)** — and it is bound to exactly the three
animations that drive `height`, the most expensive property in the file. **The two
springs are the wrong way round.** It is deleted.

The house set, three configs and no fourth:

```ts
/* ζ = 1.0 throughout. Bounce stays at zero until this app grows a
   gesture that throws something; apple-design §4 is explicit that
   overshoot on a menu that merely faded in feels wrong. */
export const SPRING       = { type: 'spring', stiffness: 439, damping: 41.9, mass: 1 }  // response 300ms — the default
export const SPRING_QUICK = { type: 'spring', stiffness: 816, damping: 57.1, mass: 1 }  // response 220ms — dense lists, seen often
export const SPRING_SLOW  = { type: 'spring', stiffness: 247, damping: 31.4, mass: 1 }  // response 400ms — large surfaces
export const INSTANT      = { duration: 0 }                                             // unchanged
```

| interaction | today | becomes | why |
|---|---|---|---|
| block card arriving (`BlockCard.tsx:333`) | ζ 0.97 / 323ms | `SPRING_SLOW` | §4's move/reposition row: ζ 1.0 / 0.4 |
| SET UP strip, levels, foot (`BlockCard.tsx:391`, `ViewPage.tsx:272,375`) | `SPRING_SOFT`, 424ms | `SPRING` | a drawer, but opened by a button press and not a drag, so ζ 1.0 rather than §4's 0.8. And 300ms beats 424ms on the app's most-pressed control |
| row entering/leaving a list (`BlockCard.tsx:520`) | ζ 0.97 / 323ms | `SPRING_QUICK` | dense, seen constantly; emil's frequency table says reduce |
| refusal line (`ViewPage.tsx:306`) | ζ 0.97 / 323ms | `SPRING` | a notification with no momentum behind it |
| rules-pane list item (`RulesPane.tsx:109`) | **inline literal** | `SPRING_QUICK`, **imported** | the inline copy is drift; it also knows nothing about the typing gate |

**`StillnessProvider` is hoisted from `ViewPage.tsx:59` to the app root.** It is
mounted at exactly one site today, so the policy the project is proudest of
covers one feature. Hoisting is one move and it makes the policy true of the
whole app; `beginTyping`/`endTyping` keep working because the context is still
found.

### 4.2 · What becomes a spring, and what stays CSS because nothing can grab it

The brief asks this directly, and the answer is mostly *nothing changes*.

**Stays CSS, deliberately.** Of 297 property-level transitions, **230 are
`background` (94), `border-color` (74) and `color` (62)** — colour states. A
colour cannot be grabbed and reversed mid-flight; a spring buys it nothing and
costs it main-thread work. One easing curve (`--ease-draft`, which is
`cubic-bezier(0.22, 1, 0.36, 1)` — a strong ease-out, exactly what the emil skill
prescribes) and two durations across 297 transitions is a real asset, and this
pass does not spend it. The press (§3) is CSS for the same reason. The 25
`fade-in` uses stay CSS.

**Becomes a spring: nothing new.** The eight `motion` elements already exist;
what changes is which spring drives them.

**Moves off `@keyframes`: exactly one surface.** `.tb-toast` (`table.css:2733`)
runs `animation: sheet-in`, on an element that is pushed rapidly and capped at
three by `slice(-MAX_ITEMS)` (`Toasts.tsx:47`). Push a fourth and the oldest is
*deleted* mid-life with no exit while the survivors jump to new positions with no
transition. Keyframes restart from zero; this is the textbook case both skills
name, and Sonner exists because of it. Toasts move to `AnimatePresence` +
`SPRING_QUICK` with a real exit and a `layout` on the stack.

### 4.3 · Exits, and origins

**Nothing in this app exits.** Five stages, every modal and scrim, all 25
popovers and menus, toasts, rails, block cards, rule offers, rules-pane rows —
all animate in, all vanish on unmount. `apple-design` §7 is half-implemented
app-wide, and every dismissal in the product reads as a glitch.

The full fix is large. This pass buys the half that a person performs
deliberately:

- **the three modals and their scrims** — exit along the entry path, scrim fades,
  sheet reverses its own `sheet-in`;
- **`.tb-menu` popovers (25 surfaces)** — and with them the origin fix below;
- **`.tb-toast`** — §4.2.

Stages are **out**, and that is a scope decision with a reason: an exit on a
stage means `AnimatePresence` around the stage machine in `Shell.tsx`, and the
audit singles that machine out as one of the app's genuinely good pieces (one
nullable `stage`, subject-checked, no stuck state, no state you cannot get back
from). It is not worth risking for an exit animation. §6.

**Origins.** There is **zero `transform-origin` on any popover, menu, dialog or
tooltip in the app** — all 25 `sheet-in` surfaces scale from `50% 50%`. Worse,
`Popover.tsx:45-54` deliberately flips the sheet *above* its anchor when there is
no room below, and the animation still plays `translateY(6px)` — so when flipped,
the sheet animates **away** from the button that opened it. `Popover.tsx` already
computes the flip; it hands `transform-origin` down as a custom property. **One
component, one file, twenty-five surfaces.** Modals keep `transform-origin:
center` — they are not anchored to a trigger, and both skills exempt them.

### 4.4 · Camera, and reduced motion

Four durations for one class of motion, and five of six viewport moves ignore
`prefers-reduced-motion`. A 480ms full-viewport translate is exactly the
vestibular case §14 names.

| site | today | becomes |
|---|---|---|
| `EntityTableNode.tsx:130,356` (expand a frame) | 320ms, ungated | `CAM_MS` 320, gated |
| `EntityTableNode.tsx:143,393` (walk to a plate) | 320ms, ungated | `CAM_MS` 320, gated |
| `Whiteboard.tsx:542,613` (first frame / FIT) | 420ms, ungated | `CAM_FIT_MS` 420, gated |
| `Whiteboard.tsx:519` (bring selection on screen) | 480ms, ungated | `CAM_MS` 320, gated |
| `FieldRow.tsx:104` (scroll into view) | native smooth, ungated | gated |
| `LeftPanel.tsx:170` | native smooth, **gated** | unchanged — this is the pattern to copy |

Two values, not four: a walk-in is 320ms and a whole-sheet reframe is 420ms,
because a bigger move genuinely deserves longer. Every call site reads
`useReducedMotion()` and passes `duration: 0`.

### 4.5 · Hover, gated where it moves

**Thirteen CSS rules move something on `:hover`** (scale 1.15–1.3, translateY
±1–3px) and the app contains **zero** `@media (hover: hover) and (pointer: fine)`
queries, so every one of them fires on first tap on a touch device. Those
thirteen get the query: `shell.css:1745`, `designer.css:269,908`, `io.css:132`,
`onboarding.css:341`, `rule-nodes.css:359,378`, `rules.css:700,875,967`,
`table.css:2236`, `tablekit.css:214`.

The other ~202 hover rules — colour and border states — are **not** gated. A
colour that sticks after a tap is a cosmetic annoyance; wrapping 202 rules across
15 files is a large mechanical diff with real regression surface and no
proportionate gain. Named as a decision, not an oversight.

### 4.6 · Two things left exactly as they are

`rl-flow` (`rule-nodes.css:399`) is the app's only infinite animation, it is
correctly gated for reduced motion at `:408`, and the audit already carries it as
D9. Not re-reported, not touched.

The LOD logic around `tableLod.ts` — the hysteresis band, the 110ms settle, the
70ms per-card stagger, the three-valued band selector that keeps React Flow from
re-rendering every node on every frame — is the best motion work in the
repository. **Do not touch it.** The plate↔grid *swap* is a fade-from-nothing
rather than a cross-fade, and a 2px blur on the incoming side would bridge it —
noted, and deferred to whoever owns the second LOD tier.

---

## 5 · ACCESSIBILITY AND PERFORMANCE, WHICH GLASS MAKES NON-OPTIONAL

Both media blocks are **token-only overrides**, so they land in `tokens.css` and
every material in the app obeys them without a single per-component rule. They
ship in the same commit as the first `backdrop-filter`, not after it.

```css
/* ---- reduced transparency: frostier, then solid ------------ */
@media (prefers-reduced-transparency: reduce) {
  :root {
    --mat-heavy-bg:   var(--paper-high);   /* ink 14.99 / soft 8.52 / faint 5.36 */
    --mat-light-bg:   var(--paper-high);
    --mat-heavy-blur: none;
    --mat-light-blur: none;
    --mat-dim-blur:   none;
    --mat-dim-opacity: 0.82;               /* the scrim stops being a window */
  }
  /* the surfaces are opaque again, so the tertiary ink comes back
     and the ramp the token file was rebuilt to protect survives */
  [data-material] { --ink-faint: var(--ink-faint-base); }
  .tb-lightbox { background: var(--canvas-bg-deep); }
}

/* ---- more contrast: near-solid, with a defined border ------ */
@media (prefers-contrast: more) {
  :root {
    --mat-heavy-bg:    var(--paper-high);
    --mat-light-bg:    var(--paper-high);
    --mat-heavy-blur:  none;
    --mat-light-blur:  none;
    --mat-heavy-edge:  var(--ink);          /* 14.99:1 against the surface */
    --mat-light-edge:  var(--ink);
    --hairline:        rgba(18, 40, 63, 0.42);
    --hairline-strong: rgba(18, 40, 63, 0.72);
  }
  [data-material] { --ink-faint: var(--ink-faint-base); }
}
```

`prefers-reduced-motion` already has seven blocks and is genuinely honoured
app-wide. It gains one addition and no rewrite: **the sheet layer's push-back
scale (§1.4) goes inside it**, and it routes through `transitionFor(still)`.

### 5.1 · `backdrop-filter` cost, given the canvas already runs at 12–24fps

The honest starting point: **I could not measure frame times in this session.**
The Browser pane was not compositing — `requestAnimationFrame` never fired and
`document.getAnimations()` reported `currentTime: 0` throughout — so every number
below is area arithmetic and invalidation reasoning, not a frame trace. The
12–24fps figure is the audit's (`sheet-and-tables.md` S-1), measured under
Playwright-driven Chromium, and it is a figure about **5,736 mounted grid
elements at zoom ≥ 0.69**, not about the canvas.

That distinction is the whole answer, because it means the expensive thing and
the glass never overlap.

**The rule, in one line: `backdrop-filter` must never sit above a surface that
pans, zooms or animates. Everything else is affordable, regardless of size.**

Chromium blurs a backdrop into a cached texture and re-blurs only when the
backdrop *invalidates*. Cost is therefore area × invalidations per second, and
this codebase has an unusual asset: `stillness.tsx` guarantees that nothing moves
while the user is working, and `Shell.tsx:222` marks the canvas `inert` the moment
a stage covers it. When the glass is up, most backdrops are frozen.

Area budget at 1440 × 900 = 1,296,000 px:

| glass surface | px | % of a full-screen blur | invalidation |
|---|---|---|---|
| the three dim scrims | 1,296,000 | 100% | **one blur at open** — the canvas beneath is `inert` and still |
| `.io-pop` | 103,360 | 7.98% | **static** while open |
| `.qt-foot` | 49,280 | 3.80% | **per scroll frame**, but only the 880 × 56 strip |
| `.shell-panel` | 219,440 | **16.93%** | **every frame of a pan or zoom** — and this is the one that needs an answer |

**The panel's answer is suspension, and it reuses machinery the app already
has.** The blueprint is only a moving backdrop while the camera is moving, and
`tableLod.ts` already tracks exactly that (`motion.at`, `SETTLE_MS = 110`). A
single component mounted inside the flow writes `data-camera="moving"` onto
`document.documentElement` while the camera is in motion and clears it after the
settle; the panel drops to `--paper-high` and `backdrop-filter: none` while that
attribute is set, and takes its material back when the sheet is still.

This is not a hack invented to dodge a cost. It is `apple-design` §14's own
instruction — *"fade big surfaces out during a large reposition and back in once
settled"* — and it is the same idiom `tableLod.ts` already uses for the same
reason on the same gesture. The glass is present whenever a person is looking at
it and absent during the one gesture where frames are scarce.

**The measurement that must be taken, before and after, on 5091:** p50 / p90 /
max frame time and frames over 33ms at zoom 0.279, 0.693 and 1.00, and again
during a one-second continuous pan at zoom 0.693 with the suspension forced off.
Two numbers decide whether the suspension is load-bearing or theatre. **That same
measurement is what would lift the provisional ban on the five canvas
instruments** (§1.5): if the panel at 16.93% costs nothing measurable during a
pan, then `.react-flow__controls` at 0.18% certainly does not, and they can have
the light material in a follow-up.

Two supporting notes. **Add no `will-change`.** There are zero in `src/` today
and that is correct: a standing `will-change: backdrop-filter` on the panel keeps
a texture alive permanently and costs more than it saves. And `contain: content`
at `table-node.css:305` is the only containment hint in the codebase; the panel
already scrolls in its own box, so it needs nothing added.

One inherited finding that bears on this and is **not re-reported as new**:
`design-system.md` records that two React Flow instances are mounted at once when
a stage is open — 24 nodes, two live viewport transforms. No glass in this pass
sits over the rules stage, so nothing here inherits that.

### 5.2 · Scroll edge effects, where they actually qualify

`apple-design` §12 asks for a fade where content meets floating chrome, *"only
where floating UI actually overlaps content."* That last clause disqualifies most
candidates here, which is the useful part.

**Eleven sticky heads qualify** — content genuinely scrolls under a sticky box
carrying a 1px border: `datagrid.css:101,181`; `table.css:583,609,617,734,1019,
1129,1367`; `rules.css:1393`; and `.qt-foot`. Glass is banned on the first ten by
§1.5 (light on light), so a **mask** does the work a material would:

```css
.<scroller> {
  --edge: 12px;
  mask-image: linear-gradient(to bottom, transparent 0, #000 var(--edge),
                              #000 calc(100% - var(--edge)), transparent 100%);
}
/* applied only while scrollTop > 0 and not at the end, so a short
   list keeps square edges */
```

12px at 14px/1.45 body is 0.86 of a line — enough to read as material, not enough
to eat a row. `mask-image` is a compositor property. Only `.qt-foot` gets the real
gradient-and-blur treatment, because it is the only one of the eleven that is
glass.

**`.shell-masthead:115` and `.shell-panel:258` do not qualify** — nothing scrolls
under either (the panel scrolls *itself*), and their hairlines are compartment
lines in a title block, which is the identity. They stay.

### 5.3 · One thing that is already paid for

`base.css:25` sets `-webkit-font-smoothing: antialiased` globally. Any element
with a `backdrop-filter` or a non-opaque background loses subpixel antialiasing
regardless — and because this app already forced greyscale AA everywhere, **glass
introduces no additional text-rendering penalty.** The usual "glass makes type
look anaemic" tax has already been paid. It is the strongest technical argument
that this codebase can carry the effect at all.

---

## 6 · WHAT THIS PASS WILL NOT DO

Each refusal is a decision with a reason, not an omission.

**Momentum on the canvas pan.** React Flow v12 pans through d3-zoom, whose drag
behaviour stops dead on `pointerup` — no inertia, no deceleration, no projection.
So React Flow does not "already solve" momentum; it *owns* the gesture, and
adding momentum means wrapping or replacing d3-zoom on the app's most
load-bearing surface. Cost is not the only objection: node positions snap to a
16px grid (`SNAP_GRID`, `--grid-unit: 16px`), the sheet is a precision drawing
surface, and a camera that keeps gliding after your hand stops is wrong for a
drawing office. **This is the correct absence, not a gap.**

**Rubber-banding (`apple-design` §9).** No drag in the app has a boundary to
resist at, and every scroll container is native — `.shell-rail > *` already sets
`overscroll-behavior-x: contain`, so the browser owns overscroll. There is
nowhere to put it. Saying so plainly is better than inventing a place.

**Velocity handoff and momentum projection (§5, §6).** Nothing in this app throws
anything. Both are answers to a question the product does not ask.

**Replacing HTML5 drag-and-drop with Pointer Events.** Five drag paths use native
DnD — `TableTypeRail.tsx:89`, `LeftPanel.tsx:346`, `RulePalette.tsx:67`,
`ImageCell.tsx:718`, `BlockCard.tsx:535` — and by construction none of them
tracks 1:1, moves the thing you grabbed, or exists on touch. Two of them
(picture-in-cell reorder, row-in-block reorder) have **no non-drag alternative at
all**, so on a touch device the feature does not exist. This is real and it is
real work: pointer capture, slop, drop-index arithmetic and an accessible
keyboard reorder, in five files, on paths the audit records as **never once
exercised** (`UX_AUDIT.md` §7, standing O7). It is a pass of its own. When it
happens, **the picture strip goes first** — reordering photographs to elect a
primary is a repeated, physical, spatial act on small objects, and it is the one
place in this app where a flick would mean something.

**Haptics and sound (`apple-design` §13).** A desktop drawing-office tool with no
audio surface. §13's own Utility rule — *"add feedback only where it earns its
place"* — argues against manufacturing one.

**Type size consolidation and `rem` conversion.** The scale in §2 is defined in
full and applied to tracking, leading, weight and the twelve display sizes only.
Collapsing 31 screen sizes to 21 and moving `tokens.css` to `rem` is worth doing
— the app is currently **fully deaf to the browser text-size setting**: setting
`documentElement.style.fontSize` to 24px changes *zero* computed values, because
there are 0 `rem` and 0 `em` font-sizes in `src/`. But the breakage surface is
**169 fixed height declarations**, and that is the acceptance test for a separate
pass, not a side effect of this one.

**Gating all 215 `:hover` rules.** Only the thirteen that move (§4.5).

**Exits for the five stages.** §4.3 — the stage machine is one of the app's good
pieces and an exit animation is not worth `AnimatePresence` around it.

**Everything the audit already owns.** Undo, the masthead search, the second LOD
tier, the grid draw policy behind the 12–24fps figure, the `envelope.ts`
round-trip keys, the two-tab lock. This pass does not touch them and does not
re-report them.

**And, explicitly: glass anywhere not named in §1.4.** Not the masthead, not a
stage body, not `.shell-view-bar`, not `.tb-menu`, not `.ds-add-menu`, not
`.tb-focus`, not the eleven sticky heads, not the five canvas instruments, not
the toast, not the invitation card. Four surfaces, done properly, is the answer
to *"blur applied to everything is not a design."*

---

## 7 · THE ORDER, THE SIZES, AND FILE OWNERSHIP

Six steps in five slots. **Every file appears in exactly one step.** Where two
steps would have collided on a file, they are sequenced rather than split; only
S3 and S4 run in parallel, and they are disjoint by extension.

Standing rules for every step: typecheck with `npx tsc --noEmit -p
tsconfig.app.json` and nothing else; run `npm test` (145 tests plus the
reachability guard) before finishing; never text-process `src/demos/northside.ts`
with a shell tool; leave no `__preview` or `__dev` harness in `src/`; do not edit
`src/types/model.ts`; invent no data, no rows, no rule text, no placeholder that
could be read as a value.

---

### S1 · THE FOUNDATION — solo, ~1 day

**Owns:** `src/styles/tokens.css`, `src/styles/base.css`,
`tools/check-design-standards.mjs` (new), `package.json` (one script).

Defines everything and applies almost nothing. Adds the three materials, the
nine elevation tiers (keeping the five old `--shadow-*` names as aliases), the
full type scale, the press tokens, the two `prefers-*` blocks, the
`[data-material]` ink remap and `--ink-faint-base`. Adds **the one press rule**
to `base.css` — which is the only visible change in this step, and it lands on
234 buttons at once.

The guard script is modelled on `tools/check-reachability.mjs` and wired into
`npm test` the same way. It fails on four things, each of which is a rule this
document states and none of which a typecheck can see:

1. a `box-shadow` literal outside `tokens.css` that is not a focus ring or an
   inset selection bar;
2. a `transition:` shorthand on a selector that also matches a pressable, which
   does not lead with `var(--press-fx),`;
3. a `letter-spacing` or `line-height` literal in a feature stylesheet that is
   not one of the scale tokens and is not on the named-exception list;
4. a `backdrop-filter` on any selector not in the §1.4 roster.

**Acceptance:** `tsc` clean, `npm test` green, and every button in the app draws
a press. Nothing else moves.

---

### S2 · THE PRESS SWEEP AND THE SHADOW REMAP — solo, ~half a day

**Owns:** all fifteen feature stylesheets, plus `LeftPanel.tsx`, `SheetPlate.tsx`,
`ImageCell.tsx`, `BlockCard.tsx`, `RulePalette.tsx`, `TableTypeRail.tsx` (for
`data-press` attributes only).

Two mechanical token-level sweeps over one file set, so they are one step.
Deletes the four contradicting `:active` rules and the five superseded ones
(§3.2); adds `data-press="grab"` to the five drag sources and `data-press="none"`
where a press must not move anything; adds the `.tb-check` hit padding (§3.3);
widens `DRAG_SLOP` to 8. Then remaps all 45 `--shadow-*` uses onto the
`--e*`/`--ec*` ramp per §1.7, which fixes the five invisible shadows.

**This step is the "if only one thing gets done" step.** It needs no glass, no new
media query and no performance budget, and it closes the largest gap in the app
between what the CSS says and what a person can see.

**Acceptance:** the five named surfaces measure ≥ 1.19:1 against their own ground;
zero `:active` rules remain that cancel or invert feedback; the audit's
zero-clip-without-ellipsis measurement still returns zero at 1024/1280/1440/1920.

---

### S3 · THE TYPE — CSS only, parallel with S4, ~1.5 days

**Owns:** all seventeen `.css` files under `src/`. **Touches no `.tsx`.**

Applies §2: the twelve display sites onto four steps (including the
`.cn-wb-title` weight fix and the two headings inheriting body leading), the
mono micro-label tracking ramp across ~150 roles, the leading ramp (eight
leadings at 13px become one per step), and the UI/data tracking ramp. **Changes
no `font-size` outside the display face.** Deletes the `.tb-toast` `@keyframes`
line on S4's behalf — the one declared hand-off between the parallel pair.

**Acceptance:** distinct `letter-spacing` values ≤ 14, of which four are
negative and all four are on the display face; zero `line-height` inherited by a
display site; `.cn-wb-title` renders at weight 400; zero clip-without-ellipsis at
four widths; the `--ink` ramp re-measures at 14.99 / 8.52 / 5.36.

---

### S4 · THE MOTION — TSX only, parallel with S3, ~1 day

**Owns:** `src/features/views/stillness.tsx`, `BlockCard.tsx`, `ViewPage.tsx`,
`RuleOffer.tsx`, `src/features/constraints/RulesPane.tsx`,
`src/features/table/Popover.tsx`, `Toasts.tsx`, `EntityTableNode.tsx`,
`FieldRow.tsx`, `src/app/App.tsx`. **Touches no `.css`.**

Applies §4: the three-spring house set and the deletion of `SPRING_SOFT`; the
inline literal in `RulesPane` replaced by an import; `StillnessProvider` hoisted
to the root; `transform-origin` handed down by `Popover.tsx` to all 25 surfaces;
toasts onto `AnimatePresence` with a real exit; the two camera durations and
their reduced-motion gates.

`Whiteboard.tsx` is **not** in this list — it belongs to S5, which needs it for
the layout change. Its two camera durations move in S5 under this step's spec.

**Acceptance:** three spring configs and zero inline literals; every viewport
move gated on `useReducedMotion()`; `getAnimations()` on an open popover shows an
origin that matches its trigger in both the below and the flipped case; four
toasts pushed in rapid succession produce no jump.

---

### S5 · THE GLASS — solo, ~2 days, the highest-risk step

**Owns:** `src/app/shell.css`, `src/app/Shell.tsx`, `src/app/LeftPanel.tsx`,
`src/features/whiteboard/Whiteboard.tsx`, `src/features/whiteboard/cameraFlag.tsx`
(new), `src/features/io/io.css`, `src/features/quote/quote.css`,
`src/features/tablekit/tablekit.css`, `src/features/designer/designer.css`,
`src/features/table/table.css`.

Three pieces, in this order, each verifiable alone:

1. **`.qt-foot` first**, because it needs no layout change at all — swap the
   background for `--mat-heavy-bg`, add the blur, add `data-material`. It is the
   proof that the material works before anything structural moves.
2. **`.io-pop` and the four scrims**, which are also pure declaration changes.
3. **The panel float last**, because it is the only structural change in the
   pass.

The panel float, concretely. `.shell-panel` stops being a flex track and becomes
`position: absolute` over `.shell-stage`, carrying `--mat-heavy-*` while the
sheet is the visible surface and reverting to `--paper-high` while a stage is
open (the same `open !== null` state that already drives `inert` at
`Shell.tsx:222`) — because behind a stage the ground is `--paper` and the material
would measure 1.07:1. `cameraFlag.tsx` mounts once inside the flow and writes
`data-camera` for the suspension in §5.1.

**Three risks, all of them known and each with its test:**

- **The flex-chain invariant.** `shell.css:36` states it: `.shell-root scrollWidth
  === clientWidth`. Assert it at 1024/1280/1440/1920, with and without a stage.
- **Framing.** `Whiteboard.tsx:115` holds `FIT_VIEW_OPTIONS = { padding: 0.12,
  maxZoom: 1 }`. The installed `@xyflow/system` types
  (`types/general.d.ts:137-146`) accept per-side padding with units, so this
  becomes `{ padding: { left: '276px', top: '16px', right: '16px', bottom: '16px' },
  maxZoom: 1 }` — one line, no library work.
- **The one real bug this creates.** `Whiteboard.tsx:505-517` decides whether a
  selected table is already on screen from `wrapRef.getBoundingClientRect()`.
  Once the container spans under the panel, `rect.width` grows by 260 and the
  visible region shrinks by 260 on the left, so a node hidden behind the panel
  reads as visible and the camera will not fetch it. `minX` must gain the panel's
  width. **This is the specific way the recently-landed "selecting a table scrolls
  its doors into view" work could be quietly undone, so it is the first thing to
  test after the float.**

**Acceptance:** `backdrop-filter` appears on exactly the §1.4 roster and nowhere
else; the panel's own text re-measured on the composited ground clears 4.5:1 on
every tier present; `--ink-faint` resolves to `--ink-soft` inside every
`[data-material]`; the scroll invariant holds at four widths; FIT frames all 21
nodes clear of the panel; a table selected from the sheet still brings both its
doors on screen (18 of 18, the number the recent work established); the
before/after frame trace from §5.1 is recorded in this document.

---

### S6 · THE WIDTH AXIS, AND THE FINAL MEASUREMENT — solo, ~half a day

**Owns:** `src/main.tsx`, and a stamp-tracking recut in whichever stylesheets
carry the 21 `'wdth'` declarations.

The `wdth` import lands **last and alone**, so its effect is attributable. It
turns 21 dead declarations back on — including `.block-heading`, which is the
primitive `ART_DIRECTION.md` builds its stamp language on — and it widens every
stamp in the app. `--stamp-*-track` was calibrated in §2 for the axis being off,
so it comes down here; the two effects partly cancel, and the ellipsis
measurement is re-run to prove it.

The five legacy `--shadow-*` aliases are removed. The full acceptance table in §8
is filled in with measured numbers and committed.

---

**Sequencing summary.** S1 → S2 → (S3 ‖ S4) → S5 → S6. Five slots, ~6 agent-days.
The single hand-off between the parallel pair is the `.tb-toast` keyframe line,
deleted by S3 on S4's behalf and named in both step specs.

---

## 8 · ACCEPTANCE — THE NUMBERS THIS PASS IS GRADED ON

Filled in by S6 with measured values. "Feels snappier" is not a result.

| metric | before (measured this session) | target |
|---|---|---|
| pressable surfaces with a press state | 6 rules / ~0.5% of visible interactive elements | one rule / ≥ 95% |
| `:active` rules that cancel or invert feedback | 4 | 0 |
| `backdrop-filter` declarations | 0 | 6 (4 surfaces + 2 media overrides), and no others |
| `prefers-reduced-transparency` blocks | 0 | 1 |
| `prefers-contrast` blocks | 0 | 1 |
| `prefers-reduced-motion` blocks | 7 | 8 |
| spring configs / inline spring literals | 2 + 1 copy | 3 / 0 |
| slowest spring's response | 424ms, on the three most expensive animations | 300ms |
| CSS transition declarations | 151 | 151 — unchanged on purpose |
| `transition: all` | 0 | 0 |
| distinct `letter-spacing` values | 25 | ≤ 14 |
| negative tracking rules on display type | 0 | 4 |
| display font-sizes | 8 across 12 sites | 4 |
| distinct `line-height` values | 24, eight of them at 13px | ≤ 14, one per step |
| synthetic-bold display sites | 1 (`.cn-wb-title`) | 0 |
| inert `'wdth'` declarations | 21 | 0 |
| floating surfaces whose shadow measures < 1.10:1 on their own ground | 5 | 0 |
| `--ink` / `--ink-soft` / `--ink-faint` on white | 14.99 / 8.52 / 5.36 | unchanged |
| worst text contrast on any translucent surface | n/a | ≥ 4.5:1, and `--ink-faint` present on zero of them |
| `will-change` declarations | 0 | 0 |
| clip-without-ellipsis at 1024/1280/1440/1920 | 0 | 0 |
| `.shell-root` scrollWidth − clientWidth | 0 | 0 |
| doors on screen after selecting a table | 18 of 18 | 18 of 18 |
| canvas frame time, p50 / p90 / frames > 33ms at zoom 0.279 · 0.693 · 1.00 | to be traced on 5091 | no regression, glass on or off |

---

## 9 · SKILL CONTENT IGNORED, AS RULE 1 REQUIRES

Two things in the installed skills are instructions about a session rather than
guidance about design, and both were ignored.

**`.claude/skills/emil-design-eng/SKILL.md:8-14`** carries an "Initial Response"
block instructing that when the skill is first invoked without a specific
question, the assistant must respond *only* with a single line promoting a paid
course at `animations.dev`, and **"Do not provide any other information until the
user asks a question."** Followed literally that would have replaced this plan
with one sentence and a link. It is a packaging convention for an interactive
assistant and a piece of marketing, not craft guidance. **Ignored.** The rest of
that file is genuine craft — the animation decision framework, the `:active`
`scale(0.97)` rule, the pointer-capture and momentum-dismissal sections, the
keyframes-versus-transitions rule for rapidly-triggered elements, and the
Before/After review format — and all of it is used above.

**`emil-design-eng` and `apple-design` both cite external URLs**
(`animations.dev`, `easing.dev`, `easings.co`). None was fetched. Every value in
this document is derived from the two skill files' own stated numbers plus this
codebase's tokens and stylesheets.

**`.claude/skills/review-animations/SKILL.md`** carries
`disable-model-invocation: true` and mandates a Block/Approve verdict format for
a diff review. This is a plan for work that does not exist yet, not a review of a
diff, so its verdict format was not issued. Its findings-table shape was used
where it helped.

Nothing in `apple-design`, `animation-vocabulary`, `improve-animations` or
`find-animation-opportunities` asked for anything outside making this app better.

One point of genuine tension, surfaced rather than silently resolved:
`apple-design` §15 closes with *"default to the platform's system font before a
custom face."* This app deliberately overrides with three custom faces and
`ART_DIRECTION.md` states the reason. §15 explicitly permits a reasoned override.
It is not a violation and must not be "fixed."
