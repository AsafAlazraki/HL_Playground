/* ============================================================
   Rules engine — public contract types (RULES_SPEC.md).

   Owned by src/lib/rules. Pure types; the only dependency is the
   domain model. No React, no store, no DOM, no Dexie.
   ============================================================ */

import type { CellValue, EntityDef, RowData, ViewColumn } from '@/types/model'

/* ---------------------------------------------------------- */
/* Input                                                      */
/* ---------------------------------------------------------- */

/** Everything a run reads. Mirrors the store's schema + data slices;
 *  the engine never mutates either. */
export interface RuleRunContext {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}

/* ---------------------------------------------------------- */
/* Results                                                    */
/* ---------------------------------------------------------- */

/** One (source, match) pairing that flowed through the graph.
 *  `sourceRowId` is always a row of the rule's root entity. */
export interface RunPair {
  sourceRowId: string
  matchRowId?: string
}

export interface RunTrace {
  /** node ids visited, in order, for this pair */
  path: string[]
  /** which handle each condition/loop took, keyed by node id */
  branchTaken: Record<string, string>
}

export interface ViewResultRow {
  sourceRowId: string
  matchRowId?: string
  /** display cells, keyed `${scope}:${fieldId}` — formula fields carry
   *  their COMPUTED value; reference fields carry the raw row id (the
   *  UI resolves it to a label with `rowLabel`). */
  cells: Record<string, CellValue>
}

/** A named result set emitted by one or more output nodes. */
export interface RuleView {
  columns: ViewColumn[]
  rows: ViewResultRow[]
}

/* ---------------------------------------------------------- */
/* Pending effects — DESCRIPTIONS of writes, never writes      */
/* ---------------------------------------------------------- */

/** Common shape of every pending write. `id` is stable across runs over
 *  unchanged data, so the effects panel can keep selection/scroll. */
export interface PendingEffectBase {
  /** `${nodeId}:${sourceRowId}:${matchRowId ?? '-'}` (+ `#n` when one
   *  node produces several effects for the same pair, e.g. in a loop) */
  id: string
  /** the action node that produced it — for red-pencil attribution */
  nodeId: string
  /** human sentence for the EFFECTS panel */
  description: string
}

/**
 * A serializable description of a write the run WANTS to make.
 *
 * RULES_SPEC.md sketches this as `{ apply(store) }`, but this module is
 * pure and must not import the store, so an effect is data instead: the
 * UI layer switches on `kind` and calls the matching store action when
 * the user presses APPLY. Nothing here is ever written during a run.
 *
 * Suggested application (all values are already resolved CellValues):
 *   set    -> updateCell(entityId, rowId, fieldId, value)
 *   create -> addRow(entityId, values)
 *   link   -> addRow(joinEntityId, values)   // values already carry both refs
 *   flag   -> no write; render it as a mark on the row / in the panel
 */
export type PendingEffect =
  | (PendingEffectBase & {
      kind: 'set'
      entityId: string
      rowId: string
      fieldId: string
      value: CellValue
    })
  | (PendingEffectBase & {
      kind: 'create'
      entityId: string
      /** keyed by FieldDef.id; formula fields are never included */
      values: Record<string, CellValue>
    })
  | (PendingEffectBase & {
      kind: 'link'
      joinEntityId: string
      /** ready to hand to `addRow` — already contains
       *  `[sourceFieldId]: sourceRowId` and `[matchFieldId]: matchRowId` */
      values: Record<string, CellValue>
      sourceFieldId: string
      matchFieldId: string
      sourceRowId: string
      matchRowId: string
    })
  | (PendingEffectBase & {
      kind: 'flag'
      sourceRowId: string
      matchRowId?: string
      label: string
      tone: 'info' | 'warn' | 'danger'
    })

/* ---------------------------------------------------------- */
/* Run result                                                 */
/* ---------------------------------------------------------- */

export interface RuleRunResult {
  ok: boolean
  /** set only when the run could not start (validation blocker) or an
   *  unexpected failure ended it — never for ordinary warnings */
  error?: string
  /** named result sets emitted by output nodes: label -> rows + columns */
  views: Record<string, RuleView>
  traces: Array<{ pair: RunPair; trace: RunTrace }>
  nodeHits: Record<string, number>
  edgeHits: Record<string, number>
  effects: PendingEffect[]
  /** deduped, human sentences; each names the node it came from */
  warnings: string[]
  /** ADDITION to the spec: the same warnings keyed by node id, so the
   *  canvas can draw red-pencil marks on the offending node without
   *  parsing sentences. Always a subset of `warnings`. */
  nodeWarnings: Record<string, string[]>
}

/* ---------------------------------------------------------- */
/* Static check                                               */
/* ---------------------------------------------------------- */

export interface RuleIssue {
  nodeId?: string
  severity: 'blocker' | 'advisory'
  message: string
}
