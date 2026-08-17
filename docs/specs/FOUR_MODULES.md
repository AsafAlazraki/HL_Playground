# FOUR MODULES — what we carry, what we embed, what we set, what we leave

**Status.** A decision. Nothing here is built and no file under `src/` or
`tools/` was written to reach it.

**The question, in the owner's words.** *"I have given you some other modules as
well. They might not need to be their own tables, but just embedded — research
and understand. reminder to keep the importance of ease of use. customisation
etc."*

**The four workbooks**, all read read-only from `C:/Users/AsafA/Downloads/`,
never written, moved or renamed:

| Workbook | Sheets |
|---|---|
| `Rigging Module (1).xlsx` | Rigging Kits · Rigging Spec Enquiry · Dropdowns *(hidden)* |
| `Price Matrix.xlsx` | Price Matrix · Exchange Rates · Exchange Rate Calculator |
| `Freight Module.xlsx` | Freight Distribution Calculator · FCL Import - Highfield · Quadrant Pacific - Surtees |
| `Administration Module.xlsx` | Bank Details · Finance Module · Dropdowns *(hidden)* |

**Sources.** Four lenses, each reproducible from its own scripts:
`scratchpad/study-rigging.md`, `scratchpad/study-pricematrix.md`,
`scratchpad/study-freight.md`, `scratchpad/study-administration.md`. Prior art
this file corrects or extends: `docs/specs/FITMENT_RULES.md` §6.5 and Appendix B
item 2, `QUOTE_SPEC.md` §2.3 and §2.5, `docs/specs/MPF_GROUND_TRUTH.md` §6.2,
`docs/specs/HELMLOGIC_GROUND_TRUTH.md:187`.

**Evidence discipline, unchanged.** **ASSERTED** = a formula, a validation, a
stated header, a divider label, a protection flag, an external link. **OBSERVED**
= a pattern in the values, always with a numerator and a denominator. **DERIVED**
= arithmetic done here, from cited cells. No rate, fee, margin or policy is
invented anywhere in this file; where a number's meaning could not be
established it is marked and sent to §10 rather than guessed.

**On the Bank Details sheet.** Its shape is described and nothing else. No
account number, BSB or credential-like value appears in this document, in any
scratch file, or in any seed. See §6.1 for why that is a design position and not
only a precaution.

---

## 1 · THE TWO TESTS, STATED ONCE

Every verdict below is checked against both, in writing, every time.

> **EASE OF USE.** Does a human being genuinely need to sit down and maintain a
> *list* of this? The left panel today renders **48 entities** — 21 base tables
> (7 boat, 8 trailer, 2 motor, 3 package, 1 accessory) and 27 joins, grouped by
> kind (`src/app/LeftPanel.tsx:183-200`). A rate nobody browses is not a table.
> A calculator is not a table; its output might already be a column.

> **CUSTOMISATION.** Would a dealer in another industry have a different version
> of this thing? If yes it must be data an admin can change, not a constant in
> our source. The failure mode has a name and a receipt in our own files:
> `GST_MULTIPLIER = 1.1` re-hardcoded in seven production files while
> `organisation.gstPercentage` sat unused (`QUOTE_FINDINGS.md:99-101`).

The two tests pull against each other and that is the point. Ease of use says
*carry less*; customisation says *hardcode nothing*. A **SETTING** is what
satisfies both at once: it is data the admin owns, and it costs no row in a
browse list. Most of what follows resolves there, and that is the honest shape
of these four workbooks rather than a convenience.

One more constraint decides more of this than either test: **one table per
brand**. A value keyed on brand is, for us, *constant across every row of that
brand's table*. It is therefore neither a row nor a column. It is a property of
the table — a third home the spreadsheet does not have and we do.

---

## 2 · THE ANSWER, IN ONE TABLE

Twelve sheets, twelve verdicts. One new table.

| Workbook | Sheet / concept | Verdict | Lands |
|---|---|---|---|
| Rigging | **Rigging Kits** | **TABLE** | `rig_kits` · kind `accessory` · role `base` · 622 live rows. No dashboard tile. |
| Rigging | the rigging column on the boat × motor joins | **EMBEDDED** | 8 joins, section `Rigging` — `text` becomes `reference`, plus two read-through columns |
| Rigging | `Rigging Spec Enquiry` | **LEAVE** | it is a `ViewDef` written in 818 formulas, and nothing reads it |
| Rigging | `Dropdowns` *(hidden)* | **LEAVE** | a four-cell price checker; its behaviour is the table's search box |
| Rigging | labour cost / sell rate, kit markup, trade & sub-dealer discounts | **SETTING** | Organisation Settings → Rates (§7) |
| Price Matrix | the brand margin ladder (ordinals 10–17) | **SETTING**, table-scoped | the table's own settings, beside kind and role |
| Price Matrix | `J CTD` supplier landing markup | **EMBEDDED** | one `percent` column on `parts`, section `Supply Pricing` |
| Price Matrix | `I Reviewed` + `U Notes` | **EMBEDDED** | two fields beside the ladder they govern — never their own row |
| Price Matrix | **Exchange Rates** | **SETTING**, org-level | Organisation Settings → Currency (§7) |
| Price Matrix | **Exchange Rate Calculator** | **LEAVE** | 40-slot single-use scratchpad, no shipment id, no write-back |
| Price Matrix | Retail Sliding Scale (rows 61–69) | **LEAVE**, re-openable | a stated policy with no evidenced consumer — §4.5 and Q7 |
| Freight | **FCL Import - Highfield** | **SETTING**, per brand | table-level `freight` block on `boat_highfield` |
| Freight | **Quadrant Pacific - Surtees** | **SETTING**, per brand | table-level `freight` block on `boat_surtees` |
| Freight | **Freight Distribution Calculator** | **LEAVE** | 0 of 6 of its outputs reach a boat row; 3 of 6 of its inputs came from one |
| Freight | the freight columns themselves | **EMBEDDED, already done** | `iq`/`ix` are already in `cost-build` on all seven boat tables |
| Admin | **Bank Details** — payment footer | **SETTING** | a free-text document block |
| Admin | **Bank Details** — account name / BSB / account no. / reference | **LEAVE** | the app never models these |
| Admin | **Bank Details** — card surcharges | **SETTING**, as text | nothing computes them today |
| Admin | **Finance Module** — lender, six rate/term rows, fee, deposit % | **SETTING** (small repeating group) | Organisation Settings → Finance |
| Admin | **Finance Module** — the three phrases and the legal notice | **SETTING**, as document content | content blocks |
| Admin | **Finance Module** — the `PMT` calculator | *output, not data* | a block on the quote document |
| Admin | **Dropdowns** — nine document types | **SETTING** (open vocabulary) | Organisation Settings → Vocabularies |

**Net: one new table, eighteen new columns, one new settings surface.** §9 does
that arithmetic against the alternative.

---

## 3 · THE RIGGING MODULE

This gets its own section because it closes a hole `FITMENT_RULES.md` Appendix B
opened, and because the first thing to say is that the hole was not the one we
described.

### 3.1 · The correction, stated plainly

`FITMENT_RULES.md` §6.5 told the owner:

> *"A 5.77 MB cache of its `Rigging Kits` sheet is embedded in
> `Boat Module (5).xlsx` and the rule was read from that cache — but a cache
> cannot prove absence, and here is the demonstration: column `O`, the lookup
> target of `UH Rigging Kit Labour`, has **zero cached values** yet `UH829`
> returns `5.8`."*

and Appendix B item 2 told him the cache was *"demonstrably incomplete."*

**Both sentences are wrong, and the demonstration was the wrong way round.**
With the real workbook in hand and compared cell for cell against
`externalLink5.xml` (`scratchpad/rig/r9_cachediff.py`, ASSERTED):

| test | result |
|---|---|
| cells present in the cache **and** in the real `Rigging Kits` sheet | **42,372** |
| of those, values that differ | **0** |
| cells the cache does not carry that the real sheet does | **0** |
| cells the cache carries that the real sheet does not, after stripping `\xa0` | **0** |
| cached cells in column `O` | **1,448** (1,247 non-blank) |

The cache is a byte-exact mirror. Its extra bulk — rows declared to 3,039,
columns to `BM` — is `\xa0` padding, not data. And the demonstration reproduces
in the opposite direction: `Boat Module!LA829` names a kit, `Rigging Kits!C382`
is that same string, and `Rigging Kits!O382 = 5.8` is the value `UH829` returns.
The hours were cached all along.

**So the correction is this.** We asked for `Rigging Module.xlsx` for the wrong
reason, and it was worth having anyway — for the derivation rather than the
data. What the file adds that no cache could: the price ladder (§3.4), the two
external labour rates (§3.4), the full dependency graph, the `OBSOLETE RIGGING
KITS` divider at `C829`, the six preamble sentinels (§3.5), and one sheet the
cache genuinely does not carry (`Rigging Spec Enquiry`, 0 cached rows — §3.7).
`FITMENT_RULES.md` §6.5 and Appendix B item 2 should be struck and replaced with
that sentence, in the same voice they used to make the claim. A correction
stated clearly is worth more than the original finding, and this one costs us
nothing except the admission.

### 3.2 · Was the 81.7 % "override" real, or an artefact of the wrong source?

**Neither. It was real, it was measured correctly, and it was never an
override.** The 81.7 % figure (equivalently: the `VLOOKUP` fires on 507 of
26,018 cells = **1.9 %**, and the chosen kit equals `Rigging Option - 01` on
**27.19 %** of live triples) measured a structural mismatch, not a person
disagreeing with a formula.

