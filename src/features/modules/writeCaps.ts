/* ============================================================
   THE THREE WRITE VERBS, MADE REAL ON THE CATALOGUE.

   THE FAULT THIS FIXES, NAMED AND MEASURED. `add`, `edit` and
   `delete` have been in `MODULE_CAPABILITIES` since the module
   system landed, they are three switches in the designer and three
   columns in the access grid — and a grep of `src/features/modules/
   *.tsx` for any of the three returned NOTHING outside tests.
   `ModuleIndex` read `browse`, `search` and `open` and stopped.

   So an administrator could switch `edit` OFF for Boats, watch the
   switch move, and change nothing: there was no edit affordance
   anywhere for the switch to take away. A capability switch that
   changes nothing is worse than no switch, because it is the app
   telling somebody they have restricted a thing they have not. That
   is a safety claim, and it is the one class of lie this project's
   tenth rule exists to stop.

   WHAT THIS FILE IS. The catalogue's answer to "may this be done
   here, and if not, why not" — pure, so it can be tested without a
   screen, and shared, so the button, the refusal sentence and the
   note beside the switch are built from ONE reading rather than
   three opinions that drift.

   FOUR OUTCOMES PER VERB, NOT TWO. The middle two are the whole
   point:

     off         the module does not offer the verb at all. NOTHING
                 is drawn, and nothing is said — a catalogue that
                 cannot be written to is the normal state of every
                 module ever made (the contract's own
                 `DEFAULT_CAPABILITIES` is browse/search/open) and
                 three apologies at the top of every screen would be
                 noise where a person is trying to read a price list.
     withheld    the module offers it and THIS PERSON is not granted
                 it. That is not the normal state, it is a decision an
                 administrator made about a job, so it IS said — see
                 `withheldSay` and the note on it.
     on          the affordance is drawn and it works.
     on, blocked the verb is granted and the act still cannot be
                 performed — the tables went off the sheet, or nothing
                 here names its rows in a column a person can type
                 into. THAT is said, in a sentence, in the place the
                 act would have been (rule 10), because a switch that
                 is on and does nothing is the same lie in the other
                 direction.

   WHY `roleId` IS NOW A PARAMETER, and what it cost to leave it out.
   This file shipped role-free for one session and said so in this
   header: `mayDo` was handed `roleId === null` in every real session,
   so consuming it looked like it would take the write affordances
   away from everybody the moment an admin granted one role anything.

   `docs/plan/DECISIONS.md` §2 settled that the other way, and the
   objection turns out to be answered by `mayDo` itself rather than
   traded against: `isUnrestricted` is true for a module with no
   access rows AT ALL — which is every module in the real seed and
   every module ever made before an admin ticks a box — and an
   unrestricted module answers TRUE for any `roleId`, null included.
   So nothing moves until somebody restricts a place, and the instant
   they do, the grid means what it says. That was the whole complaint
   in DECISIONS §2: "it tells an administrator they have restricted
   something they have not — a safety claim the app does not honour."

   And the case the old header actually feared — a restricted module
   and a session with no job — is not silent here. It is `withheld`,
   and it carries a sentence naming who may and where that is set,
   which is rule 10 rather than a control that quietly vanished.

   MODULE_SYSTEM §5 LOSES, and DECISIONS §2 records that too: it says
   "Capabilities are module-wide. Everyone using this browser sees the
   same module with the same verbs." They are not, any more. The
   module still declares the ceiling — access can never exceed it, and
   `mayDo` intersects — but who is standing here decides the rest.
   ============================================================ */

import {
  displayFieldOf,
  isRetired,
  type EntityDef,
  type FieldDef,
  type ModuleDef,
} from '@/types/model'
import { leafNoun } from '@/features/table/grouping'
import { capabilityLabel, mayDo } from './access'

/** The three verbs that WRITE a row. `relate`, `quote`, `export` and
 *  `configure` write other things and are answered elsewhere. */
export type WriteVerb = 'add' | 'edit' | 'delete'

