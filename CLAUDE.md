# Working in this repo

## Before you style anything

**Read `docs/specs/DESIGN_SYSTEM.md` first.** It supersedes
`DESIGN_PRINCIPLES.md`, `ART_DIRECTION.md` and `APPLE_PASS.md`, all three now in
`docs/specs/archive/`.

**The app is two registers, and a screen belongs to exactly one.**

- **SHOWROOM** — home, the quote picker, the configurator, the cascade, the
  quote document, catalogues, onboarding. Somebody is being sold to, and a
  customer may be looking over the dealer's shoulder.
- **COCKPIT** — the register, data, columns, rules, fitment, review, levels,
  admin, the board, customers. Somebody is working, all day.

The stage root carries `data-register`. A component never branches on register
in TSX; it takes the tokens it is given.

**Each register has requirements, not just prohibitions** — a screen that breaks
no rules and is still bad is the failure this replaced. Showroom needs a
photographic product stage, real depth, a choreographed entrance, and ≥6× scale
contrast. Cockpit needs ≥18 rows at 1280×800, tabular figures, keyboard parity,
no entrance animation, and 2.5–4× scale contrast.

The rules that hold everywhere:

1. Never write a literal colour — use a token.
2. Never write a `font-size` below **11px**.
3. Uppercase is a label style, **never** a name or a value.
4. Every text/background pair clears **4.5:1** — and a tint counts.
5. One primary action per screen. A kind hue only marks a thing that HAS that
   kind, and a figure is never a hue.
6. Type steps are sets — size, weight, leading and tracking travel together.
7. Tracking goes **negative** as size grows, ~0 at reading size.
8. Every pressable thing has hover, press and focus. Press on pointer-down.
9. If an act is undoable it gets a toast with UNDO, not a dialog.
10. Anything that cannot be done says **why**, where it is.
11. Never invent a figure the price file does not carry.

**Motion: never invent a curve or a duration.** §6 of `DESIGN_SYSTEM.md` carries
the exact values. Keyboard-initiated actions do not animate — that is a
disqualifier, not a judgement call. Motion's `x`/`y`/`scale` shorthand is *not*
hardware-accelerated; use the full `transform` string.

**§9 records what was deleted from the old constitution and why** — the 6% alpha
cap, "glass is retired", the accent count, the frequency table as a universal
filter. Read it before you re-derive any of them and re-block the work. It is
there because those clauses, not laziness, are what rejected every visual idea
this project brought for months.

**Every screen is rebuilt and measured** — `docs/specs/SCREENS.md` is the
inventory (every stage, who uses it, the experience it must give, its
status) and `docs/research/visual-qa-rebuild.md` is the scoreboard, one
entry per pass. The standard changed on 2026-09-15 and the inventory
restates it: every section is designed from real boat-configurator
references driven live (`out/ref/`, `out/ref/boats/`, `out/ref/entry/`),
never one treatment stamped across screens, and **nothing is faked** — no
seeded customer, quote, pairing or photograph; an empty state is the true
state. Two rules that came out of it and now run through the app:

- **The tile rule.** A card asks its own picture (`src/features/quote/scene.ts`
  reads the edge ring of the pixels): a photograph makes a *scene tile* —
  picture to the edge, the name over it in the wide light face, an
  outline pill — and a render makes a *studio tile* — the render on white,
  the name under it. Highfield's file holds only renders, so Highfield is
  studio everywhere until real photography is added; it is never faked.
- **The entry frame** (`src/features/entry/`). Sign-in, the wizard and the
  first run share Porsche's login frame: the dealer's own Stacer running
  across most of the window, captioned as the file's, and a white column
  with the one thing being asked.

`#build=old` in the URL returns every shipped screen and the answer is
remembered; `#build=new` comes back. `src/features/quote/rebuilt.ts` is
the one switch, and carries why it is a hash and not a search param.

The design system is `src/styles/system.css`; `src/styles/world.css` is
the last-imported token file and holds the world the rebuilt screens draw
in (the sea-blue `--action`, the `--scene-*` inks, `--font-wide`). Every
surface is drawn at `/design.html` (`npm run dev`, then open it) — check
your screen against it.

## Before you commit

```bash
npm test
```

