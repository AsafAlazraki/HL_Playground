/* ============================================================
   THE BANDS — five decisions, in a fixed order, named for the
   decision and never for the table.

   ── THE FAULT THIS FILE WAS REWRITTEN TO END ─────────────────

   It ranked one band PER TABLE by the table's kind. Measured at
   1280×800 on the real seed, a fresh Highfield CL260 (PVC) B-G-DG:

     7 bands, 6 open, 2,763px of rail in a 546px port — 5.06
     screens — and the seven names were
       Highfield Inflatables · Yamaha Outboards · NSM Custom
       Trailers · GFAB Trailers · Dealer Fit Packages · Parts &
       Accessories · Rigging Kits

   Every one of those is a TABLE on the dealer's price file. So the
   screen written to cure "it feels like a database" was organised
   by the database: the trailer question was two bands, the
   dealer-fit question was three, and "which motor" and "which
   trailer brand" sat at the same rank as though they were the same
   kind of question.

   A dealer does not think "now I will open the GFAB Trailers
   table". They think "it needs a trailer", and which trailer
   tables can supply one is this application's problem.

   PHASE_TWO §2.3 and QUOTE_GROUND_UP §1 both specify FIVE bands,
   named for the decision:

     01 THE HULL · 02 MOTOR · 03 TRAILER · 04 DEALER FIT ·
     05 ADMINISTRATION

   ── SO THE BAND IS THE KIND, AND THE TABLE IS A HEADING IN IT ─

   `TableKind` decides which band a section lands in and nothing
   else does. Seven trailer tables are seven headings inside
   `03 TRAILER`, not seven bands — the treatment `QuoteStart`
   already proved with `.qs-sec-head`, drawn only where a place
   really spans more than one table.

   The order is FIXED and it is the rig's, not the sheet's: hull,
   motor, trailer, what the dealer fits, the paperwork. A dealer
   learns it once and it is the same on every quote, whatever
   tables the business happens to hold. Inside a band the ranking
   is by kind and then by the view's own order, untouched.

   AN ABSENT KIND IS AN ABSENT BAND, AND ITS NUMBER GOES WITH IT.
   A quote raised on a Yamaha draws `01 THE HULL · 02 MOTOR · 04
   DEALER FIT` — measured, on the real seed — and the gap at 03 is
   the honest reading rather than a defect. The numbers are a
   READING ORDER and never a count: renumbering them contiguously
   per quote would make "03" mean TRAILER on one document and DEALER
   FIT on the next, which is the one thing a fixed order exists to
   prevent. An empty `03 TRAILER` drawn to close the gap would be
   worse still — a drawer with nothing in it, for a business that
   sells no trailers.

   ── THE SUB-LINE IS THE BAND'S STATE, AND IT IS WHY A SHUT BAND
      IS ALLOWED TO BE SHUT ────────────────────────────────────

   QUOTE_GROUND_UP §1: "Shut does not mean unknown." The head used
   to carry the table's name at heading size and one clause beside
   it; the SUBJECT band carried no clause at all, so the one band
   that always has an answer was the one band that never said it.

   Now every band says where its decision stands — `chosen: Yamaha
   - F9.9SMHB`, or `7 offered`, or `73 no longer sold` — and that
   clause is the head's own reading step. The number and the band
   name above it are the 11px uppercase group label, which is the
   only uppercase DESIGN_CONTRACT §11 allows.

   IT IS COUNTED OFF THE FROZEN DOCUMENT AND NOTHING ELSE. The
   sub-line spends `pickedCount` and `heldCount`, which
   `mintQuoteFromView` wrote onto the section when the quote was
   minted. It does NOT say "202 not offered", tempting as that
   reading is, because the pool is not on the document: it takes a
   live read of the sheet, and a shut band may cost one frozen
   count and never a solve. The pool, the rule that produced it and
   the measured rate are all on the curation chip INSIDE the band,
   where `CurationNote` has always drawn them.

   NO MONEY IN THE CLAUSE. The head already carries the band's
   figure in mono with tabular numerals, which is the contract's
   rule for every figure; repeating it in Inter inside the sentence
   would print the same number twice on a band with one line.

   ── AND THE KIND IS STILL THE COLOUR ─────────────────────────

   DESIGN_PRINCIPLES §1 as amended: a kind hue may carry a surface.
   Each band declares its hue in `BANDS` below rather than reading
   it off the first table it happens to hold, so `04 DEALER FIT` is
   the same colour on every quote — and where that band really does
   mix two kinds, each table heading inside it carries its own
   kind, which is what keeps "a hue only ever appears on something
   that HAS that kind" true one level down.

   PURE. No React, no store: it takes the steps `steps.ts` already
   read off the frozen document and a map of kinds, and hands back
   an order. Everything it says is counted from the document.
   ============================================================ */

