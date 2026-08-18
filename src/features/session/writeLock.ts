/* ============================================================
   WHICH TAB OWNS THE SHEET — the election, written as pure logic.

   THE PROBLEM, RESTATED IN ONE LINE: two tabs, one IndexedDB, no
   referee. See `@/lib/writeGate` for what it costs.

   WHAT THIS FILE IS. The referee, and nothing else: no React, no
   Dexie, no `window`, no `BroadcastChannel`. It talks through a
   `LockPort` it is handed and reads the clock it is handed, so the
   whole protocol — two tabs arguing, one going away, one dying
   without saying so — is drivable in a test with two objects in one
   process. `port.ts` supplies the real channel; `useTabSession.ts`
   supplies the wiring.

   THE FOUR RULES, AND WHY EACH ONE IS THE WAY IT IS
   ─────────────────────────────────────────────────────────────
   1 · THE SECOND TAB YIELDS, THE FIRST NEVER NOTICES. A tab opening
       ASKS. A tab that holds the sheet ANSWERS and does nothing
       else — no dialog, no reload, no interruption. Silence for
       `claimAfterMs` means nobody holds it, and the asker takes it.
       The cost of being wrong here is measured in milliseconds of
       read-only at startup; the cost of the other default is
       somebody's afternoon.

   2 · THE HOLDER IS QUIET; THE FOLLOWER PROBES. It would be easier
       for the holder to heartbeat, and it would put a message on the
       channel every second and a half in the overwhelmingly common
       case — ONE tab, nobody listening. So the traffic is on the
       side that needs it: a follower asks again every
       `probeEveryMs`, and if it has heard nothing for `missAfterMs`
       it holds the election again. That is what recovers a tab that
       was killed, crashed, or put to sleep without ever saying it
       was leaving.

   3 · A TIE IS BROKEN BY THE CLOCK, THEN BY THE NAME. Two tabs
       opened together both hear silence and both claim. The earlier
       claim wins; identical claims are broken by comparing the two
       ids. It is total and it is the same answer on both sides, so
       one steps down without a negotiation.

   4 · TAKING OVER IS NOT THE SAME AS HAVING IT. `inherited` counts
       the claims that came after somebody ELSE held the sheet, and
       every one of them owes the disk a re-read before this tab
       writes a word — see `useTabSession.ts`. It is deliberately not
       "this tab has claimed more than once": a tab that opened
       second and watched claims exactly once when it takes over, and
       a tab that was frozen and thawed with nobody else around
       claims twice without anything having changed underneath it.
       Getting this wrong is the original bug wearing a different
       hat, and it is the one thing in this file worth re-reading.

   WHAT IT DELIBERATELY DOES NOT DO. It does not merge, sync or
   replay anything. Two tabs do not collaborate; one of them works
   and the other watches. Live collaboration over IndexedDB is a
   different product, and pretending to do it badly is worse than
   declining to do it at all.
   ============================================================ */

/** Who holds the sheet, from this tab's point of view. */
export type LockRole =
  /** asking, and not yet told — writes are held until this resolves */
  | 'electing'
  /** this tab owns the sheet and may write */
  | 'leading'
  /** another tab owns it; this one is read-only */
  | 'following'

/** The whole wire vocabulary. Three messages, no payload beyond what
 *  the tie-break needs. */
export type LockMessage =
  /** "does anybody hold this?" — sent on open, and by a follower as
   *  its liveness probe */
  | { t: 'ask'; from: string }
  /** "I do, since then." — the only answer, and the claim */
  | { t: 'hold'; from: string; since: number }
  /** "I am going away." — the fast path; correctness does not depend
   *  on it arriving, because rule 2 covers the tab that cannot send
   *  it */
  | { t: 'drop'; from: string }

/**
 * A channel, reduced to what the protocol needs.
 *
 * `receive` is a property rather than an `addListener`, because there
 * is exactly one listener for ever and a set of them would be a
 * lifecycle to get wrong.
 */
export interface LockPort {
  post(msg: LockMessage): void
  close(): void
  receive: ((msg: LockMessage) => void) | null
}

export interface LockTimings {
  /** silence this long and there is nobody to yield to */
  claimAfterMs: number
  /** how often a follower checks the holder is still there */
  probeEveryMs: number
  /** heard nothing for this long, and the holder is presumed gone */
  missAfterMs: number
}

