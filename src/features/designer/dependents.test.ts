/* ============================================================
   What a rename must carry with it, and what a delete must warn
   about.

   Fixtures are obviously synthetic — "Table A", "Column 1". Nothing
   here may be mistaken for a boat, a brand, a price or a real rule.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, RuleDef } from '@/types/model'
import {
  entityDependents,
  formulaReaders,
  nameList,
  renameFieldRefs,
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
