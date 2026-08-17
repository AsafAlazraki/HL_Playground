# THE SERVICE MODULE, THE RATES, AND THE COMMON THEMES

> *"also note commom themes - for example registration for boat and trailer"*

**Status.** A decision document. Nothing here is built and no file under `src/`,
`tools/seed/` or `src/features/constraints/` was changed to write it. It settles
six things: what the Service Module is and whether it belongs in the app yet; the
correction `QUOTE_SPEC.md §2.3` now owes the reader; the common themes as a
decided list; what we import and what we leave; what changes downstream; and the
questions only the owner can answer.

**Sources.** Three lenses run against the workbooks —
`scratchpad/study-service.md`, `scratchpad/study-themes.md`,
`scratchpad/study-mpf-brands.md` — plus eleven probes run for this document
against `Service Module (1).xlsx`, `Registration Module.xlsx`,
`11111BMT - Quote Module 2026.xlsx` and `Boat Module (5).xlsx`. Where this
document contradicts one of the three studies it says so and gives the cell.

**Conventions.** **ASSERTED** = a formula, a data validation, a stated header, a
rate typed into a rate table. **OBSERVED** = a pattern in the values, always with
a count. Every figure carries the cell it came from. Nothing here proposes a
rate, a fee, a margin or a policy that a workbook does not already state.

**Read-only.** Every workbook under `C:/Users/AsafA/Downloads/` was opened with
`zipfile.ZipFile` and read. None was written, saved, moved or renamed. Scratch
output went to the session scratchpad only.

---

## 0 · THE SIX DECISIONS, ON ONE PAGE

| # | Question | Decision |
|---|---|---|
| 1 | Is the Service Module a table, a set of tables, or a source of numbers? | **Two small tables now** (`Labour Rates`, `Oils and Lubes`), **one named and deferred** (`Operation Codes`), **the rest stays out**. It is not a module and does not become one. |
| 2 | Does `QUOTE_SPEC §2.3` still stand? | Its **rule** stands untouched. Its **premise** is false and its **reason** must be rewritten. Two of its four clauses are false, one is wholly false in a way both prior studies also got wrong, and one is now answered with a table. |
| 3 | Boat registration and trailer registration — one concept or two? | **One.** One table, one key type, one policy (`3rd Party Recovery`, never marked up). What differs — length versus mass, and which rung it lands on — belongs to the **join** and to the **column**, not to the concept. |
| 4 | What comes in from a 30 MB workbook? | **Forty-eight rows.** 18 labour rates and 30 consumables. Plus 19 registration fees from a 20 KB workbook. The other 30 MB is a computed grid we would be importing as data when it is a rule. |
| 5 | Does the quote start computing pre-delivery? | **No — it starts offering a computed default that a person can overwrite, and only after the columns exist.** A computed line a salesperson cannot override is worse than a blank one they can fill in. |
| 6 | What is the first thing to build? | Two columns on the seven boat tables under a section id that already exists, and 19 rows of registration fees. It invents nothing and closes a named gap in a shipped spec. |

---

# 1 · WHAT THE SERVICE MODULE IS

## 1.1 In a paragraph

`Service Module (1).xlsx` is **the price of an hour, the price of a litre, and a
catalogue of jobs — wrapped around a 157-model service-price grid that is not
data but a formula written out 1,727 times.** It sells nothing. Nothing in it is
a product a customer chooses. Two of its six sheets are rate tables of eighteen
and thirty rows; one is a catalogue of 366 billable operations; one is a
published policy document with no formulas in it at all; one is a hidden mirror
of another sheet's key column; and the last — 236 MB of XML, 98 % of the file —
is one row per Yamaha outboard carrying eleven service prices, each of which is
`hours × a rate + six to nineteen part lookups`, where the hours come from a
six-by-eleven matrix on the policy sheet and the parts come from a supplier's
price file cached inside the workbook. It is a **leaf that reaches sideways**: it
depends on Yamaha and on nothing of ours, and four Northside workbooks depend on
it (ASSERTED — `xl/externalLinks/_rels/externalLink1.xml.rels` →
`Yamaha Price File - 12.05.2025.xlsx`, the only external link out).

## 1.2 Sheet by sheet, with a verdict on each

| Sheet | What one row is | Live rows | Verdict |
|---|---|---|---|
| `Labour Rates` | one charge-out rate for an hour of workshop time | **18** (rows 9–11, 13–15, 17–24, 26–29) | **IMPORT** as a table |
| `Oils and Lubes` | one consumable, with cost, charge and the markup between them | **30** in three blocks (9–20, 22–31, 33–39) | **IMPORT** as a table |
| `Operation Codes` | one billable job — a line on a work order | 439 populated, **366 coded** | **NAME AND DEFER** |
| `Schedule Notes` | the published labour-hours matrix and two worked checklists | 483 non-blank cells, **no formulas** | **LEAVE OUT** — it is a document |
| `Std Service Schedules` | one Yamaha outboard, its 11 service prices and ~30 part slots | 157 priced, 32 stub | **LEAVE OUT** — it is a rule, not data |
| `Dropdowns` *(hidden)* | a mirror of another sheet's key column | 1,198 formulas over 277 real rows | **LEAVE OUT** — an artefact of Excel |

First-hand confirmation of the two we import (probe `p9_sv.py`, reading
`worksheets/sheet5.xml` and `sheet4.xml` directly):

```
Labour Rates!C8:H8   Description · Code · Actual · (blank) · Rate (Exc GST) · Rate (inc GST)
Labour Rates!H9      = 159            typed. Retail Labour, code GEN. THE master rate.
Labour Rates!G9      = H9/1.1         = 144.545454…
Labour Rates!H14     = $H$9-($H$9*10%) = 143.10      Internal, code PDI
Labour Rates!G14     = 130.090909…                   ← the cell four modules read
Labour Rates!E9      = 105            typed, no GST qualifier in its header

Oils and Lubes!C8:K8  Type · Notes · Part No. · Serv Cost · Unit · CTD · MU · GP · Sell
Oils and Lubes!H14    = 2.20      CTD    Fuel - Premium Unleaded, unit Litre
Oils and Lubes!K14    = ROUNDUP(H14*1.1*1.1,) = 3.00  Sell, inc GST
```

## 1.3 The argument — a table, a set of tables, or a source of numbers?

**The temptation is to call it a source of numbers**, paste `130.0909` and `2.20`
into the quote's arithmetic and be done. That fails on the first day the rate
changes, and §2.6 shows the business itself has already failed that way, in one
column, 571 times.

**The opposite temptation is to import the whole thing.** That fails harder. A
service schedule is not a row per model: 157 models resolve to **eight** distinct
time vectors, of which `Schedule Notes` publishes six (`study-service §6.7`).
Seeding 157 rows would encode as data what is actually a rule, and would hide the
two divergences that make it interesting — that the 4-cylinder class silently
splits three ways by horsepower band, and that three 3-cylinder models are billed
3.5 h where the published policy says 3.8 h. Worse, it would import two defects
at scale: the 1,000-hour CTD (`AM`) is built from the **sell** columns and
double-counts spark plugs, overstating cost by **+$427.82 (19.5 %)** on row 4 and
**+$405.56 (20.6 %)** on row 22, on every one of the 157 models
(`study-service §6.5`, recomputed numerically). We do not import a spreadsheet's
arithmetic errors and call them our data.

**So: two tables, and they are rate tables.** `Labour Rates` is eighteen rows of
`Description · Code · Actual · Rate (Exc GST) · Rate (inc GST)`. `Oils and Lubes`
is thirty rows of `Type · Unit · CTD · MU · GP · Sell`. Both are tiny, both are
closed, both have a header row, both have a key column, and both are already read
by name from four other workbooks. They are not constants files. They are tables
in exactly the sense this app means: a set of rows with columns, that other rows
join to.

**And `Operation Codes` is the third — later.** It is a real table (366 coded
rows, `Operation / Option` as its key, `Hours · Labour Cost · three sundry
buckets · sublet · Sell`, and a `Procedure` column that auto-renders each job as
a tick-box line for a work order: `U155 = " [   ] "&C155`). Four modules join to
it. But it is 366 rows unblocking a feature nobody has specified, where the two
rate tables are 48 rows unblocking a named gap in a shipped spec. Order matters
more than ambition here.

## 1.4 Does the Service Module become a MODULE in our sense? No.

`docs/plan/MODULE_SYSTEM.md §1` defines a module as **a place in the business**
with a master table, capabilities, and up to two surfaces. A rate table is not a
place in the business; it is a register that other places read. Nobody browses
`Labour Rates`; a boat row reads it. Giving it a module would produce an index
page of eighteen rows that no one opens, and would imply an `add`/`edit`
capability on a table whose whole value is that exactly one person maintains it.

