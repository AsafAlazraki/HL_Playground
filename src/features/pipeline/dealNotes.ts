/* ============================================================
   WHAT WE SAID ABOUT A DEAL — the notes on a card.

   THE OTHER HALF OF THE HISTORY. `features/activity` answers
   "what CHANGED" — it listens to the toast bus and writes down
   every act the app announced. It cannot answer "what did we SAY
   about it", because nothing a person thinks about a customer
   passes through a mutation. So: a thread, per deal, in order,
   with who and when.

   IT LIVES BESIDE THE QUOTE AND NEVER IN IT, for exactly the
   reason `stages.ts` gives at length for the stage. A quote is a
   photograph of what was offered on a day; an issued one is
   frozen and the whole feature depends on that. "Rang him
   Tuesday, he wants the T-top" is a fact about the CONVERSATION,
   and putting it on the document would mean a frozen document
   that changes — which is the one property this app cannot lose.
   So the note is keyed by quote id in a store of its own, exactly
   as the stage override is, and a quote that has never been
   talked about costs nothing at all.

   THE STORE HOLDS CONVERSATIONS, NOT KEYS. Dropping the last note
   on a deal removes the deal's entry rather than leaving `[]`
   behind, so the size of this store is the number of deals
   somebody has actually written about.

   A REFUSED WRITE IS REPORTED, NOT SWALLOWED — and that is the
   one place this file deliberately differs from `stages.ts` and
   `stageStore.ts`. Those two catch a storage failure and let the
   in-memory copy stand for the session, which is right: a stage
   override lost on refresh is a card back where the document says
   it should be, and the board still works. A NOTE lost on refresh
   is a person's words gone with no trace. Rule 10 says a thing
   that cannot be done says why, where it happens, so `saveNote`
   returns whether the browser actually took it and the composer
   prints the truth under the thread. The note still stands for
   the session either way — dropping it on the floor to prove a
   point would be worse than keeping it and admitting the risk.

   NO LENGTH CAP, and it was considered. `activity.ts` keeps 400
   entries because a log is a recent history and an unbounded one
   eventually refuses to write. A thread is not a log: the fourth
   note on a deal is the one that says why it was lost, and a
   store that silently drops the oldest would be a delete
   pretending to be a limit. The honest failure path above is what
   covers the quota instead.

   EVERY FUNCTION BELOW THAT DECIDES ANYTHING IS PURE and takes
   its inputs as arguments, so `dealNotes.test.ts` needs no
   browser, no store and no clock.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import { currentUser } from '@/features/auth'

export interface DealNote {
  id: string
  /** epoch ms. A number, so ordering never parses a string — the
   *  same choice `activity.ts` made and for the same reason. */
  at: number
  text: string
  /** who was signed in when it was written. Undefined is honest;
   *  "System" is not — `activity.ts` §the entry, same rule. A note
   *  with no name still has a time, and the thread draws what it
   *  has rather than inventing an author. */
  who?: string
  whoId?: string
}

/** Every thread, keyed by quote id. */
export type NoteBag = Record<string, DealNote[]>

/* ------------------------------------------------------------
   THE PURE HALF
   ------------------------------------------------------------ */

/** WHY THIS NOTE CANNOT BE ADDED, or null when it can. A sentence
 *  rather than a boolean, so the composer prints the reason beside
 *  the box it was typed in (rule 10) instead of greying a button
 *  and leaving somebody to guess. */
export function whyNotNote(text: string): string | null {
  if (text.trim() === '') {
    return 'A note needs some words in it — this one is empty.'
  }
  return null
}

/** A NOTE'S ID IS MINTED FROM ITS INSTANT, then made unique
 *  against the whole bag. Readable in storage and in a debugger,
 *  which a random id is not, and the same shape `mintId` in
 *  `stageStore.ts` uses. Two notes written inside one millisecond
 *  collide, which is why the suffix exists at all. */
export function mintNoteId(bag: NoteBag, at: number): string {
  const base = `n${at.toString(36)}`
  const taken = new Set<string>()
  for (const thread of Object.values(bag)) for (const n of thread) taken.add(n.id)
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

/** Build one note. Pure: the id, the instant and the author all
 *  come in, so a test writes a whole thread without a clock or a
 *  session. `text` is trimmed — trailing newlines from a textarea
 *  are typing, not content — but never otherwise reshaped, because
 *  the words are the person's. */
export function mintNote(args: {
  id: string
  at: number
  text: string
  who?: string
  whoId?: string
}): DealNote {
  return {
    id: args.id,
    at: args.at,
    text: args.text.trim(),
    ...(args.who ? { who: args.who } : {}),
    ...(args.whoId ? { whoId: args.whoId } : {}),
  }
}

/** This deal's thread, oldest first — a conversation is read down
 *  the way it was spoken, so the newest note is the last one.
 *
 *  Sorted rather than trusted, though writes append in order: an
 *  undone add and a re-import can both leave a bag whose array
 *  order is not its time order, and a thread that jumps is a
 *  thread nobody believes. */
export function notesFor(bag: NoteBag, quoteId: string): DealNote[] {
  const thread = bag[quoteId]
  if (!thread || thread.length === 0) return []
  return [...thread].sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : 1) : a.at - b.at))
}

/** How many, for the small count on a card. */
export const countOf = (bag: NoteBag, quoteId: string): number => bag[quoteId]?.length ?? 0

