/* ============================================================
   Rule node plates — the LOGIC material on the blueprint.

   Entity cards are white paper with solid edges: structure.
   These are tinted plates with a notched left edge and dashed,
   arrowed edges: logic. The two must never be mistaken for one
   another at a glance.

   A plate STATES ITS OWN LOGIC IN FULL. No summarising, no
   "open me to find out": every clause, every branch, every
   output column is drawn here, so the sheet is readable without
   a single click. The inspector remains the place for EDITING.
   ============================================================ */

import { memo } from 'react'
import type { ComponentType, CSSProperties } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, NodeTypes } from '@xyflow/react'
import { RULE_NODE_KINDS } from '@/types/model'
import type { RuleNodeKind } from '@/types/model'
import { accentInkBright, kindInk, kindInkBright } from './describe'
import type { OutHandle, PlateChunk, PlateLine, PlateRoute } from './describe'
import type { RuleNodeData } from './useRuleGraph'
import { ruleNodeTypeKey } from './useRuleGraph'
import './rule-nodes.css'

/* ------------------------------------------------------------ */
/* Marks                                                        */
/* ------------------------------------------------------------ */

/** The reviewer's red pencil: a quick ring round something unfinished. */
function RedMark({ title }: { title: string }) {
  return (
    <span className="rl-mark" title={title} role="img" aria-label={title}>
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        <path
          d="M10.6 3.1C8.9 1.9 5.6 1.7 3.9 3.2c-1.7 1.5-1.5 5 .3 6.4 1.8 1.4 5.6 1.3 7-.4 1.3-1.6.9-4.5-1-5.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

/* ------------------------------------------------------------ */
/* Clause typography                                            */
/* ------------------------------------------------------------ */

function Chunk({ chunk }: { chunk: PlateChunk }) {
  if (chunk.t === 'stamp') {
    /* THE HUE ARRIVES AS A VARIABLE, NOT AS A COLOUR. It used to be set
       straight onto `color`, which no stylesheet could then correct — and
       on paper an equal-luminance kind hue over a tint of itself measured
       3.4–3.9:1. rule-nodes.css now composites it toward the plate's ink,
       which it can only do if the hue is a custom property. */
    return (
      <span
        className="rl-ck rl-ck--stamp"
        style={{ '--rl-stamp-ink': accentInkBright(chunk.accent) } as CSSProperties}
        title={chunk.title ?? chunk.text}
      >
        {chunk.text}
      </span>
    )
  }
  return (
    <span className={`rl-ck rl-ck--${chunk.t}`} title={chunk.text}>
      {chunk.text}
    </span>
  )
}

function Chunks({ chunks }: { chunks: PlateChunk[] }) {
  return (
    <>
      {chunks.map((c, i) => (
        <Chunk key={`${c.t}-${i}-${c.text}`} chunk={c} />
      ))}
    </>
  )
}

function Line({ line }: { line: PlateLine }) {
  const className = [
    'rl-line',
    line.muted ? 'rl-line--muted' : '',
    line.missing ? 'rl-line--missing' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={className}>
      {line.lead ? <span className="rl-line-lead">{line.lead}</span> : null}
      <span className="rl-line-body">
        <Chunks chunks={line.chunks} />
      </span>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* Routes — a branch drawn level with the handle it leaves by    */
/* ------------------------------------------------------------ */

function RouteRow({
  out,
  route,
  isConnectable,
}: {
  out: OutHandle
  route?: PlateRoute
  isConnectable: boolean
}) {
  const muted = out.muted || route?.muted
  const className = [
    'rl-route',
    muted ? 'rl-route--muted' : '',
    route?.missing ? 'rl-route--missing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <span className="rl-route-label" title={route?.label ?? out.label}>
        {route?.label ?? out.label}
      </span>
      {route?.chunks ? (
        <span className="rl-route-test">
          <Chunks chunks={route.chunks} />
        </span>
      ) : null}
      {/* the handle IS the route's diamond — one mark, one anchor */}
      <Handle
        type="source"
        id={out.id}
        position={Position.Right}
        className="rl-port rl-port--route"
        isConnectable={isConnectable}
      />
    </div>
  )
}

/* ------------------------------------------------------------ */
/* The plate                                                    */
/* ------------------------------------------------------------ */

function Plate({ data, selected, isConnectable }: NodeProps) {
  const d = data as RuleNodeData
  const style = {
    '--rl-ink': kindInkBright(d.kind),
    '--rl-ink-chrome': kindInk(d.kind),
  } as CSSProperties

  const spec = d.spec
  const many = d.outs.length > 1
  const single = d.outs.length === 1 ? d.outs[0] : undefined
  const routeById = new Map((spec.routes ?? []).map((r) => [r.id, r]))
  const flagged = !d.configured || d.blocked || !!d.warning
  const markTitle = d.warning
    ? d.warning
    : d.blocked
      ? 'This node blocks the rule from running'
      : 'Not configured yet'

  /* `FIT   MATCH · Motor` — the mock's own header line */
  const heading = spec.subject ? `${d.kindLabel} · ${spec.subject}` : d.kindLabel

  const className = [
    'rl-node',
    `rl-node--${d.kind}`,
    selected ? 'is-selected' : '',
    flagged ? 'is-flagged' : '',
    d.hits !== null ? 'is-hit' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} style={style}>
      <i className="rl-plate" aria-hidden="true" />
      <i className="rl-plate-fill" aria-hidden="true" />

      <div className="rl-node-content">
        <header className="rl-node-head">
          <span className="rl-node-tag">{d.tag}</span>
          <span className="rl-node-kind" title={heading}>
            {heading}
          </span>
          {d.hitText ? (
            <span className="rl-node-hits" title="Rows that reached this node">
              {d.hitText}
            </span>
          ) : null}
          {flagged ? <RedMark title={markTitle} /> : null}
        </header>

        {spec.lines.length ? (
          <div className="rl-lines">
            {spec.lines.map((l) => (
              <Line key={l.id} line={l} />
            ))}
          </div>
        ) : null}

        {spec.chips && spec.chips.length ? (
          <div className="rl-chips">
            {spec.chips.map((c) => (
              <span className="rl-chip" key={c.id} title={`${c.stamp} · ${c.label}`}>
                <span
                  className="rl-chip-stamp"
                  style={{ '--rl-stamp-ink': accentInkBright(c.accent) } as CSSProperties}
                >
                  {c.stamp}
                </span>
                <span className="rl-chip-label">{c.label}</span>
              </span>
            ))}
            {spec.more ? (
              <span className="rl-chip rl-chip--more">{`+${spec.more} more`}</span>
            ) : null}
          </div>
        ) : null}

        {many ? (
          <div className="rl-routes">
            {d.outs.map((o) => (
              <RouteRow
                key={o.id}
                out={o}
                route={routeById.get(o.id)}
                isConnectable={isConnectable}
              />
            ))}
          </div>
        ) : null}

        {spec.footer ? <div className="rl-node-foot">{spec.footer}</div> : null}
      </div>

      {d.hasTarget ? (
        <Handle
          type="target"
          position={Position.Left}
          className="rl-port rl-port--in"
          isConnectable={isConnectable}
        />
      ) : null}

      {single ? (
        <Handle
          type="source"
          id={single.id}
          position={Position.Right}
          className="rl-port rl-port--out"
          isConnectable={isConnectable}
        />
      ) : null}
    </div>
  )
}

const PlateNode = memo(Plate)

/* ------------------------------------------------------------ */
/* One component per kind                                       */
/* ------------------------------------------------------------ */

/* Each kind gets its own component so React Flow can key on the node
   type and so future kind-specific chrome has an obvious home. The
   plate itself is shared — the difference between kinds is ink, tag
   and the shape of their out-handles, all of which arrive in data. */

const RuleStartNode = (p: NodeProps) => <PlateNode {...p} />
const RuleMatchNode = (p: NodeProps) => <PlateNode {...p} />
const RuleConditionNode = (p: NodeProps) => <PlateNode {...p} />
const RuleFilterNode = (p: NodeProps) => <PlateNode {...p} />
const RuleFindNode = (p: NodeProps) => <PlateNode {...p} />
const RuleLoopNode = (p: NodeProps) => <PlateNode {...p} />
const RuleActionNode = (p: NodeProps) => <PlateNode {...p} />
const RuleOutputNode = (p: NodeProps) => <PlateNode {...p} />

export const RULE_NODE_COMPONENTS: Record<RuleNodeKind, ComponentType<NodeProps>> = {
  start: RuleStartNode,
  match: RuleMatchNode,
  condition: RuleConditionNode,
  filter: RuleFilterNode,
  find: RuleFindNode,
  loop: RuleLoopNode,
  action: RuleActionNode,
  output: RuleOutputNode,
}

/** React Flow node types for the rules layer — keys are `rule-<kind>`. */
export const ruleNodeTypes: NodeTypes = Object.fromEntries(
  (Object.keys(RULE_NODE_KINDS) as RuleNodeKind[]).map((k) => [
    ruleNodeTypeKey(k),
    RULE_NODE_COMPONENTS[k],
  ]),
)
