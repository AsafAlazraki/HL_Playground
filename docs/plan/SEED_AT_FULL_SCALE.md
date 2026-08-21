# The seed at full scale — the shape, the caps, and how to regenerate it

Northside Marine is the first customer. This document decided what "the whole
thing" is, where the sampling caps lived, what the full-scale numbers actually
are, and how a person repeats the regeneration end to end.

> **IT HAS BEEN DONE — see §7.** `src/demos/northside.ts` now carries the whole
> live catalogue: 53 tables, 11,116 rows, 2.42 MB. Sections 1–6 are kept as
> written, because they are the measurement the decision was made on and §7
> reports against them; where §7 corrects one it says so. The caps described in
> §1.1 are lifted (§7.2), the generator described in §3.2 as unrunnable is
> repaired (§7.1), and three defects the sample was hiding are in §7.6.

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

> **LIFTED — §7.2.** Every live band now reads `budget=ALL`. The zero-budget
> bands are deliberately still zero, because lifting them would overturn
> `FITMENT_RULES.md` §5.7. The old literals are preserved in `gen_all.py`'s own
> comment beside `ALL`, so a small table reads as a decision rather than a
> forgotten cap.

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

**GONE — see §8.** This described five non-reachable parts per category, for six
of the sheet's 217 category banners. Both the `[:5]` and `P_CATEGORIES` were
removed when `parts` began carrying its whole sheet; there is now no literal
`[:N]` anywhere in the generator.

### 1.3 Reachability, which is a cap with no number

The obsolete half of `rig_kits`, `trl_obsolete` and both factory-package tables
take only rows a *seeded* hull names. They are therefore capped **transitively**
by the boat budgets: raise the boat budgets and these grow on their own. This is
the standing policy of `FITMENT_RULES.md` §5.7 and it is not a defect.

`dealer_fit` **was** on this list and is not any more — see §8. §5.7 is a rule
about FAN-OUT, and it stops at a library: the three tables left here are each
reached through a hull and have no counter of their own, which is exactly what a
parts register and a dealer-fit register do have.

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

> **These were reproduced exactly — §7.3.** The *today* column is now history.
> Two of its entries were wrong when written (`join_formosa_pd` was 82, not 130;
> `join_jeanneau_pd` was 104, not 118); both **full scale** figures were right.

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

> **RESOLVED — §7.1.** The 252 hand-written lines were committed and grew to
> 366; `emit.py`'s `HEADER` and `FOOTER` are now the committed file's own
> prelude and tail, so a run reproduces every one of them. Verified byte for
> byte at the old budgets before anything else changed.

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

### 4.4 It was done, and this is what it measured

Built on `redesign`, 18 August 2026, `npm run build`, one JS chunk before and
two after. Every figure below is off the build report or off `performance` in
the browser; nothing is extrapolated.

| | before | after |
|---|---:|---:|
| entry chunk | 2,291.80 kB · **551.32 kB gzip** | 1,402.85 kB · **421.07 kB gzip** |
| the seed's own chunk | — (inside the entry) | 892.12 kB · **131.22 kB gzip** |

**The entry chunk lost 888.95 kB raw and 130.25 kB gzip — 23.6% of what a
first-time visitor downloads.** `dist/index.html` carries no `modulepreload` for
the seed chunk, so a visitor who never asks for Northside Marine never fetches
it: measured on a cold profile (storage cleared), through onboarding to Home's
first screen, `performance.getEntriesByType('resource')` lists **no request for
`northside-*.js`**, DOM interactive at **390 ms**, DOMContentLoaded **585 ms**.

Home's door still says **52 tables · 3,566 rows** with none of those bytes on
the machine: the figures moved to `src/demos/northsideHolds.ts` and
`northsideHolds.test.ts` builds the set and fails if they drift. `DemoSet.holds`
used to build the whole project to count them — on the one screen a person with
an EMPTY sheet sees, which is what made the split worth nothing on that screen.

Pressing the door: the chunk transfers in **66 ms** and the sheet is complete
**1,285 ms** after the press, of which the fetch is a twentieth — the rest is
`buildNorthsideProject` + `replaceProject`, which is what it always was. Hovering
the door first (`DemoSet.warm`) fetches AND evaluates the chunk on intent, and
the same press then completes in **262 ms**.

