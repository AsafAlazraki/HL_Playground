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
import type { QuoteDef } from '@/features/quote'
import {
  buildEntries,
  capEntries,
  groupEntries,
  listedTables,
  moduleActivity,
  moduleHeldCount,
  moduleRowCount,
  type IndexEntry,
} from './read'

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

/* ============================================================
   THE CAP MUST NOT SILENCE A MEMBER CHIP.

   Measured on the real seed: Parts & Accessories lists 719 items —
   67 parts, 622 rigging kits, 30 dealer fit packages. A flat
   `slice(0, 240)` drew the first two tables and none of the third,
   so Dealer Fit had no section head, so the chip promising to go to
   it pressed to no effect. These assert the fix at the boundary the
   real data actually crosses.
   ============================================================ */

const entryOf = (tableId: string, n: number): IndexEntry[] =>
  Array.from({ length: n }, (_, i) => ({
    tableId,
    rowId: `${tableId}-${i}`,
    label: `${tableId} ${i}`,
    trail: '',
    branch: '',
    price: '',
    hay: `${tableId} ${i}`,
  }))

describe('the index cap', () => {
  /* the shape of the real Parts & Accessories module */
  const parts = [...entryOf('parts', 67), ...entryOf('rig', 622), ...entryOf('fit', 30)]

  it('returns everything when the module is under the cap', () => {
    const small = entryOf('a', 10)
    expect(capEntries(small, 240)).toBe(small)
  })

  it('draws EVERY table, so no member chip scrolls to nothing', () => {
    const shown = capEntries(parts, 240)
    const seen = new Set(shown.map((e) => e.tableId))
    expect([...seen].sort()).toEqual(['fit', 'parts', 'rig'])
  })

  it('spends the whole budget, so the “N more” sentence stays true', () => {
    const shown = capEntries(parts, 240)
    expect(shown).toHaveLength(240)
    /* 719 - 240, the same remainder the flat slice reported */
    expect(parts.length - shown.length).toBe(479)
  })

  it('gives a short table all of its rows rather than a share it cannot use', () => {
    const shown = capEntries(parts, 240)
    const count = (id: string): number => shown.filter((e) => e.tableId === id).length
    expect(count('parts')).toBe(67)
    expect(count('fit')).toBe(30)
    /* the long table takes what the short ones did not need */
    expect(count('rig')).toBe(240 - 67 - 30)
  })

  it('keeps the original order, so a brand’s own row order survives', () => {
    const shown = capEntries(parts, 240)
    const ids = shown.map((e) => e.tableId)
    /* table order is preserved: every parts row before every rig row */
    expect(ids.indexOf('rig')).toBeGreaterThan(ids.lastIndexOf('parts'))
    expect(ids.indexOf('fit')).toBeGreaterThan(ids.lastIndexOf('rig'))
    /* and row order inside a table */
    expect(shown.filter((e) => e.tableId === 'parts').map((e) => e.rowId)).toEqual(
      entryOf('parts', 67).map((e) => e.rowId),
    )
  })

  it('still stops at the cap when there are more tables than the cap has room for', () => {
    const many = Array.from({ length: 300 }, (_, i) => entryOf(`t${i}`, 2)).flat()
    const shown = capEntries(many, 240)
    expect(shown).toHaveLength(240)
  })
})

/* ============================================================
   WHAT HAS HAPPENED LATELY — the strip that must stay silent.

   The failure guarded here is FABRICATED ACTIVITY. A recency list
   is the easiest thing in this app to fake into life: every seeded
   row carries one identical stamp, so any test looser than "changed
   since it was added" reports 11,116 events on a sheet where nothing
   has happened, and a stakeholder is shown a busy dealership that
   does not exist.

   So the assertion that matters most is the FIRST one, and it is
   the one that says nothing at all.
   ============================================================ */

const quote = (id: string, rootTableId: string, extra: Partial<QuoteDef> = {}): QuoteDef =>
  ({
    id,
    reference: `20260101-0${id.slice(-1)}`,
    state: 'draft',
    viewId: 'v1',
    rootTableId,
    rootRowId: 'l1',
    subjectLabel: 'NSM 4.6',
    subjectSpecs: [],
    sections: [],
    lines: [],
    adjustments: [],
    levelKey: 'cash',
    customer: { name: 'A buyer' },
    createdAt: STAMP,
    updatedAt: STAMP,
    ...extra,
  }) as QuoteDef

