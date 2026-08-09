/* ============================================================
   Cell — per-field-type editors for the data grid.
   Quiet-until-focused inputs; every editor commits through the
   `commit` callback (which routes to store.updateCell).
   ============================================================ */
import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { CellValue, EntityDef, FieldDef, RowData } from '@/types/model'
import { isImageValue, rowLabel } from '@/types/model'
import { FORMULA_ERROR_TITLES, formatComputed, formatNumber } from './helpers'

export interface CellProps {
  field: FieldDef
  value: CellValue
  commit: (v: CellValue) => void
  /** 1-based row number — gives each editor an accessible name */
  rowIndex: number
  /** reference cells: resolved target entity + its rows */
  targetEntity: EntityDef | undefined
  targetRows: RowData[] | undefined
  /** formula cells: value computed by the engine */
  computed: CellValue
}

/* ---------------------------------------------------------- */
/* text                                                       */
/* ---------------------------------------------------------- */

function TextCell({
  value,
  commit,
  label,
}: {
  value: CellValue
  commit: (v: CellValue) => void
  label: string
}): JSX.Element {
  const stored = value == null ? '' : String(value)
  const [draft, setDraft] = useState(stored)
  const focused = useRef(false)
  const skipCommit = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(stored)
  }, [stored])

  return (
    <input
      className="dg-input"
      type="text"
      aria-label={label}
      value={draft}
      spellCheck={false}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focused.current = false
        if (skipCommit.current) {
          skipCommit.current = false
          setDraft(stored)
          return
        }
        if (draft !== stored) commit(draft === '' ? null : draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          skipCommit.current = true
          e.currentTarget.blur()
        }
      }}
    />
  )
}

/* ---------------------------------------------------------- */
/* number                                                     */
/* ---------------------------------------------------------- */

function NumberCell({
  value,
  commit,
  label,
}: {
  value: CellValue
  commit: (v: CellValue) => void
  label: string
}): JSX.Element {
  const stored =
    typeof value === 'number' ? formatNumber(value) : value == null ? '' : String(value)
  const [draft, setDraft] = useState(stored)
  const [invalid, setInvalid] = useState(false)
  const focused = useRef(false)
  const skipCommit = useRef(false)

  useEffect(() => {
    if (!focused.current) {
      setDraft(stored)
      setInvalid(false)
    }
  }, [stored])

  return (
    <input
      className={'dg-input dg-input-num' + (invalid ? ' dg-input-invalid' : '')}
      type="text"
      inputMode="decimal"
      value={draft}
      spellCheck={false}
      aria-label={label}
      aria-invalid={invalid || undefined}
      title={invalid ? 'Not a number — fix the value or clear it' : undefined}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        const t = e.target.value
        setDraft(t)
        if (invalid) {
          const trimmed = t.trim()
          if (trimmed === '' || Number.isFinite(Number(trimmed))) setInvalid(false)
        }
      }}
      onBlur={() => {
        if (skipCommit.current) {
          skipCommit.current = false
          focused.current = false
          setDraft(stored)
          setInvalid(false)
          return
        }
        const t = draft.trim()
        if (t === '') {
          focused.current = false
          setInvalid(false)
          setDraft('')
          if (stored !== '') commit(null)
          return
        }
        const n = Number(t)
        if (Number.isFinite(n)) {
          focused.current = false
          setInvalid(false)
          setDraft(formatNumber(n))
          if (!(typeof value === 'number' && value === n)) commit(n)
        } else {
          /* unparseable — revert to the stored value (like Escape).
             Never refocus here: yanking focus back steals keystrokes
             from other cells and makes the row-delete button
             uncompletable (a WCAG 2.1.2 keyboard trap). */
          focused.current = false
          setInvalid(false)
          setDraft(stored)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          skipCommit.current = true
          e.currentTarget.blur()
        }
      }}
    />
  )
}

/* ---------------------------------------------------------- */
/* boolean — drafting checkbox with a pen-tick mark           */
/* ---------------------------------------------------------- */

function BooleanCell({
  value,
  commit,
  label,
}: {
  value: CellValue
  commit: (v: CellValue) => void
  label: string
}): JSX.Element {
  const on = value === true
  return (
    <span className="dg-boolwrap">
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={label}
        className={'dg-check' + (on ? ' dg-check-on' : '')}
        title={on ? 'Yes — click to clear the tick' : 'No — click to tick'}
        onClick={() => commit(!on)}
      >
        <svg className="dg-check-mark" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.1 6.9 L4.7 9.4 L10.7 1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="square"
          />
        </svg>
      </button>
    </span>
  )
}

/* ---------------------------------------------------------- */
/* date                                                       */
/* ---------------------------------------------------------- */

function DateCell({
  value,
  commit,
  label,
}: {
  value: CellValue
  commit: (v: CellValue) => void
  label: string
}): JSX.Element {
  return (
    <input
      className="dg-input dg-input-date"
      type="date"
      aria-label={label}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => commit(e.target.value === '' ? null : e.target.value)}
    />
  )
}