A returning visitor whose sheet IS the set: DOM interactive **172 ms**, the sheet
paints from IndexedDB, and the seed chunk is fetched at **484 ms** — after the
paint, to answer the freshness question only. A sheet with fewer than
`DRIFT_GATE` (8) tables never fetches it at all, which is every blank sheet,
every import and every dealer's own small workbook.

**Offline.** With the chunk already fetched, the network was cut and the door
pressed: the set loaded in **262 ms** and all 50 tables landed. Without it, the
door refuses in place — *"The file did not download. It is fetched the first time
you open it, so this needs a connection. Press again to try."* — and stays
pressable. What is NOT true, before or after this change, is that the app
survives a cold offline start: there is no service worker, so the document
itself is `ERR_INTERNET_DISCONNECTED`. The seed chunk is cached by exactly the
mechanism the entry chunk is, and nothing became more network-dependent than it
already was.

The boundary is `src/demos/seedChunk.ts` — the only file allowed to name
`./northside` — and `entryChunk.test.ts` fails if any shipped file imports the
seed statically, or re-exports a value out of it, which is the same act.

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

**Every catalogue imported whole (16,406 rows, 3.99 MB, 518 KB gzip).**
**ACCEPTED LATER — see §8.** The reasoning below stands as written: the
requirement had to be raised with the owner rather than smuggled in as a size
decision. It was, and the owner ruled for it. The estimate held almost exactly —
15,691 rows, 3.97 MB, 450 KB gzip.

> This would abandon `FITMENT_RULES.md` §5.7's reachability policy —
> adjudicated, and not this document's to overturn. It buys 2,879 parts and
> 1,707 dealer-fit packages that no seeded hull names. If a salesperson needs to
> sell a part off the shelf that no boat's P/D band lists, that is a real
> requirement and it should be raised as one, with the owner, rather than
> smuggled in as a size decision.

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

The command prints one more line than it used to: the picture map's `held`,
`absent` and **`unmeasured`** counts. `unmeasured` is not a failure — it is how
many of the seed's image addresses nobody has asked for yet (§7.8). It clears
with `python tools/seed/fetch_images.py` and needs a network.

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
`P_CATEGORIES` (§1.2). **They are at full scale already** — every live band
reads `budget=ALL`. To take a SAMPLE again, put a number back on the bands you
want sampled and leave the zero-budget tables at zero; they fill by
reachability either way. Then run stage two, stage three, stage four.

Anything you change here changes the seed's own `desc` lines, which count
themselves — that is what §"After regeneration" is about, and it is the reason
a sampled table can never quietly claim to be complete.

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
3. **Parts beyond reachability (§4.3).** ~~Does a salesperson need to sell a
   part no boat's P/D band names?~~ **ANSWERED — yes. See §8.** Both libraries
   are imported whole now, and the size decision followed the requirement
   instead of leading it.

---

## 7. IT WAS BUILT. What the full-scale seed actually cost, and what it uncovered

Built on `redesign`, 18 August 2026. Every figure below was produced by running
the thing, not by extrapolating §2.2.

### 7.1 The generator had to be repaired before it could be run

`emit.py` **refused**, and the refusal was correct: the committed seed carried
366 lines the generator had never known how to write — `NORTHSIDE_NAME`,
`NorthsideProject.idByKey`, the seedStamp wiring, and the whole
`seedNorthsideModules` block, which is the app's five modules. §3.2 recorded
this as another session's lane; it is now this document's, because you cannot
change the scale without running the command.

**The fix is the one the refusal named.** `HEADER` and `FOOTER` in `emit.py` are
now the committed file's own prelude and tail, character for character. Verified
before anything else changed: with the budgets still at their old values,
`python tools/seed/emit.py` reproduced `HEAD:src/demos/northside.ts` **byte for
byte** — 1,096,952 bytes, `sha256
d6f1928a36d530c374e0faf522b1073187f309b44f12748d382f01aa4164de85`, and `git
diff --stat` empty.

The refusal was then **inverted rather than deleted**: `refuse_to_truncate` now
reads the text about to be WRITTEN and stops if one of the three markers is
missing from it. The old check could be satisfied by deleting the thing it
protected; this one cannot.

### 7.2 The caps, replaced by a word

`budget` now takes one of three values and `gen_all.py` says so where they are
declared: `ALL` (take the whole band), `0` (reachability only — *not* "none";
`chosen` is pre-seeded from `forced_names`), or a number, **which nothing uses
any more**. The old literals are kept in that comment so a person reading a
small table knows to look for a `0` rather than suspecting a forgotten cap.

