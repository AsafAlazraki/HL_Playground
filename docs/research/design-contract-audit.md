# THE DESIGN CONTRACT, AUDITED — what the tree actually does

**Question this answers.** `DESIGN_CONTRACT.md` §11 is a 21-item checklist and
`DESIGN_PRINCIPLES.md` §0 is ten rules. Nobody has ever run either against the
whole tree. A rebuild "from the ground up" needs a measured starting point, and
this is it: for every rule that can be checked by a machine, the count, the
stylesheets it touches, and an example at `file:line`.

**Nothing here is an opinion.** Every number below came from a command, and the
command is in the appendix so it can be re-run. Where a rule cannot be checked
mechanically it is listed under *What a person still has to judge* rather than
guessed at.

**Pinned to `530597d` (2026-09-09T08:33:08+10:00).** Another workflow is editing
`src/app/shell.css`, `src/features/{pipeline,quote,rules,search}/**` while this
was taken. Line numbers in those files are correct at that commit and may have
moved since; the counts were taken in one pass, so they are internally
consistent.

**Guards at the moment of the audit** — this file changes no code, so these are
a starting reading, not a before/after:

```
npx tsc --noEmit -p tsconfig.app.json     clean, exit 0                    (09:03)
npx vitest run                            123 files, 1931 passed | 1 expected fail, 113.76s
node tools/check-styles.mjs               OK — no new orphans. 19 known (baselined), 147 dead rules
```

The brief's baseline said 119 files / 1,912 passing. The suite is larger because
the concurrent workflow added tests while this ran; nothing here touched it.

**The working tree moved during the sweep, and the later reading is not this
audit's.** Re-run at 09:24, `tsc` reports two `TS2591` errors in
`src/features/quote/__qsmeasure.test.ts` and
`src/features/review/__rvmeasure.test.ts` — scratch measurement files created by
the other workflow at 09:04 and 09:09 — and `check-styles` reports 148 dead
rules rather than 147. `HEAD` is still `530597d`, so every `file:line` below is
correct against the commit; the drift is in the other workflow's uncommitted
files.

---

## 1 · THE TREE, MEASURED

`check-styles` counts every stylesheet under `src/`. This audit divides them,
because the contract governs one of the three groups and not the others:

| group | files | lines | what it is |
|---|---|---|---|
| `src/app/**` + `src/features/**` | **37** | **61,924** (41,334 once comments and blanks are removed) | **the app CSS §11 governs** |
| `src/styles/**` | 5 | 3,355 | the system — `tokens` → `base` → `bridge` → `ds` → `response` |
| `src/design/**` | 5 | 3,225 | `/design.html`, the reference page |

All 37 app stylesheets are imported by a component; none is orphaned.
`ds.css` reaches the app only through `bridge.css:41`'s `@import`.

`check-styles` on the whole of `src/`: **47 stylesheets · 163 components ·
4,111 classes declared · 3,607 written**.

The brief's "26 stylesheets and ~19,000 lines" does not match anything
measurable here. The figure to use is 37 and 61,924.

---

## 2 · WHAT HOLDS

Worth stating first, because a rebuild that starts by re-litigating the parts
that are already right is a rebuild that runs out of road.

| rule | reading |
|---|---|
| Rule 2 — no `font-size` below 11px | **0** in app CSS. The lowest px value written anywhere is 11px, used 260 times. |
| Rule 3 — nothing truncates mid-word | **0** `word-break: break-all`. 87 `overflow-wrap: anywhere`, 108 `text-overflow: ellipsis`, 41 line-clamps — all word-preserving. |
| §4 — never `transition: all` | **0**. |
| §4 — the invalid `outline: 2px solid var(--focus)` | **0**. All 21 recorded instances are gone; the app now writes `box-shadow: var(--focus)` 46 times and `outline:` 290 times. |
| §11 — kind hue as a fill behind text | **0** remaining (§5 below). |
| §11 — every pressable thing has hover, press and focus | held at the foundation, not per class: `base.css:302` gives every element a `:focus-visible` ring and `base.css:431` presses every `button` / `[role='button']` / `summary`. Of 516 `onClick` handlers in TSX, **4** sit on a non-button element that gets neither. |
| Rule 1 — colour is a token | **99.63%** of the 7,380 colour-bearing declarations on standard colour properties. 27 carry a literal. |
| §11 — no new orphan classes | 19 baselined, no 20th. |

