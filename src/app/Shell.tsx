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
import { DesignStage } from './DesignStage'
import { FlowStage } from './FlowStage'
import { QuoteStage } from './QuoteStage'
import { useQuotes } from '@/features/quote'
import { useViewPersistence } from './viewPersistence'
import './shell.css'

/** Everything that can cover the sheet. Two of them name a table, two
 *  are about the whole drawing, and the fifth names a document. There
 *  is never more than one.
 *
 *  The quote stage carries `quoteId: null` for the LIST rather than
 *  being two stage kinds. A list and the thing it opens are one place
 *  a person is, and splitting them would make "back to all quotes"
 *  close a stage and open another — which unmounts the box, drops the
 *  scroll, and re-runs the fade every time somebody compares two
 *  documents. */
type Stage =
  | { kind: 'view'; entityId: string }
  | { kind: 'design'; entityId: string }
  | { kind: 'rules' }
  | { kind: 'flow' }
  | { kind: 'quote'; quoteId: string | null }

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
  const [stage, setStage] = useState<Stage | null>(null)

  /* A STAGE ABOUT A TABLE THAT IS GONE IS NOT OPEN. Deleting a table
     from the sheet, an import or a demo swap all leave the id behind;
     resolving it here is what closes the stage and un-lights the door
     in the same frame, rather than leaving a page pointing at nothing. */
  const stagedEntityId =
    (stage?.kind === 'view' || stage?.kind === 'design') && entities[stage.entityId]
      ? stage.entityId
      : null
  const open: Stage | null =
    stage === null
      ? null
      : stage.kind === 'view' || stage.kind === 'design'
        ? stagedEntityId
          ? stage
          : null
        : stage

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
        {/* Every door hands the panel one value back. Nothing has to be
            cleared on the way in, because there is only one slot. */}
        <LeftPanel
          onOpenView={(id) => setStage({ kind: 'view', entityId: id })}
          onOpenDesign={(id) => setStage({ kind: 'design', entityId: id })}
          onOpenRules={() => setStage({ kind: 'rules' })}
          onOpenFlow={() => setStage({ kind: 'flow' })}
          onOpenQuotes={() => setStage({ kind: 'quote', quoteId: null })}
          openViewEntityId={open?.kind === 'view' ? open.entityId : null}
          openDesignEntityId={open?.kind === 'design' ? open.entityId : null}
          rulesOpen={open?.kind === 'rules'}
          flowOpen={open?.kind === 'flow'}
          quotesOpen={open?.kind === 'quote'}
          quoteCount={quoteCount}
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
              table's page to a customer covered in handles. The design
              stage is keyed for the same reason: `DesignerSheet` resets
              itself on a new entity, but the stage's own chrome does
              not, so the open accordion row would follow the reader
              from one table to a completely different one. */}
          {open?.kind === 'view' ? (
            <ViewStage
              key={open.entityId}
              entityId={open.entityId}
              /* THE ONE WAY IN. A quote is minted on the view page,
                 from the row that page is drawn for — nowhere else in
                 the app knows both. The stage hands back the new
                 document's id and we open it, so pressing "Quote this
                 one" lands on the quote rather than on a list the
                 person then has to search. */
              onQuote={(quoteId) => setStage({ kind: 'quote', quoteId })}
              onClose={() => setStage(null)}
            />
          ) : open?.kind === 'design' ? (
            <DesignStage
              key={open.entityId}
              entityId={open.entityId}
              onClose={() => setStage(null)}
            />
          ) : open?.kind === 'rules' ? (
            <RulesStage onClose={() => setStage(null)} />
          ) : open?.kind === 'flow' ? (
            <FlowStage onClose={() => setStage(null)} />
          ) : open?.kind === 'quote' ? (
            /* DELIBERATELY NOT KEYED ON THE QUOTE ID. The view and
               design stages are keyed because a different table is a
               different page; a different quote is the SAME place —
               the list and the documents in it are one screen a person
               moves around inside, and remounting it on every open
               would drop the list's scroll position between two
               documents being compared. */
            <QuoteStage
              quoteId={open.quoteId}
              onOpen={(quoteId) => setStage({ kind: 'quote', quoteId })}
              onClose={() => setStage(null)}
            />
          ) : null}
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
