/* ============================================================
   Rules engine — graph traversal. `runRule` lives here.

   The unit of work is a PAIR: one row of the rule's root entity
   (`source`) plus, once a Match/Find/For-each has run, one row of a
   second entity (`match`). Every node takes a pair in and emits zero,
   one or many pairs out, each tagged with the handle it leaves by:

     start      one pair per row of the root entity          -> out
     match      fans a source row out to one pair per fitting
                candidate; nothing fitting is either dropped
                ('skip') or carried on with no match
                ('passThrough')                              -> out
     filter     keeps matching pairs, drops the rest          -> out
     condition  branches IN ORDER, first hit wins, otherwise  -> else
     find       follows a link field to ONE related row,
                which becomes the new match                   -> out
     loop       one pair per item down `body`, then the
                incoming pair once down `next`                -> body/next
     action     records a PendingEffect, never writes         -> out
     output     collects a row into views[label]              -> out

   BOUNDED. `MAX_PAIR_STEPS` caps the total work (a node visit and a
   single candidate test inside a match each cost one step, so a
   quadratic scan cannot hang the tab); `MAX_LOOP_ITERATIONS` caps one
   For-each node. Exceeding either is a WARNING naming the node, not an
   error: the run stops cleanly and the partial results still come back
   with `ok: true`. A cycle that no For-each bounds is a `validateRule`
   blocker, checked before the first row is read, so this walk can never
   spin forever.

   NEVER THROWS, for any input.
   ============================================================ */

import {
  ELSE_HANDLE,
  LOOP_BODY_HANDLE,
  LOOP_NEXT_HANDLE,
  OUT_HANDLE,
  type CellValue,
  type RuleDef,
  type RuleEdge,
  type RuleNode,
  type ViewColumn,
} from '@/types/model'
import { createEngine, nodeLabel, type ClauseScopes, type NodeSite, type RowRef } from './evaluate'
import { buildEffect } from './effects'
import { validateRule } from './validate'
import type { PendingEffect, RuleRunContext, RuleRunResult, RuleView } from './types'

/** Total pair-steps a single run may spend. */
export const MAX_PAIR_STEPS = 100_000
/** Rounds a single For-each node may run across the whole run. */
export const MAX_LOOP_ITERATIONS = 10_000

/* ---------------------------------------------------------- */
/* Walk state                                                 */
/* ---------------------------------------------------------- */

/** Visited nodes as a persistent list — sharing prefixes keeps a long
 *  loop from turning path bookkeeping into O(n²) copying. */
interface Trail {
  readonly nodeId: string
  readonly prev: Trail | undefined
}

function trailToPath(trail: Trail | undefined): string[] {
  const out: string[] = []
  let cursor = trail
  while (cursor) {
    out.push(cursor.nodeId)
    cursor = cursor.prev
  }
  out.reverse()
  return out
}

interface WalkItem {
  nodeId: string
  source: RowRef
  match: RowRef | undefined
  trail: Trail | undefined
  branchTaken: Record<string, string>
}

/** One pair leaving a node by a named handle. */
interface Emission {
  handle: string
  source: RowRef
  match: RowRef | undefined
  branchTaken: Record<string, string>
}

const NO_BRANCHES: Record<string, string> = {}

/** 100000 -> "100,000", locale-independently. */
const fmtCount = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

function emptyResult(): RuleRunResult {
  return {
    ok: true,
    views: {},
    traces: [],
    nodeHits: {},
    edgeHits: {},
    effects: [],
    warnings: [],
    nodeWarnings: {},
  }
}

/* ---------------------------------------------------------- */
/* runRule                                                    */
/* ---------------------------------------------------------- */

/**
 * Execute a rule against a snapshot of the project's rows.
 *
 * Reads only; every write the rule wants comes back as a `PendingEffect`
 * for the UI to apply. Any blocker from `validateRule` stops the run
 * before a single row is read (`ok: false` + `error`); everything softer
 * is a warning that still returns results.
 */
export function runRule(rule: RuleDef, ctx: RuleRunContext): RuleRunResult {
  try {
    return execute(rule, ctx)
  } catch (e) {
    const result = emptyResult()
    result.ok = false
    result.error = `This rule could not be run: ${e instanceof Error ? e.message : String(e)}`
    return result
  }
}

/* ---------------------------------------------------------- */

