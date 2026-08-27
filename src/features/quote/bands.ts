/* ============================================================
   THE BANDS — a quote read as a document, in a fixed order.

   WHAT CHANGED AND WHY. This screen was a six-stop deck: a rail of
   numbered stops across the top, one decision on screen at a time,
   a progress meter and a Next button. PHASE_TWO §2.3 replaces it
   with ONE SCROLLING PAGE, and the reference is measured rather
   than remembered — Porsche puts ~300 options on one page in
   eleven accordions and shows NO PROGRESS INDICATOR AT ALL. That
   is right for this too: a quote is a document being read, not a
   form being completed.

   So the stops become BANDS, and this file decides what order they
   come in and what each one's head says.

   ── THE ORDER IS BY WHAT THE THING IS, NOT BY THE SHEET ───────

   The view's own block order is the dealer's, and it is the right
   order for the sheet. It is the wrong order for a rig: a person
   configuring a boat reads hull, motor, trailer, what the dealer
   fits, and then the paperwork — every time, whatever order the
   blocks happen to sit in on the view page.

   So the bands are ranked by the TABLE'S KIND, and inside a rank
   the view's own order is kept exactly. That is a reading of data
   the sheet already carries (`EntityDef.kind`), never a list of
   table names typed here, so a dealer who adds an eighth trailer
   brand tomorrow gets it in the trailer rank for free.

   AND THE KIND IS ALSO THE COLOUR. DESIGN_PRINCIPLES §1 was
   amended for this phase: a kind hue may carry a SURFACE. The band
   head takes `.k-band` in the kind's own hue, so a person knows
   from across the room whether they are looking at motors or
   trailers without reading a word — and because the hue is read
   off the table's kind, two things of one kind are one colour
   everywhere, which is the discipline that keeps it from being
   colouring-in.

   ── THE HEAD CARRIES A NAME AND ONE FACT ─────────────────────

   PHASE_TWO §1a measured the app narrating itself on five of seven
   surfaces. The prose budget for a card is "a name and ONE fact",
   so `bandFact` returns exactly one short clause and never a
   sentence. The explanation has not been deleted — it moved into
   the band, where a person who opened it is asking for it.

   PURE. No React, no store: it takes the steps `steps.ts` already
   read off the frozen document and a map of kinds, and hands back
   an order. Everything it says is counted from the document.
   ============================================================ */

import type { TableKind } from '@/types/model'
import { SUBJECT_STEP, type BuildStep } from './steps'

/** THE LAST BAND, AND IT IS NOT A TABLE — who the quote is for, the
 *  rung it is priced at, and the sentence about what issuing does.
 *  It is declared here beside the ordering that puts it last for the
 *  same reason `HANDOVER_STEP` is declared in `steps.ts`: one
 *  declaration per fact. */
export const ADMIN_BAND = '__admin'

/**
 * WHERE EACH KIND SITS. Lower comes first.
 *
 * The numbers are gaps of ten so a kind added to `TableKind`
 * tomorrow has somewhere to land without renumbering the rest. A
 * kind this map does not name sorts after everything it does, which
 * is the honest answer for a table nobody has classified.
 */
const RANK: Record<TableKind, number> = {
  boat: 60,
  motor: 10,
  trailer: 20,
  package: 30,
  dealer: 40,
  accessory: 50,
  custom: 70,
}

/** The subject always leads. It is the thing being configured and
 *  every other band is an answer about it. */
const SUBJECT_RANK = -1

export interface Band {
  /** the step this band draws — its id is the band's identity */
  id: string
  step: BuildStep
  /** what the things in it ARE, and so what colour the head takes */
  kind: TableKind
  /** the hull the whole document is about: it offers nothing */
  subject: boolean
  /** the name and the ONE fact §1a's prose budget allows a card */
  fact: string
  /** the head's figure, or null when this band has put no priced
   *  line on the quote. Never rendered as 0. */
  amount: number | null
}

/**
 * ONE SHORT CLAUSE, NEVER A SENTENCE.
 *
 * A decided band says WHAT was chosen, because that is the fact a
 * person reading the head of a shut band actually wants — "done"
 * answers nothing. An undecided band says how many are on offer,
 * counted off the frozen section, so the head is a reason to open
 * it rather than a reproach for not having.
 *
 * `step.reach` tells the four kinds of empty apart (see `StepReach`)
 * and each gets its own short clause: waiting for a choice, held
 * back as no longer sold, and never paired at all are three
 * different facts and only one of them is work.
 */
export function bandFact(step: BuildStep): string {
  if (step.subject) return ''
  if (step.lines.length === 1) return step.lines[0].label
  if (step.lines.length > 1) {
    return `${step.lines[0].label}  +${step.lines.length - 1}`
  }
  switch (step.reach) {
    case 'waiting': {
      const n = step.section.pickedCount ?? 0
      return n === 1 ? '1 offered' : `${n} offered`
    }
    case 'held': {
      const n = step.section.heldCount ?? 0
      return n === 1 ? '1 no longer sold' : `${n} no longer sold`
    }
    case 'bare':
      return 'nothing paired yet'
    default:
      return 'not chosen'
  }
}

/**
 * The bands, in reading order: the hull, then motors, then
 * trailers, then what the dealer fits, then anything else — and
 * inside each rank the view's own order, untouched.
 *
 * `kinds` is the section-id → kind map `sectionKinds` reads off the
 * live sheet. A section whose table has gone takes 'custom', which
 * sorts late and colours neutral, so a struck table never throws the
 * order or the palette.
 */
export function orderBands(
  steps: readonly BuildStep[],
  kinds: Record<string, TableKind>,
): Band[] {
  const bands = steps.map((step, i) => {
    const kind: TableKind = step.subject
      ? 'boat'
      : (kinds[step.id] ?? 'custom')
    return {
      band: {
        id: step.id,
        step,
        kind,
        subject: step.subject,
        fact: bandFact(step),
        amount: step.amount,
      } satisfies Band,
      rank: step.subject ? SUBJECT_RANK : RANK[kind],
      at: i,
    }
  })
  bands.sort((a, b) => a.rank - b.rank || a.at - b.at)
  return bands.map((b) => b.band)
}

/**
 * WHICH BANDS OPEN WHEN NOBODY HAS SAID.
 *
 * Porsche opens none of its eleven and that is right for a car whose
 * options a person is browsing. A quote is being BUILT, so the first
 * band with something to decide is open — one, not all, because a
 * page that opens seven accordions has an accordion for no reason.
 *
 * The subject is never one of them: it decides nothing, and opening
 * it would put a read-only line where the first choice should be.
 */
export function openByDefault(bands: readonly Band[]): string[] {
  const first = bands.find((b) => !b.subject && b.step.state === 'open')
  if (first) return [first.id]
  const last = bands.filter((b) => !b.subject).pop()
  return last ? [last.id] : []
}

/** The subject step's id, re-exported so a surface drawing bands does
 *  not have to know it comes from the sequence reader. */
export { SUBJECT_STEP }
