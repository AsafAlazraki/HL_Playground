/* ============================================================
   THE DESIGNER'S READING OF A MODULE — what may be changed, what
   is refused and why, and what every block is actually BOUND to.

   Nothing in this file knows about React. It answers five
   questions and no more:

     which verbs are on, off, or refused      capabilityStates
     what does the index resolve per table    tableBindings
     what does an item page's block point at  blockBindings
     what is the effective column list        effectiveColumns
     how does a list get reordered            moveId / moveViewBlock

   THE BINDING LIST IS NEVER HAND-WRITTEN. Every column offered to
   an admin is read from `EntityDef.fields` with its `FieldDef.type`,
   and every verb is read from `MODULE_CAPABILITIES`. HelmLogic's own
   layout designer died with a nine-string literal array of bindings
   inside its render function while its canvas was infinitely
   flexible — a dynamic design surface over a static data vocabulary
   cannot express a document about a dealer-defined catalogue, so it
   could never have shipped even debugged (MODULE_SYSTEM §4, rule 2).
   Adding a column to a table on the sheet must make that column
   choosable here without this file changing, and it does.

   BOUND vs UNMAPPED IS A VALUE, NOT A SILENCE. A block pointing at
   a deleted table, or showing a column somebody has since struck,
   is reported as such so the page can say so where it stands
   (§4, rule 5). Failing quietly is how a page becomes a lie.
   ============================================================ */

import {
  displayFieldOf,
  MODULE_CAPABILITIES,
  type EntityDef,
  type FieldDef,
  type ModuleCapability,
  type ModuleDef,
  type RowData,
  type ViewBlock,
  type ViewDef,
} from '@/types/model'
import { defaultColumns } from '@/features/views/columns'
import { registerViewDef } from '@/features/views'
import { buildConcepts } from '@/features/constraints/columns'
import { nowIso } from '@/lib/id'
import { imageFieldOf, priceReadOf, type PriceRead } from './read'
import { RULE_CAPABILITY, RULE_CAPABILITY_META } from './ruleCapability'

/* ---------------------------------------------------------- */
/* The verbs                                                  */
/* ---------------------------------------------------------- */

/** The nine verbs the contract carries, plus the one it does not yet.
 *  See `ruleCapability.ts` for the exact line `MODULE_CAPABILITIES`
 *  needs and why it is not written there this session. Everything
 *  below this line treats all ten identically — only the two writers
 *  (`ModuleDesigner`'s switch handler, and `capabilityStates`' third
 *  argument) know one of them is stored somewhere else. */
export type DesignerCapability = ModuleCapability | typeof RULE_CAPABILITY

/** Every verb in the contract's own declaration order, with the tenth
 *  spliced in where it will live: after `relate`, before `quote`.
 *
 *  STILL ITERATED FROM `MODULE_CAPABILITIES`, so a verb added there
 *  appears here — and on the dashboard card, and on the index — without
 *  this file changing. That is the property `capabilityStates` has
 *  always had and it does not get traded away for one insertion. */
export const DESIGNER_CAPABILITIES: DesignerCapability[] = (() => {
  const out: DesignerCapability[] = []
  for (const key of Object.keys(MODULE_CAPABILITIES) as ModuleCapability[]) {
    if (key === 'quote') out.push(RULE_CAPABILITY)
    out.push(key)
  }
  /* If `quote` is ever renamed away, the tenth verb still appears
     rather than vanishing silently. */
  if (!out.includes(RULE_CAPABILITY)) out.push(RULE_CAPABILITY)
  return out
})()

/** What a capability that is SWITCHED ON but not yet performed will
 *  do when it is. Shared with the index's own stub strip, so the
 *  promise made on the switch and the promise made on the disabled
 *  control are the same sentence and can never drift apart.
 *
 *  `configure` IS ABSENT FROM THIS RECORD ON PURPOSE — it is
 *  performed, in the designer's fourth panel, which is the whole
 *  point of the wave that added it. */
