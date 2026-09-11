/* ============================================================
   WHERE QUOTES LIVE — and why it is here and not in the store.

   The project store has no `quotes` slice and `src/db/` has no
   quotes table, and neither file is this workflow's to edit. So
   quotes live in module state, exactly as `viewDefs.ts` did before
   the store grew a home for a ViewDef — with ONE difference that is
   not optional: they are written to localStorage.

   A view definition lost on reload costs a person one drag. A QUOTE
   lost on reload is a document a customer was promised. Production
   kept a seven-step wizard in React state with no draft and no
   beforeunload guard, and a refresh at step 6 destroyed the lot. So
   this persists — badly but really — until the store and Dexie can
   do it properly. index.ts names the exact slice, table and export
   changes that replace this file's bottom half.

   EVERYTHING IS STORED BY VALUE, which is what makes localStorage
   sufficient: a quote is already a photograph, so writing it out and
   reading it back cannot change a number. The same property is what
   will let quotes travel inside a project export without silently
   re-pricing a signed deal on import.

   THE DRAFT / ISSUED LINE IS ENFORCED HERE, ONCE, rather than in
   every screen. `mutate` refuses an edit to an issued quote instead
   of writing it and reverting it — which is what production did,
   while toasting "Saved".
   ============================================================ */

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { newId, nowIso } from '@/lib/id'
import { currentOrgKey } from '@/lib/orgKey'
/* THE APP'S ONE PLACE FOR SAYING WHAT HAS JUST HAPPENED. It is a
   bus, not a store read: `say` touches no project data, and this
   file is already downstream of `freeze.ts`, which is the single
   place in this feature that may see the live sheet. */
import { say } from '@/store/notes'
import { currentUser } from '@/features/auth'
import { localDay, localDayOf } from './day'
import { mintFreeLine, mintQuoteFromView, referenceFor, type PriceChange } from './freeze'
import { money, priceAtLevel, quoteLevelChoices, repricedAt } from './pricing'
import { issueBlockers, lineAmount } from './totals'
import type { AdjustmentKind, QuoteAdjustment, QuoteDef, QuoteLine } from '@/types/model'

/* ---------------------------------------------------------- */
/* The registry                                               */
/* ---------------------------------------------------------- */

/* ============================================================
   ONE BUSINESS'S DOCUMENTS, UNDER ONE KEY — TENANCY §4.3.

   This store was unscoped: every quote in the browser sat under
   `helmlogic.quotes.v1`, so two organisations opened in the same
   browser — which `restoreForSignIn` makes an ordinary thing — read
   each other's documents. Everything else scoped to a business is
   keyed by `orgKeyOf`; this was one of five stores that were not.

   THE MIGRATION IS THE HARD HALF AND IT RUNS ONCE. Changing a key
   without moving what is under it does not lose data — it ORPHANS it,
   which is worse, because the quotes are still on disk and the app
   says nothing. That is the exact failure the constraint registry
   already had when the org key changed from the name to the slug
   (`adoptSlugKey`), so this takes the same shape: read the legacy
   key, write it under the scoped one, remove the legacy. Idempotent
   by construction — the second run finds nothing to move.

   AND IT DOES NOT GUESS WHOSE THEY ARE. A legacy store belongs to
   whoever is signed in the first time this runs, because there was
   only ever one set. Nothing else would be a guess about somebody's
   documents.
   ============================================================ */
const LEGACY_KEY = 'helmlogic.quotes.v1'

const storeKey = (): string => `${LEGACY_KEY}:${currentOrgKey()}`

const registry = new Map<string, QuoteDef>()
let list: QuoteDef[] = []
const listeners = new Set<() => void>()

/** Set when the browser refuses to persist — a quota, a private
 *  window, a full disk. Surfaced on the quote itself, because a
 *  person who is told nothing assumes their document is safe. */
let persistProblem: string | null = null

/** Newest first: a list of quotes is a diary, and the entry anyone
 *  wants is nearly always the one they just made. */
function republish(): void {
  list = [...registry.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const waiting = [...listeners]
  /* the snapshot is updated SYNCHRONOUSLY — useSyncExternalStore must
     never read a stale one — but subscribers are told on a microtask,
     so a stage may mint a quote during an effect without React
     complaining that a store updated another component mid-render */
  queueMicrotask(() => {
    for (const l of waiting) if (listeners.has(l)) l()
  })
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const getList = (): QuoteDef[] => list

/* ---------------------------------------------------------- */
/* Persistence                                                */
/* ---------------------------------------------------------- */

let writeTimer: ReturnType<typeof setTimeout> | undefined

/** The write itself, and the only place it happens. Split out of
 *  `persistSoon` so the tab going away can do it NOW — see
 *  `flushQuotes`. Re-checks `localStorage` at FIRE time rather than
 *  trusting the check made when the write was requested: 400 ms is
 *  long enough for a teardown to take the global away, which is the
 *  latent shape a sibling guard was already bitten by. */
function writeNow(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storeKey(), JSON.stringify(list))
    persistProblem = null
  } catch {
    /* A frozen ImageRef can be a data: URL carrying a whole
       photograph, and a few of those pass a quota. We do NOT drop
       the picture to make room: a quote that silently loses its
       subject's photograph prints differently from the one that
       was shown. We say so instead, and a person can act on it. */
    persistProblem =
      'This browser would not save these quotes. Print anything you need before closing the tab.'
  }
}

/** Write-behind at 400 ms — the same interval the project store
 *  uses, so typing a customer's name does not write the whole
 *  document once per keystroke. */
function persistSoon(): void {
  if (typeof localStorage === 'undefined') return
  if (writeTimer !== undefined) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = undefined
    writeNow()
    republish()
  }, 400)
}

