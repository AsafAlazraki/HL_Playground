/* ============================================================
   WHAT GOES ON A DEAL CARD — one person's choice, not the
   business's structure.

   WHY THIS IS A PREFERENCE AND NOT A SETTING. `stageStore.ts`
   holds the dealership's columns: rename one and you have renamed
   it for everybody who signs in, which is right, because a stage
   is a fact about how the business works. What a salesperson wants
   to READ on a card is not that. One person scans for the seller's
   name, another for how long a thing has been sitting there, and
   writing either into the shared model would rearrange somebody
   else's board.

   So it is keyed person-plus-organisation and it copies
   `dashboard/tileOrder.ts` down to the key shape, for the reason
   that file gives at length: it is the same kind of fact and ought
   to travel with it. A second pattern for one job is a second
   thing to learn.

   THE SPINE IS NOT A PREFERENCE, and this is the part worth
   arguing. Three things are drawn on every card whatever is
   chosen:

     THE CUSTOMER, because a deal is a person waiting on an answer.
     It is the card's heading, and a heading is not a field — a
     card with nobody's name on it is a row in a ledger.

     THE MONEY, because the column above it prints a sum and a card
     that could hide its own contribution to that sum would make
     the board's one arithmetic claim unverifiable.

     THE NOTE COUNT, and only when it is above zero. It is a mark
     rather than a fact: it costs no line, it appears on the
     minority of cards that have a conversation on them, and
     hiding it would take away the only way the board shows which
     deals somebody is actually working.

   THE CAP IS FOUR AND IT IS SAID, NEVER ENFORCED SILENTLY. A card
   that draws nine facts is a card nobody scans. Choosing a fifth
   does not swap one out and does not grey a control: it prints the
   reason next to the thing that was refused (rule 10), because a
   person who has just been told "four" can decide which of their
   own four to give up, and an app that decides for them has thrown
   away the choice this file exists to offer.

   THE DEFAULT IS EXACTLY THE CARD THIS BUILD ALREADY DREW.
   Reference, what is being sold, when it was last touched, who
   prepared it. Shipping a narrower default would have deleted two
   facts from every existing board on the way to offering a
   choice — a feature that takes something away on first run is a
   feature people switch off.

   EVERY FUNCTION THAT DECIDES ANYTHING IS PURE and takes its
   inputs as arguments, so `cardFields.test.ts` needs no browser
   and no session.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'

export type CardFieldId = 'reference' | 'subject' | 'touched' | 'by' | 'waiting' | 'kind'

export interface CardFieldDef {
  id: CardFieldId
  /** what a dealer calls it. Sentence case: this is a name, and
   *  uppercase is a label style (rule 3). */
  label: string
  /** one line under it in the picker, where the choice needs
   *  explaining. Most do not. */
  under?: string
}

/** THE SIX A CARD CAN DRAW. Every one of them is a fact this app
 *  can already answer for every deal — nothing here needs a field
 *  somebody has to fill in first, because a card that draws blanks
 *  is worse than a card that draws less. */
export const CARD_FIELDS: readonly CardFieldDef[] = [
  { id: 'reference', label: 'Reference' },
  { id: 'subject', label: 'What is being sold' },
  { id: 'touched', label: 'When it was last touched' },
  { id: 'by', label: 'Who prepared it' },
  {
    id: 'waiting',
    label: 'How long it has been here',
    under: 'Blank on deals moved before this was recorded.',
  },
  { id: 'kind', label: 'What type of thing it is' },
]

/** Four visible at once. See the header for why it is said rather
 *  than enforced. */
export const CARD_CAP = 4

/** The card this build drew before there was a choice. */
export const DEFAULT_CARD_FIELDS: readonly CardFieldId[] = [
  'reference',
  'subject',
  'touched',
  'by',
]

const isField = (v: unknown): v is CardFieldId =>
  typeof v === 'string' && CARD_FIELDS.some((f) => f.id === v)

export const fieldLabel = (id: CardFieldId): string =>
  CARD_FIELDS.find((f) => f.id === id)?.label ?? id

/* ------------------------------------------------------------
   THE PURE HALF
   ------------------------------------------------------------ */

