/* ============================================================
   PLACES — what the modules grid actually draws a card for.

   THE FAULT THIS FIXES, stated plainly. The grid drew NINE cards
   called Boats, Motors, Factory Packages, Trailers, Parts &
   Accessories, Dealer Fit Packages, Labour Rates, Oils &
   Consumables, Registration Costs — and each one said "Highfield
   Inflatables + 6 more". Those are CATEGORIES. Highfield, Yamaha,
   Stacer, Dunbier, REDCO, Mackay, GFAB, ePropulsion, Jeanneau,
   Stabicraft, Surtees, Formosa, NSM Custom and Haines are the
   things a dealer opens, and every one of them was hidden inside a
   grouping nobody asked for, behind a card that named a sibling and
   counted the rest.

   THE RULE, AND IT IS ONE LINE:

     A module that holds ONE table is one place, named for the
     module. A module that holds MORE is one place per table, each
     named for the table.

   That is not a guess about what a brand is. A boat table IS a
   brand — TABLE_KINDS says so in as many words ("The table IS the
   brand, so Brand is NOT a level") — so a module pointing at seven
   of them is pointing at seven brands, and the grouping is the
   module's own `tableIds`, read back rather than invented.

   NOTHING IS LOST AND NOTHING IS RENAMED. The module still owns
   the verbs, the access, the pricing and the quotes; a place is a
   DOOR into its module, carrying the table it was opened at.
   `Place.moduleId` is always real, and `Place.tableId` is undefined
   exactly when the module is one place.

   A RETIRED TABLE STILL GETS ITS CARD. Trailers holds the obsolete
   band so an old quote still opens, and a place that vanished from
   the grid would be a table nobody could reach except through the
   sheet. It is drawn, it is counted at zero live, and it says it is
   no longer sold — which is `s-held`'s whole job.

   THE TYPE IS THE TABLE'S OWN KIND, and the filter chips are the
   kinds that are actually present. Not a taxonomy typed here: eight
   kinds ship in TABLE_KINDS with their own labels, a dealer reads
   the same word in the rail, and a kind nobody uses draws no chip.
   ============================================================ */

import {
  TABLE_KINDS,
  isRetired,
  type EntityDef,
  type ModuleDef,
  type RowData,
  type TableKind,
} from '@/types/model'
import { moduleCensus, type ModuleCensus } from './read'

/** One card on the modules grid. */
export interface Place {
  /** stable across renders: the module, plus the table when split */
  key: string
  moduleId: string
  /** the table this place stands for, or undefined when the module
   *  holds exactly one and the place IS the module */
  tableId: string | undefined
  /** what the card is called — the table's name when split, the
   *  module's when not. Never both, never "+ 6 more". */
  name: string
  /** the module it belongs to, for the eyebrow and for reordering */
  moduleName: string
  kind: TableKind
  /** the kind's own label, which is the filter chip's caption */
  typeLabel: string
  /** what is in it, counted, by the same reader the module's own
   *  page uses — so a card and the page it opens cannot disagree */
  census: ModuleCensus
  /** history rather than stock: counted at zero live, drawn as held */
  retired: boolean
  /** first card of its module's run, so the reorder arrows are drawn
   *  once per module rather than once per brand */
  leads: boolean
}

/** A module narrowed to one of its tables, so every reader in
 *  `read.ts` — the census, the face, the catalogue — answers about
 *  the place rather than about the bag it is filed in.
 *
 *  IT IS THE REAL MODULE OTHERWISE. The verbs, the access, the
 *  accent and the id are the module's, because they are facts about
 *  the module and not about the table; only `tableIds` narrows. */
export function moduleAt(module: ModuleDef, tableId: string | undefined): ModuleDef {
  if (tableId === undefined || module.tableIds.length < 2) return module
  if (!module.tableIds.includes(tableId)) return module
  return { ...module, tableIds: [tableId] }
}

const kindLabel = (kind: TableKind): string => TABLE_KINDS[kind].label

const kindOfTable = (e: EntityDef | undefined): TableKind =>
  e && e.kind && e.kind in TABLE_KINDS ? e.kind : 'custom'

/** Every door on the modules grid, in the modules' own stored order
 *  and then in each module's own table order. */
export function placesOf(
  modules: Record<string, ModuleDef>,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): Place[] {
  const ordered = Object.values(modules).sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  )
  const out: Place[] = []
  for (const module of ordered) {
    /* the tables that are really there — a pointer to a deleted one
       is skipped, exactly as `moduleTables` skips it */
    const live = module.tableIds.filter((id) => entities[id] !== undefined)
    if (live.length === 0) {
      /* A MODULE WHOSE TABLES ARE ALL GONE STILL HAS A DOOR. It is
         the one place the person can go to fix it, and a card that
         disappeared would take the fix with it. */
      out.push({
        key: module.id,
        moduleId: module.id,
        tableId: undefined,
        name: module.name,
        moduleName: module.name,
        kind: 'custom',
        typeLabel: kindLabel('custom'),
        census: moduleCensus(module, entities, rowsByEntity),
        retired: false,
        leads: true,
      })
      continue
    }
    const split = live.length > 1
    live.forEach((tableId, i) => {
      const table = entities[tableId]
      const at = split ? moduleAt(module, tableId) : module
      const kind = kindOfTable(table)
      out.push({
        key: split ? `${module.id}::${tableId}` : module.id,
        moduleId: module.id,
        tableId: split ? tableId : undefined,
        name: split && table ? table.name : module.name,
        moduleName: module.name,
        kind,
        typeLabel: kindLabel(kind),
        census: moduleCensus(at, entities, rowsByEntity),
        retired: table !== undefined && isRetired(table),
        leads: i === 0,
      })
    })
  }
  return out
}

/** One filter chip. `all` is first and is not a kind. */
export interface PlaceFilter {
  key: string
  label: string
  count: number
  /** the kind whose hue the chip takes when it is on; absent on All */
  kind?: TableKind
}

/** The chips this set of places earns — All, then one per kind that
 *  is actually present, in TABLE_KINDS' own order. A kind nobody has
 *  a table of draws no chip: a filter that always finds nothing is a
 *  control that teaches a person not to trust the row. */
export function placeFilters(places: readonly Place[]): PlaceFilter[] {
  const seen = new Map<TableKind, number>()
  for (const p of places) seen.set(p.kind, (seen.get(p.kind) ?? 0) + 1)
  const chips: PlaceFilter[] = [{ key: 'all', label: 'All', count: places.length }]
  for (const kind of Object.keys(TABLE_KINDS) as TableKind[]) {
    const n = seen.get(kind)
    if (n === undefined) continue
    chips.push({ key: kind, label: kindLabel(kind), count: n, kind })
  }
  return chips
}

/** The places a chip admits. `all` admits everything, which is why it
 *  is a key and not a null. */
export function placesUnder(places: readonly Place[], filter: string): Place[] {
  if (filter === 'all') return [...places]
  return places.filter((p) => p.kind === filter)
}
