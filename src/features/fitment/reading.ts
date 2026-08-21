/* ============================================================
   THE FAN-OUT, READ OFF THE SHEET — what one thing can be sold
   with, counted, at whatever scale the loaded data happens to be.

   WHY THIS FILE EXISTS. `Fitment` opened onto a rule editor: a rail
   of two rules and a blank canvas. The name on the bar says what
   fits what and the screen answered "here is a flow-chart tool". The
   fan-out IS the answer to that question and it was already on the
   sheet — relationship tables holding every pairing the price file
   states — and nothing in the app had ever drawn it.

   ── EVERY FIGURE IS COUNTED HERE, NONE IS TYPED ───────────────

   docs/specs/FITMENT_RULES.md §2 measures the fan-out against the
   workbooks and quotes per-band totals. Those figures are the
   ADJUDICATION's, taken off the Excel files. This file deliberately
   repeats none of them: it counts the rows that are actually loaded.
   The two agree where the import is complete and they will disagree
   the day somebody edits a pairing, which is the point — a measured
   figure that moves with the data cannot go stale, and a quoted one
   eventually lies.

   ── WHAT A STRAND IS, AND THE TWO SHAPES IT COMES IN ──────────

   A relationship table (`role: 'join'`) carries reference columns.
   One points back at the SUBJECT. The next is the PARTNER — the
   thing being fanned out to. Any further reference column is a fact
   about the PAIR rather than a relationship of its own, and the
   Master Price File has exactly one: the rigging kit, which
   FITMENT_RULES.md R5 settles as belonging to the (boat, motor)
   pairing and to neither side alone. So:

     via 'table'   the join's own partner — one row is one pairing
     via 'column'  a reference carried ON the pairing; a row counts
                   only where the cell is filled, and the empties are
                   counted too, because "342 of these 2,519 pairings
                   name no rigging kit" is a fact about the file

   ── WHY A GROUP AND NOT JUST A STRAND ─────────────────────────

   Two relationship tables can carry the SAME relationship — the
   Northside seed hangs Highfield's trailers off both NSM Custom and
   GFAB. Neither table's count answers "how many hulls have a
   trailer at all", and answering it wrongly is exactly the failure
   DESIGN_CONTRACT §5 names: a count that does not say what it left
   out. So strands are grouped by the reference column's own NAME —
   the price file's word for the relationship — and the group carries
   the UNION of the subject rows its strands reach.

   ── WHY IT NEVER NAMES A BOAT ─────────────────────────────────

   The subject kind is DERIVED: whichever base kind the most
   relationship tables point at. On the Northside seed that is `boat`
   and on a motorcycle dealer's sheet it would be whatever their
   relationship tables are hung off. Every word a person reads off
   this file — the role, the table names — is out of their own data.
   ============================================================ */

import { PAIR_ORIGIN_FIELD, isDiscontinued, isRetired, readCell } from '@/types/model'
import type { AccentKey, EntityDef, FieldDef, RowData, TableKind } from '@/types/model'

export interface FanProject {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}

/** How the pairings on one strand came to be there.
 *
 *  `PairOrigin` in @/types/model is the app's own vocabulary — 'rule'
 *  where a rule matched it, 'added' where a person put it there,
 *  'removed' where a person took it out. The import writes 'rule'
 *  where the workbook cell was a live external link and 'added' where
 *  the text was typed, so on a freshly imported price file this reads
 *  as DERIVED versus DECIDED. FITMENT_RULES.md §4.4 is the finding it
 *  draws: almost none of a dealer's fan-out is a lookup, and nobody
 *  has ever shown them which part is. */
export interface Provenance {
  derived: number
  typed: number
  withdrawn: number
}

export interface Strand {
  /** stable across renders: the join table plus the column read */
  id: string
  via: 'table' | 'column'
  joinTableId: string
  joinTableName: string
  /** the reference column's own name, out of the price file */
  role: string
  partnerTableId: string
  partnerTableName: string
  partnerKind: TableKind
  partnerAccent: AccentKey
  /** pairings that name a partner */
  pairs: number
  /** pairings on the same table naming none — only ever non-zero on a
   *  'column' strand, where the relationship exists and the fact
   *  carried on it is absent */
  blank: number
  /** distinct subject rows this strand reaches */
  subjectsReached: number
  /** distinct partner rows it uses */
  partnersUsed: number
  /** live rows on the partner table — the catalogue it draws from */
  partnerCatalogue: number
  provenance: Provenance
  /** the join table is history rather than stock, so none of this is
   *  offered — it is kept so an old quote still resolves */
  heldBack: boolean
  /** on a 'column' strand, the relationship it is carried on: the
   *  join's own partner table, and the name that relationship goes
   *  by. Two motor tables can carry the same rigging column, and
   *  "Rigging Kits" printed twice under one heading is a list a
   *  person cannot read. */
  carriedOn?: string
  carriedOnRole?: string
}