**The Service Module becomes a module the day the operations catalogue is
imported and a work order exists** — a job card with hours, a technician and a
customer. That is a real place in the business, and it is not this quarter's
work. Until then: two tables, joined to, drawn as related blocks on the pages
that need them.

---

# 2 · THE CORRECTION TO `QUOTE_SPEC.md` §2.3

## 2.1 The claim, verbatim

`QUOTE_SPEC.md:134-139` (repo root):

> **We hold none of the rates.** There is no labour rate, no fuel price, no
> registration table and no PD-hours column anywhere in the seed. Therefore:
> **Boat pre-delivery and boat registration are a person's line.** The quote
> offers a free line (typed label, typed amount) and the document prints it
> exactly as typed. It does not compute, suggest, default or remember an amount.

## 2.2 Clause by clause

| §2.3 said | Status | The cell |
|---|---|---|
| "no **labour rate**" | **FALSE of the data, true of the seed** | `Service Module!Labour Rates!C8:H29` — 18 named rates, each with a code, an `Actual` cost, an exc-GST and an inc-GST charge, and a formula on every derived side. `H9 = 159` is the master; `G14 = 130.090909…` is the cell four modules read. |
| "no **fuel price**" | **FALSE, and it has two rungs** | `Oils and Lubes!C14` *Fuel – Premium Unleaded*, unit `Litre`. `H14 = 2.20` is **CTD**. `K14 = ROUNDUP(H14*1.1*1.1,) = 3.00` is **Sell**. §2.3 cites `H14` as *the* fuel price; that is the **cost** rung, and it is the right one — see §2.4. |
| "no **registration table**" | **FALSE** | `Registration Module.xlsx`, one sheet `Registration Costs`, `C3:K34`, **19 rows carrying a `CTD`/`SELL` pair**, of which 17 are non-zero and 2 are catalogued declines. Read first-hand for this document. |
| "no **PD-hours** column" | **FALSE — and both prior studies also got this wrong.** See §2.3 below. | `Boat Module!JN Boat PD (hrs)`, typed per boat, no formula, values spread across 14 distinct hour figures on 2,000+ rows. |

Two corrections this document makes to its own sources, so nobody inherits them:

- `study-service §9` says boat PD's *"20 hours is still a literal in the MPF"*.
  It is not. It is `Boat Module!JN`, a per-row column, and 20 is simply this
  boat's value (OBSERVED — `JN` runs 2 h on 517 rows, 6 h on 249, 8 h on 185,
  10 h on 164, 1.5 h on 157, … 20 h on 44, 22 h on 48).
- `study-themes §0` and `study-mpf-brands §7.1` count `Labour Rates` as 17 and 21
  rows respectively. Counted directly: **18**.

## 2.3 The thing that was actually missed: pre-delivery is a column, not a literal

The reason three lenses all read `Managers View!K20` as a wall of literals is that
its inputs are addressed by **ordinal**, through a parameter block, and the
parameter block is 250 rows below the arithmetic. ASSERTED, every line read from
the saved formula XML of `11111BMT - Quote Module 2026.xlsx` sheet 6:

```
AB272 = VLOOKUP($AB$1,'[3]Boat Module'!$C:$ZZ,$Z272,0)   Z272 = 272 → Boat Module!JN
AA272 = VLOOKUP($AB$3,'[3]Boat Module'!$C:$ZZ, Z272,0)   → the header: 'Boat PD (hrs)'
```

The whole pre-delivery build is per-boat columns resolved by ordinal, and each
one's *name* is fetched by the same lookup one row up. Confirmed against the
Boat Module directly (probe `p6_boatmod.py`, streaming
`Boat Module (5).xlsx!sheet1.xml`, header row 1):

| Ordinal | Column | Header, read from row 1 | Provenance |
|---|---|---|---|
| 271 | `JM` | `Pre Delivery Code` | formula `"9SB_"&D&"_PD"` on 213 rows, typed on the rest |
| 272 | `JN` | **`Boat PD (hrs)`** | **typed, 0 formulas** |
| 273 | `JO` | **`Labour Rate ($)`** | **`'[2]Labour Rates'!$G$14` on 1,434 rows; a pasted `130.09090909090907` on 571** |
| 274 | `JP` | `Boat Detailing ($)` | typed, 0 formulas |
| 275 | `JQ` | `Fuel Allocation (Litres)` | typed, 0 formulas |
| 278–287 | `JT`…`KC` | `P/D - Parts & Accessories - 01..10` | 34 cells are `='[3]Parts Maintenance'!C<row>` |
| 289 | `KE` | `Boat Hand Over (hrs)` | typed, 0 formulas |
| 294 | `KJ` | `Sundry Charges - 1` | typed |
| 297 | `KM` | `Boat Registration` | typed enum, 5 values |
| 298 | `KN` | `Boat Rego Decals` | typed enum |
| 458 | `QR` | `Cash` | `ROUNDUP(IY*1.25*1.1,-2)` on this brand |

The ordinal arithmetic is confirmed three independent ways: ordinal 245 → `IM`
`Base Cost` and ordinal 257 → `IY` `Landed Hull Cost` are exactly what
`QUOTE_SPEC §2.2` already cites, and ordinal 458 → `QR` `Cash` is exactly what
`§2.5` already cites.

**And the Boat Module already computes a pre-delivery cost of its own**, one
level above the deal sheet — ASSERTED, headers read from row 1:

```
SW  PD Code       'PD-STC-STD'
SX  Est Hrs     = $JN + $UJ                        boat PD hours + total engine labour
SY  Labour $    = SX * '[2]Labour Rates'!$G$14     hours × the Internal rate
SZ/TA/TB  Parts CTD · Sundry CTD · Sublet CTD      empty on all rows
TC  Total CTD   = ROUNDUP(SUM(SY:TB),-2)           rounded UP to the nearest $100
```

So the estate holds **two different pre-delivery numbers for one boat**: a
catalogue-level labour-only figure on the boat row (`TC`), and a deal-level build
in the quote sheet (`Managers View!D20`) that adds parts, fuel, detailing and
handover. They are not reconciled and they are not meant to be — but anything we
build must say which one it is showing.

## 2.4 A worked pre-delivery on one real boat, rung by rung

**The boat.** `Stabicraft - 2350 Ultra Centrecab (Adventure)`, boat code
`7002350025`, `Boat Module (5).xlsx` **row 188**; the live deal is
`11111BMT - Quote Module 2026.xlsx`, sheet `Managers View`, where
`AB1 = 'Quote Sheet'!$D$13 = '2350 - Ultra Centrecab  (Adventure)'` and
`AB3 = Stabicraft`. Every figure below is the value saved in the file. The two
files agree on the hull: `Boat Module!IY188 = 80,412.9794` and
`Managers View!D18 = 80,412.9794`.

**The two rates the build stands on**

```
Managers View!D2 = '[6]Labour Rates'!$H$9  = 159.00        Retail Labour (Hr), inc GST
Managers View!D3 = '[6]Labour Rates'!$G$14 = 130.090909…   Internal Labour Rate, exc GST
```

**Stage 1 — the pre-delivery build, `K5:K19`, summed at `K20`**

| Cell | Line | Formula | Amount |
|---|---|---|---|
| `K5` | `Labour - 20 Hours` (`J5` builds the label from `AB272`) | `$AB$272*$AB$273` = 20 × 130.090909… | **2,601.8182** |
| `K6` | `2 x MFM70 Batteries` | `VLOOKUP($J6,'[4]Parts Maintenance'!$C:$ZZ,7,0)` | 292.80 |
| `K7` | `2 x 115119 - Large Battery Trays` | same shape | 16.3920 |
| `K8` | `Battery Terminals (2 pairs)` | same shape | 22.4400 |
| `K9` | `Aux Charge Cable - 225 - 300HP Yamaha` | same shape | 108.6395 |
| `K10` | `Racor Fuel Filter - Bowl Style` | same shape | 119.5723 |
| `K11:K15` | five empty part slots (`J = '.'`) | `IFERROR(VLOOKUP(…),)` | 0 |
| `K16` | `Fuel Allowance - 100 Ltrs` | `$AB$275*'[6]Oils and Lubes'!$H$14` = 100 × **2.20** | **220.0000** |
| `K17` | `Detailing` | `$AB$274` | 30.0000 |
| `K18` | `Sundry` | *empty cell* — a labelled slot with no amount on this boat | — |
| **`K20`** | | `SUM(K5:K19)` | **3,411.6619** |

Add it by hand: 2,601.8182 + 292.80 + 16.3920 + 22.4400 + 108.6395 + 119.5723 +
220.0000 + 30.0000 = **3,411.6619**. The stored `K20` is
`3411.6619318181811`. It reconciles to the cent.

