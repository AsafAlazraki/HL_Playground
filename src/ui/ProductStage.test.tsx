/* ============================================================
   PRODUCT STAGE.

   `DESIGN_SYSTEM.md` §2 makes a photographic product stage a
   REQUIREMENT of the Showroom register, not a nicety. What a DOM
   test can hold of that: the picture is there, it is described,
   the controls exist only when they have something to do, and the
   empty state is a sentence rather than a broken-looking glyph.

   The half a DOM test cannot see — `object-fit: contain`, the
   held aspect, the 260ms opacity-only crossfade — is held by
   `productstage.css`, which records the measurement that chose
   16:10 out of a library spanning 1.33 to 1.90.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductStage } from './ProductStage'

const THREE = [
  { src: '/a.webp', alt: 'Formosa GRT tiller-steer, on the water', says: 'GRT 425 — Tiller' },
  { src: '/b.webp', alt: 'Formosa SRT centre console, starboard quarter' },
  { src: '/c.webp', alt: 'Formosa centre cabin, bow on' },
]

describe('ProductStage', () => {
  it('shows the product, described as what it is', () => {
    render(<ProductStage pictures={THREE} />)
    expect(
      screen.getByRole('img', { name: 'Formosa GRT tiller-steer, on the water' }),
    ).toBeInTheDocument()
  })

  it('loads the first one eagerly — it is the subject of the screen', () => {
    render(<ProductStage pictures={THREE} />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager')
  })

  it('says which colourway is showing, when it knows', () => {
    render(<ProductStage pictures={THREE} />)
    expect(screen.getByText('GRT 425 — Tiller')).toBeInTheDocument()
  })

  describe('with more than one picture', () => {
    it('counts them', () => {
      render(<ProductStage pictures={THREE} />)
      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })

    it('moves on, and wraps round at the end', async () => {
      const onIndex = vi.fn()
      render(<ProductStage pictures={THREE} index={2} onIndex={onIndex} />)
      await userEvent.click(screen.getByRole('button', { name: 'Next picture' }))
      expect(onIndex).toHaveBeenCalledWith(0)
    })

    it('moves back, and wraps round at the start', async () => {
      const onIndex = vi.fn()
      render(<ProductStage pictures={THREE} index={0} onIndex={onIndex} />)
      await userEvent.click(screen.getByRole('button', { name: 'Previous picture' }))
      expect(onIndex).toHaveBeenCalledWith(2)
    })

    it('works on its own, before a screen wires the chips to it', async () => {
      render(<ProductStage pictures={THREE} />)
      await userEvent.click(screen.getByRole('button', { name: 'Next picture' }))
      expect(screen.getByText('2 of 3')).toBeInTheDocument()
    })
  })

  /* Two controls over a photograph with nowhere to go is furniture
     that implies there is more to see. */
  it('draws no arrows for a single picture', () => {
    render(<ProductStage pictures={[THREE[0]]} />)
    expect(screen.queryByRole('button', { name: 'Next picture' })).toBeNull()
    expect(screen.queryByText('1 of 1')).toBeNull()
  })

  describe('with nothing to show', () => {
    /* "No picture" is a fact about the price file, and the dealer
       reading it is the person who can fix it — so it reads as a
       note, not as an error the app has hit. */
    it('says why, in a sentence', () => {
      render(<ProductStage pictures={[]} />)
      expect(screen.getByText('No picture on this one yet.')).toBeInTheDocument()
    })

    it('takes a reason from the screen that knows more', () => {
      render(
        <ProductStage
          pictures={[]}
          emptyBecause="Pictures are on 18 of 39 models. This one is not among them."
        />,
      )
      expect(
        screen.getByText(/Pictures are on 18 of 39 models/),
      ).toBeInTheDocument()
    })

    it('draws no image element at all, rather than a broken one', () => {
      render(<ProductStage pictures={[]} />)
      expect(screen.queryByRole('img')).toBeNull()
    })
  })
})