/* ---------------------------------------------------------- */
/* select                                                     */
/* ---------------------------------------------------------- */

function SelectCell({
  field,
  value,
  commit,
  label,
}: {
  field: FieldDef
  value: CellValue
  commit: (v: CellValue) => void
  label: string
}): JSX.Element {
  const options = field.options ?? []
  const v = value == null ? '' : String(value)
  const stale = v !== '' && !options.includes(v)
  return (
    <span className={'dg-selectwrap' + (stale ? ' dg-selectwrap-warn' : '')}>
      <select
        className={'dg-input dg-select' + (stale ? ' dg-select-warn' : '')}
        value={v}
        aria-label={label}
        title={stale ? `"${v}" is no longer among this list's options` : undefined}
        onChange={(e) => commit(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">—</option>
        {stale && <option value={v}>{v} (stale)</option>}
        {options.map((o, i) => (
          <option key={`${i}:${o}`} value={o}>
            {o}
          </option>
        ))}
      </select>
    </span>
  )
}

/* ---------------------------------------------------------- */
/* reference                                                  */
/* ---------------------------------------------------------- */

function ReferenceCell({
  value,
  commit,
  targetEntity,
  targetRows,
  label,
}: {
  value: CellValue
  commit: (v: CellValue) => void
  targetEntity: EntityDef | undefined
  targetRows: RowData[] | undefined
  label: string
}): JSX.Element {
  if (!targetEntity) {
    return (
      <span
        className="dg-refbroken"
        title="The linked entity no longer exists on this board"
      >
        #REF?
      </span>
    )
  }
  const rows = targetRows ?? []
  const v = value == null ? '' : String(value)
  const missing = v !== '' && !rows.some((r) => r.id === v)
  return (
    <span className={'dg-selectwrap' + (missing ? ' dg-selectwrap-warn' : '')}>
      <select
        className={'dg-input dg-select' + (missing ? ' dg-select-warn' : '')}
        value={v}
        aria-label={label}
        title={missing ? `The linked ${targetEntity.name.toLowerCase()} row was deleted` : undefined}
        onChange={(e) => commit(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">—</option>
        {missing && <option value={v}>(missing)</option>}
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {rowLabel(targetEntity, r)}
          </option>
        ))}
      </select>
    </span>
  )
}

/* ---------------------------------------------------------- */
/* formula — computed, read-only, teal FX treatment           */
/* ---------------------------------------------------------- */

function FormulaCell({ computed }: { computed: CellValue }): JSX.Element {
  if (typeof computed === 'string' && computed in FORMULA_ERROR_TITLES) {
    return (
      <span className="dg-fx dg-fx-err" title={FORMULA_ERROR_TITLES[computed]}>
        {computed}
      </span>
    )
  }
  const empty = computed === null || computed === undefined || computed === ''
  const cls =
    'dg-fx' +
    (typeof computed === 'number' ? ' dg-fx-num' : '') +
    (empty ? ' dg-fx-empty' : '')
  return <span className={cls}>{formatComputed(computed)}</span>
}

/* ---------------------------------------------------------- */
/* dispatcher                                                 */
/* ---------------------------------------------------------- */

export function Cell(props: CellProps): JSX.Element {
  const { field, value, commit, rowIndex } = props
  /* th[scope=col] does not name nested controls, so each editor
     carries its own accessible name: "<field>, row <n>" */
  const label = `${field.name}, row ${rowIndex}`
  switch (field.type) {
    case 'text':
      return <TextCell value={value} commit={commit} label={label} />
    case 'number':
      return <NumberCell value={value} commit={commit} label={label} />
    case 'boolean':
      return <BooleanCell value={value} commit={commit} label={label} />
    case 'date':
      return <DateCell value={value} commit={commit} label={label} />
    case 'select':
      return <SelectCell field={field} value={value} commit={commit} label={label} />
    case 'reference':
      return (
        <ReferenceCell
          value={value}
          commit={commit}
          targetEntity={props.targetEntity}
          targetRows={props.targetRows}
          label={label}
        />
      )
    case 'formula':
      return <FormulaCell computed={props.computed} />
    case 'image':
      /* The inspector grid is 340px wide — too narrow for a thumbnail
         strip to be usable. It states what is there and sends the user
         to the table on the sheet, which owns picture editing. */
      return <ImageCountCell value={value} />
  }
}

function ImageCountCell({ value }: { value: CellValue }): JSX.Element {
  const n = isImageValue(value) ? value.length : 0
  if (n === 0) return <span className="dg-img dg-img-empty">no pictures</span>
  return (
    <span className="dg-img" title="Edit pictures in the table on the sheet">
      {n} picture{n === 1 ? '' : 's'}
    </span>
  )
}
