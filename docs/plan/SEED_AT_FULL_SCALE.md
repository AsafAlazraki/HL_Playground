# The seed at full scale — the shape, the caps, and how to regenerate it

Northside Marine is the first customer. Today `src/demos/northside.ts` carries a
curated fraction of their Master Price File and says so in its own provenance
lines. This document decides what "the whole thing" is, where the sampling caps
live, what the full-scale numbers actually are, and how a person repeats the
regeneration end to end.

**Nothing here is estimated unless it says ESTIMATE.** Every count was produced
by running the committed generator with its budgets lifted, or by opening the
source workbook read-only. Where a number in circulation disagrees with the
measurement, the measurement is stated and the discrepancy named.

Measured on branch `redesign`, 17 August 2026, against `HEAD` of
`src/demos/northside.ts` (1,076,153 bytes — `python tools/seed/emit.py`
reproduces it byte for byte; see *The working tree is not HEAD*, below).

---

## 1. Where the caps are

Every sampling cap in the pipeline is one of four mechanisms. There is no
central limit and no configuration file; each is a literal in a table of dicts.

### 1.1 The `budget` key — the main mechanism

`tools/seed/gen_all.py` gives each brand band a `budget`, and three identical
round-robin loops fill up to that many rows, one per series at a time, so a
sample spreads across series rather than taking the first N rows.

| what | file · line | value |
|---|---|---|
| Boat brands | `gen_all.py:153–167` (`BOAT_BRANDS`) | stacer 26 · stabicraft 30 · surtees 25 · jeanneau 24 · haines 12 · **highfield 40** · formosa 26 |
| Trailer bands | `gen_all.py:333–348` (`T_BRANDS`) | redco 16 · nsmcustom 18 · gfab 14 · stacertrailers 14 · dunbier 16 · mackay 16 · bmt 12 · **obsolete 0** |
| Motor bands | `gen_all.py:471–488` (`M_BRANDS`) | yamaha 26 · epropulsion 14 · **pkg_haines 0** · **pkg_jeanneau 0** |

The loops that spend the budget: `gen_all.py:240–244` (boats),
`gen_all.py:389–393` (trailers), `gen_all.py:523–527` (motors).

A budget of **0 is not "none"** — it means *reachability only*. `chosen` is
seeded from `forced_names` before the loop runs (`gen_all.py:387`, `:521`), so a
zero-budget table gets exactly the rows a seeded hull points at and no others.
That is why `mot_pkg_haines` has 39 rows on a budget of 0.

Highfield is additionally pre-seeded with `SP560_ROWS` (`gen_all.py:171`,
consumed at `:238`) so the owner's own worked example is always present.

### 1.2 A hard slice — the only literal `[:N]` in the generator

`gen_all.py:646`

```python
rest = [r for r in rows if r not in forced][:5]
```

Five non-reachable parts per category, and only for the six categories named in
`P_CATEGORIES` (`gen_all.py:620–627`) out of **217** category banners in the
sheet. Everything else in `parts` is there by reachability (`gen_all.py:655`).

### 1.3 Reachability, which is a cap with no number

`dealer_fit` (`gen_all.py:748`), the obsolete half of `rig_kits`
(`gen_all.py:945`), `trl_obsolete` and both package tables take only rows a
*seeded* hull names. They are therefore capped **transitively** by the boat
budgets: raise the boat budgets and these grow on their own. This is the
standing policy of `FITMENT_RULES.md` §5.7 and it is not a defect.

### 1.4 The probe caps — `max_row` in `tools/seed/probes/`

These are upstream of everything above and invisible from `gen_all.py`. Each was
checked against the real workbook, read-only:

| probe · line | cap | last populated `C` in the sheet | verdict |
|---|---|---|---|
| `b2_dump.py:33` and `b3_formula.py:48` | `max_row=1010` | **2301** | **TRUNCATES REAL DATA — see §3.1** |
| `t1_dump.py:14` | `max_row=720` | 700 | clear |
| `m1_dump.py:33` | `max_row=600` | 589 | clear |
| `p1_dump.py:10` | `max_row=3722`, `max_col=30` | 3646 | clear |
| `pd_dump.py:37` | `max_row=2680` | 2233 | clear |
| `rig_dump.py` (`MAXR`) | `1460` | 1451 | clear |
| `rg_dump.py:40` | `max_row=40` | 33 | clear |

### 1.5 A row band used where a column exists — the motor cap nobody wrote down

