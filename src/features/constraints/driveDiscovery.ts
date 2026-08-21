/* ============================================================
   ONE WAY TO DRIVE THE DISCOVERY ENGINE, SHARED BY EVERY SURFACE
   THAT DRIVES IT.

   THE ARGUMENT FOR THE ENGINE'S GENERATOR IS IN `useDiscovery.ts`
   and is not repeated here: the engine is pure and synchronous, a
   worker would cost more in structured-cloning than the measurement
   costs, and what it needs is somewhere to stop. It has thirty-three
   of them, and this is the thing that stops at them.

   IT IS ITS OWN FILE BECAUSE THERE ARE NOW TWO CALLERS. `useDiscovery`
   measures the whole price file for the Business rules page;
   `useBinding` measures ONE relationship for the rule builder's third
   door. A second copy of this pump would be a second set of decisions
   about when the browser gets the thread back, and the day they
   diverged one surface would drop keystrokes and the other would not.

   Pure. No React, no store.
   ============================================================ */

import type { DiscoveryProgress, DiscoveryReport } from './discover'

/** A step under this many milliseconds leaves room for another
 *  inside the same idle period. Half a frame at 60Hz, so even two of
 *  them cannot cost a frame. */
export const CHEAP_MS = 8

export type Cancel = () => void

export function schedule(fn: () => void): Cancel {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    /* the timeout is a floor, not a target: an app that never goes
       idle would otherwise never measure anything */
    const id = window.requestIdleCallback(fn, { timeout: 300 })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 0)
  return () => clearTimeout(id)
}

export type DiscoveryRun = Generator<DiscoveryProgress, DiscoveryReport, void>

/**
 * Drive one run to completion across idle callbacks, and hand back
 * the way to stop it.
 *
 * ONE STEP PER CALLBACK, NOT A DEADLINE LOOP. A step is ATOMIC — the
 * generator cannot be interrupted inside one — and the longest is
 * ~165 ms, so a loop that kept going "while there is time left"
 * would routinely overshoot its own deadline by ten frames. Each
 * callback runs a single step and yields the thread back, unless the
 * step it just ran was cheap (the engine reports what each step cost
 * on `progress.ms`, for exactly this decision), in which case another
 * one is affordable inside the same idle period.
 *
 * `alive` is asked before every callback, so a caller can cancel by
 * unmounting, by starting another run, or by changing its mind, and
 * nothing keeps pumping behind it.
 */
export function drive(
  run: DiscoveryRun,
  alive: () => boolean,
  onStep: (p: DiscoveryProgress) => void,
  onDone: (r: DiscoveryReport) => void,
): Cancel {
  let cancel: Cancel | null = null

  const pump = (): void => {
    if (!alive()) return
    for (;;) {
      const step = run.next()
      if (step.done) {
        cancel = null
        onDone(step.value)
        return
      }
      onStep(step.value)
      /* CHEAP STEPS TRAVEL TOGETHER, expensive ones do not. */
      if (step.value.ms > CHEAP_MS) break
    }
    cancel = schedule(pump)
  }

  cancel = schedule(pump)
  return () => {
    cancel?.()
    cancel = null
  }
}
