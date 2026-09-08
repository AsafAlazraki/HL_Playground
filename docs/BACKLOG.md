# THE BACKLOG

> Reconciled 2026-09-08 against branch `stunning` at `7c56419`. Supersedes the
> open-item lists scattered across `docs/plan` and `docs/specs`.
>
> **227 claims were checked against the code**, not against another document.
> The result: **102 already DONE**, 44 PARTIAL,
> 44 genuinely OPEN, and **37 STALE** —
> the doc's premise no longer holds. Plus 34 gaps found in code that no
> document had captured, and 92 recorded corrections.

## How this was built, and why it had to be

Every claim was verified against the tree. The premise turned out to be true and
worse than expected: **45% of the "open" work in the planning docs is already
built.** Three documents describe themselves as "not started" while the
implementing file cites them by section number. Planning off those files would
have rebuilt working features and left the real gaps untouched.

The rule that follows, now in `CLAUDE.md`: verify a claim against the tree
before acting on it.

## Guard baseline, measured today

| guard | result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | clean |
| `npm test` | green — 1770 tests in 112 files, + reachability + styles |
| `npm run build` | green, 1.17s |
| `npm run check:contrast` | clean — 272 text nodes over 5 screens |
| style debt | 19 baselined orphans, **174 dead CSS rules** |
| bundle | one chunk at **3,291.80 kB** (gzip 459.32 kB) |

## The backlog — ranked by effort, cheapest first

88 items. `state` is OPEN (not built) or PARTIAL (started; the row says what exists).

