# STACK AND ENGINEERING PRACTICE
> Studied 2026-09-08. Whether this repo's dependencies are genuinely current
> (they are, to the patch), and where its engineering practice has holes the
> guards cannot see — component tests, contrast, lint, CI, and a `check.sh`
> that cannot report a failing test suite.

## What we already believed

`package.json` declares a stack that reads as aggressively modern:
`react ^19.2.8` (line 25), `typescript ^7.0.2` (33), `vite ^8.2.0` (34),
`vitest ^4.1.10` (35), `motion ^13.0.0` (23), `@xyflow/react ^12.11.2` (21),
`dexie ^4.4.4` (22), `zustand ^5.0.14` (27).

`CLAUDE.md` § *What the guards cannot see* already states the honest position:

> **contrast** is not automated, there is **no visual regression tooling**, and
> whether a screen makes sense is a person's job.

`CLAUDE.md` § *Before you commit* says `npm test` runs "three guards": `vitest`,
reachability, `check-styles`. That is accurate (`package.json:10`). What it does
not say is that `npm test` never type-checks.

## What is actually installed, measured

Measured on this machine, 2026-09-08. Node **v24.20.0**, npm **11.19.0**.

`npm ls --depth=0` resolves every top-level dependency to the **exact caret
minimum** written in `package.json` — the lockfile has not been refreshed since
the ranges were authored.

| package | installed | registry `latest` | gap |
|---|---|---|---|
| react / react-dom | 19.2.8 | 19.2.8 | current |
| typescript | 7.0.2 | 7.0.2 | current |
| @types/react | 19.2.18 | 19.2.18 | current |
| vite | 8.2.0 | 8.2.2 | 2 patches |
| vitest | 4.1.10 | 5.0.0 (`V4` tag: 4.1.11) | 1 major |
| @vitejs/plugin-react | 6.0.5 | 6.1.1 | 1 minor |
| @xyflow/react | 12.11.2 | 12.11.6 | 4 patches |
| motion | 13.0.0 | 13.2.0 | 2 minors |
| dexie | 4.4.4 | 4.4.5 | 1 patch |
| zustand | 5.0.14 | 5.0.15 | 1 patch |
| nanoid | 6.0.0 | 6.0.1 | 1 patch |
| @types/react-dom | 19.2.4 | 19.2.7 | 3 patches |

`npm outdated` reports exactly those ten rows. React, react-dom, `@types/react`,
TypeScript and the four `@fontsource*` packages do not appear — they are at
`latest`.

**Type check.** `npx tsc --version` → `Version 7.0.2`.
`npx tsc --noEmit -p tsconfig.app.json` → **clean, 3.55s wall** across 187,090
lines of `.ts`/`.tsx`. `tsconfig.node.json` → clean. `npx tsc -b --dry` resolves
both projects, so project references work under TS 7.

**Test suite.** `npx vitest run --reporter=dot` → **112 files, 1,769 tests, all
passing, 61.76s wall** (`transform 21.42s, import 392.86s` aggregate across
workers, `tests 64.22s`). That 392.86s import figure is the 3.97 MB
`src/demos/northside.ts` seed parsed once per worker — exactly the cost
`vitest.config.ts:27-65` documents and caps with `maxWorkers: 8`.

Full `npm test` → **65.3s**. Reachability: *"28 directories under src/features,
every one reachable from src/main.tsx. 1 dormant by declaration."* Styles:
*"OK — no new orphans. 19 known (baselined), 174 dead rules."*

**Build.** `npx vite build` (to a scratch outDir) → **built in 1.03s**, 1.9s
wall. `index.js` **2,081.93 kB** (gzip 610.08 kB), `northside.js` **3,291.80 kB**
(gzip 459.32 kB), `index.css` **785.88 kB** (gzip 115.95 kB), plus 15 woff2
faces. Rolldown warns two chunks exceed 500 kB. The seed *is* already split —
`src/demos/seedChunk.ts:27-35` uses `import('./northside')` — so the 2.08 MB
main chunk is app code and libraries, not split further.

