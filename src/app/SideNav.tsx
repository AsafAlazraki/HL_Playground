/* ============================================================
   THE RAIL — four doors, and everything else is behind one of
   them.

   ------------------------------------------------------------
   WHAT IT WAS, MEASURED. Fourteen rows at one weight, one size
   and one colour, 264px wide, 69 visible words, with a
   fifty-one-item table tree folded inside a section that could
   not be shut. Six faults were named against it and every one of
   them is answered here.

     1 COLLAPSED IT WAS UNREADABLE. Ten grey glyphs at 16px,
       three of them variants of the same node graph — Configure,
       All tables and Data model were all `Graph`. There are four
       marks now and they are a house, a grid of squares, a sheet
       of paper and three people: four silhouettes nobody has to
       hover to tell apart, drawn at 20px rather than 16 because
       20 is the size the brief measures distinguishability at.

     2 IT HAD NO COLOUR — and the reason was worse than a missing
       hue. `--chrome` and its whole ink family were never
       declared on light, so `background: var(--chrome)` resolved
       to nothing and the "navy rail" was a transparent column of
       page-coloured text. The tokens are declared and measured in
       shell.css now, and the modules a person has been in carry
       their kind hue as a full-height rail and their count in the
       kind's own ink (§1b, amended).

     3 TOO TALL AND TOO UNIFORM. Four navigation rows, one
       remembered-modules section, one primary act, one person,
       one Admin. The rows are 38px and the module rows under them
       are 30px and quieter, so the column has a top and a bottom
       instead of fourteen equal steps.

     4 THE COLLAPSED STATE LOST THE COUNTS. It kept a 6px dot that
       said "there are some". The count is the half worth keeping,
       so at 64px a row is a mark with its figure UNDER it, in
       11px tabular mono — a real number, on the floor, not below
       it.

     5 264px WAS TOO WIDE once the tree went. It is 224px, which
       is 40px given back on every screen in the app, and the
       business's name still fits whole at every width the brief
       drives.

     6 THE SECTIONS DID NOT COLLAPSE. DATA and SELLING were
       captions with no disclosure at all. The one section that
       survives — the modules you have been in — collapses, says
       how many are inside when it is shut, and remembers the
       choice across sessions. Honestly reported: with four bare
       doors above it there is exactly one section left to prove
       the rule on.

   ------------------------------------------------------------
   WHERE THE OTHER TEN DOORS WENT, because nothing is deleted.

     Data model, All tables, Configure, Business rules, What fits
     what, Access & roles, Import/export and Saved configurations
       → ADMIN, which is a stage with the same craft as Selling
         rather than a drawer of leftovers. See AdminStage.tsx.
     The 51-table tree
       → the module that owns each table (another agent's Stock
         tab); until then, Admin's All tables.
     History
       → a lateral link on Quotes, where the diary belongs: it is
         the same job as the list it sits beside.

   THE MODULES ARE NOT ENUMERATED. There are fourteen of them and
   they belong on their own screen, which is the point of that
   screen. What is here is where THIS PERSON WAS — at most four,
   resolved against the live store every paint, never trusted (see
   moduleRecent.ts).

   THE PRIMARY ACTION IS "NEW QUOTE", NOT "NEW TABLE". A dealer
   makes quotes all day and tables almost never; New table lives
   with the tables, which is now Admin.

   A QUOTE NEEDS A SUBJECT. `createQuoteFromView(viewId, rowId)`
   mints one from the ROW being sold, so there is no such thing as
   an empty quote. Pressing New quote opens the picker rather than
   inventing a blank document. Structure is never a side effect.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  FileText,
  GearSix,
  House,
  MagnifyingGlass,
  Plus,
  SquaresFour,
  UsersThree,
} from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { isRetired } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { moduleRowCount } from '@/features/modules'
import { WhoChip, type AppUser } from '@/features/auth'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { useModuleRecent } from './moduleRecent'

/** Every mark on this rail is drawn at one size and one weight, so a
 *  column of them reads as one set rather than five decisions.
 *  `weightFor` is the art direction — 'light' at this size, never
 *  'bold' or 'fill'.
 *
 *  20px, NOT 16. The brief's first fault is "icons must be
 *  distinguishable at 20px", and 16 was the size at which three node
 *  graphs looked like one node graph. Four doors can afford the four
 *  extra pixels. */
const MARK = 20
const MARK_WEIGHT = weightFor(MARK)