---

## 3 · THE RANKED TABLE

Ranked by blast radius — how many of the 37 stylesheets each violation touches —
because that is what decides whether a fix is one edit or thirty.

| # | rule | violations | stylesheets touched | worst file | example |
|---|---|---|---|---|---|
| 1 | **§2 · spacing is `--sp-1..6`, never a literal px gap** | **783** declarations of 3,506 (22%) | **37 of 37** | `shell.css` (99) | `shell.css:2800  border-radius: 9px` family; 811 of 1,009 literal px values are off the 4px grid |
| 2 | **§2 · in `app/**` and `features/**`, write `--sp-*`, not the `.ds-*` `--s-N` scale** | **1,194** uses (against 1,027 `--sp-*`) | **29** | `modules.css` (123) | `quote/build.css` is 107 `--s-` to 1 `--sp-`; `rules.css` is 6 to 66. 10 stylesheets mix both. |
| 3 | **§11 · uppercase is the 11px / +0.06em label** | **64** of 102 blocks; **56** tracked wider than 0.08em | **14** | `whiteboard.css` (14), `table.css` (12) | `whiteboard.css:1803  .wb-noflow-title` — 12px at **0.28em**; `shell.css:1408  .shell-invite-kicker` at 0.26em |
| 3a | — of those, uppercase on a **pressable** surface (rule 3: never a button) | **19** | 10 | `whiteboard.css` (5) | `whiteboard.css:1269  .wb-run-btn`; `views.css:564  .vw-strip-btn` |
| 3b | — of those, uppercase on a **name or title** (rule 3: lossy) | **17** | 9 | `table.css` (5) | `table.css:847  .tb-th-name` renders `field.name` — the dealer's own column name. `Grid.tsx:1199`. Same at `datagrid.css:110`. |
| 4 | **§11 · radii are 6 / 7 / 10 / 13 / 999** | **43** declarations off the list | **17** | `shell.css` (8) | 1px×14, 3px×13, 2px×11, 9px×3, 11px×2, 22px×1, 14px×1. **13px appears nowhere in the tree.** |
| 4a | — and the system publishes two radii §11 does not list | `--r-panel` 14px (**29** uses), `--r-chip` 4px (**20** uses) | 20 | — | `ds.css:463-467` |
| 5 | **Rule 1 · never write a colour** | **67** lines | **8** | `shell.css` (21) | see §4 below for the six kinds |
| 6 | **§11 · no new `backdrop-filter`; §5 allows two surfaces** | **10** live declarations on **5 distinct surfaces** | 5 | `shell.css` (10) | `shell.css:2895  .shell-tablestage .tb-head { backdrop-filter: blur(12px) }` — a table header is not a masthead |
| 7 | **§11 · elevation is a token; no hand-rolled box-shadow** | **5** of 387 non-`none` shadows | 4 | `table.css` (2) | 3 of the 5 are one idiom that `ds.css:1691` already publishes as `.k-lift:hover` — see below |
| 8 | **§11 · every class in TSX is declared, and nothing is declared for nothing** | **147** dead rules | **24** | `whiteboard.css` (37) | `whiteboard.css` declares 37 classes no component writes |
| 9 | **§7 · there is no `--sp-7`** | **1** | 1 | — | `table.css:4224` — see §6, it silently does nothing |

### The five hand-rolled shadows, and why three of them are one thing

`var(--e4), inset 0 1px 0 var(--edge-light), 0 10px 30px -14px <kind hue>` is
written out three times — `shell.css:3285` (`.hm-card:hover`),
`catalogue.css:458`, `tablekit.css:351` (`.tk-kind-card:hover`). It is not an
invention: `ds.css:1691` publishes it as `.k-lift:hover`. `catalogue.css` takes
the class and restates the rule for a documented cascade reason (`:464` — the
hover is on the tile, not the card). The other two elements carry neither
`k-lift` nor the token: `HomeStage.tsx:850` writes `hm-card ds-sheen ds-rise`
and `NewTableDialog.tsx:656` writes `tk-kind-card ds-sheen ds-rise`. **Two of
the three are a class away from being nothing.** The remaining two are
`table.css:3645` and `:4111`.