**Shape.** 554 source files; 187,090 lines `.ts`/`.tsx` (67,459 across 158
`.tsx`); 68,713 lines CSS; 28 feature directories; 118 commits, last
2026-09-01.

**Hooks actually used**, grepped across `src`: `useMemo` **448**, `useCallback`
**298**, `useSyncExternalStore` **89** — and `useTransition` **0**,
`useDeferredValue` **0**, `Suspense` **0**, `useOptimistic` **0**,
`useActionState` **0**, `<Activity>` **0**. `src/main.tsx:62` does wrap the tree
in `<StrictMode>`.

**What is absent, verified by looking:**

- No `.github/` — `ls .github` → *No such file or directory*. **No CI.**
- No `.git/hooks` entries beyond the shipped `.sample` files. **No pre-commit hook.**
- No `eslint`, `typescript-eslint`, `oxlint`, `biome`, `prettier`, `.editorconfig`
  at root or in `node_modules`. **No linter, no formatter.**
- No `playwright`, `@playwright/test`, `puppeteer`, `axe-core`, `jsdom`,
  `happy-dom`, `@testing-library/*`, `fake-indexeddb` in `node_modules`.
  **No E2E, no DOM environment, no a11y tooling.**
- No `engines` field, no `.nvmrc`. **Node version unpinned.**
- 112 `*.test.ts`, **0 `*.test.tsx`**, and
  `grep -rl "render(" src --include='*.test.ts*'` returns nothing. **Zero
  component tests.** `vitest.config.ts:5-8` states this as a decision: *"No
  React plugin: every test here is pure logic, and nothing under test renders."*

**Feature directories with zero tests — 10 of 28:** `auth` (4 files), `banner`
(2), `data` (3), `onboarding` (4), `page` (2), `picker` (2), `review` (7),
`rules` (17), `tablekit` (8), `whiteboard` (9). `rules/` at 17 untested files is
the largest.

**The persistence layer is effectively untested.** `src/db/repository.ts` is 376
lines; `src/db/repository.test.ts` (110 lines) tests one pure function,
`diffStore`, and says so in its own header: *"The rest of the repository is
Dexie plumbing around it."* `vitest.config.ts:25` sets `environment: 'node'`, so
there is no `indexedDB` global — grepping `src` for `indexedDB|fake-indexeddb`
returns **nothing**. For a local-first app, the disk path has no test.

**`check.sh` cannot report a failing test suite.** Lines 23 and 26:

    npx vitest run --reporter=dot 2>&1 | tail -12 || FAIL=1
    node tools/check-reachability.mjs 2>&1 | tail -6 || FAIL=1

Without `set -o pipefail`, a pipeline's exit status is `tail`'s, which is always
0, so `FAIL=1` is unreachable. Reproduced here:

    $ bash -c 'FAIL=0; (echo out; exit 1) | tail -1 || FAIL=1; echo FAIL=$FAIL'
    out
    FAIL=0

`check.sh` therefore prints **ALL GREEN** with a red suite. The TYPES block
(lines 8-10) and STYLE block (19-20) dodge this by running the command a second
time undiluted; UNIT TESTS and REACHABILITY do not. `npm test`
(`package.json:10`) chains with `&&` and is correct — the bug is confined to
`check.sh`, the script whose own first line calls itself *"One command that
proves the app."*

**There is already an a11y probe — it just is not a guard.**
`scratch-probe/a11y/` (215 lines, committed) drives Playwright and measures
accessible names, landmarks, heading order, live regions, focus rings
(`RINGS()`, diffing `getComputedStyle` before and after `.focus()` across the
element *and two ancestors*) and sub-24px targets (`SMALL()`). It cannot run
here: `scratch-probe/a11y/drive.mjs:2` hard-codes
`C:/Users/AsafA/AppData/Roaming/npm/node_modules/@playwright/test/`, verified
absent on this machine, and `PROFILE`/`URL` are likewise another machine's.
Notably `probe.mjs` measures everything **except contrast** — which matches
`CLAUDE.md`'s admission precisely.

Same class of drift: `.probe.vitest.config.ts:7` is committed and points at
`C:/Users/AsafA/AppData/Local/Temp/claude/...`, a dead path from a lost session.

