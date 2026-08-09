/* ============================================================
   Formula engine — tree-walking evaluator + row evaluation.

   evaluateRowValues() is the one entry point features use per row:
   stored fields pass straight through, formula fields compute in
   dependency order (memoized per call), cycles are detected with
   DFS visit-states and every field ON the cycle reads '#CYCLE';
   fields that merely depend on a broken/cyclic field read '#ERROR'.
   It never throws.
   ============================================================ */

import {
  rowLabel,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { FormulaError, walkFieldRefs, type Expr } from './ast'
import { parse } from './parser'
import {
  asBoolean,
  asNumber,
  asText,
  finite,
  stringify,
  FN_IMPLS,
} from './functions'

/** Error sentinel a broken formula cell displays. */
export const ERROR_VALUE = '#ERROR' as const
/** Sentinel every formula field inside a dependency cycle displays. */
export const CYCLE_VALUE = '#CYCLE' as const

/** Resolves cross-entity lookups for reference fields. (Full
 *  [Field]-through-reference traversal lands in a later milestone;
 *  today a referenced row contributes its display label.) */
export interface EvalContext {
  lookupRow(entityId: string, rowId: string): RowData | undefined
  lookupEntity(entityId: string): EntityDef | undefined
}

/* ---------------------------------------------------------- */
/* Expression walker                                          */
/* ---------------------------------------------------------- */

export interface EvalEnv {
  /** Resolve a `[Field]` reference to its (possibly computed) value. */
  resolveField(name: string, pos: number): CellValue
}

export function evalExpr(e: Expr, env: EvalEnv): CellValue {
  switch (e.kind) {
    case 'num':
      return e.value
    case 'str':
      return e.value
    case 'bool':
      return e.value
    case 'field':
      return env.resolveField(e.name, e.pos)
    case 'unary': {
      if (e.op === 'NOT') return !asBoolean(evalExpr(e.operand, env))
      const n = asNumber(evalExpr(e.operand, env))
      return e.op === '-' ? -n : n
    }
    case 'binary':
      return evalBinary(e.op, e.left, e.right, env)
    case 'call':
      return evalCall(e.name, e.args, env)
  }
}

function evalBinary(
  op: string,
  leftExpr: Expr,
  rightExpr: Expr,
  env: EvalEnv,
): CellValue {
  /* AND / OR short-circuit — the right side may never run */
  if (op === 'AND' || op === 'OR') {
    const l = asBoolean(evalExpr(leftExpr, env))
    if (op === 'AND' && !l) return false
    if (op === 'OR' && l) return true
    return asBoolean(evalExpr(rightExpr, env))
  }

  const a = evalExpr(leftExpr, env)
  const b = evalExpr(rightExpr, env)

  switch (op) {
    case '&':
      return stringify(a) + stringify(b)
    case '+': {
      // '+' is arithmetic only; a (non-empty) text operand is a
      // deliberate error — '&' is the honest way to join text
      if ((typeof a === 'string' && a !== '') || (typeof b === 'string' && b !== '')) {
        throw new FormulaError("'+' adds numbers — use & to join text")
      }
      return finite(asNumber(a) + asNumber(b), '+')
    }
    case '-':
      return finite(asNumber(a) - asNumber(b), '-')
    case '*':
      return finite(asNumber(a) * asNumber(b), '*')
    case '/': {
      const y = asNumber(b)
      if (y === 0) throw new FormulaError('Division by zero')
      return finite(asNumber(a) / y, '/')
    }
    case '%': {
      const y = asNumber(b)
      if (y === 0) throw new FormulaError('Division by zero (%)')
      return finite(asNumber(a) % y, '%')
    }
    case '^':
      return finite(asNumber(a) ** asNumber(b), '^')
    case '=':
    case '<>':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return compare(op, a, b)
    default:
      throw new FormulaError(`Unsupported operator '${op}'`)
  }
}

/** Comparisons: number-vs-number and text-vs-text (plus =/<> on
 *  TRUE/FALSE). Mixed types throw. Two empty cells compare equal. */
function compare(op: string, a: CellValue, b: CellValue): boolean {
  let x = a
  let y = b
  if (x === null && y === null) {
    x = 0
    y = 0
  }
  if (typeof x === 'number' || typeof y === 'number') {
    const nx = asNumber(x)
    const ny = asNumber(y)
    switch (op) {
      case '=': return nx === ny
      case '<>': return nx !== ny
      case '<': return nx < ny
      case '<=': return nx <= ny
      case '>': return nx > ny
      default: return nx >= ny
    }
  }
  if (typeof x === 'string' || typeof y === 'string') {
    // case-sensitive, code-unit ordering — kept honest and predictable
    const sx = asText(x)
    const sy = asText(y)
    switch (op) {
      case '=': return sx === sy
      case '<>': return sx !== sy
      case '<': return sx < sy
      case '<=': return sx <= sy
      case '>': return sx > sy
      default: return sx >= sy
    }
  }
  // booleans (and lone nulls, which read as FALSE)
  const bx = asBoolean(x)
  const by = asBoolean(y)
  if (op === '=') return bx === by
  if (op === '<>') return bx !== by
  throw new FormulaError(`Cannot use '${op}' with TRUE/FALSE values`)
}

function evalCall(name: string, args: Expr[], env: EvalEnv): CellValue {
  /* lazy special forms — only the taken branch evaluates */
  if (name === 'IF') {
    const cond = asBoolean(evalExpr(args[0], env))
    return evalExpr(cond ? args[1] : args[2], env)
  }
  if (name === 'AND' || name === 'OR') {
    for (const arg of args) {
      const v = asBoolean(evalExpr(arg, env))
      if (name === 'AND' && !v) return false
      if (name === 'OR' && v) return true
    }
    return name === 'AND'
  }
  const impl = FN_IMPLS[name]
  if (!impl) throw new FormulaError(`Unknown function ${name}`)
  return impl(args.map((arg) => evalExpr(arg, env)))
}

/* ---------------------------------------------------------- */
/* Compile cache — parse each distinct source string once     */
/* ---------------------------------------------------------- */

type Compiled = { ast: Expr } | { error: FormulaError }
const compileCache = new Map<string, Compiled>()

function compiledAst(src: string): Expr {
  let hit = compileCache.get(src)
  if (!hit) {
    if (compileCache.size > 400) compileCache.clear()
    try {
      hit = { ast: parse(src) }
    } catch (e) {
      hit = { error: e instanceof FormulaError ? e : new FormulaError(String(e)) }
    }
    compileCache.set(src, hit)
  }
  if ('error' in hit) throw hit.error
  return hit.ast
}

/* ---------------------------------------------------------- */
/* Row evaluation with cycle detection                        */
/* ---------------------------------------------------------- */

/** Internal control-flow signal while a dependency cycle unwinds. */
class CycleSignal extends Error {
  constructor() {
    super('cycle')
    this.name = 'CycleSignal'
  }
}

function referenceLabel(f: FieldDef, raw: CellValue, ctx: EvalContext): CellValue {
  if (raw === null || raw === '') return null // unset link = missing text
  const id = String(raw)
  if (!f.refEntityId) return id
  const target = ctx.lookupEntity(f.refEntityId)
  const linked = ctx.lookupRow(f.refEntityId, id)
  return target && linked ? rowLabel(target, linked) : id
}

/**
 * Compute the full value map for one row: stored fields pass through
 * untouched (reference fields keep their raw row-id), formula fields
 * are computed. Chains resolve in dependency order; every field in a
 * cycle yields '#CYCLE'; any other failure yields '#ERROR'.
 * Inside a formula, a reference field reads as the linked row's
 * display label (falling back to the raw id when unresolvable).
 * Never throws.
 */
export function evaluateRowValues(
  entity: EntityDef,
  row: RowData,
  ctx: EvalContext,
): Record<string, CellValue> {
  const out: Record<string, CellValue> = {}

  /* case-insensitive name → field (first declaration wins) */
  const byName = new Map<string, FieldDef>()
  for (const f of entity.fields) {
    const key = f.name.trim().toLowerCase()
    if (!byName.has(key)) byName.set(key, f)
  }

  const state = new Map<string, 'visiting' | 'done'>()
  const errored = new Set<string>()
  const cycleMembers = new Set<string>()
  const stack: string[] = []

  const env: EvalEnv = {
    resolveField: (name) => {
      const f = byName.get(name.trim().toLowerCase())
      if (!f) throw new FormulaError(`Unknown field [${name}]`)
      const v = computeField(f)
      if (errored.has(f.id)) {
        throw new FormulaError(`[${f.name}] could not be calculated`)
      }
      if (f.type === 'reference') return referenceLabel(f, v, ctx)
      return v
    },
  }

  function computeField(f: FieldDef): CellValue {
    const st = state.get(f.id)
    if (st === 'done') return out[f.id] ?? null
    if (st === 'visiting') {
      // back-edge: everything from the first visit of f on the stack
      // is part of the cycle
      const from = stack.indexOf(f.id)
      for (let k = Math.max(0, from); k < stack.length; k += 1) {
        cycleMembers.add(stack[k])
      }
      throw new CycleSignal()
    }

    if (f.type !== 'formula') {
      const v = row.values[f.id] ?? null
      out[f.id] = v
      state.set(f.id, 'done')
      return v
    }

    state.set(f.id, 'visiting')
    stack.push(f.id)
    try {
      const ast = compiledAst(f.formula ?? '')
      const v = evalExpr(ast, env)
      out[f.id] = v
      state.set(f.id, 'done')
      return v
    } catch (e) {
      state.set(f.id, 'done')
      errored.add(f.id)
      if (e instanceof CycleSignal && cycleMembers.has(f.id)) {
        out[f.id] = CYCLE_VALUE
        throw e // keep unwinding through the remaining cycle members
      }
      out[f.id] = ERROR_VALUE
      return null
    } finally {
      stack.pop()
    }
  }

  for (const f of entity.fields) {
    try {
      computeField(f)
    } catch {
      /* a CycleSignal finished unwinding — every value is recorded */
    }
  }

  /* belt & braces: every field must be present in the result */
  for (const f of entity.fields) {
    if (!(f.id in out)) {
      out[f.id] = f.type === 'formula' ? ERROR_VALUE : (row.values[f.id] ?? null)
    }
  }

  /* The DFS stamps '#CYCLE' only along the stack active at the FIRST
     back-edge; sibling operands of the aborted formula are never
     traversed, so a field can sit on a cycle yet read '#ERROR' —
     and which sentinel it got depended on operand order. Re-derive
     cycles statically (SCCs of the formula dependency graph) and
     upgrade every broken member to '#CYCLE'. Fields that computed a
     real value keep it: lazy IF / AND / OR can legitimately break a
     static cycle at runtime. */
  if (errored.size > 0) stampStaticCycleMembers(entity, byName, errored, out)

  return out
}

/** Stamp CYCLE_VALUE on every errored formula field that belongs to a
 *  non-trivial strongly connected component (Tarjan) of the static
 *  formula-dependency graph. Successfully computed values are never
 *  overridden. */
function stampStaticCycleMembers(
  entity: EntityDef,
  byName: Map<string, FieldDef>,
  errored: Set<string>,
  out: Record<string, CellValue>,
): void {
  /* edges: formula field id → ids of formula fields it references */
  const edges = new Map<string, string[]>()
  for (const f of entity.fields) {
    if (f.type !== 'formula') continue
    const deps: string[] = []
    try {
      walkFieldRefs(compiledAst(f.formula ?? ''), (name) => {
        const dep = byName.get(name.trim().toLowerCase())
        if (dep && dep.type === 'formula') deps.push(dep.id)
      })
    } catch {
      /* unparseable formula — contributes no edges */
    }
    edges.set(f.id, deps)
  }

  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  let counter = 0

  const strongConnect = (v: string): void => {
    index.set(v, counter)
    low.set(v, counter)
    counter += 1
    stack.push(v)
    onStack.add(v)
    for (const w of edges.get(v) ?? []) {
      if (!edges.has(w)) continue
      if (!index.has(w)) {
        strongConnect(w)
        low.set(v, Math.min(low.get(v)!, low.get(w)!))
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!))
      }
    }
    if (low.get(v) === index.get(v)) {
      const scc: string[] = []
      let w: string
      do {
        w = stack.pop()!
        onStack.delete(w)
        scc.push(w)
      } while (w !== v)
      const cyclic = scc.length > 1 || (edges.get(v) ?? []).includes(v)
      if (!cyclic) return
      for (const id of scc) {
        if (errored.has(id) || out[id] === ERROR_VALUE) out[id] = CYCLE_VALUE
      }
    }
  }

  for (const id of edges.keys()) {
    if (!index.has(id)) strongConnect(id)
  }
}
