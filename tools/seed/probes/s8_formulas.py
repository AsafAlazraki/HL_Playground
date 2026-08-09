import zipfile, re, collections, json, sys
SRC = r"C:/Users/AsafA/Downloads/MASTER PRICE FILE.xlsx"
SP  = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad"
BS = chr(92)
z = zipfile.ZipFile(SRC)
wbx = z.read("xl/workbook.xml").decode("utf8", "replace")
rels = z.read("xl/_rels/workbook.xml.rels").decode("utf8", "replace")
relmap = dict((re.search(r'Id="([^"]+)"', t).group(1), re.search(r'Target="([^"]+)"', t).group(1))
              for t in re.findall(r'<Relationship\b[^>]*>', rels))
sheets = re.findall(r'<sheet name="([^"]+)"[^>]*r:id="([^"]+)"', wbx)
smap = {n: "xl/" + relmap[r].lstrip("/") for n, r in sheets}
extlinks = json.load(open(SP + "/extlinks.json"))


def extname(n):
    o = extlinks.get(str(n))
    p = (o['path'] or o['abs']) if o else ""
    if not p:
        return "ext[%s]" % n
    return p.split('/')[-1].split(BS)[-1]


CELL = re.compile(r'<c r="([A-Z]+)(\d+)"[^>]*?(?:/>|>(.*?)</c>)', re.S)
FEL = re.compile(r'<f([^>]*)(?:/>|>(.*?)</f>)', re.S)


def unesc(s):
    return (s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
             .replace("&apos;", "'").replace("&amp;", "&"))


def formulas(sheet):
    xml = z.read(smap[sheet]).decode("utf8", "replace")
    out = {}
    for m in CELL.finditer(xml):
        col, row, body = m.group(1), int(m.group(2)), m.group(3) or ""
        fm = FEL.search(body)
        if not fm:
            continue
        attrs, ftxt = fm.group(1), unesc(fm.group(2) or "")
        si = re.search(r'si="(\d+)"', attrs)
        t = re.search(r't="(\w+)"', attrs)
        if ftxt:
            out[(col, row)] = (ftxt, attrs.strip())
        elif t and t.group(1) == "shared" and si:
            out[(col, row)] = ("<shared si=%s>" % si.group(1), attrs.strip())
        else:
            out[(col, row)] = ("", attrs.strip())
    return out


def norm(f, row):
    f = re.sub(r'(?<![A-Za-z0-9_$])(\$?[A-Z]{1,3}\$?)%d(?![0-9])' % row, r'\1{r}', f)
    return re.sub(r'\[(\d+)\]', lambda m: "[%s]" % extname(m.group(1)), f)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    for name in smap:
        if target and name != target:
            continue
        fs = formulas(name)
        if not fs:
            continue
        bycol = collections.defaultdict(collections.Counter)
        for (c, r), (f, a) in fs.items():
            if not f:
                continue
            bycol[c][norm(f, r)] += 1
        print("\n" + "=" * 90)
        print("### %s: %d formula cells, %d cols with formulas" % (name, len(fs), len(bycol)))
        print("=" * 90)
        for c in sorted(bycol, key=lambda x: (len(x), x)):
            pats = bycol[c]
            rows = sorted(int(r) for (cc, r) in fs if cc == c)
            print("\n  -- col %s (rows %d..%d, n=%d) %d distinct pattern(s)" % (c, rows[0], rows[-1], len(rows), len(pats)))
            for p, n in pats.most_common(14):
                print("     x%-4d %s" % (n, p[:300]))
            if len(pats) > 14:
                print("     ... %d more patterns" % (len(pats) - 14))
