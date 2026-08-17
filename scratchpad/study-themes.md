# THE COMMON THEMES

> *"also note commom themes - for example registration for boat and trailer"*

A **theme** here is a concern that appears in more than one module **and is the
same concern each time**. Not the same word — the same concern. The test applied
to every candidate below is three questions, and a candidate has to pass all
three:

1. **Does it appear on more than one module's rows?**
2. **Does it mean the same thing?** (a `Freight` column on a boat and a `Freight`
   column on a trailer are only one theme if they answer the same question)
3. **Would modelling it twice cost us something real?** — a number that could
   disagree with itself, a rename that could orphan a lookup, a rule that could
   only ever be written once per table.

Every figure below carries its cell. Claims are labelled:

- **ASSERTED** — a formula, a data validation, a stated header, a rate table, a
  named sheet. The workbook says it.
- **OBSERVED** — a pattern in the values, always with a count. The workbook
  demonstrates it but never states it.

Nothing here proposes a rate, a fee, a margin or a policy that the workbooks do
not already state. Where I recommend seeding a number I give the cell it comes
from and I do not compute with it.

**Read read-only.** `C:/Users/AsafA/Downloads/*.xlsx` was opened with
`read_only=True` / `zipfile.ZipFile` and never written. `src/demos/northside.ts`
was read with Read and Grep only. Nothing under `src/`, `tools/seed/` or
`src/features/constraints/` was modified.

**Workbooks read** (all six, plus four the six point at):

| File | Why |
|---|---|
| `Boat Module (5).xlsx` | 21.9 MB, 2 sheets, 10 external links |
| `Motor Module (1).xlsx` | **not a valid zip** — truncated download. `Copy of Motor Module (1).xlsx` (33 MB, same vintage) used instead and named wherever cited |
| `Trailer Module.xlsx` | 7.4 MB, 3 sheets, 5 external links |
| `Parts Module (3).xlsx` | 39.1 MB, 23 sheets, 7 external links |
| `Service Module (1).xlsx` | 30.7 MB, 6 sheets, 1 external link |
| `MASTER PRICE FILE.xlsx` | 1.3 MB, 11 sheets, **141** external links |
| `Registration Module.xlsx` | 20 KB, 1 sheet — the table this whole study turns on |
| `11111BMT - Quote Module 2026.xlsx` · `Quote Module - MPF.xlsx` | the quote template; identical registration formulas in both |

---

## 0. THE CORRECTION THIS STUDY OWES `QUOTE_SPEC.md`

`QUOTE_SPEC §2.3` says, and the quote module implements:

> **We hold none of the rates.** There is no labour rate, no fuel price, no
> registration table and no PD-hours column anywhere in the seed. Therefore
> boat pre-delivery and boat registration are a person's line.

The sentence is **true of the seed and false of the data**. All four exist, and
all four are in the smallest tables in the estate:

| §2.3 says | The workbooks hold | Rows | Evidence |
|---|---|---|---|
| "no registration table" | `Registration Module.xlsx` → sheet `Registration Costs`, dims `C3:K34` | **22 priced rows** | ASSERTED — a named workbook, a named sheet, a header row `C8 Boat Registration · G8 REV Code · J8 CTD · K8 SELL` |
| "no labour rate" | `Service Module (1).xlsx` → `Labour Rates!C8:H29` | **17 rate rows** | ASSERTED — `G8 Rate (Exc GST)` / `H8 Rate (inc GST)`; `G14 = 130.0909…` (Internal), `G9 = 144.5454…` / `H9 = 159` (Retail Labour) |
| "no fuel price" | `Service Module (1).xlsx` → `Oils and Lubes!C14` | 1 row of ~30 | ASSERTED — `Fuel - Premium Unleaded`, `H14 = 2.20` CTD, `K14 = 3` Sell, `G14 = 'Litre'` |
| "no PD-hours column" | `Boat Module!JN Boat PD (hrs)`, `KE Boat Hand Over (hrs)`, `Trailer Module!BC PD (Hrs)`, `Motor Library!AD Labour (Hrs)` | 4 columns, 4 modules | ASSERTED — stated headers |

And the boat already **names its own registration band**:
`Boat Module!KM Boat Registration`, a five-value enum
(`Up to and inc 4.5m` · `4.51m to 6.0m` · `6.01m to 10.00m` · `10.01 to 15m` ·
`Boat Registration Not Required`). ASSERTED.

The boat's registration fee for a 6.01–10.00 m hull is **$414.00**, at
`Registration Costs!J11`. It is not a mystery and it is not a person's judgement.

**What §2.3 got right and should keep:** the *rule* — "if the number is not a
column in the project's own data, the quote does not produce it." That rule is
correct and it is what protected the build. What changes is only the **premise**:
the numbers can be in the project's own data, because they are four small tables
away. **Recommendation: seed the four tables. Do not compute with them until
they are joined and a person can see the join.** §7 states exactly what that
changes on a quote and what it must not change.

One more thing §2.3 got right that this study reinforces: `Trailer Module!CA
Sell inc Rego` already contains the rego, and reading `Sell` *and* `Rego ($)`
and adding them double-charges. That stays true. The correction is not "start
adding rego to the trailer" — it is "**the boat is missing the line the trailer
already has**."

---

# PART ONE — REGISTRATION

## 1. There is exactly one registration table, and it serves both

`Registration Module.xlsx` has **one sheet**, `Registration Costs`, occupying
`C3:K34`. Twenty-two rows carry a price. ASSERTED.

Its shape:

| Col | Header | What it is |
|---|---|---|
| `C` | *(the section labels live here too)* | **the key** — a free-text band label |
| `G` | `REV Code` | the outbound DMS revenue code — `REGO 1` … `REGO 8` |
| `J` | `CTD` | cost to dealer |
| `K` | `SELL` | `=IFERROR(ROUNDUP(J,),)` — CTD rounded up to the dollar |

`C6` reads **`AS at 1/7/25`** — the validity date, typed into a cell as a
sentence. ASSERTED. (This is Theme 12.)

Column `C` carries **four labelled sections in one column**, exactly the way the
Boat Module and Trailer Module draw their bands — a label cell at the head of a
run, with a blank row between runs:

### 1.1 `C8` — **Boat Registration** — banded on hull LENGTH

| Row | Band (`C`) | `G` REV Code | `J` CTD | `K` SELL | `J` formula |
|---|---|---|---|---|---|
| 9 | `Up to and inc 4.5m` | `REGO 1` | 126.35 | **127** | `=100.65+25.7` |
| 10 | `4.51m to 6.0m` | `REGO 2` | 249.50 | **250** | `=223.8+25.7` |
| 11 | `6.01m to 10.00m` | `REGO 3` | 414.00 | **414** | `=388.3+25.7` |
| 12 | `10.01 to 15m` | `REGO 4` | 608.05 | **609** | `=582.35+25.7` |
| 13 | `Boat Registration Not Required` | — | 0 | 0 | literal |

ASSERTED, all of it. Note the four live bands are each **a government fee plus a
constant `25.7`** typed straight into the formula. The `$25.70` is never
labelled anywhere in the workbook — it is almost certainly the plate/decal
component, but the workbook does not say so, so **this study does not say so
either.** It is a literal inside a formula, and if we seed the table we seed
`126.35`, not `100.65 + 25.7`.

### 1.2 `C15` — **Trailer Registration** — banded on ATM MASS

| Row | Band (`C`) | `G` REV Code | `J` CTD | `K` SELL |
|---|---|---|---|---|
| 16 | `Small Trailers - Up to 1.02t` | `REGO 6` | 165.11 | **166** |
| 17 | `Large Trailers - Over 1.021t` | `REGO 7` | 282.19 | **283** |
| 18 | `Heavy Trailers - Over 4.55t` | — | 997.50 | **998** |
| 19 | `Registration - NOT REQUIRED` | — | 0 | 0 |

ASSERTED. Unlike the boat bands these are **bare literals** — no `+25.7`.

**`Heavy Trailers - Over 4.55t` is priced and never used.** `Trailer Module!BY
Rego Type` holds only three distinct values across 477 trailers —
`Large Trailers - Over 1.021t` (430) · `Small Trailers - Up to 1.02t` (43) ·
`Registration - NOT REQUIRED` (2). OBSERVED, counts from
`docs/specs/MPF_GROUND_TRUTH.md §5.3`, whose extraction I did not re-run. So the
lookup table already anticipates a band the catalogue cannot express.

### 1.3 `C21` — **Other Fees & Charges** — flat, unbanded

| Row | Fee | `G` | `J` CTD | `K` SELL |
|---|---|---|---|---|
| 22 | `Boat Transfer Fee` | `REGO 5` | 32.55 | 33 |
| 23 | `Trailer Transfer Fee` | `REGO 8` | 32.55 | 33 |
| 24 | `Replacement Plate` | — | 35.05 | 36 |
| 25 | `Unregistered Vehicle Permit` | — | 38.90 | 39 |
| 26 | `VIN Plate` | — | 8.14 | 9 |
| 27 | `PPSR Fee` | — | 4.20 | 5 |

ASSERTED. **`Boat Transfer Fee` and `Trailer Transfer Fee` are the same
number, `32.55`, modelled as two rows with two revenue codes.** That is the
single clearest statement in the whole estate that the business itself thinks of
boat-registration and trailer-registration as *the same concern applied to two
subjects* — it duplicated the row rather than duplicating the table.

