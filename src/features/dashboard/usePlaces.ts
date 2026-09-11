/* ============================================================
   THE PLACES, COUNTED ONCE PER PAINT AND NOT ONCE PER CARD.

   `placesOf` runs a census per place — every row of every table
   read, grouped and counted — and `places.ts` says so in as many
   words, which is why the rail has a second, cheaper counter
   rather than calling it. On the real set that is 15,691 rows
   across 53 tables in 25 places.

   TWO CARDS ON THE FRONT DOOR NOW ASK FOR IT: the modules card
   draws a tile per place, and the doors card groups the same
   places by kind. A third caller is `Nothing`, which counts them
   for an empty card's third line. Three components each holding
   their own `useMemo` is three full censuses on every paint of a
   screen that redraws on every toast.

   SO THE ANSWER IS HELD BESIDE THE ARGUMENTS THAT PRODUCED IT.
   The store hands back the same `modules`, `entities` and
   `rowsByEntity` objects until something changes one of them —
   that is what makes zustand's selectors cheap — so identity is
   an exact test for "the same question", never a stale one: the
   moment a row is edited the store swaps the map and the next
   ask recomputes.

   IT IS A CACHE OF ONE, deliberately. A map keyed by project
   would hold every project a session has opened alive through
   its rows; one entry costs one answer and is replaced the
   moment the question changes. */

import { useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { placesOf, type Place } from '@/features/modules/places'
/* DEEP, not through the barrel: the barrel pulls the whole module
   feature — the workspace, the designer, the access screen — into a
   dashboard hook that wants one filter. */
import { useBrowsableModules } from '@/features/modules/reach'

let asked: readonly [unknown, unknown, unknown] | null = null
let answer: Place[] = []

/** THE HOLDING IS A PLAIN FUNCTION, NOT A LINE IN THE HOOK. Two
 *  reasons, and the second is the one that matters: a hook body
 *  that assigns a module-level variable is a side effect during
 *  render, and it reads as one whether or not it is idempotent —
 *  React may call a render twice and a reader has to prove to
 *  themselves that it is safe. Here the mutation is a cache
 *  inside a pure reader, which is the shape every memo in this
 *  repo already takes (`snapshotFor` in arrangement.ts, the host
 *  records in imageSources.ts). */
function placesFor(
  modules: Parameters<typeof placesOf>[0],
  entities: Parameters<typeof placesOf>[1],
  rowsByEntity: Parameters<typeof placesOf>[2],
): Place[] {
  if (
    asked !== null &&
    asked[0] === modules &&
    asked[1] === entities &&
    asked[2] === rowsByEntity
  ) {
    return answer
  }
  answer = placesOf(modules, entities, rowsByEntity)
  asked = [modules, entities, rowsByEntity]
  return answer
}

/** Every door on the modules grid, for this project as it stands.
 *  The same array for every card that asks during one paint. */
export function usePlaces(): Place[] {
  /* A PLACE THIS JOB MAY NOT BROWSE IS NOT A DOOR ON THE FRONT PAGE.
     Filtered here rather than in each of the three cards, for the
     same reason `withinReach` filters the project and not the answer
     — one rule, asked once, and every reading downstream (the tiles,
     the doors, the empty card's third line) inherits it with nothing
     to keep in step. The map comes back unchanged when nothing is
     shut, so the holding below still bails out on identity. */
  const modules = useBrowsableModules()
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  return useMemo(
    () => placesFor(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )
}

/** Drop the held answer. Exported for tests, which otherwise share
 *  one process's cache between cases — the same reason
 *  `forgetArrangements` exists. */
export function forgetPlacesHeld(): void {
  asked = null
  answer = []
}
