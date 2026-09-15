# THE REBUILD — ground up, on two registers

> Started 2026-09-12 on branch `rebuild`, from `main`/`stunning` at `e36c61b`.
> The governing document is `docs/specs/DESIGN_SYSTEM.md`. This file is the
> sequencing: what happens in what order, what is kept, and how it ships without
> a dead app.

## Why this is a rebuild and not another pass

Five redesign passes landed before this one and the owner rejected every result.
The reason was not effort and not taste — it was that `DESIGN_PRINCIPLES.md`
made restraint the goal, `CLAUDE.md` made it the first thing every session read,
and `bridge.css` switched the expressive layer off in code. Sessions then
rejected every visual idea brought to the project by correctly citing the rules.
`DESIGN_SYSTEM.md` §9 records what was deleted and why. **That deletion is
phase 0, and nothing else works without it.**

Three measured defects the rebuild exists to fix, all from
`docs/research/visual-qa-2026-09-09.md`:

- **The type ramp is bimodal.** A 56px hole between `--t-display-lg` (26.88px)
  and `--t-marque` (82.86px). Eleven of twelve screens measure **2.36x–3.96x**
  scale contrast where the spec asks about 7x. Home, empty, measures **2.44x** —
  *worse* than the 2.97x the display tier was built to fix.
- **The working screens are not dense.** A register shows twelve rows at
  1280x800. The Data screen is a six-item menu drawn as six billboards.
- **Contrast is unguarded where it fails.** `check-contrast.mjs` walks 202 text
  leaves and skips 941. Both live failures are on screens it never opens.

## The split

| | LOC | |
|---|---|---|
| framework-free domain logic | **59,803** | **keep byte-for-byte** |
| `src/demos` seed | 24,373 | keep |
| `*.test.ts` node suites | 42,575 | keep — they prove the rebuild did not touch logic |
| 170 `.tsx` files | 93,419 | **rebuild** |
| 54 stylesheets | 64,667 | **rebuild** |

**47.4% of non-test code carries over untouched.**

### Keep, untouched

`src/types/model.ts` · `src/lib/**` (bar three files that import React) ·
`src/db/**` · the 243 React-free `.ts` under `src/features/**` · `src/demos/**` ·
every `*.test.ts`.

The crown jewel is `src/features/constraints/trailerFitment.ts` — it records the
reason a row was removed **at the moment of removal**. Porsche cannot do this;
it reconstructs removals server-side and no longer holds the reason. Do not
touch it, and never let a prose pass cut a recorded reason.

### Keep and port

| file | why |
|---|---|
| `src/features/views/stillness.tsx` | the motion policy — gates every animation on `useReducedMotion()` **and** whether the caret is in a text input. 235 lines, genuinely good |
| `src/app/url.ts` | the 21-address table. The README wrongly says there is no router |
| `src/store/notes.ts` | the toast/undo bus, 27 callers, already unified |
| `ds.css` palette / type / spacing / radii / z / motion sections | the good half of the old system |
| `tools/check-*.mjs` | 2,145 lines of guards. Good machinery, wrong target — see phase 7 |

### Delete

All 170 `.tsx`. All 54 stylesheets bar the salvaged sections. `tokens.css`,
`base.css`, `bridge.css`, `response.css`. `src/design/**`.

---

## The phases

### Phase 0 — the constitution *(done)*

`DESIGN_SYSTEM.md` written; `DESIGN_PRINCIPLES.md`, `ART_DIRECTION.md`,
`APPLE_PASS.md` and `DESIGN_CONTRACT.md` archived with banners saying why;
`CLAUDE.md` repointed; the `subtask` skill repointed so future research grounds
in the new system rather than the old; corrections appended to
`godly-and-what-transfers.md` and `motion-libraries-2026.md`.

Still open in this phase: re-mine the two motion libraries against their
**enumerated** component lists, and write the HelmLogic quote-flow teardown.

### Phase 1 — the state seam

