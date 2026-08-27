/* ============================================================
   APPLYING A LEVEL — the only part of this feature that writes.

   IT GOES THROUGH `useProjectStore.updateCell`, ONE ROW AT A TIME,
   AND THAT IS NOT A COMPROMISE. Three properties fall out of it
   that a bespoke bulk mutation would have had to re-earn:

     1. ONE ACT IS ONE UNDO STEP. The store's own header states
        the contract: "All the recording that happens in one turn
        of the event loop collapses into one entry, closed on the
        following microtask." So 187 `updateCell` calls in one
        synchronous loop are ONE history entry labelled
        "187 cell edits · Highfield Inflatables", and Ctrl+Z puts
        every one of the 187 back together. The loop below must
        therefore stay synchronous — no `await`, no `setTimeout`,
        no chunking. A chunked write would be 187 undo steps.

     2. IT PERSISTS. `mutate` stamps `updatedAt` and schedules the
        Dexie flush. Nothing here knows or needs to know that.

     3. IT IS REFUSED IN THE SAME PLACE EVERYTHING ELSE IS. A
        second tab holding the write lock makes `updateCell` a
        counted no-op, and the tab guard says so on screen. This
        file does not re-implement that check, so it can never
        disagree with it.

   AND IT FLOWS ONTO THE QUOTES BY DOING NOTHING. The cells are
   real. A quote built after this reads the rows and finds the new
   value; a quote built before it holds what it held, because a
   quote is a document about a moment. There is no propagation
   step, because there is nothing to propagate.

   THE TOAST IS RULE 9, AND IT IS `offerUndo`, NOT A DIALOG. The
   act is undoable, so it is done first and reported after, with
   UNDO on the note pinned to the exact step it is about
   (`store/notes.ts` explains the pin). Nothing here asks a
   question — the blast radius was on screen, computed, before the
   button was pressed.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { offerUndo, sayUndoable, type PushNote } from '@/store/notes'
import type { LeafNoun } from '@/features/table/grouping'
import { describeDone, type SetPlan } from './levels'

export interface ApplyResult {
  /** how many cells were written */
  written: number
  /** the sentence that was said, so a caller can log or test it */
  said: string
  /** why nothing happened, when nothing happened */
  refusal: string | null
}

/**
 * Runs a plan.
 *
 * A plan carrying a refusal is not run and not reported as done —
 * the refusal was already on screen where the act was refused
 * (rule 10), and saying it a second time in a toast would be the
 * app telling somebody something they are already looking at.
 *
 * `push` is a surface's own toast strip when it has one
 * (`useToasts().push`); with none supplied the note goes to the
 * app-wide bus that `UndoKeys` draws.
 */
export function applyLevelPlan(
  plan: SetPlan,
  noun: LeafNoun,
  push?: PushNote,
): ApplyResult {
  if (plan.refusal !== null) {
    return { written: 0, said: '', refusal: plan.refusal }
  }

  const { updateCell } = useProjectStore.getState()

  /* ONE SYNCHRONOUS LOOP. See property 1 above — this is the whole
     reason the act is a single undo step. */
  for (const rowId of plan.writes) {
    updateCell(plan.entityId, rowId, plan.fieldId, plan.value)
  }

  const said = describeDone(plan, noun)
  if (push) offerUndo(push, said)
  else sayUndoable(said)

  return { written: plan.writes.length, said, refusal: null }
}
