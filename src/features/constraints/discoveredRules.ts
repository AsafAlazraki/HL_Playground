/* ============================================================
   WHAT A PERSON DECIDED ABOUT A DISCOVERED PATTERN — kept, or
   dismissed, and either way it stays decided.

   WHY THIS IS NOT `constraintDefs.ts`. A kept pattern is NOT a
   `ConstraintDef` and must not become one, and the reason is
   structural rather than stylistic:

     · `ConstraintDef` has no severity. Its four kinds — implies,
       excludes, requires, table — all PRUNE: `src/lib/configure`
       propagates them into `ConfigureState.blocked`, which is how a
       value disappears from a picker. There is no way to write "warn
       about this and change nothing", so writing a measured pattern
       into that store would hand it exactly the power this engine
       exists to withhold.
     · `workbookRules.ts` states the rule this obeys: "an 'observed'
       seed may never be built with a kind that prunes", and
       `discover.ts` states it again as `MAY_PRUNE = false`.

   So a kept pattern lives HERE, in its own register, which nothing
   in the configurator reads. It can warn, it can be listed, it can
   be exported; it cannot delete a row from anybody's list, because
   there is no code path from this file to a domain. That is the
   safety property, and `discovery.test.ts` asserts it by asserting
   that nothing kept ever carries an enforcement other than 'warn' or
   'report' — the `Enforcement` type has no third member, so a
   pruning kept-rule cannot be written without editing `discover.ts`
   and arguing with `MAY_PRUNE` in writing.

   WHAT THE ORCHESTRATOR WOULD NEED TO CHANGE THAT. One field on
   `ConstraintDef` — `severity: 'block' | 'warn'` — with the
   configurator honouring 'warn' by annotating rather than blocking.
   Until that exists, this register is the honest home. `src/types/
   model.ts` is orchestrator-owned and was not touched.

   THE SHAPE IS `constraintDefs.ts`'s, deliberately: a module-level
   registry keyed by organisation, a synchronous snapshot, a
   microtask notify and a debounced localStorage mirror. When the
   store grows a slice for either, both swap the same way and nothing
   above the hooks changes.

   DISMISSED STAYS DISMISSED. A dismissal is a decision about a
   finding, not a filter on a list: the candidate is still measured
   on every run and still counted, it simply does not come back to
   the top of the page asking again. `forget` is the way back and it
   is what UNDO on the toast calls.
   ============================================================ */

import { useSyncExternalStore } from 'react'
import type { ProjectMeta } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { nowIso } from '@/lib/id'
import { MAY_PRUNE } from './discover'
import type { Candidate, CandidateShape, Enforcement } from './discover'
import { orgKeyOf } from './constraintDefs'

/* ---------------------------------------------------------- */
/* What is stored                                              */
/* ---------------------------------------------------------- */

export type DiscoveryDecision = 'kept' | 'dismissed'

/**
 * A DECISION, WITH THE MEASUREMENT THAT EARNED IT.
 *
 * The figures are copied in rather than referenced, on purpose: a
 * person kept this sentence when it read 626 of 626, and a later run
 * over an edited price file may read differently. Keeping both means
 * the screen can say so instead of quietly restating a new number as
 * though it were the one that was agreed to.
 */
export interface KeptPattern {
  /** the candidate's stable id — a re-run of the same project
   *  produces the same one, which is what makes a decision stick */
  id: string
  decision: DiscoveryDecision
  shape: CandidateShape
  relationship: string
  statement: string
  because: string
  source: string
  /** ALWAYS 'observed'. Nothing here was stated by the business. */
  evidence: 'observed'
  /** never prunes — there is no third member of `Enforcement` */
  enforcement: Enforcement
  hits: number
  tested: number
  /** mean share of the catalogue left standing, where the shape has
   *  one; null where it narrows nothing */
  meanLeft: number | null
  catalogue: number | null
  counterExampleTotal: number
  decidedAt: string
}

/** Re-asserted at this end of the wire as well. A register that
 *  stores rules has to say, in its own file, that none of them may
 *  prune — otherwise the guarantee lives only in the engine and the
 *  next person to add a consumer here never reads it. */