### The 212 shadows that are not elevation

387 `box-shadow` declarations resolve as: 168 a bare token, **212 an
`inset 0 0 0 Npx <token>` ring**, 2 focus composites, 5 hand-rolled elevation.
The 212 are borders drawn as shadows, not depth, so they are not counted against
§11 — but a rebuild should decide whether a border-as-shadow is the house idiom
or an accident that happened 212 times. It is not covered by any rule today.

### And six of the blurs are already inert

Of 36 `backdrop-filter` declarations, 20 are `: none` (the
`prefers-reduced-transparency` escapes) and 6 read `var(--mat-*-blur)`, which
`bridge.css:179-185` sets to `0px` — a bare length is not a valid filter value,
so those declarations are dropped and draw nothing. That is `shell.css:476`,
`designer.css:1426`, `modules.css:885`, `table.css:1912` and `:2843`. **10 live
declarations remain, on 5 surfaces**: `.pagebar`, `.win-bar`, `.sw-row`,
`.sw-scrim`, and `.shell-tablestage .tb-head/.tb-th`.

---

## 4 · RULE 1, THE SIX KINDS OF LITERAL COLOUR

67 lines is the honest count, and a flat 67 would be misleading — a naive grep
returns **110** because this repo's comments quote measured contrast ratios in
hex, which is the house style working as intended. Stripping comments first is
what the number above does.

| kind | lines | verdict |
|---|---|---|
| The quote document's paper — `quote.css:1187`, `:1731-1739` | 10 | **sanctioned.** `DESIGN_PRINCIPLES.md` §1 names it: "it is paper in both themes, deliberately." |
| Print — `shell.css:1776`, `quote.css:1085`, `:1119` | 3 | **sanctioned.** Print has no theme. |
| `#000` inside a `mask-image` — `banner.css` ×6, `build.css` ×3 | 9 | **defensible, argued once.** `build.css:246` makes the case — "`#000` here is an ALPHA CHANNEL and not an ink". `banner.css` copied the pattern without the argument. |
| `shell.css`'s chrome and dark-kind ramps — `:104-108`, `:4779-4780`, `:5224-5232` | 16 | **self-declared debt.** `shell.css:98`: "THEY BELONG IN `ds.css` … the moment the system declares them, DELETE THIS BLOCK." |
| The macOS window lights — `shell.css:3820`, `:3831`, `:3835`, `:3839` | 4 | **unargued.** `#ff5f57 / #febc2e / #28c840` are Apple's, not the system's. |
| **`rgba(255,255,255,α)` on a chrome ground** — `onboarding.css` ×13, `banner.css` ×5, `auth.css` ×4, `io.css` ×2 | **24** | **the one worth fixing.** Every one sits on `var(--chrome)` beside `var(--chrome-fg)`, and `shell.css:114-121` already publishes the family: `--chrome-wash` 6%, `-hover` 10%, `-on` 13%, `-press` 17%, `--chrome-edge` 15%, `--chrome-line` 13%, `-soft` 9%, `-strong` 26%. The alphas written by hand are .05 .06 .07 .08 .1 .12 .13 .14 .16 .18 .24 .28 — near the token set but not on it. |

`modules.css:5299  color: var(--on-accent, #fff)` is the remaining one: a
fallback, not a colour decision.

---

## 5 · RULE 5, AND WHY IT CANNOT BE AUDITED AS WRITTEN

**The two governing documents disagree, and the disagreement is load-bearing.**

- `DESIGN_CONTRACT.md` §11: *"Kind hue is a rail, a dot or a glyph — never a
  fill behind text, never chrome."*
- `DESIGN_PRINCIPLES.md` §1, written later and explicitly overturning it:
  *"A kind hue may carry a SURFACE: a tinted band head, a card rail at full
  height, a filter chip, a selected row. It still may not sit behind reading
  text."*

