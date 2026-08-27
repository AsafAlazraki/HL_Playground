/* ============================================================
   WHAT YOU OPENED LAST — the half of a palette that was missing.

   THE MEASURED PROBLEM. A palette answers two different questions
   and this one only ever answered the first. "Which of fifty-one
   tables holds a Stacer 449" is a SEARCH, and `rowSearch.ts` is
   very good at it. "Take me back to the boat I was costing four
   minutes ago" is a RECALL, and until this file existed the only
   way to serve it was to retype the name — on a price file where
   a name is "HIGHFIELD SPORT 560 · HYPALON · GREY", which is
   thirty-eight characters to get back somewhere you have already
   been. Every palette a person has used answers both. Ours
   answered one and then drew the same eight tables, in the same
   order, on every one of the two hundred openings a day.

   WHAT IS REMEMBERED, AND WHAT IS NOT. A pick — the table, and the
   row when a row was picked. Nothing else: no query, no timestamp
   a screen would then have to render as "3 minutes ago" and keep
   re-rendering, no rank, no count. Six of them, newest first, and
   the same place picked twice moves rather than doubling.

   IT IS RESOLVED AT PAINT, NEVER TRUSTED. A remembered id is a
   guess about a project that has gone on changing — a table can be
   deleted, a row can be removed, a whole file can be replaced from
   Import. So nothing here is drawn from what was stored: the
   caller looks every pick up in the live index and draws only what
   is still there. A recall list that offers a row which no longer
   exists is worse than no recall list, because it makes the
   palette a liar about the one thing it is for.

   WHY IT SURVIVES A RELOAD. The alternative — a module variable —
   forgets on every refresh, and a dealer's browser is refreshed
   all day. `localStorage` is what this app already uses for the
   things a project should remember across a tab (the seed stamp,
   discovered rules, module capabilities), so this is that
   convention and not a new one.

   EVERY READ AND WRITE IS GUARDED. Storage throws in a private
   window, throws when a quota is full, and returns another app's
   shape when a key collides. A palette that cannot open because
   its recall list would not parse is a catastrophic trade for a
   convenience, so every failure here ends in "no recents" and the
   surface draws exactly what it drew before this file existed.
   ============================================================ */

/** One remembered destination. `rowId` is absent when what was
 *  picked was a TABLE — the same distinction `Option` draws, and
 *  the same one `onReveal` carries. */
export interface RecentPick {
  entityId: string
  rowId?: string
}

/** How many are kept. Six is a column of the palette and not a
 *  second wall: past six, typing two letters is faster than
 *  reading, which is the same argument `BROWSE_LIMIT` makes. */
export const RECENT_LIMIT = 6

/** Namespaced the way the rest of the app namespaces: feature,
 *  then what it is. Never a bare word that another script on the
 *  page could plausibly own. */
const KEY = 'helmlogic.finder.recent.v1'

const store = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    /* a browser set to block site data throws on ACCESS, not on
       read — which is why this is wrapped and not null-checked */
    return null
  }
}

/** Anything that is not the shape written below is discarded whole
 *  rather than repaired. A half-understood record is how one bad
 *  write becomes a permanent wrong row in the palette. */
function parse(raw: string | null): RecentPick[] {
  if (raw === null || raw === '') return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const out: RecentPick[] = []
    for (const item of data) {
      if (typeof item !== 'object' || item === null) continue
      const rec = item as Record<string, unknown>
      const entityId = rec.entityId
      const rowId = rec.rowId
      if (typeof entityId !== 'string' || entityId === '') continue
      out.push(
        typeof rowId === 'string' && rowId !== ''
          ? { entityId, rowId }
          : { entityId },
      )
      if (out.length >= RECENT_LIMIT) break
    }
    return out
  } catch {
    return []
  }
}

/** The remembered picks, newest first. Never throws, and returns an
 *  empty list for every failure — a palette opens either way. */
export function readRecent(): RecentPick[] {
  const s = store()
  if (!s) return []
  try {
    return parse(s.getItem(KEY))
  } catch {
    return []
  }
}

/** The same list with one pick moved to the front.
 *
 *  Pure and exported so the ordering can be reasoned about — and
 *  tested — without a browser. A pick matches an existing entry
 *  only when BOTH sides agree about the row: opening the Highfield
 *  table and opening one Highfield boat are two different
 *  destinations, and folding them together would lose whichever
 *  one you did first. */
export function withPick(list: RecentPick[], pick: RecentPick): RecentPick[] {
  const same = (a: RecentPick, b: RecentPick): boolean =>
    a.entityId === b.entityId && (a.rowId ?? '') === (b.rowId ?? '')
  return [pick, ...list.filter((p) => !same(p, pick))].slice(0, RECENT_LIMIT)
}

/** Remember that this was opened. Silent on every storage failure:
 *  the act the person actually asked for has already happened, and
 *  failing to write a convenience is not worth interrupting it. */
export function rememberPick(entityId: string, rowId?: string): void {
  const s = store()
  if (!s) return
  const pick: RecentPick = rowId === undefined ? { entityId } : { entityId, rowId }
  try {
    s.setItem(KEY, JSON.stringify(withPick(parse(s.getItem(KEY)), pick)))
  } catch {
    /* quota, or a private window that allows reads and refuses
       writes. Nothing is reported: there is nothing a person could
       do about it and nothing they asked for has failed. */
  }
}

/** Forget everything. The palette offers this the moment there is
 *  anything to forget — a list of where somebody has been is a
 *  record of their work, and a record with no way to clear it is
 *  one the app decided to keep on their behalf. */
export function clearRecent(): void {
  const s = store()
  if (!s) return
  try {
    s.removeItem(KEY)
  } catch {
    /* nothing to do, and nothing lost that was not already gone */
  }
}
