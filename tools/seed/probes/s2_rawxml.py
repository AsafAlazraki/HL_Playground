import zipfile, re, sys
SRC = r"C:/Users/AsafA/Downloads/MASTER PRICE FILE.xlsx"
z = zipfile.ZipFile(SRC)
print("=== ZIP ENTRIES ===")
for i in z.namelist(): print("  ", i)

wbx = z.read("xl/workbook.xml").decode("utf8", "replace")
print("\n=== workbook.xml sheets ===")
for m in re.finditer(r'<sheet[^>]*/>', wbx): print("  ", m.group(0))
print("\n=== externalReferences? ===")
print("  ", re.findall(r'<externalReference[^>]*/>', wbx))
if "xl/externalLinks" in str(z.namelist()):
    pass
for n in z.namelist():
    if "externalLink" in n and n.endswith(".xml"):
        print("\n---", n, "---")
        print(z.read(n).decode("utf8","replace")[:3000])

# map sheet name -> file
rels = z.read("xl/_rels/workbook.xml.rels").decode("utf8","replace")
relmap = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels))
sheets = re.findall(r'<sheet name="([^"]+)"[^>]*r:id="([^"]+)"', wbx)
print("\n=== SHEET -> XML FILE ===")
smap={}
for name, rid in sheets:
    tgt = relmap.get(rid,"?")
    path = "xl/"+tgt.lstrip("/").replace("xl/","",1) if not tgt.startswith("xl/") else tgt
    smap[name]=path
    print(f"  {name!r:26} -> {path}")

print("\n=== x14 DATA VALIDATIONS (extension) ===")
for name, path in smap.items():
    try:
        xml = z.read(path).decode("utf8","replace")
    except KeyError:
        print("  missing", path); continue
    # classic
    classic = re.findall(r'<dataValidation\b[^>]*>.*?</dataValidation>|<dataValidation\b[^>]*/>', xml, re.S)
    x14 = re.findall(r'<x14:dataValidation\b.*?</x14:dataValidation>', xml, re.S)
    if classic or x14:
        print(f"\n  [{name}] classic={len(classic)} x14={len(x14)}")
        for c in classic[:40]: print("    C:", c[:400].replace("\n"," "))
        for c in x14[:60]:
            c2 = re.sub(r'\s+',' ',c)
            print("    X:", c2[:500])
