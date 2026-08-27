/* ============================================================
   THE CEILING ON A MODULE'S MARK.

   The brief: "a dealer will drop a 12 MB photograph in. Bound it, and
   say what you did." So the tests are about the two numbers and the
   sentence — that a small file is kept untouched, a large one is
   redrawn into a bounded box, an absurd one is refused before it is
   read, and every one of those says which it was.

   The canvas half is not tested here: this suite runs in node (see
   vitest.config.ts) and drawing is the browser's. Every decision that
   can be taken without pixels is taken in a pure function, which is
   why they are pure functions.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import {
  LOGO_KEEP_BYTES,
  LOGO_MAX_EDGE,
  LOGO_REFUSE_BYTES,
  LOGO_ADDRESS_REFUSAL,
  LOGO_KIND_REFUSAL,
  bytesOfDataUrl,
  fitWithin,
  logoFromAddress,
  logoPlan,
  shrinkNote,
  sizeSay,
} from './logo'

describe('what happens to a chosen file', () => {
  it('keeps a real logo exactly as it is', () => {
    /* a 9 KB PNG with a transparent ground is the common case, and
       re-encoding it would be a lossy round trip nobody asked for */
    expect(logoPlan({ type: 'image/png', size: 9 * 1024 })).toEqual({ do: 'keep' })
    expect(logoPlan({ type: 'image/svg+xml', size: 4_000 })).toEqual({ do: 'keep' })
  })

  it('redraws the 12 MB photograph rather than refusing it', () => {
    const plan = logoPlan({ type: 'image/jpeg', size: 12 * 1024 * 1024 })
    expect(plan).toEqual({ do: 'shrink' })
  })

  it('refuses what it will not read, naming both numbers', () => {
    const plan = logoPlan({ type: 'image/jpeg', size: 40 * 1024 * 1024 })
    expect(plan.do).toBe('refuse')
    if (plan.do !== 'refuse') return
    expect(plan.why).toContain('40 MB')
    expect(plan.why).toContain(sizeSay(LOGO_REFUSE_BYTES))
  })

  it('refuses a file that is not a picture, saying what is allowed', () => {
    const plan = logoPlan({ type: 'application/pdf', size: 1_000 })
    expect(plan).toEqual({ do: 'refuse', why: LOGO_KIND_REFUSAL })
    expect(LOGO_KIND_REFUSAL).toContain('PNG')
  })

  it('the boundary is the boundary', () => {
    expect(logoPlan({ type: 'image/png', size: LOGO_KEEP_BYTES })).toEqual({ do: 'keep' })
    expect(logoPlan({ type: 'image/png', size: LOGO_KEEP_BYTES + 1 })).toEqual({
      do: 'shrink',
    })
    expect(logoPlan({ type: 'image/png', size: LOGO_REFUSE_BYTES }).do).toBe('shrink')
    expect(logoPlan({ type: 'image/png', size: LOGO_REFUSE_BYTES + 1 }).do).toBe('refuse')
  })
})

describe('the box a mark is redrawn into', () => {
  it('caps the longest side and keeps the ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: LOGO_MAX_EDGE, h: 384 })
    expect(fitWithin(3000, 4000)).toEqual({ w: 384, h: LOGO_MAX_EDGE })
  })

  it('never enlarges anything', () => {
    expect(fitWithin(120, 40)).toEqual({ w: 120, h: 40 })
    expect(fitWithin(LOGO_MAX_EDGE, LOGO_MAX_EDGE)).toEqual({
      w: LOGO_MAX_EDGE,
      h: LOGO_MAX_EDGE,
    })
  })

  it('never rounds a side away to nothing', () => {
    const box = fitWithin(20000, 3)
    expect(box.w).toBe(LOGO_MAX_EDGE)
    expect(box.h).toBe(1)
  })

  it('falls back to the square box when the size is unknown', () => {
    expect(fitWithin(0, 0)).toEqual({ w: LOGO_MAX_EDGE, h: LOGO_MAX_EDGE })
  })
})

describe('saying what was done', () => {
  it('measures a data URL rather than its string length', () => {
    /* "AAAA" is three bytes of base64 */
    expect(bytesOfDataUrl('data:image/png;base64,AAAA')).toBe(3)
    expect(bytesOfDataUrl('data:image/png;base64,AAA=')).toBe(2)
    expect(bytesOfDataUrl('data:image/png;base64,AA==')).toBe(1)
  })

  it('measures an address as the address, because that IS all we store', () => {
    const url = 'https://example.test/mark.png'
    expect(bytesOfDataUrl(url)).toBe(url.length)
  })

  it('reads sizes the way a person writes them', () => {
    expect(sizeSay(512)).toBe('512 bytes')
    expect(sizeSay(96 * 1024)).toBe('96 KB')
    expect(sizeSay(12 * 1024 * 1024)).toBe('12 MB')
    expect(sizeSay(Math.round(1.5 * 1024 * 1024))).toBe('1.5 MB')
  })

  it('tells the person what happened to their file, and that it is untouched', () => {
    const said = shrinkNote(12 * 1024 * 1024, 84 * 1024, 512, 384)
    expect(said).toContain('12 MB')
    expect(said).toContain('84 KB')
    expect(said).toContain('512×384')
    expect(said).toContain('untouched')
  })
})

describe('the other door — an address', () => {
  it('keeps an http or https address, which costs nothing to store', () => {
    const read = logoFromAddress('  https://example.test/mark.png ')
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.ref.src).toBe('https://example.test/mark.png')
    /* no fetch, no size, no note — there are no pixels to bound */
    expect(read.note).toBeUndefined()
  })

  it('refuses a scheme that must never reach an img src, saying what may', () => {
    for (const bad of ['javascript:alert(1)', 'file:///c:/logo.png', 'logo.png', '']) {
      const read = logoFromAddress(bad)
      expect(read.ok).toBe(false)
      if (read.ok) return
      expect(read.why).toBe(LOGO_ADDRESS_REFUSAL)
    }
  })

  it('keeps our own pixels pasted as a data URL', () => {
    const read = logoFromAddress('data:image/png;base64,AAAA')
    expect(read.ok).toBe(true)
  })
})
