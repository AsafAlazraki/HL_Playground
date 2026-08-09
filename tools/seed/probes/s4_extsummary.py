import json, collections
P=r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/extlinks.json"
d=json.load(open(P))
print("=== EXTERNAL WORKBOOK TARGETS (index -> basename, #cached cells, sheet count) ===")
mods=[]; quotes=[]
for i in sorted(d, key=lambda x:int(x)):
    o=d[i]; p=o['path'] or o['abs']; base=p.split('/')[-1]
    n=len(o['cached'])
    tag = "MODULE" if "Module" in base else "QUOTE"
    (mods if tag=="MODULE" else quotes).append((int(i),base,n,o['sheets']))
print(f"\n--- MODULE workbooks ({len(mods)}) ---")
for i,b,n,s in mods:
    print(f"  [{i}] {b}   cachedCells={n}  sheets={s}")
print(f"\n--- QUOTE workbooks ({len(quotes)}) --- (showing all basenames)")
for i,b,n,s in quotes:
    print(f"  [{i}] {b}  cached={n}")
print("\n=== distinct sheet-name sets among QUOTE books ===")
c=collections.Counter(tuple(s) for i,b,n,s in quotes)
for k,v in c.most_common(): print(f"  x{v}: {list(k)}")
print("\n=== cached cell refs in QUOTE books (freq) ===")
cc=collections.Counter()
for i in sorted(d,key=lambda x:int(x)):
    o=d[i]; base=(o['path'] or o['abs']).split('/')[-1]
    if "Module" not in base: cc.update(o['cached'].keys())
print(" ", cc.most_common())
print("\n=== full folder paths (distinct) ===")
folders=collections.Counter('/'.join((d[i]['path'] or d[i]['abs']).split('/')[:-1]) for i in d)
for k,v in folders.most_common(): print(f"  x{v}  {k}")
