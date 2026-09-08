# THE CASCADE ANNOUNCEMENT — a spec, from the code up

> Written 2026-09-08. The half-built second channel in `conflict.ts` is the
> right shape for the thing no configurator ships; this is what it computes,
> what it is missing, what would have to fire it, and the one rule
> contradiction it lands on.

Read first, not repeated here: `docs/research/configurator-teardowns-2026.md`
(nobody announces a cascade — closed negative across eight configurators) and
`docs/research/explaining-a-refusal.md` (PubGrub's chain grammar, Nix's ranked
priced fixes). This document is about our code.

---

## What already exists, exactly

**One `Conflict` type, two builders, one of them wired.**

`src/features/quote/conflict.ts:119-136` declares `Conflict`:

| field | line | what it is |
|---|---|---|
| `id` | 121 | the sheet's identity, `key`ed on at `QuoteBuild.tsx:469` |
| `title` | 123 | one line, also the `aria-label` at `QuoteBuild.tsx:1837` |
| `changed: ConflictLine[]` | 125 | the rows drawn under "What changes" |
| `held: ConflictLine[]` | 127 | the rows drawn under "What stays as it is" |
| `from` / `to` / `delta` | 129 / 131 / 133 | committed total, proposed total, the arithmetic |
| `accept` | 135 | the OK button's words — never a bare "OK" |

**There is no `alternatives` field, and no `chosen` field.** `PHASE_TWO.md`
§2.4 (lines 502-509) requires both: three priced options, radio-marked, the
cheapest pre-selected.

`ConflictLine` is at `conflict.ts:95-109` — `lineId`, `label`, `fromColumn`,
`from`, `toColumn`, `to`, `why`. `from`/`to` are `number | null` and the
comment at `:93-94` is load-bearing: `null` is "not priced here" and is never
rendered as 0. The sheet honours that at `QuoteBuild.tsx:1859` and `:1864`
(`row.from === null ? '—' : money(row.from)`).

**`levelConflict` (`conflict.ts:155-232`) is the live one.** Its whole wiring:

- imported at `QuoteBuild.tsx:220` — `import { deltaSay, levelConflict, type Conflict } from './conflict'`
- state at `QuoteBuild.tsx:389` — `useState<{ conflict: Conflict; levelKey: string } | null>(null)`
- built at `QuoteBuild.tsx:396-407` in `askLevel(key, label)`: `levelConflict` returns `null` → `setLevel` immediately; otherwise `setProposal({ conflict, levelKey: key })`
- called from the rung buttons on the price bar, `QuoteBuild.tsx:1578-1582` (`onClick={() => onLevel(l.key, l.label)}`)
- mounted at `QuoteBuild.tsx:466-478` inside `<AnimatePresence>`, keyed on `proposal.conflict.id`, with `onAccept` calling `setLevel(quote.id, proposal.levelKey)` then `setProposal(null)`, and `onCancel` calling `setProposal(null)`
- drawn at `QuoteBuild.tsx:1815-1910`

**The committed total does not move while the sheet is open** — that is not
enforced by the sheet, it is a property of the design: `setLevel`
(`quotes.ts:514-515`) is not called until Accept, and the price bar reads
`totals` off the document. The same rule is restated for the price bar's own
weighing slot at `QuoteBuild.tsx:1516-1520`.

**The sheet's CSS** is `src/features/quote/build.css:2050-2261`
(`.qb-sheet-scrim`, `.qb-sheet`, `-title`, `-group`, `-cap`, `-rows`, `-row`,
`-name`, `-move`, `-from`, `-arrow`, `-to`, `-why`, `-foot`, `-delta`,
`-delta-lab`, `-delta-fig`, `-acts`, `-no`, `-ok`), with a responsive block at
`:2434-2440`. `.qb-sheet-row` is a two-column grid (`build.css:2122-2130`) with
`.qb-sheet-why` spanning both (`:2164-2169`).

**What does not exist:** there is no `src/features/quote/conflict.test.ts`.
`src/features/quote/*.test.ts` is eight files and none of them mentions
`conflict`. Neither builder has a test.

---

## What `optionConflict` computes today, and why it is empty

`optionConflict` is `conflict.ts:288-340`. Signature:

