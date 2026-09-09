/* ============================================================
   FINDING A THING BY ITS NAME — the whole matcher, as pure data.

   THE FAILURE THIS PREVENTS. With the real file loaded — 21 tables,
   651 rows — `document.querySelectorAll('input,textarea')` returned
   an empty list. There was no search on the sheet at all. Reaching
   one boat cost six clicks, one dead end and a 1,203px scroll, and
   it only worked because the person already knew which of the 21
   tables that boat lives in. The one fact this app most assumes you
   know is the one fact it never taught.

   FIVE KINDS, AND IT WAS TWO. UX_PASS §2 asks for one field over
   MODULES · ROWS · QUOTES · TABLES · COLUMNS. This file answered
   with `{ tables, groups }` and nothing else, so three of the five
   were unreachable and two of those failed silently: on the prepared
   file `price` names 26 columns and `horsepower` names 2, and the
   palette answered both with "Nothing is called that". `boats` is
   the name of a MODULE holding seven brands and answered with ten
   rows in two unrelated tables. Measured, not inferred.

   WHAT EACH NEW KIND COSTS, because the caps are the performance
   story here and adding kinds is where that gets tested. Columns are
   folded ONCE per opening into 205 distinct names over 826
   declarations; modules are nine; quotes are however many a dealer
   has raised. A keystroke scans 205 + 9 + N short pre-folded strings
   on top of the 7,002 it already scanned, which is the same
   arithmetic and the same conclusion: cap the PAINT, never debounce
   the scan.

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
   own tables, spelled the same way. Measured over the real file at
   full scale: 8,679 of 8,679 pair rows are named entirely by the rows
   they point at, zero counter-examples — it was 2,260 of 2,260 when
   the finding was made, and going to the whole catalogue found no
   exception either. A pair row therefore adds no reachable
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
  type ModuleDef,
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
  /** how many columns it declares. §2's mock prints "30 columns · 40
   *  rows" beside a table, and it is the fact the COLUMNS kind below
   *  teaches — so it is counted once here rather than at paint. */
  fieldCount: number
}

/* ------------------------------------------------------------ */
/* The three kinds that were missing                             */
/* ------------------------------------------------------------ */

/** One searchable MODULE — the place in the business, not the table
 *  underneath it.
 *
 *  WHY IT IS NOT A `Place`. `places.ts` splits a module of seven boat
 *  tables into seven cards, each NAMED FOR ITS TABLE — so indexing
 *  places would answer `highfield` twice, once as a table and once as
 *  a card spelled identically. What a module adds that no table can
 *  is the dealer's word for the GROUPING: Boats, Trailers, Parts &
 *  Accessories, Labour Rates. Measured on the prepared file, none of
 *  those nine names is a table name, and `boats` answered with ten
 *  rows and no way to reach the module at all. */
export interface ModuleFacts {
  id: string
  name: string
  /** the admin's own line under the name. Searched as well as the
   *  name: "the outboards themselves" is how somebody describes what
   *  they are looking for when they cannot remember it is called
   *  Motors. */
  description: string
  accent: AccentKey
  /** its live tables, in the module's own order */
  tableIds: string[]
  /** rows across those tables — the figure §2's mock prints */
  rowCount: number
}

/** One searchable QUOTE, as the palette needs it.
 *
 *  DELIBERATELY NOT `QuoteDef`. Everything in this file is a function
 *  of (index, query) with no store, no DOM and no clock; a quote is
 *  the one kind that lives outside the project store entirely
 *  (`features/quote/quotes.ts` keeps them in localStorage), and
 *  reaching into that feature's shape from the matcher would make the
 *  matcher untestable without it. The caller adapts, once, and this
 *  file stays arithmetic. */
export interface QuoteFacts {
  id: string
  /** the document's own reference — what a person reads off a printed
   *  quote and types back in */
  reference: string
  /** what is being sold, frozen on the document */
  subject: string
  /** who it was written for, as the document prints it. Never
   *  resolved from a register: a quote is a photograph. */
  customer: string
  /** issued documents are not drafts, and the line says which */
  issued: boolean
  /** the document's own total, already computed by the quote feature.
   *  `null` when it has no lines or any line carries no price — a
   *  partial figure on a search result would be a lie about a
   *  document, and a silent $0 is the fault stakeholders catch. */
  total: number | null
}

