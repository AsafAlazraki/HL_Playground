/* ============================================================
   Type-specific field editors: select options, reference
   target, and the formula workbench (live validation).
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FIELD_TYPES,
  accentVar,
  type EntityDef,
  type FieldDef,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { FORMULA_FUNCTIONS, validateFormula } from '@/lib/formula'
import { GuardNote } from './GuardNote'
import {
  CheckGlyph,
  ChevronDownGlyph,
  ChevronRightGlyph,
  ChevronUpGlyph,
  PlusGlyph,
  XGlyph,
} from './glyphs'

/* ------------------------------------------------------------ */
/* select — options editor                                      */
/* ------------------------------------------------------------ */

export function SelectOptionsEditor({
  entityId,
  field,
}: {
  entityId: string
  field: FieldDef
}) {
  const updateField = useProjectStore((s) => s.updateField)
  const [draft, setDraft] = useState('')
  const options = field.options ?? []

  /* A default that is no longer on the list is not "unset" — the store
     still stamps it onto every new row, while the picker below can only
     show '— none —'. Reconcile it in the same commit so the control tells
     the truth and no row is born holding a choice the list refuses. */
  const commit = (next: string[]) => {
    const dv = field.defaultValue
    const patch: Partial<Omit<FieldDef, 'id'>> =
      typeof dv === 'string' && !next.includes(dv)
        ? { options: next, defaultValue: undefined }
        : { options: next }
    updateField(entityId, field.id, patch)
  }

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (!options.includes(v)) commit([...options, v])
    setDraft('')
  }

  const remove = (i: number) => commit(options.filter((_, idx) => idx !== i))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= options.length) return
    const next = [...options]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }

  return (
    <div className="ds-sub">
      <div className="ds-sub-head">
        <span className="mono-label ds-lab-inline">Options</span>
        <span className="mono-label ds-sub-count">{String(options.length).padStart(2, '0')}</span>
      </div>

      <div className="ds-opt-addrow">
        <input
          className="field-input"
          value={draft}
          placeholder="Type a choice, press Enter"
          aria-label="New option"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
            if (e.key === 'Escape') setDraft('')
          }}
        />
        <button
          type="button"
          className="ds-mini-btn ds-opt-addbtn"
          onClick={add}
          disabled={!draft.trim()}
          aria-label="Add option"
        >
          <PlusGlyph />
        </button>
      </div>

      {options.length === 0 ? (
        <p className="ds-hint">No choices on the list yet — draft the first one above.</p>
      ) : (
        <ul className="ds-opt-list">
          {options.map((opt, i) => (
            <li key={`${opt}-${i}`} className="ds-opt-row">
              <span className="ds-opt-idx mono-label">{String(i + 1).padStart(2, '0')}</span>
              <span className="ds-opt-name">{opt}</span>
              <span className="ds-opt-btns">
                <button
                  type="button"
                  className="ds-mini-btn"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move ${opt} up`}
                >
                  <ChevronUpGlyph />
                </button>
                <button
                  type="button"
                  className="ds-mini-btn"
                  disabled={i === options.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move ${opt} down`}
                >
                  <ChevronDownGlyph />
                </button>
                <button
                  type="button"
                  className="ds-mini-btn ds-mini-danger"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${opt}`}
                >
                  <XGlyph />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ */
/* reference — target entity picker                             */
/* ------------------------------------------------------------ */

export function ReferenceEditor({
  entityId,
  field,
}: {
  entityId: string
  field: FieldDef
}) {
  const updateField = useProjectStore((s) => s.updateField)
  const updateCell = useProjectStore((s) => s.updateCell)
  const entities = useProjectStore((s) => s.entities)
  const rows = useProjectStore((s) => s.rowsByEntity[entityId])

  /* Deterministic picker order: entities rehydrate from IndexedDB in
     arbitrary record order — sort by createdAt (drafting order), name as
     tiebreak, mirroring the left-panel index. */
  const others = Object.values(entities)
    .filter((e) => e.id !== entityId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name))

  /* every cell of a link field holds a row id of ITS target, so a row id
     of the old entity names nothing in the new one */
  const filled = (rows ?? []).filter((r) => {
    const v = r.values[field.id]
    return v !== null && v !== undefined && v !== ''
  })

  /* Re-pointing a link is as destructive as changing the type, so it is
     gated and cleared the same way — the lint engine's own retarget keeps
     exactly this invariant (ids of the previous target cannot survive). */
  const retarget = (target: EntityDef) => {
    if (field.refEntityId === target.id) return
    const from = field.refEntityId ? entities[field.refEntityId]?.name : undefined
    if (filled.length > 0) {
      const label = field.name.trim() || 'this untitled field'
      const cells = filled.length === 1 ? '1 filled cell' : `${filled.length} filled cells`
      if (
        !window.confirm(
          `Point "${label}" at ${target.name}${from ? ` instead of ${from}` : ''}?\n\n` +
            `This clears ${cells} — a ${from ?? 'linked'} row id means nothing in ` +
            `${target.name}, and it cannot be recovered.`,
        )
      ) {
        return
      }
    }
    /* the stored default is a row id of the old target too */
    updateField(entityId, field.id, { refEntityId: target.id, defaultValue: undefined })
    for (const r of filled) updateCell(entityId, r.id, field.id, null)
  }

  return (
    <div className="ds-sub">
      <div className="ds-sub-head">
        <span className="mono-label ds-lab-inline">Links to</span>
      </div>

      {others.length === 0 ? (
        <div className="ds-ref-empty">
          <span className="mono-label">Nothing to link</span>
          <p>Draft another entity on the sheet to link to.</p>
        </div>
      ) : (
        <div className="ds-ref-list" role="radiogroup" aria-label="Target entity">
          {others.map((e) => {
            const sel = field.refEntityId === e.id
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={sel}
                className={sel ? 'ds-ref-item ds-ref-item-sel' : 'ds-ref-item'}
                onClick={() => retarget(e)}
              >
                <span
                  className="ds-ref-dot"
                  style={{ background: accentVar(e.accent) }}
                  aria-hidden="true"
                />
                <span className="ds-ref-name">{e.name}</span>
                {sel ? (
                  <span className="ds-ref-check" aria-hidden="true">
                    <CheckGlyph />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      {filled.length > 0 ? (
        <p className="ds-warn">re-pointing this link clears the column’s data</p>
      ) : null}

      <p className="ds-caption mono-label">a link draws an edge on the sheet</p>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* formula — expression workbench                               */
/* ------------------------------------------------------------ */

interface FormulaCheck {
  ok: boolean
  error?: string
  dependsOn: string[]
}

/** an expression the sheet refused, kept so it is never lost in silence */
interface RejectedDraft {
  src: string
  error: string
}

/* A refused draft has to outlive the row it was typed in: the field row's
   header IS the accordion toggle, so the click that blurs the box also
   unmounts this editor — taking the note and its Restore action with it.
   Banked by field id, handed straight back when the row is opened again. */
const refusedDrafts = new Map<string, RejectedDraft>()

export function FormulaEditor({
  entity,
  field,
}: {
  entity: EntityDef
  field: FieldDef
}) {
  const updateField = useProjectStore((s) => s.updateField)
  const [src, setSrc] = useState(field.formula ?? '')
  const [showFns, setShowFns] = useState(false)
  const [rejected, setRejected] = useState<RejectedDraft | null>(
    () => refusedDrafts.get(field.id) ?? null,
  )
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  /** the last source the sheet accepted — what the field keeps */
  const committed = useRef(field.formula ?? '')
  /* Escape must beat the blur that may follow it */
  const escaping = useRef(false)

  /** the note and the bank move together, so a closed row can hand it back */
  const remember = (draft: RejectedDraft | null) => {
    if (draft) refusedDrafts.set(field.id, draft)
    else refusedDrafts.delete(field.id)
    setRejected(draft)
  }

  /* an edit from outside (a lint fix, an import) wins over the draft */
  useEffect(() => {
    const next = field.formula ?? ''
    if (next === committed.current) return
    committed.current = next
    setSrc(next)
    setRejected(null)
    refusedDrafts.delete(field.id)
  }, [field.formula, field.id])

  const errorOf = (source: string): string | undefined => {
    try {
      return validateFormula(source, entity, field.id).error
    } catch (err) {
      return err instanceof Error ? err.message : 'Formula engine unavailable'
    }
  }

  /* GUARDRAIL 3 — typing is free, committing is not: the store only
     ever sees an expression that parses. An empty box is not an
     invalid formula, it is simply an unset one, so clearing commits. */
  const write = (next: string) => {
    escaping.current = false
    setSrc(next)
    remember(null)
    const clean = next.trim() === '' || errorOf(next) === undefined
    if (clean && committed.current !== next) {
      committed.current = next
      updateField(entity.id, field.id, { formula: next })
    }
  }

  /* blur — anything still uncommitted never parsed; roll back to the
     last working source and say so, holding on to what was typed */
  const settle = () => {
    if (escaping.current) {
      escaping.current = false
      return
    }
    if (src === committed.current) return
    remember({ src, error: errorOf(src) ?? 'The expression could not be parsed' })
    setSrc(committed.current)
  }

  /* the row can also close under the caret before any blur lands — whatever
     is still uncommitted at unmount is banked exactly as settle() banks it */
  const bank = useRef<() => void>(() => {})
  bank.current = () => {
    if (escaping.current || src === committed.current) return
    refusedDrafts.set(field.id, {
      src,
      error: errorOf(src) ?? 'The expression could not be parsed',
    })
  }
  useEffect(() => () => bank.current(), [])

  const revert = () => {
    escaping.current = true
    setSrc(committed.current)
    remember(null)
  }

  const restore = () => {
    const draft = rejected
    if (!draft) return
    remember(null)
    setSrc(draft.src)
    requestAnimationFrame(() => taRef.current?.focus())
  }

  const check: FormulaCheck | null = useMemo(() => {
    if (src.trim() === '') return null
    try {
      /* selfFieldId lets the engine flag direct + indirect self-reference */
      return validateFormula(src, entity, field.id) as FormulaCheck
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Formula engine unavailable',
        dependsOn: [],
      }
    }
  }, [src, entity, field.id])

  /* dependsOn entries may be field ids or names — resolve both */
  const depNames = useMemo(() => {
    if (!check?.ok) return []
    const names = check.dependsOn.map(
      (d) => entity.fields.find((f) => f.id === d)?.name ?? d,
    )
    return [...new Set(names)]
  }, [check, entity])

  const insertable = entity.fields.filter(
    (f) => f.id !== field.id && f.name.trim() !== '',
  )

  const insertField = (name: string) => {
    const token = `[${name}]`
    const ta = taRef.current
    if (!ta) {
      write(src + token)
      return
    }
    const start = ta.selectionStart ?? src.length
    const end = ta.selectionEnd ?? start
    write(src.slice(0, start) + token + src.slice(end))
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + token.length
      ta.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="ds-sub ds-fx">
      <div className="ds-sub-head">
        <span className="mono-label ds-lab-inline">Expression</span>
        <span className="type-tag ds-fx-tag">{FIELD_TYPES.formula.tag}</span>
      </div>

      <textarea
        ref={taRef}
        className={check && !check.ok ? 'ds-fx-ta ds-fx-ta-refused' : 'ds-fx-ta'}
        rows={3}
        spellCheck={false}
        value={src}
        placeholder="[Price] * [Qty] * (1 - [Discount])"
        aria-label="Formula expression"
        aria-invalid={check ? !check.ok : undefined}
        onChange={(e) => write(e.target.value)}
        onBlur={settle}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            /* the shell deselects on a bubbled Escape — here it only
               means "undo back to the working expression" */
            e.stopPropagation()
            revert()
          }
        }}
      />

      {rejected ? (
        <GuardNote
          tag="Not committed"
          live="status"
          detail={rejected.error}
          action={{
            label: 'Restore draft',
            onClick: restore,
            title: 'Put the refused expression back in the box',
          }}
        >
          An expression that does not parse can never compute a value, so the
          field kept the last one that did.
        </GuardNote>
      ) : null}

      {check === null ? (
        <p className="ds-hint">Write an expression — reference fields as {'[Field Name]'}.</p>
      ) : check.ok ? (
        <div className="ds-fx-ok">
          <span className="ds-fx-stamp mono-label" role="status">
            OK
          </span>
          {depNames.length > 0 ? (
            <span className="ds-fx-chips">
              <span className="mono-label ds-fx-dep-label">reads</span>
              {depNames.map((n) => (
                <span key={n} className="ds-fx-chip">
                  {n}
                </span>
              ))}
            </span>
          ) : (
            <span className="mono-label ds-fx-dep-label">no field references</span>
          )}
        </div>
      ) : (
        <div className="ds-fx-err" role="alert">
          <span className="mono-label ds-fx-err-label">Error</span>
          <span className="ds-fx-err-msg">{check.error ?? 'Invalid formula'}</span>
        </div>
      )}

      {insertable.length > 0 ? (
        <div className="ds-fx-insert">
          <span className="mono-label ds-lab">Insert field</span>
          <div className="ds-fx-insert-row">
            {insertable.map((f) => (
              <button
                key={f.id}
                type="button"
                className="ds-fx-insert-chip"
                style={{ color: FIELD_TYPES[f.type].cssVar }}
                /* keep the caret in the box — a blur here would settle a
                   half-written expression the user is still building */
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertField(f.name)}
              >
                [{f.name}]
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ds-fx-fns-wrap">
        <button
          type="button"
          className="ds-fx-fns-toggle"
          aria-expanded={showFns}
          onClick={() => setShowFns((v) => !v)}
        >
          <span className={showFns ? 'ds-fx-caret ds-fx-caret-open' : 'ds-fx-caret'}>
            <ChevronRightGlyph />
          </span>
          <span className="mono-label ds-fx-fns-label">Functions</span>
        </button>

        {showFns ? (
          <div className="ds-fx-fns">
            <p className="ds-fx-hint">
              Reference fields as <code>{'[Field Name]'}</code>.
              <br />
              Operators: <code>{'+ - * / % ^'}</code> · <code>&amp;</code> joins text ·{' '}
              <code>{'= <> < <= > >='}</code>
            </p>
            <ul className="ds-fx-fn-list">
              {Object.values(FORMULA_FUNCTIONS).map((fn) => (
                <li key={fn.name} className="ds-fx-fn">
                  <span className="ds-fx-fn-name">{fn.signature}</span>
                  <span className="ds-fx-fn-desc">{fn.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
