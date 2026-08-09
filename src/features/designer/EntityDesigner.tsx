/* ============================================================
   EntityDesigner — the schema sheet for one entity.
   Renders inside the shell's right inspector (SCHEMA tab).
   Public contract: <EntityDesigner entityId="…" />
   ============================================================ */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ACCENT_KEYS,
  FIELD_TYPES,
  accentVar,
  type AccentKey,
  type EntityDef,
  type FieldType,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { EntityMarks } from './EntityMarks'
import { FieldRow } from './FieldRow'
import { GuardNote } from './GuardNote'
import { useNameGuard } from './useNameGuard'
import { PencilGlyph, PlusGlyph } from './glyphs'
import './designer.css'

export function EntityDesigner({ entityId }: { entityId: string }) {
  const entity = useProjectStore((s) => s.entities[entityId])
  /* the selection can briefly point at a just-deleted entity */
  if (!entity) return null
  /* key resets all sheet-local state when the inspected entity changes */
  return <DesignerSheet key={entity.id} entity={entity} />
}

/* ------------------------------------------------------------ */

const TYPE_ORDER = Object.keys(FIELD_TYPES) as FieldType[]

const TYPE_HINTS: Record<FieldType, string> = {
  text: 'Free-form words, notes, labels',
  number: 'Quantities, prices, measures',
  boolean: 'A single yes / no mark',
  date: 'A point on the calendar',
  select: 'One choice from a fixed list',
  reference: 'Link to a row of another entity',
  formula: 'Computed live from other fields',
  image: 'Pictures — the first one is the primary',
}

