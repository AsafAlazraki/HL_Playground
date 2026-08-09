/* ============================================================
   Pending effects → store writes.

   The engine never touches the store: a run returns SERIALISABLE
   effects describing writes (`PendingEffect`), and this file is
   the only place that commits them.

   Everything is checked against the CURRENT store before it is
   written — a run is a snapshot, and rows or fields it named may
   have been deleted since. Anything stale is reported in the
   effects panel rather than applied.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import type { PendingEffect } from './engine'

/** What a plan row tells the results rail. */
export interface EffectPlanItem {
  id: string
  kind: PendingEffect['kind']
  nodeId: string
  /** the engine's own human sentence */
  description: string
  /** false ⇒ shown struck through with `reason`; APPLY skips it */
  applicable: boolean
  reason?: string
}

/** Why an effect cannot be committed, or undefined when it can. */
function blockedReason(effect: PendingEffect): string | undefined {
  const state = useProjectStore.getState()

  if (effect.kind === 'flag') return 'display only'

  const entityId = effect.kind === 'link' ? effect.joinEntityId : effect.entityId
  const entity = state.entities[entityId]
  if (!entity) return 'that entity no longer exists'

  if (effect.kind === 'set') {
    const rows = state.rowsByEntity[entityId] ?? []
    if (!rows.some((r) => r.id === effect.rowId)) return 'that row no longer exists'
    if (!entity.fields.some((f) => f.id === effect.fieldId)) {
      return 'that field no longer exists'
    }
  }

  return undefined
}

/** What APPLY would do, in the order it would do it. */
export function planEffects(
  effects: readonly PendingEffect[] | undefined,
): EffectPlanItem[] {
  return (effects ?? []).map((e) => {
    const reason = blockedReason(e)
    return {
      id: e.id,
      kind: e.kind,
      nodeId: e.nodeId,
      description: e.description,
      applicable: !reason,
      reason,
    }
  })
}

/** Commit every applicable effect. Returns how many writes landed. */
export function applyPendingEffects(
  effects: readonly PendingEffect[] | undefined,
): number {
  const store = useProjectStore.getState()
  let applied = 0

  for (const effect of effects ?? []) {
    /* re-checked per effect: an earlier one may have changed the store */
    if (blockedReason(effect)) continue

    switch (effect.kind) {
      case 'set':
        store.updateCell(effect.entityId, effect.rowId, effect.fieldId, effect.value)
        applied += 1
        break
      case 'create':
        if (store.addRow(effect.entityId, effect.values)) applied += 1
        break
      case 'link':
        /* a join row is an ordinary row whose reference fields carry the pair —
           the engine has already put both row ids into `values` */
        if (store.addRow(effect.joinEntityId, effect.values)) applied += 1
        break
      case 'flag':
        /* display only — a flag marks the run, it never writes data */
        break
    }
  }

  return applied
}
