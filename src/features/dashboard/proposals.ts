/* ============================================================
   WHAT YOUR TABLES SUGGEST — the modules the data implies.

   THE MOMENT THIS IS FOR. A dealer imports their price file, lands
   on the front door, and the modules card says "No modules yet" over
   a count of the tables they just loaded and one button called
   Modules. The app knows more than that and is not saying it:
   `EntityDef.kind` records what each table holds, `TABLE_KINDS`
   names it in the dealer's own word, and the store has the rows.
   Seven tables that all say `boat` are a Boats module, and nobody
   has to be asked which seven.

   THIS IS THE PANEL'S OWN ANSWER, ASKED ONE MOMENT EARLIER —
   exactly the move `siblingOffer` made, and for the same reason.
   `NewModuleDialog` already builds a module from ONE master table
   plus the siblings that agree with it; a proposal is that panel's
   state, computed before it is opened, and it is handed over as a
   seed rather than performed here. There is one create path in this
   application and this file does not become a second one.

   SO EVERY PREDICATE BELOW IS THE PANEL'S, NOT THIS FILE'S:

     · `canBeModuleMaster(e) && !isRetired(e)` is the panel's own
       `offered` list, character for character. A proposal that named
       a join, or a table the panel refuses to show, would open onto
       a panel that could not honour it.
     · `declaredKind` is `split.ts`'s, which is what makes `custom`
       mean "declared nothing" rather than "agreed on custom". Four
       tables the app cannot classify are not four of one thing —
       that rule is why Rates & Charges was a bag, and a proposer
       that grouped them would rebuild the bag on the front door.

   NOTHING IS INVENTED, AND THE PROPOSAL IS CHECKABLE BEFORE IT IS
   PRESSED. A proposal carries the tables it would hold by name and
   the rows under them, counted at paint from the store. There is no
   sample, no illustration and no "we think you might sell boats":
   every word in it is either the dealer's own table name or a label
   that ships in `TABLE_KINDS` for a pharmacy and a plant hire yard
   as much as for a dealership.

   WHERE THE NAME COMES FROM, AND WHY IT DEPENDS ON THE COUNT.

     ONE table  → the table's own name. That is what the panel fills
                  in when a person clicks it, and a dealer's word for
                  their own table beats a category every time.
     MANY       → the kind's `TABLE_KINDS` label. Seven brand tables
                  are not called after whichever one sorts first, and
                  "Boats" is the word the modules screen, the rail
                  and the panel's own group head already use.

   A TABLE ALREADY IN A MODULE IS NEVER PROPOSED. That is what makes
   this correct on a NEAR-empty dashboard as well as an empty one:
   the reading is over what is not yet placed, so it shrinks as a
   person builds and is silent on a sheet where everything has a
   home. On the seeded demo — where `northsideModules.test.ts`
   asserts every base table belongs to exactly one module — it
   proposes nothing, which is the correct answer and not a bug.

   AND WHAT IT CANNOT PROPOSE, IT COUNTS AND EXPLAINS (rule 10). A
   table that declares no kind agrees with nothing, so no proposal
   can name it. Leaving it silently out of a list that sits under
   "You have 23 tables and no modules" would be the reduced number
   DESIGN_CONTRACT §5 forbids — so `unplaced` is counted and `why`
   says it in `siblingOffer`'s own words, pointing at the sheet,
   which is where a kind is set.

   PURE, AND IT TAKES ITS INPUTS. The same rule every derivation in
   `cards.ts` keeps: a count that reaches for a store is a count
   nobody can check.
   ============================================================ */

import {
  TABLE_KINDS,
  canBeModuleMaster,
  isRetired,
  type EntityDef,
  type ModuleDef,
  type RowData,
  type TableKind,
} from '@/types/model'
/* BY DIRECT PATH, NOT THROUGH THE BARREL. `@/features/modules`
   re-exports the dialog, the workspace and the designer; importing
   it from a pure derivation would drag React and the store in
   behind one predicate. `usePlaces.ts` reaches for `places.ts` the
   same way and for the same reason. */
import { declaredKind } from '@/features/modules/split'

/** One table inside a proposal, named and counted so a person can
 *  check the proposal before pressing it. */
export interface ProposedTable {
  id: string
  /** the dealer's own name for it, never a label */
  name: string
  rows: number
}

export interface ModuleProposal {
  /** the kind every table in it agrees on. Also the key: there is at
   *  most one proposal per kind, because a second would be proposing
   *  to split a thing nobody has built yet. */
  kind: TableKind
  /** what it would arrive in the panel called — the table's own name
   *  when it holds one, the kind's `TABLE_KINDS` label when it holds
   *  more. Never a string typed in this file. */
  name: string
  /** the tables it would hold, biggest first. THE FIRST IS THE
   *  MASTER: `tableIds[0]` is `createModule`'s contract and the
   *  panel's own pick, so the biggest table is the one the module's
   *  face and description come from. */
  tables: ProposedTable[]
  /** rows under all of them, added up */
  rows: number
}

