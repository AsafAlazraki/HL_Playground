import json, sys, io, re
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
recs = json.load(open('t07_records.json'))

def f(v):
    try: return float(v)
    except: return None

print("=== REGO BAND RULE VIOLATIONS (band vs ATM 1020 threshold) ===")
bad = 0
for r in recs:
    atm = f(r.get('K')); bt = str(r.get('BY'))
    if atm is None or bt not in ('Small Trailers - Up to 1.02t','Large Trailers - Over 1.021t'): continue
    expect = 'Small Trailers - Up to 1.02t' if atm <= 1020 else 'Large Trailers - Over 1.021t'
    if expect != bt:
        bad += 1
        print(f"  r{r['row']:<4} ATM={atm:<7} actual={bt:<32} expected={expect:<32} {str(r.get('C'))[:48]}")
print("  violations:", bad)

print("\n=== HIGHFIELD MATCHES (any column mentioning 'Highfield') ===")
for r in recs:
    blob = ' '.join(str(r.get(k) or '') for k in ('C','E','F','series','brand'))
    if 'highfield' in blob.lower():
        print(f"  r{r['row']:<4} [{r['brand']} > {r['series']}]")
        print(f"        C={r.get('C')}")
        print(f"        E={r.get('E')}  H(BoatSize)={r.get('H')}  J(Tare)={r.get('J')}  K(ATM)={r.get('K')}  I(Wheel)={r.get('I')}")
        print(f"        N(TrlLen)={r.get('N')}  M(Guards)={r.get('M')}  BW(Sell)={r.get('BW')}  BY={r.get('BY')} CA={r.get('CA')}")
        print(f"        F={str(r.get('F'))[:110]}")

print("\n=== ALL TRAILERS WITH BOAT SIZE (H) IN 5.4-5.9 (SP560 = 5.6m) ===")
for r in recs:
    h = f(r.get('H'))
    if h is not None and 5.4 <= h <= 5.9:
        print(f"  r{r['row']:<4} H={h:<5} ATM={r.get('K'):<7} [{str(r.get('brand'))[:22]} > {str(r.get('series'))[:34]}] {str(r.get('C'))[:56]}")

print("\n=== BOAT SIZE (H) DISTINCT VALUE SAMPLE / TYPE ===")
c = Counter(str(r.get('H')) for r in recs)
print("  distinct:", len(c))
print("  ", " | ".join(f"{k}({v})" for k, v in sorted(c.items(), key=lambda x: str(x[0]))[:60]))
