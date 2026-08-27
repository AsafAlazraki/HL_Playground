/* ============================================================
   THE ACT, AND WHO IT LANDS ON.

   TOP HALF — set the value.
     What the level says now, as counted chips you can press to
     reuse. Then the control for this column's own type. Then the
     BLAST RADIUS, computed, before the button: how many take it,
     how many already hold it, how many hold something else and are
     therefore left alone. Then the button, and if the act cannot
     run, the sentence saying why, beside it (rule 10).

   BOTTOM HALF — who differs.
     Exceptions first, because that is what a person came to see.
     Each one can be put back onto its level in a press, and the
     put-back is the same `planSet` arithmetic narrowed to one row
     — which is what "configure on an individual level" is.

   NO DIALOG ANYWHERE. Every act here is undoable and reports
   itself with UNDO on the note (rule 9). The radius is shown
   BEFORE, so the note does not have to ask anything.

   THE LIST IS CAPPED AND SAYS SO. Parts & Accessories runs 2,937
   rows; painting them all is a frozen tab, and painting 150 while
   implying that is all of them is a lie. It prints the cap.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { rowLabel, type CellValue, type FieldDef } from '@/types/model'
import type { PushNote } from '@/store/notes'
import {
  planLines,
  planReset,
  planSet,
  standingsAt,
  type LevelModel,
  type LevelNode,
  type RowStanding,
  type SetPlan,
} from './levels'
import { applyLevelPlan } from './apply'
import { useRefOptions, type RefOption } from './useLevels'

/** How many rows the list paints before it says how many it is not
 *  painting. 150 is two screens of scroll — enough to work in, far
 *  short of a table that would drop frames. */
const CAP = 150
/** How many counted values the "says now" strip offers. */
const CHIP_CAP = 8

export interface SetPanelProps {
  model: LevelModel
  level: LevelNode
  field: FieldDef
  /** set when ONE row is the level — the individual rung */
  rowId: string | null
  onPickRow: (rowId: string | null) => void
  push?: PushNote
}

