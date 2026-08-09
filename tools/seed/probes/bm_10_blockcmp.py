import json, sys
sys.stdout.reconfigure(encoding='utf-8')
from openpyxl.utils import get_column_letter as gl
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
raw = json.load(open(SP+"bm_sp560_raw.json")); V=raw["values"]; F=raw["formulas"]
H = json.load(open(SP+"bm_headers.json")); hdr={gl(int(j)):v for j,v in H["278"]}

# map model code -> row for both blocks
A={}; B={}
for r in range(825,850):
    d=V.get(str(r),{})
    if d.get("D"): A[d["D"]]=str(r)
for r in range(1531,1552):
    d=V.get(str(r),{})
    if d.get("D"): B[d["D"]]=str(r)
print("BLOCK A (rows 829-844) codes:", sorted(A.items(), key=lambda x:x[1]))
print("BLOCK B (rows 1534-1548) codes:", sorted(B.items(), key=lambda x:x[1]))

common = sorted(set(A)&set(B))
print("\ncommon codes:", len(common))
diffs={}
for code in common:
    ra, rb = A[code], B[code]
    da, db = V.get(ra,{}), V.get(rb,{})
    keys = set(da)|set(db)
    for k in keys:
        va, vb = da.get(k), db.get(k)
        if str(va)!=str(vb):
            diffs.setdefault(k, []).append((code, va, vb))
print("\ncolumns that differ between A and B (col, header, n_codes_differing, example):")
for k in sorted(diffs, key=lambda x:(len(x),x)):
    lst=diffs[k]
    ex=lst[0]
    print(f"  {k} [{hdr.get(k,'')}] n={len(lst)}  e.g. {ex[0]}: A='{str(ex[1])[:60]}' B='{str(ex[2])[:60]}'")

# columns present only in A
onlyA = set()
for code in common:
    onlyA |= (set(V.get(A[code],{})) - set(V.get(B[code],{})))
print("\ncols present in A but absent in B:", sorted(onlyA, key=lambda c: len(c))[:80])
onlyB = set()
for code in common:
    onlyB |= (set(V.get(B[code],{})) - set(V.get(A[code],{})))
print("cols present in B but absent in A:", sorted(onlyB, key=lambda c: len(c))[:80])
