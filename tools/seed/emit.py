"""Emit src/demos/northside.ts from the assembled table specs."""
import sys, io, os
SC = r"C:/Users/AsafA/AppData/Local/Temp/claude/C--Users-AsafA--claude-projects-HelmLogic-Dynamic-Config/1bf40b7d-3f26-4235-aa97-875a41f0e4fc/scratchpad/"
sys.path.insert(0, SC)
import gen_all
from gen_lib import ts_val, ts_str

OUT = r"C:/Users/AsafA/.claude/projects/HelmLogic Dynamic Config/src/demos/northside.ts"

HEADER = '''/* ============================================================
   demos/northside — REAL Northside Marine data.
   ONE TABLE PER BRAND.

   Not sample data. Every value below was read out of Northside
   Marine's Master Price File — the Excel workbooks the business
   runs on today — strictly read-only. Where the source cell is
   empty, a live error (#N/A, #VALUE!, #REF!) or a sentinel
   ("TRAILER NOT REQUIRED", "NR - ENGINE NOT REQUIRED", a bare "."
   or "0"), the cell here is EMPTY. Nothing is invented to fill a
   gap. Every row carries a Source column naming the sheet and row
   it came from.

   WHY ONE TABLE PER BRAND — CONFIGURATOR_SPEC.md §3-zero
   ─────────────────────────────────────────────────────────────
   The Boat Module carries NINE brand-specific header rows that
   re-label the same physical grid, because the same column means
   a different thing for each brand:

     col I   STACER "Depth" · STABICRAFT "Int. Beam" ·
             HIGHFIELD "Tube Dia." · JEANNEAU "Draft"
     col P/Q STACER "Hull Weight (Dry)/BMT Weight (Dry)" ·
             HIGHFIELD "Max Load/Max People" ·
             SURTEES "Water Ballast/Deadrise" ·
             JEANNEAU "Water Capacity/Black Water"
     col S/T/U STACER "Bottomsides/Topsides/Transom" ·
             HIGHFIELD "Boat Weight/Air Chambers/(none)" ·
             JEANNEAU "Cabins/Berths/Head/s"
     col IQ  STACER "Base Freight" · STABICRAFT "ABP Compl." ·
             SURTEES "Quad Freight" · JEANNEAU "Aus Spec" ·
             FORMOSA "Freight"
     col IX  STACER "Road Freight" · STABICRAFT "Handling" ·
             SURTEES "Dazmac" · JEANNEAU "IYT Logistics"

   So each table below takes its columns from ITS OWN header row,
   and a column a brand does not use is simply not on its table.
   Brand is therefore NOT a hierarchy level — the table IS the
   brand. Levels start below it: Series ▸ Model, or
   Series ▸ Model ▸ Variant for Highfield, which is the only brand
   that explodes to a material × colourway SKU per row.

   The KIND is what makes a rule portable: a fitment rule written
   once against `boat` applies to all nine boat tables however
   their columns are named.

   WORKBOOK → TABLE map
   ─────────────────────────────────────────────────────────────
   Boats (9 tables)   Boat Module (5).xlsx · sheet "Boat Module"
                      Stacer R3/4-142 · Stabicraft R143/144-199 ·
                      Surtees R200/201-225 · Jeanneau R226/227-232 ·
                      Merry Fisher R233/234-247 ·
                      Cap Camarat R248/249-261 ·
                      Haines Signature R262/263-277 ·
                      Highfield R278/281-948 · Formosa R955/956-1004
   Trailers (7)       Trailer Module.xlsx · sheet "Trailer Module"
                      REDCO/Tinka 4-85 · NSM Custom 87-184 ·
                      GFAB 186-231 · Stacer 232-280 ·
                      Dunbier 281-454 · Mackay 455-625 ·
                      Dunbier/Haines BMT 626-655.
                      Brand membership comes from the HIDDEN
                      Dropdowns sheet; the hierarchy level is
                      encoded in the FONT SIZE of column C.
   Motors (2)         Motor Module · sheet "Motor Library"
                      (header row 4). Yamaha 5-293 ·
                      ePropulsion 294-341.
   Parts (1)          Parts Module (3).xlsx · sheet
                      "Parts Maintenance". Category is a banner ROW.
   Joins (4)          Boat Module (5).xlsx — the thirteen motor
                      slots (KZ..LD, LF..LJ … NT..NX) and the ten
                      trailer slots (NZ..OI) on every boat row.

   TABLE ROLES — CONFIGURATOR_SPEC.md §3a
   ─────────────────────────────────────────────────────────────
   Every boat, trailer, motor and parts table is `base`: one
   subject, and only that subject. NO base table carries a
   reference column. The motor name and trailer name the sheet
   types onto a boat row are facts about a PAIRING, so they are
   rows on the `join` tables, and the rigging kit, prop part no.,
   prop description and engine hole travel with them — they are
   true of that motor on that hull and of nothing else.

   UNITS — the source stores them inside the value
   ─────────────────────────────────────────────────────────────
   "52 cm", "105 ltr", "1,188 kg", "24 deg", "90 HP" are TEXT in
   otherwise numeric columns. Each is stored here as a clean
   number with the unit carried in the column name ("Tube Dia. cm"),
   which is the KindColumn.unit convention in model.ts. Boat!K and
   !L read "382 cm" on the SP520/SP560 rows but "4.75 m" on
   SP600/SP660 — the same column in two units on adjacent rows;
   those are normalised to centimetres and the column says so.
   Where a column mixes numbers with words ("105 ltr" beside
   "External Tank") it stays TEXT and the words are kept.

   Boat!J "Image Type" reads "Boat" on every row of every brand and
   is not seeded. The 51 standard-inclusion, 166 factory-option,
   42 dealer-fit, 30 paint/graphics and 81 pre-delivery-checklist
   slot columns are likewise out of scope for a seed; the bands
   that ARE seeded are named after the real spacer-separated runs
   in MPF_GROUND_TRUTH.md §3.

   NOTE ON THE MOTOR WORKBOOK: `Motor Module (1).xlsx` in Downloads
   is a truncated download and will not open (BadZipFile). The
   motor values below come from `Copy of Motor Module (1).xlsx`,
   the salvaged copy of the same file — the same source
   MPF_GROUND_TRUTH.md used.

   See MPF_GROUND_TRUTH.md for the full structural analysis.
   ============================================================ */

import { newId, nowIso } from '@/lib/id'
import { OUT_HANDLE } from '@/types/model'
import type {
  AccentKey,
  CellValue,
  Clause,
  ColumnSection,
  EntityDef,
  FieldDef,
  FieldType,
  GroupDef,
  ImageRef,
  RowData,
  RuleDef,
  RuleEdge,
  RuleNode,
  TableKind,
  TableRole,
  ViewColumn,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'

export interface NorthsideProject {
  name: string
  entities: EntityDef[]
  groups: GroupDef[]
  rules: RuleDef[]
  rowsByEntity: Record<string, RowData[]>
}

/* ---------------------------------------------------------- */
/* The seed shape. One entry per table; the builder below turns */
/* these into EntityDef + RowData with freshly minted ids.      */
/* ---------------------------------------------------------- */

type SeedCell = string | number | boolean | null

interface SeedColumn {
  /** short key used by the row literals */
  k: string
  /** the column name a person reads — the brand's own header wording */
  n: string
  t: FieldType
  /** ColumnSection id */
  s: string
  /** where this column came from, and what it means on THIS brand */
  d?: string
  /** reference columns only: the seed key of the table they point at */
  ref?: string
  /** reference columns only: the column on that table holding the natural
   *  key the workbook joins on (a name string, or the source cell address) */
  refKey?: string
}

interface SeedTable {
  k: string
  n: string
  kind?: TableKind
  role: TableRole
  accent: AccentKey
  desc: string
  /** column keys forming the grouping levels, outermost first */
  levels: string[]
  sections: Array<{ id: string; name: string; accent?: AccentKey }>
  cols: SeedColumn[]
  rows: Array<Record<string, SeedCell>>
  /** column key used to label rows elsewhere */
  display: string
  pos: { x: number; y: number }
}

/** Boat!F, Trailer!G and Motor!I hold ONE marketing photo URL per record.
 *  A picture column takes an ordered ImageRef[], so one URL is one image and
 *  index 0 is the primary. An empty or #N/A source cell stays EMPTY — never a
 *  placeholder picture. */
const imageCell = (url: SeedCell): ImageRef[] | null => {
  if (typeof url !== 'string' || url.trim() === '') return null
  const file = url.split('/').pop()
  return [{ id: newId(), src: url, ...(file ? { name: file } : {}) }]
}
'''

