/* ============================================================
   THE MODULES YOU HAVE BEEN IN — the rail's only list.

   WHY THERE IS A LIST AT ALL, when the plan says the rail must
   not enumerate the modules. It must not enumerate FOURTEEN: that
   is the modules screen, and a fourteen-row menu is the thing
   phase two is removing. But a rail with four identical rows and
   no colour in it fails the other half of the brief — the kind
   hues live on modules, and a rail that never shows one is a rail
   with no colour by construction.

   So the rail carries the modules THIS PERSON HAS OPENED, newest
   first, capped at four. That is not a menu of the business; it is
   where somebody was ten minutes ago, which is the one list short
   enough to be worth the height it costs.

   WHAT IS REMEMBERED: an id, and nothing else. No timestamp a
   screen would then have to render as "3 minutes ago" and keep
   re-rendering, no rank, no count. The same shape and the same
   argument as `features/search/recent.ts`, which is this app's
   existing convention for exactly this.

   IT IS RESOLVED AT PAINT, NEVER TRUSTED. A remembered id is a
   guess about a project that has gone on changing — a module can
   be deleted, a whole file can be replaced from Import. So the
   rail looks every id up in the live store and draws only what is
   still there. A door to a module that no longer exists is worse
   than no door, because it makes the rail a liar about the one
   thing it is for.

   IT IS A STORE, NOT A POLL. The finder's recents are re-read on
   focus and pointer-down because nothing publishes them; this is
   written by the shell in the same process that draws the rail, so
   it publishes, and `useSyncExternalStore` means the rail updates
   on the frame the module opens rather than on the next time the
   window happens to take focus.

   EVERY READ AND WRITE IS GUARDED. Storage throws in a private
   window, throws when a quota is full, and returns another app's
   shape when a key collides. Every failure here ends in "no
   recents" and the rail draws exactly what it drew before this
   file existed.
   ============================================================ */

import { useSyncExternalStore } from 'react'

/** How many are kept. Four, because the rail's whole argument is
 *  that it is four doors tall — a fifth remembered module would
 *  make the list longer than the navigation above it. */
export const MODULE_RECENT_LIMIT = 4

/** Namespaced the way the rest of the app namespaces: feature, then
 *  what it is. Never a bare word another script could plausibly
 *  own. */
const KEY = 'helmlogic.rail.modules.v1'

const store = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    /* a browser set to block site data throws on ACCESS, not on
       read — which is why this is wrapped and not null-checked */
    return null
  }
}

/** Anything that is not an array of non-empty strings is discarded
 *  whole rather than repaired. A half-understood record is how one
 *  bad write becomes a permanent wrong row in the rail. */
function parse(raw: string | null): string[] {
  if (raw === null || raw === '') return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const out: string[] = []
    for (const item of data) {
      if (typeof item === 'string' && item !== '') out.push(item)
      if (out.length === MODULE_RECENT_LIMIT) break
    }
    return out
  } catch {
    return []
  }
}

/* THE SNAPSHOT IS CACHED, and it has to be. `useSyncExternalStore`
   compares snapshots by identity and calls the getter on every
   render; a fresh array out of `JSON.parse` every time is an
   infinite render loop, not a bug you find later. The cache is
   replaced only when the value really changed. */
let held: string[] = parse(store()?.getItem(KEY) ?? null)
const listeners = new Set<() => void>()

const same = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

/** What the rail draws, newest first. Ids only — the caller
 *  resolves them against the live store and drops what has gone. */
export const readModuleRecent = (): string[] => held

/** Somebody opened a module. Newest first; the same module opened
 *  twice MOVES rather than doubling. */
export function rememberModule(moduleId: string): void {
  if (moduleId === '') return
  const next = [moduleId, ...held.filter((id) => id !== moduleId)].slice(
    0,
    MODULE_RECENT_LIMIT,
  )
  if (same(next, held)) return
  held = next
  try {
    store()?.setItem(KEY, JSON.stringify(next))
  } catch {
    /* a full quota or a private window costs the memory of where
       you were, and nothing else on screen */
  }
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useModuleRecent(): string[] {
  return useSyncExternalStore(subscribe, readModuleRecent, readModuleRecent)
}
