/* ============================================================
   FIVE KINDS IN ONE FIELD — the three that were missing.

   UX_PASS §2 asks for one field over MODULES · ROWS · QUOTES ·
   TABLES · COLUMNS. `rowSearch.ts` answered with `{ tables, groups }`
   and nothing else, so three of the five were unreachable — and two
   of those failed SILENTLY, which is the part that made this worth a
   suite of its own rather than three more cases next door.

   THE THREE DEFECTS THIS PINS, all measured on the prepared file
   before any of it was written:

     1. `price` names 26 columns across fifteen tables and the
        palette answered "Nothing is called price". So did
        `horsepower`, which names two. A search that is confidently
        empty about something the file plainly contains teaches a
        person the search does not work.
     2. `boats` is the name of a MODULE holding seven brand tables,
        and answered with ten rows out of two tables that merely
        carry the word — with no way to reach the place at all.
     3. A quote reference read off a printed document was not
        findable by any surface in the application.

   WHAT IS ASSERTED HERE AND WHAT IS NOT. This file owns the RULES —
   the fold, the destination, the ordering, the door. The real-file
   invariants live next door in `rowSearch.northside.test.ts`, where
   the seed can prove them at full scale. Every fixture below is
   built here out of obviously synthetic names, so nothing in it can
   be mistaken for seed data.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'
import {
  DEFAULT_LIMITS,
  RANK,
  browse,
  buildSearchIndex,
  optionsOf,
  search,
  type QuoteFacts,
} from './rowSearch'

const stamp = '2020-01-01T00:00:00.000Z'

function table(id: string, name: string, extra: Partial<EntityDef> = {}): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    fields: [
      { id: `${id}.name`, name: 'Name', type: 'text' },
      { id: `${id}.tare`, name: 'Tare Weight', type: 'number' },
    ],
    displayFieldId: `${id}.name`,
    position: { x: 0, y: 0 },
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  }
}

const row = (entityId: string, id: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: stamp,
  updatedAt: stamp,
})

function module_(id: string, name: string, extra: Partial<ModuleDef> = {}): ModuleDef {
  return {
    id,
    name,
    description: '',
    tableIds: [],
    capabilities: ['browse', 'search', 'open'],
    index: 'rows',
    accent: 'blue',
    order: 0,
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  }
}

const quote = (extra: Partial<QuoteFacts> = {}): QuoteFacts => ({
  id: 'q1',
  reference: '20200101-01',
  subject: 'Alpha One',
  customer: 'Casey Quill',
  issued: false,
  total: 1234,
  ...extra,
})

/** Two ordinary tables, one of which is history. */
function sheet() {
  const a = table('ta', 'Table A', { kind: 'boat' })
  const b = table('tb', 'Table B', { kind: 'motor' })
  return {
    entities: { ta: a, tb: b },
    rowsByEntity: {
      ta: [row('ta', 'r1', { 'ta.name': 'Alpha One' })],
      tb: [row('tb', 'r2', { 'tb.name': 'Beta Two' })],
    },
  }
}

/* ============================================================ */
/* COLUMNS                                                      */
/* ============================================================ */