The hand-typed cells are not freehand data entry. Measured against the real
sheet (OBSERVED, at the strongest rate an observation can reach):

| universe | populated | resolve into `Rigging Kits!C` | |
|---|---|---|---|
| slot 1 (`Boat Module!LA`), all rows | 2,005 | **2,005** | **100.0000 %** |
| 812 live rows × 13 slots | 10,540 | **10,540** | **100.0000 %** |
| all 2,005 rows × 13 slots | 26,018 | 26,017 | 99.9962 % |

The single miss in the entire workbook is one `MW` cell reading `0`. So the
~1,959 hand-typed literals in `LA` are a person choosing a row from this sheet
and re-keying its full name, correctly, 25,265 times out of 25,266. **The
failure is a mechanism failure — a workbook cannot store a row pointer — not a
data-quality failure.** That distinction is the whole reason the fix is a
`reference` column and not a validation.

**Why the `VLOOKUP` cannot work, in the sheet's own words.** `AT..BC` are ten
`Control Cable Length, Option 1..10` slots **on the kit row**. A kit's identity
is mount × gauge × harness × **cable length**, and cable length is a property of
the hull, not the motor — monotone in `Boat Module!G Hull Length` across 1,146
live cells (10' → 3.36 m median · 13' → 4.59 · 15' → 6.16 · 17' → 7.39, no
inversion, OBSERVED). `VLOOKUP(motor → Motor Library!DA)` asks a one-sided
question of a two-sided fact and can only ever return one arbitrary length.

### 3.3 · What the rigging rule actually is, now that the source is in hand

Every candidate measured by majority vote over the **3,945 live (boat, motor,
kit) triples** (`scratchpad/rig/rb_rules.py`, OBSERVED):

| key | groups | hit |
|---|---|---|
| hull material `(HYP)`/`(PVC)` | 2 | **15.76 %** |
| engine configuration (Remote/Tiller) | 3 | 18.45 % |
| **motor brand** | 29 | **18.77 %** |
| boat brand | 8 | 19.04 % |
| **motor HP band** | 6 | **26.03 %** |
| **motor `Control`** (`Motor Library!J`) | 8 | **26.10 %** |
| motor (the whole model) | 215 | 54.17 % |
| motor + boat brand | 362 | 66.74 % |
| **motor + hull length (0.1 m)** | 589 | **80.66 %** |
| motor + boat brand + hull length | 706 | 85.08 % |
| *motor + boat row (the pair itself — upper bound)* | 3,315 | *93.79 %* |

**The four selectors the brief named are the four worst predictors in the table.
REJECT all four** — hull material 15.8 %, motor brand 18.8 %, HP band 26.0 %,
control type 26.1 %. Nothing here overturns `FITMENT_RULES.md` R5; it explains
it. **The rigging kit belongs to the (boat, motor) pairing and to neither side
alone**, and the pair itself only reaches 93.79 % because the same pair is
legitimately offered more than one kit.

**One rule does hold, and it is the exact analogue of F8** (the trailer series
banner):

> **A boat may only be paired with a kit from a factory-fit section named for
> its own brand.** ASSERTED for the eight brand-named banners at rows 546, 616,
> 659, 670, 695, 715, 733, 766. Measured: **555 of 571 = 97.20 %**, and the 16
> counter-examples are one class — Cap Camarat hulls (rows 249, 250, 251, 255,
> 256, 257) taking Cap Camarat kits while `Boat Module!E Matrix` labels them
> `Merry Fisher`. **The kits are right and the brand column is wrong.** Fold
> Jeanneau's three marques into one group and it is **571 / 571 = 100.00 %**,
> discriminating to between 0.96 % and 9.32 % of the 622 live kits.

**ADMIT as a warning, and scope it honestly.** It covers 571 of 3,945 live
triples — **14.5 %** — because the big brand has no bespoke catalogue: Highfield
carries 588 live boats and 2,519 live triples against a `HIGHFIELD RIGGING KITS`
section of **exactly two kits**, and draws everything else from the generic
Yamaha sections. Haines Signature takes the `HAINES - Factory Fit Rigging Kit`
sentinel on **117 of 117**. Same shape as trailers, same correction: bespoke is
the norm for the small brands, generic for the big one.

One further warning is worth writing because it is the only zero in the
cross-tab: **a mechanical-control motor never takes a Helm Master kit — 0 of
1,576.** The converse fails outright (a DEC motor takes a mechanical kit on 137
cells), so the rule is one-directional and must be written that way.

### 3.4 · What a kit costs — the ladder, ASSERTED in full

```
 F  Dealer            base cost   (supplier list, or BE − 23 %, or hand-typed)
 G  Factory         = F × 0.04                                    ← 333 cells
                    or  <foreign price> / '[3]Exchange Rates'!$F$11  ← 17 cells
 H  Kit CTD         = F + G                                       ← 562 cells
                    or ((F + G) / '[3]Exchange Rates'!$F$13) × 1.05 ← 67 cells
 K  Kit Sell Price  = ROUNDUP((H + H × K$2) × 1.1, −1)      K2 = 0.25
 L  Trade           = K − K × L$2                           L2 = 0.05
 M  Sub Dealer      = K − K × M$2                           M2 = 0.05

 O  NSM Lab (Hrs)     HAND-TYPED — 51 distinct values, 0 → 20.0, median 5.65
 P  NSM Lab ($)     = O × '[1]Labour Rates'!$G$14           ← the COST rate
 Q  Additional Parts= AH + AL + AN + AJ
 R  Sundry            HAND-TYPED
 S  Install CTD     = P + Q + R
 V  Install Retail  = ROUNDUP(O × '[1]Labour Rates'!$H$9
                              + (Q + R) × 1.3 × 1.1, −1)    ← the SELL rate
 W, X               = V − V × 0.05

 Z  Total CTD       = H + S
 AC Sell Price      = K + V        ← the retail number for kit + fitting
```

Median `AC` on a live pairing **$3,370**; maximum **$44,310**. The hidden
`Dropdowns` sheet is the business's own statement of which two numbers matter:
`D9 = VLOOKUP($D$7,'Rigging Kits'!$D:$ZZ,23,0)` → `Z Total CTD`, and
`D10 = …,26,0` → `AC Sell Price`.

**Three numbers the workbook does not own** (ASSERTED, from
`xl/externalLinks/_rels/`): `Service Module.xlsx!Labour Rates!$G$14` =
130.09090909090907 on **629 cells**, `!$H$9` = 159 on **635 cells**, and
`Price Matrix.xlsx!Exchange Rates!$F$11`/`$F$13` on **84 cells**. Two scalars in
an eighth workbook nobody sent us set the install price of every rigging kit
this dealer sells.

### 3.5 · The sentinel band — confirmed, and there are six of them

`C4 = "NR - RIGGING KIT NOT REQUIRED"` is **CONFIRMED verbatim**, `D4 =
"Rigging Not Req."`, every price column 0, `O4 = 0`. But it is one of six
preamble rows above the first band header, and the other five are sentinels
too — and they are not inert:

| row | `C` | `O` hrs | consequence |
|---|---|---|---|
| 4 | `NR - RIGGING KIT NOT REQUIRED` | 0 | no kit |
| 5 | `SUP - Supplied Standard w Motor` | **2.5** | **the motor ships with it and we still bill 2.5 h to fit it** |
| 6 | `NB: Rigging Kit - Select from Factory Options Listed Below` | 1.0 | a deferral marker |
| 7 | `HAINES - Factory Fit Rigging Kit` | 0 | brand blanket, 117/117 of Haines |
| 8 | `Tiller Handle Standard w Motor` | 0 | **411 live cells — the most-used value in the whole join** |
| 9 | `Tiller Handle - Dealer Fitted` | — | |

`C827`, the last live row, repeats row 4's string verbatim. **The importer rule:
test `C == "NR - RIGGING KIT NOT REQUIRED"` exactly, on both rows; import rows
5–9 as real rows carrying real labour, flagged, never dropped.** Dropping row 5
silently deletes money from every quote that names it.

### 3.6 · VERDICT — **TABLE**, and the ease-of-use test is what argues *for* it

**Ease of use.** A human maintains this list by hand, weekly. `O NSM Lab (Hrs)`
has **zero formulas on 1,244 rows**; `R Sundry` has zero; `F Dealer` is
hand-typed on 1,140 of 1,264. The band headers carry their own maintenance
dates — *As at 01.07.2024*, *Season 2024 as at 28.05.2024*, *as at 22.05.2023*.
That is the owner's own test for a table, met literally.

But the tax he is objecting to is a **module** — a dashboard tile, a page a
person has to learn. So the answer is two answers:

> **A table, yes. A module, no.** `rig_kits` gets a table id and **no dashboard
> card**. Its only surfaces are the reference picker on the boat × motor pair and
> a Related block on the boat's and the motor's detail pages. It adds one row to
> a 48-row left panel, under `ACCESSORY`, beside `Parts & Accessories`.

**Customisation.** A furniture dealer has no rigging kits; a caravan dealer has
awning kits with fitting hours. The *shape* — a priced product that carries
labour hours and installs onto something else — is exactly the shape the seeded
`parts` table already has (`kind: "accessory"`, sections Identity / Supply
Pricing / Fitted Pricing / Operations / Source, with `TTF (Hours)` + `Labour
($)`). We are building a second instance of a pattern already shipping, under a
name the admin chooses, not a marine concept in our source.

