/* ============================================================
   WINDOW KIT — what a window IS, where it opens, what it is
   called, and what it draws.

   Kept out of Shell.tsx so the shell stays a shell: it owns the
   stack and the focus order, and everything about an individual
   window's identity lives here.
   ============================================================ */

import type { ReactElement, ReactNode } from 'react'
import type { EntityDef, TableKind } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { HomeStage } from './HomeStage'
import { useProjectStore } from '@/store/useProjectStore'
import { Dashboard } from '@/features/dashboard'
import { HistoryStage } from '@/features/history'
import { LevelEditor } from '@/features/levels'
import type { AppUser } from '@/features/auth'
import { TableStage } from './TableStage'
import { ViewStage } from './ViewStage'
import { DesignStage } from './DesignStage'
import { RulesStage } from './RulesStage'
import { FlowStage } from './FlowStage'
import { QuoteStage } from './QuoteStage'
/* DEEP, NOT THROUGH THE BARREL — `quote/index.ts` says why:
   `quote/index` → `QuoteStart` → `start.ts` → `quote/index` is a
   cycle, and Vite resolves it to `undefined` at run time rather
   than failing to build. */
import { QuoteStart, type QuoteStartProps } from '@/features/quote/QuoteStart'
import { ModuleStage } from './ModuleStage'
import { CustomerStage } from './CustomerStage'
import { AdminStage } from './AdminStage'
import { DataStage } from './DataStage'

/** THE TABS INSIDE A MODULE. Named here, in the shell's own union,
 *  because the shell is what routes to one — the feature that draws
 *  them owns everything else about them.
 *
 *  AGREED WITH THE MODULE WORKSPACE AGENT: add a member here and
 *  `ModuleStage` will pass it straight through. */
export type ModuleTab =
  | 'dashboard'
  | 'stock'
  | 'quotes'
  | 'pricing'
  | 'settings'

/** Everything that can be a window. */
export type Stage =
  /* HOME IS THE DASHBOARD — the person's day. The gallery of table
     cards that used to be here is `gallery`, reached from DATA in
     the rail, because "what am I selling today" and "every table I
     have" are two different questions and only one of them is what
     somebody signs in to do. */
  | { kind: 'home' }
  | { kind: 'gallery' }
  /* HISTORY — every quote raised here and every customer given one.
     A diary, not a list: it is the surface a dealer arrives at
     after lunch to resume somebody else's draft. */
  | { kind: 'history'; customerId: string | null }
  /* LEVELS — set a value once at a brand, range or model and it
     writes to every row beneath that does not override. */
  | { kind: 'levels'; entityId: string | null }
  | { kind: 'table'; entityId: string }
  | { kind: 'view'; entityId: string }
  | { kind: 'design'; entityId: string }
  | { kind: 'rules' }
  | { kind: 'flow' }
  | { kind: 'quote'; quoteId: string | null }
  /* ============================================================
     THE MODULE WORKSPACE — agreed with the MODULE WORKSPACE agent
     (territory key: `module`), who owns `src/features/modules/**`.

     A module is a typed workspace with tabs — Dashboard, Stock,
     Quotes, Pricing, Settings (PHASE_TWO §1, "the correction:
     what a MODULE actually is") — and the shell has to be able to
     say WHICH tab, because a door elsewhere in the app lands on a
     specific one: Admin's access grid lands on Settings, and the
     catalogue's "edit these rows" lands on Stock.

     `tab` is OPTIONAL and absent means "the module's own default",
     which is exactly what this stage did before the field existed.
     So nothing that opens a module today has to change, and
     `winKey` deliberately ignores it: two tabs of one module are
     ONE window, the way the open row and the open settings panel
     already are. Which tab you are on is a position inside a
     module, not a different place to be.
     ============================================================ */
  | { kind: 'module'; moduleId: string | null; tab?: ModuleTab }
  | { kind: 'customer'; customerId: string | null }
  /* ============================================================
     STARTING A QUOTE — a PAGE, and it used to be a dialog over a
     scrim.

     Raising a quote is not an interruption of the work; it IS the
     work, and the most important thing this application does. A
     sheet over a dimmed dashboard says "answer this and get back
     to what you were doing". A page says "this is what you are
     doing" — and it gets the whole window, which a configurator
     wants and a dialog can never have.

     `at` is the place it opens standing in, or null for the grid
     of every place. A quick action on a brand's tile knows the
     answer to the picker's first question; the rail's New quote
     does not.
     ============================================================ */
  | { kind: 'start'; at: string | null }
  /* ============================================================
     DATA — its own door, and not a room inside Admin.

     The data model, the tables, Configure, Business rules and What
     fits what were a band on the Admin screen, reached through a
     32px link at the foot of the rail. The owner looked for that
     functionality twice and could not find it, then said where it
     belongs: its own menu item, not under Admin.

     It is also the honest split. Admin is about the ORGANISATION —
     who may do what, what has been saved, what goes in and out.
     This is the SHAPE OF WHAT THE BUSINESS SELLS, which is the
     thing the rest of the application is built on top of.
     ============================================================ */
  | { kind: 'data' }
  /* ============================================================
     ADMIN — the drawing, the tables, the rules, what fits what,
     who may do what, and the two doors a file comes in and goes
     out by. Eight doors came off the rail into one stage; see
     AdminStage.tsx for why it is built like a selling screen.

     IT CARRIES NO SECTION. Which panel is on screen is Admin's own
     state, the same way the open ITEM is ModuleStage's — a union
     field would make "back to Admin" close a stage and open
     another, which unmounts the box and re-runs the fade.
     ============================================================ */
  | { kind: 'admin' }

