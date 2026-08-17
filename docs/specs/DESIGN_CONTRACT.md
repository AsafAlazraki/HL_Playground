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

**Two faces only.** Inter (`var(--font-ui)`) for anything a person reads. IBM Plex Mono
(`var(--font-mono)`) for **every figure, count, price, SKU and identifier**, always with
`font-variant-numeric: tabular-nums`. There is no third face; `--font-display` is mapped to the
sans, so a rule that asks for the serif silently gets Inter.

**The floor is 11px.** Absolute. `.md-verb` at 11.5px is the lowest thing the redesign drew.

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
    `--font-display` maps to the sans.
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