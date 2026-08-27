/* ============================================================
   io/csvSchema — A NEW TABLE FROM A FILE, WHERE THE SCHEMA ADAPTS
   TO THE FILE RATHER THAN THE FILE BEING MADE TO FIT A SCHEMA.

   THE INSTRUCTION, verbatim: "be able to create new table directly
   from a csv import. and our schema adjusts to that tables columns
   etc. so they could upload supplier table directly."

   This is the app's own argument taken literally. Everything here is
   a table and the dealer configures their own business without a
   developer — and yet until now the only way in was to draw every
   column by hand FIRST and then paste values into it. A dealer has
   dozens of these in spreadsheets: a supplier list, a freight
   schedule, a warranty matrix. The file already says what its columns
   are. Reading them is the whole feature.

   WHAT IS NEW HERE, AND WHAT IS NOT. The CSV grammar is not new —
   `./csv` and `@/features/table/core` already parse the delimiter,
   the doubled quote, the embedded newline, the BOM and Excel's own
   rewriting, all measured against Excel 16. The plan-then-apply shape
   is not new — `./tableCsv` already proved it: read the file, say
   what will happen in counts a person can check, write nothing until
   they press. WHAT IS NEW IS INFERRING A TYPE, and that is the only
   thing this file does that no other file does.

   ---------------------------------------------------------------
   1 · ONE ODD CELL IN A THOUSAND DOES NOT MAKE A PRICE COLUMN PROSE

   This project has already been bitten by naive inference, and the
   scar is in `tools/seed/gen_lib.py`. `profile_column` was
   all-or-nothing: one value that does not parse and the whole column
   is text. At curated-sample scale that is right — an outlier in
   forty rows usually IS the column's shape. At library scale it is a
   disaster. Parts Maintenance column L is the dealer's Sell column,
   2,913 cells deep, and THREE of them are words: "Std" twice and one
   "POA". All-or-nothing turned a price column into prose over three
   cells, and a parts table whose Sell column is text cannot be quoted
   from.

   The fix there, and the rule here:

     · JUDGE ONLY JUDGEABLE CELLS. An empty cell is not evidence of
       anything. A column that is 95% blank is judged on the 5% that
       have a value, because that 5% is the whole of what is known.

     · FEWER THAN ONE IN A HUNDRED, WITH A FLOOR. Below
       `NUMBER_FLOOR` judgeable cells nothing is tolerated at all: a
       short column with an odd value IS a text column, and a
       percentage taken over twenty cells is not a measurement.

     · NAME AND COUNT WHAT WAS TOLERATED. A tolerated cell lands
       EMPTY — exactly what `coerceCellText` already does with a value
       it cannot read — and the values come back BY VALUE so the
       screen can say "3 of 2,913 are not a number (Std ×2, POA)"
       before anything is created. Nothing goes quiet.

   ---------------------------------------------------------------
   2 · A LIST IS A REAL INFERENCE AND IS WORTH MAKING

   A text column with few distinct values over many rows is not free
   text, it is a list, and saying so turns typing into picking. The
   thresholds are a judgement and are therefore STATED rather than
   buried: at least `SELECT_MIN_ROWS` values to measure over, at most
   `SELECT_MAX_OPTIONS` different ones, and each one appearing at
   least `SELECT_MIN_PER_OPTION` times on average. Two values over
   eight hundred rows is a list. Eight hundred values over eight
   hundred rows is a name column.

   ---------------------------------------------------------------
   3 · THE PERSON DECIDES, THE MACHINE PROPOSES

   Nothing here writes. Every function returns a reading, and the type
   it names is a PROPOSAL: the surface lets the name, the type and
   which column names a row all be changed before anything exists.
   That is why `describeColumn` takes the type as an argument instead
   of reading it off the inference — when somebody overrides a column
   to `number`, the same sentence machinery immediately tells them
   what that costs, in the same counts, in the same words.

   ---------------------------------------------------------------
   4 · WHAT IT REFUSES, AND WHY EACH REFUSAL IS A REFUSAL

   A silent partial import over a dealer's data is the worst outcome
   this door can have, so each of these stops the whole read and says
   what is wrong and what to do about it:

     · the file is not text at all (a workbook, a PDF, bytes)
     · the columns are separated by something other than a comma
     · there is no header row — row one is data
     · a column has no name, or two columns share one
     · a row carries MORE cells than there are columns, which is what
       an unquoted comma inside a value looks like, and which would
       silently drop whatever fell off the end
     · the file is empty, or has a header and nothing under it

   TWO THINGS ARE TOLERATED AND COUNTED RATHER THAN REFUSED, because
   both are what an ordinary spreadsheet actually produces:
   completely blank rows (Excel leaves them at the end of nearly every
   file), and rows that stop SHORT of the full width (a trailing empty
   cell is often just not written). Short rows are padded with empty
   cells — no value is lost, nothing is guessed — and the count and
   the row numbers are carried in the plan so the screen says it out
   loud before anybody presses anything.
   ============================================================ */