export interface WriteStance {
  /** may be done by whoever is standing here — the module offers the
   *  verb AND this role holds it. False = draw nothing; whether
   *  anything is SAID is `CatalogWrites.withheld`, not this. */
  on: boolean
  /**
   * Why the act cannot be performed even though the switch IS on, in
   * one sentence, naming the fix. Absent = it can be performed.
   *
   * This is `ConstraintDef.because` applied to a capability, the same
   * shape `capabilityStates` already uses for `quote` and `configure`
   * — the reason written at the moment of the decision, never
   * reconstructed afterwards as "unavailable".
   */
  blocked?: string
}

export interface CatalogWrites {
  add: WriteStance
  edit: WriteStance
  delete: WriteStance
  /**
   * THE MASTER TABLE — where a new one goes. The module's primary
   * table (`tableIds[0]`, the contract's own word for it) when that
   * table is still live, and the first live table otherwise, because
   * a module whose primary went to history still has somewhere to put
   * a boat — and the button NAMES the table either way.
   *
   * Absent when nothing here is live, which is what `add.blocked` is
   * then about.
   */
  into?: EntityDef
  /**
   * PER TABLE, THE COLUMN A RENAME TYPES INTO. A catalogue face draws
   * one editable fact — the item's own name — so a table whose name
   * is a formula, a figure or a picked-from-a-list value is not
   * renameable HERE, and its faces offer nothing rather than offering
   * a box that would write an off-list value into a select.
   *
   * Keyed by table id. Absent from the map = that table's faces carry
   * no rename.
   */
  renames: Map<string, FieldDef>
  /**
   * Tables drawn here whose name cannot be typed, by name — for the
   * sentence that says so when SOME can and some cannot. Empty when
   * none can, because the page-wide refusal is then the sentence and
   * two sentences about one fact is how a person starts wondering
   * whether they are two facts (`accessSay.ts` learned this once).
   */
  unnameable: string[]
  /**
   * THE VERBS THIS PLACE OFFERS AND THIS PERSON IS NOT GRANTED, in the
   * contract's order.
   *
   * A LIST AND NOT A SENTENCE PER VERB, for the reason `accessSay.ts`
   * was written down: an administrator who keeps all three writes to
   * one job would otherwise get three apologies stacked at the top of
   * a price list, and a person reading three sentences starts working
   * out whether they are three faults. `withheldSay` turns the list
   * into one sentence.
   *
   * Empty is the ordinary case — it is empty for every unrestricted
   * module, which is every module until an admin ticks a box.
   */
  withheld: WriteVerb[]
}

/**
 * The column a catalogue face may type into for this table, or
 * undefined.
 *
 * TEXT ONLY, AND THE RESTRICTION IS THE POINT. `displayFieldOf` falls
 * back to "the first column that is not a formula", so on a table
 * that names nothing it can hand back a figure, a date, a reference
 * or a select. Typing a free string into any of those is not an edit,
 * it is corruption with a friendly face: a select would gain an
 * option nobody put on the list, a reference would stop pointing at a
 * row. The sheet is where those columns change, and it has the
 * editors for them.
 */
export function renameFieldOf(entity: EntityDef): FieldDef | undefined {
  const f = displayFieldOf(entity)
  return f && f.type === 'text' ? f : undefined
}

/** `a` or `an`, for a noun read off somebody's own column heading. */
export const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a')

/**
 * WHAT A CATALOGUE MAY DO TO ITS OWN ROWS, and what it must say when
 * it may not.
 *
 * @param module the module AS THE PAGE IS STANDING IN IT — already
 *   narrowed by `moduleAt`, so a person at Highfield adds to Highfield
 *   and not to whatever `tableIds[0]` happens to be across the whole
 *   of Boats.
 * @param tables every table the module names, retired ones included —
 *   so a refusal can tell "they went off the sheet" apart from "they
 *   are history", which are different facts about somebody's data and
 *   have different fixes.
 * @param listed the tables this catalogue actually draws: `tables`
 *   minus the retired ones.
 * @param roleId THE JOB THE PERSON STANDING HERE HOLDS, or null for
 *   nobody in particular. REQUIRED, and deliberately not defaulted:
 *   a caller who forgets identity would silently get whichever answer
 *   the default happened to be, and this is the parameter that decides
 *   whether somebody may write to a price file. A type error is the
 *   cheapest place to find that out.
 */
