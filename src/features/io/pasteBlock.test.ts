/* ============================================================
   THE GESTURE A DEALER ACTUALLY MAKES: select the block in the
   spreadsheet, Ctrl+C, Ctrl+V.

   Every case here is written from the failure it prevents, because
   the failures are the whole reason UX_PASS §3 exists. The one it
   was written about is measured and named in that document: a
   pasted header row read as data produced **a boat named
   "Variant"**, and `Series` and `Model` — the two columns the
   register groups by — landed nowhere at all.

   So the assertions are on the SENTENCES and the COUNTS a person
   reads before they press, and only then on the writes. A merge
   over a dealer's price file that did not say what it was about to
   do is the worst thing this application could do, and a paste is
   the shortest path to it.

   THREE CONTRACTS ARE CHECKED HERE BECAUSE THEY ARE INHERITED
   RATHER THAN RE-WRITTEN — a paste turns the same engine the file
   door turns (`tableCsv.mergeLines`), and the point of that is
   that these hold on both doors at once:

     · a row on the table with nothing pasted against it is LEFT
       ALONE and counted, never deleted
     · a calculated or a picture column is never written
     · a cell that will land blank is named before the press
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { DISCONTINUED_FIELD } from '@/types/model'
import type { EntityDef, FieldDef, RowData } from '@/types/model'
import {
  applyPaste,
  describePaste,
  fieldOffers,
  looksLikeHeader,
  mappingRefusals,
  planPaste,
  proposeMapping,
  readColumns,
  readPastedBlock,
  whyNotNew,
  type MapTo,
  type PasteWriter,
} from './pasteBlock'

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
    F({ id: 'f_code', name: 'Model code' }),
    F({ id: 'f_price', name: 'Cash price', type: 'number' }),
    F({ id: 'f_len', name: 'Length', type: 'number' }),
    F({ id: 'f_total', name: 'Drive away', type: 'formula', formula: '[Cash price] * 1.1' }),
    F({ id: 'f_photo', name: 'Photos', type: 'image' }),
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
  row('r1', { f_name: 'Sport 560', f_code: 'SP560', f_price: 68990, f_len: 5.6 }),
  row('r2', { f_name: 'Ocean Master 540', f_code: 'OM540', f_price: 54990, f_len: 5.4 }),
]

/** A block as the clipboard actually carries it: tabs between the
 *  cells, newlines between the rows, no trailing terminator. */
const tsv = (cells: string[][]): string => cells.map((r) => r.join('\t')).join('\n')

/** The whole gesture in one call: read the block, take the proposal
 *  as it stands, and plan it. What a person sees before they press,
 *  having changed nothing. */
function pasteAsProposed(text: string, over?: Partial<{ headerRow: boolean; entity: EntityDef }>) {
  const entity = over?.entity ?? boats
  const block = readPastedBlock(text)
  const headerRow = over?.headerRow ?? block.headerLikely
  const cols = readColumns(block, headerRow)
  const choices = proposeMapping(cols, fieldOffers(entity), headerRow).map((p) => p.choice)
  return { block, cols, choices, plan: planPaste({ entity, rows, block, headerRow, cols, choices }) }
}

/* ------------------------------------------------------------ */
/* 1 · WHAT ARRIVED                                              */
/* ------------------------------------------------------------ */

