/* ============================================================
   THE INVITATION — the second screen a new user ever sees, and
   the one that has to be as good as the first.

   FOUR THINGS, IN THIS ORDER, AND NOTHING ELSE:
     1. their organisation, set in the display face — the only
        moment on this screen that is allowed to be big;
     2. ONE primary action, CREATE YOUR FIRST TABLE, which opens
        the new-table dialog;
     3. a quiet second door: the bundled Master Price File, named
        for the business whose file it is, so nobody has to guess
        whether it is a toy — or worse, whose it is;
     4. one hint that the types on the left can be dragged.

   WHY THE SECOND DOOR IS WORDED THE WAY IT IS. It used to read
   "Start from Northside Marine" on a screen whose headline is the
   name the user just typed in. A dealer who had called their
   business Northside Marine read it as "start from MY data" and
   expected their own price list back. So the file was anonymised
   to "another dealer's price file" — which fixed that reader and
   lied to the one who matters most, because Northside Marine are
   now this app's FIRST REAL CUSTOMER and the door was describing
   their own catalogue as a stranger's while the provenance line
   underneath named them.

   Both readers are served by naming the business and comparing it
   to the organisation on the sheet, which `startingPointWords`
   does — and which is the one place that reasoning is written
   down. This file just draws whichever three lines come back.

   What is NOT here, and is not coming back: the three prepared-set
   cards, the DRAFT FIRST ENTITY / IMPORT pair, the BLANK SHEET /
   SCALE 1:1 / GRID 16 title block, and the industry blurb — a
   person who has just told us their industry does not need it read
   back to them.

   The card owns no dialog state: the shell hosts the new-table
   dialog for both ways in, so the primary action is a single call
   upward.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { loadDemoSet, realDemoSet, startingPointWords } from './demoLoad'

export interface EmptyStateProps {
  onCreateTable: () => void
}

export function EmptyState({ onCreateTable }: EmptyStateProps) {
  const org = useProjectStore((s) => s.meta.org)
  const projectName = useProjectStore((s) => s.meta.name)

  const name = org?.name || projectName

  /* Resolved from the demos register, not named here. While only the
     blank sheet ships this is undefined and the second door simply is
     not drawn — the screen never offers a button that loads nothing. */
  const real = realDemoSet()
  /* the same name the headline above prints, so what the door says and
     who the screen is addressed to can never disagree */
  const words = real ? startingPointWords(real, name) : undefined

  return (
    <div className="shell-invite">
      <section className="shell-invite-card" aria-labelledby="shell-invite-title">
        <span className="shell-tick shell-tick-tl" aria-hidden="true" />
        <span className="shell-tick shell-tick-tr" aria-hidden="true" />
        <span className="shell-tick shell-tick-bl" aria-hidden="true" />
        <span className="shell-tick shell-tick-br" aria-hidden="true" />

        <p className="shell-invite-kicker">Nothing on the sheet yet</p>

        <h1 id="shell-invite-title" className="shell-invite-title">
          {name}
        </h1>

        <div className="shell-dimline" aria-hidden="true">
          <span className="shell-dimline-tick" />
          <span className="shell-dimline-tick" />
        </div>

        <button
          type="button"
          className="btn btn-primary shell-invite-go"
          onClick={onCreateTable}
        >
          Create your first table
        </button>

        {real && words && (
          <button
            type="button"
            className="shell-invite-alt"
            onClick={() => loadDemoSet(real)}
          >
            <span className="shell-invite-alt-tag mono-label">{words.tag}</span>
            <span className="shell-invite-alt-label">{words.label}</span>
            {/* the provenance line — the demos module writes it, because
                the demos module is what knows where the numbers came from */}
            <span className="shell-invite-alt-note">{words.note}</span>
          </button>
        )}

        {/* THE HINT NAMED A PALETTE THAT IS NOT THERE. It read "drag a
            table type from the left onto the sheet", and there is no
            panel to the left of this card — `LeftPanel` has been
            imported by nothing since the masthead was removed. The
            first screen a new user meets cannot point at empty space,
            so it names the control that really does this, which is on
            the bar and never moves. */}
        <p className="shell-invite-hint">
          Or press New table on the bar.
        </p>
      </section>
    </div>
  )
}
