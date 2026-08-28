/* ============================================================
   WHAT HAPPENED, AND WHO DID IT.

   THE GAP. Nothing in this application recorded a change. A rule
   was written, a column removed, 199 rows re-priced at a level, a
   quote issued — each raised a toast that lived for four seconds
   and then no trace of it existed anywhere. On a shared
   dealership machine with roles and access control, "who changed
   the Highfield prices on Tuesday" had no answer at all.

   THE SEAM THAT MAKES IT CHEAP. Every undoable act in this app
   ALREADY announces itself: `store/notes.ts` is a bus, 27 files
   call `say` / `sayUndoable` / `offerUndo`, and `UndoKeys` at the
   root draws whatever comes through. The app has been telling
   itself what happened the whole time and nobody was writing it
   down.

   So this is a LISTENER, not a new instrumentation pass. It adds
   no call sites, cannot miss an act that raises a toast, and
   cannot invent one that does not.

   WHAT IT DOES NOT DO, deliberately:

     - It does not replace undo. `notes.ts` already explains why a
       global undo stack is dishonest a second after the act; this
       records that a thing happened, not how to reverse it.
     - It does not record READS. Opening a table is not a change,
       and a log that fills with navigation hides the four entries
       that matter.
     - It does not invent an actor. The entry carries whoever was
       signed in when it was written, or nobody — never a guess.

   SCOPE. Per organisation, because a configuration belongs to a
   business; the signed-in person is recorded ON the entry rather
   than being the key, so a log survives somebody signing out and
   a colleague signing in — which is the case the log exists for.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import { onSaid, type Note } from '@/store/notes'
import { currentUser } from '@/features/auth'

export interface Entry {
  id: string
  /** epoch ms. Stored as a number so a sort never parses a string. */
  at: number
  /** exactly what the app said at the time — never re-worded later,
   *  because a log that improves its own prose is not a log. */
  text: string
  /** who was signed in. Undefined is honest; "System" is not. */
  who?: string
  whoId?: string
  /** the module this happened in, where the act named one */
  moduleId?: string
  /** the table this happened to, where the act named one */
  entityId?: string
  tone?: Note['tone']
}

/** How many are kept. An activity log is a recent history, not an
 *  archive: 400 entries is roughly a fortnight of heavy use, and
 *  an unbounded list in localStorage eventually refuses to write. */
const KEEP = 400
const key = (orgSlug: string): string => `hl.activity.v1:${orgSlug}`

let cache: { slug: string; rows: Entry[] } | null = null
const listeners = new Set<() => void>()

function read(slug: string): Entry[] {
  if (cache && cache.slug === slug) return cache.rows
  let rows: Entry[] = []
  try {
    const raw = globalThis.localStorage?.getItem(key(slug))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) rows = parsed as Entry[]
    }
  } catch {
    /* a browser refusing storage still gets a working session log */
  }
  cache = { slug, rows }
  return rows
}

function write(slug: string, rows: Entry[]): void {
  cache = { slug, rows }
  try {
    globalThis.localStorage?.setItem(key(slug), JSON.stringify(rows))
  } catch {
    /* the in-memory copy stands for this session */
  }
  for (const l of listeners) l()
}

export function activityOf(orgSlug: string): Entry[] {
  return read(orgSlug)
}

/** Record one act. Called by the recorder below, and by a caller
 *  that knows something the note text cannot carry — which module
 *  or table it happened to. */
export function record(
  orgSlug: string,
  entry: Omit<Entry, 'id' | 'at' | 'who' | 'whoId'> & { at?: number },
): void {
  const user = currentUser()
  const row: Entry = {
    id: `a${Date.now().toString(36)}${Math.floor(performance.now() * 1000) % 46656}`,
    at: entry.at ?? Date.now(),
    text: entry.text,
    ...(user ? { who: user.name, whoId: user.id } : {}),
    ...(entry.moduleId ? { moduleId: entry.moduleId } : {}),
    ...(entry.entityId ? { entityId: entry.entityId } : {}),
    ...(entry.tone ? { tone: entry.tone } : {}),
  }
  write(orgSlug, [row, ...read(orgSlug)].slice(0, KEEP))
}

export function clearActivity(orgSlug: string): void {
  write(orgSlug, [])
}

/* ------------------------------------------------------------
   THE RECORDER. Mounted once, at the root, beside the toast host.

   `notes.ts` hands every note to every listener, so this simply
   listens. The one judgement it makes is what NOT to keep: a note
   with no act and fewer than three words is a status blip ("Saved",
   "Copied") rather than a change, and forty of those bury the one
   entry somebody is looking for.
   ------------------------------------------------------------ */
export function startRecording(orgSlug: string): () => void {
  return onSaid((note) => {
    const words = note.text.trim().split(/\s+/).length
    if (!note.act && words < 3) return
    record(orgSlug, {
      text: note.text,
      ...(atPlace ? { moduleId: atPlace } : {}),
      ...(note.tone ? { tone: note.tone } : {}),
    })
  })
}

