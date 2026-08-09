# MPF GROUND TRUTH

**Northside Marine's Master Price File — what the real data actually is.**

Source: four read-only studies of the workbooks the business runs on today, plus a
direct read-only re-extraction of the specific cells seeded into
`src/demos/northside.ts`.

| Workbook | Size | Sheets |
|---|---|---|
| `Boat Module (5).xlsx` | 21.9 MB | 2 |
| `Motor Module (1).xlsx` | 7.0 MB (truncated download; salvaged copy used) | 5 |
| `Trailer Module.xlsx` | 7.4 MB | 3 |
| `Parts Module (3).xlsx` | 39.1 MB | 23 |

Nothing in `C:/Users/AsafA/Downloads` was written, moved or opened for write.
Every `load_workbook` call used `read_only=True`.

> **This file supersedes `HELMLOGIC_GROUND_TRUTH.md` wherever the two disagree.**
> That document was a survey of the *production app*, which is a lossy derivation
> of these workbooks. This one is the workbooks. Disagreements are listed in §10.

---

## 1. THE FOUR MODULES

The Master Price File is not one workbook. It is a set of ~17 workbooks on
SharePoint at
`https://northsidemarine1.sharepoint.com/sites/NSMMasterPriceFile/Shared Documents/General/`,
wired together by whole-column `VLOOKUP`/`XLOOKUP` across file boundaries, addressed
by **hard-coded column ordinal**. Four of them are the catalogue.

### 1.1 Boat Module — the spine

| | |
|---|---|
| Sheets | `Boat Module` (visible, 4,731 × 4,144; real extent A1:ZB2301), `Dropdowns` (**hidden**) |
| Real records | 2,006 rows carrying a Model Code; 2,609 blank spacer rows |
| Formulas | 90,923 cells across 117 columns |
| Merged cells | **zero** |
| Data validations | zero surviving (they live in an unsupported x14 extension) |
| Named ranges | one, accidental (`IG503JD704` = `'Boat Module'!$IG$1322`) |

One row is one boat SKU. The row also carries, flattened sideways: 51 standard
inclusion slots, 166 factory-option slots, 13 motor slots × 5 columns, 10 trailer
slots, 42 dealer-fit slots, 30 paint/graphics slots, 50 mechanical PD checklist
lines and 30 detail PD checklist lines. **674 real columns.**

It links out to ten workbooks, referenced positionally as `[1]`..`[10]`:
Price Matrix, Service Module, Parts Module, Motor Module, Rigging Module,
Factory Options Module, Trailer Module, the Highfield supplier price list, the
Freight Module, and the Stabicraft price list.

### 1.2 Motor Module — engines, and the boat+motor packages

| | |
|---|---|
| Sheets | `Motor Library` (visible, header **row 4**, frozen at C4), `Rebate Programs`, `Dropdowns` (hidden), `Yamaha_Dealer_Current` (hidden, pasted supplier PDF), `Data Drop` (hidden, 3 global rates) |
| Real records | 491 rows / 651 real columns |
| Formulas | 94,202 cells across 432 columns |
| Merged cells | **two** — `LC3:LG3` "GEAR OIL", `LI3:LM3` "ENGINE OIL" |

Rows 5–341 are motors. Rows 343–628 are **not motors** — they are boat+motor
*powerplant packages* (`SIG 525F w Yamaha - F115XB`), which inherit their spec from
the base motor row by hard-coded absolute row anchor (`=E$90`). 29,322 formulas in
this sheet are bare `=X$<row>` anchors.

`Motor Library!C` — the human-written display name, e.g. `Yamaha - F115XB` — is
**the primary key of the whole ecosystem**. Every other module joins on it.

### 1.3 Trailer Module — trailers and their registration band

| | |
|---|---|
| Sheets | `Trailer Spec Enquiry` (a single-trailer quote card), `Trailer Module` (918 × 385), `Dropdowns` (hidden) |
| Real records | 477 trailers = 435 active + 42 obsolete; 47 series rows; 6 brand banners |
| Merged cells on the data sheet | **zero** (52 on the quote card, layout only) |

Hierarchy level is encoded in the **font size of column C**: 14 pt bold = brand,
12–13 pt bold = series, 11 pt = trailer.

### 1.4 Parts Module — parts, kits and everything the workshop fits

| | |
|---|---|
| Sheets | 23. Core: `Parts Maintenance` (3,722 × 62 — the part master, 2,948 parts), `Dealer Fit Module` (2,680 × 293 — 1,871 bundles), `Parts Enquiry` (hidden lookup UI), `Dropdowns` (hidden picklists). Plus **19 raw supplier price lists** pasted in verbatim (Revolution DMS, BLA ×3, Garmin, Lowrance, Simrad, GME ×2, SAW, RWB, Oceansouth, Frank Marine, Minn Kota, Viking, Hella, Camec, Dometic, Highfield). |
| Merged cells | Only `Dealer Fit Module` uses them: **30 spanning section bands on row 9**, each exactly 8 columns wide with a 1-column gutter — `T9:AA9` "Accessory - 1" … `JU9:KB9` "Accessory - 30" |

### 1.5 How the four relate

```
                    ┌──────────────────────┐
   Price Matrix ───▶│                      │◀─── Freight Module
   (brand markups,  │     BOAT MODULE      │     (per-metre container rate)
    FX rates)       │  one row = one SKU   │
                    └───┬───┬───┬───┬──────┘
      Model Code (D) ───┘   │   │   └─── Additional Dealer Fit Options (OL..QA)
      → supplier price      │   │              → Parts: Dealer Fit Module (by DESCRIPTION)
        lists               │   │
                            │   └─── Std Trailer + Options 2..10 (NZ..OI)
                            │              → Trailer Module (by trailer NAME)
                            │
                            └─── Motor Option 1..13 (KZ, LF, LL … NT)
                                       → Motor Library (by DISPLAY NAME)
                                       → each slot also pulls Rigging Kit,
                                         Prop Part No, Prop Description
                                         from Rigging / Parts modules
```

**Every join is a free-text string.** Not one of them is a code-to-code join.
A rename anywhere silently orphans everything downstream. This is the single
biggest thing our `reference` field type replaces.

Shared scalars that every module reads:
`'[Service]Labour Rates'!$G$14` = **$130.0909/hr cost rate**;
`!$H$9` = the retail labour rate (≈ $159/hr, derivable: 0.05 hr → cost 6.5045 / retail 7.95);
`'[Service]Oils and Lubes'!$H$10` = $7.41/L 4-stroke oil; `!$H$14` = $2.20/L 95 premium;
`'[Price Matrix]'!$M$23` = the single global motor **trade** markup.

---

## 2. TAXONOMY PER PRODUCT TYPE

**The depth and the level names are different for every product type, and for
boats they are different per brand.** There is no universal middle level.

### 2.1 Boats — Brand ▸ Series ▸ Model ▸ Variant, with the Variant level OPTIONAL

The business's own words, taken from the sheet:

| Level | How it appears | Evidence |
|---|---|---|
| **Brand** | A yellow-filled (`FFFFFF00`) bold header row re-labelling the whole grid. Col A holds a short token, col C the brand name, col E the pricing-matrix key. | R3 STACER · R143 Stabicraft · R200 Surtees · R226 Jeanneau · R233 Merry Fisher · R248 Cap Camarat · R262 Haines Signature · R278 Highfield Inflatables |
| **Series** (they also write "Range" for Stacer) | A row with col C populated and col D (Model Code) **empty**. 105 such rows. | `HIGHFIELD - Sport Series` (R1436) · `STABICRAFT - Frontier Series` · `Surtees - Pro Fisher` · `HAINES SIGNATURE - Fisher Series (as at 18.03.2026)` · Stacer writes plural caps instead: `Stacer - PROLINE ANGLERS`, `Stacer - OCEAN RANGER SDFS` |
| **Model** | Another col-C-only row one level down. **Not decorative** — it carries the shared spec labels *and* the motor envelope for the whole model. | R1533 `HIGHFIELD - Sport 560` holds `KV = 90 HP`, `KW = 115 HP`, `KX = XL` |
| **Variant / SKU** | A row with col D populated. For Highfield the variant is **material × colourway**. | `Sport - SP560 PVC - W-W-WB` / `Sport - SP560 HYP - W-W-WB` |

**Correction 1 — depth is brand-dependent.** Stacer, Stabicraft, Surtees, Haines
and Formosa stop at Model: the model row *is* the SKU (one Model Code, e.g.
`Stacer - 359 Proline L/S` = `SP359PL2LP`), and colour is a downstream Paint &
Graphics option (cols RN..SQ), not a separate row. **Only Highfield explodes to a
material × colour SKU per row.** So the real shape is
`Brand ▸ Series ▸ Model ▸ [Variant]` with the Variant level optional.

**Correction 2 — the live Highfield block has LOST its Series and Model rows.**
Rows 281–948 (588 SKUs) sit under one section row R280 `HIGHFIELD - 2026 Range`
as a **flat list**. There are no per-Series or per-Model header rows. Model
identity is recoverable only by parsing the name string or the model-code prefix.
The Series ▸ Model structure survives *only* in the amber-filled obsolete block
(rows 1125–1949). 67 distinct Highfield model tokens are inferable from the live
block; the series prefixes are:

| Prefix | Series | Live SKU rows |
|---|---|---|
| `SP` | Sport | 199 |
| `CL` | Classic | 144 |
| `PA` | Patrol | 130 |
| `UL` | Ultralite | 64 |
| `RU` | Roll-Up | 32 |
| `ADV` | Adventure | 12 |
| `Coaster` | Coaster | 7 |

**Correction 3 — there is a fifth, implied level below the variant: configuration.**
Model tokens themselves carry configuration suffixes (`ST`, `EW`, `LS`, `FT`, `LT`,
`WL(Windlass)`, `Open`), and the boat is then configured by 166 factory options,
42 dealer-fit options, 13 motor slots, 10 trailer slots and 30 paint/graphics slots.
That configuration layer is what the taxonomy exists to serve.

Live-block row counts by brand (col E "Matrix", rows 1–1004):
Highfield Inflatables 588 · Stacer 91 · Formosa 39 · Stabicraft 37 ·
Merry Fisher 27 · Surtees 19 · Haines Signature 9 · Yamaha 1 · Administration 1.

### 2.2 Motors — Supplier ▸ Series ▸ Model, and the taxonomy lives in the CODE

There is **no Range column and no Series column**. The taxonomy is encoded in the
model code (col D) and in 14 banner rows.

| Level | Reality |
|---|---|
| **Supplier** (col Q, 4 values) | Yamaha 238 · Jeanneau 126 · Haines Signature 85 · EPROPULSION 37 |
| **Series / family** | Banner rows only: `Four Stroke Models` (r5) · `YAMAHA - XTO Offshore` (r192) · `TWIN RIG OPTIONS - Mechanical Control` (r208) · `- DEC Control` (r228) · `- DEC w Dig Electro Hyd Steering` (r238) · `- DEC w Dig Electric Steering` (r244) · `- XTO Twin Engines` (r261) · `YAMAHA - Triple Rig Options` (r271) · `VMAX SHO - Forward Orders Only` (r278) · `EPROPULSION - Electric Outboards` (r294) |
| **Model code** (col D) | `[L?][family][HP][rigging letters][gen digit?]`. Leading `L` = **counter-rotating** (40 of 376 coded rows). Family: `F` four-stroke · `VF` VMAX SHO · `XF` XTO · `T` High Thrust. Then HP. Then shaft letter `S`=15" `L`=20" `X`=25" `U`=30", then rigging/start/control letters (`MH` manual tiller, `S` DEC/steer, `C` mech control) and a generation letter. **Trailing `2` = WHITE cowl** — which is why col H Engine Colour is exactly `{Grey, White}`. |
| **Rig count** | Single / twin / triple. Expressed in col E as `2 x 300`, `3 x 350`, and in col D as a compound `F250XSB / LF250XSB` (right + counter-rotating left). |
| **Powerplant package** | Rows 343–628: `SIG 525F w Yamaha - F115XB`, `CC 10.5WA w Yamaha Twin 450HP XTO (White) Joystick`. These are boat+motor pairings, not motors. |
| **Schedule Group** (col TZ, 66 values) | A *separate*, deliberate many-to-one collapse for servicing: `F115LB, F115LB2, F115XB, LF115XB, F115XB2, LF115XB2` all → `F115B`. |

So the motor structure preset should be `Brand ▸ Series ▸ Model` offered but
`Brand ▸ Model` defaulted — and Series must be **optional**.

### 2.3 Trailers — Brand ▸ Series ▸ Trailer. The word IS "Series".

