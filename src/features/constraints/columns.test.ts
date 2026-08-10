/* ============================================================
   COLUMN CONCEPTS — the mechanism that lets one rule bite on
   every brand's table.

   ONE TABLE PER BRAND means a rule written against a column has to
   find that column on tables it has never heard of, addressed by
   kind + name rather than by field id. If concepts stop merging,
   nothing errors: a rule quietly applies to one brand and silently
   ignores the rest, which is worse than a rule that fails.

   The other property asserted here is DETERMINISM. Seeded rules
   store `representativeFieldId(concept)` in their clauses, and a
   re-seed must produce byte-identical ids or every seeded rule
   duplicates. That is a property of the ORDER concepts are built
   in, so it is tested by shuffling the input.

   Fixtures are synthetic: 'Table A' / 'Table B' are two tables of
   the same kind, columns are 'Column 1', 'Column 2'.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, FieldType, TableKind } from '@/types/model'
import { PAIR_FIELDS } from '@/types/model'
import {
  buildConcepts,
  conceptByKey,
  conceptIndex,
  conceptOptionLabel,
  fieldOn,
  representativeFieldId,
} from './columns'

const field = (
  id: string,
  name: string,
  type: FieldType,
  extra: Partial<FieldDef> = {},
): FieldDef => ({ id, name, type, ...extra })

const table = (id: string, name: string, kind: TableKind, fields: FieldDef[]): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind,
  fields,
  position: { x: 0, y: 0 },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const project = (tables: EntityDef[]): Record<string, EntityDef> =>
  Object.fromEntries(tables.map((t) => [t.id, t]))

const tableA = table('t-a', 'Table A', 'boat', [
  field('a1', 'Column 1', 'number'),
  field('a2', 'Column 2', 'select', { options: ['X', 'Y'] }),
])
const tableB = table('t-b', 'Table B', 'boat', [
  field('b1', ' column 1 ', 'number'), // same column, written differently
  field('b2', 'Column 2', 'select', { options: ['Y', 'Z'] }),
])
const tableC = table('t-c', 'Table C', 'motor', [field('c1', 'Column 1', 'number')])

describe('buildConcepts', () => {
  it('makes one concept of a column that appears on every table of a kind', () => {
    const concepts = buildConcepts(project([tableA, tableB]))
    const one = conceptByKey(concepts, 'boat::column 1')
    expect(one?.fieldIds).toEqual(['a1', 'b1'])
    expect(one?.tableIds).toEqual(['t-a', 't-b'])
    expect(one?.name).toBe('Column 1') // the name as the first table writes it
  })

  it('never merges across kinds — the same word on a motor is a different column', () => {
    const concepts = buildConcepts(project([tableA, tableB, tableC]))
    expect(conceptByKey(concepts, 'boat::column 1')?.fieldIds).toEqual(['a1', 'b1'])
    expect(conceptByKey(concepts, 'motor::column 1')?.fieldIds).toEqual(['c1'])
  })

  it('unions the choices, so a rule can name a value only one brand offers', () => {
    const concepts = buildConcepts(project([tableA, tableB]))
    expect(conceptByKey(concepts, 'boat::column 2')?.options).toEqual(['X', 'Y', 'Z'])
  })

  it('offers only columns a sentence can honestly talk about', () => {
    const kitchenSink = table('t-k', 'Table K', 'boat', [
      field('k1', 'Column 1', 'text'),
      field('k2', 'Column 2', 'formula', { formula: '1' }), // an outcome, not a choice
      field('k3', 'Column 3', 'reference', { refEntityId: 't-a' }), // a row id, not a word
      field('k4', 'Column 4', 'image'),
      ...PAIR_FIELDS.map((p) => field(p.id, p.name, p.type)), // machinery, not business
    ])
    const keys = buildConcepts(project([kitchenSink])).map((c) => c.key)
    expect(keys).toEqual(['boat::column 1'])
  })

  it('reads the same however the tables are ordered, so a re-seed cannot duplicate', () => {
    const forward = buildConcepts(project([tableA, tableB, tableC]))
    const backward = buildConcepts(project([tableC, tableB, tableA]))
    expect(JSON.stringify(backward)).toBe(JSON.stringify(forward))
    expect(representativeFieldId(conceptByKey(backward, 'boat::column 1')!)).toBe('a1')
  })
})

describe('finding a concept again', () => {
  const concepts = buildConcepts(project([tableA, tableB]))

  it('resolves EVERY member id back to the concept, not just the representative', () => {
    const index = conceptIndex(concepts)
    expect(index.get('a1')?.key).toBe('boat::column 1')
    expect(index.get('b1')?.key).toBe('boat::column 1')
    expect(index.get('nothing')).toBeUndefined()
  })

  it('finds the column this concept means on a given table', () => {
    const one = conceptByKey(concepts, 'boat::column 1')!
    expect(fieldOn(one, tableB)?.id).toBe('b1')
    expect(fieldOn(one, tableC)).toBeUndefined()
  })

  it('says how many tables a concept spans, so a picker cannot mislead', () => {
    expect(conceptOptionLabel(conceptByKey(concepts, 'boat::column 1')!)).toBe(
      'Column 1 · 2 boat tables',
    )
    expect(conceptOptionLabel(buildConcepts(project([tableC]))[0])).toBe('Column 1')
  })
})
