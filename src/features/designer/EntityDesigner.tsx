/* ============================================================
   EntityDesigner — THE COLUMN SETUP for one table.
   Public contract: <EntityDesigner entityId="…" />

   IT SAYS TABLE AND COLUMN, NEVER ENTITY, SCHEMA OR FIELD. Those
   are the words the code uses; they are not the words on the sheet,
   and this surface was the only place in the app that said them out
   loud. A person who has just renamed "Dunbier Trailers" on the
   blueprint should not have to work out that the "entity" being
   described here is the same thing.

   THE REVIEWER IS NOT DRAWN HERE — see the note where `<EntityMarks>`
   used to be, below.
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
import { FieldRow } from './FieldRow'
import { GuardNote } from './GuardNote'
import { useNameGuard } from './useNameGuard'
import { ConfirmFacts, ConfirmSheet } from './ConfirmSheet'
import { draftColumnName } from './columnFacts'
import { entityDependents, nameList } from './dependents'
/* Phosphor only, through the house icon module — this folder used to
   hand-draw its own SVGs and drifted off the app's hairline weight. */
import { CaretRight, PencilSimple, Plus } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
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
  reference: 'Link to a row of another table',
  formula: 'Computed live from other columns',
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
      `A table named “${n}” is already on this sheet — two tables with one name make every link, export and rule ambiguous.`,
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

  /* -- the table's own three controls, folded (see the note on the
        toggle) — shut on arrival, because the door was about columns */
  const [aboutOpen, setAboutOpen] = useState(false)

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

  /* THE FIRST THING THE ADD BUTTON HANDED BACK WAS A FIELD. The
     store's `addField` falls back to `Field N` when no name is given,
     so a surface whose whole contract is "table and column, never
     entity, schema or field" opened its own new row saying the one
     word it exists not to say. The name is supplied here rather than
     changed in the store, because the store's fallback also names
     columns created by import, by a preset and by the join builder,
     and that is not this workflow's call to make. */
  const handleAdd = (type: FieldType) => {
    const created = addField(entity.id, {
      name: draftColumnName(entity.fields.map((f) => f.name)),
      type,
    })
    setMenuOpen(false)
    if (created) {
      setExpandedId(created.id)
      setFocusFieldId(created.id)
    }
  }

  /* -- danger -------------------------------------------------
     THE LAST `window.confirm` ON THIS SURFACE, and the act behind it
     is the largest one the app has. The OS dialog could name the rows
     and say "any link columns pointing at it" — it could not name
     WHICH columns, on which tables, and it never mentioned the third
     thing `deleteEntity` does: every rule ROOTED on this table is
     struck from the project. That is not a blocker to go and fix
     afterwards; the rule is gone, and this was the only warning a
     person would ever get about it. */
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  /* asked only while the sheet is up — `entityDependents` validates
     every rule in the project twice */
  const doomed = useMemo(() => {
    if (!confirmingDelete) return null
    const { entities: all, rowsByEntity, rules } = useProjectStore.getState()
    return entityDependents({ entities: all, rowsByEntity }, rules, entity.id)
  }, [confirmingDelete, entity.id])

  /* the two stamps a collapsed column row can carry, explained once */
  const chipLegend = useMemo(() => {
    const out: string[] = []
    if ((entity.hierarchy ?? []).some((id) => entity.fields.some((f) => f.id === id))) {
      out.push('Groups — the sheet opens a drawer on this column')
    }
    if (entity.fields.some((f) => entity.sections?.some((s) => s.id === f.sectionId))) {
      out.push('The other stamp is the band the column sits in')
    }
    return out
  }, [entity.fields, entity.hierarchy, entity.sections])

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
          <span className="mono-label ds-sheet-tag">Table · column setup</span>
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
              title="Rename this table"
            >
              <span className="ds-name-text">{entity.name}</span>
              <span className="ds-name-pencil" aria-hidden="true">
                <PencilSimple size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
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
              aria-label="Table name"
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

        {/* THE DOOR SAYS "WHAT IS EACH COLUMN ALLOWED TO HOLD?" AND
            THE ANSWER STARTED 290px DOWN. Three controls about the
            TABLE — its description, its accent ink, and which column
            names a row — stood between the person and the word
            COLUMNS, so a 31-column table showed eight of them below
            the fold on arrival. They are not removed; they are folded,
            with the fold naming exactly what is behind it so nothing
            has to be guessed at or hunted for. Shut on arrival because
            the arrival was about columns. */}
        <div className="ds-titleblock-row ds-about-row">
          <button
            type="button"
            className="ds-about-toggle"
            aria-expanded={aboutOpen}
            onClick={() => setAboutOpen((v) => !v)}
          >
            <span className="ds-about-caret" aria-hidden="true">
              <CaretRight size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            </span>
            <span className="mono-label ds-about-label">About this table</span>
            <span className="ds-about-what">
              description · accent ink · which column names a row
            </span>
          </button>
        </div>

        {aboutOpen ? (
        <>
        <div className="ds-titleblock-row ds-desc-row">
          <textarea
            ref={descRef}
            rows={1}
            className="ds-desc"
            placeholder="Describe this table — what it holds, where it came from…"
            value={entity.description ?? ''}
            aria-label="Table description"
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
            Which column names a row
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
              <option value="">— no eligible columns —</option>
            ) : (
              <option value="">Auto — the first column</option>
            )}
            {eligibleDisplay.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name || 'untitled column'}
              </option>
            ))}
          </select>
          <p className="ds-caption mono-label">labels rows elsewhere</p>
        </div>
        </>
        ) : null}
      </header>

      {/* THE REVIEWER USED TO BE DRAWN HERE, and taking it out is a
          decision rather than an omission. Its rules predate table
          kinds and roles: on the real sheet `entity-plural` fires on
          eleven brand price files and offers a ONE-CLICK rename of
          "Surtees" to "Surtee", and `island-entity` tells a person
          their Stabicraft catalogue may not belong on the sheet. There
          is no undo behind any of those buttons. The data reviewer
          gets its own door once its rules know what a brand table is;
          until then the column setup must not be the back way in. */}

      {/* ==================== fields ========================= */}
      <section className="ds-fields-sect">
        <div className="ds-sect">
          <span className="mono-label ds-sect-label">Columns</span>
          <span className="ds-sect-rule" aria-hidden="true" />
          <span className="mono-label ds-sect-meta">
            {String(entity.fields.length).padStart(2, '0')}
          </span>
        </div>

        {/* THE CHIPS HAD NO LEGEND, only `title` attributes — a sales
            manager reading GROUPS and IDENTITY on a row cannot guess
            either, and a tooltip is not an answer to someone who does
            not know there is a question. Drawn only when the table
            actually carries the thing being explained, so it is never
            a line about nothing. */}
        {chipLegend.length > 0 ? (
          <p className="ds-legend mono-label">
            {chipLegend.map((l, i) => (
              <span key={l}>
                {i > 0 ? <span aria-hidden="true"> · </span> : null}
                {l}
              </span>
            ))}
          </p>
        ) : null}

        {entity.fields.length === 0 ? (
          <div className="ds-empty-fields">
            <span className="mono-label">No columns drafted</span>
            <p>Every table needs at least one column — add the first below.</p>
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
            <Plus size={ICON_SIZE.tiny} weight="light" aria-hidden="true" /> Add column
          </button>
          {menuOpen ? (
            <div className="ds-add-menu" role="menu" aria-label="Column type">
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
          Deleting removes its rows and any link columns aimed at it.
        </p>
        <button
          type="button"
          className="btn btn-danger ds-danger-btn"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete this table
        </button>
      </footer>

      {confirmingDelete && doomed ? (
        <ConfirmSheet
          eyebrow="Delete table"
          question={`Delete “${entity.name}” from the sheet?`}
          onCancel={() => setConfirmingDelete(false)}
          choices={[
            {
              label: 'Delete the table',
              note:
                rowCount === 0
                  ? 'It has no rows, so no data goes with it.'
                  : `Its ${rowCount === 1 ? '1 row' : `${rowCount} rows`} go with it, and cannot be recovered.`,
              destructive: true,
              onPick: () => {
                setConfirmingDelete(false)
                deleteEntity(entity.id)
              },
            },
          ]}
        >
          <ConfirmFacts
            items={[
              rowCount === 1 ? '1 row' : `${rowCount} rows`,
              entity.fields.length === 1 ? '1 column' : `${entity.fields.length} columns`,
            ]}
          />

          {/* WHICH link columns, on WHICH tables — the cascade in
              `deleteEntity` drops these silently, and they are columns
              on tables the person is not looking at. */}
          {doomed.links.length > 0 ? (
            <p className="ds-cs-line ds-cs-line-warn">
              {doomed.links.length === 1
                ? 'A link column points here and goes too: '
                : `${doomed.links.length} link columns point here and go too: `}
              {nameList(doomed.links.map((l) => `${l.columnName} on ${l.tableName}`))}.
            </p>
          ) : null}

          {doomed.rootedRules.length > 0 ? (
            <p className="ds-cs-line ds-cs-line-warn">
              {doomed.rootedRules.length === 1 ? 'This rule is' : 'These rules are'} written
              about this table and {doomed.rootedRules.length === 1 ? 'is' : 'are'} deleted
              with it —{' '}
              {nameList(doomed.rootedRules.map((r) => r.ruleName || 'an unnamed rule'))}. They
              do not become blockers you can fix; they stop existing.
            </p>
          ) : null}

          {doomed.brokenRules.map((r) => (
            <p className="ds-cs-line ds-cs-line-warn" key={r.ruleId}>
              <span className="ds-cs-rule-name">{r.ruleName}</span> breaks:{' '}
              {r.messages.join(' ')}
            </p>
          ))}

          <p className="ds-cs-line">
            This app has no undo. The table can only come back from a file you exported
            earlier.
          </p>
        </ConfirmSheet>
      ) : null}
    </div>
  )
}
