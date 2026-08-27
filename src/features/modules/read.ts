/* ============================================================
   READING A MODULE — every number and every name its three
   surfaces draw, resolved in ONE place.

   Nothing in this file knows about React. It answers four
   questions and no more:

     which tables is this module about        moduleTables
     how many rows does it hold               moduleRowCount
     what may it print as a PRICE             priceReadOf
     what does its index actually list        buildEntries / groupEntries

   WHY ONE FILE. The dashboard card, the create panel and the
   index renderer all count rows and all decide whether a table is
   priced. Three copies of that decision is three chances for a
   card to say 40 and the page it opens to draw 39, and one chance
   for a dealer's buy price to reach a customer through whichever
   copy forgot the exclusion.

   NOTHING HERE INVENTS A VALUE. A table with no price column
   prints no price; a row with no picture draws no picture; a
   formula column resolves to nothing rather than to a guess. A
   placeholder on a catalogue is an instruction to a salesperson.
   ============================================================ */

import {
  isDiscontinued,
  isRetired,
  primaryImage,
  readCell,
  rowLabel,
  TABLE_KINDS,
  type EntityDef,
  type FieldDef,
  type ImageRef,
  type ModuleDef,
  type ModuleIndexMode,
  type RowData,
  type TableKind,
} from '@/types/model'
import { bandOf, formatCell, normColumn } from '@/features/views/columns'
/* THE DEALER'S OWN NOUNS — one row's word, one heading's word, and the
   kind's word when two tables disagree. Written once in the table
   feature and read here rather than copied: a census that invented
   "206 groups" would be the jargon `leafNoun` exists to keep off the
   screen, and a second pluraliser is a second answer. */
import { branchNoun, kindNoun, leafNoun } from '@/features/table/grouping'
/* the direct path, as `columns` already is: nothing here needs the
   feature's React surface and a module must not pull ViewPage in to
   count its rows */
import {
  heldBackRowCount,
  sellableRowCount,
  sellableTables,
} from '@/features/views/sellable'
import { isCostColumn, localDay, priceLevelsFor, type QuoteDef } from '@/features/quote'
/* the store-free derivation both a view page and `createModule` read,
   by direct path for the same reason `columns` is above: nothing here
   needs the views feature's React surface */
import { existingRelations } from '@/features/views/relations'
/* THE ONE VERDICT ABOUT WHO MAY DO WHAT. `accessReading` at the foot
   of this file is a SENTENCE about a module; whether that module is
   restricted at all, and what a role is really holding, is decided
   next door and is decided once. */
import { grantedTo, isUnrestricted } from './access'
/* THE FACE, AND THE RECORD OF WHAT ELSE WAS COUNTED. Its own file
   because the interesting half is the EVIDENCE — four signals
   measured over nine modules, three of which do not separate a
   catalogue from a register and are therefore not allowed a vote. */
import { readFace, type ModuleFace } from './face'
/* WHAT A TILE SAYS BESIDE ITS NAME, chosen by measuring the table.
   Resolved once per table here and reused down its rows, exactly as
   the price column and the picture column already are. */
import { factColumns, factsFor, type EntryFact } from './tileFacts'

/* `moduleFace` moved its rule into `face.ts`; these keep working for
   every caller that already reaches for them through this file. */
export { PICTURE_FLOOR, type ModuleFace } from './face'
export { FACTS_PER_TILE, FACT_FILL_FLOOR, type EntryFact, type FactColumn } from './tileFacts'

/* ---------------------------------------------------------- */
/* The module's tables and its size                           */
/* ---------------------------------------------------------- */

/** The module's tables in its own order — `tableIds[0]` is the
 *  primary. A table that has since been deleted is skipped rather
 *  than drawn as a hole: the module still works, it is just
 *  smaller, which is the honest reading of a pointer to something
 *  that is gone. */
export function moduleTables(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
): EntityDef[] {
  const out: EntityDef[] = []
  for (const id of module.tableIds) {
    const e = entities[id]
    if (e) out.push(e)
  }
  return out
}

/** The module's tables that a customer-facing surface may draw. A
 *  retired table keeps its rows so an old quote still resolves; the
 *  index simply never lists it and the card never counts it. */
export function listedTables(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
): EntityDef[] {
  return sellableTables(moduleTables(module, entities))
}

/** Rows across every table in the module — the figure on the card.
 *
 *  IT COUNTS WHAT THE INDEX WILL DRAW, which is why it needs the
 *  tables and not just their rows: a card reading 40 over a page
 *  drawing 39 is the disagreement this whole file exists to prevent,
 *  and discontinued stock is now one more way to cause it. */
export function moduleRowCount(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): number {
  return sellableRowCount(moduleTables(module, entities), rowsByEntity)
}

/** Rows the module holds back — discontinued rows on its live tables,
 *  plus every row of a retired one. The number a card or an index
 *  header states in words, so nothing vanishes silently. */
