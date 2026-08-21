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

   WHY ONE STEP PER CALLBACK RATHER THAN A DEADLINE LOOP, and the
   pump itself, are in `driveDiscovery.ts` — shared with `useBinding`,
   which drives the same engine over one relationship for the rule
   builder's third door.

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
import { drive, type Cancel } from './driveDiscovery'

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

    /* THE PUMP IS `driveDiscovery.drive` and it is shared with the
       rule builder's third door — one set of decisions about when
       the browser gets the thread back, in one place. */
    cancel.current = drive(
      it,
      () => alive.current && gen.current === it,
      setProgress,
      (report) => {
        measured.current = project
        setReport(report)
        setProgress(null)
        setPhase('done')
        gen.current = null
        cancel.current = null
      },
    )
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
