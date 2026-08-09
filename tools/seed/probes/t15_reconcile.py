import json, sys, io
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
recs = json.load(open('t07_records.json'))
dd = json.load(open('t06_dropdowns.json'))

BRANDCOL = {'C':'REDCO / TINKA TRAILERS','D':'STACER TRAILERS','E':'DUNBIER TRAILERS',
            'F':'MACKAY TRAILERS','G':'GFAB TRAILERS','H':'NSM CUSTOM TRAILERS'}
data_names = {str(r['C']).strip() for r in recs}
data_by_name = {str(r['C']).strip(): r for r in recs}

print("=== DROPDOWN BRAND COLUMNS vs DATA ===")
all_dd = set()
for col, brand in BRANDCOL.items():
    vals = [v for _, v in dd[col]][1:]
    vals = [v for v in vals if v != '0']
    series = [v for v in vals if v in {str(x) for x in []}]
    present = [v for v in vals if v in data_names]
    missing = [v for v in vals if v not in data_names]
    all_dd |= set(vals)
    print(f"  {brand} (col {col}): entries={len(vals)} matchDataRow={len(present)} noDataRow={len(missing)}")
    for m in missing[:14]:
        print(f"       NO-MATCH (series hdr or orphan): {m}")

flat = [v for _, v in dd['T']][1:]
flat = [v for v in flat if v != '0']
print(f"\n=== FLAT PICKER col T: {len(flat)} entries ===")
inflat = set(flat)
notin = sorted(n for n in data_names if n not in inflat)
print(f"  data rows NOT in flat picker: {len(notin)}")
byser = Counter()
for n in notin:
    byser[(data_by_name[n]['brand'], data_by_name[n]['series'])] += 1
for k, v in byser.most_common(30):
    print(f"     {k[0]} > {k[1]}: {v}")
print(f"\n  flat picker entries with NO data row: {len([f for f in flat if f not in data_names])}")
for f in [f for f in flat if f not in data_names][:12]:
    print(f"     {f}")
dupes = [k for k, v in Counter(str(r['C']).strip() for r in recs).items() if v > 1]
print(f"\n=== DUPLICATE NAMES (VLOOKUP key collisions): {len(dupes)} ===")
for d in dupes[:20]:
    rr = [r['row'] for r in recs if str(r['C']).strip() == d]
    print(f"   rows {rr}  {d[:70]}")
codes = Counter(str(r['E']).strip() for r in recs)
dupc = [k for k, v in codes.items() if v > 1]
print(f"\n=== DUPLICATE CODES (col E): {len(dupc)} ===")
for d in dupc[:16]:
    rr = [r['row'] for r in recs if str(r['E']).strip() == d]
    print(f"   {d[:44]:<44} rows {rr}")