/** Every strand the price file files under one relationship name. */
export interface StrandGroup {
  role: string
  via: 'table' | 'column'
  strands: Strand[]
  /** pairings on the LIVE strands only */
  pairs: number
  /** pairings on strands whose table is history rather than stock */
  heldBackPairs: number
  /** subject rows reached by ANY live strand in the group */
  reached: number
  /** subject rows reached by none of them */
  missing: number
  /** over the live strands */
  provenance: Provenance
  /** every strand in the group is history */
  heldBack: boolean
}

export interface Fan {
  subjectTableId: string
  subjectTableName: string
  subjectAccent: AccentKey
  subjectKind: TableKind
  /** live rows on the subject table */
  subjects: number
  /** rows held back because they are no longer sold */
  subjectsDiscontinued: number
  groups: StrandGroup[]
  /** pairings on live relationship tables */
  pairs: number
  /** facts carried ON those pairings — never added to `pairs`, or one
   *  row of the sheet would be counted twice */
  carried: number
}

export interface FanReading {
  /** the kind every fan below is a fan OF, derived from the data */
  subjectKind: TableKind | null
  fans: Fan[]
  /** live subject rows across every fan */
  subjects: number
  /** rows on live relationship tables — one row is one pairing */
  pairs: number
  /** references carried ON those rows; a separate count on purpose,
   *  because adding them to `pairs` counts one row twice */
  carried: number
  /** over the pairings, so it reconciles with `pairs` exactly */
  provenance: Provenance
  /** pairings on a relationship table that is history rather than stock */
  heldBackPairs: number
  heldBackTables: string[]
  /** partner tables reached, and relationship tables read */
  partnerTables: number
  joinTables: number
  /** the relationship names, in the price file's own words */
  roles: string[]
}

/* ---------------------------------------------------------- */
/* Which kind is the subject                                   */
/* ---------------------------------------------------------- */

const refFields = (entity: EntityDef): FieldDef[] =>
  entity.fields.filter((f) => f.type === 'reference' && f.refEntityId)

/**
 * The kind the relationships are hung off: whichever base kind the
 * most relationship tables point at.
 *
 * Counted in DISTINCT JOIN TABLES, not in columns, so a join carrying
 * two references into the same table cannot vote twice. Ties break on
 * the kind name, so two runs over the same data never disagree.
 */
