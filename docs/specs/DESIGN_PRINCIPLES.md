# DESIGN PRINCIPLES — how to build a screen here

**This supersedes `ART_DIRECTION.md` and `APPLE_PASS.md`.** Both describe "The
Chart Room" — the navy blueprint, the display serif, the glass pass — which was
replaced. They are kept for history. If they disagree with this file, this file
wins.

**Who this is for.** Anyone adding a screen, a component or a rule to this app,
including a future session that has never seen the redesign. Follow it and your
screen will look like it belongs. Ignore it and it will look like the thing we
just spent a redesign removing.

**The name of the system is Quiet Precision.** It is a tool people use all day,
over a business's real price file. It should be calm, legible, and boring in the
way good instruments are boring.

---

## 0 · THE TEN RULES, IF YOU READ NOTHING ELSE

1. **Never write a colour.** Use a token. The app is 97.6% tokenised and that is
   why a whole re-skin cost one import line.
2. **Never write a font-size below 11px.** That is the floor, and it is enforced.
   The display face is barred below 26px on top of that.
3. **Uppercase is a label style, never a name style.** Names and values keep
   their own case.
4. **Every text/background pair clears 4.5:1.** Measured, not eyeballed.
5. **One accent** for action. **Kind colour is identity** and may carry a
   surface — see §1. Never behind reading text, never chrome.
6. **Type steps are sets.** Take size, weight, leading and tracking together.
7. **Tracking is negative as size grows, ~0 at reading size.** Never positive on
   display text.
8. **Every pressable thing has hover, press and focus.** Press lands on
   pointer-down.
9. **If it is undoable, it gets a toast — not a dialog.**
10. **A thing that cannot be done says why, where it is.**

---

## 1 · COLOUR

### Never write a literal colour

```css
/* NO  */  color: #5f6c7b;   background: rgba(18,40,63,.08);
/* YES */  color: var(--ink-soft);   background: var(--blue-wash);
```

There are exactly two exceptions, and both are already written: **print rules**
(print has no theme) and **the quote document's paper** (it is paper in both
themes, deliberately).

### The system is blue and white, and every value was measured

The accent was `#4a56d2`, a tech indigo that could have belonged to any SaaS.
It is `#0a5fc2`, a marine blue, and the whole ground moved with it: the page is
`#f6f9fc`, the ink `#081b2e`, and **every neutral shadow stop was re-tinted from
`rgba(9,12,18)` to `rgba(8,27,46)`** so an edge sits in a blue field instead of
punching a grey hole in it.

71 token values were swapped and each carries its measured ratio in `ds.css`
beside it. The figures below are in-browser measurements, not estimates.

### The ink ramp, and the floor

| token | use | on white | on the page ground |
|---|---|---|---|
| `--ink` | names, values, anything read | 17.4 : 1 | 16.5 : 1 |
| `--ink-soft` | descriptions, help, sentences | 8.1 : 1 | 7.7 : 1 |
| `--ink-faint` | metadata beside the thing it describes | **5.5 : 1 — the floor** | **5.2 : 1** |
| `--fg-quaternary` | rules, ticks, disabled marks | 2.6 : 1 — **may never carry meaning** | 2.4 : 1 |

**The floor now clears 4.5 over a tint as well as on white.** The outgoing
`#6b7482` measured 4.72:1 on white and 4.26:1 over a 3.5% tint, which fails —
that is the mistake recorded below as "made and caught during the redesign". It
is fixed at the ramp now rather than avoided per surface.

`--ink-faint` is the floor for anything a person must read. If your text sits on
a tinted or translucent background, **the tint counts** — `--ink-faint` measures
4.72:1 on white but 4.26:1 over a 3.5% tint, which fails. That mistake was made
and caught during the redesign; do not repeat it.

### One accent, and the kinds

`--blue` is the single accent. It should appear roughly **four times per screen**
— the primary action, the current nav row, the focused control, the computed
column. If a screen has accent everywhere, nothing on it is primary.

The eight kind hues are for **what a thing IS**, and that is a change from how
this file first read them.

They were "an eighth-note": a 3px rail, a dot, a glyph, never a fill. That was
right for a calm data tool where a kind is metadata about a table. This is a
selling tool, and boat, outboard, trailer and rigging kit are the four nouns the
whole business is made of — a person should know which is in front of them from
across the room without reading a word.

**A kind hue may carry a SURFACE**: a tinted band head, a card rail at full
height, a filter chip, a selected row. It still may **not** sit behind reading
text, it is still **never** chrome, and the 4.5:1 floor is untouched.