3 levels, and the middle level is literally called **Series** in 30+ names —
`GFAB - Surtees Series`, `Mackay - MLKR Series Trailers`, `ALLOY SUPAROLLA SERIES`,
`SPORTS WATER TOY SERIES`. **The word "Range" appears nowhere in this workbook.**

6 brands (from the hidden `Dropdowns` sheet, row 1, cols C..H):
`REDCO / TINKA TRAILERS` · `STACER TRAILERS` · `DUNBIER TRAILERS` ·
`MACKAY TRAILERS` · `GFAB TRAILERS` · `NSM CUSTOM TRAILERS`
(plus a sentinel pseudo-entry `TRAILER NOT REQUIRED` heading the flat picker in col T).

**Correction — the brand level is not recoverable from the data sheet alone.**
Two of the six brands have no banner row: rows 4–85 (REDCO/TINKA) and 87–184
(NSM CUSTOM) sit *above* the first banner at r186. Their brand membership exists
only in the hidden Dropdowns sheet. And `REDCO - Formosa` (24 trailers, r153–184)
appears in **no** brand column at all — it is orphaned from navigation entirely.

Obsolescence is modelled as a **brand** (`OBSOLETE TRAILERS`, banner r656,
42 trailers) rather than a status flag — and those trailers still carry live prices
and still resolve through VLOOKUP by name.

### 2.4 Parts — Category ▸ Sub-category ▸ Product, and Package ▸ Component

Two different taxonomies in one workbook.

**`Parts Maintenance`** — the category is a **banner ROW**, not a field. 216 banner
rows (col C filled, col E empty); everything below a banner belongs to it until the
next one. Sub-category is the `" - "` infix: `LIGHTING - Navigation`,
`TRAILER PARTS - Tie Downs`, `PLUMBING - Bronze`, `GARMIN GPSMAP 9000 SERIES`.

The vocabulary is **not one axis** — it mixes physical category (`ANCHOR KITS`),
brand (`GARMIN`, `SIMRAD`, `MINN KOTA`), brand + sub-range, boat-brand fitment
(`TUBE COVERS - To suit Highfield Boats`), commercial construct
(`BOAT SALES PROMO PACKS`, `DFO KITS`) and non-product operations
(`LABOUR ESTIMATES`, `SUBLET WORK`, `MISC SUBLETS`).

**`Dealer Fit Module`** — two levels: **Package ▸ Component (max 30)**. One row is
one saleable, installed bundle; its 30 accessory slots each resolve into
`Parts Maintenance` by description. 45 banner rows of its own
(`GARMIN ELECTRONIC OPTIONS`, `MECHANICAL RIGGING KITS (F75 to F350HP)`,
`PRE DELIVERY OPERATIONS - Stacer`, `HIGHFIELD - Sport 560`, …), and one banner
`### OBSELETE MODEL LIST ###` (r2032) above 649 dead rows.

### 2.5 Summary table — what to ship

| Kind | Real levels | Business word for level 2 | Default depth | Optional levels |
|---|---|---|---|---|
| Boat | Brand ▸ **Series** ▸ Model ▸ Variant | Series (Stacer says Range) | 4 | Variant (5 of 8 brands stop at Model) |
| Motor | Brand ▸ Series ▸ Model | Series (banner only, not a column) | 2 (`Brand ▸ Model`) | Series |
| Trailer | Brand ▸ **Series** ▸ Trailer | **Series** | 3 | — |
| Part | Category ▸ Sub-category ▸ Product | Sub-category | 2 | Sub-category |
| Dealer-fit package | Package ▸ Component | — | 2 | — |

---

## 3. COLUMN SECTIONS — the real bands

Sections are real and they are what the business already draws. They are just
drawn badly: only the Parts Module's Dealer Fit sheet uses actual merged spanning
headers. Everywhere else a band is **a label cell in the first column of the run,
plus exactly one blank spacer column between runs**.

### 3.1 Boat Module — 33 bands (spacer columns N, R, V, BW, IH, IL, IZ, JE, JL, JS, KD, KL, KO, KU, LE, LK, LQ, LW, MC, MI, MO, MU, NA, NG, NM, NS, NY, OJ, QB, QI, QP, RL, SU, TG, TS, UE, UI, UK, WK, XQ)

| # | Section name (verbatim) | Columns | Members |
|---|---|---|---|
| 1 | *(identity — unlabelled)* | C..M | Boat name, Model Code, Matrix, Image Link, OA Length, OA Width/Beam, Tube Dia., Image Type, Int Length, Int Width, Deadrise |
| 2 | *(capacity — unlabelled)* | O..Q | Fuel Capacity, Max Load, Max People |
| 3 | *(construction — unlabelled)* | S..U | Boat Weight, Air Chambers, *(brand-dependent 3rd)* |
| 4 | **STANDARD FACTORY INCLUSIONS** (also written **STANDARD INCLUSIONS**) | W..BV (52) | W = the band label; X..BV = inclusion 01..51, where 51 is the "specifications subject to change" note |
| 5 | **FACTORY OPTIONS AVAILABLE** (also **Factory Options**) | BX..IG (166) | BX = label; BY..IG = option slot 01..165 |
| 6 | *(currency — unlabelled)* | II..IK | Currency, EX Rate, Duty |
| 7 | *(cost build — unlabelled)* | IM..IY (13) | Base Cost, Factory Disc ×2, Boat Prep, Base Freight, Documentation, Fumigation, Ocean Freight, Fuel Surcharge, Other Charges, Other Chg $A, Road Freight, **Landed Hull Cost** |
| 8 | **CURRENT FACTORY PROMOS** | JA..JD | label, Full Rebate Amount (inc GST), Factory Contribution (inc GST), NSM Contribution (inc GST) |
| 9 | **MARKUPS** | JF..JK | HO - MU, BMT - MU, Factory Options - MU, Dealer Fit Options - MU, Admin Load, Warranty Adj |
| 10 | *(pre-delivery — unlabelled)* | JM..JR | Pre Delivery Code, Boat PD (hrs), Labour Rate ($), Boat Detailing ($), Fuel Allocation (Litres), Tilt Limit Switch |
| 11 | **P/D - Parts & Accessories** | JT..KC (10) | slots 01..10 |
| 12 | *(handover — unlabelled)* | KE..KK | Boat Hand Over (hrs), Tie Down Straps, H/O - Parts & Accessories ×2, H/O - Other, Sundry Charges, Promo Gear Allowance |
| 13 | *(registration — unlabelled)* | KM..KN | Boat Registration, Boat Rego Decals |
| 14 | *(safety — unlabelled)* | KP..KT | Adults, Standard Safety Gear, PFD's Sup., PFD Type, Standard Anchor Kit |
| 15 | *(motor envelope + Motor Option 1)* | KV..LD | Min HP, Max HP, Shaft Lgth, Eng Configuration, Recommended Motor Option, Rigging Kit Option, Prop Part No., Prop Description, Engine Hole |
| 16–27 | **Motor Option 2..13** | LF..NX | twelve identical 5-column repeats: Motor Option / Rigging Kit Option / Prop Part No. / Prop Description / Engine Hole |
| 28 | *(trailers — unlabelled)* | NZ..OI (10) | Std Trailer + Trailer Option 2..10 |
| 29 | **Additional Package Options** | OK..QA (43) | OK = label; OL..QA = Additional Dealer Fit Options Line 01..42 |
| 30 | **DEPOSIT PAYMENT SCHEDULE** | QC..QH | label, Pending Deal/Security Deposit, Confirmed Deal Deposit, Leaving Factory Payment (HIN Supplied), Notice of Arrival Payment, On Handover |
| 31 | **Factory Lead Times (in Days)** | QJ..QO | label, Lockout Date, Factory Build Date, Factory Completion Date, Factory Shipping Date, Estimated Lead Time (Days) |
| 32 | **Hull Only Pricing** | QQ..RK (21) | the price ladder — see §6 |
| 33 | **HULL & GRAPHICS** (also **HULL CONFIGURATION**, **PAINT & GRAPHIC OPTIONS**) | RM..ST (34) | label + Paint & Graphics Opt 01..30 + 3 × "NB: Leave Blank" |
| 34–36 | *(three Pre-Delivery sell tiers)* | SV..TF, TH..TR, TT..UD (11 each) | Pre Delivery Description, PD Code, Est Hrs, Labour $, Parts CTD, Sundry CTD, Sublet CTD, Total CTD, GP %, GP $, Sell (inc GST) |
| 37 | *(engine labour — template only)* | UF..UJ | Motor PD Labour, Motor Install Labour, Rigging Kit Labour, *(blank)*, Total Enginge Labour Allowance *[sic]* |
| 38 | **Mechanical Pre-Delivery Check List** | UL..WJ (51) | label + MPDC Line 1..50 |
| 39 | **Detail Pre-Delivery Check List** | WL..XP (31) | label + DPDC Line 1..30 |

### 3.2 Trailer Module — 8 bands (spacer columns P, AM, AT, BA, BR, BX, CB)

| Section name (verbatim) | Columns | Members |
|---|---|---|
| *(identity + spec — unlabelled)* | C..O | Brand / Make / Model, Supplier, Code, Long Description, Image Link, Boat Size (Mtr), Wheel Size, Tare (Kg), ATM (KG), Winch, Between Guards (mm), Trailer Length (Mtr), Trailer Plug |
| **TRAILER FEATURES** | Q..AL (22) | Q = label; R..AL = Trailer Features 1..21 |
| *(pricing — unlabelled)* | AN..AS | Dealer, Discount, Settlement, Nett Price, Freight, Landed |
| **Factory Lead Times (in Days)** | AU..AZ | label, Lockout Date, Factory Build Date, Factory Completion Date, Factory Shipping Date, Estimated Lead Time |
| *(pre-delivery cost — unlabelled)* | BB..BQ | PD Operation, PD (Hrs), PD ($), then five Part/Cost pairs (BE/BF … BM/BN), Sundry, Detailing, Total PD Charges |
| *(margin — unlabelled)* | BS..BW | Total Nett CTD, MU %, GP, RRP, Sell |
| *(registration — unlabelled)* | BY..CA | Rego Type, Rego ($), Sell inc Rego |
| **FACTORY OPTIONS** | CC..FY | CC = label; then 20 repeating 4-column groups `code · Description · Cost · Sell` at CD, CI, CN, CS, CX, DC, DH, DM, DR, DW, EB, EG, EL, EQ, EV, FA, FF, FK, FP, FU |
| *(dealer fit — unlabelled)* | FZ..GS (20) | Dealer Fit Option - 1..20 |

Plus an **orphan compliance form** at KE..NU: 32 header labels in row 1, **zero data
on any row**. This is a requirements artefact — exactly the per-trailer registration
fields the business has specified and has nowhere to put: `Is the trailer imported?`,
`Is a VIN Stamped on frame?`, `Body Type`, `Date of manufacture`,
`Manufacturer's Name`, `Vin or Chassis Number` (**listed twice**, KW and KZ),
`Tare (kg)`, `Tyre Size`, `Ply Rating`, `Load Rating`, `Cold Tyre Pressure`, `GTM`,
`Axel Rating (kg)`, `Tow Ball Rating (kg)`, `Is ATM detailed on Vehicle Plate?`,
`Under 2.5m Wide`, `Under 4.3m High`, `Caravan/Camper Trailer?`,
`Does trailer comply with VSB1`, `Registered by`.

### 3.3 Motor Module — 14 bands