export function moduleHeldCount(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): number {
  return heldBackRowCount(moduleTables(module, entities), rowsByEntity)
}

/* ---------------------------------------------------------- */
/* What goes with the things in this module                    */
/* ---------------------------------------------------------- */

export interface RelatedTable {
  tableId: string
  name: string
  kind: TableKind
  /** how many of the module's own tables declare a join to it */
  on: number
  /** how many tables the module lists, so `on` reads as a share */
  of: number
}

/** The tables reachable FROM this module through a declared join, and
 *  how much of the module each one touches.
 *
 *  THIS IS THE FACT THAT MAKES A MODULE MORE THAN A LIST OF ROWS. An
 *  index answers "what is in here"; this answers "what goes with the
 *  things in here" — Yamaha Outboards on six brands of seven, Dealer
 *  Fit Packages on three. The asymmetry is real and measured (six
 *  brands take Yamaha; Haines Signature and Jeanneau take factory
 *  packages instead), and stating it is the alternative to a page of
 *  headings that resolve for one brand and are empty for the rest.
 *
 *  PURELY STRUCTURAL, and it has to be: `existingRelations` asks only
 *  "which table carries a reference column to this one", with no brand
 *  list, no kind test and no name matching. A pharmacy with one
 *  supplier join gets one line here, and an eighth brand added
 *  tomorrow changes the counts with no code change.
 *
 *  A table the module already HOLDS is never listed — Motors would
 *  otherwise report its own factory package files as something that
 *  goes with it. Retired tables and retired joins are refused upstream. */
export function relatedTables(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
): RelatedTable[] {
  const mine = listedTables(module, entities)
  const own = new Set(module.tableIds)
  const tally = new Map<string, number>()
  for (const table of mine) {
    for (const rel of existingRelations(entities, table.id)) {
      if (own.has(rel.otherId)) continue
      tally.set(rel.otherId, (tally.get(rel.otherId) ?? 0) + 1)
    }
  }

  const out: RelatedTable[] = []
  for (const [tableId, on] of tally) {
    const e = entities[tableId]
    if (!e) continue
    out.push({
      tableId,
      name: e.name,
      kind: e.kind && e.kind in TABLE_KINDS ? e.kind : 'custom',
      on,
      of: mine.length,
    })
  }
  return out.sort((a, b) => b.on - a.on || a.name.localeCompare(b.name))
}

/* ---------------------------------------------------------- */
/* What has actually happened in this module                   */
/* ---------------------------------------------------------- */

/** One quote raised against a row in this module, read the way the
 *  quotes list already reads one so the two surfaces can never print
 *  the same document differently. */
export interface ModuleQuote {
  id: string
  /** the subject's name as the quote FROZE it. Never re-read from the
   *  sheet: a quote prints what it froze, and a boat renamed since is
   *  still the boat this document was written for. */
  subject: string
  reference: string
  /** the word `QuoteList` prints for this state — 'Given' or 'Draft' */
  state: string
  /** the ISO day, the same slice the quotes list prints */
  day: string
}

export interface ModuleActivity {
  /** the most recent few, newest first */
  quotes: ModuleQuote[]
  /** how many there are altogether, so a capped list can say so */
  quoteCount: number
  /** rows changed since the day they were loaded */
  edited: number
  /** the tables those changes are on, in the module's own order */
  editedOn: string[]
}

/** How many of a module's quotes are named before the strip says
 *  "and N more". Four is one line at any sensible width and is the
 *  same discipline as `INDEX_CAP`: name a few, count the rest. */
const ACTIVITY_CAP = 4

/** WHAT HAS HAPPENED HERE LATELY — and nothing at all when nothing
 *  has.
 *
 *  THIS IS THE FOURTH QUESTION A PLACE IN THE BUSINESS ANSWERS. The
 *  other three — what is in it, what it is made of, what you can do
 *  with it — are true of a catalogue. This one is what makes a module
 *  an application: quotes are raised here, rows are worked on here,
 *  and the place remembers.
 *
 *  BOTH SIGNALS ARE EXACT, AND BOTH ARE ZERO ON A FRESH SHEET, which
 *  is the whole reason they may be trusted:
 *
 *    · a quote's `rootTableId` is the table its subject came from, so
 *      "raised here" is a set membership and never a guess;
 *    · `updatedAt !== createdAt` is precisely "this row has been
 *      changed since it was made". `buildNorthsideProject` stamps
 *      every one of its 11,116 rows with ONE `nowIso()` for both
 *      fields, and the store's `touch()` moves `updatedAt` alone —
 *      measured on the live seed: 11,116 rows, 0 edited, 1 distinct
 *      stamp.
 *
 *  So a freshly loaded example reports nothing and the strip is not
 *  drawn, which is the honest answer: nothing HAS happened. The
 *  moment somebody quotes a boat or corrects a price, it appears. A
 *  recency list on a fresh seed would have printed 11,116 identical
 *  timestamps, and that is exactly the fabrication this avoids.
 *
 *  EVERY member table counts, including a retired one. Its rows are
 *  withheld from the catalogue because they are history rather than
 *  stock — but a quote raised against one still happened, and still
 *  opens. */
