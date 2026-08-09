/* ============================================================
   VIEW PAGES, ACROSS A RELOAD.

   `@/features/views` keeps its definitions in module state and says
   so at the foot of its index.ts: what a page POINTS AT (tables,
   joins, pair rows) is already in the store and already persists —
   only the page's own layout was lost on refresh. The store grew a
   `views` slice for exactly this, and this file is the seam between
   the two. It lives in the shell because the shell is what owns
   both ends; the feature adds nothing and knows nothing about it.

   TWO DIRECTIONS, NEITHER OF THEM A LOOP:

     hydrate  once on mount, every stored ViewDef is registered into
              the feature's registry WITH ITS STORED ID. After that,
              `createViewFor(tableId)` finds it by root table and
              hands back the persisted page rather than a fresh one.

     mirror   whenever the feature's definitions change, each one is
              copied into the store. `createView` is idempotent by
              root table, so this makes at most one record per table
              and thereafter only patches it.

   The mirror reads the store through `getState()` and never
   subscribes, so writing to the store cannot re-run it; and it
   writes only when the JSON actually differs, so an unchanged page
   never touches IndexedDB.

   A definition whose root table is gone — the sheet was swapped for
   a demo, or the table was struck — is not written back. The stale
   page in module state is harmless (nothing can reach it), and
   resurrecting it in the store would be a lie about what is on the
   sheet.
   ============================================================ */

import { useEffect, useRef } from 'react'
import type { ViewDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { registerViewDef, useViewDefs } from '@/features/views'

/** What was last written for a root table, so an unchanged page is
 *  not re-saved on every keystroke somewhere else in the app. */
const written = new Map<string, string>()

const shapeOf = (v: ViewDef): string => JSON.stringify({ name: v.name, blocks: v.blocks })

export function useViewPersistence(): void {
  const defs = useViewDefs()
  const hydrated = useRef(false)

  /* HYDRATE — before anything asks for a page. */
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    for (const v of Object.values(useProjectStore.getState().views)) {
      registerViewDef(v)
      written.set(v.rootTableId, shapeOf(v))
    }
  }, [])

  /* MIRROR — after every change the feature publishes. */
  useEffect(() => {
    if (defs.length === 0) return
    const store = useProjectStore.getState()
    for (const def of defs) {
      if (!store.entities[def.rootTableId]) continue
      const shape = shapeOf(def)
      if (written.get(def.rootTableId) === shape) continue
      written.set(def.rootTableId, shape)
      const record = store.createView(def.rootTableId, def.name)
      store.updateView(record.id, { name: def.name, blocks: def.blocks })
    }
  }, [defs])
}
