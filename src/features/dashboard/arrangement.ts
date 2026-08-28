/* ============================================================
   THE ARRANGEMENT — whose dashboard this is, and how they left it.

   WHAT IT HOLDS. Two ordered lists and one flag: the CARDS on the
   page, the QUICK LINKS above them, and whether the person has
   ever changed either. Nothing else. It is a preference, not
   data: no figure on the dashboard is stored here, because every
   figure is counted from the project at paint (see cards.ts).
   Storing a count would be the one way this file could start
   lying, so it holds none.

   WHY IT IS PER USER **AND** PER ORG. `AppUser` carries both
   (features/auth/session.ts) and the seam for many organisations
   is already declared there. One key made of both means a second
   person signing into this browser gets their own dashboard
   rather than inheriting somebody else's, and the day one person
   belongs to two dealerships they get one arrangement each. It
   costs one string.

   WHY LOCAL STORAGE AND NOT THE PROJECT STORE. `useProjectStore`
   is the sheet — tables, rows, rules, modules — and everything in
   it travels in a saved copy of the project. A person's card
   order is not part of anybody's price file, and shipping it
   inside an export would hand one dealer another dealer's
   dashboard. It follows the convention this app already uses for
   exactly this class of thing: the finder's recent picks
   (features/search/recent.ts), the module rule registry, the seed
   stamp, and quotes themselves.

   EVERY READ AND WRITE IS GUARDED, and every failure ends in the
   DEFAULT arrangement. Storage throws in a private window, throws
   on a full quota, and hands back another script's shape when a
   key collides. A dashboard that cannot draw because its
   preferences would not parse is a catastrophic trade for a
   convenience.

   ANYTHING NOT UNDERSTOOD IS DROPPED, NEVER REPAIRED. A card id
   this build does not know — written by a later build, or by a
   corrupted write — is discarded, and the surviving order is
   kept. A half-understood record is how one bad write becomes a
   permanently wrong page.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import { newId } from '@/lib/id'

/* ---------------------------------------------------------- */
/* The cards there are                                        */
/* ---------------------------------------------------------- */

/** Every card this build can draw. Adding one is adding a member
 *  here, a meta entry in `cards.ts` and a body in `CardBody.tsx`
 *  — and nothing else, because the arrangement stores ids only. */
export type CardId =
  | 'my-quotes'
  | 'activity'
  | 'recently-opened'
  | 'my-modules'
  | 'the-price-file'
  | 'data-quality'
  | 'rules-warning'

export const CARD_IDS: readonly CardId[] = [
  'my-modules',
  'my-quotes',
  'activity',
  'the-price-file',
  'recently-opened',
  'data-quality',
  'rules-warning',
]

export const isCardId = (v: unknown): v is CardId =>
  typeof v === 'string' && (CARD_IDS as readonly string[]).includes(v)

/* ---------------------------------------------------------- */
/* The places a quick link can go                             */
/* ---------------------------------------------------------- */

/** WHERE A FAST ACTION LANDS. Seven of them are places the app
 *  already has one of; two name a subject — a table, or a module
 *  — and are the reason this is a union rather than a string.
 *
 *  A target that names a subject is RESOLVED AT PAINT and never
 *  trusted (see links.ts). A table can be deleted and a project
 *  can be replaced wholesale from Import; a button that opens
 *  nothing is worse than no button. */
export type LinkTarget =
  | { kind: 'new-quote' }
  | { kind: 'find' }
  | { kind: 'quotes' }
  | { kind: 'customers' }
  | { kind: 'rules' }
  | { kind: 'data-model' }
  | { kind: 'modules' }
  | { kind: 'table'; entityId: string }
  | { kind: 'module'; moduleId: string }

export type LinkKind = LinkTarget['kind']

/** The kinds that name no subject, so a tray can offer them
 *  without asking the project anything. */
export const PLAIN_LINK_KINDS: readonly LinkKind[] = [
  'new-quote',
  'find',
  'quotes',
  'customers',
  'rules',
  'data-model',
  'modules',
]

export interface QuickLink {
  /** local to this arrangement; it is a React key and nothing else */
  id: string
  target: LinkTarget
  /** WHAT THE PERSON CALLED IT. Absent means the target's own
   *  name, which is what almost every link keeps. A dealer who
   *  writes "Monday's list" over a table's name is naming their
   *  own morning, and this is where that word lives. */
  name?: string
}