/** Remembered across sessions, because a rail that forgets it was
 *  collapsed is a rail somebody collapses every morning. */
const RAIL_KEY = 'hl.rail.collapsed'
/** And so is the one section, for the same reason. */
const RECENT_KEY = 'hl.rail.recent.open'

const readFlag = (key: string, fallback: boolean): boolean => {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    return raw === null || raw === undefined ? fallback : raw === '1'
  } catch {
    return fallback
  }
}

export interface SideNavProps {
  /** the stage kind on screen, so one row can be lit */
  current: string | null
  /** which module is open, when one is — so a remembered row can be
   *  lit rather than only the Modules door above it */
  currentModuleId?: string | null
  /** the day: what am I selling, and what did I leave open */
  onOpenToday: () => void
  /** the grid of places — one card per module */
  onOpenModules: () => void
  /** one place, opened straight from the rail */
  onOpenModule: (moduleId: string) => void
  onOpenQuotes: () => void
  onOpenCustomers: () => void
  /** the drawing, the tables, the rules, who may do what, and the
   *  two doors a file comes in and goes out by */
  onOpenAdmin: () => void
  onSearch: () => void
  /** Opens the picker that starts a quote. A quote is minted from
   *  the row being sold, so this can never be "create empty". */
  onNewQuote: () => void
  /** who is signed in, so the foot of the rail can say so */
  user: AppUser
  onSignOut: () => void
  /** the organisation's saved configurations */
  onOpenConfigurations: () => void
  quoteCount: number
  customerCount: number
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
  glyph: ReactNode
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
        {glyph}
      </span>
      <span className="sn-row-name">{label}</span>
      {/* THE COUNT SURVIVES THE FOLD, as a figure. It was a 6px dot
          that said "there are some"; at 64px it moves under the mark
          and stays 11px tabular mono, which is the floor rather than
          under it. Drawn once and only ever re-laid-out by
          `.sn.is-tight`, so folding the rail cannot mount or unmount
          anything mid-transition. */}
      {count !== undefined && count > 0 ? (
        <span className="sn-row-count">{count.toLocaleString()}</span>
      ) : null}
    </button>
  )
}

/** One drawn mark, at the rail's one size and weight. Written once so
 *  five call sites cannot drift apart on either. */
const mark = (Glyph: typeof House): ReactNode => (
  <Glyph size={MARK} weight={MARK_WEIGHT} />
)

