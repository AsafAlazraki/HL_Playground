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

   ============================================================
   WHAT THIS PASS CHANGED.

   IT SAYS WHAT IT IS BEFORE IT SAYS ANYTHING ELSE. The note opened
   with the caption "Another tab" and then four lines of prose. The
   one word a person needs in the first quarter second is READ-ONLY
   — that is the state they are in, and everything under it is why.
   So the head is a mark, a state and a count, and the prose is
   underneath where prose belongs.

   AND IT CAN BE PUT AWAY WITHOUT BEING SILENCED. The full note is
   400px standing in the corner of a screen somebody may be reading
   all afternoon, and the paragraph is worth reading exactly once.
   It folds to its own head — a lock, "Read-only", and the count of
   what has been declined — which still states the condition and its
   reason permanently, in the place it applies, and reopens in one
   press. Rule 10 asks for the reason on screen, not for four lines
   of it forever; a person who has read it and folded it has been
   told, and a person who has not still sees the state.

   THE COUNT IS THE PART THAT CHANGES, so it is the part that moves.
   Every refused write ticks it, and the figure gives one small
   pulse when it does — the only movement on the card, on the one
   number that is evidence rather than explanation. Under
   `prefers-reduced-motion` the pulse goes and the figure stays.

   NO TAKEOVER BUTTON, DELIBERATELY. "Use this tab instead" is the
   one control this card could grow and must not: the follower's copy
   of the project is from whenever it loaded, and promoting it
   without re-reading the disk writes a stale sheet over everything
   the other tab has done since — the exact loss this whole feature
   exists to prevent (`useTabSession.ts`, rule 2). Closing the other
   tab does it safely, by itself, in under a second, and that is what
   the card says to do.

   WHERE IT SITS, AND WHY THERE. Bottom LEFT, floored above every
   instrument that declares `[data-note-clear]`. The three other
   corners are spoken for: the freshness notice is bottom right, the
   toast stack is bottom centre, and top centre covers the page a
   person just opened — which `io.css` records as a mistake it
   already made.

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

/** A closed padlock at 13px. Hand-drawn, like the arrows and the
 *  drop glyph the io surfaces use: this is 13px chrome furniture,
 *  not iconography — `@/lib/icons` owns the marks that stand for
 *  things a dealer sells. */
function LockMark(): ReactElement {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true" focusable="false">
      <path
        d="M4.1 5.6V4.1a2.4 2.4 0 0 1 4.8 0v1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <rect
        x="2.6"
        y="5.6"
        width="7.8"
        height="5.6"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

/** The takeover note's mark — the same lock, opened. */
function UnlockMark(): ReactElement {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true" focusable="false">
      <path
        d="M4.1 5.6V4.1a2.4 2.4 0 0 1 4.7-.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <rect
        x="2.6"
        y="5.6"
        width="7.8"
        height="5.6"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function Chevron({ up }: { up: boolean }): ReactElement {
  return (
    <svg
      className={`ts-chev${up ? ' is-up' : ''}`}
      width="9"
      height="9"
      viewBox="0 0 9 9"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.2 3.4 4.5 5.7 6.8 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TabGuard(): ReactElement | null {
  const { role, tookOver, refused, coordinated, acknowledge } = useTabSession()
  /* folded is a preference about THIS card in THIS tab, and it is
     deliberately not remembered: a tab that goes read-only again
     tomorrow is telling somebody something new. */
  const [open, setOpen] = useState(true)

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
      <div
        className={`ts-note ts-note--held${open ? ' is-open' : ''}${
          refused > 0 ? ' is-lost' : ''
        }`}
        style={lift}
        role="status"
        aria-live="polite"
      >
        {/* THE HEAD IS THE WHOLE MESSAGE IN ONE LINE, and it is the
            control that folds the rest away. A button, so it has
            hover, press and focus like everything else that can be
            pressed (§4). */}
        <button
          type="button"
          className="ts-head"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="ts-mark" aria-hidden="true">
            <LockMark />
          </span>
          <span className="ts-state">Read-only</span>
          {refused > 0 ? (
            /* KEYED ON THE FIGURE, so a new count is a new element
               and the pulse runs once per refusal rather than on
               every render of the card. */
            <span className="ts-tally" key={refused}>
              <b className="ts-count">{refused}</b>
              <span className="ts-tally-say">
                {refused === 1 ? 'change not kept' : 'changes not kept'}
              </span>
            </span>
          ) : null}
          <span className="ts-fold" aria-hidden="true">
            <Chevron up={open} />
          </span>
        </button>

        {open ? (
          <div className="ts-body">
            <p className="ts-say">
              This sheet is already open in another tab, and only one tab at a time
              can save it. That one has it. This one shows you the sheet and changes
              nothing in it.
            </p>
            <p className="ts-do">
              Carry on in the other tab. Close it and this one takes the sheet over
              by itself — there is nothing to refresh.
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  /* leading. There is only one thing to say, and only once. */
  if (!tookOver) return null

  return (
    <div className="ts-note ts-note--took is-open" style={lift} role="status" aria-live="polite">
      <div className="ts-head ts-head--still">
        <span className="ts-mark ts-mark--ok" aria-hidden="true">
          <UnlockMark />
        </span>
        <span className="ts-state">This tab has the sheet</span>
      </div>
      <div className="ts-body">
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
    </div>
  )
}
