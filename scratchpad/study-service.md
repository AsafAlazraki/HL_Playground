# THE SERVICE MODULE — the sheet that prices an hour

> Read-only study of `C:/Users/AsafA/Downloads/Service Module (1).xlsx`
> (30,739,155 bytes on disk, last saved **2026-08-10T23:04:40Z** by **Colin Kean**,
> created 2025-02-13). Nothing was written, moved or renamed. Every figure below
> carries the cell it came from.
>
> **ASSERTED** = a formula, a validation, a stated header, a rate typed into a rate
> table. **OBSERVED** = a pattern in the values, always with a count.
> The word *usually* does not appear as a finding.

---

## 0. Why this workbook falsifies something we shipped

`QUOTE_SPEC.md` §2.3 says, and the quote module implements:

> *"**We hold none of the rates.** There is no labour rate, no fuel price, no
> registration table and no PD-hours column anywhere in the seed. Therefore boat
> pre-delivery and boat registration are a person's line."*

That was a true statement about the data we had extracted. It is not a true
statement about the data that exists. §9 below states the correction rung by rung.
The short version: **two of those four claims are now false, one is half false, and
one still stands** — and the two that are false are false because this workbook is a
complete, small, closed rate table with codes, both GST conventions, and a formula
behind almost every number.

The reason we missed it is worth naming, because it will happen again: the Service
Module is external link **`[6]`** of the Quote Module, **`[2]`** of the Boat Module,
and **`[139]`** of the Master Price File. *One workbook, three indices.* Any research
that greps for `[6]` finds a third of its consumers.

```
verified — sv_26_who.py, reading each workbook's externalLink*.xml.rels:
  11111BMT - Quote Module 2026.xlsx  ->  Service Module is [6]
  Boat Module (5).xlsx               ->  Service Module is [2]
  MASTER PRICE FILE.xlsx             ->  Service Module is [139]
```

---

## 1. The workbook at a glance

Six sheets, one external link out, and a lock on the structure.

| # | Sheet | XML size | Live range | What one row is |
|---|---|---|---|---|
| 1 | **Std Service Schedules** | 236,476,064 B | `A1:NC63073` declared, **rows 4–280 live** | one Yamaha outboard model, with its eleven service prices and its ~30 part slots |
| 2 | **Schedule Notes** | 31,853 B | rows 3–98 | the published labour-hours matrix, the parts-per-interval grid, and two worked checklists |
| 3 | **Operation Codes** | 3,433,429 B | rows 2–1166, **439 populated** | one billable operation — a job you can put on a work order |
| 4 | **Oils and Lubes** | 17,597 B | rows 3–39 | one consumable, with its cost, its charge and the markup between them |
| 5 | **Labour Rates** | 12,430 B | rows 3–29 | one charge-out rate for an hour of workshop time |
| 6 | **Dropdowns** *(hidden)* | 187,149 B | rows 2–1199 | a mirror of another sheet's key column, for data validation |

**ASSERTED — the workbook is locked.** `workbook.xml` carries
`<workbookProtection … lockStructure="1" spinCount="100000"/>`, and
`sheet1.xml` carries `<sheetProtection … sheet="1" objects="1" scenarios="1"/>`.
Sheets cannot be added, removed or renamed, and the schedule grid cannot be edited,
without the password. `<workbookPr updateLinks="always"/>` — it re-reads its supplier
file on every open.

**ASSERTED — exactly one external link out**, and it is not a Northside file:

```
xl/externalLinks/_rels/externalLink1.xml.rels
  -> .../Suppliers/Yamaha/2025/Yamaha Price File - 12.05.2025.xlsx
  cached sheet name: 'Parts Price List - 12.05.2025'   (5,014 rows cached)
```

So the Service Module is a **leaf that reaches sideways**: it depends on Yamaha and
on nothing of ours; four Northside workbooks depend on it.

**OBSERVED — the 236 MB is almost entirely air.** `<dimension ref="A1:NC63073"/>`
claims 367 columns × 63,073 rows. A full streaming pass finds the last cell carrying
a value or a formula at **row 280, column IY**. The other 62,793 rows are styled,
empty cells. Any importer that trusts `dimension` will allocate 23 million cells to
hold 277 rows of data.

---

## 2. LABOUR RATES — a pricing policy written as data

**Sheet 5. Header row 8. Live rows 9–29. Twenty-one rates. No formula reaches into
this sheet from anywhere; it is a root.**

Columns: `C Description` · `D Code` · `E Actual` · *(F empty)* · `G Rate (Exc GST)` ·
`H Rate (inc GST)`.

### 2.1 Every rate, and which side is typed

The italic column is the one a person typed; the other is derived. This matters more
than the numbers, because it tells you who owns the rate.

| Row | Description | Code | Actual `E` | Exc GST `G` | Inc GST `H` | Derivation (ASSERTED) |
|---|---|---|---|---|---|---|
| 9 | Retail Labour | `GEN` | 105 | 144.5455 | ***159*** | `G9 = H9/1.1`; **`H9` is the master rate of the whole business** |
| 10 | Pre Delivery Labour | `PD` | 105 | 144.5455 | 159 | `H10 = $H$9` |
| 11 | Detail Labour | `DET` | 105 | 144.5455 | 159 | `H11 = $H$9` |
| 13 | Trade | `TRA` | 105 | 130.0909 | 143.10 | `H13 = $H$9-($H$9*10%)` |
| 14 | **Internal** | `PDI` | 105 | **130.0909** | 143.10 | `H14 = $H$9-($H$9*10%)`, `G14 = H14/1.1` |
| 15 | Internal – Pre Delivery | `PD` | 105 | 130.0909 | 143.10 | `G15 = G14`, `H15 = G15*1.1` |
| 17 | Warranty | `WAR` | 105 | 138.1818 | ***152*** | `G17 = H17/1.1` |
| 18 | Warranty – Yamaha | `YAM` | 105 | ***114.55*** | 126.005 | `H18 = G18*1.1` |
| 19 | Warranty – Stacer | `STA` | 105 | 75 | ***82.50*** | `G19 = H19/1.1` |
| 20 | Warranty – Stabicraft | `STB` | 105 | ***100*** | 110.00 | `H20 = G20*1.1` |
| 21 | Warranty – Surtees | `SUR` | 105 | 138.1818 | ***152*** | `G21 = H21/1.1` |
| 22 | Warranty – Jeanneau | `JEA` | 105 | 138.1818 | ***152*** | `G22 = H22/1.1` |
| 23 | Warranty – Haines | `HAI` | 105 | 138.1818 | ***152*** | `G23 = H23/1.1` |
| 24 | Warranty – Highfield | `HIG` | 105 | 138.1818 | ***152*** | `G24 = H24/1.1` |
| 26 | Warranty – Malibu | `MAL` | 105 | ***110*** | 121.00 | `H26 = G26*1.1` |
| 27 | Warranty – Whittley | `WHI` | 105 | ***85*** | 93.50 | `H27 = G27*1.1` |
| 28 | Warranty – Mercury | `MER` | 105 | 144.5455 | 159 | `G28 = G9`, `H28 = G28*1.1` |
| 29 | Warranty – Volvo | `VOL` | 105 | ***127.50*** | 140.25 | `H29 = G29*1.1` |

`E10:E15 = $E$9` and `E17:E24` share the same formula. **Every `Actual` on the sheet
is the one number 105.**

### 2.2 What actually distinguishes Retail, Trade, Internal and Warranty

Three different mechanisms, and the workbook is careful about which is which.

1. **Retail, Pre-Delivery and Detail are the same rate.** `H10` and `H11` are
   literally `=$H$9`. The business does not charge itself less for washing a boat
   than for fixing one; it distinguishes them for *reporting*, by code, not by price.
   Three codes, one number.

2. **Trade and Internal are one policy: retail less ten per cent.**
   `H13` and `H14` are both `=$H$9-($H$9*10%)` = 143.10 inc, 130.0909 exc. A trade
   customer and the dealership's own workshop pay the same discounted rate. This
   single 10% is the most consequential number in the workbook, and §3.3 shows why:
   it *is* the gross profit on every operation code.

3. **Warranty rates are not the dealer's to set.** `G17`/`H17` (the generic warranty
   rate, 152 inc) and all eleven per-brand rows are typed independently, and — this
   is the tell — **the typed side differs per brand**:
   - Stacer, Surtees, Jeanneau, Haines, Highfield and generic Warranty are typed
     **inc GST** (82.50, 152 …) and the exc column is derived.
   - Yamaha, Stabicraft, Malibu, Whittley and Volvo are typed **exc GST**
     (114.55, 100, 110, 85, 127.50) and the inc column is derived.

   That is what a reimbursement rate looks like when each principal publishes it in
   its own convention and a person retypes it. Yamaha publishes `114.55` ex-GST —
   `H18 = 114.55*1.1 = 126.005`, a price nobody would ever choose to write down.

**So: why are Stacer 75 and Stabicraft 100 different from the rest?**

Because they are not Northside's prices. They are what those two manufacturers pay
Northside to do warranty work, and the answer is *"because that is what Stacer pays."*
Stacer at **75 exc / 82.50 inc** is the lowest rate on the sheet — 48% below the
retail rate the same technician's hour is sold at, and 42% below the generic warranty
rate its stablemates get. Stabicraft at **100 exc** is second-lowest. Mercury alone
reimburses at full retail (`G28 = G9`).

The consequence for the business is arithmetic and worth stating plainly: with the
`Actual` cost of an hour at 105 (§2.3), **a Stacer warranty hour is sold below cost
by $30.00 and a Stabicraft warranty hour by $5.00**, while a Mercury warranty hour
returns $39.55. That is not a defect in the sheet — it is a commercial fact the sheet
is correctly recording. But it means *warranty mix* changes the workshop's margin, and
no column anywhere reports that.

### 2.3 What `Actual 105` means beside a rate of 144.55

This was the sharpest question in the lens and the workbook answers it unambiguously,
not by a label but by who consumes the column.