Note also `VIN Plate` and `PPSR Fee`: these are **trailer** artefacts (a VIN is
stamped on a trailer frame, a PPSR check is on a towable vehicle) sitting in the
shared "Other Fees" block with no subject at all. The table has already
out-grown a two-way split.

### 1.4 `C29` — **Boat Registration - Pensioner / Concession Card Holder**

| Row | Band | `J` CTD | `K` SELL |
|---|---|---|---|
| 30 | `Up to and inc 4.5m (Pensioner / Concession)` | 76.05 | 77 |
| 31 | `4.51m to 6.0m (Pensioner / Concession)` | 137.60 | 138 |
| 32 | `6.01m to 10.00m (Pensioner / Concession)` | 219.85 | 220 |
| 33 | `10.01 to 15m (Pensioner / Concession)` | 389.65 | 390 |

ASSERTED. Same four length bands, a second rate, and **the concession is
expressed by suffixing the band label rather than by a second column.** There is
no trailer equivalent. There is no `REV Code` on any of the four.

So the concession is a **price level on the fee**, encoded as four extra rows —
which is the same trick the Boat Module uses for `Cash` / `Trade` / `Sub Dealer`
(extra columns) and the `Labour Rates` sheet uses for
`Retail` / `Trade` / `Internal` (extra rows). Three encodings of one idea, in one
estate. That is Theme 4.

## 2. How each module reaches into it

### 2.1 The trailer reaches in from its **data sheet**

```
Trailer Module!BY  Rego Type       hand-keyed enum, 3 live values
Trailer Module!BZ  Rego ($)        = VLOOKUP(BY,'[3]Registration Costs'!$C:$ZZ,9,0)
Trailer Module!CA  Sell inc Rego   = ROUNDUP(BW + BZ, )
```

ASSERTED. `[3]` on the Trailer Module resolves to `Registration Module.xlsx` —
I read the external-link relationship directly
(`xl/externalLinks/_rels/externalLink3.xml.rels` → `Registration%20Module.xlsx`,
`<sheetName val="Registration Costs"/>`) and the cached values match
`Registration Costs` cell for cell.

**Ordinal 9, counted from `C`, is column `K` — `SELL`.** So a trailer's stored
`Rego ($)` is **283**, and `CA Sell inc Rego = ROUNDUP(BW + 283, )` — rego is
added **after** the sell price and is **never marked up**. ASSERTED.

### 2.2 The boat reaches in from the **quote sheet**, and so does the trailer, again

The Boat Module carries **no registration cost column at all**. Its whole
registration footprint is two enums in an unlabelled band at `KM..KN`:

```
Boat Module!KM  Boat Registration    5 values (the length bands)
Boat Module!KN  Boat Rego Decals     7 values
```

ASSERTED. Cross-checked against my own header extraction of `Boat Module` row 1:
between `KM` and `KT` the only columns are `KM Boat Registration`,
`KN Boat Rego Decals`, then the safety band `KP Adults · KQ Standard Safety Gear ·
KR PFD's Sup. · KS PFD Type · KT Standard Anchor Kit`. There is no `Rego ($)`,
no `Sell inc Rego`, nothing.

The money happens in the quote template. `Managers View` (sheet 6 of both
`11111BMT - Quote Module 2026.xlsx` and `Quote Module - MPF.xlsx`, **identical in
both**) carries exactly three registration formulas:

```
AB297 = VLOOKUP($AB$1,'[3]Boat Module'!$C:$ZZ,$Z297,0)        →  '6.01m to 10.00m'
   ⤷ the boat row's own KM band, pulled by ordinal

J34   = AB297
K34   = VLOOKUP($J$34,'[10]Registration Costs'!$C:$ZZ,8,0)    →  414
D23   = K34                            row label C23 = 'Registration'
D34   = ROUNDUP(D23,)                  row label C34 = '3rd Party Recovery'  →  414
D37   = ROUNDUP((D28+(D28*D29))*1.1,-1)              BMT Package — rego NOT in here
D40   = HLOOKUP($D$39,$E$39:$K$59,2,0)               row label A40 =
        'Including Boat Pre Delivery and Boat Registration'

G23   = VLOOKUP($DB$75,'[10]Registration Costs'!$C:$ZZ,8,0)*$M$54  →  282.19 × 1
        (the trailer column; DB75 is the trailer's Rego Type,
         M54 = $L$55+$L$57 = a COUNT of selected trailers)

A22   = 'Hull Only Rego'
A23   = VLOOKUP($AB$297,'[10]Registration Costs'!$C:$ZZ,8,0)  →  414
A24   = IF('Quote Sheet'!D17=A42,A23,0)               → applies only on a
                                                        hull-only document type
```

ASSERTED, every line, read from the saved formula XML of both quote workbooks.
`[10]` resolves to `Registration Module.xlsx` in both.

## 3. THE FINDING: same table, same key, **three different price columns**

**Ordinal 8, counted from `C`, is column `J` — `CTD`. Ordinal 9 is `K` — `SELL`.**

| Where | Subject | Ordinal | Column | The number for a `Large Trailer` |
|---|---|---|---|---|
| `Trailer Module!BZ` | trailer | **9** | `K SELL` | **283.00** |
| `Managers View!G23` | trailer | **8** | `J CTD` | **282.19** |
| `Managers View!K34` / `D23` / `A23` | boat | **8** | `J CTD` | 414.00 |

ASSERTED, by formula, in both quote workbooks and the trailer data sheet.

**The same trailer's registration is $283.00 on the Trailer Module and $282.19 on
the quote sheet.** Eighty-one cents, on every trailer, forever, because two
formulas in two files count columns differently into the same table. That is not
a rounding difference — it is a *different column*. And a boat+trailer package
quote therefore contains one fee read at retail (inside `DB77 Sell inc Rego`)
and one read at cost (`G23`), on the same document.

This is the single most valuable thing this lens found, and it is precisely the
class of fault our app exists to end: **two hard-coded ordinals into one
external table, addressed by counting.**

## 4. The rung asymmetry — where each fee lands in the price

This matters more than the 81 cents, because it decides what a quote line means.

**Boat** — registration is **excluded** from the hull price and added as a
separate, unmarked-up line:

```
D28  TOTAL ACTUAL CTD  = D18 + D24 + D25 + D26
D29  BMT MU            = $AB$265                        (0.29)
D37  BMT PACKAGE       = ROUNDUP((D28+(D28*D29))*1.1,-1)   ← rego is NOT in D28
D34  3rd Party Recovery= ROUNDUP(D23,)  = 414              ← added AFTER, at CTD
D40                    = row labelled 'Including Boat Pre Delivery and
                          Boat Registration'
```

**Trailer** — registration is **baked into** the price we read:

```
BW   Sell            (the trailer's marked-up sell)
BZ   Rego ($)        = VLOOKUP(BY, Registration Costs, 9)   = 283, at SELL
CA   Sell inc Rego   = ROUNDUP(BW + BZ, )                    ← rego inside the number
```

ASSERTED. The workbook's own name for the boat's treatment — **`3rd Party
Recovery`** — is the honest description of *both*: a statutory charge collected
on behalf of a third party, passed through, never marked up. The trailer just
folded it in and the boat did not.

**Consequence for the quote, precisely:** today `QUOTE_SPEC §2.5` prices a
trailer at `Sell inc Rego` and stops (correct, no double-charge), and leaves the
boat's registration for a person to type (correct given the seed). The moment we
seed `Registration Costs`, the boat gets a `3rd Party Recovery` line with a cell
behind it — and **the trailer must not get a second one**, because its rego is
already inside its price column. The rung is a property of the *column*, and it
has to be recorded on the column, not remembered by a developer.

## 5. Boat rego and trailer rego: one concept or two?

Laid out side by side:

| | **Boat** | **Trailer** | Same? |
|---|---|---|---|
| Lookup table | `Registration Costs` | `Registration Costs` | **identical** |
| Key type | a band **label** string | a band **label** string | **identical** |
| Key column on the product row | `Boat Module!KM Boat Registration` | `Trailer Module!BY Rego Type` | same role, different name |
| What picks the band | hull **length** | trailer **mass** (ATM) | **different measure** |
| Is the band derived? | **no** — typed on `KM` | **no** — typed on `BY`, and **9 rows contradict their own ATM** ¹ | identical (both typed) |
| Fee column on the product row | **none** | `BZ Rego ($)` | boat is missing it |
| Price-inclusive column | **none** (`QR Cash` excludes) | `CA Sell inc Rego` | boat is missing it |
| Where the lookup happens | the **quote sheet** | the **data sheet** | different site |
| Price column read | `J CTD` | `K SELL` (data) / `J CTD` (quote) | **inconsistent** |
| Marked up? | **no** — `3rd Party Recovery` | **no** — `ROUNDUP(BW+BZ,)` | **identical** |
| Quantity | ×1 always | `× $M$54`, a count of trailers | different |
| Concession rate | **yes** — 4 pensioner rows | no | boat only |
| Transfer fee | `Boat Transfer Fee` $33 | `Trailer Transfer Fee` $33 | **same amount, two rows** |
| Physical artefact | `KN Boat Rego Decals` — 7 values | `BE` = `Rego Label Holder`, a $1.824 PD part on every trailer ² | **identical idea** |
| Compliance form | none | `Trailer Module!KE..NP` — 32 headers, **zero data** ³ | trailer only |

