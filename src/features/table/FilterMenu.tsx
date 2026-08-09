/* ============================================================
   Column filter menu — a checkbox list of the column's distinct
   values (a choice, a yes/no, a link) or a contains box.

   Portalled to the document and fixed-positioned there, exactly as
   `Popover` is and for the same reason: a table on the blueprint sits
   inside a transformed React Flow node, which would otherwise resolve
   this sheet's window coordinates against the node instead of the
   window and throw it clean off screen.
   ============================================================ */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { JSX } from 'react'
import type { FieldDef } from '@/types/model'
import type { ColumnFilter } from '@/features/table/core'
import { TickGlyph } from './glyphs'
import { columnKindOf } from './columnKinds'

const VALUE_KINDS = new Set(['select', 'boolean', 'reference'])
const MENU_W = 248

export function FilterMenu({
  field,
  anchor,
  values,
  current,
  onApply,
  onClose,
}: {
  field: FieldDef
  anchor: DOMRect
  /** distinct display values for this column, first-seen order */
  values: string[]
  current: ColumnFilter | undefined
  onApply: (f: ColumnFilter | null) => void
  onClose: () => void
}): JSX.Element {
  const listMode = VALUE_KINDS.has(field.type)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const [checked, setChecked] = useState<Set<string>>(() =>
    current && current.kind === 'values'
      ? new Set(current.selected)
      : new Set(values),
  )
  const [text, setText] = useState(
    current && current.kind === 'contains' ? current.text : '',
  )

  const [pos, setPos] = useState({ left: anchor.left, top: anchor.bottom + 4 })

  useLayoutEffect(() => {
    const el = rootRef.current
    const h = el?.offsetHeight ?? 260
    const left = Math.max(
      8,
      Math.min(anchor.left, window.innerWidth - MENU_W - 8),
    )
    const below = anchor.bottom + 4
    const top = below + h > window.innerHeight - 8
      ? Math.max(8, anchor.top - h - 4)
      : below
    setPos({ left, top })
  }, [anchor])

  /* dismiss on outside pointer / Escape */
  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    /* capture so a mousedown on a grid cell closes before it selects */
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  const kind = columnKindOf(field.type)

  const commitList = (): void => {
    if (checked.size === values.length) onApply(null)
    else onApply({ kind: 'values', fieldId: field.id, selected: [...checked] })
    onClose()
  }
  const commitText = (): void => {
    const t = text.trim()
    if (t === '') onApply(null)
    else onApply({ kind: 'contains', fieldId: field.id, text: t })
    onClose()
  }

  return createPortal(
    <div
      ref={rootRef}
      className="tb-menu"
      style={{ left: pos.left, top: pos.top, width: MENU_W }}
      role="dialog"
      aria-label={`Filter ${field.name}`}
      /* the menu is still a child of the grid in the REACT tree, so its
         events bubble there: no keystroke of its own may reach the
         grid's single keydown handler — and a Ctrl+V in the contains
         box is a paste into that input, never a block paste into the
         sheet */
      onKeyDown={(e) => e.stopPropagation()}
      onPaste={(e) => e.stopPropagation()}
    >
      <header className="tb-menu-head">
        <span className="tb-menu-title">{field.name}</span>
        <span className="tb-menu-kind">{kind.label}</span>
      </header>

      {listMode ? (
        <>
          <div className="tb-menu-bulk">
            <button
              type="button"
              className="tb-menu-link"
              onClick={() => setChecked(new Set(values))}
            >
              All
            </button>
            <span className="tb-menu-dot" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="tb-menu-link"
              onClick={() => setChecked(new Set())}
            >
              None
            </button>
          </div>
          <div className="tb-menu-list">
            {values.length === 0 && (
              <p className="tb-menu-empty">This column has no values yet.</p>
            )}
            {values.map((v) => {
              const on = checked.has(v)
              return (
                <button
                  key={v}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  className="tb-menu-row"
                  onClick={() =>
                    setChecked((prev) => {
                      const next = new Set(prev)
                      if (next.has(v)) next.delete(v)
                      else next.add(v)
                      return next
                    })
                  }
                >
                  <span className={'tb-menu-box' + (on ? ' tb-menu-box-on' : '')}>
                    <TickGlyph />
                  </span>
                  <span className="tb-menu-val">{v === '' ? '(empty)' : v}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="tb-menu-body">
          <label className="mono-label tb-menu-lab" htmlFor={`tb-flt-${field.id}`}>
            Contains
          </label>
          <input
            id={`tb-flt-${field.id}`}
            className="field-input"
            type="text"
            value={text}
            autoFocus
            spellCheck={false}
            placeholder="Type to match…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commitText()
            }}
          />
        </div>
      )}

      <footer className="tb-menu-foot">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            onApply(null)
            onClose()
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={listMode ? commitList : commitText}
        >
          Apply
        </button>
      </footer>
    </div>,
    document.body,
  )
}
