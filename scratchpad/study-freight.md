# THE FREIGHT MODULE — one number, and a printout

> Read-only study of `C:/Users/AsafA/Downloads/Freight Module.xlsx`
> (33,538 bytes, created **2025-02-26T23:44:40Z**, last saved
> **2026-08-05T06:17:35Z** by **Colin Kean**, last printed **2026-08-05T06:05:59Z**).
> Nothing was written, moved or renamed. Every figure below carries its cell.
>
> **ASSERTED** = a formula, a validation, a stated header, a rate typed into a rate
> table. **OBSERVED** = a pattern in the values, always with a count.
> The word *usually* does not appear as a finding.
>
> Comparison data comes from read-only extracts of `Boat Module (5).xlsx`
> (`Boat Module` sheet, rows 1–2301, columns C, D, E, G, II, IJ, IQ, IT, IU, IV,
> IW, IX, IY, taken twice — once `data_only=False` for formulas, once
> `data_only=True` for cached values) and from the raw `externalLink*.xml` parts
> of four Boat Module snapshots.

---

## 0. THE VERDICT, FIRST

**EMBEDDED — and it is already embedded. Nothing new is added.**

Freight on a boat is already two columns inside the boat table, inside the
**Cost Build** section, and both are already seeded:
`src/types/model.ts:315` (`Road Freight`, `section: 'cost-build'`) and the nine
per-brand boat tables in `src/demos/northside.ts` (`iq` and `ix` on every one).
This workbook does not add a column. It adds **one scalar** behind one of them.

That scalar is a **SETTING** — §6 says where it goes and what it must be called.

