/* ============================================================
   THE MODULE INDEX IS A CATALOGUE SOMEBODY SHOPS, so it never
   lists what the business has stopped selling — and the card that
   opens it never counts what the page will not draw.

   The failure this file guards is the one `read.ts` was written
   against, one step further on: three copies of a count is three
   chances for a card to say 40 and the page it opens to draw 39.
   Discontinued stock is now the easiest way to cause exactly that,
   so the count and the list are asserted against each other here.

   Nothing is deleted. Every row held back is still in
   `rowsByEntity` at the end of each test, because the sheet is
   where a person maintains their data.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import {
  DISCONTINUED_FIELD_ID,
  type EntityDef,
  type FieldDef,
  type ModuleDef,
  type RowData,
} from '@/types/model'
import { buildEntries, groupEntries, listedTables, moduleHeldCount, moduleRowCount } from './read'

const STAMP = '2026-01-01T00:00:00.000Z'

const field = (id: string, name: string, type: FieldDef['type']): FieldDef => ({ id, name, type })

const table = (id: string, name: string, extra: Partial<EntityDef> = {}): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind: 'trailer',
  fields: [field('name', 'Model', 'text'), field('price', 'Cash', 'number')],
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...extra,
})

const row = (id: string, entityId: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const LIVE = table('live', 'NSM Custom Trailers')
const OBSOLETE = table('obsolete', 'OBSOLETE Trailers', { retired: true })

const entities: Record<string, EntityDef> = { live: LIVE, obsolete: OBSOLETE }

const rowsByEntity: Record<string, RowData[]> = {
  live: [
    row('l1', 'live', { name: 'NSM 4.6', price: 4600 }),
    row('l2', 'live', { name: 'NSM 4.2 (old)', price: 4200, [DISCONTINUED_FIELD_ID]: true }),
    row('l3', 'live', { name: 'NSM 5.0', price: 5000 }),
  ],
  obsolete: [row('o1', 'obsolete', { name: 'NSM 3.8', price: 3800 })],
}

const module_: ModuleDef = {
  id: 'm1',
  name: 'Trailers',
  description: 'The trailers we sell.',
  tableIds: ['live', 'obsolete'],
  capabilities: ['browse', 'search', 'open'],
  index: 'rows',
  accent: 'ochre',
  order: 0,
  createdAt: STAMP,
  updatedAt: STAMP,
}

describe('what a module lists', () => {
  it('drops a retired table out of the catalogue and keeps it in the module', () => {
    expect(listedTables(module_, entities).map((e) => e.id)).toEqual(['live'])
    /* the module still NAMES it — the designer strip has to be able
       to show an admin that it does */
    expect(module_.tableIds).toEqual(['live', 'obsolete'])
  })

  it('never puts a discontinued row on the index', () => {
    const entries = buildEntries(listedTables(module_, entities), rowsByEntity)
    expect(entries.map((e) => e.rowId)).toEqual(['l1', 'l3'])
    expect(entries.map((e) => e.label)).not.toContain('NSM 4.2 (old)')
  })

  it('refuses a retired table even when it is handed one directly', () => {
    /* the filter is on the drawing as well as on the selection, so a
       caller that forgets `listedTables` still cannot leak one */
    expect(buildEntries([OBSOLETE], rowsByEntity)).toEqual([])
  })

  it('counts what the page will draw, and states the rest separately', () => {
    const entries = buildEntries(listedTables(module_, entities), rowsByEntity)
    expect(moduleRowCount(module_, entities, rowsByEntity)).toBe(entries.length)
    expect(moduleRowCount(module_, entities, rowsByEntity)).toBe(2)
    /* one discontinued on the live table, one whole retired table */
    expect(moduleHeldCount(module_, entities, rowsByEntity)).toBe(2)
  })

  it('leaves the sheet exactly as it found it', () => {
    buildEntries(listedTables(module_, entities), rowsByEntity)
    expect(rowsByEntity.live).toHaveLength(3)
    expect(rowsByEntity.obsolete).toHaveLength(1)
  })

  it('groups only what it listed, so no heading is left empty', () => {
    const entries = buildEntries(listedTables(module_, entities), rowsByEntity)
    const sections = groupEntries(entries, listedTables(module_, entities))
    expect(sections.map((s) => s.tableId)).toEqual(['live'])
    expect(sections[0].count).toBe(2)
  })
})
