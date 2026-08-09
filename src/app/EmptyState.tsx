/* ============================================================
   THE INVITATION — the second screen a new user ever sees, and
   the one that has to be as good as the first.

   FOUR THINGS, IN THIS ORDER, AND NOTHING ELSE:
     1. their organisation, set in the display face — the only
        moment on this screen that is allowed to be big;
     2. ONE primary action, CREATE YOUR FIRST TABLE, which opens
        the new-table dialog;
     3. a quiet second door: the bundled Master Price File, tagged
        EXAMPLE DATA and named as somebody else's business, so
        nobody has to guess whether it is a toy — or worse, whose
        it is;
     4. one hint that the types on the left can be dragged.

   WHY THE SECOND DOOR IS WORDED LIKE THAT. It used to read "Start
   from Northside Marine" on a screen whose headline is the name
   the user just typed in. A dealer who had called their business
   Northside Marine read it as "start from MY data" and expected
   their own price list back. The button now says EXAMPLE DATA
   before any name is reached and calls the file ANOTHER DEALER'S,
   and only then does the provenance line name the business and
   the workbook. Nothing on it can be read as the user's own, and
   it is still three short lines.

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
import { loadDemoSet, realDemoSet } from './demoLoad'

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

        {real && (
          <button
            type="button"
            className="shell-invite-alt"
            onClick={() => loadDemoSet(real)}
          >
            <span className="shell-invite-alt-tag mono-label">Example data</span>
            <span className="shell-invite-alt-label">
              Load a worked example — another dealer’s price file
            </span>
            {/* the provenance line — the demos module writes it, because
                the demos module is what knows where the numbers came from */}
            <span className="shell-invite-alt-note">{real.blurb}</span>
          </button>
        )}

        <p className="shell-invite-hint">
          Or drag a table type from the left onto the sheet.
        </p>
      </section>
    </div>
  )
}
