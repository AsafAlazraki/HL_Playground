/* ============================================================
   THE SPLIT IS ONLY SAFE IF IT IS SAFE ON THE REAL STRINGS.

   `plainly.ts` cuts a recorded reason at its first sentence end so
   the card can print the reason and move the paragraph behind it.
   The whole risk is a false cut: these strings are full of figures
   — "8.8 %", "97.7 %", "530 of 530" — and a regex that fired on a
   decimal point would print half a sentence on a screen about what
   this business asserts.

   So the cases below are not invented. They are the `plainly`
   strings shipped in `workbookRules.ts`, and the last test walks
   EVERY one of them rather than the four that were convenient.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { splitReason } from './plainly'
import { WORKBOOK_RULES } from './workbookRules'

describe('splitReason', () => {
  it('leaves a single sentence whole', () => {
    const one =
      "It compares the boat's transom against the motor's leg — two different tables — and the two spell the same length differently: Highfield writes L where Stacer writes LS, and both mean twenty inches."
    const r = splitReason(one)
    expect(r.first).toBe(one)
    expect(r.rest).toBe('')
  })

  it('cuts at the sentence end, and keeps every word', () => {
    const two =
      'It compares a column on the boat with a column on the motor, and it should warn rather than block — neither of which a sentence can do yet. It also runs only one way: a tiller boat CAN take a remote motor, and 8.8 % of them do.'
    const r = splitReason(two)
    expect(r.first).toBe(
      'It compares a column on the boat with a column on the motor, and it should warn rather than block — neither of which a sentence can do yet.',
    )
    expect(r.rest).toBe(
      'It also runs only one way: a tiller boat CAN take a remote motor, and 8.8 % of them do.',
    )
  })

  it('does not cut at a decimal point', () => {
    /* "8.8 %" is followed by a space and a lower-case letter, so the
       lookahead for a capital is what saves it. */
    const r = splitReason('It holds on 97.7 % of the catalogue and that is the whole of it.')
    expect(r.rest).toBe('')
  })

  it('is empty for an absent reason', () => {
    expect(splitReason(undefined)).toEqual({ first: '', rest: '' })
    expect(splitReason('   ')).toEqual({ first: '', rest: '' })
  })

  it('never loses or reworders a word, on every shipped reason', () => {
    const said = WORKBOOK_RULES.map((s) => s.plainly).filter(
      (t): t is string => typeof t === 'string' && t.trim() !== '',
    )
    expect(said.length).toBeGreaterThan(0)
    for (const text of said) {
      const r = splitReason(text)
      /* the two halves, rejoined, are the original — so nothing was
         dropped, reordered or rewritten by the cut */
      expect([r.first, r.rest].filter(Boolean).join(' ')).toBe(text.trim())
      /* and a cut that happened left a real sentence on the card */
      if (r.rest !== '') expect(r.first.length).toBeGreaterThanOrEqual(30)
      expect(r.first).not.toBe('')
    }
  })
})
