/* ============================================================
   THE FOUR PROPERTIES, ASSERTED.

   `docs/plan/hl-journeys.md` §4 names them and this file is the
   guard that none of them can be dropped by a refactor:

     1 · it explains itself
     2 · it can be searched past
     3 · it can be switched off
     4 · the count of what was hidden is STATED, never implied

   Plus the two things the brief's red lines turn on: the buckets
   ADD UP — pool = offered + narrowedOut + withheld, so a person is
   never left subtracting — and the discontinued half is said in the
   contract's OWN words, so there is one sentence and not two
   competing ones.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { heldBackSentence, stillOnTheSheet, withheldClause } from '@/features/views/sellable'
import { curationChip, curationNote, reachNote, readCuration, toggleWords } from './curation'
import { searchReach } from './reach'
import type { CurationInput } from './curation'

/* The real, measured example the brief asks for: 434 live trailers,
   12 of them admitted by F8 for a Highfield hull, and 2 of those 12
   no longer sold. Every figure here is one this project measured —
   `docs/specs/FITMENT_RULES.md` §1.2 and `trailerFitment.test.ts`. */
const trailers = (over: Partial<CurationInput> = {}): CurationInput => ({
  name: 'Trailers',
  counts: { pool: 434, matched: 12, offered: 10 },
  narrowings: [
    {
      id: 'f8',
      what: 'the series banner names this brand',
      measured: 'holds on 581 of 581 pairings, no exceptions',
    },
  ],
  showingAll: false,
  ...over,
})

/* ---------------------------------------------------------- */
/* 1. IT EXPLAINS ITSELF                                       */
/* ---------------------------------------------------------- */

describe('the chip is the sentence HelmLogic cannot write', () => {
  it('names the count, the rule and the measured rate, in that order', () => {
    expect(curationChip(trailers())).toBe(
      '10 of 434 Trailers · the series banner names this brand · holds on 581 of 581 pairings, no exceptions',
    )
  })

  it('claims no rate for a rule nobody measured', () => {
    const chip = curationChip(
      trailers({ narrowings: [{ id: 'r', what: 'it is linked to this boat' }] }),
    )
    expect(chip).toBe('10 of 434 Trailers · it is linked to this boat')
    expect(chip).not.toMatch(/holds on|%/)
  })

  it('carries every reason when more than one narrowed it', () => {
    const chip = curationChip(
      trailers({
        narrowings: [
          { id: 'a', what: 'the series banner names this brand' },
          { id: 'b', what: 'it is not already on the quote' },
        ],
      }),
    )
    expect(chip).toContain('the series banner names this brand')
    expect(chip).toContain('it is not already on the quote')
  })
})

/* ---------------------------------------------------------- */
/* 2. THE COUNT IS STATED, NEVER IMPLIED                       */
/* ---------------------------------------------------------- */

describe('the count of what was hidden', () => {
  it('is a number in the sentence and not a subtraction', () => {
    const note = curationNote(trailers())
    /* 434 − 12 = 422. A reader must not have to do that. */
    expect(note).toContain('422 Trailers are not offered here')
    expect(note).toContain('because the series banner names this brand')
  })

  it('carries the measured rate into the reason', () => {
    expect(curationNote(trailers())).toContain(
      'it holds on 581 of 581 pairings, no exceptions',
    )
  })

  it('says both halves, and they add up to the pool', () => {
    const r = readCuration(trailers())
    expect(r.offered + r.narrowedOut + r.withheld).toBe(r.pool)
    expect(r.narrowedOut).toBe(422)
    expect(r.withheld).toBe(2)
  })

  it('agrees with the discontinued contract word for word', () => {
    const note = curationNote(trailers())
    /* the SAME clause the block, the picker and the index print — not
       a second phrasing of the same fact */
    expect(note).toContain(withheldClause(2, 'Trailers'))
    expect(note).toContain(stillOnTheSheet(2))
    expect(heldBackSentence(2, 'Trailers')).toContain(withheldClause(2, 'Trailers'))
  })

  it('says nothing at all when nothing was hidden', () => {
    const r = readCuration(
      trailers({ counts: { pool: 12, matched: 12, offered: 12 }, narrowings: [] }),
    )
    expect(r.quiet).toBe(true)
    expect(r.note).toBe('')
  })

  it('still says the discontinued half when the rule hid nothing', () => {
    const r = readCuration(
      trailers({ counts: { pool: 12, matched: 12, offered: 11 }, narrowings: [] }),
    )
    expect(r.quiet).toBe(false)
    expect(r.note).toContain('1 Trailer is no longer sold')
    expect(r.note).toContain('It stays on the sheet')
  })

  it('never prints a negative count, whatever a caller hands in', () => {
    const r = readCuration(trailers({ counts: { pool: 5, matched: 9, offered: 12 } }))
    expect(r.narrowedOut).toBe(0)
    expect(r.withheld).toBe(0)
    expect(r.note).toBe('')
  })

  it('keeps the author’s own casing and never uppercases a name', () => {
    const chip = curationChip(trailers({ name: 'NSM Custom Trailers' }))
    expect(chip).toContain('NSM Custom Trailers')
    expect(chip).not.toContain('TRAILERS ·')
  })

  it('says one thing in the singular', () => {
    expect(
      curationNote(trailers({ counts: { pool: 2, matched: 1, offered: 1 }, narrowings: [] })),
    ).toBe('1 Trailer is not offered here.')
  })
})

