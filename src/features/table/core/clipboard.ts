/* ============================================================
   Table core — the delimited block format, in both of its dialects.

   ONE CODEC, TWO DELIMITERS, AND THE SECOND IS WHY THIS IS GENERAL.
   The clipboard dialect is TAB-separated, because that is what Excel
   and Google Sheets put on the clipboard. A FILE handed to Excel is
   COMMA-separated, because that is what `.csv` means to every
   spreadsheet on earth. The two dialects differ in exactly one
   character: the quoting rule, the doubled inner quote, the accepted
   line endings and "a trailing terminator is not a row" are the same
   in both, and were already written here once.

   So the parser takes its delimiter as an argument, and each named
   pair is one line. `@/features/io/csv` is the second caller — it
   adds only what a FILE needs and a clipboard does not: a UTF-8
   byte-order mark, and CRLF line endings.

   The rules both dialects keep:
     · cells separated by the delimiter, rows by NEWLINE
     · a cell containing the delimiter, a newline or a double-quote is
       wrapped in double-quotes, and inner quotes are doubled ("" -> ")
     · a trailing row terminator is an artifact, not an extra row

   parseDelimited(serializeDelimited(x, d), d) round-trips exactly.
   ============================================================ */

/** What forces a field to be quoted. Built per delimiter rather than
 *  written twice, so the comma dialect cannot inherit the tab rule by
 *  accident. Both delimiters in use are regex-inert, and the escape
 *  keeps that true for any third one. */
function needsQuotes(delimiter: string): RegExp {
  const d = delimiter.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')
  return new RegExp(`["\r\n${d}]`)
}

/** One block of cells -> delimited text. No trailing newline. */
export function serializeDelimited(cells: string[][], delimiter: string): string {
  const quote = needsQuotes(delimiter)
  return cells
    .map((row) =>
      row
        .map((cell) => {
          const s = cell ?? ''
          return quote.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(delimiter),
    )
    .join('\n')
}

/** One block of cells -> clipboard text. No trailing newline. */
export function serializeTsv(cells: string[][]): string {
  return serializeDelimited(cells, '\t')
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
  return parseDelimited(text, '\t')
}

/** The same reader, for any single-character delimiter — see the
 *  header. A `.csv` file is this with a comma. */
export function parseDelimited(text: string, delimiter: string): string[][] {
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

    if (ch === delimiter) {
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
