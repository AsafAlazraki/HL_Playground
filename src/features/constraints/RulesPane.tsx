/* ============================================================
   THE RULES PANE — the list, and the sentence that makes new ones.

   This is the default rule surface. It replaces the flow-chart
   builder on the default path (CONFIGURATOR_SPEC §4b): no canvas, no
   nodes, no palette, no inspector. One sentence per rule, one switch
   per rule, one reason per rule.

   It fills whatever box it is given and scrolls itself, exactly like
   `views/ViewPage`, and brings its own stylesheet.
   ============================================================ */

import { useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Article, Table } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { ConstraintDef } from '@/types/model'
import { useConstraints } from './constraintDefs'
import { NewRuleSentence } from './NewRuleSentence'
import { RuleCard } from './RuleCard'
import { evaluateConstraints, sortConstraints } from './state'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

export function RulesPane(): ReactElement {
  const constraints = useConstraints()
  const ctx = useSentenceCtx()
  const reduced = useReducedMotion()
  const [openId, setOpenId] = useState<string | null>(null)

  const statuses = useMemo(
    () => evaluateConstraints(constraints, ctx),
    [constraints, ctx],
  )
  const sorted = useMemo(
    () => sortConstraints(constraints, statuses),
    [constraints, statuses],
  )

  /* Conflicts surface first — but nothing may leap out from under a
     person mid-edit, so the order is frozen while a card is open and
     settles the moment they are done. */
  const frozen = useRef<string[]>([])
  if (openId === null) frozen.current = sorted.map((c) => c.id)
  const list = stableOrder(sorted, frozen.current)

  const conflicts = Object.values(statuses).filter((s) => s.conflicts > 0).length
  const noColumns = ctx.concepts.length === 0

  return (
    <section className="cn-root">
      <div className="cn-sheet">
        <span className="cn-tick cn-tick--tl" aria-hidden />
        <span className="cn-tick cn-tick--tr" aria-hidden />

        <header className="cn-head">
          <p className="cn-eyebrow">BUSINESS RULES</p>
          <h2 className="cn-title">What must always be true</h2>
          <p className="cn-lede">
            Every rule is one sentence. Change a word and the rule changes. Switch one off and
            everything it ruled out comes straight back.
          </p>
          {constraints.length > 0 && (
            <p className="cn-count">
              {constraints.length} rule{constraints.length === 1 ? '' : 's'}
              {conflicts > 0 && (
                <>
                  {' · '}
                  <span className="cn-count-bad">
                    {conflicts} conflict{conflicts === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </p>
          )}
        </header>

        {noColumns ? (
          <NoColumns />
        ) : (
          <>
            <NewRuleSentence onAdded={setOpenId} />

            {list.length === 0 ? (
              <NoRules />
            ) : (
              <ul className="cn-list">
                {list.map((constraint, i) => (
                  <motion.li
                    key={constraint.id}
                    className="cn-list-item"
                    initial={reduced ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            type: 'spring',
                            stiffness: 340,
                            damping: 34,
                            mass: 0.9,
                            delay: Math.min(i, 6) * 0.02,
                          }
                    }
                  >
                    <RuleCard
                      constraint={constraint}
                      status={statuses[constraint.id]}
                      open={openId === constraint.id}
                      onOpen={(open) => setOpenId(open ? constraint.id : null)}
                    />
                  </motion.li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* Empty states — both of them say what to do next            */
/* ---------------------------------------------------------- */

function NoColumns(): ReactElement {
  return (
    <div className="cn-void">
      <span className="cn-void-mark">
        <Table size={ICON_SIZE.large} weight={weightFor(ICON_SIZE.large)} />
      </span>
      <p className="cn-void-title">Rules are made of your columns</p>
      <p className="cn-void-note">
        Make a table first. Its columns become the words you write rules with.
      </p>
    </div>
  )
}

function NoRules(): ReactElement {
  return (
    <div className="cn-void cn-void--small">
      <span className="cn-void-mark">
        <Article size={ICON_SIZE.medium} weight={weightFor(ICON_SIZE.medium)} />
      </span>
      <p className="cn-void-note">
        No rules yet. Finish the sentence above and it becomes your first.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------- */

/** Keep the previous order, put anything new at the top, and drop
 *  what is gone. */
function stableOrder(sorted: ConstraintDef[], order: string[]): ConstraintDef[] {
  if (order.length === 0) return sorted
  const known = new Set(order)
  const fresh = sorted.filter((c) => !known.has(c.id))
  const kept = order
    .map((id) => sorted.find((c) => c.id === id))
    .filter((c): c is ConstraintDef => Boolean(c))
  return [...fresh, ...kept]
}
