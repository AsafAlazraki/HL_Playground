/* ============================================================
   ROW — a line in a list.

   TWO OF THESE ASSERT RULES RATHER THAN BEHAVIOUR, and both are
   rules this repo has already broken once:

   §3 — "nothing truncates mid-word. If a name does not fit it
   wraps or clamps to two lines WITH THE FULL TEXT STILL IN THE
   DOM." The visual QA of 2026-09-09 found the app's only mid-word
   truncation on a row exactly like this one, cutting "Asaf
   Alazraki" into "Alazr | aki". A rendering test cannot measure a
   box, but it can assert the half of that rule that lives in the
   DOM: the whole string is present. row.css holds the other half
   with a `min-height` and no `text-overflow` anywhere in the file.

   The nested-button rule is asserted by the TYPE, at the bottom
   of this file, because that is where it can be asserted
   completely — a runtime test could only catch the combination
   someone wrote, and the type catches the ones nobody has written
   yet.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Row } from './Row'

describe('Row', () => {
  it('draws the name it is scanned for and the metadata beside it', () => {
    render(<Row name="Highfield Sport 660" meta="4 in stock" />)

    expect(screen.getByText('Highfield Sport 660')).toBeInTheDocument()
    expect(screen.getByText('4 in stock')).toBeInTheDocument()
  })

  it('is a plain line when nothing can be done to it', () => {
    render(<Row name="Highfield Sport 660" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  describe('when the whole row activates', () => {
    it('is a real button, so a pointer and a keyboard both reach it', async () => {
      const onActivate = vi.fn()
      render(<Row name="Highfield Sport 660" onActivate={onActivate} />)

      await userEvent.click(screen.getByRole('button', { name: /Highfield Sport 660/ }))
      await userEvent.keyboard('{Enter}')

      expect(onActivate).toHaveBeenCalledTimes(2)
    })

    it('announces the current one of a set', () => {
      render(<Row name="Highfield Sport 660" onActivate={() => {}} current />)
      expect(screen.getByRole('button', { name: /Highfield Sport 660/ })).toHaveAttribute(
        'aria-current',
        'true',
      )
    })
  })

  it('puts controls at the end of a line that is not itself a target', async () => {
    const onRemove = vi.fn()
    render(
      <Row
        name="Highfield Sport 660"
        trail={
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        }
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  /* §3, the half of it that lives in the DOM. A proper noun is the
     one kind of string a truncation cannot be read through, so the
     assertion uses one. */
  it('keeps a long name whole in the DOM', () => {
    const name = 'Haines Signature 675 Continental Bowrider, Asaf Alazraki'
    render(<Row name={name} dense />)

    expect(screen.getByText(name)).toBeInTheDocument()
  })

  /* A button inside a button is invalid HTML and the inner control
     is unreachable in some screen readers. The props are a union so
     the combination does not compile; `@ts-expect-error` fails the
     typecheck if that ever stops being true, which makes this the
     rare test that gets stronger by never running. */
  it('will not let a caller put controls inside an activating row', () => {
    const invalid = (
      // @ts-expect-error trail and onActivate together would nest a button in a button
      <Row name="Highfield Sport 660" onActivate={() => {}} trail={<button type="button">X</button>} />
    )

    expect(invalid).toBeTruthy()
  })
})
