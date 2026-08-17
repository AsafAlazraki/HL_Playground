# STUDY — THE MASTER PRICE FILE, PER-BRAND SHEETS

**Lens:** the seven brand sheets of `MASTER PRICE FILE.xlsx`, which earlier
research passed over in favour of the quote sheet. The owner says the MPF is
important to this app and everything in it.

**Sources, all opened read-only, none written, moved or renamed:**

| Workbook | Size | Role here |
|---|---|---|
| `C:/Users/AsafA/Downloads/MASTER PRICE FILE.xlsx` | 1.28 MB | the subject |
| `C:/Users/AsafA/Downloads/Boat Module (5).xlsx` | 21.9 MB | the catalogue it is compared against |
| `C:/Users/AsafA/Downloads/Service Module (1).xlsx` | 30.7 MB | the labour and fuel rates it reaches into |
| `C:/Users/AsafA/Downloads/BMT - Quote Module 2026.xlsx` | 14.9 MB | external-link index map only |
| `C:/Users/AsafA/Downloads/N012024 - Merry Fisher 695 S2.xlsx` | 10.6 MB | one live deal workbook, to close the chain |

Probes: `scratchpad/probes/m01_inventory.py` … `m22.py` (22 scripts) under the
session scratchpad.

**Evidence marks, same discipline as `FITMENT_RULES.md`:**
**ASSERTED** = a formula, a data validation, a stated header, a rate table, an
explicit cross-file link. **OBSERVED** = a pattern in the values, always with a
numerator and a denominator. The word *usually* does not appear below.

---

## 0 · THE ONE-PARAGRAPH ANSWER

**A brand sheet is not a price list. It is a stock list.** One row is one
physical hull that Northside owns or has on order, identified by its N-number,
and its `SELL PRICE` is a cross-file pointer into *that hull's own deal
workbook*. The Boat Module is the catalogue — models and variants, the cost
build, and six price levels. The MPF brand sheet is the floor — units, ages,
locations, and the one number the yard is actually asking for that boat today.
They are different grains of the same brand and **neither is a substitute for
the other**. Our per-brand tables are seeded from the Boat Module, which is the
right place for a catalogue; what we have no table for at all is the stock unit,
and that is the gap this study found.

---

## 1 · THE WORKBOOK, SHEET BY SHEET

ASSERTED — `m01_inventory.py`.

| # | Sheet | Dimensions | What it is |
|---|---|---|---|
| 1 | `Home Page` | `A1:P44` | a hyperlink launcher, 60 links, 2 live cells |
| 2 | `Stabicraft` | `A1:AW65` | stock list + an orphan spill block at `AL7:AW11` |
| 3 | `Surtees` | `A1:X84` | stock list + an orphan spill block at `M7:X11` |
| 4 | `Stacer` | `A1:P65` | stock list |
| 5 | `Formosa` | `A1:P54` | stock list |
| 6 | `Jeanneau` | `A1:M33` | stock list |
| 7 | `Haines Signature` | `A1:L40` | stock list |
| 8 | `Highfield` | `A1:M193` | stock list, the largest |
| 9 | `Boat Show` | `A1:M65` | same-shaped display-stock list, **currently empty of rows** |
| 10 | `Dealer Fit Options` | `A1:AP472` | a single job-costing **form**, not a table |
| 11 | `Dropdowns` | `A1:T5206` | hidden; picker lists, mostly unbound |

### 1.1 · 141 external references, and what they say about the file

ASSERTED — `m02_extmap.py`, resolved from `xl/externalLinks/_rels/*.rels`.

| Index | Target | Count |
|---|---|---|
| `[1]` | `Boat Module.xlsx` | 1 |
| `[2]` | `Motor Module.xlsx` | 1 |
| `[3]`…`[136]` | **individual deal workbooks**, one per hull, `N0xxxxx - <model>.xlsx` | 134 |
| `[137]` | `Contacts Module.xlsx` | 1 |
| `[138]` | `Parts Module.xlsx` | 1 |
| `[139]` | `Service Module.xlsx` | 1 |
| `[140]` | `C:\Users\AsafA\Downloads\Motor Module.csv` | 1 |
| `[141]` | `G:\Data\Boat Sales\Master Price List\Copy of Boat Sales Master Price List.xlsx` | 1 |

**134 of 141 external references — 95 % — point at one boat each.** That single
fact settles what a brand sheet is before a cell is read.

Two of the seven remaining are broken by construction: `[140]` is a CSV sitting
in one person's local `Downloads` folder, and `[141]` is a mapped `G:` drive
that no longer exists in a SharePoint world. Neither is referenced by any
formula on any brand sheet (`m08_extcells.py` — zero hits), so they are dead
weight, not live risk. Recorded so the next reader does not have to check.

> **Never cite a bare `[n]`.** The index is per-workbook. `Service Module.xlsx`
> is `[139]` in the MPF, `[6]` in `BMT - Quote Module 2026.xlsx`, and `[4]` in
> the `N012024` deal workbook. All three verified. §7.2 turns this into a
> correction to `QUOTE_SPEC.md`.

---

## 2 · THREE BRAND SHEETS, IN DETAIL

### 2.1 · Highfield — `A1:M193`, 13 columns, 116 stock rows

ASSERTED — `m03_brand.py Highfield`, `m04_scan.py Highfield`.

**Header rows.** Three of them — `r1`, `r7`, `r71` — plus a link stack running
*down* column A that is not a column of data at all.

- **Row 1** — a navigation strip: `A1 'Return to Home Page'`,
  `D1 'Stock Folder - Highfield'`, `E1 'Product Bulletins'`,
  `F1 'Customer Quotes'`, `I1 'AUS Sailing Offer'`, `M1 'MPF - Quote Sheet'`.
  Every one is a hyperlink to SharePoint; `A1` is an internal link to
  `'Home Page'!A1`.
- **Column A, rows 2–11** — nine document links: `Trading Profile`,
  `Highfield - Retail Price List`, `Highfield - Trade`, `Highfield - Sub
  Dealer`, `Highfield - Exclusive`, `Highfield - Spare Parts`,
  `Logistics Chart`, `Supplier FO Price List`, `Supplier Price File`. (Column A
  holds eleven strings in all: these nine, `A1`, and a repeat of
  `Logistics Chart` at `A71`.) **Four of the nine are price-level names** —
  Retail, Trade, Sub Dealer, Exclusive — a fifth level, `AUS Sailing`, sits at
  `I1`, and `Spare Parts` echoes the ladder's `Spare` columns. Those are the
  same levels the Boat Module ladder carries (§4.1). The sheet's navigation *is*
  the price-level vocabulary.
- **Row 7** — the column header for block 1:
  `C 'CURRENT STOCK ON HAND' · G 'SELL PRICE' · I 'Into Stk' · J 'Days in Stk' ·
  L 'Location' · M 'Comments'`.
- **Row 71** — the column header for block 2:
  `C 'CURRENT STOCK ON ORDER' · G 'SELL PRICE' · I 'ETA' · J 'Into Stk' ·
  L 'Comments'`.

