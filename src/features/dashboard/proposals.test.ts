/* ============================================================
   WHAT A PROPOSAL IS ALLOWED TO SAY.

   A proposal is the one thing on this dashboard that suggests
   rather than reports, so the whole suite is about the line
   between those two:

     · it never names a table the create panel would refuse — a
       join, a retired table — because a proposal that cannot be
       honoured is worse than no proposal
     · it never groups two tables that declare no kind, which is
       the `Rates & Charges` bag `split.ts` exists to complain
       about, rebuilt one screen earlier
     · a table already in a module is never proposed again, which
       is what makes the reading correct on a near-empty dashboard
       and silent on a full one
     · NOTHING IS LEFT OUT SILENTLY. Every table the empty state's
       own count line names is either inside a proposal or inside
       `unplaced` — DESIGN_CONTRACT §5, "a count must say what it
       left out", asserted rather than promised
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'
import { fileTally } from './cards'
import { proposeModules, seedFor } from './proposals'
import type { ModuleProposal } from './proposals'

/* Fixtures — the same shape `cards.test.ts` builds, so a change to
   the contract breaks both files rather than only the older one. */
const STAMP = '2026-08-01T00:00:00.000Z'

/** A read that fails the test rather than handing back undefined —
 *  an assertion on `undefined?.thing` passes for the wrong reason. */
const must = <T,>(v: T | undefined): T => {
  if (v === undefined) throw new Error('expected a value')
  return v
}

const table = (id: string, name: string, extra: Partial<EntityDef> = {}): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields: [{ id: `${id}-f1`, name: 'Model', type: 'text' }],
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...extra,
})

