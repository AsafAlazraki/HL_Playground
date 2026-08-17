/* ============================================================
   WHAT A PERSON MAKES MUST SURVIVE EXPORT → IMPORT.

   It did not. Two separate silences, both under a button labelled
   "Everything":

   1. THE SHAPE OF A TABLE. `validateEnvelope` read ten of
      EntityDef's fourteen keys and dropped `kind`, `role`,
      `hierarchy` and `sections`, plus `sectionId` on every column.
      A round trip therefore handed back every table as an untyped,
      ungrouped, unbanded flat list — and the counts still matched,
      so the file looked complete.

   2. THE DESIGN LAYER. Modules, view pages, the organisation and
      the business rules were not in the file at all. Nothing anybody
      designed could leave the browser it was made in.

   These tests are why neither can go quiet again. They also pin the
   two decisions that are easy to get wrong later: a V1 FILE STILL
   IMPORTS, and a POINTER AT A TABLE THAT IS NOT IN THE FILE is
   resolved at the door rather than imported and hoped about.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { validateEnvelope } from './envelope'
import { EXPORT_KIND, EXPORT_VERSION, type ProjectExport } from '@/types/model'

/* ------------------------------------------------------------ */
/* a file to bend                                                */
/* ------------------------------------------------------------ */

/** One table with three columns, two of them banded, the first
 *  column forming a one-level hierarchy. Everything below reaches
 *  into this by id. */
const boats = () => ({
  id: 'tBoats',
  name: 'Highfield',
  kind: 'boat',
  role: 'base',
  accent: 'blue',
  hierarchy: ['fSeries'],
  sections: [
    { id: 'identity', name: 'Identity' },
    { id: 'pricing', name: 'Hull Only Pricing', accent: 'viridian', collapsed: true },
  ],
  fields: [
    { id: 'fSeries', name: 'Series', type: 'text', sectionId: 'identity' },
    { id: 'fModel', name: 'Model', type: 'text', sectionId: 'identity' },
    { id: 'fCash', name: 'Cash', type: 'number', sectionId: 'pricing' },
  ],
  displayFieldId: 'fModel',
  position: { x: 0, y: 0 },
})

const motors = () => ({
  id: 'tMotors',
  name: 'Yamaha',
  kind: 'motor',
  accent: 'carmine',
  fields: [{ id: 'fHp', name: 'HP', type: 'number' }],
  position: { x: 600, y: 0 },
})

const join = () => ({
  id: 'tJoin',
  name: 'Highfield Yamaha',
  role: 'join',
  accent: 'graphite',
  fields: [
    { id: 'jBoat', name: 'Boat', type: 'reference', refEntityId: 'tBoats' },
    { id: 'jMotor', name: 'Motor', type: 'reference', refEntityId: 'tMotors' },
  ],
  position: { x: 300, y: 400 },
})

const file = (over: Record<string, unknown> = {}) => ({
  kind: EXPORT_KIND,
  version: EXPORT_VERSION,
  exportedAt: '2026-01-01T00:00:00.000Z',
  project: { name: 'Northside Marine', rev: 3 },
  entities: [boats(), motors(), join()],
  groups: [],
  rules: [],
  ...over,
})

const ok = (raw: unknown): ProjectExport => {
  const r = validateEnvelope(raw)
  if (!r.ok) throw new Error(`expected a valid file, got: ${r.error}`)
  return r.data
}

const table = (data: ProjectExport, id: string) =>
  data.entities.find((e) => e.id === id)

/* ------------------------------------------------------------ */
/* 1. the shape of a table                                       */
/* ------------------------------------------------------------ */

