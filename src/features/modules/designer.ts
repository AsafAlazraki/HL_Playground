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
  isRetired,
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
/* THE TWO READINGS THIS FILE BORROWS RATHER THAN REPEATS — see the
   note beside them in `capabilityStates`. */
import { relatedTables } from './read'
import { renameFieldOf } from './writeCaps'
import { nowIso } from '@/lib/id'
import { imageFieldOf, priceReadOf, type PriceRead } from './read'


/* ---------------------------------------------------------- */
/* The verbs                                                  */
/* ---------------------------------------------------------- */

/** The nine verbs the contract carries, plus the one it does not yet.
 *  See `ruleCapability.ts` for the exact line `MODULE_CAPABILITIES`
 *  needs and why it is not written there this session. Everything
 *  below this line treats all ten identically — only the two writers
 *  (`ModuleDesigner`'s switch handler, and `capabilityStates`' third
 *  argument) know one of them is stored somewhere else. */
/** Kept as a name for one release while the tenth verb lived outside
 *  the contract. It IS `ModuleCapability` now — `configure` landed in
 *  the union — and the alias stays only so the callers that speak of
 *  "the designer's verbs" keep reading as they did. */
export type DesignerCapability = ModuleCapability

/** Every verb in the contract's own declaration order, with the tenth
 *  spliced in where it will live: after `relate`, before `quote`.
 *
 *  STILL ITERATED FROM `MODULE_CAPABILITIES`, so a verb added there
 *  appears here — and on the dashboard card, and on the index — without
 *  this file changing. That is the property `capabilityStates` has
 *  always had and it does not get traded away for one insertion. */
export const DESIGNER_CAPABILITIES: DesignerCapability[] = Object.keys(
  MODULE_CAPABILITIES,
) as ModuleCapability[]

/** WHAT A SWITCHED-ON VERB ACTUALLY DOES, said beside the switch.
 *  Shared with the index's own stub strip, so the promise made on the
 *  switch and the promise made on the disabled control are the same
 *  sentence and can never drift apart.
 *
 *  THREE OF THESE WERE FALSE THE MOMENT THE CATALOGUE GREW THE ACTS.
 *  `add`, `edit` and `delete` read "not built yet — the sheet is
 *  where rows are made today", which was true for as long as
 *  `ModuleIndex` read `browse`, `search` and `open` and stopped. It
 *  no longer does: the Catalog tab carries a new button, a rename on
 *  each face and a take-out, all three gated on these switches, all
 *  three undoable (`writeCaps.ts`). A note claiming a verb is unbuilt
 *  while the verb works is the same class of lie as a switch that
 *  changes nothing, pointing the other way.
 *
 *  So they follow the shape `relate` and `quote` already set: WHERE
 *  THE VERB WORKS, NOT HOW TO WORK IT. Both of those closed with a
 *  route — "happens on the item's own page today", "open one and
 *  press 'Quote this one'" — which is a step-by-step for a control on
 *  a page this note is not on. The fact a person needs is which page
 *  owns the verb; finding the button on it is that page's job.
 *
 *  `configure` IS ABSENT FROM THIS RECORD ON PURPOSE — it is
 *  performed, in the designer's fourth panel, which is the whole
 *  point of the wave that added it. */
