# SHOWROOM & COCKPIT — how to build a screen here

**This supersedes `DESIGN_PRINCIPLES.md`, `ART_DIRECTION.md` and `APPLE_PASS.md`,
all three now in `docs/specs/archive/`.** If any of them disagrees with this
file, this file wins. They are kept because a repo that hides its reversals
repeats them, and §9 explains exactly what was reversed and why.

**Who this is for.** Anyone adding a screen, a component or a rule, including a
future session that has never seen the rebuild. Follow it and your screen will
look like it belongs. Ignore it and it will look like the thing the rebuild
removed.

---

## 0 · THE THESIS

**This app is two rooms, and it must stop pretending to be one.**

A boat dealership has a showroom floor and a back office. A salesperson walks a
customer across the floor, then goes and works. Those are different rooms with
different light, and a building that painted both the same colour would be a
badly designed building.

The previous system was called *Quiet Precision* and its stated goal was to be
*"boring in the way good instruments are boring."* Applied to every screen, that
did two kinds of damage at once: it made the moments a customer sees **dull**,
and — because restraint was the whole answer — it never actually delivered the
**density** the working screens needed either. Both rooms lost.

So: two registers, named, with different requirements. A screen belongs to
exactly one and says which.

> **SHOWROOM** is where somebody is being sold to.
> **COCKPIT** is where somebody is working.

Neither is a licence. Showroom is not decoration and Cockpit is not austerity.
They are two different jobs with two different definitions of good.

---

## 1 · THE TWO REGISTERS

### Which is which

| register | screens |
|---|---|
| **SHOWROOM** | home · the quote picker · the configurator · the cascade sheet · the quote document · module catalogues and galleries · onboarding · sign-in |
| **COCKPIT** | the register (table grid) · data model · columns/designer · business rules · fitment & flow · review/lint · levels · admin · access · import/export · the pipeline board · customers |

**The test, when a screen is ambiguous:** *could a customer be looking at this
over the dealer's shoulder?* If yes, Showroom. The catalogue is Showroom because
a dealer turns the screen around. The column designer is Cockpit because nobody
has ever turned that screen around.

### How a screen declares itself

The stage root carries `data-register="showroom"` or `data-register="cockpit"`.
Tokens that differ between registers are defined under those attributes and
nowhere else. **A component never branches on register in TSX** — it takes the
tokens it is given. If a component genuinely needs two shapes, it is two
components.

A screen may not be half of each. A Showroom screen containing a dense table
puts the table in a Cockpit *region* — `data-register="cockpit"` on that
subtree — and the nesting is deliberate and visible in the markup.

---

## 2 · WHAT EACH REGISTER REQUIRES

The old file was a list of prohibitions. A list of prohibitions produces a
screen that breaks no rules and is still bad. These are **requirements**, and a
screen that does not meet them is not done.

### SHOWROOM requires

1. **A product stage.** The thing being sold is present, large, and
   photographic. Not an icon, not a placeholder, not a 200px thumbnail in a
   white box. We hold 108 seeded photographs and per-colourway renders; use
   them.
2. **Depth.** Surfaces sit at real elevations, with light that comes from one
   direction. A flat plane with a hairline is a Cockpit surface.
3. **A choreographed entrance.** The screen arrives — staggered, spring-settled,
   once. Not a paint.
4. **A figure that is the subject.** Where there is a price, it is the largest
   number on the screen and it is set in mono, tabular.
5. **Scale contrast of at least 6× on the stage** (largest ÷ smallest rendered
   font size within `main`). Measured, not intended. See §4.

### COCKPIT requires

1. **Density.** At 1280×800, a table screen shows **at least 18 data rows**
   without scrolling. The build at the time of the rebuild showed twelve. A nav
   surface shows every destination without scrolling.
2. **Tabular figures.** Every number in a column is mono with
   `font-variant-numeric: tabular-nums`. A column of money lines up on the
   decimal or it is wrong.
3. **Keyboard parity.** Every action reachable by pointer is reachable by
   keyboard, and the shortcut is rendered inline where the action is, so it
   teaches itself.