¹ OBSERVED, from `MPF_GROUND_TRUTH §14`: rows 60, 61, 224–227, 398, 401, 403.
Seven of the nine undercharge by $117 each. I did not re-derive the row list.

² ASSERTED — `Trailer Module!BE` is the first of five `Part / Cost` pairs in the
pre-delivery band, and on rows 5, 7, 9, 10, 11, 12 it reads `Rego Label Holder`
at `BF = 1.824`. Every trailer carries a physical registration artefact as a
pre-delivery part.

³ ASSERTED — I extracted `Trailer Module` header row 1 from `KE` to the end:
`Is the trailer imported?` · `Was the trailer previously registed` *[sic]* ·
`Is a vehicle plate attached?` · `Is a VIN Stamped on frame?` · `Body Type` ·
`Date of manufacture` · `Manufacturer's Name` · `Model` · `Vin or Chassis Number`
(**twice — `KW` and `KZ`**) · `Tare (kg)` · `Tare obtained from` · `Tyre Size` ·
`Ply Rating` · `Load Rating` · `Cold Tyre Pressure` · `GTM` · `Axel Rating (kg)`
*[sic]* · `Tow Ball Rating (kg)` · `Is ATM detailed on Vehicle Plate?` ·
`Trailer Measurements` · `Under 2.5m Wide` · `Under 4.3m High` ·
`R' = or Less than 'P'` · `R' 3.7m or Less` · `G' 8.5m or Less` ·
`Caravan/Camper Trailer?` · `Fire Extingusher?` *[sic]* · `Approved Door Fitted?` ·
`Gas Appliances Installed?` · `Does trailer comply with VSB1` · `Registered by`.
Thirty-two headers, no data on any of 918 rows.

### The verdict

> **ONE concept.** Registration is a **third-party statutory charge**, looked up
> by band from one shared table, never marked up, and accompanied by a physical
> artefact. That description is true of the boat and true of the trailer with no
> edits.

Everything in the "different" column is a property of the **link**, not of the
concept:

- *which measure picks the band* (length vs mass) belongs to the join, exactly
  the way `Rigging Kit Option` and `Engine Hole` belong to the boat↔motor join
  rather than to either side;
- *which rung it lands on* (a separate line vs inside `Sell inc Rego`) belongs to
  the priced column;
- *quantity* belongs to the quote line, which `QUOTE_SPEC §5` already has
  (`qty`, and it already cites `MV!G23 × $M$54` as its precedent — that is this
  exact cell).

Modelling it twice costs us three things we can name: the 81-cent divergence
already in production; a boat rego line that has to be typed by hand while an
identical trailer line is automatic; and a rate rise on 1 July that has to be
found in two places.

---

# PART TWO — THE REST OF THE SET

Ranked by how much a single model saves. Each has the same three-question test
applied.

## Theme 2 — **The operation, and the two labour rates** ⭑ the biggest after registration

This is the largest cross-cutting concern in the estate by volume, and it is
already one table.

### The tables

**`Service Module (1).xlsx!Operation Codes`** — 1,166 rows. ASSERTED headers,
row 5:

```
C Operation / Option   ← THE KEY, free text
D Op Code              E Labour (Hrs)   F Labour Cost
G Sundry 1  H Sundry 2  I Sundry 3   J Sublet
K Total CTD   L MU   M GP
N Labour  O Sundry 1  P Sundry 2  Q Sundry 3  R Sublet   S Sell
U Procedure            ← ' [   ] Labour Estimated - (0.05)' — a checklist line
```

Row 6 is a **rate row**: `F6 = 130.0909…`, `N6 = 159`, `O6 = 1`, `P6 = 0.9`,
`Q6 = 0.8`, `R6 = 0.15`. ASSERTED. The whole 1,166-row table is driven by six
numbers in one row.

**`Service Module (1).xlsx!Labour Rates`** — 17 rate rows, `C8:H29`. ASSERTED:

| `C` Description | `D` Code | `E` Actual | `G` Rate (Exc GST) | `H` Rate (inc GST) |
|---|---|---|---|---|
| Retail Labour | `GEN` | 105 | 144.5455 | **159** |
| Pre Delivery Labour | `PD` | 105 | 144.5455 | 159 |
| Detail Labour | `DET` | 105 | 144.5455 | 159 |
| Trade | `TRA` | 105 | 130.0909 | 143.10 |
| **Internal** | `PDI` | 105 | **130.0909** | 143.10 |
| Internal - Pre Delivery | `PD` | 105 | 130.0909 | 143.10 |
| Warranty | `WAR` | 105 | 138.1818 | 152 |
| Warranty - Yamaha | `YAM` | 105 | **114.55** | 126.005 |
| Warranty - Stacer | `STA` | 105 | **75** | 82.50 |
| Warranty - Stabicraft | `STB` | 105 | **100** | 110 |
| Warranty - Surtees / Jeanneau / Haines / Highfield | `SUR`/`JEA`/`HAI`/`HIG` | 105 | 138.1818 | 152 |
| Warranty - Malibu | `MAL` | 105 | 110 | 121 |
| Warranty - Whittley | `WHI` | 105 | 85 | 93.50 |
| Warranty - Mercury | `MER` | 105 | 144.5455 | 159 |
| Warranty - Volvo | `VOL` | 105 | 127.5 | 140.25 |

Two faults worth recording, both ASSERTED:

- **`D` Code is not unique.** `PD` appears on row 10 (`Pre Delivery Labour`,
  144.5455) *and* row 15 (`Internal - Pre Delivery`, 130.0909). Two different
  rates under one code, in a column that looks like a primary key.
- **The two rates the whole business runs on sit on different GST bases.**
  `G14 = 130.0909` is **exc GST**; `H9 = 159` is **inc GST**. Every cost formula
  uses `$G$14` and every sell formula uses `$H$9`, so `Parts!P Labour ($)` and
  `Parts!X Labour` are not comparable without knowing which column each came
  from. Nothing in either module records the base.

### Who reads them — measured, not assumed

I counted distinct formula shapes and their occurrence in the saved XML of each
workbook. ASSERTED (they are formulas); the counts are exact.

**`Operation Codes!C` is the join target of four modules:**

| Module | Join column | Formula | Count |
|---|---|---|---|
| Trailer | `BB PD Operation` | `BC = VLOOKUP($BB,'[1]Operation Codes'!$C:$ZZ,3,0)` → hours | **445** |
| Parts | `N Install Type` | `O = VLOOKUP($N,'[2]Operation Codes'!$C:$ZZ,3,0)` → hours | **2,250** |
| Parts | `N Install Type` | `R = VLOOKUP(...,5) + (...,6) + (...,7) + (...,8)` → Sundry 1+2+3+Sublet | **2,247** |
| Dealer Fit | 30 accessory slots | `AA = VLOOKUP(X,'[2]Operation Codes'!$C:$ZZ,8,0)` → Sublet, ×30 slots | **1,685 / 1,568 / 1,513 / 1,502 …** |
| Motor | `CI Installation` | `CJ..CR = VLOOKUP($CI,'[1]Operation Codes'!$C:$ZZ, 2\|3\|4\|5\|6\|7\|8\|17, 0)` | **447 each** |

**`Labour Rates!$G$14` (cost) and `$H$9` (retail) are multiplied by hours in five:**

| Module | Column | Formula | Count |
|---|---|---|---|
| Boat | `JO Labour Rate ($)` | `= '[2]Labour Rates'!$G$14` — **the rate copied onto every boat row as a column** | **1,434** |
| Boat | `SY` / `TK` / `TW` (three PD tiers) | `= SX * '[2]Labour Rates'!$G$14` | 812 / 814 / 814 |
| Trailer | `BD PD ($)` | `= BC * '[1]Labour Rates'!$G$14` | **445** |
| Parts | `P Labour ($)` | `= O * '[2]Labour Rates'!$G$14` | **2,250** |
| Parts | `X Labour` | `= O * '[2]Labour Rates'!$H$9` | **2,250** |
| Dealer Fit | `K Labour CTD` / `L Labour Ret` | `= J * $G$14` / `= J * $H$9` | **1,778** each |
| Motor | `UC, UI, UO, UU, VA, VG …` (11 service events) | `= $KQ * '[1]Labour Rates'!$H$9` | **378** each |
| Motor | `Data Drop!D2` | `= '[1]Labour Rates'!$G$14` | 1 |
| MPF | `Dealer Fit Options!K20/L20` | `= '[139]Labour Rates'!$G$14` and `VLOOKUP('Retail Labour','[139]Labour Rates'!$C:$ZZ,6,0)` | 2 |

### Meaning: identical

An `Operation Codes` row is *one unit of work* — hours, three sundry buckets, a
sublet, a cost, a sell, and a procedure line for the technician's checklist. A
part references one to become fitted; a trailer references one to become
pre-delivered; a motor references one to become installed; a dealer-fit slot
references one to price its labour. **Same table, same key, same eight columns,
four different subsets pulled by hard-coded ordinal.**

