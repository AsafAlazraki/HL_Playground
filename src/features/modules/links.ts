/* ============================================================
   WHAT ELSE IS ATTACHED TO THIS MODULE — derived, never listed.

   THE OWNER'S WORDS: "manage the other things that can be linked to
   that module". The wrong way to answer that is a hardcoded list of
   six headings, which is exactly the shape production's own module
   settings panel has (docs/plan/hl-admin.md §1, "the card set") and
   exactly why an admin there cannot add a seventh without a developer.

   SO EVERY ROW HERE IS COUNTED OFF THE PROJECT. A module is a set of
   TABLES; everything else it is attached to falls out of what those
   tables already carry:

     · the tables themselves      — `moduleTables`
     · the page one item opens on — `ModuleDef.viewId`, and the blocks
                                    that page carries
     · what goes with its things  — `relatedTables`, which asks only
                                    "which table declares a reference
                                    column to one of mine" and knows
                                    nothing about boats
     · the rules over its subject — `constraintsFor` / `flowRulesFor` /
                                    `workbookRulesFor`, all resolved
                                    through the columns
     · the quotes raised from it  — a quote's `rootTableId`, a set
                                    membership and never a guess
     · who may act in it          — `ModuleDef.access`

   Add a table to the module and five of the six move. None of them is
   a field somebody has to remember to fill in, which is the whole
   difference between this and a settings form.

   AND WHAT CANNOT BE MANAGED YET IS SHOWN ANYWAY, saying so. An
   attachment left off the list because there is no editor for it
   reads, to the person looking, as an attachment that does not exist
   — and they will go looking for it somewhere else in the app. Each
   row carries `where`: a sentence naming the surface that owns it,
   or the plain statement that nothing owns it yet.

   NOTHING IS COUNTED TWICE AND NOTHING IS INVENTED. A row with a count
   of zero is still drawn, because "no quotes have been raised here" is
   a fact about this place and a missing line is not.
   ============================================================ */

import type {
  ConstraintDef,
  EntityDef,
  ModuleDef,
  RoleDef,
  RuleDef,
  ViewDef,
} from '@/types/model'
import type { ColumnConcept } from '@/features/constraints/columns'
import type { QuoteDef } from '@/features/quote/types'
import { moduleTables, relatedTables } from './read'
import { constraintsFor, flowRulesFor, moduleKinds, workbookRulesFor } from './moduleRules'
import { isUnrestricted } from './access'

/** Where the thing on this row is changed. */
export type LinkHome =
  /** on this settings page, in a panel above */
  | 'settings'
  /** on another surface in the app, named in `where` */
  | 'elsewhere'
  /** nothing manages it yet, and `where` says so */
  | 'not-yet'

export interface LinkedThing {
  key: string
  /** the noun, already agreeing with `count` */
  name: string
  count: number
  /** what this attachment IS, in one line */
  says: string
  home: LinkHome
  /** where it is changed — a sentence, always present */
  where: string
  /** the few of them worth naming on screen, in the app's own order */
  names: string[]
}

/** How many of a row's members are named before "and N more". Same
 *  discipline as the index's own cap: name a few, count the rest. */
export const LINK_NAME_CAP = 4