export const NOT_YET_SAYS: Partial<Record<DesignerCapability, string>> = {
  add: 'Adding an item from here is not built yet — the sheet is where rows are made today.',
  edit: 'Editing from here is not built yet — the sheet is where data changes today.',
  delete: 'Removing an item from here is not built yet.',
  /* WHERE THE VERB WORKS, NOT HOW TO WORK IT. Both of these closed
     with a route — "happens on the item's own page today", "open one
     and press 'Quote this one'" — which is a step-by-step for a
     control on a page this note is not on. The fact a person needs is
     which page owns the verb; finding the button on it is that page's
     job, and it has one. */
  relate: 'Ticked on an item’s own page today.',
  quote: 'Quoting starts from an item’s own page today.',
  export: 'Taking a copy of this list out is not built yet.',
}

export interface CapabilityState {
  key: DesignerCapability
  label: string
  /** the plain sentence the contract carries for this verb */
  says: string
  on: boolean
  /** why the switch cannot be moved, in one sentence. Absent = it can.
   *  This is `ConstraintDef.because` applied to a capability: the
   *  reason written at the moment of the decision, not reconstructed
   *  afterwards as "unavailable". */
  refused?: string
  /** an advisory about a verb that IS on — it depends on another verb,
   *  or this app does not perform it yet. Never a reason it is off. */
  note?: string
}

/** Every verb in the contract's own order, with its state on this
 *  module. Iterated from MODULE_CAPABILITIES so a verb added there
 *  appears here — and on the dashboard card — without this file
 *  changing, and so nothing has to invent a name for one.
 *
 *  `configures` is the tenth verb's state, which lives outside
 *  `ModuleDef` for as long as `ModuleCapability` does not carry it.
 *  It defaults to OFF, which is the same deliberate default
 *  `DEFAULT_CAPABILITIES` sets for everything that writes. */
export function capabilityStates(
  module: ModuleDef,
  tables: EntityDef[],
  configures = false,
): CapabilityState[] {
  const gone = tables.length === 0
  const priced = tables.some((e) => priceReadOf(e) !== undefined)
  const browsing = module.capabilities.includes('browse')

  /* WHAT A RULE MAY TALK ABOUT, read through the sentence surface's
     OWN vocabulary rather than a second opinion about it. A picture is
     not a value anybody states in a sentence and a calculated total is
     an outcome rather than a choice, so `buildConcepts` refuses both —
     and a module whose tables carry nothing else has no rule to write. */
  const ruleable = gone
    ? []
    : buildConcepts(Object.fromEntries(tables.map((e) => [e.id, e])))

  return DESIGNER_CAPABILITIES.map((key) => {
    const meta = key === RULE_CAPABILITY ? RULE_CAPABILITY_META : MODULE_CAPABILITIES[key]
    const on = key === RULE_CAPABILITY ? configures : module.capabilities.includes(key)
    let refused: string | undefined
    let note: string | undefined

    if (gone) {
      refused =
        'The tables this module was made from are no longer on the sheet, so there is nothing here to act on.'
    } else if (key === 'quote' && !priced) {
      /* THE REFUSAL NAMES THE FIX AND THE TABLE IT IS ON. "Quote
         unavailable" would send an admin looking for a setting on the
         module, and there is none: a price is a column on a table. */
      refused = `Nothing on ${tables[0].name} is marked as a price, so there is no figure to quote. Give the table a price column on the sheet and this switches on.`
    } else if (key === RULE_CAPABILITY && ruleable.length === 0) {
      /* SAME SHAPE AS THE QUOTE REFUSAL, AND THE SAME REASON. A rule
         reads words, numbers, yes/no, dates and lists; a table of
         pictures and totals gives a sentence nothing to name. The fix
         is a column on the sheet, so the sentence says so. */
      refused = `No column on ${tables[0].name} is one a rule can talk about — a rule reads words, numbers, yes/no, dates and lists, and a picture or a calculated total is an outcome rather than a choice. Give the table one of those columns on the sheet and this switches on.`
    }

    if (!refused && on) {
      if (!browsing && (key === 'search' || key === 'open')) {
        note = 'Browsing is off, so this list is not drawn and this verb has nothing to act on.'
      } else {
        note = NOT_YET_SAYS[key]
      }
    }

    return { key, label: meta.label, says: meta.says, on, refused, note }
  })
}

