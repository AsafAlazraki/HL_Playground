/* ============================================================
   THE ORDER OF THE MODULE TILES ON ONE PERSON'S FRONT DOOR.

   WHY THIS IS NOT `ModuleDef.order`. That field is the BUSINESS's
   order — it decides the modules screen and it is the same for
   everybody who signs in. What a salesperson wants on their own
   dashboard is their own three brands at the top, and writing
   that into the shared model would rearrange the modules screen
   for the whole dealership every time one person dragged a tile.
   Two different facts, so two different stores.

   IT IS KEYED THE SAME WAY THE CARD ARRANGEMENT IS — person plus
   organisation — because it is the same kind of preference and
   ought to travel with it.

   WHAT IT STORES IS PLACE KEYS, NOT INDICES. A stored index is a
   claim about a list that has since had a brand added to it; a
   key still means the same brand tomorrow. Anything stored that
   no longer resolves is dropped on read and anything new is
   appended in the order the business gives it, so a module added
   next week appears at the bottom rather than nowhere.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'

export interface TileWho {
  userId: string
  orgSlug: string
}

const key = (who: TileWho): string => `hl.dash.tiles.v1:${who.orgSlug}:${who.userId}`

const listeners = new Set<() => void>()
let cache: { k: string; v: string[] } | null = null

function read(who: TileWho): string[] {
  const k = key(who)
  if (cache && cache.k === k) return cache.v
  let out: string[] = []
  try {
    const raw = globalThis.localStorage?.getItem(k)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) out = parsed.filter((v): v is string => typeof v === 'string')
    }
  } catch {
    /* a browser refusing storage still gets the business's order */
  }
  cache = { k, v: out }
  return out
}

function write(who: TileWho, v: string[]): void {
  cache = { k: key(who), v }
  try {
    globalThis.localStorage?.setItem(key(who), JSON.stringify(v))
  } catch {
    /* the in-memory copy stands for this session */
  }
  for (const l of listeners) l()
}

/** THE STORED ORDER APPLIED TO THE LIST AS IT IS TODAY.
 *
 *  Pure, and exported so it can be tested without a browser: the
 *  stored keys first in their stored order, then everything the
 *  store has never seen, in the order the business gave it. */
export function applyOrder<T>(items: readonly T[], keyOf: (t: T) => string, order: readonly string[]): T[] {
  if (order.length === 0) return [...items]
  const byKey = new Map(items.map((i) => [keyOf(i), i]))
  const out: T[] = []
  const taken = new Set<string>()
  for (const k of order) {
    const it = byKey.get(k)
    if (it !== undefined && !taken.has(k)) {
      out.push(it)
      taken.add(k)
    }
  }
  for (const i of items) if (!taken.has(keyOf(i))) out.push(i)
  return out
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export interface TileOrderApi {
  order: string[]
  /** record the whole list in its new order. The caller hands the
   *  full set of keys rather than a pair, so what is stored is
   *  always a complete, self-repairing statement of the order. */
  set: (keys: readonly string[]) => void
}

export function useTileOrder(who: TileWho): TileOrderApi {
  const snap = useCallback(() => read(who), [who])
  const order = useSyncExternalStore(subscribe, snap, snap)
  const set = useCallback((keys: readonly string[]) => write(who, [...keys]), [who])
  return { order, set }
}

/** for tests, and for a sign-out that should leave nothing behind */
export function forgetTileOrder(): void {
  cache = null
}