**ASSERTED — `Labour Rates!$E$9` is referenced 1,727 times, all of them on
Std Service Schedules, and nowhere else in the workbook or in the Master Price File.**

```
sv_28_e9.py, byte-count of each cross-sheet reference per sheet:
  Std Service Schedules :  Labour Rates'!$E$9   x1727
                           Labour Rates'!$H$9   x1727
  Operation Codes       :  Labour Rates'!$G$14  x1
                           Labour Rates'!$H$9   x1
  Schedule Notes / Oils and Lubes / Labour Rates / Dropdowns : none
```

1,727 = **157 priced models × 11 service intervals**, exactly. Every single service
schedule's cost is `hours × 105`.

So `Actual` is **the cost of an hour of workshop time** — what the hour costs the
business, as distinct from what it is charged at. It sits at 105 against a retail
charge of 144.5455 exc, a gross recovery of 39.55/hr, and it is flat across all
twenty-one rate rows because the technician costs the same regardless of who is
billed. `E` carries no GST qualifier in its header (`E8 = 'Actual'`) where `G` and `H`
are explicit — correctly, because a wage is not a taxable supply. Comparing it to the
exc-GST column is the like-for-like comparison, and `144.5455 / 105 = 1.3767`.

**This is the finding to carry forward: the workbook holds two different costs for one
hour and uses both.**

| Consumer | Cost rate used | Cell | Value |
|---|---|---|---|
| Std Service Schedules — every `CTD` | **Actual** | `Labour Rates!$E$9` | **105.00** |
| Operation Codes — `F Labour Cost` | **Internal exc GST** | `Labour Rates!$G$14` | **130.0909** |
| MPF `Parts Maintenance!P Labour $` | Internal exc GST | `Labour Rates!$G$14` | 130.0909 |
| MPF `Dealer Fit Module!K Labour CTD` | Internal exc GST | `Labour Rates!$G$14` | 130.0909 |
| MPF `Dealer Fit Options!K20` | Internal exc GST | `[139]Labour Rates!$G$14` | 130.0909 |

Four consumers agree on 130.0909; the service schedule alone uses 105. The two differ
by **23.9%**. Both are labelled `CTD`. Both feed a gross-profit figure. **A gross
profit reported on a service schedule is not comparable to a gross profit reported on
an operation code, and nothing in either sheet says so.** For a 6-cylinder 1,000-hour
service (9.5 h) the same labour is costed at $997.50 on one sheet and $1,235.86 on the
other — a $238 swing on one line.

Which is right is a business question, not a data question. What is a data question is
that the two are indistinguishable by name.

### 2.4 Two data hazards in a 21-row table

- **ASSERTED — `Code` is not unique.** `D10 = 'PD'` (Pre Delivery Labour, 159 inc) and
  `D15 = 'PD'` (Internal – Pre Delivery, 143.10 inc). Two rows, one code, a 10% price
  difference. Anything keyed on `Code` picks one of them arbitrarily. In our model
  `Code` is a label, not an identity — the row is the identity.
- **ASSERTED — a name-driven lookup and a hardcoded cell disagree inside one MPF
  formula pair.** `MASTER PRICE FILE.xlsx` `Dealer Fit Options`:
  ```
  J20 = '[139]Labour Rates'!$C$9                                  -> "Retail Labour"
  K20 = '[139]Labour Rates'!$G$14                                 -> 130.0909
  L20 = VLOOKUP($J$20,'[139]Labour Rates'!$C:$ZZ,6,0)             -> 159
  ```
  `L20` correctly resolves the label in `J20` to that row's inc-GST rate. `K20` does
  **not** look up `J20` — it points at row 14, the *Internal* row. The screen says
  "Retail Labour"; the cost silently comes from a different row. Change `J20` to
  `Warranty - Stacer` and the sell follows to 82.50 while the cost stays at 130.09.

---

## 3. OILS AND LUBES — and what `MU` actually is

**Sheet 4. Header row 8. Three blocks: rows 9–20, 22–31, 33–39.**

Columns: `C Type` · `D Notes` · `E Part No.` · `F Serv Cost` · `G Unit` · `H CTD` ·
`I MU` · `J GP` · `K Sell`.

### 3.1 The arithmetic, from the cells

**ASSERTED**, for the consumables block (rows 9–20):

```
K  Sell  = ROUNDUP(H * m * 1.1, 0)        m = 1.8 oils · 1.1 fuel · 1.2 fuel disposal
J  GP    = K/1.1 - H                       gross profit, ex GST
I  MU    = IFERROR(J/H, )                  gross profit ÷ cost
```

**So `MU` is a markup on cost, not a margin on sell**, and — this is the important
part — **it is derived, not applied.** The applied markup is the literal `1.8` inside
`ROUNDUP`. `MU` is what the business *actually got* after the round-up to a whole
GST-inclusive dollar. This is the same idiom as `Managers View!E29 = E30/E28` in the
MPF, which `QUOTE_SPEC` §2.4 already identified: *a margin reported after the fact.*

Worked, `Engine Oil - 2 Stroke` (row 9), every figure from its cell:

```
H9  = 5.21                                        cost per litre
K9  = ROUNDUP(5.21 * 1.8 * 1.1, 0)
    = ROUNDUP(10.3158, 0)          = 11.00        sell per litre, inc GST
J9  = 11.00/1.1 - 5.21             =  4.79        GP per litre, ex GST
I9  = 4.79 / 5.21                  =  0.91939     MU = 91.9%
```

The intended markup was 80%. The realised markup is 91.9%, and the 11.9 points of
difference are pure rounding. On `Fuel - Premium Unleaded` the effect runs the other
way: intended 10%, realised `I14 = 0.2397`. **`MU` is a report, and re-deriving a
price from it would produce a different number than the sheet shows.**

### 3.2 Every consumable

| Row | Type | Notes | Part No. | `F` Serv Cost | Unit | `H` CTD | `I` MU | `J` GP | `K` Sell inc |
|---|---|---|---|---|---|---|---|---|---|
| 9 | Engine Oil – 2 Stroke | YAM | — | — | Litre | 5.21 | 0.9194 | 4.79 | 11 |
| 10 | Engine Oil – 4 Stroke | YAM | `90790-BZ404` | 7.41 | Litre | 7.41 | 0.8403 | 6.2264 | 15 |
| 11 | Volvo Engine Oil | VOL | `AU43840004` | 6.15 | Litre | 13.45 | 0.8249 | 11.0955 | 27 |
| 12 | Oil Disposal | — | — | — | Litre | 1.24 | 1.1994 | 1.4873 | 3 |
| 14 | **Fuel – Premium Unleaded** | — | — | 2.09 | Litre | **2.20** | 0.2397 | 0.5273 | **3** |
| 15 | Fuel – Diesel | — | — | — | Litre | 2.41 | 0.1316 | 0.3173 | 3 |
| 16 | Fuel Disposal | — | — | 1.24 | Litre | 1.50 | 0.2121 | 0.3182 | 2 |
| 18 | Automatic Transmission Fluid | — | — | — | Litre | 4.84 | 0.8783 | 4.2509 | 10 |
| 19 | Gear Box Oil | YAM | — | — | Litre | **0** | 0 | 0 | **0** |
| 20 | Wheel Bearing Grease | — | — | 2.00 | Each | 3.50 | 0.8182 | 2.8636 | 7 |

**Units: two only — `Litre` (9 rows) and `Each` (1 row, wheel bearing grease).**
Every fluid is priced per litre and quantity is supplied by the consumer (§4.3).

**OBSERVED — `Gear Box Oil` (row 19) is a live row priced at zero.** Cost 0, sell 0,
`I19`/`J19`/`K19` all resolve to 0 through the standard formulas. It is not blank and
it is not excluded; it is a catalogued consumable that charges nothing. One row of
ten.

### 3.3 The `LUBE` and `SUND` blocks — and an inverted ladder

Rows 22–31 (`10W30`, `10W40`, `LUBE1`–`LUBE8`) and rows 33–39 (`SUND1`–`SUND7`) are a
different shape: they are **HP-banded codes**, and the arithmetic runs backwards.

| Code | Band `D` | `F` Serv Cost | `H` CTD | `K` Sell inc |
|---|---|---|---|---|
| `10W30` | 10W30 YAMALUBE | 4.44 | 12.7273 | 14.00 |
| `10W40` | 10W40 YAMALUBE | 4.44 | 12.7273 | 14.00 |
| `LUBE1` | 2-6hp | 2.37 | 2.37 | 8.80 |
| `LUBE2` | 8-15hp | 3.16 | 3.16 | 15.40 |
| `LUBE3` | 20-30hp | 3.95 | 3.95 | 18.10 |
| `LUBE4` | 40-60hp | 4.74 | 4.74 | 22.30 |
| `LUBE5` | 70-130hp | 7.11 | 7.11 | 25.30 |
| `LUBE6` | 135-200hp | 11.06 | 11.06 | 27.80 |
| `LUBE7` | 225-350hp | 17.07 | 17.07 | 37.40 |
| `LUBE8` | F200-F350hp | 17.98 | 17.98 | 43.50 |
| `SUND1` | 2-5hp | 3.9859 | 5.0455 | 5.55 |
| `SUND2` | 6-15hp | 5.0991 | 6.4545 | 7.10 |
| `SUND3` | 18-35hp | 6.2482 | 7.9091 | 8.70 |
| `SUND4` | 40-90hp | 7.9359 | 10.0455 | 11.05 |
| `SUND5` | 100-125hp | 9.6236 | 12.1818 | 13.40 |
| `SUND6` | 130-225hp | 11.3114 | 14.3182 | 15.75 |
| `SUND7` | 250-350hp | 14.1841 | 17.9545 | 19.75 |

**ASSERTED — for `SUND1`–`SUND7` the sell is typed and the costs are derived from it:**

```
H33:H39  = K33/1.1          ex-GST sell     (shared si=10)
F33:F39  = H33*0.79         "Serv Cost" = 79% of ex-GST sell   (shared si=9)
```

