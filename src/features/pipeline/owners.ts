/* ============================================================
   WHOSE DEAL IT IS NOW — and why that is not who prepared it.

   SALES_BOARD §4 asks a stage change to "reassign the owner" and
   §5 asks for "reassignment to another salesperson". Both were
   recorded as blocked, in `stageTrigger.ts`, for one reason: *"a
   deal has no owner. `preparedBy` is a NAME frozen onto the
   document when it was raised, not a pointer at a person… Needs a
   people directory and an `ownerId` beside the deal — a store
   shaped like `stages.ts`, plus a picker, plus the answer to what
   happens to a deal owned by somebody who has left."*

   DECISIONS.md §2 supplied the directory. Roles are real: they are
   the dealership's own words for the jobs it has ("Salesperson",
   "Yard manager", "Owner" — `types/model.ts:927`), they are
   written by the dealer and by nobody else, they are persisted and
   undoable, and `mayDo` now reads one. That is the only list of
   WHO DOES WHAT HERE this application has that it did not invent.

   SO AN OWNER NAMES A DESK, NOT A PERSON, and this file says so
   rather than implying otherwise. There is exactly one account in
   this build (`auth/session.ts`: "The app does not pretend to have
   a team it does not have"), and the alternative — a box to type a
   name into — would be a people directory made of free text: the
   "fields nothing ever wrote" failure `features/history` already
   names as the reason it draws no pipeline of its own. A deal
   handed to a job the dealership wrote down is a fact. A deal
   handed to a string somebody typed is not.

   THE THREE FACTS, AND THEY ARE THREE:

     WHO PREPARED IT   `QuoteDef.preparedBy` — a NAME, frozen onto
                       the document when it was raised, printed on
                       the paper a customer received. It is not
                       edited here and must never be: changing it
                       would rewrite a document that has gone out.

     WHO OWNS IT NOW   this file. A fact about the CONVERSATION,
                       not about the document — which is exactly
                       the argument `stages.ts` makes for the stage
                       — so it is stored BESIDE the quote and a
                       reassignment cannot touch one word of what
                       was quoted.

     WHO HANDED IT ON  the signed-in person, recorded on the
                       handover. This is the only one of the three
                       that is a human being, and it is the one an
                       audit trail needs.

   THE TRAIL IS THE STATE, and that is the whole storage design.
   The store holds a deal's HANDOVERS, oldest first, and the
   current owner is the last one's `to`. There is no second field
   holding "the owner" beside a list that also holds it: two copies
   of one fact is how a record and its summary start disagreeing,
   which is the argument `features/history` makes for deriving
   "replaced" rather than storing it. One list, read two ways.

   WHAT HAPPENS TO A DEAL OWNED BY SOMEBODY WHO HAS LEFT — the
   question the blocker ended on. A role can be deleted while a
   deal is standing on it, and the store already covers its half:
   `deleteRole` (`useProjectStore.ts:1537`) strips that role's
   grants from every module in the same step. This file covers the
   other half with the rule `auth/role.ts` already wrote down —
   *"an id that names no role is not a role"*. `ownerInForce`
   resolves the assignment against the roles that actually exist
   and answers null, so a deal whose owner was removed reads as
   nobody's, never as a name this app invented. The TRAIL still
   says a handover happened, because it did; it simply cannot name
   a job that no longer exists, and `roleWord` says that in words.

   WHAT IS DELIBERATELY NOT HERE. Nothing gates the act on `mayDo`:
   the board is a stage of the app rather than a surface of one
   module, so there is no module id to ask about, and inventing one
   to reach a capability list would be a wrong answer dressed as a
   check. Rule 9 covers the act instead — every reassignment is a
   toast with UNDO, and `activity.ts` writes it down because it
   listens to that same bus.

   EVERY FUNCTION THAT DECIDES ANYTHING IS PURE and takes its
   inputs as arguments, so `owners.test.ts` needs no browser, no
   store, no session and no clock.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import type { RoleDef } from '@/types/model'
import { currentUser } from '@/features/auth'

export interface Handover {
  id: string
  /** epoch ms. A number, so ordering never parses a string — the
   *  same choice `dealNotes.ts` and `activity.ts` made. */
  at: number
  /** the role it came off, or null when nobody held it. Stored
   *  rather than derived from the entry before it, so one row of
   *  the trail is readable on its own — an imported half-trail
   *  still says what each handover did. */
  from: string | null
  /** the role it went to, or null when it was taken back off
   *  everybody. Null is a real decision and not an absence: "this
   *  is nobody's now" is a thing a sales manager does on purpose. */
  to: string | null
  /** who did it — the signed-in person. Undefined is honest;
   *  "System" is not. Same rule as `dealNotes.DealNote.who`. */
  who?: string
  whoId?: string
}

