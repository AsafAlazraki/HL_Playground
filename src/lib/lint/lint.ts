/* ============================================================
   Lint engine — lintProject() composes every rule.
   Pure and deterministic: never throws on any input shape the
   types allow (empty projects, zero-field entities, missing
   rowsByEntity keys). Output order per spec: entity name, then
   severity (blockers first), then ruleId — with entityId/finding
   id as final tie-breakers so re-lints are byte-stable.
   ============================================================ */

import type { EntityDef, RowData } from '@/types/model'
import type { FindingSeverity, LintFinding, RuleContext } from './types'
import {
  ruleDanglingLink,
  ruleDerivedColumn,
  ruleEntityDupName,
  ruleEntityPlural,
  ruleEntityVague,
  ruleFieldDefaultName,
  ruleFieldDupName,
  ruleIslandEntity,
  ruleNoFields,
  ruleNoIdentifier,
  rulePrefixCluster,
  ruleRepeatingColumns,
  ruleStaleSelect,
  ruleTextLowCardinality,
  ruleTextShouldLink,
} from './rules'

const SEVERITY_RANK: Record<FindingSeverity, number> = { blocker: 0, advisory: 1 }

/** Plain string compare — locale-independent, so ordering is identical everywhere. */
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const byNameThenId = (a: EntityDef, b: EntityDef): number =>
  cmp(a.name.trim().toLowerCase(), b.name.trim().toLowerCase()) || cmp(a.id, b.id)

/**
 * Rules are pure, so a throw can only mean a rule bug — and a lint bug must
 * never take the sheet down. Swallow it and keep the rest of the review.
 */
const safe = (fn: () => LintFinding[]): LintFinding[] => {
  try {
    return fn()
  } catch {
    return []
  }
}

export function lintProject(input: {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}): LintFinding[] {
  const entities = input?.entities ?? {}
  const rowsByEntity = input?.rowsByEntity ?? {}
  const entityList = Object.values(entities)
    .filter((e): e is EntityDef => !!e)
    .sort(byNameThenId)

  const findings: LintFinding[] = []

  findings.push(...safe(() => ruleEntityDupName(entityList)))

  for (const entity of entityList) {
    const ctx: RuleContext = {
      entity,
      rows: rowsByEntity[entity.id] ?? [],
      entities,
      entityList,
    }

    findings.push(...safe(() => ruleEntityPlural(ctx)))
    findings.push(...safe(() => ruleEntityVague(ctx)))
    findings.push(...safe(() => ruleFieldDefaultName(ctx)))
    findings.push(...safe(() => ruleFieldDupName(ctx)))
    findings.push(...safe(() => ruleNoIdentifier(ctx)))
    findings.push(...safe(() => ruleNoFields(ctx)))

    // text-should-link runs early: prefix-cluster and text-low-cardinality
    // defer to it (spec interplay — one finding, not both)
    const tslFindings = safe(() => ruleTextShouldLink(ctx))
    findings.push(...tslFindings)
    const tslFieldIds = new Set(tslFindings.flatMap((f) => f.fieldIds ?? []))

    findings.push(...safe(() => ruleDanglingLink(ctx)))
    findings.push(...safe(() => ruleIslandEntity(ctx)))

    // repeating-columns claims its fields before prefix-cluster sees them
    const repeatingFindings = safe(() => ruleRepeatingColumns(ctx))
    findings.push(...repeatingFindings)
    const repeatingFieldIds = new Set(repeatingFindings.flatMap((f) => f.fieldIds ?? []))

    findings.push(...safe(() => rulePrefixCluster(ctx, repeatingFieldIds, tslFieldIds)))
    findings.push(...safe(() => ruleDerivedColumn(ctx)))
    findings.push(...safe(() => ruleStaleSelect(ctx)))
    findings.push(...safe(() => ruleTextLowCardinality(ctx, tslFieldIds)))
  }

  const nameOf = (id: string): string => entities[id]?.name.trim().toLowerCase() ?? ''
  findings.sort(
    (a, b) =>
      cmp(nameOf(a.entityId), nameOf(b.entityId)) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      cmp(a.ruleId, b.ruleId) ||
      cmp(a.id, b.id),
  )
  return findings
}
