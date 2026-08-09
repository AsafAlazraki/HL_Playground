import zipfile, re, sys, io, json
from collections import Counter, defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
P = r"C:/Users/AsafA/Downloads/Trailer Module.xlsx"
z = zipfile.ZipFile(P)
d = z.read('xl/externalLinks/externalLink3.xml').decode('utf-8','replace')
print("=== CACHED 'Registration Costs' EXTERNAL VALUES ===")
for sd in re.findall(r'<sheetData>(.*?)</sheetData>', d, re.S):
    for row in re.findall(r'<row r="(\d+)">(.*?)</row>', sd, re.S):
        rn, body = row
        cells = re.findall(r'<cell r="([A-Z]+\d+)"(?: t="(\w+)")?><v>(.*?)</v></cell>', body)
        if cells:
            print(f"  r{rn}: " + " | ".join(f"{a}={c}" for a, t, c in cells))
z.close()

# ATM vs Rego Type cross-tab
recs = json.load(open('t10_in.json')) if False else json.load(open('t07_records.json'))
print("\n=== ATM (K) vs REGO TYPE (BY) ===")
bands = defaultdict(list)
for r in recs:
    bt = r.get('BY'); atm = r.get('K')
    try: atm = float(atm)
    except: atm = None
    bands[str(bt)].append(atm)
for bt, v in bands.items():
    vv = [x for x in v if x is not None]
    if vv:
        print(f"  {bt}: n={len(v)} ATM min={min(vv)} max={max(vv)}")
    else:
        print(f"  {bt}: n={len(v)} (no numeric ATM)")
print("\n  -- rows near the 1020/1021 boundary --")
for r in recs:
    try: atm = float(r.get('K'))
    except: continue
    if 700 <= atm <= 1400:
        print(f"   r{r['row']:<4} ATM={atm:<7} rego={r.get('BY')} ${r.get('BZ')}  {str(r.get('C'))[:52]}")
