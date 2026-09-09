/* ============================================================
   THE EXAMPLE DATA ON THIS SHEET, AND THE ONE CONTROL THAT
   TAKES IT OFF AGAIN.

   WHAT THIS IS FOR. The prepared set is not a fixture — it is
   Northside Marine's real Master Price File, 15,691 rows of a
   living business's costs and margins. A different dealership
   who loads it to look around has another company's catalogue
   on their sheet, and until now the only way to get it off was
   CLEAR SHEET: which also takes their business name, their
   industry, their own tables and every page they built, drops
   them back at onboarding, and cannot be undone (a project swap
   clears both history stacks — see useProjectStore's header).
   UX_PASS §4.2 asks for the other control: "One control removes
   all of it, states the count, and is undoable."

   IT IS UNDOABLE, WHICH IS WHY IT DOES NOT ASK. Rule 9 — an
   undoable act gets a toast with UNDO, never a dialog. CLEAR
   SHEET keeps its confirm because clearing genuinely cannot be
   got back; this cannot destroy anything a single press does not
   put straight back, so a confirm sheet here would be a full
   stop in the middle of somebody's work for no gain.

   ============================================================
   HOW A TABLE IS KNOWN TO BE THE EXAMPLE'S, AND WHY IT IS NOT A
   GUESS.

   `EntityDef` carries no provenance field and cannot be given
   one from here (`src/types/model.ts` is not this lane's to
   edit), so the question has to be answered out of facts the
   sheet already holds. There are two, and together they are
   exact rather than inferential:

   1. THE SHEET WAS SEEDED, AND THE RECORD SAYS SO. `@/demos/
      seedStamp` is written at the one moment provenance is known
      for certain — `loadNorthsideProject` stamps this browser
      with the fingerprint of the set it has just written — and
      it is forgotten by every act that puts a different sheet
      here: `applyReplace` (io/apply.ts:149), a blank sheet and
      CLEAR SHEET all call `forgetSeedStamp`. So a stamp with a
      `seed` on it means: what is on this sheet arrived from the
      prepared set.

   2. THE SET ARRIVED IN ONE INSTANT, AND NOTHING ON THE SHEET IS
      OLDER. `buildNorthsideProject` takes `const stamp = nowIso()`
      ONCE and writes it as the `createdAt` of every table it
      mints (northside.ts:22762, :22806); `replaceProject` puts
      them on the sheet exactly as handed, having first emptied
      it. Every other path that makes a table — `createTable`,
      `createEntity`, `importTable` — calls `nowIso()` per table,
      after the seed, so a table a person makes is strictly later
      and can never carry the seed's instant.

   The example's tables are therefore the tables holding the
   EARLIEST creation instant on the sheet, and reading it that way
   cannot take a table somebody made themselves: theirs are all
   later by construction. It is the safe direction of the two —
   the failure this can have is leaving a table behind, never
   deleting one that was not offered.

   AND ONE FLOOR, WHICH IS NOT ARBITRARY. `DRIFT_GATE` is the
   demos module's own "a sheet with fewer tables than this cannot
   be the set" (seedChunk.ts:88), used there to decide whether it
   is worth fetching the price file to ask. It is reused as the
   floor on the cohort: below eight tables sharing one instant
   there is no prepared set on this sheet to remove, whatever the
   stamp says, and the control is not drawn. That closes the one
   path where the earliest instant could be somebody else's — a
   person who deleted every example table by hand and then made
   their own — because tables made one at a time never share an
   instant, and so never form a cohort at all.

   THE RESIDUE, SAID OUT LOUD. `applyMerge` does not forget the
   stamp (correctly: a merge does not replace the sheet), so a
   file merged in from ANOTHER browser that was seeded carries
   that browser's seed instant. If it is the earlier of the two,
   the cohort names those tables instead of this browser's. Both
   are the same example data, the toast states the count before
   anything else is said, and one press puts it back — so the
   residue is a different set of example tables going, not a
   dealer's own work.

   ============================================================
   WHAT GOES WITH THE TABLES.

   `deleteEntity` already cascades: reference columns pointing at
   a removed table are dropped from the tables that survive, and
   rules rooted in one go with it. Pages and modules are NOT
   cascaded by the store (a known defect — BACKLOG #12), and this
   control must not leave the dashboard pointing at nothing, so it
   sweeps them itself: a page whose root table is the example's,
   and a module every one of whose tables is the example's. A
   module or page the person built over their OWN tables is left
   exactly where it is.

   ZONES ARE LEFT ALONE, deliberately. The set ships none
   (`NorthsideProject.groups` is `[]`, northside.ts:23022), so a
   zone on the sheet is a frame somebody drew, and a frame is
   theirs whether or not the tables inside it were.

   ONE PRESS IS ONE STEP BACK. Everything below happens in one
   turn of the event loop, and `deleteEntity` runs FIRST — it is
   the only one of these that calls `record()`, and `record`
   snapshots the whole data slice before the first mutation of a
   burst. Pages and modules are in that slice, so they come back
   with the tables even though `deleteView` and `deleteModule`
   record nothing of their own. Calling them first would snapshot
   a sheet whose pages had already gone.

   THE STAMP IS NOT FORGOTTEN. It records where the sheet came
   from, and after this the sheet still came from there — the
   tables were taken off it afterwards. Nothing misreads it:
   `northsideDrift` recognises the set by table NAME and returns
   null once the names are gone (RECOGNISE_FLOOR of eight), so
   the freshness notice cannot fire over a sheet this has cleaned.
   Leaving it is also what keeps UNDO honest — put the tables
   back and the record is still true, where forgetting it would
   have left an undo that restored the data and not the provenance.
   ============================================================ */