```
optionConflict(
  quote: QuoteDef,
  asked: Fix,                      // conflict.ts:271-274 — { label, amount }
  onQuote: readonly LineValues[],  // conflict.ts:265-268 — { line, cells[] }
  blocked: BlockedLookup,          // conflict.ts:258-261 — (fieldId, value) => { because } | undefined
  fixes: readonly Fix[],
): { removals: Removal[]; conflict: Conflict | null }
```

**What it actually does, line by line:**

1. `:297-311` — for each line already on the quote, for each cell that line
   holds on a column the rules reach, ask `blocked(cell.fieldId, cell.value)`.
   The first hit per line becomes a `Removal` (`conflict.ts:240-252`:
   `lineId`, `label`, `amount`, `where`, `value`, `because`) and `break`s —
   **one reason per line, the first one found**, not the strongest and not all
   of them.
2. `:313` — no removals, no conflict. Correct, and the same discipline as
   `levelConflict:160-161`.
3. `:315-323` — the arithmetic:
   `to = from − Σ(removed amounts) + asked.amount + cheapest surviving fix`,
   with `cheapest` the minimum non-null `Fix.amount` (`:318-322`). Every term
   is defensible; none of it reaches the screen (see below).
4. `:327-338` — returns a `Conflict` whose `changed` and `held` are **literal
   empty arrays** (`:332-333`).

**Why it returns empty arrays — three independent reasons, all of them real:**

**(a) The two arrays the sheet draws are hardcoded empty.** `ConflictSheet`
renders `conflict.changed` (`QuoteBuild.tsx:1850-1871`) and `conflict.held`
(`:1873-1889`) and nothing else between the title and the footer. So an
`optionConflict` passed to today's sheet draws a title, a signed delta and two
buttons. The `removals` array — the only thing with any content in it — is
returned as the *first* element of a tuple that no caller destructures, because
there is no caller. It is out of band by construction.

**(b) `blocked` can never return anything on the seeded price file.** The
lookup is `explain()` (`src/lib/configure/solve.ts:629-642`) bound to a
`solve()` state; it reads `state.blocked[fieldId][valueKey]` and returns a
`BlockedValue` (`src/types/model.ts:752-756` — `{ constraintId, because }`).
`solve()` needs runnable `ConstraintDef`s. `src/demos/seededRules.test.ts:346-361`
asserts, as a test, that `seedWorkbookConstraints()` emits none: all sixteen
`WORKBOOK_RULES` carry a `blocked` string and no `build`, and
`WORKBOOK_RULES_BLOCKED` has length 16. The file's own header
(`conflict.ts:66-74`) says exactly this and calls it honest rather than dead,
which is fair.

**(c) — the one the header does not say — there is no cascade path on the
build screen at all.** This is the finding that changes the build order.

- The shortlist comes from `stepOffer` (`freeze.ts:1063-1170`). Its narrowing
  is `relatedRows({ sourceEntity: root, sourceRow: row, rule: block?.rule, join })`
  (`freeze.ts:1077-1086`) — the **hull**, the view block's rule, and the join
  table. Nothing else.
- `quote.lines` enters `stepOffer` at exactly one place: `freeze.ts:1120-1124`,
  building the `onQuote` map that sets `alreadyLineId`. It marks what is
  already taken. **It narrows nothing.** The memo at `QuoteBuild.tsx:903-908`
  lists `lines` as a dependency, and the comment at `:900` states its purpose:
  "and `lines`, for 'already on the quote'."
- Therefore **no pick in one band can remove anything from another band
  today.**
- And the subject cannot change: `rootRowId` is written once, at
  `freeze.ts:489`, inside `mintQuoteFromView`. No function in
  `src/features/quote/*.ts` writes it again; `quotes.ts:384` and `:396` only
  read it. So PHASE_TWO §2.4's worked example — *"Changing to the SP660 affects
  your build"* — describes an act `QuoteBuild.tsx` cannot currently perform.

**What it would need to compute to be useful.** Given a pick that does remove
something, the sheet needs, per removed line: the line, the figure it takes
away, the cause named on both sides, and the surviving priced alternatives with
the cheapest marked. `optionConflict` already computes four of those five
(`Removal` at `:240-252` plus `cheapest` at `:318-322`); what it does not
compute is **which alternatives survive**, because `fixes` is handed to it as
an opaque list of `{ label, amount }` (`:271-274`) with no identity — no
`lineId`, no `key`, no `QuoteLine`. A sheet cannot apply a `Fix`. It can only
price it.

---

