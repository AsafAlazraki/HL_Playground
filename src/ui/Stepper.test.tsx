/* ============================================================
   STEPPER — where you are in a build, and how to get back.

   THREE OF THESE ASSERT DECISIONS RATHER THAN BEHAVIOUR, and each
   one is a place this project or the app it is replacing already
   went wrong:

   · THE RAIL IS NAVIGABLE. `hl-journeys.md` Q1 records production's
     stepper as display-only — "to change the hull colour from the
     Summary you press Back six times". A rail you cannot press is
     a progress bar wearing a map's clothes.

   · A REFUSED STEP STAYS FOCUSABLE AND SAYS WHY. `aria-disabled`,
     never `disabled`: a disabled control is skipped by a screen
     reader, so the one person who needs the reason is the one
     person who cannot reach it. DESIGN_SYSTEM §7.

   · THE RAIL NEVER CLAIMS PROGRESS PAST WHERE THE PERSON IS. The
     run between two steps lights when the step behind it is DONE,
     not when it is current — the first draft lit it on `current`
     and drew a finished line to a step nobody had opened.

   Queried by role and by text, never by class: a test that asserts
   on a class fails when the class is renamed and passes when the
   screen is broken.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Stepper, type Step } from './Stepper'

const STEPS: Step[] = [
  { id: 'hull', name: 'The hull', chose: 'Sport SP560 — Light Grey / White' },
  { id: 'motor', name: 'Motor', chose: 'Yamaha F90XB' },
  { id: 'trailer', name: 'Trailer' },
  {
    id: 'summary',
    name: 'Summary',
    refusedBecause: 'Nothing is addressed yet. Name a customer on Administration first.',
  },
]

const draw = (over: Partial<Parameters<typeof Stepper>[0]> = {}) => {
  const onGo = vi.fn()
  render(
    <Stepper steps={STEPS} currentId="motor" doneIds={['hull']} onGo={onGo} {...over} />,
  )
  return { onGo }
}

describe('Stepper', () => {
  it('says where you are, as a count and as a name', () => {
    draw()
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
  })

  it('names the current step to a screen reader', () => {
    draw()
    expect(screen.getByRole('button', { current: 'step' })).toHaveAccessibleName(
      /Motor/,
    )
  })

  /* THE HALF THE ORIGINAL LEAVES OUT. A rail that prints only stage
     names teaches the order of the form; one that prints the
     answers shows the shape of the deal. */
  it('shows what was chosen, not only the stage name', () => {
    draw()
    expect(screen.getByText('Sport SP560 — Light Grey / White')).toBeInTheDocument()
    expect(screen.getByText('Yamaha F90XB')).toBeInTheDocument()
  })

  it('goes back to an answered step when it is pressed', async () => {
    const { onGo } = draw()
    await userEvent.click(screen.getByRole('button', { name: /The hull/ }))
    expect(onGo).toHaveBeenCalledWith('hull')
  })

  describe('a step that cannot be reached', () => {
    it('says WHY, in the place it is refused', () => {
      draw()
      expect(
        screen.getByText(/Name a customer on Administration first/),
      ).toBeInTheDocument()
    })

    it('stays focusable, and is marked aria-disabled rather than disabled', () => {
      draw()
      const summary = screen.getByRole('button', { name: /Summary/ })
      expect(summary).toHaveAttribute('aria-disabled', 'true')
      /* The DOM property, not the attribute: a truly disabled
         button is unreachable, which is the failure this avoids. */
      expect(summary).not.toBeDisabled()
    })

    it('points at its reason, so the refusal is read with the control', () => {
      draw()
      const summary = screen.getByRole('button', { name: /Summary/ })
      const id = summary.getAttribute('aria-describedby')
      expect(id).toBeTruthy()
      expect(document.getElementById(id!)).toHaveTextContent(
        /Name a customer on Administration first/,
      )
    })

    it('does not go there when pressed', async () => {
      const { onGo } = draw()
      await userEvent.click(screen.getByRole('button', { name: /Summary/ }))
      expect(onGo).not.toHaveBeenCalled()
    })
  })

  /* NOTHING TRUNCATES MID-WORD — the half of the rule that lives in
     the DOM. The CSS holds the other half by having no
     `overflow-wrap: break-word`, which the first draft of
     stepper.css did carry, and which rendered "Administration" as
     "Administrati / on" at 1440. */
  it('keeps a long single word whole in the DOM', () => {
    const onGo = vi.fn()
    render(
      <Stepper
        steps={[
          { id: 'a', name: 'Administration' },
          { id: 'b', name: 'Summary' },
        ]}
        currentId="a"
        onGo={onGo}
      />,
    )
    /* `exact: true`: if anything had split the word — a <wbr>, a
       soft hyphen, a zero-width space — neither query would find
       it. Two matches is correct and asserted as two: the rail
       prints the current step's name in its count line as well as
       on the step. The rendered line break that broke this rule
       was CSS, which a DOM test cannot see, so the stylesheet
       holds its half by having no `overflow-wrap: break-word`. */
    const whole = screen.getAllByText('Administration', { exact: true })
    expect(whole).toHaveLength(2)
    for (const node of whole) expect(node).toBeInTheDocument()
  })

  it('is a labelled landmark, so it can be jumped to', () => {
    draw({ label: 'Build steps' })
    expect(screen.getByRole('navigation', { name: 'Build steps' })).toBeInTheDocument()
  })
})
