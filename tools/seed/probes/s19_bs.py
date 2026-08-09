import sys; sys.path.insert(0,r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad")
from lib import *
V,F,mr,mc=grid("Boat Show")
for i in range(10,mr+1):
    cells=[]
    for j in range(1,mc+1):
        if j<len(V[i]) and V[i][j] is not None: cells.append("%s=%r"%(get_column_letter(j),V[i][j]))
    if cells: print(" r%-3d %s"%(i," | ".join(cells)[:260]))