**Stage 2 — the handover, `K23:K30`, summed at `K31`**

| Cell | Line | Formula | Amount |
|---|---|---|---|
| `K23` | `Boat Hand Over (hrs)` | `$AB$289*$AB$273` = 2 × 130.090909… | 260.1818 |
| `K25` | `Propeller Flag Bag - Yamaha` | `VLOOKUP(…,'[4]Parts Maintenance'!…,7,0)` | 18.5975 |
| `K26` | `Salty Captain - Salt Wash (1 ltr)` | same | 23.0000 |
| `K27` | `Engine Flush Multi Mixer` | same | 28.2360 |
| `K28` | `Sundry Charges - 1` | `AB294` ← `Boat Module!KJ` | 15.0000 |
| `K29` | `Promo Gear Allowance` | — | 0 |
| **`K31`** | | `SUM(K23:K30)` | **345.0153** |

**Stage 3 — the rungs**

```
D20  Pre Deliver Charges  = $K$20+$K$31   = 3,411.6619 + 345.0153 = 3,756.6772   COST
D23  Registration         = K34                                    =   414.00     COST
     K34 = VLOOKUP($J$34,'[10]Registration Costs'!$C:$ZZ,8,0)
     J34 = AB297 ← Boat Module!KM = '6.01m to 10.00m'
     ordinal 8 from C = column J = 'CTD' → Registration Costs!J11 = 414.00
D24  Total Pre Delivery   = SUM(D20:D23)                           = 4,170.6772
D28  TOTAL ACTUAL CTD     = D18+D24+D25+D26                        = 84,583.6566
D29  BMT MU               = $AB$265 ← Boat Module!JG               = 0.29
D37  BMT PACKAGE          = ROUNDUP((D28+(D28*D29))*1.1,-1)        = 120,030
D33  Installation Recovery= ROUNDUP((D20+(D20*D29)*1.1),-1)        =   4,960   ← the customer's PD line
D34  3rd Party Recovery   = ROUNDUP(D23,)                          =     414   ← the customer's rego line
D32  SELL PRICE           = D37-D33-D34                            = 114,656
D40  'Including Boat Pre Delivery and Boat Registration'            = 120,030
D41  'HULL ONLY SALE'      = $AB$458 ← Boat Module!QR Cash          = 110,600
D42  'HULL ONLY inc Boat Registration' = ROUNDUP($AB$458+$A$23,)    = 111,014
```

Check `D33` by hand: 3,756.6772 + (3,756.6772 × 0.29 × 1.1) = 3,756.6772 +
1,198.3798 = 4,955.0570 → `ROUNDUP(…,-1)` → **4,960**. Check `D37`:
84,583.6566 × 1.29 = 109,112.9170 × 1.1 = 120,024.21 → **120,030**. Check `D42`:
110,600 + 414 = **111,014**.

**Three things fall straight out of that arithmetic and each one is a decision.**

1. **The pre-delivery build is entirely a cost build.** Every part in it resolves
   through `'[4]Parts Maintenance'!$C:$ZZ` ordinal **7** — column `I`, the `CTD`
   column that `QUOTE_SPEC §2.2` already bands as cost. The fuel is
   `Oils and Lubes!H14` = 2.20, **cost**, not `K14` = 3.00, sell. Pre-delivery
   fuel is a cost recovery with no markup — a real pricing policy, stated by a
   cell reference, and one we would have got wrong by reaching for the column
   named `Sell`. The $80 difference on 100 litres is the size of that mistake.
2. **The number a customer sees is not the number the build produces.**
   `D20 = 3,756.68` is what pre-delivery costs. `D33 = 4,960` is what the
   customer is charged for it — cost plus 29 %, with GST applied to the margin
   only. A "computed pre-delivery line" is ambiguous until someone says which of
   those two numbers it is, and they differ by **$1,203.32** on this boat.
   (`QUOTE_SPEC §2.7` fault `8.4` already names the GST asymmetry between `D33`
   and `D37`. We reproduce neither.)
3. **Registration is read at `CTD`, and the workbook has a rung for it.**
   `D42 − D41 = 414` exactly. The business already publishes a hull-only price
   with registration folded in and one without, computed from the same fee.

## 2.5 What can now be computed, and what still cannot

**Can be computed, every figure carrying its cell:**

| Rung | Arithmetic | Inputs, all of them named columns or table rows |
|---|---|---|
| Boat pre-delivery **labour** | hours × rate | `Boat Module!JN` × `Labour Rates!G14` |
| Boat **handover** labour | hours × rate | `Boat Module!KE` × `Labour Rates!G14` |
| Boat pre-delivery **fuel** | litres × cost/litre | `Boat Module!JQ` × `Oils and Lubes!H14` |
| Boat **detailing** | a per-boat amount | `Boat Module!JP` |
| Boat pre-delivery **parts** | the ten named slots, each at cost | `Boat Module!JT..KC` → `Parts Maintenance!I` |
| **Boat registration** | a banded fee | `Boat Module!KM` → `Registration Costs!J` (or `K` — §6.2 Q1) |
| **Trailer pre-delivery** | hours × rate, banded by axle count and braking | `Operation Codes` `PDTR01`–`PDTR04` (1.0/1.25/1.75/2.5 h) × `Operation Codes!$F$6` |
| A **consumable** on any line | qty × cost or × sell | `Oils and Lubes!H` / `!K`, unit in `!G` |
| A **labour** line at any audience | hours × the row's rate | any of the 18 `Labour Rates` rows |

**Still cannot be computed, and the reason is not squeamishness:**

- **The pre-delivery markup.** `D29 = 0.29` is `Boat Module!JG BMT - MU`, and
  `QUOTE_SPEC §2.4` is right that we hold no such column. Without it there is no
  `D33`; there is only `D20`. So the computable pre-delivery number is the
  **cost** one, which is exactly the number a customer must never see. This is
  the single most important sentence in this section.
- **The engine labour half of `SX`.** `UJ Total Engine Labour Allowance` is
  `ROUNDUP(SUM(UF:UI),)` over three lookups into the Motor Library and Rigging
  Kits (`FITMENT_RULES §R9` — 812/812 rows, **0 of 2,436 cells hand-overridden**).
  Those columns are not in our seed.
- **Any service price.** `Std Service Schedules` is out (§1.3), and reading a
  schedule's `Sell` *and* adding a labour operation charges labour twice —
  `study-service §9.2`. The rule generalises: **read one rung of a ladder and
  stop.**
- **The concession rate.** Four pensioner rows exist at `Registration
  Costs!C29:K33`; **nothing in any workbook says when they apply**. That is a
  person choosing a row from a table we can now show them, which is strictly
  better than typing a number and still invents nothing.
- **Which cost rate an hour carries.** `Labour Rates!E9 = 105` and
  `!G14 = 130.0909` are both costs of one hour, 23.9 % apart, both feeding
  something labelled `CTD`. §6.2 Q3.

## 2.6 THE RISK, stated plainly: a copied rate is a rate frozen on the day it was copied

The workbook is edited by a human being — `Service Module (1).xlsx` was last
saved **2026-08-10 by Colin Kean**; `Boat Module (5).xlsx` **2026-08-05 by Colin
Kean**; `Registration Module.xlsx` **2025-10-16 by Colin Kean**. If we copy
`130.0909` into our seed, our seed is right until he changes `Labour Rates!H9`,
and then it is wrong and says nothing.

**This is not hypothetical. The business has already made this exact mistake, in
one column, and both halves are visible in the same file.** OBSERVED, probe
`p7_jo.py` over `Boat Module (5).xlsx!Boat Module`, column `JO Labour Rate ($)`:

```
1,434 cells  = '[2]Labour Rates'!$G$14      a live reference
  571 cells  = 130.09090909090907           a pasted constant
```

Change `Labour Rates!H9` tomorrow and 1,434 boats re-price while 571 do not. The
same species runs through the estate: `Cash` is pasted over its formula on
**576 of 588 Highfield rows and 30 of 91 Stacer rows**, of which 548 and 30 no
longer reconcile to their own landed cost while the live `GP %` formulas keep
reporting a margin from them (`study-mpf-brands §8.2`); every service part price
resolves through a Yamaha file **cached 12.05.2025** inside a workbook saved
2026-08-10; and `Registration Costs!C6` says **`AS at 1/7/25`** in a file last
saved 2025-10-16 — a validity date typed into a cell as a sentence, with nothing
that renews it.

