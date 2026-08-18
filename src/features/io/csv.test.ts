/* ============================================================
   THE FILE WRAPPER — and mostly, THE EXCEL GUARD.

   EVERY CASE BELOW IS A TRANSCRIPT, NOT A THEORY. The list came out
   of driving Excel 16 through its own automation on this machine:
   write a file, open it, press its Save, read the bytes back. What is
   pinned here is what Excel actually did, so a later change to the
   guard is measured against the spreadsheet rather than against
   somebody's memory of one.

   The trip, before the guard:

     -KS7x1XXCj          ->  #NAME?      a row's identity, destroyed
     -leading dash text  ->  #NAME?      a note beginning with a dash
     3-4                 ->  3-Apr       a code, read as a date
     007                 ->  7           a leading zero, dropped

   A row key is nanoid(10) over `A-Za-z0-9_-`, so about one in
   sixty-four begins with a hyphen: nine rows of a 588-variant
   register come home as `#NAME?` and are refused as belonging to
   another sheet. The guard is one tab character, on at the seam and
   off at the seam.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import {
  BOM,
  EXCEL_GUARD,
  fromCsvFile,
  guardForExcel,
  needsExcelGuard,
  toCsvFile,
  unguardFromExcel,
} from './csv'

/* ------------------------------------------------------------ */
/* the shape of the file                                          */
/* ------------------------------------------------------------ */

describe('the file wrapper', () => {
  it('opens with the mark and ends every line with CRLF', () => {
    const text = toCsvFile([
      ['Row key', 'Model'],
      ['aBcDeFgHiJ', 'Sport 560'],
    ])
    expect(text.startsWith(BOM)).toBe(true)
    expect(text.endsWith('\r\n')).toBe(true)
    expect(text.split('\r\n').filter((l) => l !== '')).toHaveLength(2)
  })

  it('reads a file that has no mark, and one written with bare newlines', () => {
    const grid = fromCsvFile('Row key,Model\naBcDeFgHiJ,Sport 560\n')
    expect(grid[0]).toEqual(['Row key', 'Model'])
    expect(grid[1]).toEqual(['aBcDeFgHiJ', 'Sport 560'])
  })

  it('carries a value containing the delimiter and a quote home whole', () => {
    const awkward = 'Ocean Master 540, "deluxe" — 14" tube, Ø450'
    const back = fromCsvFile(toCsvFile([['Note'], [awkward]]))
    expect(back[1][0]).toBe(awkward)
  })
})

/* ------------------------------------------------------------ */
/* what Excel would rewrite                                       */
/* ------------------------------------------------------------ */

describe('what Excel would rewrite, and therefore what is guarded', () => {
  /* the four measured failures */
  it('guards a row key that begins with a hyphen — the #NAME? case', () => {
    expect(needsExcelGuard('-KS7x1XXCj')).toBe(true)
    expect(guardForExcel('-KS7x1XXCj')).toBe(`${EXCEL_GUARD}-KS7x1XXCj`)
  })

  it('guards ordinary text that begins with a dash, plus, equals or at', () => {
    for (const v of ['-leading dash text', '+GST included', '=SUM', '@northside']) {
      expect(needsExcelGuard(v)).toBe(true)
    }
  })

  it('guards a code Excel would read as a date', () => {
    for (const v of ['3-4', '1-2', '10-3', '1/2', '3.4.26', '5-Mar', 'Mar-5']) {
      expect(needsExcelGuard(v)).toBe(true)
    }
  })

  it('guards a leading zero, because 007 is a rego and not seven', () => {
    expect(needsExcelGuard('007')).toBe(true)
    expect(needsExcelGuard('000')).toBe(true)
  })

  /* the rest of the measured list */
  it('guards an identifier longer than a double holds exactly', () => {
    expect(needsExcelGuard('1234567890123456')).toBe(true)
    expect(needsExcelGuard('123456789012345')).toBe(false)
  })

  it('guards scientific notation and a time', () => {
    expect(needsExcelGuard('1e5')).toBe(true)
    expect(needsExcelGuard('9:30')).toBe(true)
  })

  it('guards every ISO date this app writes, so none comes back in another order', () => {
    expect(needsExcelGuard('2026-08-18')).toBe(true)
  })

  it('guards a value whose own leading space would otherwise be trimmed', () => {
    expect(needsExcelGuard('  indented')).toBe(true)
  })

  /* THE ONE DELIBERATE EXCEPTION */
  it('NEVER guards a plain number — a price list you cannot total is not one', () => {
    for (const v of ['0', '68990', '-5.6', '5.6', '0.1', '71990.5']) {
      expect(needsExcelGuard(v)).toBe(false)
      expect(guardForExcel(v)).toBe(v)
    }
  })

  it('leaves an ordinary name, a key without a leading hyphen, and a blank alone', () => {
    for (const v of ['Sport 560', 'Highfield Sport 560 — 5.6m', 'aBcDeFgHiJ', 'TRUE', '']) {
      expect(needsExcelGuard(v)).toBe(false)
    }
  })
})

