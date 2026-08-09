/* ============================================================
   One field of the schema — collapsed card row + accordion
   editor (name / type / required / default + per-type editor).
   ============================================================ */

import { useEffect, useMemo, useRef } from 'react'
import {
  FIELD_TYPES,
  rowLabel,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type FieldType,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { FieldMark } from '@/features/review'
import { FormulaEditor, ReferenceEditor, SelectOptionsEditor } from './FieldTypeEditors'
import { GuardNote } from './GuardNote'
import { useNameGuard } from './useNameGuard'
import {
  CheckGlyph,
  ChevronDownGlyph,
  ChevronRightGlyph,
  ChevronUpGlyph,
  XGlyph,
} from './glyphs'

const TYPE_ORDER = Object.keys(FIELD_TYPES) as FieldType[]

interface FieldRowProps {
  entity: EntityDef
  field: FieldDef
  index: number
  count: number
  expanded: boolean
  /** focus + select the name input when the editor opens (fresh field) */
  autoFocusName: boolean
  onToggle: () => void
}

export function FieldRow({
  entity,
  field,
  index,
  count,
  expanded,
  autoFocusName,
  onToggle,
}: FieldRowProps) {
  const updateField = useProjectStore((s) => s.updateField)
  const removeField = useProjectStore((s) => s.removeField)
  const moveField = useProjectStore((s) => s.moveField)
  const rowCount = useProjectStore((s) => s.rowsByEntity[entity.id]?.length ?? 0)
  const hasRows = rowCount > 0

  const meta = FIELD_TYPES[field.type]

  const nameRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (expanded && autoFocusName && nameRef.current) {
      nameRef.current.focus()
      nameRef.current.select()
    }
  }, [expanded, autoFocusName])

  /* -- guardrail 1: no two columns share a name --------------- */
  const takenNames = useMemo(
    () => entity.fields.filter((f) => f.id !== field.id).map((f) => f.name),
    [entity.fields, field.id],
  )
  const nameGuard = useNameGuard({
    current: field.name,
    taken: takenNames,
    allowEmpty: true,
    message: (n) =>
      `A field named “${n}” already exists on this entity — two columns with the same name make every formula and import ambiguous.`,
    onCommit: (name) => updateField(entity.id, field.id, { name }),
  })

  /* -- guardrail 4: a list with nothing on it ----------------- */
  const emptyList = field.type === 'select' && (field.options?.length ?? 0) === 0

  const handleRemove = () => {
    const label = field.name.trim() || 'this untitled field'
    if (
      window.confirm(
        `Remove field "${label}" from ${entity.name}?\nIts column of data goes with it.`,
      )
    ) {
      removeField(entity.id, field.id)
    }
  }

  return (
    <div className={expanded ? 'ds-frow ds-frow-open' : 'ds-frow'}>
      <div className="ds-frow-head">
        <div className="ds-frow-arrows" aria-hidden={count < 2 || undefined}>
          <button
            type="button"
            className="ds-arrow-btn"
            disabled={index === 0}
            onClick={() => moveField(entity.id, field.id, -1)}
            aria-label={`Move ${field.name || 'field'} up`}
          >
            <ChevronUpGlyph />
          </button>
          <button
            type="button"
            className="ds-arrow-btn"
            disabled={index === count - 1}
            onClick={() => moveField(entity.id, field.id, 1)}
            aria-label={`Move ${field.name || 'field'} down`}
          >
            <ChevronDownGlyph />
          </button>
        </div>

        <button
          type="button"
          className="ds-frow-main"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="type-tag" style={{ color: meta.cssVar }}>
            {meta.tag}
          </span>
          <span className={field.name ? 'ds-frow-name' : 'ds-frow-name ds-frow-untitled'}>
            {field.name || 'untitled field'}
            {field.required ? (
              <span className="ds-req" title="Required">
                *
              </span>
            ) : null}
          </span>
          <span className="ds-frow-caret" aria-hidden="true">
            <ChevronRightGlyph />
          </span>
        </button>

        <button
          type="button"
          className="ds-frow-del"
          onClick={handleRemove}
          aria-label={`Delete field ${field.name || 'untitled'}`}
          title="Delete field"
        >
          <XGlyph />
        </button>
      </div>

      {/* the reviewer's mark, written in this row's margin — shown
          whether the row is open or shut, never as a form error */}
      <div className="ds-frow-mark">
        <FieldMark entityId={entity.id} fieldId={field.id} />
      </div>

      {/* stays put whether the row is open or shut — the column cannot
          hold a value until the list has something on it */}
      {emptyList ? (
        <div className="ds-frow-guard">
          <GuardNote
            tag="Blocker"
            live="status"
            action={expanded ? undefined : { label: 'Open options', onClick: onToggle }}
          >
            This list has no choices yet, so every cell in the column can only
            ever stay empty — give it at least one to choose from.
          </GuardNote>
        </div>
      ) : null}

      {expanded ? (
        <div className="ds-frow-body">
          <div className="ds-ctl-block">
            <label className="mono-label ds-lab" htmlFor={`ds-fname-${field.id}`}>
              Field name
            </label>
            <input
              id={`ds-fname-${field.id}`}
              ref={nameRef}
              className={nameGuard.invalid ? 'field-input ds-input-refused' : 'field-input'}
              value={nameGuard.draft ?? field.name}
              placeholder="Untitled field"
              aria-invalid={nameGuard.invalid || undefined}
              onChange={(e) => nameGuard.change(e.target.value)}
              onBlur={nameGuard.settle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  /* a refused name holds the edit open with its mark */
                  if (nameGuard.commit()) e.currentTarget.blur()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  /* the shell deselects on a bubbled Escape — here it
                     only means "undo what I was typing" */
                  e.stopPropagation()
                  nameGuard.cancel()
                }
              }}
            />
            {nameGuard.note ? (
              <div className="ds-ctl-note">
                <GuardNote
                  tag={nameGuard.reverted ? 'Reverted' : 'Blocked'}
                  live={nameGuard.reverted ? 'status' : 'alert'}
                >
                  {nameGuard.note}
                </GuardNote>
              </div>
            ) : null}
          </div>

          <div className="ds-ctl-block">
            <label className="mono-label ds-lab" htmlFor={`ds-ftype-${field.id}`}>
              Type
            </label>
            <div className="ds-type-row">
              <span className="type-tag" style={{ color: meta.cssVar }}>
                {meta.tag}
              </span>
              <select
                id={`ds-ftype-${field.id}`}
                className="field-input"
                value={field.type}
                onChange={(e) => {
                  const el = e.currentTarget
                  const next = el.value as FieldType
                  if (next === field.type) return
                  /* type change wipes the column in the store — when data
                     exists it must be confirm-gated like every other
                     destructive action */
                  if (hasRows) {
                    const label = field.name.trim() || 'this untitled field'
                    const rows = rowCount === 1 ? 'its 1 row' : `its ${rowCount} rows`
                    if (
                      !window.confirm(
                        `Change "${label}" to ${FIELD_TYPES[next].label}?\n\nThis clears the column's data across ${rows} — it cannot be recovered.`,
                      )
                    ) {
                      el.value = field.type
                      return
                    }
                  }
                  updateField(entity.id, field.id, { type: next })
                }}
              >
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPES[t].tag} · {FIELD_TYPES[t].label}
                  </option>
                ))}
              </select>
            </div>
            {hasRows ? (
              <p className="ds-warn">changing type clears this column’s data</p>
            ) : null}
          </div>

          <label className="ds-check">
            <input
              type="checkbox"
              className="ds-check-input"
              checked={field.required === true}
              onChange={(e) =>
                updateField(entity.id, field.id, {
                  required: e.target.checked || undefined,
                })
              }
            />
            <span className="ds-check-box" aria-hidden="true">
              <CheckGlyph />
            </span>
            <span className="mono-label ds-check-label">Required</span>
            <span className="ds-req ds-check-req" aria-hidden="true">
              *
            </span>
          </label>

          {field.type !== 'formula' ? (
            <div className="ds-ctl-block">
              <span className="mono-label ds-lab">Default value</span>
              <DefaultValueInput entityId={entity.id} field={field} />
            </div>
          ) : null}

          {field.type === 'select' ? (
            <SelectOptionsEditor entityId={entity.id} field={field} />
          ) : null}
          {field.type === 'reference' ? (
            <ReferenceEditor entityId={entity.id} field={field} />
          ) : null}
          {field.type === 'formula' ? <FormulaEditor entity={entity} field={field} /> : null}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ */
