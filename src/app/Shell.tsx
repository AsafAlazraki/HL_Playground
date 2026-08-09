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

   THE VIEW PAGE IS MOUNTED HERE TOO, over the sheet rather than
   instead of it. `@/features/views` was complete and reachable
   from nowhere: it needs a table and a row, and only the shell
   knows which one a person is pointing at. The panel opens it;
   `ViewStage` picks the row and gives the page its box; the canvas
   stays alive underneath, so closing is instant and the sheet has
   not moved. A page whose table is struck from the sheet closes
   itself — the stage must never outlive its subject.
   ============================================================ */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import type { OrgProfile } from '@/types/model'
import {
  Whiteboard,
  clearNewTableRequest,
  useNewTableRequest,
} from '@/features/whiteboard'
import { NewTableDialog } from '@/features/tablekit'
import { Onboarding } from '@/features/onboarding'
import { TopBar } from './TopBar'
import { LeftPanel } from './LeftPanel'
import { EmptyState } from './EmptyState'
import { ViewStage } from './ViewStage'
import { RulesStage } from './RulesStage'
import { useViewPersistence } from './viewPersistence'
import './shell.css'

export function Shell() {
  const org = useProjectStore((s) => s.meta.org)
  const entities = useProjectStore((s) => s.entities)
  const tableCount = Object.keys(entities).length
  const setOrganisation = useProjectStore((s) => s.setOrganisation)

  /* view pages survive a refresh — see viewPersistence.ts */
  useViewPersistence()

  /* the table whose "what goes with this?" page is open, or null */
  const [viewing, setViewing] = useState<string | null>(null)
  /* the sentence-rules pane, over the sheet */
  const [rulesOpen, setRulesOpen] = useState(false)
  const openViewId = viewing && entities[viewing] ? viewing : null

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
      <TopBar />

      {/* THE FLEX CHAIN — .shell-root › .shell-body › panel | stage.
          Every box on it carries `min-width: 0` in shell.css; without
          it a panel that cannot fold below its min-content width pushes
          the row past the window and shoves the sheet off screen. */}
      <div className="shell-body">
        <LeftPanel
          onOpenView={(id) => {
            setRulesOpen(false)
            setViewing(id)
          }}
          openViewEntityId={openViewId}
          onOpenRules={() => {
            setViewing(null)
            setRulesOpen(true)
          }}
          rulesOpen={rulesOpen}
        />

        <main className="shell-stage" aria-label="Sheet">
          <Whiteboard />
          {tableCount === 0 && <EmptyState onCreateTable={() => setPicking(true)} />}
          {/* `key` on the table: a different subject is a different
              page, not the same page re-pointed. Without it the stage
              and the page under it kept their own state across the
              switch — the rail's find box still held the last table's
              word, so a 43-row table opened saying "nothing here
              matches", and SET UP mode carried over, handing the next
              table's page to a customer covered in handles. */}
          {openViewId ? (
            <ViewStage key={openViewId} entityId={openViewId} onClose={() => setViewing(null)} />
          ) : null}
          {rulesOpen ? <RulesStage onClose={() => setRulesOpen(false)} /> : null}
        </main>
      </div>

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
