/* OFF THE DEFAULT PATH — not mounted by `TopBar.tsx`. The tables ARE
   the view now, so there is no second lens to switch to. Kept, with
   its styles (foot of `shell.css`), in case one ever returns. */

import type { ReactElement } from 'react'
import type { ShellView } from './view'

/** A card pinned to a sheet — the blueprint whiteboard. */
function SheetGlyph() {
  return (
    <svg
      className="shell-viewbtn-glyph"
      viewBox="0 0 10 10"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <rect
        x="0.6"
        y="0.6"
        width="8.8"
        height="8.8"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect x="2.5" y="2.5" width="3.6" height="2.7" fill="currentColor" />
    </svg>
  )
}

/** Header rule + column rule — the grid. */
function TableGlyph() {
  return (
    <svg
      className="shell-viewbtn-glyph"
      viewBox="0 0 10 10"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <rect
        x="0.6"
        y="0.6"
        width="8.8"
        height="8.8"
        rx="0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M0.6 3.6H9.4M4.3 3.6V9.4" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}

const VIEWS: { key: ShellView; label: string; glyph: () => ReactElement; hint: string }[] = [
  { key: 'sheet', label: 'Sheet', glyph: SheetGlyph, hint: 'Blueprint sheet — schema, links and zones' },
  { key: 'table', label: 'Table', glyph: TableGlyph, hint: 'Data table — the full-window grid' },
]

/** Title-block instrument toggle: which lens the stage is drawn through.
 *  Two segments in one plate; the live one is a filled --ink plate, the
 *  other is a quiet well you can hover into. */
export function ViewSwitch({
  view,
  onChange,
}: {
  view: ShellView
  onChange: (v: ShellView) => void
}) {
  return (
    <div className="shell-cell shell-cell-view">
      <span className="shell-cell-caption mono-label">View</span>
      <div className="shell-viewswitch" role="group" aria-label="Stage view">
        {VIEWS.map(({ key, label, glyph: Glyph, hint }) => {
          const active = view === key
          return (
            <button
              key={key}
              type="button"
              className={`shell-viewbtn${active ? ' is-active' : ''}`}
              aria-pressed={active}
              title={hint}
              onClick={() => onChange(key)}
            >
              <Glyph />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
