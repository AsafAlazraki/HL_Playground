/* ============================================================
   The data-quality rules, on the cases that have a right answer.

   Only rules whose verdict is not a matter of taste are asserted
   here — a duplicate name IS ambiguous, a link to a deleted table
   CAN never resolve, "Field 3" DOES tell the next reader nothing.
   The judgement calls (prefix clusters, low-cardinality text) are
   left alone on purpose: pinning a heuristic in a test freezes it.

   The two properties that hold for the whole engine — deterministic
   order and never throwing — are asserted at the bottom, because
   the review pane re-runs this on every keystroke and a lint bug
   must never take the sheet down.

   Fixtures are synthetic: 'Table A', 'Column 1'.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, FieldType, RowData } from '@/types/model'
import { lintProject } from './lint'

const field = (
  id: string,
  name: string,
  type: FieldType,
  extra: Partial<FieldDef> = {},
): FieldDef => ({ id, name, type, ...extra })

const table = (id: string, name: string, fields: FieldDef[]): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields,
  position: { x: 0, y: 0 },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const lint = (
  tables: EntityDef[],
  rowsByEntity: Record<string, RowData[]> = {},
): ReturnType<typeof lintProject> =>
  lintProject({ entities: Object.fromEntries(tables.map((t) => [t.id, t])), rowsByEntity })

const ruleIds = (tables: EntityDef[]): string[] => lint(tables).map((f) => f.ruleId)

describe('blockers — the findings that mean a model cannot work', () => {
  it('flags two tables sharing a name, once per table, because either could be meant', () => {
    const found = lint([
      table('t1', 'Table A', [field('f1', 'Column 1', 'text')]),
      table('t2', ' table a ', [field('f2', 'Column 1', 'text')]),
    ]).filter((f) => f.ruleId === 'entity-dup-name')
    expect(found.map((f) => f.entityId).sort()).toEqual(['t1', 't2'])
    expect(found.every((f) => f.severity === 'blocker')).toBe(true)
  })

  it('flags two columns of one table sharing a name, as one finding naming both', () => {
    const found = lint([
      table('t1', 'Table A', [
        field('f1', 'Column 1', 'text'),
        field('f2', 'COLUMN 1', 'number'),
      ]),
    ]).filter((f) => f.ruleId === 'field-dup-name')
    expect(found).toHaveLength(1)
    expect(found[0].fieldIds).toEqual(['f1', 'f2'])
    expect(found[0].severity).toBe('blocker')
  })

  it('flags a link whose table is gone, and offers to remove the column', () => {
    const found = lint([
      table('t1', 'Table A', [field('f1', 'Column 1', 'reference', { refEntityId: 'deleted' })]),
    ]).filter((f) => f.ruleId === 'dangling-link')
    expect(found).toHaveLength(1)
    expect(found[0].fix).toEqual({
      kind: 'remove-field',
      entityId: 't1',
      fieldId: 'f1',
      label: "Remove 'Column 1'",
    })
  })

  it('does not flag a link that has simply not been pointed anywhere yet', () => {
    expect(ruleIds([table('t1', 'Table A', [field('f1', 'Column 1', 'reference')])])).not.toContain(
      'dangling-link',
    )
  })
})

describe('advisories — the findings that mean a model will not read', () => {
  it('flags a plural table name and offers the singular only when it is safe', () => {
    const [safe] = lint([table('t1', 'Widgets', [field('f1', 'Column 1', 'text')])]).filter(
      (f) => f.ruleId === 'entity-plural',
    )
    expect(safe.fix).toMatchObject({ kind: 'rename-entity', name: 'Widget' })

    const [unsafe] = lint([table('t1', 'Companies', [field('f1', 'Column 1', 'text')])]).filter(
      (f) => f.ruleId === 'entity-plural',
    )
    // 'Companie' would be worse than no suggestion at all
    expect(unsafe.fix).toBeUndefined()
  })

  it('never calls a singular word ending in s plural', () => {
    for (const name of ['Status', 'Address', 'Analysis', 'Class']) {
      expect(ruleIds([table('t1', name, [field('f1', 'Column 1', 'text')])])).not.toContain(
        'entity-plural',
      )
    }
  })

  it('flags a table with no stored columns, and a table of only calculated ones', () => {
    expect(ruleIds([table('t1', 'Table A', [])])).toContain('no-fields')
    expect(
      ruleIds([table('t1', 'Table A', [field('f1', 'Column 1', 'formula', { formula: '1' })])]),
    ).toContain('no-fields')
    // one plain column is enough — this is not a "you have too few columns" rule
    expect(ruleIds([table('t1', 'Table A', [field('f1', 'Column 1', 'text')])])).not.toContain(
      'no-fields',
    )
  })

  it('flags a column still carrying its default name', () => {
    const found = lint([
      table('t1', 'Table A', [field('f1', 'Field 3', 'text'), field('f2', 'Column 1', 'text')]),
    ]).filter((f) => f.ruleId === 'field-default-name')
    expect(found.map((f) => f.fieldIds)).toEqual([['f1']])
  })
})

describe('the engine itself', () => {
  const messy = [
    table('t2', 'Table B', [field('f1', 'Field 1', 'text')]),
    table('t1', 'Table A', [
      field('f2', 'Column 1', 'text'),
      field('f3', 'Column 1', 'number'),
      field('f4', 'Column 2', 'reference', { refEntityId: 'gone' }),
    ]),
  ]

  it('returns byte-identical findings for the same model, so a re-lint never churns', () => {
    expect(JSON.stringify(lint(messy))).toBe(JSON.stringify(lint([...messy].reverse())))
  })

  it('orders by table name, then blockers before advisories', () => {
    const found = lint(messy)
    expect(found.map((f) => f.entityId)[0]).toBe('t1') // 'Table A' before 'Table B'
    const forA = found.filter((f) => f.entityId === 't1').map((f) => f.severity)
    expect(forA.indexOf('advisory')).toBeGreaterThan(forA.lastIndexOf('blocker'))
  })

  it('gives every finding an id that is stable across runs and unique within one', () => {
    const ids = lint(messy).map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(lint(messy).map((f) => f.id))
  })

  it('survives the shapes an empty or half-built project actually has', () => {
    expect(lintProject({ entities: {}, rowsByEntity: {} })).toEqual([])
    // a table with rows recorded under no key, and a blank name
    expect(() => lint([table('t1', '   ', [])])).not.toThrow()
  })
})
