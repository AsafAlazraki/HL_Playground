/* ============================================================
   THE RAIL — four doors, and everything else is behind one of
   them.

   ------------------------------------------------------------
   FOURTH PASS: PAPER, AND THE PRIMITIVES.

   The third pass painted this column navy and, to do it, declared
   a second palette — thirteen `--chrome-*` tokens, nine kind hues
   re-cut for a dark ground, and six hundred lines of rules that
   restated hover, press, focus and lit-state for every control on
   it. Its own head note said the palette "belongs in ds.css" and
   asked to be deleted the day the system declared it. The system
   declared something better: `src/ui`, five primitives that draw
   a row, a button and their three states once, on the ink ramp
   that was measured for the page ground.

   A primitive cannot be layered onto navy — `Row` draws `--fg` on
   `--surface-3`, and `--fg` on `--chrome` is a black word on a
   navy field. So the rail comes back to paper: `--surface-1`
   behind a hairline, which is the quietest thing on any screen,
   and every door is a `Row`, every act a `Button`. The chrome
   frames the page instead of competing with it, which is the
   brief this pass was given in so many words.

   WHAT SURVIVES OF THE THIRD PASS, by number:
     1 four marks at 20px — House, SquaresFour, FileText, Stack,
       UsersThree — the size the brief measures at;
     3 the doors are 40px rows (`--h-row`, §3) and the foot's acts
       are 40px buttons; the head is a header and gets a header's
       room;
     4 the count survives the fold — it is `Row`'s `meta`, an 11px
       tabular figure, and in the folded rail it stacks under the
       mark exactly as before;
     5 224px, narrowing to 200, 168 and 64 with the window.
   Fault 2 ("it had no colour") is answered the other way round:
   it has the page's colour, and the accent appears on the rail
   exactly twice — the lit door and the one primary act.

   THE FOLD IS ONE FLAG. `tight` is the reader's collapse OR a
   window under 600px, decided here rather than half here and half
   in a media query — because a primitive takes no className, a
   stylesheet cannot hide the words inside a `Row`, and the honest
   answer is not to render them. One flag, one shape per width.

   THE PERSON CHIP IS `@/features/auth`'s and is painted for navy:
   its text reads `--chrome-fg*` and its hover, press and open
   grounds are literal whites at 7–13%. The five palette tokens
   are re-pointed at the ink ramp on `.sn` so its words are
   legible here; its three grounds are invisible on paper and
   that is reported, not patched, because auth.css is not this
   file's to edit.

   ------------------------------------------------------------
   WHERE THE OTHER TEN DOORS WENT, because nothing is deleted.

     Data model, All tables, Configure, Business rules, What fits
     what, Access & roles, Import/export and Saved configurations
       → ADMIN and DATA, which are stages with the same craft as
         Selling rather than a drawer of leftovers.
     History
       → a lateral link on Quotes, where the diary belongs.

   THE MODULES ARE NOT ENUMERATED, AND NEITHER IS WHERE YOU WERE.
   A "Recent" section was tried here and removed: it repeated what
   the front door already lists, and a rail whose contents change
   as you use it is a rail you have to read every time instead of
   aiming at.

   THE PRIMARY ACTION IS "NEW QUOTE", NOT "NEW TABLE". A dealer
   makes quotes all day and tables almost never. A quote is minted
   from the ROW being sold, so pressing it opens the picker rather
   than inventing a blank document — structure is never a side
   effect.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  FileText,
  GearSix,
  House,
  List,
  MagnifyingGlass,
  Plus,
  SquaresFour,
  Stack,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { TableKindSymbol } from '@/features/tablekit'
import { placeCount } from '@/features/modules'
import { useBrowsableModules } from '@/features/modules/reach'
/* THE SHORTCUT THIS ROW ADVERTISES IS THE ONE THE FIELD BINDS. One
   fact, one place: the field reads the platform, this reads the field. */
import { SHORTCUT_HINT } from '@/features/search'
import { atLeast } from '@/features/auth'
import { WhoChip, type AppUser } from '@/features/auth'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { Button, Row } from '@/ui'

/** Every mark on this rail is drawn at one size and one weight, so a
 *  column of them reads as one set rather than five decisions. 20px,
 *  not 16: the brief's first fault is "icons must be distinguishable
 *  at 20px". */
const MARK = 20
const MARK_WEIGHT = weightFor(MARK)

/** Remembered across sessions, because a rail that forgets it was
 *  collapsed is a rail somebody collapses every morning. */
const RAIL_KEY = 'hl.rail.collapsed'

/** Under this the rail is a strip whatever the reader last chose. The
 *  same number `shell.css` sets `--rail: 64px` at; the two must agree
 *  and both say 600. */
