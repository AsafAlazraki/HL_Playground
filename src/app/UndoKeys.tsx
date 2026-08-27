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

   AND IT IS NOW THE APP'S ONE MOUTH, not only the undo chord's.
   `src/store/notes.ts` explains why that bus exists; the short of it
   is that the toast strip was a local hook, so rule 9 — "if an act is
   undoable it gets a toast with UNDO, not a dialog" — was impossible
   to obey anywhere except inside a table, and four surfaces reached
   for `window.confirm` instead. This component already had the only
   host mounted above the dock for the whole session, so it draws what
   comes through the bus too. It stays the undo keys' file: the chord
   is still bound here, and the note is still the table's own strip.

   The wrapper is a fixed, click-through layer with no paint of its
   own: `.tb-toasts` positions itself absolutely inside whatever
   contains it, and this component is mounted at the app root rather
   than inside a table, so it needs one. No colour, no type, no
   token — geometry only. The look of a toast is not this file's.
   ============================================================ */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { JSX } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { onSaid } from '@/store/notes'
import { Toasts, useToasts } from '@/features/table/Toasts'

/* ============================================================
   WHERE A NOTE IS ALLOWED TO SIT — solved once, for every surface.

   THE FAULT, TWICE. A previous round found that every Ctrl+Z painted
   its note across the middle of the DOCK, and answered it by lifting
   this layer's floor by the dock's own height — a constant, 84px. The
   same fault then turned up against a different surface: on the
   Fitment stage, deleting a step put a note at y 755–792 straight over
   the node palette, which sits at y 754–806, and six of its eight
   buttons were unusable for nine seconds. Measured at 1440 x 900.
   Raising the constant again would fix Fitment and wait for the next
   surface. There is no rectangle that is empty on every stage: the
   bottom centre holds the dock and the palette, the bottom left holds
   React Flow's zoom controls, the bottom right holds the freshness
   notice, and the top centre holds the Fitment stage's own tool strip
   (measured y 64–113). Choosing a corner is choosing which surface
   breaks next.

   SO THE FLOOR IS MEASURED, NOT CHOSEN. Anything that floats over a
   page and must never be covered marks itself `data-note-clear`, and
   this layer floors itself above the highest such thing on screen. Two
   elements carry it today — the dock (`.dk-wrap`) and the Fitment
   palette (`.rl-strip`) — and the dock's 84px constant is gone with
   them, because the dock is now measured like everything else. A new
   surface that parks an instrument over its page adds one attribute
   and needs no arithmetic; the note gets out of its way at every
   window width, including the width where the palette wraps to two
   rows (measured at 1152: floor 194 instead of 146).

   IT COSTS NOTHING WHEN NOTHING IS BEING SAID. The measurement runs on
   the layout pass in which a note appears — which is the only moment
   the number matters — and again on a resize while one is standing. No
   observers, no polling, nothing subscribed for the session.

   AND THE MEASUREMENT IS THE SECOND LINE OF DEFENCE, NOT THE FIRST.
   `.tb-toast` is now `pointer-events: none` with its two controls
   claiming their own presses (see table.css), so a surface that never
   declares itself can be covered but can no longer be disabled. The
   guarantee this file adds is visual; the guarantee that a press
   always reaches its target holds whether or not anyone remembers the
   attribute.
   ============================================================ */
const FURNITURE = '[data-note-clear]'

/** The one frame before the measurement runs. The action bar is 40px
 *  tall and sits `--s-5` (20px) off the bottom, so 60 is where the
 *  measured floor lands on every page that has a bar — and a page
 *  with none simply measures 0 on the next frame and drops. */
const FIRST_FRAME_FLOOR = 60

/** How far up from the bottom of the window a note must start, to
 *  clear everything that has declared itself. `--sp-5` inside
 *  `.tb-toasts` is the air above it. */
function floorAbove(): number {
  let floor = 0
  for (const el of document.querySelectorAll<HTMLElement>(FURNITURE)) {
    const box = el.getBoundingClientRect()
    /* something folded away, or not laid out yet, reserves nothing */
    if (box.width < 1 || box.height < 1) continue
    floor = Math.max(floor, window.innerHeight - box.top)
  }
  return Math.round(floor)
}

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

  /* Anything else in the app that has something to report lands here.
     `push` is stable (a `useCallback` with no deps), so this subscribes
     once for the session and never re-registers mid-note. */
  useEffect(() => onSaid((note) => push(note.text, note.tone, note.act)), [push])

  /* THE FLOOR, MEASURED. See the note above `FURNITURE`. */
  const standing = items.length > 0
  const [floor, setFloor] = useState(0)
  const remeasure = useCallback(() => setFloor(floorAbove()), [])

  /* `useLayoutEffect`, so the number is right in the frame the note
     first paints in — an effect would land it one frame late and the
     note would visibly jump up off the palette. */
  useLayoutEffect(() => {
    if (!standing) return
    remeasure()
  }, [standing, items.length, remeasure])

  /* and only while one is standing: a resize with nothing to say needs
     no arithmetic, and the next note measures for itself anyway */
  useEffect(() => {
    if (!standing) return
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [standing, remeasure])

  /* THE NOTE CLEARS EVERY FLOATING THING THAT HAS SAID SO. `inset: 0`
     put this layer over the whole viewport, and `.tb-toasts` parks its
     strip at the bottom of whatever contains it — which was the exact
     band the floating dock occupies (measured at 1280 × 860: the note
     came up at 810–842 inside a dock sitting 777–838), and then the
     exact band the Fitment palette occupies (1440 × 900: note 755–792,
     palette 754–806).
     The floor was a constant for the first of those and is measured for
     both, from `[data-note-clear]`.

     THE FALLBACK IS NO LONGER THE DOCK'S 84px. `floor` is 0 for the one
     frame before the layout effect runs, and 84 was the height of a
     component that has since been deleted — a number nothing on screen
     could explain any more. `FIRST_FRAME_FLOOR` is the action bar's
     own reserved band (40px of bar plus `--s-5` of air, the same 58 the
     bar itself is positioned by in actionbar.css — 60), so the one
     unmeasured frame lands where the measured ones do instead of
     jumping 24px on the second. Still geometry only — no colour, no
     type, no token; the look of a toast is not this file's. */
  return (
    <div
      style={{
        position: 'fixed',
        inset: `0 0 ${floor > 0 ? floor : FIRST_FRAME_FLOOR}px 0`,
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      <Toasts items={items} onDismiss={dismiss} />
    </div>
  )
}
