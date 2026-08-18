/* ============================================================
   TWO TABS, IN ONE PROCESS.

   The whole point of `writeLock.ts` taking a `LockPort` rather than
   reaching for `BroadcastChannel` is this file: two endpoints on one
   bus reproduce two tabs exactly, and every case that matters can be
   driven and asserted rather than clicked at.

   THE FIVE CASES, and each of them is a way the original bug shows
   up in real life:

     1 · one tab alone            → it leads, and nothing is held
     2 · a second tab opens       → it follows, and the first is
                                    never told anything at all
     3 · the first tab CLOSES     → the second takes over, and it
                                    knows it TOOK OVER rather than
                                    merely having the lock
     4 · the first tab is KILLED  → the second takes over anyway,
                                    on the probe, with no release
                                    ever having been sent
     5 · two tabs open together   → exactly one leads, both agree
                                    which, and the loser steps down
                                    without another round trip

   THE BUS IS SYNCHRONOUS AND THE TIMERS ARE FAKE, so every
   assertion is about the protocol and none is about how fast a
   machine happens to be. `writeLock` never touches a real clock
   except through the `now` it is handed.

   AND THE REAL CHANNEL IS EXERCISED TOO, at the bottom, because a
   protocol that only works over a fake bus is a protocol that has
   not been tested. Node ships `BroadcastChannel`, and two instances
   of one named channel in one process behave the way two tabs do:
   each receives the other's messages and neither receives its own.
   ============================================================ */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { WriteLock, claimWins } from './writeLock'
import type { LockMessage, LockPort, LockReading } from './writeLock'
import { LOCK_CHANNEL, broadcastPort, canCoordinateTabs } from './port'

/* ---------------------------------------------------------- */
/* A bus, and endpoints on it                                  */
/* ---------------------------------------------------------- */

class Bus {
  readonly ports = new Set<LockPort>()
  /** every message that has crossed it, for asserting on quiet */
  readonly sent: LockMessage[] = []

  endpoint(): LockPort {
    const port: LockPort = {
      receive: null,
      post: (msg) => {
        this.sent.push(msg)
        /* A CHANNEL DOES NOT ECHO TO ITS SENDER. Modelling that is
           the difference between testing the protocol and testing a
           tab arguing with itself. */
        for (const other of this.ports) {
          if (other !== port) other.receive?.(msg)
        }
      },
      close: () => {
        this.ports.delete(port)
      },
    }
    this.ports.add(port)
    return port
  }
}

const TIMINGS = { claimAfterMs: 100, probeEveryMs: 200, missAfterMs: 700 }