/** The verbs a module carries, as the WORDS a card prints, in the
 *  contract's own declaration order — the tenth included.
 *
 *  THE DASHBOARD CARD AND THE INDEX MUST AGREE. The card used to map
 *  `module.capabilities` directly, which was right while every verb
 *  lived there; with one held outside it, a module whose index says
 *  "Set rules" and whose card does not is the same class of lie as a
 *  disabled control with no reason on it. One reader, so they cannot
 *  drift while the tenth verb is waiting for the contract. */
export function capabilityWords(module: ModuleDef, configures = false): string[] {
  return DESIGNER_CAPABILITIES.filter((key) =>
    key === RULE_CAPABILITY ? configures : module.capabilities.includes(key),
  ).map((key) => (key === RULE_CAPABILITY ? RULE_CAPABILITY_META : MODULE_CAPABILITIES[key]).label)
}

/** The capability list after one switch moves, in the contract's own
 *  declaration order. ORDER IS NORMALISED because the dashboard card
 *  prints the verbs as words in array order: two admins switching the
 *  same three verbs on in a different sequence must not end up with
 *  two cards that read differently. */
export function nextCapabilities(
  current: ModuleCapability[],
  key: ModuleCapability,
  on: boolean,
): ModuleCapability[] {
  const set = new Set(current)
  if (on) set.add(key)
  else set.delete(key)
  return (Object.keys(MODULE_CAPABILITIES) as ModuleCapability[]).filter((k) => set.has(k))
}

/* ---------------------------------------------------------- */
/* What the index resolved, per table                          */
/* ---------------------------------------------------------- */

export interface TableBinding {
  tableId: string
  /** absent = the table has been struck from the sheet since */
  entity?: EntityDef
  rows: number
  /** the column rows are named by */
  label?: FieldDef
  /** the picture column the tiles read, index 0 of the cell */
  image?: FieldDef
  /** the one column this index may print as a price, or nothing */
  price?: PriceRead
}

/** What each of the module's tables actually gives the index, in the
 *  module's own table order. Every field here is RESOLVED, never
 *  assumed: a table with no picture column reports none rather than
 *  reporting a column that does not exist. */
export function tableBindings(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): TableBinding[] {
  return module.tableIds.map((tableId) => {
    const entity = entities[tableId]
    if (!entity) return { tableId, rows: 0 }
    return {
      tableId,
      entity,
      rows: rowsByEntity[tableId]?.length ?? 0,
      label: displayFieldOf(entity),
      image: imageFieldOf(entity),
      price: priceReadOf(entity),
    }
  })
}

/* ---------------------------------------------------------- */
/* What an item page's blocks point at                         */
/* ---------------------------------------------------------- */

/** Columns of a table that can be drawn as a column on an item page.
 *  Images are excluded because a picture is drawn by the block's own
 *  picture track and never as a cell — `formatCell` returns '' for
 *  one, so offering it would put a permanently blank column on the
 *  page and blame the data for it. */
export const columnCandidates = (entity: EntityDef): FieldDef[] =>
  entity.fields.filter((f) => f.type !== 'image')

/** The column ids a block is actually drawing. Absent on the block
 *  means "a sensible few", and the sensible few are chosen by the
 *  same function the renderer uses — so the ticks an admin sees are
 *  the columns the page shows, and not a second opinion about them. */
export function effectiveColumns(entity: EntityDef, block: ViewBlock): string[] {
  return block.columns ?? defaultColumns(entity)
}

