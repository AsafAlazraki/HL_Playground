"""Dump Service Module (1).xlsx · "Labour Rates" + "Oils and Lubes" -> extracts/sv_rates.json.

READ-ONLY. Open it, never save it.

WHY NOT openpyxl. This is the one workbook that cannot go through the usual
`load_workbook` path, and the reason is worth writing down: the file is 30.7 MB
on disk and `xl/worksheets/sheet1.xml` — `Std Service Schedules` — is
**236,476,064 bytes** of it, a sheet whose <dimension> claims 23 million cells
and whose last real value sits at row 280. openpyxl parses every worksheet it is
asked for and will happily spend gigabytes of RAM on a sheet we have decided not
to import. So this probe reads the two sheets it wants straight out of the zip:

    Labour Rates    -> xl/worksheets/sheet5.xml    12,430 bytes
    Oils and Lubes  -> xl/worksheets/sheet4.xml    17,597 bytes

(The mapping is workbook.xml r:id -> workbook.xml.rels Target, resolved below
rather than hard-coded, because sheet order and file numbering do not agree in
this file: sheetId 5 is sheet1.xml.)

WHAT COMES OUT, and what does NOT — SERVICE_AND_THEMES.md §4:
  IN   Labour Rates    18 live rows (9-11, 13-15, 17-24, 26-29) · the price of
                       an hour, read by five sheets in four workbooks by
                       absolute cell (`$G$14` = 130.0909, `$H$9` = 159).
  IN   Oils and Lubes  30 live rows in three blocks (9-20, 22-31, 33-39) · the
                       price of a litre, including the fuel the boat
                       pre-delivery build reads at both rungs.
  OUT  Std Service Schedules — "a rule written out 1,727 times", and it carries
       a uniform ~20% cost defect at the 1,000-hour interval (+$427.82 / 19.5%
       on row 4). We do not import a spreadsheet's arithmetic errors as fact.
  OUT  Operation Codes (366 rows, deferred), Schedule Notes (a document),
       Dropdowns (a hidden Excel artefact).

VALUES, NOT FORMULAS. The <v> element of a formula cell is the cached result
Excel last computed, which is what every other extract in this directory stores.
`Labour Rates!G9` is `=H9/1.1` and lands here as 144.5454...; that is the number
the four consumer workbooks actually read.

The file's last-saved date is dumped too, under key "_meta". SERVICE_AND_THEMES
§2.6 is the reason: a rate copied out of here is a rate frozen on the day it was
copied, so the day has to travel with it.
"""
import json, re, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

P = r"C:/Users/AsafA/Downloads/Service Module (1).xlsx"
OUT = str(Path(__file__).resolve().parent.parent / "extracts") + "/"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
WANT = ["Labour Rates", "Oils and Lubes"]
MAXROW = 60


def sheet_targets(z):
    """sheet name -> zip path, resolved through r:id. Never hard-coded."""
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    target = {r.get("Id"): r.get("Target") for r in rels}
    out = {}
    for s in wb.iter(NS + "sheet"):
        t = target[s.get(rid)]
        out[s.get("name")] = "xl/" + t.lstrip("/").replace("xl/", "", 1)
    return out


def shared_strings(z):
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    return ["".join(t.text or "" for t in si.iter(NS + "t")) for si in root.iter(NS + "si")]


def read_sheet(z, path, sst):
    root = ET.fromstring(z.read(path))
    data = {}
    for c in root.iter(NS + "c"):
        ref = c.get("r")
        m = re.match(r"([A-Z]+)(\d+)", ref)
        col, row = m.group(1), int(m.group(2))
        if row > MAXROW:
            continue
        v = c.find(NS + "v")
        t = c.get("t")
        if t == "inlineStr":
            isel = c.find(NS + "is")
            val = "".join(x.text or "" for x in isel.iter(NS + "t")) if isel is not None else None
        elif v is None or v.text is None:
            val = None
        elif t == "s":
            val = sst[int(v.text)]
        elif t == "e":
            val = v.text                      # a live Excel error, kept verbatim
        elif t == "str":
            val = v.text
        else:
            val = float(v.text)
            if val.is_integer():
                val = int(val)
        if val is None or (isinstance(val, str) and val.strip() == ""):
            continue
        data.setdefault(row, {})[col] = val
    return data


z = zipfile.ZipFile(P)
targets = sheet_targets(z)
print("SHEETS", list(targets), file=sys.stderr)
sst = shared_strings(z)

core = z.read("docProps/core.xml").decode("utf-8", errors="replace")
saved = re.search(r"<dcterms:modified[^>]*>([^<]+)<", core)
out = {"_meta": {"workbook": "Service Module (1).xlsx",
                 "modified": saved.group(1) if saved else None}}
for name in WANT:
    d = read_sheet(z, targets[name], sst)
    out[name] = {str(k): v for k, v in sorted(d.items())}
    print("==", name, targets[name], len(d), "rows", file=sys.stderr)
    for r in sorted(d):
        print("  ", r, d[r], file=sys.stderr)

json.dump(out, open(OUT + "sv_rates.json", "w", encoding="utf-8"), ensure_ascii=False)
print("modified", out["_meta"]["modified"], file=sys.stderr)
z.close()
