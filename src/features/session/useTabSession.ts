/* ============================================================
   THE WIRING — election ⇄ write gate ⇄ the disk.

   `writeLock.ts` decides who owns the sheet. `writeGate.ts` is the
   boolean the store reads. This is the four things that have to
   happen between them, and each one is a bug if it is missed.

   1 · THE GATE CLOSES ON `following`, AND ON NOTHING ELSE — the
       election itself runs with the gate OPEN, which is a decision
       and not an oversight.

       Closing it while asking looks safer and is not. A tab is told
       it is following in ONE round trip, because the holder answers
       an `ask` the moment it hears it; the 150ms is only the timeout
       for the case where nobody answers, which is the case where
       there is nobody to collide with. So holding through the
       election would buy a round trip of protection against a tab
       that has existed for a round trip — and would cost every
       automatic write the app makes at startup, silently, because
       `App.tsx` seeds the workbook rules the instant the store
       reports loaded. A guard that eats a startup write to defend
       against a collision no person could have caused is the failure
       mode `writeGate.ts` opens with: fail open, always.

   2 · TAKING OVER RE-READS THE DISK, AND DOES IT BEFORE THE GATE
       OPENS. This is the whole correctness of the recovery path. A
       following tab has been watching a sheet another tab was
       editing; its copy in memory is from whenever it loaded. Open
       the gate on that copy and the first thing it saves is the
       stale project, over the top of everything the other tab did —
       the exact loss this feature exists to prevent, arriving by the
       feature's own hand. So `init()` runs first, and only its
       resolution opens the gate.

   3 · IT DOES NOT WAIT FOR A REFRESH. `pagehide` on the leading tab
       posts a release, the follower's next round trip promotes it,
       and `init()` repaints from disk — typically inside a second of
       the other tab closing, with nobody touching anything. The
       follower also probes, so a tab that was killed outright and
       never got to release is recovered from too, just slower.

   4 · NO CHANNEL, NO GUARD. A browser that cannot broadcast leads
       unconditionally and says nothing. That is the behaviour this
       app already had, and a person cannot act on "your browser
       lacks an API" anyway.

   WHY `init()` AND NOT A MERGE. The store is one project; two
   divergent copies of it cannot be reconciled without a per-record
   history the app does not keep. The follower has no edits to lose —
   the gate refused them all — so re-reading the disk loses nothing
   and is the only honest answer.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  allowWrites,
  holdWrites,
  readWriteGate,
  watchWriteGate,
} from '@/lib/writeGate'
import { useProjectStore } from '@/store/useProjectStore'
import { broadcastPort, canCoordinateTabs, newTabId } from './port'
import { WriteLock } from './writeLock'
import type { LockRole } from './writeLock'

export interface TabSession {
  role: LockRole
  /** the sheet can be changed in this tab */
  mayWrite: boolean
  /** this tab inherited the sheet from one that went away, and has
   *  not been told so yet */
  tookOver: boolean
  /** changes declined while another tab holds the sheet */
  refused: number
  /** this browser can tell one tab from another */
  coordinated: boolean
  /** the reader has read the takeover notice */
  acknowledge: () => void
}

export function useTabSession(): TabSession {
  const [role, setRole] = useState<LockRole>('electing')
  /** how many times this tab has claimed a sheet somebody ELSE was
   *  writing to. Not the same as how often it has led — see
   *  `LockReading.inherited`. */
  const [inherited, setInherited] = useState(0)
  /** the highest takeover the reader has been told about */
  const [seen, setSeen] = useState(0)
  const [refused, setRefused] = useState(() => readWriteGate().refused)
  const coordinated = useRef(canCoordinateTabs()).current

  useEffect(() => watchWriteGate((s) => setRefused(s.refused)), [])

  useEffect(() => {
    const port = broadcastPort()
    if (!port) {
      /* nothing to coordinate with — this is yesterday's app */
      allowWrites()
      setRole('leading')
      return
    }

    const lock = new WriteLock({
      port,
      id: newTabId(),
      onChange: (r) => {
        setRole(r.role)
        setInherited(r.inherited)
      },
    })
    lock.start()

    /* `pagehide` and not `beforeunload`: it is the one that fires on
       a mobile browser discarding the page, and the one that fires
       when a page is frozen into the back/forward cache — which is
       why the lock re-runs the election rather than simply stopping.
       `beforeunload` additionally suppresses that cache. */
    const onHide = () => {
      lock.yieldAndReelect()
    }
    window.addEventListener('pagehide', onHide)

    return () => {
      window.removeEventListener('pagehide', onHide)
      lock.stop()
      /* the guard is going away with the component that owns it, and
         a gate nobody can open again is worse than no gate */
      allowWrites()
    }
  }, [])

  useEffect(() => {
    if (role === 'following') {
      holdWrites()
      return
    }
    if (role === 'electing') {
      /* still asking, and asking is not a reason to refuse anything
         — see rule 1 at the head of this file */
      return
    }
    if (inherited === 0) {
      /* opened alone, or thawed alone: what is in memory came off
         this disk and nobody else has touched it */
      allowWrites()
      return
    }
    /* rule 2: the disk first, the gate second */
    let live = true
    void useProjectStore
      .getState()
      .init()
      .catch(() => undefined)
      .finally(() => {
        if (live) allowWrites()
      })
    return () => {
      live = false
    }
  }, [role, inherited])

  const acknowledge = useCallback(() => {
    setSeen(inherited)
  }, [inherited])

  return {
    role,
    mayWrite: role === 'leading',
    tookOver: role === 'leading' && inherited > seen,
    refused,
    coordinated,
    acknowledge,
  }
}
