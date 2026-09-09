/* ============================================================
   WHOSE DEAL IT IS — drawn, not just computed.

   `owners.test.ts` proves the arithmetic. This proves the screen,
   because the two failures this change could produce are both
   invisible to a logic suite:

     · THE TWO ROWS ABOUT PEOPLE COLLAPSING INTO ONE. "Who prepared
       it" is a name frozen on the document; "Who owns it now" is
       the job the deal has been handed to. A pane that drew one
       and labelled it the other would pass every assertion in the
       logic suite and tell a sales manager something false.

     · THE REFUSAL VANISHING. A business with no jobs written down
       must be told so, and told where jobs live — rule 10. The
       failure mode is not an error, it is a dropdown containing
       one row reading "Nobody", which looks like a working control
       and is not one.

   EVERY QUERY IS BY ROLE OR BY TEXT, the rule `tiles.test.tsx`
   set: a test that asserts on a class fails when the class is
   renamed and passes when the screen is broken.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RoleDef } from '@/types/model'
import type { QuoteDef } from '@/features/quote'
import { DealFacts, DealHandovers } from './dealParts'
import { mintHandover, NOBODY, type Handover } from './owners'
import type { StageDef } from './stageStore'

const STAMP = '2026-09-01T00:00:00.000Z'
const T = Date.parse(STAMP)

/** the few fields these two pieces actually read. Cast once, here,
 *  the way `stageTrigger.test.ts` does. */
const quote = (q: Partial<QuoteDef> & { id: string }): QuoteDef =>
  ({
    reference: 'Q-1042',
    state: 'draft',
    viewId: 'v',
    rootTableId: 'boats',
    rootRowId: 'r',
    subjectLabel: 'Highfield Sport 460',
    subjectSpecs: [],
    customer: { name: 'Marcus Ellis' },
    lines: [],
    adjustments: [],
    sections: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...q,
  }) as unknown as QuoteDef

const STAGE: StageDef = {
  id: 'negotiating',
  name: 'Negotiating',
  about: '',
  tone: 'neutral',
  wash: 'none',
  closed: false,
  locks: false,
}

