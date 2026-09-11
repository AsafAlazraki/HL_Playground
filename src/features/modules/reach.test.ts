/* ============================================================
   ONE RULE ABOUT WHO SEES WHICH PLACE, ASKED EVERYWHERE.

   MODULE_SYSTEM §5's sentence — "everyone using this browser sees the
   same module with the same verbs" — stopped being true when the
   access grid landed. `rowSearch.ts` took the consequence and dropped
   a place this job may not browse out of the ⌘K palette. The LISTS
   did not: Home's doors, "What we sell", the modules screen and the
   count beside Modules in the rail all read the module map raw, so a
   person the grid had shut out of a place still saw it on the front
   page and pressed it.

   What is asserted here is the rule itself and the two properties
   that decide whether every list can safely share it: that an
   unrestricted place is open to everybody, and that the map comes
   back by IDENTITY when nothing is hidden — because three memos
   downstream are keyed on it.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { ModuleDef } from '@/types/model'
import { browsableModules } from './reach'

const ISO = '2026-01-01T00:00:00.000Z'

function place(id: string, access?: ModuleDef['access']): ModuleDef {
  return {
    id,
    name: id,
    description: `${id}, for the test`,
    tableIds: [`e-${id}`],
    capabilities: ['browse', 'search', 'open'],
    index: 'tiles',
    accent: 'blue',
    order: 0,
    createdAt: ISO,
    updatedAt: ISO,
    ...(access ? { access } : {}),
  }
}

const map = (...list: ModuleDef[]): Record<string, ModuleDef> =>
  Object.fromEntries(list.map((m) => [m.id, m]))

describe('the places a job may browse', () => {
  it('LEAVES AN UNRESTRICTED FILE COMPLETELY ALONE, which is every seeded place', () => {
    const all = map(place('boats'), place('motors'))
    /* nobody signed in, nothing restricted: absent access means
       nobody has decided, and inventing a refusal out of silence is
       how an app grows a wall with no door on either side */
    expect(browsableModules(all, null)).toBe(all)
    expect(browsableModules(all, 'r-sales')).toBe(all)
  })

  it('takes away a place this job was not granted', () => {
    const all = map(
      place('boats', [{ roleId: 'r-manager', capabilities: ['browse'] }]),
      place('motors'),
    )
    expect(Object.keys(browsableModules(all, 'r-sales'))).toEqual(['motors'])
    expect(Object.keys(browsableModules(all, 'r-manager'))).toEqual(['boats', 'motors'])
  })

  it('shuts a restricted place to nobody-in-particular, and leaves the open one open', () => {
    const all = map(
      place('boats', [{ roleId: 'r-manager', capabilities: ['browse'] }]),
      place('motors'),
    )
    expect(Object.keys(browsableModules(all, null))).toEqual(['motors'])
  })

  it('asks about BROWSE and not about some other verb', () => {
    /* the grant names `open` — looking at one item — and never
       "see everything in it", which is what pressing a door does */
    const all = map(place('boats', [{ roleId: 'r-sales', capabilities: ['open'] }]))
    expect(Object.keys(browsableModules(all, 'r-sales'))).toEqual([])
  })

  it('RETURNS THE SAME OBJECT when nothing is hidden, because three memos are keyed on it', () => {
    const all = map(place('boats'), place('motors'))
    const once = browsableModules(all, 'r-sales')
    const twice = browsableModules(all, 'r-sales')
    expect(once).toBe(all)
    expect(twice).toBe(all)
  })

  it('and a fresh one only when it really is shorter', () => {
    const all = map(place('boats', [{ roleId: 'r-manager', capabilities: ['browse'] }]))
    const out = browsableModules(all, 'r-sales')
    expect(out).not.toBe(all)
    expect(Object.keys(out)).toEqual([])
  })
})
