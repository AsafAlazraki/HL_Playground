/* ============================================================
   WHAT A TILE SAYS BESIDE ITS NAME — chosen by measuring the
   table, never by knowing what the table is about.

   ── THE DEFECT ───────────────────────────────────────────────

   A catalogue tile was a photograph, a name and a price. That is
   enough to recognise a boat and not enough to choose between two
   of them, so a salesperson pressed a tile, read one figure, came
   back, pressed the next. The owner's words for the whole brief
   are "data showing better" and this is the smallest place it is
   true: THE TWO OR THREE FIGURES THAT DECIDE A SALE BELONG ON THE
   FACE.

   ── WHY IT IS NOT A LIST OF COLUMN NAMES ─────────────────────

   Writing `['length', 'beam', 'hp']` here would be marine
   knowledge in the engine, which is the one thing this codebase
   refuses: the engine must never know what a boat is. So the
   question is asked of the SHEET, in two halves the app has
   already defined for itself:

     WHAT A PERSON SORTS BY   a number. `rangePairs`, the quote
                              ladder and every grid header treat
                              number and formula columns as the
                              things you order rows by.
     WHAT A PERSON FILTERS BY `filterableColumns` in
                              `@/features/views/filter` — "short,
                              closed vocabularies", meaning select
                              and boolean. Its definition, not a
                              second one written here.

   Everything else — free text, dates, pictures, references — is a
   thing you read on the item's own page, not a figure you compare
   two tiles by.

   ── AND THEN FOUR REFUSALS, EACH WITH A REASON ───────────────

   1 · NOT WHAT THE TILE ALREADY SAYS. The display column is the
       name, the hierarchy columns are the heading above the grid,
       and the price is the line under the name. Repeating any of
       them spends a slot on a fact already on screen.

   2 · NOT MONEY, EVER — and this is the refusal that matters. The
       highest-scoring column on Highfield Inflatables is `Trade`
       (spread 0.98, filled on all 588 rows), under a band called
       `Hull Only Pricing`, and it is the trade price. `Cash` is
       already on the tile as THE price. Two money figures on one
       face is the "which number do I quote" failure, and the
       wrong one of the two is a number a customer must not read
       over a shoulder. `isMoney` — the same adjudication the grid
       formats with, whose header lists every column it traces to —
       refuses the lot: Trade, Warranty, Settlement, Rego ($),
       Discount, Trade Price, Sell inc Install. `isCostColumn` and
       the cost/margin band test refuse a second time, because a
       band nobody has written yet must not be the reason a
       dealer's buy price reaches a tile.

   3 · NOT A COLUMN THAT IS MOSTLY EMPTY. A fact filled on a third
       of the rows is two blank slots for every one it fills, and a
       grid of tiles with holes in it reads as broken software.
       `FACT_FILL_FLOOR` is a half — the same floor, for the same
       reason, as `PICTURE_FLOOR` next door.

   4 · NOT A COLUMN THAT SAYS THE SAME THING TWICE. `Discount` on
       Stacer Trailers is $0 on all 34 rows and `Discontinued` is
       No on every row a catalogue draws. A column with one value
       across the table cannot help anybody choose, so SPREAD — how
       far the column actually splits the rows — is what ranks
       them, and a spread of zero is refused outright.

   ── WHAT THAT PRODUCES ON THE REAL SHEET ─────────────────────

   Measured, and asserted in `tileFacts.test.ts` so it stays true:

     Highfield Inflatables   OA Length · Int Length cm · Boat Weight kg
     Stacer                  Hull Length (Mtr) · Hull Weight (Dry) kg · Min HP
     NSM Custom Trailers     ATM (KG) · Tare (Kg)
     Yamaha Outboards        WEIGHT kg
     Parts & Accessories     nothing at all

   Nobody typed any of those. Parts yields none because its only
   two candidates are a money column and the discontinued flag, and
   a register that has no comparable figure gets no fact line rather
   than an invented one — which is also why this costs a register
   almost nothing to compute.
   ============================================================ */