**Seven** guards, in this order: `check:types` → `lint` → `vitest run` →
`check:reachable` → `check:styles` → `check:words` → `check:stores`. It ran
three of those until 2026-09-08 —
a typecheck-clean tree and a lint-clean tree were assumed, not checked. Never
run a bare `tsc`; the project config is
`npx tsc --noEmit -p tsconfig.app.json`.

**The lint ceiling is a ratchet, not a budget.** `oxlint src tools
--max-warnings 343`. It landed at 411 (`31d1265`, the first time a linter had
ever run here) and has come down to 343. Clear warnings and lower the number in
the same commit. The 344th warning is a failure, not a new baseline.

**`check-styles`** fails if a class is written in TSX that no stylesheet
declares. 17 pre-existing orphans are baselined in `tools/style-baseline.json`;
you may not add an 18th. Clear one and run `node tools/check-styles.mjs
--update-baseline`. It was 35 before the prose pass cleared sixteen of them.
It also prints the dead rules — 177 at `530597d`, 133 at `3c0e8e1` — which it
does not fail on, which is why that number drifts.

**And it holds a ratchet on the type ramp.** REDESIGN_ROLLOUT step 4 and
RESPONSIVE both track "how much type goes through the scale", and both tracked
it as a number in prose, which rotted three times: 878 literal / 21% tokens in
the doc, 722 / 59% on a later sweep, 1,624 declarations with 1,012 through
tokens and **518 literal px** measured 2026-09-11; **460 at `3c0e8e1`**, the
ceiling lowered with it. `check-styles` counts it on
every run, prints it in the OK line, and fails if it RISES. A literal px is not
a defect — a caption that must not scale is a legitimate one — so nothing is
forbidden except the count going up. Clear some and lower `LITERAL_PX_CEILING`
in the same commit; it may never go up. `src/design` is exempt, and a `clamp()`
is not a literal: it is the ramp itself.

**And it fails on a literal colour.** DESIGN_PRINCIPLES rule 1 is the first on
the list and was the last without a guard. REDESIGN_ROLLOUT put the count at
nine; swept properly it was 24 in shipped feature CSS, and the nineteen that
mattered were `rgba(255, 255, 255, 0.0x)` washes over the navy chrome — a
literal white does not follow a theme, and every one of them sat on a ground
that is redefined in dark mode. Four exemptions, each earned: `src/styles/` (a
literal on the right of a token declaration IS the mechanism), `src/design/`
(the gallery), `@media print` (paper has no theme — quote.css argues it), and
`mask-image` (a mask reads the alpha channel; `#000` there means "hide"). One
stated exception costs a sentence in `COLOUR_ALLOW`.

**And it fails on a `var()` nothing declares.** An undefined custom property
does not warn — it voids the whole declaration that reads it. That has now bitten
this project three times: `--chrome` and its twelve ink tiers (shell.css records
it), and then `--ease-settle`, `--s-7` and `--fg-primary`, found by writing this
sweep. Measured before the fix: `.win`'s computed `animation-name` was `none`,
so the window materialise shell.css describes in a paragraph never ran. A
`var(--x, fallback)` is not a finding — a fallback declares the name optional —
and a name set from TSX (`style={{'--i': n}}`) counts as declared.

**It also holds the type floor.** DESIGN_PRINCIPLES rule 2 — "never write a
`font-size` below 11px" — was kept by hand for a year and then was not:
`.ds-chip` in `ds.css`, the system's own chip, sat at 10.5px. The sweep fails
on any `px` font-size under 11 in `src/`, with `src/design/` exempt because the
gallery draws miniatures of whole screens and that type is a picture of type
rather than type a person reads. `rem` and `em` are not checked: a guard that
guessed at the root size would be inventing the number it failed on.

`npm run build` must also pass.

## What the guards cannot see

Stated so nobody assumes coverage.

**What is covered, measured 2026-09-15 at `3c0e8e1`:** 199 test files, 2,974
passing and one `it.fails` — `src/lib/configure/contradiction.test.ts:652`,
a known solver defect asserted out loud rather than left silent.
`vitest.config.ts` runs two projects, split by file extension so neither can
quietly become the other:
`.test.ts` is logic in `node` (161 files); `.test.tsx` renders in `happy-dom`
— **38 files**, over the shell's dialog and stage entry (`src/app`), the
dashboard, the quote picker, the document, the registers and the rebuilt
screens. It was 4 files and 35 tests on 2026-09-09.

