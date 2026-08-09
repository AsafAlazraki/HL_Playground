/* ============================================================
   ONE COLUMN of a table — collapsed card row + accordion editor
   (name / type / required / default + per-type editor).

   IT SAYS COLUMN, NEVER FIELD OR SCHEMA. The rest of the app calls
   this thing a column because that is what a person sees on the
   sheet; a surface that renames it halfway through the sentence
   makes the reader wonder whether they are editing something else.
   ============================================================ */

import { useEffect, useMemo, useRef } from 'react'
import {
  FIELD_TYPES,
  UID_FIELD,
  rowLabel,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type FieldType,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { FormulaEditor, ReferenceEditor, SelectOptionsEditor } from './FieldTypeEditors'
import { GuardNote } from './GuardNote'
import { useNameGuard } from './useNameGuard'
/* PHOSPHOR ONLY, THROUGH `@/lib/icons`. This folder used to hand-draw
   eight SVGs of its own, so the same caret appeared here at 1.4px and
   everywhere else in the app at Phosphor's 'light' weight — a hairline
   language that disagrees with itself a few hundred pixels apart. */
import { CaretDown, CaretRight, CaretUp, Check, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'

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

  /* BRING THE EDITOR YOU JUST OPENED ONTO THE SCREEN. The row expands
     in place, and a column two thirds of the way down a 26-column table
     opens its whole editor below the fold: you click, the caret turns,
     and nothing you can see has changed. `block: 'nearest'` scrolls by
     the least that makes the panel whole — a row already fully visible
     does not move at all. Deferred one frame, because the panel does
     not exist to be measured until after this render. */
  const rowRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!expanded) return
    const id = requestAnimationFrame(() => {
      rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [expanded])

  /* -- guardrail 1: no two columns share a name ---------------
     UID IS ON THE LIST THOUGH IT IS NOT IN `entity.fields`. The grid
     always draws a system UID column and refuses a second one by that
     name; this surface used to accept it, so the same table could be
     given two columns headed UID depending on which screen you were
     standing on. */
  const takenNames = useMemo(
    () => [
      UID_FIELD.name,
      ...entity.fields.filter((f) => f.id !== field.id).map((f) => f.name),
    ],
    [entity.fields, field.id],
  )
  const nameGuard = useNameGuard({
    current: field.name,
    taken: takenNames,
    /* A NAMELESS COLUMN IS NOT A COLUMN. The table refuses to blank a
       header for the plain reason that nothing can then refer to it —
       no formula, no import, no rule — and the two surfaces edit the
       same column, so they cannot disagree about that. */
    allowEmpty: false,
    message: (n) =>
      `A column named “${n}” already exists on this table — two columns with the same name make every formula and import ambiguous.`,
    onCommit: (name) => updateField(entity.id, field.id, { name }),
  })

  /* -- guardrail 4: a list with nothing on it ----------------- */
  const emptyList = field.type === 'select' && (field.options?.length ?? 0) === 0

  /* WHAT THE TABLE KNOWS AND THIS SHEET DID NOT SAY.
     A band is a named run of consecutive columns and the grid draws its
     header from `sectionId`; a grouping level is a column the grid
     drawers open on. Both were invisible here, so a person reordering
     columns or deleting one could not see they were taking apart the
     structure of the sheet they were looking at. Named, not editable —
     editing them belongs to the table. */
  const band = entity.sections?.find((s) => s.id === field.sectionId)
  const groupLevel = (entity.hierarchy ?? []).indexOf(field.id)

  const handleRemove = () => {
    const label = field.name.trim() || 'this untitled column'
    const warning =
      groupLevel >= 0
        ? `\n\nIt is also a grouping level, so ${entity.name} loses that drawer on the sheet.`
        : ''
    if (
      window.confirm(
        `Remove the column "${label}" from ${entity.name}?\nIts column of data goes with it.${warning}`,
      )
    ) {
      removeField(entity.id, field.id)
    }
  }

  return (
    <div className={expanded ? 'ds-frow ds-frow-open' : 'ds-frow'} ref={rowRef}>
      <div className="ds-frow-head">
        <div className="ds-frow-arrows" aria-hidden={count < 2 || undefined}>
          <button
            type="button"
            className="ds-arrow-btn"
            disabled={index === 0}
            onClick={() => moveField(entity.id, field.id, -1)}
            aria-label={`Move the column ${field.name || 'untitled'} up`}
          >
            <CaretUp size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ds-arrow-btn"
            disabled={index === count - 1}
            onClick={() => moveField(entity.id, field.id, 1)}
            aria-label={`Move the column ${field.name || 'untitled'} down`}
          >
            <CaretDown size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          </button>
        </div>

        {/* THE NAME OF THIS CONTROL WAS "TXT SERIES GROUPS IDENTITY" —
            three stamps read out in a row, with no verb and no hint
            that pressing it opens anything. It is stated plainly here;
            `aria-expanded` carries the open/shut state. */}
        <button
          type="button"
          className="ds-frow-main"
          aria-expanded={expanded}
          aria-label={`Set up the column ${field.name || 'untitled'}`}
          onClick={onToggle}
        >
          <span className="type-tag" style={{ color: meta.cssVar }}>
            {meta.tag}
          </span>
          <span className={field.name ? 'ds-frow-name' : 'ds-frow-name ds-frow-untitled'}>
            {field.name || 'untitled column'}
            {field.required ? (
              <span className="ds-req" title="Required">
                *
              </span>
            ) : null}
          </span>
          {groupLevel >= 0 ? (
            <span
              className="mono-label ds-frow-level"
              title={`Grouping level ${groupLevel + 1} — the sheet opens a drawer on this column`}
            >
              Groups
            </span>
          ) : null}
          {band ? (
            <span className="mono-label ds-frow-band" title={`Band: ${band.name}`}>
              {band.name}
            </span>
          ) : null}
          <span className="ds-frow-caret" aria-hidden="true">
            <CaretRight size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          className="ds-frow-del"
          onClick={handleRemove}
          aria-label={`Delete the column ${field.name || 'untitled'}`}
          title="Delete this column"
        >
          <X size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
        </button>
      </div>

      {/* THE REVIEWER IS NOT DRAWN HERE, and this is a decision rather
          than an omission. `<FieldMark>` puts a one-click "Apply fix"
          in this margin with no confirmation, and this app has no undo.
          On the real sheet its commonest suggestion — "this column only
          ever holds one value, make it a choice list" — fires on 26
          columns where the fix would LOCK the column to that single
          value, and `updateField` wipes every cell in the column on the
          way through. The lint rules also predate table kinds and
          roles, so they read a brand price file as a mis-named entity.
          The reviewer gets its own door once its rules know what a
          brand table is and its fixes are confirm-gated; until then the
          column setup must not be the back way in. */}

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
              Column name
            </label>
            <input
              id={`ds-fname-${field.id}`}
              ref={nameRef}
              className={nameGuard.invalid ? 'field-input ds-input-refused' : 'field-input'}
              value={nameGuard.draft ?? field.name}
              placeholder="Name this column"
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
                    const label = field.name.trim() || 'this untitled column'
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
              <Check size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            </span>
            <span className="mono-label ds-check-label">Required</span>
            <span className="ds-req ds-check-req" aria-hidden="true">
              *
            </span>
          </label>

          {/* NO DEFAULT BLOCK WITHOUT A CONTROL UNDER IT. A formula
              column computes its value, and a picture column has no
              value to pre-set — `DefaultValueInput` renders nothing for
              either, so drawing the label over them left a heading with
              empty space beneath it, which reads as a control that
              failed to load. */}
          {field.type !== 'formula' && field.type !== 'image' ? (
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
