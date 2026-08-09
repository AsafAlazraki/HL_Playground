/* ============================================================
   THE LEVELS ARE THE USER'S, NOT THE PRESET'S.

   A preset is where the chain starts, never where it ends: a
   dealer whose middle level is called Series must not be forced
   to call it Range, and a taxonomy three deep must not be capped
   at two because no preset offered a third.

   `createTable` builds the table from the closest preset — that
   is the only thing it knows how to do — and this reconciles what
   came out with what the person actually typed: rename the levels
   they renamed, add the ones they added (as columns sitting with
   the other levels, not stranded at the far right), drop the ones
   they dropped. A brand-new table has no rows, so a dropped level
   destroys nothing.
   ============================================================ */
import { useProjectStore } from '@/store/useProjectStore'

/** Walk a column to `target` in the column order, one swap at a time —
 *  the store moves a column by one place, which is all it needs to. */
function moveFieldTo(entityId: string, fieldId: string, target: number): void {
  for (let guard = 0; guard < 64; guard += 1) {
    const entity = useProjectStore.getState().entities[entityId]
    if (!entity) return
    const at = entity.fields.findIndex((f) => f.id === fieldId)
    if (at < 0 || at === target) return
    useProjectStore.getState().moveField(entityId, fieldId, at > target ? -1 : 1)
  }
}

/**
 * Make the table's grouping levels read exactly `levels`, in order.
 * Safe to call with names the preset already produced — it writes
 * nothing when there is nothing to change.
 */
export function applyStructure(entityId: string, levels: string[]): void {
  const start = useProjectStore.getState().entities[entityId]
  if (!start) return

  const hierarchy = [...(start.hierarchy ?? [])]
  const shared = Math.min(hierarchy.length, levels.length)

  /* 1. the levels the preset already gave us, under the user's names */
  for (let i = 0; i < shared; i += 1) {
    const field = start.fields.find((f) => f.id === hierarchy[i])
    if (field && field.name !== levels[i]) {
      useProjectStore.getState().updateField(entityId, hierarchy[i], { name: levels[i] })
    }
  }

  /* 2. the levels they added — a new column, moved up to sit with the
        other levels so the table reads Brand | Series | Trailer | … */
  for (let i = hierarchy.length; i < levels.length; i += 1) {
    const field = useProjectStore
      .getState()
      .addField(entityId, { name: levels[i], type: 'text', required: true })
    if (!field) break
    hierarchy.push(field.id)
    moveFieldTo(entityId, field.id, hierarchy.length - 1)
  }

  /* 3. the levels they dropped */
  for (let i = levels.length; i < hierarchy.length; i += 1) {
    useProjectStore.getState().removeField(entityId, hierarchy[i])
  }

  const next = hierarchy.slice(0, levels.length)
  const after = useProjectStore.getState().entities[entityId]
  useProjectStore.getState().updateEntity(entityId, {
    hierarchy: next,
    /* the deepest level names a row; with no levels the first column does */
    displayFieldId: next[next.length - 1] ?? after?.fields[0]?.id,
  })
}
