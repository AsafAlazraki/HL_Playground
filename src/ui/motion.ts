/* ============================================================
   THE MOTION LAYER — the physics, the durations, and the
   orchestration. No React in this file.

   It was inside `features/views/stillness.tsx`, which is a React
   module holding a provider and a context. The numbers are not
   React: they are data, and every one of them is read by code
   that has nothing to do with the view page. `stillness.tsx` now
   imports them from here and re-exports them, so its fourteen
   consumers did not have to move.

   `docs/specs/DESIGN_SYSTEM.md` §6 is the governing document, and
   the first line of it is the one that matters most: NEVER INVENT
   A CURVE OR A DURATION. `cubic-bezier(0.4, 0, 0.2, 1)` looks
   familiar and is not one of ours.
   ============================================================ */

import type { Transition } from 'motion/react'

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
   throws anything yet: every one of these animations is the answer
   to a button press or to a list changing under a store write, and
   overshoot on a menu that merely faded in feels wrong.

   THE THREE ARE SEPARATED BY RESPONSE, NOT BY FEEL. 220 / 300 / 400
   is roughly a 1.36 ratio per step — far enough apart to be a
   decision, close enough that the app still reads as one object.
   The frequency table picks between them: the thing you see
   constantly gets QUICK, the thing you see occasionally gets the
   default, the big surface that moves rarely gets SLOW.
   ============================================================ */

/** ζ 1.000 · response 300ms. The default: anything summoned by a
 *  press. apple-design §4's drawer row without the bounce, because
 *  these drawers are opened by a button and never by a drag. */
export const SPRING: Transition = { type: 'spring', stiffness: 439, damping: 41.9, mass: 1 }

/** ζ 0.999 · response 220ms. For what a person sees dozens of times
 *  an hour — rows entering and leaving a list. At that frequency the
 *  instruction is "remove or drastically reduce", and 220ms is the
 *  reduction that keeps a list from flickering items in and out with
 *  no transition at all. */
export const SPRING_QUICK: Transition = { type: 'spring', stiffness: 816, damping: 57.1, mass: 1 }

/** ζ 0.999 · response 400ms. apple-design §4's move/reposition row
 *  (damping 1.0, response 0.4) exactly. For a large surface arriving
 *  — a whole block card — where a quick settle reads as a snap. */
export const SPRING_SLOW: Transition = { type: 'spring', stiffness: 247, damping: 31.4, mass: 1 }

/** ζ 0.80 · response 300ms. THE ONLY ONE THAT OVERSHOOTS, and it is
 *  reserved for a surface a person GRABBED — a sheet thrown closed,
 *  a card flicked away. apple-design §4's drawer row as published
 *  (damping 0.8, response 0.3). Using it on anything a button
 *  opened is the mistake the rest of this block exists to prevent:
 *  ζ 0.8 gives about 1.5% overshoot, which reads as life on a
 *  gesture and as a wobble on a menu. */
export const SPRING_GRABBED: Transition = {
  type: 'spring',
  stiffness: 439,
  damping: 33.5,
  mass: 1,
}

/** What a spring becomes when the page must not move. */
export const INSTANT: Transition = { duration: 0 }

export const transitionFor = (still: boolean, spring: Transition = SPRING): Transition =>
  still ? INSTANT : spring

/* ============================================================
   DURATIONS — the same numbers `system.css` declares, in the one
   form JavaScript can read.

   They are duplicated rather than read back with
   getComputedStyle, and that is a real trade: a number in two
   places can drift. The alternative is a layout read on every
   animation, which is a synchronous style recalculation in the
   hot path of the thing that is supposed to feel fast. The
   duplication is guarded instead — `motion.test.ts` parses
   system.css and fails if the two disagree.
   ============================================================ */

export const D_PRESS = 120
export const D_FAST = 160
export const D_MED = 200
export const D_SLOW = 260
export const D_SHEET = 320
export const D_SCENE = 620

/** EXIT IS FASTER THAN ENTER. A thing leaving has already been
 *  decided about; making the person wait for it is making them wait
 *  for an answer they have given. */
export const D_EXIT = 140

/* ============================================================
   ORCHESTRATION.

   THE STAGGER IS 40ms. The published band is 30-80ms; 40 is one
   frame at 24fps, which reads as deliberate rather than laggy and
   keeps a seven-item list under a quarter-second end to end.

   IT RUNS ONCE. A stagger that replays every time a list re-renders
   is the "nothing moves while the user is working" rule broken by
   the component that was supposed to feel alive.
   ============================================================ */

export const STAGGER_MS = 40

/** The delay for the i-th item of a staggered entrance, in seconds
 *  because that is what `motion` takes. Capped: past about ten items
 *  a stagger stops reading as choreography and starts reading as the
 *  page being slow, so everything after the cap arrives together. */
export function stagger(index: number, cap = 10): number {
  return (Math.min(index, cap) * STAGGER_MS) / 1000
}

/** The same thing for CSS, which wants a string and a `--i`. Set it
 *  on the host and let `animation-delay: calc(var(--stagger) * var(--i))`
 *  do the arithmetic in the engine rather than in React. */
export const staggerVar = (index: number, cap = 10): Record<string, number> => ({
  '--i': Math.min(index, cap),
})

/* ============================================================
   THE CAMERA — two durations, and both of them ask first.

   A viewport move is not like the animations above: it translates
   EVERYTHING on the blueprint at once, which is the full-viewport
   vestibular case apple-design §14 names by name.

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

/* ============================================================
   THE ENTRANCE — one shape, so every arriving surface agrees.

   NEVER `scale(0)`. Nothing in the real world disappears and
   reappears completely; a thing that shrinks to nothing reads as a
   glitch rather than a departure. 0.96 plus opacity is the floor,
   and even a barely-visible initial scale makes the entrance feel
   like an object rather than a repaint.

   TRANSFORM AND OPACITY ONLY. Both are compositor properties;
   width, height, margin and top are not, and animating them puts
   layout in the frame budget of the one thing that must not miss.
   ============================================================ */

export const RISE = 12

export const enter = {
  initial: { opacity: 0, transform: `translateY(${RISE}px) scale(0.96)` },
  animate: { opacity: 1, transform: 'translateY(0px) scale(1)' },
  exit: { opacity: 0, transform: `translateY(${Math.round(RISE / 2)}px) scale(0.98)` },
}

/** THE SHORTHAND TRAP, stated where somebody will hit it.
 *
 *  `motion`'s `x`, `y` and `scale` props are NOT hardware
 *  accelerated — they run through `requestAnimationFrame` on the
 *  main thread, and under load they drop frames while the full
 *  `transform` string does not. Every animation in this file writes
 *  `transform` for that reason, and a review that "simplifies" one
 *  back to `y: 12` is a regression that will not show up until the
 *  machine is busy. */
export const TRANSFORM_ONLY = true
