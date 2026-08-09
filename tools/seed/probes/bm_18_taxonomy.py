import openpyxl, sys, json, re, collections
sys.stdout.reconfigure(encoding='utf-8')
P = r"C:/Users/AsafA/Downloads/Boat Module (5).xlsx"
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
wb=openpyxl.load_workbook(P, read_only=True, data_only=True); ws=wb["Boat Module"]
rows=[]
for i,row in enumerate(ws.iter_rows(min_row=1,max_row=2310,min_col=1,max_col=6,values_only=True), start=1):
    rows.append((i,row[0],row[2],row[3],row[4]))  # A, C, D, E
wb.close()
json.dump([[i,str(a),str(c),str(d),str(e)] for i,a,c,d,e in rows], open(SP+"bm_ACDE.json","w"), indent=0)

HDR={1,3,143,200,226,233,248,262,278,949,951,955}
LIVE=[r for r in rows if r[0]<1005]
OBS=[r for r in rows if r[0]>=1006]
def summ(lst,label,lo,hi):
    print(f"\n===== {label} (rows {lo}-{hi}) =====")
    cur_brand=None
    for i,a,c,d,e in lst:
        if i in HDR:
            cur_brand=c; print(f"  [BRAND HEADER R{i}] A={a} C={c}")
        elif c and not d:
            print(f"    [SECTION R{i}] {c}")
    # counts by Matrix
    cnt=collections.Counter(e for i,a,c,d,e in lst if d and i not in HDR and e)
    print("   variant rows by Matrix:", dict(cnt))
summ([r for r in rows if r[0]<=1004],"LIVE / CURRENT",1,1004)

print("\n===== Model-code prefixes (D) by Matrix =====")
byM=collections.defaultdict(collections.Counter)
for i,a,c,d,e in rows:
    if i in HDR or not d: continue
    m=re.match(r'^([A-Za-z]+)', str(d))
    byM[str(e)][m.group(1) if m else "?"]+=1
for m in sorted(byM):
    print(f"  {m}: {dict(byM[m].most_common(12))}")

print("\n===== Highfield 2026 Range: model families (rows 282-947) =====")
fam=collections.Counter()
for i,a,c,d,e in rows:
    if 282<=i<=947 and d:
        mm=re.match(r'Highfield - ([A-Z]+)\s*(\d+)?', str(c))
        fam[(mm.group(1) if mm else str(c)[:22])]+=1
for k,v in fam.most_common(60): print(f"   {k}: {v}")

print("\n===== Highfield 2026 Range: distinct model tokens =====")
toks=collections.Counter()
for i,a,c,d,e in rows:
    if 282<=i<=947 and d:
        mm=re.match(r'Highfield - (\S+)', str(c))
        if mm: toks[mm.group(1)]+=1
print("   n distinct model tokens:", len(toks))
print("   ", sorted(toks))