export function moduleActivity(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
  quotes: readonly QuoteDef[],
): ModuleActivity {
  const tables = moduleTables(module, entities)
  const mine = new Set(tables.map((t) => t.id))

  /* NEWEST FIRST, BY WHEN IT WAS RAISED. `createdAt` and not
     `updatedAt`, because raising is the event this strip reports and
     it is the column the quotes list already prints — sorting by one
     date and printing another puts an old day at the top of a list
     that claims to be recent. */
  const raised = quotes
    .filter((q) => mine.has(q.rootTableId))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  let edited = 0
  const editedOn: string[] = []
  for (const table of tables) {
    let here = 0
    for (const row of rowsByEntity[table.id] ?? []) {
      if (row.updatedAt !== row.createdAt) here++
    }
    if (here > 0) {
      edited += here
      editedOn.push(table.name)
    }
  }

  return {
    quotes: raised.slice(0, ACTIVITY_CAP).map((q) => ({
      id: q.id,
      subject: q.subjectLabel,
      reference: q.reference,
      /* THE QUOTES LIST'S OWN TWO WORDS, so a document called Given
         there is never called Issued here. */
      state: q.state === 'issued' ? 'Given' : 'Draft',
      /* THE DEALER'S CALENDAR DAY, NOT UTC'S — and this strip is the
         one that showed the disagreement most plainly, because it
         prints the day right beside the reference the day was minted
         into: "GIVEN 20260818-01 2026-08-17", measured at UTC+10. */
      day: localDay(q.createdAt),
    })),
    quoteCount: raised.length,
    edited,
    editedOn,
  }
}

/** The kind's own plural, as its author wrote it in TABLE_KINDS.
 *  Never a hardcoded "boats": the same panel serves a pharmacy and
 *  a plant hire yard. 'Custom table' is the one label written in
 *  the singular, so it is the one that gains an 's'. */
export function kindPlural(kind: TableKind): string {
  const label = TABLE_KINDS[kind].label.toLowerCase()
  return label.endsWith('s') ? label : `${label}s`
}

/* ---------------------------------------------------------- */
/* Pictures                                                   */
/* ---------------------------------------------------------- */

/** The first picture column, in the author's own column order.
 *  Index 0 of that cell is the primary — order is the only thing
 *  that elects it (IMAGE_SPEC, `primaryImage`). */
export function imageFieldOf(entity: EntityDef): FieldDef | undefined {
  return entity.fields.find((f) => f.type === 'image')
}

export const hasPictures = (entity: EntityDef): boolean =>
  imageFieldOf(entity) !== undefined

/* ---------------------------------------------------------- */
/* The price a customer-facing screen may print                */
/* ---------------------------------------------------------- */

export interface PriceRead {
  field: FieldDef
  /** the column name as the business wrote it, so a number on a
   *  tile can always be traced back to the column it came from */
  label: string
}

/** Selling-price column names, in the order this app's own data
 *  offers them. Consulted ONLY when the table declares nothing —
 *  `priceLevelsFor` is the contract and this is the last resort.
 *  Read through `normColumn`, so units and punctuation in the
 *  author's own name do not decide whether a boat has a price. */
const FALLBACK_PRICE_COLUMNS = ['cash', 'sell price', 'dealer list price']

/** Bands whose contents never reach a screen a customer can read
 *  over a shoulder. `isCostColumn` already refuses 'cost' and
 *  'markup' by band and a long list of names by name; 'margin' is
 *  added here because it is the word this surface was told to
 *  refuse and a band nobody has written yet must not be the reason
 *  a dealer's buy price is printed. */
const FORBIDDEN_BAND = /cost|margin|markup/i

function inForbiddenBand(entity: EntityDef, field: FieldDef): boolean {
  if (!field.sectionId) return false
  const band = entity.sections?.find((s) => s.id === field.sectionId)
  return band !== undefined && FORBIDDEN_BAND.test(band.name)
}

/** The one column this module's index may print as a price, or
 *  nothing at all.
 *
 *  THE FAILURE THIS PREVENTS is a customer reading the dealer's buy
 *  price off a catalogue tile. Every candidate passes two refusals
 *  before it is returned — the quote feature's own `isCostColumn`,
 *  which knows the seeded cost columns by name and by band, and the
 *  band test above. `Dealer List Price` is third on the preference
 *  list and is filed under a cost band in the real data, so it is
 *  offered and then refused; that is the intended outcome, not a
 *  contradiction. */
