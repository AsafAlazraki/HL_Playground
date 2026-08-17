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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import type { OrgProfile } from '@/types/model'
import {
  Whiteboard,
  clearNewTableRequest,
  useNewTableRequest,
} from '@/features/whiteboard'
import { NewTableDialog } from '@/features/tablekit'
import { useFocusedTableEntity, setFocusedTableEntity } from '@/features/table'
import { Onboarding } from '@/features/onboarding'
import { TopBar } from './TopBar'
import { Dock } from './Dock'
import { Win } from './Win'
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

  /* view pages survive a refresh — see viewPersistence.ts */
  useViewPersistence()

  /* HOW MANY DOCUMENTS THERE ARE, for the door in the panel. Read
     here rather than inside the panel so the door and the stage are
     answering the same registry in the same frame — a count that
     lagged the list by a render is how a door disappears while its
     stage is still open. */
  const quoteCount = useQuotes().length

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

  const closeWin = useCallback((id: string) => {
    setWins((prev) => prev.filter((w) => w.id !== id))
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

  /* the old single-slot setter, kept so every existing call site in
     this file keeps working — it just opens a window instead */
  const setStage = useCallback(
    (next: Stage | null) => {
      if (next === null) {
        setWins((prev) => prev.filter((w) => w.stage.kind !== 'home'))
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

  /* THE GATE. Onboarding replaces the whole shell — it is not a modal
     over a configurator with nothing in it. Tables on the sheet outrank
     a missing organisation: a drawing is never hidden behind a wizard. */
  if (!org && tableCount === 0) return <Onboarding />

  return (
    <div className="shell-root">
      <TopBar
        onRevealTable={(id) => setStage({ kind: 'table', entityId: id })}
      />

      {/* THE DESKTOP. The drawing stays live underneath and is the
          desktop picture; windows stand on it. */}
      <div className="shell-body">
        <main className="shell-stage" aria-label="Desktop">
          <div className="shell-sheet-layer">
            <Whiteboard />
            {tableCount === 0 && <EmptyState onCreateTable={() => setPicking(true)} />}
          </div>

          {wins.map((w, i) =>
            w.mini ? null : (
              <Win
                key={w.id}
                title={winTitle(w.stage, entities)}
                frame={w.frame}
                z={20 + i}
                focused={w.id === focusedId}
                zoomed={w.zoomed}
                onFocus={() => raiseWin(w.id)}
                onClose={() => closeWin(w.id)}
                onMinimise={() => patchWin(w.id, { mini: true })}
                onZoom={() => patchWin(w.id, { zoomed: !w.zoomed })}
                onMove={(xy) => patchWin(w.id, { frame: { ...w.frame, ...xy } })}
              >
                {renderStage(w.stage, {
                  openWin,
                  close: () => closeWin(w.id),
                })}
              </Win>
            ),
          )}
        </main>
      </div>

      {/* THE DOCK — floating over the sheet, not attached to an
          edge and not a column beside it. */}
      <Dock
        /* the dock lights whichever window is focused */
        current={wins.length ? wins[wins.length - 1].stage.kind : null}
        onBackToSheet={() => setStage(null)}
        onOpenHome={() => setStage({ kind: 'home' })}
        onOpenTable={(id) => setStage({ kind: 'table', entityId: id })}
        onOpenDashboard={() => setStage({ kind: 'module', moduleId: null })}
        onOpenRules={() => setStage({ kind: 'rules' })}
        onOpenFlow={() => setStage({ kind: 'flow' })}
        onOpenQuotes={() => setStage({ kind: 'quote', quoteId: null })}
        onAddTable={() => setPicking(true)}
        quoteCount={quoteCount}
      />

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