**Evidence discipline is real and unusual.** 267 PNGs under
`docs/audit/screens/`, and the audit docs record their conditions
(`docs/audit/language.md:5`: *"Run at: 1280 × 800, Chrome,
http://localhost:5090, seeded Northside"*). They were produced by hand; nothing
regenerates them.

**Security.** `npm audit` → **1 high**: `nanoid <3.3.18` (GHSA-2v37-7h3g-55p8).
The chain is `vite@8.2.0 → postcss@8.5.25 → nanoid@3.3.16` — transitive under
Vite, not the direct `nanoid@6.0.0`. No script runs `npm audit`.

## What the current versions are, verified

Checked against primary sources and the npm registry on 2026-09-08.

| package | current stable | released | note |
|---|---|---|---|
| TypeScript | **7.0.2** | 7.0 GA **2026-07-08** | the Go-based native port; `dist-tags` → `latest: 7.0.2`, `next: 7.1.0-dev.20260908.1` |
| React / react-dom | **19.2.8** | 19.2 line from **2025-10-01** | 19.3 exists only as `19.3.0-canary-f1f7ed2a-20260904` |
| Vite | **8.2.2** | 8.0 **2026-03-12** | Rolldown replaces esbuild + Rollup |
| Vitest | **5.0.0** | **2026-09-03** | v4 line maintained under the `V4` tag at 4.1.11 |
| @vitejs/plugin-react | **6.1.1** | — | v6 swapped Babel for Oxc on React Refresh |
| Playwright | **1.63.0** (npm) | ~6-week cadence | 1.62.1 was 2026-07-30 |
| oxlint | **1.82.0** | type-aware stable **2026-07-22** | |
| axe-core / @axe-core/playwright | **4.13.0** | — | |
| eslint-plugin-react-hooks | **7.1.1** | — | carries the React Compiler rules since 6.0 |
| @vitest/browser-playwright | **5.0.0** | — | Vitest 4 split providers into their own packages |
| vitest-browser-react | **2.3.0** | — | |
| fake-indexeddb | **6.2.5** | — | |
| dexie | **4.4.5** | — | no v5; `dist-tags` has no `next` or `beta` |
| zustand / motion / @xyflow/react | **5.0.15 / 13.2.0 / 12.11.6** | — | all on the current major |

**TypeScript 7 is real, stable, and this repo already satisfies it.** The
announcement is explicit about what 7.0 removed: `target: es5`,
`downlevelIteration`, `moduleResolution: node/node10` and `classic`,
`module: amd/umd/systemjs/none`, **`baseUrl`**, and `esModuleInterop` /
`allowSyntheticDefaultImports` / `alwaysStrict` can no longer be `false`. New
defaults: `strict: true`, `module: esnext`, `noUncheckedSideEffectImports: true`,
`types: []`, `rootDir: ./`, `stableTypeOrdering: true`. `tsconfig.app.json` uses
`moduleResolution: bundler` (line 8), `target: ES2022` (3), `strict: true` (15),
`noUncheckedSideEffectImports: true` (19), and `paths` **without** `baseUrl`
(14) — which is exactly the shape TS 7 now requires, since `paths` resolve
relative to the project root. Confirmed empirically: clean in 3.55s. No
`--noEmit` behaviour change is documented, and none was observed.

**The catch that matters here:** *"TypeScript 7.0 does not yet ship with an API.
We expect TypeScript 7.1 to ship with a new (and different) API."* The same post
names the consequence — **typescript-eslint cannot run on TS 7**, along with
Vue/Svelte/Astro/MDX tooling and Angular template checking. So the textbook
answer to "this repo has no linter" is unavailable today.

**oxlint is the answer that does work.** Type-aware linting went stable
2026-07-22; its engine `tsgolint` is *"built directly on TypeScript v7.0.2"* —
the exact version installed here — covers **59 of 61** typescript-eslint
type-aware rules, and measured **12-18× faster** than ESLint + typescript-eslint
on VS Code and TypeORM. Enabled with `{"options": {"typeAware": true}}` or
`oxlint --type-aware`. On 2026-08-18 oxlint added **22 React Compiler-powered
rules** (11 in `recommended` → `correctness`) that catch Rules-of-React
violations **without running the compiler**, via
`{"plugins": ["react"], "categories": {"correctness": "error"}}`. Its built-in
set also includes `jsx-a11y` and `vitest` plugins.

**Vitest 4 — the version already installed — ships both things `CLAUDE.md` says
are missing.** Browser Mode was promoted out of experimental in Vitest 4.0
(2025-10-22), which also introduced **`toMatchScreenshot`** for visual
regression and `toBeInViewport`. Baselines live in `__screenshots__/` beside the
test as `test-name-[browser]-[platform].png`, and the docs say *"Commit them to
your repository."* They also warn visual tests are *"sensitive to environmental
differences"*, recommend a standardised environment (Docker or CI-only), and
advise updating baselines in CI rather than locally. Vitest 4 requires the
provider as a separate package (`@vitest/browser-playwright`); context imports
moved to `vitest/browser`.

**Vitest 5 is a five-day-old major (2026-09-03).** It requires Node ≥ 22.12
(have 24.20) and Vite ≥ 6.4 (have 8.2), so it *would* install. Breaking changes
that touch this repo: `clearMocks` now defaults to **true**; `vi.mock` /
`vi.unmock` / `vi.hoisted` now **throw** outside module top level rather than
warn; config lookup no longer searches ancestor directories; JSON/JUnit
reporters write to files by default; reports consolidate under `.vitest/`;
`toMatchScreenshot` gets its own `screenshotDirectory`; `@vitest/runner`,
`@vitest/expect` and `@vitest/ws-client` are deprecated into `vitest`. This repo
has **27 `vi.mock`**, 8 `vi.useFakeTimers`, 3 `vi.fn`; all `vi.mock` calls sit at
column 0 (`grep -rn "^\s\+vi\.mock("` returns nothing), so the hoisting rule is
safe. `clearMocks` is the one to verify.

**Vite 8 (2026-03-12)** requires Node 20.19+/22.12+ and is already what the
1.03s build runs on. Nothing in this repo's `vite.config.ts` is deprecated by it.

**React 19.2 (2025-10-01)** shipped `<Activity />`, `useEffectEvent`,
`cacheSignal`, Performance Tracks (Chrome DevTools scheduler and components
tracks), partial pre-rendering, and changed the default `useId` prefix from
`:r:` to `_r_`. None of these appear in `src`.

**React Compiler 1.0 (2025-10-07)** does automatic memoization; Meta reports up
to 12% faster loads and 2.5× faster interactions. Its own caveats are pointed:
pin an exact version *"if lacking comprehensive test coverage"*, and *"employ
continuous end-to-end testing before upgrading"*, because changed memoization
changes when `useEffect` fires. The install cost here is concrete —
`node_modules/@vitejs/plugin-react/README.md:82-92` requires
`@rolldown/plugin-babel`, `@babel/core`, `babel-plugin-react-compiler` and
`@types/babel__core`, i.e. re-adding Babel to a pipeline Vite 8 and plugin-react
6 deliberately made Babel-free. `babel-plugin-react-compiler` is **not**
installed; it appears in `package-lock.json:882` only as plugin-react's optional
peer.

## The map — practice against this repo

| practice | current best practice | do we? | evidence in this repo | verdict |
|---|---|---|---|---|
| Dependency currency | track `latest` stable; patch promptly | almost | 10 deps 1 patch to 1 minor behind; react/TS at exact `latest` (`npm outdated`) | adapt |
| TypeScript version | TS 7.0.2, GA 2026-07-08 | **yes** | `npx tsc --version` → 7.0.2; clean `--noEmit` in 3.55s | already do it |
| tsconfig TS7 compatibility | no `baseUrl`, no `node10`, `strict` on | **yes** | `tsconfig.app.json:8,14,15,19` — `paths` without `baseUrl` is exactly TS7's shape | already do it |
| Build tooling | Vite 8 + Rolldown (2026-03-12) | **yes** | `vite build` → 1.03s for 187k lines | already do it |
| Type check in the commit gate | typecheck runs with tests, and in CI | **no** | `package.json:10` — `npm test` is vitest + 2 node checks, no `tsc`; only `check.sh:8` and `npm run build` typecheck | adopt |
| Guard script reports failure | `set -o pipefail` in any `cmd \| tail` gate | **no** | `check.sh:23,26` — `FAIL=1` unreachable; reproduced above | adopt |
| Linting | oxlint 1.82 `--type-aware` (typescript-eslint blocked on TS7's missing API) | **no** | no eslint/oxlint/biome config or package anywhere | adopt |
| Rules-of-React lint | oxlint's 22 compiler-powered rules (2026-08-18), or eslint-plugin-react-hooks 7.1.1 | **no** | 158 `.tsx`, 746 manual memo calls, nothing checking hook rules | adopt |
| Formatting | a formatter, or at minimum `.editorconfig` | **no** | no prettier/biome/.editorconfig; style is uniform by hand | adapt |
| CI | GitHub Actions, `setup-node` + `cache: 'npm'`, `npm ci`, install → typecheck → test | **no** | `ls .github` → absent; 118 commits, none CI-verified | adopt |
| Node version pinning | `engines` + `.nvmrc` | **no** | neither exists; Vitest 5 will need ≥22.12, Vite 8 needs ≥20.19 | adopt |
| Lockfile committed | yes, `npm ci`-able | **yes** | `package-lock.json` tracked, `lockfileVersion: 3` | already do it |
| Unit tests on logic | fast, colocated, against real data | **yes, strongly** | 1,769 tests / 112 files / 61.76s, asserting against the whole 23k-line seed | already do it |
| Component / DOM tests | Vitest Browser Mode (stable since 4.0) over jsdom — real layout, CSS, focus, pointer | **no** | 0 `.test.tsx`; no `render(` in any test; `vitest.config.ts:5-8` declares it out of scope | adopt |
| Persistence tests (local-first) | exercise IndexedDB — real browser, or `fake-indexeddb` 6.2.5 | **no** | `repository.test.ts` covers only `diffStore`; `environment: 'node'` has no `indexedDB`; 376 lines of Dexie plumbing untested | adopt |
| Visual regression | `toMatchScreenshot` — already in the installed Vitest 4 | **no** | `CLAUDE.md`: *"no visual regression tooling"*; 267 hand-made PNGs, nothing regenerates them | adopt |
| Automated accessibility | axe-core 4.13 in a real browser; catches roughly 30-50% of WCAG mechanically | **no** | `scratch-probe/a11y/` measures names, landmarks, focus rings, target size — but is unrunnable (`drive.mjs:2` hard-codes a missing path) and is scratch, not a guard | adopt |
| Contrast automation | axe `color-contrast` in a real browser does the ancestor compositing itself | **no** | `CLAUDE.md`: *"contrast is not automated"*; `probe.mjs` checks everything but contrast; *"Three sweeps reported false catastrophes"* | adopt |
| E2E | Playwright 1.63; one smoke path, not a suite | **no** | no playwright dependency; the 267 screenshots were driven by hand | adapt |
| Bundle budget | a size gate in CI | **no** | main chunk 2,081.93 kB (610 kB gzip); Rolldown warns; nothing fails | adapt |
| Dependency vulnerability scan | `npm audit` in CI | **no** | 1 high (nanoid <3.3.18, transitive under `vite → postcss`); no script runs it | adapt |
| React concurrent rendering | `useDeferredValue` / `useTransition` for large-list interaction | **no** | 0 uses of either; 23k-line seed, ~11k-row store, 60 files in `features/table` | adapt |
| React 19.2 features | `<Activity>`, `useEffectEvent` | **no** | 0 uses; `useEffectEvent` is the direct fix for stale-closure effects | adapt |
| React Compiler | 1.0 stable — but its docs ask for *"continuous end-to-end testing before upgrading"* | **no** | 448 `useMemo` + 298 `useCallback` it would subsume, against 0 component tests and 4 new Babel packages (`plugin-react README:82-92`) | reject |
| StrictMode in dev | on | **yes** | `src/main.tsx:62` | already do it |
| Bespoke architectural guards | rare; most repos have none | **yes** | `tools/check-reachability.mjs` (28 dirs, all reachable) and `tools/check-styles.mjs` (19 baselined orphans, budget enforced) — genuinely unusual, worth keeping | already do it |
| Evidence-first docs | rare | **yes** | 267 screenshots, conditions recorded (`docs/audit/language.md:5`), `CLAUDE.md` naming its own blind spots | already do it |
| Repo hygiene | no dead machine-specific files committed | **no** | `.probe.vitest.config.ts:7` and `scratch-probe/a11y/drive.mjs:2` both point at `C:/Users/AsafA/...`, verified absent | adopt |

## What we adopt, and in what order

**1. `set -o pipefail` at the top of `check.sh`.** One line. Today the script
prints `ALL GREEN` when `vitest` fails, which is worse than having no script at
all. Verify by breaking one assertion and confirming a non-zero exit.

**2. A `typecheck` script, wired into `npm test`.**
`"typecheck": "tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json"`,
prepended to `package.json:10`. Measured cost on the full tree: **3.55s** —
smaller than any other guard. Today the only things that type-check are
`npm run build` and `check.sh`, and `CLAUDE.md` § *Before you commit* points at
neither.

**3. `.github/workflows/ci.yml`.** `actions/setup-node` with `cache: 'npm'`,
`npm ci`, then `npm run typecheck && npm test && npm run build`. Add
`"engines": {"node": ">=22.12"}` and a `.nvmrc` pinning 24 in the same commit —
Vitest 5 will require ≥22.12 when the repo takes it. Add `concurrency` to cancel
stale runs. Measured budget for the whole gate: 65.3s + 3.55s + 1.9s ≈ **71s**.

**4. oxlint 1.82.0, type-aware.** `.oxlintrc.json` with
`{"plugins": ["react", "jsx-a11y", "vitest"], "categories": {"correctness": "error"}, "options": {"typeAware": true}}`.
This is the only linter that runs on TypeScript 7.0.2 today: `tsgolint` is built
on exactly that version, while typescript-eslint is blocked until 7.1 ships an
API. It brings the 22 React Compiler rules without adopting the compiler, plus
`jsx-a11y`, which is the cheapest first cut at the accessibility gap. Expect an
initial backlog of violations; baseline it the way `tools/style-baseline.json`
is baselined, with a budget that may not grow.

**5. A second Vitest project for the browser.** `@vitest/browser-playwright` +
`vitest-browser-react`, added as a separate `test.projects` entry so the
existing 61.76s node suite is untouched. This one addition closes **three** gaps,
and needs no new major — Browser Mode has been stable since Vitest 4.0:
- **Contrast**, via axe-core 4.13's `color-contrast` rule in a real browser.
  This is precisely the compositing `CLAUDE.md` warns three hand-rolled sweeps
  got wrong — *"parse `color(srgb …)`, composite the full ancestor chain, and
  composite translucent text over it"*. axe does that natively against
  `getComputedStyle`.
- **Automated a11y**, by porting `scratch-probe/a11y/probe.mjs` into real
  assertions. The `RINGS()` focus-ring diff and `SMALL()` 24px target check are
  good work that axe does not replace; only the hard-coded
  `C:/Users/AsafA/...` require needs replacing with a local dependency.
- **Visual regression**, via `toMatchScreenshot`, with `__screenshots__/`
  committed. Per the Vitest docs, generate and update baselines **in CI only** —
  a Windows dev machine and a Linux runner will not agree on font rendering, and
  screenshot filenames are already platform-suffixed.

**6. Persistence tests.** Either run `src/db/repository.ts` in the new browser
project against real IndexedDB, or add `fake-indexeddb` 6.2.5 to the node
project. 376 lines of Dexie plumbing in a local-first app currently rest on one
pure-function test. Start with the round-trip the audits already caught bugs in
(`docs/audit/screens/critic-03-after-roundtrip.png`).

**7. Delete the dead machine-specific files.** `.probe.vitest.config.ts` and
`scratch-probe/a11y/*` should either be repaired into the browser project (5) or
removed. Both hard-code `C:/Users/AsafA/...`, verified absent here, so both are
currently misleading to anyone who finds them.

**8. A bundle-size gate in CI.** The main chunk is 2,081.93 kB raw / 610.08 kB
gzip and Rolldown warns on it. Fix the threshold at today's number so it cannot
drift silently; the seed split (`seedChunk.ts:27-35`) already proves the pattern
is understood here.

**9. `npm audit --audit-level=high` in CI, non-blocking at first.** The single
current finding is transitive under Vite and not this repo's to fix directly; a
bump to `vite@8.2.2` is the thing to try, then re-measure.

**10. `useDeferredValue` on the table's filter/search input.** 60 files in
`features/table`, a store on the order of 11k rows, and zero concurrent-rendering
APIs anywhere in the tree. This is the one React 19 feature with an obvious
application here. Measure with React 19.2's Performance Tracks in Chrome
DevTools before and after, and record the numbers the way `docs/audit/` records
everything else.

## What we reject, and why

- **typescript-eslint.** Cannot run. TypeScript 7.0 ships without a programmatic
  API — *"We expect TypeScript 7.1 to ship with a new (and different) API"* —
  and the announcement names typescript-eslint among the blocked tools. Revisit
  at 7.1 (`next` is already `7.1.0-dev.20260908.1`, so it is close). Until then
  oxlint's `tsgolint` covers 59 of its 61 type-aware rules anyway.

- **Vitest 5.0.0, this week.** Released **2026-09-03, five days ago**. The v4
  line is maintained (`V4` dist-tag → 4.1.11). Nothing this repo needs is
  5-only: Browser Mode and `toMatchScreenshot` both landed in 4.0. Take 4.1.11
  now, plan 5 once CI exists — the migration is real (`clearMocks` defaults to
  `true` against 27 `vi.mock` sites, config lookup stops walking ancestors,
  reporters write to files, output moves to `.vitest/`), and doing it without CI
  means discovering all of that by hand.

- **React Compiler.** Its own documentation asks for *"continuous end-to-end
  testing before upgrading"* and exact-version pinning for projects lacking
  comprehensive coverage; this repo has **zero** component tests and zero E2E.
  Adopting it also means installing `@rolldown/plugin-babel`, `@babel/core`,
  `babel-plugin-react-compiler` and `@types/babel__core`
  (`node_modules/@vitejs/plugin-react/README.md:82-92`) — putting Babel back
  into a build Vite 8 and plugin-react 6 removed it from, against a 1.03s build.
  Take oxlint's 22 compiler-powered **lint** rules (item 4), which need none of
  that, and revisit once items 5 and 6 exist.

- **jsdom / happy-dom + Testing Library.** The gaps here are contrast, focus
  rings, target size and layout — none of which jsdom can see, since it has no
  real layout, no computed styles and no real focus. For a repo with 68,713
  lines of CSS and a design system enforced by a bespoke style guard, jsdom
  would answer the wrong question. Browser Mode is the 2026 answer and is
  already in the installed major.

- **Chromatic / Percy / Lost Pixel.** External SaaS for something
  `toMatchScreenshot` does inside `vitest@4.1.10`, which is already installed.
  Reconsider only if review-by-URL becomes a workflow need.

- **Playwright component testing as a separate stack.** Redundant with Vitest
  Browser Mode, which uses Playwright as its provider. One browser runner, not
  two.

- **A full E2E suite.** Not yet. `tools/check-reachability.mjs` already proves
  every feature is wired to `main.tsx`, and 1,769 unit tests cover the logic. A
  Playwright suite before there is any CI to run it in is maintenance cost with
  no consumer. Revisit after item 3, starting with one smoke path — sign in,
  load the seed, render the table — rather than a suite.

- **A whole-repo formatter (Prettier or Biome).** Reformatting 187,090 lines in
  one commit destroys `git blame` across a codebase whose commit messages are
  deliberately explanatory (`CLAUDE.md`: *"Commit messages explain the
  decision"*). The existing style is already uniform by hand. Add `.editorconfig`
  instead and let oxlint carry correctness.

- **React 19.3 / canary.** Not released. `npm view react dist-tags` →
  `latest: 19.2.8`; 19.3 exists only as `19.3.0-canary-f1f7ed2a-20260904`.

- **Dexie 5.** Does not exist. `npm view dexie dist-tags` → `latest: 4.4.5`,
  with no `next` or `beta` tag. `dexie@4.4.4 → 4.4.5` is the whole move
  available.

- **`npm audit fix`.** The one high finding is `nanoid@3.3.16` reached through
  `vite@8.2.0 → postcss@8.5.25`. Fixing it from here means an override on
  someone else's dependency tree. Bump Vite to 8.2.2 and re-measure instead.

**Not verified:** whether `oxfmt` (the Oxc formatter) is production-ready as of
2026-09; whether Vitest 5's `maxWorkers` semantics changed, which matters given
`vitest.config.ts:65`; whether any of the 174 dead CSS rules are load-bearing at
runtime; current best practice specifically for testing Dexie/IndexedDB in a
local-first app, beyond the general browser-mode-over-jsdom guidance above.

## Sources

Primary sources, all fetched 2026-09-08.

- [Announcing TypeScript 7.0 — Microsoft DevBlogs](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — GA 2026-07-08; removed options (`baseUrl`, `node10`, `es5`); new defaults; *"TypeScript 7.0 does not yet ship with an API"*; typescript-eslint blocked
- [Vite 8.0 is out! — vite.dev](https://vite.dev/blog/announcing-vite8) — 2026-03-12; Rolldown replaces esbuild + Rollup; Node 20.19+/22.12+; plugin-react v6 swaps Babel for Oxc
- [Vitest 5.0 is out! — vitest.dev](https://vitest.dev/blog/vitest-5.html) — 2026-09-03; Node ≥ 22.12, Vite ≥ 6.4; shared Vite server; `.vitest` report directory
- [Vitest 4.0 announcement — vitest.dev](https://vitest.dev/blog/vitest-4) — 2025-10-22; Browser Mode out of experimental; `toMatchScreenshot`; `@vitest/browser-playwright`
- [Vitest Migration Guide — vitest.dev](https://vitest.dev/guide/migration.html) — the full Vitest 5 breaking-change list (`clearMocks: true`, hoisting now throws, config lookup, reporters, coverage)
- [Visual Regression Testing — vitest.dev](https://vitest.dev/guide/browser/visual-regression-testing) — `__screenshots__/` layout, `comparatorOptions`, *"Commit them to your repository"*, CI-only baseline guidance
- [React 19.2 — react.dev](https://react.dev/blog/2025/10/01/react-19-2) — 2025-10-01; `<Activity />`, `useEffectEvent`, `cacheSignal`, Performance Tracks, partial pre-rendering, `useId` prefix `_r_`
- [React Compiler v1.0 — react.dev](https://react.dev/blog/2025/10/07/react-compiler-1) — 2025-10-07; automatic memoization; compiler rules folded into `eslint-plugin-react-hooks`; pin exact versions without coverage; *"continuous end-to-end testing before upgrading"*
- [Type-Aware Linting Stable — oxc.rs](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable) — 2026-07-22; `tsgolint` built on TypeScript v7.0.2; 59/61 typescript-eslint type-aware rules; 12-18× faster; `typeAware` config
- [React Compiler Support — oxc.rs](https://oxc.rs/blog/2026-08-18-react-compiler-support) — 2026-08-18; 22 compiler-powered rules, 11 in `recommended`; no compiler required
- [Playwright release notes — playwright.dev](https://playwright.dev/docs/release-notes) — release cadence; 1.62.1 dated 2026-07-30

Measured locally, 2026-09-08, reproducible from the repo root:

- `npm ls --depth=0`, `npm outdated`, `npm view <pkg> dist-tags`, `npm audit`
- `npx tsc --version`; `npx tsc --noEmit -p tsconfig.app.json` (3.55s, clean)
- `npx vitest run --reporter=dot` (112 files, 1,769 tests, 61.76s)
- `npm test` (65.3s); `node tools/check-reachability.mjs`; `node tools/check-styles.mjs`
- `npx vite build` (1.03s; 2,081.93 kB / 3,291.80 kB / 785.88 kB)
- `node_modules/@vitejs/plugin-react/README.md:80-116` — React Compiler setup requirements
