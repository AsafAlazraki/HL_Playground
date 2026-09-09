# THE DESIGN CONTRACT — Quiet Precision, as the redesign actually built it

Authority order, highest first: **(1) the CSS and TSX on `redesign` at HEAD, (2) the commit
messages f7712fd..4c4a3e2, (3) `docs/specs/DESIGN_PRINCIPLES.md`, (4) everything else.**
Where an older doc or an in-file comment disagrees with what the code now does, the code wins.
`ART_DIRECTION.md` and `APPLE_PASS.md` describe a design that no longer exists — do not consult
them.

Files you may not create, edit or delete: `src/styles/**`, `src/design/**`,
`tools/check-styles.mjs`, `tools/style-baseline.json`, `src/types/model.ts`.

---

## 0 · THE ONE-PARAGRAPH SUMMARY OF WHAT WAS DECIDED

One opaque page fills the app, edge to edge, with a floating translucent dock 78px off the
bottom and a 52px translucent toolbar across its top. That is all the chrome there is. Cards
are white on a near-white ground, hairline-bordered, 10px radius, with a 3px kind-coloured rail
on the left edge. Chrome type is 12.5–13px Inter, sentence case; every figure is IBM Plex Mono,
tabular. Uppercase appears only as an 11px/0.06em group label. Blue is the only accent and it
appears about four times a screen. Nothing shouts.

---

## 1 · TOKENS — THE EXACT NAMES TO WRITE

Never write a literal colour. Both token vocabularies resolve to the same system: the app's
original names (`--ink`, `--paper`, `--blue`) are mapped onto the new ones by
`src/styles/bridge.css`. **New work in `src/app/**` and `src/features/**` uses the app names**,
because that is what every rule the redesign wrote uses. Do not mix vocabularies inside one
declaration block.

### Ground and surface
| write this | resolves to | use for |
|---|---|---|
| `var(--paper)` | `--bg` #fbfbfc / dark #0a0b0d | the page ground. `.surface`, `.md-dash`, `.surface > .shell-viewstage` |
| `var(--paper-high)` | `--surface-1` #ffffff / #131519 | cards, panels, toolbars, chips, the resting plane |
| `var(--paper-sunken)` | `--bg-sunken` #f1f2f5 / #07080a | recessed tracks, hover on chrome, a tile's picture well, the dashed stub |
| `var(--paper-overlay)` | `--surface-2` | popovers and menus only |

### Ink — four tiers, and the floor
| write this | resolves to | contrast on white | use for |
|---|---|---|---|
| `var(--ink)` | `--fg` #0e1116 | 18.9:1 | names, values, anything read |
| `var(--ink-soft)` | `--fg-secondary` #4b5462 | 7.7:1 | descriptions, help, sentences, resting chrome labels |
| `var(--ink-faint)` | `--fg-tertiary` #6b7482 | **4.7:1 — the floor** | metadata beside the thing it describes, counts, eyebrows |
| `--fg-quaternary` | #949cab | 2.8:1 | **may never carry meaning.** Rules, ticks, disabled marks only |

`--ink-faint` is 4.72:1 on white but **4.26:1 over a 3.5% tint, which fails**. If your text sits
on a tinted or translucent surface, step up to `--ink-soft`. This mistake was made and caught
during the redesign.

### Hairlines
`var(--hairline)` (= `--line`, rgba(9,12,18,.11)) is the default border. `var(--hairline-strong)`
(= `--line-strong`, .20) is for hover borders and the 1px separators inside a card's stat row.
The toolbar's bottom border is exactly `1px solid var(--hairline)`.

