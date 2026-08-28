/* ============================================================
   THE SEQUENCE — asserted against the real seed, not a fixture.

   `QuoteBuild` claims five things over the flow it is answering, and
   four of them are testable without a browser. Each block below is
   one of those claims, and each is a way the screen could go on
   looking right while the claim stopped being true.

     1 · IT CANNOT LOSE WORK. A step's state is a READING of a quote
         that is already written down — `buildSteps` takes a QuoteDef
         and nothing else. If it ever grew a second argument, or
         reached for the store, "close the tab and come back" would
         quietly become a promise nobody kept. Asserted by walking a
         quote's own sections and by `savedNote` refusing to reassure
         while the write is failing.

     2 · EVERY NARROWING EXPLAINS ITSELF, WITH THE RATE. `stepReason`
         must name the list that did the narrowing and must hand back
         the ADJUDICATED figure — F8's 581 of 581 on trailers — from
         `RULE_LEDGER` rather than from anything typed here. Asserted
         verbatim against the ledger, so a plausible-sounding number
         typed into a card cannot survive.

     3 · NOTHING IS UNREACHABLE. The trailer step of production has no
         catalogue browse at all. `stepOffer` must reach the whole
         live table with `all`, and its SEARCH must ignore the
         narrowing — the row it finds past the narrowing must come
         back marked `outside`, and counted in `beyond`.

     4 · THE COUNTS ADD UP. `pool = offered + narrowedOut + withheld`
         is the arithmetic `@/features/curation` prints in words. If
         the three numbers a step hands it do not satisfy it, the
         sentence under the list is wrong and nobody can tell.

   The seed is `src/demos/northside.ts` — 810 live boats, 434 live
   trailers, and the eleven series banners F8 was measured on.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { buildNorthsideProject } = await import('@/demos/northside')
const { useProjectStore } = await import('@/store/useProjectStore')
const { createViewFor } = await import('@/features/views')
const { readCuration } = await import('@/features/curation')
const { holdRate, ledgerFor } = await import('@/features/constraints/ruleLedger')
const { mintQuoteFromView, stepOffer, stepReason } = await import('./freeze')
const {
  buildSteps,
  decidedCount,
  firstOpenStep,
  savedNote,
  stepAfter,
  stepBefore,
  weighPick,
  SUBJECT_STEP,
} = await import('./steps')
const { lineAmount, quoteTotals } = await import('./totals')
import type { QuoteDef, QuoteSection } from './types'

/* ---------------------------------------------------------- */
/* One real quote, off the real sheet                          */
/* ---------------------------------------------------------- */

const project = buildNorthsideProject()
const entities: Record<string, EntityDef> = Object.fromEntries(
  project.entities.map((e) => [e.id, e]),
)
useProjectStore.setState({ entities, rowsByEntity: project.rowsByEntity })

const boats = project.entities.filter((e) => e.kind === 'boat' && e.role !== 'join')

/** The first hull whose quote has a trailer section with something in
 *  it. Chosen by SEARCHING rather than by hard-coding a row id: a row
 *  id typed into a test is a test that goes green on the wrong boat
 *  the first time the seed is regenerated. */
function firstQuoteWithA(kind: string): { quote: QuoteDef; section: QuoteSection } | null {
  for (const boat of boats) {
    const view = createViewFor(boat.id)
    for (const row of (project.rowsByEntity[boat.id] ?? []).slice(0, 12)) {
      const quote = mintQuoteFromView({ viewId: view.id, rowId: row.id, reference: 'T-1' })
      if (!quote) continue
      const section = quote.sections.find(
        (s) => s.blockId !== SUBJECT_STEP && entities[s.tableId]?.kind === kind,
      )
      if (section) return { quote, section }
    }
  }
  return null
}

const trailerCase = firstQuoteWithA('trailer')
const motorCase = firstQuoteWithA('motor')

/* ---------------------------------------------------------- */
/* 1 · the sequence is a reading, not a state                  */
/* ---------------------------------------------------------- */

