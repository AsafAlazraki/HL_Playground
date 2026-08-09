import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
from s8_formulas import formulas, norm
V,F,mr,mc=grid("Dealer Fit Options")
fs=formulas("Dealer Fit Options")
print("Dealer Fit Options: max_row=%d max_col=%d"%(mr,mc))
print("\n--- ROWS 1..70, cols A..M (values; [F] if formula) ---")
for i in range(1,71):
    cells=[]
    for j in range(1,14):
        L=get_column_letter(j); v=V[i][j]; f=fs.get((L,i))
        if v is None and not f: continue
        if f and f[0]:
            cells.append("%s%d=[F]%s%s"%(L,i,norm(f[0],i)[:110], (" ->"+repr(v)[:45]) if v is not None else ""))
        elif v is not None:
            cells.append("%s%d=%s"%(L,i,repr(v)[:110]))
    if cells: print(" r%-3d %s"%(i," | ".join(cells)))
print("\n--- rows 71..472: non-empty summary (any col A..AP) ---")
cnt=0
for i in range(71,mr+1):
    cells=[]
    for j in range(1,mc+1):
        L=get_column_letter(j); v=V[i][j]
        if v is not None: cells.append("%s=%s"%(L,repr(v)[:70]))
    if cells:
        cnt+=1
        if cnt<=60: print(" r%-4d %s"%(i," | ".join(cells)[:400]))
print("  ...non-empty rows in 71..%d = %d"%(mr,cnt))