**Why it cannot be folded into `parts` — tested and rejected.** **Five product
names collide** across the two libraries (`Evo Dual Remote Controller`,
`Evo Side Mount Controller`, `Evo Tiller Controller`, `Evo Top Mount Remote
Controller`, `Not Available`) between `Rigging Kits!C` (1,268 distinct) and
`Parts Maintenance!C` (3,129 distinct). A `reference` into a merged 4,400-row
table cannot tell which library a boat row meant — and `FITMENT_RULES.md` R4/R6
point at Parts while R5 points at Rigging. Two key spaces, merged, produce a
wrong pair, and a wrong pair is worse than a missing one.

**Shape**, mirroring the sheet and the `parts` table:

| section | columns |
|---|---|
| **Identity** | Section *(from the banner row)* · Rigging Kit Description `C` · Part Number `D` · Build `E` · **Obsolete** *(derived from `C829`)* · **Sentinel** *(derived, rows 4–9 + 827)* |
| **Kit Pricing** | Dealer `F` · Factory `G` · Kit CTD `H` · MU `I` · GP `J` · **Kit Sell `K`** · Trade `L` · Sub Dealer `M` |
| **Install** | **NSM Lab (Hrs) `O`** · NSM Lab ($) `P` · Additional Parts `Q` · Sundry `R` · Total Install CTD `S` · Install Retail `V` · Install Trade `W` · Install Sub Dealer `X` |
| **Total** | Total CTD `Z` · **Sell Price `AC`** · Trade `AD` · Sub Dealer `AE` |
| **Contents** | Parts & Accessories 1–4 + their CTD `AG..AN` · Fuel Filter `AP` |
| **Cable Options** *(collapsed)* | Control Cable Length 1–10 `AT..BC` |
| **Source** | `Rigging Module.xlsx · Rigging Kits!<row>` |

46 columns, of which the ten in **Cable Options** are collapsed by default —
`ColumnSection.collapsed` (`src/types/model.ts:85-91`) exists for exactly this,
and slot 1 carries 27 distinct values while slot 10 carries 1.

`C` is the primary key and `D` is a secondary reconciliation key. This is the
fourth library to give the same answer, and the workbook reinforces it by
failing the other way: the hidden `Dropdowns` gadget keys on `D`, and `D` has
**139 codes covering 419 rows** plus 8 live kits with no `D` at all, so it
silently returns the first match.

**Join?** None new. The rigging kit already sits on the eight boat × motor joins.

### 3.7 · **EMBEDDED** — the column on the pair, and two read-throughs

The seed carries `{ k: "rig", n: "Rigging Kit Option", t: "text", s: "rigging" }`
on **eight** join tables (`src/demos/northside.ts:2850, 3014, 3149, 3372,
3581, …`) in a section already named `Rigging`. Nothing about R5 changes. What
changes is one word: `text` becomes `reference` into `rig_kits`, and the section
gains two derived read-throughs the quote needs:

- **Rigging Kit Labour (Hrs)** ← `rig_kits.O`. This is arithmetic, not a guess:
  `Boat Module!UH` computes it and is overridden on **0 of 2,436** cells
  (`FITMENT_RULES.md` R9).
- **Rigging Sell** ← `rig_kits.AC`.

Two columns × eight joins = 16 columns, in a section that already exists, on
tables that already exist. This is `FITMENT_RULES.md` §7 item 5, confirmed and
sized: **622 live rows, 204 of them ever named by a live boat.**

### 3.8 · **LEAVE** — and why each one is a good outcome

**`Rigging Spec Enquiry`.** 818 cells, every one a formula, every formula
`='Rigging Kits'!C<n>`, targeting rows **11 … 828** — the complete live range
from the first band header to the divider and not one row past it. It is a
price-free, obsolete-free picker list of the live catalogue. **Ease of use:**
importing it would create a second table that is a filtered copy of the first,
which is the definition of the tax. **Customisation:** it encodes one filter, and
a filter is a `ViewDef`, which our app produces for free. And nothing reads
it — the Boat Module's cache carries `Rigging Kits` (3,039 rows) and `Dropdowns`
(625 rows) and **0 rows** for this sheet, and Excel only caches sheets a formula
references, so zero cached rows is proof of zero references. **Import the filter
it encodes — `Obsolete = false AND not a band header` — not the sheet.** The most
useful thing in the workbook is that the business built our artefact by hand.

**`Dropdowns` (hidden).** Four populated cells, `C7:D10`: type a part number, see
`Z` and `AC`. **Ease of use:** it is a search box with two result columns; we
have a search box. **Customisation:** nothing in it is configurable — it is a
gadget, not a policy. Carry the *finding* (that `Z` and `AC` are the two numbers
a person wants from a kit) into the table's default column choice, and leave the
gadget.

**Three column-level leaves, for the importer.** `E Build` is populated on 633
rows but beyond `Service` (427) and `Factory` (74) it holds part numbers and raw
prices — carry it as text with the warning in its description, do not model it.
`BE Dealer 1/7/22` is a frozen 2022 cost read by 55 formulas — import as a plain
number named for its date, do not resurrect the `−23 %` derivation. Columns `A`,
`B`, `N`, `Y`, `AF`, `AO`–`AS`, `BD`, `BF`–`BM` are empty on every row.

### 3.9 · One finding for the owner, not a rule

**153 live triples on 31 live boat rows name a kit from below the `OBSOLETE
RIGGING KITS` divider** — 24 distinct kits, Stabicraft 91, Stacer 54, Merry
Fisher 6, Surtees 2. **Nine are in slot 1, the boat's standard fit**, all
Stabicraft rows 178–194 pointing at `(FF9SC) Yamaha 2400 SCB … Pre Rig` kits.
This is `FITMENT_RULES.md` Appendix B item 1 (30 live trailer pairings offering a
discontinued trailer, 8 as standard) repeating in a second library. The pattern
is systemic, which means one report and not two fixes — and it is the reason
`rig_kits` must import all **1,244** kit rows with an `Obsolete` boolean rather
than the 622 live ones.

---

## 4 · THE PRICE MATRIX

The smallest workbook in the Master Price File and the one with the widest blast
radius: 35,212 bytes, 47 data rows, four exchange rates, and every hull price in
the catalogue passes through it.

### 4.1 · What a row is

**FROM** a brand or supplier name in column `C` — 47 distinct values, the lookup
key of the whole file. **TO** seven percentages, two label columns and a date. It
is not a grid; it is one-dimensional — brand → a margin ladder.

**ASSERTED — the author wrote the VLOOKUP ordinals into row 6**, and all seven
that `MPF_GROUND_TRUTH.md:893-897` records confirm exactly against the header:
10 = `L` Sub Dealer, 11 = `M` Trade, 12 = `N` Sell, 13 = `O` Factory Options,
14 = `P` Dealer Fit Options, 16 = `R` Warranty Allowance, 17 = `S` Admin Load.
`L1` states the convention the headers do not: *"NB: Trade/Sub Dealer Pricing is
Discount off Retail"* — so ordinals 10 and 11 **subtract** and 8, 9, 12, 13, 14
**add**, and nothing in the column names distinguishes them.

**And the arithmetic closes to the cent.** `MPF_GROUND_TRUTH.md:889`'s worked
Highfield row: Cash 41,340 → Trade 39,273 = `41,340 × (1 − M14 0.05)`; Sub Dealer
34,105 = `ROUNDDOWN(41,340 × (1 − L14 0.175))`. **DERIVED, exact both times.**

That receipt settles something we have already shipped around.
`HELMLOGIC_GROUND_TRUTH.md:187` records the price ladder as *"Trade = Cash ×
0.95 · Sub Dealer = Cash × 0.825"*. **Those are not constants. They are
Highfield's row 14, hardcoded** — and every other boat brand in the file (rows
8–13) carries Trade `0 %` and Sub Dealer `0 %`. One brand's margins were
generalised to seven.

### 4.2 · VERDICT — **SETTING**, scoped to the table

**Ease of use.** 47 rows, and **not one of them is editable in place**: ASSERTED,
`sheetProtection algorithmName="SHA-512" spinCount="100000"` on both rate sheets,
`workbookProtection lockStructure="1"` on the workbook, and a cell-by-cell scan
finding **0 unlocked cells on Price Matrix, 0 on Exchange Rates, 82 on the
Calculator**. No autofilter, no data validation, three `Print_Area` names and
nothing else. A sheet with a print area, no filter and no editable cell is the
business telling us in the file format that nobody browses this. One person
unlocks it after a named meeting; the note in `U2` even records the meeting —
*"All Admin Loads removed 18.08.2025 as per MM / JF Request"*.

**And the decisive structural argument: one table per brand.** The matrix is
keyed on brand, so for any brand we carry, its matrix row is *constant across
every row of that brand's table*. Embedding the seven percentages as columns
would copy Highfield's row onto 588 identical rows — the disease
`MPF_GROUND_TRUTH.md:593` measures as *"re-looked-up 1,387 times"*. A per-brand
value on a per-brand table is a property of the **table**.

**Customisation.** Every dealer has per-brand margins, so the mechanism is
universal — but `CTD · Sub Dealer · Trade · Sell · Factory Options · Dealer Fit
Options · Warranty Allowance · Admin Load` is a *marine* dealer's ladder. A
caravan dealer has `Dealer Delivery` and no rigging. **So the rungs themselves
must be data** — a named, ordered, org-editable list — which is precisely what
rules out "add seven number columns to the `boat` kind."