export function readWrites(
  module: ModuleDef,
  tables: readonly EntityDef[],
  listed: readonly EntityDef[],
  roleId: string | null,
): CatalogWrites {
  /* THE ONE QUESTION, ASKED THE ONE WAY. `mayDo` intersects the grant
     with the module's own capability list, so this cannot answer true
     beyond what the module offers however the grid was filled in —
     and it answers true for ANY role, null included, in a module
     nobody has restricted. See the header for why that is what makes
     consuming it safe. */
  const granted = (v: WriteVerb): boolean => mayDo(module, roleId, v)

  /* OFFERED BUT NOT HELD — the case that has to be told apart from
     "off", because the two look identical to a person (no button) and
     have opposite explanations: one is the normal state of every
     catalogue, the other is a decision somebody made about their job. */
  const withheld = (['add', 'edit', 'delete'] as const).filter(
    (v) => module.capabilities.includes(v) && !granted(v),
  )

  /* WHY THERE IS NOTHING TO WRITE TO, when there is nothing. Three
     different facts with three different fixes, and a catalogue that
     printed one sentence for all of them would send somebody looking
     for a setting that is not the problem. */
  const nowhere: string | undefined =
    listed.length > 0
      ? undefined
      : tables.length === 0
        ? `The tables ${module.name} was made from are no longer on the sheet, so there is nothing here to write to.`
        : tables.every((t) => isRetired(t))
          ? `Every table in ${module.name} is history rather than stock, so nothing new is written to it. Take one off history on the sheet and this works.`
          : `${module.name} draws no table here, so there is nothing to write to.`

  const into = listed.find((t) => t.id === module.tableIds[0]) ?? listed[0]

  const renames = new Map<string, FieldDef>()
  const unnameable: string[] = []
  for (const t of listed) {
    const f = renameFieldOf(t)
    if (f) renames.set(t.id, f)
    else unnameable.push(t.name)
  }

  /* EDITING IS REFUSED WHEN NO NAME CAN BE TYPED, and the sentence
     names the column it looked at rather than saying "unavailable".
     The fix is a column on a table, exactly like the `quote` refusal
     next door, so the sentence sends a person to the sheet. */
  const noName: string | undefined =
    listed.length === 0 || renames.size > 0
      ? undefined
      : `Editing is on for ${module.name}, but ${
          listed.length === 1
            ? `${listed[0].name} does not name its rows`
            : 'no table here names its rows'
        } in a column that can be typed into — a formula, a figure or a picked-from-a-list value is changed on the sheet, where it has the right editor.`

  const stance = (verb: WriteVerb, why?: string): WriteStance => {
    if (!granted(verb)) return { on: false }
    const blocked = nowhere ?? why
    return blocked === undefined ? { on: true } : { on: true, blocked }
  }

  return {
    add: stance('add'),
    edit: stance('edit', noName),
    delete: stance('delete'),
    ...(into ? { into } : {}),
    renames,
    unnameable: renames.size > 0 ? unnameable : [],
    withheld: [...withheld],
  }
}

/* ---------------------------------------------------------- */
/* The words                                                   */
/* ---------------------------------------------------------- */

/** "add", "add and edit", "add, edit and remove". No serial comma,
 *  which is the house pattern — `curation.ts`, `dependents.ts`,
 *  `start.ts` and five others all join a list this way. */
