/* ============================================================
   THE STRIP'S TWO FIGURES.

   What is asserted here is the part a person could not see going
   wrong: a count that silently answers a different question. The
   strip prints the same sentence the load toast prints, and the
   only way to keep that true across a refactor is to write the
   toast's own wording down and compare against it.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'
import { censusLine, censusText, sheetCensus } from './census'

/* Fixtures — the same shape `cards.test.ts` builds, so a change to
   the contract breaks both files rather than only the older one. */
const STAMP = '2026-08-01T00:00:00.000Z'

const table = (id: string, extra: Partial<EntityDef> = {}): EntityDef => ({
  id,
  name: id,
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

describe('sheetCensus', () => {
  it('counts every table on the sheet and every row under them', () => {
    const entities = { a: table('a'), b: table('b'), c: table('c') }
    const rowsByEntity = { a: rows('a', 4), b: rows('b', 1), c: rows('c', 0) }
    expect(sheetCensus(entities, rowsByEntity)).toEqual({ tables: 3, rows: 5 })
  })

  /* THE CASE THE OTHER READER GETS WRONG. A table drawn and not
     yet filled has no entry in the row map at all — walking the
     map instead of the entities would report two tables where a
     person has made three. */
  it('counts a table the store holds no row list for', () => {
    const entities = { a: table('a'), b: table('b'), fresh: table('fresh') }
    expect(sheetCensus(entities, { a: rows('a', 2), b: rows('b', 3) })).toEqual({
      tables: 3,
      rows: 5,
    })
  })

  /* JOINS AND RETIRED TABLES ARE IN. This is the sheet-wide reader,
     not `fileTally` — it must agree with the rail's Data row and
     with the load toast, and both of those count every entity. A
     change that quietly filtered here would put a fourth figure on
     screen for one fact. */
  it('keeps joins and retired tables, unlike fileTally', () => {
    const entities = {
      a: table('a'),
      j: table('j', { role: 'join' }),
      old: table('old', { retired: true }),
    }
    expect(
      sheetCensus(entities, { a: rows('a', 2), j: rows('j', 9), old: rows('old', 1) }),
    ).toEqual({ tables: 3, rows: 12 })
  })

  it('is zero on an empty sheet rather than throwing', () => {
    expect(sheetCensus({}, {})).toEqual({ tables: 0, rows: 0 })
  })
})

describe('censusLine', () => {
  /* THE LOAD TOAST'S OWN WORDING, verbatim from demoLoad.ts:231,
     against the real seed's figures. If this fails, two surfaces
     have started describing one file differently. */
  it('reads as the load toast reads, on the real seed figures', () => {
    const line = censusLine({ tables: 53, rows: 15_691 })
    expect(line).not.toBeNull()
    expect(line && censusText(line)).toBe('15,691 rows across 53 tables')
  })

  it('keeps the figure apart from its noun, so the figure can be mono', () => {
    const line = censusLine({ tables: 53, rows: 15_691 })
    expect(line?.rows).toEqual({ n: '15,691', noun: 'rows' })
    expect(line?.tables).toEqual({ n: '53', noun: 'tables' })
    expect(line?.joiner).toBe('across')
  })

  it('says "1 row across 1 table"', () => {
    const line = censusLine({ tables: 1, rows: 1 })
    expect(line && censusText(line)).toBe('1 row across 1 table')
  })

  /* A sheet with tables and nothing in them yet is a true fact and
     is drawn; it is the TABLE count that decides, because zero
     tables is the state where the line has nothing to say. */
  it('draws a sheet whose tables are still empty', () => {
    const line = censusLine({ tables: 4, rows: 0 })
    expect(line && censusText(line)).toBe('0 rows across 4 tables')
  })

  it('draws nothing at all on an empty sheet', () => {
    expect(censusLine({ tables: 0, rows: 0 })).toBeNull()
  })
})
