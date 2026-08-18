/* ============================================================
   THE TENTH VERB — held OUTSIDE the contract, on purpose, and with
   the exact line it wants written down so the day it lands is a
   deletion rather than a design.

   WHY IT IS NOT IN `MODULE_CAPABILITIES`. `ModuleCapability` is a
   closed union in `src/types/model.ts`, and that file is owned by
   another hand this session. So the verb this feature needs cannot
   be added to `ModuleDef.capabilities` without forking the model,
   which is the one thing `columns.ts` and `designer.ts` both say in
   their headers must never happen.

   THE EXACT ENTRY THE CONTRACT NEEDS — one line in the union, one
   line in the record, written here in that file's own voice so
   nobody has to re-invent the words:

       export type ModuleCapability =
         | …
         | 'relate'
         | 'configure'      // <- between 'relate' and 'quote'
         | 'quote'
         | 'export'

       configure: { label: 'Set rules', says: 'set what must always be true here' },

   It sits between `relate` and `quote` because the record's order IS
   the display order — the dashboard card prints the verbs as words in
   array order — and a person reads the three reads, then the three
   writes, then the three acts a manager does: say what goes with
   what, set what must always be true, raise a price.

   IT IS OFF BY DEFAULT and must stay off. `DEFAULT_CAPABILITIES` is
   `['browse','search','open']` — nothing that writes is on by
   default — and writing a business rule is the most consequential
   write in the product. So this registry stores only the modules
   somebody has deliberately switched ON, and absence means off.

   HOW IT IS STORED UNTIL THEN, and what changes when the contract
   grows it. Exactly the seam `constraintDefs.ts` already uses for
   the same reason: a module-level registry mirrored to
   localStorage, read through `useSyncExternalStore`. When
   `ModuleCapability` gains 'configure':

     1. delete this file,
     2. `capabilityStates` drops its third argument and reads
        `module.capabilities` like the other nine,
     3. `ModuleDesigner` routes the switch through `nextCapabilities`
        like the other nine.

   Nothing else in the feature knows this file exists — the designer
   and the index both read `capabilityStates`, which already speaks
   for all ten.

   WHAT THIS COSTS TODAY, said plainly rather than discovered later:
   the flag is BROWSER-LOCAL. `ProjectFile` carries
   `ModuleDef.capabilities` and cannot carry a verb the type does not
   have, so exporting a sheet and opening it elsewhere brings the
   module and loses this one switch. That is a consequence of not
   forking the model, and it is the right trade for one release.
   ============================================================ */

import { useSyncExternalStore } from 'react'

/** The key the contract will use. Written once, here, so the designer,
 *  the index and the tests all name the same string. */
export const RULE_CAPABILITY = 'configure' as const
export type RuleCapabilityKey = typeof RULE_CAPABILITY

/** The `MODULE_CAPABILITIES` entry, verbatim, in that record's voice
 *  ("say what goes with what", "raise a price for a customer"). The
 *  designer draws the switch from this, so the words on screen today
 *  are the words the contract will carry tomorrow. */
export const RULE_CAPABILITY_META: { label: string; says: string } = {
  label: 'Set rules',
  says: 'set what must always be true here',
}

/* ---------------------------------------------------------- */
/* The registry                                               */
/* ---------------------------------------------------------- */

const STORAGE_KEY = 'helmlogic.moduleRules.v1'

/** Module ids that have the verb switched ON. Absence is off, which is
 *  what makes the deliberate default free. */
let on = new Set<string>()

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function publish(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...on]))
    } catch {
      /* a full or blocked store must never break switching a verb */
    }
  }
  for (const listener of [...listeners]) listener()
}

function load(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    on = new Set(parsed.filter((v): v is string => typeof v === 'string'))
  } catch {
    /* corrupt storage is not worth a blank screen */
  }
}

load()

/* ---------------------------------------------------------- */
/* Reading and writing                                        */
/* ---------------------------------------------------------- */

/** Non-hook read, for anything outside React. */
export const moduleConfiguresRules = (moduleId: string): boolean => on.has(moduleId)

/** Does this module carry the rule-configuring verb? A boolean, so the
 *  store's snapshot identity is never a question. */
export function useModuleConfiguresRules(moduleId: string): boolean {
  const read = (): boolean => on.has(moduleId)
  return useSyncExternalStore(subscribe, read, read)
}

/** How many of these modules carry the verb.
 *
 *  INTERSECTED WITH THE MODULES THAT EXIST, never read off the
 *  registry's own size. Deleting a module does NOT drop its entry here,
 *  and must not: `deleteModule` goes through `mutate`, so it is
 *  undoable, and a switch thrown away on delete would come back off
 *  after an undo that restored everything else. The consequence is that
 *  this set can hold ids nothing points at, and any count taken from it
 *  has to say which modules it means. */
export const configuringCount = (moduleIds: readonly string[]): number => {
  let n = 0
  for (const id of moduleIds) if (on.has(id)) n += 1
  return n
}

/** The same count, live. A NUMBER, so the snapshot identity that
 *  `useSyncExternalStore` compares is a primitive and a list rebuilt
 *  each read can never loop it. */
export function useConfiguringCount(moduleIds: readonly string[]): number {
  const read = (): number => configuringCount(moduleIds)
  return useSyncExternalStore(subscribe, read, read)
}

/** Move the switch. A no-op write publishes nothing, so a re-render
 *  cannot loop through here. */
export function setModuleConfiguresRules(moduleId: string, wanted: boolean): void {
  if (on.has(moduleId) === wanted) return
  if (wanted) on.add(moduleId)
  else on.delete(moduleId)
  publish()
}

/** Used by a project reset and by tests. A module id is minted fresh
 *  by `createModule`, so a stale entry here is harmless — but a wiped
 *  project coming back with the last one's switches on is not. */
export function forgetModuleRuleCapabilities(): void {
  if (on.size === 0) return
  on = new Set()
  publish()
}