**Where it lands, concretely.** Two pieces:

1. **An org-level ladder definition** — the ordered rungs, each with a `name`, a
   `basis` (`markup on cost` · `discount off <named rung>` · `RRP` · `not set`)
   and a default. Organisation Settings → Rates (§7).
2. **A per-table value for each rung**, on the table's own settings beside its
   kind, role and sections. No left-panel entry, no card, no row.

**A percentage must not be modelled as a `number`.** ASSERTED by type inspection
of `K L M N O P` across the 47 rows — every one of the six has the identical
distribution: **22 numeric · 17 holding the literal string `"RRP"` · 8 holding
`U+00A0`**. 53 % of rows return text, so `price − price × VLOOKUP(…)` yields
`#VALUE!`. The 17 `RRP` rows are the resale suppliers; the 8 non-breaking spaces
are the marine electronics brands, and they *look* empty. `RRP` is a **mode flag
typed into a numeric field** — which is why each rung needs a mode, not a
nullable number.

**Do not carry the ordinals.** Ordinal 15 is a deliberately reserved gap, and
ordinal 7 is already ambiguous (§4.3). `MPF_GROUND_TRUTH.md:1223-1226` names this
as the file's structural fault: *inserting one column silently repoints every
lookup*. Named rungs or nothing.

**Two governance fields ride with the ladder, EMBEDDED beside it, never as their
own row:** `I Reviewed` and `U Notes`. Of 47 rows only **15 carry a date**, in
exactly two distinct values — 2025-03-05 (all 7 boat brands and all 6 trailer
brands) and 2025-05-27 (the two Yamaha rows). **Every boat brand margin in this
business was last reviewed 499 days before the file was last saved
(2026-07-17).** A governance value that sits anywhere other than beside the
number it governs becomes `window.__marginOverrideAudit` (`QUOTE_FINDINGS.md`
§3.5).

**Four defects to carry as data quality, not as design.** `Formosa` (39 live
SKUs) and `Cap Camarat` have **no row at all**, so every markup lookup on them
returns `#N/A`. The Franchise Code is not unique — **44 distinct across 47
rows**, with `9ST`, `9JE` and `9YA` each covering two rows that carry different
percentages, so any migration keying on the code collides three ways. `G BMT
Labour Rate` and `H Retail Labour Rate` hold **one distinct value each across 47
rows** (`Internal`, `Retail`) — constants dressed as columns. And `F Exchange
Rate` holds a currency *label* (`$A` 44 · `Euro` 2 · `$NZ` 1) in a vocabulary
that does not match the Exchange Rates sheet's own (`AUD` · `NZ` · `USD` ·
`EURO`), and says `F14` Highfield is `$A` while Highfield hulls ship from Qingdao
priced in USD. It is currently harmless — ordinal 4 is not among the ordinals
anything reads — and it is a trap for anyone who assumes the matrix is the source
of a boat's currency.

### 4.3 · **EMBEDDED** — the supplier landing markup

`J CTD` (0 – 50 %) is the one column on this sheet that is genuinely per-row
rather than per-brand-table: it covers the 29 supplier and category rows that
will never have a product table of their own — BLA 20 %, Garmin 10 %, Inflatable
Boat Centre 5 %, Frank Marine 50 %.

**Ease of use.** Nobody sits down to maintain a *list* of landing markups; they
maintain a list of parts, and the markup is a fact about where a part came from.
**Customisation.** A landed markup on a supplier's cost is universal; the
supplier names are the dealer's own data.

**Where it lands.** One `percent` column, `Landing MU`, in the existing
`Supply Pricing` section on the `parts` table (`src/demos/northside.ts` — the
section is `{ id: "supply", name: "Supply Pricing", accent: "graphite" }` and the
key it needs, `{ k: "d", n: "Supplier" }`, is already there). The workbook does
exactly this: `Parts Maintenance!H Landing MU` is already a column on the parts
sheet, populated by lookup. We import the **value**, not the derivation.

**The derivation is flagged, not guessed.** `MPF_GROUND_TRUTH.md:1007-1008`
records that column as reading Price Matrix ordinal 7. Anchored at `C`, ordinal 7
is `I Reviewed` — a date, which cannot be a landing markup. Anchored at `D`
(Franchise Code), it is `J CTD`, whose 47 values are exactly a per-supplier
landing markup. **OBSERVED, unresolved** — Q11.

### 4.4 · **SETTING** — the exchange rates, and what a rate must carry

ASSERTED, `Exchange Rates!C9:H13` — four rows: AUD `1` (review date `=TODAY()`),
NZ `1.2` (2025-11-10), USD `0.7` (2025-06-11), EURO `0.6` (2025-04-10). The
direction is foreign-units-per-1-AUD and it is applied by **division**
(`Boat!IY = (SUM(IM:IV)/IJ)+IW+IX`).

**Ease of use.** Four rows that change a few times a year, in a sheet with zero
unlocked cells. Not a table under any reading.
**Customisation.** A single-currency dealer has one row; a dealer importing from
three origins has three. Currencies cannot be a TypeScript union.

**Where it lands.** Organisation Settings → Currency (§7). And it must ship with
its reader in the same change, or it repeats `gstPercentage` exactly.

**What the app must add that the workbook does not have.** Staleness handling in
the workbook today is **nothing**, ASSERTED exhaustively: `Boat!IJ` is a live
`VLOOKUP` on 1,434 rows, not a stored number; there is one row per currency
forever with no effective-from and no prior value; the `Review Date` column is
read by no formula; and the rates were **249 / 401 / 463 days stale** at last
save while the notes beside them are dated *after* every review date. The
consumers are wider than anyone had recorded: `Boat!IJ` (1,434 rows), `Parts
Module!Highfield!G1` (one cell feeding a whole sheet), `Freight Quadrant` (13
cells, rate-sensitive) versus `Freight FCL` (1 cell, **not** rate-sensitive),
**84 previously-undocumented cells in the Rigging Module** (17 ÷ NZ, 67 ÷ EURO
× 1.05), and `M23` — one cell setting every trade motor price across 485 rows.

Our answer already exists and needs one extension. `QUOTE_FINDINGS.md` §2.1 —
*"Snapshot on commit… SNAPSHOT stored sells, never recompute"* — and §2.2 —
*"Snapshots carry provenance."* **A quote line whose price passed through an FX
conversion must freeze the rate, the currency and the rate's review date.** Three
fields on the line model that already records the column and cell a price came
from. That is the difference between *"quoted at $41,340"* and *"quoted at
$41,340, landed at NZD/AUD 1.20 dated 2025-11-10."*

### 4.5 · **LEAVE** — the calculator, and the sliding scale

**The Exchange Rate Calculator.** It is not a rate table and not a converter. It
is a per-invoice landed-cost allocator that back-solves the rate the business
actually achieved: `E4` nett factory invoice (typed), `F5` the AUD that actually
left the bank (typed), `F7 = E4/F5` the achieved rate, `F10:F49 = E/$F$7` spread
across 40 line slots, `E52`/`F52` a reconciliation. The unlocked-cell map proves
the design — 82 unlocked cells and no others: `E4`, `F5`, `D10:E49`.

**Ease of use.** Single-use: 40 hardcoded slots, one invoice at a time, the next
overwrites it. No shipment number, no invoice number, no supplier, no date, no
currency label anywhere on the sheet, and no link to any boat row.
**Customisation.** Nothing on it is configurable; it is arithmetic on two typed
numbers.
**And its output already exists as our columns** — `Landed Hull Cost` is seeded
on all seven boat tables, and `EX Rate` is a `cost-build` preset at
`src/types/model.ts:313`.

**What it teaches survives, and it is the whole staleness argument in one step
— DERIVED from `E4`, `F5` and `F11`:**

```
standing rate   F11              = 1.2000
achieved rate   E4 / F5          = 1.2533155616…      +4.44 %
cost at standing  82,897.60/1.2  = AUD 69,081.33
cost actually     F5             = AUD 66,142.64
                                   ─────────────
overstatement                      AUD  2,938.69      on ONE hull
```

The business built a tool to measure that gap and **nothing writes the answer
back.** No formula, no link, no macro. The sheet measures the error and forgets
it. That becomes the review date in §4.4 and the frozen rate on the quote line —
not a screen.

**The Retail Sliding Scale (rows 61–69).** Eight bands, values written into `K`
and `N`, declining 100 % on a $10 part to 30 % on a $2,000 one, **with no band
above $2,500** so a $3,000 part falls off the end. ASSERTED as a published
policy. **LEAVE — and this is the honest verdict rather than the cautious one.**
The ordinals the Master Price File reads are keyed on **brand**; nothing in the
audit looks up a band label; no consumer is evidenced anywhere. Carrying it means
either building a reader for a policy nobody has confirmed is live, or storing
eight rows that nothing reads — and a governance value nothing reads is the exact
failure `QUOTE_FINDINGS.md` §3.5 records. **Re-open on one word from the owner
(Q7);** the shape is then an org-level 8-band ladder with an explicit top band,
and it is half a day's work once someone confirms it is real.

---

## 5 · THE FREIGHT MODULE

