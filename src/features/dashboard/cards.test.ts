/* ============================================================
   THE ARITHMETIC BEHIND EVERY FIGURE ON THE DASHBOARD.

   The point of this suite is the claim the feature makes about
   itself: NOTHING IS INVENTED. So each case fixes what a number
   on the page is allowed to mean, and the awkward cases are the
   ones worth having:

     · quotes exist and none is mine — a different sentence from
       no quotes at all, and the one a dashboard gets wrong
     · a remembered row that has since been deleted is DROPPED,
       not drawn as a dead link
     · a join is not stock and a retired table is not stock, so
       neither inflates "what you sell"
     · a rule with no `severity` blocks, because that is the
       contract's default for every rule authored before the
       field existed — counting it as a warning would be this
       dashboard inventing a permission
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type {
  ConstraintDef,
  EntityDef,
  ModuleDef,
  RowData,
} from '@/types/model'
import type { LintFinding } from '@/lib/lint'
import type { QuoteDef } from '@/features/quote'
import {
  CARDS,
  biggestTables,
  fileTally,
  firstName,
  greeting,
  isStockTable,
  moduleRows,
  plural,
  resolveRecent,
  rollFindings,
  rollQuotes,
  rollRules,
} from './cards'
import { CARD_IDS, DEFAULT_CARDS } from './arrangement'

/* ---------------------------------------------------------- */
/* Fixtures — small, and shaped exactly like the contract      */
/* ---------------------------------------------------------- */

const STAMP = '2026-08-01T00:00:00.000Z'

const table = (id: string, name: string, extra: Partial<EntityDef> = {}): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields: [{ id: `${id}-f1`, name: 'Model', type: 'text' }],
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...extra,
})