export interface Arrangement {
  cards: CardId[]
  links: QuickLink[]
  /** false until the person moves, adds, removes or renames
   *  something. It is what lets the page say, once, that the
   *  arrangement it is showing is the one we started them with
   *  and can be changed — and then stop saying it. */
  touched: boolean
}

/* ---------------------------------------------------------- */
/* The arrangement a new person starts with                   */
/* ---------------------------------------------------------- */

/** THE DEFAULT IS THREE CARDS, AND IT USED TO BE FIVE.
 *
 *  'my-quotes', 'quotes-by-state' and 'recently-opened' were
 *  three boxes asking three versions of one question, and two of
 *  them were a headline over a number. The quotes card now holds
 *  the states as filters INSIDE it, so the answer to "how many
 *  are still drafts" is a chip on the card that lists them
 *  rather than a card of its own — and drafts is the filter it
 *  opens on, because a resumable draft is the most valuable
 *  thing on this screen.
 *
 *  'quotes-by-state' is therefore gone from the catalogue and
 *  not merely off the default: a card whose whole content is now
 *  drawn inside another card is a duplicate, and an arrangement
 *  holding its id drops it the same way it drops any id this
 *  build does not know.
 *
 *  'recently-opened' SURVIVES and is offered by the tray. It is
 *  a real capability and nothing here deletes one; it is not in
 *  the set a person starts with because the finder answers the
 *  same question from any screen and this one must fit the
 *  viewport.
 *
 *  'the-price-file' CAME OFF THE DEFAULT SET. It counted tables
 *  and named the biggest ones, which is a fact about the shape of
 *  the data rather than about the day's work — true, and of no
 *  use to somebody who came here to sell a boat. It stays in the
 *  catalogue and the tray offers it, because an admin laying out
 *  a new tenancy does want it.
 *
 *  WHAT TOOK ITS PLACE IS 'activity': what changed, and who
 *  changed it. On a shared dealership machine that is the
 *  question the front door was not answering at all.
 *
 *  THE THREE ARE A COMPOSITION, NOT A LIST, AND THE ORDER IS THE
 *  COMPOSITION. The grid flows down a column before it moves
 *  right (dashboard.css), so these three read: quotes at the top
 *  left, activity directly beneath it, and modules beside them
 *  taking the full height on its own — because a list of every
 *  brand in the business is the one thing here that is worth the
 *  whole column. See `CardMeta.tall`.
 *
 *  A card with nothing in it yet does not disqualify itself from
 *  the default — it says so in a sentence and offers the act
 *  that would give it something, which is more use to a new
 *  person than an absence they cannot see. */
export const DEFAULT_CARDS: readonly CardId[] = [
  'my-quotes',
  'activity',
  'my-modules',
]

/** FIXED IDS, DELIBERATELY. The default is rebuilt from scratch
 *  on every read that finds nothing stored, so minted ids would
 *  give React a different key for the same button on every
 *  render pass and animate three buttons that never moved. */
export const DEFAULT_LINKS: readonly QuickLink[] = [
  { id: 'lnk-default-new-quote', target: { kind: 'new-quote' } },
  { id: 'lnk-default-find', target: { kind: 'find' } },
  { id: 'lnk-default-quotes', target: { kind: 'quotes' } },
]

export const defaultArrangement = (): Arrangement => ({
  cards: [...DEFAULT_CARDS],
  links: DEFAULT_LINKS.map((l) => ({ ...l })),
  touched: false,
})

/* ---------------------------------------------------------- */
/* Pure operations — every one of them testable without a DOM  */
/* ---------------------------------------------------------- */

/** Move one item from `from` to `to`, keeping everything else in
 *  order. Out-of-range asks return the list unchanged rather than
 *  a shorter one: a drag that ended outside the grid must not
 *  delete the thing being dragged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to) return [...list]
  if (from < 0 || from >= list.length) return [...list]
  if (to < 0 || to >= list.length) return [...list]
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export const withCardsMoved = (a: Arrangement, from: number, to: number): Arrangement => ({
  ...a,
  cards: moveItem(a.cards, from, to),
  touched: true,
})

/** Adding a card already on the page is a no-op, not a double.
 *  New cards land at the END, where the person can see one
 *  arrive; inserting at the top would move everything they had
 *  already arranged. */
export function withCardAdded(a: Arrangement, id: CardId): Arrangement {
  if (a.cards.includes(id)) return a
  return { ...a, cards: [...a.cards, id], touched: true }
}

