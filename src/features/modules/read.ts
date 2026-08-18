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
  type RowData,
  type TableKind,
} from '@/types/model'
import { bandOf, formatCell, normColumn } from '@/features/views/columns'
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
  /** formatted and ready to print; '' when this table prices nothing */
  price: string
  img?: ImageRef
  /** lower-cased label, for the search box */
  hay: string
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
): IndexEntry[] {
  const out: IndexEntry[] = []
  for (const entity of tables) {
    /* A RETIRED TABLE LISTS NOTHING. It is history rather than stock,
       and this list is the catalogue somebody shops. */
    if (isRetired(entity)) continue
    const rows = rowsByEntity[entity.id] ?? []
    const price = priceReadOf(entity)
    const imgField = imageFieldOf(entity)
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
        price: price ? formatCell(price.field, raw, undefined, bandOf(entity, price.field)) : '',
        img: imgField ? primaryImage(row.values[imgField.id] ?? null) : undefined,
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