/**
 * THE 400 ms A PERSON COULD STILL LOSE, CLOSED.
 *
 * `steps.ts` prints a promise on the build screen — "close this and
 * come back to it" — and it is the whole reason that screen exists,
 * because the app it replaces held seven wizard steps in React state
 * and lost the lot on a refresh (hl-journeys.md §3.4). Write-behind
 * made the promise ALMOST true: the pick reached the registry
 * synchronously, and reached storage 400 ms later. Close the tab
 * inside that window — which is exactly what a person does when they
 * have just made the last pick and are done — and the last pick was
 * gone. A promise that holds except at the moment people actually
 * leave is not a promise, it is an average.
 *
 * So the pending write is forced out when the page goes away. It is
 * cheap (one `setItem` of data already in memory) and it is idempotent
 * — with nothing owed it does nothing at all.
 */
export function flushQuotes(): void {
  if (writeTimer === undefined) return
  clearTimeout(writeTimer)
  writeTimer = undefined
  writeNow()
  republish()
}

/** Hooked once, from `loadQuotes`, so this file still does nothing in
 *  a module side effect and a test starts from empty.
 *
 *  `pagehide` AND NOT `beforeunload` — the same measurement
 *  `features/session/useTabSession.ts` records next door: pagehide is
 *  the one that fires on mobile Safari, and beforeunload additionally
 *  suppresses the back/forward cache. `visibilitychange` is the second
 *  half of the pair, because a hidden tab can be killed by the OS
 *  without pagehide ever running. */
let hookedTabClose = false
function hookTabClose(): void {
  if (hookedTabClose) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  hookedTabClose = true
  window.addEventListener('pagehide', flushQuotes)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQuotes()
  })
}

let loaded = false

/** Read back what was saved. Called by the hooks rather than at
 *  import time, so nothing happens in a module side effect and a
 *  test starts from empty. A record that no longer parses is
 *  SKIPPED, never thrown on: one bad row must not cost a person
 *  every other document they have. */
export function loadQuotes(): void {
  if (loaded) return
  loaded = true
  hookTabClose()
  if (typeof localStorage === 'undefined') return
  adoptLegacyQuotes()
  try {
    const raw = localStorage.getItem(storeKey())
    if (raw === null) return
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    for (const q of parsed) if (isQuoteish(q)) registry.set(q.id, q)
    republish()
  } catch {
    persistProblem = 'Saved quotes could not be read back, and were left alone.'
  }
}

/**
 * MOVE THE UNSCOPED STORE UNDER THIS BUSINESS, ONCE.
 *
 * Returns how many documents were carried across, so a test can say
 * it happened rather than infer it.
 *
 * IT REFUSES TO OVERWRITE. Where this business already has quotes of
 * its own, the legacy store is left exactly where it is rather than
 * merged or replaced: two sets of documents under one name is not a
 * migration, it is a collision, and the safe half of that choice is
 * the one that loses nothing. The legacy key then stays on disk,
 * which is the honest outcome — nothing is deleted to make a tidy
 * story.
 */
export function adoptLegacyQuotes(): number {
  if (typeof localStorage === 'undefined') return 0
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy === null) return 0
    const key = storeKey()
    if (key === LEGACY_KEY) return 0
    if (localStorage.getItem(key) !== null) return 0
    const parsed: unknown = JSON.parse(legacy)
    if (!Array.isArray(parsed)) return 0
    localStorage.setItem(key, legacy)
    localStorage.removeItem(LEGACY_KEY)
    return parsed.length
  } catch {
    /* a browser refusing storage leaves the legacy store alone, which
       is the outcome that loses nothing */
    return 0
  }
}

/** A shape check, not a validator: it exists so a stray key in
 *  localStorage cannot crash the list. Anything it lets through is
 *  already all-value data. */
function isQuoteish(v: unknown): v is QuoteDef {
  if (typeof v !== 'object' || v === null) return false
  const q = v as Partial<QuoteDef>
  return (
    typeof q.id === 'string' &&
    typeof q.reference === 'string' &&
    Array.isArray(q.lines) &&
    Array.isArray(q.adjustments) &&
    Array.isArray(q.sections)
  )
}

/** The sentence to print when saving failed, or null. */
export const persistNote = (): string | null => persistProblem

/* ---------------------------------------------------------- */
/* Reading                                                    */
/* ---------------------------------------------------------- */

export function useQuotes(): QuoteDef[] {
  loadQuotes()
  return useSyncExternalStore(subscribe, getList, getList)
}

export function useQuote(id: string | null | undefined): QuoteDef | undefined {
  loadQuotes()
  const get = useCallback(() => (id ? registry.get(id) : undefined), [id])
  return useSyncExternalStore(subscribe, get, get)
}

export const getQuote = (id: string): QuoteDef | undefined => registry.get(id)

/**
 * Every quote there is, newest first, without a hook.
 *
 * IT EXISTS SO A QUOTE CAN LEAVE THE BROWSER. "Save a copy →
 * Everything" carried tables, rows, modules, pages and rules and no
 * quotes, under a title that says Everything: a dealer who exported,
 * cleared and re-imported lost every quote they had raised, in
 * silence. `exportPayload.ts` said so out loud and named the two
 * things missing — a `quotes` key on the envelope, and a list reader
 * that is not a hook. This is the second one, and it is a reader:
 * nothing here mutates, and the array is a copy of the published
 * snapshot rather than the registry's own.
 *
 * A QUOTE TRAVELS SAFELY BECAUSE IT IS ALREADY A PHOTOGRAPH. Every
 * field on a line is a value, so writing one out and reading it back
 * cannot change a number — which is the whole reason a quote may
 * cross a file boundary at all. A quote that travelled as IDS and
 * landed in a project with different price data would silently
 * re-price a signed deal.
 */
export function allQuotes(): QuoteDef[] {
  loadQuotes()
  return [...list]
}

/* ---------------------------------------------------------- */
/* Writing                                                    */
/* ---------------------------------------------------------- */

function put(quote: QuoteDef): void {
  registry.set(quote.id, quote)
  republish()
  persistSoon()
}

/** Every edit that touches a number, a line or an adjustment goes
 *  through here, and an ISSUED quote refuses all of them. The
 *  screens hide the controls as well; this is the line that makes
 *  the hiding true. */
function mutate(id: string, fn: (q: QuoteDef) => QuoteDef): void {
  const current = registry.get(id)
  if (!current || current.state !== 'draft') return
  put({ ...fn(current), id: current.id, createdAt: current.createdAt, updatedAt: nowIso() })
}