export interface ProposalReading {
  /** biggest first, so the module a dealer most obviously has is the
   *  first thing they read. Empty when there is nothing to propose */
  proposals: ModuleProposal[]
  /** tables the panel would offer that no proposal can name, because
   *  they declare no kind. Counted, never listed: the fix is on the
   *  sheet and a list here would just be a second table gallery */
  unplaced: number
  /** the refusal, in place — '' when nothing is being refused */
  why: string
}

const EMPTY: ProposalReading = { proposals: [], unplaced: 0, why: '' }

/** Every table id any module already holds, whether or not the table
 *  is still on the sheet. A pointer to a deleted table is not a
 *  reason to propose the table back. */
function heldTables(modules: Record<string, ModuleDef>): Set<string> {
  const held = new Set<string>()
  for (const m of Object.values(modules)) for (const id of m.tableIds) held.add(id)
  return held
}

/** THE SENTENCE FOR WHAT CANNOT BE PROPOSED, in `siblingOffer`'s own
 *  voice — it is the same rule refusing for the same reason one
 *  screen later, and two wordings of one rule is how an app stops
 *  sounding like one voice.
 *
 *  It names the act that fixes it and where that act lives, which is
 *  what rule 10 asks for and what a bare "3 tables were skipped"
 *  would not give anybody. */
function refusal(n: number): string {
  if (n === 0) return ''
  const one = n === 1
  return `${n} ${one ? 'table declares' : 'tables declare'} no kind, so nothing here can say what ${
    one ? 'it holds' : 'they hold'
  }. Give ${one ? 'it' : 'them'} a kind on the sheet and ${
    one ? 'it' : 'they'
  } will be proposed too.`
}

/** The modules this sheet implies and has not got, and the tables no
 *  proposal can speak for. */
export function proposeModules(
  modules: Record<string, ModuleDef>,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): ProposalReading {
  const held = heldTables(modules)

  const byKind = new Map<TableKind, ProposedTable[]>()
  let unplaced = 0

  for (const e of Object.values(entities)) {
    /* THE PANEL'S OWN LIST. A join is a relationship rather than a
       place to stand and a retired table is history rather than
       stock; the panel refuses both, so a proposal may not name
       either. */
    if (!canBeModuleMaster(e) || isRetired(e)) continue
    if (held.has(e.id)) continue

    const kind = declaredKind(e)
    if (kind === undefined) {
      unplaced += 1
      continue
    }
    const row = { id: e.id, name: e.name, rows: rowsByEntity[e.id]?.length ?? 0 }
    const bucket = byKind.get(kind)
    if (bucket) bucket.push(row)
    else byKind.set(kind, [row])
  }

  if (byKind.size === 0 && unplaced === 0) return EMPTY

  const proposals: ModuleProposal[] = []
  for (const [kind, tables] of byKind) {
    /* BIGGEST FIRST, AND THE TIE BREAKS ON NAME so the same sheet
       proposes the same module in the same order on every paint —
       an order that depends on whatever sequence the store handed
       the tables over in is an order that can change under a person
       mid-decision. */
    tables.sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name))
    const rows = tables.reduce((sum, t) => sum + t.rows, 0)
    const first = tables[0]
    if (first === undefined) continue
    proposals.push({
      kind,
      name: tables.length === 1 ? first.name : TABLE_KINDS[kind].label,
      tables,
      rows,
    })
  }

  /* The module a dealer most obviously has, first. Tables before
     rows: eight trailer tables are a bigger fact about a business
     than one parts table with more rows in it. */
  proposals.sort(
    (a, b) => b.tables.length - a.tables.length || b.rows - a.rows || a.name.localeCompare(b.name),
  )

  return { proposals, unplaced, why: refusal(unplaced) }
}

/** What `NewModuleDialog` is handed when a proposal is pressed: the
 *  panel's own three answers, filled in before it opens.
 *
 *  Written structurally rather than imported from the panel so that
 *  this file stays a pure derivation with no path back into a React
 *  surface; `NewModuleDialogProps` is what type-checks the hand-over
 *  at the call site. */
export interface ProposalSeed {
  /** the master — `tableIds[0]`, and the panel's picked row */
  tableId: string
  /** the siblings to arrive ticked */
  alsoIds: string[]
  /** the name to arrive in the field */
  name: string
  /** the description to arrive in the field, or undefined to leave
   *  the panel's own answer — the master table's own line — alone */
  description?: string
}

/** WHAT THE PANEL IS HANDED WHEN A PROPOSAL IS PRESSED.
 *
 *  The master and its siblings, in the order `createModule` stores
 *  them. It is a function rather than a shape the component builds
 *  so that the mapping from "a proposal" to "the panel's state" is
 *  written down once and can be tested without a screen. */
export function seedFor(p: ModuleProposal): ProposalSeed {
  const [master, ...rest] = p.tables
  /* A MODULE OVER MANY TABLES HAS NO DESCRIPTION TO INHERIT. The
     panel fills the description from the table a person clicked,
     which is right when the module IS that table and wrong the
     moment it is seven brands — Highfield's own line is not what
     "Boats" is about. So one table keeps the panel's behaviour and
     many arrive blank, because a blank field a person fills in is
     honest and a borrowed sentence is not. */
  return {
    tableId: master?.id ?? '',
    alsoIds: rest.map((t) => t.id),
    name: p.name,
    ...(rest.length > 0 ? { description: '' } : {}),
  }
}