## The data available to name a cause

Five objects in the tree can produce a reason sentence. Only one of them runs
on the seed today.

| object | where | what it carries | runs on the seed? |
|---|---|---|---|
| `Candidate.outsideWhy` | `freeze.ts:561-587` (field), `:1012-1049` (builder) | one sentence, both figures, per row — *"its Max boat length (5.20 m) is less than this boat's Length (5.60 m)"*; the curated case names the join table instead | **yes** |
| `BlockedValue` via `explain()` | `solve.ts:629-642`, type at `model.ts:752-756` | `{ constraintId, because }`, recorded at the moment of removal | no — no runnable constraints |
| `ValueWarning` via `warningsFor()` | `solve.ts:654-665`, type at `solve.ts:98-102` | same two fields, the never-removes channel | no |
| `SubjectNarrowing` | `subjectRules.ts:96-101`, built at `:267+` | `{ constraintId, where, value, because }`, capped at `NARROWING_CAP = 4` (`:135`) | no |
| `PartnerVerdict` / `FloorVerdict` | `trailerFitment.ts:514-529` / `:365-368` | see below | yes, but not on this screen |

**`outsideWhy` is the working reason-generator and it is under-used.** It
re-runs the block's clauses one at a time through the same `evalPairRule` the
shortlist was built with (`freeze.ts:1041-1046`), joins the failures with
"and", and returns `''` rather than guessing where no single clause can be
blamed (`:1047`). It is drawn today only on refused cards, at
`QuoteBuild.tsx:2104` as `.qb-card-why`. It answers *"why is this row not
offered"* — it does **not** answer *"why did your pick remove this line"*,
because it is a fact about a candidate against the hull, not about a change.

**What `PartnerVerdict` carries.** `trailerFitment.ts:514-529`:
`partnerTableId`, `partnerTableName`, `rowId`, `label`, `banner`,
`series: 'built-for-this' | 'built-for-another' | 'unnamed'` (`:512`),
`bannerMarque: string | null`, `namesModel: boolean`, and `floor: FloorVerdict`.
`FloorVerdict` (`:365-368`) is a three-way union: `{kind:'clears', capacity,
load}`, `{kind:'under', capacity, load}`, `{kind:'not-evaluable', why}` — and
the `why` strings are composed at `:642-648` and `:692-695`, naming the table
and the empty column. `FitmentResult` (`:539-556`) adds `subjectLabel`,
`marque`, `catalogue`, the three buckets, `heldBack`, `regime`,
`floorWarnings` and `floorNotEvaluable`.

**Verdict: enough to name a *state*, not enough to name a *cascade*.** Three
gaps, all verified:

1. **No time.** Every one of these objects is a verdict about now. Nothing in
   the tree records "this was on the quote and is not now, and here is what
   moved between". `Removal` (`conflict.ts:240-252`) is the only type shaped
   like a change and nothing constructs it.
2. **No subject-side attribution finer than the hull.** `PartnerVerdict` names
   the partner completely and names the cause only as *"the banner names
   Stacer, this is a Highfield"* — which is `FitmentResult.subjectLabel`
   (`:543`). It can say "because this is a Highfield CL360". It cannot say
   "because of the pick you just made", because on this data there was no pick
   — there is only the standing subject.
3. **It is not wired to the quote.** No file under `src/features/quote/`
   imports `trailerFitment`. The only `@/features/constraints` imports there
   are `ruleLedger` (`freeze.ts:71`), `columns` (`subjectRules.ts:86`) and
   `constraintDefs` (`QuoteStart.tsx:97`). The verdicts render in
   `src/features/constraints/TrailerFitmentPanel.tsx`,
   `src/features/constraints/LeftOutList.tsx` and
   `src/features/fitment/FanOut.tsx` — three surfaces away from the
   configurator.

**Not verified:** whether `relatedRows` could be given a line-aware rule
without a change to the view block model. I read `stepOffer`'s call into it
(`freeze.ts:1077-1086`) but not `relatedRows` itself.

---

## The surface — what it draws, and the rules it must obey

**The shape, from `PHASE_TWO.md:502-509`:**

```
Changing to the SP660 affects your build.
The Yamaha F40LA is rated to 60 hp; this hull needs 90-150.

  (o) Yamaha F90XB   — +$9,336  (nearest by hp)
  ( ) Yamaha F115XB  — +$14,110
  ( ) Leave the motor off

Total change +$9,336 · [Accept] [Cancel]
```

