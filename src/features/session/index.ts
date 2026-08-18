/* ============================================================
   THE TWO-TAB GUARD — one door in, one door out.

   IN:  `<TabGuard />`, mounted once at the root. It runs the
        election, drives `@/lib/writeGate`, and draws the notice in
        whichever tab is not the one saving.
   OUT: nothing else. The store asks `writesHeld()` and knows nothing
        about this feature; this feature knows nothing about which
        controls the store has.

   THE MODEL IS EXPORTED TOO, unusually for a feature whose whole
   surface is one card — because `WriteLock` is the part that has to
   be right and the part a test drives. Two `LockPort`s in one
   process reproduce two tabs exactly: opening second, taking over on
   a clean close, taking over from a tab that was killed, and two
   tabs opened at the same instant. See `writeLock.test.ts`.
   ============================================================ */

export { TabGuard } from './TabGuard'
export { useTabSession } from './useTabSession'
export type { TabSession } from './useTabSession'

export { WriteLock, DEFAULT_TIMINGS, claimWins } from './writeLock'
export type {
  LockMessage,
  LockPort,
  LockReading,
  LockRole,
  LockTimings,
  WriteLockOptions,
} from './writeLock'

export { LOCK_CHANNEL, broadcastPort, canCoordinateTabs, newTabId } from './port'
