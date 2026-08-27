/* ============================================================
   THE RAIL'S ONE LIST, EXERCISED.

   Three claims are made in `moduleRecent.ts` and each one is the
   sort that fails silently on a screen:

     1 NEWEST FIRST, AND THE SAME PLACE MOVES RATHER THAN
       DOUBLING. Without this the rail draws Highfield twice and
       the fourth module a person opened falls off the end.

     2 IT CAPS AT FOUR. The rail's whole argument is that it is
       four doors tall; a fifth remembered module makes the list
       longer than the navigation above it.

     3 THE SNAPSHOT IS STABLE BY IDENTITY. `useSyncExternalStore`
       compares snapshots with `Object.is` and calls the getter on
       every render, so an array rebuilt each call is an infinite
       render loop — a crash on mount, not a defect somebody finds
       later. This is the one claim in the file that a person
       cannot see by looking at the rail, so it is the one most
       worth a test.

   The store is a module singleton by design, so these run in
   order against one instance, which is what the browser does too.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import {
  MODULE_RECENT_LIMIT,
  readModuleRecent,
  rememberModule,
} from './moduleRecent'

describe('the modules the rail remembers', () => {
  it('puts the newest first', () => {
    rememberModule('m-boats')
    rememberModule('m-motors')
    expect(readModuleRecent().slice(0, 2)).toEqual(['m-motors', 'm-boats'])
  })

  it('moves a place opened twice rather than doubling it', () => {
    rememberModule('m-boats')
    const held = readModuleRecent()
    expect(held[0]).toBe('m-boats')
    expect(held.filter((id) => id === 'm-boats')).toHaveLength(1)
  })

  it('keeps four and no more', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) rememberModule(id)
    expect(readModuleRecent()).toHaveLength(MODULE_RECENT_LIMIT)
    expect(readModuleRecent()[0]).toBe('f')
  })

  it('hands back the same array until something changes', () => {
    const before = readModuleRecent()
    /* re-remembering the newest is a no-op, and a no-op must not
       mint a new array — see claim 3 in the header */
    rememberModule(before[0])
    expect(readModuleRecent()).toBe(before)
  })

  it('ignores an empty id rather than remembering nothing', () => {
    const before = readModuleRecent()
    rememberModule('')
    expect(readModuleRecent()).toBe(before)
  })
})