/** With one more note on it. Never mutates the bag it is handed —
 *  the caller's copy is the store's. */
export function withNote(bag: NoteBag, quoteId: string, note: DealNote): NoteBag {
  return { ...bag, [quoteId]: [...(bag[quoteId] ?? []), note] }
}

/** Without that note — what UNDO calls, and what makes an undone
 *  add exact rather than "remove the last one". The deal's entry
 *  goes with its last note; see the header. */
export function withoutNote(bag: NoteBag, quoteId: string, noteId: string): NoteBag {
  const thread = bag[quoteId]
  if (!thread) return bag
  const left = thread.filter((n) => n.id !== noteId)
  if (left.length === thread.length) return bag
  const next = { ...bag }
  if (left.length === 0) delete next[quoteId]
  else next[quoteId] = left
  return next
}

/** WHAT A STORED BAG HAS TO SURVIVE, and it is per-thread rather
 *  than all-or-nothing. `stageStore.parse` throws away a whole
 *  stored stage list when one entry is bad, deliberately — a board
 *  drawn from three good columns and two dropped ones is worse
 *  than the default board. A thread is the opposite: nine good
 *  notes and one corrupt one should cost the tenth note, not the
 *  nine. So anything unreadable is skipped and the rest stands. */
export function parseBag(raw: unknown): NoteBag {
  const out: NoteBag = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [quoteId, thread] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(thread)) continue
    const kept: DealNote[] = []
    for (const row of thread as Record<string, unknown>[]) {
      if (typeof row?.['id'] !== 'string' || row['id'] === '') continue
      if (typeof row['text'] !== 'string' || row['text'] === '') continue
      if (typeof row['at'] !== 'number' || !Number.isFinite(row['at'])) continue
      kept.push({
        id: row['id'],
        at: row['at'],
        text: row['text'],
        ...(typeof row['who'] === 'string' ? { who: row['who'] } : {}),
        ...(typeof row['whoId'] === 'string' ? { whoId: row['whoId'] } : {}),
      })
    }
    if (kept.length > 0) out[quoteId] = kept
  }
  return out
}

/* ------------------------------------------------------------
   THE STORE. Same shape as `stages.ts` — one key per
   organisation, a cache, a listener set — because a second
   pattern for the same job is a second thing to learn.
   ------------------------------------------------------------ */

const key = (orgSlug: string): string => `hl.pipeline.notes.v1:${orgSlug}`

let cache: { k: string; v: NoteBag } | null = null
const listeners = new Set<() => void>()

function read(orgSlug: string): NoteBag {
  const k = key(orgSlug)
  if (cache && cache.k === k) return cache.v
  let v: NoteBag = {}
  try {
    const raw = globalThis.localStorage?.getItem(k)
    if (raw) v = parseBag(JSON.parse(raw))
  } catch {
    /* a browser refusing storage still gets a working board — with
       no thread on any card, which is the truth about what it can
       read */
  }
  cache = { k, v }
  return v
}

/** Returns whether the browser actually took it. See the header:
 *  the in-memory copy stands either way, and the caller says so. */
function write(orgSlug: string, v: NoteBag): boolean {
  cache = { k: key(orgSlug), v }
  let kept = true
  try {
    globalThis.localStorage?.setItem(key(orgSlug), JSON.stringify(v))
  } catch {
    kept = false
  }
  for (const l of listeners) l()
  return kept
}

export const notesOf = (orgSlug: string): NoteBag => read(orgSlug)

/** Write one already-composed note against a deal, and say whether
 *  it will still be there tomorrow. The boolean is the whole point:
 *  this returns false when the write did not reach storage, so the
 *  caller can say so where it failed instead of showing a note the
 *  next reload will not have. Who wrote it was settled in
 *  `composeNote`; by here the author is a fact on the note. */
export function saveNote(orgSlug: string, quoteId: string, note: DealNote): boolean {
  return write(orgSlug, withNote(read(orgSlug), quoteId, note))
}

export function dropNote(orgSlug: string, quoteId: string, noteId: string): void {
  write(orgSlug, withoutNote(read(orgSlug), quoteId, noteId))
}

/** The note a person just typed, with the session's name on it and
 *  an id nothing else in the bag holds. Takes `now` so the caller
 *  can be tested; defaults to the clock so callers need not care.
 *
 *  THE AUTHOR IS READ FROM THE SESSION HERE rather than passed in.
 *  Every surface that adds a note means "the person doing this",
 *  and a caller allowed to name somebody else is a caller that can
 *  forge one — so no signature on the way in accepts a name. An
 *  unsigned session leaves `who` off the note entirely rather than
 *  writing a placeholder, because "Unknown" is a claim about a
 *  person and an absent key is not. */
export function composeNote(orgSlug: string, text: string, now = Date.now()): DealNote {
  const user = currentUser()
  return mintNote({
    id: mintNoteId(read(orgSlug), now),
    at: now,
    text,
    ...(user ? { who: user.name, whoId: user.id } : {}),
  })
}

export function forgetDealNotes(): void {
  cache = null
}

/* ------------------------------------------------------------
   READING IT
   ------------------------------------------------------------ */
function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useDealNotes(orgSlug: string): NoteBag {
  const snap = useCallback(() => read(orgSlug), [orgSlug])
  return useSyncExternalStore(subscribe, snap, snap)
}