import type { TableKind } from '@/types/model'
import { SUBJECT_STEP, type BuildStep } from './steps'

/** The five decisions, and the identity of a band is which one it
 *  is — never which table it came from. `place.ts` remembers these
 *  ids across a reload and `QuoteBuild` checks them against the
 *  bands the document actually has, so a stored id from the old
 *  per-table shape simply fails that check and the page opens with
 *  its default. */
export type BandId = 'hull' | 'motor' | 'trailer' | 'fit' | 'admin'

export interface BandSpec {
  id: BandId
  /** the reading order, drawn. Never a progress count — §2.3 and
   *  GOV.UK's own removal of a twelve-step indicator both say a
   *  document being read is not a form being completed. */
  num: string
  /** written in its own case and UPPERCASED BY THE STYLESHEET, so
   *  the accessible name a screen reader speaks is "The hull" and
   *  not a shouted acronym. Rule 3 and DESIGN_CONTRACT §11. */
  name: string
  /** the hue the head and the 3px rail take */
  kind: TableKind
}

/**
 * THE ORDER, AND IT IS THE ONLY PLACE IT IS WRITTEN.
 *
 * Fixed, always. A band with no table in it is dropped, never
 * drawn empty — see `orderBands`.
 */
export const BANDS: readonly BandSpec[] = [
  { id: 'hull', num: '01', name: 'The hull', kind: 'boat' },
  { id: 'motor', num: '02', name: 'Motor', kind: 'motor' },
  { id: 'trailer', num: '03', name: 'Trailer', kind: 'trailer' },
  { id: 'fit', num: '04', name: 'Dealer fit', kind: 'package' },
  { id: 'admin', num: '05', name: 'Administration', kind: 'custom' },
]

/**
 * WHICH BAND A KIND ANSWERS, AND WHY `dealer` IS PAPERWORK.
 *
 * `accessory` and `package` are one decision — what the dealer
 * fits — and PHASE_TWO §2.3 names it as one band. `custom` is
 * whatever the presets did not cover, which on the real sheet is
 * Labour Rates, Registration Costs and Oils & Consumables: on-road
 * money rather than a thing on the rig.
 *
 * `dealer` is the one the specification does not name, and it goes
 * to ADMINISTRATION rather than to DEALER FIT. `TABLE_KINDS.dealer`
 * is "Dealers and locations" — a directory of who is selling, not
 * a box of gear that gets bolted on. Filing it under DEALER FIT on
 * the strength of the shared word would be a pun standing in for a
 * meaning.
 */
const BAND_OF: Record<TableKind, BandId> = {
  boat: 'hull',
  motor: 'motor',
  trailer: 'trailer',
  package: 'fit',
  accessory: 'fit',
  dealer: 'admin',
  custom: 'admin',
}

/**
 * WHERE A TABLE SITS INSIDE ITS BAND. Lower comes first, and
 * within one rank the view's own order is kept exactly.
 *
 * It only ever bites on a band that mixes kinds — today that is
 * `04 DEALER FIT`, where the package a dealer sells as one item
 * reads before the loose parts that make one up. The gaps are tens
 * so a kind added to `TableKind` tomorrow has somewhere to land.
 */
const RANK: Record<TableKind, number> = {
  boat: 10,
  motor: 10,
  trailer: 10,
  package: 30,
  accessory: 50,
  dealer: 10,
  custom: 10,
}

