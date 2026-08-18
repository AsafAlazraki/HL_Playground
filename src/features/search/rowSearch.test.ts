/* ============================================================
   What the one search field is allowed to answer.

   Three things are under test and they have different stakes.

   THE GROUPING is the whole reason this feature exists. The audit
   found that the app never teaches which of 21 tables a product
   lives in; a matcher that returned a flat list would compile,
   pass a naive test, and leave that failure exactly where it was.
   So the shape of the answer is asserted, not just its contents.

   THE LABEL SOURCE is a correctness boundary. A row is named by
   its table's `displayFieldId`, and nothing here may guess. A cell
   holding images or a yes/no is NOT a name — `String()` on either
   produces "[object Object]" or "true", and an index that admitted
   those would be inventing names nobody typed.

   THE CAPS are a truthfulness boundary. `more` and `total` are
   counted BEFORE the cap, because a popover that says "+3 more"
   when it hid thirty has lied to the person deciding whether to
   keep typing.

   Every fixture below is built in this file from obviously
   synthetic names ("Alpha One", "table-a"). None of it resembles a
   product, a brand or a price, so nothing here can be mistaken for
   seed data.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'
import {
  DEFAULT_LIMITS,
  MIN_QUERY,
  RANK,
  buildSearchIndex,
  normalizeQuery,
  optionsOf,
  search,
} from './rowSearch'

/* ------------------------------------------------------------ */
/* Fixtures — deliberately unlike anything in the real file      */
/* ------------------------------------------------------------ */

const stamp = '2020-01-01T00:00:00.000Z'

function table(
  id: string,
  name: string,
  extra: Partial<EntityDef> = {},
): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    fields: [
      { id: `${id}.name`, name: 'Name', type: 'text' },
      { id: `${id}.note`, name: 'Note', type: 'text' },
    ],
    displayFieldId: `${id}.name`,
    position: { x: 0, y: 0 },
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  }
}

function row(entityId: string, id: string, values: RowData['values']): RowData {
  return { id, entityId, values, createdAt: stamp, updatedAt: stamp }
}

/** Two tables that both hold something called "Alpha One" — which is
 *  precisely the case a flat result list cannot answer. */
function twoTables() {
  const a = table('ta', 'Table A', { kind: 'boat' })
  const b = table('tb', 'Table B', { kind: 'motor' })
  return {
    entities: { ta: a, tb: b },
    rowsByEntity: {
      ta: [
        row('ta', 'r1', { 'ta.name': 'Alpha One', 'ta.note': 'ignored' }),
        row('ta', 'r2', { 'ta.name': 'Beta Alpha', 'ta.note': 'ignored' }),
        row('ta', 'r3', { 'ta.name': 'Gamma', 'ta.note': 'alpha in a note' }),
      ],
      tb: [row('tb', 'r4', { 'tb.name': 'Alpha One', 'tb.note': '' })],
    },
  }
}

/* ------------------------------------------------------------ */

describe('buildSearchIndex — what a row is called is never guessed', () => {
  it('takes the label from the table’s own display field', () => {
    const { entities, rowsByEntity } = twoTables()
    const index = buildSearchIndex(entities, rowsByEntity)
    expect(index.rows.map((r) => r.label).sort()).toEqual([
      'Alpha One',
      'Alpha One',
      'Beta Alpha',
      'Gamma',
    ])
  })

  it('never indexes a column that is not the display field', () => {
    /* "alpha in a note" lives in Note, not Name. Finding it would mean
       the field is quietly searching everything and the result's "this
       is where it lives" claim stops being checkable. */
    const { entities, rowsByEntity } = twoTables()
    const index = buildSearchIndex(entities, rowsByEntity)
    expect(index.rows.some((r) => r.hay.includes('in a note'))).toBe(false)
  })

  it('refuses image lists and yes/no cells as names', () => {
    /* String() on either produces a value nobody typed — the exact
       placeholder-as-value failure, arriving through the back door. */
    const t = table('tc', 'Table C')
    t.fields[0].type = 'image'
    const index = buildSearchIndex(
      { tc: t },
      {
        tc: [
          row('tc', 'r1', { 'tc.name': [{ id: 'i1', src: 'blob:x' }] }),
          row('tc', 'r2', { 'tc.name': true }),
          row('tc', 'r3', { 'tc.name': '   ' }),
          row('tc', 'r4', { 'tc.name': 42 }),
        ],
      },
    )
    expect(index.rows.map((r) => r.label)).toEqual(['42'])
    expect(index.facts.tc.rowCount).toBe(1)
  })

  it('registers every table, including the ones with no rows', () => {
    const index = buildSearchIndex({ tz: table('tz', 'Table Z') }, {})
    expect(index.tableTotal).toBe(1)
    expect(index.rowTotal).toBe(0)
    expect(index.facts.tz.rowCount).toBe(0)
  })
})

