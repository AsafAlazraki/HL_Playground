/* ============================================================
   STARTING A QUOTE — the two layers, read once.

   WHAT THIS FILE IS. "New quote" is the rail's one primary act, and
   a quote in this app cannot be empty: `createQuoteFromView(viewId,
   rowId)` mints one FROM THE ROW BEING SOLD. So pressing it asks a
   question rather than making a document, and the question has two
   layers:

     LAYER ONE   WHICH PLACE IN THE BUSINESS — the modules. A module
                 is a place a dealer made; it declares what may be
                 done in it, and `quote` is one of those verbs.
     LAYER TWO   WHAT THAT PLACE HOLDS, down to the row being sold —
                 the module's own catalogue, cut by table and by the
                 table's own banner column.

   Everything here is a PURE READING of things the caller already
   holds. No React, no store, no registry: the surface hands over
   `modules`, `entities` and `rowsByEntity` and gets back doors,
   refusals and a flow preview. That is what keeps `@/features/quote`
   able to say, in one grep, that `useProjectStore` appears in
   `freeze.ts` and nowhere else.

   ── WHY A DOOR CAN BE SHUT, AND WHY IT IS STILL DRAWN ─────────

   Five of the nine modules on the real sheet cannot raise a price,
   and each for a different, true reason: Labour Rates and Oils &
   Consumables declare only Browse and Search; Parts & Accessories
   never had Quote switched on. A picker that listed four doors and
   silently dropped five would teach a dealer that their own modules
   are not really the shape of the app.

   So every place is drawn, and a place that cannot start a quote
   says WHY, in the place where it is refused — rule 10 — and names
   the control that would change it. That is the whole difference
   between this and a filtered list.

   ── AND THE FLOW IS PREVIEWED BEFORE IT IS COMMITTED ──────────

   `flowPreview` is the second reason the picker exists rather than a
   plain search box. A quote's steps are its view's blocks (see
   `steps.ts`), so what you are quoting decides which steps exist —
   a boat brings its motors, its trailers and its dealer fit; a motor
   brings its own rigging and nothing else. That is knowable BEFORE a
   document is minted, from the same relationships that will build
   it, and a person choosing a subject should be able to see the walk
   they are choosing.

   It reads a view when one exists and `defaultBlocksFor` when one
   does not, which is exactly what `createViewFor` will resolve at
   mint time. It creates nothing: a preview that registered a view
   would be structure as a side effect of hovering.
   ============================================================ */

import {
  MODULE_CAPABILITIES,
  TABLE_KINDS,
  isRetired,
  type EntityDef,
  type ModuleDef,
  type RowData,
  type TableKind,
  type ViewBlock,
  type ViewDef,
} from '@/types/model'
/* THE DIRECT PATH, AND IT IS NOT A STYLE CHOICE. `modules/read.ts`
   imports the QUOTE barrel — it asks this feature which columns are
   costs and which day a stamp falls on — so reaching the modules
   BARREL from here would close a cycle through `quote/index.ts`. The
   deep path takes `read.ts` alone, which imports no surface and no
   store, and `quote/index.ts` deliberately does not re-export this
   file: see the note there. Same convention, and the same reason, as
   `@/features/views/sellable` two lines down. */
import {
  buildEntries,
  censusLine,
  groupEntries,
  listedTables,
  moduleCensus,
  moduleTables,
  type IndexEntry,
  type IndexSection,
  type ModuleCensus,
} from '@/features/modules/read'
import { defaultBlocksFor } from '@/features/views/relations'
import { retiredTablesSentence } from '@/features/views/sellable'

/* ---------------------------------------------------------- */
/* LAYER ONE — the places                                      */
/* ---------------------------------------------------------- */

/** One place in the business, read as a door into a quote. */
export interface QuoteDoor {
  moduleId: string
  name: string
  description: string
  module: ModuleDef
  /** the tables a catalogue may draw — never a retired one */
  tables: EntityDef[]
  /** the primary table's kind, for the mark. 'custom' when it has none. */
  kind: TableKind
  census: ModuleCensus
  /** the census as the dashboard says it, so the two never disagree */
  say: string
  /**
   * WHY A QUOTE CANNOT START HERE, as a sentence, or '' when it can.
   *
   * Never a disabled control with no explanation, and never an empty
   * door. The order below is the order a person can act on: a module
   * with no tables is fixed in its settings before its verbs are
   * worth arguing about, and a module whose whole stock is retired is
   * a business decision rather than a configuration one.
   */
  refusal: string
}

/** The word a refusal uses for the control that would clear it. Named
 *  rather than described: "turn Quote on" is only actionable if the
 *  reader knows the switch is called Quote. */
const QUOTE_VERB = MODULE_CAPABILITIES.quote.label

/** The verbs a module DOES declare, in the module's own order, as the
 *  admin's own words — so a refusal can say what the place is for
 *  instead of only what it is not for. */
export function verbsOf(module: ModuleDef): string[] {
  return module.capabilities
    .filter((c) => c in MODULE_CAPABILITIES)
    .map((c) => MODULE_CAPABILITIES[c].label)
}