describe('the shape of a table survives a round trip', () => {
  it('keeps what the table HOLDS — kind — so a fitment rule still reaches it', () => {
    expect(table(ok(file()), 'tBoats')?.kind).toBe('boat')
    expect(table(ok(file()), 'tMotors')?.kind).toBe('motor')
  })

  it('keeps what the table IS — role — so a join stays out of the module picker', () => {
    expect(table(ok(file()), 'tJoin')?.role).toBe('join')
    expect(table(ok(file()), 'tBoats')?.role).toBe('base')
  })

  it('keeps the grouping levels, in their order', () => {
    expect(table(ok(file()), 'tBoats')?.hierarchy).toEqual(['fSeries'])
  })

  it('keeps the column bands, with their ink and their fold state', () => {
    expect(table(ok(file()), 'tBoats')?.sections).toEqual([
      { id: 'identity', name: 'Identity' },
      { id: 'pricing', name: 'Hull Only Pricing', accent: 'viridian', collapsed: true },
    ])
  })

  it('keeps which band each column is in', () => {
    const t = table(ok(file()), 'tBoats')
    expect(t?.fields.map((f) => f.sectionId)).toEqual(['identity', 'identity', 'pricing'])
  })

  it('leaves an unknown kind or role ABSENT rather than guessing one', () => {
    const e = { ...boats(), kind: 'submarine', role: 'lookup' }
    const t = table(ok(file({ entities: [e] })), 'tBoats')
    expect(t?.kind).toBeUndefined()
    expect(t?.role).toBeUndefined()
  })

  it('drops a grouping level that names a column the file does not carry', () => {
    const e = { ...boats(), hierarchy: ['fSeries', 'fGone', 'fSeries'] }
    expect(table(ok(file({ entities: [e] })), 'tBoats')?.hierarchy).toEqual(['fSeries'])
  })

  it('drops a band with no name instead of naming it for the business', () => {
    const e = { ...boats(), sections: [{ id: 'identity' }, { id: 'pricing', name: 'Pricing' }] }
    expect(table(ok(file({ entities: [e] })), 'tBoats')?.sections).toEqual([
      { id: 'pricing', name: 'Pricing' },
    ])
  })

  it('refuses a band id that could poison an object key', () => {
    const e = { ...boats(), sections: [{ id: '__proto__', name: 'Sneaky' }] }
    expect(table(ok(file({ entities: [e] })), 'tBoats')?.sections).toBeUndefined()
  })
})

/* ------------------------------------------------------------ */
/* 1b. the column ids that are MEANT to repeat                   */
/* ------------------------------------------------------------ */

/* Found by exporting the real seed and importing it back, which is
   the one test nobody had run end to end: every curated join carries
   the same three pair columns by design (`PAIR_FIELDS`), the file-wide
   uniqueness rule read the second join's `__origin` as a collision,
   and the whole file was refused. A project with two curated joins
   exported a file it could never open again. */

const joinWithPairs = (id: string, name: string) => ({
  id,
  name,
  role: 'join',
  accent: 'graphite',
  fields: [
    { id: '__origin', name: 'Origin', type: 'text' },
    { id: '__recommended', name: 'Recommended', type: 'boolean' },
    { id: '__order', name: 'Order', type: 'number' },
  ],
  position: { x: 0, y: 0 },
})

describe('the pair columns every curated join carries', () => {
  const twoJoins = () =>
    file({ entities: [boats(), joinWithPairs('tJ1', 'A × B'), joinWithPairs('tJ2', 'C × D')] })

  it('opens a file with two curated joins instead of refusing it whole', () => {
    const d = ok(twoJoins())
    expect(d.entities).toHaveLength(3)
  })

  it('keeps the well-known ids, which is the only reason a pair can be read', () => {
    const d = ok(twoJoins())
    for (const t of ['tJ1', 'tJ2']) {
      expect(table(d, t)?.fields.map((f) => f.id)).toEqual([
        '__origin',
        '__recommended',
        '__order',
      ])
    }
  })

  it('still refuses two columns sharing one id INSIDE one table', () => {
    const bad = {
      ...joinWithPairs('tJ1', 'A × B'),
      fields: [
        { id: '__origin', name: 'Origin', type: 'text' },
        { id: '__origin', name: 'Origin', type: 'text' },
      ],
    }
    const r = validateEnvelope(file({ entities: [bad] }))
    expect(r.ok).toBe(false)
  })

  it('still refuses an ordinary column id used on two tables', () => {
    const twin = { ...motors(), id: 'tTwin', fields: [{ id: 'fHp', name: 'HP', type: 'number' }] }
    const r = validateEnvelope(file({ entities: [motors(), twin] }))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('DUPLICATE ID')
  })
})

/* ------------------------------------------------------------ */
/* 2. the design layer                                           */
/* ------------------------------------------------------------ */

