/* ============================================================
   IT RUNS WHILE YOU BUILD.

   UX_PASS §11's second fix, and it is a finding rather than a
   preference: audit finding 18's guided path produced 193 rows
   under two columns both headed `Series`, and the person only
   discovered that after pressing RUN. With the answer permanently
   on screen the same mistake is a mid-sentence correction rather
   than a wasted journey.

   ── WHAT IT RUNS, AND WHAT IT COSTS, MEASURED ────────────────

   `runRule` over the whole of 'Motor fitment — Highfield' is
   32,000 pairs off 588 Highfield variants and takes 555–580 ms
   (three runs, node, this seed); the trailer rule is 4,704 pairs
   in 77–83 ms. Half a second of dead keyboard on every dropdown
   pick is not "live", it is a stall — and this surface exists so a
   person can keep typing.

   So the preview runs the REAL rule, through the REAL engine, over
   the FIRST 40 rows of the source table. That is about 40 ms for
   the motor rule, and it is a sample rather than a total, so the
   strip says which: "2,176 pairs from the first 40 of 588
   Highfield Inflatables". A figure that names what it counted is a
   measurement; the same figure with the word "first" removed is a
   lie about 548 boats.

   NOTHING IS SAMPLED ABOUT THE SHAPE. The columns, the headings,
   the values, the engine's own warnings and the both-sides check
   are all exactly what a full run would produce — which is the
   whole of what a person is checking while they write.

   NO MOTION, AND THE FIGURE NEVER ANIMATES. It is a count that
   changes as the sentence changes, and a number that tweens is a
   number you cannot read mid-flight.
   ============================================================ */

import { useMemo } from 'react'
import type { ReactElement } from 'react'
import { Warning } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { runRule } from '@/lib/rules'
import { isImageValue, rowLabel } from '@/types/model'
import type { CellValue, EntityDef, RowData, RuleDef, ViewColumn } from '@/types/model'
import { valueWords, type SentenceCtx } from './describe'
import {
  columnLabel,
  compileFit,
  entityOf,
  fieldOf,
  fitMissing,
  fitTrouble,
  setColumns,
  type FitDraft,
} from './fit'
import './constraints.css'

/** How much of the source table the preview walks. 40 rows is about
 *  40 ms on the heaviest rule in the real seed; the full 588 is 570.
 *  It is stated on screen, never assumed. */
export const PREVIEW_ROWS = 40

/** How many result rows the panel draws. The rest are counted, not
 *  drawn — a preview that renders two thousand rows is a table, and
 *  the table is a page of its own. */
const SHOWN_ROWS = 6

const n = (x: number): string => x.toLocaleString('en-AU')

export interface FitResultProps {
  draft: FitDraft
  ctx: SentenceCtx
  /** the rule this draft came from, so the preview compiles against
   *  the same node ids the canvas holds */
  base?: RuleDef
  /** offered when the answer names neither side — §11's repair */
  onChange?: (next: FitDraft) => void
}

/* ---------------------------------------------------------- */
/* Cells                                                      */
/* ---------------------------------------------------------- */

/** A reference cell is a row id, which is not a word. Every other
 *  cell is already the value the engine computed, formulas
 *  included. */
function cellText(
  ctx: SentenceCtx,
  entity: EntityDef | undefined,
  column: ViewColumn,
  value: CellValue,
): string {
  if (value === null || value === undefined) return '—'
  if (isImageValue(value)) return value.length === 0 ? '—' : `${value.length} images`
  const field = fieldOf(entity, column.fieldId)
  if (field?.type === 'reference' && field.refEntityId) {
    const target = ctx.entities[field.refEntityId]
    const row = target
      ? ctx.rowsByEntity[target.id]?.find((r) => r.id === String(value))
      : undefined
    if (target && row) return rowLabel(target, row)
  }
  return valueWords(value)
}

const isNumeric = (v: CellValue): boolean => typeof v === 'number'

/* ---------------------------------------------------------- */