`M_BRANDS` selects Yamaha from rows 5–293 and ePropulsion from 294–341. The
`Supplier` column says otherwise:

| supplier | rows carrying it | row span | inside the seeded band | **outside** |
|---|---|---|---|---|
| Yamaha | 238 | 6–564 | 209 | **29** |
| EPROPULSION | 37 | 295–589 | 32 | **5** |
| Jeanneau | 92 | 394–572 | — selected *by supplier* | 0 |
| Haines Signature | 85 | 343–584 | — selected *by supplier* | 0 |

The generator's own comment (`gen_all.py:481–484`) explains that the package
tables are selected by supplier "because the workbook does not keep them in one"
— and the same is true of Yamaha and ePropulsion, where it still uses a row
band. Thirty-four real motor rows fall outside. Five of them are named by live
boat rows and are silently dropped: `Motor Library!R549 'Yamaha - F200LC'`,
`R550`, `R555 'Yamaha - F150LCB-FO'`, `R557 'Yamaha - F200XA'`, `R559`.

---

## 2. What full scale actually is

### 2.1 Source band totals

Counted from `tools/seed/extracts/`, using the generator's own row
classification (so a banner is a banner and a spacer is a spacer).

| library | data rows | notes |
|---|---|---|
| Boat Module, live (rows 4–1004) | **810** SKUs | + 68 series banners |
| Boat Module, below the OBSOLETE divider | **1,193** SKUs | + 68 banners — **not in the extract**, see §3.1 |
| Trailer Module | **476** | 434 live + 42 obsolete |
| Motor Library | **452** rows carry a Supplier | 238 Yamaha · 37 ePropulsion · 92 Jeanneau pkg · 85 Haines pkg |
| Parts Maintenance | **2,948** parts | + 217 category banners · 699 below the OBSOLETE divider |
| Dealer Fit Module | **1,777** packages | + 94 category banners |
| Rigging Kits | **1,234** kits | 622 live + 612 obsolete |
| Labour Rates | 18 | whole already |
| Oils & Consumables | 27 | whole already |
| Registration Costs | 19 | whole already |

**Three numbers in circulation are wrong and are corrected here.** They were
checked rather than repeated:

- *"Parts 68 of 3,162"* — 3,162 counts the populated `C` cells, which include
  the 217 category banners and the header rows. The parts library is **2,948**
  parts. The seeded 68 is 2.3% of it, not 2%.
- *"Dunbier 16 of 125"* — `trl_dunbier` (rows 281–454) holds **102** trailers.
  125 is `trl_mackay` (rows 455–625). The seed's own `desc` line is generated
  from `len(rows_all)` and says 102; the 125 is a misattribution.
- *"Rigging Kits 640 of 1,284"* — 1,284 is the count of populated `C` cells,
  which includes band headers, banners and `.` spacers. The kit count is
  **1,234**. (640 seeded = 622 live + 18 reachable obsolete.)

Confirmed as stated: Highfield 588 · Stacer 91 · Dealer Fit 1,777 · Surtees
19/19 and Haines 9/9 complete · 52 tables (25 base + 27 join) · 7,201 lines ·
Labour Rates 18 · Registration 19. Oils is **27**, not ~30 — and the seed's own
`desc` already says so and explains the two blank rows.

### 2.2 Per-table target counts

Produced by running the committed `gen_all.py` with every boat, trailer and
motor budget raised to 10⁹ — the packages, `trl_obsolete`, `dealer_fit`, `parts`
and the obsolete half of `rig_kits` then grow on their own by reachability.
`Highfield × GFAB — Trailer Fitment`, empty in today's subset, becomes real: the
seed goes from 52 tables to **53**.

