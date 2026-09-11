/* ============================================================
   THE RAIL COUNTS WHAT THIS JOB CAN OPEN.

   `reach.test.ts` owns the rule; this asserts the app asks it. The
   figure beside Modules is the first number a person reads on every
   screen, and a rail saying 25 over a modules screen listing 19 is
   the app arguing with itself about what exists.

   NOBODY IS SIGNED INTO A ROLE HERE, so `useSessionRoleId()` answers
   null — which `access.ts` reads as "nobody in particular": a
   RESTRICTED place is shut to them and an unrestricted one is open.
   That is the same pair of states `palette.test.tsx` uses next door,
   and it is the state every seeded file is in (9 places, none
   restricted), which is why this suite can prove the rule without
   inventing a session.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Shell } from './Shell'
import { useProjectStore } from '@/store/useProjectStore'
import type { AppUser } from '@/features/auth'
import type { EntityDef, ModuleDef } from '@/types/model'

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

const table = (id: string): EntityDef => ({
  id,
  name: `Table ${id}`,
  accent: 'blue',
  fields: [{ id: `${id}.name`, name: 'Model', type: 'text' }],
  displayFieldId: `${id}.name`,
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

const place = (id: string, tableId: string, access?: ModuleDef['access']): ModuleDef => ({
  id,
  name: id,
  description: `${id}, for the test`,
  tableIds: [tableId],
  capabilities: ['browse', 'search', 'open'],
  index: 'tiles',
  accent: 'blue',
  order: 0,
  createdAt: ISO,
  updatedAt: ISO,
  ...(access ? { access } : {}),
})

function open(modules: Record<string, ModuleDef>): void {
  useProjectStore.getState().setOrganisation('Northside', 'marine')
  useProjectStore.setState({
    entities: { 'e-a': table('e-a'), 'e-b': table('e-b') },
    rowsByEntity: { 'e-a': [], 'e-b': [] },
    modules,
  })
  render(<Shell user={user} onSignOut={() => {}} />)
}

/** The figure the rail prints beside Modules. */
function railSays(): string {
  /* INSIDE THE RAIL, by its own landmark — the dashboard draws a card
     called Modules too, and a query that cannot tell them apart would
     pass while measuring the wrong surface. Never by class name: a
     test that asserts on a class fails when the class is renamed and
     passes when the screen is broken. */
  const rail = within(screen.getByRole('navigation', { name: 'Navigation' }))
  const row = rail.getByRole('button', { name: /^Modules/ })
  return (row.textContent ?? '').replace(/\s+/g, ' ').trim()
}

beforeEach(() => {
  useProjectStore.setState({ entities: {}, rowsByEntity: {}, modules: {}, views: {} })
})

describe('the count beside Modules', () => {
  it('counts both places when neither is restricted', () => {
    open({ a: place('a', 'e-a'), b: place('b', 'e-b') })
    expect(railSays()).toBe('Modules2')
  })

  it('DOES NOT COUNT A PLACE THIS JOB MAY NOT BROWSE, so the rail and the screen agree', () => {
    open({
      a: place('a', 'e-a', [{ roleId: 'r-manager', capabilities: ['browse'] }]),
      b: place('b', 'e-b'),
    })
    expect(railSays()).toBe('Modules1')
  })
})
