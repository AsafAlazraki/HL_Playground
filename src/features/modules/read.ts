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
import { formatCell, normColumn } from '@/features/views/columns'
/* the direct path, as `columns` already is: nothing here needs the
   feature's React surface and a module must not pull ViewPage in to
   count its rows */
import {
  heldBackRowCount,
  sellableRowCount,
  sellableTables,
} from '@/features/views/sellable'
import { isCostColumn, priceLevelsFor } from '@/features/quote'

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
        price: price ? formatCell(price.field, raw) : '',
        img: imgField ? primaryImage(row.values[imgField.id] ?? null) : undefined,
        hay: label.toLowerCase(),
      })
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
