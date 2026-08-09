import zipfile, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
SAL = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/MotorModule_salvaged.xlsx"
z = zipfile.ZipFile(SAL)
x = z.read('xl/worksheets/sheet1.xml').decode('utf8')

# merged cells
m = re.search(r'<mergeCells count="(\d+)">(.*?)</mergeCells>', x, re.S)
merges = []
if m:
    merges = re.findall(r'<mergeCell ref="([^"]+)"/>', m.group(2))
    print("MERGE COUNT:", m.group(1))
else:
    print("no mergeCells")

# sheetViews / freeze pane
sv = re.search(r'<sheetViews>.*?</sheetViews>', x, re.S)
print("SHEETVIEWS:", sv.group(0)[:600] if sv else None)
pr = re.search(r'<sheetPr[^>]*>', x)
print("SHEETPR:", pr.group(0) if pr else None)
prot = re.search(r'<sheetProtection[^>]*/>', x)
print("PROTECTION:", prot.group(0)[:400] if prot else None)
ac = re.search(r'<autoFilter[^>]*>', x)
print("AUTOFILTER:", ac.group(0) if ac else None)
print("DIMENSION:", re.search(r'<dimension ref="([^"]+)"', x).group(1))

# data validations (dropdown sources!)
dvs = re.findall(r'<dataValidation\b[^>]*>.*?</dataValidation>|<dataValidation\b[^>]*/>', x, re.S)
print("\nDATAVALIDATIONS:", len(dvs))
for d in dvs[:60]:
    d2 = re.sub(r'\s+', ' ', d)
    print("  ", d2[:400])

# conditional formatting count
cf = re.findall(r'<conditionalFormatting sqref="([^"]+)">(.*?)</conditionalFormatting>', x, re.S)
print("\nCONDFORMAT blocks:", len(cf))
for s, body in cf[:25]:
    rules = re.findall(r'<cfRule[^>]*type="([^"]+)"[^>]*>', body)
    frm = re.findall(r'<formula>([^<]*)</formula>', body)
    print("  ", s, rules, frm[:3])

json.dump(merges, open('motor_merges.json', 'w'))
print("\nmerges sample:", merges[:60])
z.close()