const NARROW = '(max-width: 600px)'

/** AND UNDER THIS THE RAIL IS NOT A RAIL AT ALL.
 *
 *  A column of navigation beside the content is a desktop idea: it
 *  costs 64px of a 430px phone forever, to show five doors somebody
 *  presses a handful of times a day. Tablet and mobile get the
 *  hamburger instead — the rail leaves the layout, the stage takes
 *  the whole window, and the doors arrive as a drawer over the top
 *  when they are asked for.
 *
 *  1024 because that is an iPad in landscape: the largest thing
 *  somebody holds rather than sits at. */
const DRAWER = '(max-width: 1024px)'

const readFlag = (key: string, fallback: boolean): boolean => {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    return raw === null || raw === undefined ? fallback : raw === '1'
  } catch {
    return fallback
  }
}

const mediaMatches = (query: string): boolean => {
  try {
    return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(query).matches
  } catch {
    return false
  }
}

/** Whether the window is under the strip width. Read once at mount and
 *  then on every change, so resizing across 600 re-shapes the rail
 *  without a reload. */
function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => mediaMatches(query))
  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return
    const mq = globalThis.matchMedia(query)
    const fire = (): void => setOn(mq.matches)
    fire()
    mq.addEventListener('change', fire)
    return () => mq.removeEventListener('change', fire)
  }, [query])
  return on
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => mediaMatches(NARROW))
  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return
    const mq = globalThis.matchMedia(NARROW)
    const on = (): void => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

export interface SideNavProps {
  /** the stage kind on screen, so one row can be lit */
  current: string | null
  /** which module is open, when one is */
  currentModuleId?: string | null
  onOpenHome: () => void
  onOpenModules: () => void
  onOpenModule: (moduleId: string) => void
  onOpenQuotes: () => void
  onOpenCustomers: () => void
  /** the organisation — who may do what, what has been saved, and
   *  the two doors a file comes in and goes out by */
  onOpenAdmin: () => void
  /** the shape of what the business sells — its own door */
  onOpenData: () => void
  onSearch: () => void
  /** Opens the picker that starts a quote. */
  onNewQuote: () => void
  user: AppUser
  onSignOut: () => void
  onOpenConfigurations: () => void
  quoteCount: number
  customerCount: number
}

/** One door. A `Row` — lead mark, name, the count as `meta` — and when
 *  the rail is folded the mark IS the name and the words move into the
 *  accessible label, count included, so nothing is said only to the
 *  eye. */
function Door({
  label,
  on,
  count,
  tight,
  glyph,
  onPick,
}: {
  label: string
  on: boolean
  count?: number
  tight: boolean
  glyph: ReactNode
  onPick: () => void
}): JSX.Element {
  const meta = count !== undefined && count > 0 ? count.toLocaleString() : undefined
  if (tight) {
    return (
      <Row
        name={glyph}
        label={meta ? `${label} — ${meta}` : label}
        meta={meta}
        current={on}
        onActivate={onPick}
      />
    )
  }
  return <Row lead={glyph} name={label} meta={meta} current={on} onActivate={onPick} />
}

/** One drawn mark, at the rail's one size and weight. */
const mark = (Glyph: typeof House): ReactNode => (
  <Glyph size={MARK} weight={MARK_WEIGHT} aria-hidden="true" />
)

