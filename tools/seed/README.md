# The seed pipeline

`src/demos/northside.ts` is **generated**. 2.42 MB, 53 tables, 11,116 rows — of
which 28 tables and 8,679 rows are the fitment joins — produced from Northside
Marine's real workbooks. Never edit it by hand and never text-process it with a
shell tool — a PowerShell rewrite once turned 171 `×` characters into mojibake,
and the attempted repair corrupted the file to binary. There were no commits at
the time. Change the generator; run the generator.

```bash
python tools/seed/emit.py
```

**It writes, and it reproduces every line of the committed file.** That was not
true for a while and the README should say so plainly, because the repair is
what makes the rest of this document trustworthy again. Measured 2026-08-18:
`emit.py` had fallen *behind the file it writes*. The committed `northside.ts`
carried 366 lines the generator had never known how to emit — `NORTHSIDE_NAME`,
`NorthsideProject.idByKey`, the seedStamp wiring, and the whole
`seedNorthsideModules` block, which is the app's **five modules**. A run
overwrote all of it silently and left the sheet with no modules on it and `tsc`
failing in eight files, so the command was made to REFUSE rather than truncate
a megabyte of a real business's price file.

**The refusal has been answered rather than removed.** `HEADER` and `FOOTER` in
`emit.py` are now the seed's own prelude and tail, character for character, so
a run writes all 366 of those lines. The check is INVERTED: it now reads the
text about to be written and stops if one of the three markers is missing from
it — a guard that cannot be satisfied by deleting the thing it protects.
`--force` writes anyway, for whoever is deliberately changing the shape.

Verified by hash: with the budgets at their pre-full-scale values, `emit.py`
reproduced the committed file byte for byte (`sha256`
`d6f1928a36d530c374e0faf522b1073187f309b44f12748d382f01aa4164de85`,
1,096,952 bytes) before the budgets were lifted.

`python tools/seed/gen_all.py` assembles the same tables and prints a row-count
summary **without touching the file**, which is what you want while you are
changing a rule.

---

## The photographs — a third stage, and it stands on its own

The catalogue's pictures used to be 184 live hotlinks to eleven manufacturers'
web servers. They are fetched once, here, and committed:

```bash
python tools/seed/fetch_images.py      # needs the network. Writes the pictures
python tools/seed/emit_images.py       # needs nothing. Writes the map
```

| what | where | committed |
|---|---|---|
| the pictures, downscaled | `public/seed-images/*.webp` | yes — 108 files, 3,525,146 bytes |
| the measurement | `tools/seed/extracts/images.json` | yes |
| what the app reads | `src/demos/northsideImages.ts` | yes — generated, 24 KB |
| the originals as fetched | `tools/seed/.imgcache/` | **no** — 17 MB, gitignored |

`emit_images.py` is the only writer in this repository that is *not* affected
by the `emit.py` problem above: it reads the committed measurement and writes
one generated file that nothing else has ever hand-edited. `emit.py` calls it
too, so the day the seed generator is repaired the two stay in step.

**It does not touch `northside.ts`.** The rows still hold the manufacturer's
address, at ~124 bytes each; `src/lib/imageSources.ts` resolves an address to a
local copy at PAINT time and never in the data. That is what keeps
IMAGE_SPEC.md §5.2 — no bytes on a row, no bytes in IndexedDB, no bytes in an
export — while still ending the hotlink.

**108 of the 184 addresses MEASURED were obtained; 76 were refused. The
catalogue then went to full scale and now carries 453 addresses, so 234 of them
have no answer of any kind** — `NORTHSIDE_PICTURES.unmeasured`, printed by
`emit.py` on every run and guarded by `northsideImages.test.ts`. An unmeasured
address behaves exactly like a refused one: the row keeps its address, the app
says "Held as a link", and nothing is substituted. Clearing it means a few
hundred requests to nine third-party servers, which is a decision somebody
makes rather than something a regeneration does on its own — run
`python tools/seed/fetch_images.py`, which fetches only what is missing.

**Why the 76 were refused, recorded rather than papered over:** 71 on `www.northsidemarine.com.au`, which answers 403 from
Cloudflare with `Cf-Mitigated: challenge` to a plain client exactly as it does
to a browser; 4 on `northsidemarine1.sharepoint.com`, which redirects to a
Microsoft sign-in; and one `www.stacer.com.au` file that 404s on a host serving
seventeen others. Nothing is substituted for any of them — they keep their
address and the app says "Held as a link" with the measured reason.

Re-run `fetch_images.py` when the workbook's addresses change. It keeps what it
already has (`--refetch` to ignore the cache, `--probe` to report without
writing), and deletes any picture in `public/seed-images` that nothing points
at any more.

---

## Two stages, and why

**Stage one — probe.** `probes/*.py` open the `.xlsx` files and dump what they
find into `extracts/*.json`.

**Stage two — generate.** `gen_all.py` reads `extracts/` and writes the
TypeScript.