| table | today | **full scale** | of a source total of |
|---|---:|---:|---:|
| `boat_stacer` | 26 | **91** | 91 |
| `boat_stabicraft` | 30 | **37** | 37 |
| `boat_surtees` | 19 | **19** | 19 |
| `boat_jeanneau` | 24 | **27** | 27 |
| `boat_haines` | 9 | **9** | 9 |
| `boat_highfield` | 40 | **588** | 588 |
| `boat_formosa` | 26 | **39** | 39 |
| `trl_redco` | 16 | **52** | 52 |
| `trl_nsmcustom` | 53 | **73** | 73 |
| `trl_gfab` | 14 | **32** | 32 |
| `trl_stacertrailers` | 14 | **34** | 34 |
| `trl_dunbier` | 16 | **102** | 102 |
| `trl_mackay` | 16 | **125** | 125 |
| `trl_bmt` | 16 | **16** | 16 |
| `trl_obsolete` | 10 | **10** | 42 · reachability |
| `mot_yamaha` | 83 | **209** | 209 in band · 238 by supplier |
| `mot_epropulsion` | 14 | **32** | 32 in band · 37 by supplier |
| `mot_pkg_haines` | 39 | **39** | 85 · reachability |
| `mot_pkg_jeanneau` | 39 | **50** | 92 · reachability |
| `parts` | 68 | **69** | 2,948 · reachability + 5/category |
| `dealer_fit` | 30 | **70** | 1,777 · reachability |
| `rig_kits` | 640 | **650** | 1,234 · live whole + reachable obsolete |
| `labour_rates` | 18 | **18** | 18 |
| `oils_lubes` | 27 | **27** | 27 |
| `registration` | 19 | **19** | 19 |
| **25 base tables** | **1,236** | **2,437** | |
| `join_hf_yam` | 134 | **2,519** | |
| `join_stacer_yam` | 105 | **434** | |
| `join_formosa_yam` | 193 | **270** | |
| `join_stabicraft_yam` | 179 | **239** | |
| `join_surtees_yam` | 144 | **144** | |
| `join_jeanneau_yam` | 78 | **78** | |
| `join_jeanneau_pkg` | 130 | **156** | |
| `join_haines_pkg` | 117 | **117** | |
| `join_hf_trl` | 18 | **146** | |
| `join_stacer_trl` | 46 | **142** | |
| `join_formosa_trl` | 71 | **92** | |
| `join_stabicraft_trl` | 69 | **84** | |
| `join_surtees_trl` | 29 | **29** | |
| `join_jeanneau_trl` | 16 | **16** | |
| `join_hf_gfab` | *empty* | **51** | the 53rd table |
| `join_stabicraft_gfab` | 40 | **47** | |
| `join_surtees_gfab` | 11 | **11** | |
| `join_haines_trl` | 18 | **18** | |
| `join_hf_df` | 104 | **1,342** | |
| `join_stabicraft_df` | 90 | **111** | |
| `join_jeanneau_df` | 34 | **42** | |
| `join_hf_pd` | 110 | **1,707** | |
| `join_stacer_pd` | 100 | **363** | |
| `join_stabicraft_pd` | 169 | **204** | |
| `join_formosa_pd` | 130 | **130** | |
| `join_jeanneau_pd` | 118 | **118** | |
| `join_surtees_pd` | 39 | **39** | |
| `join_surtees_obs` | 30 | **30** | |
| **28 join tables** | **2,260** | **8,679** | |
| **TOTAL** | **3,566** | **11,116** | |

The joins are the growth: **3.8×**, and 2,519 rows of it is Highfield × Yamaha
alone, because Highfield goes from 40 hulls to 588 and each fills up to thirteen
motor slots.

### 2.3 The fan-out at full scale, and what still does not resolve

Every non-sentinel cell in the four bands, over all 810 live boat rows:

| band | edges | resolved into a seeded table | lost |
|---|---:|---:|---:|
| motor (13 slots) | 4,025 | 3,957 — **98.31%** | 68 |
| rigging kit (13 slots) | 3,521 | 3,521 — **100.00%** | 0 |
| trailer (6 slots) | 681 | 673 — **98.83%** | 8 |
| dealer fit (42 slots) | 1,504 | 1,495 — **99.40%** | 9 |
| P/D part (10 slots) | 2,561 | 2,561 — **100.00%** | 0 |

The 4,025 motor edges are the same relationship `FITMENT_RULES.md` measures at
4,018; the seven-edge difference is this run counting every live boat row rather
than the adjudicated live set, and it is not material to any threshold.

The 68 lost motor edges are 30 distinct names. **Five are in the Motor Library
and are lost to the row-band cap of §1.5.** The other 25 are absent from the
Motor Library entirely — all of them Cap Camarat / Merry Fisher twin-engine
bundles, mostly Mercury (`'CC10.5 CC w Mercury - Twin 300 V8 White'`), plus one
cell reading `'0'`. That is a real hole in the workbook, not a seeding choice,
and it belongs in the drift report rather than being filled.

---

## 3. Two findings that change what "full" means

### 3.1 The obsolete boat catalogue does not exist in the extract

`Boat Module!A1005` reads `OBSOLETE` and `C1005` reads *"OBSOLETE MODELS (Models
that ar No Longer Available)"*. Below it, in the real workbook, are **1,193 SKUs
under 68 series banners**, running to row 2301 — larger than the entire live
catalogue of 810.

