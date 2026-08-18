/* ============================================================
   THE TRIP A DEALER ACTUALLY TAKES: one register out to Excel, a
   few cells changed, and back into a live system.

   Every case here is written from the failure it prevents rather
   than from the function it calls, because the failures are the
   point. The worst thing this application could do is merge a file
   over somebody's price list without saying what it was about to
   do — so the assertions are mostly on the COUNTS and the
   SENTENCES that the confirm prints, and only then on the writes.

   The two contract cases are the last two blocks: a file may not
   bring a discontinued model back to life, and a file may not
   delete a row an old quote was written against. Both are stated
   in @/features/views/sellable and in @/types/model, and both are
   exactly the sort of rule that a bulk path quietly forgets.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { DISCONTINUED_FIELD, DISCONTINUED_FIELD_ID } from '@/types/model'
import type { EntityDef, FieldDef, RowData } from '@/types/model'
import { BOM, fromCsvFile, toCsvFile, csvFileName } from './csv'
import {
  ROW_KEY_HEADER,
  applyTableUpload,
  buildTableCsv,
  describePlan,
  planIsIdle,
  planTableUpload,
  type TableWriter,
} from './tableCsv'

/* ------------------------------------------------------------ */
/* a register, small enough to read and wide enough to be real    */
/* ------------------------------------------------------------ */

const F = (over: Partial<FieldDef> & { id: string; name: string }): FieldDef => ({
  type: 'text',
  ...over,
})

