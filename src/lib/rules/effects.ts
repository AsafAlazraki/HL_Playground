/* ============================================================
   Rules engine — pending effects.

   An action node NEVER writes. It produces a serializable DESCRIPTION
   of the write it wants (see PendingEffect in ./types); the UI applies
   it through store actions when the user presses APPLY.

   Value scopes inside an action:
   - `set`    — the row being written is the one whose entity owns
                `fieldId` (preferring the matched row); a `{kind:'field'}`
                or `{kind:'formula'}` value is resolved against that same
                row, falling back by field ownership.
   - `create` / `link` extras — resolved against the SOURCE row, falling
                back to the matched row by field ownership. There is no
                target row yet, so the source is the honest scope.
   ============================================================ */

import type { ActionOp, CellValue, RuleNode, ValueExpr } from '@/types/model'
import type { NodeSite, RowRef, RuleEngine } from './evaluate'
import type { PendingEffect } from './types'

export type ActionNode = Extract<RuleNode, { kind: 'action' }>

export interface EffectParams {
  node: ActionNode
  source: RowRef
  match: RowRef | undefined
  eng: RuleEngine
  site: NodeSite
  /** occurrence counter keyed by `${nodeId}:${sourceRowId}:${matchRowId}`
   *  so ids stay stable AND unique when a loop revisits a pair */
  seq: Map<string, number>
}

/* ---------------------------------------------------------- */
/* Helpers                                                    */
/* ---------------------------------------------------------- */

function effectId(
  nodeId: string,
  sourceRowId: string,
  matchRowId: string | undefined,
  seq: Map<string, number>,
): string {
  const base = `${nodeId}:${sourceRowId}:${matchRowId ?? '-'}`
  const n = seq.get(base) ?? 0
  seq.set(base, n + 1)
  return n === 0 ? base : `${base}#${n}`
}

function fmtValue(v: CellValue): string {
  if (v === null || v === undefined || v === '') return 'empty'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (typeof v === 'number') return String(v)
  return `"${v}"`
}

/** Resolve a `values` map to plain cells, skipping fields that no longer
 *  exist and formula fields (which are computed, never stored). */
function resolveValues(
  entityId: string,
  values: Record<string, ValueExpr> | undefined,
  scope: RowRef | undefined,
  other: RowRef | undefined,
  eng: RuleEngine,
  site: NodeSite,
): Record<string, CellValue> {
  const out: Record<string, CellValue> = {}
  const entity = eng.entity(entityId)
  for (const [fieldId, expr] of Object.entries(values ?? {})) {
    const field = eng.fieldOf(entityId, fieldId)
    if (!field) {
      eng.warn(
        site,
        `${site.label}: writes to a field that is no longer on "${entity?.name ?? 'that entity'}" — skipped.`,
      )
      continue
    }
    if (field.type === 'formula') {
      eng.warn(site, `${site.label}: "${field.name}" is calculated and cannot be written — skipped.`)
      continue
    }
    const ref =
      expr && expr.kind === 'field' ? eng.pickOwner(expr.path?.viaFieldId ?? expr.path?.fieldId, scope, other) : scope
    out[fieldId] = eng.resolveValue(expr, ref, site)
  }
  return out
}

function summarise(
  entityId: string,
  values: Record<string, CellValue>,
  eng: RuleEngine,
): string {
  const parts: string[] = []
  for (const [fieldId, value] of Object.entries(values)) {
    if (parts.length >= 3) {
      parts.push('…')
      break
    }
    const f = eng.fieldOf(entityId, fieldId)
    parts.push(`${f?.name ?? fieldId}: ${fmtValue(value)}`)
  }
  return parts.length > 0 ? ` — ${parts.join(', ')}` : ''
}

/* ---------------------------------------------------------- */
/* buildEffect                                                */
/* ---------------------------------------------------------- */

/** Describe the write an action node wants for this pair. Returns
 *  undefined when the action cannot be described (already warned). */