/* -- making one --------------------------------------------- */

/** How many quotes were made on `day` — the second half of a
 *  reference, where `day` is a LOCAL `YYYY-MM-DD` from `localDayOf`.
 *
 *  THE TWO HALVES OF A REFERENCE MUST READ ONE CALENDAR. This took
 *  `.slice(0, 10)` off the stored instants and off `nowIso()` — the
 *  UTC day — while `referenceFor` stamps `20260818` from local
 *  getFullYear/getMonth/getDate. At UTC+10 the two disagreed for the
 *  first ten hours of every local day: the first quote of 18 Aug,
 *  raised at 02:28, stamped `20260818` and counted the 17th's three,
 *  printing `20260818-04`; and two quotes either side of 10:00 local
 *  could both print `-01`. The day now comes from the SAME instant
 *  the stamp is made from, read the same way. See `day.ts`. */
function nthToday(day: string): number {
  return list.filter((q) => localDay(q.createdAt) === day).length + 1
}

/** The reference for a quote minted right now: one `Date`, read once,
 *  so the stamp and the count can never straddle midnight between two
 *  clock reads. All three mints call this rather than pairing
 *  `new Date()` with a separate `nthToday()`. */
function referenceForNow(): string {
  const now = new Date()
  return referenceFor(now, nthToday(localDayOf(now)))
}

/**
 * "Quote this one" — the whole of screen 2 → screen 3.
 *
 * THE PICK IS THE WRITE: the quote is in the registry and on its way
 * to storage before the stage has drawn it. Returns null when the
 * view or the row has gone, so the caller can say so rather than
 * open an empty document.
 */
export function createQuoteFromView(
  viewId: string,
  rowId: string,
  preparedBy?: string,
): QuoteDef | null {
  loadQuotes()
  /* ============================================================
     WHOSE QUOTE THIS IS, STAMPED HERE AND NOT BY THE CALLER.

     THE MEASUREMENT. Home's quotes card offers three lenses —
     Drafts, All, Mine — and Mine was permanently 0. Not filtered
     wrongly: EMPTY, on a sheet where the signed-in person had just
     raised the quote sitting on the screen above it. `preparedBy`
     is what `rollQuotes` matches on and nothing ever wrote it:
     this function has taken the argument since the day it was
     written and all three of its callers omitted it — the subject
     chooser, the catalogue and the module workspace.

     A CALLER IS THE WRONG PLACE TO DECIDE IT. "This quote was
     prepared by whoever is signed in" is a fact about the
     dealership, not about which button was pressed, and three
     buttons agreeing about it by hand is three chances to forget —
     which is exactly what happened. The argument stays, because a
     caller minting on somebody else's behalf is a real thing and
     an explicit name must win; absent, the session answers.

     A NAME AND NOT AN ID, because that is what a quote prints and
     what `rollQuotes` compares. The document freezes it, so a
     salesperson who leaves is still the person who wrote it. */
  const quote = mintQuoteFromView({
    viewId,
    rowId,
    reference: referenceForNow(),
    ...(preparedBy ?? currentUser()?.name
      ? { preparedBy: preparedBy ?? (currentUser()?.name as string) }
      : {}),
  })
  if (!quote) return null
  put(quote)
  return quote
}

/* ============================================================
   THE DRAFT ALREADY STANDING FOR THIS ROW.

   WHAT IT IS FOR, MEASURED. Stepping back from the configurator to
   the picker and forward again minted a SECOND quote for the same
   boat and stranded the first: on a Highfield CL360, reference
   20260829-02 carried a Yamaha and totalled $16,508; New quote →
   Highfield → CL360 → Start the quote landed on 20260829-03 at
   $11,060, and the motor was on a draft nothing on screen mentioned.
   Two attempts, three drafts, and the salesperson's work on the
   screen they had just left.

   Nothing was corrupted and no line was lost — every pick is written
   as it is made, which is this feature's whole invariant — but the
   BUILD was lost, which is what a person means by losing work.

   SO THE PICKER ASKS FIRST. A draft is offered back when it is for
   the same row of the same table and NOBODY HAS BEEN NAMED ON IT:
   an addressed quote is a deal in progress and a second quote for
   the same hull to a different customer is an ordinary Tuesday, so
   that one is left alone and a new one is minted. `issued` is never
   offered back — it is a photograph and takes no edits.

   THE NEWEST WINS, which is what `list` is already sorted by, so a
   person who deliberately raised two comes back to the one they
   were last on rather than to the oldest one they had forgotten.
   ============================================================ */
export function unaddressedDraftFor(tableId: string, rowId: string): QuoteDef | undefined {
  loadQuotes()
  if (tableId === '' || rowId === '') return undefined
  return list.find(
    (q) =>
      q.state === 'draft' &&
      q.rootTableId === tableId &&
      q.rootRowId === rowId &&
      q.customer.name.trim() === '',
  )
}

/** "Make another quote like this one" — mints from TODAY's data,
 *  which is exactly why it is a different quote and not a copy. It
 *  is one of the only two things the kept ids are for. */
export function quoteLikeThisOne(quote: QuoteDef): QuoteDef | null {
  loadQuotes()
  const made = mintQuoteFromView({
    viewId: quote.viewId,
    rowId: quote.rootRowId,
    reference: referenceForNow(),
    ...(quote.preparedBy ? { preparedBy: quote.preparedBy } : {}),
  })
  if (!made) return null
  put(made)
  return made
}

/* -- the quote's own fields ---------------------------------- */

/** The customer, the consultant, the reference, the date, the note
 *  and the tax rate — none of which changes a line.
 *
 *  A key set to `undefined` REMOVES it, so clearing the tax rate
 *  leaves no rate rather than a zero: blank and 0% are different
 *  documents, and only one of them is honest about what we know. */
