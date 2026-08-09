/* ============================================================
   STILLNESS — the rule that makes the motion tolerable.

   ART_DIRECTION.md: "Nothing moves while the user is working."
   One orchestrated moment (blocks arriving, a row leaving, the
   handles appearing) and then absolute quiet. The moment a caret
   is in a search box every animation on this page is switched
   off — nothing may reflow under a person who is typing.

   `prefers-reduced-motion` cuts all of it, permanently.
   ============================================================ */

import { createContext, useContext, useMemo, useRef, useState } from 'react'
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

export function StillnessProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const [typing, setTyping] = useState(false)
  const depth = useRef(0)

  const value = useMemo<Stillness>(
    () => ({
      still: Boolean(reduced) || typing,
      beginTyping: () => {
        depth.current += 1
        setTyping(true)
      },
      endTyping: () => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setTyping(false)
      },
    }),
    [reduced, typing],
  )

  return <StillnessCtx.Provider value={value}>{children}</StillnessCtx.Provider>
}

export const useStillness = (): Stillness => useContext(StillnessCtx)

/* -- the physics -------------------------------------------- */

/** Things arrive with weight and settle. Springs, never easing curves. */
export const SPRING: Transition = { type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 220, damping: 30, mass: 1 }
/** What a spring becomes when the page must not move. */
export const INSTANT: Transition = { duration: 0 }

export const transitionFor = (still: boolean, spring: Transition = SPRING): Transition =>
  still ? INSTANT : spring
