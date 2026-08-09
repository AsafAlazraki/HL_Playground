/* ============================================================
   FOCUS — one entity's sheet, full window.

   The on-canvas entity-table node is for reading the register and
   correcting a cell in place. When there is real data entry to do,
   FOCUS lifts that ONE entity into the full-window TableWorkspace,
   with its search, filters, sort, fill handle and row commands
   intact. The workspace is demoted from "the TABLE view" to "the
   focused lens" — not deleted, not weakened.

   Portalled to <body> so it is genuinely full-window rather than
   full-stage, and so nothing inside it is subject to the canvas
   transform. Every keystroke stops at its root: the canvas's window
   listeners must never see a Delete typed into a cell.
   ============================================================ */
import { useCallback, useEffect, useRef } from 'react'
import type { CSSProperties, JSX } from 'react'
import { createPortal } from 'react-dom'
import { accentVar, type EntityDef } from '@/types/model'
import { TableWorkspace } from './TableWorkspace'
import { CrossGlyph } from './glyphs'
import { setFocusedTableEntity } from './tableCanvasState'
import { plural } from './helpers'

export function TableFocusOverlay({
  entity,
  rowCount,
}: {
  entity: EntityDef
  rowCount: number
}): JSX.Element | null {
  const rootRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => setFocusedTableEntity(null), [])

  /* the lens takes the keyboard the moment it opens, so Escape closes
     it without a click first */
  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  if (typeof document === 'undefined') return null

  const style = { '--tbn-accent': accentVar(entity.accent) } as CSSProperties

  return createPortal(
    <div
      ref={rootRef}
      className="tb-focus"
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={`${entity.name} — focused sheet`}
      tabIndex={-1}
      /* nothing typed in here belongs to the canvas underneath */
      onKeyDown={(e) => {
        e.stopPropagation()
        /* an in-flight cell edit consumes Escape itself (it reverts the
           draft) and marks the event handled — only an unhandled
           Escape closes the lens */
        if (e.key === 'Escape' && !e.defaultPrevented) close()
      }}
      onKeyUp={(e) => e.stopPropagation()}
      onPaste={(e) => e.stopPropagation()}
      onCopy={(e) => e.stopPropagation()}
      onCut={(e) => e.stopPropagation()}
    >
      <header className="tb-focus-head">
        <span className="tb-focus-stamp mono-label">Focus</span>
        <span className="tb-focus-chip" aria-hidden="true" />
        <h2 className="tb-focus-name block-heading" title={entity.name}>
          {entity.name}
        </h2>
        <span className="tb-focus-tally">{plural(rowCount, 'row', 'rows')}</span>
        <span className="tb-focus-rule" aria-hidden="true" />
        <span className="tb-focus-hint">
          The sheet stays on the blueprint behind this — close to return to it.
        </span>
        <button
          type="button"
          className="btn tb-focus-close"
          onClick={close}
          title="Close the focused sheet (Esc)"
        >
          <CrossGlyph />
          Close
        </button>
      </header>

      <div className="tb-focus-body">
        <TableWorkspace entityId={entity.id} />
      </div>
    </div>,
    document.body,
  )
}