describe('columns — one line per NAME, never one per declaration', () => {
  it('folds a column name declared on several tables into one answer', () => {
    /* THE DEFECT IN MINIATURE. `price` is 26 declarations on the real
       file. Twenty-six lines that each say the same two words is a
       wall, and §2's own mock answers it in one line with the count
       of tables on it. */
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity)
    const result = search(index, 'tare')
    expect(result.columns).toHaveLength(1)
    expect(result.columns[0].name).toBe('Tare Weight')
    expect(result.columns[0].tables).toBe(2)
  })

  it('counts every declaration and folds to the distinct names', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity)
    /* two tables × two columns each */
    expect(index.columnTotal).toBe(4)
    /* "Name" and "Tare Weight" */
    expect(index.columns).toHaveLength(2)
  })

  it('opens the table that declares it, and says which', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity)
    const [hit] = search(index, 'tare').columns
    expect(index.facts[hit.table.id]).toBeDefined()
    expect(hit.via).toBeUndefined()
  })

  it('never lands a press on a live pair list', () => {
    /* A PAIR IS NOT A PLACE — the file's central ruling, and a column
       is the third thing it has to hold for after a pair row and a
       pair name. A fitment list declares columns nothing else does
       ("Prop Part No." on the real file, 153 of them), so they must
       stay findable AND must not send anybody to a pair sheet. */
    const boats = table('tboat', 'Boats List', { kind: 'boat' })
    const pair = table('tpair', 'Boats × Motors', {
      role: 'join',
      fields: [
        { id: 'tpair.name', name: 'Name', type: 'text' },
        { id: 'tpair.boat', name: 'Boat', type: 'reference', refEntityId: 'tboat' },
        { id: 'tpair.hole', name: 'Engine Hole', type: 'text' },
      ],
      displayFieldId: 'tpair.name',
    })
    const index = buildSearchIndex(
      { tboat: boats, tpair: pair },
      {
        tboat: [row('tboat', 'b1', { 'tboat.name': 'Alpha One' })],
        tpair: [row('tpair', 'p1', { 'tpair.name': 'Alpha One · Motor' })],
      },
    )
    const [hit] = search(index, 'engine hole').columns
    /* the column is findable — it exists nowhere else */
    expect(hit).toBeDefined()
    /* and it opens the thing the pairs are about, saying where the
       column was read */
    expect(hit.table.id).toBe('tboat')
    expect(hit.via).toBe('Boats × Motors')
  })

  it('answers history last, never as though it were stock', () => {
    const live = table('tlive', 'Live Table', { kind: 'boat' })
    const old = table('told', 'OBSOLETE Table', { kind: 'boat', retired: true })
    const index = buildSearchIndex({ tlive: live, told: old }, { tlive: [], told: [] })
    const [hit] = search(index, 'tare').columns
    /* one folded line, and the table it opens is the live one */
    expect(hit.table.retired).toBe(false)
    expect(hit.tables).toBe(2)
  })

  it('caps the list and says how many names it did not draw', () => {
    const wide = table('tw', 'Wide Table', {
      fields: Array.from({ length: 12 }, (_, i) => ({
        id: `tw.f${i}`,
        name: `Zeta Field ${i}`,
        type: 'text' as const,
      })),
      displayFieldId: 'tw.f0',
    })
    const index = buildSearchIndex({ tw: wide }, { tw: [] })
    const result = search(index, 'zeta')
    expect(result.columns).toHaveLength(DEFAULT_LIMITS.columns)
    /* counted BEFORE the cap, so the "+N more" line cannot lie */
    expect(result.columnTotal).toBe(12)
  })

  it('ranks a name that starts with the query above one that contains it', () => {
    const t = table('tr', 'Ranked', {
      fields: [
        { id: 'tr.a', name: 'Zeta Code', type: 'text' },
        { id: 'tr.b', name: 'Alpha Zeta', type: 'text' },
      ],
      displayFieldId: 'tr.a',
    })
    const index = buildSearchIndex({ tr: t }, { tr: [] })
    const [first, second] = search(index, 'zeta').columns
    expect(first.name).toBe('Zeta Code')
    expect(first.rank).toBe(RANK.prefix)
    expect(second.name).toBe('Alpha Zeta')
    expect(second.rank).toBe(RANK.word)
  })
})

/* ============================================================ */
/* MODULES                                                      */
/* ============================================================ */

describe('modules — the place, which is never a table name', () => {
  it('is not in the index at all until the caller passes one', () => {
    /* THE DOOR IS THE CAPABILITY. §2 rule 4: a result a person
       cannot open does not appear for them. A host that has not
       given the palette a way to open a module does not get modules
       in the index, so no press can land on nothing. */
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity)
    expect(index.modules).toHaveLength(0)
    expect(search(index, 'boats').modules).toHaveLength(0)
  })

  it('answers the grouping word no table is called', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      modules: { m1: module_('m1', 'Zeta Places', { tableIds: ['ta', 'tb'] }) },
    })
    const result = search(index, 'zeta')
    expect(result.modules).toHaveLength(1)
    expect(result.modules[0].module.name).toBe('Zeta Places')
    /* it counts the rows of the tables it holds, not its own */
    expect(result.modules[0].module.rowCount).toBe(2)
    expect(result.modules[0].module.tableIds).toEqual(['ta', 'tb'])
  })

  it('is reachable by the description, and says so by not marking it', () => {
    /* somebody who cannot remember the place is called "Motors"
       describes it instead. A description match carries `at: -1`, so
       nothing in the NAME is highlighted — the same rule a pair-list
       reading follows, because the run that matched is not the run
       being drawn. */
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      modules: {
        m1: module_('m1', 'Zeta Places', {
          description: 'the quiet ones, off the omega sheet',
          tableIds: ['ta'],
        }),
      },
    })
    const [hit] = search(index, 'omega').modules
    expect(hit.module.name).toBe('Zeta Places')
    expect(hit.at).toBe(-1)
    expect(hit.rank).toBe(RANK.inside)
  })

  it('a name match always outranks a description match', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      modules: {
        m1: module_('m1', 'Omega Talk', { description: '', tableIds: ['ta'], order: 0 }),
        m2: module_('m2', 'Zeta Places', {
          description: 'omega things',
          tableIds: ['tb'],
          order: 1,
        }),
      },
    })
    const hits = search(index, 'omega').modules
    expect(hits.map((h) => h.module.name)).toEqual(['Omega Talk', 'Zeta Places'])
  })

  it('a module that cannot be browsed is not somewhere to be sent', () => {
    /* `MODULE_CAPABILITIES.browse` is "see everything in it", which
       is exactly what a press on this line does. This is a fact
       about the MODULE and needs no role to answer — which is why it
       is enforced and the per-person half of §2 rule 4 is not. */
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      modules: {
        m1: module_('m1', 'Zeta Places', { capabilities: ['search'], tableIds: ['ta'] }),
      },
    })
    expect(index.modules).toHaveLength(0)
  })

  it('drops a pointer to a table that is no longer there', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      modules: { m1: module_('m1', 'Zeta Places', { tableIds: ['ta', 'gone'] }) },
    })
    expect(index.modules[0].facts.tableIds).toEqual(['ta'])
  })
})