`H22:H23 = K22/1.1` likewise. So on 19 of the 30 rows the *cost* is a function of the
*price*, which is the opposite direction from rows 9–20. A rule engine that assumes
"cost drives price" is wrong on two-thirds of this sheet.

The `0.79` is the same constant that appears in `Operation Codes!J475 = R475*0.79`
(§4.5) — cost is assumed to be 79% of sell, a 26.6% markup, wherever a sundry or
sublet is estimated from its price.

### 3.4 `Serv Cost` and `CTD` are two different costs, and the schedule reads the wrong-looking one

**ASSERTED — `Std Service Schedules` takes column offset 4 from `C`, which is `F`:**

```
AZ (gear oil CTD) = VLOOKUP($AX,'Oils and Lubes'!$C:$ZZ,4,0)   -> column F "Serv Cost"
BA (gear oil SELL)= VLOOKUP($AX,'Oils and Lubes'!$C:$ZZ,9,0)   -> column K "Sell"
```

The schedule's column is headed **`CTD`**. The value it fetches is **`Serv Cost`**.
The Oils sheet has its own column headed `CTD` (`H`) and the lookup does not use it.

On the `LUBE` rows this is harmless — `F = H` on all eight. On the `SUND` rows it is
not: `SUND7` is costed at `F39 = 14.1841` where `H39 = 17.9545`, a 21% understatement
of cost carried into every 250–350 hp service schedule.

**OBSERVED — `Serv Cost` and `CTD` diverge unpredictably on the top block.** Where
both are present: row 10 `7.41 / 7.41` (equal), row 11 `6.15 / 13.45` (ratio 0.457),
row 14 `2.09 / 2.20` (0.950), row 16 `1.24 / 1.50` (0.827), row 20 `2.00 / 3.50`
(0.571). Five pairs, five different ratios, no formula on either side. `Serv Cost` on
rows 9–20 is hand-typed and unrelated to `CTD` by any rule I can find. **I am not able
to say what distinguishes them, and I will not guess** — it needs one question to
Colin Kean: *"is `Serv Cost` an older cost, a landed cost, or a service-department
transfer price?"*

### 3.5 The fuel cell the MPF reads

`'[6]Oils and Lubes'!$H$14 = 2.20` — cited in `QUOTE_SPEC` §2.3 as the fuel price
behind the boat pre-delivery build. **It is column `H`, `CTD`. It is cost.**

The sell price of the same litre is `K14 = 3.00`. So the MPF's `Managers View!K20`
charges 100 L of premium unleaded into the boat PD build at **$220 (cost)**, not
**$300 (retail)**. Pre-delivery fuel is a cost recovery with no markup — a real
pricing policy, stated by a cell reference, and one we would have invented wrongly if
we had reached for the column named `Sell`.

---

## 4. OPERATION CODES — what a job is worth

**Sheet 3. Column-index row 4 (`1`…`19`). Header row 5. Rate row 6. Live rows 7–1166,
439 populated, 366 carrying a code.**

### 4.1 What an operation code *is*

An operation code is **a named unit of work with a price, priced by adding a labour
estimate to up to three sundry buckets and a sublet bucket.** It is not attached to a
motor, a boat or a service interval. It attaches to *nothing* — it is a free-standing
catalogue that other sheets and other workbooks point at.

`Column U Procedure` proves the intent: `U155 = " [   ] "&C155`. The operation's name
is auto-rendered as a **tick-box line for a work order**. This sheet is the source of
the words a technician reads on the job card.

### 4.2 The rate row — two cells that govern 366 operations

**ASSERTED:**

```
F6 = 'Labour Rates'!$G$14   -> 130.0909    labour COST rate (Internal, exc GST)
N6 = 'Labour Rates'!$H$9    -> 159.00      labour SELL rate (Retail, INC GST)
O6 = 1      P6 = 0.9      Q6 = 0.8      R6 = 0.15
```

Those are the **only two cross-sheet references on the entire sheet** (§2.3 byte
count: `x1` each). Two cells price 366 operations. Change `Labour Rates!H9` and every
operation code in the business re-prices.

Note the deliberate asymmetry: **cost is held ex-GST, sell is held inc-GST.** Every
`Sell` on this sheet is GST-inclusive.

### 4.3 The full row arithmetic

**ASSERTED**, uniform across the sheet:

```
F  Labour Cost = E * $F$6                                       E = hours
K  Total CTD   = SUM(F:J)                                       labour + 3 sundries + sublet, all cost
N  Labour Sell = $E * $N$6
O  Sundry 1 Sell = IFERROR(ROUNDUP(($G + ($G * $O$6)) * 1.1, 0), )    +100%
P  Sundry 2 Sell = IFERROR(ROUNDUP(($H + ($H * $P$6)) * 1.1, 0), )    + 90%
Q  Sundry 3 Sell = IFERROR(ROUNDUP(($I + ($I * $Q$6)) * 1.1, 0), )    + 80%
R  Sublet   Sell = IFERROR(ROUNDUP(($J + ($J * $R$6)) * 1.1, 0), )    + 15%
S  Sell        = SUM(N:R)                                       inc GST
M  GP          = S/1.1 - K
L  MU          = IFERROR(M/K, )
```

**Three sundry buckets with three different markups (100/90/80%) and a sublet bucket
at 15%.** The buckets are unnamed — nothing on the sheet says what makes a cost a
"Sundry 2" rather than a "Sundry 1". That is knowledge in someone's head, and it
changes the price by ten percentage points.

### 4.4 The labour margin is the rate policy, exactly

Worked, `DFO_CAB_1` (row 43, one hour, no sundries):

```
F43 = 1 * 130.0909  = 130.0909      K43 = 130.0909
N43 = 1 * 159.00    = 159.00        S43 = 159.00
M43 = 159/1.1 - 130.0909 = 144.5455 - 130.0909 = 14.4545
L43 = 14.4545 / 130.0909 = 0.111111
```

**`MU` on a pure-labour operation is exactly 1/9 = 11.111%, on every such row.**

That is not a coincidence and it is not a markup anybody chose. It falls straight out
of §2.2: the Internal rate is Retail *less 10%*, so `144.5455 / 130.0909 = 1/0.9`.
**The 10% internal discount in `Labour Rates!H14` *is* the workshop's gross profit on
labour.** One typed percentage, in one cell, on a different sheet, is the entire
labour margin of the business.

Sundries are what lift a real operation above 11.1%. `DFO_LAB_1` (row 13) adds $10 of
Sundry 1 → `O13 = ROUNDUP((10 + 10)*1.1, 0) = 22`, `S13 = 181`, `MU = 17.46%`.

### 4.5 The shape of the catalogue

366 coded rows across 69 section headings. Prefix census (`sv_13_anom.py`):

| Prefix | n | What it is |
|---|---|---|
| `DFO` | 209 | Dealer Fit Options — the bulk of the sheet |
| `YAM` / `YAMA` | 44 | Yamaha accessories and installations |
| `9HI-*` | 43 | Highfield factory-option installs (`-CO` console 20, `-FA` seat 16, `-TO`, `-EL`, `-ST`) |
| `9SR-FA` | 10 | Surtees factory-option installs |
| `RIG` | 11 | rigging installs |
| `PDTR` | 7 | **trailer pre-deliveries** |
| `LAB` | 6 | **service labour, 20 hr only** |
| `9MY-AD` | 5 | trailer adjustments |
| `DEC` | 3 | **registration letters and boat names** |
| `9YA-07`, `9HI-*`, `9ST-`, `9SC-` | 9 | per-brand one-offs |

Named blocks worth carrying into the model:

- **Labour estimates** (rows 8–40, `DFO_LAB_0.05` … `DFO_LAB_50`): 33 pre-priced time
  buckets from 3 minutes to 50 hours. This is how a salesperson quotes labour without
  a rate: they pick a bucket.
- **Trailer pre-deliveries** (rows 62–69): `PDTR01` unbraked 1.0 h · `PDTR02` single
  axle braked 1.25 h · `PDTR03` tandem braked 1.75 h · `PDTR03B` tandem ≥2,000 kg
  2.0 h · `PDTR04` tri-axle braked 2.5 h · `PDTR_FACTORY` check-over 0.5 h ·
  `PDTR00` **NOT REQUIRED, 0 h, $0**.
- **Registration** (rows 57–60): `Rego Letters Not Required` (no code, $0) ·
  `DEC-REG-STD` Rego Letters 8" Standard, 0.2 h, sell $31.80 ·
  `DEC-REG-CUS` Custom Registration Letters, **sublet $115 → sell $165** ·
  `DEC-NAME-CUS` Custom Boat Name, sublet $115 → sell $165.
- **Pick-up / delivery** (rows 499–504), mirrored into `Dropdowns!P2:P7`:
  `PU` Customer to Drop Off & Collect $0 · `PUDL` Bris Northside 2.2 h **$350** ·
  `PUDS` Southside 2.8 h **$450** · `PUDW` Westside 2.8 h **$450** ·
  `PUD` North & South Coast 4.08 h **$650** · `PUDHSM` Horizon Shores 4.08 h **$650**.
  **A delivery fee is priced as labour hours.** Geography is a dropdown; the price
  behind it is a time estimate.
- **Sublets** (rows 474–482): five round estimates $100–$500, priced by the inverse
  rule `J475 = R475*0.79` — cost derived from sell at 79% (§3.3). Plus
  `Sublet Operation` at $0 and one named job, *Sea Wasp Australia Generator Install*,
  sublet cost $500 → sell $633.
- **Service labour** (rows 492–497): `LAB_20H1CYL` … `LAB_20H8CYL`, hours
  **1.3 / 2.1 / 2.3 / 3.5 / 3.5 / 3.5**. These are exactly `Schedule Notes!D6:I6`
  (§5.1). **Only the 20-hour service exists as an operation code**; the other ten
  intervals are priced only inside Std Service Schedules.

