/* ============================================================
   RESOLVING A FAST ACTION AGAINST THE PROJECT AS IT STANDS.

   The claim links.ts makes is that a stored button is a GUESS
   about a project that has gone on changing, and that a button
   which opens nothing is worse than no button. These are the
   cases that hold it to that:

     · a link to a struck table is not drawn, and not deleted
     · a renamed table renames its button, unless the person
       gave it a word of their own
     · the tray offers only what exists, and never what is
       already up there
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef, ModuleDef } from '@/types/model'
import { defaultArrangement, withLinkAdded, type Arrangement } from './arrangement'
import { BAND_NAME, linkOffers, resolveLink, resolveLinks } from './links'

const STAMP = '2026-08-01T00:00:00.000Z'

const table = (id: string, name: string, extra: Partial<EntityDef> = {}): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields: [],
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...extra,
})

const moduleDef = (id: string, name: string, order: number, description = ''): ModuleDef => ({
  id,
  name,
  description,
  tableIds: [`t-${id}`],
  capabilities: ['browse'],
  index: 'rows',
  accent: 'blue',
  order,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const ENTITIES: Record<string, EntityDef> = {
  'e-hi': table('e-hi', 'Highfield Inflatables'),
  'e-st': table('e-st', 'Stacer'),
  'e-join': table('e-join', 'Boat × Motor', { role: 'join' }),
  'e-old': table('e-old', 'Obsolete trailers', { retired: true }),
}

const MODULES: Record<string, ModuleDef> = {
  'm-1': moduleDef('m-1', 'Highfield', 0, 'The inflatables counter.'),
}

const COUNT = (id: string): number => (id === 'e-hi' ? 112 : 0)

describe('one link', () => {
  it('calls a table by its own name, and says how much is in it', () => {
    const got = resolveLink(
      { id: 'l1', target: { kind: 'table', entityId: 'e-hi' } },
      ENTITIES,
      MODULES,
      COUNT,
    )
    expect(got?.label).toBe('Highfield Inflatables')
    expect(got?.note).toBe('112 rows')
    expect(got?.renamed).toBe(false)
    expect(got?.mark).toBe('table')
  })

  it('never writes "1 rows"', () => {
    const got = resolveLink(
      { id: 'l1', target: { kind: 'table', entityId: 'e-st' } },
      ENTITIES,
      MODULES,
      (id) => (id === 'e-st' ? 1 : 0),
    )
    expect(got?.note).toBe('1 row')
  })

  it('keeps the person’s own word for it, and remembers what it really is', () => {
    const got = resolveLink(
      { id: 'l1', target: { kind: 'table', entityId: 'e-hi' }, name: 'Monday’s list' },
      ENTITIES,
      MODULES,
      COUNT,
    )
    expect(got?.label).toBe('Monday’s list')
    expect(got?.renamed).toBe(true)
    expect(got?.subject).toBe('Highfield Inflatables')
  })

  it('a name identical to the subject’s is not a rename', () => {
    const got = resolveLink(
      { id: 'l1', target: { kind: 'table', entityId: 'e-hi' }, name: 'Highfield Inflatables' },
      ENTITIES,
      MODULES,
      COUNT,
    )
    expect(got?.renamed).toBe(false)
  })

  it('A LINK TO A TABLE THAT IS GONE RESOLVES TO NOTHING', () => {
    expect(
      resolveLink(
        { id: 'l1', target: { kind: 'table', entityId: 'e-vanished' } },
        ENTITIES,
        MODULES,
        COUNT,
      ),
    ).toBeNull()
  })

  it('a link to a module that is gone resolves to nothing', () => {
    expect(
      resolveLink(
        { id: 'l1', target: { kind: 'module', moduleId: 'm-gone' } },
        ENTITIES,
        MODULES,
        COUNT,
      ),
    ).toBeNull()
  })

  it('a module carries the admin’s own line, never one derived from its name', () => {
    const got = resolveLink(
      { id: 'l1', target: { kind: 'module', moduleId: 'm-1' } },
      ENTITIES,
      MODULES,
      COUNT,
    )
    expect(got?.note).toBe('The inflatables counter.')
  })

  it('every place the app has one of resolves, with the rail’s own words', () => {
    for (const kind of [
      'new-quote',
      'find',
      'quotes',
      'customers',
      'rules',
      'data-model',
      'modules',
    ] as const) {
      const got = resolveLink({ id: kind, target: { kind } }, ENTITIES, MODULES, COUNT)
      expect(got, kind).not.toBeNull()
      expect(got?.label.length).toBeGreaterThan(0)
    }
  })
})

describe('the whole row', () => {
  it('separates what can be drawn from what is stranded, keeping the order of both', () => {
    const links = [
      { id: 'a', target: { kind: 'new-quote' as const } },
      { id: 'b', target: { kind: 'table' as const, entityId: 'e-vanished' } },
      { id: 'c', target: { kind: 'table' as const, entityId: 'e-hi' } },
    ]
    const got = resolveLinks(links, ENTITIES, MODULES, COUNT)
    expect(got.live.map((l) => l.id)).toEqual(['a', 'c'])
    expect(got.stranded.map((l) => l.id)).toEqual(['b'])
  })

  it('A STRANDED LINK IS NOT DELETED — it is simply not drawn', () => {
    const links = [{ id: 'b', target: { kind: 'table' as const, entityId: 'e-vanished' } }]
    const got = resolveLinks(links, ENTITIES, MODULES, COUNT)
    expect(got.live).toEqual([])
    expect(got.stranded).toEqual(links)
  })
})

describe('what the tray can offer', () => {
  it('offers this dealer’s tables, this dealer’s modules, and the app’s own places', () => {
    const offers = linkOffers(defaultArrangement(), ENTITIES, MODULES)
    const bands = new Set(offers.map((o) => o.band))
    expect(bands).toEqual(new Set(['places', 'tables', 'modules']))
    for (const band of bands) expect(BAND_NAME[band].length).toBeGreaterThan(0)
  })

  it('never offers a join or a retired table — neither is a place to stand', () => {
    const offers = linkOffers(defaultArrangement(), ENTITIES, MODULES)
    const labels = offers.map((o) => o.label)
    expect(labels).toContain('Highfield Inflatables')
    expect(labels).not.toContain('Boat × Motor')
    expect(labels).not.toContain('Obsolete trailers')
  })

  it('never offers what is already a button', () => {
    const a = defaultArrangement()
    const offers = linkOffers(a, ENTITIES, MODULES)
    for (const l of a.links) {
      expect(offers.some((o) => o.target.kind === l.target.kind)).toBe(false)
    }
  })

  it('drops a table the moment it becomes a button', () => {
    let a: Arrangement = { cards: [], links: [], touched: true }
    expect(linkOffers(a, ENTITIES, MODULES).some((o) => o.label === 'Stacer')).toBe(true)
    a = withLinkAdded(a, { kind: 'table', entityId: 'e-st' })
    expect(linkOffers(a, ENTITIES, MODULES).some((o) => o.label === 'Stacer')).toBe(false)
  })

  it('offers nothing that does not exist — an empty project is the seven doors and no more', () => {
    const offers = linkOffers({ cards: [], links: [], touched: true }, {}, {})
    expect(offers.every((o) => o.band === 'places')).toBe(true)
    expect(offers).toHaveLength(7)
  })
})