`b2_dump.py:33` stops at row 1010. The extract holds **five** of those 1,193
rows, and the generator's brand bands stop at 1004 anyway, so **none** reach the
seed.

This matters because the discontinued contract is honoured in three libraries
and silently absent in the fourth:

| library | divider | in the seed? |
|---|---|---|
| Trailer Module!A656 | OBSOLETE TRAILERS | yes — `trl_obsolete`, `retired: true` |
| Parts Maintenance!C2918 | OBSOLETE PARTS | yes — `__discontinued` |
| Rigging Kits!C829 | OBSOLETE RIGGING KITS | yes — `__discontinued` |
| **Boat Module!A1005** | **OBSOLETE MODELS** | **no — the probe cannot see it** |

`src/features/constraints/workbookRules.ts` already records this as a blocker in
its own words: *"nothing to exclude … seeds Boat Module rows 4–1004 only, so no
obsolete row is in the model"*. Raising the probe cap is what clears the second
half of that blocker.

**It is buildable.** The concern recorded in `workbookRules.ts` — that the
obsolete region duplicates live models — was checked: of 1,193 obsolete SKUs
only **5** share a display name with a live model (rows 1006, 1007, 1842, 1845,
1847), and within the obsolete band there is exactly **one** duplicated name
(`'Classic FT - CL290FT HYP - B-G'`, rows 1413–1414). As a separate
`boat_obsolete` table carrying `retired: true`, the way `trl_obsolete` already
does, `main()`'s duplicate-name assertion has one pair to resolve, not a
thousand.

**ESTIMATE of the cost:** the seven boat tables occupy 332,363 bytes at full
scale, ~410 bytes per SKU, so 1,193 obsolete SKUs would add roughly **478 KB**
of source.

**This is a decision for the owner, not for a build.** Everywhere else the
obsolete band is imported *by reachability* — only the rows a live hull still
points at. Nothing points at a boat, so reachability yields zero and the choice
is binary: the whole obsolete catalogue, or none of it. The case for the whole
of it is the one already made for trailers — *an old quote was written against
it and has to stay readable*. Recommend asking, and until then recording it as
an honest gap rather than shipping a fourth divider the seed pretends is not
there.

### 3.2 The working tree is not HEAD, and regeneration would destroy work

`python tools/seed/emit.py` reproduces `HEAD:src/demos/northside.ts` byte for
byte — 1,076,153 bytes, verified. It does **not** reproduce the working tree.
`src/demos/northside.ts` currently carries **+252 hand-written lines** over HEAD
(`NORTHSIDE_NAME`, `idByKey`, and a five-module `ModuleDef` block) added by
another session.

`src/demos/` is a generated artefact and its own README says *"Never edit it by
hand."* The next `emit.py` run deletes those 252 lines without a warning.

**Do not regenerate until that work is either reverted or moved into
`emit.py`'s `FOOTER`.** This is recorded, not fixed — `src/demos/**` is another
session's lane.

---

## 4. The shape: keep the typed literal, and stop shipping it in the entry chunk

### 4.1 What was measured

Three variants were emitted to a scratchpad — never into the repo — by
redirecting `emit.OUT`:

| variant | rows | source | gzip | lines |
|---|---:|---:|---:|---:|
| today | 3,566 | 1.03 MB | 139 KB | 7,201 |
| **full scale** (§2.2) | 11,116 | **2.28 MB** | **246 KB** | **16,041** |
| every catalogue *whole* | 16,406 | 3.99 MB | 518 KB | 24,591 |

Toolchain cost today, with the 1.03 MB literal in place:

- `npx tsc --noEmit -p tsconfig.app.json` — **3.6 s** (TypeScript **7.0.2**, the
  native compiler)
- `npm run build` — **3.5 s** total, Rolldown bundle in **1.08 s**
- `npx vitest run` — **6.4 s**, 275 tests in 16 files, all passing
- bundle: `index-*.js` **2,153 kB**, gzip **508 kB** — of which the seed is
  ~139 kB gzip, **27% of everything a first-time visitor downloads**

### 4.2 The decision

**Keep the generated TypeScript literal. Change how it is loaded, not what it
is.** Full scale is 2.28 MB and 16,041 lines — 2.2× today, not 20×.

Why the literal survives its own size:

