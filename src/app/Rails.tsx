/* ============================================================
   OFF THE DEFAULT PATH — not mounted by `Shell.tsx`.

   The configurator draws tables you type straight into, so a
   340px column of schema controls beside them is exactly the
   clutter the reset removed. Nothing here is deleted: the file
   compiles, its styles are kept (see the OFF THE DEFAULT PATH
   block at the foot of `shell.css`), and bringing the track back
   is one line in the shell —

       <Rails view="sheet" reviewOpen={…} onCloseReview={…}
              rulesDrawn={…} />

   …plus whatever opens it. Read on for how the three claimants
   share the one track.
   ------------------------------------------------------------
   THE RIGHT RAIL — one track, three claimants.

   Entity inspector, review rail, results rail. They REPLACE each
   other; they never stack. Two panels of 340px side by side would
   leave the sheet under 500px on a 1280 screen, and the fixed
   340px track means whichever one is out, the stage never moves
   by a pixel.

   PRECEDENCE — results > review > inspector.

     1. RESULTS   the most transient and the most recently asked
                  for: you pressed RUN a second ago and reading the
                  answer was the entire point.
     2. REVIEW    deliberately opened from the CHECK stamp, and it
                  stays open across selections by design.
     3. INSPECTOR the resting state. It follows the pen — a rule
                  plate if the canvas has one under it, otherwise
                  `selection` — and neither rail above ever clears
                  either, so it comes back on exactly what was open.

   THE FRICTION THIS FIXES — with the review rail out, clicking an
   entity in the index looked like nothing happened: the selection
   changed, but the inspector it feeds was suppressed. We do NOT
   auto-close the rail on selection, because the review panel's own
   "go to entity" links re-aim that same selection — auto-closing
   would slam the rail shut on the user mid-review every time they
   followed a mark to its subject, which is the panel's single most
   used control. Instead the rail that WON names what it is standing
   on and offers one click back. The rule becomes legible instead of
   invisible, and following a mark still works.
   ============================================================ */

import { useLayoutEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import type { AccentKey } from '@/types/model'
import { ReviewPanel } from '@/features/review'
import {
  RuleInspector,
  RuleResultsRail,
  useRuleIssues,
  useRuleRun,
} from '@/features/rules'
import { setSelectedRuleNodeId, useSelectedRuleNodeId } from '@/features/whiteboard'
import { Inspector } from './Inspector'
import type { ShellView } from './view'

/** What the inspector tier would be showing if it were not suppressed. */
interface RailSlot {
  /** the panel's own name, for the button's assistive label */
  label: string
  /** the subject, as the user knows it */
  name: string
  accent: AccentKey | null
}

/* ------------------------------------------------------------ */
/* The yield strip                                              */
/* ------------------------------------------------------------ */

function RailYield({
  kicker,
  slot,
  actionLabel,
  onBack,
}: {
  kicker: string
  slot: RailSlot
  actionLabel: string
  onBack: () => void
}) {
  return (
    <div className="shell-yield">
      <span className="shell-yield-kicker mono-label">{kicker}</span>
      <span
        className="shell-yield-dot"
        style={
          {
            '--row-accent': slot.accent ? accentVar(slot.accent) : 'var(--ink-faint)',
          } as CSSProperties
        }
        aria-hidden="true"
      />
      <span className="shell-yield-name" title={`${slot.label} — ${slot.name}`}>
        {slot.name}
      </span>
      <button
        type="button"
        className="shell-yield-btn"
        aria-label={`${actionLabel} and return to the ${slot.label.toLowerCase()} on ${slot.name}`}
        title={`${actionLabel} — ${slot.name} is waiting underneath`}
        onClick={onBack}
      >
        Back
      </button>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* The RUN instrument                                           */
/* ------------------------------------------------------------ */

/** RUN, the validity stamp and the headline count, at the head of the rail
 *  that is already open on the rule.
 *
 *  The standalone `RULE · MOTOR FITMENT · [BOAT] · CHECKS ✓` band was
 *  deleted for spending a whole row of the screen on a restatement — but
 *  RUN went out with it, and nothing else in the app calls the engine, so
 *  no rule could be executed at all: no result, no hit chips on the plates,
 *  no results rail, no effects to apply. It comes back here, costing no
 *  row: kicker, rule name, the button, and a second line that reports only
 *  once there is something to report. Every part folds rather than widening
 *  the 340px track by a pixel.
 */
function RuleRunBar({ ruleId }: { ruleId: string }) {
  const name = useProjectStore((s) => s.rules[ruleId]?.name ?? '')
  const { blockers, ok } = useRuleIssues(ruleId)
  const { result, running, error, run, clear } = useRuleRun(ruleId)

  const rowsOut = result
    ? Object.values(result.views).reduce((n, v) => n + v.rows.length, 0)
    : 0

  return (
    <div className="shell-run">
      <span className="shell-run-kicker mono-label">Rule</span>
      <span className="shell-run-name" title={name}>
        {name}
      </span>
      {/* `.btn:disabled` kills pointer events, so a blocked RUN can carry no
          tooltip — the reason lives on the stamp below, which is always
          visible and never needs hovering to be read. */}
      <button
        type="button"
        className="btn btn-primary shell-run-go"
        onClick={run}
        disabled={running || !ok}
        title="Run this rule against the rows on the sheet"
      >
        {running ? 'Running…' : 'Run'}
      </button>

      <div className="shell-run-meta" aria-live="polite">
        <span
          className={`shell-run-check${ok ? ' is-ok' : ' is-blocked'}`}
          title={
            ok
              ? 'Every node is configured — this rule can run'
              : blockers.map((b) => b.message).join('\n')
          }
        >
          {ok ? 'Checks ✓' : `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`}
        </span>

        {error ? (
          <span className="shell-run-note is-bad" title={error}>
            The run stopped
          </span>
        ) : result ? (
          <span className="shell-run-note">
            <b className="shell-run-n">{rowsOut.toLocaleString()}</b> row
            {rowsOut === 1 ? '' : 's'} out
          </span>
        ) : (
          <span className="shell-run-note is-idle">not run yet</span>
        )}

        {result || error ? (
          <button
            type="button"
            className="btn btn-ghost shell-run-clear"
            title="Forget the last run — the hit chips come off the plates with it"
            onClick={clear}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* The track                                                    */
/* ------------------------------------------------------------ */

export interface RailsProps {
  view: ShellView
  reviewOpen: boolean
  onCloseReview: () => void
  /** the sheet is drawing the active rule's flow (RULES or BOTH layer) */
  rulesDrawn: boolean
}

export function Rails({ view, reviewOpen, onCloseReview, rulesDrawn }: RailsProps) {
  const selection = useProjectStore((s) => s.selection)
  const entities = useProjectStore((s) => s.entities)
  const groups = useProjectStore((s) => s.groups)
  const rules = useProjectStore((s) => s.rules)
  const activeRuleId = useProjectStore((s) => s.activeRuleId)

  /* The canvas owns which plate is under the pen and deliberately does not
     clear `selection` when one is clicked — "which rail is out is the
     shell's decision". This is that decision: a plate you just clicked
     outranks an entity you were reading, because it is the newer act. */
  const selectedRuleNodeId = useSelectedRuleNodeId()

  /* ...and "newer" has to be true, not assumed. Nothing was ever lifting
     the pen off a plate, so a plate clicked once outranked every entity
     clicked after it: the card lit up on the sheet, the canvas panned to
     it, and the rail went on showing the plate — the entity's schema
     never opened and nothing on screen said why. Selecting an entity or a
     zone is the newer act, so it clears the plate, here, for every route
     into `selection` at once: the index, the card on the sheet, and the
     review rail's own "go to entity" links. A LAYOUT effect, so the swap
     lands in the same frame as the click rather than as a flash of the
     panel the user just moved off. */
  useLayoutEffect(() => {
    if (selection?.kind === 'entity' || selection?.kind === 'group') {
      setSelectedRuleNodeId(null)
    }
  }, [selection])

  /* The run result is module-global and keyed by rule, so the rail, the RUN
     instrument and the plates on the sheet can never disagree about a run. */
  const { result } = useRuleRun(activeRuleId)

  /* Dismissal is per RESULT, never sticky: we remember the exact result
     object that was waved away, so the next RUN — a fresh object — opens
     the rail again with no reset bookkeeping. */
  const [dismissed, setDismissed] = useState<unknown>(null)
  const resultsOpen = !!activeRuleId && !!result && dismissed !== result

  /* -- what the inspector tier holds -------------------------- */
  /* TABLE hands data editing to the grid, so the inspector never returns
     there — and therefore never counts as something being suppressed. */
  const isTable = view === 'table'
  const activeRule = activeRuleId ? rules[activeRuleId] : undefined
  /* a plate id is only meaningful while its flow is on the sheet */
  const rulePlate = rulesDrawn && !!activeRule && !!selectedRuleNodeId
  /* a rule opened from the index but no plate picked yet: the rule
     inspector's own "click a node on the sheet" state is the right answer */
  const ruleOpened = !!activeRule && selection?.kind === 'rule' && selection.id === activeRuleId
  const ruleInspector = !isTable && !!activeRuleId && (rulePlate || ruleOpened)

  let slot: RailSlot | null = null
  if (ruleInspector && activeRule) {
    slot = {
      label: 'Rule inspector',
      name: activeRule.name,
      accent: entities[activeRule.rootEntityId]?.accent ?? null,
    }
  } else if (!isTable && selection?.kind === 'entity') {
    const entity = entities[selection.id]
    if (entity) slot = { label: 'Inspector', name: entity.name, accent: entity.accent }
  } else if (!isTable && selection?.kind === 'group') {
    const group = groups[selection.id]
    if (group) slot = { label: 'Zone card', name: group.name, accent: group.accent }
  }

  /* -- 1. RESULTS -------------------------------------------- */
  if (resultsOpen && activeRuleId) {
    /* name what results is standing on: the review rail if that is open,
       otherwise whatever the inspector tier was holding */
    const under: RailSlot | null = reviewOpen
      ? { label: 'Review rail', name: 'Red-pencil review', accent: null }
      : slot
    return (
      /* --flush: the results panel paints its own left hairline */
      <div className="shell-rail shell-rail--flush">
        {under ? (
          <RailYield
            kicker="Results"
            slot={under}
            actionLabel="Close the results rail"
            onBack={() => setDismissed(result)}
          />
        ) : null}
        {/* onClose hides the rail only — the hit chips stay on the plates,
            because the numbers on the sheet are the run's other half */}
        <RuleResultsRail ruleId={activeRuleId} onClose={() => setDismissed(result)} />
      </div>
    )
  }

  /* -- 2. REVIEW --------------------------------------------- */
  if (reviewOpen) {
    return (
      <div className="shell-rail">
        {slot ? (
          <RailYield
            kicker="Reviewing"
            slot={slot}
            actionLabel="Close the review rail"
            onBack={onCloseReview}
          />
        ) : null}
        <ReviewPanel onClose={onCloseReview} />
      </div>
    )
  }

  /* -- 3. INSPECTOR ------------------------------------------ */
  if (isTable) return null

  if (ruleInspector && activeRuleId) {
    return (
      <div className="shell-rail">
        {/* RUN rides at the head of the rail, on the rule the panel below
            is configuring — the only place in the app the engine can be
            called from. */}
        <RuleRunBar ruleId={activeRuleId} />
        {/* the track owns the scroll; the rules panel just fills it.
            `nodeId` may be stale — the plate can be deleted underneath
            it — and RuleInspector draws a designed state for that. */}
        <div className="shell-rail-scroll">
          <RuleInspector ruleId={activeRuleId} nodeId={rulePlate ? selectedRuleNodeId : null} />
        </div>
      </div>
    )
  }

  /* renders nothing at all when the selection is neither entity nor zone */
  return <Inspector />
}