import type { CellValue, FieldDef, FieldType } from '@/types/model'
import { coerceCellText } from '@/features/table/core'
import { fromCsvFile } from './csv'

/* ------------------------------------------------------------ */
/* the thresholds, stated                                        */
/* ------------------------------------------------------------ */

/** Below this many judgeable cells, a column that does not parse
 *  cleanly is simply not that type. A percentage over twenty cells is
 *  not a measurement — `tools/seed/gen_lib.py` NUM_FLOOR, same value
 *  for the same reason. */
export const NUMBER_FLOOR = 200

/** Fewer than one in a hundred may be tolerated, and only above the
 *  floor. `tools/seed/gen_lib.py` NUM_TOL. */
export const NUMBER_TOLERANCE = 0.01

/** At most this many different values before a column stops being a
 *  list and starts being free text. A picker longer than this is not
 *  a picker. */
export const SELECT_MAX_OPTIONS = 24

/** Fewer values than this and "few distinct values" is not a
 *  measurement — the same argument as `NUMBER_FLOOR`, one column type
 *  along. */
export const SELECT_MIN_ROWS = 20

/** Each option has to earn its place: on average an option appears at
 *  least this many times, or the column is a list of one-offs, which
 *  is what free text is. */
export const SELECT_MIN_PER_OPTION = 5

/** The five a `.csv` can carry. `reference` needs another table to
 *  point at, `formula` needs an expression and `image` needs files —
 *  none of the three is a thing a column of text can be read as, so
 *  none of them is offered here. They are added on the table
 *  afterwards, where the target, the expression and the files are. */
export const INFERABLE_TYPES: FieldType[] = ['text', 'number', 'boolean', 'date', 'select']

/** How many different values are collected before the column is
 *  simply "lots". High enough that any list is fully counted, low
 *  enough that a 3,000-row name column does not carry 3,000 strings
 *  through the UI. */
const DISTINCT_CAP = 400

/* ------------------------------------------------------------ */
/* readings                                                      */
/* ------------------------------------------------------------ */

/** One value that does not fit a type, and how many cells hold it.
 *  BY VALUE, not by count alone: "3 are not a number" is a statistic,
 *  "Std ×2, POA" is a fact somebody can check against their file. */
export interface ColumnException {
  value: string
  count: number
}

/** Everything measured about one column of the file. Raw — no type
 *  has been chosen yet. */
export interface ColumnStats {
  /** 0-based position in the file */
  index: number
  /** the header cell, trimmed. The column's proposed name. */
  header: string
  /** every non-blank cell, trimmed, in file order */
  values: string[]
  /** cells with nothing in them */
  blank: number
  /** blank and non-blank together — the row count */
  total: number
  /** distinct non-blank values, first-seen order, capped */
  distinct: string[]
  /** true when there are more distinct values than were collected */
  distinctCapped: boolean
  /** how many cells hold each distinct value */
  counts: Map<string, number>
}