function execute(rule: RuleDef, ctx: RuleRunContext): RuleRunResult {
  const safeCtx: RuleRunContext = {
    entities: ctx?.entities ?? {},
    rowsByEntity: ctx?.rowsByEntity ?? {},
  }
  const entities = safeCtx.entities
  const eng = createEngine(safeCtx)

  /* warnings/nodeWarnings are the engine's own arrays, so anything the
     evaluator warns about during the walk lands in the result */
  const result: RuleRunResult = {
    ok: true,
    views: {},
    traces: [],
    nodeHits: {},
    edgeHits: {},
    effects: [],
    warnings: eng.warnings,
    nodeWarnings: eng.nodeWarnings,
  }

  /* -- refuse to run a rule that cannot run ----------------- */

  const blockers = validateRule(rule, safeCtx).filter((i) => i.severity === 'blocker')
  if (blockers.length > 0) {
    result.ok = false
    result.error =
      blockers.length === 1
        ? blockers[0].message
        : `${blockers[0].message} (and ${blockers.length - 1} more problem${
            blockers.length === 2 ? '' : 's'
          } to fix first)`
    return result
  }

  /* -- graph index ------------------------------------------ */

  const nodes: RuleNode[] = Array.isArray(rule?.nodes) ? rule.nodes.filter(Boolean) : []
  const nodeById = new Map<string, RuleNode>()
  for (const n of nodes) if (n?.id) nodeById.set(n.id, n)

  const edges: RuleEdge[] = Array.isArray(rule?.edges) ? rule.edges.filter(Boolean) : []
  /** nodeId -> handle -> edges */
  const outgoing = new Map<string, Map<string, RuleEdge[]>>()
  for (const edge of edges) {
    if (!edge?.id || !nodeById.has(edge.source) || !nodeById.has(edge.target)) continue
    let byHandle = outgoing.get(edge.source)
    if (!byHandle) {
      byHandle = new Map()
      outgoing.set(edge.source, byHandle)
    }
    const handle = edge.sourceHandle ?? OUT_HANDLE
    const list = byHandle.get(handle)
    if (list) list.push(edge)
    else byHandle.set(handle, [edge])
  }

  const start = nodes.find((n) => n.kind === 'start')
  const rootEntityId = rule?.rootEntityId ?? ''
  /* both are validateRule blockers; belt-and-braces so this is total */
  if (!start || !eng.entity(rootEntityId)) {
    result.ok = false
    result.error = 'This rule has no Start node or no entity to run against.'
    return result
  }

  const sites = new Map<string, NodeSite>()
  const siteOf = (node: RuleNode): NodeSite => {
    let site = sites.get(node.id)
    if (!site) {
      site = { nodeId: node.id, label: nodeLabel(node, entities) }
      sites.set(node.id, site)
    }
    return site
  }

  /* -- budget ----------------------------------------------- */

  const budget = { steps: 0, stopped: false }
  const spend = (site: NodeSite): boolean => {
    if (budget.stopped) return false
    budget.steps += 1
    if (budget.steps > MAX_PAIR_STEPS) {
      budget.stopped = true
      eng.warn(
        site,
        `${site.label}: this rule was stopped after ${fmtCount(
          MAX_PAIR_STEPS,
        )} steps — the results below are only part of the answer.`,
      )
      return false
    }
    return true
  }

  const loopCounts = new Map<string, number>()
  const effectSeq = new Map<string, number>()
  /** view label -> the `${scope}:${fieldId}` keys already columned */
  const viewColumnKeys = new Map<string, Set<string>>()

  /* -- per-node semantics ----------------------------------- */

  const stepNode = (node: RuleNode, item: WalkItem, site: NodeSite): Emission[] => {
    const carry = (match: RowRef | undefined, handle: string, branchTaken?: Record<string, string>): Emission => ({
      handle,
      source: item.source,
      match,
      branchTaken: branchTaken ?? item.branchTaken,
    })

    switch (node.kind) {
      case 'start':
        return [carry(item.match, OUT_HANDLE)]

      case 'match': {
        const cfg = node.config
        const target = eng.entity(cfg?.targetEntityId)
        if (!target) {
          eng.warn(site, `${site.label}: has no entity to search, so nothing could be matched.`)
          return []
        }
        const out: Emission[] = []
        for (const candidate of eng.rows(target.id)) {
          if (!candidate?.id) continue
          if (!spend(site)) break
          const candidateRef: RowRef = { entityId: target.id, row: candidate }
          /* THE scope convention: `left` reads the candidate, a field
             right-hand side reads the source. Never the other way. */
          const scopes: ClauseScopes = {
            left: candidateRef,
            right: item.source,
            byOwnership: false,
          }
          if (eng.evalGroup(cfg?.group, scopes, site)) out.push(carry(candidateRef, OUT_HANDLE))
        }
        if (out.length === 0 && cfg?.emptyBehavior === 'passThrough') {
          return [carry(undefined, OUT_HANDLE)]
        }
        return out
      }

      case 'filter': {
        const scopes: ClauseScopes = { left: item.match, right: item.source, byOwnership: true }
        return eng.evalGroup(node.config?.group, scopes, site) ? [carry(item.match, OUT_HANDLE)] : []
      }

      case 'condition': {
        const scopes: ClauseScopes = { left: item.match, right: item.source, byOwnership: true }
        for (const branch of node.config?.branches ?? []) {
          if (!branch?.id) continue
          if (eng.evalGroup(branch.group, scopes, site)) {
            return [carry(item.match, branch.id, { ...item.branchTaken, [node.id]: branch.id })]
          }
        }
        return [carry(item.match, ELSE_HANDLE, { ...item.branchTaken, [node.id]: ELSE_HANDLE })]
      }

      case 'find': {
        const viaFieldId = node.config?.viaFieldId
        if (!viaFieldId) {
          eng.warn(site, `${site.label}: has no link to follow, so nothing was found.`)
          return []
        }
        const holder = eng.pickOwner(viaFieldId, item.match, item.source)
        const via = eng.fieldOf(holder?.entityId, viaFieldId)
        if (!holder || !via) {
          eng.warn(site, `${site.label}: follows a link field that no longer exists — nothing was found.`)
          return []
        }
        if (via.type !== 'reference' || !via.refEntityId) {
          eng.warn(site, `${site.label}: "${via.name}" is not a link field, so it cannot be followed.`)
          return []
        }
        const raw = eng.valuesOf(holder)[via.id]
        /* a blank or dangling link is ordinary data: the pair simply
           has no related row, so it goes no further */
        if (raw === null || raw === undefined || raw === '') return []
        const linked = eng.row(via.refEntityId, String(raw))
        if (!linked) return []
        return [carry({ entityId: via.refEntityId, row: linked }, OUT_HANDLE)]
      }

      case 'loop': {
        const items = loopItems(node, item, site)
        const out: Emission[] = []
        let count = loopCounts.get(node.id) ?? 0
        for (const entry of items) {
          if (count >= MAX_LOOP_ITERATIONS) {
            eng.warn(
              site,
              `${site.label}: stopped after ${fmtCount(
                MAX_LOOP_ITERATIONS,
              )} rounds — the rest of the rows were not visited.`,
            )
            break
          }
          count += 1
          out.push(carry(entry, LOOP_BODY_HANDLE, { ...item.branchTaken, [node.id]: LOOP_BODY_HANDLE }))
        }
        loopCounts.set(node.id, count)
        /* the walk continues once, past the loop, carrying what came in */
        out.push(carry(item.match, LOOP_NEXT_HANDLE, { ...item.branchTaken, [node.id]: LOOP_NEXT_HANDLE }))
        return out
      }

      case 'action': {
        const effect: PendingEffect | undefined = buildEffect({
          node,
          source: item.source,
          match: item.match,
          eng,
          site,
          seq: effectSeq,
        })
        if (effect) result.effects.push(effect)
        return [carry(item.match, OUT_HANDLE)]
      }

      case 'output': {
        collectOutput(node, item, site)
        return [carry(item.match, OUT_HANDLE)]
      }

      default:
        return [carry(item.match, OUT_HANDLE)]
    }
  }

  /* -- loop sources ----------------------------------------- */

  const loopItems = (
    node: Extract<RuleNode, { kind: 'loop' }>,
    item: WalkItem,
    site: NodeSite,
  ): RowRef[] => {
    const src = node.config?.source
    if (!src) {
      eng.warn(site, `${site.label}: has nothing to loop over.`)
      return []
    }

    if (src.kind === 'entity') {
      const entity = eng.entity(src.entityId)
      if (!entity) {
        eng.warn(site, `${site.label}: loops over an entity that no longer exists.`)
        return []
      }
      return eng
        .rows(entity.id)
        .filter((row) => Boolean(row?.id))
        .map((row) => ({ entityId: entity.id, row }))
    }

    /* 'linked': every row that points AT the current row */
    const owner = eng.ownerOf(src.viaFieldId)
    const via = eng.fieldOf(owner?.id, src.viaFieldId)
    if (!owner || !via) {
      eng.warn(site, `${site.label}: gathers rows through a link field that no longer exists.`)
      return []
    }
    if (via.type !== 'reference' || !via.refEntityId) {
      eng.warn(site, `${site.label}: "${via.name}" is not a link field, so nothing can be gathered.`)
      return []
    }
    const anchor =
      item.match && item.match.entityId === via.refEntityId
        ? item.match
        : item.source.entityId === via.refEntityId
          ? item.source
          : (item.match ?? item.source)
    const anchorId = anchor.row.id
    const out: RowRef[] = []
    for (const row of eng.rows(owner.id)) {
      if (!row?.id) continue
      const raw = row.values?.[via.id]
      if (raw === null || raw === undefined || raw === '') continue
      if (String(raw) === anchorId) out.push({ entityId: owner.id, row })
    }
    return out
  }

  /* -- output ------------------------------------------------ */

  const collectOutput = (
    node: Extract<RuleNode, { kind: 'output' }>,
    item: WalkItem,
    site: NodeSite,
  ): void => {
    const label = (node.config?.label ?? '').trim() || 'Result'
    let view: RuleView | undefined = result.views[label]
    if (!view) {
      view = { columns: [], rows: [] }
      result.views[label] = view
    }
    let keys = viewColumnKeys.get(label)
    if (!keys) {
      keys = new Set()
      viewColumnKeys.set(label, keys)
    }

    const columns: ViewColumn[] = (node.config?.columns ?? []).filter(
      (c): c is ViewColumn => Boolean(c?.fieldId),
    )
    const cells: Record<string, CellValue> = {}
    for (const col of columns) {
      const key = `${col.scope}:${col.fieldId}`
      /* several output nodes may share a label — the view is the union
         of their columns, in first-seen order */
      if (!keys.has(key)) {
        keys.add(key)
        view.columns.push({ ...col })
      }
      const ref = col.scope === 'match' ? item.match : item.source
      /* readField computes formula fields and returns null for a row
         that is not there (the passThrough case) */
      cells[key] = eng.readField(ref, col.fieldId, site)
    }

    view.rows.push({
      sourceRowId: item.source.row.id,
      matchRowId: item.match?.row.id,
      cells,
    })
  }

  /* -- the walk --------------------------------------------- */

  const queue: WalkItem[] = []
  for (const row of eng.rows(rootEntityId)) {
    if (!row?.id) continue
    queue.push({
      nodeId: start.id,
      source: { entityId: rootEntityId, row },
      match: undefined,
      trail: undefined,
      branchTaken: NO_BRANCHES,
    })
  }

  let head = 0
  while (head < queue.length) {
    if (budget.stopped) break
    const item = queue[head]
    head += 1
    const node = nodeById.get(item.nodeId)
    if (!node) continue

    const site = siteOf(node)
    if (!spend(site)) break

    result.nodeHits[node.id] = (result.nodeHits[node.id] ?? 0) + 1
    const trail: Trail = { nodeId: node.id, prev: item.trail }

    for (const emission of stepNode(node, item, site)) {
      const targets = outgoing.get(node.id)?.get(emission.handle) ?? []
      if (targets.length === 0) {
        /* the pair survived this node but has nowhere left to go: this
           is where its journey is recorded for the canvas */
        result.traces.push({
          pair: {
            sourceRowId: emission.source.row.id,
            matchRowId: emission.match?.row.id,
          },
          trace: {
            path: trailToPath(trail),
            branchTaken: { ...emission.branchTaken },
          },
        })
        continue
      }
      for (const edge of targets) {
        result.edgeHits[edge.id] = (result.edgeHits[edge.id] ?? 0) + 1
        queue.push({
          nodeId: edge.target,
          source: emission.source,
          match: emission.match,
          trail,
          branchTaken: emission.branchTaken,
        })
      }
    }
  }

  return result
}
