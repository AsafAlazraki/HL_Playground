/* ============================================================
   THE DOORS — what earns one, what it counts, and what it opens.

   THE FAULT THESE ARE THE FIX FOR: every route from the front
   door into the catalogue went through a BRAND. The modules card
   opens Highfield, or Yamaha, or Stacer; nothing on the dashboard
   answered "show me the boats", which is what a person standing
   at a counter actually says. PHASE_TWO §2.1 asked for four
   photographic doors by kind and `DEFAULT_CARDS` drew none.

   THE FIVE THINGS GUARDED HERE, each of them a way a door can go
   quietly wrong:

     1. A DOOR IS A KIND BEHIND EXACTLY ONE MODULE. A door with
        two destinations is not a door, and picking the bigger of
        them would be the app inventing a primary.
     2. IT COUNTS WHAT IS BEHIND IT, off the same census the page
        it opens uses — a door reading 810 over a page drawing 588
        is the disagreement `read.ts` exists to prevent.
     3. HISTORY IS NOT STOCK. A retired place is drawn on the
        modules card and said to be held; behind a door that says
        what you sell it would be a room with nothing in it.
     4. THE NOUN IS THE DEALER'S, and the kind's own plural only
        where the places disagree.
     5. THE PHOTOGRAPH IS A REAL ROW OF THAT KIND, or there is
        none. Nothing is substituted, ever.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, ImageRef, ModuleDef, RowData } from '@/types/model'
import { placesOf } from '@/features/modules/places'
import { doorPicture, doorsOf } from './doors'

const STAMP = '2026-01-01T00:00:00.000Z'

const table = (
  id: string,
  name: string,
  kind: EntityDef['kind'],
  opts: { pictures?: boolean; retired?: boolean } = {},
): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind,
  fields: [
    { id: `${id}-name`, name: 'Name', type: 'text' },
    ...(opts.pictures ? [{ id: `${id}-img`, name: 'Photo', type: 'image' as const }] : []),
  ],
  position: { x: 0, y: 0 },
  ...(opts.retired ? { retired: true } : {}),
  createdAt: STAMP,
  updatedAt: STAMP,
})

const module = (id: string, name: string, tableIds: string[], order: number): ModuleDef => ({
  id,
  name,
  description: '',
  tableIds,
  capabilities: ['browse', 'search', 'open'],
  index: 'tiles',
  accent: 'blue',
  order,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const shot = (src: string, w?: number, h?: number): ImageRef[] => [
  { id: `img-${src}`, src, ...(w !== undefined && h !== undefined ? { w, h } : {}) },
]

const rows = (id: string, n: number, from = 0): RowData[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${id}-${i + from}`,
    entityId: id,
    values: { [`${id}-name`]: `row ${i + from}` },
    createdAt: STAMP,
    updatedAt: STAMP,
  }))

/* Two boat brands in one module, one motor brand in its own, a
   trailer brand and the obsolete band beside it, and packages
   deliberately split across two modules — which is the shape the
   real set has and the reason the one-module rule exists. */
const ENTITIES: Record<string, EntityDef> = {
  hf: table('hf', 'Highfield Inflatables', 'boat', { pictures: true }),
  st: table('st', 'Stacer', 'boat', { pictures: true }),
  ya: table('ya', 'Yamaha Outboards', 'motor'),
  dn: table('dn', 'Dunbier', 'trailer'),
  ob: table('ob', 'Obsolete trailers', 'trailer', { retired: true }),
  fp: table('fp', 'Factory Packages', 'package'),
  df: table('df', 'Dealer Fit', 'package'),
}

const ROWS: Record<string, RowData[]> = {
  hf: rows('hf', 5),
  st: rows('st', 3),
  ya: rows('ya', 2),
  dn: rows('dn', 4),
  ob: rows('ob', 9),
  fp: rows('fp', 1),
  df: rows('df', 1),
}
/* THREE PICTURES OF ONE KIND, AND THE FIRST ONE IS THE SMALLEST.
   Highfield's first two rows carry none at all, so finding one is
   a real search; the one it then finds is a 320x230 thumbnail and
   Stacer's is a 2560x1440 hero. Taking the first would draw the
   thumbnail, which is the fault measured on the real set — a grey
   hull crop on the Boats door and a wordmark on Trailers. */
ROWS.hf[2].values['hf-img'] = shot('https://example.test/hf-detail.jpg', 320, 230)
ROWS.hf[3].values['hf-img'] = shot('https://example.test/hf-logo.png', 400, 400)
ROWS.st[0].values['st-img'] = shot('https://example.test/stacer.jpg', 2560, 1440)

const MODULES: Record<string, ModuleDef> = {
  boats: module('boats', 'Boats', ['hf', 'st'], 0),
  motors: module('motors', 'Motors', ['ya'], 1),
  trailers: module('trailers', 'Trailers', ['dn', 'ob'], 2),
  factory: module('factory', 'Factory Packages', ['fp'], 3),
  fit: module('fit', 'Dealer Fit Packages', ['df'], 4),
}

const PLACES = placesOf(MODULES, ENTITIES, ROWS)
const DOORS = doorsOf(PLACES, MODULES, ENTITIES, ROWS)

