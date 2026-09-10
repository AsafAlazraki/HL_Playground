/* ============================================================
   The fixtures here are the REAL values off the Northside seed —
   the three Yamaha motors offered for a Highfield ADV7 (HYP)
   B-G-B, read out of the running app on 2026-09-10. A synthetic
   fixture would have proved the algorithm and not the claim, and
   the claim is what this change rests on: that two of the three
   facts on every card are the same on every card.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { distinguishingFacts, reduceToDifference, type Fact } from './distinguish'

const PROP_NO = { label: 'Prop Part No.', value: '6CE-45978-20' }
const PROP_DESC = { label: 'Prop Description', value: 'PROPELLER - Saltwater T II SDS - 17"' }

const XCB: Fact[] = [
  { label: 'Rigging Kit Option', value: 'Helm Master L2 - 6X9 Binnacle | Bolt on DES | Straight Helm | EKS | Single' },
  PROP_NO,
  PROP_DESC,
]
const XSB: Fact[] = [
  { label: 'Rigging Kit Option', value: 'Helm Master L2 - 6X9 Binnacle | Built in DES | Straight Helm | EKS | Single' },
  PROP_NO,
  PROP_DESC,
]
const XSB2: Fact[] = [
  {
    label: 'Rigging Kit Option',
    value: 'Helm Master L4 (Chrome) - 6X9 Binnacle | Built in DES | Straight Helm | EKS | Full Maneuverability | Single',
  },
  PROP_NO,
  PROP_DESC,
]

describe('a fact that is the same on every option is not printed', () => {
  it('drops both prop columns, which are identical across all three motors', () => {
    const out = distinguishingFacts([XCB, XSB, XSB2])
    for (const card of out) {
      expect(card.map((f) => f.label)).toEqual(['Rigging Kit Option'])
    }
  })

  it('keeps a fact the moment one option differs on it', () => {
    const a: Fact[] = [{ label: 'Shaft', value: '25"' }, PROP_NO]
    const b: Fact[] = [{ label: 'Shaft', value: '20"' }, PROP_NO]
    const out = distinguishingFacts([a, b])
    expect(out[0].map((f) => f.label)).toEqual(['Shaft'])
  })

  it('counts an ABSENT fact as a difference', () => {
    /* A candidate that carries no warranty column differs from one
       that does, and hiding that would be hiding the decision. */
    const a: Fact[] = [{ label: 'Warranty', value: '5 yr' }]
    const b: Fact[] = []
    const out = distinguishingFacts([a, b])
    expect(out[0].map((f) => f.label)).toEqual(['Warranty'])
    expect(out[1][0].full).toBe('')
  })
})

describe('the order is the dealer’s, not a ranking of our own', () => {
  it('keeps the column order the join table carries', () => {
    const a: Fact[] = [
      { label: 'Zeta', value: '1' },
      { label: 'Alpha', value: '1' },
      { label: 'Mid', value: '1' },
    ]
    const b: Fact[] = [
      { label: 'Zeta', value: '2' },
      { label: 'Alpha', value: '2' },
      { label: 'Mid', value: '2' },
    ]
    expect(distinguishingFacts([a, b])[0].map((f) => f.label)).toEqual(['Zeta', 'Alpha', 'Mid'])
  })

  it('caps at three, like the card always did', () => {
    const mk = (n: string): Fact[] =>
      ['a', 'b', 'c', 'd', 'e'].map((l) => ({ label: l, value: `${l}${n}` }))
    expect(distinguishingFacts([mk('1'), mk('2')])[0]).toHaveLength(3)
  })
})

describe('one option is not a choice', () => {
  it('prints every fact whole when there is nothing to tell it apart from', () => {
    const out = distinguishingFacts([XCB])
    expect(out[0].map((f) => f.label)).toEqual([
      'Rigging Kit Option',
      'Prop Part No.',
      'Prop Description',
    ])
    expect(out[0][0].reduced).toBe(false)
    expect(out[0][0].value).toBe(XCB[0].value)
  })

  it('falls back to the dealer’s first three when every option is identical', () => {
    const out = distinguishingFacts([XCB, XCB])
    expect(out[0].map((f) => f.label)).toHaveLength(3)
  })
})

describe('inside the fact, the segment that is actually the decision', () => {
  it('drops the segments all three share and keeps the ones that decide', () => {
    /* Of six segments, three are on all three motors — Straight
       Helm, EKS, Single — and they go. What is left of XCB is the
       two things that make it XCB: an L2 binnacle where the third
       option is an L4 Chrome, and a bolt-on DES where the other two
       are built in. Both are real discriminators, so both stay.

       THE BINNACLE IS NOT DROPPED AS SHARED, and that is the rule
       working rather than failing: XSB carries it and XSB2 does
       not, so it is not true of every option and it still tells
       these two from the third. A segment has to be on EVERY other
       card to be worth removing. */
    const out = distinguishingFacts([XCB, XSB, XSB2])
    expect(out[0][0].value).toBe('Helm Master L2 - 6X9 Binnacle · Bolt on DES')
    expect(out[1][0].value).toBe('Helm Master L2 - 6X9 Binnacle · Built in DES')
    expect(out[0][0].reduced).toBe(true)
    /* Shorter, and every character that survived is one that tells
       this motor from its neighbours. */
    expect(out[0][0].value.length).toBeLessThan(out[0][0].full.length)
  })

  it('keeps the whole value available, so nothing is lost', () => {
    const out = distinguishingFacts([XCB, XSB, XSB2])
    expect(out[0][0].full).toBe(XCB[0].value)
  })

  it('keeps every segment that is this option’s own', () => {
    /* XSB2 differs on the head AND carries a segment the others do
       not. Both survive; only what all three share is dropped. */
    const out = distinguishingFacts([XCB, XSB, XSB2])
    expect(out[2][0].value).toBe('Helm Master L4 (Chrome) - 6X9 Binnacle · Built in DES · Full Maneuverability')
  })

  it('does not reduce a value that has no segments', () => {
    expect(reduceToDifference(['25 inch', '20 inch'], 0)).toBe('')
  })

  it('does not reduce when every segment already differs', () => {
    expect(reduceToDifference(['a | b', 'c | d'], 0)).toBe('')
  })

  it('matches whole segments, never substrings', () => {
    /* `Single` and `Single Prop` are different facts, and a
       substring test would call the first shared with the second. */
    expect(reduceToDifference(['Head | Single', 'Head | Single Prop'], 0)).toBe('Single')
  })
})
