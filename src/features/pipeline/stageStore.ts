/* ============================================================
   THE DEALERSHIP'S OWN STAGES — named, coloured and ordered by
   the people who use them.

   WHY THE LIST IS STORED AND THE TWO ANCHORS ARE NOT DELETABLE.

   `stages.ts` explains why a pipeline stage is not `QuoteState`:
   the document's state is `draft | issued` and a quote that nobody
   has moved DERIVES its column from it. That derivation is what
   let the board ship without a migration — but it only works if
   there is always a column for each of those two answers to land
   in. So `draft` and `issued` are anchors: a dealer may rename
   them, recolour them and move them, and may not remove them.
   Everything else is theirs.

   THE REFUSAL IS A SENTENCE, IN THE PLACE IT HAPPENS (rule 10).
   `whyNot` returns the reason rather than the editor testing a
   flag, so the panel can print the reason next to the control it
   belongs to instead of greying a button.

   REMOVING A STAGE NEVER LOSES A DEAL. Anything standing in it is
   moved to the stage on its left — said out loud in the panel
   before the act, and undoable after it. A stage that took its
   cards with it would be a delete pretending to be a setting.

   COLOUR IS FROM A NAMED SET, NOT A PICKER. A free colour well
   invites a dealer to choose something that fails 4.5:1 against
   the column head, and the guards cannot see contrast. These six
   were measured; see `pipeline.css`.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'

export type StageTone = 'neutral' | 'blue' | 'amber' | 'violet' | 'green' | 'red'

export const TONES: readonly { id: StageTone; label: string }[] = [
  { id: 'neutral', label: 'Grey' },
  { id: 'blue', label: 'Blue' },
  { id: 'amber', label: 'Amber' },
  { id: 'violet', label: 'Violet' },
  { id: 'green', label: 'Green' },
  { id: 'red', label: 'Red' },
]

export interface StageDef {
  id: string
  name: string
  /** one line under an empty column: what belongs here. A statement
   *  of fact, never an instruction. */
  empty: string
  tone: StageTone
  /** finished work — drawn quieter, because a board where the two
   *  closed columns shout as loudly as the live ones draws the eye
   *  to work already done */
  closed: boolean
}

/** THE TWO THE DERIVATION NEEDS. See the header. */
export const ANCHORS: readonly string[] = ['draft', 'issued']

export const DEFAULT_STAGES: readonly StageDef[] = [
  {
    id: 'draft',
    name: 'Draft',
    empty: 'Quotes being built. Nothing here yet.',
    tone: 'neutral',
    closed: false,
  },
  {
    id: 'issued',
    name: 'Issued',
    empty: 'Given to a customer, waiting on an answer.',
    tone: 'blue',
    closed: false,
  },
  {
    id: 'negotiating',
    name: 'Negotiating',
    empty: 'Deals being talked through.',
    tone: 'amber',
    closed: false,
  },
  { id: 'won', name: 'Won', empty: 'Nothing won yet.', tone: 'green', closed: true },
  { id: 'lost', name: 'Lost', empty: 'Nothing lost.', tone: 'red', closed: true },
]

const key = (orgSlug: string): string => `hl.pipeline.stages.v1:${orgSlug}`

let cache: { k: string; v: StageDef[] } | null = null
const listeners = new Set<() => void>()

const isTone = (v: unknown): v is StageTone =>
  typeof v === 'string' && TONES.some((t) => t.id === v)

/** WHAT A STORED LIST HAS TO SURVIVE. Anything unreadable falls
 *  back to the defaults whole rather than half — a board drawn from
 *  three good stages and two dropped ones is worse than a board
 *  drawn from the set everybody started with. */
function parse(raw: unknown): StageDef[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: StageDef[] = []
  for (const s of raw as Record<string, unknown>[]) {
    if (typeof s?.['id'] !== 'string' || typeof s['name'] !== 'string') return null
    out.push({
      id: s['id'],
      name: s['name'],
      empty: typeof s['empty'] === 'string' ? s['empty'] : '',
      tone: isTone(s['tone']) ? s['tone'] : 'neutral',
      closed: s['closed'] === true,
    })
  }
  /* the anchors must be there, or a quote nobody has moved has
     nowhere to be drawn */
  for (const a of ANCHORS) if (!out.some((s) => s.id === a)) return null
  return out
}

function read(orgSlug: string): StageDef[] {
  const k = key(orgSlug)
  if (cache && cache.k === k) return cache.v
  let v: StageDef[] = DEFAULT_STAGES.map((s) => ({ ...s }))
  try {
    const raw = globalThis.localStorage?.getItem(k)
    if (raw) {
      const got = parse(JSON.parse(raw))
      if (got) v = got
    }
  } catch {
    /* a browser refusing storage still gets the default board */
  }
  cache = { k, v }
  return v
}

function write(orgSlug: string, v: StageDef[]): void {
  cache = { k: key(orgSlug), v }
  try {
    globalThis.localStorage?.setItem(key(orgSlug), JSON.stringify(v))
  } catch {
    /* the in-memory copy stands for this session */
  }
  for (const l of listeners) l()
}

export const stagesOf = (orgSlug: string): StageDef[] => read(orgSlug)

/* ------------------------------------------------------------
   EDITING, all pure where it can be
   ------------------------------------------------------------ */

/** Why this stage may not be removed, or null when it may be. */
export function whyNot(stages: readonly StageDef[], id: string): string | null {
  if (ANCHORS.includes(id)) {
    return 'This one stays. A quote nobody has moved yet is drawn here from the document itself, so the board needs somewhere for it to land.'
  }
  if (stages.length <= 2) {
    return 'A board needs at least two columns to be a board.'
  }
  return null
}

/** The stage a removed one's deals should go to: the one on its
 *  left, or the first if it was already first. */
export function neighbourOf(stages: readonly StageDef[], id: string): StageDef | undefined {
  const i = stages.findIndex((s) => s.id === id)
  if (i < 0) return undefined
  return stages[i - 1] ?? stages.find((s) => s.id !== id)
}

/** A NEW STAGE'S ID IS MINTED FROM ITS NAME, then made unique.
 *  Readable in storage and in a debugger, which a random id is not,
 *  and stable once made — renaming a stage never re-mints it, or
 *  every deal standing in it would be orphaned. */
export function mintId(stages: readonly StageDef[], name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'stage'
  if (!stages.some((s) => s.id === base)) return base
  let n = 2
  while (stages.some((s) => s.id === `${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function setStages(orgSlug: string, next: readonly StageDef[]): void {
  write(orgSlug, next.map((s) => ({ ...s })))
}

export function resetStages(orgSlug: string): void {
  write(orgSlug, DEFAULT_STAGES.map((s) => ({ ...s })))
}

export function forgetStageStore(): void {
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

export function useStageDefs(orgSlug: string): StageDef[] {
  const snap = useCallback(() => read(orgSlug), [orgSlug])
  return useSyncExternalStore(subscribe, snap, snap)
}