describe('a step is a reading of a document that is already written down', () => {
  it('makes one stop per section, in the view’s own order, subject first', () => {
    const quote = trailerCase?.quote ?? motorCase?.quote
    expect(quote).toBeTruthy()
    if (!quote) return

    const steps = buildSteps(quote)
    expect(steps.length).toBe(quote.sections.length)
    expect(steps[0].id).toBe(SUBJECT_STEP)
    expect(steps[0].subject).toBe(true)
    expect(steps.map((s) => s.id)).toEqual(quote.sections.map((s) => s.blockId))
    expect(steps.map((s) => s.index)).toEqual(steps.map((_, i) => i + 1))
  })

  it('sums each stop from the FROZEN lines and never from the sheet', () => {
    const quote = trailerCase?.quote
    expect(quote).toBeTruthy()
    if (!quote) return

    for (const step of buildSteps(quote)) {
      const byHand = step.lines.reduce<number | null>((sum, line) => {
        const { amount } = lineAmount(line)
        return amount === null ? sum : (sum ?? 0) + amount
      }, null)
      expect(step.amount).toBe(byHand)
      expect(step.unpriced).toBe(
        step.lines.filter((l) => lineAmount(l).amount === null).length,
      )
    }
  })

  it('opens on the first stop with nothing on it, and walks both ways', () => {
    const quote = trailerCase?.quote
    if (!quote) return
    const steps = buildSteps(quote)
    const open = steps.find((s) => s.state === 'open')
    expect(firstOpenStep(steps)).toBe((open ?? steps[steps.length - 1]).id)

    /* every stop is reachable in both directions — production's
       stepper is a row of divs and moves forward only */
    expect(stepBefore(steps, steps[0].id)).toBeNull()
    expect(stepAfter(steps, steps[steps.length - 1].id)).toBeNull()
    for (let i = 1; i < steps.length; i += 1) {
      expect(stepBefore(steps, steps[i].id)).toBe(steps[i - 1].id)
      expect(stepAfter(steps, steps[i - 1].id)).toBe(steps[i].id)
    }
    expect(decidedCount(steps)).toBe(steps.filter((s) => s.lines.length > 0).length)
  })

  it('never reassures a person while the write is failing', () => {
    const problem = 'This browser is refusing to store anything.'
    expect(savedNote(problem)).toBe(problem)
    expect(savedNote(null)).toContain('come back to it')
    expect(savedNote(null)).not.toContain('saved')
  })
})

/* ---------------------------------------------------------- */
/* 2 · the narrowing explains itself, with the measured rate   */
/* ---------------------------------------------------------- */

describe('a narrowing says what did it, and quotes the price file’s own rate', () => {
  it('names the list that pairs these with this one', () => {
    if (!trailerCase) return
    const why = stepReason(trailerCase.quote, trailerCase.section)
    expect(why).toBeTruthy()
    if (!why) return
    expect(why.tableName).toBe(entities[trailerCase.section.tableId].name)
    /* a clause, for the mechanism to put "because" in front of: no
       leading capital, no trailing stop */
    expect(why.what.length).toBeGreaterThan(0)
    expect(why.what.endsWith('.')).toBe(false)
    if (why.via) expect(why.what).toContain(why.via)
  })

  it('carries F8’s adjudicated figure on a trailer step, verbatim', () => {
    if (!trailerCase) return
    const why = stepReason(trailerCase.quote, trailerCase.section)
    const entry = ledgerFor('F8')
    expect(entry?.measure).toBeTruthy()
    if (!why?.measured || !entry?.measure) return

    expect(why.measured.ref).toBe('F8')
    expect(why.measured.holds).toBe(
      `${entry.measure.held.toLocaleString()} of ${entry.measure.tested.toLocaleString()}`,
    )
    expect(why.measured.rate).toBe(holdRate(entry.measure))
    expect(why.measured.of).toBe(entry.measure.of)
    /* THE QUALIFICATION MAY NEVER BE SEPARATED FROM THE FIGURE */
    expect(why.measured.caveat).toBe(entry.caveat)
    /* the chip's one-clause form still carries the rate */
    expect(why.measured.clause).toContain(why.measured.rate)
  })

  it('carries A1 on a motor step and NOTHING on a table nobody measured', () => {
    if (motorCase) {
      const why = stepReason(motorCase.quote, motorCase.section)
      expect(why?.measured?.ref).toBe('A1')
    }
    const other = trailerCase?.quote.sections.find(
      (s) =>
        s.blockId !== SUBJECT_STEP &&
        entities[s.tableId] !== undefined &&
        entities[s.tableId].kind !== 'trailer' &&
        entities[s.tableId].kind !== 'motor',
    )
    if (other && trailerCase) {
      /* a rule this project has never measured says the count and the
         reason and stops — it does not reach for a nearby figure */
      expect(stepReason(trailerCase.quote, other)?.measured).toBeUndefined()
    }
  })
})