describe('what has happened lately', () => {
  it('reports NOTHING for a freshly loaded sheet', () => {
    /* every seeded row has updatedAt === createdAt, and no quote has
       been raised. Both signals are zero, so the strip is not drawn —
       which is the honest answer, not a gap. */
    const a = moduleActivity(module_, entities, rowsByEntity, [])
    expect(a.quoteCount).toBe(0)
    expect(a.quotes).toEqual([])
    expect(a.edited).toBe(0)
    expect(a.editedOn).toEqual([])
  })

  it('counts a row only once it has really been changed', () => {
    const worked: Record<string, RowData[]> = {
      ...rowsByEntity,
      live: [
        rowsByEntity.live[0],
        rowsByEntity.live[1],
        { ...rowsByEntity.live[2], updatedAt: '2026-02-02T00:00:00.000Z' },
      ],
    }
    const a = moduleActivity(module_, entities, worked, [])
    expect(a.edited).toBe(1)
    expect(a.editedOn).toEqual(['NSM Custom Trailers'])
  })

  it('names a discontinued row that was edited — the sheet is where it still lives', () => {
    /* the CATALOGUE withholds it; the activity strip is about work
       somebody did, and correcting a discontinued price is work */
    const worked: Record<string, RowData[]> = {
      ...rowsByEntity,
      live: [
        rowsByEntity.live[0],
        { ...rowsByEntity.live[1], updatedAt: '2026-02-02T00:00:00.000Z' },
        rowsByEntity.live[2],
      ],
    }
    expect(moduleActivity(module_, entities, worked, []).edited).toBe(1)
  })

  it('takes quotes raised on this module and leaves another module’s alone', () => {
    const mine = quote('q1', 'live')
    const theirs = quote('q2', 'somewhere-else')
    const a = moduleActivity(module_, entities, rowsByEntity, [mine, theirs])
    expect(a.quoteCount).toBe(1)
    expect(a.quotes.map((q) => q.id)).toEqual(['q1'])
  })

  it('counts a quote raised against a RETIRED member table', () => {
    /* the table is history rather than stock and lists nothing — but
       the quote was really raised and still opens */
    const a = moduleActivity(module_, entities, rowsByEntity, [quote('q1', 'obsolete')])
    expect(a.quoteCount).toBe(1)
  })

  it('puts the newest first and caps the list, stating the remainder', () => {
    const days = ['2026-01-01', '2026-03-03', '2026-02-02', '2026-05-05', '2026-04-04']
    const qs = days.map((d, i) =>
      quote(`q${i}`, 'live', { createdAt: `${d}T00:00:00.000Z` }),
    )
    const a = moduleActivity(module_, entities, rowsByEntity, qs)
    expect(a.quoteCount).toBe(5)
    /* four named, one counted — the same discipline as INDEX_CAP */
    expect(a.quotes).toHaveLength(4)
    expect(a.quotes.map((q) => q.day)).toEqual([
      '2026-05-05',
      '2026-04-04',
      '2026-03-03',
      '2026-02-02',
    ])
  })

  it('prints the quotes list’s own two words for a state', () => {
    const a = moduleActivity(module_, entities, rowsByEntity, [
      quote('q1', 'live', { state: 'issued' }),
      quote('q2', 'live', { state: 'draft' }),
    ])
    expect(a.quotes.map((q) => q.state).sort()).toEqual(['Draft', 'Given'])
  })

  it('prints the subject the quote FROZE, not the row’s name today', () => {
    /* a boat renamed on the sheet is still the boat this document was
       written for, and the document prints what it froze */
    const a = moduleActivity(module_, entities, rowsByEntity, [
      quote('q1', 'live', { subjectLabel: 'NSM 4.6 as sold' }),
    ])
    expect(a.quotes[0].subject).toBe('NSM 4.6 as sold')
  })

  it('leaves the quotes it was handed exactly as it found them', () => {
    const qs = [quote('q1', 'live', { createdAt: '2026-01-01T00:00:00.000Z' }), quote('q2', 'live')]
    const order = qs.map((q) => q.id)
    moduleActivity(module_, entities, rowsByEntity, qs)
    expect(qs.map((q) => q.id)).toEqual(order)
  })
})
