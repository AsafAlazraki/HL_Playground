/* ============================================================
   io/evidence — WHAT THE FILE ACTUALLY DID, AFTER IT DID IT.

   CONFIG_FINDINGS §4 adopt 7, the half that was missing: "Dry-run by
   default, `--apply` to write, before/after JSONL evidence logs."
   The dry run has been built since `tableCsv.ts` was written — that
   file's whole argument is that `planTableUpload` NEVER writes and
   the plan is the product. The preflight draws every cell that would
   change, old value beside new, because "12 rows overwritten" is a
   number a person has to trust and `Cash 68,990 → 71,990 on Sport
   560` is a fact they can check.

   AND THEN THE PERSON PRESSES MERGE AND ALL OF IT IS GONE. The
   sentence they checked lives four seconds as a toast and nothing
   anywhere holds what was on the sheet before. `HELMLOGIC_GROUND_
   TRUTH` §3 measured the production importer this app is replacing:
   `import-boats.py` writes 4.9 MB of JSONL apply-logs for boats and
   26.5 MB for parts, before and after on every write, and says our
   undo story should be exactly this. A week later "who changed the
   Highfield prices, and from what" is a question about a spreadsheet
   somebody emailed on Tuesday, and the app is the only thing that
   ever knew the answer.

   SO THIS KEEPS THE PLAN, NOT A NEW MEASUREMENT. Every field below
   is a `CellChange` the preflight already drew: same row label, same
   column name, same rendered from/to. An evidence log that re-derived
   its values would be a second reading of the same event, free to
   disagree with the one the person approved — and the one they
   approved is the one that has to be on the record.

   IT IS NOT AN ARCHIVE, AND SAYS SO WHERE IT IS SHORT. A browser
   gives this app about five megabytes for everything, so the log
   keeps the last `KEEP` merges and at most `CELLS_KEPT` cells of
   each, and every record carries `cellTotal` — the real number —
   beside the cells it still holds. A log that quietly kept 300 of
   2,341 changes and drew no difference between that and a complete
   one would be worse than no log: it would answer "was this cell
   touched" with a confident no.

   WHAT IT DOES NOT DO. It does not reverse anything — `offerUndo`
   already carries the merge back out in one step, and this records
   that it happened rather than how to undo it. It does not record
   cell edits typed by hand, which are one act at a time with
   somebody watching; the finding is about the door where four
   hundred values arrive at once from a file nobody in the building
   wrote.
   ============================================================ */

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { currentUser } from '@/features/auth'
import { orgKeyOf } from '@/lib/orgKey'
import { useProjectStore } from '@/store/useProjectStore'
import type { CellChange } from './tableCsv'

/** A row the merge created. The values are not kept: a row that did
 *  not exist has no "before", and the row itself is on the sheet to
 *  read. What a log has to answer is WHICH rows appeared. */
export interface AddedRow {
  label: string
}

/** One merge, as it happened. */
export interface MergeEvidence {
  id: string
  /** epoch ms, stored as a number so a sort never parses a string */
  at: number
  /** who was signed in. Undefined is honest; "System" is not — the
   *  same rule `activity.ts` keeps two folders over. */
  who?: string
  tableId: string
  tableName: string
  /** the file's own name, or the sentence the paste door uses. This
   *  is the thing a person searches their mail for. */
  source: string
  /** how the lines found their rows, which decides how much the
   *  match itself is worth */
  matchedOn: 'key' | 'name'
  /** before and after, as the preflight drew them */
  cells: CellChange[]
  /** how many there really were. Equal to `cells.length` unless the
   *  cap below bit, and the surface says so when it did. */
  cellTotal: number
  rowsChanged: number
  added: AddedRow[]
  addedTotal: number
}

/** How many merges are kept. Ten is about a month of a dealer's
 *  price-file traffic and comfortably inside the storage a browser
 *  gives one origin. */
export const KEEP = 10

/** How many changed cells one merge keeps. A full Highfield re-upload
 *  is 40-odd; the biggest merge this app can be handed is a whole
 *  register, and 300 lines is enough to answer "what did it do" while
 *  leaving room for nine more records. `cellTotal` carries the truth
 *  either way. */
