/* ============================================================
   What a rename must carry with it, and what a delete must warn
   about.

   Fixtures are obviously synthetic — "Table A", "Column 1". Nothing
   here may be mistaken for a boat, a brand, a price or a real rule.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type {
  EntityDef,
  FieldDef,
  ModuleDef,
  RuleDef,
  ViewBlock,
  ViewDef,
} from '@/types/model'
import {
  entityDependents,
  entityPages,
  fieldViewers,
  formulaReaders,
  nameList,
  renameFieldRefs,
  retargetBreakage,
  retypeBreakage,
  ruleBreakage,
} from './dependents'

const field = (id: string, name: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  id,
  name,
  type: 'number',
  ...extra,
})

const entity = (fields: FieldDef[]): EntityDef =>
  ({
    id: 'e1',
    name: 'Table A',
    accent: 'blue',
    position: { x: 0, y: 0 },
    fields,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  }) as EntityDef

/* ---------------------------------------------------------- */

describe('renameFieldRefs', () => {
  it('rewrites the reference a rename would otherwise orphan', () => {
    const r = renameFieldRefs('[Column 1] + 1', 'Column 1', 'Column One')
    expect(r).toEqual({ src: '[Column One] + 1', count: 1 })
  })

  it('rewrites every occurrence, not just the first', () => {
    const r = renameFieldRefs('[Column 1] * [Column 1]', 'Column 1', 'C')
    expect(r.count).toBe(2)
    expect(r.src).toBe('[C] * [C]')
  })

  /* the resolver matches case-insensitively and trims, so a rewrite
     that matched more narrowly would leave a live reference behind
     and still look like it had worked */
  it('matches the way the engine resolves — case-blind and trimmed', () => {
    expect(renameFieldRefs('[ column 1 ]', 'Column 1', 'C').src).toBe('[C]')
    expect(renameFieldRefs('[COLUMN 1]', 'Column 1', 'C').count).toBe(1)
  })

  it('leaves a different column alone', () => {
    const r = renameFieldRefs('[Column 1] + [Column 12]', 'Column 1', 'C')
    expect(r.src).toBe('[C] + [Column 12]')
    expect(r.count).toBe(1)
  })

  /* a quoted string is text, not a reference — moving the words
     inside it would silently change what a formula prints */
  it('never touches brackets inside quoted text', () => {
    expect(renameFieldRefs('"[Column 1]" & [Column 1]', 'Column 1', 'C')).toEqual({
      src: '"[Column 1]" & [C]',
      count: 1,
    })
    expect(renameFieldRefs("'[Column 1]'", 'Column 1', 'C').count).toBe(0)
  })

  it('survives a doubled quote inside a string', () => {
    const r = renameFieldRefs('"a""[Column 1]""b" & [Column 1]', 'Column 1', 'C')
    expect(r.src).toBe('"a""[Column 1]""b" & [C]')
  })

  /* ']' inside a name is written ']]' — both when read and written */
  it('reads and writes a name containing a bracket', () => {
    expect(renameFieldRefs('[Column 1]]]', 'Column 1]', 'C').src).toBe('[C]')
    expect(renameFieldRefs('[Column 1]', 'Column 1', 'C]').src).toBe('[C]]]')
  })

  /* a formula that is already broken must not be made worse, and this
     function must not be the thing that decides it is broken */
  it('leaves an unlexable source exactly as it found it', () => {
    expect(renameFieldRefs('[Column 1', 'Column 1', 'C')).toEqual({
      src: '[Column 1',
      count: 0,
    })
    expect(renameFieldRefs('"open + [Column 1]', 'Column 1', 'C').count).toBe(0)
  })

  it('renaming to a name nothing references changes nothing', () => {
    expect(renameFieldRefs('[Column 2]', 'Column 1', 'C')).toEqual({
      src: '[Column 2]',
      count: 0,
    })
  })

  it('refuses to work from a blank name rather than matching everything', () => {
    expect(renameFieldRefs('[Column 1]', '   ', 'C').count).toBe(0)
  })
})

/* ---------------------------------------------------------- */