/* ------------------------------------------------------------
   WHERE THE PERSON WAS WHEN IT HAPPENED.

   `Entry.moduleId` existed from the first version of this file and
   NOTHING EVER SET IT — so `useModuleActivity` filtered a list in
   which every entry had `moduleId: undefined` and a module's
   activity card was structurally guaranteed to be empty. A field
   nobody writes is worse than a missing feature: it looks answered.

   The note bus cannot carry a module, and it should not — 27 call
   sites raising toasts have no business knowing what is on screen.
   So the SHELL says where it is, exactly as `openPlace.ts` already
   does for the workspace, and the recorder stamps it.

   WHAT THIS CLAIMS, PRECISELY: "you were standing in Highfield when
   this happened", not "this changed Highfield". Those differ when
   somebody edits one module's table while another is open, which
   this cannot detect and does not pretend to. It is the claim every
   audit log of this shape makes, and it is worth far more than a
   column of nothing.
   ------------------------------------------------------------ */
let atPlace: string | null = null

/** Called by the shell when a module opens, and with null when it
 *  closes. Not a hook and not in the store: it is a fact about the
 *  screen, and the recorder reads it once per note. */
export function nowIn(moduleId: string | null): void {
  atPlace = moduleId
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

export function useActivity(orgSlug: string, limit?: number): Entry[] {
  const snap = useCallback(() => read(orgSlug), [orgSlug])
  const rows = useSyncExternalStore(subscribe, snap, snap)
  return limit ? rows.slice(0, limit) : rows
}

/** Just this module's, for a module dashboard. */
export function useModuleActivity(
  orgSlug: string,
  moduleId: string,
  limit?: number,
): Entry[] {
  const rows = useActivity(orgSlug)
  const mine = rows.filter((r) => r.moduleId === moduleId)
  return limit ? mine.slice(0, limit) : mine
}

/** "4 minutes ago", "Tuesday", "12 Mar" — the shortest true form.
 *  Takes `now` so a test is not at the mercy of the clock. */
export function whenSay(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - at) / 1000))
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = new Date(at)
  const days = Math.floor(h / 24)
  if (days < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'long' })
  }
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/* ------------------------------------------------------------
   A LOG IS READ BY DAY.

   Fifteen rows each carrying "7 minutes ago", "2 hours ago",
   "Tuesday" is fifteen relative times a person has to convert
   into a shape. What somebody actually asks of an audit log is
   "what happened today", then "what happened before that" — so
   the rows are cut into days and the day is said once, at the
   top of its run, instead of on every row.

   THE DAY IS COMPUTED IN THE READER'S OWN TIME ZONE, from the
   stored epoch. A log written at 11pm and read at 1am is two
   days, and it should say so.
   ------------------------------------------------------------ */

export interface Day {
  /** "Today", "Yesterday", "Tuesday", "12 Mar" — the shortest
   *  true form, the same ladder `whenSay` climbs */
  name: string
  /** for React, and stable across a re-render at midnight */
  key: string
  rows: Entry[]
}

const startOfDay = (at: number): number => {
  const d = new Date(at)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Cut a log into days, newest first, preserving the order it was
 *  handed. Pure, and takes `now` so a test is not at the mercy of
 *  the clock. */
export function byDay(rows: readonly Entry[], now = Date.now()): Day[] {
  const today = startOfDay(now)
  const out: Day[] = []
  for (const r of rows) {
    const key = String(startOfDay(r.at))
    const last = out[out.length - 1]
    if (last && last.key === key) {
      last.rows.push(r)
      continue
    }
    const days = Math.round((today - Number(key)) / 86_400_000)
    const d = new Date(r.at)
    const name =
      days <= 0
        ? 'Today'
        : days === 1
          ? 'Yesterday'
          : days < 7
            ? d.toLocaleDateString(undefined, { weekday: 'long' })
            : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    out.push({ name, key, rows: [r] })
  }
  return out
}

/* ============================================================
   THE EMPTY STATE, IN ONE PLACE, WITHOUT THE PROMISE IT BROKE.

   THREE surfaces printed it and two of them were word for word the
   same: the dashboard's Activity card (`cards.ts`), the module's own
   card (`ModulePanels`) and this list — "Nothing has changed yet.
   Edits, prices and quotes show up here as they happen."

   THE SECOND SENTENCE WAS FALSE. Raising and issuing three quotes
   leaves it on the screen unchanged, because a quote writes no
   entry — `record` is called from the table and module paths and not
   from the quote path. An empty state that survives six acts is
   worse than no empty state, and a promise the screen breaks is
   worse again. So the promise is gone and the STATE stays, which is
   true whatever writes an entry next. The missing quote entries are
   a bug in `record`'s callers, not a sentence, and they are reported
   rather than papered over here.
   ============================================================ */
export const ACTIVITY_EMPTY = 'Nothing has changed yet.'
export const ACTIVITY_EMPTY_HERE = 'Nothing has changed in here yet.'

/** Just the time of day — "4:12 pm". On a log already cut into
 *  days, "7 minutes ago" is a second unit for the same fact and
 *  the clock time is the one that sorts by eye. */
export function clockSay(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