export interface WinFrame {
  x: number
  y: number
  w: number
  h: number
}

export interface Win {
  id: string
  stage: Stage
  frame: WinFrame
  zoomed: boolean
  mini: boolean
}

/** ONE WINDOW PER SUBJECT. Two presses on Boats raise the window
 *  that is already open rather than making a second one. */
export const winKey = (s: Stage): string =>
  'entityId' in s
    ? `${s.kind}:${s.entityId}`
    : s.kind === 'quote'
      ? `quote:${s.quoteId ?? 'list'}`
      : s.kind === 'module'
        ? `module:${s.moduleId ?? 'dash'}`
        : s.kind === 'customer'
          ? `customer:${s.customerId ?? 'list'}`
          : s.kind

/** THE TOP OF THE DESKTOP, measured rather than guessed.

 *  This used to be the literal `56` - the masthead's height at the
 *  one window size it was written against. The masthead wraps to two
 *  lines on a narrower window and grows past 100px, and every window
 *  then opened UNDERNEATH it: traffic lights sliced in half, the
 *  titlebar unreachable, and no way to drag it back out because the
 *  thing you drag was the part that was covered. */
export function desktopTop(): number {
  const mast = document.querySelector('.shell-masthead')
  const h = mast ? Math.round(mast.getBoundingClientRect().height) : 56
  return h + 10
}

/** CASCADE, like every OS. Each new window lands down and right of
 *  the last so the one underneath is still visibly there, and the
 *  run wraps before it walks off the screen. */
export function bestFrame(n: number): WinFrame {
  const step = 28
  const i = n % 6
  const top = desktopTop()
  const w = Math.min(1180, Math.max(760, Math.round(window.innerWidth * 0.72)))
  const h = Math.min(
    760,
    Math.max(420, Math.round((window.innerHeight - top - 96) * 0.94)),
  )
  const x = Math.round((window.innerWidth - w) / 2) + i * step - 40
  const y = top + i * step
  return { x: Math.max(8, x), y, w, h }
}

/** What the titlebar says. A window is named for its subject.
 *
 *  ONE NOUN PER PLACE, and these are the dock's nouns. Two of them were
 *  the last holdouts of names the app had already stopped using: the
 *  switcher called the fitment stage "What fits what" — a QUESTION,
 *  which commit 4c4a3e2 ruled out as a name — and called the module
 *  dashboard "Dashboard", which is the screen's shape rather than what
 *  is on it. Both now say what the dock says, so ⌘-Tab and the bar
 *  cannot disagree about where a person is. */
