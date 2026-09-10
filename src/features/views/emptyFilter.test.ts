/* ============================================================
   AN EMPTY LIST MEANS TWO OPPOSITE THINGS, AND BOTH ARE RIGHT.

   CONFIG_FINDINGS §4 Adopt 3: "Empty means unrestricted, applied
   everywhere, and said in the UI: 'Empty list = no filter.'"

   Applied everywhere it applies — and this app has one place it does
   NOT, on purpose:

     · `@/features/views/filter.ts` skips an empty `values` filter, so
       a curated list with nothing in it admits everything. That is
       Adopt 3, and the reason is the one hl-admin gives: a fresh
       list that showed nothing would hide a dealer's whole catalogue
       behind a setting they have never opened.

     · `@/features/table/core/view.ts` admits NOTHING through an empty
       one, which is Excel's uncheck-everything, in a surface that
       imitates a spreadsheet deliberately.

   THE DIFFERENCE IS WHO WROTE THE EMPTINESS. In the register a
   person opened a menu and unticked every box — a gesture with an
   obvious intent. In a curated list the emptiness is that nobody has
   curated yet.

   WHY THE TWO ARE ASSERTED IN ONE FILE. They are three lines apart in
   meaning and two directories apart in the tree, and the failure mode
   is not that either regresses on its own — it is that somebody finds
   one of them while working on the other and "fixes" the
   inconsistency. Read side by side, they are not one.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { CellValue, EntityDef, FieldDef, RowData } from '@/types/model'
import { applyView } from '@/features/table/core'
import type { ColumnFilter, ViewRow } from '@/features/table/core'
import { applyFilters } from './filter'
import type { RelatedRow } from './pairs'

const ISO = '2026-01-01T00:00:00.000Z'

const BRAND: FieldDef = { id: 'f-brand', name: 'Brand', type: 'select' }

const entity: EntityDef = {
  id: 'e-trailers',
  name: 'Trailers',
  accent: 'blue',
  fields: [BRAND],
  displayFieldId: 'f-brand',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
}

const rows: RowData[] = ['Dunbier', 'REDCO', 'Mackay'].map((brand, i) => ({
  id: `r${i}`,
  entityId: entity.id,
  values: { 'f-brand': brand },
  createdAt: ISO,
  updatedAt: ISO,
}))

/* -- the register's shape -- */
const viewRows: ViewRow[] = rows.map((r) => ({
  rowId: r.id,
  values: r.values,
  text: { 'f-brand': String(r.values['f-brand'] ?? '') },
}))

/* -- the block's shape -- */
const related: RelatedRow[] = rows.map((r, i) => ({
  row: r,
  origin: 'rule',
  recommended: false,
  sortKey: i,
}))

const read = (r: RelatedRow, fieldId: string): CellValue => r.row.values[fieldId] ?? ''

const EMPTY: ColumnFilter = { kind: 'values', fieldId: 'f-brand', selected: [] }
const ONE: ColumnFilter = { kind: 'values', fieldId: 'f-brand', selected: ['REDCO'] }

const inBlock = (filters: ColumnFilter[]): RelatedRow[] =>
  applyFilters({
    rows: related,
    filters,
    search: '',
    searchFieldIds: ['f-brand'],
    entity,
    read,
  })

/* ---------------------------------------------------------- */

describe('a curated list with nothing in it', () => {
  it('ADMITS EVERYTHING — Adopt 3, and the whole catalogue is not hidden behind an unopened setting', () => {
    expect(inBlock([EMPTY])).toHaveLength(3)
  })

  it('narrows the moment somebody curates', () => {
    expect(inBlock([ONE]).map((r) => r.row.values['f-brand'])).toEqual(['REDCO'])
  })
})

describe('a register facet a person emptied by hand', () => {
  it('ADMITS NOTHING — the other answer, and the one the gesture meant', () => {
    /* Unticking every box in a column menu is a deliberate act in a
       surface that imitates a spreadsheet. To clear the narrowing,
       the filter object is dropped rather than emptied. */
    expect(applyView(viewRows, [BRAND], { filters: [EMPTY] })).toHaveLength(0)
  })

  it('and dropping the filter is what shows everything again', () => {
    expect(applyView(viewRows, [BRAND], { filters: [] })).toHaveLength(3)
  })

  it('narrows to the ticked value, like the other one', () => {
    const out = applyView(viewRows, [BRAND], { filters: [ONE] })
    expect(out.map((r) => r.text['f-brand'])).toEqual(['REDCO'])
  })
})

describe('the two, side by side', () => {
  it('DISAGREE ON THE EMPTY LIST AND AGREE ON EVERYTHING ELSE', () => {
    /* The assertion that would catch somebody reconciling them: the
       same filter, the same rows, opposite answers — by design. */
    expect(inBlock([EMPTY])).toHaveLength(3)
    expect(applyView(viewRows, [BRAND], { filters: [EMPTY] })).toHaveLength(0)

    expect(inBlock([ONE])).toHaveLength(1)
    expect(applyView(viewRows, [BRAND], { filters: [ONE] })).toHaveLength(1)
  })
})
