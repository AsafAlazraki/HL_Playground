/* ============================================================
   FOLDING A CATALOGUE INTO THE THINGS A PERSON IS CHOOSING
   BETWEEN.

   Highfield is 604 rows and 67 models. What separates the rows of
   one model is a FINISH — "HYP B-G-B", "540 open (PVC) LG-W-DG" —
   and a screen that lists finishes while somebody is choosing a
   model shows them one boat seven times:

       Highfield - ADV7 (HYP) B-G-B     $105,930
       Highfield - ADV7 (HYP) B-G-LB    $105,930
       Highfield - ADV7 (HYP) B-G-WB    $105,930
       ... four more, same boat, same price

   Both the place screen and the catalogue draw that list, which is
   why this is a module and not a function inside one of them. It is
   framework-free and takes what it needs rather than reading a
   store, so it can be tested without a browser.

   WHETHER A LEVEL IS A FINISH IS A FACT ABOUT THE COLUMN, not
   about the cell, and that was measured. Asking per ROW gave 171
   cards instead of 67: the 121 Highfield rows whose code is `I`,
   `O`, `R` or `WH` — tokens no production map carries — did not
   read as colourways, so they fell OUT of their own model's card
   and sat beside it as singles. The same boat, drawn twice.

   If half a table's rows put a colourway in the last level then the
   level IS the finish, and a row whose code nobody can read is a
   finish with an unreadable name. Highfield reads 80%; a motor's
   shaft codes and a trailer's plug codes read 0%, so those lists
   stay one card per row, which is what they are.
   ============================================================ */

import { readCell } from '@/types/model'
import type { EntityDef, ImageRef, RowData } from '@/types/model'
import type { IndexEntry } from '@/features/modules/read'
import { isColourway, splitVariant } from '@/features/quote/colourway'

/** One row, with the cell that distinguishes it from its siblings.
 *  The code is READ OFF THE ROW, never parsed back out of a
 *  rendered label: a model whose name ends in a hyphenated token
 *  would defeat any parse, and the cell is right there. */
export interface Offer {
  entry: IndexEntry
  /** the row's own hierarchy level — "HYP B-G-B" */
  leaf: string
}

export interface Model {
  key: string
  /** the series this model sits under — "Adventure", "Sport". ''
   *  on a table that groups by nothing. */
  series: string
  /** what the card is called — the model code on a three-level
   *  table, the row's own label everywhere else. */
  name: string
  /** one row, or every finish of one model */
  offers: Offer[]
  img?: ImageRef
  /** every offer's price, for the range under the name */
  amounts: number[]
  /** the distinct materials across the offers — one on most
   *  models, two where the same hull comes in Hypalon and PVC */
  materials: string[]
  hay: string
}

/** The row's OWN level of the hierarchy — the one `trailOf` drops
 *  because the label already says it. */
export function leafValues(
  tables: readonly EntityDef[],
  rowsByEntity: Record<string, RowData[]>,
): Map<string, string> {
  const out = new Map<string, string>()
  for (const entity of tables) {
    const levels = entity.hierarchy ?? []
    const last = levels.at(-1)
    if (levels.length < 2 || last === undefined) continue
    for (const row of rowsByEntity[entity.id] ?? []) {
      const v = readCell(row, last)
      if (v === null || v === undefined) continue
      out.set(`${entity.id}:${row.id}`, String(v).trim())
    }
  }
  return out
}

/** Which tables put a FINISH in their last hierarchy level. Asked
 *  once per table — see the header for the measurement that made
 *  that the rule. */
export function finishLevels(
  tables: readonly EntityDef[],
  leaves: ReadonlyMap<string, string>,
): Set<string> {
  const seen = new Map<string, { read: number; all: number }>()
  for (const [key, leaf] of leaves) {
    const tableId = key.slice(0, key.lastIndexOf(':'))
    const tally = seen.get(tableId) ?? { read: 0, all: 0 }
    tally.all += 1
    if (isColourway(leaf)) tally.read += 1
    seen.set(tableId, tally)
  }
  const out = new Set<string>()
  for (const entity of tables) {
    const tally = seen.get(entity.id)
    if (tally && tally.all > 0 && tally.read * 2 >= tally.all) out.add(entity.id)
  }
  return out
}

/** The material half of a variant cell, with the brackets the sheet
 *  writes around some of them taken off: "(PVC)" is PVC, "HYP" is
 *  HYP. The code is left as the code — the sheet's own word for it
 *  — because "HYP" is what a dealer reads on an order. */
export function materialOf(leaf: string): string {
  return splitVariant(leaf)
    .material.replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The last segment of a trail — "Adventure ▸ ADV7" is ADV7. */
export function modelOf(trail: string): string {
  const at = trail.lastIndexOf('▸')
  return at < 0 ? trail.trim() : trail.slice(at + 1).trim()
}

/** Fold a catalogue's entries into models.
 *
 *  A GROUP ONLY FORMS WHERE THE TABLE'S LAST LEVEL IS A FINISH.
 *  Everywhere else each row is its own model, so a list of 209
 *  motors stays a list of 209 motors and is not silently collapsed
 *  into nine cards by a hierarchy that means something different. */
export function foldModels(
  entries: readonly IndexEntry[],
  leaves: ReadonlyMap<string, string>,
  finishes: ReadonlySet<string>,
): Model[] {
  const by = new Map<string, Model>()
  for (const e of entries) {
    const leaf = leaves.get(`${e.tableId}:${e.rowId}`) ?? ''
    const grouped = e.trail !== '' && finishes.has(e.tableId)
    const key = grouped ? `${e.tableId}|${e.trail}` : `${e.tableId}|${e.rowId}`
    const found = by.get(key)
    if (found) {
      found.offers.push({ entry: e, leaf })
      if (!found.img && e.img) found.img = e.img
      if (e.amount !== undefined) found.amounts.push(e.amount)
      const mat = materialOf(leaf)
      if (mat !== '' && !found.materials.includes(mat)) found.materials.push(mat)
      found.hay = `${found.hay} ${e.hay}`
      continue
    }
    by.set(key, {
      key,
      series: e.branch,
      name: grouped ? modelOf(e.trail) : e.label,
      offers: [{ entry: e, leaf }],
      ...(e.img ? { img: e.img } : {}),
      amounts: e.amount === undefined ? [] : [e.amount],
      materials: materialOf(leaf) === '' ? [] : [materialOf(leaf)],
      hay: `${e.hay} ${e.trail.toLowerCase()}`,
    })
  }
  return [...by.values()]
}

/** What a model's card prints for a price: one figure when every
 *  finish costs the same, and "from" the cheapest when they do not.
 *  Neither figure is computed here — both come off the entries,
 *  already formatted by the price column the table nominates. */
export function priceOf(model: Model): { say: string; spread: boolean } {
  const first = model.offers[0]
  if (model.amounts.length === 0) return { say: first?.entry.price ?? '', spread: false }
  const cheapest = Math.min(...model.amounts)
  const dearest = Math.max(...model.amounts)
  if (cheapest === dearest) return { say: first?.entry.price ?? '', spread: false }
  const low = model.offers.find((o) => o.entry.amount === cheapest)
  return { say: low?.entry.price ?? '', spread: true }
}