The zero-budget bands were deliberately left at zero. Lifting them would
overturn `FITMENT_RULES.md` §5.7, which is adjudicated and not a size decision.

### 7.3 What came out, against what §2.2 predicted

| | predicted (§2.2) | **built** |
|---|---:|---:|
| tables | 53 | **53** |
| rows | 11,116 | **11,116** |
| base-table rows | 2,437 | **2,437** |
| join rows | 8,679 | **8,679** |
| `Highfield × GFAB` | 51 | **51** — the 53rd table, real |

Every per-table figure in §2.2 was reproduced exactly. Two entries in §2.2's
*today* column were wrong at the time and are corrected here for the record:
`join_formosa_pd` was 82 rather than 130, and `join_jeanneau_pd` 104 rather than
118. Both **full-scale** figures were right.

### 7.4 Size, build and load — measured

| | before | **after** |
|---|---:|---:|
| `src/demos/northside.ts` | 1,096,952 B · 7,606 lines | **2,418,102 B · 16,446 lines** |
| that file gzipped | 139 kB | **259.5 kB** |
| string pool | 1,241 | **2,506** |
| `npx tsc --noEmit -p tsconfig.app.json` | 3.6 s | **12.7 s** |
| `npm run build` | 3.5 s | **4.4 s** (Rolldown 1.35 s) |
| `npm test` (vitest + 2 guards) | 6.4 s | **34 s**, 642 tests in 45 files |
| **entry chunk** | 1,402.85 kB · **421.07 kB gzip** | **1,425.22 kB · 426.54 kB gzip** |
| the seed's own chunk | 892.12 kB · 131.22 kB gzip | **1,982.78 kB · 243.18 kB gzip** |

§4.1 projected 2.28 MB and 16,041 lines. It came out 2.42 MB and 16,446,
because the projection was taken against a `HEAD` that did not yet carry the 366
module lines, and because four `desc` lines got longer on purpose (§7.6, §7.8).
The gzip projection of 246 kB against 259.5 kB is the same difference.

**The entry chunk barely moved — 22 kB raw, 5.5 kB gzip — and that is the whole
point of §4.4's split holding at scale.** The seed more than doubled and a
first-time visitor pays 5.5 kB of it. Confirmed in the built app on a cold
profile (IndexedDB and localStorage cleared, `vite preview` on 5371): through
onboarding to Home's first screen, `performance.getEntriesByType('resource')`
lists **no request for `northside-*.js`**, DOM interactive **20 ms**,
DOMContentLoaded **26 ms**.

The one real cost is `tsc`, at 12.7 s. §4.2 estimated 6–8 s by linear
extrapolation and under-called it; 12.7 s for a whole project including a 2.4 MB
typed data literal is still a build, once, on a machine.

**Pressing the door**, cold profile, chunk in the disk cache: **207 ms** from
press to the complete sheet — 53 tables, 11,116 rows, Home reading
"51 tables" (the two retired ones withheld, which is the discontinued contract
working). At 3,566 rows the same measurement was 262 ms warm and 1,285 ms cold,
so **three times the rows arrive no slower**.

### 7.5 It is not slow to use, and that was checked rather than assumed

Measured in the built app at 1440×900, frames counted with `requestAnimationFrame`
while driving the surface:

| surface | opens in | frames |
|---|---:|---:|
| Data model, whole sheet, panning | 559 ms | **54 fps** |
| Boats module index (588 items), scrolling | 712 ms | **60 fps** |
| `Highfield Inflatables` table, 588 × 33, scrolling | 58 ms | **61 fps** |
| `Highfield × Yamaha` table, 2,519 × 11, scrolling | 38 ms | **60 fps** |

A full walk — onboarding, Home, Data model, Modules, Boats, a brand page, two
table pages, Business rules, Fitment, running a rule — logged **zero console
errors and zero warnings**.

**The suite got slower, and two tests were given an explicit budget for it.**
`npx vitest run` went from 6.4 s to 34 s, and two tests that walk every hull
against every trailer began exceeding vitest's 5 s default under parallel load
while their assertions were passing. They carry a `20_000` timeout each, with
the measurement written beside them — deliberately per-test rather than a global
`testTimeout`, which would hide the next slow thing instead of naming this
one.

Modules survive the scale, which §2.2 could not promise: Boats opens on 810
items across 7 tables with Highfield at 588, and its related-block list gained
**GFAB Trailers, on 3 of 7** — a block that appears because the data arrived,
through the same derivation, with no code change.

