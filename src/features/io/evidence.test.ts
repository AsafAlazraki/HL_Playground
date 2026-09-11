/* ============================================================
   THE APPLY LOG — CONFIG_FINDINGS §4 adopt 7.

   What is asserted here is what the log DECIDES, not what it holds:
   what is worth recording at all, what it does when the drawer is
   full, what it says when it could not keep everything, and whether
   a line of the file it writes stands on its own. The shape of a
   record is the plan's shape and `tableCsv.test.ts` already owns
   that.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ADDED_KEPT,
  CELLS_KEPT,
  KEEP,
  clearMerges,
  forgetMerges,
  mergeFileName,
  mergeJsonl,
  mergesOf,
  recordMerge,
} from './evidence'
import type { CellChange } from './tableCsv'

const ORG = 'northside'

const cell = (i: number, column = 'Cash'): CellChange => ({
  rowId: `r${i}`,
  rowLabel: `Zeta ${i}`,
  fieldId: 'f-cash',
  columnName: column,
  from: '68,990',
  to: '71,990',
  value: 71990,
})

const facts = (over: Partial<Parameters<typeof recordMerge>[0]> = {}) => ({
  tableId: 'e-zeta',
  tableName: 'Zeta Hulls',
  source: 'zeta-sept.csv',
  matchedOn: 'key' as const,
  changes: [cell(1)],
  added: [],
  rowsChanged: 1,
  ...over,
})

beforeEach(() => {
  forgetMerges()
  globalThis.localStorage?.clear()
})

afterEach(() => {
  forgetMerges()
})

describe('what is worth putting on the record', () => {
  it('keeps a merge that changed something', () => {
    recordMerge(facts(), 1_700_000_000_000, ORG)
    expect(mergesOf('e-zeta', ORG)).toHaveLength(1)
  })

  it('KEEPS NOTHING FOR A FILE THAT CHANGED NOTHING, because that is not an event', () => {
    expect(recordMerge(facts({ changes: [], added: [] }), 1, ORG)).toBeNull()
    expect(mergesOf('e-zeta', ORG)).toHaveLength(0)
  })

  it('answers for one register, not for the sheet', () => {
    recordMerge(facts(), 2, ORG)
    recordMerge(facts({ tableId: 'e-other', tableName: 'Other' }), 3, ORG)
    expect(mergesOf('e-zeta', ORG)).toHaveLength(1)
    expect(mergesOf(undefined, ORG)).toHaveLength(2)
  })

  it('puts the newest first, because that is the one being asked about', () => {
    recordMerge(facts({ source: 'older.csv' }), 1_000, ORG)
    recordMerge(facts({ source: 'newer.csv' }), 2_000, ORG)
    expect(mergesOf('e-zeta', ORG).map((m) => m.source)).toEqual([
      'newer.csv',
      'older.csv',
    ])
  })
})

describe('what it does when it cannot keep everything', () => {
  it('keeps the newest KEEP merges and drops the oldest', () => {
    for (let i = 0; i < KEEP + 3; i += 1) {
      recordMerge(facts({ source: `f${i}.csv` }), 1_000 + i, ORG)
    }
    const rows = mergesOf('e-zeta', ORG)
    expect(rows).toHaveLength(KEEP)
    expect(rows[0]?.source).toBe(`f${KEEP + 2}.csv`)
    expect(rows.at(-1)?.source).toBe('f3.csv')
  })

  it('SAYS HOW MANY CELLS THERE REALLY WERE, so a partial record cannot read as a complete one', () => {
    const many = Array.from({ length: CELLS_KEPT + 41 }, (_, i) => cell(i))
    const m = recordMerge(facts({ changes: many, rowsChanged: many.length }), 5, ORG)
    expect(m?.cells).toHaveLength(CELLS_KEPT)
    expect(m?.cellTotal).toBe(CELLS_KEPT + 41)
  })

  it('does the same with the rows it created', () => {
    const names = Array.from({ length: ADDED_KEPT + 5 }, (_, i) => `New ${i}`)
    const m = recordMerge(facts({ added: names }), 6, ORG)
    expect(m?.added).toHaveLength(ADDED_KEPT)
    expect(m?.addedTotal).toBe(ADDED_KEPT + 5)
  })

  it('is emptied only when asked', () => {
    recordMerge(facts(), 7, ORG)
    clearMerges(ORG)
    expect(mergesOf('e-zeta', ORG)).toHaveLength(0)
  })
})

describe('the file it writes', () => {
  it('is one JSON object per line, and ends with a newline so two logs concatenate', () => {
    const m = recordMerge(facts({ changes: [cell(1), cell(2)], rowsChanged: 2 }), 8, ORG)
    const text = mergeJsonl(m!)
    expect(text.endsWith('\n')).toBe(true)
    const lines = text.trim().split('\n')
    expect(lines).toHaveLength(3)
    for (const l of lines) expect(() => JSON.parse(l) as unknown).not.toThrow()
  })

  it('CARRIES BEFORE AND AFTER on every write, which is the whole finding', () => {
    const m = recordMerge(facts(), 9, ORG)
    const write = mergeJsonl(m!)
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as Record<string, unknown>)
      .find((o) => o.op === 'update')
    expect(write).toMatchObject({
      op: 'update',
      row: 'Zeta 1',
      column: 'Cash',
      before: '68,990',
      after: '71,990',
    })
  })

  it('makes every line stand alone — when, who and which table are on each one', () => {
    const m = recordMerge(facts({ changes: [cell(1)], added: ['New 1'] }), 10, ORG)
    const rows = mergeJsonl(m!)
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as Record<string, unknown>)
    for (const r of rows) {
      expect(r.at).toBe(new Date(10).toISOString())
      expect(r.table).toBe('Zeta Hulls')
      expect(r.source).toBe('zeta-sept.csv')
    }
    expect(rows.map((r) => r.op)).toEqual(['merge', 'update', 'add'])
  })

  it('says in the header line how much of the merge this file holds', () => {
    const many = Array.from({ length: CELLS_KEPT + 7 }, (_, i) => cell(i))
    const m = recordMerge(facts({ changes: many, rowsChanged: 12 }), 11, ORG)
    const head = JSON.parse(mergeJsonl(m!).split('\n')[0] ?? '{}') as Record<string, unknown>
    expect(head).toMatchObject({
      op: 'merge',
      cells: CELLS_KEPT + 7,
      cellsInThisFile: CELLS_KEPT,
      rows: 12,
    })
  })

  it('is named for the register and the moment, so two of them sort', () => {
    const m = recordMerge(facts(), new Date(2026, 8, 11, 14, 12).getTime(), ORG)
    expect(mergeFileName(m!)).toBe('zeta-hulls-20260911-1412.jsonl')
  })
})
