"""Emit src/demos/northside.ts from the assembled table specs.

RUN IT FROM ANYWHERE:  python tools/seed/emit.py

This is the command that WRITES the seed; gen_all.py only assembles and prints
a summary. Paths are derived from this file's own location, for the reason
recorded at the top of gen_all.py.
"""
import sys, io
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gen_all
from gen_lib import ts_val, ts_str

OUT = str(HERE.parent.parent / "src" / "demos" / "northside.ts")

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
   Boats (7 tables,   Boat Module (5).xlsx · sheet "Boat Module"
    9 header bands)   Stacer R3/4-142 · Stabicraft R143/144-199 ·
                      Surtees R200/201-225 · Jeanneau R226/227-232 ·
                      Merry Fisher R233/234-247 ·
                      Cap Camarat R248/249-261 ·
                      Haines Signature R262/263-277 ·
                      Highfield R278/281-948 · Formosa R955/956-1004
                      (Merry Fisher and Cap Camarat are Jeanneau
                      RANGES, so they are series inside one table.)
   Trailers (8)       Trailer Module.xlsx · sheet "Trailer Module"
                      REDCO/Tinka 4-85 · NSM Custom 87-184 ·
                      GFAB 186-231 · Stacer 232-280 ·
                      Dunbier 281-454 · Mackay 455-625 ·
                      Dunbier/Haines BMT 626-655 ·
                      OBSOLETE 656-700.
                      Membership of a block is the ROW BAND; the
                      hierarchy level inside it is encoded in the
                      FONT SIZE of column C and nowhere else.
   Motors (4)         Motor Module · sheet "Motor Library"
                      (header row 4). Yamaha 5-293 ·
                      ePropulsion 294-341 · and two FACTORY PACKAGE
                      tables selected by Motor Library!Q Supplier,
                      because a boat sold with its engines lives in
                      the Motor Library and is not a motor.
   Parts (1)          Parts Module (3).xlsx · sheet
                      "Parts Maintenance". Category is a banner ROW.
   Dealer Fit (1)     Parts Module (3).xlsx · sheet
                      "Dealer Fit Module" (header row 11). A
                      DIFFERENT library from Parts Maintenance: the
                      boat row's dealer-fit band resolves here at
                      99.4% and there at 38.8%.
   Joins (27)         Boat Module (5).xlsx — the four fan-out bands
                      on every boat row: thirteen motor slots
                      (KZ..LD, LF..LJ … NT..NX), six trailer slots
                      (NZ..OE), forty-two dealer-fit lines
                      (OL..QA) and ten P/D part lines (JT..KC).

   THE THREE SYSTEM COLUMNS ON A JOIN — model.ts PAIR_FIELDS
   ─────────────────────────────────────────────────────────────
   Every join row carries `__origin`, `__recommended` and `__order`
   under those EXACT field ids, because `readPairs` looks them up by
   the literal string. They are not decoration:

     __order       the slot index on the boat row, and the pair's
                   only identity. (boat, motor) is not unique — a
                   UNIQUE constraint would delete 641 live rows —
                   and (boat, motor, rigging kit) still deletes 392.
                   Never re-sort it by HP: the ladder RESTARTS at
                   each change of control generation.
     __recommended true for slot 1 of the motor and trailer bands
                   only, where the header says "Recommended Motor
                   Option" and "Std Trailer". Absent everywhere
                   else, including for a boat that names no trailer
                   at all — 462 of 812 live hulls are in that state
                   and "no standard trailer" is not "we don't know".
     __origin      'rule' where the boat cell is a live external
                   link and the business POINTED at the library row,
                   'added' where the same text was typed. 352 of
                   61,854 live fan-out cells are formulas.

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
   is not seeded. The bands that ARE seeded are named after the real
   spacer-separated runs in MPF_GROUND_TRUTH.md §3.

   WHAT IS LEFT OUT OF THE FAN-OUT, and why — FITMENT_RULES.md §5.7
   ─────────────────────────────────────────────────────────────
   The 52 STANDARD FACTORY INCLUSIONS columns (W..BV): 0.33% of
   25,932 cells resolve into any parts library, and the single most
   common value is "NB: Factory Specifications are Subject to
   Change without notice" — a disclaimer occupying a data column.
   The 166 FACTORY OPTIONS columns (BX..IG): 0.00% resolve; they
   belong to Factory Options Module.xlsx, a workbook that is not
   here. "Additional Package Options" (OK): 819 cells, ONE distinct
   value, and it is the header text — the owner asked about
   packages and the column reserved for them is empty. The 80 PD
   checklist columns and the four trailer slots OF..OI, which hold
   "TRAILER NOT REQUIRED" on 811 of 812 live rows and nothing else.
   Dealer-fit slots 18-42 are READ and never populated on any row.

   Only what a seeded hull actually points at is imported from a
   library: boat rows reach 7.0% of the 5,987 library rows, and
   importing the three libraries whole would multiply the payload
   14x while adding nothing any boat names.

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
  /** reference columns only: this link is OPTIONAL. A pairing that leaves it
   *  empty, or names something no seeded row carries, keeps the rest of itself
   *  instead of being dropped — "no rigging kit" is an answer a boat row gives
   *  411 times, and a pair that loses its motor because it has no kit would be
   *  a worse lie than a missing link. The two links a pairing IS — the boat and
   *  the partner — stay mandatory. */
  soft?: boolean
}