/** What choosing a type costs this column, said in counts. */
export interface ColumnReading {
  /** one sentence, in the counts a person can check */
  why: string
  /** the values that will not survive, biggest first */
  exceptions: ColumnException[]
  /** how many CELLS those values account for */
  emptied: number
  /** non-blank cells the reading was taken over */
  judged: number
}

/** A column as proposed: the reading, plus the type it argues for. */
export interface InferredColumn extends ColumnStats {
  type: FieldType
  /** select only — the options, in first-seen order */
  options?: string[]
}

/** Something the file cannot be read past, and what to do about it. */
export interface CsvRefusal {
  id: string
  say: string
}

/** The whole reading of one file. Never writes; `ok` says whether
 *  anything could be proposed at all. */
export interface CsvSchemaPlan {
  ok: boolean
  fileName: string
  refusals: CsvRefusal[]
  columns: InferredColumn[]
  /** the data rows as text, padded to the column count */
  rows: string[][]
  /** the index of the column proposed to name a row */
  nameColumn: number
  /** completely empty rows dropped on the way in */
  blankRowsDropped: number
  /** rows that stopped short of the full width, by row number */
  shortRows: number[]
}

/* ------------------------------------------------------------ */
/* small shared helpers                                          */
/* ------------------------------------------------------------ */

const count = (n: number): string => n.toLocaleString()

const plural = (n: number, one: string, many: string): string =>
  `${count(n)} ${n === 1 ? one : many}`

/** A field shaped like the one the table will actually get, so the
 *  judging here and the coercion the register does later are the same
 *  code answering the same question. */
const asField = (type: FieldType, options?: string[]): FieldDef => ({
  id: '__probe',
  name: 'column',
  type,
  ...(options ? { options } : {}),
})

/** Which values, and how many cells, a type cannot carry. */
function exceptionsFor(
  stats: ColumnStats,
  type: FieldType,
  options?: string[],
): { exceptions: ColumnException[]; emptied: number } {
  if (type === 'text') return { exceptions: [], emptied: 0 }
  const field = asField(type, options)
  const bad: ColumnException[] = []
  let emptied = 0
  for (const [value, n] of stats.counts) {
    if (coerceCellText(value, field).ok) continue
    bad.push({ value, count: n })
    emptied += n
  }
  bad.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
  return { exceptions: bad, emptied }
}

/** Fewer than one in a hundred, and only with enough cells to mean
 *  anything. See the header, §1. */
const withinTolerance = (bad: number, judged: number): boolean => {
  if (bad === 0) return true
  if (judged < NUMBER_FLOOR) return false
  return bad / judged < NUMBER_TOLERANCE
}

/* ------------------------------------------------------------ */
/* measuring one column                                          */
/* ------------------------------------------------------------ */

export function measureColumn(header: string, cells: string[], index: number): ColumnStats {
  const values: string[] = []
  const counts = new Map<string, number>()
  const distinct: string[] = []
  let blank = 0
  let distinctCapped = false

  for (const cell of cells) {
    const v = cell.trim()
    if (v === '') {
      blank += 1
      continue
    }
    values.push(v)
    const seen = counts.get(v)
    /* every value is COUNTED, whatever the cap: the cap is about how
       many the screen carries, and a tolerance worked out over a
       partial tally would be a made-up number */
    counts.set(v, (seen ?? 0) + 1)
    if (seen === undefined) {
      if (distinct.length < DISTINCT_CAP) distinct.push(v)
      else distinctCapped = true
    }
  }

  return {
    index,
    header: header.trim(),
    values,
    blank,
    total: cells.length,
    distinct,
    distinctCapped,
    counts,
  }
}

/** Is this column a list? The three thresholds at the top of this
 *  file, applied together — and never over a capped distinct set,
 *  because a set that overflowed is by definition too long to be a
 *  list. */
function looksLikeList(stats: ColumnStats): boolean {
  if (stats.distinctCapped) return false
  const judged = stats.values.length
  if (judged < SELECT_MIN_ROWS) return false
  const options = stats.counts.size
  if (options < 2 || options > SELECT_MAX_OPTIONS) return false
  return options * SELECT_MIN_PER_OPTION <= judged
}

