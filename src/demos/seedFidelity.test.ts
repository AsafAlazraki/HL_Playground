/* ============================================================
   THE SEED'S JOB IS TO BE FAITHFUL, NOT TIDY.

   `Surtess  -  770 Game Fisher XL` was reported as a data typo in
   `src/demos/northside.ts`. It was checked against the workbook
   before anything was changed, and the workbook is where it comes
   from: `Boat Module!C223` reads exactly that, misspelt brand and
   double-spaced hyphen and all. The extract it was read from is
   `tools/seed/extracts/b2_data.json`, row 223, column C.

   So the seed is CORRECT and the typo is the dealer's own. It stays,
   for two reasons that both outrank neatness:

     · THE JOIN KEY IS THE DISPLAY NAME, never the code
       (FITMENT_RULES.md). Every motor, trailer, dealer-fit and P/D
       line on that hull's row resolves against this exact string.
       "Correcting" it here silently unpicks the row's fan-out.
     · A seed that improves its source stops being evidence. The
       whole file's opening promise is that every value was read out
       of the Master Price File and nothing was invented to fill a
       gap; quietly fixing spelling is the same act in reverse.

   The Surtees band's mixed naming is the same story: the workbook
   writes `495 - Pro Fisher.` with a trailing full stop, prefixes the
   brand onto six of its nineteen rows and leaves it off the other
   thirteen. All verbatim. This file exists so the next person to
   notice reads the ruling instead of making the change.

   THE PLACE TO FIX IT IS THE WORKBOOK, and only the dealer can.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from './northside'
import { displayFieldOf, type EntityDef, type RowData } from '@/types/model'

const project = buildNorthsideProject()

const surtees = ((): { table: EntityDef; rows: RowData[] } => {
  const table = project.entities.find((e) => e.name === 'Surtees')
  if (!table) throw new Error('no Surtees table in the seed')
  return { table, rows: project.rowsByEntity[table.id] ?? [] }
})()

const names = ((): string[] => {
  const field = displayFieldOf(surtees.table)
  if (!field) throw new Error('Surtees has no display column')
  return surtees.rows.map((r) => String(r.values[field.id] ?? ''))
})()

describe('the Surtees band is the workbook, verbatim', () => {
  it('keeps the dealer’s own misspelling of their own brand', () => {
    /* Boat Module!C223. Two spaces each side of the hyphen, and
       `Surtess` for `Surtees` — the workbook's, not ours. */
    expect(names).toContain('Surtess  -  770 Game Fisher XL')
    /* and the row above it is spelt right, with the same double
       spacing, which is how you can tell neither was normalised */
    expect(names).toContain('Surtees  -  770 Game Fisher')
  })

  it('keeps the trailing full stops the sheet types', () => {
    expect(names).toContain('495 - Pro Fisher.')
    expect(names).toContain('540 - Workmate.')
  })

  it('keeps the brand on the six rows that carry it and off the rest', () => {
    expect(names.length).toBe(19)
    expect(names.filter((n) => /^Surte/.test(n)).length).toBe(6)
  })
})
