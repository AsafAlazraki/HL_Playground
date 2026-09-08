# THE BACKLOG

> Reconciled 2026-09-08 against branch `stunning` at `8b67bb1`. Supersedes the
> open-item lists scattered across `docs/plan` and `docs/specs`, which had drifted
> badly out of step with the code.
>
> **IN PROGRESS.** This file is being built as verification completes. The section
> below is verified and citable. A second pass covering `PHASE_TWO`, `UX_PASS`,
> `CLUELESS_USER_TESTS`, `REDESIGN_ROLLOUT` and four code-only gap sweeps is still
> running; when it lands this file gains those rows and a single ranked order.

## How this was built

Every claim was checked **against the code, not against another document**. The
method matters because the premise turned out to be true: the planning docs
systematically under-report what is built. Three docs describe themselves as
"not started" or "specified, not built" while the feature is shipped and the
implementing file cites the doc by section number.

The rule going forward, now recorded in `CLAUDE.md`: verify a claim against the
tree before acting on it.

## Guard baseline, measured today

| guard | result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | clean |
| `npm test` | green — vitest + reachability + check-styles, no new orphans |
| `npm run build` | green in 1.17s |
| style debt | 19 baselined orphans, **174 dead CSS rules** declared and referenced nowhere |
| bundle | one chunk at **3,291.80 kB** (gzip 459.32 kB), over Vite's 500 kB warning |

## Corrections — doc claims that are provably false

| doc | claim | reality | evidence |
|---|---|---|---|
| `README.md` | "Not built yet: the quote flow" | Shipped | `src/features/quote/` — 20+ files inc. `QuoteEditor`, `QuoteDocument`, `freeze.ts`, `pricing.ts` |
| `README.md` | You land on onboarding | You land on a **sign-in screen** | `src/features/auth`, `src/features/tenancy` — never mentioned in any doc |
| `SALES_BOARD.md` | "agreed, not started… Nothing in it is built" | Mostly built | `stages.ts`, `Board.tsx:268-282`, `DealOverview.tsx`, notes/links/files all live |
| `CONFIGURATOR.md` | "specified, not built" | Faults 1–5 and items A, B, D, E all done | `flow.tsx`, `Catalogue.tsx:311-370`, `QuoteBuild.tsx` cites the doc by section letter |
| `MODULE_SYSTEM.md` §11 Q5 | "roles: this plan says later" | Roles are live, persisted, undoable data | `model.ts:927-934` (`RoleDef`), `useProjectStore.ts:1500-1560` |
| `MODULE_SYSTEM.md` §11 Q1 | open question: is the dashboard home? | Settled in code | `winKit.tsx:50-57` "HOME IS THE DASHBOARD"; `Shell.tsx:231-232` |
| `REDESIGN_ROLLOUT.md` §0 | `redesign` is 8 commits ahead of `main` | It is **48**; `stunning` is **102** | `git rev-list --left-right --count` |

## Verified open — the real work, first pass

| # | item | source | state | evidence | why it matters |
|---|---|---|---|---|---|
| 1 | **Roles are configurable but connected to nobody.** `mayDo(module, roleId, cap)` is called with `roleId === null` in every real session. | MODULE §11 Q5 | OPEN | `access.ts:126-129` | The access grid is a working UI over a permission system that never gates anything. Now urgent because a sign-in screen exists — it implies an identity the app does not use. |
| 2 | **No UI consumes the write capabilities.** `edit`/`add`/`delete`/`relate` exist as contract verbs and as switches in the access grid, but nothing reads them to gate a write. | MODULE §11 Q3 | OPEN | `ModuleIndex.tsx:321-323` reads only `browse`/`search`/`open`; 0 hits for the write verbs across `src/features/modules/*.tsx` | A capability switch that changes nothing is worse than no switch. |
| 3 | **Stage changes fire no triggers.** No reassignment, deposit, price-lock or notification on a stage move. | SALES_BOARD 4 | OPEN | 0 hits for `reassign\|owner\|deposit\|lockPric\|notify\|trigger` in `src/features/pipeline` | The doc calls this "the largest and least specified piece". A board that only moves cards is a picture of a process, not the process. |
| 4 | **A quote cannot be reassigned to another salesperson.** | SALES_BOARD 5 | OPEN | 0 hits for `reassign\|salesperson\|ownerId\|assignTo` in `src`; `cardFields.ts` `by` is read-only "who prepared it" | Blocks any real multi-person dealership use. |
| 5 | **The configurator ships neither undo nor confirmation on a pick.** Removing a line is a bare X. | CONFIGURATOR §C | OPEN — **and the code argues against the doc** | `QuoteBuild.tsx:1528` (explicitly reasons for no UNDO toast), `QuoteBuild.tsx:2209-2218` | DESIGN_PRINCIPLES rule 9 says an undoable act gets a toast with UNDO. The code substitutes a delta report. **One of these two documents is wrong and a person must decide which.** |
| 6 | **A quote can only be minted from a view.** No blank-quote path. | MODULE §11 Q4 | OPEN | 0 hits for `blank quote\|createBlankQuote\|start from nothing`; `createQuoteFromView` is the only mint | |
| 7 | **Board columns do not collapse.** | SALES_BOARD 2 | PARTIAL | columns confirmed in `stageStore.ts`; 0 hits for `collaps` in `Board.tsx` | |
| 8 | **Python is not installed on this machine**, so `tools/seed/gen_all.py` cannot run. | — | OPEN (environment) | `python` resolves to the Microsoft Store stub | `src/demos/northside.ts` is generated and currently cannot be regenerated here. Breaks the README's own verification chain. |
| 9 | **Module design portability between orgs** — whether a `ModuleDef` can be exported and imported. | MODULE §11 Q6 | **not verified** | — | Recorded so it is not mistaken for answered. |

## Already done, so it is not re-done

Verified shipped, with the implementing file citing the plan doc by section:
board column customisation (tone/wash split, measured contrast), the card field
picker with its `whyNotField` refusal sentence, deal overview popup and record
page with focus trap, deal attachments (Dexie `helmlogic-deal-files`, blob-native,
20 MB/file), the styled `Picker` listbox that replaced native `<select>`, board
filtering by module via `placesOf`, cross-column drag with a working UNDO toast,
Choose·Configure·Address as one flow with a single shared price-bar object, the
catalogue's "Configure this one" handover, all five `CONFIGURATOR.md` faults, the
nine capability verbs, and the tenth (`configure`) held in a localStorage registry
default-off exactly as specified.

## Questions only a person can answer

1. **Undo on a configurator pick: rule 9, or the delta report?** `CONFIGURATOR.md`
   §C and `QuoteBuild.tsx:1528` directly contradict each other, and the code's
   argument is reasoned rather than accidental.
2. **Who is the person signing in?** A sign-in screen, roles, and an access grid
   all exist; none are wired to each other. `UX_PASS.md` §10 raised this as the
   one question the pass could not answer, and it is now blocking items 1 and 2.
