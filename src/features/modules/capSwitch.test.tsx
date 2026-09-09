/* ============================================================
   A VERB THAT CANNOT BE TURNED ON, AS A PERSON MEETS IT.

   THE BUG THIS GUARDS, NAMED. `capabilityStates` refuses a verb with
   a sentence — "Nothing on Rate Card is marked as a price, so there
   is no figure to quote. Give the table a price column on the sheet
   and this switches on." — and the designer drew that sentence
   underneath a switch carrying the `disabled` ATTRIBUTE. A disabled
   button leaves the tab order, so a person moving by keyboard passed
   over both the control and its explanation: the refusal was drawn
   for somebody who could see that corner of the screen and for nobody
   else. Rule 10 says a thing that cannot be done says why WHERE IT
   IS, and a reason nobody can reach is not where it is.

   The same fault was found and fixed in `QuoteBuild.tsx` a day
   earlier, and in `ModuleIndex`'s Add button in the same commit as
   this file. Three surfaces, one mistake, one shape of fix — so it
   gets a guard rather than a third round of hand-checking.

   ASSERTED ON ROLE, NAME AND ATTRIBUTE, never on a class.
   `toBeDisabled()` is deliberately NOT used anywhere below: it passes
   for `aria-disabled` as well as for `disabled`, so a test written
   with it would go green on the exact regression this file exists to
   catch.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, ModuleCapability, ModuleDef } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async () => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { ModuleDesigner } = await import('./ModuleDesigner')

const ISO = '2026-01-01T00:00:00.000Z'

/* NO PRICE COLUMN, DELIBERATELY. That is what refuses `quote` —
   `designer.ts`'s own condition — and it is a fact about somebody's
   table rather than a flag this test invented. */
const table: EntityDef = {
  id: 't1',
  name: 'Rate Card',
  accent: 'blue',
  kind: 'custom',
  fields: [
    { id: 't1-name', name: 'Item', type: 'text' },
    { id: 't1-hours', name: 'Hours', type: 'number' },
  ],
  displayFieldId: 't1-name',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
}

const module_: ModuleDef = {
  id: 'm1',
  name: 'Rates & Charges',
  description: 'What we charge for',
  tableIds: ['t1'],
  capabilities: ['browse', 'search', 'open'] as ModuleCapability[],
  index: 'rows',
  accent: 'blue',
  order: 0,
  createdAt: ISO,
  updatedAt: ISO,
}

const capsOf = (): ModuleCapability[] =>
  useProjectStore.getState().modules['m1']?.capabilities ?? []

beforeEach(() => {
  useProjectStore.setState({
    entities: { t1: table },
    rowsByEntity: { t1: [] },
    modules: { m1: module_ },
  })
})

const quoteSwitch = (): HTMLElement => screen.getByRole('switch', { name: /^Quote — / })

describe('a refused capability keeps its place and keeps its reason', () => {
  it('is aria-disabled and NOT disabled, so it stays reachable', () => {
    render(<ModuleDesigner module={module_} />)
    const sw = quoteSwitch()
    expect(sw).toHaveAttribute('aria-disabled', 'true')
    expect(sw).not.toHaveAttribute('disabled')
    /* the whole point: still in the tab order */
    expect(sw).toBeEnabled()
  })

  it('carries the sentence with it rather than merely near it', () => {
    render(<ModuleDesigner module={module_} />)
    const why = screen.getByText(/is marked as a price/)
    /* the reason names the fix and the table it is on — `designer.ts`
       refuses with `ConstraintDef.because`, never "unavailable" */
    expect(why).toHaveTextContent('Rate Card')
    expect(why).toHaveTextContent('price column on the sheet')
    expect(quoteSwitch()).toHaveAttribute('aria-describedby', why.id)
    expect(why.id).not.toBe('')
  })

  it('cannot be switched on by pressing it, because the handler refuses', async () => {
    /* THE COROLLARY OF KEEPING IT PRESSABLE. `aria-disabled` does not
       stop a click, so the guard lives in `onClick` — and this is
       what says so out loud. */
    render(<ModuleDesigner module={module_} />)
    await userEvent.click(quoteSwitch())
    expect(capsOf()).not.toContain('quote')
    expect(quoteSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('leaves a verb that is NOT refused fully operable', () => {
    /* The other half, so this file cannot pass by refusing
       everything: `add` has no refusal on this table and its switch
       says nothing about being disabled. */
    render(<ModuleDesigner module={module_} />)
    const add = screen.getByRole('switch', { name: /^Add — / })
    expect(add).toHaveAttribute('aria-disabled', 'false')
    expect(add).toHaveAttribute('aria-checked', 'false')
  })

  it('switches an unrefused verb on, so the guard is the refusal and not the markup', async () => {
    render(<ModuleDesigner module={module_} />)
    await userEvent.click(screen.getByRole('switch', { name: /^Add — / }))
    expect(capsOf()).toContain('add')
  })
})
