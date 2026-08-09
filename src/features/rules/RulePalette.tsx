/* ============================================================
   THE PALETTE — drag a node onto the sheet, Miro-style.

   Chrome material: white cards, kind ink, mono tag. Each card
   carries the kind's own blurb from RULE_NODE_KINDS, so the
   palette teaches the vocabulary rather than just listing it.
   ============================================================ */

import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { RULE_NODE_KINDS } from '@/types/model'
import type { RuleNodeKind } from '@/types/model'
import { kindInk } from './describe'
import { nextNodePosition, setPaletteDragData } from './drop'
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

export function RulePalette() {
  const activeRuleId = useProjectStore((s) => s.activeRuleId)
  const addRuleNode = useProjectStore((s) => s.addRuleNode)
  /* a rule has exactly one entry — a second Start is a validator blocker,
     so the card that would create one is closed off before it happens */
  const hasStart = useProjectStore((s) =>
    activeRuleId ? !!s.rules[activeRuleId]?.nodes.some((n) => n.kind === 'start') : false,
  )

  const add = (kind: RuleNodeKind) => {
    if (!activeRuleId) return
    addRuleNode(activeRuleId, kind, nextNodePosition(activeRuleId))
  }

  return (
    <div className="rl-palette">
      <div className="rl-panel-head">
        <span className="mono-label">Node palette</span>
        <span className="rl-panel-count">{ORDER.length}</span>
      </div>

      {!activeRuleId ? (
        <p className="rl-palette-hint">
          Open a rule first — nodes are dropped onto the rule you are drawing.
        </p>
      ) : (
        <p className="rl-palette-hint">Drag onto the sheet, or click to drop one in.</p>
      )}

      <ul className="rl-palette-list">
        {ORDER.map((kind) => {
          const meta = RULE_NODE_KINDS[kind]
          const closed = !activeRuleId || (kind === 'start' && hasStart)
          return (
            <li key={kind}>
              <button
                type="button"
                className="rl-pcard"
                style={{ '--rl-ink-chrome': kindInk(kind) } as CSSProperties}
                draggable={!closed}
                aria-disabled={closed}
                title={
                  !activeRuleId
                    ? 'Open a rule to add nodes'
                    : kind === 'start' && hasStart
                      ? 'This rule already begins somewhere — one Start each'
                      : `${meta.label} — drag onto the sheet or click to add`
                }
                onDragStart={(e) => {
                  if (closed) {
                    e.preventDefault()
                    return
                  }
                  setPaletteDragData(e, kind)
                }}
                onClick={() => add(kind)}
                disabled={closed}
              >
                <span className="rl-pcard-top">
                  <span className="rl-pcard-tag">{meta.tag}</span>
                  <span className="rl-pcard-label">{meta.label}</span>
                  <span className="rl-pcard-grip" aria-hidden="true">
                    ⣿
                  </span>
                </span>
                <span className="rl-pcard-blurb">{meta.blurb}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