export function withCardRemoved(a: Arrangement, id: CardId): Arrangement {
  if (!a.cards.includes(id)) return a
  return { ...a, cards: a.cards.filter((c) => c !== id), touched: true }
}

export const withLinksMoved = (a: Arrangement, from: number, to: number): Arrangement => ({
  ...a,
  links: moveItem(a.links, from, to),
  touched: true,
})

/** How many fast actions one row may hold. Said out loud because
 *  it is a refusal a person will meet: past eight, a row of
 *  buttons stops being a row you can aim at and becomes a list
 *  you have to read, and the cards below it are the list. */
export const LINK_LIMIT = 8

/** Two links to the same place are two buttons that do the same
 *  thing, so the same target is refused rather than doubled — and
 *  the surface says why, in the tray, where it is refused. */
export const sameTarget = (a: LinkTarget, b: LinkTarget): boolean => {
  if (a.kind !== b.kind) return false
  if (a.kind === 'table') return a.entityId === (b as { entityId: string }).entityId
  if (a.kind === 'module') return a.moduleId === (b as { moduleId: string }).moduleId
  return true
}

export const hasLinkTo = (a: Arrangement, target: LinkTarget): boolean =>
  a.links.some((l) => sameTarget(l.target, target))

export function withLinkAdded(a: Arrangement, target: LinkTarget, name?: string): Arrangement {
  if (a.links.length >= LINK_LIMIT) return a
  if (hasLinkTo(a, target)) return a
  const clean = name?.trim()
  return {
    ...a,
    links: [
      ...a.links,
      { id: newId(), target, ...(clean ? { name: clean } : {}) },
    ],
    touched: true,
  }
}

export function withLinkRemoved(a: Arrangement, id: string): Arrangement {
  if (!a.links.some((l) => l.id === id)) return a
  return { ...a, links: a.links.filter((l) => l.id !== id), touched: true }
}

/** An empty name is not a name — it clears the override and the
 *  link goes back to being called what it opens. That is the only
 *  way to undo a rename, so it must not store `''` instead. */
export function withLinkRenamed(a: Arrangement, id: string, name: string): Arrangement {
  const clean = name.trim()
  let changed = false
  const links = a.links.map((l) => {
    if (l.id !== id) return l
    if ((l.name ?? '') === clean) return l
    changed = true
    const next: QuickLink = { id: l.id, target: l.target }
    if (clean) next.name = clean
    return next
  })
  if (!changed) return a
  return { ...a, links, touched: true }
}

/** Every card this build knows that is not on the page — what
 *  the tray offers, in the catalogue's own order rather than in
 *  the order they happened to be removed. */
export const cardsNotPlaced = (a: Arrangement): CardId[] =>
  CARD_IDS.filter((id) => !a.cards.includes(id))

/* ---------------------------------------------------------- */
/* Reading and writing it                                     */
/* ---------------------------------------------------------- */

/** WHO THIS DASHBOARD BELONGS TO. Both halves of `AppUser`'s
 *  identity, and neither is optional: an arrangement filed under
 *  a person alone would follow them into another dealership. */
export interface Who {
  userId: string
  orgSlug: string
}

/** Namespaced the way this app namespaces — the feature, what it
 *  is, the version — then the two facts that scope it. Never a
 *  bare word another script on the page could plausibly own. */
export const keyFor = (who: Who): string =>
  `helmlogic.dashboard.v1:${who.orgSlug}:${who.userId}`

const store = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    /* a browser set to block site data throws on ACCESS, which is
       why this is wrapped rather than null-checked */
    return null
  }
}

const readTarget = (v: unknown): LinkTarget | null => {
  if (typeof v !== 'object' || v === null) return null
  const rec = v as Record<string, unknown>
  const kind = rec.kind
  if (typeof kind !== 'string') return null
  if (kind === 'table') {
    return typeof rec.entityId === 'string' && rec.entityId !== ''
      ? { kind: 'table', entityId: rec.entityId }
      : null
  }
  if (kind === 'module') {
    return typeof rec.moduleId === 'string' && rec.moduleId !== ''
      ? { kind: 'module', moduleId: rec.moduleId }
      : null
  }
  return (PLAIN_LINK_KINDS as readonly string[]).includes(kind)
    ? ({ kind } as LinkTarget)
    : null
}

/** The stored text, or the default for anything that is not
 *  exactly the shape written by `writeArrangement`. */
