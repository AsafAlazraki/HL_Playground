# THE CONFIGURATOR PLAYBOOK
## HelmLogic Dynamic Config — building a rig, for a dealer, over a real price file

**What this is judged against.** A dealer at Northside Marine builds a quote in front of a customer, several times a day, over 15,691 rows across 51 tables. Every number on screen must be a number that exists in that file. Every option that is not offered must say, in that place, what measurement removed it. Nothing here proposes a rate, a markup or a fee the workbook does not state.

**The one sentence that makes this app different from every configurator in the research:** the solver records the reason at the moment of removal. `PartnerVerdict` already carries the banner, the marque it names, the series verdict and the floor reading (`{kind:'under', capacity, load}`). Porsche reconstructs a conflict server-side. Boston Whaler stores a string that goes stale the moment the block clears — I verified it: unlock the ski tow and its `data-include` still names the engine that was blocking it. Sea Ray's Sundancer 370 has seven constraint rules and all seven are *hides*. Here the removal and the reason are the same object, so the sentence cannot go stale and cannot be missing. **Everything below exists to spend that advantage.**

---

## 1 · THE FLOW MODEL

### The decision

**A hybrid: a linear spine that is a lens over a document, and a hub that is the document.** Free-roam is on from the first press. The spine is a reading order, never a gate.

This is not a compromise between wizard and free-roam. It is the shape the repo already committed to and the research independently arrived at from two directions:

- `steps.ts` derives `buildSteps(quote)` from the frozen quote itself — *"a step's state is therefore not state at all; it is a reading of a document that is already on disk."* The pick **is** the write. A refresh at stop 5 destroys nothing, which is the single most damaging friction production shipped.
- GOV.UK's check-answers page, the highest-evidenced pattern in the corpus, is *"a summary page listing every decision as label / value / Change"* where Change returns you to the summary rather than walking you onward. Here that page is not a recap of a wizard's state — it is the quote.

### Why not the alternatives

| Shape | Who ships it | Why it is wrong here |
|---|---|---|
| **Pure free-roam scroll** | Porsche: one page, ~9,700px, ~300 inputs, no progress at all | A dealer is not browsing a catalogue. The fan-out is data-scale — 2,519 pairings, 434 live trailers — and no amount of pinned search organises a space with real prerequisites. Porsche can afford it because a 911 has 11 groups; a rig has a hull that decides which trailers exist. |
| **Locked named-step wizard** | McLaren (9 steps), Malibu (11 steps), Infor/Bennington (server round-trip per step) | NN/g's own anti-cases are exactly this user: wizards fail on repeat use, when the user must compare across steps, and when an expert wants control. Production's stepper is a row of `<div>`s with no click handler — changing the hull colour from the summary is six presses of Back. |
| **Requirements-first funnel** | Bennington: FILTERS → SERIES → MODEL | Right for a consumer who does not know a model number. Wrong for a dealer who does. Keep the *idea* — it belongs in search, not in the quote. |
| **No configurator; a filtered list of pre-valid builds** | Rivian (inferred from routing) | Kills the differentiator outright. |

### The stops — six, and where each number comes from

| # | Stop | Source of the stop | What it decides |
|---|---|---|---|
| 1 | **The hull** | `SUBJECT_STEP` — exists in the repo | Nothing. It offers nothing and removes nothing. It is a stop because a person walking the sequence must be able to look at what they are configuring. |
| 2 | **Motor** | a view section | The motor, and — once a motor is chosen — the **rigging kit and prop**, as a second band inside the same stop. Rigging is a fact about the *(boat, motor)* pairing and belongs to neither side alone (FITMENT_RULES R5). It cannot be a stop of its own, because it cannot exist before stop 2 resolves, and a stepper that gains a step mid-flow is worse than no stepper. |
| 3 | **Trailer** | a view section | The trailer. The stop where the differentiator earns its keep: `selectPartners` admits by series banner, the ATM floor warns and never filters. |
| 4 | **Dealer-fitted** | a view section | Accessories and parts. Two price levels here and only here — `cash → Sell` and `fitted → Sell inc Install`. |
| 5 | **Customer & terms** | **fixed by the app** | The name, the price level, the tax statement, the reference day. The admin. |
| 6 | **Review** | **fixed by the app** | The quote. The hub. A peer in the rail, not a checkout. |

**Stops 2–4 are read, not authored.** A dealer whose file has no trailer table gets five stops. The count in the heading is the real count. It changes only when the view changes, which is a structural act with its own sentence and its own undo — *structure is never a side effect*.

**Two stops the sequence must gain** that `buildSteps` does not yet produce: 5 and 6. Everything else already exists.

### What a dealer needs that a consumer does not