describe('the catalogue, entered by kind', () => {
  it('draws a door for a kind that sits behind exactly one module', () => {
    expect(DOORS.map((d) => d.label)).toEqual(['Boats', 'Motors', 'Trailers'])
  })

  /* THE RULE THE WHOLE FILE TURNS ON. `package` is two places in
     two modules, so there is nothing single for a door to open —
     and choosing one of them would be a guess drawn as a fact. */
  it('draws no door for a kind spread across two modules', () => {
    expect(DOORS.map((d) => d.kind)).not.toContain('package')
    expect(PLACES.filter((p) => p.kind === 'package')).toHaveLength(2)
  })

  it('names each door with the kind own label, never a noun typed here', () => {
    expect(DOORS.find((d) => d.kind === 'motor')?.label).toBe('Motors')
  })

  it('counts what is behind it, summed off each place own census', () => {
    expect(DOORS.find((d) => d.kind === 'boat')?.items).toBe(8)
    expect(DOORS.find((d) => d.kind === 'boat')?.places).toBe(2)
  })

  /* HISTORY IS NOT STOCK. The obsolete band is nine rows and it is
     behind no door: `moduleCensus` counts a retired table at zero
     live, and the door does not count the place at all. */
  it('leaves a retired place out of the door entirely', () => {
    const trailers = DOORS.find((d) => d.kind === 'trailer')
    expect(trailers?.items).toBe(4)
    expect(trailers?.places).toBe(1)
    expect(trailers?.tableIds).toEqual(['dn'])
  })

  /* WHAT THE DOOR OPENS. `tableId` is the table the workspace
     should stand at, and it is set only where the kind IS one
     place — `undefined` is what tells `rememberPlace` to open the
     whole module, which is the entire difference between this and
     a tile on the modules card. */
  it('opens the whole module when the kind is more than one place', () => {
    const boats = DOORS.find((d) => d.kind === 'boat')
    expect(boats?.moduleId).toBe('boats')
    expect(boats?.tableId).toBeUndefined()
  })

  it('stands at the one table when the kind is a single split place', () => {
    const trailers = DOORS.find((d) => d.kind === 'trailer')
    expect(trailers?.moduleId).toBe('trailers')
    expect(trailers?.tableId).toBe('dn')
  })

  it('carries every live table behind it, in the places own order', () => {
    expect(DOORS.find((d) => d.kind === 'boat')?.tableIds).toEqual(['hf', 'st'])
  })

  /* THE PHOTOGRAPH IS A ROW'S, AND IT IS THE BIGGEST ONE THE KIND
     HAS. The plate is 225px wide; drawing a 320x230 thumbnail
     there is upscaling a detail crop into a showpiece, and on the
     real set the first-in-row-order rule picked exactly that. */
  it('takes the biggest photograph any row of that kind carries', () => {
    expect(DOORS.find((d) => d.kind === 'boat')?.picture?.src).toBe(
      'https://example.test/stacer.jpg',
    )
  })

  it('measures a picture nobody sized at nothing rather than guessing', () => {
    const unsized = { ...ROWS, st: rows('st', 3) }
    unsized.st[0].values['st-img'] = shot('https://example.test/unsized.jpg')
    /* the 400x400 beats both the 320x230 and the one with no size
       recorded, and nothing invents a size for the last of them */
    expect(doorPicture(['hf', 'st'], ENTITIES, unsized)?.src).toBe(
      'https://example.test/hf-logo.png',
    )
  })

  /* AND NOTHING IS SUBSTITUTED. A kind whose rows carry no picture
     gets no picture — never another kind's boat, never a stock
     image. The door draws the kind's own symbol instead, which is
     `PlaceMark`'s rule for a place with no logo. */
  it('gives a kind with no pictures no picture at all', () => {
    expect(DOORS.find((d) => d.kind === 'motor')?.picture).toBeUndefined()
    expect(doorPicture(['ya'], ENTITIES, ROWS)).toBeUndefined()
  })

  it('skips a table that has no picture column without reading its rows', () => {
    expect(doorPicture(['ya', 'st'], ENTITIES, ROWS)?.src).toBe(
      'https://example.test/stacer.jpg',
    )
  })

  /* THE DEALER'S OWN WORD. Both boat tables call their rows the
     same thing, so the door says it; where two places disagree the
     kind's own plural is the only word that is true of both. */
  it('says the row noun the places agree on', () => {
    const boats = DOORS.find((d) => d.kind === 'boat')
    expect(boats?.noun).toBe(PLACES.find((p) => p.tableId === 'hf')?.census.noun)
  })

  it('draws nothing at all for a project with no places', () => {
    expect(doorsOf([], {}, {}, {})).toEqual([])
  })

  /* A PLACE WITH NOTHING IN IT IS NOT A DOOR. An empty room is
     worse than no door: it is a press that spends a person's
     attention and hands back a blank page. */
  it('leaves out a kind whose places hold no live rows', () => {
    const empty = doorsOf(
      placesOf(MODULES, ENTITIES, { ...ROWS, ya: [] }),
      MODULES,
      ENTITIES,
      { ...ROWS, ya: [] },
    )
    expect(empty.map((d) => d.kind)).not.toContain('motor')
  })
})