They are split for two reasons. Opening a 21 MB workbook is slow and the answer
does not change between runs. More importantly, **`extracts/` is committed**, so
stage two runs for a collaborator who does not have the workbooks at all — and
they will not, because the workbooks are a live business's price file and are not
distributed with this repo.

You only need stage one if the workbooks themselves change.

### What produces what

| extract | probe | source workbook |
|---|---|---|
| `b2_headers.json`, `b2_data.json` | `probes/b2_dump.py` | `Boat Module (5).xlsx` |
| `b3_formula.json` | `probes/b3_formula.py` | `Boat Module (5).xlsx` |
| `t1_data.json`, `t1_style.json` | `probes/t1_dump.py` | `Trailer Module.xlsx` |
| `m1_data.json`, `m1_style.json` | `probes/m1_dump.py` | `Motor Module (1).xlsx` |
| `p1_parts.json` | `probes/p1_dump.py` | `Parts Module (3).xlsx` |
| `pd_dealerfit.json` | `probes/pd_dump.py` | `Parts Module (3).xlsx` |

The probes expect the workbooks in `C:/Users/AsafA/Downloads`; that path is still
absolute at the top of each one, so repoint it if you re-run stage one. They now
write straight into `extracts/`, derived from the probe's own location — they
used to write into a machine-specific temp directory, which meant the only copy
of the seed's input lived somewhere that gets cleaned up. **The workbooks are
read-only:** open them, never save them.

`b3_formula.py` is the odd one out and worth knowing about: it is the only probe
that opens a workbook with `data_only=False`. Every other extract sees a cached
VALUE and therefore cannot tell `='[7]Trailer Module'!$C$140` from the same text
typed by hand. That difference is the entire basis of `__origin` on a pair, so it
gets its own pass, and it stores addresses only — never the formula text.

`probes/` also holds ~85 investigative scripts (`bm_*`, `motor_*`, `t*`, `p*`,
`s*`) written while working out what the workbooks actually contain — header-band
detection, merged-cell mapping, dropdown extraction, formula dumps, external
links, price-ladder reconstruction. They are not part of the build. They are kept
because they are the evidence for how the seed was derived, and re-deriving that
understanding costs days.

---

## What the generator knows that the workbooks do not say

**One table per brand.** The boat module is one grid re-labelled by eight
brand-specific header rows — the schema genuinely drifts per brand, so each brand
becomes its own table. `TableKind` records what a table *holds*.

**Series spans.** Some brands get their own banner rows without being their own
brand. Cap Camarat and Merry Fisher are Jeanneau *ranges*, not marques; the
generator carries a `spans` mode so they land as series inside Jeanneau. This was
wrong once and corrected.

**Quarantine and sentinels.** `gen_lib.py` holds `is_quarantined` and
`is_sentinel` — the rules for values that look like data but are not (spacers,
placeholder dashes, banner text caught in a data column).

**Provenance on every table.** Each generated table carries a `desc` naming the
workbook, the sheet, the row range and the header row it was read under, e.g.
*"Motor Module · sheet "Motor Library" (header row 4), rows 5–293."* If you ever
need to argue about where a number came from, it is in the file.

**Joins are generated too, and there are twenty-seven of them.** They are the
fan-out `docs/specs/FITMENT_RULES.md` adjudicates: one boat row assigns many
things across its columns, and each `(boat brand × partner table)` pair of that
fan-out is one join table. Eight motor joins, ten trailer joins, three
dealer-fit, six P/D-part, and one that exists to show a defect rather than an
offering — thirty live Surtees pairings point at trailers below the workbook's
own `OBSOLETE` divider, eight of them as the boat's *standard* trailer.

**Which pairs a join gets is decided by nothing but the data.** A partner name
resolves into exactly one seeded table — the row band a trailer sits in, the
`Supplier` a motor carries — so the partitioning falls out and `main()` asserts
that no name is claimable by two tables. Every pair the workbook types is
carried: the menu is not filtered down to the recommended one and not filtered
by any rule, because the narrowing from "rated" to "offered" exists nowhere but
in those typed values. What IS dropped is only the sentinel vocabulary, the
obsolete half of the boat sheet, and values that resolve to no library row.

**The three pair columns use the model's reserved ids.** `__origin`,
`__recommended` and `__order`, literally — `readPairs` looks them up by string,
so a minted id is invisible to it. `emit.py` gives any column whose key starts
`__` its key as its field id, which is the whole mechanism.

**A join must write a partner's name exactly as the base table stores it.** The
fan-out scan reads a cell through `norm()` (whitespace collapsed); a base table
stores `coerce()`'s `str().strip()`. For any library name carrying an internal
line break the two disagree, `emit.py`'s reference pass finds no row, and the
pair is dropped **silently** — which is precisely the failure mode a free-text
join exists to hide. Both join builders therefore look the partner up by a
normalised key and write back the stored spelling, and `main()` refuses to build
if two seeded hulls in one brand share a display name.