FOOTER = '''
/* ============================================================
   BUILD — mint ids, resolve references, hand back a project
   ============================================================ */

export function buildNorthsideProject(): NorthsideProject {
  const stamp = nowIso()

  const entityId = new Map<string, string>()
  const fieldId = new Map<string, string>()
  for (const t of TABLES) {
    entityId.set(t.k, newId())
    for (const c of t.cols) fieldId.set(`${t.k}.${c.k}`, newId())
  }
  const eid = (k: string): string => entityId.get(k) ?? ''
  const fid = (t: string, c: string): string => fieldId.get(`${t}.${c}`) ?? ''

  const entities: EntityDef[] = TABLES.map((t) => ({
    id: eid(t.k),
    name: t.n,
    ...(t.kind ? { kind: t.kind } : {}),
    role: t.role,
    accent: t.accent,
    description: t.desc,
    displayFieldId: fid(t.k, t.display),
    hierarchy: t.levels.map((l) => fid(t.k, l)),
    sections: t.sections.map((s): ColumnSection => ({
      id: s.id,
      name: s.name,
      ...(s.accent ? { accent: s.accent } : {}),
    })),
    position: t.pos,
    fields: t.cols.map((c): FieldDef => ({
      id: fid(t.k, c.k),
      name: c.n,
      type: c.t,
      sectionId: c.s,
      ...(c.d ? { description: c.d } : {}),
      ...(c.ref ? { refEntityId: eid(c.ref) } : {}),
    })),
    createdAt: stamp,
    updatedAt: stamp,
  }))

  /* Pass 1 — every table that is not a join. While building, index each
     row by the natural key the workbook joins on (a display-name string,
     or the source cell address), so pass 2 can turn the sheet's free-text
     joins into real links. */
  const rowsByEntity: Record<string, RowData[]> = {}
  const byNaturalKey = new Map<string, string>()

  const buildRow = (t: SeedTable, seed: Record<string, SeedCell>): RowData => {
    const values: Record<string, CellValue> = {}
    for (const c of t.cols) {
      const v = seed[c.k]
      if (v === undefined || v === null) continue
      if (c.t === 'image') {
        const img = imageCell(v)
        if (img) values[fid(t.k, c.k)] = img
        continue
      }
      values[fid(t.k, c.k)] = v
    }
    return { id: newId(), entityId: eid(t.k), values, createdAt: stamp, updatedAt: stamp }
  }

  for (const t of TABLES) {
    if (t.role === 'join') continue
    const out: RowData[] = []
    for (const seed of t.rows) {
      const row = buildRow(t, seed)
      out.push(row)
      for (const c of t.cols) {
        const v = seed[c.k]
        if (typeof v === 'string' && v !== '') byNaturalKey.set(`${t.k}|${c.k}|${v}`, row.id)
      }
    }
    rowsByEntity[eid(t.k)] = out
  }

  /* Pass 2 — the joins. A pairing whose either side does not resolve to a
     seeded row is DROPPED rather than half-written: a link is an id or it is
     nothing. (That is exactly the failure mode a free-text join hides.) */
  for (const t of TABLES) {
    if (t.role !== 'join') continue
    const out: RowData[] = []
    for (const seed of t.rows) {
      const resolved: Record<string, SeedCell> = { ...seed }
      const names: string[] = []
      let ok = true
      for (const c of t.cols) {
        if (!c.ref || !c.refKey) continue
        const raw = seed[c.k]
        const hit = typeof raw === 'string' ? byNaturalKey.get(`${c.ref}|${c.refKey}|${raw}`) : undefined
        if (!hit) {
          ok = false
          break
        }
        if (typeof raw === 'string') names.push(raw)
        resolved[c.k] = hit
      }
      /* The pairing's own name, composed from the two display names the
         workbook itself joins on — never the model code. */
      if (names.length > 0) resolved.label = names.join(' · ')
      if (ok) out.push(buildRow(t, resolved))
    }
    rowsByEntity[eid(t.k)] = out
  }

  /* ---------------------------------------------------------- */
  /* Two fitment rules, rooted on Highfield. They are written    */
  /* against columns the workbook already has and NOTHING in it  */
  /* enforces — fitment there is a hand-typed 13-slot menu.      */
  /* ---------------------------------------------------------- */

  const clauseVsSource = (candidate: string, op: Clause['op'], source: string): Clause => ({
    id: newId(),
    left: { fieldId: candidate },
    op,
    right: { kind: 'field', path: { fieldId: source } },
  })

  const mkRule = (
    name: string,
    description: string,
    rootKey: string,
    targetKey: string,
    clauses: Clause[],
    columns: ViewColumn[],
    label: string,
    y: number,
  ): RuleDef => {
    const start = newId()
    const match = newId()
    const output = newId()
    const nodes: RuleNode[] = [
      { id: start, kind: 'start', position: { x: 80, y }, config: {} },
      {
        id: match,
        kind: 'match',
        position: { x: 400, y },
        config: { targetEntityId: eid(targetKey), group: { combinator: 'AND', clauses }, emptyBehavior: 'skip' },
      },
      { id: output, kind: 'output', position: { x: 720, y }, config: { label, columns } },
    ]
    const edges: RuleEdge[] = [
      { id: newId(), source: start, target: match, sourceHandle: OUT_HANDLE },
      { id: newId(), source: match, target: output, sourceHandle: OUT_HANDLE },
    ]
    return {
      id: newId(),
      name,
      description,
      rootEntityId: eid(rootKey),
      enabled: true,
      nodes,
      edges,
      createdAt: stamp,
      updatedAt: stamp,
    }
  }

  const rules: RuleDef[] = [
    mkRule(
      'Motor fitment — Highfield',
      'Every Yamaha whose HP lands inside the hull’s Min HP / Max HP envelope (Boat Module!KV, KW). Those two columns exist in the Master Price File and NOTHING enforces them. Shaft and control are deliberately not compared: the Boat Module writes XL / L / UL while the Motor Module writes 25" / 20" / 30" — the same axis in two vocabularies. Written against `boat` and `motor`, so it reads the same on any of the nine boat tables.',
      'boat_highfield',
      'mot_yamaha',
      [
        clauseVsSource(fid('mot_yamaha', 'e'), 'gte', fid('boat_highfield', 'kv')),
        clauseVsSource(fid('mot_yamaha', 'e'), 'lte', fid('boat_highfield', 'kw')),
      ],
      [
        { scope: 'source', fieldId: fid('boat_highfield', 'c'), label: 'Boat' },
        { scope: 'source', fieldId: fid('boat_highfield', 'kv'), label: 'Min HP' },
        { scope: 'source', fieldId: fid('boat_highfield', 'kw'), label: 'Max HP' },
        { scope: 'match', fieldId: fid('mot_yamaha', 'c'), label: 'Motor' },
        { scope: 'match', fieldId: fid('mot_yamaha', 'e'), label: 'HP Rating' },
        { scope: 'match', fieldId: fid('mot_yamaha', 'f'), label: 'Shaft Length' },
        { scope: 'match', fieldId: fid('mot_yamaha', 'bf'), label: 'Sell Price' },
      ],
      'Motors that fit',
      -420,
    ),
    mkRule(
      'Trailer fitment — Highfield',
      'NSM Custom trailers whose ATM clears the hull’s Max Load (Boat Module!P). Max Load is the hull’s PAYLOAD rating, so this clears the load only — the legal test would add hull weight and trailer tare on top, and no column in the workbook does. The Trailer Module runs a custom cradle series per boat model beside a length-band fallback, with nothing joining them but a model name typed into text.',
      'boat_highfield',
      'trl_nsmcustom',
      [clauseVsSource(fid('trl_nsmcustom', 'k'), 'gte', fid('boat_highfield', 'p'))],
      [
        { scope: 'source', fieldId: fid('boat_highfield', 'c'), label: 'Boat' },
        { scope: 'source', fieldId: fid('boat_highfield', 'p'), label: 'Max Load kg' },
        { scope: 'match', fieldId: fid('trl_nsmcustom', 'c'), label: 'Trailer' },
        { scope: 'match', fieldId: fid('trl_nsmcustom', 'k'), label: 'ATM kg' },
        { scope: 'match', fieldId: fid('trl_nsmcustom', 'ca'), label: 'Sell inc Rego' },
      ],
      'Trailers that carry it',
      -900,
    ),
  ]

  return {
    name: 'Northside Marine — Master Price File',
    entities,
    groups: [],
    rules,
    rowsByEntity,
  }
}

/** Builds the Northside set and applies it wholesale (replaces the
 *  current project). */
export function loadNorthsideProject(): void {
  const p = buildNorthsideProject()
  useProjectStore.getState().replaceProject({
    name: p.name,
    entities: p.entities,
    groups: p.groups,
    rules: p.rules,
    rowsByEntity: p.rowsByEntity,
  })
}
'''


