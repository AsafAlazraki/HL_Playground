/* ============================================================
   The column menu — one control per heading, not four.

   Ordering and narrowing are the everyday actions and sit at the
   top; changing what the column IS sits below a rule; removing it
   sits last and asks once, in the same sheet, rather than throwing
   a modal across the screen.

   The system identifier column can be ordered and narrowed like any
   other and nothing else — so that is all this menu offers it.

   WHY THIS ONE STILL ASKS, WHEN THE ROW STRIKE NO LONGER DOES.
   Both acts are one recorded step and both come all the way back on
   Ctrl+Z — measured on Surtees: remove “Matrix”, press Ctrl+Z, and the
   column returns at its own index, inside its Identity band, with all
   19 of its values. So rule 9 ("if an act is undoable it gets a toast
   with UNDO, not a dialog") would retire this sheet too, if the way
   back were the only thing a confirm is for. It is not. The other
   thing is §7's: "a confirm states its blast radius, computed."

   A row leaves in front of you. The register is one line shorter and
   the line that went is the line you had selected. A COLUMN does not:
   it takes one value out of every row in the table — 2,519 of them on
   the largest seeded one, most of them not on screen — and it can also
   put “Unknown field [Matrix]” into every row of a calculated column,
   and hand a business rule a blocker, neither of which this header
   shows and neither of which a person can be expected to remember.
   Undo repairs all of that; it does not TELL you about it. So the
   sheet stays and earns its place by counting, and its sentences are
   now true: what leaves, how much of it, and that Ctrl+Z brings it
   back. The note that follows the removal carries UNDO as well.

   The counts come from the designer's own pure modules — `columnFacts`
   and `dependents` — so this sheet and the column setup can never
   describe the same column two different ways.
   ============================================================ */
import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { isSystemFieldId, type FieldDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { columnFacts } from '@/features/designer/columnFacts'
import { formulaReaders, nameList, ruleBreakage } from '@/features/designer/dependents'
import type { SortDir } from '@/features/table/core'
import { Popover } from './Popover'
import { columnKindOf } from './columnKinds'

export function ColumnMenu({
  field,
  entityId,
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
  /** the table the column is on — the blast radius is read from it */
  entityId: string
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

  /* WORKED OUT ONLY WHILE THE SHEET IS UP. `ruleBreakage` validates
     every rule twice, and doing that on every hover of a column menu
     would be a full graph pass to draw three sort buttons. Read from
     `getState()` rather than a selector for the same reason: this sheet
     must not re-render on every keystroke somebody types into the
     register underneath it. */
  const blast = useMemo(() => {
    if (!confirming) return null
    const { entities, rowsByEntity, rules } = useProjectStore.getState()
    const entity = entities[entityId]
    if (!entity) return null
    return {
      facts: columnFacts(rowsByEntity[entityId], field.id),
      readers: formulaReaders(entity, field),
      broken: ruleBreakage({ entities, rowsByEntity }, rules, entityId, field.id),
    }
  }, [confirming, entityId, field])

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

  /* the counted sentence, or the honest fallback if the table went
     away under us — never a number this file guessed at */
  const whatLeaves = ((): string => {
    if (blast === null) return 'Every value in this column leaves with it.'
    const { rows, filled } = blast.facts
    if (filled === 0) return 'The column is empty, so no values go with it.'
    const rowWord = rows === 1 ? '1 row' : `${rows} rows`
    return `${filled} of ${rowWord} hold a value in it, and those go too.`
  })()

  return (
    <Popover anchor={anchor} width={248} label={`${field.name} column`} onClose={onClose}>
      <header className="tb-menu-head">
        {/* `tb-menu-name`, not `tb-menu-title`: this is the dealer's
            own column name and it keeps its case. The caption class
            still exists for the two popovers that hold a caption. */}
        <span className="tb-menu-name">{field.name}</span>
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
            {/* THE SENTENCE THAT USED TO BE FALSE. It said "There is no
                undo." Ctrl+Z has taken this act back since the history
                stack landed, and a destructive sheet claiming otherwise
                is the one kind of wrong wording that changes what a
                person does: it stops them doing something they could
                safely try. */}
            <p className="tb-confirm-sub">
              {whatLeaves} Ctrl+Z brings the column back, with every value in it.
            </p>

            {/* WHAT UNDO CANNOT TELL YOU IN ADVANCE — the reason this
                sheet is still a sheet. Both sentences are the designer's
                own, verbatim, so the two surfaces speak once. */}
            {blast !== null && blast.readers.length > 0 ? (
              <p className="tb-confirm-sub">
                {nameList(blast.readers.map((r) => r.name || 'an untitled column'))}{' '}
                {blast.readers.length === 1 ? 'reads' : 'read'} this column, and will
                show “Unknown field [{field.name}]” in every row instead of a value.
              </p>
            ) : null}
            {blast?.broken.map((r) => (
              <p className="tb-confirm-sub" key={r.ruleId}>
                {r.ruleName} breaks: {r.messages.join(' ')}
              </p>
            ))}
          </div>
          {/* FOCUS LANDS ON THE WAY OUT, NOT ON THE DELETE.
              This dialog used to hand the keyboard the Remove button, so
              the Enter that opened it could destroy a column of the price
              file on the follow-through. The app already disagreed with
              itself here — the designer's own confirm sheet focuses
              cancel — so this is bringing one surface into line with the
              other, not inventing a policy. */}
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