export function SideNav({
  current,
  onOpenHome,
  onOpenModules,
  onOpenQuotes,
  onOpenCustomers,
  onOpenAdmin,
  onOpenData,
  onSearch,
  onNewQuote,
  user,
  onSignOut,
  onOpenConfigurations,
  quoteCount,
  customerCount,
}: SideNavProps): JSX.Element {
  /* AND THE FIGURE BESIDE "Modules" COUNTS WHAT THIS JOB CAN OPEN.
     A rail that says 25 over a screen that lists 19 is the app
     arguing with itself about what exists. */
  const modules = useBrowsableModules()
  const org = useProjectStore((s) => s.meta.org)

  const [collapsed, setCollapsed] = useState(() => readFlag(RAIL_KEY, false))
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(RAIL_KEY, collapsed ? '1' : '0')
    } catch {
      /* a browser with storage refused still gets a working rail */
    }
  }, [collapsed])
  const narrow = useNarrow()
  /* ============================================================
     TABLET AND MOBILE DO NOT GET A RAIL, THEY GET A DRAWER.

     `drawer` is the window saying the column has to go. When it is
     true the nav leaves the layout entirely — `shell.css` drops
     `--rail` to zero and the stage takes the whole width — and the
     same markup slides in over the top when the hamburger is
     pressed. One navigation, two shapes, no second component to
     drift from this one.

     AND IT IS NEVER TIGHT IN A DRAWER. `tight` is the answer to "a
     column this narrow cannot hold words"; a drawer is as wide as
     it likes, so the icons-only strip would be throwing away the
     labels for nothing. The reader's own collapse is remembered and
     comes back when the rail does.
     ============================================================ */
  const drawer = useMedia(DRAWER)
  const [open, setOpen] = useState(false)

  /* AND GOING SOMEWHERE CLOSES IT. A drawer still standing over the
     screen a person just asked for is the commonest fault this
     pattern has.

     WRAPPED AT THE DOOR, NOT CAUGHT AT THE CONTAINER. One `onClick`
     on the `<nav>` would have been a line instead of eight, and it
     is a click handler on a non-interactive element: no keyboard
     event, nothing in the tab order, and a person driving this with
     a keyboard gets a drawer that never closes behind them. The
     buttons are already buttons; this simply goes through them. */
  const shut = useCallback(
    (go: () => void) =>
      () => {
        setOpen(false)
        go()
      },
    [],
  )

  /* A WINDOW GROWN BACK TO A DESKTOP HAS NO DRAWER TO LEAVE OPEN —
     and it needs no effect to say so. Every use of this state is
     already gated on `drawer`, so a remembered `open` from a narrow
     window is unreachable the moment the rail returns, and it is
     still there if the window narrows again. An effect that resets
     state a render could simply not read is a second source of
     truth; the linter is right about it. */
  const showing = drawer && open

  /* ESCAPE CLOSES IT, and only while it is open — a listener that
     outlives the drawer is a key a person presses somewhere else
     that does something here. */
  useEffect(() => {
    if (!showing) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [showing])

  /* the one flag. `--rail` follows it in shell.css: the reader's
     collapse through `.is-tight`, the window's through the query. */
  const tight = drawer ? false : collapsed || narrow

  /* THE COUNT BESIDE "Modules" IS PLACES, NOT MODULES — see `placeCount`. */
  const entities = useProjectStore((s) => s.entities)
  const moduleCount = useMemo(() => placeCount(modules, entities), [modules, entities])
  /* HOW MANY TABLES THE SHAPE IS MADE OF — the figure beside Data. */
  const tableCount = useMemo(() => Object.keys(entities).length, [entities])

  return (
    <>
      {/* ============================================================
          THE HAMBURGER, and it is a SIBLING of the nav rather than
          a child of it.

          The drawer slides by transform, and anything inside it
          slides with it — a toggle that leaves with the thing it
          toggles is a toggle you cannot use twice. So the button
          lives outside, fixed to the top-left, and the nav it opens
          knows nothing about it.

          It is drawn ONLY in drawer mode. A hamburger beside a rail
          that is already on screen is a control for something that
          has not happened.
          ============================================================ */}
      {drawer ? (
        <button
          type="button"
          className="sn-burger"
          aria-label={open ? 'Close the menu' : 'Open the menu'}
          aria-expanded={open}
          aria-controls="sn-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X size={MARK} weight={MARK_WEIGHT} aria-hidden="true" />
          ) : (
            <List size={MARK} weight={MARK_WEIGHT} aria-hidden="true" />
          )}
        </button>
      ) : null}

      {/* THE SCRIM IS THE OTHER WAY OUT. Pressing away from a sheet
          closes it — the gesture every drawer on every phone has —
          and it is the reason the drawer needs no close button of
          its own inside. */}
      {showing ? (
        <button
          type="button"
          className="sn-scrim"
          aria-label="Close the menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

    <nav
      id="sn-drawer"
      className={`sn${tight ? ' is-tight' : ''}`}
      aria-label="Navigation"
      data-collapsed={tight ? 'true' : 'false'}
      data-drawer={drawer ? 'true' : undefined}
      data-open={showing ? 'true' : undefined}
      /* A CLOSED DRAWER IS NOT REACHABLE. Off-canvas is a transform,
         and a transform moves pixels and nothing else: every door in
         here stayed in the tab order and in the accessibility tree
         while sitting outside the window. A keyboard user tabbing
         off the top of a phone screen lands in a menu they cannot
         see, and the harnesses found the same thing from the other
         side — Playwright resolved "New quote" to the drawer's copy
         and then could not click it, because it is not on the
         screen.

         `inert` is the whole answer: not focusable, not in the tree,
         not hit-testable, and it costs one attribute. */
      inert={drawer && !open ? true : undefined}
    >
      <div className="sn-head">
        <span className="sn-crest" aria-hidden="true">
          <TableKindSymbol kind="boat" size={ICON_SIZE.small} />
        </span>
        {/* WHOSE BUSINESS THIS IS, AND NOTHING ELSE. One name, one
            line: the prose budget starts at the top of the rail. It is
            not drawn in the strip — a business name in 48px of column
            is an ellipsis, and the crest already says whose rail this
            is. */}
        {tight ? null : <span className="sn-head-name">{org?.name ?? 'Your tables'}</span>}
        {/* the fold is the reader's; under 600 the window has already
            decided, so the control is not offered */}
        {narrow || drawer ? null : (
          <Button
            tone="ghost"
            size="sm"
            aria-label={collapsed ? 'Widen the rail' : 'Narrow the rail'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <CaretDoubleRight size={ICON_SIZE.tiny} weight={MARK_WEIGHT} aria-hidden="true" />
            ) : (
              <CaretDoubleLeft size={ICON_SIZE.tiny} weight={MARK_WEIGHT} aria-hidden="true" />
            )}
          </Button>
        )}
      </div>

      {/* THE ONE SEARCH IN THE APP. A control, not a destination, and
          the gap under it is what says so. */}
      <div className="sn-find">
        <Button
          tone="neutral"
          size="lg"
          block
          glyph={<MagnifyingGlass size={ICON_SIZE.small} weight={MARK_WEIGHT} />}
          aria-label={tight ? 'Find anything' : undefined}
          onClick={shut(onSearch)}
        >
          {tight ? null : (
            <>
              <span className="sn-find-say">Find anything</span>
              <kbd className="sn-kbd">{SHORTCUT_HINT}</kbd>
            </>
          )}
        </Button>
      </div>

      <div className="sn-scroll">
        {/* ---- THE DOORS. No caption over them: a heading above five
                rows is a word explaining what five words already say. */}
        <div className="sn-grp">
          <Door
            label="Home"
            on={current === 'home'}
            tight={tight}
            glyph={mark(House)}
            onPick={shut(onOpenHome)}
          />
          <Door
            label="Modules"
            on={current === 'module'}
            count={moduleCount}
            tight={tight}
            glyph={mark(SquaresFour)}
            onPick={shut(onOpenModules)}
          />
          <Door
            label="Quotes"
            on={current === 'quote' || current === 'history'}
            count={quoteCount}
            tight={tight}
            glyph={mark(FileText)}
            onPick={shut(onOpenQuotes)}
          />
          {/* DATA IS A DOOR IN THE RAIL, for whoever owns the shape of
              the business. THE ROW IS ABSENT BELOW super-admin rather
              than refused: an area that is not yours is not a refusal,
              and greying it would tell every salesperson every day
              about a screen they will never open. */}
          {atLeast(user, 'super-admin') ? (
            <Door
              label="Data"
              on={current === 'data'}
              count={tableCount}
              tight={tight}
              glyph={mark(Stack)}
              onPick={shut(onOpenData)}
            />
          ) : null}
          <Door
            label="Customers"
            on={current === 'customer'}
            count={customerCount}
            tight={tight}
            glyph={mark(UsersThree)}
            onPick={shut(onOpenCustomers)}
          />
        </div>
      </div>

      <div className="sn-foot">
        {/* THE ONE PRIMARY ACT. A dealer makes quotes all day and
            tables almost never — and this is the accent's one fill on
            the rail. */}
        <Button
          tone="primary"
          size="lg"
          block
          glyph={<Plus size={ICON_SIZE.small} weight={MARK_WEIGHT} />}
          aria-label={tight ? 'New quote' : undefined}
          onClick={shut(onNewQuote)}
        >
          {tight ? null : 'New quote'}
        </Button>

        {/* THE PERSON AND THE WORKSHOP, stacked. Sign out, the theme
            and the saved configurations are behind the chip because
            they are rare acts about ME; the organisation is behind
            Admin because it is rare acts about the BUSINESS. */}
        <div className="sn-who">
          <WhoChip
            user={user}
            collapsed={tight}
            onSignOut={onSignOut}
            onOpenConfigurations={onOpenConfigurations}
          />
          {/* ADMIN IS FOR PEOPLE WHO ADMINISTER, and the door is absent
              rather than refusing for the same reason Data's is. It is
              a door, so it is a Row like the five above it. */}
          {atLeast(user, 'admin') ? (
            <Door
              label="Admin"
              on={current === 'admin'}
              tight={tight}
              glyph={<GearSix size={MARK} weight={MARK_WEIGHT} aria-hidden="true" />}
              onPick={shut(onOpenAdmin)}
            />
          ) : null}
        </div>
      </div>
    </nav>
    </>
  )
}