And one more, found while writing this document, which is the cleanest
demonstration in the estate: **the same boat row, read from two files, gives
different pre-delivery inputs.** For `7002350025`, `Boat Module (5).xlsx` row 188
carries `JP Boat Detailing ($) = 10` and PD slots 1–3 of
`115119 - Large Battery Tray` / `3 x Circuit Breaker - 60Amp` /
`Battery Monitor - ePRO Plus`. The deal workbook's cached copy of the same row
(`Managers View!AB274`, `AB278:AB280`) says **30** and
`2 x MFM70 Batteries` / `2 x 115119 - Large Battery Trays` /
`Battery Terminals (2 pairs)`. The deal was saved 2026-02-23; the Boat Module
2026-08-05. Nothing in the deal says its inputs are five months old.

**So: what happens when the labour rate changes? Five commitments, in order of
how much they cost.**

1. **A rate is a row in a table, never a constant in code and never a default
   inside a formula.** Eighteen rows with a `Description`, a `Code` and two rate
   columns. Changing the business's rate is editing one cell of one row, and
   every join follows. This is the entire reason `Labour Rates` is imported as a
   table rather than as two numbers.
2. **A quote freezes the number at the moment it is minted, and records the
   cell.** `QUOTE_SPEC §3` already makes this an invariant and `QuoteLine`
   already carries `priceFieldId` and `sourceNote`
   (`src/features/quote/types.ts:115,132`; `freeze.ts:239-255`). A rate rise on
   1 July must not move a quote issued in June. The workbooks agree with us here
   by accident — a saved deal keeps its cached externals — and we do it on
   purpose.
3. **A rate table carries a vintage, and a frozen line records it.**
   `sourceNote: 'Registration Costs!J11'` tells you the cell; it does not tell
   you the cell said `414` under the `AS at 1/7/25` schedule. `validFrom` on the
   **table** (not the row) retires every as-at-date-typed-into-a-label in the
   estate — six of them, §3.2 theme 9.
4. **A re-import diffs, it never overwrites.** When the Service Module is read
   again, an eighteen-row table produces an eighteen-row comparison a person can
   look at: *Retail Labour was 159, is now 165; 1,434 boat rows and 27 quotes
   reference it.* Silent overwrite is how 571 cells got out of step in the first
   place.
5. **Where the number cannot be kept live, the app says so on the column.** A
   pasted rate is not a defect if it is labelled a snapshot with a date. It is a
   defect when one column holds both provenances and nothing distinguishes them —
   which is `study-mpf-brands §8.1`'s finding about `Into Stk` and this
   document's finding about `JO`, twice.

## 2.7 The replacement text for §2.3

The rule at `QUOTE_SPEC §2.1` — *if the number is not a column in the project's
own data, the quote does not produce it* — **does not change and must not
change.** What changes is the sentence under it. Proposed, for whoever owns the
quote module:

> ~~**We hold none of the rates.** There is no labour rate, no fuel price, no
> registration table and no PD-hours column anywhere in the seed.~~
>
> **We hold none of the rates yet, because we have not imported the three tables
> that hold them.** They are `Service Module.xlsx → Labour Rates` (18 rows:
> Description, Code, Actual, Rate exc GST, Rate inc GST), `Service Module.xlsx →
> Oils and Lubes` (30 rows: Type, Unit, CTD, MU, GP, Sell) and
> `Registration Module.xlsx → Registration Costs` (19 rows: Band, REV Code, CTD,
> SELL, banded by hull length for a boat and by ATM mass for a trailer). The
> pre-delivery inputs are **columns on the boat row** — `Boat Module!JN Boat PD
> (hrs)`, `JO Labour Rate ($)`, `JP Boat Detailing ($)`, `JQ Fuel Allocation
> (Litres)`, `JT..KC P/D Parts & Accessories 01–10`, `KE Boat Hand Over (hrs)`,
> `KM Boat Registration` — and none of them is seeded either.
>
> Until they are: **boat pre-delivery and boat registration remain a person's
> line.** After they are: **boat registration becomes a priced line read from
> `Registration Costs` at the band the boat row names, printed with the
> business's own words `3rd Party Recovery`, never marked up, and overridable.
> Boat pre-delivery becomes a suggested amount that is always visible as a
> suggestion, always overridable, and never the only number on the line** —
> because the computable figure is the cost build (`Managers View!D20`) and the
> figure a customer is charged (`D33`) needs a markup column we deliberately do
> not hold.

---

# 3 · THE COMMON THEMES, DECIDED

A theme is **a concern that appears in more than one module and is the same
concern each time.** Not the same word — the same concern. Three questions decide
each one: does it appear on more than one kind of row; does it mean the same
thing; and would modelling it twice cost us something we can name.

The answers land in one of four places, and the four are the whole vocabulary of
this section:

- **TABLE** — a register other rows join to. It has rows of its own.
- **SECTION** — a shared band of columns every product table carries. It is a
  fact about the product, not a row in a register.
- **CAPABILITY** — something the app knows about a row regardless of its kind.
- **NOTHING YET** — real, named, and deliberately not modelled.

## 3.1 REGISTRATION — the owner's example, answered first

### The verdict

> **ONE concept.** Registration is a **third-party statutory charge**, looked up
> by band from one shared table, never marked up, and accompanied by a physical
> artefact that is fitted for labour. That sentence is true of a boat and true of
> a trailer with no edits.

### The evidence, read first-hand

`Registration Module.xlsx` has one sheet, `Registration Costs`, `C3:K34`.
`C6 = 'AS at 1/7/25'`. Header row 8: `C` the band label (the key) · `G REV Code`
· `J CTD` · `K SELL = IFERROR(ROUNDUP(J,),)`. Four labelled sections in one
column, exactly the way the Boat Module and Trailer Module draw their bands:

| Section | Rows | Banded on | Fees |
|---|---|---|---|
| `C8 Boat Registration` | 9–13 | hull **length** | `Up to and inc 4.5m` 126.35→127 (`=100.65+25.7`) · `4.51m to 6.0m` 249.50→250 · `6.01m to 10.00m` **414.00→414** · `10.01 to 15m` 608.05→609 · `Boat Registration Not Required` 0 |
| `C15 Trailer Registration` | 16–19 | ATM **mass** | `Small Trailers - Up to 1.02t` 165.11→166 · `Large Trailers - Over 1.021t` **282.19→283** · `Heavy Trailers - Over 4.55t` 997.50→998 · `Registration - NOT REQUIRED` 0 |
| `C21 Other Fees & Charges` | 22–27 | not banded | `Boat Transfer Fee` **32.55**→33 · `Trailer Transfer Fee` **32.55**→33 · `Replacement Plate` 35.05→36 · `Unregistered Vehicle Permit` 38.90→39 · `VIN Plate` 8.14→9 · `PPSR Fee` 4.20→5 |
| `C29 Boat Registration - Pensioner / Concession Card Holder` | 30–33 | hull length | 76.05→77 · 137.60→138 · 219.85→220 · 389.65→390 |

The four boat bands are each a government fee **plus a constant `25.7` typed
inside the formula** (`J9 = 100.65+25.7`). It is labelled nowhere in the
workbook, so this document does not say what it is. If we seed the table we seed
`126.35`, not `100.65 + 25.7`.

### Why it is one concept and not two

**The business itself says so.** `Boat Transfer Fee` and `Trailer Transfer Fee`
are two rows at the **same $32.55** with two revenue codes. It duplicated the
*row*, not the *table* — which is precisely the statement that boat registration
and trailer registration are one concern applied to two subjects. `VIN Plate` and
`PPSR Fee` are trailer artefacts sitting in a shared "Other Fees" block with no
subject column at all: the table has already outgrown a two-way split.

Laid side by side, everything that differs is a property of the link or the
column, never of the concept:

| | Boat | Trailer | Same? |
|---|---|---|---|
| Lookup table | `Registration Costs` | `Registration Costs` | **identical** |
| Key type | band label string | band label string | **identical** |
| Key column on the product row | `Boat Module!KM Boat Registration` | `Trailer Module!BY Rego Type` | same role |
| What picks the band | hull **length** | trailer **mass** | belongs to the **join** |
| Is the band derived? | no — typed | no — typed, and 9 rows contradict their own ATM ¹ | **identical** |
| Marked up? | no — `Managers View!C34 = '3rd Party Recovery'` | no — `CA = ROUNDUP(BW+BZ,)` | **identical** |
| Where it lands | a separate line, **outside** `Cash` | **inside** `Sell inc Rego` | belongs to the **column** |
| Physical artefact | `KN Boat Rego Decals` | `BE = 'Rego Label Holder'`, a $1.824 PD part on every trailer | **identical idea** |
| Concession | 4 pensioner rows | none | boat only |

¹ `MPF_GROUND_TRUTH §14`, not re-derived here: rows 60, 61, 224–227, 398, 401,
403; seven undercharge by $117 each.

