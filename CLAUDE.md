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

Runs three guards: `vitest`, the reachability check, and **`check-styles`**,
which fails if a class is written in TSX that no stylesheet declares. 19
pre-existing orphans are baselined in `tools/style-baseline.json`; you may not
add a 20th. Clear one and run `node tools/check-styles.mjs --update-baseline`.
It was 35 before the prose pass cleared sixteen of them.

`npm run build` must also pass.

## What the guards cannot see

Stated so nobody assumes coverage: **contrast** is not automated, there is **no
visual regression tooling**, and whether a screen makes sense is a person's job.
If you add a surface, measure its contrast in the browser.

If you write a contrast sweep: parse `color(srgb …)`, composite the full
ancestor chain, and composite translucent text over it. Three sweeps during the
redesign reported false catastrophes by skipping one of those.

## Plans worth knowing about

| doc | what it is |
|---|---|
| `docs/specs/DESIGN_PRINCIPLES.md` | how to build a screen. Start here |
| `docs/specs/RESPONSIVE.md` | how a screen answers the window. The eleventh rule |
| `docs/plan/MODULE_SYSTEM.md` | what the app is becoming — modules, capabilities |
| `docs/plan/UX_PASS.md` | the process work: undo, search, import, refusals |
| `docs/plan/REDESIGN_ROLLOUT.md` | how the re-skin was done, and what is left |
| `docs/audit/UX_AUDIT.md` | the evidence everything above is answering |

## Conventions that already exist and should be kept

- **Stylesheets are co-located with their feature** (`src/features/*/*.css`).
  Append there. Do not create a shared override layer — two stylesheets fighting
  over one screen is worse than the problem it solves.
- **Commit messages explain the decision**, not the diff. Say what was measured
  and why the change is what it is.
- **`main` is the safe branch.** Design work lands on `redesign`.
