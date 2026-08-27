/* ============================================================
   IS THIS MODULE ONE PLACE, OR A BAG?

   THE OWNER SAID IT TWICE — "modules should be split better" — and
   the two that were wrong were wrong for two different reasons, both
   of which are visible in the data and neither of which is a marine
   opinion:

     Parts & Accessories held the parts library, the rigging kits and
     the dealer fit packages. Two of those are `kind: 'accessory'` and
     one is `kind: 'package'`. The module was a bag because the app
     itself knows they are not the same sort of thing.

     Rates & Charges held labour rates, oils and consumables, and
     registration bands. All three are `kind: 'custom'` — which is not
     agreement, it is the absence of a kind. Three tables the app
     cannot classify are three tables it has no grounds to call the
     same place.

   SO THE RULE, AND IT IS THE WHOLE RULE:

     A module is ONE PLACE when every table it lists agrees on what
     sort of thing it holds. `custom` is not agreement — it is a
     table that has told us nothing, so it agrees with nothing,
     including another `custom` table.

   NOTHING IN THIS FILE NAMES A BOAT, A PART OR A FEE. It reads
   `EntityDef.kind` and `TABLE_KINDS`, which is the vocabulary the app
   already ships for a pharmacy and a plant hire yard as much as for a
   dealership. A workbook that grew an eighth brand tomorrow changes
   nothing here; a module that grew a table of a second kind is
   reported the moment it does.

   WHAT IT WILL NOT DO — AND THIS IS DELIBERATE:

     IT NEVER MERGES. It is asked about ONE module and answers about
     that module's own tables. Two modules of the same kind are two
     decisions an admin made — Factory Packages and Dealer Fit
     Packages are both `package` and are emphatically not one place —
     and a tool that quietly proposed collapsing somebody's dashboard
     would be doing the very thing this exists to complain about.

     IT NEVER SPLITS ANYTHING BY ITSELF. It returns a reading. The
     designer draws that reading beside the tables it is about, and a
     person decides. A module is somebody's decision about their own
     business and this is evidence, not a verdict.
   ============================================================ */

import { TABLE_KINDS, type EntityDef, type ModuleDef, type TableKind } from '@/types/model'
import { moduleTables } from './read'

/** One natural part of a module — the tables in it that agree. */
export interface SplitPart {
  /** the kind they agree on, or the one unclassified table's own id */
  key: string
  /** the kind's own label as `TABLE_KINDS` writes it, lower-cased and
   *  plural, or the table's own name when it declares no kind */
  what: string
  tableIds: string[]
  names: string[]
}

export interface SplitReading {
  /** true when every listed table agrees, so there is nothing to say */
  coherent: boolean
  /** the parts, biggest first. One part = coherent. */
  parts: SplitPart[]
  /** what is wrong, in one sentence, or '' when nothing is. The
   *  operator's own words: a kind is named by its label, never by its
   *  key, and a table with no kind is named by ITS OWN NAME rather
   *  than by the word `custom`, which is a schema term and means
   *  nothing to the person reading it. */
  say: string
}

/** The kind's own plural, lower-cased — 'accessories', 'packages'. */
function kindWord(kind: TableKind): string {
  const label = TABLE_KINDS[kind].label.toLowerCase()
  return label.endsWith('s') ? label : `${label}s`
}

/** A table's kind, or undefined when it has not declared one. `custom`
 *  is the app's fallback and is treated as undeclared here, which is
 *  the whole distinction this file turns on.
 *
 *  EXPORTED so the panel that MAKES a module and the reading that
 *  judges one ask the same question. See `siblingOffer` at the foot
 *  of this file for what happened while they asked it separately. */
export function declaredKind(entity: EntityDef): TableKind | undefined {
  const k = entity.kind
  if (!k || !(k in TABLE_KINDS) || k === 'custom') return undefined
  return k
}

/** How this module's own tables fall apart, if they do.
 *
 *  ASKED OF EVERY TABLE THE MODULE NAMES, including a retired one: an
 *  admin who cannot see that their module still holds a table cannot
 *  decide anything about it. */
