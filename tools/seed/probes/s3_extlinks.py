import zipfile, re, json, urllib.parse
SRC = r"C:/Users/AsafA/Downloads/MASTER PRICE FILE.xlsx"
z = zipfile.ZipFile(SRC)
wbx = z.read("xl/workbook.xml").decode("utf8","replace")
rels = z.read("xl/_rels/workbook.xml.rels").decode("utf8","replace")
relmap = {}
for m in re.finditer(r'<Relationship\b[^>]*>', rels):
    t=m.group(0)
    rid=re.search(r'Id="([^"]+)"',t).group(1)
    tgt=re.search(r'Target="([^"]+)"',t).group(1)
    relmap[rid]=tgt
# ordered externalReference rIds -> index n (1-based) used in [n] formula refs
extrefs = re.findall(r'<externalReference r:id="([^"]+)"/>', wbx)
print("num externalReferences:", len(extrefs))
out={}
for i, rid in enumerate(extrefs, start=1):
    tgt = relmap[rid]                       # e.g. externalLinks/externalLink1.xml
    path = "xl/"+tgt.lstrip("/")
    # its own rels give the actual workbook location
    relpath = path.rsplit("/",1)[0]+"/_rels/"+path.rsplit("/",1)[1]+".rels"
    loc=absloc=None; sheetnames=[]; cells={}
    try:
        r2 = z.read(relpath).decode("utf8","replace")
        for m in re.finditer(r'<Relationship\b[^>]*>', r2):
            t=m.group(0)
            tt=re.search(r'Target="([^"]+)"',t).group(1)
            ty=re.search(r'Type="([^"]+)"',t).group(1)
            if ty.endswith("/externalLinkPath"):
                if loc is None: loc=tt
                else: absloc=tt
    except KeyError: pass
    try:
        xml = z.read(path).decode("utf8","replace")
        sheetnames = re.findall(r'<sheetName val="([^"]*)"/>', xml)
        for cm in re.finditer(r'<cell r="([A-Z]+\d+)"(?: t="(\w+)")?><v>(.*?)</v></cell>', xml):
            cells[cm.group(1)] = cm.group(3)
    except KeyError: pass
    out[i]={"file":path,"rid":rid,"path":urllib.parse.unquote(loc or ""),"abs":urllib.parse.unquote(absloc or ""),"sheets":sheetnames,"cached":cells}

import collections
print("\n=== sample external targets ===")
for i in list(out)[:12]:
    o=out[i]; print(f"  [{i}] {o['path']}\n       abs={o['abs'][:160]}\n       cached={o['cached']}")
print("\n=== distinct sheetName sets ===")
c=collections.Counter(tuple(o['sheets']) for o in out.values())
for k,v in c.most_common(): print(f"  x{v}: {list(k)}")
print("\n=== cached cell addresses used ===")
cc=collections.Counter()
for o in out.values(): cc.update(o['cached'].keys())
print(" ", dict(cc))
print("\n=== ALL external paths (basename) ===")
for i in sorted(out):
    p = out[i]['path'] or out[i]['abs']
    print(f"  [{i}] {p.split('/')[-1] if p else '??'}")
json.dump(out, open(r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/extlinks.json","w"), indent=1)
