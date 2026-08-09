/* ============================================================
   Store → React Flow.

   The store is the source of truth; this hook derives the flow
   graph the canvas draws. Nothing here mutates: node drags are
   committed by the canvas through `moveRuleNode`, connections
   through `connectRuleNodes`.

   Node plates are memoised components, so this hook works hard to
   hand back the SAME data object when nothing about a node has
   changed — a run that lights up two nodes must not re-render
   twenty.
   ============================================================ */

import { useMemo, useRef } from 'react'
import { MarkerType } from '@xyflow/react'
import type { Edge, EdgeMarker, Node } from '@xyflow/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  ELSE_HANDLE,
  LOOP_BODY_HANDLE,
  LOOP_NEXT_HANDLE,
  OUT_HANDLE,
  RULE_NODE_KINDS,
} from '@/types/model'
import type { RuleDef, RuleNode, RuleNodeKind } from '@/types/model'
import {
  describeNode,
  hitLabel,
  kindInkBright,
  plateSpec,
  type EntityMap,
  type OutHandle,
  type PlateSpec,
} from './describe'
import { useRunResultFor } from './runStore'
import { useRuleIssues } from './useRuleIssues'

/* Layering: edges under plates, exactly as the ERD layer does. */
export const Z_RULE_EDGE = 20
export const Z_RULE_NODE = 30

/** Plain type alias (not an interface) so it satisfies React Flow's
 *  `Record<string, unknown>` constraint on node data. */
export type RuleNodeData = {
  kind: RuleNodeKind
  /** mono tag from RULE_NODE_KINDS — RUN / FIT / IF … */
  tag: string
  kindLabel: string
  /** the subject: an entity name, a result label, an action verb */
  title: string
  /** one human line describing this node's own config — kept for hosts that
   *  want a tooltip; the PLATE itself draws `spec`, never this */
  summary: string
  /** the node's whole configuration, ready to draw: clause rows, branch
   *  rows, column chips, the emptyBehavior footer */
  spec: PlateSpec
  configured: boolean
  /** a blocker from validateRule sits on this node */
  blocked: boolean
  /** the last run warned about this node — red-pencil it */
  warning: string | null
  /** rows that reached this node in the last run */
  hits: number | null
  hitText: string | null
  outs: OutHandle[]
  hasTarget: boolean
}

export type RuleFlowNode = Node<RuleNodeData>

/** React Flow node type key for a rule node kind. */
export const ruleNodeTypeKey = (kind: RuleNodeKind): string => `rule-${kind}`

/* ---------------------------------------------------------- */
/* Out-handles per kind                                       */
/* ---------------------------------------------------------- */

export function outHandlesOf(node: RuleNode): OutHandle[] {
  switch (node.kind) {
    case 'output':
      return []
    case 'condition':
      return [
        ...node.config.branches.map((b, i) => ({
          id: b.id,
          label: b.label || `Branch ${i + 1}`,
        })),
        { id: ELSE_HANDLE, label: 'else', muted: true },
      ]
    case 'loop':
      return [
        { id: LOOP_BODY_HANDLE, label: 'body' },
        { id: LOOP_NEXT_HANDLE, label: 'next', muted: true },
      ]
    default:
      return [{ id: OUT_HANDLE, label: 'out' }]
  }
}

/* ---------------------------------------------------------- */
/* Derivation                                                 */
/* ---------------------------------------------------------- */

function buildData(
  node: RuleNode,
  rule: RuleDef,
  entities: EntityMap,
  hits: number | undefined,
  blocked: boolean,
  warnings: string[] | undefined,
): RuleNodeData {
  const meta = RULE_NODE_KINDS[node.kind]
  const caption = describeNode(node, rule, entities)
  return {
    kind: node.kind,
    tag: meta.tag,
    kindLabel: meta.label,
    title: caption.title,
    summary: caption.summary,
    spec: plateSpec(node, rule, entities),
    configured: caption.configured,
    blocked,
    warning: warnings && warnings.length ? warnings.join('\n') : null,
    hits: hits ?? null,
    hitText: hits === undefined ? null : hitLabel(node.kind, hits),
    outs: outHandlesOf(node),
    hasTarget: node.kind !== 'start',
  }
}

