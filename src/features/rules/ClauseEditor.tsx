/* ============================================================
   THE CLAUSE EDITOR — the most important surface in this module.

   A clause reads as a sentence with the row it belongs to stamped
   in front of it:

        MOTOR · HP
        ≥
        BOAT  · Min HP

   Nobody has to learn the word "scope": the stamps teach it. Both
   sides are dropdowns — there is no free-text field entry anywhere
   in this editor.
   ============================================================ */

import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar, rowLabel } from '@/types/model'
import type {
  CellValue,
  Clause,
  ClauseGroup,
  CompareOp,
  EntityDef,
  FieldDef,
  FieldType,
  ValueExpr,
} from '@/types/model'
import { newId } from '@/lib/id'
import {
  OP_MENU,
  decodePath,
  encodePath,
  fieldOptionsIn,
  isUnaryOp,
  opsForType,
  ownerIn,
  pathType,
  resolveIn,
  typeInk,
  typeTag,
  type EntityMap,
  type EntityScope,
  type FieldOption,
} from './describe'

/* ------------------------------------------------------------ */
/* Entity stamp — the name of the row a side reads               */
/* ------------------------------------------------------------ */

export function EntityStamp({
  entity,
  fallback,
}: {
  entity?: EntityDef
  fallback?: string
}) {
  if (!entity) {
    return <span className="rl-stamp rl-stamp--none">{fallback ?? 'value'}</span>
  }
  return (
    <span
      className="rl-stamp"
      style={{ '--rl-stamp-ink': accentVar(entity.accent) } as CSSProperties}
      title={`Reads the ${entity.name} row`}
    >
      {entity.name}
    </span>
  )
}

/* ------------------------------------------------------------ */
/* Field picker — never free text, one-hop links included        */
/* ------------------------------------------------------------ */

export function FieldSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Pick a field',
  invalid,
}: {
  value: string
  options: FieldOption[]
  onChange: (key: string) => void
  ariaLabel: string
  placeholder?: string
  invalid?: boolean
}) {
  const known = options.some((o) => o.key === value)
  const current = options.find((o) => o.key === value)
  /* when both rows are in scope the dropdown says which row each field
     belongs to — the same lesson the stamp teaches, inside the menu */
  const owners = new Set(options.map((o) => o.owner.id))
  const showOwner = owners.size > 1
  return (
    <span className="rl-fieldpick">
      <select
        className={`rl-select${invalid || (!!value && !known) ? ' is-invalid' : ''}`}
        aria-label={ariaLabel}
        value={known ? value : ''}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {!!value && !known ? (
          <option value={value}>(field removed)</option>
        ) : null}
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {showOwner ? `${o.owner.name} · ${o.label}` : o.label}
          </option>
        ))}
      </select>
      {current ? (
        <span
          className="type-tag rl-ftag"
          style={{ color: typeInk(current.field) }}
          title={current.field.type}
        >
          {typeTag(current.field)}
        </span>
      ) : null}
    </span>
  )
}

/* ------------------------------------------------------------ */
/* Literal input, typed to the field it is compared against      */
/* ------------------------------------------------------------ */

function LiteralInput({
  type,
  field,
  value,
  onChange,
  ariaLabel,
}: {
  type: FieldType | undefined
  field: FieldDef | undefined
  value: CellValue | undefined
  onChange: (v: CellValue) => void
  ariaLabel: string
}) {
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const entities = useProjectStore((s) => s.entities)

  if (type === 'boolean') {
    return (
      <select
        className="rl-select"
        aria-label={ariaLabel}
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(e) => {
          const v = e.currentTarget.value
          onChange(v === '' ? null : v === 'true')
        }}
      >
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }

  if (type === 'select') {
    const options = field?.options ?? []
    return (
      <select
        className="rl-select"
        aria-label={ariaLabel}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.currentTarget.value || null)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }

  if (type === 'reference') {
    const target = field?.refEntityId ? entities[field.refEntityId] : undefined
    const rows = target ? (rowsByEntity[target.id] ?? []) : []
    return (
      <select
        className="rl-select"
        aria-label={ariaLabel}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.currentTarget.value || null)}
      >
        <option value="">—</option>
        {target
          ? rows.map((r) => (
              <option key={r.id} value={r.id}>
                {rowLabel(target, r)}
              </option>
            ))
          : null}
      </select>
    )
  }

  if (type === 'number') {
    return (
      <input
        className="field-input rl-input"
        type="number"
        aria-label={ariaLabel}
        value={value === null || value === undefined ? '' : String(value)}
        placeholder="0"
        onChange={(e) => {
          const raw = e.currentTarget.value
          onChange(raw === '' ? null : Number(raw))
        }}
      />
    )
  }

  if (type === 'date') {
    return (
      <input
        className="field-input rl-input"
        type="date"
        aria-label={ariaLabel}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.currentTarget.value || null)}
      />
    )
  }

  return (
    <input
      className="field-input rl-input"
      type="text"
      aria-label={ariaLabel}
      value={value === null || value === undefined ? '' : String(value)}
      placeholder="Type a value"
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  )
}