/* ------------------------------------------------------------ */
/* AN IDENTIFIER IS NOT A NUMBER                                 */
/*                                                               */
/* `007` is a rego, not seven, and `9312345678901234` is a       */
/* barcode, not a quantity. Both parse cleanly as numbers and    */
/* both are DESTROYED by being stored as one: the leading zero   */
/* is gone and the sixteenth digit is rounded off, because that  */
/* is where a double stops holding an integer exactly.           */
/*                                                               */
/* THIS IS NOT A NEW OPINION. `./csv` refuses to let Excel do    */
/* the same thing on the way out, in its own words and against   */
/* its own measurement: "`007` -> 7, a leading zero, dropped".   */
/* A file arriving is the same trip in the other direction, so   */
/* it takes the same answer — a column with one of these in it   */
/* is TEXT, and the reading beside it says which value made it   */
/* one.                                                          */
/* ------------------------------------------------------------ */

/** Digits only, with any sign, separators and decimal point gone. */
const digitsOf = (v: string): string => v.replace(/[^0-9]/g, '')

/** What stops a column being a number, and which value did it. */
export interface IdentifierNote {
  value: string
  reason: 'leading-zero' | 'too-long'
}

/** The value that stops this column being a number, or null when
 *  nothing does. First one found — the reading names one value, not a
 *  list, because one is enough to settle the column. */
export function identifierIn(stats: ColumnStats): IdentifierNote | null {
  for (const value of stats.counts.keys()) {
    const bare = value.replace(/^[+-]/, '')
    if (/^0\d/.test(bare)) return { value, reason: 'leading-zero' }
    if (digitsOf(bare).length >= 16) return { value, reason: 'too-long' }
  }
  return null
}

/** The clause an identifier contributes to a column's reading. */
const sayIdentifier = (note: IdentifierNote): string =>
  note.reason === 'leading-zero'
    ? `${note.value} would lose its leading zero`
    : `${note.value} has more digits than a number holds exactly`

/**
 * THE PROPOSAL FOR ONE COLUMN.
 *
 * Order matters and is deliberate: the most specific type the values
 * will carry wins, and text is what is left when nothing else fits —
 * never a first guess.
 *
 * `boolean` comes before `number` because `0` and `1` parse as both,
 * and a column of nothing but zeroes and ones is far more often a
 * quantity than a yes/no. So a boolean has to show a WORD — true, yes,
 * n, false — somewhere in it before it is called one.
 */
export function inferColumnType(stats: ColumnStats): { type: FieldType; options?: string[] } {
  const judged = stats.values.length
  if (judged === 0) return { type: 'text' }

  const boolBad = exceptionsFor(stats, 'boolean').exceptions.length
  const wordy = stats.distinct.some((v) => !/^[01]$/.test(v))
  if (boolBad === 0 && wordy) return { type: 'boolean' }

  const numberMiss = exceptionsFor(stats, 'number')
  if (withinTolerance(numberMiss.emptied, judged) && identifierIn(stats) === null) {
    return { type: 'number' }
  }

  const dateMiss = exceptionsFor(stats, 'date')
  if (withinTolerance(dateMiss.emptied, judged)) return { type: 'date' }

  if (looksLikeList(stats)) return { type: 'select', options: [...stats.distinct] }

  return { type: 'text' }
}

/**
 * WHAT THIS COLUMN LOOKS LIKE IF IT IS THAT TYPE — in counts, with the
 * exceptions named.
 *
 * Called for the inferred type when the plan is built AND for whatever
 * the person overrides it to, so the consequence of their own choice
 * is stated in exactly the same words as the consequence of ours.
 */