/**
 * The defaults, and the arithmetic behind them.
 *
 * `claimAfterMs` is the read-only window at startup, so it is as
 * short as a same-process channel round trip can be trusted to be.
 * `missAfterMs` is three probes plus a margin: one dropped message
 * must never promote a second tab while the first is still typing,
 * because that is the failure this whole file exists to prevent.
 */
export const DEFAULT_TIMINGS: LockTimings = {
  claimAfterMs: 150,
  probeEveryMs: 1200,
  missAfterMs: 4200,
}

/** What the outside world reads. */
export interface LockReading {
  role: LockRole
  /** the tab that holds the sheet, when it is not this one */
  heldBy: string | null
  /** how many times this tab has held the sheet, for information */
  claims: number
  /**
   * How many of those claims INHERITED a sheet another tab was
   * writing to. This is the field the recovery hangs off, and it is
   * not `claims > 1`: a tab that opened second and watched has
   * claimed exactly once when it takes over, and a tab that was
   * frozen and thawed alone has claimed twice while nobody else ever
   * touched the disk. The question is not how often this tab has led
   * — it is whether anybody else has, since this tab last read.
   */
  inherited: number
}

export interface WriteLockOptions {
  port: LockPort
  /** this tab's name on the channel. Must be unique per tab. */
  id: string
  now?: () => number
  timings?: Partial<LockTimings>
  onChange?: (r: LockReading) => void
}

/**
 * Does the claim described on the right beat the one on the left?
 *
 * Total, and symmetric: whatever this returns for (a, b) it returns
 * the opposite of for (b, a), so both tabs reach the same verdict
 * without exchanging another message.
 */
export function claimWins(
  theirSince: number,
  theirId: string,
  mySince: number,
  myId: string,
): boolean {
  if (theirSince !== mySince) return theirSince < mySince
  return theirId < myId
}

export class WriteLock {
  readonly id: string
  private readonly port: LockPort
  private readonly now: () => number
  private readonly t: LockTimings
  private readonly onChange: ((r: LockReading) => void) | undefined

  private role: LockRole = 'electing'
  private heldBy: string | null = null
  private claims = 0
  private inherited = 0
  /** another tab has held the sheet since this one last did. Cleared
   *  the moment it is banked into `inherited`. */
  private sawHolder = false
  /** when this tab claimed, and the left-hand side of every tie */
  private since = 0
  /** the last time the holder said anything */
  private lastHeard = 0
  private running = false

  private claimTimer: ReturnType<typeof setTimeout> | null = null
  private probeTimer: ReturnType<typeof setInterval> | null = null

  constructor(opts: WriteLockOptions) {
    this.port = opts.port
    this.id = opts.id
    this.now = opts.now ?? (() => Date.now())
    this.t = { ...DEFAULT_TIMINGS, ...opts.timings }
    this.onChange = opts.onChange
  }

  /** What this tab currently believes. A fresh object every call — it
   *  is read at an event, never subscribed to directly. */
  reading(): LockReading {
    return {
      role: this.role,
      heldBy: this.heldBy,
      claims: this.claims,
      inherited: this.inherited,
    }
  }

  /** Open the channel and hold the election. Idempotent. */
  start(): void {
    if (this.running) return
    this.running = true
    this.port.receive = (msg) => {
      this.take(msg)
    }
    this.elect()
  }

  /**
   * Give the sheet up and shut down. Called when the tab is really
   * going: the `drop` is what lets the other tab take over in one
   * round trip instead of waiting out `missAfterMs`.
   */
  stop(): void {
    if (!this.running) return
    this.running = false
    if (this.role === 'leading') this.port.post({ t: 'drop', from: this.id })
    this.clearClaim()
    this.stopProbe()
    this.port.receive = null
    this.port.close()
  }

