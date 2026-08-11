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

import { useCallback, useSyncExternalStore } from 'react'
import { newId, nowIso } from '@/lib/id'
import { mintFreeLine, mintQuoteFromView, referenceFor, type PriceChange } from './freeze'
import { priceAtLevel } from './pricing'
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

/** Write-behind at 400 ms — the same interval the project store
 *  uses, so typing a customer's name does not write the whole
 *  document once per keystroke. */
function persistSoon(): void {
  if (typeof localStorage === 'undefined') return
  if (writeTimer !== undefined) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
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
    republish()
  }, 400)
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

/** How many quotes were made today — the second half of a
 *  reference. */
function nthToday(): number {
  const today = nowIso().slice(0, 10)
  return list.filter((q) => q.createdAt.slice(0, 10) === today).length + 1
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
    reference: referenceFor(new Date(), nthToday()),
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
    reference: referenceFor(new Date(), nthToday()),
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

/* -- the level ----------------------------------------------- */

/**
 * Re-price one line at a whole-quote rung, FROM ITS OWN FROZEN
 * RUNGS. No store read: every rung this row carries was captured at
 * pick time, so a level change is arithmetic on a photograph and
 * cannot pick up Tuesday's reimport on Friday.
 *
 * A line whose current rung is LINE-SCOPED is left alone. `fitted`
 * on a part and `warranty` on a hull are deliberate per-line
 * decisions; sweeping them away when the quote moves from cash to
 * trade would silently un-fit a fitted part and move the total with
 * no visible cause.
 */
function repriced(line: QuoteLine, levelKey: string): QuoteLine {
  const current = line.levels.find((l) => l.key === line.levelKey)
  if (current && current.scope === 'line') return line
  if (line.levels.length === 0) return { ...line, levelKey, levelResolved: levelKey }
  return { ...line, ...priceAtLevel(line.levels, levelKey) }
}

export const setLevel = (id: string, levelKey: string): void =>
  mutate(id, (q) => ({ ...q, levelKey, lines: q.lines.map((l) => repriced(l, levelKey)) }))

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

/** Taking a line off is a real removal: unlike a pair on a view,
 *  nothing about it is worth keeping — the row it came from is still
 *  on the sheet, and picking it again is one click. */
export const removeLine = (id: string, lineId: string): void =>
  mutate(id, (q) => ({
    ...q,
    lines: q.lines.filter((l) => l.id !== lineId),
    sections: q.sections.map((s) => ({ ...s, lineIds: s.lineIds.filter((x) => x !== lineId) })),
  }))

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
 *  that reason. */
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

/** The moment it is given to a customer. Everything that makes a
 *  number becomes read-only, and "re-read today's prices" is gone.
 *  Nothing expires: the workbook's own validity is a typed sentence
 *  on the sheet, and production's complete, correct expiry module
 *  never fires because nothing writes the date it reads. */
export const issueQuote = (id: string): void =>
  mutate(id, (q) => ({ ...q, state: 'issued', issuedAt: nowIso() }))

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
    reference: referenceFor(new Date(), nthToday()),
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