function DesignerSheet({ entity }: { entity: EntityDef }) {
  const updateEntity = useProjectStore((s) => s.updateEntity)
  const deleteEntity = useProjectStore((s) => s.deleteEntity)
  const addField = useProjectStore((s) => s.addField)
  const entities = useProjectStore((s) => s.entities)
  const rowCount = useProjectStore((s) => s.rowsByEntity[entity.id]?.length ?? 0)

  /* -- SAVED stamp: lights while mutations land, fades after -- */
  const [saving, setSaving] = useState(false)
  const lastStamp = useRef(entity.updatedAt)
  useEffect(() => {
    if (entity.updatedAt === lastStamp.current) return
    lastStamp.current = entity.updatedAt
    setSaving(true)
    const t = setTimeout(() => setSaving(false), 1600)
    return () => clearTimeout(t)
  }, [entity.updatedAt])

  /* -- inline name edit (guardrail 2: no duplicate entity names) --
     Trimmed + case-insensitive, self excluded, so renaming an entity
     to its own name is always a no-op rather than a rejection. */
  const takenNames = useMemo(
    () =>
      Object.values(entities)
        .filter((e) => e.id !== entity.id)
        .map((e) => e.name),
    [entities, entity.id],
  )
  const nameGuard = useNameGuard({
    current: entity.name,
    taken: takenNames,
    allowEmpty: false,
    message: (n) =>
      `An entity named “${n}” is already on this sheet — two entities with one name make every link, export and rule ambiguous.`,
    onCommit: (name) => updateEntity(entity.id, { name }),
  })

  /* -- auto-growing description ------------------------------ */
  const descRef = useRef<HTMLTextAreaElement | null>(null)
  useLayoutEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [entity.description])

  /* -- accent ink picker ------------------------------------- */
  const [hoverInk, setHoverInk] = useState<AccentKey | null>(null)

  /* -- fields accordion -------------------------------------- */
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null)

  /* -- add-field type tray ----------------------------------- */
  const [menuOpen, setMenuOpen] = useState(false)
  const addWrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (ev: PointerEvent) => {
      if (
        addWrapRef.current &&
        ev.target instanceof Node &&
        !addWrapRef.current.contains(ev.target)
      ) {
        setMenuOpen(false)
      }
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        /* Escape only dismisses the tray. Shell and Whiteboard both hold
           window-level bubble keydown handlers that select(null) on Escape;
           this document-level handler bubbles first, so stopping the event
           here keeps the entity selected and the inspector open. */
        ev.preventDefault()
        ev.stopPropagation()
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleAdd = (type: FieldType) => {
    const created = addField(entity.id, { name: '', type })
    setMenuOpen(false)
    if (created) {
      setExpandedId(created.id)
      setFocusFieldId(created.id)
    }
  }

  /* -- danger ------------------------------------------------- */
  const handleDeleteEntity = () => {
    const rows = rowCount === 1 ? 'its 1 row' : `its ${rowCount} rows`
    if (
      window.confirm(
        `Delete entity "${entity.name}"?\n\nThis strikes it from the sheet — ${rows} and any link fields pointing at it are removed too.`,
      )
    ) {
      deleteEntity(entity.id)
    }
  }

  const eligibleDisplay = entity.fields.filter((f) => f.type !== 'formula')
  const displayValue =
    entity.displayFieldId && eligibleDisplay.some((f) => f.id === entity.displayFieldId)
      ? entity.displayFieldId
      : ''

  return (
    <div className="ds-root">
      {/* ==================== title block ==================== */}
      <header className="ds-titleblock">
        <div className="ds-titleblock-row ds-tag-row">
          <span className="mono-label ds-sheet-tag">Entity · schema sheet</span>
          <span className={saving ? 'ds-saved mono-label ds-saved-show' : 'ds-saved mono-label'} role="status">
            Saved
          </span>
        </div>

        <div className="ds-titleblock-row">
          {nameGuard.draft === null ? (
            <button
              type="button"
              className="ds-name-view block-heading"
              onClick={() => nameGuard.begin()}
              title="Rename entity"
            >
              <span className="ds-name-text">{entity.name}</span>
              <span className="ds-name-pencil" aria-hidden="true">
                <PencilGlyph />
              </span>
            </button>
          ) : (
            <input
              className={
                nameGuard.invalid
                  ? 'ds-name-input ds-name-input-refused block-heading'
                  : 'ds-name-input block-heading'
              }
              value={nameGuard.draft}
              autoFocus
              aria-label="Entity name"
              aria-invalid={nameGuard.invalid || undefined}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => nameGuard.change(e.target.value)}
              onBlur={nameGuard.settle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  /* a refused commit holds the edit open, mark and all */
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
          )}
          {nameGuard.note ? (
            <div className="ds-name-note">
              <GuardNote
                tag={nameGuard.reverted ? 'Reverted' : 'Blocked'}
                live={nameGuard.reverted ? 'status' : 'alert'}
              >
                {nameGuard.note}
              </GuardNote>
            </div>
          ) : null}
        </div>

        <div className="ds-titleblock-row ds-desc-row">
          <textarea
            ref={descRef}
            rows={1}
            className="ds-desc"
            placeholder="Describe this entity — purpose, provenance, notes…"
            value={entity.description ?? ''}
            aria-label="Entity description"
            onChange={(e) => updateEntity(entity.id, { description: e.target.value })}
          />
        </div>

        <div className="ds-titleblock-row ds-inkrow">
          <div className="ds-inkcol">
            <span className="mono-label ds-lab">Accent ink</span>
            <div className="ds-swatches" onMouseLeave={() => setHoverInk(null)}>
              {ACCENT_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={entity.accent === k ? 'ds-swatch ds-swatch-sel' : 'ds-swatch'}
                  style={{ background: accentVar(k), color: accentVar(k) }}
                  aria-label={`Ink: ${k}`}
                  aria-pressed={entity.accent === k}
                  onMouseEnter={() => setHoverInk(k)}
                  onFocus={() => setHoverInk(k)}
                  onBlur={() => setHoverInk(null)}
                  onClick={() => updateEntity(entity.id, { accent: k })}
                />
              ))}
            </div>
          </div>
          <span className="ds-ink-name mono-label">{hoverInk ?? entity.accent}</span>
        </div>

        <div className="ds-titleblock-row ds-dfield">
          <label className="mono-label ds-lab" htmlFor="ds-display-field">
            Display field
          </label>
          <select
            id="ds-display-field"
            className="field-input"
            value={displayValue}
            disabled={eligibleDisplay.length === 0}
            onChange={(e) =>
              updateEntity(entity.id, { displayFieldId: e.target.value || undefined })
            }
          >
            {eligibleDisplay.length === 0 ? (
              <option value="">— no eligible fields —</option>
            ) : (
              <option value="">Auto — first field</option>
            )}
            {eligibleDisplay.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name || 'untitled field'}
              </option>
            ))}
          </select>
          <p className="ds-caption mono-label">labels rows elsewhere</p>
        </div>
      </header>

      {/* ============ reviewer marks (entity level) =========== */}
      <EntityMarks entityId={entity.id} />

      {/* ==================== fields ========================= */}
      <section className="ds-fields-sect">
        <div className="ds-sect">
          <span className="mono-label ds-sect-label">Fields</span>
          <span className="ds-sect-rule" aria-hidden="true" />
          <span className="mono-label ds-sect-meta">
            {String(entity.fields.length).padStart(2, '0')}
          </span>
        </div>

        {entity.fields.length === 0 ? (
          <div className="ds-empty-fields">
            <span className="mono-label">No columns drafted</span>
            <p>Every entity needs at least one field — add the first below.</p>
          </div>
        ) : (
          <div className="ds-fields">
            {entity.fields.map((f, i) => (
              <FieldRow
                key={f.id}
                entity={entity}
                field={f}
                index={i}
                count={entity.fields.length}
                expanded={expandedId === f.id}
                autoFocusName={focusFieldId === f.id}
                onToggle={() => {
                  setExpandedId((cur) => (cur === f.id ? null : f.id))
                  setFocusFieldId(null)
                }}
              />
            ))}
          </div>
        )}

        <div className="ds-add-wrap" ref={addWrapRef}>
          <button
            type="button"
            className="btn ds-add-btn"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <PlusGlyph /> Add field
          </button>
          {menuOpen ? (
            <div className="ds-add-menu" role="menu" aria-label="Field type">
              {TYPE_ORDER.map((t) => {
                const meta = FIELD_TYPES[t]
                return (
                  <button
                    key={t}
                    type="button"
                    role="menuitem"
                    className="ds-add-item"
                    onClick={() => handleAdd(t)}
                  >
                    <span className="type-tag" style={{ color: meta.cssVar }}>
                      {meta.tag}
                    </span>
                    <span className="ds-add-item-text">
                      <span className="ds-add-item-name">{meta.label}</span>
                      <span className="ds-add-item-desc">{TYPE_HINTS[t]}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </section>

      {/* ==================== danger ========================= */}
      <footer className="ds-danger">
        <div className="ds-sect ds-sect-danger">
          <span className="mono-label ds-sect-label">Danger</span>
          <span className="ds-sect-rule" aria-hidden="true" />
        </div>
        <p className="ds-danger-note mono-label">
          Deleting removes its rows and any link fields aimed at it.
        </p>
        <button
          type="button"
          className="btn btn-danger ds-danger-btn"
          onClick={handleDeleteEntity}
        >
          Delete entity
        </button>
      </footer>
    </div>
  )
}
