/* ============================================================
   RULE TOOLBAR — the instrument strip above the sheet.

   Layer-agnostic: it knows a rule id and nothing about where it
   is mounted. RUN, the validity stamp, and the headline numbers
   from the last run.

   IT MUST NOT SAY TWO OPPOSITE THINGS AT ONCE. `CHECKS ✓`, titled
   "every node is configured — this rule can run", used to sit beside
   `6 NOTES`, whose notes read "Output is not connected to the Start
   node, so it never runs" — and RUN then answered "no result sets".
   "No blockers" is not "ready": a rule is ready when the Start node
   can actually REACH something that produces an answer, so that is
   what the stamp reads (`ruleReach`).

   AND THE NOTES ARE READABLE. They were a `title` on a chip that looks
   like a button, so the one gesture anybody tried — clicking it — did
   nothing at all.
   ============================================================ */

import { useMemo, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import type { CSSProperties } from 'react'
import { sourceEntityOf } from './describe'
import { ruleReach, useRuleIssues } from './useRuleIssues'
import { useRuleRun } from './useRuleRun'
import './rules.css'

export function RuleToolbar({ ruleId }: { ruleId: string }) {
  const rule = useProjectStore((s) => s.rules[ruleId])
  const entities = useProjectStore((s) => s.entities)
  const { blockers, advisories, ok } = useRuleIssues(ruleId)
  const { result, running, error, run, clear } = useRuleRun(ruleId)
  const [notesOpen, setNotesOpen] = useState(false)
  const reach = useMemo(() => ruleReach(rule), [rule])

  if (!rule) return null

  /* wired up = the Start node can get to something that produces an
     answer: a result table, or a write. Anything else is a drawing. */
  const wired = reach.reachesOutput || reach.reachesAction
  const notes = [...blockers, ...advisories]

  const source = sourceEntityOf(rule, entities)
  const views = result ? Object.keys(result.views).length : 0
  const rowsOut = result
    ? Object.values(result.views).reduce((n, v) => n + v.rows.length, 0)
    : 0
  const effects = result ? result.effects.length : 0
  const warnings = result ? result.warnings.length : 0

  return (
    <div className="rl-toolbar">
      <span className="mono-label rl-toolbar-lab">Rule</span>
      <span className="rl-toolbar-name block-heading" title={rule.name}>
        {rule.name}
      </span>

      {source ? (
        <span
          className="rl-stamp"
          style={{ '--rl-stamp-ink': accentVar(source.accent) } as CSSProperties}
          title="The table this rule walks"
        >
          {source.name}
        </span>
      ) : (
        <span className="rl-stamp rl-stamp--none">no table</span>
      )}

      <span
        className={`rl-check${!ok ? ' is-blocked' : wired ? ' is-ok' : ' is-advisory'}`}
        title={
          !ok
            ? `Fix ${blockers.length === 1 ? 'this' : 'these'} before running:\n${blockers
                .map((b) => `· ${b.message}`)
                .join('\n')}`
            : wired
              ? 'Every step is set up and the path from Start reaches an answer'
              : 'Nothing is set up wrongly, but Start does not reach an Output or an Action yet — a run would come back with nothing. Join the steps up.'
        }
      >
        {!ok
          ? `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`
          : wired
            ? 'Checks ✓'
            : 'Not joined up'}
      </span>

      {notes.length > 0 ? (
        <button
          type="button"
          className="rl-check rl-notebtn is-advisory"
          aria-expanded={notesOpen}
          onClick={() => setNotesOpen((v) => !v)}
        >
          {notes.length} note{notes.length === 1 ? '' : 's'}
        </button>
      ) : null}

      {notesOpen && notes.length > 0 ? (
        <ul className="rl-notelist">
          {notes.map((n, i) => (
            <li
              className={`rl-noteitem${n.severity === 'blocker' ? ' is-blocker' : ''}`}
              key={`${n.nodeId ?? ''}-${i}`}
            >
              <span className="rl-noteitem-tag">
                {n.severity === 'blocker' ? 'Blocks' : 'Note'}
              </span>
              <span>{n.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <span className="rl-toolbar-gap" />

      {result ? (
        <span className="rl-readout" aria-live="polite">
          <span className="rl-readout-n">{rowsOut.toLocaleString()}</span> rows
          <span className="rl-readout-sep">·</span>
          <span className="rl-readout-n">{views}</span> view{views === 1 ? '' : 's'}
          {effects > 0 ? (
            <>
              <span className="rl-readout-sep">·</span>
              <span className="rl-readout-n">{effects.toLocaleString()}</span> pending
            </>
          ) : null}
          {warnings > 0 ? (
            <>
              <span className="rl-readout-sep">·</span>
              <span className="rl-readout-warn">
                {warnings} warning{warnings === 1 ? '' : 's'}
              </span>
            </>
          ) : null}
        </span>
      ) : null}

      {error ? (
        <span className="rl-readout rl-readout-warn" title={error}>
          Run failed
        </span>
      ) : null}

      {result || error ? (
        <button type="button" className="btn btn-ghost" onClick={clear}>
          Clear
        </button>
      ) : null}

      <button
        type="button"
        className="btn btn-primary rl-run"
        onClick={run}
        disabled={running || !ok}
        title={
          ok
            ? 'Run this rule against the rows on the sheet'
            : 'Fix the blockers before running'
        }
      >
        {running ? 'Running…' : 'Run'}
      </button>
    </div>
  )
}