export function patchQuote(
  id: string,
  patch: Partial<Omit<QuoteDef, 'id' | 'createdAt' | 'lines' | 'sections' | 'state'>>,
): void {
  mutate(id, (q) => {
    /* spread, then strip the keys the caller asked to CLEAR. A
       `taxRate: undefined` left in place serialises as an absent key
       anyway, but `note` and `preparedBy` would linger as the string
       "undefined" through a round trip — and a document is exactly
       where that would show. */
    const bag: Record<string, unknown> = { ...q, ...patch }
    for (const key of Object.keys(patch)) {
      if (bag[key] === undefined) delete bag[key]
    }
    return bag as unknown as QuoteDef
  })
}

/* -- the customer --------------------------------------------- */

/**
 * Address this quote to somebody in the register.
 *
 * ONE WRITE, BOTH HALVES. The details arrive already frozen from
 * `freezeCustomer` and are copied onto the document; the row id is
 * written beside them. Doing it in two patches would leave a frame
 * where a document carried one person's name and another's link.
 *
 * IT OVERWRITES WHAT WAS TYPED, and that is the intent: choosing a
 * customer is saying "this one", and a name half-typed underneath a
 * chosen customer is the ambiguity this control exists to end. What
 * it writes is still ordinary frozen text — the contact lines can be
 * edited on the quote afterwards without touching the register,
 * because they are this document's copy.
 */
export const linkCustomer = (
  id: string,
  frozen: Pick<QuoteDef, 'customer' | 'customerRef'>,
): void => mutate(id, (q) => ({ ...q, customer: frozen.customer, customerRef: frozen.customerRef }))

/**
 * Stop this quote pointing at a row, and KEEP THE NAME.
 *
 * A walk-in who gave a name and no details is a real quote, and so
 * is a quote to somebody who has since been taken out of the
 * register. Both are "a name on a document with no row behind it",
 * which is what this app did for every quote before there was a
 * register at all. So unlinking is subtraction of a pointer and
 * nothing else: not one word of the document moves.
 */
export function unlinkCustomer(id: string): void {
  mutate(id, (q) => {
    const next = { ...q }
    delete next.customerRef
    return next
  })
}

/**
 * THE HISTORY WITH THEM — every quote addressed to one row of the
 * register, newest first.
 *
 * It matches on the id, never on the name, because two people
 * called R. Kelleher are two customers and one person who changed
 * their name is still one. A quote addressed to a typed name has no
 * id and therefore no history; that is honest rather than a gap —
 * nothing in this app ever knew those were the same person.
 */
export function quotesForCustomer(rowId: string): QuoteDef[] {
  loadQuotes()
  if (rowId === '') return []
  return list.filter((q) => q.customerRef?.rowId === rowId)
}

/** The same list, subscribed, for a screen that is drawn while a
 *  quote is being raised in another window. */
export function useCustomerQuotes(rowId: string): QuoteDef[] {
  loadQuotes()
  /* A FILTER IS NOT A SNAPSHOT. `useSyncExternalStore` compares what
     its getter returns by identity, and a getter that filters builds
     a fresh array every time it is asked — which React reads as "it
     changed again" and re-renders forever. So the SUBSCRIPTION takes
     the published list, which is stable between publishes, and the
     filtering happens after it in a memo. */
  const all = useSyncExternalStore(subscribe, getList, getList)
  return useMemo(
    () => (rowId === '' ? [] : all.filter((q) => q.customerRef?.rowId === rowId)),
    [all, rowId],
  )
}

/* ============================================================
   THE WAY BACK FROM A QUOTE EDIT — what undo a quote line actually
   has, established rather than assumed.

   `sayUndoable` / `offerUndo` (`src/store/notes.ts`) are the app's
   usual answer to rule 9, and NEITHER OF THEM WORKS HERE. Both pin
   a `HistoryEntry` off `useProjectStore().past` and refuse if that
   entry is no longer the top of the stack. A quote is not in that
   stack: it lives in the registry above and in localStorage, and
   `mutate` calls `put`, never `record`. So after `addLine` the top
   of `past` is whatever the person last did to the PROJECT —
   renamed a column, moved a step — and a toast built by
   `sayUndoable` would offer to undo the pick and undo THAT instead.
   With an empty stack it would draw the sentence and no button at
   all, which is silence with extra words.

   A TOAST WHOSE UNDO DOES NOT UNDO IS WORSE THAN NO TOAST, so
   nothing in this file reaches for that helper. The mechanism a
   quote line has is the one `removeLine` already built and the one
   `Dashboard.tsx:48`, `Board.tsx:271` and `dealDesk.ts` reach for
   on the same grounds: THE ACT CARRIES ITS OWN INVERSE, closed over
   the values it needs, and the inverse is applied through `mutate`
   so the draft/issued line holds on the way back as well.

   The two helpers below are what the three acts share: the refusal
   sentences, said once, and the amount a note names.
   ============================================================ */

/** The draft an UNDO is about, or `null` with the refusal already
 *  said where it happened (rule 10).
 *
 *  AN ISSUED QUOTE TAKES NO EDITS — `mutate` is the line that makes
 *  that true — and a button that silently did nothing would be worse
 *  than no button. The only way to reach either sentence is to give
 *  the quote to the customer with the note still up. */
function draftForUndo(id: string): QuoteDef | null {
  const now = registry.get(id)
  if (!now) {
    say({ text: 'That quote is no longer here.', tone: 'warn' })
    return null
  }
  if (now.state !== 'draft') {
    say({
      text: 'This quote has been given to the customer, so nothing can go back on it. Make a new version to change it.',
      tone: 'warn',
    })
    return null
  }
  return now
}

/** A note about a line NAMES THE AMOUNT — `CONFIGURATOR_PLAYBOOK.md`
 *  §"Applying a fix": *"Toast with UNDO, naming the item and the
 *  amount."* A line with no price says so in the screen's own words
 *  rather than printing $0, which is the one thing `totals.ts`
 *  exists to refuse.
 *
 *  IT IS STATIC TEXT. Rule: money never animates — this is a figure
 *  in a sentence about something that has already happened, never a
 *  total counting up, and the committed total on the price bar is
 *  not touched by it. */
function naming(line: QuoteLine, said: string): string {
  const { amount } = lineAmount(line)
  return amount === null ? `${said} · no price on it` : `${said} · ${money(amount)}`
}

