/* ============================================================
   THE APPLY LOG, IN A DOCUMENT — the half `evidence.test.ts`
   cannot reach.

   IT IS `.tsx` FOR THE STORAGE, NOT FOR THE JSX. `vitest.config.ts`
   splits the two projects by extension: `.test.ts` runs in node,
   where `globalThis.localStorage` is undefined and the log's whole
   persistence path is skipped by an optional chain. A log that kept
   its records only in memory would pass every assertion next door
   and answer "what changed last Tuesday" with nothing after a
   reload — which is the one thing this feature exists to prevent.
   So the reading-back is asserted here, where there is a real
   `localStorage`, along with the surface that draws it.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CELLS_KEPT, forgetMerges, mergesOf, recordMerge } from './evidence'
import { MergeLog } from './MergeLog'
import type { CellChange } from './tableCsv'

const ORG = 'northside'

const cell = (i: number): CellChange => ({
  rowId: `r${i}`,
  rowLabel: `Zeta ${i}`,
  fieldId: 'f-cash',
  columnName: 'Cash',
  from: '68,990',
  to: '71,990',
  value: 71990,
})

const facts = {
  tableId: 'e-zeta',
  tableName: 'Zeta Hulls',
  source: 'zeta-sept.csv',
  matchedOn: 'key' as const,
  changes: [cell(1)],
  added: [],
  rowsChanged: 1,
}

beforeEach(() => {
  forgetMerges()
  localStorage.clear()
})

describe('a merge survives the tab being closed', () => {
  it('is read back off storage once the module cache is gone', () => {
    recordMerge(facts, 1_700_000_000_000, ORG)
    /* the only thing standing between the two reads is the cache —
       exactly what a reload takes away */
    forgetMerges()
    const back = mergesOf('e-zeta', ORG)
    expect(back).toHaveLength(1)
    expect(back[0]?.cells[0]).toMatchObject({ from: '68,990', to: '71,990' })
  })

  it('is filed under the business, so another org reads none of it', () => {
    recordMerge(facts, 1, ORG)
    forgetMerges()
    expect(mergesOf('e-zeta', 'someone-else')).toHaveLength(0)
  })
})

describe('reading it back', () => {
  it('draws the value each cell held before the file touched it', () => {
    const m = recordMerge(facts, 1_700_000_000_000, ORG)
    render(<MergeLog tableName="Zeta Hulls" merges={[m!]} onClose={() => {}} />)
    expect(screen.getByText('Zeta 1')).toBeInTheDocument()
    expect(screen.getByText('68,990')).toBeInTheDocument()
    expect(screen.getByText('71,990')).toBeInTheDocument()
    expect(screen.getByText('zeta-sept.csv')).toBeInTheDocument()
  })

  it('SAYS SO WHERE IT IS SHORT, rather than drawing 300 of 341 as if it were all of them', () => {
    const many = Array.from({ length: CELLS_KEPT + 41 }, (_, i) => cell(i))
    const m = recordMerge(
      { ...facts, changes: many, rowsChanged: many.length },
      2,
      ORG,
    )
    render(<MergeLog tableName="Zeta Hulls" merges={[m!]} onClose={() => {}} />)
    expect(
      screen.getByText(/kept the first 300 of 341 changed cells/),
    ).toBeInTheDocument()
  })

  it('names the register in its own question, and offers the file', () => {
    const m = recordMerge(facts, 3, ORG)
    render(<MergeLog tableName="Zeta Hulls" merges={[m!]} onClose={() => {}} />)
    expect(
      screen.getByText('What has been merged into Zeta Hulls'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save this log' })).toBeInTheDocument()
  })

  it('says a name match was a name match, because it is worth less than a key match', () => {
    const m = recordMerge({ ...facts, matchedOn: 'name' }, 4, ORG)
    render(<MergeLog tableName="Zeta Hulls" merges={[m!]} onClose={() => {}} />)
    expect(screen.getByText(/matched on their names/)).toBeInTheDocument()
  })
})