export function describeColumn(
  stats: ColumnStats,
  type: FieldType,
  options?: string[],
): ColumnReading {
  const judged = stats.values.length
  const { exceptions, emptied } = exceptionsFor(stats, type, options)

  /* said first whenever it is most of the column: a reading taken over
     40 of 2,913 cells is a reading about 40 cells, and a person has to
     know that before they read anything else about it */
  const mostlyEmpty = stats.blank > 0 && judged * 2 < stats.total
  const scope = mostlyEmpty
    ? `${plural(judged, 'cell has', 'cells have')} a value, out of ${count(stats.total)}. `
    : ''

  if (judged === 0) {
    return {
      why: `Every cell in this column is empty.`,
      exceptions: [],
      emptied: 0,
      judged: 0,
    }
  }

  const kept = judged - emptied

  if (type === 'text') {
    const different = stats.distinctCapped
      ? `more than ${count(DISTINCT_CAP)} of them different`
      : `${count(stats.counts.size)} of them different`

    /* WHY IT IS TEXT is the part worth saying. A column that is 37 of
       40 numbers, or that is every-one-a-number but holds `007`, is
       text for a reason, and the reason is checkable. */
    const numberMiss = exceptionsFor(stats, 'number').emptied
    const identifier = identifierIn(stats)
    let nearly = ''
    if (numberMiss === 0 && identifier) {
      nearly = ` They all read as numbers, but ${sayIdentifier(identifier)}, so this stays text.`
    } else if (numberMiss > 0 && numberMiss * 2 < judged) {
      nearly =
        judged < NUMBER_FLOOR
          ? ` ${count(judged - numberMiss)} of ${count(judged)} are numbers, but a column needs ${count(NUMBER_FLOOR)} values before an odd one can be treated as an exception.`
          : ` ${count(judged - numberMiss)} of ${count(judged)} are numbers; ${count(numberMiss)} are not, which is more than one in a hundred.`
    }
    return {
      why: `${scope}${plural(judged, 'value', 'values')}, ${different}.${nearly}`,
      exceptions: [],
      emptied: 0,
      judged,
    }
  }

  if (type === 'select') {
    const opts = options ?? []
    const say =
      emptied === 0
        ? `${scope}${plural(opts.length, 'different value', 'different values')} over ${plural(judged, 'row', 'rows')} — few enough to be a list.`
        : `${scope}${count(kept)} of ${count(judged)} are on the list. ${count(emptied)} ${emptied === 1 ? 'is' : 'are'} not, and will land empty.`
    return { why: say, exceptions, emptied, judged }
  }

  const noun =
    type === 'number' ? 'a number' : type === 'date' ? 'a date' : 'yes or no'
  const nouns = type === 'number' ? 'numbers' : type === 'date' ? 'dates' : 'yes or no'

  if (emptied === 0) {
    return {
      why: `${scope}Every one of ${plural(judged, 'value', 'values')} is ${noun}.`,
      exceptions,
      emptied,
      judged,
    }
  }
  return {
    why: `${scope}${count(kept)} of ${count(judged)} are ${nouns}. ${count(emptied)} ${emptied === 1 ? 'is' : 'are'} not ${noun}, and will land empty.`,
    exceptions,
    emptied,
    judged,
  }
}

/**
 * CAN THIS COLUMN BE A LIST, if the person asks for one?
 *
 * The inference has thresholds and will not PROPOSE a list of forty
 * options. An override is a different question: the person may know
 * something the counts do not, and this app's whole argument is that
 * they decide. So the only things that stop them are the two that are
 * NOT judgements — a list needs a set of options, and neither of
 * these columns has one.
 *
 *   · more different values than this file collected — there is no
 *     set to offer, only the first four hundred of one
 *   · every value different — then the list IS the column, option for
 *     option, and picking from it is typing with extra steps
 *
 * Refused with the count, in place, so the reason is checkable.
 */