### 4.6 Four defects, counted

1. **ASSERTED — the sublet markup is broken on two rows.** `R59` and `R60` read
   `ROUNDUP(($J59+($J59*30%))*1.1,)` — a hardcoded **30%** where every other row on
   the sheet uses `$R$6` = 15%. Both are the registration rows (`DEC-REG-CUS`,
   `DEC-NAME-CUS`). Changing `R6` re-prices 364 operations and leaves those two
   behind. This is the same class as `QUOTE_SPEC` §2.7 fault `8.3`.

2. **ASSERTED — 17 operations are priced below cost.** The `Electronic Installations`
   block at rows 1143–1166 carries typed round-number sells (120, 180, 240, 300, 360,
   480) against formula-computed costs, and `L` goes negative on all 17:

   | Row | Operation | `K` CTD | `S` Sell | `L` MU |
   |---|---|---|---|---|
   | 1144 | Head Unit Only – Gimball Mount | 253.73 | 240 | **−14.01%** |
   | 1146 | Head Unit Only – Flush Mount | 378.09 | 360 | −13.44% |
   | 1149 | Transducer Installation (Transom Mount) | 129.36 | 120 | **−15.67%** |
   | 1155 | GPS Aerial Installation (Targa Mount) | 313.41 | 300 | −12.98% |
   | 1161 | Speaker Installation (6 Spks) | 375.59 | 360 | −12.86% |
   | 1164 | Electronics Commissioning (On Water) | 497.45 | 480 | −12.28% |

   …and eleven more. Every one of these has a **live twin higher up the sheet**: the
   `ELECTRONIC INSTALLS (Labour Only)` section at row 158 uses the same
   `DFO-ELE-****` code family. Two catalogues of the same jobs, one profitable and one
   not, in one sheet, 985 rows apart.

3. **ASSERTED — `Op Code` is not a key.** 12 codes appear on more than one row, of 289
   distinct codes. `DFO_` alone is the code on **34** different rows; `DFO-TRA-` on 20;
   `DFO-GEN` on 7; `Factory` on 6; `Sublet` on 7. `DFO-FEN-G3` is the code for both the
   G3 *and* the G4 fender pack (rows 91, 92). **An operation code is a category tag,
   not an identity.** In our model the row is the identity and `Op Code` is an ordinary
   column.

4. **OBSERVED — five "." rows are section headings** (424, 445, 447, 464) plus a
   heading literally named `Not Required` repeated five times (1148, 1153, 1157, 1162,
   1166). The sheet's own structure has been maintained past the point where the
   headings mean anything.

---

## 5. SCHEDULE NOTES — the published policy, and where the sheet has left it behind

**Sheet 2. Four blocks, rows 3–98, 483 non-blank cells. No formulas at all — it is a
document, not a calculation.**

### 5.1 The labour-hours matrix, twice

`C3:I16` **NSM Engine Service Labour** and `K3:Q16` **Yamaha (Suggested) Engine
Service Labour** — the same shape side by side: eleven intervals (20 hr … 1,000 hr) ×
six cylinder counts (1, 2, 3, 4, 6, 8 Cyl).

| Interval | NSM 1/2/3/4/6/8 Cyl | Yamaha suggested 1/2/3/4/6/8 Cyl |
|---|---|---|
| 20 hr | 1.3 · 2.1 · 2.3 · 3.5 · 3.5 · 3.5 | 1.3 · 2.1 · 2.3 · **3.0** · 3.5 · 3.5 |
| 100 hr | 2.4 · 3.0 · 3.8 · 5.0 · 5.5 · 6.8 | **2.1** · 3.0 · **3.5** · **4.7** · **5.0** · **5.0** |
| 300 hr | 2.4 · 3.0 · 3.8 · 5.0 · 5.5 · 6.8 | **2.4** · **3.3** · 3.8 · **5.1** · **5.2** · **5.3** |
| 500 hr | 2.5 · 3.5 · 5.5 · 6.5 · 7.5 · 8.5 | **2.4** · 3.5 · **4.0** · **5.3** · **5.5** · **5.5** |
| 1,000 hr | 2.5 · 4.0 · 6.5 · 8.5 · 9.5 · 10.5 | 2.5 · **3.7** · **4.5** · **8.0** · **8.3** · 9.5 |

**OBSERVED — across all 66 cells: NSM's allowance exceeds Yamaha's suggestion in 48,
equals it in 16, and is lower in exactly 2.** The two exceptions are both at the
300-hour service: 2 Cyl **3.0 vs 3.3** and 4 Cyl **5.0 vs 5.1**. The largest gaps run
the other way — 8 Cyl @ 500 hr **8.5 vs 5.5 (+3.0 h)**, 6 Cyl @ 500 hr
**7.5 vs 5.5 (+2.0 h)**, 3 Cyl @ 1,000 hr **6.5 vs 4.5 (+2.0 h)**.

This is a policy comparison written as data — the dealer publishes both its own
allowance and the manufacturer's, side by side, and bills its own. At the retail rate
of $159 inc, the 8-cylinder 500-hour gap alone is **$477** of labour the customer pays
above Yamaha's suggested time.

### 5.2 What the standard service includes

`C18:C20`, verbatim:

> *"Parts Included in standard Service Cost:"*
> *"Engine oil, Gear oil, Oil Filter, Drain Bung Washers, Thermo Gasket, Impeller,
> Boat Fuel Filter."*
> *"1 Cyl Engine Will include engine Fuel Filter."*

Seven named inclusions plus one cylinder-count exception. §6.4 checks this sentence
against what the formulas actually charge, and it does not hold.

### 5.3 The parts-per-interval grid

`C22:Q39` **Yamaha Pay As You Go** — 16 part slots × 11 intervals, with a four-value
vocabulary:

| Symbol | Meaning (from context) | Count |
|---|---|---|
| `R` | replace | — |
| `I` | inspect | — |
| `I/R` | inspect / replace as required | — |
| `-` | not applicable at this interval | — |

The 16 slot names — External Anodes, Internal Anodes (Access), Internal Anodes (Non
Access), Oil Filter, Fuel Filter (Boat), Fuel Filter (Engine), Fuel Filter (VST),
Drain bung washer, Spark Plugs, Timing Belt, Timing Belt Tensioner, Water pump
Impeller, Water Pump Housing/Kit, Thermostat Gasket, Thermostats, OCV Filters —
**are exactly the part-block headers on Std Service Schedules** (§6.1). This grid is
the specification; the schedule sheet is the implementation.

### 5.4 Two worked checklists

`D42:D98` (4 CYL 500HR) and `Q42:Q98` (6 Cyl 500HR) — 44 and 47 tick-box lines each,
in three phases: *CARRY OUT SERVICE AS OUTLINED BELOW* → *CHECK WHILE RUNNING* →
*AFTER RUNNING*, then *Additional Work Carried out*.

They are not identical, and the differences are substantive, not editorial:

| 4 CYL 500HR | 6 Cyl 500HR |
|---|---|
| `[ ] Replace Internal anodes (Cylinder head, Exhaust cover)` | `[ ] Inspect/replace Interanal anodes as required (Cylinder head and block)` |
| — | `[ ] Replace anodes (Exhaust cover, Cooling water passage, Rectifier/Regulator cover @1000hrs)` |
| `[ ] Replace lower unit gear oil (GL4)` | `[ ] Replace lower unit gear oil (GL5)` |
| `[ ] Inspect the impeller and water pump assembly condition` | `[ ] **Replace** impeller and inspect water pump assembly condition` |
| — | `[ ] Replace the OCVs Filters (Oil Control Valves)` |

**GL4 for the 4-cylinder and GL5 for the 6-cylinder** is the same distinction the
schedule sheet carries in column `AW Type` (§6.1), and the schedule agrees: every
4-stroke row reads `GL5`, every 2-stroke row reads `GL4`. Note the checklist says the
4-cyl **inspects** the impeller at 500 hr where the 6-cyl **replaces** it — but the
schedule formula charges impeller (`GV`/`GW`) at every interval from 100 hr for both.
And the 4-cyl checklist omits the OCV filter line that the 6-cyl carries, while the
500 hr formula charges `IX`/`IY` (OCV Filters) for **every** model.

The last four lines of both checklists are the same, and they matter for §8:

> `[ ] Trailer visual inspection` · `[ ] Test trailer lights` · `[ ] Tyre pressures and shine`

**The engine service checklist inspects the trailer.** The trailer is not a separate
job; it is four lines on the outboard's card.

**OBSERVED — the checklists are frozen at one interval.** Two of the sixty-six cells
in the matrix have a written procedure. The other sixty-four intervals × cylinder
counts have a *price* and an *hours allowance* and no document.

---

## 6. STD SERVICE SCHEDULES — the largest sheet

**Sheet 1. Band row 2, header row 3, data rows 4–280. Frozen pane at `G4`
(`xSplit="6" ySplit="3"`), so `A:F` and rows 1–3 stay on screen.**

### 6.1 The shape of a row

A row is **one Yamaha outboard model**. 209 header labels in row 3 across 259 live
columns, in five regions:

| Columns | Region | Per-row content |
|---|---|---|
| `A:G` | identity | `C Engine HP` · `D Model Code` · `F Cyl's` · `G Year Model ` |
| `I:AO` | **eleven services** | 11 × (`CTD`, `Sell`, `Time Allow.`) — merged band labels `I2` "20 hr - Service" … `AM2` "1,000 hr - Service" |
| `AQ:AU` | **5 Year Service Plan** | `CTD` · `GP ($)` · `Margin` · `Sell` · `60 Repayments`; `AU2` Inflation = **2.5%** |
| `AW:BJ` | consumables | Gear Oil (`Type`,`CODE`,`Qty`,`CTD`,`SELL`) · Engine Oil (`Type`,`Qty w Filter`,`CTD`,`SELL`) · Sundries (`CODE`,`CTD`,`SELL`) |
| `BL:IY` | **30 part slots** | each: name · `Description` · `QTY` · `CTD` · `SELL` |

