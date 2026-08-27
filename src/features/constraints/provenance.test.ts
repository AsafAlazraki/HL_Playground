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

/** Every word the reader will see, in the order they will see it. */
const drawn = (text: string): string => {
  const { verdict, parts } = readSource(text)
  return [verdict ?? '', ...parts.map((p) => p.text)].join(' ').trim()
}

/** Every word the string held, with the separators taken out. */
const held = (text: string): string =>
  text
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')

describe('a citation survives being drawn', () => {
  it('keeps every word of all sixteen, in order', () => {
    expect(WORKBOOK_RULES.length).toBeGreaterThan(0)
    for (const seed of WORKBOOK_RULES) {
      /* the only edit the reader is allowed to see is the leading
         punctuation the verdict was lifted out of — "ASSERTED, and
         the dealer breaks it" loses its comma and nothing else */
      const a = drawn(seed.source).replace(/[\s,:;]+/g, ' ')
      const b = held(seed.source).replace(/[\s,:;]+/g, ' ')
      expect(a).toBe(b)
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

  it('sends every cell address to the mono line, and nowhere else', () => {
    for (const seed of WORKBOOK_RULES) {
      const { parts } = readSource(seed.source)
      for (const part of parts) {
        if (part.k === 'cell') continue
        /* a part that carries a bang belongs on the address line;
           anything else on that line would be prose set in mono */
        expect(/\w!\$?[A-Z]{1,3}/.test(part.text)).toBe(false)
      }
    }
  })

  it('prints an unreadable line whole rather than guessing at it', () => {
    const plain = 'somebody typed this by hand'
    const { verdict, parts } = readSource(plain)
    expect(verdict).toBeNull()
    expect(parts).toEqual([{ k: 'said', text: plain }])
  })
})