export function listOptionsFor(stats: ColumnStats): { options: string[] } | { refusal: string } {
  if (stats.distinctCapped) {
    return {
      refusal: `That column has more than ${count(DISTINCT_CAP)} different values, which is too many to be a list of options.`,
    }
  }
  if (stats.counts.size === 0) {
    return { refusal: 'That column is empty, so there are no options to make a list from.' }
  }
  if (stats.counts.size === stats.values.length) {
    return {
      refusal: `All ${count(stats.values.length)} values in that column are different, so a list of them would just be the column again.`,
    }
  }
  return { options: [...stats.distinct] }
}

/* ------------------------------------------------------------ */
/* which column names a row                                      */
/* ------------------------------------------------------------ */

/**
 * The column a row is KNOWN by — what a reference picker, a quote
 * line and a module tile will print. It is the leftmost text column
 * whose values are nearly all different, because that is what a name,
 * a model code or a part number looks like; failing that, the
 * leftmost text column; failing that, the first column, because a
 * table has to be able to say something about a row.
 *
 * Proposed, never imposed — the surface puts a radio on every column.
 */
export function proposeNameColumn(columns: InferredColumn[]): number {
  const textual = columns.filter((c) => c.type === 'text' && c.values.length > 0)
  const distinctive = textual.find(
    (c) => !c.distinctCapped && c.counts.size >= c.values.length * 0.9,
  )
  if (distinctive) return distinctive.index
  const capped = textual.find((c) => c.distinctCapped)
  if (capped) return capped.index
  if (textual.length > 0) return textual[0].index
  return columns.length > 0 ? columns[0].index : 0
}

/* ------------------------------------------------------------ */
/* refusals — the things a file can be that are not a table      */
/* ------------------------------------------------------------ */

const refusal = (id: string, say: string): CsvRefusal => ({ id, say })

const nothing: Omit<CsvSchemaPlan, 'fileName' | 'refusals'> = {
  ok: false,
  columns: [],
  rows: [],
  nameColumn: 0,
  blankRowsDropped: 0,
  shortRows: [],
}

const refuse = (fileName: string, ...refusals: CsvRefusal[]): CsvSchemaPlan => ({
  ...nothing,
  fileName,
  refusals,
})

/** The two bytes every `.zip` — and so every `.xlsx` — opens with,
 *  followed by one of the local-header marks. Matched on the mark as
 *  well as the letters so a price file whose first column is headed
 *  `PKG` is never mistaken for a workbook. */
const ZIP_MAGIC = ['PK\u0003\u0004', 'PK\u0005\u0006', 'PK\u0007\u0008']

/** A character text a spreadsheet wrote cannot contain. Its presence
 *  in the first few kilobytes is the one honest test for "these are
 *  bytes, not rows". */
const NOT_TEXT = /[\u0000-\u0008\u000e-\u001f]/

/** Bytes that are not a `.csv`, recognised by what they start with or
 *  by holding a character text cannot. Each names the file it really
 *  is and the one move that turns it into a file this door reads. */
function notTextRefusal(text: string): CsvRefusal | null {
  if (ZIP_MAGIC.some((m) => text.startsWith(m))) {
    return refusal(
      'workbook',
      'That is an Excel workbook, not a CSV. Open it in Excel and choose File ▸ Save As ▸ CSV UTF-8, then upload the file that writes.',
    )
  }
  if (text.startsWith('%PDF')) {
    return refusal(
      'pdf',
      'That is a PDF. A PDF has no columns to read — if the list came from a spreadsheet, upload the spreadsheet saved as CSV UTF-8.',
    )
  }
  if (NOT_TEXT.test(text.slice(0, 4096))) {
    return refusal(
      'binary',
      'That file is not text, so there are no rows or columns in it to read. Save it from your spreadsheet as CSV UTF-8 and upload that.',
    )
  }
  return null
}

function wrongDelimiterRefusal(header: string[]): CsvRefusal | null {
  if (header.length !== 1) return null
  const line = header[0]
  const semis = (line.match(/;/g) ?? []).length
  const tabs = (line.match(/\t/g) ?? []).length
  if (semis >= 2) {
    return refusal(
      'semicolons',
      'That file separates its columns with semicolons, not commas, so the whole first row reads as one column name. Re-save it from Excel as CSV UTF-8 — that writes commas.',
    )
  }
  if (tabs >= 2) {
    return refusal(
      'tabs',
      'That file separates its columns with tabs, not commas, so the whole first row reads as one column name. Save it as CSV UTF-8 and upload that.',
    )
  }
  return null
}

