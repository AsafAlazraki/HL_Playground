import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
import json, collections, re
rows=json.load(open("stockrows.json"))
V,F,mr,mc=grid("Dropdowns")
lib=[str(V[i][2]).strip() for i in range(2,mr+1) if V[i][2] is not None and str(V[i][2]).strip()]
libset=set(lib)
print("Dropdowns!B BOAT LIBRARY: %d rows, %d distinct"%(len(lib),len(libset)))
# also the cached Boat Module list
ext=json.load(open("extlinks.json"))
bm=ext["1"]["cached"]
bmvals=set(str(v).strip() for v in bm.values() if str(v).strip())
print("Boat Module.xlsx cached values: %d"%len(bmvals))

boats=collections.Counter(str(r['boat']).strip() for r in rows if r['boat'])
hitB=[b for b in boats if b in libset]
missB=[b for b in boats if b not in libset]
print("\n=== BOAT (col D) vs Dropdowns!B BOAT LIBRARY, EXACT match ===")
print("  distinct boat strings on brand sheets: %d"%len(boats))
print("  EXACT match in library: %d   NO MATCH: %d  (%.0f%% fail)"%(len(hitB),len(missB),100*len(missB)/len(boats)))
print("\n  sample NO-MATCH boat strings (first 40):")
for b in sorted(missB)[:40]: print("     x%-2d %s"%(boats[b],b))
# fuzzy: does library contain something with same alnum key
def key(s): return re.sub(r'[^a-z0-9]','',s.lower())
libk=collections.defaultdict(list)
for l in libset: libk[key(l)].append(l)
fz=[(b,libk[key(b)]) for b in missB if key(b) in libk]
print("\n  of the NO-MATCH, %d would match after case/punct normalisation:"%len(fz))
for b,l in fz[:15]: print("      %r  ~=  %r"%(b,l[0]))
# Highfield-specific: library entries look like 'Classic - CL400 HYP - LG-W'
print("\n=== sample BOAT LIBRARY entries (Dropdowns!B) ===")
for l in lib[:6]: print("   ", l)
print("   ... Highfield-style entries:")
for l in lib:
    if 'Sport' in l or 'SP5' in l: print("   ", l)