/* ---------------------------------------------------------- */
/* 3 · nothing is unreachable                                  */
/* ---------------------------------------------------------- */

describe('every step can reach its whole table', () => {
  it('switching the narrowing off offers more than the narrowing did', () => {
    if (!trailerCase) return
    const narrowed = stepOffer(trailerCase.quote, trailerCase.section)
    const everything = stepOffer(trailerCase.quote, trailerCase.section, { all: true })

    expect(narrowed.catalogue).toBeGreaterThan(narrowed.narrowed)
    expect(everything.matched).toBe(narrowed.narrowed + (everything.catalogue - narrowed.narrowed))
    expect(everything.matched).toBeGreaterThan(narrowed.matched)
    /* the switch changes what is OFFERED and never what the narrowing
       found — the denominators are facts about the sheet */
    expect(everything.narrowed).toBe(narrowed.narrowed)
    expect(everything.pool).toBe(narrowed.pool)
  })

  it('the search ignores the narrowing, and marks what it reached past', () => {
    if (!trailerCase) return
    const narrowed = stepOffer(trailerCase.quote, trailerCase.section)
    const everything = stepOffer(trailerCase.quote, trailerCase.section, { all: true })

    /* a row the narrowing does NOT admit, named by the sheet itself */
    const outside = everything.candidates.find((c) => c.outside === true)
    if (!outside) return
    const found = stepOffer(trailerCase.quote, trailerCase.section, {
      query: outside.line.label,
    })

    expect(found.candidates.length).toBeGreaterThan(0)
    expect(found.candidates.some((c) => c.line.label === outside.line.label)).toBe(true)
    expect(found.beyond).toBeGreaterThan(0)
    /* and it is still marked as outside the list, so a row the price
       file never paired with this hull cannot look like one it did */
    expect(
      found.candidates.find((c) => c.line.label === outside.line.label)?.outside,
    ).toBe(true)
    expect(narrowed.beyond).toBe(0)
  })

  it('offers nothing at all for the subject — one boat on a quote for one boat', () => {
    if (!trailerCase) return
    const subject = trailerCase.quote.sections[0]
    expect(subject.blockId).toBe(SUBJECT_STEP)
    expect(stepOffer(trailerCase.quote, subject).candidates).toEqual([])
    expect(stepReason(trailerCase.quote, subject)).toBeNull()
  })
})

/* ---------------------------------------------------------- */
/* 4 · the counts add up to the sentence printed under them    */
/* ---------------------------------------------------------- */

describe('the three counts satisfy the arithmetic the curation note prints', () => {
  it('pool = offered + narrowedOut + withheld, on every step of a real quote', () => {
    const quote = trailerCase?.quote
    if (!quote) return

    for (const section of quote.sections) {
      if (section.blockId === SUBJECT_STEP) continue
      const offer = stepOffer(quote, section)
      const why = stepReason(quote, section)
      if (!why) continue

      const reading = readCuration({
        name: why.tableName,
        counts: { pool: offer.pool, matched: offer.admitted, offered: offer.narrowed },
        narrowings: [{ id: 'step', what: why.what }],
        showingAll: false,
        search: { term: '', beyond: offer.beyond },
      })

      expect(reading.offered + reading.narrowedOut + reading.withheld).toBe(reading.pool)
      expect(reading.pool).toBeGreaterThanOrEqual(reading.offered)
      /* the note is either a sentence or deliberately silent — never a
         count with no words around it */
      if (reading.narrowedOut > 0) {
        /* the count is printed the way a person reads it — grouped —
           which is `curationNote`'s business and not this test's to
           second-guess. It asserts the number is THERE, in the form
           the screen prints it. */
        expect(reading.note).toContain(reading.narrowedOut.toLocaleString())
      }
    }
  })
})

