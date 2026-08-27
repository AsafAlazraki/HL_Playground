/* ============================================================
   WHICH FACE A MODULE OPENS ON — decided by counting, and the
   record of what else was counted and did not decide.

   ── THE QUESTION ─────────────────────────────────────────────

   A catalogue is a thing somebody SHOPS: faces in a grid, and you
   press the one you want. A register is a thing somebody KEEPS: a
   dense list you scan and maintain. `ModuleDef.index` names which,
   and it used to be set by hand.

   ── THE HYPOTHESIS, AND WHAT THE SHEET SAID TO IT ────────────

   The brief this file answers proposed the obvious rule: a table
   with an image column AND a price is a thing you shop; a table of
   labour rates is a thing you maintain. Four signals were named —
   pictures, a price rung, row count, and how long the names are —
   and all four were measured over the nine seeded modules before
   any of them was written into a rule. Only one of the four
   separates a catalogue from a register:

     PICTURES     Boats 89% · Trailers 97% · Motors 84% ·
                  Factory Packages 69%  ‖  Parts 0% · Dealer Fit 0% ·
                  Labour 0% · Oils 0% · Registration 0%
                  → a clean gap with nothing inside it. IT DECIDES.

     A PRICE      Boats 100% · Trailers 100% · Motors 100% ·
                  Factory Packages 100%  ‖  PARTS & ACCESSORIES 99%
                  → the hypothesis is FALSIFIED here. Parts is priced
                  from end to end and is emphatically a register: it
                  is 2,860 lines under 204 headings. A price says a
                  thing is for sale. It says nothing about whether it
                  has a face.

     ROW COUNT    89 – 810 for the catalogues, 18 – 2,860 for the
                  registers. The ranges overlap in both directions.
                  It separates nothing.

     NAME LENGTH  median 21 – 46 characters for the catalogues,
                  5 – 38 for the registers. Overlaps. It separates
                  nothing.

   So the verdict is taken on the pictures alone — not because
   pictures are the interesting signal, but because they are the
   only one this data supports, and a floor written where there is
   no gap is a floor somebody invented. The other three are still
   COUNTED, and `alsoCounted` says so on the settings panel, because
   "we tried that and it does not separate" is a better answer to an
   admin than silence.

   `faceSignals.test.ts` asserts the three rejected signals really do
   overlap on the seeded sheet. The day they stop overlapping, that
   test fails and this comment gets rewritten with the evidence —
   which is the whole point of writing the evidence down.

   ── IT IS A DEFAULT, NOT A LOCK ──────────────────────────────

   `ModuleDef.index` is still the stored field. `createModule` asks
   this for what a module is BORN with, and `ModuleDesigner` lets an
   admin overrule it and says "Your choice stands" when they have.
   Nothing here overwrites a decision somebody made.
   ============================================================ */

import type { ModuleIndexMode } from '@/types/model'

/** Below this share of pictured rows, a grid of tiles is a grid of
 *  empty wells. See the header for why a half is safe on this data
 *  and why nothing else has a floor at all. */
export const PICTURE_FLOOR = 0.5

/** The shape this file needs off a row. `IndexEntry` satisfies it
 *  structurally, which is how `read.ts` can hand its own entries
 *  straight in without this file importing it back. */
export interface FaceRow {
  label: string
  /** '' when the table prices nothing */
  price: string
  img?: unknown
}

export interface ModuleFace {
  mode: ModuleIndexMode
  /** live rows carrying a picture, and live rows altogether */
  pictured: number
  live: number
  /** live rows carrying a price this surface may print — MEASURED AND
   *  NOT USED. See the header: Parts & Accessories is 99% priced and
   *  is a register. */
  priced: number
  /** median word count of a row's name — measured and not used */
  nameWords: number
  /** the measurement that decided it, in a sentence */
  why: string
  /** what else was counted, and why it did not get a vote. '' when
   *  there is nothing to say because there are no rows. */
  alsoCounted: string
}

const grouped = (n: number): string => n.toLocaleString('en-AU')

/** The middle value, so one 40-word outlier cannot move the reading. */
function median(ns: number[]): number {
  if (ns.length === 0) return 0
  const sorted = ns.slice().sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * The face these rows ask for.
 *
 * ONE PASS. Called on the whole module's live rows — 2,860 for Parts
 * & Accessories — and it reads three already-resolved properties off
 * each one rather than touching a cell.
 */
export function readFace(rows: readonly FaceRow[]): ModuleFace {
  const live = rows.length
  let pictured = 0
  let priced = 0
  const words: number[] = []
  for (const r of rows) {
    if (r.img) pictured += 1
    if (r.price !== '') priced += 1
    words.push(r.label.trim() === '' ? 0 : r.label.trim().split(/\s+/).length)
  }
  const nameWords = median(words)
  const mode: ModuleIndexMode = live > 0 && pictured >= live * PICTURE_FLOOR ? 'tiles' : 'rows'

  const why =
    live === 0
      ? 'There are no rows here yet, so there is nothing to draw a face from.'
      : pictured === 0
        ? `Nothing here carries a picture — ${grouped(live)} of ${grouped(live)} — so this is a register to keep rather than a catalogue to shop.`
        : mode === 'tiles'
          ? `${grouped(pictured)} of ${grouped(live)} carry a picture, so this is a catalogue.`
          : `Only ${grouped(pictured)} of ${grouped(live)} carry a picture, so tiles would draw mostly empty wells.`

  /* THE SIGNALS THAT WERE COUNTED AND DID NOT GET A VOTE. Said out
     loud for the same reason the curation note states its hidden
     count: a decision whose basis is not on the screen is a decision
     an admin has to take on trust. */
  const alsoCounted =
    live === 0
      ? ''
      : `${grouped(priced)} of ${grouped(live)} carry a price and a name here runs ${nameWords} ${
          nameWords === 1 ? 'word' : 'words'
        }, but neither decides the face: a register can be priced from end to end, and on this sheet the longest names and the shortest are both on registers.`

  return { mode, pictured, live, priced, nameWords, why, alsoCounted }
}
