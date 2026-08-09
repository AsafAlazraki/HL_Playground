import openpyxl, sys, collections, re
from openpyxl.utils import column_index_from_string as ci
sys.stdout.reconfigure(encoding='utf-8')
SAL = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/MotorModule_salvaged.xlsx"
wb = openpyxl.load_workbook(SAL, read_only=True, data_only=True)
ws = wb['Motor Library']
V = [list(r) + [None]*(651-len(r)) for r in ws.iter_rows(min_row=1, max_row=660, max_col=651, values_only=True)]
wb.close()

def bucket(vals, label, n=40):
    c = collections.Counter(vals)
    print(f"\n### {label}: {len(vals)} cells, {len(c)} distinct")
    fam = collections.Counter()
    for v in vals:
        s = str(v)
        m = re.match(r'^([A-Za-z][A-Za-z0-9 &/\'()-]*?)( -|\s-\s|,)', s)
        fam[(m.group(1) if m else s.split(' ')[0])[:60]] += 1
    print("  FAMILY PREFIXES:")
    for k, v2 in fam.most_common(n):
        print(f"     {v2:>5}  {k}")

rig = [V[i][c] for i in range(5, 660) for c in range(ci('DA')-1, ci('EX'))
       if V[i][c] is not None and str(V[i][c]).strip() not in ('', '.')]
bucket(rig, "RIGGING OPTIONS  DA:EX", 34)

prop = [V[i][c] for i in range(5, 660) for c in range(ci('GT')-1, ci('KO'))
        if V[i][c] is not None and str(V[i][c]).strip() not in ('', '.')]
bucket(prop, "PROP OPTIONS  GT:KO", 30)

fo = [V[i][c] for i in range(5, 660) for c in range(ci('FT')-1, ci('GR'))
      if V[i][c] is not None and str(V[i][c]).strip() not in ('', '.')]
c = collections.Counter(str(x) for x in fo)
print(f"\n### ADDITIONAL FACTORY OPTIONS FT:GR: {len(fo)} cells, {len(c)} distinct")
for k, v2 in c.most_common(30):
    print(f"     {v2:>5}  {k[:100]}")
