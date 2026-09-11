# Working in this repo

## Before you style anything

**Read `docs/specs/DESIGN_PRINCIPLES.md` first.** It is short, and it supersedes
`docs/specs/ART_DIRECTION.md` and `docs/specs/APPLE_PASS.md`, which describe a
design that has been replaced.

The ten rules, so a wrong turn is obvious before you open the file:

1. Never write a literal colour — use a token.
2. Never write a `font-size` below **11px**.
3. Uppercase is a label style, **never** a name or a value.
4. Every text/background pair clears **4.5:1** — and a tint counts.
5. One accent. Kind colour is an eighth-note, not a theme.
6. Type steps are sets — take size, weight, leading and tracking together.
7. Tracking goes **negative** as size grows, ~0 at reading size.
8. Every pressable thing has hover, press and focus. Press on pointer-down.
9. If an act is undoable it gets a toast with UNDO, not a dialog.
10. Anything that cannot be done says **why**, where it is.

The design system is `src/styles/ds.css`. Every surface is drawn at
`/design.html` (`npm run dev`, then open it) — check your screen against it.

## Before you commit

```bash
npm test
```

**Five** guards, in this order: `check:types` → `lint` → `vitest run` →
`check:reachable` → `check:styles`. It ran three of those until 2026-09-08 —
a typecheck-clean tree and a lint-clean tree were assumed, not checked. Never
run a bare `tsc`; the project config is
`npx tsc --noEmit -p tsconfig.app.json`.

**The lint ceiling is a ratchet, not a budget.** `oxlint src tools
--max-warnings 400`. It landed at 411 (`31d1265`, the first time a linter had
ever run here) and came down to 400 (`f853666`). Clear warnings and lower the
number in the same commit. The 401st warning is a failure, not a new baseline.

**`check-styles`** fails if a class is written in TSX that no stylesheet
declares. 19 pre-existing orphans are baselined in `tools/style-baseline.json`;
you may not add a 20th. Clear one and run `node tools/check-styles.mjs
--update-baseline`. It was 35 before the prose pass cleared sixteen of them.
It also prints the dead rules — 177 at `530597d`, 110 today — which it does
not fail on, which is why that number drifts.

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

**What is covered, measured 2026-09-09 at `530597d`:** 119 test files, 1,913
passing and one `it.fails` — `src/lib/configure/contradiction.test.ts:652`,
a known solver defect asserted out loud rather than left silent.
`vitest.config.ts` runs two projects, split by file extension so neither can
quietly become the other:
`.test.ts` is logic in `node` (115 files); `.test.tsx` renders in `happy-dom`
— **4 files, 35 rendering tests**, over the shell's dialog and stage entry
(`src/app`), the dashboard tiles, and the quote picker.

Those 35 exist because the picker's duplicated eyebrow was found by a rendering
test and not by three people reading the screen (`5d00103`). Query by role and
by text, never by class name: a test that asserts on a class fails when the
class is renamed and passes when the screen is broken.

**What is still uncovered:**

- **No visual regression tooling.** Nothing compares a screen against a picture
  of itself, so a layout can break in silence. This is the gap the four `.tsx`
  suites do *not* close — they assert structure, role and text, never pixels.
- **No E2E.** Nothing drives the real app end to end. `check-contrast` is the
  only thing that opens a browser and it measures one property, colour.
- **158 non-test `.tsx` files, and 4 suites.** A foothold, not coverage.
- **Whether a screen makes sense is a person's job**, still.

**Contrast is automated**, on five screens — home, modules, data, quotes,
customers (`tools/check-contrast.mjs:140-145`):

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

Baseline when it landed (`7c56419`, 2026-09-08): **272 text nodes across five
screens, all clear.** Not re-measured since — it needs a running server, so no
number here is asserted for today's tree.

## Plans worth knowing about

| doc | what it is |
|---|---|
| `docs/specs/DESIGN_PRINCIPLES.md` | how to build a screen. Start here |
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
- **`main` is the safe branch**, and it has not moved since 2026-08-15. Work
  lands on **`stunning`**: `origin/stunning` is 102 commits ahead of
  `origin/main`. `redesign` is abandoned at 48 ahead, last touched 2026-09-01;
  do not branch from it.

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