describe('reading the block', () => {
  it('reads the tab-separated dialect a spreadsheet puts on the clipboard', () => {
    const block = readPastedBlock(tsv([['Model', 'Cash price'], ['Sport 560', '68990']]))
    expect(block.ok).toBe(true)
    expect(block.delimiter).toBe('tab')
    expect(block.width).toBe(2)
    expect(block.grid).toHaveLength(2)
  })

  it('reads commas when there is not a tab in sight, rather than one wide column', () => {
    const block = readPastedBlock('Model,Cash price\nSport 560,68990')
    expect(block.delimiter).toBe('comma')
    expect(block.width).toBe(2)
  })

  it('keeps a comma inside a value when the block is tab-separated', () => {
    const block = readPastedBlock(tsv([['Model'], ['Ocean Master 540, deluxe']]))
    expect(block.grid[1][0]).toBe('Ocean Master 540, deluxe')
  })

  it('drops the empty rows a selection always carries, and counts them', () => {
    const block = readPastedBlock(`${tsv([['Model'], ['Sport 560']])}\n\n\n`)
    expect(block.grid).toHaveLength(2)
    expect(block.blankRowsDropped).toBe(2)
  })

  it('pads a short row rather than losing it, and says which one', () => {
    const block = readPastedBlock('Model\tCash price\nSport 560')
    expect(block.grid[1]).toEqual(['Sport 560', ''])
    expect(block.shortRows).toEqual([2])
  })

  it('refuses a row with MORE cells than the first, by row number', () => {
    const block = readPastedBlock('Model,Cash\nOcean Master 540, deluxe,54990')
    expect(block.ok).toBe(false)
    expect(block.refusal?.id).toBe('ragged')
    expect(block.refusal?.say).toContain('row 2')
  })

  it('refuses an empty clipboard and says what to do about it', () => {
    expect(readPastedBlock('   ').refusal?.say).toContain('copy them')
  })

  it('refuses one cell, because one cell is not a block', () => {
    expect(readPastedBlock('Sport 560').refusal?.id).toBe('one-cell')
  })
})

/* ------------------------------------------------------------ */
/* 2 · IS ROW ONE A HEADER                                       */
/* ------------------------------------------------------------ */

describe('the header question', () => {
  it('reads a row of words as column names', () => {
    expect(looksLikeHeader(['Model', 'Cash price'])).toBe(true)
  })

  it('reads a row of nothing but numbers and dates as DATA, which is the bug', () => {
    /* the failure §3 measured: a header row read as data produced a
       boat named "Variant". This is the same reading, inverted — a
       DATA row read as a header would lose the row entirely. */
    expect(looksLikeHeader(['68990', '5.6', '2026-01-01'])).toBe(false)
  })

  it('changes what the columns are called, and what their values are', () => {
    const text = tsv([['Model', 'Cash price'], ['Sport 560', '68990']])
    const block = readPastedBlock(text)
    expect(readColumns(block, true)[0].title).toBe('Model')
    expect(readColumns(block, true)[0].stats.values).toEqual(['Sport 560'])
    expect(readColumns(block, false)[0].title).toBe('Column 1')
    expect(readColumns(block, false)[0].stats.values).toEqual(['Model', 'Sport 560'])
  })
})

/* ------------------------------------------------------------ */
/* 3 · WHERE EACH COLUMN GOES                                    */
/* ------------------------------------------------------------ */