**Live range.** Block 1 `r9:r67` (stock on hand). Block 2 `r74:r178` (stock on
order). `r179:r193` empty. Blank rows inside each block separate size groups —
they are visual gutters, not record boundaries.

**What one row is.** Row 9, verbatim:

```
C9  'N014039'                                   stock number, typed
D9  'Highfield - ADV7 (HYP) B-G-B'              model+material+colour, typed free text
E9  ='[72]Quote Sheet'!$D$19   -> 'Yamaha - F250XCB'
F9  ='[72]Quote Sheet'!$D$28   -> 'REDCO Custom / Highfield ADV7 Aluminium - TA700T…'
G9  ='[72]Quote Sheet'!$D$1    -> 179000
I9  2025-11-12                                  into stock, typed date
J9  =TODAY()-I9                -> 268
L9  =IFERROR(VLOOKUP(C9,[4]Sheet1!$B:$ZZ,4,0),"Boondall")  -> 'Boondall'
M9  (empty)
```

`[72]` is `N014039 - ADV7.xlsx`. **A row is a boat, a motor, a trailer, a price,
an age and a yard** — and four of those six are read live from that boat's own
deal workbook.

**Fill, by column** (ASSERTED counts, `m07_colprofile.py`):

| Col | Formulas | Literals | Reading |
|---|---|---|---|
| C stock no. | 0 | 118 (incl. 2 block labels) → **116 stock rows** | typed |
| D model | 3 | 115 | typed, 3 rows read `'Quote Sheet'!$D$13` instead |
| E motor | 13 | 1 | only 13 of 116 rows carry a motor |
| F trailer | 7 | 1 | only 7 of 116 rows carry a trailer |
| G sell price | 65 | 1 (the `r71` header) | **65 of 116 rows are priced** |
| I into stock / ETA | 0 | 45 | typed dates |
| J days | 42 | 1 | `=TODAY()-I` |
| L location | 42 | 1 | `VLOOKUP` into `NSM_Stock_Location_Tracking.xlsx` |
| M comments | 1 | 53 | 53 typed, 1 reads `'Home Page'!K13` |

OBSERVED: **51 of 116 Highfield stock rows carry no price** (116 − 65). All 51
sit in block 2 at `r109:r178` — stock ordered but not yet given a deal
workbook. The sheet renders them as blank, not as *unpriced*.

### 2.2 · Stacer — `A1:P65`, 16 columns, 31 stock rows

ASSERTED — `m04_scan.py Stacer`.

Same skeleton, four differences that matter:

1. **Column A carries five links, and they are different ones**:
   `Trading Profile`, `Runout Promo till 7.10.25`, `Dealer Price List`,
   `Stacer Factory Options`. Row 3 puts `C3 'Hull Only Price List'` where
   Highfield puts a brand name. **The link stack is per-brand and unstructured**
   — no two brand sheets carry the same set.
2. **Blocks:** `r9:r33` on hand (25 rows, 18 priced), header at `r35`,
   `r36:r48` on order (13 rows, **0 priced**).
3. Every one of those 13 on-order rows has, in column E where a motor pointer
   belongs, the literal string `'No Quote Sheet - Waiting on Boat Sales'`
   (ASSERTED, 13 of 13). A sentence has been typed into a data column.
4. **`D65 = '=Stacer!#REF!'`** — a live broken reference saved in the file,
   fifteen rows below the last record.

**Model naming diverges from every other sheet.** Stacer writes
`'399S - Proline L/S'`; Highfield writes `'Highfield - SP660 (HYP) DG-G-WB'`;
Stabicraft writes `'1450 - Frontier (Profish)'`. Highfield prefixes the brand,
Stacer and Stabicraft do not, and all three use ` - ` as the separator between
*different things*. §3.2 measures what that costs.

**`N014 TBC` appears as the stock number on 5 of 31 rows** (OBSERVED,
`m22`-adjacent count). The key column has a placeholder in it, five times.

### 2.3 · Stabicraft — `A1:AW65`, 49 columns, 24 stock rows

ASSERTED — `m04_scan.py Stabicraft`, `m06_rawxml.py`.

Blocks `r10:r23` on hand (14 rows) and `r32:r46` on order (10 rows). 23 of 24
priced; `r46 N014607` carries `'Waiting on Quote Sheet from Boat Sales'` in E.

Two things live here that live nowhere else:

- **`AL7:AW11` is an array formula: `{=Stacer!$D$13:$O$17}`.** A five-row,
  twelve-column spilled mirror of *the Stacer sheet* parked forty columns to the
  right of the Stabicraft data, off the edge of any normal viewport. Its cached
  values are Stacer stock (`'399S - Proline L/S'`, `'429 - Rampage'`) with
  prices `15995`, `13495`, `21995` and date serials `45869`, `45964`, `45883`.
  `Surtees!M7:X11` carries the identical construction. Nothing references
  either. This is why `Stabicraft` is 49 columns wide and `Surtees` is 24.
- **`K65 = 'y'`** — a single stray character.

Column L shows the sheet's split brain: **9 formula cells** (`VLOOKUP` into the
stock-location tracker) and **16 literals**, eleven of which are the typed
string `'On Order with Factory'`. The same column answers *where is it* two
different ways depending on which block the row is in.

---

## 3 · THE BRAND SHEET AND THE SAME BRAND IN THE BOAT MODULE

### 3.1 · Different grains, and the counts

The Boat Module (`Boat Module (5).xlsx`, sheet `Boat Module`, `A1:FCJ4731`) is
one sheet with brand bands stacked vertically, each band re-emitting the full
header row. ASSERTED band starts: `STACER r3`, `Stabicraft r143`,
`Surtees r200`, `Jeanneau r226`, `Haines Signature r262`,
`Highfield Inflatables r278`, `FORMOSA r955`, `OBSOLETE MODELS r1005`.

A **catalogue row** = a row inside a band carrying a Model Code in `D`.

| Brand | Boat Module catalogue rows | MPF stock rows | distinct catalogue rows in stock | catalogue rows never in stock |
|---|---|---|---|---|
| Highfield | **588** | 116 | 42 | 546 |
| Stacer | 91 | 31 | 11 | 80 |
| Formosa | 39 | 10 | 10 | 29 |
| Stabicraft | 37 | 24 | 12 | 25 |
| Jeanneau | 27 | 6 | 5 | 22 |
| Surtees | 19 | 6 | 5 | 14 |
| Haines Signature | 9 | 4 | 4 | 5 |
| **total** | **810** | **197** | **89** | **721** |

ASSERTED — `m15_final.py`.

**The grain differs twice over.** The Boat Module is one row per *variant*
(Highfield: model × tube material × three-part colour code — `RU230KAM (PVC) WH`
and `RU230KAM (HYP) WH` are separate rows). The MPF is one row per *unit*.
So the mapping is **many-to-one in both directions at once**: 546 of 588
Highfield variants have no boat on the floor, and the twelve Stabicraft models
that are in stock account for 24 hulls — `1450 - Frontier (Profish)` alone is
three physical boats at three different prices (§3.3).

### 3.2 · Do the names match? Mostly, by luck, with nothing enforcing it

