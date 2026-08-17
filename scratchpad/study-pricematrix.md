# THE PRICE MATRIX — four numbers and forty-seven rows that set every price

> Read-only study of `C:/Users/AsafA/Downloads/Price Matrix.xlsx`
> (**35,212 bytes**, created 2025-02-13T05:37:13Z, last saved
> **2026-07-17T04:10:36Z** by **Colin Kean**, last printed 2026-05-14).
> Nothing was written, moved or renamed. Every figure below carries the cell it
> came from.
>
> **ASSERTED** = a formula, a validation, a stated header, a rate typed into a
> rate table, a protection flag. **OBSERVED** = a pattern in the values, always
> with a count. The word *usually* does not appear as a finding.
>
> Cross-workbook consumption is read from `docs/specs/MPF_GROUND_TRUTH.md`
> (the Master Price File audit) and re-verified against the raw
> `externalLink*.xml` parts of the three sibling workbooks.
>
> **Note on the brief.** `docs/specs/QUOTE_SPEC.md` does not exist in this repo.
> The documented price ladder lives in `docs/specs/MPF_GROUND_TRUTH.md` §6 and
> the quote-side rules in `docs/specs/QUOTE_FINDINGS.md`. Both are cited below.

---

## 0. The one thing to take from this file

This is the **smallest workbook in the Master Price File and the one with the
widest blast radius.** 35 KB. Three sheets. 47 data rows and 4 exchange rates.

Every hull price in the catalogue is `landed cost ÷ one of four numbers on
sheet 2`, then `× one of seven percentages on sheet 1`. Change `Exchange
Rates!F11` from `1.2` to `1.25` and every Surtees landed cost, Cash, Trade, Sub
Dealer, Sub (Exclusive), AUS Sailing and Warranty price moves — retroactively,
silently, with nothing recording that it did.

And the business knows it. **ASSERTED — both rate sheets are password-locked
with ZERO unlocked cells.** `sheet1.xml` (Price Matrix) and `sheet2.xml`
(Exchange Rates) each carry
`<sheetProtection algorithmName="SHA-512" spinCount="100000" sheet="1"
objects="1" scenarios="1"/>`, the workbook carries
`<workbookProtection … lockStructure="1"/>`, and a cell-by-cell scan of all
three sheets finds **0 unlocked cells on Price Matrix, 0 on Exchange Rates, and
82 on Exchange Rate Calculator** (`E4`, `F5`, and `D10:E49` — the 40 input line
pairs).

That is the business's own answer to the owner's question, written in the file
format. **Nobody browses these. Nobody edits them in place. One person unlocks
them after a named meeting.** The third sheet is the only thing anyone touches,
and it is a scratchpad.

---

## 1. The workbook at a glance

| # | Sheet | Live range | What one row is | Unlocked cells |
|---|---|---|---|---|
| 1 | **Price Matrix** | `C3:U70`, 47 data rows | one brand or supplier, and the seven percentages that price it | **0** |
| 2 | **Exchange Rates** | `C9:H13`, 4 data rows | one currency, its rate and its review date | **0** |
| 3 | **Exchange Rate Calculator** | `C2:G52` | *(not a row list — a per-invoice scratchpad)* | 82 |

**ASSERTED — no Excel Table object, no autofilter, no data validation, no
defined name other than three `Print_Area`s** (`'Price Matrix'!$C$3:$P$70`,
`'Exchange Rates'!$C$4:$F$14`, `'Exchange Rate Calculator'!$C$1:$G$52`).
Three merged label banners, layout only.

A sheet with a print area, no filter, no validation and no editable cell is a
**printed reference**, not a working list. Hold that thought for §11.

---

## 2. THE PRICE MATRIX SHEET — what a row is, and what the axes are

### 2.1 The answer to "what does it map FROM and TO"

**FROM:** a brand or supplier name, column `C` — 47 distinct values, and the
lookup key of the whole file.
**TO:** seven percentages, plus two labels and a date.

It is **not** a two-dimensional grid. It is **one-dimensional: brand → a margin
ladder.** The "matrix" in the name is the row × audience shape when you read the
header across, not a cross-product.

**ASSERTED — the author wrote the ordinals into row 6.** Row 6 holds literal
integers over the columns, and they are the VLOOKUP indices every other workbook
uses:

| Ord | Col | Header (row 7) | What it holds | Semantics |
|---|---|---|---|---|
| 1 | C | **Brand** | the lookup key | — |
| 2 | D | Franchise Code | `9SC`, `9HI`, `BLA`… | — |
| 3 | E | *(blank spacer)* | — | — |
| 4 | F | Exchange Rate | a **currency label**: `$A` / `$NZ` / `Euro` | — |
| 5 | G | BMT Labour Rate | the word `Internal` | selector |
| 6 | H | Retail Labour Rate | the word `Retail` | selector |
| 7 | I | **Reviewed** | a date | governance |
| 8 | J | **CTD** | 0 – 50 % | markup on supplier cost |
| 9 | K | Other | 0 – 47.5 % | markup on landed cost |
| 10 | L | **Sub Dealer** | 0 – 22 % | **discount off Cash** |
| 11 | M | **Trade** | −5 % – 22 % | **discount off Cash** |
| 12 | N | **Sell** | 10.5 – 47.5 % | **markup on landed cost** |
| 13 | O | Factory Options | 15 – 50 % | markup |
| 14 | P | Dealer Fit Options | 18 – 30 % | markup |
| *15* | *Q* | *(reserved — empty on all 47 rows)* | — | — |
| 16 | R | Warranty Allowance | 0 or 0.5 % | adjustment |
| 17 | S | Admin Load | 0 on all 47 rows | adjustment |
| — | U | Notes | free text | — |

