/* ============================================================
   Entity tabs — accent ink dot + name + row count.
   Ordered by createdAt (the same deterministic rule the index panel
   uses), never Object.values order. The active tab is a white plate
   with a 2px --ink bottom stamp and drives store `selection`.
   ============================================================ */
import type { JSX } from 'react'
import { accentVar, type EntityDef } from '@/types/model'

export function EntityTabs({
  entities,
  activeId,
  rowCounts,
  onSelect,
}: {
  entities: EntityDef[]
  activeId: string | undefined
  rowCounts: Record<string, number>
  onSelect: (id: string) => void
}): JSX.Element {
  return (
    <div className="tb-tabs" role="tablist" aria-label="Tables">
      <span className="tb-tabs-label mono-label" aria-hidden="true">
        Sheets
      </span>
      <div className="tb-tabs-strip">
        {entities.map((e) => {
          const active = e.id === activeId
          const count = rowCounts[e.id] ?? 0
          return (
            <button
              key={e.id}
              type="button"
              role="tab"
              id={`tb-tab-${e.id}`}
              aria-selected={active}
              aria-controls={`tb-sheet-${e.id}`}
              tabIndex={active ? 0 : -1}
              className={'tb-tab' + (active ? ' tb-tab-on' : '')}
              title={`${e.name} — ${count} ${count === 1 ? 'row' : 'rows'}`}
              onClick={() => onSelect(e.id)}
              onKeyDown={(ev) => {
                if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return
                ev.preventDefault()
                const i = entities.findIndex((x) => x.id === e.id)
                const j =
                  (i + (ev.key === 'ArrowRight' ? 1 : -1) + entities.length) %
                  entities.length
                const next = entities[j]
                if (next) {
                  onSelect(next.id)
                  document.getElementById(`tb-tab-${next.id}`)?.focus()
                }
              }}
            >
              <span
                className="tb-tab-dot"
                style={{ background: accentVar(e.accent) }}
                aria-hidden="true"
              />
              <span className="tb-tab-name">{e.name}</span>
              <span className="tb-tab-count">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
