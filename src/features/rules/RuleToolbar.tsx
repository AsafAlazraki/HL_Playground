/* ============================================================
   RULE TOOLBAR — the instrument strip above the sheet.

   Layer-agnostic: it knows a rule id and nothing about where it
   is mounted. RUN, the validity stamp, and the headline numbers
   from the last run.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import type { CSSProperties } from 'react'
import { sourceEntityOf } from './describe'
import { useRuleIssues } from './useRuleIssues'
import { useRuleRun } from './useRuleRun'
import './rules.css'

export function RuleToolbar({ ruleId }: { ruleId: string }) {
  const rule = useProjectStore((s) => s.rules[ruleId])
  const entities = useProjectStore((s) => s.entities)
  const { blockers, advisories, ok } = useRuleIssues(ruleId)
  const { result, running, error, run, clear } = useRuleRun(ruleId)

  if (!rule) return null

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
          title="The entity this rule walks"
        >
          {source.name}
        </span>
      ) : (
        <span className="rl-stamp rl-stamp--none">no entity</span>
      )}

      <span
        className={`rl-check${ok ? ' is-ok' : ' is-blocked'}`}
        title={
          ok
            ? 'Every node is configured — this rule can run'
            : blockers.map((b) => b.message).join('\n')
        }
      >
        {ok ? 'Checks ✓' : `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`}
      </span>

      {ok && advisories.length > 0 ? (
        <span
          className="rl-check is-advisory"
          title={advisories.map((a) => a.message).join('\n')}
        >
          {advisories.length} note{advisories.length === 1 ? '' : 's'}
        </span>
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
