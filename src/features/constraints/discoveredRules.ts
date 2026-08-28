/* ============================================================
   WHAT A PERSON DECIDED ABOUT A DISCOVERED PATTERN — kept, or
   dismissed, and either way it stays decided.

   ── THE FIELD ARRIVED, AND A KEPT PATTERN CAN NOW GO HOME ────

   This file used to open by explaining why a kept pattern is NOT a
   `ConstraintDef` and must never become one. The argument was:

     · `ConstraintDef` has no severity. Its four kinds — implies,
       excludes, requires, table — all PRUNE, so writing a measured
       pattern into that store would hand it exactly the power this
       engine exists to withhold;
     · so a kept pattern lives here, in a register nothing in the
       configurator reads; it cannot delete a row from anybody's list
       because there is no code path from this file to a domain.

   That was true and it was also the whole problem. A kept pattern
   was LISTED AND INERT — it could not be edited, switched off,
   exported or reasoned about like a rule, and the panel that offered
   to keep it promised a warning that nothing anywhere delivered.

   The paragraph that used to end this section said what would change
   it: "One field on `ConstraintDef` — `severity: 'block' | 'warn'` —
   with the configurator honouring 'warn' by annotating rather than
   blocking." BOTH NOW EXIST. `severity` is on the type (absent means
   'block', so nothing already written changed meaning) and
   `src/lib/configure/solve.ts` honours 'warn' on its own channel,
   `warned`, which never overlaps `blocked`.

   SO A KEPT PATTERN IS ADOPTED AS A REAL RULE — see
   `adoptKeptPatterns` at the foot of this file and the door it goes
   through, `src/lib/observed/adopt.ts`.

   THE GUARANTEE DID NOT MOVE, IT GOT STRONGER. It used to rest on
   there being no code path; it now rests on a coercion applied at
   every seam a ConstraintDef can enter the registry — adoption,
   `registerConstraints`, `putConstraint` and the localStorage
   `load`. Nothing carrying observed provenance can hold 'block',
   including a rule hand-edited in storage, and `observed.test.ts`
   proves it by trying.

   THIS REGISTER STILL EXISTS AND IS STILL THE DECISION OF RECORD.
   Adoption does not replace it: it holds the MEASUREMENT that earned
   the decision (see `KeptPattern` below on why the figures are
   copied rather than referenced), it holds dismissals, which are not
   rules at all, and it holds every kept pattern whose shape this app
   cannot yet state as a sentence — with the blocker, in words, the
   same way `RulesLedger` draws the sixteen workbook seeds.

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
import type { ConstraintDef, EntityDef, ProjectMeta } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { nowIso } from '@/lib/id'
import {
  adoptObserved,
  OBSERVED_ID_PREFIX,
  type Adoption,
  type ObservedPattern,
} from '@/lib/observed/adopt'
import { MAY_PRUNE } from './discover'
import type { Candidate, CandidateBinding, CandidateShape, Enforcement } from './discover'
import { buildConcepts, representativeFieldId, type ColumnConcept } from './columns'
import { getConstraint, orgKeyOf, registerConstraints, setConstraintEnabled } from './constraintDefs'

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
  /** THE TWO COLUMNS THE FINDING BINDS, so the decision can be turned
   *  into a rule that points at something. A decision stored before
   *  adoption existed has no `binds`, and adoption answers it with a
   *  blocker rather than a guess — which is why this is optional and
   *  why nothing here back-fills it. */
  binds?: CandidateBinding | null
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
    binds: c.binds ?? null,
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
  /* KEEPING IT IS WHAT MAKES THE RULE. The toast says the pattern now
     flags a pairing that disagrees; this is the line that makes that
     sentence true. It is safe to fail — `adoptKeptPatterns` reports
     rather than throws, and the decision above is already stored. */
  if (decision === 'kept') adoptKeptPatterns(orgKey)
  return stored
}

/** The way back — what UNDO calls. */
export function forget(orgKey: string, id: string): void {
  const map = byOrg.get(orgKey)
  if (!map || !map.has(id)) return
  map.delete(id)
  publish()
  /* STOP KEEPING IT AND THE RULE STOPS, but it is switched off and
     never deleted — the registry has no per-rule delete by design,
     and UNDO on the toast has to be able to bring it back with the
     person's own edits and wording intact. */
  if (isCurrentOrg(orgKey)) setConstraintEnabled(`${OBSERVED_ID_PREFIX}${id}`, false)
}

/** For `resetProject()`, beside `clearConstraints()`. A wiped project
 *  that comes back carrying the last organisation's decisions is the
 *  same fault the constraint registry records. */
export function clearDecisions(): void {
  byOrg.clear()
  publish()
}

/* ---------------------------------------------------------- */
/* Adoption — the register's one door into the rule store      */
/* ---------------------------------------------------------- */

const isCurrentOrg = (orgKey: string): boolean =>
  orgKey === orgKeyOf(useProjectStore.getState().meta)

