/* ============================================================
   THE PLACES THIS PERSON MAY ACTUALLY REACH.

   MODULE_SYSTEM §5 was written when capabilities were module-wide —
   "everyone using this browser sees the same module with the same
   verbs" — and that stopped being true when the access grid landed.
   `mayDo(module, roleId, verb)` decides the verbs INSIDE a place, and
   `rowSearch.ts`'s `withinReach` already drops a table under a place
   this job may not browse, so the ⌘K palette has been honest about it
   for a while.

   THE LISTS WERE NOT. Home's doors, "What we sell", the modules
   screen and the count beside Modules in the rail all read
   `s.modules` raw, so a person the grid shut out of Boats saw Boats
   on the front page, pressed it, and arrived somewhere the search had
   already told them did not exist. A palette that disagrees with the
   app is a bug in one direction; this was the same bug in the other.

   SO THERE IS ONE FILTER AND EVERY LIST GOES THROUGH IT. Same verb as
   the palette — `browse`, whose sentence is "see everything in it",
   which is exactly what pressing a door does. Same reading of a place
   with no access rows: ABSENT MEANS NOBODY HAS DECIDED, so it is open
   to everyone, which is what `access.ts` argues and why the seeded
   file — 9 places, none restricted — loses nothing at all to this.

   IT IS NOT A SECOND OPINION. `mayDo` is the only judgement here;
   this file adds no rule, it only asks the existing one of every
   place before a list is drawn.

   THE SAME OBJECT COMES BACK WHEN NOTHING IS HIDDEN, deliberately:
   the common case allocates nothing, and every `useMemo` keyed on the
   module map downstream — `usePlaces`, the rail's count — keeps
   bailing out exactly as it did before.
   ============================================================ */

import { useMemo } from 'react'
import type { ModuleDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { useSessionRoleId } from '@/features/auth'
import { mayDo } from './access'

/**
 * The places a job may browse. `roleId` null is "nobody in
 * particular", which `access.ts` answers honestly: a RESTRICTED place
 * is shut to them, an unrestricted one is open.
 */
export function browsableModules(
  modules: Record<string, ModuleDef>,
  roleId: string | null,
): Record<string, ModuleDef> {
  let shut = 0
  for (const module of Object.values(modules)) {
    if (!mayDo(module, roleId, 'browse')) shut += 1
  }
  if (shut === 0) return modules

  const out: Record<string, ModuleDef> = {}
  for (const [id, module] of Object.entries(modules)) {
    if (mayDo(module, roleId, 'browse')) out[id] = module
  }
  return out
}

/**
 * The same, for a component — the store read and the memo in one
 * place so no list site has to remember either.
 *
 * MEMOISED ON THE MAP AND THE JOB, which is the whole dependency: a
 * grant changes the map (access rows live on `ModuleDef`) and a
 * sign-in changes the job. Nothing else can change the answer.
 */
export function useBrowsableModules(): Record<string, ModuleDef> {
  const modules = useProjectStore((s) => s.modules)
  const roleId = useSessionRoleId()
  return useMemo(() => browsableModules(modules, roleId), [modules, roleId])
}
