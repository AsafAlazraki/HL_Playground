/* ============================================================
   Reading a schema off a file — tested with the files a dealer
   actually has, not the file a test would like to be handed.

   Every fixture here is awkward on purpose: quoted commas, embedded
   newlines, a byte-order mark, blank trailing rows, one odd cell in a
   thousand, a column that is 95% empty, a part number with a leading
   zero. The tidy case is one test; the rest are the reason this file
   exists.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { BOM } from './csv'
import {
  NUMBER_FLOOR,
  SELECT_MAX_OPTIONS,
  csvRowValues,
  describeBuild,
  describeColumn,
  identifierIn,
  inferColumnType,
  listOptionsFor,
  measureColumn,
  proposeNameColumn,
  readCsvSchema,
  tableNameFromFile,
  type ColumnChoice,
} from './csvSchema'

/** A file body from rows of cells, comma-joined, CRLF, no guarding —
 *  i.e. what a supplier's export looks like, not what this app writes. */
const file = (rows: string[][]): string => rows.map((r) => r.join(',')).join('\r\n')

const col = (plan: ReturnType<typeof readCsvSchema>, name: string) => {
  const c = plan.columns.find((x) => x.header === name)
  if (!c) throw new Error(`no column called ${name} in [${plan.columns.map((x) => x.header)}]`)
  return c
}

/* ------------------------------------------------------------ */
/* the ordinary case                                             */
/* ------------------------------------------------------------ */

describe('a supplier list read straight in', () => {
  const text = file([
    ['Part No', 'Description', 'Brand', 'Cost', 'In stock', 'Listed'],
    ['YM-1001', 'Impeller kit', 'Yamaha', '48.50', 'yes', '2024-03-01'],
    ['YM-1002', 'Water pump', 'Yamaha', '129', 'no', '2024-03-01'],
    ['SZ-2001', 'Anode', 'Suzuki', '18.95', 'yes', '2023-11-14'],
  ])

  it('reads every column and every row', () => {
    const plan = readCsvSchema(text, 'Suppliers.csv')
    expect(plan.ok).toBe(true)
    expect(plan.refusals).toEqual([])
    expect(plan.columns.map((c) => c.header)).toEqual([
      'Part No',
      'Description',
      'Brand',
      'Cost',
      'In stock',
      'Listed',
    ])
    expect(plan.rows).toHaveLength(3)
  })

  it('picks a type per column, and says which', () => {
    const plan = readCsvSchema(text, 'Suppliers.csv')
    expect(col(plan, 'Part No').type).toBe('text')
    expect(col(plan, 'Cost').type).toBe('number')
    expect(col(plan, 'In stock').type).toBe('boolean')
    expect(col(plan, 'Listed').type).toBe('date')
  })

  it('proposes the leftmost all-different text column as the name', () => {
    const plan = readCsvSchema(text, 'Suppliers.csv')
    expect(plan.nameColumn).toBe(0)
  })

  it('lands the values as the types they were read as', () => {
    const plan = readCsvSchema(text, 'Suppliers.csv')
    const choices: ColumnChoice[] = plan.columns.map((c) => ({
      index: c.index,
      name: c.header,
      type: c.type,
      options: c.options,
    }))
    const values = csvRowValues(plan.rows, choices)
    expect(values[0]).toEqual(['YM-1001', 'Impeller kit', 'Yamaha', 48.5, true, '2024-03-01'])
    expect(values[1][4]).toBe(false)
  })
})

/* ------------------------------------------------------------ */
/* awkward files                                                 */
/* ------------------------------------------------------------ */

describe('the awkward shapes a real export has', () => {
  it('reads a quoted comma as one value, not two columns', () => {
    const text = 'Name,Note\r\n"Sport 560","Grey, with blue trim"\r\n'
    const plan = readCsvSchema(text, 'x.csv')
    expect(plan.ok).toBe(true)
    expect(plan.columns).toHaveLength(2)
    expect(plan.rows[0]).toEqual(['Sport 560', 'Grey, with blue trim'])
  })

  it('reads an embedded newline as one value, not two rows', () => {
    const text = 'Name,Note\r\nAnode,"Fits 40hp\nand 60hp"\r\n'
    const plan = readCsvSchema(text, 'x.csv')
    expect(plan.ok).toBe(true)
    expect(plan.rows).toHaveLength(1)
    expect(plan.rows[0][1]).toBe('Fits 40hp\nand 60hp')
  })

  it('takes the byte-order mark off the first header rather than into it', () => {
    const plan = readCsvSchema(`${BOM}Name,Cost\r\nAnode,18\r\n`, 'x.csv')
    expect(plan.ok).toBe(true)
    expect(plan.columns[0].header).toBe('Name')
  })

  it('drops blank trailing rows and counts them', () => {
    const text = 'Name,Cost\r\nAnode,18\r\nImpeller,42\r\n,\r\n,\r\n'
    const plan = readCsvSchema(text, 'x.csv')
    expect(plan.ok).toBe(true)
    expect(plan.rows).toHaveLength(2)
    expect(plan.blankRowsDropped).toBe(2)
  })

  it('pads a row that stops short, and names the row it padded', () => {
    const text = 'Name,Brand,Cost\r\nAnode,Yamaha,18\r\nImpeller,Yamaha\r\n'
    const plan = readCsvSchema(text, 'x.csv')
    expect(plan.ok).toBe(true)
    expect(plan.rows[1]).toEqual(['Impeller', 'Yamaha', ''])
    expect(plan.shortRows).toEqual([3])
  })
})

