import openpyxl, sys, io, zipfile, re
from openpyxl.utils import get_column_letter as gcl, column_index_from_string as cifs
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

P = r"C:/Users/AsafA/Downloads/Trailer Module.xlsx"

# --- merged ranges straight from the zip (read-only, no workbook write) ---
z = zipfile.ZipFile(P)
wbxml = z.read('xl/workbook.xml').decode('utf-8', 'replace')
sheets = re.findall(r'<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"', wbxml)
rels = z.read('xl/_rels/workbook.xml.rels').decode('utf-8', 'replace')
relmap = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels))
print("SHEET->PART:")
merged_by_sheet = {}
for nm, rid in sheets:
    tgt = relmap.get(rid, '')
    part = 'xl/' + tgt.lstrip('/').replace('xl/', '')
    print(f"  {nm} -> {part}")
    try:
        data = z.read(part).decode('utf-8', 'replace')
    except KeyError:
        continue
    m = re.search(r'<mergeCells[^>]*>(.*?)</mergeCells>', data, re.S)
    rngs = re.findall(r'ref="([^"]+)"', m.group(1)) if m else []
    merged_by_sheet[nm] = rngs
    print(f"     merged ranges: {len(rngs)}")

for nm, rngs in merged_by_sheet.items():
    print("="*90)
    print("MERGED IN", nm)
    # only report ranges in first 12 rows (header bands)
    hdr = [r for r in rngs if int(re.search(r'\d+', r.split(':')[0]).group()) <= 12]
    print(f"  total={len(rngs)} in_rows<=12={len(hdr)}")
    for r in sorted(hdr, key=lambda x: (int(re.search(r'\d+', x.split(':')[0]).group()), cifs(re.match(r'[A-Z]+', x).group()))):
        print("   ", r)
z.close()