export const KEPT_MAY_PRUNE = MAY_PRUNE

/* ---------------------------------------------------------- */
/* The registry                                                */
/* ---------------------------------------------------------- */

const byOrg = new Map<string, Map<string, KeptPattern>>()
const listeners = new Set<() => void>()

const EMPTY: KeptPattern[] = []

let snapshot: Record<string, KeptPattern[]> = {}

function orgMap(key: string): Map<string, KeptPattern> {
  let map = byOrg.get(key)
  if (!map) {
    map = new Map()
    byOrg.set(key, map)
  }
  return map
}

function rebuild(): void {
  const next: Record<string, KeptPattern[]> = {}
  for (const [key, map] of byOrg) next[key] = [...map.values()]
  snapshot = next
}

function publish(): void {
  rebuild()
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

const getSnapshot = (): Record<string, KeptPattern[]> => snapshot

/* ---------------------------------------------------------- */
/* Persistence — interim, exactly as constraintDefs does it     */
/* ---------------------------------------------------------- */

const STORAGE_KEY = 'helmlogic.discovered.v1'
let saveTimer: ReturnType<typeof setTimeout> | null = null

function save(): void {
  if (typeof window === 'undefined') return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      /* a full or blocked store must never break a decision */
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
    for (const [key, list] of Object.entries(parsed as Record<string, KeptPattern[]>)) {
      if (!Array.isArray(list)) continue
      const map = orgMap(key)
      for (const k of list) {
        /* A STORED RULE THAT CLAIMS TO PRUNE IS DROPPED. Storage is
           editable by hand and this is the one property that may not
           be acquired by editing a JSON file. */
        if (!k || typeof k.id !== 'string') continue
        if (k.enforcement !== 'warn' && k.enforcement !== 'report') continue
        if (k.evidence !== 'observed') continue
        map.set(k.id, k)
      }
    }
    rebuild()
  } catch {
    /* corrupt storage is not worth a blank screen */
  }
}

load()

/* ---------------------------------------------------------- */
/* Reading                                                     */
/* ---------------------------------------------------------- */

const keyOf = (meta: ProjectMeta): string => orgKeyOf(meta)

/** Every decision the CURRENT organisation has made. */
export function useDiscoveryDecisions(): KeptPattern[] {
  const key = useProjectStore((s) => keyOf(s.meta))
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return all[key] ?? EMPTY
}

export function getDecisions(orgKey: string): KeptPattern[] {
  return snapshot[orgKey] ?? EMPTY
}

/* ---------------------------------------------------------- */
/* Writing                                                     */
/* ---------------------------------------------------------- */

/** Fold a measured candidate into a stored decision. Exported so the
 *  test can build one without a React tree. */
export function decisionFrom(c: Candidate, decision: DiscoveryDecision): KeptPattern {
  return {
    id: c.id,
    decision,
    shape: c.shape,
    relationship: c.relationship,
    statement: c.statement,
    because: c.because,
    source: c.source,
    evidence: 'observed',
    enforcement: c.enforcement,
    hits: c.hits,
    tested: c.tested,
    meanLeft: c.discrimination ? c.discrimination.meanLeft : null,
    catalogue: c.discrimination ? c.discrimination.catalogue : null,
    counterExampleTotal: c.counterExampleTotal,
    decidedAt: nowIso(),
  }
}

/** Record a decision. Returns what was stored, so a caller can put
 *  the same figures on the toast it raises. */
export function decide(
  orgKey: string,
  c: Candidate,
  decision: DiscoveryDecision,
): KeptPattern {
  const stored = decisionFrom(c, decision)
  orgMap(orgKey).set(stored.id, stored)
  publish()
  return stored
}

/** The way back — what UNDO calls. */
export function forget(orgKey: string, id: string): void {
  const map = byOrg.get(orgKey)
  if (!map || !map.has(id)) return
  map.delete(id)
  publish()
}

/** For `resetProject()`, beside `clearConstraints()`. A wiped project
 *  that comes back carrying the last organisation's decisions is the
 *  same fault the constraint registry records. */
export function clearDecisions(): void {
  byOrg.clear()
  publish()
}