const rows = (entityId: string, n: number): RowData[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${entityId}-r${i}`,
    entityId,
    values: { [`${entityId}-f1`]: `Model ${i}` },
    createdAt: STAMP,
    updatedAt: STAMP,
  }))

const moduleDef = (over: Partial<ModuleDef>): ModuleDef => ({
  id: 'm-1',
  name: 'Highfield',
  description: 'The inflatables counter.',
  tableIds: ['t-boat'],
  capabilities: ['browse', 'search', 'open'],
  index: 'tiles',
  accent: 'blue',
  order: 0,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
})

/* A small sheet with the shape the real one has: several tables of
   one kind, a couple of another, a join, a retired table and two
   the app cannot classify. */
const SHEET: Record<string, EntityDef> = {
  highfield: table('highfield', 'Highfield Inflatables', { kind: 'boat' }),
  stacer: table('stacer', 'Stacer', { kind: 'boat' }),
  formosa: table('formosa', 'Formosa', { kind: 'boat' }),
  yamaha: table('yamaha', 'Yamaha', { kind: 'motor' }),
  epropulsion: table('epropulsion', 'ePropulsion', { kind: 'motor' }),
  labour: table('labour', 'Labour Rates', { kind: 'custom' }),
  rego: table('rego', 'Registration Costs'),
  pair: table('pair', 'Boat ▸ Motor', { kind: 'boat', role: 'join' }),
  obsolete: table('obsolete', 'Obsolete Trailers', { kind: 'trailer', retired: true }),
}

const SHEET_ROWS: Record<string, RowData[]> = {
  highfield: rows('highfield', 588),
  stacer: rows('stacer', 139),
  formosa: rows('formosa', 49),
  yamaha: rows('yamaha', 288),
  epropulsion: rows('epropulsion', 47),
  labour: rows('labour', 12),
  rego: rows('rego', 8),
  pair: rows('pair', 641),
  obsolete: rows('obsolete', 44),
}

describe('proposeModules', () => {
  it('proposes one module per kind, biggest first, named by the kind', () => {
    const { proposals } = proposeModules({}, SHEET, SHEET_ROWS)
    expect(proposals.map((p) => p.name)).toEqual(['Boats', 'Motors'])
    expect(proposals[0]?.kind).toBe('boat')
    expect(proposals[0]?.tables.length).toBe(3)
    expect(proposals[1]?.tables.length).toBe(2)
  })

  /* THE LINE A PERSON CHECKS BEFORE PRESSING. The proposal carries
     the tables by their own names and the rows under them, counted
     — not a category and a promise. */
  it('names the tables it would hold and counts the rows under them', () => {
    const [boats] = proposeModules({}, SHEET, SHEET_ROWS).proposals
    expect(boats?.tables.map((t) => t.name)).toEqual(['Highfield Inflatables', 'Stacer', 'Formosa'])
    expect(boats?.tables.map((t) => t.rows)).toEqual([588, 139, 49])
    expect(boats?.rows).toBe(588 + 139 + 49)
  })

  /* `tableIds[0]` is `createModule`'s contract — the module's face
     and its detail page come from it — so the biggest table leads
     and the tie breaks on name rather than on map order. */
  it('puts the biggest table first and breaks a tie on name', () => {
    const even = {
      b: table('b', 'Beta', { kind: 'boat' }),
      a: table('a', 'Alpha', { kind: 'boat' }),
    }
    const [p] = proposeModules({}, even, { a: rows('a', 5), b: rows('b', 5) }).proposals
    expect(p?.tables.map((t) => t.name)).toEqual(['Alpha', 'Beta'])
  })

  /* THE PANEL'S OWN LIST, NOT A WIDER ONE. `NewModuleDialog` offers
     `canBeModuleMaster(e) && !isRetired(e)`; a proposal naming a
     join or a retired table would open onto a panel that could not
     honour it. */
  it('never names a join or a retired table', () => {
    const named = proposeModules({}, SHEET, SHEET_ROWS).proposals.flatMap((p) =>
      p.tables.map((t) => t.id),
    )
    expect(named).not.toContain('pair')
    expect(named).not.toContain('obsolete')
    expect(proposeModules({}, SHEET, SHEET_ROWS).proposals.map((p) => p.kind)).not.toContain(
      'trailer',
    )
  })

  /* THE BAG, REBUILT ONE SCREEN EARLIER, IS THE FAILURE THIS
     PREVENTS. `custom` is the absence of a kind, so two tables
     carrying it have agreed about nothing; an explicit `custom` and
     a table with no `kind` at all are the same case. */
  it('never groups tables that declare no kind, however they say so', () => {
    const { proposals, unplaced } = proposeModules({}, SHEET, SHEET_ROWS)
    expect(proposals.flatMap((p) => p.tables.map((t) => t.id))).not.toContain('labour')
    expect(proposals.flatMap((p) => p.tables.map((t) => t.id))).not.toContain('rego')
    expect(unplaced).toBe(2)
  })

  /* Rule 10: a thing that cannot be done says why, where it is —
     and the sentence names the act that fixes it. */
  it('says why the unclassified tables are not proposed, and where to fix it', () => {
    const { why } = proposeModules({}, SHEET, SHEET_ROWS)
    expect(why).toContain('2 tables declare no kind')
    expect(why).toContain('a kind on the sheet')
    expect(proposeModules({}, { a: table('a', 'A', { kind: 'boat' }) }, {}).why).toBe('')
  })

  it('writes the refusal in the singular for one table', () => {
    const { why, unplaced } = proposeModules({}, { rego: must(SHEET.rego) }, {})
    expect(unplaced).toBe(1)
    expect(why).toContain('1 table declares no kind')
    expect(why).not.toContain('tables declare')
  })

  /* A module HOLDS its tables, so they are placed. This is what
     makes the reading correct on a near-empty dashboard rather than
     only on an empty one. */
  it('never proposes a table a module already holds', () => {
    const modules = { 'm-1': moduleDef({ tableIds: ['highfield', 'stacer'] }) }
    const { proposals } = proposeModules(modules, SHEET, SHEET_ROWS)
    const boats = proposals.find((p) => p.kind === 'boat')
    expect(boats?.tables.map((t) => t.id)).toEqual(['formosa'])
    /* one table left, so the proposal takes THAT TABLE'S OWN NAME
       rather than the category — a dealer's word beats a label */
    expect(boats?.name).toBe('Formosa')
  })

  it('is silent on a sheet where every table already has a home', () => {
    const modules = {
      'm-1': moduleDef({
        id: 'm-1',
        tableIds: ['highfield', 'stacer', 'formosa', 'yamaha', 'epropulsion', 'labour', 'rego'],
      }),
    }
    expect(proposeModules(modules, SHEET, SHEET_ROWS)).toEqual({
      proposals: [],
      unplaced: 0,
      why: '',
    })
  })

  it('proposes nothing at all on an empty sheet', () => {
    expect(proposeModules({}, {}, {})).toEqual({ proposals: [], unplaced: 0, why: '' })
  })

  /* DESIGN_CONTRACT §5 — "a count must say what it left out". The
     empty state prints `fileTally().tables` in "You have N tables
     and no modules"; every one of those N must be accounted for by
     the block underneath it, or the screen is quietly reducing a
     number a person can see. */
  it('accounts for every table the empty state counts', () => {
    const { proposals, unplaced } = proposeModules({}, SHEET, SHEET_ROWS)
    const inProposals = proposals.reduce((n, p) => n + p.tables.length, 0)
    expect(inProposals + unplaced).toBe(fileTally(SHEET, SHEET_ROWS).tables)
  })

  /* A table the store keeps no row list for is a table somebody has
     just drawn. It is still a table and still proposable; counting
     it at zero rows is the truth. */
  it('counts a table with no rows at zero rather than dropping it', () => {
    const [p] = proposeModules({}, { fresh: table('fresh', 'Fresh', { kind: 'boat' }) }, {})
      .proposals
    expect(p?.tables).toEqual([{ id: 'fresh', name: 'Fresh', rows: 0 }])
    expect(p?.rows).toBe(0)
  })

  /* A module pointing at a table that has since been deleted must
     not resurrect it as a proposal, and must not crash the reading. */
  it('survives a module pointing at a table that is no longer there', () => {
    const modules = { 'm-1': moduleDef({ tableIds: ['gone', 'highfield'] }) }
    const { proposals } = proposeModules(modules, SHEET, SHEET_ROWS)
    expect(proposals.find((p) => p.kind === 'boat')?.tables.map((t) => t.id)).toEqual([
      'stacer',
      'formosa',
    ])
  })
})

describe('seedFor', () => {
  /* The panel builds `[picked, ...ticked siblings]`; the seed has to
     land on exactly that order or the module's face comes off the
     wrong table. */
  it('hands the panel the master and its siblings, master first', () => {
    const boats: ModuleProposal = must(proposeModules({}, SHEET, SHEET_ROWS).proposals[0])
    expect(seedFor(boats)).toEqual({
      tableId: 'highfield',
      alsoIds: ['stacer', 'formosa'],
      name: 'Boats',
      description: '',
    })
  })

  /* ONE TABLE KEEPS THE PANEL'S OWN ANSWER. The description is the
     table's own line, which is right when the module IS that table
     — so the seed says nothing about it rather than blanking it. */
  it('leaves the description alone when the module is one table', () => {
    const modules = { 'm-1': moduleDef({ tableIds: ['highfield', 'stacer'] }) }
    const boats: ModuleProposal = must(
      proposeModules(modules, SHEET, SHEET_ROWS).proposals.find((p) => p.kind === 'boat'),
    )
    expect(seedFor(boats)).toEqual({
      tableId: 'formosa',
      alsoIds: [],
      name: 'Formosa',
    })
  })
})
