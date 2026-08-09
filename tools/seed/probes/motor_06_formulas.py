import re, sys, zipfile, collections, json
from openpyxl.utils import get_column_letter
sys.stdout.reconfigure(encoding='utf-8')
SAL = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/MotorModule_salvaged.xlsx"
z = zipfile.ZipFile(SAL)

# header row 4 map from earlier dump
hdrmap = {}
for line in open('motor_header_grid.txt', encoding='utf8'):
    p = line.rstrip('\n').split('\t')
    if len(p) > 4:
        hdrmap[p[0]] = p[4]

SHEETS = {'sheet1.xml': 'Motor Library', 'sheet2.xml': 'Rebate Programs',
          'sheet3.xml': 'Dropdowns', 'sheet4.xml': 'Yamaha_Dealer_Current', 'sheet5.xml': 'Data Drop'}

allpat = {}
for fn, name in SHEETS.items():
    x = z.read('xl/worksheets/%s' % fn).decode('utf8')
    cells = re.findall(r'<c r="([A-Z]+)(\d+)"[^>]*>(?:(?!</c>).)*?<f(?:\s[^>]*)?>([^<]*)</f>', x, re.S)
    bycol = collections.defaultdict(collections.Counter)
    shared = re.findall(r'<f t="shared"[^>]*si="(\d+)"[^>]*>([^<]*)</f>', x)
    for colL, rownum, f in cells:
        norm = re.sub(r'(?<=[A-Z$])' + re.escape(rownum) + r'(?![0-9])', '{r}', f)
        norm = re.sub(r'\b(\d{1,5})\b(?=[,)\s:]|$)', lambda m: m.group(1), norm)
        bycol[colL][norm] += 1
    allpat[name] = {c: dict(v.most_common(6)) for c, v in bycol.items()}
    print(f"\n================ {name}: {len(cells)} formula cells across {len(bycol)} cols; shared defs={len(shared)}")
    order = sorted(bycol, key=lambda c: __import__('openpyxl.utils', fromlist=['x']).column_index_from_string(c))
    for c in order:
        top = bycol[c].most_common(3)
        h = hdrmap.get(c, '') if name == 'Motor Library' else ''
        print(f"  [{c}] {h[:30]:<30} n={sum(bycol[c].values()):>5} uniq={len(bycol[c]):>4}")
        for f, n in top:
            print(f"        ({n:>4}) {f[:230]}")
json.dump(allpat, open('motor_formula_patterns.json', 'w'), indent=1)
z.close()