/* ------------------------------------------------------------ */
/* one odd cell in a thousand                                    */
/* ------------------------------------------------------------ */

describe('one odd cell does not turn a price column into prose', () => {
  /** `n` priced rows, with `odd` values salted into the Sell column. */
  const priceFile = (n: number, odd: string[]): string => {
    const rows: string[][] = [['Part', 'Sell']]
    for (let i = 0; i < n; i += 1) {
      const word = odd[i]
      rows.push([`P-${i}`, word ?? String(100 + i)])
    }
    return file(rows)
  }

  it('tolerates three words in 2,913 prices and keeps the column numeric', () => {
    const odd: string[] = []
    odd[10] = 'Std'
    odd[900] = 'Std'
    odd[2001] = 'POA'
    const plan = readCsvSchema(priceFile(2913, odd), 'Parts.csv')
    const sell = col(plan, 'Sell')
    expect(sell.type).toBe('number')

    const read = describeColumn(sell, 'number')
    expect(read.emptied).toBe(3)
    expect(read.exceptions).toEqual([
      { value: 'Std', count: 2 },
      { value: 'POA', count: 1 },
    ])
    expect(read.why).toContain('2,910 of 2,913 are numbers')
  })

  it('refuses to tolerate anything below the floor', () => {
    const odd: string[] = []
    odd[3] = 'POA'
    const plan = readCsvSchema(priceFile(NUMBER_FLOOR - 1, odd), 'Parts.csv')
    const sell = col(plan, 'Sell')
    expect(sell.type).toBe('text')
    expect(describeColumn(sell, 'text').why).toContain(`needs ${NUMBER_FLOOR.toLocaleString()}`)
  })

  it('refuses to tolerate more than one in a hundred, however long the column', () => {
    const odd: string[] = []
    for (let i = 0; i < 40; i += 1) odd[i * 10] = 'POA'
    const plan = readCsvSchema(priceFile(2000, odd), 'Parts.csv')
    expect(col(plan, 'Sell').type).toBe('text')
  })

  it('names what a tolerated cell costs, by value, before anything is made', () => {
    const odd: string[] = []
    odd[7] = 'POA'
    const plan = readCsvSchema(priceFile(2913, odd), 'Parts.csv')
    const values = csvRowValues(plan.rows, [
      { index: 0, name: 'Part', type: 'text' },
      { index: 1, name: 'Sell', type: 'number' },
    ])
    expect(values[7][1]).toBeNull()
    expect(values[6][1]).toBe(106)
  })
})

/* ------------------------------------------------------------ */
/* a column that is mostly empty                                 */
/* ------------------------------------------------------------ */

describe('a column that is 95% empty', () => {
  const text = (() => {
    const rows: string[][] = [['Part', 'Freight']]
    for (let i = 0; i < 400; i += 1) rows.push([`P-${i}`, i % 20 === 0 ? String(i + 5) : ''])
    return file(rows)
  })()

  it('is judged on the cells that have a value', () => {
    const plan = readCsvSchema(text, 'Parts.csv')
    const freight = col(plan, 'Freight')
    expect(freight.type).toBe('number')
    expect(freight.blank).toBe(380)
    expect(freight.values).toHaveLength(20)
  })

  it('says the reading was taken over twenty cells, not four hundred', () => {
    const plan = readCsvSchema(text, 'Parts.csv')
    const read = describeColumn(col(plan, 'Freight'), 'number')
    expect(read.why).toContain('20 cells have a value, out of 400')
  })

  it('says so plainly when the column has nothing in it at all', () => {
    const plan = readCsvSchema('Name,Spare\r\nAnode,\r\nImpeller,\r\n', 'x.csv')
    const spare = col(plan, 'Spare')
    expect(spare.type).toBe('text')
    expect(describeColumn(spare, 'text').why).toBe('Every cell in this column is empty.')
  })
})

/* ------------------------------------------------------------ */
/* lists                                                         */
/* ------------------------------------------------------------ */

