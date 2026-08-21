/* ============================================================
   DRIVING THE DISCOVERY ENGINE WITHOUT DROPPING A FRAME.

   THE CONSTRAINT, MEASURED. The engine reads 53 tables and 11,116
   rows and makes 770,929 comparisons; on the real seed the whole run
   is about three seconds in a test process and the longest single
   step about 165 ms. Called straight, from a render or a click, that
   is three seconds of dead keyboard — and this app is made of
   editable grids, so a dead keyboard is a lost word.

   SO IT IS DRIVEN ONE STEP PER IDLE CALLBACK. `discoverSteps` is a
   generator that yields once per unit of work precisely so a caller
   can do this, and its own header says which caller it means: "a
   caller can drive it from an idle callback or a worker". This is
   the idle callback.

   WHY NOT A WORKER, and it is a fair question: a worker would have
   to be handed the project, and structured-cloning 11,116 rows to
   another thread costs more than the measurement does. The engine is
   pure and synchronous by design; what it needs is somewhere to
   stop, and it has thirty-three of them.

   WHY ONE STEP PER CALLBACK RATHER THAN A DEADLINE LOOP. A step is
   ATOMIC — the generator cannot be interrupted inside one — and the
   longest is ~165 ms, so a loop that keeps going "while there is
   time left" would routinely overshoot its own deadline by ten
   frames. Instead each callback runs a single step and yields the
   thread back, unless the step it just ran was cheap (the engine
   reports what each step cost, on `progress.ms`, for exactly this
   decision), in which case another one is affordable inside the same
   idle period. The browser gets a chance to paint, scroll and take a
   keystroke between every unit of work.

   IT NEVER RUNS ITSELF TWICE. A run in flight is cancelled before a
   new one starts, and the effect cancels on unmount, so navigating
   away mid-run leaves nothing pumping.

   WHAT IT DOES NOT DO: re-run when the data changes. It marks the
   report STALE and says so, because a measurement that silently
   replaces itself while somebody is reading it is worse than one
   that is honestly out of date. `run()` is the way to refresh it and
   it is on the action bar.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { discoverSteps } from './discover'
import type { DiscoveryProgress, DiscoveryReport, DiscoveryProject } from './discover'

export type DiscoveryPhase = 'idle' | 'working' | 'done'

export interface DiscoveryState {
  phase: DiscoveryPhase
  /** the last step finished, while working */
  progress: DiscoveryProgress | null
  report: DiscoveryReport | null
  /** the sheet has changed since this report was measured */
  stale: boolean
  /** how much of the run is done, 0–1, for a determinate bar */
  share: number
  run: () => void
}

/** A step under this many milliseconds leaves room for another
 *  inside the same idle period. Half a frame at 60Hz, so even two of
 *  them cannot cost a frame. */
const CHEAP_MS = 8

type Cancel = () => void

function schedule(fn: () => void): Cancel {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    /* the timeout is a floor, not a target: an app that never goes
       idle would otherwise never measure anything */
    const id = window.requestIdleCallback(fn, { timeout: 300 })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 0)
  return () => clearTimeout(id)
}

/**
 * Run the engine over the loaded project, off the render path.
 *
 * `autoStart` runs it once when the surface first appears with data
 * on it — the page's whole argument is "point it at your price file
 * and it tells you", and a person who has to press a button to find
 * that out has already read the empty version of the page.
 */
export function useDiscovery(autoStart = true): DiscoveryState {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const project = useMemo<DiscoveryProject>(
    () => ({ entities, rowsByEntity }),
    [entities, rowsByEntity],
  )

  const [phase, setPhase] = useState<DiscoveryPhase>('idle')
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null)
  const [report, setReport] = useState<DiscoveryReport | null>(null)
  /* what the last completed report was measured over, by identity —
     a changed project object is a changed sheet */
  const measured = useRef<DiscoveryProject | null>(null)

  const gen = useRef<ReturnType<typeof discoverSteps> | null>(null)
  const cancel = useRef<Cancel | null>(null)
  const alive = useRef(true)

  const stop = useCallback(() => {
    cancel.current?.()
    cancel.current = null
    gen.current = null
  }, [])

  const run = useCallback(() => {
    stop()
    const it = discoverSteps(project)
    gen.current = it
    setPhase('working')
    setProgress(null)

    const pump = (): void => {
      if (!alive.current || gen.current !== it) return
      for (;;) {
        const step = it.next()
        if (step.done) {
          measured.current = project
          setReport(step.value)
          setProgress(null)
          setPhase('done')
          gen.current = null
          cancel.current = null
          return
        }
        setProgress(step.value)
        /* CHEAP STEPS TRAVEL TOGETHER, expensive ones do not. */
        if (step.value.ms > CHEAP_MS) break
      }
      cancel.current = schedule(pump)
    }

    cancel.current = schedule(pump)
  }, [project, stop])

  /* THE LIFETIME, ON ITS OWN. `stop` takes no dependencies, so this
     effect runs once: a run in flight is never cancelled by a
     re-render, only by unmount or by another run starting. Clearing
     `started` on the way out is what makes a StrictMode remount
     measure again rather than sit at 'idle' forever. */
  const started = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      started.current = false
      stop()
    }
  }, [stop])

  /* One run when the surface first has something to measure, and
     never a second one behind somebody's back. */
  useEffect(() => {
    if (!autoStart || started.current) return
    if (Object.keys(entities).length === 0) return
    started.current = true
    run()
  }, [autoStart, entities, run])

  const stale = report !== null && measured.current !== project

  const share = progress && progress.total > 0 ? progress.done / progress.total : 0

  return { phase, progress, report, stale, share, run }
}