4. **No entrance animation.** Cockpit screens paint. See §6.
5. **Scale contrast between 2.5× and 3.2×.** Cockpit tops out at `display`, so
   31/11 is the ceiling the ramp can physically reach; a band above that would
   be a requirement nothing can meet. Cockpit is not supposed to shout — it is
   supposed to be legible and dense. A billboard heading over a six-item menu is
   the failure this rebuild exists to remove, and the fix for it was never a
   smaller heading: it was filling the middle of the ramp so the heading has
   something to sit above.

---

## 3 · COLOUR

### Never write a literal colour

```css
/* NO  */  color: #5f6c7b;   background: rgba(18,40,63,.08);
/* YES */  color: var(--fg-secondary);   background: var(--accent-wash);
```

Four exemptions, each earned and each already written: `src/styles/` (a literal
on the right of a token declaration IS the mechanism), `@media print` (paper has
no theme), `mask-image` (a mask reads alpha; `#000` there means "hide"), and the
design gallery. A fifth wants an argument, not a commit.

### Contrast is measured, and a tint counts

**Every text/background pair clears 4.5:1**, composited over the full ancestor
chain, with translucent text composited over its real ground. This is the one
rule from the old system that never needed changing and was still broken in 21
places on the register at the time of the rebuild — a kind hue used as reading
ink measuring 4.33:1 on a tinted band, while a comment two files away claimed it
had been measured.

`--fg-quaternary` may never carry meaning. It is for rules, ticks and marks that
are `aria-hidden`.

### The accent, and how much of it

One accent for action. There is **no fixed count per screen** — the old rule of
"roughly four times" was a Cockpit rule generalised to everything, and on a
Showroom screen it starved the design. The real rule is the one it was reaching
for:

> **If everything is accent, nothing is primary.** A screen has one primary
> action. The accent marks it, the current nav row, the focused control, and
> state that is genuinely active. It does not mark things because they would
> look better marked.

### Kind is identity

Boat, motor, trailer and rigging kit are the four nouns the business is made of.
A person should know which is in front of them without reading a word.

A kind hue may carry a **surface** — a tinted band head, a card rail at full
height, a filter chip, a selected row. Three constraints, all absolute:

- **It never sits behind reading text**, and the 4.5:1 floor is not negotiable
  when it carries text of its own.
- **A hue only ever appears on something that HAS that kind.** Two things of one
  kind are one colour everywhere in the app.
- **A figure is never a hue.** A price is not decorative.

The mechanism is one custom property: a host sets `--kind` and takes `.k-rail`,
`.k-wash`, `.k-band`, `.k-chip`, `.k-filter`, `.k-dot`, `.k-lift`.

### Showroom may saturate

Showroom surfaces may carry real colour — a photographic ground, a gradient that
is a surface, a glow that is a state. **The 6% alpha ceiling is deleted** (§9).
What replaces it is the measurement, not a number: *put the text on it and
measure*. If it clears 4.5:1, it is legal.

---

## 4 · TYPE

### Three faces

**Inter** for everything a person reads. **IBM Plex Mono** for every figure,
code, SKU and identifier. **Archivo** for display, and nothing else.

Mono is not decoration — it is what makes a column of money line up.

### One ramp, and the middle carries the work

Three type vocabularies coexisted before the rebuild — `--t-*`, the bridge's
`--ui-*`/`--display-*`/`--data-*`, and raw px — and the stylesheet that shipped
last admitted the *bridge* names were the ones features actually consumed.
**There is now one.** If you find a second, it is a bug.

| step | size | use |
|---|---|---|
| `--t-marque` | clamp 66 → 88px | Showroom only. The product name on a stage. One per screen |
| `--t-hero` | clamp 34 → 44px | Showroom stage titles, the price figure |
| `--t-display` | clamp 28 → 36px | section titles on a Showroom screen; the stage title in Cockpit |
| `--t-title` | 24px | panel headers, dialog titles, card names on a Showroom card |
| `--t-subtitle` | **19px** | the step that did not exist |
| `--t-heading` | 16px | row heads, card names in Cockpit — the thing you scan for |
| `--t-body` | 14px | the default |
| `--t-small` | 13px | secondary text, help |
| `--t-caption` | 12px | metadata beside what it describes |
| `--t-label` | 11px | the one uppercase style |

