/* ============================================================
   THE SPLIT RULE, ON TABLES THAT ARE NOT BOATS.

   `northsideModules.test.ts` asserts the rule against the real
   workbook, which is the proof it is worth anything. This asserts it
   against a pharmacy, a plant hire yard and a table that declares
   nothing — because the rule's whole claim is that it reads
   `EntityDef.kind` and never a marine list, and a rule that has only
   ever been run on one dealer's sheet has not been shown to.

   THE THREE THINGS IT MUST GET RIGHT:
     1. tables that agree are one place, however many there are;
     2. tables of two kinds are two parts, and the sentence says which;
     3. `custom` is the ABSENCE of a kind — two tables carrying it do
        not agree with each other, and the sentence names each of them
        by its own name rather than printing the word `custom` at
        somebody who never typed it.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, ModuleDef, TableKind } from '@/types/model'
import { siblingOffer, splitReading } from './split'

const table = (id: string, name: string, kind: TableKind | undefined): EntityDef =>
  ({
    id,
    name,
    kind,
    fields: [],
    role: 'base',
    accent: 'graphite',
    createdAt: '',
    updatedAt: '',
  }) as unknown as EntityDef

const moduleOf = (name: string, tableIds: string[]): ModuleDef =>
  ({
    id: 'm1',
    name,
    description: '',
    tableIds,
    capabilities: ['browse'],
    index: 'rows',
    accent: 'graphite',
    order: 0,
    createdAt: '',
    updatedAt: '',
  }) as unknown as ModuleDef

const world = (...tables: EntityDef[]): Record<string, EntityDef> =>
  Object.fromEntries(tables.map((t) => [t.id, t]))

describe('is this module one place, or a bag?', () => {
  it('calls tables that agree one place, however many there are', () => {
    const entities = world(
      table('a', 'Stock Bikes', 'boat'),
      table('b', 'Demo Bikes', 'boat'),
      table('c', 'Trade-Ins', 'boat'),
    )
    const r = splitReading(moduleOf('Bikes', ['a', 'b', 'c']), entities)
    expect(r.coherent).toBe(true)
    expect(r.parts).toHaveLength(1)
    expect(r.say).toBe('')
  })

  it('says nothing about an empty module, and nothing about a module of one', () => {
    expect(splitReading(moduleOf('Nothing', []), {}).coherent).toBe(true)
    const entities = world(table('a', 'Scripts', 'accessory'))
    expect(splitReading(moduleOf('Dispensary', ['a']), entities).coherent).toBe(true)
  })

  it('reports two kinds as two parts, and names the kinds not the keys', () => {
    const entities = world(
      table('a', 'Fittings', 'accessory'),
      table('b', 'Hose Reels', 'accessory'),
      table('c', 'Service Kits', 'package'),
    )
    const r = splitReading(moduleOf('Sundries', ['a', 'b', 'c']), entities)
    expect(r.coherent).toBe(false)
    expect(r.parts.map((p) => p.tableIds)).toEqual([['a', 'b'], ['c']])
    /* the kind's own LABEL, plural — never the enum key, which is a
       schema term the person reading this never typed */
    expect(r.say).toContain('2 tables of accessories')
    expect(r.say).toContain('1 table of packages')
    expect(r.say).not.toContain('accessory,')
  })

  it('treats `custom` as no kind at all, so two of them do not agree', () => {
    const entities = world(
      table('a', 'Delivery Fees', 'custom'),
      table('b', 'Callout Rates', 'custom'),
    )
    const r = splitReading(moduleOf('Charges', ['a', 'b']), entities)
    expect(r.coherent).toBe(false)
    expect(r.parts).toHaveLength(2)
    /* each is named by ITS OWN NAME. A person who never chose a kind
       should not be shown the word `custom` as though they had. */
    expect(r.say).toContain('Delivery Fees, which declares no kind at all')
    expect(r.say).toContain('Callout Rates, which declares no kind at all')
    expect(r.say).not.toContain('customs')
  })

  it('treats a missing kind exactly as it treats `custom`', () => {
    const entities = world(table('a', 'Rounds', undefined), table('b', 'Rounds II', undefined))
    expect(splitReading(moduleOf('Odds', ['a', 'b']), entities).parts).toHaveLength(2)
  })

  it('skips a table that is no longer on the sheet rather than counting a hole', () => {
    const entities = world(table('a', 'Hire Items', 'trailer'))
    const r = splitReading(moduleOf('Hire', ['a', 'gone']), entities)
    expect(r.coherent).toBe(true)
    expect(r.parts[0].tableIds).toEqual(['a'])
  })

  it('never proposes a merge — it is asked about one module and answers about one', () => {
    /* Two modules of the same kind are two decisions somebody made.
       The reading is per-module by construction, so there is no shape
       in which this file could suggest collapsing a dashboard. */
    const entities = world(
      table('a', 'Factory Packages', 'package'),
      table('b', 'Dealer Fit Packages', 'package'),
    )
    expect(splitReading(moduleOf('Factory Packages', ['a']), entities).coherent).toBe(true)
    expect(splitReading(moduleOf('Dealer Fit Packages', ['b']), entities).coherent).toBe(true)
  })
})