describe('the mapping', () => {
  it('matches a column this table already has, through case and punctuation', () => {
    const { cols, choices } = pasteAsProposed(
      tsv([['Model', 'Model Code', 'CASH PRICE'], ['Sport 560', 'SP560', '68990']]),
    )
    expect(cols.map((c) => c.title)).toEqual(['Model', 'Model Code', 'CASH PRICE'])
    expect(choices).toEqual([
      { to: 'field', fieldId: 'f_name' },
      { to: 'field', fieldId: 'f_code' },
      { to: 'field', fieldId: 'f_price' },
    ])
  })

  it('offers a NEW COLUMN when nothing matches, with the type inferred and named', () => {
    const { choices } = pasteAsProposed(
      tsv([
        ['Model', 'Tube Dia. cm'],
        ['Sport 560', '42'],
        ['Ocean Master 540', '44'],
      ]),
    )
    expect(choices[1]).toEqual({ to: 'new', name: 'Tube Dia. cm', type: 'number' })
  })

  it('will not make a new column without a header row, and says what it would take', () => {
    const { cols, choices } = pasteAsProposed(
      tsv([['Sport 560', '42'], ['Ocean Master 540', '44']]),
      { headerRow: false },
    )
    expect(choices[1]).toEqual({ to: 'skip' })
    expect(whyNotNew(cols[1], false)).toContain('answer Yes')
  })

  it('will not invent a name for a column row one does not name', () => {
    const { cols } = pasteAsProposed(tsv([['Model', ''], ['Sport 560', '42']]))
    expect(whyNotNew(cols[1], true)).toContain('will not invent a name')
  })

  it('skips a calculated column the block names, and says why it cannot be filled', () => {
    const { choices } = pasteAsProposed(
      tsv([['Model', 'Drive away'], ['Sport 560', '75889']]),
    )
    expect(choices[1]).toEqual({ to: 'skip' })
    const held = fieldOffers(boats).find((o) => o.field.id === 'f_total')
    expect(held?.refusal).toContain('calculated')
  })

  it('does not offer a picture column to a block of words', () => {
    const held = fieldOffers(boats).find((o) => o.field.id === 'f_photo')
    expect(held?.refusal).toContain('pictures')
  })

  it('never offers the identity column — a key typed by hand is somebody else’s', () => {
    expect(fieldOffers(boats).some((o) => o.field.id === '__uid')).toBe(false)
  })

  it('refuses two columns aimed at one, by the name of the one that got there first', () => {
    const { cols } = pasteAsProposed(tsv([['Model', 'Cash price'], ['Sport 560', '1']]))
    const choices: MapTo[] = [
      { to: 'field', fieldId: 'f_price' },
      { to: 'field', fieldId: 'f_price' },
    ]
    const said = mappingRefusals(cols, choices, boats).get(1)
    expect(said).toContain('Model')
    expect(said).toContain('Two columns cannot fill one')
  })

  it('refuses a new column wearing a name this table already uses', () => {
    const { cols } = pasteAsProposed(tsv([['Model', 'Spare'], ['Sport 560', 'x']]))
    const choices: MapTo[] = [
      { to: 'field', fieldId: 'f_name' },
      { to: 'new', name: 'Cash price', type: 'text' },
    ]
    expect(mappingRefusals(cols, choices, boats).get(1)).toContain('already has a column called')
  })

  it('lets a person pick between two columns wearing one name — the file door cannot', () => {
    /* `Rigging Kits` carries `Trade Price` twice, and the file door
       has to refuse both because a heading cannot say which one it
       means. The mapping carries field IDS, so it can. */
    const twins: EntityDef = {
      ...boats,
      fields: [
        F({ id: 'f_name', name: 'Model' }),
        F({ id: 'f_t1', name: 'Trade Price', type: 'number' }),
        F({ id: 'f_t2', name: 'Trade Price', type: 'number' }),
      ],
    }
    const offers = fieldOffers(twins)
    expect(offers.map((o) => o.label)).toEqual([
      'Model',
      'Trade Price (column 2)',
      'Trade Price (column 3)',
    ])

    const text = tsv([['Model', 'Trade Price'], ['Sport 560', '703']])
    const block = readPastedBlock(text)
    const cols = readColumns(block, true)
    const proposed = proposeMapping(cols, offers, true)
    /* proposed as a question, not as a guess */
    expect(proposed[1].choice).toEqual({ to: 'skip' })
    expect(proposed[1].refusal).toContain('Pick the one you mean')

    /* and the person's answer goes through */
    const plan = planPaste({
      entity: twins,
      rows,
      block,
      headerRow: true,
      cols,
      choices: [{ to: 'field', fieldId: 'f_name' }, { to: 'field', fieldId: 'f_t2' }],
    })
    expect(plan.ok).toBe(true)
    expect(plan.plan?.changes.map((c) => c.fieldId)).toEqual(['f_t2'])
  })
})

/* ------------------------------------------------------------ */
/* 4 · WHAT THE COMMIT WOULD DO                                  */
/* ------------------------------------------------------------ */

