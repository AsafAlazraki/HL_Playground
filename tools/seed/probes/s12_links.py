import zipfile, re, urllib.parse
SRC=r"C:/Users/AsafA/Downloads/MASTER PRICE FILE.xlsx"
z=zipfile.ZipFile(SRC)
wbx=z.read("xl/workbook.xml").decode("utf8","replace")
rels=z.read("xl/_rels/workbook.xml.rels").decode("utf8","replace")
relmap=dict((re.search(r'Id="([^"]+)"',t).group(1), re.search(r'Target="([^"]+)"',t).group(1)) for t in re.findall(r'<Relationship\b[^>]*>',rels))
sheets=re.findall(r'<sheet name="([^"]+)"[^>]*r:id="([^"]+)"',wbx)
for name,rid in sheets:
    path="xl/"+relmap[rid].lstrip("/")
    xml=z.read(path).decode("utf8","replace")
    hl=re.findall(r'<hyperlink [^>]*/>',xml)
    if not hl: continue
    rp=path.rsplit("/",1)[0]+"/_rels/"+path.rsplit("/",1)[1]+".rels"
    try: r2=z.read(rp).decode("utf8","replace")
    except KeyError: r2=""
    m2=dict((re.search(r'Id="([^"]+)"',t).group(1), re.search(r'Target="([^"]+)"',t).group(1)) for t in re.findall(r'<Relationship\b[^>]*>',r2))
    print("\n### %s (%d hyperlinks)"%(name,len(hl)))
    for h in hl:
        ref=re.search(r'ref="([^"]+)"',h).group(1)
        loc=re.search(r'location="([^"]+)"',h)
        rid2=re.search(r'r:id="([^"]+)"',h)
        tip=re.search(r'tooltip="([^"]+)"',h)
        tgt=urllib.parse.unquote(m2.get(rid2.group(1),"")) if rid2 else ""
        if loc: dest="INTERNAL->"+loc.group(1)
        else: dest="EXT->"+tgt[:150]
        print("   %-8s %-55s tip=%s"%(ref,dest,tip.group(1) if tip else ""))
