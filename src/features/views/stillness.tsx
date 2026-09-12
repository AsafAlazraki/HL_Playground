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
   THE PHYSICS AND THE CAMERA MOVED TO `src/ui/motion.ts`.

   They are data, not React, and everything above this line is a
   provider and a context. Splitting them means the numbers are
   reachable from code that has no business importing a React
   module — and it is one step of the `src/lib` rule applied here:
   a file that holds no hooks should not need a renderer.

   They are RE-EXPORTED rather than relocated-and-repointed so the
   fourteen files importing `SPRING` and `transitionFor` from this
   path kept working in the same commit. New code imports from
   `@/ui/motion`; this line goes when the last old consumer does.
   ============================================================ */

export {
  SPRING,
  SPRING_QUICK,
  SPRING_SLOW,
  SPRING_GRABBED,
  INSTANT,
  transitionFor,
  CAM_MS,
  CAM_FIT_MS,
  cameraMs,
} from '@/ui/motion'