  /**
   * Hand the sheet back and ask again — for `pagehide`, which fires
   * both when a tab is closing for good and when it is being frozen
   * into the back/forward cache and may return.
   *
   * The election it restarts is what makes the second case correct: a
   * tab that comes back finds whoever took over in the meantime,
   * instead of waking up still believing it owns the disk.
   */
  yieldAndReelect(): void {
    if (!this.running) return
    const wasLeading = this.role === 'leading'
    /* STOP BEING THE HOLDER BEFORE SAYING SO. The release can be
       delivered synchronously, the follower re-runs its election
       inside our `post`, and its `ask` reaches us while we still
       think we lead — so we answer it, and it follows us straight
       back into the state we were trying to leave. */
    this.set('electing', null)
    if (wasLeading) this.port.post({ t: 'drop', from: this.id })
    this.elect()
  }

  /* -- the protocol ------------------------------------------- */

  private elect(): void {
    this.stopProbe()
    this.clearClaim()
    this.lastHeard = this.now()
    this.set('electing', null)
    /* THE TIMER IS ARMED BEFORE THE QUESTION IS ASKED, and that
       order is load-bearing. A channel may deliver synchronously —
       the test bus does, and so does any same-thread transport — so
       the answer can arrive INSIDE `post`. Arm it afterwards and
       `follow()` cancels a timer that does not exist yet, the
       election continues, and the tab that has just been told it is
       following claims the sheet a moment later anyway. Two writers,
       from three lines in the wrong order. */
    this.claimTimer = setTimeout(() => {
      this.claimTimer = null
      this.claim()
    }, this.t.claimAfterMs)
    this.port.post({ t: 'ask', from: this.id })
  }

  private claim(): void {
    if (!this.running) return
    this.stopProbe()
    this.since = this.now()
    this.claims += 1
    if (this.sawHolder) {
      /* somebody else has been writing to this sheet since we last
         looked at it — the caller owes the disk a re-read */
      this.inherited += 1
      this.sawHolder = false
    }
    /* ALWAYS ANNOUNCED, even if `role` was somehow already 'leading':
       `inherited` is what tells the caller this is a TAKEOVER and the
       disk has to be re-read, and a suppressed change here is that
       reload silently not happening. */
    this.set('leading', null, true)
    this.port.post({ t: 'hold', from: this.id, since: this.since })
  }

  private follow(holder: string): void {
    this.sawHolder = true
    this.clearClaim()
    this.set('following', holder)
    this.startProbe()
  }

  private take(msg: LockMessage): void {
    /* A channel does not echo to its own sender, but a test bus might
       — and a tab arguing with itself would never settle. */
    if (!this.running || msg.from === this.id) return

    if (msg.t === 'ask') {
      /* ONLY THE HOLDER ANSWERS. A follower replying would name
         itself as the holder to a third tab. */
      if (this.role === 'leading') {
        this.port.post({ t: 'hold', from: this.id, since: this.since })
      }
      return
    }

    if (msg.t === 'hold') {
      this.lastHeard = this.now()
      if (this.role === 'leading') {
        if (claimWins(msg.since, msg.from, this.since, this.id)) {
          /* they were here first — step down without a word */
          this.follow(msg.from)
        } else {
          /* we were: say so once more, and they will step down on the
             same comparison run the other way */
          this.port.post({ t: 'hold', from: this.id, since: this.since })
        }
      } else {
        this.follow(msg.from)
      }
      return
    }

    /* 'drop' — only the tab we are actually following can release
       something we care about. */
    if (this.role === 'following' && this.heldBy === msg.from) this.elect()
  }

  private startProbe(): void {
    if (this.probeTimer !== null) return
    this.probeTimer = setInterval(() => {
      if (!this.running || this.role !== 'following') return
      if (this.now() - this.lastHeard > this.t.missAfterMs) {
        /* the holder stopped answering: it was killed, crashed or
           frozen, and it never got to say `drop` */
        this.elect()
        return
      }
      this.port.post({ t: 'ask', from: this.id })
    }, this.t.probeEveryMs)
  }

  private stopProbe(): void {
    if (this.probeTimer === null) return
    clearInterval(this.probeTimer)
    this.probeTimer = null
  }

  private clearClaim(): void {
    if (this.claimTimer === null) return
    clearTimeout(this.claimTimer)
    this.claimTimer = null
  }

  private set(role: LockRole, heldBy: string | null, force = false): void {
    if (!force && this.role === role && this.heldBy === heldBy) return
    this.role = role
    this.heldBy = heldBy
    this.onChange?.(this.reading())
  }
}
