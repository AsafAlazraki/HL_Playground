/* ============================================================
   WHERE A PICTURE LIVES — and whether we are allowed to draw it.

   The catalogue does not carry photographs, it carries ADDRESSES:
   a cell holds `https://www.highfieldboats.com/…/sp560.jpg`, not a
   megabyte of JPEG. That is why 305 pictures cost 37,857 bytes, and
   it is the reason this module exists — an address is only a picture
   where the browser is allowed to fetch it.

   THE FAILURE THIS PREVENTS, AND THE ONE IT REFUSES TO RE-INTRODUCE.

   Two of the twelve hosts in the seed cannot be fetched from here.
   `www.northsidemarine.com.au` answers with Cloudflare's challenge
   page carrying `Cross-Origin-Resource-Policy: same-origin`, which is
   exactly what raises `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` — a
   console line the page cannot catch, cannot handle and cannot
   apologise for. `northsidemarine1.sharepoint.com` is an M365 auth
   wall and cannot be fixed from a browser at all.

   The previous rule silenced those two by refusing EVERY cross-origin
   source. It worked, and it cost the other ten: Highfield, Yamaha,
   Stacer, Formosa, Mayfair, Jeanneau, Dunbier, GFab, Surtees — all of
   them serve, and all of them were drawn as hairline plates.

   So the verdict is taken PER HOST, not per address, because the
   failure is a property of the host: all 93 Northside addresses fail
   for one reason. The first thumbnail on an unknown host is the
   PROBE — it is drawn as a real `<img>`, eagerly, and its own load or
   error decides for every other picture on that host. Two distinct
   addresses must fail before a host is condemned, because one dead
   file is not a dead host; a host offering only one address, which
   fails, is condemned on that one, because a host with one picture
   that will not load is a host with no pictures.

   The bound this buys is the whole point: AT MOST TWO uncatchable
   console lines per host per session, and none at all for a host that
   works — four for the entire 305-cell catalogue, against the
   seventy-odd per sheet the old rule was written to stop.

   AND FOUR IS STILL FOUR. A fresh walk of the app produced three
   failed requests and two red console lines, all of them
   `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`, and a stakeholder who opens
   dev tools reads red as broken software. There is no way to catch
   them: a subresource the browser refuses is logged by the browser, so
   `onerror` fires *after* the line is already printed, and no `fetch`
   mode, `try` or handler can take it back. The only way not to have
   the line is NOT TO MAKE THE REQUEST — which is honest exactly when
   the request is one we have measured cannot succeed. See
   `MEASURED_CLOSED` below: two hosts named, with what was measured and
   how to measure it again. The probe machinery above is untouched and
   still decides every other host at runtime.

   NOTHING IS PERSISTED. A host that is down for ten minutes must not
   be dead forever inside somebody's IndexedDB; a reload re-probes.

   THE DATA IS NEVER TOUCHED. `ImageRef.src` keeps its address, the
   export keeps it, and the day those pixels are reachable the same
   cell paints them. Only the DISPLAY degrades.
   ============================================================ */
import { useEffect, useReducer } from 'react'
import type { ImageRef } from '@/types/model'

/* ---------------------------------------------------------- */
/* what a source IS                                           */
/* ---------------------------------------------------------- */

/** Pixels that travel with the project. Note the tightening against
 *  the old rule: `data:` alone is not enough, it must be
 *  `data:image/`. `ImageRef.src` goes straight into an `<img src>`,
 *  and that is the one place untrusted content enters our DOM. */
const OWN_PIXELS = /^(?:data:image\/|blob:)/i

function parseSource(src: string): URL | null {
  if (src === '') return null
  try {
    return new URL(src, window.location.href)
  } catch {
    return null
  }
}