**The 56px hole is the defect this table exists to fix.** The old ramp went
26.88px to 82.86px with nothing between, so every screen was a billboard over
fine print, and eleven of twelve screens measured 2.36x–3.96x where the spec
asked for about 7x.

**Take the whole step.** Size, weight, leading and tracking travel together.
Tracking goes negative as size grows, about 0 at reading size, `+0.06em` only on
the 11px label.

**The floor is 11px** and it is enforced. The display face is barred below 26px
on top of that.

### Uppercase, precisely

Allowed on section captions, group captions, and mono stamps. That is the list.
Never a table name, a row label, a column value, a button, or a sentence.
Uppercasing content is lossy — `PVC` uppercased cannot be told from a value the
dealer typed as `Pvc`, and those are different facts about their data.

### Nothing truncates mid-word

If a strip does not fit, it scrolls. If a name does not fit, it wraps or clamps
to two lines with the full text still in the DOM. A proper noun is the one
string a truncation cannot be read through.

---

## 5 · SPACE, DEPTH, MATERIAL

- **One spacing scale.** `--s-1` through `--s-16`. There is no `--sp-*`.
- **Radius:** `--r-chip` 4 · `--r-control` 6 · `--r-card` 10 · `--r-panel` 14 ·
  `--r-full`.
- **Component tokens exist.** `--button-h-md`, `--input-pad-x`, `--row-h`.
  Before the rebuild, 39 stylesheets each re-derived a button; that is why there
  were 295 distinct button treatments, 137 of them missing at least one of
  hover, press and focus.
- **Rows:** 44 comfortable · 32 default · 24 dense. Cockpit defaults to 32.
- **Elevation** is `--e1` through `--e-hero`. Never hand-roll a `box-shadow`.

### Material is back on

The old system shipped a full expressive layer — gradients, glass, aurora,
grain, sheen — and then a bridge stylesheet set every blur token to `0px`,
switching the whole thing off. Components were then rejected on the grounds that
they were not visible. **Both halves of that are gone.**

Material rules, which are Apple's and are good:

- **Bigger surfaces read as thicker** — stronger blur and a deeper shadow than a
  small chip.
- **Never stack a translucent surface on another.** Legibility collapses.
- **Dim to focus, separate to keep flow.** A blocking task gets a scrim and
  pushes the background back. A parallel panel gets translucency and offset and
  *no* scrim.
- **Scroll-edge fades, not hard dividers.** Where floating chrome overlaps
  content, fade a small gradient mask — do not draw a 1px border and call it
  separation.
- **Put colour on a solid layer, not the translucent foreground.** Over a
  blurred ground, text goes higher-contrast and slightly heavier, never flat
  grey.
- **Materialize, don't fade.** A glass surface animates blur radius and scale
  together on enter, so it reads as a material arriving.

`prefers-reduced-transparency` turns every one of these opaque.

---

## 6 · MOTION

### The gate — ask before you animate

Frequency decides, and it decides per register.

| how often | decision |
|---|---|
| **100+ times a day** — keyboard shortcuts, the palette, cell edit | **No animation. Ever.** |
| **Tens of times a day** — hover, row nav, column menus | Near-imperceptible or nothing |
| **Occasional** — sheets, dialogs, toasts, stage changes | Standard animation |
| **Once a quote / once a session** — the picker arriving, a cascade, issuing a document | **The budget lives here** |

**Keyboard-initiated actions are a disqualifier, not a judgement call.**

This table governs **Cockpit** in full. It governs **Showroom** only in its
first two rows: the moments a customer sees happen once per quote, and that is
the bottom row, which is where choreography belongs. Applying the 100-times-a-day
rule to a once-per-quote moment is the error that produced a static app.

An animation must be one of: **feedback · spatial consistency · state
indication · preventing a jarring change · explanation · delight (bottom row
only)**. "It looks cool" is not on the list.

### Exact values. Never invent one

```css
--ease-out:     cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer:  cubic-bezier(0.32, 0.72, 0, 1);
```

Never `ease-in` on a UI element — it delays the initial movement, which is the
exact moment the user is watching most closely.

