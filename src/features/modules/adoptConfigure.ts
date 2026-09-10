/* ============================================================
   THE TENTH VERB COMING HOME.

   `configure` — "Set rules" — spent a release outside
   `ModuleCapability`, in a browser-local registry keyed
   `helmlogic.moduleRules.v1`. `ruleCapability.ts` said why (the model
   file was another hand's that session), wrote down the exact two
   lines the contract needed, and named the cost out loud: **the flag
   was browser-local**, so exporting a sheet and opening it elsewhere
   brought the module and lost this one switch.

   The contract carries it now, and this is the crossing.

   THE SAME SHAPE AS `adoptSlugKey`, and for the same reason: a
   migration that can see both sides at once, run at boot, idempotent
   by construction because it takes the old record away. A dealer who
   switched Set rules on last week keeps it on, and it travels in
   their next export like the other nine.

   IT WRITES THROUGH THE STORE, NOT AROUND IT. `updateModule` is what
   every other capability change goes through, so the switch that
   arrives by migration and the switch a person moves by hand leave
   the same trace — and the sheet is saved by the same seam rather
   than by a second one nobody would think to look at.

   NOTHING IS INVENTED. Only ids the registry actually held, only
   modules still on the sheet, and only where the verb is not already
   there. A module the registry remembers but the sheet has lost is
   dropped with the key.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { nextCapabilities } from './designer'

/** The key the registry wrote, versioned as it was. */
const OLD_KEY = 'helmlogic.moduleRules.v1'

/** Module ids the old registry had switched on, or `[]` — for a
 *  browser that never had one, a storage that refuses to read, or a
 *  record that is not the shape it claims. */
function heldOn(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(OLD_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    /* corrupt storage is not worth a blank screen, and a migration
       that cannot read is a migration with nothing to do */
    return []
  }
}

/**
 * Move the browser-local switch onto the module itself.
 *
 * @returns how many modules gained the verb — 0 on every run after
 *   the first, and 0 on a browser that never carried the registry.
 */
export function adoptConfigureVerb(): number {
  const ids = heldOn()
  if (ids.length === 0) return 0

  const store = useProjectStore.getState()
  let moved = 0
  for (const id of ids) {
    const module = store.modules[id]
    if (!module) continue
    if (module.capabilities.includes('configure')) continue
    store.updateModule(id, {
      capabilities: nextCapabilities(module.capabilities, 'configure', true),
    })
    moved += 1
  }

  /* THE KEY GOES WHETHER OR NOT ANYTHING MOVED. That is what makes
     this run once: a module the registry named and the sheet no
     longer has is not coming back, and leaving the record would make
     every later boot re-ask a question with the same answer. */
  try {
    window.localStorage.removeItem(OLD_KEY)
  } catch {
    /* a storage that refuses to delete leaves the record; the guards
       above make a second run a no-op anyway */
  }
  return moved
}