Measured against the **narrow** reading, `.k-band` (10% light / 16% dark,
`ds.css:1606`) is a violation on every one of the 7 surfaces that take it, plus
`.k-chip` ×6 and `.k-filter` ×5. Measured against the **wide** reading, all of
those are correct and the rule is about text on the hue.

Measured against the wide reading, which is the later document:

- **86** blocks paint a background from a kind hue, in 16 stylesheets.
- **0** put reading text on it. Every one is a 6–9px dot, a 2–3px rail, a bar
  fill, a `::before` mark, or a wash at ≤20%.
- The two fixed yesterday were the last of the population. `.dsh-tile-panel`
  (`dashboard.css:2028`, 14%/20%) now sits behind a `PlaceMark` with
  `fallback="none"` (`CardBody.tsx:642`) — no text. `.md-grant.is-on`
  (`modules.css:3055`) is a 22×22 checkbox whose tick is a border.

**Before anything is "fixed" here, one of the two sentences has to be deleted.**
Auditing against §11 as written would send someone to remove the band heads that
§1 authorises.

### A second kind vocabulary exists

`accentVar()` at `types/model.ts:28` returns `var(--accent-${a})` over seven
keys — `blue, carmine, viridian, ochre, violet, teal, graphite`. The contract §1
describes eight `--kind-*` hues named after the nouns — `--kind-boat`,
`--kind-motor`. **Both families are live**: `--kind-*` is read in 4 stylesheets
(41 uses), `--accent-<hue>` in the rest (34 uses). Two names for one idea is how
a hue drifts.

---

## 6 · THE DEFECT THIS AUDIT FOUND

`src/features/table/table.css:4224`

```css
.tb-plate {
  padding: var(--sp-7) var(--sp-6);
}
```

`--sp-7` **is defined nowhere in the repo** (`tokens.css` stops at `--sp-6`).
An undefined custom property makes the whole `padding` shorthand invalid at
computed-value time, so the declaration is dropped and the earlier
`.tb-plate` rule at `table.css:2742` wins: the empty plate on the register
renders at `var(--sp-6) var(--sp-5)` — **32px 24px** — not the value written
here. The contract already recorded this failure at
`constraints/constraints.css:700`; that instance is gone and this one appeared.
Rendering is not verified in a browser — this is read from the cascade.

---

## 7 · FIVE CHECKLIST ITEMS THAT NO LONGER DESCRIBE THE APP

These are not violations. They are places where the contract aged out of the
code, and each one will send the next reader looking for something that is not
there.

| §11 item | what the code says |
|---|---|
| "ONE **52px** toolbar" | `height: 52px` appears **0** times in app CSS. `.shell-view-bar` sets `padding-inline` and no height. |
| "Nothing is padded to clear the dock; `.shell-stage` already reserved **78px**" | The reservation is gone — `shell.css:155` says "IT NO LONGER RESERVES A DOCK STRIP", and `.shell-stage` (`:173`) is `height: 100%`. Four stylesheets still explain the 78px in comments: `actionbar.css:712`, `io.css:1331`, `quote.css:36`, `:90`. |
| "**13px** on a dock item" (§1) | The dock was deleted (`actionbar.css:852`: "Deleting the dock therefore deleted…"). `border-radius: 13px` appears **0** times in the tree. |
| "The stage root carries `onKeyDown={(e) => e.stopPropagation()}`" | **Deliberately superseded.** `stageKeys.ts` narrows it to Delete and Backspace and explains why the blanket was wrong: "That blanket also ate Escape whenever the focus was anywhere inside a stage." All 11 stages use it; **0** carry the blanket. |
| "Back is `shell-view-back` (**no** `btn`)" | Correct in all 11 stages — and `shell.css:951` still styles `.btn.shell-view-back`, a rule no component can match. Dead. |

---

## 8 · TWO SYSTEM-LEVEL FINDINGS

**The 11px type floor is held by one import line.** Seven sub-11px size tokens
survive in the source — `bridge.css:315` `--micro-s-size: 10px`, `:317`
`--micro-xs-size: 10px`, `:325` `--data-xs-size: 10px`, and `tokens.css:277/279/
281/302` down to **8px**. All four names are re-floored at 11px by
`response.css`, an unconditional `:root` block imported last (`main.tsx:58`).
The floor is real, and it is one line of import order away from not being.
`/design.html` — the reference page every new screen is supposed to be checked
against — imports `ds.css` alone (`design/main.tsx:20`) and never loads
`tokens/base/bridge/response`. The reference and the app resolve different token
stacks.

