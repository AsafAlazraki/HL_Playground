/* ============================================================
   THE PALETTE STRIP — a floating instrument panel, bottom-centre
   of the blueprint. The node palette stops being a column that
   eats the left panel and becomes a tool tray on the sheet.

   Chrome material (white panel, marine ink, hairlines) deliberately
   floated ON the navy, the way a real instrument sits on a chart
   table. Each chip is ~76px: mono tag + short label in the kind's
   ink. Hover or keyboard focus lifts the kind's own blurb as a
   tooltip ABOVE the strip, so the vocabulary is still taught.

   Drag a chip onto the sheet (same dataTransfer payload the old
   palette wrote, so `onPaletteDrop` is untouched), or click it to
   drop one at the viewport centre — see `dropPoint` below.
   ============================================================ */

import { useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { RULE_NODE_KINDS } from '@/types/model'
import type { RuleNode, RuleNodeKind, XY } from '@/types/model'
import { kindInk } from './describe'
import { addRuleNodeAt, nextNodePosition, setPaletteDragData } from './drop'
import './rules.css'

const ORDER: RuleNodeKind[] = [
  'start',
  'match',
  'condition',
  'filter',
  'find',
  'loop',
  'action',
  'output',
]

/** Room for one word at 76px — the tag carries the rest of the identity. */
const SHORT_LABEL: Record<RuleNodeKind, string> = {
  start: 'Start',
  match: 'Match',
  condition: 'Route',
  filter: 'Filter',
  find: 'Linked',
  loop: 'For each',
  action: 'Action',
  output: 'Output',
}

export interface RulePaletteStripProps {
  /**
   * Flow-space point a CLICKED chip should land on, centred and snapped.
   * The whiteboard passes the centre of its own viewport:
   *
   * ```ts
   * const dropPoint = useCallback(() => {
   *   const r = paneRef.current!.getBoundingClientRect()
   *   return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
   * }, [rf])
   * ```
   *
   * Omit it and clicked chips fall back to `nextNodePosition` — one plate
   * pitch to the right of the last node drafted.
   */
  dropPoint?: () => XY
  /**
   * Fired after a chip creates a node. The whiteboard uses this to select
   * the new plate and to mark the camera as user-touched, exactly as it
   * already does in its `onDrop` handler.
   */
  onNodeAdded?: (node: RuleNode) => void
  /** Extra classes — the host may re-position the strip if it needs to. */
  className?: string
}

/**
 * The primary node palette. Mount it inside the canvas wrapper (a
 * `position: relative` box); the strip positions itself bottom-centre.
 */
export function RulePaletteStrip({
  dropPoint,
  onNodeAdded,
  className,
}: RulePaletteStripProps) {
  const activeRuleId = useProjectStore((s) => s.activeRuleId)
  /* a rule has exactly one entry — a second Start is a validator blocker,
     so the chip that would create one is closed off before it happens */
  const hasStart = useProjectStore((s) =>
    activeRuleId ? !!s.rules[activeRuleId]?.nodes.some((n) => n.kind === 'start') : false,
  )

  const add = useCallback(
    (kind: RuleNodeKind) => {
      if (!activeRuleId) return
      const point = dropPoint ? dropPoint() : null
      const node = point
        ? addRuleNodeAt(activeRuleId, kind, point)
        : useProjectStore
            .getState()
            .addRuleNode(activeRuleId, kind, nextNodePosition(activeRuleId))
      if (node) onNodeAdded?.(node)
    },
    [activeRuleId, dropPoint, onNodeAdded],
  )

  return (
    /* nodrag/nopan/nowheel: React Flow must not read a chip press as a
       pan of the sheet underneath it */
    <div
      className={`rl-strip nodrag nopan nowheel${className ? ` ${className}` : ''}`}
      role="toolbar"
      aria-label="Rule node palette"
    >
      <span className="rl-strip-title" aria-hidden="true">
        Nodes
      </span>

      {!activeRuleId ? (
        <p className="rl-strip-empty">Open a rule to draw on the sheet</p>
      ) : (
        /* presentational: the chips are the toolbar's widgets, the list
           markup is only a layout scaffold */
        <ul className="rl-strip-list" role="presentation">
          {ORDER.map((kind) => {
            const meta = RULE_NODE_KINDS[kind]
            const closed = kind === 'start' && hasStart
            return (
              <li className="rl-strip-item" key={kind}>
                <button
                  type="button"
                  className="rl-chipbtn"
                  style={{ '--rl-ink-chrome': kindInk(kind) } as CSSProperties}
                  draggable={!closed}
                  /* aria-disabled, not `disabled`: a closed chip stays
                     focusable so a keyboard reaches the reason why */
                  aria-disabled={closed}
                  aria-label={
                    closed
                      ? `${meta.label} — this rule already begins somewhere, one Start each`
                      : `${meta.label} — ${meta.blurb}`
                  }
                  onDragStart={(e) => {
                    if (closed) {
                      e.preventDefault()
                      return
                    }
                    setPaletteDragData(e, kind)
                  }}
                  onClick={() => {
                    if (closed) return
                    add(kind)
                  }}
                >
                  <span className="rl-chipbtn-tag">{meta.tag}</span>
                  <span className="rl-chipbtn-label">{SHORT_LABEL[kind]}</span>
                </button>

                {/* the blurb, lifted ABOVE the strip on hover / focus.
                    Decorative: the button's aria-label already carries it. */}
                <span className="rl-strip-tip" aria-hidden="true">
                  <b className="rl-strip-tip-head">{meta.label}</b>
                  {closed
                    ? 'This rule already begins somewhere — one Start each.'
                    : meta.blurb}
                  <i className="rl-strip-tip-pin" aria-hidden="true" />
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <span className="rl-strip-hint" aria-hidden="true">
        drag or click
      </span>
    </div>
  )
}
