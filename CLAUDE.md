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

Stated so nobody assumes coverage: there is **no visual regression tooling**,
there are **no component tests** (112 test files, zero `.tsx`), and whether a
screen makes sense is a person's job.

**Contrast is now automated**, on five screens:

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

Baseline at the time of writing: **272 text nodes across five screens, all
clear.**

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
- **`main` is the safe branch.** Design work lands on `redesign`.

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
- **The docs lag the tree.** Verify a claim against code before acting on it —
  `README.md` claimed the quote flow was unbuilt while `src/features/quote/` had
  twenty files. `docs/BACKLOG.md` is the reconciled view; keep it that way.
