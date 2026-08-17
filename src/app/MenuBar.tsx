/* ============================================================
   THE MENU BAR — navigation on demand, not navigation in the way.

   WHAT THIS REPLACES. A 260px rail, permanently open, on an app
   whose main object is a WIDE REGISTER. It held four different
   shapes stacked above the thing people came for: a front door, a
   disclosure fold, three door-cards with prose under each, then
   the tables. Measured with the real file loaded, the first table
   row was drawn 608px down a 744px column — nought of forty-eight
   tables visible without scrolling.

   Folding the tray helped and did not fix it, because the fold
   still sat in the reading path. The honest answer is that a rail
   is the wrong shape for this app: it charges every screen 260px
   of width, forever, for navigation used in bursts.

   SO IT BECOMES MENUS. Everything the rail did, one press away,
   and the sheet gets the whole window back.

     Tables    grouped by what they hold, with counts. Opens the
               table's own page.
     Work      the dashboard, and the three places work happens.
     Add       the table types, which is a setup act.

   HOW A MENU BEHAVES, and none of this is decoration:

     - one open at a time. Opening a second closes the first,
       because two open menus is a state nobody can read;
     - hovering a sibling while one is open SWITCHES to it, which
       is how every menu bar has behaved since 1984 and is the
       whole reason a bar beats a set of unrelated buttons;
     - Escape closes and returns focus to the button that opened
       it, so the keyboard never strands anyone;
     - a click anywhere else closes it;
     - the panel is anchored under its own button, so the
       relationship between what you pressed and what appeared is
       never in doubt.

   IT IS A REAL MENU FOR A SCREEN READER: the button owns
   `aria-expanded` and `aria-haspopup`, the panel is a `menu`, and
   every row in it is a `menuitem`. Arrow keys walk it.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CaretDown } from '@phosphor-icons/react'
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

export interface MenuBarProps {
  onOpenTable: (entityId: string) => void
  onOpenDashboard?: () => void
  onOpenRules?: () => void
  onOpenFlow?: () => void
  onOpenQuotes?: () => void
  onAddTable?: () => void
  quoteCount?: number
}

/* ---------- one menu ---------------------------------------- */

function Menu({
  id,
  label,
  count,
  open,
  onOpen,
  onClose,
  children,
}: {
  id: string
  label: string
  count?: number
  open: boolean
  onOpen: () => void
  onClose: () => void
  children: ReactNode
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  /* click-outside and Escape. Bound only while open, so a closed
     menu costs the document nothing. */
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
      btnRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose])

  /* arrow keys walk the rows, so the menu is usable without a mouse */
  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ].filter((el) => !el.hasAttribute('disabled'))
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next =
      e.key === 'ArrowDown'
        ? items[(i + 1 + items.length) % items.length]
        : items[(i - 1 + items.length) % items.length]
    next?.focus()
  }

  return (
    <div className="mb-menu">
      <button
        ref={btnRef}
        type="button"
        id={`${id}-btn`}
        className={`mb-btn${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => (open ? onClose() : onOpen())}
        /* THE BAR BEHAVIOUR: with one menu already open, moving
           along the bar switches to the next. Without this a menu
           bar is just buttons. */
        onPointerEnter={() => {
          if (!open) onOpen()
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            onOpen()
          }
        }}
      >
        <span>{label}</span>
        {count !== undefined ? <span className="mb-btn-count">{count}</span> : null}
        <CaretDown size={11} weight="bold" aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={`${id}-panel`}
          className="mb-panel"
          role="menu"
          aria-labelledby={`${id}-btn`}
          onKeyDown={onPanelKey}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

function Item({
  onSelect,
  children,
  count,
  mark,
}: {
  onSelect: () => void
  children: ReactNode
  count?: ReactNode
  mark?: ReactNode
}) {
  return (
    <button type="button" role="menuitem" className="mb-item" onClick={onSelect}>
      {mark ? <span className="mb-item-mark">{mark}</span> : null}
      <span className="mb-item-label">{children}</span>
      {count !== undefined ? <span className="mb-item-count">{count}</span> : null}
    </button>
  )
}

/* ---------- the bar ----------------------------------------- */

export function MenuBar({
  onOpenTable,
  onOpenDashboard,
  onOpenRules,
  onOpenFlow,
  onOpenQuotes,
  onAddTable,
  quoteCount = 0,
}: MenuBarProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const [open, setOpen] = useState<string | null>(null)
  const close = useCallback(() => setOpen(null), [])

  const tables = useMemo(() => Object.values(entities), [entities])

  /* grouped by what they hold — the only axis a salesperson thinks
     in. Joins and retired tables go last and are not products. */
  const groups = useMemo(() => {
    const live = tables.filter((e) => !isRetired(e))
    const out: { key: string; label: string; items: EntityDef[] }[] = []
    for (const kind of KIND_ORDER) {
      const items = live
        .filter((e) => e.role !== 'join' && kindOf(e.kind) === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
      if (items.length) {
        out.push({
          key: kind,
          label: TABLE_KINDS[kind]?.label ?? kind,
          items,
        })
      }
    }
    const joins = live
      .filter((e) => e.role === 'join')
      .sort((a, b) => a.name.localeCompare(b.name))
    if (joins.length) out.push({ key: 'join', label: 'Relationships', items: joins })
    return out
  }, [tables])

  const tableCount = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="mb" role="menubar" aria-label="Main">
      <Menu
        id="mb-tables"
        label="Tables"
        count={tableCount}
        open={open === 'tables'}
        onOpen={() => setOpen('tables')}
        onClose={close}
      >
        {groups.length === 0 ? (
          <p className="mb-none">No tables yet.</p>
        ) : (
          groups.map((g) => (
            <div className="mb-group" key={g.key}>
              <div className="mb-group-head">
                <span className="mb-group-label">{g.label}</span>
                <span className="mb-group-count">{pad2(g.items.length)}</span>
              </div>
              {g.items.map((e) => (
                <Item
                  key={e.id}
                  mark={<TableKindSymbol kind={kindOf(e.kind)} size={ICON_SIZE.small} />}
                  count={rowsByEntity[e.id]?.length ?? 0}
                  onSelect={() => {
                    close()
                    onOpenTable(e.id)
                  }}
                >
                  {e.name}
                </Item>
              ))}
            </div>
          ))
        )}
      </Menu>

      <Menu
        id="mb-work"
        label="Work"
        open={open === 'work'}
        onOpen={() => setOpen('work')}
        onClose={close}
      >
        {onOpenDashboard ? (
          <Item
            onSelect={() => {
              close()
              onOpenDashboard()
            }}
          >
            Dashboard
          </Item>
        ) : null}
        {onOpenFlow ? (
          <Item
            onSelect={() => {
              close()
              onOpenFlow()
            }}
          >
            What fits what
          </Item>
        ) : null}
        {onOpenRules ? (
          <Item
            onSelect={() => {
              close()
              onOpenRules()
            }}
          >
            Business rules
          </Item>
        ) : null}
        {onOpenQuotes && quoteCount > 0 ? (
          <Item
            count={quoteCount}
            onSelect={() => {
              close()
              onOpenQuotes()
            }}
          >
            Quotes
          </Item>
        ) : null}
      </Menu>

      {onAddTable ? (
        <Menu
          id="mb-add"
          label="Add"
          open={open === 'add'}
          onOpen={() => setOpen('add')}
          onClose={close}
        >
          <Item
            onSelect={() => {
              close()
              onAddTable()
            }}
          >
            New table…
          </Item>
        </Menu>
      ) : null}
    </div>
  )
}