**And the fitting is a job in the Service Module.** `Operation Codes` rows 57–60:
`Rego Letters Not Required` ($0) · `DEC-REG-STD` 0.2 h → $31.80 ·
`DEC-REG-CUS` sublet $115 → $165 · `DEC-NAME-CUS` sublet $115 → $165. The tell
that this is one concept across two workbooks: **`Boat Module!KN`'s enum contains
the string `Rego Letters Not Required`, and `Operation Codes!C57` is the string
`Rego Letters Not Required`, verbatim.** That is a curated pair in our sense —
picking the boat option should carry the operation — and today a person does it
by knowing.

### What modelling it twice already costs, in cash

**The same table is read at two different columns by two different files.**
ASSERTED, by formula:

| Where | Subject | Ordinal from `C` | Column | A `Large Trailer` |
|---|---|---|---|---|
| `Trailer Module!BZ = VLOOKUP(BY,'[3]Registration Costs'!$C:$ZZ,9,0)` | trailer | **9** | `K SELL` | **283.00** |
| `Managers View!G23 = VLOOKUP($DB$75,'[10]…',8,0)*$M$54` | trailer | **8** | `J CTD` | **282.19** |
| `Managers View!K34` / `D23` / `A23` | boat | **8** | `J CTD` | 414.00 |

Eighty-one cents on every trailer, forever, because two hard-coded ordinals count
into one external table. A boat-and-trailer package therefore carries one fee at
retail and one at cost on the same document. This is the exact class of fault the
app exists to end.

### How it is modelled here

**TABLE + SECTION + a flag on the price column.** Three parts, and each does one
job:

1. **`Registration Costs` becomes a table** — 19 rows, columns
   `Band` (the key, from `C`) · `Subject` (derived from the four section labels:
   Boat · Trailer · Other) · `REV Code` (`G`) · `CTD` (`J`) · `SELL` (`K`). Two
   curated joins: `boat.<Boat Registration> → registration.Band` on seven boat
   tables, `trailer.<Rego Type> → registration.Band` on seven trailer tables.
2. **The shared section id `registration`** goes on the boat tables. It **already
   exists on all seven trailer tables** in the seed —
   `{ id: "registration", name: "Registration" }` at `src/demos/northside.ts`
   lines 1774, 1837, 1938, 1998, 2059, 2123 (+1), carrying `Rego Type`,
   `Rego ($)` and `Sell inc Rego`. The seven boat tables have `identity`,
   `cost-build` and `pricing` and no registration section at all, because
   `Boat Module!KM`/`KN` were never seeded. **The shared section id exists, is
   spelled correctly, and is applied to one of the two kinds that need it.**
3. **The rung is recorded on the price column, not remembered by a developer.**
   `Sell inc Rego` includes registration; `Cash` does not. §3.2 theme 5 turns
   that into data.

**Four hard requirements, each with its reason:**

- **Never derive the band.** Both `KM` and `BY` are hand-keyed and nine trailer
  rows contradict their own ATM. Deriving would change nine live prices. Offer
  it as a check that shows the nine and changes none — which is exactly the shape
  `workbookRules.ts` exists for.
- **Never mark it up.** `3rd Party Recovery` is the workbook's own word.
- **Never add it twice.** The trailer's rego is inside `Sell inc Rego`; the
  boat's is outside `Cash`.
- **Never default the concession.** Four rows exist; nothing says when they
  apply.

**Coverage, so nobody wonders whether the join will resolve.** OBSERVED, from the
Boat Module scan: `KM` reads `Up to and inc 4.5m` on 823 rows, `4.51m to 6.0m` on
570, `6.01m to 10.00m` on 554, `10.01 to 15m` on 19, `Boat Registration Not
Required` on 39, blank on 359. Every band in the fee table is used by real
catalogue rows, and the fifth value is the catalogued decline.

## 3.2 The rest of the set, each with a verdict

### Theme 2 — **An hour of a technician's time.** ONE concept, two rates. → **TABLE**

`Labour Rates` is an 18-row table that five sheets in four workbooks reach into
by absolute cell:

| Consumer | Cost side | Sell side |
|---|---|---|
| `Operation Codes!F6`/`N6` | `Labour Rates!$G$14` = 130.0909 | `Labour Rates!$H$9` = 159 |
| `Std Service Schedules` ×1,727 | **`Labour Rates!$E$9` = 105** | `Labour Rates!$H$9` |
| `Parts Maintenance!P`/`X` | `$G$14` | `$H$9` |
| `Dealer Fit Module!K`/`L` | `$G$14` | `$H$9` |
| `MPF Dealer Fit Options!K20`/`L20` | `[139]Labour Rates!$G$14` | `VLOOKUP(J20,…,6,0)` |
| `Boat Module!JO`, `!SY` | `[2]Labour Rates!$G$14` | — |

**Five consumers agree on the sell rate. Four agree on the cost rate and one does
not** — and both are named `CTD`. A 6-cylinder 1,000-hour service costs $997.50
of labour on one sheet and $1,235.86 on the other. Which is right is a business
question (§6.2 Q3); that the two are indistinguishable by name is a data
question, and it is the reason a `labour rate` table needs a **role on the row**
and a **cost rate / charge rate pair on the column**, not a single `Labour Cost`.

Two hazards travel with it. `Code` is not unique — `D10 = 'PD'` (Pre Delivery
Labour, 159 inc) and `D15 = 'PD'` (Internal – Pre Delivery, 143.10 inc), two rows
one code, a 10 % price difference. And the per-brand warranty rows are **not
Northside's prices**: the typed side flips per principal (Yamaha, Stabicraft,
Malibu, Whittley, Volvo typed exc-GST; Stacer, Surtees, Jeanneau, Haines,
Highfield typed inc-GST), which is what a reimbursement rate looks like when each
manufacturer publishes in its own convention. Stacer at 75 exc is **$30 below the
`Actual` cost of the hour**; Mercury reimburses at full retail. In our model the
**row is the identity** and `Code` is an ordinary column.

### Theme 3 — **The operation.** ONE concept. → **TABLE, deferred**

366 coded rows, four modules join to it, and it is the single largest join in the
estate. Its key is a sentence with the hours inside it
(`Install Motor (5.0) - Excludes Rigging Kit Installation`), which is the
strongest argument in the workbooks for `reference` fields over text. `Op Code`
is **not a key** — 12 codes appear on more than one row and `DFO_` alone is the
code on 34. Defer: 366 rows unblocking an unspecified feature, against 48 rows
unblocking a shipped spec.

### Theme 4 — **Pre-delivery.** ONE concept, three subjects, three rungs. → **SECTION**

The same seven-part shape appears on boat, trailer and motor with 10, 5 and 4
part slots. What differs is where it lands: the boat's is a separate recovery
line (`Managers View!D33`), the trailer's is inside its sell price, the motor's is
pre-absorbed in `Motor Library!AV` and flows into `Sell Price`. Within
`Labour Rates` the concern splits into two rows sharing one code — **PD billed to
a customer is retail (`H10 = 159`); PD absorbed on our own stock is internal
(`H15 = 143.10`)**. It is a section, not a table, because a boat's PD hours are
*this boat's* hours, not a row in a shared register.

### Theme 5 — **The audience (price level).** ONE concept, three encodings. → **CAPABILITY + a `rung` on the price column**

The same list appears as **extra columns** on a boat (`Cash · Trade · Sub Dealer ·
Sub (Exclusive) · AUS Sailing · Warranty`), as **extra rows** on `Labour Rates`
(`Retail · Trade · Internal · Warranty ×11`), and as **a suffix on a band label**
on `Registration Costs` (`… (Pensioner / Concession)`). `Managers View!$E$39:$K$59`
is the vocabulary written down once — `Retail Sale · Trade Sale · Sub Dealer Sale
· Sub (Exclusive) Sale · AUS Sailing Program · Commercial Sale · Boating Alliance
Program` — and one `HLOOKUP($D$39,$E$39:$K$59,n,0)` resolves all of them.

Two corrections to `QUOTE_SPEC §8.2`'s `priceLevels` proposal, which is otherwise
right and is already stubbed in `src/features/quote/pricing.ts:196-215`:

1. **The level keys are a project vocabulary, not a per-table invention.**
   `QUOTE_LEVEL_ORDER = ['cash','trade']` (`quote/types.ts:57`) is honest about
   today and too small for the workbook.
2. **A `PriceLevel` needs a `rung`, not just a `fieldId`.** `Sell inc Rego`
   includes registration; `Cash` does not. `Sell inc Install` includes labour;
   `Sell` does not. `Total CTD` includes pre-delivery; `Nett CTD` does not. Every
   *"must never add this twice"* sentence in `QUOTE_SPEC §2.3` is a fact about
   what a price column already contains. Three optional booleans on
   `PriceLevel` (`quote/types.ts:47`) — `includesRegistration`,
   `includesInstall`, `includesPreDelivery` — move all of them from prose into
   data, and the quote's rule becomes mechanical: **never add a charge that a
   line's own price column already includes.** This is the highest-value change
   in this document and it costs three fields.