describe('formulaReaders', () => {
  const base = field('f1', 'Column 1')

  it('finds the calculated column that names it', () => {
    const e = entity([
      base,
      field('f2', 'Column 2', { type: 'formula', formula: '[Column 1] * 2' }),
    ])
    expect(formulaReaders(e, base).map((f) => f.id)).toEqual(['f2'])
  })

  it('does not report a column that merely stores a value', () => {
    const e = entity([base, field('f2', 'Column 2')])
    expect(formulaReaders(e, base)).toEqual([])
  })

  /* the engine flags self-reference itself; a rename of the column
     the formula lives on is not a dependency to carry */
  it('never reports the column as its own reader', () => {
    const self = field('f1', 'Column 1', { type: 'formula', formula: '[Column 1]' })
    expect(formulaReaders(entity([self]), self)).toEqual([])
  })

  it('reports readers in column order', () => {
    const e = entity([
      base,
      field('f2', 'Column 2', { type: 'formula', formula: '[Column 1]' }),
      field('f3', 'Column 3', { type: 'formula', formula: '1 + [Column 1]' }),
    ])
    expect(formulaReaders(e, base).map((f) => f.name)).toEqual(['Column 2', 'Column 3'])
  })

  it('an unnamed column is read by nothing, because nothing can name it', () => {
    const blank = field('f1', '')
    const e = entity([blank, field('f2', 'C2', { type: 'formula', formula: '[]' })])
    expect(formulaReaders(e, blank)).toEqual([])
  })
})

/* ---------------------------------------------------------- */

describe('nameList', () => {
  it('writes a sentence, not a list', () => {
    expect(nameList([])).toBe('')
    expect(nameList(['A'])).toBe('A')
    expect(nameList(['A', 'B'])).toBe('A and B')
    expect(nameList(['A', 'B', 'C'])).toBe('A, B and C')
  })
})

/* ---------------------------------------------------------- */

describe('ruleBreakage', () => {
  const target: EntityDef = entity([field('f1', 'Column 1'), field('f2', 'Column 2')])

  const rule = (nodes: RuleDef['nodes']): RuleDef => ({
    id: 'r1',
    name: 'Rule One',
    rootEntityId: 'e1',
    enabled: true,
    nodes,
    edges: [],
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  })

  const ctx = { entities: { e1: target }, rowsByEntity: { e1: [] } }

  it('names the rule that would lose the column it writes to', () => {
    const r = rule([
      { id: 'n1', kind: 'start', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'n2',
        kind: 'action',
        position: { x: 0, y: 0 },
        config: { action: { op: 'set', fieldId: 'f1', value: { kind: 'literal', value: 1 } } },
      },
    ])
    const breaks = ruleBreakage(ctx, { r1: r }, 'e1', 'f1')
    expect(breaks).toHaveLength(1)
    expect(breaks[0].ruleName).toBe('Rule One')
    expect(breaks[0].messages.join(' ')).toMatch(/no longer exists/)
  })

  /* the whole point of diffing: a rule that is already broken for
     some other reason must not be blamed on this column */
  it('reports only what the removal adds, never what was broken already', () => {
    const r = rule([
      { id: 'n1', kind: 'start', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'n2',
        kind: 'action',
        position: { x: 0, y: 0 },
        config: {
          action: { op: 'set', fieldId: 'gone', value: { kind: 'literal', value: 1 } },
        },
      },
    ])
    expect(ruleBreakage(ctx, { r1: r }, 'e1', 'f1')).toEqual([])
  })

  it('says nothing about a rule that never mentions the column', () => {
    const r = rule([
      { id: 'n1', kind: 'start', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'n2',
        kind: 'action',
        position: { x: 0, y: 0 },
        config: { action: { op: 'set', fieldId: 'f2', value: { kind: 'literal', value: 1 } } },
      },
    ])
    expect(ruleBreakage(ctx, { r1: r }, 'e1', 'f1')).toEqual([])
  })

  it('is empty for a table that is not on the sheet', () => {
    expect(ruleBreakage(ctx, {}, 'nope', 'f1')).toEqual([])
  })
})

/* ---------------------------------------------------------- */

