/* ============================================================
   THE LOCKUP — what `marqueOf` is allowed to do to a name.

   WHY THIS FILE EXISTS. `.qb-name` sets the model code at the display
   step (82.86px at 1280, 110px at 1920) and the maker and the trim in
   two quieter steps around it. That only works if the string is split
   correctly, and the split is the one part of the identity column no
   guard can see: CLAUDE.md records that there is no visual regression
   tooling, so a splitter that starts eating the maker, or dropping the
   colourway, would ship silently and look deliberate.

   THE PROMISE EVERY CASE BELOW KEEPS. Nothing is dropped. Every
   character of the label comes back out in `maker`, `model` and
   `trim` — DESIGN_PRINCIPLES §3's "nothing truncates" applies to a
   function that takes a name apart just as much as to a stylesheet
   that runs out of room. The last test asserts it over the real
   shapes rather than trusting the three above it.
   ============================================================ */
import { describe, expect, it } from 'vitest'

import { marqueOf } from './QuoteBuild'

/** Put the parts back together the way the `h1` reads them out. */
const rejoin = (label: string): string => {
  const l = marqueOf(label)
  return [l.maker, l.model, l.trim].filter((s) => s !== '').join(' ')
}

/** The shapes the seeded price file actually produces. */
const SEED = [
  'Highfield - CL260 (PVC) B-G-DG',
  'Highfield - ADV9 (Dune)',
  'Highfield - RU230KAM (PVC) WH',
  'Highfield - SP420 (HYP) I-B-C',
  'Yamaha - F9.9SMHB',
  'Yamaha - XF450USA',
  'Yamaha Twin Rig - F300XCB / LF300XCB (25" Shafts)',
  'Helm Master L2 - 6X9 Binnacle | Built in DES | Straight Helm | EKS | Single',
  'DEC Rigging Kit (Twin Eng) - 6X9 Twin Binnacle Mnt | CL5 Gauge Kit',
  'Fusion Apollo RA670 Stereo w 2 Pairs of XS 6.5 Speakers + 1.8mtr Aerial',
]

describe('marqueOf', () => {
  it('takes the maker off the front and leaves the model as the marque', () => {
    expect(marqueOf('Highfield - CL260 (PVC) B-G-DG')).toEqual({
      maker: 'Highfield',
      model: 'CL260',
      trim: '(PVC) B-G-DG',
      long: false,
    })
  })

  it('keeps a model with no qualifier whole and leaves the trim empty', () => {
    /* `F9.9SMHB` is eight characters and measures 367px at the
       marque step against the rebuilt lockup's 481px column, so it
       is NOT long — it was, against `ProductPane`'s 360px column at
       a step that was 82.86px. Both halves of that measurement
       moved; marque.ts carries the new one. */
    expect(marqueOf('Yamaha - F9.9SMHB')).toEqual({
      maker: 'Yamaha',
      model: 'F9.9SMHB',
      trim: '',
      long: false,
    })
  })

  it('splits at a pipe as well as at a bracket', () => {
    const l = marqueOf('Helm Master L2 - 6X9 Binnacle | Built in DES | Straight Helm')
    expect(l.maker).toBe('Helm Master L2')
    expect(l.model).toBe('6X9 Binnacle')
    expect(l.trim).toBe('| Built in DES | Straight Helm')
  })

  it('refuses a head too long to be a maker rather than inventing one', () => {
    /* `DEC Rigging Kit (Twin Eng)` is 26 characters before its ` - `.
       A part description is not a maker, and printing it in the
       maker's step would be a lie about what the row is. */
    const l = marqueOf('DEC Rigging Kit (Twin Eng) - 6X9 Twin Binnacle Mnt | CL5 Gauge Kit')
    expect(l.maker).toBe('')
    expect(l.model).toBe('DEC Rigging Kit')
  })

  it('marks a name with no marque in it long, so the surface steps down', () => {
    const l = marqueOf('Fusion Apollo RA670 Stereo w 2 Pairs of XS 6.5 Speakers + 1.8mtr Aerial')
    expect(l.maker).toBe('')
    expect(l.long).toBe(true)
  })

  it('is nine characters that fit, and ten that do not', () => {
    /* The boundary is a MEASUREMENT, not a taste. Archivo at the
       marque step is 75.52px and the rebuilt lockup's content box is
       481px: `SP760ST` renders at 319 and `RU230KAM` at 396, both
       inside it, and ~49.5px per character puts ten at ~495 and over.

       IT WAS SEVEN, AND SEVEN WAS COSTING THE CONFIGURATOR ITS
       REGISTER — `RU230KAM` stepped down to the hero and the screen
       measured 4.39x scale contrast where Showroom requires 6x, with
       the PRICE the largest thing on a screen about a boat. */
    expect(marqueOf('Highfield - SP760ST').long).toBe(false)
    expect(marqueOf('Highfield - RU230KAM (PVC) WH').long).toBe(false)
    /* Nine and ten, spelled out: F250XCA24 is nine characters. */
    expect(marqueOf('Yamaha - F250XCA24').long).toBe(false)
    expect(marqueOf('Yamaha - F250XCA241').long).toBe(true)
  })

  /* A TOKEN CEILING IS NOT THE WHOLE TEST. A name can be seventy
     characters with no token over eight — it wraps, and at 75.52px
     it wraps onto eight lines. Two ceilings, and both have to hold. */
  it('marks a long name long even when every word in it is short', () => {
    const l = marqueOf('Stacer - 399 Proline Angler Side Console Package')
    expect(l.maker).toBe('Stacer')
    expect(l.long).toBe(true)
  })

  it('never drops a character of any label the seed produces', () => {
    /* The ONLY thing the split is allowed to consume is the ` - ` it
       took the maker off at, and only when it took one — where no
       maker is found the hyphen stays in the model, which is why the
       expectation has to ask rather than assume. */
    for (const label of SEED) {
      const l = marqueOf(label)
      expect(rejoin(label)).toBe(l.maker === '' ? label : label.replace(' - ', ' '))
    }
  })

  it('survives a label with nothing in it', () => {
    expect(marqueOf('')).toEqual({ maker: '', model: '', trim: '', long: true })
  })
})