export function SetPanel(props: SetPanelProps): JSX.Element {
  const { model, level, field, rowId, onPickRow, push } = props
  const [draft, setDraft] = useState('')
  const [replace, setReplace] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const refOptions = useRefOptions(field)

  const { tally, rows: standings } = useMemo(
    () => standingsAt(model, level.key, field),
    [model, level.key, field],
  )

  const parsed = parseDraft(field, draft)

  /* THE PLAN IS BUILT ON EVERY KEYSTROKE, on purpose. It is a walk
     over one level's rows — 199 for the biggest Series, 2,937 for
     the whole parts library — and it is what makes the radius
     answer WHILE you type rather than after you commit. */
  const plan: SetPlan | null = useMemo(() => {
    if (parsed.error !== null) return null
    return planSet({
      model,
      levelKey: level.key,
      field,
      value: parsed.value,
      /* an individual IS the exception, so setting one always
         overwrites — there is nothing else under it to protect */
      replace: rowId !== null ? true : replace,
      onlyRowIds: rowId !== null ? [rowId] : undefined,
    })
  }, [model, level.key, field, parsed.error, parsed.value, replace, rowId])

  const overrides = standings.filter((s) => s.standing === 'overrides')
  const unset = standings.filter((s) => s.standing === 'unset')
  const listed = showAll ? standings : [...overrides, ...unset]
  const shown = listed.slice(0, CAP)

  const run = (p: SetPlan): void => {
    const done = applyLevelPlan(p, model.noun, push)
    if (done.written > 0) setDraft('')
  }

  const putBack = (ids?: readonly string[]): void => {
    run(planReset(model, level.key, field, ids))
  }

  const resetAll = planReset(model, level.key, field)

  return (
    <div className="lv-set">
      <header className="lv-set-head">
        <h2 className="lv-set-title ds-title">{field.name}</h2>
        <p className="lv-set-where ds-caption">
          across <span className="ds-mono-sm">{level.rows.length.toLocaleString()}</span>{' '}
          {level.rows.length === 1 ? model.noun.one : model.noun.many} in {level.label}
        </p>
      </header>

      {/* what it already says, counted */}
      {tally.entries.length > 0 ? (
        <div className="lv-now">
          <p className="lv-now-head ds-label">It says now</p>
          <div className="lv-chips">
            {tally.entries.slice(0, CHIP_CAP).map((e) => (
              <button
                key={e.text}
                className="lv-chip"
                type="button"
                onClick={() => setDraft(draftOf(field, e.value, e.text))}
              >
                <span className="lv-chip-text">{e.text}</span>
                <span className="lv-chip-n ds-mono-sm">{e.count.toLocaleString()}</span>
              </button>
            ))}
            {tally.entries.length > CHIP_CAP ? (
              <span className="lv-chip-more ds-caption">
                and <span className="ds-mono-sm">{tally.entries.length - CHIP_CAP}</span> more
              </span>
            ) : null}
            {tally.blank > 0 ? (
              <span className="lv-chip-more ds-caption">
                <span className="ds-mono-sm">{tally.blank.toLocaleString()}</span> hold nothing
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="lv-now-none ds-body">
          No {model.noun.one} in {level.label} holds a {field.name} yet.
        </p>
      )}

      {/* the value */}
      <div className="lv-field">
        <label className="lv-field-label ds-label" htmlFor="lv-value">
          Set {field.name} to
        </label>
        <ValueControl
          field={field}
          draft={draft}
          onDraft={setDraft}
          refOptions={refOptions}
        />
        {parsed.error !== null ? <p className="lv-why ds-small">{parsed.error}</p> : null}
      </div>

      {/* replace, only when there is something to replace */}
      {rowId === null && plan !== null && plan.differing.length > 0 ? (
        <button
          className={replace ? 'lv-toggle lv-toggle--on' : 'lv-toggle'}
          type="button"
          aria-pressed={replace}
          onClick={() => setReplace((v) => !v)}
        >
          <span className="lv-toggle-box" />
          <span className="lv-toggle-text ds-small">
            Replace the <span className="ds-mono-sm">{plan.differing.length}</span> that hold
            something else
          </span>
        </button>
      ) : null}

      {/* the blast radius, counted, before the press */}
      {plan !== null && plan.text !== '' ? (
        <ul className="lv-radius">
          {planLines(plan, model.noun).map((line) => (
            <li
              key={line.text}
              className={
                line.tone === 'write'
                  ? 'lv-radius-row lv-radius-row--write'
                  : line.tone === 'skip'
                    ? 'lv-radius-row lv-radius-row--skip'
                    : 'lv-radius-row lv-radius-row--same'
              }
            >
              <span className="lv-radius-n ds-mono">{line.n.toLocaleString()}</span>
              <span className="lv-radius-text ds-body">{line.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="lv-act">
        <button
          className="lv-go ds-btn ds-btn--primary"
          type="button"
          disabled={plan === null || plan.refusal !== null}
          onClick={() => plan && run(plan)}
        >
          {rowId === null
            ? `Set on ${(plan?.writes.length ?? 0).toLocaleString()} ${
                (plan?.writes.length ?? 0) === 1 ? model.noun.one : model.noun.many
              }`
            : `Set this ${model.noun.one}`}
        </button>
        {plan !== null && plan.refusal !== null && draft.trim() !== '' ? (
          <p className="lv-why ds-small">{plan.refusal}</p>
        ) : null}
        {rowId !== null ? (
          <button
            className="lv-clear ds-btn ds-btn--ghost ds-btn--sm"
            type="button"
            onClick={() => onPickRow(null)}
          >
            Back to {level.label}
          </button>
        ) : null}
      </div>

      {/* ---------------- who differs ---------------- */}
      <div className="lv-rows">
        <header className="lv-rows-head">
          <p className="lv-rows-title ds-label">
            {overrides.length === 0 && unset.length === 0
              ? 'Every one agrees'
              : `${overrides.length + unset.length} not on the level`}
          </p>
          <div className="lv-rows-acts">
            {overrides.length > 0 && resetAll.refusal === null ? (
              <button
                className="lv-putall ds-btn ds-btn--secondary ds-btn--sm"
                type="button"
                onClick={() => putBack()}
              >
                Put all back to “{resetAll.text}”
              </button>
            ) : null}
            <button
              className={showAll ? 'lv-toggle lv-toggle--on' : 'lv-toggle'}
              type="button"
              aria-pressed={showAll}
              onClick={() => setShowAll((v) => !v)}
            >
              <span className="lv-toggle-box" />
              <span className="lv-toggle-text ds-small">Show every {model.noun.one}</span>
            </button>
          </div>
        </header>

        {overrides.length > 0 && resetAll.refusal !== null ? (
          <p className="lv-why ds-small">{resetAll.refusal}</p>
        ) : null}

        {shown.length === 0 ? (
          <p className="lv-empty ds-body">
            {tally.dominant
              ? `All ${level.rows.length.toLocaleString()} hold “${tally.dominant.text}”.`
              : `Nothing here differs from its level, because ${level.label} has no answer for ${field.name} yet.`}
          </p>
        ) : (
          <ul className="lv-list">
            {shown.map((s) => (
              <StandingRow
                key={s.rowId}
                standing={s}
                model={model}
                on={s.rowId === rowId}
                canPutBack={tally.dominant !== null && s.standing !== 'inherits'}
                answer={tally.dominant?.text ?? ''}
                onPick={() => onPickRow(s.rowId === rowId ? null : s.rowId)}
                onPutBack={() => putBack([s.rowId])}
              />
            ))}
          </ul>
        )}

        {listed.length > CAP ? (
          <p className="lv-more ds-caption">
            Showing the first <span className="ds-mono-sm">{CAP}</span> of{' '}
            <span className="ds-mono-sm">{listed.length.toLocaleString()}</span>.
          </p>
        ) : null}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* one row, and where it stands                               */
/* ---------------------------------------------------------- */

function StandingRow({
  standing,
  model,
  on,
  canPutBack,
  answer,
  onPick,
  onPutBack,
}: {
  standing: RowStanding
  model: LevelModel
  on: boolean
  canPutBack: boolean
  answer: string
  onPick: () => void
  onPutBack: () => void
}): JSX.Element {
  return (
    <li className={on ? 'lv-row lv-row--on' : 'lv-row'}>
      <button className="lv-row-name" type="button" onClick={onPick}>
        {rowLabel(model.entity, standing.row)}
      </button>
      <span className="lv-row-val ds-mono-sm">
        {standing.text === '' ? '—' : standing.text}
      </span>
      {standing.standing === 'overrides' ? (
        <span className="lv-mark lv-mark--over ds-label">differs</span>
      ) : standing.standing === 'unset' ? (
        <span className="lv-mark lv-mark--unset ds-label">not set</span>
      ) : standing.standing === 'alone' ? (
        <span className="lv-mark lv-mark--alone ds-label">no level answer</span>
      ) : (
        <span className="lv-mark lv-mark--in ds-label">inherits</span>
      )}
      {canPutBack ? (
        <button
          className="lv-put ds-btn ds-btn--ghost ds-btn--sm"
          type="button"
          title={`Put back to “${answer}”`}
          onClick={onPutBack}
        >
          Put back
        </button>
      ) : (
        <span className="lv-put-none" />
      )}
    </li>
  )
}

/* ---------------------------------------------------------- */
/* the control for this column's own type                     */
/* ---------------------------------------------------------- */

function ValueControl({
  field,
  draft,
  onDraft,
  refOptions,
}: {
  field: FieldDef
  draft: string
  onDraft: (v: string) => void
  refOptions: RefOption[]
}): JSX.Element {
  if (field.type === 'boolean') {
    return (
      <div className="lv-yesno">
        {['Yes', 'No'].map((word) => (
          <button
            key={word}
            className={draft === word ? 'lv-yesno-btn lv-yesno-btn--on' : 'lv-yesno-btn'}
            type="button"
            aria-pressed={draft === word}
            onClick={() => onDraft(draft === word ? '' : word)}
          >
            {word}
          </button>
        ))}
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <select
        id="lv-value"
        className="lv-select ds-input"
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
      >
        <option value="">Choose one…</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'reference') {
    return (
      <select
        id="lv-value"
        className="lv-select ds-input"
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
      >
        <option value="">Choose one…</option>
        {/* THE VALUE IS THE ROW ID, NOT THE NAME. A reference cell
            stores an id; writing the name into it would produce a
            column that looks right and resolves to nothing. */}
        {refOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      id="lv-value"
      className="lv-input ds-input"
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      value={draft}
      placeholder={field.type === 'number' ? 'A figure' : 'A value'}
      onChange={(e) => onDraft(e.target.value)}
    />
  )
}

/* ---------------------------------------------------------- */
/* what the typed text means for this column                  */
/* ---------------------------------------------------------- */

interface Parsed {
  value: CellValue
  /** why the text is not a value for this column, or null */
  error: string | null
}

/**
 * A NUMBER COLUMN MUST NOT TAKE A STRING. Writing `"abc"` into a
 * number column is how a price column starts holding text and a
 * total starts reading `NaN` three screens away. The refusal is a
 * sentence, not a silently ignored keystroke.
 *
 * A reference column stores a row ID, but the control offers
 * NAMES, and the tally compares NAMES — so a reference draft is
 * resolved back to its id by the caller's `refOptions`. Until it
 * matches one, it is simply the typed text, which plans against
 * nothing and therefore writes nothing.
 */
/** The draft text that would re-produce a counted value — so
 *  pressing a chip on the "It says now" strip seeds the control
 *  with the thing that was counted, not with its printed name. */
function draftOf(field: FieldDef, value: CellValue, text: string): string {
  if (field.type === 'boolean') return text
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return ''
  return String(value)
}

function parseDraft(field: FieldDef, draft: string): Parsed {
  if (draft.trim() === '') return { value: null, error: null }

  if (field.type === 'number') {
    const n = Number(draft)
    if (!Number.isFinite(n)) {
      return { value: null, error: `“${draft}” is not a number, and ${field.name} holds figures.` }
    }
    return { value: n, error: null }
  }

  if (field.type === 'boolean') {
    return { value: draft === 'Yes', error: null }
  }

  return { value: draft, error: null }
}