**ASSERTED — two opposite semantics in one row, and the sheet says so.**
`L1` = *"NB: Trade/Sub Dealer Pricing is Discount off Retail"*. So columns 10 and
11 subtract from a price; columns 8, 9, 12, 13, 14 add to a cost. Nothing in the
column headers distinguishes them. A reader who applies "Trade 5 %" as a markup
gets the wrong number by a factor of the whole margin.

**And the same cell is used both ways.** `M23` (Yamaha's *Trade*, `7.50 %`) is a
**discount** by `L1`'s rule — but `Motor Library!BL Trade Price =
ROUNDUP(($AX+($AX * '[3]Price Matrix'!$M$23)) * 1.1, )` uses it as a **markup on
cost** (`MPF_GROUND_TRUTH.md:942`). *One cell in another workbook sets every
trade motor price*, and it reads that cell against the stated convention.

### 2.2 The three blocks stacked in one sheet

The 47 rows are not one list. They are three, separated by blank rows 15, 22,
26, 56, 57, 60, plus an eighth block below:

| Rows | n | What they are |
|---|---|---|
| 8–14 | 7 | **boat brands** — Stabicraft, Stacer, Surtees, Jeanneau, Merry Fisher, Haines Signature, Highfield Inflatables |
| 16–21 | 6 | **trailer brands** — Trailers (generic), Redco/Tinka, Dunbier, Mackay, Stacer Trailers, GFab |
| 23–25 | 3 | **Yamaha, Yamaha (Accessories), Rigging Kits** |
| 27–55 | 29 | **categories and resale suppliers** — Accessories/Options, Electronics, BLA, SAW, Garmin, Volvo, ePropulsion, Frank Marine, Hella, Narva … |
| 58–59 | 2 | **Sublets, Administration** (bookkeeping keys) |
| 61–69 | 8 | **Retail Sliding Scale** — a *price-band* ladder, not a brand |

**Row 59 `Administration` is the escape hatch.** Every percentage on it is `0`.
It is a Matrix key a boat row can carry to mean *do not mark this up* —
`MPF_GROUND_TRUTH.md:171` records `Administration 1` as a live Boat Module
brand-key value.

### 2.3 The Retail Sliding Scale (rows 61–69) — a second, different mechanism

**ASSERTED.** Eight bands, values written into columns `K` (ord 9) and `N`
(ord 12) — the same two columns the brand block uses for markups:

| `C` band label | `K` = `N` |
|---|---|
| Retail - up to $ 10.00 | 100.00 % |
| Retail - $ 10.01 up to $ 25 | 90.00 % |
| Retail - $ 25.01 up to $ 35 | 80.00 % |
| Retail - $ 35.01 up to $ 50 | 70.00 % |
| Retail - $ 50.01 up to $ 100 | 60.00 % |
| Retail - $ 100.01 up to $ 500 | 50.00 % |
| Retail - $ 500.01 up to $ 1000 | 40.00 % |
| Retail - $ 1000.01 up to $ 2500 | 30.00 % |

A declining markup by cost band — 100 % on a $10 part, 30 % on a $2,000 one.

**ASSERTED — the ladder stops at $2,500 with no band above it.** A $3,000 part
falls off the end.
**OBSERVED — no consumer is evidenced.** The seven Price Matrix ordinals
recorded as read by the Master Price File (`MPF_GROUND_TRUTH.md:893-897`) are
10, 11, 12, 13, 14, 16, 17 keyed on **brand**, plus `M23`. Nothing in that audit
looks up a band label. This block may be a published policy that no formula
implements. It is worth putting that question to the owner directly.

---

## 3. THE ORDINAL CONTRACT — six of seven confirmed exactly

`MPF_GROUND_TRUTH.md:893-897` lists the ordinals the Boat Module uses. Against
the header this workbook actually carries:

| MPF says | Header at that ordinal | Match |
|---|---|---|
| col 10 = Sub Dealer % | `L` **Sub Dealer** | ✅ |
| col 11 = Trade % | `M` **Trade** | ✅ |
| col 12 = HO/BMT markup | `N` **Sell** | ✅ (the hull markup `JF`) |
| col 13 = Factory Options markup | `O` **Factory Options** | ✅ |
| col 14 = Dealer Fit markup | `P` **Dealer Fit Options** | ✅ |
| col 16 = Warranty Adj | `R` **Warranty Allowance** | ✅ |
| col 17 = Admin Load | `S` **Admin Load** | ✅ |

The convention is confirmed independently by the sibling sheet:
`Boat!IJ EX Rate = VLOOKUP(II,'[1]Exchange Rates'!$C:$ZZ,4,0)` and column 4 of
*Exchange Rates* counting from `C` is `F` = **Rate**. Ordinal 1 = column C.

**And the arithmetic closes.** `MPF_GROUND_TRUTH.md:889-891` works boat row
`HBS113` (Highfield): Cash `41,340` → Trade `39,273` → Sub Dealer `34,105`.
Against Highfield's row 14 in this workbook:

```
M14 Trade      = 5.00 %   →  41,340 × (1 − 0.05)   = 39,273.0    ✅ exact
L14 Sub Dealer = 17.50 %  →  41,340 × (1 − 0.175)  = 34,105.5
                             ROUNDDOWN               = 34,105     ✅ exact
```

**This is the receipt for a defect we have already shipped around.**
`HELMLOGIC_GROUND_TRUTH.md:187` records the app's price ladder as
`Trade = Cash × 0.95 · Sub Dealer = Cash × 0.825`. Those are not constants.
**They are Highfield's row 14, hardcoded.** Every other brand in the file has
`Trade = 0 %` and `Sub Dealer = 0 %` (rows 8–13), so the app's "constants" price
six of seven boat brands wrong by the full trade discount.

### 3.1 The one ordinal that does not resolve — flag, do not guess

`MPF_GROUND_TRUTH.md:1007-1008` records `Parts Maintenance!H Landing MU ←
'[1]Price Matrix' col 7`. Anchored at `C`, ordinal 7 is `I` **Reviewed** — a
date. A date cannot be a landing markup.

Anchored at **`D` (Franchise Code)**, ordinal 7 is `J` **CTD**, whose 47 values
are `{0, 5 %, 7.5 %, 10 %, 15 %, 20 %, 50 %}` — BLA 20 %, Garmin 10 %,
Inflatable Boat Centre 5 %, Frank Marine 50 %. That is exactly a per-supplier
landing markup, and parts are keyed by **supplier code**, not brand name.

**OBSERVED, unresolved.** I did not read the Parts Module formula (it is not one
of the four workbooks). Either reading proves the same point: *the ordinal is a
bare integer with no name attached, and which column it lands on depends on
where the range starts.* `MPF_GROUND_TRUTH.md:1223-1226` already names this as
the file's structural fault — *"inserting one column in any of those files
silently repoints every lookup."*

---

## 4. FIVE DEFECTS IN THE MATRIX, all countable

### 4.1 25 of 47 rows return **text** from every percentage column

**ASSERTED**, by type inspection of columns `K` `L` `M` `N` `O` `P` across the
47 data rows — every one of the six has the identical distribution:

| Content | Rows | Consequence of `price − price × VLOOKUP(…)` |
|---|---|---|
| a number | **22** | works |
| the literal string `"RRP"` | **17** | `#VALUE!` |
| a non-breaking space `U+00A0` | **8** | `#VALUE!` |

The 17 `RRP` rows are the resale suppliers (BLA, SAW, Marine Warehouse,
Supercharge, Century, Oceansouth, Bargain Boat Bits, Sarca, EJ Milde, Frank
Marine, RW Marine, Hella, Narva, IBC, Salty Captain, Permatrim, Sublets) — the
business's shorthand for *sell at recommended retail, no matrix margin*. It is a
**mode flag typed into a numeric field.** The 8 `U+00A0` rows are the marine
electronics brands (Garmin, Lowrance, Simrad, Raymarine, Fusion, GME, Minn Kota,
Momentum) — they *look* empty and are not.

This is the single most important thing to carry forward as a **type**: the
ladder needs a `mode` per rung (`markup` · `discount` · `RRP` · `not set`), not a
percent column that people write words into.

### 4.2 Two live boat brands have no row at all

**ASSERTED — `Formosa` and `Cap Camarat` do not appear in column `C`.** Both are
live Boat Module brands: `MPF_GROUND_TRUTH.md:170-171` counts **Formosa 39**
live SKU rows, `:133` records `R248 Cap Camarat` as a brand banner, and
`FITMENT_RULES.md` §1.2 measures Formosa at 92/92 and Cap Camarat at 5 trailer
pairings. If column `E` on those rows carries those literal strings, every
Trade / Sub Dealer / markup VLOOKUP on them returns `#N/A`.

### 4.3 The Franchise Code is not unique

**OBSERVED — 47 rows, 44 distinct codes.** `9ST` is both *Stacer* and *Stacer
Trailers*; `9JE` is both *Jeanneau* and *Merry Fisher*; `9YA` is both *Yamaha*
and *Rigging Kits*. The lookups key on column `C` (Brand), which **is** unique.
Any migration that keys on the code instead collides three ways — and the three
collisions have different percentages (`N9` 10.5 % vs `N20` 20 %; `N23` 11.5 %
vs `N25` 25 %).

### 4.4 Three columns that are not data

**OBSERVED across 47 rows:**

- `G` **BMT Labour Rate** — `Internal` on 47 of 47. **1 distinct value.**
- `H` **Retail Labour Rate** — `Retail` on 47 of 47. **1 distinct value.**
- `F` **Exchange Rate** — `$A` on 44, `Euro` on 2, `$NZ` on 1. **3 distinct
  values**, and it is a *currency name*, not a rate.

`G` and `H` are selectors that select the same thing every time — they name
which Service Module rate to use (`$130.0909/hr` cost vs `≈$159/hr` retail,
`MPF_GROUND_TRUTH.md:115-116`). A constant dressed as a column.

`F` is worse: it uses a **different vocabulary from the sheet it names**.
*Exchange Rates* column `C` holds `AUD` · `NZ` · `USD` · `EURO`; this column
holds `$A` · `$NZ` · `Euro`. Neither `$A` nor `Euro` would match. **OBSERVED —
ordinal 4 is not among the ordinals the Master Price File reads**, so the
mismatch is currently harmless; the boat row carries its own currency in `II`.
It is a trap for anyone who assumes the matrix is the source of a boat's
currency.

**And it disagrees with reality.** `F14` says Highfield Inflatables is `$A`.
Highfield hulls ship from **Qingdao** priced in **`$US`** (`Freight Module`
`FCL Import - Highfield!C9`, `E10`) and the Parts Module's Highfield sheet
converts at the **USD** rate (`G1 = '[1]Exchange Rates'!$F$12 = 0.7`,
`MPF_GROUND_TRUTH.md:1039`).

### 4.5 One row where `Other ≠ Sell`, and it is the biggest brand

**OBSERVED — across all 47 rows, `K` equals `N` everywhere except row 14.**
On 30 rows it is literally `=N{row}`; on 16 it is a typed duplicate; on
Highfield alone `K14 = 45.00 %` and `N14 = 47.50 %`.

The boat row carries **two** general markup columns (`HO - MU`, `BMT - MU` —
`MPF_GROUND_TRUTH.md:264`, and already in our own `boat` kind at
`src/types/model.ts:317-318`). The matrix carries **two** general markup columns
(`K` ord 9, `N` ord 12). MPF only documents ordinal 12 as read, and describes it
as *"HO/BMT markup"* — collapsing two into one. Which of `K`/`N` feeds `BMT - MU`
is **unresolved**, and Highfield is the only row where the answer changes the
price. Ask the owner; do not infer.

### 4.6 Nothing here is nothing

`S` **Admin Load** is `0` on all 47 rows, with `U2` stating why: *"NB: All Admin
Loads removed 18.08.2025 as per MM / JF Request"*. `R` **Warranty Allowance** is
`0` on 45 rows and `0.50 %` on exactly two (Jeanneau `R11`, Merry Fisher `R12`).

Two columns that carry information on 2 rows out of 94 cells. Keep them as
ladder rungs with a default of 0 — do **not** drop them, because the note proves
the business turns them on and off deliberately.

---

## 5. EXCHANGE RATES — four numbers, and they are the floor of the catalogue

**ASSERTED**, `Exchange Rates!C9:H13`:

| `C` Currency | `D` Review Date | `F` Rate | `H` Notes |
|---|---|---|---|
| AUD | `=TODAY()` *(volatile — cached 2026-07-17)* | `1` | — |
| NZ | 2025-11-10 | `1.2` | *As per discussion with MM 12.05.2026* |
| USD | 2025-06-11 | `0.7` | *As per discussion with MM 12.05.2026* |
| EURO | 2025-04-10 | `0.6` | *As per discussion with MM 12.05.2026* |

**ASSERTED — the direction is foreign-units-per-1-AUD, and it is division.**
`Boat!IY = (SUM(IM:IV)/IJ)+IW+IX` (`MPF_GROUND_TRUTH.md:861-865`);
`Quadrant Pacific - Surtees!I15 = F15/H15` where `H15 = '[1]Exchange Rates'!$F$11`;
`Parts!Highfield H = G(USD)/$G$1` (`:1040`). So 1 AUD = 1.20 NZD = 0.70 USD =
0.60 EUR.

### 5.1 Three staleness signals, and all three disagree

**ASSERTED, measured against the file's own last-save date, 2026-07-17:**

| Rate | Review Date | Days stale at last save |
|---|---|---|
| EURO `0.6` | 2025-04-10 | **463** |
| USD `0.7` | 2025-06-11 | **401** |
| NZ `1.2` | 2025-11-10 | **249** |
| AUD `1` | `=TODAY()` | structurally meaningless |

And the **note on all three says `12.05.2026`** — a date *after* every review
date. Either the notes were updated without touching the review date, or the
review dates were never advanced. The file's two staleness signals contradict
each other, and neither gates anything.

On the Price Matrix side it is the same story. **ASSERTED — of 47 rows, only 15
carry a `Reviewed` date; the other 32 hold `U+00A0`.** And there are only two
distinct dates in the whole column:

- **2025-03-05** — all 7 boat brands and all 6 trailer brands (13 rows)
- **2025-05-27** — Yamaha and Yamaha (Accessories) (2 rows)

**Every boat brand margin in this business was last reviewed 499 days before the
file was last saved.** Rigging Kits, all 29 supplier rows, Sublets and
Administration have never been dated at all.

---

## 6. THE EXCHANGE RATE CALCULATOR — what it is actually for

It is **not** a rate table and **not** a converter. It is a **per-invoice landed
cost allocator that back-solves the rate the business actually got.**

**ASSERTED**, the whole mechanism in four cells:

```
E4  Nett Factory Invoice Price        82,897.60    ← operator types (unlocked)
F5  Converted Factory Invoice Price   66,142.64    ← operator types (unlocked)
F7  "Actual Exchage Rate"  = E4/F5  = 1.2533155616…   ← derived, locked
F10:F49  Converted        = E{n}/$F$7                 ← derived, locked
E51/F51  Totals           = SUM(E10:E49) / SUM(F10:F49)
E52      = E51 − E4       "Outstanding from Initial Invoice Totals"
F52      = F5  − F51
```

The operator pastes an invoice's 40 lines in the foreign currency, types the
invoice header total and **the AUD figure that actually left the bank**, and the
sheet spreads the real, achieved rate across every line. `E52`/`F52` are a
reconciliation check: *do the lines add up to the invoice?*

**The unlocked-cell map proves the design.** 82 unlocked cells and no others:
`E4`, `F5`, and `D10:E49` (description + factory price, 40 rows). Everything
else — the rate, every conversion, both totals, both reconciliations — is locked
derived output.

### 6.1 What it is FOR: landing an imported hull. And it indicts the standing rate.

**OBSERVED.** `F7 = 1.2533` is greater than 1; NZ is the only currency in the
file with a rate above 1 (`F11 = 1.2`), and Surtees is the only `$NZ` brand
(`Price Matrix!F10`). The worked invoice is therefore an NZD hull invoice —
almost certainly Surtees. It carries two negative lines (`E39 = −2,800`,
`E40 = −1,262.40`), i.e. factory credits, which is what a hull invoice looks
like and not what a motor or a parts order looks like.

**And this is the whole staleness argument in one arithmetic step — ASSERTED,
from `E4`, `F5` and `F11`:**

```
standing rate     F11        = 1.2000
actual rate       E4/F5      = 1.2533155616…       +4.44 %

cost at standing  82,897.60 / 1.2      = AUD 69,081.33
cost actually     F5                   = AUD 66,142.64
                                         ─────────────
overstatement                            AUD  2,938.69   on ONE hull
```

The standing rate makes that hull look **$2,938.69 more expensive than it was**.
At Surtees' own `N10 Sell` markup of 21 % and GST — DERIVED, arithmetic only —
that is `2,938.69 × 1.21 × 1.1 ≈ $3,911` of Cash price on one boat, in the wrong
direction, from a number 249 days old.

The business built a tool to measure this gap. **Nothing writes the answer back
to `Exchange Rates!F11`.** There is no formula, no link, no macro. The sheet
measures the error and then forgets it.

### 6.2 What it is NOT

- No shipment number, no invoice number, no supplier, no date, **no currency
  label anywhere on the sheet**. (Compare `Freight Module!FCL Import -
  Highfield!D7` which does carry `Shipment S00169820`.)
- Exactly **40 line slots**, hardcoded `C10:C49`. Invoice 41 lines does not fit.
- **No link to any boat row.** The AUD it computes per line is never joined back
  to the SKU it belongs to.
- **Single-use.** One invoice at a time; the next invoice overwrites it.

---

## 7. WHO READS IT — the complete consumer map

Verified two ways: `MPF_GROUND_TRUTH.md`, and by parsing
`xl/externalLinks/externalLink*.xml.rels` in each sibling workbook. All three
external references resolve to the same SharePoint URL —
`…/NSMMasterPriceFile/Shared Documents/General/Master Price File/Price Matrix.xlsx`.

**ASSERTED — one workbook, three different external indices.** Same trap
`study-service.md` §0 named for the Service Module:

| Consuming workbook | Price Matrix is | Verified in |
|---|---|---|
| Boat Module | `[1]` | `MPF_GROUND_TRUTH.md:877` |
| Motor Module | `[3]` | `MPF_GROUND_TRUTH.md:942` |
| **Freight Module** | `[1]` | `externalLink1.xml.rels` |
| **Rigging Module** | `[3]` | `externalLink3.xml.rels` |
| Parts Module | `[1]` | `MPF_GROUND_TRUTH.md:1008, 1039` |

Grepping for `[1]Price Matrix` finds two of five consumers.

### 7.1 The Price Matrix sheet — every consumer, by cell

| Consumer | Formula | Ordinal → column |
|---|---|---|
| `Boat!QT Trade` | `=ROUNDDOWN($QR-($QR*VLOOKUP($E,'[1]Price Matrix'!$C:$ZZ,11,0)),)` | 11 → `M` |
| `Boat!QV Sub Dealer` | `…VLOOKUP($E,…,10,0)…` | 10 → `L` |
| `Boat!JF HO/BMT - MU` → `QR Cash` | ordinal 12 | 12 → `N` |
| `Boat!JH Factory Options - MU` | ordinal 13 | 13 → `O` |
| `Boat!JI Dealer Fit Options - MU` | ordinal 14 | 14 → `P` |
| `Boat!JK Warranty Adj` | ordinal 16 | 16 → `R` |
| `Boat!JJ Admin Load` | ordinal 17 | 17 → `S` |
| **`Motor!BL Trade Price`** | `=ROUNDUP(($AX+($AX*'[3]Price Matrix'!$M$23))*1.1,)` | **`M23` — one cell, every trade motor price** |
| `Parts Maintenance!H Landing MU` | ordinal 7 — see §3.1 | `I` or `J`, unresolved |

`MPF_GROUND_TRUTH.md:593` records these ordinals being **"re-looked-up 1,387
times"** onto the boat rows.

### 7.2 The Exchange Rates sheet — every consumer, by cell, with counts

| Consumer | Cell read | Count | Formula shape |
|---|---|---|---|
| `Boat!IJ EX Rate` → `IY Landed Hull Cost` | `F10:F13` via VLOOKUP ord 4 | **1,434 boat rows** | `=VLOOKUP(II,'[1]Exchange Rates'!$C:$ZZ,4,0)` |
| `Parts Module!Highfield!G1` | `$F$12` USD | 1, feeds the whole sheet | `H AUD = G/$G$1` |
| **Freight** `Quadrant Pacific - Surtees` | `$F$11` NZ | **13 cells** (`H10`, `H15:H27`) | `I{n} = F{n}/H{n}` |
| **Freight** `FCL Import - Highfield` | `$F$12` USD | 1 cell (`H10`) | `F10 = I10*H10` |
| **Rigging** `Rigging Kits!G` | `$F$11` NZ | **17 cells**, rows 671–693 | `=380/'[3]Exchange Rates'!$F$11` |
| **Rigging** `Rigging Kits!H` | `$F$13` EURO | **67 cells**, rows 696–782 | `=((F+G)/'[3]Exchange Rates'!$F$13)*1.05` |

**84 cells in the Rigging Module divide by a rate in this workbook** — closing
part of the hole `FITMENT_RULES.md` Appendix B §2 named. The EURO ones also
carry a bare `×1.05` loading with no label.

### 7.3 One rate, two directions — a real asymmetry in the Freight Module

**ASSERTED.** The two freight sheets use the same rate in opposite operations,
and only one of them is rate-sensitive:

```
Quadrant Pacific - Surtees (NZD)          FCL Import - Highfield (USD)
I10 = F10 / H10   ← H10 = F11 (1.2)       F10 = I10 * H10   ← H10 = F12 (0.7)
I15:I27 = F/H     ← 13 more                I15:I25 = F*G     ← H = 1 (all AUD)
I29 Sub Total = SUM(I15:I28)               I29 Sub Total  = 2,851.50
I31 = I29+I12         = 4,496.125          I31 = I29+I12  = 8,233.78
I32 Freight Buffer  = I31 * 5 %            I32 Buffer     = I31 * 10 %
I34 SEAFREIGHT CTD  = 4,720.93             I34 CTD        = 9,057.16
I35 per linear metre = I34/10.7 = 441.21   I35 = I34/70.5 = 128.47
```

Quadrant's `I35` **moves when `F11` moves** — every NZD line divides by it.
Highfield's `I35` **does not**: `I10` is a typed AUD figure (`5,382.28`) and the
`$US` cell `F10` is derived *from* it for display. Changing `F12` changes only
what the sheet shows, not what it costs.

And `Boat!IX Road Freight = ROUNDUP(G * '[9]FCL Import - Highfield'!$I$35, -1) +
250|1100|2000` (`MPF_GROUND_TRUTH.md:863`) — so the per-metre freight rate is a
*second* path from this workbook into the boat cost base, for Surtees.

Two sheets, one rate cell, opposite direction, opposite sensitivity, different
buffer (5 % vs 10 %). Nothing on either sheet records which convention it uses.

---

## 8. THE CRITICAL QUESTION — does our documented price ladder depend on this?

**Yes. Completely. Every rung.**

```
   Exchange Rates!F11 · F12 · F13          Price Matrix!L · M · N · O · P · R · S
   (three numbers)                         (seven percentages × 47 rows)
        │                                        │
        ▼                                        │
   Boat!IJ EX Rate  ──▶ Boat!IY LANDED HULL COST │   1,434 rows
        │             = (SUM(IM:IV)/IJ)+IW+IX    │
        │                    │                   │
        │              ┌─────┴───────────────────┴──────────────┐
        │              ▼                                        ▼
        │        QR Cash = ROUNDUP((IY+(IY*JF))*1.1,-1)    ord 12 (N Sell)
        │              │
        │              ├─▶ QT Trade        = QR − QR×ord 11 (M)
        │              ├─▶ QV Sub Dealer   = QR − QR×ord 10 (L)
        │              ├─▶ QX Sub (Excl)   = QV − QV×2.5 %
        │              ├─▶ QZ AUS Sailing  = QR − QR×15 %
        │              └─▶ RB Warranty     = ROUNDUP((IY−IW)×1.01×1.1,)
        │
        ├──▶ Freight Quadrant I15:I27 ─▶ I35 /m ─▶ Boat!IX Road Freight ─▶ IY
        ├──▶ Rigging Kits G (17) + H (67) ─▶ every NZ/EURO rigging kit cost
        └──▶ Parts Highfield G1 ─▶ H AUD ─▶ P Retail ─▶ L Trade

   Price Matrix!M23 (ONE CELL) ──▶ Motor!BL Trade Price, all 485 motor rows
```

**So: three exchange-rate cells and seven percentage columns set the cost floor
and every margin above it, for the entire catalogue.** `IY` is, in
`MPF_GROUND_TRUTH.md:868`'s words, *"the cost base for **every** margin in the
boat module."*

And they are load-bearing in the strict sense: **an FX rate is not an input to
one price, it is a multiplier on the base of every price.** A 4.44 % rate error
(§6.1) is a 4.44 % error in landed cost, which propagates *undamped* through
Cash, Trade, Sub Dealer, Sub (Exclusive), AUS Sailing and Warranty, and through
GP % on all six.

---

## 9. A RATE HAS A DATE — what the workbook does about it today

**Nothing. ASSERTED, exhaustively:**

1. **`Boat!IJ` is a live VLOOKUP, not a stored number.** Change `F11` and every
   Surtees hull recomputes on the next calculation chain. The old value is not
   retained anywhere.
2. **No rate history.** One row per currency. Four rows, forever. No effective-
   from, no effective-to, no prior value.
3. **No stamp on the priced row.** The boat row stores `IJ` as a *formula*, not
   as a value. There is no "landed at" date and no "rate used" column that
   survives a recalculation.
4. **The `Review Date` column gates nothing.** It is a plain date beside a plain
   number, in a column no formula reads, on a sheet where it has been 249–463
   days stale (§5.1).
5. **The Calculator measures the error and discards it** (§6.1).
6. **`calcPr concurrentCalc="0"`** and no `updateLinks` directive — so when the
   file is opened, Excel prompts to refresh external links. Whether last week's
   quote used last week's rate depends on whether the person clicked *Update*.

**What happens to a quote frozen at one rate when the rate moves?** In the
workbook: there is no frozen quote. There is a sheet that recalculates. The
"quote" is a printout, and the only record that a printout was ever produced is
`docProps/core.xml`'s `<cp:lastPrinted>2026-05-14T05:12:59Z</cp:lastPrinted>`.

**Our app already has the correct answer and must extend it one field.**
`QUOTE_FINDINGS.md` §2.1 — *"Snapshot on commit… SNAPSHOT stored sells, never
recompute"* — and §2.2 — *"Snapshots carry provenance."* The brief says each
quote line already records the column and cell its price came from. **A line
whose price passed through an FX conversion must also freeze the rate, the
currency and the rate's review date.** That is three fields on the existing line
model, not a new table, and it is the difference between *"this boat was quoted
at $41,340"* and *"this boat was quoted at $41,340, landed at NZD/AUD 1.20 dated
2025-11-10."*

Without it, `QUOTE_FINDINGS.md` §3.5's failure mode repeats exactly: a governance
value written somewhere nothing reads.

---

## 10. WHAT THIS WORKBOOK DOES **NOT** CONTAIN — worth stating

- **No prices.** Not one dollar figure in the brand block. It is percentages
  only. It is not a price-level table.
- **No GST.** The `×1.1` is hardcoded in the consuming workbooks
  (`MPF_GROUND_TRUTH.md:1049`) and `QUOTE_FINDINGS.md` §3.7 records
  `GST_MULTIPLIER = 1.1` re-hardcoded in **seven** app files while
  `organisation.gstPercentage` sits unused. **This workbook is not the home of
  GST and never was.** Do not put it here.
- **No labour rates.** `G` and `H` *name* rates that live in the Service Module.
- **No customer, no dealer, no territory.** "Sub Dealer" is a *price level*, not
  a party. There is no list of sub-dealers anywhere in this file.
- **No rounding rule.** `ROUNDDOWN`/`ROUNDUP` and their precision live in the
  consuming formulas, and `MPF_GROUND_TRUTH.md:875` records **four different
  Cash rules coexisting**. The matrix supplies a percentage and nothing else.

**One reconciliation that did NOT close, stated plainly.** The `HBS113` Cash
figure `41,340` against landed `25,010.00` implies a markup of ~50.25 %, which
matches no Price Matrix percentage on Highfield's row (`N14` 47.50 %, `K14`
45.00 %, `O14` 50.00 %). Trade and Sub Dealer close to the cent (§3); Cash does
not. This is consistent with `MPF_GROUND_TRUTH.md:875`'s finding that four
independent Cash rules are live simultaneously. **I am not asserting which rule
that row uses.**