/* ------------------------------------------------------------ */
/* ValueEditor — field / value / formula                         */
/* ------------------------------------------------------------ */

const MODES = [
  { kind: 'field' as const, tag: 'FLD', hint: 'A field of the other row' },
  { kind: 'literal' as const, tag: 'VAL', hint: 'A value you type' },
  { kind: 'formula' as const, tag: 'ƒx', hint: 'A calculation' },
]

export function ValueEditor({
  value,
  onChange,
  fieldScope,
  entities,
  compareField,
  ariaPrefix,
  allowField = true,
}: {
  value: ValueExpr | undefined
  onChange: (v: ValueExpr) => void
  /** rows a `field` value may read — the SOURCE row first inside a match */
  fieldScope: EntityScope
  entities: EntityMap
  /** the field on the other side, so a literal gets the right input */
  compareField?: FieldDef
  ariaPrefix: string
  allowField?: boolean
}) {
  const mode = value?.kind ?? 'literal'
  const options = useMemo(
    () => fieldOptionsIn(fieldScope, entities),
    [fieldScope, entities],
  )

  const switchTo = (kind: 'field' | 'literal' | 'formula') => {
    if (kind === mode) return
    if (kind === 'literal') onChange({ kind: 'literal', value: null })
    else if (kind === 'formula') onChange({ kind: 'formula', src: '' })
    else onChange({ kind: 'field', path: { fieldId: options[0]?.field.id ?? '' } })
  }

  const modes = allowField ? MODES : MODES.filter((m) => m.kind !== 'field')

  return (
    <div className="rl-value">
      <div className="rl-side">
        {mode === 'field' ? (
          <EntityStamp
            entity={ownerIn(fieldScope, value?.kind === 'field' ? value.path : undefined, entities)}
          />
        ) : (
          <EntityStamp fallback={mode === 'formula' ? 'ƒx' : 'value'} />
        )}

        {mode === 'field' ? (
          <FieldSelect
            ariaLabel={`${ariaPrefix} field`}
            value={value?.kind === 'field' ? encodePath(value.path) : ''}
            options={options}
            onChange={(key) => onChange({ kind: 'field', path: decodePath(key) })}
          />
        ) : mode === 'formula' ? (
          <input
            className="field-input rl-input rl-input--mono"
            aria-label={`${ariaPrefix} formula`}
            spellCheck={false}
            placeholder="[Price] * 0.9"
            value={value?.kind === 'formula' ? value.src : ''}
            onChange={(e) => onChange({ kind: 'formula', src: e.currentTarget.value })}
          />
        ) : (
          <LiteralInput
            ariaLabel={`${ariaPrefix} value`}
            type={compareField?.type}
            field={compareField}
            value={value?.kind === 'literal' ? value.value : null}
            onChange={(v) => onChange({ kind: 'literal', value: v })}
          />
        )}
      </div>

      <div className="rl-modes" role="group" aria-label={`${ariaPrefix} source`}>
        {modes.map((m) => (
          <button
            key={m.kind}
            type="button"
            className={`rl-mode${mode === m.kind ? ' is-on' : ''}`}
            aria-pressed={mode === m.kind}
            title={m.hint}
            onClick={() => switchTo(m.kind)}
          >
            {m.tag}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* One clause                                                    */
/* ------------------------------------------------------------ */

function ClauseRow({
  clause,
  index,
  left,
  right,
  entities,
  onChange,
  onRemove,
}: {
  clause: Clause
  index: number
  left: EntityScope
  right: EntityScope
  entities: EntityMap
  onChange: (c: Clause) => void
  onRemove: () => void
}) {
  const leftOptions = useMemo(() => fieldOptionsIn(left, entities), [left, entities])
  const leftField = resolveIn(left, clause.left, entities).field
  const leftType = pathType(left, clause.left, entities)
  const ops = opsForType(leftType)
  const unary = isUnaryOp(clause.op)

  const setLeft = (key: string) => {
    const path = decodePath(key)
    const nextType = pathType(left, path, entities)
    const nextOps = opsForType(nextType)
    const op = nextOps.includes(clause.op) ? clause.op : (nextOps[0] ?? clause.op)
    const next: Clause = { ...clause, left: path, op }
    /* a literal typed for the old field must not survive a type change */
    if (isUnaryOp(op)) delete next.right
    else if (clause.right?.kind === 'literal' && nextType !== leftType) {
      next.right = { kind: 'literal', value: null }
    } else if (!clause.right) {
      next.right = { kind: 'literal', value: null }
    }
    onChange(next)
  }

  const setOp = (op: CompareOp) => {
    const next: Clause = { ...clause, op }
    if (isUnaryOp(op)) {
      /* unary ops take NO right-hand side — never leave a stale one behind */
      delete next.right
    } else if (!next.right) {
      next.right = { kind: 'literal', value: null }
    }
    onChange(next)
  }

  return (
    <div className="rl-clause">
      <div className="rl-clause-head">
        <span className="rl-clause-n">{String(index + 1).padStart(2, '0')}</span>
        <button
          type="button"
          className="rl-x"
          aria-label={`Remove condition ${index + 1}`}
          title="Remove this condition"
          onClick={onRemove}
        >
          ×
        </button>
      </div>

      <div className="rl-side">
        <EntityStamp entity={ownerIn(left, clause.left, entities)} />
        <FieldSelect
          ariaLabel={`Condition ${index + 1} — field`}
          value={encodePath(clause.left)}
          options={leftOptions}
          onChange={setLeft}
        />
      </div>

      <div className="rl-op">
        <select
          className="rl-select rl-select--op"
          aria-label={`Condition ${index + 1} — operator`}
          value={clause.op}
          onChange={(e) => setOp(e.currentTarget.value as CompareOp)}
        >
          {ops.map((o) => (
            <option key={o} value={o}>
              {OP_MENU[o]}
            </option>
          ))}
        </select>
      </div>

      {unary ? (
        <p className="rl-unary">nothing to compare against</p>
      ) : (
        <ValueEditor
          ariaPrefix={`Condition ${index + 1} —`}
          value={clause.right}
          onChange={(expr) => onChange({ ...clause, right: expr })}
          fieldScope={right}
          entities={entities}
          compareField={leftField}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ */
/* The group                                                     */
/* ------------------------------------------------------------ */

export interface ClauseEditorProps {
  group: ClauseGroup
  /** rows the LEFT side may read — the candidate row inside a match */
  left: EntityScope
  /** rows a `field` right-hand side may read — the source row first */
  right: EntityScope
  entities: EntityMap
  onChange: (group: ClauseGroup) => void
  /** copy for the designed empty state */
  emptyTitle?: string
  emptyHint?: string
  addLabel?: string
}

export function ClauseEditor({
  group,
  left,
  right,
  entities,
  onChange,
  emptyTitle = 'No conditions yet',
  emptyHint = 'Every row will pass until you add one.',
  addLabel = 'Add condition',
}: ClauseEditorProps) {
  const options = useMemo(() => fieldOptionsIn(left, entities), [left, entities])
  const canAdd = options.length > 0

  /* A NEW CONDITION NAMES NO FIELD. It used to open on `options[0]` —
     whichever field happened to sort first on the table being tested —
     so pressing "Add condition" wrote a test the person had not chosen,
     already reading as though it meant something. The same fault put an
     invented sentence in front of the ADD RULE button on the business
     rules pane; it is the same fix here. `FieldSelect` already draws an
     unchosen field as its disabled "Pick a field" prompt, and the
     validator already reports a clause with no field as a blocker, so
     the empty state is both visible and named. */
  const addClause = () => {
    if (!canAdd) return
    const clause: Clause = { id: newId(), left: { fieldId: '' }, op: 'eq' }
    clause.right = { kind: 'literal', value: null }
    onChange({ ...group, clauses: [...group.clauses, clause] })
  }

  const setClause = (id: string, next: Clause) => {
    onChange({
      ...group,
      clauses: group.clauses.map((c) => (c.id === id ? next : c)),
    })
  }

  const removeClause = (id: string) => {
    onChange({ ...group, clauses: group.clauses.filter((c) => c.id !== id) })
  }

  const setCombinator = (combinator: 'AND' | 'OR') => {
    if (combinator === group.combinator) return
    onChange({ ...group, combinator })
  }

  return (
    <div className="rl-group">
      <div className="rl-group-head">
        <span className="mono-label rl-group-lab">
          {group.combinator === 'AND' ? 'Match all of' : 'Match any of'}
        </span>
        <div className="rl-seg" role="group" aria-label="Combine conditions with">
          <button
            type="button"
            className={`rl-seg-btn${group.combinator === 'AND' ? ' is-on' : ''}`}
            aria-pressed={group.combinator === 'AND'}
            onClick={() => setCombinator('AND')}
          >
            And
          </button>
          <button
            type="button"
            className={`rl-seg-btn${group.combinator === 'OR' ? ' is-on' : ''}`}
            aria-pressed={group.combinator === 'OR'}
            onClick={() => setCombinator('OR')}
          >
            Or
          </button>
        </div>
      </div>

      {group.clauses.length === 0 ? (
        <div className="rl-empty rl-empty--inline">
          <span className="rl-empty-title">{emptyTitle}</span>
          <span className="rl-empty-hint">{emptyHint}</span>
        </div>
      ) : (
        <div className="rl-clauses">
          {group.clauses.map((c, i) => (
            <div key={c.id}>
              {i > 0 ? (
                <button
                  type="button"
                  className="rl-joiner"
                  title="Switch between AND and OR"
                  onClick={() =>
                    setCombinator(group.combinator === 'AND' ? 'OR' : 'AND')
                  }
                >
                  {group.combinator}
                </button>
              ) : null}
              <ClauseRow
                clause={c}
                index={i}
                left={left}
                right={right}
                entities={entities}
                onChange={(next) => setClause(c.id, next)}
                onRemove={() => removeClause(c.id)}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn rl-add"
        onClick={addClause}
        disabled={!canAdd}
        title={canAdd ? undefined : 'This table has no columns to compare yet'}
      >
        + {addLabel}
      </button>
    </div>
  )
}
