import json, sys
sys.stdout.reconfigure(encoding='utf-8')
from openpyxl.utils import get_column_letter as gl
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"

H   = json.load(open(SP+"bm_headers.json"))
ENU = json.load(open(SP+"bm_enums.json"))
FPAT= json.load(open(SP+"bm_formula_patterns.json"))
LIVE= json.load(open(SP+"bm_live560_raw.json"))
OBS = json.load(open(SP+"bm_sp560_raw.json"))
DD  = json.load(open(SP+"bm_dropdowns.json"))
HITS= json.load(open(SP+"bm_560_hits.json"))

hdr278 = {gl(int(j)): v for j, v in H["278"]}
hdr1   = {gl(int(j)): v for j, v in H["1"]}
HH = lambda c: hdr278.get(c) or hdr1.get(c, "")

def variant(block, rows):
    out = []
    for r in rows:
        d = block.get(str(r), {})
        if not d.get("D"): continue
        out.append({"row": r, "cells": {c: v for c, v in d.items() if v not in (".",)},
                    "labelled": {f"{c} [{HH(c)}]": v for c, v in d.items() if v not in (".",)}})
    return out

dump = {
  "workbook": "C:/Users/AsafA/Downloads/Boat Module (5).xlsx",
  "sheets": [
    {"name":"Boat Module","state":"visible","max_row":4731,"max_col":4144,
     "real_extent":"A1:ZB2301 (data); row 2 'Check Code Referance' extends to ABD2 (col 732); cols beyond ZB are empty padding"},
    {"name":"Dropdowns","state":"hidden","max_row":3479,"max_col":26,
     "populated_cols":["C","H","T","V","X","Z"]}
  ],
  "external_workbook_links": {
    "[1]":"Price Matrix.xlsx  (sheets: Price Matrix, Exchange Rates, Exchange Rate Calculator)",
    "[2]":"Service Module.xlsx (Labour Rates, Std Service Schedules, Operation Codes ...)",
    "[3]":"Parts Module.xlsx (Parts Maintenance, Dealer Fit Module, supplier price lists)",
    "[4]":"Motor Module.xlsx (Motor Library, Rebate Programs, Yamaha_Dealer_Current)",
    "[5]":"Rigging Module.xlsx (Rigging Kits, Rigging Spec Enquiry)",
    "[6]":"Factory Options Module.xlsx (Factory Options Module, Stabicraft, Stacer)",
    "[7]":"Trailer Module.xlsx (Trailer Module, Trailer Spec Enquiry)",
    "[8]":"Suppliers/Highfield/2026/Boat_Price_List_2026-07-01T06-50-01.xlsx (Boat Price List)",
    "[9]":"Freight Module.xlsx (FCL Import - Highfield, Quadrant Pacific - Surtees, Freight Distribution Calculator)",
    "[10]":"Suppliers/Stabicraft/Stabicraft Price List.xlsx",
    "sharepoint_root":"https://northsidemarine1.sharepoint.com/sites/NSMMasterPriceFile/Shared Documents/General/Master Price File/"
  },
  "header_row_1_BOAT_template": {gl(int(j)): v for j, v in H["1"]},
  "header_row_278_HIGHFIELD":  {gl(int(j)): v for j, v in H["278"]},
  "header_row_3_STACER":       {gl(int(j)): v for j, v in H["3"]},
  "per_column_fill_counts": ENU["fill"],
  "per_column_enums_low_cardinality": ENU["enums"],
  "high_cardinality_columns": ENU["highcard"],
  "formula_patterns_by_column": FPAT,
  "dropdowns_sheet": DD,
  "sp560_LIVE_2026_rows_829_844": variant(LIVE["v"], list(range(829,845))),
  "sp560_LIVE_formulas_row829": LIVE["f"].get("829", {}),
  "sp560_OBSOLETE_rows_1534_1548": variant(OBS["values"], list(range(1534,1549))),
  "sp560_OBSOLETE_formulas_row1534": OBS["formulas"].get("1534", {}),
  "all_560_text_hits": HITS,
}
json.dump(dump, open(SP+"BoatModule5_FULL_DUMP.json","w",encoding="utf-8"), indent=1, ensure_ascii=False)
import os
print("wrote", SP+"BoatModule5_FULL_DUMP.json", os.path.getsize(SP+"BoatModule5_FULL_DUMP.json"), "bytes")
