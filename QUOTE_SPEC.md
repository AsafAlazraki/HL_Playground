# THE QUOTE — a rig, a customer, and a moment

> *"the flow of the quotes is important"*
> *"i can't stress enough how easy this system has to be to use"*

Everything below is judged against those two sentences, and against one more
that is not the user's but is the reason this feature can go wrong in a way no
screenshot reveals:

> **A quote given to a customer on Monday must say the same number on Friday.**

This document decides eight things. Where it decides against the obvious
answer, the reason is given and the receipt is cited — either a cell in the
Master Price File, a line in the production HelmLogic source, or a file in this
repo. Nothing in this spec proposes a rate, a margin, a fee or a policy that
the workbook does not already state. Where the workbook states none, the field
is a person's and the page says so out loud.

---

## 1. What a quote is here

**A quote is one row of one table, the things a person chose to go with it, the
price each of those things carried on the day, and a customer's name — written
down once and never recomputed.**

The view page is already a configured rig. It draws one boat and, per related
table, the rows that go with it, in the order a person put them in, with a star
on the recommended one and a photograph at the top. `docs/specs/VIEW_SPEC.md`
says the quiet part outright: it is *"the page a salesperson lives on, and the
thing a quote is built from"*, and `model.ts` calls a `view` role *"the
sellable, quotable combination"*. So the configuration problem is solved. What a
quote adds is exactly three things the view page must never have:

1. **a customer** — a name, because a document without an addressee is a
   catalogue page;
2. **a price level** — the workbook's `Sales Type` (`Quote Sheet!AA11`, driving
   `Managers View` `HLOOKUP($D$39,$E$39:$K$59,n,0)`), which decides which
   stored column each line's number is read from;
3. **a moment** — the instant every number stopped moving.

### Should a quote just be the view page in a different mode? No — and the
### reason is the third item, not the first two.

Fewer concepts is right, and this spec adds exactly one to the user's head
(Table · Row · Join · View page · Business rule · Work-out-what-fits · **Quote**
— seven). But a mode is a *lens on live data*, and a quote is *a photograph*.
The view page reads `rowsByEntity` on every render; that is its whole virtue —
change a price in the grid and the page is right immediately. A quote must have
the opposite property. Production built the quote as a lens and it re-derives
every band from the snapshot on every render (`proposal-view.tsx:327-402`), a
second time in the PDF, a third time in `quote-financials.ts`, a fourth in the
finalize payload, a fifth in the running total — *five summations of one deal,
which already disagree about rounding and cost fallbacks*. That is not a bug
they failed to fix; it is what "a quote is a mode" becomes after eighteen
months.

So the decision is:

> **The view page mints the quote. The quote is then a separate document made
> of frozen lines, and nothing on it reads a base table again.**

The salesperson never configures twice. Pressing one control on the view stage
carries the curated menu — the star, the order, the rigging kit and prop
sitting on the join row — straight onto a document. Corrections happen **on the
quote**, where the total is visible and moves as you work, not back on the
catalogue page where it is not.

### What is deliberately NOT changed

`src/features/views/` gains no quote mode, no tick column and no price column.
Two reasons. First, the view page's read mode is specified as *"completely
clean — no handles, no chrome, no affordances"* and *"beautiful enough to show a
customer"*; a price and a checkbox on every row is precisely the chrome that
sentence forbids. Second, `defaultColumns()` ranks `number` at weight 0 and
`formatCell`'s `MONEY` regex matches `cost|price|cash|rrp|sell|trade|…`, so the
first money column a boat or motor block would print is **`Dealer List Price`**
or **`Base Cost`** — the dealer's buy price, formatted as `$1,308`, in front of
whoever is looking. A quote must never inherit that guess. It reads its price
from a **named** column (§8.2), never from a regex.

---

## 2. The price ladder, exactly

The workbook runs a real ladder from landed cost to a sell price. We hold part
of it as data and most of it not at all. This section states the whole ladder,
cell by cell, and then states — rung by rung — whether the quote **computes**
it, **reads** it, or **leaves it for a person**.

### 2.1 The one rule that governs every rung

> If the number is not a column in the project's own data, the quote does not
> produce it.

No exception, and in particular no exception for the numbers that "everybody
knows": no 29% BMT markup, no $159 labour rate, no 10% GST divisor, no 20%
deposit, no 2% trade discount on trailers. Every one of those is a real figure
in the Master Price File and **not one of them is a column in
`src/demos/northside.ts`**. Reproducing them here would be inventing pricing
policy from memory of a spreadsheet, which is the failure this whole build
exists to end.

### 2.2 Stage A — cost. In the data. Never on a quote.

| Rung | Workbook | Our column |
|---|---|---|
| Base Cost | `Managers View!D6 = AB245/H2` ← `Boat Module!IM` | `Base Cost`, section `cost-build` |
| Freight / duty / charges | `MV!D7:D17`; per-brand `IQ`,`IV`,`IX` | `Base Freight` · `Other Charges` · `Road Freight` (Stacer/Haines/Highfield); `ABP Compl.` · `Stamp Duty` · `Handling` (Stabicraft); `Quad Freight` · `Stamp Duty` · `Dazmac` (Surtees); `Aus Spec` · `Stamp Duty` · `IYT Logistics` (Jeanneau); `Freight` (Formosa) |
| **Landed cost** | `MV!D18 = SUM(D6:D17)` ≡ `Boat Module!IY` | `Landed Hull Cost` |
| Motor cost ladder | `Motor Library` `BB16`→`BB22` | `Dealer List Price` · `Landed CTD` · `Nett CTD` |
| Trailer cost ladder | `Trailer Module` `DB38`→`DB43` | `Dealer` · `Nett Price` · `Freight` · `Landed` |
| Part cost | `Parts Maintenance!G`,`I` | `P&A` · `CTD` |

