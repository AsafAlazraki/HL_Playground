/* ============================================================
   THE RIG, ADDED UP — what this one costs with what is on it.

   WHY THIS EXISTS. The fitment page is where a salesperson decides
   a rig: this hull, that motor, that trailer. Every one of those
   three carries a price in the dealer's own sheet, and until now
   the page drew all three and added none of them. The figure a
   customer asks for first — "so what is that, all up?" — was the
   one thing on the screen you had to work out in your head.

   ── WHAT IT ADDS, AND WHAT IT REFUSES TO ─────────────────────

   IT NEVER PICKS A PRICE COLUMN BY ITS SHAPE. `priceLevelsFor` in
   @/features/quote/pricing is the only resolver in this app, and
   it reads a NAMED column per kind of table — `Cash` on a boat,
   `Sell Price` on a motor, `Sell inc Rego` on a trailer. A table
   with no named column is NOT PRICED, and this returns it in
   `unpriced` so the surface can say so rather than showing a total
   that quietly left something out. `isCostColumn` is enforced in
   there too, so the dealer's buy price can never reach this line.

   IT NEVER CHOOSES A ROW THE QUOTE WOULD NOT CHOOSE. The rule is
   `freeze.ts`'s and is deliberately identical, because the whole
   point of the figure is that pressing QUOTE THIS ONE produces it:

       the star wins where there is one · failing that, a single
       picked row is unambiguous and counts · anything else is a
       real choice and is left for a person.

   A block in that third state lands in `open` WITH ITS COUNT,
   so the panel says "4 Yamaha Outboards picked — none recommended
   yet" instead of being quietly short by a motor. Silence was the
   defect there and it is the defect here.

   IT NEVER SUMS WHAT IT CANNOT READ. A rung whose cell is empty
   contributes nothing and is not drawn as `$0` — blank and nought
   are different facts, and only one of them is honest.

   ── WHY THE DEEP IMPORT ──────────────────────────────────────

   `@/features/quote/pricing` imports `@/types/model`, `@/lib/money`
   and its own `./types` and nothing else — no store, no React, and
   no import of ours. Reaching for the quote BARREL would close a
   cycle, because `quote/freeze.ts` already imports this feature's
   `columns`, `describe` and `pairs`. Importing the leaf is the same
   move `QuoteEditor` makes with `@/features/views/sellable`.
   ============================================================ */

import { rowLabel, type EntityDef, type RowData, type ViewDef } from '@/types/model'
import type { RuleEngine } from '@/lib/rules/evaluate'
import {
  defaultLevelKey,
  freezeLevels,
  priceAtLevel,
  priceLevelsFor,
} from '@/features/quote/pricing'
import { joinRefFor, relatedRows, type Ctx } from './pairs'

/** One priced thing on the rig. */
export interface RigLine {
  /** '' for the subject itself, which has no block */
  blockId: string
  tableId: string
  tableName: string
  /** the row's own name, as the dealer wrote it */
  label: string
  /** the business's word for the rung read — `Sell inc Rego` */
  rung: string
  amount: number
  /** true when a person starred this one rather than it being the
   *  only pick. Drawn as a state on the line, never as a footnote. */
  recommended: boolean
}

/** A block that has picks but no single answer yet. */
export interface RigOpen {
  blockId: string
  tableName: string
  /** how many were picked and are waiting on a choice */
  picked: number
}

export interface RigPrice {
  /** the subject's own line, or null when this table is not priced */
  subject: RigLine | null
  /** everything added to it, in the page's own block order */
  added: RigLine[]
  /** subject + added, and nothing that could not be read */
  total: number
  /** how many lines the total is made of */
  counted: number
  /** blocks holding picks that nobody has narrowed to one */
  open: RigOpen[]
  /** tables on this page that carry no price column at all */
  unpriced: string[]
}

const EMPTY: RigPrice = {
  subject: null,
  added: [],
  total: 0,
  counted: 0,
  open: [],
  unpriced: [],
}

interface ReadRigArgs {
  ctx: Ctx
  engine: RuleEngine
  view: ViewDef | undefined
  root: EntityDef | undefined
  row: RowData | undefined
}

/** The row's own name, as the dealer wrote it. */
const displayName = (entity: EntityDef, row: RowData): string => rowLabel(entity, row)

/** One row's price at the rig's rung, or null where the table is not
 *  priced or the cell is empty. */
function priceOf(
  engine: RuleEngine,
  entity: EntityDef,
  row: RowData,
  levelKey: string,
): { amount: number; rung: string } | null {
  const levels = freezeLevels(entity, engine.valuesOf({ entityId: entity.id, row }))
  if (levels.length === 0) return null
  const at = priceAtLevel(levels, levelKey)
  if (at.unitPrice === null || !Number.isFinite(at.unitPrice)) return null
  return { amount: at.unitPrice, rung: at.priceColumnName ?? '' }
}

/**
 * The rig this page is currently describing, priced.
 *
 * TOP-LEVEL BLOCKS ONLY, which is the same limit the quote draws
 * (`freeze.ts`): a nested block describes what goes with a LINE
 * rather than with the subject, and a rig does not have a shape for
 * "the accessories under each of four motors".
 */
export function readRig({ ctx, engine, view, root, row }: ReadRigArgs): RigPrice {
  if (!view || !root || !row) return EMPTY

  const levelKey = defaultLevelKey(root)

  const subjectPrice = priceOf(engine, root, row, levelKey)
  const subject: RigLine | null = subjectPrice
    ? {
        blockId: '',
        tableId: root.id,
        tableName: root.name,
        label: displayName(root, row),
        rung: subjectPrice.rung,
        amount: subjectPrice.amount,
        recommended: false,
      }
    : null

  const added: RigLine[] = []
  const open: RigOpen[] = []
  const unpriced: string[] = []

  for (const block of view.blocks) {
    const target = ctx.entities[block.tableId]
    if (!target) continue

    /* THE CHEAP REFUSAL FIRST. A table with no named price column can
       never contribute a figure, so it is named as unpriced without
       walking a single row of it — which on Parts & Accessories is
       2,937 rows this page does not have to touch. */
    if (priceLevelsFor(target).length === 0) {
      unpriced.push(target.name)
      continue
    }

    const join = joinRefFor(ctx.entities, block.joinTableId, root.id, target.id)
    const result = relatedRows({
      ctx,
      engine,
      sourceEntity: root,
      sourceRow: row,
      targetEntityId: target.id,
      ...(block.rule ? { rule: block.rule } : {}),
      join,
    })

    const starred = result.rows.filter((r) => r.recommended)
    const chosen = starred.length > 0 ? starred : result.rows.length === 1 ? result.rows : []

    if (chosen.length === 0) {
      if (result.rows.length > 0) {
        open.push({ blockId: block.id, tableName: target.name, picked: result.rows.length })
      }
      continue
    }

    for (const r of chosen) {
      const at = priceOf(engine, target, r.row, levelKey)
      if (!at) continue
      added.push({
        blockId: block.id,
        tableId: target.id,
        tableName: target.name,
        label: displayName(target, r.row),
        rung: at.rung,
        amount: at.amount,
        recommended: r.recommended,
      })
    }
  }

  const lines = subject ? [subject, ...added] : added
  return {
    subject,
    added,
    total: lines.reduce((sum, l) => sum + l.amount, 0),
    counted: lines.length,
    open,
    unpriced,
  }
}