export function priceReadOf(entity: EntityDef): PriceRead | undefined {
  const safe = (f: FieldDef): boolean =>
    !isCostColumn(entity, f) && !inForbiddenBand(entity, f)

  /* 1. what the table declares, through the one resolver that owns
     price ladders. Its first rung is the selling price: Cash on a
     boat, Sell Price on a motor, Sell on a part. */
  const declared = priceLevelsFor(entity)[0]
  if (declared) {
    const f = entity.fields.find((x) => x.id === declared.fieldId)
    if (f && safe(f)) return { field: f, label: declared.label }
  }

  /* 2. nothing declared — the named columns, in preference order */
  for (const wanted of FALLBACK_PRICE_COLUMNS) {
    const f = entity.fields.find(
      (x) =>
        (x.type === 'number' || x.type === 'formula') && normColumn(x.name) === wanted,
    )
    if (f && safe(f)) return { field: f, label: f.name }
  }
  return undefined
}

export const hasPrices = (entity: EntityDef): boolean => priceReadOf(entity) !== undefined

/* ---------------------------------------------------------- */
/* The index's own rows                                       */
/* ---------------------------------------------------------- */

export interface IndexEntry {
  tableId: string
  rowId: string
  label: string
  /** the grouping values ABOVE the row's own level — "Sport ▸ SP460".
   *  The row's own level is dropped because `rowLabel` already says
   *  it, which is the convention the view stage's rail uses. */
  trail: string
  /** the FIRST grouping level's value on its own — "Sport", "Anodes".
   *  `trail` is every level above the row and is what a heading prints;
   *  this is the one drawers are cut by, so a three-level table
   *  (Highfield runs Series ▸ Model ▸ Variant) opens onto its series
   *  rather than onto every series-and-model pair. '' when the table
   *  declares no grouping, or when the row's own banner cell is empty —
   *  which is a real state on this sheet and is drawn as such. */
  branch: string
  /** the price as a NUMBER, when the cell holds one. `price` above is
   *  already formatted and is what a face prints; this is what a
   *  range is computed from, so nothing re-parses a rendered string. */
  amount?: number
  /** formatted and ready to print; '' when this table prices nothing */
  price: string
  img?: ImageRef
  /** THE TWO OR THREE FIGURES THAT DECIDE A SALE, already formatted —
   *  chosen by measuring the table's own columns, never by a list of
   *  column names somebody typed. See `tileFacts.ts`. Empty on a table
   *  whose columns nominate nothing, which is most registers, and
   *  absent when the caller asked for the entries without them. */
  facts?: EntryFact[]
  /** lower-cased label, for the search box */
  hay: string
}

/** THE FACTS ARE OPTIONAL BECAUSE ONE CALLER DOES NOT WANT THEM.
 *  `moduleFace` builds the same list purely to count pictures and
 *  prices, and paying for three formatted cells on 2,860 rows to
 *  answer a question about none of them is the sort of cost that
 *  gets a good idea taken back out. Everything a person actually
 *  reads asks for them. */
export interface BuildOptions {
  facts?: boolean
}

/** The FIRST grouping level's value for one row — the banner it sits
 *  under. '' when the table groups by nothing, and '' when the cell
 *  itself is empty: 27 parts and 74 dealer-fit packages on this sheet
 *  really do sit under a spacer banner, and they land in a drawer that
 *  says so rather than in one invented for them. */
export function branchOf(entity: EntityDef, row: RowData): string {
  const levels = entity.hierarchy ?? []
  if (levels.length < 2) return ''
  const v = readCell(row, levels[0])
  return v === null || v === undefined ? '' : String(v).trim()
}

/** The grouping trail for one row. Same rule as the view stage's
 *  rail, so the two never disagree about where a row sits. */
export function trailOf(entity: EntityDef, row: RowData): string {
  const levels = entity.hierarchy ?? []
  if (levels.length < 2) return ''
  return levels
    .slice(0, -1)
    .map((fieldId) => {
      const v = readCell(row, fieldId)
      return v === null || v === undefined ? '' : String(v).trim()
    })
    .filter((v) => v !== '')
    .join(' ▸ ')
}

/** Every row of every table in the module, in table order then row
 *  order — brand first, which is what the plan asks the index to
 *  read like.
 *
 *  The price column and the picture column are resolved ONCE PER
 *  TABLE and reused down the rows: a forty-row brand must not scan
 *  its own column list forty times, and this list is built for 651
 *  rows across seven brands. */
