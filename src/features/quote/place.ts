/* ============================================================
   WHERE YOU WERE IN THE DOCUMENT.

   WHAT THIS IS NOT. It is not the build. Every decision a person
   makes on the sequence is minted by `freeze.ts` and written by
   `quotes.ts` the instant it is made — that is the invariant this
   whole feature is built on and the reason `steps.ts` is a pure
   reading of a document already on disk. Nothing in this file is
   ever consulted for what is ON a quote.

   WHAT IT IS. The one thing the configurator holds that the
   document genuinely does not: WHICH BANDS WERE OPEN. `survivesClose.test.ts`
   asserts the quote survives a close; the step did not. A
   salesperson four decisions into an eight-step rig who reloaded —
   or came back after lunch to a tab the browser had discarded —
   landed on `firstOpenStep`, which is correct in the abstract and
   wrong in the room: it is not where they were, and they have to
   read the rail to find out where that was.

   So it is remembered, and it is remembered in the smallest,
   least dangerous way there is:

     · IT IS A CURSOR, NOT A STATE. A step id and nothing else. If
       it is lost, wrong, stale or refers to a step the sheet no
       longer has, the caller falls back to `firstOpenStep` and the
       person loses a scroll position. That is the whole blast
       radius, and it is why this may live in localStorage beside
       the quotes rather than inside them.
     · IT IS NEVER WRITTEN ONTO THE QUOTE. A `QuoteDef` is a
       photograph a customer may one day be handed; which panel a
       salesperson had open on a Tuesday is not part of that
       photograph and must not travel with it into `makeNewVersion`,
       the document or the print.
     · IT IS VALIDATED BY THE CALLER, ALWAYS. This file cannot know
       what a step id means, so it hands back whatever it stored and
       `QuoteBuild` checks it against the steps it actually has.
     · IT CANNOT THROW. Private windows, cleared site data and
       browsers with storage switched off all return null here, the
       same as a first visit — the same discipline `quotes.ts` keeps
       around its own `localStorage` calls.

   THE MAP IS CAPPED. A dealership that raises four hundred quotes
   a year must not accumulate four hundred cursors; the last
   `KEEP` written survive and the rest are dropped on the next
   write. Insertion order is the recency order, which is what makes
   that one slice rather than a timestamp per entry.
   ============================================================ */

const KEY = 'helmlogic.build.place.v1'

/** How many quotes keep a cursor. Twenty is a fortnight of one
 *  salesperson's drafts and about 700 bytes. */
const KEEP = 20

type Places = Record<string, string>

function read(): Places {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Places = {}
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at === 'string' && at !== '') out[id] = at
    }
    return out
  } catch {
    /* a corrupt cursor is a lost scroll position, never a lost
       quote — the caller's fallback is the whole recovery */
    return {}
  }
}

/** The step this quote was last left on, or null. Never trusted: the
 *  caller checks it against the steps the document actually has. */
export function recallPlace(quoteId: string): string | null {
  return read()[quoteId] ?? null
}

/** Remember it. Silent on every failure, by design — a screen that
 *  toasted "could not remember your place" would be shouting about
 *  its own bookkeeping at somebody mid-sale. */
export function rememberPlace(quoteId: string, stepId: string): void {
  if (typeof localStorage === 'undefined') return
  const places = read()
  /* delete first so a re-write moves this quote to the END of the
     insertion order — that is what makes the slice below "the last
     twenty touched" rather than "the first twenty ever seen" */
  delete places[quoteId]
  places[quoteId] = stepId
  const ids = Object.keys(places)
  const kept: Places = {}
  for (const id of ids.slice(Math.max(0, ids.length - KEEP))) kept[id] = places[id]
  try {
    localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    /* quota, private mode, storage off — all the same answer */
  }
}

/* ============================================================
   THE BANDS, AND WHY THE CURSOR BECAME A LIST.

   The sequence had one stop open at a time, so one id was the whole
   of the cursor. PHASE_TWO §2.3 replaced the six-stop deck with one
   scrolling page whose bands are accordions and SEVERAL ARE OPEN AT
   ONCE — so the thing to remember is a set rather than a position.

   It is stored in the same map, as one string, for the reason the
   header gives: the blast radius of losing it is a scroll position.
   A tab is the separator because a block id is a nanoid and cannot
   contain one, and because a corrupt value splits into ids that
   match no band and are dropped by the caller's own check.
   ============================================================ */

const JOIN = '\t'

/** The bands this quote was last left open. Never trusted: the
 *  caller checks every id against the bands the document has. */
export function recallOpen(quoteId: string): string[] {
  const raw = recallPlace(quoteId)
  if (raw === null) return []
  return raw.split(JOIN).filter((id) => id !== '')
}

/** Remember them.
 *
 *  A PERSON WHO SHUT EVERY BAND GETS THE DEFAULT BACK, and that is a
 *  limit of the store rather than a decision: `read()` drops an empty
 *  value, so an empty list cannot be told from never having been
 *  written. The cost is one accordion open on a reload, which is the
 *  same blast radius the header already accepts, and it is written
 *  down here rather than left to be discovered. */
export function rememberOpen(quoteId: string, ids: readonly string[]): void {
  rememberPlace(quoteId, ids.join(JOIN))
}
