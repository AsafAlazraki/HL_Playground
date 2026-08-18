/* ============================================================
   io/csv — the four things a FILE needs that a clipboard does not.

   The codec itself is `@/features/table/core`: one parser, two
   delimiters, already tested against the Excel quoting convention
   the grid's copy and paste have used since the table was built.
   What is here is the file wrapper, and it is four details — each
   of which, left out, breaks the trip for a real person on a real
   Windows machine. Every one of them was MEASURED against Excel 16
   on this machine, by writing a file, opening it through Excel's own
   automation, pressing its own Save, and reading back the bytes. The
   numbers in the notes below are that measurement, not a belief about
   what spreadsheets do:

   1 · THE BYTE-ORDER MARK. Excel on Windows opens a `.csv` in the
       system code page unless the file opens with a UTF-8 BOM. The
       seed carries `Highfield Sport 560 — 5.6m`, `14"` and `Ø` in
       its own data, and without the mark those arrive in Excel as
       `â€”`, then come back into the app as `â€”`, and the register
       is quietly corrupted by a round trip that reported success.
       Three bytes prevent it.

       MEASURED, and it is better than it had to be: with the mark on
       the front, Excel reports the opened workbook as FileFormat 62
       — `xlCSVUTF8` — so its own Save writes UTF-8 with the mark back,
       and `— " Ø` all returned byte-identical. Without it Excel opens
       the same file as plain `xlCSV` and its Save transcodes to the
       code page, where the em dash comes back as `?`. The three bytes
       are not just how the file is read; they are how it is written.

   2 · CRLF. Excel writes CRLF and reads anything; other tools in the
       chain (Notepad, a mail client that previews the attachment)
       read only CRLF. The parser accepts \n, \r\n and bare \r, so
       this costs nothing on the way back and buys the file being
       readable everywhere it might be opened on the way out.

   3 · THE MARK COMES OFF ON THE WAY IN. A BOM left on the front of
       the text becomes part of the FIRST HEADER CELL — `﻿UID`
       is not `UID`, so the identity column would go unrecognised and
       every row in the file would be read as new. That is the exact
       shape of the failure this whole workflow exists to prevent, so
       it is stripped here, once, at the seam.

   4 · EXCEL REWRITES WHAT IT THINKS IT RECOGNISES, AND ONE OF THE
       THINGS IT DOES NOT RECOGNISE IS A ROW KEY. This is the fourth
       detail because it is the one that turns "export, edit, re-upload"
       from a workflow into a data loss, and it was found by running
       the trip rather than by reasoning about it.

       A row key is `nanoid(10)` over `A-Za-z0-9_-`, so ABOUT ONE KEY
       IN SIXTY-FOUR BEGINS WITH A HYPHEN. Measured, on a file this app
       wrote, opened and saved by Excel with nothing else touched:

         -KS7x1XXCj  ->  #NAME?      the row's identity, destroyed
         -leading dash text -> #NAME?  a note that began with a dash
         3-4         ->  3-Apr       a code, read as a date
         007         ->  7           a leading zero, dropped
         0.10        ->  0.1         harmless: the same number

       The first two are Excel entering FORMULA mode on a leading
       `= + - @` and then failing to resolve a name. The row whose key
       became `#NAME?` does not come back as itself: it is read as a
       line naming a key this table does not have, refused by name, and
       the person is told a row they never touched came from another
       sheet. Nothing is silently overwritten — the preflight sees to
       that — but the trip is broken for one row in sixty-four, and on
       a 588-variant register that is nine rows.

       THE GUARD IS A LEADING TAB, and it is a tab because a tab is the
       only candidate that MEASURED CLEAN IN BOTH DIRECTIONS:

         "\t-KS7x1XXCj"  Excel keeps it as text, and its own Save
                         writes `"\t-KS7x1XXCj"` back, byte for byte.
         ="-KS7x1XXCj"   Excel displays it correctly, but its Save
                         writes the bare value back — the guard is
                         gone, so the SECOND trip through Excel is the
                         corrupt one. Worse than no guard, because it
                         looks like it worked.
         '-KS7x1XXCj     Excel does NOT eat the apostrophe out of a
                         file the way it does out of a keystroke: it
                         becomes part of the value, and the register
                         gains an apostrophe every round trip.

       So the tab goes on at the seam and comes off at the seam, once
       each, and nothing above this file knows it exists. In Excel it
       reads as a cell that is very slightly indented.

       IT IS PUT ON BY WHAT THE TEXT LOOKS LIKE, NOT BY WHICH COLUMN IT
       IS IN — see `needsExcelGuard`. A plain number is never guarded,
       because a price the dealer cannot sum in Excel is not a price
       list; everything Excel would re-read as something else is.

   THE DELIMITER IS A COMMA AND IS NOT NEGOTIABLE HERE. Regional
   Excel installs (de-DE, fr-FR) default to a SEMICOLON, which means
   a file this app writes with commas opens in one column on those
   machines. That is a real limitation and it is written down in the
   round trip's own notes rather than half-solved: the app is single
   locale today (Australian dealers, `en-AU` dates day-first in
   `coerceCellText`), so a second delimiter would be a setting with
   no surface to set it on.
   ============================================================ */

import { parseDelimited, serializeDelimited } from '@/features/table/core'

/** U+FEFF. Written at the front of every file this app produces, and
 *  taken off the front of every file it reads. */