describe('search — the answer is grouped by the table it lives in', () => {
  it('puts one name that exists in two tables under both of them', () => {
    const { entities, rowsByEntity } = twoTables()
    const result = search(buildSearchIndex(entities, rowsByEntity), 'alpha one')
    expect(result.groups.map((g) => g.table.name).sort()).toEqual([
      'Table A',
      'Table B',
    ])
    for (const g of result.groups) {
      expect(g.hits.map((h) => h.label)).toEqual(['Alpha One'])
    }
  })

  it('carries the kind and accent of each table on its group', () => {
    /* the group heading has to draw a kind mark; asking the store a
       second time at paint would be a second source of truth */
    const { entities, rowsByEntity } = twoTables()
    const result = search(buildSearchIndex(entities, rowsByEntity), 'alpha')
    const byName = Object.fromEntries(result.groups.map((g) => [g.table.name, g.table]))
    expect(byName['Table A'].kind).toBe('boat')
    expect(byName['Table B'].kind).toBe('motor')
  })

  it('answers a table name in its own group', () => {
    const { entities, rowsByEntity } = twoTables()
    const result = search(buildSearchIndex(entities, rowsByEntity), 'table b')
    expect(result.tables.map((t) => t.table.name)).toEqual(['Table B'])
  })

  it('says nothing at all below the minimum query length', () => {
    const { entities, rowsByEntity } = twoTables()
    const index = buildSearchIndex(entities, rowsByEntity)
    expect(search(index, 'a').rowTotal).toBe(0)
    expect(MIN_QUERY).toBe(2)
  })
})

