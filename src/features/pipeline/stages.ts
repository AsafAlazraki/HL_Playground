/* ============================================================
   WHERE A DEAL IS — the pipeline, and why it is not `QuoteState`.

   THE DISTINCTION THIS FILE EXISTS TO KEEP. `QuoteDef.state` is
   `draft | issued` and it is a fact about the DOCUMENT: draft is
   editable, issued is frozen and the only remaining act is to
   supersede it. That rule is load-bearing — the editor, the
   totals, the freeze and the version chain all read it — and it
   must not acquire a third value because a sales manager wants a
   column called "Negotiating".

   A STAGE IS A FACT ABOUT THE CONVERSATION. Issued and waiting,
   issued and being haggled over, won, lost: the document is
   identical in all four and only the deal has moved. So the stage
   is stored BESIDE the quote rather than on it, and moving a card
   across the board never edits the document — which is the
   property that lets a person drag a frozen quote without the
   frozen quote changing.

   THE DEFAULT IS DERIVED, NOT WRITTEN. Every quote that existed
   before this file did has no stage, and a board that showed them
   all in an "unsorted" column would be a migration disguised as a
   feature. `stageOf` reads the document's own state instead: a
   draft is in Draft, an issued quote is in Issued. Nothing is
   written until somebody actually moves a card, and a card moved
   back to its derived stage clears the override rather than
   storing it — so the store holds decisions, not defaults.

   WHAT IS NOT HERE YET, and is in docs/plan/SALES_BOARD.md:
   dealer-defined stages, what a stage change TRIGGERS, comments,
   attachments and reassignment. This is the spine those hang off.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import type { QuoteDef } from '@/features/quote'

export type StageId = 'draft' | 'issued' | 'negotiating' | 'won' | 'lost'

export interface Stage {
  id: StageId
  name: string
  /** one line under the column head when it is empty. A statement
   *  of what belongs here, never an instruction. */
  empty: string
  /** THE END OF THE ROAD, and it is drawn quieter for it. Won and
   *  lost are both closed; a board where the two closed columns
   *  shout as loudly as the three live ones is a board that draws
   *  the eye to work already finished. */
  closed: boolean
  /** won is the only green thing on this screen, and lost the only
   *  struck-through one. `tone` names which, and nothing else on
   *  the board carries a hue. */
  tone?: 'good' | 'gone'
}

export const STAGES: readonly Stage[] = [
  {
    id: 'draft',
    name: 'Draft',
    empty: 'Quotes being built. Nothing here yet.',
    closed: false,
  },
  {
    id: 'issued',
    name: 'Issued',
    empty: 'Given to a customer, waiting on an answer.',
    closed: false,
  },
  {
    id: 'negotiating',
    name: 'Negotiating',
    empty: 'Deals being talked through.',
    closed: false,
  },
  { id: 'won', name: 'Won', empty: 'Nothing won yet.', closed: true, tone: 'good' },
  { id: 'lost', name: 'Lost', empty: 'Nothing lost.', closed: true, tone: 'gone' },
]

export const stageById = (id: StageId): Stage =>
  STAGES.find((s) => s.id === id) ?? STAGES[0]

/* ------------------------------------------------------------
   THE STORE. Overrides only — see the header.
   ------------------------------------------------------------ */

const key = (orgSlug: string): string => `hl.pipeline.v1:${orgSlug}`

let cache: { k: string; v: Record<string, StageId> } | null = null
const listeners = new Set<() => void>()

const isStage = (v: unknown): v is StageId =>
  typeof v === 'string' && STAGES.some((s) => s.id === v)

function read(orgSlug: string): Record<string, StageId> {
  const k = key(orgSlug)
  if (cache && cache.k === k) return cache.v
  const out: Record<string, StageId> = {}
  try {
    const raw = globalThis.localStorage?.getItem(k)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [id, st] of Object.entries(parsed as Record<string, unknown>)) {
          if (isStage(st)) out[id] = st
        }
      }
    }
  } catch {
    /* a browser refusing storage still gets a working board, drawn
       from the derived stages */
  }
  cache = { k, v: out }
  return out
}

function write(orgSlug: string, v: Record<string, StageId>): void {
  cache = { k: key(orgSlug), v }
  try {
    globalThis.localStorage?.setItem(key(orgSlug), JSON.stringify(v))
  } catch {
    /* the in-memory copy stands for this session */
  }
  for (const l of listeners) l()
}

/** WHAT THE DOCUMENT'S OWN STATE IMPLIES. The one place the two
 *  models meet, so if `QuoteState` ever grows a value this is the
 *  single line that has to learn about it. */
export const derivedStage = (q: QuoteDef): StageId =>
  q.state === 'issued' ? 'issued' : 'draft'

/** Where this deal is: what somebody decided, or what the document
 *  implies. Pure, and takes the overrides, so a board can be
 *  tested without a browser. */
export function stageOf(q: QuoteDef, at: Record<string, StageId>): StageId {
  return at[q.id] ?? derivedStage(q)
}

/** Move one deal. Setting it back to its derived stage CLEARS the
 *  override rather than storing it, so the store never fills with
 *  entries that say what the document already said. */
export function moveTo(
  orgSlug: string,
  q: QuoteDef,
  stage: StageId,
): void {
  const at = { ...read(orgSlug) }
  if (stage === derivedStage(q)) delete at[q.id]
  else at[q.id] = stage
  write(orgSlug, at)
}

export function forgetPipeline(): void {
  cache = null
}

/* ------------------------------------------------------------
   READING IT
   ------------------------------------------------------------ */
function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useStages(orgSlug: string): Record<string, StageId> {
  const snap = useCallback(() => read(orgSlug), [orgSlug])
  return useSyncExternalStore(subscribe, snap, snap)
}

/** The deals in each column, in the order they were last touched —
 *  newest first, because a board is read for what is moving.
 *
 *  Returns every stage, including the empty ones: a column that
 *  disappeared when it emptied would make the board's shape change
 *  under the person using it, and an empty column is where you
 *  drop the next card. */
export function boardOf(
  quotes: readonly QuoteDef[],
  at: Record<string, StageId>,
): Record<StageId, QuoteDef[]> {
  const out = {} as Record<StageId, QuoteDef[]>
  for (const s of STAGES) out[s.id] = []
  for (const q of quotes) out[stageOf(q, at)].push(q)
  for (const s of STAGES) {
    out[s.id].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }
  return out
}
