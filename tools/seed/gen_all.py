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
from gen_lib import profile_column, coerce, is_quarantined, is_sentinel, ts_val, ts_str

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
    return dict(k=key, n=colname(label, prof.get("unit")), t=prof["type"], s=sid, d=d, prof=prof, L=letter)


# ============================================================ BOATS
BOAT_BANDS = [
    ("identity", "Identity", ["C", "D", "E", "F", "G", "H", "I", "K", "L", "M"]),
    ("capacity", "Capacity", ["O", "P", "Q"]),
    ("construction", "Construction", ["S", "T", "U"]),
    ("cost-build", "Cost Build", ["IM", "IQ", "IV", "IX", "IY"]),
    ("motor-envelope", "Motor Envelope", ["KV", "KW", "KX", "KY"]),
    ("pricing", "Hull Only Pricing", ["QR", "QT", "RB"]),
]
SECTION_ACCENT = {
    "cost-build": "graphite", "markups": "graphite", "pricing": "viridian",
    "motor-envelope": "carmine", "margin": "viridian", "trailer-pricing": "viridian",
    "cost-ladder": "graphite", "retail": "viridian", "trade": "viridian",
    "supply": "graphite", "fitted": "viridian", "rigging": "carmine",
}
BOAT_BRANDS = [
    dict(key="stacer", name="Stacer", hdr=3, r0=4, r1=142, mode="series", budget=26),
    dict(key="stabicraft", name="Stabicraft", hdr=143, r0=144, r1=199, mode="series", budget=30),
    dict(key="surtees", name="Surtees", hdr=200, r0=201, r1=225, mode="series", budget=25),
    # JEANNEAU IS ONE BRAND. The workbook gives Merry Fisher and Cap Camarat
    # their own banner rows, but they are Jeanneau RANGES, not manufacturers —
    # so they are SERIES inside one Jeanneau table, not three tables. `spans`
    # lets a brand be assembled from several banner blocks, each contributing
    # its own header row and its own series name.
    dict(key="jeanneau", name="Jeanneau", hdr=226, mode="spans", budget=24,
         spans=[dict(hdr=226, r0=227, r1=232, series=""),
                dict(hdr=233, r0=234, r1=247, series="Merry Fisher"),
                dict(hdr=248, r0=249, r1=261, series="Cap Camarat")]),
    dict(key="haines", name="Haines Signature", hdr=262, r0=263, r1=277, mode="series", budget=12),
    dict(key="highfield", name="Highfield Inflatables", hdr=278, r0=281, r1=948, mode="hf", budget=40),
    dict(key="formosa", name="Formosa", hdr=955, r0=956, r1=1004, mode="flat", budget=26),
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
    dict(key="redco", name="REDCO / Tinka Trailers", r0=4, r1=85, budget=16),
    dict(key="nsmcustom", name="NSM Custom Trailers", r0=87, r1=184, budget=18),
    dict(key="gfab", name="GFAB Trailers", r0=186, r1=231, budget=14),
    dict(key="stacertrailers", name="Stacer Trailers", r0=232, r1=280, budget=14),
    dict(key="dunbier", name="Dunbier Trailers", r0=281, r1=454, budget=16),
    dict(key="mackay", name="Mackay Trailers", r0=455, r1=625, budget=16),
    dict(key="bmt", name="Dunbier / Haines BMT Trailers", r0=626, r1=655, budget=12),
]


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
        for c in cols:
            c.pop("prof", None)
            c.pop("L", None)

        tables.append(dict(key="trl_" + b["key"], name=b["name"], kind="trailer", role="base",
                           accent="ochre", levels=["series", "c"], sections=sections, cols=cols,
                           rows=rows, keycol="c", display="c",
                           desc=f"Trailer Module.xlsx · sheet “Trailer Module”, rows {b['r0']}–{b['r1']}. "
                                f"Brand membership for this block comes from the HIDDEN Dropdowns sheet (row 1, one column per brand) — "
                                f"the data sheet alone cannot tell you. {len(rows)} of {len(rows_all)} trailers seeded."))
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
    dict(key="yamaha", name="Yamaha Outboards", r0=5, r1=293, budget=26, supplier="Yamaha"),
    dict(key="epropulsion", name="ePropulsion Outboards", r0=294, r1=341, budget=14,
         supplier="EPROPULSION - Electric Outboards"),
]