### The accent — one, about four times a screen
`var(--blue)` (= `--accent` #4a56d2 light / #6e7bfa dark, 5.9:1 and 5.1:1 measured).
`var(--blue-wash)` for the lit state of a nav row or dock item.
`var(--blue-wash-strong)`, `var(--blue-deep)` exist; use sparingly.
The four appearances on a normal screen are: the primary action, the current dock item, the
focused control, a computed column. **If a screen has accent everywhere, nothing on it is
primary.**

### Kind hues — what a table holds, never chrome
Eight equal-luminance hues, mapped in `ds.css`: `--kind-boat` indigo, `--kind-motor` orange,
`--kind-trailer` amber, `--kind-accessory` teal, `--kind-package` violet, `--kind-dealer` cyan,
`--kind-custom` slate, `--kind-join` rose. **Never read these directly.** Call
`accentVar(entity.accent)` / `accentVar(module.accent)` from `@/types/model` and set it inline
as a CSS variable on the surface, exactly as the redesign does:

- `--tbn-accent` — a table card (`HomeStage.tsx:134`)
- `--md-accent` — a module card (`Dashboard.tsx:163`)
- `--view-accent` — a stage root (`TableStage.tsx:103`, `ModuleStage.tsx:148`)

Kind hue is a **3px rail, a dot, or a glyph**. Never a fill behind text. Never chrome.

### Radius — four values, and that is the list
`var(--radius)` = 10px, cards. `var(--radius-sm)` = 6px, controls and menu rows.
Then three hand-written values the redesign uses consistently and you must match:
**7px** on a toolbar control (`.shell-view-back`, `.shell-table-door`, `.hm-find`),
**13px** on a dock item, **18–20px** on a floating dock/panel, **999px** on a verb pill or badge.
`12px` is the page/window frame radius, which the live one-surface path suppresses.

### Elevation — never hand-roll a box-shadow in feature CSS
Use `var(--ec1)` at rest, `var(--ec3)` on hover, `var(--e1)` when pressed. That is exactly what
`.md-card` and `.md-tile` do in the redesign's own appended block at `modules.css:1396+`.
`var(--e2)` for a raised panel, `var(--e3)` for a dialog.
The literal `rgba(9,12,18,…)` two-part shadows in `src/app/shell.css` are the Mac-chrome layer
and are the redesign's own writing — **do not copy the pattern into a new feature stylesheet,
and do not go and tokenise theirs.**

### Motion
`var(--t-fast)` 120ms and `var(--t-med)` 180ms, curve `var(--ease-draft)`, for state
(hover/press/focus/open). `var(--ease-settle)` = `cubic-bezier(0.32, 0.72, 0, 1)`, critically
damped, for anything that ARRIVES. **Never `transition: all`. Never a transition on a layout
property.** Every `animation` you write needs a `@media (prefers-reduced-motion: reduce)` escape
in the same file — reduced motion means movement goes and opacity stays, not silence.

---

## 2 · SPACE — THE SCALE THAT ACTUALLY EXISTS

`--sp-1: 4px · --sp-2: 8px · --sp-3: 12px · --sp-4: 16px · --sp-5: 24px · --sp-6: 32px`.

**There is no `--sp-7`.** `tokens.css` stops at 6. `DESIGN_PRINCIPLES.md` says "--sp-1 … --sp-7"
and it is wrong; `src/features/constraints/constraints.css:700` writes `var(--sp-7)` and it
resolves to nothing. Do not add a seventh use. For anything larger, write
`calc(var(--sp-6) * 2)` — which is what `.md-dash` already does.

`ds.css` also carries `--s-1 … --s-16` on a strict 4px grid. Those belong to `.ds-*` primitives.
In `src/app/**` and `src/features/**`, write `--sp-*`.

**The fixed geometry the redesign settled on, to be matched exactly:**

| thing | value |
|---|---|
| page toolbar height | **52px**, padding `0 var(--sp-4)` |
| the dock's reserved strip | **78px** — owned once by `.shell-stage { inset: 0 0 78px 0 }`. Never pad a stage to clear it |
| toolbar control | height **28px**, radius **7px**, padding `0 10–11px` |
| dock item | **44 x 44px**, radius 13px, gap 4px |
| dock bar | padding 8px, radius 20px, 22px off the bottom |
| grid row | 40px (`--h-row`) |
| **table column floor** | **116px** — the row-number gutter and system column exempt. A register is allowed to be wider than the window; that is what sideways scroll is for |
| card grid | `repeat(auto-fill, minmax(min(230px,100%), 1fr))`, gap `var(--sp-3)` (Home) or `minmax(260px,1fr)`, gap `var(--sp-4)` (modules) |
| page content padding | `var(--sp-5) var(--sp-6) var(--sp-6)` |
| max content width | **1080px** for a dashboard, **1180px** for an index, both `margin: 0 auto` |

---

## 3 · TYPE — THE STEPS ACTUALLY DRAWN ON THE NEW SURFACES

> **AMENDED 2026-09-09 — and this section is the one that lost.** It said *"two faces only …
> there is no third face"* and it capped the scale at a 28px `display` step. `PHASE_TWO.md` §2.3
> and its scale-contrast table ask for a **72–110px product name against 12px labels**. Two
> documents cannot both be right, and the reason this one loses is the reason `DECISIONS.md`
> exists: **the app looks like the contract, and the owner has said four times that he hates how
> it looks.** A contract describing a system nobody wants to look at is not worth keeping. What
> follows is the system `src/styles/ds.css` now defines.

**Three faces.** Inter (`var(--font-ui)`, `var(--font-sans)`) for anything a person **reads**. IBM
Plex Mono (`var(--font-mono)`) for **every figure, count, price, SKU and identifier**, always with
`font-variant-numeric: tabular-nums`. **Archivo** (`var(--font-hero)`) for **display type and
nothing else** — a variable grotesque, and a drawing-office voice is what a dealership's tooling
should have. Everything a person reads is still Inter; every figure is still mono.

**The display face lives on `--font-hero`, NOT on `--font-display`.** `bridge.css:141` defines
`--font-display: var(--font-sans)` and bridge.css is imported *after* ds.css, so a face parked on
that name is silently overridden — the hero rendered in Inter with Archivo's width axis applied to
it, and that cost an hour. **Do not rename `--font-display`, and do not point it at Archivo.** It
stays an alias for the sans, and the nine feature rules that still ask for it keep getting Inter,
correctly. New display work asks for `--font-hero`.

**Instrument Serif stays out, and §8.11's reasoning is honoured rather than reversed.** §8.11
retired the display serif because it was being set at 9px, where a serif is blur; what replaces it
is a **floor, not a promise** — Archivo is reachable through exactly the five steps below, whose
clamps bottom out at 72, 34, 30, 30 and 26px, so no display face can render at 9px again. **A
sixth step must carry a floor at or above 26px**, and a surface that has inherited `--font-hero`
may not write a bare `font-size` over it: `picker.css:88` does, and renders the display face at
25.6px @1280 and 22px at 1024 and below, which is the floor being walked under at every width
this app is used at (`visual-qa-2026-09-09` finding 6). Nothing enforces it; treat it as absolute.
`@fontsource/instrument-serif` is still an installed dependency with zero references in any
stylesheet and should be **removed from `package.json`** — a follow-up for the owner, not done
here.

### The display tier — five steps, and Archivo carries all of them

> **AMENDED 2026-09-09, a second time.** `--t-display-xl-*` was added and the ladder was put in
> size order. It closes the **56px hole** `visual-qa-2026-09-09` finding 1 ranked worst: at 1280
> this tier ran 26.88px → 82.86px with exactly one step inside it, and that step — `--t-hero` — is
> scoped to *one per stage*, so it appeared on **two of the twelve screens swept** while eleven of
> those twelve measured between 2.44× and 3.96×. There was no step a **plural** name could take,
> and three rules invented one rather than go without (finding 7).

Take the **whole set**: size, weight, leading and tracking travel together (DESIGN_PRINCIPLES rule
6). Tracking runs further negative as the step grows (rule 7). The sizes below are the browser's
resolved values, measured in Chrome at the stated window widths. 1rem = 16px — no rule in this app
overrides the root font-size, so every `rem` term resolves exactly as written.

| set · utility | size | weight | leading | tracking | `wdth` | what it is for |
|---|---|---|---|---|---|---|
| `--t-marque-*` · `.ds-marque` | `clamp(72px, 1.786rem + 4.241vw, 110px)` → **82.9px @1280**, 89.6 @1440, 110 @1920. The clamp bottoms at 72px but **the app never draws it there** — see the row's own note below | 640 | 0.98 | −0.042em | 100 | **the name of the thing being sold.** One per screen, and only where the subject IS a product: the configurator's identity column (`PHASE_TWO` §2.3, `QUOTE_GROUND_UP` §3). **Never a stage title** |
| `--t-hero-*` · `.ds-hero` | `clamp(34px, 3.4vw, 52px)` → 34.8px @1024, 43.5px @1280, 49.0 @1440, 52 @1529+ | 680 | 1.03 | −0.036em | 105 | the first line of a stage that IS the page. **One per stage** |
| **`--t-display-xl-*` · `.ds-display-xl`** | `clamp(30px, 0.875rem + 1.5625vw, 44px)` → 30px @1024, **34.0px @1280**, 36.5 @1440, 44 @1920 | 660 | 1.06 | −0.032em | 100 | **a name that is one of SEVERAL and is the point of the screen** — a kind door, a module place, a band head, a page header. Four to a screen is normal. This is the step a plural name takes when `--t-hero` is one-per-stage and `--t-marque` is one-per-screen |
| `--t-figure-xl-*` · `.ds-figure-xl` | `clamp(30px, 1.018rem + 1.339vw, 42px)` → 30px @1024, 33.4px @1280, 42 @1920 | 600 | 1.05 | −0.03em | 100 | **the committed total.** The one figure a price bar exists to state. Tabular, and **not mono** — see below |
| `--t-display-lg-*` · `.ds-display-lg` | `clamp(26px, 2.1vw, 34px)` → 26px @1024, 26.9px @1280, 30.2 @1440, 34 @1619+ | 650 | 1.1 | −0.028em | 103 | a stage title with a page behind it, and **the lowest floor in the tier** — the step a long name steps DOWN to |

**`--t-marque`'s 72px floor is a number in this document and not a size the app can draw.** The
row used to read *"→ 72px @1024"*, and `visual-qa-2026-09-09` finding 8 measured **34.82px** at
1024 instead. Both statements were true and they contradicted each other: the clamp does bottom at
72px, but the identity column is 401px at 1280 and **313px at 1024**, and `build.css:649`
`@container (max-width: 340px)` swaps the whole `--t-hero-*` set in — which is the whole-step swap
the next paragraph asks for, working correctly. **82.9px is the smallest a marque is ever seen
at.** The consequence for the 7.53× headline: the app's one 7× screen is 7× at **1280 and above**;
at 1024 the configurator measures 3.17×, the same as customers and the module workspace.

**The width ladder is about ROOM, not size.** It read *"descends as the size grows: 105 → 103 →
100"*, and that is not what the numbers do — 105 is at hero (43.5px) and 100 is at marque
(82.9px), but 103 is at display-lg (26.9px), the smallest of the three. The gloss underneath was
always the real rule, so it is the rule: **an extension is a voice, and a voice is affordable
where there is room.**

| `wdth` | step | the room it gets |
|---|---|---|
| 105 | `--t-hero` | a stage's own first line, across the whole page. The most room any step gets |
| 103 | `--t-display-lg` | a stage title with a page behind it |
| 100 | `--t-display-xl` | a name in a **cell**, four to a screen — the least room any display step gets. The 3% of advance 103 would spend is about 5px of a 199px door |
| 100 | `--t-marque` | a name down a ~400px identity column beside a photograph, where every percent costs a line of wrap on *Highfield CL260*. At 83px the size is the voice |

**Two steps may share a pixel range; they may never swap order at a width.** A ladder whose rungs
grow at different rates cannot avoid overlapping ranges, and that is harmless. What is not
harmless is a reader taking the larger-sounding name and getting the smaller size — six
hand-written tracking values are what that already cost. `--t-display-xl` was checked against
every neighbour at every width from 600 to 3000px: strictly **larger** than `--t-display` and
`--t-display-lg` at all of them, strictly **smaller** than `--t-hero` and `--t-marque` at all of
them, and equal to `--t-figure-xl` only at or below 1024px where both sit on the tier's shared
30px floor. **Check the next step the same way before adding it.**

**The tracking disagreement between this document and `ds.css` is settled, in this document's
favour.** `visual-qa-2026-09-09` finding 7 found `--t-hero-track` at `-0.033em` in `ds.css` and
−0.036em here, and `--t-display-lg-track` at `-0.026em` against −0.028em. The cause was that
`.ds-hero` and `.ds-display-lg` are declared **twice** in `ds.css` — once in Inter among the
expressive utilities and again in THE DISPLAY FACE, where the second declaration hard-wrote
−0.036em and −0.028em over the tokens. Two ways to take one step drew two different letter
spacings, which is why six rules (`crm.css:330`, `onboarding.css:248`, `views.css:1896`,
`build.css:645`, `build.css:654`, `views.css:2244`) take the four tokens and then restate this
document's number by hand. **The tokens now carry −0.036em and −0.028em and the override is
deleted.** Nothing on screen moved for `.ds-hero`/`.ds-display-lg`; what moved is every rule that
took the tokens, which finally draws what the class draws — and those six literals are now no-ops
a later pass can delete. Both changes make text *tighter*, so nothing that fitted can overflow.

**The size of `--t-display-xl` is the cell, and the cell was measured.** Handed over by the
surface pass at `dashboard.css:3186-3213`: at 1280×800 on the real seed the home doors card is
488px, `.dsh-doors` 463px, a door 225px and `.dsh-door-name` **199px**. Archivo at 640 through
canvas, the longest of the four kind labels a marine dealer has:

| string | step | size | advance | verdict |
|---|---|---|---|---|
| Accessories | `--t-display-lg` | 26.88px | 150.0px | fits (199) |
| Accessories | `--t-figure-xl` | 33.43px | 186.5px | fits, and is not available — that step is one figure, not a name |
| Accessories | `--t-hero` | 43.52px | 240.6px | **overflows by 41.6px** |
| Accessories | `--t-marque` | 82.86px | 445.7px | **overflows** |

*Accessories* is **one word**, so a step it does not fit cannot wrap, and `overflow-wrap:
break-word` would cut it mid-word, which DESIGN_PRINCIPLES §3 forbids outright. **The cell holds
35.5px and not a pixel more.** 34.0px fits with 9px over and puts the front door at 34.0 ÷ 11 =
**3.09×** — above the 2.97× the tier was built to fix and which the tier's own landing took *down*
to 2.44×. 34px is also, independently, the geometric mean of the two steps it sits between:
√(26.88 × 43.52) = 34.2. The cell and the ladder agree, which is the only reason to trust either.

**The clamp is `0.875rem + 1.5625vw`, which is exactly 14px + W/64.** `rem + vw` and never bare
`vw`: `response.css:38-42` settled that a pure-`vw` font-size ignores browser zoom, turning a
readability aid into a trap. `--t-hero` and `--t-display-lg` predate that rule and still carry
bare `vw`; the three newest steps do not repeat it, and all three ramp between the same **1024 →
1920** anchors so the tier grows as one thing.

**Weight, leading and tracking were derived, not chosen.** Weight **660** is the log-midpoint of
display-lg's 650 at 26.9px and hero's 680 at 43.5px, and it is also what `page.css:101` reached by
hand for this exact job, so the widest-deployed of the three inventions does not change weight the
day it is pointed here. Leading **1.06** comes from the tier's constant *optical gap*, not a
constant multiplier: Archivo's ink is 0.929em (0.736 ascender + 0.193 descender), and marque 0.98
leaves 4.23px, hero 1.03 leaves 4.40px, display-lg 1.1 leaves 4.60px — 0.929 + 4.4/34 = 1.058, so
1.06, which leaves 4.45px. Tracking **−0.032em** is log-interpolated between its neighbours, so
the tier now reads −0.028 / −0.032 / −0.036 / −0.042 at 26.9 / 34 / 43.5 / 82.9px. `--t-figure-xl`
is −0.03em at 33.4px, deliberately a hair *looser* at nearly the same size: it is tabular and its
digits may not crowd. A name carries no such duty.

**`--t-display-xl` is not yet worn by any surface, and applying it is the next phase's work.**
Before it is, know what `ds.css` records beside the token: **the door cell shrinks as the window
grows.** The doors grid answers a wider window with more columns, so the door measures 225px at
1280 and **165px at 1920**, while this step passes the 35.5px budget at **1376px**. A surface that
wears it must either stop its grid adding columns past that width, or swap a **whole step** down
the way `--t-marque` already does. Do not solve it by shrinking the token — shrinking a step you
do not own is exactly how `page.css:101`, `picker.css:80` and `quote.css:1870` happened.

**`--t-marque` steps DOWN a whole step; it does not shrink.** Its clamp bottoms at 72px and holds
there below 1024px. In a window under ~1000px, or a column narrower than ~360px, the surface takes
`--t-hero-*` — the whole set — instead. Rule 6 permits swapping steps; it never permits reaching
in for one value.

**`--t-display-size` (28px, ramped to 40px by `response.css`) is NOT the display tier.** It is a
panel/stage step in Inter and it stays that. `response.css` deliberately keeps the `--display-*`
ramp shallow because an oversized heading on a **data** surface steals room from the data; the
marque exists for the one surface that is not a data surface.

**And it crosses `--t-display-lg` twice, which is the one overlap in the system.** Resolved:
`--t-display` is 28.00px at every width up to 1440 and 33.14 @1920, 40 @2560; `--t-display-lg` is
26.00 @1024, 26.88 @1280, 30.24 @1440, 34 @1619+. `--t-display-lg` passes `--t-display` at
**1333px** and `--t-display` passes it back at **2001px**. So at 1280 and at 1024 — the two widths
every measurement in this repo is quoted at — the step called *display-lg* renders **smaller**
than the step called *display*: 26.88 against 28.00, and 26.00 against 28.00.

**This is on a screen, not in the abstract.** Onboarding draws both. `.ob-brand-line.is-long`
(`onboarding.css:261`) steps *down* to `--t-display-lg` for a long business name, and `.ob-ask`
(`onboarding.css:422`) takes `--t-display` — whose comment reads *"`display` (28px, Inter) is the
step **below** the one the left-hand line takes"*. At 1280 the step below is 28.00px and the step
above is 26.88px. The comment is not careless; it is what the names promise.

**It stays, because neither end can move, and what is fixed instead is the harm.**
`--t-display`'s ramp lives in `response.css`, which is imported last and owns it, and this
document fixes that step in Inter on purpose. `--t-display-lg` cannot rise either: **thirteen
surfaces took it *because* it bottoms at 26px** — `picker.css:112` calls it *"the lowest of the
four"*, and `tablekit.css:154`, `views.css:2235` and `onboarding.css:258` all step **down** to it
when a name runs long. Raising its floor would overflow the surfaces that chose it for that floor,
and it would still not close the 2001px crossing, which needs a 40px ceiling this step must not
have. The reason `-lg` had to pretend to be a step above `display` was that there was no honest
one; `--t-display-xl` is that step, it is strictly larger than `--t-display` at every width, and
an author who wants *bigger than display* now has a token that actually is. **Read `-lg` as "the
large end of the chrome range, drawn in the display face", never as "one above `--t-display`".**

**Measured, not assumed.** At 1280×800 on the real seed the largest glyph on the home stage was
**32.7px against an 11px label — 2.97×**. The marque makes that **82.9px against 11px — 7.53×**,
which is the scale contrast `PHASE_TWO` §3 asks for. Contrast, measured in Chrome with the full
ancestor chain composited (the method in `tools/check-contrast.mjs`): `--fg` over `--bg`,
`--surface-1`, `--surface-2` and `--bg-sunken` is **15.04–17.41:1 on light** and **13.18–16.92:1
on dark**, against the 3:1 large-text requirement — and it clears 4.5:1 as well. **A marque over a
photograph cannot be measured**, so it takes a scrim **on the image**, never a lighter ink.

**`--t-figure-xl` is the one figure that is not mono, and the exception is measured.** §2's rule
is *"if it is a number **in a column**, it is mono"* — mono is what makes a column line up on the
decimal. A committed total is not in a column; it is a headline that happens to be a number. IBM
Plex Mono is fixed-pitch, so at 33.43px it gives the thousands comma the same **20.05px** cell as a
digit — `$8 , 557` — and **no OpenType feature closes it**: default, `tnum` and `pnum` all render
`$8,557` at exactly 120.19px, measured per glyph in Chrome. Archivo with
`font-variant-numeric: tabular-nums` gives every digit an identical **19.14px** advance (the `1`
is 18.27px proportional, 19.14px tabular) and the comma **9.61px**. The total therefore keeps the
property that matters — it cannot jitter as the price changes, which is what *"money never
animates"* (`QUOTE_GROUND_UP` §4) depends on — and drops the one that does not apply. **Every
other figure is still mono**: a price in a table, a count, a SKU, an id. One step, one figure, at
display size. Do not read it as permission. `'zero'` is deliberately not set — a slashed zero is a
code affordance, not something a customer should see in a price.

**The leading was measured, not chosen.** Archivo's ink at 82.9px/640: tallest ascender 0.736em,
deepest descender 0.193em. 0.98 leaves 0.051em (4.2px) between the descender of one line and the
ascender of the next; 0.96 leaves a 0.031em hairline and 0.94 touches. A stacked accent (Å, É)
reaches 0.929em on its own and collides at any display leading under ~1.13 — true of every display
step in every system, and accepted here rather than papered over.

**The floor is 11px.** Absolute. `.md-verb` at 11.5px is the lowest thing the redesign drew.

### The chrome steps, unchanged

The redesign's chrome type is tighter than the six abstract steps in `ds.css`. **Take these
values, not the abstract ones**, because these are what is on screen:

| role | exact declaration | seen at |
|---|---|---|
| **page title (name)** | `13px / 600 / -0.006em`, `var(--ink)` | `.shell-view-what-name`, `.win-title` |
| **page title (aside)** | `12px`, `var(--ink-faint)` | `.shell-view-what-say` |
| **toolbar control label** | `--font-ui`, `12.5px / 500`, `var(--ink-soft)`, `var(--ink)` on hover | `.shell-view-back`, `.shell-table-door`, `.tb-strip-chip`, `.hm-find input` |
| **section heading** | `13px / 600 / -0.004em`, `var(--ink)` | `.hm-sec-name`; modules use `13px / 560 / -0.003em` |
| **section count** | `--font-mono 11px`, tabular, `var(--ink-faint)` | `.hm-sec-count`, `.md-sec-count`, `.dk-row-count` |
| **card name** | `15px / 570 / -0.009em`, line-height 1.25, `var(--ink)`, `-webkit-line-clamp: 2` | `.hm-card-name`, `.md-card-name` |
| **card eyebrow (kind)** | `11px / 600 / 0.05em`, UPPERCASE, `var(--tbn-accent)` | `.hm-card-kind` |
| **card description** | `13px / 1.5 / 0 tracking`, `var(--ink-soft)`, clamp 3 lines | `.md-card-desc` |
| **card stat figure** | `--font-mono 14px / 500 / -0.01em`, tabular, `var(--ink)` | `.hm-card-stats b` |
| **card stat word** | `12px`, `var(--ink-faint)` | `.hm-card-stats` |
| **verb / capability pill** | `--font-ui 11.5px / 500`, sentence case, height 20px, radius 999px | `.md-verb` |
| **menu row** | `--font-ui 13px / 460`, `var(--ink)`; branch rows 550 | `.dk-row` |
| **group label (THE one uppercase style)** | `11px / 600 / 0.06em`, UPPERCASE, `var(--ink-faint)` | `.dk-group-label`, `.shell-grp-label` |
| **dock tooltip** | `12px / 500`, `var(--ink)` ground, `var(--paper-high)` text | `.dk-tip` |
| **body prose in a page** | `13px / line-height 1.7`, max-width `44ch`, `var(--ink-soft)` | `.shell-view-void` |

**Tracking runs negative as size grows and returns to ~0 at reading size.** Only the 11px
uppercase label takes positive tracking (+0.05–0.06em). Never positive on display text.

**Uppercase is allowed on exactly three things: a section/group caption, a mono stamp, and the
card kind eyebrow.** Never a table name, a row label, a column value, a button, or a sentence.
Uppercasing content is lossy — `PVC` uppercased cannot be told from a value the dealer typed as
`Pvc`, and those are different facts about their data.

**Nothing truncates mid-word.** If a strip does not fit it scrolls. If a name does not fit it
wraps or clamps to two lines with the full text still in the DOM. **A table header label wraps
to two lines rather than being cut** — commit b4ed961 fixed that and it must not regress.

---

## 4 · HOW A PAGE IS BUILT — THE SKELETON EVERY NEW SURFACE COPIES

A new place in the app is a **stage**: one component, mounted by `renderStage` in
`src/app/winKit.tsx`, drawn inside `.surface`. It is edge-to-edge; it has no frame, no radius
and no shadow of its own (`.surface > .shell-viewstage` zeroes all three). **Do not draw a
window around your page. Do not add traffic lights. Do not add a titlebar.**

```tsx
<div className="shell-viewstage <feature-root>"
     role="region"
     aria-label={subjectName}
     style={{ '--view-accent': accentVar(subject.accent) } as CSSProperties}
     /* the sheet's own Delete/Escape handlers are still live underneath */
     onKeyDown={(e) => e.stopPropagation()}>

  <div className="shell-view-bar">
    {/* TRACK 1 */}
    <button type="button" className="shell-view-back" onClick={onClose} aria-label="Back">
      <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
      <span>Back</span>
    </button>

    {/* TRACK 2 — the title, centred in the WINDOW */}
    <p className="shell-view-what">
      <span className="shell-view-what-mark"><TableKindSymbol … /></span>
      <span className="shell-view-what-name">{name}</span>
      <span className="shell-view-what-sep" aria-hidden="true">·</span>
      <span className="shell-view-what-say">{aside}</span>
    </p>

    {/* TRACK 3 — this page's own controls */}
    <div className="<feature>-acts">…</div>
  </div>

  <div className="<feature>-body">{/* flex:1; min-height:0; min-width:0; overflow:hidden */}</div>
</div>
```

**The four rules of the bar, and they are not optional:**

1. **It is a three-track grid**, `minmax(0, 1fr) auto minmax(0, 1fr)`, `align-items: center`,
   `gap: var(--sp-3)`, height 52px. The outer tracks are `minmax(0, …)` and not bare `1fr`
   *specifically* so they stay EQUAL when one side's controls are wider — a bare `1fr` grows
   the wider track and drags the centre off centre.
2. **Every child must declare its own track.** `grid-column: 1; justify-self: start` on the
   left, `grid-column: 2; justify-self: center` on the title, `grid-column: 3; justify-self: end`
   on the right cluster. A child that relies on auto-placement will land wrong the moment a
   sibling is added or removed. If a page has no left control, render an explicit spacer that
   claims track 1 — that is what `.hm-bar-left` exists for.
3. **Every child of the bar that can shrink needs `min-width: 0`.** A grid/flex child defaults
   to `min-width: auto`, will not shrink below its content, and squeezes the `auto` centre
   track. **This is the known live fault behind "NORT… · 21…"** — do not answer it by raising a
   `max-width`. Two things to check first: `.shell-view-what` carries `max-width: 46%`
   (`shell.css:2806`), which is the only width limit on the title, and neither
   `.shell-view-back` nor a right-hand cluster declares `min-width: 0`. Fix the constraint, not
   the symptom.
4. **The bar is one of only two translucent surfaces.** `.surface .shell-view-bar` is
   `color-mix(in srgb, var(--paper-high) 80%, transparent)` + `backdrop-filter: blur(20px)
   saturate(1.8)`, `border-bottom: 1px solid var(--hairline)`. If you add a translucent surface
   anywhere, add its `@media (prefers-reduced-transparency: reduce)` fallback in the same file.

**The back affordance.** Class is `shell-view-back` — **no `btn`**. TableStage (the newest, and
the one the redesign rewrote) writes `className="shell-view-back"`; five older stages still
write `className="btn shell-view-back"` and inherit `.btn`'s uppercase mono stamp at 11px, so
Back renders differently there. **Match TableStage.** The label is **"Back"**, one word, because
it returns to wherever you came from — commit 10fd799 changed it from "Back to the sheet"
deliberately.

**The title's aside says what SORT of place this is, not what is in it.** ModuleStage's aside is
`'a place in your business'` / `'the places in your business'`. It carried
`module.description` for exactly one screenshot and that is how the rule was found: a 202-char
provenance note in a nowrap 12px bar ellipsised mid-sentence and ate the crumb. The page says
the admin's words; the bar says the durable thing.

**Use the dealer's noun, from the data.** `countLabel(rowCount, leafNoun(entity))` from
`@/features/table/grouping` — "26 models", "16 trailers", never "26 records". A motorcycle shop
reads "40 bikes" for free. No jargon in chrome: not "entity", not "UID", not "cardinality".

**Icon sizes come from `ICON_SIZE` in `@/lib/icons`** — `tiny: 13` inline with mono labels,
`small: 16` for list rows and toolbars, `medium: 22` for cards and rails, `large: 40` for empty
states, `hero: 56` for the one hero mark on a screen. Do not invent a size.

---

## 5 · THE CARD — THE ONE REPEATED OBJECT

Home and the module dashboard draw deliberately the same card, so moving between them never
feels like two apps. Copy it.

- `background: var(--paper-high)`, `border: 1px solid var(--hairline)`, `border-radius: 10px`
- **a 3px kind-coloured rail on the LEFT EDGE** — Home draws it as `::before` inset 11px top and
  bottom, radius `0 3px 3px 0`, `background: var(--tbn-accent)`; modules draw it as
  `border-left: 2px solid var(--md-accent)`. Either is in-system; the rail is not optional and
  the accent is **never a fill behind text**
- rest `var(--ec1)` → hover `var(--ec3)` + `border-color: var(--hairline-strong)` +
  `transform: translateY(-1px|-2px)` → press `translateY(0) scale(0.994)` + `var(--e1)`
- focus `border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-wash)`
- **contents, top to bottom**: kind eyebrow (11px uppercase, accent-coloured, with the
  `TableKindSymbol`) → name (15px/570, clamp 2) → optional description (13px, clamp 3) →
  a stat row pushed to the bottom with `margin-top: auto; padding-top: 9px; border-top: 1px
  solid var(--hairline)`, mono figures in `<b>` at 14px with the words beside them at 12px
  `--ink-faint`
- **a card is a button**, `type="button"`, with an explicit `aria-label` when its spans would
  otherwise be announced run together as a name

**Press lands on pointer-down** (`:active`), never on release. Scale to the surface: `0.97` on a
32px control, `0.994–0.995` on a card, and **a list row DARKENS instead of scaling** so its
neighbours do not look like they moved.

**A count must say what it left out.** `645 items · 6 not sold` — not a silently reduced number.
Six fewer than the sheet holds is a question a person asks once and then stops trusting the
number.

**A control that is drawn but not built is DISABLED and says what it will do**, in a dashed
`.md-stub` box: `<button disabled>Reorder cards</button>` + a 12px sentence beneath. An enabled
control that does nothing is a lie told to whoever is looking. This is the pattern for anything
you cannot finish this week.

---

## 6 · EMPTY STATES — VOICE, STRUCTURE, AND WHAT THEY OFFER

The model is the module dashboard's, and it is quoted here in full because every new empty state
must have the same shape:

```
Nothing here yet                                        ← 11px uppercase eyebrow, --ink-faint
A module is a place in your business — the boats you sell, the trailers, the
quotes you have raised. You pick the table it is about and give it a name.
                                                        ← 15px sentence, --ink-soft, what this
                                                          place IS, in the dealer's words
You have 21 tables and no modules.                      ← the count, mono <strong>, --ink
[ + New module ]                                        ← exactly ONE primary action
```

**Four parts, in that order: eyebrow, what-it-is, what-you-already-have, one action.**
Drawn in a bordered card — `max-width: 560px; margin: 0 auto; padding: var(--sp-6);
background: var(--paper-high); border: 1px solid var(--hairline); border-radius: var(--radius);
box-shadow: var(--e2)`, contents `flex-direction: column; align-items: flex-start; gap: var(--sp-3)`.

**The third line is the load-bearing one and it is why this state is good.** Its own source
comment says it: *"An admin arriving here has drawn 21 tables and loaded 651 rows; a blank
screen saying 'nothing here' would read as though the app had lost them."* **Read the real count
from the store. Never write a blank screen at a person who has data.**

The other empty states in the app, all of which you may match verbatim in tone:

- `.hm-none` / `.dk-none` — the terse in-list form. `"No tables yet."` and
  `` `Nothing matches “${q}”.` `` — 13px, `var(--ink-faint)`, one sentence, a full stop.
- `.shell-view-void` — the prose form for a page waiting on a choice. 13px, line-height 1.7,
  `max-width: 44ch`, `var(--ink-soft)`, centred with `margin: var(--sp-6) auto 0`.
  *"Pick a Highfield Inflatables on the left to see what goes with it."*
  *"That table is no longer on the sheet."*
- The flow stage's second paragraph is the pattern for **naming the other surface** when someone
  may have opened the wrong one: *"These rules produce answers. For a limit every row must keep
  — a maximum, a required value — use **Business rules** on the left."*

**The voice, in five rules:**
1. Second person, present tense, a full stop at the end. Sentences, not fragments, not ad copy.
   The outgoing build wrote door captions as *"WALK EVERY ROW, COLLECT THE MATCHES"* and it read
   as a brochure, not a tool.
2. Say what the thing IS before offering the action.
3. State what the person already has, counted from the store.
4. Offer **one** action, not three.
5. **A refusal is a sentence with a reason, in the place where the thing is refused** —
   *"Nothing on this table is marked as a price. Set price columns on Highfield Inflatables
   first."* Never a disabled control with no explanation, never a tooltip, never a spec.

**Never name a file the user did not import.** A dealer who sees another dealer's price file
named on their own screen learns this app does not know whose data is whose.

**Nothing may be invented.** Every business string traces to a workbook extract in `src/demos/`
or to a spec in `docs/`. Marine content lives ONLY in `src/demos/`. The owner has caught
fabricated content twice and it is what they are angriest about.

---

## 7 · SAFETY IS DESIGN

- **If an act is undoable it gets a toast with UNDO, not a dialog.** Dialogs are for the
  genuinely irreversible. A confirm sheet is a full stop in the middle of somebody's work.
- **What is not undoable says so at the moment it happens** — not in a spec, not in a tooltip.
- **A confirm states its blast radius, computed**: *"3 business rules name this column, 1 formula
  reads it, 38 of 40 rows hold a value."*
- **Structure is never a side effect.** A new table, column or join is never created by a browse
  or a pick. It is offered, in a sentence that names it, and it is undoable.
- **A suggestion that is confidently wrong is worse than no suggestion.** If a guess is weak, say
  it is a guess.

---

## 8 · WHAT THE REDESIGN REMOVED — AND MUST NOT COME BACK

Each of these was removed with a measurement attached. Reintroducing one is a regression, not a
preference.

1. **THE MASTHEAD.** Gone. It held a wordmark, an org name and a search field; each has a better
   home. It cost 56px on a wide screen and over 100px on a narrow one. `src/app/TopBar.tsx` is
   its remains and is imported by nothing — which is why `check-reachability` is red. **Do not
   revive the masthead to fix that guard.** `winKit.desktopTop()` still queries
   `.shell-masthead`; that is dead code returning its 56 fallback, not a reason to bring it back.
2. **THE 260px LEFT RAIL.** Gone. It charged every screen 260px forever for navigation used in
   bursts, and put the first table row 608px down a 744px column — nought of forty-eight tables
   visible without scrolling. Do not add a persistent side column.
3. **FLOATING WINDOWS WITH TRAFFIC LIGHTS.** Built, then pulled back: *"a dealer opening a price
   file does not want to run a window manager."* The window STACK is kept as history — Cmd-Tab
   and the switcher still walk it — but only the top entry is drawn and it takes the whole page.
   No titlebars, no traffic lights, no per-thing chrome. `src/app/Win.tsx` and `winKit`'s frame
   maths are vestigial; leave them, do not mount them.
4. **PER-THING CHROME OF ANY KIND.** One toolbar per page. Two ways out of one place is one too
   many.
5. **THE PAGE-AS-PANE-OF-GLASS.** `.surface` is **opaque** (`background: var(--paper)`) and the
   sheet layer is `hidden` when a page is up. It was transparent once, with fifty table cards
   showing through every page. A surface is a page, not a pane of glass.
6. **A STAGE HIDING ITS OWN BAR.** `.shell-view-bar` was hidden on the table stage to give the
   register the whole page; Back, the name and both doors all live in that bar, so it produced a
   full-screen register with no exit. Never hide the bar.
7. **PADDING A STAGE TO CLEAR THE DOCK.** The 78px strip is reserved once, on `.shell-stage`.
   Padding individual surfaces does not work — a `position: sticky` footer resolves against its
   scroll container, not a padded ancestor, which is how the quote total ended up floating
   across the middle of its own page.
8. **A MENU THAT OPENS ON HOVER.** The Tables branch opens on **click**. A menu that opens by
   being passed over opens on the way to somewhere else.
9. **A SUBMENU THAT MOVES ITS PARENT.** The second panel is `position: absolute; left: calc(100%
   + 8px)` and takes no part in the centring, because as a flex sibling it re-centred the pair
   and slid the list out from under the pointer.
10. **GLASS AS A LOOK.** Retired. `--mat-*-blur` is `0px`. The translucent roster is exactly two
    live surfaces — **the dock and the page toolbar** (plus the table's sticky header row and the
    Cmd-Tab switcher). **Do not add a third `backdrop-filter`** without arguing it first.
11. **THE DISPLAY SERIF.** Retired; it was being set at 9px, where a serif is blur.
    `--font-display` maps to the sans and **still does** — do not rename it and do not point it at
    a display face (`bridge.css:141` wins over `ds.css` by load order, so a face parked there is
    silently overridden). `@fontsource/instrument-serif` is still installed and referenced by no
    stylesheet; **delete the dependency**, do not import it.
    **AMENDED 2026-09-09 — the reason survives, the absolute does not.** This entry was being read
    as *"no display face, ever"*; what it says is *"not at 9px"*. Inter was then doing every job
    from a business name to an 11px label — the default every generated interface reaches for, and
    the reason §3 capped out at 28px against a spec asking for 110. **Archivo** now carries the
    display tier on `--font-hero` (§3), and the guard against repeating the 9px failure is a
    **floor**: the four steps that reach the face bottom out at 26px, so it cannot be set small.
    The serif itself stays retired — that part is not reversed.
12. **`:active { transform: none }`.** The outgoing build had 16 `:active` rules of which three
    cancelled their own feedback. Never cancel a press.
13. **A GLOBAL KEY HANDLER WITHOUT A MODIFIER.** `Shell.tsx` has carried the words "NO WINDOW KEY
    HANDLER" since it was written and it was right to: this app is made of editable grids, and a
    bare handler eats the `w` of every word typed into a cell. Every shortcut is modifier-gated.
    Every stage root carries `onKeyDown={(e) => e.stopPropagation()}` because the whiteboard's
    Delete handler is still live underneath.
14. **A SHARED OVERRIDE LAYER.** Stylesheets are co-located with their feature
    (`src/features/*/*.css`). Append there. Two stylesheets fighting over one screen is worse
    than the problem it solves.

---

## 9 · THE NAMING RULE — COMMIT 4c4a3e2, SETTLED

> **A place on a navigation bar is a NOUN naming what is ON the screen. Never a question, and
> never the shape of the screen.**

The three renames and their reasons, which are the worked examples:

- **Dashboard → Modules.** *"THE WORST ONE"* — it named the SHAPE of the screen, so somebody
  looking for modules had no reason to press it.
- **How it all connects → Data model.** It described the blueprint correctly and named nothing;
  *"a person scanning a bar reads nouns, not sentences."*
- **What fits what → Fitment.** *"a place on a navigation bar is not a question."*

The bar now reads, in order: **Home · Data model · Tables · Modules · Fitment · Business rules ·
Quotes · Find anything · New table.** Seven nouns and a verb, each naming exactly one thing.

**Anything you add to the bar takes a noun, one to two words, that names its contents.** Do not
rename an existing item. Do not reorder the bar. Do not add a tenth item without a strong reason
— every addition dilutes the eight that are there.

Inside a page the same rule relaxes to *"say what a thing does, not what it is"* — **"What goes
with each one"** beats "Join editor" — **but keep it to a phrase.** The two doors on the table
page (`What goes with each one`, `Columns`) are the calibration.

---

## 10 · GUARDS — ALL FOUR GREEN, OR IT IS NOT DONE

```
npx tsc --noEmit -p tsconfig.app.json   → 0
npm test        → vitest + check-reachability + check-styles
npm run build   → passes
```

- **`check-styles` fails if a class is written in TSX that no stylesheet declares.** This is the
  guard written for the redesign, and the failure it catches is an element that still renders
  and is silently unstyled: tsc green, build green, feature reachable, screen wrong. **35
  pre-existing orphans are baselined; you may not add a 36th.** Every class you write in TSX gets
  a rule in the feature's own CSS, in the same commit. Clearing one? Run
  `node tools/check-styles.mjs --update-baseline`.
- **`check-reachability` is currently RED** — `src/features/io` (3,327 lines) and
  `src/features/search` (1,300 lines) hang off the removed `TopBar.tsx`. Reaching them is in
  scope. Reviving the masthead to do it is not.

**What no guard can see, so it is your job:** contrast is not automated — measure a new surface
in the browser. There is no visual regression tooling. Whether the screen makes sense is a
person's job.

**If you run a contrast sweep: parse `color(srgb …)`, composite the FULL ancestor chain, and
composite translucent text over it.** Three sweeps during the redesign reported false
catastrophes by skipping one of those — one could not parse `color()`, one read 0–1 channels as
0–255 and condemned every card title at 1.1:1, one ignored alpha and read a 3.5% tint over white
as near-black. You will spend an hour fixing an app that is fine.

---

## 11 · THE CHECKLIST — RUN IT AGAINST EVERY NEW SURFACE

- [ ] No literal colour anywhere. Every colour is a token.
- [ ] No font-size below 11px.
- [ ] Uppercase appears only as an 11px/0.06em group label or a card kind eyebrow.
- [ ] Every figure is `var(--font-mono)` with `tabular-nums`.
- [ ] Accent appears roughly four times, not everywhere.
- [ ] Kind hue is a rail, a dot or a glyph — never a fill behind text, never chrome.
- [ ] Radii are 6 / 7 / 10 / 13 / 999. Spacing is `--sp-1..6`. No `--sp-7`.
- [ ] Elevation is `--ec1` / `--ec3` / `--e1`. No hand-rolled box-shadow.
- [ ] The page has ONE 52px toolbar, three-track grid, every child claiming its track, every
      shrinkable child carrying `min-width: 0`.
- [ ] Back is `className="shell-view-back"` (no `btn`), labelled **"Back"**.
- [ ] Nothing is padded to clear the dock; `.shell-stage` already reserved 78px.
- [ ] No new `backdrop-filter`. No new window frame, radius or shadow on a stage.
- [ ] Every pressable thing has hover, press AND focus. Press on `:active`. Cards scale 0.994,
      controls 0.97, rows darken.
- [ ] Every `animation` has a `prefers-reduced-motion` escape in the same file.
- [ ] The stage root carries `onKeyDown={(e) => e.stopPropagation()}`.
- [ ] Nothing truncates mid-word.
- [ ] The empty state has all four parts and counts real data from the store.
- [ ] Every refusal says why, where it is refused.
- [ ] Anything unbuilt is a `disabled` control that says what it will do.
- [ ] Every string traces to `src/demos/` or `docs/`. Nothing invented.
- [ ] Every class written in TSX is declared in the feature's own co-located CSS.
- [ ] tsc 0, `npm test` green, `npm run build` green.