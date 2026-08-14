/* ============================================================
   The column menu — one control per heading, not four.

   Ordering and narrowing are the everyday actions and sit at the
   top; changing what the column IS sits below a rule; removing it
   sits last and asks once, in the same sheet, rather than throwing
   a modal across the screen.

   The system identifier column can be ordered and narrowed like any
   other and nothing else — so that is all this menu offers it.
   ============================================================ */
import { useState } from 'react'
import type { JSX } from 'react'
import { isSystemFieldId, type FieldDef } from '@/types/model'
import type { SortDir } from '@/features/table/core'
import { Popover } from './Popover'
import { columnKindOf } from './columnKinds'

export function ColumnMenu({
  field,
  anchor,
  sortDir,
  filtered,
  onSort,
  onFilter,
  onEditOptions,
  onRemove,
  onClose,
}: {
  field: FieldDef
  anchor: DOMRect
  sortDir: SortDir | null
  filtered: boolean
  onSort: (dir: SortDir | null) => void
  onFilter: () => void
  onEditOptions: (options: string[]) => void
  onRemove: () => void
  onClose: () => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [optionText, setOptionText] = useState(() =>
    (field.options ?? []).join('\n'),
  )

  const system = isSystemFieldId(field.id)
  const kind = columnKindOf(field.type)

  const act = (fn: () => void) => (): void => {
    fn()
    onClose()
  }

  const commitOptions = (): void => {
    onEditOptions(
      optionText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== ''),
    )
    onClose()
  }

  return (
    <Popover anchor={anchor} width={248} label={`${field.name} column`} onClose={onClose}>
      <header className="tb-menu-head">
        <span className="tb-menu-title">{field.name}</span>
        <span className="tb-menu-kind">{kind.label}</span>
      </header>

      {editing ? (
        <>
          <div className="tb-menu-body">
            <label className="mono-label tb-menu-lab" htmlFor={`tb-opts-${field.id}`}>
              The choices — one per line
            </label>
            <textarea
              id={`tb-opts-${field.id}`}
              className="field-input tb-area"
              rows={5}
              value={optionText}
              autoFocus
              spellCheck={false}
              onChange={(e) => setOptionText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <p className="tb-menu-note">
              Cells already holding something else keep it until you retype them.
            </p>
          </div>
          <footer className="tb-menu-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={commitOptions}>
              Save choices
            </button>
          </footer>
        </>
      ) : confirming ? (
        <>
          <div className="tb-menu-body">
            <p className="tb-confirm-title">Remove “{field.name}”?</p>
            <p className="tb-confirm-sub">
              Every value in this column leaves with it. There is no undo.
            </p>
          </div>
          {/* FOCUS LANDS ON THE WAY OUT, NOT ON THE DELETE.
              This dialog says "There is no undo" and then used to hand
              the keyboard the Remove button, so the Enter that opened
              it could destroy a column of the price file on the
              follow-through. The app already disagreed with itself
              here — the designer's own confirm sheet focuses cancel —
              so this is bringing one surface into line with the other,
              not inventing a policy. */}
          <footer className="tb-menu-foot">
            <button
              type="button"
              className="btn btn-ghost"
              autoFocus
              onClick={() => setConfirming(false)}
            >
              Keep it
            </button>
            <button type="button" className="btn btn-danger tb-confirm-go" onClick={act(onRemove)}>
              Remove
            </button>
          </footer>
        </>
      ) : (
        <div className="tb-acts">
          <button
            type="button"
            className={'tb-act' + (sortDir === 'asc' ? ' tb-act-on' : '')}
            onClick={act(() => onSort(sortDir === 'asc' ? null : 'asc'))}
          >
            Sort first to last
          </button>
          <button
            type="button"
            className={'tb-act' + (sortDir === 'desc' ? ' tb-act-on' : '')}
            onClick={act(() => onSort(sortDir === 'desc' ? null : 'desc'))}
          >
            Sort last to first
          </button>
          <button
            type="button"
            className={'tb-act' + (filtered ? ' tb-act-on' : '')}
            onClick={act(onFilter)}
          >
            {filtered ? 'Change what shows…' : 'Show only some…'}
          </button>

          {!system && (
            <>
              <span className="tb-act-rule" aria-hidden="true" />
              {field.type === 'select' && (
                <button type="button" className="tb-act" onClick={() => setEditing(true)}>
                  Edit the choices…
                </button>
              )}
              <button
                type="button"
                className="tb-act tb-act-danger"
                onClick={() => setConfirming(true)}
              >
                Remove column
              </button>
            </>
          )}
        </div>
      )}
    </Popover>
  )
}