/** Row one has to be the column NAMES. When every cell in it reads as
 *  a number or a date, it is the first row of the data and the names
 *  are missing — which would otherwise turn a price into a column
 *  heading and lose that row entirely. */
function noHeaderRefusal(header: string[]): CsvRefusal | null {
  const live = header.map((h) => h.trim()).filter((h) => h !== '')
  if (live.length < 2) return null
  const dataish = live.filter(
    (h) =>
      coerceCellText(h, asField('number')).ok || coerceCellText(h, asField('date')).ok,
  )
  if (dataish.length < live.length) return null
  return refusal(
    'no-header',
    `The first row of that file is data, not column names — it reads ${live
      .slice(0, 3)
      .join(', ')}${live.length > 3 ? ', …' : ''}. Put a row of column names at the top and upload it again.`,
  )
}

const ordinal = (i: number): string => `column ${i + 1}`

function headerRefusals(header: string[]): CsvRefusal[] {
  const out: CsvRefusal[] = []

  const blanks = header
    .map((h, i) => (h.trim() === '' ? i : -1))
    .filter((i) => i >= 0)
  if (blanks.length > 0) {
    out.push(
      refusal(
        'blank-header',
        `${blanks.length === 1 ? 'One column has' : `${blanks.length} columns have`} no name in the first row (${blanks
          .slice(0, 4)
          .map(ordinal)
          .join(', ')}${blanks.length > 4 ? ', …' : ''}). Name every column in row one — this app will not invent a name for a column of somebody's data.`,
      ),
    )
  }

  const seen = new Map<string, number[]>()
  for (let i = 0; i < header.length; i += 1) {
    const key = header[i].trim().toLowerCase()
    if (key === '') continue
    const at = seen.get(key)
    if (at) at.push(i)
    else seen.set(key, [i])
  }
  for (const [, where] of seen) {
    if (where.length < 2) continue
    out.push(
      refusal(
        `duplicate:${where[0]}`,
        `Two columns are both called ${header[where[0]].trim()} (${where
          .map(ordinal)
          .join(' and ')}). Give each column its own name and upload it again.`,
      ),
    )
  }

  return out
}

/* ------------------------------------------------------------ */
/* the read                                                      */
/* ------------------------------------------------------------ */

/**
 * READ A FILE AND PROPOSE A TABLE. Writes nothing, ever.
 *
 * The order is the order the failures matter in: is it text at all,
 * is it comma-separated, does it have a header, are the headings
 * usable, is there anything under them, and only then what the
 * columns are.
 */