**The decisive fact, first.** Across four `Boat Module` snapshots spanning
February to August 2026, the *only* cell ever pulled from this workbook is
`FCL Import - Highfield!I35 = 128.47032624113476`, unchanged in six months. The
other two sheets carry `refreshError="1"` and **zero cached cells**
(`externalLink9.xml`). Nothing else in the Master Price File links here at all —
not the Quote Module, not the Rigging Module, not the Price Matrix, not the
Administration Module.

Three sheets, 24 charge lines, two forwarders and a distribution calculator
reduce, for the purposes of product data, to **one number that has not moved.**

### 5.1 · VERDICT — the forwarder sheets are a **SETTING**, per brand

Both sheets are the same instrument: total one forwarder's invoice for one
40-foot container, add a buffer, divide by the linear metres of boat that fit,
publish dollars per hull metre.

| | Highfield (`FCL Import`) | Surtees (`Quadrant Pacific`) |
|---|---|---|
| Seafreight CTD | `I34` 9,057.158 | `I34` 4,720.93125 |
| Sample container | `H35` **70.5 lm** | `H35` **10.7 lm** |
| Buffer | `D32` **0.10** | `D32` **0.05** |
| Per hull metre | `I35` **128.47** A$ | `I35` **441.21** A$ · `I36` **529.45** NZ$ |
| Quote date | `C6/D6` **2026-02-28** | `C6/D6` **22/04/2024** *(a text string)* |

**The 3.4× gap is the most important structural fact in the workbook.** Highfield
RIBs deflate and stack — 70 metres to a container. Surtees are welded alloy
hardtops — two fit. **This is not a freight rate, it is a packing-density rate,
and it is meaningless outside the brand it was measured on.**

**Ease of use.** There are two of them. A third appears only if the dealer starts
importing a third brand in its own containers. Nobody browses, searches or
maintains a *list* of container rates — a 22nd table for one number that changed
zero times in six months is the exact tax the owner is objecting to.

**Customisation.** A furniture dealer has no linear-metre container rate at all.
So it cannot be a constant in our source — but a per-brand field an admin edits
satisfies that without a table.

**Where it lands: on the brand's boat table, not in an org-wide bag** — because
the rate is meaningless without the brand it was measured on:

```
Highfield Inflatables  (kind boat, role base)
  freight.perHullMetre       128.47      A$/m
  freight.currency           AUD
  freight.buffer             0.10
  freight.containerSampleLm  70.5
  freight.source             "AWW Global Logistics · quote S00169820 · 2026-02-28"
  freight.appliesToColumn    ix          (this table calls it "Road Freight")

Surtees  (kind boat, role base)
  freight.perHullMetre       530.00      NZ$/m   ← what the human actually uses
  freight.currency           NZ
  freight.buffer             0.05
  freight.containerSampleLm  10.7
  freight.source             "Quadrant Pacific Ltd · invoice BQ00003235 · 22/04/2024"
  freight.appliesToColumn    iq          (this table calls it "Quad Freight")
```

**Five of the seven seeded boat tables carry no freight block at all, and that is
correct.** ASSERTED from `Boat Module!IX` across 1,927 rows carrying a Model
Code: Highfield is rate-driven on **1,146** rows and hand-typed on 418; every
other brand is hand-typed on every row (Stacer 223, Merry Fisher 39, Formosa 39,
Surtees 29, Haines 21, Stabicraft 2, Jeanneau 1). They hand-type per model and
they should keep hand-typing.

**`freight.source` is the field that earns its place.** The Surtees rate is
**two years and four months** older than the Highfield rate, is typed by hand
into 18 of 29 cells as `hull length × NZ$530.00` (= `I36` 529.4502 rounded to the
nearest ten, with no formula link anywhere), and **nothing in the Boat Module
shows that.** A dated, attributed rate on the table makes staleness visible
without anyone opening a workbook.

### 5.2 · **EMBEDDED — already done**, plus one column

`cost-build` exists (`src/types/model.ts:288`), `Road Freight` is in it (`:315`),
and `iq`/`ix` are on every seeded boat table under **each brand's own name**:
Stacer `Base Freight`/`Road Freight`, Stabicraft `ABP Compl.`/`Handling`, Surtees
`Quad Freight`/`Dazmac`, Jeanneau `Aus Spec`/`IYT Logistics`, Formosa `Freight`
with no `ix` at all (`src/demos/northside.ts:1266-1269, 1343-1346, 1425-1428,
1497-1500, 1720-1721`).

**Seven brands inside one dealer already need seven freight vocabularies.** That
is the customisation test answered by the data, before this app ever meets a
furniture dealer, and per-brand named columns in per-brand tables — which we
already have — is the only shape that survives it.

The one thing this study asks for is **one new column and one derivation**, so
that 1,146 Highfield rows stop being 1,146 copies of one formula:

```
Road Freight = ROUNDUP(«hull length column» × «table.freight.perHullMetre», −1)
               + Freight Uplift
```

`Freight Uplift` is a plain editable number in the same section — ASSERTED as
twelve distinct values across the 1,146 rows: 0 (560 rows), 50 (30), 100 (50),
150 (50), 200 (50), 250 (82), 1000 (62), 1100 (86), 1500 (52), 2000 (68), 2200
(40), 2300 (16). **Recomputed against the live rate, 1,146 of 1,146 agree
exactly** with the cached Boat Module values, so this is arithmetic and not a
model. Two rounding conventions coexist inside the 560 zero-uplift rows (315 to
`-1`, 245 to `0`) and must survive the import rather than be tidied.

**The derivation must bind to the column, not to a name.** The seven boat tables
call `G Hull Length` six different things — `Hull Length (Mtr)`, `Hull Length`,
`Hull Length (mtr)`, `Length (mtr)`, and Highfield's **`OA Length`**
(`northside.ts:1310, 1386, 1467, 1538, 1615, 1672, 1764`). This is
`MODULE_SYSTEM.md` §4 rule 2 — *never hand-write the binding list* — in its
smallest possible instance.

### 5.3 · **LEAVE** — the Freight Distribution Calculator

