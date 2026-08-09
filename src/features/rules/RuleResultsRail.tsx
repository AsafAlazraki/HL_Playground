/* ============================================================
   RESULTS — what the run actually produced.

   One tab per output view, each a real table whose header stamps
   which row every column came from; the pending writes as plain
   sentences with APPLY / DISCARD; warnings as red-pencil notes.
   Every empty state says WHY it is empty.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar, rowLabel } from '@/types/model'
import type { CellValue, RowData, RuleDef, ViewColumn } from '@/types/model'
import type { ViewResultRow } from './engine'
import {
  cellKey,
  columnHeader,
  formatCell,
  matchEntityOf,
  scopeEntity,
  sourceEntityOf,
  type EntityMap,
} from './describe'
import { planEffects } from './effects'
import { useRuleRun } from './useRuleRun'
import './rules.css'

function CloseGlyph() {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
      <path d="M1.5 1.5 8.5 8.5 M8.5 1.5 1.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** Why did this view come back empty? Answer in the rule's own terms. */
function emptyReason(rule: RuleDef | undefined, entities: EntityMap): string {
  const source = sourceEntityOf(rule, entities)
  const match = matchEntityOf(rule, entities)
  const skipping = rule?.nodes.some(
    (n) => n.kind === 'match' && n.config.emptyBehavior === 'skip',
  )
  if (match && skipping) {
    return `No ${source?.name ?? 'row'} matched a ${match.name}, and the match is set to drop rows that fit nothing. Widen the range, or switch “When nothing fits” to Carry it on.`
  }
  if (match) {
    return `Nothing reached the output. Check the conditions on the match against real ${match.name} rows.`
  }
  return 'Nothing reached the output. Check that every step is joined up and that the table has rows.'
}

/** A reference cell carries a raw row id — show the row's own label. */
function cellText(
  raw: CellValue | undefined,
  col: ViewColumn,
  rule: RuleDef | undefined,
  entities: EntityMap,
  rowsByEntity: Record<string, RowData[]>,
): string {
  const entity = scopeEntity(col.scope, rule, entities)
  const field = entity?.fields.find((f) => f.id === col.fieldId)
  if (field?.type === 'reference' && typeof raw === 'string' && raw) {
    const target = field.refEntityId ? entities[field.refEntityId] : undefined
    const row = target ? (rowsByEntity[target.id] ?? []).find((r) => r.id === raw) : undefined
    if (target && row) return rowLabel(target, row)
  }
  return formatCell(raw ?? null)
}

