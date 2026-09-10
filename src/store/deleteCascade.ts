/* ============================================================
   WHAT ELSE GOES WHEN A TABLE GOES

   MODULE_SYSTEM §2, defect 2: "`deleteEntity` does not cascade into
   views. Delete a table and its module would point at nothing."

   Verified before writing this. `deleteEntity` cascaded into four
   things — the other tables' reference fields, the rows, the rules
   rooted at it, and the selection — and into neither views nor
   modules. So a dealer who deleted `Boats` kept a Boats page whose
   `rootTableId` named a table that no longer existed, and a module
   whose `tableIds[0]` did the same. Nothing crashed; the screens
   simply drew nothing and said nothing about why, which is worse.

   ── THE FOUR DECISIONS, AND WHY EACH IS WHAT IT IS ───────────

   A PAGE WHOSE ROOT IS GONE IS DELETED. `ViewDef.rootTableId` is
   "the table whose rows this view is FOR" — it is not a reference the
   page can lose and carry on; it is what the page is. There is no
   honest state for a page of nothing.

   A BLOCK WHOSE TABLE IS GONE IS DROPPED, and the page survives. A
   block is one related table among several — "accessories under
   motors" — so losing one costs the page a section, not its subject.
   Blocks nest to depth 3, so the drop recurses.

   A MODULE LOSES THE TABLE FROM `tableIds` and survives if any
   remain, INCLUDING when the one it loses was `[0]`, the primary.
   The next table becomes primary. A module is "the tables it is
   about"; being about fewer of them is a smaller module, not a
   broken one.

   A MODULE WITH NO TABLES LEFT IS DELETED, for the same reason the
   page is: model.ts calls a module "the TABLES it is about, the
   VERBS a person may use in it, how its list is DRAWN, and where it
   sits". Strip the tables and there is no place to stand.

   AND `viewId` IS CLEARED RATHER THAN THE MODULE DELETED when the
   page it pointed at has gone. The contract already blesses that
   state in as many words: "Absent means the module lists but does
   not open — which is a legitimate module, not a broken one." So
   this is the one dangling pointer with a defined resting place, and
   we put it there instead of inventing a rule.

   ── WHY IT IS A PURE FUNCTION AND NOT FOUR LINES IN THE STORE ──

   Because the interesting part is the ARITHMETIC — what survived and
   what did not — and DESIGN_PRINCIPLES §7 wants that arithmetic on
   screen before the act: "A confirm states its blast radius,
   computed." A store action that mutates and returns void cannot be
   asked "what would this cost?" without doing it. This can, and the
   dialog and the deletion then read the same function, so the
   preview and the act cannot disagree — the discipline
   `levelConflict` already keeps for the price rung.
   ============================================================ */

import type { ModuleDef, ViewBlock, ViewDef } from '@/types/model'

/** What a delete would leave behind, and what it would take with it. */
export interface DeleteCascade {
  views: Record<string, ViewDef>
  modules: Record<string, ModuleDef>
  /** named, for the sentence a confirm has to say */
  deletedViews: string[]
  deletedModules: string[]
  /** modules that survive with fewer tables than they had */
  narrowedModules: string[]
  /** modules that keep their place but stop opening, because the page
   *  they opened has gone */
  closedModules: string[]
  /** blocks dropped out of pages that survive */
  droppedBlocks: number
}

/** Drop every block for `tableId`, at any depth. Returns the SAME
 *  array when nothing changed, so an untouched page keeps its
 *  identity and React is not handed a new object to diff. */