const boats: EntityDef = {
  id: 't_boats',
  name: 'Highfield Inflatables',
  accent: 'blue',
  fields: [
    F({ id: 'f_name', name: 'Model' }),
    F({ id: 'f_price', name: 'Cash', type: 'number' }),
    F({ id: 'f_len', name: 'Length', type: 'number' }),
    F({ id: 'f_hull', name: 'Hull', type: 'select', options: ['PVC', 'Hypalon'] }),
    F({ id: 'f_total', name: 'Drive away', type: 'formula', formula: '[Cash] * 1.1' }),
    F({ id: 'f_photo', name: 'Photos', type: 'image' }),
    F({ id: 'f_src', name: 'Source' }),
    { ...(DISCONTINUED_FIELD as FieldDef) },
  ],
  displayFieldId: 'f_name',
  position: { x: 0, y: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const row = (id: string, values: Record<string, unknown>): RowData => ({
  id,
  entityId: boats.id,
  values: values as RowData['values'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const rows: RowData[] = [
  row('r1', {
    f_name: 'Sport 560',
    f_price: 68990,
    f_len: 5.6,
    f_hull: 'PVC',
    f_photo: [{ id: 'i1', src: 'blob:1' }],
    f_src: 'Boat Module!R829',
  }),
  row('r2', {
    f_name: 'Ocean Master 540, deluxe',
    f_price: 54990,
    f_len: 5.4,
    f_hull: 'Hypalon',
    f_src: 'Boat Module!R830',
  }),
  row('r3', {
    f_name: 'Classic 380',
    f_price: 21990,
    f_len: 3.8,
    f_hull: 'PVC',
    f_src: 'Boat Module!R831',
    [DISCONTINUED_FIELD_ID]: true,
  }),
]

const computedFor = (r: RowData): Record<string, unknown> => ({
  ...r.values,
  f_total: typeof r.values.f_price === 'number' ? r.values.f_price * 1.1 : null,
})

const exportIt = () =>
  buildTableCsv(
    { entity: boats, rows, computedFor: computedFor as never },
    new Date('2026-08-18T04:00:00.000Z'),
  )

const planFor = (text: string) =>
  planTableUpload({ entity: boats, rows, text, fileName: 'Highfield Inflatables.csv' })

/** Edit the exported file the way a person edits it in Excel: find a
 *  line, change one cell, leave everything else alone. */
function editCell(text: string, lineIndex: number, column: string, next: string): string {
  const grid = fromCsvFile(text)
  const at = grid[0].indexOf(column)
  expect(at).toBeGreaterThanOrEqual(0)
  grid[lineIndex][at] = next
  return toCsvFile(grid)
}

/* ------------------------------------------------------------ */

describe('the file itself', () => {
  it('opens with a UTF-8 mark and uses CRLF, so Excel on Windows reads it', () => {
    const out = exportIt()
    expect(out.text.startsWith(BOM)).toBe(true)
    expect(out.text).toContain('\r\n')
    /* every line ending is CRLF, not a mixture */
    expect(out.text.split('\n').length - 1).toBe(out.text.split('\r\n').length - 1)
  })

  it('names itself after the table and the day', () => {
    expect(exportIt().fileName).toBe('Highfield Inflatables 2026-08-18.csv')
  })

  it('never writes a file name Windows would refuse', () => {
    expect(csvFileName('Boats: 5.6m / "big" *', new Date('2026-08-18T00:00:00'))).toBe(
      'Boats 5.6m big 2026-08-18.csv',
    )
  })

  it('quotes a value that carries the delimiter, and reads it back whole', () => {
    const grid = fromCsvFile(exportIt().text)
    const line = grid.find((l) => l[0] === 'r2')
    expect(line?.[1]).toBe('Ocean Master 540, deluxe')
    expect(exportIt().text).toContain('"Ocean Master 540, deluxe"')
  })

  it('carries the key column first, then every column the table has', () => {
    const header = fromCsvFile(exportIt().text)[0]
    expect(header).toEqual([
      ROW_KEY_HEADER,
      'Model',
      'Cash',
      'Length',
      'Hull',
      'Drive away',
      'Photos',
      'Source',
      'Discontinued',
    ])
  })

  it('prints the calculated column and the picture count for a person to read', () => {
    const grid = fromCsvFile(exportIt().text)
    const line = grid.find((l) => l[0] === 'r1')
    expect(line?.[5]).toBe('75889') // 68990 * 1.1
    expect(line?.[6]).toBe('1 image')
  })

  it('carries the provenance cell verbatim', () => {
    const grid = fromCsvFile(exportIt().text)
    expect(grid.find((l) => l[0] === 'r1')?.[7]).toBe('Boat Module!R829')
  })
})

describe('a file that came straight back', () => {
  it('changes nothing, and says so rather than reporting a merge', () => {
    const plan = planFor(exportIt().text)
    expect(plan.ok).toBe(true)
    expect(plan.matched).toBe(3)
    expect(plan.added).toBe(0)
    expect(plan.overwritten).toBe(0)
    expect(plan.changes).toEqual([])
    expect(planIsIdle(plan)).toBe(true)
    expect(describePlan(plan)).toContain('Nothing would change')
  })

  it('leaves no row untouched, because every row had a line', () => {
    expect(planFor(exportIt().text).untouched).toBe(0)
  })
})

describe('what it says before it does it', () => {
  it('counts matched, overwritten and new, and names the cell both ways', () => {
    const edited = editCell(exportIt().text, 1, 'Cash', '71990')
    const plan = planFor(edited)

    expect(plan.matched).toBe(3)
    expect(plan.overwritten).toBe(1)
    expect(plan.added).toBe(0)
    expect(plan.changes).toHaveLength(1)
    expect(plan.changes[0]).toMatchObject({
      rowLabel: 'Sport 560',
      columnName: 'Cash',
      from: '68990',
      to: '71990',
      value: 71990,
    })
    expect(describePlan(plan)).toBe(
      '3 rows matched, 1 of them is overwritten across 1 cell.',
    )
  })

  it('reads a line with no key as a new row', () => {
    const grid = fromCsvFile(exportIt().text)
    grid.push(['', 'Sport 700', '98990', '7', 'Hypalon', '', '', 'typed by hand', ''])
    const plan = planFor(toCsvFile(grid))

    expect(plan.added).toBe(1)
    expect(plan.newRows[0].label).toBe('Sport 700')
    expect(plan.newRows[0].values).toMatchObject({ f_price: 98990, f_hull: 'Hypalon' })
    expect(describePlan(plan)).toContain('1 row is new')
  })

  it('refuses a line whose key belongs to another sheet, and names it', () => {
    const edited = editCell(exportIt().text, 1, ROW_KEY_HEADER, 'r_from_somewhere_else')
    const plan = planFor(edited)

    expect(plan.matched).toBe(2)
    expect(plan.added).toBe(0)
    const refusal = plan.refusals.find((r) => r.id === 'foreign-key')
    expect(refusal?.say).toContain('r_from_somewhere_else')
    expect(refusal?.say).toContain(ROW_KEY_HEADER)
  })

  it('names a heading that is not a column here, and adds nothing', () => {
    const grid = fromCsvFile(exportIt().text)
    grid[0].push('Dealer margin %')
    const plan = planFor(toCsvFile(grid))

    expect(plan.columnsUnknown).toEqual(['Dealer margin %'])
    expect(plan.refusals.find((r) => r.id === 'unknown-column')?.say).toContain(
      'Dealer margin %',
    )
    expect(plan.changes).toEqual([])
  })

  it('names a column the file left out, and keeps what every row has', () => {
    const grid = fromCsvFile(exportIt().text).map((l) => [l[0], l[1], l[2]])
    const plan = planFor(toCsvFile(grid))

    expect(plan.columnsMissing).toContain('Hull')
    expect(plan.refusals.find((r) => r.id === 'missing-column')?.say).toContain('Hull')
    expect(plan.changes).toEqual([])
  })

  it('never writes a calculated or a picture column, and says which', () => {
    let text = editCell(exportIt().text, 1, 'Drive away', '999')
    text = editCell(text, 1, 'Photos', '9 images')
    const plan = planFor(text)

    expect(plan.changes).toEqual([])
    expect(plan.columnsReadOnly).toEqual(['Drive away', 'Photos'])
    expect(plan.refusals.find((r) => r.id === 'read-only')?.say).toContain('Drive away')
  })

  it('reports a cell it could not read instead of writing a guess', () => {
    const plan = planFor(editCell(exportIt().text, 1, 'Cash', 'ask Dave'))
    expect(plan.changes).toEqual([])
    expect(plan.refusals.find((r) => r.id === 'bad-value')?.say).toContain('not a number')
  })

  it('refuses a value outside a list column rather than inventing an option', () => {
    const plan = planFor(editCell(exportIt().text, 1, 'Hull', 'Aluminium'))
    expect(plan.changes).toEqual([])
    expect(plan.refusals.find((r) => r.id === 'bad-value')?.say).toContain('Aluminium')
  })

  it('takes the first line for a row and names the repeats', () => {
    const grid = fromCsvFile(exportIt().text)
    grid.push([...grid[1]])
    const plan = planFor(toCsvFile(grid))
    expect(plan.matched).toBe(3)
    expect(plan.refusals.find((r) => r.id === 'duplicate-line')).toBeDefined()
  })
})

describe('a file a person built themselves, with no key column', () => {
  const byName = (lines: string[][]) =>
    planTableUpload({
      entity: boats,
      rows,
      text: toCsvFile(lines),
      fileName: 'from the supplier.csv',
    })

  it('matches on the table’s own name column', () => {
    const plan = byName([
      ['Model', 'Cash'],
      ['Sport 560', '70000'],
      ['Brand new thing', '1000'],
    ])
    expect(plan.matchedOn).toBe('name')
    expect(plan.matched).toBe(1)
    expect(plan.added).toBe(1)
    expect(plan.changes[0]).toMatchObject({ columnName: 'Cash', to: '70000' })
  })

  it('refuses when it cannot tell which row a name means', () => {
    const twins = [...rows, row('r4', { f_name: 'Sport 560', f_price: 1 })]
    const plan = planTableUpload({
      entity: boats,
      rows: twins,
      text: toCsvFile([
        ['Model', 'Cash'],
        ['Sport 560', '70000'],
      ]),
      fileName: 'twins.csv',
    })
    expect(plan.changes).toEqual([])
    expect(plan.refusals.find((r) => r.id === 'ambiguous-name')?.say).toContain('Sport 560')
  })

  it('is blocked outright when nothing in it can say which row is which', () => {
    const plan = byName([
      ['Cash', 'Length'],
      ['70000', '5.6'],
    ])
    expect(plan.ok).toBe(false)
    expect(describePlan(plan)).toContain('no way to tell which row')
  })

  it('is blocked when it can name the rows but has nothing to write', () => {
    const plan = byName([
      [ROW_KEY_HEADER, 'Widget', 'Sprocket'],
      ['r1', 'a', 'b'],
    ])
    expect(plan.ok).toBe(false)
    expect(describePlan(plan)).toContain('None of the headings')
  })
})

/* ------------------------------------------------------------ */
/* THE DISCONTINUED CONTRACT                                      */
/* ------------------------------------------------------------ */

describe('the discontinued contract', () => {
  it('will not bring a discontinued model back to life, and says why', () => {
    const grid = fromCsvFile(exportIt().text)
    const line = grid.findIndex((l) => l[0] === 'r3')
    const plan = planFor(editCell(exportIt().text, line, 'Discontinued', 'FALSE'))

    expect(plan.changes).toEqual([])
    const refusal = plan.refusals.find((r) => r.id === 'resurrect')
    expect(refusal?.say).toContain('1 row is discontinued')
    expect(refusal?.say).toContain('clearing the cell on the sheet')
  })

  it('will not resurrect it by blanking the cell either', () => {
    const grid = fromCsvFile(exportIt().text)
    const line = grid.findIndex((l) => l[0] === 'r3')
    const plan = planFor(editCell(exportIt().text, line, 'Discontinued', ''))
    expect(plan.changes).toEqual([])
    expect(plan.refusals.some((r) => r.id === 'resurrect')).toBe(true)
  })

  it('still lets a file withdraw a live model, because that only ever holds stock back', () => {
    const plan = planFor(editCell(exportIt().text, 1, 'Discontinued', 'TRUE'))
    expect(plan.changes).toHaveLength(1)
    expect(plan.changes[0]).toMatchObject({ columnName: 'Discontinued', value: true })
    expect(plan.refusals.some((r) => r.id === 'resurrect')).toBe(false)
  })

  it('says out loud that a retired table is not brought back by a file', () => {
    const plan = planTableUpload({
      entity: { ...boats, retired: true },
      rows,
      text: exportIt().text,
      fileName: 'obsolete.csv',
    })
    expect(plan.refusals.find((r) => r.id === 'retired-table')?.say).toContain('retired')
  })
})

/* ------------------------------------------------------------ */
/* A ROW AN OLD QUOTE WAS WRITTEN AGAINST                         */
/* ------------------------------------------------------------ */

describe('a row that is not in the file', () => {
  it('is never deleted, is counted, and the count is said before the merge', () => {
    const grid = fromCsvFile(exportIt().text).filter((l) => l[0] !== 'r2' && l[0] !== 'r3')
    const plan = planFor(toCsvFile(grid))

    expect(plan.matched).toBe(1)
    expect(plan.untouched).toBe(2)
    const refusal = plan.refusals.find((r) => r.id === 'not-in-file')
    expect(refusal?.say).toContain('2 rows on this table have no line')
    expect(refusal?.say).toContain('Nothing is deleted')
  })

  it('survives the apply — a plan has no way to ask for a deletion', () => {
    const grid = fromCsvFile(exportIt().text).filter((l) => l[0] === 'r1')
    const plan = planFor(toCsvFile(grid))

    const wrote: string[] = []
    const writer: TableWriter = {
      updateCell: (_e, rowId, fieldId) => wrote.push(`${rowId}.${fieldId}`),
      addRow: () => null,
    }
    applyTableUpload(plan, writer)
    /* nothing at all was written, and there is no door to delete through */
    expect(wrote).toEqual([])
    expect(Object.keys(plan)).not.toContain('deletions')
  })
})

/* ------------------------------------------------------------ */
/* the apply writes the plan and nothing else                     */
/* ------------------------------------------------------------ */

describe('the apply', () => {
  it('writes exactly the cells the plan named, and adds exactly its new rows', () => {
    let text = editCell(exportIt().text, 1, 'Cash', '71990')
    text = editCell(text, 2, 'Hull', 'PVC')
    const grid = fromCsvFile(text)
    grid.push(['', 'Sport 700', '98990', '7', 'PVC', '', '', '', ''])
    const plan = planFor(toCsvFile(grid))

    const cells: Array<[string, string, unknown]> = []
    const added: Array<Record<string, unknown>> = []
    const writer: TableWriter = {
      updateCell: (_e, rowId, fieldId, value) => cells.push([rowId, fieldId, value]),
      addRow: (_e, values) => {
        added.push(values ?? {})
        return row('new', values ?? {})
      },
    }
    const result = applyTableUpload(plan, writer)

    expect(cells).toEqual([
      ['r1', 'f_price', 71990],
      ['r2', 'f_hull', 'PVC'],
    ])
    expect(added).toHaveLength(1)
    expect(result).toEqual({ cellsWritten: 2, rowsChanged: 2, rowsAdded: 1 })
  })

  it('writes nothing at all when the file was blocked', () => {
    const plan = planTableUpload({
      entity: boats,
      rows,
      text: '',
      fileName: 'empty.csv',
    })
    const writer: TableWriter = {
      updateCell: () => expect.unreachable('a blocked plan wrote a cell'),
      addRow: () => expect.unreachable('a blocked plan added a row'),
    }
    expect(applyTableUpload(plan, writer)).toEqual({
      cellsWritten: 0,
      rowsChanged: 0,
      rowsAdded: 0,
    })
    expect(describePlan(plan)).toBe('That file is empty.')
  })
})

/* ------------------------------------------------------------ */
/* what a real trip through a real spreadsheet found              */
/* ------------------------------------------------------------ */

/* Both blocks below are regressions from ONE measurement: the real
   seed exported, opened in Excel 16, saved by Excel with nothing
   typed into it, and read back. Neither failure is reachable from a
   hand-written fixture — they needed real numbers and a real
   workbook's column names — so they are pinned here with the figures
   that produced them. */

describe('an export that comes back untouched', () => {
  /* `formatNumber` prints a price to four places for a person to read.
     The stored value has fifteen. Comparing the VALUES therefore made
     an untouched file look like an edit on every row that had one:
     measured at 523 of Highfield Inflatables' 588 rows before the
     fix, and every one of those presses would have written the
     ROUNDED figure over the exact one. */
  const exact: EntityDef = {
    ...boats,
    id: 't_exact',
    fields: [F({ id: 'f_name', name: 'Model' }), F({ id: 'f_cost', name: 'Landed Hull Cost', type: 'number' })],
  }
  const exactRows: RowData[] = [
    { ...row('x1', { f_name: 'RU230KAM', f_cost: 1671.4285714285713 }), entityId: exact.id },
    { ...row('x2', { f_name: 'RU250KAM', f_cost: 3602.857142857143 }), entityId: exact.id },
  ]
  const tripIt = (text: string) =>
    planTableUpload({ entity: exact, rows: exactRows, text, fileName: 'exact.csv' })

  it('reports NOTHING when a rounded price is handed straight back', () => {
    const file = buildTableCsv({ entity: exact, rows: exactRows })
    /* the file really does carry the rounded figure — or this proves
       nothing about the trip a person takes */
    expect(file.text).toContain('1671.4286')
    const plan = tripIt(file.text)
    expect(plan.changes).toEqual([])
    expect(plan.overwritten).toBe(0)
    expect(planIsIdle(plan)).toBe(true)
    expect(describePlan(plan)).toContain('Nothing would change')
  })

  it('and does not lose the exact figure by writing the rounded one', () => {
    const plan = tripIt(buildTableCsv({ entity: exact, rows: exactRows }).text)
    const writer: TableWriter = {
      updateCell: () => expect.unreachable('an untouched file wrote a cell'),
      addRow: () => expect.unreachable('an untouched file added a row'),
    }
    expect(applyTableUpload(plan, writer).cellsWritten).toBe(0)
  })

  it('still sees a real edit to the same cell', () => {
    const edited = editCell(
      buildTableCsv({ entity: exact, rows: exactRows }).text,
      1,
      'Landed Hull Cost',
      '1700',
    )
    const plan = tripIt(edited)
    expect(plan.changes).toHaveLength(1)
    expect(plan.changes[0]).toMatchObject({ rowId: 'x1', from: '1671.4286', to: '1700' })
  })

  /* THE SECOND GATE, and why the first is not enough on its own.
     Excel is entitled to give a number back in a different spelling —
     `0.10` returns as `0.1`, and a person who types `68990.00` into a
     price has typed the price. The text differs, so the value has to
     be asked as well, and it says the same number. */
  it('reads a number respelled — 68990.00 is the price that is already there', () => {
    const plan = planTableUpload({
      entity: boats,
      rows,
      text: toCsvFile([
        [ROW_KEY_HEADER, 'Model', 'Cash'],
        ['r1', 'Sport 560', '68990.00'],
      ]),
      fileName: 'respelled.csv',
    })
    expect(plan.changes).toEqual([])
    expect(planIsIdle(plan)).toBe(true)
  })
})

describe('two columns wearing one name', () => {
  /* Rigging Kits really does carry `Trade Price` twice, and Dealer Fit
     Packages carries `Code` and `CTD` twice — four pairs across the
     52 tables of the prepared set, straight out of the workbook. The
     old reader kept one map from name to column, so the SECOND field
     won the name and the FIRST file column's figures were written
     into it: measured as `Trade Price 703 -> 0` on every rigging kit,
     one column's price silently replacing another's. */
  const twins: EntityDef = {
    ...boats,
    id: 't_twins',
    fields: [
      F({ id: 'f_name', name: 'Model' }),
      F({ id: 'f_trade_a', name: 'Trade Price', type: 'number' }),
      F({ id: 'f_trade_b', name: 'Trade Price', type: 'number' }),
      F({ id: 'f_cash', name: 'Cash', type: 'number' }),
    ],
  }
  const twinRows: RowData[] = [
    { ...row('t1', { f_name: 'SUP', f_trade_a: 703, f_trade_b: 0, f_cash: 900 }), entityId: twins.id },
  ]
  const planTwins = (text: string) =>
    planTableUpload({ entity: twins, rows: twinRows, text, fileName: 'twins.csv' })

  it('writes to NEITHER, and says which name is the problem', () => {
    const plan = planTwins(buildTableCsv({ entity: twins, rows: twinRows }).text)
    expect(plan.ok).toBe(true)
    expect(plan.columnsAmbiguous).toEqual(['Trade Price'])
    expect(plan.changes).toEqual([])
    const said = plan.refusals.find((r) => r.id === 'ambiguous-column')?.say ?? ''
    expect(said).toContain('Trade Price')
    expect(said).toContain('cannot say which one')
  })

  it('never reports an ambiguous column as one the file left out', () => {
    const plan = planTwins(buildTableCsv({ entity: twins, rows: twinRows }).text)
    expect(plan.columnsMissing).not.toContain('Trade Price')
  })

  it('leaves the unambiguous columns beside it working', () => {
    const plan = planTwins(
      editCell(buildTableCsv({ entity: twins, rows: twinRows }).text, 1, 'Cash', '950'),
    )
    expect(plan.changes).toHaveLength(1)
    expect(plan.changes[0]).toMatchObject({ fieldId: 'f_cash', from: '900', to: '950' })
  })

  it('refuses a name the FILE spends twice, even when the table has one such column', () => {
    const plan = planTableUpload({
      entity: boats,
      rows,
      text: toCsvFile([
        [ROW_KEY_HEADER, 'Model', 'Cash', 'Cash'],
        ['r1', 'Sport 560', '1', '2'],
      ]),
      fileName: 'twice.csv',
    })
    expect(plan.columnsAmbiguous).toEqual(['Cash'])
    expect(plan.changes.some((c) => c.fieldId === 'f_price')).toBe(false)
  })
})