/* default value — control matches the field's type             */
/* ------------------------------------------------------------ */

function DefaultValueInput({ entityId, field }: { entityId: string; field: FieldDef }) {
  const updateField = useProjectStore((s) => s.updateField)
  const targetEntity = useProjectStore((s) =>
    field.refEntityId ? s.entities[field.refEntityId] : undefined,
  )
  const targetRows = useProjectStore((s) =>
    field.refEntityId ? s.rowsByEntity[field.refEntityId] : undefined,
  )

  const set = (v: CellValue | undefined) =>
    updateField(entityId, field.id, { defaultValue: v })

  const dv = field.defaultValue

  switch (field.type) {
    case 'text':
      return (
        <input
          className="field-input"
          value={typeof dv === 'string' ? dv : ''}
          placeholder="— none —"
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          className="field-input"
          value={typeof dv === 'number' ? dv : ''}
          placeholder="— none —"
          aria-label="Default value"
          onChange={(e) => {
            const t = e.target.value
            if (t === '') {
              set(undefined)
            } else {
              const n = Number(t)
              if (!Number.isNaN(n)) set(n)
            }
          }}
        />
      )
    case 'boolean':
      return (
        <select
          className="field-input"
          value={dv === true ? 'true' : dv === false ? 'false' : ''}
          aria-label="Default value"
          onChange={(e) =>
            set(e.target.value === '' ? undefined : e.target.value === 'true')
          }
        >
          <option value="">— none —</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )
    case 'date':
      return (
        <input
          type="date"
          className="field-input"
          value={typeof dv === 'string' ? dv : ''}
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        />
      )
    case 'select': {
      const opts = field.options ?? []
      if (opts.length === 0) {
        return <p className="ds-hint">Add options below first.</p>
      }
      return (
        <select
          className="field-input"
          value={typeof dv === 'string' && opts.includes(dv) ? dv : ''}
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">— none —</option>
          {/* the options editor refuses duplicates, but an imported project
              can still carry them — index-qualify so keys stay unique */}
          {opts.map((o, i) => (
            <option key={`${i}:${o}`} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    }
    case 'reference': {
      if (!field.refEntityId || !targetEntity) {
        return <p className="ds-hint">Choose a target entity below first.</p>
      }
      const rows = targetRows ?? []
      if (rows.length === 0) {
        return (
          <p className="ds-hint">
            No {targetEntity.name.toLowerCase()} rows drafted yet.
          </p>
        )
      }
      return (
        <select
          className="field-input"
          value={typeof dv === 'string' ? dv : ''}
          aria-label="Default value"
          onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
        >
          <option value="">— none —</option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {rowLabel(targetEntity, r)}
            </option>
          ))}
        </select>
      )
    }
    default:
      return null
  }
}