/**
 * One table inside a band — a heading, and the shelf under it.
 *
 * IT CARRIES NO CLAUSE OF ITS OWN, AND THAT IS THE DECISION RATHER
 * THAN AN OMISSION. Four surfaces sit within sixty pixels of this
 * heading and each already owns one fact:
 *
 *   the band head        where the whole decision stands, which is
 *                        the one of the four that is read while the
 *                        band is SHUT and nothing else is on screen
 *   this heading         WHICH table the shelf under it is
 *   the curation chip    the pool, the rule that narrowed it, the
 *                        measured rate behind that rule
 *   the picked list      the lines this table actually put on the
 *                        quote, each removable
 *
 * A count here would be the chip's, forty pixels above it and
 * vaguer. A `chosen:` clause here would be the band head's, and on
 * `04 DEALER FIT` it was measured printing the identical 38
 * characters twice sixty pixels apart. That is the
 * four-surfaces-one-fact defect `QuoteBuild`'s own header records
 * counting and removing, and it is what this shape avoids.
 *
 * QUOTE_GROUND_UP asks for the heading "in the file's own case with
 * its count". The case is kept — it is the dealer's own name and
 * rule 3 forbids shouting it. The count is not repeated, because
 * DESIGN_PRINCIPLES' prose budget ("a card gets a name and ONE
 * fact") is a hard constraint and it wins.
 */
export interface BandTable {
  step: BuildStep
  /** what this table holds, and so what its own heading marks */
  kind: TableKind
}

export interface Band extends BandSpec {
  /** the tables that answer this decision, in reading order */
  tables: BandTable[]
  /** whether anything here can still be chosen. A band holding only
   *  the subject decides nothing — it is the thing being configured
   *  — and opening it would put a read-only line where the first
   *  choice should be. */
  decides: boolean
  /** WHETHER THERE IS ANYTHING LEFT TO CHOOSE FROM, which is not the
   *  same question as `decides` and was being answered with it.
   *
   *  `decides` asks whether this band is a DECISION at all — a band
   *  holding only the subject is not. This asks whether the decision
   *  can still be made: a trailer band on a hull that no trailer is
   *  paired to is a real decision with an empty list, and the screen
   *  already says so in words ("this stop has nothing to offer yet").
   *
   *  It matters because the completion ring counts outstanding
   *  decisions. Measured on the seed's first boat: two of the five
   *  stops offer nothing, so the ring read "4 of 5" for ever, the
   *  fifth segment implying a choice that does not exist, and the
   *  complete state — the one moment this screen performs — could
   *  never be reached on that hull at all. */
  offers: boolean
  /** where the whole decision stands, in one clause. Never '' */
  fact: string
  /** the head's figure, or null when this band has put no priced
   *  line on the quote. Never rendered as 0. */
  amount: number | null
}

/** What one step contributes to a state clause, counted off the
 *  frozen section. `offered` is what is still WAITING: a table that
 *  had four picked and put one on the quote has three left to
 *  choose from, and saying "4 offered" beside a chosen line would
 *  be counting the answer as part of the question. */
interface Tally {
  lines: BuildStep['lines']
  offered: number
  held: number
  /** sections minted before the counts existed — the honest
   *  "cannot tell", kept apart from a genuine zero */
  unknown: number
}

function tally(steps: readonly BuildStep[]): Tally {
  const t: Tally = { lines: [], offered: 0, held: 0, unknown: 0 }
  for (const step of steps) {
    t.lines.push(...step.lines)
    /* THE SUBJECT COUNTS ITS LINE AND NOTHING ELSE. It is the thing
       being configured, so it offers nothing and withholds nothing;
       `pickedCount` is undefined on it by construction and reading
       that as "cannot tell" would make every hull band say "not
       chosen" over a hull that is plainly on the document. */
    if (step.subject) continue
    const picked = step.section.pickedCount
    if (picked === undefined) {
      t.unknown += 1
      continue
    }
    t.offered += Math.max(0, picked - step.lines.length)
    t.held += step.section.heldCount ?? 0
  }
  return t
}

