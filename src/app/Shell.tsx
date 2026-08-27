/* ============================================================
   THE SHELL — masthead, one panel, the sheet. Nothing else.

   ROUTING, in full: nothing named and nothing drawn → onboarding.
   Otherwise → the configurator. There is no router, no URL and no
   third state.

   THE GATE IS ON THE SHEET, NOT ONLY ON THE ORGANISATION, and the
   organisation outlives a swap. `replaceProject` rebuilds meta from
   the incoming file, which has no organisation in it, so every
   import, merge and prepared set used to drop it — and a user who
   pressed MERGE with three boats on the sheet was answered with
   "What's the name of your business?" while their tables sat
   invisible in the store. Two lines below fix that from this side:
   we remember the organisation and put it back the moment a swap
   drops it (in a LAYOUT effect, so it is restored before the frame
   is painted and nothing unmounts), and a sheet with tables on it
   is never hidden behind the wizard even if there is no
   organisation to put back. A deliberate CLEAR SHEET — no
   organisation AND no tables — still lands on onboarding, which is
   what a full reset should do.

   TWO PANELS MAXIMUM, and the second one is the sheet. The right
   rail is off the default path entirely — inspector, review rail
   and rule-results rail all still exist (`Rails.tsx`,
   `Inspector.tsx`) and are one line of JSX away, but a column of
   schema controls beside a table you can type straight into is
   the clutter this pass exists to remove. Columns are edited in
   the table, by the table module.

   NO WINDOW KEY HANDLER. The sheet is made of editable grids, so
   the shell binds nothing globally: a global "n = new" would eat
   the n of every word typed into a cell, and a global Escape
   would fight the grid's own revert-this-edit. Every key on this
   screen belongs to whatever is under the cursor.

   THE NEW-TABLE DIALOG IS HOSTED HERE, once, for both ways in:
   dropping a type on the sheet (the canvas publishes it through
   `useNewTableRequest`, carrying the kind and where it landed)
   and asking for one outright from the invitation (no kind yet,
   so the dialog opens on its first question).

   DOORS OPEN STAGES, and there is exactly ONE STAGE. Five finished
   features needed a table, a rule, a document, or nothing at all, and
   none of them knew which one a person was pointing at — only the
   shell does.
   So the panel draws a door, the door names a stage, and the stage is
   mounted OVER the sheet rather than instead of it: the canvas stays
   alive underneath, so closing is instant and the sheet has not moved.

   ONE STATE, NOT FOUR BOOLEANS. `viewing` and `rulesOpen` began as two
   flags that each had to remember to clear the other; a third and a
   fourth of those is a truth table nobody can hold, and the first
   mistake draws two stages on top of each other. `stage` is one
   nullable value — opening anything closes everything else because
   there is nowhere else for the old value to live.

   A STAGE MUST NEVER OUTLIVE ITS SUBJECT. A view or a design stage
   whose table is struck from the sheet, or a flow stage after the
   rules are swapped out, would otherwise sit there as a white
   rectangle with a back button in it. Each stage checks its own
   subject; the two that name a table are also checked here, so the
   door in the panel and the stage agree about what is open.
   ============================================================ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import type { OrgProfile } from '@/types/model'
import {
  Whiteboard,
  clearNewTableRequest,
  useNewTableRequest,
} from '@/features/whiteboard'
import { NewTableDialog } from '@/features/tablekit'
import {
  requestRowReveal,
  setFocusedTableEntity,
  useFocusedTableEntity,
} from '@/features/table'
import { Onboarding } from '@/features/onboarding'
import { SideNav } from './SideNav'
import { ActionBar } from './ActionBar'
import { useHasPageActions } from '@/lib/actions'
import { Win } from './Win'
import { useWindowKeys } from './useWindowKeys'
import {
  bestFrame,
  renderStage,
  winKey,
  winTitle,
  type Stage,
  type Win as WinState,
} from './winKit'
import { TableStage } from './TableStage'
import { EmptyState } from './EmptyState'
import { ViewStage } from './ViewStage'
import { RulesStage } from './RulesStage'
import { DesignStage } from './DesignStage'
import { FlowStage } from './FlowStage'
import { QuoteStage } from './QuoteStage'
import { ModuleStage } from './ModuleStage'
import { useQuotes } from '@/features/quote'
import { CUSTOMER_TABLE_ID } from '@/features/crm'
import { Finder } from '@/features/search'
import { Freshness } from '@/features/io'
import { keepSeedVersion, northsideFreshness, type SeedFreshness } from '@/demos'
import { applyDemoSet, realDemoSet } from './demoLoad'
import { useViewPersistence } from './viewPersistence'
import './shell.css'

/** Everything that can cover the sheet. Two of them name a table, two
 *  are about the whole drawing, the fifth names a document and the
 *  sixth names a place in the business. There is never more than one.
 *
 *  The quote stage carries `quoteId: null` for the LIST rather than
 *  being two stage kinds. A list and the thing it opens are one place
 *  a person is, and splitting them would make "back to all quotes"
 *  close a stage and open another — which unmounts the box, drops the
 *  scroll, and re-runs the fade every time somebody compares two
 *  documents.
 *
 *  The module stage carries `moduleId: null` for the DASHBOARD of
 *  them, for exactly that reason and no other. It carries no ROW: the
 *  item a person is reading inside a module is a position inside that
 *  module, the way the open row is a position inside the view stage,
 *  and it lives there. One fact per stage is what keeps this a union
 *  rather than a truth table.
 *
 *  THE DASHBOARD IS A STAGE, NOT THE HOME. The plan asks whether it
 *  should replace the blueprint as the front door (§11, open question
 *  1) and nobody has answered; until somebody does, it opens the way
 *  the other five open — over the sheet, which keeps its zoom and its
 *  nodes underneath and is one press away. */