OBSERVED — `m15_final.py`, exact match on a normalised string (lowercase,
non-alphanumerics stripped, a leading brand prefix removed from either side).

| Brand | matched | unmatched | rate |
|---|---|---|---|
| Highfield | 116 | 0 | **116/116** |
| Stabicraft | 24 | 0 | 24/24 |
| Formosa | 10 | 0 | 10/10 |
| Haines Signature | 4 | 0 | 4/4 |
| Jeanneau | 5 | 1 | 5/6 |
| Surtees | 5 | 1 | 5/6 |
| Stacer | 17 | 14 | **17/31** |
| **total** | **181** | **16** | **91.9 %** |

Highfield is perfect and Stacer is broken, and the reason is a **trim level that
exists on the floor but not in the catalogue**:

```
MPF Stacer r21  N014395  '481 - CrossFire SE (Side Console)'   sell 55995
Boat Module r89          'Stacer - 481 CrossFire (Side Console)'  Cash 22400   ← no "SE"
```

Same for `499 - CrossFire SE ×2`, `519 - CrossFire SE ×2`, `539 - SeaRunner
SE`, `499 - WildRider SE ×2`, `519 - WildRider SE`. Plus `429 - Rampage` (the
live band has `429 Rampage T/S` only in the OBSOLETE region below `r1005`) and
`429 - Outlaw TS` (catalogue says `429 Outlaw (Tiller Steer)`).

The two other misses are the same disease in other brands: MPF
`'770 - Game Fisher XL'` vs catalogue `770 Game Fisher` variants, and MPF
`'Merry Fisher - 1095 Coupe'` vs catalogue `Merry Fisher - 1095 Coupe S2`.

**And nothing is holding the 181 matches together.** ASSERTED — the entire
eleven-sheet workbook contains **one** classic data validation (`Dealer Fit
Options!K1`, `"Yes, No"`) and **three** extension validations
(`Home Page!L27:L37 → Dropdowns!R:R`, `Dealer Fit Options!C14:G16 →
Dropdowns!D:D`, `Dealer Fit Options!D12 → Dropdowns!C:C`). There is **no
validation of any kind on any brand sheet's `C` or `D` column**. The
`Dropdowns` sheet does hold a `BOAT LIBRARY` list at `B` — 1230 entries, of
which **39 are the literal string `'#REF!'`** and 115 are `0` — and that list is
bound to nothing in this workbook.

> The 116/116 Highfield match is a person retyping a string correctly 116 times.
> It is not a key.

### 3.3 · The prices are different numbers for different things

This is the finding that decides the seeding question.

ASSERTED — `m15_final.py`, matched rows only.

| Stock no. | Model | MPF `SELL PRICE` (G) | Boat Module `Cash` (QR) | ratio |
|---|---|---|---|---|
| N013821 | Stabicraft 1450 Frontier (Profish) | 57,995 | 29,000 | 2.00× |
| N014266 | *same model* | 58,495 | 29,000 | 2.02× |
| N014278 | *same model* | 59,995 | 29,000 | 2.07× |
| N014109 | Stabicraft 2350 Supercab (Profish) | 273,000 | 144,500 | 1.89× |
| N014039 | Highfield ADV7 (HYP) B-G-B | 179,000 | 105,930 | 1.69× |
| N014209 | Highfield SP660 (HYP) DG-G-WB | 142,995 | 72,170 | 1.98× |
| N014214 | Highfield SP660 (HYP) LG-W-WB | 139,995 | 72,170 | 1.94× |
| N013268 | Stacer 379 SeaSprite Dinghy | 2,990 | 3,285 | 0.91× |
| N014110 | Stacer 429 Outlaw (Side Console) | 33,966 | 12,850 | 2.64× |

The Boat Module band is labelled, in the sheet, **`QQ 'Hull Only Pricing'`**.
The MPF `SELL PRICE` is the whole rig for that specific unit. Three N-numbers of
the *identical* Stabicraft model carry three different prices because they are
three different boats with three different motors and trailers on them. And two
Highfield SP660s that differ only in tube colour are $3,000 apart.

The dinghy at `0.91×` is the exception that proves it: a 379 SeaSprite with no
motor and no trailer sells *below* hull-only Cash because it is being cleared.

**Therefore:** these two numbers must never be reconciled, averaged, or used as
a check on one another. They answer different questions.

---

## 4 · THE PRICE LADDER

### 4.1 · On the Boat Module — every rung, per brand, with the formula

The band is `QQ 'Hull Only Pricing'`, and it carries **six price levels each
paired with a GP %**, plus four dead spares. ASSERTED, header row 1 and every
band header:

| Col | Header | Col | Header |
|---|---|---|---|
| `QR` | **Cash** | `QS` | GP % |
| `QT` | **Trade** | `QU` | GP % |
| `QV` | **Sub Dealer** | `QW` | GP % |
| `QX` | **Sub (Exclusive)** | `QY` | GP % |
| `QZ` | **AUS Sailing** | `RA` | GP % |
| `RB` | **Warranty** | `RC` | GP % |
| `RD`,`RF`,`RH`,`RJ` | Spare 2–5 | `RE`,`RG`,`RI`,`RK` | GP % |

Those six are exactly the link stack in column A of a brand sheet (§2.1), plus
`Highfield!I1 'AUS Sailing Offer'`. **The price level is one concept, spelled
the same in both files.**

The formulas, ASSERTED per brand (`m17_bm_formulas.py`). `IY` = `Landed Hull
Cost`, `IW` = `Other Chg $A`, `JF` = `HO - MU` (a per-row hull-only markup).

| Brand | `QR` Cash | `QT` Trade | `QV` Sub Dealer | `QX` Sub (Excl.) | `QZ` AUS Sailing | `RB` Warranty |
|---|---|---|---|---|---|---|
| Stacer | `ROUNDUP(IY*1.1*1.09,-1)` ×61, **30 constants** | `=$QR` | `=$QR` | `=$QR` | `=$QR` | `ROUNDUP(IY*1.01*1.1,0)` |
| Stabicraft | `ROUNDUP(IY*1.25*1.1,-2)` ×27; `ROUNDUP(IY*1.2*1.1,-2)` ×10 | `=$QR` | `=$QR` | `=$QR` | `=$QR` | `ROUNDUP(IY*1.01*1.1,0)` |
| Surtees | `ROUNDUP(IY*1.21*1.1,-2)` ×19 | `=$QR` | `=$QR` | `=$QR` | `=$QR` | `ROUNDUP(IY*1.01*1.1,0)` |
| Formosa | `ROUNDUP((IY+(IY*JF))*1.1,-1)` ×36; `ROUNDUP(IY*1.2*1.1,-1)` ×3 | `=$QR` | `=$QR` | `=$QR` | `=$QR` | `ROUNDUP(IY*1.01*1.1,0)` |
| Jeanneau | `ROUNDUP((IY+(IY*VLOOKUP(E,'[1]Price Matrix'!C:ZZ,12,0)))*1.1,-1)` ×27 | `ROUNDDOWN(QR-(QR*VLOOKUP(E,…,11,0)),0)` | `…VLOOKUP(E,…,10,0)…` | `ROUNDDOWN(QV-(QV*0%),0)` | `=QT` | `ROUNDUP(IY*1.01*1.1,0)` |
| Haines Signature | (per-row, 9 rows) | `=$QR` | `=$QR` | `=$QR` | `=$QR` | `ROUNDUP(IY*1.01*1.1,0)` |
| **Highfield** | `ROUNDUP((IY+(IY*JF))*1.1,-1)` **×12, 576 constants** | `ROUNDDOWN(QR-(QR*5%),0)` | `ROUNDDOWN(QR-(QR*17.5%),0)` | `ROUNDDOWN(QV-(QV*2.5%),0)` | `ROUNDDOWN(QR-(QR*20%),0)` | `ROUNDUP((IY-IW)*1.01*1.1,0)` |