export function winTitle(s: Stage, entities: Record<string, EntityDef>): ReactNode {
  if (s.kind === 'home') return 'Home'
  /* named for what it shows, not for the stage that used to be
     called home — the gallery IS every table you have */
  if (s.kind === 'gallery') return 'All tables'
  if (s.kind === 'history') return s.customerId ? 'Customer history' : 'History'
  if (s.kind === 'levels') return 'Configure'
  if (s.kind === 'rules') return 'Business rules'
  if (s.kind === 'flow') return 'Fitment'
  if (s.kind === 'quote') return s.quoteId ? 'Quote' : 'Quotes'
  if (s.kind === 'module') return s.moduleId ? 'Module' : 'Modules'
  if (s.kind === 'customer') return s.customerId ? 'Customer' : 'Customers'
  if (s.kind === 'admin') return 'Admin'
  if (s.kind === 'data') return 'Data'
  if (s.kind === 'start') return 'New quote'
  const e = entities[s.entityId]
  if (!e) return 'Table'
  const mark = <TableKindSymbol kind={kindOf(e.kind)} size={ICON_SIZE.tiny} />
  if (s.kind === 'design')
    return (
      <>
        {mark}
        {e.name} — Columns
      </>
    )
  if (s.kind === 'view')
    return (
      <>
        {mark}
        {e.name} — What goes with each one
      </>
    )
  return (
    <>
      {mark}
      {e.name}
    </>
  )
}

export interface StageHandlers {
  openWin: (s: Stage) => void
  close: () => void
  /** Put the new-table dialog up.
   *
   *  THE SHELL OWNS THAT DIALOG for both ways in — the dock's NEW TABLE
   *  and a type dropped on the sheet — and Home's first screen is the
   *  third. It is a call upward rather than a dialog of Home's own,
   *  because two NewTableDialogs is two answers to "what structure?"
   *  (`EmptyState` records the same reasoning for the invitation). */
  newTable: () => void
  /* THE DASHBOARD'S TEN DOORS. Eight are `openWin` with a stage the
     shell already knows; two — the picker and the finder — are
     dialogs the shell hosts, exactly as `newTable` is, and for the
     same reason: one host, one answer. */
  newQuote: (moduleId?: string) => void
  find: () => void
  /** THE DRAWING. It is not a stage — it is the surface UNDER every
   *  stage, so reaching it means emptying the window stack, and only
   *  the shell can do that. Admin's first door calls this. */
  openSheet: () => void
  /** the organisation's saved configurations — a sheet the shell
   *  hosts, exactly as `newTable` and `find` are */
  openConfigurations: () => void
  /** who is signed in. The dashboard is 'my day' and there is no
   *  'my' without a person; null before sign-in, which cannot
   *  happen because App gates the shell on it. */
  user?: AppUser | null
}

/** What a window draws. Every stage is mounted exactly as it was —
 *  the window supplies the frame, so none of them changed. */
/** THE PICKER AS A STAGE.
 *
 *  `QuoteStart` takes the sheet as props rather than reading it —
 *  deliberately, so it can be tested and read without a store — and
 *  `renderStage`'s handler bag carries navigation, not data. This
 *  is the seam between the two: one component, four lines, and it
 *  is the only thing in this file that touches the store, exactly
 *  as every other stage's own root does. */
function QuoteStartStage(props: Omit<QuoteStartProps, 'modules' | 'entities' | 'rowsByEntity'>): ReactElement {
  const modules = useProjectStore((st) => st.modules)
  const entities = useProjectStore((st) => st.entities)
  const rowsByEntity = useProjectStore((st) => st.rowsByEntity)
  return (
    <QuoteStart
      modules={modules}
      entities={entities}
      rowsByEntity={rowsByEntity}
      {...props}
    />
  )
}