**The boat is the exception and it is a fault.** It does not look up an
operation — it copies `$G$14` into a column (`JO Labour Rate ($)`, 1,434 rows)
and multiplies by its own `JN Boat PD (hrs)`. So a rate change re-computes 1,434
boat cells through a live external reference, but a boat's pre-delivery **work**
is not described anywhere as an operation. Its `JM Pre Delivery Code` /
`SW PD Code` enums (`PD-FOR-STD` · `PD-HIG-STD` · `PD-HIG-COM` · `PD-JEA-STD` ·
`PD-SIG-STD` · `PD-STA-BAS` · `PD-STC-STD` · `PD-SUR-STD`) point instead at the
Parts Module's `Dealer Fit Module` banner blocks. Two mechanisms for one idea.

**Cost of modelling it twice:** every fitted price in the estate. 2,250 parts +
1,778 bundles + 477 trailers + 491 motors resolve through one 1,166-row table.
If each module carries its own labour arithmetic, a rate rise is four edits and
the Boat Module is a fifth that nobody remembers.

---

## Theme 3 — **The cost→sell ladder: `CTD · MU · GP · Sell`**

The most-repeated shape in the entire estate, and the four words never change.

| Table | The ladder, verbatim from the header row |
|---|---|
| `Parts Maintenance` | `G P&A` · `H MU` · `I CTD` · `J MU` · `K GP` · `L Sell` — then again for fitted: `Q Parts CTD` · `R Sundry CTD` · `S Total CTD` · `T MU` · `U GP` · `Y Sell inc Install (if appl.)` |
| `Dealer Fit Module` | `E CTD` · `G Adj CTD` · `H Tot Parts CTD` · `I Parts Sell` · `K Labour CTD` · `L Labour Ret` · `O Act CTD` · `P MU` · `Q GP` · `R Act Sell` |
| `Operation Codes` | `K Total CTD` · `L MU` · `M GP` · `S Sell` |
| `Oils and Lubes` | `H CTD` · `I MU` · `J GP` · `K Sell` |
| **`Registration Costs`** | `J CTD` · `K SELL` — the ladder with the margin removed, which is *how the workbook says "pass-through"* |
| `Trailer Module` | `AS Landed` · `BS Total Nett CTD` · `BT MU %` · `BU GP` · `BV RRP` · `BW Sell` · `CA Sell inc Rego` |
| `Motor Library` | `X Landed CTD` · `AA Nett CTD` · `AX Total CTD` · `AY MU` · `AZ GP` · `BB RRP + Freight Inc GST` · `BC NSM Retail` · `BF Sell Price` (+ three cloned ladders) |
| `Boat Module` | `IY Landed Hull Cost` · `JF/JG/JH/JI` four markups · `QR Cash` · `QS GP %` … and three PD tiers each `SZ Parts CTD · TA Sundry CTD · TB Sublet CTD · TC Total CTD · TD GP % · TE GP $ · TF Sell (inc GST)` |
| `Std Service Schedules` | eleven repeats of `CTD · Sell · Time Allow.` |

ASSERTED, all from extracted header rows.

**Identical meaning, and the workbook proves it with two invariants that hold
everywhere:** `GP = Sell/1.1 − CTD` and `MU = GP / CTD`. Visible directly in
`Operation Codes!L/M`, `Oils and Lubes!I/J`, `Trailer!BT/BU`, `Motor!AY/AZ`,
`Parts!J/K` and `T/U`. (MPF_GROUND_TRUTH §6 derives the same; I confirmed the
shape on `Operation Codes` and `Oils and Lubes` directly.)

`CTD` is not defined anywhere in the estate. From `Parts!I = G + (G*H)` where
`G` is the supplier's `P&A` cost, it is unambiguously **cost to dealer**. OBSERVED
(a derivation from one formula, not a stated definition) — and worth noting that
the single most-used abbreviation in a $50 m price file is never spelled out.

**Cost of modelling it twice:** this is the direct answer to
`QUOTE_SPEC §8.2`'s blocking gap. Today a quote's only guide to which column is
a price is `MONEY = /price|cost|cash|rrp|sell|trade|freight|deposit|fee|charge/i`,
which matches `Dealer List Price`, `Base Cost` and `Landed CTD` as readily as
`Sell Price`. But the workbook already distinguishes them with **four
consistently-used words**. `CTD` is never a customer price. `Sell` always is.
`MU` and `GP` are never money you charge. That is a rule the data states, and it
is stated eight times.

---

## Theme 4 — **The audience** (price level)

The same product, priced for a different kind of buyer. Every priced table has
one, none of them has the same set, and one of them encodes it as **rows**.

| Table | Levels, verbatim | Encoding |
|---|---|---|
| `Boat Module` | `QR Cash` · `QT Trade` · `QV Sub Dealer` · `QX Sub (Exclusive)` · `QZ AUS Sailing` · `RB Warranty` | **six columns**, each with its own `GP %` |
| `Motor Library` | `BF Sell Price` (retail) · `BL Trade Price` · `BS Commercial Price` · `BY Boating Alliance Price` | **four ladders**, each with its own `MU`/`GP`/`Rebate`/`Discount` |
| `Labour Rates` | `Retail` · `Pre Delivery` · `Detail` · `Trade` · `Internal` · `Internal - Pre Delivery` · `Warranty` · `Warranty - <9 brands>` | **seventeen rows** |
| `Registration Costs` | `J CTD` · `K SELL`, plus 4 `(Pensioner / Concession)` rows | **two columns + four rows** |
| `Parts Maintenance` | `L Sell` · `Y Sell inc Install (if appl.)` | two columns — but the second is a **fitment** variant, not an audience |
| `Trailer Module` | `BV RRP` · `BW Sell` · `CA Sell inc Rego` | one audience; the other two are rungs |

The quote sheet resolves them all through one control. ASSERTED:

```
Managers View!D39 = 'Quote Sheet'!$AA$11
Managers View row 39 = Retail Sale · Trade Sale · Sub Dealer Sale ·
                       Sub (Exclusive) Sale · AUS Sailing Program ·
                       Commercial Sale · Boating Alliance Program
Managers View!D40 = HLOOKUP($D$39,$E$39:$K$59,2,0)
```

**Meaning: identical.** "Which kind of buyer is this?" **Sets: not identical, and
not alignable.** A boat has Cash/Trade/Sub Dealer/Sub Excl/AUS Sailing/Warranty;
a motor has Retail/Trade/Commercial/Boating Alliance; an hour has
Retail/Trade/Internal/Warranty-per-brand; a trailer has one; a registration fee
has two, neither of which is an audience. `QUOTE_SPEC §8.2` already spotted
exactly this and is right: *"index-matching across tables would price a boat at
cash and a part at fitted under the same choice."*

What this study adds is that the level vocabulary is **project-wide, not
per-table**. `Managers View!$E$39:$K$59` *is* the vocabulary, written down once,
seven entries. Each table implements a subset. So `priceLevels` belongs as a
declared vocabulary on the project with each table **mapping its columns onto
keys it has** — which is what §8.2's `PriceLevel { key, label, fieldId }`
already allows, provided `key` comes from a list and is not minted per table.

Two things fold in here rather than being themes of their own:

- **Warranty.** `Boat!RB Warranty` is a *price level* (`= ROUNDUP((IY-IW)*1.01*1.1,)`);
  `Labour Rates` rows 17–29 are twelve `Warranty - <brand>` *rates*. Same word,
  same meaning both times — "the rate we bill the manufacturer at". The Motor
  Library has **no warranty column at all**. It is an audience, not a theme.
- **The pensioner concession.** Four rows on `Registration Costs`. An audience on
  a fee.

---

## Theme 5 — **Pre-delivery**

Three modules encode the *same seven-part structure* with different names and
different slot counts.

| | **Boat** | **Trailer** | **Motor** |
|---|---|---|---|
| Operation | `JM Pre Delivery Code`, `SW/TI/TU PD Code` | `BB PD Operation` | `AC PD Operation Code` |
| Hours | `JN Boat PD (hrs)`, `KE Boat Hand Over (hrs)` | `BC PD (Hrs)` | `AD Labour (Hrs)` |
| Labour $ | `JO Labour Rate ($)` × hours | `BD PD ($)` | `AE Labour $` |
| Consumable parts | `JT..KC` — `P/D - Parts & Accessories 01..10` (**10 slots**) | `BE..BN` — five `Part / Cost` pairs (**5 slots**) | `AL..AS` — four `Parts (Code)` + `$` pairs (**4 slots**) |
| Fluids | `JQ Fuel Allocation (Litres)` | — | `AF Oil (Ltr)`, `AG Oil ($)`, `AH Fuel (Ltr)`, `AI Fuel ($)`, `AJ Flusher (Code)`, `AK Flusher ($)` |
| Detailing | `JP Boat Detailing ($)` | `BP Detailing` | `AT Detailing` |
| Sundry | `KJ Sundry Charges - 1` | `BO Sundry` | `AU Sundry` |
| Total | three sell tiers `TC/TO/UA Total CTD` → `TF/TR/UD Sell (inc GST)` | `BQ Total PD Charges` | `AV Total PD Allowance` |

ASSERTED, all from extracted header rows.

