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
import { motion } from 'motion/react'
import { Article, Table } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { SPRING_QUICK, transitionFor, useStillness } from '@/features/views/stillness'
import type { ConstraintDef } from '@/types/model'
import { useConstraints } from './constraintDefs'
import { LeftOutList } from './LeftOutList'
import { NewRuleSentence } from './NewRuleSentence'
import { RegistrationTheme } from './RegistrationTheme'
import { RuleCard } from './RuleCard'
import { TrailerFitmentPanel } from './TrailerFitmentPanel'
import { WorkbookRuleList } from './WorkbookRuleList'
import { evaluateConstraints, sortConstraints } from './state'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

export function RulesPane(): ReactElement {
  const constraints = useConstraints()
  const ctx = useSentenceCtx()
  /* THE TYPING GATE, WHICH THIS PANE USED TO BE DEAF TO. It asked
     `useReducedMotion()` directly, so it honoured the operating
     system and nothing else — and this is a pane whose whole job is
     editing sentences in place. The list re-sorts as a rule's status
     changes, which is precisely the reflow-under-a-caret that
     `stillness` exists to stop. One shared boolean now, so the pane
     freezes for the same reasons every other surface does. */
  const { still } = useStillness()
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

  /* Which workbook seeds actually became rules. The seed's own
     `blocked` is only a default: the moment the contract grows what a
     rule needs, the id appears here and the list must say "checked"
     rather than keep repeating a stale excuse. */
  const liveIds = useMemo(() => new Set(constraints.map((c) => c.id)), [constraints])

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
          {/* NAME THE OTHER SURFACE. There are two places to write a rule
              and they do different jobs — this one states a LIMIT, the
              other DERIVES a list. A person who opens the wrong one does
              not discover their mistake; they conclude the thing they
              wanted cannot be done. So each pane says what it is not, and
              points at the door that is. Both doors sit in the panel to
              the left at the same time, so naming it is enough to find
              it. */}
          {/* THE DOOR IT POINTS AT IS ON THE BAR, AND IT IS CALLED
              FITMENT. Two things had gone stale in one sentence: there
              is no panel to the left any more (`LeftPanel` is imported
              by nothing since the masthead went), and 4c4a3e2 renamed
              this door — b5ac6de's "Fitment is called Fitment
              everywhere" missed this copy. Sending somebody left to
              look for a name that no longer exists is worse than not
              pointing at all. */}
          <p className="cn-lede cn-lede--other">
            These are limits — things every row must keep. To work out what goes
            <em> with</em> something, use <b>Fitment</b> on the bar.
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
                    initial={still ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    /* This was a hand-typed copy of the old default
                       spring — drift, not a third opinion, and it went
                       stale the moment the house set changed. A rule
                       card arriving in a list is the same event as a
                       row arriving in a block, so it takes the same
                       config by import. The 20ms stagger, capped at
                       seven cards, stays: it is inside
                       emil-design-eng's 30–80ms guidance once the
                       spring's own settle is counted, and capping it
                       stops a twenty-rule list from taking half a
                       second to finish arriving. */
                    transition={{
                      ...transitionFor(still, SPRING_QUICK),
                      delay: still ? 0 : Math.min(i, 6) * 0.02,
                    }}
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

            {/* THE WORKBOOK'S OWN RULES, ALWAYS DRAWN. They are listed
                after the rules a person authored, because these are
                found rather than written — but they are never hidden
                behind an empty state. Six rules were mined out of the
                price file with their cell references, none of them can
                be stated as a sentence yet, and the pane answered "No
                rules yet." That was false, and it is the reason this
                block exists: what the system does NOT check is a fact
                a person needs, because otherwise they assume it does. */}
            <WorkbookRuleList liveIds={liveIds} />

            {/* THE ONE RULE IN THE PRICE FILE THAT ACTUALLY PICKS
                SOMETHING, and it goes directly under the list that
                names it. F8 — a trailer's series heading says which
                boat brand it is built for — is the only candidate in
                either workbook that both holds at 100% and rejects
                something, and its card in the list above said "Not
                checked yet" for as long as the app had no surface for
                it. This is that surface, and it draws the measurement
                rather than a claim: how much of the trailer catalogue
                each brand's heading leaves standing, computed from the
                loaded sheet on every render. The weight floor is on it
                too, labelled a floor, because a check that never
                narrows anything looks like the selector until somebody
                says otherwise. */}
            <TrailerFitmentPanel />

            {/* THE THEMES, AND THE DECISIONS. Both sit here for the
                same reason the workbook rules do: this pane is where
                the app is honest about what it does and does not do.

                REGISTRATION is the owner's own example of a common
                theme — one concept the boat and the trailer share —
                and it is drawn once, with the four things it may not
                do and the rows that disagree with it today.

                WHAT IS NOT IN HERE answers the other half. A person
                who knows the price file will look for the service
                schedule; without this they cannot tell a decision
                from a gap, and both guesses cost us.

                NEITHER ADDS A DOOR. Joins and views are never doors
                on the navigation bar, and a fee register is not a
                place in the business — these are blocks on a surface
                that already exists. Both are exported from this
                feature's index so a module page can draw them too. */}
            <RegistrationTheme />
            <LeftOutList />
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
