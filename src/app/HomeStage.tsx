/* ============================================================
   HOME — the Finder window, and the app's front door.

   THE ARGUMENT AGAINST THE SHEET AS A LANDING SURFACE.

   The blueprint is a good drawing and a bad home. Landing on it,
   a person meets fifty-two rectangles scattered across an
   infinite plane at whatever zoom the camera happened to pick.
   Nothing is grouped, nothing is sorted, most of it is off
   screen, and the only way to look for something is to pan. It
   answers "how do these tables relate" - which is a real question
   somebody asks perhaps once a week - and it answers "where is
   Stacer" not at all, which is the question they ask forty times
   a day.

   So the sheet stops being the front door and becomes a VIEW, one
   click away on the dock, for the job it is actually good at.

   WHAT REPLACES IT is the thing every Mac user already knows: a
   Finder window in gallery view. Your tables, grouped by what
   they hold, sorted, every one of them on screen at once, each a
   card you can read from across the room. Nothing to pan, nothing
   to zoom, nothing off the edge.

   IT IS THE SAME CARD as the sheet draws, deliberately - kind
   rail, kind name, table name, what is in it - so moving between
   the two never feels like moving between two apps.
   ============================================================ */

import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  TABLE_KINDS,
  accentVar,
  isRetired,
  type EntityDef,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { countLabel, leafNoun } from '@/features/table/grouping'
import { ICON_SIZE } from '@/lib/icons'

const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

export interface HomeStageProps {
  onOpenTable: (entityId: string) => void
}

export function HomeStage({ onOpenTable }: HomeStageProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const org = useProjectStore((s) => s.meta.org)
  const [q, setQ] = useState('')

  const tables = useMemo(() => Object.values(entities), [entities])

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const live = tables
      .filter((e) => !isRetired(e))
      .filter((e) => !needle || e.name.toLowerCase().includes(needle))
    const out: { key: string; label: string; items: EntityDef[] }[] = []
    for (const kind of KIND_ORDER) {
      const items = live
        .filter((e) => e.role !== 'join' && kindOf(e.kind) === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
      if (items.length) {
        out.push({ key: kind, label: TABLE_KINDS[kind]?.label ?? kind, items })
      }
    }
    const joins = live
      .filter((e) => e.role === 'join')
      .sort((a, b) => a.name.localeCompare(b.name))
    if (joins.length) out.push({ key: 'join', label: 'Relationships', items: joins })
    return out
  }, [tables, q])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="shell-viewstage hm" role="region" aria-label="Home">
      <div className="shell-view-bar">
        <span className="hm-bar-left" />
        <p className="shell-view-what">
          <span className="shell-view-what-name">{org?.name ?? 'Your tables'}</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          <span className="shell-view-what-say">{total} tables</span>
        </p>
        <label className="hm-find">
          <MagnifyingGlass size={14} aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search tables"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="hm-scroll">
        {groups.length === 0 ? (
          <p className="hm-none">
            {q ? `Nothing matches “${q}”.` : 'No tables yet.'}
          </p>
        ) : (
          groups.map((g) => (
            <section className="hm-sec" key={g.key}>
              <header className="hm-sec-head">
                <h2 className="hm-sec-name">{g.label}</h2>
                <span className="hm-sec-count">{g.items.length}</span>
              </header>

              <div className="hm-grid">
                {g.items.map((e) => {
                  const rows = rowsByEntity[e.id]?.length ?? 0
                  const noun = leafNoun(e)
                  return (
                    <button
                      type="button"
                      key={e.id}
                      className="hm-card"
                      style={{ ['--tbn-accent' as string]: accentVar(e.accent) }}
                      onClick={() => onOpenTable(e.id)}
                    >
                      <span className="hm-card-kind">
                        <TableKindSymbol
                          kind={kindOf(e.kind)}
                          size={ICON_SIZE.small}
                        />
                        <span>{TABLE_KINDS[kindOf(e.kind)]?.label ?? ''}</span>
                      </span>
                      <span className="hm-card-name">{e.name}</span>
                      <span className="hm-card-stats">
                        <b>{rows}</b>
                        <span>{countLabel(rows, noun).replace(`${rows} `, '')}</span>
                        <i aria-hidden="true" />
                        <b>{e.fields.length}</b>
                        <span>columns</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