const view = (over: Record<string, unknown> = {}) => ({
  id: 'vBoat',
  name: 'Highfield page',
  rootTableId: 'tBoats',
  blocks: [
    {
      id: 'b1',
      tableId: 'tMotors',
      joinTableId: 'tJoin',
      columns: ['fHp'],
      filters: [{ kind: 'values', fieldId: 'fHp', selected: ['90'] }],
      rule: { combinator: 'AND', clauses: [{ id: 'c1', left: { fieldId: 'fHp' }, op: 'gte' }] },
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const moduleDef = (over: Record<string, unknown> = {}) => ({
  id: 'mBoats',
  name: 'Boats',
  description: 'Every hull we sell.',
  tableIds: ['tBoats', 'tMotors'],
  capabilities: ['browse', 'search', 'open', 'quote'],
  index: 'tiles',
  viewId: 'vBoat',
  accent: 'blue',
  order: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const constraint = (over: Record<string, unknown> = {}) => ({
  id: 'kHp',
  kind: 'implies',
  if: { combinator: 'AND', clauses: [{ id: 'c1', left: { fieldId: 'fCash' }, op: 'notEmpty' }] },
  then: { combinator: 'AND', clauses: [{ id: 'c2', left: { fieldId: 'fModel' }, op: 'notEmpty' }] },
  because: 'a priced hull has to say which model it is',
  enabled: false,
  edited: true,
  source: 'You, just now',
  priority: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const org = { name: 'Northside Marine', industry: 'marine', createdAt: '2026-01-01T00:00:00.000Z' }

const full = (over: Record<string, unknown> = {}) =>
  file({ org, views: [view()], modules: [moduleDef()], constraints: [constraint()], ...over })

describe('the design layer travels with the file', () => {
  it('carries the organisation, so an imported set knows whose it is', () => {
    expect(ok(full()).org).toEqual(org)
  })

  it('carries a view page whole — blocks, join, columns, filters and rule', () => {
    const v = ok(full()).views?.[0]
    expect(v?.id).toBe('vBoat')
    expect(v?.rootTableId).toBe('tBoats')
    expect(v?.blocks[0].tableId).toBe('tMotors')
    expect(v?.blocks[0].joinTableId).toBe('tJoin')
    expect(v?.blocks[0].columns).toEqual(['fHp'])
    expect(v?.blocks[0].filters).toEqual([{ kind: 'values', fieldId: 'fHp', selected: ['90'] }])
    expect(v?.blocks[0].rule?.clauses[0].left).toEqual({ fieldId: 'fHp' })
  })

  it('carries a module whole — its tables, verbs, index, page and place', () => {
    const m = ok(full()).modules?.[0]
    expect(m).toMatchObject({
      id: 'mBoats',
      name: 'Boats',
      description: 'Every hull we sell.',
      tableIds: ['tBoats', 'tMotors'],
      capabilities: ['browse', 'search', 'open', 'quote'],
      index: 'tiles',
      viewId: 'vBoat',
      accent: 'blue',
      order: 2,
    })
  })

  it('carries a business rule whole, INCLUDING that it was switched off', () => {
    const c = ok(full()).constraints?.[0]
    expect(c).toMatchObject({
      id: 'kHp',
      kind: 'implies',
      because: 'a priced hull has to say which model it is',
      enabled: false,
      edited: true,
      priority: 5,
    })
    expect(c?.if.clauses[0].left).toEqual({ fieldId: 'fCash' })
    expect(c?.then?.clauses[0].left).toEqual({ fieldId: 'fModel' })
  })

  it('carries the approved combinations of a table rule', () => {
    const c = ok(
      full({
        constraints: [
          constraint({ kind: 'table', then: undefined, combinations: [{ fCash: 1000 }] }),
        ],
      }),
    ).constraints?.[0]
    expect(c?.combinations).toEqual([{ fCash: 1000 }])
  })

  it('nests a page three levels deep and no further', () => {
    const deep = view({
      blocks: [
        {
          id: 'b1',
          tableId: 'tMotors',
          children: [
            { id: 'b2', tableId: 'tJoin', children: [{ id: 'b3', tableId: 'tBoats' }] },
          ],
        },
      ],
    })
    const v = ok(full({ views: [deep] })).views?.[0]
    expect(v?.blocks[0].children?.[0].tableId).toBe('tJoin')
    /* root is 1, so b1 is 2, b2 is 3 — b3 would be a fourth level */
    expect(v?.blocks[0].children?.[0].children).toBeUndefined()
  })

  it('omits a key rather than writing an empty list for it', () => {
    const d = ok(file())
    expect(d.org).toBeUndefined()
    expect(d.views).toBeUndefined()
    expect(d.modules).toBeUndefined()
    expect(d.constraints).toBeUndefined()
  })
})

/* ------------------------------------------------------------ */
/* 3. a v1 file still imports                                    */
/* ------------------------------------------------------------ */

describe('a file saved before any of this existed', () => {
  const v1 = () => ({
    kind: EXPORT_KIND,
    version: 1,
    exportedAt: '2025-11-02T00:00:00.000Z',
    project: { name: 'Last Year', rev: 9 },
    entities: [
      { id: 'tOld', name: 'Boat', accent: 'blue', fields: [{ id: 'fOld', name: 'Name', type: 'text' }], position: { x: 10, y: 20 } },
    ],
    groups: [],
    rules: [],
    rows: { tOld: [{ id: 'rOld', values: { fOld: 'Hull one' } }] },
  })

  it('opens, rather than being refused by the version bump meant to protect it', () => {
    const d = ok(v1())
    expect(d.entities).toHaveLength(1)
    expect(d.rows?.tOld).toHaveLength(1)
    expect(d.project).toEqual({ name: 'Last Year', rev: 9 })
  })

  it('arrives with none of the v2 keys, which is exactly what it has', () => {
    const d = ok(v1())
    expect(d.org).toBeUndefined()
    expect(d.views).toBeUndefined()
    expect(d.modules).toBeUndefined()
    expect(d.constraints).toBeUndefined()
    expect(d.entities[0].kind).toBeUndefined()
    expect(d.entities[0].sections).toBeUndefined()
  })

  it('is stamped with the version this build writes, so re-saving it upgrades it', () => {
    expect(ok(v1()).version).toBe(EXPORT_VERSION)
  })

  it('still refuses a file from a version this build cannot read', () => {
    const r = validateEnvelope({ ...v1(), version: EXPORT_VERSION + 1 })
    expect(r.ok).toBe(false)
  })
})

/* ------------------------------------------------------------ */
/* 4. referential sanity                                         */
/* ------------------------------------------------------------ */

describe('a pointer at a table that is not in the file', () => {
  it('drops the dead table id and keeps the module on what is left', () => {
    const m = ok(full({ modules: [moduleDef({ tableIds: ['tGone', 'tMotors'] })] })).modules?.[0]
    expect(m?.tableIds).toEqual(['tMotors'])
  })

  it('drops the module entirely when NOTHING it points at arrived', () => {
    expect(ok(full({ modules: [moduleDef({ tableIds: ['tGone'] })] })).modules).toBeUndefined()
  })

  it('drops a page whose root table did not arrive', () => {
    expect(ok(full({ views: [view({ rootTableId: 'tGone' })] })).views).toBeUndefined()
  })

  it('drops a block whose table did not arrive, and keeps the page', () => {
    const v = ok(
      full({
        views: [view({ blocks: [{ id: 'b1', tableId: 'tGone' }, { id: 'b2', tableId: 'tMotors' }] })],
      }),
    ).views?.[0]
    expect(v?.blocks.map((b) => b.tableId)).toEqual(['tMotors'])
  })

  it('keeps a block whose JOIN is missing — wider, not silently empty', () => {
    const v = ok(
      full({ views: [view({ blocks: [{ id: 'b1', tableId: 'tMotors', joinTableId: 'tGone' }] })] }),
    ).views?.[0]
    expect(v?.blocks[0].tableId).toBe('tMotors')
    expect(v?.blocks[0].joinTableId).toBeUndefined()
  })

  it('drops a filter or column naming a column the file does not carry', () => {
    const v = ok(
      full({
        views: [
          view({
            blocks: [
              {
                id: 'b1',
                tableId: 'tMotors',
                columns: ['fHp', 'fGone'],
                filters: [
                  { kind: 'contains', fieldId: 'fGone', text: 'x' },
                  { kind: 'contains', fieldId: 'fHp', text: '90' },
                ],
              },
            ],
          }),
        ],
      }),
    ).views?.[0]
    expect(v?.blocks[0].columns).toEqual(['fHp'])
    expect(v?.blocks[0].filters).toEqual([{ kind: 'contains', fieldId: 'fHp', text: '90' }])
  })

  it('leaves a module with no detail page rather than one pointing at a page that is gone', () => {
    const d = ok(full({ views: [], modules: [moduleDef()] }))
    expect(d.modules?.[0].viewId).toBeUndefined()
    expect(d.modules?.[0].name).toBe('Boats')
  })

  it('names a module after its primary table when the file gives it no name', () => {
    const m = ok(full({ modules: [moduleDef({ name: '   ' })] })).modules?.[0]
    expect(m?.name).toBe('Highfield')
  })
})

/* ------------------------------------------------------------ */
/* 5. a hostile file                                             */
/* ------------------------------------------------------------ */

describe('an imported design is untrusted input', () => {
  it.each([
    ['a page', 'views', (id: string) => full({ views: [view({ id })] })],
    ['a module', 'modules', (id: string) => full({ modules: [moduleDef({ id })] })],
    ['a rule', 'constraints', (id: string) => full({ constraints: [constraint({ id })] })],
  ])('refuses %s whose id could poison an object key', (_label, key, make) => {
    const d = ok(make('__proto__'))
    expect(d[key as 'views' | 'modules' | 'constraints']).toBeUndefined()
  })

  it('rejects a page id that collides with a table id', () => {
    const r = validateEnvelope(full({ views: [view({ id: 'tBoats' })] }))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('DUPLICATE ID')
  })

  it('rejects two modules sharing one id, which would share one store record', () => {
    const r = validateEnvelope(full({ modules: [moduleDef(), moduleDef({ order: 4 })] }))
    expect(r.ok).toBe(false)
  })

  it('drops a rule whose kind this build does not know, rather than defaulting it', () => {
    /* implies and excludes are near-opposites: a default here would
       import a rule saying the reverse of what was written */
    expect(ok(full({ constraints: [constraint({ kind: 'unless' })] })).constraints).toBeUndefined()
  })

  it('drops a verb nobody can name and keeps the rest', () => {
    const m = ok(
      full({ modules: [moduleDef({ capabilities: ['browse', 'sudo', 'quote', 'browse'] })] }),
    ).modules?.[0]
    expect(m?.capabilities).toEqual(['browse', 'quote'])
  })

  it('honours a module with every verb switched off, which is a choice', () => {
    const m = ok(full({ modules: [moduleDef({ capabilities: [] })] })).modules?.[0]
    expect(m?.capabilities).toEqual([])
  })

  it('gives a module with NO capabilities key the model’s own look-do-not-touch default', () => {
    const m = ok(full({ modules: [moduleDef({ capabilities: undefined })] })).modules?.[0]
    expect(m?.capabilities).toEqual(['browse', 'search', 'open'])
  })

  it('refuses an organisation with no name, and an industry nobody ships', () => {
    expect(ok(full({ org: { name: '  ', industry: 'marine' } })).org).toBeUndefined()
    expect(ok(full({ org: { name: 'X', industry: 'aerospace' } })).org).toBeUndefined()
  })

  it('leaves the because clause blank rather than writing a reason nobody gave', () => {
    const c = ok(full({ constraints: [constraint({ because: undefined })] })).constraints?.[0]
    expect(c?.because).toBe('')
  })

  it('says which block is damaged instead of accepting a file shaped wrong', () => {
    for (const key of ['views', 'modules', 'constraints']) {
      const r = validateEnvelope(full({ [key]: 'not a list' }))
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toContain('DAMAGED')
    }
  })

  it('survives junk in every design list without failing the whole import', () => {
    const d = ok(
      full({
        views: [null, 42, 'nope', view()],
        modules: [null, { id: 'x' }, moduleDef()],
        constraints: ['nope', { id: 'y' }, constraint()],
      }),
    )
    expect(d.views).toHaveLength(1)
    expect(d.modules).toHaveLength(1)
    expect(d.constraints).toHaveLength(1)
  })
})
