/* ============================================================
   FINDING A THING BY ITS NAME — the whole matcher, as pure data.

   THE FAILURE THIS PREVENTS. With the real file loaded — 21 tables,
   651 rows — `document.querySelectorAll('input,textarea')` returned
   an empty list. There was no search on the sheet at all. Reaching
   one boat cost six clicks, one dead end and a 1,203px scroll, and
   it only worked because the person already knew which of the 21
   tables that boat lives in. The one fact this app most assumes you
   know is the one fact it never taught.

   SO THE ANSWER IS GROUPED BY TABLE, NOT FLATTENED. A flat hit list
   would find the row and still not say where it lives; grouping the
   hits under the table they came from makes every search a lesson in
   the shape of the sheet. That is why `search()` returns groups
   rather than a list, and why a matching TABLE NAME is a result in
   its own right.

   WHY THIS FILE HOLDS NO REACT. Everything here is a function of
   (index, query) with no store, no DOM and no clock, so the ranking
   and the caps can be tested at their real size rather than through
   a rendered component.

   WHAT A ROW IS CALLED IS NEVER GUESSED. Every table already
   declares `displayFieldId`, and `displayFieldOf` resolves the
   default when it does not — so the label a search matches is the
   same label the reference pickers, the node badges and the quote
   lines use. Nothing here invents a name.

   A PAIR IS NOT A PLACE, SO A PAIR IS NEVER A DESTINATION.

   This file used to make all 27 joins doors, and it was ruled
   against: "all tables should be a module, and than their join and
   view ones should lie within them". The measurement is what the
   ruling was about — typing `crossfire` answered with the two real
   Stacer boats and then STACER × P/D PARTS (8), STACER × YAMAHA —
   MOTOR FITMENT (8) and STACER × STACER TRAILERS (4), so the answer
   was 2 things and 20 rows of internal plumbing, and pressing one
   landed the reader on a raw pair-record sheet.

   A pair row's name is not a name. It is TWO names with a separator
   between them, composed by the seed from the links that define the
   pair (`northside.ts`: `resolved.label = names.join(' · ')`). So a
   match inside one is always a match on one of the two things it
   pairs — and those things are already in this index, under their
   own tables, spelled the same way. Measured over the real file:
   2,260 of 2,260 pair rows are named entirely by the rows they point
   at, zero counter-examples. A pair row therefore adds no reachable
   thing, and is searched THROUGH rather than INTO.

   Two consequences, both deliberate:
     · a pair row that says something its two sides do not — a
       hand-typed pair name, which this file does not have but
       another org's data can — is not dropped. It is answered with
       the row the pair is ABOUT (the first link column), carrying
       the name of the list it was found in, so nothing becomes
       unfindable and no press lands on a pair sheet.
     · a `role: 'join'` table with no link column at all is not a
       pair list in any usable sense — there is nothing to resolve
       to — so it is indexed exactly like a base table. No data can
       fall out of reach through this rule.

   HISTORY IS OFFERED, AND SAID. A retired table is what an old quote
   was written against; `model.ts` keeps it and `sellable.ts` states
   the rule — the data stays, no customer-facing surface offers it,
   and the sheet does not filter, "because hiding rows from the
   person whose job is fixing them is how data rots unseen". This
   field lands a person on the SHEET, which is that person's surface,
   so withholding the retired table would make it unmaintainable and
   silently unfindable. It is answered LAST, after everything live,
   and every line that carries it says it is history rather than
   stock. Nothing retired is ever ranked as though it were stock.
   ============================================================ */

import {
  displayFieldOf,
  isImageValue,
  isRetired,
  type AccentKey,
  type EntityDef,
  type FieldDef,
  type RowData,
  type TableKind,
  type TableRole,
} from '@/types/model'

/* ------------------------------------------------------------ */
/* The index                                                     */
/* ------------------------------------------------------------ */

/** One searchable row: what it is called, and where it lives.
 *
 *  `entityId` and `rowId` are WHERE THE PRESS LANDS, which is not
 *  always where the text was found — see `via`. They are never a
 *  join. */