/**
 * ONE SHORT CLAUSE, NEVER A SENTENCE, AND NEVER ''.
 *
 * A decided band says WHAT was chosen, because that is the fact a
 * person reading a shut head actually wants — "done" answers
 * nothing, and an empty clause answers less. An undecided band
 * says how many are on offer, so the head is a reason to open it
 * rather than a reproach for not having.
 *
 * The four kinds of empty stay four facts: waiting for a choice,
 * held back as no longer sold, never paired at all, and a document
 * too old to say are not the same thing and only one of them is
 * work. `steps.ts` `StepReach` tells them apart on one step; this
 * counts the same distinction across a whole band, which is why it
 * reads the frozen counts rather than `reach` — a band of three
 * tables has three reaches and one state.
 *
 * IT IS EXPORTED SO IT CAN BE TESTED WITHOUT A DOCUMENT. The
 * "3 more offered" arithmetic is the one thing here that is not
 * self-evident from reading it, and `bands.test.ts` asserts it
 * directly rather than through a minted quote that happens to have
 * the right shape today.
 */
export function stateSay(steps: readonly BuildStep[]): string {
  const { lines, offered, held, unknown } = tally(steps)
  if (lines.length > 0) {
    return chosenSay(lines) + (offered > 0 ? ` · ${offered} more offered` : '')
  }
  if (offered > 0) return offered === 1 ? '1 offered' : `${offered} offered`
  if (held > 0) return held === 1 ? '1 no longer sold' : `${held} no longer sold`
  if (unknown > 0) return 'not chosen'
  return 'nothing paired yet'
}

/** The chosen half, split out only so the two branches above cannot
 *  drift into phrasing one fact two ways. */
function chosenSay(lines: BuildStep['lines']): string {
  const more = lines.length > 1 ? ` · +${lines.length - 1} more` : ''
  return `chosen: ${lines[0].label}${more}`
}

/**
 * The bands, in the fixed order, holding the tables that answer
 * them — and only the bands a table actually landed in.
 *
 * `kinds` is the section-id → kind map `sectionKinds` reads off the
 * live sheet. A section whose table has gone takes 'custom', which
 * lands in ADMINISTRATION and colours neutral, so a struck table
 * never throws the order or the palette.
 *
 * THE SUBJECT IS RANKED BY ITS OWN KIND like everything else, and
 * that is what makes the order true rather than merely fixed. A
 * quote raised on a Yamaha has the motor already decided, so its
 * subject sits in `02 MOTOR` reading `chosen: Yamaha - F2.5SMHB`
 * and `01 THE HULL` above it holds the six boat tables that are
 * the open question. Pinning the subject to the top instead would
 * put a read-only line above the decision a person came to make.
 */
export function orderBands(
  steps: readonly BuildStep[],
  kinds: Record<string, TableKind>,
): Band[] {
  /** the view's own position, carried only so the sort can fall back
   *  to it. It is not part of a `BandTable`: nothing that draws one
   *  has any use for where its block sat on the view page. */
  interface Placed extends BandTable {
    at: number
  }

  const held = new Map<BandId, Placed[]>()
  steps.forEach((step, at) => {
    const kind = kinds[step.id] ?? 'custom'
    const id = BAND_OF[kind]
    const list = held.get(id) ?? []
    list.push({ step, kind, at })
    held.set(id, list)
  })

  const out: Band[] = []
  for (const spec of BANDS) {
    const placed = held.get(spec.id)
    if (placed === undefined || placed.length === 0) continue
    placed.sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.at - b.at)
    const inside = placed.map((p) => p.step)
    let amount: number | null = null
    for (const step of inside) {
      if (step.amount !== null) amount = (amount ?? 0) + step.amount
    }
    out.push({
      ...spec,
      tables: placed.map(({ step, kind }) => ({ step, kind })),
      decides: inside.some((step) => !step.subject),
      /* ALREADY CHOSEN COUNTS AS OFFERED. A band whose only line is
         the one on the quote still offers something — it offers the
         chance to change it — so this is `lines OR offered`, not
         `offered` alone. `unknown` counts too: a section minted
         before the counts existed cannot be said to offer nothing,
         and this app does not turn a "cannot tell" into a zero. */
      offers: (() => {
        const t = tally(inside)
        return t.lines.length > 0 || t.offered > 0 || t.unknown > 0
      })(),
      fact: stateSay(inside),
      amount,
    })
  }
  return out
}

/** The subject step's id, re-exported so a surface drawing bands does
 *  not have to know it comes from the sequence reader. */
export { SUBJECT_STEP }
