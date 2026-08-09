import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
import collections
# 1. DFO cols N..AP check
V,F,mr,mc=grid("Dealer Fit Options")
nz=[(get_column_letter(j),i,V[i][j]) for i in range(1,71) for j in range(14,mc+1) if V[i][j] is not None]
print("DFO cols N..AP rows1-70 non-empty:", len(nz), nz[:20])

# 2. Dropdowns
V,F,mr,mc=grid("Dropdowns")
print("\n=== DROPDOWNS %d x %d ==="%(mr,mc))
for j in range(1,mc+1):
    L=get_column_letter(j)
    col=[V[i][j] for i in range(1,mr+1)]
    hdr=col[0]
    vals=[v for v in col[1:] if v is not None and str(v).strip()!=""]
    uniq=list(dict.fromkeys(map(str,vals)))
    last=max([i for i in range(1,mr+1) if V[i][j] is not None], default=0)
    dupes=len(vals)-len(uniq)
    print("\n  col %s  header=%r"%(L,hdr))
    print("      entries=%d  distinct=%d  dupes=%d  lastRow=%d"%(len(vals),len(uniq),dupes,last))
    for s in uniq[:5]: print("        - %s"%s[:120])
