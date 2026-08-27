# The seed pipeline

`src/demos/northside.ts` is **generated**. 3.97 MB, 53 tables, 15,691 rows — of
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
python tools/seed/fetch_images.py           # needs the network. Writes the pictures
python tools/seed/fetch_images.py --mirror  # asks ONLY the dealership's mirror,
                                            # and only about what we do not hold.
                                            # Makes no request to any third party.
python tools/seed/emit_images.py            # needs nothing. Writes the map
```

| what | where | committed |
|---|---|---|
| the pictures, downscaled | `public/seed-images/*.webp` | yes — 220 files, 9,141,262 bytes |
| the measurement | `tools/seed/extracts/images.json` | yes |
| what the app reads | `src/demos/northsideImages.ts` | yes — generated, 48 KB |
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

**220 of the 226 addresses MEASURED are held; 6 are refused. The catalogue
carries 453 addresses, so 227 of them have no answer of any kind** —
`NORTHSIDE_PICTURES.unmeasured`, printed by `emit.py` on every run and guarded
by `northsideImages.test.ts`. An unmeasured address behaves exactly like a
refused one: the row keeps its address, the app says "Held as a link", and
nothing is substituted. Clearing it means a few hundred requests to nine
third-party servers, which is a decision somebody makes rather than something a
regeneration does on its own — run `python tools/seed/fetch_images.py`, which
fetches only what is missing.

### Where 112 of them came from, and why it is not a guess

`www.northsidemarine.com.au` answers 403 from Cloudflare with
`Cf-Mitigated: challenge` to a plain client exactly as it does to a browser, so
71 addresses could not be taken from it at all. The dealership had already hit
that wall and already solved it. Its own remediation run copied every picture
it recovered into the app's Storage bucket under a name computed from **the
original address**:

    mpf-mirror/{folder}/{sha1(url).hexdigest()[:16]}.{ext}

    HelmLogic/scripts/mpf/remediate-images.py:170   the hash
    HelmLogic/scripts/mpf/remediate-images.py:180   the object name
    HelmLogic/scripts/mpf/remediate-images.py:67    the bucket
    folder is "dfo" for site-hosted pictures, "motors" for the Yamaha CDN.

**The object's name is a function of the address the workbook typed.** So a
row's photograph is asked for BY NAME, arithmetically, from that row's own
address. The bucket is never searched for "a picture that looks like this
boat" — that is the substitution IMAGE_SPEC.md §6.6 exists to forbid, and it is
the one outcome worse than a missing picture. A wrong photograph cannot arrive
this way without a SHA-1 preimage collision.

A **second, independent** check is applied to mirrored bytes and to nothing
else: a WordPress derivative address states its own pixel size in its filename
(`620F-1024x683.jpg`), and the bytes have to match or they do not land. On the
run that took these, 51 of the 70 addresses made that claim and **51 of 51
agreed, 0 disagreed**. It is applied only here because a picture fetched from
its own address is self-identifying; one fetched from anywhere else has to
prove it.

No credential is used — `HelmLogic/storage.rules` grants `allow read` with no
condition and this is one plain unauthenticated GET per object. Nothing is
written to that bucket and no Firestore document is read: the mirror is
addressed arithmetically, so the database that maps rows to pictures is never
touched. Business data still comes from the workbooks and only from the
workbooks. Which addresses arrived this way is recorded per entry in
`extracts/images.json` as `via: mpf-mirror`, with `mirror` (the object) and
`mirrorKey` (the sha1) beside it, so the chain is re-checkable by anyone.

**The 6 that are still refused, recorded rather than papered over:** 4 on
`northsidemarine1.sharepoint.com`, which redirects to a Microsoft sign-in and
which the dealership's own remediation also could not export; 1
`www.stacer.com.au` file that 404s on a host serving seventeen others; and 1
`www.northsidemarine.com.au` address the mirror never held either. Nothing is
substituted for any of them — they keep their address and the app says "Held as
a link" with the measured reason.

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