export function buildEntries(
  tables: EntityDef[],
  rowsByEntity: Record<string, RowData[]>,
  options: BuildOptions = {},
): IndexEntry[] {
  const wantFacts = options.facts !== false
  const out: IndexEntry[] = []
  for (const entity of tables) {
    /* A RETIRED TABLE LISTS NOTHING. It is history rather than stock,
       and this list is the catalogue somebody shops. */
    if (isRetired(entity)) continue
    const rows = rowsByEntity[entity.id] ?? []
    const price = priceReadOf(entity)
    const imgField = imageFieldOf(entity)
    /* ONCE PER TABLE, over the rows the catalogue will draw — the same
       discipline the price and picture columns above already keep. The
       price column is handed over as the one thing the tile is already
       printing, so a face never carries the same figure twice. */
    const facts = wantFacts
      ? factColumns(
          entity,
          rows.filter((r) => !isDiscontinued(r)),
          new Set(price ? [price.field.id] : []),
        )
      : []
    for (const row of rows) {
      /* DISCONTINUED NEVER REACHES A SALESPERSON. The row stays on the
         sheet — an old quote was written against it — and the index,
         which is a page a customer reads over a shoulder, never
         offers it. The count held back is said in words by the
         header, never left as a gap in the arithmetic. */
      if (isDiscontinued(row)) continue
      const label = rowLabel(entity, row)
      /* A FORMULA PRICE PRINTS NOTHING. Formula cells are computed
         on read and are absent from `values` by design, so this
         reads null and the tile stays quiet rather than showing a
         zero somebody could mistake for a price. */
      const raw = price ? readCell(row, price.field.id) : null
      out.push({
        tableId: entity.id,
        rowId: row.id,
        label,
        trail: trailOf(entity, row),
        branch: branchOf(entity, row),
        amount: typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined,
        price: price ? formatCell(price.field, raw, undefined, bandOf(entity, price.field)) : '',
        img: imgField ? primaryImage(row.values[imgField.id] ?? null) : undefined,
        facts: facts.length === 0 ? undefined : factsFor(entity, row, facts),
        hay: label.toLowerCase(),
      })
    }
  }
  return out
}

/** The first `cap` entries, EXCEPT that every table keeps a place.
 *
 *  THE BUG THIS FIXES, measured on the real seed. Parts & Accessories
 *  lists 719 items across three tables — 67 parts, 622 rigging kits,
 *  30 dealer fit packages. A flat `slice(0, 240)` spends the whole
 *  budget on the first two and Dealer Fit is never drawn, so its
 *  section head does not exist, so the member chip that promises to
 *  "Go to Dealer Fit Packages, 30 items" scrolls to nothing and the
 *  press does nothing at all. An enabled control that does nothing is
 *  a lie told to whoever is looking, and this one sat on the strip
 *  whose whole purpose was to reach that table without scrolling past
 *  622 rigging kits.
 *
 *  So the cap is shared out instead of spent in order: every table
 *  takes a fair slice, whatever is left over goes round again to the
 *  tables that still have rows, and the ORIGINAL order is rebuilt at
 *  the end so a brand's own row order survives. The total drawn is
 *  still exactly `cap`, so the "N more" sentence is unchanged and the
 *  page stays as fast as it was.
 *
 *  A module under the cap is returned untouched — Boats, Motors,
 *  Trailers and Rates all draw exactly what they drew before. */
export function capEntries(entries: IndexEntry[], cap: number): IndexEntry[] {
  if (cap <= 0 || entries.length <= cap) return entries

  const byTable = new Map<string, number>()
  for (const e of entries) byTable.set(e.tableId, (byTable.get(e.tableId) ?? 0) + 1)
  const tables = [...byTable.keys()]

  /* A fair slice each, never less than one, never more than the table
     holds, and never more than the budget still allows — a module with
     more tables than the cap has rows still stops at the cap. */
  const share = Math.max(1, Math.floor(cap / tables.length))
  const take = new Map<string, number>()
  let budget = cap
  for (const t of tables) {
    const n = Math.min(share, byTable.get(t) ?? 0, budget)
    take.set(t, n)
    budget -= n
  }

  /* What the short tables did not use goes to the long ones, one row
     at a time so no single table swallows the remainder. */
  let moved = true
  while (budget > 0 && moved) {
    moved = false
    for (const t of tables) {
      if (budget === 0) break
      const got = take.get(t) ?? 0
      if (got < (byTable.get(t) ?? 0)) {
        take.set(t, got + 1)
        budget--
        moved = true
      }
    }
  }

  const left = new Map(take)
  const out: IndexEntry[] = []
  for (const e of entries) {
    const n = left.get(e.tableId) ?? 0
    if (n > 0) {
      out.push(e)
      left.set(e.tableId, n - 1)
    }
  }
  return out
}

export interface IndexGroup {
  key: string
  /** the hierarchy trail this run shares; '' when the table is flat */
  trail: string
  entries: IndexEntry[]
}

export interface IndexSection {
  tableId: string
  name: string
  kind: TableKind
  count: number
  groups: IndexGroup[]
}

/** Entries cut into sections by TABLE, then into groups by the
 *  table's own `hierarchy`.
 *
 *  Depth adapts per table and that is not a nicety: Highfield runs
 *  series ▸ model ▸ variant, Stacer runs two levels and Formosa is
 *  flat, and one hand-written screen per depth is exactly the
 *  mistake this renderer exists not to repeat.
 *
 *  Grouped through a Map rather than by consecutive runs, so a
 *  series split across two parts of the row order still lands in
 *  one heading. Insertion order keeps the table's own row order. */
