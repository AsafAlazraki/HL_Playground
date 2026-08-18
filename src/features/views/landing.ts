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

   The eight sparsest rows in the table were the eight that sorted first:
   the RU230KAM roll-ups and the UL240 ultralites, the two smallest
   models, which carry no trailer, no parts and no rigging kit. So the
   page a demo landed on was the worst page in the catalogue, eight times
   running, while nearly half the table would have shown all five blocks
   full. That is bad luck in the dealer's ordering, not a fact about
   their data — and `rows[0]` had no opinion either way.

   THEN THE PRICE FILE ARRIVED WHOLE, AND THE FIRST ANSWER STOPPED
   ANSWERING. The rule written above was "open on the FIRST row that has
   an answer in EVERY block", and all-or-nothing is a rule that can go
   silently dead. Walked again on the full set — 588 Highfield variants
   and six blocks rather than forty and five — scanning the same 120
   rows the rail draws:

     table                   rows  blocks   blocks answered, by row count
     Highfield Inflatables    588       6   2 → 40 rows · 3 → 65 · 4 → 15
     Stacer                    91       4   2 →  3 rows · 3 → 15 · 4 → 73
     Yamaha Outboards         209       7   0 → 49 · … · 6 → 14 · 7 → 5

   NOT ONE Highfield variant answers all six, and none ever will: two of
   the six blocks are NSM Custom Trailers and GFAB Trailers, two trailer
   BRANDS, and a boat is fitted to one brand of trailer or the other. So
   the rule returned `undefined` on the largest, first and most-demoed
   table in the set, `rows[0]` stood, and the demo landed on a 2-of-6
   page while a 4-of-6 page sat 105 rows down the same order. Stacer and
   Yamaha still had perfect rows, so the rule looked alive from two of
   the three places anyone checked it.

   THE RULE, IN ONE SENTENCE: open on the row that answers the MOST of
   the page's blocks, and on a tie the earliest one in the dealer's own
   order. Six things it deliberately is:

     1. COUNTED IN BLOCKS, NOT IN ROWS. "Most related" would rank a boat
        with forty accessories above a boat with one of everything, which
        is a judgement about which of a dealer's boats is the best one
        and the app has no licence to make it. A block is a QUESTION THE
        PAGE ASKS; counting how many of them have an answer is a
        judgement about the page, not about the stock.
     2. NOT "MOST RECENTLY UPDATED". On a freshly loaded price file every
        row carries the same timestamp, so that rule degrades to sheet
        order on the exact screen it was meant to fix — and once a dealer
        started editing it would move the landing out from under them
        every time they touched a cell.
     3. NOT A HARDCODED FAVOURITE. Nothing here names a boat, a brand or
        a module. The same rule runs on a motorcycle shop's sheet.
     4. NOT A REORDER. The rail and the catalogue still list rows in the
        sheet's own order, so the open row is a highlight a person can
        see and account for — "it is the one you have filled in most" —
        rather than an unexplained jump.
     5. NOT A REPLACEMENT FOR AN EXPLICIT ROW. A caller that knows the
        row still passes it; this only answers a door that names a TABLE
        and nothing more.
     6. NOT A WAY TO HIDE THE EMPTY ONES. Every block still says, in the
        dealer's own words, that nothing is picked yet — the sparse rows
        are one click away in the rail and read exactly as they did. What
        changes is which of the 588 a person is shown first.

   TIES GO TO THE EARLIER ROW, so the answer is stable and explainable,
   and it only moves when an EARLIER row becomes MORE complete — which is
   exactly when moving up is right.

   AND IT IS BOUNDED. A row that answers every block cannot be beaten, so
   the scan stops there and costs exactly what the old all-or-nothing
   rule cost wherever that rule worked. Otherwise it walks `LANDING_SCAN`
   rows and stops: 47 ms for Highfield's 120 x 6 in Node, 8 ms for Stacer,
   28 ms for Yamaha, paid once when a table opens and never again (see
   the memo in `ViewStage.tsx`, which reads the sheet imperatively so a
   keystroke in an unrelated register cannot re-run this). A block whose
   table has been deleted is skipped rather than counted as unanswerable
   — otherwise one removed table would drag every row's score down
   equally and the rule would quietly do nothing.
   ============================================================ */

import { isDiscontinued, type EntityDef, type RowData } from '@/types/model'
import { getViewDef } from './viewDefs'
import { joinRefFor, makeEngine, relatedRows, type Ctx } from './pairs'

/**
 * HOW FAR DOWN THE DEALER'S ORDER THE RULE LOOKS — one number, owned
 * here, so every door that asks gets the SAME row.
 *
 * It matches the view stage's rail cap, which is where the figure came
 * from: the rail draws 120 and says how many it is not drawing, so a
 * landing row chosen from beyond it would be a row the rail could not
 * show you next to the one it opened on. When the module index asks the
 * same question about the same table it must get the same answer, or the
 * catalogue's own suggestion and the table's own door would name two
 * different boats.
 */
export const LANDING_SCAN = 120

export interface BestAnsweredArgs {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
  /** the table the page is about */
  entity: EntityDef
  /** its rows, in the sheet's own order */
  rows: readonly RowData[]
  /** the page, from `createViewFor` */
  viewId: string
  /** how far down the order to look. Defaults to `LANDING_SCAN`. */
  limit?: number
}

export interface BestAnswered {
  row: RowData
  /** how many of the page's blocks this row has an answer in */
  answered: number
  /** how many blocks the page asks about at all */
  of: number
  /** how far down the table's own order the rule actually looked, so a
   *  surface offering this row can say so instead of claiming the whole
   *  table was read */
  scanned: number
}

/**
 * The row that answers the most of the page's blocks — earliest one on a
 * tie — with the two figures that say how much of the page it fills, so
 * a surface offering it can say WHY it is offering it.
 *
 * `undefined` when there is nothing to prefer: no rows, no blocks, or no
 * row in range answers a single one. The caller then keeps whatever it
 * would have done anyway, which is the sheet's own first row.
 */
export function bestAnsweredRow(args: BestAnsweredArgs): BestAnswered | undefined {
  const { entities, rowsByEntity, entity, rows, viewId } = args
  const limit = args.limit ?? LANDING_SCAN
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
  let best: BestAnswered | undefined

  for (let i = 0; i < end; i++) {
    const row = rows[i]
    /* DISCONTINUED IS NEVER THE ONE CHOSEN FOR YOU. The row stays where
       it is — the rail does not filter, because hiding rows from the
       person whose job is fixing them is how data rots unseen — but a
       page opening on a boat that is not for sale, beside a control
       that says "Quote this one", is the app making the choice badly.
       It is skipped as a CANDIDATE and still counted against the window
       above, so the row this answers is always inside the run the rail
       actually draws and the highlight can be seen. */
    if (isDiscontinued(row)) continue
    let answered = 0
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
      if (result.rows.length > 0) answered += 1
    }
    /* strictly greater, so a tie leaves the EARLIER row standing */
    if (answered > (best?.answered ?? 0)) {
      best = { row, answered, of: live.length, scanned: end }
      /* nothing can beat a full page — stop, and this costs exactly
         what the old all-or-nothing scan cost. `scanned` stays the whole
         window: it is what a sentence may CLAIM to have read, and a
         surface saying "the first one that is" about a perfect row is
         entitled to say it about the table, because every row before
         this one was read and none of them was. */
      if (answered === live.length) return best
    }
  }
  return best
}