| Section name | Columns | Members |
|---|---|---|
| *(identity + spec)* | C..Q | MODEL (display name), MODEL (code), HP Rating, Shaft Length, Cylinders/Displacement, Engine Colour, Image Link, Control, Starting, Tilt & Trim, Fuel Tank, Prop, Sales Install, Supplier |
| *(cost ladder)* | R..AA | Dealer List Price, Holdback 3%, Store Price, DIGS, Dealer Buy, Freight Exc GST, Landed CTD, Rebate Program, Rebate Discount, Nett CTD |
| **PRE DELIVERY CHARGES** (label at AD3) | AC..AV | PD Operation Code, Labour (Hrs), Labour $, Oil (Ltr), Oil ($), Fuel (Ltr), Fuel ($), Flusher (Code), Flusher ($), Parts (Code) ×4 with unnamed $ columns, Detailing, Sundry, Total PD Allowance |
| *(four parallel price ladders off AX Total CTD)* | AX..BY | retail (AY MU, AZ GP, BB RRP+Freight Inc GST, BC NSM Retail, BD Factory Rebate, BE Dealer Discount, BF Sell Price) · trade (BH..BL) · commercial (BO..BS) · Boating Alliance (BU..BY) |
| *(installation + PDI)* | CI..CY | Installation, Op Code, TTF, Labour, Sundry 1–3, Sublet, Install-CTD, Install-Sell, Engine Removals, PDI (TTF), PDI (Oil/Fuel), PDI (Sundry), PDI (Sublet) |
| **Rigging Option - 01..50** | DA..EX | 50 slots |
| *(bundled accessories)* | EY..FI | FLUSHER, COWL COVER, MOTOR SUPPORT, FUEL FILTER, TILT LIMIT SWITCH, *(unnamed)*, WEIGHT, REV RANGE, Alternate Model Code, Gearbox |
| **Additional FO's - 01..25** | FT..GR | 25 slots, **only 3 distinct values across 482 cells** |
| **Prop Option - Default, -02..-100** | GT..KO | 100 slots |
| *(service labour hours)* | KQ..LA | `20 Hr - Labour` … `1,000 Hr - Labour` (11) |
| **GEAR OIL** *(a real merged band, LC3:LG3)* | LC..LG | Part No, Description, Qty (Req), Cost, Sell (Total) |
| **ENGINE OIL** *(a real merged band, LI3:LM3)* | LI..LM | same 5 |
| *(≈26 more 5-column part blocks)* | LO..SP | Service Sundries, Oil Filter, Drain Bung Washer ×2, Spark Plugs, Water Pump Impeller ×2, Fuel Filter (Engine), Fuel Filter (VST) ×3, Internal Anodes ×6, OCV Filters, External Anodes ×3, Water Pump Housing Kit ×2, Water Pump Repair Kit, Thermostat Gasket, Thermostat ×3, Boat Filter, Timing Belt, Timing Belt Tensioner |
| *(11 service events)* | UB..WN | each a 5-column block `Name · Labour ($) · Parts · Sundry · Total` for 3 Month/20 Hour … 10 Year/1,000 Hour |
| **6 Year Service Plan** | WP..WT | Total, Indexed, Payments, Per Month |
| *(technician + invoice text)* | WV..YA | 11 pairs of `Tech Instructions - N Hour` / `Invoice Text - N Hour` |

### 3.4 Parts Module

`Parts Maintenance` has **no** column sections — one flat run C..AC, with the
implicit split being *supplied price* (C..M) versus *fitted price* (N..Y) versus
*outbound codes* (AA..AB).

`Dealer Fit Module` has the only real merged sections in the whole MPF:
`C5:C7` = **"Dealer Fit Options"** over the main block C..S, then thirty
8-column bands **"Accessory - 1"** … **"Accessory - 30"** at
`T9:AA9`, `AC9:AJ9`, `AL9:AS9`, `AU9:BB9`, `BD9:BK9`, `BM9:BT9`, `BV9:CC9`,
`CE9:CL9`, `CN9:CU9`, `CW9:DD9`, `DF9:DM9`, `DO9:DV9`, `DX9:EE9`, `EG9:EN9`,
`EP9:EW9`, `EY9:FF9`, `FH9:FO9`, `FQ9:FX9`, `FZ9:GG9`, `GI9:GP9`, `GR9:GY9`,
`HA9:HH9`, `HJ9:HQ9`, `HS9:HZ9`, `IB9:II9`, `IK9:IR9`, `IT9:JA9`, `JC9:JJ9`,
`JL9:JS9`, `JU9:KB9` — each `Accessory · Code · CTD · Sell · Labour · Lab Hrs ·
Sundry · Sublet`.

### 3.5 Our default sections, distilled

Boats: **Identity · Dimensions · Capacity · Cost Build · Markups · Hull Only
Pricing · Pre-Delivery · Registration & Safety · Motor Fitment · Deposit Schedule ·
Factory Lead Times**.
Motors: **Identity · Specification · Cost Ladder · Retail Pricing · Trade Pricing ·
Pre-Delivery · Installation · Service**.
Trailers: **Identity · Specification · Pricing · Pre-Delivery · Margin ·
Registration**.
Parts: **Identity · Supply Pricing · Fitted Pricing · Operations**.

---

## 4. CORRECTED `TABLE_KINDS`

Paste-ready. `section` is the `ColumnSection.id`; `unit` is the correction
`HELMLOGIC_GROUND_TRUTH.md §2.0` asked for and is **still not on `KindColumn`** —
until it is, put the unit in the column name (`Length m`) as the demo does.

### 4.1 `boat`

```ts
structures: [
  { id: 'brand-series-model-variant',
    levels: ['Brand', 'Series', 'Model', 'Variant'],
    caption: 'A brand’s series, their models, and each model’s material and colourway SKUs.' },   // DEFAULT
  { id: 'brand-series-model',
    levels: ['Brand', 'Series', 'Model'],
    caption: 'Models are sold as one item — no material or colour split.' },
  { id: 'brand-model', levels: ['Brand', 'Model'], caption: 'A short catalogue with no series grouping.' },
  FLAT,
]
```

`Range` is **removed as a default level name**. Highfield/Stabicraft/Surtees/Haines
all write "Series"; only Stacer writes plural range names. Level names stay
renameable per table (spec §3c).

| detailColumn | FieldType | Section | Source cell / evidence |
|---|---|---|---|
| Model Code | text **(key)** | Identity | Boat!D — `HBS113`. Not unique: `HBS113..HBS128` appear live *and* obsolete |
| Name | text | Identity | Boat!C — the de-facto foreign key every other module joins on |
| Matrix | select | Identity | Boat!E — the **pricing-profile key**, 12 values (§5) |
| Material | select | Identity | parsed from Boat!C `(PVC)` / `(HYP)` — Highfield's first variant axis |
| Colourway | text | Identity | parsed from Boat!C — `W-W-WB` = TUBE-HULL-UPHOLSTERY |
| Image | image | Identity | Boat!F |
| OA Length m | number | Dimensions | Boat!G — 5.66 |
| Beam m | number | Dimensions | Boat!H — 2.5 |
| Tube Dia. cm | number | Dimensions | Boat!I — stored as `"52 cm"` |
| Int Length cm | number | Dimensions | Boat!K — `"382 cm"` on SP520/560 but `"4.75 m"` on SP600/660 (§8) |
| Int Width cm | number | Dimensions | Boat!L |
| Deadrise ° | number | Dimensions | Boat!M — `"24 deg"` |
| Fuel Capacity L | number | Capacity | Boat!O — `"105 ltr"` |
| Max Load kg | number | Capacity | Boat!P — `"1,188 kg"` |
| Max People | number | Capacity | Boat!Q — 12 |
| Boat Weight kg | number | Capacity | Boat!S — `"581 kg"` |
| Air Chambers | number | Capacity | Boat!T |
| Currency | select | Cost Build | Boat!II — AUD · USD · Euro · NZ |
| EX Rate | number | Cost Build | Boat!IJ — `=VLOOKUP(II,'[1]Exchange Rates'!$C:$ZZ,4,0)` |
| Duty | number | Cost Build | Boat!IK |
| Base Cost | number | Cost Build | Boat!IM — supplier FOB in `Currency` |
| Other Chg $A | number | Cost Build | Boat!IW |
| Road Freight | number | Cost Build | Boat!IX — `=ROUNDUP(G*'[9]FCL Import - Highfield'!$I$35,-1)+250` |
| Landed Hull Cost | number | Cost Build | Boat!IY — the cost base for every margin |
| HO - MU | number | Markups | Boat!JF |
| BMT - MU | number | Markups | Boat!JG |
| Factory Options - MU | number | Markups | Boat!JH |
| Dealer Fit Options - MU | number | Markups | Boat!JI |
| Cash | number | Hull Only Pricing | Boat!QR — RRP inc GST |
| Cash GP % | formula | Hull Only Pricing | Boat!QS |
| Trade | number | Hull Only Pricing | Boat!QT |
| Sub Dealer | number | Hull Only Pricing | Boat!QV |
| Sub (Exclusive) | number | Hull Only Pricing | Boat!QX |
| AUS Sailing | number | Hull Only Pricing | Boat!QZ |
| Warranty | number | Hull Only Pricing | Boat!RB |
| Pre Delivery Code | text | Pre-Delivery | Boat!JM |
| Boat PD hrs | number | Pre-Delivery | Boat!JN |
| Boat Detailing $ | number | Pre-Delivery | Boat!JP |
| Fuel Allocation L | number | Pre-Delivery | Boat!JQ |
| Boat Hand Over hrs | number | Pre-Delivery | Boat!KE |
| PD Basic Sell inc GST | number | Pre-Delivery | Boat!TF |
| PD Standard Sell inc GST | number | Pre-Delivery | Boat!TR |
| PD Complex Sell inc GST | number | Pre-Delivery | Boat!UD |
| Boat Registration | select | Registration & Safety | Boat!KM |
| Boat Rego Decals | select | Registration & Safety | Boat!KN |
| Standard Safety Gear | select | Registration & Safety | Boat!KQ |
| PFD's Sup. | number | Registration & Safety | Boat!KR |
| PFD Type | select | Registration & Safety | Boat!KS |
| Standard Anchor Kit | select | Registration & Safety | Boat!KT |
| Min HP | number | Motor Fitment | Boat!KV — `"90 HP"`; **total installed HP** |
| Max HP | number | Motor Fitment | Boat!KW — `"115 HP"`, or `"350 / 2 x 200 HP"` on SP800 |
| Shaft Lgth | select | Motor Fitment | Boat!KX — 16 values (§5) |
| Eng Configuration | select | Motor Fitment | Boat!KY — Remote · Tiller |
| Std Trailer | reference → trailer | Motor Fitment | Boat!NZ |
| Confirmed Deal Deposit | number | Deposit Schedule | Boat!QE |
| Leaving Factory Payment | number | Deposit Schedule | Boat!QF |
| On Handover | number | Deposit Schedule | Boat!QH — `=100%-SUM(QD:QG)` |
| Estimated Lead Time days | number | Factory Lead Times | Boat!QO |
| Status | select | Identity | Current · Obsolete. **This does not exist in the sheet** — obsolescence is whole-row amber fill `FFFFC000` on rows 1006–2301 (§8). It is the single highest-value column we add. |

**Removed from our invention:** `Length ft` (Australian marine is metric — every
length in the sheet is metres or centimetres), bare `Price` (there are **eleven**
price columns), `Weight kg` (the sheet distinguishes Boat Weight from Max Load).

### 4.2 `motor`

```ts
structures: [
  { id: 'brand-model', levels: ['Brand', 'Model'], caption: 'One flat list of engines per brand.' }, // DEFAULT
  { id: 'brand-series-model', levels: ['Brand', 'Series', 'Model'],
    caption: 'Group engines by factory series — Four Stroke, XTO Offshore, VMAX SHO, Electric.' },
  FLAT,
]
```

| detailColumn | FieldType | Section | Source |
|---|---|---|---|
| Model | text **(key)** | Identity | Motor!C — `Yamaha - F115XB`. **This string is the ecosystem's primary key.** |
| Model Code | text | Identity | Motor!D — `F115XB` |
| Supplier | select | Identity | Motor!Q — 4 values |
| Engine Colour | select | Identity | Motor!H — Grey · White |
| Image | image | Identity | Motor!I |
| HP | number | Specification | Motor!E — 44 values incl. `2 x 300`, `3 x 350`, `Electric` |
| Shaft Length | select | Specification | Motor!F — 13 values, mostly `15"/20"/25"/30"` |
| Cylinders / Displacement | text | Specification | Motor!G — `L4 / 1832cc` |
| Control | select | Specification | Motor!J — 11 values, **two carry trailing spaces** |
| Starting | select | Specification | Motor!K |
| Tilt & Trim | select | Specification | Motor!L |
| Fuel Tank | select | Specification | Motor!N |
| Prop | text | Specification | Motor!O |
| Weight kg | number | Specification | Motor!FF — `"166 kg"` |
| Rev Range | text | Specification | Motor!FG |
| Gearbox | text | Specification | Motor!FI |
| Schedule Group | text | Specification | Motor!TZ — the service many-to-one key |
| Dealer List Price | number | Cost Ladder | Motor!R |
| Store Price | number | Cost Ladder | Motor!T — **manually keyed**, yellow-filled |
| Dealer Buy | number | Cost Ladder | Motor!V |
| Freight Exc GST | number | Cost Ladder | Motor!W |
| Landed CTD | number | Cost Ladder | Motor!X |
| Rebate Program | select | Cost Ladder | Motor!Y — 12 campaigns, dates inside the label |
| Nett CTD | number | Cost Ladder | Motor!AA |
| Total PD Allowance | number | Pre-Delivery | Motor!AV |
| Total CTD | number | Cost Ladder | Motor!AX |
| NSM Retail | number | Retail Pricing | Motor!BC |
| Factory Rebate | number | Retail Pricing | Motor!BD |
| Dealer Discount | number | Retail Pricing | Motor!BE |
| Sell Price | number | Retail Pricing | Motor!BF — **cyan-filled: the number the salesperson works to** |
| Trade Price | number | Trade Pricing | Motor!BL |
| Commercial Price | number | Trade Pricing | Motor!BS |
| Boating Alliance Price | number | Trade Pricing | Motor!BY |
| Installation | select | Installation | Motor!CI — 13 values, **hours embedded in the label** |
| Install Op Code | text | Installation | Motor!CJ |
| Install Labour hrs | number | Installation | Motor!CK |
| Install Sell | number | Installation | Motor!CR |
| Engine Removal | select | Installation | Motor!CS — 14 values, the only HP-banded logic in the file |
| Rigging Kit (default) | text | Installation | Motor!DA |
| Prop (default) | text | Installation | Motor!GT |
| Status | select | Identity | Current · Obsolete — added by us |

