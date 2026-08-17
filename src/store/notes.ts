/* ============================================================
   WHAT THE APP SAYS AFTER IT HAS ALREADY DONE SOMETHING.

   WHY THIS FILE EXISTS. Rule 9 — "if an act is undoable it gets a
   toast with UNDO, not a dialog" — could not be obeyed anywhere
   outside a table, because the toast strip was a LOCAL hook. Three
   surfaces called `useToasts()` and each one owned its own list:
   `EntityTableNode`, `TableWorkspace`, and `UndoKeys` at the app
   root. A rule deleted in the rules rail, a step deleted on the flow
   stage and a zone deleted in the inspector had nowhere to speak, so
   all four of them reached for `window.confirm` and asked BEFORE
   acting instead — which is the wrong instrument twice over: it
   breaks the drawing office's visual language at the exact moment
   something irreversible is happening, and it asks a question the
   store can already answer with Ctrl+Z.

   So: a module-level bus, and the host that was already mounted at
   the app root (`UndoKeys`) draws what comes through it. No provider,
   no context, no library. A surface that wants to say something
   imports one function and calls it; whether anything is listening is
   not its problem, which is what makes this safe to call from a
   store-level command or a keydown handler as well as from render.

   WHY IT LIVES BESIDE THE STORE. `sayUndoable` has to know about the
   history stack to pin a step, and `src/lib/**` must not import the
   store — that is a layering inversion the rest of the tree does not
   make. `src/store/**` is imported by every feature already, so this
   is the one place where "a note" and "the last recorded step" can be
   held in the same hand.

   THE PIN IS THE WHOLE POINT OF `sayUndoable`. A button that says
   UNDO and calls a global `undo()` is honest for about a second: do
   one more thing in the nine the note stands for and pressing it
   reverts THAT instead. So the note holds the history entry it was
   raised about, BY REFERENCE, and refuses if that entry is no longer
   the next step back — saying why, in the place it is refused
   (rule 10), rather than quietly undoing the wrong act.

   WHY A MICROTASK. `record()` opens a burst and closes it on the
   following microtask, deliberately, so that forty `updateCell` calls
   in one handler collapse into one step. That means the entry does
   not exist yet on the line after `deleteRule(id)` — reading
   `past` there would pin the step BEFORE the one just taken. One
   microtask later the burst is closed and the top of the stack is
   ours. This is why `sayUndoable` takes no entry from its caller: the
   timing is a property of the history machinery, not of the surface.

   AND WHY THE PIN IS LENT OUT. A register does NOT speak through this
   bus: `TableSheet` and `EntityTableNode` each own a `useToasts()`
   strip, positioned inside the sheet they belong to, and that is
   right — a note about two cells belongs beside the two cells. But
   until now only the bus could build the pinned UNDO act, so rule 9
   was obeyed on the flow stage and disobeyed in the register: Ctrl+D
   said "2 cells filled" and offered nothing, while a deleted rule
   offered UNDO. `offerUndo` is the pin with the destination taken
   out — hand it any push and it builds the same act against the same
   step, and every word it goes on to say (the refusal, the
   confirmation) comes back through THAT push, so one strip carries
   the whole exchange. `sayUndoable` is now that function aimed at
   the bus, which is all it ever was.
   ============================================================ */
import type { ToastAct, ToastTone } from '@/features/table/Toasts'
import { useProjectStore, type HistoryEntry } from './useProjectStore'

export interface Note {
  text: string
  tone?: ToastTone
  /** one named act, or none — see `ToastAct` */
  act?: ToastAct
}

type Listener = (note: Note) => void

const listeners = new Set<Listener>()

/** Subscribe the host. Returns the unsubscribe, for an effect cleanup. */
export function onSaid(listen: Listener): () => void {
  listeners.add(listen)
  return () => {
    listeners.delete(listen)
  }
}

/**
 * Say something, from anywhere. Nothing is queued: with no host
 * mounted the note is dropped, on purpose — a note is a report about
 * something that has already happened, and replaying yesterday's
 * reports into a host that has just appeared would be worse than
 * silence.
 */
export function say(note: Note): void {
  for (const listen of listeners) listen(note)
}

/** How a surface says things. `useToasts().push` has exactly this
 *  shape, and so does the bus wrapper below. */
export type PushNote = (text: string, tone?: ToastTone, act?: ToastAct) => void

/**
 * Report what was just done through `push`, with UNDO on it — the
 * shape rule 9 asks for, for a surface that owns its own toast strip.
 *
 * MUST be called immediately after the mutation, in the same turn of
 * the event loop, so the step it pins is the one the sentence is
 * about. Says nothing at all when the act recorded no step: a note
 * offering to undo something the store cannot put back is a lie, and
 * a silent no-op here is the loud kind of bug, so it reports the act
 * without the button rather than with a dead one.
 *
 * The refusal and the confirmation go back through the same `push`,
 * because a note that answers itself somewhere else reads as two
 * unrelated events.
 */
export function offerUndo(push: PushNote, text: string, tone?: ToastTone): void {
  queueMicrotask(() => {
    const past = useProjectStore.getState().past
    const step: HistoryEntry | undefined = past[past.length - 1]
    if (step === undefined) {
      push(text, tone)
      return
    }
    push(text, tone, {
      label: 'Undo',
      onPick: () => {
        const store = useProjectStore.getState()
        const top = store.past[store.past.length - 1]
        if (top !== step) {
          push(
            'Something else has happened since — Ctrl+Z steps back one at a time',
            'warn',
          )
          return
        }
        const label = store.undo()
        if (label) push(`Undone — ${label}`)
      },
    })
  })
}

/** `offerUndo` aimed at the bus — for a surface with no strip of its own. */
export function sayUndoable(text: string, tone?: ToastTone): void {
  offerUndo((text2, tone2, act) => say({ text: text2, tone: tone2, act }), text, tone)
}