/**
 * conceptKey -> the field id a clause may point at.
 *
 * NOT `conceptIndex`, which is keyed by FIELD ID. A finding names a
 * column the way `buildConcepts` mints keys — `kind::normalised name`,
 * e.g. 'trailer::atm (kg)' — and `conceptByKey` is what reads one.
 * Getting this wrong does not throw: every adoption simply comes back
 * blocked with "no table carries that column any more", which is a
 * sentence about the project rather than about the code. Hence the
 * note, and hence `adoptKept.test.ts` resolving a real one.
 */
function resolverFor(entities: Record<string, EntityDef>): (key: string) => string | undefined {
  const byKey = new Map<string, ColumnConcept>()
  for (const c of buildConcepts(entities)) byKey.set(c.key, c)
  return (conceptKey) => {
    const concept = byKey.get(conceptKey)
    return concept ? representativeFieldId(concept) : undefined
  }
}

/** What one call did, in the shape `SeedReport` already uses, so the
 *  two seeding surfaces read the same. */
export interface AdoptionReport {
  /** ids adopted as rules by THIS call */
  adopted: string[]
  /** already in the rule store — left exactly as they are, so an edit
   *  survives and a rule switched off stays off */
  alreadyAdopted: string[]
  /** kept, but this app cannot state it as a sentence yet; the reason
   *  is the value, in the words a card prints */
  blocked: Array<{ id: string; why: string }>
}

/**
 * Every kept pattern this organisation holds, offered to the rule
 * store as a real `ConstraintDef` carrying severity 'warn'.
 *
 * IDEMPOTENT, AND NON-DESTRUCTIVE IN BOTH DIRECTIONS. A pattern
 * whose rule already exists is never rebuilt — the wording a person
 * changed and the switch they threw are theirs — except that
 * re-keeping something they had stopped keeping switches its rule
 * back on, which is the only thing "keep it again" can honestly
 * mean.
 *
 * Safe to call on every load and every time the tables change: a
 * pattern whose columns are not in this project yet comes back under
 * `blocked` and is tried again next time, rather than being written
 * bound to nothing. That is `seedWorkbookConstraints`'s contract,
 * deliberately.
 */
export function adoptKeptPatterns(orgKey?: string): AdoptionReport {
  const report: AdoptionReport = { adopted: [], alreadyAdopted: [], blocked: [] }
  const state = useProjectStore.getState()
  const key = orgKey ?? orgKeyOf(state.meta)
  /* the rule registry writes to the CURRENT organisation; adopting
     into a different one from here would put rules somewhere nobody
     asked for them */
  if (!isCurrentOrg(key)) return report

  const kept = (snapshot[key] ?? EMPTY).filter((k) => k.decision === 'kept')
  if (kept.length === 0) return report

  const resolve = resolverFor(state.entities)

  const now = nowIso()
  const fresh: ConstraintDef[] = []
  for (const k of kept) {
    const id = `${OBSERVED_ID_PREFIX}${k.id}`
    const existing = getConstraint(id)
    if (existing) {
      report.alreadyAdopted.push(k.id)
      /* re-keeping switches it back on; nothing else about it moves */
      if (existing.enabled === false) setConstraintEnabled(id, true)
      continue
    }
    const result: Adoption = adoptObserved(asObservedPattern(k), resolve, now)
    if (result.adopted) {
      fresh.push(result.adopted)
      report.adopted.push(k.id)
    } else {
      report.blocked.push({ id: k.id, why: result.blocked })
    }
  }

  if (fresh.length > 0) registerConstraints(fresh, key)
  return report
}

/** The register's record, reduced to what the door takes. Written out
 *  rather than spread, so a field added here is a decision and not an
 *  accident. */
function asObservedPattern(k: KeptPattern): ObservedPattern {
  return {
    id: k.id,
    shape: k.shape,
    statement: k.statement,
    because: k.because,
    source: k.source,
    binds: k.binds ?? null,
    hits: k.hits,
    tested: k.tested,
  }
}

/**
 * WHY ONE KEPT PATTERN IS NOT A RULE, or undefined when it is one.
 *
 * Rule 10 in one function: a card listing a kept pattern that this
 * app cannot state has to say so IN PLACE, in words a person can
 * argue with, rather than leaving a row that quietly does nothing.
 * `RulesLedger` already draws exactly this for the sixteen
 * workbook seeds; this is the same answer for a measured one.
 *
 * PURE — it takes the tables rather than reading the store, so a
 * render may ask it and a test may prove it. It answers "could this
 * be stated as a rule at all", which is the question the card asks;
 * whether it already HAS been is `adoptKeptPatterns`'s report.
 */
export function adoptionBlocker(
  k: KeptPattern,
  entities: Record<string, EntityDef>,
): string | undefined {
  if (!k || k.decision !== 'kept') return undefined
  return adoptObserved(asObservedPattern(k), resolverFor(entities), k.decidedAt).blocked
}