export function subjectKindOf(project: FanProject): TableKind | null {
  const votes = new Map<TableKind, number>()
  for (const entity of Object.values(project.entities)) {
    if (entity.role !== 'join') continue
    const seen = new Set<TableKind>()
    for (const field of refFields(entity)) {
      const far = project.entities[field.refEntityId as string]
      if (!far || far.role === 'join' || !far.kind) continue
      seen.add(far.kind)
    }
    for (const kind of seen) votes.set(kind, (votes.get(kind) ?? 0) + 1)
  }
  let best: TableKind | null = null
  let bestN = 0
  for (const [kind, n] of [...votes.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (n > bestN) {
      best = kind
      bestN = n
    }
  }
  return best
}

/* ---------------------------------------------------------- */
/* One relationship table, read from one subject's side        */
/* ---------------------------------------------------------- */

const liveCount = (project: FanProject, tableId: string): number =>
  (project.rowsByEntity[tableId] ?? []).filter((r) => !isDiscontinued(r)).length

function tallyOrigin(row: RowData, into: Provenance): void {
  const v = readCell(row, PAIR_ORIGIN_FIELD)
  if (v === 'rule') into.derived += 1
  else if (v === 'removed') into.withdrawn += 1
  else into.typed += 1
}

const addTo = (into: Provenance, from: Provenance): void => {
  into.derived += from.derived
  into.typed += from.typed
  into.withdrawn += from.withdrawn
}

interface Read {
  strand: Strand
  /** kept out of `Strand` so the value a screen reads stays a number;
   *  the group needs the set to union it */
  reached: Set<string>
}

/** Strands one join table contributes to one subject table's fan.
 *
 *  Returns nothing when the join does not name the subject — that is
 *  the ordinary case, and it is how a fan stays about its own table
 *  rather than becoming a directory of every relationship on the
 *  sheet. */
function readJoin(project: FanProject, join: EntityDef, subject: EntityDef): Read[] {
  const refs = refFields(join)
  const subjectField = refs.find((f) => f.refEntityId === subject.id)
  if (!subjectField) return []

  const others = refs.filter((f) => f.id !== subjectField.id)
  if (others.length === 0) return []

  const rows = project.rowsByEntity[join.id] ?? []
  const heldBack = isRetired(join)

  const out: Read[] = []
  const primary = project.entities[others[0].refEntityId as string]
  others.forEach((field, i) => {
    const partner = project.entities[field.refEntityId as string]
    if (!partner) return

    const reached = new Set<string>()
    const partnersUsed = new Set<string>()
    const provenance: Provenance = { derived: 0, typed: 0, withdrawn: 0 }
    let pairs = 0
    let blank = 0

    for (const row of rows) {
      const far = readCell(row, field.id)
      if (typeof far !== 'string' || far === '') {
        blank += 1
        continue
      }
      const near = readCell(row, subjectField.id)
      if (typeof near === 'string' && near !== '') reached.add(near)
      partnersUsed.add(far)
      tallyOrigin(row, provenance)
      pairs += 1
    }

    out.push({
      reached,
      strand: {
        id: `${join.id}:${field.id}`,
        /* the FIRST far reference is the relationship the table is
           for; anything after it is a fact recorded ON the pairing */
        via: i === 0 ? 'table' : 'column',
        joinTableId: join.id,
        joinTableName: join.name,
        role: field.name,
        partnerTableId: partner.id,
        partnerTableName: partner.name,
        partnerKind: partner.kind ?? 'custom',
        partnerAccent: partner.accent,
        pairs,
        blank,
        subjectsReached: reached.size,
        partnersUsed: partnersUsed.size,
        partnerCatalogue: isRetired(partner)
          ? (project.rowsByEntity[partner.id] ?? []).length
          : liveCount(project, partner.id),
        provenance,
        heldBack,
        carriedOn: i === 0 ? undefined : primary?.name,
        carriedOnRole: i === 0 ? undefined : others[0].name,
      },
    })
  })
  return out
}

/* ---------------------------------------------------------- */
/* The whole reading                                           */
/* ---------------------------------------------------------- */

/**
 * Every subject table's fan, largest first.
 *
 * ORDERED BY SUBJECT COUNT, because that is the order a person reads
 * their own catalogue in — the table with 588 rows is the business
 * and the one with 9 is a sideline, and sorting alphabetically buries
 * that. Groups inside a fan are ordered by pairings, with a group
 * carried ON another relationship kept directly under it.
 */
export function readFanOut(project: FanProject, kind?: TableKind): FanReading {
  const subjectKind = kind ?? subjectKindOf(project)
  const empty: FanReading = {
    subjectKind,
    fans: [],
    subjects: 0,
    pairs: 0,
    carried: 0,
    provenance: { derived: 0, typed: 0, withdrawn: 0 },
    heldBackPairs: 0,
    heldBackTables: [],
    partnerTables: 0,
    joinTables: 0,
    roles: [],
  }
  if (!subjectKind) return empty

  const joins = Object.values(project.entities).filter((e) => e.role === 'join')
  const subjectTables = Object.values(project.entities).filter(
    (e) => e.role !== 'join' && e.kind === subjectKind && !isRetired(e),
  )
  if (subjectTables.length === 0) return empty

  const fans: Fan[] = []
  const partnerTables = new Set<string>()
  const joinTables = new Set<string>()
  const heldBackTables = new Set<string>()
  const roleOrder = new Map<string, number>()
  let pairs = 0
  let carried = 0
  let heldBackPairs = 0
  const provenance: Provenance = { derived: 0, typed: 0, withdrawn: 0 }

  for (const subject of subjectTables) {
    const rows = project.rowsByEntity[subject.id] ?? []
    const subjects = rows.filter((r) => !isDiscontinued(r)).length

    const reads: Read[] = []
    for (const join of joins) reads.push(...readJoin(project, join, subject))
    if (reads.length === 0) continue

    /* ---- group by the relationship's own name ---- */
    const byRole = new Map<string, { group: StrandGroup; reached: Set<string> }>()
    for (const read of reads) {
      const s = read.strand
      let entry = byRole.get(s.role)
      if (!entry) {
        entry = {
          reached: new Set<string>(),
          group: {
            role: s.role,
            via: s.via,
            strands: [],
            pairs: 0,
            heldBackPairs: 0,
            reached: 0,
            missing: 0,
            provenance: { derived: 0, typed: 0, withdrawn: 0 },
            heldBack: true,
          },
        }
        byRole.set(s.role, entry)
      }
      entry.group.strands.push(s)
      /* a group is held back only when EVERY strand in it is — one
         live table makes the relationship live, and a held-back
         strand's pairings are counted on their own line so a total
         never quietly includes stock nobody may be offered */
      if (s.heldBack) {
        entry.group.heldBackPairs += s.pairs
      } else {
        entry.group.heldBack = false
        entry.group.pairs += s.pairs
        addTo(entry.group.provenance, s.provenance)
        for (const id of read.reached) entry.reached.add(id)
      }
      if (s.via === 'table') entry.group.via = 'table'
    }

    const groups: StrandGroup[] = []
    for (const { group, reached } of byRole.values()) {
      group.strands.sort((a, b) => b.pairs - a.pairs || a.partnerTableName.localeCompare(b.partnerTableName))
      group.reached = reached.size
      group.missing = Math.max(0, subjects - reached.size)
      groups.push(group)
    }
    /* 'table' groups by weight, then the facts carried on them */
    groups.sort((a, b) => {
      if (a.via !== b.via) return a.via === 'table' ? -1 : 1
      return b.pairs - a.pairs || a.role.localeCompare(b.role)
    })

    let livePairs = 0
    let liveCarried = 0
    for (const group of groups) {
      if (!roleOrder.has(group.role)) roleOrder.set(group.role, roleOrder.size)
      for (const s of group.strands) {
        joinTables.add(s.joinTableId)
        partnerTables.add(s.partnerTableId)
        if (s.heldBack) {
          heldBackPairs += s.pairs
          heldBackTables.add(s.joinTableName)
          continue
        }
        if (s.via === 'column') {
          liveCarried += s.pairs
          carried += s.pairs
          continue
        }
        livePairs += s.pairs
        pairs += s.pairs
        addTo(provenance, s.provenance)
      }
    }

    fans.push({
      subjectTableId: subject.id,
      subjectTableName: subject.name,
      subjectAccent: subject.accent,
      subjectKind,
      subjects,
      subjectsDiscontinued: rows.length - subjects,
      groups,
      pairs: livePairs,
      carried: liveCarried,
    })
  }

  fans.sort(
    (a, b) => b.subjects - a.subjects || a.subjectTableName.localeCompare(b.subjectTableName),
  )

  return {
    subjectKind,
    fans,
    subjects: fans.reduce((n, f) => n + f.subjects, 0),
    pairs,
    carried,
    provenance,
    heldBackPairs,
    heldBackTables: [...heldBackTables].sort(),
    partnerTables: partnerTables.size,
    joinTables: joinTables.size,
    roles: [...roleOrder.keys()],
  }
}

/* ---------------------------------------------------------- */
/* One relationship across every fan — the asymmetry, counted  */
/* ---------------------------------------------------------- */

/** What one relationship looks like across the whole sheet: which
 *  subject tables have it, and which do not.
 *
 *  THE ABSENCES ARE THE INTERESTING HALF. Six of the seven boat
 *  tables in the Northside seed take a loose outboard and two take a
 *  factory package instead; only three carry a dealer-fit block. That
 *  asymmetry is real business fact, it is invisible in any per-table
 *  view, and it falls straight out of counting. */
export interface RoleSpread {
  role: string
  /** subject tables that carry it, largest first */
  present: { tableName: string; pairs: number; reached: number; subjects: number }[]
  /** subject tables that do not */
  absent: string[]
  pairs: number
}

export function readRoles(reading: FanReading): RoleSpread[] {
  const out: RoleSpread[] = []
  for (const role of reading.roles) {
    const present: RoleSpread['present'] = []
    const absent: string[] = []
    let pairs = 0
    for (const fan of reading.fans) {
      const group = fan.groups.find((g) => g.role === role && !g.heldBack)
      if (!group || group.pairs === 0) {
        absent.push(fan.subjectTableName)
        continue
      }
      pairs += group.pairs
      present.push({
        tableName: fan.subjectTableName,
        pairs: group.pairs,
        reached: group.reached,
        subjects: fan.subjects,
      })
    }
    present.sort((a, b) => b.pairs - a.pairs || a.tableName.localeCompare(b.tableName))
    out.push({ role, present, absent, pairs })
  }
  return out.sort((a, b) => b.pairs - a.pairs || a.role.localeCompare(b.role))
}
