import zipfile, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
P = r"C:/Users/AsafA/Downloads/Boat Module (5).xlsx"
SP = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
z = zipfile.ZipFile(P, 'r')
print([n for n in z.namelist() if 'workbook.xml' in n or 'sheet' in n][:30])
wbx = z.read('xl/workbook.xml').decode('utf-8', 'ignore')
print("\n-- defined names --")
for m in re.finditer(r'<definedName[^>]*name="([^"]+)"[^>]*>(.*?)</definedName>', wbx, re.S):
    print("  ", m.group(1), "=", m.group(2)[:200])
print("\n-- sheets --")
for m in re.finditer(r'<sheet[^>]*/>', wbx):
    print("  ", m.group(0))

for sn in ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']:
    if sn not in z.namelist(): continue
    print(f"\n===== {sn} =====")
    data = z.read(sn).decode('utf-8','ignore')
    print("bytes", len(data))
    mc = re.search(r'<mergeCells count="(\d+)">(.*?)</mergeCells>', data, re.S)
    if mc:
        print("mergeCells count:", mc.group(1))
        refs = re.findall(r'ref="([^"]+)"', mc.group(2))
        json.dump(refs, open(SP+f"merged_{sn.split('/')[-1]}.json","w"))
        print("first 120:", refs[:120])
    else:
        print("no mergeCells")
    # conditional formatting / data validation summary
    dv = re.findall(r'<dataValidation [^>]*>', data)
    print("dataValidation tags:", len(dv))
    for d in dv[:25]: print("   ", d[:300])
z.close()