1. **Speed over ceremony.** This is a 100+/day surface. Nothing keyboard-initiated animates. `/` focuses search from anywhere. `1`–`6` jump stops. `[` `]` page the spine. Every picker is type-ahead.
2. **Arriving mid-flow.** A dealer resumes somebody else's quote after lunch. The hub is the landing surface; the spine is entered from it, not before it.
3. **Editing later, without walking back.** Every line on the review has a Change that lands on its stop with the answer pre-selected and returns to the review. Not onward.
4. **An issued quote is a photograph.** *A quote given on Monday says the same number on Friday.* Editing an issued quote mints **version 2**; the rail says `Revising 1042 · v2` and the review carries a what-changed list. It never mutates the issued document.
5. **Price levels, chosen once.** `cash · trade · warranty` on a boat, `cash · trade` on a motor, `cash` on a trailer, `cash · fitted` on an accessory. One choice prices the whole quote; each line records both `levelKey` (asked) and `levelResolved` (what that table actually had).
6. **Tax stated, never computed.** Every figure in the seed is stored tax-inclusive. No 1.1 divisor, ever.
7. **Cost never leaks.** A quote surface never renders a `cost-build` band column and never sends one into a total. Hard exclusion by construction, not by column choice — the failure mode is a customer reading a dealer's buy price.
8. **No lead form.** No sign-in, no "contact dealer", no gate. This is local-first and the dealer *is* the dealer.

---

## 2 · THE STEP RAIL

### What it shows

