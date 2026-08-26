/* ============================================================
   CONSTRAINT REGISTRY — where the rules live until the store has
   a slice for them.

   TEMPORARY HOME, and deliberately shaped like the one the store
   will replace it with. `src/features/views/viewDefs.ts` did exactly
   this before the store grew `views` — same module registry, same
   `subscribe`/`publish`, same synchronous snapshot — and swapping it
   for the real slice touched nothing above `useConstraints()`.

   Two differences from that precedent, both required by the brief:

   1. Constraints are PER ORGANISATION. `ProjectMeta.org` is the
      scope for everything designed later (PLATFORM_VISION §2), so
      the registry is keyed by organisation and switching
      organisations shows a different set of rules, not a merged one.

   2. They must PERSIST. Until the store owns them, that is a
      localStorage mirror — the same interim the table canvas uses
      for its expansion state. It is written behind a debounce and
      read once at module load. The exact store action that retires
      it is named at the foot of `index.ts`.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import type { ClauseGroup, ConstraintDef, ConstraintKind, ProjectMeta } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { newId, nowIso } from '@/lib/id'
import { sanitiseAllObserved, sanitiseObserved } from '@/lib/observed/adopt'

/* ---------------------------------------------------------- */
/* Scope                                                      */
/* ---------------------------------------------------------- */

const NO_ORG = '__unnamed'

/** The organisation a constraint belongs to. Name-based because that
 *  is the only identity `OrgProfile` carries today; when the store
 *  owns constraints this becomes a plain foreign key. */
export const orgKeyOf = (meta: ProjectMeta): string =>
  meta.org?.name?.trim().toLowerCase() || NO_ORG

/* ---------------------------------------------------------- */
/* The registry                                               */
/* ---------------------------------------------------------- */

const byOrg = new Map<string, Map<string, ConstraintDef>>()
const listeners = new Set<() => void>()

const EMPTY: ConstraintDef[] = []

/** Rebuilt only in `publish`, so `getSnapshot` returns a stable
 *  reference between changes and `useSyncExternalStore` is happy. */
let snapshot: Record<string, ConstraintDef[]> = {}

function orgMap(key: string): Map<string, ConstraintDef> {
  let map = byOrg.get(key)
  if (!map) {
    map = new Map()
    byOrg.set(key, map)
  }
  return map
}

/** Same discipline as viewDefs: the snapshot updates SYNCHRONOUSLY so
 *  a reader can never see a stale list, but subscribers are told on a
 *  microtask so a component may create a constraint during a render
 *  without React complaining. The notify still lands before paint. */
function publish(): void {
  const next: Record<string, ConstraintDef[]> = {}
  for (const [key, map] of byOrg) next[key] = [...map.values()]
  snapshot = next
  save()
  const waiting = [...listeners]
  queueMicrotask(() => {
    for (const l of waiting) if (listeners.has(l)) l()
  })
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const getSnapshot = (): Record<string, ConstraintDef[]> => snapshot

/* ---------------------------------------------------------- */
/* Persistence — interim, see the header                      */
/* ---------------------------------------------------------- */

const STORAGE_KEY = 'helmlogic.constraints.v1'
let saveTimer: ReturnType<typeof setTimeout> | null = null

function save(): void {
  if (typeof window === 'undefined') return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    /* CHECKED AGAIN HERE, NOT ONLY ABOVE. The guard at the top of
       `save()` runs when the write is REQUESTED; this runs 300ms
       later, and in between the global can go. That is not
       hypothetical in tests — a suite that stubs `window` per case
       will unstub it while this timer is still pending — and it is
       the shape of a real teardown too. A timer that dereferences a
       global it checked a third of a second ago is a latent bug
       whether or not it is the one being chased. */
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      /* a full or blocked store must never break rule authoring */
    }
  }, 300)
}

