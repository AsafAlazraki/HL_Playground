# Responding to the window

Read `DESIGN_PRINCIPLES.md` first. This is the eleventh rule, and it is the one
the ten did not cover: **a screen has a width, and the design has to have an
opinion about it.**

## What was measured, before anything was written

The app carried **41,000 lines of CSS and 55 `@media` rules.**

| what the rule was for | count |
|---|---|
| `prefers-reduced-motion` | 22 |
| `prefers-reduced-transparency` | 8 |
| `prefers-contrast` | 4 |
| `print` | 2 |
| **an actual width** | **19** |

Nineteen width breakpoints for a whole application, and every one of them was a
phone or a tablet rule: 620, 720 (×4), 760, 780 (×2), 900 (×3), 940, 1000, 1180.

> **The largest breakpoint in the entire application was 1180px.**

Above that width — which is every machine this product is demonstrated on, and
most machines it will be sold to — there was no layout opinion at all. Fixed
columns, centred, in a field of empty grid. `max-width: 1180px` appeared **18
times across 7 stylesheets**; it was not a measure, it was the page.

Two other figures from the same sweep, because they explain why a token change
alone could not have fixed this:

- **878 of 1,116 `font-size` declarations (79%) are literal px**, not tokens. The
  type scale is mostly bypassed.
- The scale the app actually reads is **not** `ds.css`'s `--t-*` set. `bridge.css`
  re-declares the legacy `--ui-*`, `--display-*`, `--data-*`, `--micro-*` and
  `--stamp-*` names as fixed px literals, and *those* are what `body` and every
  feature stylesheet consume. Ramping `--t-*` alone moved 21% of the type and
  left `body` at 14px. Measured, not assumed.

## The shape of the fix

`src/styles/response.css`, imported last in `main.tsx`. It **publishes names and
spends none of them** — there is not one selector in the file.

That is not tidiness. A feature stylesheet is imported by its component, so it
lands *after* the global ones and wins on equal specificity. The first draft of
that file styled `.dk-item` directly and measured **no change at all**: the dock
stayed 44px because `shell.css` had the same selector later in the cascade.
Custom properties do not have that problem. `--measure` resolved on the first
try.

So the contract is: **response.css publishes, the co-located stylesheet spends.**
Which is also what CLAUDE.md already asked for.

### The names

| token | what it is |
|---|---|
| `--measure` | the page width — `min(100%, clamp(1180px, 90vw, 2600px))` |
| `--gutter` | `clamp(16px, 2.4vw, 56px)` — a full-bleed surface off the window edge |
| `--section-gap` | `clamp(24px, 2vw, 44px)` |
| `--dock-clear` | the bottom strip no page may reach into |
| `--acts-clear` | the same, with the action bar's second tier |
| `--ab-height` / `--ab-control` | the action bar, in the dock's ratio |
| every size step | a `clamp()` from the tuned 1440 figure up to 2560 |

### The anchors, and why they are where they are

Every ramp runs between **1440px** and **2560px**.

- **1440** because that is the width the design was tuned at, and it must not
  move there. Below 1440 every value holds at its tuned figure.
- **2560** because past it a reading measure stops being a measure.

This file only ever adds headroom **upward**. Nothing that was already right can
regress, which is what makes it safe to land the night before a demo.

### Why the type ramps carry a `rem` term

`clamp(14px, 0.714rem + 0.179vw, 16px)` — never bare `vw`. A font-size in pure
viewport units does not respond to browser zoom, which turns a readability aid
into a trap.

### Why the display ramp is shallow

The first draft took `--display-xl` to 52px and `--display-l` to 44px. Those
tokens are spent on module headers, CRM, quotes and constraints — **dense data
surfaces**. Established practice caps a dashboard page title around 28px and a
card title around 24px, on the ground that an oversized heading on a data screen
steals room from the data and makes an ERP read as a landing page.

The baseline did not move: 38/32/26/22 at 1440 are the tuned figures and they
stay. What changed is the ceiling. A large screen gets a heading that is
proportionally bigger, not one that has changed job.

Onboarding is the one genuinely display-like surface in the app, and it takes its
hero size in `onboarding.css` rather than dragging the global scale up with it.

## Two numbers that were already wrong

**The dock's strip.** `shell.css` reserved a hard `78px`. The dock was 60px tall
sitting 22px off the floor — 82px. The strip was **4px short before any of this
was written**, and a growing dock would have turned a 4px graze into a 24px
overlap with page content passing behind it. It derives now.

**The action bar's strip.** `actionbar.css` charged a hard `132px`, built as
22 + 60 of dock + 10 of gap + 40 of bar. Three of those four numbers now move.
Derived, it still resolves to exactly 132 at the baseline — and on a large screen
it no longer puts the bar's bottom edge over the register's horizontal scrollbar,
which is a control, which the bar's own contract says it must never cover.

**The action bar's controls.** 18px bar, 28-in-40 control, so 6px of padding —
a concentric child radius is `18 − 6 = 12`. It was **7**, which is neither the
parent's radius nor concentric with it. `innerRadius = outerRadius − padding` is
the single highest-leverage rule available in an ERP, because every
toolbar-inside-a-card gets it wrong by default.

## What a new surface owes the window

1. **Spend `--measure`. Never type a page width.**
2. **A dashboard is not a marketing page.** Cap page titles near 28px, card
   titles near 24px.
3. **You do not have to fill the whole screen.** If a narrow element looks lost
   in a wide window, *split the layout into columns* rather than stretching the
   element. Sidebars take a fixed width suited to their content; the main area
   flexes. Cards take a max-width and shrink only when forced.
4. **Components respond to their container, pages respond to the viewport.**
   Where a component is reused at different widths, `container-type: inline-size`
   and `@container` — not `@media`.
5. **Content decides breakpoints.** Test with the longest realistic value in the
   real data, not the average. Never name a breakpoint after a device.
6. **Outer padding beats inner gap**, or the group does not read as a unit.
7. `text-wrap: balance` on headings. It is free, and it is what stops a
   two-line card title making a whole grid row ragged.

## What is still not covered

Stated so nobody assumes coverage.

- **Nothing below 620px has been re-measured** since the fluid layer landed. The
  phone rules that existed are still the phone rules that exist.
- **No visual regression tooling**, still. Contrast is still measured by hand,
  and a sweep must composite the full ancestor chain or it reports false
  catastrophes.
- **`@container` is used in almost nothing.** Six lines of the app know what a
  container query is. Rule 4 above is aspiration for most surfaces.
- The 878 literal `font-size` declarations are **not** converted. The ramp
  reaches the 21% that go through tokens.
