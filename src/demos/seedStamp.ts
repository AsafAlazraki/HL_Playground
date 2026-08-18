/* ============================================================
   WHICH BUILD OF THE PREPARED SET THIS BROWSER WAS SEEDED FROM.

   THE BUG THIS EXISTS TO KILL. The freshness notice used to decide
   "this is an older copy" by comparing ROW COUNTS: every table the
   set declares, against what is on the sheet. Adding one row to one
   table is a row-count difference, so the notice fired on the user's
   own edit — and then offered to load the current example, which
   replaces the sheet and would have destroyed the row they had just
   typed. Measured: one added row, panel up, "Nothing has been lost"
   printed over an offer that would have lost it.

   AN EDIT IS NOT STALENESS. The two are not the same question and no
   count of rows can tell them apart, because both look identical from
   inside the data: a table with 44 rows where the set declares 43 is
   either an older seed or somebody's new boat, and the sheet does not
   remember which.

   SO THE PROVENANCE IS RECORDED AT THE MOMENT OF SEEDING, which is
   the one moment it is known for certain. `loadNorthsideProject`
   stamps this browser with the FINGERPRINT of the set it just wrote.
   Later, the notice asks one question — "is the fingerprint I was
   seeded with still the current one?" — and an edit cannot change the
   answer, because an edit does not touch the stamp.

   THE FINGERPRINT IS DERIVED, NEVER HAND-WRITTEN. The old header in
   northside.ts argued against a version number on the grounds that
   somebody would forget to bump it and the mechanism would go quiet
   at the moment it mattered. That argument is right and is honoured:
   the fingerprint is computed FROM the seed's own table list and row
   counts (`northsideSeedFingerprint`), so it changes by itself the
   moment the seed changes and there is nothing to remember.

   THE HONEST CASE STILL WORKS. The copy this whole mechanism exists
   for — the 21-table project the owner really met, which convinced
   him the data had reverted — was seeded before any stamp existed,
   so it carries none. For that cohort there is one signal an edit
   cannot fake: whole tables the current set carries that the sheet
   has never had. A person types rows; a person does not quietly lose
   thirteen tables. Below that cohort threshold an unstamped sheet is
   left alone, and it is left alone deliberately: a false alarm that
   offers to replace somebody's work is far worse than no notice.

   IT STORES ONE SMALL RECORD IN localStorage, exactly as saved quotes
   already do (`features/quote/quotes.ts`). Storage that refuses to
   write is not an error worth a screen — the record falls back to
   memory for the session, and a browser with no stamp is simply the
   unstamped cohort above.
   ============================================================ */

/** the key, versioned so a later shape change cannot misread this one */
const STAMP_KEY = 'helmlogic.seed.v1'

export interface SeedStamp {
  /** the seed fingerprint this browser was actually seeded from.
   *  Absent for a sheet whose provenance is not recorded — every
   *  browser seeded before this file existed, and any sheet that
   *  arrived from an imported file. */
  seed?: string
  /** the fingerprint the person said, in as many words, they were
   *  happy to stay on. Answering "Keep this one" must not be a
   *  question the app asks again every time the tab is reloaded. */
  kept?: string
  /** when this record was written, for anyone reading storage by hand */
  at: string
}

/* THE FALLBACK IS A REAL FALLBACK, not a silent no-op: private mode
   and a full quota both throw on write, and the mechanism should
   still behave for the rest of the session. */
let inMemory: SeedStamp | null = null

const hasStorage = (): boolean => {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function readSeedStamp(): SeedStamp | null {
  if (!hasStorage()) return inMemory
  try {
    const raw = localStorage.getItem(STAMP_KEY)
    if (raw === null) return inMemory
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return inMemory
    const rec = parsed as Record<string, unknown>
    const seed = typeof rec.seed === 'string' ? rec.seed : undefined
    const kept = typeof rec.kept === 'string' ? rec.kept : undefined
    if (seed === undefined && kept === undefined) return inMemory
    return { seed, kept, at: typeof rec.at === 'string' ? rec.at : '' }
  } catch {
    /* anything unreadable is treated as no stamp at all — the
       unstamped cohort is a case this file already handles */
    return inMemory
  }
}

function put(stamp: SeedStamp): void {
  inMemory = stamp
  if (!hasStorage()) return
  try {
    localStorage.setItem(STAMP_KEY, JSON.stringify(stamp))
  } catch {
    /* memory holds it for this session; nothing on screen changes */
  }
}

/** Called at the one moment provenance is known for certain: the set
 *  has just been written to this browser. */
export function writeSeedStamp(fingerprint: string): void {
  put({ seed: fingerprint, at: new Date().toISOString() })
}

/** "Keep this one" — remember the answer, against the fingerprint it
 *  was an answer about, so a later change to the set can ask again. */
export function keepSeedVersion(fingerprint: string): void {
  const cur = readSeedStamp()
  put({ seed: cur?.seed, kept: fingerprint, at: new Date().toISOString() })
}

/** Any swap that puts a project on the sheet which this browser did
 *  NOT seed — an import, a blank sheet, a cleared one. The stamp says
 *  where the sheet came from, so it must not outlive the sheet. */
export function forgetSeedStamp(): void {
  inMemory = null
  if (!hasStorage()) return
  try {
    localStorage.removeItem(STAMP_KEY)
  } catch {
    /* nothing to do: the in-memory record is already gone */
  }
}

/* ------------------------------------------------------------ */
/* the verdict — pure, so it can be tested without a browser     */
/* ------------------------------------------------------------ */

/** Fewer absent tables than this on an UNSTAMPED sheet is nobody's
 *  business but the owner's: it is somebody who deleted a table or
 *  two, not a build of the set from six months ago. */
export const COHORT_MIN = 6
/** And it has to be a real share of the set. With 53 tables declared
 *  the effective floor is 14 — the copy this mechanism was built for
 *  was missing 31 of them, and a person tidying up their sheet is
 *  nowhere near that. A SHARE rather than a count precisely so that
 *  the set growing (52 tables to 53, 3,566 rows to 11,116) moves the
 *  floor by itself and nobody has to remember to. */
export const COHORT_SHARE = 0.25

export interface StaleArgs {
  /** what this browser recorded when it was seeded, if anything */
  stamp: SeedStamp | null
  /** the fingerprint of the set as it stands in this build */
  current: string
  /** how many of the set's tables are absent from the sheet */
  missing: number
  /** how many tables the set declares in total */
  setTables: number
}

/** Is the sheet a copy of an OLDER build of the prepared set?
 *
 *  Row counts are deliberately not an argument to this function. They
 *  are what an edit changes, and an edit is not staleness — that
 *  confusion is the whole bug this file was written to end. */
export function isStaleSeedCopy({ stamp, current, missing, setTables }: StaleArgs): boolean {
  /* already answered, about this very version of the set */
  if (stamp?.kept === current) return false

  /* provenance recorded: one comparison, and an edit cannot reach it */
  if (stamp?.seed !== undefined) return stamp.seed !== current

  /* provenance unknown: only a whole cohort of absent tables counts */
  return missing >= COHORT_MIN && missing >= setTables * COHORT_SHARE
}