export function SideNav({
  current,
  currentModuleId,
  onOpenToday,
  onOpenModules,
  onOpenModule,
  onOpenQuotes,
  onOpenCustomers,
  onOpenAdmin,
  onSearch,
  onNewQuote,
  user,
  onSignOut,
  onOpenConfigurations,
  quoteCount,
  customerCount,
}: SideNavProps): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)
  const org = useProjectStore((s) => s.meta.org)

  const [collapsed, setCollapsed] = useState(() => readFlag(RAIL_KEY, false))
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(RAIL_KEY, collapsed ? '1' : '0')
    } catch {
      /* a browser with storage refused still gets a working rail */
    }
  }, [collapsed])

  const [recentOpen, setRecentOpen] = useState(() => readFlag(RECENT_KEY, true))
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(RECENT_KEY, recentOpen ? '1' : '0')
    } catch {
      /* as above */
    }
  }, [recentOpen])

  const moduleCount = useMemo(
    () => Object.keys(modules).length,
    [modules],
  )

  /* WHERE THIS PERSON WAS, RESOLVED AGAINST THE LIVE STORE. A
     remembered id is a guess about a project that has gone on
     changing; anything that no longer resolves is dropped here
     rather than drawn as a door to nothing. */
  const recentIds = useModuleRecent()
  const recent = useMemo(() => {
    const out: {
      id: string
      name: string
      kind: string
      count: number
    }[] = []
    for (const id of recentIds) {
      const m = modules[id]
      if (!m) continue
      const primary = m.tableIds.map((t) => entities[t]).find(Boolean)
      if (primary && isRetired(primary)) continue
      out.push({
        id,
        name: m.name,
        kind: primary ? kindOf(primary.kind) : 'custom',
        count: moduleRowCount(m, entities, rowsByEntity),
      })
    }
    return out
  }, [recentIds, modules, entities, rowsByEntity])

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
        {/* WHOSE BUSINESS THIS IS, AND NOTHING ELSE. The industry word
            under it — "Marine" — was a second line saying a thing the
            whole application already says on every screen. One name,
            one line: the prose budget starts at the top of the rail
            like everywhere else. */}
        <span className="sn-head-name">{org?.name ?? 'Your tables'}</span>
        <button
          type="button"
          className="sn-fold"
          aria-label={collapsed ? 'Widen the rail' : 'Narrow the rail'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
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
          <MagnifyingGlass size={ICON_SIZE.small} weight={MARK_WEIGHT} />
        </span>
        <span className="sn-find-say">Find anything</span>
        <kbd className="sn-kbd">Ctrl K</kbd>
      </button>

      <div className="sn-scroll">
        {/* ---- THE FOUR DOORS. No caption over them: a heading above
                four rows is a word explaining what four words already
                say. ------------------------------------------------ */}
        <div className="sn-grp">
          <NavRow
            label="Today"
            on={current === 'home'}
            collapsed={collapsed}
            glyph={mark(House)}
            onPick={onOpenToday}
          />
          <NavRow
            label="Modules"
            on={current === 'module'}
            count={moduleCount}
            collapsed={collapsed}
            glyph={mark(SquaresFour)}
            onPick={onOpenModules}
          />
          <NavRow
            label="Quotes"
            on={current === 'quote' || current === 'history'}
            count={quoteCount}
            collapsed={collapsed}
            glyph={mark(FileText)}
            onPick={onOpenQuotes}
          />
          <NavRow
            label="Customers"
            on={current === 'customer'}
            count={customerCount}
            collapsed={collapsed}
            glyph={mark(UsersThree)}
            onPick={onOpenCustomers}
          />
        </div>

        {/* ---- WHERE YOU WERE — the one section, and it collapses.
                Drawn only when there is something in it: an empty
                disclosure is a control that lies about having
                contents. --------------------------------------------- */}
        {recent.length > 0 ? (
          <div className="sn-grp sn-grp-recent">
            <button
              type="button"
              className={`sn-sec${recentOpen ? ' is-open' : ''}`}
              aria-expanded={recentOpen}
              onClick={() => setRecentOpen((o) => !o)}
            >
              <span className="mono-label sn-sec-name">Recent</span>
              {/* HOW MANY ARE INSIDE WHEN IT IS SHUT — fault 6's
                  second half. Drawn only while shut, because open it
                  is a count of rows you can see. */}
              {recentOpen ? null : (
                <span className="sn-sec-count">{recent.length}</span>
              )}
              <span className="sn-sec-wedge" aria-hidden="true" />
            </button>

            {recentOpen ? (
              <div className="sn-sec-body">
                {recent.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    /* THE KIND CARRIES THE ROW. `data-kind` sets
                       `--kind` (ds.css) and `.k-rail` draws it at
                       full height; the count takes the same hue as
                       ink, which is the one place §1b lets a figure
                       sit near a colour — the hue IS the kind of the
                       thing being counted, and the ink is measured
                       above 4.5:1 on the rail's navy. */
                    className={`sn-mod k-rail${
                      currentModuleId === m.id ? ' is-on' : ''
                    }`}
                    data-kind={m.kind}
                    aria-current={currentModuleId === m.id ? 'page' : undefined}
                    onClick={() => onOpenModule(m.id)}
                  >
                    <span className="sn-mod-name">{m.name}</span>
                    <span className="sn-mod-count">
                      {m.count.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
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
            <Plus size={ICON_SIZE.small} weight={MARK_WEIGHT} />
          </span>
          <span className="sn-new-say">New quote</span>
        </button>

        {/* THE PERSON AND THE WORKSHOP, ON ONE LINE. Sign out, the
            theme and the saved configurations are behind the chip
            because they are rare acts about ME; the drawing, the
            tables, the rules and who may do what are behind Admin
            because they are rare acts about the BUSINESS. Two
            different rare, so two different doors. */}
        <div className="sn-who">
          <WhoChip
            user={user}
            collapsed={collapsed}
            onSignOut={onSignOut}
            onOpenConfigurations={onOpenConfigurations}
          />
          <button
            type="button"
            className={`sn-admin${current === 'admin' ? ' is-on' : ''}`}
            onClick={onOpenAdmin}
            aria-current={current === 'admin' ? 'page' : undefined}
            aria-label={collapsed ? 'Admin' : undefined}
            title={collapsed ? 'Admin' : undefined}
          >
            <span className="sn-admin-mark" aria-hidden="true">
              <GearSix size={ICON_SIZE.small} weight={MARK_WEIGHT} />
            </span>
            <span className="sn-admin-say">Admin</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