describe('the plan', () => {
  it('finds the rows that are already here and says which cells change', () => {
    const { plan } = pasteAsProposed(
      tsv([['Model', 'Cash price'], ['Sport 560', '71990'], ['Ocean Master 540', '54990']]),
    )
    expect(plan.ok).toBe(true)
    expect(plan.plan?.matched).toBe(2)
    expect(plan.plan?.added).toBe(0)
    expect(plan.plan?.changes).toHaveLength(1)
    expect(plan.plan?.changes[0]).toMatchObject({
      rowLabel: 'Sport 560',
      columnName: 'Cash price',
      from: '68990',
      to: '71990',
    })
  })

  it('adds a row the table has never seen, under the name it will wear', () => {
    const { plan } = pasteAsProposed(
      tsv([['Model', 'Cash price'], ['Sport 700', '92990']]),
    )
    expect(plan.plan?.added).toBe(1)
    expect(plan.plan?.newRows[0].label).toBe('Sport 700')
  })

  it('NEVER DELETES a row the block has nothing to say about, and counts it', () => {
    const { plan } = pasteAsProposed(tsv([['Model', 'Cash price'], ['Sport 560', '71990']]))
    expect(plan.plan?.untouched).toBe(1)
    const said = plan.plan?.refusals.find((r) => r.id === 'not-in-file')?.say
    expect(said).toContain('Nothing is deleted')
    /* and it says it in the paste's own words — a person who never
       opened a file must not be told about one */
    expect(said).toContain('the pasted block')
    expect(said).not.toContain('that file')
  })

  it('says out loud which columns are skipped — silence is what destroys trust', () => {
    const { plan } = pasteAsProposed(
      tsv([['Model', 'Cash price', 'Drive away'], ['Sport 560', '71990', '79189']]),
    )
    const said = plan.plan?.refusals.find((r) => r.id === 'skipped-column')?.say
    expect(said).toContain('Drive away')
    expect(said).toContain('skipped')
  })

  it('is blocked when nothing names the rows, and says exactly what would fix it', () => {
    const { plan } = pasteAsProposed(
      tsv([['Cash price', 'Length'], ['71990', '5.6']]),
    )
    expect(plan.ok).toBe(false)
    expect(plan.blocked).toContain('what a row on this table is known by')
    expect(plan.blocked).toContain('Send one of the columns above to Model')
  })

  it('is blocked when every column is skipped', () => {
    const { block, cols } = pasteAsProposed(tsv([['Model'], ['Sport 560']]))
    const plan = planPaste({
      entity: boats,
      rows,
      block,
      headerRow: true,
      cols,
      choices: [{ to: 'skip' }],
    })
    expect(plan.ok).toBe(false)
    expect(plan.blocked).toContain('Send at least one column')
  })

  it('names the columns it is about to create, because structure is never a side effect', () => {
    const { plan } = pasteAsProposed(
      tsv([
        ['Model', 'Tube Dia. cm'],
        ['Sport 560', '42'],
        ['Ocean Master 540', '44'],
      ]),
    )
    expect(plan.creating.map((c) => c.name)).toEqual(['Tube Dia. cm'])
    expect(plan.creating[0].type).toBe('number')
    expect(plan.creating[0].reading.why).toContain('Every one of 2 values is a number')
    expect(describePaste(plan)).toContain('Adds 1 column — Tube Dia. cm')
  })
})

/* ------------------------------------------------------------ */
/* 5 · THE PREVIEW — §3's whole point                            */
/* ------------------------------------------------------------ */

describe('the preview', () => {
  it('resolves the row label, so a boat named Variant is visible BEFORE it exists', () => {
    /* THE EXACT FAILURE UX_PASS §3 RECORDED, reproduced: a header
       row answered as data. The mapping is made by hand, because
       without a header row there are no names to propose from — and
       the very first thing the preview prints is the boat this app
       is about to create, called `Model`. Before it exists. */
    const text = tsv([['Model', 'Cash price'], ['Sport 700', '92990']])
    const block = readPastedBlock(text)
    const cols = readColumns(block, false)
    const plan = planPaste({
      entity: boats,
      rows,
      block,
      headerRow: false,
      cols,
      choices: [{ to: 'field', fieldId: 'f_name' }, { to: 'field', fieldId: 'f_price' }],
    })
    expect(plan.preview[0].label).toBe('Model')
    expect(plan.preview[0].fate).toBe('new')
  })

  it('will not propose anything at all without a header row — there is nothing to match on', () => {
    const { plan } = pasteAsProposed(
      tsv([['Model', 'Cash price'], ['Sport 700', '92990']]),
      { headerRow: false },
    )
    expect(plan.ok).toBe(false)
    expect(plan.blocked).toContain('Send at least one column')
  })

  it('says which pasted rows update a row that is here and which are new', () => {
    const { plan } = pasteAsProposed(
      tsv([['Model', 'Cash price'], ['Sport 560', '71990'], ['Sport 700', '92990']]),
    )
    expect(plan.preview.map((p) => [p.label, p.fate])).toEqual([
      ['Sport 560', 'update'],
      ['Sport 700', 'new'],
    ])
  })

  it('marks the cell a chosen type cannot carry, before the press rather than after', () => {
    const { plan } = pasteAsProposed(
      tsv([['Model', 'Cash price'], ['Sport 560', 'POA']]),
    )
    const cell = plan.preview[0].cells.find((c) => c.column === 'Cash price')
    expect(cell?.read).toBe(false)
    expect(cell?.text).toBe('')
  })

  it('draws only the first three rows, however long the block is', () => {
    const long = [['Model', 'Cash price'], ...Array.from({ length: 40 }, (_, i) => [`Boat ${i}`, '1'])]
    const { plan } = pasteAsProposed(tsv(long))
    expect(plan.preview).toHaveLength(3)
    expect(plan.plan?.fileRows).toBe(40)
  })
})

