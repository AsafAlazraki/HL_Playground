/* ============================================================
   THE HAND-OVER, MEASURED — against the whole seeded sheet.

   `handover.ts` makes three claims that are claims about DATA, and
   a claim about data belongs in a test rather than in a comment,
   because the day the sheet changes a comment goes stale in
   silence and this goes red:

     1 · IT INVENTS NO SENTENCES. Every reason the catalogue gives
         for withholding "Configure this one" is character-for-
         character the reason the New quote picker gives for the
         same place. Two voices about a dealer's own modules is the
         fault this file exists to prevent.
     2 · IT REFUSES EXACTLY WHAT THE PICKER REFUSES. A table the
         picker will sell can be configured from the catalogue; a
         table the picker shuts cannot. Not "roughly", per table,
         over all 25 of them.
     3 · A JOIN TABLE IS SILENT, NOT REFUSED. 28 of the 53 tables
         on this sheet are pairings, they can be opened in the
         catalogue from All tables, and none of them gets a
         sentence explaining a door nobody looked for.

   Plus the narrowing figure `handover.ts` quotes for its cost.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'

/* THE MODULES ARE MINTED THROUGH THE STORE, not carried on the
   snapshot — `northside.ts` says so in as many words — so the seed
   has to be loaded rather than built. Same mock and same reason as
   `features/modules/face.test.ts`: the repository is IndexedDB. */
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
const { quoteDoors } = await import('@/features/quote/start')
const { handoverFor } = await import('./handover')

loadNorthsideProject()

const sheet = (): {
  modules: Record<string, ModuleDef>
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
} => {
  const { modules, entities, rowsByEntity } = useProjectStore.getState()
  return { modules, entities, rowsByEntity }
}

const verdict = (entity: EntityDef) => {
  const { modules, entities, rowsByEntity } = sheet()
  return handoverFor(entity, modules, entities, rowsByEntity)
}

const named = (name: string): EntityDef => {
  const found = Object.values(sheet().entities).find((e) => e.name === name)
  if (!found) throw new Error(`the seed no longer carries ${name}`)
  return found
}

const tablesOf = (role: 'base' | 'join'): EntityDef[] =>
  Object.values(sheet().entities).filter((e) => (e.role ?? 'base') === role)

/** Every door the New quote picker draws, over the WHOLE sheet —
 *  the surface this one must not disagree with. */
const pickerDoors = () => {
  const { modules, entities, rowsByEntity } = sheet()
  return quoteDoors(modules, entities, rowsByEntity)
}

describe('the sheet this is measured against', () => {
  it('is nine modules over 25 stock tables and 28 pairings', () => {
    expect(Object.keys(sheet().modules).length).toBe(9)
    expect(tablesOf('base').length).toBe(25)
    expect(tablesOf('join').length).toBe(28)
    /* the picker's own count, and the figure the rail draws beside
       Modules — 25 places, not 9 */
    expect(pickerDoors().length).toBe(25)
  })
})

describe('1 · it invents no sentences', () => {
  it('every refusal is the picker’s own, character for character', () => {
    const doors = pickerDoors()
    for (const entity of tablesOf('base')) {
      const said = verdict(entity).why
      if (said === '') continue
      const door =
        doors.find((d) => d.tableId === entity.id) ??
        doors.find((d) => d.tableId === undefined && d.module.tableIds.includes(entity.id))
      expect(door, entity.name).toBeDefined()
      expect(said, entity.name).toBe(door?.refusal)
    }
  })

  it('names the place it is refused in, never the category it is filed under', () => {
    /* `quoteDoors` renames the narrowed module to the PLACE's name
       for exactly this reason: a refusal about Rigging Kits that
       said "Parts & Accessories cannot raise a price" would name a
       thing the person is not looking at. */
    const said = verdict(named('Rigging Kits')).why
    expect(said).toContain('Rigging Kits')
    expect(said).not.toContain('Parts & Accessories')
  })

  it('says which switch would change it, by the switch’s own name', () => {
    expect(verdict(named('Labour Rates')).why).toContain('Quote')
  })
})

describe('2 · it refuses exactly what the picker refuses', () => {
  it('agrees on all 25 stock tables', () => {
    const doors = pickerDoors()
    const disagreements: string[] = []
    for (const entity of tablesOf('base')) {
      const door =
        doors.find((d) => d.tableId === entity.id) ??
        doors.find((d) => d.tableId === undefined && d.module.tableIds.includes(entity.id))
      const picker = door !== undefined && door.refusal === ''
      if (verdict(entity).can !== picker) disagreements.push(entity.name)
    }
    expect(disagreements).toEqual([])
  })

  it('lets a boat through, and it is the whole point of the door', () => {
    for (const name of ['Formosa', 'Highfield Inflatables', 'Yamaha Outboards']) {
      expect(verdict(named(name)), name).toEqual({ can: true, why: '' })
    }
  })

  it('shuts the seven the picker shuts — six on their verbs, one on its stock', () => {
    const shut = tablesOf('base').filter((e) => !verdict(e).can)
    expect(shut.map((e) => e.name).sort()).toEqual([
      'Dealer Fit Packages',
      'Labour Rates',
      'OBSOLETE Trailers — No Longer Available',
      'Oils & Consumables',
      'Parts & Accessories',
      'Registration Costs',
      'Rigging Kits',
    ])
  })

  it('shuts a retired table on the fact that it is history, not on its verbs', () => {
    /* Trailers DOES declare Quote. The obsolete band is refused
       because there is nothing left in it to offer, which is the
       sentence `retiredTablesSentence` writes. */
    const said = verdict(named('OBSOLETE Trailers — No Longer Available')).why
    expect(said).toContain('history rather than stock')
  })
})

describe('3 · a join table is silent, not refused', () => {
  it('gives all 28 pairings no act and no sentence', () => {
    for (const entity of tablesOf('join')) {
      expect(verdict(entity), entity.name).toEqual({ can: false, why: '' })
    }
  })

  it('but a stock table in no module at all is told why', () => {
    const orphan: EntityDef = { ...named('Formosa'), id: 'not-in-any-module' }
    const said = verdict(orphan)
    expect(said.can).toBe(false)
    expect(said.why).toContain('Formosa')
    expect(said.why).toContain('not in any of your modules')
  })
})

describe('the narrowing, which is the cost figure in the header', () => {
  it('asks about 7 places instead of 25 for a boat', () => {
    const { modules, entities, rowsByEntity } = sheet()
    const formosa = named('Formosa')
    const holders = Object.values(modules).filter((m) => m.tableIds.includes(formosa.id))
    expect(holders.length).toBe(1)
    expect(quoteDoors(holders, entities, rowsByEntity).length).toBe(7)
    expect(quoteDoors(modules, entities, rowsByEntity).length).toBe(25)
  })
})