**Removed:** `Shaft: Short/Long/Extra long` — invented. The trade says inches.

### 4.3 `trailer`

```ts
structures: [
  { id: 'brand-series-trailer', levels: ['Brand', 'Series', 'Trailer'],
    caption: 'A brand’s series, and the trailers in each.' },                        // DEFAULT
  { id: 'brand-trailer', levels: ['Brand', 'Trailer'], caption: 'A brand and its trailers.' },
  FLAT,
]
```

| detailColumn | FieldType | Section | Source |
|---|---|---|---|
| Name | text **(key)** | Identity | Trailer!C — the VLOOKUP key. **2 exact duplicates** (rows 524/525, 533/534) |
| Code | text **(key)** | Identity | Trailer!E — **13 duplicate codes** |
| Supplier | select | Identity | Trailer!D — 6 real values |
| Long Description | text | Identity | Trailer!F |
| Boat Size | text | Specification | Trailer!H — **does four jobs**, keep it text (§8) |
| Wheel Size | select | Specification | Trailer!I — 28 spellings for ~6 real values |
| Tare kg | number | Specification | Trailer!J |
| ATM kg | number | Specification | Trailer!K — the rating that drives rego |
| Winch | select | Specification | Trailer!L |
| Between Guards mm | number | Specification | Trailer!M |
| Trailer Length mm | number | Specification | Trailer!N — **header says (Mtr), values are mm** |
| Trailer Plug | select | Specification | Trailer!O |
| Axles | select | Specification | Single · Tandem · Tri · Unbraked. **There is no axle column** — derived from Trailer!BB or from misspelt prose (`Axel`); the two disagree on 10+ rows |
| Dealer | number | Pricing | Trailer!AN |
| Settlement | number | Pricing | Trailer!AP — `=AN*5%` |
| Nett Price | number | Pricing | Trailer!AQ |
| Freight | number | Pricing | Trailer!AR |
| Landed | number | Pricing | Trailer!AS |
| PD Operation | select | Pre-Delivery | Trailer!BB — 7 values |
| PD hrs | number | Pre-Delivery | Trailer!BC |
| PD $ | number | Pre-Delivery | Trailer!BD |
| Total PD Charges | number | Pre-Delivery | Trailer!BQ |
| Total Nett CTD | number | Margin | Trailer!BS |
| MU % | formula | Margin | Trailer!BT — `=BU/BS` |
| GP | number | Margin | Trailer!BU |
| RRP | number | Margin | Trailer!BV |
| Sell | number | Margin | Trailer!BW |
| Rego Type | select | Registration | Trailer!BY — 3 values, **typed not derived; 9 rows violate the ATM rule** |
| Rego $ | number | Registration | Trailer!BZ |
| Sell inc Rego | number | Registration | Trailer!CA |
| Status | select | Identity | Current · Obsolete — replaces the `OBSOLETE TRAILERS` pseudo-brand |

**Removed:** `Max Load kg` (the real name is **ATM**, and it is a legal rating, not
a load limit), `Max Length ft` (two different numbers exist — `Boat Size` and
`Trailer Length` — and neither is feet), `Axles: number` (the trade says Tandem).

### 4.4 `accessory` / part

```ts
structures: [
  { id: 'category-product', levels: ['Category', 'Product'], caption: 'Products grouped the way the price file groups them.' }, // DEFAULT
  { id: 'category-sub-product', levels: ['Category', 'Sub-category', 'Product'], caption: 'A deeper catalogue.' },
  { id: 'package-component', levels: ['Package', 'Component'], caption: 'A package your workshop fits, and the parts and labour inside it.' },
  FLAT,
]
```

| detailColumn | FieldType | Section | Source |
|---|---|---|---|
| Description | text **(key)** | Identity | Parts!C — **the join key, and it is free text**. 26 duplicates |
| Supplier | select | Identity | Parts!D — 90 codes, incl. `YAM` (566) and `Yam` (296) as two |
| Code | text | Identity | Parts!E — mixed str/int/float |
| Supplier Description | text | Identity | Parts!F — 414 live `#N/A` |
| P&A Cost | number | Supply Pricing | Parts!G |
| Landing MU | number | Supply Pricing | Parts!H — per-supplier, from Price Matrix |
| CTD | number | Supply Pricing | Parts!I — `=G+(G*H)` |
| Sell inc GST | number | Supply Pricing | Parts!L |
| GP | number | Supply Pricing | Parts!K — `=L/1.1-I` |
| Install Type | select | Operations | Parts!N — **148 values**, FK to Service Module |
| TTF hrs | number | Operations | Parts!O |
| Labour $ | number | Fitted Pricing | Parts!P — `=O*Labour Rates!$G$14` |
| Sundry CTD | number | Fitted Pricing | Parts!R |
| Total CTD | number | Fitted Pricing | Parts!S |
| Sell inc Install | number | Fitted Pricing | Parts!Y — `=ROUNDDOWN(SUM(V:X))` |
| Operation Code | text | Operations | Parts!AA — minted `"DFO-"&D&"-"&E` etc. |
| Status | select | Identity | Current · Obsolete |

**Removed:** `In Stock: boolean` — inventory is not in this workbook and does not
belong on a catalogue row.

### 4.5 Kinds still missing (unchanged from `HELMLOGIC_GROUND_TRUTH.md §2.7`, now
confirmed against the workbooks)

1. **`fitment`** — confirmed necessary. §7.
2. **`priceLevel`** — the ladder is 6 discount/markup ordinals in one external
   Price Matrix workbook (cols 10, 11, 12, 13, 14, 16, 17), re-looked-up 1,387
   times per column. One table replaces all of it.
3. **`brand`** — confirmed. The Matrix key (Boat!E) **is** a brand row waiting to
   happen: it carries the trade %, the sub-dealer %, four markups and an FX rate.
4. **`registration`** — confirmed twice over: the boat has a `Boat Registration`
   band enum and the trailer has an ATM-driven rego band with **9 live violations**.

---

## 5. ENUMS — verbatim, ready as `Choice` options

Values are exactly as they appear in the cells, typos and all. Header text and the
row-2 ordinal integers that bleed into the same columns are excluded.

### 5.1 Boats (`Boat Module`)

**E — Matrix** (the brand / pricing-profile key, 10 real):
`Stacer` · `Stabicraft` · `Surtees` · `Jeanneau` · `Merry Fisher` ·
`Haines Signature` · `Highfield Inflatables` · `Formosa` · `Yamaha` ·
`Administration`

**J — Image Type**: `Boat` · `Motor Repower Sale` · `Trailer Sale`

**II — Currency**: `AUD` · `USD` · `Euro` · `NZ`

**IJ — EX Rate**: `0.55` · `0.6` · `0.65` · `0.7` · `1` · `1.13` · `1.2`

**IK — Duty**: `0` · `0.0002` · `0.005` · `0.05`

**JF — HO - MU**: `0` · `0.15` · `0.17647` · `0.185` · `0.2` · `0.21` · `0.24` ·
`0.25` · `0.29` · `0.3` · `0.45` · `0.5`

**JG — BMT - MU**: `0` · `0.105` · `0.125` · `0.17647` · `0.185` · `0.2` · `0.21` ·
`0.24` · `0.25` · `0.29` · `0.3` · `0.475` · `0.5`

**JH — Factory Options - MU**: `0` · `0.15` · `0.17647` · `0.185` · `0.2` · `0.25` ·
`0.29` · `0.291` · `0.5`

**JI — Dealer Fit Options - MU**: `0` · `0.185` · `0.225` · `0.3`

**JN — Boat PD (hrs)**: `0` · `0.5` · `1` · `1.5` · `2` · `2.5` · `2.7` · `3` ·
`3.2` · `4` · `5` · `6` · `6.5` · `7` · `8` · `9` · `10` · `12` · `15` · `16` ·
`18` · `20` · `22` · `24` · `26` · `30` · `35` · `45`

**JR — Tilt Limit Switch**: `Yes` · `No`

**KF — Tie Down Straps**: `MTD25 - Tie Down Strap` ·
`2 x MTD25 - Tie Down Straps` · `MTD33 - Transom Straps (pr)` ·
`NR - Not Required` · `NR - Tie Downs Not Required`

**KM — Boat Registration**: `Up to and inc 4.5m` · `4.51m to 6.0m` ·
`6.01m to 10.00m` · `10.01 to 15m` · `Boat Registration Not Required`

**KN — Boat Rego Decals**: `Registration Decals - Standard (8" Black)` ·
`Rego Decals (Std) t/s PVC Tubes` · `Rego Decals (Std) t/s Hypalon Tubes` ·
`Custom Rego Decals - Black` · `Custom Rego Decals - Silver` ·
`Custom Rego Decals - White` · `Rego Letters Not Required`

**KQ — Standard Safety Gear**: `Safety Gear - Smooth Waters` ·
`Safety Gear - Partially Smooth Waters` · `Safety Gear - Open Waters` ·
`NR - Not Required`

**KS — PFD Type**: `EA - Adult PFD, Standard` ·
`Inflatable PFD - Adult 150N (Manual)` · `NR - Not Required`

**KT — Standard Anchor Kit**: `Sand Anchor Kit - 4lb` · `- 6lb` · `- 8lb` ·
`- 10lb` · `- 13lb` · `Sarca No. 2 Anchor w S/S Swivel` ·
`Sarca No. 3 Anchor w S/S Swivel` · `NR - Not Required`

**KX — Shaft Lgth**: `S` · `SS` · `L` · `LS` · `XL` · `UL` · `XL / XXL` ·
`XL / UL / XL` · `XL / 2xXL` · `UL / 2 x XL` · `Twin XL` · `Sng UL / Twin XL` ·
`Sng UL or Twin XL` · `Sng XL / Twin XL`

**KY — Eng Configuration**: `Remote` · `Tiller`

**QE — Confirmed Deal Deposit**: `0.2` · `0.3` **QH — On Handover**: `0.4` · `0.5` · `0.7` · `0.8`

**SV / TH / TT — Pre Delivery Description**: `Pre Delivery - Basic` ·
`Pre Delivery - Standard` · `Pre Delivery - Complex`

**SW / TI / TU — PD Code**: `PD-FOR-STD` · `PD-HIG-STD` · `PD-HIG-COM` ·
`PD-JEA-STD` · `PD-SIG-STD` · `PD-STA-BAS` · `PD-STC-STD` · `PD-SUR-STD`

**RN — Paint & Graphics Opt 01** (24): `.` · `Hull: White / Tube: White` ·
`Hull: White / Tube: Light Grey` · `Hull: White / Tube: Artic` ·
`Hull: White / Tube: Black` · `Hull: Grey / Tube: Storm` ·
`Hull: Grey / Tube: Military` · `Hull: Grey / Tube: Miltary` *[sic — both spellings
are live, distinct values]* · `Hull: Grey / Tube: Neptune` ·
`Hull: Grey / Tube: Orange` · `Hull: Grey / Tube: Black` ·
`Hull: Black / Tube: Black` · `Hull: Black / Tube: Ivory` ·
`Hull: Black / Tube: Red` · `Tube Colour: White` · `Tube Colour: Light Grey` ·
`Tube Colour: Orange` · `Paint Colour (Solid) - White` · `GLOSS-DB` ·
`SIG-HCOL-BW` · `SUR-SOLID-White` · `NB: Not Painted` · `Refer Factory Options`

**Highfield colourway tokens** (from Boat!C, decoded via RN/RO/RP —
`TUBE-HULL-UPHOLSTERY`): `W-W-WB` · `LG-W-WB` · `LG-W-DB` · `B-W-C` · `DG-G-MB` ·
`B-B-DB` · `B-B-B` · `I-B-C` (Sport); `W-W-WD` · `LG-W-WD` · `DG-G-DG` ·
`B-G-DG` · `I-B-C` (Classic); `LG-W-DG` · `DG-G-DG` · `O-G-DG` · `R-B-B` ·
`B-B-B` (Patrol); `W-W` · `LG-W` · `DG-G` · `B-G` (Ultralite); `WH` · `LG` (Roll-Up).
**The same token maps to a different marketing colour depending on material:**
`LG` = "Light Grey" in PVC but "Artic" in Hypalon; `DG` = "Storm" in PVC but
"Miltary" in Hypalon.

