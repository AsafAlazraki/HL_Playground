/* ============================================================
   STILLNESS — the rule that makes the motion tolerable.

   ART_DIRECTION.md: "Nothing moves while the user is working."
   One orchestrated moment (blocks arriving, a row leaving, the
   handles appearing) and then absolute quiet. The moment a caret
   is in a search box every animation on this page is switched
   off — nothing may reflow under a person who is typing.

   `prefers-reduced-motion` cuts all of it, permanently.

   THIS MODULE IS THE WHOLE APP'S MOTION POLICY, not the view
   page's. `StillnessProvider` is mounted once, at the root, in
   `src/App.tsx`: mounted per-feature it would have covered one
   feature, and a camera walk started on the blueprint while a
   caret sat in a rename box on the same screen would still have
   moved the ground under the typist. Every animation and every
   camera duration in the app goes through `transitionFor(still)`
   or `cameraMs(still)`, so ONE boolean switches all of it off.
   apple-design §14: reduced motion is a property of the person,
   not of a feature.
   ============================================================ */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import type { Transition } from 'motion/react'

export interface Stillness {
  /** true = draw the final state immediately, animate nothing */
  still: boolean
  /** every text input on the page calls these */
  beginTyping: () => void
  endTyping: () => void
}

const StillnessCtx = createContext<Stillness>({
  still: true,
  beginTyping: () => {},
  endTyping: () => {},
})

/** Input types that hold a caret. A checkbox or a colour swatch takes
 *  focus without anything being typed into it, and freezing the whole
 *  app's motion because someone tabbed to a checkbox is not the policy. */
const NOT_TEXT = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

/** Is the caret in something a person types into, right now? */
function isTypingTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName !== 'INPUT') return false
  return !NOT_TEXT.has((el as HTMLInputElement).type)
}

export function StillnessProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  /* THE GATE IS DERIVED FROM FOCUS, NOT COUNTED.

     This used to be a ref-count: `beginTyping` on focus, `endTyping` on
     blur, still = depth > 0. It latched, permanently, and the bug was
     invisible because nothing looked broken — the app simply stopped
     animating and stayed that way.

     React does not fire onBlur when a FOCUSED ELEMENT UNMOUNTS. The
     "Add a row" panel autofocuses its input and is dismissed with
     Escape or its own close control, which unmounts that input while
     it holds the caret. The blur never arrives, `endTyping` never
     runs, the count never returns to zero — and `still` stays true for
     the rest of the session. Every animation in the product dies:
     block cards, rows, the SET UP drawer, the rules pane, toasts, and
     both camera walks. Only a reload clears it.

     It became app-wide the moment the provider was hoisted to the root
     — the same change that made the policy global made the leak
     global. Before that the provider unmounted with the view page and
     reset itself by accident.

     So the count is gone. The DOM already knows whether a caret is in
     a text field and cannot get out of step with itself, so we ask it:
     every focus change recomputes from `document.activeElement`. An
     unmount fires `focusout` like anything else, and even if an event
     were missed entirely the next one repairs the state rather than
     compounding it. A wrong answer lasts until the next focus change
     instead of until a reload. */
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    const sync = (): void => setTyping(isTypingTarget(document.activeElement))
    /* focusout fires BEFORE the next element takes focus, when
       activeElement is still the old node or already body — so the
       read is deferred by a frame and sees where focus actually
       landed. focusin needs no such delay. */
    let queued = 0
    const onOut = (): void => {
      cancelAnimationFrame(queued)
      queued = requestAnimationFrame(sync)
    }
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', onOut)
    return () => {
      cancelAnimationFrame(queued)
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', onOut)
    }
  }, [])

  /* Kept because two call sites wire them to onFocus/onBlur and because
     a future drag may want to force stillness explicitly. They now
     AGREE with the focus listener rather than being the truth: begin
     asserts, end simply re-reads reality. Neither can latch. */
  const value = useMemo<Stillness>(
    () => ({
      still: Boolean(reduced) || typing,
      beginTyping: () => setTyping(true),
      endTyping: () => setTyping(isTypingTarget(document.activeElement)),
    }),
    [reduced, typing],
  )

  return <StillnessCtx.Provider value={value}>{children}</StillnessCtx.Provider>
}

export const useStillness = (): Stillness => useContext(StillnessCtx)

