import zipfile, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
P = r"C:/Users/AsafA/Downloads/Trailer Module.xlsx"
z = zipfile.ZipFile(P)
names = [n for n in z.namelist() if 'externalLink' in n]
print("EXTERNAL LINK PARTS:", names)
for n in sorted(names):
    if n.endswith('.rels'):
        d = z.read(n).decode('utf-8','replace')
        for t in re.findall(r'Target="([^"]+)"', d):
            print(f"  {n} -> {t}")
for n in sorted(names):
    if n.endswith('.xml') and 'rels' not in n:
        d = z.read(n).decode('utf-8','replace')
        sheets = re.findall(r'<sheetName val="([^"]*)"/>', d)
        print(f"  {n}: sheetNames={sheets[:12]}  size={len(d)}")
# defined names / data validations on Trailer Module
wbx = z.read('xl/workbook.xml').decode('utf-8','replace')
dn = re.findall(r'<definedName[^>]*name="([^"]+)"[^>]*>(.*?)</definedName>', wbx, re.S)
print("\nDEFINED NAMES:", len(dn))
for a, b in dn[:40]:
    print(f"   {a} = {b[:150]}")
s2 = z.read('xl/worksheets/sheet2.xml').decode('utf-8','replace')
dvs = re.findall(r'<dataValidation\s[^>]*?sqref="([^"]+)"[^>]*/?>(.*?)(?:</dataValidation>|/>)', s2, re.S)
print("\nDATA VALIDATIONS on Trailer Module:", len(dvs))
for sq, body in dvs[:25]:
    f = re.search(r'<formula1>(.*?)</formula1>', body, re.S)
    print(f"   sqref={sq[:60]} f1={(f.group(1) if f else '')[:120]}")
# also x14 extension validations
x14 = re.findall(r'<x14:dataValidation\b.*?</x14:dataValidation>', s2, re.S)
print("x14 validations:", len(x14))
for b in x14[:25]:
    f = re.search(r'<xm:f>(.*?)</xm:f>', b, re.S)
    sq = re.search(r'<xm:sqref>(.*?)</xm:sqref>', b, re.S)
    print(f"   sqref={(sq.group(1) if sq else '')[:60]} f1={(f.group(1) if f else '')[:130]}")
z.close()