/** Every deal's handovers, keyed by quote id. */
export type OwnerBag = Record<string, Handover[]>

/** THE PICKER'S VALUE FOR "NOBODY". The empty string cannot
 *  collide with a `RoleDef` id — `createRole` refuses an empty
 *  name and mints its id from `newId()` — and a picker needs a
 *  string for every row, including the row that means none. */
export const NOBODY = ''

/* ------------------------------------------------------------
   THE PURE HALF
   ------------------------------------------------------------ */

/** This deal's handovers, OLDEST FIRST — a trail is read down the
 *  way it happened.
 *
 *  Sorted rather than trusted, though writes append in order: an
 *  undone assignment and a re-import can both leave a list whose
 *  array order is not its time order, and the LAST entry is the
 *  current owner — so an unsorted list would not merely read
 *  oddly, it would answer the wrong owner. */
export function handoversFor(bag: OwnerBag, quoteId: string): Handover[] {
  const trail = bag[quoteId]
  if (!trail || trail.length === 0) return []
  return [...trail].sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : 1) : a.at - b.at))
}

/** The role id this deal is with, or null when nobody has ever
 *  been given it — or when the last thing anybody did was take it
 *  back off them. */
export function ownerOf(bag: OwnerBag, quoteId: string): string | null {
  const trail = handoversFor(bag, quoteId)
  return trail.length === 0 ? null : (trail[trail.length - 1]?.to ?? null)
}

/** THE SAME ANSWER, RESOLVED AGAINST THE ROLES THAT ACTUALLY
 *  EXIST — `auth/role.ts`'s rule 2, applied to a deal instead of
 *  to a session. A stale id that still LOOKS like an owner is
 *  worse than none: the card would print a job nobody holds. */
export function ownerInForce(
  bag: OwnerBag,
  quoteId: string,
  roles: readonly RoleDef[],
): RoleDef | null {
  const id = ownerOf(bag, quoteId)
  if (id === null) return null
  return roles.find((r) => r.id === id) ?? null
}

/** WHAT TO CALL ONE END OF A HANDOVER. Three answers and no
 *  guesses: the dealership's own word for the job, "nobody" where
 *  there was none, and — for an id whose role has since been
 *  deleted — a phrase that reports the deletion rather than
 *  inventing a name for it. The trail keeps its shape when a role
 *  goes; only its vocabulary narrows. */
export function roleWord(id: string | null, roles: readonly RoleDef[]): string {
  if (id === null || id === NOBODY) return 'nobody'
  return roles.find((r) => r.id === id)?.name ?? 'a job since removed'
}

/** WHY THIS DEAL CANNOT BE GIVEN TO ANYBODY, or null when it can.
 *  A sentence rather than a boolean, so the pane prints the reason
 *  where the control is instead of drawing a dropdown with one
 *  empty row in it (rule 10). It names the door, because a person
 *  told "there are no jobs" still has to find out where jobs live. */
export function whyNotOwner(roles: readonly RoleDef[]): string | null {
  if (roles.length > 0) return null
  return 'No jobs are written down yet, so there is nobody to give this to. They are added under Access & roles.'
}

