/* ============================================================
   WHAT THE YIELDING TAB SAYS — the whole visible half of the guard.

   THE RULE THIS ANSWERS is DESIGN_PRINCIPLES 10: anything that
   cannot be done says WHY, where it is. A tab that has quietly gone
   read-only is the purest form of the failure that rule exists for —
   every control still looks live, every keystroke still lands in the
   grid, and nothing is kept. So the sentence is on screen for as
   long as the condition is, and it counts what has been declined.

   NOT A DIALOG, AND THAT IS A DECISION RATHER THAN A PREFERENCE.
   The tab is still worth having open: the sheet is all there, it can
   be read, searched and scrolled, and a person comparing two boats
   across two tabs is doing something perfectly sensible. A modal
   would take that away to tell them about it. Same reasoning as
   §7 of the design contract — a confirm sheet is a full stop in the
   middle of somebody's work, and nothing here is irreversible.

   WHERE IT SITS, AND WHY THERE. Bottom LEFT, above the dock's
   reserved 78px strip. The three corners are already spoken for:
   the freshness notice is bottom right, the toast stack is bottom
   centre, and top centre covers the page a person just opened —
   which `io.css` records as a mistake it already made. The fourth
   corner was free and is the one furthest from anything a pointer
   travels to.

   IT NEVER GUESSES. Nothing here is drawn while the election is
   still running, so a tab that is about to lead does not flash a
   sentence saying another tab has the sheet. And a browser with no
   BroadcastChannel draws nothing at all: "your browser lacks an API"
   is not something a person can act on, and the app behaves exactly
   as it did before this feature existed.
   ============================================================ */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { FALLBACK_FLOOR, floorAbove } from '@/lib/noteFloor'
import type { ReactElement } from 'react'
import { useTabSession } from './useTabSession'
import './session.css'

export function TabGuard(): ReactElement | null {
  const { role, tookOver, refused, coordinated, acknowledge } = useTabSession()

  /* THE FLOOR IS MEASURED, NOT CHOSEN — see src/lib/noteFloor.ts.
     This note used to sit at a fixed `bottom: 96px`, which cleared the
     dock and was then covered by the action bar when that arrived
     between them, taking its search field with it. It now floors
     itself above everything that has declared `[data-note-clear]`,
     the same way the undo note does, so the next instrument to park
     over a page costs one attribute and no arithmetic here. */
  const standing = coordinated && role !== 'electing' && (role === 'following' || tookOver)
  const [floor, setFloor] = useState(0)
  const remeasure = useCallback(() => setFloor(floorAbove()), [])
  useLayoutEffect(() => {
    if (standing) remeasure()
  }, [standing, remeasure])
  useEffect(() => {
    if (!standing) return
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [standing, remeasure])
  const lift = { bottom: `${floor > 0 ? floor + 16 : FALLBACK_FLOOR + 16}px` }

  /* no referee, or the referee has not answered yet */
  if (!coordinated || role === 'electing') return null

  if (role === 'following') {
    return (
      <div className="ts-note" style={lift} role="status" aria-live="polite">
        <span className="ts-eyebrow">Another tab</span>
        <p className="ts-say">
          This sheet is already open in another tab, and only one tab at a time
          can save it. That one has it. This one shows you the sheet and changes
          nothing in it.
        </p>
        <p className="ts-do">
          Carry on in the other tab. Close it and this one takes the sheet over
          by itself — there is nothing to refresh.
        </p>
        {refused > 0 ? (
          <p className="ts-refused">
            <b className="ts-count">{refused}</b>{' '}
            {refused === 1 ? 'change made' : 'changes made'} here since then{' '}
            {refused === 1 ? 'was' : 'were'} not kept.
          </p>
        ) : null}
      </div>
    )
  }

  /* leading. There is only one thing to say, and only once. */
  if (!tookOver) return null

  return (
    <div className="ts-note" style={lift} role="status" aria-live="polite">
      <span className="ts-eyebrow">This tab</span>
      <p className="ts-say">
        The other tab let the sheet go, so this one has it now and is saving
        again. It read the saved sheet back in first, so what is on screen is
        what was last written.
      </p>
      <div className="ts-acts">
        <button type="button" className="ts-act" onClick={acknowledge}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