interface ModuleEntry {
  facts: ModuleFacts
  hay: string
  /** the description, folded — scanned second so a name match always
   *  outranks a description match */
  says: string
}

interface QuoteEntry {
  facts: QuoteFacts
  /** the three things a quote is findable BY, folded once each so the
   *  answer can say which one matched and mark the right run */
  refHay: string
  subjectHay: string
  customerHay: string
}

/** One searchable COLUMN, folded across every table that declares it.
 *
 *  FOLDED BY NAME, AND THAT IS THE WHOLE DESIGN. The prepared file
 *  declares 826 columns under 205 distinct names: `price` alone
 *  appears in 26 of them. Twenty-six lines that each say "Nett Price"
 *  is a wall, and §2's own mock answers it in one — "Motor Envelope ›
 *  Min HP · on 7 boat tables". So one line per distinct name, and the
 *  count of tables is on it.
 *
 *  A COLUMN'S DESTINATION IS ITS TABLE'S DESTINATION, which means a
 *  column read in a pair list opens the table the pair list is about —
 *  the same ruling the file's header argues for pair rows and pair
 *  names, applied once more rather than a second rule. It matters:
 *  measured on the prepared file, 153 of the 228 columns declared on a
 *  pair list are declared NOWHERE ELSE, so dropping them would make
 *  "Prop Part No." and "Engine Hole" — dealer nouns an admin really
 *  does search for — unfindable. */
export interface ColumnEntry {
  /** as the best-standing table that declares it spells it */
  name: string
  hay: string
  /** where a press lands. Never a live pair list. */
  destId: string
  /** the pair list the column was read in, when the table that
   *  declares it is one */
  via?: string
  /** how many tables declare a column of this name */
  tables: number
}

export interface SearchIndex {
  rows: RowEntry[]
  tables: TableEntry[]
  facts: Record<string, TableFacts>
  /** the places in the business. Empty unless the caller passed them
   *  — see `ProjectExtras` and the door rule beside it. */
  modules: ModuleEntry[]
  /** the documents. Empty unless the caller passed them. */
  quotes: QuoteEntry[]
  /** every distinct column name on the sheet */
  columns: ColumnEntry[]
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
  /** columns declared across the whole sheet, before the fold — the
   *  figure the foot quotes, and never the folded length */
  columnTotal: number
}