def emit_col(c):
    bits = [f"k: {ts_str(c['k'])}", f"n: {ts_str(c['n'])}", f"t: {ts_str(c['t'])}", f"s: {ts_str(c['s'])}"]
    if c.get("d"):
        bits.append(f"d: {pooled(c['d'])}")
    if c.get("ref"):
        bits.append(f"ref: {ts_str(c['ref'])}")
        bits.append(f"refKey: {ts_str(c['refKey'])}")
    return "      { " + ", ".join(bits) + " },"


POOL = {}


def pooled(v):
    if isinstance(v, str) and v in POOL:
        return f"S[{POOL[v]}]"
    return ts_val(v)


def emit_row(cols, r):
    order = [c["k"] for c in cols]
    parts = []
    for k in order:
        v = r.get(k)
        if v is None:
            continue
        parts.append(f"{k}: {pooled(v)}")
    return "      { " + ", ".join(parts) + " },"


def main():
    tables, sel = gen_all.main()

    # positions
    boats = [t for t in tables if t["kind"] == "boat"]
    trls = [t for t in tables if t["kind"] == "trailer"]
    mots = [t for t in tables if t["kind"] in ("motor", "accessory")]
    joins = [t for t in tables if t["role"] == "join"]
    # LAYOUT — the whole sheet must be framable on a laptop.
    # A single row per kind put 9 boats across 5,760px and the four bands
    # 5,300px apart, so FIT needed zoom 0.13, the canvas floor clamped it,
    # and FIT silently did nothing: the reader landed on a corner of their
    # own drawing with the recovery control dead. Wrap each kind at 5 wide
    # and keep the bands 440px apart -> ~2,920 x 2,520, which frames at
    # ~0.29 on a 1280x800 laptop.
    COLS, PITCH_X, PITCH_Y = 5, 600, 440

    def lay(group, band_top):
        rows = 0
        for i, t in enumerate(group):
            col, row = i % COLS, i // COLS
            t["pos"] = (col * PITCH_X, band_top + row * PITCH_Y)
            rows = row + 1
        return band_top + rows * PITCH_Y

    y = lay(boats, 0)
    y = lay(trls, y)
    y = lay(mots, y)
    lay(joins, y)

    # join reference wiring
    for t in joins:
        t["kind"] = None
        cols = []
        for c in t["cols"]:
            c = dict(c)
            if c["k"] in t["refs"]:
                c["ref"] = t["refs"][c["k"]]
                c["refKey"] = t["refkeys"][c["k"]]
            cols.append(c)
        # the pairing's own name, so a join row has something to be called
        label = dict(k="label", n="Label", t="text", s="pairing",
                     d="The pairing's own name — “<boat> · <partner>”, composed at build time from the two display names. It is only a name; the pairing itself is the two links beside it.")
        cols.insert(0, label)
        t["cols"] = cols
        t["display"] = "label"

    from collections import Counter
    counts = Counter()
    for t in tables:
        for c in t["cols"]:
            if c.get("d") and len(c["d"]) >= 6:
                counts[c["d"]] += 1
        for r in t["rows"]:
            for v in r.values():
                if isinstance(v, str) and len(v) >= 6:
                    counts[v] += 1
    pool = [v for v, n in counts.most_common() if n >= 2]
    for i, v in enumerate(pool):
        POOL[v] = i

    buf = io.StringIO()
    buf.write(HEADER)
    buf.write(
        '\n/** Text that repeats — image URLs, rigging-kit sentences, safety-gear and\n'
        ' *  registration wording, and the column provenance notes. Pooled so the same\n'
        ' *  string is written once; every entry is still verbatim. */\n'
        'const S: string[] = [\n'
    )
    for v in pool:
        buf.write("  " + ts_str(v) + ",\n")
    buf.write("]\n")

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
