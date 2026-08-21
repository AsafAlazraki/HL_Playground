"""Generate src/demos/northside.ts — one table per brand, from the real workbooks.

STAGE TWO OF TWO. The probes in ./probes read the .xlsx files and write the
JSON in ./extracts; this file turns that JSON into the TypeScript seed. The two
stages are split because opening a 21 MB workbook is slow and the extraction
answer does not change between runs — and because the extracts are committed,
so this stage runs for someone who does not have the workbooks at all.

RUN IT FROM ANYWHERE:  python tools/seed/gen_all.py

Paths are derived from this file's own location. They used to be absolute paths
into a machine-specific temp directory, which meant the only copy of the seed's
provenance lived somewhere that gets cleaned up — for a 276 KB generated file
that must never be hand-edited. That is now fixed.
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SC = str(HERE / "extracts") + "/"
sys.path.insert(0, str(HERE))
from gen_lib import profile_column, coerce, parse_num, is_quarantined, is_sentinel, ts_val, ts_str

OUT_TS = str(REPO / "src" / "demos" / "northside.ts")

BHDR = json.load(open(SC + "b2_headers.json", encoding="utf-8"))
BDATA = {int(k): v for k, v in json.load(open(SC + "b2_data.json", encoding="utf-8")).items()}
BROW1 = BHDR["1"]
TDATA = {int(k): v for k, v in json.load(open(SC + "t1_data.json", encoding="utf-8")).items()}
TSTYLE = {int(k): v for k, v in json.load(open(SC + "t1_style.json", encoding="utf-8")).items()}
THDR = TDATA[1]
MDATA = {int(k): v for k, v in json.load(open(SC + "m1_data.json", encoding="utf-8")).items()}
MHDR = MDATA[4]
PDATA = {int(k): v for k, v in json.load(open(SC + "p1_parts.json", encoding="utf-8")).items()}
PHDR = PDATA[1]
DFDATA = {int(k): v for k, v in json.load(open(SC + "pd_dealerfit.json", encoding="utf-8")).items()}
DFHDR = DFDATA[11]
# Which fan-out cells are FORMULAS rather than typed text — see probes/b3_formula.py.
# This is the only thing that distinguishes `__origin: 'rule'` from `'added'`.
FORMULA = {int(k): set(v.split()) for k, v in json.load(open(SC + "b3_formula.json", encoding="utf-8")).items()}
# The eighth workbook, and the two small ones. See probes/rig_dump.py, sv_dump.py,
# rg_dump.py for what each sheet is and why it is (or is not) imported whole.
RIG = {int(k): v for k, v in json.load(open(SC + "rig_kits.json", encoding="utf-8")).items()}
RIGHDR = RIG[1]
SV = json.load(open(SC + "sv_rates.json", encoding="utf-8"))
SV_SAVED = SV["_meta"]["modified"]
LABOUR = {int(k): v for k, v in SV["Labour Rates"].items()}
OILS = {int(k): v for k, v in SV["Oils and Lubes"].items()}
REGO = {int(k): v for k, v in json.load(open(SC + "rg_rego.json", encoding="utf-8")).items()}


def norm(s):
    return re.sub(r"\s+", " ", str(s)).strip()


def colname(label, unit):
    if not unit:
        return label
    if label.lower().rstrip(".").endswith(unit.lower()):
        return label
    return f"{label} {unit}"


def make_col(key, label, letter, vals, sid, sheet, hdrrow, own_label, brand, force=None):
    """Return a column dict or None."""
    vals = [v for v in vals if not is_quarantined(v)]
    if not vals:
        return None
    prof = {"type": "text", "unit": None} if force == "text" else profile_column(vals)
    if prof is None:
        return None
    if prof["type"] == "text":
        if not [v for v in vals if not is_sentinel(v)]:
            return None
    else:
        if own_label is None and all(coerce(v, prof) in (0, None) for v in vals):
            return None  # brand neither names nor uses this column
    if own_label is not None:
        d = f"{sheet}!{letter} · labelled here by header row {hdrrow}."
    else:
        d = f"{sheet}!{letter} · header row {hdrrow} leaves this label blank; “{label}” is the master row-1 label."
    if prof.get("scale"):
        d += " Same column, two units in the source — metres normalised to cm."
    # WHAT A NUMBER COLUMN COULD NOT CARRY, NAMED. gen_lib.profile_column
    # tolerates a handful of words in a deep numeric column rather than turning
    # the dealer's price column into prose over them; the cells it cannot carry
    # are EMPTY, and saying which ones and how many is the difference between
    # that and losing them quietly.
    outl = prof.get("outliers")
    if outl:
        n = sum(outl.values())
        named = ", ".join(f"“{v}”×{c}" if c > 1 else f"“{v}”"
                          for v, c in sorted(outl.items(), key=lambda kv: (-kv[1], kv[0])))
        d += (f" {n} of {prof['judged']} cells here {'is' if n == 1 else 'are'} not a number "
              f"({named}); the column is the rest of them and "
              f"{'that cell is' if n == 1 else 'those cells are'} EMPTY rather than guessed at.")
    return dict(k=key, n=colname(label, prof.get("unit")), t=prof["type"], s=sid, d=d, prof=prof, L=letter)


# ============================================================ BOATS
BOAT_BANDS = [
    ("identity", "Identity", ["C", "D", "E", "F", "G", "H", "I", "K", "L", "M"]),
    ("capacity", "Capacity", ["O", "P", "Q"]),
    ("construction", "Construction", ["S", "T", "U"]),
    ("cost-build", "Cost Build", ["IM", "IQ", "IV", "IX", "IY"]),
    ("motor-envelope", "Motor Envelope", ["KV", "KW", "KX", "KY"]),
    # THE BOAT HALF OF THE OWNER'S OWN EXAMPLE — SERVICE_AND_THEMES.md §3.1,
    # §6.1 phase 1. The section id `registration` already existed, spelled
    # correctly, on all seven TRAILER tables and on none of the boat ones,
    # because KM and KN were never seeded — so registration was one concept
    # applied to one of the two kinds that need it. KM holds the band label that
    # joins to Registration Costs!C; KN holds the physical artefact, and its
    # enum contains the string "Rego Letters Not Required" verbatim, which is
    # also `Operation Codes!C57` — one concept reaching across two workbooks.
    ("registration", "Registration", ["KM", "KN"]),
    ("pricing", "Hull Only Pricing", ["QR", "QT", "RB"]),
]
SECTION_ACCENT = {
    "cost-build": "graphite", "markups": "graphite", "pricing": "viridian",
    "motor-envelope": "carmine", "margin": "viridian", "trailer-pricing": "viridian",
    "cost-ladder": "graphite", "retail": "viridian", "trade": "viridian",
    "supply": "graphite", "fitted": "viridian", "rigging": "carmine",
    "install": "graphite", "total": "viridian", "rate": "viridian", "fee": "viridian",
}
# Sections a table opens with COLLAPSED. `ColumnSection.collapsed` exists in
# model.ts for exactly this and nothing used it until now: the rigging table's
# ten `Control Cable Length` slots are a real part of a kit's identity — cable
# length is a property of the HULL, which is why the motor-side VLOOKUP can
# never pick a kit (FOUR_MODULES.md §3.2) — and are also ten columns in which
# slot 1 carries 27 distinct values and slot 10 carries one. Shown, but folded.
SECTION_COLLAPSED = {"cable-options"}

# ------------------------------------------------------------ DISCONTINUED
# model.ts DISCONTINUED_FIELD_ID. A NORMAL boolean column — a person sees it in
# the grid, sorts by it and edits it — carrying the reserved id `__discontinued`
# so that `isDiscontinued(row)` finds it without a name lookup, exactly the way
# the three PAIR_FIELDS carry theirs.
#
# THE DATA STAYS AND NOTHING OFFERS IT. Four workbooks draw the same divider in
# the same way, and all four are read here rather than guessed at:
#     Boat Module!A1005      'OBSOLETE'  C1005 'OBSOLETE MODELS (Models that ar
#                            No Longer Available)'
#     Trailer Module!A656    'OBSOLETE'  C656  'OBSOLETE TRAILERS - Trailers No
#                            Longer Available'
#     Parts Maintenance!C2918            'OBSOLETE PARTS (NB: Parts No Longer
#                            Available or Used)'
#     Rigging Kits!C829                  'OBSOLETE RIGGING KITS'
# The rule is the ROW BAND below the divider, asserted by the divider's own
# text — never a heuristic over the value.
DISC_K = "__discontinued"


def disc_after(cols, after_key, d):
    """Insert the Discontinued column immediately after `after_key`.

    AFTER, and not appended at the end, because a ColumnSection is the RUN of
    consecutive columns sharing its id (model.ts:80-91) — appending a column
    tagged `identity` behind six other bands would split the run and draw the
    header twice. It also puts the flag beside the name, which is where a
    person maintaining the list needs it.
    """
    i = next(i for i, c in enumerate(cols) if c["k"] == after_key)
    cols.insert(i + 1, dict(k=DISC_K, n="Discontinued", t="boolean", s=cols[i]["s"], d=d))


# ============================================================
# THE THREE VALUES A `budget` MAY TAKE, AND WHAT EACH ONE MEANS.
#
# `budget` caps how many rows a brand band contributes. Three
# round-robin loops (:boats, :trailers, :motors) spend it one row per
# SERIES at a time, so a capped sample spreads across a brand's ranges
# instead of taking the first N rows off the top of the sheet.
#
#   ALL   take the whole band. The loop stops when the series are
#         exhausted rather than when a number is reached, so the table
#         is the workbook's own band and the `desc` line reads
#         "N of N". This is what every live catalogue now carries.
#
#   0     REACHABILITY ONLY — and this is not "none". `chosen` is
#         pre-seeded from `forced_names` before the loop runs, so a
#         zero-budget table gets exactly the rows a seeded hull points
#         at and nothing else. It is how the factory packages, the
#         obsolete trailers and the obsolete half of the rigging kits
#         are scoped, and it is the standing policy of
#         FITMENT_RULES.md §5.7: import what the catalogue actually
#         names, not the whole library behind it. Those tables grow on
#         their own when the boat bands grow, which is exactly what
#         happened here.
#
#         §5.7 IS ABOUT FAN-OUT, AND IT STOPS AT A LIBRARY. Parts &
#         Accessories and Dealer Fit Packages were scoped this way too
#         and no longer are — both now carry their whole sheet. The
#         argument is written out at build_parts: a dealer reaches a
#         part by NAME, because a customer is at the desk asking for
#         it, not through a boat. The three bands that keep a 0 are
#         genuinely fan-out: a Haines factory package, an obsolete
#         trailer and an obsolete rigging kit are each reached through
#         the hull that names them and have no counter of their own.
#
#   a number   a deliberate sample. NOTHING USES ONE ANY MORE. Every
#         live band was capped at 12-40 while the seed was a curated
#         fraction of Northside's price file; the caps are lifted and
#         the numbers are kept in this comment only so that a person
#         reading a small table knows to look for a 0 rather than
#         suspecting a forgotten literal. The old values were:
#         boats — stacer 26 · stabicraft 30 · surtees 25 · jeanneau 24
#         · haines 12 · highfield 40 · formosa 26; trailers — redco 16
#         · nsmcustom 18 · gfab 14 · stacertrailers 14 · dunbier 16 ·
#         mackay 16 · bmt 12; motors — yamaha 26 · epropulsion 14.
#
# The three remaining zero-budget bands are deliberately NOT lifted,
# for the reason above: they are fan-out, and §5.7 holds there.
# SEED_AT_FULL_SCALE.md §4.3 priced lifting the other two at 2,879
# parts and 1,707 dealer-fit packages no seeded hull names; both were
# lifted, and the figures held — 2,948 and 1,777 rows now land.
# ============================================================
ALL = 10 ** 9

BOAT_BRANDS = [
    dict(key="stacer", name="Stacer", hdr=3, r0=4, r1=142, mode="series", budget=ALL),
    dict(key="stabicraft", name="Stabicraft", hdr=143, r0=144, r1=199, mode="series", budget=ALL),
    dict(key="surtees", name="Surtees", hdr=200, r0=201, r1=225, mode="series", budget=ALL),
    # JEANNEAU IS ONE BRAND. The workbook gives Merry Fisher and Cap Camarat
    # their own banner rows, but they are Jeanneau RANGES, not manufacturers —
    # so they are SERIES inside one Jeanneau table, not three tables. `spans`
    # lets a brand be assembled from several banner blocks, each contributing
    # its own header row and its own series name.
    dict(key="jeanneau", name="Jeanneau", hdr=226, mode="spans", budget=ALL,
         spans=[dict(hdr=226, r0=227, r1=232, series=""),
                dict(hdr=233, r0=234, r1=247, series="Merry Fisher"),
                dict(hdr=248, r0=249, r1=261, series="Cap Camarat")]),
    dict(key="haines", name="Haines Signature", hdr=262, r0=263, r1=277, mode="series", budget=ALL),
    dict(key="highfield", name="Highfield Inflatables", hdr=278, r0=281, r1=948, mode="hf", budget=ALL),
    dict(key="formosa", name="Formosa", hdr=955, r0=956, r1=1004, mode="flat", budget=ALL),
]
HF_SERIES = [("Coaster", "Coaster"), ("ADV", "Adventure"), ("SP", "Sport"), ("CL", "Classic"),
             ("PA", "Patrol"), ("UL", "Ultralite"), ("RU", "Roll-Up")]
SP560_ROWS = list(range(829, 836)) + list(range(837, 845))


def strip_brand(label, brand):
    m = re.match(r"^\s*(.+?)\s+-\s+(.*)$", label)
    if m:
        head = m.group(1).strip().lower().replace(" ", "")
        if head in brand.lower().replace(" ", "") or brand.lower().replace(" ", "").startswith(head[:6]):
            return m.group(2).strip()
    return label.strip()


def hf_parts(name):
    body = name.split(" - ", 1)[1] if " - " in name else name
    m = re.match(r"^(\S+)\s*(?:\((\w+)\))?\s*(.*)$", body.strip())
    token = m.group(1) if m else body
    material = m.group(2) if m and m.group(2) else None
    colour = m.group(3).strip() if m and m.group(3) else None
    series = next((s for p, s in HF_SERIES if token.startswith(p)), None)
    return series, token, (" ".join(x for x in [material, colour] if x) or None)


def build_boats():
    tables, sel_by_brand = [], {}
    for b in BOAT_BRANDS:
        hdr = BHDR[str(b["hdr"])]
        skus, series_of, cur = [], {}, None

        # A brand assembled from several banner blocks (Jeanneau): each span
        # carries its own header row, and the span's name IS the series.
        # Later spans' labels win where they name a column the first did not,
        # so the merged table still speaks each range's own vocabulary.
        spanned = b["mode"] == "spans"
        if spanned:
            for sp in b["spans"]:
                spanhdr = BHDR[str(sp["hdr"])]
                for L, lab in spanhdr.items():
                    if lab and not hdr.get(L):
                        hdr[L] = lab
                for r in range(sp["r0"], sp["r1"] + 1):
                    v = BDATA.get(r)
                    if not v or not v.get("D"):
                        continue
                    skus.append(r)
                    series_of[r] = sp["series"]
            # downstream reads it as an ordinary series brand spanning the
            # whole block; the row scan below is already done
            b = {**b, "mode": "series",
                 "r0": b["spans"][0]["r0"], "r1": b["spans"][-1]["r1"]}

        for r in ([] if spanned else range(b["r0"], b["r1"] + 1)):
            v = BDATA.get(r)
            if not v:
                continue
            if b["mode"] == "hf":
                if not v.get("D"):
                    continue
                cur = hf_parts(str(v["C"]))[0]
            elif not v.get("D"):
                if b["mode"] == "series":
                    cur = strip_brand(norm(v["C"]), b["name"])
                continue
            skus.append(r)
            series_of[r] = cur
        groups = {}
        for r in skus:
            groups.setdefault(series_of[r] or "", []).append(r)
        chosen = set(SP560_ROWS) & set(skus) if b["mode"] == "hf" else set()
        i = 0
        while len(chosen) < b["budget"] and any(len(v) > i for v in groups.values()):
            for g in groups.values():
                if i < len(g) and len(chosen) < b["budget"]:
                    chosen.add(g[i])
            i += 1
        sel = sorted(chosen)
        sel_by_brand[b["key"]] = sel

        cols, sections = [], []
        for sid, sname, letters in BOAT_BANDS:
            band = []
            for L in letters:
                vals = [BDATA[r][L] for r in sel if L in BDATA[r]]
                own = hdr.get(L)
                label = own or BROW1.get(L)
                if L == "C":
                    label = "Boat" if b["mode"] == "hf" else "Model"
                    own = norm(hdr.get("C", ""))
                if L == "E":
                    label, own = "Matrix", "Matrix"
                if not label:
                    continue
                if L == "F":
                    vals = [v for v in vals if not is_quarantined(v) and norm(v)]
                    if not vals:
                        continue
                    band.append(dict(k="f", n=label, t="image", s=sid, L="F",
                                     d=f"Boat Module!F — one marketing photo per record. Empty and #N/A cells stay empty."))
                    continue
                c = make_col(L.lower(), label, L, vals, sid, "Boat Module", b["hdr"], own, b["name"],
                             force="text" if L == "D" else None)
                if c:
                    band.append(c)
            if band:
                sections.append((sid, sname))
                cols += band

        if b["mode"] == "hf":
            lvl = [dict(k="series", n="Series", t="text", s="identity", d="Recovered from the model-code token prefix in Boat Module!C (SP=Sport, CL=Classic, PA=Patrol, UL=Ultralite, RU=Roll-Up, ADV=Adventure, Coaster). The live 2026 block carries no series rows."),
                   dict(k="model", n="Model", t="text", s="identity", d="The model token inside Boat Module!C. The live block lost its model rows; this is how a human reads it back."),
                   dict(k="variant", n="Variant", t="text", s="identity", d="Material × colourway, read out of Boat Module!C. Highfield is the only brand that splits this far.")]
            levels = ["series", "model", "variant"]
        elif b["mode"] == "series":
            lvl = [dict(k="series", n="Series", t="text", s="identity", d="The series banner above each run — a Boat Module!C cell whose Boat Module!D (Model Code) is empty. The brand prefix is stripped.")]
            levels = ["series", "c"]
        else:
            lvl, levels = [], []
        cols = lvl + cols

        rows = []
        for r in sel:
            v = BDATA[r]
            row = {}
            if b["mode"] == "hf":
                s, tok, var = hf_parts(norm(v["C"]))
                row.update(series=s, model=tok, variant=var)
            elif b["mode"] == "series":
                row["series"] = series_of[r]
            for c in cols:
                if "L" not in c:
                    continue
                raw = v.get(c["L"])
                if c["t"] == "image":
                    row[c["k"]] = norm(raw) if raw and not is_quarantined(raw) else None
                else:
                    row[c["k"]] = coerce(raw, c["prof"])
            row["src"] = f"Boat Module!R{r}"
            rows.append(row)

        cols.append(dict(k="src", n="Source", t="text", s="source", d="Workbook sheet and row this record was read from."))
        sections.append(("source", "Source"))
        for c in cols:
            c.pop("prof", None)
            c.pop("L", None)

        tables.append(dict(key="boat_" + b["key"], name=b["name"], kind="boat", role="base",
                           accent="blue", levels=levels, sections=sections, cols=cols, rows=rows,
                           keycol="c", display="c",
                           desc=f"Boat Module (5).xlsx · sheet “Boat Module”, rows {b['r0']}–{b['r1']} under the "
                                f"{'yellow brand banner' if b['hdr'] != 955 else 'FORMOSA banner'} at row {b['hdr']}. "
                                f"Its columns are read from THAT row, not row 1 — the same physical column means a "
                                f"different thing for every brand. {len(rows)} of {len(skus)} SKUs seeded."))
    return tables, sel_by_brand


# ============================================================ TRAILERS
T_BANDS = [
    ("identity", "Identity & Spec", ["C", "D", "E", "G", "H", "I", "J", "K", "L", "M", "N", "O"]),
    ("trailer-pricing", "Pricing", ["AN", "AO", "AP", "AQ", "AR", "AS"]),
    ("margin", "Margin", ["BS", "BT", "BV", "BW"]),
    ("registration", "Registration", ["BY", "BZ", "CA"]),
]
T_BRANDS = [
    dict(key="redco", name="REDCO / Tinka Trailers", r0=4, r1=85, budget=ALL),
    dict(key="nsmcustom", name="NSM Custom Trailers", r0=87, r1=184, budget=ALL),
    dict(key="gfab", name="GFAB Trailers", r0=186, r1=231, budget=ALL),
    dict(key="stacertrailers", name="Stacer Trailers", r0=232, r1=280, budget=ALL),
    dict(key="dunbier", name="Dunbier Trailers", r0=281, r1=454, budget=ALL),
    dict(key="mackay", name="Mackay Trailers", r0=455, r1=625, budget=ALL),
    dict(key="bmt", name="Dunbier / Haines BMT Trailers", r0=626, r1=655, budget=ALL),
    # A6's TWIN. Trailer Module!A656 reads "OBSOLETE" and C656 "OBSOLETE
    # TRAILERS - Trailers No Longer Available" at 14pt bold — the same divider
    # mechanism the Boat Module uses at row 1005, asserted the same way. These
    # trailers are seeded ONLY because live boat rows still point at them: 30
    # live pairings land below this divider and every one of them is Surtees,
    # 8 in the Std Trailer slot. Dropping them would hide the defect; showing
    # them unmarked would sell it (FITMENT_RULES.md F5, §5.2, Appendix B.1).
    dict(key="obsolete", name="OBSOLETE Trailers — No Longer Available", r0=656, r1=700, budget=0,
         obsolete=True),
]

DISC_TRAILER_D = (
    "No longer sold. TRUE on every row of this table, and it is not a judgement: "
    "Trailer Module!A656 reads “OBSOLETE” and C656 “OBSOLETE TRAILERS - Trailers No Longer "
    "Available” at 14pt bold — the same divider mechanism the Boat Module uses at row 1005 "
    "(FITMENT_RULES.md F5). Every row below it is history. The rows are KEPT because 30 live "
    "pairings still point at them and an old quote written against one has to stay readable; "
    "the flag is what stops any surface a customer sees from offering one. A dealer who brings "
    "a model back does it by clearing this cell.")
RETIRED_TRAILER_D = (
    "A table that is history rather than stock — model.ts `EntityDef.retired`. Every row below "
    "Trailer Module!A656 is here and nothing else is, so the whole table is the obsolete band. "
    "It survives so an old document still resolves; nothing customer-facing offers it.")


def build_trailers(forced_names):
    tables = []
    for b in T_BRANDS:
        rows_all, series_of, cur = [], {}, None
        for r in range(b["r0"], b["r1"] + 1):
            v = TDATA.get(r)
            if not v or not v.get("C"):
                continue
            st = TSTYLE.get(r, {})
            sz = st.get("sz") or 0
            if not v.get("E"):
                if sz >= 12:
                    cur = norm(v["C"])
                continue
            if sz >= 14:
                cur = norm(v["C"])
                continue
            rows_all.append(r)
            series_of[r] = cur
        groups = {}
        for r in rows_all:
            groups.setdefault(series_of[r] or "", []).append(r)
        chosen = {r for r in rows_all if norm(TDATA[r]["C"]) in forced_names}
        i = 0
        while len(chosen) < b["budget"] and any(len(v) > i for v in groups.values()):
            for g in groups.values():
                if i < len(g) and len(chosen) < b["budget"]:
                    chosen.add(g[i])
            i += 1
        sel = sorted(chosen)

        cols, sections = [], []
        for sid, sname, letters in T_BANDS:
            band = []
            for L in letters:
                vals = [TDATA[r][L] for r in sel if L in TDATA[r]]
                label = THDR.get(L)
                if not label:
                    continue
                if L == "C":
                    label = "Trailer"
                if L == "G":
                    vals = [v for v in vals if not is_quarantined(v) and norm(v)]
                    if not vals:
                        continue
                    band.append(dict(k="g", n="Image Link", t="image", s=sid, L="G",
                                     d="Trailer Module!G — one photo per trailer."))
                    continue
                c = make_col(L.lower(), label, L, vals, sid, "Trailer Module", 1, label, b["name"],
                             force="text" if L == "E" else None)
                if c:
                    band.append(c)
            if band:
                sections.append((sid, sname))
                cols += band
        cols = [dict(k="series", n="Series", t="text", s="identity",
                     d="The series banner above each run — column C at 12–13 pt bold. Hierarchy in this workbook is encoded in the FONT SIZE of column C, nowhere else.")] + cols

        rows = []
        for r in sel:
            v = TDATA[r]
            row = {"series": series_of[r]}
            for c in cols:
                if "L" not in c:
                    continue
                raw = v.get(c["L"])
                row[c["k"]] = norm(raw) if c["t"] == "image" and raw and not is_quarantined(raw) else (
                    None if c["t"] == "image" else coerce(raw, c["prof"]))
            row["src"] = f"Trailer Module!R{r}"
            rows.append(row)
        cols.append(dict(k="src", n="Source", t="text", s="source", d="Workbook sheet and row this record was read from."))
        sections.append(("source", "Source"))
        if b.get("obsolete"):
            disc_after(cols, "c", DISC_TRAILER_D)
            for row in rows:
                row[DISC_K] = True
        for c in cols:
            c.pop("prof", None)
            c.pop("L", None)

        tables.append(dict(key="trl_" + b["key"], name=b["name"], kind="trailer", role="base",
                           **({"retired": True} if b.get("obsolete") else {}),
                           accent="ochre", levels=["series", "c"], sections=sections, cols=cols,
                           rows=rows, keycol="c", display="c",
                           desc=f"Trailer Module.xlsx · sheet “Trailer Module”, rows {b['r0']}–{b['r1']}. "
                                f"Membership of this block is the ROW BAND and nothing else. This description used to "
                                f"credit the hidden Dropdowns sheet, and that was wrong twice over: the code has always "
                                f"read the band, and the Dropdowns sheet does not cover the sheet — 88 of 476 trailer "
                                f"rows (18.5%) appear in no brand column there, 55 of them in live use, including the "
                                f"whole REDCO - Formosa series and all of DUNBIER / HAINES BMT. Within a band, hierarchy "
                                f"is encoded in the FONT SIZE of column C and nowhere else: 14pt bold opens a series, "
                                f"12–13pt a sub-series (FITMENT_RULES.md §7.6). {len(rows)} of {len(rows_all)} trailers seeded."
                                + (" " + RETIRED_TRAILER_D if b.get("obsolete") else "")))
    return tables


# ============================================================ MOTORS
M_BANDS = [
    ("identity", "Identity & Spec", ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "N", "O", "Q"]),
    ("cost-ladder", "Cost Ladder", ["R", "X", "AA"]),
    ("pre-delivery", "PRE DELIVERY CHARGES", ["AC", "AV"]),
    ("retail", "Retail Pricing", ["AX", "BB", "BF"]),
    ("trade", "Trade Pricing", ["BL"]),
    ("bundled", "Bundled Accessories", ["FF", "FG", "FI"]),
]
M_BRANDS = [
    dict(key="yamaha", name="Yamaha Outboards", r0=5, r1=293, budget=ALL, supplier="Yamaha"),
    dict(key="epropulsion", name="ePropulsion Outboards", r0=294, r1=341, budget=ALL,
         supplier="EPROPULSION - Electric Outboards"),
    # THESE TWO ARE NOT MOTOR TABLES, and the kind says so. Their rows are
    # boat+engine bundles — "SIG 620BRX w Yamaha - F200XSA2 (White)",
    # "MF895 S2 with Yamaha 2X200 XCB DBW (Grey)" — that live in the Motor
    # Library and are not motors. They are the 52 shaft-rule exceptions and the
    # 27 duplicate Motor Library display names, and putting them in
    # mot_yamaha would corrupt both (FITMENT_RULES.md §1.5, §5.1 J7/J8).
    #
    # They are selected by SUPPLIER, not by a row range, because the workbook
    # does not keep them in one: Haines Signature runs 343-391, 476-508 and
    # 573-584. Motor Library!Q is the assertion, and it also identifies the
    # banner rows — a package carries a Supplier, a banner does not.
    dict(key="pkg_haines", name="Haines Signature Factory Packages", kind="package",
         by="supplier", supplier="Haines Signature", budget=0),
    dict(key="pkg_jeanneau", name="Jeanneau Factory Packages", kind="package",
         by="supplier", supplier="Jeanneau", budget=0),
]


def build_motors(forced_names):
    tables = []
    for b in M_BRANDS:
        rows_all, series_of, cur = [], {}, None
        if b.get("by") == "supplier":
            for r in sorted(MDATA):
                v = MDATA[r]
                if r < 5 or not v.get("C"):
                    continue
                if not v.get("Q"):
                    cur = norm(v["C"])          # "Powerplants - Merry Fisher" &c
                    continue
                if norm(v["Q"]) != b["supplier"]:
                    continue
                rows_all.append(r)
                series_of[r] = cur
        else:
            for r in range(b["r0"], b["r1"] + 1):
                v = MDATA.get(r)
                if not v or not v.get("C"):
                    continue
                if not v.get("D"):
                    cur = norm(v["C"])
                    continue
                rows_all.append(r)
                series_of[r] = cur
        groups = {}
        for r in rows_all:
            groups.setdefault(series_of[r] or "", []).append(r)
        chosen = {r for r in rows_all if norm(MDATA[r]["C"]) in forced_names}
        i = 0
        while len(chosen) < b["budget"] and any(len(v) > i for v in groups.values()):
            for g in groups.values():
                if i < len(g) and len(chosen) < b["budget"]:
                    chosen.add(g[i])
            i += 1
        sel = sorted(chosen)

        cols, sections = [], []
        for sid, sname, letters in M_BANDS:
            band = []
            for L in letters:
                vals = [MDATA[r][L] for r in sel if L in MDATA[r]]
                label = norm(MHDR.get(L, "")) or None
                if not label:
                    continue
                if L == "C":
                    label = "Motor"
                if L == "D":
                    label = "Model Code"
                if L == "I":
                    vals = [v for v in vals if not is_quarantined(v) and norm(v)]
                    if not vals:
                        continue
                    band.append(dict(k="i", n="Image Link", t="image", s=sid, L="I",
                                     d="Motor Library!I — one photo per motor."))
                    continue
                c = make_col(L.lower(), label, L, vals, sid, "Motor Library", 4, label, b["name"],
                             force="text" if L == "D" else None)
                if c:
                    band.append(c)
            if band:
                sections.append((sid, sname))
                cols += band
        cols = [dict(k="series", n="Series", t="text", s="identity",
                     d="The banner rows in Motor Library!C — the only place a motor family is written down. There is no Series column in this workbook.")] + cols

        rows = []
        for r in sel:
            v = MDATA[r]
            row = {"series": series_of[r]}
            for c in cols:
                if "L" not in c:
                    continue
                raw = v.get(c["L"])
                row[c["k"]] = norm(raw) if c["t"] == "image" and raw and not is_quarantined(raw) else (
                    None if c["t"] == "image" else coerce(raw, c["prof"]))
            row["src"] = f"Motor Library!R{r}"
            rows.append(row)
        cols.append(dict(k="src", n="Source", t="text", s="source", d="Workbook sheet and row this record was read from."))
        sections.append(("source", "Source"))
        for c in cols:
            c.pop("prof", None)
            c.pop("L", None)

        if b.get("by") == "supplier":
            where = (f"rows selected by Motor Library!Q Supplier = “{b['supplier']}”, which spans "
                     f"{min(rows_all)}–{max(rows_all)} in three discontinuous blocks — the workbook does not "
                     f"keep them together, so a row range would be a guess. ")
            what = (f"These are NOT motors. Every row is a boat sold WITH an engine, and they sit in the Motor "
                    f"Library only because the boat row's motor slot is where the business types them. They are "
                    f"the reason Motor Library!C has 27 duplicate names and the reason the shaft-length rule "
                    f"has 52 exceptions — a bundle has no single shaft. Kept as their own table so neither fact "
                    f"contaminates the real motors (FITMENT_RULES.md §1.3, §1.5, §5.1). ")
        else:
            where = f"rows {b['r0']}–{b['r1']}. "
            # "209 of 209 seeded" IS TRUE OF THE BAND AND READS AS COMPLETE.
            # It is not complete. This band is selected by a ROW RANGE while
            # the sheet's own answer to "is this a Yamaha" is Motor Library!Q,
            # the Supplier column — the same column the two package tables above
            # are selected BY, and for the reason stated there: the workbook does
            # not keep a supplier's rows together. Yamaha's run to R564 and
            # ePropulsion's to R589, past the end of both bands.
            #
            # While every band was capped this was invisible — "83 of 209" told
            # a reader the table was a sample and they went looking. Lifting the
            # cap is what makes the sentence dangerous, so the sentence now
            # measures the gap instead of hiding behind the band.
            #
            # NOT SILENTLY FIXED BY SWITCHING TO `by="supplier"`. That would
            # change which rows the fitment joins resolve against, and the
            # Motor Library carries 27 duplicate display names whose ownership
            # between these tables and the two package tables is what
            # gen_all's own partner-claim assertion protects (FITMENT_RULES.md
            # §1.5, §5.1 J7/J8). It is a research question with a measured
            # cost, recorded at SEED_AT_FULL_SCALE.md §1.5 and §6, not a knob.
            sup = b.get("supplier")
            outside = sorted(r for r, v in MDATA.items()
                             if v.get("Q") and norm(v["Q"]) == sup and not (b["r0"] <= r <= b["r1"]))
            named = [r for r in outside if norm(MDATA[r].get("C") or "") in forced_names]
            what = ""
            if outside:
                what = (f"SELECTED BY THE ROW BAND, NOT BY Motor Library!Q. {len(rows_all) + len(outside)} rows "
                        f"carry Supplier “{sup}” and {len(outside)} of them "
                        f"({', '.join('R' + str(r) for r in outside[:6])}"
                        f"{' …' if len(outside) > 6 else ''}) fall outside rows {b['r0']}–{b['r1']} and are NOT "
                        f"in this table. ")
                if named:
                    what += (f"{len(named)} of those "
                             f"({', '.join('R' + str(r) + ' “' + norm(MDATA[r]['C']) + '”' for r in named)}) "
                             f"are named by a live boat row, so those fitment edges do not resolve and the "
                             f"pairing is absent rather than wrong. ")
                what += ("The band is what the generator has always read and changing it moves which rows the "
                         "fitment joins resolve against, so it is recorded rather than quietly altered "
                         "(SEED_AT_FULL_SCALE.md §1.5). ")
        tables.append(dict(key="mot_" + b["key"], name=b["name"], kind=b.get("kind", "motor"), role="base",
                           accent="carmine", levels=["series", "c"], sections=sections, cols=cols,
                           rows=rows, keycol="c", display="c",
                           desc=f"Motor Module · sheet “Motor Library” (header row 4), {where}"
                                f"{what}"
                                f"Motor Library!C is the primary key of the whole Master Price File — every other "
                                f"workbook joins on this display name as free text. {len(rows)} of "
                                f"{len(rows_all)} seeded"
                                f"{' — every row of the band above' if b.get('by') != 'supplier' and len(rows) == len(rows_all) else ''}"
                                f"."
                                # A ZERO BUDGET IS A POLICY AND HAS TO SAY SO.
                                # "39 of 85 seeded" with nothing after it reads
                                # like a sample somebody forgot to finish. It is
                                # not: these tables take exactly the rows a
                                # seeded hull names and no others, which is
                                # FITMENT_RULES.md §5.7. Written from the budget
                                # rather than typed, so it can only appear on a
                                # table that really is scoped that way.
                                + (f" The other {len(rows_all) - len(rows)} are absent BY REACHABILITY, not by "
                                   f"sampling: this table takes exactly the rows a seeded hull's motor slot "
                                   f"names and no others (FITMENT_RULES.md §5.7). A bundle nothing points at "
                                   f"has nothing in this set to belong to; seed the hull and it arrives."
                                   if b["budget"] == 0 and len(rows) < len(rows_all) else "")))
    return tables


# ============================================================ PARTS
P_BANDS = [
    ("identity", "Identity", ["C", "D", "E"]),
    ("supply", "Supply Pricing", ["G", "I", "J", "L", "M"]),
    ("fitted", "Fitted Pricing", ["N", "O", "P", "S", "Y"]),
    ("operations", "Operations", ["AA"]),
]
# A THIRD instance of the same divider, found by looking for it rather than by
# assuming the Boat and Trailer modules were the only two.
# `Parts Maintenance!C2918 = 'OBSOLETE PARTS (NB: Parts No Longer Available or
# Used)'`. Everything below it is history, and the sheet says so twice: the code
# in column E on those rows carries the suffix `(NB: Obsolete)` as well.
PARTS_OBSOLETE_ROW = 2918
DISC_PARTS_D = (
    "No longer sold. Read from the row band below Parts Maintenance!C2918 “OBSOLETE PARTS (NB: "
    "Parts No Longer Available or Used)” — the same divider mechanism as Boat Module!A1005 and "
    "Trailer Module!A656, found in a third library. The sheet asserts it twice on the row that "
    "carries it here: Parts Maintenance!E3390 reads “90794-46909 (NB: Obsolete)”. The row is "
    "kept because a live Merry Fisher hull still names this part in its P/D band; the flag is "
    "what stops a customer-facing surface offering it.")

# ------------------------------------------------------------ A LIBRARY IS
# NOT FAN-OUT, AND THIS TABLE USED TO BE SCOPED AS IF IT WERE.
#
# It carried 69 rows of 2,948: six categories at five rows each, plus every
# part a seeded hull names. That was FITMENT_RULES.md §5.7 — "import what the
# catalogue actually names" — applied to a LIBRARY, and §5.7 is a rule about
# FAN-OUT: which rows a boat row's P/D band points at. A parts counter is not
# fan-out. Nobody reaches a bilge pump through a hull; they look it up because
# a customer is at the desk asking for one. A parts manager who opened their
# own register and found 69 of their 2,948 rows would conclude the app had
# lost their data, and they would be right to.
#
# So the shortlist is gone and the sheet is carried whole. The six categories
# it used to name are still the ones the single-valued boat columns reach
# (Standard Safety Gear, PFD Type, Anchor Kit, Tie Downs, decals, nav lights)
# and the P/D band at Boat Module!JT..KC reaches fifteen more; none of that is
# a selector any more. `forced_names` stays, demoted from SELECTOR to
# ASSERTION: every part a seeded hull names must be present, and a whole-sheet
# import that somehow dropped one is a build failure rather than a quiet
# dropped join row.
#
# NOTHING IS EXCLUDED. The 699 rows below the OBSOLETE PARTS divider are here
# too, flagged, for the reason the divider exists — see DISC_PARTS_D.


def build_parts(forced_names):
    # THE SHEET REPRINTS ITS OWN HEADER ELEVEN TIMES, and until this table
    # carried the whole library nothing had ever read far enough down to meet
    # one. Parts Maintenance!R2373, 2411, 2447, 2488, 2500, 2680, 2695, 2756,
    # 2887, 2900 and 2904 each put a category name in C and then re-type the
    # master row-1 labels across the row — D "Supplier", E "Code", I "CTD",
    # J "MU", L "Sell". The "C filled, E empty" banner rule reads them as PARTS,
    # which is wrong twice: eleven header rows land in the register as products,
    # and the eleven categories they announce never open, so their contents file
    # under whatever banner came before.
    #
    # ASSERTED, NOT SNIFFED. A row is a reprinted header when D AND E both hold
    # the master labels verbatim. Both, because either alone could be a part
    # (nothing stops a supplier being called "Supplier"); together they are the
    # header. Verified against the extract: eleven rows match, all eleven carry
    # a category in C, none is a product. It also puts columns G, I, J and L
    # back to numbers — those eleven cells were the only non-numeric values in
    # three of them.
    hdr_d, hdr_e = norm(PHDR.get("D", "")), norm(PHDR.get("E", ""))

    def reprinted_header(v):
        return norm(v.get("D") or "") == hdr_d and norm(v.get("E") or "") == hdr_e

    cats, cur = {}, None
    for r in sorted(PDATA):
        if r <= 2:
            continue
        v = PDATA[r]
        if not v.get("C"):
            continue
        if not v.get("E") or reprinted_header(v):
            # A BARE "." IS A SPACER, NOT A CATEGORY. The sheet types one to
            # break up a long run; four of its 217 banner rows are one. Every
            # other cell in this seed runs it through gen_lib.SENTINEL_EXACT
            # and comes out EMPTY, and the file's own opening promise says so,
            # so it comes out empty here too. The 25 rows under a spacer file
            # into the register's designed "(unassigned)" drawer
            # (table/grouping.ts UNASSIGNED_LABEL) instead of a drawer named
            # ".". It is the same act as not inventing one for them.
            cur = None if is_sentinel(v["C"]) else norm(v["C"])
            continue
        cats.setdefault(cur, []).append(r)
    sel = sorted(r for rows in cats.values() for r in rows)
    cat_of = {r: cat for cat, rows in cats.items() for r in rows}
    # `forced_names` is no longer a SELECTOR. What is left of it is a fact
    # worth reporting: how many of the parts the seeded hulls name resolve to a
    # row in this sheet. A whole-sheet import cannot drop one, so a shortfall
    # here is the workbook pointing at something it does not carry — which is
    # the dealer's to fix and this seed's to state, not to hide.
    unresolved = sorted(forced_names - {norm(PDATA[r]["C"]) for r in sel})

    cols, sections = [], []
    for sid, sname, letters in P_BANDS:
        band = []
        for L in letters:
            vals = [PDATA[r][L] for r in sel if L in PDATA[r]]
            label = norm(PHDR.get(L, "")) or None
            if not label:
                continue
            if L == "C":
                label = "Product"
            c = make_col(L.lower(), label, L, vals, sid, "Parts Maintenance", 1, label, "Parts",
                         force="text" if L in ("E", "AA") else None)
            if c:
                band.append(c)
        if band:
            sections.append((sid, sname))
            cols += band
    cols = [dict(k="cat", n="Category", t="text", s="identity",
                 d="The banner ROW above each run in Parts Maintenance!C — a row with C filled and E (Code) empty. The category is not a field in this workbook.")] + cols

    rows = []
    for r in sel:
        v = PDATA[r]
        row = {"cat": cat_of.get(r)}
        for c in cols:
            if "L" not in c:
                continue
            row[c["k"]] = coerce(v.get(c["L"]), c["prof"])
        row[DISC_K] = r > PARTS_OBSOLETE_ROW
        row["src"] = f"Parts Maintenance!R{r}"
        rows.append(row)
    cols.append(dict(k="src", n="Source", t="text", s="source", d="Workbook sheet and row this record was read from."))
    sections.append(("source", "Source"))
    disc_after(cols, "c", DISC_PARTS_D)
    for c in cols:
        c.pop("prof", None)
        c.pop("L", None)

    ndisc = sum(1 for r in rows if r[DISC_K])
    # Counted, not quoted. The desc used to carry a literal "216 category
    # banners"; SEED_AT_FULL_SCALE.md §2.1 counts 217 from the same extract.
    # Neither is worth defending by hand, and neither is what a reader wants:
    # `nbanner` is banner ROWS (a category can be banner'd more than once) and
    # the keys of `cats` are DISTINCT categories. Both are counted from the
    # index this function just built, so the sentence reports what this run
    # actually saw — which is now the whole sheet.
    nbanner = sum(1 for r in sorted(PDATA) if r > 2 and PDATA[r].get("C") and not PDATA[r].get("E"))
    spacers = {}
    for r in sorted(PDATA):
        v = PDATA[r]
        if r > 2 and v.get("C") and not v.get("E") and is_sentinel(v["C"]):
            k = norm(v["C"])
            spacers[k] = spacers.get(k, 0) + 1
    nspacer = sum(spacers.values())
    spacer_names = ", ".join(f"“{k}”×{n}" if n > 1 else f"“{k}”"
                             for k, n in sorted(spacers.items(), key=lambda kv: (-kv[1], kv[0])))
    ncat = len([c for c in cats if c is not None])
    nloose = len(cats.get(None, []))
    nforced = len(forced_names)
    return [dict(key="parts", name="Parts & Accessories", kind="accessory", role="base",
                 accent="viridian", levels=["cat", "c"], sections=sections, cols=cols, rows=rows,
                 keycol="c", display="c",
                 desc=f"Parts Module (3).xlsx · sheet “Parts Maintenance”. Category is a banner ROW, never a field: "
                      f"everything under a banner belongs to it until the next one. THE WHOLE LIBRARY IS HERE — "
                      f"{len(rows)} of the {len(rows)} parts the sheet carries, across all {ncat} categories it "
                      f"names ({nbanner} banner rows carry them, because a category can be banner’d more than "
                      f"once). Nothing is sampled and nothing is left out. "
                      f"This table used to hold 69 rows: six categories at five rows each plus whatever a seeded "
                      f"hull named. That was the fan-out policy of FITMENT_RULES.md §5.7 applied to a library, and "
                      f"a library is not fan-out — a dealer looks a part up by name because a customer is asking "
                      f"for it, not through a boat. The {nforced} parts the seeded hulls DO name, in their "
                      f"single-valued columns (Standard Safety Gear, PFD Type, Anchor Kit, Tie Downs) and in the "
                      f"ten-slot P/D band at Boat Module!JT..KC, are no longer what selects this table; they "
                      f"are checked against it, and "
                      + (f"all {nforced} resolve to a row here. " if not unresolved else
                         f"{nforced - len(unresolved)} of {nforced} resolve to a row here — "
                         f"{len(unresolved)} name{'s' if len(unresolved) != 1 else ''} nothing this sheet "
                         f"carries, which the old selector dropped in silence. ")
                      + f"Boat Module!JT..KC resolves into THIS "
                      f"sheet’s column C at 99.59% over all 5,918 populated cells. "
                      f"{ndisc} {'row sits' if ndisc == 1 else 'rows sit'} below the "
                      f"OBSOLETE PARTS divider at C{PARTS_OBSOLETE_ROW} and "
                      f"{'is' if ndisc == 1 else 'are'} marked Discontinued — kept, because old quotes were "
                      f"written against them and a live hull still names some of them, and never offered. "
                      f"{nloose} {'row carries' if nloose == 1 else 'rows carry'} no category: the sheet files "
                      f"{'it' if nloose == 1 else 'them'} under one of its {nspacer} SPACER banners — "
                      f"{spacer_names} — which are the sentinels this seed reads as EMPTY everywhere else, so "
                      f"{'it lands' if nloose == 1 else 'they land'} in the register’s (unassigned) drawer "
                      f"rather than one invented for {'it' if nloose == 1 else 'them'}.")]


# ============================================================ DEALER FIT
# FITMENT_RULES.md R3 — the largest unbuilt relationship in the workbook, and
# the cheapest large win. The boat row's 42-line dealer-fit band resolves into
# THIS sheet at 99.4% and into Parts Maintenance at 38.8%. They are two
# different libraries; merging them would mis-resolve three pairs in five.
DF_BANDS = [
    ("identity", "Identity", ["C", "D"]),
    ("supply", "Supply Pricing", ["E", "H", "I"]),
    ("rigging", "Labour & Sundries", ["J", "K", "L", "M", "N"]),
    ("fitted", "Fitted Pricing", ["O", "P", "Q", "R"]),
    ("bundled", "Primary Accessory", ["T", "U", "V", "W", "X", "Y"]),
]


# A FIFTH INSTANCE OF THE SAME DIVIDER, and it was not being read because
# nothing below it was ever selected. `Dealer Fit Module!C2032` reads
# "### OBSELETE MODEL LIST ### - NB: DFO’s / Units no longer in production"
# — the dealer’s own spelling, kept. Everything under it is history. The row
# number is FOUND rather than typed, by the assertion in the banner’s own text,
# and the generator fails if the sheet stops carrying exactly one of them.
DISC_DEALER_D = (
    "No longer in production. Read from the row band below the banner at Dealer Fit Module!C2032, "
    "“### OBSELETE MODEL LIST ### - NB: DFO’s / Units no longer in production” — the same divider "
    "mechanism as Boat Module!A1005, Trailer Module!A656, Parts Maintenance!C2918 and Rigging "
    "Kits!C829, found in a fifth library. The rows are kept because quotes were written against "
    "them; the flag is what stops a customer-facing surface offering them.")


def build_dealer_fit(forced_names):
    """The whole Dealer Fit Module, obsolete band included and flagged."""
    cats, cur, all_rows, obs_row = {}, None, [], None
    for r in sorted(DFDATA):
        if r < 12:
            continue
        v = DFDATA[r]
        if not v.get("C"):
            continue
        # Same convention as Parts Maintenance: a row with a description and no
        # Code is a CATEGORY BANNER ("TUBE COVER OPTIONS - To suit Highfield
        # Boats", "JEANNEAU SPECIFIC OPTIONS"). The category is a row, never a
        # field. And, exactly as in Parts Maintenance, a bare "." is a SPACER
        # and not a category — read as EMPTY here for the same reason it is read
        # as empty in every other cell of this seed.
        if not v.get("D"):
            label = norm(v["C"])
            if "OBSELETE MODEL LIST" in label.upper() or "OBSOLETE MODEL LIST" in label.upper():
                assert obs_row is None, "two obsolete dividers in Dealer Fit Module"
                obs_row = r
            cur = None if is_sentinel(v["C"]) else label
            continue
        cats.setdefault(cur, []).append(r)
        all_rows.append(r)
    assert obs_row is not None, "no obsolete divider found in Dealer Fit Module"
    cat_of = {r: cat for cat, rows in cats.items() for r in rows}
    # THE WHOLE SHEET. This used to be `{r for r in all_rows if the name is in
    # forced_names}` — 70 rows of 1,777 — and the argument against that is the
    # argument made at build_parts: a dealer-fit package is looked up, not
    # reached through a hull. `forced_names` is now an ASSERTION.
    sel = sorted(all_rows)
    # Same demotion as build_parts, and here it earns its keep: two of the
    # names the boat rows point at ("Engine Flush Kit t/s Merry Fisher Well
    # (Twin Motor Installations)", "Lewmar AA150 Chain Counter in Dash w 10mtr
    # Sensor Cable (Jeanneau Installations)") exist in NO row of this sheet.
    # The old selector intersected with the sheet and so dropped them in
    # silence. The whole-sheet import cannot drop anything, which leaves the
    # shortfall visible — counted here and stated in the desc.
    unresolved = sorted(forced_names - {norm(DFDATA[r]["C"]) for r in sel})

    cols, sections = [], []
    for sid, sname, letters in DF_BANDS:
        band = []
        for L in letters:
            vals = [DFDATA[r][L] for r in sel if L in DFDATA[r]]
            label = norm(DFHDR.get(L, "")) or None
            if not label:
                continue
            if L == "C":
                label = "Package"
            c = make_col(L.lower(), label, L, vals, sid, "Dealer Fit Module", 11, label, "Dealer Fit",
                         force="text" if L in ("D", "U") else None)
            if c:
                band.append(c)
        if band:
            sections.append((sid, sname))
            cols += band
    cols = [dict(k="cat", n="Category", t="text", s="identity",
                 d="The banner ROW above each run in Dealer Fit Module!C — a row with a description and "
                   "no Code. Same convention as Parts Maintenance; the category is not a field in this "
                   "workbook either.")] + cols

    rows = []
    for r in sel:
        v = DFDATA[r]
        row = {"cat": cat_of.get(r)}
        for c in cols:
            if "L" not in c:
                continue
            row[c["k"]] = coerce(v.get(c["L"]), c["prof"])
        row["src"] = f"Dealer Fit Module!R{r}"
        rows.append(row)
    cols.append(dict(k="src", n="Source", t="text", s="source", d="Workbook sheet and row this record was read from."))
    sections.append(("source", "Source"))
    disc_after(cols, "c", DISC_DEALER_D)
    for row, r in zip(rows, sel):
        row[DISC_K] = r > obs_row
    for c in cols:
        c.pop("prof", None)
        c.pop("L", None)

    ndisc = sum(1 for row in rows if row[DISC_K])
    ncat = len([c for c in cats if c is not None])
    nloose = len(cats.get(None, []))
    nforced = len(forced_names)
    nspacer = sum(1 for r in sorted(DFDATA)
                  if r >= 12 and DFDATA[r].get("C") and not DFDATA[r].get("D")
                  and is_sentinel(DFDATA[r]["C"]))
    nabove = min(cats.get(None, [0]))
    return [dict(key="dealer_fit", name="Dealer Fit Packages", kind="package", role="base",
                 accent="teal", levels=["cat", "c"], sections=sections, cols=cols, rows=rows,
                 keycol="c", display="c",
                 desc=f"Parts Module (3).xlsx · sheet “Dealer Fit Module” (header row 11), data from row 12. "
                      f"The relationship was read from Boat Module!OL..QA, headed “Additional Dealer Fit "
                      f"Options - Line 01..42”, and it is ASSERTED: 37 cells in Boat Module!OM are literally "
                      f"='[3]Dealer Fit Module'!$C$<row>. Those cells resolve into this sheet's column C at "
                      f"99.4% and into Parts Maintenance!C at 38.8%, which is why this is its own table and not "
                      f"folded into Parts & Accessories. THE WHOLE LIBRARY IS HERE — {len(rows)} of the "
                      f"{len(all_rows)} packages the sheet carries, across all {ncat} categories it names. "
                      f"It used to hold the 70 a seeded hull names and no others; that was the fan-out policy "
                      f"of FITMENT_RULES.md §5.7 applied to a library, and a dealer looks a package up by name "
                      f"rather than reaching it through a hull. The {nforced} the hulls DO name (R3, §5.3, "
                      f"§6.5) are no longer what selects it; they are checked against it, and "
                      + (f"all {nforced} resolve to a row here. " if not unresolved else
                         f"{nforced - len(unresolved)} of {nforced} resolve to a row here. The other "
                         f"{len(unresolved)} — “" + "”, “".join(unresolved) + "” — "
                         f"{'names' if len(unresolved) == 1 else 'name'} no row this sheet carries at all; "
                         f"the old selector intersected with the sheet and dropped "
                         f"{'it' if len(unresolved) == 1 else 'them'} without saying so. ") + 
                      f"{ndisc} {'row sits' if ndisc == 1 else 'rows sit'} below the obsolete divider at "
                      f"C{obs_row} and {'is' if ndisc == 1 else 'are'} marked Discontinued — kept, because "
                      f"quotes were written against them, and never offered. "
                      f"{nloose} {'row carries' if nloose == 1 else 'rows carry'} no category: the sheet opens "
                      f"with a run of them from row {nabove} above its first banner, and types a bare “.” as a "
                      f"spacer {nspacer} more {'time' if nspacer == 1 else 'times'} — the sentinel this seed reads "
                      f"as EMPTY everywhere else — so {'it lands' if nloose == 1 else 'they land'} in the "
                      f"register’s (unassigned) drawer rather than one invented for them.")]


# ============================================================ RIGGING KITS
# FOUR_MODULES.md §3. The eighth workbook, and the verdict on it is "A table,
# yes. A module, no": `rig_kits` gets a table id and NO dashboard card. Its only
# surfaces are the reference picker on the boat × motor pair and a Related block
# on the boat's and the motor's pages.
#
# WHY A TABLE AND NOT A COLUMN. The rigging kit belongs to the (boat, motor)
# PAIRING and to neither side alone — every single-sided selector loses:
# hull material 15.8%, motor brand 18.8%, HP band 26.0%, control type 26.1%,
# the whole motor 54.2%, motor + hull length 80.7% (§3.3). So the pair keeps the
# choice and this table holds what was chosen.
#
# WHY THE HAND-TYPED CELLS ARE NOT A DATA-QUALITY PROBLEM. 26,017 of 26,018 fan-
# out rigging cells resolve into Rigging Kits!C — 99.9962%, and 10,540 of 10,540
# over the live rows. A person re-keyed a row's full name correctly 25,265 times
# out of 25,266. That is a MECHANISM failure (a workbook cannot store a row
# pointer), which is why the fix here is a `reference` column and not a
# validation (§3.2).
#
# WHY IT CANNOT BE FOLDED INTO `parts`. Five product names collide across the two
# libraries (`Evo Dual Remote Controller`, `Evo Side Mount Controller`, `Evo
# Tiller Controller`, `Evo Top Mount Remote Controller`, `Not Available`). A
# reference into a merged table cannot tell which library a boat row meant, and a
# wrong pair is worse than a missing one (§3.6).
RIG_BANDS = [
    ("identity", "Identity", ["C", "D", "E"]),
    ("pricing", "Kit Pricing", ["F", "G", "H", "I", "J", "K", "L", "M", "BE"]),
    ("install", "Install", ["O", "P", "Q", "R", "S", "V", "W", "X"]),
    ("total", "Total", ["Z", "AC", "AD", "AE"]),
    ("contents", "Contents", ["AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AP"]),
    ("cable-options", "Cable Options",
     ["AT", "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC"]),
]
# Row 1 repeats a label four times across the Contents band and ten times across
# Cable Options. Row 2 disambiguates the cable slots ("Option 1".."Option 10");
# the Contents slots are numbered here the way §3.6 numbers them, because four
# columns all called "Parts & Accessories" is the untyped column soup this
# product exists to replace.
RIG_LABEL = {
    "AG": "Parts & Accessories 1", "AH": "Parts & Accessories 1 CTD",
    "AI": "Parts & Accessories 2", "AJ": "Parts & Accessories 2 CTD",
    "AK": "Parts & Accessories 3", "AL": "Parts & Accessories 3 CTD",
    "AM": "Parts & Accessories 4", "AN": "Parts & Accessories 4 CTD",
    "O": "NSM Lab (Hrs)", "S": "Total Install CTD", "V": "Install Retail Sell",
    "BE": "Dealer 1/7/22",
}
RIG_NOTE = {
    "O": "HAND-TYPED on 1,244 rows — zero formulas, 51 distinct values, 0 to 20.0, median 5.65. "
         "This is the number Boat Module!UH returns, and UH is overridden on 0 of 2,436 cells, "
         "so it is the one derived rigging figure the business never argues with "
         "(FOUR_MODULES.md §3.4, FITMENT_RULES.md R9).",
    "P": "= O × '[1]Labour Rates'!$G$14 — the COST rate, 130.09090909090907, on 629 cells. That "
         "cell lives in Service Module (1).xlsx and is seeded here as a row of Labour Rates.",
    "V": "= ROUNDUP(O × '[1]Labour Rates'!$H$9 + (Q + R) × 1.3 × 1.1, −1) — the SELL rate, 159, "
         "on 635 cells. Two scalars in another workbook set the install price of every rigging "
         "kit this dealer sells (FOUR_MODULES.md §3.4).",
    "K": "= ROUNDUP((H + H × K$2) × 1.1, −1), K$2 = 0.25. The kit alone, before fitting.",
    "Z": "= H + S. Total CTD — one of the two numbers the business's own hidden Dropdowns gadget "
         "asks for (D9 → ordinal 23).",
    "AC": "= K + V. Sell Price for kit AND fitting — the other number the Dropdowns gadget asks "
          "for (D10 → ordinal 26), and the retail figure a quote wants. Median on a live pairing "
          "$3,370; maximum $44,310.",
    "R": "HAND-TYPED. Zero formulas on the whole column.",
    "F": "The base cost — a supplier list price, or BE − 23%, or hand-typed, which it is on 1,140 "
         "of 1,264 rows. The band header row says which currency it is in: “Dealer”, “ Fact. "
         "Cost ”, “ Base Cost ” or “ EURO ” depending on the section.",
    "BE": "A frozen 2022 cost, read by 55 formulas in the sheet. Imported as a plain number named "
          "for its date; the −23% derivation behind it is deliberately NOT resurrected "
          "(FOUR_MODULES.md §3.8).",
    "E": "Beyond “Service” (427 rows) and “Factory” (74) this column holds part numbers and raw "
         "prices. Carried as text with the warning, never modelled (FOUR_MODULES.md §3.8).",
    "D": "A SECONDARY reconciliation key, never the join key. The hidden Dropdowns gadget keys on "
         "it and demonstrates why: 139 codes cover 419 rows, and 8 live kits have no code at "
         "all, so it silently returns the first match. C is the primary key.",
}
RIG_OBSOLETE_ROW = 829
RIG_SENTINEL_ROWS = (4, 5, 6, 7, 8, 9, 827)
DISC_RIG_D = (
    "No longer sold. Read from the row band below Rigging Kits!C829 “OBSOLETE RIGGING KITS” — "
    "the fourth library to draw this divider the same way. It earns its keep immediately: 153 "
    "live triples on 31 live boat rows name a kit from below it, 24 distinct kits, and NINE are "
    "in slot 1 — the boat's standard fit, all Stabicraft rows 178–194 (FOUR_MODULES.md §3.9). "
    "That is the trailer defect repeating in a second library, which is why this is one report "
    "and not two fixes.")
RIG_SENTINEL_D = (
    "Not a kit. Six preamble rows sit above the first band header and one repeats at row 827, "
    "and they are NOT inert: “SUP - Supplied Standard w Motor” carries O5 = 2.5 hours — the "
    "motor ships with the kit and the fitting is still billed — and “Tiller Handle Standard w "
    "Motor” is the most-used value in the whole rigging join at 411 live cells. They are "
    "imported as real rows carrying real labour and flagged here, never dropped: dropping row 5 "
    "silently deletes money from every quote that names it (FOUR_MODULES.md §3.5).")


def rig_class(r):
    """band header | banner | spacer | data — or None for the three header rows.

    A BAND HEADER re-labels the price columns for its section and is recognised
    by `K` repeating the word "Sell Price". A BANNER carries a heading and no
    part number and no price. A "." row is a spacer. Everything else is a kit.
    """
    d = RIG.get(r)
    if not d or r < 4 or "C" not in d:
        return None
    if norm(d.get("K", "")) == "Sell Price":
        return "band"
    if norm(d["C"]) == ".":
        return "spacer"
    if not str(d.get("D", "")).strip() and parse_num(d.get("K")) is None:
        return "banner"
    return "data"


def rig_scan():
    """-> {row: section label}, for the live rows and the obsolete ones."""
    sect, cur, obsolete = {}, None, False
    for r in sorted(RIG):
        c = rig_class(r)
        if r == RIG_OBSOLETE_ROW:
            # The divider itself becomes the section every obsolete row carries.
            # The sub-headings below it are not reliably separable from the kits
            # (they differ in how many cells they leave blank, not in kind), and
            # asserting a section we cannot prove would be worse than the one we
            # can: these rows are, provably, below C829 and nowhere else.
            obsolete, cur = True, norm(RIG[r]["C"])
            continue
        if c is None or c == "spacer":
            continue
        if c in ("band", "banner"):
            if not obsolete:
                cur = norm(RIG[r]["C"])
            continue
        sect[r] = cur
    return sect


def build_rigging(forced_names):
    sect_of = rig_scan()
    live = [r for r in sorted(sect_of) if r < RIG_OBSOLETE_ROW]
    obs_all = [r for r in sorted(sect_of) if r > RIG_OBSOLETE_ROW]
    # THE LIVE CATALOGUE WHOLE, the obsolete band BY REACHABILITY. §3.9 argues
    # for importing all 1,242 rows so the defect is visible; §5.7 of
    # FITMENT_RULES sets the seed's standing policy of importing by
    # reachability. Both are satisfied by taking every live kit and only those
    # obsolete kits a seeded boat row actually points at — the defect is on
    # screen, and 600 dead rows nobody names are not.
    obs = [r for r in obs_all if norm(RIG[r]["C"]) in forced_names]
    sel = sorted(live + obs)

    cols, sections = [], []
    for sid, sname, letters in RIG_BANDS:
        band = []
        for L in letters:
            # SENTINELS OUT BEFORE PROFILING, on this table only. Five money
            # columns here (R Sundry, AH/AJ/AL/AN the accessory CTDs) are
            # numeric on every row that has a value and carry Excel's padded
            # accounting dash — "               -  " — on nine to eleven rows,
            # which is that format's way of writing zero. `profile_column`
            # demands that EVERY sample parse, so one dash was turning a money
            # column into text and 503 real zeros into the string "0".
            # `is_sentinel` already knows a bare "-" is not a value; asking it
            # first is the whole fix. The dashes still land as EMPTY cells,
            # which is the seed's standing rule for a sentinel.
            vals = [v for r in sel if L in RIG[r] for v in [RIG[r][L]] if not is_sentinel(v)]
            label = RIG_LABEL.get(L) or norm(RIGHDR.get(L, "")) or None
            if not label:
                continue
            if L == "C":
                label = "Rigging Kit"
            if sid == "cable-options":
                label = f"{norm(RIGHDR[L])} — {norm(RIG[2].get(L, ''))}"
            c = make_col(L.lower(), label, L, vals, sid, "Rigging Kits", 1, label, "Rigging",
                         force="text" if L in ("D", "E", "AP") else None)
            if c:
                if RIG_NOTE.get(L):
                    c["d"] = c["d"] + " " + RIG_NOTE[L]
                band.append(c)
        if band:
            sections.append((sid, sname))
            cols += band
    cols = [dict(k="sect", n="Section", t="text", s="identity",
                 d="The band header row above each run in Rigging Kits!C, verbatim. It is the only "
                   "place the currency of the Dealer column is written down (“Dealer” / “ Fact. "
                   "Cost ” / “ Base Cost ” / “ EURO ”) and the only place a kit's vintage is — “As "
                   "at 01.07.2024”, “Season 2024 as at 28.05.2024”, “as at 22.05.2023” are written "
                   "into the banners themselves. Obsolete rows carry the divider text “OBSOLETE "
                   "RIGGING KITS”, which is the one heading they can be proven to sit under.")] + cols

    rows = []
    for r in sel:
        v = RIG[r]
        row = {"sect": sect_of[r]}
        for c in cols:
            if "L" not in c:
                continue
            row[c["k"]] = coerce(v.get(c["L"]), c["prof"])
        row[DISC_K] = r > RIG_OBSOLETE_ROW
        row["sentinel"] = r in RIG_SENTINEL_ROWS
        row["src"] = f"Rigging Kits!R{r}"
        rows.append(row)
    cols.append(dict(k="src", n="Source", t="text", s="source",
                     d="Workbook sheet and row this record was read from."))
    sections.append(("source", "Source"))
    disc_after(cols, "c", DISC_RIG_D)
    cols.insert(cols.index(next(c for c in cols if c["k"] == DISC_K)) + 1,
                dict(k="sentinel", n="Sentinel", t="boolean", s="identity", d=RIG_SENTINEL_D))
    for c in cols:
        c.pop("prof", None)
        c.pop("L", None)

    ndisc = sum(1 for r in rows if r[DISC_K])
    return [dict(key="rig_kits", name="Rigging Kits", kind="accessory", role="base",
                 accent="viridian", levels=["sect", "c"], sections=sections, cols=cols, rows=rows,
                 keycol="c", display="c",
                 desc=f"Rigging Module.xlsx · sheet “Rigging Kits”, rows 4–{max(sel)} — the eighth workbook, "
                      f"read directly rather than through the 5.77 MB cache of it embedded in Boat Module "
                      f"(5).xlsx. That cache turned out to be a byte-exact mirror (42,372 cells in both, ZERO "
                      f"differing, zero missing either way), so FITMENT_RULES.md §6.5 and Appendix B item 2, "
                      f"which called it “demonstrably incomplete”, are struck — the real file was worth having "
                      f"for the DERIVATION, not the data (FOUR_MODULES.md §3.1). {len(live)} live kits, all of "
                      f"them, plus {ndisc} from below the OBSOLETE RIGGING KITS divider at C{RIG_OBSOLETE_ROW} "
                      f"that seeded hulls still point at. Section membership is the BANNER ROW above each run. "
                      f"C is the primary key and resolves the boat row's thirteen rigging slots at 99.9962% "
                      f"over the whole workbook and 100.0000% over the live rows — the hand-typed cells are a "
                      f"person re-keying a row's name correctly 25,265 times out of 25,266, which is a "
                      f"mechanism failure and not a data-quality one (§3.2). A TABLE, and deliberately NOT a "
                      f"module: its surfaces are the reference picker on the boat × motor pair and a Related "
                      f"block, never a dashboard card (§3.6).")]


# ============================================================ THE RATE TABLES
# SERVICE_AND_THEMES.md §4. The Service Module is 30,739,155 bytes and what
# comes out of it is 45 rows. That ratio is the finding: 236 MB of the file is
# `Std Service Schedules`, whose 157 real rows are ONE FORMULA WRITTEN OUT 1,727
# TIMES and which carries a uniform ~20% cost defect at the 1,000-hour interval
# (+$427.82 / 19.5% on row 4, +$405.56 / 20.6% on row 22). We do not import a
# spreadsheet's arithmetic errors and call them our data. `Operation Codes` (366
# rows) is real and deferred; `Schedule Notes` is a document; `Dropdowns` is an
# Excel artefact.
#
# THE KIND IS `custom`. None of boat|motor|trailer|accessory|package|dealer fits
# a fee register, and minting a `rate` kind for one table is how enums start
# (SERVICE_AND_THEMES.md §5.1). Three tables now share the shape; a kind can be
# justified later by a fourth.
#
# THE VINTAGE TRAVELS WITH THE RATE. §2.6: a copied rate is a rate frozen on the
# day it was copied, and the business has already failed that way in one column
# 571 times. So every rate column names the file and the day it was last saved,
# and the registration table names the `AS at 1/7/25` the sheet writes on itself.
RATE_VINTAGE = f"Read from Service Module (1).xlsx, last saved {SV_SAVED}."


def _rate_cols(hdr, letters, sid, sheet, hdrrow, rows_sel, data, labels=None, notes=None,
               force=()):
    cols = []
    for L in letters:
        vals = [data[r][L] for r in rows_sel if L in data[r]]
        label = (labels or {}).get(L) or norm(hdr.get(L, "")) or None
        if not label:
            continue
        c = make_col(L.lower(), label, L, vals, sid, sheet, hdrrow, label, sheet,
                     force="text" if L in force else None)
        if c:
            if (notes or {}).get(L):
                c["d"] = c["d"] + " " + notes[L]
            cols.append(c)
    return cols


def _rate_rows(cols, rows_sel, data, sheet, extra=None):
    out = []
    for r in rows_sel:
        row = dict((extra or {}).get(r, {}))
        for c in cols:
            if "L" not in c:
                continue
            row[c["k"]] = coerce(data[r].get(c["L"]), c["prof"])
        row["src"] = f"{sheet}!R{r}"
        out.append(row)
    return out


LABOUR_NOTES = {
    "D": "NOT a key. `PD` is the code on TWO rows — “Pre Delivery Labour” at $159 inc and "
         "“Internal - Pre Delivery” at $143.10 inc, a 10% difference under one code. The ROW is "
         "the identity here and this is an ordinary column (SERVICE_AND_THEMES.md §3.2 theme 2).",
    "E": "Typed, 105 on every row, and its header carries no GST qualifier. It is ALSO the rate "
         "`Std Service Schedules` costs a workshop hour at, 1,727 times, while `Operation Codes`, "
         "`Parts Maintenance`, `Dealer Fit Module` and `Boat Module` all cost the same hour at "
         "G's 130.09. Both are called CTD. Which is right is a question only the owner can answer "
         "(SERVICE_AND_THEMES.md §6.2 Q3); until then both columns are here and neither is "
         "computed with.",
    "G": "= H/1.1. THE COST RATE the rest of the estate reads by absolute cell — "
         "`Labour Rates!$G$14` = 130.09090909090907, on 629 rigging-kit cells alone. "
         "The per-brand warranty rows below are NOT Northside's prices: each principal publishes "
         "in its own convention, which is why Stacer sits at 75 — $30 below the Actual cost of "
         "the hour — and Mercury reimburses at full retail.",
    "H": "THE SELL RATE, and five consumers in four workbooks agree on it: `Labour Rates!$H$9` = "
         "159. H9 is typed; every other row derives from it.",
}
OILS_NOTES = {
    "F": "An OPEN QUESTION, carried rather than resolved. F and H are both costs and diverge "
         "unpredictably where both are present — 7.41/7.41, 6.15/13.45, 2.09/2.20, 1.24/1.50, "
         "2.00/3.50 — with no formula on either side, and the service schedules read F while "
         "everything else reads H. Older cost, landed cost, or a service-department transfer "
         "price? Until the owner says, this table carries both columns and prices with neither "
         "(SERVICE_AND_THEMES.md §6.2 Q2).",
    "H": "The cost the boat pre-delivery build reads. Fuel - Premium Unleaded is H14 = 2.20 "
         "per Litre.",
    "K": "= ROUNDUP(H × 1.1 × 1.1,) — inc GST. Fuel - Premium Unleaded sells at K14 = 3.00.",
    "G": "The unit the price is per — Litre or Each. Stated, because a price with no unit is "
         "the defect this table exists to end.",
}


def build_labour_rates():
    hdr = LABOUR[8]
    sel = [r for r in sorted(LABOUR) if r >= 9 and "C" in LABOUR[r]]
    cols = (_rate_cols(hdr, ["C", "D"], "identity", "Labour Rates", 8, sel, LABOUR,
                       labels={"C": "Rate"}, notes=LABOUR_NOTES, force=("D",))
            + _rate_cols(hdr, ["E", "G", "H"], "rate", "Labour Rates", 8, sel, LABOUR,
                         notes=LABOUR_NOTES))
    for c in cols:
        if c["s"] == "rate":
            c["d"] = c["d"] + " " + RATE_VINTAGE
    rows = _rate_rows(cols, sel, LABOUR, "Labour Rates")
    cols.append(dict(k="src", n="Source", t="text", s="source",
                     d="Workbook sheet and row this record was read from."))
    for c in cols:
        c.pop("prof", None)
        c.pop("L", None)
    return [dict(key="labour_rates", name="Labour Rates", kind="custom", role="base",
                 accent="graphite", levels=[], sections=[("identity", "Identity"), ("rate", "Rate"),
                                                         ("source", "Source")],
                 cols=cols, rows=rows, keycol="c", display="c",
                 desc=f"Service Module (1).xlsx · sheet “Labour Rates” (header row 8), rows 9–29. "
                      f"{len(rows)} rows: the price of an hour of workshop time, and five sheets in four "
                      f"workbooks reach into it by ABSOLUTE CELL — `$G$14` for cost and `$H$9` for sell. "
                      f"Seeded READ-ONLY AND UNJOINED, deliberately: it is the correction "
                      f"SERVICE_AND_THEMES.md §2.3 needs without being the licence to compute with it "
                      f"(§4, §6.1 phase 1). Nobody browses this table; a boat row reads it — which is why "
                      f"it is a table and not a module (§1.4). Last saved {SV_SAVED}.")]


def build_oils():
    hdr = OILS[8]
    sel = [r for r in sorted(OILS) if r >= 9 and "C" in OILS[r]]
    cols = (_rate_cols(hdr, ["C", "D", "E", "G"], "identity", "Oils and Lubes", 8, sel, OILS,
                       labels={"C": "Consumable"}, notes=OILS_NOTES, force=("D", "E"))
            + _rate_cols(hdr, ["F", "H", "I", "J", "K"], "rate", "Oils and Lubes", 8, sel, OILS,
                         notes=OILS_NOTES))
    for c in cols:
        if c["s"] == "rate":
            c["d"] = c["d"] + " " + RATE_VINTAGE
    rows = _rate_rows(cols, sel, OILS, "Oils and Lubes")
    cols.append(dict(k="src", n="Source", t="text", s="source",
                     d="Workbook sheet and row this record was read from."))
    for c in cols:
        c.pop("prof", None)
        c.pop("L", None)
    return [dict(key="oils_lubes", name="Oils & Consumables", kind="custom", role="base",
                 accent="graphite", levels=[], sections=[("identity", "Identity"), ("rate", "Pricing"),
                                                         ("source", "Source")],
                 cols=cols, rows=rows, keycol="c", display="c",
                 desc=f"Service Module (1).xlsx · sheet “Oils and Lubes” (header row 8). {len(rows)} rows "
                      f"in three spacer-separated blocks — rows 9–20, 22–31 and 33–39, with 13 and 17 blank "
                      f"— the price of a litre, including the fuel the boat pre-delivery build reads at both "
                      f"rungs and with the unit stated. SERVICE_AND_THEMES.md §1.2 counts 30 rows here; the "
                      f"sheet holds {len(rows)}, and the two blank rows inside the first block are the "
                      f"difference. Seeded READ-ONLY AND UNJOINED for the same reason as Labour Rates "
                      f"(§4, §6.1 phase 1). Last saved {SV_SAVED}.")]


# ------------------------------------------------------------ REGISTRATION
# SERVICE_AND_THEMES.md §3.1 — the owner's own example, and the answer is ONE
# CONCEPT: "a third-party statutory charge, looked up by band from one shared
# table, never marked up, and accompanied by a physical artefact that is fitted
# for labour" is true of a boat and true of a trailer with no edits.
#
# THE BUSINESS ITSELF SAYS SO. `Boat Transfer Fee` and `Trailer Transfer Fee`
# are two rows at the SAME $32.55 with two revenue codes: it duplicated the ROW,
# not the TABLE. And `VIN Plate` and `PPSR Fee` are trailer artefacts sitting in
# a shared "Other Fees" block with no subject column at all — the sheet has
# already outgrown a two-way split.
#
# WHAT MODELLING IT TWICE COSTS, in cash: `Trailer Module!BZ` reads ordinal 9
# (`K SELL` = 283.00) and `Managers View!G23` reads ordinal 8 (`J CTD` = 282.19)
# for the same trailer on the same deal. Eighty-one cents on every trailer,
# forever, because two hard-coded ordinals count into one external table. Both
# columns are seeded, named, and neither is nominated — which ordinal is the
# policy is §6.2 Q1, a question only the owner can answer.
REGO_SECTIONS = {8: "Boat Registration", 15: "Trailer Registration",
                 21: "Other Fees & Charges",
                 29: "Boat Registration - Pensioner / Concession Card Holder"}
REGO_SUBJECT = {8: "Boat", 15: "Trailer", 21: "Other", 29: "Boat"}
REGO_NOTES = {
    "G": "The revenue code. Present on 8 of 19 rows and absent on the rest, including every "
         "pensioner row — carried as it is found, never filled in.",
    "J": "The cost. Each of the four boat bands is a government fee PLUS a constant 25.7 typed "
         "inside the formula (J9 = 100.65+25.7). That constant is labelled nowhere in the "
         "workbook, so this table seeds 126.35 and does not claim to know what the 25.7 is.",
    "K": "= IFERROR(ROUNDUP(J,),) — the cost rounded up to the dollar. `Trailer Module!BZ` reads "
         "THIS column (ordinal 9) while `Managers View!G23` reads J (ordinal 8) for the same "
         "trailer on the same deal, an 81-cent divergence on every trailer. Which one is the "
         "policy is SERVICE_AND_THEMES.md §6.2 Q1. Never marked up either way: `Managers "
         "View!C34` calls it “3rd Party Recovery”, which is the workbook's own word.",
}


def build_registration():
    sect_of, subj_of, cur = {}, {}, None
    for r in sorted(REGO):
        if r in REGO_SECTIONS:
            cur = r
            continue
        if r < 9 or "C" not in REGO[r]:
            continue
        sect_of[r], subj_of[r] = REGO_SECTIONS[cur], REGO_SUBJECT[cur]
    sel = sorted(sect_of)

    cols = ([dict(k="sect", n="Section", t="text", s="identity",
                  d="The four labelled section rows in Registration Costs!C — C8, C15, C21 and C29 "
                    "— drawn exactly the way the Boat Module and Trailer Module draw their bands. "
                    "It is the only place a fee's subject is written down."),
             dict(k="subject", n="Subject", t="text", s="identity",
                  d="Boat · Trailer · Other, derived from the section row above each run and from "
                    "nothing else. It is a column and not two tables because everything that "
                    "differs between a boat rego and a trailer rego is a property of the LINK or "
                    "the COLUMN — what picks the band (hull length vs ATM mass) belongs to the "
                    "join, and where it lands (outside Cash vs inside Sell inc Rego) belongs to "
                    "the price column (SERVICE_AND_THEMES.md §3.1).")]
            + _rate_cols(REGO[8], ["C", "G"], "identity", "Registration Costs", 8, sel, REGO,
                         labels={"C": "Band"}, notes=REGO_NOTES, force=("G",))
            + _rate_cols(REGO[8], ["J", "K"], "fee", "Registration Costs", 8, sel, REGO,
                         notes=REGO_NOTES))
    rows = _rate_rows(cols, sel, REGO, "Registration Costs",
                      extra={r: {"sect": sect_of[r], "subject": subj_of[r]} for r in sel})
    cols.append(dict(k="src", n="Source", t="text", s="source",
                     d="Workbook sheet and row this record was read from."))
    for c in cols:
        c.pop("prof", None)
        c.pop("L", None)
    return [dict(key="registration", name="Registration Costs", kind="custom", role="base",
                 accent="ochre", levels=["sect", "c"],
                 sections=[("identity", "Identity"), ("fee", "Fee"), ("source", "Source")],
                 cols=cols, rows=rows, keycol="c", display="c",
                 desc=f"Registration Module.xlsx · sheet “Registration Costs” (header row 8), C3:K34. "
                      f"{len(rows)} fees, and the whole of them — this is the one library small enough that "
                      f"reachability and completeness are the same import. The sheet dates itself at C6: "
                      f"“{REGO[6]['C']}”. ONE TABLE for boats and trailers, because the business itself "
                      f"duplicated the ROW and not the table — Boat Transfer Fee and Trailer Transfer Fee "
                      f"are two rows at the same $32.55 with two revenue codes — and because VIN Plate and "
                      f"PPSR Fee are trailer artefacts already sitting in a shared Other Fees block with no "
                      f"subject column at all. It joins to `Boat Module!KM Boat Registration` on seven boat "
                      f"tables and to `Trailer Module!BY Rego Type` on seven trailer tables, from columns "
                      f"that exist on both. Never derive the band (both key columns are hand-keyed and nine "
                      f"trailer rows contradict their own ATM), never mark it up (“3rd Party Recovery”), "
                      f"never add it twice, never default the concession "
                      f"(SERVICE_AND_THEMES.md §3.1, §6.1 phase 1).")]


# ============================================================ THE FAN-OUT
# One boat row assigns MANY things across its columns. FITMENT_RULES.md §2
# measures the four bands that survive adjudication; this is their vocabulary.


def _cols(a, b):
    """Column letters a..b inclusive. Stage two must run without openpyxl."""
    def idx(s):
        n = 0
        for ch in s:
            n = n * 26 + (ord(ch) - 64)
        return n

    def let(n):
        s = ""
        while n:
            n, r = divmod(n - 1, 26)
            s = chr(65 + r) + s
        return s

    return [let(i) for i in range(idx(a), idx(b) + 1)]


# R1 — thirteen curated motor slots, each five columns wide
# (Motor · Rigging Kit Option · Prop Part No. · Prop Description · Engine Hole),
# stride 6 with a spacer column between. Boat Module!KZ is headed "Recommended
# Motor Option" and LF..NT "Motor Option 2..13" in all nine band header rows.
MOTOR_SLOTS = [("KZ", "LA", "LB", "LC", "LD"), ("LF", "LG", "LH", "LI", "LJ"), ("LL", "LM", "LN", "LO", "LP"),
               ("LR", "LS", "LT", "LU", "LV"), ("LX", "LY", "LZ", "MA", "MB"), ("MD", "ME", "MF", "MG", "MH"),
               ("MJ", "MK", "ML", "MM", "MN"), ("MP", "MQ", "MR", "MS", "MT"), ("MV", "MW", "MX", "MY", "MZ"),
               ("NB", "NC", "ND", "NE", "NF"), ("NH", "NI", "NJ", "NK", "NL"), ("NN", "NO", "NP", "NQ", "NR"),
               ("NT", "NU", "NV", "NW", "NX")]
# R2 — SIX trailer slots, not ten. NZ is headed "Std Trailer" and OA..OE
# "Trailer - Option 2..6". OF..OI ARE declared (Option 7..10) and hold
# "TRAILER NOT REQUIRED" on 811 of 812 live rows and NOTHING else, ever, so
# reading them can only ever produce sentinels. FITMENT_RULES.md §1.6, §5.7.
TRAILER_SLOTS = ["NZ", "OA", "OB", "OC", "OD", "OE"]
# R3 — all 42 declared dealer-fit lines. §1.6 settles that declared depth is a
# UI default and never an import filter: truncating at 4 slots would silently
# drop 1.65% of the live edges to make a screen shorter. Read every column,
# emit a row per non-sentinel value, let __order carry the slot index.
DEALER_SLOTS = _cols("OL", "QA")
# R4 — ten P/D lines, "P/D - Parts & Accessories - 01..10". All ten are
# genuinely used and the ladder is NON-MONOTONE (slot 6 exceeds slot 5), which
# is why this band is a list and never a rank.
PD_PART_SLOTS = _cols("JT", "KC")

# FITMENT_RULES.md §6.1 — the sentinel list, fixed. gen_lib.is_sentinel already
# holds the vocabulary shared with the base tables ("." / "0" / "N/A" / "-" /
# "NR - …" / "TRAILER NOT REQUIRED"). These are the additions the fan-out bands
# need, and they are kept HERE rather than in gen_lib because they must not
# blank a cell on a base table — "Tiller Handle Standard w Motor" is a real
# thing to print on a boat, and only meaningless as a rigging PAIR.
FANOUT_SENTINEL_EXACT = {
    "Optional Fuel Tank Not Required",
    "Tiller Handle Standard w Motor",
    "HAINES - Factory Fit Rigging Kit",
    "Cap Camarat - Factory Motor Supplied Rigging Kit",
    "Jeanneau Factory Fitted Motor / Rigging Combination",
}
# Header text leaked into a data cell — §6.1's last clause. "Rigging Kit Option"
# alone appears 104 times as a VALUE.
HEADER_LEAK = re.compile(
    r"^(Recommended Motor Option|Motor Option \d+|Rigging Kit Option|Prop Part No\.?|"
    r"Prop Description|Engine Hole|Std Trailer|Trailer - Option \d+|"
    r"Additional Package Options|Additional Dealer Fit Options - Line \d+|"
    r"P/D - Parts & Accessories - \d+)$", re.I)


def cell(row, L):
    """The live value in Boat Module!<L><row>, or None if it is not one.

    One definition of "empty", used by every band, because the five lens
    reports differed by up to 0.9% purely from disagreeing about this.
    """
    v = BDATA.get(row, {}).get(L)
    if v is None or is_quarantined(v) or is_sentinel(v):
        return None
    s = norm(v)
    if not s or s in FANOUT_SENTINEL_EXACT or HEADER_LEAK.match(s):
        return None
    if "NOT REQUIRED" in s.upper():
        return None
    return s


def names_for(rows, slots):
    """Every distinct partner name these boat rows name in this band."""
    out = set()
    for r in rows:
        for L in slots:
            n = cell(r, L)
            if n:
                out.add(n)
    return out


def motor_names_for(rows):
    return names_for(rows, [s[0] for s in MOTOR_SLOTS])


def trailer_names_for(rows):
    return names_for(rows, TRAILER_SLOTS)


def origin_of(row, L):
    """'rule' when the workbook POINTS at the library row, 'added' when a
    person typed the same text — FITMENT_RULES.md §9. A cell reading
    ='[7]Trailer Module'!$C$140 is a derived pairing; the identical string
    typed by hand is a person putting it there. 352 of 61,854 live fan-out
    cells are formulas, and that 0.6% is the only provenance the sheet keeps.
    """
    return "rule" if L in FORMULA.get(row, ()) else "added"


# ------------------------------------------------------------ the pair itself
# THE THREE SYSTEM COLUMNS, with the ids the model reserves. They are written
# as `__origin` / `__recommended` / `__order` — literally, not as minted field
# ids — because `readPairs` looks them up by those exact strings
# (features/views/pairs.ts:237-239). The seed used to declare its own `rec` and
# `slot` columns instead, so `readPairs` returned recommended:false for every
# row and a quote opened with its motor and trailer sections EMPTY
# (features/quote/index.ts:73-87). That is what this fixes.

ORIGIN_D = ("How this pairing got here, in the workbook's own terms — FITMENT_RULES.md §9. "
            "“rule” where the boat cell is a live external link (='[7]Trailer Module'!$C$140 and its "
            "kin), so the business POINTED at the library row and the pairing is derived. “added” where "
            "the same text is typed, so a person put it there. 352 of 61,854 live fan-out cells are "
            "formulas; the other 99.4% are hand-typed, and that IS the finding.")
ORDER_D = ("The slot index on the boat row, carried raw. It is not decoration: a boat names the same "
           "motor in two different slots often enough that (boat, motor) is not unique and (boat, motor, "
           "rigging kit) is not either — a UNIQUE constraint would delete 641 and 392 live rows "
           "respectively. The pair's identity IS its slot. Never sort this by HP: the ladder restarts at "
           "each change of control generation, and that restart is the information (FITMENT_RULES.md §1.4, F13).")
NO_REC_D = ("Left unset on every row of this join, deliberately. Slot 1 of this band is headed "
            "“Line 01” / “- 01”, not “Recommended” — nothing in the workbook nominates one of these as "
            "standard, and the fill ladder is non-monotone, so it is a list and not a rank. Inventing a "
            "recommendation here is exactly the failure FITMENT_RULES.md exists to prevent.")


def pair_cols(partner_k, partner_n, partner_d, rec_d, extra=(), src_d=None):
    return [
        dict(k="boat", n="Boat", t="reference", s="pairing", d="The hull this pairing is for."),
        dict(k=partner_k, n=partner_n, t="reference", s="pairing", d=partner_d),
        *extra,
        dict(k="__origin", n="Origin", t="text", s="pairing", d=ORIGIN_D),
        dict(k="__recommended", n="Recommended", t="boolean", s="pairing", d=rec_d),
        dict(k="__order", n="Order", t="number", s="pairing", d=ORDER_D),
        dict(k="src", n="Source", t="text", s="source", d=src_d or "Sheet, row and slot column this pairing was read from."),
    ]


REC_MOTOR_D = ("True for slot 1 and only slot 1. Boat Module!KZ is literally headed “Recommended Motor "
               "Option” in all nine band header rows while the other twelve are headed “Option”, and the "
               "row's three engine-labour allowances are all $KZ-anchored — the boat is PRICED against "
               "slot 1. Read it as “standard fit”, not “our pick”: it is the lowest-HP motor on the row "
               "on 99.9% of live boats (FITMENT_RULES.md R9, R10).")
REC_TRAILER_D = ("True for slot 1 and only slot 1 — Boat Module!NZ is headed “Std Trailer”. It is ABSENT "
                 "rather than false for a boat that names no trailer at all: NZ is populated on 350 of "
                 "812 live boats (43.1%), and defaulting the flag to “the first row we found” would "
                 "assert a standard trailer for 462 boats that have none (FITMENT_RULES.md R10).")

MOTOR_EXTRA = [
    # WAS `text`, IS NOW A REFERENCE INTO `rig_kits` — FOUR_MODULES.md §3.7, and
    # it is the whole point of importing that library. The free text resolved
    # into Rigging Kits!C at 100.0000% over the live rows, so nothing is lost in
    # the conversion and a dangling name becomes impossible. It is a SOFT
    # reference: a pair that names no kit keeps its motor, its prop and its slot
    # rather than being dropped, because "no rigging kit" is an answer.
    dict(k="rig", n="Rigging Kit Option", t="reference", s="rigging",
         d="True of THIS motor on THIS hull and of neither alone — which is exactly why it lives on the "
           "join. The Motor Library DOES publish a permitted rigging set per motor (Motor Library!DA:EX) "
           "and the boat module fetches item 1 of it on 507 cells — but the business overrides that "
           "answer on 94.0% of cells, and the value here is in the motor's own list on only 53.3% of "
           "real pairs. Provenance, never a filter (FITMENT_RULES.md R8). Every single-sided selector "
           "loses outright: hull material 15.8%, motor brand 18.8%, HP band 26.0%, control type 26.1%, "
           "the whole motor 54.2% — the kit belongs to the PAIR, and this is where the pair keeps it "
           "(FOUR_MODULES.md §3.3)."),
    dict(k="prop", n="Prop Part No.", t="text", s="rigging",
         d="Prop part number, =IFERROR(VLOOKUP(<prop desc>,'[3]Parts Maintenance'!$C:$ZZ,3,0),) → "
           "Parts Maintenance!E Code. Hand-overridden on 6.8% of cells."),
    dict(k="propd", n="Prop Description", t="text", s="rigging",
         d="Prop description. 17,328 cells carry =VLOOKUP(<motor slot>,'[4]Motor Library'!$C:$ZZ,200,0) → "
           "Motor Library!GT “Prop Option - Default”. The value EQUALS that default on 83.8% of live "
           "pairs and is somewhere in the motor's GT:KO option list on 96.8% — so the default is a "
           "pre-selection, not a derivation (FITMENT_RULES.md R7 / A3′)."),
    dict(k="hole", n="Engine Hole", t="text", s="rigging",
         d="Transom engine hole. Carried here because it travels in the slot, but it is one BOAT fact "
           "duplicated thirteen times: it differs between slots on 10 of 2,003 rows (0.5%)."),
]


def build_motor_join(key, name, boat_tbl, boat_rows, motor_tbl, motor_names, rig_names, desc):
    """R1 — the thirteen-slot motor menu, with the rigging kit, prop and engine
    hole that are true of THAT motor on THAT hull and of nothing else.

    `rig_names` maps a normalised kit name to the spelling `rig_kits` STORES,
    the same hazard the boat and partner sides already guard against: the
    fan-out scan reads a cell through norm() while a base table stores
    coerce()'s str().strip(), and for any name carrying an internal line break
    the two disagree and the link silently fails to resolve."""
    rows = []
    for r, boat in boat_rows.items():
        for i, (a, b_, c_, d_, e_) in enumerate(MOTOR_SLOTS, start=1):
            mn = motor_names.get(cell(r, a) or "")
            if not mn:
                continue
            rows.append({
                "boat": boat, "motor": mn,
                "rig": rig_names.get(cell(r, b_) or ""),
                "prop": cell(r, c_), "propd": cell(r, d_), "hole": cell(r, e_),
                "__origin": origin_of(r, a), "__recommended": i == 1, "__order": i,
                "src": f"Boat Module!R{r} {a}..{e_}",
            })
    return dict(key=key, name=name, kind="package", role="join", accent="violet", levels=[],
                sections=[("pairing", "Pairing"), ("rigging", "Rigging"), ("source", "Source")],
                cols=pair_cols("motor", "Motor",
                               "The motor, matched to Motor Library!C — the display name, which is the "
                               "primary key of every library in the Master Price File. It is 474 distinct "
                               "over 501 rows; the model code in column D is 280 over the same rows with 51 "
                               "duplicates, so the code is the WORSE key and is never joined on "
                               "(FITMENT_RULES.md §1.3, §6.3).",
                               REC_MOTOR_D, extra=MOTOR_EXTRA,
                               src_d="Boat Module row and the five columns of the slot this pairing was read from."),
                rows=rows, refs={"boat": boat_tbl, "motor": motor_tbl, "rig": "rig_kits"},
                refkeys={"boat": "c", "motor": "c", "rig": "c"}, softrefs={"rig"},
                display="boat", desc=desc)


def build_slot_join(key, name, boat_tbl, boat_rows, partner_tbl, partner_names, slots,
                    partner_k, partner_n, partner_d, rec_d, desc, origin=None):
    """One partner per slot column — trailers (R2), dealer-fit packages (R3),
    P/D parts (R4). `origin` overrides the formula test where the pairing's
    provenance is something the formula cannot say."""
    rows = []
    for r, boat in boat_rows.items():
        for i, L in enumerate(slots, start=1):
            n = partner_names.get(cell(r, L) or "")
            if not n:
                continue
            row = {"boat": boat, partner_k: n,
                   "__origin": origin or origin_of(r, L), "__order": i,
                   "src": f"Boat Module!R{r} {L}"}
            if rec_d is not NO_REC_D:
                row["__recommended"] = i == 1
            rows.append(row)
    return dict(key=key, name=name, kind="package", role="join", accent="violet", levels=[],
                sections=[("pairing", "Pairing"), ("source", "Source")],
                cols=pair_cols(partner_k, partner_n, partner_d, rec_d),
                rows=rows, refs={"boat": boat_tbl, partner_k: partner_tbl},
                refkeys={"boat": "c", partner_k: "c"}, display="boat", desc=desc)


# ============================================================ THE JOIN LIST
# FITMENT_RULES.md §5. Eighteen joins are admitted there over the full import;
# they land here as 27 generator entries because a join is one boat brand
# against one partner table, and five boat brands share NSM Custom Trailers.
#
# EACH ENTRY IS (key, name, boat brand, partner table, desc). Nothing else
# decides which pairs a join gets: a partner name resolves into exactly ONE
# seeded table, so the band a trailer sits in and the supplier a motor carries
# do the partitioning by themselves.

BAND_MOTOR = ("Boat Module (5).xlsx · sheet “Boat Module” · the thirteen motor slots on every {brand} row "
              "(KZ..LD, LF..LJ … NT..NX), read under the band header at row {hdr}. Boat Module!KZ is headed "
              "“Recommended Motor Option” and LF..NT “Motor Option 2..13”; the stride is confirmed by "
              "formula, not just by spacing — LI5 = VLOOKUP(LF5,'[4]Motor Library'!$C:$ZZ,200,0) looks slot "
              "2's prop up from slot 2's motor. Resolved against {target} on Motor Library!C, the display "
              "name, at 100.0% over the whole live catalogue. ")
BAND_TRAILER = ("Boat Module (5).xlsx · sheet “Boat Module” · Std Trailer (NZ) plus Trailer - Option 2..6 "
                "(OA..OE) on every {brand} row. Slots 7–10 (OF..OI) ARE declared and are not read: they "
                "hold “TRAILER NOT REQUIRED” on 811 of 812 live rows and nothing else, ever. Resolved "
                "against {target} on Trailer Module!C at 98.8%. ")
BAND_DEALER = ("Boat Module (5).xlsx · sheet “Boat Module” · all 42 declared lines of “Additional Dealer "
               "Fit Options - Line 01..42” (OL..QA) on every {brand} row. ASSERTED: 37 cells in Boat "
               "Module!OM are literally ='[3]Dealer Fit Module'!$C$<row>. Resolved against {target} on "
               "Dealer Fit Module!C at 99.4% live — against Parts Maintenance!C the same cells score "
               "38.8%, which is why this points where it does. ")
BAND_PD = ("Boat Module (5).xlsx · sheet “Boat Module” · “P/D - Parts & Accessories - 01..10” (JT..KC) on "
           "every {brand} row. ASSERTED: 34 cells are literally ='[3]Parts Maintenance'!C<row>. Resolved "
           "against {target} on Parts Maintenance!C at 99.59% over all 5,918 populated cells. It is "
           "genuinely a bill of materials and it is asserted by ABSENCE: Boat Module!SZ Parts CTD, TA "
           "Sundry CTD and TB Sublet CTD are EMPTY on all 2,005 rows, so these parts are assigned to the "
           "hull and never priced on it. ")

# (key, display name, boat brand key, partner table key, band template, tail)
MOTOR_JOINS = [
    ("hf_yam", "Highfield × Yamaha", "highfield", "mot_yamaha",
     "Six boat brands against Yamaha carry 3,706 of the 4,018 live motor edges — 92.2% of the whole "
     "relationship — and this is the largest of the six."),
    ("stacer_yam", "Stacer × Yamaha", "stacer", "mot_yamaha",
     "One kind, one rule, two brands — which is the whole reason TableKind exists apart from the table."),
    ("formosa_yam", "Formosa × Yamaha", "formosa", "mot_yamaha",
     "The 39 Formosa rows are the only ones in the workbook that DERIVE their rigging kit: 507 cells carry "
     "=VLOOKUP(<motor slot>,'[4]Motor Library'!$C:$ZZ,103,0) → Motor Library!DA “Rigging Option - 01”. "
     "That is 1.9% of the sheet's rigging cells, and it is why the derivation is recorded as provenance "
     "and never enforced as a rule."),
    ("stabicraft_yam", "Stabicraft × Yamaha", "stabicraft", "mot_yamaha",
     "The clearest example of why slot order is not a rank: Stabicraft 2050 Frontier FT fills all thirteen "
     "slots in three blocks — Mech+Hydraulic, then DEC+Hydraulic, then DEC+Digital Electric Steering — and "
     "each block ascends in HP and then restarts."),
    ("surtees_yam", "Surtees × Yamaha", "surtees", "mot_yamaha", ""),
    ("jeanneau_yam", "Jeanneau × Yamaha", "jeanneau", "mot_yamaha",
     "The loose Yamahas a Jeanneau hull can take. The factory boat+engine bundles the same rows also name "
     "are a different kind of thing and are in the Jeanneau Factory Packages join beside this one."),
    ("jeanneau_pkg", "Jeanneau × Factory Packages", "jeanneau", "mot_pkg_jeanneau",
     "NOT motors. Every partner here is a boat sold WITH its engines — “MF895 S2 with Yamaha 2X200 XCB "
     "DBW (Grey)” — that lives in the Motor Library because the boat row's motor slot is where the "
     "business types it. Separated so it cannot contaminate mot_yamaha (FITMENT_RULES.md §5.1 J7)."),
    ("haines_pkg", "Haines Signature × Factory Packages", "haines", "mot_pkg_haines",
     "NOT motors, and the sharpest evidence for it: 52 of the 55 live shaft-length mismatches in the whole "
     "workbook are these bundles. The boat row says LS (20\") and the packaged motor is a 25\" X-shaft, "
     "because a bundle has no single shaft (FITMENT_RULES.md §1.5, §5.1 J8)."),
]

TRAILER_JOINS = [
    ("hf_trl", "Highfield × NSM Custom", "highfield", "trl_nsmcustom",
     "A bespoke cradle built for the hull. “Highfield have special trailers” is true and ASSERTED — the "
     "series banner at Trailer Module!A140 reads “REDCO - Highfield”, and seven trailer codes name the "
     "boat model outright, every one of them Highfield (TA600-MOB (SP560), TA700T-EH (SP700) …). But "
     "bespoke is the NORM and not the Highfield exception: 74 of 152 live boat models get a "
     "model-designated trailer, and Stacer is the ONLY brand that is band-driven."),
    ("stacer_trl", "Stacer × Stacer Trailers", "stacer", "trl_stacertrailers",
     "The one SIZE-SELECTED regime in the workbook. Generic Telwater alloy stock picked against ATM and a "
     "Boat Size band like “5.7 - 6.1m”; 0 of 148 live Stacer trailer names mention Stacer, against 100% "
     "model-designation for Stabicraft, Haines, Merry Fisher and Cap Camarat. OBSERVED, not asserted."),
    ("formosa_trl", "Formosa × NSM Custom", "formosa", "trl_nsmcustom", ""),
    ("stabicraft_trl", "Stabicraft × NSM Custom", "stabicraft", "trl_nsmcustom", ""),
    ("surtees_trl", "Surtees × NSM Custom", "surtees", "trl_nsmcustom", ""),
    ("jeanneau_trl", "Jeanneau × NSM Custom", "jeanneau", "trl_nsmcustom",
     "Merry Fisher and Cap Camarat cradles, which the Trailer Module gives their own banners "
     "(REDCO - Merry Fisher Trailers at A127, REDCO - Cap Camarat Trailers at A133) even though Jeanneau "
     "is one brand and they are ranges of it."),
    ("hf_gfab", "Highfield × GFAB", "highfield", "trl_gfab",
     "A pure ALTERNATIVE menu: across the live catalogue not one of the 51 Highfield × GFAB pairings is a "
     "slot-1 trailer. These are exactly the rows the recommended flag exists NOT to mark, and exactly the "
     "offering a Highfield boat could not show before this join existed."),
    ("stabicraft_gfab", "Stabicraft × GFAB", "stabicraft", "trl_gfab",
     "Alternatives again — 0 of 47 live pairings are slot 1. GFAB - Stabicraft Series has its own banner "
     "at Trailer Module!A197, beside the two REDCO - Stabicraft series at A105 and A113."),
    ("surtees_gfab", "Surtees × GFAB", "surtees", "trl_gfab", ""),
    ("haines_trl", "Haines Signature × Dunbier/Haines BMT", "haines", "trl_bmt",
     "The PACKAGE-ONLY regime, and it is ASSERTED twice: the series banner at Trailer Module!A626 reads "
     "“DUNBIER / HAINES BMT TRAILERS (NB: Only available in Haines BMT Package)”, and Trailer Module!D "
     "Supplier reads “Haines / Dunbier BMT Packages Only” on 18 of 18 rows. This trailer cannot be sold "
     "on its own."),
]

DEALER_JOINS = [
    ("hf_df", "Highfield × Dealer Fit", "highfield", "Highfield carries 1,355 of the 1,517 live "
     "dealer-fit edges — 89.3% of the relationship."),
    ("stabicraft_df", "Stabicraft × Dealer Fit", "stabicraft", ""),
    ("jeanneau_df", "Jeanneau × Dealer Fit", "jeanneau", ""),
]

PD_JOINS = [
    ("hf_pd", "Highfield × P/D Parts", "highfield", ""),
    ("stacer_pd", "Stacer × P/D Parts", "stacer", ""),
    ("stabicraft_pd", "Stabicraft × P/D Parts", "stabicraft", ""),
    ("formosa_pd", "Formosa × P/D Parts", "formosa", ""),
    ("jeanneau_pd", "Jeanneau × P/D Parts", "jeanneau", ""),
    ("surtees_pd", "Surtees × P/D Parts", "surtees", ""),
]

BRAND_NAME = {b["key"]: b["name"] for b in BOAT_BRANDS}
BRAND_HDR = {b["key"]: b["hdr"] for b in BOAT_BRANDS}
TBL_NAME = dict([("mot_" + b["key"], b["name"]) for b in M_BRANDS]
                + [("trl_" + b["key"], b["name"]) for b in T_BRANDS]
                + [("parts", "Parts & Accessories"), ("dealer_fit", "Dealer Fit Packages")])


# ============================================================ ASSEMBLE
def main():
    boats, sel = build_boats()
    # EVERY seeded hull forces its partners into the catalogues, not just the
    # two brands that used to get joins — a link that cannot resolve is not a
    # link, and seven brands have joins now. §5.7: import by reachability.
    every = [r for b in BOAT_BRANDS for r in sel[b["key"]]]
    trailers = build_trailers(trailer_names_for(every))
    motors = build_motors(motor_names_for(every))
    parts = build_parts(names_for(every, PD_PART_SLOTS))
    dealer_fit = build_dealer_fit(names_for(every, DEALER_SLOTS))
    # The live rigging catalogue whole; the obsolete band only where a seeded
    # hull still points into it. The reachable names come from slot column 2 of
    # each of the thirteen motor slots — "Rigging Kit Option".
    rigging = build_rigging(names_for(every, [s[1] for s in MOTOR_SLOTS]))
    # The three rate registers. They join to nothing yet, by instruction:
    # SERVICE_AND_THEMES.md §4 seeds Labour Rates and Oils read-only and
    # unjoined so that §2.3's correction lands without also being the licence to
    # compute a customer-facing number from a rate copied on a particular day.
    rates = build_labour_rates() + build_oils() + build_registration()

    # NORMALISED name -> the name AS STORED on the base table. The two are not
    # always the same string: a boat row's partner cell is read through norm()
    # (whitespace collapsed) while a base table stores coerce()'s str().strip(),
    # so a library name carrying an internal newline — 'TALS749S13 - T Light
    # Alloy Short 749 ATM S 13" L/Skid' is one — matched on one side and not the
    # other. emit.py resolves a join by EXACT string against the base table's
    # stored value, so the mismatch silently dropped the pair. Look the partner
    # up by the normalised key and write back the stored spelling.
    # The SAME hazard on the boat side of every pair. emit.py indexes a boat row
    # by its stored `c` and resolves the join against that exact string, so a
    # join must write the hull's name as the boat table stores it, not as the
    # fan-out scan normalised it. Getting this wrong dropped 111 pairs — every
    # one of them Surtees or Jeanneau, the two brands whose model names carry a
    # line break — and dropped them SILENTLY, which is the failure mode a
    # free-text join exists to hide.
    bkey = {}
    for b in BOAT_BRANDS:
        t = next(x for x in boats if x["key"] == "boat_" + b["key"])
        names = [r["c"] for r in t["rows"]]
        if len(set(names)) != len(names):
            dup = sorted({n for n in names if names.count(n) > 1})
            raise SystemExit(f"{b['key']}: duplicate hull names would collapse pairs: {dup}")
        bkey[b["key"]] = dict(zip(sel[b["key"]], names))

    have = {t["key"]: {norm(r["c"]): r["c"] for r in t["rows"]}
            for t in trailers + motors + parts + dealer_fit + rigging}
    # A partner name must resolve into exactly one table or the same pairing
    # would be emitted twice under two different partners. Trailer Module!C has
    # two duplicate names across 476 rows, so this is not hypothetical.
    for group in (trailers, motors):
        seen = {}
        for t in group:
            for n in have[t["key"]]:
                if n in seen:
                    raise SystemExit(f"ambiguous partner name {n!r}: {seen[n]} and {t['key']}")
                seen[n] = t["key"]

    joins = []
    for key, name, brand, target, tail in MOTOR_JOINS:
        joins.append(build_motor_join(
            "join_" + key, name + " — Motor Fitment", "boat_" + brand, bkey[brand], target, have[target],
            have["rig_kits"],
            BAND_MOTOR.format(brand=BRAND_NAME[brand], hdr=BRAND_HDR[brand], target=TBL_NAME[target])
            + "The rigging kit, prop part number, prop description and engine hole are facts about THAT "
            "motor on THAT hull, so they live here and on no base table. " + tail))
    for key, name, brand, target, tail in TRAILER_JOINS:
        joins.append(build_slot_join(
            "join_" + key, name + " — Trailer Fitment", "boat_" + brand, bkey[brand], target, have[target],
            TRAILER_SLOTS, "trailer", "Trailer",
            "The trailer, matched to Trailer Module!C — the display name. It is 474 distinct over 476 rows "
            "while the code in Trailer Module!E is 459 distinct with 13 duplicates (SRW5.7M-13TB four "
            "times, AS5.7M-13TB four times …), so the code is carried as a column and never joined on "
            "(FITMENT_RULES.md §1.3).",
            REC_TRAILER_D,
            BAND_TRAILER.format(brand=BRAND_NAME[brand], target=TBL_NAME[target])
            + "The selector is the SERIES BANNER, not a dimension: a trailer whose series is built for "
            "this boat's brand holds at 581/581 live pairings with zero counter-examples and leaves only "
            "0.9–7.8% of the catalogue, while ATM ≥ boat weight also holds at 530/530 and leaves 97.7% of "
            "it — a gate that rejects nothing has not chosen a trailer. There is NO trailer length rule "
            "(FITMENT_RULES.md F8, F9, F10). " + tail))
    for key, name, brand, tail in DEALER_JOINS:
        joins.append(build_slot_join(
            "join_" + key, name, "boat_" + brand, bkey[brand], "dealer_fit", have["dealer_fit"],
            DEALER_SLOTS, "pkg", "Dealer Fit Package",
            "The package, matched to Dealer Fit Module!C.", NO_REC_D,
            BAND_DEALER.format(brand=BRAND_NAME[brand], target="Dealer Fit Packages")
            + "Only three boat brands have this relationship at all — Stacer, Surtees, Haines, Formosa and "
            "Cap Camarat carry ZERO dealer-fit edges across the whole live catalogue. That is the shape of "
            "the relationship and not missing data. " + tail))
    for key, name, brand, tail in PD_JOINS:
        joins.append(build_slot_join(
            "join_" + key, name, "boat_" + brand, bkey[brand], "parts", have["parts"],
            PD_PART_SLOTS, "part", "Part",
            "The part, matched to Parts Maintenance!C.", NO_REC_D,
            BAND_PD.format(brand=BRAND_NAME[brand], target="Parts & Accessories") + tail))
    # The defect the owner should see, carried rather than hidden. Every live
    # pairing that points below Trailer Module!A656 is Surtees.
    obs_join = build_slot_join(
        "join_surtees_obs", "Surtees × OBSOLETE Trailers", "boat_surtees", bkey["surtees"],
        "trl_obsolete", have["trl_obsolete"], TRAILER_SLOTS, "trailer", "Trailer",
        "The trailer, matched to Trailer Module!C — below the OBSOLETE divider at row 656.",
        REC_TRAILER_D,
        "Boat Module (5).xlsx · the same six trailer slots, resolved into the band BELOW Trailer "
        "Module!A656 “OBSOLETE - Trailers No Longer Available”. Across the live catalogue 30 of 674 "
        "trailer pairings (4.5%) land here and EVERY ONE OF THEM IS SURTEES, 8 of them in the Std Trailer "
        "slot — a live boat offering a discontinued trailer as standard. Surtees is also the one brand "
        "where the external link into the Trailer Module has been typed over (73 of 74 cells) and the one "
        "brand where the series rule breaks; those are the same fact. Carried with __origin “removed” "
        "because that is the only value in PairOrigin meaning present-and-restorable-but-not-offered: the "
        "instruction is do not silently drop them and do not silently show them "
        "(FITMENT_RULES.md F5, §5.2, Appendix B.1).",
        origin="removed")
    # RETIRED, at the table level — model.ts `EntityDef.retired`. Every pair on
    # it points below the OBSOLETE divider, so it is not a join with a problem
    # in it: the whole relationship is history. It survives because an old quote
    # was written against one of these pairings and deleting the join would make
    # that document unreadable; nothing customer-facing offers it.
    obs_join["retired"] = True
    obs_join["desc"] += (" The table itself is marked RETIRED for the same reason each of its "
                         "trailers is marked Discontinued: the whole of it is history rather "
                         "than stock.")
    joins.append(obs_join)

    # A join the specification admits but this curated subset cannot fill is
    # reported, never quietly omitted.
    empty = [t for t in joins if not t["rows"]]
    joins = [t for t in joins if t["rows"]]

    tables = boats + trailers + motors + parts + dealer_fit + rigging + rates + joins
    return tables, sel, empty


if __name__ == "__main__":
    tables, sel, empty = main()
    tot = 0
    for t in tables:
        tot += len(t["rows"])
        print(f'{t["name"]:46s} {str(t["kind"]):9s} {t["role"]:5s} cols {len(t["cols"]):3d} rows {len(t["rows"]):4d}')
    print("TOTAL ROWS", tot)
    for t in empty:
        print(f'EMPTY IN THIS SUBSET (admitted by the spec, no seeded hull names one): {t["name"]}')