| element | duration |
|---|---|
| press feedback | 100–160ms |
| tooltip, small popover | 125–200ms |
| dropdown, select | 150–250ms |
| modal, drawer, sheet | 200–500ms |
| Showroom scene change | up to 620ms |

UI stays under 300ms. **Exit is faster than enter.**

### Springs

Apple's shipped values, as damping / response:

| gesture | damping | response |
|---|---|---|
| move, reposition | 1.0 | 0.4 |
| rotation | 0.8 | 0.4 |
| drawer, sheet | 0.8 | 0.3 |

Critically damped (1.0) by default. Bounce **only when the gesture itself
carried momentum** — overshoot on a menu that merely opened is wrong.

### Interruptibility is the most important rule here

The thought and the gesture happen in parallel.

- **Never lock out input during a transition.**
- **Always animate from the presentation (current) value, never the target** —
  or a grabbed element jumps on interrupt.
- **Blend velocity on reversal**, never hard-cut it.
- **Hand the release velocity to the spring.**
- Decompose 2D motion into independent X and Y springs.
- Press lands on **pointer-down**, not on release.

### Never ship

| never | instead |
|---|---|
| `transition: all` | name the properties |
| `transform: scale(0)` entrance | `scale(0.95)` plus opacity |
| built-in `ease-out` on a deliberate animation | the curve above |
| animating `width`/`height`/`margin`/`top`/`left` | `transform` / `opacity` |
| Motion's `x`/`y`/`scale` shorthand under load | the full `transform` string — the shorthand is **not** hardware-accelerated |
| everything entering at once | 30–80ms stagger |
| ungated `:hover` motion | `@media (hover: hover) and (pointer: fine)` |
| a missing `prefers-reduced-motion` | a gentler variant, **not zero** |

Reduced motion means **movement goes, colour and opacity stay**. A press that
stops confirming itself is a worse interface, not a gentler one.

### Two things that stay rejected, and the reasons

- **The price figure does not count up.** A dealer reads it aloud to a customer.
  The delta appears and fades; the figure does not tick.
- **No cursor trails, ball pits or ambient particle fields.** Not because they
  are expressive — because they sit behind a live price file.

Everything else the old corpus rejected is re-openable, and §9 says why.

---

## 7 · LANGUAGE

The app talks to a boat dealer, not to a database.

- **Use the dealer's nouns.** "40 boats in 3 series", not "29 VARIANTS · 56
  COLUMNS". The row noun comes from the table, so a motorcycle shop reads "40
  bikes" for free.
- **No jargon in chrome.** Not "entity", not "UID", not "cardinality".
- **Say what a thing does, not what it is** — and keep it to a phrase. Door
  captions written as ad copy read as a brochure, not a tool.
- **A refusal is a sentence with a reason, in the place where the thing is
  refused.** Never a disabled control with no explanation. Chain it when the
  chain is real: *"Because X, and because Y, Z is not offered"* — and where a
  fix exists, offer at most two, **priced**.
- **Never name a file the user did not import.**
- **No sentence the app writes about itself reaches twelve words.** On five of
  seven surfaces before the rebuild, more than half the words were the app
  narrating itself.

---

## 8 · SAFETY, WHICH IS ALSO DESIGN

- **If an act is undoable it gets a toast with UNDO, not a dialog.** Dialogs are
  for the genuinely irreversible.
- **What is not undoable says so at the moment it happens.**
- **A confirm states its blast radius**, computed: *"3 business rules name this
  column, 1 formula reads it, 38 of 40 rows hold a value."*
- **Structure is never a side effect.** A table, column or join is never created
  by a browse or a pick.
- **A suggestion that is confidently wrong is worse than no suggestion.** If a
  guess is weak, say it is a guess.
- **Never invent a figure the price file does not carry.** No assumed markup, no
  assumed labour rate, no assumed GST divisor, no assumed deposit. If the number
  is not a column in the project's own data, the quote does not produce it.

---

## 9 · WHAT WAS DELETED FROM THE OLD CONSTITUTION, AND WHY

Recorded so nobody re-derives it from first principles and re-blocks the work.

**1 · "Boring in the way good instruments are boring."** Deleted as a global
goal. It is a fair description of Cockpit and a bad one for the screens a
customer sees. Generalised to everything, it produced an app the owner
repeatedly rejected on sight.