`CONFIGURATOR_PLAYBOOK.md:346-365` gives the same object with more structure —
WHAT YOU ASKED FOR / WHAT CHANGES (Removed / Added / Repriced) / the footer —
plus three constraints: the committed total does not move (`:363`); the
arithmetic is shown, not hidden (`:365`); **and the undo target is in the URL**,
`?quote=1042&fix=<verdictId>&from=<lineIds>`, so Cancel is a navigation and the
sheet is bookmarkable (`:364`). That third one is not built anywhere — the
proposal is React state at `QuoteBuild.tsx:389` — and adopting it is a separate
decision, not a side effect of this work.

**What maps onto existing structure, with no new class:**

- the two sentences → `conflict.title` plus a second line, or `title` plus the
  first `held` row's `why` (`.qb-sheet-why`, `build.css:2164-2169`)
- "WHAT CHANGES / Removed" → `held` rows with the `because` in `why`; the sheet
  already draws a single figure and a reason for these (`QuoteBuild.tsx:1877-1888`)
- "WHAT YOU ASKED FOR" → one `changed` row, `from: null → to: asked.amount`
- the footer → `.qb-sheet-foot` / `.qb-sheet-delta-fig` / `.qb-sheet-acts`
  unchanged (`QuoteBuild.tsx:1891-1905`)

**What genuinely needs new markup:** the radio group. Roughly `.qb-sheet-alts`
(the `<ul role="radiogroup">`), `.qb-sheet-alt` (the row), `.qb-sheet-alt-mark`
(the dot), `.qb-sheet-alt-name`, `.qb-sheet-alt-fig`, `.qb-sheet-alt-note` (the
"nearest by hp" qualifier — which must come from data, not be written).

**The rules it must obey.** Every one is checkable before the screen is opened:

1. **Tokens only** (DESIGN_PRINCIPLES rule 1, `:21`). `.qb-sheet-*` already
   uses `--surface-1`, `--surface-2`, `--line`, `--fg`, `--fg-secondary`,
   `--fg-tertiary`, `--accent`, `--accent-fg`, `--e-hero`, `--s-1..5`,
   `--r-panel`, `--r-control`. Reuse exactly these.
2. **11px floor** (rule 2, `:23`). `.qb-sheet-cap` is `.mono-label`, the
   11px/0.06em label step; nothing on the alternatives may go below it.
3. **Uppercase is a label style only** (rule 3, `:25`). An alternative's name
   is a product name — sentence case, never uppercase. Only the group caption
   ("Instead") may be `.mono-label`.
4. **4.5:1, and a tint counts** (rule 4, `:27`). `.qb-sheet-row` sits on
   `--surface-2` (`build.css:2129`) and `.qb-sheet-why` on it uses
   `--fg-secondary` — an alternative row on the same tint must not drop to
   `--fg-tertiary` for anything a person has to read. Re-run
   `npm run check:contrast` (CLAUDE.md); it is a new surface and the baseline
   is 272 nodes across five screens.
