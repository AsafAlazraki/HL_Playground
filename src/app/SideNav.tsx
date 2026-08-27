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

   ------------------------------------------------------------
   AND THE COLLAPSED RAIL DID NOT WORK. Two faults, both found by
   collapsing it and trying to use it.

   1. THERE WERE NO GLYPHS. The stylesheet's own note promised
      "64px of glyphs and counts", and `NavRow` drew
      `<span className="sn-row-pip" />` — a 5px dot — for every row
      that was not handed one, which was all seven of them. So the
      collapsed rail was a vertical column of seven identical dots,
      distinguishable only by hovering each in turn for its
      `title`, which is the exact failure the floating dock was
      deleted for. Every row now carries a drawn mark: House, the
      graph, the module grid, a document, people, the scales, a
      shield. They are Phosphor at `light`, the weight `lib/icons`
      calls the art direction, so they are the same hand as every
      other mark in the app.

   2. THE DATA MODEL DOOR DISAPPEARED. `.sn.is-tight` hid
      `.sn-sec` AND `.sn-sec-body`, and the canvas — the screen
      this rail's second section exists to reach, and the app's
      one permanent surface underneath every window — lives
      inside that body. Collapsing the rail removed it, along with
      New table and all 51 tables, and left no way back to the
      drawing except opening the rail again. A rail that loses a
      door when it narrows is not a collapsed rail, it is a
      smaller rail with less in it.

      The fix is split across both files, because both halves were
      wrong. Here: DATA is forced open while tight, so the row is
      mounted whatever the reader left the disclosure set to.
      There: the tight rules hide the section CAPTION and the table
      tree — a 51-item tree in 64px is genuinely not a thing — and
      keep the Data model row itself, which is a door like the
      other six and is now drawn like one.

   3. AND THE QUOTE COUNT SURVIVES THE COLLAPSE. `.sn-row-count`
      is hidden at 64px because a pill of digits does not fit
      beside a glyph; the FACT that there are quotes waiting is
      the half worth keeping, so it becomes a dot on the corner of
      the mark. Not a number — a number that small would be under
      the 11px floor — a mark that says "there are some", with the
      exact figure one press or one widen away.
   ------------------------------------------------------------
   ============================================================ */

import { useEffect, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  FileText,
  Graph,
  House,
  MagnifyingGlass,
  Plus,
  Scales,
  ShieldCheck,
  SquaresFour,
  UsersThree,
} from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  TABLE_KINDS,
  accentVar,
  isRetired,
  type EntityDef,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { WhoChip, type AppUser } from '@/features/auth'
import { ImportExportMenu } from '@/features/io'
import { ICON_SIZE, weightFor } from '@/lib/icons'

/** Every mark on this rail is drawn at one size and one weight, so a
 *  column of seven of them reads as one set rather than seven
 *  decisions. `weightFor` is the art direction — 'light' at this
 *  size, never 'bold' or 'fill'. */
const MARK = ICON_SIZE.small
const MARK_WEIGHT = weightFor(MARK)

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
  /** the gallery of table cards — every table you have, on one
   *  page. It used to BE home; home is the dashboard now. */
  onOpenGallery: () => void
  /** the diary — every quote raised here, every customer given one */
  onOpenHistory: () => void
  /** set a value once at a brand, range or model */
  onOpenLevels: () => void
  /** who is signed in, so the foot of the rail can say so */
  user: AppUser
  onSignOut: () => void
  /** the organisation's saved configurations */
  onOpenConfigurations: () => void
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
        {/* THE COUNT, WHEN THERE IS NO ROOM FOR THE COUNT. Drawn
            always and revealed only by `.sn.is-tight` in shell.css,
            so nothing is mounted or unmounted by the fold and the
            rail cannot flash a badge in as it narrows. */}
        {count !== undefined && count > 0 ? (
          <span className="sn-row-pin" />
        ) : null}
      </span>
      <span className="sn-row-name">{label}</span>
      {count !== undefined && count > 0 ? (
        <span className="sn-row-count">{count}</span>
      ) : null}
    </button>
  )
}

/** One drawn mark, at the rail's one size and weight. Written once so
 *  seven call sites cannot drift apart on either. */
const mark = (Glyph: typeof House): ReactNode => (
  <Glyph size={MARK} weight={MARK_WEIGHT} />
)

