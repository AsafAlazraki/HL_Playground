/* ============================================================
   THE FACE RULE, AND THE EVIDENCE FOR THE THREE SIGNALS IT
   REFUSES TO USE.

   `face.ts` says four signals were measured and only one separates
   a catalogue from a register. That is a claim about the seeded
   sheet, and a claim about data belongs in a test rather than in a
   comment — because the day the sheet changes, a comment goes
   stale in silence and this goes red.

   WHAT IS ASSERTED, and why each one is here:

     1. THE VERDICT, per module, through the same function the store
        asks when it mints one. Nine modules, and the four that get
        tiles are the four whose rows carry photographs.

     2. THE PICTURE SIGNAL REALLY DOES SEPARATE — the lowest
        catalogue share sits strictly above the highest register
        share, with the floor inside the gap. A floor written where
        there is no gap is a floor somebody invented, and this is
        the assertion that makes `PICTURE_FLOOR` honest.

     3. THE OTHER THREE REALLY DO NOT. The row count and the name
        length OVERLAP across the two faces, and the registers span
        the whole price scale on their own — nothing priced at one
        end, all but 27 lines priced at the other — so no threshold
        on any of the three classifies anything. This is the
        interesting half: the brief that asked for this rule proposed
        "an image column AND a price" and the sheet falsified the
        second half of it. Parts & Accessories is 99% priced and is
        2,860 lines under 204 headings, and reading its price rung as
        a licence to draw tiles would have turned the whole parts
        catalogue into a grid of empty wells.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import type { RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { loadNorthsideProject } = await import('@/demos/northside')
const { listedTables, moduleFace } = await import('./read')
const { PICTURE_FLOOR } = await import('./face')

const ordered = () =>
  Object.values(useProjectStore.getState().modules).sort((a, b) => a.order - b.order)

/** Every seeded module, with the face its own rows ask for. */
function facesNow() {
  loadNorthsideProject()
  const { entities, rowsByEntity } = useProjectStore.getState()
  return ordered().map((m) => ({
    name: m.name,
    stored: m.index,
    ...moduleFace(listedTables(m, entities), rowsByEntity),
  }))
}

/** The widest value on either side of the verdict, so an overlap can
 *  be stated as two numbers rather than asserted in prose. */
function band(faces: ReturnType<typeof facesNow>, of: (f: (typeof faces)[number]) => number) {
  const tiles = faces.filter((f) => f.mode === 'tiles').map(of)
  const rows = faces.filter((f) => f.mode === 'rows').map(of)
  return {
    tilesLow: Math.min(...tiles),
    tilesHigh: Math.max(...tiles),
    rowsLow: Math.min(...rows),
    rowsHigh: Math.max(...rows),
  }
}

describe('which face a module opens on', () => {
  it('gives the four modules with photographs a catalogue, and the five without a register', () => {
    const faces = facesNow()
    expect(faces.filter((f) => f.mode === 'tiles').map((f) => f.name)).toEqual([
      'Boats',
      'Motors',
      'Factory Packages',
      'Trailers',
    ])
    expect(faces.filter((f) => f.mode === 'rows').map((f) => f.name)).toEqual([
      'Parts & Accessories',
      'Dealer Fit Packages',
      'Labour Rates',
      'Oils & Consumables',
      'Registration Costs',
    ])
    /* and the stored field the store minted agrees with the
       measurement, because `createModule` asked this same function */
    for (const f of faces) expect(f.stored, f.name).toBe(f.mode)
  })

  it('puts the floor inside a real gap, which is the only thing that licenses a floor', () => {
    const faces = facesNow()
    const share = band(faces, (f) => (f.live === 0 ? 0 : f.pictured / f.live))
    /* 69% is Factory Packages, the thinnest catalogue; every register
       is exactly zero. Nothing on this sheet sits between them. */
    expect(share.tilesLow).toBeGreaterThan(PICTURE_FLOOR)
    expect(share.rowsHigh).toBe(0)
    expect(share.tilesLow).toBeGreaterThan(share.rowsHigh)
  })

  /* -- and the three that were counted and got no vote -------- */

  it('counts a price and refuses to let it decide, because the registers span the whole scale', () => {
    const faces = facesNow()
    const parts = faces.find((f) => f.name === 'Parts & Accessories')
    expect(parts?.mode).toBe('rows')
    /* THE HYPOTHESIS THIS FALSIFIES, in one line: 2,833 of 2,860
       priced, and it is a register — 2,860 lines under 204 headings.
       "An image column AND a price means a thing you shop" is half
       right, and the half that is wrong would have turned the whole
       parts catalogue into a tile grid. */
    expect(parts && parts.priced / parts.live).toBeGreaterThan(0.9)

    const share = band(faces, (f) => (f.live === 0 ? 0 : f.priced / f.live))
    /* THE REGISTERS OCCUPY THE ENTIRE RANGE ON THEIR OWN — nothing
       priced at one end, all but 27 lines priced at the other — so
       there is no threshold on price that classifies them, whatever
       the catalogues happen to score. The 0.7 of a percentage point
       between the two highs is not a gap, it is where 27 rows of a
       2,860-row sheet happened to fall. */
    expect(share.rowsLow).toBe(0)
    expect(share.rowsHigh).toBeGreaterThan(0.98)
    expect(share.tilesLow - share.rowsHigh).toBeLessThan(0.01)
  })

  it('counts the row count and refuses to let it decide, because the ranges cross', () => {
    const share = band(facesNow(), (f) => f.live)
    /* registers run 18 → 2,860 and catalogues run 89 → 810: the
       register range brackets the catalogue range on both sides, so a
       threshold in either direction is wrong for something */
    expect(share.rowsLow).toBeLessThan(share.tilesLow)
    expect(share.rowsHigh).toBeGreaterThan(share.tilesHigh)
  })

  it('counts the name length and refuses to let it decide, because the ranges cross', () => {
    const share = band(facesNow(), (f) => f.nameWords)
    /* the shortest names on the sheet and some of the longest are both
       on registers, so the ranges overlap and nothing can be drawn
       between them */
    expect(share.rowsLow).toBeLessThan(share.tilesLow)
    expect(share.rowsHigh).toBeGreaterThanOrEqual(share.tilesLow)
  })

  it('says what it counted, and never a figure it did not', () => {
    const faces = facesNow()
    const boats = faces.find((f) => f.name === 'Boats')
    expect(boats?.why).toContain(`${boats?.pictured.toLocaleString('en-AU')} of`)
    expect(boats?.why).toContain('catalogue')
    /* the rejected signals are named on the panel rather than left as
       a silence — an admin overruling this deserves the basis */
    expect(boats?.alsoCounted).toContain('carry a price')
    expect(boats?.alsoCounted).toContain('neither decides the face')
    /* a module with no rows claims nothing at all */
    const { entities, rowsByEntity } = useProjectStore.getState()
    const empty = moduleFace([], rowsByEntity)
    expect(empty.mode).toBe('rows')
    expect(empty.alsoCounted).toBe('')
    expect(entities).toBeDefined()
  })
})