GP % is uniform: `((price/1.1) - IY) / (price/1.1)` — margin on the ex-GST
price against landed cost.

Four things fall out of that table:

1. **The markup is per brand, and it is in the formula, not in a column.**
   Stacer 9 %, Stabicraft 25 % (20 % on ten rows), Surtees 21 %. Highfield and
   Formosa read a per-row column (`JF`, `HO - MU`, e.g. `0.5`). Jeanneau reads
   an external **`Price Matrix`** workbook, column 12, keyed on `E`. Five
   different mechanisms for one concept.
2. **`Trade` is a real level for one brand only.** OBSERVED: `Cash == Trade` on
   91/91 Stacer, 37/37 Stabicraft, 19/19 Surtees, 39/39 Formosa, 9/9 Haines,
   19/27 Jeanneau — and **0/588 Highfield**. Everywhere but Highfield and
   Jeanneau, four of the six levels are literally `=$QR`.
3. **Highfield's discount ladder is asserted percentages**, verified on the 12
   rows that still hold formulas *and* reproduced by the typed values on the
   rest: Trade −5 %, Sub Dealer −17.5 %, Sub (Exclusive) −2.5 % *off Sub
   Dealer*, AUS Sailing −20 %. Row 935 (`ADV7 (HYP) B-G-B`): Cash 105,930 →
   Trade 100,633 (5.000 %) → Sub 87,392 (17.500 %) → Excl 85,207 (2.500 % of
   Sub) → AUS 84,744 (20.000 %).
4. **The four Spare levels are 814 saved `#VALUE!` errors each**, and their GP %
   columns dutifully compute a margin from them. `QT`/`QV`/`QX`/`QZ` carry 8
   more each (Jeanneau), `RB` 4 more.

### 4.2 · On a brand sheet — one rung, and it is a pointer

ASSERTED — `m08_extcells.py`. Every external target cell in the workbook:

| Count | Target | Which column |
|---|---|---|
| **130** | `'Quote Sheet'!$D$1` | `G` SELL PRICE |
| 77 | `'Quote Sheet'!$D$19` | `E` motor |
| 67 | `'Quote Sheet'!$D$28` | `F` trailer |
| 8 | `'Quote Sheet'!$W$3` | `I` into stock |
| 4 | `'Quote Sheet'!$AA$3` | `L` location |
| 4 | `'Quote Sheet'!$D$13` | `D` model |
| **3** | `'Quote Sheet'!$E$1` | `G` SELL PRICE |
| 3 | `'Quote Sheet'!$D$17` | `E` motor |
| 2+1 | `'Quote Sheet'!$D$24`,`$D$25` | `F` trailer |
| 1 | `'Quote Sheet'!$D$158` | `E` motor |
| 1 | `'[1]Boat Module'!$JA$235` | `Home Page!K9` |
| 1 | `'[2]Motor Library'!$Y$90` | `Home Page!K13` |

**A brand sheet's price ladder has exactly one rung and no arithmetic.** No
markup, no GST, no rounding, no discount, no level. `G = '[n]Quote Sheet'!$D$1`,
133 times.

### 4.3 · Where the ladder actually runs, and how it compares to `QUOTE_SPEC`

The rung the brand sheet points at is the *top* of a full ladder living inside
each deal workbook. Verified in `N012024 - Merry Fisher 695 S2.xlsx`, sheet
`Managers View`, four columns `D BOAT · E MOTOR · F RIGGING · G TRAILER` and
`H ESTIMATED`. ASSERTED, by row label:

```
Retail Labour (Hr)   D2  = '[4]Labour Rates'!$H$9    -> 159
Internal Labour Rate D3  = '[4]Labour Rates'!$G$14   -> 130.0909…
Base Cost            D6  = AB245/$AB$242    E6 = BB18   F6 = CB4   G6 = DB38
… Factory Discounts · Factory Pre Rig · Boat Prep · Base Freight · Documentation
  · Fumigation · Ocean Freight · Fuel Surcharge · Other Charges · Other Chg $A
  · Road Freight …
Landed Cost          D18 = SUM(D6:D17)                    ->  89,735.82
Pre Deliver Charges  D20 = 'Internal Work Order'!$T$23 + 'Internal Work Order'!T90
Installation Charges E21 = 'Internal Work Order'!T67
Propellor            E22 = 'Internal Work Order'!T76
Registration         D23 = VLOOKUP($AB$297,'[9]Registration Costs'!$C:$ZZ,8,0) -> 400.40
                     G23 = VLOOKUP($DB$75, '[9]Registration Costs'!$C:$ZZ,8,0)
Total Pre Delivery   D24 = SUM(D20:D23)
Waranty Allowance    D25 = (D$18+D$24)*0.5%
Admin Load           D26 = (D$18+D$24)*2%
TOTAL ACTUAL CTD     D28 = D18+D24+D25+D26                -> 97,407.33
BMT MU               D29 = $AB$265                        -> 0.29
GP                   D30 = D31-D28
Ex GST               D31 = D32/1.1
SELL PRICE           D32 = ROUNDUP((D28+(D28*D29))*1.1,-1) -> 138,230
                     E32 = BB53      (motor, from Motor Library)
Installation Recovery E33 = 'Internal Work Order'!W67 + 'Internal Work Order'!W76
GP Margin            D34 = D30/D31
```

`H32 = SUM(D32:G32) = 169,980`; the deal's `Quote Sheet!E1 = 199,399` — the
difference being dealer-fit options, parts and factory options that sit outside
the four Managers View columns. **So the brand sheet's `SELL PRICE` is the top of
the deal, above even the Managers View total.**

**Differences from the ladder `QUOTE_SPEC.md §2` documents.** The spec is
substantially right and three things need amending:

| `QUOTE_SPEC` says | This workbook says | Verdict |
|---|---|---|
| `MV!D28 = D18+D24+D25+D26`, `D29 = AB265 = 0.29`, `D37 = ROUNDUP((D28+(D28*D29))*1.1,-1)` | identical arithmetic, but the sell rung is at **`D32`**, not `D37`, in this vintage | **cite by label, not by row** — the template renumbers between versions |
| `MV!D23 = K34 = VLOOKUP('6.01m to 10.00m','[10]Registration Costs',8)` | `D23 = VLOOKUP($AB$297,'[9]…',8,0)` — same table, same column 8, **and `G23` does the same for the trailer** | **the trailer half was missed**; see §7.1 |
| `MV!D3 = '[6]Labour Rates'!$G$14` (130.09) | correct, **and `D2 = '…'!$H$9` = 159** sits directly above it | the retail rate was in front of us too |
| "Warranty Allowance" and "Admin Load" | `0.5 %` and `2 %` of (Landed + Total PD), asserted formulas | **absent from the spec entirely** |

