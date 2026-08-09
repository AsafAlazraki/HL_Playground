import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
from s8_formulas import formulas, norm
import re, json
PAT=re.compile(r'sp\s*560|sport\s*560|sp560',re.I)
wbv,_=books()
print("="*90); print("EVERY ROW MENTIONING SP560 / Sport 560"); print("="*90)
hits=[]
for sh in wbv.sheetnames:
    V,F,mr,mc=grid(sh)
    fs=formulas(sh)
    for i in range(1,mr+1):
        rowvals={}
        hit=False
        for j in range(1,mc+1):
            v=V[i][j]
            L=get_column_letter(j)
            f=fs.get((L,i))
            if v is not None: rowvals[L]=v
            if f and f[0]: rowvals[L+"(f)"]=norm(f[0],i)
            if v is not None and PAT.search(str(v)): hit=True
            if f and f[0] and PAT.search(f[0]): hit=True
        if hit:
            hits.append((sh,i,rowvals))
print("total rows with SP560/Sport 560:", len(hits))
for sh,i,rv in hits:
    print("\n--- [%s] row %d"%(sh,i))
    for k in sorted(rv, key=lambda x:(len(x.replace('(f)','')),x)):
        print("      %-7s %s"%(k, repr(rv[k])[:200]))
json.dump([{"sheet":s,"row":i,"cells":{k:str(v) for k,v in rv.items()}} for s,i,rv in hits], open("sp560.json","w"), indent=1)