**The real blocker, and it is not CSS.** There is exactly one zustand store and
about **thirty hand-rolled `useSyncExternalStore` modules** across 35 files.
Because they import React, **14,065 LOC that reads as logic is React-bound**.
The worst: `features/quote/quotes.ts` (1,239 LOC) — the quote repository, the
central CPQ entity — is a React-subscribing localStorage store, outside Dexie
and outside zustand. `tools/check-stores.mjs` exists because `resetProject()`
once wiped Dexie and left sixteen of them holding the previous business's data.

- Consolidate the ad-hoc stores into one state layer.
- Move quotes into Dexie (`db.version(5)`) — `QUOTE_SPEC.md:823-833` asked for
  this and never got it.
- Lift `lib/actions.ts`, `lib/imageSources.ts`, `lib/icons.tsx` out of `lib/`
  so `lib/` is provably framework-free.
- Extract derivations trapped in components into `.ts` selectors — 23 `useMemo`s
  in `ModuleIndex.tsx`, 19 in `BlockCard.tsx`, 15 in `Grid.tsx`.
- Break the verdict-to-class fusion; `fitment/FanOut.tsx:157-181` is the
  template case, computing a domain `PickVerdict` and its CSS class in the same
  twenty lines.
- Close `EntityDef.priceLevels`. Today `pricing.ts` resolves price columns from
  a hardcoded per-kind allow-list — Northside's data knowledge living in our
  source, which is the exact thing `PLATFORM_VISION.md:38-42` forbids.

### Phase 2 — the design system

One stylesheet, `src/styles/system.css`, replacing five. `bridge.css` is not
fighting `ds.css` — it is the adapter keeping 19,000 lines of legacy feature CSS
alive. Delete the CSS and the bridge deletes itself, and the expressive layer
switches back on.

- **One type ramp** with the middle filled. Three vocabularies coexist today.
- **Two registers** as `data-register` scopes.
- **Component tokens** — 39 stylesheets each re-derive a button today, which is
  why there are 295 distinct button treatments, 137 missing a state.
- **Material back on** per `DESIGN_SYSTEM.md` §5.
- **Build `/design.html` first**, both registers, both themes.

### Phase 3 — primitives and motion

`src/ui` already has five well-designed primitives that refuse `className` and
`style` — extend, don't replace. Then delete the parallels: 3 button systems,
**9 row-rendering implementations** (8,197 LOC), 14 hand-rolled dialogs, 6
popover implementations, 2 Dashboards.

Motion today is 21 `motion.*` elements over 13 surfaces, all fade-and-translate.
No shared-element transitions, no `layoutId`, no page transitions — **the stages
do not animate at all.** Build the choreography layer on `stillness.tsx`, using
the exact values in `DESIGN_SYSTEM.md` §6.

### Phase 4 — Showroom: the quote flow *(done — and then redone to the standard of 2026-09-15)*

**What landed:** the picker and the place as tiles (`PickerScreen`, `PlaceScreen`),
the configurator as chapters that fill the window with the boat's photograph
(`BuildScreen.tsx`, after Saxdor and Porsche driven live), the finishes as a
swatch card, the cascade, and the document with the chapters' cover on screen
and Porsche's PDF on paper. Each is an entry in `docs/research/visual-qa-rebuild.md`.
The first cut stamped one "Porsche language" across everything and was rejected;
the standard that replaced it is restated in `docs/specs/SCREENS.md`.

The brief as it was written:

The flagship. Prove the system here before touching anything else.

Take from the original HelmLogic — **its shape, not its guts**: the step rail
with progress, the large product stage, the always-on price bar carrying inc
*and* ex GST beside the level selector, the unmistakable selected state, the
photographic option cards, the grouped summary. Its worst fault stays behind —
it has **no drafts at all**, and a refresh destroys the whole build. Our
freeze-on-pick (`freeze.ts`) is strictly better and stays.

Also here: variant colourways from the decode map in
`HELMLOGIC_GROUND_TRUTH.md` §1.3; the refusal grammar; the curation toolbar
(narrow by rule, name the rule, search past it, switch it off, state the count
hidden); and wiring `fitmentCascade`, which has **zero production callers**
today.