These columns exist, they are correct, and they are banded `graphite` in the
seed for a reason. **A quote surface — picker, document, print — never renders a
column that sits in a cost band, and never sends one into any total.** This is
the one place the spec asks for a hard exclusion by construction rather than by
column choice, because the failure mode is a customer reading a dealer's buy
price.

### 2.3 Stage B — pre-delivery, installation and registration

The workbook builds these:

- Boat pre-delivery `MV!D20 = K20 + K31`, where `K20` is 20 hours ×
  `MV!D3 = '[6]Labour Rates'!$G$14` (130.0909…) plus catalogued PD parts plus
  100 L of fuel at `'[6]Oils and Lubes'!$H$14` (2.20/L) plus detailing, and
  `K31` is a 2-hour handover.
- Boat registration `MV!D23 = K34 = VLOOKUP('6.01m to 10.00m','[10]Registration Costs',8)`.
- Motor installation recovery `MV!E33 = 'Internal Work Order'!W67`.
- Rigging install `'[8]Rigging Kits'!CB13:CB20`.

**We hold none of the rates.** There is no labour rate, no fuel price, no
registration table and no PD-hours column anywhere in the seed. Therefore:

- **Boat pre-delivery and boat registration are a person's line.** The quote
  offers a free line (typed label, typed amount) and the document prints it
  exactly as typed. It does not compute, suggest, default or remember an amount.
- **Motor pre-delivery is already inside the number we read** —
  `Total PD Allowance` (`Motor Library!AV`) is summed into `Total CTD` (`AX`)
  which feeds `RRP + Freight Inc GST` (`BB`) and `Sell Price` (`BF`). It is a
  visible column in the seed and it must **never be added to a motor line**;
  doing so double-charges pre-delivery. The quote reads `Sell Price` and stops.
- **Trailer registration is already inside the number we read** —
  `Sell inc Rego` (`Trailer Module!CA`) is `DB77 = DB73 + DB76`. Reading `Sell`
  *and* `Rego ($)` and adding them is the same double-charge; the quote reads
  `Sell inc Rego` and stops.
- **Part labour is already inside the number we read when the part is fitted** —
  `Sell inc Install (if appl.)` (`Parts Maintenance!Y`) contains `Labour ($)`
  (`P`), derived from `TTF (Hours)` (`O`). A fitted line reads `Y`; a
  supply-only line reads `Sell` (`L`). Never both, never `L + P`.

This is `QUOTE_FINDINGS §2.8` — *"labour is part of the product"* — satisfied by
the data as seeded, and it is the reason the quote needs no labour arithmetic at
all.

### 2.4 Stage C — markup. Not computed. Ever.

The workbook applies exactly one markup, on the boat:

```
MV!D28  TOTAL ACTUAL CTD     = D18 + D24 + D25 + D26
MV!D29  BMT MU               = AB265  ← Boat Module, 0.29
MV!D37  BMT PACKAGE          = ROUNDUP((D28 + (D28 * D29)) * 1.1, -1)
```

Motor, rigging and trailer markups are **derived, not applied** — `MV!E29` is
literally `=E30/E28`, a margin *reported* after the fact, because the Motor
Library, Rigging Kits and Trailer Module each ran their own ladder upstream.

`BMT - MU` is **not a column in our seed.** `TABLE_KINDS.boat.detailColumns`
offers one as a preset for a *new* table; the real Northside data does not carry
it. So:

> **The quote applies no markup, on any line, ever.** It reads the rung the
> business already maintains by hand.

This is not a compromise — it is what the workbook itself does for the hull-only
path it actually sells from: `MV!E41 = $AB$458` is `Boat Module` *Hull Only
Pricing → Cash*, a number maintained by hand, bypassing the whole `D6:D37`
ladder. Our `Cash` / `Trade` / `Warranty` columns **are** `Boat Module!QR/QT/RB`,
the same hand-maintained rungs, already rounded by the business
(`ROUNDUP(…,-1)` upstream). Re-deriving them would replace a number a person
approved with a number a program guessed.

### 2.5 Stage D — the rung a line is priced at

This is the whole of the quote's pricing logic, and it is a lookup.

| Line kind | Level `cash` | Level `trade` | Other levels | Workbook |
|---|---|---|---|---|
| Boat | `Cash` | `Trade` | `Warranty` | `Boat Module!QR` / `QT` / `RB` |
| Motor | `Sell Price` | `Trade Price` | — | `Motor Library!BF` (≡ `MV!E32` ≡ `BB53` NSM Retail) / `BL` (≡ `BB62`) |
| Trailer | `Sell inc Rego` | `Sell inc Rego` | — | `Trailer Module!CA` (≡ `DB77`) |
| Part / accessory | `Sell` | `Sell` | `Sell inc Install (if appl.)` as level `fitted` | `Parts Maintenance!L` / `Y` |
| Rigging kit, propeller | **no number** | **no number** | — | priced at `'[8]Rigging Kits'!CB9` and `'Internal Work Order'!W76`, neither in our data |