Those 35 exist because the picker's duplicated eyebrow was found by a rendering
test and not by three people reading the screen (`5d00103`). Query by role and
by text, never by class name: a test that asserts on a class fails when the
class is renamed and passes when the screen is broken.

**What is still uncovered:**

- **No E2E.** Nothing drives the real app end to end. `check-contrast` and
  `check-shots` open a browser, but each measures one thing — colour, and
  pixels.
- **188 non-test `.tsx` files, and 38 suites.** Better than a foothold; not
  coverage.
- **Whether a screen makes sense is a person's job**, still.

**Visual regression IS automated**, on fourteen screens — home, modules, one
module, data, the catalogue, a register, quotes, customers, the configurator,
a place, the cascade, the document and the board; the gallery lens is listed
and reported as unreached, because the catalogue replaced it:

```bash
npm run dev                        # in one terminal
npm run check:shots                # compares, exit 1 on drift
npm run check:shots -- --update    # re-takes the baselines
```

`tools/check-shots.mjs` drives the real Chrome through `playwright-core`,
signs in, loads the real seed and photographs each screen at 1280x800. The
baselines under `tools/shots/` **are committed** — the one place a PNG is
source in this repo (`.gitignore:36`) — so a fresh clone has something to
compare against. Not in `npm test`: it needs a server, exactly as
`check:contrast` does.

Identical renders give byte-identical PNGs, which is the fast path. When they
differ, both are decoded in the browser already running and counted pixel by
pixel, and a screen over the 0.1% threshold writes `<name>.actual.png` and
`<name>.diff.png` beside its baseline — the new screen at quarter strength
with every moved pixel painted magenta. **A guard that reports "43.152% of
pixels" and shows you nothing gets `--update`d until it means nothing.**

**Re-baseline only after looking at the diff and naming the commit that
caused it.** Measured 2026-09-11: six screens were red and every one traced
to deliberate committed work — the dashboard redesign (`b7eead0`), the
reviewer's door on Data, the Jobs lens, the pair-fact rule (`8908d95`) — and
a seventh, the catalogue, was UNREACHED because its default lens had moved
and the harness still looked for `.cat-gallery`. An unreached screen is a
picture nobody is taking; the guard says so on its own line.

**AND A MEASUREMENT TAKEN AGAINST A LONG-LIVED DEV SERVER MAY NOT BE
ABOUT YOUR CODE.** Vite's HMR serves partial transforms after a
structural edit — a new `const` or `import` used but not declared, a
new class on an element that never gets it. It bit three times in one
session: a screen rendered blank and measured as zero text leaves; a
`data-register` never appeared; an `is-lead` class was absent from the
DOM while present in the file. Every one looked like a code defect and
none was. **Restart `npm run dev` (and `rm -rf node_modules/.vite`)
before measuring anything you have just restructured**, and have every
driver print `pageerror` on its own line — that is what caught all
three.

**A performance number taken against `npm run dev` is not a number about
this product.** Measure against the build:

```bash
npm run build && npx vite preview --port 5092
HL_ORIGIN=http://localhost:5092 node tools/teardown/drive.mjs tools/teardown/selecttrace.mjs out
```

Measured 2026-09-11, selecting a table on the sheet with the Northside set
loaded (zoom 0.846, seven legible cards, seven grids, 3,292 elements,
1280x800): **64–100ms under `npm run dev`, 31–59ms against the built app.**
The Chrome trace says where it went — `EventDispatch` 49.3ms → 11.1ms, while
paint, style and layout barely move — and the CPU profile names it:
`jsxDEV`, `jsx`, `jsxDEVImpl`, `jsxs` and `ReactElement` account for about
103ms of self time, which is React's **development** JSX runtime and does not
exist in `dist/`. Backlog row 44 spent four correct, carefully measured
hypotheses on that number before anyone measured the product instead.

Not everything is dev overhead, which is why the rule is "measure", not
"assume it is fine": the same gesture harness puts the wheel-zoom at p50
20.7–51.4 against dev's 24–54, essentially unchanged. `selecttrace.mjs` and
`zoomtrace.mjs` take a real Chrome trace and a CPU profile, cut to the
gesture by `performance.mark`, and print it bucketed as scripting / style /
layout / paint with the hot functions by self time.