**Material**: `PVC` · `HYP` (ORCA Hypalon).

### 5.2 Motors (`Motor Library`)

**Q — Supplier**: `Yamaha` · `Jeanneau` · `Haines Signature` ·
`EPROPULSION - Electric Outboards`

**H — Engine Colour**: `Grey` · `White`

**F — Shaft Length**: `25"` · `30"` · `20"` · `15"` · `25" / 30" / 25"` · `LS` ·
`SS` · `XS` · `ZJM` · `NE-3000-S0` · `NE-3000-L0` · `NE-6000-S1` · `NE-6000-L1`
*(the last five are ePropulsion part numbers and a jet code sitting in a
shaft-length column)*

**J — Control** (⚠ two values carry a **trailing space**):
`DEC with Digital Electric Steering ` · `Remote mech` · `Tiller handle` ·
`DEC with Digital Electro Hydraulic Steering ` · `DEC with Hydraulic Steering` ·
`Mech with Hydraulic Steering` · `DEC - Digital Electronic Control` · `SBW` ·
`DBW` · `Mech. Tie Bar Required for Steering^` · `In Box - 703 Remote`

**K — Starting**: `Electric` · `Manual` · `Manual & Electric` ·
`Manual (E-Kit OP)` · `6 kW (9.9HP)` · `3 kW (6HP)`

**L — Tilt & Trim**: `TotalTilt` · `Power Trim & Tilt` · `Manual` · `Power Tilt` ·
`TotalTiltTM` *(a stray trademark variant of TotalTilt)*

**N — Fuel Tank**: `Opt` · `Factory Tank` · `1.1L 2way` · `-` · `0.9L Int`

**P — Sales Install**: `No` · `Yes`

**CI — Installation** (hours embedded in the label):
`Check Over Motor Installation (0.5)` ·
`Install Motor (5.0) - Excludes Rigging Kit Installation` ·
`Install Motor (4.0) - Excludes Rigging Kit Installation` ·
`Install Twin Engines (10.0) - Excludes Rigging Kit Installation` ·
`Install Motor (2.0) - Tiller Version Only` ·
`Install Motor (0.5) - Tiller Version Only` ·
`Install Motor (8.0) - Excludes Rigging Kit Installation` ·
`Install Motor (0.5) - Excludes Rigging Kit Installation` ·
`Install Motor (1.0) - Tiller Version Only` ·
`Install Motor (2.0) - Excludes Rigging Kit Installation` ·
`Install Motor (6.0) - Excludes Rigging Kit Installation` ·
`Install Motor (3.0) - Excludes Rigging Kit Installation` ·
`Installation Not Required`

**CJ — Install Op Code**: `SER_CMI_00.50` · `YAM_IME_05.00` · `YAM_IME_04.00` ·
`YAM_IME_10.00` · `YAM_IME_02.00T` · `YAM_IME_00.50T` · `YAM_IME_08.00` ·
`YAM_IME_00.50` · `YAM_IME_01.00T` · `YAM_IME_02.00` · `YAM_IME_06.00` ·
`YAM_IME_03.00`

**CS — Engine Removal** (the only HP-banded logic anywhere in the MPF, and it bands
*service*, not fitment): `Engine Removal - Up to 30hp` · `- 40 to 70hp` ·
`- 75 to 130hp` · `- 150 to 200hp` · `- 225 to 300hp` · `- Above 300hp` ·
`- Tiller Models` · `Engine Removal (Twin Rigs) - 2 x 40 to 70hp` ·
`- 2 x 75 to 130hp` · `- 2 x 150 to 200hp` *(missing a space before the hyphen)* ·
`- 225 to 300hp` · `- Above 300hp` · `Engine Removal (Triple Rigs) - 225 to 300hp` ·
`- Above 300hp`

**EY — Flusher**: `Yamaha - Screw in Flusher Fitting (F15 to XF425)` ·
`NR - Not Required` ·
`Yamaha - Low Water Pickup Flusher (Suits V6 SHO Models)` ·
`Yamaha - Screw in Small Engine Flusher (F4 to F9.9)`

**FG — Rev Range**: `5,000 - 6,000` · `5,300 - 6,300` · `4,500 - 5,500` ·
`4,000 - 5,000` · `5,250 - 5,750`

**Y — Rebate Program** (validity date baked into the label, expired ones still
listed): `Yamaha MEGA Sale Campaign - Valid till 25.05.2025` ·
`115 to 130HP Hero Model Promo - Valid till 30.04.2025` ·
`Yamaha 50/60/70 Clearance - Valid Till 31.01.2026` ·
`Yamaha 50-90HP Fire Up Promo - Valid till 31.10.2025` ·
`Yamaha Summer Rigging Promo - Valid till 31.01.26` ·
`Yamaha Summer Portables Promo - Valid till 31.01.26` ·
`Yamaha 25HP Hero Campaign - Valid till 31.03.26` ·
`Yamaha 30 to 90HP Mid Range Campaign - Valid till 15.06.26` ·
`Yamaha Mega Sale Campaign - Valid 27/4/26 to 3/5/26` ·
`Yamaha Mega Sale Campaign - Valid 27/4/26 to 8/5/26` ·
`Yamaha 150HP Hero Campaign - Valid 15/6/26 to 15/7/26` ·
`Yamaha 115/130HP Hero Campaign - Valid till 15.08.26`
*(only the last one is actually applied — 57 cells)*

### 5.3 Trailers (`Trailer Module`)

**D — Supplier**: `Dunbier Marine Products` (231) · `Mayfair Marine 2000` (113) ·
`GFAB Trailers` (49) · `Telwater Pty Ltd` (37) · `Formosa` (24) ·
`Haines / Dunbier BMT Packages Only` (19)

**O — Trailer Plug**: `Factory Fitted` (432) · `7 Pin Plug Flat` (37) · `Factory` (4)

**BY — Rego Type**: `Large Trailers - Over 1.021t` (430) ·
`Small Trailers - Up to 1.02t` (43) · `Registration - NOT REQUIRED` (2)
→ **BZ Rego $**: `283` · `166` · `0`

**BB — PD Operation** (also the only reliable axle signal):
`PD Trailer - Tandem Axle Braked` (266) · `PD Trailer - Single, Axle Braked` (133) ·
`PD Trailer - Unbraked` (29) ·
`Pre Delivery - Check Over Factory Pre Delivery` (19) ·
`PD Trailer - Tandem Axle Braked (2,000kg & Above)` (16) ·
`PD Trailer - Tri Axle Braked` (10) · `Pre Delivery - NOT REQUIRED` (2)
→ **BC PD hrs**: `1.75` · `1.25` · `1` · `0.5` · `2` · `2.5` · `1.5` · `0`

**L — Winch**: `5:1 (2 Speed)` · `5:1` · `3:1` · `10:5:1` · `10:1 (3 Speed)` ·
`15:1 (3 Speed)`

**I — Wheel Size** — 28 "distinct" values for ~6 real ones. `13"` (101) vs `13”` (38),
`14"` (85) vs `14”` (64), `15”` (15) vs `15"` (2) differ **only by straight vs curly
quote**; plus four overlapping conventions mixing diameter, tyre width and stud
pattern: `13" 165`, `13"/165`, `13" 165/5P`, `13" 165/8P`.

### 5.4 Parts (`Parts Maintenance` / `Dealer Fit Module`)

**N — Install Type** — 148 values. Top of the list:
`Supply Only - Installation Not Required` (387) · `Propeller Installation` (320) ·
`Labour Estimated - (0.10)` (262) · `(0.25)` (245) · `(0.5)` (177) · `(0.05)` (136) ·
`(1.0)` (90) · `Head Unit Installation - Flush Mount` (73) ·
`Installation Only - Outboard Cowl Cover` (66) · `Labour Estimated - (0.75)` (64) ·
`Minn Kota Motor Installation` (61) ·
`Sounder Installation - Flush Mount + Transom Mnt Transducer` (56) …
⚠ two clashing conventions coexist: `Supply Only - Installation Not Required` and
`Installation Not Required`.

**Labour-estimate ladder** (the canonical TTF values, each with its own part code
`DFO_LAB_*`): `0.05` → $8 · `0.10` → $18 · `0.25` → $44 · `0.5` → $87 ·
`0.75` → $130 · `1.0` → $173 · `1.25` → $213, then 1.5, 2.0, 2.5, 3.0, 3.5, 4.0,
5.0, 6.0, 8.0.

**`Highfield`!F — Category** — the **only real category column in the whole MPF**:
`Console` (274) · `Spare parts` (265) · `Roll bar&Ladder` (150) · `Seat` (96) ·
`EVA Teak` (94) · `Cover` (47) · `Top` (36) · `EP` (34) · `Tow post` (20)

**`Dealer Fit Module`!F — Inflation**: `0` · `0.1` · `0.2`

### 5.5 Null sentinels — support the meaning, never the string

| Sentinel | Where | Means |
|---|---|---|
| `.` | tens of thousands of option slots; 4 category banners literally named `.` | deliberately empty slot |
| `0` (literal string) | every Dropdowns picklist where the source row is blank | nothing |
| `NR - ...` | `NR - ENGINE NOT REQUIRED` · `NR - RIGGING KIT NOT REQUIRED` · `NR - Propellor Not Required` *[sic]* · `NR - Not Required` · `NR - Tie Downs Not Required` | not required |
| `TRAILER NOT REQUIRED` | trailer slots — and it is also the header of the trailer picker, i.e. a **pseudo-brand** | not required |
| `TBA` | Engine Hole, Max HP | unknown |
| `#VALUE!` / `#N/A` / `#REF!` | 938 live errors in Parts, 131 in Motors, RB/RD/RF/RH/RJ + IQ in Boats | a broken formula, saved |

---

## 6. THE PRICE LADDER

This is the most valuable thing in the file. There are **four** ladders — boat hull,
boat pre-delivery, motor (×4 parallel audiences), trailer — plus a two-stage
part ladder. All of them share one convention: **GST is 10%, sell prices are
GST-inclusive, and margin is always computed on the ex-GST figure (`price ÷ 1.1`).**

### 6.1 Boat — cost build (`Boat Module` II..IY)

```
IM  Base Cost              supplier FOB, in the currency named in II
  + IN, IO  Factory Disc   (two columns)
  + IP  Boat Prep
  + IQ  Base Freight
  + IR  Documentation
  + IS  Fumigation
  + IT  Ocean Freight
  + IU  Fuel Surcharge     = IX * 5%
  + IV  Other Charges      = SUM(IM:IU) * IK        ← duty on the whole FOB stack
  ─────────────────────────
  ÷ IJ  EX Rate            = VLOOKUP(II,'[1]Exchange Rates'!$C:$ZZ,4,0)
  + IW  Other Chg $A       domestic handling
  + IX  Road Freight       = ROUNDUP(G * '[9]FCL Import - Highfield'!$I$35, -1) + 250|1100|2000
  ─────────────────────────
  = IY  LANDED HULL COST   =(SUM(IM:IV)/IJ)+IW+IX      ← AUD, ex-GST. 1,434 rows.
```

`IY` is the cost base for **every** margin in the boat module.

### 6.2 Boat — the hull price ladder (`QQ..RK`, band **"Hull Only Pricing"**)

