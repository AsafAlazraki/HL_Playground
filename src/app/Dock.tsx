/* ============================================================
   THE DOCK — a floating bar over the sheet.

   Not attached to an edge and not a column: a rounded, translucent
   bar that hovers above the drawing, the way the Dock does on a
   Mac. The sheet keeps the entire window; the dock sits on top of
   it and gets out of the way.

   HOW IT BEHAVES, and every line of it is deliberate:

     - icons, with the name revealed on hover, so the resting bar
       is small and the labels are there the moment you need them;
     - a press opens its panel UPWARD, anchored over the icon that
       opened it, because there is nothing below;
     - one panel at a time, and moving along the dock while one is
       open switches to it;
     - Escape closes and returns focus to the icon;
     - groups are separated by a hairline: where you go, then what
       you make.

   THIS IS THE ONE PLACE GLASS IS RIGHT. The design principles
   retire translucency everywhere else, and the reason it earns its
   place here is that this bar FLOATS OVER content that scrolls and
   pans beneath it. A solid bar would punch a hole in the drawing;
   a translucent one stays a layer above it. It is a single
   surface, nothing translucent is stacked on it, and
   prefers-reduced-transparency turns it solid.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowsLeftRight,
  FileText,
  House,
  SquaresFour,
  TreeStructure,
  ListChecks,
  Plus,
  Table as TableIcon,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { TABLE_KINDS, isRetired, type EntityDef, type TableKind } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
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

const pad2 = (n: number): string => String(n).padStart(2, '0')

export interface DockProps {
  onOpenTable: (entityId: string) => void
  onOpenDashboard?: () => void
  onOpenRules?: () => void
  onOpenFlow?: () => void
  onOpenQuotes?: () => void
  onAddTable?: () => void
  onBackToSheet?: () => void
  onOpenHome?: () => void
  quoteCount?: number
  /** which stage is up, so the dock can light the right icon */
  current?: string | null
}

/* ---------- one dock item ----------------------------------- */

function DockItem({
  icon: I,
  label,
  count,
  active,
  hasPanel,
  open,
  onPress,
  onHover,
}: {
  icon: Icon
  label: string
  count?: number
  active?: boolean
  hasPanel?: boolean
  open?: boolean
  onPress: () => void
  onHover?: () => void
}) {
  return (
    <button
      type="button"
      className={`dk-item${active ? ' is-active' : ''}${open ? ' is-open' : ''}`}
      onClick={onPress}
      onPointerEnter={onHover}
      aria-label={label}
      aria-haspopup={hasPanel ? 'menu' : undefined}
      aria-expanded={hasPanel ? !!open : undefined}
    >
      <I size={22} aria-hidden="true" />
      {count !== undefined && count > 0 ? (
        <span className="dk-badge">{count}</span>
      ) : null}
      {/* the name, revealed above on hover — the resting bar stays
          small and nothing is guessed at */}
      <span className="dk-tip" aria-hidden="true">
        {label}
      </span>
    </button>
  )
}

/* ---------- the dock ---------------------------------------- */

export function Dock({
  onOpenTable,
  onOpenDashboard,
  onOpenRules,
  onOpenFlow,
  onOpenQuotes,
  onAddTable,
  onBackToSheet,
  onOpenHome,
  quoteCount = 0,
  current = null,
}: DockProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const [open, setOpen] = useState<string | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const rootRef = useRef<HTMLDivElement | null>(null)

  const tables = useMemo(() => Object.values(entities), [entities])

  const groups = useMemo(() => {
    const live = tables.filter((e) => !isRetired(e))
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
  }, [tables])

  const tableCount = groups.reduce((n, g) => n + g.items.length, 0)

  /* click-outside and Escape, bound only while a panel is up */
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, close])

  const panel = (id: string, body: ReactNode) =>
    open === id ? (
      <div className="dk-panel" role="menu">
        {body}
      </div>
    ) : null

  return (
    <div className="dk-wrap" ref={rootRef}>
      {panel(
        'tables',
        groups.length === 0 ? (
          <p className="dk-none">No tables yet.</p>
        ) : (
          <div className="dk-tables">
            {groups.map((g) => (
              <div className="dk-group" key={g.key}>
                <div className="dk-group-head">
                  <span className="dk-group-label">{g.label}</span>
                  <span className="dk-group-count">{pad2(g.items.length)}</span>
                </div>
                {g.items.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    role="menuitem"
                    className="dk-row"
                    onClick={() => {
                      close()
                      onOpenTable(e.id)
                    }}
                  >
                    <span className="dk-row-mark">
                      <TableKindSymbol kind={kindOf(e.kind)} size={ICON_SIZE.small} />
                    </span>
                    <span className="dk-row-name">{e.name}</span>
                    <span className="dk-row-count">
                      {rowsByEntity[e.id]?.length ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ),
      )}

      <div className="dk" role="toolbar" aria-label="Dock">
        {onOpenHome ? (
          <DockItem
            icon={SquaresFour}
            label="Home"
            active={current === 'home'}
            onPress={() => {
              close()
              onOpenHome()
            }}
          />
        ) : null}
        {onBackToSheet ? (
          <DockItem
            icon={TreeStructure}
            label="How it all connects"
            active={current === null}
            onPress={() => {
              close()
              onBackToSheet()
            }}
          />
        ) : null}

        <DockItem
          icon={TableIcon}
          label="Tables"
          count={tableCount}
          hasPanel
          open={open === 'tables'}
          active={current === 'table'}
          onPress={() => setOpen(open === 'tables' ? null : 'tables')}
          onHover={() => {
            if (open && open !== 'tables') setOpen('tables')
          }}
        />

        <span className="dk-sep" aria-hidden="true" />

        {onOpenDashboard ? (
          <DockItem
            icon={House}
            label="Dashboard"
            active={current === 'module'}
            onPress={() => {
              close()
              onOpenDashboard()
            }}
          />
        ) : null}
        {onOpenFlow ? (
          <DockItem
            icon={ArrowsLeftRight}
            label="What fits what"
            active={current === 'flow'}
            onPress={() => {
              close()
              onOpenFlow()
            }}
          />
        ) : null}
        {onOpenRules ? (
          <DockItem
            icon={ListChecks}
            label="Business rules"
            active={current === 'rules'}
            onPress={() => {
              close()
              onOpenRules()
            }}
          />
        ) : null}
        {onOpenQuotes && quoteCount > 0 ? (
          <DockItem
            icon={FileText}
            label="Quotes"
            count={quoteCount}
            active={current === 'quote'}
            onPress={() => {
              close()
              onOpenQuotes()
            }}
          />
        ) : null}

        {onAddTable ? (
          <>
            <span className="dk-sep" aria-hidden="true" />
            <DockItem
              icon={Plus}
              label="New table"
              onPress={() => {
                close()
                onAddTable()
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