export function renderStage(s: Stage, h: StageHandlers): ReactNode {
  switch (s.kind) {
    case 'home':
      /* WHAT A PERSON LANDS ON, and it depends on whether there is
         anything to land on. The dashboard counts my quotes, my
         modules and what I opened — all zero on an empty sheet, and
         none of them offers a way to get a price file. `HomeOrDay`
         (foot of this file) hands back the first screen until a
         table exists, so a new person meets the two honest starting
         points instead of a greeting over five empty cards. */
      return (
        <HomeOrDay
          user={h.user ?? null}
          empty={
            <HomeStage
              onOpenTable={(id) => h.openWin({ kind: 'table', entityId: id })}
              onNewTable={h.newTable}
            />
          }
        >
          <Dashboard
            user={h.user as AppUser}
            onOpenTable={(id) => h.openWin({ kind: 'table', entityId: id })}
            onOpenModule={(id) => h.openWin({ kind: 'module', moduleId: id })}
            onOpenModules={() => h.openWin({ kind: 'module', moduleId: null })}
            onOpenQuote={(id) => h.openWin({ kind: 'quote', quoteId: id })}
            onOpenQuotes={() => h.openWin({ kind: 'quote', quoteId: null })}
            onOpenCustomers={() => h.openWin({ kind: 'customer', customerId: null })}
            onOpenRules={() => h.openWin({ kind: 'rules' })}
            onOpenDataModel={() => h.openWin({ kind: 'gallery' })}
            onNewQuote={h.newQuote}
            onFind={h.find}
          />
        </HomeOrDay>
      )
    case 'history':
      return (
        <HistoryStage
          customerId={s.customerId}
          onOpenQuote={(id) => h.openWin({ kind: 'quote', quoteId: id })}
        />
      )
    case 'levels':
      return (
        <LevelEditor
          entityId={s.entityId}
          onPickTable={(id) => h.openWin({ kind: 'levels', entityId: id })}
        />
      )
    case 'gallery':
      return (
        <HomeStage
          onOpenTable={(id) => h.openWin({ kind: 'table', entityId: id })}
          onNewTable={h.newTable}
        />
      )
    case 'table':
      return (
        <TableStage
          entityId={s.entityId}
          onClose={h.close}
          onOpenView={(id) => h.openWin({ kind: 'view', entityId: id })}
          onOpenDesign={(id) => h.openWin({ kind: 'design', entityId: id })}
          /* ============================================================
             THE CATALOGUE HANDS OVER — CONFIGURATOR.md §D, fault 5:
             "you browse in one and build in the other, and the two do
             not hand over."

             This stage mounts the catalogue (through `TableWorkspace`),
             so the catalogue's "Configure this one" lands here and the
             shell raises the quote it minted. Wired to exactly the
             place the `view` case wires "Quote this one" and the
             `start` case wires the picker's `onStarted`, because all
             three are the same act arriving from three doors — and a
             quote that opened in a different kind of window depending
             on where it was started would be three applications.
             ============================================================ */
          onQuote={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
        />
      )
    case 'view':
      return (
        <ViewStage
          entityId={s.entityId}
          onQuote={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
          onClose={h.close}
        />
      )
    case 'design':
      return <DesignStage entityId={s.entityId} onClose={h.close} />
    case 'rules':
      return <RulesStage onClose={h.close} />
    case 'flow':
      return (
        <FlowStage
          onClose={h.close}
          /* the fan-out counts pairings off relationship tables; this
             is how a person reaches the rows behind a figure */
          onOpenTable={(id) => h.openWin({ kind: 'table', entityId: id })}
        />
      )
    case 'start':
      return (
        <QuoteStartStage
          {...(s.at ? { startAt: s.at } : {})}
          onStarted={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
          /* THE DOOR UNDER A REFUSAL. A place that cannot raise a
             price says why and names the switch; only the shell
             knows the switch is on that module's own page. */
          onOpenPlace={(moduleId) => h.openWin({ kind: 'module', moduleId })}
          onClose={h.close}
        />
      )
    case 'quote':
      return (
        <QuoteStage
          quoteId={s.quoteId}
          onOpen={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
          /* THE OTHER HALF OF THE LINK. A quote says who it is filed
             under; pressing that opens them, with every other quote
             to them under it. The id travelled by value on the quote
             and nothing about the document was resolved to draw it. */
          onOpenCustomer={(customerId) => h.openWin({ kind: 'customer', customerId })}
          /* THE DIARY. It was a rail row and the rail is four doors
             now; it belongs beside the list it is the long form of. */
          onOpenHistory={() => h.openWin({ kind: 'history', customerId: null })}
          onClose={h.close}
        />
      )
    case 'customer':
      return (
        <CustomerStage
          customerId={s.customerId}
          onOpen={(customerId) => h.openWin({ kind: 'customer', customerId })}
          /* the history is a list of DOORS, not a readout — a quote
             opens in a window of its own, which only the shell knows */
          onOpenQuote={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
          /* AND THE EMPTY HISTORY IS A DOOR TOO. A customer with
             nothing quoted to them used to be told the four-step
             route to the button; the button is one wire. Wrapped
             rather than passed by reference because `newQuote` takes
             an optional moduleId and a click handler would hand it
             the event. */
          onNewQuote={() => h.newQuote()}
          onClose={h.close}
        />
      )
    case 'data':
      return (
        <DataStage
          onOpenDrawing={h.openSheet}
          onOpenTables={() => h.openWin({ kind: 'gallery' })}
          onOpenLevels={() => h.openWin({ kind: 'levels', entityId: null })}
          onOpenRules={() => h.openWin({ kind: 'rules' })}
          onOpenFitment={() => h.openWin({ kind: 'flow' })}
          onClose={h.close}
        />
      )
    case 'admin':
      return (
        <AdminStage
          onOpenDrawing={h.openSheet}
          onOpenTables={() => h.openWin({ kind: 'gallery' })}
          onOpenLevels={() => h.openWin({ kind: 'levels', entityId: null })}
          onOpenRules={() => h.openWin({ kind: 'rules' })}
          /* THE FITMENT BUILDER HAD NO DOOR ANYWHERE. `{ kind: 'flow' }`
             was in this union and nothing in the application opened it —
             a finished feature reachable from nothing, which is the exact
             failure `check-reachability` was written for and the exact
             one it cannot see, because the stage IS imported. Admin is
             where it belongs: it is the shape of what you sell. */
          onOpenFitment={() => h.openWin({ kind: 'flow' })}
          onOpenConfigurations={h.openConfigurations}
          onOpenModule={(moduleId) =>
            h.openWin({ kind: 'module', moduleId, tab: 'settings' })
          }
          user={h.user ?? null}
          onClose={h.close}
        />
      )
    case 'module':
      return (
        <ModuleStage
          moduleId={s.moduleId}
          tab={s.tab}
          onOpen={(moduleId) => h.openWin({ kind: 'module', moduleId })}
          /* THE QUOTE ROUTE WAS DANGLING. ModuleStage takes `onQuote`
             and hands it to the ViewStage it opens an item on, and
             the view stage draws "Quote this one" only when it has
             one — so a boat opened from a module could not be quoted
             while the same boat opened from Tables could. Wired to
             the same place the view case wires it. */
          onQuote={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
          /* AND STARTING ONE FROM HERE. The picker opens standing
             in this module — see the `start` stage above. */
          onNewQuote={h.newQuote}
          onClose={h.close}
        />
      )
  }
}

/* ============================================================
   HOME IS THE DAY, UNTIL THERE IS NO DAY TO SHOW.

   The dashboard counts my quotes, my modules and what I opened.
   On a sheet with nothing on it every one of those is zero, and
   not one of them offers a way to get a price file — so a new
   person would land on a greeting over five empty cards with no
   door out. That is the "dead end with a greeting on it" this
   component exists to prevent.

   It is a chooser and nothing else: no layout, no state, no
   opinion beyond the one fact that decides it. The moment a
   table exists, home is the dashboard and stays that way.
   ============================================================ */
function HomeOrDay({
  user,
  empty,
  children,
}: {
  user: AppUser | null
  empty: ReactNode
  children: ReactNode
}): ReactNode {
  const entities = useProjectStore((s) => s.entities)
  /* `isRetired` is not consulted: a retired table is still a table
     somebody put here, so a sheet that holds only retired ones has
     been used and does not want the first screen back. */
  if (Object.keys(entities).length === 0) return empty
  return user ? children : empty
}