| # | state | source | item | effort | evidence |
|---|---|---|---|---|---|
| 1 | OPEN | PHASE_TWO §6 #5 / §2.1 | §2.1: "The counted figures stay, but as a quiet strip, not as the subject." | hours | Dashboard.tsx:320-410 is header → greeting → Edit button → QuickLinks → card grid; there is no strip element. `grep -rn "Things in |
| 2 | OPEN | PHASE_TWO §6 #6 / §4 | §4.2: "Options strike through in place when the solver removes them — 200ms." | hours | `.s-refused` (ds.css:1721-1733) is a static rule — a --danger left rail plus `text-decoration: line-through` on the figure — with  |
| 3 | OPEN | UX_PASS §9 #1 · §4.1 | §4.1 — "Provenance is a property of a table, and it is visible. A seeded table wears an `Example` chip on its card, in the nav, and on its module." | hours | src/types/model.ts:466-497 — `EntityDef` fields are id, name, description, accent, kind, role, retired, hierarchy, sections, field |
| 4 | OPEN | UX_PASS §9 #1 · §4.2 | §4.2 — "One control removes all of it, states the count, and is undoable: 'Remove the 21 example tables and 651 example rows.'" | hours | The only bulk-removal control is CLEAR SHEET — src/features/io/ImportExportMenu.tsx:692 (button) → :369 `resetProject()`. It wipes |
| 5 | OPEN | UX_PASS §9 #1 · §4.4 | §4.4 — "Presets are neutral, or they are not presets. A `Boats` preset ships the columns every boat has … and *not* `AUS Sailing`." | hours | src/types/model.ts:301 `{ name: 'Tube Dia.', type: 'number', unit: 'cm', section: 'dimensions' }`, :317 `{ name: 'HO - MU', ... }` |
| 6 | OPEN | UX_PASS §9 #2 · §5 | §5 — "Pinning must not be able to author schema … ⚠ These two tables have never been linked. Pinning this motor will create a link table, Boats ↔ Moto | hours | src/features/views/BlockCard.tsx:502-508 — `withJoin` = `const resolved = join ?? ensureJoinTable(sourceEntity.id, target.id)`, ca |
| 7 | OPEN | UX_PASS §9 #2 · §5 | §5 — Finding 18: "Prefer `displayFieldId`; where the guess is weak, say it is a guess." | hours | src/features/rules/RuleInspector.tsx:957-962 — the handler is named `useDisplayFields` but its body is `if (source?.fields[0]) nex |
| 8 | OPEN | UX_PASS §9 #2 · §5 | §5 — Finding 15: `constraintDefs.ts` records that there is "no per-rule delete by design" | hours | src/features/constraints/constraintDefs.ts:248 — `/** Used by a project reset; there is no per-rule delete by design. */ export fu |
| 9 | OPEN | CLUELESS_USER_TESTS §OPEN O5 | 'entity' still reaches the reader from two files nobody on this pass owns. src/types/model.ts:863 - the Match kind's blurb, 'Find the rows of another  | hours | Both files are untouched on this point. src/types/model.ts:1037 still reads blurb: 'Find the rows of another entity that fit this  |
| 10 | OPEN | CLUELESS_USER_TESTS §OPEN O7 | Nothing dragged is verified. Drag a chip from the palette onto the paper, drag a plate to move it, and drag from one plate's handle to another's were  | hours | Still code-read only. The drag API is intact and untested: src/features/rules/drop.ts exports setPaletteDragData (l.47), isPalette |
| 11 | OPEN | CLUELESS_USER_TESTS §OPEN O9 | The rules rail's rename and delete buttons are hover-only hit targets... they are pointer-events: none until the row is hovered or focused. Correct fo | hours | Verbatim still true. src/features/rules/rules.css:1189-1199: '.rl-ruleacts { position: absolute; right: 26px; ... opacity: 0; poin |
| 12 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §2 (defe | §2 defect 2 — "`deleteEntity` does not cascade into views. Delete a table and its module would point at nothing." | hours | src/store/useProjectStore.ts:1025-1048 — `deleteEntity` returns only `{entities, rowsByEntity, rules, selection}`; it never touche |
| 13 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §4.6 | TENANCY §4.6 — "`roles` are never written. `ProjectExport.roles` is declared in the contract with a paragraph explaining why grants are unreadable wit | hours | `grep -n roles src/features/io/exportPayload.ts src/features/io/apply.ts` → no output. `ProjectExport.roles?: RoleDef[]` is declar |
| 14 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §4.6 | TENANCY §4.6 — "`OrgProfile.createdAt` cannot survive a replace… the store stamps `createdAt: nowIso()` on the profile it builds (`useProjectStore.ts: | hours | src/store/useProjectStore.ts:816-823 — `setOrganisation` still writes `org: { name: name.trim(), industry, createdAt: nowIso() }`  |
| 15 | OPEN | CONFIG_FINDINGS+QUOTE_FINDINGS PERF §Fixes 1 (follow- | Implied by Fix 1 — one plate tier is enough because "nothing legible is lost". | hours | src/features/table/tableLod.ts has exactly two thresholds and one plate band (:44-46, :57-62); no second tier. docs/audit/UX_AUDIT |
| 16 | PARTIAL | PHASE_TWO §6 #6 | Phase 6 — "Motion and scale pass". Last, over finished screens. Risk: Low. | hours | Five of the six §4 motions are built: render crossfade 260ms opacity-only (QuoteBuild.tsx:657-696, Render + AnimatePresence, FADE) |
| 17 | PARTIAL | BOARD_CUSTOMISATION+SALES_BOARD CONFIGURATOR §B | §B item 4 — the share, where a share is a fact (`on 3 of 7`, never `on 1 of 1`). | hours | The share exists (curation.ts:257, :377) but there is no 1-of-1 guard: src/features/curation/curation.ts:379 `if (held >= tested)  |
| 18 | PARTIAL | BOARD_CUSTOMISATION+SALES_BOARD CONFIGURATOR §C | §C — Undo, by rule 9: every pick is a toast with UNDO, never a confirmation. | hours | Taking a line OFF is undoable: src/features/quote/quotes.ts:601-637 `say({ text: '<label> taken off the quote', act: { label: 'Und |
| 19 | PARTIAL | UX_PASS §9 #1 · §4.3 | §4.3 — "No surface may name a file the user did not import. Gate every one of those thirteen mentions on real import provenance. Where there is none,  | hours | Gated at the doors only (demoLoad.ts:74-80: "A set with no business named falls through to the words that claim nothing"). Ungated |
| 20 | PARTIAL | UX_PASS §9 #2 | Structure never a side effect (§5) | hours | stops the app authoring schema behind people | hours | The rule is now doctrine and is obeyed in two places: docs/specs/DESIGN_PRINCIPLES.md:340 and docs/specs/DESIGN_CONTRACT.md:360 st |
| 21 | PARTIAL | UX_PASS §9 #9 · §1 | §1 "Scope if it must be cut: cell edits, column removal, row deletion and module-layout changes" | hours | Three of the four are in; the fourth is deliberately out. src/store/useProjectStore.ts:112-114 — "Views and modules stay out. They |
| 22 | PARTIAL | CLUELESS_USER_TESTS §OPEN O4 | Two rule surfaces. Constraints are written as sentences in the rules pane; fitment is written on the view page. A person who has been told 'business r | hours | BOTH surfaces now NAME the other in prose. src/features/constraints/RulesPane.tsx:317 renders the lede 'Limits every row must keep |
| 23 | PARTIAL | CLUELESS_USER_TESTS §OPEN O6 | The last two result columns still need a scroll, and the drawing gets thin while an answer is up. At 1280 the results column takes 571px... The canvas | hours | The 'drawing gets thin' half now has two mitigations in code. (1) src/app/shell.css:1330-1334 caps the column: '.shell-flow-side.i |
| 24 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §5 | §5 — "'Define what can be done within that module' is ten switches on the module" (browse, search, open, add, edit, delete, relate, quote, export, imp | hours | src/types/model.ts:839-848 carries NINE verbs — `import` is absent. The tenth switch drawn is `configure`, held outside the contra |
| 25 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §5 (`con | §5 `configure` — "Where it lives until the contract carries it… the flag is held in `src/features/modules/ruleCapability.ts` — a module registry mirro | hours | ruleCapability.ts:82 `helmlogic.moduleRules.v1`; the three-step deletion is written at :44-48; the two writers are ModuleDesigner. |
| 26 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §3 Scree | §3 Screen 5 — "Cards are dragged into order" | hours | Ordering exists but is two arrow controls, not drag: `reorderPlan` in designer.ts, applied at Dashboard.tsx:224 (`for (const at of |
| 27 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §9 | §9 — "Two types move, unchanged, from `src/features/quote/types.ts` into `model.ts`: `PriceLevel` and `QuoteDef` and their satellites" and `ProjectExp | hours | src/features/quote/types.ts:58 `PriceLevel` and :310 `QuoteDef` are still there; `grep -n PriceLevel src/types/model.ts` → nothing |
| 28 | PARTIAL | MODULE_SYSTEM+TENANCY TENANCY §4.6 | TENANCY §4.6 — "The written order of pages and modules is not stable. `exportPayload` sorts both by `createdAt`… and a restore re-mints `createdAt` th | hours | Half true. Views: src/features/io/exportPayload.ts:124 `Object.values(s.views).sort(byCreatedAt)` and apply.ts:532 re-mints throug |
| 29 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS UX_REWORK §2 | Clause rows are mono 10.5px. | hours | src/features/rules/rule-nodes.css sets 11px on every plate text class (:130, :144, :159, :194, :203, :244, :282, :289, :317, :354, |
| 30 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS UX_REWORK §3 | Lane separation — relayout a rule's flow into free space above the entity cluster on first open, persist via `moveRuleNode`, once per rule, never afte | hours | The mechanism exists and is better than specified — src/features/whiteboard/canvasState.ts:172-232 implements `claimRuleLayout` (o |
| 31 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS UX_REWORK §8b | 8b. Every table has a locked UID system column shown first on every surface that lists columns — table/, data/, whiteboard/, designer/, io/ — non-edit | hours | Core is there: src/types/model.ts:1177-1246 (UID_FIELD_ID '__uid', frozen UID_FIELD, isSystemFieldId, visibleFields UID-first, rea |
| 32 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS CONFIG §4 #3 | Adopt 3 — Empty means unrestricted, applied everywhere, and said in the UI: "Empty list = no filter." | hours | The semantics hold: src/features/constraints/RuleSentence.tsx:58-74 — "Absent means all of them, which is what BUSINESS RULES want |
| 33 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS CONFIG §4 #9 | Adopt 9 — Quarantine, don't coerce: any value starting with `#` is rejected; cached `#N/A`/`#VALUE!` cells are reported, never imported as prices. | hours | The refuse-rather-than-guess discipline is there: src/features/table/core/coerce.ts:130-175 returns `{ok: false, reason}` with a h |
| 34 | OPEN | UX_PASS §9 #4 | Propose modules on the empty dashboard (§8) | ~1 day | the first-run moment | ~1 day | src/features/modules/Dashboard.tsx:354-382 — the `moduleCount === 0` branch is an eyebrow, a paragraph, a count ("You have N table |
| 35 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §10 Phas | §10 Phase 4 — "`export`/`import` as real module capabilities" | ~1 day | `import` is not in `ModuleCapability` at all (model.ts:839-848); `export` is a switch whose note says it is not built (designer.ts |
| 36 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §4.1 | TENANCY §4.1 — "One tenant key, and it is the slug. `OrgProfile` gains `slug: string`, and `orgKeyOf` returns it rather than the lowercased name. Unti | ~1 day | src/types/model.ts:438-442 — `OrgProfile { name, industry, createdAt }`, no slug. src/features/constraints/constraintDefs.ts:40-41 |
| 37 | PARTIAL | PHASE_TWO §6 #5 | Phase 5 — "Landing". Cheap once 2 exists — it is mostly the catalogue's doors plus drafts. Risk: Low. | ~1 day | Done: ONE quotes card with the filters inside it (cards.ts:88-93 'my-quotes'; QUOTE_LENSES at cards.ts:157 with drafts first and t |
| 38 | PARTIAL | UX_PASS §9 #1 | Example-data provenance (§4) | hours | trust, and it is nearly free | ~1 day | Fixed: src/app/demoLoad.ts:39-84 + :113-190 `startingPointWords` — the two doors that load the prepared set now name the business  |
| 39 | PARTIAL | UX_PASS §9 #5 | `⌘K` over everything (§2) | ~1 day | the audit's #2 finding, and wayfinding | ~1 day | Built: src/app/Shell.tsx:439-457 binds ⌘K/Ctrl+K in the capture phase ("THE ONE KEY THE SHELL BINDS"); src/features/search/Finder. |
| 40 | PARTIAL | UX_PASS §9 #5 · §2 | §2 — one field "over five kinds of thing at once": MODULES · ROWS · QUOTES · TABLES · COLUMNS | ~1 day | src/features/search/rowSearch.ts:453-458 — `SearchResult` is `{ tables: TableHit[]; groups: RowGroup[] }`. Only two kinds. Greppin |
| 41 | PARTIAL | REDESIGN_ROLLOUT §3 step 2 | Step 2 — The nine hardcoded values, under an hour. quote.css 3, shell.css 3, constraints.css 2, tablekit.css 1, io.css 1 | ~1 day | Measured with CSS comments stripped (the doc's raw grep counted comment prose). Cleared: `constraints.css` 2 -> **0**, `tablekit.c |
| 42 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §5 | §5 — the refusal list is complete: a capability that cannot be turned on says what is missing | ~1 day | Only three refusals exist (designer.ts:149-166). `export`, `relate`, `add`, `edit`, `delete` are never refused — instead they swit |
| 43 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS PERF §Definition of do | Definition of done — "Pan and zoom hold 60fps with the Northside set loaded… A pass is p90 under 16.7ms and zero frames over 33ms", and the canvas DOM | ~1 day | Met at plate zoom only. docs/audit/sheet-and-tables.md:67-73 measures 0.279 (all plates): p50 16.7 / p90 16.8 / 1 of 57 frames ove |
| 44 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS UX_REWORK §4 | Target: dragging a card and panning stay smooth with the demo loaded; no visible lag on selection clicks. | ~1 day | Selection is fixed (above). Panning is not: docs/audit/sheet-and-tables.md:67-73 measures 41–42 of 42 frames over 33ms at the firs |
| 45 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS CONFIG §4 #7 | Adopt 7 — Dry-run by default, `--apply` to write, before/after JSONL evidence logs. "That is an undo story, already proven at scale." | ~1 day | Dry-run by default: DONE (tableCsv.ts:16-22, above). Evidence logs: absent — no JSONL writer anywhere in src/ or tools/. The undo  |
| 46 | OPEN | PHASE_TWO §6 #4 / §2.4 | §2.4's sheet shape: "◉ Yamaha F90XB — +$9,336 (nearest by hp) / ○ Yamaha F115XB / ○ Leave the motor off" — every alternative priced, the cheapest fix  | ~2 days | The Conflict interface (conflict.ts:113-136) has fields id/title/changed/held/from/to/delta/accept and NO alternatives field. Conf |
| 47 | OPEN | BOARD_CUSTOMISATION+SALES_BOARD SALES_BOARD §5 | ...and reassignment to another salesperson. | ~2 days | `grep -rn 'reassign|assignee|salesperson' src/features/pipeline/` finds no control — only `q.preparedBy` READ at Board.tsx:797 and |
| 48 | OPEN | UX_PASS §9 #5 · §2 | §2 rule 4 — "It respects capabilities. A result a person cannot open does not appear for them." | ~2 days | Grepped `capabilit|canSee|visibleTo|roles` across src/features/search/: the only hit is a prose aside in recent.ts:35. More fundam |
| 49 | OPEN | CLUELESS_USER_TESTS §OPEN O8 | The reviewer still has no door. src/features/review - 8 files over the 15 lint rules - remains reachable from nothing, deliberately... What it would t | ~2 days | Still no door, and the panel is one hop further away than the doc says. ReviewPanel has exactly one importer, src/app/Rails.tsx:54 |
| 50 | OPEN | CLUELESS_USER_TESTS §OPEN O10 | Not an app fault, but it will waste your afternoon. While other workflows are editing src/features/views or src/features/table, their saves hot-update | unknown | The condition is unchanged; only the vocabulary is stale. The shell has no `stage` state any more - it keeps a window list: src/ap |
| 51 | OPEN | REDESIGN_ROLLOUT §3 step 5 / status hea | Step 5b still open — **Jobs panel** (UX_PASS §12), source `sheet.css` / `SheetSurfaces`, *new* | ~2 days | It exists only as a proposal. `src/design/sheet.css:34-120` declares `.jobs`, `.jobs-head`, `.jobs-mark`, `.jobs-name`, `.jobs-sum |
| 52 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §2 (defe | §2 defect 3 — "`EntityDef.priceLevels` does not exist, so `pricing.ts` resolves prices from an exact-name allow-list per `TableKind`… This is the clea | ~2 days | `grep -n priceLevels src/types/model.ts` → no hits; `grep -n PriceLevel src/types/model.ts` → no hits. src/features/quote/pricing. |
| 53 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §6.2 | §6.2 — the QUOTE module "Quotes", whose master is `{ kind: 'documents' }` — a documents collection rather than a table | unknown | `ModuleDef.tableIds: string[]` (model.ts:882-884) is the only master; `grep -rn ModuleMaster src/` → no hits; `grep -n "documents" |
| 54 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §10 Phas | §10 Phase 2 — "`add`/`edit`/`delete` become real against the master table" | ~2 days | src/features/modules/designer.ts:88-99 `NOT_YET_SAYS`: add → "Adding an item from here is not built yet — the sheet is where rows  |
| 55 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §4.5 | TENANCY §4.5 — "The archive moves to the server. `setConfigArchive` is the swap. Nothing above that file changes." | ~2 days | The seam is exactly as described and unbuilt-past: src/features/tenancy/archive.ts:98-103 `ConfigArchive { list(orgSlug), read, wr |
| 56 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §2 | TENANCY §2 — "THE ONE THAT IS AMBIGUOUS: the manufacturers' data… Is a manufacturer catalogue per-org or global? Today it is per-org by construction,  | unknown | Still per-org by construction: the Yamaha and Stabicraft ranges are rows of ordinary tables inside the one project snapshot (src/d |
| 57 | OPEN | CONFIG_FINDINGS+QUOTE_FINDINGS CONFIG §4 #8 | Adopt 8 — Import-time self-verification: recompute the landed-cost chain, store `landedComputed` / `landedDelta` / `landedVerified`, flag deviations o | ~2 days | Zero hits for `landedComputed`, `landedDelta` or `landedVerified` anywhere in src/ or tools/. `landed` appears only as a price-col |
| 58 | OPEN | CONFIG_FINDINGS+QUOTE_FINDINGS CONFIG §4 #11 | Adopt 11 — The importer-registry shape `{vendorMatch, columnMap: Record<header, dottedPath>, keyColumn, transformer, targetCollection}` — "exactly the | ~2 days | Zero hits for `vendorMatch`, `columnMap`, `keyColumn` or `targetCollection` in src/. Column mapping happens interactively and per- |
| 59 | PARTIAL | PHASE_TWO §6 #4 | Phase 4 — "The conflict sheet". Needs 3 in place. The differentiator. Risk: Medium. | ~2 days | Built and live for ONE channel: levelConflict (conflict.ts:154+) is called at QuoteBuild.tsx:399 from the price-level switch and r |
| 60 | PARTIAL | BOARD_CUSTOMISATION+SALES_BOARD BOARD_CUSTOMISATION §3 | Behind it, a dedicated deal page for the full record — every note, every attachment, the stage history, and the document itself. | ~2 days | src/features/pipeline/DealPage.tsx exists (140 lines) and mounts the same parts with no `limit` (:101-131), so 'every note' and 'e |
| 61 | PARTIAL | UX_PASS §9 #7 | The fit sentence (§11) | ~2 days | retires the app's hardest screen | ~2 days | "Keep the engine, demote the canvas" IS done: src/app/FlowStage.tsx:42-49 gives the stage two faces and "the DEFAULT is the readin |
| 62 | PARTIAL | UX_PASS §9 #7 · §11 | §11 — the sentence "is the surface the constraints module already uses" | ~2 days | True for LIMITS, not for FITS. src/features/constraints/NewRuleSentence.tsx (641 lines) is a live sentence builder producing a `Co |
| 63 | PARTIAL | UX_PASS §9 #8 | Paste with header mapping (§3) | ~2 days | the front door to the product | ~2 days | The defect §3 opens with is UNCHANGED. src/features/table/TableSheet.tsx:942-943 — `noRows ? <NoRowsPlate .../> :` renders the pla |
| 64 | PARTIAL | UX_PASS §9 #8 · §3 | §3 — the four steps: PASTE → HEADER → MAP (matched / new column / skip) → PREVIEW, committed as one undoable act | ~2 days | A FILE path landed that implements three of the four properties, for a different job. src/features/io/csvSchema.ts (869 lines) inf |
| 65 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §5 (role | §5 — "Capabilities are module-wide. Everyone using this browser sees the same module with the same verbs." | ~2 days | Per-role subsets are configurable and validated: access.ts:114-140 (`grantedTo`, `mayDo`), :237-256 (`withGrant` refuses a verb th |
| 66 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §3 Scree | §3 Screen 1 — the dashboard as the app's home, with an empty card reading "NOTHING HERE YET… You have 21 tables and no modules. [NEW MODULE]" | unknown | The empty state exists verbatim in shape at src/features/modules/Dashboard.tsx:354-381 ("Nothing here yet", live count, NEW MODULE |
| 67 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS RESPONSIVE §What is st | "Nothing below 620px has been re-measured since the fluid layer landed. The phone rules that existed are still the phone rules that exist." | ~2 days | Eight sub-620 width rules now exist: src/app/shell.css:3632 and :6162 (max-width: 600px), src/features/modules/modules.css:819 (56 |
| 68 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS CONFIG §4 #2 | Adopt 2 — Multi-level AND scoping with a specificity score (module 1, brand 2, range 4, model 8, useCase 16; highest score wins). "The single best ide | ~2 days | Two halves exist separately. Specificity: src/lib/configure/solve.ts:504-506 scores a rule by its clause count. A named level ladd |
| 69 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS QUOTE §2 #8 | Adopt 8 — Labour is part of the product: a catalogued, tiered, snapshot line (boat prep + motor PD + install + rigging labour), not a formula bolted o | ~2 days | Labour IS data, not a formula: Labour Rates is a real table with its own door (src/features/quote/start.ts:27; src/demos/northside |
| 70 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS QUOTE §2 #10 | Adopt 10 — Three-layer content overrides (org default → brand → per-quote) with a lock flag and real version history. | ~2 days | Version history and the lock: DONE — src/features/quote/quotes.ts:818-847 ("Make a new version" is the only action left on an issu |
| 71 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS QUOTE §4 (7 rows) | What Part 1 must therefore provide — the 13-slot menu editable, two-tier fitment, one line model, no string joins, prices that are data, provenance, l | ~2 days | Six of seven verified DONE above (join tables with columns on the join, model.ts:464/:966-969; two-tier, views/pairs.ts:318; one l |
| 72 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §10 Phas | §10 Phase 3 — "the `quotes` slice replacing the localStorage registry; the `constraints` slice with it, since… `resetProject` is currently broken by i | ~3 days | src/features/quote/quotes.ts:48 `const STORE_KEY = 'helmlogic.quotes.v1'`; src/features/constraints/constraintDefs.ts:93 `helmlogi |
| 73 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §4.3 | TENANCY §4.3 — "The five unscoped localStorage stores: quotes, module rule capability, build place, finder recents, and the seed stamp" | ~3 days | All five unchanged: quotes.ts:48, modules/ruleCapability.ts:82, quote/place.ts:49, search/recent.ts:62, demos/seedStamp.ts:52 — no |
| 74 | OPEN | CONFIG_FINDINGS+QUOTE_FINDINGS RESPONSIVE §What is st | "No visual regression tooling, still. Contrast is still measured by hand." | ~3 days | package.json devDependencies are @types/react, @types/react-dom, @vitejs/plugin-react, typescript, vite, vitest — no Playwright, P |
| 75 | OPEN | CONFIG_FINDINGS+QUOTE_FINDINGS QUOTE §2 #9 | Adopt 9 — Deposit stages are data in the business's words: Pending Security · Confirmed Deal · Leaving Factory · Notice of Arrival · On Handover. | ~3 days | Declined by decision: src/features/quote/index.ts:107-113 — "WHAT IS DELIBERATELY NOT BUILT (QUOTE_SPEC §7)… payment schedules and |
| 76 | PARTIAL | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §4 (the  | §4 block vocabulary — six kinds: Index, Detail, Related, Pictures, Price, Note, each a typed `LayoutBlock` on a `ModuleLayout` | ~3 days | `grep -rn "ModuleMaster|ModuleLayout|LayoutBlock|LayoutSurface" src/` → no hits. Only `related` exists as data (`ViewBlock`, model |
| 77 | OPEN | PHASE_TWO §6 #7 | Phase 7 — "URL state". Deep-linkable builds. New: the app has no router. Risk: Medium. | week+ | `grep -rn "pushState\|popstate\|hashchange\|URLSearchParams\|window.history\|react-router" src/` returns ZERO hits. package.json h |
| 78 | OPEN | PHASE_TWO §8 #4 | §8 risk 4 — "Deep-linking is bigger than it looks. No router today. Deliberately last." | week+ | Unchanged and still accurate: no router primitives anywhere in src/ (see §6 #7 evidence). Nothing has been started against it — `g |
| 79 | OPEN | BOARD_CUSTOMISATION+SALES_BOARD SALES_BOARD §4 | What a stage change *does* — stage entry becomes a trigger: reassign the owner, lock the pricing, require a deposit field, notify somebody. | week+ | `grep -rni 'trigger|stage entry|require a deposit|lock the pricing|notify' src/features/pipeline/` returns exactly one hit — src/f |
| 80 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §8 | §8 — "Not building: Deep links / URLs. There is no router (`Shell.tsx:4-6`)." | week+ | `grep -rn "react-router|history.pushState|window.location.hash" src/ package.json` → no hits. Navigation is an in-memory window st |
| 81 | OPEN | MODULE_SYSTEM+TENANCY MODULE_SYSTEM §9 (Migr | §9 Migration — "`db.version(3)` adds three stores — `modules`, `quotes`, `constraints`" and "the `views` store stays declared and stops being written" | week+ | src/db/database.ts:56-64 — v3 adds `modules` only; :73-82 — v4 adds `roles`. Quotes and constraints are still localStorage (quotes |
| 82 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §4.2 | TENANCY §4.2 — "The live project stops being `'default'`… `meta.id` becomes the org's project id, and every Dexie store gains an `orgId` index" | week+ | src/types/model.ts:1095 — `id: 'default'` is still a literal type. src/db/repository.ts:36 `defaultMeta()` and :163 `await db.meta |
| 83 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §4.4 | TENANCY §4.4 — "Real authentication. Everything per-user is decorative until `signIn` talks to a server." | week+ | src/features/auth/session.ts:1-30 still opens "THIS IS NOT AUTHENTICATION… the credential below is in the JavaScript bundle"; the  |
| 84 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §3 / §5 | TENANCY §5 — "Not built, on purpose: the admin app" (five jobs in §3: create a customer, invite people, see what a customer has, support, lifecycle) | week+ | No vendor-facing surface exists. src/app/AdminStage.tsx is the DEALER's own admin ("the workshop behind the shop", :1-46) — schema |
| 85 | OPEN | MODULE_SYSTEM+TENANCY TENANCY §5 | TENANCY §5 — "Not built, on purpose: switching organisations inside the app" | week+ | `grep -rn "orgSlug" src/` shows every consumer reading `currentUser()?.orgSlug` with a hard fallback to `'northside-marine'` (Modu |
| 86 | PARTIAL | REDESIGN_ROLLOUT §3 step 4 | Step 4 — Type sizing, screen by screen, the bulk of the work. Map the outgoing type tokens one stylesheet at a time, biggest first: table.css → shell. | week+ | The method changed: the scale was mapped **centrally**, not per-stylesheet. `src/styles/bridge.css:257-330` (a second half added a |
| 87 | PARTIAL | MODULE_SYSTEM+TENANCY TENANCY §6 | TENANCY §6 — "Scope by the tenant now, even with one tenant… That costs one column and one `where` clause." | week+ | Honoured by everything built since the doc: tenancy archive (archive.ts:100 `list(orgSlug)`), activity (activity.ts:64), dashboard |
| 88 | PARTIAL | CONFIG_FINDINGS+QUOTE_FINDINGS RESPONSIVE §What is st | "The 878 literal `font-size` declarations are not converted. The ramp reaches the 21% that go through tokens." | week+ | Measured at HEAD across src/**/*.css: 1,742 font-size declarations, 722 literal px (41%) — so 59% go through tokens, not 21%. The  |

## Gaps the documents never captured

Found by reading code, independent of any plan. 11 high, 17 medium, 6 low.

| severity | area | gap | evidence |
|---|---|---|---|
| high | src/features/quote/pricing | parseAmount — the only path from a typed number into a quote's money — has zero tests and silently mis-reads a | src/features/quote/pricing.ts:622-627. Grepped all 112 test files (`grep -rn parseAmount $(find src -name '*.test.ts')`) |
| high | src/lib/configure | The constraint solver's contradiction signal has never been asserted to fire — every test asserts it is empty | src/lib/configure/solve.ts is 666 lines. The only test file in the directory is warn.test.ts (305 lines, 15 cases) whose |
| high | src/lib/formula | 13 of the 19 formula builtins have no behavioural test, including every date function | src/lib/formula/functions.ts:162-179 declares 19 builtins. src/lib/formula/formula.test.ts is the only formula test (29  |
| high | vitest.config.ts / whole U | No test renders anything: 158 components, 67,459 LOC of TSX and 68,713 lines of CSS have no automated guard of | vitest.config.ts sets `environment: 'node'` and `include: ['src/**/*.test.ts']`. No jsdom, happy-dom, testing-library, p |
| high | accessibility / navigation | No stage transition moves focus, names the page, or announces itself — A4/A11 are entirely unfixed and now spa | 10 stage roots bind Escape via `useStageEscape` (AdminStage:201, CustomerStage:86, DataStage:137, DesignStage:56, FlowSt |
| high | accessibility / modals (sr | The Saved-configurations modal claims `aria-modal` but traps nothing — and Escape over it closes the page behi | src/app/Shell.tsx:728-737 renders `<div className="cfg-scrim" role="dialog" aria-modal="true" aria-label="Saved configur |
| high | build / bundle size | The entry chunk has grown back past its own pre-optimisation size, and nothing guards it | `npm run build` today emits `dist/assets/index-*.js` at **2,081.98 kB / 610.10 kB gzip** (verified independently: `gzip  |
| high | build / code splitting | Nothing in the app is lazy-loaded except the seed — the sign-in screen ships all 11 stages | `src/demos/seedChunk.ts:50` (`const seed = () => import('./northside')`) is the ONLY dynamic import in shipped code — `g |
| high | runtime / rendering | The rule results table renders every result row uncapped and unwindowed — the seeded rule produces 32,000 rows | `src/features/rules/RuleResultsRail.tsx:149` renders `{rows.map((row, ri) => ...)}` into a plain `<table>`, and each row |
| high | repo hygiene / source enco | SearchField.tsx carries raw NUL bytes, so it is the one file in the repo with CRLF endings and the one file gr | src/features/search/SearchField.tsx holds 3 raw U+0000 characters, written literally into template strings rather than a |
| high | dead code / guard coverage | 1,999 lines of src/app and src/features/designer are imported by nothing, and the reachability guard is struct | tools/check-reachability.mjs:43 is `const FEATURES = join(SRC, 'features')` — the guard walks only src/features, so src/ |
| medium | whole repo | 31.9% of production code — 50,158 lines across 157 files — is never loaded by any test, measured by import clo | Built the static import closure from all 112 test files (resolving the @/ alias, relative specifiers, dynamic await impo |
| medium | src/features | 9 of the 27 live features have no test file at all, including auth and the CSV-import preview | Per-directory count of *.test.ts: auth 0 (566 LOC), banner 0 (123), onboarding 0 (971), page 0 (90), picker 0 (259), rev |
| medium | src/lib/money.ts | Money formatting depends on the machine's locale, and the one test pinning it only passes on a comma-grouping  | src/lib/money.ts:36-40 builds `new Intl.NumberFormat(undefined, ...)` twice — `undefined` is the ambient runtime locale. |
| medium | accessibility / focus visi | Nothing in the app handles `forced-colors`, and 43-86 focus indicators are box-shadow-only, so Windows High Co | `grep -rn 'forced-colors\|-ms-high-contrast' src --include=*.css` -> **0**. Of 364 `:focus`/`:focus-visible`/`:focus-wit |
| medium | accessibility / target siz | Sub-24px click targets were not fixed after A8 named them, and 13 more were built on surfaces created after th | A scan of every CSS rule containing `cursor: pointer` with a declared `width`/`height`/`min-height` under 24px returns * |
| medium | accessibility (src/feature | Rule-graph edges on the flow stage are still tab stops named by internal ids, with no focus ring — the half of | The whiteboard fixed A2 properly and says so: Whiteboard.tsx:1433 `nodesFocusable={false}`, and useDerivedGraph.ts:301 s |
| medium | accessibility / src/featur | The new auth surface got fields right and popovers wrong: WhoChip is a `role="menu"` with non-menuitem childre | src/features/auth was first committed 2026-08-27 (8d37247 "A front door, a person behind it") — **after** docs/audit/acc |
| medium | accessibility / keyboard ( | Arrow-key card moves on the pipeline board drop the keyboard after one press | Board.tsx:695-711 gives each card `onKeyDown` for ArrowLeft/ArrowRight calling `move(q, stages[i±1].id)`, and its `aria- |
| medium | accessibility / modals (4  | Half the `aria-modal` dialogs in the app do not contain Tab, and the I/O panel's A13 mismatch is unchanged | 8 elements declare `role="dialog" aria-modal="true"`: ConfirmSheet.tsx:156, NewModuleDialog.tsx:287, DealOverview.tsx:13 |
| medium | build / CSS | 786 kB of render-blocking CSS is measured by no doc and budgeted by no tool | `dist/assets/index-*.css` is **785,884 B raw / 114,514 B gzip**, linked as `<link rel="stylesheet">` in the `<head>` of  |
| medium | build / config | vite.config.ts has no `build` section, so the chunk-size warning has become permanent noise | `vite.config.ts` declares only `plugins`, `cacheDir`, `resolve` and `server` — `grep -c "build" vite.config.ts` returns  |
| medium | CSS guard accuracy | The 174 dead-CSS-rule number is understated by roughly 59%, because dead components keep dead rules alive, and | tools/check-styles.mjs counts a class as "written" if it appears in ANY .tsx under src/, including the 8 unimported comp |
| medium | CSS guard / unstyled eleme | All 19 baselined style orphans are still orphans — the baseline has never shrunk in 102 commits — and the guar | `node tools/check-styles.mjs` prints no "CLEARED since the baseline" section, meaning `cleared.length === 0`: not one of |
| medium | developer tooling | 14 eslint-disable directives suppress nothing: there is no linter or formatter of any kind in the repo | No `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `biome.json*`, `.oxlintrc*` or `.editorconfig` exists anywhere outsi |
| medium | environment / onboarding | `engines: node >=22` admits Node versions on which Vite refuses to run, and nothing enforces even that | package.json:40-42 declares `"engines": {"node": ">=22"}` (added today in e12be5c). node_modules/vite/package.json (vite |
| medium | repo hygiene | .gitignore says PNGs are "never committed"; 416 of them, 67.1 MB, are committed | .gitignore:28-29 reads "# agent screenshots — never committed; they belong in the scratchpad" followed by `*.png`. Measu |
| medium | repo hygiene | `scratchpad/` is a tracked directory full of another machine's paths — and .gitignore points agents at "the sc | `git ls-files scratchpad` returns 7 tracked files, 254 KB: study-freight.md, study-mpf-brands.md, study-pricematrix.md,  |
| low | tools/check-styles.mjs | The only CSS guard is advisory over 174 dead rules and 19 permanently unstyled elements | `node tools/check-styles.mjs` -> "OK — no new orphans. 19 known (baselined), 174 dead rules." tools/style-baseline.json  |
| low | maintainability / tools | Nothing in the toolchain enforces any accessibility finding, which is why A8 propagated into every post-audit  | `ls tools/` -> check-reachability.mjs, check-styles.mjs, seed/, style-baseline.json. package.json's `test` script runs ` |
| low | tooling | Committed probe config points at a temp path on a different machine | `.probe.vitest.config.ts` is tracked (`git ls-files --error-unmatch .probe.vitest.config.ts` succeeds) and its `test.inc |
| low | design system / build entr | /design.html — the page every doc calls the reference — never loads Archivo, and its entry's header comment ab | src/main.tsx:23 imports `@fontsource-variable/archivo/wdth.css`; src/design/main.tsx imports only inter/opsz.css and thr |
| low | test tooling | Vitest collects only `src/**/*.test.ts`, so any component test written as .test.tsx is silently never run | vitest.config.ts:24 is `include: ['src/**/*.test.ts']`. `find src -name '*.test.ts*'` = 112 files; `find src -name '*.te |
| low | local guard script | check.sh runs the typechecker twice per invocation, and the temp file it names is not gitignored | check.sh:17-19 invokes `npx tsc --noEmit -p tsconfig.app.json --tsBuildInfoFile .tsb-check` once piped through grep for  |

## Corrections — claims that are no longer true

The 37 STALE items above are the short version. These are the explicit
contradictions found between a document and the code.

| source | claim | reality |
|---|---|---|
| PHASE_TWO | §3 table: "Scale contrast — Now: 52px hero, 14px everything. Phase two: 72–110px product names against 12px labels." | Reversed by measurement. The configurator's product name is clamp(26px, 6.4cqi, 34px) — a 34px ceiling, the same step as the app's |
| PHASE_TWO | §2.3 / §0: the configurator "Replaces the six-stop deck" — written as the work ahead. | The deck is already gone. QuoteBuild is the one-page scrolling configurator and is what any draft opens on. |
| PHASE_TWO | §1: "The modules screen — what it does today, and why it is wrong. It draws NINE cards called Boats, Motors, Factory Packages, Tra | Replaced. The grid draws one card per place (Highfield, Yamaha, Stacer, Dunbier, GFAB…), does not scroll the page, carries the kin |
| PHASE_TWO | §1: "New quote — What shipped is a two-pane picker: a LIST of places down the left and rows on the right." | Replaced. The picker is now a grid of small module cards (logo, name, count) that opens in place to that module's rows, with the m |
| PHASE_TWO | §1: "Brand logos — already built, never surfaced. The capability exists and nothing shows it." | Surfaced in all three places the doc asks for. |
| PHASE_TWO | §1: "The side menu is not right yet, specifically" — six numbered faults, including "264px is too wide" and "The sections do not c | All six are answered in code. The rail is 224px, marks are 20px and four in number, the modules carry kind hues, counts survive th |
| PHASE_TWO | §1: "Inside a module — Dashboard · Stock · Quotes · Pricing · Settings" and "Stock — the catalogue, and the register as a density  | The tab is labelled "Catalog", not "Stock". The key stayed 'stock' so stored choices did not break, but the word on screen changed |
| PHASE_TWO | §1a: "Target: explanation under 20% on every surface, measured the same way." | Not met on the configurator, and the code says so rather than claiming otherwise. The doc's own §1a table is also superseded — the |
| PHASE_TWO | §5: "51 table doors → 4 catalogue doors." | There are no four catalogue doors. The catalogue is reached per-table (TableStage → TableWorkspace → Catalogue) or per-module (the |
| PHASE_TWO | §1d: "THIS WHOLE APP NEEDS TO BE RESPONSIVE ON EVERY SCREEN SIZE. It currently is not, and no phase-two screen ships until it is." | Partly answered after the doc was written, not untouched: a responsive spec and a shared stylesheet now exist. But the ≤1024 / ≤76 |
| PHASE_TWO | §0 / §6 #7 / §8 #4: "the app has no router" — presented as the doc's own claim about today. | Still exactly true, and it is the only claim in the doc's focus area that has not moved at all. |
| BOARD_CUSTOMISATION+SALES_BOARD | SALES_BOARD.md header: 'Status: agreed, not started. This is the backlog entry asked for on 28 August 2026. Nothing in it is built | The board shipped on 28 August 2026 and is the DEFAULT quotes screen; the list is the secondary view. src/features/pipeline holds  |
| BOARD_CUSTOMISATION+SALES_BOARD | SALES_BOARD §1: '`QuoteState` today is a closed union of two; this replaces it with a reference to a stage the business defines' a | QuoteState was deliberately NOT replaced and no migration was ever needed. A stage is stored beside the quote, and a quote nobody  |
| BOARD_CUSTOMISATION+SALES_BOARD | SALES_BOARD §3: 'Reuse `features/dashboard/reorder.ts` — it already does pointer capture, slot measurement, keyboard moves and a h | The board does not use reorder.ts at all. It implements its own pointer-capture drag, and reorder.ts was never extended for cross- |
| BOARD_CUSTOMISATION+SALES_BOARD | SALES_BOARD §5: 'Photographs and uploads mean a storage decision this app has not made yet… Decide that before building the upload | The decision was made, written down at length, and the upload control was built on top of it: IndexedDB via Dexie, in its own data |
| BOARD_CUSTOMISATION+SALES_BOARD | BOARD_CUSTOMISATION §1: 'Today a stage carries `name`, `tone`… and its order. What is missing: [the wash] … [the caption]'. | Both are shipped. `StageDef` now carries `wash` as a separate three-step decision and `about` as one field drawn in two positions, |
| BOARD_CUSTOMISATION+SALES_BOARD | BOARD_CUSTOMISATION §2: 'Candidates, all of which the app can already answer: reference, customer, subject, total, when it was las | Six are pickable; three of the nine — customer, total and note count — were deliberately made a non-optional spine that every card |
| BOARD_CUSTOMISATION+SALES_BOARD | BOARD_CUSTOMISATION §5: 'The board's sort and the register's sort are native `<select>` elements.' | Neither is. Both use the app's own styled listbox, and a third consumer already grew. |
| BOARD_CUSTOMISATION+SALES_BOARD | BOARD_CUSTOMISATION §6: 'The board filters by TYPE — boat, motor, trailer. It should also filter by module.' | It already filters by place/module, through `placesOf`, exactly as the doc prescribed — and by the same commit that last touched t |
| BOARD_CUSTOMISATION+SALES_BOARD | CONFIGURATOR: 'The configurator (`features/quote/QuoteBuild.tsx`, 1,644 lines)'. | QuoteBuild.tsx is 2,224 lines (92,006 bytes). |
| BOARD_CUSTOMISATION+SALES_BOARD | CONFIGURATOR fault 3: 'The footer says "Type the customer name at the top" and the top of the screen shows a reference.' | That sentence no longer exists anywhere. The refusal was reworded and given the act it describes — it now walks to the Address sto |
| BOARD_CUSTOMISATION+SALES_BOARD | CONFIGURATOR header: 'Status: specified, not built. Written 28 August 2026… This is where one gets made.' | Faults 1-5 and sections A, B, D and E are built; only §C's 'every pick is a toast with UNDO' is outstanding. The doc's own designa |
| BOARD_CUSTOMISATION+SALES_BOARD | CONFIGURATOR fault 1: expanding an empty band draws four statements of the same fact plus two controls doing one act. | Three of the four were removed and the duplicate control stands down where the door is drawn; the chip (which carries the measured |
| UX_PASS | "**Status.** Proposal, to land with the module system rather than before it. Nothing here is built." (§ header) | Three of the nine ranked changes are shipped (#9 undo + multi-tab lock, #3 blast-radius confirms, #6 pinned display column) and fo |
| UX_PASS | "Grep `\bundo\b` over `src/` returns 19 hits and **zero implementations**." (§1) | Undo and redo are implemented, bounded, persisted, tested and bound to three key chords. The store has `past`/`future` stacks, an  |
| UX_PASS | Four quoted apologies — `EntityDesigner.tsx:540` "This app has no undo", `FieldRow.tsx:287` "…and this app has no undo", `FlowStag | All four sentences were struck, each replaced by a comment recording that it was false, and a test now fails if one comes back. |
| UX_PASS | "The app currently has four confirm sheets and a scatter of `window.confirm` calls, and they exist *because* there is no undo — `C | Zero `window.confirm` calls remain in src/ — every grep hit is a comment recording its removal. The four ConfirmSheet-drawn sheets |
| UX_PASS | "Multi-tab (finding 9): a `BroadcastChannel` lock … Today two tabs silently erase each other's work with no lock of any kind — ver | A complete single-writer election is built and wired: 15 BroadcastChannel references, a four-rule protocol written as pure logic w |
| UX_PASS | "**There is no search in this app at all** — verified: no `cmdk`, no command palette, no global search of any kind." (§2) | A ⌘K finder is shipped: a bound chord, a panel, a 931-line field and a 742-line pure matcher with 699 lines of tests. Its rules 1- |
| UX_PASS | "against 21 tables and 651 rows" (§2), and "Remove the 21 example tables and 651 example rows" (§4) | The seed grew roughly 24x. It is now 51-53 tables and 15,691 rows, with 8,649 pairings — so every figure the doc reasons with, and |
| UX_PASS | "`dependents.ts` and `columnFacts.ts` already compute exactly this — the designer surfaces it. It belongs wherever the act is offe | Already done. The grid's own column menu computes the same three readings from the same two pure modules, explicitly so the two su |
| UX_PASS | "The builder — **19 files, 5,236 lines**" (§11) | Still 19 files, but 8,221 lines — the canvas grew ~57% after the measurement, which strengthens rather than weakens the section's  |
| UX_PASS | "Both flows come out of a single factory — `northside.ts:2349`, `mkRule`" (§11) | `mkRule` is now at src/demos/northside.ts:22941, with its two call sites at :22982 and :23000. The claim holds; only the address i |
| UX_PASS | "`constraintDefs.ts:232` records that there is *'no per-rule delete by design'*" (§5) | Still true, now at line 248, and restated in a second file. |
| UX_PASS | "The module plan is explicit that there are no roles and that admin/user are two modes of one person (§5). That is honest about to | No longer honest about the code. Roles are live, persisted, undoable data, and there are now TWO independent role systems plus a s |
| UX_PASS | "`FIT COLUMNS` — which puts 30 columns into 1,016px, a 3px value box, every header cut to one letter — is retired rather than fixe | It was fixed, not retired, and it still ships. The 3px value box was closed with a name-column floor. Acting on this line would de |
| UX_PASS | "One click on an accessory, on a view page, **moved the selection onto a brand-new join table** … A browse gesture created a schem | Half fixed. Browsing no longer creates a join — that is now stated as the rule in the code. But CURATING one (pin, unpin, star) st |
| CLUELESS_USER_TESTS | O12: 'There is still no undo, and every sheet now says so out loud... each closes with "This app has no undo."' | There is a full undo/redo stack, a global chord handler mounted at the app root, and every one of the four sheets closes on Ctrl+Z |
| CLUELESS_USER_TESTS | O12: 'A real undo is a store-level change (useProjectStore would need a command log), not a designer one.' | The store-level change happened, but as before/after DataSlice snapshots on past/future stacks rather than a command log. The pred |
| CLUELESS_USER_TESTS | O11: 'the column-setup door is still below the fold... Cannot be fixed from src/features/designer - it is src/app/LeftPanel.tsx an | The one-line fix landed in LeftPanel.tsx on 2026-08-14, and three days later the whole left panel was removed from the shell. Left |
| CLUELESS_USER_TESTS | F3 (in the FIXED section): 'Views and rules are now mounted with a door in the left panel.' Also F19's two doors and F15's '192px  | There is no left panel. The doors moved to the ActionBar and the SideNav/AdminStage; the 192px rail F15 describes is the flow stag |
| CLUELESS_USER_TESTS | O5: 'src/types/model.ts:863 - the Match kind's blurb' | Line number is stale (model.ts is now 1264 lines) and the count is one short. The Match blurb is at :1037, and there is a second r |
| CLUELESS_USER_TESTS | O5: 'src/lib/rules/validate.ts writes five sentences a person reads in the toolbar's notes list' | Thirteen, not five. The two the doc cites by line number (97 and 235) are still exact. |
| CLUELESS_USER_TESTS | O8: 'What it would take, in order: confirm-gate every fix...' and '...in an app with no undo.' | The premise (no undo) is false, and the first prerequisite was consequently answered a better way: applying a fix now raises an un |
| CLUELESS_USER_TESTS | O8: 'src/features/review... remains reachable from nothing, deliberately' | Understated in one direction and overstated in the other. ReviewPanel is now further away than the doc implies - its only importer |
| CLUELESS_USER_TESTS | O10: 'their saves hot-update the tree and reset the shell's `stage`' | Shell has no `stage` state. It holds a window list, `wins`. The phenomenon is identical - the state is unpersisted useState - but  |
| CLUELESS_USER_TESTS | O6: 'the drawing gets thin while an answer is up... The canvas is 257px wide meanwhile.' | Partly superseded by code that already existed when the doc was written but is not reflected in it: the results column is capped a |
| REDESIGN_ROLLOUT | §0: "Branch `redesign`, 8 commits ahead of `main` (`main` is untouched at `19c95ab`)" | Work is on branch `stunning`, 102 commits ahead of `origin/main`. `origin/redesign` is 48 ahead and was itself abandoned on 2026-0 |
| REDESIGN_ROLLOUT | §0: "Shell stages **six** — the five originals plus `module`" | Fifteen. The Stage union moved from Shell.tsx to src/app/winKit.tsx:50 and gained home, gallery, history, levels, table, customer, |
| REDESIGN_ROLLOUT | §0: "`ModuleDef` contract live in `model.ts:848`" | src/model.ts does not exist. ModuleDef is at src/types/model.ts:874, and has since gained `logo?: ImageRef` and `access?: ModuleAc |
| REDESIGN_ROLLOUT | §0: "Stylesheets 26 files, 23,081 lines" | 47 files, 68,713 lines (37 app files / 62,170 lines excluding src/styles and src/design). |
| REDESIGN_ROLLOUT | §0: "Tests 11 files, **214 passing**" and status header "Tests **251 passing**" | 112 test files, 1,769 tests passing. |
| REDESIGN_ROLLOUT | §8: "`src/styles/bridge.css` — the re-skin, written, **not switched on**" (and bridge.css:4's own "NOT IMPORTED YET") | It has been switched on since 2026-08-17. The doc contradicts its own status header, and the file's header comment contradicts the |
| REDESIGN_ROLLOUT | §1: "nine values are the entire non-tokenised surface of this codebase" (quote.css 3, shell.css 3, constraints.css 2, tablekit.css | 67 across eight app stylesheets. constraints.css and tablekit.css are now clean; quote.css is 12 (nine of them a documented paper- |
| REDESIGN_ROLLOUT | §1 / step 4: "the bridge deliberately does not touch any `*-size` / `*-lead` / `*-track`" | It does now. A second half was appended that sets the entire display/ui/stamp/micro/data scale, and response.css then ramps all of |
| REDESIGN_ROLLOUT | §2: "It found **35 pre-existing orphans**… e.g. `qt-list-who` is written at `QuoteList.tsx:50` with zero rules in `quote.css`" | 19 orphans are baselined, and the cited example was fixed — `.qt-list-who` has a rule at quote.css:2244 and the call site moved to |
| REDESIGN_ROLLOUT | Status header / §5: "Rollback is still one line (`import './styles/bridge.css'` in `src/main.tsx`)" | No longer true. response.css loads last and re-declares the same type-size tokens, so removing the bridge leaves the new type scal |
| REDESIGN_ROLLOUT | Status header: "Still open: step 5b (the remaining new surfaces — jobs panel, fit sentence, nav, index tiles, quote document)" | Four of the five shipped. Nav -> SideNav.tsx mounted at Shell.tsx:504 (LeftPanel imported by nothing); index tiles -> ModuleIndex. |
| REDESIGN_ROLLOUT | §3 step 3: "`main.tsx` currently loads Archivo and Instrument Serif… Swap to `@fontsource-variable/inter/opsz.css`" | The opsz swap happened (main.tsx:9) and Instrument Serif was retired, but Archivo was deliberately reinstated as a display-only fa |
| REDESIGN_ROLLOUT | §3 step 4: the ordered list "table.css (2,893) → shell.css (1,970) → designer.css (1,539) → rules.css (1,523) → modules.css (1,388 | Every figure is stale and the ranking is wrong. Current sizes: shell.css 6,568, table.css 5,524, modules.css 5,367, constraints.cs |

_92 corrections were recorded; the 60 above are the ones that change what to build._

## Already done, so it is not re-done

102 verified-shipped claims, each with a file:line in the source agents'
output. The headline ones: the rail and Admin, the catalogue, **the configurator**
(`QuoteBuild.tsx`, 2224 lines — sticky product pane, banded options, a price bar
that never leaves), the module system with its nine capability verbs, roles as
persisted undoable data, the sales board with drag and undo, deal notes,
attachments and links, and the five `CONFIGURATOR.md` faults.

## Questions only a person can answer

1. **Undo on a configurator pick.** `CONFIGURATOR.md` §C requires a toast with
   UNDO on every pick; `QuoteBuild.tsx:1528` argues explicitly against one and
   ships a delta report instead. Both are reasoned. A cascade announcement sits
   exactly on this fault line.
2. **Who is the person signing in?** A sign-in screen, roles and an access grid
   all exist and none are wired to each other — `mayDo()` is called with
   `roleId === null` in every session. `UX_PASS.md` §10 raised this as the one
   question it could not answer.
3. **§1 deletes the counted strip and §2.1 asks for it back.** Today neither
   exists. Both sections cannot be satisfied without a decision.

## Open thread — the discovery engine is still non-deterministic

> Added 2026-09-09, measured, not inferred.

`src/features/constraints/discoverNorthside.test.ts` — *"DISAGREES about
'Boat Size (Mtr)'"* — **fails about one full-suite run in three**, and passes
4 of 4 when that file is run alone. The assertion is `expected undefined to be
defined`: the candidate is not produced at all, not produced with wrong numbers.

**This is already a known bug that has already been fixed once.** `discover.ts`
`rank()` carries a long note saying exactly this: *"measured, the categorical
selector over 'Boat Size (Mtr)' was inside the cap on some runs and outside it
on others, which is the whole of the `discoverNorthside` flake that three passes
have now recorded as 'fails about one run in four' without fixing it."* The fix
was to give `rank` a total order on `statement`.

**That fix is in the tree and the flake survives it**, which rules out the
diagnosis it was built on. What is now known:

- the per-shape cap (`maxPerShape: 12`, `discover.ts:2158-2170`) is applied
  **after** `proposals.sort(rank)` (`:2155`), so ordering at the cap is
  deterministic if `rank` is total — and `rank` appears total
- `discoverSteps` has no time budget: `started` (`:2033`) is used only to report
  `ms` (`:2200`)
- entity iteration order was already fixed by `inOrder()`
- so the variation is **upstream of ranking** — in what gets measured, not in
  how it is sorted

Worth checking next, in order: whether `tested`/`rate` themselves vary run to
run; whether `--no-file-parallelism` makes it stable (the vitest config records
that trick working for the earlier wall-clock flakes, which would point at
shared module state across test files rather than at discovery itself); and
`discover.ts:1241`, `directions.sort((x, y) => y.hits / y.tally.tested - …)`,
which returns **NaN** when `tested` is 0 and leaves that sort's order undefined.

**Why this outranks its size.** The product's claim is that nothing is invented
and every reason is recorded. A discovery engine that proposes a different set
of rules on different runs over identical data contradicts that directly — and
the guard that would catch it is the one test people have learned to re-run.