Two header faults, both ASSERTED:

- **`C3 = 'Engine HP'` but column `C` holds the model designation** (`LXF450USA2`,
  `F350XSA2 White`, `T25XWTC`). `D3 = 'Model Code'` holds Yamaha's three-character
  code (`6KN`, `6LM`, `6FM`). **There is no horsepower column** — HP is embedded in
  the model string and must be parsed out of it.
- `CQ3` (the `Description` header of the `Internal Anodes 3 (Access)` slot) is blank,
  though `CQ` carries the standard `Description` VLOOKUP on all 157 rows. 30 slots, 29
  labelled.

**ASSERTED — five declared, never-filled columns.** `DA`, `DJ`, `DS`, `EJ`, `GC` are
all headed `Labour (Hrs)` inside part blocks (Internal Anodes Non-Access ×3, Fuel
Filter Boat, Spark Plugs). **All five hold zero values on all 277 rows, and no
formula anywhere references them.** Somebody intended per-part labour and never
built it.

### 6.2 What is live, and what is not

| Population | Rows | What they carry |
|---|---|---|
| **157 fully priced 4-stroke models** | 4–191 (with spacer gaps) | everything: times, prices, 5-year plan, 30 part slots |
| **32 two-stroke models** | 243–280 | `C`, `D`, `F`, `AX` gear-oil code, `BC` sundry code — **and nothing else** |
| repeated sub-headers | 242, 247, 254, 261, 264, 268, 275, 277 | `2 Stroke` · `Cyl's` · `Gear Oil` · `Sundries` |

**ASSERTED — every two-stroke Yamaha is unpriced for service.** Rows 243–280 (`2C`,
`3A`, `4A`, `5C`, `6C`, `8C`, `9.9F`, `15F`, `20D`, `25N`, `30D`, `40V`, `50H`, `60F`,
`70B`, `90A`, `115C`, `130B & 140`, `150F`, `175D`, `200F`, `CV25B`, `CV25X`, `CV30H`,
`CV40X`, `CV50H`, `E40X`, `E60H` …) have a model code, a cylinder count, a `GL4` gear
oil and a `SUND*` code — and no time allowance, no CTD, no sell, no 5-year plan and no
part slots. The block is a stub. Anyone servicing a two-stroke prices it by hand.

**ASSERTED — the hidden `Dropdowns` sheet mirrors a range that is three times too
long.** `Dropdowns!C2:C1199 = 'Std Service Schedules'!C4:C1201`, 1,198 formulas
against 277 live rows. Every blank source cell renders as a literal **`0`**. The
validation list a user opens contains hundreds of zeros. Same class as
`QUOTE_SPEC` §2.5's note that `showZeros="0"` makes an unmatched lookup blank —
here the opposite failure, a blank rendered as a value.

### 6.3 The cross-sheet arithmetic, quoted

**ASSERTED — one formula pattern per column, identical across all 157 rows.** A full
pass finds `1 distinct pattern` for every priced column. The sheet is machine-regular.

**The 20-hour service** (`I`/`J`, driven by `K Time Allow.`):

```
I4  = (K4 * 'Labour Rates'!$E$9) + $AZ4 + $BE4 + $BI4 + $DZ4 + $FO4 + $FU4
J4  = ROUNDUP((K4 * 'Labour Rates'!$H$9) + $BA4 + $BF4 + $BJ4 + $EA4 + $FP4 + $FV4, )
```

`E9` = 105 = **Actual**. `H9` = 159 = **Retail inc GST**. Six part slots: gear oil,
engine oil, sundries, oil filter, drain bung washer, drain bung washer 2.

**The 100/200/300/400/600/700/800/900-hour services** — one shape, eight times:

```
L4  = (N4 * 'Labour Rates'!$E$9) + $AZ4+$BE4+$BI4+$DZ4+$FO4 + $EH4+$GA4+$GV4 + $FU4
M4  = ROUNDUP((N4 * 'Labour Rates'!$H$9) + $BA4+$BF4+$BJ4+$EA4+$FP4 + $EI4+$GW4 + $FV4, )
```

adds boat fuel filter allowance (`EH`/`EI`), spark plugs (`GA`/`GB`) and water pump
impeller (`GV`/`GW`).

**The 500-hour service** adds five more:

```
X4  = (Z4*'Labour Rates'!$E$9) + …the 100-hr set… + $CY4+$DH4+$DQ4 + $EQ4 + $IX4
Y4  = ROUNDUP((Z4*'Labour Rates'!$H$9) + …            + $CZ4+$DI4+$DR4 + $ER4 + $IY4, )
```

three Internal Anodes (Non Access), Fuel Filter (Engine), OCV Filters. That maps
cell-for-cell onto `Schedule Notes` row 26 (`Internal Anodes (Non Access) = R` at
500 hr), row 29 (`Fuel Filter (Engine) = R`) and row 39 (`OCV Filters = R`).
**The notes grid and the schedule formula agree on the 500-hour service.**

**The consumables**, three lookups each, all into `Oils and Lubes`:

```
AZ = VLOOKUP($AX,'Oils and Lubes'!$C:$ZZ,4,0)          gear oil   cost  (col F "Serv Cost")
BA = VLOOKUP($AX,'Oils and Lubes'!$C:$ZZ,9,0)          gear oil   sell  (col K "Sell", inc GST)
BE = VLOOKUP($BC,'Oils and Lubes'!$C:$ZZ,4,0) * $BD    engine oil cost x litres
BF = VLOOKUP($BC,'Oils and Lubes'!$C:$ZZ,9,0) * $BD    engine oil sell x litres
BI = VLOOKUP($BH,'Oils and Lubes'!$C:$ZZ,4,0)          sundries   cost
BJ = VLOOKUP($BH,'Oils and Lubes'!$C:$ZZ,9,0)          sundries   sell
```

`BD Qty w Filter` is the litres of engine oil including the extra the filter holds —
7.8 L on the F450, 7.9 L on the F350. Gear oil quantity (`AY`) is recorded (1.95 L,
0.925 L) but **never multiplied in**: `AZ`/`BA` are flat lookups. `AY` is a
documented, unused quantity.

**The 30 part slots**, three lookups each, all into the Yamaha workbook:

```
BM = VLOOKUP(BL,'[1]Parts Price List - 12.05.2025'!$C:$ZZ,2,0)          Description
BO = VLOOKUP(BL,'[1]Parts Price List - 12.05.2025'!$C:$ZZ,5,0) * BN     CTD  x QTY
BP = VLOOKUP(BL,'[1]Parts Price List - 12.05.2025'!$C:$ZZ,8,0) * BN     SELL x QTY
```

From the cached external link, the Yamaha sheet's columns from `C` are:
`C Part(1)` · `D Description(2)` · `E Stock OH(3)` · `F Bin(4)` · **`G Daily(5)`** ·
`H MU(6)` · `I GP(7)` · **`J W/S Retail+ GST(8)`**.

So **offset 5 is Yamaha's `Daily` (dealer cost) and offset 8 is `W/S Retail+ GST`
(workshop retail, GST-inclusive).** The service parts ladder is Yamaha's, not
Northside's — Northside adds no markup to a service part at all. And Yamaha's own file
uses the identical idiom: `H2 = I2/G2` and `I2 = J2/1.1 - G2`.

**The count**, from a byte scan of the 236 MB sheet:

```
Labour Rates'!$E$9          x1,727     = 157 models x 11 intervals
Labour Rates'!$H$9          x1,727     = 157 models x 11 intervals
'Oils and Lubes'!$C:$ZZ     x  942     = 157 models x  6 lookups
Parts Price List            x13,820    ≈ 157 models x 88 lookups
```

(88, not 90, because the slots are not uniformly filled: the `Fuel Filter (Boat)`
block carries its three lookups on only **101** of the 157 rows, and the
`Fuel Filter (Engine)` block on **158** — one row more than there are models, a stray
formula outside the live range.)

**Four numbers on two small sheets, plus one supplier file, generate every service
price Northside quotes.**

### 6.4 The five-year service plan

```
AQ (CTD)  = ROUNDUP((I+L+O+R+U+X+AA+AD+AG+AJ+AM + L+O+R+U) * (1+$AU$2)^5, )
AT (Sell) = ROUNDUP((J+M+P+S+V+Y+AB+AE+AH+AK+AN + M+P+S+V) * (1+$AU$2)^5, )
AR (GP $) = AT/1.1 - AQ
AS (Margin) = AR/(AT/1.1)
AU (60 Repayments) = AT/60
```

`AQ1` states the intent: *"NB: 5 Year Service Plan - 1,400 Hrs, 15 Services, Inflation
Calculated"*. The formula matches it exactly — the eleven intervals (20…1,000 hr) plus
a **second lap of the 100/200/300/400-hour cycle** (`+L+O+R+U`) = 15 services and
1,400 hours. That is a well-formed model of an engine's first five years.

Worked, `LXF450USA2` (row 4): `AQ4 = 19,401` · `AT4 = 29,800` ·
`AR4 = 29,800/1.1 − 19,401 = 7,689.91` · `AS4 = 28.39%` · `AU4 = 496.67/month`.

Three things to say about it:

- **`AS` is a `Margin` — `GP ÷ ex-GST sell`. `MU` everywhere else in this business is
  `GP ÷ cost`.** The workbook names them correctly and differently, which is more
  discipline than the MPF shows (`MPF_GROUND_TRUTH` §6.6 records a `Trailer Spec
  Enquiry` card labelling the *same ratio* "GP Margin" that the data sheet correctly
  calls "MU %"). Row 4's `Margin` is 28.39%; the same row's markup would be 39.64%.
  **Two ratios, one workbook, both live. Any column we seed must record which.**
- **ASSERTED — inflation is applied at year five to every service, including today's.**
  `(1 + 2.5%)^5 = 1.1314` multiplies the *whole* 15-service sum. The 20-hour service,
  performed in month one, is inflated by 13.14%. A per-service escalation would give a
  materially lower plan price. This is a stated formula and its consequence is
  arithmetic, not opinion.
