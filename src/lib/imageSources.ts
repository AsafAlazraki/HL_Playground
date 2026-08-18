/* ============================================================
   WHERE A PICTURE LIVES — and whether we are allowed to draw it.

   The catalogue does not carry photographs, it carries ADDRESSES:
   a cell holds `https://www.highfieldboats.com/…/sp560.jpg`, not a
   megabyte of JPEG. That is why 1,411 pictures cost 170,274 bytes —
   121 bytes each — and it is the reason this module exists: an
   address is only a picture where the browser is allowed to fetch it.

   READ THIS FIRST, BECAUSE IT CHANGES WHAT MOST OF THE FILE IS FOR.
   Since `registerSeededPictures` (about a third of the way down), the
   repository SHIPS A COPY of 108 of the seed's 453 distinct addresses,
   taken once at build time and served from our own origin. The whole
   probe apparatus below — verdicts, claims, the two-failure rule —
   now decides every picture we do NOT hold: a user's own pasted
   address, the 76 the manufacturers refused us, and the 269 nobody
   has asked for yet.

   THE 269 ARE THE CATALOGUE GROWING, NOT A FETCH FAILING. The seed
   went to full scale — Highfield alone from 40 hulls to 588
   (SEED_AT_FULL_SCALE.md §2.2) — and the pictures were measured
   before that. An unmeasured address takes exactly the path a
   refused one takes: it is probed here, and where it cannot be drawn
   the row says "Held as a link", which is true. Nothing is
   substituted. `python tools/seed/fetch_images.py` is what turns one
   into a copy, and it needs a network and somebody's say-so.

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

/* ---------------------------------------------------------- */
/* pictures the repository already holds                      */
/* ---------------------------------------------------------- */

/* ============================================================
   THE COPY TAKEN ONCE, AT BUILD TIME — and why this is not the
   byte-holding IMAGE_SPEC.md §5.2 refuses.

   Everything above this point is about a picture we can only ever
   ADDRESS: a cell holds `https://…/sp560.jpg`, the browser fetches it
   live, and half the machinery in this file exists because that fetch
   is somebody else's server, on somebody else's wifi, under somebody
   else's CORP header. That was the demo's largest environmental risk
   — the module page's whole visual argument rented by the minute.

   So the pictures were fetched ONCE, by `tools/seed/fetch_images.py`,
   downscaled to what this app can actually draw, and committed under
   `public/seed-images`. A source that has a copy is painted from OUR
   origin: no request leaves the machine, no host verdict is needed, no
   probe is spent, and the page is the same on a plane as on fibre.

   §5.2 SAYS "AN ADDRESS IS THE PREFERRED FORM OF A PICTURE. WE NEVER
   FETCH A REACHABLE PICTURE IN ORDER TO HOLD ITS BYTES", AND IT IS
   STILL OBEYED. What it forbids is bytes ON A ROW — base64 inside
   `ImageRef.src`, written into IndexedDB, rewritten in full every
   400 ms by `repository.saveAll`, and carried out in every export.
   None of that happens here. `ImageRef.src` is the same manufacturer's
   address it always was, at the same ~124 bytes; the row, the store,
   the export and a frozen quote are unchanged to the byte. The copy is
   a BUILD ARTEFACT BESIDE THE APP, resolved at paint time, exactly the
   way this module already separates what a record SAYS from what a
   browser may DRAW.

   AND THE ADDRESS REMAINS THE TRUTH. `imageHostOf`, the plate, the
   lightbox caption and the export all keep naming the manufacturer,
   because that is where the photograph is FROM. A copy is not a
   provenance.

   NOTHING IS SUBSTITUTED. A picture with no copy is not given
   somebody else's — it keeps its address and says so. `absent` is the
   list of addresses that were TRIED and could not be obtained, with
   the reason measured at the time, so a plate can say the specific
   true thing instead of a shrug.
   ============================================================ */

interface SeededCopy {
  /** file name under `public/seed-images` */
  file: string
  /** the ORIGINAL's natural size, which is what the plate prints */
  w: number
  h: number
}

const copies = new Map<string, SeededCopy>()
/** hosts that answered nothing at all, keyed by `host` */
const absentHosts = new Map<string, string>()
/** single addresses that failed on a host which otherwise serves */
const absent = new Map<string, string>()

/** The measured reason there is no copy of this picture, or `undefined`.
 *  The host's sentence outranks the address's: a site that serves nothing
 *  is the larger and more useful truth, and it is the one a page can say
 *  once instead of ninety-three times. */
function absentWhy(src: string): string | undefined {
  const host = parseSource(src)?.host
  return (host === undefined ? undefined : absentHosts.get(host)) ?? absent.get(src)
}

/** Whether we already know, without asking anybody, that this address
 *  cannot be drawn. */
function knownAbsent(src: string): boolean {
  return absentWhy(src) !== undefined
}

/** Where `public/` is served from. Written once: `import.meta.env.BASE_URL`
 *  always ends in `/`, and a deployment under a sub-path would otherwise
 *  give every photograph a 404 nobody tested for. */
const PUBLIC_BASE = `${import.meta.env.BASE_URL}seed-images/`

