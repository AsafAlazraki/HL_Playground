/* ============================================================
   THE BAR — the only chrome, and the whole navigation.

   The masthead is gone, so this is where you are, where you can
   go, and how you get there. It floats over the page, which is
   why it costs the page nothing.

   TABLES IS A NESTED MENU, NOT A WALL. Fifty tables in two
   columns is a list you read rather than a menu you use. The
   first level is the handful of things a dealer thinks in —
   Boats, Motors, Trailers, Accessories, Relationships — and
   hovering one opens its own tables beside it. One level of
   thought at a time, which is what a menu is for.

   THE SUBMENU SURVIVES THE DIAGONAL. A parent row and its child
   panel are one hover region, so travelling from "Boats" across
   to "Highfield Inflatables" never closes the thing being
   reached for. That diagonal is the single most common way a
   nested menu is got wrong.

   SEARCH IS ALWAYS ON THE BAR. Wherever you are, whatever page
   you are on, it is in the same place — the one control that
   never moves, because the question it answers ("where is the
   thing called X") is the one people arrive with most often.

   THIS IS THE ONE GLASS SURFACE in the app: it floats over
   content that scrolls beneath it, and a solid bar would punch a
   hole in the page.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowsLeftRight,
  CaretRight,
  FileText,
  House,
  ListChecks,
  MagnifyingGlass,
  Plus,
  SquaresFour,
  Stack,
  Table as TableIcon,
  TreeStructure,
  UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ActionBar } from './ActionBar'
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
  onOpenCustomers?: () => void
  onAddTable?: () => void
  onSearch?: () => void
  onBackToSheet?: () => void
  onOpenHome?: () => void
  quoteCount?: number
  customerCount?: number
  current?: string | null
}

function DockItem({
  icon: I,
  label,
  count,
  active,
  open,
  hasPanel,
  onPress,
  onHover,
}: {
  icon: Icon
  label: string
  count?: number
  active?: boolean
  open?: boolean
  hasPanel?: boolean
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
      {count !== undefined && count > 0 ? <span className="dk-badge">{count}</span> : null}
      <span className="dk-tip" aria-hidden="true">
        {label}
      </span>
    </button>
  )
}

export function Dock({
  onOpenTable,
  onOpenDashboard,
  onOpenRules,
  onOpenFlow,
  onOpenQuotes,
  onOpenCustomers,
  onAddTable,
  onSearch,
  onBackToSheet,
  onOpenHome,
  quoteCount = 0,
  customerCount = 0,
  current = null,
}: DockProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const [open, setOpen] = useState<string | null>(null)
  /* the first-level row the pointer is on; its tables show beside it */
  const [branch, setBranch] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => {
    setOpen(null)
    setBranch(null)
  }, [])

  const tables = useMemo(() => Object.values(entities), [entities])

  const groups = useMemo(() => {
    const live = tables.filter((e) => !isRetired(e))
    const out: { key: string; label: string; items: EntityDef[] }[] = []
    for (const kind of KIND_ORDER) {
      const items = live
        .filter((e) => e.role !== 'join' && kindOf(e.kind) === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
      if (items.length) out.push({ key: kind, label: TABLE_KINDS[kind]?.label ?? kind, items })
    }
    const joins = live
      .filter((e) => e.role === 'join')
      .sort((a, b) => a.name.localeCompare(b.name))
    if (joins.length) out.push({ key: 'join', label: 'Relationships', items: joins })
    return out
  }, [tables])

  const tableCount = groups.reduce((n, g) => n + g.items.length, 0)
  const branchGroup = groups.find((g) => g.key === branch) ?? null

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

  return (
    <div
      className="dk-wrap"
      ref={rootRef}
      /* THE APP'S NOTES GET OUT OF THE WAY OF THIS. The toast strip
         used to paint "Undone — …" across the middle of the navigation
         and win the hit test doing it; that was answered with a
         constant, 84px, hard-coded into the note layer. The constant is
         gone: the dock declares itself and is measured like any other
         floating instrument, so an open Tables menu — which is taller
         than the bar — is cleared too, and a change to the dock's
         geometry can never leave the note behind. See
         `src/app/UndoKeys.tsx`. */
      data-note-clear=""
    >
      {open === 'tables' ? (
        <div className="dk-menus">
          <div className="dk-panel dk-panel--l1" role="menu" aria-label="Tables">
            {groups.length === 0 ? (
              <p className="dk-none">No tables yet.</p>
            ) : (
              groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={branch === g.key}
                  className={`dk-row dk-row--branch${branch === g.key ? ' is-on' : ''}`}
                  /* CLICK, NOT HOVER. A menu that opens by being
                     passed over opens on the way to somewhere else,
                     and on a 7-row list that is most of the time. */
                  onClick={() => setBranch(branch === g.key ? null : g.key)}
                >
                  <span className="dk-row-name">{g.label}</span>
                  <span className="dk-row-count">{pad2(g.items.length)}</span>
                  <CaretRight size={13} weight="bold" aria-hidden="true" />
                </button>
              ))
            )}
          </div>

          {branchGroup ? (
            <div
              className="dk-panel dk-panel--l2"
              role="menu"
              aria-label={branchGroup.label}
            >
              {branchGroup.items.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  role="menuitem"
                  className="dk-row"
                  /* A NAME THAT WRAPS TO TWO LINES CAN STILL RUN OUT.
                     Seventeen of the twenty-six relationship tables
                     were cut by the old 300px panel with nothing to
                     read the rest from, and two of them read as the
                     same row. The panel is wider and wraps now; the
                     whole name is here as well, so however narrow the
                     window gets the row still says which table it is. */
                  title={e.name}
                  onClick={() => {
                    close()
                    onOpenTable(e.id)
                  }}
                >
                  <span className="dk-row-mark">
                    <TableKindSymbol kind={kindOf(e.kind)} size={ICON_SIZE.small} />
                  </span>
                  <span className="dk-row-name">{e.name}</span>
                  <span className="dk-row-count">{rowsByEntity[e.id]?.length ?? 0}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* THE ACTION BAR — the second, smaller tier, and it is drawn
          HERE rather than in the shell for one reason that matters:
          `.dk-wrap` is the element carrying `data-note-clear`, so a
          bar inside it is measured by the note layer along with the
          dock, at every window width, with no second attribute for
          anybody to forget. The whole layering question — toasts over
          the dock, then toasts over the Fitment palette — is answered
          by being inside the thing that already answered it.

          It also inherits `.dk-wrap > * { pointer-events: auto }`, so
          it takes its own presses and lets everything else through.

          The dock is where you GO; this is what you DO. Nothing on
          the navigation bar below moved to build it. */}
      <ActionBar />

      <div className="dk" role="toolbar" aria-label="Navigation">
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
            label="Data model"
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
          onPress={() => (open === 'tables' ? close() : setOpen('tables'))}
          onHover={() => {
            if (open && open !== 'tables') setOpen('tables')
          }}
        />

        <span className="dk-sep" aria-hidden="true" />

        {onOpenDashboard ? (
          <DockItem
            icon={Stack}
            label="Modules"
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
            label="Fitment"
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
        {/* QUOTES IS ALWAYS HERE, and the count is what changes.

            It used to be drawn only when `quoteCount > 0`, so on a
            cleared install — a salesperson's first Monday — the one
            thing they were hired to do had no door in the app at all.
            A place that appears only once you have used it cannot be
            discovered: you cannot raise your first quote from a button
            that your first quote would have drawn.

            The badge still needs a number to appear (`DockItem` draws
            it only above zero), so nothing on the bar shouts about an
            empty diary — and the list behind it says, in the dealer's
            own counts, how to make the first one. */}
        {onOpenQuotes ? (
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

        {/* CUSTOMERS IS THE TENTH ITEM, and it is the only addition
            this bar has taken since the naming rule was settled.

            THE RULE IT HAD TO EARN ITS WAY PAST: "do not add a tenth
            item without a strong reason — every addition dilutes the
            nine that are there" (DESIGN_CONTRACT §9). The reason is
            that the item BESIDE it is Quotes, and every quote is
            addressed to somebody: without this the people those
            documents were written to are reachable only through a
            table in a submenu, and "what else have we quoted them?"
            has no door at all. It is a NOUN naming what is on the
            screen, it is one word, and it sits next to the place it
            is about rather than at the end of the bar.

            THE BADGE IS THE SAME PROMISE THE QUOTES BADGE MAKES: a
            number only once there is one, so a cleared install shows
            a door and never a nag. */}
        {onOpenCustomers ? (
          <DockItem
            icon={UsersThree}
            label="Customers"
            count={customerCount}
            active={current === 'customer'}
            onPress={() => {
              close()
              onOpenCustomers()
            }}
          />
        ) : null}

        <span className="dk-sep" aria-hidden="true" />

        {/* SEARCH NEVER MOVES AND IS NEVER ABSENT — see the header. */}
        {onSearch ? (
          <DockItem
            icon={MagnifyingGlass}
            label="Find anything"
            onPress={() => {
              close()
              onSearch()
            }}
          />
        ) : null}
        {onAddTable ? (
          <DockItem
            icon={Plus}
            label="New table"
            onPress={() => {
              close()
              onAddTable()
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
