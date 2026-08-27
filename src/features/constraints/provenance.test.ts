/* ============================================================
   THE CITATION MAY NOT LOSE A CHARACTER.

   `Provenance` reads the shape the adjudicator already wrote the
   source line in and gives each part the face its content
   deserves. That is a presentation change and it is allowed to
   REORDER nothing and DROP nothing — the line is the evidence that
   a rule came out of this dealer's price file rather than out of
   somebody's opinion, and a classifier that silently ate a clause
   would be worse than the grey paragraph it replaced.

   So the contract is checked against the real strings, all sixteen
   of them, rather than against an invented one.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { readSource } from './Provenance'
import { WORKBOOK_RULES } from './workbookRules'

/** Every word, punctuation stripped, sorted — so the check is
 *  "nothing was lost" and not "nothing was moved". The verdict IS
 *  moved, deliberately: it is lifted out of the line it opens and
 *  stamped at the head, where a state stamp belongs. */
const words = (text: string): string[] =>
  text
    .replace(/[·,:;]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .sort()

/** Every word the reader will see. */
const drawn = (text: string): string[] => {
  const { verdict, parts } = readSource(text)
  return words([verdict ?? '', ...parts.map((p) => p.text)].join(' '))
}

describe('a citation survives being drawn', () => {
  it('keeps every word of all sixteen', () => {
    expect(WORKBOOK_RULES.length).toBeGreaterThan(0)
    for (const seed of WORKBOOK_RULES) {
      expect(drawn(seed.source)).toEqual(words(seed.source))
    }
  })

  it('finds the adjudicator’s verdict where the string states one', () => {
    const asserted = WORKBOOK_RULES.filter((s) => /·\s*ASSERTED/.test(s.source))
    expect(asserted.length).toBeGreaterThan(0)
    for (const seed of asserted) expect(readSource(seed.source).verdict).toBe('ASSERTED')

    const observed = WORKBOOK_RULES.filter((s) => /·\s*OBSERVED/.test(s.source))
    expect(observed.length).toBeGreaterThan(0)
    for (const seed of observed) expect(readSource(seed.source).verdict).toBe('OBSERVED')
  })

  /* THE ADDRESS LINE IS THE ONE THING SOMEBODY WILL RETYPE, so what
     lands on it has to BE an address. A part that merely mentions a
     cell inside a sentence — "the 3 misses are single-letter typos
     at Boat Module!KZ115" — is prose, and prose set in the reference
     face is the fault this component was written to fix, pointing
     the other way. */
  it('puts an address on the address line, and never a sentence', () => {
    let seen = 0
    for (const seed of WORKBOOK_RULES) {
      for (const part of readSource(seed.source).parts) {
        if (part.k !== 'cell') continue
        seen += 1
        expect(part.text.startsWith(part.addr)).toBe(true)
        /* it opens with a sheet name and a bang, or with a formula */
        expect(/^(=|[A-Z][A-Za-z0-9 ()._'-]{0,29}!)/.test(part.text)).toBe(true)
      }
    }
    expect(seen).toBeGreaterThan(10)
  })

  it('prints an unreadable line whole rather than guessing at it', () => {
    const plain = 'somebody typed this by hand'
    const { verdict, parts } = readSource(plain)
    expect(verdict).toBeNull()
    expect(parts).toEqual([{ k: 'said', text: plain }])
  })
})
