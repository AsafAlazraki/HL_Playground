/* ============================================================
   PRESSING THE DOOR TO THE PREPARED SET, now that the set is a
   fetch.

   TWO SURFACES OFFER IT — Home's first screen and the invitation on
   the sheet — and both used to be one line: `onClick={() =>
   loadDemoSet(real)}`, synchronous, done before the next frame. It
   is not synchronous any more (`demos/seedChunk.ts`), so each of
   them now has three states to draw and a rejection to report, and
   two copies of that is two chances to get it different.

   SO IT IS ONE HOOK, AND IT DOES FOUR THINGS:

   1. IT SAYS WHAT IS HAPPENING. `phase` drives the words
      (`startingPointWords`) and `aria-busy`, so the press is
      visible in the same frame it happened in — the fetch is what
      takes time, not the reaction to the press.
   2. IT REFUSES TO BE PRESSED TWICE. A second press during the
      fetch would be a second `replaceProject` racing the first.
   3. IT REPORTS A FAILURE WHERE IT HAPPENED rather than swallowing
      it, and stays pressable so pressing again is the retry.
   4. IT WARMS THE CHUNK ON INTENT — pointer on the door, or focus
      on it — so on most presses there is nothing left to wait for.
      This is not a prefetch on load: that would charge the file to
      exactly the visitor the split exists to spare. A pointer that
      has arrived on the one control that loads the price file is
      the earliest honest evidence that somebody wants it.

   PRESS ON POINTER-DOWN IS NOT THIS. DESIGN_PRINCIPLES §8 is about
   the visual press state, which the stylesheet owns on `:active`.
   The load itself stays on `click`, because pointer-down is not a
   decision and this one replaces the sheet.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DemoSet } from '@/demos'
import { loadDemoSet, type LoadPhase } from './demoLoad'

export interface DemoLoad {
  /** what the door should be saying and whether it is busy */
  phase: LoadPhase
  /** the press. Safe to call again after a failure; ignored while a
   *  load is already in flight. */
  press: (demo: DemoSet) => void
  /** the pointer or the focus arriving on the door */
  warm: (demo: DemoSet) => void
}

export function useDemoLoad(): DemoLoad {
  const [phase, setPhase] = useState<LoadPhase>('idle')
  /* the door unmounts the moment the set lands — the sheet is not
     empty any more, so the screen that drew it is gone */
  const alive = useRef(true)
  /* read in the press handler rather than through `phase`, so a
     double press in one frame cannot beat the state update */
  const busy = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const press = useCallback((demo: DemoSet) => {
    if (busy.current) return
    busy.current = true
    setPhase('loading')
    void loadDemoSet(demo).then(
      () => {
        busy.current = false
        if (alive.current) setPhase('idle')
      },
      () => {
        busy.current = false
        if (alive.current) setPhase('failed')
      },
    )
  }, [])

  const warm = useCallback((demo: DemoSet) => {
    demo.warm?.()
  }, [])

  return { phase, press, warm }
}
