/* ============================================================
   A SEARCH THAT IGNORES THE NARROWING — property 2, once.

   THE FAULT THIS ENDS. Every search box in this app searched the
   list it was sitting on, which sounds obviously right and is the
   exact thing that makes a curated list untrustworthy: the rows the
   rule removed are not in that list, so typing the name of one
   returns nothing. A person who can see "REDCO 4.8m" on the sheet,
   types it into the block that is supposed to be about trailers,
   and is told nothing matches, has been told something false.
   HelmLogic gets this right on one screen and this app got it right
   on none.

   SO THE POOL IS SEARCHED, NOT THE OFFER, and the answer comes back
   in two parts. `within` is what a person expected; `beyond` is what
   the narrowing is standing in front of, and the COUNT of it is
   what `reachNote` prints. The surface decides what to do with the
   second half — every one of them offers the switch — but none of
   them may drop it, because dropping it is the fault.

   WORD BY WORD, NOT ONE LONG STRING. "SP460 PVC" must find a row
   named "Highfield - SP460 (PVC)"; a whole-string test answers
   "nothing matches" for a row the reader is looking at. That lesson
   was already learned twice in this codebase — the view stage's
   rail and the module index — and is written down once here.
   ============================================================ */

export interface SearchReach<T> {
  /** matches the narrowing already admits */
  within: T[]
  /** matches the narrowing is holding back — the count that is printed */
  beyond: T[]
  /** the needles that were actually tested, so a caller can say `''` means "no search" */
  active: boolean
}

export interface SearchReachInput<T> {
  /** every row that could have been offered, before anything narrowed it */
  pool: readonly T[]
  /** the ids the surface is currently offering */
  offered: ReadonlySet<string>
  idOf: (row: T) => string
  /** every word a person might type at this row, already lower-cased */
  hayOf: (row: T) => string
  term: string
}

/**
 * Split the pool by what a search finds and by which side of the
 * narrowing each match is on.
 *
 * ONE PASS OVER THE POOL. On the real sheet a block's pool is 434
 * trailers and the index's is 15,691 rows; the `hayOf` a caller
 * hands in is expected to be a string it already built once per data
 * change, exactly as `ModuleIndex` builds `e.hay`. Nothing here
 * formats a cell, so a caller cannot accidentally make this the
 * expensive part of a keystroke.
 */
export function searchReach<T>({
  pool,
  offered,
  idOf,
  hayOf,
  term,
}: SearchReachInput<T>): SearchReach<T> {
  const needles = term.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')
  if (needles.length === 0) return { within: [], beyond: [], active: false }

  const within: T[] = []
  const beyond: T[] = []
  for (const row of pool) {
    const hay = hayOf(row)
    let hit = true
    for (const n of needles) {
      if (!hay.includes(n)) {
        hit = false
        break
      }
    }
    if (!hit) continue
    if (offered.has(idOf(row))) within.push(row)
    else beyond.push(row)
  }
  return { within, beyond, active: true }
}