| Col | Name | Means | Formula (the dominant shape) |
|---|---|---|---|
| QQ | *band label* | — | `=QQ$1` |
| **QR** | **Cash** | The RRP, GST-inclusive. **The anchor everything else derives from.** | `=ROUNDUP(((IY+(IY*JF))*1.1),-1)` — landed × (1 + hull markup) × GST, up to $10. Also seen: `ROUNDUP(IY*1.1*1.09,-1)`, `ROUNDUP(IY*1.25*1.1,-2)`, `ROUNDUP(IY*1.475*1.1,-1)` — **four different rules live simultaneously** |
| QS | Cash GP % | | `=((QR/1.1)-$IY)/(QR/1.1)` |
| **QT** | **Trade** | Dealer / trade price | `=ROUNDDOWN($QR-($QR*VLOOKUP($E,'[1]Price Matrix'!$C:$ZZ,11,0)),)` — Cash less the brand's **Trade %** (Price Matrix col 11). 235 rows use `=$QR` (no discount) |
| QU | Trade GP % | | as QS |
| **QV** | **Sub Dealer** | Price to a sub-dealer | `=ROUNDDOWN($QR-($QR*VLOOKUP($E,'[1]Price Matrix'!$C:$ZZ,10,0)),)` — Price Matrix col 10 |
| QW | Sub Dealer GP % | | |
| **QX** | **Sub (Exclusive)** | Sub-dealer on an exclusive territory | `=ROUNDDOWN(QV-(QV*2.5%),)` — a further 2.5% off Sub Dealer |
| QY | GP % | | |
| **QZ** | **AUS Sailing** | The Australian Sailing club programme | `=ROUNDDOWN($QR-($QR*15%),)` |
| RA | GP % | | |
| **RB** | **Warranty** | Warranty / replacement value | `=ROUNDUP((IY-IW)*1.01*1.1,)` — landed **less** domestic handling, +1%, +GST |
| RC | Warranty GP % | | ⚠ **defined two ways in one column**: 810 rows use `((RB/1.1)-($IY-$IW))/(RB/1.1)`, 622 rows use `((RB/1.1)-$IY)/(RB/1.1)` |
| RD/RF/RH/RJ | Spare 2..5 | pre-provisioned, currently `#VALUE!` | |

Worked, from `HBS113` (row 829): landed `25,010.00` → Cash `41,340` (GP 33.45 %) →
Trade `39,273` → Sub Dealer `34,105` → Sub (Exclusive) `33,252` →
AUS Sailing `33,072` → Warranty `27,453`.

**Markup inputs**, all keyed on `E` (Matrix = brand) into the external Price Matrix
by hard-coded ordinal:
col 10 = Sub Dealer % · col 11 = Trade % · col 12 = HO/BMT markup ·
col 13 = Factory Options markup · col 14 = Dealer Fit markup ·
col 16 = Warranty Adj · col 17 = Admin Load.

### 6.3 Boat — the pre-delivery ladder (`SV..UD`, three tiers)

```
UF Motor PD Labour        = VLOOKUP(KZ,'[4]Motor Library'!$C:$ZZ,28,0)
UG Motor Install Labour   = VLOOKUP(KZ,'[4]Motor Library'!$C:$ZZ,87,0)
UH Rigging Kit Labour     = VLOOKUP(LA,'[5]Rigging Kits'!$C:$ZZ,13,0)
UJ Total Engine Labour    = ROUNDUP(SUM(UF:UI),)

Tier 1 "Basic"      SX Est Hrs = $JN + $UJ            (boat PD hrs + engine labour)
                    SY Labour $ = SX * Labour Rate
                    TC Total CTD = ROUNDUP(SUM(SY:TB), -2)
                    TE GP $ = TF/1.1 - TC
                    TD GP % = TE / (TF/1.1)
                    TF Sell inc GST = ROUNDUP(TC * 1.25 * 1.1, -2)   ← 25 % then GST, up to $100
Tier 2 "Standard"   TJ = ROUNDUP(SX * 1.33, )     … identical chain → TR
Tier 3 "Complex"    TV = ROUNDUP(TJ * 1.33, )     … identical chain → UD
```

So the three tiers are **1× / 1.33× / 1.77×** the basic hour estimate.
`HBS113`: 29 hrs → $3,800 CTD → **$5,300**; 39 hrs → $5,100 → **$7,100**;
52 hrs → $6,800 → **$9,400**.

### 6.4 Motor — one cost ladder, four parallel price ladders

```
T  Store Price      MANUALLY KEYED from the Yamaha dealer PDF (yellow fill)
R  Dealer List      = T * 0.970874        (or = T, or = T - S)
S  Holdback 3%      = T - R
U  DIGS             = R * 0.0545458       ← a fixed 5.45458 % dealer inventory financing charge
V  Dealer Buy       = R - U
W  Freight          manually keyed (481 of 485 rows)
X  Landed CTD       = V + W
Z  Rebate Discount  = (BD * 75%) / 1.1    ← only 75 % of the factory rebate goes into cost
AA Nett CTD         = X - Z
AV Total PD         = AE+AG+AI+AK+AT+AU+AM+AO+AQ+AS
AX TOTAL CTD        = AA + AV
```

Then, off `AX`:

| Audience | Sell | Rule |
|---|---|---|
| **Retail** | `BF Sell Price` | `BB RRP = ROUNDUP(AX * 1.19 * 1.1, )` → `BC NSM Retail = ROUND(BB,)` → `BE Dealer Discount = BC - BD - BF`. ⚠ **BF is sometimes the driver and sometimes the result** — `=BB`, `=$BC`, and `=BC-BD-BE` all occur |
| **Trade** | `BL Trade Price` | `= ROUNDUP(($AX+($AX * '[3]Price Matrix'!$M$23)) * 1.1, )` — **one cell in another workbook sets every trade price** |
| **Commercial** | `BS Commercial Price` | `BQ Commercial Rebate = R * 5% * 1.1`; `BS = BC - BQ - BR` |
| **Boating Alliance** | `BY BA Price` | `BW = $BQ`, `BX = $BR`, `BY = $BC - BW - BX` — a **verbatim clone** of the Commercial ladder |

GP is always `= sell/1.1 - AX`; MU is always `= GP / AX`.

Worked, `Yamaha - F115XB` (row 90): Store `15,028.73` → Dealer List `14,591.00` →
DIGS `795.88` → Dealer Buy `13,795.13` → +Freight `180.41` → Landed `13,975.54` →
less rebate `1,568.18` → Nett `12,407.36` → +PD `90` → **Total CTD `12,497.36`** →
RRP/NSM Retail `19,048` → less factory rebate `2,300` and dealer discount `1,760`
→ **Sell `14,988`**; Trade `14,779`; Commercial / Boating Alliance `16,501.28`.

### 6.5 Motor — the service plan

```
UC 20-hr Labour   = $KQ * '[1]Labour Rates'!$H$9      ← RETAIL rate, not cost
UD 20-hr Parts    = $LX + $MD + $MJ                   ← only 3 of ~26 part blocks
UE 20-hr Sundry   = $LG + $LM + $LQ                   ← gear oil + engine oil + sundries
UF 20-hr Total    = ROUNDUP(SUM(UC:UE), )
WQ 6 Year Plan    = UF + UL + UR + UX + VD + VJ + VP   ← SEVEN events (20,100,200,300,400,500,600 hr)
WR Indexed        = ROUNDUP(WQ * (1 + 2.5%)^5, )       ← 2.5 % CPI compounded over 5 years
WT Per Month      = ROUNDUP(WR / WS, )                 ← WS = 72 on 411 of 413 rows
```

### 6.6 Trailer

```
AQ Nett Price     = AN - AO - AP          (Dealer − Discount − Settlement; AP = AN*5%)
AS Landed         = AQ + AR
BD PD $           = BC * Labour Rate      (BC from Operation Codes by BB)
BQ Total PD       = BD + BF + BH + BJ + BL + BN + BO + BP
BS TOTAL NETT CTD = AS + BQ                              ← the true cost
BV RRP            = ROUNDUP(BS * 1.19 * 1.1, -1)         224 rows
                  | ROUNDUP(BS * 1.25 * 1.1, -1)          24 rows
                  | VLOOKUP(E,'[4]Factory Options'!…,10)  24 rows
                  | = BV + 2078                            4 rows  ← hand-nudged
BW Sell           = BV                                   309 rows
                  | ROUNDUP(BV, -1)                        77
                  | ROUNDUP(BS * 1.15 * 1.1, -1)           36  ← bypasses RRP entirely
                  | ROUNDUP(BV * 1.04, -1)                   4
BU GP             = BW/1.1 - BS
BT MU %           = BU / BS
BZ Rego $         = VLOOKUP(BY,'[3]Registration Costs'!$C:$ZZ,9,0)
CA Sell inc Rego  = ROUNDUP(BW + BZ, )                   ← rego added AFTER sell, never marked up
```

**Five margin conventions coexist and no column records which one a row uses** —
it is buried in the formula text.

Worked, the SP560 trailer (row 143): Dealer `7,770` − Settlement `388.50` =
Nett `7,381.50` + Freight `20` = Landed `7,401.50` + PD `175.88` =
**Total Nett CTD `7,577.38`** → MU 25.13 % → GP `1,904.44` → RRP/Sell **`10,430`**
→ + Rego `283` = **`10,713`**.

⚠ The `Trailer Spec Enquiry` quote card computes a **different** cost base:
`Q11 Admin Load = M7/1.1*0.02` (2 % of ex-GST sell) and `Q12 Total CTD = Landed + PD
+ Admin`. The data sheet's `BS` omits the admin load, so the two disagree on the
cost of the same trailer. The card also labels `Q14 = Q13/Q12` **"GP Margin"** when
the identical ratio on the data sheet is correctly called **"MU %"**.

### 6.7 Part — two stages

```
SUPPLIED                                 FITTED
G  P&A cost (ex GST)                     O  TTF hrs   = VLOOKUP(N,'[2]Operation Codes'!…,3,0)
H  Landing MU  ← per-SUPPLIER, from      P  Labour $  = O * Labour Rates!$G$14   (COST rate)
   '[1]Price Matrix' col 7               R  Sundry CTD = 4 sundry buckets off the operation
I  CTD = G + (G*H)                       S  Total CTD = SUM(P:R)
L  Sell inc GST                          V  Parts = L
   = ROUNDDOWN(XLOOKUP(E,'Revolution PL'!F:F, O:O),)   W  Sundry = ROUNDUP(R*1.2*1.1,)
   | ROUNDUP(G*1.2*1.1,-1) | ROUNDUP(G*2.1*1.1,0)      X  Labour = O * Labour Rates!$H$9  (RETAIL rate)
K  GP = L/1.1 - I                        Y  SELL INC INSTALL = ROUNDDOWN(SUM(V:X),)
J  MU = K / I                            U  GP = Y/1.1 - S      T  MU = U/S
```

⚠ Sundry is marked up **×1.2** in `Parts Maintenance!W` but **×1.25** in
`Dealer Fit Module!R`. The two modules disagree on the same rule.

### 6.8 Dealer-fit bundle

```
E  CTD          = sum of all 30 slot CTDs
I  Parts Sell   = sum of all 30 slot Sells
J  Total Lab    = sum of all 30 slot Lab Hrs
M  Sundry       = sum of all 30 slot Sundries
N  Sublet       = sum of all 30 slot Sublets
G  Adj CTD      = E * F(inflation)      H = E + G
K  Labour CTD   = J * Labour Rates!$G$14
L  Labour Ret   = J * Labour Rates!$H$9
O  ACT CTD      = H + K + M + N
R  ACT SELL     = ROUNDUP( I + L + (((M + N) * 1.25) * 1.1), )
Q  GP = R/1.1 - O      P  MU = Q/O
```

### 6.9 Highfield supplier FX ladder (`Parts Module`!`Highfield`)

```
G1  Exchange Rate = '[1]Exchange Rates'!$F$12 = 0.7
H   AUD           = G(USD) / $G$1
P   Retail inc GST = ROUNDUP(H * 1.5 * 1.1, -1)
L   Trade inc GST  = P - (P * 20%)
```

### 6.10 The constants worth naming

| Constant | Value | Where |
|---|---|---|
| GST | ×1.1 / ÷1.1 | everywhere, hardcoded |
| Labour cost rate | **$130.0909 / hr** | `'[Service]Labour Rates'!$G$14` |
| Labour retail rate | ≈ **$159 / hr** | `'[Service]Labour Rates'!$H$9` |
| Boat PD tier step | ×1.33 | Boat!TJ, TV |
| Boat PD margin | ×1.25 then GST, round up $100 | Boat!TF |
| Boat default hull markup | ×1.19 then GST (motors, trailers) | Motor!BB, Trailer!BV |
| Motor DIGS | 5.45458 % of Dealer List | Motor!U |
| Motor holdback | 3 % | Motor!S |
| Motor rebate take-up | 75 % of the factory rebate | Motor!Z |
| Trailer settlement | 5 % of Dealer | Trailer!AP |
| Sub (Exclusive) step | −2.5 % off Sub Dealer | Boat!QX |
| AUS Sailing | −15 % off Cash | Boat!QZ |
| Service plan CPI | 2.5 % compounded over 5 years | Motor!WR |
| Service plan term | 72 payments | Motor!WS |

---

## 7. FITMENT

**There is no fitment table, no compatibility matrix and no fitment rule anywhere in
the Master Price File.** A full shared-strings scan of the Motor Module returns
**zero** hits for `max hp`, `rated hp`, `transom`, `fitment`, `compatib`,
`envelope`, `min hp`, `boat model`, `approved`.

Everything below is what exists instead.

### 7.1 Boat ↔ Motor — a hand-curated 13-slot menu on the boat row