def build_motors(forced_names):
    tables = []
    for b in M_BRANDS:
        rows_all, series_of, cur = [], {}, None
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

        tables.append(dict(key="mot_" + b["key"], name=b["name"], kind="motor", role="base",
                           accent="carmine", levels=["series", "c"], sections=sections, cols=cols,
                           rows=rows, keycol="c", display="c",
                           desc=f"Motor Module · sheet “Motor Library” (header row 4), rows {b['r0']}–{b['r1']}. "
                                f"Motor Library!C is the primary key of the whole Master Price File — every other "
                                f"workbook joins on this display name as free text. {len(rows)} of {len(rows_all)} motors seeded."))
    return tables


# ============================================================ PARTS
P_BANDS = [
    ("identity", "Identity", ["C", "D", "E"]),
    ("supply", "Supply Pricing", ["G", "I", "J", "L", "M"]),
    ("fitted", "Fitted Pricing", ["N", "O", "P", "S", "Y"]),
    ("operations", "Operations", ["AA"]),
]
P_CATEGORIES = [
    "SAFETY GEAR EQUIPMENT (NB: Excludes PFD's & Anchor)",
    "PFD's - Personal Floatation Devices",
    "ANCHOR KITS",
    "REGISTRATION - Decals, Graphics & Holders",
    "TRAILER PARTS - Tie Downs",
    "LIGHTING - Navigation",
]


def build_parts(forced_names):
    cats, cur = {}, None
    for r in sorted(PDATA):
        if r <= 2:
            continue
        v = PDATA[r]
        if not v.get("C"):
            continue
        if not v.get("E"):
            cur = norm(v["C"])
            continue
        cats.setdefault(cur, []).append(r)
    sel = []
    for cat in P_CATEGORIES:
        rows = cats.get(cat, [])
        forced = [r for r in rows if norm(PDATA[r]["C"]) in forced_names]
        rest = [r for r in rows if r not in forced][:5]
        sel += sorted(set(forced + rest))
    sel = sorted(set(sel))
    cat_of = {}
    for cat, rows in cats.items():
        for r in rows:
            cat_of[r] = cat

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
        row["src"] = f"Parts Maintenance!R{r}"
        rows.append(row)
    cols.append(dict(k="src", n="Source", t="text", s="source", d="Workbook sheet and row this record was read from."))
    sections.append(("source", "Source"))
    for c in cols:
        c.pop("prof", None)
        c.pop("L", None)

    return [dict(key="parts", name="Parts & Accessories", kind="accessory", role="base",
                 accent="viridian", levels=["cat", "c"], sections=sections, cols=cols, rows=rows,
                 keycol="c", display="c",
                 desc=f"Parts Module (3).xlsx · sheet “Parts Maintenance”. Category is a banner ROW, never a field: "
                      f"everything under a banner belongs to it until the next one. {len(rows)} parts seeded from "
                      f"{len(P_CATEGORIES)} of the 216 category banners — the ones the seeded hulls actually name.")]


# ============================================================ JOINS
MOTOR_SLOTS = [("KZ", "LA", "LB", "LC", "LD"), ("LF", "LG", "LH", "LI", "LJ"), ("LL", "LM", "LN", "LO", "LP"),
               ("LR", "LS", "LT", "LU", "LV"), ("LX", "LY", "LZ", "MA", "MB"), ("MD", "ME", "MF", "MG", "MH"),
               ("MJ", "MK", "ML", "MM", "MN"), ("MP", "MQ", "MR", "MS", "MT"), ("MV", "MW", "MX", "MY", "MZ"),
               ("NB", "NC", "ND", "NE", "NF"), ("NH", "NI", "NJ", "NK", "NL"), ("NN", "NO", "NP", "NQ", "NR"),
               ("NT", "NU", "NV", "NW", "NX")]
