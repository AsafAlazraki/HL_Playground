import zipfile, re, sys
sys.stdout.reconfigure(encoding='utf-8')
P = r"C:/Users/AsafA/Downloads/Boat Module (5).xlsx"
z=zipfile.ZipFile(P)
names=[n for n in z.namelist()]
print("externalLink parts:", [n for n in names if 'externalLink' in n])
rels = z.read('xl/externalLinks/_rels/externalLink1.xml.rels').decode() if 'xl/externalLinks/_rels/externalLink1.xml.rels' in names else ''
import os
for n in sorted([x for x in names if x.startswith('xl/externalLinks/_rels/')]):
    d=z.read(n).decode('utf-8','ignore')
    tgt=re.findall(r'Target="([^"]+)"', d)
    print(f"  {n}: {tgt}")
for n in sorted([x for x in names if re.match(r'xl/externalLinks/externalLink\d+\.xml$',x)]):
    d=z.read(n).decode('utf-8','ignore')
    sheets=re.findall(r'<sheetName val="([^"]+)"/>', d)
    print(f"  {n}: sheets={sheets}  bytes={len(d)}")
z.close()
