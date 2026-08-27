/* ============================================================
   THE SIDE NAV — and why the dock had to go.

   WHAT WAS HERE. A floating dock: ten unlabelled icons in a pill
   at the bottom of the screen, over a whiteboard that acted as a
   desktop picture, with windows stacked above it and a Back
   button on each one. That is a window manager. It is a faithful
   copy of a desktop, and a desktop is the wrong metaphor for a
   thing a dealer opens in a browser and works in all day.

   The costs were real, not stylistic:

     - TEN ICONS AND NO WORDS. The only way to learn the bar was
       to hover every icon in turn. Three of the ten (Data model,
       Tables, Modules) were the same 51 tables shown three ways,
       which no icon can distinguish.
     - NOWHERE WAS ANYWHERE. A stage covered the screen entirely,
       so there was no persistent answer to "where am I and what
       else is there". The Back button existed because the app
       could not show you.
     - IT COST THE PAGE ITS FLOOR. `.shell-stage` reserved 78px
       for the dock and 50 more when a bar existed — 128px of
       every screen, permanently, for navigation that was hidden
       behind icons.

   WHAT REPLACES IT is the thing every web application settles
   on, for the reason they all settle on it: a persistent rail
   that names where you are, names everywhere else, and never
   moves. The content column beside it is then a PAGE — it starts
   at the top of the window and runs to the bottom of it.

   WHAT IT DOES NOT CHANGE. Nothing about the stage system. Every
   row here calls the same `setStage` handler the dock called, so
   the window stack, the history and Cmd-Tab all still work. This
   is a different way of *reaching* the stages, not a rewrite of
   them.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { JSX } from 'react'
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

export interface SideNavProps {
  /** which stage is drawn, so the rail can say so */
  current: string | null
  /** the table whose register is open, so its row can say so */
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
  quoteCount: number
}

/** One row in the rail. A row is a LIST ROW, so it presses by
 *  darkening rather than by scaling — a row that scales makes its
 *  neighbours look like they moved (DESIGN_PRINCIPLES §4). */
function NavRow({
  label,
  icon,
  on,
  count,
  onPick,
}: {
  label: string
  icon?: JSX.Element
  on: boolean
  count?: number
  onPick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      className={`sn-row${on ? ' is-on' : ''}`}
      aria-current={on ? 'page' : undefined}
      onClick={onPick}
    >
      {icon ? (
        <span className="sn-row-mark" aria-hidden="true">
          {icon}
        </span>
      ) : null}
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
  quoteCount,
}: SideNavProps): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const org = useProjectStore((s) => s.meta.org)

  /* THE TABLES, GROUPED THE WAY HOME GROUPS THEM. One grouping in
     the app, so the rail and the gallery can never disagree about
     what a boat is. */
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

  /* Which kind bands are open. Boats open by default because that
     is what a marine dealer opens; the rest stay shut so a
     51-table rail is a rail and not a scroll. */
  const [open, setOpen] = useState<Record<string, boolean>>({ boat: true })

  return (
    <nav className="sn" aria-label="Navigation">
      {/* ---- who this is ------------------------------------ */}
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
      </div>

      {/* ---- find, which is the fastest way to anywhere ------ */}
      <button type="button" className="sn-find" onClick={onSearch}>
        <span className="sn-find-say">Find anything</span>
        <kbd className="sn-kbd">Ctrl K</kbd>
      </button>

      <div className="sn-scroll">
        {/* ---- the places ---------------------------------- */}
        <div className="sn-grp">
          <NavRow label="Home" on={current === 'home'} onPick={onOpenHome} />
          <NavRow label="Data model" on={current === null} onPick={onOpenSheet} />
          <NavRow label="Modules" on={current === 'module'} onPick={onOpenDashboard} />
        </div>

        <div className="sn-grp">
          <p className="mono-label sn-grp-head">Selling</p>
          <NavRow label="Business rules" on={current === 'rules'} onPick={onOpenRules} />
          <NavRow
            label="Quotes"
            on={current === 'quote'}
            count={quoteCount}
            onPick={onOpenQuotes}
          />
          <NavRow label="Customers" on={current === 'customer'} onPick={onOpenCustomers} />
        </div>

        {/* ---- every table, by what it holds ---------------- */}
        {groups.length > 0 ? (
          <div className="sn-grp">
            <p className="mono-label sn-grp-head">Tables</p>
            {groups.map((g) => {
              const isOpen = open[g.key] ?? false
              return (
                <div className="sn-band" key={g.key}>
                  <button
                    type="button"
                    className={`sn-band-head${isOpen ? ' is-open' : ''}`}
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [g.key]: !isOpen }))}
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
                    <div className="sn-band-body">
                      {g.items.map((e) => (
                        <button
                          type="button"
                          key={e.id}
                          className={`sn-leaf${
                            currentEntityId === e.id ? ' is-on' : ''
                          }`}
                          aria-current={currentEntityId === e.id ? 'page' : undefined}
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
          </div>
        ) : null}
      </div>

      {/* ---- what you do TO the project, not inside it ------- */}
      <div className="sn-foot">
        <button type="button" className="sn-new" onClick={onAddTable}>
          New table
        </button>
        <ImportExportMenu align="left" />
      </div>
    </nav>
  )
}