TRAILER_SLOTS = ["NZ", "OA", "OB", "OC", "OD", "OE", "OF", "OG", "OH", "OI"]


def motor_names_for(rows):
    out = set()
    for r in rows:
        v = BDATA.get(r, {})
        for slot in MOTOR_SLOTS:
            n = v.get(slot[0])
            if n and not is_quarantined(n) and not is_sentinel(n):
                out.add(norm(n))
    return out


def trailer_names_for(rows):
    out = set()
    for r in rows:
        v = BDATA.get(r, {})
        for L in TRAILER_SLOTS:
            n = v.get(L)
            if n and not is_quarantined(n) and not is_sentinel(n):
                out.add(norm(n))
    return out


JOIN_COLS_MOTOR = [
    dict(k="boat", n="Boat", t="reference", s="pairing", d="The hull this pairing is for."),
    dict(k="motor", n="Motor", t="reference", s="pairing", d="The motor, matched to Motor Library!C by the exact display-name string the sheet types."),
    dict(k="slot", n="Slot", t="number", s="pairing", d="Which of the thirteen hand-curated motor slots on the boat row this came from (1 = Boat Module!KZ, the Recommended Motor Option)."),
    dict(k="rec", n="Recommended", t="boolean", s="pairing", d="True for slot 1 — Boat Module!KZ is literally headed “Recommended Motor Option”."),
    dict(k="rig", n="Rigging Kit Option", t="text", s="rigging", d="True of THIS motor on THIS hull and of neither alone — which is exactly why it lives on the join."),
    dict(k="prop", n="Prop Part No.", t="text", s="rigging", d="Prop part number for the pairing."),
    dict(k="propd", n="Prop Description", t="text", s="rigging", d="Prop description for the pairing."),
    dict(k="hole", n="Engine Hole", t="text", s="rigging", d="Transom engine hole for the pairing."),
    dict(k="src", n="Source", t="text", s="source", d="Sheet, row and slot columns this pairing was read from."),
]
JOIN_COLS_TRAILER = [
    dict(k="boat", n="Boat", t="reference", s="pairing", d="The hull this pairing is for."),
    dict(k="trailer", n="Trailer", t="reference", s="pairing", d="The trailer, matched to Trailer Module!C by the exact name string the sheet types."),
    dict(k="slot", n="Slot", t="number", s="pairing", d="Which of the ten trailer slots on the boat row this came from (1 = Boat Module!NZ, Std Trailer)."),
    dict(k="std", n="Standard", t="boolean", s="pairing", d="True for slot 1 — Boat Module!NZ is headed “Std Trailer”."),
    dict(k="src", n="Source", t="text", s="source", d="Sheet, row and slot column this pairing was read from."),
]


def build_motor_join(key, name, boat_tbl, boat_rows, motor_tbl, motor_names, desc):
    rows = []
    for r in boat_rows:
        v = BDATA.get(r, {})
        for i, (a, b_, c_, d_, e_) in enumerate(MOTOR_SLOTS, start=1):
            mn = v.get(a)
            if not mn or is_quarantined(mn) or is_sentinel(mn):
                continue
            mn = norm(mn)
            if mn not in motor_names:
                continue
            rows.append({
                "boat": norm(v.get("C", "")), "motor": mn, "slot": i, "rec": i == 1,
                "rig": None if not v.get(b_) or is_sentinel(v.get(b_)) or is_quarantined(v.get(b_)) else norm(v[b_]),
                "prop": None if not v.get(c_) or is_sentinel(v.get(c_)) or is_quarantined(v.get(c_)) else norm(v[c_]),
                "propd": None if not v.get(d_) or is_sentinel(v.get(d_)) or is_quarantined(v.get(d_)) else norm(v[d_]),
                "hole": None if not v.get(e_) or is_sentinel(v.get(e_)) or is_quarantined(v.get(e_)) else norm(v[e_]),
                "src": f"Boat Module!R{r} {a}..{e_}",
            })
    return dict(key=key, name=name, kind="package", role="join", accent="violet", levels=[],
                sections=[("pairing", "Pairing"), ("rigging", "Rigging"), ("source", "Source")],
                cols=JOIN_COLS_MOTOR, rows=rows, refs={"boat": boat_tbl, "motor": motor_tbl},
                refkeys={"boat": "c", "motor": "c"}, display="boat", desc=desc)


