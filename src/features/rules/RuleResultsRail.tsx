/* ============================================================
   RESULTS — what the run actually produced.

   One tab per output view, each a real table whose header stamps
   which row every column came from; the pending writes as plain
   sentences with APPLY / DISCARD; warnings as red-pencil notes.
   Every empty state says WHY it is empty.
   ============================================================ */

import { useId, useMemo, useState } from 'react'
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

/* ============================================================
   THE TABLE DRAWS A WINDOW, AND SAYS HOW BIG THE RESULT IS.

   MEASURED, seeded rule "Motor fitment — Highfield", one view:
   32,000 rows x 7 columns = 224,000 cells, every one of them
   rendered. Nine elements to a row — one <tr> and eight <td>,
   the gutter included — is 288,041 elements. Rendering that
   through this component in the ui suite exhausted a 4 GB heap
   in 58s and killed the vitest worker. The way up, same
   component, same machine:

       rows      elements    render
        100           941      35 ms
        500         4,541     113 ms
      2,000        18,041     305 ms
      8,000        72,041   1,352 ms
     32,000       288,041   out of memory

   WHY NOT `content-visibility: auto`, which
   docs/research/dense-tables-and-selection.md prefers over
   virtualisation and which table-node.css:328 already uses:
   IT DOES NOT APPLY TO TABLE ROWS. Measured in Chrome 152 — of
   600 <tr>s carrying `content-visibility: auto`, all 600 fired
   `contentvisibilityautostatechange` and NOT ONE reported
   skipped=true, and `contain-intrinsic-size: auto 30px` was
   ignored (the rows kept their natural 26px). The same 600 rows
   as <div>s were skipped 560 of 600 and did take the 30px. CSS
   containment does not apply to internal table boxes, so the
   technique costs a real <table> and buys nothing here. The
   research doc's own instruction is "Measure before
   virtualising", and its case for content-visibility rests on
   "a single view is hundreds to low thousands of rows" — 32,000
   is not that.

   SO: A CAP, SAID OUT LOUD, which is what search already does
   (rowSearch.ts:495, `perTable: 8, total: 40`). 500 is where raw
   DOM construction in Chrome 152 costs 32ms of the 100ms RAIL
   budget for a user-initiated transition, leaving the rest of it
   to React; 1,000 costs 71ms and leaves 29ms, which is not
   enough for the React pass measured above.

   The figure a person reads is never the capped one. They are
   told the size of what the rule PRODUCED, and then how much of
   it is on the screen.
   ============================================================ */
const VIEW_ROW_CAP = 500

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
  const noteId = useId()

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

  const drawn = rows.length > VIEW_ROW_CAP ? rows.slice(0, VIEW_ROW_CAP) : rows
  const capped = drawn.length < rows.length

  return (
    <>
      <div className="rl-table-wrap">
        <table className="rl-table" aria-describedby={noteId}>
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
            {drawn.map((row, ri) => (
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

      {/* OUTSIDE the scroller on purpose. Inside it, the one line
          that says the table is a window would be 500 rows below
          the fold — which is a silent truncation with a footnote,
          not an honest one. */}
      <p className="rl-rowcap" id={noteId}>
        {capped ? (
          <>
            <span>
              Showing <b className="rl-rowcap-n">{VIEW_ROW_CAP.toLocaleString()}</b> of{' '}
              <b className="rl-rowcap-n">{rows.length.toLocaleString()}</b> rows.
            </span>
            <span className="rl-rowcap-why">
              All {rows.length.toLocaleString()} would be{' '}
              {(rows.length * columns.length).toLocaleString()} cells, which this rail will not
              draw. Narrow the rule to change which rows come out of it.
            </span>
          </>
        ) : (
          <span>
            <b className="rl-rowcap-n">{rows.length.toLocaleString()}</b>{' '}
            {rows.length === 1 ? 'row' : 'rows'}.
          </span>
        )}
      </p>
    </>
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
              {/* the figure is a figure and the sentence is a sentence:
                  the whole line was set in the reference face for the
                  sake of one number in it */}
              <b className="rl-applied-n">{appliedCount.toLocaleString()}</b> write
              {appliedCount === 1 ? '' : 's'} committed to the sheet.
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
