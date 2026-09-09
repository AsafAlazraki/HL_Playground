/* ============================================================
   BUTTON — what a person actually gets off this control.

   EVERY QUERY IS BY ROLE OR BY TEXT. Nothing here reads a class
   name: `ui-btn--primary` can be renamed in an afternoon and the
   screen is still right, while a button that has lost its
   accessible name is broken and every class still matches. The
   two attribute assertions are `type` and `aria-disabled`, and
   both are contracts rather than decoration — `type` is what
   stops a button submitting the form around it, and
   `aria-disabled` is what button.css styles the refused state
   from, so renaming it would silently unstyle the state as well
   as un-announce it.

   THE REFUSAL TESTS ARE THE POINT OF THE FILE. DESIGN_PRINCIPLES
   rule 10 — "a thing that cannot be done says why, where it is" —
   is the rule a component layer can actually enforce, and the
   enforcement is that a refused Button stays reachable. A
   `disabled` button cannot be focused, is skipped by a screen
   reader, and takes its explanation with it. These assert the
   opposite: focusable, announced, described, and inert.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('is a button a person can name and press', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Start the quote</Button>)

    const button = screen.getByRole('button', { name: 'Start the quote' })
    await userEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  /* A <button> with no type submits the form it is inside. That is
     the single most common silent bug in this whole category, and
     the reason the default lives here rather than at 278 call
     sites. */
  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('lets a caller ask for a submit button explicitly', () => {
    render(<Button type="submit">Send</Button>)
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit')
  })

  /* The glyph is decoration beside a word that already says the
     thing. If it reached the accessible name, a screen reader
     would read the icon's alt text into the middle of the label. */
  it('keeps a glyph out of the accessible name', () => {
    render(<Button glyph={<span>plus</span>}>Add a boat</Button>)
    expect(screen.getByRole('button', { name: 'Add a boat' })).toBeInTheDocument()
  })

  describe('when it is refused', () => {
    const reason = 'Nothing on this table is marked as a price.'

    it('says why, in the document, beside the control', () => {
      render(
        <Button tone="primary" refusedBecause={reason}>
          Start the quote
        </Button>,
      )
      expect(screen.getByText(reason)).toBeInTheDocument()
    })

    it('announces the refusal and hands the reason to the control', () => {
      render(
        <Button tone="primary" refusedBecause={reason}>
          Start the quote
        </Button>,
      )
      const button = screen.getByRole('button', { name: 'Start the quote' })
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).toHaveAccessibleDescription(reason)
    })

    /* The whole argument for aria-disabled over disabled. A
       disabled control is out of the tab order, so the person who
       most needs the sentence is the one who can never reach it. */
    it('stays focusable, so the reason is reachable by keyboard', async () => {
      render(<Button refusedBecause={reason}>Start the quote</Button>)
      const button = screen.getByRole('button', { name: 'Start the quote' })

      await userEvent.tab()

      expect(button).toHaveFocus()
    })

    it('does not act when pressed', async () => {
      const onClick = vi.fn()
      render(
        <Button onClick={onClick} refusedBecause={reason}>
          Start the quote
        </Button>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Start the quote' }))

      expect(onClick).not.toHaveBeenCalled()
    })

    /* A refused control often also carries a hint. Replacing the
       caller's describedby instead of joining it would drop one of
       the two, and only a screen reader would ever show it. */
    it('joins the reason to a description the caller already set', () => {
      render(
        <>
          <span id="own-hint">Drafts are kept for 30 days.</span>
          <Button aria-describedby="own-hint" refusedBecause={reason}>
            Start the quote
          </Button>
        </>,
      )
      expect(screen.getByRole('button', { name: 'Start the quote' })).toHaveAccessibleDescription(
        `Drafts are kept for 30 days. ${reason}`,
      )
    })
  })

  it('acts normally again when the reason goes away', async () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <Button onClick={onClick} refusedBecause="Pick a table first.">
        Start the quote
      </Button>,
    )
    rerender(<Button onClick={onClick}>Start the quote</Button>)

    const button = screen.getByRole('button', { name: 'Start the quote' })
    await userEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(screen.queryByText('Pick a table first.')).not.toBeInTheDocument()
  })
})