export function SideNav({
  current,
  currentEntityId,
  onOpenSheet,
  onOpenGallery,
  onOpenHistory,
  onOpenLevels,
  user,
  onSignOut,
  onOpenConfigurations,
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

  /* The industry, in the dealer's own noun. Falls back to nothing
     rather than to a guess — an org with no industry recorded gets
     a clean line, not the word "Unknown". */
  const industryWord =
    org?.industry === 'marine'
      ? 'Marine'
      : org?.industry
        ? org.industry.charAt(0).toUpperCase() + org.industry.slice(1)
        : ''

  /* Which sections are open. DATA opens because it is where the
     work is; its kind bands stay shut so 51 tables is a filing
     cabinet rather than a scroll. */
  const [open, setOpen] = useState<Record<string, boolean>>({
    data: true,
    tables: true,
    boat: true,
  })
  const toggle = (k: string): void => setOpen((o) => ({ ...o, [k]: !(o[k] ?? false) }))

  /* DATA IS OPEN WHILE THE RAIL IS TIGHT, whatever the reader left the
     disclosure set to — see fault 2 in the header. The Data model door
     is inside this body, and a collapsed rail that cannot reach the
     app's one permanent surface is a rail with a door missing. The
     reader's own choice is not overwritten, only overruled while there
     is no caption on screen to press: widening the rail hands it
     straight back. */
  const dataOpen = collapsed || open.data

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
          {/* WHAT THE BUSINESS SELLS, NOT WHAT THE DATABASE HOLDS.

              This read "51 tables · 15,651 rows", which is the
              story of a system that manages data. That is not what
              this is for. It exists so a business can sell a
              complicated product easily, and the rail's first line
              should say whose business it is and what they sell —
              the counts belong on Home, where somebody is actually
              looking at the sheet.

              `industry` is on the org profile, so this is read, not
              written: a motorcycle shop gets "Motorcycles" here for
              free the day that industry ships. */}
          <span className="sn-head-note">{industryWord}</span>
        </span>
        <button
          type="button"
          className="sn-fold"
          aria-label={collapsed ? 'Widen the rail' : 'Narrow the rail'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          {/* « and » were two guillemets standing in for a control.
              They are punctuation, they sit on the text baseline
              rather than on the button's optical centre, and at the
              size a 24px button wants them they are three hairlines
              of ink. A drawn caret is the same hand as every other
              mark on the rail. */}
          {collapsed ? (
            <CaretDoubleRight size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
          ) : (
            <CaretDoubleLeft size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
          )}
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
          <MagnifyingGlass size={MARK} weight={MARK_WEIGHT} />
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
            glyph={mark(House)}
            onPick={onOpenHome}
          />
        </div>

        {/* ---- DATA — the shape of what you sell ---------------- */}
        <div className="sn-grp">
          <button
            type="button"
            className={`sn-sec${dataOpen ? ' is-open' : ''}`}
            aria-expanded={dataOpen}
            onClick={() => toggle('data')}
          >
            <span className="mono-label sn-sec-name">Data</span>
            <span className="sn-sec-wedge" aria-hidden="true" />
          </button>

          {dataOpen ? (
            <div className="sn-sec-body">
              {/* THE GALLERY, WHICH USED TO BE HOME. Home is the
                  dashboard now — "what am I selling today" — and
                  "every table I have" is a different question that
                  still needs a door. It sits at the head of DATA
                  because it is the widest view of exactly that. */}
              <NavRow
                label="Configure"
                on={current === 'levels'}
                collapsed={collapsed}
                glyph={mark(Graph)}
                onPick={onOpenLevels}
              />
              <NavRow
                label="All tables"
                on={current === 'gallery'}
                collapsed={collapsed}
                glyph={mark(Graph)}
                onPick={onOpenGallery}
              />
              <NavRow
                label="Data model"
                on={current === null}
                collapsed={collapsed}
                glyph={mark(Graph)}
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
                    <span className="sn-add-mark" aria-hidden="true">
                      <Plus size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                    </span>
                    New table
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
            glyph={mark(SquaresFour)}
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
            glyph={mark(FileText)}
            onPick={onOpenQuotes}
          />
          <NavRow
            label="History"
            on={current === 'history'}
            collapsed={collapsed}
            onPick={onOpenHistory}
          />
          <NavRow
            label="Customers"
            on={current === 'customer'}
            collapsed={collapsed}
            glyph={mark(UsersThree)}
            onPick={onOpenCustomers}
          />
          <NavRow
            label="Business rules"
            on={current === 'rules'}
            collapsed={collapsed}
            glyph={mark(Scales)}
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
            glyph={mark(ShieldCheck)}
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
            {/* `light`, like every other mark here — `lib/icons` bars
                bold and fill by name, and a primary button earns its
                weight from the accent behind it, not from its glyph. */}
            <Plus size={MARK} weight={MARK_WEIGHT} />
          </span>
          <span className="sn-new-say">New quote</span>
        </button>
        <ImportExportMenu align="left" />
        {/* THE PERSON, LAST. Sign out, the theme and the saved
            configurations all live behind one press, because they
            are rare acts and the foot of the rail is where a person
            looks for "me". */}
        <WhoChip
          user={user}
          collapsed={collapsed}
          onSignOut={onSignOut}
          onOpenConfigurations={onOpenConfigurations}
        />
      </div>
    </nav>
  )
}