const rows = (entityId: string, n: number): RowData[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${entityId}-r${i}`,
    entityId,
    values: { [`${entityId}-f1`]: `Model ${i}` },
    createdAt: STAMP,
    updatedAt: STAMP,
  }))

const quote = (over: Partial<QuoteDef>): QuoteDef => ({
  id: 'q-1',
  reference: 'Q-0001',
  state: 'draft',
  viewId: 'v-1',
  rootTableId: 't-boat',
  rootRowId: 't-boat-r0',
  subjectLabel: 'Highfield Sport 560',
  subjectSpecs: [],
  sections: [],
  lines: [],
  adjustments: [],
  levelKey: 'cash',
  customer: { name: 'A customer' },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

const rule = (over: Partial<ConstraintDef>): ConstraintDef => ({
  id: 'c-1',
  kind: 'implies',
  if: { combinator: 'AND', clauses: [] },
  because: 'the hull is not rated for that much power',
  enabled: true,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

const finding = (over: Partial<LintFinding>): LintFinding => ({
  id: 'r1:t-boat:',
  ruleId: 'r1',
  severity: 'advisory',
  entityId: 't-boat',
  title: 'Plural table name',
  why: 'A table is one of a thing.',
  ...over,
})

const moduleDef = (over: Partial<ModuleDef>): ModuleDef => ({
  id: 'm-1',
  name: 'Highfield',
  description: 'The inflatables counter.',
  tableIds: ['t-boat'],
  capabilities: ['browse', 'search', 'open'],
  index: 'tiles',
  accent: 'blue',
  order: 0,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

/* ---------------------------------------------------------- */

describe('the catalogue', () => {
  it('every card this build can draw has a name, a line for the tray and an empty sentence', () => {
    for (const id of CARD_IDS) {
      const meta = CARDS[id]
      expect(meta.name.length).toBeGreaterThan(0)
      expect(meta.says.length).toBeGreaterThan(0)
      expect(meta.empty.length).toBeGreaterThan(0)
      /* §2 rule 3: a name is a name, never a label style */
      expect(meta.name).not.toBe(meta.name.toUpperCase())
      /* the grid reads this to decide a span; an undefined here
         would silently make a card narrow rather than loudly
         fail, which is the class of bug this guard is for */
      expect(typeof meta.wide).toBe('boolean')
    }
  })

  /* THE DEFAULT SET PACKS THE GRID EXACTLY, AND THAT IS
     ARITHMETIC RATHER THAN AN OPINION.

     dashboard.css lays four tracks at 1300px of column and gives
     a wide card two of them. The set a person starts with spends

       3 wide x 2  +  2 compact x 1  =  8 cells

     which is two full rows and no hole. Any later change to
     `DEFAULT_CARDS` or to a `wide` flag that breaks the multiple
     puts a card-shaped gap back on the front door, and the gap
     is the thing this pass was written to remove. It is checked
     over the DEFAULT set only: a person who puts all seven on has
     arranged their own dashboard and that is their business. */
  it('the cards a person starts with fill whole rows of the four-track grid', () => {
    const cells = DEFAULT_CARDS.reduce((n, id) => n + (CARDS[id].wide ? 2 : 1), 0)
    expect(cells % 4).toBe(0)
  })
})

describe('my quotes, and quotes by state', () => {
  const set = [
    quote({ id: 'q-a', state: 'draft', preparedBy: 'Asaf Alazraki', updatedAt: '2026-08-03T00:00:00.000Z' }),
    quote({ id: 'q-b', state: 'issued', preparedBy: 'asaf alazraki ', updatedAt: '2026-08-05T00:00:00.000Z' }),
    quote({ id: 'q-c', state: 'issued', preparedBy: 'Somebody Else', updatedAt: '2026-08-04T00:00:00.000Z' }),
    quote({ id: 'q-d', state: 'draft', updatedAt: '2026-08-02T00:00:00.000Z' }),
  ]

  it('counts every state over every quote, not only mine', () => {
    const roll = rollQuotes(set, 'Asaf Alazraki')
    expect(roll.total).toBe(4)
    expect(roll.drafts).toBe(2)
    expect(roll.issued).toBe(2)
    expect(roll.drafts + roll.issued).toBe(roll.total)
  })

  it('matches the name on the document, trimmed and case-insensitively, and nothing else', () => {
    const roll = rollQuotes(set, 'Asaf Alazraki')
    expect(roll.mine.map((q) => q.id)).toEqual(['q-b', 'q-a'])
  })

  it('never claims a quote nobody was recorded as preparing', () => {
    const roll = rollQuotes(set, 'Asaf Alazraki')
    expect(roll.mine.some((q) => q.id === 'q-d')).toBe(false)
  })

  it('an empty signed-in name matches nothing rather than everything', () => {
    expect(rollQuotes(set, '').mine).toEqual([])
    expect(rollQuotes(set, '   ').mine).toEqual([])
  })

  it('THE HONEST MIDDLE CASE — quotes exist and none is mine', () => {
    const roll = rollQuotes(set, 'A New Starter')
    expect(roll.mine).toEqual([])
    expect(roll.othersOnly).toBe(true)
  })

  it('no quotes at all is not the same fact', () => {
    const roll = rollQuotes([], 'Asaf Alazraki')
    expect(roll.othersOnly).toBe(false)
    expect(roll.total).toBe(0)
  })

  it('newest first, by when the quote last changed', () => {
    const roll = rollQuotes(set, 'asaf alazraki')
    expect(roll.mine[0].updatedAt >= roll.mine[1].updatedAt).toBe(true)
  })
})

describe('where I have been', () => {
  const entities = { 't-boat': table('t-boat', 'Highfield Inflatables') }
  const rowsByEntity = { 't-boat': rows('t-boat', 3) }

  it('draws a table pick as the table', () => {
    const got = resolveRecent([{ entityId: 't-boat' }], entities, rowsByEntity)
    expect(got).toEqual([
      { key: 't-boat', entityId: 't-boat', title: 'Highfield Inflatables', under: '' },
    ])
  })

  it('draws a row pick as the row, under its table', () => {
    const got = resolveRecent([{ entityId: 't-boat', rowId: 't-boat-r1' }], entities, rowsByEntity)
    expect(got[0].title).toBe('Model 1')
    expect(got[0].under).toBe('Highfield Inflatables')
  })

  it('DROPS A PICK WHOSE TABLE IS GONE — a struck table, or a project replaced', () => {
    expect(resolveRecent([{ entityId: 't-vanished' }], entities, rowsByEntity)).toEqual([])
  })

  it('DROPS A PICK WHOSE ROW IS GONE, and keeps the ones beside it', () => {
    const got = resolveRecent(
      [
        { entityId: 't-boat', rowId: 'deleted-row' },
        { entityId: 't-boat', rowId: 't-boat-r0' },
      ],
      entities,
      rowsByEntity,
    )
    expect(got).toHaveLength(1)
    expect(got[0].title).toBe('Model 0')
  })

  it('keeps a table and one of its rows apart', () => {
    const got = resolveRecent(
      [{ entityId: 't-boat' }, { entityId: 't-boat', rowId: 't-boat-r0' }],
      entities,
      rowsByEntity,
    )
    expect(got).toHaveLength(2)
    expect(new Set(got.map((g) => g.key)).size).toBe(2)
  })
})

describe('the price file', () => {
  const entities: Record<string, EntityDef> = {
    a: table('a', 'Highfield'),
    b: table('b', 'Stacer'),
    j: table('j', 'Boat × Motor', { role: 'join' }),
    r: table('r', 'Obsolete trailers', { retired: true }),
  }
  const rowsByEntity: Record<string, RowData[]> = {
    a: rows('a', 112),
    b: rows('b', 40),
    j: rows('j', 2436),
    r: rows('r', 9),
  }

  it('a join is not stock and a retired table is not stock', () => {
    expect(isStockTable(entities.a)).toBe(true)
    expect(isStockTable(entities.j)).toBe(false)
    expect(isStockTable(entities.r)).toBe(false)
  })

  it('counts what you sell, and counts relationships separately', () => {
    const t = fileTally(entities, rowsByEntity)
    expect(t.tables).toBe(2)
    expect(t.rows).toBe(152)
    expect(t.relationships).toBe(1)
  })

  it('THE 2,436 PAIRS DO NOT INFLATE "ROWS YOU SELL FROM"', () => {
    expect(fileTally(entities, rowsByEntity).rows).not.toBe(2588)
  })

  it('lists the biggest stock tables, largest first, and never a join', () => {
    const big = biggestTables(entities, rowsByEntity, 5)
    expect(big.map((b) => b.entity.id)).toEqual(['a', 'b'])
    expect(big[0].rows).toBe(112)
  })

  it('breaks a tie on the name so the order does not wobble between paints', () => {
    const same: Record<string, EntityDef> = { z: table('z', 'Zodiac'), m: table('m', 'Mackay') }
    const none = { z: [], m: [] }
    expect(biggestTables(same, none, 5).map((b) => b.entity.name)).toEqual(['Mackay', 'Zodiac'])
  })

  it('a table with no rows counts as zero rather than being skipped', () => {
    const big = biggestTables({ a: table('a', 'Empty') }, {}, 3)
    expect(big).toEqual([{ entity: expect.objectContaining({ id: 'a' }), rows: 0 }])
  })

  it('an empty project is zero, never a guess', () => {
    expect(fileTally({}, {})).toEqual({ tables: 0, rows: 0, relationships: 0 })
    expect(biggestTables({}, {}, 4)).toEqual([])
  })
})

describe('my modules', () => {
  const entities = { 't-boat': table('t-boat', 'Highfield Inflatables') }
  const rowsByEntity = { 't-boat': rows('t-boat', 112), 't-motor': rows('t-motor', 60) }

  it('is in the dealer’s own order', () => {
    const modules = {
      b: moduleDef({ id: 'b', name: 'Service', order: 1 }),
      a: moduleDef({ id: 'a', name: 'Highfield', order: 0 }),
    }
    expect(moduleRows(modules, entities, rowsByEntity).map((m) => m.module.id)).toEqual(['a', 'b'])
  })

  it('counts every table the module names, not only the primary', () => {
    const modules = { a: moduleDef({ tableIds: ['t-boat', 't-motor'] }) }
    expect(moduleRows(modules, entities, rowsByEntity)[0].rows).toBe(172)
  })

  it('a module whose primary table is gone still lists, and says nothing it cannot count', () => {
    const modules = { a: moduleDef({ tableIds: ['t-vanished'] }) }
    const got = moduleRows(modules, entities, rowsByEntity)
    expect(got).toHaveLength(1)
    expect(got[0].master).toBe('')
    expect(got[0].rows).toBe(0)
  })
})

describe('worth fixing', () => {
  const set = [
    finding({ id: 'b2', severity: 'blocker' }),
    finding({ id: 'a1', severity: 'advisory' }),
    finding({ id: 'b1', severity: 'blocker' }),
    finding({ id: 'a2', severity: 'advisory' }),
  ]

  it('counts each severity', () => {
    const roll = rollFindings(set, 3)
    expect(roll.blockers).toBe(2)
    expect(roll.advisories).toBe(2)
  })

  it('puts blockers first, and orders the rest so the card does not reshuffle itself', () => {
    expect(rollFindings(set, 4).head.map((f) => f.id)).toEqual(['b1', 'b2', 'a1', 'a2'])
  })

  it('shows only as many as a glance holds', () => {
    expect(rollFindings(set, 2).head).toHaveLength(2)
    expect(rollFindings(set, 0).head).toHaveLength(0)
  })

  it('a clean project is zero of both', () => {
    expect(rollFindings([], 3)).toEqual({ blockers: 0, advisories: 0, head: [] })
  })
})

describe('rules that warn', () => {
  it('A RULE WITH NO SEVERITY BLOCKS — that is the contract’s default', () => {
    const roll = rollRules([rule({ id: 'x' })])
    expect(roll.enabled).toBe(1)
    expect(roll.warning).toEqual([])
  })

  it('counts only the ones that annotate rather than remove', () => {
    const roll = rollRules([
      rule({ id: 'a', severity: 'warn' }),
      rule({ id: 'b', severity: 'block' }),
      rule({ id: 'c', severity: 'warn' }),
    ])
    expect(roll.enabled).toBe(3)
    expect(roll.warning.map((c) => c.id).sort()).toEqual(['a', 'c'])
  })

  it('a rule switched off is neither', () => {
    const roll = rollRules([
      rule({ id: 'a', severity: 'warn', enabled: false }),
      rule({ id: 'b', enabled: false }),
    ])
    expect(roll.enabled).toBe(0)
    expect(roll.warning).toEqual([])
  })
})

describe('words', () => {
  it('never writes "1 quotes"', () => {
    expect(plural(1, 'quote', 'quotes')).toBe('1 quote')
    expect(plural(0, 'quote', 'quotes')).toBe('0 quotes')
    expect(plural(2, 'quote', 'quotes')).toBe('2 quotes')
  })

  it('reads the time of day off the clock, and nothing off the data', () => {
    const at = (h: number): Date => new Date(2026, 7, 27, h, 0, 0)
    expect(greeting(at(0))).toBe('Good morning')
    expect(greeting(at(11))).toBe('Good morning')
    expect(greeting(at(12))).toBe('Good afternoon')
    expect(greeting(at(17))).toBe('Good afternoon')
    expect(greeting(at(18))).toBe('Good evening')
    expect(greeting(at(23))).toBe('Good evening')
  })

  it('calls a person what they are called across a counter', () => {
    expect(firstName('Asaf Alazraki')).toBe('Asaf')
    expect(firstName('  Asaf  ')).toBe('Asaf')
    expect(firstName('Cher')).toBe('Cher')
  })
})