function pruneBlocks(
  blocks: readonly ViewBlock[],
  tableId: string,
  count: { n: number },
): ViewBlock[] {
  let changed = false
  const kept: ViewBlock[] = []
  for (const b of blocks) {
    if (b.tableId === tableId) {
      count.n += 1
      changed = true
      continue
    }
    const children = b.children ? pruneBlocks(b.children, tableId, count) : undefined
    /* A JOIN TABLE IS ALSO A TABLE and can also be deleted. A block
       whose `joinTableId` has gone is not curated any more; it is a
       block over `tableId` with no pairs, which is the "show
       everything" state the contract already allows. Losing the join
       is not losing the block. */
    const lostJoin = b.joinTableId === tableId
    if (children === b.children && !lostJoin) {
      kept.push(b)
      continue
    }
    changed = true
    const next: ViewBlock = { ...b }
    if (lostJoin) delete next.joinTableId
    if (children) next.children = children
    kept.push(next)
  }
  return changed ? kept : (blocks as ViewBlock[])
}

/**
 * WHAT DELETING `tableId` DOES TO THE PAGES AND MODULES.
 *
 * Pure: handed the two records, returns the two records it would
 * leave plus the counts a sentence needs. Nothing here reads the
 * store, so the confirm and the deletion can both call it.
 */
export function cascadeOfDelete(
  tableId: string,
  views: Readonly<Record<string, ViewDef>>,
  modules: Readonly<Record<string, ModuleDef>>,
): DeleteCascade {
  const nextViews: Record<string, ViewDef> = {}
  const deletedViews: string[] = []
  const count = { n: 0 }

  for (const [vid, v] of Object.entries(views)) {
    if (v.rootTableId === tableId) {
      deletedViews.push(v.name)
      continue
    }
    const blocks = pruneBlocks(v.blocks, tableId, count)
    nextViews[vid] = blocks === v.blocks ? v : { ...v, blocks }
  }

  const nextModules: Record<string, ModuleDef> = {}
  const deletedModules: string[] = []
  const narrowedModules: string[] = []
  const closedModules: string[] = []

  for (const [mid, m] of Object.entries(modules)) {
    const tableIds = m.tableIds.filter((t) => t !== tableId)
    if (tableIds.length === 0) {
      deletedModules.push(m.name)
      continue
    }
    const narrowed = tableIds.length !== m.tableIds.length
    const orphanedView = m.viewId !== undefined && nextViews[m.viewId] === undefined
    if (!narrowed && !orphanedView) {
      nextModules[mid] = m
      continue
    }
    if (narrowed) narrowedModules.push(m.name)
    if (orphanedView) closedModules.push(m.name)
    const next: ModuleDef = { ...m, tableIds }
    if (orphanedView) delete next.viewId
    nextModules[mid] = next
  }

  return {
    views: nextViews,
    modules: nextModules,
    deletedViews,
    deletedModules,
    narrowedModules,
    closedModules,
    droppedBlocks: count.n,
  }
}

/**
 * THE BLAST RADIUS, AS A SENTENCE — §7, computed rather than warned.
 *
 * Returns '' when nothing beyond the table itself is touched, so a
 * caller can ask "is there anything to say" without counting fields.
 * One name is named; more than one is counted, because a confirm
 * that lists eleven page titles is a confirm nobody reads.
 */
export function cascadeSay(c: DeleteCascade): string {
  const parts: string[] = []

  const some = (names: readonly string[], one: (n: string) => string, many: (n: number) => string): void => {
    if (names.length === 0) return
    parts.push(names.length === 1 ? one(names[0]) : many(names.length))
  }

  some(c.deletedViews, (n) => `the page ${n}`, (n) => `${n} pages`)
  some(c.deletedModules, (n) => `the module ${n}`, (n) => `${n} modules`)
  some(
    c.narrowedModules,
    (n) => `a table from ${n}`,
    (n) => `a table from ${n} modules`,
  )
  some(
    c.closedModules,
    (n) => `the page ${n} opens`,
    (n) => `the pages ${n} modules open`,
  )
  if (c.droppedBlocks > 0) {
    parts.push(
      c.droppedBlocks === 1 ? 'one section of a page' : `${c.droppedBlocks} sections of pages`,
    )
  }

  if (parts.length === 0) return ''
  if (parts.length === 1) return `This also removes ${parts[0]}.`
  const last = parts[parts.length - 1]
  return `This also removes ${parts.slice(0, -1).join(', ')} and ${last}.`
}