### Phase 5 — Cockpit: tables, data, rules, admin *(done, except the table itself)*

**What landed:** the quotes register, customers, Data, Rules, What fits what,
Review, Admin, and the view / design / levels / history stages, each measured
(18+ rows at 1280×800, tabular figures, 2.5–4× scale contrast). **The sheet —
the table of rows — is still the app's oldest surface** (`SCREENS.md` marks it
"old language"). The brief as it was written:

Rows 24 dense / 32 default / 44 comfortable. Fixed table layout at 12 columns or
fewer, auto above, identity column pinned. 150px minimum column width. Figma's
mixed-value model. Linear's tap-vs-hold peek. WCAG 2.1.4 single-key remapping.
Fix `table.css:651` — a kind hue used as reading ink at 4.33:1 across 21 bands.

### Phase 6 — home, modules, customers, onboarding, auth *(done)*

**What landed:** home, modules and the catalogue on the tile rule (a
photograph makes a scene tile, a render a studio tile — `scene.ts` reads the
pixels); customers as a register; sign-in, the wizard and the first run on
Porsche's login frame (`src/features/entry/`). The bottom bar is gone; nothing
is seeded or faked. The brief as it was written:

Home is Showroom, and `docs/BACKLOG.md:153` is still unanswered: *"i saw the
design of the new home dashboard. HATE IT"*, and *"The bottom bar in that image
is disgusting"*. Under the two-register thesis the answer is layout, content and
finish together.

### Phase 7 — repoint the guards *(partly done)*

**What landed:** `check-contrast` measures eleven screens and sets `aria-hidden`
nodes aside (1,278 nodes clear at `3c0e8e1`); `check-shots` photographs
fourteen; `check-collide` (nothing overlaps) and `qa-sweep` (register, thinness,
mid-word cuts) are new; `check:words` and `check:stores` joined `npm test`,
which is seven guards. **The literal-px ratchet was kept, not retired** — it
keeps catching sheets that bypass the ramp — and sits at 460. Still open: motion
coverage, density, and the bundle gate. The brief as it was written:

- `check-styles.mjs` — keep orphan-class, literal-colour, undefined-`var()` and
  the 11px floor. **Retire the literal-px ratchet**; replace with ramp coverage.
  Counting literal pixels measured tidiness and never once caught the actual
  defect, which was a screen using two type steps out of ten.
- `check-contrast.mjs` — add the 941 skipped leaves. Add the `aria-hidden` skip
  in the same commit or it goes red on nine correct nodes.
- `check-shots.mjs` — past 11 screens; re-baseline per phase, never blind.
- New: motion coverage, density (rows at 1280x800), and a bundle gate — the
  entry chunk is 2,081.98 kB / 610.10 kB gzip and nothing guards it, because
  `winKit.tsx:14-35` statically imports all 15 stages.

---

## How it ships without a dead app

Build alongside, migrate screen by screen, delete the old layer last.

- New work lands in `src/ui/`, new `src/styles/` files, and rebuilt feature
  components. Old stylesheets stay until their last consumer is gone.
- One switch selects old shell vs new, so the branch always runs.
- Every phase ends green on `npm test` and `npm run build`.
- **The engine tests stay passing throughout.** They are the proof the
  rebuild did not touch the logic — 1,913 when this was written, 2,974 at
  `3c0e8e1`, none removed.

## The scoreboard

`docs/research/visual-qa-rebuild.md` is the rebuild's scoreboard, one entry per
pass, against the rulers `docs/research/visual-qa-2026-09-09.md` established —
which was the only honest measurement in the repo and the number to beat. Re-run it per phase: ramp ratio and distinct
steps in use per screen, contrast over all ~1,450 text leaves, mid-word
truncations, horizontal overflow. Measure performance against the **build**,
never `npm run dev` — dev-mode JSX overhead already cost this project four
carefully-reasoned wrong hypotheses.
