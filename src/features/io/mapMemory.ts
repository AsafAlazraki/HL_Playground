/* ============================================================
   WHERE THIS BLOCK'S COLUMNS WENT LAST TIME.

   CONFIG_FINDINGS adopt 11 — the importer-registry shape,
   `{vendorMatch, columnMap, keyColumn, transformer, targetCollection}`,
   with the note "dormant there; exactly the object our column mapper
   should be." This is that object, translated rather than copied,
   because three of its five fields mean something different here and
   one of them this app deliberately refuses.

     vendorMatch        THE HEADINGS THEMSELVES. This app has no
                        vendor record and inventing one would be a
                        second directory nobody maintains. What
                        identifies a recurring source is the shape of
                        the block it sends: the same supplier's export
                        arrives with the same headings every month.
                        So the fingerprint IS the match.
     columnMap          kept, as `header → MapTo`. The dotted path is
                        theirs; a field id is ours.
     keyColumn          ALREADY ANSWERED and not stored again.
                        `planTableUpload` settles identity from the
                        row key or the display column, and a second
                        copy of that answer is a second place for it
                        to be wrong.
     transformer        REFUSED, and this is the one worth saying out
                        loud. Adopt 10 in the same list is "no
                        auto-match is better than a wrong one", and a
                        stored transformer is exactly the auto-match
                        that outlives the person who understood it.
                        Values are read by the COLUMN'S OWN TYPE, at
                        paste time, where a bad one can be shown.
     targetCollection   the table — part of the key, since the same
                        block pasted into two registers is two
                        mappings and not one.

   IT REMEMBERS A DECISION, NEVER A GUESS. Only what a person
   explicitly chose is written, at the moment they commit a paste.
   Nothing here reads a header and infers anything; the inference
   belongs to `csvSchema` and stays there, where it is offered rather
   than stored.

   AND IT NEVER APPLIES SILENTLY. `recall` hands back what was chosen
   last time and the surface says so — "mapped the way you did last
   time" — because a mapping that reappears with no sentence is
   indistinguishable from the app having guessed.

   A REMEMBERED COLUMN THAT NO LONGER EXISTS IS DROPPED AND SAID
   (rule 10). A table loses a column between two pastes and the memory
   would otherwise send that supplier's price into a field id nothing
   resolves.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import type { EntityDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { currentOrgKey, orgKeyOf } from '@/lib/orgKey'
import type { MapTo } from './pasteBlock'

/** What a person chose for one heading. `new` is deliberately not
 *  remembered — see `rememberable`. */
export type RememberedTo = { to: 'field'; fieldId: string } | { to: 'skip' }

export interface Remembered {
  /** the table it was pasted into */
  tableId: string
  /** the headings, normalised and sorted — the "vendor" */
  fingerprint: string
  /** heading (as normalised) → where it went */
  columns: Record<string, RememberedTo>
  /** when it was last used, so a stale shape can be dropped first */
  at: number
}

/** How many mappings are kept per business. A dealer has a handful of
 *  suppliers who send blocks; this is generous for that and small
 *  enough that the whole list is read at once. */
export const KEEP = 24

const key = (orgKey: string): string => `hl.colmap.v1:${orgKey}`
/* ONE COPY OF THIS LINE, IN THE FILE THAT OWNS THE KEY. It was
   written out in five places before `currentOrgKey` existed, and a
   line copied five times is five places for it to drift the next
   time the key changes — which it has done once already. */
const currentKey = currentOrgKey

/** One heading, reduced to what identifies it: case, punctuation and
 *  spacing are how the same column arrives spelled three ways. */
export const normHeader = (h: string): string =>
  h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * THE SHAPE OF A BLOCK — its headings, normalised and sorted.
 *
 * SORTED, so a supplier who moves a column between exports is still
 * recognised: the set of headings is the identity, not their order.
 * The order is remembered per heading in `columns` anyway, so nothing
 * is lost by not keying on it.
 *
 * An empty heading contributes nothing — a block pasted with no
 * header row has no shape to recognise, and `fingerprintOf` says so
 * by answering the empty string, which `recall` refuses to match.
 */
export function fingerprintOf(headers: readonly string[]): string {
  const names = headers.map(normHeader).filter((h) => h !== '')
  if (names.length === 0) return ''
  return [...names].sort().join('|')
}