export function buildEffect(params: EffectParams): PendingEffect | undefined {
  const { node, source, match, eng, site, seq } = params
  const action: ActionOp | undefined = node.config?.action
  if (!action) return undefined

  const nodeId = node.id
  const id = (): string => effectId(nodeId, source.row.id, match?.row.id, seq)

  switch (action.op) {
    case 'set': {
      const target = eng.pickOwner(action.fieldId, match, source)
      const field = eng.fieldOf(target?.entityId, action.fieldId)
      if (!target || !field) {
        eng.warn(site, `${site.label}: sets a field that no longer exists — nothing written.`)
        return undefined
      }
      if (field.type === 'formula') {
        eng.warn(site, `${site.label}: "${field.name}" is calculated and cannot be set.`)
        return undefined
      }
      const valueRef =
        action.value && action.value.kind === 'field'
          ? eng.pickOwner(
              action.value.path?.viaFieldId ?? action.value.path?.fieldId,
              target,
              target === match ? source : match,
            )
          : target
      const value = eng.resolveValue(action.value, valueRef, site)
      const entity = eng.entity(target.entityId)
      return {
        id: id(),
        nodeId,
        kind: 'set',
        entityId: target.entityId,
        rowId: target.row.id,
        fieldId: field.id,
        value,
        description: `Set "${field.name}" on ${entity?.name ?? 'row'} "${eng.label(target)}" to ${fmtValue(value)}`,
      }
    }

    case 'create': {
      const entity = eng.entity(action.entityId)
      if (!entity) {
        eng.warn(site, `${site.label}: creates rows in an entity that no longer exists — nothing written.`)
        return undefined
      }
      const values = resolveValues(entity.id, action.values, source, match, eng, site)
      return {
        id: id(),
        nodeId,
        kind: 'create',
        entityId: entity.id,
        values,
        description: `Create a row in "${entity.name}"${summarise(entity.id, values, eng)}`,
      }
    }

    case 'link': {
      const join = eng.entity(action.joinEntityId)
      if (!join) {
        eng.warn(site, `${site.label}: links into a join entity that no longer exists — nothing written.`)
        return undefined
      }
      if (!match) {
        eng.warn(site, `${site.label}: reached a row with nothing matched to it, so there is no pair to link.`)
        return undefined
      }
      const sourceField = eng.fieldOf(join.id, action.sourceFieldId)
      const matchField = eng.fieldOf(join.id, action.matchFieldId)
      if (!sourceField || !matchField) {
        eng.warn(site, `${site.label}: the join's link fields are missing — nothing written.`)
        return undefined
      }
      const values = resolveValues(join.id, action.values, source, match, eng, site)
      /* the two references are written last so extras can never clobber them */
      values[sourceField.id] = source.row.id
      values[matchField.id] = match.row.id
      const sourceEntity = eng.entity(source.entityId)
      const matchEntity = eng.entity(match.entityId)
      return {
        id: id(),
        nodeId,
        kind: 'link',
        joinEntityId: join.id,
        values,
        sourceFieldId: sourceField.id,
        matchFieldId: matchField.id,
        sourceRowId: source.row.id,
        matchRowId: match.row.id,
        description: `Link ${sourceEntity?.name ?? 'row'} "${eng.label(source)}" to ${
          matchEntity?.name ?? 'row'
        } "${eng.label(match)}" in "${join.name}"`,
      }
    }

    case 'flag': {
      const label = (action.label ?? '').trim() || 'Flagged'
      const sourceEntity = eng.entity(source.entityId)
      const who = match
        ? `${sourceEntity?.name ?? 'row'} "${eng.label(source)}" / ${
            eng.entity(match.entityId)?.name ?? 'row'
          } "${eng.label(match)}"`
        : `${sourceEntity?.name ?? 'row'} "${eng.label(source)}"`
      return {
        id: id(),
        nodeId,
        kind: 'flag',
        sourceRowId: source.row.id,
        matchRowId: match?.row.id,
        label,
        tone: action.tone ?? 'info',
        description: `Flag ${who}: ${label}`,
      }
    }

    default:
      return undefined
  }
}