Every one of those is **GST-inclusive** as stored — `Motor Library!BB` is
literally named *RRP + Freight **Inc GST***, and the boat rung was grossed by the
`*1.1` inside `MV!D37` before it was written down. The quote therefore works
entirely in one convention and never converts. Production chose its convention
by accident — `displaySheetPricing = !!(v?.pdTiers?.length && (v?.priceIncGst ||
v?.priceLadder))` — so whether a discount landed before or after GST depended on
which three fields an importer happened to write. We have one convention because
we have one kind of number.

**When a table offers no column for the chosen level**, the line is priced at
that table's first level and the line **records which level it actually used**,
so the document can answer *"a trailer has one price and this is it"* rather
than silently pricing a trade deal at retail. Production loses the level
entirely on save (`finalize:277` writes the raw `sellPriceExclGst`, no ladder,
no level) and every trade quote's PDF prices the hull at cash.

**When a line has no price column at all** — a rigging kit, a propeller, a join
row — `unitPrice` is `null`. Null is a real state and prints as
*"not priced here"* in carmine, contributing nothing to the total, and the total
carries a count of how many lines are unpriced. `QUOTE_FINDINGS §2.6`:
*"a silent $0 on the customer-facing summary is the class stakeholders catch"*.
`showZeros="0"` on the workbook's own quote sheet makes an unmatched lookup
render as **blank**, indistinguishable from a free inclusion — we render the
opposite of blank.

### 2.6 Stage E — the customer's box

The workbook, verbatim in structure:

```
AA165  Package Price          = SUM(AH184:AJ184)          the lines
AB167  <rebate name>          = -MV!E62                   Yamaha rebate
AB168  CURRENT FACTORY PROMOS = -MV!AB260                  Boat Module
AB169  Dealer Discount Given  = TYPED, as a negative       instruction AO27
X170   THE NUMBER             = AA165 + AB167 + AB168 + AB169   inc GST
AB174  Total Price (Excl GST) = X170 / 1.1
AC176  Trade In Allowance     = TYPED
AC183  Contract Sum (Adjusted)= X170 - AC176 + AV94
```

Ours, rung by rung:

- **Package total** — computed, once, from the frozen line amounts. One
  function, one export, used by the foot bar, the document and the print.
  `QUOTE_FINDINGS §3.4`: production has four bespoke summations plus a
  hand-copied fifth, and *"adding one chargeable thing means editing all four"*.
