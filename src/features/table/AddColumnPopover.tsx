/* ============================================================
   + COLUMN — two decisions and nothing else.

   A name, and what the column holds, in plain words. Three of the
   eight kinds need one follow-up (a list to choose from, a table to
   point at, a sum to work out); that follow-up appears only once
   that kind is chosen, so the sheet is never asking two questions at
   the same time.

   WHERE IT LANDS IS ANSWERED, NOT ASKED. On a table drawn in bands, a
   new column arrives at the far right — inside the last band, because
   that is where it physically lands. The chooser is shown already
   answered, so it reads as a statement you may correct rather than as
   a third question; a table with no bands never sees it at all.

   The words entity, schema, field and reference appear nowhere.
   ============================================================ */
import { useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { ColumnSection, FieldType } from '@/types/model'
import { Popover } from './Popover'
import { COLUMN_KINDS } from './columnKinds'
import type { LinkTarget, NewColumn } from './useColumnCommands'

/** the chip that means "in no band at all" */
const NO_SECTION = ''

export function AddColumnPopover({
  anchor,
  suggestedName,
  linkTargets,
  sections,
  landsIn,
  onCreate,
  onClose,
}: {
  anchor: DOMRect
  suggestedName: string
  linkTargets: LinkTarget[]
  /** the bands this table is drawn in — empty on a plain table */
  sections?: readonly ColumnSection[]
  /** the band the new column would physically land in */
  landsIn?: string
  onCreate: (spec: NewColumn) => boolean
  onClose: () => void
}): JSX.Element {
  const [name, setName] = useState('')
  const [type, setType] = useState<FieldType>('text')
  const [optionText, setOptionText] = useState('')
  const [refEntityId, setRefEntityId] = useState(linkTargets[0]?.id ?? '')
  const [formula, setFormula] = useState('')
  const [sectionId, setSectionId] = useState<string>(landsIn ?? NO_SECTION)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const bands = sections ?? []

  const kinds = useMemo(
    () => COLUMN_KINDS.filter((k) => k.type !== 'reference' || linkTargets.length > 0),
    [linkTargets.length],
  )

  const options = useMemo(
    () =>
      optionText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== ''),
    [optionText],
  )

  const submit = (): void => {
    const ok = onCreate({
      name: name.trim() === '' ? suggestedName : name,
      type,
      options: type === 'select' ? options : undefined,
      refEntityId: type === 'reference' ? refEntityId : undefined,
      formula: type === 'formula' ? formula : undefined,
      sectionId: sectionId === NO_SECTION ? undefined : sectionId,
    })
    if (ok) onClose()
    else nameRef.current?.focus()
  }

  return (
    <Popover anchor={anchor} width={272} label="Add a column" onClose={onClose}>
      <header className="tb-menu-head">
        <span className="tb-menu-title">Add a column</span>
      </header>

      <div className="tb-menu-body">
        <label className="mono-label tb-menu-lab" htmlFor="tb-newcol-name">
          Name
        </label>
        <input
          id="tb-newcol-name"
          ref={nameRef}
          className="field-input"
          type="text"
          value={name}
          autoFocus
          spellCheck={false}
          placeholder={suggestedName}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') submit()
          }}
        />
      </div>

      <div className="tb-kinds" role="radiogroup" aria-label="What the column holds">
        {kinds.map((k) => {
          const on = k.type === type
          return (
            <button
              key={k.type}
              type="button"
              role="radio"
              aria-checked={on}
              className={'tb-kind' + (on ? ' tb-kind-on' : '')}
              onClick={() => setType(k.type)}
            >
              <span className="tb-kind-label">{k.label}</span>
              <span className="tb-kind-hint">{k.hint}</span>
            </button>
          )
        })}
      </div>

      {type === 'select' && (
        <div className="tb-menu-body tb-menu-more">
          <label className="mono-label tb-menu-lab" htmlFor="tb-newcol-opts">
            The choices — one per line
          </label>
          <textarea
            id="tb-newcol-opts"
            className="field-input tb-area"
            rows={4}
            value={optionText}
            spellCheck={false}
            placeholder={'Short\nLong\nExtra long'}
            onChange={(e) => setOptionText(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {type === 'reference' && (
        <div className="tb-menu-body tb-menu-more">
          <label className="mono-label tb-menu-lab" htmlFor="tb-newcol-ref">
            Points at
          </label>
          <select
            id="tb-newcol-ref"
            className="field-input"
            value={refEntityId}
            onChange={(e) => setRefEntityId(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {linkTargets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === 'formula' && (
        <div className="tb-menu-body tb-menu-more">
          <label className="mono-label tb-menu-lab" htmlFor="tb-newcol-fx">
            Worked out as
          </label>
          <input
            id="tb-newcol-fx"
            className="field-input tb-mono-input"
            type="text"
            value={formula}
            spellCheck={false}
            placeholder="[Price] * 1.1"
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') submit()
            }}
          />
          <p className="tb-menu-note">
            Name other columns in square brackets. You can change it later.
          </p>
        </div>
      )}

      {bands.length > 0 && (
        <div className="tb-menu-body tb-menu-more">
          <span className="mono-label tb-menu-lab">Goes in</span>
          <div className="tb-bands-pick" role="radiogroup" aria-label="Which band the column joins">
            {bands.map((s) => {
              const on = s.id === sectionId
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={'tb-bandpick' + (on ? ' tb-bandpick-on' : '')}
                  title={`Put this column in ${s.name}`}
                  onClick={() => setSectionId(s.id)}
                >
                  {s.name}
                </button>
              )
            })}
            <button
              type="button"
              role="radio"
              aria-checked={sectionId === NO_SECTION}
              className={
                'tb-bandpick' + (sectionId === NO_SECTION ? ' tb-bandpick-on' : '')
              }
              title="Leave this column outside every band"
              onClick={() => setSectionId(NO_SECTION)}
            >
              On its own
            </button>
          </div>
        </div>
      )}

      <footer className="tb-menu-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={submit}>
          Add column
        </button>
      </footer>
    </Popover>
  )
}