### Theme 6 — **The `CTD · MU · GP · Sell` ladder.** ONE shape. → **SECTION, plus a denominator on the column**

`GP = Sell/1.1 − CTD` holds in eight sheets without exception. `MU = GP/CTD` and
`Margin = GP/(Sell/1.1)` are **two different ratios and both are live** —
`Oils and Lubes!I`, `Operation Codes!L`, `Parts Maintenance!J`/`T`,
`Dealer Fit!P`, `Motor!MU`, `Trailer!BT` and Yamaha's own price file compute the
first; `Std Service Schedules!AS` computes the second; and the MPF's
`Trailer Spec Enquiry Q14` computes `MU` under the label "GP Margin". A `number`
column is not enough — **the denominator has to travel with the column.**

Note also that `MU` is **derived, never applied**: the applied factor is the
literal inside `ROUNDUP` (1.8 on oils, 1.1 on fuel), and `MU` is what the
business actually got after rounding to a whole GST-inclusive dollar. Re-deriving
a price from `MU` produces a different number than the sheet shows. On a
pure-labour operation `MU` is exactly **1/9 = 11.111 %** — because the Internal
rate is Retail less 10 %, so the 10 % in `Labour Rates!H14` *is* the workshop's
entire labour margin. One typed percentage, one cell, the whole margin.

### Theme 7 — **"Not required" is a value, not a row.** → **CAPABILITY**

The business already draws the distinction `QUOTE_SPEC §2.5` insists on — between
*chosen to be nothing* and *not priced here* — and it draws it by cataloguing the
decline as a row priced at $0: `PDTR00 Pre Delivery - NOT REQUIRED`,
`Rego Letters Not Required`, `Boat Registration Not Required` (39 boat rows),
`Registration - NOT REQUIRED`, `Installation Not Required`, `Supply Only`,
`Factory Fit - Installation Not Required`, `NB: LABOUR TO BE QUOTED`,
`DFO-CREDIT CREDIT PART` — twelve spellings of *no* across five modules, two of
them inside `Registration Costs` itself. One null-sentinel capability on a
`select` field — *this option means none* — collapses all of them. Without it,
`Registration - NOT REQUIRED` is a $0 line on a customer's quote, which is the
silent-zero failure `QUOTE_FINDINGS §2.6` names. **Seed the rows; do not invent a
UI convention.**

### Theme 8 — **A row has a display image.** → **CAPABILITY**

`Image Link` is byte-identical as a column name in four tables, 3,104 URLs, 52
`#N/A`. `ImageRef` and `primaryImage` already exist (`model.ts:60,123`).
Declaring it once on `EntityDef` the way `displayFieldId` already works makes the
view page, the quote header and the picker correct by construction, and makes a
missing image a *missing image* rather than a broken cell — which
`QUOTE_SPEC §3.1` already requires.

### Theme 9 — **A table has a vintage.** → **CAPABILITY**

`Registration Costs!C6 = 'AS at 1/7/25'`. The Yamaha parts cache is dated
`12.05.2025`. `Boat Show!D7` names a show that finished in May. Every rate table
in the estate carries its as-at date **inside a label**, where nothing can read
it. A `validFrom` on the table lets a frozen quote record which vintage it priced
from — the one thing `sourceNote` cannot express.

### Theme 10 — **GST.** → **NOTHING YET, and that is the decision**

**24,951 hardcoded `1.1` literals across the estate and no rate cell anywhere.**
The convention is uniform and worth recording: **every `Sell` is inc GST and
rounded up** (`ROUNDUP(x*1.1,0)` on `Oils and Lubes!K`, `Operation Codes!O:R`,
`Std Service Schedules!J`…`AT`; `ROUNDUP(x,-1)` on `Trailer!BV`, `Motor!BB`,
`Managers View!D37`) and **every `CTD` is exc**. `QUOTE_SPEC §2.6`'s answer —
an optional `taxRate` typed by a person, blank by default — stands. What this
document adds is that **inc/exc is a fact about the column** and belongs beside
the `rung` flags of theme 5, not in a project-wide setting.

### Theme 11 — **A sundry.** → **NOTHING YET**

Six markup rules for "the small stuff" and no column anywhere records which
bucket a cost belongs in: ×2.00 (`Operation Codes!$O$6`), ×1.90 (`$P$6`), ×1.80
(`$Q$6`), ×1.25 (`Dealer Fit Module!R`, and `MPF Dealer Fit Options!M53`), ×1.20
(`Parts Maintenance!W`), ×1.15 sublet (`$R$6`) — **except rows 59 and 60, the two
registration rows, which hardcode 30 %**. Six rules and no definition is not one
concept yet. It is one question (§6.2 Q6).

### Theme 12 — **The service plan.** → **NOTHING YET**

Two of them, both live, same manufacturer, same 2.5 % index: the Motor Module's
is **7 events / 600 hours / 72 payments**; the Service Module's `AQ1` is
**15 services / 1,400 hours / 60 payments**. A customer can be quoted either.
This is a question, not a model (§6.2 Q7).

### Theme 13 — **Brand.** → **NOTHING YET, but never an enum**

Eleven brands have a warranty rate; seven have an MPF stock sheet; five have
operation codes; **none of the three lists contains the others.** Formosa can be
sold and not warranty-costed; Volvo can be warranty-costed and not sold. That is
what a `brand` table with roles is for, and exactly what a hardcoded enum cannot
express.

### Theme 14 — **The stock unit.** → **A TABLE WE DO NOT HAVE**

An MPF brand sheet is not a price list, it is a **stock list**: 134 of the
workbook's 141 external references point at one boat each, and 130 `SELL PRICE`
cells are `='[n]Quote Sheet'!$D$1` — a pointer into that hull's own deal
workbook. 197 stock rows against 810 catalogue rows; 181 match by name and
**nothing enforces it** (the eleven-sheet workbook holds one data validation, and
it is not on a model column). Our per-brand tables are seeded from the right
place — the Boat Module is the catalogue — and **there is no table at all for the
thing a salesperson actually sells: a hull with a stock number, a location, an
age and an asking price.** Named here so it is not rediscovered; out of scope for
this document.

### Rejected, with the reason

| Candidate | Why not |
|---|---|
| **Freight** | 1,146 `Freight Module` references, **all in the Boat Module, zero elsewhere**. The word is shared; the mechanism is not — two modules hand-key it. |
| **Stamp duty / ABP compliance** | Per-brand relabellings of the same three cost slots `IQ`/`IV`/`IX`. A naming convention, not a concept. |
| **Part number** | Ten spellings across the estate and no shared namespace. Real, but not one thing yet. |
| **Deposit** | One module. `QUOTE_SPEC §7` already ships no payment schedule. |
| **Currency / FX** | Two places, one module and one supplier sheet. |
| **Campaign / promo** | Declared once in `Home Page!K13` and echoed into 16 comment cells, plus 29 expired strings in `Dropdowns!R`. It is a concept with no home — but `QUOTE_SPEC §2.6` already handles it correctly as a sentence a person types, not a discount a program applies. |

## 3.3 Why our concept model cannot say any of this, and why that is fine

`src/features/constraints/columns.ts` keys a `ColumnConcept` as **`kind + the
normalised column name`**, and the header comment gives the reason: *"One table
per brand means 'Shaft Length' is not one column: it is seven columns, one on
each boat brand's table."* `RuleSentence.sideConcepts` then enforces single-kind
sentences deliberately — *"the obligation lives on the same kind as the
condition, or the rule could never be true of any row."*

That is correct **for a rule** and exactly wrong **for a theme**. Registration is
`boat + trailer`; the operation is `trailer + accessory + motor + package`; the
image link is four kinds; the cost ladder is all of them. So:

> Our column-concept key is `kind + name`, and every cross-cutting concern in the
> Master Price File is `name` across many kinds. **The themes are precisely the
> concepts our concept model cannot express.**

The answer is **not** to widen the key. The single-kind rule is load-bearing and
`workbookRules.ts` is right to defend it. The answer is that themes resolve one
layer up — as a table, a shared section id, or a capability — which is exactly
the three-way vocabulary §3.1 and §3.2 use.

---

# 4 · WHAT WE PULL AND WHAT WE LEAVE

The Service Module is **30,739,155 bytes**. What comes out of it is **48 rows**.
That ratio is the finding, not a joke about spreadsheets: 236 MB of the file is
one sheet whose `<dimension ref="A1:NC63073"/>` claims 23 million cells and whose
last real value sits at row 280 — and whose 157 real rows are a formula applied
1,727 times, not data.

