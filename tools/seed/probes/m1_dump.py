import openpyxl, json, sys
from openpyxl.utils import get_column_letter as gl, column_index_from_string as ci

P = r"C:/Users/AsafA/Downloads/Copy of Motor Module (1).xlsx"
OUT = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"

KEEP = set()
for a, b in [("A", "CY"), ("EY", "FI")]:
    KEEP |= set(range(ci(a), ci(b) + 1))
MAXC = max(KEEP)

wb = openpyxl.load_workbook(P, read_only=True, data_only=True)
print("SHEETS", wb.sheetnames, file=sys.stderr)
ws = wb["Motor Library"]
print("DIMS", ws.max_row, ws.max_column, file=sys.stderr)

data = {}
style = {}
for r, row in enumerate(ws.iter_rows(min_row=1, max_row=345, min_col=1, max_col=MAXC), start=1):
    d = {}
    for i, c in enumerate(row, start=1):
        if i not in KEEP:
            continue
        v = c.value
        if v is not None and str(v).strip() != "":
            d[gl(i)] = v if isinstance(v, (int, float, bool)) else str(v)
        if i == 3 and v is not None and str(v).strip() != "":
            try:
                style[r] = {"sz": c.font.sz, "b": c.font.b}
            except Exception:
                pass
    if d:
        data[r] = d

json.dump(data, open(OUT + "m1_data.json", "w", encoding="utf-8"), ensure_ascii=False, default=str)
json.dump(style, open(OUT + "m1_style.json", "w", encoding="utf-8"), ensure_ascii=False, default=str)
print("rows", len(data), file=sys.stderr)
wb.close()