describe('entityDependents', () => {
  /* the table about to be deleted, and a second one that points at it */
  const doomed = entity([field('f1', 'Column 1')])
  const other: EntityDef = {
    ...doomed,
    id: 'e2',
    name: 'Table B',
    fields: [
      field('g1', 'Column 1'),
      field('g2', 'Column 2', { type: 'reference', refEntityId: 'e1' }),
      /* a link aimed somewhere else must not be swept up with it */
      field('g3', 'Column 3', { type: 'reference', refEntityId: 'e3' }),
    ],
  }
  const ctx = {
    entities: { e1: doomed, e2: other },
    rowsByEntity: { e1: [], e2: [] },
  }

  const rule = (id: string, name: string, rootEntityId: string): RuleDef => ({
    id,
    name,
    rootEntityId,
    enabled: true,
    nodes: [{ id: 'n1', kind: 'start', position: { x: 0, y: 0 }, config: {} }],
    edges: [],
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  })

  /* the cascade in `deleteEntity` drops these silently, and they are
     columns on a table the person is not looking at */
  it('names the link column on the other table, and which table it is on', () => {
    expect(entityDependents(ctx, {}, 'e1').links).toEqual([
      { tableName: 'Table B', columnName: 'Column 2' },
    ])
  })

  /* a rule rooted here is not marked, it is struck from the project —
     the one warning a person will ever get about it is this sheet */
  it('separates the rules that are deleted outright from the ones that break', () => {
    const rules = {
      r1: rule('r1', 'Rule One', 'e1'),
      r2: rule('r2', 'Rule Two', 'e2'),
    }
    const d = entityDependents(ctx, rules, 'e1')
    expect(d.rootedRules).toEqual([{ ruleId: 'r1', ruleName: 'Rule One' }])
    /* Rule Two is rooted elsewhere and never mentions the table, so it
       is neither deleted nor blamed */
    expect(d.brokenRules).toEqual([])
  })

  it('never reports a deleted rule a second time as a broken one', () => {
    const d = entityDependents(ctx, { r1: rule('r1', 'Rule One', 'e1') }, 'e1')
    expect(d.brokenRules.map((b) => b.ruleId)).not.toContain('r1')
  })

  it('says nothing at all about a table that is not on the sheet', () => {
    expect(entityDependents(ctx, {}, 'nope')).toEqual({
      links: [],
      rootedRules: [],
      brokenRules: [],
    })
  })

  /* a table nothing points at and no rule is written about is exactly
     as harmless as the sheet will say it is */
  it('finds nothing holding on to an unreferenced table', () => {
    expect(entityDependents(ctx, {}, 'e2')).toEqual({
      links: [],
      rootedRules: [],
      brokenRules: [],
    })
  })
})

/* ---------------------------------------------------------- */

describe('retypeBreakage', () => {
  const target: EntityDef = entity([field('f1', 'Column 1'), field('f2', 'Column 2')])
  const ctx = { entities: { e1: target }, rowsByEntity: { e1: [] } }

  const writesTo = (fieldId: string): RuleDef => ({
    id: 'r1',
    name: 'Rule One',
    rootEntityId: 'e1',
    enabled: true,
    nodes: [
      { id: 'n1', kind: 'start', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'n2',
        kind: 'action',
        position: { x: 0, y: 0 },
        config: { action: { op: 'set', fieldId, value: { kind: 'literal', value: 1 } } },
      },
    ],
    edges: [],
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  })

  /* the case the retype sheet was silent about: a calculated column
     cannot be written to, so every Set aimed at it becomes a blocker
     the moment the type changes — and no value had to be lost for
     that to happen */
  it('names the rule that writes to a column about to become calculated', () => {
    const breaks = retypeBreakage(ctx, { r1: writesTo('f1') }, 'e1', 'f1', 'formula')
    expect(breaks).toHaveLength(1)
    expect(breaks[0].ruleName).toBe('Rule One')
    expect(breaks[0].messages.join(' ')).toMatch(/calculated/)
  })

  it('says nothing about a rule that writes to a different column', () => {
    expect(retypeBreakage(ctx, { r1: writesTo('f2') }, 'e1', 'f1', 'formula')).toEqual([])
  })

  /* a caller may ask without checking first, so asking for the type
     the column already has must be free and silent */
  it('is empty when the type is not actually changing', () => {
    expect(retypeBreakage(ctx, { r1: writesTo('f1') }, 'e1', 'f1', 'number')).toEqual([])
  })

  it('is empty for a table or a column that is not there', () => {
    expect(retypeBreakage(ctx, { r1: writesTo('f1') }, 'nope', 'f1', 'formula')).toEqual([])
    expect(retypeBreakage(ctx, { r1: writesTo('f1') }, 'e1', 'nope', 'formula')).toEqual([])
  })
})

