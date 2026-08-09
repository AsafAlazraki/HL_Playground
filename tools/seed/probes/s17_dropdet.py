import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
from s8_formulas import formulas, norm
import collections, re
V,F,mr,mc=grid("Dropdowns")
fs=formulas("Dropdowns")
print("Dropdowns formula cells:", len(fs))
bycol=collections.defaultdict(collections.Counter)
for (c,r),(f,a) in fs.items():
    if f: bycol[c][re.sub(r'\d+','N',f)]+=1
for c in sorted(bycol):
    print("\n col %s: %d formula cells"%(c,sum(bycol[c].values())))
    for p,n in bycol[c].most_common(6): print("     x%-5d %s"%(n,p[:120]))
for col,name in ((2,"B BOAT LIBRARY"),(4,"D DEALER FIT OPTIONS")):
    vals=[str(V[i][col]).strip() for i in range(2,mr+1) if V[i][col] is not None and str(V[i][col]).strip()]
    print("\n=== col %s: %d values ==="%(name,len(vals)))
    print("   first 8:", vals[:8])
    print("   rows 1596-1614:", vals[1594:1612] if col==4 else "")
    # classify
    boatish=[v for v in vals if re.match(r'^(Sport|Classic|Ultralite|Patrol|Roll|Ocean|HIGHFIELD|Stacer|Highfield)\b',v)]
    print("   entries starting with a boat-range word: %d"%len(boatish))