export function FitResult({ draft, ctx, base, onChange }: FitResultProps): ReactElement {
  const source = entityOf(ctx, draft.sourceEntityId)
  const match = entityOf(ctx, draft.matchEntityId)
  const missing = fitMissing(ctx, draft)
  const trouble = fitTrouble(ctx, draft)

  /* THE SAMPLE, AND THE CONTEXT IT RUNS IN. Only the source table is
     trimmed: every candidate row is still scanned, so a pair that
     would be found is found. */
  const preview = useMemo(() => {
    if (missing) return null
    const all: RowData[] = ctx.rowsByEntity[draft.sourceEntityId] ?? []
    const walked = all.slice(0, PREVIEW_ROWS)
    const rule: RuleDef = {
      id: base?.id ?? 'preview',
      enabled: true,
      createdAt: base?.createdAt ?? '',
      updatedAt: base?.updatedAt ?? '',
      ...compileFit(draft, base),
    }
    const result = runRule(rule, {
      entities: ctx.entities,
      rowsByEntity: { ...ctx.rowsByEntity, [draft.sourceEntityId]: walked },
    })
    const view = Object.values(result.views)[0]
    return {
      total: all.length,
      walked: walked.length,
      rows: view?.rows ?? [],
      columns: view?.columns ?? [],
      warnings: result.warnings,
      error: result.error,
    }
  }, [ctx, draft, base, missing])

  /* ---- the sentence is not finished yet -------------------- */

  if (missing || !preview) {
    return (
      <aside className="cn-fitres" aria-label="The answer, as you write">
        <div className="cn-fitres-void">
          <p className="cn-fitres-void-title">The answer appears here as you write.</p>
          <p className="cn-fitres-void-note">{missing?.says}</p>
        </div>
      </aside>
    )
  }

  const pairs = preview.rows.length
  const matched = new Set(preview.rows.map((r) => r.sourceRowId)).size
  const whole = preview.walked >= preview.total
  const counted = whole
    ? `from all ${n(preview.total)} ${source?.name ?? 'rows'}`
    : `from the first ${n(preview.walked)} of ${n(preview.total)} ${source?.name ?? 'rows'}`

  return (
    <aside className="cn-fitres" aria-label="The answer, as you write">
      <div className="cn-fitres-top">
        <span className="cn-fitres-n">{n(pairs)}</span>
        <span className="cn-fitres-of">
          {pairs === 1 ? 'pair' : 'pairs'} {counted}
        </span>
        <span className="cn-fitres-live">
          <i />
          live
        </span>
      </div>

      {/* §11's third fix: an answer that names neither side is named
          as a fault, where it happens, with the repair attached. */}
      {trouble && (
        <div className="cn-fitres-note" role="status">
          <Warning size={ICON_SIZE.small} weight="fill" />
          <div className="cn-fitres-note-text">
            {trouble.says}
            {trouble.fix && onChange && (
              <div className="cn-fitres-note-act">
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary ds-btn--sm"
                  onClick={() => onChange(setColumns(draft, trouble.fix?.columns ?? draft.columns))}
                >
                  {trouble.fix.says}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* THE ENGINE'S OWN WARNINGS, SAID HERE RATHER THAN SWALLOWED.
          "text cannot be compared with a measurement — treated as not
          matching" is the difference between a rule that found
          nothing and a rule that is comparing the wrong two things,
          and the seeded motor rule raises exactly that on this
          sheet. */}
      {preview.warnings.slice(0, 2).map((warning) => (
        <div className="cn-fitres-note" key={warning} role="status">
          <Warning size={ICON_SIZE.small} weight="fill" />
          <div className="cn-fitres-note-text">{warning}</div>
        </div>
      ))}

      {pairs === 0 ? (
        <div className="cn-fitres-void">
          <p className="cn-fitres-void-title">
            Nothing fits, {whole ? 'anywhere on the sheet' : `in the first ${n(preview.walked)}`}.
          </p>
          <p className="cn-fitres-void-note">
            {preview.error ??
              `No ${match?.name ?? 'row'} passes every comparison. Loosen one, or check the two columns are the same kind of thing.`}
          </p>
        </div>
      ) : (
        <>
          <div className="cn-fitres-scroll">
            <table className="cn-fitres-table">
              <thead>
                <tr>
                  {preview.columns.map((column) => (
                    <th key={`${column.scope}:${column.fieldId}`} scope="col">
                      {columnLabel(ctx, draft, column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, SHOWN_ROWS).map((row) => (
                  <tr key={`${row.sourceRowId}:${row.matchRowId ?? '-'}`}>
                    {preview.columns.map((column) => {
                      const key = `${column.scope}:${column.fieldId}`
                      const value = row.cells[key] ?? null
                      const entity = column.scope === 'source' ? source : match
                      return (
                        <td key={key} className={isNumeric(value) ? 'is-figure' : undefined}>
                          {cellText(ctx, entity, column, value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cn-fitres-foot">
            {pairs > SHOWN_ROWS ? `${n(pairs - SHOWN_ROWS)} more · ` : ''}
            {matched === 1 ? '1 row matched' : `${n(matched)} rows matched`} · updates as you
            change the sentence
          </p>
        </>
      )}
    </aside>
  )
}

/** The rows a source row is paired with, counted without drawing
 *  them — used by the card to say how much a rule is doing. */
export function fitReach(
  ctx: SentenceCtx,
  draft: FitDraft,
  base?: RuleDef,
): { pairs: number; walked: number; total: number } {
  const all = ctx.rowsByEntity[draft.sourceEntityId] ?? []
  const walked = all.slice(0, PREVIEW_ROWS)
  const rule: RuleDef = {
    id: base?.id ?? 'preview',
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...compileFit(draft, base),
  }
  const result = runRule(rule, {
    entities: ctx.entities,
    rowsByEntity: { ...ctx.rowsByEntity, [draft.sourceEntityId]: walked },
  })
  const view = Object.values(result.views)[0]
  return { pairs: view?.rows.length ?? 0, walked: walked.length, total: all.length }
}

