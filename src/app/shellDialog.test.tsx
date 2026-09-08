/* ============================================================
   THE SAVED-CONFIGURATIONS SHEET, DRIVEN.

   It declared `role="dialog" aria-modal="true"` and trapped nothing:
   the only thing it owned was Escape. "It is modal" is exactly the
   kind of claim that can only be checked by pressing keys at it, so
   this mounts the whole shell and presses them.

   THE ADMIN DOOR IS THE WAY IN HERE, not the rail's person chip, and
   the choice is the point rather than convenience: the door
   (AdminStage.tsx:339) stays mounted underneath the sheet, so it is
   still there to give the focus back to. The chip's menu item is not,
   and there is no test here pretending otherwise — the note on the
   restore in Shell.tsx names WhoChip.tsx:160-161 as the cause and
   says why the fix belongs there rather than here.

   It doubles as the only end-to-end evidence for stageEntry.ts: this
   is a real stage, opened by a real door, inside the real shell.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Shell } from './Shell'
import { useProjectStore } from '@/store/useProjectStore'
import type { AppUser } from '@/features/auth'

const user: AppUser = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@northside.example',
  title: 'Sales',
  orgSlug: 'northside',
  orgName: 'Northside',
  /* the rung that draws the Admin door at all — see session.ts */
  role: 'super-admin',
}

/** The shell, with a business named so the onboarding gate is past. */
function open(): void {
  useProjectStore.getState().setOrganisation('Northside', 'marine')
  render(<Shell user={user} onSignOut={() => {}} />)
}

/** Straight to Admin, which is the page the sheet is opened over. */
function openAdmin(): HTMLElement {
  open()
  fireEvent.click(screen.getByRole('button', { name: 'Admin' }))
  return screen.getByRole('region', { name: 'Admin' })
}

function openSheet(): { door: HTMLElement; sheet: HTMLElement } {
  openAdmin()
  const door = screen.getByRole('button', { name: 'Saved configurations' })
  door.focus()
  fireEvent.click(door)
  return { door, sheet: screen.getByRole('dialog', { name: 'Saved configurations' }) }
}

/** What Tab can stop on inside the sheet, in document order.
 *
 *  THE COUNT IS ASSERTED, and it is not ceremony: at ONE control the
 *  first and the last are the same node, and every wrap test below
 *  would pass with no trap at all. Measured today: three — Close, the
 *  name field, and "Save this sheet". */
function focusables(sheet: HTMLElement): HTMLElement[] {
  const items = [
    ...sheet.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]'),
  ]
  expect(items.length).toBeGreaterThan(1)
  return items
}

describe('a stage opened from a real door', () => {
  it('takes the focus and names itself', () => {
    const page = openAdmin()
    expect(page).toHaveFocus()
    expect(page).toHaveAccessibleName('Admin')
  })
})

describe('the saved-configurations sheet', () => {
  it('takes the focus when it opens, and announces which dialog it is', () => {
    const { sheet } = openSheet()
    expect(sheet).toHaveFocus()
    expect(sheet).toHaveAccessibleName('Saved configurations')
  })

  it('keeps Tab inside itself — forwards off the last control', () => {
    const { sheet } = openSheet()
    const items = focusables(sheet)
    const last = items[items.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(items[0])
  })

  it('keeps Tab inside itself — backwards off the first control', () => {
    const { sheet } = openSheet()
    const items = focusables(sheet)
    const first = items[0]
    first.focus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(items[items.length - 1])
  })

  it('keeps Shift+Tab inside itself from the dialog box, which is where it lands', () => {
    /* THE CASE ConfirmSheet's WRAP DOES NOT COVER, and the reason
       this sheet needed a line of its own: the focus starts on the
       BOX, not on a control, and a plain Shift+Tab from a container
       walks out of the top of the dialog into the page it is
       covering. */
    const { sheet } = openSheet()
    const items = focusables(sheet)
    expect(sheet).toHaveFocus()
    fireEvent.keyDown(sheet, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(items[items.length - 1])
  })

  it('shuts on Escape and leaves the page underneath open', () => {
    const { sheet } = openSheet()
    fireEvent.keyDown(sheet, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Saved configurations' })).toBeNull()
    /* the stage binds Escape to its own way out (AdminStage.tsx:202);
       one press must not both shut a dialog and leave the page */
    expect(screen.getByRole('region', { name: 'Admin' })).toBeInTheDocument()
  })

  it('hands the focus back to the control that opened it', () => {
    const { door, sheet } = openSheet()
    fireEvent.keyDown(sheet, { key: 'Escape' })
    expect(door).toHaveFocus()
  })

  it('hands the focus back when it is shut with its own close button', () => {
    const { door } = openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(door).toHaveFocus()
  })
})