export function splitReading(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
): SplitReading {
  const tables = moduleTables(module, entities)
  if (tables.length === 0) return { coherent: true, parts: [], say: '' }

  const byKind = new Map<string, SplitPart>()
  for (const entity of tables) {
    const kind = declaredKind(entity)
    /* AN UNCLASSIFIED TABLE IS ITS OWN PART, keyed on its own id so two
       of them never collapse into one. That is the Rates & Charges
       case exactly: three tables, three parts, no shared kind to put
       them under. */
    const key = kind ?? `table:${entity.id}`
    const part = byKind.get(key)
    if (part) {
      part.tableIds.push(entity.id)
      part.names.push(entity.name)
    } else {
      byKind.set(key, {
        key,
        what: kind ? kindWord(kind) : entity.name,
        tableIds: [entity.id],
        names: [entity.name],
      })
    }
  }

  const parts = [...byKind.values()].sort(
    (a, b) => b.tableIds.length - a.tableIds.length || a.what.localeCompare(b.what),
  )
  if (parts.length < 2) return { coherent: true, parts, say: '' }

  /* THE SENTENCE NAMES WHAT IT COUNTED AND NOTHING ELSE. A part that
     is a kind says the kind and how many tables carry it; a part that
     is one unclassified table says that table's name. Nobody has to
     work out which is which from a number. */
  const clauses = parts.map((p) =>
    p.tableIds.length === 1 && p.key.startsWith('table:')
      ? `${p.what}, which declares no kind at all`
      : `${p.tableIds.length} ${p.tableIds.length === 1 ? 'table' : 'tables'} of ${p.what}`,
  )
  const last = clauses.pop() as string
  const list = clauses.length > 0 ? `${clauses.join(', ')} and ${last}` : last

  return {
    coherent: false,
    parts,
    say: `${module.name} holds ${list}. A place in the business is one sort of thing; these are ${parts.length}.`,
  }
}

/* ============================================================
   AND THE SAME RULE, ASKED ONE MOMENT EARLIER.

   `splitReading` above is a POST-MORTEM. It is asked about a module
   that already exists and it tells an admin what they built. That is
   the right instrument for the nine modules on this dashboard and the
   wrong one for the tenth, because the tenth is made in a panel that
   was, until this, actively offering to make it a bag:

     "These are also custom tables. Tick any that belong in the same
      module and people will browse them together."

   On this sheet that sentence appears the moment somebody picks
   Labour Rates, and the two boxes under it are Oils & Consumables and
   Registration Costs — the exact three-table bag this whole change
   was asked to undo, offered back with a tick beside it. A rule that
   only ever complains after the fact is a rule the app is arguing
   with itself about.

   SO THE OFFER IS BUILT FROM THE SAME PREDICATE THE READING USES.
   `declaredKind` is now exported and both call it, which means the
   panel cannot offer a bundle the designer would then call a bag.
   Two answers to one question was the defect; there is now one
   answer and two surfaces asking it.

   AND WHEN THERE IS NOTHING TO OFFER, IT SAYS WHY, WHERE IT IS
   (DESIGN_CONTRACT §10). A person who picks a table with no kind and
   sees no tick boxes has been told nothing; a person who reads that
   their table declares no kind, that four others declare none either,
   and that four tables the app cannot classify are not four of one
   thing, has been told the whole truth and where to change it.
   ============================================================ */

/** What this module's tables offer to a person who is about to add
 *  one — and, when they offer nothing, why. */
export interface SiblingOffer {
  /** the tables that AGREE with the picked one, so bundling them
   *  keeps the module one place. Empty when the picked table declares
   *  no kind, whatever else is on the sheet. */
  siblings: EntityDef[]
  /** the refusal, in place — '' when nothing is being refused. It is
   *  non-empty only where the offer is empty BECAUSE of the rule
   *  rather than because the sheet simply holds nothing else. */
  why: string
}

/** The tables a new module may safely be built from alongside
 *  `picked`, and the sentence for the case where there are none.
 *
 *  `offered` is whatever list the panel was already willing to show —
 *  this narrows it, it does not widen it, so a retired or join table
 *  the caller had already excluded stays excluded. */
export function siblingOffer(picked: EntityDef, offered: readonly EntityDef[]): SiblingOffer {
  const kind = declaredKind(picked)
  const rest = offered.filter((e) => e.id !== picked.id)

  if (kind !== undefined) {
    return {
      siblings: rest
        .filter((e) => declaredKind(e) === kind)
        .sort((a, b) => a.name.localeCompare(b.name)),
      why: '',
    }
  }

  /* THE COUNT IS COUNTED, never asserted: how many other tables on
     this sheet are in the same position. It is the figure that turns
     the refusal from a rule into an observation about their data. */
  const alsoUnclassified = rest.filter((e) => declaredKind(e) === undefined).length
  const why =
    alsoUnclassified === 0
      ? `${picked.name} declares no kind, so nothing else here is known to hold the same sort of thing. It can be a module on its own, and tables can be added to it later from its settings.`
      : `${picked.name} declares no kind, and ${alsoUnclassified} other ${
          alsoUnclassified === 1 ? 'table declares' : 'tables declare'
        } none either. That is not agreement — it is ${
          alsoUnclassified === 1 ? 'a table' : 'tables'
        } this app cannot classify, which is no reason to file ${
          alsoUnclassified === 1 ? 'it' : 'them'
        } in one place. Give them a kind on the sheet and they will offer each other here.`

  return { siblings: [], why }
}