The boat row carries `Motor Option 1..13`, each a 5-column group
`Motor Option · Rigging Kit Option · Prop Part No. · Prop Description · Engine Hole`
(cols KZ..LD, LF..LJ, … NT..NX). Unused slots hold `NR - ENGINE NOT REQUIRED` /
`NR - RIGGING KIT NOT REQUIRED` / `Prop Not Required`.

The join is `'[4]Motor Library'!$C` — **the motor's display-name sentence**.
The dependent columns are pulled by hard-coded ordinal:
col 28 = motor PD labour, col 87 = install labour, col 103 = rigging kit,
col 200 = prop description; the prop part number then comes from
`'[3]Parts Maintenance'!$C:$ZZ` col 3 keyed on the prop *description*.

Alongside it, the boat carries an **HP envelope that nothing enforces**:
`KV Min HP` / `KW Max HP` / `KX Shaft Lgth` / `KY Eng Configuration`. These are
**total installed HP**, not per-engine (`SP800` reads `250 HP` → `350 / 2 x 200 HP`).
Nothing in the workbook compares a motor's HP to them.

The second mechanism is the Motor Module's own: rows 343–628 are literal
boat+motor rows (`SIG 525F w Yamaha - F115XB`), one per legal pairing, inheriting
their spec by absolute row anchor (`=E$90`). **There is no Highfield row and no
"560" anywhere in the Motor Module** — Highfield pairings come only off the
unconstrained flat picker in the hidden `Dropdowns` sheet.

### 7.2 Boat ↔ Trailer — two competing mechanisms, no key

**A. Generic fit by length band.** Volume series bake a boat length into the code and
into `Trailer!H "Boat Size (Mtr)"`: `MLKR5000-13-M` = 5000 mm boat, 13" wheel,
braked; `ALP 5.3M-13B` = 5.3 m. The dealer picks the row whose `H` band contains the
hull length and whose `ATM` exceeds boat + motor + fuel + tare — **by eye**.

**B. Named-boat custom build.** For boats NSM actually sells there is a dedicated
**series per boat brand**, one row per boat model:
`REDCO - Highfield`, `REDCO - Surtees`, `REDCO - Stabicraft Alloy`,
`REDCO - Merry Fisher`, `REDCO - Cap Camarat`, `REDCO - Formosa`,
`GFAB - Highfield Series`, `DUNBIER / HAINES BMT`.

The link is a **human-readable boat model string** in `H` / `C` / `F`
(`Highfield 560`, `SP600`, `Formosa 495`, `CC 5.5`, `MF 605`) — and in the same
column, bare Stabicraft **model numbers** (`1450`, `2050`) that parse as
1,450 metres. There is no foreign key.

The boat row's own `NZ Std Trailer` cell holds the trailer's **name string**, mirrored
positionally from `'[7]Trailer Module'` — so a row insertion in the Trailer Module
re-points it.

### 7.3 Product ↔ Part — four mechanisms, none queryable

1. **By positional band.** `Dealer Fit Module` rows 905–2031: a banner names the
   boat model and the rows beneath are that model's pre-delivery pack —
   `HIGHFIELD - Sport 560` (r1598) over rows 1599–1613. Their `Code` and `Lab Hrs`
   come from `VLOOKUP($C,'[7]Boat Module'!$C:$AAN,271|272,0)`.
2. **By motor.** Rows ~724–844 under `PRE DELIVERY & ENGINE INSTALLATIONS`, joined
   to `'[6]Motor Library'!$C` at ordinals 25/54/56/98/99/100/153/155/200.
3. **By model name embedded in free text.** `Roll Bar - SP560/600/660 & PA540/600/660`,
   `Stern Mesh Shade - SP560/600`, `Boat Cover - SP520/560`,
   `Ladder for SP560-SP760 platform`. **A slash list inside a description is the
   only record that one part fits several models** — and `SP520-560`, `SP560/600`
   and `SP560-SP760` are three notations for the same idea.
4. **By physical dimension instead of model.** The whole Tube Cover family is keyed
   on tube length in metres and hull material — `IBC-TCPVC - 5.6 Mtr` /
   `IBC-TCHYP - 5.6 Mtr` — leaving the boat → length mapping in someone's head.

Trailers get **no** part fitment at all.

### 7.4 What our join table + rule engine must express

| Requirement | Evidence it is needed |
|---|---|
| **A real many-to-many join row** `{ source, match, slot, recommended, note, source: Rule\|Manual }` | 13 fixed motor slots × 2,006 boats, padded with sentinels |
| **Extra columns ON the pairing** — rigging kit, prop part no, prop description, engine hole | The motor slot is 5 columns, not 1. These belong to the *pairing*, not to either side |
| **A numeric envelope rule** `Motor.HP between Boat.Min HP and Boat.Max HP` | The columns exist (`KV`/`KW`); nothing enforces them |
| **`Engine Count` so the envelope is comparable** | `Max HP` reads `350 / 2 x 200 HP`; per-engine vs total is the classic mis-comparison |
| **Shaft and control clauses** `Motor.Shaft = Boat.Shaft Lgth` and `Motor.Control ~ Boat.Eng Configuration` | `KX`/`KY` on the boat, `F`/`J` on the motor — never compared today |
| **A capacity rule for trailers** `Trailer.ATM ≥ Boat.Boat Weight + Motor.Weight + fuel + Trailer.Tare` | The dealer does this arithmetic in their head |
| **A hull-length rule** `Trailer.Boat Size ≥ Boat.OA Length` | Blocked today because `Boat Size` holds four kinds of value |
| **Manual override that is visible** — the `Source: Manual` column | The RIB needs the custom row's keel-roller geometry; a pure length match is *not* sufficient evidence of fit. The custom row exists precisely because the rule is not enough |
| **"Empty means unrestricted"** | Adopted from production; the alternative is ticking 640 boxes |
| **Rules fail OPEN** | A blank spec must never silently hide a product |

Concretely, for the Sport 560 our fitment table replaces:
15 boat rows × 4 real motor slots = 60 motor pairings (today: 60 free-text cells
plus 180 dependent lookup cells), 1 trailer pairing, and 4 dealer-fit lines.

---

## 8. PAIN — ranked by what our tool most helps

### 1. Every join is a free-text sentence (⭑ the biggest)
`Motor Library!C` = `Yamaha - F115XB` is the primary key of the whole ecosystem.
`Parts Maintenance!C` (a description) resolves ~50,000 slot lookups in the Dealer
Fit Module. `Motor!CI` joins on `Install Motor (5.0) - Excludes Rigging Kit
Installation` — a sentence with the hours inside it. Case and spelling drift is
already live: `PROPELLER` (2,065) / `Propeller` (964) / `Propellor` (247, misspelt) /
`PROPELLERS` (8); `PROPELLERS (Twin Rig)` (20) vs `(Twin Rigs)` (42); two Control
values carry **trailing spaces**; `TotalTilt` vs `TotalTiltTM`.
**Our fix:** `reference` fields. Rename a row, every link follows.

### 2. Colour is data
Whole-row amber `FFFFC000` across Boat rows 1006–2301 is the **only**
machine-readable marker that ~1,000 SKUs are retired. Red `FFFF0000` marks the
divider row 1005 (`OBSOLETE MODELS (Models that ar No Longer Available)` *[sic]*).
Yellow `FFFFFF00` marks brand headers, and in the Parts Module marks 923 problem
cells. Green `FF92D050` in Parts marks 2,934 **manually-overridden** cells
(998 on Sell, 995 on Supplier Description, 941 on cost). Cyan `FF00B0F0` on
`Motor!BF` marks the number the salesperson works to. `gray0625` marks unusable
option slots. Font colour distinguishes discounts (red), cost adders (blue) and
lookup-derived values (green).
**Our fix:** a `Status` column, an `Override` flag, real column sections.

### 3. Repeating column groups instead of child rows
Boat: 51 inclusions + 166 factory options + 13 motor slots × 5 + 10 trailer slots +
42 dealer-fit + 30 paint options + 50 + 30 checklist lines = **674 columns for
2,006 records**. Motors: 50 rigging + 100 prop + 25 FO slots (**482 cells, 3 distinct
values**) + 8 pre-provisioned empty part blocks. Trailers: 21 features + 20 option
groups × 4 + 20 dealer-fit = 385 columns, of which options 11–20 are 100 % empty and
~60 columns (GT..IV) are entirely empty. Parts: 30 × 8 columns.
Adding a 31st accessory line means adding 9 columns **and editing five 30-term SUM
formulas**.

### 4. The same columns mean different things per brand
Nine header rows re-label one Boat grid. `I` = "Depth (Mtr)" for Stacer but
"Tube Dia." for Highfield. `K/L/M` = "LOA inc Engine / LOA on Trailer / HOT" vs
"Int Length / Int Width / Deadrise". `P/Q` = "Hull Weight / BMT Weight" vs
"Max Load / Max People". `S/T/U` = plate thicknesses vs "Boat Weight / Air Chambers".
Column `T` alone holds air-chamber counts, plate thicknesses (`1.60mm`) *and* berth
counts — 27 values in one column.

### 5. Units live inside values, inconsistently, in the same column
`"52 cm"` vs `"43cm"`; `"1,188 kg"`; `"105 ltr"` vs `"105 L"`; `"24 deg"` vs
`"20 Deg"`; `"90 HP"` vs `"90HP"` vs `"2 x 300 HP"` vs `"425 / 2 x 300 HP"` vs
`"TBA"` vs `"Battery"` vs `"10.8kWh LifePo4"`.
**Live, in our own seed data:** `Boat!K` reads `"382 cm"` on SP520/SP560 but
`"4.75 m"` on SP600/SP660 — *the same column, two units, adjacent rows*.
And `Trailer!N` is headed `Trailer Length (Mtr)` while holding `4430`, `4700`,
`8700` — millimetres.

### 6. Manual override at scale, invisible except by fill colour
Parts: `Install Type` 2,961 hardcoded vs **2** formulas; `MU` 1,508 vs 1,418;
`Sell` 1,256 vs 1,721; cost 1,245 vs 1,719. Motors: Freight manual on 481 of 485;
Store Price manual on 294 of 485. Boats: **the largest brand's retail prices are no
longer computed from cost at all** — live Highfield has Base Cost 588/588 formula
but Cash/Trade/Sub Dealer/Sub Exclusive/AUS Sailing **576/588 hardcoded**. Haines
Signature is 9/9 hardcoded. Stabicraft/Surtees/Formosa/Merry Fisher are fully
formula-driven. The "system" behaves differently brand by brand.

### 7. Magic numbers across file boundaries
Whole-column VLOOKUPs into ten SharePoint workbooks addressed as `[1]`..`[10]` with
hard-coded ordinals — Price Matrix 10, 11, 12, 13, 14, 16, 17; Motor Library 28, 87,
103, 200; Parts Maintenance 3; Rigging Kits 13; Boat Module 271, 272, 278–281 — plus
absolute single cells `'[2]Labour Rates'!$G$14`, `'[9]FCL Import - Highfield'!$I$35`,
`'[3]Price Matrix'!$M$23`. **Inserting one column in any of those files silently
corrupts pricing everywhere.** Several columns (Motor Option, Trailer, P/D Parts) are
*positional mirrors* (`='[4]Motor Library'!$C${row}`) that break on any reorder.

### 8. The same product exists twice with different numbers
Sport 560 lives at rows 829–844 (live) **and** 1534–1548 (obsolete) under the
identical Model Codes `HBS113`–`HBS128`, with different Base Cost
(16,611 / 19,580 vs 15,500 / 18,261), Landed (25,010 / 29,251 vs 24,098 / 28,042),
**Cash (41,340 / 48,350 vs 42,530 / 49,490 — the obsolete copy is HIGHER)**,
Other Chg $A (300 vs 975), markups (0.50/0.50 vs 0.45/0.475), Boat PD (18 hrs vs
2 hrs), handover (2 vs 1), PD code (`HIG_PD_SP560` vs `9HI_HBS113_PD`), and an
entirely different factory-option namespace. **Model Code is not a primary key.**

### 9. Duplicate keys everywhere
2 duplicate trailer names and 13 duplicate trailer codes; 26 duplicate part
descriptions; 16 duplicate motor display names; `HBS113`–`HBS128` duplicated
current/obsolete. Every one silently resolves to the first VLOOKUP match.

### 10. Anchor-reference epidemic (Motor Module)
29,322 formulas are bare `=X$<row>` absolute-row anchors. Donor row 253 fans out to
3,656 cells; r137 and r139 to 1,736 each. Entire service specifications are cloned by
pointing at a neighbour rather than keying on `Schedule Group` — **even though that
column exists and does exactly that job for 161 rows.**

