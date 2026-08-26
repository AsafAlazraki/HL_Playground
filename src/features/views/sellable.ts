/* ============================================================
   DISCONTINUED NEVER REACHES A SALESPERSON — and never vanishes
   silently either.

   `@/types/model` gives this feature two questions and both are
   already answered there: `isDiscontinued(row)` for a product that
   is no longer sold, `isRetired(entity)` for a whole table that is
   history rather than stock. Nothing here re-decides either. What
   lives in this file is the OTHER half of the rule, the half a
   predicate cannot carry:

     1. WHICH SURFACES ASK. A module index, a view page's blocks and
        the pickers a quote adds from are read by, or over the
        shoulder of, a customer — they ask. The SHEET does not, and
        neither does the grid: that is where a person maintains
        their data, and hiding rows from the person who has to fix
        them is how data rots unseen.

     2. WHAT THE SURFACE SAYS WHEN IT HELD SOMETHING BACK. A block
        that would have drawn eight and draws six must not simply
        read six. The count alone is the defect; the sentence is the
        fix — the same discipline the quote's own sections already
        keep ("4 Yamaha Outboards were picked for this one…").

   AND THE THING THAT MUST NOT HAPPEN: none of this touches a quote
   that already exists. A quote line is a FROZEN COPY — its label,
   its price, the column that price came from and the join's own
   rigging kit were written onto it at pick time — so a document
   naming a trailer discontinued since still opens, still totals and
   still prints. Filtering the PICKER is not filtering the DOCUMENT,
   and nothing in this file is ever called while a quote is drawn.
   ============================================================ */

import { isDiscontinued, isRetired, type EntityDef, type RowData } from '@/types/model'
import { plural, singular } from './describe'
import { withheldRelations } from './relations'

/* ---------------------------------------------------------- */
/* Filtering                                                   */
/* ---------------------------------------------------------- */

/** The rows a customer-facing surface may offer. */
export const sellableRows = (rows: RowData[]): RowData[] =>
  rows.filter((r) => !isDiscontinued(r))

/** How many of these are no longer sold — the number every surface
 *  that drops them has to be able to say. */
export const countDiscontinued = (rows: RowData[]): number => {
  let n = 0
  for (const r of rows) if (isDiscontinued(r)) n += 1
  return n
}

/** The tables a customer-facing surface may draw at all. A retired
 *  table keeps its rows so an old quote still resolves; it is simply
 *  never a place anybody is sent. */
export const sellableTables = (tables: EntityDef[]): EntityDef[] =>
  tables.filter((e) => !isRetired(e))

/** Rows still sellable across a set of tables, counted — the figure
 *  a dashboard card and an index header both print, resolved once so
 *  a card can never say 40 and the page it opens draw 39. */
export function sellableRowCount(
  tables: EntityDef[],
  rowsByEntity: Record<string, RowData[]>,
): number {
  let n = 0
  for (const e of tables) {
    if (isRetired(e)) continue
    n += sellableRows(rowsByEntity[e.id] ?? []).length
  }
  return n
}

/** Rows held back across a set of tables — discontinued rows on live
 *  tables, plus every row of a retired one. */
export function heldBackRowCount(
  tables: EntityDef[],
  rowsByEntity: Record<string, RowData[]>,
): number {
  let n = 0
  for (const e of tables) {
    const rows = rowsByEntity[e.id] ?? []
    n += isRetired(e) ? rows.length : countDiscontinued(rows)
  }
  return n
}

/* ---------------------------------------------------------- */
/* The sentences                                               */
/* ---------------------------------------------------------- */

/** The reassurance every one of these sentences ends on. It is the
 *  whole reason the data stays: an old quote was written against it
 *  and deleting it would make yesterday's documents unreadable. */
const STILL_OPENS = 'a quote that already names one still opens, still totals and still prints'