describe('a list is a real inference', () => {
  const withValues = (values: string[]): string =>
    file([['Material'], ...values.map((v) => [v])])

  it('calls few values over many rows a list', () => {
    const values = Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? 'PVC' : 'HYP'))
    const plan = readCsvSchema(withValues(values), 'x.csv')
    const material = col(plan, 'Material')
    expect(material.type).toBe('select')
    expect(material.options).toEqual(['PVC', 'HYP'])
    expect(describeColumn(material, 'select', material.options).why).toContain(
      'few enough to be a list',
    )
  })

  it('will not call twelve rows a list, however few the values', () => {
    const values = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 'PVC' : 'HYP'))
    expect(col(readCsvSchema(withValues(values), 'x.csv'), 'Material').type).toBe('text')
  })

  it('will not call a column of one-offs a list', () => {
    const values = Array.from({ length: 200 }, (_, i) => `Colour ${i}`)
    expect(col(readCsvSchema(withValues(values), 'x.csv'), 'Material').type).toBe('text')
  })

  it('stops at the stated ceiling of different values', () => {
    const many = Array.from(
      { length: 600 },
      (_, i) => `Opt ${i % (SELECT_MAX_OPTIONS + 1)}`,
    )
    expect(col(readCsvSchema(withValues(many), 'x.csv'), 'Material').type).toBe('text')

    const just = Array.from({ length: 600 }, (_, i) => `Opt ${i % SELECT_MAX_OPTIONS}`)
    expect(col(readCsvSchema(withValues(just), 'x.csv'), 'Material').type).toBe('select')
  })

  it('refuses an override to a list when there is no set of options', () => {
    const values = Array.from({ length: 900 }, (_, i) => `Model ${i}`)
    const plan = readCsvSchema(withValues(values), 'x.csv')
    const got = listOptionsFor(col(plan, 'Material'))
    expect('refusal' in got && got.refusal).toContain('too many to be a list')
  })

  it('refuses an override to a list when every value is different', () => {
    const values = Array.from({ length: 120 }, (_, i) => `Model ${i}`)
    const plan = readCsvSchema(withValues(values), 'x.csv')
    const got = listOptionsFor(col(plan, 'Material'))
    expect('refusal' in got && got.refusal).toContain('would just be the column again')
  })

  it('allows an override to a list the inference would not have proposed', () => {
    /* 40 options is past the ceiling the inference will PROPOSE, but
       the person may know something the counts do not. */
    const values = Array.from({ length: 400 }, (_, i) => `Opt ${i % 40}`)
    const plan = readCsvSchema(withValues(values), 'x.csv')
    const material = col(plan, 'Material')
    expect(material.type).toBe('text')
    const got = listOptionsFor(material)
    expect('options' in got && got.options).toHaveLength(40)
  })
})

/* ------------------------------------------------------------ */
/* identifiers                                                   */
/* ------------------------------------------------------------ */

describe('an identifier is not a number', () => {
  it('keeps a part number with a leading zero as text', () => {
    const rows: string[][] = [['Code']]
    for (let i = 0; i < 300; i += 1) rows.push([i === 4 ? '007' : String(1000 + i)])
    const plan = readCsvSchema(file(rows), 'x.csv')
    const code = col(plan, 'Code')
    expect(code.type).toBe('text')
    expect(identifierIn(code)).toEqual({ value: '007', reason: 'leading-zero' })
    expect(describeColumn(code, 'text').why).toContain('007 would lose its leading zero')
  })

  it('keeps a sixteen-digit barcode as text', () => {
    const plan = readCsvSchema('Barcode\r\n9312345678901234\r\n1234\r\n', 'x.csv')
    const code = col(plan, 'Barcode')
    expect(code.type).toBe('text')
    expect(describeColumn(code, 'text').why).toContain('more digits than a number holds exactly')
  })

  it('leaves an ordinary decimal alone', () => {
    const stats = measureColumn('Cost', ['0.5', '18.95', '-4'], 0)
    expect(identifierIn(stats)).toBeNull()
    expect(inferColumnType(stats).type).toBe('number')
  })
})

/* ------------------------------------------------------------ */
/* booleans                                                      */
/* ------------------------------------------------------------ */

describe('yes and no', () => {
  it('reads words as a yes/no column', () => {
    const stats = measureColumn('Stocked', ['yes', 'no', 'y', 'N', 'TRUE'], 0)
    expect(inferColumnType(stats).type).toBe('boolean')
  })

  it('reads a column of nothing but 0 and 1 as a number, not a yes/no', () => {
    const stats = measureColumn('Axles', ['1', '0', '1', '1'], 0)
    expect(inferColumnType(stats).type).toBe('number')
  })
})

/* ------------------------------------------------------------ */
/* refusals                                                      */
/* ------------------------------------------------------------ */

