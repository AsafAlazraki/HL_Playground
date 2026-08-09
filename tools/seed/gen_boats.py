"""Build the boat brand tables from the Boat Module dump."""
import json, re, sys
sys.path.insert(0, r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from gen_lib import profile_column, coerce, is_quarantined, is_sentinel

SC = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
HDR = json.load(open(SC + "b2_headers.json", encoding="utf-8"))
DATA = {int(k): v for k, v in json.load(open(SC + "b2_data.json", encoding="utf-8")).items()}
ROW1 = HDR["1"]

# band -> (section id, section name, columns)
BANDS = [
    ("identity", "Identity", ["C", "D", "E", "F", "G", "H", "I", "K", "L", "M"]),
    ("capacity", "Capacity", ["O", "P", "Q"]),
    ("construction", "Construction", ["S", "T", "U"]),
    ("cost-build", "Cost Build", ["IM", "IQ", "IU", "IV", "IX", "IY"]),
    ("markups", "MARKUPS", ["JF", "JG"]),
    ("motor-envelope", "Motor Envelope", ["KV", "KW", "KX", "KY"]),
    ("registration", "Registration", ["KM"]),
    ("lead-times", "Factory Lead Times (in Days)", ["QO"]),
    ("pricing", "Hull Only Pricing", ["QR", "QT", "QV", "QX", "QZ", "RB"]),
]
IMAGE_COLS = {"F"}
# columns whose meaning is fixed by the master header row when a brand banner
# leaves the cell blank
FALLBACK = ROW1

BRANDS = [
    dict(key="stacer", name="Stacer", hdr=3, r0=4, r1=142, mode="series", budget=32),
    dict(key="stabicraft", name="Stabicraft", hdr=143, r0=144, r1=199, mode="series", budget=40),
    dict(key="surtees", name="Surtees", hdr=200, r0=201, r1=225, mode="series", budget=25),
    dict(key="jeanneau", name="Jeanneau", hdr=226, r0=227, r1=232, mode="flat", budget=10),
    dict(key="merryfisher", name="Merry Fisher", hdr=233, r0=234, r1=247, mode="flat", budget=14),
    dict(key="capcamarat", name="Cap Camarat", hdr=248, r0=249, r1=261, mode="flat", budget=13),
    dict(key="haines", name="Haines Signature", hdr=262, r0=263, r1=277, mode="series", budget=12),
    dict(key="highfield", name="Highfield Inflatables", hdr=278, r0=281, r1=948, mode="hf", budget=46),
    dict(key="formosa", name="Formosa", hdr=955, r0=956, r1=1004, mode="flat", budget=30),
]

HF_SERIES = [
    ("Coaster", "Coaster"), ("ADV", "Adventure"), ("SP", "Sport"), ("CL", "Classic"),
    ("PA", "Patrol"), ("UL", "Ultralite"), ("RU", "Roll-Up"),
]
SP560_ROWS = list(range(829, 836)) + list(range(837, 845))


def strip_brand(label, brand):
    m = re.match(r"^\s*(.+?)\s+-\s+(.*)$", label)
    if m:
        head = m.group(1).strip().lower()
        if head.replace(" ", "") in brand.lower().replace(" ", "") or brand.lower().startswith(head[:6]):
            return m.group(2).strip()
    return label.strip()


def hf_parts(name):
    """'Highfield - SP560 (PVC) W-W-WB' -> ('Sport', 'SP560', 'PVC W-W-WB')"""
    body = name.split(" - ", 1)[1] if " - " in name else name
    m = re.match(r"^(\S+)\s*(?:\((\w+)\))?\s*(.*)$", body.strip())
    token = m.group(1) if m else body
    material = m.group(2) if m and m.group(2) else None
    colour = m.group(3).strip() if m and m.group(3) else None
    series = None
    for pref, sname in HF_SERIES:
        if token.startswith(pref):
            series = sname
            break
    variant = " ".join(x for x in [material, colour] if x) or None
    return series, token, variant


def build():
    tables = []
    picked_rows = {}
    for b in BRANDS:
        hdr = HDR[str(b["hdr"])]
        # ---- gather rows
        skus, series_of, order = [], {}, []
        cur = None
        for r in range(b["r0"], b["r1"] + 1):
            v = DATA.get(r)
            if not v:
                continue
            if b["mode"] == "hf":
                if not v.get("D"):
                    continue
                s, _, _ = hf_parts(str(v["C"]))
                cur = s
            elif not v.get("D"):
                if b["mode"] == "series":
                    cur = strip_brand(str(v["C"]), b["name"])
                continue
            skus.append(r)
            series_of[r] = cur
            order.append(r)
        # ---- select a representative slice
        groups = {}
        for r in skus:
            groups.setdefault(series_of[r] or "", []).append(r)
        chosen = set(SP560_ROWS) if b["mode"] == "hf" else set()
        chosen &= set(skus)
        i = 0
        while len(chosen) < b["budget"] and any(len(v) > i for v in groups.values()):
            for g in groups.values():
                if i < len(g) and len(chosen) < b["budget"]:
                    chosen.add(g[i])
            i += 1
        sel = sorted(chosen)
        picked_rows[b["key"]] = sel

        # ---- decide columns: brand header names it AND the brand uses it
        cols, sections = [], []
        for sid, sname, letters in BANDS:
            band_cols = []
            for L in letters:
                vals = [DATA[r][L] for r in sel if L in DATA[r]]
                vals = [v for v in vals if not is_quarantined(v)]
                if not vals:
                    continue
                label = hdr.get(L) or FALLBACK.get(L)
                if L == "C":
                    label = "Model" if b["mode"] != "hf" else "Boat"
                if L == "E":
                    label = "Matrix"
                if not label:
                    continue
                if L in IMAGE_COLS:
                    band_cols.append(dict(k=L.lower(), n=label, t="image", s=sid,
                                          d=f"Boat!{L} on this brand's rows."))
                    continue
                prof = profile_column(vals)
                if prof is None:
                    continue
                if prof["type"] == "text":
                    kept = [v for v in vals if not is_sentinel(v)]
                    if not kept:
                        continue
                name = label if not prof.get("unit") else f"{label} {prof['unit']}"
                desc = f"Boat!{L} — labelled “{label}” on {b['name']}'s own header row {b['hdr']}."
                if hdr.get(L) is None:
                    desc = (f"Boat!{L} — {b['name']}'s header row {b['hdr']} leaves this cell blank; "
                            f"the label “{label}” is the master header (row 1).")
                if prof.get("scale"):
                    desc += " Source mixes m and cm in the same column; metres are normalised to cm."
                band_cols.append(dict(k=L.lower(), n=name, t=prof["type"], s=sid, d=desc,
                                      _prof=prof, _col=L))
            if band_cols:
                sections.append((sid, sname))
                cols += band_cols

        # ---- hierarchy columns, prepended into the identity band
        lvl = []
        if b["mode"] == "hf":
            lvl = [dict(k="series", n="Series", t="text", s="identity",
                        d="Recovered from the model-code token prefix (SP=Sport, CL=Classic, PA=Patrol, UL=Ultralite, RU=Roll-Up, ADV=Adventure, Coaster). The live 2026 block has no series rows."),
                   dict(k="model", n="Model", t="text", s="identity",
                        d="Recovered from Boat!C — the model token inside the name string."),
                   dict(k="variant", n="Variant", t="text", s="identity",
                        d="Material × colourway, recovered from Boat!C. Highfield is the only brand that splits this far.")]
        elif b["mode"] == "series":
            lvl = [dict(k="series", n="Series", t="text", s="identity",
                        d=f"The series banner row above each run — a Boat!C cell with Boat!D (Model Code) empty. Brand prefix stripped.")]
        cols = lvl + cols

        # ---- rows
        out = []
        for r in sel:
            v = DATA[r]
            row = {}
            if b["mode"] == "hf":
                s, tok, var = hf_parts(str(v["C"]))
                row["series"], row["model"], row["variant"] = s, tok, var
            elif b["mode"] == "series":
                row["series"] = series_of[r]
            for c in cols:
                if "_col" not in c and c["t"] != "image":
                    continue
                L = c.get("_col") or c["k"].upper()
                raw = v.get(L)
                if c["t"] == "image":
                    if raw and not is_quarantined(raw) and str(raw).strip():
                        row[c["k"]] = str(raw).strip()
                    continue
                row[c["k"]] = coerce(raw, c["_prof"])
            row["src"] = f"Boat Module!R{r}"
            out.append(row)

        for c in cols:
            c.pop("_prof", None)
            c.pop("_col", None)
        cols.append(dict(k="src", n="Source", t="text", s="source",
                         d="The workbook sheet and row this record was read from."))
        sections.append(("source", "Source"))

        tables.append(dict(
            key=b["key"], name=b["name"], kind="boat", role="base", accent="blue",
            levels=(["series", "model", "variant"] if b["mode"] == "hf"
                    else (["series", "model"] if b["mode"] == "series" else [])),
            sections=sections, cols=cols, rows=out, keycol="c", mode=b["mode"],
            hdrrow=b["hdr"], span=(b["r0"], b["r1"]), total=len(skus),
        ))
    return tables, picked_rows


if __name__ == "__main__":
    ts, picked = build()
    for t in ts:
        print(t["name"], "| cols", len(t["cols"]), "| rows", len(t["rows"]), "| of", t["total"])
        print("   ", " · ".join(c["n"] for c in t["cols"]))