/* ------------------------------------------------------------ */
/* 6 · THE COMMIT — one act                                      */
/* ------------------------------------------------------------ */

/** A store, small enough to read: it records what it was asked to
 *  do and hands back the ids a real one would. */
function recorder() {
  const cells: Array<[string, string, string]> = []
  const added: Array<Record<string, unknown>> = []
  const fields: Array<{ name: string; type: string }> = []
  let n = 0
  const write: PasteWriter = {
    updateCell: (_e, rowId, fieldId, value) => {
      cells.push([rowId, fieldId, String(value)])
    },
    addRow: (entityId, values) => {
      added.push(values ?? {})
      n += 1
      return {
        id: `new${n}`,
        entityId,
        values: (values ?? {}) as RowData['values'],
        createdAt: '',
        updatedAt: '',
      }
    },
    addField: (_e, partial) => {
      fields.push({ name: partial.name ?? '', type: String(partial.type) })
      return { id: `real_${fields.length}`, name: partial.name ?? '', type: partial.type ?? 'text' }
    },
  }
  return { write, cells, added, fields }
}

describe('the commit', () => {
  it('creates the column FIRST and writes into the id the store gave back', () => {
    const { plan } = pasteAsProposed(
      tsv([
        ['Model', 'Tube Dia. cm'],
        ['Sport 560', '42'],
        ['Ocean Master 540', '44'],
      ]),
    )
    const r = recorder()
    const result = applyPaste(plan, boats.id, r.write)

    expect(r.fields).toEqual([{ name: 'Tube Dia. cm', type: 'number' }])
    expect(result.columnsAdded).toBe(1)
    /* THE PROVISIONAL ID NEVER REACHES THE STORE */
    expect(r.cells.every(([, fieldId]) => !fieldId.startsWith('__paste_new_'))).toBe(true)
    expect(r.cells).toEqual([
      ['r1', 'real_1', '42'],
      ['r2', 'real_1', '44'],
    ])
  })

  it('writes nothing into a column the store would not make, and says which', () => {
    const { plan } = pasteAsProposed(
      tsv([
        ['Model', 'Tube Dia. cm'],
        ['Sport 560', '42'],
        ['Ocean Master 540', '44'],
      ]),
    )
    const r = recorder()
    const result = applyPaste(plan, boats.id, { ...r.write, addField: () => null })
    expect(result.columnsRefused).toEqual(['Tube Dia. cm'])
    expect(r.cells).toEqual([])
  })

  it('carries a new row’s values through the same remap', () => {
    const { plan } = pasteAsProposed(
      tsv([
        ['Model', 'Tube Dia. cm'],
        ['Sport 700', '48'],
        ['Sport 800', '52'],
      ]),
    )
    const r = recorder()
    applyPaste(plan, boats.id, r.write)
    expect(r.added).toHaveLength(2)
    expect(Object.keys(r.added[0])).toEqual(['f_name', 'real_1'])
  })

  it('writes nothing at all when the plan was blocked', () => {
    const { plan } = pasteAsProposed(tsv([['Cash price'], ['71990']]))
    expect(plan.ok).toBe(false)
    const r = recorder()
    expect(applyPaste(plan, boats.id, r.write)).toMatchObject({
      cellsWritten: 0,
      rowsAdded: 0,
      columnsAdded: 0,
    })
    expect(r.fields).toEqual([])
  })
})
