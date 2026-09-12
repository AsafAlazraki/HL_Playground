import { describe, expect, it } from 'vitest'
import { colourwayOf, isColourway, splitVariant } from './colourway'

/* Every code in here is a real cell off the Northside sheet or a
   real SKU quoted in HELMLOGIC_GROUND_TRUTH §1.3. Nothing is made
   up, because a decoder tested on invented input proves nothing
   about the file it has to read. */

describe('splitVariant', () => {
  it('takes the colourway off a one-word material', () => {
    expect(splitVariant('HYP B-G-B')).toEqual({ material: 'HYP', code: 'B-G-B' })
  })

  /* THE MATERIAL HALF IS NOT ONE WORD. "540 open (PVC)" is four,
     which is why this splits from the right and not the left. */
  it('takes the colourway off a four-word material', () => {
    expect(splitVariant('540 open (PVC) LG-W-DG')).toEqual({
      material: '540 open (PVC)',
      code: 'LG-W-DG',
    })
  })

  it('is a code with no material when there is only one token', () => {
    expect(splitVariant('B-G-B')).toEqual({ material: '', code: 'B-G-B' })
  })

  it('is nothing at all when the cell is empty', () => {
    expect(splitVariant('   ')).toEqual({ material: '', code: '' })
  })
})

describe('colourwayOf', () => {
  it('reads the three parts of a real ADV7 code', () => {
    const c = colourwayOf('B-G-B')
    expect(c.parts).toEqual(['Black', 'Grey', 'Black'])
    expect(c.say).toBe('Black / Grey / Black')
    expect(c.read).toBe(true)
  })

  it('reads the compound parts', () => {
    expect(colourwayOf('DG-G-WB').say).toBe('Dark Grey / Grey / White/Blue')
    expect(colourwayOf('LG-W-DG').say).toBe('Light Grey / White / Dark Grey')
    expect(colourwayOf('DG-G-DB').say).toBe('Dark Grey / Grey / Dark Blue')
  })

  it('reads a single-part code', () => {
    expect(colourwayOf('MB')).toMatchObject({ parts: ['Military Black'], read: true })
  })

  /* ALL OR NOTHING. Half a translation reads as one that worked. */
  it('hands back the whole code when any part is unknown', () => {
    const c = colourwayOf('B-G-ZZ')
    expect(c.read).toBe(false)
    expect(c.parts).toEqual([])
    expect(c.say).toBe('B-G-ZZ')
  })

  /* `I` is "Ivory" in two production scripts and "Inflatable" in
     two others, committed the same day. It does not occur in this
     sheet, and picking a side on no evidence is the guess rule 11
     forbids — so it does not decode. */
  it('refuses the disputed part rather than choosing a side', () => {
    expect(colourwayOf('I-B-C').read).toBe(false)
    expect(colourwayOf('I-B-C').say).toBe('I-B-C')
  })

  it('says nothing about an empty code', () => {
    expect(colourwayOf('')).toEqual({ code: '', parts: [], say: '', read: false })
  })
})

describe('isColourway', () => {
  it('is true of a Highfield variant cell', () => {
    expect(isColourway('HYP B-G-B')).toBe(true)
    expect(isColourway('540 ST (PVC) B-B-DB')).toBe(true)
  })

  /* A third level that is not a colour at all — a trailer's plug, a
     motor's shaft — must never be drawn as one. */
  it('is false of a third level that is something else', () => {
    expect(isColourway('TA730T-EH')).toBe(false)
    expect(isColourway('20" shaft')).toBe(false)
    expect(isColourway('')).toBe(false)
  })
})
