/* ============================================================
   WHAT THE PRICE FILE HOLDS — the two figures behind the strip.

   DECISIONS.md §3, settled by the owner 2026-09-09: the counted
   figures come back "small and secondary, per PHASE_TWO §2.1".
   §1's objection was to counts as the SUBJECT of a screen, not
   to counts existing — so this returns two facts and the header
   draws them at 12px in tertiary ink.

   IT WAS "beside a 33px greeting", AND THE GREETING IS 12px NOW.
   The display tier landed on this screen and the greeting lost
   the hero position to the things a person came for — the doors
   and the drafts. So the strip and the greeting are the same
   step, which is right: they are two halves of one header
   caption, one about the person and one about the file. What the
   strip may not outrank is the SUBJECT, and the subject is now
   26.9px and 33.4px at 1280 against this line's 12.

   THIS IS THE SHEET-WIDE READER, AND THAT IS A DELIBERATE CHOICE
   AGAINST `fileTally`.

   Three surfaces already count the sheet, and all three count it
   the same way:

     · the load toast      `demoLoad.ts:228-231`
       "Loaded Northside Marine — 15,691 rows across 53 tables."
     · the Data stage      `DataStage.tsx:115-116`
       its eyebrow reads "53 tables · 15,691 rows"
     · the rail's Data row `SideNav.tsx:263` — the bare `53`

   `cards.ts:fileTally` counts a THIRD thing: it drops joins and
   retired tables because it answers "what you sell", which is
   the right answer for a card about stock and the wrong one for
   a line about the file. Reusing it here would put a fourth
   figure on screen for a fact the app has already stated three
   times in one wording. **The strip is the load toast's own
   sentence, kept** — the toast says it once and goes, and this
   is where that fact lives afterwards. It is not a new claim,
   and that is the whole of why it is allowed to be quiet.

   PURE, AND IT TAKES ITS INPUTS. Same rule as every derivation
   in `cards.ts`: a count that reaches for a store is a count
   nobody can check. `Dashboard.tsx` already subscribes to both
   of these, so the strip adds no subscription and no paint.
   ============================================================ */

import type { EntityDef, RowData } from '@/types/model'

export interface SheetCensus {
  /** every table on the sheet — the same reader as the rail's
   *  Data row and the Data stage's own eyebrow */
  tables: number
  /** every row under every one of them */
  rows: number
}

export function sheetCensus(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): SheetCensus {
  let rows = 0
  /* OFF `entities`, NOT OFF `rowsByEntity`. A table drawn and not
     yet filled is a table, and the store keeps no row list for it
     until the first row lands; walking the row map would count
     the tables that happen to have rows. The two agree on a
     loaded price file and disagree on a sheet somebody is
     building, which is the case worth being right about. */
  for (const id of Object.keys(entities)) rows += rowsByEntity[id]?.length ?? 0
  return { tables: Object.keys(entities).length, rows }
}

/** One figure and the noun it belongs to, kept apart because
 *  DESIGN_CONTRACT §11 puts every figure in `--font-mono` with
 *  `tabular-nums` and the words around it stay in Inter. That is
 *  also why `cards.ts:plural` is not used here — it glues the two
 *  into one string, which is right everywhere it is already
 *  called and cannot give the figure an element of its own. */
export interface CensusPart {
  /** already localised — the thousands separator the rest of the
   *  page uses, decided here rather than at the JSX */
  n: string
  noun: string
}

export interface CensusLine {
  rows: CensusPart
  tables: CensusPart
  /** the word between them. It lives beside the nouns so the whole
   *  sentence is written in one place and the component only maps
   *  — a joiner in the JSX is half a sentence in another file. */
  joiner: string
}

const part = (n: number, one: string, many: string): CensusPart => ({
  n: n.toLocaleString(),
  noun: n === 1 ? one : many,
})

/** THE LINE, AND IT RETURNS NULL RATHER THAN A ZERO.
 *
 *  "0 rows across 0 tables" is a figure printed to fill a hole,
 *  which is the one thing DESIGN_CONTRACT §6 forbids in the same
 *  breath as it asks for real counts. An empty sheet already has
 *  its own invitation on this screen — the cards' empty states —
 *  so this line is simply not drawn and the header closes up
 *  behind it. */
export function censusLine(c: SheetCensus): CensusLine | null {
  if (c.tables === 0) return null
  return {
    rows: part(c.rows, 'row', 'rows'),
    tables: part(c.tables, 'table', 'tables'),
    joiner: 'across',
  }
}

/** The same line as one string, derived from the same parts so the
 *  two can never disagree. This is what a test asserts against the
 *  load toast's wording, and it is not what the screen renders. */
export const censusText = (l: CensusLine): string =>
  `${l.rows.n} ${l.rows.noun} ${l.joiner} ${l.tables.n} ${l.tables.noun}`