**The reduced-motion escape contradicts the rule it implements.** §11 asks for a
`prefers-reduced-motion` escape in the same file as each `animation`. Two
stylesheets with animations carry no such block at all — `datagrid.css` (3
animations) and `table-node.css` (3) — and two more carry a block that never
mentions `animation`: `constraints.css` (3) and `rules.css` (2). It does not
matter, because `base.css:623` covers everything:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`DESIGN_PRINCIPLES.md` §4 says reduced motion means *"movement goes, colour and
opacity stay — a press that stops confirming itself is a worse interface, not a
gentler one."* A blanket 0.01ms takes the fade with the movement, and the
`!important` means no per-file rule can give it back. `ds.css:888` writes the
same blanket but scopes it to `.ds-root`, which the app never carries.

---

## 9 · THE REBUILD, IN ORDER

Cheapest per surface first. Each line says what it costs and what it buys.

**Decisions first, because three of them change what "fixed" means.**

1. **Settle rule 5.** Delete one of the two sentences in §5 above. Costs an
   edit to one doc; without it, items 4 and 10 below are unrunnable.
2. **Settle the kind vocabulary.** `--kind-boat` or `--accent-carmine`, not
   both. 75 uses across the tree, but the fix is an alias, not a rewrite.
3. **Refresh §11's five stale items** (§7 above). Costs one doc edit and stops
   the next five readers chasing a 52px toolbar.

**Then the one-line and one-idiom fixes.**

4. `table.css:4224` — the undefined `--sp-7`. **1 line, 1 file.**
5. The 24 `rgba(255,255,255,α)` on chrome → the `--chrome-*` family that already
   exists. **4 files, one idiom**; either adopt the nearest token or extend the
   family to the alphas actually used.
6. The kind-glow shadow. `.hm-card` and `.tk-kind-card` take `k-lift` in their
   TSX instead of restating `ds.css:1691`; the three-layer shadow in
   `shell.css:3285` and `tablekit.css:351` then deletes itself. **2 class
   attributes, 2 stylesheets.** Leave `catalogue.css:458` — its restatement is
   argued and correct.
7. Delete the 147 dead rules. **24 files, zero risk** — `check-styles` already
   proves nothing references them, and `whiteboard.css` alone sheds 37.
8. Move `shell.css`'s chrome and dark-kind ramps into `ds.css`, which
   `shell.css:98` already asks for. **16 literals, 1 file each side.**

**Then the wide sweeps, in increasing order of judgement required.**

9. **Uppercase tracking.** 56 declarations across 14 files pulled to +0.06em.
   Mechanical. The 19 uppercase buttons and 17 uppercase names underneath are
   product decisions, not sweeps — `table.css:847` uppercases a dealer's own
   column name, which is the exact `PVC` / `Pvc` loss the principles name.
10. **Radii.** Either add 4px and 14px to §11's list — `--r-chip` and
    `--r-panel` are used 49 times between them — or retire the two tokens.
    Then the 43 off-list literals become a real sweep instead of noise.
11. **The reduced-motion blanket.** Replace `animation-duration: 0.01ms
    !important` with a rule that stops transforms and keeps opacity, per §4.
    One block in `base.css`; it changes every screen at once, so it wants the
    same care §9 of the principles asks of any `ds.css` change.
12. **`backdrop-filter`.** Five surfaces blur; §5 allows two, and one of the two
    it names no longer exists. `.win-bar` is the masthead and `.pagebar`
    inherited the dock's argument. `.shell-tablestage .tb-head`, `.sw-row` and
    `.sw-scrim` have no argument on file.
13. **The spacing vocabulary.** 1,194 `--s-N` against 1,027 `--sp-N`, in every
    stylesheet, 10 of them mixing both. This is the largest item on the list and
    the one least suited to a sweep: the honest fix is to decide which
    vocabulary the app speaks and alias the other at the token layer, not to
    edit 2,221 declarations.
