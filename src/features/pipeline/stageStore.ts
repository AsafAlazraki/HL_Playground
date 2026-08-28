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

   THE TONE AND THE WASH ARE TWO DECISIONS, and that is the change
   this file most recently took. `tone` used to be both: it drew a
   3px cap AND it was the only thing distinguishing one column from
   another. A dealer who wanted their board tinted had no way to
   ask, and a dealer whose board should stay quiet had no way to
   say so column by column. So `wash` is separate — none, soft, or
   the full tint — because how loud a column is is a judgement
   about somebody's own pipeline and not about ours.

   WHAT MEASURING THAT PAIRING COST, and it is why the two fields
   cannot be collapsed back into one. The column's NAME sits on the
   wash, which is `color-mix(in srgb, <tone> N%, var(--surface-2))`.
   Four of the twenty-four pairings, read back in the browser off a
   real column with the tone put back as ink:

     light, amber name on an 8% amber wash    4.44 : 1   FAILS
     light, violet name on an 18% wash        4.34 : 1   FAILS
     dark,  violet name on an 8% wash         4.69 : 1   passes, barely
     dark,  violet name on an 18% wash        3.97 : 1   FAILS

   So a washed column does NOT keep its tone as ink. It steps to
   `--fg-secondary`, which measures 6.57:1 at worst on soft and
   5.27:1 at worst on full across all six tones in both themes.
   The hue is still said twice — by the cap and by the wash — and
   neither of those carries a word. `pipeline.css` holds the whole
   matrix, every figure read back the same way.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'

export type StageTone = 'neutral' | 'blue' | 'amber' | 'violet' | 'green' | 'red'

/** HOW STRONGLY THE COLUMN ITSELF IS TINTED — a second decision
 *  from the tone, for the reason in the header. Three steps and not
 *  a slider: a slider across a contrast cliff is a colour well
 *  wearing a different hat. */
export type StageWash = 'none' | 'soft' | 'full'

export const WASHES: readonly { id: StageWash; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'soft', label: 'Soft' },
  { id: 'full', label: 'Full' },
]

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
  /** WHAT BELONGS IN THIS COLUMN, in one line. A statement of fact,
   *  never an instruction.
   *
   *  ONE FIELD, TWO POSITIONS. It was called `empty` and was drawn
   *  only under an empty column, so a dealer who wanted a caption
   *  under a FULL one had nowhere to write it — and a second field
   *  would have meant two boxes holding the same sentence for
   *  anybody who filled both. The words do not change when the last
   *  card arrives, so neither does the field: the column draws it
   *  under the head when it has cards and in the body when it has
   *  none. A board stored before the rename keeps its sentences —
   *  `parse` still reads the old key. */
  about: string
  tone: StageTone
  /** how strongly this column is tinted. See the header for what
   *  measuring the name against it cost. */
  wash: StageWash
  /** finished work — drawn quieter, because a board where the two
   *  closed columns shout as loudly as the live ones draws the eye
   *  to work already done */
  closed: boolean
}

/** THE TWO THE DERIVATION NEEDS. See the header. */
export const ANCHORS: readonly string[] = ['draft', 'issued']

/* THE FIVE THIS BUILD SHIPS WITH. Every sentence was rewritten when
   `empty` became `about`: "Nothing won yet." is true under an empty
   column and a lie under a full one, and the field is drawn in both
   places now. Each of these says what BELONGS here, which reads
   correctly whether the column holds nothing or forty. */
export const DEFAULT_STAGES: readonly StageDef[] = [
  {
    id: 'draft',
    name: 'Draft',
    about: 'Quotes still being built.',
    tone: 'neutral',
    wash: 'none',
    closed: false,
  },
  {
    id: 'issued',
    name: 'Issued',
    about: 'Given to a customer, waiting on an answer.',
    tone: 'blue',
    wash: 'none',
    closed: false,
  },
  {
    id: 'negotiating',
    name: 'Negotiating',
    about: 'Deals being talked through.',
    tone: 'amber',
    wash: 'none',
    closed: false,
  },
  {
    id: 'won',
    name: 'Won',
    about: 'Deals we got.',
    tone: 'green',
    wash: 'none',
    closed: true,
  },
  {
    id: 'lost',
    name: 'Lost',
    about: 'Deals that went somewhere else.',
    tone: 'red',
    wash: 'none',
    closed: true,
  },
]

const key = (orgSlug: string): string => `hl.pipeline.stages.v1:${orgSlug}`

let cache: { k: string; v: StageDef[] } | null = null
const listeners = new Set<() => void>()

const isTone = (v: unknown): v is StageTone =>
  typeof v === 'string' && TONES.some((t) => t.id === v)

const isWash = (v: unknown): v is StageWash =>
  typeof v === 'string' && WASHES.some((w) => w.id === v)

/** WHAT A STORED LIST HAS TO SURVIVE. Anything unreadable falls
 *  back to the defaults whole rather than half — a board drawn from
 *  three good stages and two dropped ones is worse than a board
 *  drawn from the set everybody started with. */
function parse(raw: unknown): StageDef[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: StageDef[] = []
  for (const s of raw as Record<string, unknown>[]) {
    if (typeof s?.['id'] !== 'string' || typeof s['name'] !== 'string') return null
    /* `empty` IS READ AS `about`. A board stored by the build before
       the rename holds the old key, and dropping those sentences
       would delete words a dealer typed in order to make room for a
       field with a better name. */
    const said = s['about'] ?? s['empty']
    out.push({
      id: s['id'],
      name: s['name'],
      about: typeof said === 'string' ? said : '',
      tone: isTone(s['tone']) ? s['tone'] : 'neutral',
      /* EVERY EXISTING BOARD IS AN UNWASHED ONE. A stored stage with
         no `wash` was written before the field existed and its
         column was drawn plain, so plain is what it meant. */
      wash: isWash(s['wash']) ? s['wash'] : 'none',
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