interface SeedTable {
  k: string
  n: string
  kind?: TableKind
  role: TableRole
  accent: AccentKey
  desc: string
  /** history rather than stock — model.ts `EntityDef.retired`. Set where the
   *  WHOLE table is below one of the workbooks' OBSOLETE dividers, not merely
   *  where some of its rows are. */
  retired?: boolean
  /** column keys forming the grouping levels, outermost first */
  levels: string[]
  sections: Array<{ id: string; name: string; accent?: AccentKey; collapsed?: boolean }>
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
    /* A column whose seed key starts `__` is one of the model's PAIR_FIELDS
       and keeps that key AS its field id. `readPairs` looks the three up by
       the literal strings `__origin` / `__recommended` / `__order`
       (features/views/pairs.ts) — a minted id would be invisible to it, which
       is exactly why the seed's own `rec` and `slot` columns left every quote
       opening with an empty motor section. The ids are deliberately shared
       across every join table; that is what makes a pair row readable without
       a name lookup. */
    for (const c of t.cols) fieldId.set(`${t.k}.${c.k}`, c.k.startsWith('__') ? c.k : newId())
  }
  const eid = (k: string): string => entityId.get(k) ?? ''
  const fid = (t: string, c: string): string => fieldId.get(`${t}.${c}`) ?? ''

  const entities: EntityDef[] = TABLES.map((t) => ({
    id: eid(t.k),
    name: t.n,
    ...(t.kind ? { kind: t.kind } : {}),
    role: t.role,
    ...(t.retired ? { retired: true } : {}),
    accent: t.accent,
    description: t.desc,
    displayFieldId: fid(t.k, t.display),
    hierarchy: t.levels.map((l) => fid(t.k, l)),
    sections: t.sections.map((s): ColumnSection => ({
      id: s.id,
      name: s.name,
      ...(s.accent ? { accent: s.accent } : {}),
      ...(s.collapsed ? { collapsed: true } : {}),
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
          /* A SOFT link that does not resolve leaves the cell EMPTY and the
             pairing intact. It must never keep the raw text: a reference cell
             holding a name instead of a row id is precisely the dangling
             free-text join this table exists to replace. */
          if (c.soft) {
            delete resolved[c.k]
            continue
          }
          ok = false
          break
        }
        /* The pairing's name is composed from the links that DEFINE it. A soft
           link is a fact about the pairing, not one of its two sides. */
        if (typeof raw === 'string' && !c.soft) names.push(raw)
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
  /*                                                            */
  /* EACH RULE GATES ON THE ONE COLUMN THE ADJUDICATION FOUND    */
  /* SELECTS, AND SHOWS THE FLOOR BESIDE IT WITHOUT TESTING IT.  */
  /* That distinction is the whole of docs/specs/FITMENT_RULES   */
  /* .md §1.2 and it was got wrong here in both rules at once:   */
  /*                                                            */
  /*   · the trailer rule matched on Trailer Module!K ATM >=     */
  /*     Boat Module!P Max Load and returned 1,758 pairs — every */
  /*     row of NSM Custom Trailers against every Highfield      */
  /*     hull, so a Highfield UL240 was offered "REDCO 575       */
  /*     Surtees Alum", "REDCO Stabicraft Alloy" and a Formosa   */
  /*     cradle. F9 settles ATM as a FLOOR: it is violated by    */
  /*     nothing and passed by a mean 97.70 % of the catalogue,  */
  /*     so it selects nothing. F8 — the series banner naming    */
  /*     the boat's brand — is the selector, at 581/581 with     */
  /*     zero counter-examples. It now matches on the banner.    */
  /*   · the motor rule ANDed HP >= Min HP with HP <= Max HP.    */
  /*     A2/F2 admits Min HP only as a warning "so nobody later  */
  /*     'fixes' it by promoting it", and the promotion deleted  */
  /*     16 of the 134 Highfield × Yamaha pairings the workbook  */
  /*     itself writes (11.9 %). Max HP breaches 0 of those 134, */
  /*     which is A1/F1 reproduced, so the ceiling is the gate   */
  /*     and the floor is a column.                              */
  /*                                                            */
  /* THE TRAILER SELECTOR IS NOT REIMPLEMENTED HERE. The engine  */
  /* that reads a banner and answers with a marque is            */
  /* src/features/constraints/trailerFitment.ts, and             */
  /* seededRules.test.ts asserts this rule returns EXACTLY the   */
  /* list its `selectPartners` returns for every Highfield hull. */
  /* A `contains` clause is all a match node can say; the test   */
  /* is what keeps the two from drifting apart.                  */
  /* ---------------------------------------------------------- */

  const clauseVsSource = (candidate: string, op: Clause['op'], source: string): Clause => ({
    id: newId(),
    left: { fieldId: candidate },
    op,
    right: { kind: 'field', path: { fieldId: source } },
  })

  /** A candidate column against a fixed word. The banner selector needs
   *  one: the boat's brand is the NAME OF ITS TABLE rather than a column
   *  on it, so a rule rooted on one brand's table can only name that
   *  brand as a literal. That is the interim FITMENT_RULES.md §6.4 asks
   *  to replace with a real `Brand` / `Series Brand` pair at import. */
  const clauseVsWord = (candidate: string, op: Clause['op'], word: string): Clause => ({
    id: newId(),
    left: { fieldId: candidate },
    op,
    right: { kind: 'literal', value: word },
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
      'Every Yamaha at or below the hull’s Max HP (Boat Module!KW) — the ceiling the spec plate states, and the only half of the envelope that may gate. FITMENT_RULES.md F1 measures 0 of 1,424 live slot-1/slot-2 motors above it, and 0 of the 134 Highfield × Yamaha pairings this seed carries. MIN HP IS SHOWN AND NEVER TESTED: F2 admits it as a warning only, because the dealer breaks it on purpose — 72 of 757 live standard-fit motors (9.51%) sit below the plate, since slot 1 is the row’s lowest-HP motor on 99.9% of rows and is the cheapest way onto the water. ANDing it in deleted 16 of those 134 pairings (11.9%), which is the failure A2 is on record refusing to make twice. Shaft and control are deliberately not compared: the Boat Module writes XL / L / UL while the Motor Module writes 25" / 20" / 30" — the same axis in two vocabularies. KNOWN LIMIT: Motor Library!E is text, so a twin-rig row like “2 x 225” cannot be ordered against a number and is reported as not matching rather than silently passed; F1 asks for Max HP to be decomposed into total, rig count and per-engine at import before that can be fixed.',
      'boat_highfield',
      'mot_yamaha',
      [clauseVsSource(fid('mot_yamaha', 'e'), 'lte', fid('boat_highfield', 'kw'))],
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
      'Trailers whose series banner names Highfield — Trailer Module!A’s own heading, read here off the Series column that carries it verbatim. This is FITMENT_RULES.md F8, the one candidate in either workbook that holds at 100% AND rejects something: 581 of 581 testable live pairings with zero counter-examples, leaving 0.92–7.83% of the 434 live trailers standing (Highfield 12 of 434 = 2.76%). On this seed’s 145 live trailers it leaves 2. ATM IS SHOWN AND NEVER TESTED: F9 settles ATM ≥ the hull’s weight as a FLOOR rather than a selector — 530 of 530 live pairings hold it, but so does a mean 97.70% of the catalogue, so gating on it chooses no trailer. The weight column beside it is Boat Module!S “Boat Weight”, which is what the hull tows; Boat Module!P “Max Load” is an afloat PAYLOAD and the rule built on it is refuted at 52.5% (F10). THIS RULE USED TO MATCH ON ATM ≥ Max Load and returned 1,758 pairs — the whole NSM Custom table against every Highfield hull, offering a Highfield UL240 the “REDCO 575 Surtees Alum”, “REDCO Stabicraft Alloy” and Formosa cradles. It is the same selector src/features/constraints/trailerFitment.ts runs; the sentence surface still cannot say it, because the boat’s brand is the name of its table (§6.4).',
      'boat_highfield',
      'trl_nsmcustom',
      [clauseVsWord(fid('trl_nsmcustom', 'series'), 'contains', 'Highfield')],
      [
        { scope: 'source', fieldId: fid('boat_highfield', 'c'), label: 'Boat' },
        { scope: 'source', fieldId: fid('boat_highfield', 's'), label: 'Boat Weight kg' },
        { scope: 'match', fieldId: fid('trl_nsmcustom', 'series'), label: 'Series' },
        { scope: 'match', fieldId: fid('trl_nsmcustom', 'c'), label: 'Trailer' },
        { scope: 'match', fieldId: fid('trl_nsmcustom', 'k'), label: 'ATM kg' },
        { scope: 'match', fieldId: fid('trl_nsmcustom', 'ca'), label: 'Sell inc Rego' },
      ],
      'Trailers built for Highfield',
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
        if c.get("soft"):
            bits.append("soft: true")
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
    tables, sel, empty = gen_all.main()

    # positions
    boats = [t for t in tables if t["kind"] == "boat"]
    trls = [t for t in tables if t["kind"] == "trailer"]
    mots = [t for t in tables if t["role"] == "base" and t["kind"] in ("motor", "accessory", "package")]
    # The rate registers — Labour Rates, Oils & Consumables, Registration Costs.
    # `custom` because none of the seven kinds describes a fee register and
    # minting a kind for one table is how enums start (SERVICE_AND_THEMES §5.1).
    # They need their own band or they would land at (0,0) under the boats.
    rates = [t for t in tables if t["role"] == "base" and t["kind"] == "custom"]
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
    y = lay(rates, y)
    lay(joins, y)

    # join reference wiring
    for t in joins:
        t["kind"] = None
        soft = t.get("softrefs", ())
        cols = []
        for c in t["cols"]:
            c = dict(c)
            if c["k"] in t["refs"]:
                c["ref"] = t["refs"][c["k"]]
                c["refKey"] = t["refkeys"][c["k"]]
                if c["k"] in soft:
                    c["soft"] = True
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
        if t.get("retired"):
            buf.write("    retired: true,\n")
        buf.write(f"    levels: [{', '.join(ts_str(l) for l in t['levels'])}],\n")
        buf.write("    sections: [\n")
        for sid, sname in t["sections"]:
            acc = gen_all.SECTION_ACCENT.get(sid)
            extra = f", accent: {ts_str(acc)}" if acc else ""
            if sid in gen_all.SECTION_COLLAPSED:
                extra += ", collapsed: true"
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
    print("joins", len(joins), "pairs", sum(len(t["rows"]) for t in joins))
    for t in empty:
        print("EMPTY IN THIS SUBSET:", t["name"])


if __name__ == "__main__":
    main()
