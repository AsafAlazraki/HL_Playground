/* ============================================================
   THE RAIL — the app's one permanent surface.

   WHAT IT REPLACED. A floating dock: ten unlabelled icons in a
   pill at the bottom of the screen, over a whiteboard acting as a
   desktop picture, with windows stacked above it and a Back
   button on each. That is a window manager, and a window manager
   is the wrong metaphor for something a dealer opens in a browser
   and works in all day. The costs were real: the only way to
   learn the bar was to hover every icon in turn; three of the ten
   doors were the same 51 tables shown three ways; and a stage
   covered the screen entirely, so nothing on it answered "where
   am I and what else is there".

   WHAT THIS IS INSTEAD, AND WHY IT IS SHAPED LIKE THIS.

   This is not a table tool. It is an ERP configuration and
   quotation tool, and the rail says so by putting the work in the
   order the business does it:

     DATA        the shape of what you sell — the tables, and the
                 drawing of how they relate. Collapsed by default
                 below the top level, because 51 tables is a
                 filing cabinet, not a menu.
     MODULES     the places in the business.
     SELLING     rules, quotes, customers — the three things that
                 turn stock into a sale.
     SETTINGS    who may do what. Backed by real data: roles are
                 `RoleDef`s and capabilities are a closed
                 `ModuleCapability` list, so this door is not a
                 promise, it is a screen that exists.

   THE PRIMARY ACTION IS "NEW QUOTE", NOT "NEW TABLE". A dealer
   makes quotes all day and tables almost never. New table moves
   into the DATA section where it belongs, beside the tables.

   A QUOTE NEEDS A SUBJECT. `createQuoteFromView(viewId, rowId)`
   mints one from the ROW being sold, so there is no such thing as
   an empty quote — "one rig, one customer, one moment". Pressing
   New quote therefore opens the picker rather than inventing a
   blank document. Structure is never a side effect.

   IT COLLAPSES. 264px of navy is 20% of a 1280 laptop. Collapsed
   it is 64px of glyphs, the choice is remembered, and every row
   keeps its accessible name so the collapsed rail is not a
   guessing game.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  TABLE_KINDS,
  accentVar,
  isRetired,
  type EntityDef,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ImportExportMenu } from '@/features/io'
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

/** Remembered across sessions, because a rail that forgets it was
 *  collapsed is a rail somebody collapses every morning. */