---

## 11. THE VERDICT

The owner asked one question. This workbook answers it differently for each of
its parts, so here are five verdicts, not one.

### The ease-of-use test, applied honestly

The app has **21 tables** and the left panel is a wall. Adding *Price Matrix* and
*Exchange Rates* makes it 23 — for a total of **51 rows and 4 rows**, neither of
which anyone can currently open without a password. **A locked sheet with zero
editable cells, no filter, no validation and a print area is the business telling
us, in the file format, that this is not a list anybody browses.**

And there is a second, decisive argument. **Our rule is ONE TABLE PER BRAND.**
The Price Matrix is keyed on brand. So for any brand we carry, the matrix row is
*constant across every row of that brand's table*. A per-brand value on a
per-brand table is not a column and not a row — **it is a property of the
table.** Embedding it as columns would copy Highfield's seven percentages onto
588 identical rows, which is precisely the disease
`MPF_GROUND_TRUTH.md:593` measures as *"re-looked-up 1,387 times"* and
`QUOTE_FINDINGS.md` §3.7 names as *"constants that should be data."*

### The customisation test, applied honestly

A furniture dealer also has per-brand margins — so the *mechanism* is universal.
But `CTD · Sub Dealer · Trade · Sell · Factory Options · Dealer Fit Options ·
Warranty Allowance · Admin Load` is a **marine dealer's** ladder. A caravan
dealer has `Dealer Delivery` and no `Rigging`. So the **rungs themselves must be
data** — a named, ordered, org-editable list — not eight fields in our
TypeScript. This is the constraint that rules out "add seven number columns to
the boat kind."