14. **The 783 literal px gaps.** Last, because 811 of the 1,009 values are off
    the 4px grid and most of them are 1–3px optical corrections that a scale
    genuinely cannot express. Deciding whether the scale needs a sub-4px rung is
    the work; the replacement is trivial once it is decided.

---

## 10 · WHAT A PERSON STILL HAS TO JUDGE

Said out loud rather than left implied, and none of it is guessed at here.

- **Contrast.** Not automated, and `DESIGN_PRINCIPLES.md` §8 records three
  sweeps that reported false catastrophes before one was right. No ratio in this
  document was measured; the ones quoted are the repo's own comments.
- **"Accent appears roughly four times, not everywhere."** Counting per screen
  needs a rendered screen. The static proxy is 545 `var(--accent)`/`var(--blue)`
  uses across app CSS, worst `table.css` at 97 — that is a density, not a
  verdict, because a stylesheet is not a screen.
- **"Every figure is `var(--font-mono)` with `tabular-nums`."** Decidable only
  where a block sets the family itself: **6** figure-named blocks set a non-mono
  face (`review.css:209  .rv-sum-line`, `tablekit.css:917  .tk-fig-l`, and four
  more), **25** set mono without `tabular-nums` (`table.css:245  .tb-count-num`),
  **71** are correct. A further **76** set a size and inherit their face — a
  person has to look.
- **Whether an uppercase is a caption or a name.** The 56 wide-tracked
  declarations split into legitimate mono stamps and lossy content; the class
  name is a hint, not the answer.
- **Whether the screen makes sense**, layout at a width, and the four-part empty
  state. 65 empty/void classes exist; whether each counts real data from the
  store cannot be read off a stylesheet.

---

## APPENDIX · HOW TO RE-RUN EVERY NUMBER

Comments are blanked before counting, preserving line numbers, so that a ratio
quoted in a comment is never counted as a colour written in a rule. Two helpers
were used, both throwaway:

- `strip.mjs` — blanks `/* */`, prints `file:line:text` for surviving lines.
- `rules.mjs` — emits one JSON line per declaration block:
  `{file, line, sel, decls[]}`.

With `APP` as the 37 app stylesheets:

```bash
node strip.mjs $(find src/app src/features -name '*.css' | sort) > appcss.txt
node rules.mjs $(find src/app src/features -name '*.css' | sort) > rules.jsonl

# scope
find src/app src/features -name '*.css' | wc -l                    # 37
find src/app src/features -name '*.css' | xargs cat | wc -l        # 61924

# rule 1 — literal colour
grep -icE '#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?\b' appcss.txt  # 40
grep -icE 'rgba?\(' appcss.txt                                     # 27
grep -icE 'hsla?\(' appcss.txt                                     # 0

# rule 2 — the floor
grep -icE 'font-size:\s*(10(\.[0-9]+)?|[0-9](\.[0-9]+)?)px' appcss.txt   # 0
grep -rnE -- '--[a-z0-9-]+:\s*(10|[0-9])px\s*;' src --include='*.css' | grep -icE 'size'  # 7

# rule 3 — uppercase
grep -icE 'text-transform:\s*uppercase' appcss.txt                 # 102

# §11 — spacing, radii, blur, sp-7
grep -icE '(^|[:; ])(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block))?:[^;]*[0-9]+(px|rem)' appcss.txt   # 783
grep -icE 'var\(--s-[0-9]+\)' appcss.txt                           # 1194
grep -icE 'var\(--sp-[0-9]\)' appcss.txt                           # 1027
grep -icE 'border-radius:[^;]*[0-9]px' appcss.txt                  # 75
grep -icE 'backdrop-filter' appcss.txt                             # 36 (18 are `: none`)
grep -rn -- '--sp-7:' src ; echo $?                                # 1 — defined nowhere

# §11 — the guards
node tools/check-styles.mjs                                        # 147 dead, 19 baselined
```

The per-block checks — uppercase against the label pair, box-shadow against
elevation, kind hue against text, the hover/press/focus triad, figures against
mono — read `rules.jsonl` rather than raw text, because every one of them is a
question about a declaration block and not about a line.
