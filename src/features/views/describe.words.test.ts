/* ============================================================
   THE NOUNS A PAGE SAYS, pinned.

   `singular` was manufacturing a singular for a brand name. Every
   Surtees item page asked "WHAT ELSE GOES WITH A SURTEE?", and the
   same word reached "for this Surtee" on every block header and
   "No Surtees fit this Surtee yet" underneath it.

   A brand name has no singular. The names below are the ones the
   seed actually ships, plus the two English shapes the module's own
   comment names as the ones it must keep getting right — "Highfield
   Inflatables" ▸ "Highfield Inflatable" and "Accessories" ▸
   "Accessory".
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { article, oneOf, plural, singular } from './describe'

describe('singular', () => {
  it('leaves a brand name alone — there is no such thing as a Surtee', () => {
    expect(singular('Surtees')).toBe('Surtees')
    expect(oneOf('Surtees')).toBe('a Surtees')
  })

  it('still singularises the plurals the seed ships', () => {
    expect(singular('Highfield Inflatables')).toBe('Highfield Inflatable')
    expect(singular('Yamaha Outboards')).toBe('Yamaha Outboard')
    expect(singular('NSM Custom Trailers')).toBe('NSM Custom Trailer')
    expect(singular('Dealer Fit Packages')).toBe('Dealer Fit Package')
    expect(singular('Rigging Kits')).toBe('Rigging Kit')
    expect(singular('Labour Rates')).toBe('Labour Rate')
    expect(singular('Parts & Accessories')).toBe('Parts & Accessory')
  })

  it('leaves the seed’s singular table names untouched', () => {
    for (const name of ['Stacer', 'Stabicraft', 'Jeanneau', 'Formosa', 'Haines Signature']) {
      expect(singular(name)).toBe(name)
    }
  })

  it('keeps the -es and -ies rules it already had', () => {
    expect(singular('Accessories')).toBe('Accessory')
    expect(singular('Boxes')).toBe('Box')
    expect(singular('Boats')).toBe('Boat')
    expect(singular('Photos')).toBe('Photo')
    expect(singular('Glass')).toBe('Glass')
    expect(singular('')).toBe('row')
  })
})

describe('plural', () => {
  it('never builds "Surteeses"', () => {
    expect(plural('Surtees')).toBe('Surtees')
  })

  it('hands a plural straight back', () => {
    expect(plural('Boats')).toBe('Boats')
    expect(plural('Accessories')).toBe('Accessories')
    expect(plural('Highfield Inflatables')).toBe('Highfield Inflatables')
  })

  it('builds one from a singular', () => {
    expect(plural('Boat')).toBe('Boats')
    expect(plural('Trailer')).toBe('Trailers')
    expect(plural('Glass')).toBe('Glasses')
    expect(plural('Box')).toBe('Boxes')
  })
})

describe('article', () => {
  it('is chosen by how the name is SAID', () => {
    expect(article('Surtees')).toBe('a')
    expect(article('Accessory')).toBe('an')
    /* an all-capitals opening word is read letter by letter: N is "en" */
    expect(article('NSM Custom Trailer')).toBe('an')
  })
})