/* ---------------------------------------------------------- */

describe('retargetBreakage', () => {
  /* the shape a hop needs: a table with a link, and two tables it
     could point at — one that has the column the rule reads and one
     that does not */
  const here: EntityDef = {
    ...entity([field('g1', 'Column 1')]),
    fields: [
      field('g1', 'Column 1'),
      field('g2', 'Link', { type: 'reference', refEntityId: 'e2' }),
    ],
  }
  const oldTarget: EntityDef = { ...entity([field('f1', 'Column 1')]), id: 'e2', name: 'Table B' }
  const newTarget: EntityDef = { ...entity([field('f9', 'Column 9')]), id: 'e3', name: 'Table C' }
  const ctx = {
    entities: { e1: here, e2: oldTarget, e3: newTarget },
    rowsByEntity: { e1: [], e2: [], e3: [] },
  }

  /** a rule that reads Table B's Column 1 by hopping through the link */
  const hops: RuleDef = {
    id: 'r1',
    name: 'Rule One',
    rootEntityId: 'e1',
    enabled: true,
    nodes: [
      { id: 'n1', kind: 'start', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'n2',
        kind: 'condition',
        position: { x: 0, y: 0 },
        config: {
          branches: [
            {
              id: 'b1',
              label: 'yes',
              group: {
                combinator: 'AND',
                clauses: [{ id: 'c1', left: { viaFieldId: 'g2', fieldId: 'f1' }, op: 'notEmpty' }],
              },
            },
          ],
        },
      },
    ],
    edges: [],
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  }

  /* the case the re-point sheet was silent about: no cell has to be
     filled for this to break, and the sheet's only gate was the cells */
  it('names the rule whose hop lands on a column the new table has not got', () => {
    const breaks = retargetBreakage(ctx, { r1: hops }, 'e1', 'g2', 'e3')
    expect(breaks).toHaveLength(1)
    expect(breaks[0].ruleName).toBe('Rule One')
    expect(breaks[0].messages.join(' ')).toMatch(/no longer on "Table C"/)
  })

  /* re-pointing at a table that HAS the column breaks nothing, and a
     sheet that cried wolf on every re-point would be ignored */
  it('says nothing when the new table carries the same column', () => {
    const twin: EntityDef = { ...oldTarget, id: 'e4', name: 'Table D' }
    const wider = { ...ctx, entities: { ...ctx.entities, e4: twin } }
    expect(retargetBreakage(wider, { r1: hops }, 'e1', 'g2', 'e4')).toEqual([])
  })

  it('is empty when the link already points there', () => {
    expect(retargetBreakage(ctx, { r1: hops }, 'e1', 'g2', 'e2')).toEqual([])
  })

  it('is empty for a link that is not there', () => {
    expect(retargetBreakage(ctx, { r1: hops }, 'e1', 'nope', 'e3')).toEqual([])
  })
})

/* ---------------------------------------------------------- */