/* -- the level ----------------------------------------------- */

/* RE-PRICING ONE LINE IS `repricedAt` IN `pricing.ts` and is not
   written here. `conflict.ts` shows a person what a level change
   WOULD do to every line before they accept it, and a preview
   computed by a second copy of that arithmetic is a preview that can
   disagree with the act it is previewing. One function, called by
   both. */

/**
 * MOVE THE WHOLE QUOTE TO A RUNG — and DECISIONS.md §1's third
 * bullet: *"raise the toast after Accept too, so accepting a sheet
 * is as reversible as any other act."*
 *
 * THE TOAST IS HERE AND NOT ON THE SHEET, because this is the act.
 * `QuoteBuild` reaches it twice — straight through when
 * `levelConflict` finds nothing to decide, and from the sheet's
 * Accept — and `QuoteEditor`'s rung buttons reach it a third way.
 * One act, one sentence, one way back; a toast raised at each of the
 * three call sites is three chances to forget one, which is the
 * shape of the `preparedBy` bug recorded above.
 *
 * WHAT THE UNDO PUTS BACK, and what it deliberately does not. A
 * level change touches exactly the five `PricedAt` fields on each
 * line, so the way back restores exactly those five FROM THE FROZEN
 * COPY taken before the write — the same by-value discipline
 * `removeLine` keeps, and the reason a rung with no column on some
 * table lands back on the column it really used rather than on a
 * recomputed guess.
 *
 * A line the person added while the note stood is NOT reverted and
 * is not left at the wrong rung either: it was never in the frozen
 * copy, so it is priced at the old rung through the same
 * `repricedAt` the forward pass used. An undo that threw away work
 * done after the act it undoes is the lie `notes.ts` was written to
 * prevent; this one only ever moves the thing it moved.
 *
 * THE SENTENCE NAMES THE RUNG AND NOT A FIGURE. The item here is the
 * rung, in the business's own word — the one printed on the control
 * that was pressed. The amount is the whole total, it is already on
 * the price bar, and a note restating it is a second running total
 * that can disagree with the first.
 */
export function setLevel(id: string, levelKey: string): void {
  const before = registry.get(id)
  if (!before || before.state !== 'draft') return
  /* NOTHING HAPPENED, SO NOTHING IS SAID. `levelConflict` already
     returns null on this case; a note reporting a rung that was
     already the rung is a full stop with no act behind it. */
  if (before.levelKey === levelKey) return

  const wasKey = before.levelKey
  const was = new Map(before.lines.map((l) => [l.id, l]))
  /* THE WORD ON THE CONTROL THAT WAS PRESSED. `quoteLevelChoices`
     reads the quote's own frozen rungs — the same list the price bar
     draws its buttons from — so the note says "Trade" where the
     button said Trade. Read once, for both directions; a key the
     model has no title for falls back to the key rather than to a
     blank, because the business's vocabulary outranks ours. */
  const rungs = quoteLevelChoices(before.lines)
  const named = (key: string): string => rungs.find((c) => c.key === key)?.label ?? key

  mutate(id, (q) => ({ ...q, levelKey, lines: q.lines.map((l) => repricedAt(l, levelKey)) }))

  say({
    text: `Priced at ${named(levelKey)}`,
    act: {
      label: 'Undo',
      onPick: () => {
        const now = draftForUndo(id)
        if (!now) return
        if (now.levelKey !== levelKey) return

        mutate(id, (q) => ({
          ...q,
          levelKey: wasKey,
          lines: q.lines.map((l) => {
            const then = was.get(l.id)
            if (!then) return repricedAt(l, wasKey)
            return {
              ...l,
              unitPrice: then.unitPrice,
              priceFieldId: then.priceFieldId,
              priceColumnName: then.priceColumnName,
              levelKey: then.levelKey,
              levelResolved: then.levelResolved,
            }
          }),
        }))
        say({ text: `Priced at ${named(wasKey)} again` })
      },
    },
  })
}

/** One line's own rung — `Sell inc Install (if appl.)` on a part,
 *  `Warranty` on a hull. It SWITCHES which frozen number the line
 *  charges and never adds a second one: `Sell` + `Labour ($)` is the
 *  double-charge the whole price ladder exists to avoid. */
/**
 * PRICE ONE LINE AT A DIFFERENT RUNG — and the way back.
 *
 * THE ASYMMETRY THIS CLOSES is the one `addLine` closed a wave
 * earlier, one level down. `setLevel` re-prices the WHOLE quote and
 * has toasted with an UNDO since it was written; this re-prices one
 * line and said nothing at all — so moving a motor from Sell to Trade
 * changed a figure a customer is about to be handed, silently, with
 * no way back but remembering which rung it had been on.
 *
 * CONFIGURATOR §C: every pick is a toast with UNDO, never a
 * confirmation. This is a pick — a chip per rung, pressed.
 *
 * THE NOTE NAMES THE RUNG IN THE BUSINESS'S OWN WORD, not the key:
 * `quoteLevelChoices` reads the labels off the line's own levels, so
 * a dealer who calls it "Sub Dealer" reads "Sub Dealer".
 *
 * TYPING IS NOT A PICK, and `setQty` and the override field stay
 * silent for the store's own reason about `updateCell`: nothing about
 * a number you just typed is invisible a second later, and a toast per
 * keystroke is noise where a person is reading a total.
 */
