import json, re, collections
rows=json.load(open("stockrows.json"))
rs=json.load(open("refstrings.json"))
SEP=" - "
def rpt(field,label):
    vals=[(r['sheet'],r['row'],r['stock'],str(r[field]).strip()) for r in rows if r[field] is not None and str(r[field]).strip() not in("","0")]
    uniq=collections.Counter(v[3] for v in vals)
    print("\n"+"="*80); print(label); print("="*80)
    print(" populated=%d/%d  distinct=%d"%(len(vals),len(rows),len(uniq)))
    ok=[v for v in vals if SEP in v[3]]
    nosep=[v for v in vals if SEP not in v[3]]
    print(" contains ' - ' separator: %d   WITHOUT separator (unparseable): %d"%(len(ok),len(nosep)))
    for s,r,st,v in nosep: print("     NO-SEP  %-17s r%-4d %-9s %s"%(s,r,st,v[:95]))
    # sentinel / status text
    STAT=re.compile(r'waiting|no quote|not required|^nr\b|tbc|^0$',re.I)
    st_=[v for v in vals if STAT.search(v[3])]
    print(" STATUS/SENTINEL text in a reference field: %d"%len(st_))
    for s,r,stk,v in st_: print("     STATUS  %-17s r%-4d %-9s %s"%(s,r,stk,v[:95]))
    return vals,uniq

bv,bu=rpt('boat',"BOAT (col D)")
mv,mu=rpt('motor',"MOTOR (col E)")
tv,tu=rpt('trailer',"TRAILER (col F)")

print("\n"+"="*80); print("NEAR-DUPLICATE DETECTION (same value after normalising case/space/punct)"); print("="*80)
def key(s): return re.sub(r'[^a-z0-9]','',s.lower())
for lbl,u in (("BOAT",bu),("MOTOR",mu),("TRAILER",tu)):
    g=collections.defaultdict(list)
    for v in u: g[key(v)].append(v)
    col=[(k,vs) for k,vs in g.items() if len(vs)>1]
    print("\n %s: %d collision group(s)"%(lbl,len(col)))
    for k,vs in col:
        print("    ->", " ||| ".join(repr(x) for x in vs))