function load(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return
    for (const [key, list] of Object.entries(parsed as Record<string, ConstraintDef[]>)) {
      if (!Array.isArray(list)) continue
      const map = orgMap(key)
      for (const c of list) {
        /* THROUGH THE COERCION ON THE WAY IN. Storage is a text file a
           person can edit, and an observed rule that came back from it
           claiming to block would have acquired, by hand, the one
           power `src/lib/observed/adopt.ts` exists to withhold. */
        if (c && typeof c.id === 'string' && c.if) map.set(c.id, sanitiseObserved(c))
      }
    }
    const next: Record<string, ConstraintDef[]> = {}
    for (const [key, map] of byOrg) next[key] = [...map.values()]
    snapshot = next
  } catch {
    /* corrupt storage is not worth a blank screen */
  }
}

load()

/* ---------------------------------------------------------- */
/* Reading                                                    */
/* ---------------------------------------------------------- */

/** Every constraint the CURRENT organisation has. */
export function useConstraints(): ConstraintDef[] {
  const key = useProjectStore((s) => orgKeyOf(s.meta))
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return all[key] ?? EMPTY
}

/** One constraint, re-rendering when it changes. */
export function useConstraint(id: string): ConstraintDef | undefined {
  const key = useProjectStore((s) => orgKeyOf(s.meta))
  const get = useCallback(() => byOrg.get(key)?.get(id), [key, id])
  return useSyncExternalStore(subscribe, get, get)
}

/** Non-hook read, for anything outside React (an export, a solve). */
export function getConstraints(): ConstraintDef[] {
  return snapshot[orgKeyOf(useProjectStore.getState().meta)] ?? EMPTY
}

export function getConstraint(id: string): ConstraintDef | undefined {
  return byOrg.get(orgKeyOf(useProjectStore.getState().meta))?.get(id)
}

/* ---------------------------------------------------------- */
/* Writing                                                    */
/* ---------------------------------------------------------- */

const currentKey = (): string => orgKeyOf(useProjectStore.getState().meta)

export interface NewConstraint {
  kind?: ConstraintKind
  if: ClauseGroup
  then?: ClauseGroup
  because: string
  why?: string
  source?: string
  priority?: number
}

/** There is no name, and that is the point: the sentence IS the name
 *  (`describeConstraint`). Adding a rule asks for nothing beyond the
 *  words already on screen. */
export function createConstraint(input: NewConstraint): ConstraintDef {
  const now = nowIso()
  const constraint: ConstraintDef = {
    id: newId(),
    kind: input.kind ?? 'implies',
    if: input.if,
    ...(input.then ? { then: input.then } : {}),
    because: input.because,
    ...(input.why ? { why: input.why } : {}),
    enabled: true,
    source: input.source ?? 'You, just now',
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    createdAt: now,
    updatedAt: now,
  }
  orgMap(currentKey()).set(constraint.id, constraint)
  publish()
  return constraint
}

/** Replace a constraint wholesale — the edit transforms in `edit.ts`
 *  return a finished ConstraintDef, so there is nothing to merge. */
export function putConstraint(constraint: ConstraintDef): void {
  const map = orgMap(currentKey())
  const current = map.get(constraint.id)
  /* an EDIT is a seam too: rewording an observed rule may not be a
     way to change what it is allowed to do */
  map.set(constraint.id, sanitiseObserved({
    ...constraint,
    createdAt: current?.createdAt ?? constraint.createdAt,
    updatedAt: nowIso(),
  }))
  publish()
}

/** The switch. Never a delete: the experiment is reversible and the
 *  authoring survives (CONFIGURATOR_SPEC §4b). Toggling is NOT an
 *  edit, so it does not raise the EDITED tag. */
export function setConstraintEnabled(id: string, enabled: boolean): void {
  const map = orgMap(currentKey())
  const current = map.get(id)
  if (!current || current.enabled === enabled) return
  map.set(id, { ...current, enabled, updatedAt: nowIso() })
  publish()
}

/** Seeding seam — an import, a demo, or the store once it owns these. */
export function registerConstraints(
  constraints: ConstraintDef[],
  orgKey: string = currentKey(),
): void {
  const map = orgMap(orgKey)
  for (const c of sanitiseAllObserved(constraints)) map.set(c.id, c)
  publish()
}

/** Used by a project reset; there is no per-rule delete by design. */
export function clearConstraints(orgKey: string = currentKey()): void {
  byOrg.get(orgKey)?.clear()
  publish()
}