### The five verdicts

| # | Subject | Verdict | Where it lives |
|---|---|---|---|
| **1** | **The brand margin ladder** — ordinals 10, 11, 12, 13, 14, 16, 17 across the ~18 rows that are product brands we would carry as tables | **SETTING**, scoped to the **table** | (a) an **org-level ladder definition** — the ordered rungs, each with a `name`, a `basis` (`markup on cost` / `discount off <named rung>` / `RRP` / `not set`) and a default; (b) a **per-table value** for each rung, on the table's own settings, beside its kind and structure. **Not** a left-panel entry. |
| **2** | **The supplier landing markup** — column `J` `CTD`, across the 29 supplier and category rows that have no product table | **EMBEDDED** | one `percent` column in a **Supply Pricing** section on a **Suppliers** table. `hl-modules.md:58` already lists *Supplier* as a workbook module with no app home, and `MPF_GROUND_TRUTH.md:572` already names the target column `Parts!H Landing MU`. |
| **3** | **`Reviewed` (ordinal 7)** and the notes column | **EMBEDDED** | a `date` and a `text` field on whatever record carries verdict 1 — never a separate table. It is the only governance signal in the file and it must sit *next to* the number it governs, or it becomes `window.__marginOverrideAudit` (`QUOTE_FINDINGS.md` §3.5). |
| **4** | **Exchange Rates** — 4 currencies × (rate, review date) | **SETTING**, org-level | the organisation settings surface **that does not exist today**. HelmLogic's precedent is `organisations/{id}` already carrying *trading currency* and *GST %* (`hl-admin.md` §2.2) — and `QUOTE_FINDINGS.md` §3.7 records that `gstPercentage` **sits unused** while the constant is hardcoded in seven files. **That is the failure to avoid: ship the setting and the reader in the same change, or do not ship it.** |
| **5** | **The Exchange Rate Calculator** | **LEAVE** | a 40-slot, single-use, unlabelled scratchpad with no shipment id, no currency, no date and no write-back. Its *output* already exists as columns we have: `EX Rate` and `Landed Hull Cost` in the boat kind's **Cost Build** section (`src/types/model.ts:313, 316`). What it teaches — that the achieved rate differs from the standing rate by 4.44 % — becomes verdict 4's *review date* and §9's *frozen rate on the quote line*, not a screen. |

