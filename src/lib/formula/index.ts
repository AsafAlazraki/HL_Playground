/* ============================================================
   Formula engine — public surface.

   import { validateFormula, evaluateRowValues, FORMULA_FUNCTIONS }
     from '@/lib/formula'

   Pure TypeScript: no React, no DOM, no store. Depends only on
   '@/types/model'.
   ============================================================ */

import type { EntityDef, FieldDef } from '@/types/model'
import { FormulaError, walkFieldRefs, type Expr } from './ast'
import { parse } from './parser'

export { FormulaError, walkFieldRefs } from './ast'
export type { Expr, BinaryOp, UnaryOp } from './ast'
export { FORMULA_FUNCTIONS, type FormulaFn } from './functions'
export {
  evaluateRowValues,
  evalExpr,
  ERROR_VALUE,
  CYCLE_VALUE,
  type EvalContext,
  type EvalEnv,
} from './evaluate'

/* ---------------------------------------------------------- */
/* compileFormula                                             */
/* ---------------------------------------------------------- */

export interface CompiledFormula {
  src: string
  ast: Expr
  /** field names as written, deduped case-insensitively, source order */
  fields: string[]
}

/** Parse a formula to its AST. Throws FormulaError (with a
 *  position-carrying message) when the source is invalid. */
export function compileFormula(src: string): CompiledFormula {
  const ast = parse(src)
  const fields: string[] = []
  const seen = new Set<string>()
  walkFieldRefs(ast, (name) => {
    const key = name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      fields.push(name)
    }
  })
  return { src, ast, fields }
}

/* ---------------------------------------------------------- */
/* validateFormula                                            */
/* ---------------------------------------------------------- */

export interface ValidationResult {
  ok: boolean
  error?: string
  /** canonical names (FieldDef.name) of directly referenced fields,
   *  deduped, in order of first appearance — valid refs only */
  dependsOn: string[]
}

const norm = (name: string): string => name.trim().toLowerCase()

function fieldMap(entity: EntityDef): Map<string, FieldDef> {
  const map = new Map<string, FieldDef>()
  for (const f of entity.fields) {
    const key = norm(f.name)
    if (!map.has(key)) map.set(key, f)
  }
  return map
}

/** Direct field-name refs of a stored formula source ('' / broken
 *  sources contribute nothing) — used for indirect-cycle checks. */
function refsOf(src: string | undefined): string[] {
  if (!src || !src.trim()) return []
  try {
    return compileFormula(src).fields
  } catch {
    return []
  }
}

/**
 * Validate a formula against an entity's schema: syntax, known
 * functions + arity (via the parser), known field names, and — when
 * `selfFieldId` names the formula field being edited — direct and
 * indirect self-reference. Never throws.
 */
export function validateFormula(
  src: string,
  entity: EntityDef,
  selfFieldId?: string,
): ValidationResult {
  if (!src || !src.trim()) {
    return { ok: false, error: 'Formula is empty', dependsOn: [] }
  }

  let ast: Expr
  try {
    ast = parse(src)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg, dependsOn: [] }
  }

  const byName = fieldMap(entity)
  const dependsOn: string[] = []
  const seenIds = new Set<string>()
  let error: string | undefined

  walkFieldRefs(ast, (name) => {
    const f = byName.get(norm(name))
    if (!f) {
      error ??= `Unknown field [${name}]`
      return
    }
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id)
      dependsOn.push(f.name)
    }
    if (selfFieldId !== undefined && f.id === selfFieldId) {
      error ??= `A formula cannot reference its own field [${f.name}]`
    }
  })
  if (error) return { ok: false, error, dependsOn }

  /* indirect self-reference: walk the stored formulas of referenced
     formula fields and see whether any path leads back to self */
  if (selfFieldId !== undefined) {
    const self = entity.fields.find((f) => f.id === selfFieldId)
    const visited = new Set<string>([selfFieldId])

    const findPath = (f: FieldDef, trail: string[]): string[] | null => {
      for (const depName of refsOf(f.formula)) {
        const dep = byName.get(norm(depName))
        if (!dep) continue
        if (dep.id === selfFieldId) {
          return [...trail, f.name, self?.name ?? dep.name]
        }
        if (dep.type !== 'formula' || visited.has(dep.id)) continue
        visited.add(dep.id)
        const found = findPath(dep, [...trail, f.name])
        if (found) return found
      }
      return null
    }

    for (const depName of dependsOn) {
      const dep = byName.get(norm(depName))
      if (!dep || dep.type !== 'formula' || visited.has(dep.id)) continue
      visited.add(dep.id)
      const path = findPath(dep, [])
      if (path) {
        return {
          ok: false,
          error: `Circular reference: ${path.map((n) => `[${n}]`).join(' → ')}`,
          dependsOn,
        }
      }
    }
  }

  return { ok: true, dependsOn }
}
