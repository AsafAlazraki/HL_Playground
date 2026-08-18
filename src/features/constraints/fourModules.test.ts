/* ============================================================
   THE FOUR MODULES — that every verdict landed somewhere a person
   can find, including the four that could not be built.

   `docs/specs/FOUR_MODULES.md` §2 reaches twelve verdicts in four
   words: TABLE, EMBEDDED, SETTING and LEAVE. Three of the four are
   observable in the app already and are covered elsewhere —
   `rig_kits` is a table with an `Obsolete` flag (the seed tests),
   the rigging column on every boat × motor pairing is a reference
   into it (`motorRigging.test.ts`), and the LEAVEs are cards on the
   register (`serviceThemes.test.ts`).

   THE FOURTH IS THE ONE THAT CAN GO MISSING SILENTLY. A SETTING has
   no table, no column and no card, so an unbuilt one leaves no
   trace at all — which is indistinguishable, from the outside, from
   a workbook nobody opened. This file is that trace.

   IT ASSERTS THE MEASUREMENT, NOT THE PROSE. Each of the four is
   checked for the one figure that settled it, because a decision
   register whose entries can be reworded into opinions is a
   decision register that will be.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { LEFT_OUT, leftOutSubstantive } from './leftOut'

const find = (start: string) => LEFT_OUT.find((r) => r.what.startsWith(start))

describe("the four workbooks' SETTING verdicts are visible somewhere", () => {
  const cases: { start: string; must: string[]; source: string }[] = [
    {
      start: 'The exchange rates',
      /* §4.4 — the staleness nobody could see, and the blast radius */
      must: ['249', '401', '463', '1,434', '485'],
      source: '§4.4',
    },
    {
      start: 'The margin ladder',
      /* §4.1–§4.2 — 53 % of a numeric lookup returns text, and every
         boat brand's margin was 499 days unreviewed */
      must: ['22', '17', '8', '53 %', '499'],
      source: '§4.1, §4.2',
    },
    {
      start: 'The container freight rate',
      /* §5.1 — one number, unmoved in six months, and the 3.4× gap
         that makes it a packing density rather than a rate */
      must: ['128.47', '70.5', '10.7', '3.4×'],
      source: '§5.1',
    },
    {
      start: 'The finance rate card',
      /* §6.2 — four live defects, each of which changes a number a
         customer is handed */
      must: ['0 %', '$5', '9'],
      source: '§6.2, §6.3',
    },
  ]

  it.each(cases)('records $start with the figures that settled it', ({ start, must, source }) => {
    const r = find(start)
    expect(r, `${start} is recorded nowhere`).toBeDefined()
    /* DECIDED AND WAITING, never refused: FOUR_MODULES kept all four
       — what is missing is one surface, not four judgements. */
    expect(r?.verdict).toBe('later')
    expect(r?.reopensWhen?.trim(), `${start} waits for nothing nameable`).toBeTruthy()
    expect(r?.source).toContain('FOUR_MODULES.md')
    expect(r?.source).toContain(source)
    for (const m of must) {
      expect(r?.measured.includes(m) || r?.why.includes(m), `${start} lost the figure ${m}`).toBe(
        true,
      )
    }
  })

  it('says why each of them is not a table, since that was the question asked', () => {
    /* The owner's words: "They might not need to be their own tables,
       but just embedded." A verdict of SETTING that does not answer
       that is a verdict that will be re-litigated. */
    const reasons: Record<string, RegExp> = {
      'The exchange rates': /not a table anybody browses|setting an admin owns/i,
      'The margin ladder': /property of the TABLE/i,
      'The container freight rate': /twenty-second table|belongs on the brand’s own table/i,
      'The finance rate card': /neither a table nor a band of columns/i,
    }
    for (const [start, re] of Object.entries(reasons)) {
      const r = find(start)
      expect(r?.why, `${start} does not say why it is not a table`).toMatch(re)
    }
  })

  it('leaves them on the register a person actually reads, not in the artefact footnote', () => {
    /* The artefacts are summarised in one sentence at the foot. A
       decision waiting on a surface has to be a card, or the waiting
       is invisible. */
    const shown = new Set(leftOutSubstantive().map((r) => r.what))
    for (const c of cases) {
      const r = find(c.start)
      expect(r?.artefact, `${c.start} is filed as an Excel artefact`).toBeUndefined()
      expect(shown.has(r?.what ?? ''), `${c.start} is not drawn`).toBe(true)
    }
  })

  it('never names the surface that would hold them as though it existed', () => {
    /* A register that promises a screen is a roadmap, and this file's
       own header says it is not one. Every one of the four says what
       has to be true, not what is coming. */
    for (const c of cases) {
      const r = find(c.start)
      expect(r?.reopensWhen ?? '').not.toMatch(/will be|coming soon|next release|we will/i)
    }
  })
})
