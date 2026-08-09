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
   add the NEXT step after the one you are looking at — see
   `anchorNodeId` below.

   A CLICKED CHIP USED TO LAND ON THE VIEWPORT CENTRE, and the camera
   does not move when a node is added, so every click landed on the
   same 16px cell: four steps added, one plate visible, three buried
   under it, no undo. Clicks now go through `addRuleNodeAfter`, which
   places the plate after the anchor and steps clear of anything
   already there.
   ============================================================ */

import { useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { RULE_NODE_KINDS } from '@/types/model'
import type { RuleNode, RuleNodeKind, XY } from '@/types/model'
import { kindInk } from './describe'
import { addRuleNodeAfter, setPaletteDragData } from './drop'
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
   * Flow-space point the FIRST plate of an empty rule should land on —
   * the centre of the host's viewport, so the one plate on the paper is
   * where the reader is looking:
   *
   * ```ts
   * const dropPoint = useCallback(() => {
   *   const r = paneRef.current!.getBoundingClientRect()
   *   return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
   * }, [rf])
   * ```
   *
   * Once the rule HAS plates the point is not used: a clicked chip lands
   * after `anchorNodeId`, never on the camera centre. Omit it and the
   * first plate lands at the flow origin.
   */
  dropPoint?: () => XY
  /**
   * The plate the reader is on — the one the inspector is open on. A
   * clicked chip lands one pitch to its right and is wired to it when
   * that wire is unambiguous. Omit it and the anchor is the last plate
   * drafted.
   */
  anchorNodeId?: string | null
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
  anchorNodeId = null,
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
      const node = addRuleNodeAfter(
        activeRuleId,
        kind,
        anchorNodeId,
        dropPoint ? dropPoint() : undefined,
      )
      if (node) onNodeAdded?.(node)
    },
    [activeRuleId, anchorNodeId, dropPoint, onNodeAdded],
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
