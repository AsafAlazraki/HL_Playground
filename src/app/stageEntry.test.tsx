/* ============================================================
   WHERE THE KEYBOARD LANDS WHEN A PAGE OPENS.

   Every claim in stageEntry.ts's header is a claim about focus, and
   focus is the one thing that cannot be read off the source: it is
   a property of a live document. So these render.

   The hook is exercised through a two-line harness rather than
   through the ten stages, because nine of the ten pull a feature
   (`RulesPane`, `TableWorkspace`, React Flow) and a suite that
   mounts those is measuring their imports, not this. The tenth is
   here too — RulesStage, the smallest real stage — so the harness
   is never the only evidence that a stage arrives named.
   ============================================================ */

import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useStageEntry } from './stageEntry'

/** A stage, reduced to the only two things this hook decides: what it
 *  is called, and what is inside it.
 *
 *  `role="region"` IS WRITTEN HERE, not spread, because that is what
 *  the ten real stage roots do and why — see the note in
 *  stageEntry.ts. A harness that got its role from somewhere the
 *  stages do not would be testing a shape nothing ships. */
function Stage({ name, children }: { name: string; children?: ReactNode }): ReactElement {
  const stage = useStageEntry(name)
  return (
    <div role="region" {...stage}>
      {children}
    </div>
  )
}

describe('a stage arriving', () => {
  it('takes the focus and says what page it is', () => {
    render(<Stage name="Business rules" />)
    const page = screen.getByRole('region', { name: 'Business rules' })
    expect(page).toHaveFocus()
  })

  it('is reached by Tab from nothing else — it is not in the tab ring itself', () => {
    render(<Stage name="Fitment" />)
    /* `-1`, so the browser's own Tab order never stops on the box.
       The focus gets here because the hook puts it here. */
    expect(screen.getByRole('region', { name: 'Fitment' })).toHaveAttribute('tabindex', '-1')
  })
})

describe('what it never takes', () => {
  it('leaves the focus in a field somebody is typing into', async () => {
    function Harness({ open }: { open: boolean }): ReactElement {
      return (
        <>
          <input aria-label="Search rows" />
          {open ? <Stage name="Quotes we have made" /> : null}
        </>
      )
    }
    const view = render(<Harness open={false} />)
    const field = screen.getByLabelText('Search rows')
    field.focus()
    expect(field).toHaveFocus()

    view.rerender(<Harness open />)
    /* the page is there and it is named — it simply did not grab the
       keystroke out of the middle of a word */
    expect(screen.getByRole('region', { name: 'Quotes we have made' })).toBeInTheDocument()
    expect(field).toHaveFocus()
  })

  it('leaves the focus on a control the stage autofocused for itself', () => {
    render(
      <Stage name="Columns of Formosa">
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <button type="button" autoFocus>
          Add column
        </button>
      </Stage>,
    )
    expect(screen.getByRole('button', { name: 'Add column' })).toHaveFocus()
  })

  it('does not pull the focus back on an ordinary re-render', () => {
    function Harness({ n }: { n: number }): ReactElement {
      return (
        <Stage name="Formosa">
          <button type="button">Row {n}</button>
        </Stage>
      )
    }
    const view = render(<Harness n={1} />)
    const inside = screen.getByRole('button')
    inside.focus()

    view.rerender(<Harness n={2} />)
    expect(inside).toHaveFocus()
  })
})

describe('a page change inside a stage', () => {
  it('announces itself when the name changes under the same root', () => {
    function Harness({ name }: { name: string }): ReactElement {
      return (
        <>
          <button type="button">Elsewhere</button>
          <Stage name={name} />
        </>
      )
    }
    const view = render(<Harness name="Modules" />)
    screen.getByRole('button', { name: 'Elsewhere' }).focus()

    view.rerender(<Harness name="Boats" />)
    expect(screen.getByRole('region', { name: 'Boats' })).toHaveFocus()
    expect(screen.queryByRole('region', { name: 'Modules' })).toBeNull()
  })

  it('arrives again when the stage handed its box away and took it back', () => {
    /* ModuleStage.tsx: while an item is open the module's own root is
       not drawn at all — a `ViewStage` has the box. Coming back is a
       fresh arrival even though the name never changed, and only the
       ROOT ELEMENT can tell you that. */
    function Swap({ away }: { away: boolean }): ReactElement {
      const stage = useStageEntry('Boats')
      if (away) return <div data-testid="the-item" />
      return <div role="region" {...stage} />
    }
    const view = render(<Swap away={false} />)
    expect(screen.getByRole('region', { name: 'Boats' })).toHaveFocus()

    view.rerender(<Swap away />)
    expect(screen.queryByRole('region', { name: 'Boats' })).toBeNull()

    view.rerender(<Swap away={false} />)
    expect(screen.getByRole('region', { name: 'Boats' })).toHaveFocus()
  })
})

describe('the whole of it, on a real stage', () => {
  /* RulesStage is the one stage whose box is thin enough to mount
     here: a bar, a back button and `<RulesPane/>`. It is mounted
     through a switch so the "before" state is a page that is NOT
     open, which is the only way to prove the focus MOVED rather than
     happening to start there. */
  it('opens named, focused, and with Back one Tab away', async () => {
    const { RulesStage } = await import('./RulesStage')
    function App(): ReactElement {
      const [open, setOpen] = useState(false)
      return open ? (
        <RulesStage onClose={() => setOpen(false)} />
      ) : (
        <button type="button" onClick={() => setOpen(true)}>
          Business rules
        </button>
      )
    }
    render(<App />)
    const door = screen.getByRole('button', { name: 'Business rules' })
    door.focus()
    fireEvent.click(door)

    const page = screen.getByRole('region', { name: 'Business rules' })
    expect(page).toHaveFocus()
    /* and the first control inside it is the way back, so the first
       Tab after arriving is useful rather than a walk through the
       navigation the page is covering */
    const first = page.querySelector('button')
    expect(first).toHaveAccessibleName('Back')
  })
})
