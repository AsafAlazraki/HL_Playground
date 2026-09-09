/* ============================================================
   SECTION HEAD — the one uppercase style.

   THE FIRST TEST IS RULE 3, AND IT IS THE REASON THIS FILE
   EXISTS. "Uppercase is a label style, never a name style.
   Uppercasing content is LOSSY — a proper noun loses its
   word-shape, and `PVC` uppercased cannot be told from a value
   the dealer actually typed as `Pvc`."

   The safe way to draw an uppercase caption is `text-transform`
   in CSS, which leaves the real string in the DOM. The unsafe way
   is `.toUpperCase()` in the component, which destroys it. Both
   look identical on screen and only one survives a screen reader
   or a copy-paste. `getByRole('heading', { name: 'Hull only
   pricing' })` passes for the first and fails for the second, so
   this assertion is the difference between them.

   105 classes in the app draw this style today, with 11 distinct
   font-sizes and 16 distinct letter-spacings between them, for a
   step the system defines exactly once as `--t-label-*`.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'
import { SectionHead } from './SectionHead'

describe('SectionHead', () => {
  /* If this ever fails, someone has moved the uppercase from CSS
     into JavaScript and the caption's real text is gone. */
  it('keeps the caption in its own case, because uppercasing is lossy', () => {
    render(<SectionHead>Hull only pricing</SectionHead>)
    expect(screen.getByRole('heading', { name: 'Hull only pricing' })).toBeInTheDocument()
  })

  it('is a heading a person can navigate the screen by', () => {
    render(<SectionHead level="h2">Pricing</SectionHead>)
    expect(screen.getByRole('heading', { level: 2, name: 'Pricing' })).toBeInTheDocument()
  })

  it('defaults to h3, the level a section under a stage title takes', () => {
    render(<SectionHead>Pricing</SectionHead>)
    expect(screen.getByRole('heading', { level: 3, name: 'Pricing' })).toBeInTheDocument()
  })

  /* A group caption inside a card that already has a heading is
     genuinely not a heading in the document outline, and claiming
     it is one makes the outline worse, not better. */
  it('can decline to be a heading when it is not one', () => {
    render(<SectionHead level="none">Pricing</SectionHead>)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('Pricing')).toBeInTheDocument()
  })

  /* §6: the dealer's nouns. "40 boats", not "40 ROWS" — and the
     count is drawn as a value, so it is not uppercased either. */
  it('draws the count in the words the caller chose', () => {
    render(<SectionHead count="40 boats in 3 series">Boats</SectionHead>)
    expect(screen.getByText('40 boats in 3 series')).toBeInTheDocument()
  })

  it('carries the controls that belong to the section', () => {
    render(
      <SectionHead action={<Button size="sm">Add a boat</Button>} rule>
        Boats
      </SectionHead>,
    )
    expect(screen.getByRole('button', { name: 'Add a boat' })).toBeInTheDocument()
  })

  /* The hairline is paint. If it reached the accessible tree it
     would put an empty node between the caption and the control. */
  it('keeps the hairline out of the caption name', () => {
    render(
      <SectionHead rule level="h2">
        Boats
      </SectionHead>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Boats' })).toBeInTheDocument()
  })
})