export interface RowEntry {
  entityId: string
  rowId: string
  /** the row's own label, as the rest of the app spells it */
  label: string
  /** the lower-cased form actually scanned — folded once, at build
   *  time, so a keystroke never pays for 651 `toLowerCase()` calls */
  hay: string
  /** set when the text scanned belongs to a PAIR LIST rather than to
   *  the row this entry lands on: the pair list's own name, so the
   *  answer can say where it was read. */
  via?: string
}

/** One searchable table. A table name is a legitimate answer to
 *  "where does this live?", which is the question the audit found
 *  unanswered.
 *
 *  `destId` is the table a press OPENS. For a pair list it is the
 *  table the pairs are about, because a pair list lies within the
 *  thing it pairs and is not somewhere to stand. */
export interface TableEntry {
  entityId: string
  destId: string
  name: string
  hay: string
}

/** What each table is, carried alongside so a result can show the
 *  kind mark and the accent without a second lookup at paint time. */
export interface TableFacts {
  id: string
  name: string
  kind?: TableKind
  role?: TableRole
  accent: AccentKey
  /** history rather than stock — every line drawing this says so */
  retired: boolean
  /** how many rows of this table are searchable at all */
  rowCount: number
}

export interface SearchIndex {
  rows: RowEntry[]
  tables: TableEntry[]
  facts: Record<string, TableFacts>
  /** rows a search can land on, each carrying a usable name — the
   *  number the empty state quotes. Pair rows are not among them:
   *  they are searched through to the things they pair. */
  rowTotal: number
  /** LIVE tables — the same 50 Home's header and the dock badge
   *  print. A retired table is still answerable and is still marked
   *  as history; it is simply not counted as part of the business. */
  tableTotal: number
  /** rows that live in a pair list, searched through to their sides */
  pairRows: number
  /** entries reading a pair list's own extra wording. Zero on the
   *  real file, which is why the dedupe pass is gated on it. */
  viaRows: number
  /** tables held out of `tableTotal` because they are history */
  retiredTables: number
}

export const EMPTY_INDEX: SearchIndex = {
  rows: [],
  tables: [],
  facts: {},
  rowTotal: 0,
  tableTotal: 0,
  pairRows: 0,
  viaRows: 0,
  retiredTables: 0,
}

/** A cell only counts as a NAME if it is text or a figure. An image
 *  list stringifies to `[object Object]` and a yes/no stringifies to
 *  "true" — both would be indexed as though somebody had typed them,
 *  which is the placeholder-as-value failure in miniature. A row with
 *  no usable name is simply not findable BY name, and that is honest. */