function ViewTable({
  columns,
  rows,
  rule,
  entities,
}: {
  columns: ViewColumn[]
  rows: ViewResultRow[]
  rule: RuleDef | undefined
  entities: EntityMap
}) {
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  if (columns.length === 0) {
    return (
      <div className="rl-empty">
        <span className="rl-empty-title">This view has no columns</span>
        <span className="rl-empty-hint">
          Open the Output node and pick columns from both sides — that is what makes it a
          combined view.
        </span>
      </div>
    )
  }

  return (
    <div className="rl-table-wrap">
      <table className="rl-table">
        <thead>
          <tr>
            <th className="rl-th rl-th--gutter" scope="col">
              #
            </th>
            {/* THE STAMP IS SAID ONCE PER RUN OF COLUMNS. Repeating
                "HIGHFIELD INFLATABLES" over three consecutive columns
                sets a 146px floor under each of them — the eight
                columns of the seeded motor rule came to 1,081px, and
                the one a person ran the rule to see, Motor, was off
                the right-hand edge. Said once where the row it reads
                from CHANGES, it is the same information in a third of
                the width. */}
            {columns.map((c, i) => {
              const entity = scopeEntity(c.scope, rule, entities)
              const head = columnHeader(c, rule, entities)
              const opensRun =
                i === 0 || columnHeader(columns[i - 1], rule, entities).stamp !== head.stamp
              return (
                <th
                  className={`rl-th${opensRun ? ' is-runhead' : ''}`}
                  scope="col"
                  key={`${cellKey(c)}-${i}`}
                >
                  {opensRun ? (
                    <span
                      className="rl-stamp rl-stamp--sm"
                      style={
                        {
                          '--rl-stamp-ink': entity
                            ? accentVar(entity.accent)
                            : 'var(--ink-faint)',
                        } as CSSProperties
                      }
                    >
                      {head.stamp}
                    </span>
                  ) : (
                    /* the same box, empty: the labels stay on one line */
                    <span className="rl-stamp rl-stamp--sm rl-stamp--ditto" aria-hidden="true" />
                  )}
                  <span className="rl-th-label" title={`${head.stamp} · ${head.label}`}>
                    {head.label}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={`${row.sourceRowId}-${row.matchRowId ?? ''}-${ri}`}>
              <td className="rl-td rl-td--gutter">{String(ri + 1).padStart(2, '0')}</td>
              {columns.map((c, i) => {
                const value = cellText(row.cells[cellKey(c)], c, rule, entities, rowsByEntity)
                return (
                  <td className="rl-td" key={`${cellKey(c)}-${i}`} title={value}>
                    {value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RuleResultsRail({
  ruleId,
  onClose,
}: {
  ruleId: string
  onClose: () => void
}) {
  const rule = useProjectStore((s) => s.rules[ruleId])
  const entities = useProjectStore((s) => s.entities)
  const { result, running, error, applied, appliedCount, applyEffects } = useRuleRun(ruleId)
  const [tab, setTab] = useState<string | null>(null)
  /* discarding is per RESULT, never sticky — a fresh run offers its
     effects again even if the previous run's were waved away */
  const [discardedResult, setDiscardedResult] = useState<unknown>(null)
  const discarded = !!result && discardedResult === result

  const viewKeys = useMemo(() => (result ? Object.keys(result.views) : []), [result])
  const active = tab && viewKeys.includes(tab) ? tab : (viewKeys[0] ?? null)
  const view = active && result ? result.views[active] : undefined

  const plan = useMemo(
    () => (result && !discarded ? planEffects(result.effects) : []),
    [result, discarded],
  )
  const applicable = plan.filter((p) => p.applicable).length

  const hasOutput = !!rule?.nodes.some((n) => n.kind === 'output')

  return (
    <aside className="rl-results" aria-label="Rule results">
      <header className="rl-results-head">
        <span className="mono-label">Results</span>
        <span className="rl-results-rule block-heading" title={rule?.name}>
          {rule?.name ?? 'Rule'}
        </span>
        <button
          type="button"
          className="rl-close"
          aria-label="Close results"
          title="Close"
          onClick={onClose}
        >
          <CloseGlyph />
        </button>
      </header>

      {running ? (
        <div className="rl-empty">
          <span className="rl-empty-title">Running…</span>
          <span className="rl-empty-hint">Walking every row of the rule's table.</span>
        </div>
      ) : error ? (
        <div className="rl-empty rl-empty--bad">
          <span className="rl-empty-title">The run stopped</span>
          <span className="rl-empty-hint">{error}</span>
        </div>
      ) : !result ? (
        <div className="rl-empty">
          <span className="rl-empty-title">Nothing run yet</span>
          <span className="rl-empty-hint">Press RUN to walk the rule against the rows on the sheet.</span>
        </div>
      ) : !result.ok ? (
        <div className="rl-empty rl-empty--bad">
          <span className="rl-empty-title">The rule could not finish</span>
          <span className="rl-empty-hint">{result.error ?? 'The engine reported a failure.'}</span>
        </div>
      ) : viewKeys.length === 0 ? (
        <div className="rl-empty">
          <span className="rl-empty-title">No result sets</span>
          <span className="rl-empty-hint">
            {hasOutput
              ? 'The flow reached no Output node. Check the connections from Start onwards.'
              : 'This rule has no Output node yet — drag one from the palette and connect it.'}
          </span>
        </div>
      ) : (
        <>
          {viewKeys.length > 1 ? (
            <div className="rl-tabs" role="tablist" aria-label="Result sets">
              {viewKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={k === active}
                  className={`rl-tab${k === active ? ' is-active' : ''}`}
                  onClick={() => setTab(k)}
                >
                  {k}
                  <span className="rl-tab-n">{result.views[k]?.rows.length ?? 0}</span>
                </button>
              ))}
            </div>
          ) : null}

          {view ? (
            view.rows.length === 0 ? (
              <div className="rl-empty">
                <span className="rl-empty-title">
                  {active} came back empty
                </span>
                <span className="rl-empty-hint">{emptyReason(rule, entities)}</span>
              </div>
            ) : (
              <ViewTable
                columns={view.columns}
                rows={view.rows}
                rule={rule}
                entities={entities}
              />
            )
          ) : null}
        </>
      )}

      {result && result.effects.length > 0 && !discarded ? (
        <section className="rl-effects">
          <div className="rl-panel-head">
            <span className="mono-label">Effects</span>
            <span className="rl-panel-count">{plan.length}</span>
          </div>
          <ul className="rl-effectlist">
            {plan.map((p) => (
              <li
                key={p.id}
                className={`rl-effect${p.applicable ? '' : ' is-skipped'}`}
              >
                <span className="rl-effect-kind">{p.kind}</span>
                <span className="rl-effect-text">{p.description}</span>
                {p.reason ? <span className="rl-effect-why">{p.reason}</span> : null}
              </li>
            ))}
          </ul>
          {applied ? (
            <p className="rl-applied">
              {appliedCount.toLocaleString()} write{appliedCount === 1 ? '' : 's'} committed to the
              sheet.
            </p>
          ) : (
            <div className="rl-effect-acts">
              <button
                type="button"
                className="btn"
                onClick={() => setDiscardedResult(result)}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyEffects}
                disabled={applicable === 0}
                title={
                  applicable === 0
                    ? 'Nothing here can be written — flags are display only'
                    : `Commit ${applicable} write${applicable === 1 ? '' : 's'}`
                }
              >
                Apply {applicable > 0 ? applicable : ''}
              </button>
            </div>
          )}
        </section>
      ) : null}

      {result && result.warnings.length > 0 ? (
        <section className="rl-warnings">
          <div className="rl-panel-head">
            <span className="mono-label">Warnings</span>
            <span className="rl-panel-count">{result.warnings.length}</span>
          </div>
          <ul className="rl-warnlist">
            {result.warnings.map((w, i) => (
              <li className="rl-warn" key={`w${i}`}>
                {w}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  )
}