| From | What | Rows | Verdict | Why |
|---|---|---|---|---|
| `Service Module!Labour Rates` | Description · Code · Actual · Rate exc · Rate inc | **18** | **IN, first pass** | The rate four modules read. Seeded **read-only and unjoined**: it is the correction §2.3 needs without being the licence to compute with it. |
| `Service Module!Oils and Lubes` | Type · Notes · Part No. · Serv Cost · Unit · CTD · MU · GP · Sell | **30** | **IN, first pass** | Holds the fuel price the boat PD build reads, at both rungs, with the unit stated. |
| `Registration Module!Registration Costs` | Band · Subject · REV Code · CTD · SELL | **19** | **IN, first pass** | The owner's named theme. Joins to boat and trailer from columns that already exist on both. |
| `Boat Module!KM`, `KN` | Boat Registration · Boat Rego Decals | 2 columns × 7 tables | **IN, first pass** | The boat half of the registration join. The section id is already in the seed. |
| `Boat Module!JN`, `JO`, `JP`, `JQ`, `KE`, `KJ` | the pre-delivery parameter columns | 6 columns × 7 tables | **IN, second pass** | Turns pre-delivery from a typed number into a suggestion with a cell behind it. Second pass because it needs the `rung` flags first. |
| `Boat Module!JT..KC` | P/D Parts & Accessories 01–10 | 10 slots | **IN, second pass** | `FITMENT_RULES §R4` already admits this as a bill of materials — 2,561 live pairs, 42 distinct parts, 99.59 % match. |
| `Service Module!Operation Codes` | the job catalogue | 366 | **LATER** | Real, large, and unblocks nothing shipped. Bring it with a work order, not before. |
| `Service Module!Std Service Schedules` | 157 models × 11 intervals × 30 part slots | 157 | **OUT** | It is a rule expressed as 1,727 cells (§1.3), it carries a uniform 20 % cost defect at the 1,000-hour interval, and its true key is `(cylinders, HP band)` — which the published matrix cannot say. |
| `Service Module!Schedule Notes` | the labour-hours matrix and two checklists | 483 cells | **OUT** | A document, not a calculation. Bring it back if and when schedules do. |
| `Service Module!Dropdowns` | a hidden mirror | 1,198 formulas | **OUT** | An artefact of Excel validation. Its tail renders 900-odd literal zeros. |
| `MPF` per-brand sheets | 197 stock rows | 197 | **OUT for now** | Theme 14. A different concept (a hull, not a model), with no table to land in yet. |
| `MPF!Boat Show` | an emptied clone | 0 | **OUT** | Zero data rows. Ours would be a saved view, not a table. |
| `MPF!Dealer Fit Options` | a job-costing form | 1 | **OUT** | A form over `Parts Module!Dealer Fit Module`. What it teaches — `hours × rate` and the 1.25 sundry markup — belongs in a rate table, not a form. |

**Said the way the owner would say it:** we are taking the price of an hour, the
price of a litre and the price of a rego sticker. We are leaving the service
book, because the service book is a way of working things out, not a list of
things — and if we copy it in as a list, the day someone changes how long a
100-hour service takes, we will have three hundred wrong prices and no way to
find them.

---

# 5 · FLOW-ON EFFECTS

## 5.1 In the seed

Three new tables (`Labour Rates` 18 rows, `Oils and Lubes` 30, `Registration
Costs` 19) and two new columns on each of the seven boat tables. Every value has
a cell; nothing is computed at seed time.

- The `registration` section id already exists on the trailer tables
  (`northside.ts:1774` and six siblings) and is spelled correctly. Adding
  `Boat Registration` and `Boat Rego Decals` under the same id on the boat
  tables is the cheapest correct change in this document.
- The new tables want a kind. None of `boat | motor | trailer | accessory |
  package | dealer | custom` fits a fee register. **Use `custom` with a
  descriptive name** until a `rate`/`fee` kind is justified by a third table —
  minting a kind for one table is how enums start.
- Every seeded column carries the cell it came from in its `description`, the way
  the boat columns already do (`"Boat Module!IY · labelled here by header
  row 3."`). Rate columns additionally carry the **file's last-saved date**,
  because §2.6.
- `tools/seed/` is being edited by a parallel workflow. **This document specifies;
  it does not touch that directory.**

## 5.2 In the quote

This is where care matters most, and the requirement is a sentence:

> **A computed pre-delivery line that a salesperson cannot override is worse than
> a blank one they can fill in.**

A blank line is honest about what the app does not know, and the person in front
of the customer fixes it in three seconds. A computed line that cannot be
overridden is a wrong number wearing the app's authority, and the salesperson's
only options are to abandon the quote or to ship the wrong price. Concretely,
this is not hypothetical: on the worked boat, the computable figure is
**$3,756.68** and the figure the business charges is **$4,960** — and the
difference is a markup column we deliberately do not hold.

So, precisely:

1. **Registration becomes a priced line**, read from `Registration Costs` at the
   band `Boat Module!KM` names, printed as `3rd Party Recovery`, carrying
   `sourceNote = 'Registration Costs!J11'` and the table's vintage. It is
   **overridable** like any other line.
2. **Pre-delivery becomes a suggestion, never a fait accompli.** The line shows
   the amount, the words *suggested from* and the inputs it used
   (`20 h × $130.09 + 100 L × $2.20 + …`), and the moment a person types over it
   the line records that it was overridden — `QUOTE_SPEC §5`'s
   "overrides are never folded" rule, applied to a suggestion instead of a
   discount.
3. **The trailer must not get a second rego line.** Its fee is inside
   `Sell inc Rego`. That is a fact about the column and is enforced by the `rung`
   flags of theme 5, not by a developer remembering.
4. **The line records which column it read.** `priceFieldId` and
   `priceColumnName` already exist (`quote/types.ts:115`; `freeze.ts:250`). With
   `Registration Costs` seeded, the 81-cent divergence becomes visible on a
   document instead of buried in an ordinal.
5. **Nothing changes about freezing.** `QUOTE_SPEC §3`'s invariant — a quote
   renders from its own `lines` and `adjustments` and nothing else — is what
   makes a seeded rate safe. It is the reason a 1 July rate rise cannot move a
   June quote.
6. **`§2.3`'s replacement text lands verbatim from §2.7**, and `§2.1`'s rule is
   untouched.

## 5.3 In the module system

- **No module for the rate tables.** A module is a place in the business
  (`MODULE_SYSTEM §1`); a fee register is not one. They appear as related blocks
  on the pages that read them.
- **The `quote` capability's refusal sentence gets sharper.** `MODULE_SYSTEM §5`
  already refuses `quote` when the master table has no resolvable `priceLevels`,
  in a sentence. With `rung` flags, the refusal can also say *"`Sell inc Rego`
  already contains registration, so this module will not offer a registration
  line"* — the reason written at the moment of the decision.
- **A Service module waits for the operations catalogue and a work order.**
  Naming it now and building it later is the whole point of §1.4.

## 5.4 In the rules

Two new `WorkbookRuleSeed`s, and both are **`blocked` on purpose**:

| Seed | Statement | Source | Why blocked |
|---|---|---|---|
| new | *A trailer's registration band must match its ATM.* | `Trailer Module!BY` vs `!K ATM (KG)`; `Registration Costs!C15:C19` | Nine live rows violate it, seven undercharging by $117. The app must **show** the nine long before it may **resolve** them — resolving changes a price the business is charging today. |
| new | *One registration fee, read at one column.* | `Trailer Module!BZ` ordinal 9 (`K SELL` = 283.00) vs `Managers View!G23` ordinal 8 (`J CTD` = 282.19) | It is a cross-file divergence, not a row-level rule; there is no clause shape for it yet. Record it, show it, change nothing. |

Both obey the file's own standard, quoted at its head: *"Nothing here was
inferred from a pattern in the values: a correlation is an OBSERVATION and is not
a rule."* The ATM seed is ASSERTED (a band table and a mass column); the
divergence seed is ASSERTED (two formulas). Note that `WorkbookRuleSeed.ref` is
typed `'A1' | … | 'A6'` — adding seeds widens that union, which is the one
contract change the rules side needs. **`src/features/constraints/` is being
edited by a parallel workflow; this document specifies and does not touch it.**

## 5.5 What breaks if we do this carelessly — eight named failure modes

1. **Double-charging registration** — reading `Sell` *and* `Rego ($)` on a
   trailer. Prevented by a `rung` flag, not by memory.
2. **Double-charging pre-delivery** — a motor's PD is already inside
   `Motor Library!AV → AX → BB → BF`. Same flag, same reason.