export const CELLS_KEPT = 300

/** How many new rows one merge names, for the same reason. */
export const ADDED_KEPT = 60

const key = (orgKey: string): string => `hl.merges.v1:${orgKey}`

/** THE BUSINESS THIS LOG BELONGS TO, resolved the one way this app
 *  resolves it — TENANCY §4.1's slug off the project's own meta, via
 *  `orgKeyOf`. Not `AppUser.orgSlug`: the log is a fact about the
 *  SHEET, so a colleague signing in on the same machine reads the
 *  same merges, which is the case an apply-log exists for. */
const currentKey = (): string => orgKeyOf(useProjectStore.getState().meta)

let cache: { slug: string; rows: MergeEvidence[] } | null = null
const listeners = new Set<() => void>()

function read(slug: string): MergeEvidence[] {
  if (cache && cache.slug === slug) return cache.rows
  let rows: MergeEvidence[] = []
  try {
    const raw = globalThis.localStorage?.getItem(key(slug))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) rows = parsed as MergeEvidence[]
    }
  } catch {
    /* a browser refusing storage still gets a working session log */
  }
  cache = { slug, rows }
  return rows
}

/**
 * THE WRITE, AND WHAT IT DOES WHEN THE DRAWER IS FULL.
 *
 * `localStorage` throws rather than evicts, and a log that lost the
 * merge somebody just approved because of one somebody approved in
 * March would be keeping the wrong end. So a refusal drops the OLDEST
 * record and tries again, down to the new one on its own — and if
 * even that will not fit, the in-memory copy stands for this session
 * rather than the write taking the whole list down with it.
 */
function write(slug: string, rows: MergeEvidence[]): void {
  let attempt = rows
  let saved = false
  while (attempt.length > 0) {
    try {
      globalThis.localStorage?.setItem(key(slug), JSON.stringify(attempt))
      saved = true
      break
    } catch {
      attempt = attempt.slice(0, -1)
    }
  }
  /* THE MEMORY COPY IS WHAT WAS SAVED, not what was asked for: a
     record dropped to make room is gone at the next reload, and a
     list that goes on drawing it until then is the log disagreeing
     with itself across a refresh.
     A BROWSER THAT REFUSES STORAGE ALTOGETHER is the other case and
     the opposite answer — nothing was dropped for room, so the whole
     list stands for this session, exactly as the activity log does
     one folder over. */
  cache = { slug, rows: saved || rows.length === 0 ? attempt : rows }
  for (const l of listeners) l()
}

/** What a merge is worth recording at all. A file that matched
 *  nothing and changed nothing is not an event: it is somebody
 *  picking the wrong file, and the preflight already told them so. */
export interface MergeFacts {
  tableId: string
  tableName: string
  source: string
  matchedOn: 'key' | 'name'
  changes: readonly CellChange[]
  added: readonly string[]
  rowsChanged: number
}

/** Put one merge on the record. Returns the record, so the caller can
 *  name it in the sentence it raises. */
export function recordMerge(
  facts: MergeFacts,
  at = Date.now(),
  orgKey: string = currentKey(),
): MergeEvidence | null {
  if (facts.changes.length === 0 && facts.added.length === 0) return null
  const user = currentUser()
  const row: MergeEvidence = {
    id: `m${at.toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`,
    at,
    ...(user ? { who: user.name } : {}),
    tableId: facts.tableId,
    tableName: facts.tableName,
    source: facts.source,
    matchedOn: facts.matchedOn,
    cells: facts.changes.slice(0, CELLS_KEPT),
    cellTotal: facts.changes.length,
    rowsChanged: facts.rowsChanged,
    added: facts.added.slice(0, ADDED_KEPT).map((label) => ({ label })),
    addedTotal: facts.added.length,
  }
  write(orgKey, [row, ...read(orgKey)].slice(0, KEEP))
  return row
}

/** Every merge on the record, newest first. */
export function mergesOf(tableId?: string, orgKey: string = currentKey()): MergeEvidence[] {
  const rows = read(orgKey)
  return tableId ? rows.filter((r) => r.tableId === tableId) : rows
}