It is a per-container, per-physical-unit reconciliation: `F8 = C64/E64` (this
container's real rate), `F{r} = E{r}×$F$8` pro-rata by LOA, `G{r} = H{r}−F{r}` a
variance against a hand-typed *Actual CTD*, and `H66 = C64−H65` forcing the
residual onto one row banner-labelled `LOADED BOAT` so the container balances to
the cent.

**The direction of flow was tested on all six units in shipment S00177981/C:**

| | |
|---|---|
| calculator's computed output == `Boat Module!IX` | **0 of 6** |
| calculator's hand-typed *Actual CTD* == `Boat Module!IX` | **3 of 6** |

The three matches are RU230 300, RU230 300, CL460 600 — each exactly
`ROUNDUP(length × 128.47, −1)`, the standing rate copied *back in* as the
"actual". **Data flows into this sheet from the boat row, not out of it.**

**Ease of use.** It is keyed on stock numbers (`N014592`…) — individual hulls with
serial identity, which the catalogue does not carry and is not about. Its own
per-metre figure for this container is **$499.60** against the standing
**$128.47**, because the box went out with 25.2 metres in it instead of 70.5. It
is measuring a badly packed container, once, for a finance review, on paper — its
only named range is `Print_Area` and it was printed twelve minutes before the
workbook was last saved.
**Customisation.** If a dealer ever wants this, it wants a **received-shipment**
record — stock numbers, arrival date, invoice total, variance — which is a
different product with a different table and is not the ask.

It is workings. It belongs to whoever reconciles supplier invoices, and that is
not this app.

---

## 6 · THE ADMINISTRATION MODULE

**The finding that reframes the lens.** This workbook is not a standalone module;
it is the **settings file for the live quote workbook**. `11111BMT - Quote Module
2026.xlsx` carries `externalLink5` targeting `Administration Module.xlsx` and
references it as `[5]`, and **all three sheets are consumed, only by the Quote
Sheet**. Nothing in `MPF_GROUND_TRUTH.md`'s 1,430 lines carries a finance, bank
or document-type column. This is quote-time and document-time only, never product
data — which settles the verdicts before either test is applied: **nothing here
is a product table because nothing here describes a product.**

### 6.1 · Bank Details — **SETTING** for the block, **LEAVE** for the account

The sheet is a flat label/value card, `B2:E16`, zero formulas, zero validations,
six fields in three groups: account name, BSB, account number, then two card
surcharge rates (`D10 = 0.012`, `D11 = 0.0275`, both formatted `0.00%`), then a
payment reference convention (`D13 = "Surname / Deal #"`). One organisation, one
account, no row structure, no per-brand or per-branch notion anywhere.

**The surcharges are decorative.** ASSERTED by exhaustive search of the Quote
Sheet: **zero** formulas reference `J229` or `J230`, the cells that print them.
They are printed beside the words CREDIT CARDS as information. **A rate that no
arithmetic reads is a sentence, not a number**, and promoting it to a typed
percentage setting would invent a feature — a surcharge line on the quote — that
the source workbook does not have and the owner has not asked for. Carry them as
text inside the block. Q5 is where they become real, if he wants them to.

**LEAVE the account itself**, and the reason is three properties of what we are
building rather than squeamishness:

1. **We are local-first.** These values would sit in an origin-scoped browser
   database on every salesperson's laptop, unencrypted, surviving until someone
   clears site data.
2. **We export.** `ProjectExport.org?: OrgProfile` already exists
   (`src/types/model.ts:1051`), so **any field added to `OrgProfile` rides along
   in every export by construction, today, with no opt-out.** There is no
   mechanism to hold a field back, and building one to protect a field we chose
   to add is a self-inflicted wound.
3. **It is not ours to be right about.** A BSB is Australian. A US dealer has a
   routing number, a UK dealer a sort code, an NZ dealer a 15–16 digit account
   with no separate branch field. **A typed `bsb: string` fails the customisation
   test in the most literal way available: it is *wrong* outside one country, not
   merely inconvenient.**

**SETTING for the payment footer, as free text.** What the business needs is not
a stored bank account; it is that the printed document ends with a paragraph
telling the customer how to pay. A rich-text block the admin authors once —
"Payment Details" — which the app stores, never parses, never validates, never
computes with and never claims to understand. **Ease of use:** one text box,
authored at setup, never browsed. **Customisation:** a furniture dealer types
their own paragraph; an American dealer types routing/account; a dealer who takes
no direct deposit leaves it blank and the block does not print.

*The honest limit, stated rather than oversold: a free-text block can still be
filled with an account number. The difference is that the app has not asked for
it, has not modelled it, and does not present a labelled slot inviting it.*

### 6.2 · Finance Module — **SETTING** (a small repeating group)

The sheet holds a lender (`D6` Yamaha Finance), two empty contact fields, six
rate/term pairs (`D10:I10` = 9.50 / 8.75 / 8.25 / 7.95 / 7.50 / 7.50 %;
`D12:I12` = 7 / 6 / 5 / 4 / 3 / 2 years; `D13:I13 = D12*12`), a `$1,200`
establishment fee (`D15`), and three text blocks (`D18`, `D20`, `D22`). **There
is no calculator in it** — no `PMT`, no arithmetic beyond `years × 12`. It is a
rate card, a fee and a disclaimer library: the *inputs* to a calculator that
lives on the Quote Sheet.

**Not a TABLE.** Ease of use, applied literally: the list is **six rows and one
lender**, changed when the lender publishes a new rate card, edited in one
sitting, never browsed, never searched, never filtered, never joined to a boat.
No `TableKind` fits — `custom` here would be an admission of defeat. A table
means a left-panel row, a dashboard tile, an index page and a detail page to
browse six rows. The tax exceeds the value by a wide margin.

**Not EMBEDDED either, and this is worth being precise about**, because the brief
rightly pushes every lens toward `ColumnSection`. A section is a band of columns
on a product table, and **finance is not a property of a product**. No boat,
motor or trailer row has an interest rate. Finance attaches to the *deal*, after
every product is chosen. Forcing it onto a product table is the same category
error `src/types/model.ts:447-451` exists to prevent — *"a Boats table has NO
motor column and NO trailer column, because a motor is not a property of a
boat."* **Rejecting the obvious home is the finding here, not a failure to find
one.**

**SETTING, with internal structure** — the brief's own "small set" clause carries
the weight:

```
finance:
  lender        text      ("Yamaha Finance"; contact/phone slots exist and are empty)
  fee           money     ($1,200)   — ONE home, read by the quote
  depositPct    percent   (10 %)     — pulled in from the Quote Sheet
  monthlyAddOn  money     ($5)       — BLOCKED until the owner names it (Q1)
  ratesByTerm   repeating [ { termMonths, ratePct } × 6 ]
```

Rendered as a six-row editable grid inside the settings surface. **Customisation:**
a dealer with two lenders adds a second record; a dealer offering no finance
leaves it empty and no finance block prints; a dealer in another market types
their own terms.

**The three text blocks are document content and this is already solved.**
`hl-admin.md:415` records that HelmLogic's `content-blocks.ts` carried a closed
enum of seven block types including precisely `finance-info` and
`terms-and-conditions`, each with rich text, a `documentTypes[]` array, per-brand
overrides, versions and an `isLockedForQuotes` flag — and `hl-admin.md` calls
that layering *"exactly right"*. These three cells are that content. **The one
thing to fix when we carry it: the enum was closed.** The block *types* must be
data too.

**The `PMT` calculator is output, not data** — seven derived lines (total →
deposit → loan → fee → term → rate → repayment) rendered as a block on the quote
document, each line recording where its number came from, which is what the quote
model already does. Building it is the payoff for carrying the setting.

**And it closes a hole we already documented.** `hl-journeys.md:548-549` records
that `wantsFinance` and `financeNotes` have *"no consumer at all"*; §5.2 —
*"the whole step produces no output."* `AO164` on the Quote Sheet is the same
toggle (a `"Yes, No"` list validation gating `D185`) and there it **does** produce
output. **This workbook is the missing half of a feature our predecessor built
the front end of and abandoned.**

**Five live defects, all ASSERTED, each one changing a number printed for a
customer.** They are not stylistic complaints and they are the strongest argument
for bringing this into the app:

1. `BA4 = '[5]Finance Module'!$FD$10` — a typo for `$F$10`. `FD10` is empty, its
   paired term `BB4 = $F$13 = 60` is correct. **The 5-year / 60-month term quotes
   a monthly repayment at 0 % interest. Live today.**
2. `BA8`/`BB8` point at column `J`, which is empty — a seventh phantom row
   resolving to 0 % over 0 months.
3. The establishment fee is **duplicated, not linked**: `D15 = $1,200` here,
   `AO168 = 1200` as a bare literal on the Quote Sheet while every sibling input
   uses `[5]`. Change the fee and the quote keeps charging the old one.
4. `=PMT(AO170/12,AO169,(−AO167−AO168),0,0)**+5**` — five dollars added to every
   monthly repayment ever quoted, named nowhere in either workbook. Plausibly an
   account-keeping fee; **plausibly is not a finding.** Q1.
5. The 10 % deposit (`AN166 = 0.1`) lives on the Quote Sheet, away from every
   other finance input.

Defects 1, 2, 3 and 5 are one disease: **a settings file only partly wired to
what it configures.** In our app a value has one home and one reader, which is
the entire argument.

### 6.3 · Dropdowns — **SETTING**, an editable *open* vocabulary

Nine label/flag pairs, `C1:D9`: Display Sheet · Quotation · Contract · Tax
Invoice · Tax Invoice (Deposit Paid) · Contract (Stock Allocated) · Delivered
Deal · Deal at Admin Status · Deal Closed Down. One list doing two jobs — *what
document am I printing* and *where has this deal got to*.

**Not a TABLE.** Nine short strings nobody browses, searches or sits down to
maintain. A table here would be the purest form of the tax.

**Customisation is what makes this non-trivial and it must be met head-on.**
`hl-admin.md:415` records HelmLogic hardcoding this exact concept as a **closed
enum** — `quote / contract / motor-quote`. *Tax Invoice (Deposit Paid)* and
*Contract (Stock Allocated)* are **this dealer's** document set; a furniture
dealer has *Estimate*, *Sales Order*, *Proforma*. The vocabulary must be rows the
admin edits, not a TypeScript union.

**It is genuinely cross-cutting, and its link is already broken.** The Quote
Module mirrors `C1:C30` at **30 of 30** and `D1:D30` at **22 of 30** — the eight
missing cells are exactly `D2:D9`, precisely the eight rows that carry flags,
overwritten with the literals `1, 2, 2, 2, 3, 3, 3`. Labels live; flags dead.

**And this vocabulary is the natural key for conditional document content** — the
mechanism by which the payment block (§6.1), the finance disclaimer (§6.2) and
terms-and-conditions each declare which document types they appear on.
HelmLogic's `documentTypes[]` on every content block is exactly that join, and it
is the one place where all three sheets of this workbook meet.

**The 0/1 flag is UNRESOLVED and stays that way.** Two readings fit the evidence
equally — *(a)* does this document print the payment block (a display card and a
quotation do not tell you how to pay; a contract onward does), or *(b)* is this
deal committed. No formula in the Administration Module reads column `D`, and the
Quote Module's mirror is overwritten for every populated row, so no consumer is
observable in either workbook. Recording a guess here would put a policy into a
pricing system on the strength of a pattern in seven cells. **The vocabulary is
carryable without the flag; the flag is not.** Q9.

**Note the naming trap.** `Rigging Module (1).xlsx` also has a hidden `Dropdowns`
sheet, and its content is a self-mirror of its own `Rigging Kits!C`. `Price
Matrix.xlsx` and `Freight Module.xlsx` have none. **"Dropdowns" is a naming
convention across these files, not a shared vocabulary** — the Administration
Module's is the only one that governs a vocabulary other workbooks consume.

---

## 7 · WHERE A SETTING LIVES — because today it is nowhere

Seven of the twelve verdicts land on a surface the app does not have. That is not
seven problems; it is one, and it earns itself seven times over.

**The record exists. The editing surface does not.** `OrgProfile`
(`src/types/model.ts:438-442`) carries exactly three fields — `name`, `industry`,
`createdAt`. It sits on `ProjectMeta.org` (`:1012`), is persisted, is read by
`Shell.tsx:157`, and already travels in `ProjectExport.org` (`:1051`). A grep of
`src/types/` for `settings` returns nothing.

**The recommendation is therefore modest rather than architectural.**

1. **Grow `OrgProfile`** into the home for organisation-level business
   configuration. It is already on `ProjectMeta`, already persisted, already
   exported, and `EXPORT_VERSION` is already `2` with every added key optional
   (`:1030-1034`).
2. **Build one Organisation Settings surface** — a single page, panelled by
   concern. **One left-panel door, not six:**

| Panel | What it holds | From |
|---|---|---|
| **Identity** | name, industry, trading currency | exists |
| **Rates** | labour cost rate · labour sell rate · GST/tax multiplier · parts markup · freight uplift default · trade & sub-dealer discounts | Rigging §3.4, Price Matrix §4.2 |
| **Currency** | one row per currency: code, rate, direction, review date, note | Price Matrix §4.4 |
| **Margin ladder** | the rung *definitions* — name, basis, mode, default | Price Matrix §4.2 |
| **Documents** | the Payment Details block, finance-info, terms-and-conditions, each declaring its document types | Admin §6.1, §6.2 |
| **Finance** | lender, fee, deposit %, the six rate/term rows | Admin §6.2 |
| **Vocabularies** | document types, and whatever else becomes an open list | Admin §6.3 |

3. **Two things it must get right on day one**, both learned from evidence rather
   than invented:
   - **Ship the setting with its reader, in the same change.** `gstPercentage`
     sat unused while `1.1` was hardcoded in seven files
     (`QUOTE_FINDINGS.md:99-101`). A setting with no reader is worse than a
     constant, because it looks solved.
   - **Nothing in it may be a constant in our source** — including the option
     lists. A settings surface that hardcodes its own vocabularies has rebuilt
     the thing we exist to replace.

**Roughly what it costs.** The record is one additive optional field per concern
on a type that is already persisted and already exported, so there is no
migration: a v1 file arrives with none of them, which is the accommodation
`model.ts:1030-1033` already documents. The work is one page with seven panels,
two of which are repeating grids (currency rows, rate/term rows) and two of which
are rich-text blocks; plus the readers — the FX freeze on the quote line, the
labour rates in the rigging derivation, the finance block on the quote document,
the document-type option set. It is comparable in size to one of
`MODULE_SYSTEM.md` §10's phases, and about half of it is the readers rather than
the surface. **The surface without the readers is not cheaper — it is worthless,
and we have the receipt.**

---

## 8 · WHAT THIS MEANS FOR THE PRICE LADDER

`QUOTE_SPEC.md` §2 states the ladder in five stages and, for each rung, whether
the quote **computes** it, **reads** it, or **leaves it for a person**. Here is
what these four workbooks change, rung by rung, and what they do not.

### 8.1 · Stage A — cost

| Rung | Before | After | Evidence |
|---|---|---|---|
| Base Cost | read | read, unchanged | — |
| Freight / duty / charges | read (hand-typed values) | **computable on one brand**: `ROUNDUP(hull length × 128.47, −1) + Uplift` | 1,146 of 1,146 recompute exactly (§5.2) |
| **Landed Hull Cost** | read | **read — still not computable** | see below |
| Motor / trailer / part cost ladders | read | unchanged | — |

**Road Freight is the one rung that moves from typed to derived, and only on the
brand that has a rate.** That is 1,146 of the 1,927 boat rows carrying a Model
Code in the source workbook — **59.5 %** — and in the current seed exactly one of
seven boat tables. The other six keep hand-typed numbers, correctly.

**Landed Hull Cost still cannot be computed, and it is worth saying why
precisely.** `Boat!IY = (SUM(IM:IV)/IJ) + IW + IX` needs nine cost components
(`IM:IV`) and an FX rate (`IJ`). **None of the nine is a column in
`src/demos/northside.ts`, and neither is `IJ`** — `EX Rate` and `Currency` exist
only as presets on the `boat` kind (`src/types/model.ts:311, 313`), not as seeded
columns on any of the seven brand tables. What we hold is `iy` as a *value*.
Knowing the four exchange rates does not change that; it lets us **record** the
rate a landed cost was struck at, which is §4.4's three fields on the quote line,
and it lets us write a constraint that checks a landed cost against its
components the day those components are imported. It does not let us recompute
one.

### 8.2 · Stage B — pre-delivery, installation, registration

`QUOTE_SPEC.md:134` says flatly: *"We hold none of the rates."* That sentence is
still true, and it needs one amendment and one correction.

**The amendment.** We now know the two rates and can cite them —
`Service Module.xlsx!Labour Rates!$G$14 = 130.09090909090907` (cost) and
`!$H$9 = 159` (sell), driving 1,264 formula cells in the rigging sheet alone.
**They are still in an eighth workbook nobody has sent us**, so they are a
*cited* value, not a held one, and §7 is where they go the day they arrive.

**And they are already inside our data, frozen, invisible.** DERIVED from the
seeded `parts` table: `Labour ($)` ÷ `TTF (Hours)` = **130.0909090909…** on 4 of
4 rows checked (6.504545454545454 / 0.05 · 32.522727272727266 / 0.25 ·
58.54090909090908 / 0.45 · 195.1363636363636 / 1.5). The labour cost rate is not
absent from HelmLogic Dynamic Config. It is multiplied into a hundred cells of
seeded product data with nothing naming it — which is the single clearest
illustration of why §7's Rates panel is worth building.

**The correction.** `QUOTE_SPEC.md:132` records rigging install as
`'[8]Rigging Kits'!CB13:CB20` and `:197` prices a rigging kit at
`'[8]Rigging Kits'!CB9`. **Column `CB` is column 80. The `Rigging Kits` sheet
declares `dimension ref="A1:BM3039"` — `BM` is column 65 — and its last populated
column is `BE` (55).** Those references cannot be read from the workbook we now
hold. The live columns are `P`/`V` for install and `K`/`AC` for the kit. Either
the Managers View is pointing at a differently-shaped version of this file or the
reference is stale; **I am not asserting which.** `QUOTE_SPEC` §2.3 and §2.5
should be amended to name `K`, `V` and `AC`, with the discrepancy recorded.

Boat pre-delivery, boat registration, fuel and detailing are unchanged: **still a
person's line.** Nothing in these four workbooks supplies a PD-hours column, a
fuel price or a registration table.

### 8.3 · Stage C — markup

`QUOTE_SPEC.md:176`: *"The quote applies no markup, on any line, ever."*
**Unchanged, and now better founded.** The Price Matrix explains where `Cash`,
`Trade` and `Sub Dealer` came from without giving us any reason to recompute
them — they are hand-maintained rungs the business already approved and rounded
(`ROUNDUP(…,−1)` upstream), and re-deriving them would replace a number a person
approved with a number a program guessed.

**What the ladder gains here is an audit, not a computation.** With the brand's
ladder stored as table settings we can write a constraint —
`Trade == ROUNDDOWN(Cash × (1 − tradeRung))` — that would have caught, at seed
time, that `Trade = Cash × 0.95` and `Sub Dealer = Cash × 0.825`
(`HELMLOGIC_GROUND_TRUTH.md:187`) are **Highfield's row 14 applied to seven
brands**, six of which carry `0 %` in both columns.

**One reconciliation that did not close, stated plainly.** `HBS113`'s Cash 41,340
against landed 25,010.00 implies ≈50.25 % markup, matching no percentage on
Highfield's row (`N14` 47.50 %, `K14` 45.00 %, `O14` 50.00 %). Trade and Sub
Dealer close to the cent; Cash does not — consistent with
`MPF_GROUND_TRUTH.md:875`'s finding that **four independent Cash rules are live
simultaneously**. No rule is asserted for that rung.

### 8.4 · Stage D — the rung a line is priced at

**This is where the rigging workbook changes the product.**

`QUOTE_SPEC.md:197` and `src/features/quote/pricing.ts` both currently say a
rigging line carries **no number** and says so out loud. The number exists: `AC =
K + V`, median **$3,370** on a live pairing, maximum **$44,310**, on 204 distinct
kits ever named by a live boat. That sentence can be deleted the day `rig_kits`
lands.

**And it forces a prerequisite into the open.** `pricing.ts`'s `NAMED_LEVELS`
resolves accessory prices by **exact column name** — `Sell` and `Sell inc Install
(if appl.)`. `rig_kits`' own headers are `Kit Sell Price` (`K`), `Trade Price`
(`L`) and `Sell Price` (`AC`). Under the allow-list a rigging kit prices at
nothing; renaming the workbook's columns to satisfy our resolver would be lying
about the source. **So `EntityDef.priceLevels` — already requested at
`quote/index.ts:44-53` and listed in `MODULE_SYSTEM.md` §9 — stops being a
nice-to-have and becomes the thing that must land first.** `rig_kits` declares:
`cash → Kit Sell Price` · `trade → Trade Price` · `fitted → Sell Price`.

The second addition is the labour: **Rigging Kit Labour (Hrs)** ← `O` on the
join, which `Boat Module!UH` already computes and overrides on 0 of 2,436 cells.

### 8.5 · Stage E — the customer's box

The Administration Module adds a **block, not a rung**: quote total → 10 %
deposit → loan amount → establishment fee → term → rate → monthly repayment,
each line recording where its number came from. It is the only part of the price
ladder that lives entirely outside `MPF_GROUND_TRUTH.md`, and it is blocked on
two owner answers (Q1, the unnamed `+5`; Q4, whether the deposit is policy).

**Tax is unchanged and nothing here supplies it.** All four workbooks hardcode
`×1.1` inside their consuming formulas. `QUOTE_SPEC.md:265` already has the right
answer — an optional `taxRate` typed by a person, blank by default, printing the
inclusive sentence — and §7's Rates panel is where a default for it would live.
**The Price Matrix is not the home of GST and never was: there is not one dollar
figure and not one tax rate anywhere in the brand block.**

### 8.6 · The honest tally

Of `QUOTE_SPEC.md` §2's five stages, these four workbooks touch **three**:

- **A** — one rung (Road Freight), one brand, 1,146 rows, now derivable.
- **D** — one line kind (rigging) moves from *unpriced* to *priced*, and drags
  `EntityDef.priceLevels` forward with it.
- **E** — one new block (finance), blocked on two answers.

They touch **neither B nor C**. Pre-delivery, registration, fuel and detailing
remain a person's typed line, and the quote still applies no markup, ever. **What
the four workbooks mostly deliver is not computation. It is provenance** — the
ability to print *"Road Freight $950 = 5.4 m × $128.47/m (AWW Global Logistics,
quote S00169820, 2026-02-28) + $250 uplift"* instead of *"Road Freight $950"*.
That sentence is worth more to a salesperson than a 22nd table.

