/* ============================================================
   THE ACTION BAR'S REGISTER — the things it has to get right.

   None of these are about how a button looks. They are about the one
   property the whole mechanism rests on: TWO PUBLISHERS THAT CANNOT
   SEE EACH OTHER produce one bar, in one declared order, and neither
   can leave the other's controls standing on a page that has closed.
   A stale action bar is worse than no action bar, because every button
   on it points at a subject that is gone.

   The register is module-level SESSION state — the same arrangement
   `rowRevealState` and `tableFitState` use, and for the same reason —
   so every test puts it back afterwards.
   ============================================================ */
import { afterEach, describe, expect, it } from 'vitest'
import { pageActions, publishActions } from './actions'
import type { ActionGroup } from './actions'

const OWNERS = ['stage', 'sheet']

afterEach(() => {
  for (const o of OWNERS) publishActions(o, null)
})

function group(id: string, rank: number): ActionGroup {
  return {
    id,
    rank,
    items: [{ kind: 'button', id: `${id}-btn`, label: id, onPick: () => {} }],
  }
}

const order = (): string[] => pageActions().map((g) => g.id)

describe('the action bar register', () => {
  it('draws nothing until somebody publishes', () => {
    expect(order()).toEqual([])
  })

  it('flattens two publishers into one bar, in rank order', () => {
    /* the sheet publishes the register's controls; the stage publishes
       its doors. Neither knows the other exists, and the doors must
       land BETWEEN the sheet's two groups — which is the whole reason
       `rank` is declared rather than inferred from mount order. */
    publishActions('sheet', [group('find', 10), group('rows', 90)])
    publishActions('stage', [group('doors', 50)])
    expect(order()).toEqual(['find', 'doors', 'rows'])
  })

  it('is not sensitive to which publisher went first', () => {
    publishActions('stage', [group('doors', 50)])
    publishActions('sheet', [group('find', 10), group('rows', 90)])
    expect(order()).toEqual(['find', 'doors', 'rows'])
  })

  it('lets one publisher retract without taking the other down', () => {
    publishActions('sheet', [group('find', 10), group('rows', 90)])
    publishActions('stage', [group('doors', 50)])
    publishActions('stage', null)
    expect(order()).toEqual(['find', 'rows'])
  })

  it('treats an empty list as a retraction, so a page with nothing to do has no bar', () => {
    publishActions('sheet', [group('find', 10)])
    publishActions('sheet', [])
    expect(order()).toEqual([])
  })

  it('REPLACES an owner rather than appending to it', () => {
    /* the register republishes on every keystroke typed into its own
       search field; if that appended, a table page would grow a new
       copy of its toolbar per character */
    publishActions('sheet', [group('find', 10), group('rows', 90)])
    publishActions('sheet', [group('rows', 90)])
    expect(order()).toEqual(['rows'])
  })

  it('retracting an owner that never published changes nothing', () => {
    publishActions('sheet', [group('find', 10)])
    publishActions('stage', null)
    expect(order()).toEqual(['find'])
  })

  it('hands the bar a new snapshot on every change, so the bar re-renders', () => {
    /* `useSyncExternalStore` compares snapshots with `Object.is`. If a
       change ever left the array identity alone the bar would keep
       drawing the previous page's controls. */
    publishActions('sheet', [group('find', 10)])
    const first = pageActions()
    publishActions('sheet', [group('rows', 90)])
    expect(pageActions()).not.toBe(first)
  })
})