/* Everything a plate draws, plus where it sits. Identical signature ⇒ the
   previous node object is handed back, so React.memo keeps the plate as it
   is: a run that lights two nodes must not re-render twenty. */
const dataSignature = (d: RuleNodeData, x: number, y: number): string =>
  JSON.stringify([
    d.kind,
    d.title,
    d.spec,
    d.configured,
    d.blocked,
    d.warning,
    d.hits,
    d.outs.map((o) => [o.id, o.label, !!o.muted]),
    x,
    y,
  ])

const edgeMarker = (color: string): EdgeMarker => ({
  type: MarkerType.ArrowClosed,
  width: 14,
  height: 14,
  color,
})

/**
 * The rule graph for `ruleId`, ready to spread onto the canvas.
 * Returns empty arrays when there is no active rule.
 */
export function useRuleGraph(ruleId: string | null): {
  nodes: Node[]
  edges: Edge[]
} {
  const rule = useProjectStore((s) => (ruleId ? s.rules[ruleId] : undefined))
  const entities = useProjectStore((s) => s.entities)
  const result = useRunResultFor(ruleId)
  const { blockedNodeIds } = useRuleIssues(ruleId)

  /* one derived node object per id, reused while its signature holds */
  const cache = useRef(new Map<string, { sig: string; node: RuleFlowNode }>())

  const nodes = useMemo<Node[]>(() => {
    if (!rule) {
      cache.current.clear()
      return []
    }
    const nodeHits = result?.nodeHits
    const next = new Map<string, { sig: string; node: RuleFlowNode }>()

    const out = rule.nodes.map((n) => {
      const data = buildData(
        n,
        rule,
        entities,
        nodeHits ? nodeHits[n.id] : undefined,
        blockedNodeIds.has(n.id),
        result?.nodeWarnings?.[n.id],
      )
      const sig = dataSignature(data, n.position.x, n.position.y)
      const prev = cache.current.get(n.id)
      if (prev && prev.sig === sig) {
        next.set(n.id, prev)
        return prev.node
      }
      const node: RuleFlowNode = {
        id: n.id,
        type: ruleNodeTypeKey(n.kind),
        position: { x: n.position.x, y: n.position.y },
        zIndex: Z_RULE_NODE,
        data,
      }
      next.set(n.id, { sig, node })
      return node
    })

    cache.current = next
    return out
  }, [rule, entities, result, blockedNodeIds])

  const edges = useMemo<Edge[]>(() => {
    if (!rule) return []
    const edgeHits = result?.edgeHits
    const kindById = new Map(rule.nodes.map((n) => [n.id, n]))

    return rule.edges.map((e) => {
      const sourceNode = kindById.get(e.source)
      const ink = sourceNode ? kindInkBright(sourceNode.kind) : 'var(--canvas-edge)'
      const handle = e.sourceHandle ?? OUT_HANDLE
      const hits = edgeHits ? edgeHits[e.id] : undefined

      /* the route's own name, so a branch reads without opening the node */
      let label: string | undefined
      if (sourceNode) {
        const out = outHandlesOf(sourceNode).find((o) => o.id === handle)
        if (out && out.label !== OUT_HANDLE) label = out.label
      }
      if (hits !== undefined && hits > 0) {
        label = label ? `${label} · ${hits.toLocaleString()}` : hits.toLocaleString()
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: handle,
        type: 'smoothstep',
        className: hits ? 'rl-edge rl-edge--live' : 'rl-edge',
        zIndex: Z_RULE_EDGE,
        /* DASHED + arrowed: logic, as against the solid hairlines of structure */
        style: { stroke: ink, strokeWidth: 1.4, strokeDasharray: '6 4' },
        markerEnd: edgeMarker(ink),
        label,
        labelShowBg: !!label,
        labelBgPadding: [5, 2] as [number, number],
        labelBgBorderRadius: 2,
        labelStyle: {
          fill: 'var(--canvas-ink)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
        },
        labelBgStyle: { fill: 'var(--canvas-bg-deep)', fillOpacity: 0.92 },
      }
    })
  }, [rule, result])

  return { nodes, edges }
}