---

## 9 · THE COST OF CARRYING IT ALL

The ease-of-use argument, made with numbers.

### 9.1 · If every verdict were TABLE

| Workbook | Sheet | Rows | Columns |
|---|---|---:|---:|
| Rigging | Rigging Kits | 1,244 | 47 |
| Rigging | Rigging Spec Enquiry | 818 | 1 |
| Rigging | Dropdowns | 1 | 2 |
| Price Matrix | Price Matrix | 47 | 17 |
| Price Matrix | Exchange Rates | 4 | 4 |
| Price Matrix | Exchange Rate Calculator | 40 | 5 |
| Freight | Freight Distribution Calculator | 6 | 7 |
| Freight | FCL Import - Highfield | 12 | 10 |
| Freight | Quadrant Pacific - Surtees | 14 | 10 |
| Admin | Bank Details | 6 | 2 |
| Admin | Finance Module | 6 | 2 |
| Admin | Dropdowns | 9 | 2 |
| | **12 new tables** | **2,207** | **109** |

**What the left panel becomes.** 48 entities today → **60**. The `ACCESSORY`
group goes from 1 table to 3; four of the twelve would land in `CUSTOM`, which
`MODULE_SYSTEM.md` §2 already names as the admission of defeat. Twelve new
dashboard cards if each also got a module, against the two worked modules the
plan proposes.

