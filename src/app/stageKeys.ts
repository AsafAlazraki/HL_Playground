/* ============================================================
   THE KEYBOARD AT A STAGE — Escape, and what it must never take.

   Every stage draws its own way back. Until now the keyboard had no
   equivalent: the one key every desktop reserves for "put this away"
   did nothing on any of them, and on the way out it was swallowed by
   the stage roots themselves.

   ESCAPE IS THE STAGE'S OWN BACK CONTROL, ON THE KEYBOARD. It is bound
   to the same `onClose` the control in track 1 of the bar calls — not
   to the window stack — so the two can never diverge. That is not a
   detail: a module's item page is a `ViewStage` whose back goes to the
   module's list, and a keystroke wired to "drop the focused window"
   would have thrown away the module as well. Bound to `onClose`,
   Escape lands where the visible control lands, on every stage, for
   free:

     table / view / columns / rules / fitment / quote → the surface
       underneath, which is another page as often as it is the drawing
     a module's item page                             → the module's list
     the module dashboard and index                   → underneath

   HOME BINDS NOTHING, because Home draws no way back — it is the front
   door, and its route to the drawing is the dock's "Data model". A
   keyboard equivalent of a control that does not exist would be an
   invention, not a shortcut. And with no page in front there is no
   listener at all, so on the data model Escape stays the sheet's own:
   it clears the selection, as it always did.

   THE RESOLUTION ORDER, highest first. Nothing here is new machinery:
   each rung is a claim the code already makes, and this module only
   agrees to stand behind them.

     1. A WIDGET THAT OWNS THE KEYBOARD TAKES IT AND STOPS THE EVENT.
        The finder, the new-table and new-module panels, a confirm
        sheet, the picture plate, a filter menu, a popover, the dock's
        nested menu and the menu bar all listen in the CAPTURE phase at
        `document` or `window` and call `stopPropagation()`. The
        import/export menu and the designer's add-tray listen at
        document BUBBLE, which is still before this. A menu closes and
        returns focus to the button that opened it; the keystroke never
        reaches us. Nothing below runs.

     2. A FIELD OWNS ITS OWN ESCAPE. A key typed into an input, a
        textarea, a select or a contenteditable belongs to that
        control — the same rule the sheet's own window-level handler
        has always applied, and `isField` below is lifted from it. This
        is what keeps a live cell editor's Escape meaning REVERT THIS
        EDIT: while a cell is being edited the focus is inside
        `input.tb-editor`, so the grid gets it and we do not. It is
        also what keeps Escape in a search box meaning "clear the
        search" rather than "throw the page away", which matters most
        on a quote, where nearly everything a person does is typing.

     3. AN EVENT THAT ARRIVES ALREADY HANDLED IS NOT OURS.
        `defaultPrevented` is the second half of the grid's claim:
        `resolveKey` answers Escape-while-editing with `edit-cancel`
        and `useSheetCommands` calls `preventDefault()` before
        reverting. The grid deliberately lets that keystroke keep
        bubbling — its own comment says so, because something above may
        need to drop a copy marquee — so it arrives here flagged rather
        than absent.

     4. OTHERWISE THE STAGE CLOSES. Bare Escape only: a modifier makes
        it somebody else's shortcut.

   WHY THE BUBBLE PHASE, AND WHY IT HAD TO BE A WINDOW LISTENER. Every
   rung above depends on running LAST. React 19 dispatches its whole
   synthetic tree from one listener on the root container, so any node
   inside the app — including the stage root itself — is reached BEFORE
   a single React handler has run, and a handler bound there would beat
   the grid and the trays instead of yielding to them. `window` in the
   bubble phase is the only place downstream of all of them.

   EXACTLY ONE LISTENER IS EVER BOUND, because the shell draws exactly
   one surface at a time and a stage that hands its whole box to another
   stage passes `null` here instead of its own `onClose`.

   WHAT `stageKeys` IS FOR. Each stage root used to carry
   `onKeyDown={(e) => e.stopPropagation()}` — every key, no exceptions —
   to keep the sheet's Delete/Backspace from taking a whole table out
   from under an open page. That blanket also ate Escape whenever the
   focus was anywhere inside a stage, which is most of the time. It is
   narrowed here to the two keys the sheet's handler acts on, in one
   place, so the six stages say the same thing and can only be changed
   together.
   ============================================================ */

import { useEffect } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

/** One keydown, reduced to the four facts the order turns on. Nothing
 *  here is a DOM type, so the decision below is a pure function and has
 *  a test — the same shape `resolveKey` uses for the grid, and for the
 *  same reason: a precedence order nobody can exercise is a precedence
 *  order that drifts. */
export interface StageKey {
  key: string
  alt: boolean
  ctrl: boolean
  meta: boolean
  shift: boolean
  /** something nearer has already answered it — `defaultPrevented` */
  handled: boolean
  /** the focus is in an input, textarea, select or contenteditable */
  inField: boolean
}

/** THE ORDER, AS ONE EXPRESSION. Rung 1 is not here because it cannot
 *  be: a widget that stops the event means this is never called. */
export function closesStage(k: StageKey): boolean {
  if (k.key !== 'Escape') return false
  /* rung 4 — a modifier makes it somebody else's shortcut */
  if (k.alt || k.ctrl || k.meta || k.shift) return false
  /* rung 3 — the grid's cell editor has already answered this */
  if (k.handled) return false
  /* rung 2 — a field owns its own Escape */
  if (k.inField) return false
  return true
}

/** Rung 2's other half. Lifted from the sheet's own window-level
 *  handler, so a stage and the canvas underneath it agree about what a
 *  field is. */
function isField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/** WHAT A STAGE ROOT DOES WITH THE KEYBOARD.
 *
 *  Delete and Backspace stop here, because the sheet's window-level
 *  handler offers to strike the SELECTED TABLE on either one and only
 *  skips fields — and the door that opened this stage usually sits
 *  under the very table that is selected. A Backspace aimed at a row,
 *  or at the last letter of a search, must never be answered with
 *  "delete this price file?".
 *
 *  Everything else travels, which is what lets Escape reach the
 *  listener below at all. */
export function stageKeys(e: ReactKeyboardEvent<Element>): void {
  if (e.key === 'Delete' || e.key === 'Backspace') e.stopPropagation()
}

/** Bind Escape to this stage's own way back — or to nothing, by passing
 *  `null`, which is how a stage says "another stage is drawing my box
 *  and it owns the keyboard". */
export function useStageEscape(close: (() => void) | null): void {
  useEffect(() => {
    if (close === null) return
    const onKey = (e: KeyboardEvent): void => {
      const shouldClose = closesStage({
        key: e.key,
        alt: e.altKey,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
        handled: e.defaultPrevented,
        inField: isField(e.target),
      })
      if (!shouldClose) return
      e.preventDefault()
      close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])
}