- **ASSERTED — full formula coverage.** All 157 rows carry `AQ`/`AT` formulas (36
  written out, 34 shared-formula masters, the rest followers). No stale literals.

### 6.5 The 1,000-hour CTD is built from the SELL columns

**This is the one hard defect in the sheet, and it is uniform across all 157 models.**

Compare the 900-hour cost with the 1,000-hour cost. Every column reference in the
first is a cost column; six of nine in the second are its *sell* sibling:

```
AJ (900 hr CTD)   = (AL*$E$9) + $AZ+$BE+$BI+$DZ+$FO+$EH+$GA+$GV+$FU
                                 ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^      all cost

AM (1,000 hr CTD) = (AO*$E$9) + $BA+$BF+$BJ+$EA+$FP+$EI+$GB+$GW+$FV
                                 ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^ ^^^^   all SELL
                              + $EW+$FC+$FI+$GA+$GJ+$GP+$HH+$HN        cost
```

`AZ→BA`, `BE→BF`, `BI→BJ`, `DZ→EA`, `FO→FP`, `EH→EI`, `GA→GB`, `GV→GW`, `FU→FV` are
all cost→sell pairs. And **spark plugs are counted twice** — `$GB` (sell) in the first
group and `$GA` (cost) in the second. Meanwhile `AN` (the 1,000-hr *Sell*) includes
`$HC` (Water pump Impeller 2 sell) and `AM` includes no `$HB` counterpart, so one
part's cost is missing entirely.

**Verified numerically** (`sv_22_verify.py` recomputed the shipped formula and a
cost-column mirror of it):

| Model | labour | `AM` as stored | cost-column mirror | overstatement |
|---|---|---|---|---|
| `LXF450USA2` (row 4) | 10.5 h × 105 = 1,102.50 | **2,621.96** | 2,194.14 | **+$427.82  (+19.5%)** |
| `F350XSA2 White` (row 22) | 9.5 h × 105 = 997.50 | **2,376.96** | 1,971.40 | **+$405.56  (+20.6%)** |

The recompute of the shipped formula reproduces `AM` to the cent, so this is what the
sheet does, not a mis-read.

**Consequence, precisely:** the 1,000-hour service cost is overstated by ~20% for every
one of the 157 models. `AM` feeds `AQ`, so the **5 Year Service Plan CTD is overstated**,
so `AR GP` is understated and `AS Margin` is understated. The plan is *more* profitable
than the sheet says. Nobody would catch this by looking, because the plan still shows a
healthy 28% and the sell side is correct.

This is the same species as `QUOTE_SPEC` §2.7 fault `8.3` — one summation written
eleven times, and the eleventh is wrong.

### 6.6 The boat fuel filter allowance points at another engine's row

**ASSERTED:** `EH` (`CTD Allow`) and `EI` (`Sell Allow`) on the Fuel Filter (Boat)
block are not lookups. They are absolute cross-row references:

```
EH = EF$5      on 39 shared masters + 40 direct  ->  row 5   = XF450USA2
EH = EF$153    on  1 shared master  +  2 direct  ->  row 153 = T25XWTC
```

A boat-mounted fuel filter is a boat item, not an engine item, so a single standard
allowance is a defensible policy — with **two** standards, one for engines 25 hp and up
(row 5) and one for the 25 hp group (row 153). But it is implemented as a **pointer at
another model's row**. Insert a row above 5, or re-sort the sheet, and every service in
the business re-prices silently.

**OBSERVED — 22 of the 157 priced models have no allowance at all.** `EH`/`EI` carry a
value on 141 rows, last at row 161. Rows 163–191 — every model **F20 and below**, 16
models — have `EH` blank, so their 100-hour-and-up services charge nothing for a boat
fuel filter, while `Schedule Notes!C19` says the standard service cost *includes*
`Boat Fuel Filter` and `Schedule Notes` row 28 marks it `R` at every interval from
100 hr. **The published inclusion list and the formula disagree for the small engines.**

### 6.7 The real key is not cylinder count — and the published matrix cannot say so

`Time Allow.` (`K`, `N`, `Q`, `T`, `W`, `Z`, `AC`, `AF`, `AI`, `AL`, `AO`) is **typed,
not computed** — no formula in any of the eleven columns. So it should be a faithful
transcription of `Schedule Notes` §5.1. It is not.

Grouping all 157 priced models by `F Cyl's` and by their full 11-interval time vector:

| Cyl | n | 20 · 100 · 200 · 300 · 400 · 500 · 600 · 700 · 800 · 900 · 1000 | vs Schedule Notes |
|---|---|---|---|
| 1 | 8 | 1.3 · 2.4 · 2.4 · 2.4 · 2.4 · 2.5 · 2.4 · 2.4 · 2.4 · 2.4 · 2.5 | **matches** |
| 2 | 22 | 2.1 · 3.0 · 3.0 · 3.0 · 3.0 · 3.5 · 3.0 · 3.0 · 3.0 · 3.0 · 4.0 | **matches** |
| 3 | 3 | 2.3 · **3.5** · **3.5** · **3.5** · **3.5** · 5.5 · **3.5** · **3.5** · **3.5** · **3.5** · 6.5 | **differs** — Notes say 3.8 |
| **4** | **16** | 3.0 · 3.5 · 3.5 · 3.5 · 3.5 · 6.0 · 3.5 · 3.5 · 3.5 · 3.5 · 7.5 | **not in the Notes** — F50/F60/F70 |
| **4** | **15** | 3.5 · 4.5 · 4.5 · 4.5 · 4.5 · 6.5 · 4.5 · 4.5 · 4.5 · 4.5 · 8.5 | **not in the Notes** — F115/F130 |
| 4 | 39 | 3.5 · 5.0 · 5.0 · 5.0 · 5.0 · 6.5 · 5.0 · 5.0 · 5.0 · 5.0 · 8.5 | **matches** — F150/F175/F200 |
| 6 | 38 | 3.5 · 5.5 · 5.5 · 5.5 · 5.5 · 7.5 · 5.5 · 5.5 · 5.5 · 5.5 · 9.5 | **matches** |
| 8 | 16 | 3.5 · 6.8 · 6.8 · 6.8 · 6.8 · 8.5 · 6.8 · 6.8 · 6.8 · 6.5 · 10.5 | **matches** |

**Eight distinct time vectors across 157 models; `Schedule Notes` publishes six.**

Two findings, both ASSERTED from the values:

1. **The 4-cylinder class splits three ways by displacement band** — F50/F60/F70 at the
   bottom (rows 128–145), F115/F130 in the middle (rows 109–126), F150/F175/F200 at the
   top (rows 65–107). A 6.0-hour 500-hour service on an F70 and a 6.5-hour one on an
   F130 are different jobs, and the published matrix has one row for both. **The true
   key of a schedule is `(cylinder count, HP band)`, not cylinder count.**
2. **The 3-cylinder row diverges from the published policy** on eight of eleven
   intervals — the sheet bills 3.5 h where `Schedule Notes!F7:F15` says 3.8 h. Three
   models (F40LA, F40SA, F30LA) are billed 0.3 h — **$47.70 inc GST** — less per
   service than the published allowance, ten times over a five-year plan.

**What this means for us:** a schedule is not per-model. Sixty-six numbers on
`Schedule Notes` — plus two undocumented vectors — determine 1,727 time cells. The only
genuinely per-model data on this sheet is the **part numbers and quantities in the 30
slots**, plus the three consumable codes. That is the natural join: *model → time
profile* (many-to-one) and *model → part slots* (one-to-many).

### 6.8 Two more things worth recording

- **`G Year Model `** (note the trailing space in the header) carries 2023, 2024, 2025
  on 157 rows. Models are versioned by year; `6KN` appears as both `LXF450USA2` and
  `XF450USA2` in 2024, and `F70XA`/`F70XB` differ only by year. **`Model Code` is not
  unique either** — `6KN` covers 8 rows, `6FM` covers 8, `6C5` covers 4.
- **The `Motor Support` band** (`JA2`) is declared in row 2 and has **no data in any
  row and no header in row 3**. A twelfth region, never built.

---

## 7. DROPDOWNS — what it governs

**Sheet 6, `state="hidden"`. Two columns, both pure mirrors.**

```
C2:C1199 = 'Std Service Schedules'!C4:C1201     the model list          (1,198 formulas)
P2:P7    = 'Operation Codes'!C499:C504          the pick-up/delivery list  (6 formulas)
```

That is the whole sheet. It governs exactly two choices a human makes in this
workbook — *which engine* and *how does the boat get here* — and it governs them by
**mirroring the label column of another sheet rather than referencing it**, which is
why the tail of the model list is 900-odd literal zeros (§6.2).

**There is no dropdown for the service interval, for the labour rate, for the oil
code, or for the operation code.** `AX CODE`, `BC Type` and `BH CODE` on the schedule
sheet are typed free text validated by nothing — a typo in `AX` produces `#N/A` in
`AZ` and `BA`, which then propagates through `I`…`AN` into `AQ` and `AT`. Exactly the
`QUOTE_SPEC` §2.7 fault `8.1` mechanism: *one bad dropdown value blanks the whole
quote*, here without even a dropdown to constrain it.

---

## 8. THE COMMON THEMES

> *"also note commom themes - for example registration for boat and trailer"*

A common theme, for this purpose, is **a concern that appears in more than one module
and is the same concern each time**. Nine of them, ordered by how much they cost us if
we model each occurrence separately.

### 8.1 An hour of a technician's time — five consumers, one vocabulary, one dissenter

The single largest shared concept in the business. `Labour Rates` is a 21-row table
that five different sheets in four different workbooks reach into, by absolute cell:

| Consumer | Cost side | Sell side |
|---|---|---|
| `Service` · Operation Codes `F6`/`N6` | `Labour Rates!$G$14` 130.0909 | `Labour Rates!$H$9` 159 |
| `Service` · Std Service Schedules ×1,727 | **`Labour Rates!$E$9` 105** | `Labour Rates!$H$9` 159 |
| `Parts` · Parts Maintenance `P`/`X` | `Labour Rates!$G$14` | `Labour Rates!$H$9` |
| `Dealer Fit` · `K`/`L` | `Labour Rates!$G$14` | `Labour Rates!$H$9` |
| `MPF` · Dealer Fit Options `K20`/`L20` | `[139]Labour Rates!$G$14` | `VLOOKUP(J20,…,6,0)` |
| `Trailer` · `BD PD $` | `BC` hours from Operation Codes × labour rate | — |

**Five sheets agree on the sell rate. Four agree on the cost rate and one does not.**
Model this once — a `labour rate` table with a `role`, and a `cost rate` / `charge
rate` pair on it — and the dissent becomes visible instead of buried. Model it five
times and it stays buried.

### 8.2 Registration — boat, trailer, and the letters themselves

The owner's named example, and it is richer than it looks: registration appears in
**three** places, as three different kinds of thing.

| Module | Where | What it is |
|---|---|---|
| **Boat** | `Boat!KM` *Boat Registration* — enum: `Up to and inc 4.5m` · `4.51m to 6.0m` · `6.01m to 10.00m` · `10.01 to 15m` · `Boat Registration Not Required` | a **length band**, priced by `MV!D23 = VLOOKUP('6.01m to 10.00m','[10]Registration Costs',8)` |
| **Boat** | `Boat!KN` *Boat Rego Decals* — enum ending `Rego Letters Not Required` | the **physical letters** |
| **Trailer** | `Trailer!BY` *Rego Type* — enum: `Large Trailers - Over 1.021t` (430 rows) · `Small Trailers - Up to 1.02t` (43) · `Registration - NOT REQUIRED` (2) → `BZ = VLOOKUP(BY,'[3]Registration Costs'!$C:$ZZ,9,0)` = 283 / 166 / 0 → `CA Sell inc Rego = ROUNDUP(BW+BZ,)` | an **ATM weight band**, priced from the same external workbook |
| **Service** | `Operation Codes` rows 57–60 | the **labour and sublet to fit the letters**: `Rego Letters Not Required` $0 · `DEC-REG-STD` 0.2 h → $31.80 · `DEC-REG-CUS` sublet $115 → $165 · `DEC-NAME-CUS` sublet $115 → $165 |

**The same concern is: a statutory band determines a fee, a decal is fitted, and both
can be declined.** The boat is banded by *length*, the trailer by *ATM weight*; both
resolve through a workbook called `Registration Costs`; and the fitting labour lives in
the Service Module's operation catalogue.

The strongest evidence that this is one concept and not three: **`Boat!KN`'s enum
contains the string `Rego Letters Not Required`, and `Operation Codes!C57` is the
string `Rego Letters Not Required`.** A boat's decal dropdown and a service operation
share a value, verbatim, across two workbooks. That is a **curated pair** in our sense —
picking the boat option should carry the operation, and today a human does it by
knowing.

Two live defects already recorded in `MPF_GROUND_TRUTH` §14 sharpen the point: the
trailer's rego band is **typed, not derived from its own ATM column**, and **9 rows
violate the ATM rule, 7 of them undercharging by $117 each**. A band that a rule could
compute is being typed, in the one place a mistake costs money.

**Our model:** one `registration` role, one banded-fee table keyed by
`(subject kind, band)`, and a curated join from the band to the fitting operation.
Two tables, not six.

### 8.3 Pre-delivery — one concern, three rates, and a code collision

| Module | Hours | Rate | Cell |
|---|---|---|---|
| **Boat** | 20 h, literal in the MPF | `[6]Labour Rates!$G$14` = 130.0909 (**Internal**) | `MV!D20 = K20 + K31` |
| **Trailer** | `PDTR01`–`PDTR04` = 1.0 / 1.25 / 1.75 / 2.5 h, banded by axle count and braking | `Operation Codes!$F$6` = 130.0909 (**Internal**) | `Trailer!BD = BC × rate`, `BC` from Operation Codes |
| **Motor** | inside `Total PD Allowance` (`Motor Library!AV`) | already in the number | `Motor!AX Total CTD` |

And within `Labour Rates` itself the concern splits into **two rows sharing one code**:
`D10 = 'PD'` *Pre Delivery Labour* at 159 inc, and `D15 = 'PD'` *Internal – Pre
Delivery* at 143.10 inc. That is the policy: **PD billed to a customer is retail; PD
absorbed on our own stock is internal.** The workbook records both and distinguishes
them by *row*, not by code.

`Operation Codes` also carries `PDTR_FACTORY` (0.5 h, *check over the factory's
pre-delivery*) and `PDTR00` (*NOT REQUIRED*, $0) — the same "declined" idiom as §8.7.

### 8.4 `MU` and `Margin` — one formula each, seven modules

```
MU     = GP / CTD          (markup on cost)
Margin = GP / (Sell/1.1)   (margin on ex-GST sell)
GP     = Sell/1.1 - CTD    everywhere, without exception
```