- **It is type-checked.** `SeedTable` catches a generator that emits a bad
  `kind`, a missing `accent`, a `ref` pointing at no table. A JSON asset gets
  that check only if something re-validates it at runtime, which is a new
  failure mode in exchange for a saved compile.
- **The diff is the review.** `emit.py` writes **one row per line**. A price
  change in the workbook is a one-line diff a person can read in a PR. Pretty
  JSON gives the same property at 1.5× the bytes; compact JSON destroys it,
  turning every regeneration into one unreviewable line.
- **The cost it is accused of is not the cost it has.** TypeScript 7's native
  compiler does the whole project in 3.6 s. Extrapolating linearly on a data
  literal, full scale lands near 6–8 s. That is a build, once, on a machine.
- **`emit.py` already fights the size** — the `S[]` string pool writes each
  repeated string once (1,241 entries today, 2,506 at full scale). Gzip is
  9.7× on the full-scale file precisely because the shape is regular.

What genuinely hurts, and it is the same at 1 MB or 2.3 MB: **`src/demos/index.ts`
imports the seed statically**, so it lands in the entry chunk. Every visitor
downloads the whole Northside price file before the first paint, including one
who opens a blank sheet. At full scale that is 246 KB gzip of data most sessions
never touch.

**The fix is one import, not a new file format:** make `src/demos/index.ts` load
`./northside` with `await import('./northside')` inside `load()`. Rolldown then
emits it as its own chunk — still built at build time, still served from the
same origin, still cached and offline-capable, still typed, still one row per
line in git. The entry chunk drops by ~139 KB gzip today and ~246 KB at full
scale, and the data arrives only when a person asks for Northside Marine.

The `DemoSet.load(): void` signature becomes `Promise<void>`, and the two call
sites (`src/demos/index.ts`, `src/app/demoLoad.ts`) are both **outside this
session's lane** — recorded, not changed.

### 4.3 The options that were rejected, and why

**A JSON asset fetched at runtime.** Fails the local-first promise. There is no
service worker in this repo, so a `fetch('/northside.json')` is a network
request the app currently has no way to survive without. It also loses the type
check and, with it, the only thing that catches a generator regression before a
person clicks. `import x from './northside.json'` avoids the network problem but
Vite inlines it into the same chunk — so it costs the type check and buys
nothing the dynamic import does not already give.

**Chunked per table, lazily loaded.** 53 files, 53 dynamic imports. It breaks
the contract `src/demos/index.ts` states in its own header — *"Each one loads
atomically in a single `replaceProject` call"* — for a saving the single dynamic
import already delivers, because the demo is all-or-nothing: a sheet with the
boats but not the joins is not a usable sheet. Revisit only if a surface ever
needs one table without the rest.

**Every catalogue imported whole (16,406 rows, 3.99 MB, 518 KB gzip).** This
would abandon `FITMENT_RULES.md` §5.7's reachability policy — adjudicated, and
not this document's to overturn. It buys 2,879 parts and 1,707 dealer-fit
packages that no seeded hull names. If a salesperson needs to sell a part off
the shelf that no boat's P/D band lists, that is a real requirement and it
should be raised as one, with the owner, rather than smuggled in as a size
decision.

**Note on IndexedDB:** the data lands in Dexie either way, and the store is the
same size in all four variants. The shape question is only about how the bytes
reach the browser and what the toolchain pays on the way. That is why the answer
is a loading change and not a format change.

---

## 5. The regeneration procedure, end to end

### Before you start

- **The workbooks are read-only.** Open them; never save them. Every probe uses
  `openpyxl.load_workbook(..., read_only=True, data_only=True)` and closes it.
- **Check the working tree first** (§3.2). `git diff --stat src/demos/northside.ts`
  must be empty. If it is not, someone has hand-edited a generated file and
  regenerating destroys their work. Resolve that before going further.
- Python 3 with `openpyxl` (3.1.5 was used here). Stage two needs neither.

### Stage one — probe (only if the workbooks changed)

`extracts/` is committed, so a collaborator without the workbooks skips this
entirely. Run it only when a workbook is replaced.

```bash
python tools/seed/probes/b2_dump.py        # Boat Module (5).xlsx -> b2_headers, b2_data
python tools/seed/probes/b3_formula.py     # the ONLY probe opening data_only=False
python tools/seed/probes/t1_dump.py        # Trailer Module.xlsx
python tools/seed/probes/m1_dump.py        # Copy of Motor Module (1).xlsx
python tools/seed/probes/p1_dump.py        # Parts Module (3).xlsx -> Parts Maintenance
python tools/seed/probes/pd_dump.py        # Parts Module (3).xlsx -> Dealer Fit Module
python tools/seed/probes/rig_dump.py       # Rigging Module.xlsx
python tools/seed/probes/sv_dump.py        # Service Module (1).xlsx
python tools/seed/probes/rg_dump.py        # Registration Module.xlsx
```

