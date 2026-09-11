/* ============================================================
   THE EMPTY REGISTER OFFERS THE ACT IT NAMES.

   UX_PASS §3 calls paste-with-header-mapping "the front door to the
   product". The door was built — `PasteRows`, `pasteBlock.ts`, four
   steps and one undoable commit — and the one screen that stands
   between a dealer and an empty price file went on saying "or paste a
   block straight from Excel to fill the whole table at once" under a
   single button that adds ONE row by hand.

   WHAT IS ASSERTED IS THE DECISION, not the layout: that a plate
   which names an act offers it, that the act is the primary one
   because filling a register beats starting it, and that a host with
   no paste door loses the CLAUSE as well as the button rather than
   keeping a promise nothing can answer.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoRowsPlate } from './EmptyPlates'

describe('a register with its columns ready and nothing in it', () => {
  it('OFFERS THE PASTE IT NAMES, rather than sending a person to look for it', () => {
    const onPaste = vi.fn()
    render(<NoRowsPlate entityName="Highfield" onAddRow={() => {}} onPaste={onPaste} />)
    const act = screen.getByRole('button', { name: 'Paste rows' })
    act.click()
    expect(onPaste).toHaveBeenCalledTimes(1)
  })

  it('still offers the one row by hand, because starting a table is a real act too', () => {
    const onAddRow = vi.fn()
    render(<NoRowsPlate entityName="Highfield" onAddRow={onAddRow} onPaste={() => {}} />)
    screen.getByRole('button', { name: /Add first row/ }).click()
    expect(onAddRow).toHaveBeenCalledTimes(1)
  })

  it('puts the block first, because that is what somebody on an empty price file means', () => {
    render(<NoRowsPlate entityName="Highfield" onAddRow={() => {}} onPaste={() => {}} />)
    const acts = screen.getAllByRole('button').map((b) => (b.textContent ?? '').trim())
    expect(acts[0]).toBe('Paste rows')
  })

  it('SAYS NOTHING ABOUT PASTING WHERE THERE IS NO DOOR, which is the same rule the other way round', () => {
    render(<NoRowsPlate entityName="Highfield" onAddRow={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Paste rows' })).toBeNull()
    expect(screen.queryByText(/paste/i)).toBeNull()
    /* and the one act it does have is the primary one */
    expect(screen.getByRole('button', { name: /Add first row/ })).toBeInTheDocument()
  })
})
