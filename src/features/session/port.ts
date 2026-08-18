/* ============================================================
   THE REAL CHANNEL — the only file here that touches a browser API.

   `writeLock.ts` is deliberately ignorant of BroadcastChannel so the
   protocol can be driven by two objects in one process. This is the
   twenty lines that were left out of it.

   THE ORIGIN IS THE SCOPE, AND THAT IS EXACTLY RIGHT. A
   BroadcastChannel reaches every same-origin document in the browser
   — which is precisely the set of tabs that share this app's
   IndexedDB. The thing being guarded and the thing doing the
   guarding have the same boundary, so there is no case where two
   tabs share a database and cannot hear each other.

   NO CHANNEL MEANS NO GUARD, NOT NO APP. Every branch below that
   cannot coordinate returns `null`, and the caller then leads
   unconditionally. That is the behaviour this app had yesterday; a
   guard against a rare loss must never become the common cause of
   one.
   ============================================================ */

import { nanoid } from 'nanoid'
import type { LockMessage, LockPort } from './writeLock'

/**
 * The channel name.
 *
 * Versioned, because the message shape is a contract between two
 * builds of this app that may be open at the same time — a tab left
 * open across a deploy talks to a tab loaded after it. Changing the
 * vocabulary in `writeLock.ts` means changing this suffix, so an old
 * tab and a new one simply do not hear each other and each leads its
 * own channel. Two writers is the bug; two writers who disagree
 * about the words is worse.
 */
export const LOCK_CHANNEL = 'helmlogic.sheet.writer.v1'

/** Can this browser tell one tab from another at all? */
export const canCoordinateTabs = (): boolean =>
  typeof BroadcastChannel === 'function'

/** A name for this tab, for the length of this document. */
export const newTabId = (): string => nanoid(8)

/**
 * A live port, or `null` when this browser has no BroadcastChannel.
 *
 * Every `post` and `close` is guarded: a channel closed by the tab
 * going away throws on the next message, and a tab on its way out
 * raising an uncaught error in an unload handler is a console full of
 * red that means nothing.
 */
export function broadcastPort(name: string = LOCK_CHANNEL): LockPort | null {
  if (!canCoordinateTabs()) return null

  let channel: BroadcastChannel
  try {
    channel = new BroadcastChannel(name)
  } catch {
    /* a browser that has the constructor and refuses to build one —
       storage partitioning, a hardened profile. Lead alone. */
    return null
  }

  const port: LockPort = {
    receive: null,
    post: (msg: LockMessage) => {
      try {
        channel.postMessage(msg)
      } catch {
        /* the channel is already closed: this tab is unloading */
      }
    },
    close: () => {
      try {
        channel.close()
      } catch {
        /* already closed */
      }
    },
  }

  channel.onmessage = (ev: MessageEvent<LockMessage>) => {
    port.receive?.(ev.data)
  }

  return port
}