export function clearMerges(orgKey: string = currentKey()): void {
  write(orgKey, [])
}

/** Test-time reset: the module cache outlives a cleared localStorage,
 *  which is the one thing a suite can be caught by. */
export function forgetMerges(): void {
  cache = null
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/**
 * The merges into ONE register, which is where the question is asked:
 * a person standing in Highfield wants to know what landed in
 * Highfield.
 *
 * IT SUBSCRIBES TO THE WHOLE LIST AND FILTERS AFTERWARDS, and that
 * is not a detail. `useSyncExternalStore` compares what the snapshot
 * returns by IDENTITY on every render, so handing it `mergesOf(…)` —
 * which ends in `.filter` — gave it a new array each time, and React
 * re-rendered forever. Measured in the running app: opening the
 * Labour Rates register in its List lens printed "The result of
 * getSnapshot should be cached to avoid an infinite loop" and then
 * "Maximum update depth exceeded", and the page went white. Every
 * guard was green — a typecheck, a lint and 2,700 tests cannot see a
 * render loop, and the only thing that found it was driving the real
 * screen. `read` returns the cached array by reference, so this is
 * stable between writes; the filter is memoised against it.
 */
export function useMerges(tableId: string): MergeEvidence[] {
  const orgKey = useProjectStore((s) => orgKeyOf(s.meta))
  const snap = useCallback(() => read(orgKey), [orgKey])
  const all = useSyncExternalStore(subscribe, snap, snap)
  return useMemo(() => all.filter((r) => r.tableId === tableId), [all, tableId])
}

/* ------------------------------------------------------------ */
/* the file                                                      */
/* ------------------------------------------------------------ */

/**
 * THE LOG AS A FILE — one JSON object per line, which is the shape
 * the finding names and the shape the production importer already
 * writes.
 *
 * WHY JSONL AND NOT JSON. An apply-log is appended to and read a line
 * at a time; `grep` finds a row in it, `tail` reads the end of one too
 * big to open, and a truncated file still parses up to its last
 * newline. A 26 MB JSON array has none of those properties. Nothing
 * here streams yet — this builds the whole string — but the format is
 * the one that stays right when it does.
 *
 * EVERY LINE STANDS ALONE, carrying when, who and which table, so a
 * line pasted into a mail to the person who sent the spreadsheet is
 * still a complete fact. That is the only reason to repeat the header
 * fields on every row.
 */
export function mergeJsonl(m: MergeEvidence): string {
  const stamp = new Date(m.at).toISOString()
  const head = {
    at: stamp,
    ...(m.who ? { who: m.who } : {}),
    table: m.tableName,
    tableId: m.tableId,
    source: m.source,
  }
  const lines: string[] = [
    JSON.stringify({
      ...head,
      op: 'merge',
      matchedOn: m.matchedOn,
      cells: m.cellTotal,
      cellsInThisFile: m.cells.length,
      rows: m.rowsChanged,
      added: m.addedTotal,
    }),
  ]
  for (const c of m.cells) {
    lines.push(
      JSON.stringify({
        ...head,
        op: 'update',
        rowId: c.rowId,
        row: c.rowLabel,
        column: c.columnName,
        before: c.from,
        after: c.to,
      }),
    )
  }
  for (const a of m.added) {
    lines.push(JSON.stringify({ ...head, op: 'add', row: a.label }))
  }
  /* THE TRAILING NEWLINE IS PART OF THE FORMAT. `cat a.jsonl
     b.jsonl` has to produce a readable file, and without it the last
     record of the first log and the first of the second arrive as one
     unparseable line. */
  return `${lines.join('\n')}\n`
}

const kebab = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'merge'

/** `highfield-inflatables-20260911-1412.jsonl` — the register, then
 *  when, because a person saving two of these wants them to sort. */
export function mergeFileName(m: MergeEvidence): string {
  const d = new Date(m.at)
  const p = (n: number): string => String(n).padStart(2, '0')
  const when = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
  return `${kebab(m.tableName)}-${when}.jsonl`
}
