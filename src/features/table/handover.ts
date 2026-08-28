/* ============================================================
   THE HAND-OVER — can a row of THIS table start a quote, and if
   not, in whose words.

   CONFIGURATOR.md fault 5: "the catalogue and the configurator are
   two apps. You browse in one and build in the other, and the two
   do not hand over." The door back is `createQuoteFromView`; this
   file is the gate in front of it.

   IT WRITES ONE SENTENCE AND BORROWS THE REST. Every reason a
   place cannot raise a price is already written, measured and
   tested in `features/quote/start.ts` — a module with no tables, a
   module that declares Browse and Search and not Quote, a module
   whose whole stock is retired, a module with nothing in it yet.
   The picker says those words on the New quote screen; a catalogue
   that invented its own would be the same fact in two voices, and
   a dealer would learn that the app has two opinions about their
   own modules. So `quoteDoors` is asked, narrowed to the modules
   that actually hold this table, and its refusal is passed through
   verbatim.

   THE ONE SENTENCE THAT IS NEW is for the one case the picker
   cannot have: a table in NO module at all. The picker walks the
   modules, so a table nothing points at is simply not on it. The
   catalogue can be opened on any table from All tables, so it can
   stand on one — and "there is no Configure here" with nothing
   said would be the disabled control §6 forbids.

   WHY IT IS NARROWED. `quoteDoors` runs a census per place — every
   row of every table in the module counted, grouped and priced —
   and the whole sheet is 25 places over 7,002 rows. Handing it
   only the modules that hold this table is the same answer for the
   one door that is asked about: measured on Formosa, 1 module and
   7 places rather than 9 and 25.
   ============================================================ */

import type { EntityDef, ModuleDef, RowData } from '@/types/model'
/* DEEP, NOT THROUGH THE BARREL — the same rule `winKit.tsx` records
   against `@/features/quote`: `quote/index` → `QuoteStart` →
   `start.ts` → `quote/index` is a cycle Vite resolves to
   `undefined` at run time rather than failing to build. `start.ts`
   imports no surface and no store. */
import { quoteDoors } from '@/features/quote/start'

/** Whether this table can hand a row to the configurator, and the
 *  reason it cannot when it cannot. */
export interface Handover {
  /** a live row of this table can start a quote */
  can: boolean
  /**
   * WHY NOT, as a sentence — or '' when there is nothing to say.
   *
   * Empty is not the same as "it can". A join table cannot start a
   * quote and is not being refused one: it is the pairing BETWEEN
   * two things a person sells rather than a thing, the app has
   * never offered to quote one anywhere, and a sentence explaining
   * a door nobody looked for is the instructional clutter the
   * owner has asked three times to be rid of.
   */
  why: string
}

const NO_HANDOVER: Handover = { can: false, why: '' }

/**
 * The verdict for one table, in the picker's own words.
 *
 * `modules`, `entities` and `rowsByEntity` are handed over rather
 * than read, so this is testable against the seed without a store —
 * the convention `start.ts` keeps and the reason it has tests at
 * all.
 */
export function handoverFor(
  entity: EntityDef | undefined,
  modules: Record<string, ModuleDef>,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): Handover {
  if (!entity) return NO_HANDOVER
  /* STRUCTURE IS NOT STOCK. `HomeStage` keeps the same rule when it
     groups the tables you can open, and `defaultBlocksFor` never
     makes a join table a step of a quote. */
  if (entity.role === 'join') return NO_HANDOVER

  const holders = Object.values(modules).filter((m) => m.tableIds.includes(entity.id))
  if (holders.length === 0) {
    return {
      can: false,
      why: `${entity.name} is not in any of your modules, so there is nowhere to sell it from. Add it to a module's tables and anything in it can start a quote.`,
    }
  }

  /* A module holding one table is one door and carries no tableId;
     a module holding seven is seven doors, one per table. Both
     shapes are `placesOf`'s, and every door here holds this table
     because `holders` was filtered on it. */
  const doors = quoteDoors(holders, entities, rowsByEntity).filter(
    (d) => d.tableId === undefined || d.tableId === entity.id,
  )

  /* ONE OPEN DOOR IS ENOUGH. A table listed in two modules where
     only one declares Quote can be quoted, and saying why the other
     one cannot would be true and useless. */
  if (doors.some((d) => d.refusal === '')) return { can: true, why: '' }
  return { can: false, why: doors[0]?.refusal ?? '' }
}