The discipline that replaces the old rule, and it is what stops this becoming
colouring-in:

> A hue only ever appears on something that HAS that kind. Two things of one
> kind are one colour everywhere in the app. **A figure is never a hue** — a
> price is not decorative.

The mechanism is one custom property. A host sets `--kind` (or `data-kind`) and
takes `.k-rail`, `.k-wash`, `.k-band`, `.k-chip`, `.k-filter`, `.k-dot`,
`.k-lift`. Eight hues times five surfaces would be forty tokens that can drift;
this is one token and a `color-mix`.

### Field types have three roles, not eight

Grey by default, accent for computed (`fx`), one cool hue for linked (`ref`,
`img`). A type chip is metadata about a column and must not compete with the
column's name.

---

## 2 · TYPE

### Three faces, and the third one has a floor

**Inter** for everything a person reads. **IBM Plex Mono** for every figure,
code, SKU and identifier. **Archivo** for headlines, and nothing else.

This said "there is no third face", and it was written after a display serif was
found being set at 9px, where a serif is blur. The rule caught a real failure.
It also threw the idea away along with the mistake, and what was left was Inter
doing every job from a 52px business name to an 11px label -- an excellent
interface face, a characterless headline, and the default every generated
interface reaches for.

Archivo had been a dependency the whole time and was imported by nothing, which
is why the sixteen `font-variation-settings: 'wdth'` declarations in the app CSS
were dead: they resolved against Inter, which has no width axis.

**The guard against repeating the failure is a floor, not a promise.** Archivo
is reachable through exactly two type steps -- `--t-hero` and `--t-display-lg`
-- whose clamps bottom out at **34px and 26px**. There is no path by which it
renders below 26px. Everything a person *reads* is still Inter; every *figure*
is still Plex Mono.

Its token is `--font-hero`, **not** `--font-display`: `bridge.css` already owns
that name as an alias for `--font-sans` and is imported after `ds.css`, so a
face parked there is silently overridden. That cost an hour; do not repeat it.

Mono is not decoration — it is what makes a column of money line up on the
decimal. If it is a number in a column, it is mono and `font-variant-numeric:
tabular-nums`.

### Six steps plus one label

Take the whole step. Size, weight, leading and tracking travel together.

| step | size | use |
|---|---|---|
| display | 28px | stage titles, the quote header, empty states |
| title | 20px | panel headers, dialog titles |
| heading | 15px | card names, row heads — the thing you scan for |
| body | 14px | the default |
| small | 13px | secondary text, help |
| caption | 12px | metadata beside what it describes |
| **label** | 11px | **the one uppercase style** |

**The floor is 11px.** 222 declarations were raised to it during the redesign,
from a low of 7px. A guard is not yet automated for this; treat it as absolute.

### Tracking runs negative as size grows

The outgoing system had **all 24 of its non-zero tracking values positive**,
including at 38px. That is backwards. Large text needs letters pulled together;
body sits at ~0; only the 11px uppercase label gets `+0.06em`.

### Uppercase, precisely

Allowed on: **section captions, group captions, and mono stamps.** That is the
list.

Never on: a table name, a row label, a column value, a button, a sentence.
Uppercasing content is **lossy** — a proper noun loses its word-shape, and
`PVC` uppercased cannot be told from a value the dealer actually typed as `Pvc`.
Those are different facts about their data.

---

## 3 · SPACE, DEPTH, GEOMETRY

- **Spacing** comes from `--sp-1` … `--sp-7`. Never a literal px gap.
- **Radius**: `--radius-sm` (6px) for controls, `--radius` (10px) for cards.
- **Elevation** is `--e1` / `--e2` / `--e3` plus `--ec1`…`--ec4` on the canvas.
  On light, the shadow does the lifting; on dark, the surface step does, and the
  shadow is second. Both are already defined — never hand-roll a `box-shadow`.
- **Rows** are 40px. The grid was tighter than a spreadsheet while claiming to
  be easier than one.
- **Nothing truncates mid-word.** `IDEN… 8` shipped as final once. If a strip
  does not fit, it **scrolls**; if a name does not fit, it wraps or clamps to two
  lines with the full text still in the DOM.

---

## 4 · RESPONSE AND MOTION

### Every pressable surface has three states

Hover, press, focus. No exceptions. The outgoing build had 16 `:active` rules of
which **one** served the design system and **three cancelled feedback** with
`transform: none`.

Press lands on **pointer-down**, not on release. The moment feedback waits for
the click, directness falls off a cliff.

### `--focus` is a box-shadow. It is not an outline colour

