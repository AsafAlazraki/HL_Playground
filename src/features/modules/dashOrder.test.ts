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
import { reorderTo } from './designer'

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
  /* THESE WERE THE ARROWS' PROPERTIES AND THEY ARE THE DRAG'S. The
     two controls became one when the grid learned to be dragged
     (MODULE_SYSTEM §3 Screen 5), and every property below is about
     the RENUMBERING rather than about the gesture: canonical orders,
     the drawn order winning over the stored one, and the list handed
     in never being touched. A one-place drop is what an arrow used
     to be. */

  it('puts a card before the one it was dropped on, and writes only what moved', () => {
    expect(reorderTo(drawn, 'c', 'b')).toEqual([
      { id: 'c', order: 1 },
      { id: 'b', order: 2 },
    ])
  })

  it('puts a card after the one it was dropped on, going the other way', () => {
    expect(reorderTo(drawn, 'c', 'd')).toEqual([
      { id: 'd', order: 2 },
      { id: 'c', order: 3 },
    ])
  })

  it('leaves the list it was handed exactly as it found it', () => {
    const before = drawn.map((m) => `${m.id}:${m.order}`)
    reorderTo(drawn, 'c', 'b')
    expect(drawn.map((m) => `${m.id}:${m.order}`)).toEqual(before)
  })

  it('makes the numbers canonical when they were never 0…n-1', () => {
    /* A module made by hand lands on whatever `createModule` counted
       to, and a project can arrive from a file carrying any integers
       at all. The first move renumbers what it has to; every move
       after it is two records. */
    const gappy = [mod('a', 0), mod('b', 5), mod('c', 9)]
    expect(reorderTo(gappy, 'c', 'b')).toEqual([
      { id: 'c', order: 1 },
      { id: 'b', order: 2 },
    ])
  })

  it('moves a card past the neighbour it is DRAWN beside', () => {
    /* the same three, handed over in the order they are drawn — the
       plan must never be worked out against the stored numbers */
    const cards = [mod('z', 0), mod('y', 1), mod('x', 2)]
    expect(reorderTo(cards, 'x', 'y').map((q) => q.id)).toEqual(['x', 'y'])
  })

  it('walks a card the whole way along, one drop at a time', () => {
    /* four drops, applied as the dashboard applies them, and the
       order that comes out is the order a person watched happen */
    let cards = drawn.map((m) => ({ ...m }))
    for (let i = 0; i < 4; i += 1) {
      const after = cards[cards.findIndex((m) => m.id === 'a') + 1]
      if (!after) break
      const plan = reorderTo(cards, 'a', after.id)
      const at = new Map(plan.map((q) => [q.id, q.order]))
      cards = cards
        .map((m) => ({ ...m, order: at.get(m.id) ?? m.order }))
        .sort((x, y) => x.order - y.order)
    }
    expect(cards.map((m) => m.id)).toEqual(['b', 'c', 'd', 'e', 'a'])
    /* and at the end there is nothing after it to drop onto */
    expect(cards.findIndex((m) => m.id === 'a')).toBe(cards.length - 1)
  })
})

/* ---------------------------------------------------------- */

describe('dropping one card where another one is', () => {
  /* A DRAG IS NOT A STEP. An arrow moves a module one place and
     refuses at the ends; a drop lands somewhere, and "somewhere" is
     named by the module whose slot the pointer was over. */

  it('LANDS THE MODULE WHERE THE TARGET IS, and shuffles only what it passed', () => {
    /* e onto b: a, e, b, c, d — a keeps 0 and is not written. */
    expect(reorderTo(drawn, 'e', 'b')).toEqual([
      { id: 'e', order: 1 },
      { id: 'b', order: 2 },
      { id: 'c', order: 3 },
      { id: 'd', order: 4 },
    ])
  })

  it('carries a card the other way just as far', () => {
    expect(reorderTo(drawn, 'a', 'd')).toEqual([
      { id: 'b', order: 0 },
      { id: 'c', order: 1 },
      { id: 'd', order: 2 },
      { id: 'a', order: 3 },
    ])
  })

  it('writes nothing when a card is dropped on itself', () => {
    expect(reorderTo(drawn, 'c', 'c')).toEqual([])
  })

  it('writes nothing for a module that is not there — a stale drag, not a crash', () => {
    expect(reorderTo(drawn, 'zz', 'b')).toEqual([])
    expect(reorderTo(drawn, 'b', 'zz')).toEqual([])
  })

  it('LEAVES THE MODULES NOBODY CAN SEE WHERE THEY WERE', () => {
    /* The grid filters. A drop between two visible cards has to mean
       something to the ones off screen, and the answer is that their
       relative order never changes: c and d are untouched by a drop
       of e onto a, beyond being pushed along one. */
    const after = new Map(drawn.map((m) => [m.id, m.order]))
    for (const { id, order } of reorderTo(drawn, 'e', 'a')) after.set(id, order)
    const sorted = [...after.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id)
    expect(sorted).toEqual(['e', 'a', 'b', 'c', 'd'])
  })

})