export const BOM = '﻿'

export const CSV_DELIMITER = ','

/* ------------------------------------------------------------ */
/* the Excel guard — see note 4 above                            */
/* ------------------------------------------------------------ */

/** U+0009. Put in front of a value Excel would otherwise re-read as
 *  something else, and taken off again on the way back in. */
export const EXCEL_GUARD = '\t'

/**
 * A number Excel reads as that number and writes back unchanged.
 *
 * Deliberately narrow. No leading zero (`007` is a rego, not seven),
 * no thousands separators (`1,000` would have split the field anyway),
 * and at most fifteen digits, which is where a double stops being able
 * to hold an integer exactly and Excel starts rounding the tail off a
 * long identifier.
 */
const PLAIN_NUMBER = /^-?(0|[1-9]\d{0,14})(\.\d+)?$/

/** Every shape Excel re-reads as something other than the text given.
 *  One entry per measured behaviour, in the order they were found. */
const REINTERPRETED: RegExp[] = [
  /* formula mode. The `#NAME?` cases, and the reason this exists */
  /^[=+\-@]/,
  /* whitespace Excel would trim, including a guard already applied */
  /^[\s ]/,
  /* a leading zero on digits — `007` -> 7 */
  /^0\d/,
  /* longer than a double holds exactly — the tail is rounded off */
  /^\d{16,}$/,
  /* scientific notation — `1e5` -> 100000 */
  /^\d+(\.\d+)?[eE][+-]?\d+$/,
  /* dates. `3-4` -> 3-Apr, `1/2` -> 1-Feb, and every ISO date this app
     writes, which would come back in the machine's own locale order */
  /^\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?$/,
  /* the same thing spelled with a MONTH NAME, either way round.
     Named outright rather than as "digits and some letters": `Sport
     560` and `Classic 380` are boat models on this dealer's own
     register, and a guard broad enough to catch them would put a tab
     in front of half the names in the file. Excel only reads a word as
     a month when it IS one. */
  /^\d{1,2}[-/ ](jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*$/i,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[-/ ]\d{1,4}$/i,
  /* times, which become a fraction of a day */
  /^\d{1,2}:\d{2}(:\d{2})?$/,
]

/**
 * Would Excel give this text back as something else?
 *
 * A PLAIN NUMBER IS NEVER GUARDED, and that is the one deliberate
 * exception: guarding it would hand the dealer a price column of text,
 * and a price list you cannot total in Excel is not a price list. The
 * cost is documented and small — `0.10` comes back as `0.1`, the same
 * number, which the merge reads as no change at all because
 * `coerceCellText` parses both to 0.1.
 */
export function needsExcelGuard(text: string): boolean {
  if (text === '') return false
  if (PLAIN_NUMBER.test(text)) return false
  return REINTERPRETED.some((re) => re.test(text))
}

/** The text as it should be written into a cell of a `.csv` a person
 *  will open in Excel. */
export const guardForExcel = (text: string): string =>
  needsExcelGuard(text) ? `${EXCEL_GUARD}${text}` : text

/**
 * The value back out of a cell that may have been guarded.
 *
 * ONE guard character, not a trim: a value's own interior and trailing
 * space is the dealer's, and `coerceCellText` already decides what to
 * do with it per column type. Excel returns the guard exactly as it
 * was given (measured), so one is all there can ever be.
 */
export const unguardFromExcel = (text: string): string =>
  text.startsWith(EXCEL_GUARD) ? text.slice(EXCEL_GUARD.length) : text

/* ------------------------------------------------------------ */

/** A block of cells -> the exact text of a `.csv` file: BOM, CRLF
 *  rows, and a trailing terminator so the last line is a line.
 *
 *  Every cell is guarded on the way out, so a caller cannot forget to.
 *  The header is guarded too — a column somebody named `-Trade in` is
 *  a heading like any other, and it has to come back matching the
 *  column it names or the whole file reads as unknown headings. */
export function toCsvFile(cells: string[][]): string {
  const guarded = cells.map((row) => row.map(guardForExcel))
  const body = serializeDelimited(guarded, CSV_DELIMITER).split('\n').join('\r\n')
  return `${BOM}${body}\r\n`
}

/** The text of a `.csv` file -> a block of cells. Tolerates a missing
 *  BOM (a file written by hand), any line ending, a trailing blank
 *  line, and the guard on any cell — whether this app put it there or
 *  the person did. */
export function fromCsvFile(text: string): string[][] {
  const clean = text.startsWith(BOM) ? text.slice(BOM.length) : text
  return parseDelimited(clean, CSV_DELIMITER).map((row) => row.map(unguardFromExcel))
}

/** A file name a person can find again in their Downloads folder,
 *  built from the table's own name. Windows refuses `\ / : * ? " < >
 *  |` outright and trims trailing dots and spaces, so a table called
 *  `Boats: 5.6m+` must not produce a download the browser silently
 *  renames to something the person cannot match back to the table. */
export function csvFileName(tableName: string, stamp: Date): string {
  const safe = tableName
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  const y = stamp.getFullYear()
  const m = String(stamp.getMonth() + 1).padStart(2, '0')
  const d = String(stamp.getDate()).padStart(2, '0')
  return `${safe === '' ? 'Table' : safe} ${y}-${m}-${d}.csv`
}