/* ---------------------------------------------------------- */
/* 5 · the build is still USABLE after the page was closed     */
/* ---------------------------------------------------------- */

/* THE HALF OF THE PROMISE THAT ALMOST GOT AWAY.
 *
 * `savedNote` tells a person "close this and come back to it", and
 * the document does come back — `quotes.ts` writes every pick and
 * `survivesClose.test.ts` proves the round trip. What did NOT come
 * back was the SCREEN. A quote stores `viewId`, and a ViewDef is
 * session state (`features/views/index.ts` §1: "not persisted …
 * lost on reload"), so a quote reopened in a new tab pointed at a
 * view that no longer existed and every reader in freeze.ts took its
 * `if (!view) return` branch. Measured in the browser: a build with
 * six frozen lines came back with every figure intact and every step
 * reading "nothing in it that is still sold" — no reason, no search,
 * no switch — over a sheet holding 434 trailers.
 *
 * A RELOAD IS SIMULATED BY BREAKING BOTH IDS, because both really do
 * break: the view id is minted per session, and so is every block id
 * inside it (`defaultBlocksFor`). What survives a reload is the pair
 * a reader can therefore rely on — `rootTableId` and the section's
 * own `tableId` — and that is exactly what the fallback matches on.
 */
describe('a quote reopened after a reload can still be built', () => {
  it('offers and explains a step whose view id and block id are both gone', () => {
    if (!trailerCase) return
    const live = stepOffer(trailerCase.quote, trailerCase.section)
    const liveWhy = stepReason(trailerCase.quote, trailerCase.section)

    const reopened: QuoteDef = { ...trailerCase.quote, viewId: 'view-that-no-longer-exists' }
    const section: QuoteSection = {
      ...trailerCase.section,
      blockId: 'block-that-no-longer-exists',
    }

    const after = stepOffer(reopened, section)
    const afterWhy = stepReason(reopened, section)

    /* the same list, the same denominators, the same sentence */
    expect(after.narrowed).toBe(live.narrowed)
    expect(after.catalogue).toBe(live.catalogue)
    expect(after.pool).toBe(live.pool)
    expect(after.candidates.map((c) => c.line.label)).toEqual(
      live.candidates.map((c) => c.line.label),
    )
    expect(afterWhy?.what).toBe(liveWhy?.what)
    expect(afterWhy?.tableName).toBe(liveWhy?.tableName)

    /* and the two halves the mechanism needs still work: the whole
       catalogue is still reachable, and the search still reaches
       past the narrowing */
    const everything = stepOffer(reopened, section, { all: true })
    expect(everything.matched).toBeGreaterThan(after.matched)
  })

  it('still refuses when the root table itself has gone off the sheet', () => {
    if (!trailerCase) return
    const orphan: QuoteDef = {
      ...trailerCase.quote,
      viewId: 'view-that-no-longer-exists',
      rootTableId: 'table-that-no-longer-exists',
    }
    /* NOT a fallback for everything: with no root table there is no
       page to rebuild, and inventing one would offer rows against a
       hull the sheet no longer has. */
    expect(stepOffer(orphan, trailerCase.section).candidates).toEqual([])
    expect(stepReason(orphan, trailerCase.section)).toBeNull()
  })
})


/* ---------------------------------------------------------- */
/* 5 · a choice says what it would cost, before it is made     */
/* ---------------------------------------------------------- */