/* ============================================================
   AND THE SAME RULE, ONE MOMENT EARLIER.

   The reading above is a post-mortem. `siblingOffer` is the panel
   that MAKES a module asking the same question before there is
   anything to complain about — and the case it exists for is the one
   the panel used to get wrong: `e.kind === picked.kind` is true for
   two tables that both declared nothing, so an unclassified register
   was offered every other unclassified register with a tick box
   beside it.
   ============================================================ */
describe('what a new module is offered to be built from', () => {
  it('offers the tables that agree, by name', () => {
    const picked = table('a', 'Zebra Hire', 'trailer')
    const offer = siblingOffer(picked, [
      picked,
      table('b', 'Mowers', 'trailer'),
      table('c', 'Apron Hire', 'trailer'),
      table('d', 'Service Kits', 'package'),
    ])
    expect(offer.siblings.map((e) => e.name)).toEqual(['Apron Hire', 'Mowers'])
    expect(offer.why).toBe('')
  })

  it('offers NOTHING to a table that declares no kind, and says why', () => {
    const picked = table('a', 'Labour Rates', 'custom')
    const offer = siblingOffer(picked, [
      picked,
      table('b', 'Oils & Consumables', 'custom'),
      table('c', 'Registration Costs', undefined),
      table('d', 'Fittings', 'accessory'),
    ])
    expect(offer.siblings).toEqual([])
    /* the count is the other UNCLASSIFIED tables, not every other
       table — the accessory is somebody's classified data and has
       nothing to do with this refusal */
    expect(offer.why).toContain('Labour Rates declares no kind')
    expect(offer.why).toContain('2 other tables declare none either')
    expect(offer.why).toContain('not agreement')
  })

  it('says the singular when exactly one other table is in the same position', () => {
    const picked = table('a', 'Callout Rates', 'custom')
    const offer = siblingOffer(picked, [picked, table('b', 'Delivery Fees', 'custom')])
    expect(offer.why).toContain('1 other table declares none either')
    expect(offer.why).not.toContain('tables declare none')
  })

  it('refuses gently when it is the only unclassified table on the sheet', () => {
    const picked = table('a', 'Rounds', undefined)
    const offer = siblingOffer(picked, [picked, table('b', 'Hulls', 'boat')])
    expect(offer.siblings).toEqual([])
    expect(offer.why).toContain('It can be a module on its own')
    expect(offer.why).not.toContain('other')
  })

  it('never offers what the caller had already withheld', () => {
    /* `offered` is the panel's own list. This narrows it and may not
       widen it, so a retired or join table the caller left out stays
       left out however well its kind agrees. */
    const picked = table('a', 'Stock Bikes', 'boat')
    const offer = siblingOffer(picked, [picked, table('b', 'Demo Bikes', 'boat')])
    expect(offer.siblings.map((e) => e.id)).toEqual(['b'])
  })

  it('agrees with the reading — anything it offers builds a coherent module', () => {
    /* THE POINT OF SHARING THE PREDICATE. Whatever the panel offers,
       ticking every box must leave a module `splitReading` calls one
       place. Two answers to one question was the defect. */
    const picked = table('a', 'Scripts', 'accessory')
    const all = [
      picked,
      table('b', 'Dressings', 'accessory'),
      table('c', 'Fridge Lines', 'accessory'),
      table('d', 'Dispensing Fees', 'custom'),
    ]
    const offer = siblingOffer(picked, all)
    const ids = [picked.id, ...offer.siblings.map((e) => e.id)]
    const entities = world(...all)
    expect(splitReading(moduleOf('Dispensary', ids), entities).coherent).toBe(true)
  })
})
