import { describe, expect, it } from 'vitest'
import { markOf } from './mark'

/* Every name here is one the app actually draws a plate for. */

describe('markOf', () => {
  it('takes the initials of a two-word name', () => {
    expect(markOf('Highfield Inflatables')).toBe('HI')
    expect(markOf('Dunbier Trailers')).toBe('DT')
  })

  it('takes at most two, however many words there are', () => {
    expect(markOf('NSM Custom Trailers')).toBe('NC')
    expect(markOf('Haines Signature Factory Packages')).toBe('HS')
  })

  /* "Ac" was what a `slice(0, 2)` put on the Accessories tile: a
     word cut in half rather than a mark. */
  it('takes three characters of a single word', () => {
    expect(markOf('Accessories')).toBe('Acc')
    expect(markOf('Boats')).toBe('Boa')
  })

  /* A MODEL CODE IS ONE WORD AND ITS INITIAL IS ONE LETTER, which
     is why this is not first-letters throughout. */
  it('takes three characters of a model code', () => {
    expect(markOf('RU230KAM')).toBe('RU2')
    expect(markOf('ADV7')).toBe('ADV')
    expect(markOf('CL310LS')).toBe('CL3')
  })

  it('splits on the separators a sheet actually uses', () => {
    expect(markOf('Dunbier / Haines BMT Trailers')).toBe('DH')
    expect(markOf('Parts & Accessories')).toBe('PA')
    expect(markOf('Oils & Consumables')).toBe('OC')
  })

  /* NEVER UPPERCASED. Rule 3 keeps uppercase for labels. */
  it('leaves the name own case alone', () => {
    expect(markOf('ePropulsion Outboards')).toBe('eO')
    expect(markOf('eProp')).toBe('ePr')
  })

  it('is nothing when there is no letter or digit', () => {
    expect(markOf('   ')).toBe('')
    expect(markOf('—')).toBe('')
  })
})