export function parseArrangement(raw: string | null): Arrangement {
  if (raw === null || raw === '') return defaultArrangement()
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return defaultArrangement()
  }
  if (typeof data !== 'object' || data === null) return defaultArrangement()
  const rec = data as Record<string, unknown>

  const cards: CardId[] = []
  if (Array.isArray(rec.cards)) {
    for (const c of rec.cards) {
      if (isCardId(c) && !cards.includes(c)) cards.push(c)
    }
  }

  const links: QuickLink[] = []
  if (Array.isArray(rec.links)) {
    for (const l of rec.links) {
      if (typeof l !== 'object' || l === null) continue
      const item = l as Record<string, unknown>
      const target = readTarget(item.target)
      if (!target) continue
      if (links.some((k) => sameTarget(k.target, target))) continue
      const id = typeof item.id === 'string' && item.id !== '' ? item.id : newId()
      const name = typeof item.name === 'string' && item.name.trim() !== ''
        ? item.name.trim()
        : undefined
      links.push({ id, target, ...(name ? { name } : {}) })
      if (links.length >= LINK_LIMIT) break
    }
  }

  /* AN EMPTY PAGE IS A LEGITIMATE ARRANGEMENT — somebody may
     genuinely want nothing but their fast actions — so `touched`
     is what decides whether to fall back, not emptiness. A record
     that was never touched is a default that has drifted, and the
     current default is the better answer to it. */
  const touched = rec.touched === true
  if (!touched) return defaultArrangement()
  return { cards, links, touched: true }
}

export function readArrangement(who: Who): Arrangement {
  const s = store()
  if (!s) return defaultArrangement()
  try {
    return parseArrangement(s.getItem(keyFor(who)))
  } catch {
    return defaultArrangement()
  }
}

/** Silent on every storage failure. The arrangement on screen is
 *  already correct — this is the copy that would have survived a
 *  reload, and interrupting somebody to say a preference did not
 *  persist is worse than the preference not persisting. */
export function writeArrangement(who: Who, a: Arrangement): void {
  const s = store()
  if (!s) return
  try {
    s.setItem(keyFor(who), JSON.stringify(a))
  } catch {
    /* quota, or a private window that reads and refuses writes */
  }
}

/* ---------------------------------------------------------- */
/* The live copy                                              */
/* ---------------------------------------------------------- */

/* ONE COPY PER PERSON, SHARED BY EVERY MOUNT. `useSyncExternalStore`
   wants a snapshot that is reference-stable between renders or it
   loops for ever, so the cache holds the object and the setter
   replaces it. The same pattern `quotes.ts` and `constraintDefs.ts`
   already use, for the same reason. */
const cache = new Map<string, Arrangement>()
const listeners = new Set<() => void>()

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function snapshotFor(who: Who): Arrangement {
  const key = keyFor(who)
  const held = cache.get(key)
  if (held) return held
  const loaded = readArrangement(who)
  cache.set(key, loaded)
  return loaded
}

/** Replace this person's arrangement, everywhere it is drawn, and
 *  on disk. Returns nothing: the callers that need the previous
 *  one for UNDO already hold it. */
export function setArrangement(who: Who, next: Arrangement): void {
  cache.set(keyFor(who), next)
  writeArrangement(who, next)
  for (const fn of listeners) fn()
}

/** Drop the in-memory copy so the next read comes off disk.
 *  Exported for tests, which otherwise share one process's cache
 *  between cases. */
export function forgetArrangements(): void {
  cache.clear()
}

export interface ArrangementApi {
  arrangement: Arrangement
  /** apply a pure operation; the previous arrangement comes back
   *  so the caller can offer UNDO with it */
  apply: (fn: (a: Arrangement) => Arrangement) => Arrangement
  /** put a previous arrangement back — what UNDO calls */
  restore: (a: Arrangement) => void
}

export function useArrangement(who: Who): ArrangementApi {
  const key = keyFor(who)
  const get = useCallback(() => snapshotFor(who), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const arrangement = useSyncExternalStore(subscribe, get, get)

  const apply = useCallback(
    (fn: (a: Arrangement) => Arrangement): Arrangement => {
      const before = snapshotFor(who)
      const next = fn(before)
      if (next !== before) setArrangement(who, next)
      return before
    },
    [key], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const restore = useCallback(
    (a: Arrangement) => setArrangement(who, a),
    [key], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { arrangement, apply, restore }
}