/** "Browse and Search" — an English list, because a comma-separated
 *  run of labels reads as a database column. */
export function andList(words: readonly string[]): string {
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

function refusalFor(
  module: ModuleDef,
  all: EntityDef[],
  listed: EntityDef[],
  census: ModuleCensus,
): string {
  if (all.length === 0) {
    return `${module.name} is not pointed at a table yet, so there is nothing in it to sell. Choose its tables in ${module.name}'s settings.`
  }

  if (!module.capabilities.includes('quote')) {
    const verbs = verbsOf(module)
    const has =
      verbs.length === 0
        ? `${module.name} declares no verbs at all`
        : `${module.name} is for ${andList(verbs).toLowerCase()}`
    return `${has}. Turn ${QUOTE_VERB} on in its settings and anything in it can start one.`
  }

  if (listed.length === 0) {
    return `${retiredTablesSentence(all.length)} ${module.name} has nothing left to offer a customer.`
  }

  if (census.items === 0) {
    return census.held > 0
      ? `Every one of the ${census.held} ${census.noun} in ${module.name} is no longer sold. They stay on the sheet, so the quotes already written against them still open — but none of them should be put in front of a customer.`
      : `There is nothing in ${module.name} yet. Add a row to ${listed[0].name} and it becomes something you can quote.`
  }

  return ''
}

/**
 * The places in the business, in the dealer's own dashboard order,
 * each with the reason it cannot start a quote or '' when it can.
 *
 * THE ORDER IS THE DASHBOARD'S AND NOT A RANKING. Sorting the doors
 * that work to the top would be a second opinion about where a
 * dealer's own places live, and a person who has learned the
 * dashboard once should not have to learn a different list here.
 */
export function quoteDoors(
  modules: Record<string, ModuleDef> | readonly ModuleDef[],
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): QuoteDoor[] {
  const list = Array.isArray(modules)
    ? [...(modules as readonly ModuleDef[])]
    : Object.values(modules as Record<string, ModuleDef>)

  return list
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((module) => {
      const all = moduleTables(module, entities)
      const listed = listedTables(module, entities)
      const census = moduleCensus(module, entities, rowsByEntity)
      const primary = all[0]
      return {
        moduleId: module.id,
        name: module.name,
        description: module.description,
        module,
        tables: listed,
        kind:
          primary && primary.kind && primary.kind in TABLE_KINDS
            ? primary.kind
            : 'custom',
        census,
        say: censusLine(census),
        refusal: refusalFor(module, all, listed, census),
      }
    })
}

/* ---------------------------------------------------------- */
/* LAYER TWO — what the place holds                            */
/* ---------------------------------------------------------- */

/**
 * HOW MANY ROWS ARE DRAWN AT ONCE, and why there is a cap at all.
 *
 * Boats holds 810 live rows across seven brands and Parts holds 719.
 * The reference this was studied against caps its own catalogue
 * picker at 50 and asks for two characters before it will search a
 * long list; both numbers are right and neither is arbitrary — a
 * list nobody can scroll to the end of is a list nobody reads, and a
 * search that re-filters 810 rows on the first keystroke flickers
 * under the caret.
 *
 * WHAT IS NOT COPIED IS THE SILENCE. There, the 51st row simply is
 * not there. Here the count that did not fit is always said, and the
 * search reaches every row in the place — see `matchSubjects`.
 */
export const SUBJECT_CAP = 50

/** A list longer than this asks for a word before it filters. Below
 *  it, the whole thing is on screen already and a first keystroke
 *  costs nothing. */
export const SEARCH_FLOOR = SUBJECT_CAP

/** How many characters count as a word. One letter over 810 boats
 *  narrows to 300 and helps nobody; two is the reference's number and
 *  it is the right one. */
export const SEARCH_MIN = 2

/** The rows of one place, ready to shop. */
export interface SubjectList {
  /** every sellable row in the place, table order then row order —
   *  the list this search ran over, handed back so the sentence under
   *  an empty result can say how much was really looked at */
  all: readonly IndexEntry[]
  /** what the search left, before the cap */
  matched: IndexEntry[]
  /** what is drawn — `matched`, capped */
  shown: IndexEntry[]
  /** matched minus shown, so the cap can say what it kept back */
  hidden: number
  /** `shown`, cut into sections by table and groups by banner */
  sections: IndexSection[]
  /** the search is waiting for a second character */
  waiting: boolean
}

/**
 * WORD BY WORD, NOT ONE LONG STRING — the same rule the view stage's
 * row rail keeps, and for the reason written there: the haystack
 * carries the grouping trail's ' ▸ ' and whatever punctuation the
 * row's own name has, so "Sport 560" is never a literal substring of
 * "sport ▸ sp560 highfield - sp560 (pvc)" and a whole-string test
 * answers "nothing matches" for a row two screens down.
 *
 * THE SEARCH IS OVER THE TRAIL AS WELL AS THE NAME, so typing a
 * series name finds every model under it — which is how a dealer
 * actually looks for a hull.
 */
export function matchSubjects(entries: readonly IndexEntry[], query: string): IndexEntry[] {
  const needles = query.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')
  if (needles.length === 0) return entries.slice()
  return entries.filter((e) => {
    const hay = `${e.trail} ${e.label}`.toLowerCase()
    return needles.every((n) => hay.includes(n))
  })
}

/**
 * Everything in one place that a person may sell.
 *
 * NOTHING IS INVENTED AND NOTHING IS QUIETLY DROPPED. `buildEntries`
 * refuses a retired table and a discontinued row — the two things a
 * catalogue must never put in front of a customer — and the counts
 * held back are on the census beside this, said in words.
 *
 * THE FACTS ARE NOT ASKED FOR. A tile fact is two or three formatted
 * cells per row chosen by measuring the table; this list prints a
 * name, a trail and a price, so paying for 810 × 3 formatted cells to
 * throw them away is the cost `moduleCensus` already refuses for the
 * same reason.
 *
 * IT IS SEPARATE FROM THE SEARCH ON PURPOSE, and the separation is
 * the difference between a search box that feels instant and one that
 * stutters. Boats holds 810 rows and Parts 719; formatting a price
 * cell for every one of them on every keystroke is exactly the cost
 * the reference's two-character floor exists to hide rather than to
 * avoid. Build once per place, filter per keystroke.
 */
export function catalogueOf(
  door: QuoteDoor,
  rowsByEntity: Record<string, RowData[]>,
): IndexEntry[] {
  return buildEntries(door.tables, rowsByEntity, { facts: false })
}

/** The catalogue, searched and cut — the cheap half, run per
 *  keystroke over a list that is already built. */
export function subjectsIn(
  door: QuoteDoor,
  all: readonly IndexEntry[],
  query: string,
): SubjectList {
  const typed = query.trim()
  const waiting = all.length > SEARCH_FLOOR && typed.length > 0 && typed.length < SEARCH_MIN

  const matched = waiting ? all.slice() : matchSubjects(all, typed)
  const shown = matched.slice(0, SUBJECT_CAP)
  return {
    all,
    matched,
    shown,
    hidden: matched.length - shown.length,
    sections: groupEntries(shown, door.tables),
    waiting,
  }
}

/* ---------------------------------------------------------- */
/* THE WALK THIS CHOICE BUYS                                   */
/* ---------------------------------------------------------- */

/** One stop of the flow a subject would open. */
export interface FlowStop {
  /** the block's id, or the two ids `steps.ts` reserves */
  id: string
  /** the table's name as the dealer wrote it — never a role word */
  title: string
  /** the subject itself: it is a stop with no candidates */
  subject: boolean
  /** the last stop, which is a person rather than a table */
  handover: boolean
}

export interface FlowPreview {
  stops: FlowStop[]
  /** the sentence under the strip. '' when the strip says it all. */
  note: string
}

/** The two ids `steps.ts` and `QuoteBuild` reserve for the stops that
 *  are not a view block. Written here rather than imported so this
 *  file stays free of the sequence, and asserted equal in `steps.ts`. */
const SUBJECT_STOP = '__subject'
const HANDOVER_STOP = '__handover'

/**
 * THE STEPS THIS SUBJECT WOULD OPEN, before a document exists.
 *
 * A quote's sections are the view's top-level blocks, minted by
 * `mintQuoteFromView` and read back by `buildSteps` — so the walk is
 * decided by what this table is RELATED to, and nothing else. That is
 * the app's own answer to the reference's `motorOnly` flag: there, a
 * boolean prop hides four of seven hard-coded steps; here a motor has
 * fewer stops because a motor is joined to fewer things, and an
 * eighth brand added tomorrow changes the preview with no code.
 *
 * A VIEW THAT EXISTS WINS. The dealer may have added or removed
 * blocks on the table's own page, and the quote will be minted from
 * that view — so a preview reading the defaults would be describing a
 * walk nobody is going to take.
 */
export function flowPreview(
  entity: EntityDef,
  entities: Record<string, EntityDef>,
  views: readonly ViewDef[],
): FlowPreview {
  const existing = views.find((v) => v.rootTableId === entity.id)
  const blocks: ViewBlock[] = existing
    ? existing.blocks
    : defaultBlocksFor(entities, entity.id)

  const stops: FlowStop[] = [
    { id: SUBJECT_STOP, title: entity.name, subject: true, handover: false },
  ]
  for (const block of blocks) {
    const target = entities[block.tableId]
    /* a block pointing at a struck table is not a stop — `buildSteps`
       would draw a heading nothing can ever be picked into */
    if (!target || isRetired(target)) continue
    stops.push({ id: block.id, title: target.name, subject: false, handover: false })
  }
  stops.push({
    id: HANDOVER_STOP,
    title: 'Who it is for',
    subject: false,
    handover: true,
  })

  const related = stops.length - 2
  const note =
    related === 0
      ? `Nothing is related to ${entity.name} yet, so this quote is the ${entity.name.toLowerCase()} and the customer. Say what goes with it on its own page and the walk grows.`
      : ''

  return { stops, note }
}

/** "7 stops" — the figure under the strip, counted the way the
 *  sequence counts: the subject and the handover are both stops. */
export const stopCount = (preview: FlowPreview): number => preview.stops.length