/** MAY THIS ADDRESS BE STORED AT ALL — the scheme question, and only
 *  the scheme question. `http:`, `https:`, `data:image/` and `blob:`;
 *  everything else refused, including a bare path, because
 *  `new URL('../x', base)` would silently resolve a typo into a
 *  same-origin request.
 *
 *  SEPARATE FROM `sourceKind` ON PURPOSE, and the reason is not
 *  tidiness. `sourceKind` answers "can this PAINT here?", which needs
 *  `window.location.origin` to tell same-origin from remote — so it is
 *  a browser question and returns `refused` for a perfectly good
 *  `https://` address when there is no `window`. The import validator
 *  in `features/io/envelope.ts` runs over an untrusted file and must
 *  give the same answer in a test, a worker, or a Node process; it
 *  cares whether an address is SAFE TO KEEP, never whether it will
 *  paint on this origin. Wiring it to `sourceKind` silently discarded
 *  every `https://` picture under vitest, which is how this was
 *  found. */
export function isStorableSource(src: string): boolean {
  if (OWN_PIXELS.test(src)) return true
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(src)
  if (scheme === null) return false
  const p = scheme[1].toLowerCase()
  return p === 'http' || p === 'https'
}

/** `own`         — our own bytes; nothing is fetched, nothing can fail.
 *  `same-origin` — cannot be refused cross-origin by construction.
 *  `remote`      — http/https elsewhere: gets a host verdict.
 *  `refused`     — every other scheme (`file:`, `javascript:`,
 *                  `data:text/html`, unparseable). Never requested,
 *                  never painted, no verdict, no exceptions. */
export type SourceKind = 'own' | 'same-origin' | 'remote' | 'refused'

export function sourceKind(src: string): SourceKind {
  if (OWN_PIXELS.test(src)) return 'own'
  const url = parseSource(src)
  if (url === null) return 'refused'
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'refused'
  return url.origin === window.location.origin ? 'same-origin' : 'remote'
}

/** The host a verdict is filed under — `host`, so name AND port, or a
 *  staging port would inherit production's answer. `null` for
 *  everything that never needs a verdict. */
function hostKey(src: string): string | null {
  if (sourceKind(src) !== 'remote') return null
  return parseSource(src)?.host ?? null
}

/** Where a referenced picture actually lives — the words on the plate,
 *  so "why can't I see it" answers itself. */
export function imageHostOf(src: string): string {
  const url = parseSource(src)
  return url === null ? '' : url.hostname
}

/** `609%20Ocean%20Ranger.jpg` is an address, not a filename. Names
 *  lifted off a URL arrive escaped; a plate in the drawing office
 *  reads the words. Anything that will not decode is left exactly as
 *  it came, because a mangled name is worse than an ugly one. */
