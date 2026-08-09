import json, sys
sys.stdout.reconfigure(encoding='utf-8')
from openpyxl.utils import get_column_letter as gl, column_index_from_string as ci
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
raw = json.load(open(SP+"bm_sp560_raw.json"))
V = raw["values"]; F = raw["formulas"]
H = json.load(open(SP+"bm_headers.json"))
hdr = {gl(int(j)):v for j,v in H["278"]}

BLOCK_A = [str(r) for r in range(829,845)]
BLOCK_B = [str(r) for r in range(1534,1549)]

KEY = ["C","D","E","F","G","H","I","K","L","M","O","P","Q","S","T",
       "II","IJ","IK","IM","IN","IO","IP","IQ","IR","IS","IT","IU","IV","IW","IX","IY",
       "JA","JB","JC","JD","JF","JG","JH","JI","JJ","JK",
       "JM","JN","JO","JP","JQ","JR","KE","KF","KJ","KK","KM","KN","KP","KQ","KR","KS","KT",
       "KV","KW","KX","KY","KZ","NZ",
       "QD","QE","QF","QG","QH","QK","QL","QM","QN","QO",
       "QR","QS","QT","QU","QV","QW","QX","QY","QZ","RA","RB","RC",
       "RM","RN","RO","RP","RQ","RR"]

def show(rows, label):
    print(f"\n=================== {label} ===================")
    for k in KEY:
        vals=[]
        for r in rows:
            v = V.get(r,{}).get(k)
            vals.append("" if v is None else str(v)[:46])
        if all(x=="" for x in vals): continue
        same = len(set(vals))==1
        mark = "  (uniform)" if same else "  *VARIES*"
        print(f"\n{k} [{hdr.get(k,'')}]{mark}")
        for r,v in zip(rows, vals):
            if same and r!=rows[0]: continue
            print(f"    R{r}: {v}")

show(BLOCK_B, "BLOCK B rows 1534-1548  (HIGHFIELD - Sport 560 series block)")