/** Which choices are worth keeping. A `new` column is not: it was a
 *  decision to CREATE something, and replaying it would silently make
 *  a second column of the same name on the next paste. Once it exists
 *  it is an ordinary field and the next paste remembers it as one. */
function rememberable(to: MapTo): RememberedTo | null {
  if (to.to === 'field') return { to: 'field', fieldId: to.fieldId }
  if (to.to === 'skip') return { to: 'skip' }
  return null
}

let cache: { slug: string; rows: Remembered[] } | null = null
const listeners = new Set<() => void>()

function read(slug: string): Remembered[] {
  if (cache && cache.slug === slug) return cache.rows
  let rows: Remembered[] = []
  try {
    const raw = globalThis.localStorage?.getItem(key(slug))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) rows = parsed as Remembered[]
    }
  } catch {
    /* a browser refusing storage still gets a working session */
  }
  cache = { slug, rows }
  return rows
}

function write(slug: string, rows: Remembered[]): void {
  cache = { slug, rows }
  try {
    globalThis.localStorage?.setItem(key(slug), JSON.stringify(rows))
  } catch {
    /* the in-memory copy stands for this session */
  }
  for (const l of listeners) l()
}

/**
 * Keep what a person chose, against the shape of the block they
 * chose it for. Returns the record kept, or null when there was
 * nothing worth keeping.
 */
export function remember(
  tableId: string,
  headers: readonly string[],
  choices: readonly MapTo[],
  at = Date.now(),
  orgKey: string = currentKey(),
): Remembered | null {
  const fingerprint = fingerprintOf(headers)
  if (fingerprint === '') return null

  const columns: Record<string, RememberedTo> = {}
  headers.forEach((h, i) => {
    const name = normHeader(h)
    const choice = choices[i]
    if (name === '' || choice === undefined) return
    const keep = rememberable(choice)
    if (keep) columns[name] = keep
  })
  if (Object.keys(columns).length === 0) return null

  const row: Remembered = { tableId, fingerprint, columns, at }
  const rest = read(orgKey).filter(
    (r) => !(r.tableId === tableId && r.fingerprint === fingerprint),
  )
  write(orgKey, [row, ...rest].slice(0, KEEP))
  return row
}

/** What was chosen for this shape before, or null. */
export function recall(
  tableId: string,
  headers: readonly string[],
  orgKey: string = currentKey(),
): Remembered | null {
  const fingerprint = fingerprintOf(headers)
  if (fingerprint === '') return null
  return (
    read(orgKey).find((r) => r.tableId === tableId && r.fingerprint === fingerprint) ?? null
  )
}

/** What a remembered mapping says about THIS table as it stands now.
 *
 *  A column that has gone since is dropped and NAMED, so the surface
 *  can say which headings it no longer has an answer for rather than
 *  quietly leaving them unmapped and letting a person assume they
 *  were skipped on purpose. */
export interface Applied {
  /** heading (normalised) → where it goes, for columns still there */
  columns: Record<string, RememberedTo>
  /** headings whose remembered column has gone from the table */
  lost: string[]
}

export function applyTo(remembered: Remembered, entity: EntityDef): Applied {
  const live = new Set(entity.fields.map((f) => f.id))
  const columns: Record<string, RememberedTo> = {}
  const lost: string[] = []
  for (const [name, to] of Object.entries(remembered.columns)) {
    if (to.to === 'skip') {
      columns[name] = to
      continue
    }
    if (live.has(to.fieldId)) columns[name] = to
    else lost.push(name)
  }
  return { columns, lost }
}

/** Everything remembered for one table, newest first — for a surface
 *  that wants to show or forget them. */
export function mappingsFor(tableId: string, orgKey: string = currentKey()): Remembered[] {
  return read(orgKey).filter((r) => r.tableId === tableId)
}

export function forget(
  tableId: string,
  fingerprint: string,
  orgKey: string = currentKey(),
): void {
  write(
    orgKey,
    read(orgKey).filter((r) => !(r.tableId === tableId && r.fingerprint === fingerprint)),
  )
}

/** Test-time reset: the module cache outlives a cleared localStorage. */
export function forgetAllMappings(): void {
  cache = null
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** The mappings kept for one table, for a component. */
export function useMappings(tableId: string): Remembered[] {
  const orgKey = useProjectStore((s) => orgKeyOf(s.meta))
  const snap = useCallback(() => read(orgKey), [orgKey])
  const all = useSyncExternalStore(subscribe, snap, snap)
  return all.filter((r) => r.tableId === tableId)
}
