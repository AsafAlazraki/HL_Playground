/* ============================================================
   THE WRITE GATE — one boolean, and the reason it exists.

   THE FAILURE. This app is local-first: one project, one IndexedDB,
   hydrated into a zustand store on load. Open the same sheet in two
   tabs and BOTH hold the whole project in memory and BOTH write it
   back. The write is differential (`db/repository.ts`), which makes
   it fast and makes this worse: tab A saves the row it just edited,
   tab B saves the row IT just edited over a base that never had A's,
   and whichever flush lands last is what the disk holds. Nothing
   errors, nothing warns, and the work in the other tab is gone the
   next time either one reloads.

   THE ANSWER, IN ONE SENTENCE. Exactly one tab may write, the tabs
   agree which one over a BroadcastChannel, and the other tab says so
   in plain words instead of quietly losing work.

   WHY THE FLAG LIVES HERE AND NOT IN THE FEATURE THAT SETS IT.
   `src/store/useProjectStore.ts` must consult it, and the store may
   not import a feature — features are built on the store, not the
   other way round. So the flag is a leaf module with no imports of
   its own: the store reads it, `@/features/session` writes it, and
   neither knows about the other.

   IT GATES THE MUTATION, NOT THE FLUSH. Blocking only the write to
   disk would let a person type into a tab that is never going to
   keep any of it — which is the same lost work with extra steps. The
   store declines the change itself, and records that it declined, so
   the notice on screen can say what just happened rather than
   leaving a control that silently does nothing (DESIGN_PRINCIPLES
   rule 10).

   FAIL OPEN, ALWAYS. A browser with no BroadcastChannel, a test, the
   first 150ms before anyone has answered — every one of those ends
   with the gate OPEN. A guard against a rare loss must never be the
   common cause of one.
   ============================================================ */

/** What the gate is doing, as one immutable object. */
export interface WriteGateState {
  /** true when this tab may not change the sheet */
  held: boolean
  /** how many changes have been declined since the hold began. Zero
   *  again the moment the hold lifts — it counts a live condition,
   *  not a history. */
  refused: number
}

const OPEN: WriteGateState = { held: false, refused: 0 }

let current: WriteGateState = OPEN
const watchers = new Set<(s: WriteGateState) => void>()

function publish(next: WriteGateState): void {
  current = next
  for (const w of watchers) w(next)
}

/** Stop this tab changing the sheet. Idempotent. */
export function holdWrites(): void {
  if (current.held) return
  publish({ held: true, refused: 0 })
}

/** Let this tab change the sheet again. Idempotent.
 *
 *  The refusal count goes with the hold rather than surviving it: it
 *  is the evidence for a sentence on screen that is no longer true. */
export function allowWrites(): void {
  if (!current.held) return
  publish(OPEN)
}

/** The one question the store asks. */
export const writesHeld = (): boolean => current.held

/**
 * Called by the store at the moment it declines a change.
 *
 * A refusal nobody counted is a control that did nothing, which is
 * the thing this app is not allowed to ship. Counting it is what lets
 * the notice change from "this tab is read-only" to "that change was
 * not applied, and here is why".
 */
export function noteRefusedWrite(): void {
  if (!current.held) return
  publish({ held: true, refused: current.refused + 1 })
}

/** The current reading. The SAME object between changes, so it is
 *  safe to hand straight to a React subscription. */
export const readWriteGate = (): WriteGateState => current

/** Watch it. Returns the unsubscribe. */
export function watchWriteGate(fn: (s: WriteGateState) => void): () => void {
  watchers.add(fn)
  return () => {
    watchers.delete(fn)
  }
}

/** Back to open, with nobody watching. For tests only — the app never
 *  needs this, because a tab that regains the lock calls
 *  `allowWrites`. */
export function resetWriteGate(): void {
  current = OPEN
  watchers.clear()
}
