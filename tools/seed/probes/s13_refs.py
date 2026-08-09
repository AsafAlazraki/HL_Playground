import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
import collections, re, json
BRANDS=["Stabicraft","Surtees","Stacer","Formosa","Jeanneau","Haines Signature","Highfield","Boat Show"]
HDR={"Stabicraft":7,"Surtees":7,"Stacer":7,"Formosa":7,"Jeanneau":7,"Haines Signature":7,"Highfield":7,"Boat Show":10}
def g(V,i,j):
    try: return V[i][j]
    except IndexError: return None
rows=[]
for b in BRANDS:
    V,F,mr,mc=grid(b)
    for i in range(HDR[b]+1, mr+1):
        c=V[i][3]
        if c is None: continue
        if not re.match(r'^[A-Z]\d{5,6}$', str(c).strip()): continue   # stock number pattern
        rows.append(dict(sheet=b,row=i,stock=str(c).strip(),
                         boat=g(V,i,4), motor=g(V,i,5), trailer=g(V,i,6), price=g(V,i,7),
                         into=g(V,i,9), days=g(V,i,10), loc=g(V,i,12), comment=g(V,i,13)))
print("TOTAL STOCK ROWS (col C matches stock-number pattern):", len(rows))
print("per sheet:", collections.Counter(r['sheet'] for r in rows))
# non-stock-number C values below header
print("\nNON-stock-number C values below header:")
for b in BRANDS:
    V,F,mr,mc=grid(b)
    bad=[(i,V[i][3]) for i in range(HDR[b]+1,mr+1) if V[i][3] is not None and not re.match(r'^[A-Z]\d{5,6}$',str(V[i][3]).strip())]
    if bad: print("  %s: %d -> %s"%(b,len(bad),[(i,str(v)[:60]) for i,v in bad[:14]]))
json.dump(rows, open("stockrows.json","w"), indent=1, default=str)

def stats(field,label):
    vals=[str(r[field]).strip() for r in rows if r[field] is not None and str(r[field]).strip() not in ("","0")]
    uniq=collections.Counter(vals)
    print("\n===== %s ====="%label)
    print("  rows with a value: %d / %d   distinct: %d"%(len(vals),len(rows),len(uniq)))
    return uniq
bo=stats('boat','BOAT strings (col D)')
mo=stats('motor','MOTOR strings (col E)')
tr=stats('trailer','TRAILER strings (col F)')
json.dump({"boat":dict(bo),"motor":dict(mo),"trailer":dict(tr)}, open("refstrings.json","w"), indent=1)

print("\n--- MOTOR: all distinct (%d) ---"%len(mo))
for v,n in sorted(mo.items()): print("   x%-2d %s"%(n,v))
