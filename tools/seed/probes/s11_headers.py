import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
BRANDS=["Stabicraft","Surtees","Stacer","Formosa","Jeanneau","Haines Signature","Highfield","Boat Show"]
for b in BRANDS:
    V,F,mr,mc=grid(b)
    # find header row: row containing 'SELL PRICE' or 'Location'
    hdr=None
    for i in range(1,20):
        rowtxt=[str(V[i][j]) for j in range(1,mc+1) if V[i][j] is not None]
        if any('SELL PRICE' in t.upper() for t in rowtxt) or any(t=='Location' for t in rowtxt):
            hdr=i; break
    print("\n"+"="*95)
    print("### %s  (%d x %d)   header row = %s"%(b,mr,mc,hdr))
    print("="*95)
    for i in range(1,12):
        cells=[]
        for j in range(1,min(mc,16)+1):
            L=get_column_letter(j)
            if V[i][j] is not None: cells.append("%s=%r"%(L,V[i][j]))
        if cells: print("  r%-3d %s"%(i," | ".join(cells)[:340]))
    # per-column non-empty counts below header
    if hdr:
        print("  -- column occupancy below header (rows %d..%d):"%(hdr+1,mr))
        for j in range(1,mc+1):
            L=get_column_letter(j)
            n=sum(1 for i in range(hdr+1,mr+1) if V[i][j] is not None)
            if n: print("       %-3s hdr=%-22r n=%d"%(L,V[hdr][j],n))
