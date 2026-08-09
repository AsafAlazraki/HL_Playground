import json, sys, re
sys.stdout.reconfigure(encoding='utf-8')
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
recs = json.load(open(SP+"bm_rowmap.json"))
HDR = {1,3,143,200,226,233,248,262,278,949,951,955}
data=[r for r in recs if r["D"] not in (None,"","None") and r["r"] not in HDR]
print("DATA ROWS (D non-empty, not header):", len(data))
print("row range:", data[0]["r"], "-", data[-1]["r"])
# count blank rows
blank=[r for r in recs if r["n"]==0]
print("fully blank rows:", len(blank))
# distribution of data rows by 100s
import collections
b=collections.Counter((r["r"]//100)*100 for r in data)
print("data rows per 100-row bucket:", dict(sorted(b.items())))
# rows beyond 1950
tail=[r for r in recs if r["r"]>1950 and r["n"]>0]
print("\nnon-empty rows after 1950:", len(tail))
for r in tail[:80]:
    print(f"  R{r['r']} n={r['n']} C={str(r['C'])[:70]} D={str(r['D'])[:30]}")
# search for Sport 560 mentions in C/D
print("\nC/D mentions of 560:")
for r in recs:
    s=f"{r['C']} {r['D']}"
    if re.search(r"560|SP560|S560", s, re.I):
        print(f"  R{r['r']}: C={r['C']} | D={r['D']} | n={r['n']}")