/* ------------------------------------------------------------ */
/* on at the seam, off at the seam                                */
/* ------------------------------------------------------------ */

describe('the guard goes on and comes off exactly once', () => {
  it('takes off exactly one guard and never the value’s own spacing', () => {
    expect(unguardFromExcel(`${EXCEL_GUARD}-KS7x1XXCj`)).toBe('-KS7x1XXCj')
    expect(unguardFromExcel(`${EXCEL_GUARD}  indented`)).toBe('  indented')
    expect(unguardFromExcel('Sport 560 ')).toBe('Sport 560 ')
    expect(unguardFromExcel(`${EXCEL_GUARD}${EXCEL_GUARD}x`)).toBe(`${EXCEL_GUARD}x`)
  })

  it('writes the guard into the file and reads it back off, invisibly', () => {
    const text = toCsvFile([
      ['Row key', 'Model', 'Cash', 'Code'],
      ['-KS7x1XXCj', 'Sport 560', '68990', '3-4'],
    ])
    /* it really is in the file — or Excel would never see it */
    expect(text).toContain(`${EXCEL_GUARD}-KS7x1XXCj`)
    expect(text).toContain(`${EXCEL_GUARD}3-4`)
    /* and the price is not guarded, so Excel can add it up */
    expect(text).not.toContain(`${EXCEL_GUARD}68990`)

    /* and nothing above this file ever sees it */
    expect(fromCsvFile(text)[1]).toEqual(['-KS7x1XXCj', 'Sport 560', '68990', '3-4'])
  })

  it('guards a HEADING too, so a column called “-Trade in” still names its column', () => {
    const text = toCsvFile([['-Trade in', 'Model'], ['1000', 'Sport 560']])
    expect(fromCsvFile(text)[0]).toEqual(['-Trade in', 'Model'])
  })

  it('reads a file that was never guarded — one a person built themselves', () => {
    const grid = fromCsvFile('Row key,Model\r\naBcDeFgHiJ,Sport 560\r\n')
    expect(grid[1]).toEqual(['aBcDeFgHiJ', 'Sport 560'])
  })

  /* THE TRANSCRIPT. This is the exact text Excel 16 wrote back when it
     was given a guarded file and told to Save — quoted field, tab
     intact — and the exact text it wrote for the unguarded ones. */
  it('reads back precisely what Excel’s own Save produced', () => {
    const fromExcel =
      `${BOM}Row key,Name,Cash,Length,Code,Note\r\n` +
      `"\t-KS7x1XXCjT",Tab Guarded,1,2,"\t3-4","\t-tab guarded note"\r\n` +
      `aBcDeFgHiJ,Stabicraft 1450,71990,4.5,"\t1-2",plain note\r\n`
    const grid = fromCsvFile(fromExcel)
    expect(grid[1]).toEqual(['-KS7x1XXCjT', 'Tab Guarded', '1', '2', '3-4', '-tab guarded note'])
    expect(grid[2]).toEqual(['aBcDeFgHiJ', 'Stabicraft 1450', '71990', '4.5', '1-2', 'plain note'])
  })
})
