/* ============================================================
   MEASURING ONE PAIR, WITHOUT LOSING A KEYSTROKE.

   THE CONSTRAINT, MEASURED. A whole-file run reads 53 tables and
   11,116 rows and makes 770,929 comparisons; on the real seed it is
   about 0.9 s. This surface has already been told which two things
   it is about, so seven of the eight relationships and three of the
   five shapes are work whose answer is thrown away. Bounded to the
   named relationship and the two shapes that bind a catalogue, the
   same engine answers in about 50 ms on the same seed — measured, in
   `relate.test.ts`, against a full run it must agree with candidate
   for candidate.

   IT IS STILL NOT RUN ON THE RENDER PATH. Fifty milliseconds is
   three dropped frames, and this app is made of editable grids —
   the builder's own reason field is one — so it goes through
   `driveDiscovery.drive` exactly like the whole-file run, one step
   per idle callback, and the surface says it is working while it
   works.

   IT NEVER RUNS TWICE FOR ONE PAIR. The run is keyed on the pair and
   on the project's identity; picking the same pair again reads the
   report that is already there, and picking a different one cancels
   whatever is in flight before starting. Unmounting cancels.

   IT MEASURES NOTHING ITSELF. Every figure comes back on a
   `DiscoveryReport` from `discover.ts`.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { discoverSteps } from './discover'
import type { DiscoveryProgress, DiscoveryProject, DiscoveryReport } from './discover'
import { drive, type Cancel } from './driveDiscovery'
import { BINDING_SHAPES, type RelatablePair } from './relate'

export type BindingPhase = 'idle' | 'working' | 'done'

export interface BindingState {
  phase: BindingPhase
  /** the last step finished, while working */
  progress: DiscoveryProgress | null
  report: DiscoveryReport | null
  /** how much of the run is done, 0–1 */
  share: number
}

/** EVERY BINDING THE ENGINE FINDS, NOT THE TOP TWELVE. The default
 *  cap exists so a whole-file report stays readable across five
 *  shapes and eight relationships; this list is one relationship's
 *  worth and the surface bands it, so capping here would hide the
 *  floors — which are the half of the list that teaches the lesson.
 *  The number is a ceiling on nonsense, not a shortlist. */
const MAX_PER_SHAPE = 200

export function useBinding(pair: RelatablePair | null): BindingState {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const project = useMemo<DiscoveryProject>(
    () => ({ entities, rowsByEntity }),
    [entities, rowsByEntity],
  )

  const [phase, setPhase] = useState<BindingPhase>('idle')
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null)
  const [report, setReport] = useState<DiscoveryReport | null>(null)

  const alive = useRef(true)
  const cancel = useRef<Cancel | null>(null)
  /* what is in flight, by identity — the pump asks for it before
     every callback, so a run whose pair has changed stops itself */
  const token = useRef<object | null>(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      cancel.current?.()
      cancel.current = null
      token.current = null
    }
  }, [])

  const key = pair?.relationshipKey ?? null

  useEffect(() => {
    cancel.current?.()
    cancel.current = null

    if (key === null) {
      token.current = null
      setPhase('idle')
      setProgress(null)
      setReport(null)
      return
    }

    const mine = {}
    token.current = mine
    setPhase('working')
    setProgress(null)
    setReport(null)

    const run = discoverSteps(project, {
      relationships: [key],
      shapes: BINDING_SHAPES,
      maxPerShape: MAX_PER_SHAPE,
    })

    cancel.current = drive(
      run,
      () => alive.current && token.current === mine,
      setProgress,
      (finished) => {
        if (token.current !== mine) return
        setReport(finished)
        setProgress(null)
        setPhase('done')
        cancel.current = null
      },
    )

    return () => {
      cancel.current?.()
      cancel.current = null
    }
  }, [key, project])

  const share = progress && progress.total > 0 ? progress.done / progress.total : 0

  return { phase, progress, report, share }
}
