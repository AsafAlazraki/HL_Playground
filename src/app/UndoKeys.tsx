/* ============================================================
   UNDO KEYS — the two chords, and the note that says what moved.

   WHERE THIS IS BOUND, AND WHY IT IS ALLOWED TO BE. `Shell.tsx`
   binds NO window key handler on purpose, and its reasoning is
   right: the sheet is made of editable grids, so a global "n = new"
   would eat the n of every word typed into a cell. This handler
   does not break that rule, it obeys it in three ways:

     1. IT LISTENS FOR ONE CHORD. Ctrl/Cmd+Z and its shifted twin
        (plus Ctrl+Y, which is what Windows fingers reach for).
        Nothing else on this screen binds them: `resolveKey` in
        `features/table/core/keys.ts` — the grid's whole keyboard —
        has no case for `z` at all.
     2. IT STANDS DOWN INSIDE AN EDITOR. If the keystroke landed in
        an input, a textarea, a select or a contenteditable, it is
        left alone: a cell editor's Ctrl+Z is the BROWSER's undo of
        the text being typed, and stealing it to revert somebody
        else's committed edit would be worse than having no undo.
        Commit the cell first, then Ctrl+Z means the cell.
     3. IT LISTENS IN THE CAPTURE PHASE, which is not aggression but
        necessity. `EntityTableNode` stops key propagation at its own
        root so React Flow never sees a keystroke meant for a grid,
        and a React `stopPropagation` calls through to the native
        event — so a bubble-phase window listener would be deaf to
        every on-canvas table, which is most of the app. Capture
        runs before any of that, and rule 2 above is what makes it
        safe to run first.

   AND IT SAYS WHAT IT DID. A silent revert is indistinguishable
   from a bug — worse over 651 rows, where the cell that changed
   back may not even be on screen. The store hands back the label it
   recorded ("40 cell edits · Boats"), and it is spoken through the
   table's own toast strip, so an undo looks like every other thing
   this app says. Pressing Ctrl+Z with an empty stack says so too,
   rather than answering with nothing.

   The wrapper is a fixed, click-through layer with no paint of its
   own: `.tb-toasts` positions itself absolutely inside whatever
   contains it, and this component is mounted at the app root rather
   than inside a table, so it needs one. No colour, no type, no
   token — geometry only. The look of a toast is not this file's.
   ============================================================ */
import { useEffect } from 'react'
import type { JSX } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { Toasts, useToasts } from '@/features/table/Toasts'

/** a keystroke that belongs to a text field belongs to the browser */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function UndoKeys(): JSX.Element {
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const { items, push, dismiss } = useToasts()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.altKey) return
      const k = e.key.toLowerCase()
      /* Ctrl+Y is redo on Windows and nothing anywhere else */
      const wantsRedo = k === 'y' || (k === 'z' && e.shiftKey)
      if (k !== 'z' && !wantsRedo) return
      if (isTextEntry(e.target)) return

      e.preventDefault()
      const label = wantsRedo ? redo() : undo()
      if (label) push(`${wantsRedo ? 'Redone' : 'Undone'} — ${label}`)
      else push(`Nothing to ${wantsRedo ? 'redo' : 'undo'}`, 'warn')
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [undo, redo, push])

  /* THE NOTE CLEARS THE BAR IT WAS LANDING ON. `inset: 0` put this
     layer over the whole viewport, and `.tb-toasts` parks its strip at
     the bottom of whatever contains it — which is the exact band the
     floating dock occupies. Measured at 1280 × 860: the toast came up
     at 810–842 inside a dock sitting 777–838, so every Ctrl+Z painted
     "Undone — …" across the middle of the navigation, and won the hit
     test doing it (z-index 200 against the bar).
     Lifting the floor by the dock's own height puts the note directly
     above the bar instead of on it. Still geometry only — no colour,
     no type, no token; the look of a toast is not this file's. */
  return (
    <div
      style={{
        position: 'fixed',
        inset: '0 0 var(--dock-clear, 84px) 0',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      <Toasts items={items} onDismiss={dismiss} />
    </div>
  )
}