5. **One accent** (rule 5, `:28`; DESIGN_CONTRACT §11, "Accent appears roughly
   four times"). `.qb-sheet-ok` already spends the sheet's filled accent
   (`build.css:2234-2247`). **A pre-selected radio wants accent too, and that
   is two.** The narrow reading: the selected dot may carry accent as a mark,
   not a fill, since the contract permits accent as a dot. This is the one
   place the design rules and §2.4 press against each other, and it is worth a
   look at `/design.html` before it is settled.
6. **Hover, press and focus on every pressable thing** (rule 8, `:33`;
   contract §11, "controls 0.97"). Each alternative row is pressable and needs
   all three, matching `.qb-sheet-no:hover / :active / :focus-visible`
   (`build.css:2220-2232`).
7. **Anything that cannot be done says why, where it is** (rule 10, `:35`). An
   alternative with no price says `not priced here` — the app's existing words,
   `.qb-nil`, `QuoteBuild.tsx:1787` and `:2108`.
8. **Every figure is mono, tabular** (contract §11). `.qb-sheet-move` and
   `.qb-sheet-delta-fig` already are (`build.css:2140-2148`, `:2192-2198`).
9. **Motion**: the sheet already animates on transform and opacity only, at
   `SPRING_QUICK`, with `still` turning it off (`QuoteBuild.tsx:1839-1845`).
   The alternatives must not add a second animation.
10. **`check-styles`**: every new class must be declared in
    `src/features/quote/build.css`. 19 orphans are baselined and a 20th fails
    the build (CLAUDE.md).

**One accessibility change the new content forces.** The sheet focuses the OK
button on mount (`QuoteBuild.tsx:1824-1828`). With a pre-selected alternative
the decision is *which option*, not *whether* — focus should land on the
checked radio so the arrow keys work immediately, and `aria-label` on the
dialog (`:1837`) should stay the title. Escape → cancel is already handled at
`:1846-1851` and stops propagation so the stage's own Escape does not close the
whole quote.

---

## The undo contradiction, and a recommendation

Two documents in this repo give opposite instructions for exactly this surface.

**Position A — every pick is a toast with UNDO.**

`docs/plan/CONFIGURATOR.md:113-114`, verbatim:

> **Undo, by rule 9** — every pick is a toast with UNDO, never a
> confirmation.

Backed by `DESIGN_PRINCIPLES.md:35` (rule 9) and `:333-335`:

> **If an act is undoable it gets a toast with UNDO, not a dialog.** Dialogs
> are for the genuinely irreversible. Every confirm sheet is a full stop in the
> middle of somebody's work.

Restated identically in `DESIGN_CONTRACT.md:355-357`. The position is strong
here because a cascade **is** undoable: `removeLine` (`quotes.ts:585-628`)
already puts a line back **by value**, in its section at its position, with the
frozen number and provenance intact — the header at `:560-582` argues that an
undo which re-minted the line would break the whole freeze invariant "at the
one moment a person is least able to notice". The machinery for a cascade undo
exists and is proven.

**Position B — the report replaces the toast.**

`QuoteBuild.tsx:1522-1538`, verbatim (the argument is in the file's own
comment):

> THE PROPOSAL TOOK THE DELTA'S PLACE AND THE PLACE NEVER CAME BACK. The
> proposal was tested first, and after a click the pointer is still on the card
> that was clicked — so `weighing` is never null on the frame the pick lands,
> the delta branch is unreachable in the whole ordinary mouse flow, and the
> report of what a pick DID could not draw. **This file's own argument for
> adding no UNDO toast on "put on" rests on that report.** So it goes first
> now, for the 2.6s it lives…

The report is `useTotalDelta` (`QuoteBuild.tsx:1918-1932`), cleared after
2600ms at `:1928`, drawn at `:1544-1548`. The measurement quoted in the comment
is on the SP760ST: hovering reads `WOULD BE $173,041 +$29,460`, clicking reads
`+$29,460` against a committed `$173,041`.

**The code already takes a side, asymmetrically.** `removeLine`
(`quotes.ts:585`) raises a note with UNDO. `addLine` (`quotes.ts:532-540`) is a
four-line arrow function that raises nothing. So today: taking off gets a way
back, putting on does not — which is Position B in practice.

**Three mechanical facts that bear on the choice, none of them opinions:**

- **A toast holds one line and one act.** `ToastAct` is `{ label, onPick }`
  (`src/features/table/Toasts.tsx:21-25`), and the comment at `:19-20` is
  explicit: "One named act per note — never two, because a note is read at a
  glance and a glance holds one decision." `ToastItem` is
  `{ id, text, tone, act? }` (`:27-32`). A cascade announcement is two names, a
  delta, and a **choice among priced alternatives**. It does not fit, and
  widening `ToastAct` would delete the reasoning that shaped it.
- **Dwell is 4600ms, or 9000ms with an act** (`Toasts.tsx:48`, `:54`), capped
  at three items (`:56`). A cascade that removed two lines and offered three
  alternatives has to be read, not glanced at.
- **`sayUndoable` cannot be used for a quote act.** `offerUndo`
  (`src/store/notes.ts:114-141`) pins to `useProjectStore.getState().past`.
  Quotes are not in that history — `quotes.ts:568-571`: "Ctrl+Z cannot help
  either: the project store's history knows nothing about a quote, because a
  quote is a photograph and lives in this registry." Any cascade undo must
  hand-roll the by-value restore the way `removeLine` does.

**The playbook has already split this, and both documents missed it.**
`CONFIGURATOR_PLAYBOOK.md:344-346`:

> **One decided stop touched, and reversible → no sheet.** Apply it. Toast with
> UNDO, naming the item and the amount. Rule 9: if it is undoable it gets a
> toast, not a dialog.
>
> **Two or more decided stops touched, or a line the dealer chose is removed →
> a sheet.**

So the contradiction is between `CONFIGURATOR.md` §C's absolute ("every pick")
and the playbook's threshold. The playbook is the more specific document and it
is the one written against the measured field.

### Recommendation — for a person to decide, not settled here

**Split on whether there is a choice to make, not on how many lines move.**

- **A cascade with surviving alternatives → the sheet.** Rule 9 forbids
  *confirmations*: asking "are you sure" about an act already decided. A sheet
  that asks *which of three priced motors* is not a confirmation — it is the
  act's own choosing, and there is no honest way to skip it. Pre-choosing for
  the person and toasting afterwards is exactly Dell's silent rewrite (the
  measured 1540/1541 module diff in `configurator-teardowns-2026.md`) with an
  apology attached.