`outline: 2px solid var(--focus)` is **invalid** and the whole declaration is
thrown away at computed-value time — `--focus` expands to two box-shadow rings,
not a colour. 21 declarations across `build.css` and `picker.css` were written
that way and drew **no focus ring at all**; measured on a real ArrowDown with
`:focus-visible` matching, the computed outline on the highlighted card was
`rgb(8,27,46) none 3px`.

And there is no safety net under them: `ds.css`'s global
`.ds-root :focus-visible { box-shadow: var(--focus) }` **never reaches the
app** — `.ds-root` is on `/design.html` and the entity designer and nowhere
else, 0 matches in the running app. Every focus ring the app draws is a
per-feature rule. So: `outline: 2px solid var(--accent)` with an
`outline-offset`, which is what the other 45 outline rules already say — or
`box-shadow: var(--focus)` where the ring has to read against its own accent
ground.

Scale the press to the surface: `0.97` on a control, `0.994` plus losing the
hover lift on a card. `0.97` on a 236px card is a 7px shrink and reads as a
glitch. A list row **darkens** instead of scaling, so its neighbours do not look
like they moved.

### Two motion systems, and the split is not stylistic

**CSS transitions own state** — hover, press, focus, open. One curve
(`--ease-draft`), the durations in `--t-fast` / `--t-med`. Zero `transition: all`.
Zero transitions on layout properties. This part of the app was already right
before the redesign; keep it that way.

**Springs own anything a person can grab** — dragging a node, reordering a
block, throwing a sheet closed. Tokens are `--spring-ui-*`, `--spring-momentum-*`.
`bounce: 0` by default; `bounce: 0.2` **only when the gesture itself carried
momentum**. Overshoot on a menu that merely opened is wrong.

Three rules a spring call must keep: animate from the **presentation** value
(read the live transform on interrupt, or a grabbed element jumps); never lock
out input during a transition; hand the release velocity to the spring.

### Accessibility signals are honoured, not optional

`prefers-reduced-motion`, `prefers-reduced-transparency` and
`prefers-contrast: more` are all wired. Reduced motion means **gentler feedback,
not no feedback** — movement goes, colour and opacity stay.

---

## 4b · THE EXPRESSIVE LAYER

The last section of `ds.css` adds depth, light and entrances. It adds **no ink
and no meaning**: a gradient is a surface, a glow is a state, grain is texture.
If you deleted the whole section the app would still read, and that is the test
each token had to pass.

| token | what it is for |
|---|---|
| `--grad-surface` | a card ground that is paint, but not *flat* paint |
| `--grad-brand`, `--grad-brand-wide` | headline treatment only, never behind a value |
| `--edge-light` | the lit top hairline: `inset 0 1px 0 var(--edge-light)` |
| `--e4`, `--e-float`, `--e-hero` | the elevation rungs the system lacked |
| `--glow-sm/md/lg` | a **state**, never decoration |
| `--aurora-1..3`, `--grain-opacity` | atmosphere, all under 6% alpha |
| `--t-hero-*`, `--t-display-lg-*` | two steps above `display` |
| `--ease-out-expo`, `--d-slower`, `--d-scene` | entrances |

Utilities: `.ds-hero` `.ds-display-lg` `.ds-grad-text` `.ds-aurora` `.ds-grain`
`.ds-sheen` `.ds-rise` `.ds-fade` `.ds-lit` `.ds-shimmer`. Set
`style={{'--i': index}}` to stagger a grid.

**The atmosphere is capped under 6% alpha on purpose.** Measured over white that
moves luminance by less than one contrast point, so text sitting on it keeps the
ratio the ramp was measured at. Raise it and you invalidate the table above.

All of it is covered by `prefers-reduced-motion` (movement goes, light stays),
`prefers-reduced-transparency` (atmosphere goes entirely) and
`prefers-contrast: more` (aurora, grain and the gradient headline all go).

## 5 · MATERIALS

**Glass is retired, with exactly two exceptions.** It was tried, it produced the
design that got replaced, and Quiet Precision was chosen over Glass & Depth
deliberately.

The two surfaces that may take `--glass-bg` / `--glass-blur` are **the floating
dock and the masthead** -- the only two things that sit *over* scrolling content
and need to say so. `prefers-reduced-transparency` turns both opaque. Nothing
else may take blur, and a third exception wants an argument, not a commit.

Surfaces are paint. The material tokens still resolve — `--mat-*-blur` is `0px`
— so no existing rule needs finding and deleting, but **do not add a new
`backdrop-filter`**. If you believe a surface needs to be translucent, it needs
to be argued first.

---

## 6 · LANGUAGE