export const NOT_YET_SAYS: Partial<Record<DesignerCapability, string>> = {
  add: 'A new one is started from the Catalog tab, empty, in this module’s first table.',
  /* NAMES THE HALF THAT IS TRUE AND THE HALF THAT IS NOT. A
     catalogue face carries one editable fact — the item's own name —
     and a note promising more than that would send somebody looking
     for a price box that is not there. */
  edit: 'A name is typed on its own face in the Catalog; every other column changes on the sheet.',
  delete: 'Taking one out is done from its face in the Catalog, and it is undoable.',
  relate: 'Ticked on an item’s own page today.',
  quote: 'Quoting starts from an item’s own page today.',
  /* THE TWO TRAVEL VERBS, ON THE CATALOGUE'S OWN BAR. `export` read
     "not built yet" for as long as the switch changed nothing; it now
     puts Export on the bar and `import` puts Re-upload and Paste rows
     beside it, both gated on these switches (`travelCaps.ts`). Same
     shape as the four above: WHERE the verb works, not how to work
     it. */
  /* IT NAMES WHAT LEAVES, because that is the decision being made
     here. The file is the REGISTER — every column the table holds,
     buy prices included — and not the catalogue face, which shows a
     name and a sell price. An administrator granting this to a job
     is granting the cost structure with it, and finding that out in
     Excel afterwards is finding it out too late. Measured on the
     real sheet: Highfield's file is 588 rows and 33 columns, where
     the face draws four. */
  export: 'A file of this register comes off the bar above the Catalog — every column the table holds, cost columns included.',
  import: 'A file comes back in from the bar above the Catalog, and it says what it would change before it changes it.',
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
  /**
   * THE WHOLE SHEET, and it is required for exactly one refusal.
   *
   * `relate` asks "is anything related to these tables", and the
   * answer is about tables this module does NOT hold — so it cannot
   * be read off `tables`. The first draft passed the module's own
   * tables to `relatedTables`, which skips any relation whose far
   * end is not in the map it was given: every far end resolved to
   * undefined, the count came back 0, and the refusal fired on every
   * module in the app. It looked right on Labour Rates, where the
   * answer really is nothing, and was wrong on Boats, where seven
   * brands are the source of every fitment join in the price file.
   *
   * The seeded demo's own invariant caught it — "switches on no verb
   * the module itself would refuse" — which is what that test is for.
   *
   * OPTIONAL, AND THE REFUSAL IS SILENT WITHOUT IT. A caller that
   * cannot supply the sheet gets every other refusal and no claim
   * about relationships, which is better than a claim made from a
   * map that cannot answer.
   */
  sheet?: Record<string, EntityDef>,
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

  /* ── THE REFUSALS §5 ASKS FOR, AND WHERE EACH READING COMES FROM ──
     "A capability that cannot be turned on says what is missing."
     Three did. Four more could be switched on and do nothing at all,
     which is the same safety lie `writeCaps.ts` was written to end,
     pointed at the designer instead of the catalogue.

     EVERY READING BELOW ALREADY EXISTED. Nothing new decides anything
     here: `renameFieldOf` is the catalogue's own test for a column a
     rename may type into, `relatedTables` is what the module's links
     panel counts, and the register count is the one `travelCaps`
     refuses a file on. Asking the same question in two places with
     two answers is how a switch and a surface come to disagree. */
  const live = tables.filter((e) => !isRetired(e))
  const nameable = live.some((e) => renameFieldOf(e) !== undefined)
  const relatable = gone || sheet === undefined ? null : relatedTables(module, sheet).length
  const registers = live.length

  return DESIGNER_CAPABILITIES.map((key) => {
    const meta = MODULE_CAPABILITIES[key]
    const on = module.capabilities.includes(key)
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
    } else if (key === 'edit' && !nameable) {
      /* THE SAME SENTENCE THE CATALOGUE PRINTS, one surface earlier.
         `readWrites` refuses editing where no table names its rows in
         a column that can be typed into, and said so only AFTER an
         admin had switched the verb on — so the switch moved, nothing
         changed, and the reason turned up on a different screen. */
      refused = `No table here names its rows in a column that can be typed into — a formula, a figure or a picked-from-a-list value is changed on the sheet, where it has the right editor. Give ${live[0]?.name ?? 'a table'} a text column that names a row and this switches on.`
    } else if (key === 'relate' && relatable === 0) {
      /* `relate` is "pin and unpin rows inside related blocks". With
         nothing related to these tables there is no block to pin in,
         and the fix is a relationship on the sheet rather than a
         setting here. */
      refused = `Nothing on the sheet is related to ${live[0]?.name ?? 'this table'} yet, so there are no related rows to pin. Draw a relationship on the data model and this switches on.`
    } else if ((key === 'export' || key === 'import') && registers > 1) {
      /* A FILE IS ONE REGISTER — `travelCaps`'s refusal, said at the
         switch as well as at the bar. A module drawing seven of them
         cannot honour either verb, and switching it on would promise
         a control that refuses the moment it is pressed. */
      refused = `${module.name} draws ${registers} registers and a file is one of them. Each has its own copy on the sheet, under its own name.`
    } else if (key === 'configure' && ruleable.length === 0) {
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
export function capabilityWords(module: ModuleDef): string[] {
  return DESIGNER_CAPABILITIES.filter((key) => module.capabilities.includes(key)).map(
    (key) => MODULE_CAPABILITIES[key].label,
  )
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

/**
 * DROP ONE MODULE WHERE ANOTHER ONE IS — the drag's own commit, and
 * the sibling of `reorderPlan` above.
 *
 * `reorderPlan` is a STEP: an arrow moves a module one place and
 * refuses at the ends. A drag is not a step — it lands somewhere, and
 * "somewhere" is named by the module whose slot the pointer was over
 * when the finger came up. So this takes the two ids rather than a
 * direction, and returns the same shape: only the modules whose
 * stored `order` actually changed.
 *
 * IT IS OVER THE WHOLE LIST, NOT THE VISIBLE ONE. The grid filters —
 * five of twenty-six cards — and a drop between two visible cards
 * still has to mean something to the twenty-one that are not on
 * screen. Landing the module where the target module is keeps every
 * unseen module's relative order untouched, which is the only answer
 * that does not move things a person cannot see.
 */
export function reorderTo(
  cards: readonly ModuleDef[],
  id: string,
  toId: string,
): { id: string; order: number }[] {
  const ids = cards.map((m) => m.id)
  const from = ids.indexOf(id)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return []
  const next = [...ids]
  next.splice(to, 0, ...next.splice(from, 1))
  const stored = new Map(cards.map((m) => [m.id, m.order]))
  const out: { id: string; order: number }[] = []
  next.forEach((mid, i) => {
    if (stored.get(mid) !== i) out.push({ id: mid, order: i })
  })
  return out
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