import {
  DISCONTINUED_FIELD_ID,
  displayFieldOf,
  isImageValue,
  readCell,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { bandOf, formatCell, isMoney } from '@/features/views/columns'
import { isCostColumn } from '@/features/quote'

/** Below this share of rows carrying a value, a fact is a blank slot
 *  on most of the tiles that would show it. Half, for the same reason
 *  `PICTURE_FLOOR` is a half. */
export const FACT_FILL_FLOOR = 0.5

/** THE TWO OR THREE FIGURES THAT DECIDE A SALE — never a fourth. A
 *  tile is a face somebody scans, and a face with six figures on it is
 *  the grid row this whole drawing exists instead of. */
export const FACTS_PER_TILE = 3

/** A cost/margin band, by the band's own name. The same test
 *  `priceReadOf` applies, written where it is used rather than
 *  imported across a cycle. */
const FORBIDDEN_BAND = /cost|margin|markup/i

export interface FactColumn {
  field: FieldDef
  /** the column name as the business wrote it. A name is a name. */
  label: string
  /** the band it was filed under, so it formats the way the grid does */
  band: string
  /** share of the rows carrying any value at all */
  fill: number
  /** 1 − the largest single value's share of the filled rows. 0 means
   *  every row says the same thing and the column decides nothing. */
  spread: number
}

/** One fact on one tile, already formatted. */
export interface EntryFact {
  /** the column's own name */
  label: string
  /** the cell, formatted by the same formatter the grid uses */
  value: string
  /** where the figure came from, for the title — the column's own
   *  `description`, which on this sheet cites the workbook cell it was
   *  read out of. '' when the author wrote none. */
  say: string
}

/** Could a person sort or filter by this column? The app's own two
 *  answers, joined: numbers are what a grid orders by, and
 *  `filterableColumns` calls select and boolean the closed
 *  vocabularies worth offering as a tick-list. */
const isComparable = (f: FieldDef): boolean =>
  f.type === 'number' || f.type === 'formula' || f.type === 'select' || f.type === 'boolean'

/**
 * The columns this table's own rows nominate, best first, at most
 * `FACTS_PER_TILE`.
 *
 * `exclude` is the price column the tile already prints — passed in
 * rather than resolved here, so nothing in this file has to import
 * `read.ts` back.
 *
 * ONE PASS PER CANDIDATE COLUMN. Measured on the two tables the brief
 * names: Highfield Inflatables is 588 rows × 11 candidates in 1.4 ms,
 * Parts & Accessories is 2,238 rows × 2 candidates in 1.0 ms. It runs
 * once per table per data change, not once per keystroke and not once
 * per tile.
 */
export function factColumns(
  entity: EntityDef,
  rows: readonly RowData[],
  exclude: ReadonlySet<string> = new Set(),
): FactColumn[] {
  const name = displayFieldOf(entity)
  const hierarchy = new Set(entity.hierarchy ?? [])

  const candidates = entity.fields.filter((f) => {
    if (f.id === name?.id || f.id === DISCONTINUED_FIELD_ID) return false
    if (exclude.has(f.id) || hierarchy.has(f.id)) return false
    if (!isComparable(f)) return false
    /* MONEY IS REFUSED THREE TIMES OVER — see refusal 2 in the header.
       The tile carries exactly one price and it is the one the price
       ladder adjudicated. */
    const band = bandOf(entity, f)
    if (isMoney(f.name, band)) return false
    if (isCostColumn(entity, f)) return false
    if (FORBIDDEN_BAND.test(band)) return false
    return true
  })
  if (candidates.length === 0 || rows.length === 0) return []

  const scored: FactColumn[] = []
  for (const field of candidates) {
    const seen = new Map<string, number>()
    let filled = 0
    for (const row of rows) {
      const v = readCell(row, field.id)
      if (v === null || v === undefined || v === '' || isImageValue(v)) continue
      filled += 1
      const key = String(v)
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    if (filled === 0) continue
    let biggest = 0
    for (const n of seen.values()) if (n > biggest) biggest = n
    const fill = filled / rows.length
    const spread = 1 - biggest / filled
    if (fill < FACT_FILL_FLOOR || spread <= 0) continue
    scored.push({ field, label: field.name, band: bandOf(entity, field), fill, spread })
  }

  /* HOW FAR A COLUMN SPLITS THE ROWS, discounted by how much of the
     table it is actually filled on. Ties break on the author's own
     column order, which is the only order this file has any right to
     prefer. */
  const order = new Map(entity.fields.map((f, i) => [f.id, i]))
  scored.sort(
    (a, b) =>
      b.spread * b.fill - a.spread * a.fill ||
      (order.get(a.field.id) ?? 0) - (order.get(b.field.id) ?? 0),
  )
  return scored.slice(0, FACTS_PER_TILE)
}

/**
 * One row's facts, formatted.
 *
 * A CELL WITH NOTHING IN IT DRAWS NOTHING — not a dash, which a
 * salesperson can read as a zero, and not a blank slot, which makes
 * the grid look holed. The tile simply carries one fact fewer, which
 * is the honest reading of a cell nobody filled in.
 */
export function factsFor(
  entity: EntityDef,
  row: RowData,
  columns: readonly FactColumn[],
): EntryFact[] {
  const out: EntryFact[] = []
  for (const c of columns) {
    const raw = readCell(row, c.field.id)
    if (raw === null || raw === undefined || raw === '' || isImageValue(raw)) continue
    const value = formatCell(c.field, raw, undefined, c.band)
    if (value === '') continue
    out.push({ label: c.label, value, say: c.field.description?.trim() ?? '' })
  }
  return out
}
