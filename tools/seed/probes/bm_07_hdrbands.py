import json, sys
sys.stdout.reconfigure(encoding='utf-8')
from openpyxl.utils import get_column_letter as gl
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
H = json.load(open(SP+"bm_headers.json"))
r1 = {int(j):v for j,v in H["1"]}
r278 = {int(j):v for j,v in H["278"]}
r3 = {int(j):v for j,v in H["3"]}
r2 = {int(j):v for j,v in H["2"]}
r949 = {int(j):v for j,v in H["949"]}
r955 = {int(j):v for j,v in H["955"]}

allc = sorted(set(r1)|set(r278)|set(r3))
print("col range:", gl(min(allc)), gl(max(allc)))
# band detection: contiguous runs in r278
runs=[]; cur=[]
for c in range(3, 700):
    if c in r278: cur.append(c)
    else:
        if cur: runs.append((cur[0],cur[-1])); cur=[]
if cur: runs.append((cur[0],cur[-1]))
print("\nBANDS (contiguous non-empty runs in HIGHFIELD header R278), separated by blank spacer cols:")
for a,b in runs:
    print(f"  {gl(a)}..{gl(b)} ({b-a+1} cols)  first='{r278[a]}'  last='{r278[b]}'")

print("\n--- W..CA labels R1 / R3(Stacer) / R278(Highfield) ---")
for c in range(23, 82):
    print(f"{gl(c)}\tR1={r1.get(c,'')}\tR3={r3.get(c,'')}\tR278={r278.get(c,'')}")

print("\n--- Divergent headers R1 vs R3(Stacer) vs R278(Highfield) vs R949(Yamaha) vs R955(Formosa) cols C..T ---")
for c in range(3, 23):
    print(f"{gl(c)}\tBOAT='{r1.get(c,'')}'\tSTACER='{r3.get(c,'')}'\tHIGHFIELD='{r278.get(c,'')}'\tYAMAHA='{r949.get(c,'')}'\tFORMOSA='{r955.get(c,'')}'")

print("\n--- row2 check-code reference sample (col -> number) ---")
ks=sorted(r2)
print("range", gl(ks[0]), gl(ks[-1]), "n=",len(ks))
print([f"{gl(k)}={r2[k]}" for k in ks[:12]], "...", [f"{gl(k)}={r2[k]}" for k in ks[-12:]])