### 11. Hand-typed price arithmetic
78 formulas in the Motor Module contain **only literals** — `T345 = 61107-6310`,
`BB345 = 79317-8190`. Every Haines Signature powerplant price is
(boat-with-motor RRP) − (bare-boat RRP), typed by hand. When either boat price moves,
nothing recalculates. Trailers have `=AN+1601`, `=AN+1180`, `=BV+2078`, `=7045+280`
and 11 rows whose Freight is a self-reference `=AR{r}`.

### 12. Live errors saved in the file
Parts: **938** (`#N/A` ×933, `#VALUE!` ×5) — 414 in Supplier Description, and
because `Sell inc Install` is a SUM, 27 quoted fitted prices compute nothing.
Dealer Fit: **968** more — **45 bundles currently have no sell price**.
Motors: **131** — the `10 Year / 1,000 Hour Service` Parts and Total are `#N/A` on
**26 motors**, poisoning any service-plan quote built on them.
Boats: `RB/RD/RF/RH/RJ` `#VALUE!` on obsolete rows; `IQ Base Freight` `#REF!`.

### 13. Broken derived keys
`AC345 = "PD_YAM_"&D345` with `D345` empty evaluates to the literal string
`"PD_YAM_"`. **40 Haines rows have an empty col D, so their PD codes are all
dangling prefixes.** Three operation-code conventions coexist in one column:
`YAM_PD_*` (from Schedule Group), `PD_YAM_*` and `PD_MER_*` (from model code).
Codes carry leading spaces: `" 9HI_HBS 129_PD"`, `" 9HS_Sports Fisher 640SF CC_PD"`.

### 14. The rego band is typed, not derived
`Trailer!BY` is hand-keyed. **9 rows violate the ATM 1.02 t rule** (r60, r61,
r224–227, r398, r401, r403) and **7 of them undercharge registration by $117 each**.
Deriving `BY` from `K` fixes all nine. The band labels also leave the interval
(1020, 1021) undefined.

### 15. Picker lists have drifted out of sync
The Trailer flat picker holds 298 entries but **215 data rows are missing from it** —
including *entire live series*: all 32 Mackay PU 2020, all 28 MLKR Wide Body, all 26
Aluminium AL, all 19 MLJ, all 13 OffRoad KR, all 16 Haines BMT. A salesperson
literally cannot select those trailers. The Boat Module's picklist layer is 992
individual cell formulas mirroring column C, so **any row insertion shifts a picklist
by one** and blank rows surface as literal `"0"` options.

### 16. Half-migrated data
The live Highfield block lost its taxonomy (no Series or Model rows), replaced 21
curated standard-inclusion lines with **one raw supplier blob in column X**, and
replaced 17 grouped `HFI-*` factory-option codes with **3 raw supplier codes**. Two
naming conventions coexist: `Highfield - SP560 (PVC) W-W-WB` (live) vs
`Sport - SP560 PVC - W-W-WB` (obsolete).

### 17. Stale and mixed-vintage data with no expiry mechanism
Rebate campaigns that expired in 2025 sit beside live ones because **validity is
inside the label string**. `Yamaha_Dealer_Current` says `EFFECTIVE 1 Jul 2024` in A1
and `EFFECTIVE 30 Jan 2024` in A2. Parts category banners carry as-at dates ranging
from **26/6/18** (FURUNO) and 27/9/2022 to 5.08.2026. Four overlapping BLA price
lists and two GME lists coexist.

### 18. Humans navigate by counting columns
`Boat Module` row 2 is a hand-maintained `Check Code Referance` *[sic]* of column
ordinals 2..618 — running **54 columns past the last real data column**.
`Trailer Module` row 3 and `Motor Library` rows 1–2 do the same. The Trailer quote
card addresses the data sheet by **VLOOKUP column index against those ordinals**:
insert one column and every quote silently returns the wrong field.

### 19. Typos baked into reference data
`Models that ar No Longer Available` · `Total Enginge Labour Allowance` ·
`Hull: Grey / Tube: Miltary` (a distinct enum value alongside `Military`) ·
`NR - Propellor Not Required` · `Check Code Referance` · `GME ELECTORNICS` ·
`YAMAHA SERVICE ITIEMS` · `4-Stoke Outboards` · `AUTOPILTOS` · `Maneauverability` ·
`Gimball Mount` · `lvory` · `Axel` (throughout the Trailer Module) ·
`### OBSELETE MODEL LIST ###` · `Was the trailer previously registed` ·
`Fire Extingusher?` · `EXTENTION`.

### 20. A 32-field compliance form with nowhere to live
`Trailer Module` KE..NU — VIN, vehicle plate, GTM, axle rating, tow-ball rating,
tyre ply/load rating, VSB1 compliance, dimension checks — 32 headers in row 1 and
**zero data on any row**. The business has specified these fields and has no table
for them. This is a feature request written in a spreadsheet.

---

## 9. RISKS — where our model breaks against this real data

**R1 — Our hierarchy assumes the group rows exist. In the live data they do not.**
588 Highfield SKUs sit flat under one section row. Series and Model must be
*derivable* (from the name string or the code prefix) and *editable*, and our
importer must offer the derivation as a **preview**, never an automatic assignment
(prefix `HBP` covers both Patrol and Coaster; `Coaster 600 ST` uses the one-off
prefix `HB600`).

**R2 — Ragged depth.** Highfield explodes to 7–15 variants per model; Stacer,
Stabicraft, Surtees, Haines and Formosa have exactly one. `ADV9` has 5 named
colourways with no material split at all (`Highfield - ADV9 (Dune)`). A renderer
that always draws a group row will produce single-child groups everywhere.
**Mitigation:** optional levels; collapse a one-value level into its parent;
render a childless group as a leaf row and *mark* it.

**R3 — Level values are not clean identifiers.**
`SP700WL(Windlass)`, `PA540 Open`, `RU250 Easy Go`, `HBS15##` (a live Model Code
containing literal hash characters, row 876), `" 9HI_HBS 129_PD"` (leading space,
internal space). Group on a normalised key; display the raw value; surface a
"these look like the same group" hint rather than silently merging.

**R4 — `number` columns will reject the real values.** `"52 cm"`, `"1,188 kg"`,
`"105 ltr"`, `"24 deg"`, `"90 HP"`, `"350 / 2 x 200 HP"`, `"2 x 300HP"`, `"TBA"`,
`"Battery"`, `"10.8kWh LifePo4"`, `"1450 Exp"`, `#N/A`, `#VALUE!`.
**Mitigation:** quarantine, do not coerce. Show the raw value, mark the cell, offer
the parse. Our demo stores parsed numbers *and* keeps the raw string where the two
differ.

**R5 — Duplicate natural keys break any upsert.** `HBS113`–`HBS128` exist twice
(current + obsolete) with different prices; 13 duplicate trailer codes; 26 duplicate
part descriptions; 16 duplicate motor names. **Composite keys from day one**
(`Model Code + Status`, `Supplier + Code`), and a duplicate indicator that shows the
*conflicting rows* rather than refusing the edit.

**R6 — `Price` as one number is wrong by an order of magnitude.** The boat carries
**eleven** price columns plus three PD sell tiers; the motor carries **four
parallel audience ladders**; the trailer carries RRP *and* Sell *and* Sell inc Rego;
the part carries supplied Sell *and* Sell inc Install. Never ship a bare `Price`.

**R7 — Percentages are stored as fractions and displayed as percents, inconsistently.**
`JF = 0.5` is 50 %; `QS = 0.3345` is 33.45 %; `BT` is a *markup* on cost while
`Q14` on the trailer quote card calls the identical ratio a "GP Margin". Declare
which base each ratio uses.

**R8 — Sections as "run of consecutive columns sharing an id" holds, but the real
sheets separate bands with a BLANK SPACER COLUMN.** On import we must consume the
spacer as a section boundary and then *drop* it, not import 40 empty columns.

**R9 — Scale.** 2,006 boats × 674 columns; 2,948 parts; 1,871 bundles × 293 columns;
491 motors × 651 columns; 477 trailers × 385 columns. Row **and column**
virtualisation, collapsed-by-default sections, and a full-screen table view are
prerequisites, not polish.

**R10 — Options attach at four grains and one of them is a matrix.** Material ×
colourway selects a *different row with a different price* (grain 1); factory options
attach to the model (grain 2); the curated motor/trailer/dealer-fit menus attach to
the variant (grain 3); and per-colourway option availability (the console ↔ seat
colourway match) is a matrix (grain 4). **Model grains 2 and 3; declare grain 4 out
of scope explicitly.** Half-supporting it is how the production app earned two
repair scripts.

**R11 — `reference` as a hierarchy level is a real code change**, not a one-liner:
group-row rendering (resolve the label), row pre-fill (write the id), CSV export
(emit the label), sort/filter (sort by label).

**R12 — Cross-table inheritance exists in the wild.** Cap Camarat is priced through
the Merry Fisher matrix row (shared Jeanneau franchise). We have no concept of a
level inheriting from a peer. Note it as a known limit.

**R13 — The source disagrees with itself and we must not silently fix it.**
SP600 and SP660 carry *identical* dimensions in the live sheet (both `6.52` m OA,
`2.59` m beam, `740 kg`) with different prices. Our seed keeps the cells as they are
and flags the conflict; an importer that "corrects" this would be inventing data.

---

## 10. DISAGREEMENTS WITH `HELMLOGIC_GROUND_TRUTH.md`

That document surveyed the production app. Where it differs from the workbooks, the
workbooks win.

| It says | The workbooks say |
|---|---|
| Boats: `Brand ▸ Range ▸ Model ▸ Variant`, business word **"Range"** | The business word is **"Series"** for Highfield, Stabicraft, Surtees, Haines and every trailer brand. Only Stacer writes range-like plural names. **Rename the default level to Series.** |
| Motors: *"flat per-vendor lists with no range layer"* | Correct that there is no Range **column**, but there are 14 real **series banner rows** (`Four Stroke Models`, `XTO Offshore`, `VMAX SHO`, `EPROPULSION`, six twin/triple-rig groups). Offer `Brand ▸ Series ▸ Model` as a real structure with Series optional. |
| Motors have `Warranty` (`2+2`) as a column | No warranty column exists in the Motor Library. Drop it. |
| Highfield ranges = 7, models 85, variants 640 | Live block: 588 Highfield SKUs, 67 inferable model tokens, 7 series prefixes. Close, but the live block has **no range or model rows at all**. |
| Trailer spec object `{boatSizeMtr, wheelSize, tareKg, atmKg, winch, betweenGuardsMm, lengthMtr, plug}` | Confirmed, all eight exist — but `lengthMtr` is **millimetres** and `boatSizeMtr` holds four different kinds of value including boat model names. |
| Trailer `Axles` is a select `Single/Tandem/Tri` | Correct as a *target*, but there is **no axle column at all** today; it must be derived from `PD Operation`, and that derivation **contradicts the trailer's own name on 10+ rows**. |
| Price ladder `Trade = Cash × 0.95 · Sub Dealer = Cash × 0.825 · Sub (Excl) ≈ Sub Dealer × 0.975 · AUS Sailing = Cash × 0.80 · Warranty ≈ Landed × 1.065` | The **shapes** are right and the Sub-Exclusive 2.5 % step is exact. But Trade and Sub Dealer percentages are **not constants** — they are per-brand lookups into Price Matrix cols 11 and 10. AUS Sailing is **15 %**, not 20 %. Warranty is `(Landed − Other Chg $A) × 1.01 × 1.1`. |
| Factory option categories: `Consoles · Seats · Rigging · Covers · EVA Teak · Tops · Hardware · Accessories · Electronics` | The raw, real column (`Parts Module`!`Highfield`!F) is `Console · Spare parts · Roll bar&Ladder · Seat · EVA Teak · Cover · Top · EP · Tow post`. The nine-value normalised list is a derivation, not source data. |
| Currency is *"per brand and implicit"* | It is **explicit** — `Boat!II Currency` is a real column with real values, and `Boat!IJ EX Rate` is looked up from it. Highfield is `USD` at `0.7`. |
| `In Stock` on accessories | No inventory in these workbooks. Drop it. |
| Motor `Control` typed on only 11 of 224 rows | In the workbook it is typed on **372 of 491**. The production app lost it in import. |

---

## Appendix — the four sentences to keep in front of us

1. The primary key of a $50 m catalogue is the sentence `Yamaha - F115XB`.
2. The only machine-readable record that 1,000 boats are discontinued is that
   their rows are amber.
3. Row 2 of the boat sheet is a hand-typed count of the columns, and it runs
   54 columns past the data.
4. The Trailer Module contains a 32-field vehicle-compliance form with a header
   row and no data — the business wrote its own feature request into the sheet.
