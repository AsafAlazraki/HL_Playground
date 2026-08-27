/* ============================================================
   WHAT IS LINKED TO A MODULE — that it is DERIVED, and that a thing
   with nothing in it is still named.

   The failure these guard against is the one production has: a fixed
   list of settings cards, so an attachment nobody wrote a card for is
   invisible. Every row here is counted off the project, and a count of
   zero is still a row — "no quotes have been raised here" is a fact
   about the place, and a missing line is not.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type {
  ColumnSection,
  EntityDef,
  ModuleDef,
  RoleDef,
  ViewDef,
} from '@/types/model'
import type { ColumnConcept } from '@/features/constraints/columns'
import { linkedThings, namedFew, LINK_NAME_CAP } from './links'

const AT = '2026-08-27T00:00:00.000Z'
const NO_CONCEPTS: ReadonlyMap<string, ColumnConcept> = new Map()
const NO_SECTIONS: ColumnSection[] = []

function table(id: string, name: string, extra: Partial<EntityDef> = {}): EntityDef {
  return {
    id,
    name,
    accent: 'graphite',
    kind: 'custom',
    sections: NO_SECTIONS,
    fields: [{ id: `${id}-f1`, name: 'Name', type: 'text' }],
    position: { x: 0, y: 0 },
    createdAt: AT,
    updatedAt: AT,
    ...extra,
  }
}

function makeModule(over: Partial<ModuleDef> = {}): ModuleDef {
  return {
    id: 'm1',
    name: 'Parts',
    description: '',
    tableIds: ['t1'],
    capabilities: ['browse', 'search', 'open'],
    index: 'rows',
    accent: 'graphite',
    order: 0,
    createdAt: AT,
    updatedAt: AT,
    ...over,
  }
}

const base = {
  views: {} as Record<string, ViewDef>,
  rules: {},
  constraints: [],
  conceptIndex: NO_CONCEPTS,
  quotes: [],
  roles: [] as RoleDef[],
  configures: false,
}

describe('every attachment is named, even an empty one', () => {
  it('draws all six rows for a module that has nothing attached', () => {
    const things = linkedThings({
      ...base,
      module: makeModule(),
      entities: { t1: table('t1', 'Fasteners') },
    })
    expect(things.map((t) => t.key)).toEqual([
      'tables',
      'detail',
      'related',
      'rules',
      'quotes',
      'access',
    ])
    /* nothing has been sold here yet, and it says so rather than
       leaving the reader to wonder whether quotes are even a thing */
    const quotes = things.find((t) => t.key === 'quotes')
    expect(quotes?.count).toBe(0)
    expect(quotes?.where).toContain('Quotes')
  })

  it('every row says where it is changed', () => {
    const things = linkedThings({
      ...base,
      module: makeModule(),
      entities: { t1: table('t1', 'Fasteners') },
    })
    for (const thing of things) {
      expect(thing.where.length).toBeGreaterThan(0)
      expect(thing.says.length).toBeGreaterThan(0)
    }
  })
})

describe('the counts come from the data', () => {
  it('counts the module’s own tables, and names them', () => {
    const things = linkedThings({
      ...base,
      module: makeModule({ tableIds: ['t1', 't2'] }),
      entities: { t1: table('t1', 'Fasteners'), t2: table('t2', 'Fluids') },
    })
    const tables = things.find((t) => t.key === 'tables')
    expect(tables?.count).toBe(2)
    expect(tables?.names).toEqual(['Fasteners', 'Fluids'])
  })

  it('counts the headings on the item page, and says so when there is none', () => {
    const view: ViewDef = {
      id: 'v1',
      name: 'Fasteners page',
      rootTableId: 't1',
      blocks: [{ id: 'b1', tableId: 't2' }],
      createdAt: AT,
      updatedAt: AT,
    }
    const entities = { t1: table('t1', 'Fasteners'), t2: table('t2', 'Fluids') }
    const withPage = linkedThings({
      ...base,
      module: makeModule({ viewId: 'v1' }),
      entities,
      views: { v1: view },
    })
    const detail = withPage.find((t) => t.key === 'detail')
    expect(detail?.count).toBe(1)
    expect(detail?.names).toEqual(['Fluids'])
    expect(detail?.says).toContain('Fasteners page')

    const withNone = linkedThings({ ...base, module: makeModule(), entities })
    expect(withNone.find((t) => t.key === 'detail')?.says).toContain('no item page')
  })

  it('counts a join reaching out of the module, and never one it holds', () => {
    const entities = {
      t1: table('t1', 'Fasteners'),
      t2: table('t2', 'Fluids'),
      j1: table('j1', 'Fasteners × Fluids', {
        role: 'join',
        fields: [
          { id: 'a', name: 'Fastener', type: 'reference', refEntityId: 't1' },
          { id: 'b', name: 'Fluid', type: 'reference', refEntityId: 't2' },
        ],
      }),
    }
    const things = linkedThings({ ...base, module: makeModule(), entities })
    const related = things.find((t) => t.key === 'related')
    /* the JOIN is what carries the reference, so what this module
       reaches through it is the join itself plus the far table */
    expect(related?.count).toBeGreaterThan(0)
    expect(related?.names.join(' ')).toContain('on 1 of 1')
  })

  it('counts the roles that hold access, and says the module is open when none do', () => {
    const roles: RoleDef[] = [{ id: 'r1', name: 'Storeman', createdAt: AT, updatedAt: AT }]
    const entities = { t1: table('t1', 'Fasteners') }

    const open = linkedThings({ ...base, module: makeModule(), entities, roles })
    const openRow = open.find((t) => t.key === 'access')
    expect(openRow?.count).toBe(0)
    expect(openRow?.says).toContain('open to everyone')

    const closed = linkedThings({
      ...base,
      module: makeModule({ access: [{ roleId: 'r1', capabilities: ['browse'] }] }),
      entities,
      roles,
    })
    const closedRow = closed.find((t) => t.key === 'access')
    expect(closedRow?.count).toBe(1)
    expect(closedRow?.names).toEqual(['Storeman'])
  })

  it('sends the reader to the verb that opens the rules when it is off', () => {
    const entities = { t1: table('t1', 'Fasteners') }
    const off = linkedThings({ ...base, module: makeModule(), entities })
    expect(off.find((t) => t.key === 'rules')?.where).toContain('Set rules')

    const on = linkedThings({ ...base, module: makeModule(), entities, configures: true })
    expect(on.find((t) => t.key === 'rules')?.where).toContain('above')
  })
})

describe('naming a few and counting the rest', () => {
  it('names at most the cap and says how many were left off', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f']
    const { shown, more } = namedFew({
      key: 'x',
      name: 'things',
      count: names.length,
      says: '',
      home: 'settings',
      where: '',
      names,
    })
    expect(shown).toHaveLength(LINK_NAME_CAP)
    expect(more).toBe(names.length - LINK_NAME_CAP)
  })

  it('leaves nothing off when there is nothing to leave off', () => {
    const { shown, more } = namedFew({
      key: 'x',
      name: 'things',
      count: 0,
      says: '',
      home: 'settings',
      where: '',
      names: [],
    })
    expect(shown).toEqual([])
    expect(more).toBe(0)
  })
})
