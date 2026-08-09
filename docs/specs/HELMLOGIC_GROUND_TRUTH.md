# HELMLOGIC GROUND TRUTH

> ## ⚠ THIS IS NOT A DATA SOURCE
>
> **Never take a value from the HelmLogic app to populate our tables.** Not a
> price, not a spec, not a model name, not an enum member.
>
> The app's data is *derived*: it passed through a Python importer keyed to
> hardcoded absolute column numbers, with per-brand column re-labelling, a
> `#N/A` quarantine, three generations of repair scripts (one of which
> double-wrapped every console price in production), and a documented policy of
> *"the data model flexes to fit the MPF"* with every schema `.passthrough()`.
> It is a lossy copy.
>
> **The Excel workbooks are the source of truth** — the four Modules (Boat,
> Motor, Trailer, Parts) and MASTER PRICE FILE.xlsx. Every value we seed must be
> traceable to a cell in one of those. Where the workbook has no value, our cell
> stays empty; we never fill a gap from the app.
>
> **Use this document for STRUCTURE AND LESSONS ONLY** — what the levels are
> called, which patterns are worth adopting, and which mistakes to avoid.
> See also `QUOTE_FINDINGS.md` and `CONFIG_FINDINGS.md`, which carry the same
> restriction.

**What the real marine dealership domain actually looks like, and what that means for
this configurator.**

Source: three read-only surveys of the production HelmLogic app
(`C:/Users/AsafA/HelmLogic`) — a Next.js + Firestore application built for Northside
Marine, reverse-engineered onto a 17-workbook Excel "Master Price File" (MPF).
Nothing in that repo was modified. All `file:line` citations below are as reported by
the surveys against the files on disk.

This document exists to correct **our** model. It is not a plan to copy HelmLogic.
Where HelmLogic is right, we adopt. Where it hurts, that pain is our product.

The governing fact about the production app, in its own words
(`tasks/mpf-audit/MAPPING.md:3`):

> "Policy (decision logged): **HelmLogic's data model flexes to fit the MPF.**"

And its own surrender on having a schema at all (`CLAUDE.md:189-190`):

> "Schemas for legacy Firestore data must be fully permissive — every nested field
> `optional().nullable().default()`, every object `.passthrough()`. … **Validation is a
> safety net, not a gatekeeper.**"

That is the hole we are filling.

---

## 1. GROUND TRUTH

### 1.1 The hierarchy is NOT the same depth for every product type

| Product | Real path | Levels | Business word for the middle level |
|---|---|---|---|
| **Boats** | `data-warehouse/{vendorId}/ranges/{rangeId}/models/{modelId}/variants/{variantId}` | **4** | **Range** |
| **Trailers** | `data-warehouse/{vendorId}/series/{seriesId}/trailers/{trailerId}` | **3** | **Series** |
| **Motors** | `data-warehouse/{vendorId}/dataSets/{dataSetId}/rows/{rowId}` | **3**, but the middle level is a *spreadsheet sheet*, not a taxonomy | *(none — "Series" is a column)* |

Stated outright by the app itself, `src/components/catalog-hierarchy-export.tsx:14-16`:

> "Scope: Boats only. **Motors + Trailers are flat per-vendor lists with no range layer**"

`CLAUDE.md:112-127` and `tasks/SESSION_HANDOVER.md:137-143` both carry the boat block
verbatim, ending `variants/{variantId}  <- SKU: material + color + sellPriceExclGst`.

Trailers deliberately mirror boats with a different noun —
`tasks/v1.4-trailers-module-design.md:80`: series *"Matches Highfield `ranges/{rangeId}`
shape."*

**Take-away: level *count* and level *name* are both per-table properties. There is no
universal "Range".**

### 1.2 Vocabulary, in the business's own words

| Our word | Their word(s) | Evidence |
|---|---|---|
| Brand | **Brand** in the UI, **Vendor** in the data (`data-warehouse/{vendorId}`, typed by `vendorType`) | `src/app/(app)/data-warehouse/page.tsx:85-95`; `boats-table-view.tsx:90` filters `where('vendorType','==','Boat Brand')`, placeholder reads "Select a brand" |
| Range | **Range** (boats) — *"model series/code prefix"* | `CLAUDE.md:136` |
| Range | **Series** (trailers), also a motor *column* | `v1.4-trailers-module-design.md:13,70-80`; `importer-registry.ts:75-87` |
| Model | **Model**; key is **Model Code** (`CL380`, `SP560`) | `CLAUDE.md:137` |
| Variant | **Variant** ≡ **SKU** — *"one per material × color combo"* | `CLAUDE.md:138`; `HIGHFIELD_DATA_REVIEW.md:10` counts "Variants/SKUs" |
| Table | **Module** in the business's spreadsheets (Boat Module, Motor Module…) — but HelmLogic overloaded `modules/{moduleId}` to mean "an org's access to a vendor". The thing that is actually a table is a **DataSet**. | `tasks/mpf-audit/INVENTORY.md:5-22`; `SESSION_HANDOVER.md:329-333` |
| Row | **Row** (`rows/{rowId}`) | `master-price-file-workspace.tsx:153` |
| Column | **Column** — but *auto-detected from whatever keys the row docs happen to have*. No schema, no type, no label, no order. | `master-price-file-workspace.tsx:160-161` |

Load-bearing trade nouns we must not invent alternatives for:

- **CTD** = Cost To Dealer. `Act CTD` = actual cost, `Act Sell` = actual sell (`CLAUDE.md:179`)
- **MU / GP** = Markup % / Gross Profit $
- **PD / PDI** = Pre-Delivery (charges + labour), tiered **Basic / Standard / Complex**
- **ATM / Tare** = Aggregate Trailer Mass / unladen mass. **ATM drives the rego band** (`CLAUDE.md:26`)
- **Dealer Fit / DFO** = dealer-installed accessory packages
- **Fit-Up** = labour/prep bundling, tiered **simple | medium | complex**
- **Rigging Kit / Prop / Engine Hole** = the three things bolted to a motor slot
- **Franchise** = DMS brand code — `9ST` Stacer, `9HI` Highfield, `9JE` Jeanneau, `9DU` Dunbier
- **Price level / price ladder** = `hull_cash`, `hull_trade`, `hull_subdealer`, `hull_subdealer_excl`, `hull_aus_sailing`; motors add `hull_commercial`, `hull_boating_alliance`

### 1.3 Real values, so our demo data is not fiction

**Boat brands**: Highfield (slug `highfield`, currency **USD**), Stacer, Stabicraft,
Surtees, Jeanneau, Haines Signature, Formosa.
**Motor brand**: Yamaha.
**Trailer brands**: REDCO, TINKA, STACER, DUNBIER, MACKAY, GFAB, NSM CUSTOM — plus a
pseudo-brand literally named **"TRAILER NOT REQUIRED"** (`scripts/seed-trailers.ts:152-165`).