export const EMPTY_INDEX: SearchIndex = {
  rows: [],
  tables: [],
  facts: {},
  modules: [],
  quotes: [],
  columns: [],
  rowTotal: 0,
  tableTotal: 0,
  pairRows: 0,
  viaRows: 0,
  retiredTables: 0,
  columnTotal: 0,
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
 *  file's case (8,679 of 8,679). Anything left over is wording
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

/** The two kinds that do not live in the project's tables.
 *
 *  BOTH ARE OPTIONAL, AND THE OMISSION IS THE CAPABILITY CHECK. §2's
 *  fourth rule is "a result a person cannot open does not appear for
 *  them", and the honest half of it that can be enforced today is
 *  this: a surface that has not been given a door to a module or to a
 *  quote does not put one in the index, so the palette cannot offer a
 *  press that goes nowhere. See `SearchFieldProps` for the props that
 *  are that door, and the report beside them for why the OTHER half —
 *  filtering per person — is blocked rather than skipped. */
export interface ProjectExtras {
  /** the places in the business, straight off the store */
  modules?: Record<string, ModuleDef>
  /** the documents, adapted by the caller — see `QuoteFacts` */
  quotes?: readonly QuoteFacts[]
}

/** Fold the whole project into one flat scannable list.
 *
 *  Cost is linear in rows and is paid ONCE per opening of the field,
 *  never per keystroke — see SearchField.tsx, which builds this only
 *  while the field is open. */
export function buildSearchIndex(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
  extras: ProjectExtras = {},
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
      fieldCount: entity.fields.length,
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

  /* -- the columns, folded by name ---------------------------
     One pass over 826 declarations, keyed on the folded name, and
     the whole fold is paid once per opening like everything else
     here. The destination is the DECLARING table's destination, so a
     column read on a fitment list opens the boats it is a fact
     about — see `ColumnEntry`. */
  const entryOf = new Map(tables.map((t) => [t.entityId, t]))
  const byName = new Map<
    string,
    { best: TableEntry; bestFacts: TableFacts; name: string; tables: number }
  >()
  let columnTotal = 0
  for (const entity of all) {
    const here = entryOf.get(entity.id)
    const dest = here ? facts[here.destId] : undefined
    if (!here || !dest) continue
    for (const field of entity.fields) {
      const key = field.name.trim().toLowerCase()
      if (key === '') continue
      columnTotal += 1
      const held = byName.get(key)
      if (!held) {
        byName.set(key, { best: here, bestFacts: dest, name: field.name.trim(), tables: 1 })
        continue
      }
      held.tables += 1
      /* things you sell before combinations before relationships
         before history, then the fullest table — so the one line
         this name gets opens the place most likely to be meant */
      const better =
        standing(dest) - standing(held.bestFacts) ||
        held.bestFacts.rowCount - dest.rowCount ||
        (dest.name < held.bestFacts.name ? -1 : 1)
      if (better < 0) {
        held.best = here
        held.bestFacts = dest
        held.name = field.name.trim()
      }
    }
  }
  const columns: ColumnEntry[] = []
  for (const [key, held] of byName) {
    const via = held.best.destId === held.best.entityId ? undefined : held.best.name
    columns.push({
      name: held.name,
      hay: key,
      destId: held.best.destId,
      tables: held.tables,
      ...(via ? { via } : {}),
    })
  }

  /* -- the places in the business ---------------------------- */
  const modules: ModuleEntry[] = []
  for (const module of Object.values(extras.modules ?? {})) {
    /* A MODULE THAT DOES NOT OFFER `browse` IS NOT SOMEWHERE TO BE
       SENT. `MODULE_CAPABILITIES.browse` is "see everything in it",
       which is exactly what a press on this line does; `open` is
       looking at one item and is not what is being offered here.
       This is a fact about the MODULE and needs no role to answer,
       which is why it is checked and the per-person half is not. */
    if (!module.capabilities.includes('browse')) continue
    const live = module.tableIds.filter((id) => facts[id] !== undefined)
    let rowCount = 0
    for (const id of live) rowCount += facts[id]?.rowCount ?? 0
    modules.push({
      facts: {
        id: module.id,
        name: module.name,
        description: module.description,
        accent: module.accent,
        tableIds: live,
        rowCount,
      },
      hay: module.name.toLowerCase(),
      says: module.description.toLowerCase(),
    })
  }

  /* -- the documents ------------------------------------------
     Kept in the order handed in, which `quotes.ts` publishes newest
     first: a list of quotes is a diary, and equal matches should
     come back in the order the rest of the app lists them. */
  const quotes: QuoteEntry[] = (extras.quotes ?? []).map((q) => ({
    facts: q,
    refHay: q.reference.toLowerCase(),
    subjectHay: q.subject.toLowerCase(),
    customerHay: q.customer.toLowerCase(),
  }))

  return {
    rows,
    tables,
    facts,
    modules,
    quotes,
    columns,
    rowTotal: rows.length,
    tableTotal: all.length - retiredTables,
    pairRows,
    viaRows,
    retiredTables,
    columnTotal,
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
 *  Measured on the real sheet when this was written (52 tables,
 *  3,566 rows; it now holds 53 and 11,116, of which 8,679 ARE pair
 *  rows, so the ratio this paragraph is about has only got worse):
 *  searching the Highfield Sport 560 by name returned 211 matches, and
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

/** A place in the business whose name or description matched. */
export interface ModuleHit {
  module: ModuleFacts
  rank: Rank
  /** where the run starts in the NAME. -1 when what matched was the
   *  description, which carries no highlight and never outranks a
   *  name — the same rule a pair-list reading follows. */
  at: number
  length: number
}

/** Which of a quote's three findable facts the query landed in. A
 *  document is one line, so the line has to say why it is there. */
export type QuoteMatch = 'reference' | 'subject' | 'customer'

export interface QuoteHit {
  quote: QuoteFacts
  rank: Rank
  where: QuoteMatch
  /** the run inside whichever string `where` names */
  at: number
  length: number
}

/** One distinct column name, and the table a press opens. */
export interface ColumnHit {
  /** the table a press OPENS — never a live pair list */
  table: TableFacts
  name: string
  rank: Rank
  at: number
  length: number
  /** how many tables declare a column of this name */
  tables: number
  /** the pair list it was read in, when the declaring table is one */
  via?: string
}

export interface SearchResult {
  /** the places in the business — the grouping a dealer names, which
   *  no table is called */
  modules: ModuleHit[]
  /** tables whose own NAME matched — the "which of 21" answer */
  tables: TableHit[]
  /** row matches, grouped by the table they live in */
  groups: RowGroup[]
  /** documents — a reference, who it was for, what it sold */
  quotes: QuoteHit[]
  /** distinct column names, and where each one is declared */
  columns: ColumnHit[]
  /** distinct column names that matched, before the cap */
  columnTotal: number
  /** every row match found, before any cap */
  rowTotal: number
  /** rows actually listed */
  rowShown: number
  /** SET ONLY BY `browse()` — how many places the resting list could
   *  have offered, so the foot can say what it left out. Absent on a
   *  real search, where `rowTotal`/`rowShown` already say it. */
  placeTotal?: number
}

export const NO_RESULT: SearchResult = {
  modules: [],
  tables: [],
  groups: [],
  quotes: [],
  columns: [],
  columnTotal: 0,
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
  /** places listed. There are nine on the prepared file, so this is
   *  a guard against another org's fifty rather than a real cap. */
  modules: number
  /** documents listed. A dealer's quote list grows without bound and
   *  a palette is not the quotes screen. */
  quotes: number
  /** distinct column names listed. `price` folds 26 declarations into
   *  six names, and six is what a person can read at a glance. */
  columns: number
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
export const DEFAULT_LIMITS: SearchLimits = {
  perTable: 8,
  total: 40,
  tables: 6,
  modules: 4,
  quotes: 5,
  columns: 6,
}

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

  /* -- the places in the business ----------------------------
     A NAME MATCH ALWAYS BEATS A DESCRIPTION MATCH, and a description
     match carries no highlight, because the run it was found in is
     not the run being drawn. Identical to the pair-list reading rule
     twenty lines down; written twice because the two lists are
     different shapes, and stated once here so it is not read as a
     coincidence. */
  const moduleHits: ModuleHit[] = []
  for (const m of index.modules) {
    const at = m.hay.indexOf(q)
    if (at >= 0) {
      moduleHits.push({ module: m.facts, rank: rankOf(m.hay, at), at, length: q.length })
      continue
    }
    if (m.says.indexOf(q) < 0) continue
    moduleHits.push({ module: m.facts, rank: RANK.inside, at: -1, length: q.length })
  }
  moduleHits.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.module.name.length - b.module.name.length ||
      (a.module.name < b.module.name ? -1 : 1),
  )

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

  /* -- the documents -----------------------------------------
     THREE STRINGS, ONE LINE, AND THE LINE SAYS WHICH ONE. A quote is
     reached by the reference off a printed page, by the customer it
     was written for, or by what it sold — and which of the three a
     person typed is the difference between "this is the document you
     asked for" and "this is a document that mentions Ferguson". So
     the best of the three readings is kept and named, in that order:
     a reference is exact, a subject is the thing, a customer is the
     name most likely to be shared by several documents. */
  const quoteHits: QuoteHit[] = []
  for (const entry of index.quotes) {
    const readings: Array<{ where: QuoteMatch; hay: string }> = [
      { where: 'reference', hay: entry.refHay },
      { where: 'subject', hay: entry.subjectHay },
      { where: 'customer', hay: entry.customerHay },
    ]
    let best: QuoteHit | undefined
    for (const r of readings) {
      const at = r.hay.indexOf(q)
      if (at < 0) continue
      const rank = rankOf(r.hay, at)
      if (best && best.rank <= rank) continue
      best = { quote: entry.facts, rank, where: r.where, at, length: q.length }
    }
    if (best) quoteHits.push(best)
  }
  /* rank, then the order they arrived in — which `quotes.ts`
     publishes newest first, and a diary's newest is the one wanted */
  quoteHits.sort((a, b) => a.rank - b.rank)

  /* -- the columns -------------------------------------------- */
  const columnHits: ColumnHit[] = []
  for (const c of index.columns) {
    const at = c.hay.indexOf(q)
    if (at < 0) continue
    const table = index.facts[c.destId]
    if (!table) continue
    columnHits.push({
      table,
      name: c.name,
      rank: rankOf(c.hay, at),
      at,
      length: q.length,
      tables: c.tables,
      ...(c.via ? { via: c.via } : {}),
    })
  }
  /* things you sell first and history last, exactly as the groups
     order — then the strongest match, then the shortest name, so
     "Hull" outranks "Hull Colour Code" for the query "hull" */
  columnHits.sort(
    (a, b) =>
      standing(a.table) - standing(b.table) ||
      a.rank - b.rank ||
      a.name.length - b.name.length ||
      (a.name < b.name ? -1 : 1),
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
    modules: moduleHits.slice(0, limits.modules),
    tables: tableHits.slice(0, limits.tables),
    groups: capped,
    quotes: quoteHits.slice(0, limits.quotes),
    columns: columnHits.slice(0, limits.columns),
    columnTotal: columnHits.length,
    rowTotal,
    rowShown: limits.total - budget,
  }
}

/* ------------------------------------------------------------ */
/* The resting answer — what is offered before anything is typed */
/* ------------------------------------------------------------ */

/** How many places the resting list names before it stops and says
 *  how many it did not. Eight is a menu; fifty-one is a wall, and a
 *  wall is what typing two letters is for. */
export const BROWSE_LIMIT = 8

/**
 * THE PALETTE IS NEVER EMPTY-HANDED.
 *
 * Opening it used to draw one paragraph of instructions and nothing a
 * key could land on: the arrow keys did nothing, Enter did nothing,
 * and the first useful frame was two keystrokes away. This answers the
 * resting state with the places themselves — every destination on the
 * sheet, biggest first — so the field is navigable from the frame it
 * opens in.
 *
 * IT IS THE SAME ANSWER `search()` GIVES, not a second kind of thing:
 * the same `TableHit`, the same destination rule (a pair list resolves
 * to the table it is about and is folded into it), the same standing
 * order, and history last. Nothing here is ranked, invented or
 * guessed — `at` is -1 because no run of text matched, so nothing is
 * highlighted.
 */
export function browse(index: SearchIndex, limit: number = BROWSE_LIMIT): SearchResult {
  const seen = new Set<string>()
  const places: TableHit[] = []
  for (const t of index.tables) {
    const facts = index.facts[t.destId]
    if (!facts || seen.has(facts.id)) continue
    seen.add(facts.id)
    places.push({ table: facts, rank: RANK.prefix, at: -1, length: 0 })
  }
  places.sort(
    (a, b) =>
      standing(a.table) - standing(b.table) ||
      b.table.rowCount - a.table.rowCount ||
      (a.table.name < b.table.name ? -1 : 1),
  )
  /* THE RESTING LIST IS STILL PLACES, AND ONLY PLACES. The three
     kinds added beside it answer a query; none of them answers
     "nothing typed yet". A resting list that also drew nine modules,
     five quotes and six columns would be a wall of thirty lines
     where the whole argument for this list is that it is a menu —
     and the recall list above it is already the answer to "take me
     back". They are one keystroke away, which is what typing is
     for. */
  return {
    modules: [],
    tables: places.slice(0, limit),
    groups: [],
    quotes: [],
    columns: [],
    columnTotal: 0,
    rowTotal: 0,
    rowShown: 0,
    placeTotal: places.length,
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
  | { kind: 'module'; id: string; moduleId: string }
  | { kind: 'quote'; id: string; quoteId: string }
  /** a column opens the table that declares it — so it carries an
   *  `entityId` like a table does, and the column's name only so the
   *  chooser can say what was picked */
  | { kind: 'column'; id: string; entityId: string; column: string }

/** The options in the exact order they are painted, so index N in
 *  this list is the Nth thing down the popover.
 *
 *  THE ORDER IS BY HOW MUCH OF THE BUSINESS EACH KIND CONTAINS, and
 *  it is fixed rather than ranked across kinds. Modules are the
 *  places; tables are inside them; rows are inside those; a quote is
 *  a document about one row; a column is the smallest thing on the
 *  sheet and the most administrative, so it is last. A cross-kind
 *  ranking would move the first option under the cursor from one
 *  keystroke to the next, and the first option is what Enter takes. */
export function optionsOf(result: SearchResult): Option[] {
  const out: Option[] = []
  for (const m of result.modules) {
    out.push({ kind: 'module', id: `m:${m.module.id}`, moduleId: m.module.id })
  }
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
  for (const q of result.quotes) {
    out.push({ kind: 'quote', id: `q:${q.quote.id}`, quoteId: q.quote.id })
  }
  for (const c of result.columns) {
    out.push({
      kind: 'column',
      id: `c:${c.table.id}:${c.name}`,
      entityId: c.table.id,
      column: c.name,
    })
  }
  return out
}