export function readCsvSchema(text: string, fileName: string): CsvSchemaPlan {
  const notText = notTextRefusal(text)
  if (notText) return refuse(fileName, notText)

  if (text.trim() === '') {
    return refuse(
      fileName,
      refusal('empty', 'That file is empty — there is nothing in it to read a table from.'),
    )
  }

  const grid = fromCsvFile(text)
  if (grid.length === 0) {
    return refuse(
      fileName,
      refusal('empty', 'That file is empty — there is nothing in it to read a table from.'),
    )
  }

  const header = grid[0]
  const wrongDelimiter = wrongDelimiterRefusal(header)
  if (wrongDelimiter) return refuse(fileName, wrongDelimiter)

  const noHeader = noHeaderRefusal(header)
  if (noHeader) return refuse(fileName, noHeader)

  const bad = headerRefusals(header)
  if (bad.length > 0) return refuse(fileName, ...bad)

  /* -- the rows ------------------------------------------------ */

  const width = header.length
  const rows: string[][] = []
  const shortRows: number[] = []
  const longRows: number[] = []
  let blankRowsDropped = 0

  for (let r = 1; r < grid.length; r += 1) {
    const line = grid[r]
    /* Excel leaves blank rows at the end of nearly every file it
       writes, and a person deleting a row often leaves one behind in
       the middle. Neither is data. */
    if (line.every((c) => c.trim() === '')) {
      blankRowsDropped += 1
      continue
    }
    const rowNumber = r + 1
    if (line.length > width) {
      longRows.push(rowNumber)
      continue
    }
    if (line.length < width) {
      shortRows.push(rowNumber)
      rows.push([...line, ...Array<string>(width - line.length).fill('')])
      continue
    }
    rows.push(line)
  }

  /* A row with MORE cells than there are columns is what an unquoted
     comma inside a value looks like, and carrying it would drop
     whatever fell off the end without saying so. Refused by row
     number so it can be found in Excel. */
  if (longRows.length > 0) {
    return refuse(
      fileName,
      refusal(
        'ragged',
        `${plural(longRows.length, 'row carries', 'rows carry')} more cells than there are columns (${longRows
          .slice(0, 5)
          .map((n) => `row ${count(n)}`)
          .join(', ')}${longRows.length > 5 ? ', …' : ''}). That is usually a comma inside a value that is not in quotes. Fix those rows and upload it again.`,
      ),
    )
  }

  if (rows.length === 0) {
    return refuse(
      fileName,
      refusal(
        'no-rows',
        'That file has column names and no rows under them. There is nothing to read a column’s type from, so upload it with its data in it.',
      ),
    )
  }

  /* -- the columns --------------------------------------------- */

  const columns: InferredColumn[] = header.map((name, i) => {
    const stats = measureColumn(name, rows.map((row) => row[i] ?? ''), i)
    const { type, options } = inferColumnType(stats)
    return { ...stats, type, ...(options ? { options } : {}) }
  })

  return {
    ok: true,
    fileName,
    refusals: [],
    columns,
    rows,
    nameColumn: proposeNameColumn(columns),
    blankRowsDropped,
    shortRows,
  }
}

/* ------------------------------------------------------------ */
/* what the person settled on                                    */
/* ------------------------------------------------------------ */

/** One column as the person left it: their name, their type, and the
 *  options a list ended up with. */
export interface ColumnChoice {
  index: number
  name: string
  type: FieldType
  options?: string[]
}

/**
 * The file's cells as the values the table will hold, coerced against
 * the types the PERSON settled on — not the ones proposed.
 *
 * A cell a type cannot carry lands empty, which is what
 * `coerceCellText` already does everywhere else in this app and what
 * the reading beside the column promised, by value and by count,
 * before anything was created.
 */
export function csvRowValues(rows: string[][], choices: ColumnChoice[]): CellValue[][] {
  const fields = choices.map((c) => asField(c.type, c.options))
  return rows.map((row) =>
    choices.map((c, i) => {
      const raw = row[c.index] ?? ''
      if (raw.trim() === '') return null
      const got = coerceCellText(raw, fields[i])
      return got.ok ? got.value : null
    }),
  )
}

/** The table's proposed name: the file's own, without its extension.
 *  From the file, so it is never invented — and editable, because a
 *  file name is a file name and not always a table name. */
export function tableNameFromFile(fileName: string): string {
  const stem = fileName.replace(/\.[A-Za-z0-9]{1,8}$/, '').trim()
  return stem === '' ? fileName.trim() : stem
}

/** A count of what pressing create will make, for the sentence beside
 *  the button. `emptied` is said HERE, before the press, and again in
 *  the note afterwards — a cell that will not survive the types
 *  chosen is not a thing to find out about later. */
export function describeBuild(
  columns: number,
  rows: number,
  name: string,
  emptied = 0,
): string {
  const made = `Makes ${name} with ${plural(columns, 'column', 'columns')} and ${plural(rows, 'row', 'rows')}.`
  if (emptied === 0) return made
  return `${made} ${plural(emptied, 'cell', 'cells')} ${emptied === 1 ? 'does' : 'do'} not fit the types chosen and will be empty.`
}
