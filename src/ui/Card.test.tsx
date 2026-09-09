/* ============================================================
   CARD — the surface, and the one decision it makes for you.

   THE FAILURE THIS FILE GUARDS is a div with an onClick. It looks
   exactly right on screen and has no role, no tab stop, no Enter,
   no Space and no focus ring, and no rendering test that only
   asserts "the click handler fired" would notice — a click
   handler on a div fires perfectly well. So the assertions below
   press the card the way a keyboard user does, which is the only
   way the difference shows up.

   THE ONE ATTRIBUTE SELECTED ON IS `data-kind`, and it is a
   contract rather than decoration: ds.css:2163 resolves
   `[data-kind='boat']` to `--kind`, and card.css mixes that hue
   into the card's ground at 6%. Rename the attribute and the card
   silently loses its kind while every class still matches. This
   is the same reason tiles.test.tsx selects on `data-dsh-tile`.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from './Card'

describe('Card', () => {
  it('is a plain surface when nothing can be done to it', () => {
    render(<Card>Highfield Inflatables</Card>)

    expect(screen.getByText('Highfield Inflatables')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  describe('when the whole card activates', () => {
    it('is a real button, not a div that happens to listen', async () => {
      const onActivate = vi.fn()
      render(<Card onActivate={onActivate}>Open the register</Card>)

      await userEvent.click(screen.getByRole('button', { name: 'Open the register' }))

      expect(onActivate).toHaveBeenCalledTimes(1)
    })

    /* Enter and Space are what a div with an onClick does not
       give you, and they are how half the people using this app
       will open a card. */
    it('opens on Enter from the keyboard', async () => {
      const onActivate = vi.fn()
      render(<Card onActivate={onActivate}>Open the register</Card>)

      await userEvent.tab()
      expect(screen.getByRole('button', { name: 'Open the register' })).toHaveFocus()

      await userEvent.keyboard('{Enter}')

      expect(onActivate).toHaveBeenCalledTimes(1)
    })

    it('opens on Space from the keyboard', async () => {
      const onActivate = vi.fn()
      render(<Card onActivate={onActivate}>Open the register</Card>)

      await userEvent.tab()
      await userEvent.keyboard(' ')

      expect(onActivate).toHaveBeenCalledTimes(1)
    })

    /* A tile whose visible text is a figure has no readable name
       of its own; the label is how it gets one. */
    it('takes a name of its own when its content is not one', () => {
      render(
        <Card onActivate={() => {}} label="Open Boats">
          40
        </Card>,
      )
      expect(screen.getByRole('button', { name: 'Open Boats' })).toBeInTheDocument()
    })
  })

  /* Drawn from aria-current rather than a class, so the look and
     the announcement cannot drift apart — there is no way to draw
     a selected card without also announcing it. */
  it('announces the current one of a set', () => {
    render(
      <Card onActivate={() => {}} current>
        Boats
      </Card>,
    )
    expect(screen.getByRole('button', { name: 'Boats' })).toHaveAttribute('aria-current', 'true')
  })

  it('says nothing about currency when it is not current', () => {
    render(<Card onActivate={() => {}}>Boats</Card>)
    expect(screen.getByRole('button', { name: 'Boats' })).not.toHaveAttribute('aria-current')
  })

  it('hands its kind to the mechanism ds.css already resolves', () => {
    render(<Card kind="boat">Highfield 660</Card>)
    expect(screen.getByText('Highfield 660')).toHaveAttribute('data-kind', 'boat')
  })
})