/** WHAT A STORED CHOICE HAS TO SURVIVE. Unreadable entries are
 *  dropped one at a time rather than the whole list being thrown
 *  away: a field id this build no longer offers is a card drawing
 *  three facts, and a card drawing three facts is a working card.
 *  An empty result means "nobody has chosen", which is what the
 *  default is for — not "chose nothing", which no control here can
 *  produce (see `toggleField`). */
export function parseFields(raw: unknown): CardFieldId[] {
  if (!Array.isArray(raw)) return []
  const out: CardFieldId[] = []
  for (const v of raw) if (isField(v) && !out.includes(v)) out.push(v)
  return out
}

/** What is actually drawn: the stored choice, or the default when
 *  nothing has been stored. Ordered by `CARD_FIELDS` rather than by
 *  the order they were switched on, so two people who chose the
 *  same four get the same card — a card whose rows move depending
 *  on which control you pressed first is a card that reads
 *  differently on every screen. */
export function fieldsOf(stored: readonly CardFieldId[]): CardFieldId[] {
  const set = stored.length === 0 ? DEFAULT_CARD_FIELDS : stored
  return CARD_FIELDS.filter((f) => set.includes(f.id)).map((f) => f.id)
}

/** WHY THIS ONE CANNOT BE ADDED, or null when it can. A sentence
 *  rather than a boolean, so the picker prints the reason beside
 *  the control that was pressed instead of greying it (rule 10).
 *  It names the cap AND the thing that was refused, because "four
 *  is the maximum" leaves a person to work out which four they
 *  currently have. */
export function whyNotField(
  chosen: readonly CardFieldId[],
  id: CardFieldId,
): string | null {
  if (chosen.includes(id)) return null
  if (chosen.length < CARD_CAP) return null
  return `A card holds ${CARD_CAP} facts and still reads at a glance. Turn one off to make room for ${fieldLabel(
    id,
  ).toLowerCase()}.`
}

/** The choice with one switched on or off — or unchanged, when the
 *  cap refuses it.
 *
 *  THE LAST ONE CANNOT BE TURNED OFF. A card showing only its
 *  customer and its money is not a preference anybody meant to
 *  express; it is what you get by pressing the last control twice
 *  and then wondering what broke. */
export function toggleField(
  chosen: readonly CardFieldId[],
  id: CardFieldId,
): CardFieldId[] {
  if (chosen.includes(id)) {
    if (chosen.length <= 1) return [...chosen]
    return chosen.filter((f) => f !== id)
  }
  if (whyNotField(chosen, id)) return [...chosen]
  return fieldsOf([...chosen, id])
}

/* ------------------------------------------------------------
   THE STORE. Same shape as `tileOrder.ts` — one key per person per
   organisation, a cache, a listener set.
   ------------------------------------------------------------ */

export interface CardWho {
  userId: string
  orgSlug: string
}

const key = (who: CardWho): string => `hl.pipeline.card.v1:${who.orgSlug}:${who.userId}`

let cache: { k: string; v: CardFieldId[] } | null = null
const listeners = new Set<() => void>()

function read(who: CardWho): CardFieldId[] {
  const k = key(who)
  if (cache && cache.k === k) return cache.v
  let v: CardFieldId[] = []
  try {
    const raw = globalThis.localStorage?.getItem(k)
    if (raw) v = parseFields(JSON.parse(raw))
  } catch {
    /* a browser refusing storage still gets the card this build
       ships with, which is the one everybody had yesterday */
  }
  cache = { k, v }
  return v
}

function write(who: CardWho, v: readonly CardFieldId[]): void {
  cache = { k: key(who), v: [...v] }
  try {
    globalThis.localStorage?.setItem(key(who), JSON.stringify(v))
  } catch {
    /* the in-memory copy stands for this session */
  }
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export interface CardFieldsApi {
  /** what the card draws, in `CARD_FIELDS` order. The default until
   *  somebody chooses — so the picker lights four rows on a machine
   *  that has never stored anything, which is the truth about what
   *  the board is drawing. */
  fields: CardFieldId[]
  set: (next: readonly CardFieldId[]) => void
}

export function useCardFields(who: CardWho): CardFieldsApi {
  const snap = useCallback(() => read(who), [who])
  const stored = useSyncExternalStore(subscribe, snap, snap)
  const set = useCallback((next: readonly CardFieldId[]) => write(who, next), [who])
  return { fields: fieldsOf(stored), set }
}

/** for tests, and for a sign-out that should leave nothing behind */
export function forgetCardFields(): void {
  cache = null
}
