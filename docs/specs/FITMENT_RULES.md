# FITMENT RULES — what relates to what, why, and how much of it we carry

**Status:** adjudicated specification. Implementers build from this file.
**Sources:** `C:/Users/AsafA/Downloads/*.xlsx`, opened **read-only** and never
written. Five lens reports (`scratchpad/map-*.md`), `MPF_GROUND_TRUTH.md`,
`QUOTE_FINDINGS.md`, `hl-modules.md`, `MODULE_SYSTEM.md`, and the six rules
already adjudicated in `src/features/constraints/workbookRules.ts`.
**Independent re-measurement:** `scratchpad/adj/a1_rig.py` … `b2_hfrule.py`.
Every figure below that carries the mark **†** was re-computed by this
adjudication from the raw extracts, not taken from a lens.

---

## 0 · HOW TO READ THIS FILE

Every relationship and every rule below carries four things, in this order:

1. **The statement**, in one sentence.
2. **The evidence** — sheet, column, cell, formula, and the measured rate.
3. **ASSERTED** (a formula, a data validation, a stated header, a Min/Max
   pair, an explicit cross-sheet link, a literal divider label) or
   **OBSERVED** (a pattern in the values, always with a number on it).
4. **ADMIT** or **REJECT**, with the threshold defended.

### The thresholds this adjudication used, stated once so they can be argued with

| Test | Threshold | Why |
|---|---|---|
| A **join key** is admissible | ≥ 98 % exact match, and the far-side key column ≥ 99 % unique | below that the importer is guessing, and a wrong pair is worse than a missing one |
| A **rule** is admissible as a filter | ≥ 99 % on the workbook's own pairings **and** it must reject something | a rule that keeps 95 % of the catalogue has not selected anything |
| A **rule** is admissible as a warning | ≥ 95 % and a named, countable exception set | the exceptions must be listable, or it is a correlation |
| An **observation** is reportable | any rate, stated with numerator and denominator | never the word "usually" |
| A rule that rejects the business's own recommendation | **REJECT outright** | this is the A2 failure, recorded once already; it does not get made twice |

### The row universe, fixed for every number in this file

`Boat Module` **data row** = a row carrying a Model Code in `D`, excluding the
thirteen band header rows (1, 2, 3, 143, 200, 226, 233, 248, 262, 278, 280,
955) and the `A1005 OBSOLETE` divider.

**2,005 data rows. 812 LIVE (rows 4–1004). 1,193 OBSOLETE (rows 1006+).†**
Live figures are quoted first throughout, because live is what the app carries.

---

## 1 · SIX SETTLEMENTS — where the lenses disagreed, and the arithmetic

The five lenses contradict each other in six places. Four of the six matter
enough to change what gets built. Each is settled here by re-measurement, not
by preferring one report.

### 1.1 · Rigging membership — 79.4 % versus 53.6 %. **53.3 % is correct.**

`map-parts.md §2.3` reports that a boat's rigging cell is a member of the
motor's own `Motor Library!DA:EX Rigging Option - 01..50` list on **79.4 %** of
cells, and equals `Rigging Option - 01` on **69.9 %** — and concludes "the
picker is not freehand; it is choosing a row from a menu the Motor Library
hands it." `map-motors.md §4b` reports **53.65 %** live for the same test and
concludes the opposite.

Re-measured (`adj/a1_rig.py`†):