**Highfield ranges (7)**: Adventure (`ADV`, 1 model) · Classic (`CL`, 19) · Coaster (3) ·
Patrol (`PA`, 16) · Roll-Up (`RU`, 12) · Sport (`SP`, 16) · Ultra-Light (`UL`, 9).
Live census across all brands (`STRUCTURE_AUDIT.md:60`): Highfield 7 ranges / 85 models /
640 variants; Stacer 10/91/91; Stabicraft 7/40/37; Jeanneau 8/48/**27**; Surtees 5/21/19;
Formosa 1/39/39; Haines 1/9/9.

**Variant axes are Material × Colour.** Materials: `HYP` (Hypalon/CSM, 366 SKUs) and
`PVC` (261). Colour codes are compound tokens decoded through a ~15-entry part map —
`B-G-DG`, `W-W-WD`, `LG-W-LB`, `I-B-C` — where `W`=White, `B`=Black, `G`=Grey,
`DG`=Dark Grey, `LG`=Light Grey, `LB`=Light Blue, `WD`=Wood, `MB`=Military Black,
`C`=Carbon (`HIGHFIELD_DATA_REVIEW.md:3265-3279`; `scripts/reseed-correct-vendor.py:57-71`).

Real SKU rows: `CL260 | HBC008 | HYP | B-G-DG | $2,634` · `ADV7 | HBA001 | HYP | B-G-B |
$23,527` · `Coaster 600 ST | HB600 | PVC | DG-G-DB | $11,807`.

**Motor model codes**: `F2.5SMHB`, `F4SMHA`, `F4LMHA`, `T9.9XPB`, `F25SWTC`, `F90XB`,
`LF200XA`, `XF425`. Display name format `Yamaha - F25SMHC` — **and that string is the
join key** from a boat to a motor. Shaft: 15" / 20" / 25" / 30" (also coded S/SS/LS/XL).
Control: 11 distinct values from `Tiller handle` to `DEC with Digital Electric Steering`.

**Trailer codes**: `RE1213`, `TA600-MOB`, `TA730T-EH`, `TALS749S13`, `SRW5.7M-13TB`.
Series names: `REDCO - Sportsman Trailers`, `TINKA - Aluminium Trailers`, `GFAB TRAILERS`,
`ROLLAMATIC WIDE SERIES (Width Between Guards 1790mm)`.
Typed spec object (the **only** typed spec object anywhere in the production repo,
`scripts/seed-trailers.ts:302-311`):
`{ boatSizeMtr, wheelSize, tareKg, atmKg, winch, betweenGuardsMm, lengthMtr, plug }`.

### 1.4 "Accessories" is four different species, not one

The production app conflates them and pays for it. They are:

| Species | Where it lives | Real shape | Scale |
|---|---|---|---|
| **Factory option** | embedded array `models/{id}.optionalFeatures[]` | `{ id, name, category, code, color, imageUrl, applicableVariantIds[], associatedSkus[], associatedSeatId, isStandard, cost, sellPriceExclGst }` (`highfield-model-editor.tsx:55-68`) | 19,171 option rows across 706 boat sections |
| **Dealer fit option (DFO)** | `organisations/{org}/dealerFitSelections` | **two levels: Package ▸ Component**. Package: Description, Code, CTD, Inflation, Adj CTD, Tot Parts CTD, Parts Sell, Total Lab, Labour CTD, Labour Ret, Sundry, Sublet, Act CTD, MU, GP, Act Sell. Component: Package Code, Accessory #, Accessory, Code, CTD, Sell, Labour, Lab Hrs, Sundry, Sublet | 1,791 rows / 93 sections |
| **Rigging kit** | `organisations/{org}/riggingKits` | kit ▸ components, 3-tier pricing (Kit Sell / Trade / Sub Dealer) + install labour, 30+ money fields (`mpf-parsers.ts:62-93`) | 846 kits |
| **Service / spare part** | `organisations/{org}/serviceParts` | key = **Franchise + Part**; Franchise, Part, Description, Stock OH, Bin, Daily, MU, GP, List, Retail+GST | 26,345 |

The **factory option category vocabulary**, after normalisation
(`scripts/reseed-correct-vendor.py:74-87`): *Consoles · Seats · Rigging · Covers ·
EVA Teak · Tops · Hardware · Accessories · Electronics*. The raw factory categories are
*Console (217) · Spare parts (265) · Roll bar&Ladder (150) · Seat (96) · EVA Teak (94) ·
Cover (47) · Top (36) · EP (34) · Tow post (20)*.

### 1.5 Options attach at FOUR different grains

This is the single most important structural fact in the domain.

1. **Variant axis** — material and colour are *not options*, they select a different
   document with a different price. Quote step 1 renders a material picker then a colour
   picker (`highfield-quote-flow.tsx:800-823`).
2. **Model-level factory options** — an array on the model, with
   `applicableVariantIds[]` restricting which SKUs may take it. **Empty = applies to all.**
3. **Variant-level curated menus** — the dealer's shortlists hang off the *variant*:
   `motorMenu[]`, `trailerMenu[]`, `dealerFitLines[]`, `priceLadder{}`, `pdTiers[]`.
   In the source spreadsheet these are **fixed-width slot grids**: 13 motor slots
   (each 6 columns: motor + rigging kit + prop part no + prop description + engine hole),
   10 trailer slots, 42 dealer-fit slots — with unused slots holding sentinel strings
   (`NR - ENGINE NOT REQUIRED`, `TRAILER NOT REQUIRED`, `.`) because the grid is fixed
   width (`tasks/mpf-boat-page-signifiers.md`).
4. **Cross-level allowlists ANDed** — fit-up items scope themselves with five parallel
   arrays: `moduleIds[] · brandIds[] · rangeIds[] · modelIds[] · variantIds[]`, empty
   meaning *no restriction at that level* (`fit-up-catalog-manager.tsx:79-92`). This is
   the closest thing in the production app to a generic "scope an option to a level of
   the hierarchy" primitive, and it is the right idea.

Plus **option → option** relations: `associatedSeatId` pairs a console to a seat, and the
seat must match the console's colourway. That relation has been repaired by developer
script **twice** in production (`scripts/repair-console-seat-pairing.py:3-16`;
`scripts/fix-gt-console-seat-pairing.py:1-20`).

### 1.6 Money, in the domain's real terms

- Everything internal is **ex-GST**; MPF/display-sheet money is **inc-GST**. `GST_MULTIPLIER = 1.1` is hardcoded (`derive-pricing.ts:24`) even though `organisation.gstPercentage` exists.
- `cost` = buy price. `sellPriceExclGst` = retail. Margin bands: **red < 15%, amber < 25%, emerald ≥ 25%** (`derive-pricing.ts:112-115`).
- Currency is **per brand and implicit**: Highfield base is **USD ÷ 0.70**, Jeanneau/Merry Fisher **EUR ÷ 0.6**, NZ ÷ 1.2, everything else AUD — *none of it labelled per row*.
- The landed-cost chain is a verified 17-step waterfall (`boat-module.md:118-128`):
  `(Base Cost + Factory Discounts + Boat Prep + Base Freight + Documentation + Fumigation + Ocean Freight + Fuel Surcharge + Other Charges) ÷ FX (+ Duty) + Other Chg $A + Road Freight`
- Then a price ladder: `Trade = Cash × 0.95 · Sub Dealer = Cash × 0.825 · Sub (Exclusive) ≈ Sub Dealer × 0.975 · AUS Sailing = Cash × 0.80 · Warranty ≈ Landed × 1.065` (`boat-module.md:130`).
- **A price can be a word.** The Sell column carries `Std` (142 rows = standard inclusion), `Bundle` (347 = only purchasable inside a pack), `POA`, `0`, `$ -`, plus 33 `#N/A` and 5 `#VALUE!` frozen formula errors (`factory-options.md`).
- **Negative prices are legal**: 95 negative-price options, e.g. `7002750000` "No Hydraulic Steering (Fitted or Supplied)" **−$4,480** (`PRESENTATION_AUDIT.md:38`).

### 1.7 The real shape of a deal (what the catalogue has to feed)

> Boat variant (SKU) + factory options + custom options + motor + motor accessories
> (rigging kit, prop, install) + trailer + trailer options + registration (boat rego /
> sticker / tender-to / trailer rego) + dealer fit (scoped boat|motor|trailer) +
> fit-up/rigging package (tiered) + PD tier + promotions/rebates + trade-in.

Quoting unit can be `full | hull-only | engine-only | trailer-only`
(`src/lib/catalog/v2-platform.ts:16-19`). Quote steps are
`Boat Base → Factory Options → Motor → Trailer → Dealer Fit → Administration → Summary`
(`highfield-quote-flow.tsx:186-196`).

---

## 2. CORRECTIONS TO OUR PRESETS

Read this against `src/types/model.ts`. Every list below is meant to be pasted in.

### 2.0 Three model changes needed before the tables can be right

These are prerequisites; without them the corrected columns below cannot be expressed.

```ts
export interface KindColumn {
  name: string
  type: FieldType
  options?: string[]
  linkTo?: TableKind
  /** NEW — the unit the number is in. Rendered as a suffix, carried into
   *  import parsing, and shown on the column header. Kills the entire
   *  metres-vs-millimetres guessing class. */
  unit?: string
  /** NEW — this column is (part of) the row's natural key. Duplicates are
   *  flagged live. Multiple columns may be flagged: the key is composite. */
  key?: boolean
  /** NEW — allowed on the hierarchy levels: the level's own noun.
   *  'Range' for boats, 'Series' for trailers, per table. */
}

