/* ============================================================
   WHERE A CARD SITS ON THE DASHBOARD.

   `ModuleDef.order` was a stored field nothing could write: the
   dashboard drew a disabled control saying reordering "arrives with
   the module designer", and the designer became the settings page
   without ever ordering the dashboard. This is the arithmetic behind
   the two arrows that now do it.

   THE THREE FAILURES GUARDED, all of them about writing MORE than was
   asked for:

     1. A move off either end must write NOTHING. Wrapping the first
        card round to the back is not a smaller version of moving it
        earlier; it is a different act nobody asked for.
     2. A move must touch only the cards whose stored number really
        changes. Every write costs an `updatedAt` and a save, and a
        dashboard of fifteen modules rewriting all fifteen to swap two
        of them would put a fresh timestamp on thirteen places nobody
        touched.
     3. The plan must be the ORDER DRAWN, not the order stored. The
        cards are sorted before they are drawn, and a plan worked out
        against the raw record would move a card past a neighbour it
        is not next to on screen.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { ModuleDef } from '@/types/model'
import { reorderPlan } from './designer'

const STAMP = '2026-01-01T00:00:00.000Z'

const mod = (id: string, order: number): ModuleDef => ({
  id,
  name: id,
  description: '',
  tableIds: [`${id}-table`],
  capabilities: ['browse'],
  index: 'rows',
  accent: 'blue',
  order,
  createdAt: STAMP,
  updatedAt: STAMP,
})

/** the five as the dashboard draws them: `order` ascending */
const drawn = [mod('a', 0), mod('b', 1), mod('c', 2), mod('d', 3), mod('e', 4)]

describe('moving one card on the dashboard', () => {
  it('swaps a card with the one before it, and writes only those two', () => {
    expect(reorderPlan(drawn, 'c', -1)).toEqual([
      { id: 'c', order: 1 },
      { id: 'b', order: 2 },
    ])
  })

  it('swaps a card with the one after it, and writes only those two', () => {
    expect(reorderPlan(drawn, 'c', 1)).toEqual([
      { id: 'd', order: 2 },
      { id: 'c', order: 3 },
    ])
  })

  it('refuses to move the first card earlier, and writes nothing', () => {
    expect(reorderPlan(drawn, 'a', -1)).toEqual([])
  })

  it('refuses to move the last card later, and writes nothing', () => {
    expect(reorderPlan(drawn, 'e', 1)).toEqual([])
  })

  it('writes nothing for a card that is not on the dashboard', () => {
    expect(reorderPlan(drawn, 'nobody', 1)).toEqual([])
  })

  it('leaves the list it was handed exactly as it found it', () => {
    const before = drawn.map((m) => `${m.id}:${m.order}`)
    reorderPlan(drawn, 'c', -1)
    expect(drawn.map((m) => `${m.id}:${m.order}`)).toEqual(before)
  })

  it('makes the numbers canonical when they were never 0…n-1', () => {
    /* A module made by hand lands on whatever `createModule` counted
       to, and a project can arrive from a file carrying any integers
       at all. The first move renumbers what it has to; every move
       after it is two records. */
    const gappy = [mod('a', 0), mod('b', 5), mod('c', 9)]
    expect(reorderPlan(gappy, 'c', -1)).toEqual([
      { id: 'c', order: 1 },
      { id: 'b', order: 2 },
    ])
  })

  it('moves a card past the neighbour it is DRAWN beside', () => {
    /* the same three, handed over in the order they are drawn — the
       plan must never be worked out against the stored numbers */
    const cards = [mod('z', 0), mod('y', 1), mod('x', 2)]
    const plan = reorderPlan(cards, 'x', -1)
    expect(plan.map((p) => p.id)).toEqual(['x', 'y'])
  })

  it('walks a card the whole way along, one place at a time', () => {
    /* five moves, applied as the dashboard applies them, and the
       order that comes out is the order a person watched happen */
    let cards = drawn.map((m) => ({ ...m }))
    for (let i = 0; i < 4; i += 1) {
      const plan = reorderPlan(cards, 'a', 1)
      const at = new Map(plan.map((p) => [p.id, p.order]))
      cards = cards
        .map((m) => ({ ...m, order: at.get(m.id) ?? m.order }))
        .sort((p, q) => p.order - q.order)
    }
    expect(cards.map((m) => m.id)).toEqual(['b', 'c', 'd', 'e', 'a'])
    expect(reorderPlan(cards, 'a', 1)).toEqual([])
  })
})