`MU` in this exact form appears in: `Oils and Lubes!I`, `Operation Codes!L`,
`Parts Maintenance!J` and `!T`, `Dealer Fit!P`, `Motor!MU`, `Trailer!BT`, and
**Yamaha's own price file** (`H2 = I2/G2`). Eight implementations, one formula.
`Margin` appears in `Std Service Schedules!AS` and in the MPF's `Trailer Spec Enquiry
Q14` — where it is **mislabelled**, computing `MU` under the name "GP Margin".

**This is a column *kind*, not a column.** Two of them, with a rule that says which
denominator a table uses, and the mislabelling becomes impossible.

### 8.5 A sundry — five markups, no definition

| Rule | Where |
|---|---|
| ×2.00 then GST, round up | `Operation Codes!O` (`$O$6 = 1`) |
| ×1.90 then GST, round up | `Operation Codes!P` (`$P$6 = 0.9`) |
| ×1.80 then GST, round up | `Operation Codes!Q` (`$Q$6 = 0.8`) |
| ×1.20 then GST, round up | `Parts Maintenance!W` |
| ×1.25 then GST, round up | `Dealer Fit Module!R` |
| ×1.15 then GST, round up | `Operation Codes!R` sublet (`$R$6 = 0.15`) — **except rows 59, 60 at 30%** |

Six rules for "the small stuff", and no column anywhere records which bucket a cost
belongs in. `MPF_GROUND_TRUTH` already flags the 1.2/1.25 disagreement between two
modules; the Service Module adds three more tiers and a two-row exception.

### 8.6 The service plan — two of them, and they disagree

| | `Motor Module` (MPF §6.5) | `Service Module` (§6.4) |
|---|---|---|
| Events | **7** (20…600 hr) | **15** (20…1,000 hr, +2nd lap of 100–400) |
| Hours covered | 600 | **1,400** |
| Labour rate | `Labour Rates!$H$9` **retail 159** | cost `$E$9` 105, sell `$H$9` 159 |
| Parts included | 3 of ~26 blocks | 6–19 of 30 blocks by interval |
| Indexation | `(1+2.5%)^5` | `(1+2.5%)^5` |
| Term | `WS = 72` on 411 of 413 rows | **`AU = AT/60`** |

Same manufacturer, same motors, same 2.5% index — **seven events versus fifteen, and 72
payments versus 60.** Two answers to one question, in two workbooks, both live. A
customer can be quoted either.

### 8.7 "Not required" is a first-class value, and it is not zero

The business already draws the distinction `QUOTE_SPEC` §2.5 insists on — between
*"chosen to be nothing"* and *"not priced here"* — and it draws it by **cataloguing the
decline as a row with a $0 price**:

| Module | The declined option |
|---|---|
| Service | `PDTR00 Pre Delivery - NOT REQUIRED` · `Jockey Wheel - Not Required` · `Spare Wheel - Supplied Std w Trailer` · `Rego Letters Not Required` · `Installation Not Required` · `Supply Only` · `Supply Only - Installation Not Required` · `Not Required - Installation Not Required` · `Product Factory Fitted - Installation Not Required` · `Cables Supplied with Rigging Kit` · `Factory Fit - Installation Not Required` · `NB: LABOUR TO BE QUOTED` |
| Boat | `Boat Registration Not Required` (`KM`) · `Rego Letters Not Required` (`KN`) |
| Trailer | `Registration - NOT REQUIRED` (`BY`) |

Note `NB: LABOUR TO BE QUOTED` and `DFO-CREDIT CREDIT PART` (row 407) — the catalogue
even has a row for *"we do not know yet"* and one for *"this goes back"*.

**This is our `null` versus `0`, already in the data, as vocabulary.** We should seed
these rows rather than invent a UI convention, because the words on the quote must be
the words the business uses.

### 8.8 Sell is GST-inclusive and rounded up to a whole unit

`ROUNDUP(x * 1.1, 0)` in `Oils and Lubes!K`, `Operation Codes!O:R`,
`Std Service Schedules!J`…`AN`, `AQ`, `AT`; `ROUNDUP(x, -1)` in `Trailer!BV`,
`Motor!BB`, `MV!D37`. **One convention (inc GST, round up) with two precisions
(dollar vs ten-dollar).** `QUOTE_SPEC` §2.5's claim that *"the quote works entirely in
one convention and never converts"* survives this workbook intact — every `Sell` here
is inc GST, and every `CTD` is exc.

### 8.9 The brand list — three overlapping vocabularies, no superset

| Brand | Warranty rate (`Labour Rates`) | MPF per-brand sheet | Operation-code prefix |
|---|---|---|---|
| Yamaha | ✓ `YAM` 114.55 | — | `9YA-`, `YAMA-` |
| Stacer | ✓ `STA` 75 | ✓ | `9ST-FAC-` (1 row) |
| Stabicraft | ✓ `STB` 100 | ✓ | `9SC-FAC-` (1 row) |
| Surtees | ✓ `SUR` 138.18 | ✓ | `9SR-FAC-` (10 rows) |
| Highfield | ✓ `HIG` 138.18 | ✓ | `9HI-*` (43 rows) |
| Jeanneau | ✓ `JEA` 138.18 | ✓ | — |
| Haines | ✓ `HAI` 138.18 | ✓ (`Haines Signature`) | — |
| **Formosa** | **—** | ✓ | — |
| Malibu · Whittley · Mercury · Volvo | ✓ (110 / 85 / 144.55 / 127.50) | **—** | — |

**Eleven brands have a warranty rate; seven have an MPF sheet; five have operation
codes; none of the three lists contains the others.** Formosa can be sold but not
warranty-costed. Volvo can be warranty-costed but not sold. This is exactly what a
`brand` table with roles is for, and exactly what a hardcoded enum cannot express.

---

## 9. THE CORRECTION TO `QUOTE_SPEC` §2.3

The claim, and what this workbook does to each clause. This is the section to hand to
whoever owns the quote module.

| `QUOTE_SPEC` §2.3 said | Status | Evidence |
|---|---|---|
| *"there is no **labour rate** anywhere in the seed"* | **FALSE of the source** | `Labour Rates!C8:H29` — 21 named rates, each with a code, an `Actual` cost, an exc-GST and an inc-GST charge, and a formula showing which side is typed (§2.1). A complete, closed rate table of 21 rows. |
| *"no **fuel price**"* | **FALSE of the source** | `Oils and Lubes!C14` *Fuel – Premium Unleaded*, unit `Litre`, `H14` cost **2.20**, `K14` sell **3.00**. Plus diesel, two disposal charges, four oils, ATF and grease — ten consumables, §3.2. |
| *"no **PD-hours** column"* | **HALF FALSE** | **Trailer PD hours exist**: `Operation Codes` `PDTR01`–`PDTR04`, `PDTR03B`, `PDTR_FACTORY`, `PDTR00` — 1.0 / 1.25 / 1.75 / 2.0 / 2.5 / 0.5 / 0 h, banded by axle count and braking (§4.5). **Boat PD hours do not exist here** — `MV!D20`'s 20 hours is a literal in the MPF, not a cell in this workbook. Motor PD is pre-absorbed in `Motor Library!AV`. |
| *"no **registration table**"* | **STILL TRUE, with values known** | The fee tables live in `Registration Costs` (`[10]` from the Quote Module, `[3]` from the Trailer Module) which **was not opened and is not in `Downloads/`**. What we do now hold: the trailer's three fee values `283 / 166 / 0` and its band enum; the boat's four-band enum with no prices; and the *fitting* operations `DEC-REG-STD` / `DEC-REG-CUS` / `DEC-NAME-CUS` with real prices (§8.2). |

### 9.1 What this permits, and what it still does not

**Permits** — with every figure carrying its cell, no invention:

- A **labour rate** table (21 rows) as a first-class priced table with `cost` and
  `charge` levels, so a service line can be priced without a person typing a number.
- A **consumables** table (30 rows across three blocks) with `unit`, `cost`, `sell`,
  and the HP-band key that `LUBE*`/`SUND*` already use.
- An **operations** catalogue (366 rows) with hours, cost, sell and a `Procedure`
  string ready to print on a job card — including trailer PD, delivery fees and
  registration fitting.
- **Trailer pre-delivery** computed rather than typed: pick the axle/braking band, get
  the hours, multiply by a named rate.

**Still does not permit**, and the spec's §2.3 conclusion stands for these:

- **Boat pre-delivery.** The 20-hour allowance is a literal inside `Managers View`,
  not a column anywhere. Leave it as a person's line, exactly as shipped.
- **Boat registration.** No fee table has been read. Leave it as a person's line.
- **Any markup we would have to choose.** `MU` is reported, never applied (§3.1); the
  applied factors are literals inside `ROUNDUP` and differ per row-block.

### 9.2 One thing the spec got exactly right, now confirmed from the other side

`QUOTE_SPEC` §2.3: *"Motor pre-delivery is already inside the number we read… it must
**never** be added to a motor line; doing so double-charges pre-delivery."*

The Service Module gives that principle a second, independent instance. A service
schedule's `Sell` already contains its labour, its oils, its sundries and its parts —
`J = ROUNDUP((K × 159) + BA + BF + BJ + EA + FP + FV, )`. A quote that reads a
schedule's `Sell` **and** adds `LAB_20H4CYL` from Operation Codes charges the labour
twice. And the 30 part slots on the schedule are the *same parts* the Yamaha price file
sells individually. **The rule generalises: read one rung of a ladder and stop.**

---

## 10. WHAT THIS MEANS FOR THE APP

Not a design, a set of constraints the data imposes.

1. **A service schedule is not a row per model.** It is `(cylinder count, HP band) →
   time profile` joined to `model → 30 part slots`. 157 models resolve to **8** time
   profiles (§6.7). Seeding 157 independent rows would encode as data what is actually
   a rule, and would hide the fact that three of the eight profiles are undocumented.

2. **`Time Allow.` is typed and drifts from its own published policy.** Two divergences
   found, both silent (§6.7). This is a `workbookRules.ts`-shaped constraint: *the
   allowance for a model must equal the matrix cell for its cylinder class*, with the
   three known exceptions recorded as `BlockedValue`s carrying their reason — not
   suppressed.

3. **Two costs for one hour must be distinguishable by name, not by which sheet you are
   on** (§2.3). If we seed a single `Labour Cost` column we will silently pick one and
   make the other unreachable.

4. **`MU` and `Margin` are different ratios and both are live** (§8.4). A `number`
   column is not enough; the denominator has to travel with the column.

5. **`Op Code`, `Model Code` and `Code` are all non-unique** (§4.6, §6.8, §2.4). Every
   one of them looks like a key and none is. The row is the identity.

6. **"Not required" is data, not UI** (§8.7). Seed the rows.

7. **The 236 MB is a `dimension` lie** (§1). Any importer must find the true extent by
   scanning, not by trusting the declared range — 63,073 declared rows, 277 real ones.

8. **The parts ladder is a supplier's, cached, and 15 months stale.** Every service part
   price resolves through `'[1]Parts Price List - 12.05.2025'`, 5,014 rows cached inside
   this file, in a workbook last saved 2026-08-10. `updateLinks="always"` means Excel
   refreshes on open; **we read the cache**. Whatever we seed carries a date, and the
   date must be on the column.

---

## 11. WHAT WAS NOT VERIFIED

Stated so nobody reads an absence as a fact.

- **`Registration Costs` was never opened.** It is not in `Downloads/`. Every claim
  about registration fees is second-hand from `MPF_GROUND_TRUTH` (trailer: 283/166/0)
  or is an enum with no price (boat). §9 says so.
- **The Yamaha price file was never opened.** All 5,014 part rows are read from the
  cache inside the Service Module. Whether the live file still matches is unknown, and
  the cache is dated **12.05.2025** against a last-save of **2026-08-10**.
- **`Serv Cost` versus `CTD` on `Oils and Lubes` rows 9–20 is unexplained** (§3.4).
  Five pairs, five ratios, no formula. I have not guessed, and it is one question to
  the workbook's owner.
- **Nothing was run and nothing in `src/` was read for this study beyond
  `QUOTE_SPEC.md` and `MPF_GROUND_TRUTH.md`.** No dev server, no typecheck. No file
  under `src/`, `tools/seed/` or `src/features/constraints/` was modified.
- **The `Actual = 105` interpretation is inference, and is labelled as such.** What is
  ASSERTED is that `E9 = 105` is a literal, that `E10:E24` all equal `$E$9`, and that
  `$E$9` is referenced 1,727 times and only by `Std Service Schedules`. That it *is*
  the technician's hourly cost is the only reading consistent with those three facts,
  but the header says only `Actual` and no formula proves it.
- **`FITMENT_RULES.md` does not exist yet** in the repo; the parallel workflow's output
  was not available to cross-check the operation-code prefixes against fitment.
- **The three MPF sheets the owner flagged as under-studied** (`Boat Show`,
  `Dealer Fit Options`, and the seven per-brand sheets) were touched only far enough to
  answer this lens: a scan for references to `Labour Rates`, `Oils and Lubes`,
  `Operation Codes` and `Std Service Schedules` across all eleven MPF sheets returns
  **hits on `Dealer Fit Options` only** (`J20`, `K20`, `L20`). **None of the seven
  per-brand sheets reaches into the Service Module.** The heavy consumers are the
  module workbooks one level down — Boat, Motor, Trailer, Parts, Dealer Fit.

---

### Appendix — probes

All under the session scratchpad; none writes to any workbook.

```
svlib.py            streaming cell reader (shared strings, formulas, shared-formula si)
sv_01_inventory.py  zip entry sizes
sv_02_wb.py         workbook.xml, rels, external-link targets, docProps
sv_03/04/05         Labour Rates + Oils and Lubes, values and shared-formula masters
sv_06_notes.py      Schedule Notes, all 483 non-blank cells
sv_07_drop.py       Dropdowns, by column
sv_08..sv_13        Operation Codes: headers, formulas, sections, prefixes, anomalies
sv_14_big_ends.py   sheet1 head + tail (dimension, protection, merges, hyperlinks)
sv_15..sv_19        sheet1 headers, single streaming pass (40.9 s), population census,
                    formula-pattern census (1 pattern per column x 157 rows)
sv_20_roster.py     full 189-model roster with formula-presence flags
sv_21_shared.py     242 shared-formula masters on sheet1
sv_22_verify.py     time-vector grouping + numeric audit of AM (1,000 hr CTD)
sv_23_cyl.py        8 distinct time vectors vs the 6 published in Schedule Notes
sv_24_ext.py        cached Yamaha Parts Price List columns
sv_25/26/27         MPF sheet map, who links the Service Module, Dealer Fit Options J20:L20
sv_28_e9.py         byte-count of every cross-sheet rate reference, per sheet
```