describe('search — a pair is never a place', () => {
  /* THE CASE THIS EXISTS FOR, measured on the real sheet: a pair
     row's label spells out both sides of the pair, so a product name
     appears in it once per partner. Listed as rows of their own the
     pair lists buried the two real answers under twenty rows of
     plumbing, and pressing one landed the reader on a pair-record
     sheet — which the owner ruled against: "all tables should be a
     module, and than their join and view ones should lie within
     them".
     A pair row's name is not a name. It is the two names it links,
     and both of those rows are in this index already — measured over
     the whole file at 8,679 of 8,679 pair rows, zero
     counter-examples. So a pair row answers THROUGH its sides. */
  const base = table('tp', 'Products', { kind: 'boat' })
  const partners = table('tw', 'Partners', { kind: 'motor' })
  const join: EntityDef = {
    ...table('tj', 'Products × Partners', { kind: 'custom', role: 'join' }),
    fields: [
      { id: 'tj.name', name: 'Label', type: 'text' },
      { id: 'tj.p', name: 'Product', type: 'reference', refEntityId: 'tp' },
      { id: 'tj.w', name: 'Partner', type: 'reference', refEntityId: 'tw' },
    ],
  }

  const entities = { tp: base, tw: partners, tj: join }
  const rowsByEntity = {
    tp: [row('tp', 'p1', { 'tp.name': 'Alpha One' })],
    tw: [
      row('tw', 'w1', { 'tw.name': 'Partner A' }),
      row('tw', 'w2', { 'tw.name': 'Partner B' }),
      row('tw', 'w3', { 'tw.name': 'Partner C' }),
    ],
    /* three pair rows, each named by the two rows it links */
    tj: [
      row('tj', 'j1', { 'tj.name': 'Alpha One · Partner A', 'tj.p': 'p1', 'tj.w': 'w1' }),
      row('tj', 'j2', { 'tj.name': 'Alpha One · Partner B', 'tj.p': 'p1', 'tj.w': 'w2' }),
      row('tj', 'j3', { 'tj.name': 'Alpha One · Partner C', 'tj.p': 'p1', 'tj.w': 'w3' }),
    ],
  }
  const index = buildSearchIndex(entities, rowsByEntity)

  it('answers with the one product and no pair rows at all', () => {
    const result = search(index, 'alpha one')
    expect(result.groups.map((g) => g.table.name)).toEqual(['Products'])
    expect(result.rowTotal).toBe(1)
  })

  it('answers the other side with the other side, not with the pair', () => {
    const result = search(index, 'partner b')
    expect(result.groups.map((g) => g.table.name)).toEqual(['Partners'])
    expect(result.groups[0].hits.map((h) => h.label)).toEqual(['Partner B'])
  })

  it('counts the pair rows as searched through rather than indexed', () => {
    expect(index.pairRows).toBe(3)
    expect(index.rowTotal).toBe(4)
    expect(index.rows.some((r) => r.entityId === 'tj')).toBe(false)
  })

  it('lets a pair list’s own NAME answer for the table it lies within', () => {
    const result = search(index, 'partners')
    /* Partners matched its own name; the pair list matched too and
       opens Products, because that is what its pairs are about */
    const byDest = result.tables.map((t) => [t.table.name, t.via?.name ?? null])
    expect(byDest).toEqual([
      ['Partners', null],
      ['Products', 'Products × Partners'],
    ])
    expect(result.tables[1].at).toBe(-1)
  })

  it('never draws two lines that open the same table', () => {
    const twoLists: Record<string, EntityDef> = {
      ...entities,
      tj2: {
        ...table('tj2', 'Products × Extras', { role: 'join' }),
        fields: [
          { id: 'tj2.name', name: 'Label', type: 'text' },
          { id: 'tj2.p', name: 'Product', type: 'reference', refEntityId: 'tp' },
        ],
      },
    }
    const result = search(
      buildSearchIndex(twoLists, { ...rowsByEntity, tj2: [] }),
      'products',
    )
    const opened = result.tables.map((t) => t.table.name)
    expect(opened).toEqual([...new Set(opened)])
    /* Products matched its own name, so the two lists inside it add
       nothing and are not drawn a second time */
    expect(result.tables.map((t) => [t.table.name, t.via?.count ?? 0])).toEqual([
      ['Products', 0],
    ])
  })

  it('counts the lists when several of them are what matched', () => {
    const result = search(
      buildSearchIndex(
        {
          ...entities,
          tj2: {
            ...table('tj2', 'Products × Extras', { role: 'join' }),
            fields: [
              { id: 'tj2.name', name: 'Label', type: 'text' },
              { id: 'tj2.p', name: 'Product', type: 'reference', refEntityId: 'tp' },
            ],
          },
        },
        { ...rowsByEntity, tj2: [] },
      ),
      /* a run only the two lists carry, so the table's own name does
         not match and the lists are what answers */
      'products ×',
    )
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].table.name).toBe('Products')
    expect(result.tables[0].via?.count).toBe(2)
  })

  it('keeps wording that belongs to the pair itself, and says where it read it', () => {
    /* the case this file does not have and another org's data can: a
       pair row carrying a note of its own. Dropping it would make a
       real string unfindable; answering it with the pair would send
       somebody to a pair sheet. So it answers with the row the pair
       is ABOUT, carrying the list it was read in. */
    const withNote = {
      ...rowsByEntity,
      tj: [
        row('tj', 'j1', {
          'tj.name': 'Alpha One · Partner A · Winter Kit',
          'tj.p': 'p1',
          'tj.w': 'w1',
        }),
      ],
    }
    const idx = buildSearchIndex(entities, withNote)
    expect(idx.viaRows).toBe(1)
    const result = search(idx, 'winter kit')
    expect(result.groups.map((g) => g.table.name)).toEqual(['Products'])
    const [hit] = result.groups[0].hits
    expect(hit.rowId).toBe('p1')
    expect(hit.label).toBe('Alpha One')
    expect(hit.via).toBe('Products × Partners')
    expect(hit.at).toBe(-1)
  })

  it('reads a row reached twice as one answer', () => {
    const withNote = {
      ...rowsByEntity,
      tj: [
        row('tj', 'j1', {
          'tj.name': 'Alpha One · Partner A · Alpha One spare',
          'tj.p': 'p1',
          'tj.w': 'w1',
        }),
      ],
    }
    const result = search(buildSearchIndex(entities, withNote), 'alpha one')
    expect(result.groups[0].hits).toHaveLength(1)
    expect(result.groups[0].hits[0].via).toBeUndefined()
    expect(result.rowTotal).toBe(1)
  })

  it('never resolves one pair list to another pair list', () => {
    /* the far end of a press has to be a thing. A list whose first
       link names another list skips it and takes the next side. */
    const nested: EntityDef = {
      ...table('tk', 'Deep × Pairs', { role: 'join' }),
      fields: [
        { id: 'tk.name', name: 'Label', type: 'text' },
        { id: 'tk.j', name: 'Pair', type: 'reference', refEntityId: 'tj' },
        { id: 'tk.p', name: 'Product', type: 'reference', refEntityId: 'tp' },
      ],
    }
    const result = search(
      buildSearchIndex({ ...entities, tk: nested }, { ...rowsByEntity, tk: [] }),
      'deep ×',
    )
    expect(result.tables.map((t) => t.table.name)).toEqual(['Products'])
    expect(result.tables[0].via?.name).toBe('Deep × Pairs')
  })

  it('treats a join with no link column as an ordinary table', () => {
    /* `role: 'join'` with nothing to resolve to is not a pair list in
       any usable sense — there is no pair for its rows to be about —
       so its rows stay findable where they are. Nothing may fall out
       of reach through the pair rule. */
    const fees = table('tf', 'Fee Bands', { role: 'join' })
    const idx = buildSearchIndex(
      { tf: fees },
      { tf: [row('tf', 'f1', { 'tf.name': 'Band Four' })] },
    )
    expect(idx.pairRows).toBe(0)
    const result = search(idx, 'band four')
    expect(result.groups.map((g) => g.table.name)).toEqual(['Fee Bands'])
    expect(result.groups[0].hits[0].rowId).toBe('f1')
  })
})