/** NEW on StructurePreset — levels need types, not just names, because
 *  level 1 is almost always a link to a Brand table, and the leaf level of
 *  a boat is generated from axes rather than typed. */
export interface StructureLevel {
  name: string
  type?: FieldType        // default 'text'; 'reference' for Brand
  linkTo?: TableKind      // when type === 'reference'
  optional?: boolean      // level may be absent — see §2.1 degenerate leaf
  axes?: string[]         // leaf generated from these columns (Material × Colour)
}
```

`hierarchy?: string[]` on `EntityDef` already holds fieldIds, so a `reference` field can
be a level with no storage change. What must change is the **group-row renderer**
(resolve the referenced row's label) and **row pre-fill** (write the referenced row id,
not its name).

### 2.1 `boat` — mostly right, wrong default, wrong units, missing the key

| | Verdict |
|---|---|
| Structures | **Default is wrong.** |
| detailColumns | **Half wrong.** Unit errors, missing natural key, single `Price`. |

**Corrected structures** (first = default):

```
1. Brand ▸ Range ▸ Model ▸ Variant   DEFAULT
   "A brand's ranges, their models, and each model's colour and material SKUs."
   levels: Brand(reference→brand) · Range · Model · Variant(axes: ['Material','Colour'], optional: true)

2. Brand ▸ Range ▸ Model
   "Models are sold as one item — no colour or material split."
   (This is Stacer/Stabicraft/Surtees/Formosa/Haines. 91 models / 91 variants.)

3. Brand ▸ Model
   "A short catalogue with no range grouping."

4. Flat list
```

Why the 4-level shape must be the **default**, not the third option: the variant is
where the price lives (`CLAUDE.md:138` — *"each has `sellPriceExclGst`"*), 640 of
Highfield's 85 models' rows are variants, and every downstream money and compatibility
decision keys off the SKU. Offering it third teaches the user the wrong mental model.

Why `Variant` must be marked **`optional: true`** — the **degenerate leaf**. Real variant
counts per model run **1 to 15**: Coaster 600 ST = 1, `RU250 Easy Go` = 1, `RU*` = 4,
`ADV7` = 7 (HYP only), `UL*` = 8, `PA*` = 10, `SP300–SP660` = 15. And 26 models have
**zero** variants — *"Jeanneau 21 of its 48 models — most of the brand"*
(`STRUCTURE_AUDIT.md:75`). Our renderer must collapse a level that has one value and must
render a model with no children as a leaf row, not an empty group.

**Corrected detailColumns:**

| Name | Type | Unit | Key | Note |
|---|---|---|---|---|
| `Model Code` | text | — | **✔** | The one genuinely required field in the whole production boat schema (`highfield-model-editor.tsx` — `modelCode: z.string().min(1)`) |
| `SKU` | text | — | **✔** | Variant-level natural key. `HBC008`, `HB600` |
| `Material` | select | — | | `HYP`, `PVC`, `Aluminium`, `Fibreglass` — **variant axis** |
| `Colour` | text | — | | Compound code `B-G-DG` **plus** a decoded `Colour Name` — **variant axis** |
| `Length m` | number | **m** | | ~~`Length ft`~~ — Australian marine is metric. `boatSizeMtr`, `lengthMtr` throughout. |
| `Beam m` | number | m | | Real column (`Beam`) |
| `Hull Weight kg` | number | kg | | `Boat Weight` |
| `Max Load kg` | number | kg | | `Max Load` |
| `Max People` | number | — | | Real column |
| `Deadrise °` | number | ° | | Real column |
| `Min HP (total)` | number | HP | | **Semantics matter.** These are *total installed* HP, not per-engine — `INVARIANTS_AUDIT.md:43`: *"The MPF's Min HP / Max HP columns are TOTAL installed HP … The first audit run compared per-engine HP against that total envelope, so all 49 twin-rig rows … were false alarms."* The production app made the same mistake (FFR-31). |
| `Max HP (total)` | number | HP | | as above |
| `Engine Count` | number | — | | 1 / 2 / 3 — without it the HP envelope is unusable |
| `Cost ex GST` | number | AUD | | ~~single `Price`~~ |
| `Sell ex GST` | number | AUD | | |
| `Currency` | select | — | | `AUD`, `USD`, `EUR`, `NZD` — **per brand, and implicit in the source**. Highfield is USD. |
| `Status` | select | — | | `Current`, `Obsolete`. **59.6% of the real boat catalogue is obsolete rows that must stay addressable** — 2,003 rows = 810 current + 1,193 obsolete, and 633 Model Codes appear **twice**, current *and* obsolete (`boat-module.md:3`). Without this column the natural key is not unique. |

**Drop**: `Length ft` (wrong unit), bare `Price` (ambiguous), `Weight kg` (rename).

### 2.2 `motor` — structure preset is wrong

| | Verdict |
|---|---|
| Structures | **Wrong default.** Motors have no Range. |
| detailColumns | **`Shaft` options are invented.** Missing almost every real spec. |

**Corrected structures:**

```
1. Brand ▸ Model            DEFAULT
   "One flat list of engines per brand — how outboards are actually catalogued."
2. Brand ▸ Series ▸ Model
   "Group engines by their factory series (F, T, LF, XF, V MAX SHO)."