/** A HANDOVER'S ID IS MINTED FROM ITS INSTANT, then made unique
 *  against the whole bag — readable in storage and in a debugger,
 *  which a random id is not. The same shape `mintNoteId` uses, for
 *  the reason that file gives: two acts inside one millisecond
 *  collide, which is why the suffix exists at all. */
export function mintHandoverId(bag: OwnerBag, at: number): string {
  const base = `h${at.toString(36)}`
  const taken = new Set<string>()
  for (const trail of Object.values(bag)) for (const h of trail) taken.add(h.id)
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

/** Build one handover. Pure: the id, the instant, both ends and
 *  the person all come in, so a test writes a whole trail without
 *  a clock or a session.
 *
 *  AN EMPTY STRING IS NULL AT THIS BOUNDARY, once, so the picker's
 *  "nobody" row and the store's "nobody" are one fact rather than
 *  two shapes every reader has to remember. */
export function mintHandover(args: {
  id: string
  at: number
  from: string | null
  to: string | null
  who?: string
  whoId?: string
}): Handover {
  return {
    id: args.id,
    at: args.at,
    from: args.from === NOBODY ? null : args.from,
    to: args.to === NOBODY ? null : args.to,
    ...(args.who ? { who: args.who } : {}),
    ...(args.whoId ? { whoId: args.whoId } : {}),
  }
}

/** With one more handover on it. Never mutates the bag it is
 *  handed — the caller's copy is the store's. */
export function withHandover(bag: OwnerBag, quoteId: string, h: Handover): OwnerBag {
  return { ...bag, [quoteId]: [...(bag[quoteId] ?? []), h] }
}

/** Without that handover — what UNDO calls.
 *
 *  IT REMOVES THE ENTRY RATHER THAN APPENDING THE REVERSE, and
 *  that is the honest shape for a four-second Undo: an act that
 *  was taken back did not happen, and a trail carrying "given to
 *  Yard manager" and "given straight back" would be a record of
 *  the toast rather than of the deal. The org-wide log
 *  (`activity.ts`) keeps the sentence either way, which is where a
 *  record of the attempt belongs. */
export function withoutHandover(bag: OwnerBag, quoteId: string, id: string): OwnerBag {
  const trail = bag[quoteId]
  if (!trail) return bag
  const left = trail.filter((h) => h.id !== id)
  if (left.length === trail.length) return bag
  const next = { ...bag }
  if (left.length === 0) delete next[quoteId]
  else next[quoteId] = left
  return next
}

/** WHAT ONE HANDOVER DID, in the dealership's own words. Read by
 *  the trail on the deal's record and — with the deal named in
 *  front of it — by the toast, so the two can never describe the
 *  same act differently.
 *
 *  THREE SENTENCES BECAUSE THERE ARE THREE ACTS. "Moved from
 *  nobody to Yard manager" is what one sentence with two holes in
 *  it produces, and it reads like a form. */
export function handoverSay(h: Handover, roles: readonly RoleDef[]): string {
  if (h.to === null) return `taken off ${roleWord(h.from, roles)}`
  if (h.from === null) return `given to ${roleWord(h.to, roles)}`
  return `moved from ${roleWord(h.from, roles)} to ${roleWord(h.to, roles)}`
}

/** THE TOAST'S WHOLE SENTENCE. It names the deal AND the customer
 *  for the reason `dealDesk.addNote` does: the audit log listens to
 *  this same bus, and "Q-1042 given to Yard manager" tells a
 *  manager nothing they can act on. */
export function handoverToast(
  h: Handover,
  roles: readonly RoleDef[],
  reference: string,
  customer: string,
): string {
  const said = customer.trim() === '' ? reference : `${reference} — ${customer.trim()}`
  return `${said} ${handoverSay(h, roles)}.`
}

/** WHAT A STORED BAG HAS TO SURVIVE, per-trail rather than
 *  all-or-nothing — the reading `dealNotes.parseBag` argues for.
 *  Nine good handovers and one corrupt row should cost the tenth,
 *  not the nine.
 *
 *  A ROW WITH NEITHER END IS DROPPED. `{from: null, to: null}` is
 *  a handover that did nothing, which no control here can produce,
 *  and keeping it would put a line on a trail reporting no event. */
export function parseOwners(raw: unknown): OwnerBag {
  const out: OwnerBag = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [quoteId, trail] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(trail)) continue
    const kept: Handover[] = []
    for (const row of trail as Record<string, unknown>[]) {
      if (typeof row?.['id'] !== 'string' || row['id'] === '') continue
      if (typeof row['at'] !== 'number' || !Number.isFinite(row['at'])) continue
      const from = typeof row['from'] === 'string' && row['from'] !== '' ? row['from'] : null
      const to = typeof row['to'] === 'string' && row['to'] !== '' ? row['to'] : null
      if (from === null && to === null) continue
      kept.push({
        id: row['id'],
        at: row['at'],
        from,
        to,
        ...(typeof row['who'] === 'string' ? { who: row['who'] } : {}),
        ...(typeof row['whoId'] === 'string' ? { whoId: row['whoId'] } : {}),
      })
    }
    if (kept.length > 0) out[quoteId] = kept
  }
  return out
}

