TAIL = r'''
    buf.write("\nconst TABLES: SeedTable[] = [\n")
    for t in tables:
        buf.write("  {\n")
        buf.write(f"    k: {ts_str(t['key'])},\n")
        buf.write(f"    n: {ts_str(t['name'])},\n")
        if t.get("kind"):
            buf.write(f"    kind: {ts_str(t['kind'])},\n")
        buf.write(f"    role: {ts_str(t['role'])},\n")
        buf.write(f"    accent: {ts_str(t['accent'])},\n")
        buf.write(f"    desc: {ts_str(t['desc'])},\n")
        buf.write(f"    levels: [{', '.join(ts_str(l) for l in t['levels'])}],\n")
        buf.write("    sections: [\n")
        for sid, sname in t["sections"]:
            acc = gen_all.SECTION_ACCENT.get(sid)
            extra = f", accent: {ts_str(acc)}" if acc else ""
            buf.write(f"      {{ id: {ts_str(sid)}, name: {ts_str(sname)}{extra} }},\n")
        buf.write("    ],\n")
        buf.write("    cols: [\n")
        for c in t["cols"]:
            buf.write(emit_col(c) + "\n")
        buf.write("    ],\n")
        buf.write("    rows: [\n")
        for r in t["rows"]:
            buf.write(emit_row(t["cols"], r) + "\n")
        buf.write("    ],\n")
        buf.write(f"    display: {ts_str(t['display'])},\n")
        buf.write(f"    pos: {{ x: {t['pos'][0]}, y: {t['pos'][1]} }},\n")
        buf.write("  },\n")
    buf.write("]\n")
    buf.write(FOOTER)

    text = buf.getvalue()
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print("bytes", len(text.encode("utf-8")))
    print("tables", len(tables), "rows", sum(len(t["rows"]) for t in tables))
    print("pool", len(pool))


if __name__ == "__main__":
    main()
'''

p = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/emit.py"
s = open(p, encoding="utf-8").read()
if "const TABLES: SeedTable[]" not in s.split("HEADER = ")[-1][2000:]:
    s = s.rstrip("\n") + "\n" + TAIL
    open(p, "w", encoding="utf-8").write(s)
    print("tail restored")
else:
    print("tail already present")