import type { EntityDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
import { readSeedStamp } from '@/demos/seedStamp'
/* the demos module's own floor, imported from the chunk boundary
   rather than from `@/demos` so nothing here pulls the price file
   or the picture registry in behind it */
import { DRIFT_GATE } from '@/demos/seedChunk'

/** What the prepared set left on this sheet, counted off the sheet
 *  itself rather than off the set's own metadata — what is actually
 *  here is the fact worth stating. */
export interface ExampleOnSheet {
  /** the tables that came with the set, and are still here */
  tableIds: string[]
  tables: number
  rows: number
  /** pages that open onto one of those tables */
  pages: number
  /** dashboard places built entirely on them */
  modules: number
}

/**
 * The tables that arrived with the prepared set, by the two facts
 * above. Pure, so the rule can be tested without a browser.
 *
 * @param entities the sheet's tables
 * @param seeded   did this browser record a seeding? — `readSeedStamp`
 * @returns their ids, or `[]` when there is no example data here
 */
export function exampleTableIds(
  entities: Record<string, EntityDef>,
  seeded: boolean,
): string[] {
  if (!seeded) return []
  const all = Object.values(entities)
  if (all.length === 0) return []

  let earliest: string | null = null
  for (const e of all) {
    if (earliest === null || e.createdAt < earliest) earliest = e.createdAt
  }
  if (earliest === null) return []

  const cohort = all.filter((e) => e.createdAt === earliest).map((e) => e.id)
  /* tables a person makes arrive one at a time and never share an
     instant, so a cohort this small is not a prepared set */
  return cohort.length < DRIFT_GATE ? [] : cohort
}

/** What is on the sheet from the prepared set, or null when there is
 *  none of it — which is what a surface draws no control for. */
export function exampleOnSheet(): ExampleOnSheet | null {
  const s = useProjectStore.getState()
  const ids = exampleTableIds(s.entities, readSeedStamp()?.seed !== undefined)
  if (ids.length === 0) return null

  const set = new Set(ids)
  let rows = 0
  for (const id of ids) rows += s.rowsByEntity[id]?.length ?? 0

  const pages = Object.values(s.views).filter((v) => set.has(v.rootTableId))
  const pageIds = new Set(pages.map((v) => v.id))
  const modules = Object.values(s.modules).filter(
    (m) => m.tableIds.length > 0 && m.tableIds.every((id) => set.has(id)),
  )
  /* a module's own detail page goes with it even when its root table
     is somebody else's — it was minted for this module and nothing
     else opens it */
  for (const m of modules) if (m.viewId !== undefined) pageIds.add(m.viewId)

  return {
    tableIds: ids,
    tables: ids.length,
    rows,
    pages: pageIds.size,
    modules: modules.length,
  }
}

/* ------------------------------------------------------------ */
/* THE WORDS, ALL THREE OF THEM DECIDED HERE                     */
/*                                                               */
/* The control names a figure, its note names two more, and the  */
/* toast afterwards names the first two again. Written in one    */
/* place so the door and the report of it cannot disagree about  */
/* how much went — which is the mistake `startingPointWords`     */
/* exists to stop one door up, made twice.                       */
/* ------------------------------------------------------------ */

const n = (x: number): string => x.toLocaleString('en-AU')
const plural = (x: number, one: string, many: string): string =>
  `${n(x)} ${x === 1 ? one : many}`

/** UX_PASS §4.2's own sentence, on the control's face: a person should
 *  know how much a press takes before they make it. */
export function removeLabel(was: ExampleOnSheet): string {
  return `Remove the ${plural(was.tables, 'example table', 'example tables')}`
}

/** The rest of the blast radius, under the control. The dashboard
 *  clause is only said when there is one — "0 places" is noise in a
 *  sentence about what is at stake. */
export function exampleNote(was: ExampleOnSheet): string {
  const places =
    was.modules > 0
      ? `, and the ${plural(was.modules, 'place', 'places')} they hold up on the dashboard`
      : ''
  return `And the ${plural(was.rows, 'row', 'rows')} in them${places}. Tables you have made yourself stay.`
}

/** The sentence the toast says, so the control and the report of it
 *  cannot drift. Counted, never written. */
export function removedSentence(was: ExampleOnSheet): string {
  return `Removed ${plural(was.tables, 'example table', 'example tables')} and ${plural(
    was.rows,
    'row',
    'rows',
  )}.`
}

/**
 * Take the prepared set off the sheet, keeping the business, the
 * industry, and everything the person made themselves.
 *
 * Says what it did through the notes bus with UNDO on it — one press
 * puts every table, row, page and module back, because all of it is
 * one recorded step (see the header).
 *
 * @returns what went, or null when there was nothing to take.
 */
export function removeExampleData(): ExampleOnSheet | null {
  const was = exampleOnSheet()
  if (was === null) return null

  const s = useProjectStore.getState()
  const set = new Set(was.tableIds)

  /* FIRST, because it is the only one of these that opens a history
     burst, and the burst's snapshot is what UNDO gives back */
  for (const id of was.tableIds) s.deleteEntity(id)

  const pageIds = new Set(
    Object.values(useProjectStore.getState().views)
      .filter((v) => set.has(v.rootTableId))
      .map((v) => v.id),
  )
  for (const m of Object.values(useProjectStore.getState().modules)) {
    if (m.tableIds.length === 0 || !m.tableIds.every((id) => set.has(id))) continue
    if (m.viewId !== undefined) pageIds.add(m.viewId)
    s.deleteModule(m.id)
  }
  for (const id of pageIds) s.deleteView(id)

  sayUndoable(removedSentence(was))
  return was
}