**Three things to fix before this stage is trustworthy again:**

1. `t1_dump.py:5` and `p1_dump.py:6` still write into a machine-specific
   `AppData\Local\Temp` scratch directory, not into `extracts/`. The README says
   all probes were repointed; two were not. Their extracts are correspondingly
   stale — `t1_data.json` and `p1_parts.json` are dated 9 August, everything
   else 17 August. Repoint them the way `b2_dump.py:13` does:
   `str(Path(__file__).resolve().parent.parent / "extracts") + "/"`.
2. `m1_dump.py:18` reads **`Copy of Motor Module (1).xlsx`**. `tools/seed/README.md`
   says the source is `Motor Module (1).xlsx`. Two different files, both present
   in `Downloads`, 33 MB and 7 MB. Settle which one is the source of truth and
   make the README agree with the code.
3. `b2_dump.py:33` and `b3_formula.py:48` cap at row 1010 while the sheet runs to
   2301 (§3.1). Raise both to at least 2320 **only** if the owner wants the
   obsolete boat catalogue — the two must be raised together, or the `__origin`
   formula test will report `added` for every obsolete row it cannot see.

### Stage two — assemble and check, writing nothing

```bash
python tools/seed/gen_all.py
```

Prints one line per table with its kind, role, column count and row count, then
`TOTAL ROWS`, then any join the specification admits that this subset cannot
fill. **It writes no file** — this is the command to use while changing a rule.
Today it prints 52 tables / 3,566 rows and one `EMPTY IN THIS SUBSET`.

It will refuse to build, by design, on either of two conditions
(`gen_all.py:1673`, `:1686`): two seeded hulls in one brand sharing a display
name, or a partner name claimable by two seeded tables. Both are real defects;
fix the input, do not loosen the assertion.

### Stage three — emit

```bash
python tools/seed/emit.py
```

The only command that writes `src/demos/northside.ts`. Prints `bytes`, `tables`,
`rows`, `pool`, `joins`, `pairs`.

**Never text-process the output.** A PowerShell rewrite once turned 171 `×`
characters into mojibake and the repair corrupted the file to binary. Change the
generator; run the generator.

### Stage four — verify

```bash
git diff --stat src/demos/northside.ts     # expect no change if nothing changed
npx tsc --noEmit -p tsconfig.app.json
npm test                                   # vitest, check:reachable, check:styles
npm run build
```

`emit.py` is deterministic: with unchanged extracts it reproduces the file byte
for byte. **A diff you did not expect means you changed something — find out
what before you commit it.** Verify with a hash if you want certainty:

```bash
python -c "import hashlib;print(hashlib.sha256(open('src/demos/northside.ts','rb').read()).hexdigest())"
```

### To change the scale

Edit only the `budget` values (§1.1) and, for parts, the `[:5]` and
`P_CATEGORIES` (§1.2). To reproduce the full-scale measurements in this
document, set every boat, trailer and non-package motor budget to a large
number and leave the zero-budget tables at zero — they fill by reachability.
Then run stage two, stage three, stage four.

### After regeneration

Re-read the `desc` lines. Each one is generated from `len(rows)` and
`len(rows_all)` and states its own coverage — *"40 of 588 SKUs seeded"*. They
are the seed's honesty about itself and they update themselves. If a `desc` says
something that is no longer true, the generator's f-string is the bug.

---

## 6. Open questions for the owner

1. **Obsolete boats (§3.1).** 1,193 SKUs the seed cannot currently see. Import
   the whole obsolete catalogue as a `retired: true` table so old quotes stay
   readable — the reason already accepted for trailers — or leave them out and
   record it? Reachability cannot decide this one.
2. **The 25 unresolvable motor names (§2.3).** Cap Camarat and Merry Fisher twin
   bundles, mostly Mercury, named by live boat rows and absent from the Motor
   Library. A hole in the workbook. Where should those motors be recorded?
3. **Parts beyond reachability (§4.3).** Does a salesperson need to sell a part
   no boat's P/D band names? If yes, `parts` should be imported whole and the
   size decision follows the requirement rather than leading it.