function andList(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/**
 * WHAT THIS PLACE OFFERS AND THIS PERSON MAY NOT DO, in one sentence.
 *
 * ONE SENTENCE FOR ALL THREE VERBS, deliberately. `accessSay.ts`
 * records the lesson in full: two wordings of one fact is how a person
 * starts wondering whether they are two facts, and three of them at
 * the top of a price list is worse again. The verbs are named in the
 * CONTRACT'S OWN LABELS (`capabilityLabel`) rather than in words
 * invented here, so the sentence, the designer's switch and the access
 * grid's column heading cannot drift into three names for one verb.
 *
 * IT NAMES WHERE THE DECISION LIVES. "A thing that cannot be done says
 * why, where it is" (rule 10) is only half an answer if the reason has
 * no fix attached, and the fix for this one is not on this screen —
 * it is a tick in the access grid, which is on the Access & roles
 * screen and on the module's own set-up. So the sentence sends a
 * person there, and it does not pretend they can do it themselves:
 * granting is an administrator's act.
 *
 * @param roleId null is "no job is signed in here", which is a
 *   different fact from "your job does not have it" and has a
 *   different fix — signing in, rather than being granted something.
 */
export function withheldSay(
  moduleName: string,
  verbs: readonly WriteVerb[],
  roleId: string | null,
): string {
  const list = andList(verbs.map((v) => capabilityLabel(v).toLowerCase()))
  const head = `In ${moduleName}, ${list} ${verbs.length === 1 ? 'is' : 'are'} kept to named jobs`
  return roleId === null
    ? `${head}, and no job is signed in here. An administrator says which jobs may, under Access & roles.`
    : `${head}, and the job you are signed in as is not one of them. An administrator grants it under Access & roles.`
}

/**
 * WHAT THE NEW BUTTON SAYS, in the dealer's own noun.
 *
 * `leafNoun` reads the word for one row off the table's own naming
 * column, so Highfield's button says "Add a variant" and a pharmacy's
 * says "Add a line" without this file knowing either trade. The table
 * is named as well whenever the catalogue draws more than one,
 * because a button that quietly picks one of seven brands is exactly
 * the side effect DESIGN_PRINCIPLES §7 exists to stop.
 */
export function addLabel(into: EntityDef, manyTables: boolean): string {
  const one = leafNoun(into).one
  const head = `Add ${article(one)} ${one}`
  return manyTables ? `${head} to ${into.name}` : head
}

/** The same act said in full, for a screen reader and for the title —
 *  it always names the table, because "Add a variant" on its own does
 *  not say where the variant lands. */
export function addSays(into: EntityDef): string {
  /* THE ARTICLE BELONGS TO THE WORD THAT FOLLOWS IT, and here that
     word is "empty", not the dealer's noun. `article(one)` put "Add a
     empty variant" on screen and a test caught it. `addLabel` above
     carries no adjective, so it still reads the noun. */
  return `Add an empty ${leafNoun(into).one} to ${into.name}`
}

/**
 * WHAT WAS JUST DONE, for the toast that carries UNDO.
 *
 * `opened` is whether the app went to the new row, and it changes the
 * sentence rather than being left out of it: an empty row nobody was
 * taken to is somewhere a person has to be TOLD about, or the button
 * reads as having done nothing. A blank row sorts to the end of its
 * table, carries no banner value, and is therefore in neither the
 * drawer that was open nor the search that was typed.
 */
export function addedSay(into: EntityDef, opened: boolean): string {
  const one = leafNoun(into).one
  return opened
    ? `An empty ${one} was added to ${into.name}.`
    : `An empty ${one} was added to ${into.name} — opening one is off here, so fill it in on the sheet.`
}

/** What was taken out, for the toast that carries UNDO. It names the
 *  row: "1 row deleted" is the sheet's language, and this is a
 *  catalogue of boats. */
export function removedSay(label: string, into: EntityDef): string {
  return `${label} was taken out of ${into.name}.`
}

/** What a rename wrote, for the toast that carries UNDO. Both names,
 *  because the fact a person checks is that the old one is recoverable
 *  and the button beside the sentence is what recovers it. */
export function renamedSay(from: string, to: string): string {
  return `${from} is now ${to}.`
}
