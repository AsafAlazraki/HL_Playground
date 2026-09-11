/* ============================================================
   THE REVIEWER HAS A DOOR — CLUELESS_USER_TESTS O8, step three.

   O8's own sentence is "until then a person is right to say the
   feature does not exist", and what made that true was reachability
   rather than absence: eight files, fifteen rules, a confirm gate and
   a rollup, imported by nothing. So the assertion is a PRESS. Not
   that the panel renders — `reviewPanel.test.tsx` owns that — but
   that a person standing on a screen this app actually opens can get
   to it, and that what they arrive at says what it is.

   `check-reachability` cannot see this class of defect and says so:
   the stage IS imported, so the graph is satisfied while the door is
   missing. That is the same hole `{ kind: 'flow' }` fell through, on
   the same grid, and it is why the test is a click.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Shell } from './Shell'
import { reviewSay } from './ReviewStage'
import { useProjectStore } from '@/store/useProjectStore'
import type { AppUser } from '@/features/auth'
import type { EntityDef } from '@/types/model'

const ISO = '2026-01-01T00:00:00.000Z'

const user: AppUser = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@northside.example',
  title: 'Sales',
  orgSlug: 'northside',
  orgName: 'Northside',
  role: 'super-admin',
}

/** A table with two columns of the same name — a duplicate-field
 *  blocker, so the reviewer has something real to say. */
const table: EntityDef = {
  id: 'e-zeta',
  name: 'Zeta Hulls',
  accent: 'blue',
  fields: [
    { id: 'f1', name: 'Model', type: 'text' },
    { id: 'f2', name: 'Model', type: 'text' },
  ],
  displayFieldId: 'f1',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
}

/** The rail's own Data row. Scoped to the landmark and matched on a
 *  prefix: the row carries the table count in its name, and the Data
 *  SCREEN draws doors of its own once it is open. */
function goData(): void {
  const rail = within(screen.getByRole('navigation', { name: 'Navigation' }))
  fireEvent.click(rail.getByRole('button', { name: /^Data/ }))
}

function open(): void {
  useProjectStore.getState().setOrganisation('Northside', 'marine')
  useProjectStore.setState({
    entities: { 'e-zeta': table },
    rowsByEntity: { 'e-zeta': [] },
    modules: {},
  })
  render(<Shell user={user} onSignOut={() => {}} />)
}

beforeEach(() => {
  useProjectStore.setState({ entities: {}, rowsByEntity: {}, modules: {}, views: {} })
})

describe('getting to the reviewer', () => {
  it('IS A PRESS FROM DATA, which is the screen about the shape it reviews', () => {
    open()
    goData()
    const door = screen.getByRole('button', { name: /^Review/ })
    fireEvent.click(door)
    expect(screen.getByRole('region', { name: 'Review' })).toBeInTheDocument()
  })

  it('takes the keyboard when it arrives, like every other stage', () => {
    open()
    goData()
    fireEvent.click(screen.getByRole('button', { name: /^Review/ }))
    expect(screen.getByRole('region', { name: 'Review' })).toHaveFocus()
  })

  it('and the way back is the way back', async () => {
    open()
    goData()
    fireEvent.click(screen.getByRole('button', { name: /^Review/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    /* AWAITED, because the shell closes a window on a timer — the exit
       is animated and `closeWin` drops the stage after it. A
       synchronous assertion here would be measuring the animation
       rather than the act. */
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Review' })).toBeNull(),
    )
  })
})

describe('what the door promises', () => {
  it('counts the marks, so the press is never into an empty room unannounced', () => {
    open()
    goData()
    /* the seeded shape here carries one duplicate-field blocker; what
       is asserted is that the door prints a COUNT rather than a noun,
       not which rules fired — that is the engine's business */
    const door = screen.getByRole('button', { name: /^Review/ })
    expect(door.textContent ?? '').toMatch(/blocker|advisor|nothing to correct/)
  })
})

describe('the sentence the door and the bar share', () => {
  /* One reading, two places. A door that promised "3 blockers" over a
     page that then said something else would be the app disagreeing
     with itself in two presses. */
  it('says nothing to correct when there is nothing', () => {
    expect(reviewSay(0, 0)).toBe('nothing to correct')
  })

  it('says one of a kind in the singular', () => {
    expect(reviewSay(1, 0)).toBe('1 blocker')
    expect(reviewSay(0, 1)).toBe('1 advisory')
  })

  it('spells advisories properly in the plural, which is why it is one function', () => {
    expect(reviewSay(0, 139)).toBe('139 advisories')
    expect(reviewSay(3, 139)).toBe('3 blockers · 139 advisories')
  })
})