3. Flat list
```

Evidence for the default: `catalog-hierarchy-export.tsx:14-16` states motors have "no
range layer". The real store is 235 rows in one flat dataset. Series exists only as a
*column* in a dormant importer map (`importer-registry.ts:75-87`) — offering it as
structure #2 is the right generosity; making it the default is wrong.

**Corrected detailColumns:**

| Name | Type | Options / unit | Key |
|---|---|---|---|
| `Model Code` | text | — | **✔** — `F90XB`, `T9.9XPB`. Also known as `Part Number`; 51 duplicate motor model codes exist, so key is composite with Status |
| `Model Name` | text | | Display name `Yamaha - F25SMHC` |
| `HP` | number | HP | Note: source encodes twin rigs as `"2 × 300"` — must parse, not `parseFloat` (`CLAUDE.md:184`) |
| `Engine Count` | number | | 1 / 2 / 3 — makes the `2 × 300` case representable instead of a parsing bug |
| `Shaft` | select | **`15" (S)` · `20" (L)` · `25" (X)` · `30" (U)`** | ~~`Short` / `Long` / `Extra long`~~ — invented; the trade says inches |
| `Control` | select | `Tiller handle` · `Remote` · `In Box - 703 Remote` · `DEC` · `DEC with Digital Electric Steering` | 11 distinct real values; **typed on only 11 of 224 rows in production**, so the tiller/forward-control compatibility check is *effectively unenforced* (`motor-module-map.md:48`) — a live example of why a declared enum matters |
| `Starting` | select | `Manual` · `Electric` | |
| `Tilt & Trim` | select | `Manual` · `Power Tilt` · `Power Trim & Tilt` | |
| `Fuel Tank` | text | | Real key in production is literally `"Fuel\r\nTank"` — contains a carriage return |
| `Prop` | text | | `6P AL`, `9-1/4P AL DT` |
| `Cylinders / Displacement` | text | | |
| `Weight kg` | number | kg | |
| `Rev Range` | text | | |
| `Warranty` | text | | `2+2` |
| `Colour` | text | | `Engine Colour` |
| `Cost ex GST` | number | AUD | |
| `Sell ex GST` | number | AUD | |
| `Install Labour hrs` | number | hrs | Real column `Labour (Hrs)` / `Sales Install` |
| `Status` | select | `Current` · `Obsolete` | |

### 2.3 `trailer` — wrong default, and `Max Load kg` / `Max Length ft` are both wrong

**Corrected structures:**

```
1. Brand ▸ Series ▸ Trailer     DEFAULT     (level 2 noun is "Series", not "Range")
   "A brand's series, and the trailers in each."
2. Brand ▸ Trailer
3. Flat list
```

**Corrected detailColumns** — every one of these is a real, typed field in
`scripts/seed-trailers.ts:302-311`, the most complete definition anywhere in the
production repo:

| Name | Type | Unit | Key | Note |
|---|---|---|---|---|
| `Code` | text | — | **✔** | `RE1213`, `TALS749S13`. **14 duplicate codes exist** — key must be composite with Supplier or Name (`trailer-module.md:61`) |
| `Boat Size m` | number | m | | ~~`Max Length ft`~~ — this is *the boat it carries*, and it is metres |
| `Trailer Length m` | number | m | | a **different** number from Boat Size — the production schema has both |
| `Tare kg` | number | kg | | unladen mass |
| `ATM kg` | number | kg | | **Aggregate Trailer Mass.** ~~`Max Load kg`~~. This is not cosmetic: **ATM drives the registration band** at quote time (`CLAUDE.md:26`). QLD bands: *"Small Trailers – Up to 1.02t" = $166* (43 rows) / *"Large Trailers – Over 1.021t" = $283* (427 rows) |
| `Axles` | select | — | | `Single` · `Tandem` · `Tri` — ~~number~~; the trade says "Tandem Axel Trailer" |
| `Wheel Size` | text | | | `13" 165/5P` |
| `Winch` | text | | | a ratio |
| `Between Guards mm` | number | mm | | |
| `Plug` | text | | | 7-pin flat / round |
| `Supplier` | text | | | |
| `Cost ex GST` | number | AUD | | `totalNettCtd` |
| `Sell ex GST` | number | AUD | | |
| `Status` | select | | | `Current` · `Obsolete`. Production models "OBSOLETE TRAILERS" and "TRAILER NOT REQUIRED" as *pseudo-brands* — a status column instead of a fake vendor row is exactly the improvement |

### 2.4 `accessory` — **split it.** One kind cannot hold four species.

Our single `accessory` kind with `Category ▸ Product` and `SKU / Price / In Stock` is the
weakest preset in the file. `In Stock` is an inventory concept and these are catalogue
rows — the production app keeps inventory in a completely separate `inventory/{itemId}`
collection.

**Replace with two kinds.**

#### 2.4a `option` — a factory option, attached to a product (NEW KIND)

```
1. Category ▸ Option        DEFAULT
   "Options grouped the way the factory groups them."
2. Flat list
```

| Name | Type | Note |
|---|---|---|
| `Code` | text (**key**) | Factory SKU. **NOT globally unique** — `factory-options.md`: *"(model section, NSM Code) is the true composite key, not NSM Code alone"* — the same code carries a different price under a different model |
| `Name` | text | |
| `Category` | select | `Consoles` · `Seats` · `Rigging` · `Covers` · `EVA Teak` · `Tops` · `Hardware` · `Accessories` · `Electronics` — the real post-normalisation list |
| `Colour` | text | Options themselves come in colourways, expressed as SKU suffixes `-W -G -B -WG -DB -LG -WB -MB -C` |
| `Applies to` | reference (multi) | → boat / motor / trailer rows. **Empty means applies to everything** — adopt production's `applicableVariantIds[]` semantics verbatim |
| `Included as standard` | boolean | the `Std` sentinel (142 rows), promoted to a real flag |
| `Bundle only` | boolean | the `Bundle` sentinel (347 rows), promoted to a real flag |
| `Cost ex GST` | number | |
| `Sell ex GST` | number | **must accept negatives** — 95 real negative-price options (deduction lines) |
| `Labour hrs` | number | |
| `Pairs with` | reference | → another option. This is `associatedSeatId` (console ↔ seat), which has broken in production twice |
| `Status` | select | `Current` · `Obsolete` |

#### 2.4b `accessory` — dealer-fit / aftermarket, **two levels**

```
1. Package ▸ Component      DEFAULT
   "A package your workshop fits, and the parts and labour inside it."
2. Category ▸ Package ▸ Component
3. Flat list
```

Real package columns: `Description · Code · CTD · Inflation · Adj CTD · Tot Parts CTD ·
Parts Sell · Total Lab · Labour CTD · Labour Ret · Sundry · Sublet · Act CTD · MU · GP ·
Act Sell`. Real component columns: `Accessory # · Accessory · Code · CTD · Sell · Labour ·
Lab Hrs · Sundry · Sublet`.

Our minimum viable set: `Code`(key) · `Name` · `Category`(select) · `Cost ex GST` (CTD) ·
`Sell ex GST` · `Labour hrs` · `Sundry` · `Sublet` · `Status`.
Real example row: `GME-GX700WPK | VHF Radio – GME GX700W Flush Mounted with 1.8m Aerial |
Act Sell $939` with two components (head unit $240, 2.5 hrs, $10 sundry; antenna base
$60, 0.9 hrs, $5 sundry).

### 2.5 `package` — reshape to `rig`, and fix the arity

Our shape (one Boat + one Motor + one Trailer + Price) is a strawman. The real thing on a
boat variant is a **fixed-slot menu**: 13 motor slots, each carrying *five* fields —
`{ motor, rigging kit, prop part no, prop description, engine hole }` — plus 10 trailer
slots and 42 dealer-fit lines (`boat-module.md:107`; `tasks/mpf-boat-page-signifiers.md`).

**Corrected `package` (rename label to "Rigs"):**

| Name | Type | |
|---|---|---|
| `Name` | text | |
| `Boat` | reference → boat | |
| `Motor` | reference → motor | |
| `Rigging Kit` | reference → accessory | **was missing** — a motor never goes on a boat without one |
| `Prop` | text | **was missing** |
| `Engine Hole` | text | **was missing** |
| `Trailer` | reference → trailer | |
| `Slot` | number | the menu position, 1..13 |
| `Recommended` | boolean | production has `Recommended Motor Option` as slot 1 |
| `Cost ex GST` | number | |
| `Sell ex GST` | number | |