export function setLineLevel(id: string, lineId: string, levelKey: string): void {
  const before = registry.get(id)
  if (!before || before.state !== 'draft') return

  const line = before.lines.find((l) => l.id === lineId)
  if (!line) return
  /* THE RUNG IT WAS ON, captured before the write. `levelResolved` is
     what the line is actually priced at — the quote's rung where the
     line has not been moved, its own where it has — so undoing puts
     back the price a person was looking at rather than the quote's. */
  const wasKey = line.levelResolved
  if (wasKey === levelKey) return

  const label = (key: string): string =>
    line.levels.find((l) => l.key === key)?.label ?? key

  mutate(id, (q) => ({
    ...q,
    lines: q.lines.map((l) =>
      l.id === lineId ? { ...l, ...priceAtLevel(l.levels, levelKey) } : l,
    ),
  }))

  say({
    text: `${line.label} priced at ${label(levelKey)}`,
    act: {
      label: 'Undo',
      onPick: () => {
        const now = draftForUndo(id)
        if (!now) return
        /* the line may have gone since — putting a price back on a
           line that is off the quote would be writing to nothing */
        if (!now.lines.some((l) => l.id === lineId)) return
        mutate(id, (q) => ({
          ...q,
          lines: q.lines.map((l) =>
            l.id === lineId ? { ...l, ...priceAtLevel(l.levels, wasKey) } : l,
          ),
        }))
        say({ text: `${line.label} is priced at ${label(wasKey)} again` })
      },
    },
  })
}

/* -- lines ---------------------------------------------------- */

/**
 * Put a minted line on the quote, in its section — AND THE WAY BACK.
 * The line arrives already frozen from `mintLine`, so nothing is
 * read here.
 *
 * THE ASYMMETRY THIS CLOSES, AND WHY IT IS THE ORDINARY CASE.
 * `removeLine` has toasted since it was written and this said
 * nothing at all: taking a motor off announced itself and offered a
 * way back, putting one on was silent. `DECISIONS.md` §1 names that
 * a defect and settles the rule it was on the wrong side of —
 * `CONFIGURATOR_PLAYBOOK.md:344-346`, which both `CONFIGURATOR.md`
 * §C and this feature's own code had missed:
 *
 *   · **A sheet** when priced alternatives survive. The person is
 *     choosing, and a toast cannot hold a priced radio group —
 *     `ToastAct` is ONE act, deliberately (`Toasts.tsx:19-25`: "a
 *     note is read at a glance and a glance holds one decision").
 *     That is not a limitation to work around, it is the reason the
 *     rule splits at all.
 *   · **A toast with UNDO** when no alternative survives. There is
 *     nothing to choose, only something to reverse.
 *
 * EVERY ORDINARY PICK IS THE SECOND CASE TODAY, and that is a
 * measurement rather than a hope: no pick on this screen can
 * invalidate another line (`freeze.ts:1077-1086`), `optionConflict`
 * has no callers and nothing on the seeded file emits a runnable
 * rule, so a pick removes nothing, offers no alternative, and has
 * exactly one thing that can be done about it — take it back off.
 * The day a dealer writes a rule that runs, the sheet is what that
 * pick gets and this note is what the sheet's Accept raises.
 *
 * THE INVERSE IS EXACT AND IT IS NOT `removeLine`. Removing the line
 * this call added restores the document as it stood, so the way back
 * is the raw write and not the neighbouring function — `removeLine`
 * would raise its own toast offering to undo the undo, and a note
 * that answers a note is two events a person did not cause.
 */
export function addLine(id: string, blockId: string, line: QuoteLine): void {
  const before = registry.get(id)
  /* THE NOTE REPORTS A WRITE THAT HAPPENED. `mutate` refuses an
     issued quote, so without this the sentence would announce a line
     that is not on the document. */
  if (!before || before.state !== 'draft') return

  mutate(id, (q) => ({
    ...q,
    lines: [...q.lines, line],
    sections: q.sections.map((s) =>
      s.blockId === blockId ? { ...s, lineIds: [...s.lineIds, line.id] } : s,
    ),
  }))

  say({
    text: naming(line, `${line.label} put on the quote`),
    act: {
      label: 'Undo',
      onPick: () => {
        const now = draftForUndo(id)
        if (!now) return
        /* ALREADY OFF — the person took it back by hand while the
           note stood. Nothing to do and nothing to say: `removeLine`
           has already said it. */
        if (!now.lines.some((l) => l.id === line.id)) return

        mutate(id, (q) => ({
          ...q,
          lines: q.lines.filter((l) => l.id !== line.id),
          sections: q.sections.map((s) => ({
            ...s,
            lineIds: s.lineIds.filter((x) => x !== line.id),
          })),
        }))
        say({ text: `${line.label} is off the quote again` })
      },
    },
  })
}

/** A typed line — the workbook's own `Additional Dealer Options`
 *  (R136:Y151, eight of them). A label and an amount, and nothing
 *  computed: the workbook turns typed HOURS into money at MV!$D$2
 *  ($159/hr) and we do not have that rate, so we do not offer hours.
 *
 *  NO TOAST, AND THE REASON IS THAT NOTHING CALLS IT. `addLine` above
 *  is the pick DECISIONS.md §1 is about and it has three call sites;
 *  this has none outside `index.ts`'s export list, so there is no act
 *  on any screen for a note to report. It also mints a line from a
 *  label a person is about to type, and the sentence "` ` put on the
 *  quote · no price on it" is what a note fired here would say. When
 *  a surface calls it, it gets the same treatment `addLine` has. */
export function addFreeLine(id: string, label: string, amount: number | null): void {
  const current = registry.get(id)
  if (!current) return
  const line = mintFreeLine(label, amount, current.levelKey)
  mutate(id, (q) => ({
    ...q,
    lines: [...q.lines, line],
    sections: q.sections.map((s, i) =>
      /* it belongs to no block, so it lands at the foot of the last
         section rather than in a heading a person never made */
      i === q.sections.length - 1 ? { ...s, lineIds: [...s.lineIds, line.id] } : s,
    ),
  }))
}