**Identical meaning:** the work and consumables to get a unit ready to hand over.
And the consumables come from one place — `Service Module!Oils and Lubes` supplies
oil and fuel per litre (`H10 = 7.41` 4-stroke, `H14 = 2.20` premium unleaded,
`G` = `Unit` = `'Litre'`), and both the boat and the motor hold a **litre count**
on their own row against it.

**The parts module carries the fourth copy as rows rather than columns**: the
`Dealer Fit Module` sheet has banner-scoped PD packs
(`PRE DELIVERY OPERATIONS - Stacer`, `HIGHFIELD - Sport 560`, r1598 over rows
1599–1613) whose `Code` and `Lab Hrs` come from
`VLOOKUP($C,'[7]Boat Module'!$C:$AAN,271|272,0)`. So the *same concern* is
modelled as **repeated column groups on three tables and as child rows on a
fourth** — which is the strongest possible argument that it is one concern.

**Cost of modelling it twice:** `QUOTE_SPEC §2.3` already documents the specific
damage — motor PD is inside `Total CTD` and must never be added again; part
labour is inside `Sell inc Install` and must never be added to `Sell`. Every one
of those "must never" sentences is a fact about where a shared concern landed on
a particular ladder, currently carried in prose rather than in the model.

---

## Theme 6 — **The image link**

The cleanest theme in the set: **one column, the identical name, four tables.**

| Table | Column | Non-empty cells |
|---|---|---|
| `Boat Module` | `F Image Link` | **1,475** |
| `Trailer Module` | `G Image Link` | **450** |
| `Motor Library` | `I Image Link` | **297** |
| `Dealer Fit Module` | `AB Image Link` | **882** |

ASSERTED (the name, four times, byte-identical). Counts OBSERVED — I read every
cell of each column.

All four hold a bare external HTTPS URL. Host census, OBSERVED:

```
www.highfieldboats.com        1,044      www.northsidemarine.com.au    251 + 873
www.yamaha-motor.com.au         241      northsidemarine1.sharepoint.com 300 + 5
mayfairmarine.com.au            121      www.stacer.com.au              70 + 13
www.formosamarineboats.com.au    18      www.gfabtrailers.com.au           11
adventure.highfieldboats.com     19      app.jeanneau.com                   4
dunbier.com                       3      static.wixstatic.com               1
momentumelectricmarine.com        2
```

**Identical meaning and identical failure modes.** `Boat!F` carries **52 live
`#N/A`**; `Motor!I` carries stray numerals where a URL should be
(`108173.02379805999`, `71634`, `75531`, `80289`, `82017`, `82975`); `Trailer!G`
carries **300 SharePoint URLs** that render nothing without a login. And the
consumer is the same everywhere — `MASTER PRICE FILE!Dealer Fit Options!I6 =
IFERROR(_xlfn.IMAGE(I18),)`, which currently evaluates to `#VALUE!` because
`I18` resolved to the NSM logo rather than a product photo. ASSERTED.

**The seed already treats this correctly** and is worth noting as the model:
`northside.ts` seeds `{ n: "Image Link", t: "image", s: "identity" }` on every
boat and trailer table. So a *type* plus a *section* already carries the concept
— which is precisely the pattern §8 below argues for everywhere else.

---

## Theme 7 — **Standard vs Option vs Dealer-Fit vs Recommended**

Four modules draw the same four-way distinction, each in its own words and its
own repeated-column encoding. ASSERTED, from extracted header rows.

| Distinction | Boat | Trailer | Motor | Parts |
|---|---|---|---|---|
| **Standard** — included, no price | `W..BV` `STANDARD FACTORY INCLUSIONS 01..51` (**51**) | `Q..AL` `TRAILER FEATURES 1..21` (**21**) | — (spec is columns) | — |
| **Factory Option** — priced by the factory | `BX..IG` `Factory Options 001..165` (**165**) | `CC..FY` `FACTORY OPTIONS` — 20 groups of `code · Description · Cost · Sell` (**20**) | `FT..GR` `Additional FO's 01..25` (**25**) | — |
| **Dealer Fit** — priced and fitted by NSM | `OK..QA` `Additional Dealer Fit Options - Line 01..42` (**42**) | `FZ..GS` `Dealer Fit Option - 1..20` (**20**) | `DA..EX` `Rigging Option 01..50` (**50**), `GT..KO` `Prop Option` (**100**) | the whole `Dealer Fit Module` sheet, 1,871 bundles × 30 slots |
| **Recommended / primary** | `KZ` **`Recommended Motor Option`** — slot 1 of 13 | — | — | `T` **`Accessory (Primary)`** — slot 1 of 30 |
| **Not required** | `NR - ENGINE NOT REQUIRED`, `NR - RIGGING KIT NOT REQUIRED`, `Rego Letters Not Required` | `TRAILER NOT REQUIRED`, `Pre Delivery - NOT REQUIRED` | `NR - Propellor Not Required` *[sic]*, `Installation Not Required` | `Supply Only - Installation Not Required`, `NR - Not Required` |

Three things this reveals:

1. **The word "Recommended" appears exactly once in any header in the estate** —
   `Boat Module!KZ`. Its synonym in the Parts Module is `Accessory (Primary)`.
   And neither is a flag: **recommendation is encoded as slot 1.** That is
   exactly what `QUOTE_SPEC §8.5` reports as broken in our seed — the joins
   declare their own `Recommended`/`Slot` columns instead of `__recommended` /
   `__order`, so `readPairs` returns `recommended: false` for all 651 rows. The
   workbook's own answer is *ordering*, and our `__order` key already expresses
   it. **The workbook never needed a boolean, and neither do we.**

2. **Twelve spellings of "no."** Counting only the ones I read directly:
   `NR - ENGINE NOT REQUIRED` · `NR - RIGGING KIT NOT REQUIRED` ·
   `NR - Propellor Not Required` · `NR - Not Required` ·
   `NR - Tie Downs Not Required` · `Rego Letters Not Required` ·
   `TRAILER NOT REQUIRED` · `Boat Registration Not Required` ·
   `Registration - NOT REQUIRED` · `Installation Not Required` ·
   `Supply Only - Installation Not Required` · `Pre Delivery - NOT REQUIRED`.
   Two of those live inside the Registration Costs table itself, one on the boat
   side and one on the trailer side, spelled differently. ASSERTED.

3. **The grain is the same and the count is not.** 51/165/42 on a boat,
   21/20/20 on a trailer, 25/50/100 on a motor, 30 on a bundle. Adding a 31st
   accessory to the Dealer Fit Module means adding 9 columns **and editing five
   30-term SUM formulas** (MPF_GROUND_TRUTH §8.3). Our join table with an
   `__order` key removes the count entirely.

---

## Theme 8 — **The factory lead-time block**

The purest evidence of a copy-pasted section anywhere in the estate: **six
headers, the same six words, the same order, in two workbooks.** ASSERTED.

| Boat | Trailer | Label (identical string) |
|---|---|---|
| `QJ` | `AU` | `Factory Lead Times (in Days)` |
| `QK` | `AV` | `Lockout Date` |
| `QL` | `AW` | `Factory Build Date` |
| `QM` | `AX` | `Factory Completion Date` |
| `QN` | `AY` | `Factory Shipping Date` |
| `QO` | `AZ` | `Estimated Lead Time (Days)` |

Motor and Parts have none. Two modules, same concern, byte-identical names — so
it passes tests 1 and 2 outright. It fails test 3 the least of any theme here
(nothing computes off it, so a divergence costs little), but it is the model case
for a **shared section definition**: if `lead-time` is a section id with six
named columns, a third table gets it for free and correctly.

---

## Theme 9 — **Supplier**

| Table | Column | Values |
|---|---|---|
| `Trailer Module` | `D Supplier` | 6 — `Dunbier Marine Products` (231) · `Mayfair Marine 2000` (113) · `GFAB Trailers` (49) · `Telwater Pty Ltd` (37) · `Formosa` (24) · `Haines / Dunbier BMT Packages Only` (19) |
| `Trailer Module` | `KU Manufacturer's Name` | **a second supplier field on the same row**, inside the compliance form, zero data |
| `Parts Maintenance` | `D Supplier` | ~90 codes — including `YAM` (566) and `Yam` (296) as **two distinct values** |
| `Parts Maintenance` | `F Supplier Description` | 414 live `#N/A` |
| `Motor Library` | `Q Supplier` | 4 — `Yamaha` (238) · `Jeanneau` (126) · `Haines Signature` (85) · `EPROPULSION` (37) |
| `Boat Module` | **none** | supplier identity is carried by `E Matrix` (the brand/pricing-profile key) and by nineteen pasted supplier price-list sheets in the Parts Module |

ASSERTED (headers); counts from MPF_GROUND_TRUTH §5, not re-derived here.

**Passes tests 1 and 2, fails test 2 partially on the boat**, where `E Matrix` is
doing double duty as brand *and* pricing profile *and* supplier. And the business
has already named the fix: `MASTER PRICE FILE!Home Page!F36` is a hyperlink
labelled **`Suppliers Module`**. There is a `Supplier Module.xlsx` in Downloads
(256 KB) that this study did not open — it is out of the named six.

---

## Theme 10 — **The stock unit** ⭑ new, and it changes what the MPF is

**The MASTER PRICE FILE's seven per-brand sheets are not price lists. They are
stock boards.** This was not previously recorded and the owner flagged the MPF as
important, so it is set out in full.

