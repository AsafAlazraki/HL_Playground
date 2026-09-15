# Handoff — 2026-09-15

Written so a session on another machine can pick this up cold. The chat that
produced this is not the record; this file and the docs it points to are.
The previous handoff (2026-09-10, on `stunning`) asked which visual direction
to take; that question is answered and the rebuild it led to is on `main`.

## State of the tree

- Branch `main` at `3c0e8e1`, identical to `rebuild`, both pushed. Work
  continues on `rebuild` and lands on `main` by fast-forward.
- `npm test` is green: seven guards — types, lint at the 343 ratchet, vitest
  (2,974 passing plus one `it.fails`, 199 files), reachability, styles
  (17 baselined orphans, 133 dead rules reported, literal px 460/460),
  words, stores.
- The server rulers ran clean on the same commit against a cold-started dev
  server: `check-collide` (nothing overlaps at 1440×900), `check-contrast`
  (1,278 text nodes over eleven screens), `qa-sweep`, and `check-shots`
  (14 baselines re-taken, committed under `tools/shots/`).
- Every screen in `docs/specs/SCREENS.md` is rebuilt and measured;
  `docs/research/visual-qa-rebuild.md` is the scoreboard, one entry per pass.

## Setup on a new machine

```bash
git clone https://github.com/AsafAlazraki/HL_Playground.git
cd HL_Playground
npm ci
npm test            # seven guards, see CLAUDE.md
npm run dev         # port 5090; then /design.html for the design sheet
```

Node 24 is required. `check:contrast`, `check:shots`, `check-collide` and
`qa-sweep` drive the system Chrome through `playwright-core` and need
`npm run dev` on port 5090 in another terminal. **Restart it cold**
(`rm -rf node_modules/.vite`) before measuring anything you have just
restructured — Vite's HMR serves partial transforms and the rulers will
measure them (CLAUDE.md records three cases).

## The standard, and the two rules that came out of it

Asaf's standard, stated 2026-09-15 after a night of one "Porsche language"
stamped across twenty screens: *every section designed on its own merits from
real boat-configurator references, never one treatment reused; and nothing
faked.* The references were driven live — Saxdor, Axopar, Nimbus, Zodiac,
Beneteau, De Antonio, Jeanneau, Porsche's configurator and its PDF, Porsche's
and BMW's logins — and kept as frames in `out/ref/`, `out/ref/boats/` and
`out/ref/entry/` (not committed; re-drive them).

- **The tile rule.** A card asks its own picture (`src/features/quote/scene.ts`
  samples the edge ring at 32×32; paper or neutral means a render). A
  photograph makes a scene tile, a render a studio tile. Highfield's file
  holds only renders, so Highfield is on white everywhere until real
  photography is added. It is never faked.
- **The entry frame** (`src/features/entry/`). Sign-in, the wizard and the
  first run share Porsche's login frame with the dealer's own Stacer running
  across the window, captioned as the file's.

The chaptered configurator (`src/features/quote/BuildScreen.tsx`), the
document's cover, the picker and place tiles, and the three front screens
all follow from those two.

## Where the backlog and decisions live

- `docs/specs/SCREENS.md` — every stage, who uses it, the experience it must
  give, what is still missing.
- `docs/BACKLOG.md` — reconciled; the guard baseline has a 2026-09-15 column.
- `docs/plan/REBUILD.md` — the phases, with what each landed as.
- `docs/plan/DECISIONS.md` — the three decisions of 2026-09-09.
- `docs/research/INDEX.md` — every research run and what it decided.
- `.claude/skills/` — Asaf's earlier research. Use it; do not re-research it.

## What is still open

1. **Highfield photography.** The Sport 560 and the rest of Highfield's
   range have only white-ground renders in the file, so every Highfield
   surface is a studio tile. Real photographs go into the seed's image
   table; the tile rule picks them up with no code change.
2. **The wizard is unreachable with the demo account** — it carries its
   organisation and lands on the first run. `tools/shot-entry.mjs` says how
   the wizard was photographed and what it needs.
3. **Onboarding of a real second tenant** is a seam, not a feature
   (`docs/plan/TENANCY.md`).
4. The bundle is unguarded (`docs/plan/REBUILD.md`, phase 7).

## Working agreements Asaf has stated

- No `/loop`. Finish a phase, then start the next one without asking.
- Push only when told. (`main` was pushed on 2026-09-15 on request.)
- Show static directions before building a new section; never say "same
  treatment as X".
- Nothing faked — no seeded customers, quotes, pairings or photographs; an
  empty state is the true state.
