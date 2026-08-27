/* ============================================================
   WHAT THE MODULES GRID DRAWS A CARD FOR.

   THE FAULT THIS IS THE FIX FOR: the grid drew nine cards named for
   CATEGORIES — Boats, Motors, Trailers — each of which said
   "Highfield Inflatables + 6 more". The fourteen brands a dealer
   actually opens were names inside a card that named one of them
   and counted the rest.

   THE FOUR THINGS GUARDED HERE, and each of them is a way the split
   can go wrong quietly:

     1. A MODULE OF ONE TABLE IS ONE PLACE, NAMED FOR THE MODULE.
        Splitting it would rename Labour Rates to whatever its table
        is called, which is a rename nobody asked for.
     2. A MODULE OF MANY IS ONE PLACE PER TABLE, NAMED FOR THE
        TABLE. This is the whole correction.
     3. A PLACE COUNTS ITS OWN TABLE AND NOT ITS MODULE'S. A card
        reading 810 over a page drawing 588 is exactly the
        disagreement `read.ts` exists to prevent, one floor up.
     4. A CHIP EXISTS ONLY FOR A KIND THAT IS PRESENT. A filter that
        always finds nothing teaches a person not to trust the row.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'
import { moduleAt, placeFilters, placesOf, placesUnder } from './places'

const STAMP = '2026-01-01T00:00:00.000Z'

const table = (id: string, name: string, kind: EntityDef['kind']): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind,
  fields: [{ id: `${id}-name`, name: 'Name', type: 'text' }],
  position: { x: 0, y: 0 },
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

const rows = (id: string, n: number): RowData[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${id}-${i}`,
    entityId: id,
    values: { [`${id}-name`]: `row ${i}` },
    createdAt: STAMP,
    updatedAt: STAMP,
  }))

const ENTITIES: Record<string, EntityDef> = {
  hf: table('hf', 'Highfield Inflatables', 'boat'),
  st: table('st', 'Stacer', 'boat'),
  ya: table('ya', 'Yamaha Outboards', 'motor'),
  lr: table('lr', 'Labour Rates', 'custom'),
}
const ROWS: Record<string, RowData[]> = {
  hf: rows('hf', 5),
  st: rows('st', 3),
  ya: rows('ya', 2),
  lr: rows('lr', 1),
}
const MODULES: Record<string, ModuleDef> = {
  boats: module('boats', 'Boats', ['hf', 'st'], 0),
  motors: module('motors', 'Motors', ['ya'], 1),
  labour: module('labour', 'Labour Rates', ['lr'], 2),
}

describe('what the modules grid draws a card for', () => {
  const places = placesOf(MODULES, ENTITIES, ROWS)

  it('splits a module of many into one place per table, named for the table', () => {
    expect(places.map((p) => p.name)).toEqual([
      'Highfield Inflatables',
      'Stacer',
      'Motors',
      'Labour Rates',
    ])
  })

  it('leaves a module of one table alone, named for the module', () => {
    const one = places.find((p) => p.moduleId === 'motors')
    expect(one?.tableId).toBeUndefined()
    expect(one?.name).toBe('Motors')
  })

  it('counts a split place off its own table, never off the module', () => {
    expect(places.find((p) => p.name === 'Highfield Inflatables')?.census.items).toBe(5)
    expect(places.find((p) => p.name === 'Stacer')?.census.items).toBe(3)
  })

  it('draws the reorder arrows once per module, on the card that leads its run', () => {
    expect(places.filter((p) => p.leads).map((p) => p.moduleId)).toEqual([
      'boats',
      'motors',
      'labour',
    ])
  })

  it('offers a chip only for a kind that is present, and All counts everything', () => {
    const chips = placeFilters(places)
    expect(chips.map((c) => c.label)).toEqual(['All', 'Boats', 'Motors', 'Custom table'])
    expect(chips[0]?.count).toBe(4)
    expect(placesUnder(places, 'boat').map((p) => p.name)).toEqual([
      'Highfield Inflatables',
      'Stacer',
    ])
    expect(placesUnder(places, 'all')).toHaveLength(4)
  })
})

describe('narrowing a module to one of its tables', () => {
  it('keeps everything but the tables — the verbs and the id are the module’s', () => {
    const boats = MODULES.boats as ModuleDef
    const at = moduleAt(boats, 'hf')
    expect(at.tableIds).toEqual(['hf'])
    expect(at.id).toBe(boats.id)
    expect(at.capabilities).toEqual(boats.capabilities)
  })

  it('refuses a table that is not this module’s, rather than emptying it', () => {
    const boats = MODULES.boats as ModuleDef
    expect(moduleAt(boats, 'ya').tableIds).toEqual(['hf', 'st'])
  })

  it('leaves a one-table module whole, so it can never narrow to nothing', () => {
    const motors = MODULES.motors as ModuleDef
    expect(moduleAt(motors, 'ya').tableIds).toEqual(['ya'])
  })
})