export interface LinkReadArgs {
  module: ModuleDef
  entities: Record<string, EntityDef>
  views: Record<string, ViewDef>
  rules: Record<string, RuleDef>
  constraints: readonly ConstraintDef[]
  /** the sentence surface's own column index — the same one the rules
   *  panel resolves scope through, so the two cannot disagree */
  conceptIndex: ReadonlyMap<string, ColumnConcept>
  quotes: readonly QuoteDef[]
  roles: readonly RoleDef[]
  /** the tenth verb's state, which lives outside `ModuleDef` */
  configures: boolean
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/**
 * Everything attached to this module, in the order an admin asks
 * about it: what it is made of, what it opens onto, what goes with its
 * things, what governs them, what has been sold, and who may act.
 */
export function linkedThings(args: LinkReadArgs): LinkedThing[] {
  const { module, entities, views, rules, constraints, conceptIndex, quotes, roles } = args

  const tables = moduleTables(module, entities)
  const related = relatedTables(module, entities)
  const view = module.viewId ? views[module.viewId] : undefined
  const blocks = view?.blocks ?? []

  const limits = constraintsFor(constraints, module, conceptIndex)
  const flows = flowRulesFor(Object.values(rules), module)
  const seeds = workbookRulesFor(moduleKinds(tables))
  const governing = limits.length + flows.length + seeds.length

  const mineTables = new Set(module.tableIds)
  const raised = quotes.filter((q) => mineTables.has(q.rootTableId))

  const granted = module.access ?? []
  const namedRoles = granted
    .map((a) => roles.find((r) => r.id === a.roleId)?.name)
    .filter((n): n is string => n !== undefined)

  const out: LinkedThing[] = [
    {
      key: 'tables',
      name: plural(tables.length, 'table', 'tables'),
      count: tables.length,
      says: 'The price files this place is about. The first one is the primary.',
      home: 'settings',
      where: 'Change which tables, and their order, in “What this place lists” above.',
      names: tables.map((t) => t.name),
    },
    {
      key: 'detail',
      name: plural(blocks.length, 'heading', 'headings'),
      count: blocks.length,
      says: view
        ? `Opening one item shows ${view.name}, and these are the headings on it.`
        : 'This module has no item page, so its list does not open onto anything.',
      /* THE ONE ROW THAT CAN HONESTLY SAY "NOT YET". A module with no
         item page has nothing to reorder and no control anywhere in
         the app that mints one after the fact — so it is shown, and
         it says so, rather than being left off a list of what this
         place reaches. */
      home: view ? 'settings' : 'not-yet',
      where: view
        ? 'Reorder the headings and choose their columns in “What one item shows” above.'
        : 'An item page is minted when a module is made. Giving one to a module that has none is not built yet — nothing in the app does it today.',
      names: blocks
        .map((b) => entities[b.tableId]?.name)
        .filter((n): n is string => n !== undefined),
    },
    {
      key: 'related',
      name: plural(related.length, 'table it reaches', 'tables it reaches'),
      count: related.length,
      says:
        'Tables joined to the things in here — what goes with them. A join is a table on the sheet like any other.',
      home: 'elsewhere',
      where:
        'Which pairs are approved is ticked on an item’s own page; the join table itself lives on the sheet.',
      names: related.map((r) => `${r.name} · on ${r.on} of ${r.of}`),
    },
    {
      key: 'rules',
      name: plural(governing, 'rule', 'rules'),
      count: governing,
      says:
        'Limits every row here must keep, the derivations that walk these tables, and what the price file itself states.',
      home: args.configures ? 'settings' : 'elsewhere',
      where: args.configures
        ? 'Read and switch them in “The rules it goes by” above.'
        : 'Switch “Set rules” on in “What may be done here” to read and change them from this module. They are also on Business rules and Fitment.',
      names: [
        ...limits.map((c) => c.because),
        ...flows.map((f) => f.rule.name),
        ...seeds.map((s) => s.seed.statement),
      ],
    },
    {
      key: 'quotes',
      name: plural(raised.length, 'quote raised here', 'quotes raised here'),
      count: raised.length,
      says:
        'Documents written against a row in this module. A quote prints what it froze, so it never moves when the sheet does.',
      home: 'elsewhere',
      where: 'Quotes are opened and edited from Quotes on the bar.',
      names: raised
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((q) => `${q.reference} · ${q.subjectLabel}`),
    },
    {
      key: 'access',
      name: plural(granted.length, 'role with access', 'roles with access'),
      count: granted.length,
      says: isUnrestricted(module)
        ? 'Nobody has been given access, so this module is open to everyone.'
        : 'The jobs that may act in here, and what each of them may do.',
      home: 'settings',
      where: 'Add and change them in “Who may do what” above.',
      names: namedRoles,
    },
  ]

  return out
}

/** The names to print, and how many were left off. */
export function namedFew(thing: LinkedThing): { shown: string[]; more: number } {
  const shown = thing.names.slice(0, LINK_NAME_CAP)
  return { shown, more: Math.max(0, thing.names.length - shown.length) }
}