const view = (id: string, name: string, rootTableId: string, blocks: ViewBlock[]): ViewDef => ({
  id,
  name,
  rootTableId,
  blocks,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const module = (id: string, name: string, tableIds: string[]): ModuleDef => ({
  id,
  name,
  description: '',
  tableIds,
  capabilities: ['browse'],
  index: 'rows',
  accent: 'blue',
  order: 0,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

describe('entityPages', () => {
  /* `deleteEntity` rewrites entities, rows and rules and returns them —
     views and modules are not in that object, so everything this
     function finds SURVIVES the delete holding a dead pointer. That is
     why it is counted before the press and not repaired after it. */
  const views = {
    v1: view('v1', 'Page One', 'e1', []),
    v2: view('v2', 'Page Two', 'e2', [{ id: 'b1', tableId: 'e1' }]),
    v3: view('v3', 'Page Three', 'e2', [{ id: 'b1', tableId: 'e3' }]),
    v4: view('v4', 'Page Four', 'e2', [
      { id: 'b1', tableId: 'e3', children: [{ id: 'b2', tableId: 'e1' }] },
    ]),
  }
  const modules = {
    m1: module('m1', 'Module One', ['e2', 'e1']),
    m2: module('m2', 'Module Two', ['e1']),
    m3: module('m3', 'Module Three', ['e3']),
  }

  it('separates the page that loses its subject from the one that loses a block', () => {
    const p = entityPages(views, modules, 'e1')
    expect(p.rootedViews).toEqual([{ viewId: 'v1', viewName: 'Page One' }])
    expect(p.blockViews.map((v) => v.viewName)).toEqual(['Page Four', 'Page Two'])
  })

  /* a nested block is still a block on the page, and a page that hangs
     accessories under motors under boats is exactly the page a person
     is least likely to remember while deleting a table */
  it('finds a block nested under another one', () => {
    expect(entityPages(views, modules, 'e1').blockViews.map((v) => v.viewId)).toContain('v4')
  })

  /* a page counts once: saying it loses its subject AND a block would
     read as two losses where there is one page */
  it('never counts one page under both headings', () => {
    const rooted = view('v5', 'Page Five', 'e1', [{ id: 'b1', tableId: 'e1' }])
    const p = entityPages({ v5: rooted }, {}, 'e1')
    expect(p.rootedViews).toHaveLength(1)
    expect(p.blockViews).toEqual([])
  })

  /* a curated relationship hangs on a join table, and deleting the
     join takes the block with it just as surely */
  it('counts a block that names the table as its join', () => {
    const v = view('v6', 'Page Six', 'e2', [{ id: 'b1', tableId: 'e3', joinTableId: 'e1' }])
    expect(entityPages({ v6: v }, {}, 'e1').blockViews).toHaveLength(1)
  })

  /* `moduleTables` skips an id that no longer resolves, so a module
     standing on one table becomes a door onto nothing */
  it('marks the module that would have no other table to list', () => {
    const p = entityPages(views, modules, 'e1')
    expect(p.places).toEqual([
      { moduleId: 'm1', moduleName: 'Module One', last: false },
      { moduleId: 'm2', moduleName: 'Module Two', last: true },
    ])
  })

  it('finds nothing holding on to a table no page and no module names', () => {
    expect(entityPages(views, modules, 'e9')).toEqual({
      rootedViews: [],
      blockViews: [],
      places: [],
    })
  })
})

/* ---------------------------------------------------------- */

describe('fieldViewers', () => {
  /* two tables and a link between them, because which SIDE a clause is
     written on decides which table its column belongs to */
  const boats = entity([field('f1', 'Column 1'), field('f2', 'Column 2')])
  const trailers: EntityDef = {
    ...boats,
    id: 'e2',
    name: 'Table B',
    fields: [field('g1', 'Column 1'), field('g2', 'Link', { type: 'reference', refEntityId: 'e1' })],
  }
  const entities = { e1: boats, e2: trailers }

  it('counts a column shown in a block', () => {
    const v = view('v1', 'Page One', 'e2', [{ id: 'b1', tableId: 'e1', columns: ['f1', 'f2'] }])
    expect(fieldViewers({ v1: v }, entities, 'e1', 'f1')).toEqual([
      { viewId: 'v1', viewName: 'Page One', uses: 1 },
    ])
  })

  it('counts a column the block filters on, and adds the two together', () => {
    const v = view('v1', 'Page One', 'e2', [
      {
        id: 'b1',
        tableId: 'e1',
        columns: ['f1'],
        filters: [{ kind: 'contains', fieldId: 'f1', text: 'x' }],
      },
    ])
    expect(fieldViewers({ v1: v }, entities, 'e1', 'f1')[0].uses).toBe(2)
  })

  /* `evalPairRule` binds LEFT to the candidate row and RIGHT to the
     source row, so the two sides are two different tables and a
     matcher that ignored that would count columns that are not there */
  it('reads the left of a block rule against the block’s own table', () => {
    const v = view('v1', 'Page One', 'e2', [
      {
        id: 'b1',
        tableId: 'e1',
        rule: {
          combinator: 'AND',
          clauses: [{ id: 'c1', left: { fieldId: 'f1' }, op: 'notEmpty' }],
        },
      },
    ])
    expect(fieldViewers({ v1: v }, entities, 'e1', 'f1')[0].uses).toBe(1)
    /* the same id read as if it were the root's column finds nothing */
    expect(fieldViewers({ v1: v }, entities, 'e2', 'f1')).toEqual([])
  })

  it('reads the right of a block rule against the table the block hangs under', () => {
    const v = view('v1', 'Page One', 'e2', [
      {
        id: 'b1',
        tableId: 'e1',
        rule: {
          combinator: 'AND',
          clauses: [
            {
              id: 'c1',
              left: { fieldId: 'f1' },
              op: 'eq',
              right: { kind: 'field', path: { fieldId: 'g1' } },
            },
          ],
        },
      },
    ])
    /* g1 belongs to the ROOT table, not the block's */
    expect(fieldViewers({ v1: v }, entities, 'e2', 'g1')[0].uses).toBe(1)
    expect(fieldViewers({ v1: v }, entities, 'e1', 'g1')).toEqual([])
  })

  /* a hop is two columns: the link itself, and the column it lands on */
  it('counts the link a clause hops through as well as where it lands', () => {
    const v = view('v1', 'Page One', 'e2', [
      {
        id: 'b1',
        tableId: 'e2',
        rule: {
          combinator: 'AND',
          clauses: [{ id: 'c1', left: { viaFieldId: 'g2', fieldId: 'f1' }, op: 'notEmpty' }],
        },
      },
    ])
    /* the hop itself is a column on the block's table */
    expect(fieldViewers({ v1: v }, entities, 'e2', 'g2')[0].uses).toBe(1)
    /* and the clause lands on a column of the table it points at */
    expect(fieldViewers({ v1: v }, entities, 'e1', 'f1')[0].uses).toBe(1)
  })

  /* an unfollowable hop is reported as nothing rather than as a match:
     a count that guesses is what this module exists to replace */
  it('says nothing when the hop cannot be followed', () => {
    const v = view('v1', 'Page One', 'e2', [
      {
        id: 'b1',
        tableId: 'e2',
        rule: {
          combinator: 'AND',
          clauses: [{ id: 'c1', left: { viaFieldId: 'g1', fieldId: 'f1' }, op: 'notEmpty' }],
        },
      },
    ])
    /* g1 is a number column, not a link, so it lands nowhere */
    expect(fieldViewers({ v1: v }, entities, 'e1', 'f1')).toEqual([])
  })

  it('walks nested blocks against their PARENT, not the root', () => {
    const v = view('v1', 'Page One', 'e2', [
      {
        id: 'b1',
        tableId: 'e1',
        children: [
          {
            id: 'b2',
            tableId: 'e2',
            rule: {
              combinator: 'AND',
              clauses: [
                {
                  id: 'c1',
                  left: { fieldId: 'g1' },
                  op: 'eq',
                  right: { kind: 'field', path: { fieldId: 'f1' } },
                },
              ],
            },
          },
        ],
      },
    ])
    /* the child's right side is the PARENT's table (e1), not the root */
    expect(fieldViewers({ v1: v }, entities, 'e1', 'f1')[0].uses).toBe(1)
  })

  it('lists no page at all when nothing names the column', () => {
    const v = view('v1', 'Page One', 'e2', [{ id: 'b1', tableId: 'e1', columns: ['f2'] }])
    expect(fieldViewers({ v1: v }, entities, 'e1', 'f1')).toEqual([])
  })
})