**Bonus, verdict 1b — the Retail Sliding Scale** (rows 62–69): **SETTING**,
org-level, an 8-band ladder with an explicit top band. Carry it, because it is a
stated policy in the business's own words — but **flag to the owner that no
consumer for it is evidenced anywhere in the Master Price File audit**, and ask
before building a reader.

### What must NOT happen

- **Do not make the Price Matrix the 22nd table.** 47 rows, 22 of them numeric,
  17 of them the word `RRP`, all of them locked. Every product-brand row would
  duplicate the identity of a table we already have.
- **Do not put the seven percentages on every product row.** That is the
  1,387-lookup disease, restated in our schema.
- **Do not carry ordinals.** Ordinal 7 is already ambiguous (§3.1); ordinal 15
  is a deliberately reserved gap. Named rungs or nothing.
- **Do not model a percentage as a `number`.** 53 % of rows hold text — `RRP` or
  `U+00A0`. The rung needs a mode.
- **Do not let a quote line carry a converted price without carrying the rate.**

### The two questions only the owner can answer

1. **Does the Retail Sliding Scale drive anything, or is it a published policy
   with no implementation?** (§2.3)
2. **`Other` vs `Sell` — which feeds `BMT - MU`?** They are identical on 46 of
   47 rows and differ only on Highfield (45.00 % vs 47.50 %), which is the
   largest brand in the catalogue. (§4.5)