def build_trailer_join(key, name, boat_tbl, boat_rows, trl_tbl, trl_names, desc):
    rows = []
    for r in boat_rows:
        v = BDATA.get(r, {})
        for i, L in enumerate(TRAILER_SLOTS, start=1):
            tn = v.get(L)
            if not tn or is_quarantined(tn) or is_sentinel(tn):
                continue
            tn = norm(tn)
            if tn not in trl_names:
                continue
            rows.append({"boat": norm(v.get("C", "")), "trailer": tn, "slot": i, "std": i == 1,
                         "src": f"Boat Module!R{r} {L}"})
    return dict(key=key, name=name, kind="package", role="join", accent="violet", levels=[],
                sections=[("pairing", "Pairing"), ("source", "Source")],
                cols=JOIN_COLS_TRAILER, rows=rows, refs={"boat": boat_tbl, "trailer": trl_tbl},
                refkeys={"boat": "c", "trailer": "c"}, display="boat", desc=desc)


# ============================================================ ASSEMBLE
def main():
    boats, sel = build_boats()
    # Only the two brands that get join tables force partner rows into the
    # motor and trailer catalogues — a link that cannot resolve is not a link.
    joined = sel["highfield"] + sel["stacer"]
    wanted_motors = motor_names_for(joined)
    wanted_trailers = trailer_names_for(joined)
    trailers = build_trailers(wanted_trailers)
    motors = build_motors(wanted_motors)
    forced_parts = set()
    for t in boats:
        pass
    parts = build_parts(forced_parts)

    have_motor = {t["key"]: {r["c"] for r in t["rows"]} for t in motors}
    have_trl = {t["key"]: {r["c"] for r in t["rows"]} for t in trailers}

    joins = [
        build_motor_join("join_hf_yam", "Highfield × Yamaha — Motor Fitment", "boat_highfield",
                         sel["highfield"], "mot_yamaha", have_motor["mot_yamaha"],
                         "Boat Module (5).xlsx · the thirteen motor slots on every Highfield row (KZ..LD, LF..LJ … NT..NX). "
                         "The rigging kit, prop part number, prop description and engine hole are facts about THAT motor on "
                         "THAT hull, so they live here and on no base table. Slots reading “NR - ENGINE NOT REQUIRED” are not rows."),
        build_motor_join("join_stacer_yam", "Stacer × Yamaha — Motor Fitment", "boat_stacer",
                         sel["stacer"], "mot_yamaha", have_motor["mot_yamaha"],
                         "The same thirteen-slot menu, read off the Stacer rows. One kind, one rule, two brands — which is the "
                         "whole reason TableKind exists apart from the table."),
        build_trailer_join("join_hf_trl", "Highfield × NSM Custom — Trailer Fitment", "boat_highfield",
                           sel["highfield"], "trl_nsmcustom", have_trl["trl_nsmcustom"],
                           "Boat Module (5).xlsx · Std Trailer (NZ) plus Trailer Option 2–10 (OA..OI) on every Highfield row, "
                           "resolved against the custom cradle series the Trailer Module runs per boat model. "
                           "“TRAILER NOT REQUIRED” is a sentinel, not a trailer."),
        build_trailer_join("join_stacer_trl", "Stacer × Stacer Trailers — Trailer Fitment", "boat_stacer",
                           sel["stacer"], "trl_stacertrailers", have_trl["trl_stacertrailers"],
                           "The same ten trailer slots read off the Stacer rows, resolved into the Stacer trailer catalogue."),
    ]

    tables = boats + trailers + motors + parts + joins
    return tables, sel


if __name__ == "__main__":
    tables, sel = main()
    tot = 0
    for t in tables:
        tot += len(t["rows"])
        print(f'{t["name"]:42s} {t["kind"]:9s} {t["role"]:5s} cols {len(t["cols"]):3d} rows {len(t["rows"]):4d}')
    print("TOTAL ROWS", tot)
