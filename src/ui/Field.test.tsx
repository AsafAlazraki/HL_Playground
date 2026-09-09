/* ============================================================
   FIELD — a labelled control, and the sentence when it refuses.

   `getByLabelText` IS THE WHOLE FIRST TEST, and it is not a
   convenience. It resolves the control through the same
   label/for/id path a screen reader walks, so it passes only if
   the wiring is real. A test that reached for the input by class
   would pass just as happily with the label pointing at nothing —
   which is the actual failure mode, because a detached label
   looks completely correct on screen.

   ELEVEN OF THE 33 INPUT TREATMENTS IN THIS REPO HAVE NO `:focus`
   RULE AT ALL. That half of the problem lives in field.css and
   cannot be asserted here; what can be asserted is the half a
   rendering test owns — that the label, the hint and the refusal
   are attached to the control rather than merely near it.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field } from './Field'

describe('Field', () => {
  it('is reachable by its label, the way a screen reader reaches it', () => {
    render(<Field label="Retail price" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Retail price')).toBeInTheDocument()
  })

  /* One character, deliberately. The field is controlled and this
     test holds `value` at "", so React resets the input after each
     keystroke and the SECOND character would arrive alone — an
     assertion about the third call would be asserting React's
     controlled-input reset, not this component. */
  it('reports what a person typed, as a string', async () => {
    const onChange = vi.fn()
    render(<Field label="Customer" value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Customer'), 'A')

    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('attaches a hint to the control rather than leaving it nearby', () => {
    render(
      <Field
        label="Retail price"
        value=""
        onChange={() => {}}
        hint="Leave it empty to use the list price."
      />,
    )
    expect(screen.getByLabelText('Retail price')).toHaveAccessibleDescription(
      'Leave it empty to use the list price.',
    )
  })

  describe('when the value is refused', () => {
    const reason = 'A price cannot be lower than the trade price.'

    it('says why, attached to the field it is about', () => {
      render(
        <Field label="Retail price" value="10" onChange={() => {}} refusedBecause={reason} />,
      )

      const input = screen.getByLabelText('Retail price')
      expect(input).toHaveAccessibleDescription(reason)
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    /* One note line, never two. If the refusal stacked under the
       hint, the place a person looks for the answer would move
       between states. */
    it('replaces the hint rather than stacking under it', () => {
      render(
        <Field
          label="Retail price"
          value="10"
          onChange={() => {}}
          hint="Leave it empty to use the list price."
          refusedBecause={reason}
        />,
      )

      expect(screen.getByText(reason)).toBeInTheDocument()
      expect(screen.queryByText('Leave it empty to use the list price.')).not.toBeInTheDocument()
    })

    it('clears the refusal when the value becomes acceptable', () => {
      const { rerender } = render(
        <Field label="Retail price" value="10" onChange={() => {}} refusedBecause={reason} />,
      )
      rerender(<Field label="Retail price" value="9000" onChange={() => {}} />)

      const input = screen.getByLabelText('Retail price')
      expect(input).not.toHaveAttribute('aria-invalid')
      expect(screen.queryByText(reason)).not.toBeInTheDocument()
    })
  })

  it('is still typeable and still labelled when it is a figure', async () => {
    const onChange = vi.fn()
    render(
      <Field
        label="Trade price"
        value=""
        onChange={onChange}
        mono
        inputMode="decimal"
        placeholder="0.00"
      />,
    )

    const input = screen.getByLabelText('Trade price')
    expect(input).toHaveAttribute('inputmode', 'decimal')

    await userEvent.type(input, '9')

    expect(onChange).toHaveBeenLastCalledWith('9')
  })

  it('does not offer to be typed in when it is read-only', () => {
    render(<Field label="Model code" value="HS660" onChange={() => {}} readOnly />)
    expect(screen.getByLabelText('Model code')).toHaveAttribute('readonly')
  })
})