`Home Page` (44 × 16) is a **navigation hub** — a grid of hyperlinks to every
module on SharePoint. `H1` is labelled **`Registration Module`**, at the top
level, beside `Boat Module`, `Motor Module`, `Trailer Module`, `Parts &
Accessories`, `Service Module`, `Freight Module`, `Price Matrix`, `Suppliers
Module`, `Customer Module`, `Contacts Module`. ASSERTED. The business's own
top-level module list already contains registration as a peer of the four
catalogues.

Two live cells on the Home Page are read by other sheets:
`K9 = '[1]Boat Module'!$JA$235` and
`K13 = '[2]Motor Library'!$Y$90` → `'Yamaha 115/130HP Hero Campaign - Valid till
15.08.26'`. ASSERTED.

Each brand sheet (`Stabicraft`, `Surtees`, `Stacer`, `Formosa`, `Jeanneau`,
`Haines Signature`, `Highfield`) has the identical shape. ASSERTED:

```
C7  'CURRENT STOCK ON HAND'   G7 'SELL PRICE'  I7 'Into Stk'  J7 'Days in Stk'
                              L7 'Location'    M7 'Comments'
C30 'CURRENT STOCK ON ORDER'  ... same columns, I30 'ETA'

one row = one physical hull:
C  N014266                    ← the stock number
D  '1450 - Frontier (Profish)'
E  = '[5]Quote Sheet'!$D$19   → 'Yamaha - F50LC'                      the motor
F  = '[5]Quote Sheet'!$D$28   → 'REDCO Stabicraft - RE1313Q-MO ...'   the trailer
G  = '[5]Quote Sheet'!$D$1    → 58495                                 the price
I  2026-05-27 (a date)
J  = IFERROR(TODAY()-I11,)    → 72                                    days in stock
L  = IFERROR(VLOOKUP(C11,[4]Sheet1!$B:$ZZ,4,0),"Boondall")            location
M  = 'Home Page'!$K$13        → the campaign banner
```

**134 of the MPF's 141 external links are per-hull quote workbooks** —
`N013821 - Stabicraft 1450 Frontier Profish.xlsx`,
`N014458 - Highfield SP560 (HYP) B-W-C.xlsx`, and so on. The remaining seven are
`Boat Module`, `Motor Module`, `NSM_Stock_Location_Tracking`, `Contacts Module`,
`Parts Module`, `Service Module`, and a CSV. ASSERTED.

Four things this establishes:

1. **A stock unit is a first-class thing, distinct from a catalogue SKU.** It has
   its own identity (`N014266`), its own document, its own price, an arrival
   date, an age (`Days in Stk`, one row reads **1,137**), a physical location
   (`Boondall` · `Coomera` · `Not Available` · `On Order with Factory` ·
   `Located - Marine Trade Supplies`) and a free-text status
   (`Floor Stock Clearance!!!`). None of that is on any catalogue row.
2. **The rig triple appears for the third time.** `boat · motor · trailer · one
   price` — the same shape as the quote's `Managers View` columns `D/E/F/G` and
   as the boat row's `Motor Option` / `Std Trailer` slots. That is our view page.
3. **The same hull is priced in two places** — `Highfield` r13 reads 139,995 from
   its quote workbook while the `Boat Module` carries `QR Cash` for the same
   variant. One is a catalogue price, one is a unit price. Both are "the price."
4. **`Highfield` r15, r21–r41 have no motor and no trailer** — a bare inflatable
   with a price. The triple is optional, which our join model already handles.

**Does it pass the theme test?** Tests 1 and 2: yes — every brand sheet is the
same seven columns. Test 3: **yes, expensively** — today a stock unit's identity
lives only in a filename, and its price lives only in a workbook nobody else can
read. But this is a *new table*, not a shared column, and it is out of scope for
the quote. Recorded here so it is not re-discovered.

---

## Theme 11 — **GST, hardcoded, 24,951 times**

I counted literal `*1.1` and `/1.1` occurrences in every formula in every
worksheet of five workbooks. OBSERVED (a count), and the counts are exact:

| Workbook | formulas | `* 1.1` | `/ 1.1` |
|---|---|---|---|
| `Boat Module (5)` | 69,030 | 782 | 4,123 |
| `Trailer Module` | 8,658 | 178 | 212 |
| `Parts Module (3)` | 154,979 | 1,189 | 16,887 |
| `Copy of Motor Module (1)` | 59,395 | 362 | 946 |
| `Service Module (1)` | 20,224 | 84 | 188 |
| **total** | **312,286** | **2,595** | **22,356** |

**There is no GST-rate cell anywhere in any of the six workbooks.** The only
place the rate is even *named* is `Labour Rates!G8/H8` — `Rate (Exc GST)` and
`Rate (inc GST)` — and that is a pair of columns, not a rate.

`QUOTE_SPEC §2.6` already reached the right conclusion by a different route
(`1.1` hardcoded in seven production files while `organisation.gstPercentage`
sat unread) and its answer — an optional per-quote `taxRate`, blank by default,
never inferred — is the correct one and this study does not disturb it. What
this adds is the scale: **24,951 places the business would have to edit** if the
rate ever moved, and the fact that the workbook itself distinguishes
inc-GST from exc-GST columns *by name* in exactly one table.

---

## Theme 12 — **Validity typed into a string**

Every rate, campaign and price list in the estate carries its own as-at date, and
every one of them carries it **inside a label**. ASSERTED, each:

- `Registration Costs!C6` = `'AS at 1/7/25'` — a free cell above the table
- `Motor Library!Y Rebate Program` — twelve campaign names, each ending
  `- Valid till 25.05.2025` … `- Valid till 15.08.26`, **expired and live ones
  side by side in the same dropdown**
- `Home Page!K13` → `'Yamaha 115/130HP Hero Campaign - Valid till 15.08.26'`,
  referenced by three stock rows' `Comments`
- `Boat Module` series names: `HAINES SIGNATURE - Fisher Series (as at 18.03.2026)`
- Parts category banners with as-at dates from `26/6/18` to `5.08.2026`
- `Yamaha_Dealer_Current!A1` = `EFFECTIVE 1 Jul 2024`, `A2` = `EFFECTIVE 30 Jan 2024`

**Identical meaning, identical failure: the expiry is in the label, so nothing
can expire.** `QUOTE_SPEC §3.3` reached the same conclusion for quote validity
and chose a typed sentence, which is right *for a quote*. But for a **rate
table** the date is not decoration — it is what tells you whether $414 is still
$414. A `validFrom` on the table (not the row) would retire all six of these and
let a frozen quote say which vintage it priced from, which is the one thing
`QuoteLine.sourceNote` cannot currently express.

---

# PART THREE — CANDIDATES TESTED AND REJECTED

Named, because their absence should read as a decision, not an oversight.

## ✗ Freight — the word is shared, the mechanism is not

| Module | Columns | How the number arrives |
|---|---|---|
| Boat | `IQ Base Freight` · `IT Ocean Freight` · `IX Road Freight` (+ `IU Fuel Surcharge`) | **modelled** — `IX = ROUNDUP(G * '[9]FCL Import - Highfield'!$I$35, -1) + 250\|1100\|2000` |
| Trailer | `AR Freight` | **hand-keyed**, and 11 rows are a self-reference `=AR{r}` |
| Motor | `W Freight Exc GST` | **hand-keyed on 481 of 485 rows** |
| Parts / Service | none | — |

I counted references to `Freight Module` / `FCL Import` / `Quadrant Pacific` /
`Freight Distribution` across all five readable workbooks. OBSERVED, exact:

```
Boat 1,146    Trailer 0    Parts 0    Motor 0    Service 0
```

**Fails test 2.** One module computes freight from a per-metre container rate in
a shared module; two type a number into a cell. Same word, different question
("what did the container cost" vs "what did the supplier charge me"). Keep
`Freight` as a **cost-build column concept**; reject it as a shared table. If we
ever seed the Freight Module it joins to the boat and to nothing else.

## ✗ Stamp duty / ABP compliance — a brand relabelling, not a concept

`QUOTE_SPEC §2.2` lists `ABP Compl.` · `Stamp Duty` · `Handling` (Stabicraft),
`Quad Freight` · `Stamp Duty` · `Dazmac` (Surtees), `Aus Spec` · `Stamp Duty` ·
`IYT Logistics` (Jeanneau). These are **the same three cost-build columns
(`IQ`, `IV`, `IX`) relabelled by each brand's header row**, not three concepts.
The only true duty column is `Boat Module!IK Duty`, a per-brand rate
(`0` · `0.0002` · `0.005` · `0.05`) applied to the FOB stack at
`IV = SUM(IM:IU) * IK`. ASSERTED.

**Fails test 1** — one module. It is Theme 3's cost ladder wearing seven names,
which is itself a finding: *the same column means a different thing per brand* is
MPF_GROUND_TRUTH §8.4 and is a reason for one-table-per-brand, not for a shared
duty concept.

## ⚠ Compliance — real, cross-cutting, and not yet in the data