### The one thing to show him

> Your Trade price is *Cash × 0.95* and your Sub Dealer price is *Cash × 0.825*
> — we can prove it to the cent from your own file. But those two numbers are
> **Highfield's row**. Every other boat brand in your Price Matrix has Trade
> `0 %` and Sub Dealer `0 %`. The app has one brand's margins hardcoded and
> applies them to all seven.
>
> And the exchange rate that sets the cost of every imported hull was last
> reviewed **249 days** before you last saved the file — while the calculator on
> sheet 3 of that same file shows the rate you actually got was **4.44 % better**,
> worth **$2,938.69** on the one invoice still sitting in it.

---

## APPENDIX · REPRODUCTION

All reading done with `openpyxl 3.1.5` in read-only mode plus direct
`zipfile` inspection of the OOXML parts. Scripts under the session scratchpad
(`.../1bf40b7d-.../scratchpad/`): `dump.py` (cells, formula + cached-value
passes), `meta.py` (number formats, validations, defined names), `ext.py` /
`scan.py` (external link targets and `[n]` indices across all four workbooks),
`lock.py` (per-cell `locked` flags), `cnt.py` / `cnt2.py` (the counts in §4),
`rig2.py` (the 84 Rigging FX cells), `h.py` / `q.py` (Freight cached values).

No file in `C:/Users/AsafA/Downloads/` was opened for writing.
Nothing was written under `src/` or `tools/`.
No bank detail, account number or credential-like value was read or recorded —
the Administration Module was opened only to enumerate its external links
(it has **none**) and was not otherwise inspected by this lens.