const labelOf = (v: unknown): string => {
  if (isImageValue(v as never)) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

/** A pair list, and nothing about boats in it: the link columns that
 *  define the pair, in the order the table declares them. */
const linkFieldsOf = (
  entity: EntityDef,
  entities: Record<string, EntityDef>,
): FieldDef[] =>
  entity.fields.filter(
    (f) => f.type === 'reference' && f.refEntityId !== undefined && Boolean(entities[f.refEntityId]),
  )

/** Is this table a list of pairs rather than a list of things? Keyed
 *  on the declared role and on there being something to resolve to —
 *  a `role: 'join'` table with no link column has no pair to be about
 *  and is treated as an ordinary table, so nothing in it can fall out
 *  of reach. */
const isPairList = (entity: EntityDef, links: FieldDef[]): boolean =>
  entity.role === 'join' && links.length > 0

/** What a pair row's name says that the two things it pairs do not.
 *
 *  A composed pair name — "Stacer - Crossfire 449 · Yamaha - F90XB" —
 *  leaves nothing once both sides are struck out, which is the whole
 *  file's case (2,260 of 2,260). Anything left over is wording
 *  somebody typed onto the pair itself, and it is kept. */
function residueOf(hay: string, sides: string[]): string {
  let rest = hay
  for (const side of sides) {
    if (!side) continue
    const at = rest.indexOf(side)
    if (at < 0) continue
    rest = `${rest.slice(0, at)} ${rest.slice(at + side.length)}`
  }
  if (!/[a-z0-9]/.test(rest)) return ''
  return rest.trim().replace(/\s+/g, ' ')
}

/** Fold the whole project into one flat scannable list.
 *
 *  Cost is linear in rows and is paid ONCE per opening of the field,
 *  never per keystroke — see SearchField.tsx, which builds this only
 *  while the field is open. */
export function buildSearchIndex(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): SearchIndex {
  const rows: RowEntry[] = []
  const tables: TableEntry[] = []
  const facts: Record<string, TableFacts> = {}
  const all = Object.values(entities)

  /* every row's label, by row id, so a pair row can ask what the rows
     it links are called without a second walk of the project */
  const labelByRow = new Map<string, { entityId: string; label: string }>()
  const pairs: { entity: EntityDef; links: FieldDef[] }[] = []
  let pairRows = 0
  let viaRows = 0
  let retiredTables = 0

  for (const entity of all) {
    const field = displayFieldOf(entity)
    const list = rowsByEntity[entity.id] ?? []
    const links = linkFieldsOf(entity, entities)
    const pairList = isPairList(entity, links)
    let counted = 0

    if (field) {
      for (const row of list) {
        const label = labelOf(row.values[field.id])
        if (!label) continue
        labelByRow.set(row.id, { entityId: entity.id, label })
        counted += 1
        /* A PAIR ROW IS NOT A THING. It is answered through the things
           it pairs — which are already in this list, under their own
           tables — so it is never its own entry. */
        if (pairList) continue
        rows.push({
          entityId: entity.id,
          rowId: row.id,
          label,
          hay: label.toLowerCase(),
        })
      }
    }

    if (pairList) {
      pairRows += counted
      pairs.push({ entity, links })
    }

    const retired = isRetired(entity)
    if (retired) retiredTables += 1
    facts[entity.id] = {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      role: entity.role,
      accent: entity.accent,
      retired,
      rowCount: counted,
    }
  }

  /* every table that is a list of pairs, so nothing below can resolve
     one pair list to another and put a pair sheet back on the far end
     of a press */
  const pairIds = new Set(pairs.map((p) => p.entity.id))

  /* -- the tables, and where each one opens ------------------- */
  for (const entity of all) {
    const links = linkFieldsOf(entity, entities)
    /* A PAIR LIST OPENS THE THING IT IS ABOUT — its first link column
       that names a real table, which is the side the pair is a fact
       about (a fitment list's first column is the boat, and its name
       reads "Highfield × Yamaha" in the same order). A RETIRED pair
       list is the one exception and stands as itself: its pairs are
       history, and sending a person who typed OBSOLETE to a live
       table would hide the very thing they asked for. */
    const subject =
      isPairList(entity, links) && !isRetired(entity)
        ? links.find((f) => f.refEntityId !== undefined && !pairIds.has(f.refEntityId))
            ?.refEntityId
        : undefined
    tables.push({
      entityId: entity.id,
      destId: subject && facts[subject] ? subject : entity.id,
      name: entity.name,
      hay: entity.name.toLowerCase(),
    })
  }

  /* -- pair wording nobody could otherwise reach -------------- */
  for (const { entity, links } of pairs) {
    const field = displayFieldOf(entity)
    if (!field) continue
    for (const row of rowsByEntity[entity.id] ?? []) {
      const label = labelOf(row.values[field.id])
      if (!label) continue
      const sides: string[] = []
      let subject: { entityId: string; rowId: string; label: string } | undefined
      for (const link of links) {
        const cell = row.values[link.id]
        if (typeof cell !== 'string') continue
        const target = labelByRow.get(cell)
        if (!target) continue
        sides.push(target.label.toLowerCase())
        /* the row this pair is about, and never a row of another pair
           list — the answer has to be a thing, not another pair */
        if (!subject && !pairIds.has(target.entityId)) {
          subject = { entityId: target.entityId, rowId: cell, label: target.label }
        }
      }
      if (!subject) continue
      const residue = residueOf(label.toLowerCase(), sides)
      if (!residue) continue
      rows.push({
        entityId: subject.entityId,
        rowId: subject.rowId,
        label: subject.label,
        hay: residue,
        via: entity.name,
      })
      viaRows += 1
    }
  }

  return {
    rows,
    tables,
    facts,
    rowTotal: rows.length,
    tableTotal: all.length - retiredTables,
    pairRows,
    viaRows,
    retiredTables,
  }
}

/* ------------------------------------------------------------ */
/* Matching                                                      */
/* ------------------------------------------------------------ */

/** Where the query landed in the name, coarsely. Lower is better.
 *  Three tiers and no more: a score anyone can predict beats a
 *  fuzzy distance nobody can.
 *
 *  A frozen object rather than an `enum` — esbuild strips types
 *  without a type checker, so a `const enum` inlines under `tsc` and
 *  survives as a runtime object under Vite. One shape in both builds
 *  is worth more than the inlining. */
export const RANK = {
  /** the name starts with what was typed */
  prefix: 0,
  /** it starts a word inside the name — "560" in "Sport 560" */
  word: 1,
  /** it appears somewhere in the middle */
  inside: 2,
} as const

export type Rank = (typeof RANK)[keyof typeof RANK]

const isWordEdge = (ch: string): boolean => !/[a-z0-9]/.test(ch)

/** WHAT A TABLE IS OUTRANKS HOW WELL IT MATCHED, and this is the
 *  single most important line in the file.
 *
 *  Measured on the real sheet as it stands (52 tables, 3,566 rows):
 *  searching the Highfield Sport 560 by name returns 211 matches, and
 *  151 of them were PAIR rows — "Highfield - SP560 (HYP) B-B-B ·
 *  Yamaha - F90XB" and the like — because a pair row's label is the
 *  two sides of the pair written out, so every product name appears
 *  in it as many times as it has partners. Ranked on match quality
 *  alone the three biggest pair lists took the top three groups and
 *  Highfield Inflatables, the table the person is actually looking
 *  for, landed fourth, below the fold, having eaten 24 of the 40
 *  result slots on the way down.
 *
 *  Pair rows no longer answer at all — see the header — so the tier
 *  a pair list can still appear in is the one where its own NAME
 *  matched, and there it stands for the table it is about. What is
 *  left to order is: things you sell, then the assembled
 *  combinations, then a pair list answering for its subject, and
 *  HISTORY LAST. A retired table is answerable and marked; it is
 *  never ranked as though it were stock. */
const standing = (t: TableFacts): number =>
  t.retired ? 3 : t.role === 'join' ? 2 : t.role === 'view' ? 1 : 0

function rankOf(hay: string, at: number): Rank {
  if (at === 0) return RANK.prefix
  return isWordEdge(hay[at - 1]) ? RANK.word : RANK.inside
}

export interface RowHit {
  rowId: string
  label: string
  rank: Rank
  /** where the match starts in `label`, for the highlight. -1 when
   *  the text matched was not this label — a pair list's own wording */
  at: number
  length: number
  /** the pair list the match was read in, when it was not this row */
  via?: string
}

export interface TableHit {
  /** the table a press OPENS — never a live pair list */
  table: TableFacts
  rank: Rank
  at: number
  length: number
  /** set when what matched was a PAIR LIST that lies within `table`:
   *  the list's own name, and how many of this table's lists matched.
   *  `at` is -1 whenever this is set, because the run that matched is
   *  not in the label being drawn. */
  via?: { name: string; count: number }
}

/** All hits from one table, in rank order, with the count that did
 *  not fit. `more` is never a lie: it is measured before the cap. */
export interface RowGroup {
  table: TableFacts
  hits: RowHit[]
  /** matches in this table beyond the ones listed */
  more: number
  /** every match in this table, capped or not */
  total: number
}

export interface SearchResult {
  /** tables whose own NAME matched — the "which of 21" answer */
  tables: TableHit[]
  /** row matches, grouped by the table they live in */
  groups: RowGroup[]
  /** every row match found, before any cap */
  rowTotal: number
  /** rows actually listed */
  rowShown: number
}

export const NO_RESULT: SearchResult = {
  tables: [],
  groups: [],
  rowTotal: 0,
  rowShown: 0,
}

export interface SearchLimits {
  /** rows listed under any one table before it says "+N more" */
  perTable: number
  /** rows listed across the whole answer */
  total: number
  /** tables listed in the tables group */
  tables: number
}

/** THE CAPS ARE THE PERFORMANCE STORY, not a debounce.
 *
 *  Scanning 651 short strings for a substring is arithmetic — it does
 *  not need deferring. What DOES cost is painting: a one-letter query
 *  matches most of the file, and 651 list rows in the DOM is the only
 *  part of this that could ever be slow. So the answer is bounded at
 *  the top rather than delayed at the bottom, and the field stays
 *  honest about what it hid ("+N more in this table").
 *
 *  8 per table shows a whole series without scrolling; 40 total keeps
 *  the popover a popover. */
export const DEFAULT_LIMITS: SearchLimits = { perTable: 8, total: 40, tables: 6 }

/** The shortest query worth answering. One character matches almost
 *  everything and teaches nothing; two is where a name starts to
 *  narrow. */
export const MIN_QUERY = 2

export const normalizeQuery = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ').toLowerCase()

/** Keep the first reading of each row and drop the rest. The list is
 *  already sorted best-first, so "first" is "best". */
function dedupeByRow(hits: RowHit[]): RowHit[] {
  const seen = new Set<string>()
  const out: RowHit[] = []
  for (const h of hits) {
    if (seen.has(h.rowId)) continue
    seen.add(h.rowId)
    out.push(h)
  }
  return out
}

/**
 * Match `query` against every row label and table name in `index`.
 *
 * Deterministic and allocation-light: one pass over the rows building
 * per-table buckets, one sort per bucket, one sort of the buckets.
 */
export function search(
  index: SearchIndex,
  rawQuery: string,
  limits: SearchLimits = DEFAULT_LIMITS,
): SearchResult {
  const q = normalizeQuery(rawQuery)
  if (q.length < MIN_QUERY) return NO_RESULT

  /* -- tables whose own name matched -------------------------
     ONE LINE PER PLACE, NEVER ONE PER PAIR LIST. Three of Stacer's
     pair lists carry the word "Stacer", so before this was keyed on
     the DESTINATION the query `stacer` drew four lines that opened
     the same table. The direct hit wins outright; among pair lists
     the best-ranked one is named and the rest are counted. */
  const byDest = new Map<string, TableHit>()
  for (const t of index.tables) {
    const at = t.hay.indexOf(q)
    if (at < 0) continue
    const facts = index.facts[t.destId]
    if (!facts) continue
    const via = t.destId === t.entityId ? undefined : t.name
    const rank = rankOf(t.hay, at)
    const held = byDest.get(t.destId)
    if (!held) {
      byDest.set(t.destId, {
        table: facts,
        rank,
        at: via ? -1 : at,
        length: q.length,
        ...(via ? { via: { name: via, count: 1 } } : {}),
      })
      continue
    }
    if (!via) {
      /* the table's own name beats any list inside it */
      if (held.via) byDest.set(t.destId, { table: facts, rank, at, length: q.length })
      continue
    }
    if (!held.via) continue
    const count = held.via.count + 1
    const better = rank < held.rank || (rank === held.rank && t.name.length < held.via.name.length)
    byDest.set(t.destId, {
      table: facts,
      rank: better ? rank : held.rank,
      at: -1,
      length: q.length,
      via: { name: better ? via : held.via.name, count },
    })
  }
  const tableHits = [...byDest.values()].sort(
    (a, b) =>
      standing(a.table) - standing(b.table) ||
      (a.via ? 1 : 0) - (b.via ? 1 : 0) ||
      a.rank - b.rank ||
      a.table.name.length - b.table.name.length,
  )

  /* -- rows, bucketed by the table they OPEN ------------------ */
  const buckets = new Map<string, RowHit[]>()
  for (const r of index.rows) {
    const at = r.hay.indexOf(q)
    if (at < 0) continue
    let bucket = buckets.get(r.entityId)
    if (!bucket) {
      bucket = []
      buckets.set(r.entityId, bucket)
    }
    bucket.push({
      rowId: r.rowId,
      label: r.label,
      /* a match read in a pair list's own wording is not a match on
         the name being drawn, so it carries no highlight and never
         outranks one */
      rank: r.via ? RANK.inside : rankOf(r.hay, at),
      at: r.via ? -1 : at,
      length: q.length,
      ...(r.via ? { via: r.via } : {}),
    })
  }

  const groups: RowGroup[] = []
  let rowTotal = 0
  for (const [entityId, hits] of buckets) {
    const table = index.facts[entityId]
    if (!table) continue
    /* the row's own name first, then the strongest match, then the
       shortest name — "Sport 560" outranks "Sport 560 Deluxe Package"
       for the query "sport 560" */
    hits.sort(
      (a, b) =>
        (a.via ? 1 : 0) - (b.via ? 1 : 0) ||
        a.rank - b.rank ||
        a.label.length - b.label.length ||
        (a.label < b.label ? -1 : 1),
    )
    /* ONE LINE PER ROW. A row reached both by its own name and through
       a pair list's wording is one answer, and the sorted order above
       has already put the better reading first. Gated on there being
       any pair wording at all, which on the real file there is not. */
    const listed = index.viaRows > 0 ? dedupeByRow(hits) : hits
    rowTotal += listed.length
    groups.push({ table, hits: listed, more: 0, total: listed.length })
  }

  /* things you sell first, history last (see `standing`); within a
     tier, the table holding the best answer, then the one with more to
     show, then its name — so the order is stable from one keystroke to
     the next and nothing jumps under the cursor */
  groups.sort(
    (a, b) =>
      standing(a.table) - standing(b.table) ||
      a.hits[0].rank - b.hits[0].rank ||
      b.hits.length - a.hits.length ||
      (a.table.name < b.table.name ? -1 : 1),
  )

  /* -- caps, applied last so `more` and `total` stay truthful -- */
  let budget = limits.total
  const capped: RowGroup[] = []
  for (const g of groups) {
    if (budget <= 0) break
    const take = Math.min(g.hits.length, limits.perTable, budget)
    budget -= take
    capped.push({
      table: g.table,
      hits: g.hits.slice(0, take),
      more: g.hits.length - take,
      total: g.hits.length,
    })
  }

  return {
    tables: tableHits.slice(0, limits.tables),
    groups: capped,
    rowTotal,
    rowShown: limits.total - budget,
  }
}

/* ------------------------------------------------------------ */
/* Keyboard order                                                */
/* ------------------------------------------------------------ */

/** One thing the arrow keys can land on. The list is flat on purpose:
 *  the groups are how the answer READS, but a cursor that has to
 *  understand nesting is a cursor that gets stuck in it. */
export type Option =
  | { kind: 'table'; id: string; entityId: string }
  | { kind: 'row'; id: string; entityId: string; rowId: string }

/** The options in the exact order they are painted, so index N in
 *  this list is the Nth thing down the popover. */
export function optionsOf(result: SearchResult): Option[] {
  const out: Option[] = []
  for (const t of result.tables) {
    out.push({ kind: 'table', id: `t:${t.table.id}`, entityId: t.table.id })
  }
  for (const g of result.groups) {
    for (const h of g.hits) {
      out.push({
        kind: 'row',
        id: `r:${g.table.id}:${h.rowId}`,
        entityId: g.table.id,
        rowId: h.rowId,
      })
    }
  }
  return out
}
