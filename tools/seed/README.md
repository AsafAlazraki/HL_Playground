# The seed pipeline

`src/demos/northside.ts` is **generated**. 276 KB, 21 tables, 651 rows, produced
from Northside Marine's real workbooks. Never edit it by hand and never
text-process it with a shell tool — a PowerShell rewrite once turned 171 `×`
characters into mojibake, and the attempted repair corrupted the file to binary.
There were no commits at the time. Change the generator; run the generator.

```bash
python tools/seed/gen_all.py
```

That command reproduces the committed `northside.ts` **byte for byte** — verified
by SHA-256 before and after. If your run produces a different hash, you changed
something; diff before you commit it.

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
| `t1_data.json`, `t1_style.json` | `probes/t1_dump.py` | `Trailer Module.xlsx` |
| `m1_data.json` | `probes/m1_dump.py` | `Motor Module (1).xlsx` |
| `p1_parts.json` | `probes/p1_dump.py` | `Parts Module (3).xlsx` |

The probes expect the workbooks in `C:/Users/AsafA/Downloads` and write to a
scratch directory — both paths are still absolute at the top of each probe.
Repoint them if you re-run stage one. **The workbooks are read-only:** open them,
never save them.

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

**Joins are generated too.** The four fitment tables — Highfield × Yamaha,
Stacer × Yamaha, and the two trailer pairings — are derived, not hand-written.
