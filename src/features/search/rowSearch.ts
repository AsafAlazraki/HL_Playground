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
   ============================================================ */

import {
  displayFieldOf,
  isImageValue,
  type AccentKey,
  type EntityDef,
  type RowData,
  type TableKind,
  type TableRole,
} from '@/types/model'

/* ------------------------------------------------------------ */
/* The index                                                     */
/* ------------------------------------------------------------ */

/** One searchable row: what it is called, and where it lives. */
export interface RowEntry {
  entityId: string
  rowId: string
  /** the row's own label, as the rest of the app spells it */
  label: string
  /** the lower-cased form actually scanned — folded once, at build
   *  time, so a keystroke never pays for 651 `toLowerCase()` calls */
  hay: string
}

/** One searchable table. A table name is a legitimate answer to
 *  "where does this live?", which is the question the audit found
 *  unanswered. */
export interface TableEntry {
  entityId: string
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
  /** how many rows of this table are searchable at all */
  rowCount: number
}

export interface SearchIndex {
  rows: RowEntry[]
  tables: TableEntry[]
  facts: Record<string, TableFacts>
  /** rows carrying a usable name — the number the empty state quotes */
  rowTotal: number
  tableTotal: number
}

export const EMPTY_INDEX: SearchIndex = {
  rows: [],
  tables: [],
  facts: {},
  rowTotal: 0,
  tableTotal: 0,
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

  for (const entity of Object.values(entities)) {
    const field = displayFieldOf(entity)
    const list = rowsByEntity[entity.id] ?? []
    let counted = 0

    if (field) {
      for (const row of list) {
        const label = labelOf(row.values[field.id])
        if (!label) continue
        rows.push({
          entityId: entity.id,
          rowId: row.id,
          label,
          hay: label.toLowerCase(),
        })
        counted += 1
      }
    }

    tables.push({
      entityId: entity.id,
      name: entity.name,
      hay: entity.name.toLowerCase(),
    })
    facts[entity.id] = {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      role: entity.role,
      accent: entity.accent,
      rowCount: counted,
    }
  }

  return {
    rows,
    tables,
    facts,
    rowTotal: rows.length,
    tableTotal: tables.length,
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
 *  Measured on the real sheet as it stands (48 tables, 2,862 rows):
 *  searching the Highfield Sport 560 by name returns 211 matches, and
 *  151 of them are JOIN rows — "Highfield - SP560 (HYP) B-B-B ·
 *  Yamaha - F90XB" and the like — because a join row's label is the
 *  two sides of the pair written out, so every product name appears
 *  in it as many times as it has partners. Ranked on match quality
 *  alone the three biggest joins take the top three groups and
 *  HIGHFIELD INFLATABLES, the table the person is actually looking
 *  for, lands fourth, below the fold, having eaten 24 of the 40
 *  result slots on the way down.
 *
 *  The model already settled this: a join "records pairs and has no
 *  independent existence" (`canBeModuleMaster`) — it is a
 *  relationship, not a place to stand. So base tables answer first,
 *  the assembled combinations after them, and the relationships
 *  last. They are all still listed, because hiding real rows would
 *  be a different lie. */
const roleOrder = (role: TableRole | undefined): number =>
  role === 'join' ? 2 : role === 'view' ? 1 : 0

function rankOf(hay: string, at: number): Rank {
  if (at === 0) return RANK.prefix
  return isWordEdge(hay[at - 1]) ? RANK.word : RANK.inside
}

export interface RowHit {
  rowId: string
  label: string
  rank: Rank
  /** where the match starts in `label`, for the highlight */
  at: number
  length: number
}

export interface TableHit {
  table: TableFacts
  rank: Rank
  at: number
  length: number
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

  /* -- tables whose own name matched ------------------------- */
  const tableHits: TableHit[] = []
  for (const t of index.tables) {
    const at = t.hay.indexOf(q)
    if (at < 0) continue
    const facts = index.facts[t.entityId]
    if (!facts) continue
    tableHits.push({ table: facts, rank: rankOf(t.hay, at), at, length: q.length })
  }
  tableHits.sort(
    (a, b) =>
      roleOrder(a.table.role) - roleOrder(b.table.role) ||
      a.rank - b.rank ||
      a.table.name.length - b.table.name.length,
  )

  /* -- rows, bucketed by the table they live in --------------- */
  const buckets = new Map<string, RowHit[]>()
  let rowTotal = 0
  for (const r of index.rows) {
    const at = r.hay.indexOf(q)
    if (at < 0) continue
    rowTotal += 1
    let bucket = buckets.get(r.entityId)
    if (!bucket) {
      bucket = []
      buckets.set(r.entityId, bucket)
    }
    bucket.push({
      rowId: r.rowId,
      label: r.label,
      rank: rankOf(r.hay, at),
      at,
      length: q.length,
    })
  }

  const groups: RowGroup[] = []
  for (const [entityId, hits] of buckets) {
    const table = index.facts[entityId]
    if (!table) continue
    /* strongest match first, then the shortest name — "Sport 560"
       outranks "Sport 560 Deluxe Package" for the query "sport 560" */
    hits.sort(
      (a, b) =>
        a.rank - b.rank || a.label.length - b.label.length || (a.label < b.label ? -1 : 1),
    )
    groups.push({ table, hits, more: 0, total: hits.length })
  }

  /* things you sell first, relationships last (see `roleOrder`);
     within a tier, the table holding the best answer, then the one
     with more to show, then its name — so the order is stable from
     one keystroke to the next and nothing jumps under the cursor */
  groups.sort(
    (a, b) =>
      roleOrder(a.table.role) - roleOrder(b.table.role) ||
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