A vertical rail, left, sticky, **236px** wide. Six rows plus nothing else. The whole spine is always visible — no hidden scrollbar, no auto-scrolling strip that shows four of nine (McLaren's, unchanged since Smashing flagged it in 2018).

**An open stop:**

```
  3   Trailer                              12 offered
```
Numeral in mono, tabular, `--ink-faint`. Title at the heading step (15px), sentence case, the dealer's own noun for the table. Right-aligned count in mono caption: what survives narrowing, not the catalogue size.

**A decided stop:**

```
  ✓   Trailer                                  6,480
      NSM Custom 5.6m tandem, braked
```
The numeral is **replaced by the tick** — Malibu's cheap progress signal, stolen whole. Remaining stops keep their numerals, so the rail reads as a spine that is being consumed. The second line is the answer, clamped to two lines with the full text in the DOM, never truncated mid-word. The amount is mono, tabular, right-aligned, and every amount in the rail aligns on the decimal with every other.

**A multi-line stop:**

```
  ✓   Dealer-fitted                             4,318
      7 lines · 2 not priced
```

**A declined stop** — the null is a real answer, not an absence:

```
  ✓   Trailer                                       —
      No trailer
```
`No trailer` and *not yet chosen* are different facts and a quote must never confuse them.

**A stop carrying a held-back count:**

```
  3   Trailer                              12 offered
      2 held back
```
Held back is supply, not rules. It is caption weight, in `--ink-faint` on untinted ground. It is not a warning colour. Kind colour is an eighth-note.

**The current stop:** `aria-current="step"`, a 3px `--blue` rail on the leading edge. That is one of the roughly four accent appearances the screen is allowed.

**No progress bar. No percentage. No completion meter.** GOV.UK removed a 12-step indicator from Carer's Allowance and measured no change in completion rate or completion time. NN/g recommend a count over a percentage where duration is uncertain. W3C requires an animated `<progress>` to have its animation disabled to satisfy 2.2.2. A count in the heading is the whole budget.

### The heading and the title

```html
<title>Trailer (3 of 6) — Quote 1042 — HelmLogic</title>
<h1>Trailer <span class="qb-step-of">3 of 6</span></h1>
```
Position lives in the page title, the H1 and `aria-current` — W3C's technique, and it means the tab, the history entry and any bookmark carry the position for free.

### Jumping back

- Every row is a link, always, forward and back. Nothing is ever gated.
- Focus moves to the new `<h1>` (`tabindex="-1"`). Not `aria-live` — that leaves keyboard focus stranded on a control that no longer exists.
- **The jump does not animate.** Keyboard-initiated, 100+/day. It is outside the motion budget by rule.
- The forward control **names its destination**: `Next: Trailer`, never `Next`. When you arrived from the review, it reads `Back to the quote` instead, and it goes there — GOV.UK's rule, and the thing that makes a hub a hub.
- `Previous` is genuinely disabled on stop 1 rather than dead-ending.
- A real in-page Back link on every stop, restoring the previous stop's last-viewed state including scroll position and any expanded band. Users demonstrably distrust browser Back while entering data.

### At 1280px

Rail 236 + gutter 24 = 260. Stage 1020 less 2×24 page padding = 972 usable. That gives:

- Option rows full width at 972 — which is the right call, because a row carries name, two measured columns, a price and a reason line, and none of those should wrap at the dealer's own width.
- Swatch grids (hull colour, upholstery, canvas): 5 columns of 180 with `--sp-3` gutters.
- The stage bar spans 972 and never truncates its captions. Porsche's sticky bar reads `Calculate monthly pay…` and `All information is s…` at full desktop width — the two lines that qualify the two most consequential numbers on the page, both clipped. That is the anti-pattern.

**Below 1120px** the rail becomes a single horizontal strip of six chips, all visible, no horizontal scroll, decided chips carrying a tick and their answer as a caption underneath. Six short chips fit. If a project ever produces nine stops, the strip wraps to two rows — it never scrolls with its scrollbar hidden.

---

## 3 · THE CHOICE SURFACE

### Rows, not cards

Anything carrying a figure is a **40px row**. This is a table app and a trailer list is a table: name, ATM, price. Cards are only for choices that are genuinely visual — hull colour, upholstery, canvas — and then they are a swatch grid, not a card deck with paragraphs in it.

McLaren's card-with-a-paragraph exists because McLaren shows no price and the prose has to carry all the persuasion. There is a price here, and the dealer knows the product better than the copy would.

### Four bands, always in this order

```
OFFERED                                              12
NOT OFFERED                                         422
UNCHECKED                                            10
HELD BACK                                             2
```

Band captions are the 11px uppercase label style — the one place uppercase is allowed. Table names and row labels keep their own case, always. `PVC` uppercased cannot be told from a value the dealer typed as `Pvc`, and those are different facts about their data.

1. **OFFERED** — `result.selected`. Ordered by the star the price file carries, then the file's own order. **Never re-sorted by price behind the dealer's back.**
2. **NOT OFFERED** — `result.rejected`. Still visible, still priced, still legible at 4.5:1, each carrying its reason (§5). Collapsed to a count above six rows with a disclosure; expanding holds scroll position on the row above.
3. **UNCHECKED** — `series: 'unnamed'`. The third state, and it is *not* a rejection: the business itself puts ten live Stabicraft offerings on a GFAB series whose banner names no brand. Caption sentence: *"The price file does not say which boat brand these are built for. They are offered, unchecked."* **No researched configurator has this state.** Every one of them collapses "we don't know" into "no".
4. **HELD BACK** — `heldBack.retiredRows` + `heldBack.discontinued`. Availability, not compatibility. Never shares a word, a colour or a pill with a refusal.

### Group headings

The heading is the dealer's own table name in its own case, plus the count, plus — on the next line — the current answer. Porsche and McLaren both do this and it costs one line to remove all doubt about which row is live.

```
NSM Custom Trailers                            12 of 434
NSM Custom 5.6m tandem, braked                     6,480
```

### Selection

**Outline, never border.** `outline: 2px solid var(--blue); outline-offset: 2px; border-radius: var(--radius-sm)`. Outlines take no part in layout, so nothing reflows when selection moves. **Hover uses the same treatment at reduced alpha**, so hovering previews selection — Porsche's move, and the cheapest legibility win in the corpus.

A selected row reads: tick in the leading gutter · name at `--ink` · the measured columns · the amount in mono aligned with every other amount · and, where the file recommends it, a "why" line: *"Starred on the price file"* or *"The only series built for Highfield."* Never a marketing sentence.

The accessible name carries the price: `aria-label="NSM Custom 5.6m tandem, braked. 6,480."` A screen-reader user gets name and cost in one utterance.

### Deselection

Every single-select group whose null is legal opens with a real row:

```
○  No trailer
```

Malibu's `NO TRAILER` radio, Brunswick's `Remove Selection`, Infor's `None` as a selectable value — all three independently arrived at it, and all three are right. Declined and undecided must be distinguishable on a document a customer signs.

### Comparison

Lives **inside the group it compares** (Porsche's `Compare seats`, `Compare headlights` — never a separate tool). A checkbox in each row's leading gutter; a compare bar appears at two ticks; it opens a side-by-side of the columns the price file actually carries for that table. It is a table. The app draws tables.

### Long lists

- Search pinned above the bands; `/` focuses it from anywhere outside a text field. It collapses to a magnifier in the stage bar once scrolled past.
- Filters within the current stop only.
- Result count announced in an sr-only live region.
- **Reason lines are never virtualised away.** A 422-row NOT OFFERED band that drops its sentences under scroll is a hidden refusal with extra steps.
- **Never reorder on selection.** The dealer is mid-scan.

### When one option remains

Render it as a sentence, not a control:

> **Trailer** — NSM Custom 5.6m tandem, braked. The only trailer in a series built for Highfield. `See the 422 that are not` `Change`

A select with one live entry among greyed ones reads as broken. This turns a dead control into an explanation.

### The reserved sub-line

Every row reserves its 16px second line whether or not it has a reason. A short reason must not collapse the row and a long one must not shift the row below it. McLaren reserves 40px for the same purpose and it is the only thing in that skin worth copying verbatim.

---

## 4 · THE PRICE

### Where it lives

A persistent **stage bar** across the top of the configurator, on every stop including the review. Never a floating footer — a footer covers the last row of a list, and the last row of a list is where the cheapest trailer usually is.

```
Cash ▾   │   84,310                              Review the quote →
             incl. tax · 2 lines not priced
```

- The level chip, left of the rule.
- The total in **IBM Plex Mono, 20px, tabular, right-aligned**, decimal-aligned with the review's own amount column.
- A caption underneath that is **never truncated**. It carries two facts: the tax statement, and the unpriced count when there is one.
- `<output aria-live="polite">` so a screen-reader user hears the new total without interruption.

### What it shows

**Inclusive of tax, and it says so.** Every figure in the seed is stored tax-inclusive — `Motor Library!BB` is literally named *RRP + Freight Inc GST*. So the total is inclusive by construction.

An **ex-tax line appears only when the project carries a tax rate as a fact**, and then the document names the rate it used. Where the project states no rate, the review says:

> This file does not state a tax rate. The total is what the price file's figures are.

That is a refusal sentence about pricing and it is the right answer. The alternative — a hardcoded 1.1 divisor — is inventing pricing policy from memory of a spreadsheet, which is the failure this whole build exists to end.

### Price level

One control, on stop 5, echoed as a chip in the stage bar. Changing it re-reads every line. Where a table lacks the chosen key, the line prices at its first level and **says so in the line**:

> Trailer priced at **Cash** — this table has no Trade level.

### Deltas

**Absolute price on every row. Never `+$`.** Tesla, Polestar and Lucid all agree on absolutes; the marine tools use delta-from-standard, which works for a factory option list and breaks the moment a dealer is reading a price file where the number *is* the number.

**The delta appears once, in the toast, at the moment of the act:**

> Trailer added — NSM Custom 5.6m tandem, 6,480. Total 84,310.  `UNDO`

No lingering badge, no green flash, no `+$` chip on the row. A delta is a transient fact about an act, and acts get toasts here.

The review carries a running increment line so the arithmetic is never the dealer's to do:

```
9 lines added                                    18,240
```

### How it updates

Instantly, silently, in place, beside the control that caused it. No Update button. No jump to the top to find out what happened.

**The money never animates.** Every site in the research agrees, including both of the two that show a price: Porsche's total simply becomes `$139,430`, Polestar's carries no transition at all. Motion on money reads as a slot machine. The press state on the row (90ms, on pointer-down) is the only feedback, and it arrives before the recompute does.

### The unpriced rule

This is the repo's own and it is the one nobody in the research gets right.

1. **A line with no price is never rendered as `0`.** `amount: number | null`. The Brazil SLX 260 renders `$0*` as the total of a $200,000 boat because its price-hiding flag suppresses values but not containers. Suppress the row, not the number.
2. **The stop counts them.** `unpriced` on the step: *"2 lines carry no price."*
3. **The total is still shown, and it is labelled.** `84,310 — 2 lines not priced`. A total that silently omits lines is a lie; a total that refuses to appear is useless.
4. **The review shows the empty cell and a person's field beside it.** Where the workbook states no figure, the field is a person's and the page says so out loud.
5. **No regex ever guesses which column is the price.** A table without `priceLevels` is not priced, and the surface says so by name: *"Northside Parts has no price column set. Set one on the table, or type an amount."*
6. **Three non-numeric price states, all first-class, none of them `$0`:** `Included` (the file says it comes with), `No price` (the file names no figure), `—` (declined). Tesla, Polestar and Lucid all write `Included` where `$0` would go: same fact, opposite feeling, zero extra layout.
7. **Cost bands never render and never total.** By construction.

### Finance

If it ever lands: behind the total, not beside it (Boston Whaler's header price is a button that opens a calculator). It does not recompute on keystroke. **It never replaces the cash total** — that substitution is the classic vehicle-configurator dark pattern and it destroys the dealer's ability to compare.

---

## 5 · REFUSALS — the differentiator

### What the field actually does

| Tool | Behaviour when an option cannot be taken | Verdict |
|---|---|---|
| **Sea Ray Sundancer 370** ($892,400 boat) | 7 constraint rules, **all 7 are `hide`**. Choose a black hull, the black boot stripe silently ceases to exist. | The buyer never learns the option existed. |
| **McLaren 750S** | Enabling TRACK BRAKE UPGRADE removed 5 caliper colours, added 1 new one, and **silently swapped the already-chosen finish**. No dialog, banner, toast, greying, tooltip or mark in the summary. The rail reflowed under the cursor. | The worst behaviour observed anywhere. |
| **Bennington / Infor** | Choosing Q Series pruned the LINE list 11 → 3. No count, no banner, no undo. And a required MODEL dropdown containing exactly one empty `<option>` — a mandatory field with zero valid values and no message. | A dead end on an enterprise CPQ. |
| **Ford** | Two dedicated disabled tokens — `disabled:text-ford-text-subtlest-disabled`, `disabled:bg-ford-fill-disabled`. Greying is a designed, first-class state. | Dimming is what you do when you have given up on explaining. |
| **Tesla / Lucid** | **Zero** `[disabled]` or `[aria-disabled]` nodes. The option space is orthogonal, so no combination can conflict. | The best refusal UI is a product decision — unavailable to us, because our constraints are physical. |
| **Polestar** | *"Only available with Performance pack"* — 8 instances, 16px, sentence case, `rgba(0,0,0,0.6)` on white (~5.7:1), card at `opacity: 1`, `pointer-events: auto`, no `disabled` attribute. | The best precondition copy in the corpus. Names what unlocks it. |
| **Boston Whaler** | Names the specific blocker in the card: `data-include="Option Not Available 75 ELPT EFI Black FourStroke Mercury engine"`. Distinguishes *"Temporarily unavailable"* from *"Option Not Available"*. | Best in marine — and three steps short. |
| **Porsche** | A routed flyout: *"Your build will be adjusted."* → the option you wanted with its price → **Required selection** with the cheapest fix pre-selected and every alternative priced → footer: `Total price change +$2,480`. Committed total never moves until Accept. | The one to beat. |

Whaler's three failures are the whole opportunity: **the reason is inside a collapsed accordion**; **the rule never offers the fix** (it knows the 90 ELPT unlocks the ski tow and will not say so); and **the message goes stale** — after I unlocked it, the attribute still named the engine that had been blocking it.

### The refusal sentence

One sentence. In the row. On its second line. Body step, 14px, `--ink-soft` (7.7:1) on untinted ground. Never a tooltip, never a modal, never a collapsed accordion, never the top of the page, never the summary.

**The form: `Not offered — [the file's fact about this option], [the file's fact about this rig].`**

Both measurements. Both sides. From the solver's own verdict object, rendered live — never a stored string, which is why it cannot go stale.

Written out, against the real solver:

| Verdict | The sentence |
|---|---|
| `series: 'built-for-another'` | **Not offered** — this trailer's series is built for Stacer. This hull is a Highfield. |
| `floor: {kind:'under', capacity, load}` | **Over the rating** — rated to 1,250 kg. This rig weighs 1,410 kg. *(Still offered. The floor warns and never filters.)* |
| `floor: {kind:'not-evaluable', why}` | **Unchecked** — NSM Custom leaves Rated ATM empty on this row, so nothing was checked. |
| `series: 'unnamed'` | **Unchecked** — the price file does not say which boat brand this series is built for. |
| `heldBack.discontinued` | **Discontinued** — in the price file, not in stock. |
| `heldBack.retiredRows` | **Retired** — on a table that is history rather than stock. |
| no `priceLevels` | **No price** — Northside Parts has no price column set. |

### Five kinds, five words, five remedies

They never share a word, a colour or a pill. This is the distinction Whaler alone half-makes and everyone else destroys.

| Kind | Word | What it is | What the dealer does |
|---|---|---|---|
| Rule | **Not offered** | a constraint from the price file rejected it | change the named choice — the fix is offered and priced |
| Bound | **Over the rating** | a measured limit is breached; **nothing was removed** | proceed knowingly, or change the rig |
| Missing data | **Unchecked** | the column needed to check it is empty | it is offered; the missing column is named |
| Supply | **Discontinued** / **Retired** | stock, not rules | a phone call, not a UI problem |
| Money | **No price** | no price column on that table | set one, or type an amount |

### The fix — the thing nobody ships

The solver knows the minimal change. Say it, priced, as a link inside the sentence:

> **Not offered** — this trailer's series is built for Stacer. This hull is a Highfield.
> `Change the hull to a Stacer 449 Outlaw (−4,120)` · `See the 12 built for Highfield`

Where several minimal repairs exist, offer **at most two**: the cheapest, and the one that touches the fewest already-decided stops. This is FastDiag's preferred minimal diagnosis with a price attached to it. Never enumerate all of them — that reproduces the problem the refusal was supposed to solve.

### Applying a fix

**One decided stop touched, and reversible → no sheet.** Apply it. Toast with UNDO, naming the item and the amount. Rule 9: if it is undoable it gets a toast, not a dialog. Not one configurator in the research has this, and Brunswick has the toast keyframes sitting unused in its stylesheet.

**Two or more decided stops touched, or a line the dealer chose is removed → a sheet.** Porsche's shape, stripped of the theatre:

```
Your quote will change.
Adding the tandem axle needs a heavier tow hitch.

WHAT YOU ASKED FOR
  NSM Custom 5.6m tandem, braked                        6,480

WHAT CHANGES
  Removed   NSM Custom 4.8m single                     −4,240
  Added     Hitch kit, 2,000 kg                           +610
  Repriced  Rigging, tandem                     1,180 → 1,340

  Apply    Leave it              Change to the total   +2,690
```

- The **committed total on the stage bar does not move** while the sheet is open. Proposed cost and committed cost are two different numbers in two different places.
- **The undo target is in the URL**: `?quote=1042&fix=<verdictId>&from=<lineIds>`. Cancel is a navigation. Back and refresh both work. The sheet is bookmarkable and pasteable into a message to a colleague.
- The arithmetic is shown, not hidden. `+2,690` is `6,480 − 4,240 + 610 + 160`, and every term is on screen.

### Markup, and the contrast trap

- `aria-disabled="true"` — **never** the `disabled` attribute. The row keeps its place in tab order, keeps its price, and activating it re-announces the reason and moves focus to the fix link. Baymard found users seldom notice a disabled element or grasp the concept at all.
- `aria-describedby` → the visible reason line.
- **The refused row clears 4.5:1.** Not `opacity: 0.4` (Porsche's locked standard equipment). Not `--fg-quaternary` (2.8:1 — *may never carry meaning*). Not `--ink-faint` over a tint (4.26:1 — the exact mistake caught during the redesign). The reason sits at `--ink-soft` on the plain surface. **The reason nobody notices a greyed option is precisely that it is greyed below the legibility threshold, so the accessibility fix and the usability fix are the same fix.**

### Never hide

If a rule prunes the list, the band header says so, says how many, and says which choice did it:

```
NOT OFFERED                                                 422
Built for another brand. This hull is a Highfield.   Change the hull
```

`422 of 434` is not a failure to be embarrassed by. It is the number a dealer quotes down the phone.

---

## 6 · MOTION

Budget: press 90–160ms · popovers 125–200ms · modals and drawers 200–500ms · **transform and opacity only** · never on a keyboard-initiated or 100+/day action. Tokens exist: `--d-press: 90ms`, `--d-fast: 120ms`, `--d-med: 180ms`, `--d-slow: 260ms`, `--ease: cubic-bezier(0.2,0.8,0.2,1)`, `--ease-in-out: cubic-bezier(0.4,0,0.2,1)`, `--spring-ui-*` (bounce 0, 0.35s), `--spring-momentum-*` (bounce 0.2, 0.4s).

| Moment | What moves | Property | Duration | Easing | Note |
|---|---|---|---|---|---|
| Option row press | background darkens | `background` | 90ms `--d-press` | `--ease` | **Pointer-down.** A row never scales — its neighbours would look like they moved. |
| Control / button press | scale to 0.97 | `transform` | 90ms | `--ease` | Pointer-down. |
| Swatch card press | scale to 0.994, hover lift lost | `transform, box-shadow` | 90ms | `--ease` | 0.97 on a 236px card is a 7px shrink and reads as a glitch. |
| Selection ring arrives | outline transparent → `--blue` | `outline-color` | 120ms `--d-fast` | `--ease` | Outline, never border. Nothing reflows. |
| Hover on an option row | background + outline at reduced alpha | `background, outline-color` | 120ms | `--ease` | Hover previews selection. |
| Focus ring | — | — | **0ms** | — | A focus ring that fades in arrives after you have already looked. |
| Reason line appears | fade in | `opacity` | 120ms | `--ease` | Fade only, no slide. It must feel like it was already true. |
| NOT OFFERED band expands | contents fade in | `opacity` | 120ms | `--ease` | **The box does not animate its size** — height is a layout property. Scroll position above it is held. |
| Toast in | translateY 8→0 + fade | `transform, opacity` | 180ms `--d-med` | `--ease` | |
| Toast out | translateY 0→4 + fade | `transform, opacity` | 120ms | `--ease-in-out` | |
| Compare bar / popover | translateY 4→0 + fade | `transform, opacity` | 180ms | `--ease` | Inside the 125–200 band. |
| Counter-offer sheet | translateX 100%→0 + fade | `transform, opacity` | 260ms `--d-slow` | `--ease` | Inside the 200–500 drawer band. Scrim fades on the same curve, same duration — **no blur.** Glass is retired; `--mat-*-blur` is `0px`. |
| Boat photograph swaps | crossfade | `opacity` | 180ms | `--ease` | The product may move slower than the UI, but not here — this fires on every quote open. |
| Dragging a line on the review | position | spring `--spring-ui-*` | 0.35s, bounce 0 | — | Animate from the presentation value; hand release velocity to the spring; never lock out input. |

### What must not move

- **The total.** No count-up, no odometer, no flash, no lingering `+$`. Universal across the research, including both sites that show a price.
- **A stop jump.** Keyboard-initiated, 100+/day. Focus moves; nothing slides. No direction cue.
- **The rail's current marker.** It updates; it does not travel. (If it ever should travel, it must be one element positioned over the rail — McLaren's per-item `::after` physically cannot move, which is why it cuts.)
- **Option rows when availability changes.** No reorder, no reflow theatre, no items flying into new positions. Brunswick gets this right by accident and it is the one thing to keep from it.
- **A refusal.** The state and its sentence land in the same frame. Nobody watches their choice being taken away, and an animated delay before the explanation is the worst possible ordering.
- **Progress.** There is no bar to fill.
- **The review page.** It is a reading surface. Nothing on it animates but the toast.
- **The solver.** It is local and sub-second: **no spinner** (NN/g: nothing under 1s). If it ever exceeds 1s that is a performance bug — `readMarques` took 8.8s once and two memos fixed it. The precedent is in the repo, not in a spinner.
- **Under `prefers-reduced-motion`:** transforms go, opacity and colour stay. Gentler feedback, not no feedback.

---

## 7 · THE TWENTY MECHANICS, RANKED

| # | Mechanic | Source | How it works here | Effort |
|---|---|---|---|---|
| 1 | **The refusal sentence: both measurements, and the priced fix** | Porsche's feasibility sheet + Whaler's named blocker + FastDiag | Render `PartnerVerdict` / `FloorVerdict` live in the row's second line. Never a stored string. At most two fixes: cheapest, and fewest decided stops touched. | M |
| 2 | **Five refusal kinds, five words, never one grey pill** | Boston Whaler (the only tool separating supply from rules) | Rule / Bound / Unchecked / Supply / Money. Distinct word, distinct treatment, distinct remedy. | S |
| 3 | **`aria-disabled` + adjacent visible reason at 4.5:1** | NN/g, Baymard, Smashing, Axess Lab | Replaces native `disabled` everywhere in the configurator. Row stays focusable, priced, legible. | S |
| 4 | **Never hide; count and attribute the removal** | Inverse of Sea Ray (7/7 hides), Bennington (11→3 silent) | Band header carries the count and the choice that caused it, with a Change link. | S |
| 5 | **UNDO toast on every rule-driven change, item and amount named** | Repo rule 9. **Shipped by nobody** — Brunswick has the keyframes and never fires them | *"Rigging swapped to tandem kit · +160. UNDO."* Never a dialog for anything reversible. | M |
| 6 | **Check-answers hub: per-line Change that returns to the hub** | GOV.UK | The review is the quote. Change lands on the stop with the answer pre-selected; Continue reads *Back to the quote*. | M |
| 7 | **Don't commit until Apply** | Porsche (committed total held at $139,430 while the sheet swung +$2,480 → +$5,690) | Stage-bar total frozen while the counter-offer sheet is open. Proposed and committed are two numbers in two places. | M |
| 8 | **The undo target in the URL** | Porsche's `feas-return=` | `?quote=&fix=&from=`. Cancel is a navigation. Back, refresh and paste-to-a-colleague all work for free. | M |
| 9 | **The closed stop states its own answer and its amount** | Lucid (`Color / Abyss Black`, `Options / 7 Selected`) | The rail is the summary. No second recap panel is ever built. | S |
| 10 | **The tick replaces the numeral on a decided stop** | Malibu | Cheap, legible progress with no progress bar. | S |
| 11 | **Never animate money** | Universal — Porsche, Tesla, Polestar, Lucid, Brunswick | `<output aria-live="polite">`. The number becomes the new number. | S |
| 12 | **Absolute price on the row; the delta only in the toast** | Tesla/Polestar/Lucid absolutes + repo rule 9 | No `+$` badge survives the act that caused it. | S |
| 13 | **Three non-numeric price states, never `$0`** | Tesla/Polestar/Lucid `Included` + repo's `amount: number \| null` | `Included` · `No price` · `—` (declined). The Brazil SLX 260 prints `$0*` for a $200k boat; suppress the row, not the number. | S |
| 14 | **The null choice as a real row** | Malibu `NO TRAILER`, Brunswick `Remove Selection`, Infor `None` | Declined and undecided are different facts on a signed document. | S |
| 15 | **An itemised review that proves the total** | Polestar's price specification | Every choice echoed by name with its own line, including the free ones; a running *"9 lines added · 18,240"*; the closing total labelled. | M |
| 16 | **Three-state bound banner, including the resolved state** | Porsche's weight limit (`warning` / `exceeded` / **`met`**) | One sentence skeleton: *"This rig: 1,410 kg \| Rated: 1,250 kg."* **Confirming recovery is the half everyone forgets.** | S |
| 17 | **Selection is an outline; hover previews selection** | Porsche | `outline: 2px; outline-offset: 2px; 120ms`. Nothing reflows when selection moves. | S |
| 18 | **Search inside the long list, count announced** | Porsche (`Search equipment options`, collapses to a magnifier, sr-only `0 hits`) | `/` from anywhere. Filters within the stop. Reason lines never virtualised away. | S |
| 19 | **A fulfilment tag on every line: factory-fitted vs dealer-fitted** | Boston Whaler — **no automotive equivalent** | It determines what is still changeable after the order, and it is a first-class field, not a parenthetical. | M |
| 20 | **Options move a measured number, not just a price** | Grady-White (top speed, GPH, MPG per engine) + Whaler's SPECS envelope | Rig weight against rated ATM, live, as options land — and any other bound the file actually carries. Only where the column exists; never a computed guess. | L |

**Deliberately not in the twenty, and why.** *Price the group, not the item* (Porsche's `Dreams $1,580`) — right only where the file itself bands prices, and the Northside seed does not; inventing bands is inventing pricing. *Camera bound to the step* (McLaren, Malibu) — there is no render pipeline and there should not be one. *QR share code* (McLaren) — the dealer and the customer are at the same counter. *Payment mode as a global lens* (Tesla) — this is the price-level control, already covered, and finance is not in scope.

---

## 8 · WHAT TO REJECT

**A 3D stage, and a camera bound to the step.** McLaren's cold preload was **~90 seconds** of a spinner before the first pixel of product — 156 images and 21 binary payloads — and its loader displayed `00%` while the arc had already swept most of a revolution. A dealer opens this many times a day in front of a customer. The photograph the price file already carries is the picture.

**Marketing prose in the option row.** McLaren swaps in a paragraph per selection because it shows no price and the copy has to do the persuading. There is a price here, and the dealer knows the product. *The outgoing build wrote door captions as ad copy and it read as a brochure, not a tool.*

**No price anywhere.** Malibu's eleven-step builder produces a fifty-line summary with **not one dollar sign in the DOM**. Grady-White and Formula the same. An hour of work ending in "contact your dealer" is a lead form wearing a configurator's clothes — and this user *is* the dealer.

**A progress percentage, or an animated bar.** GOV.UK measured no change removing a 12-step indicator. NN/g prefer counts. W3C requires the animation disabled for 2.2.2. Three independent reasons and no counter-evidence: the *"300% more conversions from multi-step forms"* claim traces exclusively to form-vendor marketing blogs whose numbers contradict each other.

**Hiding navigation to show the product.** McLaren's ☰ toggles the entire option panel off. Flagged in 2018, unchanged in 2026.

**A step rail that shows half its steps.** Nine steps in a horizontally scrolling strip with `scrollbar-width: none`, four visible at 1422px, no indication of which you have touched.

**Locked sequential order after the first pass.** NN/g's own anti-cases are this exact user: repeat use, comparison across steps, an expert wanting control.

**Greying out with no reason.** Ford maintains two dedicated disabled tokens — one for text, one for fill — and has the largest, most confusing option space of anyone surveyed. Dimming is what you do when you have given up on explaining.

**A confirmation dialog for anything reversible.** Every confirm sheet is a full stop in the middle of somebody's work.

**A gate before the tool.** Ford's *"Choose Your Path"* fork demands a decision before a single price is visible, and every deep link bounces back to it. Rivian bounces a configurator route to `/auth/login`.

**Splitting the visual tool from the pricing tool.** Bennington publishes a comparison table telling you which to use — 3D on one side, prices on the other. That table is a confession.

**A server round-trip per selection.** Infor's `/session/{id}/pages/{guid}` makes every choice a page load. Local-first is the product.

**A price-hiding flag that suppresses values but not containers.** `$0*` on a $200,000 boat.

**Fusing independent dimensions into one radio.** Engine colour at $10,900 buried inside a propulsion package means a 2×2 is hand-maintained as four rows and the buyer cannot see that the colour is what costs.

**A whole-build preset that spends $40,000 in one click.** Malibu's *Commonly Equipped* is right for a consumer choosing between two packages. A dealer's starting point is a customer conversation. The recommendation belongs per-stop, as the star the price file already carries — and it is a suggestion, not a preselection.

**Subtractive framing chosen for revenue.** Park, Jun & MacInnis showed deleting from a loaded build retains more options and raises the total; Levav et al. showed attribute order changes both the design chosen and the price paid, via default acceptance. Both are real commercial levers. If anyone wants them, write it down as a commercial choice, so nobody later mistakes it for a usability finding.

**A monthly payment replacing the cash total.**

**A summary that lists what you did not choose.** McLaren prints `BLACK PACK: No`, `ASHTRAY: No`, `HOMELINK: No` — burying ~15 real decisions in ~50 rows.

**Truncated captions under the money.** `Calculate monthly pay…` and `All information is s…`, at full desktop width, on the two most consequential numbers on the page.

**Uppercase on a name or a value.** Allowed on section captions, group captions and mono stamps. That is the list.

**Inventing any figure.** No 29% markup, no $159 labour rate, no 10% divisor, no 20% deposit, no 2% trade discount. Every one of those is a real number in the Master Price File and not one of them is a column in the data. If it cannot be counted from the file, it is not shown.

---

### The receipt

Everything asserted about the solver here is in `src/features/constraints/trailerFitment.ts` — `SeriesVerdict`, `PartnerVerdict`, `FloorVerdict`, `FitmentResult.rejected` / `.unnamed` / `.floorWarnings` / `.heldBack`. Everything asserted about the step sequence is in `src/features/quote/steps.ts` — `SUBJECT_STEP`, `StepState`, `BuildStep.amount: number | null`, `BuildStep.unpriced`. Everything asserted about price levels is in `src/features/quote/pricing.ts` and `QUOTE_SPEC.md` §8.2. Motion tokens are `ds.css` lines 382–387; type steps 277–322; the ink ramp is `DESIGN_PRINCIPLES.md` §1.

The two things no guard will catch: **the 4.5:1 on a refused row**, which has to be measured in a browser by a person, and **whether the refusal sentence is true**, which has to be read by someone who knows the boats.