### 7.6 Three things full scale uncovered that the sample was hiding

These are the reason this section is longer than a row count. None is invented;
each was measured and each is now stated on the surface that shows it.

**1. The rule engine was ordering horsepower alphabetically.** `compareValues`
read `"10 HP"` with `Number()`, got `NaN`, and fell through to comparing the two
sides as text — so `"8" > "10 HP"` and `"115" < "20 HP"`, both true
lexicographically and both wrong about outboards. On 40 Highfield hulls the
column profiled as numeric and this never fired. At 588 hulls, 31 of them carry
a twin-rig plate (`"2 x 300 HP"`), the column is correctly TEXT, and the bug
becomes the app's answer. **"Motor fitment — Highfield" was returning 63,232
rows; it returns exactly 32,000 now, and the 31,232 that left were motors above
the hull's own plate.** `src/lib/rules/evaluate.ts` parses a leading number with
an optional unit — the same shape `tools/seed/gen_lib.py` parses out of the
workbook — and refuses two different units, and refuses a twin rig, each with a
sentence rather than a silent `false`. `src/lib/rules/measure.test.ts` pins it.

**2. The walk's ceiling was below the real catalogue.** `MAX_PAIR_STEPS` was
100,000. The motor rule needs 588 starts + 122,892 candidate tests + one visit
per surviving pair — **187,300 steps, measured** — so it stopped two-thirds
through. Worse, because the walk is breadth-first, it stopped *inside the match
node*, so the output node never ran and the rule produced **nothing** while
warning "the results below are only part of the answer" over an empty table.
The cap is 500,000 (a step is ~2.7 µs, so the worst case is still bounded near
1.4 s), and the warning now says which of the two happened.

**3. `A1/F1` has counter-examples at this scale, and the seed says so.**
`FITMENT_RULES.md` F1 measured 0 of 1,424 live slot-1/slot-2 motors above Max
HP. Over the 2,519 Highfield × Yamaha pairings the seed now carries, **9 sit
above the plate** — every one a Classic CL400 read `"50 HP"`, paired by the
workbook with a Yamaha F60LC. The rule refuses them, which is what A1 admitted
the ceiling for; whether the plate or the pairing is wrong is the dealer's call.
A further **76** cannot be ordered at all (single-engine motor against a
twin-rig plate) and **205** are ordered as text because *both* sides are twin
rigs — right on all 205 by the shape of the strings rather than by arithmetic,
which is exactly F1's case for decomposing Max HP at import. **2,434 of 2,519
are offered.** All of it is in the seeded rule's own description, on screen.

### 7.7 What the fitment suite gained: the specification, reproduced

`trailerFitment.test.ts` used to open by explaining that the seed was "a curated
sample of 145 live trailers out of 434, so counts differ and RATES do not". It
no longer has to. The seed carries all 434 live trailers and all 810 live hulls,
and `FITMENT_RULES.md`'s own figures come back exactly:

- a Highfield hull is left **12 of 434** trailers — the **2.76 %** F8 measured;
- the per-brand spread is **0.92 %–7.83 %** — the range F8 quotes, to the
  decimal, Merry Fisher at the bottom and Stacer at the top;
- **626 of 626** testable live pairings hold, zero counter-examples;
- the ATM floor is evaluable on **351 of 351** pairings and holds on all of
  them, while leaving a mean **94.23 %** of the catalogue standing — which is
  why it is a floor and not a selector.

The suite's share bound was tightened from 0.14 to **0.08** accordingly: there
is no longer a sample to allow for.

### 7.8 The photographs are the one thing NOT finished, and it is deliberate

The catalogue now carries **453 distinct image addresses**, up from 184. The
measurement in `tools/seed/extracts/images.json` covers the original 184 — 108
obtained, 76 refused — so **234 addresses have no answer of any kind**. That
figure is now:

- computed by `emit_images.py` from the assembled tables, so it cannot drift;
- exported as `NORTHSIDE_PICTURES.unmeasured` and written into the generated
  file's own header;
- printed by `python tools/seed/emit.py` on every run, with the command that
  clears it;
- guarded by `northsideImages.test.ts`, which fails if it moves.

