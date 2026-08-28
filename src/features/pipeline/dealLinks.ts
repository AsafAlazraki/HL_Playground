/* ============================================================
   WHAT ELSE IS ATTACHED TO A DEAL — the links.

   A LABEL AND AN ADDRESS, BESIDE THE QUOTE AND NEVER ON IT, for
   exactly the reason `dealNotes.ts` gives at length for a note and
   `stages.ts` gives for a stage: a quote is a photograph of what
   was offered on a day, an issued one is frozen, and the whole
   feature depends on that. "The finance approval is in this
   Dropbox folder" is a fact about the CONVERSATION.

   THIS IS THE CHEAP HALF OF ATTACHMENTS AND IT IS DELIBERATELY
   FIRST. A link costs a label and a string, so there is no storage
   question at all — `dealFiles.ts` is where the storage question
   is answered, and it is answered in IndexedDB. Doing links first
   means the surface that lists things attached to a deal exists
   and is tested before a byte of anybody's photograph is written.

   WHICH SCHEMES ARE ALLOWED, AND WHY THE LIST IS SHORT.
   `http`, `https`, `mailto` and `tel` — the four a dealership
   actually pastes, and the four a browser can be handed without
   this app becoming a way to run something. `javascript:` and
   `data:` are refused by name in a sentence that says what IS
   allowed, because "invalid URL" teaches nobody anything. A link
   is rendered with `rel="noreferrer noopener"` at the call site
   for the same reason.

   A BARE `example.com` IS NOT REFUSED, IT IS COMPLETED. Somebody
   pasting an address out of an email gets `https://` put on the
   front, and is told nothing about it, because that is not a
   decision they need to review — it is the only thing the string
   could have meant. Anything with a scheme this file does not
   allow is refused rather than rewritten: silently changing
   somebody's `ftp://` into `https://` would point them at a
   different place.

   EVERY FUNCTION THAT DECIDES ANYTHING IS PURE and takes its
   inputs as arguments, so `dealLinks.test.ts` needs no browser, no
   store and no clock.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'

export interface DealLink {
  id: string
  /** what it is called, in the dealer's words. Never the URL — a
   *  list of raw addresses is a list nobody can scan. */
  label: string
  /** already normalised by `whyNotLink`'s sibling `tidyUrl`. What
   *  is stored is what is opened. */
  url: string
  /** epoch ms, the same choice `DealNote.at` makes and for the same
   *  reason: ordering never parses a string. */
  at: number
  who?: string
}

export type LinkBag = Record<string, DealLink[]>

/** The four a browser may be handed from here. See the header. */
export const LINK_SCHEMES: readonly string[] = ['http:', 'https:', 'mailto:', 'tel:']

/** Said verbatim when an address is refused. Names what IS allowed,
 *  the same discipline `logo.ts` keeps for a picture address. */
export const LINK_REFUSAL =
  'A link has to be a web address, an email address or a phone number — http://, https://, mailto: or tel:.'

/* ------------------------------------------------------------
   THE PURE HALF
   ------------------------------------------------------------ */

/** The address as it will be stored, or null when it is not one.
 *
 *  `URL` DOES THE PARSING, not a regular expression. A hand-rolled
 *  scheme check is how `javascript:%20alert(1)` gets through — the
 *  browser's own parser already knows every way an address can be
 *  spelled, and it is the parser that will eventually be handed the
 *  result. */
export function tidyUrl(text: string): string | null {
  const raw = text.trim()
  if (raw === '') return null
  const tries = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? [raw] : [`https://${raw}`]
  for (const t of tries) {
    let u: URL
    try {
      u = new URL(t)
    } catch {
      continue
    }
    if (!LINK_SCHEMES.includes(u.protocol)) return null
    /* a scheme and nothing else — `https://` — parses, and points
       nowhere. It is a refusal, not an address. */
    if (u.protocol.startsWith('http') && u.hostname === '') return null
    return u.href
  }
  return null
}

/** WHY THIS LINK CANNOT BE ADDED, or null when it can. A sentence,
 *  printed beside the box it was typed in (rule 10). The two
 *  refusals are different facts and say so separately: an empty
 *  label and a bad address are not one problem. */
export function whyNotLink(label: string, url: string): string | null {
  if (url.trim() === '') return 'A link needs an address.'
  if (tidyUrl(url) === null) return LINK_REFUSAL
  if (label.trim() === '') {
    return 'Give it a name — a list of raw addresses is a list nobody can read.'
  }
  return null
}

/** A LINK'S ID IS MINTED FROM ITS INSTANT, then made unique against
 *  the whole bag — the same shape `mintNoteId` uses, and readable
 *  in storage and in a debugger, which a random id is not. */
