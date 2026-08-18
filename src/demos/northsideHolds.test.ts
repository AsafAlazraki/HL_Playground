/* ============================================================
   THE TWO FIGURES ON THE DOOR ARE STILL THE TRUTH.

   Home's first screen offers a button that replaces the whole sheet
   and says what arrives — "52 tables · 3,566 rows". Those figures
   used to be COUNTED, by building the set on the spot, and the
   argument for counting them was that a hand-typed number goes
   stale the first time the seed changes and nobody remembers.

   The argument was right; the answer was expensive. The screen that
   draws them is the screen a person with an EMPTY sheet sees, so
   counting the price file downloaded the price file — 139 kB gzip,
   for the one visitor who never asked for it. That is exactly the
   cost `demos/seedChunk.ts` exists to stop paying.

   SO THIS TEST IS THE OTHER HALF OF THAT TRADE. The figures are
   pinned in `northsideHolds.ts` and this builds the set and checks
   them. A hand-typed number that goes stale silently is a bug; one
   that turns a guard red on the next regeneration, printing the
   figures to replace it with, is a build step.

   IF IT IS FAILING: the seed changed. Put the counted numbers in
   `northsideHolds.ts`, and read Home's door once to be sure the
   sentence still says something sensible.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from './northside'
import { NORTHSIDE_HOLDS } from './northsideHolds'
import { DEMOS } from './index'

const counted = ((): { tables: number; rows: number } => {
  const p = buildNorthsideProject()
  let rows = 0
  for (const list of Object.values(p.rowsByEntity)) rows += list.length
  return { tables: p.entities.length, rows }
})()

describe('what the prepared set says it holds', () => {
  it('is what one load actually puts on the sheet', () => {
    expect(NORTHSIDE_HOLDS).toEqual(counted)
  })

  /* the door reads it through the register, not from the constant */
  it('is what the door reads', () => {
    const real = DEMOS.find((d) => d.id === 'northside')
    expect(real?.holds?.()).toEqual(counted)
  })

  /* THE WHOLE POINT OF PINNING THEM: reading the figures must not
     touch the seed. This asserts the shape of the thing rather than
     the import graph — `entryChunk.test.ts` is what guards the
     graph — but a `holds` that went back to building the set would
     have to become a promise or start costing seconds, and both
     show up here. */
  it('is a plain fact, not a build', () => {
    const before = Date.now()
    const real = DEMOS.find((d) => d.id === 'northside')
    for (let i = 0; i < 1000; i += 1) real?.holds?.()
    expect(Date.now() - before).toBeLessThan(50)
  })
})
