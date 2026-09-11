/* ============================================================
   THE FACES ARE READ ONCE PER CHANGE, NOT ONCE PER RENDER.

   `getComputedStyle` is a forced synchronous style read, and
   `usePaintedWidth`'s layout effect carries no dependency array — it
   cannot, because there is no painted `.tb-val` to read a face off
   until after the first paint. So it ran three `querySelector`s and
   three `getComputedStyle`s on every render of every grid, and the
   sheet draws seven of them at the band row 43 measures.

   Row 43's trace put 12.5ms of a wheel-zoom's self time in
   `paintedFont` and 27.2ms in `UpdateLayoutTree`. This is the cache
   that answers it, and what is asserted is the two halves that make
   a cache either correct or a bug:

     1 · a re-render with nothing changed asks the browser NOTHING
     2 · a RESIZE makes it ask again — the faces are viewport-scaled
         (`clamp(12.5px, 0.701rem + 0.089vw, 13.5px)`), so a cache
         that ignored width would measure a 1920px window's text
         against a 1280px face
     3 · a read taken before any cell is painted is never kept, or
         the fallback estimate would freeze in place forever

   IT IS `.tsx` FOR THE DOM, not for the markup: `getComputedStyle`
   and a live element are the whole subject, and the node project has
   neither.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useState, type ReactElement } from 'react'
import { forgetPaintedFaces, usePaintedWidth } from './nameColumnWidth'

/** A painted cell of each face, with the faces stated inline so
 *  `getComputedStyle` has something to answer with — happy-dom
 *  carries no stylesheet of ours. */
const FACE = { fontStyle: 'normal', fontWeight: 400, fontFamily: 'Inter' } as const

function Subject(): ReactElement {
  const measure = usePaintedWidth()
  const [n, setN] = useState(0)
  return (
    <div>
      <span className="tb-val" style={{ ...FACE, fontSize: '12.5px' }}>
        Highfield
      </span>
      <span className="tb-num" style={{ ...FACE, fontSize: '12px' }}>
        128,108
      </span>
      <span className="tb-date" style={{ ...FACE, fontSize: '11.5px' }}>
        2026-09-11
      </span>
      <button type="button" onClick={() => setN(n + 1)}>
        again {n}
      </button>
      <output>{measure ? measure('Highfield', 'text') : 'not yet'}</output>
    </div>
  )
}

/* THE REAL ONE, TAKEN ONCE AND AT MODULE SCOPE. Capturing it inside
   `beforeEach` captured the PREVIOUS test's spy — `vi.spyOn` is not
   restored between cases here — so the second test recursed until
   "Maximum call stack size exceeded". A counting wrapper has to know
   which function it is wrapping. */
const REAL_COMPUTED = window.getComputedStyle.bind(window)

let reads = 0
beforeEach(() => {
  forgetPaintedFaces()
  reads = 0
  vi.spyOn(window, 'getComputedStyle').mockImplementation((...args) => {
    reads += 1
    return REAL_COMPUTED(...(args as [Element]))
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reading the painted faces', () => {
  it('asks the browser at all — the hook is useless if it never reads one', () => {
    render(<Subject />)
    expect(reads).toBeGreaterThan(0)
  })

  it('ASKS NOTHING FURTHER ON A RE-RENDER WITH NOTHING CHANGED', () => {
    const { rerender } = render(<Subject />)
    const afterMount = reads
    expect(afterMount).toBeGreaterThan(0)
    for (let i = 0; i < 5; i += 1) rerender(<Subject />)
    expect(reads).toBe(afterMount)
  })

  it('ASKS AGAIN AFTER A RESIZE, because the faces are viewport-scaled', () => {
    const { rerender } = render(<Subject />)
    const afterMount = reads
    window.dispatchEvent(new Event('resize'))
    rerender(<Subject />)
    expect(reads).toBeGreaterThan(afterMount)
  })

  it('settles again after that resize rather than re-reading forever', () => {
    const { rerender } = render(<Subject />)
    window.dispatchEvent(new Event('resize'))
    rerender(<Subject />)
    const afterResize = reads
    for (let i = 0; i < 4; i += 1) rerender(<Subject />)
    expect(reads).toBe(afterResize)
  })

  /* THE HALF THAT MAKES A CACHE A BUG. Before a cell exists there is
     no face to read; caching that answer would leave every register
     measuring against the character estimate for the life of the tab. */
  it('NEVER KEEPS A READ TAKEN BEFORE A CELL WAS PAINTED', () => {
    function Bare(): ReactElement {
      const measure = usePaintedWidth()
      return <output>{measure ? 'measured' : 'not yet'}</output>
    }
    const bare = render(<Bare />)
    expect(bare.container.textContent).toBe('not yet')
    bare.unmount()

    /* the same module, now with cells on the screen */
    const withCells = render(<Subject />)
    expect(withCells.container.querySelector('output')?.textContent).not.toBe('not yet')
  })
})