/* ------------------------------------------------------------
   THE STORE. Same shape as `dealNotes.ts` — one key per
   organisation, a cache, a listener set — because a second
   pattern for the same job is a second thing to learn.
   ------------------------------------------------------------ */

const key = (orgSlug: string): string => `hl.pipeline.owner.v1:${orgSlug}`

let cache: { k: string; v: OwnerBag } | null = null
const listeners = new Set<() => void>()

function read(orgSlug: string): OwnerBag {
  const k = key(orgSlug)
  if (cache && cache.k === k) return cache.v
  let v: OwnerBag = {}
  try {
    const raw = globalThis.localStorage?.getItem(k)
    if (raw) v = parseOwners(JSON.parse(raw))
  } catch {
    /* a browser refusing storage still gets a working board — with
       no owner on any deal, which is the truth about what it can
       read */
  }
  cache = { k, v }
  return v
}

/** Returns whether the browser actually took it. A reassignment
 *  the store did not keep is an ownership change that will be gone
 *  after a refresh, and rule 10 says a thing that could not be
 *  done says so where it happened — `dealDesk` puts it in the same
 *  toast that announces the act, the way `addLink` does. */
function write(orgSlug: string, v: OwnerBag): boolean {
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

export const ownersOf = (orgSlug: string): OwnerBag => read(orgSlug)

/** Write one already-composed handover against a deal, and say
 *  whether it will still be there tomorrow. */
export function saveHandover(orgSlug: string, quoteId: string, h: Handover): boolean {
  return write(orgSlug, withHandover(read(orgSlug), quoteId, h))
}

export function dropHandover(orgSlug: string, quoteId: string, id: string): void {
  write(orgSlug, withoutHandover(read(orgSlug), quoteId, id))
}

/** The handover a person just made, with the session's name on it
 *  and an id nothing else in the bag holds. `from` is read from the
 *  store rather than passed in, so two surfaces cannot disagree
 *  about where the deal was standing a moment ago.
 *
 *  THE ACTOR IS READ FROM THE SESSION HERE rather than accepted as
 *  an argument — `composeNote` gives the reason, and it is stronger
 *  for an ownership change than for a note: a caller allowed to
 *  name somebody else is a caller that can forge one. */
export function composeHandover(
  orgSlug: string,
  quoteId: string,
  to: string | null,
  now = Date.now(),
): Handover {
  const user = currentUser()
  const bag = read(orgSlug)
  return mintHandover({
    id: mintHandoverId(bag, now),
    at: now,
    from: ownerOf(bag, quoteId),
    to,
    ...(user ? { who: user.name, whoId: user.id } : {}),
  })
}

/** for tests, and for a sign-out that should leave nothing behind */
export function forgetDealOwners(): void {
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

export function useDealOwners(orgSlug: string): OwnerBag {
  const snap = useCallback(() => read(orgSlug), [orgSlug])
  return useSyncExternalStore(subscribe, snap, snap)
}