describe('search — history is answered, said, and never ranked as stock', () => {
  /* The discontinued contract, both halves of it: the data stays and
     the sheet does not filter, because "hiding rows from the person
     whose job is fixing them is how data rots unseen" — and no
     customer-facing surface offers it. This field lands a person on
     the sheet, so it answers, LAST, and every line says it is
     history. */
  const live = table('ta', 'Table A', { kind: 'trailer' })
  const gone = table('tz', 'Table Z Withdrawn', { kind: 'trailer', retired: true })
  const index = buildSearchIndex(
    { ta: live, tz: gone },
    {
      ta: [row('ta', 'r1', { 'ta.name': 'Alpha One' })],
      tz: [row('tz', 'r9', { 'tz.name': 'Alpha Nine' })],
    },
  )

  it('answers a retired table after every live one', () => {
    const result = search(index, 'alpha')
    expect(result.groups.map((g) => g.table.name)).toEqual([
      'Table A',
      'Table Z Withdrawn',
    ])
    expect(result.groups[1].table.retired).toBe(true)
  })

  it('still finds a row on it, so the person maintaining it can reach it', () => {
    const result = search(index, 'alpha nine')
    expect(result.groups.map((g) => g.table.name)).toEqual(['Table Z Withdrawn'])
    expect(result.groups[0].hits[0].rowId).toBe('r9')
  })

  it('counts only the live tables — the number Home and the dock print', () => {
    expect(index.tableTotal).toBe(1)
    expect(index.retiredTables).toBe(1)
    expect(index.tables).toHaveLength(2)
  })

  it('leaves a retired pair list standing as itself', () => {
    /* its pairs are history: sending somebody who typed the retired
       list's name to a live table would hide what they asked for */
    const goneJoin: EntityDef = {
      ...table('tj', 'Table A × Table Z Withdrawn', { role: 'join', retired: true }),
      fields: [
        { id: 'tj.name', name: 'Label', type: 'text' },
        { id: 'tj.a', name: 'A', type: 'reference', refEntityId: 'ta' },
      ],
    }
    const idx = buildSearchIndex(
      { ta: live, tj: goneJoin },
      { ta: [row('ta', 'r1', { 'ta.name': 'Alpha One' })], tj: [] },
    )
    const result = search(idx, 'withdrawn')
    expect(result.tables.map((t) => [t.table.name, t.via?.name ?? null])).toEqual([
      ['Table A × Table Z Withdrawn', null],
    ])
    expect(result.tables[0].table.retired).toBe(true)
  })
})

