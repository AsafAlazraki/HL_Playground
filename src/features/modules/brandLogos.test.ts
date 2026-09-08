/* ============================================================
   THE BRAND MARKS — and the one promise this file exists to keep.

   THE FAULT THESE TESTS ARE WRITTEN AGAINST is not a wrong match. It
   is an entry that names a file nobody ever committed: commit 92791d6
   declared eight marks under `public/logos/`, the root `.gitignore`'s
   `*.png` rule swallowed all eight files, and the code shipped
   pointing at eight addresses that answer `200 text/html`. No test
   could have caught it, because there was nothing in the code to
   catch — the list was a list of strings and every string was
   well-formed.

   SO THE LOAD-BEARING TEST HERE IS `every mark drawn has a file`. It
   does not assert that any particular brand is present — the marks
   directory ships empty and asserting Highfield were there would be
   this suite inventing the very artwork the repository does not have.
   It asserts the INVARIANT: whatever `brandLogoFor` hands back has
   real pixels behind it, because it came from `import.meta.glob` and
   a glob cannot name a file that is absent.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { brandLogoFor, brandMarkRoster, markFor, nameWords } from './brandLogos'

describe('the matching rule', () => {
  /* ASSERTED ON THE SPLITTER, NOT THROUGH `brandLogoFor`, because with
     the marks directory empty the lookup answers undefined to
     everything and would pass whatever this rule did. `brandLogoFor`
     asks `new Set(nameWords(name)).has(word)`, so these are the same
     question one layer down. */
  it('is whole words, so a brand that sells two things is found in both', () => {
    expect(nameWords('Stacer')).toContain('stacer')
    expect(nameWords('Stacer Trailers')).toContain('stacer')
    expect(nameWords('Highfield Inflatables')).toContain('highfield')
    expect(nameWords('Yamaha Outboards')).toContain('yamaha')
  })

  it('splits on punctuation, so a slashed name still yields its brands', () => {
    /* The seed really contains this one, and `includes` would have
       been right here by accident while being wrong elsewhere. */
    expect(nameWords('Dunbier / Haines BMT Trailers')).toEqual([
      'dunbier',
      'haines',
      'bmt',
      'trailers',
    ])
    expect(nameWords('Haines Signature Factory Packages')).toContain('haines')
    expect(nameWords('Parts & Accessories')).toEqual(['parts', 'accessories'])
  })

  it('never yields a key hidden inside a longer word', () => {
    /* The `includes` fault, written out: 'nsm' is a substring of
       'transmission' and of 'NSMart', and neither is Northside
       Marine. Whole-word membership is what refuses them. */
    for (const name of ['Transmission Oils', 'NSMart Fittings', 'Stacerly']) {
      const words = nameWords(name)
      expect(words).not.toContain('nsm')
      expect(words).not.toContain('stacer')
      expect(name.toLowerCase()).toMatch(/nsm|stacer/)
    }
  })

  it('is empty for a name with no letters or digits in it', () => {
    expect(nameWords('')).toEqual([])
    expect(nameWords('  —  /  ')).toEqual([])
  })
})

describe('brand marks', () => {
  it('never hands back an address for a file that is not here', () => {
    /* THE WHOLE POINT. Eight brands are declared; the roster reports
       only the ones whose file resolved. Any name that matches must
       therefore have come from a real asset. */
    const { declared, present } = brandMarkRoster()
    expect(declared).toBe(8)
    expect(present.length).toBeLessThanOrEqual(declared)

    for (const word of present) {
      const mark = brandLogoFor(word)
      expect(mark, `${word} is on the roster and must resolve`).toBeDefined()
      expect(mark?.src).toBeTruthy()
    }
  })

  it('is undefined for a brand whose file is absent', () => {
    /* Not "is undefined for Highfield" — that would fail the day
       somebody adds the file, which is the day it should pass. The
       rule is: absent from the roster ⇒ absent from the lookup. */
    const present = new Set(brandMarkRoster().present)
    for (const word of ['highfield', 'stabicraft', 'yamaha', 'nsm']) {
      if (present.has(word)) continue
      expect(brandLogoFor(word), `${word} has no file, so no mark`).toBeUndefined()
    }
  })

  it('never matches a brand this business does not stock', () => {
    /* Formosa, ePropulsion, Dunbier, REDCO, Mackay and GFAB are real
       places in the Northside seed with no mark declared for them.
       They must stay undefined whatever lands in the directory. */
    for (const name of [
      'Formosa',
      'ePropulsion Outboards',
      'Dunbier Trailers',
      'REDCO / Tinka Trailers',
      'Mackay Trailers',
      'GFAB Trailers',
      'Labour Rates',
      'Boats',
      '',
    ]) {
      expect(brandLogoFor(name), name).toBeUndefined()
    }
  })

  it('an uploaded logo always wins over a bundled one', () => {
    /* `markFor` is the only reason every surface agrees, so the
       precedence is asserted here rather than trusted six times. */
    const mine = { id: 'x', src: 'data:image/png;base64,AAAA' }
    expect(markFor(mine, 'Highfield Inflatables')).toBe(mine)
    expect(markFor(mine, 'a name that matches nothing')).toBe(mine)
  })

  it('falls through to the brand lookup when there is no logo', () => {
    expect(markFor(undefined, 'Formosa')).toBeUndefined()
    /* whatever the directory holds, the two paths must agree */
    for (const word of brandMarkRoster().present) {
      expect(markFor(undefined, word)).toEqual(brandLogoFor(word))
    }
  })
})