function readable(text: string): string {
  if (!text.includes('%')) return text
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** The last path segment of an address — what a person means by "the
 *  picture's name". Empty when the address carries no path. */
export function nameFromUrl(src: string): string {
  const url = parseSource(src)
  if (url === null) return ''
  const last = url.pathname.split('/').filter(Boolean).pop()
  return last ? readable(last) : ''
}

/* ---------------------------------------------------------- */
/* the words in the place the picture would have been         */
/* ---------------------------------------------------------- */

/** THE LABEL, WRITTEN ONCE. Four surfaces drew this idea and three of
 *  them used different words for it — the cell's thumbnail said
 *  "held as a link, not shown here", its enlarged plate said "Held as
 *  a link — the picture itself lives at …", and the module tile said
 *  "Held as a link to …, so it is not shown here". Repeated down a
 *  grid, one wording reads as a convention somebody chose; three
 *  wordings read as three different faults. */
export const HELD_AS_LINK = 'Held as a link'

/**
 * WHY THIS WELL IS EMPTY, in one sentence, for every surface that
 * draws one. Counted in the DOM on the Boats module: 174 tiles, 64
 * photographs painted, 93 of these plates, 17 rows carrying no picture
 * at all. So this sentence is the catalogue's answer to "where are the
 * photographs" and it has to be a decision rather than an apology.
 *
 * It says the most specific true thing available. When the host is one
 * we have MEASURED and recorded (see `MEASURED_CLOSED`), it says what
 * the host does — a reader learns the picture is fine and the
 * permission is not, which is the difference between "your data is
 * broken" and "this photograph is somebody else's to serve". Otherwise
 * it names where the picture lives, which is what a person fixing the
 * record needs.
 *
 * NOTHING HERE IS EVER A GUESS AT THE PICTURE. No filename is dressed
 * up as a caption, no other boat's photograph is substituted, and the
 * address is never quietly rewritten.
 */
export function heldAsLinkNote(src: string): string {
  const host = imageHostOf(src)
  if (host === '') return `${HELD_AS_LINK} — the picture itself is not here.`
  const measured = MEASURED_CLOSED.get(parseSource(src)?.host ?? '')
  if (measured !== undefined) return `${HELD_AS_LINK} — ${measured}.`
  return `${HELD_AS_LINK} — the picture itself lives at ${host}.`
}

/**
 * The host behind a picture we know in advance we cannot paint, and why
 * — or `null` for every other address.
 *
 * FOR A PAGE THAT WANTS TO SAY THIS ONCE INSTEAD OF NINETY-THREE TIMES.
 * A catalogue where most tiles are plates needs a sentence at the top,
 * and a sentence at the top needs a COUNT THAT DOES NOT MOVE. The live
 * verdict cannot supply one: `hostIsClosed` answers out of a session's
 * probe results, so a page-level total taken from it would tick upward
 * as answers landed and read as a page discovering faults while
 * somebody watched. This answers only from the recorded measurement, so
 * it is the same number on the first frame and the hundredth, offline
 * and on.
 *
 * The trade is stated rather than hidden: a host that dies TODAY is a
 * plate on the tile and is not in this count. The sentence therefore
 * names the hosts it counted, and claims nothing about any other.
 */
export function measuredClosedHost(src: string): { host: string; why: string } | null {
  const host = parseSource(src)?.host
  if (host === undefined) return null
  const why = MEASURED_CLOSED.get(host)
  return why === undefined ? null : { host: imageHostOf(src), why }
}

/** The words on the plate: the filename the business would recognise,
 *  falling back to the last segment of the address, then the host. */
export function imageLabel(img: ImageRef): string {
  const named = img.name?.trim()
  if (named) return readable(named)
  const last = nameFromUrl(img.src)
  if (last) return last
  return imageHostOf(img.src) || 'Picture'
}

/* ---------------------------------------------------------- */
/* the verdict — one per host, for this session only          */
/* ---------------------------------------------------------- */

export type HostVerdict = 'unknown' | 'probing' | 'open' | 'closed'

/** Two distinct addresses must fail before a host is condemned — and
 *  two is also the ceiling on console lines we are willing to spend
 *  finding out. */
const MAX_PROBES = 2

/* ============================================================
   THE TWO HOSTS WE DO NOT SPEND A REQUEST ON, AND THE MEASUREMENT.

   This is a RECORDED MEASUREMENT, not an assumption and not a
   convenience. Each address below was requested from this machine on
   2026-08-17 with a current Chrome user-agent, and the answer is the
   sentence beside it. Re-measure with:

     curl -sD - -o /dev/null -A "Mozilla/5.0 … Chrome/128 …" <address>

   `www.northsidemarine.com.au`  71 addresses in the seed, the largest
     block on any one host.
     HTTP/1.1 403, `Cf-Mitigated: challenge`, `Content-Type: text/html`,
     5,758 bytes of Cloudflare interstitial — and on that response,
     `Cross-Origin-Resource-Policy: same-origin`. A browser on any
     other origin is refused by CORP before the bytes matter, which is
     precisely `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`.

   `northsidemarine1.sharepoint.com`  4 addresses in the seed.
     HTTP/1.1 302 to a Microsoft 365 sign-in. There is no
     unauthenticated read of a SharePoint document library and there is
     no browser fix for one.

   The other ten hosts in the seed — highfieldboats.com,
   adventure.highfieldboats.com, yamaha-motor.com.au, stacer.com.au,
   formosamarineboats.com.au, mayfairmarine.com.au, app.jeanneau.com,
   gfabtrailers.com.au, dunbier.com, surteesboats.com — all answered
   200 with an image content type and NO `Cross-Origin-Resource-Policy`
   header at all. They serve, they are not listed here, and they are
   still settled by the probe rather than by this table.

   WHY THIS IS NOT SILENCING A WARNING. The warning was the browser
   truthfully reporting a request that could not succeed. Removing the
   request removes the cause. The DATA is not touched — `ImageRef.src`
   keeps its address, the export keeps it, and a reader is told in
   words where the picture lives (`heldAsLinkNote`).

   WHY IT IS HONEST TO SAY THIS IS A LATCH. `serves` is consulted
   FIRST, so a host that ever does paint outranks this table — but with
   no probe spent, nothing on a listed host will paint, so in practice a
   listed host stays closed for the session. That is the trade: two red
   lines every session, for every user, forever, against a
   re-measurement when somebody changes this list. The addresses are
   third-party marketing sites the dealership does not control; the
   dealership's own host is the one behind Cloudflare.
   ============================================================ */
const MEASURED_CLOSED = new Map<string, string>([
  [
    'www.northsidemarine.com.au',
    'northsidemarine.com.au serves its pictures to its own site only',
  ],
  /* Each of these reads as a clause as well as a sentence: the plate
     prints `Held as a link — <reason>.` and the module index joins
     them into a list, so no entry may begin with "this" or "it". */
  ['northsidemarine1.sharepoint.com', 'northsidemarine1.sharepoint.com needs a sign-in to read'],
])

interface HostRecord {
  /** every distinct address ever seen on this host */
  addresses: Set<string>
  /** addresses with a thumbnail on screen RIGHT NOW, by mount count.
   *  A probe can only ever be handed to one of these: a claim resting
   *  on a row that has scrolled away would leave the host 'probing'
   *  for the rest of the session, and every picture on it a plate. */
  live: Map<string, number>
  failures: Set<string>
  /** one address painted: the host serves */
  serves: boolean
  claim: string | null
}

const hosts = new Map<string, HostRecord>()

/** Sources that have already failed once. Module-level on purpose: the
 *  same photograph appears in a cell, in the strip and in the plate,
 *  and one failure is enough for all three, for the session. */
const broken = new Set<string>()

const listeners = new Set<() => void>()

function announce(): void {
  for (const listen of listeners) listen()
}

function recordFor(host: string): HostRecord {
  const found = hosts.get(host)
  if (found) return found
  const made: HostRecord = {
    addresses: new Set(),
    live: new Map(),
    failures: new Set(),
    serves: false,
    claim: null,
  }
  hosts.set(host, made)
  return made
}

/** Derived, never latched — so a host condemned on its only address
 *  gets one more chance the moment a second address turns up.
 *
 *  PIXELS OUTRANK THE TABLE. `serves` is read before `MEASURED_CLOSED`
 *  so a picture that actually painted is always believed over anything
 *  written down here — which is the only ordering that cannot make this
 *  file lie about what the browser just did. */
function verdictFor(host: string): HostVerdict {
  const rec = hosts.get(host)
  if (rec?.serves) return 'open'
  if (MEASURED_CLOSED.has(host)) return 'closed'
  if (rec === undefined) return 'unknown'
  if (rec.failures.size >= MAX_PROBES) return 'closed'
  if (rec.failures.size > 0 && rec.addresses.size <= rec.failures.size) return 'closed'
  return rec.claim === null ? 'unknown' : 'probing'
}

/** The next address on this host worth spending a console line on:
 *  on screen now, and not one that has already failed. */
function nextCandidate(rec: HostRecord): string | null {
  if (rec.failures.size >= MAX_PROBES) return null
  for (const [address, mounted] of rec.live) {
    if (mounted > 0 && !rec.failures.has(address)) return address
  }
  return null
}

/** Read-only question, for callers that must decide whether to draw a
 *  fallback AT ALL — a view page in front of a customer shows nothing
 *  rather than a hatched rectangle. In a table the opposite is right:
 *  a plate there says "there is a record here you may want to fix". */
export function hostIsClosed(src: string): boolean {
  if (broken.has(src)) return true
  const kind = sourceKind(src)
  if (kind === 'refused') return true
  if (kind !== 'remote') return false
  const host = hostKey(src)
  return host !== null && verdictFor(host) === 'closed'
}

/** A picture painted. The host serves, and every other picture on it
 *  may now be drawn without spending anything to find out. */
export function noteImageLoaded(src: string): void {
  broken.delete(src)
  const host = hostKey(src)
  if (host === null) return
  const rec = recordFor(host)
  if (rec.serves) return
  rec.serves = true
  rec.claim = null
  announce()
}

/** A picture failed. The source is dead for the session either way;
 *  whether the HOST is dead depends on how many distinct addresses on
 *  it have now failed. The probe passes straight to the next candidate
 *  so the answer lands one round trip later, rather than waiting for
 *  something else on the sheet to move. */
export function noteImageFailed(src: string): void {
  broken.add(src)
  const host = hostKey(src)
  if (host === null) {
    announce()
    return
  }
  const rec = recordFor(host)
  rec.failures.add(src)
  rec.claim = rec.serves ? null : nextCandidate(rec)
  announce()
}

/* ---------------------------------------------------------- */
/* what one picture should do about it                        */
/* ---------------------------------------------------------- */

export interface ImageDisplay {
  /** point a real `<img>` at this source */
  paint: boolean
  /** this one is the host's probe: it loads eagerly, and its load or
   *  error is the verdict for every other picture on that host */
  probe: boolean
}

const PLATE: ImageDisplay = { paint: false, probe: false }
const PAINT: ImageDisplay = { paint: true, probe: false }
const PROBE: ImageDisplay = { paint: true, probe: true }

function displayFor(src: string, host: string | null): ImageDisplay {
  if (broken.has(src)) return PLATE
  if (host === null) return sourceKind(src) === 'refused' ? PLATE : PAINT
  const verdict = verdictFor(host)
  if (verdict === 'open') return PAINT
  if (verdict === 'closed') return PLATE
  return hosts.get(host)?.claim === src ? PROBE : PLATE
}

/** Whether to draw this picture, and whether this one is the probe.
 *  Every consumer — the thumbnail, the enlarged plate, the page that
 *  sells the boat — asks the question here, so a picture that is a
 *  plate in the cell is never a broken glyph somewhere else. */
export function useImageDisplay(src: string): ImageDisplay {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const host = hostKey(src)
  const verdict = host === null ? 'open' : verdictFor(host)

  useEffect(() => {
    listeners.add(bump)
    return () => {
      listeners.delete(bump)
    }
  }, [])

  /* on screen, and therefore available to carry a probe */
  useEffect(() => {
    if (host === null) return
    const rec = recordFor(host)
    const isNew = !rec.addresses.has(src)
    rec.addresses.add(src)
    rec.live.set(src, (rec.live.get(src) ?? 0) + 1)
    /* a fresh address can re-open a host that was condemned on its
       only one — nothing else changes what anybody draws, and forty
       thumbnails mounting at once must not wake all forty */
    if (isNew && rec.failures.size > 0) announce()
    return () => {
      const held = hosts.get(host)
      if (held === undefined) return
      const mounted = (held.live.get(src) ?? 1) - 1
      if (mounted > 0) held.live.set(src, mounted)
      else held.live.delete(src)
      /* a probe that scrolls out of the window before it answers hands
         the claim on; otherwise the host stays 'probing' forever */
      if (held.claim === src && !held.live.has(src)) {
        held.claim = nextCandidate(held)
        announce()
      }
    }
  }, [host, src])

  /* Claiming is a side effect, so it never happens during render. The
     first picture to reach an unknown host takes the claim; everything
     else sees 'probing' and stays a plate until the answer lands.
     Re-runs on every change of verdict, which is how the claim finds a
     new holder after a probe fails or a claimant unmounts. */
  useEffect(() => {
    if (host === null || verdict !== 'unknown') return
    const rec = recordFor(host)
    if (rec.claim !== null || rec.failures.has(src)) return
    rec.claim = src
    announce()
  }, [host, src, verdict])

  return displayFor(src, host)
}