**And of the twelve, exactly one passes the ease-of-use test.** `Rigging Kits`
has 1,244 hand-maintained rows with dated band headers. The other eleven total
**963 rows**, of which roughly 900 are one-off invoice workings, mirrors of
columns that already exist, or scalars: four exchange rates, two container rates,
six finance rows, nine document types, six bank fields, one price-checker gadget
and an 818-row copy of a column we would already be importing. **One in twelve.**

### 9.2 · What the verdicts above actually cost

| | Cost |
|---|---|
| **New tables** | **1** — `rig_kits`, 622 live rows (1,244 imported with an `Obsolete` boolean), 46 columns of which 10 collapsed |
| **New dashboard cards** | **0** — `rig_kits` is reached only through the pair picker and Related blocks |
| **New left-panel entries** | **2** — `rig_kits` under `ACCESSORY` (48 → 49 entities), and one door for Organisation Settings |
| **New columns on product tables** | **2** — `Freight Uplift` on the one brand with a rate; `Landing MU` on `parts` in the existing `Supply Pricing` section |
| **New columns on join tables** | **16** — `Rigging Kit Labour (Hrs)` and `Rigging Sell`, in the `Rigging` section that already exists on all eight boat × motor joins |
| **Type changes** | **8** — the `rig` column, `text` → `reference` |
| **New table-level metadata** | a `freight` block on 2 of 7 boat tables; margin-ladder values on up to 18 tables. Neither is a row or a column |
| **New settings surface** | **1 page, 7 panels** — which the app needs regardless of these four workbooks |
| **Derivations added** | **1** — Road Freight on rate-bearing brands |
| **Contract additions** | `EntityDef.priceLevels` (already requested), a `freight` block on `EntityDef`, a margin-ladder block on `EntityDef`, and additive optional fields on `OrgProfile` |

**Eighteen columns and one table, against twelve tables and 109 columns.** The
ratio is roughly six to one, and it is not achieved by discarding anything: every
number in all four workbooks is either carried, cited, or explicitly left with
its reason written down.

### 9.3 · The one place the tests genuinely conflict

`rig_kits`. Ease of use says a 622-row table is a real cost; customisation and
correctness say 100.00 % of 10,540 live rigging cells resolve into
`Rigging Kits!C`, which makes the existing text column **a foreign key wearing a
costume** — the exact argument `FITMENT_RULES.md` R6 used to *reject* the
single-valued parts as a join, run in the other direction. There the partner set
was 17 values; here it is 204 distinct kits, each with 46 columns, money and
labour hours of its own.

The resolution is the one this document keeps returning to: **a table is not a
module.** The cost the owner is worried about is a place on the dashboard and a
page to learn. This is a row in a picker.

---

## 10 · OPEN QUESTIONS

Each is a real fork. The answer changes the build.

1. **What is the `+5`?** `Quote Sheet!AO171` adds five dollars to every monthly
   repayment ever quoted and nothing in either workbook names it. *Blocks the
   finance block entirely — we will not carry an unnamed constant into a
   customer-facing figure.*

2. **Do you know the 60-month finance rate is broken?** `BA4` points at
   `'[5]Finance Module'!$FD$10` instead of `$F$10`, so the 5-year term quotes at
   0 % interest. Live today. *Changes nothing we build; changes what you do this
   week.*

3. **Does the app store a bank account, or only a payment paragraph?** We
   recommend the paragraph, for the three reasons in §6.1 — and note that
   `ProjectExport.org` (`model.ts:1051`) mails anything on `OrgProfile` to every
   recipient of every export, forever. *Changes whether `OrgProfile` needs an
   export-exclusion mechanism it does not have.*

4. **Is the 10 % deposit fixed policy, or a per-deal starting point?** It
   currently lives on the Quote Sheet (`AN166`), furthest from every other finance
   input. *Changes whether it is a setting or a quote-time field.*

5. **Should the card surcharges compute, or only print?** Today `J229`/`J230`
   have zero readers. If computed: on the GST-inclusive or ex-GST total, and on
   the deposit or the balance? *Changes a setting from text into two typed rates
   plus a quote line.*

6. **One lender, or several?** Two contact fields sit empty. *Changes the shape of
   the finance setting — a record, or a repeating group of records — not the
   verdict.*

7. **Does the Retail Sliding Scale drive anything?** Eight bands, rows 61–69, no
   consumer evidenced anywhere in the Master Price File audit. *Changes it from
   LEAVE to an org-level 8-band ladder, and requires a top band above $2,500,
   which the sheet does not have.*

8. **`Other` (`K`) or `Sell` (`N`) — which feeds `BMT - MU`?** Identical on 46 of
   47 rows; they differ only on Highfield (45.00 % vs 47.50 %), the largest brand
   in the catalogue. *Changes which rung the ladder definition names, and the
   price of every Highfield hull.*

9. **What does the 0/1 flag on the Administration Dropdowns mean?** Two readings
   fit and no consumer is observable. *Changes whether the document-type
   vocabulary carries one field or two, and whether document content can be gated
   by it.*

10. **The Highfield freight sheet's exchange-rate cell does nothing** — `F10 =
    I10 × H10` derives the USD display *from* the typed AUD, so moving the USD
    rate does not change the landed rate. The Surtees sheet is wired the other
    way (`I10 = F10 / H10`) and is rate-sensitive. *One of the two is wrong and it
    is your call which. Changes whether `freight.perHullMetre` is stored in AUD
    or in the origin currency.*

11. **Does `Parts Maintenance!H Landing MU` read `I Reviewed` or `J CTD`?**
    Ordinal 7 anchored at `C` lands on a date; anchored at `D` it lands on a
    markup. *Changes nothing if we import the value; changes everything if anyone
    ever re-derives it.*

12. **Do we carry the 622 obsolete rigging kits?** 153 live pairings name one, 9
    as the boat's standard fit (Stabicraft rows 178–194). *We recommend yes, with
    an `Obsolete` boolean and a warning on the pair — the alternative is 153
    pairings pointing at nothing.*

---

## APPENDIX · WHAT WAS AND WAS NOT DONE

Read-only throughout. No workbook in `C:/Users/AsafA/Downloads/` was opened for
writing, saved, moved or renamed. No file under `src/` or `tools/` was created or
modified; `src/demos/northside.ts` was read and grepped only. No account number,
BSB or credential-like value was read into this document, any scratch file, or
any tool output that persists.

The four lenses and their scripts are the reproduction path:
`scratchpad/study-rigging.md` (`rig/r1_struct.py` … `re_explain.py`,
`rb_rules.py`, `r9_cachediff.py`), `scratchpad/study-pricematrix.md` (`dump.py`,
`meta.py`, `ext.py`, `scan.py`, `lock.py`, `cnt.py`, `cnt2.py`, `rig2.py`),
`scratchpad/study-freight.md`, `scratchpad/study-administration.md`
(`probe_admin.py`, which redacts two cells by coordinate).

**Three files this document asks to be edited, and by whom:**
`docs/specs/FITMENT_RULES.md` §6.5 and Appendix B item 2 (strike and replace —
§3.1); `QUOTE_SPEC.md` §2.3 and §2.5 (the `CB` column references — §8.2);
`docs/specs/HELMLOGIC_GROUND_TRUTH.md:187` (record that the two "constants" are
Highfield's row 14 — §4.1).
