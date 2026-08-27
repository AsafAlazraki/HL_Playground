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
/* THE APP'S ONE PLACE FOR SAYING WHAT HAS JUST HAPPENED. It is a
   bus, not a store read: `say` touches no project data, and this
   file is already downstream of `freeze.ts`, which is the single
   place in this feature that may see the live sheet. */
import { say } from '@/store/notes'
import { localDay, localDayOf } from './day'
import { mintFreeLine, mintQuoteFromView, referenceFor, type PriceChange } from './freeze'
import { priceAtLevel, repricedAt } from './pricing'
import { issueBlockers } from './totals'
import type { AdjustmentKind, QuoteAdjustment, QuoteDef, QuoteLine } from './types'

/* ---------------------------------------------------------- */
/* The registry                                               */
/* ---------------------------------------------------------- */

const STORE_KEY = 'helmlogic.quotes.v1'

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
    localStorage.setItem(STORE_KEY, JSON.stringify(list))
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
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw === null) return
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    for (const q of parsed) if (isQuoteish(q)) registry.set(q.id, q)
    republish()
  } catch {
    persistProblem = 'Saved quotes could not be read back, and were left alone.'
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
  const quote = mintQuoteFromView({
    viewId,
    rowId,
    reference: referenceForNow(),
    ...(preparedBy ? { preparedBy } : {}),
  })
  if (!quote) return null
  put(quote)
  return quote
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

/* -- the level ----------------------------------------------- */

/* RE-PRICING ONE LINE IS `repricedAt` IN `pricing.ts` and is not
   written here. `conflict.ts` shows a person what a level change
   WOULD do to every line before they accept it, and a preview
   computed by a second copy of that arithmetic is a preview that can
   disagree with the act it is previewing. One function, called by
   both. */

export const setLevel = (id: string, levelKey: string): void =>
  mutate(id, (q) => ({ ...q, levelKey, lines: q.lines.map((l) => repricedAt(l, levelKey)) }))

/** One line's own rung — `Sell inc Install (if appl.)` on a part,
 *  `Warranty` on a hull. It SWITCHES which frozen number the line
 *  charges and never adds a second one: `Sell` + `Labour ($)` is the
 *  double-charge the whole price ladder exists to avoid. */
export const setLineLevel = (id: string, lineId: string, levelKey: string): void =>
  mutate(id, (q) => ({
    ...q,
    lines: q.lines.map((l) =>
      l.id === lineId ? { ...l, ...priceAtLevel(l.levels, levelKey) } : l,
    ),
  }))

/* -- lines ---------------------------------------------------- */

/** Put a minted line on the quote, in its section. The line arrives
 *  already frozen from `mintLine`, so nothing is read here. */
export const addLine = (id: string, blockId: string, line: QuoteLine): void =>
  mutate(id, (q) => ({
    ...q,
    lines: [...q.lines, line],
    sections: q.sections.map((s) =>
      s.blockId === blockId ? { ...s, lineIds: [...s.lineIds, line.id] } : s,
    ),
  }))

/** A typed line — the workbook's own `Additional Dealer Options`
 *  (R136:Y151, eight of them). A label and an amount, and nothing
 *  computed: the workbook turns typed HOURS into money at MV!$D$2
 *  ($159/hr) and we do not have that rate, so we do not offer hours. */
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
    text: `${line.label} taken off the quote`,
    act: {
      label: 'Undo',
      onPick: () => {
        /* THE REFUSAL IS SAID WHERE IT HAPPENS. An issued quote takes
           no edits — `mutate` is the line that makes that true — and a
           button that silently did nothing would be worse than no
           button. The only way to reach this is to give the quote to
           the customer with the note still up. */
        const now = registry.get(id)
        if (!now) {
          say({ text: 'That quote is no longer here.', tone: 'warn' })
          return
        }
        if (now.state !== 'draft') {
          say({
            text: 'This quote has been given to the customer, so nothing can go back on it. Make a new version to change it.',
            tone: 'warn',
          })
          return
        }
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