/** A tab: its lock, and every reading it has ever reported. */
function tab(bus: Bus, id: string, now: () => number) {
  const seen: LockReading[] = []
  const port = bus.endpoint()
  const lock = new WriteLock({
    port,
    id,
    now,
    timings: TIMINGS,
    onChange: (r) => seen.push(r),
  })
  return {
    lock,
    seen,
    /** pulled off the bus without a `drop`, the way a killed tab goes */
    kill: () => bus.ports.delete(port),
    get role() {
      return lock.reading().role
    },
    get claims() {
      return lock.reading().claims
    },
    get inherited() {
      return lock.reading().inherited
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
})

/* ---------------------------------------------------------- */

describe('one tab on its own', () => {
  it('leads once nobody has answered, and holds nothing back', () => {
    vi.useFakeTimers()
    const bus = new Bus()
    const a = tab(bus, 'a', () => Date.now())

    a.lock.start()
    expect(a.role, 'it must not claim before it has asked').toBe('electing')

    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    expect(a.role).toBe('leading')
    expect(a.claims).toBe(1)

    /* THE HOLDER IS QUIET. Nothing on the wire after the claim, for
       as long as it likes — the traffic is on the follower's side,
       and in the common case there is no follower. */
    const after = bus.sent.length
    vi.advanceTimersByTime(TIMINGS.probeEveryMs * 10)
    expect(bus.sent.length, 'the holder must not heartbeat').toBe(after)

    a.lock.stop()
  })
})

describe('a second tab opens on a sheet that is already open', () => {
  it('yields in one round trip, and the first tab never changes', () => {
    vi.useFakeTimers()
    const bus = new Bus()
    const a = tab(bus, 'a', () => Date.now())
    a.lock.start()
    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    const aSaw = a.seen.length

    const b = tab(bus, 'b', () => Date.now())
    b.lock.start()

    /* NO TIMER RUN. The holder answers the ask synchronously, so the
       second tab knows before its own claim timer is anywhere near
       firing — which is why the election runs with writes ALLOWED. */
    expect(b.role).toBe('following')
    expect(b.lock.reading().heldBy).toBe('a')
    expect(b.claims, 'a following tab has never held it').toBe(0)
    expect(b.inherited).toBe(0)

    expect(a.role, 'the first tab is not interrupted').toBe('leading')
    expect(a.seen.length, 'and is not even told').toBe(aSaw)

    /* and it stays that way */
    vi.advanceTimersByTime(TIMINGS.missAfterMs * 3)
    expect(a.role).toBe('leading')
    expect(b.role).toBe('following')

    a.lock.stop()
    b.lock.stop()
  })
})

describe('the tab that was saving closes', () => {
  it('the other one takes over without a refresh, and knows it took over', () => {
    vi.useFakeTimers()
    const bus = new Bus()
    const a = tab(bus, 'a', () => Date.now())
    a.lock.start()
    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    const b = tab(bus, 'b', () => Date.now())
    b.lock.start()
    expect(b.role).toBe('following')

    a.lock.stop() // the tab is closed: `drop` goes out
    expect(b.role, 'it re-runs the election immediately').toBe('electing')

    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    expect(b.role).toBe('leading')

    /* THE FIELD THE RECOVERY HANGS OFF, and the reason it is not
       `claims`: this tab has claimed the sheet exactly ONCE, and it
       still owes the disk a re-read, because another tab was writing
       to it the whole time it watched. `useTabSession` re-reads
       before it opens the gate. */
    expect(b.claims).toBe(1)
    expect(b.inherited).toBe(1)

    b.lock.stop()
  })
})

describe('the tab that was saving is killed', () => {
  it('the other one takes over on its own probe, with no release sent', () => {
    vi.useFakeTimers()
    const bus = new Bus()
    const a = tab(bus, 'a', () => Date.now())
    a.lock.start()
    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    const b = tab(bus, 'b', () => Date.now())
    b.lock.start()
    expect(b.role).toBe('following')

    /* KILLED, NOT CLOSED: the endpoint stops answering and no `drop`
       is ever posted. A crash, a killed process, a phone discarding
       a background tab. */
    a.kill()

    /* one probe interval is not enough — a single lost message must
       never promote a second writer while the first is still typing */
    vi.advanceTimersByTime(TIMINGS.probeEveryMs + 1)
    expect(b.role).toBe('following')

    /* probes land at 200 · 400 · 600 · 800; the fourth is the first
       one past `missAfterMs` of silence, and it is the one that
       gives up on the tab that is not there */
    vi.advanceTimersByTime(TIMINGS.probeEveryMs * 3)
    expect(b.role).toBe('electing')

    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    expect(b.role).toBe('leading')
    expect(b.inherited, 'a sheet somebody else was writing to').toBe(1)

    b.lock.stop()
  })
})

describe('two tabs opened at the same instant', () => {
  it('settles on exactly one, and both agree which', () => {
    vi.useFakeTimers()
    const bus = new Bus()
    /* the same clock for both, so the claim timestamps tie and the
       tie-break on the id is what has to decide it */
    const clock = () => 1_000
    const a = tab(bus, 'aaa', clock)
    const z = tab(bus, 'zzz', clock)

    a.lock.start()
    z.lock.start()
    expect(a.role).toBe('electing')
    expect(z.role).toBe('electing')

    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)

    const roles = [a.role, z.role]
    expect(roles.filter((r) => r === 'leading')).toHaveLength(1)
    expect(roles.filter((r) => r === 'following')).toHaveLength(1)
    /* the smaller id wins the tie, so the answer is not merely
       consistent — it is the same on every run */
    expect(a.role).toBe('leading')
    expect(z.role).toBe('following')
    expect(z.lock.reading().heldBy).toBe('aaa')

    a.lock.stop()
    z.lock.stop()
  })

  it('breaks the tie by the clock first and the name second', () => {
    /* earlier claim wins whichever way the names fall */
    expect(claimWins(10, 'zzz', 20, 'aaa')).toBe(true)
    expect(claimWins(20, 'aaa', 10, 'zzz')).toBe(false)
    /* and the comparison is total: it never says both, or neither */
    expect(claimWins(10, 'aaa', 10, 'zzz')).toBe(true)
    expect(claimWins(10, 'zzz', 10, 'aaa')).toBe(false)
  })
})

describe('a tab being frozen rather than closed', () => {
  it('gives the sheet up and asks again, so it cannot wake up still holding it', () => {
    vi.useFakeTimers()
    const bus = new Bus()
    const a = tab(bus, 'a', () => Date.now())
    a.lock.start()
    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    const b = tab(bus, 'b', () => Date.now())
    b.lock.start()

    a.lock.yieldAndReelect() // `pagehide`
    expect(a.role).toBe('electing')
    expect(b.role, 'the release is heard as a release').toBe('electing')

    /* both ask again; one of them gets it, and it is one of them */
    vi.advanceTimersByTime(TIMINGS.claimAfterMs + 1)
    const roles = [a.role, b.role]
    expect(roles.filter((r) => r === 'leading')).toHaveLength(1)
    expect(roles.filter((r) => r === 'following')).toHaveLength(1)

    a.lock.stop()
    b.lock.stop()
  })
})

/* ---------------------------------------------------------- */
/* And over the real thing                                     */
/* ---------------------------------------------------------- */

const settle = () => new Promise((r) => setTimeout(r, 30))

describe('over a real BroadcastChannel', () => {
  it.runIf(canCoordinateTabs())(
    'two endpoints on one channel elect one writer',
    async () => {
      const name = `${LOCK_CHANNEL}.test.${Math.random().toString(36).slice(2)}`
      const pa = broadcastPort(name)
      const pb = broadcastPort(name)
      expect(pa).not.toBeNull()
      expect(pb).not.toBeNull()

      const a = new WriteLock({
        port: pa!,
        id: 'a',
        timings: { claimAfterMs: 20, probeEveryMs: 40, missAfterMs: 200 },
      })
      a.start()
      await settle()
      expect(a.reading().role).toBe('leading')

      const b = new WriteLock({
        port: pb!,
        id: 'b',
        timings: { claimAfterMs: 20, probeEveryMs: 40, missAfterMs: 200 },
      })
      b.start()
      await settle()

      expect(b.reading().role).toBe('following')
      expect(b.reading().heldBy).toBe('a')
      expect(a.reading().role, 'the first tab carries on').toBe('leading')

      /* close the first: the second must take over on its own */
      a.stop()
      await settle()
      await settle()
      expect(b.reading().role).toBe('leading')
      expect(b.reading().inherited).toBe(1)

      b.stop()
    },
  )
})