describe('search — ranking is predictable', () => {
  const index = buildSearchIndex(
    { ta: table('ta', 'Table A') },
    {
      ta: [
        row('ta', 'r1', { 'ta.name': 'Zed Alpha' }), /* word start */
        row('ta', 'r2', { 'ta.name': 'Alpha Two' }), /* prefix */
        row('ta', 'r3', { 'ta.name': 'Nonalpha' }), /* inside */
      ],
    },
  )

  it('orders prefix, then word start, then inside', () => {
    const result = search(index, 'alpha')
    expect(result.groups[0].hits.map((h) => h.label)).toEqual([
      'Alpha Two',
      'Zed Alpha',
      'Nonalpha',
    ])
    expect(result.groups[0].hits.map((h) => h.rank)).toEqual([
      RANK.prefix,
      RANK.word,
      RANK.inside,
    ])
  })

  it('reports where the match starts so it can be inked', () => {
    const hit = search(index, 'alpha').groups[0].hits.find(
      (h) => h.label === 'Zed Alpha',
    )
    expect(hit).toBeDefined()
    expect('Zed Alpha'.slice(hit!.at, hit!.at + hit!.length)).toBe('Alpha')
  })

  it('folds case and collapses runs of whitespace', () => {
    expect(normalizeQuery('  ALPHA   Two ')).toBe('alpha two')
    expect(search(index, '  ALPHA   Two ').rowTotal).toBe(1)
  })
})

describe('search — the caps never lie about what they hid', () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    row('ta', `r${i}`, { 'ta.name': `Alpha ${String(i).padStart(2, '0')}` }),
  )
  const index = buildSearchIndex({ ta: table('ta', 'Table A') }, { ta: many })

  it('counts every match before the cap is applied', () => {
    const result = search(index, 'alpha')
    expect(result.rowTotal).toBe(30)
    expect(result.groups[0].total).toBe(30)
  })

  it('shows the per-table limit and states the remainder exactly', () => {
    const result = search(index, 'alpha')
    expect(result.groups[0].hits).toHaveLength(DEFAULT_LIMITS.perTable)
    expect(result.groups[0].more).toBe(30 - DEFAULT_LIMITS.perTable)
    expect(result.groups[0].hits.length + result.groups[0].more).toBe(
      result.groups[0].total,
    )
  })

  it('never lists more rows than the total budget', () => {
    const wide: Record<string, EntityDef> = {}
    const rows: Record<string, RowData[]> = {}
    for (let t = 0; t < 12; t += 1) {
      const id = `t${t}`
      wide[id] = table(id, `Table ${t}`)
      rows[id] = Array.from({ length: 10 }, (_, i) =>
        row(id, `${id}-r${i}`, { [`${id}.name`]: `Alpha ${t}-${i}` }),
      )
    }
    const result = search(buildSearchIndex(wide, rows), 'alpha')
    expect(result.rowTotal).toBe(120)
    expect(result.rowShown).toBeLessThanOrEqual(DEFAULT_LIMITS.total)
    const listed = result.groups.reduce((n, g) => n + g.hits.length, 0)
    expect(listed).toBe(result.rowShown)
  })
})

describe('optionsOf — the arrow keys walk exactly what is painted', () => {
  it('lists table answers first, then every row hit in group order', () => {
    const { entities, rowsByEntity } = twoTables()
    const result = search(buildSearchIndex(entities, rowsByEntity), 'table a')
    const options = optionsOf(result)
    expect(options[0]).toMatchObject({ kind: 'table', entityId: 'ta' })
    expect(options.every((o) => o.id.length > 0)).toBe(true)
    expect(new Set(options.map((o) => o.id)).size).toBe(options.length)
  })

  it('gives one option per painted line and no more', () => {
    const { entities, rowsByEntity } = twoTables()
    const result = search(buildSearchIndex(entities, rowsByEntity), 'alpha')
    const painted =
      result.tables.length + result.groups.reduce((n, g) => n + g.hits.length, 0)
    expect(optionsOf(result)).toHaveLength(painted)
  })

  it('names the table a row option belongs to, which is what selecting needs', () => {
    const { entities, rowsByEntity } = twoTables()
    const result = search(buildSearchIndex(entities, rowsByEntity), 'beta')
    const [only] = optionsOf(result)
    expect(only).toMatchObject({ kind: 'row', entityId: 'ta', rowId: 'r2' })
  })
})