export interface BlockBinding {
  block: ViewBlock
  /** absent = the table this block showed has been struck from the sheet */
  target?: EntityDef
  /** the columns it draws, in order */
  columns: string[]
  /** column ids it asks for that no longer exist on the table. A block
   *  pointing at a deleted column must SAY SO where it stands. */
  missing: string[]
}

export function blockBindings(
  view: ViewDef | undefined,
  entities: Record<string, EntityDef>,
): BlockBinding[] {
  return (view?.blocks ?? []).map((block) => {
    const target = entities[block.tableId]
    if (!target) return { block, columns: block.columns ?? [], missing: [] }
    const has = new Set(target.fields.map((f) => f.id))
    const columns = effectiveColumns(target, block)
    return { block, target, columns, missing: columns.filter((id) => !has.has(id)) }
  })
}

/* ---------------------------------------------------------- */
/* Reordering                                                  */
/* ---------------------------------------------------------- */

/** One id moved one place. Returns the SAME array when the move would
 *  fall off either end, so a caller can compare by identity and skip
 *  the write rather than touching `updatedAt` for nothing. */
export function moveId<T>(list: T[], item: T, dir: -1 | 1): T[] {
  const from = list.indexOf(item)
  const to = from + dir
  if (from < 0 || to < 0 || to >= list.length) return list
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/** Move a block up or down its item page.
 *
 *  WHY THIS WRITES THE WHOLE DEFINITION. `@/features/views` owns view
 *  editing and exports add / update / rule / filter / remove — but no
 *  move, because nothing before this could reorder a page. Rather than
 *  grow a second editor for view blocks in this feature (the
 *  fifth-editor mistake, one floor up), this goes through the one
 *  seam the feature already exports for putting a definition back.
 *  `updatedAt` is stamped here because that seam does not stamp it,
 *  and the shell's mirror to IndexedDB compares name and blocks. */
export function moveViewBlock(view: ViewDef, blockId: string, dir: -1 | 1): void {
  const block = view.blocks.find((b) => b.id === blockId)
  if (!block) return
  const blocks = moveId(view.blocks, block, dir)
  if (blocks === view.blocks) return
  registerViewDef({ ...view, blocks, updatedAt: nowIso() })
}

/* ============================================================
   WHERE A CARD SITS ON THE DASHBOARD.

   `ModuleDef.order` is the field and the dashboard reads it
   ascending, so putting a place where its owner wants it is one
   number per module and nothing else. This works out which of those
   numbers actually have to change.

   IT RENUMBERS TO 0…n-1 AND ONLY WHERE THE VALUE DIFFERS. The stored
   orders are whatever they were when each module was made — five
   modules seeded 0,1,2,3,4, a sixth added by hand landing on 5, and
   a project imported from somewhere else carrying any integers at
   all. Writing the drawn INDEX makes the field canonical, so the
   second move on the same dashboard rewrites exactly the two cards
   that swapped. Every write costs an `updatedAt` and a save, which is
   the whole reason the list is filtered rather than rewritten whole.

   NOTHING IS INVENTED AND NOTHING IS LOST. A move that would fall off
   either end returns an empty plan — `moveId` hands back the same
   array and this compares it by identity — so the first card's "move
   earlier" is refused rather than silently wrapping to the end.
   ============================================================ */

/** One card moved one place, as the writes that puts it there.
 *
 *  `cards` must be in the order they are DRAWN, which is the order
 *  the dashboard sorts them into; the plan is empty when the move
 *  cannot be made or would change nothing. */
export function reorderPlan(
  cards: readonly ModuleDef[],
  id: string,
  dir: -1 | 1,
): { id: string; order: number }[] {
  const ids = cards.map((m) => m.id)
  const next = moveId(ids, id, dir)
  /* identity, not equality: `moveId` returns the list it was given
     when the move falls off an end, and `ids` is fresh on every call */
  if (next === ids) return []
  const stored = new Map(cards.map((m) => [m.id, m.order]))
  const out: { id: string; order: number }[] = []
  next.forEach((mid, i) => {
    if (stored.get(mid) !== i) out.push({ id: mid, order: i })
  })
  return out
}
