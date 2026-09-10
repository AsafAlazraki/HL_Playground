# Handoff — 2026-09-10

Written so a session on another machine can pick this up cold. The chat that
produced this is not the record; this file and the docs it points to are.

## State of the tree

- Branch `stunning`, everything below is committed and pushed.
- `npm test` is green at the commit before this one (`923186c`): 157 test
  files, 2,530 passing plus one `it.fails`, lint at the 371 ratchet,
  reachability and style guards clean, 107 dead rules reported (not failed).
- Screenshot baselines in `tools/shots/*.png` were re-taken deliberately after
  every surface moved onto `src/ui` primitives. `npm run check:shots` needs a
  dev server on port 5090.
- `@fontsource/instrument-serif` is uninstalled; nothing imported it. The
  `--font-display` token in `src/styles/tokens.css` still names the face with
  a Georgia fallback and is unused by any live screen.

## Setup on a new machine

```bash
git clone https://github.com/AsafAlazraki/HL_Playground.git
cd HL_Playground && git checkout stunning
npm ci
npm test            # five guards, see CLAUDE.md
npm run dev         # then /design.html for the design sheet
```

Node 24 is required. `check:contrast` and `check:shots` drive the system
Chrome through `playwright-core` and need `npm run dev` on port 5090 in
another terminal.

## Where the backlog and decisions live

- `docs/BACKLOG.md` — reconciled: what is done, partial, open, stale.
- `docs/plan/DECISIONS.md` — three decisions Asaf made on 2026-09-09:
  split undo (sheet when priced alternatives are at stake, toast+UNDO
  otherwise); real users with roles via `mayDo()`; counts as a quiet strip.
- `docs/plan/QUOTE_GROUND_UP.md` — the quote design spec the rebuild follows.
- `docs/research/INDEX.md` — every research run and what it decided.
- `.claude/skills/` — Asaf's earlier research (emil-design-eng, apple-design,
  the configurator playbook). Use it; do not re-research it.

## The open question: which visual direction

Asaf rejected the current look outright ("absolutely horrible design").
Three directions were drawn as full artboards in `.design/`:

| file | direction |
|---|---|
| `.design/Main.dc.html` | **A · Porsche** — dark `#0b0f14`, full-bleed hull photo, 132px name, bands in a right rail |
| `.design/DirectionB.dc.html` | **B · Apple** — `#f5f5f7`, layered white cards with soft shadows, pill controls, `#0071e3` |
| `.design/DirectionC.dc.html` | **C · Quiet Precision, sharpened** — the existing `ds.css` tokens (`#081b2e` / `#0a5fc2`) with a ruled ledger, mono figures, solid navy price bar |

Published canvas (private to Asaf's account):
https://claude.ai/code/artifact/68de89a2-cac3-4725-ae5a-5456bed8bb40

Re-seed after editing an artboard (path is the bundled `design` skill):

```
node <design-skill>/seed-canvas.mjs --template <design-skill>/payload.template.html \
  --out .design/helmlogic-quote-directions.html --title "HelmLogic Quote Directions" \
  --artboard Main.dc.html --artboard DirectionB.dc.html --artboard DirectionC.dc.html \
  --image public/seed-images/<each webp used> --canvas canvas.json
```

**Next step is Asaf's:** pick A, B or C. Then rebuild `ds.css` tokens and the
quote, catalogue, configurator and module surfaces onto that direction, at the
layout level, not as CSS tweaks. He has said this repeatedly and it is the
standing brief: "break it and rebuild the layouts and components at the core
level. Nothing stays the same."

## Queued work that was blocked on a session limit

A resweep workflow failed on quota before it ran. Its items are still open:

1. Visual QA re-sweep of all ten screens against `DESIGN_CONTRACT.md` §11
   (the last sweep, `docs/research/visual-qa-2026-09-09.md`, found the
   display tier on 2 of 10 screens).
2. Back controls on every deep screen.
3. Undo on `addLine` per the split-undo decision.
4. Backlog item O4.
5. README, CLAUDE.md and BACKLOG update to match this tree (CLAUDE.md still
   quotes the 2026-09-09 test counts).

## Working agreements Asaf has stated

- No `/loop`. Finish a phase, then start the next one without asking.
- Do not push to `stunning` without being told. (This push was to move
  machines.)
- Measure before claiming improvement; the visual QA sweep exists because
  claims outran the screens.
- Keep the machine light: one dev server, unique ports, kill them after.
- Research goes into `docs/research/`, never only into chat.