/* ---------------------------------------------------------- */
/* 3. IT CAN BE SWITCHED OFF                                   */
/* ---------------------------------------------------------- */

describe('the switch', () => {
  it('is labelled with its act and not with its state', () => {
    expect(toggleWords(trailers()).label).toBe('Show everything')
    expect(toggleWords(trailers({ showingAll: true })).label).toBe('Show what fits')
  })

  it('says what it will do, with the number it will reach', () => {
    expect(toggleWords(trailers()).say).toContain('all 434 Trailers')
    expect(toggleWords(trailers()).say).toContain('narrowing switched off')
  })

  it('stops explaining a narrowing that is switched off', () => {
    const r = readCuration(trailers({ showingAll: true }))
    /* NOT "all 434", BECAUSE 434 IS NOT WHAT IS ON OFFER. This fixture
       still holds back 2 rows the discontinued contract withheld, and
       the note below says so — so a chip claiming "all 434" would be
       the chip and the paragraph disagreeing, which is the one fault
       computing both from one set of counts exists to prevent. The
       word "all" is earned only where the offer IS the pool. See
       `curationChip`; found by mounting the mechanism on the module
       catalogue, whose 727 withheld lines made it visible. */
    expect(r.chip).toBe('10 of 434 Trailers')
    /* THE NARROWING IS OFF: its 422 are no longer accounted for */
    expect(r.note).not.toContain('422')
    /* the discontinued contract is NOT a narrowing and does not switch
       off — nobody may be offered stock the business stopped selling */
    expect(r.note).toContain('no longer sold')
  })

  it('still says “all” where the offer really is the pool', () => {
    /* The other half of the same rule, so nobody reads the change
       above as "the word all was removed". A table with nothing
       discontinued in it switches its narrowing off and gets the
       shortest true sentence there is. */
    const r = readCuration(
      trailers({ showingAll: true, counts: { pool: 434, matched: 434, offered: 434 } }),
    )
    expect(r.chip).toBe('all 434 Trailers')
    expect(r.withheld).toBe(0)
    expect(r.note).toBe('')
  })
})

/* ---------------------------------------------------------- */
/* 4. IT CAN BE SEARCHED PAST                                  */
/* ---------------------------------------------------------- */

describe('a search that ignores the narrowing', () => {
  const pool = [
    { id: 'a', hay: 'redco stabicraft 4.8m' },
    { id: 'b', hay: 'dunbier highfield sp460' },
    { id: 'c', hay: 'redco highfield 5.6m' },
  ]
  const reach = (term: string, offered: string[]) =>
    searchReach({
      pool,
      offered: new Set(offered),
      idOf: (r) => r.id,
      hayOf: (r) => r.hay,
      term,
    })

  it('finds the row the narrowing removed, and says which side it is on', () => {
    const r = reach('redco', ['b'])
    expect(r.within).toHaveLength(0)
    expect(r.beyond.map((x) => x.id)).toEqual(['a', 'c'])
  })

  it('matches word by word, so “sp460 highfield” finds the row', () => {
    expect(reach('sp460 highfield', ['b']).within.map((x) => x.id)).toEqual(['b'])
  })

  it('is inert with no term, rather than matching everything', () => {
    const r = reach('   ', ['b'])
    expect(r.active).toBe(false)
    expect(r.beyond).toHaveLength(0)
  })

  it('states the count on the far side as an offer', () => {
    const say = reachNote(trailers({ search: { term: 'redco', beyond: 3 } }))
    expect(say).toContain('3 more Trailers match')
    expect(say).toContain('redco')
    expect(say).toContain('outside this narrowing')
  })

  it('says nothing when the search reaches nothing new', () => {
    expect(reachNote(trailers({ search: { term: 'redco', beyond: 0 } }))).toBe('')
    expect(reachNote(trailers({ search: { term: '', beyond: 9 } }))).toBe('')
  })

  it('says one match in the singular', () => {
    expect(reachNote(trailers({ search: { term: 'redco', beyond: 1 } }))).toContain(
      '1 more Trailer matches',
    )
  })
})