/** "2 NSM Custom Trailers are no longer sold" — the CLAUSE, with no
 *  stop and no tail.
 *
 *  IT IS EXPORTED SO THERE IS ONE SET OF WORDS AND NOT TWO. A
 *  narrowed list is short for two different reasons at once — the
 *  rule did not admit a row, and the discontinued contract held one
 *  back — and `@/features/curation` prints them as one paragraph. It
 *  could have written its own phrasing for this half; then a person
 *  would be reading "no longer sold" here and something almost the
 *  same three lines up, with no way to tell whether the two counts
 *  overlap. The clause is assembled once, here, and everything that
 *  says it says it identically. */
export function withheldClause(count: number, tableName: string): string {
  if (count <= 0) return ''
  const one = count === 1
  const noun = one ? singular(tableName) : plural(tableName)
  return `${count} ${noun} ${one ? 'is' : 'are'} no longer sold`
}

/** The reassurance, on its own — the reason the data was kept, which
 *  is the answer to the question "no longer sold" always raises. */
export function stillOnTheSheet(count: number): string {
  return `${count === 1 ? 'It stays' : 'They stay'} on the sheet, and ${STILL_OPENS}.`
}

/** "2 NSM Custom Trailers are no longer sold…" — said in words,
 *  never left as the difference between two numbers. */
export function heldBackSentence(count: number, tableName: string): string {
  if (count <= 0) return ''
  const one = count === 1
  return `${withheldClause(count, tableName)}, so ${
    one ? 'it is' : 'they are'
  } not offered here. ${stillOnTheSheet(count)}`
}

/** The whole table is history rather than stock. */
export function retiredTableSentence(tableName: string): string {
  return `${tableName} is history rather than stock, so nothing from it is offered here. The table and its rows stay on the sheet, and ${STILL_OPENS}.`
}

/** The table is live, but the list recording which of its rows go
 *  with this one is history — "Surtees x OBSOLETE Trailers" is a
 *  whole join of nothing but retired stock. */
export function retiredPairsSentence(tableName: string, joinName: string): string {
  return `${joinName} — the list that recorded which ${plural(
    tableName,
  )} go with this one — is history rather than stock, so none of it is offered here. Nothing is deleted, and ${STILL_OPENS}.`
}

/** WHAT A PAGE SAYS ABOUT THE JOINS IT NEVER DREW.
 *
 *  Point 2 of this file's own header — "what the surface says when it
 *  held something back" — with the one case that had no voice. Every
 *  other held-back thing is held back by a block, and the block says
 *  so; a RETIRED TABLE and a RETIRED JOIN are refused by
 *  `existingRelations` before a block exists, so on the Surtees page
 *  five joins in the store became four blocks on screen and the fifth
 *  was never mentioned. A silent withholding is a salesperson quietly
 *  not trusting the page.
 *
 *  It is one sentence PER WITHHELD JOIN and not a tally, because
 *  "1 was held back" sends a person looking and "OBSOLETE Trailers —
 *  No Longer Available is history rather than stock" ends the search.
 *  The count is the number of sentences.
 *
 *  `drawn` is the tables the page has already put on itself. A block
 *  somebody added by hand before the table was retired says it in its
 *  own header, and twice is worse than once. */
export function withheldNotes(
  entities: Record<string, EntityDef>,
  tableId: string,
  drawn: ReadonlySet<string>,
): { id: string; sentence: string }[] {
  const out: { id: string; sentence: string }[] = []
  for (const w of withheldRelations(entities, tableId)) {
    if (drawn.has(w.otherId)) continue
    const other = entities[w.otherId]
    if (!other) continue
    out.push({
      id: w.otherId,
      sentence:
        w.reason === 'table'
          ? retiredTableSentence(other.name)
          : retiredPairsSentence(other.name, entities[w.joinId]?.name ?? 'That list'),
    })
  }
  return out
}

/** What a picker says about the tables it did not offer. */
export function retiredTablesSentence(count: number): string {
  if (count <= 0) return ''
  return count === 1
    ? 'One table is history rather than stock and is not offered here. It stays on the sheet, so an old quote written against it still opens.'
    : `${count} tables are history rather than stock and are not offered here. They stay on the sheet, so an old quote written against them still opens.`
}