/* ============================================================ */
/* QUOTES                                                       */
/* ============================================================ */

describe('quotes — three ways in, and the line says which one', () => {
  it('is not in the index at all until the caller passes one', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity)
    expect(index.quotes).toHaveLength(0)
    expect(search(index, 'alpha').quotes).toHaveLength(0)
  })

  it('finds a document by the reference off a printed page', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, { quotes: [quote()] })
    const [hit] = search(index, '20200101').quotes
    expect(hit.where).toBe('reference')
    expect(hit.at).toBe(0)
    expect(hit.rank).toBe(RANK.prefix)
  })

  it('finds it by who it was written for', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, { quotes: [quote()] })
    const [hit] = search(index, 'quill').quotes
    expect(hit.where).toBe('customer')
  })

  it('prefers the reference reading when two of the three match', () => {
    /* "this is the document you asked for" beats "this is a document
       that mentions the word", and the reference is the only one of
       the three that is exact. */
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      quotes: [quote({ reference: 'ZETA-1', subject: 'Zeta hull', customer: 'Zeta Co' })],
    })
    const [hit] = search(index, 'zeta').quotes
    expect(hit.where).toBe('reference')
  })

  it('keeps the order it was handed, which is the diary’s order', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      quotes: [
        quote({ id: 'new', reference: 'ZZ-2', subject: 'Zeta hull' }),
        quote({ id: 'old', reference: 'ZZ-1', subject: 'Zeta hull' }),
      ],
    })
    expect(search(index, 'zeta hull').quotes.map((h) => h.quote.id)).toEqual([
      'new',
      'old',
    ])
  })

  it('carries the document’s own total and never invents one', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      quotes: [quote({ total: null })],
    })
    expect(search(index, 'quill').quotes[0].quote.total).toBeNull()
  })

  it('caps the list', () => {
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      quotes: Array.from({ length: 9 }, (_, i) =>
        quote({ id: `q${i}`, reference: `ZETA-${i}` }),
      ),
    })
    expect(search(index, 'zeta').quotes).toHaveLength(DEFAULT_LIMITS.quotes)
  })
})

/* ============================================================ */
/* THE CURSOR OVER ALL FIVE                                     */
/* ============================================================ */

describe('one flat cursor, five kinds, one fixed order', () => {
  it('paints places, tables, rows, quotes, columns — in that order', () => {
    /* THE ORDER IS FIXED RATHER THAN RANKED ACROSS KINDS, and that is
       the point of this assertion. The first option is what Enter
       takes, so a first option whose KIND changed from one keystroke
       to the next would make Ctrl+K then Enter a lottery. */
    const t = table('tz', 'Zeta Table', {
      fields: [
        { id: 'tz.name', name: 'Name', type: 'text' },
        { id: 'tz.z', name: 'Zeta Column', type: 'text' },
      ],
      displayFieldId: 'tz.name',
    })
    const index = buildSearchIndex(
      { tz: t },
      { tz: [row('tz', 'r1', { 'tz.name': 'Zeta Row' })] },
      {
        modules: { m1: module_('m1', 'Zeta Place', { tableIds: ['tz'] }) },
        quotes: [quote({ subject: 'Zeta Boat' })],
      },
    )
    expect(optionsOf(search(index, 'zeta')).map((o) => o.kind)).toEqual([
      'module',
      'table',
      'row',
      'quote',
      'column',
    ])
  })

  it('gives every option a distinct id, so the cursor cannot collide', () => {
    const t = table('tz', 'Zeta Table', {
      fields: [
        { id: 'tz.name', name: 'Name', type: 'text' },
        { id: 'tz.z', name: 'Zeta Column', type: 'text' },
      ],
      displayFieldId: 'tz.name',
    })
    const index = buildSearchIndex(
      { tz: t },
      { tz: [row('tz', 'r1', { 'tz.name': 'Zeta Row' })] },
      {
        modules: { m1: module_('m1', 'Zeta Place', { tableIds: ['tz'] }) },
        quotes: [quote({ subject: 'Zeta Boat' })],
      },
    )
    const ids = optionsOf(search(index, 'zeta')).map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('the resting list is still places, and only places', () => {
    /* A resting list that also drew nine modules, five quotes and six
       columns would be thirty lines where the whole argument for it
       is that it is a menu. They are one keystroke away. */
    const { entities, rowsByEntity } = sheet()
    const index = buildSearchIndex(entities, rowsByEntity, {
      modules: { m1: module_('m1', 'Zeta Places', { tableIds: ['ta'] }) },
      quotes: [quote()],
    })
    /* `browse` is what the field calls with nothing typed */
    const resting = optionsOf(browse(index))
    expect(resting.length).toBeGreaterThan(0)
    expect(resting.every((o) => o.kind === 'table')).toBe(true)
  })
})
