import openpyxl, sys, json, collections
sys.stdout.reconfigure(encoding='utf-8')
P = r"C:/Users/AsafA/Downloads/Boat Module (5).xlsx"
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
wb=openpyxl.load_workbook(P, read_only=True, data_only=True)
ws=wb["Boat Module"]
runs=[]; prev=None; start=None
rowfill={}
for i,row in enumerate(ws.iter_rows(min_row=1,max_row=2320,min_col=3,max_col=4), start=1):
    c=row[0]
    if not hasattr(c,'column'): continue
    try:
        f=c.fill; sig=(f.patternType, str(getattr(f.fgColor,'rgb',None)))
    except Exception:
        sig=("err","err")
    rowfill[i]=(sig, c.value, row[1].value if hasattr(row[1],'value') else None)
wb.close()
# compress into runs of same fill sig
prev=None
for i in sorted(rowfill):
    sig,cv,dv=rowfill[i]
    if sig!=prev:
        if prev is not None:
            print(f"  rows {start}-{i-1}: fill={prev}  firstC={firstc}")
        prev=sig; start=i; firstc=str(cv)[:60]
    last=i
print(f"  rows {start}-{last}: fill={prev}  firstC={firstc}")