- **A cascade with no surviving alternative → do it, and toast with UNDO.**
  One line removed, one thing to say, one act. This is the playbook's first
  branch and rule 9 applies cleanly. The by-value restore in
  `quotes.ts:585-628` is the pattern to copy.
- **After Accept on the sheet, raise the toast anyway.** The sheet is a
  decision about the future; the toast is a receipt for the past, and the two
  are not the same statement. This costs one `say()` call
  (`src/store/notes.ts:91-93`) and closes the gap Position B leaves — a person
  who accepted a sheet in a hurry still has 9 seconds and a named way back.

If instead Position A is taken absolutely, the honest consequence must be
written down: `PHASE_TWO.md` §2.4's radio group cannot be built, because a
toast cannot hold a choice, and §2.4 should be amended rather than left
disagreeing with `CONFIGURATOR.md` §C. **Two documents disagreeing is the state
this recommendation exists to end; whichever way it goes, one of them gets
edited.**

---

## The build, in order

Steps 1-4 are buildable today and testable without a cascade ever firing.
Step 5 is the wiring. Step 6 is the honest blocker.

1. **Give `Conflict` the alternatives it is specified to carry.**
   `src/features/quote/conflict.ts:119-136`. Add
   `alternatives?: Alternative[]` and `chosen?: string`, where
   `Alternative = { key: string; label: string; amount: number | null; note?: string; line?: QuoteLine }`.
   `key` matters: `Fix` (`:271-274`) has no identity, so a sheet can price a
   fix but cannot apply one. `Candidate.key` (`freeze.ts:515-546`) is the
   identity to reuse — `pair.rowId ?? row.id`, the same string `onQuote` is
   keyed on at `freeze.ts:1120-1124`. Optional fields, so `levelConflict` is
   untouched.

2. **Make `optionConflict` fill `changed` and `held`.** `conflict.ts:294-340`.
   Delete the literals at `:332-333`. Each `Removal` becomes a `held` row —
   `from = amount`, `to = null`, `why = because`, `fromColumn = where`. The
   asked-for line becomes one `changed` row, `from: null → to: asked.amount`.
   Keep `removals` in the return: it is the typed record and other surfaces may
   want it.

3. **Write `src/features/quote/conflict.test.ts` — the first test either
   builder has ever had.** Assert: `levelConflict` returns `null` on same-rung
   and on an empty quote (`:160-161`); a pinned line lands in `held` with
   "priced by hand at …" (`:186-189`); a table with no column for the rung
   lands in `held` with the two-branch sentence (`:196-205`); and
   `optionConflict`'s arithmetic at `:323` —
   `to = from − lost + asked + cheapest` — including the `cheapest === null`
   case where no alternative survives, which the header at `:285-286` says is a
   real answer.

4. **Draw the alternatives.** `QuoteBuild.tsx:1815-1910` gains a block between
   `held` (`:1889`) and `.qb-sheet-foot` (`:1891`): a `role="radiogroup"` with
   the cheapest checked, focus moving there instead of to `okRef`
   (`:1824-1828`). New classes into `src/features/quote/build.css` after
   `:2169`, using only the tokens already in that block. Run
   `node tools/check-styles.mjs` and `npm run check:contrast`.

