/* ============================================================
   THE MODULE STAGE — the shell's box around `@/features/modules`.

   Sixth time the same job, and deliberately the sixth of the SAME
   kind rather than a new kind: `@/features/modules` ships a
   dashboard, a create panel and an index renderer, and imports
   nothing from the app. What it cannot know is where the way back
   lives, that only one thing may cover the sheet at a time, and
   which row a person just pointed at. Only the shell knows those.

   WHAT THIS FILE IS, AND ALL IT IS:
     1. a way back   — one control, top left, always there;
     2. a crumb      — what is on screen, in the bar's own voice;
     3. a box        — `<Dashboard>` or `<ModuleIndex>` fills it and
                       scrolls itself;
     4. one link     — "All modules", from an index back to the
                       dashboard, because the door in the panel is
                       behind the stage a person is standing on.

   THREE LEVELS, AND YOU CAN ALWAYS GET OUT OF ALL THREE.
     item  → the module   (the view stage's own back, relabelled)
     index → the dashboard ("All modules", top right)
     dash  → whatever was under it ("Back", top left, and Escape)
   Nobody is ever trapped: every level draws its own way back before it
   draws anything else, and it is at most three presses to the surface
   behind the deepest screen in the system.

   THE TOP-LEFT CONTROL SAYS "Back", NOT "Back to the sheet". Two
   reasons, and the second is the load-bearing one. The dock calls the
   drawing "Data model", so a second name for the same place was one
   name too many. And this control closes the window it is in: what you
   land on is whatever was underneath, which is another page as often as
   it is the drawing. A caption naming a destination it cannot promise
   is worse than one that names none.

   THE DETAIL SURFACE IS `ViewStage`, NOT A SECOND PAGE. The plan is
   explicit (§4, the Detail and Related rows of the block table):
   a module's detail surface IS a view page, and `ViewStage` is
   already the shell's box around one — row rail, search, the way
   back, and "Quote this one". Building a second one here would be
   the fifth-editor mistake committed by us, one floor up. It is
   rendered as a SIBLING of this stage's own box rather than inside
   it, because `.shell-viewstage` is `position: absolute; inset: 0`
   and nesting one in another would inset the inner box inside a box
   that is already the whole stage.

   WHY THE CLICKED ROW'S TABLE, NOT `module.viewId`. A module made
   from Highfield with its six siblings ticked lists 174 boats from
   SEVEN tables. `module.viewId` is the view of the PRIMARY table
   only, so opening a Stacer through it would draw a Stacer row
   against Highfield's page — the related blocks, the columns and
   the hierarchy would all be the wrong table's. `ModuleIndex.onOpen`
   hands out the table the row actually came from, and `ViewStage`
   resolves that table's own page through `createViewFor`, which is
   idempotent and is the same call the panel's door makes.

   THE DETAIL IS THIS STAGE'S STATE, NOT THE SHELL'S. The `Stage`
   union carries an optional module id and nothing else, so the shell
   holds one fact — which module — exactly as it holds one fact for a
   quote. Which ROW is being read is a position inside a module, the
   way the view stage's own `wanted` row is a position inside a
   table; putting it in the union would make "back to the index"
   close a stage and open another, which unmounts the box and re-runs
   the fade every time somebody compares two boats.

   IT REMEMBERS WHICH MODULE THE ROW BELONGED TO. Without that field
   the id survives a switch to another module and the wrong boat is
   already open when you arrive.

   A STAGE MUST NEVER OUTLIVE ITS SUBJECT. A module deleted while its
   index is open falls back to the DASHBOARD rather than to the
   sheet: the person was in the middle of looking at their modules,
   and the dashboard is where the rest of them still are.
   ============================================================ */

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { ArrowLeft, CaretLeft } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import {
  Dashboard,
  ModuleIndex,
  ModuleSettings,
  NewModuleDialog,
} from '@/features/modules'
import { ICON_SIZE } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'
import { ViewStage } from './ViewStage'
import type { ModuleTab } from './winKit'

/** Which item is open, and which module it was opened from. */
interface DetailAt {
  moduleId: string
  tableId: string
  rowId: string
}

