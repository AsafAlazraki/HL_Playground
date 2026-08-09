/* ============================================================
   Review hooks — the store-derived half of src/features/review.

   Every surface (panel, per-card badges, per-field marks) reads
   the SAME finding list. Badges render once per entity card, so
   a naive `useMemo(lintProject)` inside each of them would lint
   the whole project N times per keystroke. Instead a module-level
   one-slot cache keyed by the *identities* of the two store
   slices makes the lint run exactly once per relevant store
   change, no matter how many components ask for it.

   zustand hands back the same object reference until a mutation
   replaces that slice, so identity comparison is exactly the
   invalidation rule we want.
   ============================================================ */

import { useMemo } from 'react'
import type { EntityDef, RowData } from '@/types/model'
import { lintProject, type LintFinding } from '@/lib/lint'
import { useProjectStore } from '@/store/useProjectStore'

export interface FindingCount {
  blockers: number
  advisories: number
  total: number
}

type Entities = Record<string, EntityDef>
type Rows = Record<string, RowData[]>

/* -- one-slot lint cache, shared by every hook consumer ------ */

const EMPTY_FINDINGS: LintFinding[] = []

let lintEntities: Entities | null = null
let lintRows: Rows | null = null
let lintResult: LintFinding[] = EMPTY_FINDINGS

/** Trimmed, case-insensitive name identity — the same key the designer's
 *  duplicate-entity-name guardrail commits against. */
const nameIdentity = (s: string): string => s.trim().toLowerCase()

/**
 * A rename-entity fix is only offered when the new name is actually free.
 * Renaming 'Boats' to 'Boat' while a 'Boat' card already sits on the sheet
 * would write the exact state guardrail 2 refuses at the input — two entities
 * sharing a name — trading one advisory the user just cleared for a duplicate-
 * name blocker on both cards that the reviewer offers no fix for. When the
 * target name is taken we drop the fix and keep the mark: the WHY still
 * teaches, and the user picks which card gets the name.
 */
function withApplicableFixes(findings: LintFinding[], entities: Entities): LintFinding[] {
  let changed = false
  const out = findings.map((f) => {
    const fix = f.fix
    if (!fix || fix.kind !== 'rename-entity') return f
    const key = nameIdentity(fix.name)
    const taken = Object.values(entities).some(
      (e) => e.id !== fix.entityId && nameIdentity(e.name) === key,
    )
    if (!taken) return f
    changed = true
    const stripped: LintFinding = { ...f }
    delete stripped.fix
    return stripped
  })
  return changed ? out : findings
}

function lintCached(entities: Entities, rowsByEntity: Rows): LintFinding[] {
  if (entities === lintEntities && rowsByEntity === lintRows) return lintResult
  lintEntities = entities
  lintRows = rowsByEntity
  lintResult = withApplicableFixes(lintProject({ entities, rowsByEntity }), entities)
  return lintResult
}

/* -- one-slot counts cache, keyed by the finding list -------- */

const EMPTY_COUNTS: Record<string, FindingCount> = {}

let countsSource: LintFinding[] | null = null
let countsResult: Record<string, FindingCount> = EMPTY_COUNTS

function countsCached(findings: LintFinding[]): Record<string, FindingCount> {
  if (findings === countsSource) return countsResult
  const map: Record<string, FindingCount> = {}
  for (const f of findings) {
    const c = (map[f.entityId] ??= { blockers: 0, advisories: 0, total: 0 })
    if (f.severity === 'blocker') c.blockers += 1
    else c.advisories += 1
    c.total += 1
  }
  countsSource = findings
  countsResult = map
  return map
}

/* -- public hooks -------------------------------------------- */

/** All findings for the current project, memoized over the store. */
export function useLintFindings(): LintFinding[] {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  return useMemo(() => lintCached(entities, rowsByEntity), [entities, rowsByEntity])
}

/** Finding counts per entity id. Entities with zero findings are absent. */
export function useFindingCounts(): Record<string, FindingCount> {
  const findings = useLintFindings()
  return useMemo(() => countsCached(findings), [findings])
}

/** Findings for one entity, optionally narrowed to one field. */
export function useEntityFindings(entityId: string, fieldId?: string): LintFinding[] {
  const findings = useLintFindings()
  return useMemo(() => {
    const forEntity = findings.filter((f) => f.entityId === entityId)
    if (forEntity.length === 0) return EMPTY_FINDINGS
    if (fieldId === undefined) return forEntity
    const forField = forEntity.filter((f) => f.fieldIds?.includes(fieldId))
    return forField.length === 0 ? EMPTY_FINDINGS : forField
  }, [findings, entityId, fieldId])
}