export function Shell() {
  const org = useProjectStore((s) => s.meta.org)
  const entities = useProjectStore((s) => s.entities)
  const tableCount = Object.keys(entities).length
  const setOrganisation = useProjectStore((s) => s.setOrganisation)

  /* IS THIS COPY OF THE PREPARED SET THE CURRENT ONE? The sheet is
     hydrated out of this browser's own storage, so a person who
     loaded the example months ago meets THAT one — and it reads like
     data reverting rather than like an old file. The comparison is
     the set's own (`@/demos`), the notice is `features/io`'s, and
     the shell only decides whether to draw it.

     IT IS ASKED ASYNCHRONOUSLY BECAUSE THE SET IS ITS OWN CHUNK NOW
     (demos/seedChunk.ts). Two consequences, both wanted: a sheet with
     fewer tables than the set could ever be recognised in never
     fetches the price file to be told it is not the price file — a
     blank sheet, a dealer's own six tables, an import — and on the
     sheet that IS the set, the notice arrives a moment after first
     paint instead of holding the entry chunk hostage before it. The
     answer is a notice about a months-old copy of a catalogue; it has
     never been urgent to the frame. */
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)
  const [keeping, setKeeping] = useState(false)
  const [fresh, setFresh] = useState<SeedFreshness | null>(null)
  useEffect(() => {
    /* the sheet can change while the chunk is in flight — an answer
       about the sheet as it was is worse than no answer */
    let live = true
    void northsideFreshness(entities, rowsByEntity, modules).then(
      (r) => {
        if (live) setFresh(r)
      },
      () => {
        /* the chunk did not arrive. Nobody asked for it out loud, so
           nobody is told: the notice simply is not drawn, and the
           doors that DO ask out loud report their own failures. */
        if (live) setFresh(null)
      },
    )
    return () => {
      live = false
    }
  }, [entities, rowsByEntity, modules])

  /* view pages survive a refresh — see viewPersistence.ts */
  useViewPersistence()

  /* HOW MANY DOCUMENTS THERE ARE, for the door in the panel. Read
     here rather than inside the panel so the door and the stage are
     answering the same registry in the same frame — a count that
     lagged the list by a render is how a door disappears while its
     stage is still open. */
  const quoteCount = useQuotes().length

  /* HOW MANY PEOPLE ARE IN THE REGISTER, for the badge on the dock.
     Read here for the same reason the quote count is: the door and
     the stage must be answering the same data in the same frame. A
     project with no register reads 0 and the badge is not drawn —
     `DockItem` only paints one above zero — so a cleared install
     gets a door to press and nothing to ignore. */
  const customerCount = (rowsByEntity[CUSTOMER_TABLE_ID] ?? []).length

  /* what is over the sheet right now, or null for the sheet itself */
  /* ============================================================
     THE DESKTOP.

     There is no single "stage" any more. Each thing you open is a
     WINDOW, and windows stand beside each other — because a person
     configuring a boat wants the boat, the motors that fit it and
     the quote open at once, and one slot made that impossible.

     `wins` is the stack, bottom to top. The last entry is the
     focused one; raising a window moves it to the end. `zoomed`
     and `mini` are per-window and live on the entry.
     ========================================================== */
  const [wins, setWins] = useState<WinState[]>([
    { id: 'home', stage: { kind: 'home' }, frame: bestFrame(0), zoomed: false, mini: false },
  ])
  const seq = useRef(1)

  const focusedId = wins.length ? wins[wins.length - 1].id : null
  const focused = wins.length ? wins[wins.length - 1] : null

  /* OPENING IS IDEMPOTENT PER SUBJECT. Pressing Boats twice does not
     make two Boats windows; the second press raises the one that is
     already open, which is what every OS does and what anybody
     expects. */
  const openWin = useCallback((stage: Stage) => {
    setWins((prev) => {
      const key = winKey(stage)
      const found = prev.find((w) => winKey(w.stage) === key)
      if (found) {
        return [...prev.filter((w) => w.id !== found.id), { ...found, mini: false }]
      }
      const id = `w${seq.current++}`
      return [
        ...prev,
        { id, stage, frame: bestFrame(prev.length), zoomed: false, mini: false },
      ]
    })
  }, [])

  /* A WINDOW OUTLIVES ITS OWN REMOVAL by the length of its exit.
     Dropping it from the array immediately is what made closing
     and minimising instantaneous - there was nothing left on
     screen to animate. It is marked, it plays, and then it goes. */
  const [leaving, setLeaving] = useState<Record<string, 'closing' | 'minimising'>>({})

  const closeWin = useCallback((id: string) => {
    setLeaving((l) => ({ ...l, [id]: 'closing' }))
    window.setTimeout(() => {
      setWins((prev) => prev.filter((w) => w.id !== id))
      setLeaving(({ [id]: _gone, ...rest }) => rest)
    }, 180)
  }, [])

  const minimiseWin = useCallback((id: string) => {
    setLeaving((l) => ({ ...l, [id]: 'minimising' }))
    window.setTimeout(() => {
      setWins((prev) => prev.map((w) => (w.id === id ? { ...w, mini: true } : w)))
      setLeaving(({ [id]: _gone, ...rest }) => rest)
    }, 300)
  }, [])

  const raiseWin = useCallback((id: string) => {
    setWins((prev) => {
      if (prev.length && prev[prev.length - 1].id === id) return prev
      const w = prev.find((x) => x.id === id)
      if (!w) return prev
      return [...prev.filter((x) => x.id !== id), { ...w, mini: false }]
    })
  }, [])

  const patchWin = useCallback((id: string, patch: Partial<WinState>) => {
    setWins((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }, [])

  /* THE DESKTOP SHORTCUTS. Every one is modifier-gated, because
     this app is made of editable grids and a bare key handler
     would eat typing. See useWindowKeys.ts. */
  const { switcher } = useWindowKeys({
    ids: wins.map((w) => w.id),
    raise: raiseWin,
    close: closeWin,
    minimise: minimiseWin,
    zoom: (id) =>
      setWins((prev) =>
        prev.map((w) => (w.id === id ? { ...w, zoomed: !w.zoomed } : w)),
      ),
  })

  /* ESCAPE IS NOT BOUND HERE, DELIBERATELY. Every stage draws its own
     way back and now has the keystroke to match, but it is bound inside
     the stage, to that stage's own `onClose` — see stageKeys.ts. A
     keystroke bound HERE could only mean "drop the focused window",
     which is the wrong answer for a module's item page: its back goes
     to the module's list, and the window is the module. The shell keeps
     its one rule about the keyboard — nothing unmodified is bound at
     this level, because the sheet under it is made of editable grids. */

  /* the old single-slot setter, kept so every existing call site in
     this file keeps working — it just opens a window instead.

     NULL MEANS THE SHEET, AND THE SHEET IS WHAT IS UNDER EVERY
     WINDOW. This used to drop only the HOME window, which made the
     bar's "Data model" a dead press for most of a session: `focused`
     is the top of the stack, so a single table, module or quote left
     standing kept the sheet hidden and the button did visibly
     nothing. Measured before the change: open Stacer, press Data
     model, and the table stage was still the surface with the sheet
     layer still `hidden`.

     Emptying the stack is the honest reading of "show me the
     drawing" — there is no fourth state where a window is open and
     the sheet is in front. It costs the Cmd-Tab history, which is
     the right trade for a deliberate press of the one item on the
     bar that means "nothing in front". */
  const setStage = useCallback(
    (next: Stage | null) => {
      if (next === null) {
        setWins([])
        return
      }
      openWin(next)
    },
    [openWin],
  )

  /* OPENING A TABLE FROM THE SHEET.

     A card on the canvas cannot reach the shell — it is inside React
     Flow, several transforms down — so it publishes through the
     module-level signal it already had for the FOCUS lens, and the
     shell turns that into a stage. Both of the card's verbs, EXPAND
     and FOCUS, now land here: they were two names for "show me the
     whole table", and the answer to that is a page. */
  const focusedTableId = useFocusedTableEntity()
  useEffect(() => {
    if (!focusedTableId) return
    setStage({ kind: 'table', entityId: focusedTableId })
    setFocusedTableEntity(null)
  }, [focusedTableId])

  /* A WINDOW WHOSE SUBJECT IS GONE CLOSES ITSELF. A table struck
     from the sheet, an import or a demo swap all leave an id behind,
     and a window pointing at nothing is a white rectangle with a
     back button in it. Each stage already checks its own subject;
     this drops the window so the dock and the desktop agree. */
  useEffect(() => {
    setWins((prev) =>
      prev.filter((w) =>
        'entityId' in w.stage ? Boolean(entities[w.stage.entityId]) : true,
      ),
    )
  }, [entities])

  /* the last organisation we saw, kept across a swap that drops it */
  const knownOrg = useRef<OrgProfile | null>(null)
  if (org) knownOrg.current = org

  /* a type dropped on the sheet: kind known, position known */
  const dropped = useNewTableRequest()
  /* asked for from the invitation: nothing known yet */
  const [picking, setPicking] = useState(false)
  /* the finder — ⌘K, and the search item on the dock */
  const [finding, setFinding] = useState(false)

  /* THE ONE KEY THE SHELL BINDS, AND IT IS MODIFIED. The header above
     says this shell binds nothing globally, and the reason it gives
     is unmodified keys: a bare "n" eats the n of every word typed
     into a cell. ⌘K cannot — no cell wants it, and the field has been
     drawing that stamp on itself since it was written, which was a
     promise nothing kept once the masthead that held it was removed.
     CAPTURE PHASE, for the same reason SearchField takes it there: a
     table node stops keydown at its own root while a cell is being
     edited, so a bubble-phase listener here would never fire. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'k' && e.key !== 'K') return
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      e.preventDefault()
      setFinding(true)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  /* a drop outranks a pick — and clears it, so dismissing the drop
     cannot leave a second dialog waiting underneath */
  useEffect(() => {
    if (dropped) setPicking(false)
  }, [dropped])

  /* PUT THE ORGANISATION BACK. A swap that left tables behind cannot
     have meant to un-name the business — restore it before paint, so
     the masthead never flickers and the sheet never unmounts. An empty
     sheet is left alone: that is CLEAR SHEET, and it belongs at the
     wizard. */
  useLayoutEffect(() => {
    const remembered = knownOrg.current
    if (org || !remembered || tableCount === 0) return
    setOrganisation(remembered.name, remembered.industry)
  }, [org, tableCount, setOrganisation])

  /* WHAT THE ACTION BAR COSTS THE PAGE, AND ONLY WHILE THERE IS ONE.
     The dock's 78px strip is reserved once, by `.shell-stage`; the
     second tier adds 50 more (40px of bar plus `.dk-wrap`'s 10px gap)
     and is charged the same way — from this one class, read out of the
     same register the bar itself draws from, so the reservation and the
     bar can never disagree about whether a bar exists. A page with no
     actions pays nothing at all, which is the whole reason the
     register's three bands could come DOWN rather than merely move.
     See the foot of `actionbar.css`. */
  const hasActions = useHasPageActions()

  /* THE GATE. Onboarding replaces the whole shell — it is not a modal
     over a configurator with nothing in it. Tables on the sheet outrank
     a missing organisation: a drawing is never hidden behind a wizard. */
  if (!org && tableCount === 0) return <Onboarding />

  return (
    <div className={`shell-root${hasActions ? ' has-acts' : ''}`}>

      {/* THE DESKTOP. The drawing stays live underneath and is the
          desktop picture; windows stand on it. */}
      <div className="shell-body">
        {/* THE RAIL IS PART OF THE PAGE, NOT OVER IT. It is a grid
            column beside the stage rather than a floating object on
            top of it, which is the whole difference between a
            desktop and a web application: the content column starts
            where the rail ends and owns everything to the right of
            it, including its own floor. */}
        <SideNav
          current={wins.length ? wins[wins.length - 1].stage.kind : null}
          currentEntityId={
            focused && 'entityId' in focused.stage ? focused.stage.entityId : null
          }
          onOpenSheet={() => setStage(null)}
          onOpenHome={() => setStage({ kind: 'home' })}
          onOpenTable={(id) => setStage({ kind: 'table', entityId: id })}
          onOpenDashboard={() => setStage({ kind: 'module', moduleId: null })}
          onOpenRules={() => setStage({ kind: 'rules' })}
          onOpenQuotes={() => setStage({ kind: 'quote', quoteId: null })}
          onOpenCustomers={() => setStage({ kind: 'customer', customerId: null })}
          onAddTable={() => setPicking(true)}
          onSearch={() => setFinding(true)}
          /* A QUOTE IS MINTED FROM THE ROW BEING SOLD —
             `createQuoteFromView(viewId, rowId)` — so there is no
             such thing as an empty quote: "one rig, one customer,
             one moment". New quote therefore opens the finder to
             pick the subject rather than inventing a blank
             document. Structure is never a side effect (§7). */
          onNewQuote={() => setFinding(true)}
          quoteCount={quoteCount}
        />
        <main className="shell-stage" aria-label="Desktop">
          {/* THE SHEET IS A SECTION, NOT A BACKDROP — and it is MOUNTED
              only while it is the section you are in.

              This carried `hidden` instead, which is `display: none`:
              the canvas stayed alive behind an opaque page, doing
              invisible work in a container with NO BOX. React Flow
              cannot survive that. `getViewportForBounds` divides the
              pane by the drawing, so a 0 x 0 pane with nothing measured
              in it is 0/0 — and a NaN viewport reaches the DOM as
              `<pattern x="NaN">`, which is the wall of red a
              stakeholder sees the moment they open dev tools. The one
              guard already in place (`paneMeasured`, 7d7a607) stops the
              camera being SPENT on a hidden pane; it cannot stop a
              canvas from being mounted in one.

              Unmounting is not a compromise, it is what the
              architecture already assumes: `canvasState.ts` keeps the
              camera, the framing licence and the arranged-rules set at
              module level with the reason written on them — "because
              the canvas unmounts every time TABLE view is opened, none
              of this can live in component state". The camera is parked
              on the way out and restored on the way in, so the sheet
              comes back on the same square inch, and the one framing
              licence per session is not spent twice.

              It also means the sheet's window-level Delete/Backspace
              handler is not registered while a page is in front, which
              is the thing every stage root was defending against. */}
          {focused === null ? (
            <div className="shell-sheet-layer">
              <Whiteboard />
              {tableCount === 0 && <EmptyState onCreateTable={() => setPicking(true)} />}
            </div>
          ) : null}

          {/* ONE SURFACE AT A TIME.

              This was a stack of floating windows with traffic
              lights, and it went too far: a dealer opening a price
              file does not want to run a window manager, and the
              chrome cost more than it gave. What is KEPT from it is
              the stack itself — it is the history now, so the dock
              can switch between recent places and Cmd-Tab still
              walks them — but only the top one is drawn, and it
              takes the whole surface. */}
          {focused ? (
            <div className="surface" key={focused.id}>
              {renderStage(focused.stage, {
                openWin,
                close: () => closeWin(focused.id),
                /* the same dialog the dock's NEW TABLE and a type
                   dropped on the sheet both open — one host, one
                   structure question */
                newTable: () => setPicking(true),
              })}
            </div>
          ) : null}

          {/* ============================================================
              THE ACTION BAR, RESCUED FROM THE DOCK.

              It was rendered INSIDE `<Dock>` — `.dk-rig` was the
              material and `<ActionBar/>` was its first child — so
              deleting the dock took every contextual control on
              every page with it: the register lost Search rows,
              Fitment, Columns, Delete rows, + Row and View in one
              commit. That is the "all of the same functionality"
              rule broken, and it shipped.

              It belongs to the PAGE, not to the navigation, which
              is why it is mounted here inside `.shell-stage` and
              floats within the content column rather than over the
              whole window. It carries its own surface now
              (`.pagebar`) instead of borrowing a deleted
              component's.
              ============================================================ */}
        </main>

        {/* OUTSIDE `.shell-stage`, DELIBERATELY. That element carries
            `.shell-stage > * { width:100%; height:100% }` so every
            stage fills it — and a floating bar mounted inside it
            inherited exactly that: 1296 x 1000, its backdrop-filter
            blurring the whole register behind it. It is
            `position: fixed`, so its DOM parent costs it nothing;
            being a sibling of the stage rather than a child of it is
            the whole fix, and it needs no override to undo a rule
            that was right for stages. */}
        <ActionBar />
      </div>

      {switcher ? (
        <div className="sw-scrim" role="dialog" aria-label="Switch window">
          <div className="sw-row">
            {switcher.order.map((id, i) => {
              const w = wins.find((x) => x.id === id)
              if (!w) return null
              return (
                <div
                  key={id}
                  className={`sw-tile${i === switcher.index ? ' is-on' : ''}`}
                >
                  <span className="sw-tile-mark" />
                  <span className="sw-tile-name">
                    {winTitle(w.stage, entities)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* THE DOCK STOOD HERE AND IS GONE. Its ten handlers moved to
          `SideNav` above, unchanged — see the header of SideNav.tsx
          for why a floating icon bar was the wrong object for this
          app. `customerCount` went with it: the rail counts quotes,
          which is the badge somebody actually watches, and does not
          count customers, which nobody does. */}

      {/* FIND ANYTHING. The state was declared and the dock button was
          wired to it; nothing rendered it, so the one control on the
          bar that never moves did nothing. Choosing a result opens
          that table, which is what a person who searched for a row
          was on their way to. */}
      {finding ? (
        <Finder
          /* AND IT LANDS ON THE ROW, not merely in the register the row
             is in. The row id is published as a request before the
             stage opens — the sheet reads it on mount, goes to that
             row and marks it. See `rowRevealState`: it is a one-shot
             act, not something the stage remembers. */
          onReveal={(entityId, rowId) => {
            setFinding(false)
            if (rowId) requestRowReveal(entityId, rowId)
            setStage({ kind: 'table', entityId })
          }}
          onClose={() => setFinding(false)}
        />
      ) : null}

      {/* AN OLDER COPY OF THE EXAMPLE SAYS SO. Drawn only over the
          prepared set it is about, only when this browser was really
          SEEDED FROM AN OLDER BUILD of it — never because somebody has
          since edited the sheet, which is what it used to do and which
          made it offer to destroy the edit — and only until the person
          answers it either way.

          "Keep this one" is recorded against the version it was an
          answer about, so it is not asked again on every reload; a
          later change to the set may ask once more. See
          @/demos/seedStamp. */}
      {fresh && !keeping && fresh.stale ? (
        <Freshness
          setName={fresh.drift.setName}
          missing={fresh.drift.missing}
          resized={fresh.drift.resized}
          noModules={fresh.drift.noModules}
          moduleCount={fresh.drift.moduleCount}
          onDismiss={() => {
            /* the version this was an answer about, carried out of the
               set with the drift so the shell never reaches into the
               chunk a second time to ask */
            keepSeedVersion(fresh.fingerprint)
            setKeeping(true)
          }}
          onLoadCurrent={() => {
            const set = realDemoSet()
            /* every question — including the offer to save a copy of
               this sheet first — has already been asked by the notice,
               in the app's own voice. `applyDemoSet` only loads.
               The chunk it needs is already here: this notice is only
               ever drawn after `northsideFreshness` resolved it. */
            if (set) {
              void applyDemoSet(set)
              setKeeping(true)
            }
          }}
        />
      ) : null}

      {/* `key` on the sequence: dropping the same kind on the same spot
         twice is two separate questions, not one stale dialog. */}
      {dropped ? (
        <NewTableDialog
          key={dropped.seq}
          kind={dropped.kind}
          position={dropped.position}
          onClose={clearNewTableRequest}
        />
      ) : picking ? (
        <NewTableDialog onClose={() => setPicking(false)} />
      ) : null}
    </div>
  )
}
