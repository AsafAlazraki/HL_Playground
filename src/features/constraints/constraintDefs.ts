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

/* THE KEY ITSELF MOVED TO `@/lib/orgKey`, and is re-exported here
   because forty call sites in this feature read it from this file and
   because this is where the defect it fixes was found. It left
   because a second store is now keyed the same way — the merge log in
   `features/io/evidence.ts` — and the fallback below is the one part
   of this app that must never exist twice. */
import { legacyOrgKeyOf, orgKeyOf } from '@/lib/orgKey'
export { legacyOrgKeyOf, orgKeyOf }

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

/** The switch, and it is still the everyday control: switching a rule
 *  off is the reversible experiment the whole "ask why → switch it off
 *  → watch the option come back" loop depends on, and it keeps the
 *  authoring. Toggling is NOT an edit, so it does not raise the EDITED
 *  tag. Deleting is the other act, below. */
export function setConstraintEnabled(id: string, enabled: boolean): void {
  const map = orgMap(currentKey())
  const current = map.get(id)
  if (!current || current.enabled === enabled) return
  map.set(id, { ...current, enabled, updatedAt: nowIso() })
  publish()
}

/**
 * MOVE A BUSINESS'S RULES ONTO ITS SLUG — TENANCY §4.1's migration.
 *
 * Called with the sheet's own meta, so it can see both keys at once:
 * the slug it has now and the lowercased name it was filed under
 * before. It moves anything sitting under the old key and takes the
 * old key away, so the move happens once and the second call is free.
 *
 * NOTHING IS OVERWRITTEN. A rule already under the slug wins — it is
 * the newer authoring by construction, since the slug key is the one
 * everything writes to now. The old entry is dropped rather than
 * merged, because two rules with one id are one rule.
 *
 * Returns how many moved, so a caller can say so rather than guess.
 */
export function adoptSlugKey(meta: ProjectMeta): number {
  const from = legacyOrgKeyOf(meta)
  if (!from) return 0
  const stale = byOrg.get(from)
  if (!stale || stale.size === 0) {
    byOrg.delete(from)
    return 0
  }
  const to = orgMap(orgKeyOf(meta))
  let moved = 0
  for (const [id, def] of stale) {
    if (to.has(id)) continue
    to.set(id, def)
    moved += 1
  }
  byOrg.delete(from)
  publish()
  return moved
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

/** Used by a project reset. Every rule this organisation has, at once
 *  — `deleteConstraint` is the one-at-a-time act. */
export function clearConstraints(orgKey: string = currentKey()): void {
  byOrg.get(orgKey)?.clear()
  publish()
}

/* ============================================================
   DELETING ONE RULE.

   THIS WAS REFUSED BY DESIGN UNTIL 2026-09-11, and allowing it is the
   owner's decision rather than a deduction. CONFIGURATOR_SPEC §4b
   said "rules toggle off, they are never deleted — the experiment is
   reversible and the authoring survives", and this file implemented
   exactly that. CLUELESS_USER_TESTS Finding 15 disagreed, and the
   cost of the spec as written was real: a dealer who writes a bad
   rule could only ever switch it off, so dead rules accumulate for
   the life of the sheet and `clearConstraints` — the only removal —
   throws away the good ones with them.

   THE SWITCH IS UNCHANGED AND IS STILL THE ORDINARY ACT. What is
   added is a way to be finished with a rule, not a replacement for
   being able to pause one.

   IT IS UNDOABLE, AND NOT BY THE PROJECT STORE'S UNDO. This registry
   is its own map behind its own localStorage key, so Ctrl+Z does not
   reach it: the caller gets the removed definition back, and a toast
   carrying UNDO puts it there again (rule 9 — an undoable act gets a
   toast, never a dialog). Handing the definition back rather than a
   boolean is what lets that happen without this file knowing anything
   about toasts.

   A DELETED SEED STAYS DELETED. `workbookRules.ts` keeps a ledger of
   the seed ids it has already written and never rebuilds one. Its own
   words, written long before this existed: "a rule they removed stays
   gone."
   ============================================================ */

/** Take one rule out, and hand it back so the toast can put it back.
 *  `undefined` means there was nothing to delete, which is the answer
 *  a second press gets. */
export function deleteConstraint(
  id: string,
  orgKey: string = currentKey(),
): ConstraintDef | undefined {
  const map = byOrg.get(orgKey)
  const gone = map?.get(id)
  if (!map || !gone) return undefined
  map.delete(id)
  publish()
  return gone
}

/** The way back from a delete — the definition as it was, not an edit
 *  of it. `putConstraint` re-stamps `updatedAt`, which is right for a
 *  rewording and wrong here: undoing a delete did not change the rule,
 *  so its own dates travel with it. Still through the observed
 *  coercion, because that guard is about what a definition may claim
 *  rather than about where it arrived from. */
export function restoreConstraint(
  constraint: ConstraintDef,
  orgKey: string = currentKey(),
): void {
  orgMap(orgKey).set(constraint.id, sanitiseObserved(constraint))
  publish()
}
