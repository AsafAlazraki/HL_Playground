/* ============================================================
   WHICH ROW A PAGE OPENS ON, WHEN NOBODY NAMED ONE.

   THE MEASUREMENT THAT MADE THIS NECESSARY. Walked all 40 rows of
   Highfield Inflatables — the first brand of the first module of the
   real Northside sheet — counting how many of the page's five blocks
   draw nothing:

     0 blocks empty   18 rows      ← 45% of the table is fully answered
     1 block  empty   10 rows
     2 blocks empty    4 rows
     3 blocks empty    8 rows      ← rows 1–8, in the sheet's own order

   The eight sparsest rows in the table are the eight that sort first:
   the RU230KAM roll-ups and the UL240 ultralites, the two smallest
   models, which carry no trailer, no parts and no rigging kit. So the
   page a demo lands on was the worst page in the catalogue, eight times
   running, while nearly half the table would have shown all five blocks
   full. That is bad luck in the dealer's ordering, not a fact about
   their data — and `rows[0]` had no opinion either way.

   THE RULE, IN ONE SENTENCE: open on the FIRST row that has an answer
   in every block. Five things it deliberately is not:

     1. NOT A RANKING. "Most related" would have the app decide which of
        a dealer's boats is the best one, which is a business judgement
        it has no licence to make, and it would move under them every
        time they ticked a box. This is a first-match scan down their
        own order; the answer only changes when an EARLIER row becomes
        complete, which is exactly when moving up is right.
     2. NOT A HARDCODED FAVOURITE. Nothing names a boat, a brand or a
        module. The same rule runs on a motorcycle shop's sheet.
     3. NOT A REORDER. The rail still lists rows in the sheet's order,
        so the open row is a highlight a person can see and account for
        — "it is the first one you have finished" — rather than an
        unexplained jump.
     4. NOT A REPLACEMENT FOR AN EXPLICIT ROW. A caller that knows the
        row still passes it; this only answers the door that names a
        TABLE and nothing more.
     5. NOT A WAY TO HIDE THE EMPTY ONES. Every block still says, in the
        dealer's own words, that nothing is picked yet — the eight sparse
        rows are one click away in the rail and read exactly as they did.
        What changes is which of the forty a person is shown first.

   AND IT IS BOUNDED. The scan stops at the first complete row and never
   looks past `limit` rows, which the caller sets to however many the
   rail is drawing. A block whose table has been deleted is skipped
   rather than counted as unanswerable — otherwise one removed table
   would make every row incomplete and the rule would quietly do
   nothing.
   ============================================================ */

import type { EntityDef, RowData } from '@/types/model'
import { getViewDef } from './viewDefs'
import { joinRefFor, makeEngine, relatedRows, type Ctx } from './pairs'

export interface FirstAnsweredArgs {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
  /** the table the page is about */
  entity: EntityDef
  /** its rows, in the sheet's own order */
  rows: readonly RowData[]
  /** the page, from `createViewFor` */
  viewId: string
  /** how far down the order to look. The rail's own cap. */
  limit: number
}

/**
 * The first row with an answer in every one of the page's blocks, or
 * `undefined` when there is no such row — in which case the caller
 * keeps whatever it would have done anyway.
 */
export function firstAnsweredRow(args: FirstAnsweredArgs): RowData | undefined {
  const { entities, rowsByEntity, entity, rows, viewId, limit } = args
  if (rows.length === 0) return undefined

  const view = getViewDef(viewId)
  const blocks = view?.blocks ?? []
  /* a page with nothing related has nothing to be complete about, so
     there is no better first row than the sheet's own */
  if (blocks.length === 0) return undefined

  const ctx: Ctx = { entities, rowsByEntity }
  const engine = makeEngine(ctx)

  const live = blocks
    .map((block) => ({ block, target: entities[block.tableId] }))
    .filter((b): b is { block: typeof b.block; target: EntityDef } => b.target !== undefined)
  if (live.length === 0) return undefined

  const end = Math.min(rows.length, Math.max(0, limit))
  for (let i = 0; i < end; i++) {
    const row = rows[i]
    let answered = true
    for (const { block, target } of live) {
      const join = joinRefFor(entities, block.joinTableId, entity.id, target.id)
      const result = relatedRows({
        ctx,
        engine,
        sourceEntity: entity,
        sourceRow: row,
        targetEntityId: target.id,
        rule: block.rule,
        join,
      })
      if (result.rows.length === 0) {
        answered = false
        break
      }
    }
    if (answered) return row
  }
  return undefined
}
