/* ============================================================
   FIND ANYTHING — the search field, given somewhere to stand.

   THE DEFECT THIS CLOSES, and it is a dead button rather than a
   missing feature. `Shell.tsx` declared `const [finding, setFinding]
   = useState(false)` and wired the dock's "Find anything" item to
   `setFinding(true)`; nothing rendered `finding`. Pressing the one
   control on the bar that never moves did nothing at all, while the
   matcher underneath it — `rowSearch.ts`, with 326 lines of tests —
   sat orphaned, imported only by the masthead the redesign removed.

   SO THIS IS A BOX AND NOTHING MORE. `SearchField` owns the index,
   the ranking, the keyboard and every sentence it says; none of that
   is repeated here. The field was written to live in a masthead that
   no longer exists, so what it lost was a place to be — and the
   honest replacement for a bar that is always present is a panel
   that is summoned and dismissed.

   IT CLOSES FOUR WAYS, and every one of them is somebody changing
   their mind: Escape, a press on the ground behind it, choosing a
   result, and the keyboard leaving. Escape is taken in the CAPTURE
   phase because the field's own Escape stops propagation at the
   input — it means "put my answer list away", ours means "put the
   whole thing away", and the outer one has to run first or it would
   never run at all.

   THE GROUND BEHIND IT IS A SCRIM, NOT A BLUR. The dock and the page
   toolbar are the two translucent surfaces in this app and a third
   was not argued for; this is a flat wash of ink so the panel has
   something to sit on and the page behind stays legible enough to
   tell you where you will land.

   IT DOES NOT TRAP THE KEYBOARD, and it does not claim to. There is
   no `aria-modal` here on purpose: that word tells a screen reader
   the rest of the app is not there, and the rest of the app IS still
   there and still tabbable. What Tab does instead is LEAVE — and a
   panel nobody is standing in has no business covering the page, so
   focus crossing the edge closes it. Focus is put back where it came
   from when this was dismissed, and left alone when the person moved
   it themselves.
   ============================================================ */

import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import { SearchField } from './SearchField'
import './search.css'

export interface FinderProps {
  /** a result was chosen — the shell opens that table and closes this.
   *  `rowId` is the row that was picked, absent when what was picked
   *  was a table; the shell hands it to the sheet so the register
   *  opens ON the row rather than at the top of it. */
  onReveal: (entityId: string, rowId?: string) => void
  onClose: () => void
}

export function Finder({ onReveal, onClose }: FinderProps): JSX.Element {
  /* where the keyboard was standing before this opened, so dismissing
     it puts a person back rather than at the top of the document */
  const cameFrom = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  /* ...unless they took it somewhere themselves, in which case
     dragging it back is the app arguing with them */
  const restore = useRef(true)

  useEffect(() => {
    const from = cameFrom.current
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (restore.current && from?.isConnected) from.focus()
    }
  }, [onClose])

  return (
    <div
      className="fx-scrim"
      role="dialog"
      aria-label="Find anything"
      /* THE GROUND IS PRESSABLE, THE PANEL IS NOT PART OF IT. The
         field's own outside-press listener already closes its answer
         list; this closes the panel, and only when the press really
         landed on the ground. */
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      /* TAB OUT AND IT GOES. `focusout` carries where the keyboard
         WENT; a null there is the whole window losing focus — the
         person alt-tabbed away, not out of this — and putting the
         panel away for that would lose a half-typed query to a
         notification. Only a real element outside this counts.

         AND NEVER THE THING THAT OPENED IT, which is not a nicety:
         React runs every effect, its cleanup and the effect again
         on mount in development, so the cleanup above fires once
         while this is still on screen and puts the keyboard back on
         the dock item. Read literally that is focus leaving, and
         this panel closed itself the instant it was opened from the
         dock — measured, not theorised. Focus arriving at the
         control that summoned this is this panel closing; it is
         never somebody walking away from it. */
      onBlur={(e) => {
        const to = e.relatedTarget
        if (!(to instanceof HTMLElement)) return
        if (e.currentTarget.contains(to)) return
        if (to === cameFrom.current) return
        restore.current = false
        onClose()
      }}
      /* AND THE ONE TAB `onBlur` COULD NEVER SEE. This panel is the
         last thing in the document, so a forward Tab out of the last
         control in it has nowhere in the page to go: the browser takes
         the keystroke, `relatedTarget` is null, and the guard above —
         written for the alt-tab case, correctly — swallows it. The
         result was the exact opposite of what this file promises three
         paragraphs up: the panel stayed up, the keyboard was on
         `document.body`, and the NEXT Tab walked the rail underneath a
         scrim the reader could not dismiss because they were no longer
         standing in it. Measured: open with Ctrl+K, press Tab once,
         scrim still present, activeElement BODY.

         So the forward edge is handled here rather than left to a
         `focusout` that cannot fire. Tab still means LEAVE — it closes
         the panel — and the keyboard goes back to whatever opened it,
         which is where the next Tab should carry on from. Shift+Tab is
         untouched: backwards there IS a real element behind this, so
         `onBlur` sees it and does its job. */
      onKeyDown={(e) => {
        if (e.key !== 'Tab' || e.shiftKey || e.defaultPrevented) return
        const within = e.currentTarget.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        )
        const last = within[within.length - 1]
        if (!last || document.activeElement !== last) return
        e.preventDefault()
        onClose()
      }}
    >
      {/* NOTHING UNDER THE FIELD. A sentence here was drawn and then
          covered: the answer list is positioned against the field and
          hangs directly beneath it, so anything else in this box is
          behind the popover the moment somebody types. The field
          already says what it searches, in its own empty state. */}
      <div className="fx-panel">
        <SearchField autoFocus onReveal={onReveal} />
      </div>
    </div>
  )
}
