/* ============================================================
   Lint engine — public contract types (REVIEW_SPEC.md).
   Owned by src/lib/lint. Pure types; no runtime dependencies
   beyond the domain model.
   ============================================================ */

import type { EntityDef, RowData } from '@/types/model'

export type FindingSeverity = 'blocker' | 'advisory'

export interface LintFinding {
  /** STABLE across re-lints: `${ruleId}:${entityId}:${fieldIds?.join(',') ?? ''}` */
  id: string
  ruleId: string
  severity: FindingSeverity
  entityId: string
  fieldIds?: string[]
  /** short mark label, mono-uppercase-able, e.g. 'PLURAL ENTITY NAME' */
  title: string
  /** one plain sentence teaching the principle */
  why: string
  fix?: LintFix
}

export type LintFix =
  | { kind: 'rename-entity'; entityId: string; name: string; label: string }
  | { kind: 'rename-field'; entityId: string; fieldId: string; name: string; label: string }
  | { kind: 'set-display-field'; entityId: string; fieldId: string; label: string }
  | { kind: 'make-required'; entityId: string; fieldId: string; label: string }
  | { kind: 'remove-field'; entityId: string; fieldId: string; label: string }
  | { kind: 'convert-to-reference'; entityId: string; fieldId: string; refEntityId: string; label: string }
  | { kind: 'convert-to-select'; entityId: string; fieldId: string; options: string[]; label: string }
  | { kind: 'convert-to-formula'; entityId: string; fieldId: string; formula: string; label: string }
  | { kind: 'extract-entity'; entityId: string; fieldIds: string[]; newEntityName: string; label: string }

/** Input shape for lintProject — mirrors the store's schema/data slices. */
export interface LintInput {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}

/** Internal per-entity context handed to each rule (not part of the barrel API). */
export interface RuleContext {
  entity: EntityDef
  /** rows of this entity — always an array, never undefined */
  rows: RowData[]
  entities: Record<string, EntityDef>
  /** all entities sorted by (name, id) — deterministic candidate scans */
  entityList: EntityDef[]
}
