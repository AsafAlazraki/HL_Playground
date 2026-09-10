/* ============================================================
   UX_PASS §4.4 — "Presets are neutral, or they are not presets."

   A preset is what a dealer gets when they make a table before
   they have imported anything. It shipped six columns of one
   dealership's private vocabulary — `AUS Sailing` is a named
   account of one business — so somebody in another state, making
   their first Boats table, got a pricing band with a stranger's
   customers in it.

   THIS IS A SWEEP, NOT SIX ASSERTIONS, for the same reason
   check-words.mjs is: the failure mode is the seventh column
   added next month by somebody who has not read §4.4. The words
   below are the ones that only make sense inside one business.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { TABLE_KINDS } from './model'

/* Vocabulary that belongs to a business rather than to a boat. Each
   is a word or an abbreviation nobody outside one dealership uses. */
const PRIVATE = [
  'AUS Sailing',
  'Sub Dealer',
  'Sub (Exclusive)',
  'HO - MU',
  'BMT - MU',
  'Matrix',
]

describe('a preset ships what every table of its kind has, and nothing else', () => {
  const kinds = Object.entries(TABLE_KINDS)

  it('sweeps every kind, so a broken walk cannot pass silently', () => {
    expect(kinds.length).toBeGreaterThan(4)
  })

  for (const [kind, meta] of kinds) {
    it(`${kind} names no one business's vocabulary`, () => {
      const names = (meta.detailColumns ?? []).map((c) => c.name)
      const found = names.filter((n) =>
        PRIVATE.some((p) => n.toLowerCase() === p.toLowerCase()),
      )
      expect(found, `\n${kind} ships: ${found.join(', ')}\n`).toEqual([])
    })

    it(`${kind} has no band with nothing in it`, () => {
      /* The Markups band outlived the two columns that were in it,
         and a heading for nothing is worse than no heading. */
      const used = new Set((meta.detailColumns ?? []).map((c) => c.section))
      const empty = (meta.sections ?? []).filter((s) => !used.has(s.id)).map((s) => s.name)
      expect(empty, `\n${kind} draws: ${empty.join(', ')}\n`).toEqual([])
    })
  }
})

describe('what the boat preset keeps', () => {
  const boat = TABLE_KINDS.boat

  it('still ships identity, dimensions, capacity and a price — §4.4’s own list', () => {
    const names = (boat.detailColumns ?? []).map((c) => c.name)
    expect(names).toContain('Model Code')
    expect(names).toContain('OA Length')
    expect(names).toContain('Max People')
    expect(names).toContain('Cash')
  })

  it('did not lose the motor fitment envelope, which every boat has', () => {
    const names = (boat.detailColumns ?? []).map((c) => c.name)
    expect(names).toContain('Min HP')
    expect(names).toContain('Max HP')
  })
})
