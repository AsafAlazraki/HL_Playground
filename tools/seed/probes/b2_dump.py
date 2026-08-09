import openpyxl, json, sys
from openpyxl.utils import get_column_letter, column_index_from_string as ci

P = r"C:/Users/AsafA/Downloads/Boat Module (5).xlsx"
OUT = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"

KEEP = []
for a, b in [("A", "U"), ("II", "LD"), ("LF", "OI"), ("QC", "RK"), ("SV", "UJ")]:
    KEEP += list(range(ci(a), ci(b) + 1))
KEEPSET = set(KEEP)
MAXC = max(KEEP)

HEADERS = [1, 2, 3, 143, 200, 226, 233, 248, 262, 278, 280, 955]

wb = openpyxl.load_workbook(P, read_only=True, data_only=True)
ws = wb["Boat Module"]

data = {}
hdr = {}
for r, row in enumerate(ws.iter_rows(min_row=1, max_row=1010, min_col=1, max_col=MAXC), start=1):
    if r in HEADERS:
        d = {}
        for i, c in enumerate(row, start=1):
            v = c.value
            if v is not None and str(v).strip() != "":
                d[get_column_letter(i)] = str(v)
        hdr[r] = d
    d = {}
    for i, c in enumerate(row, start=1):
        if i not in KEEPSET:
            continue
        v = c.value
        if v is not None and str(v).strip() != "":
            d[get_column_letter(i)] = v if isinstance(v, (int, float, bool)) else str(v)
    if d:
        data[r] = d

json.dump(hdr, open(OUT + "b2_headers.json", "w", encoding="utf-8"), ensure_ascii=False, default=str)
json.dump(data, open(OUT + "b2_data.json", "w", encoding="utf-8"), ensure_ascii=False, default=str)
print("headers", len(hdr), "datarows", len(data), file=sys.stderr)
wb.close()
