/* ============================================================
   THE SHEET'S THIRD ANSWER — CONFIG §2.4.

   §2.4's shape is three rows, not two:

       ◉ Yamaha F90XB — +$9,336 (nearest by hp)
       ○ Yamaha F115XB
       ○ Leave the motor off

   The first two were built. The third was not, and without it a
   person who has decided they do not want the thing at all has no way
   to say so on this sheet: they can only take the cheapest swap and
   then go and delete the line, which is two acts for one decision and
   leaves the undo pointing at the wrong one.

   WHAT IS ASSERTED IS THE ARITHMETIC, because that is what can be
   silently wrong. `cascade.to` is computed WITH the cheapest
   alternative already in it, so "leave it off" has to subtract that
   amount rather than add zero — a footer that prices the wrong
   decision is worse than one that prices none.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CascadeSheet } from './CascadeSheet'
import type { Cascade } from './cascade'

function sheet(over: Partial<Cascade> = {}): Cascade {
  return {
    id: 'c1',
    title: 'This takes a line off',
    subtitle: 'The committed total does not move until you accept.',
    asked: { label: 'Zeta 400 hull', amount: 1000 },
    added: [],
    removed: [
      { id: 'l1', label: 'Zeta Trailer', amount: 4000, standard: false, because: 'built for another' },
    ],
    unchecked: [],
    alternatives: [
      { id: 't:a', label: 'Zeta Trailer B', amount: 5000, note: 'nearest by load' },
      { id: 't:b', label: 'Zeta Trailer C', amount: 7000, note: 'next up' },
    ],
    from: 10_000,
    /* committed, minus the removed 4,000, plus the cheapest 5,000 */
    to: 11_000,
    delta: 1_000,
    accept: 'Swap in Zeta Trailer B',
    ...over,
  }
}

const alts = (): HTMLElement =>
  screen.getByRole('radiogroup', { name: 'What to put on instead' })

describe('the three answers', () => {
  it('OFFERS LEAVING IT OFF BESIDE THE PRICED FIXES, in the same radio group', () => {
    render(<CascadeSheet cascade={sheet()} still onAccept={() => {}} onCancel={() => {}} />)
    const rows = within(alts()).getAllByRole('radio')
    expect(rows).toHaveLength(3)
    expect(rows.at(-1)?.textContent).toMatch(/Leave it off/)
  })

  it('pre-selects the cheapest, not the nothing', () => {
    render(<CascadeSheet cascade={sheet()} still onAccept={() => {}} onCancel={() => {}} />)
    const rows = within(alts()).getAllByRole('radio')
    expect(rows[0]).toHaveAttribute('aria-checked', 'true')
    expect(rows.at(-1)).toHaveAttribute('aria-checked', 'false')
  })

  it('PRICES THE DECISION IN FRONT OF THE PERSON, subtracting the cheapest it had assumed', () => {
    render(<CascadeSheet cascade={sheet()} still onAccept={() => {}} onCancel={() => {}} />)
    /* opens on the cheapest: 10,000 → 11,000, so +1,000 */
    expect(screen.getByText(/\+\$1,000/)).toBeInTheDocument()

    const rows = within(alts()).getAllByRole('radio')
    const off = rows.at(-1)
    if (!off) throw new Error('no leave-it-off row')
    fireEvent.pointerDown(off)

    /* leaving it off: the 5,000 swap comes back out, so 10,000 →
       6,000 against a committed 10,000 — a four thousand saving, not
       a thousand-pound cost */
    /* A TRUE MINUS SIGN, not a hyphen. `Intl.NumberFormat` writes
       U+2212 and the first draft of this test looked for U+002D — the
       code was right and the assertion was wrong, which is worth a
       character class rather than a quieter matcher. */
    expect(screen.getByText(/[-−]\$4,000/)).toBeInTheDocument()
  })

  it('hands the surface a null rather than a made-up id', () => {
    const onAccept = vi.fn()
    render(<CascadeSheet cascade={sheet()} still onAccept={onAccept} onCancel={() => {}} />)
    const rows = within(alts()).getAllByRole('radio')
    const last = rows.at(-1)
    if (!last) throw new Error('no leave-it-off row')
    fireEvent.pointerDown(last)
    screen.getByRole('button', { name: /Swap in/ }).click()
    expect(onAccept).toHaveBeenCalledWith(null)
  })

  it('draws no group at all where nothing fits, rather than a lone "leave it off"', () => {
    /* a sheet with no alternatives has nothing to choose between —
       the decision is accept or cancel, and a radio group of one
       would be a control that cannot be answered two ways */
    render(
      <CascadeSheet
        cascade={sheet({ alternatives: [], accept: 'Take them off' })}
        still
        onAccept={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })
})