export function groupEntries(
  entries: IndexEntry[],
  tables: EntityDef[],
): IndexSection[] {
  const byTable = new Map<string, IndexEntry[]>()
  for (const e of entries) {
    const bucket = byTable.get(e.tableId)
    if (bucket) bucket.push(e)
    else byTable.set(e.tableId, [e])
  }

  const out: IndexSection[] = []
  for (const entity of tables) {
    const mine = byTable.get(entity.id)
    if (!mine || mine.length === 0) continue
    const byTrail = new Map<string, IndexEntry[]>()
    for (const e of mine) {
      const bucket = byTrail.get(e.trail)
      if (bucket) bucket.push(e)
      else byTrail.set(e.trail, [e])
    }
    out.push({
      tableId: entity.id,
      name: entity.name,
      kind: entity.kind && entity.kind in TABLE_KINDS ? entity.kind : 'custom',
      count: mine.length,
      groups: Array.from(byTrail, ([trail, group]) => ({
        key: `${entity.id}::${trail}`,
        trail,
        entries: group,
      })),
    })
  }
  return out
}

/* ============================================================
   WHAT THIS PLACE IS MADE OF — the census

   "2,937 products" is a fact. "2,238 products across 179 categories,
   699 no longer sold" is a picture, and everything in it was already
   on the sheet: the categories are the banner column the workbook
   heads itself, the 699 are the rows below its own OBSOLETE divider.

   ONE READER, for the same reason the rest of this file has one: the
   dashboard card, the index header and the designer all want the same
   sentence, and three copies of it is three chances for a card to say
   one thing and the page it opens to say another.

   EVERY FIGURE IS COUNTED OVER THE ROWS THE CATALOGUE WILL DRAW, not
   over the sheet — a census that counted rows nobody can reach would
   be the disagreement `moduleRowCount` exists to prevent, restated at
   greater length.

   AND EVERY NOUN IS THE DEALER'S. `leafNoun` gives the word for one
   row and `branchNoun` the word for one heading, both read off the
   columns they headed themselves. Where two member tables disagree —
   Parts runs Category then Product and Rigging Kits runs Section then
   Rigging Kit — BOTH are said, because "206 groups" is jargon and
   picking one table's word over the other's is a small lie about the
   other. The kind's own plural is the fall-back for the row noun, and
   that is `kindNoun`'s stated job.
   ============================================================ */

/** One grouping level a module is cut by, and how many distinct values
 *  of it the live rows carry. */
export interface CensusBranch {
  /** the dealer's own plural for one heading — 'categories', 'sections' */
  noun: string
  count: number
}

export interface ModuleCensus {
  /** live rows the catalogue will draw */
  items: number
  /** the dealer's own plural for one of them */
  noun: string
  /** the tables the catalogue draws */
  tables: number
  /** every grouping level the module is cut by, biggest first */
  branches: CensusBranch[]
  /** rows held back — discontinued on a live table, every row of a
   *  retired one. Said in words, never subtracted in silence. */
  held: number
  /** live rows that carry a picture of their own */
  pictured: number
  /** live rows that carry a price this surface may print */
  priced: number
}