- **Rebate and factory promo** — the names and amounts live in `Boat Module`
  (`AB259`/`AB260`) and `Motor Library` (`BB23`/`BB54`); **neither is a column in
  our seed**. They are therefore adjustment lines with a typed label and a typed
  amount, never pre-filled and never suggested. The workbook's own campaign
  banner (`'[2]Motor Library'!$Y$90`, *"Yamaha 115/130HP Hero Campaign - Valid
  till 15.08.26"*) is a string in a cell, not a rule — so it is a sentence a
  person may type, not a discount a program applies.
- **Discount** — typed, always its own visible row, always signed negative,
  never folded into a subtotal. §5 states what an override may and may not do.
- **Trade-in allowance** — typed, its own row, subtracted, and printed with the
  business's own qualifier from `Quote Sheet!R175`:
  *"subject to final inspection"*. Production captured a trade-in on every boat
  quote and **never subtracted it** — `adminDetails` has zero readers outside its
  two writers.
- **The total** — package + adjustments, GST-inclusive because every input is.
- **Tax** — the workbook shows a customer exactly one tax figure,
  `AB174 = X170/1.1`, and clause 19 states *the amounts are inclusive of Goods
  and Services Tax unless otherwise stated*. There is **no tax-rate column
  anywhere in the seed**, and `1.1` hardcoded in seven production files while
  `organisation.gstPercentage` sat unread is the exact trap in
  `QUOTE_FINDINGS §3.7`. Therefore: the quote carries an optional **`taxRate`
  typed by a person, blank by default**. Blank prints the inclusive sentence and
  no ex-tax line. Filled prints `Total excluding tax` derived from it, and the
  document names the rate it used. The word is "tax", not "GST" — this frame is
  industry-neutral and the app ships to more than one jurisdiction.

### 2.7 Four workbook faults we deliberately do not reproduce

1. **`8.1` — one empty dropdown blanks the whole quote.** `AJ17 = VLOOKUP(D17,…)`
   has no `IFERROR`, so the shipped 2026 template's Package Price, customer
   total, ex-GST total, contract sum, the stock board's SELL PRICE and the
   entire finance strip all read `#N/A`. Our total can never depend on a lookup
   that may fail: a line either carries a frozen number or carries `null`, and
   `null` is displayed, counted and excluded — never propagated.
2. **`8.2` — the instalments do not add to the contract sum.** `Z179:Z181` are
   percentages of the *pre*-trade-in total while `Z182` is the *post*-trade-in
   remainder. We ship no payment schedule (§7), which is also what the workbook
   does for a *Quotation*: `AF3` maps document type to a code and only codes 2
   and 3 switch the schedule on.
3. **`8.3` — six of eight misc option lines silently drop the sundry charge**
   (`AC140`…`AC150` omit `AB`, `AC136`/`AC138` include it). One summation, one
   formula, one place to be wrong.
4. **`8.4` — two adjacent recovery formulas gross for GST differently**
   (`D37` grosses cost and margin; `D33` grosses only the margin). We gross
   nothing.

---

## 3. Frozen vs live

This is the single most important correctness decision in the feature, so it is
stated as an invariant first and a field list second.

> **INVARIANT — a quote renders from its own `lines` and `adjustments` and
> nothing else. No selector on any quote surface may read `rowsByEntity`,
> `entities` or the rule engine to produce a number, a label or a spec.**

If that invariant holds, the price file can change on Tuesday and every quote
already made is untouched. If it is broken anywhere — one label, one spec, one
photograph resolved live — then it is broken everywhere, because nobody can tell
by looking which numbers on the page are yesterday's.

### 3.1 Frozen at the moment a line is made

A line is minted the instant a person picks it — **not at commit**. Production
kept seven wizard steps in React state with no draft, no `localStorage`, no
`beforeunload` guard; a refresh at step 6 destroyed everything, and "Your
Quotes" navigated to a page that does not read `quoteId`, dropping the
salesperson on a blank configurator. We write through the store on every pick,
which the existing 400 ms debounced write-behind (`useProjectStore.ts:183-190`)
carries to Dexie for free.

Copied into the line, by value:

| Field | Why it must be frozen |
|---|---|
| `label` | `rowLabel()` at that moment. A model renamed upstream must not rename it on a document already given out. |
| `unitPrice: number \| null` | The number that was in the cell. |
| `priceFieldId` + `priceColumnName` | *Which* column it came from, and what the business calls it. The id survives programs; the name survives the id being deleted. |
| `levelKey` + `levelResolved` | The level asked for, and the level actually used when the table had no such column. Answers "why is this at cash?". |
| `qty` | Default 1. |
| `sourceNote` | The seed's own `Source` cell, e.g. `Boat Module!R282 KZ..LD`. Provenance the business can check against the workbook. |
| `pairFacts` | The join row's own columns as label/value text — `Rigging Kit Option`, `Prop Part No.`, `Prop Description`, `Engine Hole`, `Slot`. **This is the five-way association**, and it is the thing production loses to a fuzzy name match that fails open. |
| `recommended` | Whether it was the starred one. |
| `image` | The `ImageRef` verbatim (url + alt). It points at a third-party host and may 404 — a missing photograph prints nothing and is never an error. `model.ts:47` already says an `ImageRef` is *"a catalogue tile or a quote header"*. |
| `specs` | The label/value pairs printed under the subject's name, resolved through `engine.valuesOf` once. Descriptive facts on a signed document must not move either. |

Frozen at the quote level: the org name, the consultant's typed name, the date,
the reference, the level chosen, the tax rate if typed, the customer block.

### 3.2 Live — and what "live" is allowed to mean

`entityId`, `rowId`, `pairRowId`, `viewId` are kept. They may be used for
**exactly two** things:

1. *"Open this row on the sheet"* — a link out.
2. *"Make another quote like this one"* — mints a **new** quote from today's
   data.

They may never be used to draw or price the quote in front of you. When the row
is gone, the link says so in the sentence `ViewStage` already uses —
*"That table is no longer on the sheet."* — and the quote still prints
perfectly, because the quote never needed it.

### 3.3 Draft vs issued

- **`draft`** — everything editable. One explicit control, and only one, can
  bring today's prices in: **"Re-read today's prices"**. It shows a diff first —
  every line whose stored number differs, old and new, and how the total moves —
  and applies nothing until pressed a second time. A silent restatement is worse
  than a stale number, because the salesperson believes the page.
- **`issued`** — the moment it is given to a customer. Lines, prices,
  adjustments, level and tax rate become read-only. "Re-read today's prices"
  disappears. The only remaining action is **"Make a new version"**, which
  copies the quote into a fresh `draft` carrying `supersedesId`, so the
  conversation has a history and neither document was edited behind anyone's
  back. Production auto-locked on *first send* rather than on commit, and had to
  add a client-side guard because writes were firing, toasting "Saved", and
  silently reverting.

There is **no expiry engine**. Production shipped a complete, correct
`quote-expiry.ts` whose `expiryAt` is written nowhere, so every quote is
`'no-expiry'` and both gates that depend on it never fire. The workbook's own
validity is a typed sentence on the sheet — *"NB: Quotation Valid for 14 Days
unless otherwise stated"* — not a computation. Ours is a typed sentence too:
an optional note, blank by default, printed if written.

---

## 4. The flow, screen by screen

Cold start, one salesperson, a customer standing in front of them.

### Screen 1 — the sheet (exists)

Click the table in the left panel **(1)**. Click the door
*"What goes with each one?"* **(2)**. `ViewStage` opens over the sheet; the
canvas keeps its zoom underneath.

### Screen 2 — the view page (exists)

Click the boat in the rail **(3)** — or type two words in the rail's search and
click, which is the same click. The configured rig is on screen: photograph,
name, spec strip, one block per related table, curated order, star.

**New: one control in the stage bar, beside "Back to the sheet".** A sentence,
not a glyph, with `aria-label` and `aria-pressed`, exactly as the panel's doors
carry:

> **`Quote this one`**

Click it **(4)**.

### Screen 3 — the quote (new: `QuoteStage`, mounted over `.shell-stage`)

The quote opens already made. It carries the subject, and one section per view
block in the view's own order. Each section is in one of two states:

- **a starred row exists** → it is already a line, priced, with its rigging kit
  and prop printed beneath it in mono. Nothing to do.
- **nothing starred** → the section shows its candidates exactly as the view
  page ordered them, each with its price, and picking one is **one click**. It
  is the same list the salesperson already knows; it has not moved.

Above the sections: the customer's name — **one field**, focused on open, with
the placeholder *"the customer's name"*. That is an instruction, not a value.
Everything else about the customer is behind a quiet *"Add contact details"*
disclosure and is never required. Production made a salesperson retype five
free-text fields for every quote for a repeat buyer, while a `CustomerPicker`
existed and was wired only into the *stock* branch of the same dialog.

Beside it: the **level** control, listing the levels the project's data actually
declares (§8.2) — for the Northside seed, `Cash` and `Trade`. Not a hardcoded
list of six, two of which return the same number and one of which is
unreachable, which is what production shipped.

Under the sections: **adjustments** — *"Add a discount"*, *"Add a rebate"*,
*"Add a trade-in"*, *"Add a line"*. Each is a typed label and a typed amount.
Nothing is pre-filled.

At the foot, always visible, never scrolled away: the running total, the
unpriced count if any, and one primary action.

### Screen 4 — the document

Click **"Give it to the customer"** **(5)**. The quote becomes `issued` and the
document renders (§6). Printing is the browser's own print — one more click and
a system dialog.

### The click count

| Case | Clicks to a printable quote |
|---|---|
| Star correct, no extras, name typed | **5** + type the name |
| Star correct, one accessory added | **6** |
| Nothing starred, three sections to fill | **8** |
| Above, plus a discount | **10** + type label and amount |

Nothing in that path opens a wizard, a modal over a modal, or a second panel.
Two panels maximum holds: the left panel and the stage. Production's equivalent
is seven wizard steps, one of which — the whole Administration step — is
persisted and read by nothing.

### Getting back to a quote

One door in the left panel, a sentence, `aria-label` + `aria-pressed`:

> **`Quotes we have made`**

It opens `QuoteStage` in list mode: date, customer, subject, total, state. Click
one and it opens. That is the entire navigation model, and it is the specific
thing production got wrong — their quotes list navigated to a URL whose
`quoteId` parameter no page reads.

---

## 5. What is editable at quote time

### Editable while `draft`

| Thing | Effect on the total |
|---|---|
| Which rows are lines | adds/removes that line's amount |
| **Level** (whole quote) | re-reads every line's frozen number *from the same frozen source cell it recorded* — this is the one re-read that is not a re-price, because the level was always a choice among columns already captured at pick time. A line whose table has no column for the new level keeps its price and says which level it is at. |
| Quantity | `qty × unitPrice`. Default 1. The workbook has a precedent — `MV!G23` multiplies trailer registration by `$M$54`. |
| Unit price **override** | see below |
| A free line | typed label, typed amount; the workbook's `Additional Dealer Options` (`R136:Y151`, eight lines). Ours takes a label and an amount only — the workbook turns typed hours into money at `MV!$D$2` ($159/hr) and we do not have that rate. |
| Adjustments | each its own signed row |
| Fitted vs supply on a part | switches that line's level between `Sell` and `Sell inc Install (if appl.)`. Never both. |
| Customer, consultant, reference, date, note, tax rate | none |

### Overrides are never folded

> An override never overwrites `unitPrice`. It writes `overridePrice` and an
> optional `overrideReason` **beside** the frozen original.

The document prints the original struck through and the override next to it,
and the line carries the word `override` in mono. This is production's one
genuinely good pricing idea — *"snapshots carry provenance:
`pricingSource: 'source' | 'override'` plus the original figure, so an auditor
can compute the delta later without re-resolving anything"* — and it is the same
discipline as `PairOrigin` on a view and `BlockedValue` on a constraint: **the
reason is written at the moment of the decision, never reconstructed
afterwards.**

The same is true of every adjustment. A discount is a row. A rebate is a row. A
trade-in is a row. Nothing is ever absorbed into a subtotal, because the
workbook's own `Dealer Discount Given` (`AB169`) is a visible line on the
customer's page and the moment it stops being one, nobody can answer *"why is
this $3,000 cheaper than the list?"*.

### Never editable, never computed

- **Cost.** No cost column appears on any quote surface, and no quote field
  accepts one.
- **Margin, and therefore no margin gate.** We have `Landed Hull Cost` and
  `Nett CTD` and could compute one — and will not, in v1. Production's margin
  gate runs on `sell × 0.85` because the payload writes `motor.costPrice` and
  every consumer reads `motor.cost`; dealer fit has no cost at all and is always
  guessed at `×0.6`; and a boat with no `cost` becomes a literal `0`, a free
  hull the gate waves through. A gate that blocks a real sale on a guess is
  worse than no gate. When cost is captured on the line with the same rigour as
  price, the gate becomes a small, honest addition.
- **Tax.** Only what a person typed (§2.6).

---

## 6. The document

### What it says, in order

The reading order is the workbook's own print order (`'Quote Sheet'!$D$4:$AD$391`),
reduced to what our data can honestly fill.

1. **Title block** — top right, spec-plate framing, hairline border, corner
   registration ticks (the `vw-tick` pattern already in `views.css`). Fields in
   `.mono-label` over `IBM Plex Mono` values: `QUOTATION` · date · reference ·
   prepared by · organisation. No logo slot — the workbook's is
   `VLOOKUP(B2,Dropdowns!AU2:AV11,2,0)` and returns `#VALUE!` in both shipped
   copies, and we have no logo in the data to put there.
2. **The customer** — name, then whatever contact lines were typed. Nothing
   printed for an empty field, no "N/A", no dashes.
3. **The subject** — photograph left at a fixed block, name in **Instrument
   Serif at 28px** (the ≥22px floor holds), and the frozen spec strip beneath in
   mono: hull length, beam, HP envelope as one fact (`90–115 HP`), the same
   `formatRange` the view page uses.
4. **The rig** — a real `<table>`, one row per line, grouped by section with the
   section name in `.mono-label`. Columns: description (Archivo) · detail
   (mono, one size down: rigging kit, prop part number, engine hole, slot) ·
   qty · amount (IBM Plex Mono, `font-variant-numeric: tabular-nums`,
   right-aligned). The starred line carries a small mark and the word
   `recommended`; an unpriced line carries *"not priced here"* in carmine where
   the amount would be. Overridden lines print both numbers.
5. **The money box** — ruled off. Package total; each adjustment on its own line
   with its typed label and signed amount; then the total, ruled twice, in the
   largest mono on the page. Below it, only if a tax rate was typed:
   `Total excluding tax` and the rate named. Otherwise the single sentence that
   amounts are inclusive of tax unless otherwise stated.
6. **The unpriced notice**, when any line is unpriced: *"N lines on this quote
   have no price in the price file and are not in the total."* Carmine, quiet,
   unmissable.
7. **Footer** — the date, the reference, page `n of m`. **No terms and
   conditions.** The workbook has twenty-seven clauses; we have none, and
   writing plausible ones would be fabricating a contract.

Carmine appears in exactly two places on this document — the unpriced mark and a
negative adjustment. Everything else is ink, hairline and paper.
`ART_DIRECTION.md`: *"near-monochrome with one accent is what will make it feel
expensive."*

### At 1280

The document renders inside `QuoteStage`, which sits over the sheet like every
other stage. Deep navy field; one white sheet, `max-width: 880px`, centred,
generous margins — a screen that feels slightly too empty is correct. The foot
bar (total + primary action) is fixed to the bottom of the stage, not of the
sheet, so it never covers the last line. No right rail. No second panel.

### On A4

```
@page { size: A4 portrait; margin: 14mm; }
```

- The navy field disappears; the sheet **is** the page. No shadow, no radius.
- Hairlines to `0.5pt` so they survive a laser printer;
  `print-color-adjust: exact` on the carmine accent only.
- Body `10pt` Archivo · data `9pt` IBM Plex Mono · section labels `7.5pt`
  `.mono-label` · subject name `22pt` Instrument Serif (the floor, in points).
- Photograph capped at ~55mm tall so the whole rig reaches page 1.
- The line list is a `<table>` with a `<thead>`, so a long rig repeats its
  column heads on page 2 and page breaks fall between rows for free.
- `break-inside: avoid` on every line row, on the money box and on the title
  block. A total orphaned onto its own page is how a document stops looking
  like a document.
- Page count in the footer via a `counter`; no JavaScript in the print path.

No PDF library. The browser's print-to-PDF produces a correct A4 file, and every
byte of layout we would otherwise duplicate in a second renderer is a byte that
can disagree with the screen. Production has a genuinely good `@react-pdf`
pipeline **and** a per-band re-summation inside it that disagrees with the
screen's.

---

## 7. What we do not build now

Each is a deliberate exclusion with the reason, so nobody reads its absence as
an oversight.

| Not building | Why |
|---|---|
| **E-signature** | Nothing in the workbook or the production app signs anything; `Quote Sheet` has a signature *line*, drawn, for a pen. A signature is a legal artefact and it needs a contract under it, which §7 also excludes. |
| **Payment, deposits, payment schedule** | The workbook's schedule is gated by document type — `AF3` maps *Quotation* to a code that leaves it **off**. It is also arithmetically wrong as shipped (`8.2`), and its percentages (`Boat Module` `AB445:AB448` — 20/30/0/remainder) are not columns in our data. A quotation shows no payment terms; that is not a gap, it is the workbook's own rule. |
| **Order / contract conversion** | Production has exactly one converter and it emits a contract with **one line** — the bare hull, at cash, ex-GST — with a `contractNumber` hardcoded to `1` so a re-convert produces a duplicate reference. The right time to build conversion is when the line model is proven, and the line model is what this spec introduces. |
| **The visual quote-flow designer** | The user wants it and it is coming — *"really visual outsystems studio style thing"*. `QUOTE_FINDINGS §3.1` is the reason it is not now: production built a full drag-and-drop template designer writing to `organisations/{orgId}/templates` **that the PDF renderer never reads**, then shipped a second layout system that does. *A designer ships only when the runtime reads it.* The runtime this spec describes does not exist yet. Build the document; then let it be designed. |
| **Sending — email, share links** | Production's `email-send.ts` is plumbed end to end and has never sent an email; four stakeholder decisions (sender domain, provider, cost, reply-to) were never made and `mail/` documents sit in `delivery: pending` forever. Printing works today, on any machine, with no configuration. |
| **Expiry / validity engine** | §3.3. Written, correct, never fired, in production. |
| **Margin gate** | §5. A gate running on a guessed cost blocks real sales. |
| **Finance calculator** | Every input is typed into a formula on the sheet — deposit `AN166 = 0.1`, establishment fee `AO168 = 1200`, a literal `+5` on the monthly repayment, `/4.33` for weeks — while the Finance Module supplies the rate and the term one lookup away. Reproducing any of those numbers would be inventing a financial product. |
| **Versions, scenarios, forks beyond "make a new version"** | `quote-versioning.ts` in production has zero callers and keys chains on `rootQuoteId`, which nothing writes. One supersedes-link is honest; a chain model with no chain is not. |
| **Multi-currency** | `MV!H2` EX Rate is a column in the Boat Module and not in our seed; every seeded price is already in one currency. |
| **A Customers table** | Deliberately *not* a new concept. When a project has a Customers table, the quote's name field becomes an ordinary `reference` picker with "or type a new one". Until then it is a typed string. |

---

## 8. Contract additions the orchestrator must make to `src/types/model.ts`

Minimal, named, argued. This spec's author does not edit that file.

### 8.1 A line model — the one thing that does not exist at all

A full read of `model.ts` finds no line, no quantity, no snapshot, no customer,
no total. Nothing to reuse and nothing to collide with. `QUOTE_FINDINGS §3.4`
names the absence of a line model as production's worst structural fault.

```ts
/** Where a quote line's number came from, frozen at the moment it was
 *  picked. A quote renders from these and never reads a base table:
 *  the price file may change on Tuesday; a quote given out on Monday
 *  may not. */
export interface QuoteLine {
  id: string
  /** references — for "open this row", never for pricing */
  entityId: string
  rowId: string
  /** the join row that recorded the pick, when there was one */
  pairRowId?: string

  /** FROZEN */
  label: string
  qty: number
  /** null is a REAL state: "not priced here". Never rendered as 0. */
  unitPrice: number | null
  priceFieldId: string | null
  /** the column as the business writes it, e.g. 'Sell inc Rego' */
  priceColumnName: string | null
  /** the level asked for, and the one actually used when this table
   *  had no column for it — so "why is this at cash?" is answerable */
  levelKey: string
  levelResolved: string
  /** the seed's own Source cell, e.g. 'Boat Module!R282 KZ..LD' */
  sourceNote?: string
  /** the join's own columns — rigging kit, prop, engine hole, slot.
   *  THIS is the five-way association; production loses it to a
   *  fuzzy name match that fails open. */
  pairFacts?: Array<{ label: string; value: string }>
  recommended?: boolean
  image?: ImageRef

  /** An override sits BESIDE the frozen figure, never over it —
   *  the same discipline as PairOrigin and BlockedValue: the reason
   *  is written at the moment of the decision. */
  overridePrice?: number
  overrideReason?: string
}

/** A discount, a rebate, a trade-in, a free line. Always its own
 *  visible row, always signed, never folded into a subtotal. */
export interface QuoteAdjustment {
  id: string
  label: string
  amount: number
  note?: string
}

export type QuoteState = 'draft' | 'issued'

export interface QuoteDef {
  id: string
  reference: string
  state: QuoteState
  /** the page it was configured on, and the row it is for */
  viewId: string
  rootTableId: string
  rootRowId: string
  /** frozen: the subject's name and the specs printed under it */
  subjectLabel: string
  subjectSpecs: Array<{ label: string; value: string }>
  subjectImage?: ImageRef
  /** lines grouped the way the view page grouped them */
  sections: Array<{ blockId: string; tableId: string; title: string; lineIds: string[] }>
  lines: QuoteLine[]
  adjustments: QuoteAdjustment[]
  levelKey: string
  /** typed by a person; absent = the document prints the inclusive
   *  sentence and no ex-tax line. NEVER defaulted. */
  taxRate?: number
  customer: { name: string; contact?: string[] }
  preparedBy?: string
  note?: string
  supersedesId?: string
  issuedAt?: string
  createdAt: string
  updatedAt: string
}
```

### 8.2 Which column is a price — and at which level

This is the single blocking gap. Today the only answer available to a quote is
`columns.ts`'s `MONEY = /price|cost|cash|rrp|sell|trade|freight|deposit|fee|charge/i`,
which matches `Dealer List Price` and `Base Cost` as readily as `Sell Price`. A
quote that guesses prints the dealer's buy price to a customer.

A single `priceFieldId` is not enough, because the workbook's central pricing
control is a **level** — `Quote Sheet!AA11` Sales Type driving
`HLOOKUP($D$39,$E$39:$K$59,n,0)` across `Managers View`. A boat has three levels
in our data, a motor two, a trailer one, a part two (and the part's second is
*fitted*, not *trade* — so index-matching across tables would price a boat at
cash and a part at fitted under the same choice).

Name them:

```ts
/** One column a quote may read a price from. `key` is shared across
 *  tables ('cash', 'trade'), so one choice prices a whole quote;
 *  `label` is the column as the business wrote it. */
export interface PriceLevel {
  key: string
  label: string
  fieldId: string
}

// on EntityDef, beside displayFieldId:
/** The columns a quote may read a price from, in the order the
 *  business offers them. ABSENT MEANS THIS TABLE IS NOT PRICED and a
 *  quote leaves the amount for a person — never a guess, never a
 *  regex on the column name. */
priceLevels?: PriceLevel[]
```

For the Northside seed that is, verbatim from the data:

| Table kind | levels |
|---|---|
| boat | `cash → Cash` · `trade → Trade` · `warranty → Warranty` |
| motor | `cash → Sell Price` · `trade → Trade Price` |
| trailer | `cash → Sell inc Rego` |
| accessory | `cash → Sell` · `fitted → Sell inc Install (if appl.)` |
| join | *(absent — a join carries names, not prices)* |

A table missing the chosen key prices at its first level and the line records
both keys (§8.1 `levelKey` / `levelResolved`). One field, one declaration per
table, no migration, and it also fixes the view page's own default-columns
hazard: a block can be told to show its price level rather than whatever
`defaultColumns` ranked first.

### 8.3 Quotes must travel with the project, and must travel frozen

```ts
export const EXPORT_VERSION = 2 as const

export interface ProjectExport {
  …
  /** present when quotes exist; frozen figures, not ids to re-price */
  quotes?: QuoteDef[]
}
```

`envelope.ts` must treat version 1 as *valid, no quotes* rather than rejecting
it — today it hard-rejects any version mismatch. The argument for including
quotes at all is the same as §3: a quote that travels as ids and is imported
into a project with different price data **silently re-prices a signed deal**.
Because `QuoteLine` is entirely value-typed, this costs the envelope validator
nothing but a shape check.

Two round-trip repairs are prerequisites and belong to whoever owns
`src/features/io/`, not to this feature: `validateEnvelope` rebuilds each
`EntityDef` field by field and **drops `kind`, `role`, `hierarchy`, `sections`
and `FieldDef.sectionId`**, and `isCellValue` rejects arrays, so **every image
cell is dropped on import**. A quote imported alongside tables that have lost
their `role` lands in a project where `looksLikeJoin`'s
`role === undefined && kind === undefined` fallback can bind the wrong join.

### 8.4 Not asked for, and why

- **No `Customer` type.** A typed name plus optional contact strings, until the
  project has a Customers table — at which point it is an ordinary `reference`
  field and no new concept.
- **No tax rate on `ProjectMeta`.** Per-quote, typed, blank by default (§2.6).
- **No `QuoteStatus` beyond `draft | issued`.** Everything past issue is §7.
- **No cost field on `QuoteLine`.** Adding one invites a margin, and a margin
  invites a gate, and a gate on a partial cost is what blocks real sales.

### 8.5 Two repairs this feature depends on but does not own

Reported, not assumed:

1. **The seeded joins do not use the well-known pair ids.** `join_hf_yam` and
   its siblings declare their own `Recommended` (boolean) and `Slot` (number)
   columns with freshly minted ids, not `__recommended` / `__order`. So
   `readPairs` returns `recommended: false` for **every** row of the real
   651-row seed and `order: undefined`. **Consequence for this feature,
   precisely:** the workbook's own recommended motor never pre-ticks, so every
   quote made from the Northside data costs one extra click and one extra
   decision per section — the exact cost §4 is trying to remove. The seed
   emitting `__recommended` / `__order` as the ids is the cheaper fix and needs
   no contract change; `EntityDef.pairing?: { recommendedFieldId, orderFieldId }`
   is the alternative. Orchestrator's call.
2. **`PAIR_ORDER_FIELD` is declared twice** — `model.ts:795` and
   `pairs.ts:60` — with `features/views/index.ts` re-exporting the *local* one
   under a comment that still says *"NOT in model.ts yet"*. Same value today, so
   no bug today; a quote importing the constant picks one of two identifiers at
   random. Delete the local declaration.

Also observed and reported without a fix: `ensureJoinPairColumns` exists at
`useProjectStore.ts:479` with **no caller**, so the three pair keys are never
registered as columns; and `applyMerge` drops any `row.values` key not in
`entity.fields`, which means a merge-import destroys every keep, drop and star.
A quote minted before such an import is unaffected — it is frozen — which is
itself the argument for §3.

---

## 9. Files

Owned by this feature and new:

```
src/features/quote/          the picker, the document, the one summation
src/app/QuoteStage.tsx       the box, mounted over .shell-stage
```

Modified, all owned:

```
src/app/Shell.tsx            one more Stage variant
src/app/LeftPanel.tsx        one door: "Quotes we have made"
src/app/shell.css            stage chrome + the print sheet
```

One control is required in `src/app/ViewStage.tsx` (the *"Quote this one"*
sentence in the stage bar). That file is not in this workflow's stated
ownership list and is not in the other workflow's either; **this is flagged, not
assumed.** `src/features/views/` is not modified at all — by design (§1).

Persistence follows the path `views` already proved: a `quotes` slice on the
store, actions wrapped in `mutate()`, the array added to `snapshot()` and
`ProjectSnapshot`, a `db.version(3)` table, and the three `Promise.all` lists in
`DexieProjectRepository`. `replaceProject` must **clear** `quotes` — it does not
clear `views` today, and a demo swap therefore leaves stale `ViewDef`s that get
written straight back to Dexie. A quote must not copy that. Note that
`useProjectStore.ts` and `src/db/` are outside the ownership list this workflow
was given; the change is small and named, and needs granting.

Typecheck is `npx tsc --noEmit -p tsconfig.app.json`, never bare `tsc`.

---

## 10. Definition of done

Someone who has never seen the app can, without help: open a boat, press
*Quote this one*, type a customer's name, press *Give it to the customer*, and
print an A4 page a customer would accept — with every number on it traceable to
a named column in the price file, and no number on it that a program invented.

And two weeks later, after the price file has been reimported twice, that same
quote prints the same numbers.

---

## 11. What was not verified

- Nothing was run. No dev server, no browser, no typecheck. Every claim about
  this repo is read from source.
- The two behaviours I would most want confirmed in a browser before building:
  that a boat or motor block's default columns really do print
  `Dealer List Price` / `Base Cost` on the live page (§1, read from
  `columns.ts:131-152` against the seeded field order), and that no row of the
  seeded joins reads back as `recommended` (§8.5, read from
  `northside.ts:1844-1854` against `pairs.ts:211-243`).
- The workbook figures in §2 are taken from the ground study of
  `Quote Module - MPF.xlsx` and `11111BMT - Quote Module 2026.xlsx`, read
  read-only. Values inside the eleven linked workbooks beyond what those files
  cache were not opened. The `#N/A` in the 2026 template's total is cited as
  observed in saved XML; whether it resolves when opened live against SharePoint
  is unconfirmed, though the source dropdown `D17` is genuinely empty.
- Whether `useProjectStore.ts`, `src/db/` and `src/app/ViewStage.tsx` may be
  edited by this workflow is unresolved and is named as such in §9.