`Trailer Module!KE..NP` is a **32-header VSB1 vehicle-compliance form with zero
data on any of 918 rows** (listed in full at §5 footnote 3). The boat has no
equivalent — its nearest analogue is the safety band `KP..KT`
(`Adults` · `Standard Safety Gear` · `PFD's Sup.` · `PFD Type` ·
`Standard Anchor Kit`), which is a *what's supplied* list, not a *does it
comply* checklist.

**Fails test 1 today** (one module, and it has no values). But it is the same
concern as registration — a statutory obligation attaching to a physical unit —
and it shares registration's artefacts (`VIN Plate` and `PPSR Fee` sit in
`Registration Costs!C21` "Other Fees & Charges"). Record it as **the business's
own written feature request**, which is what a header row with no data is, and
note that it belongs to the **stock unit** (Theme 10), not to the catalogue row:
a VIN and a date of manufacture are facts about *this trailer*, not about the
model.

## ⚠ Part number — ten spellings, not one namespace

`Parts!E Code` · `Trailer!E Code` · `Dealer Fit!D Code` (×31 slots) ·
`Oils and Lubes!E Part No.` · `Boat!LB Prop Part No.` (×13 slots) ·
`Motor!AL Parts (Code)` (×4) · `Motor!AJ Flusher (Code)` ·
`Motor!FH Alternate Model Code` · `Labour Rates!D Code` ·
`Operation Codes!D Op Code` · `Registration Costs!G REV Code` ·
`Parts!AA Operation Code`. ASSERTED.

**Fails test 2.** `Labour Rates!D` holds `GEN`/`PD`/`DET`/`TRA`;
`Registration Costs!G` holds `REGO 1..8`; `Parts!E` holds a supplier's part
number. These are not one namespace. The *actual* theme underneath is different
and does hold: **every table carries an outbound code for the downstream DMS** —
`Parts!AA Operation Code` is minted as `"DFO-"&D&"-"&E`, `Motor!AC` as
`"PD_YAM_"&D`, and `Registration Costs!G` is hand-assigned. Call it
`Revenue / DMS code`, note it is present on eight tables and unique on none of
them, and leave it as a column concept.

## ✗ Deposit / payment schedule — one module

`Boat Module!QC..QH` — `DEPOSIT PAYMENT SCHEDULE` · `Pending Deal/Security
Deposit` · `Confirmed Deal Deposit` · `Leaving Factory Payment (HIN Supplied)` ·
`Notice of Arrival Payment` · `On Handover`. The only other header matching
`payment` is `Motor Library!WS Payments` = `72` on 411 of 413 rows, which is a
**service-plan term**, a different thing entirely. **Fails test 1.**
`QUOTE_SPEC §7` already excludes payment schedules for an independent and
correct reason.

## ✗ Currency / FX — two places, one module and one supplier sheet

`Boat Module!II Currency` (`AUD`/`USD`/`Euro`/`NZ`) and `IJ EX Rate`
(`=VLOOKUP(II,'[1]Exchange Rates'!$C:$ZZ,4,0)`), plus
`Parts Module!Highfield!G1 Exchange Rate = '[1]Exchange Rates'!$F$12 = 0.7`.
Two consumers of one shared cell. **Fails test 1** as a *module* theme, though
it is a genuine shared lookup. `QUOTE_SPEC §7` excludes multi-currency; nothing
here changes that.

## ✗ In-stock / inventory as a catalogue column

No inventory column exists on any catalogue row in any of the six workbooks.
Stock is Theme 10 and it lives on a different kind of row. Confirms
MPF_GROUND_TRUTH §4.4's removal of `In Stock: boolean`.

---

# PART FOUR — THE PRODUCT QUESTION

> Which of these deserve to be ONE THING in our app — a shared column concept, a
> shared table, or a capability every module inherits — rather than being
> re-modelled per module?

## 6. The constraint that shapes the answer

Our app's concept key is **kind-scoped by construction**.
`src/features/constraints/columns.ts`:

```ts
/** One column as the business means it, across every table that has it. */
export interface ColumnConcept {
  /** stable across reloads: kind + the normalised column name */
  key: string
  kind: TableKind
  …
}
```

and the header comment states the reason plainly: *"One table per brand means
'Shaft Length' is not one column: it is seven columns, one on each boat brand's
table."* `RuleSentence.sideConcepts` then enforces single-kind sentences
deliberately — *"the obligation lives on the same kind as the condition, or the
rule could never be true of any row."*

That is correct **for a rule** and it is exactly wrong **for a theme**. Every
finding in this study is a concept that crosses kinds: registration is
`boat` + `trailer`; the operation is `trailer` + `accessory` + `motor` +
`package`; the image link is four kinds; the cost ladder is all of them.

**So the honest statement of the gap is one sentence:**

> Our column-concept key is `kind + name`, and every cross-cutting concern in the
> Master Price File is `name` across many kinds. The themes are precisely the
> concepts our concept model cannot currently express.

That does **not** mean widening `ColumnConcept.key` — the single-kind rule is
load-bearing and `workbookRules.ts` is right to defend it. It means the answer
lives at a different layer, and there are three, in increasing cost.

## 7. TIER A — becomes a TABLE the app joins to

Four candidates. Each is already a table in the estate, with a name, a key
column and a header row. We do not design them; we seed them.

### A1. `Registration Costs` — **22 rows. Do this one first.**

Kind: a new `fee` / `statutory` kind, or `custom` with a `lookup` role.

| Column | From | Type |
|---|---|---|
| `Band` | `C` | text — **the key** |
| `Subject` | derived from the section labels `C8`/`C15`/`C21`/`C29` | select — `Boat` · `Trailer` · `Other` |
| `REV Code` | `G` | text |
| `CTD` | `J` | number |
| `SELL` | `K` | number |

Two joins, curated pairs, both of which we already have the machinery for:

```
boat.<Boat Registration>  →  registration.Band     7 boat tables
trailer.<Rego Type>       →  registration.Band     7 trailer tables
```

**Why a table and not a column.** Because it *is* one table, in one file, that
two modules already reach into by name. Because the `Boat Transfer Fee` /
`Trailer Transfer Fee` pair proves the business models registration as one
concern with two subjects. And because seeding it as a table is what fixes the
81-cent divergence: **one row, one `CTD`, one `SELL`, and the quote line records
which column it read** — which is `QuoteLine.priceFieldId` + `priceColumnName`,
already specified in `QUOTE_SPEC §8.1`.

**What the app must NOT do, stated as hard requirements:**

- **Never derive the band.** Both `KM` and `BY` are hand-keyed, and nine trailer
  rows contradict their own ATM. Deriving `BY` from `K ATM (KG)` would change
  nine live prices. Offer it as a **check** — this is exactly the shape
  `workbookRules.ts` is built for, and it is one of the two rules that document
  already lists as `blocked` for want of a lookup. Show the nine, change none.
- **Never mark it up.** `3rd Party Recovery` is the workbook's own word.
- **Never add it twice.** The trailer's rego is already inside `Sell inc Rego`.
  The boat's is not inside `Cash`. That difference is a fact about a *column*
  and must be recorded on the column, not remembered.
- **Never default the concession.** Four pensioner rows exist; nothing in any
  workbook says when they apply. That is a person's choice among rows in a table
  we can now show them — which is strictly better than a typed number and still
  invents nothing.

**What this changes on a quote, precisely.** `QUOTE_SPEC §2.3`'s bullet *"Boat
pre-delivery and boat registration are a person's line"* becomes, for
registration only:

> Boat registration is a **priced line read from the Registration Costs table**,
> at the band the boat row names in `Boat Registration`, from the column the
> business reads on a quote (`CTD`). It carries `sourceNote =
> 'Registration Costs!J11'` and prints `3rd Party Recovery`. Boat pre-delivery
> remains a person's line.

That is one fewer typed number per boat quote and one more cell reference on the
document.

**Second-order win nobody has to argue for:** the seed *already has the section*.
`northside.ts` declares `{ id: "registration", name: "Registration" }` on all
**seven trailer tables**, carrying `Rego Type` · `Rego ($)` · `Sell inc Rego`.
The seven **boat** tables have `identity` · `cost-build` · `pricing` and **no
registration section at all** — because `Boat Module!KM` was never seeded. So
the shared section id exists, is spelled correctly, and is applied to one of the
two kinds that need it. **The cheapest correct change in this whole document is
adding `Boat Registration` and `Boat Rego Decals` to the boat tables under the
section id that is already there.**

### A2. `Operation Codes` — 1,166 rows, four modules join to it

Kind: `package` (it is already `Package ▸ Component`-shaped) or a new
`operation` kind. Key: `C Operation / Option`. Columns as listed in Theme 2.

**Why a table.** 2,250 + 1,778 + 447 + 445 lookups resolve into it. It is the
single largest join in the estate and the one that most needs `reference` fields
— its key is a sentence with the hours inside it
(`Install Motor (5.0) - Excludes Rigging Kit Installation`), which is
MPF_GROUND_TRUTH's #1 pain.

**Do not seed it in the same pass as A1.** A1 is 22 rows and unblocks a named
gap in a shipped spec. A2 is 1,166 rows and unblocks a feature nobody has
specified yet.

### A3. `Labour Rates` — 17 rows

**This is not a constants file. It is a price-level table**, and modelling it as
such is what gives Theme 4 an anchor a person can see. Key: `C Description`.
Columns: `D Code`, `E Actual`, `G Rate (Exc GST)`, `H Rate (inc GST)`.