/** Whose set-up is on screen, and which panel it was asked to land
 *  on. Held here rather than in the shell's `Stage` union for the same
 *  reason the open ITEM is: it is a position inside a module, and
 *  putting it in the union would close and reopen the stage — a fade,
 *  a remount, and a lost scroll position — every time somebody pressed
 *  Settings and pressed Catalogue again. */
interface SettingsAt {
  moduleId: string
  focus?: 'rules'
}

export interface ModuleStageProps {
  /** the module being looked at, or null for the dashboard of them */
  moduleId: string | null
  /** The shell holds which one is open, so the door in the panel and
   *  the stage can never disagree about what is on screen. Passing
   *  null goes back to the dashboard without closing the stage. */
  onOpen: (moduleId: string | null) => void
  /** Mint a quote from the item on screen and open it. Absent = the
   *  control is not drawn, so this stage still works on its own. */
  onQuote?: (quoteId: string) => void
  /* ============================================================
     WHICH TAB THIS MODULE OPENS ON — the seam agreed with the
     MODULE WORKSPACE agent (`src/features/modules/**`).

     A module is a typed workspace with tabs, and a door elsewhere
     in the app lands on a specific one: Admin's access grid opens
     a module's SETTINGS, and the catalogue's "edit these rows"
     opens its STOCK. The shell carries the fact because only the
     shell knows where the person pressed.

     ABSENT MEANS "THE MODULE'S OWN DEFAULT", which is what this
     stage did before the field existed — so no existing caller
     changes, and this is a widening rather than a rewrite. Only
     `settings` is honoured today, because Settings is the only
     tab that is BUILT; the rest resolve to the catalogue, which is
     what a person gets now, rather than to a blank panel that
     pretends. The workspace agent takes the switch below. */
  tab?: ModuleTab
  onClose: () => void
}