| test | live | all rows |
|---|---|---|
| membership over **every populated rigging cell** (map-parts' denominator) | 8,394 / 10,540 = **79.64 %** | 20,640 / 26,018 = **79.33 %** |
| of which: cells where **both** the motor slot and the rigging slot are the NR sentinel | **6,296** | **16,267** |
| membership over cells with a **real motor and a real rigging kit** | 2,098 / 3,933 = **53.34 %** | 4,373 / 9,176 = **47.66 %** |
| equals `Rigging Option - 01` on real pairs | 1,066 / 3,933 = **27.10 %** | 1,888 / 9,176 = **20.58 %** |

**map-parts' 79.4 % is reproduced exactly and is a denominator artefact.**
`NR - ENGINE NOT REQUIRED` is a real Motor Library row (`C502`) whose
`Rigging Option - 01` is `NR - RIGGING KIT NOT REQUIRED` — so 16,267 of the
20,640 "matches" are one sentinel matching another. Strip them and membership
falls to **53.3 % live**, and the "69.9 % take the default" figure falls to
**27.1 %**.

**SETTLED: `map-motors` is right.** The motor does not usefully constrain the
rigging kit. This kills the proposal to import `Motor Library!DA:EX` as a
domain (§4.7 below) and confirms rigging belongs on the pair.

### 1.2 · The trailer rule — a weight rule versus a brand rule. **Brand.**

`map-boat-row.md §5a` reports `Trailer!K ATM ≥ boat weight` at **219/219
(100 %)** across five bands and proposes it as the trailer rule.
`map-trailers.md §4.1` reports the same relationship at 100 % and calls it
"worthless" because it selects nothing.

Both are true. Discrimination is the tiebreak, and neither lens measured it the
same way. Re-measured over the **434 live trailers**, per boat (`adj/a3_gate.py`†):

| gate | hit rate on live pairings | share of the live catalogue it leaves |
|---|---|---|
| `ATM ≥ boat weight` | **530 / 530 = 100.00 %** | mean **97.70 %**, median **100.00 %**, min 48.33 % (n = 1,696 boats) |
| series banner names the boat's brand | **581 / 581 = 100.00 %**, 0 counter-examples | **0.92 % – 7.83 %** by brand (Highfield 12 of 434 = **2.76 %**; Stacer 34 = 7.83 %; Stabicraft 26; Formosa 24; Haines 16; **Surtees 22**; Cap Camarat 5; Merry Fisher 4) |

##### CORRECTED 2026-08-21 — Surtees was **14** in this table and is **22**

The discrimination column was re-measured on 2026-08-21, twice, and neither
pass went through the app. One read `C:/Users/AsafA/Downloads/Trailer
Module.xlsx` directly with `openpyxl` — a row is a trailer when column `C`
carries text and column `E Code` is filled; its banner is the nearest preceding
`C` cell that has **no** `E Code`; it is live when it sits above the
`OBSOLETE TRAILERS` divider at row 656. The other read the generated seed
`src/demos/northside.ts`, taking each trailer row's own `series` value and
excluding the retired table. A brand matches its banner on a whole-word test,
so `Stacer` cannot be found inside another word.

The two passes agree exactly. Both count **434 live trailers**; joined on each
seed row's `src` cell they cover the same 434 workbook rows with **0 banner
mismatches**. Seven of the eight per-brand figures stand, and one does not:

| brand | this table said | re-measured 2026-08-21 | |
|---|---|---|---|
| Highfield | 12 of 434 = 2.76 % | 12 of 434 = **2.76 %** | agrees |
| Stacer | 34 = 7.83 % | 34 of 434 = **7.83 %** | agrees |
| Stabicraft | 26 | 26 of 434 = **5.99 %** | agrees |
| Formosa | 24 | 24 of 434 = **5.53 %** | agrees |
| Haines | 16 | 16 of 434 = **3.69 %** | agrees |
| **Surtees** | **14** | **22 of 434 = 5.07 %** | **CORRECTED** |
| Cap Camarat | 5 | 5 of 434 = **1.15 %** | agrees |
| Merry Fisher | 4 | 4 of 434 = **0.92 %** | agrees |

Surtees stands on three banners, not two: `REDCO - Surtees Trailers` (6 rows),
`REDCO - Surtees Alloy Trailers` (8) and `GFAB - Surtees Series (as at
6.07.2026)` (8). **14 was the first two.** The third was lost to a reading of
column `A` rather than column `C`, and R11 below now says so and lists it. The
app had already been computing 22 from the seed, and an independent whole-word
matcher written from scratch agreed at 22 before this pass ran: the app is
right and this table was stale. **The `0.92 % – 7.83 %` range is unchanged** —
5.07 % sits inside it and its endpoints are still Merry Fisher and Stacer.

The eight cells now sum to **143**, which is `Series Brand`'s corrected coverage
in §6.4 and the figure the app already shows. With `Surtees 14` they summed to
135, which is what §6.4 used to say: **the two figures were stale together, by
the same eight rows, and they are consistent again.**

**Not re-measured, and left alone:** the hit-rate column (581/581, and the
per-brand pairing rates below). Only the discrimination column was in scope.

##### A KNOWN LIMIT, DELIBERATELY NOT FIXED — Cap Camarat and the token floor

Cap Camarat's cell in this table is **5** and is correct. A *different* Cap
Camarat reading — the model-designator corroboration under R11, which asks how
many of a brand's hulls are offered a trailer whose text names that hull's own
model — reads **0 of 11** for Cap Camarat, and that is a limit of the reading
rather than a disagreement with R11. Cap Camarat models are designated `5.5`,
`6.5`, `7.5`; their cradles carry `CC5.5`, `CC6.5`. The designator is two
characters and sits inside a longer token, and the tokenizer
(`src/features/constraints/trailerFitment.ts`, `designators()`) keeps tokens of
three characters or more. **Lowering that floor to force a pass would be
fitting the rule to the answer, so it stays at three and the reading stays 0.**
This has now been derived three times. It is written here so it is not derived
a fourth. The denominator is **11**, not the 10 that circulated: 10 was measured
on the pre-full-scale sample seed, and against the seed as it now stands
`trailerFitment.test.ts` asserts eleven Cap Camarat hulls and **0** of them
naming their own model.

**SETTLED: the series banner is the selector; ATM is a floor.** A gate that
leaves 97.7 % of the catalogue has not chosen a trailer. A gate that leaves 3 %
has. `map-trailers` is right and its 615/615 is corroborated at 581/581 on a
narrower testable cut, with per-brand 100 % for Stacer (142/142), Stabicraft
(121/121), Surtees (29/29), Highfield (197/197) and Formosa (92/92).

### 1.3 · The trailer join key — name versus code. **Name.**

`map-quote.md §6.3` concludes: *"the trailer's real key is the code inside the
name (`Trailer!E Code`), and the join is being done on `Trailer!C Name`."*

Re-measured (`adj/a3_gate.py`†), over 476 trailer rows:

| key column | distinct values | rows carrying a duplicate |
|---|---|---|
| `Trailer Module!C` **Brand / Make / Model** | **474** | **2** |
| `Trailer Module!E` **Code** | 459 | **13** (`SRW5.7M-13TB` ×4, `AS5.7M-13TB` ×4, `TA800T-EH1` ×2, `RS610T-MO Stabicraft` ×2, `TA1595T13SB` ×2, …) |

The same holds in every other library (`adj/a8_keys.py`†):

| library | key column | rows | distinct | duplicated |
|---|---|---|---|---|
| Motor Library | `C MODEL` (name) | 501 | **474** | 27 *(all Jeanneau/Merry Fisher factory boat+engine packages)* |
| Motor Library | `D MODEL` (code) | — | 280 | **51** |
| Parts Maintenance | `C` | 3,162 | 3,130 | 25 |
| Rigging Kits | `C` | 1,284 | 1,271 | 3 |

**SETTLED: the display name in column `C` is the primary key of every library,
and the code is a worse key in both places it was proposed as a better one.**
`map-quote`'s underlying observation is still real and still actionable — 13 of
15 quote-side trailer misses are the same physical trailer under a second
marketing name — but the fix is to carry `Code` as a **secondary reconciliation
key**, never to promote it. See the importer contract, §6.3.

### 1.4 · Pair identity — is `(boat, motor)` unique? **No, and neither is `(boat, motor, rigging)`.**

`map-quote.md §3.3` says a `(boat, motor)` unique constraint would destroy
1,657 real offerings and proposes making the rigging kit part of the pair's
identity. Re-measured on live rows (`adj/a9_dup.py`†):

| identity | distinct | rows a UNIQUE constraint would delete, of 4,018 live motor edges |
|---|---|---|
| `(boat, motor)` | 3,377 | **641 (15.95 %)** |
| `(boat, motor, rigging kit)` | 3,626 | **392 (9.76 %)** |
| `(boat, motor, rigging kit, prop description)` | 3,754 | **264 (6.57 %)** |

**SETTLED: there is no natural key.** Adding rigging recovers only 249 of the
641. 264 live edges are byte-identical across two slots of the same row.
**The pair's identity is its slot index.** `PAIR_ORDER_FIELD` is therefore not
decoration — it is the primary key of a join row, and the importer must never
dedupe.

### 1.5 · Shaft length — 99.92 %, and the 52 exceptions have a name

`map-motors.md §1c` reports the boat's `KX Shaft Lgth` agreeing with the
motor's `Motor Library!F Shaft Length` on **3,836 of 3,839 live cells =
99.92 %**, having first excluded "129 cells whose value is not a Motor Library
model (factory packages)".

Re-measured without that exclusion (`adj/a5_shaft.py`, `a6_miss.py`†): 3,902 of
3,957 = **98.61 %**, with **55 misses**. Broken down:

* **3 are typos** — `Yamaha - F115LB` where `F115XB` was meant (row 115), and
  `F115XB2` where `F115LB2` was meant (rows 137, 138). Named in
  `map-motors.md §1c` and confirmed.
* **52 are Haines Signature factory boat+engine packages** — `SIG 620BRX w
  Yamaha - F200XSA2 (White)` ×11, `SIG 543SF CC w Yamaha - F150XSA2 (White)`
  ×9, and so on. The boat row says `LS` (20"); the packaged motor is a 25"
  X-shaft.

**SETTLED: 99.92 % is correct for loose motors (3,902 / 3,905†), and the
exclusion is not "not in the library" — those 52 packages ARE in the library.
The exclusion is "the value is a boat+motor bundle, not a motor."** That is a
sharper, checkable importer condition and it is written into §6.2.

### 1.6 · Slot depth — "declare four slots" is the wrong instruction

`map-boat-row.md §8` recommends declaring 4 dealer-fit slots instead of 42, and
6 trailer slots instead of 10. `map-quote.md §7.4` recommends trimming the
recorded fan-out to what is used.

Both mistake a **column count** for a **row count**. A join table has rows, not
slots. The number of source columns the importer reads is free; the number of
join rows is what the app carries. Re-measured (`adj/a4_depth.py`†):

| declared depth | dealer-fit edges lost, of 1,517 live |
|---|---|
| 4 slots | **25 (1.65 %)** |
| 6 slots | 9 (0.59 %) |
| **42 slots (all)** | **0** |

**SETTLED: read every column, emit a row per non-sentinel value, and let
`__order` carry the slot index. Declared depth becomes a UI default only** —
collapse the block past slot 4 (98.35 % of dealer-fit edges live in slots 1–4†),
past slot 3 for trailers (91.20 %†), past slot 6 for motors. Nothing is dropped
at import to make a screen shorter.

---

## 2 · THE FAN-OUT, MEASURED — what one live boat row assigns

All figures re-computed (`adj/a7_pairs.py`†), sentinel-filtered per §6.1.

| band | boats | motor edges | motor×rigging pairs | trailer | dealer-fit | P/D parts | single-valued parts |
|---|---|---|---|---|---|---|---|
| Stacer | 91 | 448 | 414 | 148 | 0 | 363 | 273 |
| Stabicraft | 37 | 240 | 237 | 134 | 111 | 204 | 185 |
| Surtees | 19 | 145 | 141 | 74 | 0 | 39 | 57 |
| Jeanneau | 4 | 52 | 52 | 0 | 6 | 20 | 16 |
| Merry Fisher | 12 | 113 | 113 | 6 | 45 | 54 | 47 |
| Cap Camarat | 11 | 113 | 81 | 12 | 0 | 44 | 33 |
| Haines Signature | 9 | 117 | 117 | 18 | 0 | 0 | 36 |
| **Highfield** | **590** | **2,520** | **2,520** | 198 | **1,355** | **1,707** | **1,764** |
| Formosa | 39 | 270 | 270 | 92 | 0 | 130 | 117 |
| **TOTAL** | **812** | **4,018** | **3,945** | **682** | **1,517** | **2,561** | **2,528** |

**Distinct partners ever named by a live boat row†:** 215 motors · 215 rigging
kits · 130 trailers · 83 dealer-fit packages · 42 P/D parts · 17 single-valued
parts.

Two arithmetic identities worth keeping, because they are the integrity checks
the importer should assert:

* **4,018 motor edges = 3,945 motor×rigging pairs + 73 motor slots with no
  rigging kit.**
* **4,171 rigging cells (map-boat-row §1) = 3,945 pairs + 226 orphans** —
  rigging kits named in a slot whose motor reads `NR - ENGINE NOT REQUIRED`†.
  (`map-parts` counted 403 and `map-quote` 401 across all rows; the all-rows
  figure here is **419**†. The spread is entirely the sentinel definition,
  which is why §6.1 fixes it.)

### 2.1 · Slot depth, live†

| group | slot fill (1 → n) | cumulative share |
|---|---|---|
| **Motor** (13 declared) | 810 · 719 · 626 · 460 · 340 · 309 · 225 · 182 · 112 · 91 · 65 · 55 · 24 | slot 6 = 78 % · all 13 genuinely used |
| **Trailer** (10 declared) | 350 · 194 · 78 · 44 · 15 · 1 · **0 · 0 · 0 · 0** | slot 3 = 91.20 % · **slots 7–10 hold `TRAILER NOT REQUIRED` on 811 rows and nothing else, ever** |
| **Dealer-fit** (42 declared) | 625 · 415 · 251 · 201 · 12 · 4 · 1 · 0 · 1 · 1 · 1 · 1 · 0 · 1 · 1 · 1 · 1 · **0 ×25** | slot 4 = **98.35 %** · deepest ever used = 17 |
| **P/D parts** (10 declared) | 743 · 631 · 624 · 351 · 73 · 126 · 6 · 3 · 2 · 2 | **non-monotone** — slot 6 (126) exceeds slot 5 (73); the ladder is not a rank |

---

## PART ONE · THE ADJUDICATION

### 3 · RELATIONSHIPS

---

#### R1 · BOAT × MOTOR — thirteen curated slots

**Statement.** A boat row names up to thirteen motors, in order, the first of
which is its standard fit.

**Evidence.** `Boat Module!KZ` headed `Recommended Motor Option` and
`LF, LL, LR, LX, MD, MJ, MP, MV, NB, NH, NN, NT` headed `Motor Option 2..13`,
identical in all nine band header rows. Stride 6, each slot five columns wide
(`Motor · Rigging Kit Option · Prop Part No. · Prop Description · Engine
Hole`), separated by a spacer column of 223 cells holding one value, `"."`.
The stride is confirmed by formula, not just spacing:
`LI5 = VLOOKUP(LF5,'[4]Motor Library'!$C:$ZZ,200,0)` — slot 2's prop is looked
up from slot 2's motor. 12–28 cells per slot are literally
`='[4]Motor Library'!$C$<row>`. Join on `Motor Library!C MODEL`:
**4,018 / 4,018 = 100.0 %**, 215/215 distinct.

**ASSERTED.**

**ADMIT.** The strongest relationship in the workbook. 4,018 live pairs.

---

#### R2 · BOAT × TRAILER — six slots, not ten

**Statement.** A boat row names up to six trailers, the first of which is its
standard trailer; 462 of 812 live boats (56.9 %) name none.

**Evidence.** `Boat Module!NZ` headed `Std Trailer`, `OA..OI` headed
`Trailer - Option 2..10`, identical in all nine bands. Join on
`Trailer Module!C Brand / Make / Model`: **674 / 682 = 98.8 %**, and 86 boat
cells are live external links `='[7]Trailer Module'!$C$<row>` — the only
`[7]` references in all 78 MB of the boat sheet. `OF`–`OI` carry
`TRAILER NOT REQUIRED` on 811 rows and the header text on the band rows, and
nothing else†.

**ASSERTED** for the relationship and the slot vocabulary. The eight
unresolved names are four distinct near-miss strings, all recorded in
`map-boat-row.md §3`.

**ADMIT**, at 6 slots. 682 live edges, 674 resolvable.

---

#### R3 · BOAT × DEALER-FIT PACKAGE — new, and the cheapest large win

**Statement.** A boat row names up to seventeen dealer-fit packages, and they
resolve into the **`Dealer Fit Module`** sheet of `Parts Module (3).xlsx`, not
into `Parts Maintenance`.

**Evidence.** `Boat Module!OL..QA` headed
`Additional Dealer Fit Options - Line 01..42`. 37 cells in `OM` are literally
`='[3]Dealer Fit Module'!$C$<row>`. Match rate against `Dealer Fit Module!C`:
**1,508 / 1,517 = 99.4 %** (live), 2,252 / 2,263 = 99.51 % (all rows). Against
`Parts Maintenance!C` instead: **38.8 % live / 28.02 % all rows.** The nine live
misses are two strings, both named in `map-boat-row.md §3`.

**ASSERTED** (direct cell references, and the header).

**ADMIT.** 1,517 live pairs, 83 distinct packages. **This join does not exist in
the seed and there is no `Dealer Fit Module` table in the app at all.** It is
the single largest unbuilt relationship.

---

#### R4 · BOAT × P/D PART — a bill of materials

**Statement.** A boat row names up to ten pre-delivery parts and accessories.

**Evidence.** `Boat Module!JT..KC` headed
`P/D - Parts & Accessories - 01..10`. 34 cells are literally
`='[3]Parts Maintenance'!C<row>`. Match against `Parts Maintenance!C`:
**5,894 / 5,918 = 99.59 %** (all rows), 100.0 % on the live cut in
`map-boat-row.md §3`. The 24 misses are one undeclared sentinel string,
`Optional Fuel Tank Not Required`.

**ASSERTED.** **ADMIT.** 2,561 live pairs, 42 distinct parts.

**And it is genuinely a bill of materials, asserted by absence:**
`SZ Parts CTD`, `TA Sundry CTD`, `TB Sublet CTD` are **empty on all 2,005
rows**, so `TC Total CTD = ROUNDUP(SUM(SY:TB),-2)` reduces to labour alone.
The parts are assigned and never priced on the boat row.

---

#### R5 · BOAT × MOTOR × RIGGING KIT — a fact about the pairing

**Statement.** The rigging kit belongs to the (boat, motor) pairing and to
neither side alone.

**Evidence.** `Boat Module!LA, LG, LM, LS, LY, ME, MK, MQ, MW, NC, NI, NO, NU`,
**every one of them headed `Rigging Kit Option`** — rigging has no
"recommended" slot; it inherits recommendation from the motor slot it sits in.
Containment in `Rigging Kits!C RIGGING KIT DESCRIPTION`: **10,540 / 10,540 =
100.00 %** live, 26,017 / 26,018 all rows (the one exception reads `0`).
It is the discriminator that makes 249 of the 641 repeated-motor edges distinct
(§1.4†).

**ASSERTED** for the column and the target; **OBSERVED** at 100.00 % for the
containment.

**ADMIT — as a column on the R1 join, not as its own join.** 3,945 live pairs
carry one.

---

#### R6 · BOAT × SINGLE-VALUED PART — a reference column, not a join

**Statement.** `Standard Safety Gear`, `PFD Type`, `Standard Anchor Kit` and
`Tie Down Straps` are one-per-boat and belong on the boat table.

**Evidence.** `KQ` (2,003 / 2,005 populated, **3 distinct values**), `KS`
(2,003, 2 values), `KT` (2,003, 7 values), `KF` (356, 3 values), all matching
`Parts Maintenance!C` at **100.00 %**. 2,528 live edges across **17 distinct
values**†. `KR PFD's Sup.` is a **count** (4 ×1,551, 6 ×238, 2 ×167, …), not a
part, and matches at 0.00 % by construction.

**ASSERTED** (headers) and **OBSERVED** (100 % match).

**ADMIT as four `reference` columns on each boat table. REJECT as a join** — a
join table whose every row has exactly one partner is a foreign key wearing a
costume. `KG`/`KH` `H/O - Parts & Accessories` (213 edges, 8 distinct, 100 %
match) are two more of the same and take two more columns.

---

#### R7 · MOTOR → PROP — a domain with a default, not a derivation

**Statement.** The prop on a pairing is one of the motor's own prop options,
and the motor's default is the pre-selection.

**Evidence.** `A3` already admitted: 17,328 cells carry
`=VLOOKUP(<motor slot>,'[4]Motor Library'!$C:$ZZ,200,0)` → `Motor Library!GT
'Prop Option - Default'`, across all thirteen `Prop Description` columns.
`A4` already admitted: `=IFERROR(VLOOKUP(<prop desc>,'[3]Parts Maintenance'!$C:$ZZ,3,0),)`
→ `Parts Maintenance!E Code`. New, from `map-motors.md §4a`, testing the
**values** rather than the formulas:

| test | live |
|---|---|
| prop **equals** the motor's `GT` default | 3,367 / 4,017 = **83.82 %** |
| prop **is in** the motor's `GT:KO` list (`Prop Option - Default … -100`) | 3,890 / 4,017 = **96.84 %** |

75 of the 262 motors used carry more than one prop across their assignments —
`Yamaha - F225XCB` appears against six different props.

**ASSERTED** for the lookup; **OBSERVED** for the value rates.

**ADMIT, in the amended shape. A3's statement as written — "must be the motor's
default" — is FALSE on 16.2 % of live cells and must not be enforced.**
Restate it: *the prop must be one of the motor's prop options, and the default
is the one pre-selected.* That is 96.84 %, it is the shape the app wants
(domain + default rather than derivation), and importing `Motor Library!GT:KO`
clears A3's recorded second blocker in the same pass.

---

#### R8 · MOTOR → RIGGING KIT (proposed A7) — **REJECT as a rule**

**Statement as proposed.** The rigging kit is nominated by the motor, exactly
as the prop is (`map-boat-row.md §4`, ref A7).

**Evidence.** 507 cells (the 39 Formosa rows × 13 slots) carry
`=VLOOKUP(<motor slot>,'[4]Motor Library'!$C:$ZZ,103,0)` → `Motor Library!DA
'Rigging Option - 01'`. `DB..EX` are `Rigging Option - 02..50`. **ASSERTED**,
and genuinely new — nobody had recorded index 103 before.

But on the values (§1.1†):

| test | live real pairs |
|---|---|
| rigging kit **is in** the motor's `DA:EX` set | 2,098 / 3,933 = **53.34 %** |
| rigging kit **equals** `Rigging Option - 01` | 1,066 / 3,933 = **27.10 %** |
| the formula is present at all | 507 of 26,018 cells = **1.9 %**; 25,266 cells (97.1 %) are hand-typed literals |

**REJECT as a rule, at any severity.** 53.3 % is not a domain — it is barely
better than a coin flip, and the misses are not near-matches: they are
brand-specific pre-rig SKUs (`Yamaha/Stacer |703-6Y52L-11-05 |Side Mount
Rigging Kit`, `(FF9SC) Yamaha 2050 SCB Mech 703/6Y8 Pre Rig`) that the generic
Yamaha list does not carry. Seeding `DA:EX` as a domain would block half the
dealer's own listings.

**ADMIT the underlying fact, as a recorded provenance note only:** the Motor
Library publishes a permitted rigging set per motor, the boat module fetches
item 1 of it on 507 cells, and the business overrides that answer on 94.0 % of
cells. Show it in the join's column description. Do not filter with it.

**And note that `map-parts.md §2.2–2.5` is superseded on this point.** Its
conclusion — "the picker is choosing a row from a menu the Motor Library hands
it" — rests on the 79.4 % figure settled in §1.1 as sentinel-inflated. Its
cable-length observation (§2.5) survives and is reported at R14.

---

#### R9 · MOTOR → LABOUR (A8 / A9 / A10) — pure functions, never overridden

**Statement.** The boat row's engine labour allowances are computed from slot 1's
motor and slot 1's rigging kit, and nothing else.

**Evidence, all ASSERTED by formula and all `$KZ`/`$LA`-anchored (absolute, so
they never walk to slot 2):

```
UF Motor PD Labour      = VLOOKUP($KZ,'[4]Motor Library'!$C:$ZZ,28,0)  → Motor Library!AD 'Labour (Hrs)'
UG Motor Install Labour = VLOOKUP($KZ,'[4]Motor Library'!$C:$ZZ,87,0)  → Motor Library!CK 'TTF'
UH Rigging Kit Labour   = VLOOKUP($LA,'[5]Rigging Kits'!$C:$ZZ,13,0)   → Rigging Kits!O  'NSM Lab (Hrs)'
UJ Total Engine Labour  = ROUNDUP(SUM(UF:UI),)
SX Est Hrs              = $JN + $UJ
```

812 / 812 live rows carry all three. **Hand-override rate: 0 of 2,436 cells —
0.0 %. Not once, anywhere in the sheet.** Compare prop part no. 6.8 %, prop
description 8.3 %, rigging kit 94.0 %.

**ASSERTED. ADMIT** — and note this is a second, independent assertion that
slot 1 is the recommendation (R10): the boat is priced against slot 1 alone.

---

#### R10 · `Recommended` = slot 1 — ADMIT, with the word changed

**Statement.** Slot 1 is the boat's standard-fit motor and slot 1 (`NZ`) is its
standard trailer.

**Evidence.** ASSERTED twice for motors: the header
`Recommended Motor Option` in all nine bands, and the `$KZ`-anchored labour
lookups (R9). ASSERTED once for trailers: `NZ` is headed `Std Trailer`.
OBSERVED, on what kind of recommendation it is: slot 1 is the row's
**lowest-HP** motor on 718 of 719 live rows (**99.9 %**) and equals the `KV Min
HP` plate on 75.2 %.

**The counter-evidence, and why it does not overturn this.**
`map-quote.md §3.2` finds that on real deals slot 1 wins **17 of 77 (22.1 %)**
for motors and **30 of 66 (45.5 %)** for trailers, and recommends that
`recommended` become "a multi-value flag or a soft rank."

**REJECT that recommendation.** One slot is headed `Recommended`; the other
twelve are headed `Option`. A second recommended row is not in the data, and
inventing one is exactly the failure this document exists to prevent. The
quote statistic is a **usage** fact, not a **catalogue** fact, and it belongs on
the screen as one — see F13 and §8.4.

**ADMIT.** `__recommended = (slot == 1)`, `__order = slot`. Word it in the UI as
**"standard fit"**, not "our pick": OBSERVED, it is the smallest engine that
satisfies the plate, and it is the engine the labour allowance is priced from.

**And `recommended` must be allowed to be absent for a whole boat.** `NZ` is
populated on only 350 of 812 live rows (43.1 %). Defaulting the flag to "the
first row we found" would assert a standard trailer for 462 boats that have
none.

---

#### R11 · The trailer regime is not one relationship but three

**Statement.** Three different mechanisms put a trailer under a boat, and they
need different modelling.

**Evidence — ASSERTED.** The banner is a **column `C`** row — a `C` cell with no
`E Code` under it — and the sheet carries **53** of them. Above the
`OBSOLETE TRAILERS` divider at row 656, **twenty-two name a boat brand**.
**Fifteen of those sit over a bespoke cradle:** `REDCO - Surtees Trailers`
(row 87), `REDCO - Surtees Alloy Trailers` (95), `REDCO - Stabicraft Steel
Trailers` (105), `REDCO - Stabicraft Alloy Trailers` (113), `REDCO - Merry
Fisher Trailers` (127), `REDCO - Cap Camarat Trailers` (133),
`REDCO - Highfield` (140), `REDCO - Formosa` (152), **`GFAB - Surtees Series
(as at 6.07.2026)` (187)**, `GFAB - Stabicraft Series (as at 6.07.2026)` (197),
`GFAB - Highfield Series` (212), and `DUNBIER / HAINES BMT TRAILERS (NB: Only
available in Haines BMT Package)` (626) with its three sub-series at 627, 634
and 650, which carry the sixteen BMT cradles between them. The other seven name
Stacer (232, 233, 241, 254, 261, 266, 274) — the size-selected regime below,
where the banner names the brand and the trailers under it never do.

> **CORRECTED 2026-08-21.** This paragraph used to read "`Trailer Module!A`
> carries 47 series banners, ten of which name a boat brand", and its list
> omitted `GFAB - Surtees Series`. Re-measured straight off `Trailer
> Module.xlsx` with `openpyxl`: column `A` merely repeats the banner, and it
> repeats it on **52 of the 53** banner rows. **Row 187 is the one it does not
> — `A187` is empty and the banner exists only in `C187`.** Hierarchy in this
> sheet is the font size of column `C`, so column `A` was never the authority.
> Any figure derived by enumerating column `A` is short by that series' **8
> live trailers**, which is exactly what happened to the Surtees cell in §1.2
> above: it read 14 instead of 22.

And `Trailer Module!E Code` embeds the boat model in parentheses on
seven rows, **every one of them Highfield**: `TA600-MOB (SP560)`,
`TA600T-MOB (SP660)`, `TA700T-EH (SP700)`, `TA730T-EH (SP800)`,
`TA800T-EH (SP760)`, `TA800T-EH1 (SP800)`, `RS480-MO (PA460)`.

| regime | brands | how the trailer is chosen | evidence class |
|---|---|---|---|
| **model-locked** | Highfield, Formosa, Stabicraft, Haines, Merry Fisher, Cap Camarat | a bespoke cradle built for the hull; the trailer's `E Code` and `H Boat Size` name the boat model | **ASSERTED** |
| **size-selected** | Stacer | generic Telwater alloy stock picked against ATM and an `H` band like `"5.7 - 6.1m"`; **0 of 148 Stacer trailer names mention Stacer** | **OBSERVED** |
| **package-only** | Haines Signature | `Trailer Module!D Supplier` reads `Haines / Dunbier BMT Packages Only` on 18 of 18 | **ASSERTED** |

**ADMIT all three.** This is the evidence for the existing seed's split into two
trailer joins, and it says the split should widen rather than merge: a
model-locked pair is a curated row, a size-selected pair is a lookup, and they
should not share a rule.

**A zero here is not evidence of size-selected, and Cap Camarat is the case
that proves it.** The corroborating reading — how many of a brand's hulls are
offered a trailer whose text names that hull's own model designator — is
asserted against the full-scale seed by `trailerFitment.test.ts`: Stabicraft
37 of 37, Formosa 39 of 39, Haines 9 of 9, Surtees 19 of 19, Highfield 81 of
588, Merry Fisher 5 (that test asserts the numerator only), **Stacer 0 of 91**
(which is the size-selected finding reproduced) — **and Cap Camarat 0 of 11,
which is not.** Cap Camarat designators are `5.5`, `6.5` and `7.5`, and the
cradles carry `CC5.5`, `CC6.5`: two characters, inside a longer
token, below the three-character floor the tokenizer keeps
(`src/features/constraints/trailerFitment.ts`, `designators()`). **The floor is
not lowered.** Dropping it to two would fit the rule to the answer and would
start matching digits out of every code in the sheet. Cap Camarat stays
model-locked on the banner and the `E Code`, its reading stays 0, and the app
returns a measurement rather than a regime label, so nothing on screen calls it
size-selected. Derived three times now, and written down so it is not derived a
fourth.

> The pre-full-scale figures — Stabicraft 30/30, Formosa 26/26, Surtees 17/19,
> Highfield 18/40, Merry Fisher 5/10, Stacer 0/26, Cap Camarat 0/10 — were
> measured on the sample seed and are superseded by the line above. The header
> comment of `src/features/constraints/trailerFitment.ts` still carries them
> and disagrees with the test beside it; noted 2026-08-21, not edited here
> because that directory was owned by another change at the time.

**The Highfield correction, worth stating because the owner asked in these
words.** "Highfield have special trailers" is true and asserted — but **bespoke
is the norm, not the Highfield exception**: 74 of 152 live boat models (48.7 %)
get a model-designated trailer, and 100 % of Stabicraft, Haines, Merry Fisher
and Cap Camarat models do. **Stacer is the only brand that is band-driven
(0 of 71).** And the Highfield cradle is named for a **size**, not a model:
`SP600` (6.52 m) takes the *660* cradle; `SP460` takes the *PA460*; `SP900`
(9.12 m) reuses the *800* because the ladder runs out at eight cradles.

---

#### R12 · What the boat row is NOT related to

Four column blocks look like relationships and are not. Each is REJECTED with
its measured rate.

| block | columns | why it is not a relationship |
|---|---|---|
| `STANDARD FACTORY INCLUSIONS` | `W`–`BV`, 52 slots, 25,932 real cells | **0.33 %** resolve into `Parts Maintenance`. The values are marketing copy — `High Tensile Chromated & Powder Coated Aluminum Hull` (631), `Highfield Dry Bag` (802) — and the single most common value on the whole block is `NB: Factory Specifications are Subject to Change without notice` (1,312), a disclaimer occupying a data column. **Carry as one multi-line text field on the boat.** |
| `Factory Options` | `BX`–`IG`, 166 slots, 41,704 real cells | **0.00 %** resolve into `Parts Maintenance`. The values are supplier option codes (`HFI-COV` 861, `EMBARGO` 918) belonging to `Factory Options Module.xlsx` (external link 6). **A different workbook and a different lens. Route it there or leave it out.** |
| `Additional Package Options` | `OK`, 819 cells | **one distinct value, and it is the header text.** The owner listed "packages"; the boat module has a column reserved for them and nothing in it. Say so; do not build for it. |
| PD checklists | `UM`–`WJ` (50) + `WM`–`XP` (30) | 80 columns of near-identical boilerplate (`Bungs, correct size thread & number` on 801 of 808 rows). Not a relationship, and not a part. |

Also **REJECT**: `Engine Hole` (13 slots, 26,033 cells, 0 formulas) — it differs
between slots on 10 of 2,003 rows (0.5 %) and is `TBA` on 88 % of live cells. It
is one boat fact duplicated thirteen times. Carry it once on the boat, or drop
it.

---

### 4 · SELECTION RULES

The six already adjudicated in `workbookRules.ts` (A1–A6) are not re-derived.
They are **amended where this adjudication changed them**, and the amendments
are marked. New rules continue the numbering from A7, which `map-boat-row.md`
already claimed for the rigging derivation.

---

#### F1 · A1 — MAX HP IS A HARD CEILING. **ADMIT, scoped to slots 1–2.**

**Amendment to the existing admission.** A1's verification tested `KZ` and `LF`
only. Re-measured across all thirteen slots, live rows, single-value plates
(`adj/a5_shaft.py`†):

| slot | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| testable | 757 | 667 | 573 | 407 | 284 | 254 | 179 | 135 | 74 | 50 | 33 | 28 | 9 |
| **above Max HP** | **0** | **0** | 9 | 1 | 1 | 1 | 1 | 3 | 3 | 3 | 0 | 0 | 0 |

**Slots 1–2: 0 of 1,424 (0.00 %). Slots 3–13: 22 of 2,026 (1.09 %). Total 22 of
3,450 = 0.64 %.†** (`map-motors.md §7` reports 46 of 3,842 = 1.20 % with
multi-engine plates parsed; both agree on the load-bearing fact: **zero
breaches in the recommended slot or the first alternative.**)

The 22 are not errors. In every case the motor offered is **the next Yamaha
model step above the plate** — 50→60, 140→150, 225→250, 425→450 — placed in an
optional slot. Named: `R454 Highfield CL400`, plate 50 HP, slot 3 = `F60LC`.
`R115 Stacer 589 Sea Ranger SDF`, plate 140 HP, slots 4–7 all `F150*`.
`R970 Formosa SRT 675`, plate 225 HP, slots 8–10 all `F250*`.

**ADMIT, with the scope written into the admission: hard on slots 1–2, advisory
beyond.** Enforcing it across all thirteen deletes 22 offers the dealer makes
on purpose — the A2 failure, on the other side of the envelope. A1's existing
`blocked` note stands unchanged: it is cross-kind.

**And A1 cannot be scalar until `Max HP` is decomposed.** ASSERTED, from
`map-quote.md §6.1`: `KW` holds `350 / 2 x 200 HP` on multi-rig hulls. It is a
sentence encoding "one 350, or two 200s". A1/A2 need `maxHpTotal` +
`maxRigCount` + `maxHpPerEngine` before `lte` means anything. 101 rows are
multi-engine; 6 read `TBA`; 6 hold a battery spec.

---

#### F2 · A2 — MIN HP IS A FLOOR, WARNING ONLY. **ADMIT unchanged; the cause is now known.**

Re-measured live (`adj/a5_shaft.py`†): **72 of 757 slot-1 motors (9.51 %)** fall
below the row's `KV Min HP`; slot 2 adds 28, slot 3 adds 11, slots 4–7 add 7;
118 live breaches in total, **69.5 % of them in slots 1–2**.

A2's recorded 11 % is an **all-rows slot-1** figure; the live slot-1 figure is
9.5 %. Both support the same admission.

**The mechanism, which A2 did not have.** Slot 1 is the row's lowest-HP motor
on 99.9 % of live rows (R10). The floor is broken *because* slot 1 is chosen as
the cheapest option, not despite it. Worked: row 554,
`Highfield - Coaster 540 open (PVC) LG-W-DG`, `KV` 115 HP, `KW` 115 HP, slots
1–2 are `F90XB` / `F90XB2` at 90 HP.

**ADMIT unchanged, and the condition of admission is reaffirmed: it must never
filter.**

---

#### F3 · A3 / A4 — PROP FROM MOTOR, PART FROM PROP. **ADMIT A4; AMEND A3.**

See R7. A4 is untouched — a lookup, blocked for the reason already recorded.
**A3's statement must be rewritten** from *"must be the motor's default"*
(83.82 % true) to *"must be one of the motor's prop options"* (96.84 % true).
The rewrite also removes A3's recorded second blocker, because
`Motor Library!GT:KO` is exactly the column set that has to be imported either
way.

---

#### F4 · A5 — DEPOSIT STAGES TOTAL 100 %. **ADMIT unchanged.**

`QH5 = 100%-SUM(QD5:QG5)`, 378 master cells; 0 rows of 2,005 sum to anything
but 1.0. Nothing in the five lenses touches it. Its two blockers stand.

---

#### F5 · A6 — ROWS BELOW 1005 ARE OBSOLETE. **ADMIT, and it has a twin.**

**New, ASSERTED:** `Trailer Module!A656 = 'OBSOLETE'`,
`C656 = 'OBSOLETE TRAILERS - Trailers No Longer Available'`. Same divider
mechanism, same argument, same fix: read it at import into a boolean `Obsolete`
column rather than testing a row address.

**And it immediately earns its keep.** 30 of 674 live trailer pairings (4.5 %)
point at a trailer row below the divider — and re-measured†, **all 30 are
Surtees**, 8 of them in the `Std Trailer` slot. A live boat offering a
discontinued trailer as its standard.

---

#### F6 · SHAFT LENGTH MUST MATCH THE TRANSOM. **ADMIT — the strongest cross-kind rule in the workbook.**

**Statement.** The motor's shaft length must be one of the shaft lengths the
boat's `KX Shaft Lgth` names.

**Evidence.** ASSERTED headers on both sides: `Boat Module!KX 'Shaft Lgth'`
and `Motor Library!F 'Shaft Length'`. The two vocabularies reconcile through a
six-entry map, established twice:

```
S = SS = 15"      L = LS = 20"      XL = 25"      UL = XXL = 30"
```

* Inside the Motor Library: the Yamaha model-code letter after the digits
  (`F90**X**B`) agrees with column `F` on **234 of 234 rows**, zero exceptions.
* Across the join: **3,902 of 3,905 live loose-motor cells = 99.92 %†**, with
  the 3 misses individually identified as single-letter typos (§1.5).

`S`/`L` is a Highfield-only spelling (588 Highfield live rows: XL 207, S 204,
L 146, **zero LS/SS**); every other brand writes `LS`/`SS` (Stacer's 91 live
rows: LS 64, XL 19, SS 8, **zero plain L/S**). Same meaning, must be folded.

**OBSERVED** for the vocabulary map (no counter-example in 234 library rows);
**ASSERTED** for both columns.

**ADMIT.** Breach rate 0.08 % against Max HP's 0.64–1.20 %. **This is a cleaner
constraint than the HP envelope and it is not yet expressed anywhere.**

**Scope, written into the admission:** it excludes **factory boat+engine
packages** — values in a motor slot whose Motor Library row is a boat with an
engine bundled (`SIG 620BRX w Yamaha - F200XSA2 (White)`, `MF895 S2 with Yamaha
2X200 XCB DBW (Grey)`). 52 of the 55 live misses are these†. They are in the
library, so "not in the library" is the wrong exclusion test; the right one is
in §6.2.

**Blocked for exactly the reasons A1 is blocked** — cross-kind, and
`describe.literalOf` returns null for a field right-hand side. **Unblocking A1
unblocks this for free, and this one is worth more.**

---

#### F7 · A REMOTE BOAT NEVER TAKES A TILLER MOTOR. **ADMIT as a warning.**

**Statement.** A boat whose `Eng Configuration` is `Remote` is never assigned a
tiller-handle motor. The converse does not hold.

**Evidence.** `Boat Module!KY 'Eng Configuration'`, ASSERTED header, populated
on 2,004 of 2,005 rows, exactly two values: `Remote` 1,424 / `Tiller` 579.
Cross-tabbed against `Motor Library!J Control` over all resolved assigned
cells:

* `Remote` boat × tiller-handle motor: **0 of 7,830**
* `Remote` boat × manual-start motor: **0 of 7,830**
* `Remote` boat × manual-tilt motor: **0 of 7,830**
* `Tiller` boat × remote motor: **106 of 1,206 = 8.8 %** — a tiller boat can be
  up-specced; a remote boat cannot be down-specced

**OBSERVED**, at 0 of 7,830. **ADMIT as a warning, not a filter**, because it is
observed rather than asserted — the sheet states no such rule — and because the
asymmetry must not be flattened into an equality.

**Knock-on, and it changes the configurator.** `Motor Library!K Starting` and
`L Tilt & Trim` have **no counterpart column anywhere on the boat row** and are
fully determined by the motor. **Control, Starting and Tilt & Trim are not
choices a configurator should offer.** The only choice the boat makes is tiller
versus remote.

---

#### F8 · TRAILER SERIES MUST BE BUILT FOR THE BOAT'S BRAND. **ADMIT — the rule the owner asked for.**

**Statement.** A boat may be paired with a trailer whose series is built for
that boat's brand.

**Evidence.** ASSERTED — the eleven series banners quoted at R11.
**Verified: 615 / 615 testable live pairings (100.0 %)** in `map-trailers.md
§4.6`, independently replicated here at **581 / 581 = 100.0 %†** on a narrower
testable cut, with zero counter-examples in either.
**Discrimination: leaves 0.92 %–7.83 % of the 434 live trailers†** — for
Highfield, 12 of 434 (2.76 %).

**ADMIT.** This is the only candidate rule in either workbook that both holds at
100 % and actually rejects something. It does roughly 96 % of the selecting.

**Blocked, and for a harder reason than A1.** It is cross-kind like A1 — but
unlike A1, *neither side has a column*. The boat's brand is the table identity
(one table per brand) and the trailer's series brand is buried in a banner
string. **Both must be seeded as real columns before this rule can be written
at all** (§6.4).

---

#### F9 · TRAILER ATM ≥ BOAT WEIGHT. **ADMIT as a floor that warns. REJECT as a selector.**

**Statement.** A trailer's rated ATM is never below the boat's stated weight.

**Evidence.** `Trailer Module!K ATM (KG)`, 459 of 463 cells numeric.
**530 / 530 = 100.00 %† on live pairings**; 219 / 219 = 100 % on slot-1
pairings across five bands using five different boat-side weight columns
(`map-boat-row.md §5a`).

**But: mean 97.70 % of the live catalogue also passes it, median 100.00 %†.**

**ADMIT as a safety floor with the same non-blocking severity A2 is waiting
for. REJECT as the thing that picks a trailer.**

**The trap, recorded so nobody falls in it.** Comparing ATM against a *fixed
column letter* also scores 100 % — but only because in the Highfield band `Q`
is `Max People` (`12`) and in Merry Fisher `P` is `Water Capacity` (`50 ltr`).
The boat-side weight column is **different in every band**:

| band | column | header |
|---|---|---|
| Stacer | `Q` | `BMT Weight (Dry)` |
| Stabicraft | `Q` | `Tow Weight @ (Dry)` |
| Surtees | `M` | `App. Tow Weight` |
| **Highfield** | **`S`** | **`Boat Weight`** *(`P` here is `Max Load`, a payload)* |
| Formosa | `P` | `Hull Weight (Dry)` |
| Jeanneau · Merry Fisher · Cap Camarat · Haines | — | **no weight-headed column in the band at all** |

**This rule is per-brand-table by construction and cannot exist for four of the
nine bands.**

---

#### F10 · THE FOUR REFUTED TRAILER RULES. **REJECT, and record the refutation.**

Written in the voice `workbookRules.ts` uses for its blockers, so nobody
re-derives them.

| candidate | measured | verdict |
|---|---|---|
| `ATM ≥ boat weight + Max Load` | **73 / 139 = 52.5 %** on Highfield Std pairings | **REJECTED.** It rejects the dealer's own standard cradle for the PA660EW across 51 rows (740 + 1,287 = 2,027 kg against ATM 1,990). `Max Load` is an **afloat payload**, not towed mass. Seeding it repeats A2's exact failure. |
| `Between Guards ≥ beam` | **0 / 93 = 0.0 %** | **REJECTED systematically.** Not a near miss: `M` is the trailer *frame* (1,400–2,300 mm) and is always narrower than the hull beam (1,900–2,930 mm). Delete the idea. |
| `trailer Boat Size band contains hull length` | **83 / 166 = 50.0 %** exact, and testable on only 166 of 674 pairings | **REJECTED.** A ±0.3 m heuristic on a quarter of the data. |
| `trailer Boat Size ≥ hull length` | **8 / 85 = 9.4 %** (map-boat-row §5b); 127 / 166 = 76.5 % (map-trailers §4.4) | **REJECTED on both measurements.** Median `H − G` is **−0.34 m** — the column is a nominal size *class*, typically a third of a metre under the hull length because `G` includes bow overhang past the trailer bed. |

**`Trailer Module!H 'Boat Size (Mtr)'` cannot carry a length rule because it is
not a length.** Across 456 populated cells: 277 point sizes, **142 model
designators** (`Highfield 660`, `SP600`, `Formosa 525`, `2050`, `Jet Ski`), 36
ranges, 1 pair. And 499 of the 674 live pairings (74.0 %) land on a trailer
whose `H` is a **model designator**. The size reading is the minority case.

> **THERE IS NO TRAILER LENGTH RULE. DO NOT WRITE ONE.**

---

#### F11 · THE DIMENSIONAL COLUMNS CANNOT CARRY A RULE AT ALL. **REJECT.**

`Trailer Module!M Between Guards` is populated on **74 of 476 rows (15.5 %)**
and `N Trailer Length` on **75 (15.8 %)**. A rule evaluable for one trailer in
seven is not a rule, whatever its hit rate. (`N ≥ hull length` scores 93/93 =
100 % — on 93 of 674 pairings, and near-vacuously.)

Likewise `Boat Module!Q 'Max Main Motor Weight'`: it means five different
things across the nine bands, is populated as an actual motor weight on **10 of
2,005 rows**, and `Motor Library!FF WEIGHT` is populated on only 121 of 362
models. The envelope is real where testable (49 of 49) and useless as data.
**REJECT.**

---

#### F12 · A TILLER BOAT NEVER GETS A DUAL-BATTERY PD KIT. **ADMIT as a warning — the one rule expressible today.**

**Statement.** Every multi-battery and multi-terminal pre-delivery line lands on
a boat whose `Eng Configuration` is `Remote`.

**Evidence.** OBSERVED, **1,196 cells, 100.0 % Remote, 0 cells on Tiller**:
`Battery Terminals (2 pairs)` 576/576 · `(3 pairs)` 2/2 · `2 x MFM70 Batteries`
512/512 · `2 x MFM50` 60/60 · `2 x MRV87` 34/34 · `3 x MRV87` 5/5 ·
`Batteries (Qty 2) - MF31-931` 7/7. `Battery Terminals (1 pair)` splits
762 Remote / 289 Tiller, which is the control.

**OBSERVED, not asserted — the workbook states no such rule.**

**ADMIT as a warning.** It is single-kind (both columns are on the boat) and
therefore the only new rule in this document expressible on the sentence
surface without a contract change — **once** a non-blocking severity exists.
It must carry an "observed" mark on the card, or take it to the business and
have them assert it.

---

#### F13 · SLOT ORDER IS A LADDER THAT RESTARTS. **ADMIT as `__order`; REJECT recomputing it.**

**Evidence.** OBSERVED. Occupancy is monotone — only **9 of 813 live rows
(1.1 %)** have a hole. HP is non-decreasing end-to-end on only 527 of 719 rows
(73.3 %), but of the 203 adjacent descents, **166 (81.8 %) coincide with a change
of `Rigging Kit Option`** and 129 (63.5 %) with a change of the motor's
`Control` value. Worked: row 154, Stabicraft 2050 Frontier FT, thirteen slots
in three blocks — slots 1–4 Mech+Hydraulic (150→175), 5–9 DEC+Hydraulic
(150→200), 10–12 DEC+Digital Electric Steering (150→200). Each block ascends;
each restarts.

**ADMIT: carry the raw slot index. REJECT any attempt to derive order from HP** —
a sort by HP destroys the control-generation boundaries, which are the real
information.

---

#### F14 · THE OBSERVATIONS THAT ARE NOT RULES

Reported, quantified, and explicitly not admitted as rules. Each is a candidate
to take to the business.

| observation | measured | why it is not a rule |
|---|---|---|
| Cable length in the rigging kit name tracks hull length | monotone across 3,526 length-bearing cells (10' → median 3.36 m … 17' → 7.39 m) | no column asserts it; the length lives inside a name string |
| Tube-cover material matches the `(HYP)`/`(PVC)` token in the boat's **name** | **626 / 633 = 98.9 %**; and 0 % against the Model Code | **there is no hull-material column anywhere in the Boat Module** — the fact exists only inside a name string |
| Tube-cover size matches hull length | within 0.12 m on **556 / 633 = 87.8 %**, exactly 0.00 on 313 | 12 % residual, one cluster at −0.41 m |
| Anchor kit and safety gear scale with hull length | monotone in the median, **heavily overlapping at the edges** (`Sand Anchor Kit - 13lb` spans 5.05–12.27 m) | the determinant is survey water classification, which is not a column in this workbook |
| Trailer ATM is non-decreasing across slot order | **165 / 194 boat rows with ≥2 priced trailers = 85.1 %** | 15 % counter-rate |
| `Small ⟺ ATM ≤ 1020` for `Trailer!BY Rego Type` | **450 / 459 = 98.0 %** | 9 named exceptions, 6 of them undercharging rego at $166 instead of $283 — **worth showing the owner as a defect, not building as a rule** |
| Trailer PD operation tracks ATM | 29/29 Unbraked ≤ 750 kg; 408 of 411 braked > 750 | the 3 exceptions sit exactly on 750 |

---

## PART TWO · WHAT WE PULL

> *"we don't want ALL the data pulled... Just the right ones"*

### 5 · THE JOINS

Today there are four. This section names **eighteen**, of which fifteen are
boat×partner joins and three are new base tables the joins need. Counts are
**live pairs from a full import**; the demo seed carries a curated subset (651
rows today).

#### 5.1 · Boat × Motor — eight joins, 4,018 live pairs

Measured by resolving every live motor cell to its `Motor Library!Q Supplier`
(`adj/b1_joins.py`†):

| # | join | left table | right table | live pairs | status |
|---|---|---|---|---|---|
| J1 | Highfield × Yamaha | `boat_highfield` | `mot_yamaha` | **2,520** | **seeded** |
| J2 | Stacer × Yamaha | `boat_stacer` | `mot_yamaha` | **448** | **seeded** |
| J3 | Formosa × Yamaha | `boat_formosa` | `mot_yamaha` | 270 | new |
| J4 | Stabicraft × Yamaha | `boat_stabicraft` | `mot_yamaha` | 240 | new |
| J5 | Surtees × Yamaha | `boat_surtees` | `mot_yamaha` | 145 | new |
| J6 | Jeanneau × Yamaha | `boat_jeanneau` | `mot_yamaha` | 83 | new |
| J7 | Jeanneau × Jeanneau factory packages | `boat_jeanneau` | *(new table)* | 195 | new, and see below |
| J8 | Haines Signature × Haines factory packages | `boat_haines` | *(new table)* | 117 | new, and see below |

**Six boat brands × Yamaha = 3,706 pairs = 92.2 % of the relationship.** Build
J3–J6 first; they are four rows of generator config each and the machinery is
already written.

**J7 and J8 are a different kind of thing and must be labelled as one.** Their
"motor" values are boat+engine bundles (`MF895 S2 with Yamaha 2X200 XCB DBW
(Grey)`, `SIG 620BRX w Yamaha - F200XSA2 (White)`) that live in the Motor
Library but are not motors. They are the 52 shaft-rule exceptions (§1.5) and
the 27 duplicate Motor Library names (§1.3). **Either give them their own table
of kind `package`, or exclude them explicitly.** Do not put them in `mot_yamaha`.

**Do not build a boat × ePropulsion join.** The seed carries an
`ePropulsion Outboards` table with 14 rows, and **zero live boat rows name an
ePropulsion motor†**. It is a catalogue, not a relationship.

#### 5.2 · Boat × Trailer — six joins, 651 of 674 live pairs

Measured by resolving every live trailer pairing to its row band, which is how
`gen_all.py` already partitions the trailer tables (`adj/b1_joins.py`†):

| # | join | live pairs | boats | of which slot 1 | status |
|---|---|---|---|---|---|
| J9 | Highfield × NSM Custom | **146** | 146 | **146** | **seeded** |
| J10 | Stacer × Stacer Trailers | **142** | 88 | 87 | **seeded** |
| J11 | Formosa × NSM Custom | 92 | 39 | 39 | new |
| J12 | Stabicraft × NSM Custom | 84 | 37 | 37 | new |
| J13 | Highfield × GFAB | 51 | 51 | **0** | new |
| J14 | Stabicraft × GFAB | 47 | 37 | **0** | new |
| J15 | Surtees × NSM Custom | 29 | 15 | 11 | new |
| J16 | Haines Signature × Dunbier/Haines BMT | 18 | 9 | 9 | new |
| J17 | Jeanneau × NSM Custom *(Merry Fisher 6 + Cap Camarat 10)* | 16 | 11 | 11 | new |
| J18 | Surtees × GFAB | 11 | 11 | **0** | new |

**The structural finding the seed's naming hides: `NSM Custom Trailers` is the
bespoke-cradle table for FIVE boat brands, not one.** Highfield 146, Formosa 92,
Stabicraft 84, Surtees 29, Jeanneau 16 = **367 of 674 live pairings (54.5 %)**
land in that single table. The existing `Highfield × NSM Custom` join is one
fifth of what that table is for.

**And `Highfield × GFAB` / `Stabicraft × GFAB` / `Surtees × GFAB` carry 109
pairs and not one of them is a slot-1 trailer†.** These are pure alternative
menus — exactly the rows the `recommended` flag exists to *not* mark, and
exactly the offering a Highfield boat currently cannot show.

**Excluded from the join list, deliberately:**

* **Surtees × OBSOLETE trailer band — 30 pairs, 8 of them slot 1†.** Every live
  pairing that points below `Trailer Module!A656` is Surtees. **Import them as
  join rows with `__origin` recording the problem and the obsolete trailer
  seeded as obsolete — do not silently drop them, and do not silently show
  them.** They are the single worst data defect in the trailer fan-out and the
  owner should see them.
* **Stacer × REDCO/Tinka (4), Stabicraft × Mackay (3), Highfield × REDCO/Tinka
  (1) — 8 pairs total.** Below the threshold at which a whole table earns a
  join. Carry them as `__origin: 'added'` rows on the nearest join, or leave
  them out and say so.

#### 5.3 · Boat × Dealer-Fit Package — one join per boat brand, 1,517 live pairs

| # | join | live pairs | note |
|---|---|---|---|
| J19 | Highfield × Dealer Fit Module | **1,355** | 89.3 % of the relationship |
| J20 | Stabicraft × Dealer Fit Module | 111 | |
| J21 | Jeanneau × Dealer Fit Module | 51 | Merry Fisher 45 + Jeanneau 6 |

**Stacer, Surtees, Haines, Formosa and Cap Camarat carry ZERO dealer-fit
edges†.** That is not missing data to be filled in — it is the shape of the
relationship, and a view page must be able to show a boat with no dealer-fit
block rather than an empty one.

**This join needs a table that does not exist.** `Dealer Fit Module` is a sheet
of `Parts Module (3).xlsx` with **1,778 packages**, of which the live boat rows
name **83**. It is not `Parts Maintenance` and must not be merged with it
(99.4 % versus 38.8 %). See §6.5.

#### 5.4 · Boat × P/D Part — one join per boat brand, 2,561 live pairs

| # | join | live pairs |
|---|---|---|
| J22 | Highfield × Parts | **1,707** |
| J23 | Stacer × Parts | 363 |
| J24 | Stabicraft × Parts | 204 |
| J25 | Formosa × Parts | 130 |
| J26 | Jeanneau × Parts | 118 |
| J27 | Surtees × Parts | 39 |

Haines Signature carries zero. All ten slots are genuinely used; the depth
ladder is non-monotone (slot 6 > slot 5), so it is a list, not a rank —
`__recommended` stays **unset** on every row of this join (§5.6).

#### 5.5 · What is NOT a join

| candidate | why not | what it is instead |
|---|---|---|
| **boat × rigging kit** | the kit is meaningless without the motor it rigs; a `(boat, kit)` join loses the motor and collapses 249 distinct live offerings (§1.4†) | a **column on the boat × motor join** — it already is one (`gen_all.py:583`) |
| **boat × safety gear / PFD type / anchor kit / tie-downs** | exactly one per boat on 2,003 of 2,005 rows; 2,528 edges over **17 distinct values**† | four **`reference` columns** on each boat table |
| **boat × H/O part** | 213 edges, 8 distinct values, two slots | two **`reference` columns** |
| **boat × standard factory inclusion** | 0.33 % resolve into any parts library; the most common value is a legal disclaimer | one **multi-line text field** |
| **boat × factory option** | 0.00 % resolve into any parts library; belongs to `Factory Options Module.xlsx` | **out of scope** — route it to that workbook's own lens or omit |
| **boat × package** | `OK Additional Package Options`: 819 cells, one distinct value, and it is the header text | **nothing.** Say so on screen. |
| **motor × rigging kit** (from `Motor Library!DA:EX`) | 53.3 % membership on real pairs (§1.1†) | **nothing.** A provenance sentence on the join's rigging column. |
| **motor × prop** (from `Motor Library!GT:KO`) | 96.84 % membership | **a domain, not a join** — import GT:KO as the motor's option list and GT as the default (R7) |

### 5.6 · WHICH PAIRS INSIDE EACH JOIN

**The full menu. Every one of them. Not the recommended one, and not those
passing a rule.**

The owner's question was *"if a boat row lists 13 motors and the quote reads
one, say which we carry and why."* We carry all thirteen, for four reasons,
each measured:

1. **The menu is right and its first entry is not.** The quoted motor is
   somewhere in the boat's thirteen slots on **71 of 77 deals (92.2 %)**, but in
   slot 1 on only **17 (22.1 %)**; the modal choice is **slot 3 (24.7 %)**. For
   trailers: menu 77.3 %, slot 1 45.5 %. Carrying only the recommendation would
   throw away the answer 78 % of the time.
2. **The rules cannot reproduce the menu.** The one rule that discriminates
   (F8, the series banner) leaves 3.9 % of the trailer catalogue — 17 trailers
   where the boat row names 1.35. *(NOT re-measured 2026-08-21, and it may run
   low: it is a mean over the quoted deals, and any Surtees deal in that set was
   counted against the stale 14 rather than 22 — see §1.2. The argument does not
   turn on it; 22 trailers against 1.35 named is the same point.)* Every motor
   rule we have (F1, F2, F6, F7) is an envelope, not a selection: the Max HP
   filter on a Highfield SP560 admits
   every Yamaha from 90 to 115 HP, and the sheet names four. **The narrowing
   from "rated" to "offered" exists nowhere but in the typed values themselves,
   which is precisely what a join table is for.** `map-trailers.md §3.2`
   establishes this as an ASSERTED negative: the trailer data validation offers
   the **whole 322-entry catalogue to every boat**, with no brand filter, no
   size filter and no boat input.
3. **The tail is real.** 24 live rows use motor slot 13; 156 rows use nine or
   more. Truncating at 6 would lose 407 live pairs.
4. **Duplicates are offerings, not noise.** A `(boat, motor)` unique constraint
   deletes 641 live rows; `(boat, motor, rigging)` still deletes 392 (§1.4†).
   `Highfield ADV7` slots 4–9 are all `F250XSB2` distinguished only by six
   Helm Master rigging packages.

**What is filtered out at import — and only this:**

* the sentinel vocabulary (§6.1) — **97.3 % of dealer-fit cells and 69.4 % of
  P/D cells**
* rows below the `OBSOLETE` divider on either side (A6 and its trailer twin) —
  cuts the boat universe from 2,005 to 812 and rigging pairs from 9,615 to 4,171
* values that resolve to no row in the far-side library — 8 trailer names,
  9 dealer-fit strings, 24 P/D strings, 0 motors, 0 rigging kits

**And a sentinel is data, not an absence.** `TRAILER NOT REQUIRED` is entry 1
of the trailer picker: it is the business *saying* the line is optional. It is
not imported as a join row, but the *fact* that a boat names no trailer must
survive as "this boat has no standard trailer" and never as "we do not know".
462 of 812 live boats (56.9 %) are in that state.

### 5.7 · WHAT WE LEAVE OUT — the owner's section

| left out | measured | why |
|---|---|---|
| **The 19 supplier price lists in `Parts Module (3).xlsx`** | ~130,000 rows (`Lowrance Price List` 65,541, `BLA` 14,601, `SAW` 12,348 …) | **not one Boat Module formula references any of them.** Every boat-side join lands on `Parts Maintenance` or `Dealer Fit Module`. |
| **The unreached 93 % of every library** | boat rows ever name **417 of 5,987 library rows = 7.0 %** (Parts Maintenance 67 of 2,948 = 2.3 %; Dealer Fit Module 88 of 1,778 = 4.9 %; Rigging Kits 262 of 1,261 = 20.8 %) | importing the three libraries whole multiplies the payload **14×** and adds nothing a boat row points at. **Import by reachability.** |
| **The obsolete half of the Boat Module** | 1,193 of 2,005 rows | A6. And it duplicates live models — row 1015 = row 115, rows 1534–1548 = rows 829–844 — so the importer must dedupe on `D Model Code`. |
| **`OF`–`OI` trailer slots** | `TRAILER NOT REQUIRED` on 811 of 812 live rows, **never anything else** | four empty columns |
| **Dealer-fit slots 18–42** | never populated on any of 2,005 rows | twenty-five empty columns |
| **80 PD checklist columns** (`UM`–`WJ`, `WM`–`XP`) | `Bungs, correct size thread & number` on 801 of 808 rows | boilerplate, not a relationship |
| **`Engine Hole` × 13** | differs between slots on 0.5 % of rows; `TBA` on 88 % of live cells | a boat fact duplicated thirteen times |
| **`KR PFD's Sup.`** | a count (4 ×1,551, 6 ×238, …); 0.00 % match against any part library | model it as a number, never as a reference |
| **The trailer `CD..FX` factory-option grid (80 cols) and the `KE..NP` registration-requirements band** | the registration band is populated on **no row** of the Trailer Module | requirements artefacts, not data |
| **`Q..AL` on the trailer table** (22 free-text feature columns) | — | the business's own `Trailer Spec Enquiry` sheet displays exactly eight columns (`H, I, J, K, L, M, N, O`); carry those, plus `BY Rego Type` and `BB PD Operation`, which is where the money moves |
| **Anything the business overtypes** — the derived columns | rigging kit **94.0 % typed**, motor/trailer slot itself **96.8 % typed**, prop description 8.3 %, prop part no. 6.8 %, **engine labour 0.0 %** | **the override rate is the instruction.** 0 % → carry as a computed column (R9). 6–8 % → carry as derived-with-override (R7). 94 % → carry the value and show the default as provenance, never enforce it (R8). |

### 5.8 · WHICH RULES BECOME APP RULES, AND ON WHICH SURFACE

`workbookRules.ts` records exactly why four of its six admitted rules cannot be
sentences: two are cross-kind, two are lookups, one is arithmetic, one needs a
column no table has. Those limits are respected below. Three surfaces exist:

* **SENTENCE** (`ConstraintDef`) — single-kind, columns compared to literals.
  `columns.ts` addresses columns as concepts (`kind + normalised name`) and
  `state.tablesFor` keeps only tables carrying **every** concept named, so a
  two-kind sentence reaches no table.
* **FLOW** (`RuleDef` — start → match → output) — walks rows, cross-kind, and
  already runs. `match` resolves a clause's `left` against the **candidate** row
  and a `{kind:'field'}` right against the **source** row, which is exactly the
  boat-versus-motor shape a sentence cannot say.
* **VIEW-PAGE BLOCK** (`ViewBlock.rule`) — a `ClauseGroup` scoped to one root
  row, evaluated per block, with the join carrying the curated answer beside it.

| ref | rule | surface | state |
|---|---|---|---|
| **A1** | Max HP ceiling, **scoped to slots 1–2** | FLOW | already running as `Motor fitment — Highfield`; scope it and replicate for the other six boat brands |
| **A2** | Min HP floor, warning only | FLOW + a severity | needs a non-blocking kind before it can be a sentence; **must never prune** |
| **A3′** | prop ∈ the motor's `GT:KO` options, `GT` pre-selected | VIEW-PAGE BLOCK (domain on the pairing) | needs `GT:KO` imported; supersedes A3's derivation shape |
| **A4** | prop part no. = `Parts Maintenance!E` for the prop description | *(none — a lookup)* | unchanged; needs an evaluated derivation clause or the full C→E table |
| **A5** | deposit stages total 100 % | *(none — arithmetic)* | unchanged; needs a formula RHS the solver evaluates and `QD..QH` seeded |
| **A6** | obsolete rows are not offered | **IMPORT** | make it a boolean `Obsolete` column at import — a rule should test a fact about the boat, not the address it was read from. **Its trailer twin (`Trailer!A656`) gets the same treatment.** |
| **F6** | shaft length matches the transom | FLOW | **build this first.** 99.92 %, needs only the boat's `KX` folded to inches; the motor side is already seeded as a number |
| **F7** | a Remote boat excludes tiller motors | FLOW, warning | one-directional — do **not** seed the converse |
| **F8** | trailer series is built for the boat's brand | FLOW | **blocked on two missing columns** (§6.4): boat `Brand` and trailer `Series Brand` |
| **F9** | trailer ATM ≥ boat weight | FLOW, warning, **written per boat table against that band's own weight column** | impossible for Jeanneau/Merry Fisher/Cap Camarat/Haines — those bands have no weight column. The block must be able to say "not evaluable here" rather than silently pass. |
| **F12** | a Tiller boat has no dual-battery PD kit | **SENTENCE** | the only new rule expressible on the sentence surface — single-kind, both columns on the boat. Still needs the non-blocking severity A2 is waiting for. |
| **F13** | slot order | *(not a rule)* | `__order` on the pair |

**One live rule this adjudication overturns.** `src/demos/northside.ts:2413`
seeds `Trailer fitment — Highfield` as `Trailer!K ATM ≥ Highfield!P Max Load`.
Re-measured†: it is **190 / 190 = 100 %** on the real pairings and leaves
**94.31 %** of the NSM Custom table (median 97.26 %). It is never violated and
it selects almost nothing — and `Max Load` is a payload, not towed mass. Its own
description already admits the test is wrong. **Keep it as a floor if you like,
but it is not the trailer rule; F8 is.**

---

## PART THREE · THE FLOW-ON EFFECTS

### 6 · THE IMPORTER CONTRACT

Everything in Part Two depends on the importer behaving identically every time.
Six clauses, each of which changed a number in this document.

#### 6.1 · The sentinel list, fixed

Counts in the five lenses differ by up to 0.9 % purely because each defined
"empty" differently. Fix it here, once. A slot value is **empty** if, after
whitespace collapse, it is:

```
""   "."   "0"
any value beginning "NR -" or "NR-"
any value containing "NOT REQUIRED"
"Optional Fuel Tank Not Required"
"Tiller Handle Standard w Motor"          (a sentinel: the kit comes on the engine)
"HAINES - Factory Fit Rigging Kit"
"Cap Camarat - Factory Motor Supplied Rigging Kit"
"Jeanneau Factory Fitted Motor / Rigging Combination"
the block's own header text leaked into a data cell
  ("Rigging Kit Option" ×104, "Additional Dealer Fit Options - Line NN", "Motor Option N",
   "Trailer - Option N", "Additional Package Options" ×819, "P/D - Parts & Accessories - NN")
```

**Removes 97.3 % of the dealer-fit block and 69.4 % of the P/D block.** Assert
the two identities from §2 as import tests: motor edges = motor×rigging pairs +
motorless-rigging, and rigging cells = pairs + orphans.

#### 6.2 · Resolve the band before naming a column

**Any importer that reads the Boat Module by the row-1 header alone mis-types
columns for 1,193 of 2,005 rows.** Column `Q` alone takes five meanings; `P` and
`S` take three each. `gen_boats.py` already does this correctly (it reads
`BHDR[str(band.hdr)]` with row 1 as fallback) — the requirement is that nothing
downstream undoes it. `KV/KW/KX/KY/KZ` are verified stable across all nine
bands; **their neighbours are not.**

Related: the **partial tenth band, row 955 FORMOSA, labels only columns A–T.**
It does not re-label `KZ`/`NZ`/`NT`, so the 39 Formosa rows inherit HIGHFIELD's
labels across the entire fan-out region. That is correct behaviour and must not
be "fixed".

**Factory boat+engine packages** — the F6 exclusion. A motor-slot value is a
package, not a motor, when its Motor Library row has no single `HP Rating` /
`Shaft Length` pairing consistent with the value's own model code, or, more
simply and checkably: when the value does not begin with a motor manufacturer
token (`Yamaha`, `ePropulsion`, `Suzuki`, `Mercury`). 52 of 55 live shaft
misses are caught by exactly that test†. Route them to their own `package`
table (J7/J8) or exclude them; never silently count them as motors.

#### 6.3 · Keys

* **Join on the display name in column `C` of every library** — 100 % / 100 % /
  98.8 % / 100 % / 99.4 %, and `C` is ≥ 99 % unique in all four libraries
  (§1.3†). The `Check Code Referance` index row (`Boat Module!2`, out to `ABD`)
  and the direct `='[N]Sheet'!$C$row` cells confirm the business treats
  column C as the primary key.
* **Carry the code as a secondary column, never as the key** — `Trailer!E Code`
  has 13 duplicates and `Motor Library!D` has 51. But carry it: it is what
  reconciles the 13 quote-side trailer misses that are the same trailer under a
  second marketing name.
* **Store the resolved row id, not the string.** The reason is on the page
  already: the master file retypes the boat name on **189 of 192 stock rows**,
  the one key every module joins on is the one field with no link, and two of
  those retyped cells are `#REF!`.

#### 6.4 · Two derived columns that do not exist and must

| column | on | how | what it unblocks |
|---|---|---|---|
| **`Brand`** | every boat table | the table's own identity, written as a real column | **F8's left side.** Today the brand is the table name, so no clause can name it. |
| **`Series Brand`** | every trailer table | the boat brand named in the series banner (`Trailer Module!C`, the row with no `E Code`), where one is named — **143 of 476 rows**, and all 143 are live | **F8's right side.** Today it is recoverable only by parsing a banner string. |

> **CORRECTED 2026-08-21 — `Series Brand` was 135 of 476 and is 143 of 476.**
> Re-measured off `Trailer Module.xlsx` with `openpyxl`. 135 is exactly what
> the column-`A` reading returns: `A187` is empty, so that reading loses the
> `GFAB - Surtees Series` banner and the **8** trailers under it, and
> 143 − 8 = 135. The corrected figure is the sum of §1.2's corrected per-brand
> cells (12 + 34 + 26 + 24 + 16 + 22 + 5 + 4 = **143**), and it is what the app
> already computes — its relationship reading shows "Series 143 of 434 kept".
> The two stale numbers agreed with each other because they shared one omission.
> **No obsolete trailer sits under a brand-naming banner**, so live and all-row
> counts are the same 143 here.

Plus two booleans: **`Obsolete`** on boats (A6) and on trailers (its twin), read
from the divider at import.

And on the boat table: **do not seed a single "weight" column.** Seed a
brand-aware `Boat Weight` reading `P` for Stacer/Stabicraft/Formosa, `S` for
Highfield, `K` for Surtees — and seed `Max Load` **only** for Highfield, where
`P` means that. Getting this wrong reads a payload as a weight for 590 rows.

#### 6.5 · Three tables the joins need and the app does not have

| table | kind | rows to import (reachable) | rows in the library | needed by |
|---|---|---|---|---|
| **Dealer Fit Module** | `package` | **83 live** (88 all rows) | 1,778 | J19–J21 |
| **Rigging Kits** | `accessory` | **215 live** (262 all rows) | 1,261 | the rigging column on J1–J8, and `UH` in R9 |
| **Motor prop options** (`Motor Library!GT:KO`) | columns on the motor table | 100 columns × 363 motors with ≥1 | — | A3′ |

**And a sixth workbook is not attached.** ASSERTED:
`xl/externalLinks/_rels/externalLink5.xml.rels` targets
`…/Master Price File/Rigging Module.xlsx`. **Every rigging kit and every rigging
labour hour comes from it.** ~~A 5.77 MB cache of its `Rigging Kits` sheet is
embedded in `Boat Module (5).xlsx` and the rule was read from that cache — but a
cache cannot prove absence, and here is the demonstration: column `O`, the
lookup target of `UH Rigging Kit Labour`, has **zero cached values** yet `UH829`
returns `5.8`.~~ **Ask the owner for `Rigging Module.xlsx`.**

> **STRUCK, and the demonstration was the wrong way round.**
> `FOUR_MODULES.md` §3.1 obtained the file and compared it to the cache cell for
> cell: **42,372 cells present in both, 0 differing, 0 that the cache does not
> carry, 0 that the real sheet does not** — and column `O` has **1,448 cached
> cells, 1,247 of them non-blank.** `Boat Module!LA829` names a kit,
> `Rigging Kits!C382` is that same string, and `Rigging Kits!O382 = 5.8` is the
> value `UH829` returns. **The cache is a byte-exact mirror and the hours were
> cached all along.** The file was still worth asking for, for the DERIVATION
> rather than the data: the price ladder, the two external labour rates, the
> `OBSOLETE RIGGING KITS` divider at `C829`, the six preamble sentinels, and one
> sheet the cache genuinely does not carry (`Rigging Spec Enquiry`). The
> `Rigging Kits` table in the seed is built from the real file
> (`src/demos/northside.ts`, `rig_kits` — 640 rows), so this clause is now
> history rather than a request.

#### 6.6 · One file cannot be opened at all

`Motor Module (1).xlsx` is a **truncated zip** — its
`xl/externalLinks/externalLink1.xml` holds 208,063 of a declared 26,207,039
bytes and there is no end-of-central-directory record, so openpyxl raises
`BadZipFile`. `tools/seed/probes/motor_00_salvage.py` walks the local file
headers and rebuilds a valid archive in the scratchpad. **That salvage belongs
in the import path, not in a probe script** — it is the only thing standing
between this data and a hard failure.

### 7 · WHAT CHANGES IN THE SEED

`tools/seed/gen_all.py` today emits four joins totalling 288 rows over a curated
sample. The changes, in dependency order:

1. **Emit `__origin` / `__recommended` / `__order`, not fresh field ids.**
   `JOIN_COLS_MOTOR` declares its own `rec` (boolean) and `slot` (number)
   columns, so `readPairs` returns `recommended: false` for **every row of the
   real seed** — recorded at `src/features/quote/index.ts:73-87`. The
   consequence is exact: a quote made from the Northside data opens with its
   motor and trailer sections **empty** and costs one extra pick per section.
   **This is the cheapest fix in the document and it needs no contract change.**
2. **Widen the trailer slot loop from 10 to 6** (`TRAILER_SLOTS`), and **keep
   the dealer-fit and P/D loops at their full declared width** (42 and 10). §1.6.
3. **Add J3–J8** (four generator entries plus the two package tables) and
   **J9–J18** (six more trailer joins, all against tables that already exist).
4. **Add the `Dealer Fit Module` table and J19–J21.** New table, new extract.
5. **Add the `Rigging Kits` table** so the join's rigging column can become a
   `reference` instead of text.
6. **Correct the trailer provenance string.** `gen_all.py` writes on every
   trailer table: *"Brand membership for this block comes from the HIDDEN
   Dropdowns sheet (row 1, one column per brand) — the data sheet alone cannot
   tell you."* **88 of 476 trailer rows (18.5 %) appear in no brand column**, 55
   of them in live use, including the entire `REDCO - Formosa` series (24 rows)
   and `DUNBIER / HAINES BMT` (16 rows). `gen_all.py` in fact derives brand from
   **row bands** (`TRAILER_BRANDS`, `r0`/`r1`), which is the correct source. The
   code is right and the sentence printed to the user is wrong.
7. **Fold `KX Shaft Lgth` to inches** on the boat tables (or add a normalised
   numeric column beside it), so F6 can be written. `mot_yamaha` already carries
   `Shaft Length in` as a number.

### 8 · WHAT CHANGES ON THE SCREENS

#### 8.1 · A module's detail page

`MODULE_SYSTEM.md` establishes that a new module seeds its Related blocks from
whichever joins point at its master. So this document's join list **is** the
Highfield module's detail page:

| block | table | join | live pairs |
|---|---|---|---|
| Motors that fit | `mot_yamaha` | J1 | 2,520 |
| Trailers — custom cradles | `trl_nsmcustom` | J9 | 146 |
| Trailers — GFAB alternatives | `trl_gfab` | J13 | 51 |
| Dealer-fit packages | *(new)* `dealer_fit` | J19 | 1,355 |
| Parts fitted at pre-delivery | `parts` | J22 | 1,707 |

Today that page shows three blocks and two of them are half the relationship.
The Stacer module gains three blocks it does not have; Stabicraft, Surtees,
Formosa, Jeanneau and Haines gain **all** of theirs — they currently have none.

**And the block must render the empty case honestly.** 462 of 812 live boats
have no trailer; Stacer, Surtees, Haines, Formosa and Cap Camarat have no
dealer-fit edges at all; 4 Jeanneau boats have no trailer slot populated.
"No standard trailer is recorded for this boat" and "this brand has no
dealer-fit packages" are two different sentences and both are true statements
about the data.

#### 8.2 · What the quote can pull through automatically

Today `createQuoteFromView` builds a section per top-level view block, and every
section opens empty because of the `__recommended` defect (§7.1). After the
seed change:

* the **standard-fit motor pre-ticks** on 810 of 812 live boats (`KZ` populated
  99.8 %)
* the **standard trailer pre-ticks** on 350 (43.1 %) — and correctly does not on
  the other 462
* the **rigging kit, prop part number, prop description and engine hole** arrive
  with the motor, because they are columns on the pair
* the **engine labour** (`UF`/`UG`/`UH`/`UJ`) computes from the motor and the
  rigging kit — 0 % overridden in 2,436 cells, so this is arithmetic, not a
  guess
* the **bill of materials** — 2,561 P/D parts across the live catalogue —
  arrives as lines, which is exactly what it is: `SZ/TA/TB Parts CTD` are empty
  on all 2,005 rows, so these parts are assigned and never priced on the boat
  row

**What it must NOT do is compute the price.** ASSERTED, from `map-quote.md
§4.3`: across the 47 stock units where hull, motor and trailer all resolve,
**every one of the 47 quotes exceeds the catalogue sum, none is below it, and
not one lands within $50 at any level of build** — median gap +$19,064 falling
to +$5,240 once rigging is added, ratio 1.105 to 1.669. `Quote Sheet!D1` is
**authored, not derived.** The right surface shows the derived build **and** the
authored number **and** the gap, because the gap is where the deal lives.

#### 8.3 · The rule cards

Six seeded rules today, all six `blocked`. This document adds five admitted
rules (F6, F7, F8, F9, F12) and one amendment each to A1, A2 and A3.

**Of the eleven, exactly one can be a sentence today (F12), and it is waiting on
the same non-blocking severity A2 is waiting on.** Four are flow rules and one
of those (F8) is additionally blocked on two columns that do not exist. That is
not a discouraging tally — it is the honest one, and `workbookRules.ts` exists
precisely so the tally is visible rather than papered over with approximations.

**Four rules must be recorded as REFUTED**, in the same voice as the blockers,
so nobody re-derives them: `ATM ≥ weight + Max Load` (52.5 %),
`Between Guards ≥ beam` (0.0 %), `Boat Size band contains hull length` (50.0 %),
`Boat Size ≥ hull length` (9.4 %). A refutation with a number on it is a
finding; the absence of one is an invitation to guess again.

### 9 · WHAT WOULD HAVE TO CHANGE IN THE CONTRACT

Ordered by how many admitted rules each unblocks.

| # | change | unblocks | note |
|---|---|---|---|
| 1 | **A pair-scoped `FieldPath` (a `RowScope`, which `ViewColumn` already carries) plus a sentence token that renders a column on the right-hand side** | **A1, A2, F6, F7, F8, F9** — six of the eleven | `ValueExpr` already has `{ kind: 'field' }` and `solve.enforceClause` narrows both columns from it; the gap is `describe.literalOf`, which returns null for a field RHS and would print an unfinished sentence |
| 2 | **A non-blocking severity on `ConstraintDef`** (or a fifth `ConstraintKind`) | **A2, F7, F9, F12** | every existing kind removes values in `solve.prune`; A2's admission is conditional on never filtering |
| 3 | **An evaluated relationship hop** — `FieldPath.viaFieldId` is dropped today by both evaluators | **A3′, A4** | `configure/evaluate.clauseFieldId` returns undefined for a hop; `constraints/state.clauseHolds` ignores it outright |
| 4 | **`EntityDef.priceLevels`** | the quote's price ladder | already the one blocking gap named in `features/quote/index.ts`; unrelated to fitment but it is what turns §8.2 into a real number |
| 5 | **A formula right-hand side the solver actually evaluates** | A5 | `{ kind: 'formula' }` returns `'M'` today |

**And one thing that does NOT need to change.** `PAIR_FIELDS` is the right
shape and this adjudication found no reason to widen it. `__origin` already
carries the distinction the workbook itself recorded — **86 trailer cells are
live external links and 1,109 are typed strings**, which is `'rule'` versus
`'added'` written in the difference between a formula and a literal, and inside
the linked bands the typed cells are 37.3 % (Stabicraft) and **98.6 %**
(Surtees) of the total. `__recommended` is asserted by nine identical header
rows. `__order` is the pair's primary key (§1.4†). The three columns are enough.

---

## APPENDIX A · REPRODUCTION

Every **†** figure in this document was computed by these scripts, in this
session's scratchpad, from extracts produced by the five lenses. They read only
extracted JSON and one pickle written by this same session; no workbook in
`C:/Users/AsafA/Downloads` was opened for writing at any point.

```
scratchpad/adj/a1_rig.py     rigging membership — settles §1.1 (the 79.4 % / 53.3 % split)
scratchpad/adj/a2_trailer.py trailer series banner inventory, 48 series over 476 rows
scratchpad/adj/a3_gate.py    §1.2 gate hit rates and discrimination; §1.3 key uniqueness
scratchpad/adj/a4_depth.py   §1.6 slot depth and the edge loss of every declared depth
scratchpad/adj/a5_shaft.py   §1.5 shaft join; F1/F2 envelope recount, slot by slot
scratchpad/adj/a6_miss.py    the 55 shaft misses, split typo vs factory package
scratchpad/adj/a7_pairs.py   §2 the fan-out table, per band, and distinct partner counts
scratchpad/adj/a8_keys.py    library key uniqueness — Motor, Parts, Rigging, Trailer
scratchpad/adj/a9_dup.py     §1.4 pair identity collapse under three candidate keys
scratchpad/adj/b1_joins.py   §5.1 / §5.2 the join list, measured
scratchpad/adj/b2_hfrule.py  §5.8 the seeded Highfield trailer rule, re-tested
```

## APPENDIX B · THE THREE THINGS TO PUT IN FRONT OF THE OWNER

1. **30 live pairings offer a discontinued trailer, and every one is Surtees —
   8 of them as the boat's *standard* trailer.†** Surtees is also the one brand
   where the external link to the Trailer Module has been typed over (73 of 74
   cells) and the one brand where the series rule breaks. Those are the same
   fact.

2. ~~**`Rigging Module.xlsx` is not among the five workbooks.** Every rigging kit
   and every rigging labour hour on every boat row comes from it. We read the
   rule from a cache embedded in the Boat Module and the cache is demonstrably
   incomplete.~~
   **STRUCK — the cache was a byte-exact mirror** (42,372 cells, 0 differing, 0
   missing either way), so nothing was read from an incomplete source. The file
   arrived and is now the source of the seed's `rig_kits` table; what it added
   was the derivation, not the data. See §6.5 above and `FOUR_MODULES.md` §3.1.
   **A correction stated clearly is worth more than the original finding**, and
   this one costs nothing except the admission.

   What replaces it as the thing to put in front of the owner:
   **153 live rigging triples on 31 live boat rows name a kit from below the
   `OBSOLETE RIGGING KITS` divider — 24 distinct kits, and NINE are in slot 1,
   the boat's standard fit** (all Stabicraft rows 178–194). That is item 1 above
   repeating in a second library, which makes it one report and not two fixes
   (`FOUR_MODULES.md` §3.9).

3. **The one live quote form in the Master Price File has a cell labelled
   `Boat:` that nothing reads.** ASSERTED: zero references to `[1]Boat Module`
   anywhere on that sheet. It offers all 1,665 packages to every job while
   hiding 199 others, because it has no boat to filter by. That is the receipt
   for why a view page's per-boat block matters, and it is worth showing the
   owner beside the page we build to replace it.