**Contrast is automated**, on eleven screens — home, modules, one module,
data, the catalogue, quotes, customers, the picker, a place, the configurator
and the document (the `SCREENS` table in `tools/check-contrast.mjs`). It takes
`--url http://localhost:5093` to measure a second server:

```bash
npm run dev            # in one terminal
npm run check:contrast # in another
```

`tools/check-contrast.mjs` drives the system Chrome through `playwright-core`,
signs in, loads the real seed, and measures every text-bearing leaf against the
ground it is actually drawn on. It is not in `npm test` because it needs a
server; run it when you add or re-colour a surface.

It embodies the three mistakes that made the earlier sweeps lie — parse
`color(srgb …)` as well as `rgb()`, composite the **full** ancestor chain, and
composite translucent text over that ground before measuring. Three sweeps
during the redesign reported false catastrophes by skipping one of those, so the
parser returns null rather than guessing and each screen prints the heading it
actually found. A guard that silently measures the wrong screen reports clean
and means nothing.

Baseline when it landed (`7c56419`, 2026-09-08): 272 text nodes across five
screens, all clear. **Measured 2026-09-15 at `3c0e8e1`: 1,278 text nodes across
eleven screens, all clear, 182 `aria-hidden` nodes set aside.** Beside it,
`tools/check-collide.mjs` (nothing overlaps at 1440×900) and `tools/qa-sweep.mjs`
(every screen in a register, nothing thin, nothing cut) ran clean on the same
tree. All three need a server; a structural edit wants a cold restart first
(see above).

## Plans worth knowing about

| doc | what it is |
|---|---|
| `docs/specs/DESIGN_SYSTEM.md` | how to build a screen. **Start here** |
| `docs/plan/REBUILD.md` | the ground-up rebuild: the two registers, the phases |
| `docs/specs/RESPONSIVE.md` | how a screen answers the window. The eleventh rule |
| `docs/plan/MODULE_SYSTEM.md` | what the app is becoming — modules, capabilities |
| `docs/plan/UX_PASS.md` | the process work: undo, search, import, refusals |
| `docs/plan/REDESIGN_ROLLOUT.md` | how the re-skin was done, and what is left |
| `docs/audit/UX_AUDIT.md` | the evidence everything above is answering |
| `docs/BACKLOG.md` | the reconciled backlog. What is actually open, ranked |
| `docs/research/INDEX.md` | every `/subtask` research run, and what it decided |

## Conventions that already exist and should be kept

- **Stylesheets are co-located with their feature** (`src/features/*/*.css`).
  Append there. Do not create a shared override layer — two stylesheets fighting
  over one screen is worse than the problem it solves.
- **Commit messages explain the decision**, not the diff. Say what was measured
  and why the change is what it is.
- **`main` carries the rebuild.** `rebuild` was fast-forwarded into `main` and
  pushed on 2026-09-15 at `3c0e8e1` (86 commits since `e36c61b`, where `main`
  and `stunning` were last identical). Work continues on `rebuild` and lands on
  `main` the same way. `stunning` is behind and stays so; `redesign` is
  abandoned at 48 ahead, last touched 2026-09-01; do not branch from either.

## Where learnings go

**A learning that lives only in a chat session is a learning that gets lost.**
This project lost a set of sessions once. The docs are what survived, which is
why the docs are where research goes — not the conversation.

- Researching how to build something? Run **`/subtask <the thing>`**. It grounds
  in what this repo already decided, researches the best in the world, maps the
  two against each other, and writes `docs/research/<slug>.md`. Add the row to
  `docs/research/INDEX.md`.
- Learned something mid-build that changes a plan? **Amend the plan doc**, and
  say so in the commit. Do not leave two documents disagreeing.
- **The docs lag the tree.** Verify a claim against code before acting on it.
  `README.md` claimed the quote flow was unbuilt while `src/features/quote/` had
  twenty files — it has 35 now, and the README was rewritten on 2026-09-08
  (`6473324`) for exactly that reason. This file said "no component tests, 112
  test files, zero `.tsx`" for a day after four `.tsx` suites landed.
  `docs/BACKLOG.md` is the reconciled view; keep it that way.
