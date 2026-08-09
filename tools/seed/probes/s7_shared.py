import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
V,F,mr,mc=grid("Stabicraft")
print("Stabicraft AL:AW block, rows 6-12 formulas:")
for i in range(6,13):
    for j in range(38,50):
        L=get_column_letter(j)
        if F[i][j] is not None or V[i][j] is not None:
            print("  ", cellstr(L,i,V[i][j],F[i][j],260,60))