`QUOTE_SPEC §2.4`'s central claim survives intact and is strengthened: the
markup is applied *once*, on the boat, and `E29` is `=E30/E28` — a margin
*reported*, not applied.

---

## 5 · THE HOME PAGE — what it is for

**A launcher. Nothing else.** ASSERTED — 60 hyperlinks, 2 formulas, 0 data rows.

- **9 internal links** carry you to a sheet in this file:
  `D9→Stabicraft!A1`, `D12→Surtees!A1`, `D15→Stacer!A1`, `D18→Formosa!A1`,
  `F9→Jeanneau!A1`, `F12→'Haines Signature'!A1`, `F15→Highfield!A1`,
  `H12→'Dealer Fit Options'!A1`, `A19` and `H24→'Boat Show'!A1`.
- **51 external links** go to SharePoint: the Boat / Motor / Rigging / Trailer /
  Freight / Hull Only / Factory Options / Parts / Service / Suppliers /
  Customer / Contacts / Registration / Administration modules, the Price Matrix,
  the quote-sheet template (`Customer Quotes/BMT - Quote Module 2026.xlsx`), the
  stock folders, and a "Revolution Roadmap".
- **2 live cells**, and they are the only data on the sheet:

```
K9  = '[1]Boat Module'!$JA$235   -> 0            (Jeanneau factory-specials banner, empty)
K13 = '[2]Motor Library'!$Y$90   -> 'Yamaha 115/130HP Hero Campaign - Valid till 15.08…'
```

Both cells are themselves hyperlinked to the supplier's terms PDF.

**How does the Home Page reach the brand sheets? By hyperlink only — never by
formula.** Data flows the *other* way: `K13` is read by
`Stabicraft!M16,M41,M45`, `Stacer!M24,M25,M27,M28,M32,M33`, `Formosa!M11`,
`Highfield!M96` and `Jeanneau!M10,M22,M24,M28,M30` (which reads `K9`) — the
brand sheets echo the promo banner into their Comments column.

That is a **common theme in its purest form**: one campaign, declared once,
appearing on rows of four different brands. And it is already broken —
`Formosa!M33,M35,M36` and `Boat Show!D8` point at `'Home Page'!K12`, which is
**empty**, so four rows show a promo that renders as `0`.

---

## 6 · BOAT SHOW AND DEALER FIT OPTIONS

### 6.1 · `Boat Show` — an emptied clone. Does not change pricing.

ASSERTED. The sheet has the brand-sheet skeleton — `C10 'DISPLAY STOCK'`,
`D10 'Display Tags'`, `G10 'SELL PRICE'` — and section labels for
`STABICRAFT r12`, `SURTEES r20`, `JEANNEAU r27`, `HIGHFIELD r40`,
`HAINES SIGNATURE r50`. **Under every one of those labels: nothing.** Zero data
rows, zero formulas in `G`.

`D7 'Sanctuary Cove Boat Show'` / `'21st to 24th May 2026'` — three months past
as of this study. `D8 = 'Home Page'!K12 -> 0`. `K4:K10` carry an "Aussie Boat
Club" panel (`'Redefining the Way People go Boating'`, `'THE FLEET'`) with no
rows under it either.

**Verdict: no pricing effect. It is a per-event snapshot list that gets filled
before a show and cleared after.** Ours would be a saved view, not a table.

### 6.2 · `Dealer Fit Options` — a form, and it *does* price

ASSERTED — `m03_brand.py "Dealer Fit Options"`.

Not a table. One job-costing worksheet with one input (`C14`, a DFO Option name,
validated against `Dropdowns!D:D`) driving 30 line slots by repeated `VLOOKUP`
into an external workbook, columns stepping by 9:

```
C14  'Helm Master L4 (Black) - 6X9 Binnacle | Built in DES | …'   ← the only real input

J20  = '[139]Labour Rates'!$C$9                       -> 'Retail Labour'
K20  = '[139]Labour Rates'!$G$14                      -> 130.0909…     the CTD rate
L20  = VLOOKUP($J$20,'[139]Labour Rates'!$C:$ZZ,6,0)  -> 159           the SELL rate

r22..r51, 30 slots, each:
  C = VLOOKUP($C$14,'[138]Dealer Fit Module'!$C:$ZZ, n+0)   part #
  D = …n-1                                                  description
  F = …n+1     -> 1264.802     part CTD
  G = …n+2     -> 1848         part PRICE
  I = …n+4     -> 2            hours
  J = …n+3     -> 'Labour Estimated - (2.0)'
  K = I22*K$20 -> 260.18       labour CTD    = hours × 130.0909
  L = I22*L$20 -> 318          labour PRICE  = hours × 159

K53 = VLOOKUP($C$14,'[138]…',11,0) -> 86        Workshop Sundry Expences (CTD)
M53 = ROUNDUP(K53*1.25*1.1,0)      -> 119       ← 25 % markup, then GST
K54 = VLOOKUP($C$14,'[138]…',12,0) -> 0         Workshop Sublets (CTD)
L54 = ROUNDUP(K54*1.25*1.1,0)                   ← same rule
F55 = SUM(F22:F54) -> 14542.548   G55 = SUM(G22:G54) -> 19334   I55 = SUM(I22:I54) -> 13.35
L55 = IFERROR(ROUNDUP(SUM(L22:L51)+M53+L54,0),) -> 2242
L56 = L55+G55                                   -> 21576   Sub Total (inc GST)
K60 = L56+L58                                   -> 21576   ESTIMATED JOB COST  (L58 = typed discount)
K64 = F55+K55                                   -> 16365.26  CTD
K65 = K60/1.1-K64                               -> 3249.28   GP $
L65 = K65/(K60/1.1)                             -> 0.16566   Margin
```