const role = (id: string, name: string): RoleDef => ({
  id,
  name,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const SALES = role('r-sales', 'Salesperson')
const YARD = role('r-yard', 'Yard manager')
const ROLES = [SALES, YARD]

const hand = (id: string, at: number, from: string | null, to: string | null, who?: string): Handover =>
  mintHandover({ id, at, from, to, ...(who ? { who } : {}) })

function facts(
  owner: Partial<Parameters<typeof DealFacts>[0]['owner']> & {
    onAssign?: (id: string) => void
  } = {},
  q: QuoteDef = quote({ id: 'q1', preparedBy: 'Dana Whitcombe' }),
): { onAssign: ReturnType<typeof vi.fn> } {
  const onAssign = vi.fn()
  render(
    <DealFacts
      quote={q}
      stage={STAGE}
      arrived={null}
      owner={{
        at: owner.at ?? NOBODY,
        roles: owner.roles ?? ROLES,
        last: owner.last,
        why: owner.why ?? null,
        onAssign: owner.onAssign ?? onAssign,
      }}
    />,
  )
  return { onAssign }
}

/* ---------------------------------------------------------- */

describe('the owner row', () => {
  it('draws a control whose value is the job the deal is with', () => {
    facts({ at: YARD.id })
    const go = screen.getByRole('button', { name: /Owner/ })
    expect(go).toHaveTextContent('Yard manager')
  })

  it('says nobody, rather than nothing, on a deal no one has been given', () => {
    facts()
    expect(screen.getByRole('button', { name: /Owner/ })).toHaveTextContent('Nobody')
  })

  /* THE ASSERTION THIS FILE EXISTS FOR. Two rows, two labels, two
     different answers — on one screen, at once. */
  it('draws who owns it and who prepared it as two separate facts', () => {
    facts({ at: YARD.id })
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Prepared by')).toBeInTheDocument()
    /* the preparer is a NAME and is drawn as text; the owner is a
       JOB and is drawn as the control's value. Neither is the
       other, and the screen says so. */
    expect(screen.getByText('Dana Whitcombe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Owner/ })).toHaveTextContent('Yard manager')
    expect(screen.getByRole('button', { name: /Owner/ })).not.toHaveTextContent(
      'Dana Whitcombe',
    )
  })

  it('offers every job the dealership has written down, plus nobody', async () => {
    const user = userEvent.setup()
    facts({ at: SALES.id })
    await user.click(screen.getByRole('button', { name: /Owner/ }))
    const list = screen.getByRole('listbox')
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Nobody',
      'Salesperson',
      'Yard manager',
    ])
  })

  it('hands the picked job back, by id', async () => {
    const user = userEvent.setup()
    const { onAssign } = facts({ at: NOBODY })
    await user.click(screen.getByRole('button', { name: /Owner/ }))
    await user.click(screen.getByRole('option', { name: 'Yard manager' }))
    expect(onAssign).toHaveBeenCalledWith(YARD.id)
  })

  /* TAKING A DEAL BACK OFF SOMEBODY IS A ROW, not an absence — a
     control that can only ever assign is one you cannot reverse
     without inventing a spare job to park deals on. */
  it('can take the deal back off everybody', async () => {
    const user = userEvent.setup()
    const { onAssign } = facts({ at: YARD.id })
    await user.click(screen.getByRole('button', { name: /Owner/ }))
    await user.click(screen.getByRole('option', { name: 'Nobody' }))
    expect(onAssign).toHaveBeenCalledWith(NOBODY)
  })

  it('says who changed it last, and when', () => {
    facts({ at: YARD.id, last: hand('h1', T, null, YARD.id, 'Asaf Alazraki') })
    expect(screen.getByText(/Last changed by Asaf Alazraki/)).toBeInTheDocument()
  })

  /* NO NAME WHERE THERE IS NO NAME. A handover made with nobody
     signed in still has a time; "System" would be an invention. */
  it('drops the name rather than inventing one', () => {
    facts({ at: YARD.id, last: hand('h1', T, null, YARD.id) })
    expect(screen.getByText(/^Last changed /)).toBeInTheDocument()
    expect(screen.queryByText(/Last changed by/)).not.toBeInTheDocument()
  })
})

describe('a business with nobody to give a deal to', () => {
  const WHY = 'No jobs are written down yet. They are added under Access & roles.'

  /* RULE 10, ON THE SCREEN, AND VISIBLY. The failure this guards is
     not an error — it is a working-looking dropdown with one row in
     it, or a reason that only exists in a `title` nobody hovers. */
  it('prints the reason where the control is, and names the door', () => {
    facts({ roles: [], why: WHY })
    expect(screen.getByText(/Access & roles/)).toBeInTheDocument()
  })

  /* INERT, NOT ABSENT — picker.css's rule. The row does not appear
     out of nowhere the day somebody writes their first job down. */
  it('keeps the control, dimmed, rather than removing the row', () => {
    facts({ roles: [], why: WHY })
    const go = screen.getByRole('button', { name: /Owner/ })
    expect(go).toBeInTheDocument()
    expect(go).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not open a list that has nothing to choose from', async () => {
    const user = userEvent.setup()
    facts({ roles: [], why: WHY })
    await user.click(screen.getByRole('button', { name: /Owner/ }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('the handovers', () => {
  const q = quote({ id: 'q1' })

  it('draws nothing at all on a deal nobody has handed on', () => {
    const { container } = render(<DealHandovers quote={q} trail={[]} roles={ROLES} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reads oldest first, so it ends where the owner row starts', () => {
    render(
      <DealHandovers
        quote={q}
        roles={ROLES}
        trail={[
          hand('h1', T, null, SALES.id, 'Asaf Alazraki'),
          hand('h2', T + 86_400_000, SALES.id, YARD.id, 'Asaf Alazraki'),
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('given to Salesperson'),
      expect.stringContaining('moved from Salesperson to Yard manager'),
    ])
  })

  /* A DEAL WHOSE OWNER'S JOB HAS SINCE BEEN DELETED still has a
     trail, and the trail reports the deletion rather than printing
     a role id at somebody. */
  it('never prints a role id when the job has gone', () => {
    render(<DealHandovers quote={q} roles={[]} trail={[hand('h1', T, null, YARD.id)]} />)
    expect(screen.getByText(/a job since removed/)).toBeInTheDocument()
    expect(screen.queryByText(/r-yard/)).not.toBeInTheDocument()
  })

  it('counts what a glance is not showing rather than hiding it', () => {
    render(
      <DealHandovers
        quote={q}
        roles={ROLES}
        limit={1}
        trail={[
          hand('h1', T, null, SALES.id),
          hand('h2', T + 1000, SALES.id, YARD.id),
        ]}
      />,
    )
    expect(screen.getByText('1 earlier handover is on the whole record.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})