Seed it **read-only and unjoined** in the first pass. It is the correction
`QUOTE_SPEC §2.3` needs (the rate exists) without being the licence to compute
with it (nothing multiplies by it until an operation is joined).

### A4. `Suppliers` — the business already named it

`MASTER PRICE FILE!Home Page!F36` is a hyperlink labelled `Suppliers Module`.
Three modules carry a `Supplier` column with no shared vocabulary
(`YAM` vs `Yam` as two values in one column). Out of scope for this study — the
file was not among the six — but named so it is not re-discovered.

## 8. TIER B — becomes a SECTION every product table shares

`model.ts` already has the machinery: `ColumnSection { id, name, accent }` on
`EntityDef`, `FieldDef.sectionId`, and `TableKindMeta.sections` as presets. The
seed already uses it. What is missing is that **section ids are minted per kind
rather than drawn from one list.**

Proposed shared section ids, each with the evidence for why it is one section
and not several:

| Section id | Evidence it is ONE section | Which kinds |
|---|---|---|
| `identity` | name · code · supplier · **`Image Link`** — the last of those is byte-identical in four tables | all |
| `cost-build` | `CTD` appears under that exact word in eight sheets; `Landed` / `Nett` / `Total CTD` are its rungs | boat · motor · trailer · accessory · package |
| `pricing` | `MU` · `GP` · `Sell` in the same eight sheets, with `GP = Sell/1.1 − CTD` holding in all of them | all priced kinds |
| `pre-delivery` | seven-part structure repeated verbatim on boat, trailer and motor (Theme 5) | boat · motor · trailer |
| `registration` | **already exists in the seed, on trailers only** | boat · trailer |
| `lead-time` | six identical header strings in two workbooks (Theme 8) | boat · trailer |
| `operations` | `Op Code` · `TTF (Hours)` · `Install Type` — the outbound work description | accessory · package · motor · trailer |

**The argument for sections over tables here** is that these are *facts about the
product*, not *rows in a register*. A boat's `Landed Hull Cost` is not a row in a
shared cost table; it is this boat's cost. What is shared is the **shape** — four
words in a fixed order, with two invariants between them.

**And the payoff is concrete: it is the answer to `QUOTE_SPEC §8.2`.** That spec
correctly identifies that a quote must not guess a price column from a regex,
and correctly proposes `priceLevels?: PriceLevel[]` on `EntityDef`. This study
adds two corrections to the proposal:

1. **The level keys are a project-wide vocabulary, not a per-table invention.**
   `Managers View!$E$39:$K$59` *is* the vocabulary, written down once:
   `Retail Sale` · `Trade Sale` · `Sub Dealer Sale` · `Sub (Exclusive) Sale` ·
   `AUS Sailing Program` · `Commercial Sale` · `Boating Alliance Program`. Add
   `Warranty` and `Internal` from `Labour Rates`. Each table maps its own columns
   onto the keys it has; a table with no column for the chosen key resolves to
   its first, which §8.2 already handles via `levelKey` / `levelResolved`.
2. **A price level needs a `rung`, not just a `fieldId`.** `Sell inc Rego`
   includes registration; `Cash` does not. `Sell inc Install` includes labour;
   `Sell` does not. `Total CTD` includes pre-delivery; `Nett CTD` does not.
   Every "must never add this twice" sentence in `QUOTE_SPEC §2.3` is a fact
   about what a price column already contains. Three booleans on `PriceLevel`
   (`includesRegistration`, `includesInstall`, `includesPreDelivery`) would move
   those sentences from prose into data, and the quote's rule becomes
   mechanical: *never add a charge a line's own price column already includes.*

That is the single highest-value change this lens produces for the quote, and it
costs three optional fields.

## 9. TIER C — becomes a CAPABILITY every table inherits

Not a column, not a table — something the app knows about a row regardless of
kind.

### C1. **A row has a display image.** `ImageRef` already exists in `model.ts`
(*"a catalogue tile or a quote header"*). Four tables carry an identical
`Image Link` column with identical failure modes. Today each table re-declares
it as a field, and `defaultColumns` has to be told not to print a URL. Declaring
it once on `EntityDef` — the way `displayFieldId` already works — makes the view
page, the quote header and the picker all correct by construction, and makes the
52 `#N/A` in `Boat!F` a *missing image* rather than a *broken cell*.
`QUOTE_SPEC §3.1` already says a missing photograph prints nothing and is never
an error. This is the same rule, one layer down.

### C2. **A price level is a project vocabulary.** §8 above.

### C3. **"Not required" is a value, not a row.** Twelve spellings of no,
across five modules, two of them inside the Registration Costs table. One
null-sentinel capability on a `select` field — *this option means "none"* — and
every one of them collapses. Without it, "Registration - NOT REQUIRED" is a
$0 line on a quote, which is exactly the silent-zero failure
`QUOTE_FINDINGS §2.6` names.

### C4. **A table has a vintage.** Theme 12. Every rate table in the estate
carries its as-at date inside a label. A `validFrom` on the **table** (not the
row) retires all six of them, and lets a frozen quote record which vintage it
priced from — the one thing `QuoteLine.sourceNote` cannot express today.
`sourceNote: 'Registration Costs!J11'` tells you the cell; it does not tell you
that the cell said `414` under the `AS at 1/7/25` schedule.

### C5. **Recommendation is order, not a flag.** The workbook says
`Recommended Motor Option` = slot 1 and `Accessory (Primary)` = slot 1. It never
uses a boolean. `QUOTE_SPEC §8.5` reports our seeded joins mint their own
`Recommended` column so `readPairs` returns `false` for all 651 rows. **The
workbook's own answer is `__order`, which we already have.** This is not a new
capability — it is a reason to prefer the cheaper of the two fixes §8.5 offers.

## 10. What to do first, and why

| # | Action | Rows | Unblocks |
|---|---|---|---|
| 1 | Add `Boat Registration` + `Boat Rego Decals` to the seven boat tables under the **existing** `registration` section id | 2 columns | the boat's half of the theme; costs nothing; the section already exists on trailers |
| 2 | Seed `Registration Costs` as one 22-row table; join it to boat and trailer | 22 | `QUOTE_SPEC §2.3`'s boat-registration gap, with a cell reference |
| 3 | Add `rung` flags to `PriceLevel` (§8.2) | 3 optional fields | every "never add this twice" sentence in §2.3 becomes mechanical |
| 4 | Seed `Labour Rates` read-only, unjoined | 17 | the correction to §2.3, without licence to compute |
| 5 | Draw the shared section id list once (§8) | — | `lead-time`, `pre-delivery`, `operations` become free for the next table |
| 6 | Record the CTD/SELL divergence as a workbook rule seed, `blocked` | 1 | the 81 cents, visible, uncorrected, with the cell |

Items 1–4 invent nothing. Every number in them has a cell. Item 6 is deliberately
`blocked` in the `workbookRules.ts` sense: the app should be able to **show** the
divergence long before it is allowed to **resolve** it, because resolving it
changes a number the business is currently charging.

---

## 11. What was not verified

- **Nothing was run.** No dev server, no typecheck, no browser. Every claim about
  this repo is read from source with Read and Grep. `src/demos/northside.ts` was
  never touched by a shell tool.
- **`Motor Module (1).xlsx` is not a readable zip** (truncated download, 7.0 MB
  against a 33 MB sibling). Every motor citation in this document comes from
  `Copy of Motor Module (1).xlsx` and says so. The two may differ; I did not
  diff them.
- **Counts I did not re-derive** and have attributed to
  `docs/specs/MPF_GROUND_TRUTH.md` rather than to my own reading: the
  `Trailer!BY` value distribution (430/43/2), the nine ATM-rule violations and
  their row numbers, the `Parts!D` supplier duplicates, the `Motor!W` /
  `Motor!T` manual-entry counts, the 938/968/131 live-error counts. Everything
  else in this document I read directly.
- **`Registration Module.xlsx` may not be the copy the modules link to.** The
  Trailer Module's `[3]` and the quote template's `[10]` both resolve to a
  SharePoint URL ending `Registration%20Module.xlsx`; the local 20 KB copy in
  Downloads matches the Trailer Module's cached values cell for cell, which is
  strong but not proof of identity.
- **The `+25.7` in the boat registration formulas is unexplained.** It is a
  literal inside four formulas and is labelled nowhere. This study does not
  guess what it is.
- **`Supplier Module.xlsx`, `Rigging Module.xlsx`, `Price Matrix.xlsx`,
  `Freight Module.xlsx` and `Factory Options Module.xlsx` were not opened** —
  they are outside the named six. Every claim about them is from a cached
  external-link value or a formula in one of the six.
- **Whether `Heavy Trailers - Over 4.55t` is genuinely unused** rests on the
  MPF_GROUND_TRUTH value counts for `Trailer!BY`, not on my own scan.
- **The MPF's per-brand stock boards were read for shape, not exhaustively.** I
  read `Home Page`, `Stabicraft`, `Highfield` and `Dealer Fit Options` in full;
  `Surtees`, `Stacer`, `Formosa`, `Jeanneau`, `Haines Signature`, `Boat Show`
  and `Dropdowns` I did not open. The claim "each brand sheet has the identical
  shape" is OBSERVED across three of eight.