/**
 * WHAT SHIPPED WITH THIS BUILD, handed over by the data set that owns
 * it. The engine never learns what a boat is: it is told a list of
 * addresses and where their copies are, and a list of addresses that
 * have no copy and why.
 *
 * Called from `@/demos`, which the shell imports, so the answer is in
 * place before the first thumbnail asks. Additive and idempotent — a
 * second data set may register its own without disturbing the first.
 */
export function registerSeededPictures(
  held: ReadonlyArray<readonly [string, string, number, number]>,
  deadHosts: ReadonlyArray<readonly [string, string]>,
  unavailable: ReadonlyArray<readonly [string, string]>,
): void {
  for (const [src, file, w, h] of held) copies.set(src, { file, w, h })
  for (const [host, why] of deadHosts) absentHosts.set(host, why)
  for (const [src, why] of unavailable) absent.set(src, why)
  announce()
}

/** The copy of this picture the repository holds, or `null`. The address
 *  it is keyed by is never rewritten — this answers a display question
 *  and nothing else. */
export function seededCopy(src: string): { at: string; w: number; h: number } | null {
  const held = copies.get(src)
  return held === undefined ? null : { at: PUBLIC_BASE + held.file, w: held.w, h: held.h }
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
  const measured = MEASURED_CLOSED.get(parseSource(src)?.host ?? '') ?? absentWhy(src)
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
 *
 * TWO RECORDED MEASUREMENTS NOW FEED IT, and the per-HOST one wins.
 * `MEASURED_CLOSED` is a statement about a whole host and is the older
 * and broader claim; `absent` is a statement about ONE address that
 * `tools/seed/fetch_images.py` tried and could not take a copy of —
 * the single Stacer file that 404s on a host serving seventeen others.
 * Both are measurements taken off the wire and written down; neither
 * moves while somebody is reading the page, which is the whole
 * requirement.
 */
export function measuredClosedHost(src: string): { host: string; why: string } | null {
  const host = parseSource(src)?.host
  if (host === undefined) return null
  const why = MEASURED_CLOSED.get(host) ?? absentWhy(src)
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

   AND SINCE 2026-08-18 IT HAS A YOUNGER SIBLING, `absentHosts`, which
   the data set registers from what `tools/seed/fetch_images.py`
   actually measured on the wire. The two agree today, sentence for
   sentence — the generator's wording was written to match this one, so
   nobody meets two voices for one fact. They are kept apart rather
   than merged because they are different KINDS of claim: this one is
   the engine's own, hand-measured, tested by name in
   imageSources.test.ts, and true whether or not any data set is
   loaded; the other is a property of a particular set's addresses and
   arrives with it. Where they overlap THIS ONE WINS, so a data set can
   never talk the engine out of a refusal it took for its own reasons.
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
  /* A picture we already hold is open whatever its host is doing —
     nothing will be fetched from that host to draw it. */
  if (copies.has(src)) return false
  if (knownAbsent(src)) return true
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
  /**
   * THE ADDRESS TO ACTUALLY PUT IN THE `<img src>`, which is not
   * always the one on the record. When the repository ships a copy
   * (see `registerSeededPictures`) this is the copy, same-origin; for
   * everything else it is the source as given. Callers must use it
   * rather than reaching for `ImageRef.src` themselves, or one surface
   * paints from disk while its neighbour goes to the network.
   *
   * Meaningless when `paint` is false, and empty for an empty source.
   */
  at: string
}

const PLATE = { paint: false, probe: false } as const
const PAINT = { paint: true, probe: false } as const
const PROBE = { paint: true, probe: true } as const

function displayFor(src: string, host: string | null): ImageDisplay {
  /* Ours already: nothing to fetch, nothing to probe, nothing to
     refuse. Checked after `broken`, so a copy that somehow will not
     load still degrades to a plate rather than a broken glyph. */
  if (broken.has(src)) return { ...PLATE, at: src }
  const copy = copies.get(src)
  if (copy !== undefined) return { ...PAINT, at: PUBLIC_BASE + copy.file }
  /* Measured at build time as unobtainable: never requested, so it
     costs no console line and no wait. */
  if (knownAbsent(src)) return { ...PLATE, at: src }
  if (host === null) return { ...(sourceKind(src) === 'refused' ? PLATE : PAINT), at: src }
  const verdict = verdictFor(host)
  if (verdict === 'open') return { ...PAINT, at: src }
  if (verdict === 'closed') return { ...PLATE, at: src }
  return { ...(hosts.get(host)?.claim === src ? PROBE : PLATE), at: src }
}

/** Whether to draw this picture, where to draw it from, and whether
 *  this one is the probe. Every consumer — the thumbnail, the enlarged
 *  plate, the page that sells the boat — asks the question here, so a
 *  picture that is a plate in the cell is never a broken glyph
 *  somewhere else. */
export function useImageDisplay(src: string): ImageDisplay {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  /* A picture we hold needs no host record at all: `null` here takes
     it out of the probe machinery entirely, so forty local thumbnails
     never claim, never fail and never wake each other. */
  const host = copies.has(src) || knownAbsent(src) ? null : hostKey(src)
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