Structures: `Boat ▸ Slot` (default — *"the motor and trailer options you offer on each
boat, in order"*) · `Flat list`.

### 2.6 `dealer` — `Region ▸ Dealer` does not exist in the domain

There is no Region anywhere in the production data. The real structure is a
**self-referential sub-dealer tree**: `organisations/{orgId}.parentOrganisationId`.

```
1. Dealer ▸ Sub-dealer      DEFAULT
   "Your dealership and the sub-dealers under it."
2. Flat list
```

detailColumns: `Name`(key) · `Trading Name` · `ABN` · `Suburb` · `State`(select: NSW VIC
QLD SA WA TAS NT ACT) · `Phone` · `Price Level`(reference → priceLevel) ·
`Currency`(select) · `GST %`(number).

Dealers matter in this domain *because of price levels* — `hull_subdealer`,
`hull_subdealer_excl` exist purely to price to a sub-dealer.

### 2.7 TABLE KINDS WE ARE MISSING

Ranked by how much the domain needs them.

#### (1) `fitment` — **the biggest structural gap**

Our `hierarchy` is a strict tree. Fitment is not a tree; it is many-to-many, and it is
the thing the business actually spends its time maintaining. HelmLogic has **five
unrelated mechanisms** for it (numeric HP envelope, a 13-slot curated menu joined by
display name, an `applicableTrailerCodes[]` checkbox matrix, a `forbids/requires` rule
engine with no editor, and 523 lines of hardcoded TypeScript in `step5-curation.ts`).

Our rule engine already has the primitive — `ActionOp` `{ op: 'link', joinEntityId,
sourceFieldId, matchFieldId }`. What is missing is a *table kind* that a user can create
directly without going near the rule canvas.

```
kind: 'fitment'
structures:
  1. Boat ▸ Motor       DEFAULT   "Which motors fit which boats."
  2. Boat ▸ Trailer               "Which trailers carry which boats."
  3. Flat list
detailColumns:
  Fits            reference (the source, e.g. Boat)
  Item            reference (the match, e.g. Motor)
  Slot            number
  Recommended     boolean
  Note            text
  Source          select: 'Rule' · 'Manual'   ← so a rule-generated row and a
                                                 hand-added exception are visibly different
```

The `Source` column is the whole point: production's escape hatch is
`motorOverrides: { hiddenIds[], manualIds[] }` bolted onto the model doc. Making it a
column on the fitment table is the same idea, legible.

#### (2) `priceLevel` — kills a whole class of production pain

Price levels are **hardcoded in at least six places** in production
(`SESSION_HANDOVER.md:257` is literally titled *"Price Levels (hardcoded)"*;
`highfield-pricing-workspace.tsx:251,764-770,1208,1229`, `highfield-quote-flow.tsx:2430`,
`stock-location-manager.tsx:355`). Adding one campaign level took a release cycle.

```
kind: 'priceLevel'
structures: Flat list only
detailColumns:
  Key            text (key)      hull_cash, hull_trade, hull_subdealer, hull_aus_sailing
  Label          text            "NSM SELL PRICE", "Trade", "Sub Dealer"
  Basis          select          'Cost' · 'Sell' · 'Another level'
  Multiplier     number          0.95, 0.825, 0.80  ← the real ladder
  GST basis      select          'Excluding GST' · 'Including GST'
  Audience       select          'Retail' · 'Trade' · 'Sub-dealer' · 'Club/Association'
```

This is also our best demo of a **formula column** doing real work.

#### (3) `registration` — a lookup band table

Small, real, and money-critical. Bands keyed on hull length (boats) or ATM (trailers).
It is also where production's worst production bug lived: a units mis-parse
auto-applied the *wrong* registration band (`rego-automatch.ts:5-12`).

```
detailColumns:
  Authority      select   QLD · NSW · VIC …
  Applies to     select   'Boat' · 'Trailer'
  Measure        select   'Length m' · 'ATM kg'
  From / To      number   with unit
  Price 12 mo    number
  Sticker        number
```

Real rows: `Recreational Vessel — 4.5m to 8m` $163 · `4.51m to 6.0m` $250 ·
`Small Trailers — up to 1.02t` $166 · `Large Trailers — over 1.021t` $283.

#### (4) `brand` — promote Brand from a repeated string to a row

Today "Highfield" is typed as a text value in the level-1 column of the boat table, and
again in the motor table, and again in the trailer table. It can never carry its
currency, its logo, its franchise code, or its status. Production has exactly this table
(`data-warehouse/{vendorId}`) with a real, useful field set.

```
kind: 'brand'
structures: Flat list only
detailColumns:
  Name           text (key)
  Type           select   'Boat Brand' · 'Motor Brand' · 'Trailer Brand' ·
                          'Rego Authority' · 'Electronics Brand' ·
                          'Electronics Supplier' · 'Parts Wholesaler' · 'Other'
                          ← the real production enum, verbatim, minus 'Master Price File'
  Currency       select   AUD · USD · EUR · NZD
  FX divisor     number   0.70 (Highfield USD), 0.60 (Jeanneau EUR), 1.20 (NZD)
  Franchise Code text     9HI · 9ST · 9JE · 9DU
  Website / ABN / Notes
```

Then the level-1 column of boat/motor/trailer becomes `type: 'reference', linkTo: 'brand'`.
This is the cheapest available fix for the "same list maintained in four places" disease —
`SESSION_HANDOVER.md:288` documents `vendorType` being hand-synced across four files.

#### (5) Kinds we should NOT add
`service operation`, `part`, `promotion`, `quote`, `inventory` — all real in production,
none of them needed to demonstrate a data-model configurator. Leave them to `custom`.

### 2.8 The one kind we invented that the domain does not need — and why we keep it anyway

`custom` looks like a cop-out. It is not. The **most commercially important catalogue in
the production app — the Yamaha motor rows the quote flow prices from — has no schema at
all**, living as arbitrary `dataSets/{id}/rows` with columns *auto-detected from whatever
keys happen to exist* (`master-price-file-workspace.tsx:160-161`). A configurator with no
escape hatch would be rejected on contact with real data. Keep `custom`. Just make the
path from custom → typed a one-click promotion, not a rebuild.

---

## 3. WHAT TO ADOPT

Battle-tested in production. Steal these outright.

1. **Natural key declared per level, never guessed.** Production guesses it from a
   hand-maintained priority list — `Part Number → Model Code → Model ID → SKU → Code → ID
   → Model → Model Name → first column` (`paste-from-spreadsheet.tsx:33-42`;
   `CLAUDE.md:199`). The *idea* is right; the guessing is the bug. Adopt `key?: boolean`
   on columns, allow composite keys.

2. **Upsert by natural key, never clear-and-replace, with a diff shown before writing.**
   `CLAUDE.md:199` (a v1.4 remediation): *"Clear-and-replace destroys operator edits on
   every partial upload. Always toast `N updated · M created · K skipped (no key)`."*
   Their paste-from-spreadsheet UX already does this and it is genuinely good.

3. **Dry-run + before/after evidence log on every mutation.** `scripts/mpf/import-boats.py`
   writes JSONL apply-logs (4.9 MB for boats, 26.5 MB for parts) recording before and
   after for every write. Our undo story should be exactly this.

4. **"Empty means unrestricted."** `applicableVariantIds[]` empty = applies to all SKUs;
   fit-up allowlists empty at a level = no restriction at that level
   (`fit-up-catalog-manager.tsx:79-92`). This is the correct default for every scoping
   control we build — never force a user to tick 640 boxes to mean "all".

5. **Rules fail OPEN, with a visible "Show all" override.** `step5-curation.ts:328-330`:
   *"Every rule fails OPEN: missing context … never hides anything."* A filter that
   silently hides a product because a spec is blank is worse than no filter.

6. **Rules as data with `priority`, `isActive`, and a named human rationale.**
   `fit-up-classification.ts` + its manager is the one operator-authored rule engine in
   the app that works: `{name, priority, isActive, conditions:[{field, operator, value}],
   outputTier}`, AND semantics, priority-desc resolution, heuristic fallback. Right shape,
   wrong scope (5 hardcoded fields). Generalise it over *declared* columns.

7. **Real enum values, verbatim.** Use the lists in §2 — `vendorType`, shaft inches,
   control types, price-level keys, fit-up tiers `simple|medium|complex`, PD tiers
   `Basic|Standard|Complex`. These are the words on the invoices.

8. **Per-table level nouns.** Boats say Range, trailers say Series, and both are right.
   Our `StructurePreset.levels` already carries names — make them renameable per table.

9. **Margin bands as a shipped default.** red < 15% · amber < 25% · emerald ≥ 25%
   (`derive-pricing.ts:112-115`). A cheap, instantly-recognised win in a `Margin %`
   formula column.

10. **Status separated from workflow state.** Production keeps `lifecycleState`
    (draft|sent|viewed|accepted|rejected|lost|expired) deliberately orthogonal to
    `fitUpStatus` (pending|scheduled|in-progress|complete) — `fit-up-status.ts:29-30`.
    Two orthogonal enums beat one merged one. Applies directly to `Status` vs `Published`.

11. **Snapshot-on-commit.** The finalize payload is a ~400-line immutable freeze of model
    + variant + options + motor + trailer + rego + dealer fit + promotions, deliberately
    so a catalogue edit cannot retro-change a sent quote. Our equivalent: **export /
    publish takes a snapshot**, and the snapshot is versioned.

12. **Content-block versioning is the one entity with real history**
    (`contentBlocks/{id}/versions/{versionId}` with `level: 'default' | 'brand:{vendorId}'`
    — `content-blocks.ts:157-166`). That override-level pattern (`default` + per-brand
    overlay) is the right shape for our revisions, and far better than the
    full-document-copy override used everywhere else in the app.

---

## 4. WHAT TO IMPROVE ON

Ranked by how much a visual, live-editable, structure-aware table tool actually helps.
Each is a real, evidenced production wound.

### 1. Typed fields with **units** and **enum domains** — the biggest single win

Production's only user-extensible field surface on a boat is
`specifications.otherSpecs[]` — an array of `{id, label: string, value: string}`. Both
sides are free text. Consequence, `src/lib/rego-automatch.ts:52-58`:

```ts
const spec = (otherSpecs || []).find(s => /length/i.test(String(s?.label || '')));
const m = String(spec.value ?? '').match(/(\d+(?:\.\d+)?)/);
// Specs may be in mm ("5600") or cm on some imports — normalise.
const norm = v > 1000 ? v / 1000 : v > 30 ? v / 100 : v;
```

A units-guessing heuristic in production, on a code path that **auto-applies a
registration price**. The bug it was written to fix (`rego-automatch.ts:16-19`): hull
length was derived from the first 3-digit group in the model code, so `HBS113` parsed as
1.13 m and auto-matched the smallest QLD rego band.

The source data has the same disease: `46 kg`, `25 HP`, `287 cm` under a `(Mtr)` header
(`boat-module.md:186`); `Boat Size (Mtr)` holding ints (`1450`), floats (`4.3`) and
strings (`1450 Exp`) — *"same header, three unit conventions"* (`trailer-module.md:83`).

**What we do:** a column is `number` + `unit: 'm'`. The header shows the unit. Import
parses against it and flags `1450` in a metre column at paste time, in a diff, before it
is saved. This one feature retires an entire class of production bug.

### 2. One schema, generated everywhere — retires the "importer says X, reader says Y" class

Three simultaneous instances in one audit (`UI_AUDIT.md:89-102`):

- **UI-12** — Rigging Kits manager rendered `—` in every cell of all **846 rows**. Importer wrote `partNumber / description / kitCost / sellPriceExclGst`; the manager read `partNo / name·desc / kitCtd / retailExGst`.
- **UI-13** — Pricing Matrix manager showed raw doc-id slugs as labels. Import wrote `brand / franchiseCode / sellMarkup`; manager read `franchise / key / markupPct`.
- **UI-14** — Freight manager rendered `0.1` as "0.1%" instead of 10%. Import wrote `bufferPct` as a fraction; manager assumed a percentage.

`motor-module-map.md:41` names the class: *"**admin surface disagrees with the layer that
drives quotes.**"*

This exists because the schema lives in **five uncoordinated places**: the Python
importer, the Zod schema in the brand editor, the read-time `||` fallback chain in each
consumer, `firestore.rules`, and `src/docs/backend.json`. If our configurator is the one
definition and emits the import map, the grid, the formulas and the rules, this bug class
is structurally impossible.

### 3. Structure as **data**, not five copy-pasted React components

Five near-identical per-brand structure components — `highfield-data-structure.tsx` (409
lines), `jeanneau` (403), `stabicraft` (402), `stacer` (410), `surtees` (402) — whose
*only* substantive difference is line 56:

```ts
const initialRanges = ['Sport','Classic','Roll-Up','Adventure','Patrol']   // highfield
const initialRanges = ['Merry Fisher','Cap Camarat','DB','TH']              // jeanneau
```

Plus five model editors (`highfield-model-editor.tsx` is **1,407 lines**; the others
228–249) dispatched by a hardcoded slug switch (`model-configuration-editor.tsx:64-85`),
with a *second* `if (vendorSlug === 'highfield')` at `:132`. Brands present in the data
but absent from the switch (Formosa, Haines Signature) silently fall through to a bare
schema with no options, no registration, no trailer assignments.

Adding a boat brand today = a 400-line component + a schema + two switch cases + a build +
a deploy. `SESSION_HANDOVER.md` still lists *"Brand Onboarding Without Code"* as an
unshipped v2.1 story. **In our tool it is picking a structure preset and typing a name.**

### 4. Relations as links, never display-name strings

`boat-module.md:114`: *"joins are **string-fragile**. Every rename in a source module
silently orphans boat-row references."* Currently orphaned in production:

- **31 unresolved rigging-kit names** + 1 prop (`known-gaps-composition.json`) — entries like `"mf795-2 sport y29e1 - yamaha hmex rigging kit sbw elec control + cl5 display + autopilot & eks smart key"` that failed to resolve to any kit
- **4 trailer display-names referenced by boats that do not exist anywhere in the Trailer Module**, plus one that exists but is unpriced (`INVARIANTS_AUDIT.md:49-58`)
- Dealer-fit lines matched by **case-insensitive name** (`nsm-recommended.tsx:304-306`)
- Motor menu entries matched by **display name** (`nsm-recommended.tsx:83-85`)

`MAPPING.md:46` states the required upgrade in one line: *"**String joins → typed
references.**"* Our `reference` field type already is that. What we add on top: rename a
row and every link follows; a broken link is *visible*, not silent.

### 5. One editable list per enum, instead of the same list in four to six files

- `vendorType` — *"Full list maintained in **four places** (keep in sync)"* (`SESSION_HANDOVER.md:288`), and a fifth value `'Internal'` used by one component that isn't in any of the four.
- Price levels — hardcoded in **six** call sites (§2.7).
- Fit-up tier is `simple|medium|complex` but fit-**out** pricing tier is
  `basic|moderate|complex` — **two vocabularies for the same three tiers**, in the same
  model editor (`fit-up-classification.ts:46` vs `fit-out-pricing.ts:27`).
- Dealer-fit categories merged at render from **four** sources — a global collection plus
  three module-level string arrays — joined by case-insensitive name matching
  (`CLAUDE.md:168`).

A `select` column whose options are edited in one place, once, is the entire fix.

### 6. Variant axes declared once; SKUs generated

Highfield's 627 variants are 76 models × (Material × Colour). Production stores every one
as a hand-seeded document and then pays for it: the console↔seat colourway pairing has
been repaired by developer script **twice** (`repair-console-seat-pairing.py`,
`fix-gt-console-seat-pairing.py` — the second one unpaired 31 blanket-paired entries), and
`CLAUDE.md:34` still lists *"console-split ruling (85 models, awaiting Asaf)"* as open.

Declaring `Variant = Material × Colour` once and generating the grid — with per-cell
price overrides and a per-cell "not offered" — is a demo that will land instantly with
anyone who has maintained this data by hand.

### 7. Live diff-preview on paste/import, with duplicate-key detection at edit time

Production's own numbers on why: **101 duplicate `serviceParts` part numbers — the import
natural key — with differing prices** (e.g. `293714` ×3 at $1.77 / $380.91 / $1,100);
**12 duplicate `serviceOperations` codes**; **14 duplicate trailer codes**; **16
`fitUpItems` duplicate-name groups**; **two MACKAY trailers with identical display names
and different prices ($18,400 vs $21,400)** — *"A user picking by name can grab the wrong
price."* (`STRUCTURE_AUDIT.md:7,85-88`).

We can flag every one of these the instant it is typed or pasted, in the cell, with the
conflicting row one click away.

### 8. `Status` as a first-class column, everywhere

59.6% of the real boat catalogue is obsolete rows; 633 model codes appear twice, current
and obsolete. Production models absence as a *pseudo-brand* ("OBSOLETE TRAILERS",
"TRAILER NOT REQUIRED") and section headings leak onto customer-facing quotes —
`PRESENTATION_AUDIT.md` logged **323 findings (104 high)** of exactly this shape,
including `### OBSELETE` headings rendering on quotes and a brand section without model
digits (`HIGHFIELD - Patrol`) whose **100 options render on every Stacer, Stabicraft and
Formosa quote**.

A `Status` column, filtered by default, shown on demand, is a two-line feature that
retires all of it.

### 9. A rule editor whose vocabulary is the user's own columns

`step5-curation.ts` (523 lines) is the production app's real fitment brain and it is
entirely code: `RANGE_WORDS` mapping CL→CLASSIC / SP→SPORT (a customer's product taxonomy
as a TS constant), `BRAND_WORD_RE = /(HIGHFIELD|STACER|STABICRAFT|SURTEES|JEANNEAU|FORMOSA|HAINES)/`
(a customer's brand list as a regex), `SIZE_CLASS_RULES` with literal thresholds
(TVs need ≥ 7.0 m hull, radar ≥ 6.0 m, underwater lights ≥ 5.0 m), `LEN_TOLERANCE_M = 0.4`,
and 23 hardcoded section renames like `'MAJESTIC TV OPTIONS' → 'TV & Entertainment'`.
Meanwhile the feature×feature rule engine (`compatibility-rules.ts`) has **no editor at
all** — `:25-26`: *"engineering writes rules direct to Firestore (Firebase Console).
Admin UI deferred to v1.10+."* It never shipped.

Our rule engine already has `match`, `condition`, `filter`, `link`. Pointing its clause
picker at *declared columns with declared types and units* turns 523 lines of regex into
rows a dealer can read.

### 10. Show the whole model at once

The production schema is knowable only by reading 40 files, two markdown handovers, a
`backend.json` and a `firestore.rules`. A sheet where every table, its levels, its columns
and its links are visible simultaneously is not a nicety — it is the deliverable.

---

## 5. WHAT TO DELIBERATELY IGNORE

| Don't copy | Why |
|---|---|
| **The 7-step quote wizard** and everything downstream (lifecycle, contracts, variations, deposits, order tracking, PDF structure) | We configure the catalogue. Quoting is a different product. Modelling it would triple our surface for zero demonstration value. |
| **Per-brand editor components and the vendor-slug switch** | This is the exact anti-pattern we exist to replace. Never let a brand name appear in our source. |
| **Org overrides as full-document copies** | `organisations/{orgId}/modelOverrides/{modelId}` is a complete `setDoc` (no merge) copy of the master model. It spawned two dedicated staleness-audit scripts and a nightly drift alarm, and it shadowed migrated prices with pre-migration values in front of a customer (`audit-override-staleness.py:6-13`). If we ever do overrides, do them as **deltas** with the `contentBlocks` `default` + `brand:{id}` overlay pattern instead. |
| **Firestore's shape constraints leaking into the model** | `orderBy('field')` silently *excludes* docs missing that field, so ordering was abandoned (`CLAUDE.md:141,164`). `where('in')` caps at 30, forcing `.slice(0,30)` on org and variant id arrays (`CLAUDE.md:181`). Many-to-many is arrays-of-ids because there are no junction collections. **None of these are domain facts.** Our model is storage-agnostic; do not inherit someone else's database's limits. |
| **Excel column headers as field names** | `'HP Rating'`, `'Tilt & Trim'`, `'Act Sell'`, and `"Fuel\r\nTank"` — a key containing a literal carriage return, read at two different call sites trying both `\r\n` and `\n`. Import maps a header to a *named typed column*; the header never becomes the identifier. |
| **Sentinels inside a value column** | `Std`, `Bundle`, `POA`, `0`, `$ -`, `#N/A`, `#VALUE!` in a money column; `NR - ENGINE NOT REQUIRED` / `TRAILER NOT REQUIRED` / `.` filling unused slots in fixed-width grids; `TRAILER NOT REQUIRED` modelled as a **vendor**. Support the *meanings* (`Included as standard`, `Bundle only`, empty) as flags and nulls. Never as magic strings. |
| **Fixed-width slot grids** | 13 motor / 10 trailer / 42 dealer-fit columns on every boat row, padded with sentinels. Our fitment table is variable-length by construction — that is the improvement. |
| **Denormalised name-copies beside ids** | `createdByName`, `lockedByName`, `signedByName`, `vendorName`, `rangeName`, `moduleSlug`… copied onto every quote. A link that resolves its label at read time is strictly better and cannot drift. |
| **Two storage paths for the same entity** | Trailers live at *both* `data-warehouse/{v}/trailers/{id}` and `data-warehouse/{v}/series/{s}/trailers/{id}`; `catalog-item-picker.tsx:260-284` reads both and concatenates with different id shapes. |
| **Field-name drift for the same concept** | Boat options use `sellPriceExclGst`; trailer options use `sellExclGst`; the trailer picker renames it at the boundary. One canonical name per concept. |
| **Their UI** | Dense admin tables, modal dialogs, nine-tab settings pages, a 4,340-line quote component. Our whole thesis is the opposite: one sheet, in-place editing, no modals for data. |
| **Dead collections and dormant scaffolding** | `vessel_models` and `clients` have zero code references; `importer-registry.ts` is self-labelled *"DORMANT scaffolding"* with a note that its own Yamaha target path is wrong. Don't ship a shape we haven't used. |
| **Their credential handling** | `scripts/mpf/import-boats.py:34-36` embeds a Firebase project id, web API key and a named user's plaintext password as module constants, and writes to production as that human. Flagged for the user's attention; obviously never a pattern to adopt. |

---

## 6. RISKS — where our model breaks against real data

Ordered by likelihood of actually biting us.

### R1. Ragged depth — a level that is sometimes absent, sometimes single-valued
Variant counts per model run **1 to 15**, and **26 models have zero variants** (Jeanneau
21 of 48 — *"most of the brand"*). Coaster has 3 models; Adventure has 1.
**Breaks:** a group renderer that always draws a group row will produce single-child
groups everywhere and empty groups for ghost models.
**Mitigation:** `StructureLevel.optional`; collapse a level with one value into its
parent row; render a childless group as a leaf row, and mark it (a ghost model is a real
data-quality finding, not a rendering edge case).

### R2. Level values are not clean identifiers
`SP700WL(Windlass)` · `RU250 Easy Go` · `PA540 open` · `Coaster 540 ST` — parentheses,
spaces, lowercase words. Sub-model suffixes carry meaning and are inconsistent across
ranges: `FT LS MAX EW ST LT AL KAM WL`. Their slugger has to strip parentheses explicitly.
**Breaks:** grouping by raw string produces `Highfield` and `HIGHFIELD ` as two groups.
**Mitigation:** group on a normalised key (trim + case-fold), display the raw value, and
surface a "these look like the same group" hint rather than silently merging.

### R3. Codes do not determine structure
`CLAUDE.md:136` claims Range = code prefix. **It does not hold**: prefix `HBP` covers both
Patrol (130 SKUs) *and* Coaster (6); `Coaster 600 ST` uses the one-off prefix `HB600`; and
`CLAUDE.md` itself says `AL = Adventure` when the real prefix is `ADV`/`HBA`.
**Breaks:** any "derive the group from the code" convenience feature.
**Mitigation:** offer it as a *suggestion with a preview*, never an automatic assignment.

### R4. Many-to-many fitment does not fit a tree — and it is large
13 motor slots × 809 variants. `applicableVariantIds[]` on an option can list hundreds of
SKUs. Fit-up items AND five parallel allowlists together.
**Breaks:** rendering fitment as nested groups; a reference picker that loads every
candidate row.
**Mitigation:** the `fitment` kind (§2.7) as a real, flat, filterable table; scoping
expressed as *rules over columns* ("motors where HP between Boat.Min HP and Boat.Max HP")
with materialised rows, not hand-ticked boxes; and "empty = all".

### R5. Options attach at four grains, and one of them is a matrix
See §1.5. A single `Applies to` reference column covers grains 2 and 4 badly and grain 1
(variant axis) not at all.
**Mitigation:** accept the loss for v1 — model grains 2 and 3 with `Applies to` (empty =
all) plus the `option ↔ option` `Pairs with` column, and be explicit in the doc that
per-colourway option availability (the console↔seat matrix) is **out of scope** rather
than silently half-supported. Half-supported is how production got its two repair scripts.

### R6. Price is not one number
Four competing representations coexist on a single production variant —
`sellPriceExclGst`, `priceLevels{5 keys}`, `priceLadder{5 tiers × inc/ex}`, `priceIncGst`
— and `resolvePriceLevel()` walks a **ten-key fallback chain**
(`sellPriceExclGst`, `Act Sell`, `Sell Price`, `Store Price`, `NSM Retail`, `PARTS`,
`RRP`, `Price`, `Retail`, `Trade`). Add per-brand implicit currency, mixed inc/ex-GST per
column block, legal negative prices, and non-numeric price *words*.
**Breaks:** a `Price` column of type number.
**Mitigation:** never ship a bare `Price`. Ship `Cost ex GST` + `Sell ex GST` + a
`Currency` select + the `priceLevel` table with formula columns. Allow negatives. Let
"Included as standard" and "Bundle only" be booleans, not values.

### R7. Revisions and effective dating — the gap we might repeat
Production has **no effective-dated price list, no revision history of published prices,
and no way to schedule a price change.** "Publish Prices" is a manual button that
overwrites `sellPriceExclGst` on every variant and feature at once
(`highfield-pricing-workspace.tsx:975-1005`). Historical FX rates are not kept per quote.
The *only* entity with real version history is content blocks.
**Risk both ways:** ship nothing and we inherit the gap; ship naive versioning and we owe
an answer for what "publish" means, what a draft edit does to an in-flight quote, and
whether a rule sees draft or published rows.
**Mitigation for the prototype:** one honest primitive — a snapshot on export, with a
`REV` in the title block (`ProjectMeta.exportCount` already does this). Do not build
per-row effective dating in this pass; do reserve the column semantics.

### R8. Scale will kill an unvirtualised canvas
Real magnitudes: 26,345 service parts · 19,171 factory-option rows · 2,003 boat rows ·
1,791 dealer-fit rows · 846 rigging kits · 640 variants for one brand.
**Breaks:** every table drawn on a pannable sheet with live in-place editing.
**Mitigation:** row virtualisation, collapsed-by-default groups, a hard "show first N with
a count" on the sheet, and a full-screen table view for real work. Decide this before the
demo data grows.

### R9. Natural keys are not unique
101 duplicate part numbers *with different prices*; 51 duplicate motor model codes; 633
model codes duplicated current-vs-obsolete; 14 duplicate trailer codes; 12 duplicate
operation codes; 135 duplicate part codes overall.
**Breaks:** a single-column `key` and any upsert built on it.
**Mitigation:** composite keys from day one (`Model Code` + `Status`, `Franchise` + `Part`,
`Supplier` + `Code`), and a duplicate indicator that shows the *conflicting rows* rather
than refusing the edit.

### R10. Imported values will not match declared types
`46 kg` in a number column · `1450 Exp` in a metres column · `2 × 300` in an HP column ·
`#N/A` in a price column (193 cached error cells) · `Std` in a money column · SKUs with
embedded spaces (`HEF 016`) · character-corrupted names (`"? ADV7 console`) · SharePoint
auth-walled URLs in `imageUrl`.
**Breaks:** an importer that coerces silently, and a grid that renders `NaN`.
**Mitigation:** quarantine, don't coerce — production learned this too
(`MAPPING.md:50`: *"**Error quarantine.** 193 cached `#N/A`/`#VALUE!` cells … get
quarantined + reported, not imported as prices."*). Show the raw value, mark the cell,
offer the parse.

### R11. `reference` as a hierarchy level is a real code change
Making `Brand` a link (§2.7) touches the group-row renderer (resolve label), row pre-fill
(write the id, not the name), CSV export (emit the label), sort/filter (sort by label),
and the reviewer. Worth doing — but it is not the one-line change it looks like.

### R12. Cross-table inheritance exists in the wild
*"Cap Camarat priced via the Merry Fisher matrix row (shared Jeanneau franchise 9JE)"*
(`boat-module.md`, anomaly 9) — a Range inherits its pricing configuration from a
**sibling Range**. Our model has no concept of a level inheriting from a peer.
**Mitigation:** don't build it. Note it as a known limit, and let a formula column
referencing another row cover the 80% case.

---

## Appendix — the four sentences to keep in front of us

1. *"HelmLogic's data model flexes to fit the MPF."* — `MAPPING.md:3`. Ours should flex to
   fit the **business**, and hold its shape against the spreadsheet.
2. *"Validation is a safety net, not a gatekeeper."* — `CLAUDE.md:189`. That is a system
   that gave up on having a schema. Ours is the schema.
3. *"Every rename in a source module silently orphans boat-row references."* —
   `boat-module.md:114`. Links, not names. Always.
4. *"faithful MPF import ≠ faithful presentation."* — `PRESENTATION_AUDIT.md:5`. Correct
   data can still be unusable. Structure is a presentation decision as much as a storage one.