3. **Double-charging labour** — reading a service schedule's `Sell` *and* adding
   `LAB_20H4CYL`. `study-service §9.2`. Read one rung of a ladder and stop.
4. **Charging fuel at the wrong rung** — `Oils and Lubes!H14 = 2.20` is cost;
   `K14 = 3.00` is sell. Pre-delivery uses cost, deliberately. $80 per boat.
5. **Costing an hour at the wrong rate** — `E9 = 105` versus `G14 = 130.0909`,
   23.9 % apart, both named `CTD`.
6. **Freezing a rate by copying it** — §2.6. The business has already done this
   571 times in one column.
7. **Showing a cost to a customer** — the whole PD build resolves at `CTD`.
   `QUOTE_SPEC §2.2`'s hard exclusion of cost-band columns from every quote
   surface is what stops `3,756.68` from ever being printed as a price.
8. **Importing a defect as data** — the 1,000-hour CTD overstates cost by ~20 %
   on all 157 models; `Op Code`, `Model Code` and `Code` all look like keys and
   none is; `dimension` claims 63,073 rows where 277 exist.

---

# 6 · PHASING AND OPEN QUESTIONS

## 6.1 What to do first

| Phase | Action | Size | Unblocks |
|---|---|---|---|
| **1** | Add `Boat Registration` + `Boat Rego Decals` to the seven boat tables under the **existing** `registration` section id | 2 columns | the boat half of the owner's theme; costs nothing; the section already exists on trailers |
| **1** | Seed `Registration Costs` as one 19-row table; curate the two joins | 19 rows | `QUOTE_SPEC §2.3`'s boat-registration gap, with a cell reference |
| **1** | Seed `Labour Rates` and `Oils and Lubes`, **read-only and unjoined** | 48 rows | the correction to §2.3, without the licence to compute |
| **2** | Add `rung` flags to `PriceLevel` (`quote/types.ts:47`) | 3 optional fields | every "never add this twice" sentence becomes mechanical |
| **2** | Rewrite `QUOTE_SPEC §2.3` per §2.7; the registration line goes live on the quote, overridable | prose + one line kind | one fewer typed number per boat quote |
| **3** | Seed the boat pre-delivery parameter columns (`JN`, `JO`, `JP`, `JQ`, `KE`, `KJ`, `JT..KC`) | 16 columns | pre-delivery as a **suggestion**, with its inputs shown |
| **3** | Draw the shared section id list once — `identity`, `cost-build`, `pricing`, `pre-delivery`, `registration`, `lead-time`, `operations` | — | the next table gets them free |
| **4** | Record the ATM-band and CTD/SELL divergences as `blocked` workbook rules; add table `validFrom` | 2 seeds + 1 field | the app shows what it may not yet fix |

Phases 1 and 2 invent nothing: every number in them has a cell. Phase 3 is the
first one that produces a number a customer might see, and it is deliberately
last.

## 6.2 The questions only the owner can answer

Each of these is a real fork. The answer changes what gets built, not just what
gets written down.

**Q1 · Which column is a registration fee read at — `CTD` or `SELL`?**
`Trailer Module!BZ` reads ordinal 9 (`K SELL` = 283.00). `Managers View!G23`
reads ordinal 8 (`J CTD` = 282.19) for the same trailer on the same deal. One of
those is the policy and the other is a counting error. Answering it fixes 81
cents on every trailer and tells us which column our seeded table's join reads.
**If the answer is "cost — we pass it through at what it costs us", say so, and
`3rd Party Recovery` becomes the app's word too.**

**Q2 · What is `Serv Cost` on `Oils and Lubes`?** Column `F` and column `H CTD`
are both costs and diverge unpredictably where both are present: `7.41 / 7.41`,
`6.15 / 13.45`, `2.09 / 2.20`, `1.24 / 1.50`, `2.00 / 3.50`. Five pairs, five
ratios, no formula on either side — and the service schedules read `F`, not `H`.
Is `Serv Cost` an older cost, a landed cost, or a service-department transfer
price? Until this is answered, our consumables table carries both columns and
prices with neither.

**Q3 · Is a workshop hour costed at $105 or at $130.09?** `Labour Rates!E9 = 105`
drives 1,727 service costings; `!G14 = 130.0909` drives every other module. Both
are labelled `CTD`, they are 23.9 % apart, and both feed a gross profit that
management reads. A 6-cylinder 1,000-hour service is costed at $997.50 on one
sheet and $1,235.86 on the other.

**Q4 · Does a customer see pre-delivery at cost or at recovery?**
`Managers View!D20 = 3,756.68` is the build; `D33 = 4,960` is the charge, being
cost + 29 % with GST on the margin only. A computed PD line must be one of them,
and the difference on the worked boat is $1,203.32. Related: `Boat Module!TC`
computes a **third** number for the same boat (labour only, rounded up to $100 —
$3,600 on row 188). Which of the three is "the pre-delivery"?

**Q5 · Does boat registration belong inside the hull price or beside it?** The
trailer folded it into `Sell inc Rego`; the boat did not, and the quote sheet
publishes both rungs (`D41 = 110,600` hull only, `D42 = 111,014` hull plus rego).
Two products, two answers, one concept. If the answer is "beside it, always",
then the trailer's `Sell inc Rego` is the odd one out and we should say so on the
column rather than quietly working around it.

**Q6 · What distinguishes Sundry 1, Sundry 2 and Sundry 3?** They are marked up
100 %, 90 % and 80 % (`Operation Codes!$O$6`, `$P$6`, `$Q$6`) and **no column
anywhere records which bucket a cost belongs in.** Ten percentage points of price
live in someone's head. And the sublet markup is 15 % everywhere except rows 59
and 60 — the two registration rows — which hardcode 30 %. Is that a policy or a
leftover?

**Q7 · Which service plan is the business's?** Seven events, 600 hours,
72 payments (Motor Module); or fifteen services, 1,400 hours, 60 payments
(`Std Service Schedules!AQ1`). Same manufacturer, same motors, same 2.5 % index,
both live, and a customer can be quoted either.

**Q8 · When the labour rate changes, what should our copy do?** Follow the
workbook automatically on the next import, or wait for a person to accept the
change with the count of what it moves in front of them? §2.6 recommends the
second. The answer decides whether we build a diff screen or a refresh button —
and it is worth knowing that today `Boat Module!JO` follows on 1,434 rows and
does not follow on 571.

**Q9 · Who may edit a rate?** There are no roles in the app
(`MODULE_SYSTEM §5`), and a rate table is the one table where "everyone using
this browser can edit" is uncomfortable. If the answer is "only Colin", that is
the first genuine requirement for roles this project has produced, and it should
be recorded as such rather than solved by hiding a table.

## 6.3 What was not verified

- **Nothing was run.** No dev server, no typecheck, no browser. Every claim about
  this repo is read from source with Read and Grep. `src/demos/northside.ts` was
  never touched by a shell tool.
- **`Operation Codes` was not re-read for this document.** Every figure about it
  — the 366 coded rows, the `PDTR` hours, the `DEC-REG-*` prices, the sundry
  factors — comes from `scratchpad/study-service.md §4`, which read it directly.
- **`Parts Maintenance` was not opened.** The claim that ordinal 7 is its `CTD`
  column rests on `QUOTE_SPEC §2.2`'s existing citation plus the ordinal
  arithmetic verified three ways in §2.3.
- **The Yamaha price file was not opened.** All 5,014 part rows are read from the
  cache inside the Service Module, dated `12.05.2025` in a file saved
  `2026-08-10`.
- **`Registration Module.xlsx` may not be the copy the modules link to.** The
  Trailer Module's `[3]` and the quote template's `[10]` both resolve to a
  SharePoint URL ending `Registration%20Module.xlsx`; the local 20 KB copy
  matches the cached values cell for cell, which is strong but not proof of
  identity. It was last saved 2025-10-16 and says `AS at 1/7/25`.
- **The `+25.7` inside the four boat registration formulas is unexplained.** It
  is a literal, it is labelled nowhere, and this document does not guess.
- **The nine ATM violations were not re-derived**; they are attributed to
  `MPF_GROUND_TRUTH §14`.
- **The worked example is one boat in one file.** `Boat Module (5).xlsx` row 188
  and `11111BMT - Quote Module 2026.xlsx` disagree about `Boat Detailing ($)`
  (10 versus 30) and about three of five pre-delivery parts — which is §2.6's
  point, and which means the arithmetic in §2.4 reconciles **within** the quote
  workbook and is not a claim about what the boat's inputs are today.
- **Probes.** `p1`–`p11` under the session scratchpad. All read-only; every
  workbook opened with `zipfile.ZipFile` and closed; none written, moved or
  renamed.