**2 · The 6% alpha ceiling on the expressive layer.** Deleted. It was stated as
though it were physics — *"raise it and you invalidate the table above"* — but it
is a decision, and the table it protects can simply be re-measured. It was the
stated grounds for killing the one component that had actually been built and
verified working in the browser. **The replacement is the measurement itself:**
put text on the surface and check 4.5:1.

**3 · "Glass is retired" and "no new `backdrop-filter`."** Deleted, along with
the bridge stylesheet that set every material blur token to `0px`. The system
had a full material vocabulary switched off, and then rejected external
components for being invisible against surfaces it had flattened. §5 is the
replacement.

**4 · "One accent, roughly four times per screen."** Replaced by the principle
it was approximating (§3). A count is not a design rule.

**5 · The frequency table as a universal filter.** Narrowed to Cockpit plus the
first two rows everywhere (§6). It is an excellent rule about things done four
hundred times a day and a wrong one about things done once per quote.

**6 · "No step rail and no progress at all"** (from `PHASE_TWO`). Reversed for
the configurator specifically. The evidence cited against progress indicators is
real, but it is about *linear web forms*, and it was applied to a seven-stage
build that a dealer leaves and returns to. The original HelmLogic's step rail is
the single clearest thing it does better than us.

**7 · Three library verdicts, reopened.** The corpus rejected react-bits as *"27
components… none fits"* while naming nine; magicui as *"100 components… three
fit"* while naming about fifteen; and eight of eleven design-gallery categories
as "not software" — two of which were Typography and Motion. Those verdicts are
unevidenced for the components never enumerated, and are reopened. What survives
is still built **natively in tokens**; nothing gets installed for a visual
effect.

**8 · "There is no colour column, so swatches would be a guess."** Factually
wrong, and the correction is appended to
`docs/research/godly-and-what-transfers.md`. `HELMLOGIC_GROUND_TRUTH.md` §1.3
documents the decode map, and the production app ships it.

### What did NOT change

Everything in §3 (contrast), §7 (language) and §8 (safety) is carried forward
intact. The old file was right about how to talk to a dealer, right about
refusals carrying reasons, right about undo, right that a tint counts, and right
that measurement beats opinion. Those are the parts worth keeping, and the
rebuild keeps them.

---

## 10 · HOW THIS IS ENFORCED

```bash
npm test
```

| guard | catches |
|---|---|
| `check:types` | a type error |
| `lint` | a lint regression, against a ratchet |
| `vitest` | a logic regression |
| `check:reachable` | a feature reachable from nothing |
| `check:styles` | a class in TSX no stylesheet declares · a literal colour · a `var()` nothing declares · a `px` font-size under 11 · **type-ramp coverage** |
| `check:stores` | a localStorage key no reset classifies |

And, needing a running server:

| guard | catches |
|---|---|
| `check:contrast` | a text/ground pair under its threshold, over **every** screen |
| `check:shots` | a screen that changed and nobody looked |
| `check:density` | a Cockpit screen under 18 rows at 1280x800 |

**Ramp coverage replaces the literal-px ratchet.** Counting literal pixels
measured tidiness; it never once caught the actual defect, which was a screen
using two type steps out of ten. The new check counts *distinct steps in use per
screen* and fails when a screen is bimodal.

### What the guards cannot see

- **Whether a screen makes sense** is a person's job, still.
- **Whether it is beautiful** is a person's job, still. `/design.html` draws
  every surface in both registers and both themes; check your screen against it
  before you commit.

---

## 11 · WHERE THINGS LIVE

| file | owns |
|---|---|
| `src/styles/system.css` | the system — tokens, both registers, both themes, type, press, focus |
| `src/ui/**` | the primitives. None accepts `className` or `style` |
| `src/features/*/*.css` | a feature's own appearance |
| `/design.html` | every surface drawn — the reference |

**Adding a screen?** Declare its register, use existing tokens, append to the
feature's own stylesheet, check it against `/design.html`. **Do not create a
shared override layer** — two stylesheets fighting over one screen is worse than
the problem it solves.

**Changing the system itself?** That is `system.css`, and it changes every
screen at once — so it wants a reason, and a note in this file.