/** What is in this place, counted. */
export function moduleCensus(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): ModuleCensus {
  const listed = listedTables(module, entities)
  /* WITHOUT THE FACTS, AND THAT IS NOT A DETAIL. A census counts
     entries, pictures, prices and banners; it never reads a fact cell.
     `buildEntries` formats up to three of them per row by default, so
     the dashboard was formatting ~45,000 cells it then threw away —
     once per card, nine times, on every render. `moduleFace` already
     asks for the same discount and says why. */
  const entries = buildEntries(listed, rowsByEntity, { facts: false })

  /* THE ROW NOUN. One word when the member tables agree on it, the
     kind's own word when they do not — `kindNoun` was written for
     exactly this and says why: "810 variants" is false over seven
     tables and "810 rows" is the jargon this is all here to avoid. */
  const leaves = new Set(listed.map((e) => leafNoun(e).many))
  const kinds = new Set<TableKind>(
    listed.map((e) => (e.kind && e.kind in TABLE_KINDS ? e.kind : 'custom')),
  )
  const noun =
    leaves.size === 1
      ? [...leaves][0]
      : kinds.size === 1
        ? (kindNoun([...kinds][0])?.many ?? 'items')
        : 'items'

  /* THE HEADINGS, PER WORD. Two tables heading their banner column
     the same way are one figure; two heading it differently are two,
     and the sentence says both. */
  const byNoun = new Map<string, Set<string>>()
  for (const entity of listed) {
    const word = branchNoun(entity)
    if (!word) continue
    const seen = byNoun.get(word.many) ?? new Set<string>()
    for (const e of entries) {
      if (e.tableId !== entity.id) continue
      if (e.branch !== '') seen.add(`${entity.id}::${e.branch}`)
    }
    byNoun.set(word.many, seen)
  }

  let pictured = 0
  let priced = 0
  for (const e of entries) {
    if (e.img) pictured += 1
    if (e.price !== '') priced += 1
  }

  return {
    items: entries.length,
    noun,
    tables: listed.length,
    branches: [...byNoun]
      .map(([n, set]) => ({ noun: n, count: set.size }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count || a.noun.localeCompare(b.noun)),
    held: moduleHeldCount(module, entities, rowsByEntity),
    pictured,
    priced,
  }
}

const grouped = (n: number): string => n.toLocaleString('en-AU')

/** The census as one sentence a card or a header can print.
 *
 *  IT NEVER PRINTS A FIGURE IT DID NOT COUNT. A module with no
 *  grouping says only how many it holds; a module that holds back
 *  nothing says nothing about holding back. Each clause is present
 *  exactly when it is true, which is why this is a builder and not a
 *  template. */
const acrossClause = (c: ModuleCensus): string =>
  c.branches.length === 0
    ? ''
    : `across ${c.branches.map((b) => `${grouped(b.count)} ${b.noun}`).join(' and ')}`

const heldClause = (c: ModuleCensus): string =>
  c.held > 0 ? `${grouped(c.held)} no longer sold` : ''

/** EVERYTHING THE COUNT DOES NOT SAY — the headings the items fall
 *  under, and what is being held back.
 *
 *  A card sets the count as the largest thing on it and these clauses a
 *  step below, so the sentence is needed in two halves as well as
 *  whole. Both halves are built from the same two clauses `censusLine`
 *  prints, so a card and the page it opens can never disagree. '' when
 *  neither clause is true, which is the whole rule: a clause appears
 *  exactly when there is something to say. */
export function censusQualifier(c: ModuleCensus): string {
  return [acrossClause(c), heldClause(c)].filter((s) => s !== '').join(' · ')
}

export function censusLine(c: ModuleCensus): string {
  const across = acrossClause(c)
  const held = heldClause(c)
  return `${grouped(c.items)} ${c.noun}${across === '' ? '' : ` ${across}`}${
    held === '' ? '' : ` · ${held}`
  }`
}

/* ============================================================
   WHO MAY DO WHAT HERE — read for a CARD, not for an editor.

   THE VERDICT IS NOT TAKEN HERE. `access.ts` is where "is this module
   restricted" and "what is a role actually holding" are decided, for
   the settings grid that writes them and for anything that has to
   obey them; this is the one sentence a dashboard card prints, built
   on those answers rather than beside them. A card that called a
   module restricted while the grid called it open would be the same
   disagreement `moduleCensus` exists to prevent, one floor up.

   ABSENT — AND EMPTY — MEAN UNRESTRICTED, which is `isUnrestricted`'s
   rule and is how every module in this project behaves today. So for
   an unrestricted module there is nothing true to say at all: a
   dashboard that stamped "open to everyone" on five cards would be
   inventing five decisions nobody made, and would turn the list of
   places in a business into an admin console.

   A ROLE COUNTS WHEN IT HOLDS SOMETHING THE MODULE STILL OFFERS.
   `grantedTo` intersects with `module.capabilities`, so a role left
   holding only verbs that were switched off an hour later may do
   nothing here and is not counted as a role that may work here — a
   card that said otherwise would promise more than the place it
   opens onto.

   IT NAMES NO ROLE. A role's NAME lives on `RoleDef`, in the store;
   this file is store-free by construction. Counting is the whole of
   what can be said honestly from a `ModuleDef` alone, and the names
   are one press away on the settings surface.
   ============================================================ */

export interface AccessReading {
  /** `access` is present. Absent = unrestricted, and nothing is said. */
  restricted: boolean
  /** roles granted at least one verb THIS module still declares */
  roles: number
  /** roles named here holding nothing this module can still do —
   *  granted an empty list, or only verbs since switched off */
  silent: number
  /** the chip on a card. '' when there is nothing true to say. */
  say: string
  /** the same fact as a sentence, for a reader who cannot see the
   *  chip and for the card's own accessible name. '' when unrestricted. */
  hint: string
}

const NO_ACCESS: AccessReading = {
  restricted: false,
  roles: 0,
  silent: 0,
  say: '',
  hint: '',
}

/** What a card may honestly say about who may work in this module. */
export function accessReading(module: ModuleDef): AccessReading {
  if (isUnrestricted(module)) return NO_ACCESS

  let roles = 0
  let silent = 0
  for (const grant of module.access ?? []) {
    if (grantedTo(module, grant.roleId).length > 0) roles += 1
    else silent += 1
  }

  return {
    restricted: true,
    roles,
    silent,
    say: roles === 0 ? 'No role yet' : `Open to ${roles} ${roles === 1 ? 'role' : 'roles'}`,
    hint:
      roles === 0
        ? `${module.name} is restricted, and no role may do anything here yet.`
        : `${module.name} is restricted: ${roles} ${
            roles === 1 ? 'role may' : 'roles may'
          } work here.`,
  }
}

/* ============================================================
   WHICH FACE — a catalogue somebody shops, or a register somebody
   keeps.

   THE RULE, THE MEASUREMENT AND THE THREE SIGNALS THAT WERE TESTED
   AND REJECTED ARE ALL IN `face.ts`. This is the door a module comes
   through: it hands its own live rows over and gets a verdict plus
   the sentence the designer shows an admin.

   IT IS A DEFAULT, NOT A LOCK. `ModuleDef.index` is still the stored
   field and the designer still writes it; this is what a module is
   BORN with.
   ============================================================ */

/** The face these tables' own rows ask for. */
export function moduleFace(
  tables: EntityDef[],
  rowsByEntity: Record<string, RowData[]>,
): ModuleFace {
  /* WITHOUT THE FACTS. The face is decided by pictures, prices and
     names — none of which is a tile fact — so a module being weighed
     up must not pay for three columns it is not going to draw. */
  return readFace(buildEntries(sellableTables(tables), rowsByEntity, { facts: false }))
}

/* ============================================================
   THE DRAWERS — a register's things.

   A CATALOGUE'S THING IS ITS ITEM, because an item has a face: a
   photograph and a price, and 810 of those is a page somebody shops.
   A REGISTER'S THING IS ITS HEADING. Parts & Accessories is 2,860
   live lines under 204 headings the workbook itself banners — plus
   one drawer per table for the lines it banners under a spacer, and
   2,860 lines in one scroll is the spreadsheet the owner already
   has. 206 drawers is a place: you press Anodes because a customer
   asked for an anode.

   NOTHING HERE IS A LIST OF CATEGORIES SOMEBODY TYPED. Every drawer
   is a distinct value of the first rung of that table's own
   `hierarchy`, counted over the rows the catalogue draws, and a
   table that groups by nothing produces no drawers at all.

   THE PRICE RANGE IS THE DRAWER'S OWN ROWS, formatted by the same
   `formatCell` that formatted the faces, taken from the cheapest and
   the dearest line it holds. It is not an average and it is not a
   guess: both ends are a real row in the drawer.
   ============================================================ */

export interface Drawer {
  key: string
  tableId: string
  tableName: string
  kind: TableKind
  /** the banner value as the sheet wrote it; '' when the rows under
   *  it carry no banner cell at all */
  name: string
  /** the dealer's own singular for what this is a value of — 'category' */
  of: string
  count: number
  /** the cheapest and dearest line in the drawer, already formatted.
   *  Both '' when nothing in it prices. */
  low: string
  high: string
}

/** Fewer headings than this and the ordinary grouped list is the
 *  better page: a register of four bands does not need drawers, it
 *  needs to be read. Twelve is one screen of them at any sensible
 *  width, which is the same reasoning `INDEX_CAP` uses one file up. */
export const DRAWER_FLOOR = 12

export const drawerKey = (tableId: string, branch: string): string => `${tableId}::${branch}`

/** The drawers these entries fall into, biggest first inside each
 *  table, tables in the module's own order. */
export function categoryDrawers(entries: IndexEntry[], tables: EntityDef[]): Drawer[] {
  const out: Drawer[] = []
  for (const entity of tables) {
    const word = branchNoun(entity)
    if (!word) continue
    const byBranch = new Map<string, IndexEntry[]>()
    for (const e of entries) {
      if (e.tableId !== entity.id) continue
      const bucket = byBranch.get(e.branch)
      if (bucket) bucket.push(e)
      else byBranch.set(e.branch, [e])
    }
    const kind = entity.kind && entity.kind in TABLE_KINDS ? entity.kind : 'custom'
    const mine: Drawer[] = []
    for (const [name, group] of byBranch) {
      let low: IndexEntry | undefined
      let high: IndexEntry | undefined
      for (const e of group) {
        if (e.amount === undefined || e.price === '') continue
        if (low === undefined || e.amount < (low.amount ?? 0)) low = e
        if (high === undefined || e.amount > (high.amount ?? 0)) high = e
      }
      mine.push({
        key: drawerKey(entity.id, name),
        tableId: entity.id,
        tableName: entity.name,
        kind,
        name,
        of: word.one,
        count: group.length,
        low: low?.price ?? '',
        high: high?.price ?? '',
      })
    }
    /* BIGGEST FIRST INSIDE A TABLE, and never across tables: a
       module's table order is the admin's own and is not a size
       ranking. An empty banner sorts on its count like any other. */
    mine.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    out.push(...mine)
  }
  return out
}