An unmeasured address behaves **exactly** as a refused one: the row keeps the
manufacturer's address, the app draws "Held as a link", and nothing is
substituted. Clearing it means a few hundred requests to nine third-party
servers, which is somebody's decision and not a side effect of a regeneration.
Run `python tools/seed/fetch_images.py`; it fetches only what is missing.

### 7.9 What §6's open questions look like now

Question 1 (obsolete boats) is **unchanged** — nothing here touched the probe
caps, so the 1,193 obsolete SKUs are still outside the extract and still a
decision for the owner.

Question 2 (the unresolvable motor names) is **unchanged in kind and larger in
evidence**: the row-band cap of §1.5 is now stated on the motor tables' own
`desc`, counted at run time — Yamaha carries 238 rows by `Motor Library!Q` and
209 by the row band, and 5 of the 29 outside are named by live boat rows
(`R549`, `R550`, `R555`, `R557`, `R559`) and are named there too. Switching the
selection to `by="supplier"` would change which rows the fitment joins resolve
against and is a research question, not a knob.

Question 3 (parts beyond reachability) was **answered next, and the answer was
yes** — §8. The `desc` that used to say how many parts were left out now says
that none are.

---

## 8. A LIBRARY IS NOT FAN-OUT. Both registers now carry their whole sheet

§4.3 rejected "every catalogue imported whole" and was right to: the question it
raised — *does a salesperson need to sell a part no boat's P/D band names?* —
belonged to the owner and not to a size estimate. It was raised, and the owner
ruled for it. §6 question 3 is answered.

### 8.1 The argument, stated once

`FITMENT_RULES.md` §5.7 says *import what the catalogue actually names, not the
whole library behind it*. That is a rule about FAN-OUT — which rows a boat row's
P/D and dealer-fit bands point at — and it was the right rule while every table
was a curated sample. It is the wrong rule for a **register**. Nobody reaches a
bilge pump through a hull; they look it up by name, because a customer is at the
desk asking for one. A parts manager who opened their own register and found 69
of their 2,948 rows would conclude the app had lost their data, and they would
be right to. The same argument took Highfield from 40 hulls to 588; this was the
last table where it had not been made.

The three bands still on §1.3's list are genuinely fan-out and keep their `0`: a
Haines factory package, an obsolete trailer and an obsolete rigging kit are each
reached through the hull that names them.

### 8.2 What landed

| table | before | after | of the sheet's |
|---|---:|---:|---|
| `parts` | 69 | **2,937** | 2,948 rows, less 11 reprinted header rows (§8.3) |
| `dealer_fit` | 70 | **1,777** | 1,777 — all of it |
| **whole seed** | 11,116 | **15,691** | 53 tables, unchanged |

Nothing is excluded. The rows below both OBSOLETE dividers are carried and
flagged: 699 in `parts` (below `Parts Maintenance!C2918`) and 201 in
`dealer_fit` (below `Dealer Fit Module!C2032`). `dealer_fit` had never carried a
`__discontinued` column, because nothing had ever selected a row far enough down
that sheet to meet its divider. It has one now, and the export round-trip guard
counts four tables carrying that field where it counted three.

### 8.3 Three things the whole sheet uncovered that 69 rows were hiding

1. **`Parts Maintenance` reprints its own header eleven times.** Rows 2373,
   2411, 2447, 2488, 2500, 2680, 2695, 2756, 2887, 2900 and 2904 put a category
   name in `C` and then re-type the master row-1 labels across the row — `D`
   "Supplier", `E` "Code", `I` "CTD", `J` "MU", `L` "Sell". The banner rule
   ("`C` filled, `E` empty") read them as PARTS. Wrong twice: eleven header rows
   land in the register as products, and the eleven categories they announce
   never open, so their contents file under whatever banner came before. A row
   is now treated as a reprinted header when `D` **and** `E` both hold the
   master labels verbatim — both, because either alone could be a real value.
   The sheet names 187 categories, not 179.

