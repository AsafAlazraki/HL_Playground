/* OFF THE DEFAULT PATH — not mounted by `Shell.tsx`. Columns are
   edited inline in the table on the sheet; this rail is kept, with
   its styles (foot of `shell.css`), for a deliberate return. */

import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { ACCENT_KEYS, accentVar } from '@/types/model'
import type { GroupDef } from '@/types/model'
import { EntityDesigner } from '@/features/designer/EntityDesigner'
import { DataGrid } from '@/features/data/DataGrid'

function CloseGlyph() {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
      <path
        d="M1.5 1.5 8.5 8.5 M8.5 1.5 1.5 8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ZoneCard({ group }: { group: GroupDef }) {
  const updateGroup = useProjectStore((s) => s.updateGroup)
  const deleteGroup = useProjectStore((s) => s.deleteGroup)
  const cancelled = useRef(false)

  const onDelete = () => {
    if (
      window.confirm(
        `Delete zone "${group.name}"?\n\nEntities inside stay on the sheet — only the frame is removed.`,
      )
    ) {
      deleteGroup(group.id)
    }
  }

  return (
    <div className="shell-zone-card">
      <label className="shell-zone-block">
        <span className="mono-label shell-zone-caption">Zone name</span>
        <input
          key={group.id}
          className="field-input"
          defaultValue={group.name}
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.stopPropagation()
              cancelled.current = true
              e.currentTarget.value = group.name
              e.currentTarget.blur()
            }
          }}
          onBlur={(e) => {
            if (cancelled.current) {
              cancelled.current = false
              return
            }
            const name = e.currentTarget.value.trim()
            if (name && name !== group.name) updateGroup(group.id, { name })
            else e.currentTarget.value = group.name
          }}
        />
      </label>

      <div className="shell-zone-block">
        <span className="mono-label shell-zone-caption">Accent ink</span>
        <div className="shell-zone-swatches" role="radiogroup" aria-label="Zone accent ink">
          {ACCENT_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={k === group.accent}
              aria-label={k}
              title={k}
              className={`shell-swatch${k === group.accent ? ' is-active' : ''}`}
              style={{ '--swatch': accentVar(k) } as CSSProperties}
              onClick={() => updateGroup(group.id, { accent: k })}
            />
          ))}
        </div>
      </div>

      <p className="shell-zone-meta">
        X {Math.round(group.position.x)} · Y {Math.round(group.position.y)} · W {group.size.w} · H{' '}
        {group.size.h}
      </p>

      <div className="shell-zone-footer">
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          Delete zone
        </button>
      </div>
    </div>
  )
}

/** Right-hand inspector — schema/data for an entity, or a zone card for a group. */
export function Inspector() {
  const entity = useProjectStore((s) =>
    s.selection?.kind === 'entity' ? s.entities[s.selection.id] : undefined,
  )
  const group = useProjectStore((s) =>
    s.selection?.kind === 'group' ? s.groups[s.selection.id] : undefined,
  )
  const tab = useProjectStore((s) => s.inspectorTab)
  const setInspectorTab = useProjectStore((s) => s.setInspectorTab)
  const select = useProjectStore((s) => s.select)

  if (entity) {
    return (
      <aside className="shell-inspector" key={entity.id} aria-label={`Inspector — ${entity.name}`}>
        <div className="shell-inspector-head">
          <span
            className="shell-dot shell-dot-lg"
            style={{ '--row-accent': accentVar(entity.accent) } as CSSProperties}
          />
          <h2 className="shell-inspector-name block-heading" title={entity.name}>
            {entity.name}
          </h2>
          <button
            type="button"
            className="shell-inspector-close"
            aria-label="Close inspector"
            title="Close (Esc)"
            onClick={() => select(null)}
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="shell-tabs" role="tablist" aria-label="Inspector sections">
          <button
            type="button"
            role="tab"
            id="shell-tab-schema"
            aria-selected={tab === 'schema'}
            className={`shell-tab${tab === 'schema' ? ' is-active' : ''}`}
            onClick={() => setInspectorTab('schema')}
          >
            Schema
          </button>
          <button
            type="button"
            role="tab"
            id="shell-tab-data"
            aria-selected={tab === 'data'}
            className={`shell-tab${tab === 'data' ? ' is-active' : ''}`}
            onClick={() => setInspectorTab('data')}
          >
            Data
          </button>
        </div>

        <div
          className="shell-inspector-body"
          role="tabpanel"
          aria-labelledby={tab === 'schema' ? 'shell-tab-schema' : 'shell-tab-data'}
        >
          {tab === 'schema' ? (
            <EntityDesigner entityId={entity.id} />
          ) : (
            <DataGrid entityId={entity.id} />
          )}
        </div>
      </aside>
    )
  }

  if (group) {
    return (
      <aside className="shell-inspector" key={group.id} aria-label={`Inspector — ${group.name}`}>
        <div className="shell-inspector-head">
          <span
            className="shell-dot shell-dot-lg shell-dot-zone"
            style={{ '--row-accent': accentVar(group.accent) } as CSSProperties}
          />
          <h2 className="shell-inspector-name block-heading" title={group.name}>
            {group.name}
          </h2>
          <span className="mono-label shell-inspector-kind">Zone</span>
          <button
            type="button"
            className="shell-inspector-close"
            aria-label="Close inspector"
            title="Close (Esc)"
            onClick={() => select(null)}
          >
            <CloseGlyph />
          </button>
        </div>
        <div className="shell-inspector-body">
          <ZoneCard group={group} />
        </div>
      </aside>
    )
  }

  return null
}