5. **Wire the pick.** `QuoteBuild.tsx:1009-1015` is `take(c)` — today two
   lines, `removeLine` or `addLine`. It becomes the mirror of `askLevel`
   (`:396-407`): compute the conflict, `null` means just do it, otherwise
   `setProposal`. Two consequences: the proposal state at `:389` must become a
   discriminated union (`{ kind: 'level'; conflict; levelKey }` |
   `{ kind: 'option'; conflict; apply: () => void }`), and the accept branch at
   `:471-475` needs the second arm. `take` is inside `Shelf` and `proposal`
   lives in the page component, so the gate is a callback threaded down through
   `BandBlock` (`:437-445`) — the same route `onWeigh` already takes
   (`:377-386`, `:1002-1007`).

6. **Supply the three inputs `optionConflict` takes, and this is where it
   stops.** `onQuote: LineValues[]` needs each line's cells on the columns
   rules reach — `subjectRules.ts:203-262` (`placeRules`) already assembles
   exactly that field list and is the thing to reuse. `blocked` needs a
   `solve()` the build screen does not run, over constraints the seed does not
   emit (`seededRules.test.ts:346-361`). `fixes` can come from
   `offer.candidates` (`freeze.ts:1126-1149`) minus the removed keys — that
   part is available now.
   **So the channel stays dormant until one of two things is built:** a dealer
   writes a runnable rule, or the subject becomes changeable (`rootRowId`,
   written once at `freeze.ts:489`, would need a mutator and a re-freeze of
   every line). Neither is in scope here and both belong in `docs/BACKLOG.md`
   rather than assumed.

7. **Settle the undo question and edit the loser.** Either
   `docs/plan/CONFIGURATOR.md:113-114` gains the playbook's threshold, or
   `docs/plan/PHASE_TWO.md:497-513` loses the radio group. One of the two files
   changes; leaving both is the state this document exists to end.

---

## What could go wrong

- **Shipping a sheet nothing can open.** Steps 1-4 are real work on a surface
  that, on the seeded price file, will never appear. That is defensible — the
  same argument the file makes for itself at `conflict.ts:66-74` — but it must
  be said out loud in the commit, or the next person reads a drawn sheet as a
  working feature. `optionConflict` has been in the tree with zero callers
  already; a second dormant layer on top of it is a bigger claim.
- **Two accents on one sheet.** `.qb-sheet-ok` is the accent
  (`build.css:2234-2247`). A filled accent radio is a second, against
  DESIGN_PRINCIPLES rule 5 and the contract's "roughly four times a screen".
  Resolve it at `/design.html` before writing the CSS, not after.
- **The pre-selected alternative reads as a decision already made.** Porsche
  pre-selects and so does §2.4, but Porsche's committed total does not move
  until Accept and neither does ours. If the delta in the footer updates as the
  radio changes — and it should, or the arithmetic is hidden — then the number
  a person reads aloud has changed twice on one sheet. `QuoteBuild.tsx:1535-1538`
  already records this exact hazard for the price bar: "Two signed figures side
  by side with only one of them about the future is a person reading the wrong
  one aloud."
- **`break` after the first removal.** `conflict.ts:310` takes the first
  blocking cell per line. If two rules remove one line for two reasons, the
  sheet names one and the person fixes the other. PubGrub's answer is the chain
  (`explaining-a-refusal.md`); ours would be a cap and a count, like
  `NARROWING_CAP = 4` (`subjectRules.ts:135`).
- **Alternatives with no identity cannot be applied.** If step 1 is skipped and
  `Fix` is used as-is (`conflict.ts:271-274`, `{ label, amount }`), Accept has
  nothing to add to the quote and the sheet becomes a notification — which is
  the Dell behaviour the whole feature exists to refuse.
- **A cascade that fires during a search.** `stepOffer` reaches past the
  narrowing when `query` is non-empty (`freeze.ts:1099-1105`), and `take` is
  the same function for a card inside the shortlist and one outside it. A sheet
  opening over a half-typed search box is a full stop in the middle of somebody
  else's work. Untested, and untestable by the guards: there is no component
  test in the repo (CLAUDE.md — "112 test files, zero `.tsx`").
- **The URL undo target is specified and unbuilt.**
  `CONFIGURATOR_PLAYBOOK.md:364` wants `?quote=…&fix=…&from=…` so Cancel is a
  navigation and Back works. The proposal is React state
  (`QuoteBuild.tsx:389`), so today Back during an open sheet leaves the screen
  entirely. Building the sheet without this is fine; claiming the playbook's §5
  is satisfied is not.