2. **One odd cell in a thousand was turning a price column into prose.**
   `profile_column` was all-or-nothing: one value that does not parse and the
   whole column is text. At 69 rows that is right. At 2,937 it cost the register
   its `Sell` column — and a parts table whose `Sell` is text cannot be quoted
   from, so `priceLevelsFor` quietly stopped returning the supply rung. The
   profiler now judges only the cells it can judge (sentinels already become
   EMPTY in `coerce`, and a cell the seed promises to drop cannot also decide
   the column's type) and tolerates fewer than one non-numeric cell in a
   hundred, with a floor of 200 judgeable cells so a percentage is never taken
   over twenty. Tolerated cells are EMPTY, exactly as `coerce` already left
   them, and **the column's own `desc` names and counts them** —
   `Parts Maintenance!L` reads *"3 of 2913 cells here are not a number
   ("Std"×2, "POA")"*. Measured across all 53 tables: two columns affected, four
   cells in total.

3. **Two dealer-fit packages a live hull names do not exist in the sheet.**
   "Engine Flush Kit t/s Merry Fisher Well (Twin Motor Installations)" and
   "Lewmar AA150 Chain Counter in Dash w 10mtr Sensor Cable (Jeanneau
   Installations)". The old selector intersected the hull's names with the sheet
   and so dropped them in silence. A whole-sheet import cannot drop anything,
   which leaves the shortfall visible; the table's `desc` names both. That is a
   hole in the workbook and the dealer's to fix.

Two smaller corrections came with it. A bare `.` in a category banner is a
SPACER and not a category — the seed reads a bare `.` as EMPTY in every other
cell and now does so here, so the 27 parts and 74 dealer-fit rows the sheet
leaves unbannered land in the register's designed `(unassigned)` drawer instead
of one named ".". And `boat_haines`'s `Topsides` column went from text to
number: its only non-numeric values were `N/A` sentinels.

### 8.4 The emitter had to change, and it is not cosmetic

`tsc` fails on the seed at this size with **`TS2590: Expression produces a union
type that is too complex to represent`**, on the `parts` and `dealer_fit` row
arrays. An array of a few thousand object literals with different key sets makes
the checker build a union of a few thousand distinct shapes, and it gives up.

The obvious fix does not work, and that was measured rather than assumed:
annotating the array `: SeedRow[]` still fails, because the checker infers the
literal's own type before it checks assignability. What removes the union is
handing the records to a **rest parameter** — every argument then has the same
declared type and there is no union to reduce. Rows are emitted in blocks of 400
through `rs(...)` and spread into a `const` named for its table, so no single
call approaches an engine's argument limit however large a register grows. The
runtime cost is one call per block and nothing per row.

### 8.5 Measured

| | before | after |
|---|---:|---:|
| `src/demos/northside.ts` | 2,418,102 B | **3,969,132 B** |
| seed chunk `northside-*.js` | 1,982.78 kB / 243.17 kB gzip | **3,294.33 kB / 460.60 kB gzip** |
| entry chunk `index-*.js` | 1,599.36 kB | 1,618.77 kB (unrelated work; the seed is still not in it) |
| `npm run build` | 4.37 s wall, 1.25 s vite | **6.71 s wall, 2.04 s vite** |
| `npm test` | 978 tests, 67 files | **1,068 tests, 72 files** |

Measured in the browser against `vite preview` of the production build:

- **Loading the demo:** 440 ms from pressing *Load your Master Price File* to
  the sheet drawn (1,292 ms on the first, cold run of the chunk). The chunk is
  fetched in 88 ms, 455,617 B over the wire, and it is still a **separate
  chunk** — a first-time visitor does not download it.
- **The 2,937-row parts register opens in 0.2 ms of synchronous work** and holds
  **24 rows in the DOM**. A 200-step sweep of the full 111,451 px scroll span
  costs a **median 0.5 ms** per step, p95 0.7 ms, max 0.9 ms — about 3% of a
  16.7 ms frame. The 588-row Highfield register measures 3.9 ms median on the
  same instrument, so the register that grew five-fold is the *cheaper* of the
  two: scroll cost is per-viewport and per-column, never per-row.
- **The 1,777-row dealer-fit register:** 0.4 ms to open, median 1.8 ms per
  scroll step, 24 DOM rows.
- **The discovery engine:** 1,347 ms at 11,116 rows to **1,680 ms at 15,691** —
  +25% for +41% rows, against a guard ceiling of 10,000 ms.
- **Zero console messages**, errors or warnings, across onboarding, Home, the
  Modules index, the Data model canvas and both registers.
- **All five modules still stand**, and the counts stayed row-aware: Parts &
  Accessories reads **"4436 items · 928 not sold"** (2,238 + 622 + 1,576 live;
  699 + 28 + 201 flagged).

Frames per second could **not** be measured: the browser pane never composited
during this session, so `requestAnimationFrame` did not tick. The figures above
are synchronous work per scroll step, which is what a frame budget is spent on,
and they are reported as that rather than converted into an fps number nobody
observed.
