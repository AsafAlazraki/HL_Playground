/* ============================================================
   Table core — TSV clipboard block format.

   The de-facto Excel / Google Sheets convention:
     · cells separated by TAB, rows by NEWLINE
     · a cell containing a tab, a newline or a double-quote is wrapped
       in double-quotes, and inner quotes are doubled ("" -> ")
     · a trailing row terminator is an artifact, not an extra row

   parseTsv(serializeTsv(x)) round-trips exactly.
   ============================================================ */

const NEEDS_QUOTES = /["\t\r\n]/

/** One block of cells -> clipboard text. No trailing newline. */
export function serializeTsv(cells: string[][]): string {
  return cells
    .map((row) =>
      row
        .map((cell) => {
          const s = cell ?? ''
          return NEEDS_QUOTES.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join('\t'),
    )
    .join('\n')
}

/** Clipboard text -> block of cells. Accepts \n, \r\n and bare \r line
 *  endings, quoted fields containing tabs/newlines/quotes, and preserves
 *  empty trailing cells. A single trailing line terminator produces NO
 *  phantom final row.
 *
 *  One deliberate asymmetry: parseTsv('') is [], not [['']]. An empty
 *  clipboard must paste nothing rather than clear a cell — so a block of
 *  exactly one empty cell is the only value that does not survive a
 *  serialize → parse round-trip. */
export function parseTsv(text: string): string[][] {
  if (text === '') return []

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  // True immediately after a row terminator (and at the very start), so a
  // trailing "\n" / "\r\n" / "\r" does not manufacture an empty last row.
  let atRowStart = true
  let i = 0

  const endField = (): void => {
    row.push(field)
    field = ''
  }
  const endRow = (): void => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text[i]

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"' // escaped quote
          i += 2
          continue
        }
        quoted = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }

    // A quote only opens a quoted section at the START of a field —
    // mid-field quotes (a"b) are literal, as Excel treats them.
    if (ch === '"' && field === '') {
      quoted = true
      atRowStart = false
      i += 1
      continue
    }

    if (ch === '\t') {
      endField()
      atRowStart = false
      i += 1
      continue
    }

    if (ch === '\r' || ch === '\n') {
      endRow()
      atRowStart = true
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1
      continue
    }

    field += ch
    atRowStart = false
    i += 1
  }

  // Close whatever is still open. Skip only when the text ended exactly on
  // a row terminator (nothing typed after it).
  if (!(atRowStart && rows.length > 0)) endRow()

  return rows
}