const RAIL_KEY = 'hl.rail.collapsed'
const readCollapsed = (): boolean => {
  try {
    return globalThis.localStorage?.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}

export interface SideNavProps {
  current: string | null
  currentEntityId?: string | null
  onOpenSheet: () => void
  onOpenHome: () => void
  onOpenTable: (entityId: string) => void
  onOpenDashboard: () => void
  onOpenRules: () => void
  onOpenQuotes: () => void
  onOpenCustomers: () => void
  onAddTable: () => void
  onSearch: () => void
  /** Opens the picker that starts a quote. A quote is minted from
   *  the row being sold, so this can never be "create empty". */
  onNewQuote: () => void
  quoteCount: number
}

function NavRow({
  label,
  on,
  count,
  collapsed,
  glyph,
  onPick,
}: {
  label: string
  on: boolean
  count?: number
  collapsed: boolean
  glyph?: ReactNode
  onPick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      className={`sn-row${on ? ' is-on' : ''}`}
      /* the visible words go when the rail collapses; the
         accessible name never does */
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      aria-current={on ? 'page' : undefined}
      onClick={onPick}
    >
      <span className="sn-row-mark" aria-hidden="true">
        {glyph ?? <span className="sn-row-pip" />}
      </span>
      <span className="sn-row-name">{label}</span>
      {count !== undefined && count > 0 ? (
        <span className="sn-row-count">{count}</span>
      ) : null}
    </button>
  )
}

export function SideNav({
  current,
  currentEntityId,
  onOpenSheet,
  onOpenHome,
  onOpenTable,
  onOpenDashboard,
  onOpenRules,
  onOpenQuotes,
  onOpenCustomers,
  onAddTable,
  onSearch,
  onNewQuote,
  quoteCount,
}: SideNavProps): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const org = useProjectStore((s) => s.meta.org)

  const [collapsed, setCollapsed] = useState(readCollapsed)
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(RAIL_KEY, collapsed ? '1' : '0')
    } catch {
      /* a browser with storage refused still gets a working rail */
    }
  }, [collapsed])

  /* one grouping in the app, so the rail and the gallery can never
     disagree about what a boat is */
  const groups = useMemo(() => {
    const live = Object.values(entities).filter((e) => !isRetired(e))
    const out: { key: string; label: string; items: EntityDef[] }[] = []
    for (const kind of KIND_ORDER) {
      const items = live
        .filter((e) => e.role !== 'join' && kindOf(e.kind) === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
      if (items.length) {
        out.push({ key: kind, label: TABLE_KINDS[kind]?.label ?? kind, items })
      }
    }
    const joins = live.filter((e) => e.role === 'join')
    if (joins.length) {
      out.push({
        key: 'join',
        label: 'Relationships',
        items: joins.sort((a, b) => a.name.localeCompare(b.name)),
      })
    }
    return out
  }, [entities])

  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const rows = useMemo(
    () =>
      groups.reduce(
        (n, g) => n + g.items.reduce((m, e) => m + (rowsByEntity[e.id]?.length ?? 0), 0),
        0,
      ),
    [groups, rowsByEntity],
  )

  /* Which sections are open. DATA opens because it is where the
     work is; its kind bands stay shut so 51 tables is a filing
     cabinet rather than a scroll. */
  const [open, setOpen] = useState<Record<string, boolean>>({
    data: true,
    tables: true,
    boat: true,
  })
  const toggle = (k: string): void => setOpen((o) => ({ ...o, [k]: !(o[k] ?? false) }))

  return (
    <nav
      className={`sn${collapsed ? ' is-tight' : ''}`}
      aria-label="Navigation"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div className="sn-head">
        <span className="sn-crest" aria-hidden="true">
          <TableKindSymbol kind="boat" size={ICON_SIZE.small} />
        </span>
        <span className="sn-head-say">
          <span className="sn-head-name">{org?.name ?? 'Your tables'}</span>
          <span className="sn-head-note">
            {total} tables · {rows.toLocaleString()} rows
          </span>
        </span>
        <button
          type="button"
          className="sn-fold"
          aria-label={collapsed ? 'Widen the rail' : 'Narrow the rail'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
        </button>
      </div>

      <button
        type="button"
        className="sn-find"
        onClick={onSearch}
        aria-label={collapsed ? 'Find anything' : undefined}
        title={collapsed ? 'Find anything' : undefined}
      >
        <span className="sn-find-mark" aria-hidden="true">
          ⌕
        </span>
        <span className="sn-find-say">Find anything</span>
        <kbd className="sn-kbd">Ctrl K</kbd>
      </button>

      <div className="sn-scroll">
        <div className="sn-grp">
          <NavRow
            label="Home"
            on={current === 'home'}
            collapsed={collapsed}
            onPick={onOpenHome}
          />
        </div>

        {/* ---- DATA — the shape of what you sell ---------------- */}
        <div className="sn-grp">
          <button
            type="button"
            className={`sn-sec${open.data ? ' is-open' : ''}`}
            aria-expanded={open.data}
            onClick={() => toggle('data')}
          >
            <span className="mono-label sn-sec-name">Data</span>
            <span className="sn-sec-wedge" aria-hidden="true" />
          </button>

          {open.data ? (
            <div className="sn-sec-body">
              <NavRow
                label="Data model"
                on={current === null}
                collapsed={collapsed}
                onPick={onOpenSheet}
              />

              <button
                type="button"
                className={`sn-band-head${open.tables ? ' is-open' : ''}`}
                aria-expanded={open.tables}
                onClick={() => toggle('tables')}
              >
                <span className="sn-band-dot" aria-hidden="true" />
                <span className="sn-band-name">Tables</span>
                <span className="sn-band-count">{total}</span>
              </button>

              {open.tables ? (
                <div className="sn-band-body">
                  {groups.map((g) => {
                    const isOpen = open[g.key] ?? false
                    return (
                      <div className="sn-band" key={g.key}>
                        <button
                          type="button"
                          className={`sn-kind${isOpen ? ' is-open' : ''}`}
                          aria-expanded={isOpen}
                          onClick={() => toggle(g.key)}
                        >
                          <span
                            className="sn-band-dot"
                            aria-hidden="true"
                            style={{
                              ['--tbn-accent' as string]: accentVar(g.items[0]?.accent),
                            }}
                          />
                          <span className="sn-band-name">{g.label}</span>
                          <span className="sn-band-count">{g.items.length}</span>
                        </button>
                        {isOpen ? (
                          <div className="sn-leaves">
                            {g.items.map((e) => (
                              <button
                                type="button"
                                key={e.id}
                                className={`sn-leaf${
                                  currentEntityId === e.id ? ' is-on' : ''
                                }`}
                                aria-current={
                                  currentEntityId === e.id ? 'page' : undefined
                                }
                                onClick={() => onOpenTable(e.id)}
                              >
                                <span className="sn-leaf-name">{e.name}</span>
                                <span className="sn-leaf-count">
                                  {(rowsByEntity[e.id]?.length ?? 0).toLocaleString()}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                  <button type="button" className="sn-add" onClick={onAddTable}>
                    <span aria-hidden="true">+</span> New table
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ---- MODULES — the places in the business ------------- */}
        <div className="sn-grp">
          <NavRow
            label="Modules"
            on={current === 'module'}
            collapsed={collapsed}
            onPick={onOpenDashboard}
          />
        </div>

        {/* ---- SELLING ----------------------------------------- */}
        <div className="sn-grp">
          <p className="mono-label sn-grp-head">Selling</p>
          <NavRow
            label="Quotes"
            on={current === 'quote'}
            count={quoteCount}
            collapsed={collapsed}
            onPick={onOpenQuotes}
          />
          <NavRow
            label="Customers"
            on={current === 'customer'}
            collapsed={collapsed}
            onPick={onOpenCustomers}
          />
          <NavRow
            label="Business rules"
            on={current === 'rules'}
            collapsed={collapsed}
            onPick={onOpenRules}
          />
        </div>

        {/* ---- SETTINGS — who may do what ----------------------- */}
        <div className="sn-grp">
          <p className="mono-label sn-grp-head">Settings</p>
          {/* THE ACCESS SCREEN IS REAL, not a placeholder: roles are
              `RoleDef` data and capabilities are a closed
              `ModuleCapability` list, edited on a module. The door
              lands on the module dashboard, which is where access is
              granted, rather than inventing a second place for it. */}
          <NavRow
            label="Access & roles"
            on={false}
            collapsed={collapsed}
            onPick={onOpenDashboard}
          />
        </div>
      </div>

      <div className="sn-foot">
        {/* THE ONE PRIMARY ACT. A dealer makes quotes all day and
            tables almost never. */}
        <button
          type="button"
          className="sn-new"
          onClick={onNewQuote}
          aria-label={collapsed ? 'New quote' : undefined}
          title={collapsed ? 'New quote' : undefined}
        >
          <span className="sn-new-mark" aria-hidden="true">
            +
          </span>
          <span className="sn-new-say">New quote</span>
        </button>
        <ImportExportMenu align="left" />
      </div>
    </nav>
  )
}