/**
 * Taking a line off, AND THE WAY BACK — rule 9, which asks that an
 * undoable act get a toast with UNDO rather than a dialog.
 *
 * IT COULD NOT BE UNDONE AT ALL BEFORE, AND NOTHING SAID SO. The
 * control is a 24px × on a card in the middle of a shelf of them, on
 * the screen a salesperson uses with a customer standing there, and
 * the only route back was to find the same row in the same list and
 * pick it again — which on a narrowed step whose search has since
 * been typed into is not one click. Ctrl+Z cannot help either: the
 * project store's history knows nothing about a quote, because a
 * quote is a photograph and lives in this registry.
 *
 * SO THE ACT CARRIES ITS OWN WAY BACK, and it is not a re-pick: the
 * line is put back BY VALUE, in the section it was on and at the
 * position it held, so the frozen number, the column it came from,
 * the level, the join's own facts and the provenance are the ones
 * that were there — never today's reading of them. That is the whole
 * invariant this feature is built on, and an undo that re-minted the
 * line would break it at the one moment a person is least able to
 * notice.
 *
 * The bus drops the note when no host is mounted, which is why this
 * is safe to call from a store-level write. See `src/store/notes.ts`.
 *
 * IT NAMES THE AMOUNT NOW, because `addLine` does. The two notes are
 * one act read in two directions and a salesperson who hears the
 * figure going on should hear it coming off; the playbook asks for
 * the item AND the amount on both. The refusal sentences moved to
 * `draftForUndo` unchanged — three acts now share them, and one
 * wording is the point of putting them in one place.
 */
export function removeLine(id: string, lineId: string): void {
  const before = registry.get(id)
  if (!before || before.state !== 'draft') return

  const at = before.lines.findIndex((l) => l.id === lineId)
  if (at < 0) return
  const line = before.lines[at]
  const section = before.sections.find((s) => s.lineIds.includes(lineId))
  const where = section ? section.lineIds.indexOf(lineId) : -1

  mutate(id, (q) => ({
    ...q,
    lines: q.lines.filter((l) => l.id !== lineId),
    sections: q.sections.map((s) => ({ ...s, lineIds: s.lineIds.filter((x) => x !== lineId) })),
  }))

  say({
    text: naming(line, `${line.label} taken off the quote`),
    act: {
      label: 'Undo',
      onPick: () => {
        const now = draftForUndo(id)
        if (!now) return
        if (now.lines.some((l) => l.id === lineId)) return

        mutate(id, (q) => ({
          ...q,
          lines: put_at(q.lines, line, at),
          sections: q.sections.map((s) =>
            section && s.blockId === section.blockId
              ? { ...s, lineIds: put_at(s.lineIds, lineId, where) }
              : s,
          ),
        }))
        say({ text: `${line.label} is back on the quote` })
      },
    },
  })
}

/** Put one thing back where it was. The index is where it SAT, so a
 *  line removed from the middle of a step returns to the middle of it
 *  rather than to the end — the order of a quote is the order the
 *  salesperson put it in, and it is printed. */
function put_at<T>(items: readonly T[], item: T, index: number): T[] {
  const next = [...items]
  next.splice(index < 0 || index > next.length ? next.length : index, 0, item)
  return next
}

/** Quantity has a workbook precedent — `MV!G23` multiplies trailer
 *  registration by `$M$54`. Zero and nonsense fall back to one: a
 *  line on a quote is at least one of something. */
export const setQty = (id: string, lineId: string, qty: number): void =>
  mutate(id, (q) => ({
    ...q,
    lines: q.lines.map((l) =>
      l.id === lineId ? { ...l, qty: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1 } : l,
    ),
  }))

/**
 * An override NEVER overwrites `unitPrice`. It is written BESIDE the
 * frozen original with an optional reason, and the document prints
 * the original struck through next to it.
 *
 * This is production's one genuinely good pricing idea — a snapshot
 * carrying its pricing source plus the original figure, so an
 * auditor can compute the delta later without re-resolving anything
 * — and it is the same discipline as PairOrigin on a view and
 * BlockedValue on a constraint: THE REASON IS WRITTEN AT THE MOMENT
 * OF THE DECISION, never reconstructed afterwards.
 */
export const setOverride = (
  id: string,
  lineId: string,
  price: number | undefined,
  reason: string | undefined,
): void =>
  mutate(id, (q) => ({
    ...q,
    lines: q.lines.map((l) => {
      if (l.id !== lineId) return l
      const next = { ...l }
      if (price === undefined || !Number.isFinite(price)) {
        delete next.overridePrice
        delete next.overrideReason
        return next
      }
      next.overridePrice = price
      if (reason !== undefined && reason.trim() !== '') next.overrideReason = reason
      else delete next.overrideReason
      return next
    }),
  }))

/* -- adjustments ---------------------------------------------- */

/** Which way each control signs what a person types. A discount, a
 *  rebate and a trade-in are CREDITS: asking a salesperson to
 *  remember a minus sign is asking to be silently wrong on the day
 *  they forget, and the workbook's own `Dealer Discount Given`
 *  (AB169) carries its instruction in the cell beside it for exactly
 *  that reason.
 *
 *  IT SIGNS WHAT A PERSON TYPES, and nothing else. An adjustment
 *  arriving from a FILE keeps the signed amount the file carries and
 *  is never re-signed here: re-deriving it would change a total on
 *  import, and a quote whose total moves because it crossed a file
 *  boundary is the one failure this whole feature exists to prevent.
 *  See `normAdjustments` in features/io/envelope.ts. */
const SIGN: Record<AdjustmentKind, -1 | 1> = {
  discount: -1,
  rebate: -1,
  tradeIn: -1,
  line: 1,
}

/**
 * A new adjustment row, with an EMPTY label and a zero amount.
 *
 * Nothing is pre-filled and nothing is suggested. The rebate names
 * and amounts live in `Boat Module` AB259/AB260 and `Motor Library`
 * BB23/BB54 and NEITHER is a column in our data; the workbook's own
 * campaign banner is a string in a cell, not a rule. So this is a
 * sentence a person may type, never a discount a program applies.
 */
export function addAdjustment(id: string, kind: AdjustmentKind): string | null {
  const current = registry.get(id)
  if (!current || current.state !== 'draft') return null
  const adj: QuoteAdjustment = { id: newId(), kind, label: '', amount: 0 }
  mutate(id, (q) => ({ ...q, adjustments: [...q.adjustments, adj] }))
  return adj.id
}

/** The label and the note. The AMOUNT is not patched here — it has
 *  its own entry point, because its sign is not the typist's
 *  business. */
export const updateAdjustment = (
  id: string,
  adjId: string,
  patch: Partial<Pick<QuoteAdjustment, 'label' | 'note'>>,
): void =>
  mutate(id, (q) => ({
    ...q,
    adjustments: q.adjustments.map((a) => (a.id === adjId ? { ...a, ...patch } : a)),
  }))

