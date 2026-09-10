/* ============================================================
   THE TWO TRAVEL VERBS, MADE REAL ON THE CATALOGUE.

   THE FAULT THIS FIXES IS THE ONE `writeCaps.ts` FIXED, one wave
   later and pointing both ways.

   `export` has been in `MODULE_CAPABILITIES` since the module system
   landed. It is a switch in the designer, a column in the access
   grid — and the note beside it read "Taking a copy of this list out
   is not built yet", which is the app admitting that the switch
   changes nothing. `import` was worse: MODULE_SYSTEM §5 lists ten
   verbs, the contract carried nine, and there was no way for an
   administrator to say whether a person may push a file INTO a live
   price list. The two are opposite risks — one leaks a cost column,
   the other overwrites six hundred rows — and the app had a control
   for neither.

   NOTHING NEW IS BUILT TO PERFORM THEM. `io/tableCsv.ts` and
   `io/TableRoundTrip.tsx` have shipped the whole round trip for
   months: a file of what the register is showing, and a preflight
   that reads a file back, writes nothing, and says in counts what it
   would change before a person presses anything. This file decides
   whether the catalogue may put those controls on the bar; it does
   not become a second exporter with its own rules about what leaves
   a dealership.

   ── THE ONE REFUSAL THAT IS THIS FILE'S OWN ──────────────────

   A FILE IS ONE REGISTER, AND A MODULE CAN DRAW SEVEN. Standing at a
   place, `moduleAt` has already narrowed the module to one table, so
   the ordinary case is one. But a module whose tables an admin has
   never split still draws all of them under brand heads — and an
   Export on that page would silently write a file of `tableIds[0]`
   and call it the module's. That is a control that is confidently
   wrong, which DESIGN_PRINCIPLES §7 rates worse than a control that
   refuses; so it refuses, names the count, and says where the file
   for one register comes from.

   THE STANCE IS `writeCaps`'s, not a second shape. Four outcomes and
   not two — off, withheld, on, on-but-blocked — because "this module
   does not offer it" and "your job is not granted it" look identical
   to a person and have opposite explanations.
   ============================================================ */

import { isRetired, type EntityDef, type ModuleDef } from '@/types/model'
import { mayDo } from './access'
import type { WriteStance } from './writeCaps'

/** The two verbs that move rows in or out as a FILE. `add`, `edit`
 *  and `delete` move them one at a time and are answered in
 *  `writeCaps.ts`. */
export type TravelVerb = 'export' | 'import'

export interface CatalogTravel {
  /** take a copy out */
  out: WriteStance
  /** bring a file back in */
  back: WriteStance
  /**
   * THE REGISTER THE FILE IS OF, and the one a file lands in. The
   * module's primary table when that table is still live, the first
   * live one otherwise — the same rule `CatalogWrites.into` follows,
   * so the file a person takes out and the row a person adds come
   * from the same table rather than two tables chosen by two rules.
   *
   * Absent when nothing here is live, which is what the blocks are
   * then about.
   */
  from?: EntityDef
  /** offered here and not granted to this job, in the contract's
   *  order. One sentence is built from it by `withheldSay`, which
   *  takes the verbs' own labels — so this list joins the write
   *  verbs' rather than starting a second apology. */
  withheld: TravelVerb[]
}

/**
 * WHETHER A FILE MAY LEAVE THIS CATALOGUE, OR ARRIVE AT IT.
 *
 * @param module the module AS THE PAGE IS STANDING IN IT — already
 *   narrowed by `moduleAt`, so a person at Highfield takes Highfield's
 *   file out and not whatever `tableIds[0]` is across all of Boats.
 * @param tables every table the module names, retired included, so a
 *   refusal can tell "off the sheet" from "history".
 * @param listed the tables this catalogue actually draws.
 * @param roleId the job standing here, or null for nobody in
 *   particular. Required and not defaulted, for `writeCaps`'s reason:
 *   this is the parameter that decides whether somebody may push a
 *   file over a live price list.
 */
export function readTravel(
  module: ModuleDef,
  tables: readonly EntityDef[],
  listed: readonly EntityDef[],
  roleId: string | null,
): CatalogTravel {
  const granted = (v: TravelVerb): boolean => mayDo(module, roleId, v)

  const withheld = (['export', 'import'] as const).filter(
    (v) => module.capabilities.includes(v) && !granted(v),
  )

  /* WHY THERE IS NOTHING TO TAKE A COPY OF. The same three facts
     `readWrites` separates, in this verb's words: a person told "there
     is nothing to write to" while pressing Export would be reading a
     sentence about a different act. */
  const nowhere: string | undefined =
    listed.length > 0
      ? undefined
      : tables.length === 0
        ? `The tables ${module.name} was made from are no longer on the sheet, so there is no register here to copy.`
        : tables.every((t) => isRetired(t))
          ? `Every table in ${module.name} is history rather than stock. Take one off history on the sheet and its file works again.`
          : `${module.name} draws no table here, so there is nothing to copy.`

  /* A FILE IS ONE REGISTER. See the header: the alternative is an
     Export that writes one of seven brands and says nothing. */
  const manyTables: string | undefined =
    listed.length > 1
      ? `${module.name} draws ${listed.length} registers here and a file is one of them. Each has its own copy on the sheet, under its own name.`
      : undefined

  const from = listed.find((t) => t.id === module.tableIds[0]) ?? listed[0]

  /* NOTHING TO PUT IN A FILE IS NOT A REFUSAL TO EXPORT. A register
     with columns and no rows exports its headings, which is how a
     person gets a blank sheet to type a season's stock into — the
     round trip's own control refuses the empty case in its own words
     (`tb-export`'s refusal), where the count that decides it lives. */
  const stance = (verb: TravelVerb): WriteStance => {
    if (!granted(verb)) return { on: false }
    const blocked = nowhere ?? manyTables
    return blocked === undefined ? { on: true } : { on: true, blocked }
  }

  return {
    out: stance('export'),
    back: stance('import'),
    ...(from ? { from } : {}),
    withheld: [...withheld],
  }
}