The app talks to a boat dealer, not to a database.

- **Use the dealer's nouns.** "40 boats in 3 series", not "29 VARIANTS · 56
  COLUMNS · 11 SECTIONS". The row noun comes from the table, so a motorcycle
  shop reads "40 bikes" for free.
- **No jargon in chrome.** Not "entity", not "UID", not "cardinality".
- **Say what a thing does, not what it is.** "What goes with each one" beats
  "Join editor" — but keep it to a phrase. The outgoing build wrote door
  captions as ad copy (*"WALK EVERY ROW, COLLECT THE MATCHES"*) and it read as a
  brochure, not a tool.
- **A refusal is a sentence with a reason**, in the place where the thing is
  refused: *"Nothing on this table is marked as a price. Set price columns on
  Highfield Inflatables first."* Never a disabled control with no explanation.
- **Never name a file the user did not import.** A dealer who sees another
  dealer's price file named on their own screen learns this app does not know
  whose data is whose.

---

## 7 · SAFETY, WHICH IS ALSO DESIGN

- **If an act is undoable it gets a toast with UNDO, not a dialog.** Dialogs are
  for the genuinely irreversible. Every confirm sheet is a full stop in the
  middle of somebody's work.
- **What is not undoable says so at the moment it happens** — never in a spec,
  never in a tooltip.
- **A confirm states its blast radius**, computed: *"3 business rules name this
  column, 1 formula reads it, 38 of 40 rows hold a value."*
- **Structure is never a side effect.** A new table, column or join is never
  created by a browse or pick action. It is offered, in a sentence that names it,
  and it is undoable.
- **A suggestion that is confidently wrong is worse than no suggestion.** If a
  guess is weak, say it is a guess.

---

## 8 · HOW THIS IS ENFORCED

```bash
npm test
```

| guard | catches |
|---|---|
| `vitest` | logic regressions |
| `check-reachability` | a feature reachable from nothing |
| `check-styles` | **a class written in TSX that no CSS declares** |

`check-styles` is the one written for the redesign. The characteristic failure of
a stylesheet change is an element that still renders and is silently unstyled —
`tsc` green, build green, feature reachable, screen wrong. **19 pre-existing
orphans are baselined in `tools/style-baseline.json`; you may not add a 20th.**
When you clear one, run `node tools/check-styles.mjs --update-baseline`.

It was 35 until the prose pass; sixteen went with the surfaces that stopped
drawing them, and the baseline was re-banked once at the end of it.

### What the guards cannot see

Say it out loud rather than assume coverage:

- **Contrast** — not automated. Measure in the browser when you add a surface.
- **Layout at a width** — no visual regression tooling exists.
- **Whether the screen makes sense** — that is a person's job.

### If you re-run a contrast sweep, get the ruler right

Three sweeps during the redesign reported false catastrophes before one was
correct. The first could not parse `color(srgb …)`. The second read its 0–1
channels as 0–255 and condemned every card title at 1.1:1. The third ignored
alpha, so a 3.5% tint over white read as near-black. **Parse `color()`,
composite the full ancestor chain, and composite translucent text over it** — or
you will spend an hour fixing an app that is fine.

---

## 9 · WHERE THINGS LIVE

| file | what it owns |
|---|---|
| `src/styles/ds.css` | the system — tokens, both themes, type steps, press, focus |
| `src/styles/bridge.css` | maps the app's original token names onto the system |
| `src/styles/tokens.css`, `base.css` | the ORIGINAL system. Do not add to these |
| `src/features/*/*.css` | each feature's own appearance, appended per feature |
| `/design.html` | every surface drawn, both themes — the reference |

**Adding a screen?** Use existing tokens, append to the feature's own stylesheet,
and check it against `/design.html`. **Do not** create a shared override layer:
two stylesheets fighting over one screen is worse than the problem it solves.

**Changing the system itself?** That is `ds.css`, and it changes every screen at
once — so it wants a reason, and a note in this file.

**The one change made to `ds.css` since this file was written** is `--scrim`,
light and dark. A modal's dim had no token, so the two features that needed a
wash that gets *darker* on dark — the board's deal popup and the saved-
configuration sheet — wrote literal `rgba()` instead. Every other scrim in the
app builds from `--mat-dim-bg`, `--bg-sunken` or a `color-mix` of `--ink`, and
none of those three deepens on dark.

---

## 10 · THE ONE-LINE ROLLBACK

`src/main.tsx` imports `./styles/bridge.css`. Deleting that line returns the app
to The Chart Room. It is there so this was safe to do at speed — not because
anyone should.
