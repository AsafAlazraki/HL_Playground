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

/**
 * Say what was just done, with UNDO on it — the shape rule 9 asks for.
 *
 * MUST be called immediately after the mutation, in the same turn of
 * the event loop, so the step it pins is the one the sentence is
 * about. Says nothing at all when the act recorded no step: a note
 * offering to undo something the store cannot put back is a lie, and
 * a silent no-op here is the loud kind of bug, so it reports the act
 * without the button rather than with a dead one.
 */
export function sayUndoable(text: string): void {
  queueMicrotask(() => {
    const past = useProjectStore.getState().past
    const step: HistoryEntry | undefined = past[past.length - 1]
    if (step === undefined) {
      say({ text })
      return
    }
    say({
      text,
      act: {
        label: 'Undo',
        onPick: () => {
          const store = useProjectStore.getState()
          const top = store.past[store.past.length - 1]
          if (top !== step) {
            say({
              text: 'Something else has happened since — Ctrl+Z steps back one at a time',
              tone: 'warn',
            })
            return
          }
          const label = store.undo()
          if (label) say({ text: `Undone — ${label}` })
        },
      },
    })
  })
}