/** What a person typed is a MAGNITUDE; the sign belongs to which
 *  control they pressed. "3000" on a discount is −$3,000 on the
 *  document and −$3,000 in the total, whichever way it was typed. */
export const setAdjustmentMagnitude = (id: string, adjId: string, magnitude: number): void =>
  mutate(id, (q) => ({
    ...q,
    adjustments: q.adjustments.map((a) =>
      a.id === adjId
        ? { ...a, amount: Number.isFinite(magnitude) ? Math.abs(magnitude) * SIGN[a.kind] : 0 }
        : a,
    ),
  }))

export const removeAdjustment = (id: string, adjId: string): void =>
  mutate(id, (q) => ({ ...q, adjustments: q.adjustments.filter((a) => a.id !== adjId) }))

/* -- today's prices -------------------------------------------- */

/**
 * Apply a diff a person has ALREADY SEEN.
 *
 * Two decisions, never one: `priceChanges` (freeze.ts) says what
 * would move, and this moves it. A silent restatement is worse than
 * a stale number, because the salesperson believes the page.
 */
export const applyPriceChanges = (id: string, changes: PriceChange[]): void =>
  mutate(id, (q) => {
    const byLine = new Map(changes.filter((c) => !c.gone).map((c) => [c.lineId, c]))
    return {
      ...q,
      lines: q.lines.map((l) => {
        const change = byLine.get(l.id)
        if (!change) return l
        return { ...l, levels: change.levels, ...priceAtLevel(change.levels, q.levelKey) }
      }),
    }
  })

/* -- issuing --------------------------------------------------- */

/**
 * The moment it is given to a customer. Everything that makes a
 * number becomes read-only, and "re-read today's prices" is gone.
 * Nothing expires: the workbook's own validity is a typed sentence
 * on the sheet, and production's complete, correct expiry module
 * never fires because nothing writes the date it reads.
 *
 * IT REFUSES EVERYTHING THAT CANNOT BE REPAIRED AFTERWARDS, and the
 * list of those is `issueBlockers` in totals.ts — no customer name,
 * nothing on the document, a total of nought that nobody decided on,
 * and a line carrying a price somebody typed with no reason beside it.
 * Each is argued where it is written. The list is shared with the screen so
 * the button, the sentence under it and this function cannot disagree
 * about whether a given quote may go out.
 *
 * Returns whether the quote was issued, so the screen can say why
 * not rather than appearing to do nothing. The screen ALSO disables
 * the button and prints the sentences beside it — this is the line
 * that makes the refusal true, the way `mutate` is the line that
 * makes an issued quote's read-only controls true.
 */
export function issueQuote(id: string): boolean {
  const q = registry.get(id)
  if (!q || q.state !== 'draft') return false
  if (issueBlockers(q).length > 0) return false
  mutate(id, (x) => ({ ...x, state: 'issued', issuedAt: nowIso() }))
  return true
}

/**
 * "Make a new version" — the only action left on an issued quote.
 *
 * A copy in a fresh draft carrying `supersedesId`, so the
 * conversation has a history and neither document was edited behind
 * anyone's back. ONE link, deliberately, and not a chain model:
 * production's versioning module keys chains on a `rootQuoteId` that
 * nothing writes, and a chain model with no chain is not honest.
 */
export function makeNewVersion(id: string): QuoteDef | null {
  const from = registry.get(id)
  if (!from) return null
  const now = nowIso()
  const idMap = new Map<string, string>()
  const lines: QuoteLine[] = from.lines.map((l) => {
    const fresh = newId()
    idMap.set(l.id, fresh)
    return { ...l, id: fresh }
  })
  const copy: QuoteDef = {
    ...from,
    id: newId(),
    reference: referenceForNow(),
    state: 'draft',
    lines,
    sections: from.sections.map((s) => ({
      ...s,
      lineIds: s.lineIds.map((x) => idMap.get(x)).filter((x): x is string => x !== undefined),
    })),
    adjustments: from.adjustments.map((a) => ({ ...a, id: newId() })),
    supersedesId: from.id,
    createdAt: now,
    updatedAt: now,
  }
  delete copy.issuedAt
  put(copy)
  return copy
}

/**
 * Throw away a draft nobody wants.
 *
 * AN ISSUED QUOTE IS NEVER DELETED: it was given to a customer, and
 * a document that can vanish cannot answer "what did we quote them?"
 * a month later. Same principle as a removed pair on a view — the
 * record stays and the state changes.
 */
export function discardDraft(id: string): boolean {
  const q = registry.get(id)
  if (!q || q.state !== 'draft') return false
  registry.delete(id)
  republish()
  persistSoon()
  return true
}

/** Import / test seam — put a quote in exactly as given. */
export function registerQuote(quote: QuoteDef): void {
  loadQuotes()
  put(quote)
}

/** Put this module back to how it was at import — the registry, the
 *  published list, the sticky persist note and the one-shot `loaded`
 *  latch (:169) that stops `loadQuotes` reading twice.
 *
 *  FOR TESTS, and not a product feature: nothing in the app calls it,
 *  the same way nothing calls `forgetTileOrder` (dashboard/tileOrder.ts:107).
 *  Vitest gives one process's module state to every case in a file, so
 *  a quote seeded through `registerQuote` is in for the rest of it —
 *  which is why `tiles.test.tsx:347` had to put its count assertion
 *  last and write a comment explaining that anything asserting "no
 *  quotes" must run above it.
 *
 *  The pending write-behind goes too: a 400 ms timer that outlives
 *  the reset fires into whatever case is running next. `hookedTabClose`
 *  deliberately STAYS set — it guards one `addEventListener` per
 *  window, and a window this function does not replace would collect a
 *  second `pagehide` listener per call. */
export function forgetQuotes(): void {
  if (writeTimer !== undefined) clearTimeout(writeTimer)
  writeTimer = undefined
  registry.clear()
  persistProblem = null
  loaded = false
  republish()
}