export function ModuleStage({
  moduleId,
  onOpen,
  onQuote,
  tab,
  onClose,
}: ModuleStageProps): ReactElement {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)

  const [detail, setDetail] = useState<DetailAt | null>(null)
  const [settings, setSettings] = useState<SettingsAt | null>(null)
  const [creating, setCreating] = useState(false)

  /* THE ASKED-FOR TAB, HONOURED ONCE AND THEN LET GO. A door that
     says "open this module's set-up" is an instruction about the
     ARRIVAL, not a lock: pressing Catalogue afterwards must work, and
     it would not if this were derived state re-asserting itself on
     every render. It re-fires only when the module or the asked-for
     tab actually changes, which is the same shape the finder's
     row-reveal request uses and for the same reason. */
  useEffect(() => {
    if (!moduleId) return
    if (tab === 'settings') setSettings({ moduleId })
  }, [moduleId, tab])

  /* The id counts as open only when the module is really there — a
     module deleted from under this stage lands on the dashboard. */
  const open = moduleId ? modules[moduleId] : undefined

  /* An item is open only while we are still in the module it was
     opened from, and only while its table is still on the sheet. */
  const item =
    detail && open && detail.moduleId === open.id && entities[detail.tableId] ? detail : null

  /* AND THE SAME RULE FOR THE SET-UP PAGE. A settings page must never
     outlive the module it is about, and must never be showing one
     module's panels while the bar names another.

     IT IS RESOLVED BY ID, NOT FROM `open`, AND THAT IS THE WHOLE
     REASON THE CARD'S DOOR WORKS. A dashboard card's gear is pressed
     while NO module is open: this stage is the dashboard's window
     (`moduleId` null), and a module's window is a DIFFERENT window —
     `winKey` is `module:dash` against `module:<id>`, and the shell
     draws the focused window under `key={focused.id}`. So opening the
     module first and then asking for its settings unmounts this
     component between the two, and the settings state goes with it:
     measured, on the seeded project, as a gear that landed on the
     catalogue. The set-up page is therefore drawn where it was asked
     for — over the dashboard — and closing it puts the person back on
     the list of cards they pressed, rather than inside a module they
     never asked to open.

     WHILE A MODULE IS OPEN THE OLD RULE STILL STANDS: only that
     module's set-up may be on screen, or the bar would name one place
     and the panels another. */
  const setupModule = settings ? modules[settings.moduleId] : undefined
  const setup =
    settings && setupModule && (!open || open.id === settings.moduleId) ? settings : null

  /* ESCAPE IS OURS ONLY WHILE THE BOX IS OURS. When an item is open this
     stage hands its whole box to a `ViewStage`, whose own back goes to
     the module's list — so that stage owns the keystroke, and ours must
     stand down or one press would close the module as well as the item.
     `null` is how that is said; see stageKeys.ts. */
  /* AND WHEN THE SET-UP PAGE IS UP, ESCAPE CLOSES THAT — one level at
     a time, the same discipline as the item above. A single press
     that closed the whole stage from four levels down is how somebody
     loses their place. `useCallback` because the hook re-binds the
     listener on identity. */
  const escape = useCallback(() => {
    if (setup) {
      setSettings(null)
      return
    }
    onClose()
  }, [setup, onClose])
  useStageEscape(item ? null : escape)

  /* THE DETAIL, AND NOTHING OF OURS AROUND IT. Keyed on the row so a
     different item is a different page rather than the same page
     re-pointed: the rail's find box and the row it is showing both
     belong to the item that was clicked. */
  /* `open` is re-tested only so the compiler can see what the line
     that built `item` already guaranteed — an item exists exactly
     when the module it belongs to does. */
  if (item && open) {
    return (
      <ViewStage
        key={`${item.tableId}:${item.rowId}`}
        entityId={item.tableId}
        initialRowId={item.rowId}
        /* the way back goes to the list you came from, not to the
           sheet — the sheet is two more presses out, and every one
           of them is drawn */
        backLabel={`Back to ${open.name}`}
        onQuote={onQuote}
        onClose={() => setDetail(null)}
      />
    )
  }

  /* WHAT THE BAR IS ABOUT. The module that is open, or — when a
     dashboard card's gear opened a set-up page over the list — the
     module that page is about. The crumb names the place whose panels
     are on screen; a bar reading "Modules · how this place is set up"
     names no place at all. */
  const subject = setup && setupModule ? setupModule : open

  /* The primary table's kind mark, so the bar says what sort of place
     this is at a glance. Guarded: a module whose primary table has
     been struck from the sheet still draws, without a mark. */
  const primary = subject ? entities[subject.tableIds[0] ?? ''] : undefined

  const style = subject
    ? ({ '--view-accent': accentVar(subject.accent) } as CSSProperties)
    : undefined

  return (
    <div
      className="shell-viewstage"
      role="region"
      aria-label={subject ? subject.name : 'Modules'}
      style={style}
      /* DELETE AND BACKSPACE STOP AT THIS ROOT, the same line every
         other stage carries: the sheet's window-level handler offers to
         delete the whole SELECTED TABLE on either one, and it only skips
         INPUT/TEXTAREA/SELECT. The index is a search box over 651 rows,
         and a Backspace clearing the last letter of a search must never
         offer to strike a price file off the sheet.

         Escape travels, so the shell can close this page with it — and
         because Escape typed into that same search box belongs to the
         box, not to us. See stageKeys.ts for the whole order. */
      onKeyDown={stageKeys}
    >
      <div className="shell-view-bar">
        {/* `shell-view-back`, no `btn`, labelled "Back" — TableStage is
            the calibration. `.btn` stamped this "BACK TO THE SHEET" in
            11px uppercase mono; uppercase is a label style and this is
        {/* THE GENERIC "Back" IS GONE. This stage already draws
            "All modules", which says WHERE it goes; two back
            affordances eighteen pixels apart is one too many, and
            the vague one is the one to lose. */}

        {/* THE BAR STOPPED SAYING THE PAGE'S NAME on the grid of
            places, because `PageHead` says it now — "Modules ·
            the places in your business" was printing directly above
            "NORTHSIDE MARINE / Modules · 25 places", and the centred
            copy won the eye by being first.

            A MODULE THAT IS OPEN KEEPS IT. There it is naming a
            thing the page below does not: which place you are
            standing in, with its kind's mark beside it. */}
        {subject ? (
          <p className="shell-view-what">
            {open && primary ? (
              <span className="shell-view-what-mark">
                <TableKindSymbol kind={kindOf(primary.kind)} size={ICON_SIZE.small} />
              </span>
            ) : null}
            <span className="shell-view-what-name">{subject.name}</span>
            <span className="shell-view-what-sep" aria-hidden="true">
              ·
            </span>
            {/* THE ASIDE SAYS WHAT KIND OF PLACE THIS IS, NOT WHAT IS
                IN IT. It carried `module.description` for one
                screenshot, which is how that was caught: a module
                made from Highfield inherits that table's description,
                and Highfield's is a 202-character note about which
                row of which spreadsheet its columns were read from.
                In a 10px mono bar with `white-space: nowrap` it ran
                the full width of the window and ellipsised
                mid-sentence — while the index printed the SAME
                paragraph in full, two lines below. */}
            <span className="shell-view-what-say">
              {setup ? 'how this place is set up' : 'a place in your business'}
            </span>
          </p>
        ) : null}

        {/* THE WAY BACK TO THE DASHBOARD. The panel's own door is
            behind this stage, so without this the only route from a
            module to the list of them is out to the sheet and in
            again. Drawn only inside a module, because on the dashboard
            it would point at itself. */}
        {open ? (
          <div className="shell-quote-acts">
            <button
              type="button"
              className="btn shell-quote-act"
              aria-label="Back to all modules"
              onClick={() => onOpen(null)}
            >
              <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              All modules
            </button>
          </div>
        ) : null}
      </div>

      {/* THE WELL DOES NOT SCROLL, the page inside it does. Both
          `.md-dash` and `.md-index` are `height: 100%; overflow: auto`
          in the feature's own stylesheet; a second scroller here would
          nest a scrollbar inside a scrollbar and strand the sticky
          section heads of a seven-brand index. */}
      <div className="shell-module-well">
        {setup && setupModule ? (
          /* ONE SURFACE AT A TIME. The set-up page REPLACES whatever
             it was asked for from — the catalogue when the gear inside
             a module opened it, the list of cards when a card's own
             gear did. It is five panels, and a catalogue that started
             below them would be a catalogue nobody could reach.

             KEYED ON THE MODULE, so pressing one card's gear and then
             another's is a new page rather than the same page
             re-pointed at a different place. */
          <ModuleSettings
            key={`${setupModule.id}:settings`}
            module={setupModule}
            focus={setup.focus}
            /* THE BUTTON THAT CLOSES THIS PAGE SAYS "Catalogue", so it
               has to arrive at one. Pressed inside a module it drops
               back to the list that was already underneath; pressed
               from a dashboard card — where there is no catalogue
               under it — it opens the module the page was about. A
               caption naming a destination it cannot promise is the
               fault this stage's own header is written against, and
               Escape still goes the other way, back to the cards. */
            onDone={() => {
              setSettings(null)
              if (!open) onOpen(setupModule.id)
            }}
          />
        ) : open ? (
          /* KEYED ON THE MODULE, because everything the index holds is
             a position INSIDE one: what has been typed in the find box,
             and which drawer is open. Switching modules through the
             panel's door without this arrives at a different place
             already filtered by the last module's search. */
          <ModuleIndex
            key={open.id}
            module={open}
            onSettings={(focus) => setSettings({ moduleId: open.id, focus })}
            onOpen={(tableId, rowId) => setDetail({ moduleId: open.id, tableId, rowId })}
            /* THE QUOTES RAISED HERE ARE DOORS, not a readout. The
               index names them as a fact about this place; only the
               shell knows that a quote opens in a window of its own,
               so it hands over the same route the item page's "Quote
               this one" already returns through. Absent when the shell
               did not give this stage one, and the strip then still
               NAMES them — a fact that cannot be opened is better than
               a control that does nothing. */
            onOpenQuote={onQuote}
          />
        ) : (
          <Dashboard
            onOpen={(id) => onOpen(id)}
            /* THE CARD'S OWN DOOR INTO SET-UP — and it does NOT open
               the module on the way. Opening it first would swap this
               stage for the module's own window, unmount this
               component and take the request with it (see `setup`
               above, where the whole measurement is written down), and
               it would also leave somebody who came to set a logo
               standing in a catalogue they did not ask for. The page
               is drawn here; closing it is the list of cards again. */
            onSettings={(id) => setSettings({ moduleId: id })}
            onNew={() => setCreating(true)}
          />
        )}
      </div>

      {/* The create panel portals itself to the body, so it is mounted
          from wherever the button that asks for it lives. Opening the
          new module straight away is the third of the three clicks —
          a module you then have to find on the dashboard is four. */}
      {creating ? (
        <NewModuleDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            onOpen(id)
          }}
        />
      ) : null}
    </div>
  )
}