/* CONFIGURATOR.md §C asks the configurator to show "the consequence
   before the commitment". The claim `weighPick` makes is narrow and
   worth guarding exactly because it is narrow: the preview a person
   reads while deciding, and the total they read out after deciding,
   come from ONE summation and therefore cannot disagree.

   The way this fails silently is by drifting into a second copy of
   the arithmetic — summing `unitPrice` and forgetting quantity, or
   summing the package and forgetting the adjustments. Both are
   asserted below against the real seed rather than a fixture. */

describe('what a choice would do to the total, before it is taken', () => {
  it('previews an add, and the round trip back off lands on the number it started at', () => {
    const found = trailerCase ?? motorCase
    expect(found).toBeTruthy()
    if (!found) return
    const { quote, section } = found

    const priced = stepOffer(quote, section, { all: true }).candidates.find(
      (c) => c.alreadyLineId === undefined && lineAmount(c.line).amount !== null,
    )
    expect(priced).toBeTruthy()
    if (!priced) return

    const now = quoteTotals(quote).total
    const on = weighPick(quote, priced.line)
    expect(on.delta).not.toBeNull()
    expect(on.would).toBe(now + (on.delta as number))

    /* the document that would exist if it were taken, weighed from
       the other side: taking it back off returns the total the
       preview started from, and the two deltas are one figure with
       two signs */
    const taken: QuoteDef = { ...quote, lines: [...quote.lines, priced.line] }
    const off = weighPick(taken, priced.line, priced.line.id)
    expect(off.would).toBe(now)
    expect(off.delta).toBe(-(on.delta as number))
  })

  it('counts the ADJUSTMENTS a person typed, not just the package', () => {
    const found = trailerCase ?? motorCase
    if (!found) return
    const { quote, section } = found
    const priced = stepOffer(quote, section, { all: true }).candidates.find(
      (c) => c.alreadyLineId === undefined && lineAmount(c.line).amount !== null,
    )
    if (!priced) return

    /* a trade-in is signed negative, and a preview that summed the
       package alone would be $4,000 out at the moment a salesperson
       is reading a figure to a customer */
    const withTrade: QuoteDef = {
      ...quote,
      adjustments: [
        { id: 'adj-1', kind: 'tradeIn' as const, label: 'Trade-in', amount: -4000 },
      ],
    }
    const w = weighPick(withTrade, priced.line)
    expect(w.would).toBe(quoteTotals(withTrade).total + (lineAmount(priced.line).amount as number))
    expect(w.would).toBe(weighPick(quote, priced.line).would - 4000)
  })

  it('counts the QUANTITY on the line it is weighing', () => {
    const found = trailerCase ?? motorCase
    if (!found) return
    const { quote, section } = found
    const priced = stepOffer(quote, section, { all: true }).candidates.find(
      (c) => c.alreadyLineId === undefined && lineAmount(c.line).amount !== null,
    )
    if (!priced) return

    const three = { ...priced.line, qty: 3 }
    expect(weighPick(quote, three).delta).toBe(
      (weighPick(quote, priced.line).delta as number) * 3,
    )
  })

  it('says a blank is a blank — never a delta of nothing', () => {
    const found = trailerCase ?? motorCase
    if (!found) return
    const { quote, section } = found
    const any = stepOffer(quote, section, { all: true }).candidates[0]
    if (!any) return

    /* THE RULE THE WHOLE FEATURE KEEPS: a line with no price is not
       summed as zero. `delta: 0` would read on the bar as "this one
       is free", which is the silent-$0 fault stakeholders catch. */
    const unpriced = { ...any.line, unitPrice: null, overridePrice: undefined }
    const w = weighPick(quote, unpriced)
    expect(w.delta).toBeNull()
    expect(w.would).toBe(quoteTotals(quote).total)
  })

  it('leaves the document it is weighing exactly as it found it', () => {
    const found = trailerCase ?? motorCase
    if (!found) return
    const { quote, section } = found
    const any = stepOffer(quote, section, { all: true }).candidates[0]
    if (!any) return

    const before = JSON.stringify(quote)
    weighPick(quote, any.line)
    weighPick(quote, any.line, quote.lines[0]?.id)
    expect(JSON.stringify(quote)).toBe(before)
  })
})