`[138]` = `Parts Module.xlsx`, sheet `Dealer Fit Module`. `[139]` =
`Service Module.xlsx`, sheet `Labour Rates`. `[137]` = `Contacts Module.xlsx`
(`D13` builds the salesperson's phone-and-email block).

**Yes, it changes pricing, and it is the only sheet in the MPF that computes a
price from scratch.** Two asserted constants live only here: the labour rate
pair, and the **1.25 markup on workshop sundries and sublets**.

It also carries a live error: `I6 = IFERROR(_xlfn.IMAGE(I18),)` renders
`#VALUE!` — the product photo the form is supposed to show.

---

## 7 · THE RATES — CORRECTING A CONCLUSION WE HAVE SHIPPED

### 7.1 · The Service Module's rate tables, read directly

ASSERTED — `Service Module (1).xlsx`, sheet `Labour Rates`, headers at
`C8:H8` = `Description · Code · Actual · (blank) · Rate (Exc GST) · Rate (inc GST)`:

| Row | Description | Code | Exc GST (`G`) | Inc GST (`H`) |
|---|---|---|---|---|
| 9 | Retail Labour | GEN | 144.545454… | **159** |
| 10 | Pre Delivery Labour | PD | 144.545454… | 159 |
| 11 | Detail Labour | DET | 144.545454… | 159 |
| 13 | Trade | TRA | 130.090909… | 143.1 |
| **14** | **Internal** | **PDI** | **130.090909…** | 143.1 |
| 15 | Internal - Pre Delivery | PD | 130.090909… | 143.1 |
| 17 | Warranty | WAR | 138.181818… | 152 |
| 18 | Warranty - Yamaha | YAM | 114.55 | 126.005 |
| 19 | Warranty - Stacer | STA | 75 | 82.5 |
| 20 | Warranty - Stabicraft | STB | 100 | 110 |
| 21–24 | Warranty - Surtees / Jeanneau / Haines / Highfield | SUR/JEA/HAI/HIG | 138.181818… | 152 |
| 26–29 | Warranty - Malibu / Whittley / Mercury / Volvo | MAL/WHI/MER/VOL | 110 / 85 / 144.545 / 127.5 | 121 / 93.5 / 159 / 140.25 |

ASSERTED — sheet `Oils and Lubes`, headers `C8:K8` = `Type · Notes · Part No. ·
Serv Cost · Unit · CTD · MU · GP · Sell`:

| Row | Type | Unit | `H` CTD | `I` MU | `J` GP | `K` Sell |
|---|---|---|---|---|---|---|
| **14** | **Fuel - Premium Unleaded** | Litre | **2.20** | 0.2397 | 0.5273 | **3.00** |
| 15 | Fuel - Diesel | Litre | 2.41 | 0.1316 | 0.3173 | 3.00 |
| 16 | Fuel Disposal | Litre | 1.50 | 0.2121 | 0.3182 | 2.00 |
| 10 | Engine Oil - 4 Stroke | Litre | 7.41 | 0.8403 | 6.2264 | 15.00 |

### 7.2 · What this falsifies, precisely

`QUOTE_SPEC.md §2.3` states: *"We hold none of the rates. There is no labour
rate, no fuel price, no registration table and no PD-hours column anywhere in
the seed. Therefore boat pre-delivery and boat registration are a person's
line."*

Three separate claims. Here is the state of each after this study:

| Claim | Status |
|---|---|
| "there is no labour rate … anywhere in the seed" | **still true of the seed** — but it is now false that the workbooks are silent. Two labour rates are asserted with cells and *both are already used inside the MPF itself* (`Dealer Fit Options!K20`, `L20`), not only in the deal workbook. |
| "no fuel price" | **the rate exists and has two rungs** — `Oils and Lubes!H14 = 2.20` is **CTD**, `K14 = 3.00` is **Sell**. `QUOTE_SPEC` cites `H14` as *the* fuel price; that is the cost rung. Quoting a customer 100 L at 2.20 would undercharge by $80 against the business's own sell price. |
| "no registration table" | **the table exists** (`Registration Module.xlsx`, sheet `Registration Costs`, keyed on a length band, **column 8**) and it is already read twice per deal. |

**The correction to write is narrow and it is not "start computing".** The
conclusion *boat pre-delivery and boat registration are a person's line* remains
the right call for today's seed, because none of these tables is in
`src/demos/northside.ts` and §2.1's rule — *if the number is not a column in the
project's own data, the quote does not produce it* — is unchanged. What must be
corrected is the **reason**:

> ~~We hold none of the rates because the business does not keep them.~~
> **We hold none of the rates because we have not imported the two tables that
> hold them.** They are `Service Module.xlsx → Labour Rates` (a 21-row rate
> table with a Description, a Code, an exc-GST rate and an inc-GST rate) and
> `Service Module.xlsx → Oils and Lubes` (a CTD/MU/GP/Sell ladder per fluid).
> A third, `Registration Module.xlsx → Registration Costs`, is keyed on a length
> band and serves boats and trailers from the same column.

That is a different sentence with a different consequence: it names three
importable tables and a shape (`rate` — description, code, cost rate, sell
rate), where the old sentence closed the question.

---

## 8 · HAND-OVERTYPED OVER A FORMULA

### 8.1 · On the brand sheets — no price is overtyped

OBSERVED — `m16_overtype.py`, all seven sheets. Column `G` (SELL PRICE) contains
**zero** typed numbers below the header on any brand sheet. Every cached value
of every `G` formula resolves to a number (`m19_d1e1.py`). The price column is
clean.

What *is* overtyped is provenance in other columns:

| Sheet | Column | Formulas | Typed | What the typing is |
|---|---|---|---|---|
| Stacer | `I` Into Stk | 5 | 14 | dates typed where 5 rows pull `'Quote Sheet'!$W$3` |
| Surtees | `I` Into Stk | 3 | 3 | same |
| Stacer | `E` Motor | 18 | 13 | `'No Quote Sheet - Waiting on Boat Sales'` ×13 |
| Stabicraft | `L` Location | 9 | 16 | `'On Order with Factory'` ×11 |
| Formosa | `M` Comments | 4 | 3 | `'Factory Consignment Boat'`, `'ON HOLD - Customer Holding Deposit Paid'` |

**One column, two provenances, no marking.** A reader cannot tell a pulled date
from a typed one.

### 8.2 · On the Boat Module — the price column has been pasted over at scale

This is the serious one. OBSERVED — `m17_bm_formulas.py`, `m18_verify.py`,
`m22.py`.

| Brand | `QR` Cash cells | still a formula | **typed constants** |
|---|---|---|---|
| **Highfield** | 588 | **12** | **576 (98.0 %)** |
| **Stacer** | 91 | 61 | **30 (33.0 %)** |
| Stabicraft / Surtees / Formosa / Jeanneau / Haines | 131 | 131 | 0 |

Highfield's `QT`/`QV`/`QX`/`QZ` are constants on the same 576 rows.

**Do the typed numbers still agree with the row's own inputs?** Recomputing each
brand's surviving formula from that row's `IY` and `JF`:

- **Highfield: 40 of 588 agree; 548 do not.** Every disagreement is *positive* —
  the typed price is above what the formula gives — and small: `+10` on 159
  rows, `+30` on 76, `+40` on 67, `+20` on 45, and 85 rows over `+100` (largest
  `+140` on the PA860EW group, on a base of 85,120 = 0.16 %). This is the
  signature of a **paste-values snapshot whose landed cost has since drifted
  down**. The prices are not wrong; they are frozen, and nothing on the sheet
  says so.
- **Stacer: 61 of 91 agree; 30 do not**, and these run the *other* way. Two are
  material:

```
r9  Stacer - 319 Skimma (HS)   IY = 2027.49   typed Cash = 2055   formula = 2440   −15.8 %
r10 Stacer - 359 Skimma (HS)   IY = 2248.00   typed Cash = 2425   formula = 2700   −10.2 %
```

  Both `(HS)` rows carry the *same typed Cash as their non-HS sibling*
  (`319 Skimma` 2055, `359 Skimma` 2425) while their landed cost is $300–$600
  higher. A row was copied and the price was not.

The `GP %` columns are still live formulas, so `QS` computes a margin from a
frozen price and a current cost — **the reported margin on 548 Highfield rows
and 30 Stacer rows is arithmetically correct and economically meaningless.**

---

## 9 · DEFECT REGISTER

Everything below is ASSERTED unless marked. Sorted by what it would cost us.

| # | Defect | Evidence | Cost |
|---|---|---|---|
| 1 | `Cash` pasted over its formula on 576/588 Highfield and 30/91 Stacer rows; 548 + 30 no longer reconcile to landed cost | §8.2 | a stale hull price feeding a live margin |
| 2 | 3 of 133 `SELL PRICE` formulas read `'Quote Sheet'!$E$1`; the other 130 read `$D$1` | `Stacer!G13,G24,G28` | **the price cell moved between template vintages.** In the older `N012024` template `D1` is the *stock number* and `E1` is the price. Any importer that assumes one address silently reads a string or the wrong number |
| 3 | No data validation on any brand sheet's `C` or `D`; the 181/197 name match is 181 correct retypings | §3.2 | joins that cannot be relied on |
| 4 | 14 of 31 Stacer stock rows name a trim (`… SE`, `Outlaw TS`) that has no catalogue row | §3.2 | the boat on the floor is not in the catalogue |
| 5 | `Stacer!D65 = '=Stacer!#REF!'` — a live broken reference saved in the file | §2.2 | |
| 6 | `Dropdowns!B` (`BOAT LIBRARY`, 1230 entries) contains the literal `'#REF!'` **39 times** and `0` 115 times | `m01`+inline Dropdowns probe | a picker list with 39 broken entries, bound to nothing |
| 7 | 814 saved `#VALUE!` per spare-level column (`RD`,`RF`,`RH`,`RJ`), plus 8 each in `QT`/`QV`/`QX`/`QZ` and 4 in `RB` | §4.1 | an error is a *value* in this file |
| 8 | Highfield block-2 header puts `Comments` at `L71`, but the data sits in `M`; block 1 puts `Location` at `L` and `Comments` at `M` | `Highfield!r7` vs `r71` | the two blocks disagree about what column `L` means |
| 9 | `Stabicraft!AL7:AW11` = `{=Stacer!$D$13:$O$17}`; `Surtees!M7:X11` identical | §2.3 | one brand's sheet silently mirrors another's, 40 columns off-screen |
| 10 | `Formosa!M33,M35,M36` and `Boat Show!D8` read `'Home Page'!K12`, which is empty | §5 | four rows display a promo as `0` |
| 11 | `N014 TBC` is the stock number on 5 of 31 Stacer rows | §2.2 | a placeholder in the key column |
| 12 | 51 of 116 Highfield and 13 of 31 Stacer stock rows have no price, rendering as blank | §2.1, §2.2 | blank is indistinguishable from free — the `showZeros="0"` failure `QUOTE_SPEC §2.5` already names, in a second place |
| 13 | `Dealer Fit Options!I6 = IFERROR(_xlfn.IMAGE(I18),)` → `#VALUE!` | §6.2 | the form's product photo is broken |
| 14 | `Days in Stk = TODAY()-I` on 42 Highfield + 18 Stacer + 24 Stabicraft rows | §2.1 | **a volatile column.** Every open recalculates it; no snapshot is reproducible |
| 15 | External refs `[140]` (a CSV in one user's `Downloads`) and `[141]` (a `G:` drive path) | §1.1 | dead, unreferenced |
| 16 | 29 promo strings in `Dropdowns!R`, every `Valid till` date in the past | `m01`+inline Dropdowns probe | a campaign list with no expiry mechanism |

---

## 10 · COMMON THEMES

Concerns that appear in more than one module and are the same concern each time.

The owner's instruction: *"also note commom themes - for example registration
for boat and trailer"*. Five found, each with cells.

### 10.1 · Registration — the named example, confirmed

**One table, one column, two products, and a length band as the key.**

```
Managers View!D23 = VLOOKUP($AB$297,'[9]Registration Costs'!$C:$ZZ,8,0)  -> 400.40   BOAT
Managers View!G23 = VLOOKUP($DB$75, '[9]Registration Costs'!$C:$ZZ,8,0)             TRAILER
```

ASSERTED. Same workbook (`Registration Module.xlsx`), same sheet, same column 8;
the only difference is which cell supplies the band. `QUOTE_SPEC §2.3` names the
boat half and treats the trailer half as a different problem
(*"Trailer registration is already inside the number we read — `Sell inc Rego`"*).
Both are true at once, and that is the point: **the trailer module has already
folded registration into its sell price, and the boat has not.** The same
concern is resolved at two different rungs, which is exactly why adding
`Sell` + `Rego ($)` double-charges. The theme is real and the asymmetry is the
finding.

`Home Page!H1` links the Registration Module directly, and `Registration
Module.xlsx` sits in Downloads at 20 KB — the smallest module in the business
and the one two products depend on.

### 10.2 · The price level — six rungs, one vocabulary, five mechanisms

`Cash · Trade · Sub Dealer · Sub (Exclusive) · AUS Sailing · Warranty` is the
Boat Module's header row (§4.1), the brand sheets' column-A link stack (§2.1),
and `Highfield!I1`. It is the same list in three places. But the *arithmetic*
behind it is five different mechanisms — a literal in the formula (Stacer,
Stabicraft, Surtees), a per-row column `JF` (Highfield, Formosa), an external
`Price Matrix` lookup (Jeanneau), a hard percentage (Highfield's discounts), and
a pasted constant (576 rows). **One concept, five implementations** — this is
`MPF_GROUND_TRUTH §8.4` (*"the same columns mean different things per brand"*)
appearing in the price ladder itself.

The warranty rate table repeats the theme one level down: `Labour Rates` rows
17–29 carry a **per-brand warranty labour rate** (Stacer 75, Stabicraft 100,
Yamaha 114.55, everything else 138.18). Warranty is a level on the boat *and* a
rate in the workshop.

### 10.3 · The stock number — the join key the business already has

`N0xxxxx` identifies a hull on the brand sheet (`C`), names its deal workbook
(`N014039 - ADV7.xlsx`), keys the location lookup
(`VLOOKUP(C9,[4]Sheet1!$B:$ZZ,4,0)` into `NSM_Stock_Location_Tracking.xlsx`),
and appears in the deal workbook's own `Quote Sheet!D1`. It reaches five files.

It is also the **only** identifier in this workbook that is not a display
string — and it is unvalidated, placeholdered five times (`N014 TBC`), and
free-typed. OBSERVED: 116/116 unique on Highfield, 26/31 unique on Stacer.

### 10.4 · The campaign / promo — declared once, echoed everywhere

`Home Page!K13 ← '[2]Motor Library'!$Y$90` and `K9 ← '[1]Boat Module'!$JA$235`,
echoed into the Comments column of Stabicraft (3 rows), Stacer (6), Formosa (1),
Jeanneau (5), Highfield (1) — and duplicated as 29 free-text strings in
`Dropdowns!R`, all expired. A promotion is a thing with a validity window that
applies across brands, and the workbook has no place to put it, so it lives in
a comment.

### 10.5 · Labour as hours × a rate — the same shape in three places

`Dealer Fit Options!K22 = I22*K$20` and `L22 = I22*L$20` (MPF).
`Managers View` pre-delivery, installation and propeller lines, each
`'Internal Work Order'!T<n>` (deal workbook).
`Parts Maintenance!P Labour ($)` derived from `O TTF (Hours)` (Parts Module,
per `QUOTE_SPEC §2.3`).

Three modules, one shape: **hours × rate, at a CTD rate and a sell rate, with
the sell rate 22 % above the CTD rate** (159 / 130.0909 = 1.2223). The rate pair
is the thing we do not carry.

---

## 11 · WHAT THIS MEANS FOR OUR APP

### 11.1 · Are our per-brand tables seeded from the right place?

**Yes — and they are seeded from only one of two right places.**

The Boat Module is the correct source for a **catalogue** table: it has the
model, the code, the specs, the cost build, six price levels and 810 rows across
seven brands. Our `boat` kind and its `Cash`/`Trade`/`Warranty` columns
(`QR`/`QT`/`RB`) are the right columns from the right sheet.

Two amendments follow from this study:

1. **We take three of six levels.** `Sub Dealer` (`QV`), `Sub (Exclusive)`
   (`QX`) and `AUS Sailing` (`QZ`) are populated on all 810 rows and are named
   in the brand sheets' own navigation. Taking three of six and calling the
   concept "price level" understates it. Note also that for five of seven brands
   `QT Trade` is literally the formula `=$QR`: **`Trade` equals `Cash` on 214 of
   810 catalogue rows** (Stacer 91 + Stabicraft 37 + Surtees 19 + Formosa 39 +
   Haines 9 = 195 by formula, plus 19 of 27 Jeanneau). Only **596 of 810 rows**
   carry a Trade price distinct from Cash, and 588 of those are Highfield. Worth
   knowing before a salesperson reads a trade price off a Stacer.
2. **There is no table for a stock unit at all**, and that is what a
   salesperson actually sells. 197 rows across seven brands, each with a stock
   number, a model, an actual motor, an actual trailer, a real asking price, an
   age and a yard.

### 11.2 · The stock unit as a table kind

Our model already has the vocabulary. A `stock unit` would be a table with a
KIND, a ROLE, and joins to `boat` (its model), `motor` and `trailer`:

| Column | Source | Note |
|---|---|---|
| `Stock No.` | brand sheet `C` | the identity — 116/116 unique on Highfield |
| `Model` | brand sheet `D` | **a join to the boat catalogue**, matching 181/197 by name today |
| `Motor` | `'Quote Sheet'!$D$19` | 77 of 197 rows carry one |
| `Trailer` | `'Quote Sheet'!$D$28` | 67 of 197 |
| `Sell Price` | `'Quote Sheet'!$D$1` | inc GST, whole rig; **133 of 197 priced** |
| `Into Stock` / `ETA` | brand sheet `I` | typed on 45 of 116 Highfield rows; pulled from `'Quote Sheet'!$W$3` on 8 rows workbook-wide |
| `Location` | brand sheet `L` | `Boondall` / `Coomera` / `On Order with Factory` |
| `Status` | which block the row is in | `on hand` / `on order` — currently encoded as *position on the sheet* |
| `Comments` | brand sheet `M` | `Floor Stock Clearance!!!`, `ON HOLD - Customer Holding Deposit Paid` |

`Days in Stock` must **not** be a column. It is `TODAY()-I` — derived, volatile,
and the single reason no two opens of this workbook agree. It is a display
computation over `Into Stock`.

`Status` deserves the same treatment `MPF_GROUND_TRUTH §8.3` gives repeating
column groups: **a fact encoded as a position is not a fact.** The business
distinguishes on-hand from on-order by which of two header rows a boat sits
under, which is why Highfield's two blocks disagree about what column `L` means
(defect 8) and why the 51 unpriced rows are invisible.

### 11.3 · The three rate tables to import, and their shape

Named, not built. Each is small, each is a real table with real headers.

| Table | Source | Shape | Serves |
|---|---|---|---|
| **Labour Rates** | `Service Module.xlsx!Labour Rates` `C8:H29` | Description · Code · Actual · Rate (Exc GST) · Rate (inc GST); 21 rows | boat PD, dealer-fit, parts fitment, warranty per brand |
| **Oils and Lubes** | `Service Module.xlsx!Oils and Lubes` `C8:K22` | Type · Notes · Part No. · Serv Cost · Unit · CTD · MU · GP · Sell | fuel in the PD build, oil in a service |
| **Registration Costs** | `Registration Module.xlsx!Registration Costs` | length band → column 8 | **boat and trailer both** (§10.1) |

Importing these does **not** overturn `QUOTE_SPEC §2.1`. The rule stands: the
quote produces no number that is not a column in our data. What changes is that
the columns become available, and the sentence *"the workbook states no rate, so
this is a person's line"* stops being true and must be replaced with
*"we have not imported the rate table"* — which is a task, not a verdict.

### 11.4 · What NOT to do

- **Do not reconcile MPF `SELL PRICE` against Boat Module `Cash`.** §3.3 — one
  is a rig, one is a hull. They differ by 0.91× to 2.64×.
- **Do not import `Boat Show`.** §6.1 — a saved view of the stock table for one
  event, currently empty.
- **Do not model `Dealer Fit Options` as a table.** §6.2 — it is a form over
  `Parts Module!Dealer Fit Module`. What it teaches us is the labour arithmetic
  and the 1.25 sundry markup, both of which belong in a rate table, not a form.
- **Do not treat `[n]` indices as stable.** §1.1 — three workbooks, three
  different indices for `Service Module.xlsx`.
- **Do not carry `Days in Stk`.** §11.2.

---

## APPENDIX — what one row of each of the three sheets looks like, verbatim

```
Highfield!r9    N014039 │ Highfield - ADV7 (HYP) B-G-B │ Yamaha - F250XCB │
                REDCO Custom / Highfield ADV7 Aluminium - TA700T… │ 179000 │
                12 Nov 2025 │ 268 │ Boondall │ —
                                       ← Boat Module r935, Hull Only Cash 105,930

Stacer!r24      N013849 │ 519 - CrossFire SE (Side Console) │ Yamaha …    │
                … │ 62956 │ 3 Nov 2025 │ … │ Boondall │ ='Home Page'!$K$13
                                       ← NO catalogue row: the "SE" trim is not in the Boat Module

Stabicraft!r10  N013821 │ 1450 - Frontier (Profish) │ Yamaha …            │
                … │ 57995 │ 22 Apr 2026 │ … │ Boondall │ —
                                       ← Boat Module r148, Hull Only Cash 29,000
                                         (two more N-numbers on the same model: 58,495 and 59,995)
```