The **Freight Distribution Calculator** sheet is **LEAVE**. §4 gives the receipt:
its computed output matches the Boat Module value on **0 of 6** units, while the
Boat Module value appears verbatim *inside* it on **3 of 6**. Data flows into it,
not out of it. It is a printout — it even carries a `Print_Area` named range
(`docProps/app.xml`, the workbook's only named range) and was printed twelve
minutes before it was last saved.

Score against the two tests the owner set:

| Test | Answer |
|---|---|
| **Ease of use** — does a human sit down and maintain a list of these? | **No.** The whole workbook resolves to one number that changed zero times across four Boat Module snapshots spanning six months. A 22nd table for one number is the exact tax the owner is objecting to. |
| **Customisation** — would another dealer have a different version? | **Yes, sharply.** A furniture dealer has no linear-metre container rate at all. So the number cannot be a constant in our source — but a per-brand *field* an admin edits satisfies that without a table. |

---

## 1. THE WORKBOOK AT A GLANCE

Three sheets, one external link out, one named range.

| # | Sheet | Live range | What it is |
|---|---|---|---|
| 1 | **Freight Distribution Calculator** | `B3:I67` (declared `A1:I106`) | one shipping container, split across the boats inside it |
| 2 | **FCL Import - Highfield** | `B1:K35` (declared `B1:K47`) | one freight forwarder's quote for one container from China, reduced to a per-metre rate |
| 3 | **Quadrant Pacific - Surtees** | `B1:K36` (declared `B1:K47`) | the same shape, for one container from New Zealand |

**ASSERTED — the one external link.**
`xl/externalLinks/_rels/externalLink1.xml.rels` targets
`…/Master Price File/Price Matrix.xlsx`. It reaches into exactly two cells of
that workbook's `Exchange Rates` sheet:

```
'[1]Exchange Rates'!$F$11 = 1.2   NZ    (Price Matrix!Exchange Rates C11/F11, review date 2025-11-10)
'[1]Exchange Rates'!$F$12 = 0.7   USD   (Price Matrix!Exchange Rates C12/F12, review date 2025-06-11)
```

Both carry the note `As per discussion with MM 12.05.2026` (`Exchange Rates!H11`,
`!H12`). So the Freight Module's only input is the FX table, and the FX table's
only provenance is a remembered conversation. That is a Price Matrix problem, not
a freight problem — but the freight rate inherits it.

**Nothing else in the Master Price File reaches into this workbook except the
Boat Module.** Verified across every `.xlsx` in Downloads under 45 MB by reading
each one's `externalLinks/_rels`: four files link here, and they are four
snapshots of the same file.

---

## 2. SHEETS 2 AND 3 — TWO CONTAINERS, TWO RATES

Both sheets are the same instrument: take one forwarder's invoice for one
40-foot container, total it, add a buffer, divide by the linear metres of boat
that fit in it, and publish a **dollars per hull metre**.

### 2.1 FCL Import - Highfield — ASSERTED, cell by cell

`C2` — *AWW Global Logistics (Highfield Inflatables)*. `C5/D5` contact
*Julie Neoh*. `C6/D6` quote date **2026-02-28**. `C7/D7` shipment **S00169820**.
Origin port **Qingdao** (`C9`).

| Rung | Cell | Formula / value | Result |
|---|---|---|---|
| Seafreight 40' inc LSS | `I10` | `5382.28` typed, `$A` | 5,382.28 |
| — its `$US` figure | `F10` | `=I10*H10`, `H10 = '[1]Exchange Rates'!$F$12` | 3,767.60 |
| Seafreight sub-total | `I12` | `=SUM(I10:I11)` | 5,382.28 |
| 11 Australian local charges | `I15:I25` | each `=F*G` — port 870, delivery order 75, CMR/EDI 35, dest. doc 110, port infrastructure 620, cartage (Boondall) 550, delivery fuel surcharge 170.50, dehire 196, road tolls 50, customs clearance 135, quarantine entry 40 | |
| Local sub-total | `I29` | `=SUM(I15:I28)` | 2,851.50 |
| **Seafreight estimate total** | `I31` | `=I29+I12` | 8,233.78 |
| **Freight buffer** | `D32` / `I32` | `0.1` / `=I31*D32` | 823.38 |
| **Seafreight CTD** | `I34` | `=I31+I32` | 9,057.158 |
| **Linear metres in the sample container** | `H35` | `70.5` typed | |
| **THE NUMBER** | `I35` | `=I34/H35`, labelled *"Highfield per Mtr Conversion from Sample Container in Linear Mtrs"* | **128.47032624113476** |

**ASSERTED anomaly — the currency arrow points backwards.** Column `E10` is
labelled `$US`, but `F10` (the US figure) is *derived from* `I10` (the AUD
figure), not the other way round. The AUD is the input; the USD is decoration.
The Surtees sheet does it correctly (`I10 = F10/H10`). Worth knowing before
anyone rebuilds this: on the Highfield sheet, changing the exchange rate changes
the displayed USD and **does not change the landed rate at all**.

### 2.2 Quadrant Pacific - Surtees — ASSERTED, cell by cell

`C2` — *Quadrant Pacific Ltd (Surtees Boats)*. `C5/D5` *NZ Office*. `C6/D6`
quote date **22/04/2024** (a text string, not a date). `C7/D7` invoice
**BQ00003235**. Origin port **Tauranga, New Zealand** (`C9`).

| Rung | Cell | Formula / value | Result |
|---|---|---|---|
| Seafreight 40' HC FCL | `F10` | `2948.28` `$NZ`; `I10 = F10/H10`, `H10 = '[1]Exchange Rates'!$F$11` | 2,456.90 AUD |
| 13 New Zealand local charges | `I15:I27` | each `=F/H`, every `H` = `'[1]Exchange Rates'!$F$11` — customs clearance 85, cartage 895, customs imp/export 25.07, documentation 125, EDI 20, fuel surcharge 250, compliance/admin 20, pre-receival advice 95, port service 645, origin/carrier security 90, vehicle booking system 95, SOLAS VGM 75, bank fee 27 (all `$NZ`) | |
| Local sub-total | `I29` | `=SUM(I15:I28)` | 2,039.225 AUD |
| **Seafreight estimate total** | `I31` | `=I29+I12` | 4,496.125 |
| **Freight buffer** | `D32` / `I32` | `0.05` / `=I31*D32` | 224.806 |
| **Seafreight CTD** | `I34` | `=I31+I32` | 4,720.93125 |
| **Linear metres in the sample container** | `H35` | `10.7` typed | |
| Per metre, AUD | `I35` | `=I34/H35` | **441.2085280373832** |
| **Per metre, NZD** | `I36` | `=I35*H10` (`H36 = E10` = the label `$NZ`) | **529.4502336448598** |

**ASSERTED — the buffer is a per-brand policy, not a constant.** Highfield
`D32 = 0.1`; Surtees `D32 = 0.05`. Two brands, two buffers, both hand-typed,
neither derived. Anything we build must let this differ per brand.

**OBSERVED — an orphan.** `F29 = 5395.35` sits in the Surtees sub-total row in
the `$NZ` column with no formula and nothing reading it. It is not the sum of
`F15:F27` (that is 2,447.07). Stale.

### 2.3 Why the two rates differ by 3.4×

| | Highfield | Surtees |
|---|---|---|
| CTD per container | $9,057.16 | $4,720.93 |
| Boat metres per container | **70.5 lm** | **10.7 lm** |
| **Per hull metre** | **$128.47** | **$441.21** (A$) / **$529.45** (NZ$) |

Highfield RIBs deflate and stack; a 40-foot container swallows 70 metres of
them. Surtees are welded alloy hardtops; two fit. The per-metre rate is not a
freight rate — it is a **packing-density rate**, and it is meaningless outside
the brand it was measured on. That is the single most important structural fact
in this workbook, and it is the reason the answer is a per-brand field and not
one org-wide constant.

---

## 3. WHY ONLY THESE TWO BRANDS HAVE A SHEET

Because these are the only two brands Northside imports **in its own container**.
Everything else either arrives by road from an Australian factory or is quoted
per hull by the shipper.

The Boat Module proves it. `IX` — the column the Cost Build ladder adds in AUD
after the FX divide — is a formula on Highfield rows and a hand-typed number on
every other brand's rows.

**ASSERTED — Road Freight (`Boat Module!IX`), 1,927 rows carrying a Model Code,
grouped by `E` (the pricing-matrix brand key):**

| Brand (`E`) | rate-driven formula | hand-typed literal |
|---|---:|---:|
| **Highfield Inflatables** | **1,146** | 418 |
| Stacer | 0 | 223 |
| Merry Fisher | 0 | 39 |
| Formosa | 0 | 39 |
| **Surtees** | **0** | **29** |
| Haines Signature | 0 | 21 |
| Stabicraft | 0 | 2 |
| Jeanneau | 0 | 1 |

Every one of the 1,146 formulas is the same shape:

```
=ROUNDUP(G{row} * '[9]FCL Import - Highfield'!$I$35, -1) + k
```

`G` is `Hull Length (Mtr)` (header `Boat Module!G1`). `k` is a per-model uplift,
ASSERTED as twelve distinct values:

| k | rows | | k | rows |
|---:|---:|---|---:|---:|
| 0 | 560 | | 1000 | 62 |
| 50 | 30 | | 1100 | 86 |
| 100 | 50 | | 1500 | 52 |
| 150 | 50 | | 2000 | 68 |
| 200 | 50 | | 2200 | 40 |
| 250 | 82 | | 2300 | 16 |

(560 of the zero-uplift rows split 315 rounding to `-1` and 245 rounding to `0`
— two rounding conventions live in one column. Not our problem to fix, but it
must survive an import.)

**Recomputed from the live workbook: 1,146 of 1,146 agree exactly** with the
value cached in `Boat Module (5).xlsx`, using `I35 = 128.47032624113476` read
today from `Freight Module.xlsx`. The link is live, current, and correct.

### 3.1 Surtees has a sheet, and nothing reads it — but a human does

Surtees `IX` is hand-typed on all 29 rows. But `IX` for Surtees is not called
Road Freight. The brand's own header row 200 calls it **`Dazmac`**
(`src/demos/northside.ts:852`) — a different forwarder entirely — and calls `IQ`
**`Quad Freight`** (`northside.ts:850`). *Quad* is Quadrant Pacific. The sheet's
output has a column named after it.

**OBSERVED — the Quadrant rate is hand-carried into `IQ`, rounded.**
Of the 29 Surtees rows, **18** have `Quad Freight` exactly equal to
**NZ$530.00 × a clean 0.05 m length step**:

| `IQ` value | = 530.00 × |
|---:|---|
| 2,623.50 | 4.95 m |
| 2,915.00 | 5.50 m |
| 3,047.50 | 5.75 m |
| 3,233.00 | 6.10 m |
| 3,445.00 | 6.50 m |
| 3,710.00 | 7.00 m |

The remaining 11 rows are flat quotes for the big hulls: `6000` (2 rows, the
720 Game Fisher pair) and `12000` (9 rows, 770 and 800 Game Fisher). Surtees
`II Currency` = `NZ` on every row, so `IQ` is in NZD and is divided by
`IJ EX Rate` in the ladder — consistent.

`530.00` is `Quadrant Pacific - Surtees!I36 = 529.4502336448598` rounded to the
nearest ten. There is no formula link. Someone read the sheet, rounded it, and
typed length × rate into 18 cells.

**So the two brand sheets have two different fates, and the difference is the
whole design lesson:**

| | Highfield | Surtees |
|---|---|---|
| Sheet output | `I35` = 128.47 A$/lm | `I36` = 529.45 NZ$/lm |
| Rounded to | — | 530.00, by hand |
| Lands in | `IX` — the column the brand calls **Road Freight** | `IQ` — the column the brand calls **Quad Freight** |
| How | **live external link**, 1,146 formulas | **hand-typed**, 18 of 29 rows |
| Breaks when | never (it recalculates) | the forwarder re-quotes and nobody retypes |

The Surtees quote date is **22/04/2024**. The Highfield quote date is
**2026-02-28**. The stale one is the hand-typed one. That is the argument for
making this a stored field the app owns rather than a number in a spreadsheet a
person copies.

### 3.2 What the other brands put in these columns

Same two column ordinals, five different meanings — already captured at
`src/demos/northside.ts:29-33` and `QUOTE_SPEC.md:109`, and confirmed here
against live values:

| Brand | `IQ` is called | `IX` is called | OBSERVED values |
|---|---|---|---|
| Stacer | Base Freight | Road Freight | `IQ` = 0 on every row; `IX` 82.49 / 89.54 / 98 — small, domestic, per-model |
| Highfield | Base Freight | Road Freight | `IQ` = **0 on all 1,564 rows**; the entire container cost is in `IX` |
| Surtees | **Quad Freight** | **Dazmac** | `IQ` = length × NZ$530; `IX` = 1250/1350/1450/1550/1650 flat bands |
| Stabicraft | **ABP Compl.** | **Handling** | `IQ` = 194, `IT` = 81, `IW` = 200, `IX` = 300 (2 rows) |
| Jeanneau / Merry Fisher | **Aus Spec** | **IYT Logistics** | `II` = `Euro`; `IX` = 21,000 → 65,000 AUD per hull, hand-quoted per model |
| Haines Signature | Base Freight | Road Freight | `IQ` = `IW` = `IX` = 0 — factory delivers, freight is not costed here |
| Formosa | **Freight** | *(unused)* | `IX` = 0 on all 39 rows |

**This is the customisation test, answered by the data.** Seven brands inside one
dealer already need seven different freight vocabularies. A single hardcoded
"Freight" concept would be wrong inside Northside before it ever met a furniture
dealer. Per-brand named columns in a per-brand table — which is what we already
have — is the only shape that survives.

---

## 4. THE FREIGHT DISTRIBUTION CALCULATOR — WHAT IT ACTUALLY DOES

### 4.1 The mechanism, ASSERTED

Header `C3` — *Split Freight Allowances*. `D5/E5` — Shipment **S00177981/C**.
Note this is **not** the shipment on the Highfield sheet (`S00169820`). The two
sheets are not even about the same container.

It is **per-container, per-physical-unit**. Column `D` is *Stock Number*
(`N014592`, `N014593`, `N014474`, `N014432`, `N014434`, `N014464`) — individual
hulls with serial identity, not models. The Boat Module has no such column;
it is a price list of SKUs.

```
C64  Container Nett   12,589.83          typed — the forwarder's actual invoice
E64  TOTAL            =SUM(E9:E63)       25.2 linear metres of boat in the box
F8   Per LM           =C64/E64           499.5964285714286   ← this container's real rate
F9:F59                =IFERROR(E*$F$8,)  each boat's pro-rata share by LOA
H9:H59  Actual CTD                       TYPED, per unit
G9:G59  Variance      =H-F               what was charged, less the fair share

H65  Small Boat Split =SUM(H9:H59)       11,688.00
H66  Loaded Boats     =C64-H65              901.83   ← residual, forced to balance
H61                   =H66                            the one "LOADED BOAT"
F61                   =IFERROR(H61/E61,)    173.43   ← reverse-engineered per-metre
D65                   =SUM(F9:F59)        9,991.93
D66                   =SUM(F61:F62)         173.43
```

Two groups. Boats in rows 9–59 are split pro-rata by LOA. Row 61, under the
banner `C60 = LOADED BOAT`, takes **whatever is left** so the container balances
to the cent. `H66 = C64 - H65` is a plug, by construction.

**OBSERVED — a stale cell.** `F64 = 181.33` sits under the *Per LM* heading,
hand-typed, while the live rate `F8` is 499.60. Left over from a previous
shipment.

### 4.2 THE KEY QUESTION, TESTED

The lens asks whether the freight number on a boat row is an output of this
calculator. Six real units are in it. Every one is a Highfield, so every one has
a Boat Module row whose `IX` is the rate formula. Run it.

| Model | Stock no. | Calc LOA (`E`) | **Calc output** `F` (pro-rata) | Calc `H` "Actual CTD" | **Boat Module `IX`** |
|---|---|---:|---:|---:|---:|
| RU230 | N014592 | 2.3 | 1,149.07 | **300** | **300** |
| RU230 | N014593 | 2.3 | 1,149.07 | **300** | **300** |
| CL460 | N014474 | 4.6 | 2,298.14 | **600** | **600** |
| PA540 | N014432 | 5.4 | 2,697.82 | 5,244 | 950 |
| PA540 | N014434 | 5.4 | 2,697.82 | 5,244 | 950 |
| SP520 | N014464 | 5.2 | 901.83 *(plug)* | 901.83 | 870 |

Boat Module rows used: RU230 `r282` (`G` 2.3, `+0`), CL460 `r474` (`G` 4.61,
`+0`), PA540 Open `r597` (`G` 5.4, `+250`), SP520 `r812` (`G` 5.15, `+200`).

> **The calculator's computed allocation matches the Boat Module Road Freight on
> 0 of 6 units. The Boat Module Road Freight appears verbatim inside the
> calculator's hand-typed "Actual CTD" column on 3 of 6.**

The direction of flow is settled. The calculator does not produce the boat row's
number; on half its rows it **consumes** it. RU230 = 300 and CL460 = 600 are not
freight measurements — they are `ROUNDUP(2.3 × 128.47, -1)` and
`ROUNDUP(4.61 × 128.47, -1)`, the standing rate, copied back in as the "actual".

And the calculator's own per-metre rate for this container is **$499.60/lm**
against the standing **$128.47/lm** — because this container went out with 25.2
metres in it instead of the 70.5-metre sample. The sheet is measuring a badly
packed container. Its variance column is the point: it tells a human *this
shipment cost 4× the standing rate*. That is a finance review, once, on paper.
It is not a price.

**ASSERTED — nothing reads this sheet.** In `Boat Module (5).xlsx`'s
`externalLink9.xml`, sheet 0 (*Freight Distribution Calculator*) and sheet 2
(*Quadrant Pacific - Surtees*) both carry `refreshError="1"` and **zero cached
cells**. Sheet 1 (*FCL Import - Highfield*) caches exactly one:

```xml
<sheetData sheetId="0" refreshError="1"/>
<sheetData sheetId="1"><row r="35"><cell r="I35"><v>128.47032624113476</v></cell></row></sheetData>
<sheetData sheetId="2" refreshError="1"/>
```

---

## 5. THE EXTERNAL LINK, BOTH WAYS

**Out.** One link, to `Price Matrix.xlsx`, for two FX rates (§1).

**In.** Read from every `.xlsx` in Downloads under 45 MB, by parsing each
workbook's `externalLinks/_rels`:

| Workbook | Freight Module is index | Cells cached |
|---|---|---|
| `Boat Module (2).xlsx` (2026-02-25) | `[8]` | `I35 = 128.47032624113476` |
| `Boat Module (3).xlsx` (2026-02-25) | `[8]` | `I35 = 128.47032624113476` |
| `Boat Module (4).xlsx` (2026-03-04) | `[8]` | `I35 = 128.47032624113476` |
| `Boat Module (5).xlsx` (2026-08-08) | **`[9]`** | `I35 = 128.47032624113476` |

Nothing else in the Master Price File links to it — not the Quote Module, not
the Rigging Module, not the Price Matrix, not the Administration Module.

**Two findings fall out of that table.**

1. **One cell. One consumer. Six months. No change.** The entire workbook — 3
   sheets, 24 charge lines, two forwarders, a distribution calculator — reduces,
   for the purposes of the product data, to a single number that has not moved
   between February and August 2026. A table for that fails the ease-of-use test
   on its own terms.

2. **The index moved from `[8]` to `[9]` between March and August.** The same
   trap `scratchpad/study-service.md` §0 names for the Service Module: external
   link ordinals are positional and unstable. Any importer keyed on `[9]` breaks
   on the next re-save. Ours must resolve by target filename.

---

## 6. THE VERDICT IN FULL

### 6.1 The Freight Distribution Calculator — **LEAVE**

Stated reason: it is a per-physical-unit reconciliation of one arrived container
against one forwarder invoice, keyed on stock numbers the catalogue does not
carry, producing a variance a person reads once and a plug figure forced to
balance. **0 of 6** of its outputs reach a boat row; **3 of 6** of its inputs
came *from* one. Nothing links to it. It is printed. Its per-metre figure
(499.60) contradicts the standing rate (128.47) by design, because it is
measuring one under-filled box.

It is workings. It belongs to whoever reconciles supplier invoices, and that is
not this app. If it is ever wanted, it wants a **received-shipment** record —
stock numbers, arrival date, invoice total — which is a different product with a
different table, and is not the ask.

### 6.2 The two forwarder sheets — **SETTING, per brand**

Their entire product is one number each. Both are already consumed as a rate
multiplied by `Hull Length (Mtr)`. Neither is browsed; neither is searched;
nobody maintains a *list* of them — there are two, one per imported brand, and a
third would appear only if the dealer started importing a third brand in its own
containers.

**Where it lives, since there is no organisation-settings surface today.** Not
in a global org settings bag — the rate is meaningless without the brand it was
measured on (§2.3). It belongs to **the boat table for that brand**, as table-level
metadata beside the table's existing kind, role and sections:

```
Highfield Inflatables (kind: boat, role: base)
  freight.perHullMetre        128.47        A$/m
  freight.currency            AUD
  freight.buffer              0.10
  freight.containerSampleLm   70.5
  freight.source              "AWW Global Logistics · quote S00169820 · 2026-02-28"
  freight.appliesToColumn     ix            (this table calls it "Road Freight")

Surtees (kind: boat, role: base)
  freight.perHullMetre        530.00        NZ$/m   ← what the human actually uses
  freight.currency            NZ
  freight.buffer              0.05
  freight.containerSampleLm   10.7
  freight.source              "Quadrant Pacific Ltd · invoice BQ00003235 · 22/04/2024"
  freight.appliesToColumn     iq            (this table calls it "Quad Freight")
```

Seven of the nine boat tables carry no freight rate at all, and that is the
correct representation of Stacer, Haines, Formosa, Stabicraft, Jeanneau and
Merry Fisher — they hand-type per model, and they should keep hand-typing.

`freight.source` is the field that earns its place. The Surtees rate is
**two years and four months** older than the Highfield rate and nobody can tell
from the Boat Module. A dated, attributed rate on the table makes staleness
visible without anyone opening a workbook.

**This satisfies customisation without a table.** A furniture dealer's boat-less
tables simply carry no `freight` block. A dealer importing from three origins
gets three, one per brand table. Nothing is in our source.

### 6.3 The freight columns themselves — **EMBEDDED, already done**

`Cost Build` is the section, and both freight rungs are already in it:
`src/types/model.ts:288` defines `{ id: 'cost-build', name: 'Cost Build',
accent: 'graphite' }`; `:315` puts `Road Freight` in it; `northside.ts` puts
`iq` and `ix` in it on all nine boat tables under each brand's own name.

The only change this study asks for is **derivation on `ix`/`iq` where a brand
has a freight rate**, so the 1,146 Highfield rows stop being 1,146 copies of one
formula:

```
Road Freight = ROUNDUP(Hull Length (Mtr) × «table.freight.perHullMetre», -1) + Uplift
```

with `Uplift` as a plain editable number column in the same section (twelve
distinct values, 560 rows at zero — §3). A brand with no rate keeps a hand-typed
number, exactly as today. That is one derived column and one number column, in a
section that already exists, on tables that already exist. **No new table, no new
module, no new dashboard card.**

### 6.4 What this changes in QUOTE_SPEC

Nothing about the ladder. `IX` is still added after the FX divide; `IY Landed
Hull Cost` is still `=(SUM(IM:IV)/IJ)+IW+IX`; every quote line still records the
column and cell its price came from. The freight rung's *value* is unchanged —
we now know its *provenance*, and can print it: "Road Freight $950 = 5.4 m ×
$128.47/m (AWW Global Logistics, quote S00169820, 2026-02-28) + $250 uplift."
That sentence is worth more to a salesperson than a 22nd table.

---

## 7. THINGS TO PUT IN FRONT OF THE OWNER

1. **The Surtees freight rate is dated 22 April 2024 and is typed into 18 cells
   by hand.** The Highfield rate is dated 28 February 2026 and recalculates
   itself. Same workbook, same shape, opposite reliability — and the difference
   is invisible from the Boat Module. `freight.source` on the table fixes it.

2. **The Highfield sheet's exchange-rate cell does nothing.**
   `'[1]Exchange Rates'!$F$12` feeds `F10`, which is a display-only USD figure;
   the landed cost comes from `I10 = 5382.28` typed in AUD. If the USD moves,
   the freight rate does not. The Surtees sheet is wired correctly. One of the
   two is wrong and it should be his call which.

3. **`Freight Buffer` is 10% for Highfield and 5% for Surtees, both hand-typed,
   and `HELMLOGIC_GROUND_TRUTH.md:698` already records the production app
   rendering `0.1` as "0.1%".** That bug happened because the buffer had no home
   with a declared unit. Give it one.

---

## APPENDIX · REPRODUCTION

Scripts run in this session's scratchpad, reading only workbooks opened
read-only and two pickles written by this same session. No file in
`C:/Users/AsafA/Downloads` was opened for writing at any point; no `.xlsx` was
moved, renamed or saved.

```
dump the three sheets, formulas and cached values      openpyxl, data_only=False and True
extract Boat Module C,D,E,G,II,IJ,IQ,IT,IU,IV,IW,IX,IY openpyxl read_only, rows 1-2301, both modes
                                                        -> boat_freight_cols.pkl / boat_freight_vals.pkl
classify IX per brand; recompute 1,146 formulas         RATE = 128.47032624113476
fit Surtees IQ against 530.00 x length                  18 / 29
reconcile the 6 calculator units against Boat Module IX 0 / 6 output, 3 / 6 input
read externalLink*.xml(.rels) of every .xlsx < 45 MB    zipfile, raw XML
```