describe('what it refuses, and what each refusal tells you to do', () => {
  const only = (text: string, name = 'x.csv') => {
    const plan = readCsvSchema(text, name)
    expect(plan.ok).toBe(false)
    expect(plan.columns).toEqual([])
    expect(plan.rows).toEqual([])
    return plan.refusals
  }

  it('refuses an empty file', () => {
    expect(only('')[0].say).toContain('empty')
    expect(only('   \r\n')[0].say).toContain('empty')
  })

  it('refuses a header with nothing under it', () => {
    const say = only('Name,Cost\r\n')[0].say
    expect(say).toContain('no rows under them')
  })

  it('refuses a workbook and says how to turn it into a CSV', () => {
    const say = only('PK\u0003\u0004xl/workbook.xml', 'Prices.xlsx')[0].say
    expect(say).toContain('Excel workbook')
    expect(say).toContain('CSV UTF-8')
  })

  it('refuses a PDF', () => {
    expect(only('%PDF-1.7\n%aaaa', 'Prices.pdf')[0].say).toContain('PDF')
  })

  it('refuses bytes that are not text', () => {
    expect(only('Name,Cost\u0000\u0001')[0].say).toContain('not text')
  })

  it('refuses a semicolon-separated file and names the fix', () => {
    const say = only('Part;Brand;Cost\r\nA;Yamaha;18\r\n')[0].say
    expect(say).toContain('semicolons')
    expect(say).toContain('CSV UTF-8')
  })

  it('refuses a file whose first row is data', () => {
    const say = only('1001,48.5,2024-03-01\r\n1002,129,2024-03-02\r\n')[0].say
    expect(say).toContain('data, not column names')
  })

  it('refuses a column with no name — it will not invent one', () => {
    const say = only('Part,,Cost\r\nA,x,18\r\n')[0].say
    expect(say).toContain('no name in the first row')
    expect(say).toContain('column 2')
  })

  it('refuses two columns with the same name', () => {
    const say = only('Part,Cost,cost\r\nA,18,19\r\n')[0].say
    expect(say).toContain('Two columns are both called Cost')
    expect(say).toContain('column 2 and column 3')
  })

  it('refuses a row with more cells than columns, by row number', () => {
    const say = only('Part,Cost\r\nA,18\r\nB,1,000,19\r\n')[0].say
    expect(say).toContain('row 3')
    expect(say).toContain('comma inside a value')
  })

  it('reads a genuine one-column list rather than accusing it', () => {
    const plan = readCsvSchema('Part No\r\nYM-1001\r\nYM-1002\r\n', 'x.csv')
    expect(plan.ok).toBe(true)
    expect(plan.columns).toHaveLength(1)
  })
})

/* ------------------------------------------------------------ */
/* the person's own choices                                      */
/* ------------------------------------------------------------ */

describe('the person decides', () => {
  const text = file([
    ['Code', 'Cost'],
    ['A-1', '18'],
    ['A-2', 'POA'],
    ['A-3', '42'],
  ])

  it('says what an override costs in the same counts as the proposal', () => {
    const plan = readCsvSchema(text, 'x.csv')
    const cost = col(plan, 'Cost')
    expect(cost.type).toBe('text')

    const asNumber = describeColumn(cost, 'number')
    expect(asNumber.emptied).toBe(1)
    expect(asNumber.exceptions).toEqual([{ value: 'POA', count: 1 }])
    expect(asNumber.why).toContain('2 of 3 are numbers')
  })

  it('coerces against the type the person settled on, not the one proposed', () => {
    const plan = readCsvSchema(text, 'x.csv')
    const values = csvRowValues(plan.rows, [
      { index: 0, name: 'Code', type: 'text' },
      { index: 1, name: 'Cost', type: 'number' },
    ])
    expect(values.map((r) => r[1])).toEqual([18, null, 42])
  })

  it('lets a name column be any column', () => {
    const plan = readCsvSchema(text, 'x.csv')
    expect(proposeNameColumn(plan.columns)).toBe(0)
  })
})

describe('the button says what it is about to make', () => {
  it('counts the columns and the rows', () => {
    expect(describeBuild(8, 320, 'Supplier parts')).toBe(
      'Makes Supplier parts with 8 columns and 320 rows.',
    )
  })

  it('says what will not survive the types chosen, before the press', () => {
    expect(describeBuild(8, 320, 'Supplier parts', 3)).toContain(
      '3 cells do not fit the types chosen and will be empty.',
    )
    expect(describeBuild(8, 320, 'Supplier parts', 1)).toContain('1 cell does not fit')
  })
})

describe('the table takes the file’s own name', () => {
  it('drops the extension and nothing else', () => {
    expect(tableNameFromFile('Freight schedule 2024.csv')).toBe('Freight schedule 2024')
    expect(tableNameFromFile('suppliers.CSV')).toBe('suppliers')
    expect(tableNameFromFile('no-extension')).toBe('no-extension')
  })
})