/* ============================================================
   THE PHYSICS — three configs, stated in Apple's two parameters.

   apple-design §4: Apple deliberately replaced the physics triplet
   with DAMPING RATIO (how much it overshoots) and RESPONSE (how
   quickly it reaches the target, in seconds). Motion wants the
   triplet, so the triplet is what is written — but the triplet was
   DERIVED from the two numbers that were actually chosen, and both
   are stated on every line so the next person can check the
   arithmetic rather than take it on faith:

       ζ = c / 2√(k·m)          response = 2π / √(k/m)

   ζ = 1.0 THROUGHOUT, and that is a decision with a reason.
   apple-design §4 reserves bounce for an interaction that CARRIED
   momentum — a flick, a throw, a drag release. Nothing in this app
   throws anything: every one of these animations is the answer to
   a button press or to a list changing under a store write. §4 is
   explicit that overshoot on a menu that merely faded in feels
   wrong, so there is no bounce here until this app grows a gesture
   that earns it.

   THE THREE ARE SEPARATED BY RESPONSE, NOT BY FEEL. 220 / 300 / 400
   is roughly a 1.36 ratio per step — far enough apart to be a
   decision, close enough that the app still reads as one object.
   emil-design-eng's frequency table picks between them: the thing
   you see constantly gets QUICK, the thing you see occasionally
   gets the default, the big surface that moves rarely gets SLOW.

   WHAT WAS DELETED, AND WHY. `SPRING_SOFT` (k 220 / c 30 / m 1) was
   ζ 1.011 — OVER-damped, so it could not even overshoot — with a
   response of 424ms and a 0.5% settle at ~565ms. It was slower than
   the default in both, and it was bound to exactly the three
   animations in this file that drive `height`, the most expensive
   property any of them touch. The two springs were the wrong way
   round: the cheap animations got the quick one and the expensive
   ones got the long one. Nothing replaces it — its three call sites
   take `SPRING`, which is 124ms quicker to the target.
   ============================================================ */

/** ζ 1.000 · response 300ms. The default: anything summoned by a
 *  press. apple-design §4's drawer row without the bounce, because
 *  these drawers are opened by a button and never by a drag. */
export const SPRING: Transition = { type: 'spring', stiffness: 439, damping: 41.9, mass: 1 }

/** ζ 0.999 · response 220ms. For what a person sees dozens of times
 *  an hour — rows entering and leaving a list. emil-design-eng: at
 *  that frequency the instruction is "remove or drastically reduce",
 *  and 220ms is the reduction that keeps the list from flickering
 *  items in and out with no transition at all. */
export const SPRING_QUICK: Transition = { type: 'spring', stiffness: 816, damping: 57.1, mass: 1 }

/** ζ 0.999 · response 400ms. apple-design §4's move/reposition row
 *  (damping 1.0, response 0.4) exactly. For a large surface arriving
 *  — a whole block card — where a quick settle reads as a snap. */
export const SPRING_SLOW: Transition = { type: 'spring', stiffness: 247, damping: 31.4, mass: 1 }

/** What a spring becomes when the page must not move. */
export const INSTANT: Transition = { duration: 0 }

export const transitionFor = (still: boolean, spring: Transition = SPRING): Transition =>
  still ? INSTANT : spring

/* ============================================================
   THE CAMERA — two durations, and both of them ask first.

   A viewport move is not like the animations above: it translates
   EVERYTHING on the blueprint at once, which is the full-viewport
   vestibular case apple-design §14 names by name. Five of the six
   camera moves in this app played at full length regardless of what
   the reader had asked their operating system for, and they did it
   at four different durations for one class of motion.

   Two values, because a bigger move genuinely deserves longer and
   nothing else does:
     CAM_MS      — walking to one object that is already on the sheet
     CAM_FIT_MS  — reframing the whole sheet

   `cameraMs` is the camera's `transitionFor`. It collapses to 0 —
   React Flow then jumps straight to the target, which is the
   "static transition" §14 asks for, not a cancelled navigation —
   under reduced motion AND while a caret is in a text box, because
   a camera that walks off while someone is typing is the same
   offence as a list that reflows under them.
   ============================================================ */

/** Walking to an object. Long enough for the eye to follow the move
 *  and keep its bearings, short enough to be the answer to a press. */
export const CAM_MS = 320

/** Reframing the whole sheet. Longer because the excursion is
 *  larger — the eye is being asked to re-find everything, not to
 *  follow one card. */
export const CAM_FIT_MS = 420

/** The camera's `transitionFor`: the duration, or none of it. */
export const cameraMs = (still: boolean, ms: number = CAM_MS): number => (still ? 0 : ms)