export function mintLinkId(bag: LinkBag, at: number): string {
  const base = `l${at.toString(36)}`
  const taken = new Set<string>()
  for (const list of Object.values(bag)) for (const l of list) taken.add(l.id)
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

/** Build one link. Pure: the id, the instant and the author all
 *  come in. The url is normalised here rather than at the call
 *  site, so what is stored is always what `tidyUrl` returned. */
export function mintLink(args: {
  id: string
  at: number
  label: string
  url: string
  who?: string
}): DealLink | null {
  const url = tidyUrl(args.url)
  if (url === null) return null
  return {
    id: args.id,
    at: args.at,
    label: args.label.trim(),
    url,
    ...(args.who ? { who: args.who } : {}),
  }
}

/** This deal's links, oldest first — the order they were attached,
 *  which is the order somebody remembers putting them there.
 *  Sorted rather than trusted, for the reason `notesFor` gives. */
export function linksFor(bag: LinkBag, quoteId: string): DealLink[] {
  const list = bag[quoteId]
  if (!list || list.length === 0) return []
  return [...list].sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : 1) : a.at - b.at))
}

export const countLinks = (bag: LinkBag, quoteId: string): number =>
  bag[quoteId]?.length ?? 0

export function withLink(bag: LinkBag, quoteId: string, link: DealLink): LinkBag {
  return { ...bag, [quoteId]: [...(bag[quoteId] ?? []), link] }
}

/** Without that link — what UNDO calls. The deal's entry goes with
 *  its last link, so the size of this store is the number of deals
 *  something is actually attached to. */
export function withoutLink(bag: LinkBag, quoteId: string, linkId: string): LinkBag {
  const list = bag[quoteId]
  if (!list) return bag
  const left = list.filter((l) => l.id !== linkId)
  if (left.length === list.length) return bag
  const next = { ...bag }
  if (left.length === 0) delete next[quoteId]
  else next[quoteId] = left
  return next
}

/** WHAT A STORED BAG HAS TO SURVIVE — per link rather than
 *  all-or-nothing, the rule `parseBag` in `dealNotes.ts` keeps:
 *  nine good links and one corrupt one should cost the tenth, not
 *  the nine. An address that no longer passes `tidyUrl` is dropped
 *  rather than kept, because the check is what makes the stored
 *  string safe to hand a browser. */
export function parseLinks(raw: unknown): LinkBag {
  const out: LinkBag = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [quoteId, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    const kept: DealLink[] = []
    for (const row of list as Record<string, unknown>[]) {
      if (typeof row?.['id'] !== 'string' || row['id'] === '') continue
      if (typeof row['label'] !== 'string' || row['label'] === '') continue
      if (typeof row['at'] !== 'number' || !Number.isFinite(row['at'])) continue
      const url = typeof row['url'] === 'string' ? tidyUrl(row['url']) : null
      if (url === null) continue
      kept.push({
        id: row['id'],
        label: row['label'],
        url,
        at: row['at'],
        ...(typeof row['who'] === 'string' ? { who: row['who'] } : {}),
      })
    }
    if (kept.length > 0) out[quoteId] = kept
  }
  return out
}

/* ------------------------------------------------------------
   THE STORE. One key per organisation, a cache and a listener set
   — the shape `dealNotes.ts` and `stages.ts` already use.

   A REFUSED WRITE IS REPORTED, NOT SWALLOWED, for the reason
   `dealNotes.ts` gives: a lost stage override is a card back where
   the document says it goes, and a lost link is something somebody
   attached that is not there tomorrow.
   ------------------------------------------------------------ */

const key = (orgSlug: string): string => `hl.pipeline.links.v1:${orgSlug}`

let cache: { k: string; v: LinkBag } | null = null
const listeners = new Set<() => void>()

function read(orgSlug: string): LinkBag {
  const k = key(orgSlug)
  if (cache && cache.k === k) return cache.v
  let v: LinkBag = {}
  try {
    const raw = globalThis.localStorage?.getItem(k)
    if (raw) v = parseLinks(JSON.parse(raw))
  } catch {
    /* a browser refusing storage still gets a working deal — with
       nothing attached, which is the truth about what it can read */
  }
  cache = { k, v }
  return v
}

function write(orgSlug: string, v: LinkBag): boolean {
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

export const linksOf = (orgSlug: string): LinkBag => read(orgSlug)

/** Write one already-built link, and say whether it will still be
 *  there tomorrow. The boolean is the whole point; see the header. */
export function saveLink(orgSlug: string, quoteId: string, link: DealLink): boolean {
  return write(orgSlug, withLink(read(orgSlug), quoteId, link))
}

export function dropLink(orgSlug: string, quoteId: string, linkId: string): void {
  write(orgSlug, withoutLink(read(orgSlug), quoteId, linkId))
}

/** The link a person just typed, with the session's name on it.
 *  The author is read from the session HERE rather than passed in,
 *  the rule `composeNote` keeps: a caller allowed to name somebody
 *  else is a caller that can forge one. Returns null when the
 *  address is not one — `whyNotLink` is what the surface calls
 *  first, and this is the second gate rather than the only one. */
export function composeLink(
  orgSlug: string,
  label: string,
  url: string,
  who: string | undefined,
  now = Date.now(),
): DealLink | null {
  return mintLink({
    id: mintLinkId(read(orgSlug), now),
    at: now,
    label,
    url,
    ...(who ? { who } : {}),
  })
}

export function forgetDealLinks(): void {
  cache = null
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useDealLinks(orgSlug: string): LinkBag {
  const snap = useCallback(() => read(orgSlug), [orgSlug])
  return useSyncExternalStore(subscribe, snap, snap)
}
